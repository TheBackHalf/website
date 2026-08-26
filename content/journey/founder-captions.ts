/**
 * Row 50 — Founder video captions.
 * Cue text is the already-approved English/Spanish Founder scripts.
 * Do not rewrite manuscript copy. Timing is duration-weighted by cue length.
 */

import { welcomeLetter } from "@/content/blueprint/manuscript/generated/welcomeLetter";
import { chapter1FounderWelcomeRaw } from "@/content/journey/chapter-1-awakening";
import { chapter2FounderWelcomeRaw } from "@/content/journey/chapter-2-mirror";
import { chapter3FounderWelcomeRaw } from "@/content/journey/chapter-3-decision";
import { chapter4FounderWelcomeRaw } from "@/content/journey/chapter-4-standards";
import { chapter5FounderWelcomeRaw } from "@/content/journey/chapter-5-architect";
import { chapter6FounderWelcomeRaw } from "@/content/journey/chapter-6-expansion";
import {
  chapter7FounderCongratulationsRaw,
  chapter7FounderWelcomeRaw,
} from "@/content/journey/chapter-7-beginning";
import { chapter1FounderWelcomeRawEs } from "@/content/journey/es/chapter-1";
import { chapter2FounderWelcomeRawEs } from "@/content/journey/es/chapter-2";
import { chapter3FounderWelcomeRawEs } from "@/content/journey/es/chapter-3";
import { chapter4FounderWelcomeRawEs } from "@/content/journey/es/chapter-4";
import { chapter5FounderWelcomeRawEs } from "@/content/journey/es/chapter-5";
import { chapter6FounderWelcomeRawEs } from "@/content/journey/es/chapter-6";
import {
  chapter7FounderCongratulationsRawEs,
  chapter7FounderWelcomeRawEs,
} from "@/content/journey/es/chapter-7";
import {
  onboardingWelcomeParagraphsEs,
  onboardingWelcomeSignatureEs,
} from "@/content/journey/es/onboarding-welcome";
import type { Locale } from "@/lib/i18n/config";

export type FounderCaptionJobId =
  | "founding-architect-welcome"
  | "chapter-1-welcome"
  | "chapter-2-welcome"
  | "chapter-3-welcome"
  | "chapter-4-welcome"
  | "chapter-5-welcome"
  | "chapter-6-welcome"
  | "chapter-7-welcome"
  | "journey-completion";

export type FounderCaptionJob = {
  id: FounderCaptionJobId;
  locale: Locale;
  fileName: string;
  publicPath: string;
  videoPublicPath: string;
  script: string;
  /** When set, captions end at this spoken endpoint instead of file duration. */
  captionEndSeconds: number | null;
};

const CAPTIONS_DIR = "/captions/founder";

function captionPath(locale: Locale, id: FounderCaptionJobId): string {
  return `${CAPTIONS_DIR}/${locale}-${id}.vtt`;
}

function captionFileName(locale: Locale, id: FounderCaptionJobId): string {
  return `${locale}-${id}.vtt`;
}

const foundingArchitectWelcomeEn = [
  ...welcomeLetter.paragraphs,
  ...welcomeLetter.signature,
].join("\n\n");

const foundingArchitectWelcomeEs = [
  ...onboardingWelcomeParagraphsEs,
  ...onboardingWelcomeSignatureEs,
].join("\n\n");

export const founderCaptionJobs: readonly FounderCaptionJob[] = [
  {
    id: "founding-architect-welcome",
    locale: "en",
    fileName: captionFileName("en", "founding-architect-welcome"),
    publicPath: captionPath("en", "founding-architect-welcome"),
    videoPublicPath: "/videos/onboarding/founding-architect-welcome.mp4",
    script: foundingArchitectWelcomeEn,
    captionEndSeconds: null,
  },
  {
    id: "chapter-1-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-1-welcome"),
    publicPath: captionPath("en", "chapter-1-welcome"),
    videoPublicPath: "/videos/chapter-1/chapter-1-the-awakening.mp4",
    script: chapter1FounderWelcomeRaw,
    captionEndSeconds: 60.2,
  },
  {
    id: "chapter-2-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-2-welcome"),
    publicPath: captionPath("en", "chapter-2-welcome"),
    videoPublicPath: "/videos/chapter-2/chapter-2-the-mirror.mp4",
    script: chapter2FounderWelcomeRaw,
    captionEndSeconds: 58.66,
  },
  {
    id: "chapter-3-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-3-welcome"),
    publicPath: captionPath("en", "chapter-3-welcome"),
    videoPublicPath: "/videos/chapter-3/chapter-3-choosing-intention.mp4",
    script: chapter3FounderWelcomeRaw,
    captionEndSeconds: null,
  },
  {
    id: "chapter-4-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-4-welcome"),
    publicPath: captionPath("en", "chapter-4-welcome"),
    videoPublicPath: "/videos/chapter-4/chapter-4-creating-your-standards.mp4",
    script: chapter4FounderWelcomeRaw,
    captionEndSeconds: null,
  },
  {
    id: "chapter-5-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-5-welcome"),
    publicPath: captionPath("en", "chapter-5-welcome"),
    videoPublicPath: "/videos/chapter-5/chapter-5-becoming-the-architect.mp4",
    script: chapter5FounderWelcomeRaw,
    captionEndSeconds: null,
  },
  {
    id: "chapter-6-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-6-welcome"),
    publicPath: captionPath("en", "chapter-6-welcome"),
    videoPublicPath: "/videos/chapter-6/chapter-6-expansion.mp4",
    script: chapter6FounderWelcomeRaw,
    captionEndSeconds: null,
  },
  {
    id: "chapter-7-welcome",
    locale: "en",
    fileName: captionFileName("en", "chapter-7-welcome"),
    publicPath: captionPath("en", "chapter-7-welcome"),
    videoPublicPath: "/videos/chapter-7/chapter-7-beginning.mp4",
    script: chapter7FounderWelcomeRaw,
    captionEndSeconds: null,
  },
  {
    id: "journey-completion",
    locale: "en",
    fileName: captionFileName("en", "journey-completion"),
    publicPath: captionPath("en", "journey-completion"),
    videoPublicPath: "/videos/chapter-7/chapter-7-journey-completion.mp4",
    script: chapter7FounderCongratulationsRaw,
    captionEndSeconds: null,
  },
  {
    id: "founding-architect-welcome",
    locale: "es",
    fileName: captionFileName("es", "founding-architect-welcome"),
    publicPath: captionPath("es", "founding-architect-welcome"),
    videoPublicPath:
      "/videos/Founding%20Architect%20Welcome/Founding_Architect_Welcome-Spanish.mp4",
    script: foundingArchitectWelcomeEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-1-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-1-welcome"),
    publicPath: captionPath("es", "chapter-1-welcome"),
    videoPublicPath: "/videos/chapter%201/Chapter_1_The_Awakening-Spanish.mp4",
    script: chapter1FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-2-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-2-welcome"),
    publicPath: captionPath("es", "chapter-2-welcome"),
    videoPublicPath:
      "/videos/chapter%202/Chapter_2-_Seeing_Yourself_Clearly-Spanish.mp4",
    script: chapter2FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-3-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-3-welcome"),
    publicPath: captionPath("es", "chapter-3-welcome"),
    videoPublicPath: "/videos/chapter%203/Chapter_3_Choosing_Intention-Spanish.mp4",
    script: chapter3FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-4-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-4-welcome"),
    publicPath: captionPath("es", "chapter-4-welcome"),
    videoPublicPath:
      "/videos/chapter%204/Chapter_4_Creating_Your_Standards-Spanish.mp4",
    script: chapter4FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-5-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-5-welcome"),
    publicPath: captionPath("es", "chapter-5-welcome"),
    videoPublicPath:
      "/videos/chapter%205/Chapter_5_Becoming_the_Architect-Spanish.mp4",
    script: chapter5FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-6-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-6-welcome"),
    publicPath: captionPath("es", "chapter-6-welcome"),
    videoPublicPath: "/videos/chapter%206/Chapter_6_Expansion-Spanish.mp4",
    script: chapter6FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "chapter-7-welcome",
    locale: "es",
    fileName: captionFileName("es", "chapter-7-welcome"),
    publicPath: captionPath("es", "chapter-7-welcome"),
    videoPublicPath:
      "/videos/chapter%207/Chapter_7_Living_Your_Back_Half-Spanish.mp4",
    script: chapter7FounderWelcomeRawEs,
    captionEndSeconds: null,
  },
  {
    id: "journey-completion",
    locale: "es",
    fileName: captionFileName("es", "journey-completion"),
    publicPath: captionPath("es", "journey-completion"),
    videoPublicPath: "/videos/journey%20completion/Journey_Completion-Spanish.mp4",
    script: chapter7FounderCongratulationsRawEs,
    captionEndSeconds: null,
  },
] as const;

export function founderCaptionPublicPath(
  locale: Locale,
  id: FounderCaptionJobId,
): string {
  return captionPath(locale, id);
}

export function getFounderCaptionJob(
  locale: Locale,
  id: FounderCaptionJobId,
): FounderCaptionJob {
  const job = founderCaptionJobs.find(
    (entry) => entry.locale === locale && entry.id === id,
  );
  if (!job) {
    throw new Error(`Missing Founder caption job for ${locale}/${id}`);
  }
  return job;
}

export function normalizeFounderSpokenScript(script: string): string {
  return script
    .replace(/\r\n/g, "\n")
    .replace(/\.\.\.([A-Za-zÁÉÍÓÚÑÜáéíóúñü“"‘'¿¡])/g, "... $1")
    .replace(/([.?!])([A-Za-zÁÉÍÓÚÑÜáéíóúñü“"‘'¿¡])/g, "$1 $2")
    .replace(/([a-záéíóúñü])([A-ZÁÉÍÓÚÑÜ])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function wrapCue(text: string, maxChars = 84): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return [trimmed];
  }
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  const cues: string[] = [];
  for (let index = 0; index < lines.length; index += 2) {
    cues.push(lines.slice(index, index + 2).join("\n"));
  }
  return cues;
}

function splitScriptIntoCues(script: string): string[] {
  const prepared = normalizeFounderSpokenScript(script);
  const paragraphs = prepared
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const sentences: string[] = [];
  const sentenceSplit = /(?<=[.?!…])\s+(?=\S)/;
  for (const paragraph of paragraphs) {
    const parts = paragraph.split(sentenceSplit).map((part) => part.trim());
    for (const part of parts) {
      if (part) {
        sentences.push(part);
      }
    }
  }
  const packed: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (!buffer) {
      buffer = sentence;
      continue;
    }
    if (`${buffer} ${sentence}`.length <= 90) {
      buffer = `${buffer} ${sentence}`;
    } else {
      packed.push(buffer);
      buffer = sentence;
    }
  }
  if (buffer) {
    packed.push(buffer);
  }
  return packed.flatMap((cue) => wrapCue(cue));
}

function formatTimestamp(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const remainder = clamped - hours * 3600 - minutes * 60;
  const whole = Math.floor(remainder);
  const millis = Math.round((remainder - whole) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function splitFounderTranscriptParagraphs(script: string): string[] {
  const blocks = script
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => normalizeFounderSpokenScript(part))
    .filter(Boolean);
  if (blocks.length > 1) {
    return blocks;
  }
  const prepared = normalizeFounderSpokenScript(script);
  if (!prepared) {
    return [];
  }
  const sentences = prepared
    .split(/(?<=[.?!…])\s+(?=\S)/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (sentences.length <= 2) {
    return [prepared];
  }
  const paragraphs: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    const next = buffer ? `${buffer} ${sentence}` : sentence;
    if (buffer && next.length > 280) {
      paragraphs.push(buffer);
      buffer = sentence;
    } else {
      buffer = next;
    }
  }
  if (buffer) {
    paragraphs.push(buffer);
  }
  return paragraphs;
}

export function buildFounderCaptionVtt(
  script: string,
  durationSeconds: number,
): string {
  const cues = splitScriptIntoCues(script);
  if (!cues.length || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Cannot build Founder captions without script and duration.");
  }
  const startPad = 0.2;
  const endPad = 0.15;
  const usable = Math.max(durationSeconds - startPad - endPad, 1);
  const weights = cues.map((cue) => Math.max(cue.replace(/\s+/g, " ").length, 8));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const lines = ["WEBVTT", ""];
  let cursor = startPad;
  cues.forEach((cue, index) => {
    const share = (weights[index] / totalWeight) * usable;
    const start = cursor;
    const end =
      index === cues.length - 1
        ? Math.max(start + 0.8, durationSeconds - endPad)
        : start + Math.max(share, 1.2);
    cursor = end + 0.05;
    const safeText = cue.replace(/-->/g, "→");
    lines.push(
      `${formatTimestamp(start)} --> ${formatTimestamp(end)} line:78%`,
    );
    lines.push(safeText);
    lines.push("");
  });
  return lines.join("\n");
}
