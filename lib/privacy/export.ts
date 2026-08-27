import { getAuthStore } from "@/lib/auth/store";
import { getAnalyticsStore } from "@/lib/analytics/store";
import { getBillingStore } from "@/lib/billing/store";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import { getJourneyProgressStore } from "@/lib/journey/progress/store";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getLuminaStore } from "@/lib/lumina/store";
import { getPrivacyStore } from "@/lib/privacy/store";
import { getSupportStore } from "@/lib/support/store";
import type { PrivacyExportPackage, PrivacyRequest } from "@/lib/privacy/types";
import type { UserRecord } from "@/lib/auth/types";

function publicAccount(user: UserRecord): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    locale: user.locale,
    timeZone: user.timeZone ?? null,
    arcCode: user.arcCode,
    authProvider: user.authProvider,
    emailVerified: user.emailVerified,
    googleLinked: Boolean(user.googleId),
    ageEligible: user.ageEligible === true,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt ?? null,
  };
}

function omitSecretsFromRequest(request: PrivacyRequest): Record<string, unknown> {
  return {
    id: request.id,
    createdAt: request.createdAt,
    type: request.type,
    status: request.status,
    subject: request.subject,
    identityStatus: request.identity.status,
    identityMethod: request.identity.method,
  };
}

export async function buildPrivacyExportPackage(
  request: PrivacyRequest,
): Promise<PrivacyExportPackage> {
  const omitted = [
    "passwordHash",
    "googleId",
    "verificationTokens",
    "passwordResetTokens",
    "identityTokenHash",
    "paymentCardData",
  ];
  const userId = request.identity.matchedUserId;
  const user = userId ? await getAuthStore().findUserById(userId) : undefined;
  const consents = userId
    ? await getAuthStore().findConsentRecordsByUserId(userId)
    : [];

  const journey = userId
    ? {
        progress: await getJourneyProgressStore().findProgressForUser(userId),
        onboarding: await getJourneyOnboardingStore().findOnboardingForUser(userId),
        chapter1: await getChapter1Store().findChapter1ForUser(userId),
        chapter2: await getChapter2Store().findChapter2ForUser(userId),
        chapter3: await getChapter3Store().findChapter3ForUser(userId),
        chapter4: await getChapter4Store().findChapter4ForUser(userId),
        chapter5: await getChapter5Store().findChapter5ForUser(userId),
        chapter6: await getChapter6Store().findChapter6ForUser(userId),
        chapter7: await getChapter7Store().findChapter7ForUser(userId),
      }
    : undefined;

  const lumina = userId
    ? {
        conversations: await getLuminaStore().listConversationsForUser(userId),
        memory: await getLuminaStore().findMemoryForUser(userId),
      }
    : undefined;

  const billing = userId
    ? {
        purchases: await getBillingStore().findPurchasesByUserId(userId),
        entitlements: await getBillingStore().findEntitlementsByUserId(userId),
        accountAccess: await getBillingStore().findAccountAccessByUserId(userId),
        notifications: await getBillingStore().listNotificationsByUserId(userId),
      }
    : undefined;

  const analytics = userId
    ? (await getAnalyticsStore().listEventsByUserId(userId)).map((event) => ({
        id: event.id,
        name: event.name,
        createdAt: event.createdAt,
        payload: event.payload ?? null,
      }))
    : [];

  const support = (await getSupportStore().list({ includeTest: true }))
    .filter((ticket) => ticket.requesterEmail === request.requesterEmail)
    .map((ticket) => ({
      id: ticket.id,
      createdAt: ticket.createdAt,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
    }));

  const privacyRequests = (
    await getPrivacyStore().list({
      includeTest: true,
      email: request.requesterEmail,
    })
  ).map(omitSecretsFromRequest);

  return {
    generatedAt: new Date().toISOString(),
    requestId: request.id,
    requesterEmail: request.requesterEmail,
    matchedUserId: userId,
    systems: [
      "auth_accounts",
      "auth_consents",
      "journey_progress",
      "journey_onboarding",
      "journey_chapters",
      "lumina_conversations",
      "lumina_memory",
      "billing_purchases",
      "billing_entitlements",
      "analytics_events",
      "support_tickets",
      "privacy_rights_requests",
    ],
    account: user ? publicAccount(user) : undefined,
    consents: consents.map((record) => ({
      consentType: record.consentType,
      documentId: record.documentId,
      documentVersion: record.documentVersion ?? null,
      consentedAt: record.consentedAt,
    })),
    journey,
    lumina,
    billing,
    analytics,
    support,
    privacyRequests,
    omitted,
  };
}
