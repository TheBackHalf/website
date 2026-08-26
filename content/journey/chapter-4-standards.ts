/**
 * Chapter IV — The Standards — structured projection from approved sources.
 * Welcome + Core Teaching: content/blueprint/manuscript/generated/chapter-4-standards.ts
 * Reflection, Intentional Practice, Weekly Commitment, Founder Closing:
 * approved Foundry Send Chapter Four (Founder: Approved).
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_4_standards } from "@/content/blueprint/manuscript/generated/chapter-4-standards";

export const CHAPTER_4_ID = "chapter-4-standards" as const;
export const CHAPTER_4_STAGE_ID = "standards" as const;

export type Chapter4SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_4_SECTIONS: readonly Chapter4SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type StandardsReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type StandardsReflectionQuestion = {
  id: StandardsReflectionQuestionId;
  prompt: string;
};

export type StandardsPracticeId = "s1" | "s2" | "s3" | "s4" | "s5";

export type StandardsPracticeEntry = {
  id: StandardsPracticeId;
  label: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 3.
 */
export const chapter4FounderWelcomeRaw = chapter_4_standards.paragraphs
  .slice(0, 4)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraph 4). */
export const chapter4CoreTeachingRaw = chapter_4_standards.paragraphs[4] ?? "";

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/Chapter Four([A-Z])/g, "Chapter Four. $1")
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
 * Reject QA/test identity so Chapter IV never greets a participant as
 * Row129, E2E, or another seed/fixture name.
 */
export function isChapter4QaTestIdentity(
  firstName?: string | null,
  email?: string | null,
): boolean {
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (mail) {
    const local = mail.split("@")[0] ?? "";
    if (/(?:^|[.+_-])(e2e|qa\d*)(?:[.+_-]|$)/i.test(local)) return true;
    if (/^row\d+/i.test(local)) return true;
  }

  const name = typeof firstName === "string" ? firstName.trim() : "";
  if (!name) return false;
  if (/e2e/i.test(name)) return true;
  if (/^row\d+/i.test(name)) return true;
  if (/^(qa|test|fixture|dummy)\d*$/i.test(name)) return true;
  return false;
}

/** Approved participant display name, or null when the greeting must fall back. */
export function resolveChapter4DisplayName(
  firstName?: string | null,
  email?: string | null,
): string | null {
  if (isChapter4QaTestIdentity(firstName, email)) return null;
  const name = typeof firstName === "string" ? firstName.trim() : "";
  return name || null;
}

export function personalizeChapter4Welcome(
  raw: string,
  firstName?: string | null,
): string {
  const name = resolveChapter4DisplayName(firstName) ?? "";
  const placeholder = "Welcome back, {First Name}.";
  const fallback =
    "If your name isn't available...Welcome back, Architect.";
  const literalGreeting = "Welcome back, Architect.";

  if (name) {
    return restoreManuscriptSpacing(
      raw
        .replace(placeholder, `Welcome back, ${name}.`)
        .replace(fallback, "")
        .replace(literalGreeting, `Welcome back, ${name}.`),
    );
  }

  return restoreManuscriptSpacing(
    raw.replace(placeholder, "").replace(fallback, literalGreeting),
  );
}

/** Approved Architect Reflection Questions — Foundry Send Chapter Four. */
export const standardsReflectionQuestions: readonly StandardsReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "What standards have been quietly shaping your life until now?",
    },
    {
      id: "q2",
      prompt: "Which standards no longer serve the person you are becoming?",
    },
    {
      id: "q3",
      prompt:
        "What is one area of your life where your standards need to rise?",
    },
    {
      id: "q4",
      prompt: "What behaviors are no longer acceptable in your Back Half?",
    },
    {
      id: "q5",
      prompt: "What does honoring yourself look like on an ordinary Tuesday?",
    },
    {
      id: "q6",
      prompt:
        "Which standard would have the greatest positive impact if you lived it consistently?",
    },
    {
      id: "q7",
      prompt: "What kind of life do your standards make possible?",
    },
  ] as const;

/**
 * Approved Intentional Practice — Foundry Send Chapter Four (Approved revision).
 * Examples are instructional copy, never seeded into response fields.
 */
export const STANDARDS_PRACTICE = {
  title: "Intentional Practice",
  instructions: [
    "Write your first Back Half Standards.",
    "A standard is a personal commitment that guides how you choose to live. Unlike a goal, a standard is not something you hope to achieve—it is something you choose to practice every day.",
  ],
  examplesIntro: "Here are a few examples:",
  examples: [
    "I prioritize my mental and emotional wellness.",
    "I choose courage over comfort.",
    "I surround myself with people who elevate my life.",
    "I honor my body through movement and nourishment.",
    "I intentionally create moments of wonder.",
    "I protect my time and energy.",
    "I live in alignment with my values, even when it's difficult.",
  ],
  closing: [
    "Now write five standards that reflect the life you are intentionally creating.",
    "Don't choose them because they sound impressive.",
    "Choose them because they represent the person you are becoming.",
    "Read them every morning this week.",
  ],
  entries: [
    { id: "s1", label: "Standard One" },
    { id: "s2", label: "Standard Two" },
    { id: "s3", label: "Standard Three" },
    { id: "s4", label: "Standard Four" },
    { id: "s5", label: "Standard Five" },
  ] as const satisfies readonly StandardsPracticeEntry[],
} as const;

/**
 * Approved Weekly Commitment — Foundry Send Chapter Four.
 */
export const STANDARDS_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose standards over excuses.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Send Chapter Four.
 */
export const chapter4FounderClosingRaw =
  "Every extraordinary life is built one decision at a time.Your standards ensure those decisions are no longer left to chance.You are no longer waiting for life to happen.You are becoming someone who intentionally creates it.That is what Architects do.";

export const CHAPTER_4_TITLE = "Chapter IV — The Standards" as const;
export const CHAPTER_4_SHORT_TITLE = "The Standards" as const;
export const CHAPTER_4_TEACHING_SUBTITLE = "Creating Your Standards" as const;

export function isChapter4SectionId(
  value: unknown,
): value is Chapter4SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_4_SECTIONS as readonly string[]).includes(value)
  );
}

export function isStandardsReflectionQuestionId(
  value: unknown,
): value is StandardsReflectionQuestionId {
  return standardsReflectionQuestions.some((entry) => entry.id === value);
}

export function isStandardsPracticeId(
  value: unknown,
): value is StandardsPracticeId {
  return STANDARDS_PRACTICE.entries.some((entry) => entry.id === value);
}
