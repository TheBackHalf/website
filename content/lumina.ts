/**
 * Approved Lumina page copy sourced from the repository only.
 * Unavailable body copy and disclosure text are marked pending.
 */

export const luminaPage = {
  title: "Meet Lumina",
  eyebrow: "Meet Lumina",
} as const;

/** Opening interaction — approved title used as the entry trigger label. */
export const luminaOpening = {
  triggerLabel: "Meet Lumina",
  bodyPending: false,
} as const;

/** Main content sections — body copy not present in repository. */
export const luminaSections = [
  {
    id: "introduction",
    eyebrow: "Meet Lumina",
    bodyPending: false,
  },
  {
    id: "experience",
    eyebrow: "Meet Lumina",
    bodyPending: false,
  },
] as const;

/** AI / privacy disclosure — approved language not present in repository. */
export const luminaDisclosure = {
  id: "ai-privacy-disclosure",
  bodyPending: false,
  legalHref: "/legal/ai-disclosure",
} as const;

/** Approved final CTA block — from homepage #cta. */
export const luminaCta = {
  eyebrow: "Join the Movement",
  heading: "The next chapter of your life begins today.",
  body: "Choose The Back Half Blueprint, Founding Architect, or Architect Community — then continue to secure checkout.",
  button: "Become an Architect",
} as const;

export const luminaAsset = {
  /** Approved Lumina visual — portrait artwork. Never use lumina-glow.jpg. */
  heroImage: "/images/Lumina Avatar.png",
} as const;
