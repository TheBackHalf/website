/**
 * Chapter III — The Decision — structured projection from approved manuscript.
 * Source: content/blueprint/manuscript/generated/chapter-3-decision.ts
 * Weekly Commitment + Founder Closing Reflection from approved Foundry Chapter Three.
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_3_decision } from "@/content/blueprint/manuscript/generated/chapter-3-decision";

export const CHAPTER_3_ID = "chapter-3-decision" as const;
export const CHAPTER_3_STAGE_ID = "decision" as const;

export type Chapter3SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_3_SECTIONS: readonly Chapter3SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type DecisionReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type DecisionReflectionQuestion = {
  id: DecisionReflectionQuestionId;
  prompt: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 4.
 * The generated manuscript splits the welcome across five paragraphs; reading
 * only paragraph 0 orphaned the entire welcome body.
 */
export const chapter3FounderWelcomeRaw = chapter_3_decision.paragraphs
  .slice(0, 5)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraph 5). */
export const chapter3CoreTeachingRaw = chapter_3_decision.paragraphs[5] ?? "";

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/Chapter Three([A-Z])/g, "Chapter Three. $1")
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
 * Reject QA/test identity so Chapter III never greets a participant as
 * Row87, E2E, or another seed/fixture name.
 */
export function isChapter3QaTestIdentity(
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
export function resolveChapter3DisplayName(
  firstName?: string | null,
  email?: string | null,
): string | null {
  if (isChapter3QaTestIdentity(firstName, email)) return null;
  const name = typeof firstName === "string" ? firstName.trim() : "";
  return name || null;
}

export function personalizeChapter3Welcome(
  raw: string,
  firstName?: string | null,
): string {
  const name = resolveChapter3DisplayName(firstName) ?? "";
  const placeholder = "Welcome back, {First Name}.";
  const fallback =
    "If your name isn't available...Welcome back, Architect.";
  /** The approved manuscript greets the Architect directly, with no placeholder. */
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

/** Approved Architect Reflection Questions — verbatim from manuscript. */
export const decisionReflectionQuestions: readonly DecisionReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "What decision have you been postponing?",
    },
    {
      id: "q2",
      prompt: "What fear has been quietly making decisions for you?",
    },
    {
      id: "q3",
      prompt: "Where are you waiting instead of acting?",
    },
    {
      id: "q4",
      prompt: "What would your future self encourage you to decide today?",
    },
    {
      id: "q5",
      prompt: "What are you no longer willing to tolerate in your life?",
    },
    {
      id: "q6",
      prompt: "What kind of person do you choose to become?",
    },
    {
      id: "q7",
      prompt: "What decision will define the beginning of your Back Half?",
    },
  ] as const;

/** Approved Intentional Practice instructions. */
export const DECISION_PRACTICE = {
  title: "Intentional Practice",
  instructions: [
    "Write your Decision Statement.",
    "Complete this sentence:",
    "Beginning today, I choose to...",
    "Keep it visible throughout the week.",
    "Return to it every morning.",
    "Allow it to become the lens through which you make decisions.",
  ],
  stem: "Beginning today, I choose to...",
} as const;

/**
 * Approved Weekly Commitment — Foundry Chapter Three (continuation after practice).
 */
export const DECISION_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement: "This week, I choose intention over expectation.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Chapter Three.
 */
export const chapter3FounderClosingRaw =
  "Your future is not created by wishing.It is created by deciding.Today, you crossed an invisible line.The life you've been hoping for is no longer an idea.It is now a decision.And decisions have the power to transform everything.";

export const CHAPTER_3_TITLE = "Chapter III — The Decision" as const;
export const CHAPTER_3_SHORT_TITLE = "The Decision" as const;
export const CHAPTER_3_TEACHING_SUBTITLE = "Choosing Intention" as const;

export function isChapter3SectionId(
  value: unknown,
): value is Chapter3SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_3_SECTIONS as readonly string[]).includes(value)
  );
}

export function isDecisionReflectionQuestionId(
  value: unknown,
): value is DecisionReflectionQuestionId {
  return decisionReflectionQuestions.some((entry) => entry.id === value);
}
