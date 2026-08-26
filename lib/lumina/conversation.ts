import { isLegacyCoreTeachingSegment } from "@/lib/journey/chapters/legacy-teaching";
import type { Locale } from "@/lib/i18n/config";
import { alivenessIndexDomains } from "@/content/journey/aliveness-index";
import { brandedTerm } from "@/lib/lumina/language/terminology";
import type {
  LuminaCitation,
  LuminaConversation,
  LuminaMessage,
  LuminaMessageRole,
} from "@/lib/lumina/types";

export const LUMINA_MESSAGE_MIN_LENGTH = 1;
export const LUMINA_MESSAGE_MAX_LENGTH = 4000;

/** Test markers for Row 75/77 interface validation — never used for model prompts. */
export const LUMINA_FIXTURE_CITATIONS_MARKER = "[fixture-citations]";
export const LUMINA_FORCE_ERROR_MARKER = "[force-error]";
/** Row 77 — safe one-line stage/state confirmation only (no full context dump). */
export const LUMINA_FIXTURE_JOURNEY_CONTEXT_MARKER = "[fixture-journey-context]";
/** Row 84 — request Aliveness assessment summary acknowledgment. */
export const LUMINA_FIXTURE_ALIVENESS_MARKER = "[fixture-aliveness]";
/** Row 85 — request Chapter I / Awakening discussion acknowledgment. */
export const LUMINA_FIXTURE_AWAKENING_MARKER = "[fixture-awakening]";
/** Row 86 — request Chapter II / Mirror discussion acknowledgment. */
export const LUMINA_FIXTURE_MIRROR_MARKER = "[fixture-mirror]";
export const LUMINA_FIXTURE_DECISION_MARKER = "[fixture-decision]";
export const LUMINA_FIXTURE_STANDARDS_MARKER = "[fixture-standards]";

export function createConversation(userId: string, now = new Date().toISOString()): LuminaConversation {
  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function createMessage(input: {
  conversationId: string;
  role: LuminaMessageRole;
  content: string;
  citations?: LuminaCitation[];
  createdAt?: string;
}): LuminaMessage {
  return {
    id: crypto.randomUUID(),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.citations && input.citations.length > 0
      ? { citations: input.citations }
      : {}),
  };
}

export function appendMessage(
  conversation: LuminaConversation,
  message: LuminaMessage,
): LuminaConversation {
  return {
    ...conversation,
    updatedAt: message.createdAt,
    messages: [...conversation.messages, message],
  };
}

export function sortMessagesChronologically(
  messages: LuminaMessage[],
): LuminaMessage[] {
  return [...messages].sort((a, b) => {
    if (a.createdAt === b.createdAt) {
      return a.id.localeCompare(b.id);
    }
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function normalizeMessageContent(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (
    trimmed.length < LUMINA_MESSAGE_MIN_LENGTH ||
    trimmed.length > LUMINA_MESSAGE_MAX_LENGTH
  ) {
    return null;
  }
  return trimmed;
}

export function contentRequestsFixtureCitations(content: string): boolean {
  return content.includes(LUMINA_FIXTURE_CITATIONS_MARKER);
}

export function contentRequestsForceError(content: string): boolean {
  return content.includes(LUMINA_FORCE_ERROR_MARKER);
}

export function contentRequestsFixtureJourneyContext(content: string): boolean {
  return content.includes(LUMINA_FIXTURE_JOURNEY_CONTEXT_MARKER);
}

export function contentRequestsAlivenessDiscussion(content: string): boolean {
  if (content.includes(LUMINA_FIXTURE_ALIVENESS_MARKER)) {
    return true;
  }
  const normalized = content.toLowerCase();
  return (
    normalized.includes("aliveness") ||
    normalized.includes("topic=aliveness") ||
    normalized.includes("índice de aliveness") ||
    normalized.includes("indice de aliveness")
  );
}

export function contentRequestsAwakeningDiscussion(content: string): boolean {
  if (content.includes(LUMINA_FIXTURE_AWAKENING_MARKER)) {
    return true;
  }
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=awakening") ||
    normalized.includes("chapter one") ||
    normalized.includes("capítulo uno") ||
    normalized.includes("capitulo uno") ||
    normalized.includes("the awakening") ||
    normalized.includes("aliveness project")
  );
}

export function contentRequestsMirrorDiscussion(content: string): boolean {
  if (content.includes(LUMINA_FIXTURE_MIRROR_MARKER)) {
    return true;
  }
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=mirror") ||
    normalized.includes("chapter two") ||
    normalized.includes("capítulo dos") ||
    normalized.includes("capitulo dos") ||
    normalized.includes("the mirror") ||
    normalized.includes("back half mirror")
  );
}

export function contentRequestsDecisionDiscussion(content: string): boolean {
  if (content.includes(LUMINA_FIXTURE_DECISION_MARKER)) {
    return true;
  }
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=decision") ||
    normalized.includes("chapter three") ||
    normalized.includes("capítulo tres") ||
    normalized.includes("capitulo tres") ||
    normalized.includes("the decision") ||
    normalized.includes("decision statement") ||
    normalized.includes("choosing intention")
  );
}

export function contentRequestsStandardsDiscussion(content: string): boolean {
  if (content.includes(LUMINA_FIXTURE_STANDARDS_MARKER)) {
    return true;
  }
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=standards") ||
    normalized.includes("chapter four") ||
    normalized.includes("capítulo cuatro") ||
    normalized.includes("capitulo cuatro") ||
    normalized.includes("the standards") ||
    normalized.includes("back half standards") ||
    normalized.includes("creating your standards") ||
    normalized.includes("los estándares") ||
    normalized.includes("los estandares")
  );
}

export function contentRequestsArchitectDiscussion(content: string): boolean {
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=architect") ||
    normalized.includes("chapter five") ||
    normalized.includes("capítulo cinco") ||
    normalized.includes("capitulo cinco") ||
    normalized.includes("becoming the architect") ||
    normalized.includes("convertirse en architect") ||
    normalized.includes("architect identity")
  );
}

export function contentRequestsExpansionDiscussion(content: string): boolean {
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=expansion") ||
    normalized.includes("chapter six") ||
    normalized.includes("capítulo seis") ||
    normalized.includes("capitulo seis") ||
    normalized.includes("expansion plan") ||
    normalized.includes("capítulo vi") ||
    normalized.includes("capitulo vi")
  );
}

export function contentRequestsBeginningDiscussion(content: string): boolean {
  const normalized = content.toLowerCase();
  return (
    normalized.includes("topic=beginning") ||
    normalized.includes("chapter seven") ||
    normalized.includes("capítulo siete") ||
    normalized.includes("capitulo siete") ||
    normalized.includes("capítulo vii") ||
    normalized.includes("capitulo vii") ||
    normalized.includes("back half declaration")
  );
}

/** Fixture citations only when the caller explicitly requests them via marker. */
export function buildFixtureCitations(locale: Locale = "en"): LuminaCitation[] {
  const journeyLabel = brandedTerm("theJourney", locale);
  const disclosureLabel =
    locale === "es" ? "Divulgación de IA" : "AI Disclosure";
  const externalLabel =
    locale === "es" ? "Referencia de ejemplo" : "Example reference";

  return [
    {
      id: "fixture-journey",
      label: journeyLabel,
      href: "/architect/journey",
      kind: "internal",
    },
    {
      id: "fixture-ai-disclosure",
      label: disclosureLabel,
      href: locale === "es" ? "/es/legal/ai-disclosure" : "/legal/ai-disclosure",
      kind: "internal",
    },
    {
      id: "fixture-external",
      label: externalLabel,
      href: "https://example.com",
      kind: "external",
    },
  ];
}

export type StubAlivenessAssessmentSummary = {
  status: "not_started" | "in_progress" | "complete";
  total?: number;
  maxTotal?: number;
  highestDomains?: string[];
  lowestDomains?: string[];
};

export type StubChapter1Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  alivenessProject?: {
    status: "not_started" | "in_progress" | "complete";
    answerCounts?: Record<string, number>;
    targets?: Record<string, number>;
  };
};

export type StubChapter2Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  mirrorExercise?: {
    status: "not_started" | "in_progress" | "complete";
    step1Count?: number;
    step2Count?: number;
    step3CompleteRows?: number;
    step4FilledDimensions?: number;
    targets?: {
      step1: number;
      step2: number;
      step3: number;
      step4: number;
    };
  };
};

export type StubChapter3Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  reflection?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  practice?: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement?: boolean;
  };
  commitment?: {
    status: "not_started" | "in_progress" | "complete";
    affirmed?: boolean;
  };
};

export type StubChapter4Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  reflection?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  practice?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  commitment?: {
    status: "not_started" | "in_progress" | "complete";
    affirmed?: boolean;
  };
};

export type StubChapter5Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  reflection?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  practice?: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement?: boolean;
  };
  commitment?: {
    status: "not_started" | "in_progress" | "complete";
    affirmed?: boolean;
  };
};

export type StubChapter6Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  reflection?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  practice?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  commitment?: {
    status: "not_started" | "in_progress" | "complete";
    affirmed?: boolean;
  };
};

export type StubChapter7Summary = {
  status: "not_started" | "in_progress" | "complete";
  currentSectionId?: string;
  reflection?: {
    status: "not_started" | "in_progress" | "complete";
    filledCount?: number;
    targetCount?: number;
  };
  practice?: {
    status: "not_started" | "in_progress" | "complete";
    hasStatement?: boolean;
  };
  commitment?: {
    status: "not_started" | "in_progress" | "complete";
    affirmed?: boolean;
  };
};

export type StubAssistantReplyContext = {
  locale?: Locale;
  /** Safe subset only — never pass the full journey context object here for client echo. */
  journeyStageId?: string | null;
  journeyState?: string | null;
  /** Row 84 — structured scores only; no invented bands or narratives. */
  alivenessAssessment?: StubAlivenessAssessmentSummary | null;
  /** Row 85 — Chapter I progress counts only; never raw exercise answers. */
  chapter1?: StubChapter1Summary | null;
  /** Row 86 — Chapter II progress counts only; never raw exercise answers. */
  chapter2?: StubChapter2Summary | null;
  /** Row 87 — Chapter III progress counts only; never raw exercise answers. */
  chapter3?: StubChapter3Summary | null;
  /** Row 129 — Chapter IV progress counts only; never raw exercise answers. */
  chapter4?: StubChapter4Summary | null;
  /** Row 130 — Chapter V progress counts only; never raw exercise answers. */
  chapter5?: StubChapter5Summary | null;
  /** Row 131 — Chapter VI progress counts only; never raw exercise answers. */
  chapter6?: StubChapter6Summary | null;
  /** Row 132 — Chapter VII progress counts only; never raw exercise answers. */
  chapter7?: StubChapter7Summary | null;
};

/** Core Teaching is no longer a participant stage; never echo it to Lumina. */
function luminaParticipantSectionId(
  sectionId: string | undefined,
  teachingFallback: string,
): string {
  if (isLegacyCoreTeachingSegment(sectionId)) {
    return teachingFallback;
  }
  if (sectionId === "aliveness-project" || sectionId === "mirror-exercise") {
    return "practice";
  }
  return sectionId ?? "welcome";
}

/**
 * Safe Row 75/77/79/84 stub reply — no LLM, no provider, no prompt exposure.
 * Citations are attached only when the user content includes the fixture marker.
 * Journey fixture marker returns stageId/state only (no full context dump).
 * Aliveness discussion acknowledges scores + Remember framing only.
 * Locale selects EN/ES natural phrasing; branded terms stay consistent.
 */
export function buildStubAssistantReply(
  userContent: string,
  context?: StubAssistantReplyContext,
): {
  content: string;
  citations?: LuminaCitation[];
} {
  const locale: Locale = context?.locale === "es" ? "es" : "en";
  const lumina = brandedTerm("lumina", locale);
  const journey = brandedTerm("journey", locale);

  let content =
    locale === "es"
      ? `He recibido tu mensaje. La inteligencia conversacional más completa de ${lumina} llegará en una versión posterior.`
      : `I've received your message. ${lumina}'s fuller conversation intelligence arrives in a later release.`;

  if (contentRequestsFixtureJourneyContext(userContent)) {
    const stageId = context?.journeyStageId ?? "null";
    const state = context?.journeyState ?? "not_started";
    content =
      locale === "es"
        ? `Contexto de ${journey} activo: stageId=${stageId}; state=${state}.`
        : `${journey} context active: stageId=${stageId}; state=${state}.`;
  }

  if (contentRequestsAlivenessDiscussion(userContent)) {
    const assessment = context?.alivenessAssessment;
    if (assessment?.status === "complete" && assessment.total != null) {
      const formatDomains = (ids: string[] | undefined) =>
        (ids ?? [])
          .map(
            (id) =>
              alivenessIndexDomains.find((domain) => domain.id === id)?.name ??
              id,
          )
          .join(", ") || "—";
      const highest = formatDomains(assessment.highestDomains);
      const lowest = formatDomains(assessment.lowestDomains);
      content =
        locale === "es"
          ? `Puedo ver tu Aliveness Index: ${assessment.total}/${assessment.maxTotal ?? 225}. Más alto: ${highest}. Más bajo: ${lowest}. El propósito no es decirte si tu vida es buena o mala — es ayudarte a ver dónde se siente más viva y dónde tu Back Half te invita a crecer. La transformación comienza con la intención.`
          : `I can see your Aliveness Index: ${assessment.total}/${assessment.maxTotal ?? 225}. Highest: ${highest}. Lowest: ${lowest}. The purpose is not to tell you whether your life is good or bad — it is to help you identify where your life feels most alive, and where your Back Half is inviting you to grow. Transformation begins with intention.`;
    } else if (assessment?.status === "in_progress") {
      content =
        locale === "es"
          ? `Tu Aliveness Index aún está en progreso. Completa cada afirmación para que podamos revisar tus puntuaciones juntas — sin etiquetas clínicas inventadas.`
          : `Your Aliveness Index is still in progress. Complete every statement so we can review your scores together — without inventing clinical labels.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo un Aliveness Index completo en tu Journey. Cuando lo completes, podremos hablar de tus puntuaciones y las preguntas de reflexión aprobadas.`
          : `I do not yet see a completed Aliveness Index on your Journey. When you finish it, we can discuss your scores and the approved reflection prompts.`;
    }
  }

  if (contentRequestsAwakeningDiscussion(userContent)) {
    const chapter1 = context?.chapter1;
    const project = chapter1?.alivenessProject;
    if (chapter1?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter One — The Awakening está completo, incluido The Aliveness Project. Awareness is not the destination. It is the beginning. Cuando quieras, podemos reflexionar sobre lo que tu proyecto reveló — sin reescribir tu trabajo.`
          : `I can see that Chapter One — The Awakening is complete, including The Aliveness Project. Awareness is not the destination. It is the beginning. When you are ready, we can reflect on what your project revealed — without rewriting your work.`;
    } else if (project?.status === "complete") {
      content =
        locale === "es"
          ? `Veo The Aliveness Project completo en tu Capítulo Uno. Puedes continuar a la finalización del capítulo cuando estés listo.`
          : `I can see The Aliveness Project is complete in your Chapter One. You can continue to chapter completion when you are ready.`;
    } else if (project?.status === "in_progress" || chapter1?.status === "in_progress") {
      const counts = project?.answerCounts ?? {};
      const targets = project?.targets ?? {};
      const progress = ["q1", "q2", "q3", "q4", "q5"]
        .map((id) => `${id}:${counts[id] ?? 0}/${targets[id] ?? 0}`)
        .join(" ");
      content =
        locale === "es"
          ? `Estás en Chapter One — The Awakening (sección ${luminaParticipantSectionId(chapter1?.currentSectionId, "reflection")}). Progreso de The Aliveness Project: ${progress}. Sigue respondiendo con honestidad; tu trabajo se guarda con esta cuenta.`
          : `You are in Chapter One — The Awakening (section ${luminaParticipantSectionId(chapter1?.currentSectionId, "reflection")}). Aliveness Project progress: ${progress}. Keep answering honestly; your work saves with this account.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter One — The Awakening. Cuando entres al capítulo y guardes The Aliveness Project, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter One — The Awakening progress. When you enter the chapter and save The Aliveness Project, I can meet you with that context.`;
    }
  }

  if (contentRequestsMirrorDiscussion(userContent)) {
    const chapter2 = context?.chapter2;
    const mirror = chapter2?.mirrorExercise;
    const targets = mirror?.targets;
    if (chapter2?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter Two — The Mirror está completo, incluido The Back Half Mirror. Clarity is never the destination. It is the beginning of transformation. Cuando quieras, podemos reflexionar sobre lo que el espejo reveló — sin reescribir tu trabajo.`
          : `I can see that Chapter Two — The Mirror is complete, including The Back Half Mirror. Clarity is never the destination. It is the beginning of transformation. When you are ready, we can reflect on what the mirror revealed — without rewriting your work.`;
    } else if (mirror?.status === "complete") {
      content =
        locale === "es"
          ? `Veo The Back Half Mirror completo en tu Capítulo Dos. Puedes continuar a la finalización del capítulo cuando estés listo.`
          : `I can see The Back Half Mirror is complete in your Chapter Two. You can continue to chapter completion when you are ready.`;
    } else if (
      mirror?.status === "in_progress" ||
      chapter2?.status === "in_progress"
    ) {
      const progress = [
        `step1:${mirror?.step1Count ?? 0}/${targets?.step1 ?? 50}`,
        `step2:${mirror?.step2Count ?? 0}/${targets?.step2 ?? 50}`,
        `step3:${mirror?.step3CompleteRows ?? 0}/${targets?.step3 ?? 1}`,
        `step4:${mirror?.step4FilledDimensions ?? 0}/${targets?.step4 ?? 1}`,
      ].join(" ");
      content =
        locale === "es"
          ? `Estás en Chapter Two — The Mirror (sección ${luminaParticipantSectionId(chapter2?.currentSectionId, "reflection")}). Progreso de The Back Half Mirror: ${progress}. Sigue observando con honestidad; tu trabajo se guarda con esta cuenta.`
          : `You are in Chapter Two — The Mirror (section ${luminaParticipantSectionId(chapter2?.currentSectionId, "reflection")}). Back Half Mirror progress: ${progress}. Keep observing honestly; your work saves with this account.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter Two — The Mirror. Cuando entres al capítulo y guardes The Back Half Mirror, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter Two — The Mirror progress. When you enter the chapter and save The Back Half Mirror, I can meet you with that context.`;
    }
  }

  if (contentRequestsDecisionDiscussion(userContent)) {
    const chapter3 = context?.chapter3;
    const reflection = chapter3?.reflection;
    const practice = chapter3?.practice;
    const commitment = chapter3?.commitment;
    if (chapter3?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter III — The Decision está completo, incluida tu Decision Statement y tu Weekly Commitment. Tu futuro no se crea deseando. Se crea decidiendo. Cuando quieras, podemos reflexionar sobre esa decisión — sin reescribir tu trabajo.`
          : `I can see that Chapter III — The Decision is complete, including your Decision Statement and Weekly Commitment. Your future is not created by wishing. It is created by deciding. When you are ready, we can reflect on that decision — without rewriting your work.`;
    } else if (
      reflection?.status === "in_progress" ||
      practice?.status === "in_progress" ||
      commitment?.status === "in_progress" ||
      chapter3?.status === "in_progress"
    ) {
      const noticed: string[] = [];
      if (
        reflection?.status === "in_progress" ||
        reflection?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "has comenzado las Preguntas de reflexión de Architect"
            : "you have begun the Architect Reflection Questions",
        );
      }
      if (practice?.hasStatement || practice?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "tu Decision Statement está guardada"
            : "your Decision Statement is saved",
        );
      }
      if (commitment?.affirmed || commitment?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "has afirmado tu Weekly Commitment"
            : "you have affirmed your Weekly Commitment",
        );
      }
      const noticedClause =
        noticed.length > 0
          ? locale === "es"
            ? ` Puedo ver que ${noticed.join(" y ")}.`
            : ` I can see that ${noticed.join(" and ")}.`
          : "";
      content =
        locale === "es"
          ? `Estás en Chapter III — The Decision.${noticedClause} Sigue eligiendo con intención; tu trabajo se guarda con esta cuenta.`
          : `You are in Chapter III — The Decision.${noticedClause} Keep choosing with intention; your work saves with this account.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter III — The Decision. Cuando entres al capítulo y guardes tus reflexiones o Decision Statement, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter III — The Decision progress. When you enter the chapter and save your reflections or Decision Statement, I can meet you with that context.`;
    }
  }

  if (contentRequestsStandardsDiscussion(userContent)) {
    const chapter4 = context?.chapter4;
    const reflection = chapter4?.reflection;
    const practice = chapter4?.practice;
    const commitment = chapter4?.commitment;
    if (chapter4?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter IV — The Standards está completo, incluidos tus Back Half Standards y tu Weekly Commitment. Every extraordinary life is built one decision at a time. Cuando quieras, podemos reflexionar sobre esos estándares — sin reescribir tu trabajo.`
          : `I can see that Chapter IV — The Standards is complete, including your Back Half Standards and Weekly Commitment. Every extraordinary life is built one decision at a time. When you are ready, we can reflect on those standards — without rewriting your work.`;
    } else if (
      reflection?.status === "in_progress" ||
      practice?.status === "in_progress" ||
      commitment?.status === "in_progress" ||
      chapter4?.status === "in_progress"
    ) {
      const noticed: string[] = [];
      if (
        reflection?.status === "in_progress" ||
        reflection?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "has comenzado las Preguntas de reflexión de Architect"
            : "you have begun the Architect Reflection Questions",
        );
      }
      if (
        (practice?.filledCount ?? 0) > 0 ||
        practice?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "tus Back Half Standards están en progreso"
            : "your Back Half Standards are in progress",
        );
      }
      if (commitment?.affirmed || commitment?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "has afirmado tu Weekly Commitment"
            : "you have affirmed your Weekly Commitment",
        );
      }
      const noticedClause =
        noticed.length > 0
          ? locale === "es"
            ? ` Puedo ver que ${noticed.join(" y ")}.`
            : ` I can see that ${noticed.join(" and ")}.`
          : "";
      content =
        locale === "es"
          ? `Estás en Chapter IV — The Standards.${noticedClause} Sigue eligiendo estándares sobre excusas; tu trabajo se guarda con esta cuenta.`
          : `You are in Chapter IV — The Standards.${noticedClause} Keep choosing standards over excuses; your work saves with this account.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter IV — The Standards. Cuando entres al capítulo y guardes tus reflexiones o Back Half Standards, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter IV — The Standards progress. When you enter the chapter and save your reflections or Back Half Standards, I can meet you with that context.`;
    }
  }

  if (contentRequestsArchitectDiscussion(userContent)) {
    const chapter5 = context?.chapter5;
    const reflection = chapter5?.reflection;
    const practice = chapter5?.practice;
    const commitment = chapter5?.commitment;
    if (chapter5?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter V — Becoming the Architect está completo, incluida tu Architect Identity Statement y tu Weekly Commitment. Today isn't about earning a title. It's about accepting a responsibility. Cuando quieras, podemos reflexionar sobre esa identidad — sin reescribir tu trabajo.`
          : `I can see that Chapter V — Becoming the Architect is complete, including your Architect Identity Statement and Weekly Commitment. Today isn't about earning a title. It's about accepting a responsibility. When you are ready, we can reflect on that identity — without rewriting your work.`;
    } else if (
      reflection?.status === "in_progress" ||
      practice?.status === "in_progress" ||
      commitment?.status === "in_progress" ||
      chapter5?.status === "in_progress"
    ) {
      const noticed: string[] = [];
      if (
        reflection?.status === "in_progress" ||
        reflection?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "has comenzado las Preguntas de reflexión de Architect"
            : "you have begun the Architect Reflection Questions",
        );
      }
      if (practice?.hasStatement || practice?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "tu Architect Identity Statement está guardada"
            : "your Architect Identity Statement is saved",
        );
      }
      if (commitment?.affirmed || commitment?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "has afirmado tu Weekly Commitment"
            : "you have affirmed your Weekly Commitment",
        );
      }
      const noticedClause =
        noticed.length > 0
          ? locale === "es"
            ? ` Puedo ver que ${noticed.join(" y ")}.`
            : ` I can see that ${noticed.join(" and ")}.`
          : "";
      content =
        locale === "es"
          ? `Estás en Chapter V — Becoming the Architect.${noticedClause} Sigue eligiendo vivir como el Architect de tu vida.`
          : `You are in Chapter V — Becoming the Architect.${noticedClause} Keep choosing to live as the Architect of your life.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter V — Becoming the Architect. Cuando entres al capítulo y guardes tus reflexiones o Architect Identity Statement, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter V — Becoming the Architect progress. When you enter the chapter and save your reflections or Architect Identity Statement, I can meet you with that context.`;
    }
  }

  if (contentRequestsExpansionDiscussion(userContent)) {
    const chapter6 = context?.chapter6;
    const reflection = chapter6?.reflection;
    const practice = chapter6?.practice;
    const commitment = chapter6?.commitment;
    if (chapter6?.status === "complete") {
      content =
        locale === "es"
          ? `Puedo ver que Chapter VI — Expansion está completo, incluido tu Expansion Plan y tu Weekly Commitment. An extraordinary life is never measured only by what it achieves. It is measured by what it awakens in others. Cuando quieras, podemos reflexionar sobre esa expansión — sin reescribir tu trabajo.`
          : `I can see that Chapter VI — Expansion is complete, including your Expansion Plan and Weekly Commitment. An extraordinary life is never measured only by what it achieves. It is measured by what it awakens in others. When you are ready, we can reflect on that expansion — without rewriting your work.`;
    } else if (
      reflection?.status === "in_progress" ||
      practice?.status === "in_progress" ||
      commitment?.status === "in_progress" ||
      chapter6?.status === "in_progress"
    ) {
      const noticed: string[] = [];
      if (
        reflection?.status === "in_progress" ||
        reflection?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "has comenzado las Preguntas de reflexión de Architect"
            : "you have begun the Architect Reflection Questions",
        );
      }
      if (
        (practice?.filledCount ?? 0) > 0 ||
        practice?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "tu Expansion Plan está en progreso"
            : "your Expansion Plan is in progress",
        );
      }
      if (commitment?.affirmed || commitment?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "has afirmado tu Weekly Commitment"
            : "you have affirmed your Weekly Commitment",
        );
      }
      const noticedClause =
        noticed.length > 0
          ? locale === "es"
            ? ` Puedo ver que ${noticed.join(" y ")}.`
            : ` I can see that ${noticed.join(" and ")}.`
          : "";
      content =
        locale === "es"
          ? `Estás en Chapter VI — Expansion.${noticedClause} Sigue eligiendo contribución sobre complacencia.`
          : `You are in Chapter VI — Expansion.${noticedClause} Keep choosing contribution over complacency.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter VI — Expansion. Cuando entres al capítulo y guardes tus reflexiones o Expansion Plan, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter VI — Expansion progress. When you enter the chapter and save your reflections or Expansion Plan, I can meet you with that context.`;
    }
  }

  if (contentRequestsBeginningDiscussion(userContent)) {
    const chapter7 = context?.chapter7;
    const reflection = chapter7?.reflection;
    const practice = chapter7?.practice;
    const commitment = chapter7?.commitment;
    const journeyComplete = context?.journeyState === "journey_completed";
    if (chapter7?.status === "complete" || journeyComplete) {
      content =
        locale === "es"
          ? `Puedo ver que Chapter VII — The Beginning está completo, incluida tu Back Half Declaration y tu Weekly Commitment. Your Journey does not end here—it begins here. Este es el capítulo final del Journey. Cuando quieras, podemos reflexionar sobre ese comienzo — sin reescribir tu trabajo.`
          : `I can see that Chapter VII — The Beginning is complete, including your Back Half Declaration and Weekly Commitment. Your Journey does not end here—it begins here. This is the final chapter of the Journey. When you are ready, we can reflect on that beginning — without rewriting your work.`;
    } else if (
      reflection?.status === "in_progress" ||
      practice?.status === "in_progress" ||
      commitment?.status === "in_progress" ||
      chapter7?.status === "in_progress"
    ) {
      const noticed: string[] = [];
      if (
        reflection?.status === "in_progress" ||
        reflection?.status === "complete"
      ) {
        noticed.push(
          locale === "es"
            ? "has comenzado las Preguntas de reflexión de Architect"
            : "you have begun the Architect Reflection Questions",
        );
      }
      if (practice?.hasStatement || practice?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "tu Back Half Declaration está en progreso"
            : "your Back Half Declaration is in progress",
        );
      }
      if (commitment?.affirmed || commitment?.status === "complete") {
        noticed.push(
          locale === "es"
            ? "has afirmado tu Weekly Commitment"
            : "you have affirmed your Weekly Commitment",
        );
      }
      const noticedClause =
        noticed.length > 0
          ? locale === "es"
            ? ` Puedo ver que ${noticed.join(" y ")}.`
            : ` I can see that ${noticed.join(" and ")}.`
          : "";
      content =
        locale === "es"
          ? `Estás en Chapter VII — The Beginning, el capítulo final del Journey.${noticedClause} Sigue eligiendo vivir con intención cada día.`
          : `You are in Chapter VII — The Beginning, the final chapter of the Journey.${noticedClause} Keep choosing to live with intention each day.`;
    } else {
      content =
        locale === "es"
          ? `Aún no veo progreso guardado de Chapter VII — The Beginning. Cuando entres al capítulo y guardes tus reflexiones o Back Half Declaration, podré acompañarte con ese contexto.`
          : `I do not yet see saved Chapter VII — The Beginning progress. When you enter the chapter and save your reflections or Back Half Declaration, I can meet you with that context.`;
    }
  }

  if (contentRequestsFixtureCitations(userContent)) {
    return { content, citations: buildFixtureCitations(locale) };
  }

  return { content };
}

export function findLastUserMessage(
  conversation: LuminaConversation,
): LuminaMessage | undefined {
  const ordered = sortMessagesChronologically(conversation.messages);
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const message = ordered[index];
    if (message?.role === "user") {
      return message;
    }
  }
  return undefined;
}

/** True when the latest user turn has no following assistant reply. */
export function hasPendingAssistantTurn(
  conversation: LuminaConversation,
): boolean {
  const ordered = sortMessagesChronologically(conversation.messages);
  if (ordered.length === 0) {
    return false;
  }
  const last = ordered[ordered.length - 1];
  return last?.role === "user";
}
