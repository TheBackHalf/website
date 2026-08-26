/**
 * Row 158 Founder review model.
 * Does not mark Complete. Does not record Founder acceptance.
 */

import { readFileSync } from "node:fs";

import {
  ANALYTICS_FRICTION_EVENTS,
  ROW_158_FINAL_STATUS,
  ROW_158_LOG_PATH,
  ROW_158_PROTOCOL_PATH,
  ROW_158_REVIEW_PATH,
  ROW_158_TITLE,
  VOA_CATEGORIES,
  VOA_CATEGORY_LABELS,
  VOA_LAUNCH_DAY,
  VOA_ROUTES,
  VOA_ROUTE_OWNERS,
  VOA_SOURCES,
  VOA_TIMEZONE,
} from "@/lib/voice-of-architect/catalog";
import { classifyVoiceOfArchitect } from "@/lib/voice-of-architect/classify";
import { routeToDefectTriage } from "@/lib/voice-of-architect/route";
import { emptyVoiceOfArchitectDatabase } from "@/lib/voice-of-architect/store";
import type { VoiceOfArchitectDatabase } from "@/lib/voice-of-architect/types";

export const ROW158_REVIEW_PATH = ROW_158_REVIEW_PATH;

export const ROW158_TEST_SCENARIOS = [
  {
    id: "checkout-outage",
    label: "TEST — checkout outage",
    subject: "Checkout is down",
    message: "The site cannot checkout. Payment outage for everyone.",
    supportPriority: "P1" as const,
  },
  {
    id: "confusion",
    label: "TEST — Journey confusion",
    subject: "How do I start",
    message: "I don't understand where to begin the Journey.",
  },
  {
    id: "compliment",
    label: "TEST — compliment",
    subject: "Thank you",
    message: "I love this. Magical is Possible.",
  },
  {
    id: "testimonial-permission",
    label: "TEST — permission request",
    subject: "You may use my quote",
    message: "You have permission to share my story as a testimonial.",
  },
  {
    id: "opportunity",
    label: "TEST — product idea",
    subject: "Feature request",
    message: "You should add a mobile app.",
  },
] as const;

function loadCommittedLog(): VoiceOfArchitectDatabase {
  try {
    const raw = readFileSync(ROW_158_LOG_PATH, "utf8");
    return JSON.parse(raw) as VoiceOfArchitectDatabase;
  } catch {
    return emptyVoiceOfArchitectDatabase();
  }
}

function protocolExists(): boolean {
  try {
    readFileSync(ROW_158_PROTOCOL_PATH, "utf8");
    return true;
  } catch {
    return false;
  }
}

function protocolText(): string {
  try {
    return readFileSync(ROW_158_PROTOCOL_PATH, "utf8");
  } catch {
    return "";
  }
}

export function getRow158ReviewModel() {
  const log = loadCommittedLog();
  const protocol = protocolText();
  const markedComplete = /Status:\s*Complete/i.test(protocol) && !/Not Complete/i.test(protocol);
  const founderAccepted =
    /Founder Acceptance:\s*YES/i.test(protocol) ||
    /Founder Acceptance recorded/i.test(protocol);
  const inventedTestimonial = log.entries.some(
    (entry) =>
      !entry.test &&
      entry.category === "TESTIMONIAL_PERMISSION" &&
      entry.testimonialPublishAllowed,
  );
  const scenarios = ROW158_TEST_SCENARIOS.map((scenario) => {
    const classification = classifyVoiceOfArchitect({
      subject: scenario.subject,
      message: scenario.message,
      supportPriority: "supportPriority" in scenario ? scenario.supportPriority : undefined,
    });
    const handoff = routeToDefectTriage(
      classification,
      "supportPriority" in scenario ? scenario.supportPriority : undefined,
    );
    return {
      id: scenario.id,
      label: scenario.label,
      category: classification.category,
      route: classification.route,
      owner: classification.owner,
      criticalDefect: classification.criticalDefect,
      immediate: classification.immediate,
      defectTriage: handoff.required ? "YES" : "NO",
      publishTestimonial: "NO",
    };
  });

  return {
    title: `Row ${ROW_158_TITLE.replace("Create ", "")}`,
    deliverable: ROW_158_TITLE,
    finalStatus: ROW_158_FINAL_STATUS,
    rowMarkedComplete: markedComplete,
    founderAcceptanceRecorded: founderAccepted ? "YES" : "NOT YET RECORDED",
    protocolPath: ROW_158_PROTOCOL_PATH,
    logPath: ROW_158_LOG_PATH,
    reviewPath: ROW_158_REVIEW_PATH,
    protocolPresent: protocolExists() ? "PASS" : "FAIL",
    launchDay: VOA_LAUNCH_DAY,
    timezone: VOA_TIMEZONE,
    categories: VOA_CATEGORIES.map((id) => ({
      id,
      label: VOA_CATEGORY_LABELS[id],
    })),
    sources: [...VOA_SOURCES],
    routes: VOA_ROUTES.map((route) => ({
      route,
      owner: VOA_ROUTE_OWNERS[route].owner,
      coordinator: VOA_ROUTE_OWNERS[route].coordinator,
    })),
    analyticsFrictionEvents: [...ANALYTICS_FRICTION_EVENTS],
    committedLiveEntries: log.entries.filter((entry) => !entry.test).length,
    committedTestEntries: log.entries.filter((entry) => entry.test).length,
    inventedTestimonial: inventedTestimonial ? "FAIL" : "PASS",
    newPublicForm: "NONE — reuse Row 153 support and Row 83 social",
    stripeDnsAuthChanged: "NO",
    niaBrandOwnershipTaken: "NO",
    scenarios,
    founderChecklist: [
      "Capture begins launch day (August 31, 2026)",
      "Seven Voice-of-Architect categories are present",
      "Critical issues route into Imani defect triage immediately",
      "Compliments are not published as testimonials",
      "Testimonial/permission requests hold for Row 33",
      "Product opportunities hold for Row 6 — no added launch scope",
      "No new public feedback form",
      "Founder acceptance not fabricated",
    ],
  };
}
