# ROW-151-LAUNCH-DASHBOARD

**Status:** Ready for Founder Acceptance Review. Not marked Complete.  
**Primary owner:** Michelle Northstar — Chief of Staff & Operations Officer  
**Supporting:** Imani Heartbeat — Chief Technology & Risk Officer  
**Experience patterns:** Nia Prism — Chief Experience & Transformation Officer  
**Launch date:** August 31, 2026  
**Requirement:** Create one daily dashboard for traffic, conversion, revenue, activation, errors, support, and launch risks.

---

## Dashboard location

**Founder / admin (signed in):** `/ops/admin/launch-dashboard`  
Spanish ops path: `/es/ops/admin/launch-dashboard`  
Linked from `/ops/admin`.

Marketing-only channel detail remains at `/ops/admin/launch-kpi` (Row 84). Row 151 is the consolidated daily launch command view. The two dashboards are not merged.

---

## Purpose

Answer: **Is The Back Half launch healthy today?**

The executive strip shows Launch Health (GREEN / YELLOW / RED), last updated, today's ET date, launch-day label, critical issues open, and Founder attention YES / NO.

---

## Production architecture

Production source of truth is the **existing Supabase Postgres** connection (`POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`) already used by Row 84 and Row 150.

| Store | Production tables | File override (tests / local only) |
| --- | --- | --- |
| Launch dashboard | `launch_dashboard_risks`, `launch_dashboard_availability`, `launch_dashboard_snapshots`, `launch_dashboard_support`, `launch_dashboard_meta` | `LAUNCH_DASHBOARD_DB_FILE` |
| Application/server errors | `launch_ops_errors` | same launch dashboard file (`opsErrors`) |
| Row 153 tickets | `support_tickets` | `SUPPORT_DB_FILE` |
| Traffic / product events | Row 150 `analytics_events` | `ANALYTICS_DB_FILE` |
| Marketing KPI / launch revenue mirror | Row 84 `marketing_kpi_*` | `MARKETING_KPI_DB_FILE` |

Hosted Vercel production/preview **does not** fall back to `.data/` for launch-critical dashboard, error, or support records. Unconfigured Postgres fails visibly. Local development may use a file fallback; that fallback is not the production system of record.

`.data/` may be retained for local development, fixtures, and controlled tests only.

---

## Durable data sources (seven required areas)

1. **Traffic** — Row 150 `page_viewed` / `registration_viewed` plus Row 84 landing-page sessions. Native social reach/impressions remain manual via Row 84.
2. **Conversion** — Row 150 funnel events + launch-window paid purchases (billing, reconciled to Row 84). Become an Architect / Journey explore CTAs are `cta_clicked` with existing `cta` values (`become_architect`, `journey_explore`). No new events.
3. **Revenue** — Stripe/billing is authoritative when launch-window paid records exist. Durable Row 84 `marketing_kpi_purchases` is the production Stripe mirror when the process-local billing file is empty. Browser analytics never authorizes money.
4. **Activation** — Paid launch purchaser who has started Architect onboarding (billing `userId` and/or Row 150 `purchase_completed` ∩ `onboarding_started` / onboarding store).
5. **Errors** — Row 150 product failure events **and** `launch_ops_errors` (Next.js `onRequestError` + Stripe webhook failures + `recordLaunchOpsError`).
6. **Support** — Row 153 `support_tickets` projected into the dashboard (form, email ingest, Row 83 social handoff). Ticket tracking is the Row 151 contract. Email delivery is a Row 153 capability and is not claimed working unless SMTP is configured.
7. **Launch risks** — Durable `launch_dashboard_risks` register. Manual identification. Michelle owns operational entries; Imani owns technology/security; Nia owns Architect-experience patterns where appropriate.

---

## Row 84 integration

Row 151 consumes `buildLaunchKpiDashboard` and `marketing_kpi_purchases`.

- Launch measurement begins **0 purchases / $0** at `2026-08-28T04:00:00.000Z` (Aug 28, 12:00 AM ET).
- The 19 pre-launch historical purchases are labeled **PRE-LAUNCH / HISTORICAL — EXCLUDED FROM LAUNCH KPI**.
- They are not launch purchases, launch revenue, campaign conversions, or launch-day performance.
- Campaign attribution (`source` / THE QUESTION asset ids) remains on Row 84 and is shown in Traffic.

---

## Row 150 integration

Row 151 reads the durable analytics ledger. Canonical taxonomy is unchanged. No Row 151-specific duplicate events.

Used for: traffic, registration, checkout, onboarding, journey, Lumina, downloads, completion, membership, and named product failure events.

Test events (`test=true`, `cs_test_`, `pi_test_`) are excluded from production launch reporting (`includeTest: false` on the live dashboards).

---

## Row 153 integration

Row 153 implements `support@thebackhalf.org`, the public `/support` form, `/ops/admin/support` tracking, acknowledgment, categories, priorities, SLA, and urgent escalation.

Row 151 consumes the **same ticket store**. Counts are ticket-level. Private message content is not displayed.

**Email delivery** is independent of ticket persistence. If SMTP is not configured, acknowledgments are `not_configured`. Row 151 does not call missing email delivery “working.”

---

## Billing reconciliation

Displayed launch revenue:

1. If billing has launch-window paid purchases, those figures are shown.
2. If billing is empty and Row 84 has launch-campaign purchases, Row 84 Stripe-mirrored figures are shown with a WARN.
3. If billing and Row 84 disagree, an **ERROR** quality flag is raised. The dashboard does not silently pick the larger number.
4. Row 150 `purchase_completed` is reconciled as WARN when it disagrees.

Historical purchases are shown separately and never added to launch totals.

---

## Activation definition

**Activated Architect = a paid purchaser who has started Architect onboarding.**

Payment alone is not activation. Account verification is “Account active,” not the activation bar.

Reported: Purchased → Account Active → Onboarding Started → Onboarding Completed → Journey Entered, plus purchased-not-activated and stalls.

Additional **usage signals** (not a change to the activation definition) are counted from existing Row 150 events: `lumina_opened` (today), `download_completed` (today), `journey_completed` (cumulative), `certificate_downloaded` (cumulative), `membership_activated` (cumulative). No Lumina conversation content is stored or displayed.

---

## Error architecture

`instrumentation.ts` `onRequestError` records sanitized launch-critical server failures into `launch_ops_errors`.

Stripe webhook signature/processing failures are recorded from `/api/stripe/webhook`.

Stored fields: id, fingerprint, timestamps, product area, category, severity, route/service, safe code, open/resolved, occurrence count. No passwords, tokens, payment credentials, Journey/Lumina content, emails, secrets, or unsafe stack traces.

### Severity

- **CRITICAL** — material launch surface unavailable or widespread inability to use a critical function (registration, checkout, payment, auth, those API routes).
- **HIGH** — serious functionality failure with meaningful launch impact.
- **MEDIUM** — degraded functionality, limited impact.
- **LOW** — non-critical.

Not every application error is a RED launch risk.

---

## Launch Health logic

Evaluated in `lib/launch-dashboard/health.ts`.

### RED

- Open RED launch risk, or
- Website / registration / checkout / payment marked **unavailable**, or
- Open RED security / privacy / legal risk, or
- Open **CRITICAL** application/server failure on a critical surface (website, registration, checkout, payment, auth).

### YELLOW (if not RED)

- Open YELLOW risk, or
- Elevated critical/high error volume (including ≥5 product failures today in a critical area, or open HIGH ops errors ≥3), or
- Support approaching/overdue the published 72-hour (3-day) response expectation, or
- Support backlog ≥ 10, or
- On/after Launch Day: checkout starts with payment failures and zero launch purchases, or
- Data-quality **ERROR** flags, or
- Application/server error ledger unavailable (cannot confirm GREEN).

### GREEN

No RED/YELLOW conditions.

Stale or missing error-ledger availability cannot produce false GREEN.

---

## Founder escalation

Founder attention = YES when:

- Launch Health is RED, or
- An open risk has `founderEscalationRequired`, or
- An open security / privacy / legal risk exists, or
- A critical surface is unavailable, or
- An open CRITICAL application/server failure exists on a critical surface.

Otherwise the brief states **No Founder action required.**

---

## Availability logic

**AUTOMATED (config/process probes, not synthetic uptime monitoring):**

- Website — this process is serving.
- Registration / login — `AUTH_SECRET` present.
- Checkout / payment — `STRIPE_SECRET_KEY` present.
- Journey-adjacent durability — Postgres configured.

**MANUAL:** operator outage flags on the dashboard. A more-severe manual flag wins over an automated probe.

**N/A / unreported:** Lumina has no safe automated probe. Unreported is assumed available and is **not** advertised as ping-monitored.

---

## Data freshness

Each major cell exposes: source, last updated, cadence, automated/manual, known delay, and state **CURRENT / DELAYED / STALE / N/A**.

Application/server errors are **not** Pending Source.

---

## Daily snapshots

Snapshots persist in `launch_dashboard_snapshots`. Dates before today (ET) freeze on first capture and are not overwritten. Supports August 28–31 and the immediate post-launch period. Yesterday remains retrievable after today’s data changes. A deployment must not erase Postgres snapshot rows.

---

## Daily Founder Brief

Generated from the same model (`buildDailyFounderBrief`). Structure is fixed: Date, Health, Founder Attention, Traffic, Conversion, Revenue, Activation, Errors, Support, Launch Risks, Action Required.

---

## Manual inputs

| Field | Source | Owner | Cadence |
| --- | --- | --- | --- |
| Launch risk register | Dashboard form | Michelle (ops); Imani (tech/security); Nia (experience patterns) | As identified |
| Availability outage flags | Dashboard form | Imani | When an outage is known |
| Native social metrics | Row 84 | Nia / Michelle | Daily in campaign window |
| Manual support ops records | Dashboard form (category only) | Michelle | As needed |

---

## Privacy controls

The dashboard stores and displays aggregates and operational metadata only. It does not include passwords, tokens, card data, CVV, Journey answers, assessment answers, Lumina text, support message bodies, or email addresses on the Founder view.

---

## Test-data isolation

Live dashboards call `includeTest: false`. Sandbox `cs_test_` / `pi_test_` / `test=true` records are excluded from launch reporting, snapshots used for Founder viewing, and the production brief. Controlled validation may pass `includeTest: true` in `npm run fab5:row151` only.

---

## Social support separation

Row 83 social engagement that becomes a Row 153 ticket (`source = social_row83`) is counted **once** as that ticket. Social interaction + ticket are not two support cases.

---

## Known non-critical limitations

- Not a full APM. `onRequestError` plus explicit webhook/ops recording cover launch-critical application/server failures, not every developer diagnostic.
- No dedicated onboarding error event — shown as N/A.
- Native social channel metrics remain manual (Row 84).
- Availability probes are configuration/process checks, not synthetic uptime monitoring.
- Process-local billing/auth/onboarding/journey file stores remain as implemented by those rows. Row 151 uses the durable Row 84 purchase mirror and Row 150 events for production launch figures when those file stores are empty on Vercel.
- Row 153 email delivery depends on SMTP configuration (external to Row 151 ticket integration).
- This workstation cannot decrypt Vercel Production `POSTGRES_URL`. Live hosted writes are verified by the same Postgres client already used in production when that env is present.

---

## Testing

```
npm run fab5:row151
```

Evidence: `ops/fab-5/runs/row-151-launch-dashboard-validation.json`

T1–T24 remain the isolated production-architecture suite (traffic through EN/ES routes).

D1–D18 are the Founder prompt checks. They map onto T1–T24 plus additive assertions (CTA, activation usage signals, timezone, prior-day delta, unavailable telemetry as `n/a`, middleware/API auth, sibling Row 84 / Row 150 suites, responsive classes). D15/D16 spawn `npm run fab5:row84` and `npm run fab5:row150` and write sibling evidence to `ops/fab-5/runs/row-151-row84-regression.json` and `ops/fab-5/runs/row-151-row150-regression.json` so they do not overwrite the original Row 84 / Row 150 evidence files. D16 is the isolated 16-check taxonomy/wiring suite, **not** the Row 150 persist P1–P6 hosted probe.

| Check | Maps to | What it proves |
| --- | --- | --- |
| D1 | T24 + page source | EN/ES routes exist, `force-dynamic`, noindex, `includeTest: false` |
| D2 | middleware + `requirePermission` | Unauthenticated redirect; architect/support lack `admin:ops:access`; APIs 403 without admin |
| D3 | T1–T2 | Sessions/visitors/campaign/source from Row 150 + Row 84 |
| D4 | T3–T4 + CTA counts | Funnel math; rates null when denominator is 0; existing `cta_clicked` |
| D5 | T5–T6 | Stripe/billing revenue; historical 19 excluded |
| D6 | T7 + usage events | Activation = paid ∩ onboarding started; Lumina/downloads/completion/membership from existing events |
| D7 | error ledger + onboarding N/A | Unavailable telemetry is `n/a`, not a silent 0 |
| D8 | T11–T13 | Support tickets from Row 153 store |
| D9 | T14–T16 + missing ledger | YELLOW/RED/critical-surface rules against real conditions |
| D10 | T22 | Live dashboard `includeTest: false`; `cs_test_` out of Founder reporting |
| D11 | `dateEt` America/New_York | Aug 28 00:00 ET = `2026-08-28T04:00:00.000Z` |
| D12 | traffic `versusPriorDay` | Today minus prior ET day |
| D13 | empty model + UI `n/a` | Empty rates/AOV are null; empty session count of 0 is a read of an empty ledger |
| D14 | T10 + T23 | No passwords, tokens, CVV, Journey/Lumina text, or ticket emails on the Founder view |
| D15 | sibling `fab5:row84` | Isolated Row 84 suite |
| D16 | sibling `fab5:row150` | Isolated Row 150 suite (not persist P1–P6) |
| D17 | file presence | Register/login/checkout/onboarding/journey/Lumina EN/ES still present |
| D18 | view classes | `sm:` / `lg:` grids, horizontal overflow, readable padding |

---

## 2026-08-20 completion audit

**Existing implementation preserved:** YES. The operational dashboard, Postgres stores, Row 84/150/153 sources, health rules, snapshots, brief, and T1–T24 suite were not rebuilt.

**Unnecessary rebuild performed:** NO.

### Existing implementation discovered

- `/ops/admin/launch-dashboard` and `/es/ops/admin/launch-dashboard` (`force-dynamic`, `includeTest: false`)
- `lib/launch-dashboard/*`, admin APIs under `/api/admin/launch-dashboard/*`
- Middleware `isAdminOpsPath` + `admin:ops:access`
- Isolated suite already 24/24 before this pass

### Changes actually made

1. Conversion strip now shows existing `cta_clicked` counts for Become an Architect and Journey explore.
2. Activation strip now shows existing Row 150 usage signals (Lumina opened, downloads, journey completed, certificate, membership). Activation **definition unchanged**.
3. Application/server error row uses `n/a` when the error ledger is unavailable; onboarding errors stay N/A rather than a fake 0 today.
4. Campaign/direct traffic now include prior-day deltas.
5. Validator emits D1–D18 and spawns Row 84 / Row 150 isolated suites.

### Files changed

- `lib/launch-dashboard/types.ts`
- `lib/launch-dashboard/aggregate.ts`
- `lib/launch-dashboard/health.ts`
- `lib/launch-dashboard/brief.ts`
- `components/launch-dashboard/launch-dashboard-view.tsx`
- `scripts/fab-5/row-151-validate.ts`
- `ops/fab-5/ROW-151-LAUNCH-DASHBOARD.md`
- `ops/fab-5/row-151-status.json`

### Metric → source → calculation → refresh

| Metric | Authoritative source | Calculation | Refresh |
| --- | --- | --- | --- |
| Website sessions | Row 150 `page_viewed` | Unique identity per ET day | On dashboard read |
| Unique visitors | Row 150 `page_viewed` | Unique identity | On read |
| Registration-page sessions | Row 84 landing-page sessions (fallback `registration_viewed`) | Row 84 day totals | On read |
| Acquisition / THE QUESTION | Event `source` / `campaign` plus Row 84 attribution | Count page views by source; campaign if `the-question` or IG/LI/TT | On read |
| Become an Architect CTA | Row 150 `cta_clicked` `cta=become_architect` | Unique identity that day | On read |
| Registration / checkout funnel | Row 150 `registration_*`, `checkout_started` | Unique identity per event name | On read |
| Purchases / conversion rates | Billing paid launch-window purchases; rates name their denominator | `succeeded ÷ started`; `paid ÷ landing sessions`; `paid ÷ checkout started`; null if denominator 0 | On read |
| Revenue / AOV | Stripe/billing; Row 84 purchase mirror if billing empty | Sum `amountCents`; AOV null if 0 purchases | Webhook / on read |
| Failed payments | Billing failed + `checkout_failed` | Count | On read |
| Historical 19 | Pre-`2026-08-28T04:00:00.000Z` paid | Labeled excluded; never added to launch totals | On read |
| Activation | Paid purchaser ∩ onboarding started | Unique `userId` | On read |
| Lumina / downloads / completion / membership | Existing Row 150 event names | Unique identity (today or cumulative as labeled) | On read |
| Product errors | Named Row 150 failure events | Count that ET day | On read |
| Application/server errors | `launch_ops_errors` | Open/today; **n/a if ledger unavailable** | On request error / on read |
| Onboarding errors | None implemented | Displayed N/A | n/a |
| Support | Row 153 `support_tickets` | New/open/resolved/SLA/repeat fingerprint | On ticket write / on read |
| Launch risks | Manual register + health rules | YELLOW/RED from measurable conditions; no generated copy | On save / on read |

### Production verification

- **Code-ready:** yes
- **Mechanically tested:** `npm run fab5:row151` (T1–T24 + D1–D18)
- **Production-verified:** blocked on this workstation — Vercel Production `POSTGRES_URL` cannot be decrypted here; production aliases may be deployment-protected. Isolated T20 is `file_test_override`. Implementation was not rewritten to force a hosted pass.

### Deferred / N/A

- Native social reach/impressions: manual Row 84
- Full APM / every server diagnostic
- Dedicated onboarding error event
- Synthetic uptime monitoring
- Lumina conversation content (intentionally never on this dashboard)
- Row 153 SMTP email delivery (ticket tracking is the Row 151 contract)
- Live HTTP of the protected production dashboard from this agent
- Row 150 persist P1–P6 (separate Row 150 verification blocker; not a Row 151 fail)

Row 151 is **not** marked Complete. Founder Acceptance is Kimberly’s gate.
