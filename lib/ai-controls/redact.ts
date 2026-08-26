/** Local redact so ai-controls does not import live-runner (cycle). Never log values. */
export function redactAiControlText(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-openai-key]")
    .replace(/sk_live_[A-Za-z0-9]+/g, "[redacted-stripe-live]")
    .replace(/sk_test_[A-Za-z0-9]+/g, "[redacted-stripe-test]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted-webhook]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/OPENAI_API_KEY\s*[:=]\s*\S+/gi, "OPENAI_API_KEY=[redacted]");
}
