import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { buildStubAssistantReply } from "@/lib/lumina/conversation";
import { brandedTerm } from "@/lib/lumina/language/terminology";
import {
  setLuminaMemoryEnabledForUser,
  writeLuminaMemoryForUser,
} from "@/lib/lumina/memory/service";
import { assert, assertEqual, assertIncludes } from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

export async function runConsistencyCases(users: EvalUsers): Promise<void> {
  const { userA } = users;
  const prompt = "Consistency probe: stay with me through this Journey note.";

  const directA = buildStubAssistantReply(prompt, { locale: "en" });
  const directB = buildStubAssistantReply(prompt, { locale: "en" });
  assertEqual(
    directA.content,
    directB.content,
    "Deterministic stub must return stable content for same prompt",
  );

  await setLuminaMemoryEnabledForUser(userA.id, true);
  await writeLuminaMemoryForUser(userA.id, {
    progress: {
      chapterId: "chapter-3-decision",
      status: "in_progress",
    },
  });

  const conversation = await withFreshConversation(userA.id);
  const first = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-journey-context] Check stage consistency.",
    routeLocale: "en",
  });
  assert(first.status === "ok", "First consistency send must succeed");
  const firstAssistant = first.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(firstAssistant, "First assistant reply required");

  const second = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "[fixture-journey-context] Check stage consistency again.",
    routeLocale: "en",
  });
  assert(second.status === "ok", "Second consistency send must succeed");
  const secondAssistant = second.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(secondAssistant, "Second assistant reply required");

  assertIncludes(firstAssistant.content, "stageId=decision", "Stage fixture must echo decision");
  assertIncludes(secondAssistant.content, "stageId=decision", "Stage must stay consistent");
  assertIncludes(firstAssistant.content, "state=in_progress", "State must echo in_progress");
  assertIncludes(secondAssistant.content, "state=in_progress", "State must remain stable");

  assertIncludes(
    firstAssistant.content,
    brandedTerm("journey", "en"),
    "Branded Journey terminology must stay stable",
  );
  assertIncludes(
    secondAssistant.content,
    brandedTerm("journey", "en"),
    "Branded Journey terminology must remain stable across sends",
  );
  assertEqual(
    brandedTerm("lumina", "en"),
    brandedTerm("lumina", "es"),
    "Branded Lumina spelling is locale-stable",
  );
}
