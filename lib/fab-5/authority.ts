import { loadOperatingSystem } from "@/lib/fab-5/os";
import type { OperatingAgentId } from "@/lib/fab-5/types";

export type AuthorityLevel = 1 | 2 | 3 | 4 | 5;

export const AUTHORITY_LEVEL_NAMES: Record<AuthorityLevel, string> = {
  1: "INDEPENDENT EXECUTIVE AUTHORITY",
  2: "CROSS-FUNCTIONAL AUTHORITY",
  3: "FOUNDER-RESERVED AUTHORITY",
  4: "QUALIFIED HUMAN-EXPERT AUTHORITY",
  5: "EMERGENCY AUTHORITY",
};

export type IncidentSeverity = "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4";

export type ProductionChangeClass = "A" | "B" | "C" | "D" | "E";

export type SpendClass = "A" | "B" | "C" | "D";

export type AuthorityRuling = {
  question: string;
  level: AuthorityLevel;
  levelName: string;
  mappedCode: "A" | "B" | "C" | "D" | "E" | "F";
  primaryOwner: OperatingAgentId | "kimberly" | "human_legal_expert";
  supporting: string[];
  canMichelleApprove: boolean;
  canImaniExecute: boolean;
  niaVerificationRequired: boolean;
  founderApprovalRequired: boolean;
  humanExpertRequired: boolean;
  canProceedFounderUnavailable: boolean;
  mayBlockRelease: string[];
  mayClearThisBlock: string[];
  spendMayProceed: boolean | "founder";
  productionClass?: ProductionChangeClass;
  spendClass?: SpendClass;
  incidentSeverity?: IncidentSeverity;
  notify: string[];
  answer: string;
};

const LEVEL_TO_CODE: Record<AuthorityLevel, AuthorityRuling["mappedCode"]> = {
  1: "A",
  2: "C",
  3: "E",
  4: "F",
  5: "A",
};

function ruling(
  partial: Omit<AuthorityRuling, "levelName" | "mappedCode"> & { mappedCode?: AuthorityRuling["mappedCode"] },
): AuthorityRuling {
  return {
    ...partial,
    levelName: AUTHORITY_LEVEL_NAMES[partial.level],
    mappedCode: partial.mappedCode ?? LEVEL_TO_CODE[partial.level],
  };
}

export async function queryAuthority(question: string): Promise<AuthorityRuling> {
  await loadOperatingSystem();
  const text = question.toLowerCase();

  if (/unowned|how many launch|critical path|what should imani|what should nia|michelle coordinating/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: [],
      canMichelleApprove: true,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle", "imani", "nia"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      notify: [],
      answer: "Launch-view question. Use query_launch_view. Authority engine does not replace the consolidated launch view.",
    });
  }

  if (
    /pric(e|ing)/.test(text) &&
    /(change|increase|decrease|set|new)/.test(text) &&
    !/do not (change|increase|decrease|set)/.test(text)
  ) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["Founder"],
      spendMayProceed: "founder",
      notify: ["kimberly"],
      answer:
        "LEVEL 3 FOUNDER-RESERVED. Pricing changes require Founder approval. Queue FOUNDER ACTION REQUIRED / DECISION REQUIRED. Restricted action pauses. Unrelated authorized work may continue. Do not expand agent authority while Founder is unavailable.",
    });
  }

  if (/go\/no-go|go for launch|company is launch ready|final consolidated go/.test(text)) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["michelle", "imani", "nia"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["Founder explicit override with recorded accepted risk"],
      spendMayProceed: "founder",
      notify: ["kimberly"],
      answer:
        "LEVEL 3 FOUNDER-RESERVED. No Fab 5 agent may independently declare THE COMPANY IS LAUNCH READY or GO FOR LAUNCH. Individual executives may give bounded functional Go/No-Go recommendations. Final consolidated Go/No-Go remains Kimberly/Founder-reserved (August Launch Row 217). Queue DECISION REQUIRED. Unrelated authorized work may continue.",
    });
  }

  if (
    /clear (a |the )?(valid )?(nia|triple e) block/.test(text) ||
    (/michelle/.test(text) && /clear/.test(text) && /nia|triple e/.test(text))
  ) {
    return ruling({
      question,
      level: 2,
      mappedCode: "D",
      primaryOwner: "nia",
      supporting: ["michelle", "imani"],
      canMichelleApprove: false,
      canImaniExecute: true,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["nia"],
      mayClearThisBlock: ["nia after independent retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "REFUSED. Michelle may coordinate resolution and Imani may correct technical defects. Michelle may NOT administratively clear Nia's valid unresolved Triple E block. Only Nia independently verifies participant-facing resolution. Founder may override only through an explicit Founder-reserved decision with the unresolved risk recorded.",
    });
  }

  if (
    /clear (a |the )?(valid )?(imani|tech|risk) block/.test(text) ||
    (/nia/.test(text) && /clear/.test(text) && /imani|technical|risk/.test(text))
  ) {
    return ruling({
      question,
      level: 2,
      mappedCode: "D",
      primaryOwner: "imani",
      supporting: ["michelle", "nia"],
      canMichelleApprove: false,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani"],
      mayClearThisBlock: ["imani after independent retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "REFUSED. Nia cannot clear an Imani technical/risk block. Michelle coordinates. Imani must verify technical resolution. Founder override requires explicit acceptance of the unresolved risk.",
    });
  }

  if (/founder override|release despite|override (the )?(block|blocker)/.test(text)) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["Founder explicit decision with recorded accepted risk"],
      spendMayProceed: "founder",
      notify: ["kimberly"],
      answer:
        "LEVEL 3 FOUNDER-RESERVED. Release despite an unresolved valid blocker requires an explicit Founder decision and recorded accepted risk. Agents must not clear the block. Queue DECISION REQUIRED.",
    });
  }

  if (
    /legal hold/.test(text) ||
    (/preserve/.test(text) && /legal/.test(text) && /record|evidence|data/.test(text))
  ) {
    return ruling({
      question,
      level: 4,
      primaryOwner: "michelle",
      supporting: ["imani", "nia", "human_legal_expert"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: true,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["human legal expert scope + Founder signature if required"],
      spendMayProceed: true,
      notify: ["michelle", "human_legal_expert"],
      answer:
        "LEVEL 4 HUMAN-EXPERT + preservation. Michelle coordinates preservation and escalation. Imani preserves relevant technical records and prevents routine deletion where authorized. Nia preserves participant-facing/content evidence. Qualified human legal expert determines authoritative legal-hold scope/duration. Kimberly signs/accepts only if Founder authority is required. Agents may preserve potentially relevant information pending review. Agents may NOT independently conclude the legal scope or duration of a hold.",
    });
  }

  if (
    /legal (interpretation|conclusion|opinion|judgment)/.test(text) ||
    /interpret (the )?(law|privacy policy|terms)/.test(text) ||
    /is (this|our) .* lawful/.test(text)
  ) {
    return ruling({
      question,
      level: 4,
      primaryOwner: "human_legal_expert",
      supporting: ["imani", "michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: true,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "michelle"],
      mayClearThisBlock: ["human legal expert"],
      spendMayProceed: true,
      notify: ["human_legal_expert"],
      answer:
        "LEVEL 4 QUALIFIED HUMAN-EXPERT. Imani identifies risk. Michelle escalates. No agent issues a legal conclusion. HUMAN LEGAL REVIEW REQUIRED.",
    });
  }

  if (/legal implementation|implement already-approved legal|approved legal (text|requirement)/.test(text)) {
    return ruling({
      question,
      level: 2,
      mappedCode: "B",
      primaryOwner: "imani",
      supporting: ["michelle", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "LEVEL 2 CROSS-FUNCTIONAL (implementation). Imani may implement already-approved legal requirements. Nia verifies participant-facing presentation. Michelle coordinates. Kimberly signs only if Founder signature is required. No new legal conclusions.",
    });
  }

  if (
    /unbudgeted|material spend|new vendor (purchase|not in)/.test(text) &&
    !/already-approved|budgeted/.test(text)
  ) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["Founder"],
      spendMayProceed: "founder",
      spendClass: "D",
      notify: ["kimberly"],
      answer:
        "LEVEL 3 / SPEND CLASS D. New, unbudgeted, or material spend requires Founder approval. Do not invent a dollar threshold. Use approved-budget vs unbudgeted. The accepted launch budget cap is $5,000. Queue DECISION REQUIRED. Unrelated authorized work may continue.",
    });
  }

  if (
    /budgeted (approved )?spend|already-approved (vendor|tool|spend)|within (the )?(approved )?(plan|budget|\$5,000)/.test(
      text,
    )
  ) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "imani",
      supporting: ["michelle"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["michelle"],
      spendMayProceed: true,
      spendClass: "C",
      notify: ["michelle"],
      answer:
        "SPEND CLASS C / LEVEL 1 within approved plan. Already-approved budgeted spend may be executed by the domain executive. Michelle tracks. $0 operational/technical decisions and already-approved vendor/tool configuration do not require Founder. Do not exceed the accepted $5,000 launch budget cap.",
    });
  }

  if (
    /irreversible|destroy (production )?data|data-destructive|material-scope change/.test(text) &&
    !/do not (destroy|irreversible)/.test(text)
  ) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["imani", "michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["imani", "michelle"],
      mayClearThisBlock: ["Founder"],
      spendMayProceed: "founder",
      productionClass: "D",
      notify: ["kimberly"],
      answer:
        "PRODUCTION CLASS D / LEVEL 3. Irreversible, data-destructive, or material-scope production change requires Founder approval. Imani must not execute. Queue DECISION REQUIRED.",
    });
  }

  if (
    /emergency|contain(ment)?|sev-?1|critical (incident|outage)|material security|payment system broadly/.test(text) &&
    !/sev-?3/.test(text)
  ) {
    const sev1 = /sev-?1|launch unavailable|payment system broadly|widespread account|material data-loss|severe participant/.test(
      text,
    );
    return ruling({
      question,
      level: 5,
      primaryOwner: "imani",
      supporting: ["michelle", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: sev1,
      founderApprovalRequired: false,
      humanExpertRequired: sev1,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "michelle", "nia"],
      mayClearThisBlock: ["imani after containment evidence; Michelle coordinates"],
      spendMayProceed: true,
      productionClass: "E",
      incidentSeverity: sev1 ? "SEV-1" : "SEV-1",
      notify: sev1 ? ["imani", "michelle", "nia", "kimberly"] : ["imani", "michelle", "kimberly"],
      answer: sev1
        ? "SEV-1 CRITICAL / LEVEL 5 EMERGENCY. Imani acts first: disable affected functionality, rollback, isolate, stop unsafe processing, revoke/rotate compromised access where authorized. Michelle activates incident coordination. Nia involved for participant impact. Founder notified immediately. Human expert where required. Then evidence, correction, retest, audit close. No self-certified resolution. Emergency does not permit strategy change, legal admissions, destroying evidence, or concealing incidents."
        : "LEVEL 5 EMERGENCY CONTAINMENT. Imani may act immediately without prior Founder approval to prevent material harm, then notify Michelle/Founder and create an audit trail. Does not expand other authority.",
    });
  }

  if (/sev-?3|moderate (incident|defect)|contained defect with workaround/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "imani",
      supporting: ["michelle"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: [],
      mayClearThisBlock: ["domain executive"],
      spendMayProceed: true,
      incidentSeverity: "SEV-3",
      notify: ["michelle"],
      answer:
        "SEV-3 MODERATE. Contained defect with workaround; no material launch threat. Domain executive handles autonomously. Michelle tracks. No routine Founder interruption.",
    });
  }

  if (/new (material )?public claim|materially new public/.test(text)) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["nia", "michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: true,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["nia", "michelle"],
      mayClearThisBlock: ["Founder"],
      spendMayProceed: "founder",
      notify: ["kimberly"],
      answer:
        "LEVEL 3 FOUNDER-RESERVED. New public claims with material brand or legal implications require Founder approval. Nia must not publish. Queue DECISION REQUIRED. Human legal review if legally sensitive.",
    });
  }

  if (
    /participant-facing (tech|technical|change)|imani executes; nia verifies|tech \+ experience/.test(text)
  ) {
    return ruling({
      question,
      level: 2,
      primaryOwner: "imani",
      supporting: ["nia", "michelle"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["nia", "imani"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      productionClass: "B",
      notify: ["michelle"],
      answer:
        "LEVEL 2 CROSS-FUNCTIONAL. Imani executes technical implementation. Nia independently verifies participant-facing acceptance. Founder approval is NOT required. Michelle coordinates. Self-report is not acceptance.",
    });
  }

  if (
    /routine (technical|tech) (change|decision)|reversible approved technical|class a — routine/.test(text)
  ) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "imani",
      supporting: ["michelle"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani"],
      mayClearThisBlock: ["imani after retest"],
      spendMayProceed: true,
      productionClass: "A",
      notify: [],
      answer:
        "PRODUCTION CLASS A / LEVEL 1. Imani may execute a reversible approved technical decision after required testing/evidence. Founder is not required. Michelle is not a bottleneck for routine in-authority tech work.",
    });
  }

  if (/routine production deploy|production deployment of an approved/.test(text)) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "imani",
      supporting: ["michelle", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: /participant/.test(text),
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      productionClass: "A",
      notify: ["michelle"],
      answer:
        "PRODUCTION CLASS A / LEVEL 1. Imani may execute an approved, tested production deploy. Founder approval is not required for every deployment. Nia verifies if participant-facing. Michelle verifies evidence. Do not deploy despite an unresolved block.",
    });
  }

  if (/proceed while founder is unavailable/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: ["imani", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      notify: [],
      answer:
        "YES, continue. If the action is authorized, reversible, and not Founder-reserved: proceed. Cross-functional delegated work continues under Michelle. Founder-reserved actions pause as FOUNDER ACTION REQUIRED. Emergency containment proceeds, then notify. Do not stop the entire Fab 5. Do not expand authority.",
    });
  }

  if (/approved (marketing|claim|template)|nia executes approved/.test(text)) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "nia",
      supporting: ["michelle"],
      canMichelleApprove: true,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["nia"],
      mayClearThisBlock: ["nia after retest"],
      spendMayProceed: true,
      notify: [],
      answer:
        "LEVEL 1. Nia may execute approved marketing claims/templates without Founder approval. New material public claims remain Founder-reserved. Do not invent claims.",
    });
  }

  if (/reprioritize|reorder (authorized )?launch work|routine operations/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: [],
      canMichelleApprove: true,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["michelle for evidence/dependency blocks only"],
      spendMayProceed: true,
      notify: [],
      answer:
        "LEVEL 1 INDEPENDENT. YES, continue without Founder approval. Michelle may reprioritize authorized launch work, assign work, sequence dependencies, and coordinate. She may not change launch date, pricing, scope, or locked Founder decisions.",
    });
  }

  if (/can michelle approve/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: [],
      canMichelleApprove: true,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle", "imani", "nia"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      notify: [],
      answer:
        "Michelle may approve independent operations: orchestration, assignment, sequencing, evidence enforcement, support/readiness coordination, incident coordination, and Founder/human-expert queues. Michelle may not approve Founder-reserved, legal-conclusion, or valid unresolved Imani/Nia release blocks.",
    });
  }

  if (/can imani execute this production change/.test(text)) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "imani",
      supporting: ["michelle"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani"],
      mayClearThisBlock: ["imani after retest"],
      spendMayProceed: true,
      productionClass: "A",
      notify: ["michelle"],
      answer:
        "If the change is Class A routine reversible approved: yes, Imani may execute after required evidence. Class B needs Nia verification. Class D irreversible/data-destructive requires Founder. Class E emergency: Imani acts first then notifies.",
    });
  }

  if (/does nia need imani verification/.test(text)) {
    return ruling({
      question,
      level: 2,
      primaryOwner: "nia",
      supporting: ["imani"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["nia", "imani"],
      mayClearThisBlock: ["issuing executive after retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "When Nia's execution implicates technical behavior (auth, payments, Journey runtime, Lumina), Imani verifies technical integrity. Pure approved-copy/experience corrections do not require Imani. Executor is never the sole acceptor.",
    });
  }

  if (/require founder approval/.test(text)) {
    return ruling({
      question,
      level: 3,
      primaryOwner: "kimberly",
      supporting: ["michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: true,
      humanExpertRequired: false,
      canProceedFounderUnavailable: false,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["Founder"],
      spendMayProceed: "founder",
      notify: ["kimberly"],
      answer:
        "Founder approval is required only for reserved matters: strategy, brand promise, material scope, pricing, launch date, unbudgeted material spend, contracts/signatures, legal acceptance, material privacy/compliance decisions, new material public claims, production data destruction, irreversible production outside emergency authority, locked-decision changes, material Journey/Blueprint changes, release despite unresolved blocker, and final consolidated Go/No-Go.",
    });
  }

  if (/human legal review/.test(text)) {
    return ruling({
      question,
      level: 4,
      primaryOwner: "human_legal_expert",
      supporting: ["imani", "michelle"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: true,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani"],
      mayClearThisBlock: ["human legal expert"],
      spendMayProceed: true,
      notify: ["human_legal_expert"],
      answer:
        "Human legal review is required for legal judgment, novel privacy/compliance interpretation, and legal-hold scope. Implementation of already-approved legal text is Imani's Level 2 work and does not automatically require fresh human review.",
    });
  }

  if (/triple e block|nia (issues|issue) a (triple e|experience) block/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "nia",
      supporting: ["michelle", "imani"],
      canMichelleApprove: false,
      canImaniExecute: true,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["nia"],
      mayClearThisBlock: ["nia after independent retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "RELEASE BLOCKED. Nia retains Triple E release-block authority. Structured block required. Michelle coordinates. Imani may correct technical defects. Nia independently verifies resolution. Michelle may not administratively clear it.",
    });
  }

  if (/imani (tech|technical|risk) block|technology\/risk release-block/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "imani",
      supporting: ["michelle", "nia"],
      canMichelleApprove: false,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani"],
      mayClearThisBlock: ["imani after independent retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "RELEASE BLOCKED. Imani retains technical/risk block authority for security, privacy implementation, data integrity, authentication, payment integrity, production stability, recovery, critical infrastructure, or material technical failure. Nia cannot clear it. Michelle coordinates.",
    });
  }

  if (/who may block release/.test(text)) {
    return ruling({
      question,
      level: 2,
      primaryOwner: "michelle",
      supporting: ["imani", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["issuing executive after independent retest"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "Imani may block for technical/risk/security/privacy-implementation/production-readiness failure. Nia may block for material Triple E/experience failure. Michelle may block completion for insufficient evidence, unresolved dependency, failed acceptance, or source conflict. Structured block required: BLOCKING EXECUTIVE, ROW/RELEASE, ISSUE, EVIDENCE, SEVERITY, FAILED STANDARD, REQUIRED CORRECTION, OWNER, RETEST REQUIREMENT, BLOCK STATUS.",
    });
  }

  if (/who may clear this block/.test(text)) {
    return ruling({
      question,
      level: 2,
      primaryOwner: "michelle",
      supporting: ["imani", "nia"],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: true,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia", "michelle"],
      mayClearThisBlock: ["issuing executive after independent retest; Founder only with explicit recorded risk"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "The issuing executive clears their own block after independent retest/evidence. Michelle cannot administratively clear a valid Nia or Imani release block. Nia cannot clear Imani's tech/risk block. Imani cannot clear Nia's Triple E block. Founder override requires explicit decision + recorded accepted risk.",
    });
  }

  if (/can this spend proceed/.test(text)) {
    return ruling({
      question,
      level: 1,
      mappedCode: "B",
      primaryOwner: "michelle",
      supporting: ["imani"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["michelle"],
      spendMayProceed: true,
      spendClass: "A",
      notify: ["michelle"],
      answer:
        "Class A $0 operational/technical: delegated. Class B already-approved vendor/tool in plan: domain executive executes, Michelle tracks. Class C budgeted explicitly approved: domain executive within authorization. Class D new/unbudgeted/material: Founder. No invented dollar thresholds besides the accepted $5,000 launch budget cap.",
    });
  }

  if (/what incident severity/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: ["imani", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia"],
      mayClearThisBlock: ["domain executive after evidence"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "SEV-1 critical: launch unavailable, material security/privacy, broad payment failure, widespread access failure, material data-loss risk, severe participant-impacting production failure. SEV-2 high: material degradation of important functionality or a meaningful cohort. SEV-3 moderate: contained defect with workaround. SEV-4 low: minor/cosmetic/non-critical.",
    });
  }

  if (/who must be notified/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: ["imani", "nia"],
      canMichelleApprove: true,
      canImaniExecute: true,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["imani", "nia"],
      mayClearThisBlock: ["issuing executive"],
      spendMayProceed: true,
      notify: ["michelle"],
      answer:
        "SEV-1: Imani + Michelle immediately; Nia if participant impact; Founder immediately; human expert if legal/privacy judgment. SEV-2: Michelle coordinates; Founder if material launch/reputational/financial risk or reserved decision. SEV-3/4: no routine Founder interruption. Emergency containment always notifies Michelle and Founder after action.",
    });
  }

  if (/self-certif|complete without evidence/.test(text)) {
    return ruling({
      question,
      level: 1,
      primaryOwner: "michelle",
      supporting: [],
      canMichelleApprove: false,
      canImaniExecute: false,
      niaVerificationRequired: false,
      founderApprovalRequired: false,
      humanExpertRequired: false,
      canProceedFounderUnavailable: true,
      mayBlockRelease: ["michelle"],
      mayClearThisBlock: ["michelle after independent evidence"],
      spendMayProceed: true,
      notify: [],
      answer:
        "REJECTED. Execution authority is not acceptance authority. File existence ≠ functionality. Code existence ≠ production readiness. Agent statement ≠ acceptance. Independent or cross-functional verification required.",
    });
  }

  return ruling({
    question,
    level: 1,
    mappedCode: "D",
    primaryOwner: "michelle",
    supporting: [],
    canMichelleApprove: true,
    canImaniExecute: false,
    niaVerificationRequired: false,
    founderApprovalRequired: false,
    humanExpertRequired: false,
    canProceedFounderUnavailable: true,
    mayBlockRelease: ["michelle", "imani", "nia"],
    mayClearThisBlock: ["issuing executive after retest"],
    spendMayProceed: true,
    notify: ["michelle"],
    answer:
      "Default: Michelle classifies against the Row 19 matrix in ops/fab-5/operating-system.json. Escalate only for Founder-reserved, human-expert, unresolved source conflict, or valid unresolved release blocks. Do not escalate merely because work is difficult.",
  });
}

export function isAuthorityQuery(command: string): boolean {
  const text = command.toLowerCase();
  return (
    /query_authority|authority matrix|can michelle approve|can imani execute|does nia need|require founder approval|human legal review|founder is unavailable|who may block|who may clear|can this spend|incident severity|who must be notified/.test(
      text,
    ) ||
    /reprioritize authorized|routine technical|participant-facing tech|approved (marketing|claim|template)|new material public claim|budgeted (approved )?spend|unbudgeted|routine production deploy|irreversible production|emergency security|legal hold|triple e block|tech\/risk block|clear valid|founder override|sev-1|sev-3|go\/no-go|go for launch/.test(
      text,
    )
  );
}
