import type { Metadata } from "next";
import { Chapter5Page } from "@/components/journey/chapter-5/chapter-5-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter5SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter5SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("en", 5, section);
  return (
    <Chapter5Page locale="en" sectionId={parseChapter5SectionParam(section)} />
  );
}
