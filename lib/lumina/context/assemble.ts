import { journeyStages } from "@/content/journey-stages";
import { toChapter1ContextSummary } from "@/lib/journey/chapters/chapter-1";
import { toChapter2ContextSummary } from "@/lib/journey/chapters/chapter-2";
import { toChapter3ContextSummary } from "@/lib/journey/chapters/chapter-3";
import { toChapter4ContextSummary } from "@/lib/journey/chapters/chapter-4";
import { toChapter5ContextSummary } from "@/lib/journey/chapters/chapter-5";
import { toChapter6ContextSummary } from "@/lib/journey/chapters/chapter-6";
import { toChapter7ContextSummary } from "@/lib/journey/chapters/chapter-7";
import { getChapter2Store } from "@/lib/journey/chapters/chapter-2-store";
import { getChapter3Store } from "@/lib/journey/chapters/chapter-3-store";
import { getChapter4Store } from "@/lib/journey/chapters/chapter-4-store";
import { getChapter5Store } from "@/lib/journey/chapters/chapter-5-store";
import { getChapter6Store } from "@/lib/journey/chapters/chapter-6-store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";
import { getChapter1Store } from "@/lib/journey/chapters/store";
import { toAlivenessContextSummary } from "@/lib/journey/assessments/aliveness";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import {
  resolveAuthoritativeCurrentJourneyStage,
  stageIdToBlueprintChapterId,
} from "@/lib/lumina/context/current-stage";
import {
  filterRelevantInsights,
  LUMINA_INSIGHT_CAP,
} from "@/lib/lumina/context/relevance";
import type {
  AssembleLuminaJourneyContextOptions,
  JourneyStateAdapter,
  LuminaArchitectContext,
  LuminaCompletedWorkItem,
  LuminaJourneyContext,
  LuminaUpcomingRequirement,
} from "@/lib/lumina/context/types";
import { resolveJourneyProgressPointer } from "@/lib/journey/progress-pointers";
import { retrieveLuminaMemoryForUser } from "@/lib/lumina/memory/retrieve";
import {
  getBlueprintSection,
  standaloneArtifactIds,
} from "@/content/blueprint/document-structure";

const MAX_COMPLETED_WORK = 20;
const MAX_SAVED_ARTIFACTS = 20;

async function listJourneyCompletedWork(
  userId: string,
): Promise<LuminaCompletedWorkItem[]> {
  const items: LuminaCompletedWorkItem[] = [];

  const onboarding =
    await getJourneyOnboardingStore().findOnboardingForUser(userId);
  const aliveness = toAlivenessContextSummary(onboarding?.assessment);
  if (aliveness.status === "complete" && aliveness.completedAt) {
    items.push({
      id: "aliveness-index",
      kind: "assessment",
      label: "Aliveness Index",
      completedAt: aliveness.completedAt,
      explicit: true,
    });
  }

  const chapter1 = await getChapter1Store().findChapter1ForUser(userId);
  const chapter1Summary = toChapter1ContextSummary(chapter1);
  if (
    chapter1Summary.alivenessProject.status === "complete" &&
    chapter1Summary.alivenessProject.completedAt
  ) {
    items.push({
      id: "aliveness-project",
      kind: "assessment",
      label: "The Aliveness Project",
      completedAt: chapter1Summary.alivenessProject.completedAt,
      explicit: true,
    });
  }
  if (chapter1Summary.status === "complete" && chapter1Summary.completedAt) {
    items.push({
      id: "chapter-1-awakening",
      kind: "chapter",
      stageId: "awakening",
      chapterId: "chapter-1-awakening",
      label: "Chapter I — The Awakening",
      completedAt: chapter1Summary.completedAt,
      explicit: true,
    });
  }

  const chapter2 = await getChapter2Store().findChapter2ForUser(userId);
  const chapter2Summary = toChapter2ContextSummary(chapter2);
  if (
    chapter2Summary.mirrorExercise.status === "complete" &&
    chapter2Summary.mirrorExercise.completedAt
  ) {
    items.push({
      id: "back-half-mirror",
      kind: "assessment",
      label: "The Back Half Mirror",
      completedAt: chapter2Summary.mirrorExercise.completedAt,
      explicit: true,
    });
  }
  if (chapter2Summary.status === "complete" && chapter2Summary.completedAt) {
    items.push({
      id: "chapter-2-mirror",
      kind: "chapter",
      stageId: "mirror",
      chapterId: "chapter-2-mirror",
      label: "Chapter II — The Mirror",
      completedAt: chapter2Summary.completedAt,
      explicit: true,
    });
  }

  const chapter3 = await getChapter3Store().findChapter3ForUser(userId);
  const chapter3Summary = toChapter3ContextSummary(chapter3);
  if (
    chapter3Summary.practice.status === "complete" &&
    chapter3Summary.practice.completedAt
  ) {
    items.push({
      id: "decision-statement",
      kind: "assessment",
      label: "Decision Statement",
      completedAt: chapter3Summary.practice.completedAt,
      explicit: true,
    });
  }
  if (chapter3Summary.status === "complete" && chapter3Summary.completedAt) {
    items.push({
      id: "chapter-3-decision",
      kind: "chapter",
      stageId: "decision",
      chapterId: "chapter-3-decision",
      label: "Chapter III — The Decision",
      completedAt: chapter3Summary.completedAt,
      explicit: true,
    });
  }

  const chapter4 = await getChapter4Store().findChapter4ForUser(userId);
  const chapter4Summary = toChapter4ContextSummary(chapter4);
  if (
    chapter4Summary.practice.status === "complete" &&
    chapter4Summary.practice.completedAt
  ) {
    items.push({
      id: "back-half-standards",
      kind: "assessment",
      label: "Back Half Standards",
      completedAt: chapter4Summary.practice.completedAt,
      explicit: true,
    });
  }
  if (chapter4Summary.status === "complete" && chapter4Summary.completedAt) {
    items.push({
      id: "chapter-4-standards",
      kind: "chapter",
      stageId: "standards",
      chapterId: "chapter-4-standards",
      label: "Chapter IV — The Standards",
      completedAt: chapter4Summary.completedAt,
      explicit: true,
    });
  }

  const chapter5 = await getChapter5Store().findChapter5ForUser(userId);
  const chapter5Summary = toChapter5ContextSummary(chapter5);
  if (
    chapter5Summary.practice.status === "complete" &&
    chapter5Summary.practice.completedAt
  ) {
    items.push({
      id: "architect-identity-statement",
      kind: "assessment",
      label: "Architect Identity Statement",
      completedAt: chapter5Summary.practice.completedAt,
      explicit: true,
    });
  }
  if (chapter5Summary.status === "complete" && chapter5Summary.completedAt) {
    items.push({
      id: "chapter-5-architect",
      kind: "chapter",
      stageId: "architect",
      chapterId: "chapter-5-architect",
      label: "Chapter V — Becoming the Architect",
      completedAt: chapter5Summary.completedAt,
      explicit: true,
    });
  }

  const chapter6 = await getChapter6Store().findChapter6ForUser(userId);
  const chapter6Summary = toChapter6ContextSummary(chapter6);
  if (
    chapter6Summary.practice.status === "complete" &&
    chapter6Summary.practice.completedAt
  ) {
    items.push({
      id: "expansion-plan",
      kind: "assessment",
      label: "Expansion Plan",
      completedAt: chapter6Summary.practice.completedAt,
      explicit: true,
    });
  }
  if (chapter6Summary.status === "complete" && chapter6Summary.completedAt) {
    items.push({
      id: "chapter-6-expansion",
      kind: "chapter",
      stageId: "expansion",
      chapterId: "chapter-6-expansion",
      label: "Chapter VI — Expansion",
      completedAt: chapter6Summary.completedAt,
      explicit: true,
    });
  }

  const chapter7 = await getChapter7Store().findChapter7ForUser(userId);
  const chapter7Summary = toChapter7ContextSummary(chapter7);
  if (
    chapter7Summary.practice.status === "complete" &&
    chapter7Summary.practice.completedAt
  ) {
    items.push({
      id: "back-half-declaration",
      kind: "assessment",
      label: "Back Half Declaration",
      completedAt: chapter7Summary.practice.completedAt,
      explicit: true,
    });
  }
  if (chapter7Summary.status === "complete" && chapter7Summary.completedAt) {
    items.push({
      id: "chapter-7-beginning",
      kind: "chapter",
      stageId: "beginning",
      chapterId: "chapter-7-beginning",
      label: "Chapter VII — The Beginning",
      completedAt: chapter7Summary.completedAt,
      explicit: true,
    });
  }

  return items;
}

async function listJourneySavedArtifacts(userId: string) {
  const items: {
    id: string;
    artifactId: string;
    label: string;
    status: "saved";
    ownerUserId: string;
    updatedAt: string;
  }[] = [];

  const chapter1 = await getChapter1Store().findChapter1ForUser(userId);
  if (chapter1) {
    const summary = toChapter1ContextSummary(chapter1);
    if (summary.alivenessProject.status !== "not_started") {
      items.push({
        id: "saved:aliveness-project",
        artifactId: "aliveness-project",
        label: "The Aliveness Project",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter1.alivenessProject.updatedAt,
      });
    }
  }

  const chapter2 = await getChapter2Store().findChapter2ForUser(userId);
  if (chapter2) {
    const summary = toChapter2ContextSummary(chapter2);
    if (summary.mirrorExercise.status !== "not_started") {
      items.push({
        id: "saved:back-half-mirror",
        artifactId: "back-half-mirror",
        label: "The Back Half Mirror",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter2.mirrorExercise.updatedAt,
      });
    }
  }

  const chapter3 = await getChapter3Store().findChapter3ForUser(userId);
  if (chapter3) {
    const summary = toChapter3ContextSummary(chapter3);
    if (summary.practice.status !== "not_started") {
      items.push({
        id: "saved:decision-statement",
        artifactId: "decision-statement",
        label: "Decision Statement",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter3.practice.updatedAt,
      });
    }
  }

  const chapter4 = await getChapter4Store().findChapter4ForUser(userId);
  if (chapter4) {
    const summary = toChapter4ContextSummary(chapter4);
    if (summary.practice.status !== "not_started") {
      items.push({
        id: "saved:back-half-standards",
        artifactId: "back-half-standards",
        label: "Back Half Standards",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter4.practice.updatedAt,
      });
    }
  }

  const chapter5 = await getChapter5Store().findChapter5ForUser(userId);
  if (chapter5) {
    const summary = toChapter5ContextSummary(chapter5);
    if (summary.practice.status !== "not_started") {
      items.push({
        id: "saved:architect-identity-statement",
        artifactId: "architect-identity-statement",
        label: "Architect Identity Statement",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter5.practice.updatedAt,
      });
    }
  }

  const chapter6 = await getChapter6Store().findChapter6ForUser(userId);
  if (chapter6) {
    const summary = toChapter6ContextSummary(chapter6);
    if (summary.practice.status !== "not_started") {
      items.push({
        id: "saved:expansion-plan",
        artifactId: "expansion-plan",
        label: "Expansion Plan",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter6.practice.updatedAt,
      });
    }
  }

  const chapter7 = await getChapter7Store().findChapter7ForUser(userId);
  if (chapter7) {
    const summary = toChapter7ContextSummary(chapter7);
    if (summary.practice.status !== "not_started") {
      items.push({
        id: "saved:back-half-declaration",
        artifactId: "back-half-declaration",
        label: "Back Half Declaration",
        status: "saved",
        ownerUserId: userId,
        updatedAt: chapter7.practice.updatedAt,
      });
    }
  }

  return items;
}

const productionAdapter: JourneyStateAdapter = {
  source: "memory_progress",
  resolveProgress: resolveJourneyProgressPointer,
  listCompletedWork: listJourneyCompletedWork,
  listSavedArtifacts: listJourneySavedArtifacts,
};

function emptyArchitect(): LuminaArchitectContext {
  return {
    preferredName: "",
    pronunciation: "",
    locale: "en",
    supportPreference: "",
    timeZone: "",
  };
}

function resolveUpcoming(
  state: LuminaJourneyContext["currentJourney"]["state"],
  stageId: string | null,
): LuminaUpcomingRequirement[] {
  const ordered = [...journeyStages].sort((a, b) => a.order - b.order);

  if (state === "journey_completed") {
    return [];
  }

  if (state === "not_started" || !stageId) {
    const first = ordered[0];
    if (!first) {
      return [];
    }
    const chapterId = stageIdToBlueprintChapterId(first.id);
    if (!chapterId) {
      return [];
    }
    return [
      {
        stageId: first.id,
        chapterId,
        kind: "stage",
        source: "catalog",
      },
    ];
  }

  const index = ordered.findIndex((stage) => stage.id === stageId);
  if (index < 0) {
    return [];
  }

  // stage_completed → next stage; in_progress → still current stage as outstanding structural work,
  // with next stage listed only when moving forward structurally after completion.
  // Spec: "in_progress → next by order" for upcomingRequirements.
  const next =
    state === "stage_completed"
      ? ordered[index + 1]
      : ordered[index + 1];

  // For in_progress: upcoming is the next stage by catalog order (structural peek).
  // Outstanding current stage is implied by currentJourney; do not fabricate assessments.
  if (!next) {
    return [];
  }

  const chapterId = stageIdToBlueprintChapterId(next.id);
  if (!chapterId) {
    return [];
  }

  return [
    {
      stageId: next.id,
      chapterId,
      kind: "stage",
      source: "catalog",
    },
  ];
}

/**
 * Optional catalog templates — clearly labeled available_template, NEVER treated as saved.
 * Included only when explicitly requested via includeAvailableTemplates (tests/matrix).
 */
export function listAvailableArtifactTemplates(ownerUserId: string) {
  return standaloneArtifactIds.map((artifactId) => {
    const section = getBlueprintSection(artifactId);
    return {
      id: `template:${artifactId}`,
      artifactId,
      label: section?.label ?? artifactId,
      status: "available_template" as const,
      ownerUserId,
      updatedAt: null,
    };
  });
}

/**
 * Server-only assembler. Never trusts clientStageHint for stage resolution.
 */
export async function assembleLuminaJourneyContextForUser(
  userId: string,
  options: AssembleLuminaJourneyContextOptions = {},
): Promise<LuminaJourneyContext> {
  // clientStageHint is intentionally ignored — blocks client manipulation.
  void options.clientStageHint;

  const adapter = options.adapter ?? productionAdapter;
  const assembledAt = new Date().toISOString();

  const retrieval = await retrieveLuminaMemoryForUser(userId);
  const memoryEnabled = retrieval?.enabled === true;

  const architect: LuminaArchitectContext = retrieval
    ? {
        preferredName: retrieval.identity.preferredName,
        pronunciation: retrieval.identity.pronunciation,
        locale: retrieval.identity.locale,
        supportPreference: retrieval.preferences.supportPreference,
        timeZone: retrieval.preferences.timeZone,
      }
    : emptyArchitect();

  const currentJourney = await resolveAuthoritativeCurrentJourneyStage(
    userId,
    adapter,
  );

  const completedWork = (await adapter.listCompletedWork(userId))
    .filter((entry) => entry.explicit === true)
    .slice(0, MAX_COMPLETED_WORK);

  const savedArtifacts = (await adapter.listSavedArtifacts(userId))
    .filter((entry) => entry.ownerUserId === userId)
    .filter(
      (entry) =>
        entry.status === "saved" || entry.status === "available_template",
    )
    // Never inject raw body — metadata only (enforced by type shape).
    .slice(0, MAX_SAVED_ARTIFACTS);

  const upcomingRequirements = resolveUpcoming(
    currentJourney.state,
    currentJourney.stageId,
  );

  const relevantInsights = filterRelevantInsights({
    memoryEnabled,
    stageId: currentJourney.stageId,
    decisions: memoryEnabled ? (retrieval?.durable.decisions ?? []) : [],
    summaries: memoryEnabled ? (retrieval?.durable.summaries ?? []) : [],
    milestones: memoryEnabled ? (retrieval?.durable.milestones ?? []) : [],
    max: LUMINA_INSIGHT_CAP,
  });

  // Assessment + Chapter I product state — account-scoped; not conversational memory.
  const onboardingRecord =
    await getJourneyOnboardingStore().findOnboardingForUser(userId);
  const alivenessAssessment = toAlivenessContextSummary(
    onboardingRecord?.assessment,
  );
  const chapter1Record = await getChapter1Store().findChapter1ForUser(userId);
  const chapter1 = toChapter1ContextSummary(chapter1Record);
  const chapter2Record = await getChapter2Store().findChapter2ForUser(userId);
  const chapter2 = toChapter2ContextSummary(chapter2Record);
  const chapter3Record = await getChapter3Store().findChapter3ForUser(userId);
  const chapter3 = toChapter3ContextSummary(chapter3Record);
  const chapter4Record = await getChapter4Store().findChapter4ForUser(userId);
  const chapter4 = toChapter4ContextSummary(chapter4Record);
  const chapter5Record = await getChapter5Store().findChapter5ForUser(userId);
  const chapter5 = toChapter5ContextSummary(chapter5Record);
  const chapter6Record = await getChapter6Store().findChapter6ForUser(userId);
  const chapter6 = toChapter6ContextSummary(chapter6Record);
  const chapter7Record = await getChapter7Store().findChapter7ForUser(userId);
  const chapter7 = toChapter7ContextSummary(chapter7Record);

  return {
    architect,
    currentJourney,
    completedWork,
    savedArtifacts,
    upcomingRequirements,
    relevantInsights,
    alivenessAssessment,
    chapter1,
    chapter2,
    chapter3,
    chapter4,
    chapter5,
    chapter6,
    chapter7,
    meta: {
      memoryEnabled,
      assembledAt,
      limits: {
        maxInsights: LUMINA_INSIGHT_CAP,
        maxCompletedWork: MAX_COMPLETED_WORK,
        maxSavedArtifacts: MAX_SAVED_ARTIFACTS,
      },
    },
  };
}
