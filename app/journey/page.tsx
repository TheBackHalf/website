import type { Metadata } from "next";
import { JourneyPageView } from "@/components/pages/journey-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("en").metadata.journey;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/journey",
  locale: "en",
});

export default function JourneyPage() {
  return <JourneyPageView locale="en" />;
}
