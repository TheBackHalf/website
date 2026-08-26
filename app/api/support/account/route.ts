import { NextResponse } from "next/server";
import { lookupAccountForSupport } from "@/lib/auth/operations/support";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const result = await lookupAccountForSupport(email);

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
    account: result.account,
    passwordHash: undefined,
    secrets: undefined,
  });
}
