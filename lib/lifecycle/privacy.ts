const ALLOWED_PAYLOAD_KEYS = new Set([
  "chapterId",
  "status",
  "offerId",
  "ticketId",
  "stripeInvoiceId",
  "stripeSubscriptionId",
  "stripeCheckoutSessionId",
  "method",
  "source",
  "priority",
]);

const BLOCKED_KEY_PATTERN =
  /password|token|secret|cookie|card|pan|cvv|ssn|email|message|body|prompt|answer|journal/i;

export function sanitizeLifecyclePayload(
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!payload) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (BLOCKED_KEY_PATTERN.test(key)) continue;
    if (!ALLOWED_PAYLOAD_KEYS.has(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
    }
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}
