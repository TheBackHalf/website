/**
 * Disposable Architect QA accounts for Row 130 mechanical tests.
 * Does not seed Chapter V answers — participant fields stay blank.
 * First names are ordinary so greeting personalization can be verified
 * without leaking Row130/E2E/QA labels into the experience.
 */
import { hashPassword } from "../lib/auth/password";
import { getAuthStore } from "../lib/auth/store";
import { getBillingStore } from "../lib/billing/store";
import { getChapter3Store } from "../lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "../lib/journey/chapters/chapter-4-store";
import {
  createEmptyChapter3Record,
  createEmptyChapter4Record,
  type Chapter3Record,
  type Chapter4Record,
} from "../lib/journey/chapters/types";
import { getJourneyOnboardingStore } from "../lib/journey/onboarding/store";
import {
  ONBOARDING_STEPS,
  type OnboardingRecord,
} from "../lib/journey/onboarding/types";

export const ARCHITECT_A = {
  email: "elena.disp.a@example.com",
  password: "DispA-Pass130!",
  firstName: "Elena",
  lastName: "Hart",
} as const;

export const ARCHITECT_B = {
  email: "caleb.disp.b@example.com",
  password: "DispB-Pass130!",
  firstName: "Caleb",
  lastName: "Moss",
} as const;

async function upsertArchitect(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  completePriorChapters: boolean;
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
      arcCode: `ARC-D130-${Date.now().toString(36).toUpperCase()}`,
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

  if (input.completePriorChapters) {
    const chapter3Base = createEmptyChapter3Record(user.id);
    const chapter3: Chapter3Record = {
      ...chapter3Base,
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
    await getChapter3Store().saveChapter3(chapter3);

    const chapter4Base = createEmptyChapter4Record(user.id);
    const chapter4: Chapter4Record = {
      ...chapter4Base,
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
          q1: "Ch IV preserved quiet standards",
          q2: "Ch IV preserved no longer serve",
          q3: "Ch IV preserved area to rise",
          q4: "Ch IV preserved not acceptable",
          q5: "Ch IV preserved ordinary Tuesday",
          q6: "Ch IV preserved greatest impact",
          q7: "Ch IV preserved life possible",
        },
        completedAt: now,
        updatedAt: now,
      },
      practice: {
        answers: {
          s1: "I protect my peace.",
          s2: "I choose courage over comfort.",
          s3: "I honor my body.",
          s4: "I protect my time.",
          s5: "I live in alignment.",
        },
        completedAt: now,
        updatedAt: now,
      },
      commitment: {
        affirmed: true,
        note: "Chapter IV weekly note remains",
        completedAt: now,
        updatedAt: now,
      },
      completedAt: now,
      updatedAt: now,
    };
    await getChapter4Store().saveChapter4(chapter4);
  }

  return user;
}

async function main() {
  const a = await upsertArchitect({
    ...ARCHITECT_A,
    completePriorChapters: true,
  });
  const b = await upsertArchitect({
    ...ARCHITECT_B,
    completePriorChapters: false,
  });
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

const executedDirectly = process.argv[1]?.includes("seed-row130-qa");
if (executedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
