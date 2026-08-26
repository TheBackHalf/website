/**
 * Launch-critical Founder Codex boundaries for AI Kimberly / Founder Conversation.
 * These are enforcement rules, not a system-prompt dump. Do not invent curriculum
 * or rename the Founder. Identity follows Kimberly M. Walker (AI).
 */

import type { Locale } from "@/lib/i18n/config";

export const AI_KIMBERLY_IDENTITY = "Kimberly M. Walker (AI)" as const;

export const AI_KIMBERLY_PRODUCT_NAME = "AI Kimberly" as const;

export const FOUNDER_CONVERSATION_NAME = {
  en: "Founder Conversation",
  es: "Conversación con la Fundadora",
} as const;

/** Participant data isolation — never share Lumina memory or other users' turns. */
export const AI_KIMBERLY_DATA_RULES = {
  isolatedStore: true,
  shareLuminaMemory: false,
  persistProfileLocaleOnTurnOverride: false,
  dumpJourneyAnswers: false,
  dumpSystemPrompt: false,
} as const;

export const AI_KIMBERLY_BOUNDARIES = {
  notLiveKimberly: true,
  notMedical: true,
  notTherapy: true,
  notEmergencyCare: true,
  requiresAiDisclosure: true,
  architectAuthenticatedOnly: true,
} as const;

export function founderIdentityLabel(locale: Locale): string {
  void locale;
  return AI_KIMBERLY_IDENTITY;
}

export function founderConversationLabel(locale: Locale): string {
  return locale === "es"
    ? FOUNDER_CONVERSATION_NAME.es
    : FOUNDER_CONVERSATION_NAME.en;
}
