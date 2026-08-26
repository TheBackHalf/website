/**
 * Chapter V — Becoming the Architect — structured projection from approved sources.
 * Welcome + Core Teaching: content/blueprint/manuscript/generated/chapter-5-architect.ts
 * Reflection, Intentional Practice, Weekly Commitment, Founder Closing:
 * approved Foundry Send Chapter Five (Founder: Approved).
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_5_architect } from "@/content/blueprint/manuscript/generated/chapter-5-architect";

export const CHAPTER_5_ID = "chapter-5-architect" as const;
export const CHAPTER_5_STAGE_ID = "architect" as const;

export type Chapter5SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_5_SECTIONS: readonly Chapter5SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type ArchitectReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type ArchitectReflectionQuestion = {
  id: ArchitectReflectionQuestionId;
  prompt: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 4.
 */
export const chapter5FounderWelcomeRaw = chapter_5_architect.paragraphs
  .slice(0, 5)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraph 5). */
export const chapter5CoreTeachingRaw = chapter_5_architect.paragraphs[5] ?? "";

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/Chapter Five([A-Z])/g, "Chapter Five. $1")
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
 * Reject QA/test identity so Chapter V never greets a participant as
 * Row130, E2E, or another seed/fixture name.
 */
export function isChapter5QaTestIdentity(
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
export function resolveChapter5DisplayName(
  firstName?: string | null,
  email?: string | null,
): string | null {
  if (isChapter5QaTestIdentity(firstName, email)) return null;
  const name = typeof firstName === "string" ? firstName.trim() : "";
  return name || null;
}

/**
 * Chapter V Founder Welcome always addresses the participant as Architect.
 * Do not insert first name, last name, display name, or account name.
 */
export function personalizeChapter5Welcome(
  raw: string,
  _firstName?: string | null,
): string {
  const placeholder = "Welcome back, {First Name}.";
  const fallback =
    "If your name isn't available...Welcome back, Architect.";
  const literalGreeting = "Welcome back, Architect.";

  return restoreManuscriptSpacing(
    raw.replace(placeholder, "").replace(fallback, literalGreeting),
  );
}

/** Approved Architect Reflection Questions — Foundry Send Chapter Five. */
export const architectReflectionQuestions: readonly ArchitectReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "What identity have you been carrying that no longer serves you?",
    },
    {
      id: "q2",
      prompt: "What kind of Architect are you choosing to become?",
    },
    {
      id: "q3",
      prompt:
        "How would an Architect approach the challenges currently in your life?",
    },
    {
      id: "q4",
      prompt: "Which daily habit best reflects your new identity?",
    },
    {
      id: "q5",
      prompt: "Where do you still give away responsibility for your life?",
    },
    {
      id: "q6",
      prompt:
        "What would change if you fully believed you were capable of intentionally creating an extraordinary life?",
    },
    {
      id: "q7",
      prompt: 'Complete this sentence: "I am an Architect who..."',
    },
  ] as const;

/**
 * Approved Intentional Practice — Foundry Send Chapter Five.
 */
export const ARCHITECT_PRACTICE = {
  title: "Intentional Practice",
  instructions: [
    "Write your Architect Identity Statement.",
    "Begin with:",
    "I am an Architect who...",
    "Describe the person you are intentionally becoming.",
    "Not who you hope to be someday.",
    "Who you choose to become beginning today.",
    "Read your statement every morning and every evening this week.",
    "Whenever you're faced with a decision, ask yourself:",
    "What would an Architect choose?",
    "Then choose accordingly.",
  ],
  stem: "I am an Architect who...",
} as const;

/**
 * Approved Weekly Commitment — Foundry Send Chapter Five.
 */
export const ARCHITECT_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose to live as the Architect of my life.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Send Chapter Five.
 */
export const chapter5FounderClosingRaw =
  "Today isn't about earning a title.It's about accepting a responsibility.You have the ability to intentionally create your life.Not perfectly.Not all at once.But one decision at a time.Welcome, Architect.Your identity has changed.Now let your life reflect it.";

export const CHAPTER_5_TITLE = "Chapter V — Becoming the Architect" as const;
export const CHAPTER_5_SHORT_TITLE = "Becoming the Architect" as const;

export function isChapter5SectionId(
  value: unknown,
): value is Chapter5SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_5_SECTIONS as readonly string[]).includes(value)
  );
}

export function isArchitectReflectionQuestionId(
  value: unknown,
): value is ArchitectReflectionQuestionId {
  return architectReflectionQuestions.some((entry) => entry.id === value);
}
