import { getAuthStore } from "@/lib/auth/store";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import type { Locale } from "@/lib/i18n/config";
import { getLifecycleAutomation } from "@/lib/lifecycle/catalog";
import { buildLifecycleMessage } from "@/lib/lifecycle/messages";
import { sanitizeLifecyclePayload } from "@/lib/lifecycle/privacy";
import { getLifecycleStore } from "@/lib/lifecycle/store";
import type {
  LifecycleDispatchInput,
  LifecycleDispatchRecord,
  LifecycleDispatchResult,
  LifecycleDispatchStatus,
} from "@/lib/lifecycle/types";

function mapExistingStatus(
  status: Exclude<LifecycleDispatchStatus, "skipped_duplicate">,
): LifecycleDispatchStatus {
  if (status === "sent" || status === "recorded_existing") {
    return "recorded_existing";
  }
  return status;
}

async function resolveRecipient(input: LifecycleDispatchInput): Promise<{
  userId?: string;
  email?: string;
  firstName: string;
  locale: Locale;
} | null> {
  const store = getAuthStore();
  if (input.userId) {
    const user = await store.findUserById(input.userId);
    if (user) {
      return {
        userId: user.id,
        email: user.email,
        firstName: input.firstName || user.firstName,
        locale: input.locale === "es" || user.locale === "es" ? "es" : "en",
      };
    }
  }
  if (input.email) {
    const user = await store.findUserByEmail(input.email);
    if (user) {
      return {
        userId: user.id,
        email: user.email,
        firstName: input.firstName || user.firstName,
        locale: input.locale === "es" || user.locale === "es" ? "es" : "en",
      };
    }
    return {
      firstName: input.firstName || "Architect",
      email: input.email,
      locale: input.locale === "es" ? "es" : "en",
    };
  }
  return null;
}

async function persist(record: Omit<LifecycleDispatchRecord, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
}): Promise<LifecycleDispatchResult> {
  try {
    const stored = await getLifecycleStore().recordDispatch(record);
    if (stored.status === "duplicate") {
      return { status: "skipped_duplicate", record: stored.record };
    }
    return { status: stored.record.status, record: stored.record };
  } catch {
    return { status: "failed" };
  }
}

/**
 * Connect a platform trigger to the lifecycle ledger.
 * Existing senders pass `existingDelivery` so Architects are not emailed twice.
 * New automations send transactional email through SMTP.
 * Never throws into product flows.
 */
export async function dispatchLifecycleAutomation(
  input: LifecycleDispatchInput,
): Promise<LifecycleDispatchResult> {
  try {
    const automation = getLifecycleAutomation(input.automationId);
    const existing = await getLifecycleStore().findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return { status: "skipped_duplicate", record: existing };
    }

    const recipient = await resolveRecipient(input);
    const locale: Locale = recipient?.locale ?? (input.locale === "es" ? "es" : "en");
    const payload = sanitizeLifecyclePayload(input.payload);
    const userId = recipient?.userId ?? input.userId;

    if (input.existingDelivery || automation.channel === "ledger") {
      const status = input.existingDelivery
        ? mapExistingStatus(input.existingDelivery.status)
        : "recorded_existing";
      return persist({
        automationId: automation.id,
        family: automation.family,
        userId,
        idempotencyKey: input.idempotencyKey,
        status,
        channel: automation.channel,
        locale,
        detail: input.existingDelivery?.detail,
        payload,
        test: input.test,
      });
    }

    if (!recipient?.email) {
      return persist({
        automationId: automation.id,
        family: automation.family,
        userId,
        idempotencyKey: input.idempotencyKey,
        status: "failed",
        channel: automation.channel,
        locale,
        detail: "recipient_not_found",
        payload,
        test: input.test,
      });
    }

    const message = buildLifecycleMessage({
      automationId: automation.id,
      locale,
      firstName: recipient.firstName,
      payload,
    });
    if (!message) {
      return persist({
        automationId: automation.id,
        family: automation.family,
        userId,
        idempotencyKey: input.idempotencyKey,
        status: "failed",
        channel: automation.channel,
        locale,
        detail: "message_not_available",
        payload,
        test: input.test,
      });
    }

    const result = await sendSmtpEmail({
      to: recipient.email,
      subject: message.subject,
      text: message.text,
    });

    if (result.status === "sent") {
      return persist({
        automationId: automation.id,
        family: automation.family,
        userId,
        idempotencyKey: input.idempotencyKey,
        status: "sent",
        channel: "email",
        locale,
        payload,
        test: input.test,
      });
    }

    if (result.status === "not_configured") {
      return persist({
        automationId: automation.id,
        family: automation.family,
        userId,
        idempotencyKey: input.idempotencyKey,
        status: "skipped_not_configured",
        channel: "email",
        locale,
        detail: "smtp_not_configured",
        payload,
        test: input.test,
      });
    }

    return persist({
      automationId: automation.id,
      family: automation.family,
      userId,
      idempotencyKey: input.idempotencyKey,
      status: "failed",
      channel: "email",
      locale,
      detail: "smtp_send_failed",
      payload,
      test: input.test,
    });
  } catch {
    return { status: "failed" };
  }
}
