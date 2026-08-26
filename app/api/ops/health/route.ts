import { NextResponse } from "next/server";
import {
  getLaunchDashboardSql,
  launchDashboardPostgresConfigured,
} from "@/lib/launch-dashboard/db";

export const runtime = "nodejs";

function environmentLabel(): "production" | "preview" | "development" {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

export async function GET() {
  let database: "ok" | "error" | "unconfigured" = "unconfigured";
  if (launchDashboardPostgresConfigured()) {
    try {
      const sql = getLaunchDashboardSql();
      if (!sql) {
        database = "unconfigured";
      } else {
        const rows = await sql<{ ok: number }[]>`SELECT 1 as ok`;
        database = rows[0]?.ok === 1 ? "ok" : "error";
      }
    } catch {
      database = "error";
    }
  }

  const ok = database !== "error";
  return NextResponse.json(
    {
      ok,
      environment: environmentLabel(),
      service: "the-back-half",
      checks: {
        application: "ok",
        database,
      },
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
