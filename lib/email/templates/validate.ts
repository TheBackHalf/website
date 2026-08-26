import {
  inventoryParticipantEmailTemplates,
  previewSampleVars,
  renderParticipantEmail,
  scanRenderedEmailClaims,
  PARTICIPANT_EMAIL_TEMPLATE_IDS,
} from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n/config";

export type EmailTemplateValidation = {
  id: string;
  locale: Locale;
  hasHtml: boolean;
  hasText: boolean;
  hasLang: boolean;
  hasPlainFallback: boolean;
  claims: string[];
  sendAuthorized: boolean;
};

export function validateBilingualEmailLibrary(): {
  inventory: ReturnType<typeof inventoryParticipantEmailTemplates>;
  results: EmailTemplateValidation[];
  allPassed: boolean;
  missingCategories: string[];
} {
  const inventory = inventoryParticipantEmailTemplates();
  const requiredCategories = new Set([
    "account_access",
    "purchase",
    "billing",
    "community",
    "journey_progress",
    "support",
    "launch",
  ]);
  const present = new Set(inventory.map((entry) => entry.category));
  const missingCategories = [...requiredCategories].filter(
    (category) => !present.has(category as (typeof inventory)[number]["category"]),
  );

  const results: EmailTemplateValidation[] = [];
  for (const id of PARTICIPANT_EMAIL_TEMPLATE_IDS) {
    for (const locale of ["en", "es"] as const) {
      const rendered = renderParticipantEmail(
        id,
        locale,
        previewSampleVars(id),
      );
      const claims = scanRenderedEmailClaims(rendered);
      results.push({
        id,
        locale,
        hasHtml: rendered.html.includes("<!DOCTYPE html>") && rendered.html.includes("lang="),
        hasText: rendered.text.trim().length > 40,
        hasLang: rendered.lang === locale,
        hasPlainFallback: rendered.text.includes(rendered.heading) || rendered.text.length > 40,
        claims,
        sendAuthorized: rendered.sendAuthorized,
      });
    }
  }

  const allPassed =
    missingCategories.length === 0 &&
    results.every(
      (entry) =>
        entry.hasHtml &&
        entry.hasText &&
        entry.hasLang &&
        entry.hasPlainFallback &&
        entry.claims.length === 0,
    );

  return { inventory, results, allPassed, missingCategories };
}
