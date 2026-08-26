import type { Metadata } from "next";
import { Chapter7Page } from "@/components/journey/chapter-7/chapter-7-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter7SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter7SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("en", 7, section);
  return (
    <Chapter7Page locale="en" sectionId={parseChapter7SectionParam(section)} />
  );
}
