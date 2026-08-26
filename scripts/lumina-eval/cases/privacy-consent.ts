import { getAuthStore } from "@/lib/auth/store";
import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { assembleLuminaJourneyContextForUser } from "@/lib/lumina/context/assemble";
import {
  LUMINA_MEMORY_DOCUMENT_ID,
  LUMINA_MEMORY_DOCUMENT_VERSION,
} from "@/lib/lumina/memory/consent";
import {
  clearLuminaMemoryForUserResult,
  retrieveLuminaMemoryForUser,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import {
  assert,
  assertEqual,
  assertNotIncludes,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

/**
 * Launch-critical PRIVACY/CONSENT BOUNDARIES (Row 81).
 * Named category for acceptance reporting — consent append, disabled gating,
 * cross-account isolation, and no client journey-context dump.
 */
export async function runPrivacyConsentCases(users: EvalUsers): Promise<void> {
  const { userA, userB } = users;

  await setLuminaMemoryEnabledForUser(userA.id, false);
  const blocked = await writeLuminaMemoryForUser(userA.id, {
    summary: { text: "Privacy probe should not persist", source: "explicit" },
  });
  assert(blocked.status === "disabled", "Disabled memory must reject writes");

  const beforeConsents = await getAuthStore().findConsentRecordsByUserId(userA.id);
  const enable = await setLuminaMemoryEnabledForUser(userA.id, true);
  assert(enable.status === "ok" && enable.enabled === true, "Enable memory must succeed");
  const afterConsents = await getAuthStore().findConsentRecordsByUserId(userA.id);
  assert(
    afterConsents.length > beforeConsents.length,
    "Enabling memory must append consent history",
  );
  const luminaConsent = afterConsents.find(
    (entry) => entry.consentType === "lumina_memory",
  );
  assert(luminaConsent, "Consent type must be lumina_memory");
  assertEqual(
    luminaConsent.documentId,
    LUMINA_MEMORY_DOCUMENT_ID,
    "Consent document id must match Lumina memory preference record",
  );
  assertEqual(
    luminaConsent.documentVersion,
    LUMINA_MEMORY_DOCUMENT_VERSION,
    "Consent document version must match Lumina memory preference record",
  );

  await writeLuminaMemoryForUser(userA.id, {
    summary: {
      text: "User A private decision reflection",
      source: "explicit",
    },
    progress: {
      chapterId: "chapter-2-mirror",
      status: "in_progress",
    },
  });

  // Insights must not surface when memory is subsequently disabled.
  await setLuminaMemoryEnabledForUser(userA.id, false);
  const disabledAssemble = await assembleLuminaJourneyContextForUser(userA.id);
  assertEqual(
    disabledAssemble.meta.memoryEnabled,
    false,
    "Assemble must report memory disabled",
  );
  assertEqual(
    disabledAssemble.relevantInsights.length,
    0,
    "Disabled memory must not surface relevant insights",
  );

  await setLuminaMemoryEnabledForUser(userA.id, true);
  await setLuminaMemoryEnabledForUser(userB.id, true);
  await writeLuminaMemoryForUser(userB.id, {
    summary: { text: "User B private consent boundary note", source: "explicit" },
  });
  const aView = await retrieveLuminaMemoryForUser(userA.id);
  assert(
    !aView?.durable.summaries.some((entry) =>
      entry.text.includes("User B private consent"),
    ),
    "User A must not retrieve User B durable memory",
  );

  const conversationA = await withFreshConversation(userA.id);
  const sent = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversationA.id,
    content: "[fixture-journey-context] Privacy boundary check",
    routeLocale: "en",
  });
  assert(sent.status === "ok", "Privacy send must succeed");
  const payload = JSON.stringify(sent);
  assertNotIncludes(payload, '"journeyContext"', "Client payload must omit journeyContext");
  assertNotIncludes(payload, "relevantInsights", "Client payload must not dump insights");
  assertNotIncludes(payload, "upcomingRequirements", "Client payload must not dump upcoming");

  const clear = await clearLuminaMemoryForUserResult(userA.id);
  assert(clear.status === "ok", "Clear must succeed");
  const cleared = await retrieveLuminaMemoryForUser(userA.id);
  assertEqual(cleared?.durable.summaries.length ?? -1, 0, "Clear removes durable summaries");
  const userAfterClear = await getAuthStore().findUserById(userA.id);
  assertEqual(userAfterClear?.firstName, "Ava", "Clear must not wipe profile identity");
  const consentsAfterClear = await getAuthStore().findConsentRecordsByUserId(userA.id);
  assert(
    consentsAfterClear.some((entry) => entry.consentType === "lumina_memory"),
    "Clear must retain consent history records",
  );
}
