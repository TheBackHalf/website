export {
  createFileJourneyProgressStore,
  getJourneyProgressStore,
  setJourneyProgressStoreForTests,
} from "@/lib/journey/progress/store";
export type { JourneyProgressStore } from "@/lib/journey/progress/store";
export type {
  JourneyProgressDatabase,
  JourneyProgressRecord,
  JourneyProgressStatus,
} from "@/lib/journey/progress/types";
export {
  decideChapterAccess,
  decideSectionAccess,
  isJourneyChapterId,
  JOURNEY_CHAPTER_IDS,
  preserveCompletedChapterStatus,
  resolveContinueChapter,
  resolveProgressPointerTarget,
} from "@/lib/journey/progress/rules";
export type {
  ChapterAccessDecision,
  JourneyChapterId,
  JourneyChapterStatusMap,
} from "@/lib/journey/progress/rules";
export {
  loadJourneyChapterStatuses,
  resolveChapterAccessForUser,
  syncAuthoritativeJourneyProgress,
} from "@/lib/journey/progress/snapshot";
export { gateChapterLoad } from "@/lib/journey/progress/gate";
export type { ChapterGateResult } from "@/lib/journey/progress/gate";
