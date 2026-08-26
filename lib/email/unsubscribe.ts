import { randomUUID } from "node:crypto";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { TRANSACTIONAL_EMAIL_PROVIDER_ID } from "@/lib/email/config";
import { getEmailStore } from "@/lib/email/store";
import { verifyUnsubscribeToken } from "@/lib/email/tokens";

export type UnsubscribeResult =
  | { status: "unsubscribed"; email: string }
  | { status: "invalid_token" }
  | { status: "already_unsubscribed"; email: string };

export async function honorUnsubscribe(input: {
  token?: string | null;
  email?: string;
  source?: string;
  test?: boolean;
}): Promise<UnsubscribeResult> {
  const fromToken = verifyUnsubscribeToken(input.token);
  const email = fromToken?.email ?? (input.email ? normalizeEmail(input.email) : null);
  if (!email) return { status: "invalid_token" };

  const existing = await getEmailStore().getSuppression(email);
  if (existing?.reason === "unsubscribe") {
    return { status: "already_unsubscribed", email };
  }

  const now = new Date().toISOString();
  const deliveryBlock =
    existing &&
    (existing.reason === "hard_bounce" || existing.reason === "complaint")
      ? existing
      : null;
  await getEmailStore().upsertSuppression({
    email,
    reason: deliveryBlock ? deliveryBlock.reason : "unsubscribe",
    source: input.source ?? "unsubscribe",
    detail: "recipient_unsubscribe",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    test: input.test,
  });
  if (!deliveryBlock) {
    await getEmailStore().recordEvent({
      id: `eml-${randomUUID()}`,
      createdAt: now,
      type: "unsubscribe",
      status: "unsubscribe",
      category: "lifecycle",
      email,
      provider: TRANSACTIONAL_EMAIL_PROVIDER_ID,
      test: input.test,
    });
  }
  return { status: "unsubscribed", email };
}
