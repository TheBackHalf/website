/**
 * Launch Readiness row 176 / AOS al-176 — disposable test accounts and data.
 * Local and isolated QA only. Never seed Vercel hosted production.
 * Passwords are supplied at seed time via LAUNCH_QA_PASSWORD and are not stored here.
 */

import { isHostedProduction } from "@/lib/analytics/db";
import { generateArcCodeCandidate } from "@/lib/auth/arc-code";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/auth/password";
import type { AppRole } from "@/lib/auth/roles";
import { allocateUniqueArcCode, getAuthStore } from "@/lib/auth/store";
import { authPostgresConfigured } from "@/lib/auth/store/db";
import type { AuthStore } from "@/lib/auth/store/types";
import type { UserRecord } from "@/lib/auth/types";
import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import { assertNoInstallmentEntitlementPath } from "@/lib/billing/installments";
import { getBillingStore } from "@/lib/billing/store";
import type { BillingStore } from "@/lib/billing/store";
import { CHAPTER_1_SECTIONS } from "@/content/journey/chapter-1-awakening";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import type { Chapter1Store } from "@/lib/journey/chapters/store";
import { createEmptyChapter1Record } from "@/lib/journey/chapters/types";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import type { JourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import {
  createEmptyOnboardingRecord,
  ONBOARDING_STEPS,
  type OnboardingRecord,
} from "@/lib/journey/onboarding/types";
import { getJourneyProgressStore } from "@/lib/journey/progress/store";
import type { JourneyProgressStore } from "@/lib/journey/progress/store";
import { issueFingerprint } from "@/lib/support/sanitize";
import { getSupportStore } from "@/lib/support/store";
import type { SupportStore } from "@/lib/support/store";
import type { SupportTicket } from "@/lib/support/ticket-types";
import type { Locale } from "@/lib/i18n/config";

export const LAUNCH_TEST_ACCOUNT_CASES = [
  "english",
  "spanish",
  "new",
  "returning",
  "paid",
  "installment",
  "incomplete",
  "complete",
  "support",
  "admin",
] as const;

export type LaunchTestAccountCase = (typeof LAUNCH_TEST_ACCOUNT_CASES)[number];

export type LaunchTestPaymentState = "none" | "paid" | "installment_not_offered";
export type LaunchTestLifecycle = "new" | "returning";
export type LaunchTestProgress = "incomplete" | "complete" | "not_applicable";

export type LaunchTestAccountSpec = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: Locale;
  lifecycle: LaunchTestLifecycle;
  payment: LaunchTestPaymentState;
  progress: LaunchTestProgress;
  role: Extract<AppRole, "architect" | "support" | "admin">;
};

export const LAUNCH_TEST_ACCOUNTS: readonly LaunchTestAccountSpec[] = [
  {
    id: "qa176-en-new-unpaid",
    email: "qa176.en.new@example.com",
    firstName: "Elena",
    lastName: "Brooks",
    locale: "en",
    lifecycle: "new",
    payment: "none",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-es-new-unpaid",
    email: "qa176.es.new@example.com",
    firstName: "Mateo",
    lastName: "Ruiz",
    locale: "es",
    lifecycle: "new",
    payment: "none",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-en-returning-paid-incomplete",
    email: "qa176.en.paid.incomplete@example.com",
    firstName: "Harper",
    lastName: "Quinn",
    locale: "en",
    lifecycle: "returning",
    payment: "paid",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-es-returning-paid-incomplete",
    email: "qa176.es.paid.incomplete@example.com",
    firstName: "Camila",
    lastName: "Soto",
    locale: "es",
    lifecycle: "returning",
    payment: "paid",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-en-returning-paid-complete",
    email: "qa176.en.paid.complete@example.com",
    firstName: "Jordan",
    lastName: "Hale",
    locale: "en",
    lifecycle: "returning",
    payment: "paid",
    progress: "complete",
    role: "architect",
  },
  {
    id: "qa176-es-returning-paid-complete",
    email: "qa176.es.paid.complete@example.com",
    firstName: "Lucia",
    lastName: "Vega",
    locale: "es",
    lifecycle: "returning",
    payment: "paid",
    progress: "complete",
    role: "architect",
  },
  {
    id: "qa176-en-installment-not-offered",
    email: "qa176.en.installment@example.com",
    firstName: "Riley",
    lastName: "Chen",
    locale: "en",
    lifecycle: "new",
    payment: "installment_not_offered",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-es-installment-not-offered",
    email: "qa176.es.installment@example.com",
    firstName: "Diego",
    lastName: "Mora",
    locale: "es",
    lifecycle: "new",
    payment: "installment_not_offered",
    progress: "incomplete",
    role: "architect",
  },
  {
    id: "qa176-en-support",
    email: "qa176.en.support@example.com",
    firstName: "Sam",
    lastName: "Ortega",
    locale: "en",
    lifecycle: "returning",
    payment: "none",
    progress: "not_applicable",
    role: "support",
  },
  {
    id: "qa176-es-support",
    email: "qa176.es.support@example.com",
    firstName: "Valeria",
    lastName: "Nunez",
    locale: "es",
    lifecycle: "returning",
    payment: "none",
    progress: "not_applicable",
    role: "support",
  },
  {
    id: "qa176-en-admin",
    email: "qa176.en.admin@example.com",
    firstName: "Avery",
    lastName: "Kim",
    locale: "en",
    lifecycle: "returning",
    payment: "none",
    progress: "not_applicable",
    role: "admin",
  },
] as const;

export type SeededLaunchTestAccount = {
  id: string;
  userId: string;
  email: string;
  locale: Locale;
  lifecycle: LaunchTestLifecycle;
  payment: LaunchTestPaymentState;
  progress: LaunchTestProgress;
  role: LaunchTestAccountSpec["role"];
  emailVerified: boolean;
  journeyAccess: boolean;
  installmentEntitlementPresent: boolean;
  chapter1Status: string | null;
  onboardingStatus: string | null;
};

export type SeedLaunchTestAccountsInput = {
  password: string;
  now?: string;
  allowPostgres?: boolean;
  auth?: AuthStore;
  billing?: BillingStore;
  onboarding?: JourneyOnboardingStore;
  progress?: JourneyProgressStore;
  chapter1?: Chapter1Store;
  support?: SupportStore;
};

export type SeedLaunchTestAccountsResult = {
  seededAt: string;
  accounts: SeededLaunchTestAccount[];
  supportTickets: string[];
  productionWrite: false;
};

export function launchTestAccountCoverage(): {
  ok: boolean;
  missing: LaunchTestAccountCase[];
  covered: LaunchTestAccountCase[];
} {
  const covered = new Set<LaunchTestAccountCase>();
  for (const account of LAUNCH_TEST_ACCOUNTS) {
    if (account.locale === "en") covered.add("english");
    if (account.locale === "es") covered.add("spanish");
    if (account.lifecycle === "new") covered.add("new");
    if (account.lifecycle === "returning") covered.add("returning");
    if (account.payment === "paid") covered.add("paid");
    if (account.payment === "installment_not_offered") covered.add("installment");
    if (account.progress === "incomplete") covered.add("incomplete");
    if (account.progress === "complete") covered.add("complete");
    if (account.role === "support") covered.add("support");
    if (account.role === "admin") covered.add("admin");
  }
  const missing = LAUNCH_TEST_ACCOUNT_CASES.filter((entry) => !covered.has(entry));
  return {
    ok: missing.length === 0,
    missing,
    covered: LAUNCH_TEST_ACCOUNT_CASES.filter((entry) => covered.has(entry)),
  };
}

export function assertLaunchTestSeedAllowed(options?: {
  allowPostgres?: boolean;
}): void {
  if (isHostedProduction()) {
    throw new Error(
      "Launch test account seed is blocked on Vercel hosted environments.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_LAUNCH_TEST_SEED !== "1"
  ) {
    throw new Error(
      "Launch test account seed is blocked in NODE_ENV=production without ALLOW_LAUNCH_TEST_SEED=1.",
    );
  }
  if (
    authPostgresConfigured() &&
    !options?.allowPostgres &&
    process.env.ALLOW_LAUNCH_TEST_SEED !== "1"
  ) {
    throw new Error(
      "Postgres is configured. Refusing to seed until ALLOW_LAUNCH_TEST_SEED=1 is set for a non-production database.",
    );
  }
}

export function resolveLaunchTestPassword(explicit?: string): string {
  const password = explicit ?? process.env.LAUNCH_QA_PASSWORD;
  if (!password?.trim()) {
    throw new Error(
      "Set LAUNCH_QA_PASSWORD for local QA seed. Do not commit the value.",
    );
  }
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    throw new Error(strengthError);
  }
  return password;
}

function completedOnboarding(userId: string, now: string): OnboardingRecord {
  return {
    userId,
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
}

function makeSupportTicket(input: {
  id: string;
  name: string;
  email: string;
  locale: Locale;
  now: string;
}): SupportTicket {
  const due = new Date(Date.parse(input.now) + 24 * 60 * 60 * 1000).toISOString();
  const subject =
    input.locale === "es"
      ? "Caso de soporte QA176 (desechable)"
      : "QA176 disposable support case";
  const message =
    input.locale === "es"
      ? "Ticket de lanzamiento desechable. No es una solicitud de participante."
      : "Disposable launch QA ticket. Not a participant request.";
  return {
    id: input.id,
    createdAt: input.now,
    updatedAt: input.now,
    requesterName: input.name,
    requesterEmail: input.email,
    isArchitect: "yes",
    category: "ONBOARDING",
    subject,
    message,
    status: "NEW",
    priority: "P3",
    assignedOwner: "nia",
    responseDueAt: due,
    slaState: "within",
    acknowledgment: { status: "logged", at: input.now },
    escalation: { status: "none", targets: [] },
    history: [
      {
        at: input.now,
        actor: "system",
        type: "created",
        note: "qa176 disposable seed",
      },
    ],
    source: "form",
    channel: "web",
    emailMessageIds: [],
    fingerprint: issueFingerprint("ONBOARDING", subject),
    test: true,
  };
}

export async function seedLaunchTestAccounts(
  input: SeedLaunchTestAccountsInput,
): Promise<SeedLaunchTestAccountsResult> {
  const isolated = Boolean(
    input.auth &&
      input.billing &&
      input.onboarding &&
      input.progress &&
      input.chapter1 &&
      input.support,
  );
  if (!isolated) {
    assertLaunchTestSeedAllowed({ allowPostgres: input.allowPostgres });
  }
  const coverage = launchTestAccountCoverage();
  if (!coverage.ok) {
    throw new Error(
      `Launch test account catalog is missing cases: ${coverage.missing.join(", ")}`,
    );
  }
  assertNoInstallmentEntitlementPath();

  const password = resolveLaunchTestPassword(input.password);
  const now = input.now ?? new Date().toISOString();
  const auth = input.auth ?? getAuthStore();
  const billing = input.billing ?? getBillingStore();
  const onboarding = input.onboarding ?? getJourneyOnboardingStore();
  const progress = input.progress ?? getJourneyProgressStore();
  const chapter1 = input.chapter1 ?? getChapter1Store();
  const support = input.support ?? getSupportStore();
  const passwordHash = await hashPassword(password);

  const accounts: SeededLaunchTestAccount[] = [];

  for (const spec of LAUNCH_TEST_ACCOUNTS) {
    let user: UserRecord | undefined = await auth.findUserByEmail(spec.email);
    if (!user) {
      user = await auth.createUser({
        email: spec.email,
        firstName: spec.firstName,
        lastName: spec.lastName,
        passwordHash,
        authProvider: "email",
        googleId: undefined,
        arcCode: await allocateUniqueArcCode(auth, generateArcCodeCandidate),
        emailVerified: spec.lifecycle === "returning",
        locale: spec.locale,
        ageEligible: true,
        ageEligibleConfirmedAt: now,
      });
    } else {
      await auth.updateUser(user.id, {
        passwordHash,
        emailVerified: spec.lifecycle === "returning",
        firstName: spec.firstName,
        lastName: spec.lastName,
        locale: spec.locale,
        ageEligible: true,
        ageEligibleConfirmedAt: now,
      });
      user = (await auth.findUserByEmail(spec.email))!;
    }

    const withRole = await auth.setUserRole(user.id, spec.role);
    if (!withRole || withRole.role !== spec.role) {
      throw new Error(`Failed to assign ${spec.role} role for ${spec.id}`);
    }
    user = withRole;

    if (spec.payment === "paid") {
      await billing.upsertPurchase({
        id: `qa176-purchase-${spec.id}`,
        userId: user.id,
        offerId: "bundle",
        status: "paid",
        amountCents: CHECKOUT_OFFERS.bundle.amountCents,
        currency: "usd",
        createdAt: now,
        sourceEventId: `qa176:${spec.id}:purchase`,
      });
      await billing.upsertEntitlement({
        id: `qa176-entitlement-${spec.id}`,
        userId: user.id,
        kind: "journey_access",
        status: "active",
        sourceOfferId: "bundle",
        grantedAt: now,
        startsAt: now,
        reason: "qa176_launch_test_seed",
      });
      await billing.upsertAccountAccess({
        userId: user.id,
        journeyAccess: true,
        communityAccess: false,
        hasPaidPurchase: true,
        hasFailedPurchase: false,
        hasRefundedPurchase: false,
        communitySubscriptionStatus: "none",
        syncedAt: now,
        source: "qa176_launch_test_seed",
      });
    } else {
      await billing.upsertAccountAccess({
        userId: user.id,
        journeyAccess: false,
        communityAccess: false,
        hasPaidPurchase: false,
        hasFailedPurchase: false,
        hasRefundedPurchase: false,
        communitySubscriptionStatus: "none",
        syncedAt: now,
        source: "qa176_launch_test_seed",
      });
    }

    if (spec.progress === "complete") {
      await onboarding.saveOnboarding(completedOnboarding(user.id, now));
      await progress.upsertProgress({
        userId: user.id,
        chapterId: "chapter-1-awakening",
        status: "journey_completed",
      });
      const empty = createEmptyChapter1Record(user.id, now);
      await chapter1.saveChapter1({
        ...empty,
        status: "completed",
        currentSectionId: "complete",
        completedSectionIds: [...CHAPTER_1_SECTIONS],
        reflection: { ...empty.reflection, completedAt: now },
        alivenessProject: { ...empty.alivenessProject, completedAt: now },
        commitment: {
          ...empty.commitment,
          affirmed: true,
          completedAt: now,
        },
        completedAt: now,
        updatedAt: now,
      });
    } else if (spec.progress === "incomplete") {
      if (spec.lifecycle === "returning") {
        await onboarding.saveOnboarding(completedOnboarding(user.id, now));
        await progress.upsertProgress({
          userId: user.id,
          chapterId: "chapter-1-awakening",
          status: "in_progress",
        });
        const empty = createEmptyChapter1Record(user.id, now);
        await chapter1.saveChapter1({
          ...empty,
          status: "in_progress",
          currentSectionId: "welcome",
          updatedAt: now,
        });
      } else {
        await onboarding.saveOnboarding(createEmptyOnboardingRecord(user.id, now));
      }
    }

    const entitlements = await billing.findEntitlementsByUserId(user.id);
    const installmentEntitlementPresent = entitlements.some((entry) =>
      /installment/i.test(`${entry.reason ?? ""} ${entry.sourceOfferId}`),
    );
    if (spec.payment === "installment_not_offered" && installmentEntitlementPresent) {
      throw new Error(`Installment entitlement was created for ${spec.id}`);
    }

    const passwordOk = user.passwordHash
      ? await verifyPassword(password, user.passwordHash)
      : false;
    if (!passwordOk) {
      throw new Error(`Password hash verification failed for ${spec.id}`);
    }

    const chapterRecord = await chapter1.findChapter1ForUser(user.id);
    const onboardingRecord = await onboarding.findOnboardingForUser(user.id);

    accounts.push({
      id: spec.id,
      userId: user.id,
      email: spec.email,
      locale: spec.locale,
      lifecycle: spec.lifecycle,
      payment: spec.payment,
      progress: spec.progress,
      role: spec.role,
      emailVerified: user.emailVerified,
      journeyAccess: entitlements.some(
        (entry) => entry.kind === "journey_access" && entry.status === "active",
      ),
      installmentEntitlementPresent,
      chapter1Status: chapterRecord?.status ?? null,
      onboardingStatus: onboardingRecord?.status ?? null,
    });
  }

  const ticketSpecs = [
    LAUNCH_TEST_ACCOUNTS.find((entry) => entry.id === "qa176-en-returning-paid-incomplete")!,
    LAUNCH_TEST_ACCOUNTS.find((entry) => entry.id === "qa176-es-returning-paid-incomplete")!,
  ];
  const supportTickets: string[] = [];
  for (const spec of ticketSpecs) {
    const ticket = await support.upsert(
      makeSupportTicket({
        id: `BH-S-QA176-${spec.locale.toUpperCase()}`,
        name: `${spec.firstName} ${spec.lastName}`,
        email: spec.email,
        locale: spec.locale,
        now,
      }),
    );
    supportTickets.push(ticket.id);
  }

  return {
    seededAt: now,
    accounts,
    supportTickets,
    productionWrite: false,
  };
}
