import { recordUnsubscribe } from "@/lib/email/list";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export type UnsubscribeOutcome =
  | { status: "unsubscribed"; email: string; alreadySuppressed: boolean }
  | { status: "invalid"; error: string };

export async function processUnsubscribeRequest(
  token: string | null | undefined,
  source = "unsubscribe_link",
): Promise<UnsubscribeOutcome> {
  const parsed = parseUnsubscribeToken(token);
  if (!parsed.ok) {
    return { status: "invalid", error: parsed.error };
  }
  const result = await recordUnsubscribe({
    email: parsed.email,
    source,
  });
  return {
    status: "unsubscribed",
    email: result.email,
    alreadySuppressed: result.alreadySuppressed,
  };
}

export function isOneClickBody(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed) return true;
  return /list-unsubscribe=one-click/i.test(trimmed);
}
