import type {
  SupportOwner,
  SupportPriority,
  SupportSource,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/lib/support/catalog";

export type SupportHistoryEntry = {
  at: string;
  actor: SupportOwner | "system" | "architect";
  type: string;
  note: string;
};

export type SupportAcknowledgment = {
  status: "sent" | "logged" | "failed" | "not_configured";
  at?: string;
  messageId?: string;
  error?: string;
};

export type SupportEscalation = {
  status: "none" | "notified";
  targets: SupportOwner[];
  reason?: string;
  at?: string;
};

export type SupportTicket = {
  id: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  requesterName: string;
  requesterEmail: string;
  isArchitect: "yes" | "no" | "unknown";
  category: SupportTicketCategory;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportPriority;
  assignedOwner: SupportOwner;
  responseDueAt: string;
  firstResponseAt?: string;
  slaState: "within" | "approaching" | "overdue" | "urgent";
  acknowledgment: SupportAcknowledgment;
  escalation: SupportEscalation;
  history: SupportHistoryEntry[];
  source: SupportSource;
  channel?: "instagram" | "linkedin" | "tiktok" | "web" | "email";
  emailMessageIds: string[];
  emailThreadKey?: string;
  fingerprint: string;
  test?: boolean;
};

export type SupportDatabase = {
  tickets: SupportTicket[];
  lastUpdatedAt: string;
};
