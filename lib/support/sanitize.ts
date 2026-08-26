const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const CVV = /\b(cvv|cvc|security code)\b[:\s-]*\d{3,4}\b/gi;
const PASSWORD =
  /\b(password|passcode|one[ -]?time code|otp|magic link)\b[:\s-]*\S+/gi;

export function redactSensitive(text: string): { text: string; redacted: boolean } {
  const next = text
    .replace(CARD, "[redacted-payment]")
    .replace(CVV, "[redacted-cvv]")
    .replace(PASSWORD, "[redacted-credential]");
  return { text: next, redacted: next !== text };
}

export function containsProhibitedSensitive(text: string): boolean {
  return redactSensitive(text).redacted;
}

export function issueFingerprint(category: string, subject: string): string {
  const normalized = subject
    .toLowerCase()
    .replace(/bh-s-\d{8}-[a-z0-9]+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${category}:${normalized.slice(0, 80)}`;
}
