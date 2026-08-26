import { dateEt } from "@/lib/marketing-kpi/attribution";
import { getLaunchDashboardStore } from "@/lib/launch-dashboard/store";
import type { SupportCategory, SupportOpsRecord } from "@/lib/launch-dashboard/types";
import {
  OPEN_TICKET_STATUSES,
  type SupportTicketCategory,
} from "@/lib/support/catalog";
import {
  classifyCategory,
  classifyPriority,
  defaultOwner,
  responseDueAt,
  slaStateFor,
} from "@/lib/support/classify";
import { sendSupportAcknowledgment } from "@/lib/support/acknowledge";
import { applyEscalation } from "@/lib/support/escalate";
import { createSupportTicketId, ticketIdFromText } from "@/lib/support/ids";
import { issueFingerprint, redactSensitive } from "@/lib/support/sanitize";
import { getSupportStore } from "@/lib/support/store";
import type { SupportSource } from "@/lib/support/catalog";
import type { SupportTicket } from "@/lib/support/ticket-types";

export function mapTicketCategoryToDashboard(
  category: SupportTicketCategory,
): SupportCategory {
  switch (category) {
    case "ACCOUNT_LOGIN":
      return "login";
    case "REGISTRATION":
      return "registration";
    case "PAYMENT_BILLING":
      return "payment";
    case "ONBOARDING":
      return "onboarding";
    case "JOURNEY":
      return "journey";
    case "LUMINA":
      return "lumina";
    case "DOWNLOADS_MATERIALS":
      return "downloads";
    case "GENERAL":
      return "general";
    case "OTHER":
      return "other";
    default:
      return "other";
  }
}

export function toSupportOpsRecord(ticket: SupportTicket): SupportOpsRecord {
  const open = OPEN_TICKET_STATUSES.includes(ticket.status);
  return {
    id: ticket.id,
    dateEt: dateEt(ticket.createdAt),
    category: mapTicketCategoryToDashboard(ticket.category),
    status: open ? "open" : "resolved",
    source:
      ticket.source === "social_row83"
        ? "social_row83"
        : ticket.source === "form"
          ? "public_form"
          : "ops_manual",
    delivery: ticket.acknowledgment.status === "sent" ? "recorded" : "recorded",
    responseMinutes: ticket.firstResponseAt
      ? Math.max(
          0,
          Math.round(
            (Date.parse(ticket.firstResponseAt) - Date.parse(ticket.createdAt)) /
              60000,
          ),
        )
      : undefined,
    createdAt: ticket.createdAt,
    resolvedAt: ticket.resolvedAt,
    test: ticket.test,
    priority: ticket.priority,
    slaState: ticket.slaState,
    fingerprint: ticket.fingerprint,
    escalated: ticket.escalation.status === "notified",
  };
}

async function projectToDashboard(ticket: SupportTicket): Promise<void> {
  try {
    await getLaunchDashboardStore().upsertSupport(toSupportOpsRecord(ticket));
  } catch {
    // Dashboard projection must not block the ticket write.
  }
}

export type CreateSupportTicketInput = {
  requesterName: string;
  requesterEmail: string;
  isArchitect?: "yes" | "no" | "unknown";
  category?: string;
  subject: string;
  message: string;
  source: SupportSource;
  channel?: SupportTicket["channel"];
  emailMessageId?: string;
  emailThreadKey?: string;
  test?: boolean;
  acknowledge?: boolean;
};

export async function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<SupportTicket> {
  const now = new Date();
  const store = getSupportStore();

  if (input.emailMessageId) {
    const existing = await store.findByEmailMessageId(input.emailMessageId);
    if (existing) return existing;
  }
  const referenced = ticketIdFromText(`${input.subject}\n${input.message}`);
  if (referenced) {
    const existing = await store.get(referenced);
    if (existing) {
      return appendTicketNote(existing.id, input.message, input.emailMessageId);
    }
  }
  if (input.emailThreadKey) {
    const existing = await store.findByThreadKey(input.emailThreadKey);
    if (existing) {
      return appendTicketNote(existing.id, input.message, input.emailMessageId);
    }
  }

  const subject = redactSensitive(input.subject.trim() || "Support request").text;
  const body = redactSensitive(input.message.trim()).text;
  const category = classifyCategory(input.category, subject, body);
  const priority = classifyPriority(category, subject, body);
  const fingerprint = issueFingerprint(category, subject);
  const email = input.requesterEmail.trim().toLowerCase();
  const recentDuplicate = (await store.list({ includeTest: true })).find((ticket) => {
    if (ticket.requesterEmail !== email) return false;
    if (ticket.fingerprint !== fingerprint) return false;
    if (!OPEN_TICKET_STATUSES.includes(ticket.status)) return false;
    const ageMs = Date.now() - Date.parse(ticket.createdAt);
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 15 * 60 * 1000;
  });
  if (recentDuplicate) return recentDuplicate;

  const id = createSupportTicketId(now);

  let ticket: SupportTicket = {
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    requesterName: input.requesterName.trim() || "Architect",
    requesterEmail: email,
    isArchitect: input.isArchitect ?? "unknown",
    category,
    subject,
    message: body,
    status: "NEW",
    priority,
    assignedOwner: defaultOwner(category),
    responseDueAt: responseDueAt(priority, now),
    slaState: slaStateFor(priority, responseDueAt(priority, now), now),
    acknowledgment: { status: "not_configured" },
    escalation: { status: "none", targets: [] },
    history: [
      {
        at: now.toISOString(),
        actor: "system",
        type: "created",
        note: `Created from ${input.source}. Category ${category}. Priority ${priority}.`,
      },
    ],
    source: input.source,
    channel: input.channel,
    emailMessageIds: input.emailMessageId ? [input.emailMessageId] : [],
    emailThreadKey: input.emailThreadKey,
    fingerprint,
    test: input.test,
  };

  ticket = await applyEscalation(ticket);

  if (input.acknowledge !== false) {
    ticket.acknowledgment = await sendSupportAcknowledgment({
      ticketId: ticket.id,
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      priority: ticket.priority,
      inReplyTo: input.emailMessageId,
    });
    ticket.history.push({
      at: new Date().toISOString(),
      actor: "system",
      type: "acknowledged",
      note: `Acknowledgment ${ticket.acknowledgment.status}.`,
    });
    if (ticket.acknowledgment.status === "sent") {
      ticket.firstResponseAt = ticket.acknowledgment.at;
    }
  }

  const saved = await store.upsert(ticket);
  await projectToDashboard(saved);
  return saved;
}

export async function appendTicketNote(
  id: string,
  message: string,
  emailMessageId?: string,
): Promise<SupportTicket> {
  const store = getSupportStore();
  const existing = await store.get(id);
  if (!existing) {
    throw new Error(`Unknown ticket ${id}`);
  }
  const body = redactSensitive(message).text;
  const now = new Date().toISOString();
  const next: SupportTicket = {
    ...existing,
    updatedAt: now,
    emailMessageIds: emailMessageId
      ? [...new Set([...existing.emailMessageIds, emailMessageId])]
      : existing.emailMessageIds,
    history: [
      ...existing.history,
      {
        at: now,
        actor: "architect",
        type: "reply",
        note: body.slice(0, 500),
      },
    ],
  };
  if (next.status === "WAITING_ON_ARCHITECT") {
    next.status = "IN_PROGRESS";
  }
  const saved = await store.upsert(next);
  await projectToDashboard(saved);
  return saved;
}

export async function transitionTicket(
  id: string,
  status: SupportTicket["status"],
  note?: string,
): Promise<SupportTicket> {
  const store = getSupportStore();
  const existing = await store.get(id);
  if (!existing) {
    throw new Error(`Unknown ticket ${id}`);
  }
  const now = new Date().toISOString();
  const next: SupportTicket = {
    ...existing,
    status,
    updatedAt: now,
    resolvedAt:
      status === "RESOLVED" || status === "CLOSED"
        ? existing.resolvedAt ?? now
        : existing.resolvedAt,
    closedAt: status === "CLOSED" ? now : existing.closedAt,
    firstResponseAt:
      existing.firstResponseAt ??
      (status === "IN_PROGRESS" || status === "ESCALATED" ? now : undefined),
    history: [
      ...existing.history,
      {
        at: now,
        actor: existing.assignedOwner,
        type: "status",
        note: note ? `${status}: ${note}` : status,
      },
    ],
  };
  const saved = await store.upsert(next);
  await projectToDashboard(saved);
  return saved;
}
