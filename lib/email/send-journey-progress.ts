import { getSiteUrl, isEmailDeliveryConfigured } from "@/lib/auth/config";
import { sendSmtpEmail } from "@/lib/auth/email/smtp";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { renderParticipantEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";

/**
 * Journey progress templates. Callers must not auto-send without an approved
 * cadence. Row 145 builds the templates; it does not start a drip.
 */
export async function sendJourneyChapterCompleteEmail(input: {
  email: string;
  locale: Locale;
  firstName: string;
  chapterTitle: string;
}): Promise<{ status: "sent" } | { status: "logged" } | { status: "not_configured" } | { status: "held" }> {
  const journeyUrl = `${getSiteUrl()}${getLocalizedArchitectPath("journey", input.locale)}`;
  const rendered = renderParticipantEmail("journey_chapter_complete", input.locale, {
    firstName: input.firstName,
    chapterTitle: input.chapterTitle,
    journeyUrl,
  });
  if (!isEmailDeliveryConfigured()) {
    return { status: "not_configured" };
  }
  const result = await sendSmtpEmail({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    fromName: rendered.fromName,
  });
  if (result.status === "sent") return { status: "sent" };
  if (result.status === "not_configured") return { status: "not_configured" };
  return { status: "logged" };
}
