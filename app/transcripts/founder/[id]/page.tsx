import type { Metadata } from "next";
import { FounderTranscriptPage, founderTranscriptStaticParams } from "@/components/journey/founder-transcript-page";
import {
  getFounderLaunchA11yAsset,
  isFounderCaptionJobId,
} from "@/content/journey/founder-accessibility";
import { getDictionary } from "@/content/i18n/get-dictionary";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return founderTranscriptStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const dictionary = getDictionary("en");
  if (!isFounderCaptionJobId(id)) {
    return { title: dictionary.common.founderTranscript, robots: { index: false } };
  }
  const asset = getFounderLaunchA11yAsset("en", id);
  return {
    title: `${dictionary.common.founderTranscript} — ${asset.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function EnglishFounderTranscriptPage({ params }: PageProps) {
  const { id } = await params;
  return <FounderTranscriptPage locale="en" id={id} />;
}
