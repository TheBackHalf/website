import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { buildStubAssistantReply } from "@/lib/lumina/conversation";
import { LUMINA_VOICE_NOTES } from "@/lib/lumina/language/voice";
import { brandedTerm } from "@/lib/lumina/language/terminology";
import {
  assert,
  assertIncludes,
  assertNonEmptyString,
  assertNotIncludes,
} from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

const BANNED_GENERIC_AI = [
  "As an AI",
  "as an AI",
  "I'm just a language model",
  "I am just a language model",
  "I'm an AI language model",
  "As a language model",
];

const TONE_BANNED = [
  "lol",
  "lmao",
  "yo ",
  "bro",
  "hey bestie",
  "no cap",
  "fr fr",
];

const SCENARIOS = [
  { tone: "supportive", prompt: "I feel stuck and need encouragement." },
  { tone: "instructional", prompt: "Explain the next step I should take." },
  { tone: "reflective", prompt: "Help me reflect on what changed this week." },
  { tone: "corrective", prompt: "I think I misunderstood the Journey stage." },
  { tone: "neutral", prompt: "Acknowledge that you received this note." },
] as const;

function assertVoiceQuality(content: string, locale: "en" | "es"): void {
  assertNonEmptyString(content, "Stub reply must be non-empty");
  for (const phrase of BANNED_GENERIC_AI) {
    assertNotIncludes(content, phrase, "Stub must avoid generic AI disclaimers");
  }
  for (const phrase of TONE_BANNED) {
    assert(
      !content.toLowerCase().includes(phrase),
      "Stub must avoid chatty slang markers",
      phrase,
    );
  }
  assertIncludes(content, brandedTerm("lumina", locale), "Reply should include Lumina branding");
  if (locale === "es") {
    assertMatchesSpanish(content);
  }
}

function assertMatchesSpanish(content: string): void {
  assert(
    /[áéíóúñ¿¡]/i.test(content) ||
      /\b(he recibido|versión|mensaje|contexto)\b/i.test(content),
    "Spanish stub should use natural Spanish phrasing/diacritics",
  );
  void LUMINA_VOICE_NOTES.es;
}

export async function runVoiceCases(users: EvalUsers): Promise<void> {
  void LUMINA_VOICE_NOTES.en;

  for (const scenario of SCENARIOS) {
    const conversation = await withFreshConversation(users.userA.id);
    const result = await sendLuminaMessageForUser(users.userA.id, {
      conversationId: conversation.id,
      content: `[${scenario.tone}] ${scenario.prompt}`,
      routeLocale: "en",
    });
    assert(result.status === "ok", `Voice ${scenario.tone} send must succeed`);
    const assistant = result.conversation.messages.filter((m) => m.role === "assistant").at(-1);
    assert(assistant, `Voice ${scenario.tone} must produce assistant reply`);
    assertVoiceQuality(assistant.content, "en");
  }

  const esDirect = buildStubAssistantReply("Necesito orientación calmada.", {
    locale: "es",
  });
  assertVoiceQuality(esDirect.content, "es");

  const enDirect = buildStubAssistantReply("Need calm guidance.", { locale: "en" });
  assertVoiceQuality(enDirect.content, "en");
  assertNotIncludes(enDirect.content, "He recibido", "EN reply must not use ES phrasing");
}
