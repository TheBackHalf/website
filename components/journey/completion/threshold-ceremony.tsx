import Link from "next/link";
import { FounderMediaPlacement } from "@/components/journey/chapter-1/founder-media-placement";
import { BackHalfDeclarationDownload } from "@/components/journey/chapter-7/declaration-download";
import { CertificateDownload } from "@/components/journey/chapter-7/certificate-download";
import { getChapter7MediaForSection } from "@/content/journey/chapter-7-media";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import {
  getApprovedFounderCongratulations,
  getCommunityInvitationCheckoutPath,
  getCommunityInvitationCopy,
  getThresholdLuminaReflectionPath,
  getThresholdPortfolioAssets,
} from "@/lib/journey/completion/threshold-ceremony";
import { getChapter7Localized } from "@/content/journey/localized";
import type { Locale } from "@/lib/i18n/config";

type ThresholdCeremonyProps = {
  locale: Locale;
  communityAccess: boolean;
};

export function ThresholdCeremony({
  locale,
  communityAccess,
}: ThresholdCeremonyProps) {
  const copy = getDictionary(locale).appShell.ceremony;
  const chapter7 = getDictionary(locale).appShell.chapter7;
  const content = getChapter7Localized(locale);
  const congratulationsLines = content.formatForDisplay(
    getApprovedFounderCongratulations(locale),
  );
  const completionMedia = getChapter7MediaForSection("complete", locale);
  const portfolio = getThresholdPortfolioAssets();
  const invitation = getCommunityInvitationCopy(communityAccess, locale);
  const downloadLabel = resolveAppShellLabel(locale, chapter7.downloadLabel);

  return (
    <div className="bh-ceremony">
      <header className="bh-ceremony-intro">
        <p className="bh-eyebrow">{copy.eyebrow}</p>
        <h2
          id="chapter-7-complete-heading"
          className="bh-onboarding-step-title"
        >
          {copy.title}
        </h2>
        <p className="bh-onboarding-step-body">{copy.description}</p>
      </header>

      <section
        className="bh-ceremony-section"
        aria-labelledby="ceremony-congratulations-heading"
      >
        <h3
          id="ceremony-congratulations-heading"
          className="bh-onboarding-subheading"
        >
          {copy.founderTitle}
        </h3>
        {completionMedia.map((placement) => (
          <FounderMediaPlacement
            key={placement.id}
            locale={locale}
            placement={placement}
          />
        ))}
        <div className="bh-onboarding-prose mt-8">
          {congratulationsLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section
        className="bh-ceremony-section"
        aria-labelledby="ceremony-certificate-heading"
      >
        <h3
          id="ceremony-certificate-heading"
          className="bh-onboarding-subheading"
        >
          {copy.certificateTitle}
        </h3>
        <p className="bh-onboarding-step-body">{copy.certificateBody}</p>
        <div className="mt-4">
          <CertificateDownload locale={locale} />
        </div>
      </section>

      <section
        className="bh-ceremony-section"
        aria-labelledby="ceremony-portfolio-heading"
      >
        <h3
          id="ceremony-portfolio-heading"
          className="bh-onboarding-subheading"
        >
          {copy.portfolioTitle}
        </h3>
        <p className="bh-onboarding-step-body">{copy.portfolioBody}</p>
        <ul className="bh-chapter-resources-list">
          {portfolio.map((asset) => (
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
                >
                  {downloadLabel}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="bh-ceremony-section"
        aria-labelledby="ceremony-lumina-heading"
      >
        <h3
          id="ceremony-lumina-heading"
          className="bh-onboarding-subheading"
        >
          {copy.luminaTitle}
        </h3>
        <p className="bh-onboarding-step-body">{copy.luminaBody}</p>
        <div className="mt-4">
          <Link
            href={getThresholdLuminaReflectionPath(locale)}
            className="bh-cta inline-flex"
          >
            {copy.luminaCta}
          </Link>
        </div>
      </section>

      <section
        className="bh-ceremony-section"
        aria-labelledby="ceremony-community-heading"
      >
        <h3
          id="ceremony-community-heading"
          className="bh-onboarding-subheading"
        >
          {copy.communityTitle}
        </h3>
        <p className="bh-onboarding-step-body">{invitation.coming}</p>
        <p className="bh-onboarding-step-body">{copy.communityNotLive}</p>
        <p className="bh-onboarding-step-body">
          {communityAccess
            ? copy.communityFoundingIncluded
            : copy.communityStandalone}
        </p>
        {communityAccess ? null : (
          <div className="mt-4">
            <Link
              href={getCommunityInvitationCheckoutPath(locale)}
              className="bh-cta bh-cta-secondary inline-flex"
            >
              {copy.communityCta}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
