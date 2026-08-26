import type { Metadata } from "next";
import { Chapter3Page } from "@/components/journey/chapter-3/chapter-3-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter3SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter3SectionPageEs({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 3, section);
  return (
    <Chapter3Page locale="es" sectionId={parseChapter3SectionParam(section)} />
  );
}
