import { NextResponse } from "next/server";
import { ingestBounce } from "@/lib/email/bounce";
import { authorizeHeartbeatRequest } from "@/lib/fab-5/heartbeat";

export const runtime = "nodejs";

function unauthorized(status: 401 | 503) {
  return NextResponse.json(
    { error: status === 503 ? "not_configured" : "unauthorized" },
    { status },
  );
}

export async function POST(request: Request) {
  const auth = authorizeHeartbeatRequest(request.headers.get("authorization"));
  if (auth === "missing_secret") return unauthorized(503);
  if (auth === "unauthorized") return unauthorized(401);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await ingestBounce({
    email: typeof body.email === "string" ? body.email : undefined,
    fromEmail: typeof body.fromEmail === "string" ? body.fromEmail : undefined,
    subject: typeof body.subject === "string" ? body.subject : undefined,
    text: typeof body.text === "string" ? body.text : undefined,
    smtpError: typeof body.smtpError === "string" ? body.smtpError : undefined,
    source: "bounce_api",
    test: body.test === true,
  });

  return NextResponse.json({
    status: "ok",
    ...result,
  });
}
