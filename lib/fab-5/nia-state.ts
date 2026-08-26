import type { JSONValue, TransactionSql } from "postgres";

import { michelleBackendConfigured, redactPersistError, withNiaTx } from "@/lib/fab-5/michelle-db";
import type { TouchpointEval } from "@/lib/fab-5/nia-engines";

export type NiaRunRecord = {
  runId: string;
  idempotencyKey: string;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  rowTask: string;
  sourceReferences: string[];
  plan: string[];
  result: unknown;
  nextAction: string | null;
  error: string | null;
  retryCount: number;
};

export type NiaReleaseBlock = {
  blockId: string;
  at: string;
  rowRelease: string;
  touchpoint: string;
  approvedRequirement: string;
  actualExperience: string;
  tripleEFailure: string[];
  evidence: string[];
  severity: string;
  impact: string;
  correctionRequired: string;
  owner: string;
  retestRequired: boolean;
  independentRetestPass: boolean;
  status: "open" | "resolved";
  resolvedAt: string | null;
};

async function audit(
  sql: TransactionSql,
  what: string,
  why: string,
  next?: unknown,
  previous?: unknown,
): Promise<void> {
  await sql`
    INSERT INTO michelle_audit (agent, what, why, authority, evidence, previous_state, new_state)
    VALUES (
      'nia',
      ${what},
      ${why},
      'ops/fab-5/operating-system.json nia stopBlockAuthority',
      ${sql.json([])},
      ${previous == null ? null : sql.json(previous as JSONValue)},
      ${next == null ? null : sql.json(next as JSONValue)}
    )
  `;
}

export async function persistNiaRun(run: NiaRunRecord): Promise<{ created: boolean; existing?: NiaRunRecord }> {
  return withNiaTx(async (sql) => {
    const existing = await sql`SELECT * FROM nia_runs WHERE idempotency_key = ${run.idempotencyKey}`;
    if (existing.length > 0) {
      const row = existing[0] as Record<string, unknown>;
      return {
        created: false,
        existing: {
          runId: String(row.run_id),
          idempotencyKey: String(row.idempotency_key),
          trigger: String(row.trigger),
          startedAt: new Date(String(row.started_at)).toISOString(),
          completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
          status: String(row.status),
          rowTask: String(row.row_task ?? ""),
          sourceReferences: [],
          plan: [],
          result: row.result ?? null,
          nextAction: row.next_action ? String(row.next_action) : null,
          error: row.error ? String(row.error) : null,
          retryCount: Number(row.retry_count ?? 0),
        },
      };
    }
    await sql`
      INSERT INTO nia_runs (
        run_id, idempotency_key, trigger, started_at, completed_at, status, row_task,
        source_references, plan, result, next_action, error, retry_count, created_by
      ) VALUES (
        ${run.runId}, ${run.idempotencyKey}, ${run.trigger}, ${run.startedAt}, ${run.completedAt},
        ${run.status}, ${run.rowTask}, ${sql.json(run.sourceReferences)}, ${sql.json(run.plan)},
        ${run.result == null ? null : sql.json(run.result as JSONValue)}, ${run.nextAction}, ${run.error},
        ${run.retryCount}, 'nia'
      )
    `;
    await audit(sql, "run", run.rowTask, { runId: run.runId });
    return { created: true };
  });
}

export async function persistExperienceEval(id: string, evalResult: TouchpointEval): Promise<void> {
  const now = new Date().toISOString();
  await withNiaTx(async (sql) => {
    await sql`
      INSERT INTO nia_experience_evals (
        eval_id, touchpoint, expected_experience, actual_experience, triple_e,
        accessibility_result, clarity_result, usability_result, content_result, functional_result,
        evidence, defects, severity, owner, correction_required, retest_required, release_impact, status, updated_at
      ) VALUES (
        ${id}, ${evalResult.touchpoint}, ${evalResult.expectedExperience}, ${evalResult.actualExperience},
        ${sql.json(evalResult.tripleE as unknown as JSONValue)}, ${evalResult.accessibilityResult},
        ${evalResult.clarityResult}, ${evalResult.usabilityResult}, ${evalResult.contentResult},
        ${evalResult.functionalResult}, ${sql.json(evalResult.evidence)}, ${sql.json(evalResult.defects)},
        ${evalResult.severity}, ${evalResult.owner}, ${evalResult.correctionRequired}, ${evalResult.retestRequired},
        ${evalResult.releaseImpact}, ${evalResult.status}, ${now}
      )
      ON CONFLICT (eval_id) DO NOTHING
    `;
    await audit(sql, "experience_eval", evalResult.touchpoint, evalResult);
  });
}

export async function persistReleaseBlock(block: NiaReleaseBlock): Promise<boolean> {
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_release_blocks (
        block_id, at, row_release, touchpoint, approved_requirement, actual_experience, triple_e_failure,
        evidence, severity, impact, correction_required, owner, retest_required, independent_retest_pass, status, resolved_at
      ) VALUES (
        ${block.blockId}, ${block.at}, ${block.rowRelease}, ${block.touchpoint}, ${block.approvedRequirement},
        ${block.actualExperience}, ${sql.json(block.tripleEFailure)}, ${sql.json(block.evidence)}, ${block.severity},
        ${block.impact}, ${block.correctionRequired}, ${block.owner}, ${block.retestRequired},
        ${block.independentRetestPass}, ${block.status}, ${block.resolvedAt}
      )
      ON CONFLICT (block_id) DO UPDATE SET
        independent_retest_pass = EXCLUDED.independent_retest_pass,
        status = EXCLUDED.status,
        resolved_at = EXCLUDED.resolved_at
      RETURNING block_id
    `;
    await audit(sql, "release_block", block.touchpoint, block);
    return rows.length > 0;
  });
}

export async function persistFinding(id: string, kind: string, payload: unknown): Promise<void> {
  const now = new Date().toISOString();
  await withNiaTx(async (sql) => {
    await sql`
      INSERT INTO nia_findings (finding_id, kind, payload, status, updated_at)
      VALUES (${id}, ${kind}, ${sql.json(payload as JSONValue)}, 'open', ${now})
      ON CONFLICT (finding_id) DO NOTHING
    `;
    await audit(sql, "finding", kind, payload);
  });
}

export async function persistInnovation(id: string, kind: string, payload: unknown, launch: string): Promise<void> {
  const now = new Date().toISOString();
  await withNiaTx(async (sql) => {
    await sql`
      INSERT INTO nia_innovation (item_id, kind, payload, launch_requirement, status, updated_at)
      VALUES (${id}, ${kind}, ${sql.json(payload as JSONValue)}, ${launch}, 'open', ${now})
      ON CONFLICT (item_id) DO NOTHING
    `;
    await audit(sql, "innovation", kind, payload);
  });
}

export async function persistNiaRetry(key: string, retryCount: number, lastError: string, status: string): Promise<void> {
  const now = new Date().toISOString();
  await withNiaTx(async (sql) => {
    await sql`
      INSERT INTO nia_retry_state (key, retry_count, last_error, status, updated_at)
      VALUES (${key}, ${retryCount}, ${lastError}, ${status}, ${now})
      ON CONFLICT (key) DO UPDATE SET
        retry_count = EXCLUDED.retry_count,
        last_error = EXCLUDED.last_error,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `;
    await audit(sql, "retry_state", status, { key, retryCount });
  });
}

export async function incrementNiaRetry(key: string, lastError: string): Promise<{ retryCount: number; status: string }> {
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_retry_state (key, retry_count, last_error, status, updated_at)
      VALUES (${key}, 1, ${lastError}, 'retrying', ${new Date().toISOString()})
      ON CONFLICT (key) DO UPDATE SET
        retry_count = nia_retry_state.retry_count + 1,
        last_error = EXCLUDED.last_error,
        status = CASE WHEN nia_retry_state.retry_count + 1 >= 2 THEN 'exhausted' ELSE 'retrying' END,
        updated_at = EXCLUDED.updated_at
      RETURNING retry_count, status
    `;
    return { retryCount: Number(rows[0]?.retry_count ?? 1), status: String(rows[0]?.status ?? "retrying") };
  });
}

export async function getNiaRun(id: string): Promise<NiaRunRecord | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_runs WHERE run_id = ${id}`;
    if (!rows[0]) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      runId: String(row.run_id),
      idempotencyKey: String(row.idempotency_key),
      trigger: String(row.trigger),
      startedAt: new Date(String(row.started_at)).toISOString(),
      completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
      status: String(row.status),
      rowTask: String(row.row_task ?? ""),
      sourceReferences: [],
      plan: [],
      result: row.result ?? null,
      nextAction: row.next_action ? String(row.next_action) : null,
      error: row.error ? String(row.error) : null,
      retryCount: Number(row.retry_count ?? 0),
    };
  });
}

export async function getExperienceEval(id: string): Promise<Record<string, unknown> | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_experience_evals WHERE eval_id = ${id}`;
    return rows[0] ? (rows[0] as Record<string, unknown>) : null;
  });
}

export async function getReleaseBlock(id: string): Promise<NiaReleaseBlock | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_release_blocks WHERE block_id = ${id}`;
    if (!rows[0]) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      blockId: String(row.block_id),
      at: new Date(String(row.at)).toISOString(),
      rowRelease: String(row.row_release),
      touchpoint: String(row.touchpoint),
      approvedRequirement: String(row.approved_requirement),
      actualExperience: String(row.actual_experience),
      tripleEFailure: Array.isArray(row.triple_e_failure) ? (row.triple_e_failure as string[]) : [],
      evidence: Array.isArray(row.evidence) ? (row.evidence as string[]) : [],
      severity: String(row.severity),
      impact: String(row.impact),
      correctionRequired: String(row.correction_required),
      owner: String(row.owner),
      retestRequired: Boolean(row.retest_required),
      independentRetestPass: Boolean(row.independent_retest_pass),
      status: String(row.status) as "open" | "resolved",
      resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : null,
    };
  });
}

export async function getFinding(id: string): Promise<Record<string, unknown> | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_findings WHERE finding_id = ${id}`;
    return rows[0] ? (rows[0] as Record<string, unknown>) : null;
  });
}

export async function getInnovation(id: string): Promise<Record<string, unknown> | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_innovation WHERE item_id = ${id}`;
    return rows[0] ? (rows[0] as Record<string, unknown>) : null;
  });
}

export async function getNiaRetry(key: string): Promise<{ retryCount: number; status: string } | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_retry_state WHERE key = ${key}`;
    if (!rows[0]) return null;
    return { retryCount: Number(rows[0].retry_count), status: String(rows[0].status) };
  });
}

export async function resolveControlledNia(key: string): Promise<void> {
  const now = new Date().toISOString();
  await withNiaTx(async (sql) => {
    await sql`UPDATE nia_release_blocks SET status = 'resolved', resolved_at = ${now}, independent_retest_pass = TRUE WHERE block_id = ${`nrb-${key}`}`;
    await audit(sql, "resolve_controlled_test", key, { key });
  });
}

export async function persistResearchRequest(row: {
  researchId: string;
  idempotencyKey: string;
  requestedAt: string;
  requestingExecutive: string;
  topic: string;
  question: string;
  whyNeeded: string;
  freshnessRequirement: string;
  sourcePriority: string[];
  searchPlan: string[];
  maxSearchBudget: number;
  origin: string;
  status: string;
  result: unknown;
  usage: unknown;
}): Promise<{ created: boolean; existingId?: string }> {
  return withNiaTx(async (sql) => {
    const existing = await sql`SELECT research_id FROM nia_research_requests WHERE idempotency_key = ${row.idempotencyKey}`;
    if (existing[0]) {
      return { created: false, existingId: String(existing[0].research_id) };
    }
    await sql`
      INSERT INTO nia_research_requests (
        research_id, idempotency_key, requested_at, requesting_executive, topic, question, why_needed,
        freshness_requirement, source_priority, search_plan, max_search_budget, origin, status, result, usage
      ) VALUES (
        ${row.researchId}, ${row.idempotencyKey}, ${row.requestedAt}, ${row.requestingExecutive}, ${row.topic},
        ${row.question}, ${row.whyNeeded}, ${row.freshnessRequirement}, ${sql.json(row.sourcePriority)},
        ${sql.json(row.searchPlan)}, ${row.maxSearchBudget}, ${row.origin}, ${row.status},
        ${row.result == null ? null : sql.json(row.result as JSONValue)},
        ${row.usage == null ? null : sql.json(row.usage as JSONValue)}
      )
    `;
    await audit(sql, "research_request", row.question, { researchId: row.researchId });
    return { created: true };
  });
}

export async function persistResearchSources(
  sources: Array<{
    sourceId: string;
    researchId: string;
    canonicalUrl: string;
    title: string;
    publisher: string;
    url: string;
    publicationDate: string | null;
    accessedAt: string;
    sourceType: string;
    primarySecondary: string;
    relevantClaim: string;
    reliability: string;
    payload: unknown;
  }>,
): Promise<number> {
  if (sources.length === 0) return 0;
  return withNiaTx(async (sql) => {
    let inserted = 0;
    for (const source of sources) {
      const rows = await sql`
        INSERT INTO nia_research_sources (
          source_id, research_id, canonical_url, title, publisher, url, publication_date, accessed_at,
          source_type, primary_secondary, relevant_claim, reliability, payload
        ) VALUES (
          ${source.sourceId}, ${source.researchId}, ${source.canonicalUrl}, ${source.title}, ${source.publisher},
          ${source.url}, ${source.publicationDate}, ${source.accessedAt}, ${source.sourceType},
          ${source.primarySecondary}, ${source.relevantClaim}, ${source.reliability},
          ${sql.json(source.payload as JSONValue)}
        )
        ON CONFLICT (canonical_url) DO NOTHING
        RETURNING source_id
      `;
      if (rows.length > 0) inserted += 1;
    }
    return inserted;
  });
}

export async function persistCompetitiveIntel(row: {
  intelligenceId: string;
  researchId: string;
  at: string;
  competitorOrCategory: string;
  observation: string;
  payload: unknown;
  status: string;
}): Promise<boolean> {
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_competitive_intel (
        intelligence_id, research_id, at, competitor_or_category, observation, payload, status
      ) VALUES (
        ${row.intelligenceId}, ${row.researchId}, ${row.at}, ${row.competitorOrCategory}, ${row.observation},
        ${sql.json(row.payload as JSONValue)}, ${row.status}
      )
      ON CONFLICT (intelligence_id) DO NOTHING
      RETURNING intelligence_id
    `;
    if (rows.length > 0) await audit(sql, "competitive_intel", row.competitorOrCategory, row.payload);
    return rows.length > 0;
  });
}

export async function persistWatchlistEntity(row: {
  entityId: string;
  name: string;
  reason: string;
  evidence: unknown;
  status: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_watchlist (entity_id, name, reason, evidence, status, updated_at)
      VALUES (${row.entityId}, ${row.name}, ${row.reason}, ${sql.json(row.evidence as JSONValue)}, ${row.status}, ${now})
      ON CONFLICT (name) DO NOTHING
      RETURNING entity_id
    `;
    return rows.length > 0;
  });
}

export async function persistTrendRadar(row: {
  trendId: string;
  trend: string;
  domain: string;
  payload: unknown;
  nextReviewAt: string;
}): Promise<boolean> {
  const now = new Date().toISOString();
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_trend_radar (trend_id, trend, domain, payload, next_review_at, updated_at)
      VALUES (${row.trendId}, ${row.trend}, ${row.domain}, ${sql.json(row.payload as JSONValue)}, ${row.nextReviewAt}, ${now})
      ON CONFLICT (trend_id) DO UPDATE SET payload = EXCLUDED.payload, next_review_at = EXCLUDED.next_review_at, updated_at = EXCLUDED.updated_at
      RETURNING trend_id
    `;
    return rows.length > 0;
  });
}

export async function persistOpportunity(row: {
  opportunityId: string;
  researchId: string;
  opportunity: string;
  classification: string;
  payload: unknown;
}): Promise<boolean> {
  const now = new Date().toISOString();
  return withNiaTx(async (sql) => {
    const rows = await sql`
      INSERT INTO nia_opportunities (opportunity_id, research_id, opportunity, classification, payload, updated_at)
      VALUES (${row.opportunityId}, ${row.researchId}, ${row.opportunity}, ${row.classification}, ${sql.json(row.payload as JSONValue)}, ${now})
      ON CONFLICT (opportunity_id) DO NOTHING
      RETURNING opportunity_id
    `;
    return rows.length > 0;
  });
}

export async function getResearchRequest(id: string): Promise<Record<string, unknown> | null> {
  return withNiaTx(async (sql) => {
    const rows = await sql`SELECT * FROM nia_research_requests WHERE research_id = ${id} OR idempotency_key = ${id}`;
    return rows[0] ? (rows[0] as Record<string, unknown>) : null;
  });
}

export async function getResearchBundle(id: string): Promise<{
  request: Record<string, unknown> | null;
  sources: unknown[];
  intel: unknown[];
  trend: unknown[];
  opportunity: unknown[];
}> {
  return withNiaTx(async (sql) => {
    const request = await sql`SELECT * FROM nia_research_requests WHERE research_id = ${id} OR idempotency_key = ${id}`;
    const researchId = request[0] ? String(request[0].research_id) : id;
    const sources = await sql`SELECT * FROM nia_research_sources WHERE research_id = ${researchId}`;
    const intel = await sql`SELECT * FROM nia_competitive_intel WHERE research_id = ${researchId}`;
    const trend = await sql`SELECT * FROM nia_trend_radar WHERE trend_id LIKE ${`${researchId}%`} LIMIT 8`;
    const opportunity = await sql`SELECT * FROM nia_opportunities WHERE research_id = ${researchId}`;
    return {
      request: request[0] ? (request[0] as Record<string, unknown>) : null,
      sources: [...sources],
      intel: [...intel],
      trend: [...trend],
      opportunity: [...opportunity],
    };
  });
}

export { michelleBackendConfigured as niaBackendConfigured, redactPersistError };
