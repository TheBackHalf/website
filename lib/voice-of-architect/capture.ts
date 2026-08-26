import { redactSensitive } from "@/lib/support/sanitize";
import type { SupportTicket } from "@/lib/support/ticket-types";
import type { AnalyticsEventRecord } from "@/lib/analytics/types";
import {
  VOA_TIMEZONE,
  isAnalyticsFrictionEvent,
} from "@/lib/voice-of-architect/catalog";
import {
  classifyVoiceOfArchitect,
  launchRiskRequired,
} from "@/lib/voice-of-architect/classify";
import {
  addLaunchScope,
  testimonialPublishAllowed,
} from "@/lib/voice-of-architect/route";
import {
  createVoiceOfArchitectId,
  voiceOfArchitectFingerprint,
} from "@/lib/voice-of-architect/ids";
import type {
  VoiceOfArchitectCaptureInput,
  VoiceOfArchitectRecord,
} from "@/lib/voice-of-architect/types";

const SUMMARY_LIMIT = 280;

export function summarizeVoice(text: string): string {
  const cleaned = redactSensitive(text.replace(/\s+/g, " ").trim()).text;
  if (cleaned.length <= SUMMARY_LIMIT) return cleaned;
  return `${cleaned.slice(0, SUMMARY_LIMIT - 1).trimEnd()}…`;
}

export function buildVoiceOfArchitectRecord(
  input: VoiceOfArchitectCaptureInput,
): VoiceOfArchitectRecord {
  const created = input.createdAt ? new Date(input.createdAt) : new Date();
  const createdAt = Number.isNaN(created.getTime())
    ? new Date().toISOString()
    : created.toISOString();
  const raw = [input.subject, input.message, input.summary]
    .filter(Boolean)
    .join(" — ");
  const summary = summarizeVoice(raw || "Voice-of-Architect capture");
  const classification = classifyVoiceOfArchitect({
    subject: input.subject,
    message: input.message ?? input.summary,
    supportCategory: input.supportCategory,
    supportPriority: input.supportPriority,
    analyticsEventName: input.analyticsEventName,
  });
  return {
    id: createVoiceOfArchitectId(new Date(createdAt)),
    createdAt,
    updatedAt: createdAt,
    timezone: VOA_TIMEZONE,
    category: classification.category,
    secondary: classification.secondary,
    source: input.source,
    sourceRef: input.sourceRef,
    summary,
    route: classification.route,
    owner: classification.owner,
    coordinator: classification.coordinator,
    status: classification.immediate ? "IN_TRIAGE" : "NEW",
    criticalDefect: classification.criticalDefect,
    immediate: classification.immediate,
    supportTicketId: input.supportTicketId,
    supportCategory: input.supportCategory,
    supportPriority: input.supportPriority,
    analyticsEventName: input.analyticsEventName,
    launchRiskRequired: launchRiskRequired(
      classification,
      input.supportPriority,
    ),
    testimonialPublishAllowed: testimonialPublishAllowed(classification),
    addLaunchScope: addLaunchScope(classification),
    fingerprint: voiceOfArchitectFingerprint(classification.category, summary),
    test: input.test,
  };
}

export function captureFromSupportTicket(
  ticket: Pick<
    SupportTicket,
    "id" | "subject" | "message" | "category" | "priority" | "createdAt" | "source" | "test"
  >,
): VoiceOfArchitectRecord {
  return buildVoiceOfArchitectRecord({
    source: ticket.source === "social_row83" ? "social_row83" : "support_ticket",
    sourceRef: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    supportTicketId: ticket.id,
    supportCategory: ticket.category,
    supportPriority: ticket.priority,
    createdAt: ticket.createdAt,
    test: ticket.test,
  });
}

export function captureFromAnalyticsEvent(
  event: Pick<AnalyticsEventRecord, "id" | "name" | "createdAt" | "test">,
): VoiceOfArchitectRecord | null {
  if (!isAnalyticsFrictionEvent(event.name)) return null;
  return buildVoiceOfArchitectRecord({
    source: "analytics_friction",
    sourceRef: event.id,
    subject: event.name,
    message: `Row 150 friction event ${event.name}`,
    analyticsEventName: event.name,
    createdAt: event.createdAt,
    test: event.test,
  });
}

export function captureFromSocialText(input: {
  id: string;
  text: string;
  createdAt?: string;
  test?: boolean;
}): VoiceOfArchitectRecord {
  return buildVoiceOfArchitectRecord({
    source: "social_row83",
    sourceRef: input.id,
    message: input.text,
    createdAt: input.createdAt,
    test: input.test,
  });
}
