import { randomUUID } from "node:crypto";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { classifyDeliveryError, classifyInboundMessage } from "@/lib/email/classify";
import { TRANSACTIONAL_EMAIL_PROVIDER_ID } from "@/lib/email/config";
import { getEmailStore } from "@/lib/email/store";
import type { EmailSuppressionReason } from "@/lib/email/types";

export type BounceIngestInput = {
  email?: string;
  fromEmail?: string;
  subject?: string;
  text?: string;
  headers?: string;
  smtpError?: string;
  source: string;
  test?: boolean;
};

export type BounceIngestResult = {
  handled: boolean;
  kind: "hard_bounce" | "complaint" | "soft_bounce" | "ignored";
  email: string | null;
  suppressed: boolean;
};

export async function ingestBounce(
  input: BounceIngestInput,
): Promise<BounceIngestResult> {
  const inbound = classifyInboundMessage({
    fromEmail: input.fromEmail ?? "",
    subject: input.subject,
    text: input.text,
    headers: input.headers,
  });
  const smtpClass = classifyDeliveryError(input.smtpError);
  let kind: BounceIngestResult["kind"] = "ignored";
  if (inbound.class === "complaint" || smtpClass === "complaint") {
    kind = "complaint";
  } else if (inbound.class === "bounce" || smtpClass === "hard") {
    kind = "hard_bounce";
  } else if (smtpClass === "soft") {
    kind = "soft_bounce";
  }

  const email = input.email
    ? normalizeEmail(input.email)
    : inbound.recipient;

  if (kind === "ignored" || kind === "soft_bounce" || !email) {
    if (kind === "soft_bounce") {
      await getEmailStore().recordEvent({
        id: `eml-${randomUUID()}`,
        createdAt: new Date().toISOString(),
        type: "failed",
        status: "failed",
        category: "support",
        email: email ?? "unknown@thebackhalf.org",
        provider: TRANSACTIONAL_EMAIL_PROVIDER_ID,
        error: "soft_bounce",
        test: input.test,
      });
    }
    return { handled: kind !== "ignored", kind, email, suppressed: false };
  }

  const reason: EmailSuppressionReason =
    kind === "complaint" ? "complaint" : "hard_bounce";
  const now = new Date().toISOString();
  await getEmailStore().upsertSuppression({
    email,
    reason,
    source: input.source,
    detail: kind,
    createdAt: now,
    updatedAt: now,
    test: input.test,
  });
  await getEmailStore().recordEvent({
    id: `eml-${randomUUID()}`,
    createdAt: now,
    type: kind === "complaint" ? "complaint" : "bounce",
    status: kind === "complaint" ? "complaint" : "bounce",
    category: "support",
    email,
    provider: TRANSACTIONAL_EMAIL_PROVIDER_ID,
    error: kind,
    test: input.test,
  });
  return { handled: true, kind, email, suppressed: true };
}
