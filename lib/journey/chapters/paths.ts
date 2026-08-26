import type { Locale } from "@/lib/i18n/config";

import type { Chapter1SectionId } from "@/content/journey/chapter-1-awakening";

import { isChapter1SectionId } from "@/content/journey/chapter-1-awakening";

import type { Chapter2SectionId } from "@/content/journey/chapter-2-mirror";

import { isChapter2SectionId } from "@/content/journey/chapter-2-mirror";

import type { Chapter3SectionId } from "@/content/journey/chapter-3-decision";

import { isChapter3SectionId } from "@/content/journey/chapter-3-decision";

import type { Chapter4SectionId } from "@/content/journey/chapter-4-standards";

import { isChapter4SectionId } from "@/content/journey/chapter-4-standards";

import type { Chapter5SectionId } from "@/content/journey/chapter-5-architect";

import { isChapter5SectionId } from "@/content/journey/chapter-5-architect";

import type { Chapter6SectionId } from "@/content/journey/chapter-6-expansion";

import { isChapter6SectionId } from "@/content/journey/chapter-6-expansion";

import type { Chapter7SectionId } from "@/content/journey/chapter-7-beginning";

import { isChapter7SectionId } from "@/content/journey/chapter-7-beginning";



export function getChapter1Path(

  locale: Locale,

  section?: Chapter1SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-1"

      : "/architect/journey/chapter-1";

  return `${base}/${section ?? "welcome"}`;

}



export function getChapter1LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=awakening`;

}



export function parseChapter1SectionParam(

  value: string | undefined,

): Chapter1SectionId {

  if (value && isChapter1SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter2Path(

  locale: Locale,

  section?: Chapter2SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-2"

      : "/architect/journey/chapter-2";

  return `${base}/${section ?? "welcome"}`;

}



export function getChapter2LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=mirror`;

}



export function parseChapter2SectionParam(

  value: string | undefined,

): Chapter2SectionId {

  if (value && isChapter2SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter3Path(

  locale: Locale,

  section?: Chapter3SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-3"

      : "/architect/journey/chapter-3";

  // Always include the section segment so every Chapter III nav control has a
  // distinct, clickable destination (including Founder Welcome).
  return `${base}/${section ?? "welcome"}`;

}



export function getChapter3LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=decision`;

}



export function parseChapter3SectionParam(

  value: string | undefined,

): Chapter3SectionId {

  if (value && isChapter3SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter4Path(

  locale: Locale,

  section?: Chapter4SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-4"

      : "/architect/journey/chapter-4";

  // Always include the section segment so every Chapter IV nav control has a
  // distinct, clickable destination (including Founder Welcome).
  return `${base}/${section ?? "welcome"}`;

}



export function getChapter4LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=standards`;

}



export function parseChapter4SectionParam(

  value: string | undefined,

): Chapter4SectionId {

  if (value && isChapter4SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter5Path(

  locale: Locale,

  section?: Chapter5SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-5"

      : "/architect/journey/chapter-5";

  // Always include the section segment so every Chapter V nav control has a
  // distinct, clickable destination (including Founder Welcome).
  return `${base}/${section ?? "welcome"}`;

}



export function getChapter5LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=architect`;

}



export function parseChapter5SectionParam(

  value: string | undefined,

): Chapter5SectionId {

  if (value && isChapter5SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter6Path(

  locale: Locale,

  section?: Chapter6SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-6"

      : "/architect/journey/chapter-6";

  // Always include the section segment so every Chapter VI nav control has a
  // distinct, clickable destination (including Founder Welcome).
  return `${base}/${section ?? "welcome"}`;

}



export function getChapter6LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=expansion`;

}



export function parseChapter6SectionParam(

  value: string | undefined,

): Chapter6SectionId {

  if (value && isChapter6SectionId(value)) {

    return value;

  }

  return "welcome";

}



export function getChapter7Path(

  locale: Locale,

  section?: Chapter7SectionId,

): string {

  const base =

    locale === "es"

      ? "/es/architect/journey/chapter-7"

      : "/architect/journey/chapter-7";

  return `${base}/${section ?? "welcome"}`;

}



export function getChapter7LuminaDiscussionPath(locale: Locale): string {

  const lumina =

    locale === "es" ? "/es/architect/lumina" : "/architect/lumina";

  return `${lumina}?topic=beginning`;

}



export function parseChapter7SectionParam(

  value: string | undefined,

): Chapter7SectionId {

  if (value && isChapter7SectionId(value)) {

    return value;

  }

  return "welcome";

}


