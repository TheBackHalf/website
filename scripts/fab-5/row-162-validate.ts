/**
 * Mechanical Row 162 email marketing compliance validation.
 * Does not mark the row Complete. Does not record Founder acceptance.
 */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { POST as unsubscribePost } from "@/app/api/email/unsubscribe/route";
import { isAgeEligibilityExemptPath } from "@/lib/eligibility/paths";
import {
  EMAIL_TEMPLATE_CATALOG,
  isMarketingTemplate,
  isTransactionalTemplate,
} from "@/lib/email/classification";
import { MARKETING_FOOTER_MARKER } from "@/lib/email/footer";
import { MARKETING_SENDER } from "@/lib/email/identity";
import {
  addMarketingRecipient,
  assertAutomationMayAddRecipient,
} from "@/lib/email/list";
import { getRow162ReviewModel } from "@/lib/email/review";
import { sendClassifiedEmail } from "@/lib/email/send";
import {
  resetEmailComplianceStoreForTests,
} from "@/lib/email/store";
import { processUnsubscribeRequest } from "@/lib/email/unsubscribe";
import {
  createUnsubscribeToken,
  parseUnsubscribeToken,
} from "@/lib/email/unsubscribe-token";
import { row86MayQueueEmail } from "@/lib/fab-5/row86-outreach";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

function mark(ok: boolean): Verdict {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "row162-email-"));
  process.env.EMAIL_COMPLIANCE_DB_FILE = path.join(tmp, "database.json");
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || "row162-test-auth-secret";
  process.env.EMAIL_SENDER_PHYSICAL_ADDRESS =
    process.env.EMAIL_SENDER_PHYSICAL_ADDRESS ||
    "KLW Group, LLC, 123 Test Postal Address, Atlanta, GA 30301";
  process.env.NEXT_PUBLIC_SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  resetEmailComplianceStoreForTests();

  const tests: TestRow[] = [];
  const recipient = "architect.optin@example.com";
  const suppressedLater = "opted.out@example.com";

  tests.push({
    id: "catalog-separation",
    name: "Transactional and marketing templates are classified separately",
    result: mark(
      EMAIL_TEMPLATE_CATALOG.some((entry) => entry.kind === "transactional") &&
        EMAIL_TEMPLATE_CATALOG.some((entry) => entry.kind === "marketing") &&
        isTransactionalTemplate("auth.verification") &&
        isTransactionalTemplate("billing.payment_success") &&
        isTransactionalTemplate("support.acknowledgment") &&
        isMarketingTemplate("marketing.campaign") &&
        isMarketingTemplate("outreach.audience") &&
        !isMarketingTemplate("auth.password_reset"),
    ),
    detail: `${EMAIL_TEMPLATE_CATALOG.length} catalog entries`,
  });

  const rejectedSources = [
    "account_registration",
    "purchase",
    "inferred",
    "scraped",
    "purchased_list",
    "kit_sync",
  ];
  const rejected = [];
  for (const source of rejectedSources) {
    rejected.push(
      await addMarketingRecipient({
        email: recipient,
        source,
        sourceDetail: source,
        test: true,
      }),
    );
  }
  tests.push({
    id: "consent-source-rejected",
    name: "Registration, purchase, inferred, scraped, purchased-list, and Kit-sync cannot enroll marketing recipients",
    result: mark(rejected.every((row) => row.status === "rejected_source")),
    detail: rejected.map((row) => row.status).join(","),
  });

  const added = await addMarketingRecipient({
    email: recipient,
    source: "explicit_opt_in",
    sourceDetail: "controlled test opt-in",
    method: "web_form",
    test: true,
  });
  tests.push({
    id: "explicit-opt-in",
    name: "Explicit opt-in creates a consent/source record",
    result: mark(added.status === "added"),
    detail: added.status,
  });

  const marketing = await sendClassifiedEmail({
    templateId: "marketing.campaign",
    to: recipient,
    subject: "Controlled test campaign",
    text: "Hello Architect,\n\nThis is a controlled marketing test.",
    locale: "en",
    dryRun: true,
    test: true,
  });
  const composed = marketing.status === "dry_run" ? marketing.composed : undefined;
  tests.push({
    id: "sender-identification",
    name: "Marketing email identifies The Back Half / KLW Group, LLC",
    result: mark(
      Boolean(
        composed &&
          composed.senderBrandName === MARKETING_SENDER.brandName &&
          composed.senderLegalName === MARKETING_SENDER.legalName &&
          composed.fromName === MARKETING_SENDER.fromName &&
          composed.text.includes(MARKETING_SENDER.legalName),
      ),
    ),
    detail: composed ? `${composed.fromName} / ${composed.senderLegalName}` : marketing.status,
  });

  tests.push({
    id: "required-footer",
    name: "Marketing email includes physical address and commercial footer",
    result: mark(
      Boolean(
        composed &&
          composed.text.includes(MARKETING_FOOTER_MARKER) &&
          composed.physicalAddress &&
          composed.text.includes(composed.physicalAddress) &&
          /commercial email/i.test(composed.text),
      ),
    ),
    detail: composed?.physicalAddress ?? marketing.status,
  });

  tests.push({
    id: "unsubscribe-mechanism",
    name: "Marketing email includes visible unsubscribe URL and List-Unsubscribe headers",
    result: mark(
      Boolean(
        composed &&
          composed.unsubscribeUrl &&
          composed.text.includes(composed.unsubscribeUrl) &&
          composed.headers["List-Unsubscribe"] &&
          composed.headers["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click" &&
          composed.headers["X-BH-Email-Kind"] === "marketing",
      ),
    ),
    detail: composed?.unsubscribeUrl ? "unsubscribe_url_present" : marketing.status,
  });

  const added2 = await addMarketingRecipient({
    email: suppressedLater,
    source: "explicit_opt_in",
    sourceDetail: "e2e unsubscribe subject",
    test: true,
  });
  const token = createUnsubscribeToken(suppressedLater);
  const parsed = parseUnsubscribeToken(token);
  const pageUnsub = await processUnsubscribeRequest(token, "unsubscribe_page");
  tests.push({
    id: "unsubscribe-e2e",
    name: "Unsubscribe token processes end-to-end and records suppression",
    result: mark(
      added2.status === "added" &&
        parsed.ok &&
        parsed.email === suppressedLater &&
        pageUnsub.status === "unsubscribed" &&
        pageUnsub.alreadySuppressed === false,
    ),
    detail: `${added2.status}/${pageUnsub.status}`,
  });

  const afterUnsub = await sendClassifiedEmail({
    templateId: "marketing.launch_announcement",
    to: suppressedLater,
    subject: "Should not send",
    text: "You should not receive this.",
    dryRun: true,
    test: true,
  });
  tests.push({
    id: "suppression-blocks-marketing",
    name: "Suppressed recipient is not sent marketing email",
    result: mark(afterUnsub.status === "suppressed"),
    detail: afterUnsub.status,
  });

  const readd = await addMarketingRecipient({
    email: suppressedLater,
    source: "explicit_opt_in",
    sourceDetail: "automation retry",
    automation: true,
    test: true,
  });
  const automation = await assertAutomationMayAddRecipient(suppressedLater);
  const row86 = await row86MayQueueEmail(suppressedLater);
  tests.push({
    id: "automation-cannot-readd",
    name: "Automations cannot re-add a suppressed recipient",
    result: mark(
      readd.status === "suppressed" &&
        readd.error === "suppressed_cannot_readd_by_automation" &&
        automation.allowed === false &&
        row86.allowed === false,
    ),
    detail: `${readd.status}:${"error" in readd ? readd.error : ""}`,
  });

  const transactional = await sendClassifiedEmail({
    templateId: "auth.verification",
    to: suppressedLater,
    subject: "Verify your Back Half account",
    text: "Transactional verification still allowed.",
    dryRun: true,
  });
  tests.push({
    id: "transactional-separation",
    name: "Transactional email still sends to a marketing-suppressed recipient and has no marketing footer",
    result: mark(
      transactional.status === "dry_run" &&
        transactional.composed.kind === "transactional" &&
        transactional.composed.headers["X-BH-Email-Kind"] === "transactional" &&
        !transactional.composed.text.includes(MARKETING_FOOTER_MARKER) &&
        !transactional.composed.headers["List-Unsubscribe"],
    ),
    detail: transactional.status,
  });

  const tampered = parseUnsubscribeToken(`${token}x`);
  tests.push({
    id: "token-integrity",
    name: "Tampered unsubscribe tokens are rejected",
    result: mark(!tampered.ok),
    detail: tampered.ok ? "accepted" : tampered.error,
  });

  const oneClickRecipient = "one.click@example.com";
  await addMarketingRecipient({
    email: oneClickRecipient,
    source: "written_consent",
    sourceDetail: "one-click test",
    method: "written",
    test: true,
  });
  const oneClickToken = createUnsubscribeToken(oneClickRecipient);
  const oneClickResponse = await unsubscribePost(
    new Request(
      `http://localhost:3000/api/email/unsubscribe?token=${encodeURIComponent(oneClickToken)}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      },
    ),
  );
  const oneClickJson = (await oneClickResponse.json()) as { status?: string };
  const oneClickBlocked = await sendClassifiedEmail({
    templateId: "marketing.campaign",
    to: oneClickRecipient,
    subject: "Should not send after one-click",
    text: "Blocked",
    dryRun: true,
    test: true,
  });
  tests.push({
    id: "one-click-unsubscribe",
    name: "RFC 8058 one-click POST unsubscribes and suppresses the recipient",
    result: mark(
      oneClickResponse.status === 200 &&
        oneClickJson.status === "unsubscribed" &&
        oneClickBlocked.status === "suppressed",
    ),
    detail: `http=${oneClickResponse.status} body=${oneClickJson.status} send=${oneClickBlocked.status}`,
  });

  const originalAddress = process.env.EMAIL_SENDER_PHYSICAL_ADDRESS;
  delete process.env.EMAIL_SENDER_PHYSICAL_ADDRESS;
  const missingAddress = await sendClassifiedEmail({
    templateId: "marketing.campaign",
    to: recipient,
    subject: "No address",
    text: "Should fail closed",
    dryRun: true,
    test: true,
  });
  process.env.EMAIL_SENDER_PHYSICAL_ADDRESS = originalAddress;
  tests.push({
    id: "fail-closed-address",
    name: "Marketing send fails closed without a physical postal address",
    result: mark(missingAddress.status === "missing_physical_address"),
    detail: missingAddress.status,
  });

  const noConsent = await sendClassifiedEmail({
    templateId: "marketing.campaign",
    to: "never.opted.in@example.com",
    subject: "No consent",
    text: "Should fail closed",
    dryRun: true,
    test: true,
  });
  tests.push({
    id: "fail-closed-consent",
    name: "Marketing send fails closed without a consent/source record",
    result: mark(noConsent.status === "missing_consent"),
    detail: noConsent.status,
  });

  tests.push({
    id: "unsubscribe-age-exempt",
    name: "Unsubscribe routes are age-eligibility exempt so opt-out remains reachable",
    result: mark(
      isAgeEligibilityExemptPath("/unsubscribe") &&
        isAgeEligibilityExemptPath("/es/unsubscribe") &&
        isAgeEligibilityExemptPath("/api/email/unsubscribe"),
    ),
    detail: "exempt",
  });

  const model = getRow162ReviewModel();
  tests.push({
    id: "not-marked-complete",
    name: "Row 162 is not marked Complete and Founder acceptance is not fabricated",
    result: mark(model.rowMarkedComplete === false && model.founderAccepted === false),
    detail: `complete=${model.rowMarkedComplete} accepted=${model.founderAccepted}`,
  });

  const failed = tests.filter((test) => test.result === "FAIL");
  const payload = {
    generatedAt: new Date().toISOString(),
    row: 162,
    aosWorkId: "al-162",
    origin: "mechanical",
    secretsPrinted: false,
    founderAcceptanceRecorded: false,
    rowMarkedComplete: false,
    kitWired: false,
    summary: {
      total: tests.length,
      pass: tests.filter((test) => test.result === "PASS").length,
      fail: failed.length,
    },
    tests,
    remainingBlockers: model.remainingBlockers,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  const evidencePath = "ops/fab-5/runs/row-162-email-compliance-validation.json";
  await writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await mkdir("ops/fab-5/runs/aos-engineering-status", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/aos-engineering-status/al-162.json",
    `${JSON.stringify(
      {
        aosWorkId: "al-162",
        row: 162,
        deliverable: "Implement Email Marketing Compliance and Suppression Controls",
        operatingAgent: "imani",
        repositorySoftwareChange: true,
        founderAcceptanceRecorded: false,
        rowMarkedComplete: false,
        validation: evidencePath,
        passed: failed.length === 0,
        summary: payload.summary,
        generatedAt: payload.generatedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        result: failed.length === 0 ? "PASS" : "FAIL",
        passed: `${payload.summary.pass}/${payload.summary.total}`,
        evidence: evidencePath,
      },
      null,
      2,
    ),
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
