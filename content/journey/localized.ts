/**
 * Locale-aware accessors for approved Journey content.
 *
 * English getters return the existing approved English constants unchanged.
 * Spanish getters return the localization modules under content/journey/es.
 * Ids, ordering, target counts, and scoring inputs are identical across
 * locales so participant answers stay locale-independent.
 */

import type { Locale } from "@/lib/i18n/config";
import {
  ALIVENESS_PROJECT_TITLE,
  AWAKENING_WEEKLY_COMMITMENT,
  CHAPTER_1_SHORT_TITLE,
  CHAPTER_1_TITLE,
  alivenessProjectQuestions,
  awakeningReflectionQuestions,
  chapter1CoreTeachingRaw,
  chapter1FounderClosingRaw,
  chapter1FounderWelcomeRaw,
  formatManuscriptForDisplay as formatChapter1ManuscriptForDisplay,
  personalizeChapter1Welcome,
  type AlivenessProjectQuestion,
  type AwakeningReflectionQuestion,
} from "@/content/journey/chapter-1-awakening";
import {
  CHAPTER_2_SHORT_TITLE,
  CHAPTER_2_TEACHING_SUBTITLE,
  CHAPTER_2_TITLE,
  MIRROR_DIMENSIONS,
  MIRROR_EXERCISE_TITLE,
  MIRROR_STEP_FOUR,
  MIRROR_STEP_ONE,
  MIRROR_STEP_THREE,
  MIRROR_STEP_TWO,
  MIRROR_WEEKLY_COMMITMENT,
  chapter2CoreTeachingRaw,
  chapter2FounderClosingRaw,
  chapter2FounderWelcomeRaw,
  formatManuscriptForDisplay as formatChapter2ManuscriptForDisplay,
  mirrorReflectionQuestions,
  personalizeChapter2Welcome,
  type MirrorDimensionId,
  type MirrorReflectionQuestion,
} from "@/content/journey/chapter-2-mirror";
import {
  CHAPTER_3_SHORT_TITLE,
  CHAPTER_3_TEACHING_SUBTITLE,
  CHAPTER_3_TITLE,
  DECISION_PRACTICE,
  DECISION_WEEKLY_COMMITMENT,
  chapter3CoreTeachingRaw,
  chapter3FounderClosingRaw,
  chapter3FounderWelcomeRaw,
  decisionReflectionQuestions,
  formatManuscriptForDisplay as formatChapter3ManuscriptForDisplay,
  personalizeChapter3Welcome,
  type DecisionReflectionQuestion,
} from "@/content/journey/chapter-3-decision";
import {
  CHAPTER_4_SHORT_TITLE,
  CHAPTER_4_TEACHING_SUBTITLE,
  CHAPTER_4_TITLE,
  STANDARDS_PRACTICE,
  STANDARDS_WEEKLY_COMMITMENT,
  chapter4CoreTeachingRaw,
  chapter4FounderClosingRaw,
  chapter4FounderWelcomeRaw,
  formatManuscriptForDisplay as formatChapter4ManuscriptForDisplay,
  personalizeChapter4Welcome,
  standardsReflectionQuestions,
  type StandardsPracticeEntry,
  type StandardsReflectionQuestion,
} from "@/content/journey/chapter-4-standards";
import {
  ARCHITECT_PRACTICE,
  ARCHITECT_WEEKLY_COMMITMENT,
  CHAPTER_5_SHORT_TITLE,
  CHAPTER_5_TITLE,
  architectReflectionQuestions,
  chapter5CoreTeachingRaw,
  chapter5FounderClosingRaw,
  chapter5FounderWelcomeRaw,
  formatManuscriptForDisplay as formatChapter5ManuscriptForDisplay,
  personalizeChapter5Welcome,
  type ArchitectReflectionQuestion,
} from "@/content/journey/chapter-5-architect";
import {
  CHAPTER_6_SHORT_TITLE,
  CHAPTER_6_TITLE,
  EXPANSION_PRACTICE,
  EXPANSION_WEEKLY_COMMITMENT,
  chapter6CoreTeachingRaw,
  chapter6FounderClosingRaw,
  chapter6FounderWelcomeRaw,
  expansionReflectionQuestions,
  formatManuscriptForDisplay as formatChapter6ManuscriptForDisplay,
  personalizeChapter6Welcome,
  type ExpansionPracticeEntry,
  type ExpansionReflectionQuestion,
} from "@/content/journey/chapter-6-expansion";
import {
  BEGINNING_PRACTICE,
  BEGINNING_WEEKLY_COMMITMENT,
  CHAPTER_7_SHORT_TITLE,
  CHAPTER_7_TITLE,
  beginningReflectionQuestions,
  chapter7CoreTeachingRaw,
  chapter7FounderClosingRaw,
  chapter7FounderCongratulationsRaw,
  chapter7FounderWelcomeRaw,
  formatManuscriptForDisplay as formatChapter7ManuscriptForDisplay,
  personalizeChapter7Welcome,
  type BeginningReflectionQuestion,
} from "@/content/journey/chapter-7-beginning";
import {
  ALIVENESS_INDEX_MAX_TOTAL,
  alivenessIndexDomains,
  alivenessIndexIntro,
  alivenessIndexReflectionPrompts,
  alivenessIndexRemember,
  alivenessIndexScale,
  type AlivenessDomain,
  type AlivenessScaleOption,
} from "@/content/journey/aliveness-index";
import {
  architectLifeAreas,
  journeyIntro,
  journeyStages,
  type JourneyStage,
} from "@/content/journey-stages";
import {
  ALIVENESS_PROJECT_TITLE_ES,
  AWAKENING_REFLECTION_TITLE_ES,
  AWAKENING_WEEKLY_COMMITMENT_ES,
  CHAPTER_1_SHORT_TITLE_ES,
  CHAPTER_1_TITLE_ES,
  alivenessProjectQuestionsEs,
  awakeningReflectionQuestionsEs,
  chapter1CoreTeachingRawEs,
  chapter1FounderClosingRawEs,
  chapter1FounderWelcomeRawEs,
  personalizeChapter1WelcomeEs,
} from "@/content/journey/es/chapter-1";
import {
  CHAPTER_2_SHORT_TITLE_ES,
  CHAPTER_2_TEACHING_SUBTITLE_ES,
  CHAPTER_2_TITLE_ES,
  MIRROR_DIMENSIONS_ES,
  MIRROR_EXERCISE_TITLE_ES,
  MIRROR_REFLECTION_TITLE_ES,
  MIRROR_STEP_FOUR_ES,
  MIRROR_STEP_ONE_ES,
  MIRROR_STEP_THREE_ES,
  MIRROR_STEP_TWO_ES,
  MIRROR_WEEKLY_COMMITMENT_ES,
  chapter2CoreTeachingRawEs,
  chapter2FounderClosingRawEs,
  chapter2FounderWelcomeRawEs,
  mirrorReflectionQuestionsEs,
  personalizeChapter2WelcomeEs,
} from "@/content/journey/es/chapter-2";
import {
  CHAPTER_3_SHORT_TITLE_ES,
  CHAPTER_3_TEACHING_SUBTITLE_ES,
  CHAPTER_3_TITLE_ES,
  DECISION_PRACTICE_ES,
  DECISION_REFLECTION_TITLE_ES,
  DECISION_WEEKLY_COMMITMENT_ES,
  chapter3CoreTeachingRawEs,
  chapter3FounderClosingRawEs,
  chapter3FounderWelcomeRawEs,
  decisionReflectionQuestionsEs,
  personalizeChapter3WelcomeEs,
} from "@/content/journey/es/chapter-3";
import {
  CHAPTER_4_SHORT_TITLE_ES,
  CHAPTER_4_TEACHING_SUBTITLE_ES,
  CHAPTER_4_TITLE_ES,
  STANDARDS_PRACTICE_ES,
  STANDARDS_REFLECTION_TITLE_ES,
  STANDARDS_WEEKLY_COMMITMENT_ES,
  chapter4CoreTeachingRawEs,
  chapter4FounderClosingRawEs,
  chapter4FounderWelcomeRawEs,
  personalizeChapter4WelcomeEs,
  standardsReflectionQuestionsEs,
} from "@/content/journey/es/chapter-4";
import {
  ARCHITECT_PRACTICE_ES,
  ARCHITECT_REFLECTION_TITLE_ES,
  ARCHITECT_WEEKLY_COMMITMENT_ES,
  CHAPTER_5_SHORT_TITLE_ES,
  CHAPTER_5_TITLE_ES,
  architectReflectionQuestionsEs,
  chapter5CoreTeachingRawEs,
  chapter5FounderClosingRawEs,
  chapter5FounderWelcomeRawEs,
  personalizeChapter5WelcomeEs,
} from "@/content/journey/es/chapter-5";
import {
  CHAPTER_6_SHORT_TITLE_ES,
  CHAPTER_6_TITLE_ES,
  EXPANSION_PRACTICE_ES,
  EXPANSION_REFLECTION_TITLE_ES,
  EXPANSION_WEEKLY_COMMITMENT_ES,
  chapter6CoreTeachingRawEs,
  chapter6FounderClosingRawEs,
  chapter6FounderWelcomeRawEs,
  expansionReflectionQuestionsEs,
  personalizeChapter6WelcomeEs,
} from "@/content/journey/es/chapter-6";
import {
  BEGINNING_PRACTICE_ES,
  BEGINNING_REFLECTION_TITLE_ES,
  BEGINNING_WEEKLY_COMMITMENT_ES,
  CHAPTER_7_SHORT_TITLE_ES,
  CHAPTER_7_TITLE_ES,
  beginningReflectionQuestionsEs,
  chapter7CoreTeachingRawEs,
  chapter7FounderClosingRawEs,
  chapter7FounderCongratulationsRawEs,
  chapter7FounderWelcomeRawEs,
  personalizeChapter7WelcomeEs,
} from "@/content/journey/es/chapter-7";
import {
  ALIVENESS_INDEX_TITLE_ES,
  alivenessIndexDomainsEs,
  alivenessIndexIntroEs,
  alivenessIndexReflectionPromptsEs,
  alivenessIndexRememberEs,
  alivenessIndexScaleEs,
} from "@/content/journey/es/aliveness-index";
import {
  architectLifeAreasEs,
  journeyIntroEs,
  journeyStagesEs,
} from "@/content/journey/es/journey-stages";
import { formatSpanishManuscriptForDisplay } from "@/content/journey/es/manuscript";

export type PersonalizeWelcome = (
  raw: string,
  firstName?: string | null,
) => string;

export type FormatManuscript = (raw: string) => string[];

export type JourneyIntroLocalized = {
  eyebrow: string;
  heading: {
    lines: readonly string[];
    accentLineIndex?: number;
  };
};

export type Chapter1Localized = {
  title: string;
  shortTitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  founderClosingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly AwakeningReflectionQuestion[];
  weeklyCommitment: {
    title: string;
    statement: string;
  };
  projectTitle: string;
  projectQuestions: readonly AlivenessProjectQuestion[];
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type MirrorStepOneLocalized = {
  id: "step1";
  heading: string;
  title: string;
  instructions: readonly string[];
  examples: readonly string[];
  notice: readonly string[];
  targetCount: number;
  stem: string;
};

export type MirrorStepTwoLocalized = {
  id: "step2";
  heading: string;
  title: string;
  instructions: readonly string[];
  examples: readonly string[];
  targetCount: number;
  stem: string;
};

export type MirrorStepThreeLocalized = {
  id: "step3";
  heading: string;
  title: string;
  instructions: readonly string[];
  examples: readonly string[];
  minCompleteRows: number;
};

export type MirrorStepFourLocalized = {
  id: "step4";
  heading: string;
  title: string;
  instructions: readonly string[];
  minFilledDimensions: number;
};

export type MirrorDimensionLocalized = {
  id: MirrorDimensionId;
  label: string;
  prompt: string;
};

export type Chapter2Localized = {
  title: string;
  shortTitle: string;
  teachingSubtitle: string;
  exerciseTitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  founderClosingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly MirrorReflectionQuestion[];
  weeklyCommitment: {
    title: string;
    statement: string;
  };
  stepOne: MirrorStepOneLocalized;
  stepTwo: MirrorStepTwoLocalized;
  stepThree: MirrorStepThreeLocalized;
  stepFour: MirrorStepFourLocalized;
  dimensions: readonly MirrorDimensionLocalized[];
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type DecisionPracticeLocalized = {
  title: string;
  instructions: readonly string[];
  stem: string;
};

export type DecisionWeeklyCommitmentLocalized = {
  title: string;
  statement: string;
};

export type Chapter3Localized = {
  title: string;
  shortTitle: string;
  teachingSubtitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly DecisionReflectionQuestion[];
  practice: DecisionPracticeLocalized;
  weeklyCommitment: DecisionWeeklyCommitmentLocalized;
  founderClosingRaw: string;
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type StandardsPracticeLocalized = {
  title: string;
  instructions: readonly string[];
  examplesIntro: string;
  examples: readonly string[];
  closing: readonly string[];
  entries: readonly StandardsPracticeEntry[];
};

export type StandardsWeeklyCommitmentLocalized = {
  title: string;
  statement: string;
};

export type Chapter4Localized = {
  title: string;
  shortTitle: string;
  teachingSubtitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly StandardsReflectionQuestion[];
  practice: StandardsPracticeLocalized;
  weeklyCommitment: StandardsWeeklyCommitmentLocalized;
  founderClosingRaw: string;
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type ArchitectPracticeLocalized = {
  title: string;
  instructions: readonly string[];
  stem: string;
};

export type ArchitectWeeklyCommitmentLocalized = {
  title: string;
  statement: string;
};

export type Chapter5Localized = {
  title: string;
  shortTitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly ArchitectReflectionQuestion[];
  practice: ArchitectPracticeLocalized;
  weeklyCommitment: ArchitectWeeklyCommitmentLocalized;
  founderClosingRaw: string;
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type ExpansionPracticeLocalized = {
  title: string;
  instructions: readonly string[];
  remember: string;
  entries: readonly ExpansionPracticeEntry[];
};

export type ExpansionWeeklyCommitmentLocalized = {
  title: string;
  statement: string;
};

export type Chapter6Localized = {
  title: string;
  shortTitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly ExpansionReflectionQuestion[];
  practice: ExpansionPracticeLocalized;
  weeklyCommitment: ExpansionWeeklyCommitmentLocalized;
  founderClosingRaw: string;
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export type AlivenessIndexLocalized = {
  title: string;
  intro: readonly string[];
  scale: readonly AlivenessScaleOption[];
  domains: readonly AlivenessDomain[];
  reflectionPrompts: readonly string[];
  remember: readonly string[];
  maxTotal: number;
};

function isSpanish(locale: Locale): boolean {
  return locale === "es";
}

export function getJourneyStages(locale: Locale): readonly JourneyStage[] {
  return isSpanish(locale) ? journeyStagesEs : journeyStages;
}

export function getJourneyIntro(locale: Locale): JourneyIntroLocalized {
  return isSpanish(locale) ? journeyIntroEs : journeyIntro;
}

export function getArchitectLifeAreas(locale: Locale): readonly string[] {
  return isSpanish(locale) ? architectLifeAreasEs : architectLifeAreas;
}

export function getChapter1Localized(locale: Locale): Chapter1Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_1_TITLE_ES,
      shortTitle: CHAPTER_1_SHORT_TITLE_ES,
      founderWelcomeRaw: chapter1FounderWelcomeRawEs,
      coreTeachingRaw: chapter1CoreTeachingRawEs,
      founderClosingRaw: chapter1FounderClosingRawEs,
      reflectionTitle: AWAKENING_REFLECTION_TITLE_ES,
      reflectionQuestions: awakeningReflectionQuestionsEs,
      weeklyCommitment: AWAKENING_WEEKLY_COMMITMENT_ES,
      projectTitle: ALIVENESS_PROJECT_TITLE_ES,
      projectQuestions: alivenessProjectQuestionsEs,
      personalizeWelcome: personalizeChapter1WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_1_TITLE,
    shortTitle: CHAPTER_1_SHORT_TITLE,
    founderWelcomeRaw: chapter1FounderWelcomeRaw,
    coreTeachingRaw: chapter1CoreTeachingRaw,
    founderClosingRaw: chapter1FounderClosingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: awakeningReflectionQuestions,
    weeklyCommitment: AWAKENING_WEEKLY_COMMITMENT,
    projectTitle: ALIVENESS_PROJECT_TITLE,
    projectQuestions: alivenessProjectQuestions,
    personalizeWelcome: personalizeChapter1Welcome,
    formatForDisplay: formatChapter1ManuscriptForDisplay,
  };
}

export function getChapter2Localized(locale: Locale): Chapter2Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_2_TITLE_ES,
      shortTitle: CHAPTER_2_SHORT_TITLE_ES,
      teachingSubtitle: CHAPTER_2_TEACHING_SUBTITLE_ES,
      exerciseTitle: MIRROR_EXERCISE_TITLE_ES,
      founderWelcomeRaw: chapter2FounderWelcomeRawEs,
      coreTeachingRaw: chapter2CoreTeachingRawEs,
      founderClosingRaw: chapter2FounderClosingRawEs,
      reflectionTitle: MIRROR_REFLECTION_TITLE_ES,
      reflectionQuestions: mirrorReflectionQuestionsEs,
      weeklyCommitment: MIRROR_WEEKLY_COMMITMENT_ES,
      stepOne: MIRROR_STEP_ONE_ES,
      stepTwo: MIRROR_STEP_TWO_ES,
      stepThree: MIRROR_STEP_THREE_ES,
      stepFour: MIRROR_STEP_FOUR_ES,
      dimensions: MIRROR_DIMENSIONS_ES,
      personalizeWelcome: personalizeChapter2WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_2_TITLE,
    shortTitle: CHAPTER_2_SHORT_TITLE,
    teachingSubtitle: CHAPTER_2_TEACHING_SUBTITLE,
    exerciseTitle: MIRROR_EXERCISE_TITLE,
    founderWelcomeRaw: chapter2FounderWelcomeRaw,
    coreTeachingRaw: chapter2CoreTeachingRaw,
    founderClosingRaw: chapter2FounderClosingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: mirrorReflectionQuestions,
    weeklyCommitment: MIRROR_WEEKLY_COMMITMENT,
    stepOne: MIRROR_STEP_ONE,
    stepTwo: MIRROR_STEP_TWO,
    stepThree: MIRROR_STEP_THREE,
    stepFour: MIRROR_STEP_FOUR,
    dimensions: MIRROR_DIMENSIONS,
    personalizeWelcome: personalizeChapter2Welcome,
    formatForDisplay: formatChapter2ManuscriptForDisplay,
  };
}

export function getChapter3Localized(locale: Locale): Chapter3Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_3_TITLE_ES,
      shortTitle: CHAPTER_3_SHORT_TITLE_ES,
      teachingSubtitle: CHAPTER_3_TEACHING_SUBTITLE_ES,
      founderWelcomeRaw: chapter3FounderWelcomeRawEs,
      coreTeachingRaw: chapter3CoreTeachingRawEs,
      reflectionTitle: DECISION_REFLECTION_TITLE_ES,
      reflectionQuestions: decisionReflectionQuestionsEs,
      practice: DECISION_PRACTICE_ES,
      weeklyCommitment: DECISION_WEEKLY_COMMITMENT_ES,
      founderClosingRaw: chapter3FounderClosingRawEs,
      personalizeWelcome: personalizeChapter3WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_3_TITLE,
    shortTitle: CHAPTER_3_SHORT_TITLE,
    teachingSubtitle: CHAPTER_3_TEACHING_SUBTITLE,
    founderWelcomeRaw: chapter3FounderWelcomeRaw,
    coreTeachingRaw: chapter3CoreTeachingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: decisionReflectionQuestions,
    practice: DECISION_PRACTICE,
    weeklyCommitment: DECISION_WEEKLY_COMMITMENT,
    founderClosingRaw: chapter3FounderClosingRaw,
    personalizeWelcome: personalizeChapter3Welcome,
    formatForDisplay: formatChapter3ManuscriptForDisplay,
  };
}

export function getChapter4Localized(locale: Locale): Chapter4Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_4_TITLE_ES,
      shortTitle: CHAPTER_4_SHORT_TITLE_ES,
      teachingSubtitle: CHAPTER_4_TEACHING_SUBTITLE_ES,
      founderWelcomeRaw: chapter4FounderWelcomeRawEs,
      coreTeachingRaw: chapter4CoreTeachingRawEs,
      reflectionTitle: STANDARDS_REFLECTION_TITLE_ES,
      reflectionQuestions: standardsReflectionQuestionsEs,
      practice: STANDARDS_PRACTICE_ES,
      weeklyCommitment: STANDARDS_WEEKLY_COMMITMENT_ES,
      founderClosingRaw: chapter4FounderClosingRawEs,
      personalizeWelcome: personalizeChapter4WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_4_TITLE,
    shortTitle: CHAPTER_4_SHORT_TITLE,
    teachingSubtitle: CHAPTER_4_TEACHING_SUBTITLE,
    founderWelcomeRaw: chapter4FounderWelcomeRaw,
    coreTeachingRaw: chapter4CoreTeachingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: standardsReflectionQuestions,
    practice: STANDARDS_PRACTICE,
    weeklyCommitment: STANDARDS_WEEKLY_COMMITMENT,
    founderClosingRaw: chapter4FounderClosingRaw,
    personalizeWelcome: personalizeChapter4Welcome,
    formatForDisplay: formatChapter4ManuscriptForDisplay,
  };
}

export function getChapter5Localized(locale: Locale): Chapter5Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_5_TITLE_ES,
      shortTitle: CHAPTER_5_SHORT_TITLE_ES,
      founderWelcomeRaw: chapter5FounderWelcomeRawEs,
      coreTeachingRaw: chapter5CoreTeachingRawEs,
      reflectionTitle: ARCHITECT_REFLECTION_TITLE_ES,
      reflectionQuestions: architectReflectionQuestionsEs,
      practice: ARCHITECT_PRACTICE_ES,
      weeklyCommitment: ARCHITECT_WEEKLY_COMMITMENT_ES,
      founderClosingRaw: chapter5FounderClosingRawEs,
      personalizeWelcome: personalizeChapter5WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_5_TITLE,
    shortTitle: CHAPTER_5_SHORT_TITLE,
    founderWelcomeRaw: chapter5FounderWelcomeRaw,
    coreTeachingRaw: chapter5CoreTeachingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: architectReflectionQuestions,
    practice: ARCHITECT_PRACTICE,
    weeklyCommitment: ARCHITECT_WEEKLY_COMMITMENT,
    founderClosingRaw: chapter5FounderClosingRaw,
    personalizeWelcome: personalizeChapter5Welcome,
    formatForDisplay: formatChapter5ManuscriptForDisplay,
  };
}

export function getChapter6Localized(locale: Locale): Chapter6Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_6_TITLE_ES,
      shortTitle: CHAPTER_6_SHORT_TITLE_ES,
      founderWelcomeRaw: chapter6FounderWelcomeRawEs,
      coreTeachingRaw: chapter6CoreTeachingRawEs,
      reflectionTitle: EXPANSION_REFLECTION_TITLE_ES,
      reflectionQuestions: expansionReflectionQuestionsEs,
      practice: EXPANSION_PRACTICE_ES,
      weeklyCommitment: EXPANSION_WEEKLY_COMMITMENT_ES,
      founderClosingRaw: chapter6FounderClosingRawEs,
      personalizeWelcome: personalizeChapter6WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_6_TITLE,
    shortTitle: CHAPTER_6_SHORT_TITLE,
    founderWelcomeRaw: chapter6FounderWelcomeRaw,
    coreTeachingRaw: chapter6CoreTeachingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: expansionReflectionQuestions,
    practice: EXPANSION_PRACTICE,
    weeklyCommitment: EXPANSION_WEEKLY_COMMITMENT,
    founderClosingRaw: chapter6FounderClosingRaw,
    personalizeWelcome: personalizeChapter6Welcome,
    formatForDisplay: formatChapter6ManuscriptForDisplay,
  };
}

export type BeginningPracticeLocalized = {
  title: string;
  instructions: readonly string[];
  stem: string;
  remember: readonly string[];
};

export type BeginningWeeklyCommitmentLocalized = {
  title: string;
  statement: string;
};

export type Chapter7Localized = {
  title: string;
  shortTitle: string;
  founderWelcomeRaw: string;
  coreTeachingRaw: string;
  reflectionTitle: string;
  reflectionQuestions: readonly BeginningReflectionQuestion[];
  practice: BeginningPracticeLocalized;
  weeklyCommitment: BeginningWeeklyCommitmentLocalized;
  founderClosingRaw: string;
  founderCongratulationsRaw: string;
  personalizeWelcome: PersonalizeWelcome;
  formatForDisplay: FormatManuscript;
};

export function getChapter7Localized(locale: Locale): Chapter7Localized {
  if (isSpanish(locale)) {
    return {
      title: CHAPTER_7_TITLE_ES,
      shortTitle: CHAPTER_7_SHORT_TITLE_ES,
      founderWelcomeRaw: chapter7FounderWelcomeRawEs,
      coreTeachingRaw: chapter7CoreTeachingRawEs,
      reflectionTitle: BEGINNING_REFLECTION_TITLE_ES,
      reflectionQuestions: beginningReflectionQuestionsEs,
      practice: BEGINNING_PRACTICE_ES,
      weeklyCommitment: BEGINNING_WEEKLY_COMMITMENT_ES,
      founderClosingRaw: chapter7FounderClosingRawEs,
      founderCongratulationsRaw: chapter7FounderCongratulationsRawEs,
      personalizeWelcome: personalizeChapter7WelcomeEs,
      formatForDisplay: formatSpanishManuscriptForDisplay,
    };
  }

  return {
    title: CHAPTER_7_TITLE,
    shortTitle: CHAPTER_7_SHORT_TITLE,
    founderWelcomeRaw: chapter7FounderWelcomeRaw,
    coreTeachingRaw: chapter7CoreTeachingRaw,
    reflectionTitle: "Architect Reflection Questions",
    reflectionQuestions: beginningReflectionQuestions,
    practice: BEGINNING_PRACTICE,
    weeklyCommitment: BEGINNING_WEEKLY_COMMITMENT,
    founderClosingRaw: chapter7FounderClosingRaw,
    founderCongratulationsRaw: chapter7FounderCongratulationsRaw,
    personalizeWelcome: personalizeChapter7Welcome,
    formatForDisplay: formatChapter7ManuscriptForDisplay,
  };
}

export function getAlivenessIndexLocalized(
  locale: Locale,
): AlivenessIndexLocalized {
  if (isSpanish(locale)) {
    return {
      title: ALIVENESS_INDEX_TITLE_ES,
      intro: alivenessIndexIntroEs,
      scale: alivenessIndexScaleEs,
      domains: alivenessIndexDomainsEs,
      reflectionPrompts: alivenessIndexReflectionPromptsEs,
      remember: alivenessIndexRememberEs,
      maxTotal: ALIVENESS_INDEX_MAX_TOTAL,
    };
  }

  return {
    title: "Aliveness Index",
    intro: alivenessIndexIntro,
    scale: alivenessIndexScale,
    domains: alivenessIndexDomains,
    reflectionPrompts: alivenessIndexReflectionPrompts,
    remember: alivenessIndexRemember,
    maxTotal: ALIVENESS_INDEX_MAX_TOTAL,
  };
}
