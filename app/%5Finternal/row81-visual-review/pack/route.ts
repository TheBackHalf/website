import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  if (!isLocalhost(request)) notFound();
  const htmlPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "ops/fab-5/campaigns/row-81/founder-visual-review-pack.html",
  );
  const html = readFileSync(htmlPath, "utf8").replaceAll(
    "src=\"assets/",
    "src=\"/_internal/row81-visual-review/media/",
  );
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
