import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  SUPPORT_OWNER_TITLES,
  ownerTitles,
  type SupportOwner,
  type SupportTicketCategory,
} from "@/lib/support/catalog";
import { autoEscalationTargets } from "@/lib/support/classify";
import type { SupportEscalation, SupportTicket } from "@/lib/support/ticket-types";

const DECISION_LOG = "ops/fab-5/decision-log.json";

type DecisionLog = {
  store?: string;
  rule?: string;
  entries: Array<Record<string, unknown>>;
};

async function appendDecision(entry: Record<string, unknown>): Promise<void> {
  try {
    const raw = await readFile(DECISION_LOG, "utf8");
    const parsed = JSON.parse(raw) as DecisionLog;
    parsed.entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    parsed.entries.push(entry);
    await mkdir("ops/fab-5", { recursive: true });
    await writeFile(DECISION_LOG, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  } catch {
    // Decision log write must not block ticket creation.
  }
}

export async function applyEscalation(ticket: SupportTicket): Promise<SupportTicket> {
  const { targets, reason } = autoEscalationTargets(
    ticket.category,
    ticket.priority,
    ticket.subject,
    ticket.message,
  );
  if (targets.length === 0) {
    return {
      ...ticket,
      escalation: ticket.escalation.status === "notified" ? ticket.escalation : { status: "none", targets: [] },
    };
  }

  const escalation: SupportEscalation = {
    status: "notified",
    targets,
    reason,
    at: new Date().toISOString(),
  };

  if (ticket.test !== true) {
    await appendDecision({
      id: `support-escalation-${ticket.id}`,
      at: new Date().toISOString().slice(0, 10),
      type: targets.includes("founder") ? "action_required" : "support_escalation",
      status: "open",
      founderAcceptance: null,
      summary: `${ticket.id} ${reason ?? "Escalated."} Category ${ticket.category} priority ${ticket.priority}. Owners: ${targets
        .map((owner) => SUPPORT_OWNER_TITLES[owner])
        .join("; ")}.`,
      owner: "michelle",
      requiresFounderAcceptance: targets.includes("founder"),
      ticketId: ticket.id,
    });
  }

  return {
    ...ticket,
    status: ticket.status === "NEW" ? "ESCALATED" : ticket.status,
    escalation,
    history: [
      ...ticket.history,
      {
        at: escalation.at!,
        actor: "system",
        type: "escalated",
        note: `${reason ?? "Escalation."} Routed to ${ownerTitles(targets)}.`,
      },
    ],
  };
}

export function routingFor(
  category: SupportTicketCategory,
  targets: SupportOwner[],
): string {
  const bits = [
    "Nia Prism — Chief Experience & Transformation Officer (primary support / customer experience)",
    "Michelle Northstar — Chief of Staff & Operations Officer (backup / routing / operations)",
  ];
  if (targets.includes("imani")) {
    bits.push("Imani Heartbeat — Chief Technology & Risk Officer (technical / security)");
  }
  if (targets.includes("founder")) {
    bits.push("Founder (escalation only)");
  }
  if (category === "PRIVACY") {
    bits.push("Privacy handling: do not repeat sensitive values; no legal@ mailbox");
  }
  return bits.join(" → ");
}
