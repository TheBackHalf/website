import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { architectDownloadTracker } from "@/lib/analytics/downloads";
import { launchPdfBrowser } from "@/lib/blueprint/launch-pdf-browser";
import {
  blueprintChromeUnsafeOnThisRuntime,
  blueprintPrintFallbackResponse,
} from "@/lib/blueprint/print-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function resolveOrigin(request: Request): string {
  const url = new URL(request.url);
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

  if (blueprintChromeUnsafeOnThisRuntime()) {
    await download.failed();
    return blueprintPrintFallbackResponse({
      request,
      kind: "expansion-plan",
      architectId: actor.user.id,
      locale: actor.user.locale === "es" ? "es" : "en",
    });
  }

  const origin = resolveOrigin(request);
  const printUrl = `${origin}/blueprint/print/artifacts/expansion-plan?architectId=${encodeURIComponent(actor.user.id)}`;

  try {
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
      await page.evaluate(() => {
        document
          .querySelectorAll(".bh-bp-screen-notice")
          .forEach((el) => el.remove());
        const root = document.querySelector(".bh-bp-document");
        if (root instanceof HTMLElement) {
          root.style.background = "transparent";
          root.style.margin = "0";
          root.style.padding = "0";
        }
      });

      const pdf = await page.pdf({
        format: "Letter",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });

      await download.completed();
      return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition":
            'attachment; filename="back-half-expansion-plan.pdf"',
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    await download.failed();
    console.error("Personalized Expansion Plan PDF generation failed:", error);
    return NextResponse.json(
      { error: "Unable to generate personalized Expansion Plan." },
      { status: 500 },
    );
  }
}
