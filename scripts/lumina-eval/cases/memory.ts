import { getAuthStore } from "@/lib/auth/store";
import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import {
  clearLuminaMemoryForUserResult,
  retrieveLuminaMemoryForUser,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import {
  assert,
  assertEqual,
  assertNonEmptyString,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

export async function runMemoryCases(users: EvalUsers): Promise<void> {
  const { userA, userB } = users;

  // Disabled blocks writes
  await setLuminaMemoryEnabledForUser(userA.id, false);
  const blocked = await writeLuminaMemoryForUser(userA.id, {
    summary: { text: "Should not persist while disabled", source: "explicit" },
  });
  assert(blocked.status === "disabled", "Disabled memory must reject writes");

  // Enable → consent append
  const beforeConsents = await getAuthStore().findConsentRecordsByUserId(userA.id);
  const enable = await setLuminaMemoryEnabledForUser(userA.id, true);
  assert(enable.status === "ok" && enable.enabled === true, "Enable memory must succeed");
  const afterConsents = await getAuthStore().findConsentRecordsByUserId(userA.id);
  assert(
    afterConsents.length > beforeConsents.length,
    "Enabling memory must append consent",
  );
  assert(
    afterConsents.some((entry) => entry.consentType === "lumina_memory"),
    "Consent append must include lumina_memory",
  );

  // Write decision / summary / milestone / progress → retrieve
  const wrote = await writeLuminaMemoryForUser(userA.id, {
    summary: { text: "Eval summary about commitment", source: "explicit" },
    decision: {
      text: "I choose to continue as Architect",
      confirmed: true,
      source: "explicit",
    },
    milestone: {
      key: "eval-milestone",
      label: "Eval milestone reached",
      source: "explicit",
    },
    progress: {
      chapterId: "chapter-2-mirror",
      status: "in_progress",
    },
  });
  assert(wrote.status === "ok", "Enabled memory writes must succeed");

  const retrieved = await retrieveLuminaMemoryForUser(userA.id);
  assert(retrieved?.enabled === true, "Retrieve must show enabled");
  assertEqual(retrieved?.durable.summaries.length ?? 0, 1, "Summary must retrieve");
  assertEqual(retrieved?.durable.decisions.length ?? 0, 1, "Decision must retrieve");
  assertEqual(retrieved?.durable.milestones.length ?? 0, 1, "Milestone must retrieve");
  assertEqual(
    retrieved?.durable.progress?.chapterId ?? null,
    "chapter-2-mirror",
    "Progress must retrieve",
  );
  assertEqual(retrieved?.identity.preferredName, "Ava", "Profile identity remains available");

  // [remember] path when enabled
  const conversation = await withFreshConversation(userA.id);
  const rememberSend = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[remember] Keep this durable note for later reflection",
    routeLocale: "en",
  });
  assert(rememberSend.status === "ok", "Remember send must succeed");
  const afterRemember = await retrieveLuminaMemoryForUser(userA.id);
  assert(
    (afterRemember?.durable.summaries.length ?? 0) >= 2,
    "Explicit [remember] must persist when enabled",
  );
  assert(
    afterRemember?.durable.summaries.some((entry) =>
      entry.text.includes("durable note for later reflection"),
    ),
    "Remembered text must be retrievable",
  );

  // A cannot read B
  await setLuminaMemoryEnabledForUser(userB.id, true);
  await writeLuminaMemoryForUser(userB.id, {
    summary: { text: "User B private summary", source: "explicit" },
  });
  const aView = await retrieveLuminaMemoryForUser(userA.id);
  const bView = await retrieveLuminaMemoryForUser(userB.id);
  assert(
    !aView?.durable.summaries.some((entry) => entry.text.includes("User B private")),
    "User A must not see User B memory",
  );
  assert(
    bView?.durable.summaries.some((entry) => entry.text.includes("User B private")),
    "User B must see own memory",
  );
  const crossMemory = await getLuminaMemoryStore().findMemoryForUser(userA.id);
  assert(crossMemory?.userId === userA.id, "Memory record ownership must stay user-scoped");

  // Clear removes durable memory not profile
  const clear = await clearLuminaMemoryForUserResult(userA.id);
  assert(clear.status === "ok", "Clear must succeed");
  const cleared = await retrieveLuminaMemoryForUser(userA.id);
  assertEqual(cleared?.durable.summaries.length ?? -1, 0, "Clear removes summaries");
  assertEqual(cleared?.durable.decisions.length ?? -1, 0, "Clear removes decisions");
  assertEqual(cleared?.durable.milestones.length ?? -1, 0, "Clear removes milestones");
  assertEqual(cleared?.durable.progress ?? null, null, "Clear removes progress");
  assertNonEmptyString(cleared?.identity.preferredName, "Clear must not wipe profile identity");
  assertEqual(cleared?.identity.preferredName, "Ava", "Profile first name intact after clear");

  const userAfterClear = await getAuthStore().findUserById(userA.id);
  assertEqual(userAfterClear?.firstName, "Ava", "Auth profile untouched by memory clear");
  assertEqual(userAfterClear?.locale, "en", "Locale preference untouched by memory clear");
}
