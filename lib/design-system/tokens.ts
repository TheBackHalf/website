/**
 * Design system token references for TypeScript consumers.
 * Source of truth for values is styles/design-tokens.css.
 */
export const designTokens = {
  contentWidth: {
    content: "var(--bh-width-content)",
    wide: "var(--bh-width-wide)",
    narrow: "var(--bh-width-narrow)",
    prose: "var(--bh-width-prose)",
  },
  sectionDensity: {
    default: "bh-section-default",
    compact: "bh-section-compact",
  },
  ctaVariant: {
    primary: "bh-cta",
    secondary: "bh-cta bh-cta-secondary",
    hero: "bh-cta bh-hero-cta",
  },
} as const;

export type CtaVariant = keyof typeof designTokens.ctaVariant;
export type SectionDensity = keyof typeof designTokens.sectionDensity;
