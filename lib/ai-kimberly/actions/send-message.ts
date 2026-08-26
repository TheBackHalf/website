"use server";

import { AccessDeniedError, requireAuthenticatedUser } from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";
import { isLocale } from "@/lib/i18n/config";
import { accountIsAgeEligible } from "@/lib/eligibility/policy";
import {
  detectFounderTurnLocaleOverride,
  resolveFounderConversationLocale,
} from "@/lib/ai-kimberly/locale";
import {
  buildFounderAssistantReply,
  contentRequestsForceError,
} from "@/lib/ai-kimberly/replies";
import { appendMessage, getAiKimberlyStore } from "@/lib/ai-kimberly/store";
import type {
  AiKimberlyConversation,
  SendAiKimberlyMessageInput,
  SendAiKimberlyMessageResult,
} from "@/lib/ai-kimberly/types";
import {
  createMessage,
  findLastUserMessage,
  hasPendingAssistantTurn,
  normalizeMessageContent,
} from "@/lib/lumina/conversation";

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
  conversation: AiKimberlyConversation,
): Promise<AiKimberlyConversation> {
  return getAiKimberlyStore().saveConversation(conversation);
}

async function loadProfileLocale(
  userId: string,
): Promise<"en" | "es" | undefined> {
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
 * Founder Conversation never reads or writes Lumina memory.
 */
export async function sendAiKimberlyMessageForUser(
  userId: string,
  input: SendAiKimberlyMessageInput,
): Promise<SendAiKimberlyMessageResult> {
  const user = await getAuthStore().findUserById(userId);
  if (!accountIsAgeEligible(user)) {
    return { status: "forbidden", code: "age_ineligible" };
  }

  const conversationId = asConversationId(input.conversationId);
  if (!conversationId) {
    return { status: "validation_error", code: "invalid_input" };
  }

  const store = getAiKimberlyStore();
  const owned = await store.findConversationForUser(conversationId, userId);
  if (!owned) {
    return { status: "forbidden", code: "forbidden" };
  }

  const mode = asMode(input.mode);
  const routeLocale = asRouteLocale(input.routeLocale);
  const profileLocale = await loadProfileLocale(userId);

  try {
    if (mode === "retry") {
      if (!hasPendingAssistantTurn(owned)) {
        return { status: "validation_error", code: "invalid_input" };
      }

      const lastUser = findLastUserMessage(owned);
      if (!lastUser) {
        return { status: "validation_error", code: "invalid_input" };
      }

      const locale = resolveFounderConversationLocale({
        turnOverride: detectFounderTurnLocaleOverride(lastUser.content),
        routeLocale,
        profileLocale,
      });
      const stub = buildFounderAssistantReply(lastUser.content, locale);
      const assistant = createMessage({
        conversationId: owned.id,
        role: "assistant",
        content: stub.content,
      });
      const updated = await persistConversation(appendMessage(owned, assistant));
      return { status: "ok", conversation: updated };
    }

    const content = normalizeMessageContent(input.content);
    if (!content) {
      return { status: "validation_error", code: "invalid_input" };
    }

    const locale = resolveFounderConversationLocale({
      turnOverride: detectFounderTurnLocaleOverride(content),
      routeLocale,
      profileLocale,
    });

    const userMessage = createMessage({
      conversationId: owned.id,
      role: "user",
      content,
    });
    let next = appendMessage(owned, userMessage);

    if (contentRequestsForceError(content)) {
      const persisted = await persistConversation(next);
      return {
        status: "error",
        code: "send_failed",
        conversation: persisted,
      };
    }

    const stub = buildFounderAssistantReply(content, locale);
    const assistant = createMessage({
      conversationId: owned.id,
      role: "assistant",
      content: stub.content,
    });
    next = appendMessage(next, assistant);
    const persisted = await persistConversation(next);
    return { status: "ok", conversation: persisted };
  } catch {
    return { status: "error", code: "send_failed" };
  }
}

export async function sendAiKimberlyMessageAction(
  input: SendAiKimberlyMessageInput,
): Promise<SendAiKimberlyMessageResult> {
  try {
    const actor = await requireAuthenticatedUser();
    return sendAiKimberlyMessageForUser(actor.user.id, input);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "unauthenticated" };
    }
    return { status: "error", code: "send_failed" };
  }
}
