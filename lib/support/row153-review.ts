import { getSmtpEnvPresence, isSmtpReady } from "@/lib/auth/email/smtp";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import { gatherLaunchDashboardSources } from "@/lib/launch-dashboard/sources";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import { buildAcknowledgmentText } from "@/lib/support/acknowledge";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_MAILBOX,
  SUPPORT_OWNER_TITLES,
  SUPPORT_TICKET_CATEGORIES,
  ownerTitle,
  refundCategoryPresent,
  slaStateLabel,
  ticketStatusLabel,
  workflowStatusLabel,
} from "@/lib/support/catalog";
import { buildSupportMetrics } from "@/lib/support/metrics";
import { getSupportDurability, getSupportStore } from "@/lib/support/store";
import type { SupportTicket } from "@/lib/support/ticket-types";

export type Row153ReviewTicket = {
  id: string;
  createdAt: string;
  requesterName: string;
  category: string;
  workflow: string;
  status: string;
  priority: string;
  owner: string;
  sla: string;
  escalation: string;
  acknowledgment: string;
  urgent: boolean;
};

function summarizeTicket(ticket: SupportTicket): Row153ReviewTicket {
  const urgent =
    ticket.priority === "P1" ||
    ticket.escalation.status === "notified" ||
    ticket.slaState === "urgent";
  return {
    id: ticket.id,
    createdAt: ticket.createdAt.replace("T", " ").slice(0, 16),
    requesterName: ticket.requesterName,
    category: SUPPORT_CATEGORY_LABELS[ticket.category],
    workflow: workflowStatusLabel(ticket.status),
    status: ticketStatusLabel(ticket.status),
    priority: ticket.priority,
    owner: ownerTitle(ticket.assignedOwner),
    sla: slaStateLabel(ticket.slaState),
    escalation:
      ticket.escalation.status === "notified"
        ? ticket.escalation.targets.map((target) => SUPPORT_OWNER_TITLES[target]).join("; ")
        : "None",
    acknowledgment: ticket.acknowledgment.status,
    urgent,
  };
}

export async function getRow153ReviewModel() {
  const store = getSupportStore();
  const tickets = await store.list({ includeTest: true });
  const metrics = buildSupportMetrics(tickets, dateEt(), { includeTest: true });
  const durability = getSupportDurability();
  const acknowledgment = buildAcknowledgmentText({
    ticketId: "BH-S-20260821-REV01",
    requesterName: "Architect",
    priority: "P3",
  });
  const latest = tickets
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map(summarizeTicket);
  const smtpPresence = getSmtpEnvPresence();
  const smtpReady = isSmtpReady();
  const sentAcknowledgments = tickets.filter(
    (ticket) => ticket.acknowledgment.status === "sent",
  ).length;
  const deliveryVerified = smtpReady && sentAcknowledgments > 0;

  let dashboardNewToday = 0;
  let dashboardOpen = 0;
  let dashboardResolvedToday = 0;
  let dashboardUrgent = 0;
  let dashboardSla = "We typically respond within 3 days, with a goal of 72 hours or less.";
  try {
    const dashboard = buildLaunchDashboardFromSources(
      await gatherLaunchDashboardSources({ includeTest: true }),
      { dateEt: dateEt(), includeTest: true },
    );
    dashboardNewToday = dashboard.support.newToday;
    dashboardOpen = dashboard.support.open;
    dashboardResolvedToday = dashboard.support.resolvedToday;
    dashboardUrgent = dashboard.support.urgentEscalations;
    dashboardSla = dashboard.support.slaStandard;
  } catch {
    // Review page must still render if dashboard aggregation is unavailable.
  }

  return {
    mailbox: SUPPORT_MAILBOX,
    mailto: `mailto:${SUPPORT_MAILBOX}`,
    formEn: "/support",
    formEs: "/es/support",
    admin: "/ops/admin/support",
    dashboard: "/ops/admin/launch-dashboard#support",
    smtpReady,
    smtpPresence: {
      SMTP_HOST: smtpPresence.SMTP_HOST ? "YES" : "NO",
      SMTP_PORT: smtpPresence.SMTP_PORT ? "YES" : "NO",
      SMTP_USER: smtpPresence.SMTP_USER ? "YES" : "NO",
      SMTP_PASSWORD: smtpPresence.SMTP_PASSWORD ? "YES" : "NO",
      SMTP_FROM: smtpPresence.SMTP_FROM ? "YES" : "NO",
    },
    sender: SUPPORT_MAILBOX,
    acknowledgmentDelivery: deliveryVerified ? "PASS" : "FAIL",
    deliveryTest: deliveryVerified ? "VERIFIED" : "NOT VERIFIED",
    durability: durability.productionSourceOfTruth,
    backend: durability.backend,
    refundCategoryPresent: refundCategoryPresent(),
    categories: SUPPORT_TICKET_CATEGORIES.map((id) => SUPPORT_CATEGORY_LABELS[id]),
    owners: {
      primary: SUPPORT_OWNER_TITLES.nia,
      backup: SUPPORT_OWNER_TITLES.michelle,
      technical: SUPPORT_OWNER_TITLES.imani,
    },
    acknowledgmentSubject: acknowledgment.subject,
    acknowledgmentBody: acknowledgment.text,
    ticketCount: tickets.length,
    openCount: metrics.open,
    resolvedToday: metrics.resolvedToday,
    urgentEscalations: metrics.activeUrgentEscalations,
    dashboardNewToday,
    dashboardOpen,
    dashboardResolvedToday,
    dashboardUrgent,
    dashboardSla,
    latest,
  };
}
