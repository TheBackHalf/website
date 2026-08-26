/**
 * Row 129 mechanical checks: isolation, persistence, auth, Blueprint mapping.
 * Uses disposable Architect accounts. Does not seed production defaults.
 */
import { createSessionToken } from "../lib/auth/session";
import { AUTH_COOKIE_NAME } from "../lib/auth/config";
import { getAuthStore } from "../lib/auth/store";
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";
import { getBackHalfStandardsFill } from "../lib/blueprint/back-half-standards-fill";
import {
  advanceChapter4SectionForUser,
  loadChapter4ForUser,
  saveChapter4CommitmentForUser,
  saveChapter4PracticeForUser,
  saveChapter4ReflectionForUser,
} from "../lib/journey/chapters/chapter-4-service";
import { getChapter4Store } from "../lib/journey/chapters/chapter-4-store";
import { getChapter3Store } from "../lib/journey/chapters/chapter-3-store";
import { createEmptyChapter4Record } from "../lib/journey/chapters/types";
import { ARCHITECT_A, ARCHITECT_B } from "./seed-row129-qa.mts";

const ORIGIN = process.env.ROW129_ORIGIN ?? "http://127.0.0.1:3000";
const TOKEN_A = "MAYA-STANDARDS-ALPHA";
const TOKEN_A_EDIT = "MAYA-STANDARDS-ALPHA-EDIT";
const TOKEN_B = "NOAH-STANDARDS-BRAVO";

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
  if (!userA || !userB) fail("Seed accounts first: npx tsx scripts/seed-row129-qa.mts");

  const store = getChapter4Store();
  await store.saveChapter4(createEmptyChapter4Record(userA.id));
  await store.saveChapter4(createEmptyChapter4Record(userB.id));

  const loadedA = await loadChapter4ForUser(userA.id);
  assert(loadedA.status === "ok", "Architect A can load Chapter IV");
  if (loadedA.status !== "ok") return;
  assert(loadedA.record.status === "in_progress", "Entering Chapter IV sets in_progress");
  assert(
    Object.values(loadedA.record.reflection.answers).every((value) => value === ""),
    "New reflection fields are blank",
  );
  assert(
    Object.values(loadedA.record.practice.answers).every((value) => value === ""),
    "New practice fields are blank",
  );

  const chapter3A = await getChapter3Store().findChapter3ForUser(userA.id);
  assert(chapter3A?.status === "completed", "Chapter III remains completed for Architect A");
  assert(
    chapter3A?.practice.statement.includes("intention over expectation"),
    "Chapter III Decision Statement remains intact",
  );

  const saveReflection = await saveChapter4ReflectionForUser({
    userId: userA.id,
    answers: {
      q1: `${TOKEN_A} quiet standards`,
      q2: `${TOKEN_A} no longer serve`,
      q3: `${TOKEN_A} area to rise`,
      q4: `${TOKEN_A} not acceptable`,
      q5: `${TOKEN_A} ordinary Tuesday`,
      q6: `${TOKEN_A} greatest impact`,
      q7: `${TOKEN_A} life possible`,
    },
  });
  assert(saveReflection.status === "ok", "Reflection save");
  const savePractice = await saveChapter4PracticeForUser({
    userId: userA.id,
    answers: {
      s1: `${TOKEN_A} standard one`,
      s2: `${TOKEN_A} standard two`,
      s3: `${TOKEN_A} standard three`,
      s4: `${TOKEN_A} standard four`,
      s5: `${TOKEN_A} standard five`,
    },
  });
  assert(savePractice.status === "ok", "Practice save");
  const saveCommitment = await saveChapter4CommitmentForUser({
    userId: userA.id,
    affirmed: true,
    note: `${TOKEN_A} commitment note`,
  });
  assert(saveCommitment.status === "ok", "Commitment save");

  const reloadedA = await store.findChapter4ForUser(userA.id);
  assert(reloadedA?.practice.answers.s1 === `${TOKEN_A} standard one`, "Save persists in store");
  assert(reloadedA?.status !== "completed", "Chapter IV does not complete from saves alone");

  const loadedB = await loadChapter4ForUser(userB.id);
  assert(loadedB.status === "ok", "Architect B can load Chapter IV");
  if (loadedB.status !== "ok") return;
  assert(
    Object.values(loadedB.record.reflection.answers).every((value) => !value.includes(TOKEN_A)),
    "Architect B does not see Architect A reflection",
  );
  assert(
    Object.values(loadedB.record.practice.answers).every((value) => !value.includes(TOKEN_A)),
    "Architect B does not see Architect A practice",
  );

  await saveChapter4PracticeForUser({
    userId: userB.id,
    answers: { s1: `${TOKEN_B} standard one` },
  });
  const afterB = await store.findChapter4ForUser(userA.id);
  assert(afterB?.practice.answers.s1 === `${TOKEN_A} standard one`, "Architect A unchanged after B save");

  const edited = await saveChapter4PracticeForUser({
    userId: userA.id,
    answers: { s1: `${TOKEN_A_EDIT} standard one` },
  });
  assert(edited.status === "ok", "Edit save");
  const afterEdit = await store.findChapter4ForUser(userA.id);
  assert(afterEdit?.practice.answers.s1 === `${TOKEN_A_EDIT} standard one`, "Edited answer persists");

  const responsesA = await loadArchitectGuidebookResponses(userA.id);
  const fillA = getBackHalfStandardsFill(responsesA);
  assert(
    fillA.standards.some((line) => line.includes(TOKEN_A_EDIT)),
    "Blueprint fill contains edited Standard One",
  );
  assert(
    fillA.standards.every((line) => !line.includes(TOKEN_B)),
    "Blueprint fill has no Architect B data",
  );
  const responsesB = await loadArchitectGuidebookResponses(userB.id);
  const fillB = getBackHalfStandardsFill(responsesB);
  assert(
    fillB.standards.every((line) => !line.includes(TOKEN_A) && !line.includes(TOKEN_A_EDIT)),
    "Architect B Blueprint fill has no Architect A data",
  );

  const chapter3After = await getChapter3Store().findChapter3ForUser(userA.id);
  assert(
    chapter3After?.practice.statement === chapter3A?.practice.statement,
    "Chapter III personalization not corrupted by Chapter IV saves",
  );

  for (const section of ["welcome", "reflection", "practice", "commitment", "closing"] as const) {
    const advanced = await advanceChapter4SectionForUser({
      userId: userA.id,
      sectionId: section,
    });
    assert(advanced.status === "ok", `Advance ${section}`);
  }
  const beforeComplete = await store.findChapter4ForUser(userA.id);
  assert(beforeComplete?.status !== "completed", "Closing advance does not complete the chapter");
  const completed = await advanceChapter4SectionForUser({
    userId: userA.id,
    sectionId: "complete",
  });
  assert(completed.status === "ok", "Mark complete");
  if (completed.status === "ok") {
    assert(completed.record.status === "completed", "Chapter IV status completed");
  }

  const unauth = await fetch(`${ORIGIN}/api/architect/blueprint/back-half-standards`);
  assert(unauth.status === 401, `Unauthenticated download rejected (${unauth.status})`);

  let pdfBytes = 0;
  if (!process.env.AUTH_SECRET) {
    console.log(
      JSON.stringify(
        {
          status: "pass",
          http: "store-and-unauth-only",
          architectA: userA.id,
          architectB: userB.id,
        },
        null,
        2,
      ),
    );
    return;
  }

  const cookieA = await cookieFor(userA.id);
  const cookieB = await cookieFor(userB.id);
  const htmlA = await fetch(`${ORIGIN}/architect/journey/chapter-4/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlA.status === 200, `Chapter IV welcome loads for A (${htmlA.status})`);
  const welcomeHtml = await htmlA.text();
  assert(!/ROW129|ROW128|E2E|fixture-standards/i.test(welcomeHtml), "Welcome HTML has no QA markers");
  assert(
    welcomeHtml.includes("Welcome back, Maya"),
    "Welcome personalizes Architect A first name",
  );
  assert(welcomeHtml.includes("/videos/chapter-4/chapter-4-creating-your-standards.mp4"), "EN welcome video wired");

  const htmlEs = await fetch(`${ORIGIN}/es/architect/journey/chapter-4/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlEs.status === 200, `Spanish Chapter IV welcome loads (${htmlEs.status})`);
  const welcomeEs = await htmlEs.text();
  assert(!welcomeEs.includes("/videos/chapter-4/chapter-4-creating-your-standards.mp4"), "Spanish does not play English video");
  assert(welcomeEs.includes("Capítulo IV — Los Estándares"), "Spanish chapter title");

  const cross = await fetch(
    `${ORIGIN}/blueprint/print/artifacts/back-half-standards?architectId=${encodeURIComponent(userA.id)}`,
    { headers: { cookie: cookieB }, redirect: "manual" },
  );
  const crossHtml = await cross.text();
  assert(
    !crossHtml.includes(TOKEN_A_EDIT) && !crossHtml.includes(TOKEN_A),
    "Architect B cannot read Architect A print artifact via architectId",
  );

  const printA = await fetch(`${ORIGIN}/blueprint/print/artifacts/back-half-standards`, {
    headers: { cookie: cookieA },
  });
  assert(printA.status === 200, "Authenticated artifact print loads");
  const printHtml = await printA.text();
  assert(printHtml.includes(TOKEN_A_EDIT), "Artifact print contains edited Standard One");
  assert(!printHtml.includes(TOKEN_B), "Artifact print has no Architect B data");

  const guidebook = await fetch(
    `${ORIGIN}/blueprint/print/guidebook?variant=print`,
    { headers: { cookie: cookieA } },
  );
  assert(guidebook.status === 200, "Authenticated guidebook print loads");
  const guidebookHtml = await guidebook.text();
  assert(guidebookHtml.includes(TOKEN_A_EDIT), "Guidebook contains edited Chapter IV standard");
  assert(
    guidebookHtml.includes("protect my peace and choose intention over expectation"),
    "Guidebook still contains Chapter III Decision Statement",
  );

  const pdfA = await fetch(`${ORIGIN}/api/architect/blueprint/back-half-standards`, {
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
    dashHtml.includes("/architect/journey/chapter-4/complete") ||
      dashHtml.includes("/architect/journey/chapter-4/welcome"),
    "Dashboard Continue points at Chapter IV",
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
