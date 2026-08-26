/**
 * Chapter I — The Awakening — structured projection from approved manuscript.
 * Source: content/blueprint/manuscript/generated/chapter-1-awakening.ts
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_1_awakening } from "@/content/blueprint/manuscript/generated/chapter-1-awakening";

export const CHAPTER_1_ID = "chapter-1-awakening" as const;
export const CHAPTER_1_STAGE_ID = "awakening" as const;

export type Chapter1SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_1_SECTIONS: readonly Chapter1SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type AwakeningReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5";

export type AwakeningReflectionQuestion = {
  id: AwakeningReflectionQuestionId;
  prompt: string;
};

export type AlivenessProjectQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5";

export type AlivenessProjectQuestion = {
  id: AlivenessProjectQuestionId;
  /** Verbatim heading from manuscript (e.g. Question One). */
  heading: string;
  /** Verbatim prompt title. */
  title: string;
  /** Verbatim instructional lines — display order preserved. */
  instructions: readonly string[];
  /** Verbatim example lines when present. */
  examples: readonly string[];
  /** Required non-empty answers to mark this question complete. */
  targetCount: number;
  /** Optional sentence stem for list answers. */
  stem?: string;
};

/** Verbatim Founder Welcome block (manuscript paragraph 0). */
export const chapter1FounderWelcomeRaw = chapter_1_awakening.paragraphs[0] ?? "";

/** Verbatim Core Teaching block (manuscript paragraph 1). */
export const chapter1CoreTeachingRaw = chapter_1_awakening.paragraphs[1] ?? "";

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 * Presentation only — same standard used for Row 83 Awakening entry.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/The Awakening([A-Z])/g, "The Awakening. $1")
    .replace(/\.\.\.([A-Za-z“"‘'])/g, "... $1")
    .replace(/([.?!])([A-Za-z“"‘'])/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Split run-on manuscript into display sentences without altering words.
 */
export function formatManuscriptForDisplay(raw: string): string[] {
  const spaced = restoreManuscriptSpacing(raw.trim());
  if (!spaced) {
    return [];
  }
  return spaced
    .split(/(?<=[.?!])\s+(?=[A-Z“"‘'])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function personalizeChapter1Welcome(
  raw: string,
  firstName?: string | null,
): string {
  const name = typeof firstName === "string" ? firstName.trim() : "";
  const placeholder = "Welcome, {First Name}.";
  const fallback = "If your name isn't available...Welcome, Architect.";

  if (name) {
    return restoreManuscriptSpacing(
      raw
        .replace(placeholder, `Welcome, ${name}.`)
        .replace(fallback, ""),
    );
  }

  return restoreManuscriptSpacing(
    raw.replace(placeholder, "").replace(fallback, "Welcome, Architect."),
  );
}

/**
 * Aliveness Project — structured from manuscript paragraph 2.
 * Instruction/example lines are verbatim fragments from the approved text.
 */
export const alivenessProjectQuestions: readonly AlivenessProjectQuestion[] = [
  {
    id: "q1",
    heading: "Question One",
    title: "What is ALIVENESS?",
    instructions: [
      "Not a definition.",
      "A description.",
      "Finish this sentence.",
      "I know I am alive when...",
      "Write fifty answers.",
      "Not five.",
      "Fifty.",
      "Keep going until you surprise yourself.",
    ],
    examples: [
      "I know I'm alive when...",
      "...I lose track of time.",
      "...I laugh from my belly.",
      "...I'm creating.",
      "...I'm learning.",
      "...I'm astonished.",
      "...I'm traveling.",
      "...I'm deeply serving.",
      "...I'm completely present.",
    ],
    targetCount: 50,
    stem: "I know I am alive when...",
  },
  {
    id: "q2",
    heading: "Question Two",
    title: "What kills aliveness?",
    instructions: [
      "Not philosophically.",
      "Practically.",
      "Again...",
      "Write fifty.",
    ],
    examples: [
      "People-pleasing.",
      "Fear.",
      "Obligation.",
      "Comparison.",
      "Autopilot.",
      "Settling.",
      "Perfectionism.",
      "Noise.",
    ],
    targetCount: 50,
  },
  {
    id: "q3",
    heading: "Question Three",
    title: "What restores aliveness?",
    instructions: [
      "Not happiness.",
      "Not productivity.",
      "Aliveness.",
    ],
    examples: [],
    // Manuscript does not specify fifty for Q3 — require at least one honest answer.
    targetCount: 1,
  },
  {
    id: "q4",
    heading: "Question Four",
    title: "What decisions create aliveness?",
    instructions: [
      "This one is huge.",
      "Because remember...",
      "People transform through decisions.",
      "List every decision that changed your life.",
      "Not events.",
      "Decisions.",
      "Write fifty.",
    ],
    examples: ['"I decided..."'],
    targetCount: 50,
    stem: "I decided...",
  },
  {
    id: "q5",
    heading: "Question Five",
    title: "What does an alive life require?",
    instructions: [
      "Not dream life.",
      "Alive life.",
      "What standards become non-negotiable?",
      "Boundaries?",
      "Relationships?",
      "Peace?",
      "Health?",
      "Wonder?",
      "Learning?",
      "Contribution?",
      "Freedom?",
    ],
    examples: [],
    // Manuscript asks for standards/requirements without a fifty count.
    targetCount: 1,
  },
] as const;

export const ALIVENESS_PROJECT_TITLE = "The Aliveness Project" as const;

export const CHAPTER_1_TITLE = "Chapter One — The Awakening" as const;
export const CHAPTER_1_SHORT_TITLE = "The Awakening" as const;

/**
 * Approved Architect Reflection Questions — Foundry Chapter One (Approved).
 */
export const awakeningReflectionQuestions: readonly AwakeningReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt:
        "Where in your life have you been living by expectation instead of intention?",
    },
    {
      id: "q2",
      prompt: "When do you feel most alive?",
    },
    {
      id: "q3",
      prompt: "What part of yourself has been waiting to be expressed?",
    },
    {
      id: "q4",
      prompt:
        "If nothing changed over the next five years, how would you honestly feel?",
    },
    {
      id: "q5",
      prompt: "What possibility are you afraid to admit you want?",
    },
  ] as const;

/**
 * Approved Weekly Commitment — Foundry Chapter One (Approved).
 */
export const AWAKENING_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose awareness over autopilot.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Chapter One (Approved).
 */
export const chapter1FounderClosingRaw =
  "The Awakening doesn't require certainty.It only requires honesty.If you're willing to tell yourself the truth about where you are today, you've already taken the first step toward creating a different tomorrow.Your Back Half has begun.";

export function isChapter1SectionId(value: unknown): value is Chapter1SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_1_SECTIONS as readonly string[]).includes(value)
  );
}

export function isAwakeningReflectionQuestionId(
  value: unknown,
): value is AwakeningReflectionQuestionId {
  return awakeningReflectionQuestions.some((entry) => entry.id === value);
}

export function getAlivenessProjectQuestion(
  id: AlivenessProjectQuestionId,
): AlivenessProjectQuestion | undefined {
  return alivenessProjectQuestions.find((question) => question.id === id);
}
