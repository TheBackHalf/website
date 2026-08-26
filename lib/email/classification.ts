import type { EmailKind, EmailTemplateId } from "@/lib/email/types";

export type EmailTemplateCatalogEntry = {
  id: EmailTemplateId;
  kind: EmailKind;
  purpose: string;
};

export const EMAIL_TEMPLATE_CATALOG: readonly EmailTemplateCatalogEntry[] = [
  {
    id: "auth.verification",
    kind: "transactional",
    purpose: "Account email verification",
  },
  {
    id: "auth.password_reset",
    kind: "transactional",
    purpose: "Account password reset",
  },
  {
    id: "billing.payment_success",
    kind: "transactional",
    purpose: "Payment confirmation",
  },
  {
    id: "billing.payment_failed",
    kind: "transactional",
    purpose: "Payment failure notice",
  },
  {
    id: "billing.subscription_activated",
    kind: "transactional",
    purpose: "Community membership activated",
  },
  {
    id: "billing.subscription_canceled",
    kind: "transactional",
    purpose: "Community membership canceled",
  },
  {
    id: "billing.refund_notice",
    kind: "transactional",
    purpose: "Refund processed",
  },
  {
    id: "support.acknowledgment",
    kind: "transactional",
    purpose: "Support ticket acknowledgment",
  },
  {
    id: "aos.founder_decision",
    kind: "transactional",
    purpose: "Internal Founder operations decision notice",
  },
  {
    id: "marketing.campaign",
    kind: "marketing",
    purpose: "Non-transactional campaign or newsletter",
  },
  {
    id: "marketing.launch_announcement",
    kind: "marketing",
    purpose: "Launch or promotional announcement",
  },
  {
    id: "outreach.audience",
    kind: "marketing",
    purpose: "Audience or partner outreach",
  },
] as const;

const BY_ID = new Map(EMAIL_TEMPLATE_CATALOG.map((entry) => [entry.id, entry]));

export function getEmailTemplate(id: EmailTemplateId): EmailTemplateCatalogEntry {
  const entry = BY_ID.get(id);
  if (!entry) {
    throw new Error(`unknown_email_template:${id}`);
  }
  return entry;
}

export function emailKindFor(id: EmailTemplateId): EmailKind {
  return getEmailTemplate(id).kind;
}

export function isMarketingTemplate(id: EmailTemplateId): boolean {
  return emailKindFor(id) === "marketing";
}

export function isTransactionalTemplate(id: EmailTemplateId): boolean {
  return emailKindFor(id) === "transactional";
}

export function listTemplatesByKind(kind: EmailKind): EmailTemplateCatalogEntry[] {
  return EMAIL_TEMPLATE_CATALOG.filter((entry) => entry.kind === kind);
}
