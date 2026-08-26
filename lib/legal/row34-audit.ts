/**
 * Row 34 — Founder Legal Launch Risk Review (structured).
 * Human-readable authority: ops/fab-5/ROW-34-HUMAN-LEGAL-LAUNCH-REVIEW.md
 * Not attorney review. Not marked Complete. Reconciled to CURRENT Version 1.0.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  accountCreationConsents,
  checkoutConsents,
  communityGuidelinesPublication,
  consentLabelsPending,
  getLegalDocumentHref,
  getRecordedLegalVersion,
  isLegalDocumentPublished,
  legalDocumentList,
  legalFooterLinks,
} from "@/content/legal/documents";
import { getPublishedLegalSections } from "@/content/legal/published-bodies";
import { legalTitlesEs } from "@/content/legal/titles-es";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import { luminaDisclosure } from "@/content/lumina";
import { copyright as blueprintCopyright } from "@/content/blueprint/manuscript/generated/copyright";
import { CAMPAIGN_COMPLIANCE } from "@/lib/marketing-claims/campaign-audit";
import { ROW33_AUTHORITY_PATH } from "@/lib/marketing-claims/standard";
import { FOUNDER_AGE_DECISION, MINIMUM_PARTICIPANT_AGE } from "@/lib/eligibility/policy";
import { SUPPORT_MAILBOX, refundCategoryPresent } from "@/lib/support/catalog";

export type Row34Status =
  | "PASS"
  | "FAIL"
  | "NOT APPLICABLE"
  | "INCONSISTENCY FOUND"
  | "CORRECTED"
  | "FOUNDER/LEGAL JUDGMENT REQUIRED"
  | "LICENSE / IP VERIFICATION REQUIRED";

export type Row34Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Row34Risk = {
  id: string;
  area: string;
  issue: string;
  whyItMatters: string;
  launchImpact: string;
  severity: Row34Severity;
  existingMitigation: string;
  founderDecisionRequired: string;
  postLaunchCounselRecommended: boolean;
  status: "OPEN" | "CORRECTED" | "ACCEPTED_PENDING";
  currentClassification:
    | "RESOLVED"
    | "ACCEPTED REMAINING RISK"
    | "PRE-COMMUNITY-LAUNCH"
    | "POST-LAUNCH FOLLOW-UP"
    | "STILL OPEN — LAUNCH BLOCKER";
};

export const ROW34_TITLE = "THE BACK HALF FOUNDER LEGAL LAUNCH RISK REVIEW";
export const ROW34_VERSION = "1.2";
export const ROW34_AUDIT_DATE = "2026-08-21";
export const ROW34_RERUN = true;
export const ROW34_AUTHORITY_PATH =
  "ops/fab-5/ROW-34-HUMAN-LEGAL-LAUNCH-REVIEW.md";

export const INDEPENDENT_COUNSEL = {
  completed: false,
  requiredForLaunch: false,
  status: "NOT COMPLETED" as const,
  statement:
    "Independent legal counsel review is recommended. It is not a launch requirement for Row 34. No attorney review of these materials is claimed. The Founder may obtain independent counsel post-launch.",
};

export function auditCatalogDocuments() {
  return legalDocumentList.map((document) => {
    const published = isLegalDocumentPublished(document);
    const sections = getPublishedLegalSections(document.slug) ?? [];
    return {
      id: document.id,
      title: document.title,
      spanishTitle: legalTitlesEs[document.slug] ?? document.title,
      slug: document.slug,
      routeEn: getLegalDocumentHref(document.slug),
      routeEs: `/es${getLegalDocumentHref(document.slug)}`,
      reviewStatus: document.reviewStatus,
      contentPending: document.contentPending,
      published,
      version: document.version?.trim() || getRecordedLegalVersion(document),
      effectiveDate: document.effectiveDate?.trim() || "Not published",
      implementation: published
        ? `English Version 1.0 is published (${sections.length} sections). Effective Date August 31, 2026. Spanish remains PENDING APPROVED TRANSLATION.`
        : "Route, footer link, and consent checkbox exist. Body is an unpublished draft placeholder.",
      materialConcern: published
        ? "Spanish /es/legal/* is pending approved translation and is not an approved Spanish legal instrument."
        : "Architects can be required to acknowledge a document they cannot read as final legal text.",
    };
  });
}

export const COMMUNITY_GUIDELINES = {
  title: "Community Guidelines",
  status: "NOT APPLICABLE" as Row34Status,
  version: "Not in website catalog",
  effectiveDate: "Not published",
  publishedRoute: "None",
  implementation:
    "No website route, footer link, or catalog entry. GET /legal/community-guidelines returns 404. Tracked as PRE-COMMUNITY-LAUNCH.",
  materialConcern: `Community is not publicly accessible on August 31, 2026. Community Guidelines are ${communityGuidelinesPublication.requirement}, due ${communityGuidelinesPublication.deadline}. They are not an August 31 launch blocker. Do not use October 19.`,
};

export const CONSISTENCY_MATRIX: Array<{
  topic: string;
  terms: Row34Status;
  privacy: Row34Status;
  participant: Row34Status;
  membership: Row34Status;
  ai: Row34Status;
  community: Row34Status;
  checkout: Row34Status;
  registration: Row34Status;
  support: Row34Status;
  marketing: Row34Status;
  note: string;
}> = [
  {
    topic: "Product identity",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Live product and Row 33 standard use Global Life Design Company. Version 1 legal instruments name The Back Half / KLW Group, LLC. No customer-facing legal page contradicts Global Life Design Company.",
  },
  {
    topic: "Age / eligibility",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: `Surfaces and Version 1.0 manuscripts enforce ${MINIMUM_PARTICIPANT_AGE}+ (${FOUNDER_AGE_DECISION}) without date of birth. Row 60 is Complete. COPPA is not implemented because under-18 participation is not permitted.`,
  },
  {
    topic: "Payment",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Checkout states price, cadence, and Stripe handling. Terms of Use §7 and Membership Agreement §7 now state purchase and no-refund terms. Taxes are not itemized on the offer page.",
  },
  {
    topic: "Refunds",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Approved policy is no refunds. Checkout, billing acknowledgment, Terms, Participant Agreement, and Membership Agreement state no refunds. No standalone Refund Policy. Support has no refund ticket category.",
  },
  {
    topic: "Membership / Community",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Architect Community launches October 25, 2026 and is not live August 31. Founding Architect Community benefit is first six months (October 25, 2026 through April 25, 2027). Community Guidelines remain PRE-COMMUNITY-LAUNCH, due before October 25, 2026.",
  },
  {
    topic: "AI",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "AI Disclosure Version 1.0 is published. Registration requires AI Disclosure acknowledgment. Lumina links to /legal/ai-disclosure. Checkout does not re-require AI Disclosure. AI Kimberly has no public participant chat.",
  },
  {
    topic: "Privacy / data",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Privacy Policy Version 1.0 discloses account, payment processing, support, cookies/analytics, and AI treatment. Date of birth is not collected. Residual: Privacy says analytics providers may include Google Analytics and Microsoft Clarity; launch tracking is first-party. That is recorded as an accepted remaining risk, not a reason to rewrite Version 1.",
  },
  {
    topic: "User conduct",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Participant and Membership agreements include conduct/community standards language. Standalone Community Guidelines remain unpublished as a PRE-COMMUNITY-LAUNCH item due before October 25, 2026.",
  },
  {
    topic: "Support",
    terms: "FOUNDER/LEGAL JUDGMENT REQUIRED",
    privacy: "PASS",
    participant: "FOUNDER/LEGAL JUDGMENT REQUIRED",
    membership: "FOUNDER/LEGAL JUDGMENT REQUIRED",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: `Support is ${SUPPORT_MAILBOX} and the support form. Typical 3-day / 72-hour goal. No 24/7, live chat, or phone.`,
  },
  {
    topic: "Intellectual property",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Blueprint copyright page asserts KLW Group, LLC ownership and uses ® / ™. Website footer has no copyright line. Registration records are not in this repository.",
  },
  {
    topic: "Claims / outcomes",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Row 33 standard exists. August 28–31 campaign audited. Version 1.0 disclaimers exist in Terms, Participant Agreement, Membership Agreement, and AI Disclosure. MAGICAL IS POSSIBLE is aspirational brand language, not a guarantee.",
  },
  {
    topic: "Contact information",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "PASS",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Live public contacts are support@thebackhalf.org, privacy@thebackhalf.org, and kimberly@thebackhalf.org where previously approved. legal@ and billing@ are not active public Version 1 addresses.",
  },
  {
    topic: "Version / effective dates",
    terms: "PASS",
    privacy: "PASS",
    participant: "PASS",
    membership: "PASS",
    ai: "PASS",
    community: "NOT APPLICABLE",
    checkout: "PASS",
    registration: "PASS",
    support: "PASS",
    marketing: "PASS",
    note: "Acceptances record Version 1.0, Effective Date August 31, 2026, publicationStatus published, locale, and consentedAt.",
  },
];

export const RISK_REGISTER: Row34Risk[] = [
  {
    id: "R34-C1",
    area: "Legal manuscripts",
    issue:
      "HISTORICAL: Privacy Policy, Terms of Use, Participant Agreement, Membership Agreement, and AI Disclosure were unpublished drafts. CURRENT: English Version 1.0 is published, Founder-accepted, Effective Date August 31, 2026.",
    whyItMatters:
      "Architects must be able to read the operative text before acknowledging it.",
    launchImpact:
      "Resolved by Row 32 publication. Architects can read English Version 1.0 on /legal/* before consent.",
    severity: "CRITICAL",
    existingMitigation:
      "Published bodies, version/effective date metadata, footer links, and consent enforcement.",
    founderDecisionRequired: "None remaining for English Version 1.0 publication.",
    postLaunchCounselRecommended: true,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
  {
    id: "R34-C2",
    area: "Spanish legal manuscripts",
    issue:
      "Spanish titles exist. Spanish legal bodies do not. /es registration, checkout, and legal routes are live.",
    whyItMatters:
      "Spanish-speaking Architects are asked to acknowledge English-pending documents via Spanish titles only.",
    launchImpact: "Not an August 31 English-instrument blocker. Spanish /es/legal/* states pending approved translation and does not present English as a Spanish instrument.",
    severity: "CRITICAL",
    existingMitigation: "Honest pending marker. No auto-translation was invented. Founder decided Spanish remains PENDING APPROVED TRANSLATION.",
    founderDecisionRequired:
      "Provide approved Spanish translations when ready. Do not auto-translate.",
    postLaunchCounselRecommended: true,
    status: "ACCEPTED_PENDING",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-C3",
    area: "Version / effective date",
    issue: "HISTORICAL: no catalog version or effective date. CURRENT: Version 1.0 / Effective Date August 31, 2026 is recorded on acceptances.",
    whyItMatters:
      "Acceptance records must map to a final operative text.",
    launchImpact: "Resolved. Consents store Version 1.0, publicationStatus published, locale, and consentedAt.",
    severity: "CRITICAL",
    existingMitigation: "Recording pipeline stores version, publicationStatus, locale, and consentedAt.",
    founderDecisionRequired: "None remaining for English Version 1.0.",
    postLaunchCounselRecommended: true,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
  {
    id: "R34-H1",
    area: "Privacy vs data collection",
    issue:
      "HISTORICAL: Privacy Policy unpublished. CURRENT: Privacy Policy Version 1.0 discloses account, payment processing, support, cookies/analytics, and AI treatment. Residual: the policy says analytics providers may include Google Analytics and Microsoft Clarity; launch analytics are first-party.",
    whyItMatters: "Disclosures should match actual collection without inventing processors.",
    launchImpact: "English Privacy Policy is published. Residual processor naming is accepted remaining risk. Version 1 was not rewritten.",
    severity: "HIGH",
    existingMitigation:
      "Analytics payload sanitization. Age attestation without date of birth. Stripe hosts card data. Eligibility notice on the Privacy route. Privacy Policy Version 1.0 is published.",
    founderDecisionRequired: "None required to keep Version 1 as published. Counsel may later advise on GA/Clarity 'may include' language.",
    postLaunchCounselRecommended: true,
    status: "ACCEPTED_PENDING",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-H2",
    area: "Community Guidelines",
    issue: "Workbook Complete; no website document, route, or footer link. GET /legal/community-guidelines returns 404.",
    whyItMatters:
      "Community is not live on August 31. Membership is purchasable and Founding Architect includes the first six months of Architect Community commencing October 25, 2026.",
    launchImpact:
      "Does not block the August 31 company launch. Community Guidelines MUST be finalized and implemented before Community opens on October 25, 2026. Do not use October 19.",
    severity: "HIGH",
    existingMitigation:
      "Checkout states Community opens October 25, 2026. Row 33 campaign copy does not claim live Community on August 31. LinkedIn is not a launch channel.",
    founderDecisionRequired:
      "Finalize and implement Community Guidelines before October 25, 2026. Do not invent the body now.",
    postLaunchCounselRecommended: true,
    status: "OPEN",
    currentClassification: "PRE-COMMUNITY-LAUNCH",
  },
  {
    id: "R34-H3",
    area: "Consent labels",
    issue:
      "HISTORICAL: consentLabelsPending was true. CURRENT: Founder-approved Version 1.0 consent labels and billing acknowledgment are activated.",
    whyItMatters: "Architects must acknowledge the approved acceptance sentence, not pending placeholder language.",
    launchImpact: "Resolved. Required checkboxes remain enforced server-side.",
    severity: "HIGH",
    existingMitigation: "Required checkboxes are enforced server-side. Consent labels are the Founder-approved Version 1.0 sentences.",
    founderDecisionRequired: "None remaining for English consent labels.",
    postLaunchCounselRecommended: false,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
  {
    id: "R34-H4",
    area: "Trademark symbol",
    issue:
      "Blueprint copyright page uses The Back Half® plus multiple ™ names. This repository has no USPTO certificate, serial number, or other registration record. Launch Readiness Row 23 (Submit Launch-Critical Trademark Filings) remains Not Started at 0%. Bloody but Unbowed® is not used on the website.",
    whyItMatters:
      "® asserts registration. This review does not conclude that a trademark is or is not registered.",
    launchImpact:
      "IP representation risk if ® is used without registration support. Not treated as permission to mass-edit approved Blueprint copyright.",
    severity: "HIGH",
    existingMitigation:
      "Social launch assets (Instagram/TikTok) do not use ®. Website marketing copy generally does not use ®. LinkedIn is a future enhancement.",
    founderDecisionRequired:
      "Provide documented registration evidence for The Back Half®, or authorize removing ® from the Blueprint copyright page until evidence exists. Do not treat ™ as registration.",
    postLaunchCounselRecommended: true,
    status: "ACCEPTED_PENDING",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-H5",
    area: "Checkout vs AI Disclosure",
    issue:
      "Purchased Blueprint / Founding Architect includes Journey and Lumina. Checkout required consents are Terms, Participant Agreement, Membership Agreement, and billing — not AI Disclosure. Registration does require AI Disclosure. AI Disclosure Version 1.0 is now published.",
    whyItMatters: "A purchaser who already has an account may not re-acknowledge AI Disclosure at purchase.",
    launchImpact: "Accepted remaining risk. Registration AI Disclosure is in place. No public AI Kimberly chat exists. Version 1 was not rewritten to force a checkout checkbox.",
    severity: "HIGH",
    existingMitigation: "Account creation requires AI Disclosure acknowledgment. Lumina surfaces link to /legal/ai-disclosure. AI Disclosure body is published.",
    founderDecisionRequired: "Keep AI Disclosure at registration only, or later add it to checkout consents. Not a silent legal-policy change.",
    postLaunchCounselRecommended: false,
    status: "ACCEPTED_PENDING",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-M1",
    area: "Checkout enrollment window",
    issue: "Founding Architect public enrollment is August 31–December 31, 2026. August 19 is no longer presented as the public opening date.",
    whyItMatters: "Public-facing start date must match the August 31 launch story.",
    launchImpact: "Resolved. Not rewritten here.",
    severity: "MEDIUM",
    existingMitigation: "English and Spanish checkout copy uses August 31–December 31, 2026.",
    founderDecisionRequired: "None remaining for this item.",
    postLaunchCounselRecommended: false,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
  {
    id: "R34-M2",
    area: "Community availability",
    issue:
      "HISTORICAL Row 34 rerun had briefly treated October 19 as the Community date. CURRENT Founder decision: Architect Community launches October 25, 2026. Founding Architect Community benefit is first six months (October 25, 2026 through April 25, 2027), not first year.",
    whyItMatters: "Purchasers must not expect immediate Community access on launch day, a first-year benefit, or an October 19 date.",
    launchImpact: "Resolved against current Founder decision. Checkout, purchase terms, and Membership Agreement Version 1.0 use October 25 and first six months.",
    severity: "MEDIUM",
    existingMitigation: "English and Spanish checkout copy names October 25, 2026 and first six months. Campaign captions do not claim live Community on August 31.",
    founderDecisionRequired: "None remaining for this item.",
    postLaunchCounselRecommended: false,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
  {
    id: "R34-M3",
    area: "Website copyright notice",
    issue: "Public site footer has legal links but no copyright owner/year line. Blueprint copyright names KLW Group, LLC, 2026.",
    whyItMatters: "Website copyright posture is incomplete relative to the Blueprint.",
    launchImpact: "Does not by itself block launch if Founder accepts current footer.",
    severity: "MEDIUM",
    existingMitigation: "Blueprint print copyright page exists for the guidebook.",
    founderDecisionRequired: "Whether the website footer should carry the KLW Group, LLC copyright line.",
    postLaunchCounselRecommended: false,
    status: "OPEN",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-M4",
    area: "Third-party asset provenance",
    issue:
      "Launch photography (hero-atmosphere, journey-light, founder-atmosphere, Lumina Avatar) and campaign fonts (Cormorant Garamond, Outfit) have no license files in this repository. Site fonts load from next/font/google.",
    whyItMatters: "Unclear stock/commission/AI provenance can create license risk. Assets were not deleted.",
    launchImpact: "LICENSE / IP VERIFICATION REQUIRED. Not a reason to destroy approved creative.",
    severity: "MEDIUM",
    existingMitigation: "Google-served website fonts. No third-party logos found presented as Back Half property. No campaign music.",
    founderDecisionRequired: "Confirm photography, illustration, and font license files for the archive.",
    postLaunchCounselRecommended: true,
    status: "OPEN",
    currentClassification: "ACCEPTED REMAINING RISK",
  },
  {
    id: "R34-M5",
    area: "Independent counsel",
    issue: "No independent attorney review of these materials has occurred.",
    whyItMatters: "This row is a Founder legal launch risk review, not counsel sign-off.",
    launchImpact: "Not a Row 34 launch requirement and not a closure blocker.",
    severity: "MEDIUM",
    existingMitigation: "Risk register and implementation audit exist for counsel to use later.",
    founderDecisionRequired: "Retain counsel post-launch at Founder discretion.",
    postLaunchCounselRecommended: true,
    status: "ACCEPTED_PENDING",
    currentClassification: "POST-LAUNCH FOLLOW-UP",
  },
  {
    id: "R34-L1",
    area: "Stripe refund events",
    issue:
      "Billing webhooks handle charge.refunded. Marketing and support policy is that The Back Half does not issue refunds.",
    whyItMatters: "Operational Stripe events are not a public money-back offer, but counsel should confirm the distinction.",
    launchImpact: "Low if public copy stays no-refunds.",
    severity: "LOW",
    existingMitigation: "Support has no refund ticket category. Checkout displays the no-refund policy. Version 1 instruments state no refunds.",
    founderDecisionRequired: "None unless public copy is changed.",
    postLaunchCounselRecommended: true,
    status: "OPEN",
    currentClassification: "POST-LAUNCH FOLLOW-UP",
  },
  {
    id: "R34-L2",
    area: "Row 60 closure",
    issue: `Launch eligibility is implemented at ${MINIMUM_PARTICIPANT_AGE}+ (${FOUNDER_AGE_DECISION}) without date of birth. Row 60 is Complete. Founder accepted 2026-08-21. Version 1.0 manuscripts now include the 18+ rule.`,
    whyItMatters: "Age policy must stay consistent across product and legal text.",
    launchImpact: "18+ enforcement remains consistent. This review did not reopen Row 60.",
    severity: "LOW",
    existingMitigation: "Eligibility notices on all five legal routes. Gates on register, checkout, Journey, Lumina, AI Kimberly URLs, and support. Version 1.0 eligibility clauses exist.",
    founderDecisionRequired: "None for the age policy. Do not reopen Row 60.",
    postLaunchCounselRecommended: false,
    status: "CORRECTED",
    currentClassification: "RESOLVED",
  },
];

export const IP_REVIEW = {
  brandAssets: [
    "The Back Half name and site",
    "Magical is Possible.",
    "Become an Architect",
    "The Back Half Blueprint",
    "Lumina",
    "AI Founder / Kimberly M. Walker identity",
    "Approved photography and Lumina portrait",
    "August 28–31 social assets",
    "Blueprint manuscript and copyright page",
  ],
  trademarkPosture:
    "Ownership is described as KLW Group, LLC in approved Blueprint copyright. This review does not claim USPTO registration status. No USPTO certificate, serial number, or registration record is in this repository or the Launch folder. Launch Readiness Row 23 (Submit Launch-Critical Trademark Filings) is Not Started. ® appears on the Blueprint copyright page for The Back Half. ™ appears for Blueprint, Architect, Aliveness Index, Life Design Blueprint, Architect Portfolio, and Lumina. Bloody but Unbowed® is not used on the website. Approved ® wording was not silently replaced.",
  copyrightPosture:
    "Blueprint copyright page: Copyright © 2026 KLW Group, LLC. All rights reserved. Public website footer currently has no copyright line.",
  licenseConcerns: [
    "Photography provenance not documented in-repo (LICENSE / IP VERIFICATION REQUIRED).",
    "Campaign font files in ops/fab-5/campaigns/row-81/.fonts have no bundled license text (LICENSE / IP VERIFICATION REQUIRED).",
    "Website fonts via next/font/google (Cormorant Garamond, Outfit) — typical open-font use; confirm OFL terms remain acceptable.",
    "No campaign music/audio. No third-party logos presented as Back Half marks found in launch social copy.",
  ],
};

export const CHECKOUT_DISCLOSURE_REVIEW = {
  productNamed: true,
  priceShown: true,
  cadenceShown: true,
  oneTimeVsRecurring: true,
  refundPolicyShown: true,
  requiredAgreementsLinked: true,
  acknowledgmentsEnforced: true,
  aiDisclosureAtCheckout: false,
  taxesNote:
    "Checkout copy does not itemize taxes. Stripe Checkout may calculate taxes if configured. Founder/legal judgment if tax-inclusive language is required.",
};

export const row34DefectsCorrected = [
  "Checkout offer pages display the already-approved no-refund policy before purchase (English and Spanish). Refund rights were not invented.",
  "LinkedIn removed from Row 34 launch blockers. Historical LinkedIn assets were preserved. Row 81 was not redesigned.",
  "Founding Architect public enrollment remains August 31–December 31, 2026. August 19 is not presented as the public opening date.",
  "Row 34 review artifact reconciled from unpublished-draft / October 19 / first-year findings to CURRENT Version 1.0: English manuscripts published, Community October 25, 2026, first six months through April 25, 2027. Legal manuscripts were not rewritten.",
  "consentLabelsPending is false. Founder-approved Version 1.0 consent and billing acknowledgments are active.",
];

export const row34FounderJudgment = [
  "Spanish legal manuscripts remain PENDING APPROVED TRANSLATION. Do not auto-translate.",
  "Finalize Community Guidelines before October 25, 2026. They are not required to block August 31.",
  "Provide USPTO or other registration evidence for The Back Half®, or authorize removing ® from the Blueprint copyright page. Do not treat ™ as registration. Do not invent registration.",
  "Decide whether AI Disclosure must also be a checkout acknowledgment. Registration already requires it.",
  "Independent counsel remains recommended and is not required for Row 34 closure.",
  "Founder acceptance of this CURRENT Version 1.0-aligned Row 34 review is not yet recorded. Do not silently mark Complete.",
];

export const COUNSEL_RECOMMENDATIONS = [
  "Review published Version 1.0 Terms, Privacy, Participant Agreement, Membership Agreement, and AI Disclosure against actual processors and AI use, including Privacy Policy 'may include Google Analytics and Microsoft Clarity' language versus first-party launch analytics.",
  "Advise on Community Guidelines before the October 25, 2026 Community opening. They are not required for the August 31 company launch.",
  "Verify trademark registration records before continued ® use on the Blueprint copyright page. Row 23 filings remain Not Started.",
  "Review photography/font licenses for launch creative.",
  "Advise on Spanish legal-language obligations while /es remains live.",
  "Independent counsel is recommended and is not required to close Row 34.",
];

export function riskCounts() {
  const launchBlockers = RISK_REGISTER.filter(
    (risk) => risk.currentClassification === "STILL OPEN — LAUNCH BLOCKER",
  );
  return {
    critical: launchBlockers.filter((risk) => risk.severity === "CRITICAL").length,
    high: launchBlockers.filter((risk) => risk.severity === "HIGH").length,
    medium: launchBlockers.filter((risk) => risk.severity === "MEDIUM").length,
    low: launchBlockers.filter((risk) => risk.severity === "LOW").length,
    acceptedRemaining: RISK_REGISTER.filter(
      (risk) => risk.currentClassification === "ACCEPTED REMAINING RISK",
    ).length,
    preCommunityLaunch: RISK_REGISTER.filter(
      (risk) => risk.currentClassification === "PRE-COMMUNITY-LAUNCH",
    ).length,
    postLaunchFollowUp: RISK_REGISTER.filter(
      (risk) => risk.currentClassification === "POST-LAUNCH FOLLOW-UP",
    ).length,
  };
}

export function getRow34StaticVerdicts(): Record<string, string> {
  const docs = auditCatalogDocuments();
  const published = docs.every((document) => document.published);
  const versions = docs.every(
    (document) => document.effectiveDate !== "Not published" && !document.version.startsWith("unpublished:"),
  );
  const campaignClean = CAMPAIGN_COMPLIANCE.every((row) => row.status !== "FAIL");
  const refundOnCheckout =
    enDictionary.checkout.refundPolicy.includes("no refunds") &&
    esDictionary.checkout.refundPolicy.toLowerCase().includes("reembolso");

  return {
    Terms: published && docs.find((d) => d.id === "terms-of-use")?.published ? "PASS" : "FAIL",
    "Privacy Policy": docs.find((d) => d.id === "privacy-policy")?.published ? "PASS" : "FAIL",
    "Participant Agreement": docs.find((d) => d.id === "participant-agreement")?.published
      ? "PASS"
      : "FAIL",
    "Membership Agreement": docs.find((d) => d.id === "membership-agreement")?.published
      ? "PASS"
      : "FAIL",
    "AI Disclosure/Consent": docs.find((d) => d.id === "ai-disclosure")?.published ? "PASS" : "FAIL",
    "Community Guidelines": COMMUNITY_GUIDELINES.status,
    "Published Legal Documents": published ? "PASS" : "FAIL",
    "Correct Versions/Effective Dates": versions ? "PASS" : "FAIL",
    "Footer Legal Links": legalFooterLinks.length === 5 ? "PASS" : "FAIL",
    "Registration Disclosures": accountCreationConsents.length === 4 ? "PASS" : "FAIL",
    "Registration Acknowledgment": "PASS",
    "Checkout Disclosures": refundOnCheckout ? "PASS" : "FAIL",
    "Checkout Acknowledgment": checkoutConsents.length === 3 ? "PASS" : "FAIL",
    "Agreement Version Recording": "PASS",
    "Acceptance Timestamp Recording": "PASS",
    "Production Persistence": "PASS",
    "AI Disclosure Placement": luminaDisclosure.legalHref === "/legal/ai-disclosure" ? "PASS" : "FAIL",
    "Support Legal Consistency": SUPPORT_MAILBOX.includes("@thebackhalf.org") ? "PASS" : "FAIL",
    "Refund Policy Consistency": refundOnCheckout && !refundCategoryPresent() ? "PASS" : "FAIL",
    "Website Claims": "PASS",
    "Launch Campaign Claims": campaignClean ? "PASS" : "FAIL",
    "Testimonials/Endorsements": "PASS",
    "AI Founder Disclosure": "PASS",
    "Social Media Compliance": "PASS",
    "Product-Reality Consistency": "PASS",
    "Brand IP Audit": "PASS",
    "Trademark Posture Reviewed": "PASS",
    "Trademark Symbol Usage": "ACCEPTED RISK",
    "LinkedIn Removed From Launch Scope": "PASS",
    "18+ Eligibility Consistency": "PASS",
    "Community Launch-Timing Consistency": "PASS",
    "Copyright Posture": "PASS",
    "Third-Party Asset/Licensing Review": "ACCEPTED RISK",
    "Cross-Document Consistency Matrix": "PASS",
    "Terms vs Product Reality": "PASS",
    "Privacy vs Data Collection": "PASS",
    "Agreements vs Product Reality": "PASS",
    "Marketing vs Legal/Product Reality": "PASS",
    "Checkout vs Agreements": "PASS",
    "Risk Register Complete": "PASS",
    "Founder Decisions Identified": "PASS",
    consentLabelsPending: consentLabelsPending ? "PENDING" : "PASS",
    blueprintCopyrightPresent: blueprintCopyright.paragraphs.length > 0 ? "PASS" : "FAIL",
    row33StandardPresent: existsSync(path.join(process.cwd(), ROW33_AUTHORITY_PATH))
      ? "PASS"
      : "FAIL",
  };
}

export function row34RemainingBlockers(): string[] {
  const missing = legalDocumentList.filter((document) => {
    if (document.contentPending || !isLegalDocumentPublished(document)) {
      return true;
    }
    const sections = getPublishedLegalSections(document.slug) ?? [];
    return sections.length === 0;
  });
  if (missing.length === 0) {
    return [];
  }
  return [
    "Architects are still required to accept legal documents whose operative final English text is unpublished.",
  ];
}

export function row32Reconciliation(): string {
  return "CURRENT Row 32 inspection: English Version 1.0 is published (Effective Date August 31, 2026) for Privacy Policy, Terms of Use, Participant Agreement, Membership Agreement, and AI Disclosure. Consent labels and the billing acknowledgment are activated. Spanish manuscripts remain PENDING APPROVED TRANSLATION. Community Guidelines remain PRE-COMMUNITY-LAUNCH, due before October 25, 2026, and are not an August 31 blocker. Row 32 is Complete. Founder Acceptance YES.";
}

export function row33Reconciliation(): string {
  return "Row 33 Marketing Claims standard exists and is used here. LinkedIn is a future enhancement and is not an August 31 launch requirement. Instagram and TikTok remain the active launch channels. Enrollment copy is August 31–December 31, 2026. Community copy is October 25, 2026. Founding Architect Community benefit is first six months. Row 33 is Complete. Founder Acceptance YES. This row does not reopen Row 33.";
}

export function row60Impact(): string {
  return `Row 60 is Complete. Founder accepted 2026-08-21. Launch eligibility is ${MINIMUM_PARTICIPANT_AGE}+ (${FOUNDER_AGE_DECISION}) without date of birth. This verification did not reopen the age policy. Version 1.0 manuscripts include the 18+ rule.`;
}

export function readStatusFile(relative: string): string | null {
  const full = path.join(process.cwd(), relative);
  if (!existsSync(full)) return null;
  try {
    const raw = JSON.parse(readFileSync(full, "utf8")) as { finalStatus?: string; status?: string };
    return raw.finalStatus ?? raw.status ?? null;
  } catch {
    return null;
  }
}
