/**
 * Disposable Architect QA accounts for Row 129 mechanical tests.
 * Does not seed Chapter IV answers — participant fields stay blank.
 * First names are ordinary so greeting personalization can be verified
 * without leaking Row129/E2E/QA labels into the experience.
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

export const ARCHITECT_A = {
  email: "maya.disp.a@example.com",
  password: "DispA-Pass129!",
  firstName: "Maya",
  lastName: "Rivera",
} as const;

export const ARCHITECT_B = {
  email: "noah.disp.b@example.com",
  password: "DispB-Pass129!",
  firstName: "Noah",
  lastName: "Bennett",
} as const;

async function upsertArchitect(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  completeChapter3: boolean;
}) {
  const auth = getAuthStore();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(input.password);

  let user = await auth.findUserByEmail(input.email);
  if (!user) {
    user = await auth.createUser({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      authProvider: "email",
      googleId: undefined,
      arcCode: `ARC-D129-${Date.now().toString(36).toUpperCase()}`,
      emailVerified: true,
      locale: "en",
    });
  } else {
    await auth.updateUser(user.id, {
      passwordHash,
      emailVerified: true,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    user = (await auth.findUserByEmail(input.email))!;
  }

  await getBillingStore().upsertEntitlement({
    userId: user.id,
    kind: "journey_access",
    status: "active",
    sourceOfferId: "bundle",
    grantedAt: now,
    startsAt: now,
  });

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
  await getJourneyOnboardingStore().saveOnboarding(onboarding);

  if (input.completeChapter3) {
    const base = createEmptyChapter3Record(user.id);
    const record: Chapter3Record = {
      ...base,
      status: "completed",
      currentSectionId: "complete",
      completedSectionIds: [
        "welcome",
        "reflection",
        "practice",
        "commitment",
        "closing",
        "complete",
      ],
      reflection: {
        answers: {
          q1: "Ch III preserved decision A",
          q2: "Ch III preserved fear A",
          q3: "Ch III preserved waiting A",
          q4: "Ch III preserved future A",
          q5: "Ch III preserved tolerate A",
          q6: "Ch III preserved person A",
          q7: "Ch III preserved defining A",
        },
        completedAt: now,
        updatedAt: now,
      },
      practice: {
        statement: "protect my peace and choose intention over expectation",
        completedAt: now,
        updatedAt: now,
      },
      commitment: {
        affirmed: true,
        note: "Chapter III weekly note remains",
        completedAt: now,
        updatedAt: now,
      },
      completedAt: now,
      updatedAt: now,
    };
    await getChapter3Store().saveChapter3(record);
  }

  return user;
}

async function main() {
  const a = await upsertArchitect({ ...ARCHITECT_A, completeChapter3: true });
  const b = await upsertArchitect({ ...ARCHITECT_B, completeChapter3: false });
  console.log(
    JSON.stringify(
      {
        architectA: { id: a.id, email: ARCHITECT_A.email },
        architectB: { id: b.id, email: ARCHITECT_B.email },
      },
      null,
      2,
    ),
  );
}

const executedDirectly = process.argv[1]?.includes("seed-row129-qa");
if (executedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
