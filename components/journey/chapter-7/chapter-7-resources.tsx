import Link from "next/link";
import { BackHalfDeclarationDownload } from "@/components/journey/chapter-7/declaration-download";
import { CertificateDownload } from "@/components/journey/chapter-7/certificate-download";
import { getChapter7DownloadAssets } from "@/lib/journey/chapters/downloads";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type Chapter7ResourcesProps = {
  locale: Locale;
  journeyComplete?: boolean;
};

export function Chapter7Resources({
  locale,
  journeyComplete = false,
}: Chapter7ResourcesProps) {
  const copy = getDictionary(locale).appShell.chapter7;
  const assets = getChapter7DownloadAssets(journeyComplete);

  return (
    <section
      className="bh-chapter-resources"
      aria-labelledby="chapter-7-resources-heading"
    >
      <h3
        id="chapter-7-resources-heading"
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
            {asset.id === "declaration" ? (
              <BackHalfDeclarationDownload locale={locale} />
            ) : asset.id === "certificate" ? (
              <CertificateDownload locale={locale} />
            ) : (
              <Link
                href={asset.href}
                className="bh-cta bh-cta-secondary inline-flex"
                download={asset.id !== "guidebook" ? true : undefined}
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
