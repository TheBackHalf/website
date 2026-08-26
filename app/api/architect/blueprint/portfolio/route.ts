import { NextResponse } from "next/server";
import {
  BLUEPRINT_EXPORT_FILES,
  BLUEPRINT_PRINT_ROUTES,
} from "@/content/blueprint/constants";
import { ARCHITECT_PORTFOLIO_ASSET_ID } from "@/lib/blueprint/portfolio";
import { renderAuthenticatedBlueprintPdf } from "@/lib/blueprint/render-authenticated-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  return renderAuthenticatedBlueprintPdf({
    request,
    assetId: ARCHITECT_PORTFOLIO_ASSET_ID,
    filename: BLUEPRINT_EXPORT_FILES.portfolio,
    printPath: (architectId) =>
      `${BLUEPRINT_PRINT_ROUTES.portfolio}?architectId=${encodeURIComponent(architectId)}`,
    errorMessage: "Unable to generate Architect Portfolio.",
  });
}

export function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
