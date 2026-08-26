/**
 * Approved bilingual Founder Conversation stub replies.
 * Natural Spanish — not literal calques. Branded names stay stable.
 * Boundaries from the Founder Codex / AI Disclosure are preserved in both locales.
 */

import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath } from "@/lib/i18n/routing";
import {
  AI_KIMBERLY_IDENTITY,
  founderConversationLabel,
} from "@/lib/ai-kimberly/codex";

export const AI_KIMBERLY_FORCE_ERROR_MARKER = "[force-error]";

const MEDICAL_PATTERN =
  /\b(diagnos(?:e|is|ing|ticar(?:me|te|le|nos|les)?)|diagn[oó]stic\w*|prescri(?:be|ption)|suicid(?:e|al|io)|self[- ]harm|overdose|emergency|911|terapia|psiquiat\w*|receta)\b/i;

const INJECTION_PATTERN =
  /\b(system prompt|ignore previous instructions|api[_ -]?key|process\.env|BEGIN PRIVATE KEY)\b/i;

const LIVE_KIMBERLY_PATTERN =
  /\b(are you (the )?real kimberly|talk to kimberly (in person|live)|hablar con kimberly (en vivo|de verdad)|eres la kimberly real)\b/i;

const IDENTITY_PATTERN =
  /\b(who are you|are you (an? )?ai|what is ai kimberly|qui[eé]n eres|eres (una )?ia|qu[eé] es ai kimberly)\b/i;

export function contentRequestsForceError(content: string): boolean {
  return content.includes(AI_KIMBERLY_FORCE_ERROR_MARKER);
}

export function buildFounderAssistantReply(
  userContent: string,
  locale: Locale,
): { content: string } {
  const conversationName = founderConversationLabel(locale);
  const disclosurePath = getLocalizedPath("/legal/ai-disclosure", locale);

  if (INJECTION_PATTERN.test(userContent)) {
    return {
      content:
        locale === "es"
          ? `No puedo revelar instrucciones internas, claves ni datos privados. Soy ${AI_KIMBERLY_IDENTITY}, una representación digital autorizada para esta ${conversationName}. Tu conversación permanece con esta cuenta de Architect.`
          : `I cannot reveal internal instructions, keys, or private data. I am ${AI_KIMBERLY_IDENTITY}, an authorized digital representation for this ${conversationName}. Your conversation stays with this Architect account.`,
    };
  }

  if (MEDICAL_PATTERN.test(userContent)) {
    return {
      content:
        locale === "es"
          ? `No puedo ofrecer diagnóstico médico, tratamiento, terapia ni atención de emergencia. Si necesitas ayuda urgente, contacta a los servicios de emergencia locales. Puedo acompañarte en esta ${conversationName} educativa.`
          : `I cannot provide medical diagnosis, treatment, therapy, or emergency care. If you need urgent help, contact local emergency services. I can stay with you in this educational ${conversationName}.`,
    };
  }

  if (LIVE_KIMBERLY_PATTERN.test(userContent) || IDENTITY_PATTERN.test(userContent)) {
    return {
      content:
        locale === "es"
          ? `Soy ${AI_KIMBERLY_IDENTITY}: una representación digital autorizada de Kimberly M. Walker, no una conversación en vivo con ella. Esta ${conversationName} es educativa. La divulgación completa está en ${disclosurePath}.`
          : `I am ${AI_KIMBERLY_IDENTITY}: an authorized digital representation of Kimberly M. Walker, not a live conversation with her. This ${conversationName} is educational. The full disclosure is at ${disclosurePath}.`,
    };
  }

  return {
    content:
      locale === "es"
        ? `He recibido tu mensaje. Soy ${AI_KIMBERLY_IDENTITY}, una representación digital autorizada — no una conversación en vivo con Kimberly. Esta ${conversationName} se profundizará en una versión posterior. Tus palabras permanecen con esta cuenta de Architect.`
        : `I've received your message. I am ${AI_KIMBERLY_IDENTITY}, an authorized digital representation — not a live conversation with Kimberly. This ${conversationName} will deepen in a later release. Your words stay with this Architect account.`,
  };
}
