import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LuminaEntryShell } from "@/components/app-shell/lumina-entry-shell";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 83 Lumina page visual QA only.
 * URL: /_internal/row83-lumina-review
 * Uses the SAME LuminaEntryShell / conversation panel as /architect/lumina.
 * Localhost-only — does not alter production auth/entitlement.
 */
function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

export default async function Row83LuminaReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  return (
    <main
      className="min-h-screen bg-bh-cream text-bh-ink"
      data-bh-temp-qa="row83-lumina-review"
    >
      <div className="border-b border-bh-border bg-bh-cream px-4 py-3">
        <p className="mx-auto max-w-3xl font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 83 LUMINA PAGE
        </p>
        <p className="mx-auto mt-1 max-w-3xl font-sans text-sm font-light text-bh-muted">
          Same production Lumina conversation components as Architect Lumina.
          Review approved Lumina visual presence and AI Disclosure link.
        </p>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <LuminaEntryShell locale="en" />
      </div>
    </main>
  );
}
