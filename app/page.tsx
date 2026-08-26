import { HomePageView } from "@/components/pages/home-page-view";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";
const meta = getDictionary("en").metadata.home;

export const metadata = createLocalizedPageMetadata({
  title: meta.title,
  description: meta.description,
  path: "/",
  locale: "en",
});

export default function Home() {
  return <HomePageView locale="en" />;
}
