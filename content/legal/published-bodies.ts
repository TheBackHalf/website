/**
 * Published English Version 1.0 section bodies.
 * Imported only by legal page rendering and Row 32 audit — not by the
 * shared catalog used on registration, checkout, and footer clients.
 */

import {
  aiDisclosureV1,
  membershipAgreementV1,
  participantAgreementV1,
  privacyPolicyV1,
  termsOfUseV1,
  type LegalV1Candidate,
} from "@/content/legal/v1-candidates";
import type { LegalDocumentSection } from "@/content/legal/documents";

function legalSectionId(heading: string | undefined, index: number): string {
  const base = (heading ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `section-${index + 1}`;
}

function sectionsFromCandidate(
  candidate: LegalV1Candidate,
): readonly LegalDocumentSection[] {
  return candidate.sections.map((section, index) => ({
    id: legalSectionId(section.heading, index),
    heading: section.heading,
    paragraphs: section.paragraphs,
  }));
}

export const publishedLegalBodies: Record<string, readonly LegalDocumentSection[]> = {
  "privacy-policy": sectionsFromCandidate(privacyPolicyV1),
  "terms-of-use": sectionsFromCandidate(termsOfUseV1),
  "participant-agreement": sectionsFromCandidate(participantAgreementV1),
  "membership-agreement": sectionsFromCandidate(membershipAgreementV1),
  "ai-disclosure": sectionsFromCandidate(aiDisclosureV1),
};

export function getPublishedLegalSections(
  slug: string,
): readonly LegalDocumentSection[] | undefined {
  return publishedLegalBodies[slug];
}
