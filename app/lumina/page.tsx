import type { Metadata } from "next";
import { LuminaPageView } from "@/components/pages/lumina-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("en").metadata.lumina;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/lumina",
  locale: "en",
});

export default function LuminaPage() {
  return <LuminaPageView locale="en" />;
}
