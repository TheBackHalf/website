import Link from "next/link";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";
import type { ArchitectPortfolioModel } from "@/lib/blueprint/portfolio";
import type { Locale } from "@/lib/i18n/config";

type ResourcesShellProps = {
  locale: Locale;
  portfolio?: ArchitectPortfolioModel | null;
};

/** Architect Resources — Portfolio + Blueprint download slots. */
export function ResourcesShell({
  locale,
  portfolio = null,
}: ResourcesShellProps) {
  const resources = getDictionary(locale).appShell.resources;
  const assets = getBlueprintDownloadAssets();
  const portfolioAsset = assets.find((asset) => asset.id === "portfolio");
  const individualAssets = assets.filter((asset) => asset.id !== "portfolio");

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, resources.title)}
        description={resolveAppShellLabel(locale, resources.description)}
      />

      <div className="space-y-6">
        {portfolioAsset ? (
          <section className="bh-app-panel space-y-6 p-6">
            <header className="space-y-2">
              <h2 className="font-heading text-2xl text-bh-night">
                {resolveAppShellLabel(locale, resources.portfolioHeading)}
              </h2>
              <p className="text-sm text-bh-muted">
                {resolveAppShellLabel(locale, resources.portfolioDescription)}
              </p>
            </header>

            {portfolio ? (
              <p className="text-sm text-bh-ink">
                {resolveAppShellLabel(locale, resources.portfolioProgress)
                  .replace("{completed}", String(portfolio.completedCount))
                  .replace("{total}", String(portfolio.totalCount))}
              </p>
            ) : null}

            {portfolio ? (
              <ul className="divide-y divide-bh-purple/10 rounded-lg border border-bh-purple/15 bg-bh-cream/40">
                {portfolio.sections.map((section) => (
                  <li
                    key={section.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-bh-ink">{section.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-bh-muted">
                      {section.status === "included"
                        ? resolveAppShellLabel(locale, resources.includedLabel)
                        : resolveAppShellLabel(locale, resources.awaitingLabel)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <Link
              href={portfolioAsset.href}
              className="inline-flex text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
            >
              {resolveAppShellLabel(locale, resources.portfolioDownload)}
            </Link>
          </section>
        ) : null}

        <section className="bh-app-panel space-y-6 p-6">
          <header className="space-y-2">
            <h2 className="font-heading text-2xl text-bh-night">
              {resolveAppShellLabel(locale, resources.individualHeading)}
            </h2>
            <p className="text-sm text-bh-muted">
              {resolveAppShellLabel(locale, resources.individualDescription)}
            </p>
          </header>

          <ul className="divide-y divide-bh-purple/10 rounded-lg border border-bh-purple/15 bg-bh-cream/40">
            {individualAssets.map((asset) => (
              <li
                key={asset.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm text-bh-ink">{asset.label}</span>
                <Link
                  href={asset.href}
                  className="text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
                >
                  {resolveAppShellLabel(locale, resources.downloadPdf)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShellPage>
  );
}
