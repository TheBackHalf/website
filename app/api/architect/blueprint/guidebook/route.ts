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

  const download = architectDownloadTracker(actor.user.id, "guidebook");
  await download.started();

  const printPath = `/blueprint/print/guidebook?variant=print&architectId=${encodeURIComponent(actor.user.id)}`;

  try {
    const pdf = await renderAuthenticatedPrintPdf({ request, printPath });
    await download.completed();
    return pdfAttachmentResponse(pdf, "the-back-half-blueprint.pdf");
  } catch (error) {
    await download.failed();
    console.error("Personalized Blueprint PDF generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate personalized Blueprint." },
      { status: 500 },
    );
  }
}
