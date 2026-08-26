/**
 * Chapter II — The Mirror — structured projection from approved manuscript.
 * Source: content/blueprint/manuscript/generated/chapter-2-mirror.ts
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_2_mirror } from "@/content/blueprint/manuscript/generated/chapter-2-mirror";

export const CHAPTER_2_ID = "chapter-2-mirror" as const;
export const CHAPTER_2_STAGE_ID = "mirror" as const;

export type Chapter2SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_2_SECTIONS: readonly Chapter2SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type MirrorReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type MirrorReflectionQuestion = {
  id: MirrorReflectionQuestionId;
  prompt: string;
};

export type MirrorStepId = "step1" | "step2" | "step3" | "step4";

export type MirrorDimensionId =
  | "identity"
  | "time"
  | "work"
  | "relationships"
  | "health"
  | "wonder"
  | "stewardship"
  | "contribution";

export type MirrorMatrixRow = {
  expectation: string;
  intention: string;
  decision: string;
  dailyEvidence: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 4.
 * The generated manuscript splits the welcome across five paragraphs; reading
 * only paragraph 0 orphaned the entire welcome body.
 */
export const chapter2FounderWelcomeRaw = chapter_2_mirror.paragraphs
  .slice(0, 5)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraph 5). */
export const chapter2CoreTeachingRaw = chapter_2_mirror.paragraphs[5] ?? "";

/**
 * Split run-on manuscript into display sentences without altering words.
 * Handles both collapsed manuscript text (period immediately followed by a
 * capital) and already-spaced text produced by joining manuscript paragraphs.
 */
export function formatManuscriptForDisplay(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .replace(/([.?!])([A-Z“"‘'])/g, "$1 $2")
    .split(/(?<=[.?!])\s+(?=[A-Z“"‘'])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function personalizeChapter2Welcome(
  raw: string,
  firstName?: string | null,
): string {
  const name = typeof firstName === "string" ? firstName.trim() : "";
  const placeholder = "Welcome back, {First Name}.";
  const fallback =
    "If your name isn't available...Welcome back, Architect.";
  /** The approved manuscript greets the Architect directly, with no placeholder. */
  const literalGreeting = "Welcome back, Architect.";

  if (name) {
    return raw
      .replace(placeholder, `Welcome back, ${name}.`)
      .replace(fallback, "")
      .replace(literalGreeting, `Welcome back, ${name}.`)
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return raw
    .replace(placeholder, "")
    .replace(fallback, literalGreeting)
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const MIRROR_STEP_ONE = {
  id: "step1" as const,
  heading: "Step One",
  title: "Someone is living by expectation when...",
  instructions: [
    "Finish this sentence.",
    "Someone is living by expectation when...",
    "I don't want 10 answers.",
    "I want 50.",
  ],
  examples: [
    "...their calendar belongs to everyone else.",
    "...they postpone joy.",
    "...they mistake comfort for peace.",
    "...they silence their curiosity.",
    '...they keep saying, "After retirement..."',
    "...they tolerate environments that diminish them.",
    "...they've stopped asking what they actually want.",
  ],
  notice: ["Notice...", "These are observable.", "Not abstract."],
  targetCount: 50,
  stem: "Someone is living by expectation when...",
} as const;

export const MIRROR_STEP_TWO = {
  id: "step2" as const,
  heading: "Step Two",
  title: "Someone is living intentionally when...",
  instructions: [
    "Now...",
    "Finish the opposite sentence.",
    "Someone is living intentionally when...",
    "Again...",
    "50 answers.",
  ],
  examples: [
    "...their calendar reflects their values.",
    "...they protect their peace.",
    "...they create before they consume.",
    "...their relationships nourish them.",
    "...their work expresses their gifts.",
    "...they choose wonder regularly.",
  ],
  targetCount: 50,
  stem: "Someone is living intentionally when...",
} as const;

export const MIRROR_STEP_THREE = {
  id: "step3" as const,
  heading: "Step Three",
  title: "Expectation · Intention · Decision · Daily Evidence",
  instructions: [
    "Now we build something I think could become one of your most valuable assets.",
    "Create four columns.",
    "Expectation",
    "Intention",
    "Decision",
    "Daily Evidence",
  ],
  examples: [
    "I work for approval | I work from purpose | I decided to define success for myself | My calendar reflects my priorities",
    "I tolerate draining relationships | I cultivate life-giving relationships | I decided peace is non-negotiable | I invest in relationships that nurture mutual growth",
  ],
  /** Manuscript does not specify row count — require at least one complete row. */
  minCompleteRows: 1,
} as const;

export const MIRROR_DIMENSIONS: readonly {
  id: MirrorDimensionId;
  label: string;
  prompt: string;
}[] = [
  { id: "identity", label: "Identity", prompt: "Who am I becoming?" },
  { id: "time", label: "Time", prompt: "Who owns my calendar?" },
  {
    id: "work",
    label: "Work",
    prompt: "Does my work reflect my calling?",
  },
  {
    id: "relationships",
    label: "Relationships",
    prompt: "Do my relationships expand or diminish me?",
  },
  {
    id: "health",
    label: "Health",
    prompt: "Does my body support my vision?",
  },
  {
    id: "wonder",
    label: "Wonder",
    prompt: "Have I stopped experiencing awe?",
  },
  {
    id: "stewardship",
    label: "Stewardship",
    prompt: "Does money create freedom or fear?",
  },
  {
    id: "contribution",
    label: "Contribution",
    prompt: "Am I creating value beyond myself?",
  },
] as const;

export const MIRROR_STEP_FOUR = {
  id: "step4" as const,
  heading: "Step Four",
  title: "Discover recurring dimensions",
  instructions: [
    "Now we're going to discover something.",
    "Not write it.",
    "Discover it.",
    "I want you to group all of your examples.",
    "I predict you'll discover recurring dimensions like:",
  ],
  /** Manuscript asks for discovery/grouping without a fixed count. */
  minFilledDimensions: 1,
} as const;

export const MIRROR_EXERCISE_TITLE = "The Back Half Mirror" as const;
export const CHAPTER_2_TITLE = "Chapter Two — The Mirror" as const;
export const CHAPTER_2_SHORT_TITLE = "The Mirror" as const;
export const CHAPTER_2_TEACHING_SUBTITLE =
  "Seeing Yourself Clearly" as const;

/**
 * Approved Architect Reflection Questions — Foundry Chapter Two (Approved).
 */
export const mirrorReflectionQuestions: readonly MirrorReflectionQuestion[] = [
  {
    id: "q1",
    prompt: "Which area of your life feels most alive today?",
  },
  {
    id: "q2",
    prompt: "Which area feels most neglected?",
  },
  {
    id: "q3",
    prompt:
      'Where are you settling for "good enough" instead of pursuing fullness?',
  },
  {
    id: "q4",
    prompt:
      "What have you normalized that no longer aligns with who you are becoming?",
  },
  {
    id: "q5",
    prompt:
      "If someone observed your daily life, what would they conclude matters most to you?",
  },
  {
    id: "q6",
    prompt:
      "Does your calendar reflect your priorities—or your obligations?",
  },
  {
    id: "q7",
    prompt: "What truth have you been avoiding?",
  },
] as const;

/**
 * Approved Weekly Commitment — Foundry Chapter Two (Approved).
 */
export const MIRROR_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose honesty over comfort.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Chapter Two (Approved).
 */
export const chapter2FounderClosingRaw =
  "The Mirror doesn't exist to discourage you.It exists to liberate you.When you stop pretending everything is fine, you create space for something extraordinary to begin.Today, you chose truth.And truth is always the beginning of transformation.";

export function isChapter2SectionId(
  value: unknown,
): value is Chapter2SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_2_SECTIONS as readonly string[]).includes(value)
  );
}

export function isMirrorReflectionQuestionId(
  value: unknown,
): value is MirrorReflectionQuestionId {
  return mirrorReflectionQuestions.some((entry) => entry.id === value);
}

export function isMirrorDimensionId(
  value: unknown,
): value is MirrorDimensionId {
  return MIRROR_DIMENSIONS.some((entry) => entry.id === value);
}
