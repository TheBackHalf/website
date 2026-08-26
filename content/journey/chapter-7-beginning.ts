/**
 * Chapter VII — The Beginning — structured projection from approved sources.
 * Welcome + Core Teaching: content/blueprint/manuscript/generated/chapter-7-beginning.ts
 * Reflection, Intentional Practice, Weekly Commitment, Founder Closing:
 * approved Foundry Send Chapter Seven (Founder: Approved).
 * Journey completion: approved Founder Congratulations Video Script.
 * Do not invent, paraphrase, or omit approved program language.
 */

import { chapter_7_beginning } from "@/content/blueprint/manuscript/generated/chapter-7-beginning";

export const CHAPTER_7_ID = "chapter-7-beginning" as const;
export const CHAPTER_7_STAGE_ID = "beginning" as const;

export type Chapter7SectionId =
  | "welcome"
  | "reflection"
  | "practice"
  | "commitment"
  | "closing"
  | "complete";

export const CHAPTER_7_SECTIONS: readonly Chapter7SectionId[] = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export type BeginningReflectionQuestionId =
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "q5"
  | "q6"
  | "q7";

export type BeginningReflectionQuestion = {
  id: BeginningReflectionQuestionId;
  prompt: string;
};

/**
 * Verbatim Founder Welcome block — manuscript paragraphs 0 through 5.
 */
export const chapter7FounderWelcomeRaw = chapter_7_beginning.paragraphs
  .slice(0, 6)
  .join(" ")
  .trim();

/** Verbatim Core Teaching block (manuscript paragraphs 6 through 11). */
export const chapter7CoreTeachingRaw = chapter_7_beginning.paragraphs
  .slice(6, 12)
  .join(" ")
  .trim();

/**
 * Restore missing spaces in collapsed manuscript text without changing words.
 */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/Chapter Seven([A-Z])/g, "Chapter Seven. $1")
    .replace(/\.\.\.([A-Za-z“"‘'])/g, "... $1")
    .replace(/([.?!])([A-Z])/g, "$1 $2")
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
 * Chapter VII Founder Welcome always addresses the participant as Architect.
 * Do not insert first name, last name, display name, or account name.
 */
export function personalizeChapter7Welcome(
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

/** Approved Architect Reflection Questions — guidebook / Foundry Send Chapter Seven. */
export const beginningReflectionQuestions: readonly BeginningReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "What has changed most within you during this Journey?",
    },
    {
      id: "q2",
      prompt:
        "Which lesson do you want to carry into every future season of your life?",
    },
    {
      id: "q3",
      prompt: "What standards will continue guiding your decisions?",
    },
    {
      id: "q4",
      prompt: "How will you protect the life you are intentionally creating?",
    },
    {
      id: "q5",
      prompt: "What dream are you now ready to pursue?",
    },
    {
      id: "q6",
      prompt:
        "One year from today, what do you hope your future self thanks you for beginning today?",
    },
    {
      id: "q7",
      prompt: "Finish this sentence: My Back Half begins with...",
    },
  ] as const;

/**
 * Approved Intentional Practice — Foundry Send Chapter Seven / guidebook Declaration.
 */
export const BEGINNING_PRACTICE = {
  title: "Intentional Practice",
  instructions: [
    "Write your Back Half Declaration.",
    "Complete the following statement in your own words:",
  ],
  stem: "Beginning today, I will intentionally create a life that...",
  remember: [
    "Don't write what sounds inspiring. Write what is true. Write the life you are choosing.",
    "When you've finished, sign and date your declaration.",
    "Place it somewhere you'll see it often.",
    "Let it become a reminder that this Journey did not end today. It began today.",
  ],
} as const;

/**
 * Approved Weekly Commitment — Foundry Send Chapter Seven.
 */
export const BEGINNING_WEEKLY_COMMITMENT = {
  title: "Weekly Commitment",
  statement:
    "Today, and every day, I choose to live intentionally and create a life of fullness, purpose, and possibility.",
} as const;

/**
 * Approved Founder Closing Reflection — Foundry Send Chapter Seven.
 */
export const chapter7FounderClosingRaw =
  "Architect, What an incredible honor it has been to walk beside you. I hope this Journey has reminded you that your story is still being written. That your greatest chapters may still be ahead of you. That your past does not define your future. And that every morning offers another opportunity to intentionally create a life you love. Thank you for trusting me with this part of your journey. Now go. Live boldly. Love deeply. Serve generously. Stay curious. Protect your peace. Choose wonder. And never forget... Magical is Possible.";

/**
 * Approved Founder Congratulations script — Journey completion (Architect, never a personal name).
 */
export const chapter7FounderCongratulationsRaw =
  "Welcome back, Architect. Today, you completed something that very few people ever choose to do. You chose to intentionally create your life. Over the past seven chapters, you've awakened. You've looked honestly at your life. You've made courageous decisions. You've established standards. You've embraced the identity of an Architect. And you've committed to creating a life of fullness, purpose, and possibility. That deserves to be celebrated. But I also want to remind you of something important. This is not the finish line. It's the starting line. The Back Half was never about completing a guidebook. It was about becoming the kind of person who lives intentionally every single day. Some days that will feel effortless. Other days it won't. On those days, return to what you've created here. Return to your Decision Statement. Return to your Standards. Return to your Identity. Return to your Declaration. Remember who you chose to become. I hope this Journey has reminded you of something that may have been buried for a long time. Your life still holds extraordinary possibility. Your greatest chapters are not behind you. They're waiting to be intentionally created. Thank you for trusting me to be part of your Journey. It has truly been an honor. Congratulations, Architect. Now go create a life that reminds others... Magical is Possible.";

export const CHAPTER_7_TITLE = "Chapter VII — The Beginning" as const;
export const CHAPTER_7_SHORT_TITLE = "The Beginning" as const;

export function isChapter7SectionId(
  value: unknown,
): value is Chapter7SectionId {
  return (
    typeof value === "string" &&
    (CHAPTER_7_SECTIONS as readonly string[]).includes(value)
  );
}

export function isBeginningReflectionQuestionId(
  value: unknown,
): value is BeginningReflectionQuestionId {
  return beginningReflectionQuestions.some((entry) => entry.id === value);
}
