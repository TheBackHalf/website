import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter7Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

/** Canonical Chapter VII entry redirects to Founder Welcome. */
export default function ArchitectChapter7Page() {
  redirect(getChapter7Path("en", "welcome"));
}
