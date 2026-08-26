import { getSmtpConfig, isSmtpReady } from "@/lib/auth/email/smtp";
import { normalizeEmail } from "@/lib/auth/normalize-email";

export const TRANSACTIONAL_EMAIL_SENDER_DOMAIN = "thebackhalf.org";
export const TRANSACTIONAL_EMAIL_PROVIDER_ID = "google_workspace_smtp" as const;
export const TRANSACTIONAL_EMAIL_PROVIDER_LABEL = "Google Workspace SMTP";
export const DEFAULT_TRANSACTIONAL_FROM = "support@thebackhalf.org";
export const DEFAULT_TRANSACTIONAL_REPLY_TO = "support@thebackhalf.org";
export const DEFAULT_TRANSACTIONAL_FROM_NAME = "The Back Half";

/** Hard-bounce rate that triggers deliverability attention (once volume exists). */
export const BOUNCE_RATE_ALERT = 0.05;
/** Complaint rate that triggers deliverability attention (once volume exists). */
export const COMPLAINT_RATE_ALERT = 0.001;
export const DELIVERABILITY_ALERT_MIN_SENDS = 20;

export function parseEmailAddress(value: string | undefined): {
  name: string;
  address: string;
} | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const angle = trimmed.match(/^(.*)<([^>]+)>$/);
  const address = normalizeEmail(angle ? angle[2]! : trimmed);
  if (!address.includes("@") || address.startsWith("@") || address.endsWith("@")) {
    return null;
  }
  return {
    name: angle ? angle[1]!.replaceAll('"', "").trim() : "",
    address,
  };
}

export function emailDomain(address: string): string {
  return normalizeEmail(address).split("@")[1] ?? "";
}

export function isAllowedSenderDomain(address: string): boolean {
  return emailDomain(address) === TRANSACTIONAL_EMAIL_SENDER_DOMAIN;
}

export function configuredFromAddress(): string {
  const config = getSmtpConfig();
  const from = parseEmailAddress(config.from)?.address;
  if (from && isAllowedSenderDomain(from)) return from;
  const user = parseEmailAddress(config.user)?.address;
  if (user && isAllowedSenderDomain(user)) return user;
  return DEFAULT_TRANSACTIONAL_FROM;
}

export function resolveFromAddress(requested?: string): {
  address: string;
  allowed: boolean;
  reason?: string;
} {
  const configured = configuredFromAddress();
  if (!requested?.trim()) {
    return {
      address: configured,
      allowed: isAllowedSenderDomain(configured),
      reason: isAllowedSenderDomain(configured)
        ? undefined
        : "configured_from_not_on_sender_domain",
    };
  }
  const parsed = parseEmailAddress(requested);
  if (!parsed) {
    return {
      address: configured,
      allowed: false,
      reason: "invalid_from_address",
    };
  }
  if (!isAllowedSenderDomain(parsed.address)) {
    return {
      address: parsed.address,
      allowed: false,
      reason: "from_not_on_sender_domain",
    };
  }
  const smtpFrom = parseEmailAddress(getSmtpConfig().from)?.address;
  const smtpUser = parseEmailAddress(getSmtpConfig().user)?.address;
  if (
    smtpFrom &&
    parsed.address !== smtpFrom &&
    parsed.address !== smtpUser
  ) {
    return {
      address: parsed.address,
      allowed: false,
      reason: "from_not_authenticated_mailbox",
    };
  }
  return { address: parsed.address, allowed: true };
}

export function isTransactionalEmailConfigured(): boolean {
  if (!isSmtpReady()) return false;
  return resolveFromAddress().allowed;
}

export function transactionalEmailPublicConfig() {
  return {
    provider: TRANSACTIONAL_EMAIL_PROVIDER_ID,
    providerLabel: TRANSACTIONAL_EMAIL_PROVIDER_LABEL,
    senderDomain: TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
    defaultFrom: DEFAULT_TRANSACTIONAL_FROM,
    replyTo: DEFAULT_TRANSACTIONAL_REPLY_TO,
    configured: isTransactionalEmailConfigured(),
    smtpReady: isSmtpReady(),
    fromAddressAllowed: resolveFromAddress().allowed,
    resendNotUsed: true,
  };
}
