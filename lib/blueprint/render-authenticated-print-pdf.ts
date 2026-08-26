import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import {
  ACCESSIBLE_PDF_OPTIONS,
  preparePrintDocumentForAccessiblePdf,
} from "@/lib/blueprint/accessible-pdf";
import { launchPdfBrowser } from "@/lib/blueprint/launch-pdf-browser";

export function resolvePrintOrigin(request: Request): string {
  const url = new URL(request.url);
  // Always prefer the request host for same-server Puppeteer rendering.
  // Stale BASE_URL / SITE_URL (e.g. :3005 while app is on :3000) must not win.
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    return `${url.protocol}//${url.host}`;
  }

  const envOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    process.env.BASE_URL?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  return `${url.protocol}//${url.host}`;
}

export async function renderAuthenticatedPrintPdf(options: {
  request: Request;
  printPath: string;
}): Promise<Uint8Array> {
  const origin = resolvePrintOrigin(options.request);
  const printUrl = `${origin}${options.printPath}`;
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(180_000);

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (sessionToken) {
      const parsed = new URL(origin);
      await page.setCookie({
        name: AUTH_COOKIE_NAME,
        value: sessionToken,
        domain: parsed.hostname,
        path: "/",
        httpOnly: true,
        secure: parsed.protocol === "https:",
        sameSite: "Lax",
      });
    }

    const printSecret = process.env.BLUEPRINT_PRINT_SECRET?.trim();
    if (printSecret) {
      await page.setExtraHTTPHeaders({
        "x-blueprint-print-secret": printSecret,
      });
    }

    await page.goto(printUrl, {
      waitUntil: "domcontentloaded",
      timeout: 180_000,
    });
    await page.waitForSelector(".bh-bp-page", { timeout: 60_000 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await page.emulateMediaType("print");
    await page.evaluate(preparePrintDocumentForAccessiblePdf);

    return await page.pdf(ACCESSIBLE_PDF_OPTIONS);
  } finally {
    await browser.close();
  }
}

export function pdfAttachmentResponse(
  pdf: Uint8Array,
  filename: string,
): NextResponse {
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
