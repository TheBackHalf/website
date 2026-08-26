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

  const download = architectDownloadTracker(actor.user.id, "expansion-plan");
  await download.started();

  const printPath = `/blueprint/print/artifacts/expansion-plan?architectId=${encodeURIComponent(actor.user.id)}`;

  try {
    const pdf = await renderAuthenticatedPrintPdf({ request, printPath });
    await download.completed();
    return pdfAttachmentResponse(pdf, "back-half-expansion-plan.pdf");
  } catch (error) {
    await download.failed();
    console.error("Personalized Expansion Plan PDF generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate personalized Expansion Plan." },
      { status: 500 },
    );
  }
}
