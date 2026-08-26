import { loadOperatingSystem } from "@/lib/fab-5/os";
import type {
  AuthorityCode,
  EscalationRecord,
  FounderGateRequest,
  OperatingAgentId,
} from "@/lib/fab-5/types";

export type IntentKind =
  | "complete_launch_row"
  | "routine_implementation"
  | "tech_risk_review"
  | "experience_review"
  | "security_decision"
  | "curriculum_rewrite"
  | "pricing_change"
  | "launch_date_change"
  | "scope_change"
  | "legal_interpretation"
  | "legal_signature"
  | "emergency_containment"
  | "source_conflict"
  | "claim_complete_without_evidence"
  | "experience_fail"
  | "production_readiness_fail"
  | "disagreement"
  | "mixed_tech_experience"
  | "launch_view_query"
  | "workstream_technology"
  | "workstream_learning_experience"
  | "workstream_operations"
  | "workstream_finance"
  | "workstream_legal_implementation"
  | "workstream_cross_functional"
  | "michelle_reprioritize"
  | "routine_tech_change"
  | "participant_facing_tech_change"
  | "approved_marketing_execution"
  | "new_material_public_claim"
  | "budgeted_spend"
  | "unbudgeted_spend"
  | "routine_production_deploy"
  | "irreversible_production"
  | "legal_hold"
  | "clear_nia_block"
  | "clear_imani_block"
  | "founder_override_block"
  | "sev1_incident"
  | "sev3_incident"
  | "go_no_go"
  | "authority_query"
  | "access_query"
  | "support_request"
  | "privacy_request"
  | "social_publish_execution"
  | "payment_reporting"
  | "production_inspect"
  | "secret_retrieval"
  | "production_admin_attempt"
  | "production_data_mutation"
  | "founder_financial_approval"
  | "unknown";

export type Classification = {
  intent: IntentKind;
  owners: OperatingAgentId[];
  authority: AuthorityCode;
  founderApproval: boolean;
  humanExpert: boolean;
  independent: boolean;
  parallel: boolean;
  restrictedAction: boolean;
  founderGate?: FounderGateRequest;
  expertEscalation?: EscalationRecord;
};

const FOUNDER_INTENTS: IntentKind[] = [
  "pricing_change",
  "launch_date_change",
  "scope_change",
  "new_material_public_claim",
  "unbudgeted_spend",
  "irreversible_production",
  "founder_override_block",
  "go_no_go",
  "legal_signature",
  "founder_financial_approval",
];
const EXPERT_INTENTS: IntentKind[] = ["legal_interpretation"];

export function parseRowNumber(command: string): number | undefined {
  const match = command.match(
    /(?:august\s+launch\s+)?row\s+(\d+)/i,
  );
  if (!match) return undefined;
  return Number.parseInt(match[1], 10);
}

export function classifyCommand(command: string): Classification {
  const text = command.toLowerCase();

  if (
    /(retrieve|show|print|echo|dump|reveal).*(secret|api[_ ]?key|\.env|password|recovery code|service.?role)/.test(text) ||
    /production secret/.test(text)
  ) {
    return {
      intent: "secret_retrieval",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/nia/.test(text) && /infrastructure admin|production admin|vercel admin|supabase admin/.test(text)) {
    return {
      intent: "production_admin_attempt",
      owners: ["nia"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/imani/.test(text) && /legal signature|sign the (participant|membership|privacy)/.test(text)) {
    return founderClass("legal_signature", "Legal signature");
  }
  if (/imani/.test(text) && /founder financial approval|approve (this|the) (refund|payout|wire)/.test(text)) {
    return founderClass("founder_financial_approval", "Founder financial approval");
  }
  if (/imani/.test(text) && /(issue|create|execute) (a |the )?(refund|payout)|refund (this|the) (payment|charge)/.test(text)) {
    return founderClass("founder_financial_approval", "Refund or payout execution");
  }
  if (/imani/.test(text) && /(create|issue|make) (a |the )?(live )?(stripe )?(charge|payment)|live charge/.test(text)) {
    return founderClass("founder_financial_approval", "Payment write / live charge");
  }
  if (/michelle/.test(text) && /unrestricted production-data mutation|mutate production data/.test(text)) {
    return {
      intent: "production_data_mutation",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/query_access|do i have system access|authority vs access|access registry/.test(text)) {
    return {
      intent: "access_query",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/respond to a support|support request|support@/.test(text) && !/configure support channels/.test(text)) {
    return {
      intent: "support_request",
      owners: ["michelle"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/privacy@|privacy (request|complaint)/.test(text)) {
    return {
      intent: "privacy_request",
      owners: ["michelle"],
      authority: "D",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/publish (an )?approved (instagram|linkedin|social)|instagram asset/.test(text) && !/new (material )?public claim/.test(text)) {
    return {
      intent: "social_publish_execution",
      owners: ["nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/payment report|review payment reporting|stripe reporting/.test(text) && !/(change|increase|decrease|set) (the )?pric/.test(text)) {
    return {
      intent: "payment_reporting",
      owners: ["michelle"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (
    /vercel/.test(text) &&
    /(add|change|alter|remove).*(domain)|unrestricted env|production env (secret|value)|vercel billing|vercel (team|account) (admin|owner)/.test(
      text,
    )
  ) {
    return founderClass(
      /domain/.test(text)
        ? "irreversible_production"
        : /billing|account|team/.test(text)
          ? "unbudgeted_spend"
          : "irreversible_production",
      "Founder-reserved Vercel account, domain, billing, or secret-env change",
    );
  }
  if (/inspect a production deployment|production deployment issue/.test(text)) {
    return {
      intent: "production_inspect",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: true,
    };
  }

  if (
    /pric(e|ing)/.test(text) &&
    /(change|increase|decrease|set|new)/.test(text) &&
    !/do not (change|increase|decrease|set)/.test(text)
  ) {
    return founderClass("pricing_change", "Change to pricing");
  }
  if (/launch[- ]date/.test(text) && /(change|set|move|delay|bring forward)/.test(text)) {
    return founderClass("launch_date_change", "Change to launch date");
  }
  if (
    /(product scope|launch-scope|materially change product|drop journey)/.test(text) &&
    /(change|reduce|drop|remove|narrow)/.test(text)
  ) {
    return founderClass("scope_change", "Change to approved product scope");
  }
  if (
    /legal (interpretation|conclusion|opinion)/.test(text) ||
    /interpret (the )?(law|privacy policy|terms)/.test(text) ||
    /provide a legal (interpretation|conclusion|opinion|judgment)/.test(text)
  ) {
    return expertClass("legal_interpretation");
  }
  if (/go\/no-go|go for launch|company is launch ready/.test(text)) {
    return founderClass("go_no_go", "Final consolidated Go/No-Go");
  }
  if (/unbudgeted|material spend for a new vendor/.test(text) && !/already-approved|budgeted (approved )?spend/.test(text)) {
    return founderClass("unbudgeted_spend", "Unbudgeted or material spend");
  }
  if (/irreversible|destroy (production )?data|data-destructive/.test(text) && !/do not (destroy|irreversible)/.test(text)) {
    return founderClass("irreversible_production", "Irreversible production action");
  }
  if (/new (material )?public claim/.test(text)) {
    return founderClass("new_material_public_claim", "New public claim with material brand or legal implications");
  }
  if (/founder override|release despite (an )?unresolved/.test(text)) {
    return founderClass("founder_override_block", "Release despite an unresolved launch blocker");
  }
  if (/legal hold/.test(text)) {
    return {
      intent: "legal_hold",
      owners: ["michelle", "imani"],
      authority: "F",
      founderApproval: false,
      humanExpert: true,
      independent: false,
      parallel: false,
      restrictedAction: true,
      expertEscalation: {
        to: "human_legal_expert",
        reason: "Legal-hold scope and duration require a qualified human legal expert. Agents preserve information pending review and must not conclude the law.",
        recommendation: "Preserve potentially relevant records. Escalate for legal-hold instructions. Do not fabricate a legal conclusion.",
        evidence: "Row 19 legalHoldProtocol",
      },
    };
  }
  if (/michelle/.test(text) && /clear/.test(text) && /(nia|triple e) block/.test(text)) {
    return {
      intent: "clear_nia_block",
      owners: ["michelle", "nia"],
      authority: "D",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/nia/.test(text) && /clear/.test(text) && /(imani|tech|risk) block/.test(text)) {
    return {
      intent: "clear_imani_block",
      owners: ["nia", "imani"],
      authority: "D",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/sev-?1|launch unavailable|payment system broadly failing/.test(text)) {
    return {
      intent: "sev1_incident",
      owners: ["imani", "michelle", "nia"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (/sev-?3|contained defect with workaround/.test(text)) {
    return {
      intent: "sev3_incident",
      owners: ["imani"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/budgeted (approved )?spend|already-approved (vendor|tool|spend)|within the \$5,000/.test(text)) {
    return {
      intent: "budgeted_spend",
      owners: ["imani", "michelle"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/reprioritize authorized|reorder authorized launch work/.test(text)) {
    return {
      intent: "michelle_reprioritize",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/participant-facing (tech|technical)|imani executes; nia verifies/.test(text)) {
    return {
      intent: "participant_facing_tech_change",
      owners: ["imani", "nia"],
      authority: "C",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (/routine (technical|tech) (change|decision)|reversible approved technical/.test(text)) {
    return {
      intent: "routine_tech_change",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/routine production deploy|approved, tested (production )?deploy/.test(text)) {
    return {
      intent: "routine_production_deploy",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/approved (marketing|claim|template)/.test(text) && !/new (material )?public claim/.test(text)) {
    return {
      intent: "approved_marketing_execution",
      owners: ["nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/can michelle approve|can imani execute|does nia need|who may block|who may clear|can this spend|incident severity|who must be notified|query_authority/.test(text)) {
    return {
      intent: "authority_query",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/emergency (security )?containment/.test(text) || /contain the incident/.test(text)) {
    return {
      intent: "emergency_containment",
      owners: ["imani"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/rewrite (approved )?curriculum/.test(text) || /invent curriculum/.test(text)) {
    return {
      intent: "curriculum_rewrite",
      owners: ["nia", "michelle"],
      authority: "E",
      founderApproval: true,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
      founderGate: gate(
        "Material change to approved Journey curriculum",
        "Requested curriculum rewrite is Founder-reserved.",
      ),
    };
  }
  if (
    /(security|infrastructure|production host|firewall|deploy credential)/.test(text) &&
    /(decide|decision|own|choose|change)/.test(text)
  ) {
    return {
      intent: "security_decision",
      owners: ["imani"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/source conflict|conflicting sources/.test(text)) {
    return {
      intent: "source_conflict",
      owners: ["michelle"],
      authority: "E",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: true,
    };
  }
  if (/complete without evidence|claim(?:s|ed)? complete/.test(text)) {
    return {
      intent: "claim_complete_without_evidence",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/triple e fail|experience fail|fails approved standard/.test(text)) {
    return {
      intent: "experience_fail",
      owners: ["nia"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/production-ready without|security control fail|readiness fail/.test(text)) {
    return {
      intent: "production_readiness_fail",
      owners: ["imani"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/disagree/.test(text)) {
    return {
      intent: "disagreement",
      owners: ["imani", "nia", "michelle"],
      authority: "D",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (
    /what should imani work on next|what should nia work on next|what is nia waiting on|what is michelle coordinating|what is blocking michelle|what (currently )?requires founder action|what requires a human expert|what can run in parallel|current critical path|unowned|how many launch deliverables remain|what launch work remains after row 18|which remaining deliverables are unowned|review the current launch queue/.test(
      text,
    )
  ) {
    return {
      intent: "launch_view_query",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/technology (row|workstream)/.test(text) && !/experience|learning/.test(text)) {
    return {
      intent: "workstream_technology",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/(learning|experience) (row|workstream)/.test(text)) {
    return {
      intent: "workstream_learning_experience",
      owners: ["nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/operations (row|workstream)/.test(text)) {
    return {
      intent: "workstream_operations",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/marketing (row|workstream)/.test(text)) {
    return {
      intent: "workstream_learning_experience",
      owners: ["nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/final readiness/.test(text)) {
    return {
      intent: "workstream_operations",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (/finance/.test(text) && /(row|workstream)/.test(text) && !/(change|increase|decrease|set) (the )?(price|pricing)/.test(text)) {
    return {
      intent: "workstream_finance",
      owners: ["michelle"],
      authority: "A",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/legal implementation/.test(text) && !/legal (interpretation|conclusion|opinion|judgment)/.test(text)) {
    return {
      intent: "workstream_legal_implementation",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/cross-functional/.test(text) || (/support@/.test(text) && /mailbox/.test(text))) {
    return {
      intent: "workstream_cross_functional",
      owners: ["michelle", "imani", "nia"],
      authority: "C",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (parseRowNumber(command) !== undefined || /complete august launch row/.test(text)) {
    return {
      intent: "complete_launch_row",
      owners: ["michelle", "imani", "nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (
    /(tech|technical|security|risk)/.test(text) &&
    /(experience|triple e|curriculum|brand)/.test(text)
  ) {
    return {
      intent: "mixed_tech_experience",
      owners: ["imani", "nia"],
      authority: "C",
      founderApproval: false,
      humanExpert: false,
      independent: false,
      parallel: true,
      restrictedAction: false,
    };
  }
  if (/triple e|experience review|brand fidelity|journey experience/.test(text)) {
    return {
      intent: "experience_review",
      owners: ["nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/technical|risk review|security review|production readiness/.test(text)) {
    return {
      intent: "tech_risk_review",
      owners: ["imani"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: false,
      restrictedAction: false,
    };
  }
  if (/routine implementation|bug fix|copy correction/.test(text)) {
    return {
      intent: "routine_implementation",
      owners: ["imani", "nia"],
      authority: "B",
      founderApproval: false,
      humanExpert: false,
      independent: true,
      parallel: true,
      restrictedAction: false,
    };
  }

  return {
    intent: "unknown",
    owners: ["michelle"],
    authority: "D",
    founderApproval: false,
    humanExpert: false,
    independent: false,
    parallel: false,
    restrictedAction: false,
  };
}

export async function isFounderReservedDecision(label: string): Promise<boolean> {
  const os = await loadOperatingSystem();
  const needle = label.toLowerCase();
  return os.founderReservedDecisions.some((item) =>
    needle.includes(item.toLowerCase()) || item.toLowerCase().includes(needle),
  );
}

export function founderGateRequest(input: FounderGateRequest): FounderGateRequest {
  return input;
}

function founderClass(intent: IntentKind, decision: string): Classification {
  return {
    intent,
    owners: ["michelle"],
    authority: "E",
    founderApproval: true,
    humanExpert: false,
    independent: false,
    parallel: false,
    restrictedAction: true,
    founderGate: gate(decision, `${decision} is Founder-reserved under Row 15.`),
  };
}

function expertClass(intent: IntentKind): Classification {
  return {
    intent,
    owners: ["imani", "michelle"],
    authority: "F",
    founderApproval: false,
    humanExpert: true,
    independent: false,
    parallel: false,
    restrictedAction: true,
    expertEscalation: {
      to: "human_legal_expert",
      reason: "Actual legal judgment is required. Imani may identify risk but must not issue a legal conclusion.",
      recommendation: "Escalate to a qualified human legal expert. Do not treat Founder as lawyer.",
      evidence: "Row 15 human-expert path F.",
    },
  };
}

function gate(decisionRequired: string, why: string): FounderGateRequest {
  return {
    decisionRequired,
    why,
    recommendation: "Do not execute the restricted action. Queue FOUNDER ACTION REQUIRED. Continue unrelated authorized work.",
    alternatives: [
      "Keep current approved value",
      "Prepare a Founder decision packet without executing",
    ],
    impact: "Restricted action is stopped. Unrelated in-authority work may continue.",
    risk: "Executing without Founder approval would exceed agent authority.",
    reversibility: "Stop is reversible. Executing the reserved decision may not be.",
    evidence: "Row 15 founderReservedDecisions + decisionRights.founderApproval",
  };
}

export const FOUNDER_INTENTS_LIST = FOUNDER_INTENTS;
export const EXPERT_INTENTS_LIST = EXPERT_INTENTS;
