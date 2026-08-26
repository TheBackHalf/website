import type { Locale } from "@/lib/i18n/config";

/** Participant-facing essential launch email library (Row 144 categories). */
export const PARTICIPANT_EMAIL_TEMPLATE_IDS = [
  "verify_account",
  "password_reset",
  "purchase_confirmed",
  "payment_failed",
  "community_activated",
  "community_canceled",
  "refund_notice",
  "journey_chapter_complete",
  "journey_weekly_commitment",
  "support_acknowledgment",
  "launch_announcement",
] as const;

export type ParticipantEmailTemplateId =
  (typeof PARTICIPANT_EMAIL_TEMPLATE_IDS)[number];

export type ParticipantEmailCategory =
  | "account_access"
  | "purchase"
  | "billing"
  | "community"
  | "journey_progress"
  | "support"
  | "launch";

export type EmailCta = {
  label: string;
  url: string;
};

export type RenderedParticipantEmail = {
  id: ParticipantEmailTemplateId;
  category: ParticipantEmailCategory;
  locale: Locale;
  lang: "en" | "es";
  subject: string;
  preheader: string;
  heading: string;
  fromName: string;
  html: string;
  text: string;
  cta?: EmailCta;
  transactional: boolean;
  sendAuthorized: boolean;
};

export type ParticipantEmailVars = {
  firstName?: string;
  verifyUrl?: string;
  resetUrl?: string;
  offerName?: string;
  dashboardUrl?: string;
  billingUrl?: string;
  journeyUrl?: string;
  chapterTitle?: string;
  weeklyCommitment?: string;
  ticketId?: string;
  supportMailbox?: string;
  registerUrl?: string;
  priorityUrgent?: boolean;
};
