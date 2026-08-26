import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { MINIMUM_PARTICIPANT_AGE } from "@/lib/eligibility/policy";
import {
  PASSWORD_MIN_LENGTH,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/auth/config";
import {
  CHECKOUT_OFFERS,
  formatOfferPrice,
} from "@/lib/checkout/offers";
import { CHECKOUT_PURCHASE_TERMS } from "@/lib/checkout/purchase-terms";
import {
  ROW33_COMMUNITY_COMING_COPY,
  ROW33_COMMUNITY_LAUNCH_DATE,
} from "@/lib/marketing-claims/standard";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import {
  isAdminOpsPath,
  isSupportOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import {
  PUBLISHED_RESPONSE_HOURS,
  SUPPORT_MAILBOX,
  refundCategoryPresent,
} from "@/lib/support/catalog";
import {
  BLUEPRINT_PRICE,
  COMMUNITY_COMING_LINE,
  COMMUNITY_LAUNCH_DATE,
  COMMUNITY_PRICE,
  FOUNDING_ARCHITECT_PRICE,
  FOUNDING_COMMUNITY_PERIOD,
  LAUNCH_SUPPORT_ARTICLES,
  LAUNCH_SUPPORT_KB_REQUIRED_TOPICS,
  NO_REFUND_PUBLIC_LINE,
  forbiddenLaunchSupportKbHits,
  getLaunchSupportArticle,
  launchSupportParticipantCorpus,
} from "@/lib/support/knowledge-base";

type TestResult = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function mark(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

async function main() {
  const tests: TestResult[] = [];
  const protocol = "ops/fab-5/ROW-156-LAUNCH-SUPPORT-KNOWLEDGE-BASE.md";
  const kbModule = "lib/support/knowledge-base.ts";
  const page = "app/ops/admin/support/knowledge-base/page.tsx";
  const view = "components/support/support-knowledge-base-view.tsx";
  const consoleFile = "components/support/support-ticket-console.tsx";
  const markdown = existsSync(protocol) ? read(protocol) : "";
  const participantCorpus = launchSupportParticipantCorpus();
  const forbidden = forbiddenLaunchSupportKbHits(participantCorpus);
  const articleIds = LAUNCH_SUPPORT_ARTICLES.map((article) => article.id);
  const payment = getLaunchSupportArticle("payment");
  const community = getLaunchSupportArticle("community-timing");
  const cancel = getLaunchSupportArticle("cancellations");
  const login = getLaunchSupportArticle("login");
  const verification = getLaunchSupportArticle("verification");
  const lumina = getLaunchSupportArticle("lumina");
  const escalation = getLaunchSupportArticle("escalation");

  tests.push({
    id: "T1",
    name: "REQUIRED TOPICS PRESENT",
    result: mark(
      LAUNCH_SUPPORT_KB_REQUIRED_TOPICS.every((id) => articleIds.includes(id)) &&
        LAUNCH_SUPPORT_ARTICLES.length === LAUNCH_SUPPORT_KB_REQUIRED_TOPICS.length,
    ),
    detail: articleIds.join(","),
  });

  tests.push({
    id: "T2",
    name: "NO FORBIDDEN PUBLIC PROMISES",
    result: mark(forbidden.length === 0),
    detail: forbidden.length === 0 ? "none" : forbidden.join("; "),
  });

  tests.push({
    id: "T3",
    name: "NO REFUND CATEGORY AND NO-REFUND COPY",
    result: mark(
      !refundCategoryPresent() &&
        Boolean(payment?.participantFacing.includes(NO_REFUND_PUBLIC_LINE)) &&
        Boolean(cancel?.participantFacing.includes(NO_REFUND_PUBLIC_LINE)) &&
        /does not issue refunds|no refunds/i.test(participantCorpus) &&
        !/\brefunds? available\b/i.test(participantCorpus),
    ),
    detail: `refundCategory=${String(refundCategoryPresent())} publicLine=${NO_REFUND_PUBLIC_LINE}`,
  });

  tests.push({
    id: "T4",
    name: "LIVE OFFER PRICES MATCH CHECKOUT",
    result: mark(
      BLUEPRINT_PRICE === formatOfferPrice(CHECKOUT_OFFERS.blueprint) &&
        FOUNDING_ARCHITECT_PRICE === formatOfferPrice(CHECKOUT_OFFERS.bundle) &&
        COMMUNITY_PRICE === formatOfferPrice(CHECKOUT_OFFERS.community) &&
        Boolean(payment?.participantFacing.includes(BLUEPRINT_PRICE)) &&
        Boolean(payment?.participantFacing.includes(FOUNDING_ARCHITECT_PRICE)) &&
        Boolean(payment?.participantFacing.includes(COMMUNITY_PRICE)) &&
        CHECKOUT_OFFERS.blueprint.amountCents === 150_000 &&
        CHECKOUT_OFFERS.bundle.amountCents === 175_000 &&
        CHECKOUT_OFFERS.community.amountCents === 5_000,
    ),
    detail: `${BLUEPRINT_PRICE}; ${FOUNDING_ARCHITECT_PRICE}; ${COMMUNITY_PRICE}`,
  });

  tests.push({
    id: "T5",
    name: "COMMUNITY TIMING MATCHES APPROVED COPY",
    result: mark(
      COMMUNITY_LAUNCH_DATE === ROW33_COMMUNITY_LAUNCH_DATE &&
        COMMUNITY_COMING_LINE === ROW33_COMMUNITY_COMING_COPY &&
        Boolean(community?.participantFacing.includes(ROW33_COMMUNITY_COMING_COPY)) &&
        Boolean(community?.participantFacing.includes(FOUNDING_COMMUNITY_PERIOD)) &&
        !/October 19, 2026/.test(participantCorpus) &&
        /not live on August 31, 2026/i.test(community?.participantFacing ?? ""),
    ),
    detail: `${COMMUNITY_COMING_LINE}; period=${FOUNDING_COMMUNITY_PERIOD}`,
  });

  tests.push({
    id: "T6",
    name: "AGE AND VERIFICATION MATCH AUTH",
    result: mark(
      MINIMUM_PARTICIPANT_AGE === 18 &&
        PASSWORD_MIN_LENGTH === 8 &&
        VERIFICATION_TOKEN_TTL_MS === 24 * 60 * 60 * 1000 &&
        Boolean(verification?.participantFacing.includes("24 hours")) &&
        Boolean(login?.participantFacing.includes("forgot-password")) &&
        /No magic-link login/.test(login?.internal ?? "") &&
        /No OTP/.test(login?.internal ?? ""),
    ),
    detail: `age=${MINIMUM_PARTICIPANT_AGE} passwordMin=${PASSWORD_MIN_LENGTH} verifyHours=24`,
  });

  tests.push({
    id: "T7",
    name: "SUPPORT CHANNELS AND SLA",
    result: mark(
      SUPPORT_MAILBOX === "support@thebackhalf.org" &&
        PUBLISHED_RESPONSE_HOURS === 72 &&
        Boolean(escalation?.participantFacing.includes(SUPPORT_MAILBOX)) &&
        Boolean(escalation?.participantFacing.includes("72 hours")) &&
        /not a crisis service/i.test(escalation?.participantFacing ?? "") &&
        !/legal@/.test(participantCorpus),
    ),
    detail: `${SUPPORT_MAILBOX}; ${PUBLISHED_RESPONSE_HOURS}h`,
  });

  tests.push({
    id: "T8",
    name: "LUMINA IDENTITY AND SAFETY",
    result: mark(
      Boolean(lumina?.participantFacing.includes("AI Guide")) &&
        /not a person/i.test(lumina?.participantFacing ?? "") &&
        /not the Founder/i.test(lumina?.participantFacing ?? "") &&
        /legal\/ai-disclosure/.test(lumina?.participantFacing ?? "") &&
        /does not provide medical advice/i.test(lumina?.participantFacing ?? ""),
    ),
    detail: "AI Guide; not person; not Founder; disclosure; no clinical advice",
  });

  tests.push({
    id: "T9",
    name: "CHECKOUT TERMS STILL NO REFUNDS AND OCTOBER 25",
    result: mark(
      CHECKOUT_PURCHASE_TERMS.blueprint.includes("NO REFUNDS") &&
        CHECKOUT_PURCHASE_TERMS.bundle.includes("Architect Community launches October 25, 2026") &&
        CHECKOUT_PURCHASE_TERMS.community.includes("NO REFUNDS") &&
        enDictionary.checkout.refundPolicy === NO_REFUND_PUBLIC_LINE,
    ),
    detail: "purchase-terms and dictionary aligned with KB",
  });

  tests.push({
    id: "T10",
    name: "OPERATOR SURFACES EXIST AND STAY SUPPORT-SCOPED",
    result: mark(
      existsSync(protocol) &&
        existsSync(kbModule) &&
        existsSync(page) &&
        existsSync(view) &&
        existsSync(consoleFile) &&
        read(consoleFile).includes("/ops/admin/support/knowledge-base") &&
        isSupportTicketAdminPath("/ops/admin/support/knowledge-base") &&
        isSupportOpsPath("/ops/admin/support/knowledge-base") &&
        !isAdminOpsPath("/ops/admin/support/knowledge-base"),
    ),
    detail: "console link + /ops/admin/support/knowledge-base remains support:ops",
  });

  tests.push({
    id: "T11",
    name: "FOUNDER ACCEPTANCE NOT FABRICATED",
    result: mark(
      /Not Founder-accepted|not marked Complete/i.test(markdown) &&
        !/Founder Acceptance: YES/i.test(markdown) &&
        !/founderAccepted": true/.test(markdown),
    ),
    detail: "Row 156 protocol leaves Founder acceptance open",
  });

  tests.push({
    id: "T12",
    name: "INTERNAL BILLING GAP IS FLAGGED NOT PUBLISHED AS A YEAR",
    result: mark(
      /addOneYear/.test(community?.internal ?? "") &&
        !/first year/i.test(community?.participantFacing ?? "") &&
        !/twelve months/i.test(community?.participantFacing ?? "") &&
        /six months/i.test(community?.participantFacing ?? ""),
    ),
    detail: "participant six months; internal addOneYear gap routed to Imani",
  });

  const failed = tests.filter((test) => test.result === "FAIL");
  const payload = {
    row: 156,
    aosWorkId: "al-156",
    runId: `r156-${new Date().toISOString()}`,
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    protocol,
    operatorConsole: "/ops/admin/support/knowledge-base",
    tracker: "/ops/admin/support",
    form: "/support",
    mailbox: SUPPORT_MAILBOX,
    topics: articleIds,
    tests: {
      tested: tests.length,
      passed: tests.filter((test) => test.result === "PASS").length,
      failed: failed.length,
      result: failed.length === 0 ? "PASS" : "FAIL",
    },
    results: tests,
  };

  const outDir = path.join(process.cwd(), "ops/fab-5/runs");
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, "row-156-launch-support-kb-validation.json");
  await writeFile(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(payload.tests, null, 2));
  for (const test of tests) {
    console.log(`${test.result} ${test.id} ${test.name} — ${test.detail}`);
  }
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
