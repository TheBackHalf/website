import type { Metadata } from "next";
import { SupportPageView } from "@/components/pages/support-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("en").metadata.support;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/support",
  locale: "en",
});

export default function SupportPage() {
  return <SupportPageView locale="en" />;
}
