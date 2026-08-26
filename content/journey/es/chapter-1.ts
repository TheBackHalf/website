/**
 * Capítulo I — El Despertar — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-1-awakening.ts
 * Structure, question ids, target counts, and exercise order must stay identical
 * to English. Only language changes.
 */

import type {
  AlivenessProjectQuestion,
  AwakeningReflectionQuestion,
} from "@/content/journey/chapter-1-awakening";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_1_TITLE_ES = "Capítulo Uno — El Despertar" as const;
export const CHAPTER_1_SHORT_TITLE_ES = "El Despertar" as const;
export const ALIVENESS_PROJECT_TITLE_ES = "El Proyecto de Aliveness" as const;
export const AWAKENING_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

/** Founder Welcome — Spanish manuscript. */
export const chapter1FounderWelcomeRawEs =
  "Bienvenido/a, {First Name}. Si tu nombre no está disponible... Bienvenido/a, Architect. Antes de comenzar, quiero hacerte una pregunta sencilla. ¿Cuándo fue la última vez que te sentiste verdaderamente vivo/a? No exitoso/a. No ocupado/a. No productivo/a. Vivo/a. Esa pregunta está en el centro de este primer capítulo, porque todo Back Half comienza con un despertar. Para muchas personas, la vida cambia porque algo les sucede. Para otras, la vida cambia porque deciden que ya no pueden seguir ignorando lo que en el fondo ya saben. Este capítulo te invita a detenerte el tiempo suficiente para escuchar lo que tu vida quizá ya está intentando decirte. A medida que avances por estas páginas, no te preocupes por encontrar respuestas perfectas. Simplemente dite la verdad. Porque la consciencia es donde comienza la transformación. Cuando estés listo/a... Comencemos el Capítulo Uno.";

/** Core Teaching — Spanish manuscript. */
export const chapter1CoreTeachingRawEs =
  "Bienvenido/a al Capítulo Uno — El Despertar. Toda transformación comienza con un despertar. Para muchas personas, ese despertar no llega porque la vida se esté derrumbando. Llega porque algo profundo en su interior pregunta en voz baja: «¿Esto es todo lo que hay?» Quizá has logrado muchas de las cosas que alguna vez creíste que traerían una plenitud duradera y, aun así, una parte de ti sigue anhelando algo más. No más éxito, sino más significado. Más alegría. Más aliveness. El propósito de este capítulo no es juzgar tu pasado. Es examinar con honestidad tu presente. Mientras completas estos ejercicios, te animo a ser valiente. La reflexión honesta crea la base de una transformación intencional. Recuerda: la consciencia no es el destino. Es el comienzo. Comencemos.";

export function personalizeChapter1WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  return personalizeSpanishWelcome(raw, firstName, "Bienvenido/a");
}

export const alivenessProjectQuestionsEs: readonly AlivenessProjectQuestion[] = [
  {
    id: "q1",
    heading: "Pregunta Uno",
    title: "¿Qué es el ALIVENESS?",
    instructions: [
      "No una definición.",
      "Una descripción.",
      "Completa esta frase.",
      "Sé que estoy vivo/a cuando...",
      "Escribe cincuenta respuestas.",
      "No cinco.",
      "Cincuenta.",
      "Sigue hasta que te sorprendas a ti mismo/a.",
    ],
    examples: [
      "Sé que estoy vivo/a cuando...",
      "...pierdo la noción del tiempo.",
      "...me río a carcajadas.",
      "...estoy creando.",
      "...estoy aprendiendo.",
      "...me quedo asombrado/a.",
      "...estoy viajando.",
      "...sirvo profundamente.",
      "...estoy completamente presente.",
    ],
    targetCount: 50,
    stem: "Sé que estoy vivo/a cuando...",
  },
  {
    id: "q2",
    heading: "Pregunta Dos",
    title: "¿Qué mata el aliveness?",
    instructions: [
      "No filosóficamente.",
      "Prácticamente.",
      "De nuevo...",
      "Escribe cincuenta.",
    ],
    examples: [
      "Complacer a los demás.",
      "El miedo.",
      "La obligación.",
      "La comparación.",
      "El piloto automático.",
      "Conformarse.",
      "El perfeccionismo.",
      "El ruido.",
    ],
    targetCount: 50,
  },
  {
    id: "q3",
    heading: "Pregunta Tres",
    title: "¿Qué restaura el aliveness?",
    instructions: [
      "No la felicidad.",
      "No la productividad.",
      "El aliveness.",
    ],
    examples: [],
    targetCount: 1,
  },
  {
    id: "q4",
    heading: "Pregunta Cuatro",
    title: "¿Qué decisiones crean aliveness?",
    instructions: [
      "Esta es enorme.",
      "Porque recuerda...",
      "Las personas se transforman a través de decisiones.",
      "Enumera cada decisión que cambió tu vida.",
      "No acontecimientos.",
      "Decisiones.",
      "Escribe cincuenta.",
    ],
    examples: ["«Decidí...»"],
    targetCount: 50,
    stem: "Decidí...",
  },
  {
    id: "q5",
    heading: "Pregunta Cinco",
    title: "¿Qué requiere una vida verdaderamente viva?",
    instructions: [
      "No la vida soñada.",
      "La vida viva.",
      "¿Qué estándares se vuelven innegociables?",
      "¿Límites?",
      "¿Relaciones?",
      "¿Paz?",
      "¿Salud?",
      "¿Asombro?",
      "¿Aprendizaje?",
      "¿Contribución?",
      "¿Libertad?",
    ],
    examples: [],
    targetCount: 1,
  },
] as const;

/**
 * Architect Reflection Questions — approved English wording.
 * Approved Spanish manuscript for these Foundry Chapter One prompts is not
 * present; do not invent a translation.
 */
export const awakeningReflectionQuestionsEs: readonly AwakeningReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt:
        "Where in your life have you been living by expectation instead of intention?",
    },
    {
      id: "q2",
      prompt: "When do you feel most alive?",
    },
    {
      id: "q3",
      prompt: "What part of yourself has been waiting to be expressed?",
    },
    {
      id: "q4",
      prompt:
        "If nothing changed over the next five years, how would you honestly feel?",
    },
    {
      id: "q5",
      prompt: "What possibility are you afraid to admit you want?",
    },
  ] as const;

export const AWAKENING_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "This week, I choose awareness over autopilot.",
} as const;

export const chapter1FounderClosingRawEs =
  "The Awakening doesn't require certainty. It only requires honesty. If you're willing to tell yourself the truth about where you are today, you've already taken the first step toward creating a different tomorrow. Your Back Half has begun.";
