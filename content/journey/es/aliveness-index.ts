/**
 * Aliveness Index — Spanish localization of the approved assessment.
 * Source of truth: content/journey/aliveness-index.ts
 * Domain ids, statement ids, scale values, and max scores must stay identical
 * to English — scoring reads saved responses by id, not by language.
 * "Aliveness" stays untranslated to match content/i18n/dictionaries/es.ts.
 */

import type {
  AlivenessDomain,
  AlivenessScaleOption,
} from "@/content/journey/aliveness-index";

export const ALIVENESS_INDEX_TITLE_ES = "Aliveness Index" as const;

export const alivenessIndexIntroEs = [
  "El mundo nos ha enseñado a medir el éxito por lo que logramos.",
  "The Back Half mide algo diferente.",
  "Aliveness.",
  "El propósito de esta evaluación no es juzgar tu vida.",
  "Es ayudarte a verla con claridad.",
  "Responde cada afirmación con honestidad según tu vida de hoy, no según la vida que esperas tener.",
  "No hay respuestas correctas ni incorrectas.",
  "Solo respuestas honestas.",
] as const;

export const alivenessIndexScaleEs: readonly AlivenessScaleOption[] = [
  { value: 5, label: "Siempre cierto" },
  { value: 4, label: "Casi siempre cierto" },
  { value: 3, label: "A veces cierto" },
  { value: 2, label: "Rara vez cierto" },
  { value: 1, label: "No es cierto" },
] as const;

export const alivenessIndexDomainsEs: readonly AlivenessDomain[] = [
  {
    id: "purpose",
    name: "Propósito",
    scoreLabel: "Puntuación de Propósito",
    maxScore: 25,
    statements: [
      {
        id: "purpose-1",
        text: "Despierto con entusiasmo por la vida que estoy creando.",
      },
      { id: "purpose-2", text: "Comprendo mi propósito." },
      {
        id: "purpose-3",
        text: "Mi vida diaria está alineada con lo que más me importa.",
      },
      {
        id: "purpose-4",
        text: "Creo que mi futuro está lleno de posibilidades.",
      },
      {
        id: "purpose-5",
        text: "Siento que me estoy convirtiendo en quien fui creado/a para ser.",
      },
    ],
  },
  {
    id: "health",
    name: "Salud",
    scoreLabel: "Puntuación de Salud",
    maxScore: 25,
    statements: [
      {
        id: "health-1",
        text: "Cuido mi salud física de forma constante.",
      },
      {
        id: "health-2",
        text: "Mi energía sostiene la vida que quiero vivir.",
      },
      { id: "health-3", text: "Nutro mi cuerpo con intención." },
      {
        id: "health-4",
        text: "Mi bienestar mental y emocional son prioridades.",
      },
      {
        id: "health-5",
        text: "Dedico tiempo con regularidad al descanso y la recuperación.",
      },
    ],
  },
  {
    id: "relationships",
    name: "Relaciones",
    scoreLabel: "Puntuación de Relaciones",
    maxScore: 25,
    statements: [
      {
        id: "relationships-1",
        text: "Las personas más cercanas a mí impulsan mi crecimiento.",
      },
      {
        id: "relationships-2",
        text: "Me siento profundamente conectado/a con las personas que amo.",
      },
      {
        id: "relationships-3",
        text: "Mis relaciones me traen más paz que estrés.",
      },
      {
        id: "relationships-4",
        text: "Me comunico con honestidad y respeto.",
      },
      {
        id: "relationships-5",
        text: "Invierto intencionalmente en relaciones significativas.",
      },
    ],
  },
  {
    id: "career",
    name: "Carrera y Contribución",
    scoreLabel: "Puntuación de Carrera",
    maxScore: 25,
    statements: [
      { id: "career-1", text: "Mi trabajo se siente significativo." },
      { id: "career-2", text: "Uso mis fortalezas con regularidad." },
      {
        id: "career-3",
        text: "Creo que mi trabajo impacta positivamente a otras personas.",
      },
      { id: "career-4", text: "Me siento desafiado/a de maneras saludables." },
      {
        id: "career-5",
        text: "Estoy orgulloso/a del trabajo que aporto.",
      },
    ],
  },
  {
    id: "time",
    name: "Tiempo",
    scoreLabel: "Puntuación de Tiempo",
    maxScore: 25,
    statements: [
      {
        id: "time-1",
        text: "Tengo un control significativo sobre mi calendario.",
      },
      {
        id: "time-2",
        text: "Mi agenda refleja mis prioridades.",
      },
      { id: "time-3", text: "Protejo mi tiempo intencionalmente." },
      {
        id: "time-4",
        text: "Creo espacio con regularidad para pensar y reflexionar.",
      },
      {
        id: "time-5",
        text: "Dedico mi tiempo a lo que más importa.",
      },
    ],
  },
  {
    id: "wonder",
    name: "Asombro y Aventura",
    scoreLabel: "Puntuación de Asombro",
    maxScore: 25,
    statements: [
      {
        id: "wonder-1",
        text: "Experimento momentos de asombro y maravilla.",
      },
      {
        id: "wonder-2",
        text: "Pruebo nuevas experiencias intencionalmente.",
      },
      { id: "wonder-3", text: "Mi vida se siente llena de aventura." },
      {
        id: "wonder-4",
        text: "Sigo sintiendo curiosidad por el mundo.",
      },
      {
        id: "wonder-5",
        text: "Creo recuerdos en lugar de simplemente acumular días.",
      },
    ],
  },
  {
    id: "environment",
    name: "Entorno",
    scoreLabel: "Puntuación de Entorno",
    maxScore: 25,
    statements: [
      { id: "environment-1", text: "Mi entorno me inspira." },
      {
        id: "environment-2",
        text: "Mi hogar sostiene la paz y la claridad.",
      },
      {
        id: "environment-3",
        text: "Los lugares donde paso mi tiempo reflejan en quién me estoy convirtiendo.",
      },
      {
        id: "environment-4",
        text: "Creo belleza a mi alrededor de forma intencional.",
      },
      {
        id: "environment-5",
        text: "Mi entorno me da energía en lugar de agotarme.",
      },
    ],
  },
  {
    id: "growth",
    name: "Crecimiento",
    scoreLabel: "Puntuación de Crecimiento",
    maxScore: 25,
    statements: [
      {
        id: "growth-1",
        text: "Invierto intencionalmente en llegar a ser mejor.",
      },
      {
        id: "growth-2",
        text: "Aprendo algo nuevo con regularidad.",
      },
      {
        id: "growth-3",
        text: "Recibo con apertura la retroalimentación que me ayuda a crecer.",
      },
      { id: "growth-4", text: "Cuestiono las creencias limitantes." },
      {
        id: "growth-5",
        text: "Creo que la transformación siempre es posible.",
      },
    ],
  },
  {
    id: "stewardship",
    name: "Administración",
    scoreLabel: "Puntuación de Administración",
    maxScore: 25,
    statements: [
      {
        id: "stewardship-1",
        text: "Administro mis finanzas de manera responsable.",
      },
      { id: "stewardship-2", text: "Vivo con generosidad." },
      {
        id: "stewardship-3",
        text: "Uso mis dones intencionalmente para servir a otras personas.",
      },
      {
        id: "stewardship-4",
        text: "Tomo decisiones coherentes con mis valores.",
      },
      {
        id: "stewardship-5",
        text: "Estoy construyendo una vida que impactará positivamente a las generaciones futuras.",
      },
    ],
  },
] as const;

export const alivenessIndexReflectionPromptsEs = [
  "¿Qué categoría recibió tu puntuación más alta?",
  "¿Por qué crees que esta área se siente tan viva?",
  "¿Qué categoría recibió tu puntuación más baja?",
  "Si mejoraras intencionalmente solo esta área durante el próximo año, ¿cómo cambiaría tu vida?",
] as const;

export const alivenessIndexRememberEs = [
  "El propósito de esta evaluación no es decirte si tu vida es buena o mala.",
  "Es ayudarte a identificar dónde tu vida se siente más viva, y dónde tu Back Half te está invitando a crecer.",
  "Porque la consciencia siempre precede a la transformación.",
  "Y la transformación comienza con la intención.",
  "Magical is Possible.",
] as const;
