import { ingestBounce, type BounceIngestResult } from "@/lib/email/bounce";
import { classifyInboundMessage } from "@/lib/email/classify";
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

export type InboundIngestResult =
  | { kind: "ticket"; ticket: SupportTicket; duplicate: boolean }
  | {
      kind: "bounce" | "complaint";
      ticket: null;
      duplicate: false;
      bounce: BounceIngestResult;
    };

export async function ingestInboundEmail(
  email: InboundEmail,
): Promise<InboundIngestResult> {
  const classified = classifyInboundMessage({
    fromEmail: email.fromEmail,
    subject: email.subject,
    text: email.text,
  });
  if (classified.class === "bounce" || classified.class === "complaint") {
    const bounce = await ingestBounce({
      fromEmail: email.fromEmail,
      subject: email.subject,
      text: email.text,
      email: classified.recipient ?? undefined,
      source: "inbound_mailbox",
      test: email.test,
    });
    return {
      kind: classified.class,
      ticket: null,
      duplicate: false,
      bounce,
    };
  }

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
  return {
    kind: "ticket",
    ticket,
    duplicate: Boolean(before) || ticket.emailMessageIds.length > 1,
  };
}
