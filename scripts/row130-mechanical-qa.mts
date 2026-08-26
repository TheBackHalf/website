/**
 * Row 130 mechanical checks: isolation, persistence, auth, Blueprint mapping.
 * Uses disposable Architect accounts. Does not seed production defaults.
 */
import { createSessionToken } from "../lib/auth/session";
import { AUTH_COOKIE_NAME } from "../lib/auth/config";
import { getAuthStore } from "../lib/auth/store";
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";
import { getArchitectIdentityFill } from "../lib/blueprint/architect-identity-fill";
import {
  advanceChapter5SectionForUser,
  loadChapter5ForUser,
  saveChapter5CommitmentForUser,
  saveChapter5PracticeForUser,
  saveChapter5ReflectionForUser,
} from "../lib/journey/chapters/chapter-5-service";
import { getChapter5Store } from "../lib/journey/chapters/chapter-5-store";
import { getChapter4Store } from "../lib/journey/chapters/chapter-4-store";
import { createEmptyChapter5Record } from "../lib/journey/chapters/types";

const ARCHITECT_A = {
  email: "elena.disp.a@example.com",
} as const;

const ARCHITECT_B = {
  email: "caleb.disp.b@example.com",
} as const;

const ORIGIN = process.env.ROW130_ORIGIN ?? "http://127.0.0.1:3000";
const TOKEN_A = "ELENA-IDENTITY-ALPHA";
const TOKEN_A_EDIT = "ELENA-IDENTITY-ALPHA-EDIT";
const TOKEN_B = "CALEB-IDENTITY-BRAVO";

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

  const store = getChapter5Store();
  await store.saveChapter5(createEmptyChapter5Record(userA.id));
  await store.saveChapter5(createEmptyChapter5Record(userB.id));

  const loadedA = await loadChapter5ForUser(userA.id);
  assert(loadedA.status === "ok", "Architect A can load Chapter V");
  if (loadedA.status !== "ok") return;
  assert(loadedA.record.status === "in_progress", "Entering Chapter V sets in_progress");
  assert(
    Object.values(loadedA.record.reflection.answers).every((value) => value === ""),
    "New reflection fields are blank",
  );
  assert(loadedA.record.practice.statement === "", "New practice field is blank");

  const chapter4A = await getChapter4Store().findChapter4ForUser(userA.id);
  assert(chapter4A?.status === "completed", "Chapter IV remains completed for Architect A");
  assert(
    chapter4A?.practice.answers.s1 === "I protect my peace.",
    "Chapter IV standards remain intact",
  );

  const saveReflection = await saveChapter5ReflectionForUser({
    userId: userA.id,
    answers: {
      q1: `${TOKEN_A} old identity`,
      q2: `${TOKEN_A} kind of Architect`,
      q3: `${TOKEN_A} approach challenges`,
      q4: `${TOKEN_A} daily habit`,
      q5: `${TOKEN_A} give away responsibility`,
      q6: `${TOKEN_A} what would change`,
      q7: `${TOKEN_A} I am an Architect who...`,
    },
  });
  assert(saveReflection.status === "ok", "Reflection save");
  const savePractice = await saveChapter5PracticeForUser({
    userId: userA.id,
    statement: `${TOKEN_A} creates a life of fullness`,
  });
  assert(savePractice.status === "ok", "Practice save");
  const saveCommitment = await saveChapter5CommitmentForUser({
    userId: userA.id,
    affirmed: true,
    note: `${TOKEN_A} commitment note`,
  });
  assert(saveCommitment.status === "ok", "Commitment save");

  const reloadedA = await store.findChapter5ForUser(userA.id);
  assert(
    reloadedA?.practice.statement === `${TOKEN_A} creates a life of fullness`,
    "Save persists in store",
  );
  assert(reloadedA?.status !== "completed", "Chapter V does not complete from saves alone");

  const loadedB = await loadChapter5ForUser(userB.id);
  assert(loadedB.status === "ok", "Architect B can load Chapter V");
  if (loadedB.status !== "ok") return;
  assert(
    Object.values(loadedB.record.reflection.answers).every((value) => !value.includes(TOKEN_A)),
    "Architect B does not see Architect A reflection",
  );
  assert(
    !loadedB.record.practice.statement.includes(TOKEN_A),
    "Architect B does not see Architect A practice",
  );

  await saveChapter5PracticeForUser({
    userId: userB.id,
    statement: `${TOKEN_B} creates a different life`,
  });
  const afterB = await store.findChapter5ForUser(userA.id);
  assert(
    afterB?.practice.statement === `${TOKEN_A} creates a life of fullness`,
    "Architect A unchanged after B save",
  );

  const edited = await saveChapter5PracticeForUser({
    userId: userA.id,
    statement: `${TOKEN_A_EDIT} creates a life of fullness`,
  });
  assert(edited.status === "ok", "Edit save");
  const afterEdit = await store.findChapter5ForUser(userA.id);
  assert(
    afterEdit?.practice.statement === `${TOKEN_A_EDIT} creates a life of fullness`,
    "Edited answer persists",
  );

  const responsesA = await loadArchitectGuidebookResponses(userA.id);
  const fillA = getArchitectIdentityFill(responsesA);
  assert(
    fillA.statement?.includes(TOKEN_A_EDIT),
    "Blueprint fill contains edited identity statement",
  );
  assert(
    !fillA.statement?.includes(TOKEN_B) && !fillA.commitment?.includes(TOKEN_B),
    "Blueprint fill has no Architect B data",
  );
  const responsesB = await loadArchitectGuidebookResponses(userB.id);
  const fillB = getArchitectIdentityFill(responsesB);
  assert(
    !fillB.statement?.includes(TOKEN_A) && !fillB.statement?.includes(TOKEN_A_EDIT),
    "Architect B Blueprint fill has no Architect A data",
  );

  const chapter4After = await getChapter4Store().findChapter4ForUser(userA.id);
  assert(
    chapter4After?.practice.answers.s1 === chapter4A?.practice.answers.s1,
    "Chapter IV personalization not corrupted by Chapter V saves",
  );

  for (const section of [
    "welcome",
    "reflection",
    "practice",
    "commitment",
    "closing",
  ] as const) {
    const advanced = await advanceChapter5SectionForUser({
      userId: userA.id,
      sectionId: section,
    });
    assert(advanced.status === "ok", `Advance ${section}`);
  }
  const beforeComplete = await store.findChapter5ForUser(userA.id);
  assert(beforeComplete?.status !== "completed", "Closing advance does not complete the chapter");
  const completed = await advanceChapter5SectionForUser({
    userId: userA.id,
    sectionId: "complete",
  });
  assert(completed.status === "ok", "Mark complete");
  if (completed.status === "ok") {
    assert(completed.record.status === "completed", "Chapter V status completed");
  }

  const unauth = await fetch(`${ORIGIN}/api/architect/blueprint/architect-identity`);
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
  const htmlA = await fetch(`${ORIGIN}/architect/journey/chapter-5/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlA.status === 200, `Chapter V welcome loads for A (${htmlA.status})`);
  const welcomeHtml = await htmlA.text();
  assert(!/ROW130|Row130|row130|E2E|fixture-architect/i.test(welcomeHtml), "Welcome HTML has no QA markers");
  assert(
    welcomeHtml.includes("Welcome back, Architect."),
    "Welcome uses Architect designation",
  );
  assert(
    !/Elena|Hart|Caleb|Moss/i.test(welcomeHtml),
    "Welcome has no personal name",
  );
  assert(
    welcomeHtml.includes("/videos/chapter-5/chapter-5-becoming-the-architect.mp4"),
    "EN welcome video wired",
  );

  for (const section of [
    "reflection",
    "practice",
    "commitment",
    "closing",
    "complete",
  ] as const) {
    const page = await fetch(`${ORIGIN}/architect/journey/chapter-5/${section}`, {
      headers: { cookie: cookieA },
      redirect: "manual",
    });
    assert(page.status === 200, `Chapter V ${section} loads (${page.status})`);
  }

  const htmlEs = await fetch(`${ORIGIN}/es/architect/journey/chapter-5/welcome`, {
    headers: { cookie: cookieA },
    redirect: "manual",
  });
  assert(htmlEs.status === 200, `Spanish Chapter V welcome loads (${htmlEs.status})`);
  const welcomeEs = await htmlEs.text();
  assert(
    !welcomeEs.includes("/videos/chapter-5/chapter-5-becoming-the-architect.mp4"),
    "Spanish does not play English video",
  );
  assert(welcomeEs.includes("Capítulo V — Convertirse en Architect"), "Spanish chapter title");

  const cross = await fetch(
    `${ORIGIN}/blueprint/print/artifacts/architect-identity-statement?architectId=${encodeURIComponent(userA.id)}`,
    { headers: { cookie: cookieB }, redirect: "manual" },
  );
  const crossHtml = await cross.text();
  assert(
    !crossHtml.includes(TOKEN_A_EDIT) && !crossHtml.includes(TOKEN_A),
    "Architect B cannot read Architect A print artifact via architectId",
  );

  const printA = await fetch(`${ORIGIN}/blueprint/print/artifacts/architect-identity-statement`, {
    headers: { cookie: cookieA },
  });
  assert(printA.status === 200, "Authenticated artifact print loads");
  const printHtml = await printA.text();
  assert(printHtml.includes(TOKEN_A_EDIT), "Artifact print contains edited identity statement");
  assert(!printHtml.includes(TOKEN_B), "Artifact print has no Architect B data");

  const guidebook = await fetch(
    `${ORIGIN}/blueprint/print/guidebook?variant=print`,
    { headers: { cookie: cookieA } },
  );
  assert(guidebook.status === 200, "Authenticated guidebook print loads");
  const guidebookHtml = await guidebook.text();
  assert(guidebookHtml.includes(TOKEN_A_EDIT), "Guidebook contains edited Chapter V identity");
  assert(
    guidebookHtml.includes("I protect my peace."),
    "Guidebook still contains Chapter IV standards",
  );

  const pdfA = await fetch(`${ORIGIN}/api/architect/blueprint/architect-identity`, {
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
    dashHtml.includes("/architect/journey/chapter-5/complete") ||
      dashHtml.includes("/architect/journey/chapter-5/welcome"),
    "Dashboard Continue points at Chapter V",
  );

  const unauthPage = await fetch(`${ORIGIN}/architect/journey/chapter-5/welcome`, {
    redirect: "manual",
  });
  assert(
    unauthPage.status === 307 || unauthPage.status === 302 || unauthPage.status === 303,
    `Unauthenticated Chapter V redirects to login (${unauthPage.status})`,
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
