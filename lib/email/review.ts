import { isSmtpReady } from "@/lib/auth/email/smtp";
import {
  DEFAULT_TRANSACTIONAL_FROM,
  DEFAULT_TRANSACTIONAL_REPLY_TO,
  TRANSACTIONAL_EMAIL_PROVIDER_LABEL,
  TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
  isTransactionalEmailConfigured,
  resolveFromAddress,
  transactionalEmailPublicConfig,
} from "@/lib/email/config";
import { getDeliverabilitySnapshot } from "@/lib/email/monitor";
import { getEmailDurability } from "@/lib/email/store";

export type Row146ReviewModel = {
  row: 146;
  deliverable: "Configure Transactional Email";
  technicalOwner: "Imani Heartbeat — Chief Technology & Risk Officer";
  supportingOwner: "Michelle Northstar — Chief of Staff & Operations Officer";
  founderAcceptance: null;
  rowComplete: false;
  secretsDisplayed: false;
  dnsNotMutated: true;
  provider: {
    id: "google_workspace_smtp";
    label: string;
    resendNotProvisioned: true;
    row72LockHonored: true;
  };
  sender: {
    domain: string;
    defaultFrom: string;
    replyTo: string;
    fromAllowed: boolean;
    smtpReady: boolean;
    configured: boolean;
  };
  durability: ReturnType<typeof getEmailDurability>;
  capabilities: {
    suppression: "implemented";
    bounceHandling: "implemented";
    unsubscribe: "implemented";
    deliverabilityMonitoring: "implemented";
  };
  deliverability: Awaited<ReturnType<typeof getDeliverabilitySnapshot>>;
  remaining: string[];
  publicConfig: ReturnType<typeof transactionalEmailPublicConfig>;
};

export async function getRow146ReviewModel(): Promise<Row146ReviewModel> {
  const deliverability = await getDeliverabilitySnapshot({ includeTest: true });
  const remaining: string[] = [];
  if (!isSmtpReady()) {
    remaining.push("SMTP environment is incomplete in this runtime.");
  }
  if (!resolveFromAddress().allowed) {
    remaining.push("SMTP_FROM must be an @thebackhalf.org mailbox.");
  }
  if (
    deliverability.dns.spf !== "pass" ||
    deliverability.dns.dkim !== "pass" ||
    deliverability.dns.dmarc !== "pass"
  ) {
    remaining.push(
      "SPF/DKIM/DMARC DNS records are Founder-owned (Cloudflare). This row does not modify DNS.",
    );
  }
  remaining.push(
    "Founder acceptance remains with Kimberly Walker (human). This row is not marked Complete.",
  );

  return {
    row: 146,
    deliverable: "Configure Transactional Email",
    technicalOwner: "Imani Heartbeat — Chief Technology & Risk Officer",
    supportingOwner: "Michelle Northstar — Chief of Staff & Operations Officer",
    founderAcceptance: null,
    rowComplete: false,
    secretsDisplayed: false,
    dnsNotMutated: true,
    provider: {
      id: "google_workspace_smtp",
      label: TRANSACTIONAL_EMAIL_PROVIDER_LABEL,
      resendNotProvisioned: true,
      row72LockHonored: true,
    },
    sender: {
      domain: TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
      defaultFrom: DEFAULT_TRANSACTIONAL_FROM,
      replyTo: DEFAULT_TRANSACTIONAL_REPLY_TO,
      fromAllowed: resolveFromAddress().allowed,
      smtpReady: isSmtpReady(),
      configured: isTransactionalEmailConfigured(),
    },
    durability: getEmailDurability(),
    capabilities: {
      suppression: "implemented",
      bounceHandling: "implemented",
      unsubscribe: "implemented",
      deliverabilityMonitoring: "implemented",
    },
    deliverability,
    remaining,
    publicConfig: transactionalEmailPublicConfig(),
  };
}
