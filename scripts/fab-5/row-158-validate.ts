/**
 * Narrow Row 158 validation. Does not mark Complete or record Founder acceptance.
 */

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getRow158ReviewModel } from "@/lib/fab-5/row158-review";
import { redactSensitive } from "@/lib/support/sanitize";
import {
  ANALYTICS_FRICTION_EVENTS,
  ROW_158_FINAL_STATUS,
  ROW_158_LOG_PATH,
  ROW_158_PROTOCOL_PATH,
  VOA_CATEGORIES,
} from "@/lib/voice-of-architect/catalog";
import {
  buildVoiceOfArchitectRecord,
  captureFromAnalyticsEvent,
  captureFromSocialText,
  captureFromSupportTicket,
  classifyVoiceOfArchitect,
  createVoiceOfArchitectId,
  routeToDefectTriage,
  rollupVoiceOfArchitectThemes,
  summarizeVoice,
  upsertVoiceOfArchitectRecord,
} from "@/lib/voice-of-architect";

type TestResult = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function mark(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

async function main() {
  const tests: TestResult[] = [];
  const protocol = existsSync(ROW_158_PROTOCOL_PATH)
    ? readFileSync(ROW_158_PROTOCOL_PATH, "utf8")
    : "";
  const logRaw = existsSync(ROW_158_LOG_PATH)
    ? readFileSync(ROW_158_LOG_PATH, "utf8")
    : "";
  const log = logRaw ? (JSON.parse(logRaw) as { entries?: unknown[] }) : { entries: [] };
  const model = getRow158ReviewModel();

  tests.push({
    id: "protocol-present",
    name: "Row 158 protocol exists",
    result: mark(protocol.length > 0),
    detail: ROW_158_PROTOCOL_PATH,
  });

  tests.push({
    id: "not-complete",
    name: "Row 158 is not marked Complete",
    result: mark(/Not Complete/i.test(protocol) && !model.rowMarkedComplete),
    detail: model.finalStatus,
  });

  tests.push({
    id: "founder-acceptance",
    name: "Founder acceptance is not fabricated",
    result: mark(model.founderAcceptanceRecorded === "NOT YET RECORDED"),
    detail: model.founderAcceptanceRecorded,
  });

  tests.push({
    id: "seven-categories",
    name: "Seven Voice-of-Architect categories are encoded",
    result: mark(VOA_CATEGORIES.length === 7 && model.categories.length === 7),
    detail: VOA_CATEGORIES.join(", "),
  });

  tests.push({
    id: "ledger-empty-live",
    name: "Committed ledger has no live Architect entries",
    result: mark(Array.isArray(log.entries) && log.entries.length === 0),
    detail: `entries=${Array.isArray(log.entries) ? log.entries.length : "missing"}`,
  });

  tests.push({
    id: "no-public-form",
    name: "No new public feedback form",
    result: mark(/does not create a public feedback form/i.test(protocol)),
    detail: model.newPublicForm,
  });

  const outage = classifyVoiceOfArchitect({
    subject: "Checkout is down",
    message: "The site cannot checkout. Payment outage for everyone.",
    supportPriority: "P1",
  });
  const outageHandoff = routeToDefectTriage(outage, "P1", "BH-S-20260831-TEST1");
  tests.push({
    id: "defect-triage-critical",
    name: "Critical checkout outage routes into defect triage immediately",
    result: mark(
      outage.criticalDefect &&
        outage.route === "DEFECT_TRIAGE" &&
        outage.owner === "imani" &&
        outage.immediate &&
        outageHandoff.required &&
        !outageHandoff.waitForCadence,
    ),
    detail: `${outage.category}/${outage.route}/${outage.owner}/immediate=${outage.immediate}`,
  });

  const confusion = classifyVoiceOfArchitect({
    subject: "How do I start",
    message: "I don't understand where to begin the Journey.",
  });
  tests.push({
    id: "confusion-experience",
    name: "Confusion routes to Nia experience theme, not defect triage",
    result: mark(
      confusion.category === "CONFUSION" &&
        confusion.route === "EXPERIENCE_THEME" &&
        confusion.owner === "nia" &&
        !confusion.criticalDefect,
    ),
    detail: `${confusion.category}/${confusion.route}`,
  });

  const compliment = classifyVoiceOfArchitect({
    subject: "Thank you",
    message: "I love this. Magical is Possible.",
  });
  tests.push({
    id: "compliment-not-testimonial",
    name: "Compliment is not treated as a publishable testimonial",
    result: mark(
      compliment.category === "COMPLIMENT" &&
        compliment.route === "COMPLIMENT_LEARNING" &&
        !compliment.criticalDefect,
    ),
    detail: `${compliment.category}/${compliment.route}`,
  });

  const permission = classifyVoiceOfArchitect({
    subject: "You may use my quote",
    message: "You have permission to share my story as a testimonial.",
  });
  tests.push({
    id: "testimonial-hold",
    name: "Testimonial/permission requests hold for Row 33",
    result: mark(
      permission.category === "TESTIMONIAL_PERMISSION" &&
        permission.route === "TESTIMONIAL_PERMISSION_HOLD",
    ),
    detail: `${permission.category}/${permission.route}`,
  });

  const opportunity = classifyVoiceOfArchitect({
    subject: "Feature request",
    message: "You should add a mobile app.",
  });
  tests.push({
    id: "opportunity-deferred",
    name: "Product opportunities hold for deferred enhancement",
    result: mark(
      opportunity.category === "PRODUCT_OPPORTUNITY" &&
        opportunity.route === "DEFERRED_ENHANCEMENT" &&
        !opportunity.criticalDefect,
    ),
    detail: `${opportunity.category}/${opportunity.route}`,
  });

  const privacy = classifyVoiceOfArchitect({
    subject: "Privacy",
    message: "Please review this privacy question about my account.",
    supportCategory: "PRIVACY",
    supportPriority: "P1",
  });
  tests.push({
    id: "privacy-defect-triage",
    name: "Privacy P1 routes into defect triage",
    result: mark(privacy.route === "DEFECT_TRIAGE" && privacy.immediate),
    detail: `${privacy.route}/immediate=${privacy.immediate}`,
  });

  const redacted = summarizeVoice("My password is hunter2 and card 4242424242424242");
  tests.push({
    id: "secrets-redacted",
    name: "Summaries redact credentials and payment-card patterns",
    result: mark(
      redactSensitive(redacted).text === redacted &&
        !/hunter2/.test(redacted) &&
        !/4242 4242 4242 4242/.test(redacted) &&
        /\[redacted-/.test(redacted),
    ),
    detail: redacted,
  });

  const ticketCapture = captureFromSupportTicket({
    id: "BH-S-20260831-TESTA",
    subject: "Cannot log in",
    message: "I cannot log in after purchase.",
    category: "ACCOUNT_LOGIN",
    priority: "P2",
    createdAt: "2026-08-31T12:00:00.000Z",
    source: "form",
    test: true,
  });
  tests.push({
    id: "capture-from-ticket",
    name: "Support tickets map into Voice-of-Architect records",
    result: mark(
      ticketCapture.source === "support_ticket" &&
        ticketCapture.supportTicketId === "BH-S-20260831-TESTA" &&
        ticketCapture.route === "DEFECT_TRIAGE" &&
        ticketCapture.test === true,
    ),
    detail: `${ticketCapture.id}/${ticketCapture.route}`,
  });

  const analyticsCapture = captureFromAnalyticsEvent({
    id: "evt-test-checkout-failed",
    name: "checkout_failed",
    createdAt: "2026-08-31T12:05:00.000Z",
    test: true,
  });
  tests.push({
    id: "capture-from-analytics",
    name: "Row 150 friction events map into defect triage",
    result: mark(
      analyticsCapture !== null &&
        analyticsCapture.route === "DEFECT_TRIAGE" &&
        analyticsCapture.criticalDefect,
    ),
    detail: analyticsCapture
      ? `${analyticsCapture.analyticsEventName}/${analyticsCapture.route}`
      : "null",
  });

  const socialCapture = captureFromSocialText({
    id: "social-test-1",
    text: "I don't understand how to start.",
    createdAt: "2026-08-31T12:10:00.000Z",
    test: true,
  });
  tests.push({
    id: "capture-from-social",
    name: "Row 83 social text maps into confusion/experience theme",
    result: mark(
      socialCapture.source === "social_row83" &&
        socialCapture.category === "CONFUSION" &&
        socialCapture.route === "EXPERIENCE_THEME",
    ),
    detail: `${socialCapture.category}/${socialCapture.route}`,
  });

  const ignoredAnalytics = captureFromAnalyticsEvent({
    id: "evt-page",
    name: "page_viewed",
    createdAt: "2026-08-31T12:15:00.000Z",
    test: true,
  });
  tests.push({
    id: "non-friction-analytics-ignored",
    name: "Non-friction analytics events are not captured",
    result: mark(ignoredAnalytics === null),
    detail: ANALYTICS_FRICTION_EVENTS.join(", "),
  });

  const tempDir = mkdtempSync(path.join(tmpdir(), "row158-voa-"));
  process.env.VOA_LOG_FILE = path.join(tempDir, "log.json");
  const first = await upsertVoiceOfArchitectRecord(ticketCapture);
  const duplicate = await upsertVoiceOfArchitectRecord({
    ...buildVoiceOfArchitectRecord({
      source: "support_ticket",
      subject: ticketCapture.summary,
      message: ticketCapture.summary,
      test: true,
    }),
    fingerprint: ticketCapture.fingerprint,
    test: true,
  });
  tests.push({
    id: "duplicate-fingerprint",
    name: "Duplicate fingerprints are not re-inserted for non-colliding test rows",
    result: mark(first.id === duplicate.id && duplicate.fingerprint === first.fingerprint),
    detail: `${first.id} vs ${duplicate.id}`,
  });

  const rollup = rollupVoiceOfArchitectThemes([ticketCapture, socialCapture, analyticsCapture!]);
  tests.push({
    id: "theme-rollup",
    name: "Theme rollup counts categories and critical items",
    result: mark(
      rollup.length === 7 &&
        rollup.some((row) => row.category === "FRICTION" && row.criticalCount >= 1),
    ),
    detail: rollup
      .filter((row) => row.count > 0)
      .map((row) => `${row.category}:${row.count}`)
      .join(", "),
  });

  const id = createVoiceOfArchitectId(new Date("2026-08-31T16:00:00.000Z"));
  tests.push({
    id: "id-format",
    name: "Voice-of-Architect IDs use BH-VOA-YYYYMMDD-XXXXX",
    result: mark(/^BH-VOA-20260831-[A-Z0-9]{5,}$/.test(id)),
    detail: id,
  });

  tests.push({
    id: "review-model",
    name: "Founder review model remains acceptance-open",
    result: mark(
      model.finalStatus === ROW_158_FINAL_STATUS &&
        model.scenarios.length === 5 &&
        model.scenarios.every((row) => row.publishTestimonial === "NO") &&
        model.scenarios.some((row) => row.defectTriage === "YES"),
    ),
    detail: `scenarios=${model.scenarios.length}; acceptance=${model.founderAcceptanceRecorded}`,
  });

  tests.push({
    id: "no-refund-promise",
    name: "Protocol does not promise refunds or 24/7 support",
    result: mark(
      /Does not promise refunds or 24\/7 support/i.test(protocol) &&
        !/we (offer|issue) refunds/i.test(protocol),
    ),
    detail: "no refund / 24-7 promise",
  });

  const failed = tests.filter((test) => test.result === "FAIL");
  const payload = {
    row: 158,
    aosWorkId: "al-158",
    title: "Create Voice-of-Architect Capture System",
    generatedAt: new Date().toISOString(),
    finalStatus: ROW_158_FINAL_STATUS,
    founderAcceptanceRecorded: false,
    rowMarkedComplete: false,
    stripeConfigModified: false,
    dnsModified: false,
    authWeakened: false,
    tests,
    failed: failed.map((test) => test.id),
    passCount: tests.filter((test) => test.result === "PASS").length,
    failCount: failed.length,
  };
  writeFileSync(
    "ops/fab-5/runs/row-158-voice-of-architect-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );

  const summary = `${payload.passCount}/${tests.length} PASS`;
  if (failed.length > 0) {
    console.error(`Row 158 validation FAILED (${summary})`);
    for (const test of failed) {
      console.error(`- ${test.id}: ${test.detail}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Row 158 validation PASS (${summary}). Founder acceptance not recorded.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
