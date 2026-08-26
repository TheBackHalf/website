import Link from "next/link";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { chapter_1_awakening } from "@/content/blueprint/manuscript/generated/chapter-1-awakening";
import {
  getChapter1Localized,
  getJourneyStages,
} from "@/content/journey/localized";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import type { Locale } from "@/lib/i18n/config";

type AwakeningEntryProps = {
  locale: Locale;
  firstName?: string | null;
  /** When true, CTA acknowledges Chapter One begins (onboarding completion). */
  showBeginCta?: boolean;
  onBeginHref?: string;
  /** Optional override for CTA label (Row 85 resume/complete). */
  beginLabel?: string;
};

function personalizeChapterOpener(
  raw: string,
  firstName?: string | null,
): string {
  const name = typeof firstName === "string" ? firstName.trim() : "";
  const placeholder = "Welcome, {First Name}.";
  const fallback = "If your name isn't available...Welcome, Architect.";

  if (name) {
    return raw
      .replace(placeholder, `Welcome, ${name}.`)
      .replace(fallback, "");
  }

  return raw.replace(placeholder, "").replace(fallback, "Welcome, Architect.");
}

/**
 * Restore missing spaces after punctuation in collapsed manuscript text.
 * Wording is unchanged — presentation only.
 */
function restoreSentenceSpacing(raw: string): string {
  return raw
    .replace(/\.\.\.([A-Za-z“"‘'])/g, "... $1")
    .replace(/([.?!])([A-Za-z“"‘'])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const AWAKENING_OPENER_CLOSING =
  "When you're ready... Let's begin Chapter One.";

/**
 * Split the English opener into welcome / body / closing for display only.
 * Approved wording is preserved exactly.
 */
function englishOpenerParagraphs(firstName?: string | null): string[] {
  const opener = restoreSentenceSpacing(
    personalizeChapterOpener(
      chapter_1_awakening.paragraphs[0] ?? "",
      firstName,
    ),
  );
  const closing = AWAKENING_OPENER_CLOSING;
  const withoutClosing = opener.endsWith(closing)
    ? opener.slice(0, -closing.length).trim()
    : opener;

  const welcomeMatch = withoutClosing.match(/^(Welcome, [^.]+\.)\s*/);
  const welcome = welcomeMatch?.[1] ?? "";
  const body = welcomeMatch
    ? withoutClosing.slice(welcomeMatch[0].length).trim()
    : withoutClosing;

  return [welcome, body, closing].filter(Boolean);
}

/**
 * Row 83 — Awakening entry (stage heading + first chapter opener).
 * Row 85 — CTA routes into the full Chapter One experience.
 */
export function AwakeningEntry({
  locale,
  firstName,
  showBeginCta = true,
  onBeginHref,
  beginLabel,
}: AwakeningEntryProps) {
  const copy = getDictionary(locale).appShell.onboarding;
  const stage = getJourneyStages(locale).find(
    (entry) => entry.id === "awakening",
  );
  const chapterOne = getChapter1Localized(locale);
  const openerParagraphs =
    locale === "en"
      ? englishOpenerParagraphs(firstName)
      : chapterOne.formatForDisplay(
          chapterOne.personalizeWelcome(chapterOne.founderWelcomeRaw, firstName),
        );

  const href =
    onBeginHref ?? getLocalizedArchitectPath("journey", locale);

  const bodyClassName =
    "bh-awakening-entry-body max-w-3xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg";

  return (
    <section
      className="bh-awakening-entry"
      aria-labelledby="awakening-entry-heading"
    >
      <h2
        id="awakening-entry-heading"
        className="bh-awakening-entry-title font-display text-3xl text-bh-ink md:text-4xl"
      >
        {stage?.name ?? resolveAppShellLabel(locale, copy.awakeningTitle)}
      </h2>
      {stage?.heading?.lines.map((line, index) => (
        <p
          key={line}
          className={
            stage.heading?.accentLineIndex === index
              ? "mt-4 font-display text-xl font-bold text-bh-purple md:text-2xl"
              : "mt-4 font-display text-xl text-bh-ink md:text-2xl"
          }
        >
          {line}
        </p>
      ))}
      <div className="mt-8 space-y-5">
        {openerParagraphs.map((paragraph, index) => (
          <p key={`awakening-opener-${index}`} className={bodyClassName}>
            {paragraph}
          </p>
        ))}
      </div>
      {showBeginCta ? (
        <div className="mt-10">
          <p className="mb-4 font-sans text-sm font-medium tracking-wide text-bh-ink">
            {resolveAppShellLabel(locale, copy.awakeningCta)}
          </p>
          <Link href={href} className="bh-cta inline-flex">
            {beginLabel ?? resolveAppShellLabel(locale, copy.awakeningBegin)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
