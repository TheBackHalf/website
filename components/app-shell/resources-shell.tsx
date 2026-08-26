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
import type { Locale } from "@/lib/i18n/config";

type ResourcesShellProps = {
  locale: Locale;
};

/** Architect Resources — Blueprint download slots. */
export function ResourcesShell({ locale }: ResourcesShellProps) {
  const resources = getDictionary(locale).appShell.resources;
  const assets = getBlueprintDownloadAssets();

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, resources.title)}
        description={resolveAppShellLabel(locale, resources.description)}
      />
      <section className="bh-app-panel space-y-6 p-6">
        <header className="space-y-2">
          <h2 className="font-heading text-2xl text-bh-night">
            The Back Half Blueprint
          </h2>
          <p className="text-sm text-bh-muted">
            Your Blueprint guidebook and Architect Resources are ready to
            download. Completed Journey responses appear in your personalized
            Blueprint.
          </p>
        </header>

        <ul className="divide-y divide-bh-purple/10 rounded-lg border border-bh-purple/15 bg-bh-cream/40">
          {assets.map((asset) => (
            <li key={asset.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-bh-ink">{asset.label}</span>
              <Link
                href={asset.href}
                className="text-xs uppercase tracking-[0.2em] text-bh-purple hover:underline"
              >
                Download PDF
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </AppShellPage>
  );
}
