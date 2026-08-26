import { createSupportTicket } from "@/lib/support/create-ticket";
import { ticketIdFromText } from "@/lib/support/ids";
import type { SupportTicket } from "@/lib/support/ticket-types";

export type InboundEmail = {
  messageId: string;
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
  references?: string;
  test?: boolean;
};

function threadKey(email: InboundEmail): string {
  return (
    ticketIdFromText(`${email.subject} ${email.inReplyTo ?? ""} ${email.references ?? ""}`) ??
    email.inReplyTo ??
    email.references ??
    email.messageId
  );
}

export async function ingestInboundEmail(email: InboundEmail): Promise<{
  ticket: SupportTicket;
  duplicate: boolean;
}> {
  const before = ticketIdFromText(
    `${email.subject}\n${email.inReplyTo ?? ""}\n${email.references ?? ""}`,
  );
  const ticket = await createSupportTicket({
    requesterName: email.fromName || email.fromEmail.split("@")[0] || "Architect",
    requesterEmail: email.fromEmail,
    subject: email.subject,
    message: email.text,
    source: "email",
    channel: "email",
    emailMessageId: email.messageId,
    emailThreadKey: threadKey(email),
    test: email.test,
    acknowledge: !before,
  });
  return { ticket, duplicate: Boolean(before) || ticket.emailMessageIds.length > 1 };
}
