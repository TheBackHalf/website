/**
 * Chapter VI — Expansion — structured projection from approved sources.
 * Welcome + Core Teaching: content/blueprint/manuscript/generated/chapter-6-expansion.ts
 * Reflection, Intentional Practice, Weekly Commitment, Founder Closing:
 * approved Foundry Send Chapter Six (Founder: Approved).
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_6_expansion } from "@/content/blueprint/manuscript/generated/chapter-6-expansion";

export const CHAPTER_6_ID = "chapter-6-expansion" as const;
export const CHAPTER_6_STAGE_ID = "expansion" as const;

export type Chapter6SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_6_SECTIONS: readonly Chapter6SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type ExpansionReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type ExpansionReflectionQuestion = {
  id: ExpansionReflectionQuestionId;
  prompt: string;
};

export type ExpansionPracticeId = "yourself" | "someoneElse" | "world";

export type ExpansionPracticeEntry = {
  id: ExpansionPracticeId;
  label: string;
  prompt: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 5.
 */
export const chapter6FounderWelcomeRaw = chapter_6_expansion.paragraphs
  .slice(0, 6)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraph 6). */
export const chapter6CoreTeachingRaw = chapter_6_expansion.paragraphs[6] ?? "";

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/Chapter Six([A-Z])/g, "Chapter Six. $1")
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

/**
 * Chapter VI Founder Welcome always addresses the participant as Architect.
 * Do not insert first name, last name, display name, or account name.
 */
export function personalizeChapter6Welcome(
  raw: string,
  firstName?: string | null,
): string {
  void firstName;
  const placeholder = "Welcome back, {First Name}.";
  const fallback =
    "If your name isn't available...Welcome back, Architect.";
  const literalGreeting = "Welcome back, Architect.";

  return restoreManuscriptSpacing(
    raw.replace(placeholder, "").replace(fallback, literalGreeting),
  );
}

/** Approved Architect Reflection Questions — Foundry Send Chapter Six. */
export const expansionReflectionQuestions: readonly ExpansionReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt:
        "How has your transformation already influenced the people around you?",
    },
    {
      id: "q2",
      prompt:
        "Who in your life needs someone living as an example of what's possible?",
    },
    {
      id: "q3",
      prompt: "How do you want people to feel after spending time with you?",
    },
    {
      id: "q4",
      prompt:
        "What gifts, talents, or experiences are you uniquely positioned to share?",
    },
    {
      id: "q5",
      prompt: "How can your daily life become an expression of generosity?",
    },
    {
      id: "q6",
      prompt:
        "What legacy are you intentionally creating—not someday, but today?",
    },
    {
      id: "q7",
      prompt: "Where is your life being called to expand?",
    },
  ] as const;

/**
 * Approved Intentional Practice — Foundry Send Chapter Six / guidebook Expansion Plan.
 */
export const EXPANSION_PRACTICE = {
  title: "Intentional Practice",
  instructions: [
    "Complete your Expansion Plan.",
    "Choose one intentional action in each of these three areas:",
  ],
  remember:
    "Remember, expansion doesn't begin with extraordinary acts. It begins with intentional ones.",
  entries: [
    {
      id: "yourself",
      label: "For Yourself",
      prompt: "How will you continue investing in your own growth?",
    },
    {
      id: "someoneElse",
      label: "For Someone Else",
      prompt:
        "Who will you intentionally encourage, support, or serve this week?",
    },
    {
      id: "world",
      label: "For the World Around You",
      prompt:
        "What is one meaningful contribution—large or small—you can make that reflects the person you're becoming?",
    },
  ] as const satisfies readonly ExpansionPracticeEntry[],
} as const;

/**
 * Approved Weekly Commitment — Foundry Send Chapter Six.
 */
export const EXPANSION_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose contribution over complacency.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Send Chapter Six.
 */
export const chapter6FounderClosingRaw =
  "An extraordinary life is never measured only by what it achieves.It is measured by what it awakens in others.As you continue becoming more fully yourself, you'll discover something remarkable.Your courage gives others permission to be courageous.Your intention inspires intention.Your aliveness reminds people that magical is possible.That is the quiet power of an Architect.And that is how transformation expands.";

export const CHAPTER_6_TITLE = "Chapter VI — Expansion" as const;
export const CHAPTER_6_SHORT_TITLE = "Expansion" as const;

export function isChapter6SectionId(
  value: unknown,
): value is Chapter6SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_6_SECTIONS as readonly string[]).includes(value)
  );
}

export function isExpansionReflectionQuestionId(
  value: unknown,
): value is ExpansionReflectionQuestionId {
  return expansionReflectionQuestions.some((entry) => entry.id === value);
}

export function isExpansionPracticeId(
  value: unknown,
): value is ExpansionPracticeId {
  return EXPANSION_PRACTICE.entries.some((entry) => entry.id === value);
}
