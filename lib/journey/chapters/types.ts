/**
 * Chapter progress + exercise persistence types.
 */

import type {
  AlivenessProjectQuestionId,
  AwakeningReflectionQuestionId,
  Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import { awakeningReflectionQuestions } from "@/content/journey/chapter-1-awakening";
import {
  MIRROR_DIMENSIONS,
  type Chapter2SectionId,
  type MirrorDimensionId,
  type MirrorMatrixRow,
  type MirrorReflectionQuestionId,
} from "@/content/journey/chapter-2-mirror";
import { mirrorReflectionQuestions } from "@/content/journey/chapter-2-mirror";
import type {
  Chapter3SectionId,
  DecisionReflectionQuestionId,
} from "@/content/journey/chapter-3-decision";
import { decisionReflectionQuestions } from "@/content/journey/chapter-3-decision";
import type {
  Chapter4SectionId,
  StandardsPracticeId,
  StandardsReflectionQuestionId,
} from "@/content/journey/chapter-4-standards";
import {
  STANDARDS_PRACTICE,
  standardsReflectionQuestions,
} from "@/content/journey/chapter-4-standards";
import type {
  ArchitectReflectionQuestionId,
  Chapter5SectionId,
} from "@/content/journey/chapter-5-architect";
import { architectReflectionQuestions } from "@/content/journey/chapter-5-architect";
import type {
  Chapter6SectionId,
  ExpansionPracticeId,
  ExpansionReflectionQuestionId,
} from "@/content/journey/chapter-6-expansion";
import {
  EXPANSION_PRACTICE,
  expansionReflectionQuestions,
} from "@/content/journey/chapter-6-expansion";
import type {
  BeginningReflectionQuestionId,
  Chapter7SectionId,
} from "@/content/journey/chapter-7-beginning";
import { beginningReflectionQuestions } from "@/content/journey/chapter-7-beginning";

export type ChapterProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export type AlivenessProjectAnswers = Record<
  AlivenessProjectQuestionId,
  string[]
>;

export type AlivenessProjectState = {
  answers: AlivenessProjectAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type AwakeningReflectionAnswers = Record<
  AwakeningReflectionQuestionId,
  string
>;

export type AwakeningReflectionState = {
  answers: AwakeningReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type AwakeningCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter1Record = {
  userId: string;
  chapterId: "chapter-1-awakening";
  status: ChapterProgressStatus;
  currentSectionId: Chapter1SectionId;
  completedSectionIds: Chapter1SectionId[];
  reflection: AwakeningReflectionState;
  alivenessProject: AlivenessProjectState;
  commitment: AwakeningCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter1Database = {
  records: Chapter1Record[];
};

export type MirrorExerciseAnswers = {
  step1: string[];
  step2: string[];
  step3: MirrorMatrixRow[];
  step4: Record<MirrorDimensionId, string>;
};

export type MirrorExerciseState = {
  answers: MirrorExerciseAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type MirrorReflectionAnswers = Record<MirrorReflectionQuestionId, string>;

export type MirrorReflectionState = {
  answers: MirrorReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type MirrorCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter2Record = {
  userId: string;
  chapterId: "chapter-2-mirror";
  status: ChapterProgressStatus;
  currentSectionId: Chapter2SectionId;
  completedSectionIds: Chapter2SectionId[];
  reflection: MirrorReflectionState;
  mirrorExercise: MirrorExerciseState;
  commitment: MirrorCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter2Database = {
  records: Chapter2Record[];
};

export type DecisionReflectionAnswers = Record<
  DecisionReflectionQuestionId,
  string
>;

export type DecisionPracticeState = {
  statement: string;
  updatedAt: string;
  completedAt: string | null;
};

export type DecisionCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type DecisionReflectionState = {
  answers: DecisionReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter3Record = {
  userId: string;
  chapterId: "chapter-3-decision";
  status: ChapterProgressStatus;
  currentSectionId: Chapter3SectionId;
  completedSectionIds: Chapter3SectionId[];
  reflection: DecisionReflectionState;
  practice: DecisionPracticeState;
  commitment: DecisionCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter3Database = {
  records: Chapter3Record[];
};

export type StandardsReflectionAnswers = Record<
  StandardsReflectionQuestionId,
  string
>;

export type StandardsPracticeAnswers = Record<StandardsPracticeId, string>;

export type StandardsPracticeState = {
  answers: StandardsPracticeAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type StandardsCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type StandardsReflectionState = {
  answers: StandardsReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter4Record = {
  userId: string;
  chapterId: "chapter-4-standards";
  status: ChapterProgressStatus;
  currentSectionId: Chapter4SectionId;
  completedSectionIds: Chapter4SectionId[];
  reflection: StandardsReflectionState;
  practice: StandardsPracticeState;
  commitment: StandardsCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter4Database = {
  records: Chapter4Record[];
};

export type ArchitectReflectionAnswers = Record<
  ArchitectReflectionQuestionId,
  string
>;

export type ArchitectPracticeState = {
  statement: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ArchitectCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ArchitectReflectionState = {
  answers: ArchitectReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter5Record = {
  userId: string;
  chapterId: "chapter-5-architect";
  status: ChapterProgressStatus;
  currentSectionId: Chapter5SectionId;
  completedSectionIds: Chapter5SectionId[];
  reflection: ArchitectReflectionState;
  practice: ArchitectPracticeState;
  commitment: ArchitectCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter5Database = {
  records: Chapter5Record[];
};

export type ExpansionReflectionAnswers = Record<
  ExpansionReflectionQuestionId,
  string
>;

export type ExpansionPracticeAnswers = Record<ExpansionPracticeId, string>;

export type ExpansionPracticeState = {
  answers: ExpansionPracticeAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type ExpansionCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type ExpansionReflectionState = {
  answers: ExpansionReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter6Record = {
  userId: string;
  chapterId: "chapter-6-expansion";
  status: ChapterProgressStatus;
  currentSectionId: Chapter6SectionId;
  completedSectionIds: Chapter6SectionId[];
  reflection: ExpansionReflectionState;
  practice: ExpansionPracticeState;
  commitment: ExpansionCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter6Database = {
  records: Chapter6Record[];
};

export type BeginningReflectionAnswers = Record<
  BeginningReflectionQuestionId,
  string
>;

export type BeginningPracticeState = {
  statement: string;
  signature: string;
  signedDate: string;
  updatedAt: string;
  completedAt: string | null;
};

export type BeginningCommitmentState = {
  affirmed: boolean;
  note: string;
  updatedAt: string;
  completedAt: string | null;
};

export type BeginningReflectionState = {
  answers: BeginningReflectionAnswers;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter7Record = {
  userId: string;
  chapterId: "chapter-7-beginning";
  status: ChapterProgressStatus;
  currentSectionId: Chapter7SectionId;
  completedSectionIds: Chapter7SectionId[];
  reflection: BeginningReflectionState;
  practice: BeginningPracticeState;
  commitment: BeginningCommitmentState;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type Chapter7Database = {
  records: Chapter7Record[];
};

export function emptyAlivenessProjectAnswers(): AlivenessProjectAnswers {
  return {
    q1: [],
    q2: [],
    q3: [],
    q4: [],
    q5: [],
  };
}

export function emptyAwakeningReflectionAnswers(): AwakeningReflectionAnswers {
  const answers = {} as AwakeningReflectionAnswers;
  for (const question of awakeningReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function emptyMirrorReflectionAnswers(): MirrorReflectionAnswers {
  const answers = {} as MirrorReflectionAnswers;
  for (const question of mirrorReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function emptyMirrorExerciseAnswers(): MirrorExerciseAnswers {
  const step4 = {} as Record<MirrorDimensionId, string>;
  for (const dimension of MIRROR_DIMENSIONS) {
    step4[dimension.id] = "";
  }
  return {
    step1: [],
    step2: [],
    step3: [],
    step4,
  };
}

export function createEmptyChapter1Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter1Record {
  return {
    userId,
    chapterId: "chapter-1-awakening",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyAwakeningReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    alivenessProject: {
      answers: emptyAlivenessProjectAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function createEmptyChapter2Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter2Record {
  return {
    userId,
    chapterId: "chapter-2-mirror",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyMirrorReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    mirrorExercise: {
      answers: emptyMirrorExerciseAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function emptyDecisionReflectionAnswers(): DecisionReflectionAnswers {
  const answers = {} as DecisionReflectionAnswers;
  for (const question of decisionReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function createEmptyChapter3Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter3Record {
  return {
    userId,
    chapterId: "chapter-3-decision",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyDecisionReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    practice: {
      statement: "",
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function emptyStandardsReflectionAnswers(): StandardsReflectionAnswers {
  const answers = {} as StandardsReflectionAnswers;
  for (const question of standardsReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function emptyStandardsPracticeAnswers(): StandardsPracticeAnswers {
  const answers = {} as StandardsPracticeAnswers;
  for (const entry of STANDARDS_PRACTICE.entries) {
    answers[entry.id] = "";
  }
  return answers;
}

export function createEmptyChapter4Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter4Record {
  return {
    userId,
    chapterId: "chapter-4-standards",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyStandardsReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    practice: {
      answers: emptyStandardsPracticeAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function emptyArchitectReflectionAnswers(): ArchitectReflectionAnswers {
  const answers = {} as ArchitectReflectionAnswers;
  for (const question of architectReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function createEmptyChapter5Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter5Record {
  return {
    userId,
    chapterId: "chapter-5-architect",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyArchitectReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    practice: {
      statement: "",
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function emptyExpansionReflectionAnswers(): ExpansionReflectionAnswers {
  const answers = {} as ExpansionReflectionAnswers;
  for (const question of expansionReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function emptyExpansionPracticeAnswers(): ExpansionPracticeAnswers {
  const answers = {} as ExpansionPracticeAnswers;
  for (const entry of EXPANSION_PRACTICE.entries) {
    answers[entry.id] = "";
  }
  return answers;
}

export function createEmptyChapter6Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter6Record {
  return {
    userId,
    chapterId: "chapter-6-expansion",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyExpansionReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    practice: {
      answers: emptyExpansionPracticeAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

export function emptyBeginningReflectionAnswers(): BeginningReflectionAnswers {
  const answers = {} as BeginningReflectionAnswers;
  for (const question of beginningReflectionQuestions) {
    answers[question.id] = "";
  }
  return answers;
}

export function createEmptyChapter7Record(
  userId: string,
  now = new Date().toISOString(),
): Chapter7Record {
  return {
    userId,
    chapterId: "chapter-7-beginning",
    status: "not_started",
    currentSectionId: "welcome",
    completedSectionIds: [],
    reflection: {
      answers: emptyBeginningReflectionAnswers(),
      updatedAt: now,
      completedAt: null,
    },
    practice: {
      statement: "",
      signature: "",
      signedDate: "",
      updatedAt: now,
      completedAt: null,
    },
    commitment: {
      affirmed: false,
      note: "",
      updatedAt: now,
      completedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}
