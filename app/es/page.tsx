import type { Metadata } from "next";
import { HomePageView } from "@/components/pages/home-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createLocalizedPageMetadata({
  title: getDictionary("es").metadata.home.title,
  description: getDictionary("es").metadata.home.description,
  path: "/",
  locale: "es",
});

export default function EsHomePage() {
  return <HomePageView locale="es" />;
}
