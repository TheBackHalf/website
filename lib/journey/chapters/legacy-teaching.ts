/**
 * Core Teaching is no longer a participant Journey step.
 * Legacy URLs and stored section IDs must migrate without resetting progress.
 */

import type { Locale } from "@/lib/i18n/config";
import {
  getChapter1Path,
  getChapter2Path,
  getChapter3Path,
  getChapter4Path,
  getChapter5Path,
  getChapter6Path,
  getChapter7Path,
} from "@/lib/journey/chapters/paths";

export type JourneyChapterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function isLegacyCoreTeachingSegment(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "teaching" || normalized === "core-teaching";
}

export function needsTeachingProgressMigration(
  currentSectionId: unknown,
  completedSectionIds: unknown,
): boolean {
  if (isLegacyCoreTeachingSegment(currentSectionId)) {
    return true;
  }
  return (
    Array.isArray(completedSectionIds) &&
    completedSectionIds.some((entry) => isLegacyCoreTeachingSegment(entry))
  );
}

export function migrateCurrentSectionId<T extends string>(
  value: unknown,
  isValid: (candidate: unknown) => candidate is T,
  teachingFallback: T,
  defaultSection: T,
): T {
  if (isLegacyCoreTeachingSegment(value)) {
    return teachingFallback;
  }
  if (isValid(value)) {
    return value;
  }
  return defaultSection;
}

export function getLegacyTeachingRedirectPath(
  locale: Locale,
  chapter: JourneyChapterNumber,
): string {
  switch (chapter) {
    case 1:
      return getChapter1Path(locale, "reflection");
    case 2:
      return getChapter2Path(locale, "reflection");
    case 3:
      return getChapter3Path(locale, "reflection");
    case 4:
      return getChapter4Path(locale, "reflection");
    case 5:
      return getChapter5Path(locale, "reflection");
    case 6:
      return getChapter6Path(locale, "reflection");
    case 7:
      return getChapter7Path(locale, "reflection");
  }
}

export function isLegacyChapter1PracticeSegment(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "aliveness-project";
}

export function isLegacyChapter2PracticeSegment(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "mirror-exercise";
}

export function getLegacyPracticeRedirectPath(
  locale: Locale,
  chapter: 1 | 2,
): string {
  return chapter === 1
    ? getChapter1Path(locale, "practice")
    : getChapter2Path(locale, "practice");
}

const CHAPTER_1_STANDARD_SECTIONS = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

const CHAPTER_2_STANDARD_SECTIONS = [
  "welcome",
  "reflection",
  "practice",
  "commitment",
  "closing",
  "complete",
] as const;

export function migrateChapter1CurrentSectionId(
  value: unknown,
  isValid: (candidate: unknown) => candidate is import("@/content/journey/chapter-1-awakening").Chapter1SectionId,
): import("@/content/journey/chapter-1-awakening").Chapter1SectionId {
  if (isLegacyCoreTeachingSegment(value) || isLegacyChapter1PracticeSegment(value)) {
    if (isLegacyChapter1PracticeSegment(value)) {
      return "practice";
    }
    return "reflection";
  }
  if (isValid(value)) {
    return value;
  }
  return "welcome";
}

export function migrateChapter2CurrentSectionId(
  value: unknown,
  isValid: (candidate: unknown) => candidate is import("@/content/journey/chapter-2-mirror").Chapter2SectionId,
): import("@/content/journey/chapter-2-mirror").Chapter2SectionId {
  if (isLegacyCoreTeachingSegment(value)) {
    return "reflection";
  }
  if (isLegacyChapter2PracticeSegment(value)) {
    return "practice";
  }
  if (isValid(value)) {
    return value;
  }
  return "welcome";
}

export function migrateChapter1CompletedSectionIds(
  raw: unknown,
  status: "not_started" | "in_progress" | "completed",
  isValid: (candidate: unknown) => candidate is import("@/content/journey/chapter-1-awakening").Chapter1SectionId,
): import("@/content/journey/chapter-1-awakening").Chapter1SectionId[] {
  if (status === "completed") {
    return [...CHAPTER_1_STANDARD_SECTIONS];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<import("@/content/journey/chapter-1-awakening").Chapter1SectionId>();
  const next: import("@/content/journey/chapter-1-awakening").Chapter1SectionId[] = [];
  for (const entry of raw) {
    const mapped = isLegacyChapter1PracticeSegment(entry)
      ? "practice"
      : isLegacyCoreTeachingSegment(entry)
        ? null
        : isValid(entry)
          ? entry
          : null;
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      next.push(mapped);
    }
  }
  return next;
}

export function migrateChapter2CompletedSectionIds(
  raw: unknown,
  status: "not_started" | "in_progress" | "completed",
  isValid: (candidate: unknown) => candidate is import("@/content/journey/chapter-2-mirror").Chapter2SectionId,
): import("@/content/journey/chapter-2-mirror").Chapter2SectionId[] {
  if (status === "completed") {
    return [...CHAPTER_2_STANDARD_SECTIONS];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<import("@/content/journey/chapter-2-mirror").Chapter2SectionId>();
  const next: import("@/content/journey/chapter-2-mirror").Chapter2SectionId[] = [];
  for (const entry of raw) {
    const mapped = isLegacyChapter2PracticeSegment(entry)
      ? "practice"
      : isLegacyCoreTeachingSegment(entry)
        ? null
        : isValid(entry)
          ? entry
          : null;
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      next.push(mapped);
    }
  }
  return next;
}

export function needsChapterStructureMigration(
  currentSectionId: unknown,
  completedSectionIds: unknown,
): boolean {
  if (
    isLegacyCoreTeachingSegment(currentSectionId) ||
    isLegacyChapter1PracticeSegment(currentSectionId) ||
    isLegacyChapter2PracticeSegment(currentSectionId)
  ) {
    return true;
  }
  return (
    Array.isArray(completedSectionIds) &&
    completedSectionIds.some(
      (entry) =>
        isLegacyCoreTeachingSegment(entry) ||
        isLegacyChapter1PracticeSegment(entry) ||
        isLegacyChapter2PracticeSegment(entry),
    )
  );
}
