/**
 * Sender identification for outbound email.
 * Physical mailing address is required for commercial/marketing messages
 * (CAN-SPAM). It is never invented: production must set
 * EMAIL_SENDER_PHYSICAL_ADDRESS. Marketing sends fail closed without it.
 */

export const MARKETING_SENDER = {
  brandName: "The Back Half",
  legalName: "KLW Group, LLC",
  fromName: "The Back Half",
  replyTo: "privacy@thebackhalf.org",
} as const;

export const TRANSACTIONAL_SENDER = {
  brandName: "The Back Half",
  legalName: "KLW Group, LLC",
  fromName: "The Back Half",
} as const;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getConfiguredPhysicalAddress(): string | undefined {
  return readEnv("EMAIL_SENDER_PHYSICAL_ADDRESS");
}

export function isUsablePhysicalAddress(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length < 8) return false;
  if (/^(tbd|todo|placeholder|unknown|n\/?a|none)$/i.test(trimmed)) {
    return false;
  }
  return true;
}

export function requirePhysicalAddress():
  | { ok: true; address: string }
  | { ok: false; error: string } {
  const address = getConfiguredPhysicalAddress();
  if (!isUsablePhysicalAddress(address)) {
    return {
      ok: false,
      error:
        "EMAIL_SENDER_PHYSICAL_ADDRESS is missing or unusable. Marketing email cannot be sent without a valid physical postal address.",
    };
  }
  return { ok: true, address: address!.replace(/\s+/g, " ").trim() };
}

export function marketingFromName(): string {
  return MARKETING_SENDER.fromName;
}

export function marketingReplyTo(): string {
  return readEnv("EMAIL_MARKETING_REPLY_TO") ?? MARKETING_SENDER.replyTo;
}
