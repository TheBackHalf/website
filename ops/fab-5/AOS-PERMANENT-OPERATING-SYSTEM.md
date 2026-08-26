# Permanent AI Agent Operating System

**Status:** Orchestration is production-hosted. Programmatic engineering via Cursor Cloud Agents is implemented. Unattended engineering is **not verified** until `CURSOR_API_KEY` is on Vercel Production and a hosted tick has launched, polled, and ingested a Cloud Agent run. Not Founder-approved until Kimberly Walker explicitly accepts it.  
**Extends:** Accepted Fab 5 Operating System (Rows 15–19 in `ops/fab-5/operating-system.json`).  
**Does not replace:** Michelle / Imani / Nia role files, Command Center commitments, Launch Roadmap, or Founder Notes.

This is company infrastructure for the life of The Back Half. Launch Readiness is the first production workload, not a throwaway launch tool.

---

## Architecture

Workstation CLI may load Postgres names from `.env.local`. Hosted Vercel already injects `POSTGRES_URL`. This workstation currently cannot decrypt Vercel sensitive env for local A–P runs; do not paste connection strings into chat.

| Layer | What it does |
|---|---|
| `aos_work_items` | Durable work queue, leases, checkpoints, evidence |
| `aos_resource_locks` | Collision prevention |
| `aos_heartbeats` | Agent health |
| `aos_founder_decisions` | Founder Decision Queue |
| `aos_notifications` | Dashboard / email / SMS delivery state |
| `aos_audit` | Reconstructable history |
| `aos_cost_events` | Action/cost accounting |
| `aos_engineering_jobs` | Durable Cursor Cloud Agent launches, polls, validation, PRs |
| Vercel Cron `GET /api/fab-5/aos/tick` | Unattended reactivation every 15 minutes (orchestration + engineering poll) |
| Cursor Cloud Agents API `https://api.cursor.com/v1/agents` | Programmatic isolated-repo engineering (official Cursor API) |
| `/ops/admin/agent-operations` | Founder/executive view |

Hosted ticks claim eligible work. **Hosted operational work** (`runtime_class=hosted`, company-objective standup items) executes read-only audits/inspects in-process and completes with durable evidence. **Engineering work** launches Cursor Cloud Agents when `CURSOR_API_KEY` is present, then polls run status. Engineering runs on an isolated `cursor/...` branch with `autoCreatePR`. AOS never silently merges or deploys failed work. Command Center / Founder-acceptance rows are never marked Complete by a hosted tick.

Cursor Desktop remains available for Founder-directed work. It is not a required runtime for AOS orchestration or engineering launch/poll once `CURSOR_API_KEY` is configured on Vercel.

If `CURSOR_API_KEY` is missing, engineering jobs are recorded as `blocked_unconfigured` (`cursor_cloud_agent_not_configured`). That is a configuration gap, not a wait-for-laptop Cursor session.

### Permanent operating agents

| Agent | Role | Hosted cycles |
|---|---|---|
| Michelle Northstar | Chief of Staff & Operations Officer | `/api/fab-5/michelle/cycle` (daily) + AOS tick |
| Imani Heartbeat | Chief Technology & Risk Officer | `/api/fab-5/imani/heartbeat` (daily) + AOS tick |
| Nia Prism | Chief Experience & Transformation Officer | `/api/fab-5/nia/cycle` (daily) + AOS tick |

**Kimberly Walker (human)** is Founder, executive authority, and escalation endpoint.  
**Kimberly Walker (AI)** is the participant-facing digital twin. Enqueueing work owned by Kimberly Walker (AI) throws `kimberly_walker_ai_is_not_an_operating_agent`. She is not a fourth execution agent.

---

## Agent role / authority matrix

Agents execute only their owned work. One agent may create a dependency for another. It may not assume ownership of another agent’s work.

| Class | Meaning in AOS |
|---|---|
| A | Routine autonomous execution |
| B | Execute within an approved plan |
| C | Material operational/financial activity; extra caution |
| D | Founder gate required before execution |

Founder contact is limited to the established A–J cases in the system-build specification (acceptance, material strategy/brand/pricing, spend, identity/MFA, legal, irreversible risk, genuine conflicts, unresolved material blockers, Go/No-Go). Routine execution, testing, formatting, and next-task selection do not contact the Founder.

---

## Orchestration / work queue

Every work item stores the specified identity, source, owner, priority, timestamps, dependencies, lease/lock state, evidence, Founder gate, next action, and error state.

Statuses: `QUEUED`, `READY`, `CLAIMED`, `RUNNING`, `BLOCKED`, `DEPENDENCY_GATED`, `DATE_GATED`, `FOUNDER_GATED`, `RETRY`, `VALIDATING`, `ACCEPTANCE_READY`, `COMPLETE`, `FAILED`, `CANCELLED`.

Sources include Command Center assignments plus recurring, schedule, system/KPI/support/product/incident/monitoring events, agent follow-up, company objectives, and cross-agent dependencies.

Command Center rows are the **initial** queue. Operational micro-tasks stay in this ledger and are not written back into the workbook.

---

## Persistent state

Checkpoints, heartbeats, leases, and audit events persist in Postgres. If a worker crashes, times out, redeploys, or the SQL client is reset, work is recovered from durable rows. Kimberly does not reconstruct context.

Imani’s original daily heartbeat inspect JSON remains the existing heartbeat cycle. The permanent **work** store for all three agents is AOS. That distinction is intentional: do not read Imani’s older `runtimeRecordsDurable: false` flag as applying to this queue.

---

## Engineering execution

Path: **AOS → authorized engineering task → Cursor Cloud Agents API → isolated branch → validation in the agent prompt → PR (no auto-merge) → durable job row → AOS ingests result → next eligible work.**

- Provider: official `POST/GET https://api.cursor.com/v1/agents` (Basic auth `CURSOR_API_KEY:`).
- Default repository: `https://github.com/TheBackHalf/website` (`AOS_ENGINEERING_REPO` override).
- `workOnCurrentBranch: false` (isolated `cursor/...` branch).
- Concurrent cloud jobs capped by `AOS_MAX_OPEN_ENGINEERING_JOBS` (default 2).
- Resource locks held while status is `VALIDATING`.
- Synthetic/controlled tests may complete after a successful run.
- Command Center and Founder-gated deliverables never auto-complete.
- Class D still opens the Founder Decision Queue before any coding launch.
- Stripe, Cloudflare DNS, and custom-domain settings are out of scope for this path.

### Founder configuration

One production secret: `CURSOR_API_KEY` on Vercel Production (and Preview if ticks run there), from Cursor Dashboard → API Keys (user or service account). The Cursor account must be allowed to launch Cloud Agents on `TheBackHalf/website` (GitHub App). After that, Kimberly does not open Cursor to start routine engineering jobs.

SMS is not required for this path. Email + dashboard remain the operational escalation channels until Twilio is authorized.

---

## Scheduling / reactivation

Verified unattended wake on the current stack is **Vercel Cron every 15 minutes** at `/api/fab-5/aos/tick`, using the same interval already proven for support inbound and monitoring. Daily Michelle / Imani / Nia cycles remain for domain work.

This is not an always-on in-process worker. Do not label the system “continuous 24/7 in-memory runtime.” Do not invent a second scheduler product.

Authorization: `CRON_SECRET` or `IMANI_HEARTBEAT_SECRET` bearer token (`authorizeHeartbeatRequest`).

---

## Concurrency / locking

- Claim uses `FOR UPDATE SKIP LOCKED`.
- Bounded concurrency: `AOS_MAX_PER_AGENT` (default 2) across all three agents in parallel.
- `resource_key` locks prevent two agents from holding the same file/config/record/deployment key.
- Independent work is not serialized.
- Idempotency key is `work_id` (primary key). Re-ingest updates title/description only; it does not reset status.

---

## Cross-agent handoffs

`createHandoff` enqueues work owned by the receiving agent with `source: cross_agent_dependency` and `parent_work_id`. Completing a dependency whose id is listed in `dependency_ids` moves waiting work from `DEPENDENCY_GATED` to `READY`. Empty `dependency_ids` are never auto-unlocked (Command Center text dependencies stay `BLOCKED` until an agent records a real work-id dependency or clears the block).

---

## Founder escalation

Open decisions persist in `aos_founder_decisions` and render at `/ops/admin/agent-operations` (admin-only). Approve / Reject / Review persist and, on Approve, release gated work and tick the orchestrator.

Unrelated work continues while gated work is paused.

---

## Notifications

| Severity | Dashboard | Email | SMS |
|---|---|---|---|
| Normal Founder decision | yes | existing Workspace SMTP | no |
| Urgent | yes | yes | Twilio adapter |

Email destination: `FOUNDER_NOTIFY_EMAIL` or `kimberly@thebackhalf.org`.  
SMS destination: `FOUNDER_NOTIFY_SMS` plus `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.

Private destinations are not rendered in client bundles or public copy. Unconfigured SMS is stored as `not_configured` and is never labeled sent. Controlled tests hold sends (`controlled_test_held`).

---

## Security / credentials

- Founder UI and `/api/admin/aos/founder-decision` require `admin:ops:access`.
- Cron tick requires heartbeat bearer auth.
- Secrets stay in server env. Twilio/Founder notify keys and `CURSOR_API_KEY` are server-only. Never log API keys.
- Kimberly Walker (AI) cannot own execution work.
- Least privilege: agents claim only their `owner_agent` rows.

---

## Failure / retry / watchdog

- Bounded retries (`max_attempts`, default 3).
- Backoff after the first retry.
- One failed item does not stop the rest of that agent’s queue.
- Stale `CLAIMED`/`RUNNING` leases are recovered to `RETRY` or `FAILED`.
- Hosted ticks never auto-complete Command Center / Founder-acceptance engineering work. Successful coding runs set `ACCEPTANCE_READY` and record the PR/branch on `aos_engineering_jobs`.
- Cursor Cloud Agent failures retry with the existing bounded policy; repeated failures isolate; unrelated work continues.
- Stale engineering jobs (>4 hours) fail/retry. Legacy `engineering_runtime_required` blocks are unblocked to `READY` so they enter the Cloud Agent path.

---

## Audit / evidence

`aos_audit` records agent, action, work item, timestamp, result, and detail. Completion evidence references live on the work row. Founder-reserved actions are reconstructable via `aos_founder_decisions`.

Synthetic tests are labeled `SYNTHETIC TEST — not real participant validation` and `controlled_test = true`.

---

## Operating costs / limits

- `aos_cost_events` records hosted inspect, synthetic execution, and Cursor Cloud Agent launch units.
- Default max 2 claims per agent per tick (`AOS_MAX_PER_AGENT`).
- Default max 2 concurrent Cloud Agent jobs (`AOS_MAX_OPEN_ENGINEERING_JOBS`).
- Action class D cannot execute without a Founder decision.
- Hosted ticks do not mark production Command Center rows Complete.

---

## Production validation

`npm run fab5:aos` runs Tests A–P plus ENG-A–L against production Postgres and writes `ops/fab-5/runs/aos-permanent-validation.json`. Production gate: `GET /api/fab-5/aos/validate` (Vercel cron / `vercel crons run`).

Command Center snapshot: `python scripts/fab-5/aos-ingest-command-center.py` reads the 8.25 Founder Command Center into `ops/fab-5/aos-command-center-snapshot.json`. Incomplete Michelle / Imani / Nia rows ingest. Kim-owned rows stay Kim-owned. Kimberly Walker (AI) is never assigned.

---

## Recovery / runbook

1. Confirm `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` on the host.
2. Confirm `CRON_SECRET` (or `IMANI_HEARTBEAT_SECRET`).
3. `GET /api/fab-5/aos/tick` with `Authorization: Bearer <secret>` (or Vercel Cron).
4. Watchdog releases stale leases; engineering jobs are polled; eligible work is claimed.
5. Resume from `checkpoint` JSON and `aos_engineering_jobs`. Do not ask Kimberly to reconstruct context.
6. Founder decisions: `/ops/admin/agent-operations`.
7. If SMS is unconfigured, urgent text records `not_configured` until the Founder authorizes a vendor. Email + dashboard remain operational.
8. If `CURSOR_API_KEY` is missing, engineering jobs persist as `blocked_unconfigured` until the key is added; the next tick relaunches them. Do not open Cursor to unstick the queue.

### Honest runtime status

Orchestration is hosted on Vercel Cron. Engineering execution is the official Cursor Cloud Agents API, not a laptop Cursor session. Unattended engineering is **not verified** until a hosted tick has launched a Cloud Agent, recorded an isolated run, ingested the result, and continued the queue — which requires `CURSOR_API_KEY` plus GitHub authorization for `TheBackHalf/website` on that Cursor account. Do not document unattended engineering as proven while that secret is absent.
