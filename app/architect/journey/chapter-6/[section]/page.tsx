import type { Metadata } from "next";
import { Chapter6Page } from "@/components/journey/chapter-6/chapter-6-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter6SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter6SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("en", 6, section);
  return (
    <Chapter6Page locale="en" sectionId={parseChapter6SectionParam(section)} />
  );
}
