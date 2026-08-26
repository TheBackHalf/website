import { sendSmtpEmail, isSmtpReady } from "@/lib/auth/email/smtp";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import { gatherLaunchDashboardSources } from "@/lib/launch-dashboard/sources";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_MAILBOX,
  SUPPORT_OWNER_TITLES,
  SUPPORT_TICKET_CATEGORIES,
  refundCategoryPresent,
  ticketStatusLabel,
  workflowStatusLabel,
} from "@/lib/support/catalog";
import { buildAcknowledgmentText } from "@/lib/support/acknowledge";
import {
  createSupportTicket,
  transitionTicket,
} from "@/lib/support/create-ticket";
import { ingestInboundEmail } from "@/lib/support/inbound";
import { buildSupportMetrics } from "@/lib/support/metrics";
import { getSupportStore } from "@/lib/support/store";
import { submitSupportRequest } from "@/lib/support/submit-support-request";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { redactSensitive } from "@/lib/support/sanitize";

function loadLocalEnvNames(names: string[]): void {
  if (!existsSync(".env.local")) return;
  const wanted = new Set(names);
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (!wanted.has(key) || process.env[key]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) process.env[key] = value;
  }
}

loadLocalEnvNames([
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPPORT_DB_FILE",
]);

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
  const stamp = Date.now();
  const store = getSupportStore();

  const emailResult = isSmtpReady()
    ? await sendSmtpEmail({
        to: SUPPORT_MAILBOX,
        subject: `[BH-ROW153-TEST] inbound mapping ${stamp}`,
        text: "Row 153 controlled test. Login problem. Do not treat as a live Architect issue.",
        fromName: "The Back Half Support",
        fromAddress: SUPPORT_MAILBOX,
        replyTo: SUPPORT_MAILBOX,
      })
    : { status: "not_configured" as const, error: "SMTP not configured in this environment" };

  const inbound = await ingestInboundEmail({
    messageId: `<row153-email-${stamp}@thebackhalf.org>`,
    fromName: "Test Architect",
    fromEmail: `row153.email.${stamp}@example.com`,
    to: SUPPORT_MAILBOX,
    subject: "I cannot log in to my account",
    text: "I registered but I cannot log in. Please help without asking for my password.",
    test: true,
  });
  tests.push({
    id: "T1",
    name: "SUPPORT EMAIL",
    result: mark(
      inbound.ticket.source === "email" &&
        inbound.ticket.category === "ACCOUNT_LOGIN" &&
        inbound.ticket.assignedOwner === "michelle" &&
        Boolean(inbound.ticket.id.startsWith("BH-S-")),
    ),
    detail: `ticket=${inbound.ticket.id} category=${inbound.ticket.category} smtp=${emailResult.status}`,
  });

  const form = await submitSupportRequest({
    name: "Form Architect",
    email: `row153.form.${stamp}@example.com`,
    category: "JOURNEY",
    subject: "Journey will not save",
    message: "My Journey progress does not save when I leave the chapter.",
    isArchitect: "yes",
    locale: "en",
  });
  const formTicket =
    form.status === "received" ? await store.get(form.ticketId) : undefined;
  tests.push({
    id: "T2",
    name: "SUPPORT FORM",
    result: mark(
      form.status === "received" &&
        Boolean(form.ticketId) &&
        formTicket?.category === "JOURNEY" &&
        formTicket.source === "form",
    ),
    detail:
      form.status === "received"
        ? `ticket=${form.ticketId} ack=${form.acknowledgment}`
        : JSON.stringify(form),
  });

  tests.push({
    id: "T3",
    name: "TICKET ID",
    result: mark(
      Boolean(form.ticketId?.startsWith("BH-S-")) &&
        form.ticketId !== inbound.ticket.id &&
        (await store.get(form.ticketId!))?.id === form.ticketId,
    ),
    detail: `form=${form.status === "received" ? form.ticketId : "none"} email=${inbound.ticket.id}`,
  });

  const reply = await ingestInboundEmail({
    messageId: `<row153-reply-${stamp}@thebackhalf.org>`,
    fromName: "Form Architect",
    fromEmail: `row153.form.${stamp}@example.com`,
    to: SUPPORT_MAILBOX,
    subject: `Re: We received your request [${form.ticketId ?? inbound.ticket.id}]`,
    text: "Following up on the same case.",
    inReplyTo: `<${(form.ticketId ?? inbound.ticket.id).toLowerCase()}@thebackhalf.org>`,
    test: true,
  });
  tests.push({
    id: "T4",
    name: "EMAIL REPLY",
    result: mark(reply.ticket.id === (form.ticketId ?? inbound.ticket.id)),
    detail: `replyTicket=${reply.ticket.id} duplicateFlag=${reply.duplicate}`,
  });

  const categoryCases = [
    ["ACCOUNT_LOGIN", "Cannot log in"],
    ["PAYMENT_BILLING", "My payment went through twice"],
    ["JOURNEY", "Journey chapter will not open"],
    ["LUMINA", "Lumina is not working"],
    ["PRIVACY", "Someone posted my personal data"],
  ] as const;
  const routed = [];
  for (const [category, subject] of categoryCases) {
    const ticket = await createSupportTicket({
      requesterName: "Category Tester",
      requesterEmail: `row153.${category.toLowerCase()}.${stamp}@example.com`,
      category,
      subject,
      message: `${subject}. Controlled Row 153 category routing test.`,
      source: "form",
      test: true,
      acknowledge: false,
    });
    routed.push(ticket);
  }
  tests.push({
    id: "T5",
    name: "CATEGORY ROUTING",
    result: mark(
      routed.every((ticket, index) => ticket.category === categoryCases[index]![0]) &&
        routed.find((ticket) => ticket.category === "PRIVACY")?.escalation.targets.includes(
          "imani",
        ) === true,
    ),
    detail: routed.map((ticket) => `${ticket.category}:${ticket.priority}`).join(", "),
  });

  const overdue = await createSupportTicket({
    requesterName: "SLA Tester",
    requesterEmail: `row153.sla.${stamp}@example.com`,
    category: "GENERAL",
    subject: "When you can, a general question",
    message: "This is a non-urgent informational question for SLA tracking.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  overdue.responseDueAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const storedOverdue = await store.upsert(overdue);
  tests.push({
    id: "T6",
    name: "SLA",
    result: mark(
      Boolean(overdue.responseDueAt) && storedOverdue.slaState === "overdue",
    ),
    detail: `due=${storedOverdue.responseDueAt} sla=${storedOverdue.slaState} priority=${storedOverdue.priority}`,
  });

  const p1 = await createSupportTicket({
    requesterName: "P1 Tester",
    requesterEmail: `row153.p1.${stamp}@example.com`,
    category: "TECHNICAL",
    subject: "Production outage — site is down for everyone",
    message: "Major production outage and suspected security concern. Controlled test only.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T7",
    name: "P1 ESCALATION",
    result: mark(
      p1.priority === "P1" &&
        p1.escalation.targets.includes("imani") &&
        p1.status === "ESCALATED",
    ),
    detail: `priority=${p1.priority} targets=${p1.escalation.targets.join(",")} status=${p1.status}`,
  });

  const experience = await createSupportTicket({
    requesterName: "Experience Tester",
    requesterEmail: `row153.exp.${stamp}@example.com`,
    category: "JOURNEY",
    subject: "Architects cannot continue the journey after purchase",
    message: "Significant architect experience failure: cannot continue the journey. Controlled test.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T8",
    name: "ARCHITECT EXPERIENCE ESCALATION",
    result: mark(
      experience.assignedOwner === "nia" &&
        experience.escalation.targets.includes("nia"),
    ),
    detail: `owner=${experience.assignedOwner} priority=${experience.priority} targets=${experience.escalation.targets.join(",")}`,
  });

  const founder = await createSupportTicket({
    requesterName: "Counsel",
    requesterEmail: `row153.legal.${stamp}@example.com`,
    category: "GENERAL",
    subject: "Attorney demand — litigation threat",
    message: "I am an attorney. This is a litigation threat and legal threat. Controlled test. Do not reply substantively.",
    source: "email",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T9",
    name: "FOUNDER ESCALATION",
    result: mark(
      founder.escalation.targets.includes("founder") &&
        founder.assignedOwner === "nia",
    ),
    detail: `targets=${founder.escalation.targets.join(",")} owner=${founder.assignedOwner}`,
  });

  const social = await createSupportTicket({
    requesterName: "Social Architect",
    requesterEmail: `row153.social.${stamp}@example.com`,
    category: "ACCOUNT_LOGIN",
    subject: "Instagram comment: cannot log in",
    message: "Routed from Instagram comments. Login problem. No password collected.",
    source: "social_row83",
    channel: "instagram",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T10",
    name: "SOCIAL HANDOFF",
    result: mark(
      social.source === "social_row83" &&
        social.channel === "instagram" &&
        Boolean(social.id.startsWith("BH-S-")),
    ),
    detail: `ticket=${social.id} source=${social.source}`,
  });

  const ack = buildAcknowledgmentText({
    ticketId: "BH-S-20260819-TEST1",
    requesterName: "Kimberly",
    priority: "P3",
  });
  const ackP1 = buildAcknowledgmentText({
    ticketId: "BH-S-20260819-TEST2",
    requesterName: "Kimberly",
    priority: "P1",
  });
  tests.push({
    id: "T11",
    name: "AUTOMATED ACKNOWLEDGMENT",
    result: mark(
      ack.subject.includes("BH-S-20260819-TEST1") &&
        ack.text.includes("The Back Half Support") &&
        ack.text.includes(SUPPORT_MAILBOX) &&
        ack.text.includes("72 hours") &&
        !ack.text.toLowerCase().includes("refund") &&
        ackP1.text.toLowerCase().includes("urgent") &&
        !ackP1.text.includes("typically respond within 3 days"),
    ),
    detail: ack.subject,
  });

  const leaked = redactSensitive(
    "password: secret1234 and card 4242 4242 4242 4242 cvv 123",
  );
  const privacyForm = await submitSupportRequest({
    name: "Privacy Check",
    email: `row153.privacyform.${stamp}@example.com`,
    category: "PRIVACY",
    subject: "Question about my account",
    message: "Please help with a privacy question. I will not send a password here.",
    isArchitect: "yes",
    locale: "en",
  });
  tests.push({
    id: "T12",
    name: "PRIVACY",
    result: mark(
      leaked.redacted &&
        !leaked.text.includes("secret1234") &&
        !leaked.text.includes("4242") &&
        privacyForm.status === "received",
    ),
    detail: leaked.text,
  });

  const repeatA = await createSupportTicket({
    requesterName: "Repeat One",
    requesterEmail: `row153.r1.${stamp}@example.com`,
    category: "LUMINA",
    subject: "Lumina timeout error",
    message: "Lumina shows a timeout error when opening a chat.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  const repeatB = await createSupportTicket({
    requesterName: "Repeat Two",
    requesterEmail: `row153.r2.${stamp}@example.com`,
    category: "LUMINA",
    subject: "Lumina timeout error",
    message: "Same Lumina timeout error for a second Architect.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  const metrics = buildSupportMetrics(
    await store.list({ includeTest: true }),
    dateEt(),
    { includeTest: true },
  );
  tests.push({
    id: "T13",
    name: "REPEAT ISSUE",
    result: mark(
      metrics.repeatIssues.some((row) => row.category === "LUMINA" && row.count >= 2) &&
        repeatA.fingerprint === repeatB.fingerprint,
    ),
    detail: metrics.repeatIssues
      .map((row) => `${row.category}:${row.count}`)
      .join(", "),
  });

  const dashboard = buildLaunchDashboardFromSources(
    await gatherLaunchDashboardSources({ includeTest: true }),
    { dateEt: dateEt(), includeTest: true },
  );
  tests.push({
    id: "T14",
    name: "ROW 151 DATA",
    result: mark(
      typeof dashboard.support.newToday === "number" &&
        typeof dashboard.support.open === "number" &&
        typeof dashboard.support.overdue === "number" &&
        typeof dashboard.support.p1Open === "number" &&
        typeof dashboard.support.repeatIssues === "number" &&
        dashboard.support.slaStandard.toLowerCase().includes("72"),
    ),
    detail: `new=${dashboard.support.newToday} open=${dashboard.support.open} p1=${dashboard.support.p1Open} overdue=${dashboard.support.overdue}`,
  });

  if (form.status === "received") {
    await transitionTicket(form.ticketId, "IN_PROGRESS", "Assigned for Row 153 closed-loop test");
    const resolved = await transitionTicket(form.ticketId, "RESOLVED", "Resolved in test");
    const closed = await transitionTicket(form.ticketId, "CLOSED", "Closed in test");
    tests.push({
      id: "T15",
      name: "CLOSED LOOP",
      result: mark(
        closed.status === "CLOSED" &&
          Boolean(closed.resolvedAt) &&
          Boolean(closed.closedAt) &&
          closed.history.some((entry) => entry.note.includes("IN_PROGRESS")) &&
          resolved.id === closed.id,
      ),
      detail: `history=${closed.history.map((entry) => entry.type).join(">")}`,
    });
  } else {
    tests.push({
      id: "T15",
      name: "CLOSED LOOP",
      result: "FAIL",
      detail: "No form ticket to close",
    });
  }

  await transitionTicket(p1.id, "CLOSED", "Close controlled P1 test incident");
  await transitionTicket(founder.id, "CLOSED", "Close controlled Founder test");

  const other = await createSupportTicket({
    requesterName: "Other Tester",
    requesterEmail: `row153.other.${stamp}@example.com`,
    category: "OTHER",
    subject: "Something else not listed",
    message: "This request does not fit the other categories. Controlled test.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T16",
    name: "OTHER CATEGORY",
    result: mark(other.category === "OTHER" && other.assignedOwner === "nia"),
    detail: `category=${other.category} owner=${other.assignedOwner}`,
  });

  tests.push({
    id: "T17",
    name: "NO REFUND CATEGORY",
    result: mark(
      !refundCategoryPresent() &&
        !SUPPORT_TICKET_CATEGORIES.some((id) => /refund/i.test(id)) &&
        !Object.values(SUPPORT_CATEGORY_LABELS).some((label) => /refund/i.test(label)),
    ),
    detail: SUPPORT_TICKET_CATEGORIES.map((id) => SUPPORT_CATEGORY_LABELS[id]).join(", "),
  });

  tests.push({
    id: "T18",
    name: "DISPLAY CAPITALIZATION",
    result: mark(
      SUPPORT_CATEGORY_LABELS.PAYMENT_BILLING === "Payment" &&
        SUPPORT_CATEGORY_LABELS.DOWNLOADS_MATERIALS === "Downloads" &&
        SUPPORT_CATEGORY_LABELS.OTHER === "Other" &&
        ticketStatusLabel("RESOLVED") === "Resolved" &&
        workflowStatusLabel("NEW") === "Open" &&
        workflowStatusLabel("RESOLVED") === "Resolved" &&
        SUPPORT_OWNER_TITLES.imani.startsWith("Imani Heartbeat"),
    ),
    detail: `Payment=${SUPPORT_CATEGORY_LABELS.PAYMENT_BILLING} Open=${workflowStatusLabel("NEW")}`,
  });

  const dupA = await createSupportTicket({
    requesterName: "Duplicate Architect",
    requesterEmail: `row153.dup.${stamp}@example.com`,
    category: "GENERAL",
    subject: "Duplicate prevention check",
    message: "Please keep this as one ticket if submitted twice.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  const dupB = await createSupportTicket({
    requesterName: "Duplicate Architect",
    requesterEmail: `row153.dup.${stamp}@example.com`,
    category: "GENERAL",
    subject: "Duplicate prevention check",
    message: "Please keep this as one ticket if submitted twice.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T19",
    name: "DUPLICATE PREVENTION",
    result: mark(dupA.id === dupB.id),
    detail: `first=${dupA.id} second=${dupB.id}`,
  });

  tests.push({
    id: "T20",
    name: "STANDARD NOT URGENT",
    result: mark(
      overdue.priority === "P4" &&
        overdue.escalation.status === "none" &&
        overdue.escalation.targets.length === 0,
    ),
    detail: `priority=${overdue.priority} escalation=${overdue.escalation.status}`,
  });

  const security = await createSupportTicket({
    requesterName: "Security Architect",
    requesterEmail: `row153.sec.${stamp}@example.com`,
    category: "ACCOUNT_LOGIN",
    subject: "Unauthorized access — account compromised",
    message: "I believe my account was hacked. Unauthorized access. Do not ask for my password.",
    source: "form",
    test: true,
    acknowledge: false,
  });
  tests.push({
    id: "T21",
    name: "ACCOUNT SECURITY ESCALATION",
    result: mark(
      security.priority === "P1" &&
        security.escalation.targets.includes("imani") &&
        security.assignedOwner === "michelle" &&
        security.status === "ESCALATED",
    ),
    detail: `priority=${security.priority} owner=${security.assignedOwner} targets=${security.escalation.targets.join(",")}`,
  });

  tests.push({
    id: "T22",
    name: "OWNERSHIP ROUTING",
    result: mark(
      inbound.ticket.assignedOwner === "michelle" &&
        other.assignedOwner === "nia" &&
        p1.escalation.targets.includes("imani") &&
        security.escalation.targets.includes("imani") &&
        !p1.escalation.targets.includes("founder"),
    ),
    detail: `loginOwner=${inbound.ticket.assignedOwner} cxOwner=${other.assignedOwner} p1=${p1.escalation.targets.join(",")}`,
  });

  const deliveryTicket =
    form.status === "received" ? await store.get(form.ticketId) : undefined;
  tests.push({
    id: "T23",
    name: "ACKNOWLEDGMENT DELIVERY",
    result: mark(
      isSmtpReady() &&
        (emailResult.status === "sent" || deliveryTicket?.acknowledgment.status === "sent"),
    ),
    detail: `smtpReady=${isSmtpReady()} smtpTest=${emailResult.status} formAck=${deliveryTicket?.acknowledgment.status ?? "none"}`,
  });

  const passed = tests.filter((test) => test.result === "PASS").length;
  const payload = {
    row: 153,
    runId: `r153-${new Date().toISOString()}`,
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    protocol: "ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md",
    tracker: "/ops/admin/support",
    form: "/support",
    mailbox: SUPPORT_MAILBOX,
    categories: SUPPORT_TICKET_CATEGORIES.map((id) => ({
      id,
      label: SUPPORT_CATEGORY_LABELS[id],
    })),
    acknowledgmentSample: ack.text,
    smtp: emailResult.status,
    tests: {
      tested: tests.length,
      passed,
      failed: tests.length - passed,
      result: passed === tests.length ? "PASS" : "FAIL",
    },
    results: tests,
    result: passed === tests.length ? "PASS" : "FAIL",
    readyForFounderAcceptanceReview: passed === tests.length,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-153-support-channels-validation.json",
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ result: payload.result, passed: `${passed}/${tests.length}`, smtp: emailResult.status }, null, 2));
  if (passed !== tests.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
