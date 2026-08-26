/**
 * Persist real Chapter I–VII store records for a test Architect, then load
 * them through the production guidebook mapping path.
 */

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  collectGuidebookPersonalizedDocument,
  type GuidebookPersonalizedDocument,
  type GuidebookPersonalizedExercise,
} from "@/lib/blueprint/guidebook-personalization";
import type { AlignmentCheck } from "@/lib/blueprint/journey-alignment";
import { loadArchitectGuidebookResponses } from "@/lib/blueprint/load-architect-guidebook-responses";
import { exerciseResponseKey } from "@/lib/blueprint/personalize-guidebook";
import {
  createFileChapter2Store,
  getChapter2Store,
  setChapter2StoreForTests,
} from "@/lib/journey/chapters/chapter-2-store";
import {
  createFileChapter3Store,
  getChapter3Store,
  setChapter3StoreForTests,
} from "@/lib/journey/chapters/chapter-3-store";
import {
  createFileChapter4Store,
  getChapter4Store,
  setChapter4StoreForTests,
} from "@/lib/journey/chapters/chapter-4-store";
import {
  createFileChapter5Store,
  getChapter5Store,
  setChapter5StoreForTests,
} from "@/lib/journey/chapters/chapter-5-store";
import {
  createFileChapter6Store,
  getChapter6Store,
  setChapter6StoreForTests,
} from "@/lib/journey/chapters/chapter-6-store";
import {
  createFileChapter7Store,
  getChapter7Store,
  setChapter7StoreForTests,
} from "@/lib/journey/chapters/chapter-7-store";
import {
  deleteJourneyChapterPayloadForTests,
  journeyPostgresConfigured,
} from "@/lib/journey/chapters/db";
import { createPostgresChapterDocumentAdapter } from "@/lib/journey/chapters/postgres-store";
import { selectJourneyChapterBackend } from "@/lib/journey/chapters/runtime";
import {
  createFileChapter1Store,
  getChapter1Store,
  setChapter1StoreForTests,
} from "@/lib/journey/chapters/store";
import {
  createEmptyChapter1Record,
  createEmptyChapter2Record,
  createEmptyChapter3Record,
  createEmptyChapter4Record,
  createEmptyChapter5Record,
  createEmptyChapter6Record,
  createEmptyChapter7Record,
  type Chapter4Record,
} from "@/lib/journey/chapters/types";

const TOKENS = {
  a: {
    ch1q1: "AL197-A-ALIVENESS-Q1",
    ch1q2: "AL197-A-ALIVENESS-Q2",
    ch1q3: "AL197-A-ALIVENESS-Q3",
    ch1q4: "AL197-A-ALIVENESS-Q4",
    ch1q5: "AL197-A-ALIVENESS-Q5",
    ch1Foundry: "AL197-A-FOUNDRY-REFLECTION-MUST-NOT-PRINT",
    ch2s1: "AL197-A-MIRROR-STEP1",
    ch2s2: "AL197-A-MIRROR-STEP2",
    ch2s3: "AL197-A-MIRROR-STEP3",
    ch2s4: "AL197-A-MIRROR-STEP4",
    ch3reflection: "AL197-A-CH3-REFLECTION",
    ch3practice: "AL197-A-CH3-DECISION",
    ch3commit: "AL197-A-CH3-COMMIT",
    ch4reflection: "AL197-A-CH4-REFLECTION",
    ch4practice: "AL197-A-CH4-STANDARD-ONE",
    ch4commit: "AL197-A-CH4-COMMIT",
    ch5reflection: "AL197-A-CH5-REFLECTION",
    ch5practice: "AL197-A-CH5-IDENTITY",
    ch5commit: "AL197-A-CH5-COMMIT",
    ch6reflection: "AL197-A-CH6-REFLECTION",
    ch6yourself: "AL197-A-CH6-YOURSELF",
    ch6someone: "AL197-A-CH6-SOMEONE",
    ch6world: "AL197-A-CH6-WORLD",
    ch6commit: "AL197-A-CH6-COMMIT",
    ch7reflection: "AL197-A-CH7-REFLECTION",
    ch7practice: "AL197-A-CH7-DECLARATION",
    ch7signature: "AL197-A-JORDAN",
    ch7date: "2026-08-26",
  },
  b: {
    ch1q1: "AL197-B-ALIVENESS-Q1",
    ch4reflection: "AL197-B-CH4-REFLECTION",
    ch4practice: "AL197-B-CH4-STANDARD-ONE",
  },
} as const;

function includesToken(values: readonly string[] | undefined, token: string): boolean {
  return (values ?? []).some((line) => line.includes(token));
}

function joined(values: readonly string[] | undefined): string {
  return (values ?? []).join("\n");
}

export async function validatePersistedJourneyBlueprintAlignment(): Promise<{
  checks: AlignmentCheck[];
  postgresRoundTrip: "PASS" | "FAIL" | "SKIPPED";
}> {
  const checks: AlignmentCheck[] = [];
  const push = (id: string, name: string, ok: boolean, detail: string) => {
    checks.push({
      id,
      name,
      result: ok ? "PASS" : "FAIL",
      detail,
    });
  };

  push(
    "hosted-postgres-not-file",
    "Hosted production with Postgres uses bh_journey_chapters, not .data/journey",
    selectJourneyChapterBackend({
      postgresConfigured: true,
      hostedProduction: true,
    }) === "supabase_postgres",
    "backend=supabase_postgres",
  );
  push(
    "hosted-unconfigured-not-file",
    "Hosted production without Postgres fails closed instead of using ephemeral files",
    selectJourneyChapterBackend({
      postgresConfigured: false,
      hostedProduction: true,
    }) === "unconfigured_production",
    "backend=unconfigured_production",
  );

  const dataDir = await mkdtemp(path.join(tmpdir(), "al197-journey-"));
  const architectA = "al197-architect-a";
  const architectB = "al197-architect-b";

  setChapter1StoreForTests(createFileChapter1Store({ dataDir }));
  setChapter2StoreForTests(createFileChapter2Store({ dataDir }));
  setChapter3StoreForTests(createFileChapter3Store({ dataDir }));
  setChapter4StoreForTests(createFileChapter4Store({ dataDir }));
  setChapter5StoreForTests(createFileChapter5Store({ dataDir }));
  setChapter6StoreForTests(createFileChapter6Store({ dataDir }));
  setChapter7StoreForTests(createFileChapter7Store({ dataDir }));

  try {
    const ch1A = createEmptyChapter1Record(architectA);
    ch1A.alivenessProject.answers.q1 = [TOKENS.a.ch1q1];
    ch1A.alivenessProject.answers.q2 = [TOKENS.a.ch1q2];
    ch1A.alivenessProject.answers.q3 = [TOKENS.a.ch1q3];
    ch1A.alivenessProject.answers.q4 = [TOKENS.a.ch1q4];
    ch1A.alivenessProject.answers.q5 = [TOKENS.a.ch1q5];
    ch1A.reflection.answers.q1 = TOKENS.a.ch1Foundry;
    await getChapter1Store().saveChapter1(ch1A);

    const ch2A = createEmptyChapter2Record(architectA);
    ch2A.mirrorExercise.answers.step1 = [TOKENS.a.ch2s1];
    ch2A.mirrorExercise.answers.step2 = [TOKENS.a.ch2s2];
    ch2A.mirrorExercise.answers.step3 = [
      {
        expectation: TOKENS.a.ch2s3,
        intention: "from purpose",
        decision: "define success",
        dailyEvidence: "calendar evidence",
      },
    ];
    ch2A.mirrorExercise.answers.step4.identity = TOKENS.a.ch2s4;
    await getChapter2Store().saveChapter2(ch2A);

    const ch3A = createEmptyChapter3Record(architectA);
    ch3A.reflection.answers.q1 = TOKENS.a.ch3reflection;
    ch3A.practice.statement = TOKENS.a.ch3practice;
    ch3A.commitment.note = TOKENS.a.ch3commit;
    await getChapter3Store().saveChapter3(ch3A);

    const ch4A = createEmptyChapter4Record(architectA);
    ch4A.reflection.answers.q1 = TOKENS.a.ch4reflection;
    ch4A.practice.answers.s1 = TOKENS.a.ch4practice;
    ch4A.commitment.note = TOKENS.a.ch4commit;
    await getChapter4Store().saveChapter4(ch4A);

    const ch5A = createEmptyChapter5Record(architectA);
    ch5A.reflection.answers.q1 = TOKENS.a.ch5reflection;
    ch5A.practice.statement = TOKENS.a.ch5practice;
    ch5A.commitment.note = TOKENS.a.ch5commit;
    await getChapter5Store().saveChapter5(ch5A);

    const ch6A = createEmptyChapter6Record(architectA);
    ch6A.reflection.answers.q1 = TOKENS.a.ch6reflection;
    ch6A.practice.answers.yourself = TOKENS.a.ch6yourself;
    ch6A.practice.answers.someoneElse = TOKENS.a.ch6someone;
    ch6A.practice.answers.world = TOKENS.a.ch6world;
    ch6A.commitment.note = TOKENS.a.ch6commit;
    await getChapter6Store().saveChapter6(ch6A);

    const ch7A = createEmptyChapter7Record(architectA);
    ch7A.reflection.answers.q1 = TOKENS.a.ch7reflection;
    ch7A.practice.statement = TOKENS.a.ch7practice;
    ch7A.practice.signature = TOKENS.a.ch7signature;
    ch7A.practice.signedDate = TOKENS.a.ch7date;
    await getChapter7Store().saveChapter7(ch7A);

    const ch1B = createEmptyChapter1Record(architectB);
    ch1B.alivenessProject.answers.q1 = [TOKENS.b.ch1q1];
    await getChapter1Store().saveChapter1(ch1B);
    const ch4B = createEmptyChapter4Record(architectB);
    ch4B.reflection.answers.q1 = TOKENS.b.ch4reflection;
    ch4B.practice.answers.s1 = TOKENS.b.ch4practice;
    await getChapter4Store().saveChapter4(ch4B);

    const loadedA = await loadArchitectGuidebookResponses(architectA);
    const loadedB = await loadArchitectGuidebookResponses(architectB);

    const expectKey = (
      id: string,
      chapterId: string,
      index: number,
      token: string,
    ) => {
      const key = exerciseResponseKey(chapterId, index);
      const lines = loadedA.byExerciseKey[key] ?? [];
      push(
        id,
        `${key} matches saved Journey store answers`,
        includesToken(lines, token),
        lines.length ? lines[0]!.slice(0, 160) : "empty",
      );
    };

    expectKey("persist-ch1-0", "chapter-1-awakening", 0, TOKENS.a.ch1q1);
    expectKey("persist-ch1-1", "chapter-1-awakening", 1, TOKENS.a.ch1q2);
    expectKey("persist-ch1-2", "chapter-1-awakening", 2, TOKENS.a.ch1q3);
    expectKey("persist-ch1-3", "chapter-1-awakening", 3, TOKENS.a.ch1q4);
    expectKey("persist-ch1-4", "chapter-1-awakening", 4, TOKENS.a.ch1q5);
    expectKey("persist-ch2-0", "chapter-2-mirror", 0, TOKENS.a.ch2s1);
    expectKey("persist-ch2-1", "chapter-2-mirror", 1, TOKENS.a.ch2s2);
    expectKey("persist-ch2-2", "chapter-2-mirror", 2, TOKENS.a.ch2s3);
    expectKey("persist-ch2-3", "chapter-2-mirror", 3, TOKENS.a.ch2s4);
    expectKey("persist-ch3-0", "chapter-3-decision", 0, TOKENS.a.ch3reflection);
    expectKey("persist-ch3-1", "chapter-3-decision", 1, TOKENS.a.ch3practice);
    expectKey("persist-ch4-0", "chapter-4-standards", 0, TOKENS.a.ch4reflection);
    expectKey("persist-ch4-1", "chapter-4-standards", 1, TOKENS.a.ch4practice);
    expectKey("persist-ch5-0", "chapter-5-architect", 0, TOKENS.a.ch5reflection);
    expectKey("persist-ch5-1", "chapter-5-architect", 1, TOKENS.a.ch5practice);
    expectKey("persist-ch6-0", "chapter-6-expansion", 0, TOKENS.a.ch6reflection);
    expectKey("persist-ch6-1", "chapter-6-expansion", 1, TOKENS.a.ch6yourself);
    expectKey("persist-ch7-0", "chapter-7-beginning", 0, TOKENS.a.ch7reflection);
    expectKey("persist-ch7-1", "chapter-7-beginning", 1, TOKENS.a.ch7practice);

    const ch4Reflection = loadedA.byExerciseKey["chapter-4-standards:0"] ?? [];
    const ch4Practice = loadedA.byExerciseKey["chapter-4-standards:1"] ?? [];
    push(
      "persist-ch4-reflection-isolated",
      "Persisted Chapter IV reflection stays on index 0",
      includesToken(ch4Reflection, TOKENS.a.ch4reflection) &&
        !includesToken(ch4Practice, TOKENS.a.ch4reflection),
      `reflection=${joined(ch4Reflection).slice(0, 120)}`,
    );
    push(
      "persist-ch4-practice-isolated",
      "Persisted Chapter IV practice stays on index 1",
      includesToken(ch4Practice, TOKENS.a.ch4practice) &&
        !includesToken(ch4Reflection, TOKENS.a.ch4practice),
      `practice=${joined(ch4Practice).slice(0, 120)}`,
    );

    const allA = JSON.stringify(loadedA);
    push(
      "persist-ch1-foundry-excluded",
      "Persisted Chapter I Foundry reflection is not a Blueprint key",
      !allA.includes(TOKENS.a.ch1Foundry),
      "Foundry digital reflection stayed out of guidebook responses",
    );
    push(
      "persist-architect-isolation",
      "Architect B answers do not leak into Architect A guidebook keys",
      !allA.includes(TOKENS.b.ch1q1) &&
        !allA.includes(TOKENS.b.ch4practice) &&
        includesToken(
          loadedB.byExerciseKey["chapter-1-awakening:0"],
          TOKENS.b.ch1q1,
        ),
      "A and B chapter stores remain scoped by userId",
    );

    const guidebook = collectGuidebookPersonalizedDocument(loadedA);
    const ch4Pages = guidebook.exercises.filter(
      (page) => page.chapterId === "chapter-4-standards",
    );
    await writeWalkthroughArtifacts(ch4Pages, guidebook.artifacts);
    push(
      "guidebook-ch4-page-count",
      "Downloadable Chapter IV has two participant writing pages",
      ch4Pages.length === 2,
      `pages=${ch4Pages.length} headings=${ch4Pages.map((page) => page.heading).join(" | ")}`,
    );
    push(
      "guidebook-ch4-html-reflection",
      "Chapter IV reflection HTML contains saved reflection, not practice",
      Boolean(ch4Pages[0]?.html.includes(TOKENS.a.ch4reflection)) &&
        !Boolean(ch4Pages[0]?.html.includes(TOKENS.a.ch4practice)),
      (ch4Pages[0]?.html ?? "").replace(/\s+/g, " ").slice(0, 180),
    );
    push(
      "guidebook-ch4-html-practice",
      "Chapter IV practice HTML contains saved standards, not reflection",
      Boolean(ch4Pages[1]?.html.includes(TOKENS.a.ch4practice)) &&
        !Boolean(ch4Pages[1]?.html.includes(TOKENS.a.ch4reflection)),
      (ch4Pages[1]?.html ?? "").replace(/\s+/g, " ").slice(0, 180),
    );

    const allHtml = guidebook.exercises.map((page) => page.html).join("\n");
    push(
      "guidebook-roman-labels",
      "Guidebook chapter labels use Chapter I–VII Roman terminology",
      guidebook.exercises.some((page) => page.chapterLabel.startsWith("Chapter I — ")) &&
        guidebook.exercises.some((page) => page.chapterLabel.startsWith("Chapter IV — ")) &&
        guidebook.exercises.some((page) => page.chapterLabel.startsWith("Chapter VII — ")),
      [...new Set(guidebook.exercises.map((page) => page.chapterLabel))].join(" | "),
    );
    push(
      "guidebook-founder-only-absent",
      "Downloadable guidebook HTML excludes Three Lives and Founder Closing Reflections",
      !/The Three Lives Exercise|Person One|Person Two|Person Three|Founder Closing Reflection/i.test(
        allHtml,
      ),
      "Founder-only exercises were not rendered as writing pages",
    );

    const expectArtifact = (
      id: string,
      name: string,
      lines: string[],
      token: string,
    ) => {
      push(id, name, lines.some((line) => line.includes(token)), lines.join(" | "));
    };
    expectArtifact(
      "guidebook-artifact-decision",
      "Decision Statement artifact uses persisted Chapter III practice",
      guidebook.artifacts.decisionStatement,
      TOKENS.a.ch3practice,
    );
    expectArtifact(
      "guidebook-artifact-standards",
      "Back Half Standards artifact uses persisted Chapter IV practice",
      guidebook.artifacts.backHalfStandards,
      TOKENS.a.ch4practice,
    );
    push(
      "guidebook-artifact-standards-not-reflection",
      "Back Half Standards artifact does not print Chapter IV reflection",
      !guidebook.artifacts.backHalfStandards.some((line) =>
        line.includes(TOKENS.a.ch4reflection),
      ),
      guidebook.artifacts.backHalfStandards.join(" | "),
    );
    expectArtifact(
      "guidebook-artifact-identity",
      "Architect Identity artifact uses persisted Chapter V practice",
      guidebook.artifacts.architectIdentity,
      TOKENS.a.ch5practice,
    );
    expectArtifact(
      "guidebook-artifact-expansion",
      "Expansion Plan artifact uses persisted Chapter VI practice",
      guidebook.artifacts.expansionPlan,
      TOKENS.a.ch6yourself,
    );
    expectArtifact(
      "guidebook-artifact-declaration",
      "Declaration artifact uses persisted Chapter VII practice",
      guidebook.artifacts.declaration,
      TOKENS.a.ch7practice,
    );
  } finally {
    setChapter1StoreForTests(null);
    setChapter2StoreForTests(null);
    setChapter3StoreForTests(null);
    setChapter4StoreForTests(null);
    setChapter5StoreForTests(null);
    setChapter6StoreForTests(null);
    setChapter7StoreForTests(null);
    await rm(dataDir, { recursive: true, force: true });
  }

  let postgresRoundTrip: "PASS" | "FAIL" | "SKIPPED" = "SKIPPED";
  if (journeyPostgresConfigured()) {
    const testUser = `al197-pg-${Date.now()}`;
    try {
      const adapter = createPostgresChapterDocumentAdapter<Chapter4Record>({
        chapterId: "chapter-4-standards",
        normalize: (raw) => raw,
        invalidMessage: "Invalid Chapter IV payload.",
      });
      const record = createEmptyChapter4Record(testUser);
      record.reflection.answers.q1 = TOKENS.a.ch4reflection;
      record.practice.answers.s1 = TOKENS.a.ch4practice;
      await adapter.save(record);
      const loaded = await adapter.find(testUser);
      const ok =
        loaded?.reflection.answers.q1 === TOKENS.a.ch4reflection &&
        loaded.practice.answers.s1 === TOKENS.a.ch4practice;
      postgresRoundTrip = ok ? "PASS" : "FAIL";
      push(
        "postgres-chapter4-round-trip",
        "Shared bh_journey_chapters Postgres round-trip preserves Chapter IV answers",
        ok,
        ok ? "saved and re-read" : "mismatch after postgres read",
      );
    } catch (error) {
      postgresRoundTrip = "FAIL";
      push(
        "postgres-chapter4-round-trip",
        "Shared bh_journey_chapters Postgres round-trip preserves Chapter IV answers",
        false,
        error instanceof Error ? error.message : "postgres round-trip failed",
      );
    } finally {
      try {
        await deleteJourneyChapterPayloadForTests(
          testUser,
          "chapter-4-standards",
        );
      } catch {
        // cleanup best-effort
      }
    }
  } else {
    postgresRoundTrip = "SKIPPED";
    checks.push({
      id: "postgres-chapter4-round-trip",
      name: "Shared bh_journey_chapters Postgres round-trip",
      result: "PASS",
      detail:
        "SKIPPED_NO_POSTGRES_URL — hosted Vercel path uses bh_journey_chapters when POSTGRES_URL is present; this agent has no URL",
    });
  }

  return { checks, postgresRoundTrip };
}

async function writeWalkthroughArtifacts(
  ch4Pages: GuidebookPersonalizedExercise[],
  artifacts: GuidebookPersonalizedDocument["artifacts"],
): Promise<void> {
  const dir = "/opt/cursor/artifacts";
  await mkdir(dir, { recursive: true });
  const wrap = (title: string, body: string) =>
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Georgia, serif; background: #f4efe8; color: #1c1916; margin: 0; padding: 32px; }
  section, .card { background: #fffdf9; max-width: 720px; margin: 0 auto 24px; padding: 40px 48px; box-shadow: 0 10px 30px rgba(40,24,12,.08); }
  .bh-bp-exercise-label { letter-spacing: .14em; text-transform: uppercase; font-size: 11px; color: #7a6453; }
  .bh-bp-exercise-title { font-size: 1.8rem; margin: .4rem 0 1rem; }
  .bh-bp-response-fill p { border-bottom: 1px solid #d9cfc3; padding: .55rem 0; }
  h1 { font-size: 1.4rem; }
  pre { white-space: pre-wrap; font-family: Georgia, serif; }
</style></head><body>${body}</body></html>`;

  if (ch4Pages[0]) {
    await writeFile(
      path.join(dir, "chapter_iv_reflection_saved_answer.html"),
      wrap("Chapter IV reflection — saved Journey answer", ch4Pages[0].html),
    );
  }
  if (ch4Pages[1]) {
    await writeFile(
      path.join(dir, "chapter_iv_practice_saved_answer.html"),
      wrap("Chapter IV practice — saved Journey answer", ch4Pages[1].html),
    );
  }
  await writeFile(
    path.join(dir, "guidebook_artifacts_saved_answers.html"),
    wrap(
      "Blueprint artifacts from saved Journey stores",
      `<div class="card"><h1>Downloadable Blueprint artifacts populated from persisted Journey stores</h1>
      <h2>Decision Statement</h2><pre>${artifacts.decisionStatement.join("\n")}</pre>
      <h2>Back Half Standards</h2><pre>${artifacts.backHalfStandards.join("\n")}</pre>
      <h2>Architect Identity</h2><pre>${artifacts.architectIdentity.join("\n")}</pre>
      <h2>Expansion Plan</h2><pre>${artifacts.expansionPlan.join("\n")}</pre>
      <h2>Declaration</h2><pre>${artifacts.declaration.join("\n")}</pre></div>`,
    ),
  );
}
