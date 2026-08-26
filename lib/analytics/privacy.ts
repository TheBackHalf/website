const BLOCKED_KEYS = new Set([
  "password",
  "passwordconfirm",
  "passwordhash",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "verificationcode",
  "verificationtoken",
  "authorization",
  "cookie",
  "secret",
  "cvv",
  "cvc",
  "cardnumber",
  "pan",
  "expirymonth",
  "expiryyear",
  "prompt",
  "message",
  "content",
  "text",
  "body",
  "answer",
  "answers",
  "response",
  "responses",
  "reflection",
  "journal",
  "conversation",
  "luminaresponse",
  "luminaprompt",
]);

const ALLOWED_KEYS = new Set([
  "offerId",
  "kind",
  "status",
  "source",
  "medium",
  "campaign",
  "content",
  "postDate",
  "assetId",
  "assetType",
  "template",
  "journeyAccess",
  "communityAccess",
  "communitySubscriptionStatus",
  "hasPaidPurchase",
  "hasFailedPurchase",
  "hasRefundedPurchase",
  "stripeCheckoutSessionId",
  "stripePaymentIntentId",
  "stripeSubscriptionId",
  "stripeInvoiceId",
  "stripeChargeId",
  "stripeCustomerId",
  "stripePriceId",
  "recoveredPurchases",
  "recoveredEntitlements",
  "updatedPurchases",
  "updatedEntitlements",
  "eventVersion",
  "locale",
  "productArea",
  "path",
  "page",
  "cta",
  "destination",
  "method",
  "step",
  "sequence",
  "chapterId",
  "sectionId",
  "progressPercent",
  "anonymousId",
  "deviceCategory",
  "referrerHost",
  "errorCategory",
  "errorCode",
  "latencyMs",
  "conversationId",
  "responseStatus",
  "offerName",
  "amountCents",
  "currency",
  "identity",
  "eventName",
]);

const SENSITIVE_VALUE =
  /(password|passwd|secret|bearer\s+[a-z0-9._-]+|sk_live_|sk_test_|whsec_|cvv|cvc)/i;

const CARD_VALUE = /\b(?:\d[ -]*?){13,19}\b/;

export type SanitizedPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

export function isBlockedAnalyticsKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return BLOCKED_KEYS.has(normalized);
}

export function looksSensitiveAnalyticsValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.length > 240) return true;
  return SENSITIVE_VALUE.test(value) || CARD_VALUE.test(value);
}

export function sanitizeAnalyticsPayload(
  payload: Record<string, unknown> | undefined,
): SanitizedPayload | undefined {
  if (!payload) return undefined;
  const safe: SanitizedPayload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (isBlockedAnalyticsKey(key)) continue;
    if (!ALLOWED_KEYS.has(key)) continue;
    if (looksSensitiveAnalyticsValue(value)) continue;
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      // utm_content / asset id uses key "content" which is blocked as conversation
      // content. Attribution content is stored as assetId.
      if (key === "content" && typeof value === "string" && /^R\d{2,3}-/.test(value)) {
        safe.assetId = value;
        continue;
      }
      if (key === "content") continue;
      safe[key] = value;
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

export function payloadContainsProhibitedData(
  payload: Record<string, unknown> | undefined,
): string[] {
  if (!payload) return [];
  const hits: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (isBlockedAnalyticsKey(key) && key !== "content") {
      hits.push(`blocked_key:${key}`);
    }
    if (looksSensitiveAnalyticsValue(value)) {
      hits.push(`sensitive_value:${key}`);
    }
  }
  return hits;
}
