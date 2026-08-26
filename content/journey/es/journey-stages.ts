/**
 * Spanish localization of the approved Journey stage copy.
 * Source of truth: content/journey-stages.ts
 * Stage ids, order, pending flags, and accent line indexes must stay identical
 * to English.
 */

import type { JourneyStage } from "@/content/journey-stages";

/** Life area labels for Stage 5 — exact order required. */
export const architectLifeAreasEs = [
  "Salud",
  "Relaciones",
  "Propósito",
  "Carrera",
  "Aventura",
  "Contribución",
] as const;

export const journeyStagesEs: readonly JourneyStage[] = [
  {
    id: "awakening",
    order: 1,
    name: "El Despertar",
    eyebrow: "El Despertar",
    heading: {
      lines: [
        "La vida no se transforma con el tiempo.",
        "Se transforma con intención.",
      ],
      accentLineIndex: 1,
    },
  },
  {
    id: "mirror",
    order: 2,
    name: "El Espejo",
    eyebrow: "El Espejo",
    heading: {
      lines: [
        "Mira tu vida con honestidad y claridad.",
        "Antes de poder crear intencionalmente un nuevo futuro,",
        "debes comprender con valentía dónde estás hoy.",
      ],
      accentLineIndex: 0,
    },
  },
  {
    id: "decision",
    order: 3,
    name: "La Decisión",
    eyebrow: "La Decisión",
    heading: {
      lines: [
        "Toda vida extraordinaria se construye una decisión intencional a la vez.",
      ],
    },
  },
  {
    id: "standards",
    order: 4,
    name: "Los Estándares",
    eyebrow: "Estándares",
    heading: {
      lines: ["Estándares"],
    },
  },
  {
    id: "architect",
    order: 5,
    name: "Convertirse en Architect",
    eyebrow: "Convertirse en Architect",
    lifeAreas: architectLifeAreasEs,
  },
  {
    id: "expansion",
    order: 6,
    name: "Expansión",
    eyebrow: "Expansión",
  },
  {
    id: "beginning",
    order: 7,
    name: "El Comienzo",
    eyebrow: "El Comienzo",
  },
] as const;

export const journeyIntroEs = {
  eyebrow: "Nuestra Creencia",
  heading: {
    lines: [
      "Cada persona merece la oportunidad",
      "de crear intencionalmente",
      "una vida mágica.",
    ],
    accentLineIndex: 2,
  },
} as const;

export const journeyCtaEs = {
  eyebrow: "Únete al Movimiento",
  heading: "El próximo capítulo de tu vida comienza hoy.",
  body: "Sé la primera persona en recibir novedades, inspiración y acceso exclusivo a The Back Half.",
  button: "Conviértete en Architect",
} as const;
