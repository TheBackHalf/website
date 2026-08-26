import Link from "next/link";
import { DecisionStatementDownload } from "@/components/journey/chapter-3/decision-statement-download";
import { getChapter3DownloadAssets } from "@/lib/journey/chapters/downloads";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type Chapter3ResourcesProps = {
  locale: Locale;
};

export function Chapter3Resources({ locale }: Chapter3ResourcesProps) {
  const copy = getDictionary(locale).appShell.chapter3;
  const assets = getChapter3DownloadAssets();

  return (
    <section
      className="bh-chapter-resources"
      aria-labelledby="chapter-3-resources-heading"
    >
      <h3
        id="chapter-3-resources-heading"
        className="bh-onboarding-subheading"
      >
        {resolveAppShellLabel(locale, copy.resourcesTitle)}
      </h3>
      <p className="bh-onboarding-step-body">
        {resolveAppShellLabel(locale, copy.resourcesDescription)}
      </p>
      <ul className="bh-chapter-resources-list">
        {assets.map((asset) => (
          <li key={asset.id} className="bh-chapter-resources-item">
            <div>
              <p className="bh-chapter-resources-label">{asset.label}</p>
              <p className="bh-chapter-resources-relation">{asset.relation}</p>
            </div>
            {asset.id === "decision-statement" ? (
              <DecisionStatementDownload locale={locale} />
            ) : (
              <Link
                href={asset.href}
                className="bh-cta bh-cta-secondary inline-flex"
                download
              >
                {resolveAppShellLabel(locale, copy.downloadLabel)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
