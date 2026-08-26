/**
 * Row 133 — Progression and save logic validation.
 * Does not mark Founder acceptance complete.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { CHAPTER_1_SECTIONS } from "@/content/journey/chapter-1-awakening";
import {
  decideChapterAccess,
  decideSectionAccess,
  JOURNEY_CHAPTER_IDS,
  preserveCompletedChapterStatus,
  resolveContinueChapter,
  resolveProgressPointerStatus,
  resolveProgressPointerTarget,
  resolvePausedSection,
  type JourneyChapterStatusMap,
} from "@/lib/journey/progress/rules";
import {
  createFileJourneyProgressStore,
  setJourneyProgressStoreForTests,
} from "@/lib/journey/progress/store";
import { syncAuthoritativeJourneyProgress } from "@/lib/journey/progress/snapshot";
import {
  createEmptyChapter1Record,
  createEmptyChapter2Record,
  createEmptyChapter7Record,
} from "@/lib/journey/chapters/types";
import {
  setChapter1StoreForTests,
  type Chapter1Store,
} from "@/lib/journey/chapters/store";
import {
  setChapter2StoreForTests,
  type Chapter2Store,
} from "@/lib/journey/chapters/chapter-2-store";
import {
  setChapter3StoreForTests,
  type Chapter3Store,
} from "@/lib/journey/chapters/chapter-3-store";
import {
  setChapter4StoreForTests,
  type Chapter4Store,
} from "@/lib/journey/chapters/chapter-4-store";
import {
  setChapter5StoreForTests,
  type Chapter5Store,
} from "@/lib/journey/chapters/chapter-5-store";
import {
  setChapter6StoreForTests,
  type Chapter6Store,
} from "@/lib/journey/chapters/chapter-6-store";
import {
  setChapter7StoreForTests,
  type Chapter7Store,
} from "@/lib/journey/chapters/chapter-7-store";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";

type Verdict = "PASS" | "FAIL";

type Check = {
  name: string;
  verdict: Verdict;
  detail: string;
};

function check(name: string, ok: boolean, detail: string): Check {
  return { name, verdict: ok ? "PASS" : "FAIL", detail };
}

function memoryChapter1(record?: ReturnType<typeof createEmptyChapter1Record>): Chapter1Store {
  let stored = record;
  return {
    async findChapter1ForUser(userId) {
      return stored?.userId === userId ? stored : undefined;
    },
    async saveChapter1(next) {
      stored = next;
      return next;
    },
  };
}

function memoryChapter2(record?: ReturnType<typeof createEmptyChapter2Record>): Chapter2Store {
  let stored = record;
  return {
    async findChapter2ForUser(userId) {
      return stored?.userId === userId ? stored : undefined;
    },
    async saveChapter2(next) {
      stored = next;
      return next;
    },
  };
}

function emptyLaterStore<T extends { find?: unknown }>(
  findName: string,
  saveName: string,
): T {
  return {
    async [findName]() {
      return undefined;
    },
    async [saveName](record: never) {
      return record;
    },
  } as T;
}

async function withIsolatedStores<T>(run: () => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "row-133-progress-"));
  setJourneyProgressStoreForTests(
    createFileJourneyProgressStore({ dataDir: dir, fileName: "progress.json" }),
  );
  try {
    return await run();
  } finally {
    setJourneyProgressStoreForTests(null);
    setChapter1StoreForTests(null);
    setChapter2StoreForTests(null);
    setChapter3StoreForTests(null);
    setChapter4StoreForTests(null);
    setChapter5StoreForTests(null);
    setChapter6StoreForTests(null);
    setChapter7StoreForTests(null);
  }
}

async function main() {
  const checks: Check[] = [];

  checks.push(
    check(
      "Chapter I is always open",
      decideChapterAccess("chapter-1-awakening", {}).access === "open",
      "empty map opens Chapter I",
    ),
  );

  checks.push(
    check(
      "Chapter II locked until Chapter I is complete",
      decideChapterAccess("chapter-2-mirror", {
        "chapter-1-awakening": "in_progress",
      }).access === "locked",
      "in-progress Chapter I keeps Chapter II locked",
    ),
  );

  const afterCh1: JourneyChapterStatusMap = {
    "chapter-1-awakening": "completed",
  };
  const ch2Open = decideChapterAccess("chapter-2-mirror", afterCh1);
  checks.push(
    check(
      "Chapter II opens after Chapter I completion",
      ch2Open.access === "open" && ch2Open.mode === "start",
      JSON.stringify(ch2Open),
    ),
  );

  const revisit = decideChapterAccess("chapter-1-awakening", {
    "chapter-1-awakening": "completed",
    "chapter-2-mirror": "in_progress",
  });
  checks.push(
    check(
      "Completed chapters remain revisitable",
      revisit.access === "open" && revisit.mode === "revisit",
      JSON.stringify(revisit),
    ),
  );

  const grandfather = decideChapterAccess("chapter-7-beginning", {
    "chapter-1-awakening": "in_progress",
    "chapter-7-beginning": "in_progress",
  });
  checks.push(
    check(
      "Existing in-progress later chapters stay reachable (no draft loss)",
      grandfather.access === "open" && grandfather.mode === "resume",
      JSON.stringify(grandfather),
    ),
  );

  checks.push(
    check(
      "Future incomplete sections are locked",
      decideSectionAccess(
        "practice",
        CHAPTER_1_SECTIONS,
        ["welcome"],
        "in_progress",
      ) === "locked",
      "practice locked until reflection is complete",
    ),
  );

  checks.push(
    check(
      "Current incomplete section is open",
      decideSectionAccess(
        "reflection",
        CHAPTER_1_SECTIONS,
        ["welcome"],
        "in_progress",
      ) === "open",
      "resume section is reachable",
    ),
  );

  checks.push(
    check(
      "Completed chapters allow full section revisiting",
      decideSectionAccess(
        "practice",
        CHAPTER_1_SECTIONS,
        ["welcome"],
        "completed",
      ) === "open",
      "revisiting ignores section locks",
    ),
  );

  checks.push(
    check(
      "Save after completion preserves completed status",
      preserveCompletedChapterStatus("completed") === "completed" &&
        preserveCompletedChapterStatus("in_progress") === "in_progress" &&
        preserveCompletedChapterStatus("not_started") === "in_progress",
      "completed stays completed; drafts stay in_progress",
    ),
  );

  const continueAfterCh1 = resolveContinueChapter(afterCh1);
  checks.push(
    check(
      "Continue targets the next sequential chapter",
      continueAfterCh1.chapterId === "chapter-2-mirror" &&
        continueAfterCh1.mode === "start",
      JSON.stringify(continueAfterCh1),
    ),
  );

  const pointerAfterCh1 = resolveProgressPointerTarget(afterCh1);
  checks.push(
    check(
      "Progress pointer stays on completed Chapter I until Chapter II starts",
      pointerAfterCh1?.chapterId === "chapter-1-awakening" &&
        resolveProgressPointerStatus(pointerAfterCh1) === "stage_completed",
      JSON.stringify(pointerAfterCh1),
    ),
  );

  const skipAhead: JourneyChapterStatusMap = {
    "chapter-1-awakening": "in_progress",
    "chapter-7-beginning": "in_progress",
  };
  const continueSkip = resolveContinueChapter(skipAhead);
  checks.push(
    check(
      "Continue prefers required earlier work over skip-ahead chapters",
      continueSkip.chapterId === "chapter-1-awakening",
      JSON.stringify(continueSkip),
    ),
  );

  const paused = resolvePausedSection(
    "reflection",
    CHAPTER_1_SECTIONS,
    ["welcome"],
    "in_progress",
  );
  checks.push(
    check(
      "Pause keeps the Architect on the allowed current section",
      paused === "reflection",
      paused,
    ),
  );

  await withIsolatedStores(async () => {
    const userId = "row-133-architect";
    const completedCh1 = {
      ...createEmptyChapter1Record(userId),
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };
    setChapter1StoreForTests(memoryChapter1(completedCh1));
    setChapter2StoreForTests(memoryChapter2());
    setChapter3StoreForTests(emptyLaterStore("findChapter3ForUser", "saveChapter3"));
    setChapter4StoreForTests(emptyLaterStore("findChapter4ForUser", "saveChapter4"));
    setChapter5StoreForTests(emptyLaterStore("findChapter5ForUser", "saveChapter5"));
    setChapter6StoreForTests(emptyLaterStore("findChapter6ForUser", "saveChapter6"));
    setChapter7StoreForTests(emptyLaterStore("findChapter7ForUser", "saveChapter7"));

    await syncAuthoritativeJourneyProgress(userId);
    const { getJourneyProgressStore } = await import("@/lib/journey/progress/store");
    const pointer = await getJourneyProgressStore().findProgressForUser(userId);
    checks.push(
      check(
        "Durable pointer records stage_completed after Chapter I",
        pointer?.chapterId === "chapter-1-awakening" &&
          pointer.status === "stage_completed",
        JSON.stringify(pointer ?? null),
      ),
    );

    const startedCh2 = {
      ...createEmptyChapter2Record(userId),
      status: "in_progress" as const,
    };
    setChapter2StoreForTests(memoryChapter2(startedCh2));
    await syncAuthoritativeJourneyProgress(userId);
    const afterStart = await getJourneyProgressStore().findProgressForUser(userId);
    checks.push(
      check(
        "Pointer advances to Chapter II when that chapter starts",
        afterStart?.chapterId === "chapter-2-mirror" &&
          afterStart.status === "in_progress",
        JSON.stringify(afterStart ?? null),
      ),
    );

    await syncAuthoritativeJourneyProgress(userId, {
      "chapter-1-awakening": "completed",
      "chapter-2-mirror": "in_progress",
    });
    const afterRevisitSave = await getJourneyProgressStore().findProgressForUser(
      userId,
    );
    checks.push(
      check(
        "Revisiting Chapter I drafts does not regress the Chapter II pointer",
        afterRevisitSave?.chapterId === "chapter-2-mirror",
        JSON.stringify(afterRevisitSave ?? null),
      ),
    );

    const completedCh7 = {
      ...createEmptyChapter7Record(userId),
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };
    setChapter1StoreForTests(
      memoryChapter1({
        ...completedCh1,
        status: "completed",
      }),
    );
    setChapter2StoreForTests(
      memoryChapter2({
        ...createEmptyChapter2Record(userId),
        status: "completed",
      }),
    );
    setChapter7StoreForTests({
      async findChapter7ForUser(id) {
        return id === userId ? completedCh7 : undefined;
      },
      async saveChapter7(next) {
        return next;
      },
    } as Chapter7Store);
    await syncAuthoritativeJourneyProgress(userId, {
      "chapter-1-awakening": "completed",
      "chapter-2-mirror": "completed",
      "chapter-3-decision": "completed",
      "chapter-4-standards": "completed",
      "chapter-5-architect": "completed",
      "chapter-6-expansion": "completed",
      "chapter-7-beginning": "completed",
    });
    const journeyDone = await getJourneyProgressStore().findProgressForUser(
      userId,
    );
    checks.push(
      check(
        "Chapter VII completion records journey_completed",
        journeyDone?.chapterId === "chapter-7-beginning" &&
          journeyDone.status === "journey_completed",
        JSON.stringify(journeyDone ?? null),
      ),
    );
  });

  checks.push(
    check(
      "Seven Blueprint chapters are sequenced",
      JOURNEY_CHAPTER_IDS.length === 7 &&
        JOURNEY_CHAPTER_IDS[0] === "chapter-1-awakening" &&
        JOURNEY_CHAPTER_IDS[6] === "chapter-7-beginning",
      JOURNEY_CHAPTER_IDS.join(", "),
    ),
  );

  const failed = checks.filter((entry) => entry.verdict === "FAIL");
  const report = {
    row: 133,
    aosWorkId: "al-133",
    deliverable: "Implement Progression and Save Logic",
    owner: "imani",
    founderAcceptance: "not_marked",
    summary: failed.length === 0 ? "PASS" : "FAIL",
    passed: checks.filter((entry) => entry.verdict === "PASS").length,
    failed: failed.length,
    checks,
    generatedAt: new Date().toISOString(),
  };

  const outDir = path.join("ops/fab-5/runs");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "row-133-progression-save-validation.json");
  await writeFile(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
