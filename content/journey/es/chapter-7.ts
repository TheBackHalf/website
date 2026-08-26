/**
 * Capítulo VII — El Comienzo — Spanish localization of the approved manuscript.
 * Source of truth: content/journey/chapter-7-beginning.ts
 * Reflection question ids and ordering must stay identical to English so
 * saved answers remain locale-independent.
 */

import { type BeginningReflectionQuestion } from "@/content/journey/chapter-7-beginning";
import { personalizeSpanishWelcome } from "@/content/journey/es/manuscript";

export const CHAPTER_7_TITLE_ES = "Capítulo VII — El Comienzo" as const;
export const CHAPTER_7_SHORT_TITLE_ES = "El Comienzo" as const;

/** Founder Welcome — Spanish localization of the approved Blueprint welcome. */
export const chapter7FounderWelcomeRawEs =
  "Bienvenido/a de nuevo, Architect. Has recorrido un largo camino. Has despertado. Has mirado tu vida con honestidad. Has tomado decisiones valientes. Has establecido nuevos estándares. Has abrazado la identidad de un Architect. Y has elegido crear una vida que se extiende más allá de ti. Ahora llegas al capítulo final. O al menos... Lo que parece ser el capítulo final. Porque la verdad es que esto no es el final de tu Journey. Es el comienzo de tu Back Half. Todo lo que has experimentado hasta este punto te ha estado preparando para lo que sigue: Vivir estas decisiones. Cada día. No a la perfección. Sino con intención. Al completar este capítulo final, recuerda que la transformación no se mide por lo que has leído. Se mide por la vida que eliges crear después de cerrar esta guía. Estoy increíblemente orgullosa del compromiso que has hecho contigo. Y estoy emocionada por la vida que estás a punto de crear intencionalmente. Comencemos el Capítulo Siete.";

/** Core Teaching — Spanish localization of the approved Blueprint teaching. */
export const chapter7CoreTeachingRawEs =
  "Tu Journey no termina aquí—comienza aquí. La transformación no es un evento. Es una forma de ser. No hay una línea de meta en la que finalmente llegues. Ningún momento en el que el crecimiento esté completo. La vida seguirá presentando oportunidades para elegir la intención sobre la expectativa. De nuevo. Eso no es un fracaso. Esa es la invitación. Cada nueva temporada hace la misma pregunta: ¿Quién elegirás ser ahora? Muchas personas pasan la vida esperando un momento que lo cambie todo. Los Architects entienden algo diferente. La vida cambia porque ellos cambian. La transformación no se sostiene por momentos extraordinarios. Se sostiene por decisiones ordinarias tomadas de manera consistente. La magia que has estado buscando nunca estuvo escondida en otro lugar. Siempre ha estado esperando ser creada intencionalmente. Tu Back Half no es un destino al que algún día llegas. Es la vida que comienzas a crear cada día. Una decisión intencional. Una conversación valiente. Un acto significativo. Un día ordinario transformado por una intención extraordinaria. Así es como se construyen las vidas extraordinarias.";

export function personalizeChapter7WelcomeEs(
  raw: string,
  firstName?: string | null,
): string {
  void firstName;
  return personalizeSpanishWelcome(raw, null, "Bienvenido/a de nuevo");
}

export const BEGINNING_REFLECTION_TITLE_ES =
  "Preguntas de reflexión de Architect" as const;

export const beginningReflectionQuestionsEs: readonly BeginningReflectionQuestion[] =
  [
    {
      id: "q1",
      prompt: "¿Qué ha cambiado más dentro de ti durante este Journey?",
    },
    {
      id: "q2",
      prompt:
        "¿Qué lección quieres llevar a cada futura temporada de tu vida?",
    },
    {
      id: "q3",
      prompt: "¿Qué estándares seguirán guiando tus decisiones?",
    },
    {
      id: "q4",
      prompt: "¿Cómo protegerás la vida que estás creando intencionalmente?",
    },
    {
      id: "q5",
      prompt: "¿Qué sueño estás ahora listo/a para perseguir?",
    },
    {
      id: "q6",
      prompt:
        "Dentro de un año, ¿por qué esperas que tu yo futuro te agradezca haber comenzado hoy?",
    },
    {
      id: "q7",
      prompt: "Termina esta frase: Mi Back Half comienza con...",
    },
  ] as const;

export const BEGINNING_PRACTICE_ES = {
  title: "Práctica intencional",
  instructions: [
    "Escribe tu Back Half Declaration.",
    "Completa la siguiente declaración con tus propias palabras:",
  ],
  stem: "A partir de hoy, crearé intencionalmente una vida que...",
  remember: [
    "No escribas lo que suena inspirador. Escribe lo que es verdadero. Escribe la vida que estás eligiendo.",
    "Cuando hayas terminado, firma y fecha tu declaración.",
    "Colócala en un lugar donde la veas a menudo.",
    "Que se convierta en un recordatorio de que este Journey no terminó hoy. Comenzó hoy.",
  ],
} as const;

export const BEGINNING_WEEKLY_COMMITMENT_ES = {
  title: "Compromiso semanal",
  statement:
    "Hoy, y cada día, elijo vivir con intención y crear una vida de plenitud, propósito y posibilidad.",
} as const;

export const chapter7FounderClosingRawEs =
  "Architect, Ha sido un honor extraordinario caminar a tu lado. Espero que este Journey te haya recordado que tu historia todavía se está escribiendo. Que tus mayores capítulos aún pueden estar por delante. Que tu pasado no define tu futuro. Y que cada mañana ofrece otra oportunidad de crear intencionalmente una vida que amas. Gracias por confiarme esta parte de tu journey. Ahora ve. Vive con valentía. Ama profundamente. Sirve con generosidad. Permanece curioso/a. Protege tu paz. Elige el asombro. Y nunca olvides... Magical is Possible.";

export const chapter7FounderCongratulationsRawEs =
  "Bienvenido/a de nuevo, Architect. Hoy completaste algo que muy pocas personas eligen hacer. Elegiste crear tu vida intencionalmente. A lo largo de los siete capítulos, has despertado. Has mirado tu vida con honestidad. Has tomado decisiones valientes. Has establecido estándares. Has abrazado la identidad de un Architect. Y te has comprometido a crear una vida de plenitud, propósito y posibilidad. Eso merece ser celebrado. Pero también quiero recordarte algo importante. Esta no es la línea de meta. Es la línea de salida. The Back Half nunca se trató de completar una guía. Se trató de convertirte en la clase de persona que vive con intención cada día. Algunos días se sentirá sencillo. Otros no. En esos días, regresa a lo que has creado aquí. Regresa a tu Decision Statement. Regresa a tus Standards. Regresa a tu Identity. Regresa a tu Declaration. Recuerda a quién elegiste ser. Espero que este Journey te haya recordado algo que quizá estuvo enterrado por mucho tiempo. Tu vida todavía guarda una posibilidad extraordinaria. Tus mayores capítulos no están detrás de ti. Están esperando ser creados intencionalmente. Gracias por confiarme ser parte de tu Journey. Ha sido verdaderamente un honor. Felicidades, Architect. Ahora ve a crear una vida que recuerde a otros... Magical is Possible.";
