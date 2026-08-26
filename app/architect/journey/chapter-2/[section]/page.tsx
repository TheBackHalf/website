import type { Metadata } from "next";
import { Chapter2Page } from "@/components/journey/chapter-2/chapter-2-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter2SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter2SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("en", 2, section);
  return (
    <Chapter2Page locale="en" sectionId={parseChapter2SectionParam(section)} />
  );
}
