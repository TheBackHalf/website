import { randomBytes } from "node:crypto";

import { VOA_ID_PREFIX } from "@/lib/voice-of-architect/catalog";
import { issueFingerprint, redactSensitive } from "@/lib/support/sanitize";
import type { VoiceOfArchitectCategory } from "@/lib/voice-of-architect/catalog";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createVoiceOfArchitectId(at = new Date()): string {
  const stamp = at.toISOString().slice(0, 10).replaceAll("-", "");
  const bytes = randomBytes(5);
  let suffix = "";
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `${VOA_ID_PREFIX}-${stamp}-${suffix}`;
}

export function voiceOfArchitectIdFromText(value: string): string | undefined {
  const match = value.match(/BH-VOA-\d{8}-[A-Z0-9]{5,}/i);
  return match ? match[0].toUpperCase() : undefined;
}

export function voiceOfArchitectFingerprint(
  category: VoiceOfArchitectCategory,
  summary: string,
): string {
  return issueFingerprint(category, redactSensitive(summary).text);
}
