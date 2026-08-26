import type { Metadata } from "next";
import { SupportPageView } from "@/components/pages/support-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("es").metadata.support;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/support",
  locale: "es",
});

export default function EsSupportPage() {
  return <SupportPageView locale="es" />;
}
