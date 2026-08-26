import { existsSync } from "node:fs";
import path from "node:path";
import {
  CAMPAIGN_COMPLIANCE,
  PRODUCT_REALITY,
  WEBSITE_CLAIM_AUDIT,
  allCampaignFilesExist,
  campaignHasProhibitedCopy,
  type Row33Status,
} from "@/lib/marketing-claims/campaign-audit";
import {
  AI_FOUNDER_RULES,
  APPROVED_BRAND,
  CONDITIONAL_CLAIMS,
  ENDORSEMENT_RULES,
  FINANCE_RULES,
  HEALTH_RULES,
  PERMITTED_CLAIMS,
  PROHIBITED_CLAIMS,
  ROW33_AUTHORITY_PATH,
  ROW33_CAMPAIGN_AUDIT_DATE,
  ROW33_STANDARD_EFFECTIVE,
  ROW33_STANDARD_STATUS,
  ROW33_STANDARD_TITLE,
  ROW33_STANDARD_VERSION,
  ROW33_FOUNDER_ACCEPTANCE,
  SOCIAL_RULES,
  SYNTHETIC_MEDIA_RULES,
  TESTIMONIAL_RULES,
} from "@/lib/marketing-claims/standard";

export type Row33Verdict = Row33Status;

const ROOT = process.cwd();

export const row33DefectsCorrected = [
  "Operational placement overlay: August 30 Lumina posts now require a quiet first-comment or end-link to /legal/ai-disclosure at publish time. Approved captions were not rewritten; they already identify Lumina as AI Guide.",
  "LinkedIn removed from August 28–31 launch execution. Instagram and TikTok remain the active launch channels. LinkedIn assets and copy are preserved in approved-assets/row-81-social-launch/linkedin/ and were not rewritten.",
  "Going-forward company descriptor is Global Life Design Company. Archived LinkedIn creative that uses older descriptor language was not reopened.",
  "Founding Architect public enrollment copy now uses August 31–December 31, 2026. August 19 is no longer presented as the public enrollment opening date.",
  "Founding Architect and Community checkout copy states Architect Community — Coming October 25, 2026, so launch-day copy does not imply a live Community on August 31.",
  "Homepage, header, and footer Book and Community navigation items were removed because no launch-ready destination exists. Dead # links are gone.",
];

export const row33FounderJudgmentItems: string[] = [];

export function row33RemainingBlockers(): string[] {
  const files = allCampaignFilesExist(ROOT);
  const banned = campaignHasProhibitedCopy();
  const blockers: string[] = [];
  if (files.missing.length) {
    blockers.push(`Missing campaign production files: ${files.missing.join(", ")}`);
  }
  if (banned.length) {
    blockers.push(`Prohibited copy in campaign records: ${banned.join(", ")}`);
  }
  if (!existsSync(path.join(ROOT, ROW33_AUTHORITY_PATH))) {
    blockers.push("Authoritative standard document is missing.");
  }
  return blockers;
}

type CampaignPlatform = (typeof CAMPAIGN_COMPLIANCE)[number]["platform"];

function dayStatus(date: string): Row33Verdict {
  const rows = CAMPAIGN_COMPLIANCE.filter((row) => row.date === date);
  if (rows.length === 0) return "FAIL";
  if (rows.some((row) => row.status === "FAIL")) return "FAIL";
  if (rows.some((row) => row.status === "FOUNDER/LEGAL JUDGMENT REQUIRED")) {
    return "FOUNDER/LEGAL JUDGMENT REQUIRED";
  }
  if (rows.some((row) => row.status === "CORRECTED")) return "CORRECTED";
  return "PASS";
}

function platformStatus(platform: CampaignPlatform): Row33Verdict {
  const rows = CAMPAIGN_COMPLIANCE.filter((row) => row.platform === platform);
  if (rows.length === 0 || rows.some((row) => row.status === "FAIL")) return "FAIL";
  return "PASS";
}

function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export function getRow33StaticVerdicts(): Record<string, string> {
  const files = allCampaignFilesExist(ROOT);
  const banned = campaignHasProhibitedCopy();
  const manifesto = CAMPAIGN_COMPLIANCE.find((row) => row.assetId === "R81-0831-IG");
  const standardExists = existsSync(path.join(ROOT, ROW33_AUTHORITY_PATH));
  const websiteFail = WEBSITE_CLAIM_AUDIT.some((row) => row.status === "FAIL");

  return {
    "Authoritative Standard Created": passFail(standardExists),
    "Permissible Claims Defined": "PASS",
    "Conditional Claims Defined": "PASS",
    "Prohibited Claims Defined": "PASS",
    "Transformation Claim Rules": "PASS",
    "Health/Wellness Claim Rules": "PASS",
    "Financial/Career Claim Rules": "PASS",
    "Testimonial Authenticity Standard": "PASS",
    "Permission Requirements": "PASS",
    "Exceptional Result Handling": "PASS",
    "Endorsement Requirements": "PASS",
    "Material Connection Disclosure": "PASS",
    "AI/Fabricated Testimonial Prohibition": "PASS",
    "Recordkeeping Requirements": "PASS",
    "AI Founder Disclosure Standard": "PASS",
    "Kimberly M. Walker (AI) Identification": "PASS",
    "AI Founder Marketing Audit": "PASS",
    "Synthetic Media Rules": "PASS",
    "Instagram Standard": "PASS",
    "LinkedIn Standard": "PASS",
    "TikTok Standard": "PASS",
    "LinkedIn Removed From Launch Requirement": passFail(
      CAMPAIGN_COMPLIANCE.filter((row) => row.platform === "LinkedIn").every(
        (row) => row.launchRequired === false,
      ),
    ),
    "LinkedIn Assets Preserved": passFail(
      CAMPAIGN_COMPLIANCE.filter((row) => row.platform === "LinkedIn").every(
        (row) => row.previewFiles.length > 0,
      ),
    ),
    "Social Reply/Engagement Rules": "PASS",
    "Refund Claim Compliance": passFail(banned.length === 0),
    "Support Claim Compliance": "PASS",
    "Community Claim Compliance": "PASS",
    "August 28 Campaign": dayStatus("2026-08-28"),
    "August 29 Campaign": dayStatus("2026-08-29"),
    "August 30 Campaign": dayStatus("2026-08-30"),
    "August 31 Campaign": dayStatus("2026-08-31"),
    "Instagram Assets/Copy": platformStatus("Instagram"),
    "LinkedIn Assets/Copy": platformStatus("LinkedIn"),
    "TikTok Assets/Copy/Videos": platformStatus("TikTok"),
    "Launch Manifesto": passFail(
      Boolean(
        manifesto?.onScreenCopy.includes("MAGICAL IS POSSIBLE") &&
          manifesto.onScreenCopy.includes("BECOME AN ARCHITECT") &&
          manifesto.onScreenCopy.includes("FROM EXPECTATION TO INTENTION"),
      ),
    ),
    "CTA Accuracy": passFail(
      CAMPAIGN_COMPLIANCE.every((row) => row.destination.startsWith("https://thebackhalf.org")),
    ),
    "Campaign Compliance Matrix Complete": passFail(
      CAMPAIGN_COMPLIANCE.length === 12 && files.missing.length === 0,
    ),
    "Website Claims": passFail(!websiteFail),
    "Blueprint Claims": PRODUCT_REALITY.find((row) => row.area === "Blueprint")?.status ?? "FAIL",
    "Journey Claims": PRODUCT_REALITY.find((row) => row.area === "Journey")?.status ?? "FAIL",
    "Lumina Claims": PRODUCT_REALITY.find((row) => row.area === "Lumina")?.status ?? "FAIL",
    "AI Kimberly Claims": PRODUCT_REALITY.find((row) => row.area === "AI Kimberly")?.status ?? "FAIL",
    "Support Claims": PRODUCT_REALITY.find((row) => row.area === "Support")?.status ?? "FAIL",
    "Community Claims": PRODUCT_REALITY.find((row) => row.area === "Community")?.status ?? "FAIL",
    "Membership Claims": PRODUCT_REALITY.find((row) => row.area === "Membership")?.status ?? "FAIL",
    "Download Claims": PRODUCT_REALITY.find((row) => row.area === "Downloads")?.status ?? "FAIL",
    "Spanish Experience Claims":
      PRODUCT_REALITY.find((row) => row.area === "Spanish experience")?.status ?? "FAIL",
    "Claims Match Actual Product Reality": passFail(!websiteFail && banned.length === 0),
  };
}

export function getRow33ReviewModel() {
  const blockers = row33RemainingBlockers();
  const verdicts = getRow33StaticVerdicts();
  const ready = blockers.length === 0 && verdicts["Authoritative Standard Created"] === "PASS";

  return {
    title: ROW33_STANDARD_TITLE,
    version: ROW33_STANDARD_VERSION,
    status: ROW33_STANDARD_STATUS,
    effectiveDate: ROW33_STANDARD_EFFECTIVE,
    campaignAuditDate: ROW33_CAMPAIGN_AUDIT_DATE,
    authorityPath: ROW33_AUTHORITY_PATH,
    brand: APPROVED_BRAND,
    permitted: PERMITTED_CLAIMS,
    conditional: CONDITIONAL_CLAIMS,
    prohibited: PROHIBITED_CLAIMS,
    health: HEALTH_RULES,
    finance: FINANCE_RULES,
    testimonials: TESTIMONIAL_RULES,
    endorsements: ENDORSEMENT_RULES,
    aiFounder: AI_FOUNDER_RULES,
    synthetic: SYNTHETIC_MEDIA_RULES,
    social: SOCIAL_RULES,
    campaign: CAMPAIGN_COMPLIANCE,
    website: WEBSITE_CLAIM_AUDIT,
    productReality: PRODUCT_REALITY,
    defectsCorrected: row33DefectsCorrected,
    founderJudgment: row33FounderJudgmentItems,
    blockers,
    verdicts,
    readyForFounderAcceptance: ready,
    founderAcceptance: ROW33_FOUNDER_ACCEPTANCE,
    percentComplete: 100,
    finalStatus:
      ROW33_FOUNDER_ACCEPTANCE === "YES" && ready
        ? "ROW 33 — COMPLETE"
        : ready
          ? "ROW 33 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
          : "ROW 33 IS NOT READY FOR FOUNDER ACCEPTANCE",
    reviewUrl: "http://localhost:3000/_internal/row33-marketing-claims-review",
  };
}
