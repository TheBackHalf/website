/**
 * Row 158 — Voice-of-Architect capture catalog.
 * Operations method. Does not create a public feedback form.
 * Does not mark Row 158 Complete or record Founder acceptance.
 */

import type { SupportOwner } from "@/lib/support/catalog";

export const ROW_158_ID = "158";
export const ROW_158_TITLE = "Create Voice-of-Architect Capture System";
export const ROW_158_PROTOCOL_PATH =
  "ops/fab-5/ROW-158-VOICE-OF-ARCHITECT-CAPTURE.md";
export const ROW_158_LOG_PATH = "ops/fab-5/voice-of-architect-log.json";
export const ROW_158_REVIEW_PATH = "/_internal/row158-voice-of-architect-review";
export const ROW_158_FINAL_STATUS =
  "IMPLEMENTED — FOUNDER ACCEPTANCE REVIEW. Not Complete. Founder acceptance not recorded.";
export const VOA_LAUNCH_DAY = "2026-08-31";
export const VOA_TIMEZONE = "America/New_York";
export const VOA_ID_PREFIX = "BH-VOA";

export const VOA_CATEGORIES = [
  "FEEDBACK",
  "CONFUSION",
  "COMPLIMENT",
  "SUPPORT_THEME",
  "FRICTION",
  "TESTIMONIAL_PERMISSION",
  "PRODUCT_OPPORTUNITY",
] as const;
export type VoiceOfArchitectCategory = (typeof VOA_CATEGORIES)[number];

export const VOA_SOURCES = [
  "support_ticket",
  "social_row83",
  "analytics_friction",
  "ops_observation",
  "founder_observation",
] as const;
export type VoiceOfArchitectSource = (typeof VOA_SOURCES)[number];

export const VOA_ROUTES = [
  "DEFECT_TRIAGE",
  "SUPPORT_OPERATION",
  "EXPERIENCE_THEME",
  "TESTIMONIAL_PERMISSION_HOLD",
  "DEFERRED_ENHANCEMENT",
  "COMPLIMENT_LEARNING",
  "FOUNDER_ESCALATION",
] as const;
export type VoiceOfArchitectRoute = (typeof VOA_ROUTES)[number];

export const VOA_STATUSES = [
  "NEW",
  "ROUTED",
  "IN_TRIAGE",
  "HOLD",
  "THEMED",
  "CLOSED",
] as const;
export type VoiceOfArchitectStatus = (typeof VOA_STATUSES)[number];

export const VOA_OWNERS = ["michelle", "imani", "nia", "founder"] as const;
export type VoiceOfArchitectOwner = (typeof VOA_OWNERS)[number];

export const VOA_CATEGORY_LABELS: Record<VoiceOfArchitectCategory, string> = {
  FEEDBACK: "Feedback",
  CONFUSION: "Confusion",
  COMPLIMENT: "Compliment",
  SUPPORT_THEME: "Support theme",
  FRICTION: "Friction",
  TESTIMONIAL_PERMISSION: "Testimonial / permission request",
  PRODUCT_OPPORTUNITY: "Product opportunity",
};

export const ANALYTICS_FRICTION_EVENTS = [
  "registration_failed",
  "auth_failed",
  "checkout_failed",
  "checkout.payment_failed",
  "journey_save_failed",
  "lumina_error",
  "download_failed",
  "membership_payment_failed",
] as const;
export type AnalyticsFrictionEvent = (typeof ANALYTICS_FRICTION_EVENTS)[number];

export const VOA_ROUTE_OWNERS: Record<
  VoiceOfArchitectRoute,
  { owner: VoiceOfArchitectOwner; coordinator: VoiceOfArchitectOwner }
> = {
  DEFECT_TRIAGE: { owner: "imani", coordinator: "michelle" },
  SUPPORT_OPERATION: { owner: "nia", coordinator: "michelle" },
  EXPERIENCE_THEME: { owner: "nia", coordinator: "michelle" },
  TESTIMONIAL_PERMISSION_HOLD: { owner: "nia", coordinator: "michelle" },
  DEFERRED_ENHANCEMENT: { owner: "nia", coordinator: "michelle" },
  COMPLIMENT_LEARNING: { owner: "nia", coordinator: "michelle" },
  FOUNDER_ESCALATION: { owner: "founder", coordinator: "michelle" },
};

export const IMMEDIATE_ROUTES: ReadonlySet<VoiceOfArchitectRoute> = new Set([
  "DEFECT_TRIAGE",
  "FOUNDER_ESCALATION",
]);

export const DEFAULT_VOA_OWNER: SupportOwner = "michelle";

export function isAnalyticsFrictionEvent(name: string): name is AnalyticsFrictionEvent {
  return (ANALYTICS_FRICTION_EVENTS as readonly string[]).includes(name);
}

export function isImmediateRoute(route: VoiceOfArchitectRoute): boolean {
  return IMMEDIATE_ROUTES.has(route);
}
