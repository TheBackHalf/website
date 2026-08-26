import { randomUUID } from "node:crypto";

import { queryAuthority } from "@/lib/fab-5/authority";
import { queryAccess } from "@/lib/fab-5/access";
import { appendTrace, createTrace, persistTrace } from "@/lib/fab-5/audit";
import { classifyCommand, parseRowNumber } from "@/lib/fab-5/decision-engine";
import { getLaunchRow, loadOperatingSystem } from "@/lib/fab-5/os";
import { detectSourceConflict, retrieveSources } from "@/lib/fab-5/source";
import { createImaniAgent, createNiaAgent, type AgentRuntime } from "@/lib/fab-5/specialists";
import { toolsFor } from "@/lib/fab-5/tools";
import { queryLaunchView } from "@/lib/fab-5/workstreams";
import type {
  BlockRecord,
  EvidenceItem,
  FounderReportClass,
  HandoffPacket,
  OrchestrationResult,
  SourceRecord,
  SpecialistReturn,
} from "@/lib/fab-5/types";

const MAX_RETRIES = 2;

export type RunOptions = {
  mode?: OrchestrationResult["mode"];
  founderUnavailable?: boolean;
  persistDir?: string;
  persistTrace?: boolean;
  extraSources?: SourceRecord[];
  qa?: Record<string, unknown>;
};

function packet(partial: Omit<HandoffPacket, "id">): HandoffPacket {
  return { id: randomUUID(), ...partial };
}

function hasEvidence(result: SpecialistReturn): boolean {
  return result.evidence.length > 0;
}

export async function createMichelleAgent(): Promise<AgentRuntime & { orchestrate: typeof orchestrate }> {
  const os = await loadOperatingSystem();
  const spec = os.michelle as { role: string; mission: string; prohibitedActions: string[] };
  const imani = await createImaniAgent();
  const nia = await createNiaAgent();

  const runtime: AgentRuntime & { orchestrate: typeof orchestrate } = {
    id: "michelle",
    name: "Michelle Northstar",
    role: spec.role,
    mission: spec.mission,
    tools: toolsFor("michelle").map((item) => item.name),
    instructions: [
      "IDENTITY: Michelle Northstar, Chief of Staff & Operations Officer, primary orchestrator.",
      `MISSION: ${spec.mission}`,
      "Founder assigns rows to Michelle. Do not require Founder to prompt Imani or Nia.",
      "Executor ≠ final verifier. Self-report is not acceptance.",
      `PROHIBITED: ${spec.prohibitedActions.join(" | ")}`,
      "Report to Founder only on the six classes. No routine chatter.",
      "Do not guess source conflicts. Do not expand authority if Founder is unavailable.",
      "AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE. If an owner lacks VERIFIED system access, classify ACCESS DEPENDENCY and do not claim the work is complete.",
    ].join("\n"),
    async run(handoff) {
      const result = await orchestrate(handoff.task, { qa: handoff.qa, mode: "qa" }, { michelle: runtime, imani, nia });
      const specialist = result.specialistResults[0];
      return (
        specialist ?? {
          agent: "michelle",
          status: result.finalStatus === "synthesized" ? "complete" : "escalated",
          workPerformed: result.plan,
          evidence: result.evidence,
          testResults: [],
          blockers: result.blocks,
          risks: [],
          decisionsMade: [],
          escalationsRequired: result.escalations,
          recommendedNextAction: result.synthesis,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
        }
      );
    },
    orchestrate: (command: string, options?: RunOptions) =>
      orchestrate(command, options, { michelle: runtime, imani, nia }),
  };

  return runtime;
}

export async function orchestrate(
  command: string,
  options: RunOptions = {},
  agents?: { michelle: AgentRuntime; imani: AgentRuntime; nia: AgentRuntime },
): Promise<OrchestrationResult> {
  const runId = randomUUID();
  const rowNumber = parseRowNumber(command);
  const classification = classifyCommand(command);
  const mode: OrchestrationResult["mode"] = options.founderUnavailable
    ? "founder_unavailable"
    : (options.mode ?? "normal");
  const trace = createTrace({ runId, initiatingRequest: command, rowNumber });
  const os = await loadOperatingSystem();
  const imani = agents?.imani ?? (await createImaniAgent());
  const nia = agents?.nia ?? (await createNiaAgent());
  const michelle =
    agents?.michelle ??
    ({
      id: "michelle" as const,
      name: "Michelle Northstar",
      role: "Chief of Staff & Operations Officer",
      mission: (os.michelle as { mission: string }).mission,
      instructions: "Orchestrator",
      tools: toolsFor("michelle").map((item) => item.name),
      run: async () => {
        throw new Error("Michelle specialist run is not used on the fallback orchestrator identity.");
      },
    } satisfies AgentRuntime);

  appendTrace(trace, "intake", { command, classification, mode }, "michelle");

  const founderReports: FounderReportClass[] = [];
  const blocks: BlockRecord[] = [];
  const evidence: EvidenceItem[] = [];
  const assignments: HandoffPacket[] = [];
  let specialistResults: SpecialistReturn[] = [];
  let parallel = false;

  if (classification.founderApproval && classification.founderGate) {
    if (options.founderUnavailable) {
      appendTrace(trace, "founder_unavailable_queue", { queue: os.founderUnavailableMode.queueLabel }, "michelle");
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: [
          "Founder-reserved decision detected",
          "Founder unavailable: queued FOUNDER ACTION REQUIRED",
          "Did not expand agent authority",
          "Unrelated authorized work may continue",
        ],
        assignments,
        specialistResults,
        evidence: [{ kind: "source", summary: "Row 15 Founder-unavailable mode" }],
        blocks,
        escalations: [
          {
            to: "founder",
            reason: os.founderUnavailableMode.queueLabel,
            decisionRequired: classification.founderGate.decisionRequired,
          },
        ],
        founderReports: ["DECISION_REQUIRED"],
        founderGate: classification.founderGate,
        founderActionRequired: true,
        synthesis: `${os.founderUnavailableMode.queueLabel}: ${classification.founderGate.decisionRequired}. Restricted action stopped.`,
        finalStatus: "founder_gate",
        parallel: false,
      });
      return finish(trace, result, options);
    }

    appendTrace(trace, "founder_gate", classification.founderGate, "michelle");
    founderReports.push("DECISION_REQUIRED");
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        "Classified command against Row 15 decision rights",
        "STOP restricted action",
        "Return Founder approval packet",
        "Continue unrelated authorized work only",
      ],
      assignments,
      specialistResults,
      evidence: [{ kind: "source", summary: classification.founderGate.evidence }],
      blocks,
      escalations: [{ to: "founder", reason: classification.founderGate.why, ...classification.founderGate }],
      founderReports,
      founderGate: classification.founderGate,
      founderActionRequired: true,
      synthesis: `Founder gate: ${classification.founderGate.decisionRequired}. Action not executed.`,
      finalStatus: "founder_gate",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "legal_hold") {
    appendTrace(trace, "legal_hold", {}, "michelle");
    const identified = await imani.run(
      packet({
        task: command,
        sourceAuthority: ["operating-system"],
        owner: "imani",
        objective: "Preserve relevant technical records. Identify legal-hold risk. Issue no legal conclusion about scope or duration.",
        constraints: ["No legal conclusions", "Do not destroy evidence"],
        dependencies: [],
        toolsAuthorized: ["identify_legal_risk"],
        acceptanceCriteria: ["Preservation acknowledged", "No legal conclusion"],
        evidenceRequired: ["source"],
        escalationConditions: ["legal-hold scope"],
        qa: options.qa,
      }),
    );
    specialistResults = [identified];
    founderReports.push("ACTION_REQUIRED");
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        "Legal-hold trigger identified",
        "Preserve potentially relevant information",
        "Escalate to qualified human legal expert for scope/duration",
        "No agent legal conclusion",
      ],
      assignments: [],
      specialistResults,
      evidence: identified.evidence,
      blocks,
      escalations: [
        classification.expertEscalation ?? {
          to: "human_legal_expert",
          reason: "Legal-hold scope requires a qualified human legal expert.",
        },
      ],
      founderReports,
      founderActionRequired: false,
      synthesis:
        "LEGAL HOLD: Michelle coordinates preservation and escalation. Imani preserves relevant technical records and prevents routine deletion where authorized. Nia preserves participant-facing/content evidence as applicable. Qualified human legal expert determines authoritative legal-hold scope. Agents must not fabricate a legal conclusion. HUMAN LEGAL REVIEW REQUIRED.",
      finalStatus: "human_expert_gate",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.humanExpert && classification.expertEscalation) {
    appendTrace(trace, "human_expert_gate", classification.expertEscalation, "michelle");
    const identified = await imani.run(
      packet({
        task: command,
        sourceAuthority: ["operating-system"],
        owner: "imani",
        objective: "Identify legal risk without issuing a legal conclusion",
        constraints: ["No legal conclusions"],
        dependencies: [],
        toolsAuthorized: ["identify_legal_risk"],
        acceptanceCriteria: ["Risk identified", "No legal conclusion"],
        evidenceRequired: ["source"],
        escalationConditions: ["Any legal judgment"],
        qa: options.qa,
      }),
    );
    specialistResults = [identified];
    founderReports.push("ACTION_REQUIRED");
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        "Imani identifies legal/compliance risk",
        "Michelle escalates to qualified human legal expert",
        "No agent issues a legal conclusion",
      ],
      assignments: [],
      specialistResults,
      evidence: identified.evidence,
      blocks,
      escalations: [classification.expertEscalation],
      founderReports,
      founderActionRequired: false,
      synthesis: "Human legal expert required. Imani did not answer the legal question.",
      finalStatus: "human_expert_gate",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "secret_retrieval") {
    appendTrace(trace, "secret_retrieval_denied", {}, "michelle");
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: ["Secret retrieval requested", "DENIED. Agents must not retrieve or echo secrets."],
      assignments,
      specialistResults,
      evidence: [{ kind: "source", summary: "Row 20: secrets are NOT_AUTHORIZED in prompts" }],
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: false,
      synthesis: "DENIED. Secret retrieval is unavailable to Fab 5 agents. I HAVE AUTHORITY does not grant secret values.",
      finalStatus: "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "production_admin_attempt") {
    const refused = await nia.run(
      packet({
        task: command,
        sourceAuthority: ["operating-system"],
        owner: "nia",
        objective: "Refuse infrastructure ADMIN. Route to Imani.",
        constraints: ["No production ADMIN"],
        dependencies: [],
        toolsAuthorized: ["triple_e_review"],
        acceptanceCriteria: ["Denied"],
        evidenceRequired: ["source"],
        escalationConditions: ["infrastructure"],
        qa: options.qa,
      }),
    );
    specialistResults = [refused];
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: ["Nia infrastructure ADMIN refused", "Not routed as production ADMIN"],
      assignments,
      specialistResults,
      evidence: refused.evidence,
      blocks,
      escalations: refused.escalationsRequired,
      founderReports,
      founderActionRequired: false,
      synthesis: "DENIED. Nia does not receive infrastructure ADMIN. Unavailable.",
      finalStatus: "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "production_data_mutation") {
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: ["Unrestricted production-data mutation requested", "DENIED"],
      assignments,
      specialistResults,
      evidence: [{ kind: "source", summary: "Row 15/20: Michelle has evidence READ, not unrestricted production-data WRITE" }],
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: false,
      synthesis: "DENIED. Michelle does not have unrestricted production-data mutation. Unavailable.",
      finalStatus: "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "access_query") {
    const access = await queryAccess(command);
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: ["Queried Row 20 access registry", "Distinguished authority from verified access"],
      assignments,
      specialistResults,
      evidence: [{ kind: "source", summary: access.answer, ref: "ops/fab-5/access-registry.json" }],
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: access.classification === "FOUNDER_ACTION_REQUIRED",
      synthesis: access.answer,
      finalStatus: access.executable ? "synthesized" : "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  const accessIntents = new Set([
    "support_request",
    "privacy_request",
    "social_publish_execution",
    "production_inspect",
    "payment_reporting",
  ]);
  if (accessIntents.has(classification.intent)) {
    const access = await queryAccess(command);
    appendTrace(trace, "access_check", { classification: access.classification, executable: access.executable }, "michelle");
    if (!access.executable) {
      const founderNeeded = access.classification === "FOUNDER_ACTION_REQUIRED";
      if (founderNeeded) founderReports.push("ACTION_REQUIRED");
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: [
          "Authority exists under Rows 15–19",
          "Required system access is not VERIFIED",
          "ACCESS DEPENDENCY — did not claim the work complete",
        ],
        assignments,
        specialistResults,
        evidence: [{ kind: "source", summary: access.answer, ref: "ops/fab-5/access-registry.json" }],
        blocks: [
          {
            blockingAgent: "michelle",
            issue: "ACCESS DEPENDENCY",
            evidence: access.answer,
            severity: founderNeeded ? "high" : "medium",
            owner: "michelle",
            requiredCorrection: founderNeeded
              ? "Founder completes the exact authorization in the Row 20 Founder Action Queue."
              : "Wait for the later-row system to exist, or provision verified access.",
            retestRequirement: "Re-run query_access after provisioning; only VERIFIED is executable.",
          },
        ],
        escalations: founderNeeded ? [{ to: "founder", reason: "System access requires Founder authorization" }] : [],
        founderReports,
        founderActionRequired: founderNeeded,
        synthesis: access.answer,
        finalStatus: "blocked",
        parallel: false,
      });
      return finish(trace, result, options);
    }
    if (classification.intent === "payment_reporting") {
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: [
          "Payment reporting access is VERIFIED for Michelle READ / Imani technical",
          "Nia remains NONE",
          "No refunds or live charges executed",
        ],
        assignments,
        specialistResults,
        evidence: [{ kind: "source", summary: access.answer, ref: "ops/fab-5/access-registry.json" }],
        blocks,
        escalations: [],
        founderReports,
        founderActionRequired: false,
        synthesis: `${access.answer} Nia has no Stripe access. Founder retains financial ADMIN/approval. No transactions created.`,
        finalStatus: "synthesized",
        parallel: false,
      });
      return finish(trace, result, options);
    }
    if (classification.intent === "production_inspect") {
      const packetImani = packet({
        task: command,
        sourceAuthority: ["operating-system", "production-implementation"],
        owner: "imani",
        objective: "Inspect back-half/website through Imani machine access. No deploy. No secrets.",
        constraints: ["Read-only", "No production mutation", "No Founder CLI identity"],
        dependencies: [],
        toolsAuthorized: ["vercel_inspect"],
        acceptanceCriteria: ["Authenticated project read"],
        evidenceRequired: ["readiness"],
        escalationConditions: [],
        qa: options.qa,
      });
      assignments.push(packetImani);
      specialistResults.push(await imani.run(packetImani));
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: [
          "Imani machine inspect of back-half/website",
          "Did not use Founder CLI session as Imani identity",
          "No production mutation",
        ],
        assignments,
        specialistResults,
        evidence: [
          { kind: "source", summary: access.answer, ref: "ops/fab-5/access-registry.json" },
          ...specialistResults.flatMap((item) => item.evidence),
        ],
        blocks,
        escalations: [],
        founderReports,
        founderActionRequired: false,
        synthesis: `${access.answer} Imani inspected via project-scoped machine token. No deploy/rollback executed.`,
        finalStatus: specialistResults.some((item) => item.status === "failed") ? "blocked" : "synthesized",
        parallel: false,
      });
      return finish(trace, result, options);
    }
  }

  const sources = await retrieveSources({
    agent: "michelle",
    topics: ["operating-system", "locked-founder-decisions", "august-launch-tab", "decision-log"],
    includeHistorical: classification.intent === "source_conflict",
  });
  const mergedSources = [...sources, ...(options.extraSources ?? [])];
  const conflict = detectSourceConflict(mergedSources);
  appendTrace(trace, "source_retrieval", { count: mergedSources.length, conflict }, "michelle");

  if (conflict.conflict || classification.intent === "source_conflict") {
    founderReports.push("MATERIAL_BLOCKER");
    blocks.push({
      blockingAgent: "michelle",
      issue: conflict.description ?? "Authoritative sources conflict",
      evidence: mergedSources.map((item) => `${item.id}:${item.authority}`).join(" | "),
      severity: "high",
      owner: "michelle",
      requiredCorrection: "Founder or locked decision must resolve the contradiction. Do not guess.",
      retestRequirement: "Re-run contradiction check after source correction.",
    });
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        "Identified conflicting sources",
        "Checked locked Founder decisions — no automatic resolution",
        "Did not guess",
        "Escalated contradiction",
      ],
      assignments,
      specialistResults,
      evidence: [{ kind: "source", summary: conflict.description ?? "conflict" }],
      blocks,
      escalations: [{ to: "founder", reason: "Source-of-truth contradiction" }],
      founderReports,
      founderActionRequired: true,
      synthesis: "Source conflict: no guess. FOUNDER ACTION REQUIRED if no locked decision resolves it.",
      finalStatus: "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  let row = null;
  if (rowNumber !== undefined) {
    row = await getLaunchRow(rowNumber);
    if (!row) {
      founderReports.push("ACTION_REQUIRED");
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: ["Locate August Launch row", "Row not in adapter"],
        assignments,
        specialistResults,
        evidence: [],
        blocks: [
          {
            blockingAgent: "michelle",
            issue: `Launch Row ${rowNumber} is not in the current adapter`,
            evidence: "ops/fab-5/launch-rows.json",
            severity: "medium",
            owner: "michelle",
            requiredCorrection: "Add the authoritative row to the Launch adapter or source of truth.",
            retestRequirement: "Re-run Complete August Launch Row command.",
          },
        ],
        escalations: [{ to: "founder", reason: "Missing source material" }],
        founderReports,
        founderActionRequired: true,
        synthesis: `Row ${rowNumber} not found. Did not invent the row. Did not start another row.`,
        finalStatus: "blocked",
        parallel: false,
      });
      return finish(trace, result, options);
    }
    if (row.mutating && mode === "read_only") {
      appendTrace(trace, "read_only_guard", { row: row.number }, "michelle");
    }
  }

  if (
    classification.intent === "launch_view_query" ||
    classification.intent.startsWith("workstream_")
  ) {
    const view = await queryLaunchView(command);
    const needImani =
      view.primaryOwner === "imani" || view.supportingOwners?.includes("imani");
    const needNia = view.primaryOwner === "nia" || view.supportingOwners?.includes("nia");
    if (needImani) {
      const packetImani = packet({
        task: command,
        sourceAuthority: ["operating-system", "august-launch-tab"],
        owner: "imani",
        objective: "Confirm technology/risk/legal-implementation ownership from the consolidated launch view",
        constraints: ["No legal conclusions", "No repo mutation"],
        dependencies: [],
        toolsAuthorized: ["classify_readiness", "identify_legal_risk"],
        acceptanceCriteria: ["Primary owner confirmed from consolidated view"],
        evidenceRequired: ["source"],
        escalationConditions: ["legal judgment"],
        qa: options.qa,
      });
      assignments.push(packetImani);
      specialistResults.push(await imani.run(packetImani));
    }
    if (needNia) {
      const packetNia = packet({
        task: command,
        sourceAuthority: ["operating-system", "august-launch-tab"],
        owner: "nia",
        objective: "Confirm experience/learning/marketing/community ownership from the consolidated launch view",
        constraints: ["Do not invent curriculum", "Do not add channels"],
        dependencies: [],
        toolsAuthorized: ["retrieve_approved_content"],
        acceptanceCriteria: ["Primary owner confirmed from consolidated view"],
        evidenceRequired: ["source"],
        escalationConditions: ["Founder-reserved claims"],
        qa: options.qa,
      });
      assignments.push(packetNia);
      specialistResults.push(await nia.run(packetNia));
    }
    evidence.push({ kind: "source", summary: view.answer, ref: "ops/fab-5/launch-rows.json" });
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        "Queried consolidated launch view",
        view.primaryOwner ? `Primary owner: ${view.primaryOwner}` : "Ownership answered from view",
        "Did not invent spreadsheet rows",
        "Did not start an unassigned later row",
      ],
      assignments,
      specialistResults,
      evidence,
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: false,
      synthesis: view.answer,
      finalStatus: "synthesized",
      parallel: Boolean(needImani && needNia),
    });
    return finish(trace, result, options);
  }

  const authorityIntents = new Set([
    "michelle_reprioritize",
    "routine_tech_change",
    "participant_facing_tech_change",
    "approved_marketing_execution",
    "budgeted_spend",
    "routine_production_deploy",
    "clear_nia_block",
    "clear_imani_block",
    "sev1_incident",
    "sev3_incident",
    "authority_query",
    "emergency_containment",
  ]);
  if (authorityIntents.has(classification.intent)) {
    const ruling = await queryAuthority(command);
    if (classification.intent === "clear_nia_block") {
      blocks.push({
        blockingAgent: "nia",
        issue: "Material Triple E failure remains unresolved",
        evidence: "Nia Triple E block is valid and outstanding",
        severity: "high",
        owner: "nia",
        requiredCorrection: "Correct the participant-facing failure to the approved experience standard.",
        retestRequirement: "Nia independently retests. Michelle may not administratively clear this block.",
      });
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: ["Nia Triple E block is valid", "Michelle coordination only", "Administrative clearance refused"],
        assignments,
        specialistResults,
        evidence: [{ kind: "source", summary: ruling.answer, ref: "ops/fab-5/operating-system.json" }],
        blocks,
        escalations: [],
        founderReports: ["MATERIAL_BLOCKER"],
        founderActionRequired: false,
        synthesis: `REFUSED. ${ruling.answer} BLOCKING EXECUTIVE: Nia. BLOCK STATUS: OPEN.`,
        finalStatus: "blocked",
        parallel: false,
      });
      return finish(trace, result, options);
    }
    if (classification.intent === "clear_imani_block") {
      blocks.push({
        blockingAgent: "imani",
        issue: "Material technical/risk failure remains unresolved",
        evidence: "Imani technical/risk block is valid and outstanding",
        severity: "high",
        owner: "imani",
        requiredCorrection: "Restore security, privacy implementation, data integrity, or production readiness with tests.",
        retestRequirement: "Imani independently retests. Nia may not clear this block.",
      });
      const result = baseResult({
        runId,
        command,
        rowNumber,
        mode,
        plan: ["Imani tech/risk block is valid", "Nia clearance refused"],
        assignments,
        specialistResults,
        evidence: [{ kind: "source", summary: ruling.answer, ref: "ops/fab-5/operating-system.json" }],
        blocks,
        escalations: [],
        founderReports: ["MATERIAL_BLOCKER"],
        founderActionRequired: false,
        synthesis: `REFUSED. ${ruling.answer} BLOCKING EXECUTIVE: Imani. BLOCK STATUS: OPEN.`,
        finalStatus: "blocked",
        parallel: false,
      });
      return finish(trace, result, options);
    }

    const needImaniAuth =
      classification.owners.includes("imani") ||
      classification.intent === "emergency_containment" ||
      classification.intent === "sev1_incident" ||
      classification.intent === "routine_tech_change" ||
      classification.intent === "routine_production_deploy" ||
      classification.intent === "budgeted_spend" ||
      classification.intent === "participant_facing_tech_change";
    const needNiaAuth =
      classification.owners.includes("nia") ||
      classification.intent === "approved_marketing_execution" ||
      classification.intent === "participant_facing_tech_change" ||
      classification.intent === "sev1_incident";
    if (needImaniAuth) {
      const packetImani = packet({
        task: command,
        sourceAuthority: ["operating-system"],
        owner: "imani",
        objective: "Execute or confirm in-authority technical/risk action. No legal conclusions. No Founder-reserved action.",
        constraints: ["No repo mutation", "No secrets", "Emergency containment then notify"],
        dependencies: [],
        toolsAuthorized: ["classify_readiness", "contain_incident"],
        acceptanceCriteria: ["Authority respected", "Evidence attached"],
        evidenceRequired: ["source"],
        escalationConditions: ["Founder-reserved", "legal judgment"],
        qa: options.qa,
      });
      assignments.push(packetImani);
      specialistResults.push(await imani.run(packetImani));
    }
    if (needNiaAuth) {
      const packetNia = packet({
        task: command,
        sourceAuthority: ["operating-system", "approved-brand"],
        owner: "nia",
        objective: "Confirm experience/marketing authority. Do not invent claims or curriculum.",
        constraints: ["No new material public claims", "Lumina is not an operating agent"],
        dependencies: [],
        toolsAuthorized: ["retrieve_approved_content", "triple_e_review"],
        acceptanceCriteria: ["Approved-source execution only"],
        evidenceRequired: ["source"],
        escalationConditions: ["Founder-reserved claims"],
        qa: options.qa,
      });
      assignments.push(packetNia);
      specialistResults.push(await nia.run(packetNia));
    }
    evidence.push({ kind: "source", summary: ruling.answer, ref: "ops/fab-5/operating-system.json" });
    const founderNotify = ruling.notify.includes("kimberly");
    if (founderNotify && classification.intent === "sev1_incident") {
      founderReports.push("MATERIAL_RISK");
    }
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [
        `Authority level ${ruling.level} ${ruling.levelName}`,
        ruling.founderApprovalRequired ? "Founder gate" : "No Founder approval required",
        ruling.niaVerificationRequired ? "Nia verification required" : "Nia verification not required unless participant-facing",
      ],
      assignments,
      specialistResults,
      evidence,
      blocks,
      escalations:
        classification.intent === "emergency_containment" || classification.intent === "sev1_incident"
          ? [{ to: "founder", reason: "Notify Founder after emergency/SEV-1 containment. Action already taken within emergency authority." }]
          : [],
      founderReports,
      founderActionRequired: false,
      synthesis: ruling.answer,
      finalStatus: "synthesized",
      parallel: Boolean(needImaniAuth && needNiaAuth),
    });
    return finish(trace, result, options);
  }

  const plan = [
    row ? `Located Row ${row.number}: ${row.deliverable}` : "No Launch row number; capability command",
    "Retrieved source of truth",
    `Classified intent: ${classification.intent}`,
    classification.parallel
      ? "Independent specialist work will run in parallel"
      : "Sequenced where dependent",
  ];

  if (classification.intent === "claim_complete_without_evidence" || options.qa?.omitEvidence) {
    const bogus = await imani.run(
      packet({
        task: "Claim complete without evidence",
        sourceAuthority: ["operating-system"],
        owner: "imani",
        objective: "QA evidence gate",
        constraints: [],
        dependencies: [],
        toolsAuthorized: ["classify_readiness"],
        acceptanceCriteria: ["Evidence present"],
        evidenceRequired: ["test"],
        escalationConditions: [],
        qa: { omitEvidence: true },
      }),
    );
    appendTrace(trace, "evidence_gate", { accepted: false, reason: "empty evidence" }, "michelle");
    blocks.push({
      blockingAgent: "michelle",
      issue: "Specialist self-report is not acceptance",
      evidence: "Imani returned Complete with zero evidence items",
      severity: "high",
      owner: "imani",
      requiredCorrection: "Return tests, source refs, or file/diff evidence.",
      retestRequirement: "Michelle re-checks evidence completeness.",
    });
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [...plan, "Rejected unsupported Complete"],
      assignments: [],
      specialistResults: [bogus],
      evidence: [],
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: false,
      synthesis: "Not complete. Evidence gate failed. No Founder interruption required.",
      finalStatus: "blocked",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "disagreement" || options.qa?.disagree) {
    const [imaniPos, niaPos] = await Promise.all([
      imani.run(
        packet({
          task: "Technical recommendation on shipping a participant-facing change",
          sourceAuthority: ["operating-system", "production-implementation"],
          owner: "imani",
          objective: "State position + evidence + risk",
          constraints: ["No majority vote"],
          dependencies: [],
          toolsAuthorized: ["classify_readiness"],
          acceptanceCriteria: ["Position, evidence, risk"],
          evidenceRequired: ["readiness"],
          escalationConditions: ["Founder-reserved"],
          qa: { disagree: true },
        }),
      ),
      nia.run(
        packet({
          task: "Experience recommendation on shipping a participant-facing change",
          sourceAuthority: ["approved-product-curriculum", "approved-brand"],
          owner: "nia",
          objective: "State position + evidence + risk",
          constraints: ["No majority vote"],
          dependencies: [],
          toolsAuthorized: ["triple_e_review"],
          acceptanceCriteria: ["Position, evidence, risk"],
          evidenceRequired: ["fidelity"],
          escalationConditions: ["Founder-reserved"],
          qa: { disagree: true },
        }),
      ),
    ]);
    specialistResults = [imaniPos, niaPos];
    appendTrace(trace, "disagreement", { imani: imaniPos.decisionsMade, nia: niaPos.decisionsMade }, "michelle");
    const synthesis =
      "Michelle compared both positions to source of truth. Experience integrity is an encoded Nia block condition; shipping despite that would be a Founder-reserved 'release despite unresolved blocker' if Nia issues a formal block. Within Michelle authority: do not release. Hold for experience correction. Not a majority vote.";
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [...plan, "Collected Imani and Nia positions", "Adjudicated against SoT"],
      assignments: [],
      specialistResults,
      evidence: [...imaniPos.evidence, ...niaPos.evidence],
      blocks,
      escalations: [],
      founderReports,
      founderActionRequired: false,
      synthesis,
      finalStatus: "synthesized",
      parallel: true,
    });
    return finish(trace, result, options);
  }

  const imaniPacket = packet({
    task:
      classification.intent === "security_decision"
        ? command
        : row
          ? `Technical/risk review of August Launch Row ${row.number} (${row.deliverable}) without mutating Launch status`
          : command,
    sourceAuthority: ["operating-system", "production-implementation"],
    owner: "imani",
    objective: "Honest DESIGNED/BUILT/TESTED/PRODUCTION-READY review; no legal conclusions",
    constraints: ["No silent merge", "Cursor Cloud Agents execute engineering via AOS", "No secrets"],
    dependencies: [],
    toolsAuthorized: ["inspect_repo_state", "classify_readiness", "emit_engineering_task"],
    acceptanceCriteria: ["Readiness labeled honestly", "Evidence attached"],
    evidenceRequired: ["readiness", "source"],
    escalationConditions: ["Founder-reserved", "legal judgment"],
    qa: options.qa,
  });
  const niaPacket = packet({
    task:
      classification.intent === "curriculum_rewrite" || classification.intent === "experience_fail"
        ? command
        : row
          ? `Experience/Triple E review of August Launch Row ${row.number} (${row.deliverable})`
          : command,
    sourceAuthority: ["operating-system", "approved-product-curriculum", "approved-brand"],
    owner: "nia",
    objective: "Protect Triple E and approved promise; do not invent curriculum",
    constraints: ["No brand-promise rewrite", "Lumina is not an operating agent"],
    dependencies: [],
    toolsAuthorized: ["retrieve_approved_content", "triple_e_review", "fidelity_compare"],
    acceptanceCriteria: ["Triple E verdict with source"],
    evidenceRequired: ["fidelity", "source"],
    escalationConditions: ["Material curriculum change"],
    qa: options.qa,
  });

  const needImani =
    classification.owners.includes("imani") ||
    classification.intent === "complete_launch_row" ||
    classification.intent === "mixed_tech_experience" ||
    classification.intent === "routine_implementation" ||
    classification.intent === "emergency_containment" ||
    classification.intent === "production_readiness_fail" ||
    classification.intent === "security_decision";
  const needNia =
    classification.owners.includes("nia") ||
    classification.intent === "complete_launch_row" ||
    classification.intent === "mixed_tech_experience" ||
    classification.intent === "routine_implementation" ||
    classification.intent === "experience_fail" ||
    classification.intent === "curriculum_rewrite";

  if (classification.intent === "security_decision" && /nia/.test(command.toLowerCase())) {
    const refused = await nia.run(imaniPacket);
    specialistResults = [refused];
    appendTrace(trace, "role_isolation", { asked: "nia", ownedBy: "imani", status: refused.status }, "michelle");
    const rerouted = await imani.run(imaniPacket);
    specialistResults.push(rerouted);
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [...plan, "Nia refused out-of-role security ownership", "Michelle rerouted to Imani"],
      assignments: [imaniPacket],
      specialistResults,
      evidence: [...refused.evidence, ...rerouted.evidence],
      blocks,
      escalations: refused.escalationsRequired,
      founderReports,
      founderActionRequired: false,
      synthesis: "Role isolation held. Nia did not own the security decision. Imani handled it.",
      finalStatus: "synthesized",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  if (classification.intent === "curriculum_rewrite" && /imani/.test(command.toLowerCase())) {
    const refused = await imani.run(niaPacket);
    specialistResults = [refused];
    appendTrace(trace, "role_isolation", { asked: "imani", ownedBy: "nia", status: refused.status }, "michelle");
    const result = baseResult({
      runId,
      command,
      rowNumber,
      mode,
      plan: [...plan, "Imani refused curriculum rewrite", "Michelle holds Founder gate for material change"],
      assignments: [niaPacket],
      specialistResults,
      evidence: refused.evidence,
      blocks,
      escalations: [
        {
          to: "founder",
          reason: "Material Journey curriculum change is Founder-reserved.",
          decisionRequired: "Material change to approved Journey curriculum",
        },
      ],
      founderReports: ["DECISION_REQUIRED"],
      founderGate: {
        decisionRequired: "Material change to approved Journey curriculum",
        why: "Requested curriculum rewrite exceeds operating-agent authority.",
        recommendation: "Do not rewrite. Keep approved curriculum.",
        alternatives: ["Implement approved curriculum as written"],
        impact: "No curriculum mutation performed.",
        risk: "Inventing curriculum would break SoT.",
        reversibility: "Stop is reversible.",
        evidence: "Row 15 founderReservedDecisions",
      },
      founderActionRequired: true,
      synthesis: "Imani did not rewrite curriculum. Founder gate opened for material curriculum change.",
      finalStatus: "founder_gate",
      parallel: false,
    });
    return finish(trace, result, options);
  }

  async function runWithRetry(agent: AgentRuntime, handoff: HandoffPacket): Promise<SpecialistReturn> {
    let last = await agent.run(handoff);
    let attempt = 0;
    while (last.status === "failed" && attempt < MAX_RETRIES) {
      attempt += 1;
      appendTrace(trace, "retry", { agent: agent.id, attempt }, "michelle");
      last = await agent.run({ ...handoff, qa: { ...handoff.qa, forceFailure: false } });
    }
    if (last.status === "failed") {
      blocks.push({
        blockingAgent: "michelle",
        issue: "Unresolved specialist failure after bounded retries",
        evidence: last.testResults.join("; ") || "runtime failure",
        severity: "high",
        owner: agent.id,
        requiredCorrection: "Restore specialist runtime or reassign within remaining authority.",
        retestRequirement: "Re-run packet after failure is cleared.",
      });
      founderReports.push("MATERIAL_BLOCKER");
    }
    return last;
  }

  const jobs: Array<Promise<SpecialistReturn>> = [];
  if (needImani) {
    assignments.push(imaniPacket);
    jobs.push(runWithRetry(imani, imaniPacket));
  }
  if (needNia) {
    assignments.push(niaPacket);
    jobs.push(runWithRetry(nia, niaPacket));
  }

  parallel = jobs.length > 1;
  appendTrace(trace, "delegate", { assignments: assignments.map((item) => item.owner), parallel }, "michelle");
  specialistResults = jobs.length > 0 ? await Promise.all(jobs) : [];

  for (const item of specialistResults) {
    evidence.push(...item.evidence);
    blocks.push(...item.blockers);
    if (item.status === "complete" && !hasEvidence(item)) {
      blocks.push({
        blockingAgent: "michelle",
        issue: "Specialist Complete without evidence",
        evidence: `${item.agent} self-report`,
        severity: "high",
        owner: item.agent,
        requiredCorrection: "Attach evidence.",
        retestRequirement: "Michelle evidence re-check",
      });
    }
  }

  const niaBlock = blocks.find((item) => item.blockingAgent === "nia");
  const imaniBlock = blocks.find((item) => item.blockingAgent === "imani");
  if (niaBlock && needImani && !options.qa?.skipCorrectionLoop) {
    appendTrace(trace, "correction_loop", { from: "nia", to: "imani" }, "michelle");
  }

  if (blocks.length > 0) {
    founderReports.push("MATERIAL_BLOCKER");
  }

  const rowReady =
    row &&
    blocks.length === 0 &&
    specialistResults.every((item) => item.status === "complete" && hasEvidence(item)) &&
    row.status === "pending_founder_acceptance";
  if (rowReady) {
    founderReports.push("ROW_READY_FOR_FOUNDER_ACCEPTANCE");
  }

  const uniqueReports = [...new Set(founderReports)];
  const synthesisParts = [
    `${michelle.name} synthesis.`,
    parallel ? "Imani and Nia ran in parallel." : "Work was sequenced.",
    imaniBlock ? `Imani block: ${imaniBlock.issue}` : null,
    niaBlock ? `Nia block: ${niaBlock.issue}` : null,
    row ? `Launch status for Row ${row.number} was not mutated.` : null,
    uniqueReports.length === 0
      ? "No Founder interruption required."
      : `Founder reports: ${uniqueReports.join(", ")}.`,
  ];

  const result = baseResult({
    runId,
    command,
    rowNumber,
    mode,
    plan,
    assignments,
    specialistResults,
    evidence,
    blocks,
    escalations: specialistResults.flatMap((item) => item.escalationsRequired),
    founderReports: uniqueReports,
    founderActionRequired: uniqueReports.includes("DECISION_REQUIRED") || uniqueReports.includes("ACTION_REQUIRED"),
    synthesis: synthesisParts.filter(Boolean).join(" "),
    finalStatus: blocks.length > 0 ? "blocked" : "synthesized",
    parallel,
  });
  return finish(trace, result, options);
}

function baseResult(
  input: Omit<OrchestrationResult, "founderActionRequired"> & { founderActionRequired: boolean },
): OrchestrationResult {
  return input;
}

async function finish(
  trace: ReturnType<typeof createTrace>,
  result: OrchestrationResult,
  options: RunOptions,
): Promise<OrchestrationResult> {
  appendTrace(trace, "synthesis", { finalStatus: result.finalStatus, reports: result.founderReports }, "michelle");
  if (options.persistTrace !== false) {
    result.tracePath = await persistTrace(trace, result, options.persistDir);
  }
  return result;
}
