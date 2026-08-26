/**
 * Official OpenAI Agents SDK wiring for the Fab 5.
 * Live model calls require OPENAI_API_KEY (not embedded in instructions).
 * Live inference uses lib/fab-5/live-runner.ts — the same three-agent manager-as-tools architecture.
 */
import { Agent } from "@openai/agents";

import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";
import { createMichelleAgent } from "@/lib/fab-5/michelle";

export { createLiveFab5Agents, runLiveMichelleCommand } from "@/lib/fab-5/live-runner";

export async function createFab5OpenAIAgents() {
  const [michelleRuntime, imaniRuntime, niaRuntime] = await Promise.all([
    createMichelleAgent(),
    createImaniAgent(),
    createNiaAgent(),
  ]);

  const imani = new Agent({
    name: imaniRuntime.name,
    handoffDescription: "Chief Technology & Risk Officer — architecture, security, readiness, incident containment.",
    instructions: imaniRuntime.instructions,
  });

  const nia = new Agent({
    name: niaRuntime.name,
    handoffDescription: "Chief Experience & Transformation Officer — Triple E, curriculum fidelity, brand.",
    instructions: niaRuntime.instructions,
  });

  const michelle = Agent.create({
    name: michelleRuntime.name,
    instructions: [
      michelleRuntime.instructions,
      "Stay in control as manager. Call specialists as tools. Do not treat Lumina or Kimberly as operating agents.",
    ].join("\n"),
    tools: [
      imani.asTool({
        toolName: "consult_imani",
        toolDescription: "Assign a structured technology/risk packet to Imani Heartbeat.",
      }),
      nia.asTool({
        toolName: "consult_nia",
        toolDescription: "Assign a structured experience/Triple E packet to Nia Prism.",
      }),
    ],
  });

  return { michelle, imani, nia, runtimes: { michelle: michelleRuntime, imani: imaniRuntime, nia: niaRuntime } };
}

export function openaiLiveModelConfigured(): boolean {
  return loadFab5OpenAiEnv().keyPresent;
}
