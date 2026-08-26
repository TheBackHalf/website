import { NextResponse } from "next/server";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { architectDownloadTracker } from "@/lib/analytics/downloads";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
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

  const chapter7 = await getChapter7Store().findChapter7ForUser(actor.user.id);
  if (chapter7?.status !== "completed") {
    return NextResponse.json(
      { error: "Certificate is available after Journey completion." },
      { status: 403 },
    );
  }

  const download = architectDownloadTracker(actor.user.id, "certificate");
  await download.started();

  const printPath = `/blueprint/print/certificate?architectId=${encodeURIComponent(actor.user.id)}`;

  try {
    const pdf = await renderAuthenticatedPrintPdf({ request, printPath });
    await download.completed();
    return pdfAttachmentResponse(
      pdf,
      "back-half-architect-completion-certificate.pdf",
    );
  } catch (error) {
    await download.failed();
    console.error(
      "Personalized Architect Completion Certificate PDF generation failed:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Unable to generate personalized Architect Completion Certificate.",
      },
      { status: 500 },
    );
  }
}
