/**
 * Local E2E seed for Row 87 + personalized Blueprint QA.
 * Creates/updates: row87.e2e@example.com / Row87E2E!pass
 * Grants journey_access, completes onboarding, seeds Chapter III answers.
 */
import { hashPassword } from "../lib/auth/password";
import { getAuthStore } from "../lib/auth/store";
import { getBillingStore } from "../lib/billing/store";
import { getChapter3Store } from "../lib/journey/chapters/chapter-3-store";
import {
  createEmptyChapter3Record,
  type Chapter3Record,
} from "../lib/journey/chapters/types";
import { getJourneyOnboardingStore } from "../lib/journey/onboarding/store";
import {
  ONBOARDING_STEPS,
  type OnboardingRecord,
} from "../lib/journey/onboarding/types";
const EMAIL = "row87.e2e@example.com";
const PASSWORD = "Row87E2E!pass";
const FIRST = "Row87";
const LAST = "E2E";

async function main() {
  const auth = getAuthStore();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(PASSWORD);

  let user = await auth.findUserByEmail(EMAIL);
  if (!user) {
    user = await auth.createUser({
      email: EMAIL,
      firstName: FIRST,
      lastName: LAST,
      passwordHash,
      authProvider: "email",
      googleId: undefined,
      arcCode: `ARC-R87-${Date.now().toString(36).toUpperCase()}`,
      emailVerified: true,
      locale: "en",
    });
    console.log("Created user", user.id);
  } else {
    await auth.updateUser(user.id, {
      passwordHash,
      emailVerified: true,
      firstName: FIRST,
      lastName: LAST,
    });
    user = (await auth.findUserByEmail(EMAIL))!;
    console.log("Updated user", user.id);
  }

  await getBillingStore().upsertEntitlement({
    userId: user.id,
    kind: "journey_access",
    status: "active",
    sourceOfferId: "bundle",
    grantedAt: now,
    startsAt: now,
  });
  console.log("Granted journey_access");

  const onboardingStore = getJourneyOnboardingStore();
  const onboarding: OnboardingRecord = {
    userId: user.id,
    status: "completed",
    currentStep: "completed",
    completedSteps: [...ONBOARDING_STEPS],
    welcomeCompletedAt: now,
    preferencesCompletedAt: now,
    consentCompletedAt: now,
    luminaCompletedAt: now,
    assessmentCompletedAt: now,
    awakeningEnteredAt: now,
    completedAt: now,
    assessment: {
      responses: {},
      completedAt: now,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
  await onboardingStore.saveOnboarding(onboarding);
  console.log("Onboarding completed");

  const marker = `ROW87-E2E-${Date.now()}`;
  const practiceStatement = `protect my peace and choose intention over expectation (${marker})`;
  const base = createEmptyChapter3Record(user.id);
  const record: Chapter3Record = {
    ...base,
    status: "in_progress",
    currentSectionId: "practice",
    completedSectionIds: ["welcome", "reflection"],
    reflection: {
      answers: {
        q1: `Postponed decision — ${marker}`,
        q2: `Fear making decisions — ${marker}`,
        q3: `Waiting instead of acting — ${marker}`,
        q4: `Future self encouragement — ${marker}`,
        q5: `No longer tolerate — ${marker}`,
        q6: `Person I choose to become — ${marker}`,
        q7: `Decision defining Back Half — ${marker}`,
      },
      completedAt: now,
      updatedAt: now,
    },
    practice: {
      statement: practiceStatement,
      completedAt: now,
      updatedAt: now,
    },
    commitment: {
      affirmed: true,
      note: `Weekly commitment note ${marker}`,
      completedAt: now,
      updatedAt: now,
    },
    updatedAt: now,
  };
  await getChapter3Store().saveChapter3(record);
  console.log("Chapter III seeded with marker", marker);

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password: PASSWORD,
        userId: user.id,
        marker,
        practiceStatement,
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
