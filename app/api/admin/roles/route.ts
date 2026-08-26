import { NextResponse } from "next/server";
import { assignHumanRoleAction } from "@/lib/auth/operations/admin";

export async function POST(request: Request) {
  let body: { email?: string; role?: string };

  try {
    body = (await request.json()) as { email?: string; role?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const result = await assignHumanRoleAction({
    email: body.email ?? "",
    role: body.role ?? "",
  });

  if (result.status === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (result.status === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (result.status === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    email: result.email,
    role: result.role,
  });
}
