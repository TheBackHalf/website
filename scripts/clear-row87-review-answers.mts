/**
 * Clears QA/E2E Chapter III exercise answers for the Row 87 Founder review account.
 * Does not disable persistence and does not touch other Architects' records.
 */
import { getAuthStore } from "../lib/auth/store";
import { getChapter3Store } from "../lib/journey/chapters/chapter-3-store";
import {
  createEmptyChapter3Record,
  emptyDecisionReflectionAnswers,
  type Chapter3Record,
} from "../lib/journey/chapters/types";

const REVIEW_EMAIL = "row87.e2e@example.com";
const REVIEW_USER_ID = "3026ebd7-afdf-4a9a-bdfc-d0377fb1c5d1";

async function main() {
  const auth = getAuthStore();
  const user =
    (await auth.findUserByEmail(REVIEW_EMAIL)) ??
    (await auth.findUserById(REVIEW_USER_ID));
  if (!user) {
    throw new Error(`Review account not found: ${REVIEW_EMAIL}`);
  }

  const store = getChapter3Store();
  const existing = await store.findChapter3ForUser(user.id);
  const now = new Date().toISOString();
  const base = existing ?? createEmptyChapter3Record(user.id, now);

  const cleared: Chapter3Record = {
    ...base,
    status: "in_progress",
    currentSectionId: "welcome",
    // Keep section progress history for navigation/review; clear exercise text only.
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
      affirmed: base.commitment.affirmed,
      note: "",
      updatedAt: now,
      completedAt: base.commitment.affirmed ? base.commitment.completedAt : null,
    },
    updatedAt: now,
  };

  // Remove completed flags for exercise sections so blank state matches incomplete work.
  cleared.completedSectionIds = cleared.completedSectionIds.filter(
    (id) => id !== "reflection" && id !== "practice",
  );

  await store.saveChapter3(cleared);

  const verify = await store.findChapter3ForUser(user.id);
  const answers = verify?.reflection.answers ?? {};
  const filled = Object.values(answers).filter((v) => String(v).trim()).length;
  console.log(
    JSON.stringify(
      {
        userId: user.id,
        email: user.email,
        reflectionFilled: filled,
        practice: verify?.practice.statement ?? "",
        commitmentNote: verify?.commitment.note ?? "",
        affirmed: verify?.commitment.affirmed ?? false,
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
