import {
  isPrivacyRequestType,
  type PrivacyRequestType,
} from "@/lib/privacy/catalog";

const INCIDENT_PATTERN =
  /\b(data breach|data exposure|exposed data|leaked|hacked|unauthorized (access|disclosure)|security incident|doxx)\b/i;

const TYPE_PATTERNS: Array<[PrivacyRequestType, RegExp]> = [
  ["DELETION", /\b(delete|erase|remove|right to be forgotten|close my account|cancel my data)\b/i],
  ["EXPORT", /\b(export|download my data|portable copy|copy of my (data|information)|data portability)\b/i],
  ["ACCESS", /\b(access my (data|information)|what (data|information) do you (have|hold|store)|see my (data|information))\b/i],
  ["CORRECTION", /\b(correct|inaccurate|wrong name|update my (name|information|profile)|fix my (name|email))\b/i],
  [
    "CONSENT_WITHDRAWAL",
    /\b(withdraw consent|opt[- ]out|disable (lumina )?memory|stop using my (data|information)|revoke consent)\b/i,
  ],
];

export type PrivacyClassification =
  | { kind: "incident" }
  | { kind: "rights"; type: PrivacyRequestType };

export function classifyPrivacyText(
  selectedType: string | undefined,
  subject: string,
  message: string,
): PrivacyClassification {
  const haystack = `${subject}\n${message}`;
  if (INCIDENT_PATTERN.test(haystack)) {
    return { kind: "incident" };
  }
  if (selectedType && isPrivacyRequestType(selectedType)) {
    return { kind: "rights", type: selectedType };
  }
  for (const [type, pattern] of TYPE_PATTERNS) {
    if (pattern.test(haystack)) {
      return { kind: "rights", type };
    }
  }
  return { kind: "rights", type: "INQUIRY" };
}

export function isPrivacyRightsIntake(
  category: string,
  subject: string,
  message: string,
): boolean {
  if (INCIDENT_PATTERN.test(`${subject}\n${message}`)) return false;
  if (category === "PRIVACY") return true;
  const classified = classifyPrivacyText(undefined, subject, message);
  return classified.kind === "rights" && classified.type !== "INQUIRY"
    ? true
    : /\b(privacy rights?|gdpr|ccpa|delete my (account|data)|export my data)\b/i.test(
        `${subject}\n${message}`,
      );
}
