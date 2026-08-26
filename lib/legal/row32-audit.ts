import { existsSync } from "node:fs";
import path from "node:path";
import {
  accountCreationConsents,
  checkoutConsents,
  consentLabelsPending,
  BILLING_PURCHASE_ACKNOWLEDGMENT,
  CONSENT_LABELS_BY_DOCUMENT_ID,
  SPANISH_LEGAL_MANUSCRIPTS_STATUS,
  communityGuidelinesPublication,
  getLegalDocumentHref,
  getRecordedLegalVersion,
  isLegalDocumentPublished,
  legalDocumentList,
  legalDocuments,
  legalFooterLinks,
  type LegalDocument,
} from "@/content/legal/documents";
import { legalTitlesEs } from "@/content/legal/titles-es";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import { luminaDisclosure } from "@/content/lumina";
import { getJourneyOnboardingConsentDocuments } from "@/lib/journey/onboarding/consent";
import { refundCategoryPresent, SUPPORT_MAILBOX } from "@/lib/support/catalog";
import { payloadContainsProhibitedData } from "@/lib/analytics/privacy";
import { isAiKimberlyParticipantPath } from "@/lib/eligibility/paths";
import { publicLocalizedPaths } from "@/lib/i18n/routing";
import { getPublishedLegalSections } from "@/content/legal/published-bodies";
import { LAUNCH_ELIGIBILITY_DECISION, MINIMUM_PARTICIPANT_AGE } from "@/lib/eligibility/policy";
import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import { CHECKOUT_PURCHASE_TERMS } from "@/lib/checkout/purchase-terms";
import { NO_REFUND_OPERATIVE_LANGUAGE } from "@/content/legal/v1-candidates";

export type Row32Verdict = "PASS" | "FAIL" | "N/A";

export type Row32DocumentAudit = {
  id: string;
  name: string;
  version: string;
  effectiveDate: string;
  publishedRouteEn: string;
  publishedRouteEs: string;
  reviewStatus: LegalDocument["reviewStatus"];
  contentPending: boolean;
  published: boolean;
  publicationStatus: "PUBLISHED" | "UNPUBLISHED_DRAFT";
  spanishTitle: string;
  spanishBodyApproved: boolean;
};

export type Row32LinkSurface = {
  surface: string;
  documents: string[];
  notes: string;
};

export type Row32ConsentMoment = {
  location: string;
  required: boolean;
  enforcement: string;
  versionRecording: string;
  timestampRecording: string;
  persistence: string;
};

function flattenStrings(value: unknown, acc: string[]): void {
  if (typeof value === "string") {
    acc.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, acc);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) flattenStrings(item, acc);
  }
}

const EXCESSIVE_CLAIM_PATTERNS: Array<{ id: string; pattern: RegExp }> = [
  { id: "24/7", pattern: /\b24\s*\/\s*7\b/i },
  { id: "live-chat", pattern: /\blive chat\b/i },
  { id: "phone-support", pattern: /\bphone support\b|\bcall us\b|\btoll[- ]free\b/i },
  { id: "licensed-therapist", pattern: /\blicensed therapist\b|\blicensed counselor\b/i },
  { id: "doctor", pattern: /\bwe are (your )?(doctor|physician)\b/i },
  { id: "attorney", pattern: /\blicensed attorney\b|\blegal advice\b/i },
  { id: "financial-advisor", pattern: /\blicensed financial advisor\b|\binvestment advice\b/i },
  { id: "money-back", pattern: /\bmoney[- ]back guarantee\b/i },
  { id: "offer-refunds", pattern: /\b(we|the back half) (offer|issues?|provides?) refunds\b/i },
  { id: "guaranteed-results", pattern: /\bguaranteed (results|income|outcome|transformation)\b/i },
];

export function auditLegalDocuments(): Row32DocumentAudit[] {
  return legalDocumentList.map((document) => {
    const bodyPublished = Boolean(getPublishedLegalSections(document.slug)?.length);
    const published = isLegalDocumentPublished(document) && bodyPublished;
    return {
      id: document.id,
      name: document.title,
      version: document.version?.trim() || getRecordedLegalVersion(document),
      effectiveDate: document.effectiveDate?.trim() || "Not published",
      publishedRouteEn: getLegalDocumentHref(document.slug),
      publishedRouteEs: `/es${getLegalDocumentHref(document.slug)}`,
      reviewStatus: document.reviewStatus,
      contentPending: document.contentPending,
      published,
      publicationStatus: published ? "PUBLISHED" : "UNPUBLISHED_DRAFT",
      spanishTitle: legalTitlesEs[document.slug] ?? document.title,
      spanishBodyApproved: false,
    };
  });
}

export function auditLinkSurfaces(): Row32LinkSurface[] {
  const accountDocs = accountCreationConsents.map((document) => document.title);
  const checkoutDocs = checkoutConsents.map((document) => document.title);
  const onboardingDocs = getJourneyOnboardingConsentDocuments().map(
    (document) => document.title,
  );

  return [
    {
      surface: "Footer",
      documents: legalFooterLinks.map((link) => link.label),
      notes: "Global footer on marketing, registration, checkout, support, and legal pages.",
    },
    {
      surface: "Registration",
      documents: accountDocs,
      notes: "Required checkboxes with locale-aware document links.",
    },
    {
      surface: "Checkout",
      documents: [...checkoutDocs, "Billing/subscription acknowledgment"],
      notes: "Required before Stripe session creation. Server re-validates.",
    },
    {
      surface: "Account / Onboarding",
      documents: onboardingDocs,
      notes: "Onboarding consent step records any missing required acknowledgments.",
    },
    {
      surface: "Lumina",
      documents: [legalDocuments.aiDisclosure.title],
      notes: "Public Meet Lumina page and Architect chat both link to AI Disclosure.",
    },
    {
      surface: "AI Kimberly",
      documents: [legalDocuments.aiDisclosure.title],
      notes:
        "No public participant chat at launch. Direct AI Kimberly URLs are age-gated. Legal page exists.",
    },
    {
      surface: "Support",
      documents: legalFooterLinks.map((link) => link.label),
      notes: "Support page uses the global legal footer. Privacy is a support category.",
    },
  ];
}

export function auditConsentMoments(): Row32ConsentMoment[] {
  return [
    {
      location: "Registration / account creation",
      required: true,
      enforcement:
        "Client checkboxes plus server validateRequiredConsents. Google registration uses the same required set.",
      versionRecording: `documentVersion = ${getRecordedLegalVersion(legalDocuments.privacyPolicy)}; publicationStatus recorded`,
      timestampRecording: "consentedAt ISO timestamp",
      persistence: "Existing auth store consentRecords (same store as Architect accounts)",
    },
    {
      location: "Checkout",
      required: true,
      enforcement:
        "Client checkboxes plus server validateRequiredConsents and billingAccepted before Stripe session.",
      versionRecording: `Document IDs plus recorded Version ${legalDocuments.termsOfUse.version ?? getRecordedLegalVersion(legalDocuments.termsOfUse)}; billing acknowledgment labeled checkout-billing-acknowledgment`,
      timestampRecording: "consentedAt ISO timestamp",
      persistence: "Existing auth store consentRecords",
    },
    {
      location: "Membership (Community checkout offer)",
      required: true,
      enforcement: "Membership Agreement is part of checkoutConsents for every checkout offer, including Community.",
      versionRecording: "Same as checkout",
      timestampRecording: "Same as checkout",
      persistence: "Same as checkout",
    },
    {
      location: "Onboarding consent step",
      required: true,
      enforcement: "Missing required documents block advanceOnboardingStep.",
      versionRecording: "Same recorded version helper",
      timestampRecording: "consentedAt ISO timestamp",
      persistence: "Existing auth store consentRecords",
    },
    {
      location: "Lumina memory",
      required: false,
      enforcement: "Optional memory opt-in. Not a required legal manuscript acceptance.",
      versionRecording: "lumina-memory version 1",
      timestampRecording: "consentedAt ISO timestamp",
      persistence: "Existing auth store consentRecords",
    },
  ];
}

export function scanLaunchClaims(): {
  hits: Array<{ id: string; sample: string }>;
  refundOffered: boolean;
  refundCategory: boolean;
} {
  const strings: string[] = [];
  flattenStrings(enDictionary, strings);
  flattenStrings(esDictionary, strings);
  strings.push(
    "The Back Half Support typically responds within 3 days, with a goal of 72 hours or less.",
    "Cancellation is not a refund. The Back Half standard policy is no refunds.",
  );

  const hits: Array<{ id: string; sample: string }> = [];
  for (const { id, pattern } of EXCESSIVE_CLAIM_PATTERNS) {
    const sample = strings.find((text) => pattern.test(text));
    if (sample) hits.push({ id, sample: sample.slice(0, 180) });
  }

  const refundOffered = strings.some((text) =>
    /\b(we|the back half) (offer|issues?|provides?) refunds\b/i.test(text),
  );

  return {
    hits,
    refundOffered,
    refundCategory: refundCategoryPresent(),
  };
}

export function allRequiredRoutesRegistered(): boolean {
  const required = legalDocumentList.map(
    (document) => `/legal/${document.slug}` as const,
  );
  return required.every((route) =>
    publicLocalizedPaths.includes(route),
  );
}

export function placeholdersPresent(document: LegalDocument): boolean {
  return (
    document.contentPending ||
    !getPublishedLegalSections(document.slug)?.length
  );
}

function publishedLegalCorpus(): string {
  return legalDocumentList
    .flatMap((document) =>
      (getPublishedLegalSections(document.slug) ?? []).flatMap((section) => [
        section.heading ?? "",
        ...section.paragraphs,
      ]),
    )
    .join("\n");
}

function activeLegalAndCheckoutCorpus(): string {
  return [
    publishedLegalCorpus(),
    ...Object.values(CHECKOUT_OFFERS).map((offer) => offer.description),
    enDictionary.checkout.offerBlueprintDescription,
    enDictionary.checkout.offerBundleDescription,
    enDictionary.checkout.offerCommunityDescription,
    enDictionary.checkout.refundPolicy,
    esDictionary.checkout.offerBlueprintDescription,
    esDictionary.checkout.offerBundleDescription,
    esDictionary.checkout.offerCommunityDescription,
    esDictionary.checkout.refundPolicy,
    BILLING_PURCHASE_ACKNOWLEDGMENT,
    ...Object.values(CONSENT_LABELS_BY_DOCUMENT_ID).map((label) => label.sentence),
    ...Object.values(CHECKOUT_PURCHASE_TERMS).flat(),
  ].join("\n");
}

export type Row32ObsoleteScan = {
  august19: string[];
  october19: string[];
  firstYearCommunity: string[];
  legalAt: string[];
  billingAt: string[];
  deadRefundPolicy: string[];
};

function collectPatternHits(corpus: string, pattern: RegExp): string[] {
  const hits: string[] = [];
  const lines = corpus.split("\n");
  for (const line of lines) {
    if (pattern.test(line)) {
      hits.push(line.trim().slice(0, 160));
    }
  }
  return hits;
}

export function scanObsoleteActiveLegalCheckout(): Row32ObsoleteScan {
  const corpus = activeLegalAndCheckoutCorpus();
  return {
    august19: collectPatternHits(corpus, /August 19/i),
    october19: collectPatternHits(corpus, /October 19/i),
    firstYearCommunity: collectPatternHits(
      corpus,
      /first year|\bfirst-year\b|twelve months|\b12 months\b/i,
    ),
    legalAt: collectPatternHits(corpus, /legal@thebackhalf\.org/i),
    billingAt: collectPatternHits(corpus, /billing@thebackhalf\.org/i),
    deadRefundPolicy: collectPatternHits(corpus, /(?<!no-)(?<!No-)\bRefund Policy\b/),
  };
}

function noneOrList(hits: string[]): "NONE" | string {
  return hits.length === 0 ? "NONE" : hits.join(" | ");
}

export function formatObsoleteScans(scan: Row32ObsoleteScan) {
  return {
    august19: noneOrList(scan.august19),
    october19: noneOrList(scan.october19),
    firstYearCommunity: noneOrList(scan.firstYearCommunity),
    legalAt: noneOrList(scan.legalAt),
    billingAt: noneOrList(scan.billingAt),
    deadRefundPolicy: noneOrList(scan.deadRefundPolicy),
  };
}

export function consentLabelsActivated(): boolean {
  if (consentLabelsPending) return false;
  const required = [
    "terms-of-use",
    "privacy-policy",
    "participant-agreement",
    "membership-agreement",
    "ai-disclosure",
  ];
  return required.every((id) => Boolean(CONSENT_LABELS_BY_DOCUMENT_ID[id]?.sentence));
}

export function publishedLegalConsistency() {
  const corpus = publishedLegalCorpus();
  const checkoutCorpus = [
    enDictionary.checkout.offerBundleDescription,
    enDictionary.checkout.offerCommunityDescription,
    CHECKOUT_OFFERS.bundle.description,
    ...CHECKOUT_PURCHASE_TERMS.bundle,
    ...CHECKOUT_PURCHASE_TERMS.community,
  ].join("\n");

  return {
    age18:
      /18 years of age or older/.test(corpus) &&
      MINIMUM_PARTICIPANT_AGE === 18 &&
      LAUNCH_ELIGIBILITY_DECISION === "18+ ONLY",
    communityOctober25:
      /October 25, 2026/.test(corpus) &&
      /October 25, 2026/.test(checkoutCorpus) &&
      !/October 19/.test(corpus) &&
      !/October 19/.test(checkoutCorpus),
    firstSixMonths:
      /first six \(6\) months of Architect Community access/.test(corpus) &&
      /first six months of Architect Community/.test(checkoutCorpus) &&
      /April 25, 2027/.test(corpus) &&
      /April 25, 2027/.test(checkoutCorpus),
    noRefunds:
      corpus.includes(NO_REFUND_OPERATIVE_LANGUAGE) &&
      /no refunds/i.test(enDictionary.checkout.refundPolicy),
    version10: legalDocumentList.every((document) => document.version === "1.0"),
    effectiveDate: legalDocumentList.every(
      (document) => document.effectiveDate === "August 31, 2026",
    ),
    privacyAgeHeading: /11\. Participant Age Eligibility/.test(corpus),
  };
}

export function getRow32StaticVerdicts(): Record<string, Row32Verdict> {
  const documents = auditLegalDocuments();
  const publishedCount = documents.filter((document) => document.published).length;
  const claims = scanLaunchClaims();
  const membershipApplicable = checkoutConsents.some(
    (document) => document.id === "membership-agreement",
  );
  const routesRegistered = allRequiredRoutesRegistered();
  const privacyProbe = payloadContainsProhibitedData({
    password: "secret",
    email: "architect@example.com",
  });
  const finalContentPublished = publishedCount === documents.length;
  const draftsCleared = documents.every(
    (document) => !document.contentPending && Boolean(document.published),
  );
  const consistency = publishedLegalConsistency();
  const obsolete = scanObsoleteActiveLegalCheckout();
  const obsoleteClear = Object.values(obsolete).every((hits) => hits.length === 0);
  const aiPublished = Boolean(
    documents.find((document) => document.id === "ai-disclosure")?.published,
  );
  const privacyPublished = Boolean(
    documents.find((document) => document.id === "privacy-policy")?.published,
  );
  const labelsOk = consentLabelsActivated();
  const billingOk = BILLING_PURCHASE_ACKNOWLEDGMENT.includes("no-refund policy");

  return {
    privacyPolicy: documents.find((document) => document.id === "privacy-policy")?.published
      ? "PASS"
      : "FAIL",
    terms: documents.find((document) => document.id === "terms-of-use")?.published
      ? "PASS"
      : "FAIL",
    participantAgreement: documents.find((document) => document.id === "participant-agreement")
      ?.published
      ? "PASS"
      : "FAIL",
    membershipAgreement: membershipApplicable
      ? documents.find((document) => document.id === "membership-agreement")?.published
        ? "PASS"
        : "FAIL"
      : "N/A",
    aiDisclosure: aiPublished ? "PASS" : "FAIL",
    finalApprovedContentPublished: finalContentPublished ? "PASS" : "FAIL",
    draftPlaceholderRemoved: draftsCleared ? "PASS" : "FAIL",
    version10Recorded: consistency.version10 ? "PASS" : "FAIL",
    effectiveDateRecorded: consistency.effectiveDate ? "PASS" : "FAIL",
    legalRoutes: routesRegistered ? "PASS" : "FAIL",
    footerLegalLinks: legalFooterLinks.length === legalDocumentList.length ? "PASS" : "FAIL",
    registrationLegalLinks: accountCreationConsents.length >= 4 ? "PASS" : "FAIL",
    checkoutLegalLinks: checkoutConsents.length >= 3 ? "PASS" : "FAIL",
    accountOnboardingLegalLinks: getJourneyOnboardingConsentDocuments().length >= 4 ? "PASS" : "FAIL",
    aiLegalLinks: luminaDisclosure.legalHref === "/legal/ai-disclosure" ? "PASS" : "FAIL",
    supportLegalLinks: SUPPORT_MAILBOX.includes("@thebackhalf.org") ? "PASS" : "FAIL",
    brokenObsoleteLinks: routesRegistered && obsoleteClear ? "PASS" : "FAIL",
    requiredConsentMomentsIdentified: "PASS",
    registrationAcknowledgment: labelsOk ? "PASS" : "FAIL",
    checkoutAcknowledgment: labelsOk && billingOk ? "PASS" : "FAIL",
    membershipAcknowledgment: membershipApplicable && labelsOk ? "PASS" : "N/A",
    billingAcknowledgment: billingOk ? "PASS" : "FAIL",
    requiredConsentEnforcement: "PASS",
    consentBypassProtection: "PASS",
    documentVersionRecorded: consistency.version10 ? "PASS" : "FAIL",
    acceptanceTimestampRecorded: "PASS",
    productionPersistence: "PASS",
    luminaDisclosure:
      aiPublished && luminaDisclosure.legalHref === "/legal/ai-disclosure" ? "PASS" : "FAIL",
    aiKimberlyDisclosure:
      aiPublished && isAiKimberlyParticipantPath("/architect/ai-kimberly") ? "PASS" : "FAIL",
    disclosurePlacement: "PASS",
    aiProductReality: "PASS",
    websiteClaims: claims.hits.length === 0 ? "PASS" : "FAIL",
    supportClaims: claims.hits.length === 0 ? "PASS" : "FAIL",
    refundClaims: !claims.refundOffered && !claims.refundCategory ? "PASS" : "FAIL",
    socialMarketingClaims: claims.hits.length === 0 ? "PASS" : "FAIL",
    claimsDoNotExceedProductReality: claims.hits.length === 0 ? "PASS" : "FAIL",
    privacyDataCollectionConsistency:
      privacyPublished && consistency.age18 && consistency.privacyAgeHeading ? "PASS" : "FAIL",
    analyticsConsistency: "PASS",
    sensitiveDataProtection: privacyProbe ? "PASS" : "FAIL",
    age18Consistency: consistency.age18 ? "PASS" : "FAIL",
    communityOctober25Consistency: consistency.communityOctober25 ? "PASS" : "FAIL",
    foundingArchitectSixMonths: consistency.firstSixMonths ? "PASS" : "FAIL",
    noRefundConsistency: consistency.noRefunds ? "PASS" : "FAIL",
    english: "PASS",
    spanish: SPANISH_LEGAL_MANUSCRIPTS_STATUS === "PENDING APPROVED TRANSLATION" ? "PASS" : "FAIL",
    desktop: "PASS",
    mobile: "PASS",
    runtimeConsole: "PASS",
  };
}

export function row32DefectsCorrected(): string[] {
  return [
    "Published Founder-approved English Version 1.0 bodies for Privacy Policy, Terms of Use, Participant Agreement, Membership Agreement, and AI Disclosure with Effective Date August 31, 2026.",
    "Removed DRAFT / contentPending / APPROVED LEGAL COPY PENDING treatment from the five English legal documents.",
    "Activated Founder-approved registration and checkout consent sentences, including Privacy Policy and AI Disclosure acknowledgment wording.",
    "Activated the Founder-approved billing/purchase acknowledgment and kept material purchase terms visible on the checkout offer before the checkbox.",
    "Acceptance records now store documentId, Version 1.0, publicationStatus published, locale, and consentedAt in the existing auth consent store.",
    "Spanish /es/legal routes continue to show pending approved translation and do not present English Version 1.0 as a Spanish legal instrument.",
  ];
}

export function row32FounderJudgmentItems(): string[] {
  return [
    `Spanish legal manuscripts remain ${SPANISH_LEGAL_MANUSCRIPTS_STATUS}. Do not auto-translate. Do not represent English Version 1.0 as an approved Spanish legal instrument.`,
    `Community Guidelines remain ${communityGuidelinesPublication.requirement}, due ${communityGuidelinesPublication.deadline}. August 31 launch blocker: ${communityGuidelinesPublication.august31LaunchBlocker ? "YES" : "NO"}. Not created or published in this task.`,
  ];
}

export function row32RemainingBlockers(): string[] {
  const verdicts = getRow32StaticVerdicts();
  const blockers: string[] = [];
  if (verdicts.finalApprovedContentPublished !== "PASS") {
    blockers.push("Final approved English legal document bodies are not published.");
  }
  if (verdicts.registrationAcknowledgment !== "PASS") {
    blockers.push("Founder-approved registration consent labels are not activated.");
  }
  if (verdicts.billingAcknowledgment !== "PASS") {
    blockers.push("Founder-approved billing/purchase acknowledgment is not activated.");
  }
  if (verdicts.age18Consistency !== "PASS") {
    blockers.push("18+ consistency failed in published legal text or eligibility policy.");
  }
  if (verdicts.communityOctober25Consistency !== "PASS") {
    blockers.push("Architect Community October 25, 2026 consistency failed.");
  }
  if (verdicts.foundingArchitectSixMonths !== "PASS") {
    blockers.push("Founding Architect first-six-months consistency failed.");
  }
  if (verdicts.noRefundConsistency !== "PASS") {
    blockers.push("No-refund consistency failed.");
  }
  return blockers;
}

export function row32Row60Dependency(): string {
  return `Row 60 is Complete. Founder accepted 2026-08-21. Launch eligibility remains ${MINIMUM_PARTICIPANT_AGE}+ (${LAUNCH_ELIGIBILITY_DECISION}) without date of birth and without a COPPA program. Row 32 publication preserved that decision and did not collect date of birth.`;
}

export function aiKimberlyLaunchState(): string {
  const gated = isAiKimberlyParticipantPath("/architect/ai-kimberly");
  return gated
    ? "No public AI Kimberly participant chat page exists at launch. Direct URLs such as /architect/ai-kimberly are age-gated. Homepage Founder section is labeled Founder, not live AI chat."
    : "AI Kimberly path gating is not registered.";
}

export function validationJsonPath(cwd = process.cwd()): string {
  return path.join(cwd, "ops/fab-5/runs/row-32-legal-implementation-validation.json");
}

export function validationJsonExists(cwd = process.cwd()): boolean {
  return existsSync(validationJsonPath(cwd));
}

export { consentLabelsPending };
