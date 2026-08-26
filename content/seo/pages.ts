/**
 * SEO titles and descriptions — sourced from approved repository copy only.
 */

import { contactPage, supportPage } from "@/content/contact-support";
import { legalDocumentList } from "@/content/legal/documents";
import { luminaPage } from "@/content/lumina";
import { journeyIntro } from "@/content/journey-stages";

/** Approved site-wide copy — app/layout.tsx, hero-section.tsx */
export const siteSeoDefaults = {
  title: "The Back Half — Magical is Possible",
  description:
    "The Back Half helps people transition from living by expectation to living with intention.",
  tagline: "Magical is Possible.",
} as const;

const journeyDescription = journeyIntro.heading.lines.join(" ");

export const publicPageSeo = {
  home: {
    title: siteSeoDefaults.title,
    description: siteSeoDefaults.description,
    path: "/",
  },
  journey: {
    title: "The Journey — The Back Half",
    description: journeyDescription,
    path: "/journey",
  },
  lumina: {
    title: `${luminaPage.title} — The Back Half`,
    description: `${luminaPage.title}. ${siteSeoDefaults.description}`,
    path: "/lumina",
  },
  contact: {
    title: `${contactPage.title} — The Back Half`,
    description: `${contactPage.title}. ${siteSeoDefaults.description}`,
    path: "/contact",
  },
  support: {
    title: `${supportPage.title} — The Back Half`,
    description: `${supportPage.title}. ${siteSeoDefaults.description}`,
    path: "/support",
  },
} as const;

export const indexablePaths: readonly string[] = [
  publicPageSeo.home.path,
  publicPageSeo.journey.path,
  publicPageSeo.lumina.path,
  publicPageSeo.contact.path,
  publicPageSeo.support.path,
  ...legalDocumentList.map((document) => `/legal/${document.slug}`),
];

export function getLegalPageSeo(slug: string) {
  const document = legalDocumentList.find((item) => item.slug === slug);
  if (!document) {
    return null;
  }

  return {
    title: `${document.title} — The Back Half`,
    description: `${document.title}. ${siteSeoDefaults.description}`,
    path: `/legal/${document.slug}`,
  };
}
