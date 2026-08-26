import type { Locale } from "@/lib/i18n/config";

export const SUPPORT_TICKET_STATUSES = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_ON_ARCHITECT",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_TICKET_CATEGORIES = [
  "ACCOUNT_LOGIN",
  "REGISTRATION",
  "PAYMENT_BILLING",
  "ONBOARDING",
  "JOURNEY",
  "LUMINA",
  "DOWNLOADS_MATERIALS",
  "MEMBERSHIP",
  "PRIVACY",
  "TECHNICAL",
  "GENERAL",
  "OTHER",
] as const;
export type SupportTicketCategory = (typeof SUPPORT_TICKET_CATEGORIES)[number];

export const SUPPORT_OWNERS = ["michelle", "imani", "nia", "founder"] as const;
export type SupportOwner = (typeof SUPPORT_OWNERS)[number];

export const SUPPORT_SOURCES = ["form", "email", "social_row83"] as const;
export type SupportSource = (typeof SUPPORT_SOURCES)[number];

export const SUPPORT_MAILBOX = "support@thebackhalf.org";
export const SUPPORT_FROM_NAME = "The Back Half Support";
export const PRIVACY_MAILBOX = "privacy@thebackhalf.org";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_MAILBOX}`;

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  ACCOUNT_LOGIN: "Account / Login",
  REGISTRATION: "Registration",
  PAYMENT_BILLING: "Payment",
  ONBOARDING: "Onboarding",
  JOURNEY: "Journey",
  LUMINA: "Lumina",
  DOWNLOADS_MATERIALS: "Downloads",
  MEMBERSHIP: "Membership",
  PRIVACY: "Privacy",
  TECHNICAL: "Technical",
  GENERAL: "General",
  OTHER: "Other",
};

export const SUPPORT_CATEGORY_LABELS_ES: Record<SupportTicketCategory, string> = {
  ACCOUNT_LOGIN: "Cuenta / Acceso",
  REGISTRATION: "Registro",
  PAYMENT_BILLING: "Pago",
  ONBOARDING: "Onboarding",
  JOURNEY: "Journey",
  LUMINA: "Lumina",
  DOWNLOADS_MATERIALS: "Descargas",
  MEMBERSHIP: "Membresía",
  PRIVACY: "Privacidad",
  TECHNICAL: "Técnico",
  GENERAL: "General",
  OTHER: "Otro",
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  WAITING_ON_ARCHITECT: "Waiting On Architect",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const SUPPORT_SLA_LABELS = {
  within: "Within",
  approaching: "Approaching",
  overdue: "Overdue",
  urgent: "Urgent",
} as const;

export const SUPPORT_OWNER_TITLES: Record<SupportOwner, string> = {
  michelle: "Michelle Northstar — Chief of Staff & Operations Officer",
  imani: "Imani Heartbeat — Chief Technology & Risk Officer",
  nia: "Nia Prism — Chief Experience & Transformation Officer",
  founder: "Founder",
};

export const PUBLISHED_RESPONSE_HOURS = 72;

export const PRIORITY_RESPONSE_HOURS: Record<SupportPriority, number> = {
  P1: 4,
  P2: 24,
  P3: 72,
  P4: 72,
};

export const OPEN_TICKET_STATUSES: SupportTicketStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "WAITING_ON_ARCHITECT",
  "ESCALATED",
];

export function supportCategoryLabel(
  category: SupportTicketCategory,
  locale: Locale = "en",
): string {
  return locale === "es"
    ? SUPPORT_CATEGORY_LABELS_ES[category]
    : SUPPORT_CATEGORY_LABELS[category];
}

export function supportCategoryOptions(locale: Locale = "en"): Array<{
  value: SupportTicketCategory;
  label: string;
}> {
  return SUPPORT_TICKET_CATEGORIES.map((value) => ({
    value,
    label: supportCategoryLabel(value, locale),
  }));
}

export function ticketStatusLabel(status: SupportTicketStatus): string {
  return SUPPORT_STATUS_LABELS[status];
}

export function workflowStatusLabel(
  status: SupportTicketStatus,
): "Open" | "Resolved" {
  return OPEN_TICKET_STATUSES.includes(status) ? "Open" : "Resolved";
}

export function slaStateLabel(
  state: keyof typeof SUPPORT_SLA_LABELS | string,
): string {
  if (state in SUPPORT_SLA_LABELS) {
    return SUPPORT_SLA_LABELS[state as keyof typeof SUPPORT_SLA_LABELS];
  }
  return state;
}

export function ownerTitle(owner: SupportOwner): string {
  return SUPPORT_OWNER_TITLES[owner];
}

export function ownerTitles(owners: SupportOwner[]): string {
  return owners.map((owner) => SUPPORT_OWNER_TITLES[owner]).join("; ");
}

export function refundCategoryPresent(): boolean {
  const haystack = [
    ...Object.values(SUPPORT_CATEGORY_LABELS),
    ...Object.values(SUPPORT_CATEGORY_LABELS_ES),
    ...SUPPORT_TICKET_CATEGORIES,
  ]
    .join(" ")
    .toLowerCase();
  return /\brefunds?\b/.test(haystack);
}
