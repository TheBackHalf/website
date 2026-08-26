import { dateEt } from "@/lib/marketing-kpi/attribution";
import {
  OPEN_TICKET_STATUSES,
  SUPPORT_TICKET_CATEGORIES,
  type SupportPriority,
  type SupportTicketCategory,
} from "@/lib/support/catalog";
import type { SupportTicket } from "@/lib/support/ticket-types";

export type SupportRepeatIssue = {
  fingerprint: string;
  category: SupportTicketCategory;
  count: number;
  open: number;
  sampleSubject: string;
};

export type SupportOperationsMetrics = {
  generatedAt: string;
  dateEt: string;
  newToday: number;
  open: number;
  resolvedToday: number;
  unresolved: number;
  overdue: number;
  approaching: number;
  urgent: number;
  p1: number;
  p2: number;
  byCategory: Array<{ category: SupportTicketCategory; today: number; open: number }>;
  repeatIssues: SupportRepeatIssue[];
  socialRoutedToday: number;
  socialRoutedOpen: number;
  activeUrgentEscalations: number;
  medianFirstResponseMinutes: number | null;
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

export function buildSupportMetrics(
  tickets: SupportTicket[],
  day = dateEt(),
  options?: { includeTest?: boolean },
): SupportOperationsMetrics {
  const live = options?.includeTest ? tickets : tickets.filter((ticket) => !ticket.test);
  const open = live.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status));
  const today = live.filter((ticket) => dateEt(ticket.createdAt) === day);
  const resolvedToday = live.filter(
    (ticket) => ticket.resolvedAt && dateEt(ticket.resolvedAt) === day,
  );
  const byPriority = (priority: SupportPriority) =>
    open.filter((ticket) => ticket.priority === priority).length;
  const groups = new Map<string, SupportRepeatIssue>();
  for (const ticket of live) {
    const current = groups.get(ticket.fingerprint) ?? {
      fingerprint: ticket.fingerprint,
      category: ticket.category,
      count: 0,
      open: 0,
      sampleSubject: ticket.subject,
    };
    current.count += 1;
    if (OPEN_TICKET_STATUSES.includes(ticket.status)) current.open += 1;
    groups.set(ticket.fingerprint, current);
  }

  const firstResponses = live
    .filter((ticket) => ticket.firstResponseAt)
    .map((ticket) =>
      Math.round(
        (Date.parse(ticket.firstResponseAt!) - Date.parse(ticket.createdAt)) / 60000,
      ),
    )
    .filter((value) => Number.isFinite(value) && value >= 0);

  return {
    generatedAt: new Date().toISOString(),
    dateEt: day,
    newToday: today.length,
    open: open.length,
    resolvedToday: resolvedToday.length,
    unresolved: open.length,
    overdue: open.filter((ticket) => ticket.slaState === "overdue").length,
    approaching: open.filter((ticket) => ticket.slaState === "approaching").length,
    urgent: open.filter((ticket) => ticket.priority === "P1" || ticket.slaState === "urgent")
      .length,
    p1: byPriority("P1"),
    p2: byPriority("P2"),
    byCategory: SUPPORT_TICKET_CATEGORIES.map((category) => ({
      category,
      today: today.filter((ticket) => ticket.category === category).length,
      open: open.filter((ticket) => ticket.category === category).length,
    })),
    repeatIssues: [...groups.values()]
      .filter((row) => row.count >= 2)
      .sort((a, b) => b.count - a.count),
    socialRoutedToday: today.filter((ticket) => ticket.source === "social_row83").length,
    socialRoutedOpen: open.filter((ticket) => ticket.source === "social_row83").length,
    activeUrgentEscalations: open.filter(
      (ticket) => ticket.escalation.status === "notified" && ticket.priority === "P1",
    ).length,
    medianFirstResponseMinutes: median(firstResponses),
  };
}
