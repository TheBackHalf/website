import { EMAIL_BRAND } from "@/lib/email/templates/brand";
import { findBannedEmailClaims } from "@/lib/email/templates/claims";
import { buildEmailCopy } from "@/lib/email/templates/copy";
import { wrapBrandedHtml, wrapPlainText } from "@/lib/email/templates/render";
import {
  PARTICIPANT_EMAIL_TEMPLATE_IDS,
  type ParticipantEmailTemplateId,
  type ParticipantEmailVars,
  type RenderedParticipantEmail,
} from "@/lib/email/templates/types";
import type { Locale } from "@/lib/i18n/config";

export {
  PARTICIPANT_EMAIL_TEMPLATE_IDS,
  type ParticipantEmailTemplateId,
  type ParticipantEmailVars,
  type RenderedParticipantEmail,
} from "@/lib/email/templates/types";

export function renderParticipantEmail(
  id: ParticipantEmailTemplateId,
  locale: Locale,
  vars: ParticipantEmailVars = {},
): RenderedParticipantEmail {
  const copy = buildEmailCopy(id, locale, vars);
  const html = wrapBrandedHtml({
    locale,
    subject: copy.subject,
    preheader: copy.preheader,
    heading: copy.heading,
    greeting: copy.greeting,
    paragraphs: copy.paragraphs,
    ctaLabel: copy.ctaLabel,
    ctaUrl: copy.ctaUrl,
    footerNote: copy.footerNote,
  });
  const text = wrapPlainText({
    locale,
    greeting: copy.greeting,
    paragraphs: copy.paragraphs,
    ctaLabel: copy.ctaLabel,
    ctaUrl: copy.ctaUrl,
    footerNote: copy.footerNote,
  });

  return {
    id,
    category: copy.category,
    locale,
    lang: locale === "es" ? "es" : "en",
    subject: copy.subject,
    preheader: copy.preheader,
    heading: copy.heading,
    fromName: copy.fromName,
    html,
    text,
    cta:
      copy.ctaLabel && copy.ctaUrl
        ? { label: copy.ctaLabel, url: copy.ctaUrl }
        : undefined,
    transactional: copy.transactional,
    sendAuthorized: copy.sendAuthorized,
  };
}

export function inventoryParticipantEmailTemplates(): Array<{
  id: ParticipantEmailTemplateId;
  category: ReturnType<typeof buildEmailCopy>["category"];
  locales: Locale[];
}> {
  return PARTICIPANT_EMAIL_TEMPLATE_IDS.map((id) => ({
    id,
    category: buildEmailCopy(id, "en", {}).category,
    locales: ["en", "es"],
  }));
}

export function scanRenderedEmailClaims(
  rendered: RenderedParticipantEmail,
): string[] {
  return findBannedEmailClaims(
    [rendered.subject, rendered.preheader, rendered.heading, rendered.text].join(
      "\n",
    ),
  );
}

export function previewSampleVars(
  id: ParticipantEmailTemplateId,
): ParticipantEmailVars {
  const samples: Record<ParticipantEmailTemplateId, ParticipantEmailVars> = {
    verify_account: {
      firstName: "Architect",
      verifyUrl: "https://thebackhalf.org/api/auth/verify-email?token=preview",
    },
    password_reset: {
      firstName: "Architect",
      resetUrl: "https://thebackhalf.org/reset-password?token=preview",
    },
    purchase_confirmed: {
      firstName: "Architect",
      offerName: "The Back Half Blueprint",
      dashboardUrl: "https://thebackhalf.org/architect/dashboard",
    },
    payment_failed: {
      firstName: "Architect",
      offerName: "The Back Half Blueprint",
      billingUrl: "https://thebackhalf.org/architect/billing",
    },
    community_activated: {
      firstName: "Architect",
      dashboardUrl: "https://thebackhalf.org/architect/dashboard",
    },
    community_canceled: {
      firstName: "Architect",
      billingUrl: "https://thebackhalf.org/architect/billing",
    },
    refund_notice: {
      firstName: "Architect",
      offerName: "The Back Half Blueprint",
      billingUrl: "https://thebackhalf.org/architect/billing",
    },
    journey_chapter_complete: {
      firstName: "Architect",
      chapterTitle: "Chapter I — The Awakening",
      journeyUrl: "https://thebackhalf.org/architect/journey",
    },
    journey_weekly_commitment: {
      firstName: "Architect",
      weeklyCommitment: "This week, I choose awareness over autopilot.",
      journeyUrl: "https://thebackhalf.org/architect/journey",
    },
    support_acknowledgment: {
      firstName: "Architect",
      ticketId: "BH-S-PREVIEW-0001",
      supportMailbox: "support@thebackhalf.org",
      priorityUrgent: false,
    },
    launch_announcement: {
      registerUrl: "https://thebackhalf.org/register",
    },
  };
  return samples[id];
}

export function productName(): string {
  return EMAIL_BRAND.productName;
}
