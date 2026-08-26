import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

type EvalEvidence = {
  overall?: string;
  allPassed?: boolean;
  results?: Array<{ category: string; status: string; error?: string }>;
  latency?: { p50Ms?: number; p95Ms?: number; maxMs?: number } | null;
  cost?: { provider?: string; estimatedUsd?: number } | null;
};

export default async function Row180LuminaEvalReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  let evidence: EvalEvidence | null = null;
  try {
    const raw = await readFile(
      path.join(
        process.cwd(),
        "ops/fab-5/runs/row-180-lumina-evaluation-2026-08-26.json",
      ),
      "utf8",
    );
    evidence = JSON.parse(raw) as EvalEvidence;
  } catch {
    evidence = null;
  }

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink"
      data-bh-temp-qa="row180-lumina-eval-review"
    >
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-2 font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
          TEMPORARY LOCAL QA — ROW 180 LUMINA EVALUATION
        </p>
        <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
          Row 180 — Run Lumina Evaluation
        </h1>
        <p className="mt-4 font-sans text-sm font-light leading-relaxed text-bh-muted">
          Voice, memory, safety, bilingual, relevance, hallucination, latency,
          and escalation evidence from `npm run eval:lumina`. Curriculum was not
          changed. Row 180 is not marked Complete.
        </p>
        {!evidence ? (
          <p className="mt-8 font-sans text-sm">
            Evidence file not found yet. Run the evaluation suite first.
          </p>
        ) : (
          <>
            <p className="mt-6 font-sans text-sm font-medium">
              Overall: {evidence.overall ?? (evidence.allPassed ? "PASS" : "FAIL")}
            </p>
            <ul className="mt-6 space-y-2 font-sans text-sm">
              {(evidence.results ?? []).map((result) => (
                <li key={result.category}>
                  {result.category}: {result.status}
                  {result.error ? ` — ${result.error}` : ""}
                </li>
              ))}
            </ul>
            {evidence.latency ? (
              <p className="mt-6 font-sans text-sm text-bh-muted">
                Latency p50 {evidence.latency.p50Ms}ms · p95{" "}
                {evidence.latency.p95Ms}ms · max {evidence.latency.maxMs}ms
              </p>
            ) : null}
            {evidence.cost ? (
              <p className="mt-2 font-sans text-sm text-bh-muted">
                Cost provider {evidence.cost.provider} · estimatedUsd{" "}
                {evidence.cost.estimatedUsd}
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
