"use server";

import { authorizeLuminaTurn } from "@/lib/ai-controls/lumina";
import { AccessDeniedError, requireAuthenticatedUser } from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";
import { isLocale } from "@/lib/i18n/config";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";
import { assembleLuminaJourneyContextForUser } from "@/lib/lumina/context/assemble";
import {
  appendMessage,
  buildStubAssistantReply,
  contentRequestsForceError,
  createMessage,
  findLastUserMessage,
  hasPendingAssistantTurn,
  normalizeMessageContent,
} from "@/lib/lumina/conversation";
import { resolveLuminaLocale } from "@/lib/lumina/language/resolve-locale";
import { detectLuminaTurnLocaleOverride } from "@/lib/lumina/language/turn-override";
import { upsertConversationSummary } from "@/lib/lumina/memory/store";
import { extractExplicitRememberText } from "@/lib/lumina/memory/validation";
import { getLuminaStore } from "@/lib/lumina/store";
import type {
  LuminaConversation,
  SendLuminaMessageResult,
} from "@/lib/lumina/types";

/**
 * Optional Row 76 integration: persist only when memory is enabled AND the
 * message includes an explicit remember marker. Never auto-stores every message.
 * Failures here must not break the conversation send path.
 */
async function maybePersistExplicitRemember(
  userId: string,
  conversationId: string,
  content: string,
): Promise<void> {
  const rememberText = extractExplicitRememberText(content);
  if (!rememberText) {
    return;
  }
  try {
    await upsertConversationSummary({
      userId,
      text: rememberText,
      sourceConversationId: conversationId,
      source: "explicit",
    });
  } catch {
    // Intentionally silent — never log private memory content.
  }
}

export type SendLuminaMessageInput = {
  conversationId: unknown;
  content?: unknown;
  mode?: unknown;
  /** Explicit Architect UI/route locale for this request — validated only. */
  routeLocale?: unknown;
};

function asConversationId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asMode(value: unknown): "send" | "retry" {
  return value === "retry" ? "retry" : "send";
}

function asRouteLocale(value: unknown): "en" | "es" | undefined {
  return typeof value === "string" && isLocale(value) ? value : undefined;
}

async function persistConversation(
  conversation: LuminaConversation,
): Promise<LuminaConversation> {
  return getLuminaStore().saveConversation(conversation);
}

async function loadProfileLocale(userId: string): Promise<"en" | "es" | undefined> {
  const user = await getAuthStore().findUserById(userId);
  if (!user || !isLocale(user.locale)) {
    return undefined;
  }
  return user.locale;
}

/**
 * Core send/retry path — callable from tests without cookie context.
 * Ownership of conversationId is enforced against userId.
 * Locale never changes ownership, Journey state, or stored profile preference.
 */
export async function sendLuminaMessageForUser(
  userId: string,
  input: SendLuminaMessageInput,
): Promise<SendLuminaMessageResult> {
  const user = await getAuthStore().findUserById(userId);
  if (!accountIsAgeEligible(user)) {
    return { status: "forbidden", code: "age_ineligible" };
  }

  const conversationId = asConversationId(input.conversationId);
  if (!conversationId) {
    return { status: "validation_error", code: "invalid_input" };
  }

  const store = getLuminaStore();
  const owned = await store.findConversationForUser(conversationId, userId);
  if (!owned) {
    // Wrong id, other user's id, or tampering — do not leak existence.
    return { status: "forbidden", code: "forbidden" };
  }

  const mode = asMode(input.mode);
  const routeLocale = asRouteLocale(input.routeLocale);
  const profileLocale = await loadProfileLocale(userId);

  try {
    // Row 77 — assemble Journey context server-side after auth/ownership.
    // Never attach journeyContext to the client-facing result.
    // Language must not alter Journey assemble or progress state.
    const journeyContext = await assembleLuminaJourneyContextForUser(userId);

    if (mode === "retry") {
      if (!hasPendingAssistantTurn(owned)) {
        return { status: "validation_error", code: "invalid_input" };
      }

      const lastUser = findLastUserMessage(owned);
      if (!lastUser) {
        return { status: "validation_error", code: "invalid_input" };
      }

      const locale = resolveLuminaLocale({
        turnOverride: detectLuminaTurnLocaleOverride(lastUser.content),
        routeLocale,
        profileLocale,
      });
      const stubContext = {
        locale,
        journeyStageId: journeyContext.currentJourney.stageId,
        journeyState: journeyContext.currentJourney.state,
        alivenessAssessment: journeyContext.alivenessAssessment,
        chapter1: journeyContext.chapter1,
        chapter2: journeyContext.chapter2,
        chapter3: journeyContext.chapter3,
        chapter4: journeyContext.chapter4,
        chapter5: journeyContext.chapter5,
        chapter6: journeyContext.chapter6,
        chapter7: journeyContext.chapter7,
      };

      const controlled = await authorizeLuminaTurn(userId);
      if (controlled.status === "denied") {
        const { trackProductEvent } = await import("@/lib/analytics/track");
        await trackProductEvent({
          name: "lumina_error",
          userId,
          locale,
          productArea: "lumina",
          idempotencyKey: `lumina_error:${owned.id}:${lastUser.id}:${controlled.code}`,
          payload: {
            conversationId: owned.id,
            errorCategory: controlled.code,
            errorCode: controlled.code,
            responseStatus: "error",
          },
        });
        return { status: "error", code: controlled.code, conversation: owned };
      }

      // Retry completes the pending turn. Force-error applies only on initial send
      // so the Retry control can be validated without duplicating the user message.
      const stub = buildStubAssistantReply(lastUser.content, stubContext);
      const assistant = createMessage({
        conversationId: owned.id,
        role: "assistant",
        content: stub.content,
        citations: stub.citations,
      });
      const updated = await persistConversation(appendMessage(owned, assistant));
      const { trackProductEvent } = await import("@/lib/analytics/track");
      await trackProductEvent({
        name: "lumina_response_received",
        userId,
        locale,
        productArea: "lumina",
        idempotencyKey: `lumina_response_received:${owned.id}:${assistant.id}`,
        payload: {
          conversationId: owned.id,
          responseStatus: "ok",
          chapterId: journeyContext.currentJourney.stageId,
        },
      });
      return { status: "ok", conversation: updated };
    }

    const content = normalizeMessageContent(input.content);
    if (!content) {
      return { status: "validation_error", code: "invalid_input" };
    }

    const locale = resolveLuminaLocale({
      turnOverride: detectLuminaTurnLocaleOverride(content),
      routeLocale,
      profileLocale,
    });
    const stubContext = {
      locale,
      journeyStageId: journeyContext.currentJourney.stageId,
      journeyState: journeyContext.currentJourney.state,
      alivenessAssessment: journeyContext.alivenessAssessment,
      chapter1: journeyContext.chapter1,
      chapter2: journeyContext.chapter2,
      chapter3: journeyContext.chapter3,
      chapter4: journeyContext.chapter4,
      chapter5: journeyContext.chapter5,
      chapter6: journeyContext.chapter6,
      chapter7: journeyContext.chapter7,
    };

    const userMessage = createMessage({
      conversationId: owned.id,
      role: "user",
      content,
    });
    let next = appendMessage(owned, userMessage);

    const startedAt = Date.now();
    const { trackProductEvent } = await import("@/lib/analytics/track");
    await trackProductEvent({
      name: "lumina_message_sent",
      userId,
      locale,
      productArea: "lumina",
      idempotencyKey: `lumina_message_sent:${owned.id}:${userMessage.id}`,
      payload: {
        conversationId: owned.id,
        chapterId: journeyContext.currentJourney.stageId,
      },
    });

    if (contentRequestsForceError(content)) {
      const persisted = await persistConversation(next);
      await trackProductEvent({
        name: "lumina_error",
        userId,
        locale,
        productArea: "lumina",
        idempotencyKey: `lumina_error:${owned.id}:${userMessage.id}`,
        payload: {
          conversationId: owned.id,
          errorCategory: "send_failed",
          responseStatus: "error",
        },
      });
      return {
        status: "error",
        code: "send_failed",
        conversation: persisted,
      };
    }

    const controlled = await authorizeLuminaTurn(userId);
    if (controlled.status === "denied") {
      const persisted = await persistConversation(next);
      await trackProductEvent({
        name: "lumina_error",
        userId,
        locale,
        productArea: "lumina",
        idempotencyKey: `lumina_error:${owned.id}:${userMessage.id}:${controlled.code}`,
        payload: {
          conversationId: owned.id,
          errorCategory: controlled.code,
          errorCode: controlled.code,
          responseStatus: "error",
        },
      });
      return {
        status: "error",
        code: controlled.code,
        conversation: persisted,
      };
    }

    const stub = buildStubAssistantReply(content, stubContext);
    const assistant = createMessage({
      conversationId: owned.id,
      role: "assistant",
      content: stub.content,
      citations: stub.citations,
    });
    next = appendMessage(next, assistant);
    const persisted = await persistConversation(next);
    await maybePersistExplicitRemember(userId, persisted.id, content);
    await trackProductEvent({
      name: "lumina_response_received",
      userId,
      locale,
      productArea: "lumina",
      idempotencyKey: `lumina_response_received:${owned.id}:${assistant.id}`,
      payload: {
        conversationId: owned.id,
        responseStatus: "ok",
        latencyMs: Date.now() - startedAt,
        chapterId: journeyContext.currentJourney.stageId,
      },
    });
    return { status: "ok", conversation: persisted };
  } catch {
    try {
      const { trackProductEvent } = await import("@/lib/analytics/track");
      await trackProductEvent({
        name: "lumina_error",
        userId,
        productArea: "lumina",
        idempotencyKey: `lumina_error:${conversationId}:${Date.now()}`,
        payload: { errorCategory: "send_failed", responseStatus: "error" },
      });
    } catch {
      // ignore
    }
    return { status: "error", code: "send_failed" };
  }
}

export async function sendLuminaMessageAction(
  input: SendLuminaMessageInput,
): Promise<SendLuminaMessageResult> {
  try {
    const actor = await requireAuthenticatedUser();
    return sendLuminaMessageForUser(actor.user.id, input);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "unauthenticated" };
    }
    return { status: "error", code: "send_failed" };
  }
}
