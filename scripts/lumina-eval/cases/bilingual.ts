import { getAuthStore } from "@/lib/auth/store";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import type { Dictionary } from "@/content/i18n/types";
import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { buildStubAssistantReply } from "@/lib/lumina/conversation";
import { resolveLuminaLocale } from "@/lib/lumina/language/resolve-locale";
import { detectLuminaTurnLocaleOverride } from "@/lib/lumina/language/turn-override";
import {
  retrieveLuminaMemoryForUser,
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

function assertLuminaDictionaryKeys(dict: Dictionary, locale: "en" | "es"): void {
  const lumina = dict.appShell.lumina;
  const required = [
    "title",
    "description",
    "emptyTitle",
    "emptyBody",
    "composerLabel",
    "composerPlaceholder",
    "send",
    "sending",
    "responding",
    "retry",
    "errorGeneric",
    "citationsLabel",
    "externalLinkHint",
    "architectLabel",
    "luminaLabel",
    "disclosureLink",
    "memoryActive",
    "memoryInactive",
  ] as const;

  for (const key of required) {
    const value = lumina[key];
    assert(
      typeof value === "string" && value.trim().length > 0,
      `${locale} dictionary must include appShell.lumina.${key}`,
    );
  }
  assert(
    typeof dict.appShell.metadata.lumina.title === "string",
    `${locale} appShell.metadata.lumina.title must exist`,
  );
}

export async function runBilingualCases(users: EvalUsers): Promise<void> {
  const { userA } = users;

  // Locale priority: turnOverride → routeLocale → profileLocale → default
  assertEqual(
    resolveLuminaLocale({
      turnOverride: "es",
      routeLocale: "en",
      profileLocale: "en",
    }),
    "es",
    "Turn override wins",
  );
  assertEqual(
    resolveLuminaLocale({
      routeLocale: "es",
      profileLocale: "en",
    }),
    "es",
    "Route locale beats profile",
  );
  assertEqual(
    resolveLuminaLocale({ profileLocale: "es" }),
    "es",
    "Profile locale used when no route/turn",
  );
  assertEqual(resolveLuminaLocale({}), "en", "Default locale is en");

  const enStub = buildStubAssistantReply("Need guidance.", { locale: "en" });
  const esStub = buildStubAssistantReply("Necesito orientación.", { locale: "es" });
  assertIncludes(enStub.content, "I've received", "EN stub language marker");
  assertIncludes(esStub.content, "He recibido", "ES stub language marker");
  assert(
    /[áéíóúñ]/i.test(esStub.content) || /\bversión\b/i.test(esStub.content),
    "ES stub should include natural Spanish markers/diacritics",
  );
  assertNotIncludes(enStub.content, "He recibido", "EN stub must not use ES phrasing");

  assertLuminaDictionaryKeys(enDictionary, "en");
  assertLuminaDictionaryKeys(esDictionary, "es");

  await setLuminaMemoryEnabledForUser(userA.id, true);
  await writeLuminaMemoryForUser(userA.id, {
    summary: { text: "Bilingual durable note", source: "explicit" },
    progress: {
      chapterId: "chapter-1-awakening",
      status: "in_progress",
    },
  });

  const beforeLocale = (await getAuthStore().findUserById(userA.id))?.locale;
  assertEqual(beforeLocale, "en", "Fixture user A starts in English");

  const conversation = await withFreshConversation(userA.id);
  const override = detectLuminaTurnLocaleOverride(
    "Please respond in Spanish about my Journey.",
  );
  assertEqual(override, "es", "Turn override detector recognizes Spanish request");

  const switched = await sendLuminaMessageForUser(userA.id, {
    conversationId: conversation.id,
    content: "Please respond in Spanish about my Journey. [fixture-journey-context]",
    routeLocale: "en",
  });
  assert(switched.status === "ok", "Language-switch send must succeed");
  const assistant = switched.conversation.messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  assert(assistant, "Language-switch assistant required");
  assertIncludes(assistant.content, "Contexto de Journey", "Turn override uses Spanish stub");
  assertIncludes(assistant.content, "stageId=awakening", "Language switch must not corrupt journey echo");

  const afterUser = await getAuthStore().findUserById(userA.id);
  assertEqual(afterUser?.locale, "en", "Turn override must not overwrite profile locale");

  const memoryAfter = await retrieveLuminaMemoryForUser(userA.id);
  assert(
    memoryAfter?.durable.summaries.some((entry) =>
      entry.text.includes("Bilingual durable note"),
    ),
    "Language switch must not corrupt durable memory",
  );
  assertEqual(
    memoryAfter?.durable.progress?.chapterId ?? null,
    "chapter-1-awakening",
    "Language switch must not corrupt journey progress memory",
  );
}
