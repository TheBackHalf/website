import type { Locale } from "@/lib/i18n/config";

export function getAlivenessAssessmentPath(
  locale: Locale,
  view: "questions" | "results" = "questions",
): string {
  const base =
    locale === "es"
      ? "/es/architect/assessment/aliveness"
      : "/architect/assessment/aliveness";
  return view === "results" ? `${base}/results` : base;
}

export function getAlivenessLuminaDiscussionPath(locale: Locale): string {
  const lumina =
    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";
  return `${lumina}?topic=aliveness`;
}
