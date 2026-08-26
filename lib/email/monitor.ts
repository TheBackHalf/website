import { Resolver } from "node:dns/promises";
import { isSmtpReady } from "@/lib/auth/email/smtp";
import {
  BOUNCE_RATE_ALERT,
  COMPLAINT_RATE_ALERT,
  DELIVERABILITY_ALERT_MIN_SENDS,
  resolveFromAddress,
  TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
} from "@/lib/email/config";
import { getEmailStore } from "@/lib/email/store";
import type { EmailDeliverabilitySnapshot } from "@/lib/email/types";

const DNS_TIMEOUT_MS = 3000;

async function resolveTxt(name: string): Promise<string[] | null> {
  try {
    const resolver = new Resolver();
    const lookup = resolver.resolveTxt(name);
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), DNS_TIMEOUT_MS);
    });
    const records = await Promise.race([lookup, timeout]);
    if (!records) return null;
    return records.map((parts) => parts.join(""));
  } catch {
    return [];
  }
}

function classifyDns(
  records: string[] | null,
  needle: string,
): "pass" | "missing" | "unknown" {
  if (records === null) return "unknown";
  if (records.some((row) => row.toLowerCase().includes(needle.toLowerCase()))) {
    return "pass";
  }
  return "missing";
}

export async function inspectSenderDns(): Promise<
  EmailDeliverabilitySnapshot["dns"]
> {
  const [spf, dmarc, dkim] = await Promise.all([
    resolveTxt(TRANSACTIONAL_EMAIL_SENDER_DOMAIN),
    resolveTxt(`_dmarc.${TRANSACTIONAL_EMAIL_SENDER_DOMAIN}`),
    resolveTxt(`google._domainkey.${TRANSACTIONAL_EMAIL_SENDER_DOMAIN}`),
  ]);
  return {
    spf: classifyDns(spf, "v=spf1"),
    dmarc: classifyDns(dmarc, "v=dmarc1"),
    dkim: classifyDns(dkim, "v=dkim1"),
  };
}

export async function getDeliverabilitySnapshot(options?: {
  includeTest?: boolean;
}): Promise<EmailDeliverabilitySnapshot> {
  const events = await getEmailStore().listEvents({
    includeTest: options?.includeTest,
  });
  const sent = events.filter((event) => event.type === "sent").length;
  const failed = events.filter((event) => event.type === "failed").length;
  const suppressed = events.filter(
    (event) => event.type === "skipped_suppressed",
  ).length;
  const hardBounces = events.filter((event) => event.type === "bounce").length;
  const complaints = events.filter((event) => event.type === "complaint").length;
  const unsubscribes = events.filter(
    (event) => event.type === "unsubscribe",
  ).length;
  const denominator = sent + hardBounces + complaints;
  const bounceRate =
    denominator >= DELIVERABILITY_ALERT_MIN_SENDS
      ? hardBounces / denominator
      : null;
  const complaintRate =
    denominator >= DELIVERABILITY_ALERT_MIN_SENDS
      ? complaints / denominator
      : null;

  return {
    generatedAt: new Date().toISOString(),
    provider: "google_workspace_smtp",
    senderDomain: TRANSACTIONAL_EMAIL_SENDER_DOMAIN,
    smtpReady: isSmtpReady(),
    fromAddressAllowed: resolveFromAddress().allowed,
    totals: {
      sent,
      failed,
      suppressed,
      hardBounces,
      complaints,
      unsubscribes,
    },
    rates: {
      bounceRate,
      complaintRate,
    },
    alert: {
      bounceHigh: bounceRate !== null && bounceRate > BOUNCE_RATE_ALERT,
      complaintHigh:
        complaintRate !== null && complaintRate > COMPLAINT_RATE_ALERT,
    },
    dns: await inspectSenderDns(),
  };
}
