import {
  ANALYTICS_FRICTION_EVENTS,
  VOA_ROUTE_OWNERS,
  isImmediateRoute,
  type VoiceOfArchitectCategory,
  type VoiceOfArchitectRoute,
} from "@/lib/voice-of-architect/catalog";
import type { VoiceOfArchitectClassification } from "@/lib/voice-of-architect/types";
import type { SupportPriority, SupportTicketCategory } from "@/lib/support/catalog";

const TESTIMONIAL_PATTERN =
  /\b(testimonial|use my (quote|story|words|name)|permission to (share|use|publish)|you (can|may) (share|use|quote)|quote me|share my (story|experience)|as a review)\b/i;
const COMPLIMENT_PATTERN =
  /\b(love|loved|beautiful|thank you|thanks|grateful|magical is possible|this helped|inspiring|wonderful|compliment)\b/i;
const CONFUSION_PATTERN =
  /\b(confus(ed|ion)|don't understand|do not understand|unclear|how do i|where do i|lost|what does this mean|not sure how)\b/i;
const OPPORTUNITY_PATTERN =
  /\b(you should (add|build|offer)|feature request|would be (nice|better) if|wish (you|it) had|product idea|roadmap|mobile app)\b/i;
const FRICTION_PATTERN =
  /\b(stuck|can't find|cannot find|frustrating|friction|hard to|won't load|will not load|keeps failing|broken|bug|error|doesn't work|does not work)\b/i;
const DEFECT_PATTERN =
  /\b(outage|site is down|cannot checkout|payment (outage|failed|failing)|data breach|security|hacked|cannot (log|sign) ?in|cannot register|cannot save|lumina (error|down)|download failed|500|crash)\b/i;
const LEGAL_PATTERN =
  /\b(attorney|lawyer|lawsuit|litigation|subpoena|regulator|journalist|press|defamation)\b/i;
const SUPPORT_THEME_PATTERN =
  /\b(same (issue|problem) as|several architects|multiple (people|architects)|keep (getting|seeing) this)\b/i;
const FEEDBACK_PATTERN =
  /\b(feedback|suggestion|fyi|for what it's worth|wanted to share)\b/i;

export type ClassifyVoiceInput = {
  subject?: string;
  message?: string;
  supportCategory?: SupportTicketCategory;
  supportPriority?: SupportPriority;
  analyticsEventName?: string;
};

function haystackOf(input: ClassifyVoiceInput): string {
  return [input.subject, input.message, input.supportCategory, input.analyticsEventName]
    .filter(Boolean)
    .join("\n");
}

function uniqueCategories(
  primary: VoiceOfArchitectCategory,
  rest: VoiceOfArchitectCategory[],
): VoiceOfArchitectCategory[] {
  return [...new Set(rest.filter((item) => item !== primary))];
}

export function classifyVoiceOfArchitect(
  input: ClassifyVoiceInput,
): VoiceOfArchitectClassification {
  const haystack = haystackOf(input);
  const secondary: VoiceOfArchitectCategory[] = [];

  const analyticsFriction = Boolean(
    input.analyticsEventName &&
      (ANALYTICS_FRICTION_EVENTS as readonly string[]).includes(input.analyticsEventName),
  );
  const highPriorityDefect =
    input.supportPriority === "P1" ||
    input.supportPriority === "P2" ||
    input.supportCategory === "PRIVACY" ||
    input.supportCategory === "TECHNICAL";

  if (LEGAL_PATTERN.test(haystack)) {
    return finish({
      category: "FEEDBACK",
      secondary: uniqueCategories("FEEDBACK", ["FRICTION"]),
      route: "FOUNDER_ESCALATION",
      criticalDefect: DEFECT_PATTERN.test(haystack) || analyticsFriction,
      reason: "Legal, press, or reputational language. Michelle surfaces to Founder. No public reply invention.",
    });
  }

  if (TESTIMONIAL_PATTERN.test(haystack)) {
    if (COMPLIMENT_PATTERN.test(haystack)) secondary.push("COMPLIMENT");
    return finish({
      category: "TESTIMONIAL_PERMISSION",
      secondary,
      route: "TESTIMONIAL_PERMISSION_HOLD",
      criticalDefect: false,
      reason:
        "Testimonial or permission request. Hold for Row 33. Do not publish. Do not invent a quotation.",
    });
  }

  if (
    DEFECT_PATTERN.test(haystack) ||
    analyticsFriction ||
    input.supportPriority === "P1" ||
    input.supportCategory === "PRIVACY" ||
    (highPriorityDefect && FRICTION_PATTERN.test(haystack))
  ) {
    if (CONFUSION_PATTERN.test(haystack)) secondary.push("CONFUSION");
    if (FRICTION_PATTERN.test(haystack) || analyticsFriction) secondary.push("FRICTION");
    if (SUPPORT_THEME_PATTERN.test(haystack)) secondary.push("SUPPORT_THEME");
    return finish({
      category:
        FRICTION_PATTERN.test(haystack) || analyticsFriction || DEFECT_PATTERN.test(haystack)
          ? "FRICTION"
          : "SUPPORT_THEME",
      secondary,
      route: "DEFECT_TRIAGE",
      criticalDefect: true,
      reason:
        "Critical product, access, payment, privacy, or analytics-failure signal. Route immediately into Imani defect triage. Do not wait for the theme cadence.",
    });
  }

  if (OPPORTUNITY_PATTERN.test(haystack)) {
    if (FEEDBACK_PATTERN.test(haystack)) secondary.push("FEEDBACK");
    return finish({
      category: "PRODUCT_OPPORTUNITY",
      secondary,
      route: "DEFERRED_ENHANCEMENT",
      criticalDefect: false,
      reason:
        "Product idea or enhancement. Hold for the Row 6 Deferred-Enhancement Register. Do not add launch scope.",
    });
  }

  if (CONFUSION_PATTERN.test(haystack)) {
    if (FRICTION_PATTERN.test(haystack)) secondary.push("FRICTION");
    return finish({
      category: "CONFUSION",
      secondary,
      route: "EXPERIENCE_THEME",
      criticalDefect: false,
      reason: "Architect confusion. Nia owns experience interpretation. Michelle logs and routes. No curriculum rewrite from this capture.",
    });
  }

  if (COMPLIMENT_PATTERN.test(haystack) && !FRICTION_PATTERN.test(haystack)) {
    return finish({
      category: "COMPLIMENT",
      secondary,
      route: "COMPLIMENT_LEARNING",
      criticalDefect: false,
      reason:
        "Compliment. Nia may learn from it. It is not a testimonial and must not be published as one.",
    });
  }

  if (SUPPORT_THEME_PATTERN.test(haystack) || input.supportCategory) {
    const category: VoiceOfArchitectCategory = FRICTION_PATTERN.test(haystack)
      ? "FRICTION"
      : FEEDBACK_PATTERN.test(haystack)
        ? "FEEDBACK"
        : "SUPPORT_THEME";
    if (category !== "SUPPORT_THEME") secondary.push("SUPPORT_THEME");
    if (FRICTION_PATTERN.test(haystack) && category !== "FRICTION") secondary.push("FRICTION");
    return finish({
      category,
      secondary,
      route: "SUPPORT_OPERATION",
      criticalDefect: false,
      reason:
        "Support theme or ordinary request. Stay on the Row 153 ticket. Capture the theme here. Do not open a second informal tracker.",
    });
  }

  if (FRICTION_PATTERN.test(haystack)) {
    return finish({
      category: "FRICTION",
      secondary,
      route: "EXPERIENCE_THEME",
      criticalDefect: false,
      reason: "Friction without a critical-defect signal. Nia owns the experience theme. Re-route to defect triage if it repeats as a product failure.",
    });
  }

  return finish({
    category: "FEEDBACK",
    secondary,
    route: "EXPERIENCE_THEME",
    criticalDefect: false,
    reason: "General Architect feedback. Capture and theme. Do not treat as a testimonial.",
  });
}

function finish(partial: {
  category: VoiceOfArchitectCategory;
  secondary: VoiceOfArchitectCategory[];
  route: VoiceOfArchitectRoute;
  criticalDefect: boolean;
  reason: string;
}): VoiceOfArchitectClassification {
  const owners = VOA_ROUTE_OWNERS[partial.route];
  return {
    category: partial.category,
    secondary: uniqueCategories(partial.category, partial.secondary),
    route: partial.route,
    owner: owners.owner,
    coordinator: owners.coordinator,
    criticalDefect: partial.criticalDefect,
    immediate: isImmediateRoute(partial.route),
    reason: partial.reason,
  };
}

export function launchRiskRequired(
  classification: VoiceOfArchitectClassification,
  supportPriority?: SupportPriority,
): boolean {
  if (!classification.criticalDefect) return false;
  return (
    classification.route === "DEFECT_TRIAGE" &&
    (supportPriority === "P1" || classification.immediate)
  );
}
