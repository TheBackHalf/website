/**
 * Row 132 mechanical checks: isolation, persistence, Journey completion, Blueprint mapping.
 * Uses disposable Architect accounts. Does not seed production defaults.
 */
import { createSessionToken } from "../lib/auth/session";
import { AUTH_COOKIE_NAME } from "../lib/auth/config";
import { getAuthStore } from "../lib/auth/store";
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";
import { getBackHalfDeclarationFill } from "../lib/blueprint/declaration-fill";
import { getExpansionPlanFill } from "../lib/blueprint/expansion-plan-fill";
import { buildArchitectContinueActionWithChapter } from "../lib/dashboard/architect-dashboard";
import {
  advanceChapter7SectionForUser,
  loadChapter7ForUser,
  saveChapter7CommitmentForUser,
  saveChapter7PracticeForUser,
  saveChapter7ReflectionForUser,
} from "../lib/journey/chapters/chapter-7-service";
import { getChapter7Store } from "../lib/journey/chapters/chapter-7-store";
import { getChapter6Store } from "../lib/journey/chapters/chapter-6-store";
import { createEmptyChapter7Record } from "../lib/journey/chapters/types";
import { getJourneyProgressStore } from "../lib/journey/progress";

const ARCHITECT_A = {
  email: "elena.disp.a@example.com",
} as const;

const ARCHITECT_B = {
  email: "caleb.disp.b@example.com",
} as const;

const ORIGIN = process.env.ROW132_ORIGIN ?? "http://127.0.0.1:3000";
const TOKEN_A = "ELENA-BEGINNING-ALPHA";
const TOKEN_A_EDIT = "ELENA-BEGINNING-ALPHA-EDIT";
const TOKEN_B = "CALEB-BEGINNING-BRAVO";

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

async function resetQaChapter7(userAId: string, userBId: string) {
  const store = getChapter7Store();
  await store.saveChapter7(createEmptyChapter7Record(userAId));
  await store.saveChapter7(createEmptyChapter7Record(userBId));
  await getJourneyProgressStore().upsertProgress({
    userId: userAId,
    chapterId: "chapter-6-expansion",
    status: "stage_completed",
  });
  await getJourneyProgressStore().upsertProgress({
    userId: userBId,
    chapterId: "chapter-6-expansion",
    status: "in_progress",
  });
}

async function main() {
  const auth = getAuthStore();
  const userA = await auth.findUserByEmail(ARCHITECT_A.email);
  const userB = await auth.findUserByEmail(ARCHITECT_B.email);
  if (!userA || !userB) fail("Seed accounts first: npx tsx scripts/seed-row130-qa.mts");

  const store = getChapter7Store();
  await store.saveChapter7(createEmptyChapter7Record(userA.id));
  await store.saveChapter7(createEmptyChapter7Record(userB.id));

  const chapter6A = await getChapter6Store().findChapter6ForUser(userA.id);
  assert(chapter6A?.status === "completed", "Chapter VI remains completed for Architect A");
  const chapter6Practice = chapter6A?.practice.answers.yourself ?? "";

  const premature = await advanceChapter7SectionForUser({
    userId: userA.id,
    sectionId: "complete",
  });
  assert(premature.status === "incomplete_work", "Chapter VII cannot complete prematurely");

  const loadedA = await loadChapter7ForUser(userA.id);
  assert(loadedA.status === "ok", "Architect A can load Chapter VII");
  if (loadedA.status !== "ok") return;
  assert(loadedA.record.status === "in_progress", "Entering Chapter VII sets in_progress");
  assert(
    Object.values(loadedA.record.reflection.answers).every((value) => value === ""),
    "New reflection fields are blank",
  );
  assert(loadedA.record.practice.statement === "", "New declaration statement is blank");
  assert(loadedA.record.practice.signature === "", "New signature is blank");
  assert(loadedA.record.practice.signedDate === "", "New signed date is blank");
  assert(loadedA.record.commitment.affirmed === false, "New commitment is not affirmed");

  const saveReflection = await saveChapter7ReflectionForUser({
    userId: userA.id,
    answers: {
      q1: `${TOKEN_A} inner change`,
      q2: `${TOKEN_A} lesson to carry`,
      q3: `${TOKEN_A} continuing standards`,
      q4: `${TOKEN_A} protect the life`,
      q5: `${TOKEN_A} dream to pursue`,
      q6: `${TOKEN_A} future thanks`,
      q7: `${TOKEN_A} begins with intention`,
    },
  });
  assert(saveReflection.status === "ok", "Reflection save");
  const savePractice = await saveChapter7PracticeForUser({
    userId: userA.id,
    statement: `${TOKEN_A} honors truth daily`,
    signature: `${TOKEN_A} signature`,
    signedDate: "2026-08-17",
  });
  assert(savePractice.status === "ok", "Practice save");
  const saveCommitment = await saveChapter7CommitmentForUser({
    userId: userA.id,
    affirmed: true,
    note: `${TOKEN_A} commitment note`,
  });
  assert(saveCommitment.status === "ok", "Commitment save");

  const reloadedA = await store.findChapter7ForUser(userA.id);
  assert(
    reloadedA?.practice.statement === `${TOKEN_A} honors truth daily`,
    "Save persists in store",
  );
  assert(reloadedA?.status !== "completed", "Chapter VII does not complete from saves alone");

  const loadedB = await loadChapter7ForUser(userB.id);
  assert(loadedB.status === "ok", "Architect B can load Chapter VII");
  if (loadedB.status !== "ok") return;
  assert(
    Object.values(loadedB.record.reflection.answers).every(
      (value) => !value.includes(TOKEN_A),
    ),
    "Architect B does not see Architect A reflection",
  );
  assert(
    !loadedB.record.practice.statement.includes(TOKEN_A),
    "Architect B does not see Architect A declaration",
  );
  assert(
    loadedB.record.status !== "completed",
    "Architect B does not inherit Architect A completion",
  );

  await saveChapter7PracticeForUser({
    userId: userB.id,
    statement: `${TOKEN_B} honors truth daily`,
    signature: `${TOKEN_B} signature`,
    signedDate: "2026-08-17",
  });
  const afterB = await store.findChapter7ForUser(userA.id);
  assert(
    afterB?.practice.statement === `${TOKEN_A} honors truth daily`,
    "Architect A unchanged after B save",
  );

  const edited = await saveChapter7PracticeForUser({
    userId: userA.id,
    statement: `${TOKEN_A_EDIT} honors truth daily`,
  });
  assert(edited.status === "ok", "Edit save");
  const afterEdit = await store.findChapter7ForUser(userA.id);
  assert(
    afterEdit?.practice.statement === `${TOKEN_A_EDIT} honors truth daily`,
    "Edited declaration persists",
  );
  assert(
    afterEdit?.practice.signature === `${TOKEN_A} signature`,
    "Unedited signature remains",
  );

  const relogin = await loadChapter7ForUser(userA.id);
  assert(relogin.status === "ok", "Logout/login load");
  if (relogin.status === "ok") {
    assert(
      relogin.record.practice.statement === `${TOKEN_A_EDIT} honors truth daily`,
      "Logout/login preserves edited declaration",
    );
  }

  const responsesA = await loadArchitectGuidebookResponses(userA.id);
  const fillA = getBackHalfDeclarationFill(responsesA);
  assert(
    fillA.statement?.includes(TOKEN_A_EDIT),
    "Blueprint fill contains edited Declaration",
  );
  assert(
    !fillA.statement?.includes(TOKEN_B) && !fillA.signature?.includes(TOKEN_B),
    "Blueprint fill has no Architect B data",
  );
  const expansionA = getExpansionPlanFill(responsesA);
  if (chapter6Practice) {
    assert(
      expansionA.yourself?.includes(chapter6Practice) ||
        Boolean(expansionA.yourself),
      "Chapter VI Expansion Plan remains in Blueprint",
    );
  }
  const responsesB = await loadArchitectGuidebookResponses(userB.id);
  const fillB = getBackHalfDeclarationFill(responsesB);
  assert(
    !fillB.statement?.includes(TOKEN_A) &&
      !fillB.statement?.includes(TOKEN_A_EDIT),
    "Architect B Blueprint fill has no Architect A data",
  );

  const chapter6After = await getChapter6Store().findChapter6ForUser(userA.id);
  assert(
    chapter6After?.status === "completed",
    "Chapter VI completion remains intact",
  );

  for (const section of [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
  ] as const) {
    const advanced = await advanceChapter7SectionForUser({
      userId: userA.id,
      sectionId: section,
    });
    assert(advanced.status === "ok", `Advance ${section}`);
  }
  const beforeComplete = await store.findChapter7ForUser(userA.id);
  assert(
    beforeComplete?.status !== "completed",
    "Closing advance does not complete the chapter",
  );
  const completed = await advanceChapter7SectionForUser({
    userId: userA.id,
    sectionId: "complete",
  });
  assert(completed.status === "ok", "Mark complete");
  if (completed.status === "ok") {
    assert(completed.record.status === "completed", "Chapter VII status completed");
  }

  const progressA = await getJourneyProgressStore().findProgressForUser(userA.id);
  assert(
    progressA?.status === "journey_completed",
    `Journey completion stored (${progressA?.status ?? "none"})`,
  );
  assert(
    progressA?.chapterId === "chapter-7-beginning",
    "Progress pointer is Chapter VII",
  );

  const continueAfter = await buildArchitectContinueActionWithChapter(
    true,
    "en",
    {
      onboardingComplete: true,
      userId: userA.id,
    },
  );
  assert(
    continueAfter.href.includes("/architect/journey/chapter-7/complete"),
    `Continue after completion points at Chapter VII complete (${continueAfter.href})`,
  );

  const unauth = await fetch(`${ORIGIN}/api/architect/blueprint/declaration`);
  assert(unauth.status === 401, `Unauthenticated declaration rejected (${unauth.status})`);
  const unauthCert = await fetch(`${ORIGIN}/api/architect/blueprint/certificate`);
  assert(
    unauthCert.status === 401,
    `Unauthenticated certificate rejected (${unauthCert.status})`,
  );

  let pdfBytes = 0;
  let certBytes = 0;

  const cookieA = await cookieFor(userA.id);
  const cookieB = await cookieFor(userB.id);
  const htmlA = await fetch(`${ORIGIN}/architect/journey/chapter-7/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlA.status === 200, `Chapter VII welcome loads for A (${htmlA.status})`);
  const welcomeHtml = await htmlA.text();
  assert(
    !/ROW132|Row132|row132|E2E|fixture-architect/i.test(welcomeHtml),
    "Welcome HTML has no QA markers",
  );
  assert(
    welcomeHtml.includes("Welcome back, Architect."),
    "Welcome uses Architect designation",
  );
  assert(
    !/Welcome back,\s+(Elena|Hart|Caleb|Moss)/i.test(welcomeHtml),
    "Welcome does not substitute a personal name",
  );
  assert(
    welcomeHtml.includes("/videos/chapter-7/chapter-7-beginning.mp4"),
    "English welcome wires Chapter VII video",
  );

  for (const section of [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
    "complete",
  ] as const) {
    const page = await fetch(`${ORIGIN}/architect/journey/chapter-7/${section}`, {
      headers: { cookie: cookieA },
      redirect: "manual",
    });
    assert(page.status === 200, `Chapter VII ${section} loads (${page.status})`);
  }

  const completeHtmlRes = await fetch(
    `${ORIGIN}/architect/journey/chapter-7/complete`,
    { headers: { cookie: cookieA }, redirect: "manual" },
  );
  const completeHtml = await completeHtmlRes.text();
  assert(
    completeHtml.includes("/videos/chapter-7/chapter-7-journey-completion.mp4"),
    "Completed Chapter VII wires Journey Completion video",
  );

  const htmlEs = await fetch(`${ORIGIN}/es/architect/journey/chapter-7/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlEs.status === 200, `Spanish Chapter VII welcome loads (${htmlEs.status})`);
  const welcomeEs = await htmlEs.text();
  assert(
    !welcomeEs.includes("/videos/chapter-7/chapter-7-beginning.mp4"),
    "Spanish does not play English video",
  );
  assert(welcomeEs.includes("Capítulo VII — El Comienzo"), "Spanish chapter title");
  assert(
    welcomeEs.includes("Bienvenido/a de nuevo, Architect."),
    "Spanish welcome uses Architect",
  );

  const cross = await fetch(
    `${ORIGIN}/blueprint/print/artifacts/back-half-declaration?architectId=${encodeURIComponent(userA.id)}`,
    { headers: { cookie: cookieB }, redirect: "manual" },
  );
  const crossHtml = await cross.text();
  assert(
    !crossHtml.includes(TOKEN_A_EDIT) && !crossHtml.includes(TOKEN_A),
    "Architect B cannot read Architect A print artifact via architectId",
  );

  const printA = await fetch(
    `${ORIGIN}/blueprint/print/artifacts/back-half-declaration`,
    { headers: { cookie: cookieA } },
  );
  assert(printA.status === 200, "Authenticated artifact print loads");
  const printHtml = await printA.text();
  assert(
    printHtml.includes(TOKEN_A_EDIT),
    "Artifact print contains edited Declaration",
  );
  assert(!printHtml.includes(TOKEN_B), "Artifact print has no Architect B data");

  const guidebook = await fetch(
    `${ORIGIN}/blueprint/print/guidebook?variant=print`,
    { headers: { cookie: cookieA } },
  );
  assert(guidebook.status === 200, "Authenticated guidebook print loads");
  const guidebookHtml = await guidebook.text();
  assert(
    guidebookHtml.includes(TOKEN_A_EDIT),
    "Guidebook contains edited Chapter VII Declaration",
  );
  if (chapter6Practice) {
    assert(
      guidebookHtml.includes(chapter6Practice) ||
        guidebookHtml.includes("I Will Continue Growing"),
      "Guidebook still contains Chapter VI Expansion Plan",
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const pdfA = await fetch(`${ORIGIN}/api/architect/blueprint/declaration`, {
    headers: { cookie: cookieA },
  });
  const pdfType = pdfA.headers.get("content-type") || "";
  assert(
    pdfA.status === 200 && pdfType.includes("application/pdf"),
    `A declaration PDF download (${pdfA.status} ${pdfType})`,
  );
  const pdfBuffer = Buffer.from(await pdfA.arrayBuffer());
  assert(
    pdfBuffer.length > 80 && pdfBuffer.subarray(0, 4).toString() === "%PDF",
    "Declaration PDF is a real PDF",
  );
  pdfBytes = pdfBuffer.length;

  const certA = await fetch(`${ORIGIN}/api/architect/blueprint/certificate`, {
    headers: { cookie: cookieA },
  });
  const certType = certA.headers.get("content-type") || "";
  assert(
    certA.status === 200 && certType.includes("application/pdf"),
    `A certificate PDF download (${certA.status} ${certType})`,
  );
  const certBuffer = Buffer.from(await certA.arrayBuffer());
  assert(
    certBuffer.length > 80 && certBuffer.subarray(0, 4).toString() === "%PDF",
    "Certificate PDF is a real PDF",
  );
  certBytes = certBuffer.length;

  const certB = await fetch(`${ORIGIN}/api/architect/blueprint/certificate`, {
    headers: { cookie: cookieB },
  });
  assert(
    certB.status === 403 || certB.status === 401,
    `Architect B cannot download A's certificate (${certB.status})`,
  );

  const dashboard = await fetch(`${ORIGIN}/architect/dashboard`, {
    headers: { cookie: cookieA },
    redirect: "follow",
  });
  const dashHtml = await dashboard.text();
  assert(
    dashHtml.includes("/architect/journey/chapter-7/complete") ||
      dashHtml.toLowerCase().includes("journey completed"),
    "Dashboard reflects Journey completion / Chapter VII complete",
  );

  const unauthPage = await fetch(`${ORIGIN}/architect/journey/chapter-7/welcome`, {
    redirect: "manual",
  });
  assert(
    unauthPage.status === 307 || unauthPage.status === 302 || unauthPage.status === 303,
    `Unauthenticated Chapter VII redirects to login (${unauthPage.status})`,
  );

  await resetQaChapter7(userA.id, userB.id);

  console.log(
    JSON.stringify(
      {
        status: "pass",
        architectA: userA.id,
        architectB: userB.id,
        pdfBytes,
        certBytes,
        resetAfterQa: true,
      },
      null,
      2,
    ),
  );
}

main().catch(async (error) => {
  console.error(error);
  try {
    const auth = getAuthStore();
    const userA = await auth.findUserByEmail(ARCHITECT_A.email);
    const userB = await auth.findUserByEmail(ARCHITECT_B.email);
    if (userA && userB) {
      await resetQaChapter7(userA.id, userB.id);
    }
  } catch (resetError) {
    console.error(resetError);
  }
  process.exit(1);
});
