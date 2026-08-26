import Link from "next/link";
import { ExpansionPlanDownload } from "@/components/journey/chapter-6/expansion-plan-download";
import { getChapter6DownloadAssets } from "@/lib/journey/chapters/downloads";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type Chapter6ResourcesProps = {
  locale: Locale;
};

export function Chapter6Resources({ locale }: Chapter6ResourcesProps) {
  const copy = getDictionary(locale).appShell.chapter6;
  const assets = getChapter6DownloadAssets();

  return (
    <section
      className="bh-chapter-resources"
      aria-labelledby="chapter-6-resources-heading"
    >
      <h3
        id="chapter-6-resources-heading"
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
            {asset.id === "expansion-plan" ? (
              <ExpansionPlanDownload locale={locale} />
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
