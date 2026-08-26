import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { CinematicEntranceExperience } from "@/components/entrance/cinematic-entrance";

export const dynamic = "force-dynamic";

function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

/**
 * URL: /_internal/cinematic-entrance-review
 */
export default async function InternalCinematicEntranceReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  return <CinematicEntranceExperience locale="en" reviewMode />;
}
