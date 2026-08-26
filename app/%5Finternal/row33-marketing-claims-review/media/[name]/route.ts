import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { CAMPAIGN_COMPLIANCE } from "@/lib/marketing-claims/campaign-audit";

export const dynamic = "force-dynamic";

function isLocalhost(request: Request) {
  const host = (
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    ""
  )
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  const hostname = host.split(":")[0] ?? "";
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

const FILE_MAP = new Map(
  CAMPAIGN_COMPLIANCE.flatMap((row) =>
    row.previewFiles.map((file) => [path.posix.basename(file).replace(/\\/g, "/"), file] as const),
  ),
);

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  if (!isLocalhost(request)) notFound();
  const { name } = await context.params;
  const relative = FILE_MAP.get(name);
  if (!relative) notFound();
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), relative);
  const body = new Uint8Array(readFileSync(filePath));
  const contentType = name.endsWith(".mp4") ? "video/mp4" : "image/png";
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
