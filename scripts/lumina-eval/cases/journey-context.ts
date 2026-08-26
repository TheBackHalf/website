import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { assembleLuminaJourneyContextForUser } from "@/lib/lumina/context/assemble";
import {
  clearLuminaMemoryForUserResult,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import {
  assert,
  assertEqual,
  assertIncludes,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

/**
 * Launch-critical JOURNEY-AWARE CONTEXT (Row 81).
 * Named category for acceptance reporting — exercises assemble + send stage echo
 * on the available progress-pointer / fixture surface (Journey engine Rows 83–94 pending).
 */
export async function runJourneyContextCases(users: EvalUsers): Promise<void> {
  const { userA } = users;

  await setLuminaMemoryEnabledForUser(userA.id, true);
  await clearLuminaMemoryForUserResult(userA.id);

  const empty = await assembleLuminaJourneyContextForUser(userA.id);
  assertEqual(empty.currentJourney.state, "not_started", "Empty progress → not_started");
  assertEqual(empty.currentJourney.stageId, null, "Empty progress → null stageId");
  assertEqual(
    empty.upcomingRequirements[0]?.stageId ?? null,
    "awakening",
    "Catalog upcoming peeks first stage when not started",
  );

  await writeLuminaMemoryForUser(userA.id, {
    progress: {
      chapterId: "chapter-3-decision",
      status: "in_progress",
    },
    decision: {
      text: "I choose to commit at the decision stage",
      confirmed: true,
      source: "explicit",
    },
  });

  // Client hint must never override authoritative progress-pointer stage.
  const forged = await assembleLuminaJourneyContextForUser(userA.id, {
    clientStageHint: "expansion",
  });
  assertEqual(
    forged.currentJourney.stageId,
    "decision",
    "clientStageHint must not forge stage",
  );
  assertEqual(
    forged.currentJourney.state,
    "in_progress",
    "clientStageHint must not forge state",
  );
  assertEqual(
    forged.upcomingRequirements[0]?.stageId ?? null,
    "standards",
    "Upcoming must follow catalog order from authoritative stage",
  );
  assertEqual(forged.meta.memoryEnabled, true, "Assemble reports memory enabled");
  assert(
    forged.relevantInsights.some((entry) =>
      entry.text.toLowerCase().includes("decision"),
    ),
    "Enabled memory should surface stage-relevant insights",
  );

  const conversation = await withFreshConversation(userA.id);
  const echoed = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-journey-context] Orient me to my current Journey stage.",
    routeLocale: "en",
  });
  assert(echoed.status === "ok", "Journey-aware send must succeed");
  const assistant = echoed.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(assistant, "Journey-aware assistant reply required");
  assertIncludes(
    assistant.content,
    "stageId=decision",
    "Send path must echo assembled stage",
  );
  assertIncludes(
    assistant.content,
    "state=in_progress",
    "Send path must echo assembled state",
  );
}
