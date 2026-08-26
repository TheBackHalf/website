/**
 * Server-route helper for legacy Core Teaching URLs.
 * Kept separate so file stores can migrate progress without importing next/navigation.
 */

import { redirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import {
  getLegacyPracticeRedirectPath,
  getLegacyTeachingRedirectPath,
  isLegacyChapter1PracticeSegment,
  isLegacyChapter2PracticeSegment,
  isLegacyCoreTeachingSegment,
  type JourneyChapterNumber,
} from "@/lib/journey/chapters/legacy-teaching";

export function redirectIfLegacyTeachingRoute(
  locale: Locale,
  chapter: JourneyChapterNumber,
  section: string | undefined,
): void {
  if (isLegacyCoreTeachingSegment(section)) {
    redirect(getLegacyTeachingRedirectPath(locale, chapter));
  }
  if (chapter === 1 && isLegacyChapter1PracticeSegment(section)) {
    redirect(getLegacyPracticeRedirectPath(locale, 1));
  }
  if (chapter === 2 && isLegacyChapter2PracticeSegment(section)) {
    redirect(getLegacyPracticeRedirectPath(locale, 2));
  }
}
