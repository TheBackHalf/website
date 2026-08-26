/**
 * Row 138 — Founder media accessibility catalog.
 * Launch-critical videos require captions, transcripts, and posters in each
 * available language. Closing placements without a video are not launch videos.
 * Do not rewrite approved Founder scripts.
 */

import {
  founderCaptionJobs,
  founderCaptionPublicPath,
  getFounderCaptionJob,
  splitFounderTranscriptParagraphs,
  type FounderCaptionJobId,
} from "@/content/journey/founder-captions";
import type { FounderMediaLocaleBundle } from "@/content/journey/founder-media-locale";
import type { Locale } from "@/lib/i18n/config";

const TRANSCRIPTS_DIR = "/transcripts/founder";
const POSTERS_DIR = "/posters/founder";

export const FOUNDER_LAUNCH_VIDEO_IDS: readonly FounderCaptionJobId[] = [
  "founding-architect-welcome",
  "chapter-1-welcome",
  "chapter-2-welcome",
  "chapter-3-welcome",
  "chapter-4-welcome",
  "chapter-5-welcome",
  "chapter-6-welcome",
  "chapter-7-welcome",
  "journey-completion",
] as const;

export type FounderLaunchVideoTitle = {
  en: string;
  es: string;
};

export const founderLaunchVideoTitles: Record<
  FounderCaptionJobId,
  FounderLaunchVideoTitle
> = {
  "founding-architect-welcome": {
    en: "Founding Architect Welcome",
    es: "Bienvenida Founding Architect",
  },
  "chapter-1-welcome": {
    en: "Chapter One: The Awakening",
    es: "Capítulo Uno: El Despertar",
  },
  "chapter-2-welcome": {
    en: "CHAPTER II — THE MIRROR",
    es: "CAPÍTULO II — EL ESPEJO",
  },
  "chapter-3-welcome": {
    en: "Chapter Three — The Decision",
    es: "Capítulo Tres — La Decisión",
  },
  "chapter-4-welcome": {
    en: "Chapter Four — The Standards",
    es: "Capítulo Cuatro — Los Estándares",
  },
  "chapter-5-welcome": {
    en: "Chapter Five — Becoming the Architect",
    es: "Capítulo Cinco — Convertirse en Architect",
  },
  "chapter-6-welcome": {
    en: "Chapter Six — Expansion",
    es: "Capítulo Seis — Expansión",
  },
  "chapter-7-welcome": {
    en: "Chapter Seven — The Beginning",
    es: "Capítulo Siete — El Comienzo",
  },
  "journey-completion": {
    en: "Journey Completion",
    es: "Finalización del Journey",
  },
};

export function isFounderCaptionJobId(value: string): value is FounderCaptionJobId {
  return FOUNDER_LAUNCH_VIDEO_IDS.includes(value as FounderCaptionJobId);
}

export function founderTranscriptPagePath(
  locale: Locale,
  id: FounderCaptionJobId,
): string {
  return locale === "es"
    ? `/es/transcripts/founder/${id}`
    : `/transcripts/founder/${id}`;
}

export function founderTranscriptTextPublicPath(
  locale: Locale,
  id: FounderCaptionJobId,
): string {
  return `${TRANSCRIPTS_DIR}/${locale}-${id}.txt`;
}

export function founderPosterPublicPath(
  locale: Locale,
  id: FounderCaptionJobId,
): string {
  return `${POSTERS_DIR}/${locale}-${id}.jpg`;
}

export function founderLaunchMediaA11y(
  locale: Locale,
  id: FounderCaptionJobId,
): Pick<FounderMediaLocaleBundle, "poster" | "captionsSrc" | "transcriptSrc"> {
  return {
    poster: founderPosterPublicPath(locale, id),
    captionsSrc: founderCaptionPublicPath(locale, id),
    transcriptSrc: founderTranscriptPagePath(locale, id),
  };
}

export type FounderLaunchA11yAsset = {
  id: FounderCaptionJobId;
  locale: Locale;
  title: string;
  videoPublicPath: string;
  captionsPublicPath: string;
  transcriptPagePath: string;
  transcriptTextPublicPath: string;
  posterPublicPath: string;
  script: string;
  paragraphs: string[];
};

export function listFounderLaunchA11yAssets(): FounderLaunchA11yAsset[] {
  return founderCaptionJobs.map((job) => ({
    id: job.id,
    locale: job.locale,
    title: founderLaunchVideoTitles[job.id][job.locale],
    videoPublicPath: job.videoPublicPath,
    captionsPublicPath: job.publicPath,
    transcriptPagePath: founderTranscriptPagePath(job.locale, job.id),
    transcriptTextPublicPath: founderTranscriptTextPublicPath(job.locale, job.id),
    posterPublicPath: founderPosterPublicPath(job.locale, job.id),
    script: job.script,
    paragraphs: splitFounderTranscriptParagraphs(job.script),
  }));
}

export function getFounderLaunchA11yAsset(
  locale: Locale,
  id: FounderCaptionJobId,
): FounderLaunchA11yAsset {
  const job = getFounderCaptionJob(locale, id);
  return {
    id: job.id,
    locale: job.locale,
    title: founderLaunchVideoTitles[job.id][job.locale],
    videoPublicPath: job.videoPublicPath,
    captionsPublicPath: job.publicPath,
    transcriptPagePath: founderTranscriptPagePath(job.locale, job.id),
    transcriptTextPublicPath: founderTranscriptTextPublicPath(job.locale, job.id),
    posterPublicPath: founderPosterPublicPath(job.locale, job.id),
    script: job.script,
    paragraphs: splitFounderTranscriptParagraphs(job.script),
  };
}

export function buildFounderTranscriptText(script: string): string {
  return `${splitFounderTranscriptParagraphs(script).join("\n\n")}\n`;
}
