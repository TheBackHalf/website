/**
 * Capítulo V — Convertirse en Architect — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-5-architect.ts
 * Reflection question ids and ordering must stay identical to English so saved
 * answers remain locale-independent.
 */

import { type ArchitectReflectionQuestion } from "@/content/journey/chapter-5-architect";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_5_TITLE_ES =
  "Capítulo V — Convertirse en Architect" as const;
export const CHAPTER_5_SHORT_TITLE_ES = "Convertirse en Architect" as const;

/** Founder Welcome — Spanish manuscript (full welcome block). */
export const chapter5FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, {First Name}. Si tu nombre no está disponible... Bienvenido/a de nuevo, Architect. Hasta este punto, has reflexionado sobre tu vida. Has tomado decisiones importantes. Has establecido nuevos estándares. Ahora es momento de algo aún más poderoso. Es momento de abrazar una nueva identidad. Las transformaciones más duraderas no ocurren porque nos esforzamos más. Ocurren porque comenzamos a vernos de manera diferente. Ya no eres simplemente alguien que espera un futuro mejor. Te estás convirtiendo en el Architect de tu vida. Un Architect no espera el cambio. Un Architect lo crea intencionalmente. Mientras avanzas por este capítulo, permítete entrar plenamente en esa identidad. No algún día. Comenzando hoy. Cuando estés listo/a... Comencemos el Capítulo Cinco.";

/** Core Teaching — Spanish manuscript. */
export const chapter5CoreTeachingRawEs =
  "Para ahora, has dedicado tiempo a reflexionar, decidir y crear nuevos estándares. Ahora llega la parte más importante. Vivirlos. Un Architect no espera a que las circunstancias mejoren. Un Architect crea intencionalmente las condiciones para una vida significativa. Esa responsabilidad es a la vez desafiante e increíblemente empoderadora. Cada decisión intencional que tomas refuerza tu identidad. Y cada día ofrece otra oportunidad de convertirte más plenamente en ti mismo/a.";

export function personalizeChapter5WelcomeEs(
  raw: string,
  _firstName?: string | null,
): string {
  return personalizeSpanishWelcome(raw, null, "Bienvenido/a de nuevo");
}

export const ARCHITECT_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

export const architectReflectionQuestionsEs: readonly ArchitectReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "¿Qué identidad has estado cargando que ya no te sirve?",
    },
    {
      id: "q2",
      prompt: "¿Qué tipo de Architect eliges convertirte?",
    },
    {
      id: "q3",
      prompt:
        "¿Cómo abordaría un Architect los desafíos que actualmente hay en tu vida?",
    },
    {
      id: "q4",
      prompt: "¿Qué hábito diario refleja mejor tu nueva identidad?",
    },
    {
      id: "q5",
      prompt: "¿Dónde sigues cediendo la responsabilidad de tu vida?",
    },
    {
      id: "q6",
      prompt:
        "¿Qué cambiaría si creyeras plenamente que eres capaz de crear intencionalmente una vida extraordinaria?",
    },
    {
      id: "q7",
      prompt: 'Completa esta frase: "Soy un Architect que..."',
    },
  ] as const;

export const ARCHITECT_PRACTICE_ES = {
  title: "Práctica intencional",
  instructions: [
    "Escribe tu Architect Identity Statement.",
    "Comienza con:",
    "Soy un Architect que...",
    "Describe a la persona en la que te estás convirtiendo intencionalmente.",
    "No quien esperas ser algún día.",
    "Quien eliges convertirte comenzando hoy.",
    "Lee tu declaración cada mañana y cada noche esta semana.",
    "Cuando te enfrentes a una decisión, pregúntate:",
    "¿Qué elegiría un Architect?",
    "Luego elige en consecuencia.",
  ],
  stem: "Soy un Architect que...",
} as const;

export const ARCHITECT_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "Esta semana, elijo vivir como el Architect de mi vida.",
} as const;

export const chapter5FounderClosingRawEs =
  "Hoy no se trata de ganar un título. Se trata de aceptar una responsabilidad. Tienes la capacidad de crear intencionalmente tu vida. No perfectamente. No de una sola vez. Sino una decisión a la vez. Bienvenido/a, Architect. Tu identidad ha cambiado. Ahora deja que tu vida lo refleje.";
