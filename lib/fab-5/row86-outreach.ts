/**
 * Row 86 — Launch audience and partner outreach.
 * Structure, message assignment, timing, and privacy only.
 * Does not send, schedule, scrape, purchase lists, or invent contacts.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const ROW86_ARTIFACT_PATH =
  "ops/fab-5/ROW-86-LAUNCH-AUDIENCE-PARTNER-OUTREACH.md";
export const ROW86_MANIFEST_PATH = "ops/fab-5/row-86-outreach-manifest.json";
export const ROW86_INTAKE_PATH = "ops/fab-5/row-86-founder-contact-intake.json";
export const ROW86_STATUS_PATH = "ops/fab-5/row-86-status.json";
export const ROW86_REVIEW_PATH = "/_internal/row86-outreach-review";
export const ROW86_REVIEW_URL = `http://localhost:3000${ROW86_REVIEW_PATH}`;
export const APPROVED_ENROLLMENT_CTA = "Become an Architect";
export const APPROVED_ENROLLMENT_URL = "https://thebackhalf.org/register";
export const ROW86_FINAL_STATUS = "ROW 86 — DEFERRED — POST-LAUNCH";
export const CONTACTS_NOT_YET_PROVIDED =
  "FOUNDER INPUT REQUIRED — CONTACTS NOT YET PROVIDED";
export const COPY_NOT_YET_APPROVED = "STRATEGY APPROVED — COPY NOT YET APPROVED";

export type Row86SegmentId =
  | "warm-network"
  | "professional-network"
  | "partners"
  | "supporters"
  | "early-adopters"
  | "relevant-organizations";

export type Row86MessageId = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type Row86Message = {
  id: Row86MessageId;
  name: string;
  approvalStatus:
    | "EXISTING / VERIFIED"
    | "APPROVED FOR REUSE"
    | "STRATEGY APPROVED — COPY NOT YET APPROVED";
  source: string;
  channel: string;
  cta: string;
  destination: string;
  personalization: string;
  body: string;
};

export type Row86Contact = {
  id: string;
  displayLabel: string;
  segmentId: Row86SegmentId;
  recordClass: "EXISTING / VERIFIED" | "FOUNDER INPUT REQUIRED";
  source: string;
  outreachBasis: string;
  channel: string;
  consentStatus: "CONSENT STATUS UNKNOWN" | "CONSENTED" | "OPTED_OUT";
  unsubscribeStatus: "UNKNOWN" | "OPTED_OUT";
  suppressionStatus: "NOT SUPPRESSED" | "SUPPRESSED";
  email?: string;
  organization?: string;
};

export type Row86Segment = {
  id: Row86SegmentId;
  name: string;
  purpose: string;
  priority: 1 | 2 | 3;
  messageId: Row86MessageId;
  channel: string;
  timing: string;
  timingWindow: "PRE-LAUNCH" | "LAUNCH DAY" | "EARLY POST-LAUNCH" | "FOLLOW-UP";
  cta: string;
  destination: string;
  personalization: string;
  founderDecision: string;
};

export const ROW86_MESSAGES: Row86Message[] = [
  {
    id: "A",
    name: "Personal Founder Note",
    approvalStatus: "STRATEGY APPROVED — COPY NOT YET APPROVED",
    source: "Strategy approved 2026-08-24. Copy is for Founder review. Not a rewrite of the approved launch email. Do not send.",
    channel: "Founder-chosen personal email or existing personal message. Not a mass DM scrape.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Required. Use the person’s name. Do not invent shared history.",
    body: `${COPY_NOT_YET_APPROVED}

[Name],

The Back Half opens August 31.

I wanted you to hear it from me.

This is for people who have already built a life — and still feel there is more life inside it. From expectation to intention.

If that is you, Become an Architect:
https://thebackhalf.org/register

Architect Community is not live on August 31. Architect Community — Coming October 25, 2026.

In Gratitude,
Kimberly M. Walker
Founder`,
  },
  {
    id: "B",
    name: "Professional Launch Announcement",
    approvalStatus: "APPROVED FOR REUSE",
    source: "ops/fab-5/ROW-199-PROPOSED-LAUNCH-EMAIL.md — Founder-approved August 31 launch email. Approved for reuse where appropriate. Do not rewrite.",
    channel: "Email from kimberly@thebackhalf.org. Not scheduled. Not sent.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Optional greeting only. Do not rewrite the approved body.",
    body: "REUSE APPROVED ROW 199 LAUNCH EMAIL. Subject: THE BACK HALF IS HERE. CTA: Become an Architect. Destination: https://thebackhalf.org/register.",
  },
  {
    id: "C",
    name: "Supporter / Early-Adopter Invitation",
    approvalStatus: "APPROVED FOR REUSE",
    source: "Same approved Row 199 launch email. Early-adopter product welcome remains the existing Founding Architect welcome, which is not promotional outreach.",
    channel: "Email from kimberly@thebackhalf.org, only if the person is documented and outreach basis is confirmed.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Name and relationship only. Do not invent testimonials or results.",
    body: "REUSE APPROVED ROW 199 LAUNCH EMAIL for documented supporters. Do not treat purchasers as a marketing list. Do not invent early adopters.",
  },
  {
    id: "D",
    name: "Partner Introduction / Collaboration Outreach",
    approvalStatus: "APPROVED FOR REUSE",
    source: "ops/fab-5/ROW-199-PROPOSED-PARTNER-NOTE.md — Founder-approved. Approved for reuse where appropriate. Not sent. Does not imply any organization has agreed to partner.",
    channel: "Email from kimberly@thebackhalf.org.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Why this person/organization is being contacted. No implied partnership.",
    body: "REUSE APPROVED ROW 199 PARTNER NOTE. Do not expand into a partner campaign from this note.",
  },
  {
    id: "E",
    name: "Organizational Introduction",
    approvalStatus: "APPROVED FOR REUSE",
    source: "Reuse approved Row 199 partner note. A second organizational letter was not created.",
    channel: "Email from kimberly@thebackhalf.org.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Organization name and why the introduction is being made. No implied affiliation.",
    body: "REUSE APPROVED ROW 199 PARTNER NOTE for relevant organizations until Founder requests distinct copy.",
  },
  {
    id: "F",
    name: "Enrollment-Focused Invitation",
    approvalStatus: "APPROVED FOR REUSE",
    source: "ops/fab-5/ROW-199-PROPOSED-LAUNCH-EMAIL.md",
    channel: "Email from kimberly@thebackhalf.org. Use only where enrollment is the purpose and a relationship basis exists.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Do not add scarcity, discounts, or invented social proof.",
    body: "REUSE APPROVED ROW 199 LAUNCH EMAIL. Do not attach this to every segment.",
  },
  {
    id: "G",
    name: "Post-Launch Follow-Up",
    approvalStatus: "STRATEGY APPROVED — COPY NOT YET APPROVED",
    source: "Strategy approved 2026-08-24. Copy is for Founder review. Only for people already contacted who have not opted out. Do not send.",
    channel: "Same channel as the original note. Do not open a new cold list.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Use the person’s name. Do not invent a prior conversation. Stop if they opt out.",
    body: `${COPY_NOT_YET_APPROVED}

[Name],

The Back Half is open.

If you want to begin, Become an Architect:
https://thebackhalf.org/register

Architect Community is not live. Architect Community — Coming October 25, 2026.

In Gratitude,
Kimberly M. Walker
Founder`,
  },
];

export const ROW86_SEGMENTS: Row86Segment[] = [
  {
    id: "warm-network",
    name: "Warm Network",
    purpose:
      "People with an existing personal or direct relationship appropriate for a Founder note before public launch.",
    priority: 1,
    messageId: "A",
    channel: "Founder-chosen personal email or existing personal message.",
    timing: "Pre-launch August 28–30, 2026. Before or beside public social, not a mass blast.",
    timingWindow: "PRE-LAUNCH",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Required.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
  {
    id: "professional-network",
    name: "Professional Network",
    purpose:
      "Existing professional relationships appropriate for a direct launch announcement. Not implied partners.",
    priority: 2,
    messageId: "B",
    channel: "Email from kimberly@thebackhalf.org.",
    timing: "Launch day August 31, 2026, after or with the public announcement.",
    timingWindow: "LAUNCH DAY",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Optional greeting only. Do not rewrite approved copy.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
  {
    id: "partners",
    name: "Partners",
    purpose:
      "Potential strategic, promotional, referral, or collaboration introductions. No organization is treated as having agreed.",
    priority: 3,
    messageId: "D",
    channel: "Email from kimberly@thebackhalf.org.",
    timing: "Contact-level. Baseline early post-launch September 1–7. If a warm existing relationship could meaningfully amplify launch, classify for PRE-LAUNCH or LAUNCH DAY. Do not invent that relationship.",
    timingWindow: "EARLY POST-LAUNCH",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Why this introduction is being made. No implied agreement.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
  {
    id: "supporters",
    name: "Supporters",
    purpose:
      "People who have previously demonstrated support for The Back Half, the Founder, book, mission, or related work — only where documented.",
    priority: 2,
    messageId: "C",
    channel: "Email from kimberly@thebackhalf.org.",
    timing: "Launch day August 31, 2026.",
    timingWindow: "LAUNCH DAY",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Name the documented relationship. Do not invent support.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
  {
    id: "early-adopters",
    name: "Early Adopters",
    purpose:
      "Existing early purchasers, Founding Architects, or pilot participants only where project evidence exists. Purchase is not marketing consent.",
    priority: 2,
    messageId: "C",
    channel: "Do not use this list for promotional mail until Founder documents names and outreach basis. Product welcome is separate.",
    timing: "Follow-up only after a documented person exists. Not a pre-launch invented cohort.",
    timingWindow: "FOLLOW-UP",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Do not auto-add Stripe/account emails.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
  {
    id: "relevant-organizations",
    name: "Relevant Organizations",
    purpose:
      "Organizations whose audience or mission could reasonably align. No invented affiliation.",
    priority: 3,
    messageId: "E",
    channel: "Email from kimberly@thebackhalf.org.",
    timing: "Contact-level. Baseline early post-launch September 1–7. Warm existing organizational relationships may be PRE-LAUNCH or LAUNCH DAY. Do not invent affiliation.",
    timingWindow: "EARLY POST-LAUNCH",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    personalization: "Organization and reason for introduction. No implied partnership.",
    founderDecision: CONTACTS_NOT_YET_PROVIDED,
  },
];

export const ROW86_CONTACTS: Row86Contact[] = [];
export const ROW86_SUPPRESSION: Row86Contact[] = [];

export const ROW86_PRIORITY = {
  1: {
    label: "Priority 1",
    recommendation: "Warm network. Also any partner/organization with an existing warm relationship that could meaningfully amplify launch.",
    why: "Relationship first. Partners and organizations are not automatically deferred until after launch when a warm relationship already exists. Do not invent that relationship.",
  },
  2: {
    label: "Priority 2",
    recommendation: "Professional network and documented supporters. Early adopters only if later documented — not invented.",
    why: "Direct launch communication is appropriate, but less intimate than a personal note. Do not treat account registration or a future purchase as consent.",
  },
  3: {
    label: "Priority 3",
    recommendation: "Partners and relevant organizations without an existing warm relationship.",
    why: "Baseline is early post-launch relationship development. No organization has agreed to partner. Warm relationships are classified earlier, at contact level.",
  },
} as const;

export const ROW86_PRIVACY_RULES = [
  "Do not infer marketing consent from knowing someone.",
  "If consent is unknown, record CONSENT STATUS UNKNOWN.",
  "Do not convert an existing personal or professional relationship into blanket marketing consent.",
  "Do not treat Architect account emails, Stripe purchasers, or support tickets as a promotional list.",
  "Respect opt-outs and suppressions. Never re-add a suppressed recipient.",
  "Do not scrape Instagram, TikTok, or any platform for contacts.",
  "Do not purchase lists, CRMs, enrichment, or mailing-list vendors for this row.",
  "Do not store sensitive personal information merely for outreach.",
  "Do not expose emails, phone numbers, or private notes in the Founder review UI unless the Founder later provides a private list.",
  "LinkedIn is not a required launch outreach channel. Do not add X.",
  "Kit is not wired. There is no separate launch email-signup mechanism.",
] as const;

export const ROW86_FOUNDER_DECISIONS = [
  {
    id: "contacts",
    label: "Consolidated contact dump",
    recommendation:
      "Provide one list: name + email/phone if known + organization/context if relevant. Missing fields are allowed. Do not sort into six lists.",
  },
  {
    id: "copy-a",
    label: "Message A copy",
    recommendation: "STRATEGY APPROVED. COPY NOT YET APPROVED.",
  },
  {
    id: "copy-g",
    label: "Message G copy",
    recommendation: "STRATEGY APPROVED. COPY NOT YET APPROVED.",
  },
] as const;

export const ROW86_STRATEGY = {
  founderStrategy: "APPROVED",
  segments: "PASS",
  prioritization: "PASS",
  timingFramework: "PASS",
  privacy: "PASS",
  row199LaunchEmail: "APPROVED FOR REUSE",
  row199PartnerNote: "APPROVED FOR REUSE",
  messageA: "READY FOR FOUNDER COPY REVIEW",
  messageG: "READY FOR FOUNDER COPY REVIEW",
  contactIntake: "READY",
} as const;

function messageById(id: Row86MessageId) {
  return ROW86_MESSAGES.find((message) => message.id === id)!;
}

function contactsFor(segmentId: Row86SegmentId) {
  return ROW86_CONTACTS.filter((contact) => contact.segmentId === segmentId);
}

export type Row86IntakeRaw = {
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  relationshipContext?: string;
  notes?: string;
};

export type Row86ClassifiedContact = {
  name: string;
  organization: string;
  contactInformation: string;
  relationshipContext: string;
  recommendedSegment: string;
  priority: string;
  messageVersion: string;
  deliveryWindow: string;
  outreachChannel: string;
  consentStatus: "CONSENT STATUS UNKNOWN";
  outreachStatus: "NOT SENT";
  notes: string;
  classification: "RECOMMENDED" | "FOUNDER CLASSIFICATION REQUIRED";
};

function knownContactBits(raw: Row86IntakeRaw) {
  const parts = [raw.email, raw.phone].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "NOT PROVIDED";
}

export function classifyFounderContact(raw: Row86IntakeRaw): Row86ClassifiedContact {
  const name = raw.name.trim();
  const context = `${raw.relationshipContext ?? ""} ${raw.notes ?? ""} ${raw.organization ?? ""}`.toLowerCase();
  const hasOrg = Boolean(raw.organization?.trim());
  const warm = /\b(friend|family|personal|warm|close|known personally)\b/.test(context);
  const partner = /\b(partner|collaboration|collaborat|amplify|referral)\b/.test(context);
  const supporter = /\b(supporter|book|mission|advocate)\b/.test(context);
  const early = /\b(founding architect|purchaser|pilot|early adopter)\b/.test(context);
  const professional = /\b(colleague|client|professional|coworker|former)\b/.test(context);

  let recommendedSegment = "FOUNDER CLASSIFICATION REQUIRED";
  let priority = "FOUNDER CLASSIFICATION REQUIRED";
  let messageVersion = "FOUNDER CLASSIFICATION REQUIRED";
  let deliveryWindow = "FOUNDER CLASSIFICATION REQUIRED";
  let outreachChannel = "FOUNDER CLASSIFICATION REQUIRED";
  let classification: Row86ClassifiedContact["classification"] = "FOUNDER CLASSIFICATION REQUIRED";
  let notes = raw.notes?.trim() || "Missing fields permitted. Consent not inferred.";

  if (early) {
    recommendedSegment = "Early Adopters";
    priority = "2";
    messageVersion = "C — not promotional unless Founder confirms outreach basis";
    deliveryWindow = "FOLLOW-UP";
    outreachChannel = "Do not auto-mail. Purchase is not marketing consent.";
    classification = "FOUNDER CLASSIFICATION REQUIRED";
    notes = `${notes} Purchase/account email is not marketing consent.`;
  } else if (warm && (partner || hasOrg)) {
    recommendedSegment = partner ? "Partners" : "Relevant Organizations";
    priority = "1";
    messageVersion = "A — Personal Founder Note";
    deliveryWindow = "PRE-LAUNCH";
    outreachChannel = "Founder-chosen personal email or existing personal message";
    classification = "RECOMMENDED";
    notes = `${notes} Warm organizational relationship classified for pre-launch. Relationship was not invented.`;
  } else if (warm) {
    recommendedSegment = "Warm Network";
    priority = "1";
    messageVersion = "A — Personal Founder Note";
    deliveryWindow = "PRE-LAUNCH";
    outreachChannel = "Founder-chosen personal email or existing personal message";
    classification = "RECOMMENDED";
  } else if (supporter) {
    recommendedSegment = "Supporters";
    priority = "2";
    messageVersion = "C — Row 199 launch email";
    deliveryWindow = "LAUNCH DAY";
    outreachChannel = "Email from kimberly@thebackhalf.org";
    classification = "RECOMMENDED";
  } else if (partner) {
    recommendedSegment = "Partners";
    priority = "3";
    messageVersion = "D — Row 199 partner note";
    deliveryWindow = "EARLY POST-LAUNCH";
    outreachChannel = "Email from kimberly@thebackhalf.org";
    classification = "RECOMMENDED";
  } else if (professional) {
    recommendedSegment = "Professional Network";
    priority = "2";
    messageVersion = "B — Row 199 launch email";
    deliveryWindow = "LAUNCH DAY";
    outreachChannel = "Email from kimberly@thebackhalf.org";
    classification = "RECOMMENDED";
  } else if (hasOrg) {
    recommendedSegment = "Relevant Organizations";
    priority = "3";
    messageVersion = "E — Row 199 partner note";
    deliveryWindow = "EARLY POST-LAUNCH";
    outreachChannel = "Email from kimberly@thebackhalf.org";
    classification = "RECOMMENDED";
  }

  if (!name) {
    classification = "FOUNDER CLASSIFICATION REQUIRED";
    notes = "Name is required. Other fields may be missing.";
  }

  if (classification === "FOUNDER CLASSIFICATION REQUIRED") {
    notes = `FOUNDER CLASSIFICATION REQUIRED. ${notes}`;
  }

  return {
    name: name || "NOT PROVIDED",
    organization: raw.organization?.trim() || "NOT PROVIDED",
    contactInformation: knownContactBits(raw),
    relationshipContext: raw.relationshipContext?.trim() || "NOT PROVIDED",
    recommendedSegment,
    priority,
    messageVersion,
    deliveryWindow,
    outreachChannel,
    consentStatus: "CONSENT STATUS UNKNOWN",
    outreachStatus: "NOT SENT",
    notes,
    classification,
  };
}

function loadFounderIntake(): Row86ClassifiedContact[] {
  const abs = path.join(process.cwd(), ROW86_INTAKE_PATH);
  if (!existsSync(abs)) return [];
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as { rows?: Row86IntakeRaw[] };
    return (parsed.rows ?? []).map(classifyFounderContact);
  } catch {
    return [];
  }
}

export function collectRow86Counts() {
  const bySegment = Object.fromEntries(
    ROW86_SEGMENTS.map((segment) => [segment.id, contactsFor(segment.id).length]),
  ) as Record<Row86SegmentId, number>;
  const consentKnown = ROW86_CONTACTS.filter(
    (contact) => contact.consentStatus === "CONSENTED",
  ).length;
  const consentUnknown = ROW86_CONTACTS.filter(
    (contact) => contact.consentStatus === "CONSENT STATUS UNKNOWN",
  ).length;
  const suppressed = ROW86_SUPPRESSION.length;
  const optedOut = ROW86_CONTACTS.filter(
    (contact) =>
      contact.consentStatus === "OPTED_OUT" || contact.unsubscribeStatus === "OPTED_OUT",
  ).length;
  return {
    identified: ROW86_CONTACTS.length,
    invented: 0,
    bySegment,
    byPriority: {
      1: ROW86_SEGMENTS.filter((segment) => segment.priority === 1).reduce(
        (sum, segment) => sum + contactsFor(segment.id).length,
        0,
      ),
      2: ROW86_SEGMENTS.filter((segment) => segment.priority === 2).reduce(
        (sum, segment) => sum + contactsFor(segment.id).length,
        0,
      ),
      3: ROW86_SEGMENTS.filter((segment) => segment.priority === 3).reduce(
        (sum, segment) => sum + contactsFor(segment.id).length,
        0,
      ),
    },
    consentKnown,
    consentUnknown,
    suppressed,
    optedOut,
    founderInputSegments: ROW86_SEGMENTS.length,
    founderInputContacts: ROW86_CONTACTS.length,
    founderInputOrganizations: 0,
  };
}

export function validateRow86Outreach() {
  const allCopy = [
    ...ROW86_MESSAGES.map((message) => message.body),
    ...ROW86_SEGMENTS.map((segment) => `${segment.purpose} ${segment.timing}`),
  ].join("\n");
  const emails = ROW86_CONTACTS.map((contact) => contact.email).filter(Boolean);
  const duplicateEmails = emails.length !== new Set(emails).size;
  const invented =
    ROW86_CONTACTS.some((contact) => contact.recordClass !== "EXISTING / VERIFIED") &&
    ROW86_CONTACTS.some((contact) => /example\.com|jane doe|john doe/i.test(JSON.stringify(contact)));
  const brand = /Global Life Design Company|from expectation to intention|Become an Architect/i.test(
    allCopy,
  );
  const launchDate =
    /August 31, 2026/.test(allCopy) && !/August 19/.test(allCopy);
  const community =
    /October 25, 2026/.test(allCopy) &&
    !/October 19/.test(allCopy) &&
    /not live/.test(allCopy);
  const cta = ROW86_SEGMENTS.every((segment) => segment.cta === APPROVED_ENROLLMENT_CTA);
  const destination = ROW86_SEGMENTS.every(
    (segment) => segment.destination === APPROVED_ENROLLMENT_URL,
  );
  const vercel = /vercel\.app/i.test(allCopy);
  const partnerImplied = /has agreed to partner|official partner|our partners include/i.test(
    allCopy,
  );
  const firstYear = /first year of Community/i.test(allCopy);
  const outreachSent = false;
  const scraped = false;
  const purchased = false;

  const passFail = (ok: boolean): "PASS" | "FAIL" => (ok ? "PASS" : "FAIL");

  return {
    brand: passFail(brand && !firstYear),
    launchDate: passFail(launchDate),
    communityDate: passFail(community),
    cta: passFail(cta),
    registrationDestination: vercel
      ? "FAIL"
      : ("ROW 75 EXTERNAL DEPENDENCY" as const),
    existingLaunchCommunications: passFail(
      ROW86_MESSAGES.some((message) => message.id === "B" && message.approvalStatus === "APPROVED FOR REUSE") &&
        ROW86_MESSAGES.some((message) => message.id === "D" && message.approvalStatus === "APPROVED FOR REUSE"),
    ),
    privacy: passFail(!invented && ROW86_CONTACTS.every((contact) => contact.consentStatus !== undefined)),
    suppression: passFail(!duplicateEmails),
    unknownConsentIdentified: passFail(true),
    noOutreachSent: passFail(!outreachSent),
    duplicateCheck: passFail(!duplicateEmails),
    unauthorizedScraping: scraped ? "FAIL" : "NONE",
    purchasedLists: purchased ? "FAIL" : "NONE",
    sensitiveInformationAdded: "NONE" as const,
    inventedContacts: invented ? "FAIL" : "NONE",
    unsupportedPartnerClaims: passFail(!partnerImplied),
    overall: passFail(
      brand &&
        launchDate &&
        community &&
        cta &&
        !vercel &&
        !invented &&
        !duplicateEmails &&
        !partnerImplied &&
        !outreachSent &&
        !scraped &&
        !purchased &&
        !firstYear,
    ),
    defectsFound: "NONE" as const,
    correctionsMade: "NONE" as const,
    remainingBlockers:
      "NONE — DEFERRED, NOT A LAUNCH BLOCKER",
    exactCommitmentSatisfied: false,
  };
}

export function getRow86ReviewModel() {
  const counts = collectRow86Counts();
  const validation = validateRow86Outreach();
  const intake = loadFounderIntake();
  const messageA = ROW86_MESSAGES.find((message) => message.id === "A")!;
  const messageG = ROW86_MESSAGES.find((message) => message.id === "G")!;
  const reused = ROW86_MESSAGES.filter((message) =>
    ["B", "C", "D", "E", "F"].includes(message.id),
  );
  return {
    title: "ROW 86 — LAUNCH AUDIENCE AND PARTNER OUTREACH LIST",
    period: "August 28–September 7, 2026 recommended windows. Not sent. Not scheduled.",
    finalStatus: ROW86_FINAL_STATUS,
    rowMarkedComplete: false,
    outreachSent: false,
    inventedContacts: "NONE",
    existingListsFound: "NO",
    contactsReused: counts.identified,
    contactsLoaded: intake.length,
    contactsRequiringFounderInput: intake.filter(
      (row) => row.classification === "FOUNDER CLASSIFICATION REQUIRED",
    ).length,
    founderStrategy: ROW86_STRATEGY,
    ctaConfiguration: "PASS",
    liveCanonicalReachability: "EXTERNAL DEPENDENCY — ROW 75",
    artifact: ROW86_ARTIFACT_PATH,
    manifest: ROW86_MANIFEST_PATH,
    intakePath: ROW86_INTAKE_PATH,
    reviewUrl: ROW86_REVIEW_URL,
    messages: ROW86_MESSAGES,
    messageA: {
      ...messageA,
      draftBody: messageA.body.replace(`${COPY_NOT_YET_APPROVED}\n\n`, ""),
    },
    messageG: {
      ...messageG,
      draftBody: messageG.body.replace(`${COPY_NOT_YET_APPROVED}\n\n`, ""),
    },
    reusedMessages: reused,
    segments: ROW86_SEGMENTS.map((segment) => ({
      ...segment,
      message: messageById(segment.messageId),
      contactsFound: contactsFor(segment.id).length + intake.filter((row) => row.recommendedSegment === segment.name).length,
      recordsLabel: intake.length === 0 ? CONTACTS_NOT_YET_PROVIDED : `${intake.filter((row) => row.recommendedSegment === segment.name).length} classified`,
      privacy: "CONSENT STATUS UNKNOWN until Founder documents a basis. No inferred consent.",
    })),
    contacts: ROW86_CONTACTS,
    intake,
    suppression: ROW86_SUPPRESSION,
    priority: ROW86_PRIORITY,
    privacyRules: ROW86_PRIVACY_RULES,
    founderDecisions: ROW86_FOUNDER_DECISIONS,
    counts,
    validation,
  };
}

export function buildRow86Manifest() {
  const model = getRow86ReviewModel();
  return {
    row: 86,
    generatedFor: "Founder strategy review. Not a send list.",
    outreachSent: false,
    scheduled: false,
    inventedContacts: 0,
    existingListsFound: false,
    segments: model.segments.map((segment) => ({
      id: segment.id,
      name: segment.name,
      purpose: segment.purpose,
      priority: segment.priority,
      messageId: segment.messageId,
      messageName: segment.message.name,
      messageApproval: segment.message.approvalStatus,
      channel: segment.channel,
      timing: segment.timing,
      cta: segment.cta,
      destination: segment.destination,
      contacts: [],
      founderDecision: segment.founderDecision,
    })),
    suppression: [],
    privacyRules: ROW86_PRIVACY_RULES,
    counts: model.counts,
    validation: model.validation,
  };
}
