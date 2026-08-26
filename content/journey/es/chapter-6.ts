/**
 * Capítulo VI — Expansión — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-6-expansion.ts
 * Reflection question ids, practice ids, and ordering must stay identical to
 * English so saved answers remain locale-independent.
 */

import {
  type ExpansionPracticeEntry,
  type ExpansionReflectionQuestion,
} from "@/content/journey/chapter-6-expansion";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_6_TITLE_ES = "Capítulo VI — Expansión" as const;
export const CHAPTER_6_SHORT_TITLE_ES = "Expansión" as const;

/** Founder Welcome — Spanish localization of the approved Blueprint welcome. */
export const chapter6FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, Architect. Uno de los mayores conceptos erróneos sobre la transformación es que se trata solo de nosotros. No es así. Cuando una persona comienza a vivir con intención, el impacto se extiende naturalmente más allá de su propia vida. Familia. Amigos. Comunidades. Incluso personas a las que nunca han conocido. Ese es el poder de una vida vivida intencionalmente. Este capítulo trata sobre la expansión. No sobre construir una vida más grande. Sino sobre construir una vida que marque una diferencia más grande. Mientras reflexionas en las páginas que siguen, considera esta pregunta: ¿Quién se beneficiará porque elegiste crear intencionalmente tu Back Half? Tu respuesta puede convertirse en una de las partes más significativas de tu Journey. Cuando estés listo/a... Comencemos el Capítulo Seis.";

/** Core Teaching — Spanish localization of the approved Blueprint teaching. */
export const chapter6CoreTeachingRawEs =
  "El crecimiento no termina cuando alcanzamos una meta. Se expande. A medida que tu vida cambia, tu visión debe expandirse con ella. Este capítulo te invita a soñar de nuevo. A imaginar posibilidades que quizás hayas olvidado. A perseguir experiencias que te hagan sentir plenamente vivo/a. Nunca confundas la comodidad con la plenitud. Continúa expandiéndote. Todavía hay tanto por delante.";

export function personalizeChapter6WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  void firstName;
  return personalizeSpanishWelcome(raw, null, "Bienvenido/a de nuevo");
}

export const EXPANSION_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

export const expansionReflectionQuestionsEs: readonly ExpansionReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt:
        "¿Cómo ha influido ya tu transformación en las personas que te rodean?",
    },
    {
      id: "q2",
      prompt:
        "¿Quién en tu vida necesita a alguien que viva como ejemplo de lo que es posible?",
    },
    {
      id: "q3",
      prompt:
        "¿Cómo quieres que se sientan las personas después de pasar tiempo contigo?",
    },
    {
      id: "q4",
      prompt:
        "¿Qué dones, talentos o experiencias estás en una posición única para compartir?",
    },
    {
      id: "q5",
      prompt:
        "¿Cómo puede tu vida diaria convertirse en una expresión de generosidad?",
    },
    {
      id: "q6",
      prompt:
        "¿Qué legado estás creando intencionalmente—no algún día, sino hoy?",
    },
    {
      id: "q7",
      prompt: "¿Hacia dónde está siendo llamada tu vida a expandirse?",
    },
  ] as const;

export const EXPANSION_PRACTICE_ES = {
  title: "Práctica intencional",
  instructions: [
    "Completa tu Expansion Plan.",
    "Elige una acción intencional en cada una de estas tres áreas:",
  ],
  remember:
    "Recuerda, la expansión no comienza con actos extraordinarios. Comienza con actos intencionales.",
  entries: [
    {
      id: "yourself",
      label: "Para ti",
      prompt: "¿Cómo continuarás invirtiendo en tu propio crecimiento?",
    },
    {
      id: "someoneElse",
      label: "Para alguien más",
      prompt:
        "¿A quién incentivarás, apoyarás o servirás intencionalmente esta semana?",
    },
    {
      id: "world",
      label: "Para el mundo que te rodea",
      prompt:
        "¿Cuál es una contribución significativa—grande o pequeña—que puedes hacer y que refleje a la persona en la que te estás convirtiendo?",
    },
  ] as const satisfies readonly ExpansionPracticeEntry[],
} as const;

export const EXPANSION_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement: "Esta semana, elijo contribución sobre complacencia.",
} as const;

export const chapter6FounderClosingRawEs =
  "Una vida extraordinaria nunca se mide solo por lo que logra. Se mide por lo que despierta en los demás. A medida que continúas convirtiéndote más plenamente en ti mismo/a, descubrirás algo notable. Tu valentía da permiso a otros para ser valientes. Tu intención inspira intención. Tu aliveness recuerda a las personas que magical is possible. Ese es el poder silencioso de un Architect. Y así es como la transformación se expande.";
