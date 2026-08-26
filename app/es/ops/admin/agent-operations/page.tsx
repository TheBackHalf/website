import type { Metadata } from "next";

import { AgentOperationsView } from "@/components/ops/agent-operations-view";
import { aosConfigured } from "@/lib/fab-5/aos/store";
import { buildAgentOperationsSnapshot } from "@/lib/fab-5/aos/snapshot";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operaciones de agentes — The Back Half",
  robots: { index: false, follow: false },
};

export default async function AgentOperationsPageEs() {
  if (!aosConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 text-bh-ink">
        <h1 className="font-display text-4xl font-medium">Operaciones de agentes</h1>
        <p className="mt-4 font-sans text-base font-light text-bh-muted">
          La orquestación durable no está conectada en este entorno.
        </p>
      </main>
    );
  }
  const snapshot = await buildAgentOperationsSnapshot(false);
  return <AgentOperationsView snapshot={snapshot} />;
}
