import {
  signature as welcomeSignature,
  welcomeLetter,
} from "@/content/blueprint/manuscript/generated/welcomeLetter";
import {
  onboardingWelcomeParagraphsEs,
  onboardingWelcomeSignatureEs,
} from "@/content/journey/es/onboarding-welcome";
import type { Locale } from "@/lib/i18n/config";

const UNAVAILABLE_OPENER_EN = "If your name isn't available…Welcome, Architect.";
const UNAVAILABLE_OPENER_ES =
  "Si tu nombre no está disponible…Bienvenido, Architect.";

export type FounderWelcomeContent = {
  bodyParagraphs: string[];
  signatureLines: readonly string[];
};

/**
 * Founder welcome from approved welcomeLetter manuscript (EN) or Spanish
 * localization (ES). Personalizes the First Name opener when available —
 * does not invent English copy.
 */
export function getFounderWelcomeContent(
  firstName?: string | null,
  locale: Locale = "en",
): FounderWelcomeContent {
  const name = typeof firstName === "string" ? firstName.trim() : "";

  if (locale === "es") {
    const bodyParagraphs: string[] = [...onboardingWelcomeParagraphsEs];
    if (name && bodyParagraphs[0] === UNAVAILABLE_OPENER_ES) {
      bodyParagraphs[0] = `Bienvenido, ${name}.`;
    } else if (name && bodyParagraphs[0]?.startsWith(UNAVAILABLE_OPENER_ES)) {
      const remainder = bodyParagraphs[0]
        .slice(UNAVAILABLE_OPENER_ES.length)
        .trimStart();
      bodyParagraphs[0] = remainder
        ? `Bienvenido, ${name}. ${remainder}`
        : `Bienvenido, ${name}.`;
    }
    return {
      bodyParagraphs,
      signatureLines: onboardingWelcomeSignatureEs,
    };
  }

  const bodyParagraphs: string[] = [...welcomeLetter.paragraphs];

  if (name && bodyParagraphs[0] === UNAVAILABLE_OPENER_EN) {
    bodyParagraphs[0] = `Welcome, ${name}.`;
  } else if (name && bodyParagraphs[0]?.startsWith(UNAVAILABLE_OPENER_EN)) {
    const remainder = bodyParagraphs[0]
      .slice(UNAVAILABLE_OPENER_EN.length)
      .trimStart();
    bodyParagraphs[0] = remainder
      ? `Welcome, ${name}. ${remainder}`
      : `Welcome, ${name}.`;
  }

  return {
    bodyParagraphs,
    signatureLines: welcomeSignature,
  };
}

/**
 * Flattened paragraphs (body + signature) for callers that need a single list.
 */
export function getFounderWelcomeParagraphs(
  firstName?: string | null,
  locale: Locale = "en",
): string[] {
  const { bodyParagraphs, signatureLines } = getFounderWelcomeContent(
    firstName,
    locale,
  );
  return [...bodyParagraphs, ...signatureLines];
}
