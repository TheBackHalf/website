import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter3Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("en", "journey");

/** Canonical Chapter III entry redirects to Founder Welcome. */
export default function ArchitectChapter3Page() {
  redirect(getChapter3Path("en", "welcome"));
}
