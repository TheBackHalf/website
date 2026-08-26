/**
 * Row 196 — Journey instructional integrity audit.
 * Verifies required components against built Chapters I–VII.
 * Does not rewrite curriculum.
 */

import {
  getChapter1Localized,
  getChapter2Localized,
  getChapter3Localized,
  getChapter4Localized,
  getChapter5Localized,
  getChapter6Localized,
  getChapter7Localized,
} from "@/content/journey/localized";
import type { Locale } from "@/lib/i18n/config";

export const REQUIRED_COMPONENTS = [
  "founderWelcome",
  "coreTeaching",
  "reflectionQuestions",
  "intentionalPractice",
  "weeklyCommitment",
  "founderClosing",
] as const;

export type RequiredComponent = (typeof REQUIRED_COMPONENTS)[number];

export type IntegritySeverity = "high" | "medium" | "low" | "info";

export type IntegrityDefect = {
  chapter: number;
  locale: Locale;
  component?: RequiredComponent;
  severity: IntegritySeverity;
  status: "open" | "fixed_this_pass";
  summary: string;
};

export type ChapterIntegrityResult = {
  chapter: number;
  roman: string;
  titleEn: string;
  titleEs: string;
  components: Record<
    RequiredComponent,
    { en: boolean; es: boolean; detail: string }
  >;
  reflectionCountEn: number;
  reflectionCountEs: number;
  idParity: boolean;
  progressionRole: string;
};

export type InstructionalIntegrityAudit = {
  row: 196;
  generatedAt: string;
  curriculumRewritten: false;
  chaptersAudited: number[];
  results: ChapterIntegrityResult[];
  defects: IntegrityDefect[];
  coreTeachingNowRenderedOnWelcome: boolean;
  overall: "PASS" | "PASS_WITH_FINDINGS" | "FAIL";
};

function present(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 20);
}

function roman(chapter: number): string {
  return ["I", "II", "III", "IV", "V", "VI", "VII"][chapter - 1] ?? String(chapter);
}

export function auditJourneyInstructionalIntegrity(input?: {
  coreTeachingRenderedOnWelcome?: boolean;
}): InstructionalIntegrityAudit {
  const coreTeachingRendered = input?.coreTeachingRenderedOnWelcome ?? true;
  const defects: IntegrityDefect[] = [];
  const results: ChapterIntegrityResult[] = [];

  const chapter1En = getChapter1Localized("en");
  const chapter1Es = getChapter1Localized("es");
  const chapter2En = getChapter2Localized("en");
  const chapter2Es = getChapter2Localized("es");
  const chapter3En = getChapter3Localized("en");
  const chapter3Es = getChapter3Localized("es");
  const chapter4En = getChapter4Localized("en");
  const chapter4Es = getChapter4Localized("es");
  const chapter5En = getChapter5Localized("en");
  const chapter5Es = getChapter5Localized("es");
  const chapter6En = getChapter6Localized("en");
  const chapter6Es = getChapter6Localized("es");
  const chapter7En = getChapter7Localized("en");
  const chapter7Es = getChapter7Localized("es");

  const chapters: Array<{
    chapter: number;
    progressionRole: string;
    en: {
      title: string;
      founderWelcomeRaw: string;
      coreTeachingRaw: string;
      founderClosingRaw: string;
      reflectionIds: string[];
      practiceReady: boolean;
      practiceDetail: string;
      weekly: string;
    };
    es: {
      title: string;
      founderWelcomeRaw: string;
      coreTeachingRaw: string;
      founderClosingRaw: string;
      reflectionIds: string[];
      practiceReady: boolean;
      practiceDetail: string;
      weekly: string;
    };
  }> = [
    {
      chapter: 1,
      progressionRole: "Awakening — honesty about the present before design work",
      en: {
        title: chapter1En.title,
        founderWelcomeRaw: chapter1En.founderWelcomeRaw,
        coreTeachingRaw: chapter1En.coreTeachingRaw,
        founderClosingRaw: chapter1En.founderClosingRaw,
        reflectionIds: chapter1En.reflectionQuestions.map((item) => item.id),
        practiceReady:
          chapter1En.projectQuestions.length === 5 &&
          chapter1En.projectQuestions.every((item) => item.targetCount >= 1),
        practiceDetail: `Aliveness Project (${chapter1En.projectQuestions.length} questions)`,
        weekly: chapter1En.weeklyCommitment.statement,
      },
      es: {
        title: chapter1Es.title,
        founderWelcomeRaw: chapter1Es.founderWelcomeRaw,
        coreTeachingRaw: chapter1Es.coreTeachingRaw,
        founderClosingRaw: chapter1Es.founderClosingRaw,
        reflectionIds: chapter1Es.reflectionQuestions.map((item) => item.id),
        practiceReady:
          chapter1Es.projectQuestions.length === 5 &&
          chapter1Es.projectQuestions.every((item) => item.targetCount >= 1),
        practiceDetail: `Proyecto de Aliveness (${chapter1Es.projectQuestions.length} preguntas)`,
        weekly: chapter1Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 2,
      progressionRole: "Mirror — see expectation vs intention before deciding",
      en: {
        title: chapter2En.title,
        founderWelcomeRaw: chapter2En.founderWelcomeRaw,
        coreTeachingRaw: chapter2En.coreTeachingRaw,
        founderClosingRaw: chapter2En.founderClosingRaw,
        reflectionIds: chapter2En.reflectionQuestions.map((item) => item.id),
        practiceReady: Boolean(
          chapter2En.stepOne.targetCount === 50 &&
            chapter2En.stepTwo.targetCount === 50 &&
            chapter2En.stepThree.minCompleteRows >= 1,
        ),
        practiceDetail: "The Back Half Mirror (four steps)",
        weekly: chapter2En.weeklyCommitment.statement,
      },
      es: {
        title: chapter2Es.title,
        founderWelcomeRaw: chapter2Es.founderWelcomeRaw,
        coreTeachingRaw: chapter2Es.coreTeachingRaw,
        founderClosingRaw: chapter2Es.founderClosingRaw,
        reflectionIds: chapter2Es.reflectionQuestions.map((item) => item.id),
        practiceReady: Boolean(
          chapter2Es.stepOne.targetCount === 50 &&
            chapter2Es.stepTwo.targetCount === 50 &&
            chapter2Es.stepThree.minCompleteRows >= 1,
        ),
        practiceDetail: "The Back Half Mirror (cuatro pasos)",
        weekly: chapter2Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 3,
      progressionRole: "Decision — choose intention after seeing clearly",
      en: {
        title: chapter3En.title,
        founderWelcomeRaw: chapter3En.founderWelcomeRaw,
        coreTeachingRaw: chapter3En.coreTeachingRaw,
        founderClosingRaw: chapter3En.founderClosingRaw,
        reflectionIds: chapter3En.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter3En.practice.stem.length > 0,
        practiceDetail: chapter3En.practice.title,
        weekly: chapter3En.weeklyCommitment.statement,
      },
      es: {
        title: chapter3Es.title,
        founderWelcomeRaw: chapter3Es.founderWelcomeRaw,
        coreTeachingRaw: chapter3Es.coreTeachingRaw,
        founderClosingRaw: chapter3Es.founderClosingRaw,
        reflectionIds: chapter3Es.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter3Es.practice.stem.length > 0,
        practiceDetail: chapter3Es.practice.title,
        weekly: chapter3Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 4,
      progressionRole: "Standards — convert the decision into daily practice",
      en: {
        title: chapter4En.title,
        founderWelcomeRaw: chapter4En.founderWelcomeRaw,
        coreTeachingRaw: chapter4En.coreTeachingRaw,
        founderClosingRaw: chapter4En.founderClosingRaw,
        reflectionIds: chapter4En.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter4En.practice.entries.length === 5,
        practiceDetail: chapter4En.practice.title,
        weekly: chapter4En.weeklyCommitment.statement,
      },
      es: {
        title: chapter4Es.title,
        founderWelcomeRaw: chapter4Es.founderWelcomeRaw,
        coreTeachingRaw: chapter4Es.coreTeachingRaw,
        founderClosingRaw: chapter4Es.founderClosingRaw,
        reflectionIds: chapter4Es.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter4Es.practice.entries.length === 5,
        practiceDetail: chapter4Es.practice.title,
        weekly: chapter4Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 5,
      progressionRole: "Architect identity — live as the person who decided",
      en: {
        title: chapter5En.title,
        founderWelcomeRaw: chapter5En.founderWelcomeRaw,
        coreTeachingRaw: chapter5En.coreTeachingRaw,
        founderClosingRaw: chapter5En.founderClosingRaw,
        reflectionIds: chapter5En.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter5En.practice.stem.length > 0,
        practiceDetail: chapter5En.practice.title,
        weekly: chapter5En.weeklyCommitment.statement,
      },
      es: {
        title: chapter5Es.title,
        founderWelcomeRaw: chapter5Es.founderWelcomeRaw,
        coreTeachingRaw: chapter5Es.coreTeachingRaw,
        founderClosingRaw: chapter5Es.founderClosingRaw,
        reflectionIds: chapter5Es.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter5Es.practice.stem.length > 0,
        practiceDetail: chapter5Es.practice.title,
        weekly: chapter5Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 6,
      progressionRole: "Expansion — extend the identity beyond the self",
      en: {
        title: chapter6En.title,
        founderWelcomeRaw: chapter6En.founderWelcomeRaw,
        coreTeachingRaw: chapter6En.coreTeachingRaw,
        founderClosingRaw: chapter6En.founderClosingRaw,
        reflectionIds: chapter6En.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter6En.practice.entries.length === 3,
        practiceDetail: chapter6En.practice.title,
        weekly: chapter6En.weeklyCommitment.statement,
      },
      es: {
        title: chapter6Es.title,
        founderWelcomeRaw: chapter6Es.founderWelcomeRaw,
        coreTeachingRaw: chapter6Es.coreTeachingRaw,
        founderClosingRaw: chapter6Es.founderClosingRaw,
        reflectionIds: chapter6Es.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter6Es.practice.entries.length === 3,
        practiceDetail: chapter6Es.practice.title,
        weekly: chapter6Es.weeklyCommitment.statement,
      },
    },
    {
      chapter: 7,
      progressionRole: "Beginning — close the Journey with a living declaration",
      en: {
        title: chapter7En.title,
        founderWelcomeRaw: chapter7En.founderWelcomeRaw,
        coreTeachingRaw: chapter7En.coreTeachingRaw,
        founderClosingRaw: chapter7En.founderClosingRaw,
        reflectionIds: chapter7En.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter7En.practice.stem.length > 0,
        practiceDetail: chapter7En.practice.title,
        weekly: chapter7En.weeklyCommitment.statement,
      },
      es: {
        title: chapter7Es.title,
        founderWelcomeRaw: chapter7Es.founderWelcomeRaw,
        coreTeachingRaw: chapter7Es.coreTeachingRaw,
        founderClosingRaw: chapter7Es.founderClosingRaw,
        reflectionIds: chapter7Es.reflectionQuestions.map((item) => item.id),
        practiceReady: chapter7Es.practice.stem.length > 0,
        practiceDetail: chapter7Es.practice.title,
        weekly: chapter7Es.weeklyCommitment.statement,
      },
    },
  ];

  for (const entry of chapters) {
    const idParity =
      entry.en.reflectionIds.length === entry.es.reflectionIds.length &&
      entry.en.reflectionIds.every((id, index) => id === entry.es.reflectionIds[index]);

    const components: ChapterIntegrityResult["components"] = {
      founderWelcome: {
        en: present(entry.en.founderWelcomeRaw),
        es: present(entry.es.founderWelcomeRaw),
        detail: "Founder Welcome manuscript block",
      },
      coreTeaching: {
        en: present(entry.en.coreTeachingRaw),
        es: present(entry.es.coreTeachingRaw),
        detail: coreTeachingRendered
          ? "Core Teaching present and rendered on Founder Welcome"
          : "Core Teaching present in content but not rendered",
      },
      reflectionQuestions: {
        en: entry.en.reflectionIds.length >= 5,
        es: entry.es.reflectionIds.length >= 5,
        detail: `${entry.en.reflectionIds.length} EN / ${entry.es.reflectionIds.length} ES prompts`,
      },
      intentionalPractice: {
        en: entry.en.practiceReady,
        es: entry.es.practiceReady,
        detail: entry.en.practiceDetail,
      },
      weeklyCommitment: {
        en: present(entry.en.weekly),
        es: present(entry.es.weekly),
        detail: entry.en.weekly,
      },
      founderClosing: {
        en: present(entry.en.founderClosingRaw),
        es: present(entry.es.founderClosingRaw),
        detail: "Founder Closing Reflection manuscript block",
      },
    };

    for (const component of REQUIRED_COMPONENTS) {
      if (!components[component].en || !components[component].es) {
        defects.push({
          chapter: entry.chapter,
          locale: !components[component].en ? "en" : "es",
          component,
          severity: "high",
          status: "open",
          summary: `Missing ${component} in built Chapter ${roman(entry.chapter)}.`,
        });
      }
    }

    if (!idParity) {
      defects.push({
        chapter: entry.chapter,
        locale: "es",
        component: "reflectionQuestions",
        severity: "high",
        status: "open",
        summary: `English/Spanish reflection question ids diverge in Chapter ${roman(entry.chapter)}.`,
      });
    }

    if (entry.es.weekly === entry.en.weekly) {
      defects.push({
        chapter: entry.chapter,
        locale: "es",
        component: "weeklyCommitment",
        severity: "medium",
        status: "open",
        summary: `Chapter ${roman(entry.chapter)} Spanish weekly commitment still uses the English approved wording. Do not invent a translation; Human Spanish QA remains.`,
      });
    }

    if (
      /doesn't require certainty|doesn't exist to discourage you/i.test(
        entry.es.founderClosingRaw,
      )
    ) {
      defects.push({
        chapter: entry.chapter,
        locale: "es",
        component: "founderClosing",
        severity: "medium",
        status: "open",
        summary: `Chapter ${roman(entry.chapter)} Spanish Founder Closing Reflection is still English. Do not invent a translation; Human Spanish QA remains.`,
      });
    }

    if (
      entry.chapter === 2 &&
      entry.es.reflectionIds.length > 0 &&
      /Which area of your life feels most alive/i.test(
        chapter2Es.reflectionQuestions[0]?.prompt ?? "",
      )
    ) {
      defects.push({
        chapter: 2,
        locale: "es",
        component: "reflectionQuestions",
        severity: "medium",
        status: "open",
        summary:
          "Chapter II Spanish reflection prompts remain English because no approved Spanish manuscript is present. Do not invent a translation.",
      });
    }

    results.push({
      chapter: entry.chapter,
      roman: roman(entry.chapter),
      titleEn: entry.en.title,
      titleEs: entry.es.title,
      components,
      reflectionCountEn: entry.en.reflectionIds.length,
      reflectionCountEs: entry.es.reflectionIds.length,
      idParity,
      progressionRole: entry.progressionRole,
    });
  }

  if (coreTeachingRendered) {
    defects.push({
      chapter: 0,
      locale: "en",
      component: "coreTeaching",
      severity: "info",
      status: "fixed_this_pass",
      summary:
        "Core Teaching existed in approved content but was not shown as a participant step. Restored on the Founder Welcome surface for Chapters I–VII without adding a new progress section or rewriting copy.",
    });
  }

  const openHigh = defects.some(
    (defect) => defect.status === "open" && defect.severity === "high",
  );
  const openOther = defects.some(
    (defect) => defect.status === "open" && defect.severity !== "info",
  );

  return {
    row: 196,
    generatedAt: new Date().toISOString(),
    curriculumRewritten: false,
    chaptersAudited: [1, 2, 3, 4, 5, 6, 7],
    results,
    defects,
    coreTeachingNowRenderedOnWelcome: coreTeachingRendered,
    overall: openHigh ? "FAIL" : openOther ? "PASS_WITH_FINDINGS" : "PASS",
  };
}
