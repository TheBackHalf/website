/**
 * Capítulo II — El Espejo — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-2-mirror.ts
 * Step ids, dimension ids, target counts, and ordering must stay identical to
 * English so saved answers remain locale-independent.
 */

import type {
  MirrorDimensionId,
  MirrorReflectionQuestion,
} from "@/content/journey/chapter-2-mirror";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_2_TITLE_ES = "Capítulo Dos — El Espejo" as const;
export const CHAPTER_2_SHORT_TITLE_ES = "El Espejo" as const;
export const CHAPTER_2_TEACHING_SUBTITLE_ES = "Verte con Claridad" as const;
export const MIRROR_EXERCISE_TITLE_ES = "El Espejo de The Back Half" as const;

/** Founder Welcome — Spanish manuscript (full welcome block). */
export const chapter2FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, {First Name}. Si tu nombre no está disponible... Bienvenido/a de nuevo, Architect. El Capítulo Uno te invitó a despertar. El Capítulo Dos te invita a mirar tu vida con honestidad. Eso puede resultar incómodo. Porque la verdad no siempre nos dice lo que queremos escuchar. Nos dice lo que necesitamos escuchar. El propósito de este capítulo no es juzgar dónde estás. Es ayudarte a verlo con claridad. Solo cuando tenemos el valor de ver nuestra vida con honestidad podemos comenzar a crear intencionalmente algo diferente. A medida que avances por este capítulo, resiste la tentación de explicar, defender o minimizar. Simplemente observa. Con honestidad. Con compasión. Y con esperanza. Porque la claridad nunca es el destino. Es el comienzo de la transformación. Cuando estés listo/a... Comencemos el Capítulo Dos.";

/** Core Teaching — Spanish manuscript. */
export const chapter2CoreTeachingRawEs =
  "Bienvenido/a de nuevo. Uno de los mayores regalos que podemos darnos es la disposición a ver nuestra vida con honestidad y compasión. En este capítulo examinarás las creencias, los hábitos, las expectativas y las historias que han dado forma a tu vida. Parte de lo que descubras puede confirmar el camino que has tomado. Otros descubrimientos pueden invitarte al cambio. Ambos son valiosos. El objetivo no es la perfección. El objetivo es la consciencia. Porque una vez que vemos con claridad dónde estamos, podemos elegir intencionalmente hacia dónde vamos. Tómate tu tiempo. Tu futuro merece tu honestidad.";

export function personalizeChapter2WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  return personalizeSpanishWelcome(raw, firstName, "Bienvenido/a de nuevo");
}

export const MIRROR_STEP_ONE_ES = {
  id: "step1" as const,
  heading: "Paso Uno",
  title: "Alguien vive según la expectativa cuando...",
  instructions: [
    "Completa esta frase.",
    "Alguien vive según la expectativa cuando...",
    "No quiero 10 respuestas.",
    "Quiero 50.",
  ],
  examples: [
    "...su calendario le pertenece a todos los demás.",
    "...pospone la alegría.",
    "...confunde la comodidad con la paz.",
    "...silencia su curiosidad.",
    "...sigue diciendo: «Después de la jubilación...»",
    "...tolera entornos que lo disminuyen.",
    "...ha dejado de preguntarse qué quiere realmente.",
  ],
  notice: ["Fíjate...", "Estos son observables.", "No abstractos."],
  targetCount: 50,
  stem: "Alguien vive según la expectativa cuando...",
} as const;

export const MIRROR_STEP_TWO_ES = {
  id: "step2" as const,
  heading: "Paso Dos",
  title: "Alguien vive con intención cuando...",
  instructions: [
    "Ahora...",
    "Completa la frase opuesta.",
    "Alguien vive con intención cuando...",
    "De nuevo...",
    "50 respuestas.",
  ],
  examples: [
    "...su calendario refleja sus valores.",
    "...protege su paz.",
    "...crea antes de consumir.",
    "...sus relaciones lo nutren.",
    "...su trabajo expresa sus dones.",
    "...elige el asombro con regularidad.",
  ],
  targetCount: 50,
  stem: "Alguien vive con intención cuando...",
} as const;

export const MIRROR_STEP_THREE_ES = {
  id: "step3" as const,
  heading: "Paso Tres",
  title: "Expectativa · Intención · Decisión · Evidencia Diaria",
  instructions: [
    "Ahora construimos algo que creo que puede convertirse en uno de tus activos más valiosos.",
    "Crea cuatro columnas.",
    "Expectativa",
    "Intención",
    "Decisión",
    "Evidencia Diaria",
  ],
  examples: [
    "Trabajo por aprobación | Trabajo desde el propósito | Decidí definir el éxito por mí mismo/a | Mi calendario refleja mis prioridades",
    "Tolero relaciones que me agotan | Cultivo relaciones que dan vida | Decidí que la paz es innegociable | Invierto en relaciones que nutren el crecimiento mutuo",
  ],
  minCompleteRows: 1,
} as const;

export const MIRROR_DIMENSIONS_ES: readonly {
  id: MirrorDimensionId;
  label: string;
  prompt: string;
}[] = [
  {
    id: "identity",
    label: "Identidad",
    prompt: "¿En quién me estoy convirtiendo?",
  },
  { id: "time", label: "Tiempo", prompt: "¿Quién es dueño de mi calendario?" },
  {
    id: "work",
    label: "Trabajo",
    prompt: "¿Mi trabajo refleja mi vocación?",
  },
  {
    id: "relationships",
    label: "Relaciones",
    prompt: "¿Mis relaciones me expanden o me disminuyen?",
  },
  {
    id: "health",
    label: "Salud",
    prompt: "¿Mi cuerpo sostiene mi visión?",
  },
  {
    id: "wonder",
    label: "Asombro",
    prompt: "¿He dejado de experimentar asombro?",
  },
  {
    id: "stewardship",
    label: "Administración",
    prompt: "¿El dinero crea libertad o miedo?",
  },
  {
    id: "contribution",
    label: "Contribución",
    prompt: "¿Estoy creando valor más allá de mí mismo/a?",
  },
] as const;

export const MIRROR_STEP_FOUR_ES = {
  id: "step4" as const,
  heading: "Paso Cuatro",
  title: "Descubre dimensiones recurrentes",
  instructions: [
    "Ahora vamos a descubrir algo.",
    "No a escribirlo.",
    "A descubrirlo.",
    "Quiero que agrupes todos tus ejemplos.",
    "Predigo que descubrirás dimensiones recurrentes como:",
  ],
  minFilledDimensions: 1,
} as const;

export const MIRROR_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

/**
 * Architect Reflection Questions — approved English wording.
 * Approved Spanish manuscript for these Foundry Chapter Two prompts is not
 * present; do not invent a translation.
 */
export const mirrorReflectionQuestionsEs: readonly MirrorReflectionQuestion[] = [
  {
    id: "q1",
    prompt: "Which area of your life feels most alive today?",
  },
  {
    id: "q2",
    prompt: "Which area feels most neglected?",
  },
  {
    id: "q3",
    prompt:
      'Where are you settling for "good enough" instead of pursuing fullness?',
  },
  {
    id: "q4",
    prompt:
      "What have you normalized that no longer aligns with who you are becoming?",
  },
  {
    id: "q5",
    prompt:
      "If someone observed your daily life, what would they conclude matters most to you?",
  },
  {
    id: "q6",
    prompt:
      "Does your calendar reflect your priorities—or your obligations?",
  },
  {
    id: "q7",
    prompt: "What truth have you been avoiding?",
  },
] as const;

export const MIRROR_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "This week, I choose honesty over comfort.",
} as const;

export const chapter2FounderClosingRawEs =
  "The Mirror doesn't exist to discourage you. It exists to liberate you. When you stop pretending everything is fine, you create space for something extraordinary to begin. Today, you chose truth. And truth is always the beginning of transformation.";
