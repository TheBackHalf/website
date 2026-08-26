import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import {
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import {
  assert,
  assertEqual,
  assertIncludes,
  assertNonEmptyString,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

export async function runUsefulnessCases(users: EvalUsers): Promise<void> {
  const { userA } = users;
  const conversation = await withFreshConversation(userA.id);

  const relevant = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "I want help staying oriented in The Journey.",
    routeLocale: "en",
  });
  assert(relevant.status === "ok", "Useful send must succeed");
  const firstAssistant = relevant.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(firstAssistant, "Useful reply required");
  assertNonEmptyString(firstAssistant.content, "Useful reply must be non-empty");
  assertIncludes(firstAssistant.content, "Lumina", "Reply should stay product-relevant");

  const withCitations = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-citations] Please include references.",
    routeLocale: "en",
  });
  assert(withCitations.status === "ok", "Citation fixture send must succeed");
  const cited = withCitations.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(cited, "Citation assistant reply required");
  assert((cited.citations?.length ?? 0) >= 1, "fixture-citations must provide links");
  assert(
    cited.citations?.some((entry) => typeof entry.href === "string" && entry.href.length > 0),
    "Citations must include href links",
  );

  // Retry after force-error works without duplicating user message incorrectly
  const forced = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[force-error] usefulness retry probe",
    routeLocale: "en",
  });
  assert(forced.status === "error", "force-error must return error status");
  assert(forced.conversation, "force-error must return conversation");
  const beforeCount = forced.conversation.messages.filter(
    (m) => m.role === "user" && m.content.includes("usefulness retry probe"),
  ).length;
  assertEqual(beforeCount, 1, "force-error must persist exactly one user message");

  const retried = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    mode: "retry",
  });
  assert(retried.status === "ok", "Retry after force-error must succeed");
  const userMessages = retried.conversation.messages.filter((m) => m.role === "user");
  const forceUserCount = userMessages.filter((m) =>
    m.content.includes("usefulness retry probe"),
  ).length;
  assertEqual(forceUserCount, 1, "Retry must not duplicate the user message");
  assert(
    retried.conversation.messages.some(
      (m) => m.role === "assistant" && m.content.length > 0,
    ),
    "Retry must append an assistant reply",
  );

  // Journey-aware fixture helps next-step awareness via stage echo
  await setLuminaMemoryEnabledForUser(userA.id, true);
  await writeLuminaMemoryForUser(userA.id, {
    progress: {
      chapterId: "chapter-2-mirror",
      status: "in_progress",
    },
  });
  const stageAware = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-journey-context] What should I focus on next?",
    routeLocale: "en",
  });
  assert(stageAware.status === "ok", "Stage-aware send must succeed");
  const stageAssistant = stageAware.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(stageAssistant, "Stage-aware assistant required");
  assertIncludes(stageAssistant.content, "stageId=mirror", "Stage echo supports next-step awareness");
  assertIncludes(stageAssistant.content, "state=in_progress", "State echo supports orientation");
}
