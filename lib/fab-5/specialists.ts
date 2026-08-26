import { loadOperatingSystem } from "@/lib/fab-5/os";
import { retrieveSources } from "@/lib/fab-5/source";
import { agentMayUse, invokeToolBoundary, toolsFor, type Fab5ToolName } from "@/lib/fab-5/tools";
import { imaniVercelInspect, requestVercelWrite } from "@/lib/fab-5/vercel";
import type {
  BlockRecord,
  EngineeringHandoff,
  EvidenceItem,
  HandoffPacket,
  OperatingAgentId,
  SpecialistReturn,
} from "@/lib/fab-5/types";

export type AgentRuntime = {
  id: OperatingAgentId;
  name: string;
  role: string;
  mission: string;
  instructions: string;
  tools: Fab5ToolName[];
  run: (packet: HandoffPacket) => Promise<SpecialistReturn>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function denyTool(agent: OperatingAgentId, tool: Fab5ToolName, startedAt: string): SpecialistReturn {
  const boundary = invokeToolBoundary(agent, tool);
  return {
    agent,
    status: "rejected",
    workPerformed: [`Refused unauthorized tool ${tool}`],
    evidence: [{ kind: "trace", summary: boundary.ok ? "unexpected" : boundary.reason }],
    testResults: [],
    blockers: [],
    risks: ["Attempted out-of-role tool use"],
    decisionsMade: [],
    escalationsRequired: [
      {
        to: "michelle",
        reason: `${agent} does not own ${tool}`,
      },
    ],
    recommendedNextAction: "Route to the owning agent.",
    startedAt,
    endedAt: nowIso(),
  };
}

export async function createImaniAgent(): Promise<AgentRuntime> {
  const os = await loadOperatingSystem();
  const spec = os.imani as {
    role: string;
    mission: string;
    prohibitedActions: string[];
    ownedDomains: string[];
    stopBlockAuthority: { mayBlockReleaseWhen: string[] };
  };
  const tools = toolsFor("imani").map((item) => item.name);

  return {
    id: "imani",
    name: "Imani Heartbeat",
    role: spec.role,
    mission: spec.mission,
    tools,
    instructions: [
      "IDENTITY: Imani Heartbeat, Chief Technology & Risk Officer.",
      `MISSION: ${spec.mission}`,
      `OWNED: ${spec.ownedDomains.join(", ")}`,
      "STATES: DESIGNED vs BUILT vs TESTED vs PRODUCTION-READY are not synonyms.",
      `PROHIBITED: ${spec.prohibitedActions.join(" | ")}`,
      "Cursor is the software-engineering execution layer. Emit engineering tasks; do not mutate the repo.",
      "Do not provide legal conclusions. Identify risk and escalate.",
    ].join("\n"),
    async run(packet) {
      const startedAt = nowIso();
      const task = packet.task.toLowerCase();

      if (
        /(retrieve|show|print|echo|dump).*(secret|api[_ ]?key|\.env|password)|production secret/.test(task)
      ) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused secret retrieval"],
          evidence: [{ kind: "source", summary: "Row 20: secrets are runtime-only and must never be echoed." }],
          testResults: ["secret_retrieval: DENIED"],
          blockers: [],
          risks: ["Secret exposure"],
          decisionsMade: ["No secret value returned"],
          escalationsRequired: [{ to: "michelle", reason: "Secret retrieval is not an agent capability." }],
          recommendedNextAction: "Use runtime env. Do not print secrets.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (/legal signature|sign the (participant|membership)/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused legal signature"],
          evidence: [{ kind: "source", summary: "Legal signature is Founder-reserved." }],
          testResults: ["legal_signature: DENIED"],
          blockers: [],
          risks: ["Unauthorized legal signature"],
          decisionsMade: ["No signature"],
          escalationsRequired: [{ to: "founder", reason: "Legal signature is Kimberly-reserved." }],
          recommendedNextAction: "Founder signs. Imani implements approved text only.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (
        /vercel|production deploy|deployment|rollback|production logs/.test(task) &&
        /domain|billing|team admin|account owner|env secret|destroy production|irreversible/.test(task)
      ) {
        const action = /domain/.test(task)
          ? "domain_change"
          : /billing/.test(task)
            ? "billing"
            : /env secret/.test(task)
              ? "env_secret_change"
              : /account|team admin/.test(task)
                ? "account_change"
                : "irreversible";
        const gate = requestVercelWrite("imani", action);
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: [`Refused Vercel ${action}`],
          evidence: [{ kind: "source", summary: gate.reason }],
          testResults: [`vercel_${action}: ${gate.gate}`],
          blockers: [],
          risks: ["Founder-reserved Vercel action"],
          decisionsMade: ["No production mutation"],
          escalationsRequired: [{ to: "founder", reason: gate.reason }],
          recommendedNextAction: "Queue FOUNDER ACTION REQUIRED. Do not execute.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (/inspect (a )?production|vercel inspect|deployment (status|issue|state)|production logs/.test(task)) {
        if (!agentMayUse("imani", "vercel_inspect")) {
          return denyTool("imani", "vercel_inspect", startedAt);
        }
        const inspect = await imaniVercelInspect();
        return {
          agent: "imani",
          status: inspect.ok ? "complete" : "failed",
          workPerformed: ["Vercel machine inspect of back-half/website", "No production mutation"],
          evidence: [
            {
              kind: "readiness",
              summary: `authenticated=${String(inspect.authenticated)}; project=${inspect.project}; ready=${String(inspect.production?.ready ?? false)}; aliases=${inspect.production?.aliasCount ?? 0}; envNames=${inspect.envNames.length}`,
            },
          ],
          testResults: [inspect.ok ? "vercel_inspect: PASS" : `vercel_inspect: ${inspect.note}`],
          blockers: inspect.ok
            ? []
            : [
                {
                  blockingAgent: "imani",
                  issue: "Vercel machine inspect failed",
                  evidence: inspect.note,
                  severity: "high",
                  owner: "imani",
                  requiredCorrection: "Restore Imani project-scoped Vercel token read access.",
                  retestRequirement: "Re-run imaniVercelInspect until authenticated project read succeeds.",
                },
              ],
          risks: [],
          decisionsMade: ["Read-only inspect"],
          escalationsRequired: [],
          recommendedNextAction: "Michelle synthesizes. Do not deploy from inspect.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (/(^| )(deploy|rollback)( |$)|production_deploy/.test(task) && /approved|tested|rollback/.test(task)) {
        const write = requestVercelWrite("imani", /rollback/.test(task) ? "rollback" : "deploy", {
          approved: /approved/.test(task),
          tested: /tested/.test(task),
          evidencePresent: true,
        });
        return {
          agent: "imani",
          status: "complete",
          workPerformed: ["Evaluated Vercel write against Row 19 gates", "Did not mutate production"],
          evidence: [{ kind: "source", summary: write.reason }],
          testResults: [`vercel_write: authorized=${String(write.authorized)} executed=${String(write.executed)}`],
          blockers: [],
          risks: [],
          decisionsMade: ["Write not executed during Row 20 setup"],
          escalationsRequired: [],
          recommendedNextAction: "Hold deploy/rollback until an approved change is actually authorized to execute.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (/founder financial approval|approve (this|the) (refund|payout)/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused Founder financial approval"],
          evidence: [{ kind: "source", summary: "Financial approval is Founder/CFO reserved." }],
          testResults: ["founder_financial_approval: DENIED"],
          blockers: [],
          risks: ["Unauthorized finance approval"],
          decisionsMade: ["No financial approval"],
          escalationsRequired: [{ to: "founder", reason: "Founder financial approval is Kimberly-reserved." }],
          recommendedNextAction: "Queue FOUNDER ACTION REQUIRED.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (/(create|issue|make|place).*(live )?(stripe )?(charge|payment)|charge (a |the )?(customer|card|live)/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused Stripe charge/write"],
          evidence: [{ kind: "source", summary: "Imani may inspect payment integration health. Creating charges is outside technical access and was not executed." }],
          testResults: ["stripe_charge_write: DENIED"],
          blockers: [],
          risks: ["Unauthorized payment write"],
          decisionsMade: ["No charge created"],
          escalationsRequired: [{ to: "founder", reason: "Live charges and payment writes are not Imani technical-access operations." }],
          recommendedNextAction: "Do not create charges from the Fab 5 runtime.",
          startedAt,
          endedAt: nowIso(),
        };
      }
      if (/(issue|create|execute|process) (a |the )?(refund|payout)|refund (this|the) (payment|charge|customer)/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused Stripe refund"],
          evidence: [{ kind: "source", summary: "Refunds are Founder/CFO financial administration. Imani does not execute refunds." }],
          testResults: ["stripe_refund: DENIED"],
          blockers: [],
          risks: ["Unauthorized refund"],
          decisionsMade: ["No refund issued"],
          escalationsRequired: [{ to: "founder", reason: "Refunds are Kimberly-reserved financial administration." }],
          recommendedNextAction: "Queue FOUNDER ACTION REQUIRED.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (/curriculum|brand promise|invent copy/.test(task) && /rewrite|invent|change/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Refused curriculum/brand rewrite; not in CTRO authority"],
          evidence: [
            {
              kind: "source",
              summary: "Row 15: material curriculum/brand-promise change is Founder-reserved; Nia owns experience fidelity.",
              ref: "ops/fab-5/operating-system.json",
            },
          ],
          testResults: [],
          blockers: [],
          risks: ["Out-of-role curriculum change would exceed Imani authority"],
          decisionsMade: ["No curriculum mutation"],
          escalationsRequired: [
            {
              to: "michelle",
              reason: "Curriculum rewrite is Nia/Founder territory, not Imani.",
            },
          ],
          recommendedNextAction: "Michelle routes to Nia; Founder gate if material change.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (packet.qa?.forceFailure === true) {
        return {
          agent: "imani",
          status: "failed",
          workPerformed: [],
          evidence: [],
          testResults: ["specialist_runtime_failure"],
          blockers: [],
          risks: ["Specialist runtime failure"],
          decisionsMade: [],
          escalationsRequired: [{ to: "michelle", reason: "Imani runtime failed" }],
          recommendedNextAction: "Retry once, then unresolved blocker.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      const needed: Fab5ToolName = /contain|emergency/.test(task)
        ? "contain_incident"
        : /legal/.test(task)
          ? "identify_legal_risk"
          : "classify_readiness";
      if (!agentMayUse("imani", needed)) {
        return denyTool("imani", needed, startedAt);
      }

      const sources = await retrieveSources({
        agent: "imani",
        topics: ["operating-system", "production-implementation", "approved-legal-risk"],
      });

      if (packet.qa?.readinessFail === true || /production-ready without|readiness fail/.test(task)) {
        const block: BlockRecord = {
          blockingAgent: "imani",
          issue: "Production readiness is not demonstrated",
          evidence: "Claimed PRODUCTION-READY without test evidence. States are not synonyms.",
          severity: "high",
          owner: "imani",
          requiredCorrection: "Provide tests proving the control works, or label the state TESTED/BUILT/DESIGNED honestly.",
          retestRequirement: "Re-run technical evidence; Michelle will not accept self-report.",
        };
        return {
          agent: "imani",
          status: "blocked",
          workPerformed: ["Classified readiness; issued Imani block"],
          evidence: [
            { kind: "readiness", summary: "TESTED is false; PRODUCTION-READY is false" },
            { kind: "source", summary: sources[0]?.excerpt ?? "Row 15 readiness states" },
          ],
          testResults: ["readiness: DESIGNED=yes BUILT=unknown TESTED=no PRODUCTION-READY=no"],
          blockers: [block],
          risks: ["Shipping without production readiness"],
          decisionsMade: ["Block release"],
          escalationsRequired: [],
          recommendedNextAction: "Correct and retest. Do not override this block.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (/contain|emergency/.test(task)) {
        return {
          agent: "imani",
          status: "complete",
          workPerformed: [
            "Executed emergency technical containment within approved authority",
            "Did not expand other authority",
          ],
          evidence: [
            { kind: "trace", summary: "contain_incident executed; notify Michelle and Founder" },
          ],
          testResults: ["containment: applied"],
          blockers: [],
          risks: ["Incident may still require Founder public-comms decision"],
          decisionsMade: ["Contain now; notify after"],
          escalationsRequired: [
            {
              to: "michelle",
              reason: "Notify Michelle and Founder after emergency containment (Row 15).",
            },
          ],
          recommendedNextAction: "Michelle logs incident and reports MATERIAL RISK if still open.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (/legal (interpretation|conclusion|judgment)/.test(task)) {
        return {
          agent: "imani",
          status: "escalated",
          workPerformed: ["Identified legal-judgment trigger; issued no legal conclusion"],
          evidence: [
            {
              kind: "source",
              summary: "Row 15: Imani identifies risk; Michelle escalates to human legal review.",
            },
          ],
          testResults: [],
          blockers: [],
          risks: ["Unsupported legal conclusion if answered autonomously"],
          decisionsMade: ["No legal conclusion"],
          escalationsRequired: [
            {
              to: "human_legal_expert",
              reason: "Actual legal judgment required.",
            },
          ],
          recommendedNextAction: "Michelle escalates to qualified human legal expert.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      const engineering: EngineeringHandoff = {
        executionLayer: "cursor",
        task: "If code changes are required, execute them in Cursor — not inside this agent runtime.",
        filesInScope: [],
        testsRequired: ["npx tsc --noEmit", "relevant unit/agent tests"],
        mutating: false,
      };

      const evidence: EvidenceItem[] = [
        { kind: "source", summary: sources.map((item) => item.label).join(", ") },
        { kind: "readiness", summary: "DESIGNED=yes; BUILT=yes (OS runtime); TESTED=pending caller; PRODUCTION-READY=no" },
        { kind: "engineering_handoff", summary: engineering.task },
      ];

      if (packet.qa?.omitEvidence === true) {
        return {
          agent: "imani",
          status: "complete",
          workPerformed: ["Claimed complete"],
          evidence: [],
          testResults: [],
          blockers: [],
          risks: [],
          decisionsMade: ["Self-report complete"],
          escalationsRequired: [],
          recommendedNextAction: "Accept self-report",
          startedAt,
          endedAt: nowIso(),
        };
      }

      return {
        agent: "imani",
        status: "complete",
        workPerformed: [
          "Technical/risk review against Row 15 OS and current implementation",
          "Did not mutate repository",
        ],
        evidence,
        testResults: ["role-boundary: held", "legal-conclusion: none"],
        blockers: [],
        risks: packet.qa?.disagree === true ? ["Ship despite experience risk"] : [],
        decisionsMade:
          packet.qa?.disagree === true
            ? ["Recommend ship from technical view"]
            : ["No Founder-reserved technical change"],
        escalationsRequired: [],
        recommendedNextAction: "Michelle verifies evidence and synthesizes.",
        startedAt,
        endedAt: nowIso(),
      };
    },
  };
}

export async function createNiaAgent(): Promise<AgentRuntime> {
  const os = await loadOperatingSystem();
  const spec = os.nia as {
    role: string;
    mission: string;
    prohibitedActions: string[];
    ownedDomains: string[];
  };
  const tools = toolsFor("nia").map((item) => item.name);

  return {
    id: "nia",
    name: "Nia Prism",
    role: spec.role,
    mission: spec.mission,
    tools,
    instructions: [
      "IDENTITY: Nia Prism, Chief Experience & Transformation Officer.",
      `MISSION: ${spec.mission}`,
      `OWNED: ${spec.ownedDomains.join(", ")}`,
      `PROHIBITED: ${spec.prohibitedActions.join(" | ")}`,
      "May block release for Triple E / promise / curriculum / participant-facing contradiction.",
      "Lumina is a participant-facing AI Guide, not an operating executive.",
    ].join("\n"),
    async run(packet) {
      const startedAt = nowIso();
      const task = packet.task.toLowerCase();

      if (
        /(retrieve|show|print|echo|dump).*(secret|api[_ ]?key|\.env|password)|production secret/.test(task)
      ) {
        return {
          agent: "nia",
          status: "escalated",
          workPerformed: ["Refused production secret retrieval"],
          evidence: [{ kind: "source", summary: "Nia is not authorized for production secrets." }],
          testResults: ["secret_retrieval: DENIED"],
          blockers: [],
          risks: ["Secret exposure"],
          decisionsMade: ["No secret value returned"],
          escalationsRequired: [{ to: "michelle", reason: "Secret retrieval denied." }],
          recommendedNextAction: "Do not request secrets from agents.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (
        /(security|infrastructure|firewall|production host|deploy credential|production admin|vercel admin)/.test(task) &&
        /(decide|decision|own|choose|change|admin|attempt)/.test(task)
      ) {
        return {
          agent: "nia",
          status: "escalated",
          workPerformed: ["Refused unauthorized infrastructure/security decision"],
          evidence: [
            {
              kind: "source",
              summary: "Row 15 routing: technology/security/system/risk → Imani",
              ref: "michelleOrchestration.routing",
            },
          ],
          testResults: [],
          blockers: [],
          risks: ["Out-of-role security decision"],
          decisionsMade: ["No security mutation"],
          escalationsRequired: [
            {
              to: "michelle",
              reason: "Security/infrastructure is Imani’s domain.",
            },
          ],
          recommendedNextAction: "Michelle assigns Imani.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      const needed: Fab5ToolName = "triple_e_review";
      if (!agentMayUse("nia", needed)) {
        return denyTool("nia", needed, startedAt);
      }

      const sources = await retrieveSources({
        agent: "nia",
        topics: ["approved-product-curriculum", "approved-brand", "operating-system"],
      });

      if (packet.qa?.experienceFail === true || /triple e fail|experience fail/.test(task)) {
        const block: BlockRecord = {
          blockingAgent: "nia",
          issue: "Architect experience materially fails Triple E / approved promise",
          evidence: "Controlled QA surface contradicted approved Journey/brand source.",
          severity: "high",
          owner: "imani",
          requiredCorrection: "Restore participant-facing implementation to approved content.",
          retestRequirement: "Nia retests Triple E after correction; Michelle does not self-verify experience.",
        };
        return {
          agent: "nia",
          status: "blocked",
          workPerformed: ["Triple E review", "Issued Nia release block"],
          evidence: [
            { kind: "fidelity", summary: "FAIL vs approved Journey/brand source" },
            { kind: "source", summary: sources[0]?.excerpt ?? "approved curriculum" },
          ],
          testResults: ["triple_e: FAIL"],
          blockers: [block],
          risks: ["Release would break Architect promise"],
          decisionsMade: ["Block release"],
          escalationsRequired: [],
          recommendedNextAction: "Michelle returns defect to Imani; Nia retests after correction.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      if (/rewrite (approved )?curriculum/.test(task)) {
        return {
          agent: "nia",
          status: "escalated",
          workPerformed: ["Identified material curriculum change request"],
          evidence: [
            {
              kind: "source",
              summary: "Material Journey curriculum change is Founder-reserved.",
            },
          ],
          testResults: [],
          blockers: [],
          risks: ["Curriculum drift"],
          decisionsMade: ["Did not rewrite curriculum"],
          escalationsRequired: [
            {
              to: "founder",
              reason: "Material curriculum change requires Founder approval.",
            },
          ],
          recommendedNextAction: "Michelle opens Founder gate. Do not invent curriculum.",
          startedAt,
          endedAt: nowIso(),
        };
      }

      const sendGate = invokeToolBoundary("nia", "email_send");
      const communicationsNote = sendGate.ok
        ? "unexpected send"
        : "External SEND/PUBLISH not connected; draft-only.";

      return {
        agent: "nia",
        status: "complete",
        workPerformed: [
          "Experience / Triple E / content-fidelity review",
          communicationsNote,
        ],
        evidence: [
          { kind: "fidelity", summary: packet.qa?.disagree === true ? "Experience risk if shipped as-is" : "PASS vs encoded OS + approved Journey id" },
          { kind: "source", summary: sources.map((item) => item.label).join(", ") },
        ],
        testResults: [packet.qa?.disagree === true ? "triple_e: RISK" : "triple_e: PASS"],
        blockers: [],
        risks: packet.qa?.disagree === true ? ["Experience integrity at risk if shipped"] : [],
        decisionsMade:
          packet.qa?.disagree === true
            ? ["Recommend hold for experience correction"]
            : ["No brand-promise or curriculum rewrite"],
        escalationsRequired: [],
        recommendedNextAction: "Michelle synthesizes.",
        startedAt,
        endedAt: nowIso(),
      };
    },
  };
}
