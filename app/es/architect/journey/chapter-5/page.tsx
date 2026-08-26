import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter5Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

/** Canonical Chapter V entry redirects to Founder Welcome. */
export default function ArchitectChapter5PageEs() {
  redirect(getChapter5Path("es", "welcome"));
}
