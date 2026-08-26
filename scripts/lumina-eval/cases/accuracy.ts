import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { assembleLuminaJourneyContextForUser } from "@/lib/lumina/context/assemble";
import {
  createFixtureJourneyStateAdapter,
  seedLuminaContextFixtureForTests,
} from "@/lib/lumina/context/fixture-adapter";
import {
  clearLuminaMemoryForUserResult,
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import {
  assert,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

export async function runAccuracyCases(users: EvalUsers): Promise<void> {
  const { userA } = users;

  // Isolate from prior categories — empty progress must not invent completions
  await setLuminaMemoryEnabledForUser(userA.id, true);
  await clearLuminaMemoryForUserResult(userA.id);
  const emptyCtx = await assembleLuminaJourneyContextForUser(userA.id);
  assertEqual(emptyCtx.currentJourney.state, "not_started", "Empty progress → not_started");
  assertEqual(emptyCtx.completedWork.length, 0, "Must not invent completed chapters when empty");
  assertEqual(emptyCtx.savedArtifacts.length, 0, "Must not invent saved artifacts when empty");

  // Seed journey fixture via memory progress (send path uses production adapter)
  await writeLuminaMemoryForUser(userA.id, {
    progress: {
      chapterId: "chapter-1-awakening",
      status: "in_progress",
    },
  });

  const seededAssemble = await assembleLuminaJourneyContextForUser(userA.id);
  assertEqual(seededAssemble.currentJourney.stageId, "awakening", "Assemble matches seeded stage");
  assertEqual(
    seededAssemble.currentJourney.state,
    "in_progress",
    "Assemble matches seeded state",
  );

  // Fixture adapter path also matches seeded fixture state
  seedLuminaContextFixtureForTests(userA.id, {
    progress: {
      chapterId: "chapter-4-standards",
      status: "stage_completed",
      updatedAt: new Date().toISOString(),
    },
    completedWork: [
      {
        id: "cw-1",
        kind: "stage",
        stageId: "awakening",
        chapterId: "chapter-1-awakening",
        label: "Awakening complete",
        explicit: true,
        completedAt: new Date().toISOString(),
      },
    ],
  });
  const fixtureAssemble = await assembleLuminaJourneyContextForUser(userA.id, {
    adapter: createFixtureJourneyStateAdapter(),
  });
  assertEqual(
    fixtureAssemble.currentJourney.stageId,
    "standards",
    "Fixture adapter stage must match seed",
  );
  assertEqual(
    fixtureAssemble.currentJourney.state,
    "stage_completed",
    "Fixture adapter state must match seed",
  );
  assertEqual(fixtureAssemble.completedWork.length, 1, "Fixture completed work is explicit-only");

  const conversation = await withFreshConversation(userA.id);
  const journeyEcho = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-journey-context] Confirm my stage.",
    routeLocale: "en",
  });
  assert(journeyEcho.status === "ok", "Journey fixture echo send must succeed");
  const assistant = journeyEcho.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(assistant, "Journey fixture echo requires assistant content");
  assertIncludes(assistant.content, "stageId=awakening", "Echo correct stage from memory progress");
  assertIncludes(assistant.content, "state=in_progress", "Echo correct state from memory progress");

  // Does not invent citations without marker
  const noCite = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "Plain note without citation marker.",
    routeLocale: "en",
  });
  assert(noCite.status === "ok", "Non-citation send must succeed");
  const plainAssistant = noCite.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(plainAssistant, "Plain assistant reply required");
  assertEqual(
    plainAssistant.citations?.length ?? 0,
    0,
    "Must not invent citations without marker",
  );
  assertNotIncludes(
    JSON.stringify(plainAssistant),
    "fixture-ai-disclosure",
    "Plain assistant message must not invent citation ids without marker",
  );
}
