/**
 * Capítulo III — La Decisión — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-3-decision.ts
 * Reflection question ids and ordering must stay identical to English so saved
 * answers remain locale-independent.
 */

import {
  resolveChapter3DisplayName,
  type DecisionReflectionQuestion,
} from "@/content/journey/chapter-3-decision";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_3_TITLE_ES = "Capítulo III — La Decisión" as const;
export const CHAPTER_3_SHORT_TITLE_ES = "La Decisión" as const;
export const CHAPTER_3_TEACHING_SUBTITLE_ES = "Elegir la Intención" as const;

/** Founder Welcome — Spanish manuscript (full welcome block). */
export const chapter3FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, {First Name}. Si tu nombre no está disponible... Bienvenido/a de nuevo, Architect. La consciencia por sí sola no cambia una vida. Una decisión sí. Llega un momento en que toda transformación significativa nos pide algo. No otra idea. No otro plan. Una decisión. La decisión de dejar de esperar. La decisión de dejar de permitir que el miedo, la comodidad o la expectativa den forma a nuestro futuro. Este capítulo trata de ese momento. El momento en que decides que tu Back Half no ocurrirá por accidente. Ocurrirá porque tú lo eliges. Tómate tu tiempo con los ejercicios que siguen. No apresures este capítulo. Algunas decisiones cambian un día. Otras cambian la dirección de una vida. Creo que estás a punto de tomar una de esas decisiones. Cuando estés listo/a... Comencemos el Capítulo Tres.";

/** Core Teaching — Spanish manuscript. */
export const chapter3CoreTeachingRawEs =
  "Toda vida extraordinaria se construye una decisión intencional a la vez. Este capítulo marca una transición importante. Ya no estás simplemente reflexionando sobre tu vida. Estás empezando a diseñarla. Cada decisión que tomas hoy se convierte en parte del cimiento del mañana. Mientras completas estos ejercicios, elige con intención. No desde el miedo. No desde la expectativa. Sino desde la vida que verdaderamente quieres crear. El futuro se construye con las decisiones de hoy.";

export function personalizeChapter3WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  return personalizeSpanishWelcome(
    raw,
    resolveChapter3DisplayName(firstName),
    "Bienvenido/a de nuevo",
  );
}

export const DECISION_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

export const decisionReflectionQuestionsEs: readonly DecisionReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "¿Qué decisión has estado posponiendo?",
    },
    {
      id: "q2",
      prompt: "¿Qué miedo ha estado tomando decisiones por ti en silencio?",
    },
    {
      id: "q3",
      prompt: "¿Dónde estás esperando en lugar de actuar?",
    },
    {
      id: "q4",
      prompt: "¿Qué te animaría tu yo del futuro a decidir hoy?",
    },
    {
      id: "q5",
      prompt: "¿Qué ya no estás dispuesto/a a tolerar en tu vida?",
    },
    {
      id: "q6",
      prompt: "¿En qué tipo de persona eliges convertirte?",
    },
    {
      id: "q7",
      prompt: "¿Qué decisión definirá el comienzo de tu Back Half?",
    },
  ] as const;

export const DECISION_PRACTICE_ES = {
  title: "Práctica intencional",
  instructions: [
    "Escribe tu Declaración de Decisión.",
    "Completa esta frase:",
    "A partir de hoy, elijo...",
    "Mantenla visible durante toda la semana.",
    "Vuelve a ella cada mañana.",
    "Permite que se convierta en el lente a través del cual tomas tus decisiones.",
  ],
  stem: "A partir de hoy, elijo...",
} as const;

export const DECISION_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "Esta semana, elijo la intención sobre la expectativa.",
} as const;

export const chapter3FounderClosingRawEs =
  "Tu futuro no se crea deseando. Se crea decidiendo. Hoy cruzaste una línea invisible. La vida que has estado esperando ya no es una idea. Ahora es una decisión. Y las decisiones tienen el poder de transformarlo todo.";
