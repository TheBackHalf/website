import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { getSmtpConfig } from "@/lib/auth/email/smtp";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import { emailKindFor, isMarketingTemplate } from "@/lib/email/classification";
import {
  appendMarketingFooter,
  buildMarketingFooter,
  consentSourceLabel,
} from "@/lib/email/footer";
import {
  MARKETING_SENDER,
  TRANSACTIONAL_SENDER,
  marketingFromName,
  marketingReplyTo,
  requirePhysicalAddress,
} from "@/lib/email/identity";
import { getEmailComplianceStore } from "@/lib/email/store";
import type { ClassifiedEmailInput, ClassifiedSendResult, ComposedEmail } from "@/lib/email/types";
import {
  oneClickUnsubscribeUrl,
  unsubscribeSecretConfigured,
  unsubscribeUrl,
} from "@/lib/email/unsubscribe-token";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function composeClassifiedEmail(
  input: ClassifiedEmailInput,
): Promise<ClassifiedSendResult> {
  const to = normalizeEmail(input.to);
  if (!isValidEmail(to)) {
    return { status: "invalid_recipient", error: "invalid_recipient" };
  }

  const kind = emailKindFor(input.templateId);
  const locale = input.locale === "es" ? "es" : "en";

  if (kind === "transactional") {
    const smtp = getSmtpConfig();
    const composed: ComposedEmail = {
      to,
      subject: input.subject,
      text: input.text,
      fromName: input.fromName ?? TRANSACTIONAL_SENDER.fromName,
      fromAddress: input.fromAddress ?? smtp.from,
      replyTo: input.replyTo,
      kind,
      templateId: input.templateId,
      headers: {
        "X-BH-Email-Kind": "transactional",
        "X-BH-Email-Template": input.templateId,
      },
      senderLegalName: TRANSACTIONAL_SENDER.legalName,
      senderBrandName: TRANSACTIONAL_SENDER.brandName,
    };
    return { status: input.dryRun ? "dry_run" : "sent", composed };
  }

  if (!unsubscribeSecretConfigured()) {
    return {
      status: "unsubscribe_secret_missing",
      error:
        "AUTH_SECRET or EMAIL_UNSUBSCRIBE_SECRET is required to sign marketing unsubscribe links.",
    };
  }

  const address = requirePhysicalAddress();
  if (!address.ok) {
    return { status: "missing_physical_address", error: address.error };
  }

  const store = getEmailComplianceStore();
  const suppressed = await store.getSuppression(to);
  if (suppressed) {
    return {
      status: "suppressed",
      error: `recipient_suppressed:${suppressed.reason}`,
    };
  }

  const consent = await store.getActiveConsent(to);
  if (!consent) {
    return {
      status: "missing_consent",
      error:
        "No active marketing-email consent record. Account registration and purchase are not marketing consent.",
    };
  }

  const unsubPage = unsubscribeUrl(to, locale);
  const unsubOneClick = oneClickUnsubscribeUrl(to, locale);
  const footer = buildMarketingFooter({
    locale,
    unsubscribeUrl: unsubPage,
    physicalAddress: address.address,
    consentSourceLabel: consentSourceLabel(locale, consent.sourceDetail),
  });
  const smtp = getSmtpConfig();
  const composed: ComposedEmail = {
    to,
    subject: input.subject,
    text: appendMarketingFooter(input.text, footer),
    fromName: input.fromName ?? marketingFromName(),
    fromAddress: input.fromAddress ?? smtp.from,
    replyTo: input.replyTo ?? marketingReplyTo(),
    kind,
    templateId: input.templateId,
    headers: {
      "X-BH-Email-Kind": "marketing",
      "X-BH-Email-Template": input.templateId,
      "List-Unsubscribe": `<${unsubOneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "List-Id": `<marketing.thebackhalf.org>`,
    },
    unsubscribeUrl: unsubPage,
    physicalAddress: address.address,
    senderLegalName: MARKETING_SENDER.legalName,
    senderBrandName: MARKETING_SENDER.brandName,
  };
  return { status: input.dryRun ? "dry_run" : "sent", composed };
}

export async function sendClassifiedEmail(
  input: ClassifiedEmailInput,
): Promise<ClassifiedSendResult> {
  const prepared = await composeClassifiedEmail(input);
  if (prepared.status !== "sent" && prepared.status !== "dry_run") {
    return prepared;
  }
  if (input.dryRun || prepared.status === "dry_run") {
    return { status: "dry_run", composed: prepared.composed };
  }

  const result = await sendSmtpEmail({
    to: prepared.composed.to,
    subject: prepared.composed.subject,
    text: prepared.composed.text,
    fromName: prepared.composed.fromName,
    fromAddress: prepared.composed.fromAddress,
    replyTo: prepared.composed.replyTo,
    messageId: input.messageId,
    inReplyTo: input.inReplyTo,
    references: input.references,
    headers: prepared.composed.headers,
  });

  if (result.status === "sent") {
    return {
      status: "sent",
      composed: prepared.composed,
      smtpResponse: result.response,
    };
  }
  if (result.status === "not_configured") {
    return { status: "not_configured", error: result.error, composed: prepared.composed };
  }
  return { status: "failed", error: result.error, composed: prepared.composed };
}

export function assertNotMarketingPath(templateId: ClassifiedEmailInput["templateId"]): void {
  if (isMarketingTemplate(templateId)) {
    throw new Error(`transactional_path_received_marketing_template:${templateId}`);
  }
}
