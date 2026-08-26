import {
  PRIORITY_RESPONSE_HOURS,
  type SupportOwner,
  type SupportPriority,
  type SupportTicketCategory,
} from "@/lib/support/catalog";

const CATEGORY_KEYWORDS: Array<[SupportTicketCategory, RegExp]> = [
  ["PRIVACY", /\b(privacy|doxx|personal data|data breach|exposed|ssn|social security)\b/i],
  ["PAYMENT_BILLING", /\b(payment|charge|charged|billing|refund|checkout|duplicate|stripe|card)\b/i],
  ["ACCOUNT_LOGIN", /\b(log ?in|password|sign ?in|access|locked out|authentication|otp)\b/i],
  ["REGISTRATION", /\b(register|registration|create account|sign ?up)\b/i],
  ["ONBOARDING", /\b(onboarding|getting started|welcome steps)\b/i],
  ["JOURNEY", /\b(journey|chapter|progress|save|resume|blueprint)\b/i],
  ["LUMINA", /\b(lumina)\b/i],
  ["DOWNLOADS_MATERIALS", /\b(download|worksheet|journal|certificate|pdf|materials)\b/i],
  ["MEMBERSHIP", /\b(membership|community|subscription)\b/i],
  ["TECHNICAL", /\b(error|bug|outage|down|500|crash|broken|timeout|system)\b/i],
  ["OTHER", /\b(other|something else|not listed)\b/i],
];

const P1_PATTERN =
  /\b(outage|down for everyone|data breach|security|hacked|hack|exposed data|cannot checkout|payment outage|site is down|account compromised|unauthorized access)\b/i;
const P2_PATTERN =
  /\b(cannot (log|sign) ?in|duplicate charge|charged twice|cannot register|lumina (not|isn't|is not) work|journey (won't|will not|cannot)|cannot access)\b/i;
const ACCOUNT_SECURITY_PATTERN =
  /\b(hacked|compromised|unauthorized (access|login)|stolen account|someone else (logged|is in|accessed))\b/i;
const LEGAL_PATTERN =
  /\b(attorney|lawyer|lawsuit|litigation|subpoena|regulator|legal threat)\b/i;
const REPUTATION_PATTERN =
  /\b(journalist|media inquiry|press|high-profile|scam|fraud accusation|defamation)\b/i;
const MATERIAL_ACCESS_PATTERN =
  /\b(cannot (continue|start|access|open|use)|materially preventing|after purchase)\b/i;

export function parseCategory(value: string): SupportTicketCategory | undefined {
  const key = value.trim().toUpperCase().replace(/[\s/-]+/g, "_");
  const aliases: Record<string, SupportTicketCategory> = {
    ACCOUNT: "ACCOUNT_LOGIN",
    LOGIN: "ACCOUNT_LOGIN",
    ACCOUNT_LOGIN: "ACCOUNT_LOGIN",
    PAYMENT: "PAYMENT_BILLING",
    BILLING: "PAYMENT_BILLING",
    PAYMENT_BILLING: "PAYMENT_BILLING",
    DOWNLOADS: "DOWNLOADS_MATERIALS",
    MATERIALS: "DOWNLOADS_MATERIALS",
    DOWNLOADS_MATERIALS: "DOWNLOADS_MATERIALS",
    REGISTRATION: "REGISTRATION",
    ONBOARDING: "ONBOARDING",
    JOURNEY: "JOURNEY",
    LUMINA: "LUMINA",
    MEMBERSHIP: "MEMBERSHIP",
    PRIVACY: "PRIVACY",
    TECHNICAL: "TECHNICAL",
    GENERAL: "GENERAL",
    OTHER: "OTHER",
  };
  return aliases[key];
}

export function classifyCategory(
  selected: string | undefined,
  subject: string,
  message: string,
): SupportTicketCategory {
  const parsed = selected ? parseCategory(selected) : undefined;
  if (parsed) return parsed;
  const haystack = `${subject}\n${message}`;
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(haystack)) return category;
  }
  return "GENERAL";
}

export function classifyPriority(
  category: SupportTicketCategory,
  subject: string,
  message: string,
): SupportPriority {
  const haystack = `${category} ${subject} ${message}`;
  if (category === "PRIVACY" || P1_PATTERN.test(haystack)) return "P1";
  if (ACCOUNT_SECURITY_PATTERN.test(haystack)) return "P1";
  if (category === "TECHNICAL" && /\b(outage|down|all architects|everyone)\b/i.test(haystack)) {
    return "P1";
  }
  if (category === "PAYMENT_BILLING" && /\b(outage|cannot pay|checkout (is )?down)\b/i.test(haystack)) {
    return "P1";
  }
  if (
    category === "ACCOUNT_LOGIN" ||
    category === "PAYMENT_BILLING" ||
    category === "REGISTRATION" ||
    category === "LUMINA" ||
    category === "JOURNEY" ||
    P2_PATTERN.test(haystack)
  ) {
    return "P2";
  }
  if (/\b(feedback|fyi|when you can|no rush)\b/i.test(haystack)) return "P4";
  return "P3";
}

export function responseDueAt(priority: SupportPriority, createdAt: Date): string {
  const due = new Date(createdAt.getTime() + PRIORITY_RESPONSE_HOURS[priority] * 60 * 60 * 1000);
  return due.toISOString();
}

export function slaStateFor(
  priority: SupportPriority,
  responseDueAtIso: string,
  now = new Date(),
): "within" | "approaching" | "overdue" | "urgent" {
  if (priority === "P1") return now.toISOString() > responseDueAtIso ? "overdue" : "urgent";
  const due = Date.parse(responseDueAtIso);
  if (!Number.isFinite(due)) return "within";
  if (now.getTime() > due) return "overdue";
  const remainingHours = (due - now.getTime()) / (1000 * 60 * 60);
  if (remainingHours <= 12) return "approaching";
  return "within";
}

export function defaultOwner(category: SupportTicketCategory): SupportOwner {
  if (
    category === "TECHNICAL" ||
    category === "PRIVACY" ||
    category === "PAYMENT_BILLING" ||
    category === "ACCOUNT_LOGIN"
  ) {
    return "michelle";
  }
  return "nia";
}

export function autoEscalationTargets(
  category: SupportTicketCategory,
  priority: SupportPriority,
  subject: string,
  message: string,
): { targets: SupportOwner[]; reason?: string } {
  const haystack = `${subject}\n${message}`;
  const targets = new Set<SupportOwner>();
  let reason: string | undefined;

  if (
    category === "PRIVACY" ||
    ACCOUNT_SECURITY_PATTERN.test(haystack) ||
    priority === "P1" ||
    /\b(security|breach|outage|exploit|data exposure)\b/i.test(haystack)
  ) {
    targets.add("imani");
    reason = "Technical, security, or privacy/security incident.";
  }

  if (
    category === "JOURNEY" ||
    category === "LUMINA" ||
    category === "ONBOARDING"
  ) {
    if (priority === "P1" || MATERIAL_ACCESS_PATTERN.test(haystack)) {
      targets.add("nia");
      reason = reason
        ? `${reason} Material Architect-experience failure.`
        : "Material Architect-experience failure.";
    }
  }

  if (LEGAL_PATTERN.test(haystack)) {
    targets.add("founder");
    reason = "Legal / reputational matter. Do not invent a legal@ mailbox.";
  }

  if (REPUTATION_PATTERN.test(haystack) && (priority === "P1" || LEGAL_PATTERN.test(haystack))) {
    targets.add("founder");
    targets.add("nia");
    reason = reason
      ? `${reason} Founder reputational/executive criteria met.`
      : "Founder reputational/executive criteria met.";
  }

  return { targets: [...targets], reason };
}
