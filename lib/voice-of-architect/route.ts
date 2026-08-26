import type { VoiceOfArchitectClassification } from "@/lib/voice-of-architect/types";
import type { SupportPriority } from "@/lib/support/catalog";
import { launchRiskRequired } from "@/lib/voice-of-architect/classify";

export type DefectTriageHandoff = {
  required: boolean;
  owner: "imani";
  coordinator: "michelle";
  nextAction: string;
  supportAction: string;
  launchRiskRequired: boolean;
  waitForCadence: boolean;
};

export function routeToDefectTriage(
  classification: VoiceOfArchitectClassification,
  supportPriority?: SupportPriority,
  supportTicketId?: string,
): DefectTriageHandoff {
  const required = classification.route === "DEFECT_TRIAGE" || classification.criticalDefect;
  const ticketClause = supportTicketId
    ? ` Link existing Row 153 ticket ${supportTicketId}.`
    : " Open or link a Row 153 ticket if one does not already exist.";
  return {
    required,
    owner: "imani",
    coordinator: "michelle",
    nextAction: required
      ? `Michelle routes to Imani defect triage immediately.${ticketClause} Do not wait for the Voice-of-Architect theme cadence.`
      : "No defect-triage handoff. Keep on the Voice-of-Architect theme path.",
    supportAction: required
      ? "Preserve the Row 153 ticket as the Architect-facing case. VoA records the theme; it is not a second support tracker."
      : "No additional support escalation from Voice-of-Architect.",
    launchRiskRequired: launchRiskRequired(classification, supportPriority),
    waitForCadence: !required,
  };
}

export function testimonialPublishAllowed(
  _classification: VoiceOfArchitectClassification,
): boolean {
  return false;
}

export function addLaunchScope(
  _classification: VoiceOfArchitectClassification,
): boolean {
  return false;
}
