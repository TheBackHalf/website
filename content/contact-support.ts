import {
  SUPPORT_MAILBOX,
  SUPPORT_TICKET_CATEGORIES,
  supportCategoryOptions,
  type SupportTicketCategory,
} from "@/lib/support/catalog";

/** Approved nav label — components/home/nav-links.ts */
export const contactPage = {
  title: "Contact",
  eyebrow: "Contact",
  introPending: false,
  methodsPending: false,
} as const;

export const supportPage = {
  title: "Support",
  eyebrow: "Support",
  architectSupportIntroPending: false,
  contactMethodsPending: false,
  responseExpectationsPending: false,
  escalationGuidancePending: false,
  crisisBoundariesPending: false,
} as const;

export const supportCategories = SUPPORT_TICKET_CATEGORIES;
export const supportCategoriesPending = false;

export const supportCategoryOptionList: Array<{
  value: SupportTicketCategory;
  label: string;
}> = supportCategoryOptions("en");

export const supportContactMethods = {
  pending: false,
  email: SUPPORT_MAILBOX,
  formHref: "/support",
} as const;

/** Approved CTA labels available in repository. */
export const contactCta = {
  label: "Contact",
  supportHref: "/support",
  supportLabel: "Support",
} as const;

/** Structural section slots — body copy pending in repository. */
export const supportSections = [
  { id: "architect-support", slot: "architectSupportIntroPending" },
  { id: "support-methods", slot: "contactMethodsPending" },
  { id: "response-expectations", slot: "responseExpectationsPending" },
  { id: "escalation", slot: "escalationGuidancePending" },
  { id: "crisis-boundaries", slot: "crisisBoundariesPending" },
] as const;

/** Footer utility link — Support page route required by Row 58. */
export const footerUtilityLinks = [{ href: "/support", label: "Support" }] as const;

export const supportFormCopy = {
  submitLabel: "Contact",
  pendingSubmissionMessage:
    "We received your request. Keep your ticket ID for follow-up.",
  pendingSubmissionDetail:
    "The Back Half Support typically responds within 3 days, with a goal of 72 hours or less.",
} as const;
