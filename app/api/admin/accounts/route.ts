import { NextResponse } from "next/server";
import { listArchitectAccountsForAdmin } from "@/lib/auth/operations/admin";

export async function GET() {
  const result = await listArchitectAccountsForAdmin();

  if (result.status === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (result.status === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    accounts: result.accounts,
    // Explicitly never include secrets in admin responses.
    secrets: undefined,
  });
}
