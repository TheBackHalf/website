import { notFound } from "next/navigation";
import { SkipLink } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import {
  FOUNDER_LAUNCH_VIDEO_IDS,
  getFounderLaunchA11yAsset,
  isFounderCaptionJobId,
} from "@/content/journey/founder-accessibility";
import type { FounderCaptionJobId } from "@/content/journey/founder-captions";
import { getDictionary } from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type FounderTranscriptPageProps = {
  locale: Locale;
  id: string;
};

export function founderTranscriptStaticParams() {
  return FOUNDER_LAUNCH_VIDEO_IDS.map((id) => ({ id }));
}

export function FounderTranscriptPage({
  locale,
  id,
}: FounderTranscriptPageProps) {
  if (!isFounderCaptionJobId(id)) {
    notFound();
  }

  const asset = getFounderLaunchA11yAsset(locale, id as FounderCaptionJobId);
  const dictionary = getDictionary(locale);
  const heading = `${dictionary.common.founderTranscript} — ${asset.title}`;

  return (
    <>
      <SkipLink href="#founder-transcript-main">
        {dictionary.common.skipToMain}
      </SkipLink>
      <main
        id="founder-transcript-main"
        className="min-h-screen bg-bh-cream text-bh-ink"
        lang={locale}
      >
        <article className="bh-founder-transcript-page px-5 py-12 sm:px-6 md:px-10 md:py-16">
          <div className="mx-auto max-w-3xl">
            <p className="bh-eyebrow">{dictionary.common.founderTranscript}</p>
            <h1 className="mt-4 font-display text-3xl leading-tight text-bh-ink md:text-4xl">
              {heading}
            </h1>
            <div className="bh-founder-transcript-body mt-10 space-y-5">
              {asset.paragraphs.map((paragraph, index) => (
                <p
                  key={`${asset.id}-${index}`}
                  className="font-sans text-base font-light leading-relaxed text-bh-ink"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="bh-founder-media-transcript mt-10">
              <a href={asset.transcriptTextPublicPath} download>
                {dictionary.common.founderTranscriptDownload}
              </a>
            </p>
          </div>
        </article>
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
