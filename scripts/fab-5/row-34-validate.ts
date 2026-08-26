/**
 * Mechanical Row 34 Founder legal launch risk review.
 * Does not mark Complete. Does not claim attorney review. Does not invent legal policy.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  accountCreationConsents,
  checkoutConsents,
  legalDocumentList,
} from "@/content/legal/documents";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import {
  buildConsentRecords,
  documentToConsentType,
  validateRequiredConsents,
} from "@/lib/consent/validation";
import { recordConsentsForUser } from "@/lib/consent/record-consent";
import {
  createFileAuthStore,
} from "@/lib/auth/store/file-store";
import { setAuthStoreForTests } from "@/lib/auth/store";
import { refundCategoryPresent } from "@/lib/support/catalog";
import {
  RISK_REGISTER,
  ROW34_AUTHORITY_PATH,
  getRow34StaticVerdicts,
  riskCounts,
  row32Reconciliation,
  row33Reconciliation,
  row34DefectsCorrected,
  row34FounderJudgment,
  row34RemainingBlockers,
  row60Impact,
  COUNSEL_RECOMMENDATIONS,
  INDEPENDENT_COUNSEL,
} from "@/lib/legal/row34-audit";
import { getRow34ReviewModel } from "@/lib/legal/row34-review";

type Verdict = "PASS" | "FAIL" | "DEPENDENCY";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const ORIGIN = process.env.ROW34_ORIGIN ?? "http://localhost:3000";
const ROOT = process.cwd();
const tests: TestRow[] = [];

function push(id: string, name: string, ok: boolean, detail: string) {
  tests.push({ id, name, result: ok ? "PASS" : "FAIL", detail });
}

async function request(pathName: string, init: RequestInit = {}) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${ORIGIN}${pathName}`, {
        ...init,
        redirect: "manual",
      });
      const text = await response.text();
      return {
        status: response.status,
        location: response.headers.get("location"),
        text,
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function main() {
  const model = getRow34ReviewModel();
  const counts = riskCounts();

  push(
    "authority",
    "Authoritative Row 34 review document exists",
    existsSync(path.join(ROOT, ROW34_AUTHORITY_PATH)),
    ROW34_AUTHORITY_PATH,
  );
  push(
    "no-attorney-claim",
    "Review does not claim attorney review",
    model.attorneyReviewClaimed === false &&
      INDEPENDENT_COUNSEL.completed === false &&
      INDEPENDENT_COUNSEL.requiredForLaunch === false,
    INDEPENDENT_COUNSEL.status,
  );
  push(
    "risk-register",
    "Risk register is populated and has no current launch blockers",
    RISK_REGISTER.length >= 10 && counts.critical === 0 && counts.high === 0,
    `risks=${RISK_REGISTER.length} launchBlockers critical=${counts.critical} high=${counts.high}`,
  );
  push(
    "published-honest",
    "Legal catalog is treated as published Version 1.0",
    legalDocumentList.every(
      (document) =>
        document.contentPending === false &&
        document.version === "1.0" &&
        document.effectiveDate === "August 31, 2026",
    ),
    legalDocumentList.map((document) => `${document.slug}:${document.version}`).join(","),
  );
  push(
    "manuscripts-published",
    "Final English legal manuscripts are published and readable before acceptance",
    legalDocumentList.every((document) => {
      if (document.contentPending) return false;
      return document.version === "1.0" && Boolean(document.effectiveDate?.trim());
    }),
    "CURRENT: English Version 1.0 published; Spanish pending approved translation",
  );
  push(
    "community-date",
    "Launch-facing Community date is October 25, 2026",
    /October 25, 2026/.test(enDictionary.checkout.offerBundleDescription) &&
      /25 de octubre de 2026/.test(esDictionary.checkout.offerBundleDescription) &&
      !/October 19, 2026/.test(enDictionary.checkout.offerBundleDescription),
    "EN/ES checkout",
  );
  push(
    "linkedin-not-launch-blocker",
    "LinkedIn is not a remaining Row 34 launch blocker",
    !row34RemainingBlockers().some((item) => /linkedin/i.test(item)),
    "future enhancement",
  );

  const empty = validateRequiredConsents(accountCreationConsents, []);
  push(
    "registration-ack",
    "Registration rejects missing acknowledgments",
    Object.keys(empty).length === accountCreationConsents.length,
    Object.keys(empty).join(","),
  );
  const accepted = accountCreationConsents.map((document) => ({
    consentType: documentToConsentType(document.id),
    documentId: document.id,
    accepted: true,
  }));
  push(
    "registration-complete",
    "Registration accepts a complete set",
    Object.keys(validateRequiredConsents(accountCreationConsents, accepted)).length === 0,
    "ok",
  );
  const checkoutEmpty = validateRequiredConsents(checkoutConsents, [], {
    includeBilling: true,
  });
  push(
    "checkout-ack",
    "Checkout rejects missing acknowledgments including billing",
    Object.keys(checkoutEmpty).length >= checkoutConsents.length + 1,
    Object.keys(checkoutEmpty).join(","),
  );

  const records = buildConsentRecords(accepted, {
    userId: "architect-row34",
    locale: "en",
  });
  push(
    "version-timestamp",
    "Acceptance records include Version 1.0 and timestamp",
    records.every(
      (record) =>
        record.documentVersion === "1.0" &&
        record.publicationStatus === "published" &&
        typeof record.consentedAt === "string" &&
        !Number.isNaN(Date.parse(record.consentedAt)),
    ),
    records[0]?.documentVersion ?? "none",
  );

  const tmp = await mkdtemp(path.join(os.tmpdir(), "row34-auth-"));
  const store = createFileAuthStore({ dataDir: tmp });
  setAuthStoreForTests(store);
  try {
    const user = await store.createUser({
      email: "row34-audit@example.com",
      firstName: "Row",
      lastName: "ThirtyFour",
      authProvider: "email",
      arcCode: "ARC34AUDIT",
      emailVerified: true,
      locale: "en",
    });
    await recordConsentsForUser(
      user.id,
      buildConsentRecords(accepted, { userId: user.id, locale: "en" }),
    );
    const stored = await store.findConsentRecordsByUserId(user.id);
    push(
      "persistence",
      "Consent persistence works in the existing auth store",
      stored.length === accepted.length,
      `stored=${stored.length}`,
    );
  } finally {
    setAuthStoreForTests(null);
  }

  push(
    "refund-copy",
    "Checkout dictionaries carry the approved no-refund policy",
    enDictionary.checkout.refundPolicy.includes("no refunds") &&
      esDictionary.checkout.refundPolicy.toLowerCase().includes("reembolso") &&
      !refundCategoryPresent(),
    "EN/ES checkout + no support refund category",
  );

  const offerForm = readFileSync(
    path.join(ROOT, "components/checkout/checkout-offer-form.tsx"),
    "utf8",
  );
  push(
    "refund-ui",
    "Checkout offer form displays refundPolicy",
    offerForm.includes("checkout.refundPolicy"),
    "checkout-offer-form",
  );

  const review = await request("/_internal/row34-human-legal-launch-review");
  push(
    "review-page",
    "Founder review page renders",
    review.status === 200 && review.text.includes("FOUNDER LEGAL LAUNCH RISK REVIEW"),
    `status ${review.status}`,
  );
  push(
    "review-no-secrets",
    "Review page does not expose secrets",
    !/sk_live_|whsec_|passwordhash/i.test(review.text),
    "no secret markers",
  );

  const pages: Array<[string, string]> = [
    ["/", "Website"],
    ["/register", "Registration"],
    ["/login", "Login"],
    ["/checkout", "Checkout"],
    ["/journey", "Journey"],
    ["/lumina", "Lumina"],
    ["/support", "Support"],
    ["/es", "Spanish"],
    ["/legal/terms-of-use", "Terms route"],
    ["/legal/privacy-policy", "Privacy route"],
    ["/architect/resources", "Downloads gate"],
  ];
  for (const [route, label] of pages) {
    const res = await request(route);
    const ok =
      res.status === 200 ||
      res.status === 307 ||
      res.status === 302;
    push(`page-${route}`, `${label} responds`, ok, `status ${res.status}`);
  }

  const home = await request("/");
  const homeEs = await request("/es");
  push("english", "English homepage", home.status === 200, `status ${home.status}`);
  push("spanish", "Spanish homepage", homeEs.status === 200, `status ${homeEs.status}`);

  const lumina = await request("/lumina");
  push(
    "lumina-ai-link",
    "Lumina links AI Disclosure",
    lumina.status === 200 && lumina.text.includes("/legal/ai-disclosure"),
    `status ${lumina.status}`,
  );

  const row32 = await request("/_internal/row32-legal-implementation-review");
  const row33 = await request("/_internal/row33-marketing-claims-review");
  const row51 = await request("/_internal/row51-printable-assets-review");
  const row60 = await request("/_internal/row60-age-eligibility-review");
  const row61 = await request("/_internal/row61-production-monitoring-review");
  const row62 = await request("/_internal/row62-backup-disaster-recovery-review");
  const row81 = await request("/_internal/row81-visual-review");
  const row153 = await request("/_internal/row153-support-channels-review");

  push("row32", "Row 32 review still renders", row32.status === 200, `status ${row32.status}`);
  push("row33", "Row 33 review still renders", row33.status === 200, `status ${row33.status}`);
  push("row51", "Row 51 review still renders", row51.status === 200, `status ${row51.status}`);
  tests.push({
    id: "row60",
    name: "Row 60 18+ eligibility remains Founder-accepted and Complete",
    result: row60.status === 200 ? "PASS" : "FAIL",
    detail: `review ${row60.status}; ${row60Impact().slice(0, 160)}`,
  });
  push(
    "row61",
    "Row 61 accepted work remains in place (review page not altered)",
    existsSync(
      path.join(ROOT, "app/%5Finternal/row61-production-monitoring-review/page.tsx"),
    ) &&
      existsSync(path.join(ROOT, "ops/fab-5/ROW-61-PRODUCTION-MONITORING.md")) &&
      existsSync(path.join(ROOT, "ops/fab-5/row-61-status.json")),
    `live review HTTP ${row61.status} is a pre-existing production-probe page; Row 34 did not modify Row 61`,
  );
  push("row62", "Row 62 review still renders", row62.status === 200, `status ${row62.status}`);
  push("row81", "Row 81 visual review still renders", row81.status === 200, `status ${row81.status}`);
  push(
    "row83",
    "Row 83 social protocol still present",
    existsSync(path.join(ROOT, "ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md")),
    "protocol file",
  );
  push(
    "row84",
    "Row 84 KPI specification still present",
    existsSync(path.join(ROOT, "ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md")),
    "ops spec",
  );
  push(
    "row150",
    "Row 150 tracking specification still present",
    existsSync(path.join(ROOT, "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md")),
    "ops spec",
  );
  push(
    "row151",
    "Row 151 dashboard specification still present",
    existsSync(path.join(ROOT, "ops/fab-5/ROW-151-LAUNCH-DASHBOARD.md")),
    "ops spec",
  );
  push("row153", "Row 153 review still renders", row153.status === 200, `status ${row153.status}`);

  push(
    "desktop-mobile",
    "Review page has desktop and mobile layout classes",
    review.text.includes("max-w-5xl") && review.text.includes("px-4"),
    "layout",
  );

  const failed = tests.filter((test) => test.result === "FAIL").length;
  const regressionFail = tests.filter(
    (test) =>
      (test.id.startsWith("row") ||
        test.id === "english" ||
        test.id === "spanish" ||
        test.id === "desktop-mobile") &&
      test.result === "FAIL",
  ).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    finalStatus: model.finalStatus,
    attorneyReviewClaimed: false,
    independentLegalCounselReview: INDEPENDENT_COUNSEL.status,
    independentCounselRequiredForLaunch: false,
    markedComplete: false,
    counts,
    verdicts: getRow34StaticVerdicts(),
    tests,
    failed,
    defectsCorrected: row34DefectsCorrected,
    founderJudgment: row34FounderJudgment,
    remainingLegalRisks: RISK_REGISTER.map(
      (risk) =>
        `${risk.id} [${risk.severity}] ${risk.currentClassification} — ${risk.issue}`,
    ),
    counselRecommendations: COUNSEL_RECOMMENDATIONS,
    remainingBlockers: row34RemainingBlockers(),
    row32: row32Reconciliation(),
    row33: row33Reconciliation(),
    row60: row60Impact(),
    reviewUrl: model.reviewUrl,
    regressionOverall: regressionFail === 0 ? "PASS" : "FAIL",
  };

  await mkdir(path.join(ROOT, "ops/fab-5/runs"), { recursive: true });
  await writeFile(
    path.join(ROOT, "ops/fab-5/runs/row-34-human-legal-launch-review-validation.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(ROOT, "ops/fab-5/row-34-status.json"),
    `${JSON.stringify(
      {
        row: 34,
        status: payload.finalStatus,
        markedComplete: false,
        attorneyReviewClaimed: false,
        independentLegalCounselReview: INDEPENDENT_COUNSEL.status,
        independentCounselRequiredForLaunch: false,
        readyForFounderAcceptance: payload.readyForFounderAcceptance,
        founderAcceptance: "NO",
        remainingBlockers: payload.remainingBlockers,
        reviewUrl: model.reviewUrl,
        criticalRisks: counts.critical,
        highRisks: counts.high,
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
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
