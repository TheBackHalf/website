import type { OperatingAgentId, ToolPermission } from "@/lib/fab-5/types";

export type Fab5ToolName =
  | "retrieve_source"
  | "get_launch_row"
  | "assign_handoff"
  | "collect_evidence"
  | "contradiction_check"
  | "founder_report"
  | "query_launch_view"
  | "query_authority"
  | "query_access"
  | "inspect_repo_state"
  | "classify_readiness"
  | "emit_engineering_task"
  | "contain_incident"
  | "identify_legal_risk"
  | "retrieve_approved_content"
  | "live_external_research"
  | "triple_e_review"
  | "fidelity_compare"
  | "draft_communication"
  | "issue_block"
  | "email_send"
  | "social_publish"
  | "vercel_inspect"
  | "production_deploy";

export type ToolDefinition = {
  name: Fab5ToolName;
  permission: ToolPermission;
  scope: string;
  restrictions: string;
  approval: "none" | "michelle" | "founder" | "human_expert";
  live: "connected" | "interface_only";
  agents: OperatingAgentId[];
};

export const TOOL_CATALOG: ToolDefinition[] = [
  {
    name: "retrieve_source",
    permission: "READ",
    scope: "Approved SoT by agent allowlist",
    restrictions: "No indiscriminate repo dump. No secrets.",
    approval: "none",
    live: "connected",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "get_launch_row",
    permission: "READ",
    scope: "ops/fab-5/launch-rows.json adapter",
    restrictions: "Specialists may not mark a row Complete.",
    approval: "none",
    live: "connected",
    agents: ["michelle"],
  },
  {
    name: "assign_handoff",
    permission: "EXECUTE",
    scope: "Structured packets to Imani/Nia",
    restrictions: "Cannot assign Founder-reserved execution.",
    approval: "none",
    live: "connected",
    agents: ["michelle"],
  },
  {
    name: "collect_evidence",
    permission: "READ",
    scope: "Specialist returns + source refs",
    restrictions: "Self-report is not evidence.",
    approval: "none",
    live: "connected",
    agents: ["michelle"],
  },
  {
    name: "contradiction_check",
    permission: "EXECUTE",
    scope: "Current authoritative sources",
    restrictions: "Do not guess if conflict exists.",
    approval: "none",
    live: "connected",
    agents: ["michelle"],
  },
  {
    name: "founder_report",
    permission: "EXECUTE",
    scope: "Six Founder report classes only",
    restrictions: "No routine chatter.",
    approval: "none",
    live: "connected",
    agents: ["michelle"],
  },
  {
    name: "query_launch_view",
    permission: "READ",
    scope: "ops/fab-5/launch-rows.json consolidated launch view",
    restrictions: "Read-only. Do not invent rows or mark Complete.",
    approval: "none",
    live: "connected",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "query_authority",
    permission: "READ",
    scope: "ops/fab-5/operating-system.json Row 19 Executive Authority & Escalation Matrix",
    restrictions: "Read-only. One operational authority source. Do not create a second engine.",
    approval: "none",
    live: "connected",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "query_access",
    permission: "READ",
    scope: "ops/fab-5/access-registry.json Row 20 systems and access",
    restrictions: "Read-only. No secret values. AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE.",
    approval: "none",
    live: "connected",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "inspect_repo_state",
    permission: "READ",
    scope: "Permitted implementation files",
    restrictions: "Read-only. No git write. No secret files.",
    approval: "none",
    live: "connected",
    agents: ["imani", "michelle"],
  },
  {
    name: "classify_readiness",
    permission: "EXECUTE",
    scope: "DESIGNED | BUILT | TESTED | PRODUCTION-READY",
    restrictions: "States are not synonyms. PRODUCTION-READY requires test evidence.",
    approval: "none",
    live: "connected",
    agents: ["imani"],
  },
  {
    name: "emit_engineering_task",
    permission: "EXECUTE",
    scope: "Cursor engineering handoff packet",
    restrictions: "Does not execute repository mutations. Cursor is the execution layer.",
    approval: "none",
    live: "connected",
    agents: ["imani", "michelle"],
  },
  {
    name: "contain_incident",
    permission: "EXECUTE",
    scope: "Emergency technical containment",
    restrictions: "Notify Michelle and Founder after. No authority expansion.",
    approval: "none",
    live: "connected",
    agents: ["imani"],
  },
  {
    name: "identify_legal_risk",
    permission: "READ",
    scope: "Flag legal/privacy risk",
    restrictions: "No legal conclusions.",
    approval: "human_expert",
    live: "connected",
    agents: ["imani"],
  },
  {
    name: "retrieve_approved_content",
    permission: "READ",
    scope: "Journey/Blueprint/brand excerpts",
    restrictions: "Do not invent copy.",
    approval: "none",
    live: "connected",
    agents: ["nia"],
  },
  {
    name: "live_external_research",
    permission: "EXECUTE",
    scope: "OpenAI-hosted web_search for current public intelligence; Nia only",
    restrictions:
      "Lawful public sources only. No paywall bypass. No private accounts. No human Nia identity. No legal conclusions. Budget-bounded.",
    approval: "none",
    live: "connected",
    agents: ["nia"],
  },
  {
    name: "triple_e_review",
    permission: "EXECUTE",
    scope: "Architect experience fidelity",
    restrictions: "May block. May not rewrite brand promise.",
    approval: "none",
    live: "connected",
    agents: ["nia"],
  },
  {
    name: "fidelity_compare",
    permission: "READ",
    scope: "Implementation vs approved source",
    restrictions: "Material curriculum change remains Founder-reserved.",
    approval: "none",
    live: "connected",
    agents: ["nia"],
  },
  {
    name: "draft_communication",
    permission: "WRITE",
    scope: "Approved-template draft only",
    restrictions: "SEND/PUBLISH require send-gate; live channels are downstream.",
    approval: "none",
    live: "interface_only",
    agents: ["nia", "michelle"],
  },
  {
    name: "issue_block",
    permission: "EXECUTE",
    scope: "Structured block record",
    restrictions: "Vague veto invalid. Cannot silently override another agent’s block.",
    approval: "none",
    live: "connected",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "email_send",
    permission: "NONE",
    scope: "support@ / privacy@ later connection",
    restrictions: "Mailbox not connected. kimberly@ never autonomous.",
    approval: "founder",
    live: "interface_only",
    agents: ["michelle", "imani", "nia"],
  },
  {
    name: "social_publish",
    permission: "NONE",
    scope: "Named social accounts when present in SoT",
    restrictions: "Not connected.",
    approval: "founder",
    live: "interface_only",
    agents: ["nia"],
  },
  {
    name: "vercel_inspect",
    permission: "READ",
    scope: "back-half/website project, deployments, aliases, logs, env-name metadata",
    restrictions: "Imani machine token only. No secret values. No CLI session.",
    approval: "none",
    live: "connected",
    agents: ["imani"],
  },
  {
    name: "production_deploy",
    permission: "EXECUTE",
    scope: "Approved deploy or rollback on back-half/website",
    restrictions:
      "Row 19 gates required. Founder retains ADMIN. Domain/env-secret/account/billing/destructive/irreversible are blocked. Writes are not executed during Row 20 setup.",
    approval: "none",
    live: "connected",
    agents: ["imani"],
  },
];

export function toolsFor(agent: OperatingAgentId): ToolDefinition[] {
  return TOOL_CATALOG.filter((tool) => tool.agents.includes(agent));
}

export function agentMayUse(agent: OperatingAgentId, toolName: Fab5ToolName): boolean {
  const tool = TOOL_CATALOG.find((item) => item.name === toolName);
  if (!tool) return false;
  if (tool.permission === "NONE") return false;
  return tool.agents.includes(agent);
}

export function invokeToolBoundary(
  agent: OperatingAgentId,
  toolName: Fab5ToolName,
): { ok: true } | { ok: false; reason: string; live: "interface_only" | "denied" } {
  const tool = TOOL_CATALOG.find((item) => item.name === toolName);
  if (!tool) return { ok: false, reason: "Unknown tool.", live: "denied" };
  if (!tool.agents.includes(agent)) {
    return { ok: false, reason: `${agent} is not authorized for ${toolName}.`, live: "denied" };
  }
  if (tool.live === "interface_only" || tool.permission === "NONE") {
    return {
      ok: false,
      reason: `${toolName} boundary is implemented; live connection is downstream.`,
      live: "interface_only",
    };
  }
  return { ok: true };
}
