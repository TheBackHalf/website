/**
 * Launch-safe Blueprint delivery.
 * Production serverless must not launch Chrome with --no-sandbox.
 * Architects print the existing HTML guidebook/artifacts instead.
 */

import { NextResponse } from "next/server";
import { isHostedProduction } from "@/lib/analytics/db";

export function blueprintChromeUnsafeOnThisRuntime(): boolean {
  if (isHostedProduction()) return true;
  if (process.env.VERCEL === "1") return true;
  if (process.env.BLUEPRINT_ALLOW_CHROME === "1") return false;
  return process.env.NODE_ENV === "production";
}

export function blueprintPrintPath(kind: string): string {
  switch (kind) {
    case "guidebook":
      return "/blueprint/print/guidebook?variant=print";
    case "certificate":
      return "/blueprint/print/certificate";
    case "architects-commitment":
      return "/blueprint/print/architects-commitment";
    case "aliveness-index":
      return "/blueprint/print/artifacts/aliveness-index";
    case "decision-statement":
      return "/blueprint/print/artifacts/decision-statement";
    case "back-half-standards":
      return "/blueprint/print/artifacts/back-half-standards";
    case "architect-identity":
      return "/blueprint/print/artifacts/architect-identity-statement";
    case "expansion-plan":
      return "/blueprint/print/artifacts/expansion-plan";
    case "declaration":
      return "/blueprint/print/artifacts/back-half-declaration";
    default:
      return "/blueprint/print/guidebook?variant=print";
  }
}

export function blueprintPrintFallbackResponse(input: {
  request: Request;
  kind: string;
  architectId: string;
  locale?: "en" | "es";
}): NextResponse {
  const origin = new URL(input.request.url).origin;
  const printPath = blueprintPrintPath(input.kind);
  const separator = printPath.includes("?") ? "&" : "?";
  const printUrl = `${origin}${printPath}${separator}architectId=${encodeURIComponent(input.architectId)}`;
  const message =
    input.locale === "es"
      ? "El PDF con Chrome no está disponible en producción. Abre la versión para imprimir y usa Imprimir del navegador."
      : "PDF generation is not available on this host. Open the print version and use your browser Print dialog.";
  return NextResponse.json(
    {
      status: "print_required",
      error: "blueprint_chrome_unavailable",
      message,
      printUrl,
    },
    {
      status: 409,
      headers: {
        "Cache-Control": "no-store",
        Location: printUrl,
      },
    },
  );
}
