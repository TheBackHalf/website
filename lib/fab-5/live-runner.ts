import {
  Agent,
  Runner,
  getDefaultModel,
  setDefaultOpenAIKey,
  setSensitiveDataLoggingEnabled,
  tool,
  type ModelResponse,
} from "@openai/agents";
import { z } from "zod";

import { appendTrace, createTrace, persistTrace } from "@/lib/fab-5/audit";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { getLaunchRow, loadOperatingSystem } from "@/lib/fab-5/os";
import { retrieveSources } from "@/lib/fab-5/source";
import { queryAuthority } from "@/lib/fab-5/authority";
import { inspectRepoState, queryAccess } from "@/lib/fab-5/access";
import { imaniVercelInspect } from "@/lib/fab-5/vercel";
import { queryLaunchView } from "@/lib/fab-5/workstreams";
import {
  applyControlledSurfaceCorrection,
  inspectControlledSurface,
  retestControlledSurface,
} from "@/lib/fab-5/qa-fixture";
import { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";
import { createMichelleAgent } from "@/lib/fab-5/michelle";
import type { OperatingAgentId, OrchestrationResult } from "@/lib/fab-5/types";

export const LIVE_MODEL_FALLBACK = "gpt-5.6-luna";

const TOOL_CATALOG = [
  "consult_imani",
  "consult_nia",
  "retrieve_source",
  "get_launch_row",
  "query_launch_view",
  "query_authority",
  "query_access",
  "inspect_repo_state",
  "vercel_inspect",
  "qa_unstable_probe",
  "qa_malformed_packet",
  "qa_surface_inspect",
  "qa_surface_correct",
  "qa_surface_retest",
] as const;

export type LiveRuntimeOptions = {
  failureProbe?: boolean;
  malformedProbe?: boolean;
  controlledSurface?: boolean;
  sourceConflict?: boolean;
  founderUnavailable?: boolean;
  sequentialTools?: boolean;
  extraInstructions?: string;
};

export type LiveRunCapture = {
  command: string;
  model: string;
  finalOutput: string;
  toolNames: string[];
  toolSequence: string[];
  lastAgent?: string;
  responseCount: number;
  usage: { requests: number; inputTokens: number; outputTokens: number; totalTokens: number };
  startedAt: string;
  endedAt: string;
  error?: string;
};

export function redactSecrets(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-openai-key]")
    .replace(/sk_live_[A-Za-z0-9]+/g, "[redacted-stripe-live]")
    .replace(/sk_test_[A-Za-z0-9]+/g, "[redacted-stripe-test]")
    .replace(/whsec_[A-Za-z0-9]+/g, "[redacted-webhook]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/OPENAI_API_KEY\s*[:=]\s*\S+/gi, "OPENAI_API_KEY=[redacted]")
    .replace(/STRIPE_SECRET_KEY\s*[:=]\s*\S+/gi, "STRIPE_SECRET_KEY=[redacted]")
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel-project-token]")
    .replace(/VERCEL_TOKEN\s*[:=]\s*\S+/gi, "VERCEL_TOKEN=[redacted]");
}

function sourceTool(agent: OperatingAgentId, options: LiveRuntimeOptions = {}) {
  return tool({
    name: "retrieve_source",
    description:
      "Retrieve approved current source-of-truth excerpts for this agent's allowlist. Never dump secrets.",
    parameters: z.object({
      topics: z
        .array(z.string())
        .describe(
          "Source ids such as operating-system, locked-founder-decisions, august-launch-tab, approved-product-curriculum, approved-brand, approved-legal-risk, production-implementation, test-evidence, decision-log",
        ),
    }),
    execute: async ({ topics }) => {
      const records = await retrieveSources({ agent, topics });
      const payload = records.map((item) => ({
        id: item.id,
        rank: item.rank,
        label: item.label,
        authority: item.authority,
        excerpt: item.excerpt,
      }));
      if (options.sourceConflict && (topics.length === 0 || topics.includes("locked-founder-decisions"))) {
        payload.push({
          id: "locked-founder-decisions",
          rank: 1,
          label: "Locked Founder decisions (competing current excerpt)",
          authority: "current",
          excerpt: "Pricing is $9.",
        });
      }
      return JSON.stringify(payload);
    },
  });
}

const launchRowTool = tool({
  name: "get_launch_row",
  description: "Read an August Launch row from the local adapter. Read-only. Do not mark Complete.",
  parameters: z.object({ number: z.number() }),
  execute: async ({ number }) => {
    const row = await getLaunchRow(number);
    return row ? JSON.stringify(row) : `Row ${number} not found in adapter.`;
  },
});

const launchViewTool = tool({
  name: "query_launch_view",
  description:
    "Query the single consolidated launch view for remaining work, owners, queues, critical path, parallel work, Founder action, and unowned work. Read-only.",
  parameters: z.object({
    question: z
      .string()
      .describe(
        "One of: imani_next, nia_next, michelle_coordinating, founder_action, human_expert, parallel, critical_path, remaining_count, unowned, after_row_18, route_technology, route_learning_experience, route_operations, route_marketing, route_finance, route_legal_implementation, route_cross_functional, route_final_readiness — or a natural-language equivalent including a specific August Launch row number.",
      ),
  }),
  execute: async ({ question }) => JSON.stringify(await queryLaunchView(question)),
});

const authorityTool = tool({
  name: "query_authority",
  description:
    "Query the single Row 19 Executive Authority & Escalation Matrix. Answers who may approve, execute, verify, block, clear a block, spend, deploy, or escalate. Read-only. Does not replace operating-system.json.",
  parameters: z.object({
    question: z
      .string()
      .describe(
        "Natural-language authority question, for example: Can Michelle approve this? Can Imani execute this production change? Does this require Founder approval? What incident severity is this?",
      ),
  }),
  execute: async ({ question }) => JSON.stringify(await queryAuthority(question)),
});

const accessTool = tool({
  name: "query_access",
  description:
    "Query the Row 20 access registry. Distinguishes I HAVE AUTHORITY from I HAVE SYSTEM ACCESS. AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE. Never returns secret values.",
  parameters: z.object({
    question: z
      .string()
      .describe(
        "Natural-language access question, for example: Is support@ VERIFIED? Can Nia publish Instagram? Does payment reporting have verified access?",
      ),
  }),
  execute: async ({ question }) => JSON.stringify(await queryAccess(question)),
});

const inspectRepoTool = tool({
  name: "inspect_repo_state",
  description: "Read a permitted repository path. Secret files are denied.",
  parameters: z.object({
    path: z.string().describe("Repo-relative path under content/, lib/fab-5/, ops/fab-5/, app/, or scripts/fab-5/."),
  }),
  execute: async ({ path: requested }) => JSON.stringify(inspectRepoState(requested, "imani")),
});

const vercelInspectTool = tool({
  name: "vercel_inspect",
  description:
    "Imani-only read of back-half/website: project, deployments, aliases, env names, log metadata. Never returns secrets. Does not deploy.",
  parameters: z.object({
    note: z.string().describe("Why this inspect is needed."),
  }),
  execute: async () => JSON.stringify(await imaniVercelInspect()),
});

const handoffParams = z.object({
  objective: z.string().describe("What the specialist must decide or verify."),
  constraints: z.array(z.string()).describe("Hard constraints, including read-only and role boundaries."),
  evidenceRequired: z.array(z.string()).describe("Evidence the specialist must return."),
  packet: z.string().describe("Structured task packet for the specialist."),
});

function packetFromHandoff(args: {
  objective: string;
  constraints: string[];
  evidenceRequired: string[];
  packet: string;
}): string {
  return [
    `OBJECTIVE: ${args.objective}`,
    `CONSTRAINTS: ${args.constraints.join("; ")}`,
    `EVIDENCE REQUIRED: ${args.evidenceRequired.join("; ")}`,
    `PACKET: ${args.packet}`,
  ].join("\n");
}

export async function createLiveFab5Agents(options: LiveRuntimeOptions = {}) {
  const [michelleRuntime, imaniRuntime, niaRuntime, os] = await Promise.all([
    createMichelleAgent(),
    createImaniAgent(),
    createNiaAgent(),
    loadOperatingSystem(),
  ]);

  const reserved = os.founderReservedDecisions.join("; ");
  let probeAttempts = 0;
  let malformedAttempts = 0;
  const inspectTool = tool({
    name: "qa_surface_inspect",
    description: "Inspect the disposable Row 17 controlled surface. Not production.",
    parameters: z.object({ note: z.string() }),
    execute: async () => JSON.stringify(inspectControlledSurface()),
  });
  const imaniTools: ReturnType<typeof tool>[] = [
    sourceTool("imani", options),
    launchViewTool,
    authorityTool,
    accessTool,
    inspectRepoTool,
    vercelInspectTool,
  ];
  const niaTools: ReturnType<typeof tool>[] = [sourceTool("nia", options), launchViewTool, authorityTool, accessTool];
  if (options.controlledSurface) {
    imaniTools.push(
      inspectTool,
      tool({
        name: "qa_surface_correct",
        description: "Apply the controlled-test correction only. Not a production mutation.",
        parameters: z.object({ note: z.string() }),
        execute: async () => JSON.stringify(applyControlledSurfaceCorrection()),
      }),
    );
    niaTools.push(
      inspectTool,
      tool({
        name: "qa_surface_retest",
        description: "Retest the disposable controlled surface. Pass only if the control is actually present.",
        parameters: z.object({ note: z.string() }),
        execute: async () => JSON.stringify(retestControlledSurface()),
      }),
    );
  }
  if (options.failureProbe) {
    imaniTools.push(
      tool({
        name: "qa_unstable_probe",
        description: "Controlled QA probe only. Not a production system. Call once during failure-handling tests.",
        parameters: z.object({ note: z.string() }),
        execute: async () => {
          probeAttempts += 1;
          if (probeAttempts === 1) {
            throw new Error("controlled_qa_failure");
          }
          return "probe recovered after bounded retry";
        },
      }),
    );
  }
  if (options.malformedProbe) {
    imaniTools.push(
      tool({
        name: "qa_malformed_packet",
        description: "Controlled malformed-output probe. Call during failure-handling tests.",
        parameters: z.object({ note: z.string() }),
        execute: async () => {
          malformedAttempts += 1;
          if (malformedAttempts === 1) {
            return "{complete:true";
          }
          return JSON.stringify({
            status: "recovered",
            evidence: ["bounded retry after malformed packet"],
          });
        },
      }),
    );
  }

  const imani = new Agent({
    name: imaniRuntime.name,
    handoffDescription: "Chief Technology & Risk Officer — architecture, security, readiness, incident containment.",
    instructions: [
      imaniRuntime.instructions,
      "Call retrieve_source before conclusions.",
      "Label DESIGNED vs BUILT vs TESTED vs PRODUCTION-READY honestly. They are not synonyms.",
      "If asked to rewrite curriculum, brand promise, or pricing, refuse and route to Michelle/Nia/Founder as appropriate.",
      "If asked for legal enforceability or legal conclusions, identify that human legal judgment is required. Do not conclude the law.",
      "If asked for Founder financial approval or legal signature, refuse. Those are Kimberly-reserved.",
      "Do not mutate files, Stripe, or launch status.",
      "Return evidence: sources consulted and readiness labels.",
      "You may block release when production-readiness, security, or test evidence fails. Include BLOCKING AGENT, ISSUE, EVIDENCE, SEVERITY, OWNER, REQUIRED CORRECTION, RETEST REQUIREMENT.",
      "Never certify LAUNCH READY, GO FOR LAUNCH, or PRODUCTION-READY from self-report or weak evidence such as 'file exists' or 'agent says it works'.",
    ].join("\n"),
    tools: imaniTools,
  });

  const nia = new Agent({
    name: niaRuntime.name,
    handoffDescription: "Chief Experience & Transformation Officer — Triple E, curriculum fidelity, brand.",
    instructions: [
      niaRuntime.instructions,
      "Call retrieve_source before conclusions.",
      "If asked to weaken security, own infrastructure, or make a security decision, refuse and route to Imani via Michelle.",
      "You do not have infrastructure ADMIN, production secrets, or Stripe ADMIN. If asked, refuse.",
      "Do not invent curriculum or rewrite the approved brand promise.",
      "Do not mutate files or launch status.",
      "Return evidence: approved sources compared and Triple E verdict.",
      "You may block release when Triple E or approved experience standards fail. Include BLOCKING AGENT, ISSUE, EVIDENCE, SEVERITY, OWNER, REQUIRED CORRECTION, RETEST REQUIREMENT.",
      "Self-report from another agent is not acceptance. Inspect/retest the actual controlled surface when asked.",
    ].join("\n"),
    tools: niaTools,
  });

  const michelle = Agent.create({
    name: michelleRuntime.name,
    instructions: [
      michelleRuntime.instructions,
      "You are the manager. Stay in control. Do not treat Lumina or Kimberly as operating agents.",
      "Always retrieve_source, get_launch_row, query_launch_view, query_authority, and/or query_access before decomposing work.",
      "Row 19 authority matrix is encoded in ops/fab-5/operating-system.json and queried via query_authority. Do not create a second authority engine. Levels: 1 independent, 2 cross-functional, 3 Founder-reserved, 4 human expert, 5 emergency. Michelle cannot clear a valid Nia or Imani release block. Nia cannot clear Imani tech/risk blocks. Imani cannot clear Nia Triple E blocks. Founder override requires explicit decision plus recorded accepted risk. Final Go/No-Go is Founder-reserved. Emergency containment: Imani acts first, then notifies.",
      "Row 20 access registry is ops/fab-5/access-registry.json, queried via query_access. Distinguish I HAVE AUTHORITY from I HAVE SYSTEM ACCESS. AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE. If required access is not VERIFIED, classify ACCESS DEPENDENCY and do not claim the work is complete. Do not fabricate mailbox, Vercel, social, or analytics connections.",
      "Row 18 workstreams (functional, not nine executives): TECHNOLOGY→Imani; OPERATIONS→Michelle; MARKETING/EXPERIENCE/LEARNING/COMMUNITY/INNOVATION→Nia; FINANCE→Kimberly; LEGAL implementation/risk→Imani. Human legal expert only for legal judgment. Founder/Kimberly for legal signature and other reserved decisions. Lumina is not an operating owner. Do not resurrect Perfect 10 roles.",
      "For remaining launch work, query_launch_view is the source. Do not invent spreadsheet row numbers. Unowned remaining work must be 0.",
      "Routing discipline: technology/risk-only → consult_imani only. Experience/curriculum/brand-only → consult_nia only. Cross-functional → both. Do not route everything to both agents.",
      "For cross-functional work, call consult_imani and consult_nia with a structured packet (objective, constraints, evidenceRequired, packet).",
      "If B depends on A, sequence A then B. Do not allow downstream acceptance before prerequisite evidence exists. Independent packets may run in parallel.",
      `Founder-reserved (do not execute): ${reserved}`,
      "Pricing, launch-date, and material product-scope changes require Founder approval. Return DECISION REQUIRED / FOUNDER ACTION REQUIRED. Do not execute.",
      "Legal interpretation requires a qualified human legal expert after Imani identifies the risk. Do not provide an authoritative legal conclusion. Return HUMAN LEGAL REVIEW REQUIRED.",
      "A specialist saying Complete without evidence is not acceptance. Weak evidence ('file exists', 'agent says it works', 'looks complete from code') is not runtime proof. Reject it.",
      "Do not certify LAUNCH READY, GO FOR LAUNCH, ROW COMPLETE, or PRODUCTION READY from any agent's self-report.",
      "If Founder is unavailable: continue approved reversible in-authority work; queue Founder-reserved items as FOUNDER ACTION REQUIRED. Do not expand authority.",
      "If Imani and Nia disagree: require POSITION, EVIDENCE, RISK, RECOMMENDED ACTION from each. Compare to source of truth. Explicitly state that this is not a majority vote.",
      "When synthesizing mixed readiness, distinguish READY / READY WITH ACCEPTED RISK / BLOCKED / FOUNDER DECISION REQUIRED. Do not collapse into Complete.",
      "This session is read-only for production. Disposable QA fixtures may be inspected/corrected/retested only when those tools exist.",
      "Do not interrupt the Founder for routine delegated work. Do not ask the Founder to prompt Imani or Nia.",
      "If a valid specialist block remains, do not mark the row ready.",
      options.founderUnavailable
        ? "FOUNDER STATUS THIS SESSION: UNAVAILABLE. Continue in-authority work. Queue reserved decisions as FOUNDER ACTION REQUIRED."
        : "",
      options.extraInstructions ?? "",
      "End with: SYNTHESIS, EVIDENCE, FOUNDER REPORT CLASS (one of ACTION REQUIRED, DECISION REQUIRED, MATERIAL BLOCKER, MATERIAL RISK, ROW READY FOR FOUNDER ACCEPTANCE, SCHEDULE/LAUNCH THREAT, or NONE).",
    ]
      .filter(Boolean)
      .join("\n"),
    modelSettings: { parallelToolCalls: options.sequentialTools ? false : true },
    tools: [
      sourceTool("michelle", options),
      launchRowTool,
      launchViewTool,
      authorityTool,
      accessTool,
      imani.asTool({
        toolName: "consult_imani",
        toolDescription:
          "Assign a structured technology/risk packet to Imani Heartbeat and receive her live result.",
        parameters: handoffParams,
        inputBuilder: ({ params }) => packetFromHandoff(params),
        runConfig: { tracingDisabled: true },
      }),
      nia.asTool({
        toolName: "consult_nia",
        toolDescription:
          "Assign a structured experience/Triple E packet to Nia Prism and receive her live result.",
        parameters: handoffParams,
        inputBuilder: ({ params }) => packetFromHandoff(params),
        runConfig: { tracingDisabled: true },
      }),
    ],
  });

  return {
    michelle,
    imani,
    nia,
    model: getDefaultModel() || LIVE_MODEL_FALLBACK,
  };
}

function collectToolSequence(payload: unknown): string[] {
  const seq: string[] = [];
  const visit = (value: unknown): void => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const candidate = rec.name ?? rec.toolName;
      if (
        typeof candidate === "string" &&
        TOOL_CATALOG.includes(candidate as (typeof TOOL_CATALOG)[number])
      ) {
        seq.push(candidate);
      }
      if (rec.rawItem) visit(rec.rawItem);
    }
  };
  visit(payload);
  return seq;
}

function collectToolNames(payload: unknown): string[] {
  return [...new Set(collectToolSequence(payload))];
}

function sumUsage(rawResponses: ModelResponse[]) {
  const usage = { requests: rawResponses.length, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  for (const response of rawResponses) {
    usage.inputTokens += response.usage?.inputTokens ?? 0;
    usage.outputTokens += response.usage?.outputTokens ?? 0;
    usage.totalTokens += response.usage?.totalTokens ?? 0;
  }
  return usage;
}

function configureLiveClient(): { model: string } {
  const loaded = loadFab5OpenAiEnv();
  if (!loaded.keyPresent || !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  setSensitiveDataLoggingEnabled(false);
  setDefaultOpenAIKey(process.env.OPENAI_API_KEY);
  process.env.OPENAI_AGENTS_DISABLE_TRACING = "1";
  return { model: getDefaultModel() || LIVE_MODEL_FALLBACK };
}

export async function runLiveMichelleCommand(
  command: string,
  options: LiveRuntimeOptions & { persistDir?: string } = {},
): Promise<{ capture: LiveRunCapture; tracePath?: string }> {
  const { model } = configureLiveClient();
  const { persistDir, ...runtime } = options;
  const { michelle } = await createLiveFab5Agents(runtime);
  return runLiveAgent(michelle, command, {
    persistDir,
    model,
    label: "michelle",
    sequentialTools: runtime.sequentialTools,
  });
}

export async function runLiveAgent(
  agent: Agent,
  command: string,
  options: {
    persistDir?: string;
    model?: string;
    label?: OperatingAgentId;
    sequentialTools?: boolean;
    maxTurns?: number;
  } = {},
): Promise<{ capture: LiveRunCapture; tracePath?: string }> {
  const { model } = options.model ? { model: options.model } : configureLiveClient();
  const runner = new Runner({
    model,
    tracingDisabled: true,
    modelSettings: { parallelToolCalls: options.sequentialTools ? false : true },
  });

  const startedAt = new Date().toISOString();
  try {
    const result = await runner.run(agent, command, { maxTurns: options.maxTurns ?? 16 });
    const endedAt = new Date().toISOString();
    const output = redactSecrets(
      typeof result.finalOutput === "string" ? result.finalOutput : JSON.stringify(result.finalOutput ?? ""),
    );
    const toolSequence = collectToolSequence(result.newItems);
    const capture: LiveRunCapture = {
      command,
      model,
      finalOutput: output,
      toolNames: [...new Set(toolSequence)],
      toolSequence,
      lastAgent: result.lastAgent?.name,
      responseCount: result.rawResponses.length,
      usage: sumUsage(result.rawResponses),
      startedAt,
      endedAt,
    };
    const tracePath = await persistLiveTrace(capture, options.persistDir, options.label ?? "michelle");
    return { capture, tracePath };
  } catch (error) {
    const endedAt = new Date().toISOString();
    const message = redactSecrets(error instanceof Error ? error.message : String(error));
    const capture: LiveRunCapture = {
      command,
      model,
      finalOutput: "",
      toolNames: [],
      toolSequence: [],
      responseCount: 0,
      usage: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      startedAt,
      endedAt,
      error: message,
    };
    return { capture };
  }
}

async function persistLiveTrace(
  capture: LiveRunCapture,
  persistDir: string | undefined,
  agent: OperatingAgentId,
): Promise<string | undefined> {
  if (!persistDir) return undefined;
  const trace = createTrace({ runId: `live-${Date.now()}`, initiatingRequest: capture.command });
  appendTrace(trace, "live_model", { model: capture.model, responseCount: capture.responseCount }, agent);
  appendTrace(trace, "tools", { toolNames: capture.toolNames, toolSequence: capture.toolSequence }, agent);
  appendTrace(trace, "synthesis", { finalOutput: capture.finalOutput.slice(0, 4000) }, agent);
  const stubResult: OrchestrationResult = {
    runId: trace.runId,
    command: capture.command,
    mode: "read_only",
    plan: ["live Michelle orchestration"],
    assignments: [],
    specialistResults: [],
    evidence: [{ kind: "trace", summary: `live tools: ${capture.toolNames.join(", ")}` }],
    blocks: [],
    escalations: [],
    founderReports: [],
    founderActionRequired: /DECISION REQUIRED|FOUNDER ACTION REQUIRED/i.test(capture.finalOutput),
    synthesis: capture.finalOutput.slice(0, 2000),
    finalStatus: /DECISION REQUIRED|FOUNDER ACTION REQUIRED/i.test(capture.finalOutput)
      ? "founder_gate"
      : "synthesized",
    parallel: capture.toolNames.includes("consult_imani") && capture.toolNames.includes("consult_nia"),
  };
  return persistTrace(trace, stubResult, persistDir);
}
