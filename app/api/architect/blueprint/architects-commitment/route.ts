import { BLUEPRINT_EXPORT_FILES } from "@/content/blueprint/constants";
import { serveTrackedStaticBlueprintPdf } from "@/lib/blueprint/serve-tracked-static-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return serveTrackedStaticBlueprintPdf({
    assetId: "architects-commitment",
    filename: BLUEPRINT_EXPORT_FILES.architectsCommitment,
  });
}
