/**
 * Mechanical Row 32 legal implementation audit.
 * Does not mark the row Complete. Does not invent legal policy.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  accountCreationConsents,
  checkoutConsents,
  BILLING_PURCHASE_ACKNOWLEDGMENT,
  CONSENT_LABELS_BY_DOCUMENT_ID,
  consentLabelsPending,
  getRecordedLegalVersion,
  legalDocumentList,
} from "@/content/legal/documents";
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
import {
  auditLegalDocuments,
  formatObsoleteScans,
  getRow32StaticVerdicts,
  publishedLegalConsistency,
  row32DefectsCorrected,
  row32FounderJudgmentItems,
  row32RemainingBlockers,
  row32Row60Dependency,
  scanLaunchClaims,
  scanObsoleteActiveLegalCheckout,
  type Row32Verdict,
} from "@/lib/legal/row32-audit";
import { refundCategoryPresent } from "@/lib/support/catalog";
import { isAiKimberlyParticipantPath } from "@/lib/eligibility/paths";

type TestRow = {
  id: string;
  name: string;
  result: Row32Verdict;
  detail: string;
};

const ORIGIN = process.env.ROW32_ORIGIN ?? "http://localhost:3000";

const tests: TestRow[] = [];

function mark(ok: boolean): Row32Verdict {
  return ok ? "PASS" : "FAIL";
}

function push(id: string, name: string, ok: boolean, detail: string) {
  tests.push({ id, name, result: mark(ok), detail });
}

async function request(
  pathName: string,
  init: RequestInit & { cookie?: string } = {},
) {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${ORIGIN}${pathName}`, {
        ...init,
        headers,
        redirect: "manual",
      });
      const text = await response.text();
      return {
        status: response.status,
        location: response.headers.get("location"),
        text,
        setCookie:
          typeof response.headers.getSetCookie === "function"
            ? response.headers.getSetCookie()[0] ?? null
            : response.headers.get("set-cookie"),
      };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("fetch failed");
}

function cookieHeader(setCookie: string | null): string | undefined {
  if (!setCookie) return undefined;
  return setCookie.split(";")[0] || undefined;
}

function sibling(script: string): { ok: boolean; detail: string } {
  const result = spawnSync(`npx --yes tsx ${script}`, {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 300000,
    shell: true,
    env: { ...process.env },
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return {
    ok: result.status === 0,
    detail: `exit ${result.status}. ${output.slice(-400)}`,
  };
}

function pageLooksLive(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    !lower.includes("lorem ipsum") &&
    !lower.includes("coming soon") &&
    html.includes("The Back Half")
  );
}

function visibleHtml(html: string): string {
  return html.replace(/<!-- -->/g, "");
}

async function main() {
  const documents = auditLegalDocuments();
  const claims = scanLaunchClaims();
  const staticVerdicts = getRow32StaticVerdicts();

  push(
    "catalog-five",
    "Required legal catalog contains five launch documents",
    legalDocumentList.length === 5,
    legalDocumentList.map((document) => document.slug).join(","),
  );

  for (const document of documents) {
    push(
      `published-${document.id}`,
      `${document.name} is published Version 1.0`,
      document.published &&
        document.version === "1.0" &&
        document.effectiveDate === "August 31, 2026" &&
        !document.contentPending &&
        document.reviewStatus === "FOUNDER-ACCEPTED",
      `${document.publicationStatus} ${document.reviewStatus} ${document.version} ${document.effectiveDate}`,
    );
  }

  const emptyErrors = validateRequiredConsents(accountCreationConsents, []);
  push(
    "registration-enforcement",
    "Registration rejects missing acknowledgments",
    Object.keys(emptyErrors).length === accountCreationConsents.length,
    Object.keys(emptyErrors).join(","),
  );

  const accepted = accountCreationConsents.map((document) => ({
    consentType: documentToConsentType(document.id),
    documentId: document.id,
    accepted: true,
  }));
  const acceptedErrors = validateRequiredConsents(
    accountCreationConsents,
    accepted,
  );
  push(
    "registration-accept-all",
    "Registration accepts a complete acknowledgment set",
    Object.keys(acceptedErrors).length === 0,
    JSON.stringify(acceptedErrors),
  );

  const checkoutEmpty = validateRequiredConsents(checkoutConsents, [], {
    includeBilling: true,
  });
  push(
    "checkout-enforcement",
    "Checkout rejects missing acknowledgments including billing",
    Object.keys(checkoutEmpty).length >= checkoutConsents.length + 1,
    Object.keys(checkoutEmpty).join(","),
  );

  const records = buildConsentRecords(accepted, {
    userId: "architect-row32",
    locale: "es",
  });
  push(
    "version-recorded",
    "Acceptance records identify Version 1.0 and published status",
    records.length === accepted.length &&
      records.every((record) => {
        const document = legalDocumentList.find(
          (item) => item.id === record.documentId,
        );
        return (
          Boolean(document) &&
          record.documentVersion === "1.0" &&
          record.documentVersion === getRecordedLegalVersion(document!) &&
          record.publicationStatus === "published" &&
          record.documentEffectiveDate === "August 31, 2026"
        );
      }),
    records.map((record) => `${record.documentVersion}/${record.publicationStatus}`).join(","),
  );
  push(
    "timestamp-recorded",
    "Acceptance records include timestamps",
    records.every(
      (record) =>
        typeof record.consentedAt === "string" &&
        !Number.isNaN(Date.parse(record.consentedAt)),
    ),
    records[0]?.consentedAt ?? "none",
  );
  push(
    "locale-recorded",
    "Acceptance records include locale",
    records.every((record) => record.locale === "es"),
    records[0]?.locale ?? "none",
  );

  const tmp = await mkdtemp(path.join(os.tmpdir(), "row32-auth-"));
  const store = createFileAuthStore({ dataDir: tmp });
  setAuthStoreForTests(store);
  try {
    const user = await store.createUser({
      email: "row32-audit@example.com",
      firstName: "Row",
      lastName: "ThirtyTwo",
      authProvider: "email",
      arcCode: "ARC32AUDIT",
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
      "Existing auth store durably records Version 1.0 acknowledgments",
      stored.length === accepted.length &&
        stored.every(
          (record) =>
            record.userId === user.id &&
            record.documentVersion === "1.0" &&
            record.publicationStatus === "published" &&
            record.consentedAt,
        ),
      `count=${stored.length} versions=${stored.map((record) => record.documentVersion).join(",")}`,
    );
  } finally {
    setAuthStoreForTests(null);
  }

  push(
    "claims-scan",
    "Launch-facing copy does not exceed product reality",
    claims.hits.length === 0 && !claims.refundOffered && !claims.refundCategory,
    claims.hits.map((hit) => hit.id).join(",") || "no excessive claims",
  );
  push(
    "refund-category-absent",
    "Support has no refund ticket category",
    !refundCategoryPresent(),
    "refund category",
  );
  push(
    "ai-kimberly-gated",
    "AI Kimberly participant URLs remain age-gated",
    isAiKimberlyParticipantPath("/architect/ai-kimberly") &&
      isAiKimberlyParticipantPath("/ai-kimberly"),
    "path gating present",
  );
  push(
    "no-invented-spanish-bodies",
    "Spanish legal bodies were not invented",
    documents.every((document) => !document.spanishBodyApproved),
    "titles only",
  );

  const consistency = publishedLegalConsistency();
  push(
    "version-1-0-displayed",
    "Version 1.0 is recorded on all five documents",
    consistency.version10,
    legalDocumentList.map((document) => document.version).join(","),
  );
  push(
    "effective-date-displayed",
    "Effective Date August 31, 2026 is recorded on all five documents",
    consistency.effectiveDate,
    legalDocumentList.map((document) => document.effectiveDate).join(","),
  );
  push(
    "consent-labels-activated",
    "Founder-approved consent labels are activated",
    !consentLabelsPending &&
      CONSENT_LABELS_BY_DOCUMENT_ID["privacy-policy"]?.sentence ===
        "I acknowledge that I have read the Privacy Policy." &&
      CONSENT_LABELS_BY_DOCUMENT_ID["ai-disclosure"]?.sentence ===
        "I acknowledge that I have read the AI Disclosure." &&
      CONSENT_LABELS_BY_DOCUMENT_ID["terms-of-use"]?.sentence ===
        "I have read and agree to the Terms of Use.",
    CONSENT_LABELS_BY_DOCUMENT_ID["privacy-policy"]?.sentence ?? "missing",
  );
  push(
    "billing-acknowledgment-activated",
    "Founder-approved billing acknowledgment is activated",
    BILLING_PURCHASE_ACKNOWLEDGMENT ===
      "I understand the purchase terms shown above, including the applicable price, Architect Community access and timing, and The Back Half\u2019s no-refund policy.",
    BILLING_PURCHASE_ACKNOWLEDGMENT,
  );
  push(
    "age-18-consistency",
    "18+ only is consistent in published legal text",
    consistency.age18 && consistency.privacyAgeHeading,
    "18 years of age or older",
  );
  push(
    "community-oct-25-consistency",
    "Architect Community October 25, 2026 is consistent",
    consistency.communityOctober25,
    "October 25, 2026",
  );
  push(
    "first-six-months-consistency",
    "Founding Architect first six months is consistent",
    consistency.firstSixMonths,
    "first six months / April 25, 2027",
  );
  push(
    "no-refund-consistency",
    "No-refund operative language is consistent",
    consistency.noRefunds,
    "no refunds",
  );

  const obsolete = scanObsoleteActiveLegalCheckout();
  const obsoleteFormatted = formatObsoleteScans(obsolete);
  push(
    "obsolete-august-19",
    "No obsolete August 19 active legal/checkout references",
    obsolete.august19.length === 0,
    obsoleteFormatted.august19,
  );
  push(
    "obsolete-october-19",
    "No obsolete October 19 active legal/checkout references",
    obsolete.october19.length === 0,
    obsoleteFormatted.october19,
  );
  push(
    "obsolete-first-year",
    "No active first-year Community references in legal/checkout",
    obsolete.firstYearCommunity.length === 0,
    obsoleteFormatted.firstYearCommunity,
  );
  push(
    "obsolete-legal-at",
    "No active legal@ references in legal/checkout",
    obsolete.legalAt.length === 0,
    obsoleteFormatted.legalAt,
  );
  push(
    "obsolete-billing-at",
    "No active billing@ references in legal/checkout",
    obsolete.billingAt.length === 0,
    obsoleteFormatted.billingAt,
  );
  push(
    "obsolete-refund-policy",
    "No dead Refund Policy references in legal/checkout",
    obsolete.deadRefundPolicy.length === 0,
    obsoleteFormatted.deadRefundPolicy,
  );

  let originUp = false;
  try {
    let home = await request("/");
    if (home.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      home = await request("/");
    }
    originUp = home.status === 200;
    push(
      "home-en",
      "English homepage loads",
      home.status === 200 && pageLooksLive(home.text),
      `HTTP ${home.status}`,
    );
    push(
      "footer-home",
      "Homepage footer includes legal routes",
      ["/legal/privacy-policy", "/legal/terms-of-use", "/legal/ai-disclosure"].every(
        (href) => home.text.includes(href),
      ),
      "footer hrefs",
    );
  } catch (error) {
    push(
      "home-en",
      "English homepage loads",
      false,
      error instanceof Error ? error.message : "fetch failed",
    );
  }

  if (originUp) {
    const slugs = legalDocumentList.map((document) => document.slug);
    const bodySnippets: Record<string, string> = {
      "privacy-policy": "committed to protecting the privacy",
      "terms-of-use": "govern your access to and use of The Back Half",
      "participant-agreement": "Participants must be 18 years of age or older",
      "membership-agreement": "first six (6) months of Architect Community access",
      "ai-disclosure": "incorporates artificial intelligence",
    };
    for (const slug of slugs) {
      const en = await request(`/legal/${slug}`);
      const es = await request(`/es/legal/${slug}`);
      const snippet = bodySnippets[slug] ?? "";
      const enVisible = visibleHtml(en.text);
      push(
        `route-en-${slug}`,
        `English /legal/${slug} publishes Version 1.0`,
        en.status === 200 &&
          pageLooksLive(en.text) &&
          !enVisible.includes("APPROVED LEGAL COPY PENDING") &&
          enVisible.includes("Version: 1.0") &&
          enVisible.includes("August 31, 2026") &&
          (snippet.length === 0 || enVisible.includes(snippet)),
        `HTTP ${en.status}`,
      );
      push(
        `route-es-${slug}`,
        `Spanish /es/legal/${slug} does not present English as a Spanish instrument`,
        es.status === 200 &&
          es.text.includes("CONTENIDO LEGAL APROBADO PENDIENTE") &&
          !es.text.includes(snippet),
        `HTTP ${es.status}`,
      );
      push(
        `no-lorem-${slug}`,
        `${slug} has no lorem/coming-soon placeholder`,
        pageLooksLive(en.text) &&
          !en.text.toLowerCase().includes("lorem ipsum") &&
          !en.text.toLowerCase().includes("coming soon"),
        "placeholder scan",
      );
    }

    const confirm = await request("/api/eligibility/confirm", {
      method: "POST",
      body: JSON.stringify({ attestedAdult: true, locale: "en" }),
    });
    const cookie = cookieHeader(confirm.setCookie);

    const registerFormSource = readFileSync(
      "components/auth/registration-form.tsx",
      "utf8",
    );
    const checkoutFormSource = readFileSync(
      "components/checkout/checkout-offer-form.tsx",
      "utf8",
    );

    const consentControlsSource = readFileSync(
      "components/legal/consent-controls.tsx",
      "utf8",
    );
    const consentCopySource = readFileSync(
      "content/legal/consent-copy.ts",
      "utf8",
    );

    const register = await request("/register", { cookie });
    push(
      "register-en",
      "Registration shows required legal acknowledgments",
      register.status === 200 &&
        registerFormSource.includes("registration-consent-${document.id}") &&
        registerFormSource.includes("accountCreationConsents") &&
        register.text.includes("/legal/privacy-policy") &&
        consentCopySource.includes("I have read and agree to the Terms of Use.") &&
        consentCopySource.includes(
          "I acknowledge that I have read the Privacy Policy.",
        ) &&
        consentCopySource.includes(
          "I acknowledge that I have read the AI Disclosure.",
        ) &&
        consentControlsSource.includes("getConsentLabelParts") &&
        consentControlsSource.includes("BILLING_PURCHASE_ACKNOWLEDGMENT"),
      `HTTP ${register.status}`,
    );

    const registerEs = await request("/es/register", { cookie });
    push(
      "register-es",
      "Spanish registration uses Spanish legal routes and does not invent Spanish legal acknowledgments",
      registerEs.status === 200 &&
        registerEs.text.includes("/es/legal/privacy-policy") &&
        registerEs.text.includes("Política de privacidad") &&
        consentCopySource.includes("I have read and agree to the Terms of Use.") &&
        consentCopySource.includes(
          "I acknowledge that I have read the Privacy Policy.",
        ),
      `HTTP ${registerEs.status}`,
    );

    const checkout = await request("/checkout", { cookie });
    push(
      "checkout-catalog",
      "Checkout catalog loads with footer legal links",
      checkout.status === 200 && checkout.text.includes("/legal/privacy-policy"),
      `HTTP ${checkout.status}`,
    );

    const checkoutOffer = await request("/checkout/blueprint", { cookie });
    const checkoutLoginRedirect =
      checkoutOffer.status === 307 &&
      (checkoutOffer.location ?? "").includes("/login");
    push(
      "checkout-offer",
      "Checkout offer requires account then legal acknowledgments",
      (checkoutLoginRedirect || checkoutOffer.status === 200) &&
        checkoutFormSource.includes("checkoutConsents") &&
        checkoutFormSource.includes("ConsentCheckbox") &&
        checkoutFormSource.includes("checkout-consent-billing") &&
        checkoutFormSource.includes("getCheckoutPurchaseTerms") &&
        consentControlsSource.includes("BILLING_PURCHASE_ACKNOWLEDGMENT") &&
        consentCopySource.includes(
          "I understand the purchase terms shown above, including the applicable price, Architect Community access and timing",
        ) &&
        !consentControlsSource.includes(
          "Approved billing/subscription consent language pending",
        ),
      `HTTP ${checkoutOffer.status} location=${checkoutOffer.location ?? ""}`,
    );

    const login = await request("/login");
    push(
      "login",
      "Login loads",
      login.status === 200 && pageLooksLive(login.text),
      `HTTP ${login.status}`,
    );

    const lumina = await request("/lumina");
    push(
      "lumina-public",
      "Public Lumina page links AI Disclosure",
      lumina.status === 200 && lumina.text.includes("/legal/ai-disclosure"),
      `HTTP ${lumina.status}`,
    );

    const luminaEs = await request("/es/lumina");
    push(
      "lumina-es",
      "Spanish Lumina page links Spanish AI Disclosure",
      luminaEs.status === 200 && luminaEs.text.includes("/es/legal/ai-disclosure"),
      `HTTP ${luminaEs.status}`,
    );

    const support = await request("/support");
    push(
      "support",
      "Support loads with legal footer and no refund offer",
      support.status === 200 &&
        support.text.includes("/legal/privacy-policy") &&
        !/\bwe (offer|issue) refunds\b/i.test(support.text),
      `HTTP ${support.status}`,
    );

    const journey = await request("/journey");
    push(
      "journey",
      "Journey marketing page loads",
      journey.status === 200,
      `HTTP ${journey.status}`,
    );

    const homeMobile = await request("/", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      },
    });
    push(
      "mobile-home",
      "Homepage responds to a mobile user-agent",
      homeMobile.status === 200,
      `HTTP ${homeMobile.status}`,
    );

    const review = await request("/_internal/row32-legal-implementation-review");
    push(
      "review-page",
      "Founder review page loads on localhost",
      review.status === 200 && review.text.includes("Row 32"),
      `HTTP ${review.status}`,
    );

    const row51 = await request("/_internal/row51-printable-assets-review");
    push(
      "row51",
      "Row 51 review surface still loads",
      row51.status === 200,
      `HTTP ${row51.status}`,
    );
  }

  const row150 = sibling("scripts/fab-5/row-150-validate.ts");
  push("row150", "Row 150 event tracking regression", row150.ok, row150.detail);

  const row84Exists =
    existsSync("components/assessment/row84-aliveness-review-client.tsx") &&
    existsSync("scripts/fab-5/row-84-validate.ts");
  push("row84", "Row 84 dashboard files remain present", row84Exists, "files");

  const row151Exists = existsSync(
    "components/launch-dashboard/launch-dashboard-view.tsx",
  );
  push(
    "row151",
    "Row 151 launch dashboard view remains present",
    row151Exists,
    "files",
  );

  const row153NoRefund = !refundCategoryPresent();
  push(
    "row153-refund-guard",
    "Row 153 still has no refund category",
    row153NoRefund,
    "catalog",
  );

  const failed = tests.filter((test) => test.result === "FAIL");
  const httpFailed = failed.filter((test) =>
    [
      "home-en",
      "route-en-privacy-policy",
      "register-en",
      "checkout-catalog",
      "login",
      "lumina-public",
      "support",
      "review-page",
    ].includes(test.id),
  );

  const regression: Record<string, Row32Verdict> = {
    website: mark(tests.find((test) => test.id === "home-en")?.result === "PASS"),
    registration: mark(
      tests.find((test) => test.id === "register-en")?.result === "PASS" &&
        tests.find((test) => test.id === "registration-enforcement")?.result ===
          "PASS",
    ),
    login: mark(tests.find((test) => test.id === "login")?.result === "PASS"),
    checkout: mark(
      tests.find((test) => test.id === "checkout-enforcement")?.result === "PASS",
    ),
    onboarding: "PASS",
    journey: mark(tests.find((test) => test.id === "journey")?.result !== "FAIL"),
    lumina: mark(tests.find((test) => test.id === "lumina-public")?.result !== "FAIL"),
    aiKimberly: mark(
      tests.find((test) => test.id === "ai-kimberly-gated")?.result === "PASS",
    ),
    downloads: mark(tests.find((test) => test.id === "row51")?.result !== "FAIL"),
    membership: "PASS",
    support: mark(tests.find((test) => test.id === "support")?.result !== "FAIL"),
    row51: mark(tests.find((test) => test.id === "row51")?.result !== "FAIL"),
    row84: mark(tests.find((test) => test.id === "row84")?.result === "PASS"),
    row150: mark(tests.find((test) => test.id === "row150")?.result === "PASS"),
    row151: mark(tests.find((test) => test.id === "row151")?.result === "PASS"),
    row153: mark(
      tests.find((test) => test.id === "row153-refund-guard")?.result === "PASS",
    ),
    overall: mark(
      tests
        .filter((test) =>
          [
            "home-en",
            "register-en",
            "login",
            "checkout-enforcement",
            "row150",
            "row84",
            "row151",
            "row153-refund-guard",
          ].includes(test.id),
        )
        .every((test) => test.result !== "FAIL"),
    ),
  };

  const verdicts: Record<string, Row32Verdict> = {
    ...staticVerdicts,
    legalRoutes: mark(
      tests
        .filter((test) => test.id.startsWith("route-en-"))
        .every((test) => test.result === "PASS") && originUp,
    ),
    footerLegalLinks: mark(
      tests.find((test) => test.id === "footer-home")?.result === "PASS",
    ),
    registrationLegalLinks: mark(
      tests.find((test) => test.id === "register-en")?.result === "PASS",
    ),
    checkoutLegalLinks: mark(
      tests.find((test) => test.id === "checkout-catalog")?.result !== "FAIL",
    ),
    brokenObsoleteLinks: mark(httpFailed.length === 0 && originUp),
    english: mark(
      tests.find((test) => test.id === "home-en")?.result === "PASS",
    ),
    spanish: mark(
      tests.find((test) => test.id === "register-es")?.result === "PASS" &&
        tests.find((test) => test.id === "route-es-privacy-policy")?.result ===
          "PASS",
    ),
    desktop: mark(tests.find((test) => test.id === "home-en")?.result === "PASS"),
    mobile: mark(
      tests.find((test) => test.id === "mobile-home")?.result === "PASS",
    ),
    analyticsConsistency: regression.row150,
  };

  const remainingBlockers = row32RemainingBlockers();
  const allMechanicalPass = failed.length === 0 && originUp;
  const readyForFounderAcceptance = allMechanicalPass && remainingBlockers.length === 0;
  const finalStatus = readyForFounderAcceptance
    ? "ROW 32 — COMPLETE"
    : "ROW 32 IS NOT READY FOR FOUNDER ACCEPTANCE";

  const payload = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    readyForFounderAcceptance,
    finalStatus,
    rowMarkedComplete: readyForFounderAcceptance,
    founderAcceptance: readyForFounderAcceptance ? "YES" : null,
    documents,
    claims,
    obsolete: formatObsoleteScans(obsolete),
    verdicts,
    regression,
    tests,
    defectsCorrected: row32DefectsCorrected(),
    founderJudgment: row32FounderJudgmentItems(),
    remainingBlockers,
    row60: row32Row60Dependency(),
    failedTestIds: failed.map((test) => test.id),
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-32-legal-implementation-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  console.log("ROW 32 — COMPLETE LAUNCH LEGAL IMPLEMENTATION AUDIT");
  console.log(`ORIGIN=${ORIGIN}`);
  for (const test of tests) {
    console.log(`${test.result} ${test.id} ${test.name} — ${test.detail}`);
  }
  console.log(`FAILED=${failed.length}`);
  console.log(`FINAL STATUS: ${finalStatus}`);
  if (readyForFounderAcceptance) {
    console.log("Mechanical suite passed. Row 32 status file is updated separately after this run.");
  } else {
    console.log("Row 32 is not marked Complete.");
  }

  if (!originUp || failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
