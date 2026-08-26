import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter4Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

/** Canonical Chapter IV entry redirects to Founder Welcome. */
export default function ArchitectChapter4Page() {
  redirect(getChapter4Path("en", "welcome"));
}
