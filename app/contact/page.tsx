import type { Metadata } from "next";
import { ContactPageView } from "@/components/pages/contact-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

const meta = getDictionary("en").metadata.contact;

export const metadata: Metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/contact",
  locale: "en",
});

export default function ContactPage() {
  return <ContactPageView locale="en" />;
}
