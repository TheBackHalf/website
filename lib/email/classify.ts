import { normalizeEmail } from "@/lib/auth/normalize-email";
import type { BounceClass } from "@/lib/email/types";

const HARD_BOUNCE_PATTERNS = [
  /user unknown/i,
  /mailbox unavailable/i,
  /recipient rejected/i,
  /does not exist/i,
  /no such user/i,
  /unknown user/i,
  /invalid recipient/i,
  /address rejected/i,
  /5\.1\.1/,
  /5\.1\.2/,
  /5\.1\.3/,
  /550[- ]5\.1/,
  /550[- ]5\.4\.1/,
  /551 /,
  /553 /,
  /inactive recipient/i,
  /account disabled/i,
];

const SOFT_BOUNCE_PATTERNS = [
  /mailbox full/i,
  /over quota/i,
  /try again later/i,
  /temporarily deferred/i,
  /greylist/i,
  /4\.2\.2/,
  /4\.3\.1/,
  /4\.4\.1/,
  /421 /,
  /450 /,
  /451 /,
  /452 /,
];

const COMPLAINT_PATTERNS = [
  /feedback-type:\s*abuse/i,
  /feedback-type:\s*complaint/i,
  /spam complaint/i,
  /reported as spam/i,
];

const BOUNCE_FROM_LOCALS = new Set([
  "mailer-daemon",
  "postmaster",
  "mail-daemon",
  "noreply-dmarc",
]);

export function classifyDeliveryError(message: string | undefined): BounceClass {
  if (!message?.trim()) return "none";
  if (COMPLAINT_PATTERNS.some((pattern) => pattern.test(message))) {
    return "complaint";
  }
  if (HARD_BOUNCE_PATTERNS.some((pattern) => pattern.test(message))) {
    return "hard";
  }
  if (SOFT_BOUNCE_PATTERNS.some((pattern) => pattern.test(message))) {
    return "soft";
  }
  return "none";
}

export function isSystemBounceSender(fromEmail: string): boolean {
  const local = normalizeEmail(fromEmail).split("@")[0] ?? "";
  return BOUNCE_FROM_LOCALS.has(local);
}

export function extractBouncedRecipient(input: {
  headers?: string;
  subject?: string;
  text?: string;
}): string | null {
  const blob = [input.headers, input.subject, input.text].filter(Boolean).join("\n");
  const patterns = [
    /final-recipient:\s*(?:rfc822;)?\s*([^\s;]+@[^\s;]+)/i,
    /original-recipient:\s*(?:rfc822;)?\s*([^\s;]+@[^\s;]+)/i,
    /x-failed-recipients:\s*([^\s;]+@[^\s;]+)/i,
    /(?:the recipient address|recipient)[:\s]+<?([^\s<>;]+@[^\s<>;]+)>?/i,
  ];
  for (const pattern of patterns) {
    const match = blob.match(pattern);
    if (match?.[1]) return normalizeEmail(match[1]);
  }
  return null;
}

export function classifyInboundMessage(input: {
  fromEmail: string;
  subject?: string;
  text?: string;
  headers?: string;
}): {
  class: "bounce" | "complaint" | "none";
  recipient: string | null;
} {
  const blob = `${input.subject ?? ""}\n${input.text ?? ""}\n${input.headers ?? ""}`;
  if (COMPLAINT_PATTERNS.some((pattern) => pattern.test(blob))) {
    return {
      class: "complaint",
      recipient: extractBouncedRecipient(input),
    };
  }
  const bounceSubject =
    /undeliver/i.test(input.subject ?? "") ||
    /delivery status notification/i.test(input.subject ?? "") ||
    /mail delivery failed/i.test(input.subject ?? "") ||
    /returned mail/i.test(input.subject ?? "") ||
    /failure notice/i.test(input.subject ?? "");
  if (isSystemBounceSender(input.fromEmail) || bounceSubject) {
    return {
      class: "bounce",
      recipient: extractBouncedRecipient(input),
    };
  }
  return { class: "none", recipient: null };
}
