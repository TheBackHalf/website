/**
 * Canonical Blueprint ↔ Journey exercise alignment for Row 197 / AOS al-197.
 * Names the participant writing pages that belong in the downloadable Blueprint
 * and the Journey-only / Founder-only work that must stay out of it.
 */

import { blueprintDocumentSections } from "@/content/blueprint/document-structure";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import { journeyStages } from "@/content/journey-stages";
import { CHAPTER_1_SHORT_TITLE } from "@/content/journey/chapter-1-awakening";
import { CHAPTER_2_SHORT_TITLE } from "@/content/journey/chapter-2-mirror";
import { CHAPTER_3_SHORT_TITLE } from "@/content/journey/chapter-3-decision";
import { CHAPTER_4_SHORT_TITLE } from "@/content/journey/chapter-4-standards";
import { CHAPTER_5_SHORT_TITLE } from "@/content/journey/chapter-5-architect";
import { CHAPTER_6_SHORT_TITLE } from "@/content/journey/chapter-6-expansion";
import { CHAPTER_7_SHORT_TITLE } from "@/content/journey/chapter-7-beginning";
import { getArchitectIdentityFill } from "@/lib/blueprint/architect-identity-fill";
import { getBackHalfStandardsFill } from "@/lib/blueprint/back-half-standards-fill";
import { getChapterPrintParts } from "@/lib/blueprint/chapter-print-content";
import { getBackHalfDeclarationFill } from "@/lib/blueprint/declaration-fill";
import { getDecisionStatementFill } from "@/lib/blueprint/decision-statement-fill";
import { getExpansionPlanFill } from "@/lib/blueprint/expansion-plan-fill";
import { mapSavedJourneyToBlueprintResponses } from "@/lib/blueprint/map-journey-to-blueprint";
import { exerciseResponseKey } from "@/lib/blueprint/personalize-guidebook";

export const BLUEPRINT_CHAPTER_IDS = [
  "chapter-1-awakening",
  "chapter-2-mirror",
  "chapter-3-decision",
  "chapter-4-standards",
  "chapter-5-architect",
  "chapter-6-expansion",
  "chapter-7-beginning",
] as const;

export type BlueprintChapterId = (typeof BLUEPRINT_CHAPTER_IDS)[number];

export type BlueprintJourneyExerciseSpec = {
  chapterId: BlueprintChapterId;
  exerciseIndex: number;
  journeySource: string;
  belongsInBlueprint: true;
};

export type JourneyOnlySpec = {
  chapterId: BlueprintChapterId | "onboarding";
  section: string;
  reason: string;
};

export const BLUEPRINT_EXERCISE_SPECS: readonly BlueprintJourneyExerciseSpec[] = [
  {
    chapterId: "chapter-1-awakening",
    exerciseIndex: 0,
    journeySource: "alivenessProject.answers.q1",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-1-awakening",
    exerciseIndex: 1,
    journeySource: "alivenessProject.answers.q2",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-1-awakening",
    exerciseIndex: 2,
    journeySource: "alivenessProject.answers.q3",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-1-awakening",
    exerciseIndex: 3,
    journeySource: "alivenessProject.answers.q4",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-1-awakening",
    exerciseIndex: 4,
    journeySource: "alivenessProject.answers.q5 + optional weekly commitment note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-2-mirror",
    exerciseIndex: 0,
    journeySource: "mirrorExercise.answers.step1",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-2-mirror",
    exerciseIndex: 1,
    journeySource: "mirrorExercise.answers.step2",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-2-mirror",
    exerciseIndex: 2,
    journeySource: "mirrorExercise.answers.step3",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-2-mirror",
    exerciseIndex: 3,
    journeySource: "mirrorExercise.answers.step4 + optional weekly commitment note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-3-decision",
    exerciseIndex: 0,
    journeySource: "reflection.answers",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-3-decision",
    exerciseIndex: 1,
    journeySource: "practice.statement + commitment.note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-4-standards",
    exerciseIndex: 0,
    journeySource: "reflection.answers",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-4-standards",
    exerciseIndex: 1,
    journeySource: "practice.answers + commitment.note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-5-architect",
    exerciseIndex: 0,
    journeySource: "reflection.answers",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-5-architect",
    exerciseIndex: 1,
    journeySource: "practice.statement + commitment.note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-6-expansion",
    exerciseIndex: 0,
    journeySource: "reflection.answers",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-6-expansion",
    exerciseIndex: 1,
    journeySource: "practice.answers + commitment.note",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-7-beginning",
    exerciseIndex: 0,
    journeySource: "reflection.answers",
    belongsInBlueprint: true,
  },
  {
    chapterId: "chapter-7-beginning",
    exerciseIndex: 1,
    journeySource: "practice.statement/signature/date + commitment.note",
    belongsInBlueprint: true,
  },
] as const;

export const JOURNEY_ONLY_SECTIONS: readonly JourneyOnlySpec[] = [
  {
    chapterId: "chapter-1-awakening",
    section: "reflection",
    reason:
      "Foundry digital Architect Reflection Questions. Blueprint writing pages for Chapter I are the five Aliveness Project questions (exercisePageCount 5).",
  },
  {
    chapterId: "chapter-2-mirror",
    section: "reflection",
    reason:
      "Foundry digital Architect Reflection Questions. Blueprint writing pages for Chapter II are the four Mirror steps (exercisePageCount 4).",
  },
  {
    chapterId: "onboarding",
    section: "aliveness-index",
    reason:
      "Onboarding Aliveness Index scores live in Journey/Lumina. The Blueprint Aliveness Index artifact remains the approved fillable worksheet, matching the other standalone assessment layout.",
  },
] as const;

export const FOUNDER_ONLY_EXERCISES = [
  {
    id: "three-lives",
    chapterId: "chapter-5-architect" as const,
    labels: [
      "The Three Lives Exercise",
      "Person One",
      "Person Two",
      "Person Three",
    ],
    reason: "Founder-only exercise — never emit participant writing pages.",
  },
  {
    id: "founder-closing-reflections",
    chapterId: "all" as const,
    labels: ["Founder Closing Reflection"],
    reason:
      "Founder media / closing reflection is not a participant Blueprint writing exercise.",
  },
] as const;

const CHAPTER_SHORT_TITLES: Record<BlueprintChapterId, string> = {
  "chapter-1-awakening": CHAPTER_1_SHORT_TITLE,
  "chapter-2-mirror": CHAPTER_2_SHORT_TITLE,
  "chapter-3-decision": CHAPTER_3_SHORT_TITLE,
  "chapter-4-standards": CHAPTER_4_SHORT_TITLE,
  "chapter-5-architect": CHAPTER_5_SHORT_TITLE,
  "chapter-6-expansion": CHAPTER_6_SHORT_TITLE,
  "chapter-7-beginning": CHAPTER_7_SHORT_TITLE,
};

export type AlignmentCheck = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function expectedCount(chapterId: BlueprintChapterId): number {
  return BLUEPRINT_EXERCISE_SPECS.filter((spec) => spec.chapterId === chapterId)
    .length;
}

function fixtureResponses() {
  return mapSavedJourneyToBlueprintResponses({
    firstName: "Jordan",
    chapter1: {
      alivenessProject: {
        answers: {
          q1: ["creating with purpose"],
          q2: ["people-pleasing"],
          q3: ["silence"],
          q4: ["I decided to begin"],
          q5: ["peace"],
        },
      },
      commitment: { note: "CH1-COMMIT" },
    },
    chapter2: {
      mirrorExercise: {
        answers: {
          step1: ["their calendar belongs to everyone else"],
          step2: ["their calendar reflects their values"],
          step3: [
            {
              expectation: "I work for approval",
              intention: "I work from purpose",
              decision: "I define success",
              dailyEvidence: "My calendar reflects priorities",
            },
          ],
          step4: {
            identity: "becoming an Architect",
            time: "I own my calendar",
            work: "",
            relationships: "",
            health: "",
            wonder: "",
            stewardship: "",
            contribution: "",
          },
        },
      },
      commitment: { note: "CH2-COMMIT" },
    },
    chapter3: {
      reflection: {
        answers: {
          q1: "the conversation I keep postponing",
          q2: "",
          q3: "",
          q4: "",
          q5: "",
          q6: "",
          q7: "",
        },
      },
      practice: { statement: "protect my peace" },
      commitment: { note: "CH3-COMMIT" },
    },
    chapter4: {
      reflection: {
        answers: {
          q1: "quiet standards of survival",
          q2: "",
          q3: "",
          q4: "",
          q5: "",
          q6: "",
          q7: "",
        },
      },
      practice: {
        answers: {
          s1: "I protect my peace",
          s2: "I honor my body",
          s3: "",
          s4: "",
          s5: "",
        },
      },
      commitment: { note: "CH4-COMMIT" },
    },
    chapter5: {
      reflection: {
        answers: {
          q1: "the helper who never rests",
          q2: "",
          q3: "",
          q4: "",
          q5: "",
          q6: "",
          q7: "",
        },
      },
      practice: { statement: "chooses intention every morning" },
      commitment: { note: "CH5-COMMIT" },
    },
    chapter6: {
      reflection: {
        answers: {
          q1: "my family already feels the shift",
          q2: "",
          q3: "",
          q4: "",
          q5: "",
          q6: "",
          q7: "",
        },
      },
      practice: {
        answers: {
          yourself: "daily walk",
          someoneElse: "encourage a friend",
          world: "serve locally",
        },
      },
      commitment: { note: "CH6-COMMIT" },
    },
    chapter7: {
      reflection: {
        answers: {
          q1: "I tell myself the truth",
          q2: "",
          q3: "",
          q4: "",
          q5: "",
          q6: "",
          q7: "",
        },
      },
      practice: {
        statement: "is honest, generous, and awake",
        signature: "Jordan Architect",
        signedDate: "2026-08-26",
      },
      commitment: { note: "CH7-COMMIT" },
    },
  });
}

export function validateBlueprintJourneyAlignment(): {
  generatedAt: string;
  passed: number;
  failed: number;
  checks: AlignmentCheck[];
} {
  const checks: AlignmentCheck[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    checks.push({
      id,
      name,
      result: ok ? "PASS" : "FAIL",
      detail,
    });
  };

  const manuscript = getBlueprintManuscript();
  const responses = fixtureResponses();

  for (const chapterId of BLUEPRINT_CHAPTER_IDS) {
    const section = blueprintDocumentSections.find(
      (entry) => entry.id === chapterId,
    );
    const parts = getChapterPrintParts(
      chapterId,
      manuscript?.chapters?.[chapterId] ?? null,
    );
    const expected = expectedCount(chapterId);
    push(
      `${chapterId}-count`,
      `${chapterId} print exercise count`,
      parts.exercises.length === expected,
      `print=${parts.exercises.length} expected=${expected} reserved=${section?.exercisePageCount ?? "n/a"}`,
    );
    push(
      `${chapterId}-reserved`,
      `${chapterId} reserved page count matches print`,
      (section?.exercisePageCount ?? expected) === parts.exercises.length,
      `reserved=${section?.exercisePageCount ?? "n/a"} print=${parts.exercises.length}`,
    );

    const order = BLUEPRINT_CHAPTER_IDS.indexOf(chapterId) + 1;
    const expectedStage = journeyStages.find((entry) => entry.order === order);
    push(
      `${chapterId}-name`,
      `${chapterId} chapter name matches Journey stage`,
      section?.chapterName === expectedStage?.name &&
        CHAPTER_SHORT_TITLES[chapterId] === expectedStage?.name,
      `blueprint=${section?.chapterName ?? "missing"} journeyStage=${expectedStage?.name ?? "missing"} shortTitle=${CHAPTER_SHORT_TITLES[chapterId]}`,
    );

    const roman = section?.romanNumeral ?? "";
    push(
      `${chapterId}-label`,
      `${chapterId} Blueprint label uses Roman chapter terminology`,
      Boolean(
        section?.label.startsWith(`Chapter ${roman} — `) &&
          section.label.includes(expectedStage?.name ?? "___"),
      ),
      section?.label ?? "missing label",
    );

    const joined = parts.exercises
      .flatMap((exercise) => [
        exercise.heading,
        exercise.title,
        ...exercise.instructions,
      ])
      .join("\n");
    push(
      `${chapterId}-founder-only-excluded`,
      `${chapterId} excludes Founder-only exercises`,
      !/The Three Lives Exercise|Person One|Person Two|Person Three|Founder Closing Reflection/i.test(
        joined,
      ),
      joined.slice(0, 180) || "(no exercise copy)",
    );

    for (let index = 0; index < expected; index += 1) {
      const key = exerciseResponseKey(chapterId, index);
      const lines = responses.byExerciseKey[key] ?? [];
      push(
        `${key}-populated`,
        `${key} fixture answers populate`,
        lines.length > 0,
        lines.length ? lines[0]!.slice(0, 120) : "empty",
      );
    }
  }

  const ch4Reflection = responses.byExerciseKey["chapter-4-standards:0"] ?? [];
  const ch4Practice = responses.byExerciseKey["chapter-4-standards:1"] ?? [];
  push(
    "ch4-reflection-isolated",
    "Chapter IV reflection does not land on the Standards practice page",
    ch4Reflection.some((line) => line.includes("quiet standards of survival")) &&
      !ch4Practice.some((line) => line.includes("quiet standards of survival")),
    `reflection=${ch4Reflection.length} practice=${ch4Practice.length}`,
  );
  push(
    "ch4-practice-isolated",
    "Chapter IV practice standards do not land on the reflection page",
    ch4Practice.some((line) => line.includes("I protect my peace")) &&
      !ch4Reflection.some((line) => line.includes("Standard One")),
    `practice=${ch4Practice.join(" | ")}`,
  );
  push(
    "ch4-founder-three-lives-absent-from-keys",
    "No Three Lives key is emitted for Chapter V",
    !Object.keys(responses.byExerciseKey).some((key) =>
      /three|person/i.test(key),
    ),
    Object.keys(responses.byExerciseKey).sort().join(", "),
  );

  const ch1ReflectionLeaked = Object.entries(responses.byExerciseKey)
    .filter(([key]) => key.startsWith("chapter-1-awakening:"))
    .some(([, lines]) =>
      lines.some((line) =>
        line.includes("living by expectation instead of intention"),
      ),
    );
  push(
    "ch1-foundry-reflection-excluded",
    "Chapter I Foundry reflection prompts are not Blueprint keys",
    !ch1ReflectionLeaked &&
      !("chapter-1-awakening:5" in responses.byExerciseKey),
    "Journey-digital reflection stays off the Aliveness Project pages",
  );

  const decision = getDecisionStatementFill(responses);
  push(
    "artifact-decision-statement",
    "Decision Statement artifact uses Chapter III practice",
    (decision.statement ?? "").includes("protect my peace") &&
      decision.commitment === "CH3-COMMIT",
    JSON.stringify(decision.lines),
  );
  const standards = getBackHalfStandardsFill(responses);
  push(
    "artifact-back-half-standards",
    "Back Half Standards artifact uses Chapter IV practice (not reflection)",
    standards.standards.some((line) => line.includes("I protect my peace")) &&
      standards.commitment === "CH4-COMMIT" &&
      !standards.lines.some((line) => line.includes("quiet standards")),
    JSON.stringify(standards.lines),
  );
  const identity = getArchitectIdentityFill(responses);
  push(
    "artifact-architect-identity",
    "Architect Identity artifact uses Chapter V practice",
    (identity.statement ?? "").includes("chooses intention") &&
      identity.commitment === "CH5-COMMIT",
    JSON.stringify(identity.lines),
  );
  const expansion = getExpansionPlanFill(responses);
  push(
    "artifact-expansion-plan",
    "Expansion Plan artifact uses Chapter VI practice",
    expansion.yourself === "daily walk" &&
      expansion.someoneElse === "encourage a friend" &&
      expansion.world === "serve locally" &&
      expansion.commitment === "CH6-COMMIT",
    JSON.stringify(expansion.lines),
  );
  const declaration = getBackHalfDeclarationFill(responses);
  push(
    "artifact-declaration",
    "Back Half Declaration artifact uses Chapter VII practice",
    (declaration.statement ?? "").includes("honest, generous, and awake") &&
      declaration.signature === "Jordan Architect" &&
      declaration.signedDate === "2026-08-26",
    JSON.stringify(declaration.lines),
  );

  const isolation = mapSavedJourneyToBlueprintResponses({
    firstName: "Beta",
    chapter1: {
      alivenessProject: { answers: { q1: ["BETA ONLY"] } },
    },
  });
  push(
    "architect-isolation",
    "Saved answers are Architect-scoped (fixture isolation)",
    (isolation.byExerciseKey["chapter-1-awakening:0"] ?? []).includes(
      "BETA ONLY",
    ) &&
      !(responses.byExerciseKey["chapter-1-awakening:0"] ?? []).includes(
        "BETA ONLY",
      ) &&
      !JSON.stringify(isolation).includes("creating with purpose"),
    "alpha and beta fixtures do not share answers",
  );

  const passed = checks.filter((check) => check.result === "PASS").length;
  const failed = checks.filter((check) => check.result === "FAIL").length;
  return {
    generatedAt: new Date().toISOString(),
    passed,
    failed,
    checks,
  };
}
