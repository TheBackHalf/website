import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import { SUPPORT_TICKET_STATUSES, type SupportTicketStatus } from "@/lib/support/catalog";
import { getSupportStore } from "@/lib/support/store";
import { transitionTicket } from "@/lib/support/create-ticket";
import { pollSupportMailbox } from "@/lib/support/imap";
import { buildSupportMetrics } from "@/lib/support/metrics";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("support:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tickets = await getSupportStore().list({ includeTest: false });
  return NextResponse.json({
    tickets,
    metrics: buildSupportMetrics(tickets),
  });
}

export async function POST(request: Request) {
  try {
    await requirePermission("support:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (body.fetchMail === true) {
    const result = await pollSupportMailbox();
    const tickets = await getSupportStore().list({ includeTest: false });
    return NextResponse.json({ status: "ok", ...result, metrics: buildSupportMetrics(tickets) });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = (
    typeof body.status === "string" &&
    (SUPPORT_TICKET_STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : ""
  ) as SupportTicketStatus | "";
  if (!id || !status) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const ticket = await transitionTicket(
    id,
    status,
    typeof body.note === "string" ? body.note : undefined,
  );
  return NextResponse.json({ status: "saved", ticket });
}
