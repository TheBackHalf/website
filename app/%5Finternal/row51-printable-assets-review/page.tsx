import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow51ReviewModel } from "@/lib/blueprint/row51-review";

export const dynamic = "force-dynamic";

/**
 * TEMPORARY Row 51 Founder acceptance review only.
 * URL: /_internal/row51-printable-assets-review
 * Folder uses %5F so Next.js does not treat it as a private `_` segment.
 * Localhost-only. Does not mark Row 51 complete.
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

function Status({ label, value }: { label: string; value: string }) {
  const pass = value === "PASS";
  return (
    <li className="flex items-center justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-ink">{label}</span>
      <span
        className={`font-sans text-xs font-medium uppercase tracking-[0.14em] ${
          pass ? "text-bh-purple" : "text-bh-ink"
        }`}
      >
        {value}
      </span>
    </li>
  );
}

export default async function Row51PrintableAssetsReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = await getRow51ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row51-printable-assets-review"
    >
      <div className="mx-auto w-full max-w-4xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 51 CREATE PRINTABLE JOURNAL AND ASSETS
        </p>
        <p className="mb-10 font-sans text-sm font-light text-bh-muted">
          Production review of the corrected Blueprint after Founder review.
          Written Blueprint content was not rewritten. Row 51 is not marked
          complete.
        </p>

        <section className="mb-14">
          <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            Pages that changed in this correction pass
          </h2>
          <p className="mb-4 font-sans text-sm font-light text-bh-muted">
            Review these first: cover (butterfly + one-line subtitle), the
            Welcome Letter opener, and the Founder closing letter opener. The
            full 62-page (or corrected) PDF follows below.
          </p>
          <ul className="space-y-3 border border-bh-purple/15 bg-white px-5 py-4">
            {model.changedPages.map((item) => (
              <li key={`${item.page}-${item.label}`}>
                <p className="font-sans text-sm font-medium text-bh-ink">
                  Page {item.page} — {item.label}
                </p>
                <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                  {item.note}
                </p>
                <p className="mt-1">
                  <a
                    href={`${model.guidebook.href}?v=${model.cacheKey}#page=${item.page}`}
                    className="font-sans text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
                  >
                    Open page {item.page}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            Section 1 — Complete Blueprint
          </h2>
          <p className="font-sans text-sm font-light text-bh-muted">
            Filename: {model.guidebook.filename}
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            Page count: {model.guidebook.pageCount ?? "pending export"}
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            File size: {model.guidebook.fileSizeLabel}
          </p>
          <p className="mt-3">
            <a
              href={`${model.guidebook.href}?v=${model.cacheKey}`}
              className="font-sans text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
              download
            >
              Download complete Blueprint PDF
            </a>
          </p>
          <div className="mt-6 overflow-hidden rounded-sm border border-bh-purple/15 bg-white">
            <iframe
              title="Blueprint cover preview"
              src={`${model.guidebook.href}?v=${model.cacheKey}#page=1`}
              className="h-[720px] w-full"
            />
          </div>
          <p className="mt-8 font-sans text-sm font-medium text-bh-ink">
            Welcome Letter opener — page {model.welcomePage}
          </p>
          <div className="mt-3 overflow-hidden rounded-sm border border-bh-purple/15 bg-white">
            <iframe
              title="Welcome Letter opener preview"
              src={`${model.guidebook.href}?v=${model.cacheKey}#page=${model.welcomePage}`}
              className="h-[720px] w-full"
            />
          </div>
          <p className="mt-8 font-sans text-sm font-medium text-bh-ink">
            Founder closing letter opener — page {model.founderLetterPage}
          </p>
          <div className="mt-3 overflow-hidden rounded-sm border border-bh-purple/15 bg-white">
            <iframe
              title="Founder closing letter opener preview"
              src={`${model.guidebook.href}?v=${model.cacheKey}#page=${model.founderLetterPage}`}
              className="h-[720px] w-full"
            />
          </div>
        </section>

        <section className="mb-14">
          <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            Section 2 — Signature Assets
          </h2>
          <ul className="space-y-8">
            {model.signatureAssets.map((asset) => (
              <li key={asset.id} className="border-t border-bh-purple/15 pt-6">
                <h3 className="font-sans text-sm font-medium text-bh-ink">
                  {asset.label}
                </h3>
                <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                  {asset.filename} · {asset.pageCount ?? "—"} pages ·{" "}
                  {asset.fileSizeLabel}
                </p>
                <p className="mt-2">
                  <a
                    href={`${asset.href}?v=${model.cacheKey}`}
                    className="font-sans text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
                    download
                  >
                    Download PDF
                  </a>
                </p>
                <div className="mt-4 overflow-hidden rounded-sm border border-bh-purple/15 bg-white">
                  <iframe
                    title={`${asset.label} preview`}
                    src={`${asset.href}?v=${model.cacheKey}#page=1`}
                    className="h-[520px] w-full"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            Section 3 — Certificate
          </h2>
          <p className="font-sans text-sm font-light text-bh-muted">
            {model.certificate.filename} · {model.certificate.fileSizeLabel}
          </p>
          <p className="mt-2">
            <a
              href={`${model.certificate.href}?v=${model.cacheKey}`}
              className="font-sans text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
              download
            >
              Download certificate PDF
            </a>
          </p>
          <div className="mt-6 overflow-hidden rounded-sm border border-bh-purple/15 bg-white">
            <iframe
              title="Architect completion certificate"
              src={`${model.certificate.href}?v=${model.cacheKey}#page=1`}
              className="h-[900px] w-full"
            />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            Section 4 — Production QA
          </h2>
          <ul>
            {model.qa.map((item) => (
              <Status key={item.label} label={item.label} value={item.value} />
            ))}
          </ul>
          <p className="mt-8 font-sans text-sm font-medium uppercase tracking-[0.14em] text-bh-ink">
            {model.finalStatus}
          </p>
        </section>
      </div>
    </main>
  );
}
