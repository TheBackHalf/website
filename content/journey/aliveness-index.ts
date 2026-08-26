/**
 * Structured Aliveness Index projection from approved manuscript.
 * Statements and prompts are verbatim from:
 * content/blueprint/manuscript/generated/alivenessIndex.ts
 * Do not invent or paraphrase assessment language.
 */

import { alivenessIndex as manuscriptAlivenessIndex } from "@/content/blueprint/manuscript/generated/alivenessIndex";

export type AlivenessScaleOption = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
};

export type AlivenessDomainId =
  | "purpose"
  | "health"
  | "relationships"
  | "career"
  | "time"
  | "wonder"
  | "environment"
  | "growth"
  | "stewardship";

export type AlivenessStatement = {
  id: string;
  text: string;
};

export type AlivenessDomain = {
  id: AlivenessDomainId;
  name: string;
  scoreLabel: string;
  maxScore: 25;
  statements: readonly AlivenessStatement[];
};

/** Verbatim intro sentences from the approved Aliveness Index manuscript. */
export const alivenessIndexIntro = [
  "The world has taught us to measure success by what we achieve.",
  "The Back Half measures something different.",
  "Aliveness.",
  "The purpose of this assessment is not to judge your life.",
  "It is to help you clearly see it.",
  "Answer each statement honestly based on your life today, not the life you hope to have.",
  "There are no right or wrong answers.",
  "Only honest ones.",
] as const;

/** Rating scale — manuscript order 5→1 with approved labels. */
export const alivenessIndexScale: readonly AlivenessScaleOption[] = [
  { value: 5, label: "Always True" },
  { value: 4, label: "Usually True" },
  { value: 3, label: "Sometimes True" },
  { value: 2, label: "Rarely True" },
  { value: 1, label: "Not True" },
] as const;

export const alivenessIndexDomains: readonly AlivenessDomain[] = [
  {
    id: "purpose",
    name: "Purpose",
    scoreLabel: "Purpose Score",
    maxScore: 25,
    statements: [
      {
        id: "purpose-1",
        text: "I wake up excited about the life I am creating.",
      },
      { id: "purpose-2", text: "I understand my purpose." },
      {
        id: "purpose-3",
        text: "My daily life aligns with what matters most to me.",
      },
      {
        id: "purpose-4",
        text: "I believe my future is filled with possibility.",
      },
      {
        id: "purpose-5",
        text: "I feel like I am becoming who I was created to be.",
      },
    ],
  },
  {
    id: "health",
    name: "Health",
    scoreLabel: "Health Score",
    maxScore: 25,
    statements: [
      {
        id: "health-1",
        text: "I consistently care for my physical health.",
      },
      {
        id: "health-2",
        text: "My energy supports the life I want to live.",
      },
      { id: "health-3", text: "I nourish my body intentionally." },
      {
        id: "health-4",
        text: "My mental and emotional wellness are priorities.",
      },
      {
        id: "health-5",
        text: "I regularly make time for rest and recovery.",
      },
    ],
  },
  {
    id: "relationships",
    name: "Relationships",
    scoreLabel: "Relationships Score",
    maxScore: 25,
    statements: [
      {
        id: "relationships-1",
        text: "The people closest to me encourage my growth.",
      },
      {
        id: "relationships-2",
        text: "I feel deeply connected to people I love.",
      },
      {
        id: "relationships-3",
        text: "My relationships bring peace more often than stress.",
      },
      {
        id: "relationships-4",
        text: "I communicate honestly and respectfully.",
      },
      {
        id: "relationships-5",
        text: "I intentionally invest in meaningful relationships.",
      },
    ],
  },
  {
    id: "career",
    name: "Career & Contribution",
    scoreLabel: "Career Score",
    maxScore: 25,
    statements: [
      { id: "career-1", text: "My work feels meaningful." },
      { id: "career-2", text: "I use my strengths regularly." },
      {
        id: "career-3",
        text: "I believe my work positively impacts others.",
      },
      { id: "career-4", text: "I feel challenged in healthy ways." },
      {
        id: "career-5",
        text: "I am proud of the work I contribute.",
      },
    ],
  },
  {
    id: "time",
    name: "Time",
    scoreLabel: "Time Score",
    maxScore: 25,
    statements: [
      {
        id: "time-1",
        text: "I have meaningful control over my calendar.",
      },
      {
        id: "time-2",
        text: "My schedule reflects my priorities.",
      },
      { id: "time-3", text: "I intentionally protect my time." },
      {
        id: "time-4",
        text: "I regularly create space to think and reflect.",
      },
      {
        id: "time-5",
        text: "I spend my time on what matters most.",
      },
    ],
  },
  {
    id: "wonder",
    name: "Wonder & Adventure",
    scoreLabel: "Wonder Score",
    maxScore: 25,
    statements: [
      {
        id: "wonder-1",
        text: "I experience moments of awe and wonder.",
      },
      {
        id: "wonder-2",
        text: "I intentionally try new experiences.",
      },
      { id: "wonder-3", text: "My life feels adventurous." },
      {
        id: "wonder-4",
        text: "I remain curious about the world.",
      },
      {
        id: "wonder-5",
        text: "I create memories instead of simply collecting days.",
      },
    ],
  },
  {
    id: "environment",
    name: "Environment",
    scoreLabel: "Environment Score",
    maxScore: 25,
    statements: [
      { id: "environment-1", text: "My surroundings inspire me." },
      {
        id: "environment-2",
        text: "My home supports peace and clarity.",
      },
      {
        id: "environment-3",
        text: "The places where I spend time reflect who I am becoming.",
      },
      {
        id: "environment-4",
        text: "I intentionally create beauty around me.",
      },
      {
        id: "environment-5",
        text: "My environment energizes rather than drains me.",
      },
    ],
  },
  {
    id: "growth",
    name: "Growth",
    scoreLabel: "Growth Score",
    maxScore: 25,
    statements: [
      {
        id: "growth-1",
        text: "I intentionally invest in becoming better.",
      },
      {
        id: "growth-2",
        text: "I regularly learn something new.",
      },
      {
        id: "growth-3",
        text: "I welcome feedback that helps me grow.",
      },
      { id: "growth-4", text: "I challenge limiting beliefs." },
      {
        id: "growth-5",
        text: "I believe transformation is always possible.",
      },
    ],
  },
  {
    id: "stewardship",
    name: "Stewardship",
    scoreLabel: "Stewardship Score",
    maxScore: 25,
    statements: [
      {
        id: "stewardship-1",
        text: "I manage my finances responsibly.",
      },
      { id: "stewardship-2", text: "I live with generosity." },
      {
        id: "stewardship-3",
        text: "I intentionally use my gifts to serve others.",
      },
      {
        id: "stewardship-4",
        text: "I make decisions consistent with my values.",
      },
      {
        id: "stewardship-5",
        text: "I am building a life that will positively impact future generations.",
      },
    ],
  },
] as const;

/** Verbatim reflection prompts from the approved manuscript. */
export const alivenessIndexReflectionPrompts = [
  "Which category received your highest score?",
  "Why do you believe this area feels so alive?",
  "Which category received your lowest score?",
  "If you intentionally improved only this one area over the next year, how would it change your life?",
] as const;

/** Verbatim closing reminder from the approved manuscript. */
export const alivenessIndexRemember = [
  "The purpose of this assessment is not to tell you whether your life is good or bad.",
  "It is to help you identify where your life feels most alive—and where your Back Half is inviting you to grow.",
  "Because awareness always comes before transformation.",
  "And transformation begins with intention.",
  "Magical is Possible.",
] as const;

export const ALIVENESS_INDEX_MAX_TOTAL = 225 as const;

export function listAlivenessStatementIds(): string[] {
  return alivenessIndexDomains.flatMap((domain) =>
    domain.statements.map((statement) => statement.id),
  );
}

export function isAlivenessStatementId(value: string): boolean {
  return listAlivenessStatementIds().includes(value);
}

export function scoreAlivenessDomain(
  domainId: AlivenessDomainId,
  responses: Record<string, number>,
): number | null {
  const domain = alivenessIndexDomains.find((entry) => entry.id === domainId);
  if (!domain) {
    return null;
  }
  let total = 0;
  for (const statement of domain.statements) {
    const rating = responses[statement.id];
    if (
      rating !== 1 &&
      rating !== 2 &&
      rating !== 3 &&
      rating !== 4 &&
      rating !== 5
    ) {
      return null;
    }
    total += rating;
  }
  return total;
}

/** Overall Aliveness Score helper — total /225 when every statement is rated. */
export function scoreAlivenessTotal(
  responses: Record<string, number>,
): number | null {
  let total = 0;
  for (const domain of alivenessIndexDomains) {
    const domainScore = scoreAlivenessDomain(domain.id, responses);
    if (domainScore === null) {
      return null;
    }
    total += domainScore;
  }
  return total;
}

export function isAlivenessAssessmentComplete(
  responses: Record<string, number>,
): boolean {
  return scoreAlivenessTotal(responses) !== null;
}

/** Source manuscript block retained for audit / provenance. */
export const alivenessIndexManuscriptSource = manuscriptAlivenessIndex;
