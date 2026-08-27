import { classifyPrivacyText } from "@/lib/privacy/classify";
import { createPrivacyRequest } from "@/lib/privacy/create-request";
import type { SupportTicket } from "@/lib/support/ticket-types";

export async function openPrivacyRequestFromSupportTicket(
  ticket: SupportTicket,
): Promise<string | undefined> {
  if (ticket.category !== "PRIVACY") return undefined;
  const classified = classifyPrivacyText(undefined, ticket.subject, ticket.message);
  if (classified.kind === "incident") return undefined;
  try {
    const created = await createPrivacyRequest({
      requesterName: ticket.requesterName,
      requesterEmail: ticket.requesterEmail,
      type: classified.type,
      subject: ticket.subject,
      message: ticket.message,
      source: ticket.source === "email" ? "email" : "support_ticket",
      supportTicketId: ticket.id,
      test: ticket.test,
      acknowledge: false,
    });
    return created.request.id;
  } catch {
    return undefined;
  }
}
