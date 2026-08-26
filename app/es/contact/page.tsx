import type { Metadata } from "next";
import { ContactPageView } from "@/components/pages/contact-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("es").metadata.contact;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/contact",
  locale: "es",
});

export default function EsContactPage() {
  return <ContactPageView locale="es" />;
}
