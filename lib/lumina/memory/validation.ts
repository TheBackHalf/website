const SECRET_KEY_PATTERN =
  /(password|passwd|pwd|secret|api[_-]?key|token|authorization|credit.?card|card.?number|cvv|ssn|private[_-]?key)/i;

const MAX_TEXT_LENGTH = 2000;
const MAX_KEY_LENGTH = 120;

export function payloadContainsSecretLikeKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => payloadContainsSecretLikeKeys(entry));
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      return true;
    }
    if (payloadContainsSecretLikeKeys(nested)) {
      return true;
    }
  }
  return false;
}

export function normalizeMemoryText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) {
    return null;
  }
  return trimmed;
}

export function normalizeMemoryKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) {
    return null;
  }
  return trimmed;
}

/** Explicit remember marker — only durable when memory is enabled. */
export const LUMINA_REMEMBER_MARKER = "[remember]";

export function extractExplicitRememberText(content: string): string | null {
  const index = content.indexOf(LUMINA_REMEMBER_MARKER);
  if (index < 0) {
    return null;
  }
  const after = content.slice(index + LUMINA_REMEMBER_MARKER.length).trim();
  if (!after) {
    return null;
  }
  return normalizeMemoryText(after);
}
