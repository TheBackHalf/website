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
import { setLuminaMemoryEnabledForUser } from "@/lib/lumina/memory/service";
import {
  deleteAllJourneyParticipantRecordsForUser,
  getParticipantPersistenceBackend,
  journeyFileOverrideDir,
} from "@/lib/journey/durable-records";
import { listPrivacySystems } from "@/lib/privacy/data-map";
import { activeLegalHoldFor } from "@/lib/privacy/legal-hold";
import type { PrivacySystemAction } from "@/lib/privacy/types";

export async function eraseParticipantContent(userId: string): Promise<PrivacySystemAction[]> {
  const actions: PrivacySystemAction[] = [];
  const hold = activeLegalHoldFor({ userId });
  if (hold) {
    return listPrivacySystems()
      .filter((system) => !system.retainOnDeletionRequest)
      .map((system) => ({
        systemId: system.id,
        action: "hold",
        retainOnDeletionRequest: true,
        reason: `Active operational hold ${hold.id}. Human legal review required for hold scope.`,
      }));
  }

  await getJourneyProgressStore().deleteForUser(userId);
  actions.push({ systemId: "journey_progress", action: "deleted" });

  await getJourneyOnboardingStore().deleteForUser(userId);
  actions.push({ systemId: "journey_onboarding", action: "deleted" });

  await getChapter1Store().deleteForUser(userId);
  await getChapter2Store().deleteForUser(userId);
  await getChapter3Store().deleteForUser(userId);
  await getChapter4Store().deleteForUser(userId);
  await getChapter5Store().deleteForUser(userId);
  await getChapter6Store().deleteForUser(userId);
  await getChapter7Store().deleteForUser(userId);
  actions.push({ systemId: "journey_chapters", action: "deleted" });

  await getLuminaStore().eraseParticipantDataForUser(userId);
  actions.push({ systemId: "lumina_conversations", action: "deleted" });
  actions.push({ systemId: "lumina_memory", action: "deleted" });

  if (
    getParticipantPersistenceBackend(Boolean(journeyFileOverrideDir())) ===
    "supabase_postgres"
  ) {
    await deleteAllJourneyParticipantRecordsForUser(userId);
  }

  const billing = getBillingStore();
  const entitlements = await billing.findEntitlementsByUserId(userId);
  const now = new Date().toISOString();
  for (const entitlement of entitlements) {
    if (entitlement.status === "revoked") continue;
    await billing.upsertEntitlement({
      ...entitlement,
      status: "revoked",
      revokedAt: now,
      reason: "privacy_deletion",
    });
  }
  const access = await billing.findAccountAccessByUserId(userId);
  if (access) {
    await billing.upsertAccountAccess({
      ...access,
      journeyAccess: false,
      communityAccess: false,
      syncedAt: now,
      source: "privacy_deletion",
    });
  }
  actions.push({
    systemId: "billing_entitlements",
    action: entitlements.length > 0 || access ? "revoked" : "not_applicable",
  });
  actions.push({
    systemId: "billing_purchases",
    action: "retained",
    retainOnDeletionRequest: true,
    reason: "Transaction/audit records retained. Stripe configuration was not changed.",
  });

  const unlinked = await getAnalyticsStore().unlinkUserId(userId);
  actions.push({
    systemId: "analytics_events",
    action: unlinked > 0 ? "unlinked" : "not_applicable",
    retainOnDeletionRequest: true,
  });

  const auth = getAuthStore();
  await auth.deleteVerificationTokensForUser(userId);
  await auth.deletePasswordResetTokensForUser(userId);
  actions.push({ systemId: "auth_tokens", action: "deleted" });

  await auth.anonymizeDeletedUser(userId);
  actions.push({ systemId: "auth_accounts", action: "anonymized" });
  actions.push({ systemId: "google_oauth", action: "anonymized" });
  actions.push({
    systemId: "auth_consents",
    action: "retained",
    retainOnDeletionRequest: true,
    reason: "Consent/audit proof retained.",
  });

  for (const system of listPrivacySystems()) {
    if (actions.some((entry) => entry.systemId === system.id)) continue;
    actions.push({
      systemId: system.id,
      action: system.manualOperatorStep ? "manual_follow_up" : "retained",
      retainOnDeletionRequest: system.retainOnDeletionRequest,
      reason: system.retainReason ?? system.deletion,
    });
  }

  return actions;
}

export async function withdrawLuminaMemoryConsent(userId: string): Promise<PrivacySystemAction[]> {
  await setLuminaMemoryEnabledForUser(userId, false);
  await getLuminaStore().clearMemoryPayloadForUser(userId);
  return [
    {
      systemId: "lumina_memory",
      action: "disabled",
      reason: "Lumina memory consent withdrawn. Required service consents were not withdrawn.",
    },
  ];
}
