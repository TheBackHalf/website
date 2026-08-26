import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/access";
import {
  dateEt,
  isLaunchChannel,
  type LaunchChannel,
} from "@/lib/marketing-kpi/attribution";
import { getMarketingKpiStore } from "@/lib/marketing-kpi/store";

export const runtime = "nodejs";

function nullableNumber(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export async function POST(request: Request) {
  try {
    await requirePermission("admin:ops:access");
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const channel = typeof body.channel === "string" ? body.channel : "";
  const day = typeof body.dateEt === "string" ? body.dateEt : "";
  if (!isLaunchChannel(channel) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: "invalid_channel_or_date" }, { status: 400 });
  }

  const fields = {
    reach: nullableNumber(body.reach),
    impressions: nullableNumber(body.impressions),
    engagements: nullableNumber(body.engagements),
    followers: nullableNumber(body.followers),
    followerGrowth: nullableNumber(body.followerGrowth),
    linkClicks: nullableNumber(body.linkClicks),
  };

  if (Object.values(fields).some((value) => value === undefined)) {
    return NextResponse.json({ error: "invalid_metric" }, { status: 400 });
  }

  if (Object.values(fields).some((value) => typeof value === "number" && value < 0)) {
    return NextResponse.json({ error: "negative_count" }, { status: 400 });
  }

  const sourceSystem =
    channel === "instagram"
      ? "native-instagram"
      : channel === "linkedin"
        ? "native-linkedin"
        : "native-tiktok";

  const result = await getMarketingKpiStore().upsertSocialDaily({
    dateEt: day,
    channel: channel as LaunchChannel,
    reach: fields.reach ?? null,
    impressions: fields.impressions ?? null,
    engagements: fields.engagements ?? null,
    followers: fields.followers ?? null,
    followerGrowth: fields.followerGrowth ?? null,
    linkClicks: fields.linkClicks ?? null,
    enteredBy: typeof body.enteredBy === "string" ? body.enteredBy : "admin",
    sourceSystem,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  return NextResponse.json({
    status: result.status,
    record: result.record,
    receivedAt: dateEt(),
  });
}
