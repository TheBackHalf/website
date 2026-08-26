import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

import {
  ARCHIVE,
  CAMPAIGN_ASSETS,
  resolveProductionFile,
  row82AllowedMediaNames,
} from "@/lib/fab-5/row82-publishing";

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

export async function GET(
  request: Request,
  context: { params: Promise<{ name: string }> },
) {
  if (!isLocalhost(request)) notFound();
  const { name } = await context.params;
  if (!row82AllowedMediaNames().includes(name)) notFound();
  const archiveRel = name.includes("-TT")
    ? `tiktok/${name}`
    : `instagram/${name}`;
  const resolved = resolveProductionFile(archiveRel);
  const fallback = existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), CAMPAIGN_ASSETS, name))
    ? `${CAMPAIGN_ASSETS}/${name}`
    : existsSync(path.join(/* turbopackIgnore: true */ process.cwd(), ARCHIVE, archiveRel))
      ? `${ARCHIVE}/${archiveRel}`
      : null;
  const relative = resolved ?? fallback;
  if (!relative) notFound();
  const body = new Uint8Array(readFileSync(path.join(/* turbopackIgnore: true */ process.cwd(), relative)));
  const contentType = name.endsWith(".mp4") ? "video/mp4" : "image/png";
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
