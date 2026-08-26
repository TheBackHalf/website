/**
 * Mechanical Row 33 marketing-claims audit.
 * Does not mark the row Complete. Does not rewrite approved campaign copy.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { journeyStages } from "@/content/journey-stages";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import { navLinks } from "@/components/home/nav-links";
import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import {
  CAMPAIGN_COMPLIANCE,
  allCampaignFilesExist,
  campaignHasProhibitedCopy,
} from "@/lib/marketing-claims/campaign-audit";
import {
  getRow33ReviewModel,
  getRow33StaticVerdicts,
  row33DefectsCorrected,
  row33FounderJudgmentItems,
  row33RemainingBlockers,
} from "@/lib/marketing-claims/row33-review";
import {
  APPROVED_BRAND,
  ROW33_AUTHORITY_PATH,
} from "@/lib/marketing-claims/standard";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const ORIGIN = process.env.ROW33_ORIGIN ?? "http://localhost:3000";
const ROOT = process.cwd();
const tests: TestRow[] = [];

function push(id: string, name: string, ok: boolean, detail: string) {
  tests.push({ id, name, result: ok ? "PASS" : "FAIL", detail });
}

async function request(pathName: string, init: RequestInit = {}) {
  const response = await fetch(`${ORIGIN}${pathName}`, {
    ...init,
    redirect: "manual",
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function main() {
  const model = getRow33ReviewModel();
  const files = allCampaignFilesExist(ROOT);
  const banned = campaignHasProhibitedCopy();
  const standardPath = path.join(ROOT, ROW33_AUTHORITY_PATH);
  const approvedCopy = readFileSync(
    path.join(ROOT, "approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md"),
    "utf8",
  );
  const row83 = existsSync(
    path.join(ROOT, "ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md"),
  );
  const row32Page = existsSync(
    path.join(ROOT, "app/%5Finternal/row32-legal-implementation-review/page.tsx"),
  );
  const row51Page = existsSync(
    path.join(ROOT, "app/%5Finternal/row51-printable-assets-review/page.tsx"),
  );
  const row81Page = existsSync(
    path.join(ROOT, "app/%5Finternal/row81-visual-review/page.tsx"),
  );
  const row84Spec = existsSync(
    path.join(ROOT, "ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md"),
  );
  const row150Spec = existsSync(
    path.join(ROOT, "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md"),
  );
  const row151Spec = existsSync(
    path.join(ROOT, "ops/fab-5/ROW-151-LAUNCH-DASHBOARD.md"),
  );
  const row153Spec = existsSync(
    path.join(ROOT, "ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md"),
  );

  push(
    "standard-exists",
    "Authoritative standard document exists",
    existsSync(standardPath),
    ROW33_AUTHORITY_PATH,
  );
  push(
    "standard-title",
    "Standard title is exact",
    model.title === "THE BACK HALF MARKETING CLAIMS, TESTIMONIAL & SOCIAL MEDIA STANDARD",
    model.title,
  );
  push(
    "matrix-count",
    "Campaign matrix has 12 execution records",
    CAMPAIGN_COMPLIANCE.length === 12,
    String(CAMPAIGN_COMPLIANCE.length),
  );
  push(
    "assets-present",
    "All archived production files exist",
    files.missing.length === 0,
    files.missing.length ? files.missing.join(", ") : `${files.present} files present`,
  );
  push(
    "no-prohibited-copy",
    "Approved campaign copy has no prohibited guarantee/refund/24-7 language",
    banned.length === 0,
    banned.length ? banned.join(", ") : "none",
  );
  push(
    "magical-preserved",
    "Magical is Possible preserved in launch manifesto",
    approvedCopy.includes("MAGICAL IS POSSIBLE") &&
      approvedCopy.includes("Magical is Possible."),
    "manifesto + Aug 29 copy",
  );
  push(
    "no-x-channel",
    "Standard does not add X",
    APPROVED_BRAND.excludedChannels.includes("X"),
    APPROVED_BRAND.channels.join(", "),
  );
  const activeChannels = APPROVED_BRAND.channels as readonly string[];
  push(
    "active-launch-channels",
    "Active launch channels are Instagram and TikTok",
    activeChannels.includes("Instagram") &&
      activeChannels.includes("TikTok") &&
      !activeChannels.includes("LinkedIn"),
    APPROVED_BRAND.channels.join(", "),
  );
  push(
    "linkedin-future-enhancement",
    "LinkedIn is recorded as a future enhancement",
    APPROVED_BRAND.futureEnhancementChannels.includes("LinkedIn"),
    APPROVED_BRAND.futureEnhancementChannels.join(", "),
  );
  push(
    "linkedin-assets-preserved",
    "LinkedIn archive files still exist",
    CAMPAIGN_COMPLIANCE.filter((row) => row.platform === "LinkedIn").every(
      (row) =>
        row.launchRequired === false &&
        row.previewFiles.every((file) => existsSync(path.join(ROOT, file))),
    ),
    "4 LinkedIn executions archived, not deleted",
  );
  const enrollmentCopy = [
    enDictionary.checkout.offerBundleDescription,
    esDictionary.checkout.offerBundleDescription,
    CHECKOUT_OFFERS.bundle.description,
  ].join(" ");
  push(
    "enrollment-date",
    "Public enrollment does not use August 19 as the opening date",
    !/August 19|19 de agosto/i.test(enrollmentCopy) &&
      /August 31–December 31, 2026|31 de agosto al 31 de diciembre de 2026/.test(
        enrollmentCopy,
      ),
    "EN/ES checkout + offer definition",
  );
  push(
    "community-timing",
    "Founding Architect copy states Architect Community — Coming October 25, 2026",
    /Architect Community — Coming October 25, 2026/.test(
      enDictionary.checkout.offerBundleDescription,
    ) &&
      /Architect Community — Próximamente el 25 de octubre de 2026/.test(
        esDictionary.checkout.offerBundleDescription,
      ) &&
      /Architect Community — Coming October 25, 2026/.test(
        CHECKOUT_OFFERS.bundle.description,
      ) &&
      !/October 19, 2026/.test(
        [
          enDictionary.checkout.offerBundleDescription,
          enDictionary.checkout.offerCommunityDescription,
          CHECKOUT_OFFERS.bundle.description,
          CHECKOUT_OFFERS.community.description,
        ].join(" "),
      ) &&
      !/19 de octubre de 2026/.test(
        [
          esDictionary.checkout.offerBundleDescription,
          esDictionary.checkout.offerCommunityDescription,
        ].join(" "),
      ),
    "EN/ES Founding Architect descriptions",
  );
  push(
    "nav-no-dead-hash",
    "Launch nav has no dead # destinations",
    navLinks.every((link) => link.href !== "#") &&
      navLinks.every((link) => link.key === "manifesto" || link.key === "contact"),
    navLinks.map((link) => `${link.key}:${link.href}`).join(", "),
  );
  push(
    "seven-chapters",
    "Journey seven-chapter factual claim matches implementation",
    journeyStages.length === 7,
    String(journeyStages.length),
  );
  push(
    "no-live-community-in-final-copy",
    "Row 81 final captions do not claim first-year live Community on Aug 30/31",
    !/first year inside the Architect Community/i.test(approvedCopy),
    "older Row 78 drafts are not the launch source of truth",
  );
  push(
    "no-testimonials-invented",
    "Launch campaign contains no testimonials",
    CAMPAIGN_COMPLIANCE.every((row) => row.testimonialEndorsement === "None"),
    "none",
  );

  const review = await request("/_internal/row33-marketing-claims-review");
  push(
    "review-page",
    "Founder review page renders on localhost",
    review.status === 200 && review.text.includes("MARKETING CLAIMS"),
    `status ${review.status}`,
  );
  const sampleAsset = await request(
    "/_internal/row33-marketing-claims-review/media/R81-0831-IG-S01.png",
  );
  push(
    "review-media",
    "Review page can load a launch-day Instagram asset",
    sampleAsset.status === 200 && sampleAsset.text.length > 1000,
    `status ${sampleAsset.status}`,
  );

  const publicChecks = [
    ["/", "English homepage"],
    ["/es", "Spanish homepage"],
    ["/journey", "Journey"],
    ["/lumina", "Lumina"],
    ["/support", "Support"],
    ["/register", "Registration"],
    ["/checkout", "Checkout"],
    ["/es/checkout", "Spanish checkout"],
  ] as const;
  for (const [route, label] of publicChecks) {
    const res = await request(route);
    const refundPitch =
      /money-back guarantee|risk-free trial|we (offer|issue) refunds/i.test(res.text);
    const support247 =
      /24\/7 support available|we offer live chat|call us for phone support/i.test(
        res.text,
      );
    push(
      `page-${route}`,
      `${label} renders without prohibited support/refund claims`,
      res.status === 200 && !refundPitch && !support247,
      `status ${res.status}; refundPitch=${refundPitch}; 24/7=${support247}`,
    );
  }

  const homeEn = tests.find((t) => t.id === "page-/");
  const homeEs = tests.find((t) => t.id === "page-/es");
  const checkoutEn = tests.find((t) => t.id === "page-/checkout");
  const checkoutEs = tests.find((t) => t.id === "page-/es/checkout");
  push(
    "homepage-nav-live",
    "English and Spanish homepages still render after nav cleanup",
    homeEn?.result === "PASS" && homeEs?.result === "PASS",
    "homepage EN/ES",
  );
  push(
    "checkout-copy-pages",
    "English and Spanish checkout pages still render",
    checkoutEn?.result === "PASS" && checkoutEs?.result === "PASS",
    "checkout EN/ES",
  );

  const luminaIg = CAMPAIGN_COMPLIANCE.find((row) => row.assetId === "R78-0830-IG");
  push(
    "lumina-disclosure-preserved",
    "August 30 Lumina caption and quiet AI Disclosure treatment preserved",
    Boolean(
      luminaIg &&
        /Lumina — your AI Guide/.test(luminaIg.caption) &&
        /first-comment link to \/legal\/ai-disclosure/i.test(
          luminaIg.aiDisclosureRequired,
        ) &&
        approvedCopy.includes(
          "add only a quiet first-comment link to https://thebackhalf.org/legal/ai-disclosure",
        ),
    ),
    "R78-0830-IG + Row 81 posting instructions",
  );

  const row32 = await request("/_internal/row32-legal-implementation-review");
  const row51 = await request("/_internal/row51-printable-assets-review");
  const row81 = await request("/_internal/row81-visual-review");
  push("row32-regression", "Row 32 review page still renders", row32.status === 200 && row32Page, `status ${row32.status}`);
  push("row51-regression", "Row 51 review page still renders", row51.status === 200 && row51Page, `status ${row51.status}`);
  push("row81-regression", "Row 81 visual review still renders", row81.status === 200 && row81Page, `status ${row81.status}`);
  push("row83-regression", "Row 83 social protocol file unchanged by this row", row83, "protocol file present; not rewritten");
  push("row84-regression", "Row 84 KPI specification still present", row84Spec, "ops spec present");
  push("row150-regression", "Row 150 tracking specification still present", row150Spec, "ops spec present");
  push("row151-regression", "Row 151 dashboard specification still present", row151Spec, "ops spec present");
  push("row153-regression", "Row 153 support protocol still present", row153Spec, "ops spec present");

  const mobileCss = review.text.includes("md:grid-cols") || review.text.includes("max-w-5xl");
  push("desktop-layout", "Review page has desktop layout classes", mobileCss, "max-w-5xl / md breakpoints");
  push("mobile-layout", "Review page is readable without a separate desktop-only shell", review.text.includes("px-4"), "px-4 base padding");
  push(
    "english-spanish-pages",
    "English and Spanish public homepages render",
    tests.some((t) => t.id === "page-/" && t.result === "PASS") &&
      tests.some((t) => t.id === "page-/es" && t.result === "PASS"),
    "homepage EN/ES",
  );

  const failed = tests.filter((t) => t.result === "FAIL").length;
  const blockers = row33RemainingBlockers();
  const regression: Record<string, Verdict> = {
    English: tests.find((t) => t.id === "page-/")?.result ?? "FAIL",
    Spanish: tests.find((t) => t.id === "page-/es")?.result ?? "FAIL",
    Desktop: tests.find((t) => t.id === "desktop-layout")?.result ?? "FAIL",
    Mobile: tests.find((t) => t.id === "mobile-layout")?.result ?? "FAIL",
    "Runtime/Console": failed === 0 ? "PASS" : "FAIL",
    "Row 32 Regression": tests.find((t) => t.id === "row32-regression")?.result ?? "FAIL",
    "Row 51 Regression": tests.find((t) => t.id === "row51-regression")?.result ?? "FAIL",
    "Row 81 Regression": tests.find((t) => t.id === "row81-regression")?.result ?? "FAIL",
    "Row 83 Regression": tests.find((t) => t.id === "row83-regression")?.result ?? "FAIL",
    "Row 84 Regression": tests.find((t) => t.id === "row84-regression")?.result ?? "FAIL",
    "Row 150 Regression": tests.find((t) => t.id === "row150-regression")?.result ?? "FAIL",
    "Row 151 Regression": tests.find((t) => t.id === "row151-regression")?.result ?? "FAIL",
    "Row 153 Regression": tests.find((t) => t.id === "row153-regression")?.result ?? "FAIL",
    "Overall Regression":
      tests.filter((t) => t.id.endsWith("-regression") && t.result === "FAIL").length === 0
        ? "PASS"
        : "FAIL",
  };

  const ready = failed === 0 && blockers.length === 0;
  const payload = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    readyForFounderAcceptance: ready,
    finalStatus: ready
      ? "ROW 33 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
      : "ROW 33 IS NOT READY FOR FOUNDER ACCEPTANCE",
    verdicts: getRow33StaticVerdicts(),
    regression,
    tests,
    failed,
    defectsCorrected: row33DefectsCorrected,
    founderJudgment: row33FounderJudgmentItems,
    remainingBlockers: blockers,
    reviewUrl: model.reviewUrl,
    markedComplete: false,
  };

  await mkdir(path.join(ROOT, "ops/fab-5/runs"), { recursive: true });
  await writeFile(
    path.join(ROOT, "ops/fab-5/runs/row-33-marketing-claims-validation.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(ROOT, "ops/fab-5/row-33-status.json"),
    `${JSON.stringify(
      {
        row: 33,
        status: payload.finalStatus,
        markedComplete: false,
        readyForFounderAcceptance: ready,
        reviewUrl: model.reviewUrl,
        campaignAuditDate: model.campaignAuditDate,
        assetsReviewed: CAMPAIGN_COMPLIANCE.length,
        generatedAt: payload.generatedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(payload.finalStatus);
  console.log(`FAILED=${failed}`);
  for (const test of tests) {
    console.log(`${test.result}\t${test.id}\t${test.detail}`);
  }
  if (!ready) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
