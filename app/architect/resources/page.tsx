import type { Metadata } from "next";
import { ResourcesShell } from "@/components/app-shell/resources-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("en", "resources");

export default function ArchitectResourcesPage() {
  return <ResourcesShell locale="en" />;
}
