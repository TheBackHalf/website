import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { architectDownloadTracker } from "@/lib/analytics/downloads";

export async function serveTrackedStaticBlueprintPdf(options: {
  assetId: string;
  filename: string;
}): Promise<NextResponse> {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }
    throw error;
  }

  const download = architectDownloadTracker(actor.user.id, options.assetId);
  await download.started();

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "downloads",
      "blueprint",
      options.filename,
    );
    const pdf = await readFile(filePath);
    await download.completed();
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${options.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await download.failed();
    console.error(`Static Blueprint PDF download failed (${options.assetId}):`, error);
    return NextResponse.json(
      { error: "Unable to download this Architect resource." },
      { status: 500 },
    );
  }
}
