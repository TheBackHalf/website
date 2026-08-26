import { notFound } from "next/navigation";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "R78-0828-IG-S01.png",
  "R78-0828-IG-S02.png",
  "R78-0828-IG-S03.png",
  "R78-0828-IG-S04.png",
  "R78-0828-LI.png",
  "R78-0828-TT.mp4",
  "R78-0828-TT-cover.png",
  "R78-0829-IG-S01.png",
  "R78-0829-IG-S02.png",
  "R78-0829-IG-S03.png",
  "R78-0829-IG-S04.png",
  "R78-0829-LI.png",
  "R78-0829-TT.mp4",
  "R78-0829-TT-cover.png",
  "R78-0830-IG.png",
  "R78-0830-LI.png",
  "R78-0830-TT.mp4",
  "R78-0830-TT-cover.png",
]);

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
  if (!ALLOWED.has(name)) notFound();
  const filePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "ops/fab-5/campaigns/row-81/assets",
    name,
  );
  const body = new Uint8Array(readFileSync(filePath));
  const contentType = name.endsWith(".mp4") ? "video/mp4" : "image/png";
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
