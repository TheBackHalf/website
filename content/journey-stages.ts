/**
 * Approved Journey copy sourced from the repository only.
 * Stages without body copy are marked pending — do not invent replacements.
 */

export type JourneyStageHeading = {
  lines: string[];
  /** When set, the line at this index renders in italic accent styling. */
  accentLineIndex?: number;
};

export type JourneyStage = {
  id: string;
  order: number;
  name: string;
  eyebrow: string;
  heading?: JourneyStageHeading;
  bodyPending?: boolean;
  lifeAreas?: readonly string[];
};

/** Approved life area labels for Stage 5 — exact order required. */
export const architectLifeAreas = [
  "Health",
  "Relationships",
  "Purpose",
  "Career",
  "Adventure",
  "Contribution",
] as const;

export const journeyStages: readonly JourneyStage[] = [
  {
    id: "awakening",
    order: 1,
    name: "The Awakening",
    eyebrow: "The Awakening",
    heading: {
      lines: [
        "Life isn't transformed by time.",
        "It's transformed by intention.",
      ],
      accentLineIndex: 1,
    },
  },
  {
    id: "mirror",
    order: 2,
    name: "The Mirror",
    eyebrow: "The Mirror",
    heading: {
      lines: [
        "See your life with honesty and clarity.",
        "Before you can intentionally create a new future,",
        "you must courageously understand where you are today.",
      ],
      accentLineIndex: 0,
    },
  },
  {
    id: "decision",
    order: 3,
    name: "The Decision",
    eyebrow: "The Decision",
    heading: {
      lines: [
        "Every extraordinary life is built one intentional decision at a time.",
      ],
    },
  },
  {
    id: "standards",
    order: 4,
    name: "The Standards",
    eyebrow: "Standards",
    heading: {
      lines: ["Standards"],
    },
  },
  {
    id: "architect",
    order: 5,
    name: "Becoming the Architect",
    eyebrow: "Becoming the Architect",
    lifeAreas: architectLifeAreas,
  },
  {
    id: "expansion",
    order: 6,
    name: "Expansion",
    eyebrow: "Expansion",
  },
  {
    id: "beginning",
    order: 7,
    name: "The Beginning",
    eyebrow: "The Beginning",
  },
] as const;

/** Approved Journey page intro — from homepage #journey (Our Belief). */
export const journeyIntro = {
  eyebrow: "Our Belief",
  heading: {
    lines: [
      "Every person deserves the opportunity",
      "to intentionally create",
      "a magical life.",
    ],
    accentLineIndex: 2,
  },
} as const;

/** Approved final CTA block — from homepage #cta. */
export const journeyCta = {
  eyebrow: "Join the Movement",
  heading: "The next chapter of your life begins today.",
  body: "Be the first to receive updates, inspiration, and exclusive access to The Back Half.",
  button: "Become an Architect",
} as const;
