/**
 * Capítulo IV — Los Estándares — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-4-standards.ts
 * Reflection question ids and ordering must stay identical to English so saved
 * answers remain locale-independent.
 */

import {
  resolveChapter4DisplayName,
  type StandardsPracticeEntry,
  type StandardsReflectionQuestion,
} from "@/content/journey/chapter-4-standards";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_4_TITLE_ES = "Capítulo IV — Los Estándares" as const;
export const CHAPTER_4_SHORT_TITLE_ES = "Los Estándares" as const;
export const CHAPTER_4_TEACHING_SUBTITLE_ES =
  "Crear Tus Estándares" as const;

/** Founder Welcome — Spanish manuscript (full welcome block). */
export const chapter4FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, {First Name}. Si tu nombre no está disponible... Bienvenido/a de nuevo, Architect. Para ahora, has despertado. Has mirado tu vida con honestidad. Y has tomado una decisión. Ahora llega la pregunta que determina si esa decisión se convierte en tu realidad. ¿Qué estándares guiarán tu vida? Nuestras vidas rara vez se elevan por encima de los estándares que elegimos aceptar. Las vidas extraordinarias no se construyen con momentos ocasionales de inspiración. Se construyen con elecciones intencionales hechas de manera constante a lo largo del tiempo. Este capítulo te invita a establecer los estándares que se convertirán en el cimiento de tu Back Half. Elígelos con cuidado. Hónralos con constancia. Y permite que se conviertan en la brújula que guía cada decisión que tomas. Cuando estés listo/a... Comencemos el Capítulo Cuatro.";

/** Core Teaching — Spanish manuscript. */
export const chapter4CoreTeachingRawEs =
  "Los estándares determinan la calidad de nuestras vidas. No nuestras intenciones. No nuestras metas. Nuestros estándares. Lo que aceptamos de manera constante termina convirtiéndose en nuestra realidad. Este capítulo te invita a establecer estándares que protejan tu paz, tu propósito, tus relaciones, tu salud y tu futuro. Estos no son reglas. Son compromisos con la persona en la que te estás convirtiendo. Elígelos con reflexión. Luego hónralos con constancia.";

export function personalizeChapter4WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  return personalizeSpanishWelcome(
    raw,
    resolveChapter4DisplayName(firstName),
    "Bienvenido/a de nuevo",
  );
}

export const STANDARDS_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

export const standardsReflectionQuestionsEs: readonly StandardsReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "¿Qué estándares han estado dando forma a tu vida en silencio hasta ahora?",
    },
    {
      id: "q2",
      prompt: "¿Qué estándares ya no sirven a la persona en la que te estás convirtiendo?",
    },
    {
      id: "q3",
      prompt: "¿Cuál es un área de tu vida donde tus estándares necesitan elevarse?",
    },
    {
      id: "q4",
      prompt: "¿Qué comportamientos ya no son aceptables en tu Back Half?",
    },
    {
      id: "q5",
      prompt: "¿Cómo se ve honrarte a ti mismo/a en un martes ordinario?",
    },
    {
      id: "q6",
      prompt:
        "¿Qué estándar tendría el mayor impacto positivo si lo vivieras de manera constante?",
    },
    {
      id: "q7",
      prompt: "¿Qué tipo de vida hacen posible tus estándares?",
    },
  ] as const;

export const STANDARDS_PRACTICE_ES = {
  title: "Práctica intencional",
  instructions: [
    "Escribe tus primeros Back Half Standards.",
    "Un estándar es un compromiso personal que guía cómo eliges vivir. A diferencia de una meta, un estándar no es algo que esperas alcanzar: es algo que eliges practicar cada día.",
  ],
  examplesIntro: "Aquí hay algunos ejemplos:",
  examples: [
    "Priorizo mi bienestar mental y emocional.",
    "Elijo el coraje sobre la comodidad.",
    "Me rodeo de personas que elevan mi vida.",
    "Honro mi cuerpo a través del movimiento y la nutrición.",
    "Creo intencionalmente momentos de asombro.",
    "Protejo mi tiempo y mi energía.",
    "Vivo en alineación con mis valores, incluso cuando es difícil.",
  ],
  closing: [
    "Ahora escribe cinco estándares que reflejen la vida que estás creando intencionalmente.",
    "No los elijas porque suenen impresionantes.",
    "Elígelos porque representan a la persona en la que te estás convirtiendo.",
    "Léelos cada mañana esta semana.",
  ],
  entries: [
    { id: "s1", label: "Estándar uno" },
    { id: "s2", label: "Estándar dos" },
    { id: "s3", label: "Estándar tres" },
    { id: "s4", label: "Estándar cuatro" },
    { id: "s5", label: "Estándar cinco" },
  ] as const satisfies readonly StandardsPracticeEntry[],
} as const;

export const STANDARDS_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "Esta semana, elijo estándares sobre excusas.",
} as const;

export const chapter4FounderClosingRawEs =
  "Toda vida extraordinaria se construye una decisión a la vez. Tus estándares aseguran que esas decisiones ya no se dejen al azar. Ya no estás esperando a que la vida ocurra. Te estás convirtiendo en alguien que la crea intencionalmente. Eso es lo que hacen los Architects.";
