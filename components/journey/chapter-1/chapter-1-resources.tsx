import Link from "next/link";
import { getChapter1DownloadAssets } from "@/lib/journey/chapters/downloads";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type Chapter1ResourcesProps = {
  locale: Locale;
};

export function Chapter1Resources({ locale }: Chapter1ResourcesProps) {
  const copy = getDictionary(locale).appShell.chapter1;
  const assets = getChapter1DownloadAssets();

  return (
    <section
      className="bh-chapter-resources"
      aria-labelledby="chapter-1-resources-heading"
    >
      <h3
        id="chapter-1-resources-heading"
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
            <Link
              href={asset.href}
              className="bh-cta bh-cta-secondary inline-flex"
              download
            >
              {resolveAppShellLabel(locale, copy.downloadLabel)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
