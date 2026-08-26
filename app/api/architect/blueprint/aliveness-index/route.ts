import { NextResponse } from "next/server";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { architectDownloadTracker } from "@/lib/analytics/downloads";
import {
  pdfAttachmentResponse,
  renderAuthenticatedPrintPdf,
} from "@/lib/blueprint/render-authenticated-print-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
    }
    throw error;
  }

  const download = architectDownloadTracker(actor.user.id, "aliveness-index");
  await download.started();

  try {
    const pdf = await renderAuthenticatedPrintPdf({
      request,
      printPath: "/blueprint/print/artifacts/aliveness-index",
    });
    await download.completed();
    return pdfAttachmentResponse(pdf, "back-half-aliveness-index.pdf");
  } catch (error) {
    await download.failed();
    console.error("Aliveness Index PDF generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate the Aliveness Index." },
      { status: 500 },
    );
  }
}
