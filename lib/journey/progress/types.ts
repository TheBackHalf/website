/**
 * Row 83 — First-class Journey progress store (does not require Lumina memory).
 */

export type JourneyProgressStatus =
  | "not_started"
  | "in_progress"
  | "stage_completed"
  | "chapter_completed"
  | "completed"
  | "journey_completed"
  | (string & {});

export type JourneyProgressRecord = {
  userId: string;
  chapterId: string;
  status: JourneyProgressStatus;
  updatedAt: string;
};

export type JourneyProgressDatabase = {
  records: JourneyProgressRecord[];
};
