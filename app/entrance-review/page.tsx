import type { Metadata } from "next";

import { CinematicEntranceExperience } from "@/components/entrance/cinematic-entrance";

export const metadata: Metadata = {
  title: "Cinematic Entrance — Founder Review | The Back Half",
  robots: { index: false, follow: false },
};

export default async function CinematicEntranceReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ motion?: string | string[] }>;
}) {
  const query = await searchParams;
  const motion = Array.isArray(query.motion) ? query.motion[0] : query.motion;
  return (
    <CinematicEntranceExperience
      locale="en"
      reviewMode
      forceReducedMotion={motion === "reduced"}
    />
  );
}
