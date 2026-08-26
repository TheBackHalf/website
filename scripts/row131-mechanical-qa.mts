/**
 * Row 131 mechanical checks: isolation, persistence, auth, Blueprint mapping.
 * Uses disposable Architect accounts. Does not seed production defaults.
 */
import { createSessionToken } from "../lib/auth/session";
import { AUTH_COOKIE_NAME } from "../lib/auth/config";
import { getAuthStore } from "../lib/auth/store";
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";
import { getExpansionPlanFill } from "../lib/blueprint/expansion-plan-fill";
import {
  advanceChapter6SectionForUser,
  loadChapter6ForUser,
  saveChapter6CommitmentForUser,
  saveChapter6PracticeForUser,
  saveChapter6ReflectionForUser,
} from "../lib/journey/chapters/chapter-6-service";
import { getChapter6Store } from "../lib/journey/chapters/chapter-6-store";
import { getChapter5Store } from "../lib/journey/chapters/chapter-5-store";
import { createEmptyChapter6Record } from "../lib/journey/chapters/types";
import { getJourneyProgressStore } from "../lib/journey/progress";

const ARCHITECT_A = {
  email: "elena.disp.a@example.com",
} as const;

const ARCHITECT_B = {
  email: "caleb.disp.b@example.com",
} as const;

const ORIGIN = process.env.ROW131_ORIGIN ?? "http://127.0.0.1:3000";
const TOKEN_A = "ELENA-EXPANSION-ALPHA";
const TOKEN_A_EDIT = "ELENA-EXPANSION-ALPHA-EDIT";
const TOKEN_B = "CALEB-EXPANSION-BRAVO";

function fail(message: string): never {
  console.error("FAIL:", message);
  process.exit(1);
}

function assert(condition: unknown, message: string) {
  if (!condition) fail(message);
}

async function cookieFor(userId: string) {
  const user = await getAuthStore().findUserById(userId);
  if (!user) fail(`Missing user ${userId}`);
  const token = await createSessionToken(user);
  return `${AUTH_COOKIE_NAME}=${token}`;
}

async function main() {
  const auth = getAuthStore();
  const userA = await auth.findUserByEmail(ARCHITECT_A.email);
  const userB = await auth.findUserByEmail(ARCHITECT_B.email);
  if (!userA || !userB) fail("Seed accounts first: npx tsx scripts/seed-row130-qa.mts");

  const store = getChapter6Store();
  await store.saveChapter6(createEmptyChapter6Record(userA.id));
  await store.saveChapter6(createEmptyChapter6Record(userB.id));

  const chapter5A = await getChapter5Store().findChapter5ForUser(userA.id);
  const chapter5Statement = chapter5A?.practice.statement ?? "";

  const loadedA = await loadChapter6ForUser(userA.id);
  assert(loadedA.status === "ok", "Architect A can load Chapter VI");
  if (loadedA.status !== "ok") return;
  assert(loadedA.record.status === "in_progress", "Entering Chapter VI sets in_progress");
  assert(
    Object.values(loadedA.record.reflection.answers).every((value) => value === ""),
    "New reflection fields are blank",
  );
  assert(
    Object.values(loadedA.record.practice.answers).every((value) => value === ""),
    "New practice fields are blank",
  );
  assert(loadedA.record.commitment.affirmed === false, "New commitment is not affirmed");

  const saveReflection = await saveChapter6ReflectionForUser({
    userId: userA.id,
    answers: {
      q1: `${TOKEN_A} influenced people`,
      q2: `${TOKEN_A} needs an example`,
      q3: `${TOKEN_A} how people feel`,
      q4: `${TOKEN_A} gifts to share`,
      q5: `${TOKEN_A} daily generosity`,
      q6: `${TOKEN_A} legacy today`,
      q7: `${TOKEN_A} called to expand`,
    },
  });
  assert(saveReflection.status === "ok", "Reflection save");
  const savePractice = await saveChapter6PracticeForUser({
    userId: userA.id,
    answers: {
      yourself: `${TOKEN_A} grow myself`,
      someoneElse: `${TOKEN_A} encourage another`,
      world: `${TOKEN_A} contribute to the world`,
    },
  });
  assert(savePractice.status === "ok", "Practice save");
  const saveCommitment = await saveChapter6CommitmentForUser({
    userId: userA.id,
    affirmed: true,
    note: `${TOKEN_A} commitment note`,
  });
  assert(saveCommitment.status === "ok", "Commitment save");

  const reloadedA = await store.findChapter6ForUser(userA.id);
  assert(
    reloadedA?.practice.answers.yourself === `${TOKEN_A} grow myself`,
    "Save persists in store",
  );
  assert(reloadedA?.status !== "completed", "Chapter VI does not complete from saves alone");

  const loadedB = await loadChapter6ForUser(userB.id);
  assert(loadedB.status === "ok", "Architect B can load Chapter VI");
  if (loadedB.status !== "ok") return;
  assert(
    Object.values(loadedB.record.reflection.answers).every(
      (value) => !value.includes(TOKEN_A),
    ),
    "Architect B does not see Architect A reflection",
  );
  assert(
    Object.values(loadedB.record.practice.answers).every(
      (value) => !value.includes(TOKEN_A),
    ),
    "Architect B does not see Architect A practice",
  );

  await saveChapter6PracticeForUser({
    userId: userB.id,
    answers: {
      yourself: `${TOKEN_B} grow myself`,
      someoneElse: `${TOKEN_B} encourage another`,
      world: `${TOKEN_B} contribute to the world`,
    },
  });
  const afterB = await store.findChapter6ForUser(userA.id);
  assert(
    afterB?.practice.answers.yourself === `${TOKEN_A} grow myself`,
    "Architect A unchanged after B save",
  );

  const edited = await saveChapter6PracticeForUser({
    userId: userA.id,
    answers: {
      yourself: `${TOKEN_A_EDIT} grow myself`,
    },
  });
  assert(edited.status === "ok", "Edit save");
  const afterEdit = await store.findChapter6ForUser(userA.id);
  assert(
    afterEdit?.practice.answers.yourself === `${TOKEN_A_EDIT} grow myself`,
    "Edited answer persists",
  );
  assert(
    afterEdit?.practice.answers.someoneElse === `${TOKEN_A} encourage another`,
    "Unedited practice fields remain",
  );

  const responsesA = await loadArchitectGuidebookResponses(userA.id);
  const fillA = getExpansionPlanFill(responsesA);
  assert(
    fillA.yourself?.includes(TOKEN_A_EDIT),
    "Blueprint fill contains edited Expansion Plan",
  );
  assert(
    !fillA.yourself?.includes(TOKEN_B) &&
      !fillA.someoneElse?.includes(TOKEN_B) &&
      !fillA.world?.includes(TOKEN_B),
    "Blueprint fill has no Architect B data",
  );
  const responsesB = await loadArchitectGuidebookResponses(userB.id);
  const fillB = getExpansionPlanFill(responsesB);
  assert(
    !fillB.yourself?.includes(TOKEN_A) && !fillB.yourself?.includes(TOKEN_A_EDIT),
    "Architect B Blueprint fill has no Architect A data",
  );

  const chapter5After = await getChapter5Store().findChapter5ForUser(userA.id);
  assert(
    (chapter5After?.practice.statement ?? "") === chapter5Statement,
    "Chapter V personalization not corrupted by Chapter VI saves",
  );

  for (const section of [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
  ] as const) {
    const advanced = await advanceChapter6SectionForUser({
      userId: userA.id,
      sectionId: section,
    });
    assert(advanced.status === "ok", `Advance ${section}`);
  }
  const beforeComplete = await store.findChapter6ForUser(userA.id);
  assert(beforeComplete?.status !== "completed", "Closing advance does not complete the chapter");
  const completed = await advanceChapter6SectionForUser({
    userId: userA.id,
    sectionId: "complete",
  });
  assert(completed.status === "ok", "Mark complete");
  if (completed.status === "ok") {
    assert(completed.record.status === "completed", "Chapter VI status completed");
  }

  const progressA = await getJourneyProgressStore().findProgressForUser(userA.id);
  assert(
    progressA?.chapterId !== "chapter-7-beginning",
    "Chapter VII is not marked as the completed chapter",
  );

  const unauth = await fetch(`${ORIGIN}/api/architect/blueprint/expansion-plan`);
  assert(unauth.status === 401, `Unauthenticated download rejected (${unauth.status})`);

  let pdfBytes = 0;

  const cookieA = await cookieFor(userA.id);
  const cookieB = await cookieFor(userB.id);
  const htmlA = await fetch(`${ORIGIN}/architect/journey/chapter-6/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlA.status === 200, `Chapter VI welcome loads for A (${htmlA.status})`);
  const welcomeHtml = await htmlA.text();
  assert(!/ROW131|Row131|row131|E2E|fixture-architect/i.test(welcomeHtml), "Welcome HTML has no QA markers");
  assert(
    welcomeHtml.includes("Welcome back, Architect."),
    "Welcome uses Architect designation",
  );
  assert(
    !/Welcome back,\s+(Elena|Hart|Caleb|Moss)/i.test(welcomeHtml),
    "Welcome does not substitute a personal name",
  );
  assert(
    welcomeHtml.includes("/videos/chapter-6/chapter-6-expansion.mp4"),
    "EN welcome video wired",
  );

  for (const section of [
    "reflection",
    "practice",
    "commitment",
    "closing",
    "complete",
  ] as const) {
    const page = await fetch(`${ORIGIN}/architect/journey/chapter-6/${section}`, {
      headers: { cookie: cookieA },
      redirect: "manual",
    });
    assert(page.status === 200, `Chapter VI ${section} loads (${page.status})`);
  }

  const htmlEs = await fetch(`${ORIGIN}/es/architect/journey/chapter-6/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlEs.status === 200, `Spanish Chapter VI welcome loads (${htmlEs.status})`);
  const welcomeEs = await htmlEs.text();
  assert(
    !welcomeEs.includes("/videos/chapter-6/chapter-6-expansion.mp4"),
    "Spanish does not play English video",
  );
  assert(welcomeEs.includes("Capítulo VI — Expansión"), "Spanish chapter title");
  assert(
    welcomeEs.includes("Bienvenido/a de nuevo, Architect."),
    "Spanish welcome uses Architect",
  );

  const cross = await fetch(
    `${ORIGIN}/blueprint/print/artifacts/expansion-plan?architectId=${encodeURIComponent(userA.id)}`,
    { headers: { cookie: cookieB }, redirect: "manual" },
  );
  const crossHtml = await cross.text();
  assert(
    !crossHtml.includes(TOKEN_A_EDIT) && !crossHtml.includes(TOKEN_A),
    "Architect B cannot read Architect A print artifact via architectId",
  );

  const printA = await fetch(`${ORIGIN}/blueprint/print/artifacts/expansion-plan`, {
    headers: { cookie: cookieA },
  });
  assert(printA.status === 200, "Authenticated artifact print loads");
  const printHtml = await printA.text();
  assert(printHtml.includes(TOKEN_A_EDIT), "Artifact print contains edited Expansion Plan");
  assert(!printHtml.includes(TOKEN_B), "Artifact print has no Architect B data");

  const guidebook = await fetch(
    `${ORIGIN}/blueprint/print/guidebook?variant=print`,
    { headers: { cookie: cookieA } },
  );
  assert(guidebook.status === 200, "Authenticated guidebook print loads");
  const guidebookHtml = await guidebook.text();
  assert(guidebookHtml.includes(TOKEN_A_EDIT), "Guidebook contains edited Chapter VI Expansion Plan");
  if (chapter5Statement) {
    assert(
      guidebookHtml.includes(chapter5Statement) || guidebookHtml.includes("I am an Architect"),
      "Guidebook still contains Chapter V identity",
    );
  }

  const pdfA = await fetch(`${ORIGIN}/api/architect/blueprint/expansion-plan`, {
    headers: { cookie: cookieA },
  });
  const pdfType = pdfA.headers.get("content-type") || "";
  assert(pdfA.status === 200 && pdfType.includes("application/pdf"), `A PDF download (${pdfA.status} ${pdfType})`);
  const pdfBuffer = Buffer.from(await pdfA.arrayBuffer());
  assert(pdfBuffer.length > 80 && pdfBuffer.subarray(0, 4).toString() === "%PDF", "PDF is a real PDF");
  pdfBytes = pdfBuffer.length;

  const dashboard = await fetch(`${ORIGIN}/architect/dashboard`, {
    headers: { cookie: cookieA },
    redirect: "follow",
  });
  const dashHtml = await dashboard.text();
  assert(
    dashHtml.includes("/architect/journey/chapter-6/complete") ||
      dashHtml.includes("/architect/journey/chapter-6/welcome"),
    "Dashboard Continue points at Chapter VI",
  );

  const unauthPage = await fetch(`${ORIGIN}/architect/journey/chapter-6/welcome`, {
    redirect: "manual",
  });
  assert(
    unauthPage.status === 307 || unauthPage.status === 302 || unauthPage.status === 303,
    `Unauthenticated Chapter VI redirects to login (${unauthPage.status})`,
  );

  console.log(
    JSON.stringify(
      {
        status: "pass",
        architectA: userA.id,
        architectB: userB.id,
        pdfBytes,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
