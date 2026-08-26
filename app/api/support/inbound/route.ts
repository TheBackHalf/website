import { NextResponse } from "next/server";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";
import { ingestInboundEmail } from "@/lib/support/inbound";
import { pollSupportMailbox } from "@/lib/support/imap";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function GET(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);
  const result = await pollSupportMailbox();
  return NextResponse.json({ status: "ok", ...result });
}

export async function POST(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (body.poll === true) {
    const result = await pollSupportMailbox({ test: body.test === true });
    return NextResponse.json({ status: "ok", ...result });
  }

  if (typeof body.fromEmail !== "string" || typeof body.subject !== "string" || typeof body.text !== "string") {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const ingested = await ingestInboundEmail({
    messageId:
      typeof body.messageId === "string" && body.messageId.trim()
        ? body.messageId
        : `ingest-${Date.now()}@thebackhalf.org`,
    fromName: typeof body.fromName === "string" ? body.fromName : "",
    fromEmail: body.fromEmail,
    to: typeof body.to === "string" ? body.to : "support@thebackhalf.org",
    subject: body.subject,
    text: body.text,
    inReplyTo: typeof body.inReplyTo === "string" ? body.inReplyTo : undefined,
    references: typeof body.references === "string" ? body.references : undefined,
    test: body.test === true,
  });

  return NextResponse.json({
    status: "ok",
    ticketId: ingested.ticket.id,
    duplicate: ingested.duplicate,
    category: ingested.ticket.category,
    priority: ingested.ticket.priority,
  });
}
