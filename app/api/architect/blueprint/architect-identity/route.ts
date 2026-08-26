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

  const download = architectDownloadTracker(actor.user.id, "architect-identity");
  await download.started();

  const printPath = `/blueprint/print/artifacts/architect-identity-statement?architectId=${encodeURIComponent(actor.user.id)}`;

  try {
    const pdf = await renderAuthenticatedPrintPdf({ request, printPath });
    await download.completed();
    return pdfAttachmentResponse(
      pdf,
      "back-half-architect-identity-statement.pdf",
    );
  } catch (error) {
    await download.failed();
    console.error(
      "Personalized Architect Identity Statement PDF generation failed:",
      error,
    );
    return NextResponse.json(
      { error: "Unable to generate personalized Architect Identity Statement." },
      { status: 500 },
    );
  }
}
