# ROW 84 — Launch Marketing KPI Dashboard

**Status:** Ready for Founder Acceptance Review. Not marked Complete.  
**Verification:** 2026-08-21 existing-dashboard verification. LinkedIn is a future enhancement and is not required for launch KPI reporting.  
**Primary owner:** Nia Prism  
**Supporting:** Imani Heartbeat (implementation), Michelle Northstar (verification / routing)  
**Launch date:** August 31, 2026  
**Campaign:** The Back Half Social Launch — THE QUESTION — August 28–31, 2026

---

## Dashboard location

**Founder / admin (signed in):** `/ops/admin/launch-kpi`  
Spanish ops path: `/es/ops/admin/launch-kpi`  
Linked from `/ops/admin`.

Runtime ledger (production): **Supabase Postgres** via the existing `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` connection (same approved production database used by Michelle/Nia durable ops). Tables: `marketing_kpi_events`, `marketing_kpi_social_daily`, `marketing_kpi_purchases`, `marketing_kpi_meta`.

`.data/marketing-kpi/` is **not** the production source of truth. A file override exists only for isolated mechanical tests (`MARKETING_KPI_DB_FILE`).

---

## Purpose

Measure the August 28–31 social launch and August 31 conversion funnel from one place:

**REACH → ENGAGEMENT → LINK CLICK → LANDING-PAGE SESSION → CHECKOUT START → PURCHASE**

No new marketing channel. No new analytics vendor. No change to archived Row 81 creatives. Public destination remains `https://thebackhalf.org/register`.

**Active launch reporting channels:** Instagram and TikTok.  
**LinkedIn:** future enhancement. Historical LinkedIn structures and any stored LinkedIn rows are preserved. LinkedIn is **not** required for launch KPI reporting. The database was not redesigned to remove LinkedIn.

---

## KPIs, formulas, sources

The dashboard embeds the full KPI dictionary. Source of truth for definitions: `lib/marketing-kpi/dictionary.ts`.

| KPI | Formula | Source | Owner |
|---|---|---|---|
| Reach | Sum of entered native reach | Instagram / TikTok insights (manual). LinkedIn optional if later entered. | Nia enters; Michelle verifies |
| Impressions / views | Sum of entered native impressions/views | Native insights (manual) | Nia / Michelle |
| Engagements | Sum of entered native engagements | Native insights (manual) | Nia / Michelle |
| Engagement rate | Engagements ÷ Impressions | Calculated | Calculated |
| Follower growth | Current followers − baseline | Native profile vs baseline.json | Nia / calculated |
| Link clicks | Sum of entered native link/profile clicks | Native insights (manual) | Nia / Michelle |
| Landing-page sessions | Count of `/register` and `/es/register` first-party events | Marketing KPI ledger | Imani implements |
| Email signups | **N/A — No Separate Launch Email Signup Mechanism** | None on the launch path | n/a |
| Checkout starts | Count of Stripe Checkout sessions created | `createCheckoutSession` | Imani |
| Purchases | Count of paid checkout purchases | Stripe webhook → ledger | Imani |
| Click-through rate | Link clicks ÷ impressions | Calculated | Calculated |
| Landing-page continuation | Landing-page sessions ÷ link clicks | Calculated (two systems; directional) | Calculated |
| Checkout-start rate | Checkout starts ÷ landing-page sessions | Calculated | Calculated |
| Purchase conversion | Purchases ÷ landing-page sessions **(overall launch conversion; denominator labeled)** | Calculated | Calculated |
| Checkout completion | Purchases ÷ checkout starts | Calculated | Calculated |

Where a platform does not provide a metric: **N/A — Not Available From Source**. Do not estimate.

Platform definitions are not treated as identical. Instagram reach ≠ LinkedIn impressions ≠ TikTok views.

---

## Attribution convention

Documented in `ops/fab-5/marketing-kpi/row-81-tracked-links.md`.

```
https://thebackhalf.org/register
  ?utm_source=instagram|linkedin|tiktok
  &utm_medium=social
  &utm_campaign=the-question
  &utm_content=R78-0828-IG   (Row 81 asset ID)
  &utm_id=2026-08-28
```

Same-browser continuation uses `sessionStorage` (`bh-mkt-attr`), then Stripe metadata `bh_utm_*`.  
Missing source is **Direct / Organic / Unknown**.

---

## Baseline methodology

File: `ops/fab-5/marketing-kpi/baseline.json`  
Captured before August 28 campaign activity. Values are not fabricated.

- Official social accounts were not live → follower baseline **0 — New Channel**; reach/impressions/engagement **unavailable**.
- No historical first-party session ledger → website traffic **unavailable**; registration sessions and checkout starts **0 — New Metric**.
- Paid purchases read from the local billing ledger at capture (19 on 2026-08-19). Those 19 are **PRE-LAUNCH / HISTORICAL — EXCLUDED FROM LAUNCH KPI**.

---

## Launch reporting boundary

Campaign measurement begins **August 28, 2026 at 12:00 AM America/New_York**.

Launch Day is **August 31, 2026**.

The campaign window ends at **September 1, 2026 12:00 AM ET** (exclusive).

Classification uses payment/event timestamps, not a manually reset counter:

| Period | Label | Counts toward launch KPI |
|---|---|---|
| Before 2026-08-28 12:00 AM ET | PRE-LAUNCH BASELINE / HISTORICAL | Never |
| 2026-08-28 12:00 AM ET through 2026-08-31 | LAUNCH CAMPAIGN — AUGUST 28–31, 2026 | Yes, if not test/sandbox |
| On/after 2026-09-01 12:00 AM ET | POST-LAUNCH | Separate continuing reporting; not mixed into campaign totals |

Before any qualifying August 28 campaign activity the dashboard must show:

**Launch Purchases: 0**  
**Launch Revenue: $0**

---

## Historical-data treatment

The 19 paid purchases present in the billing ledger on August 19, 2026 are preserved. They are not deleted.

They must never be counted as:

- August 28–31 campaign purchases
- August 31 launch-day purchases
- Launch revenue
- Launch conversion
- Campaign-attributed purchases or revenue
- Launch checkout completion
- Any other launch-performance KPI

Durable copy (no user PII): `ops/fab-5/marketing-kpi/historical-paid-purchases.json`, also upserted into `marketing_kpi_purchases` with `classification=historical`.

---

## Test-data treatment

Sandbox Stripe identifiers (`cs_test_`, `pi_test_`) and explicit `test=true` records remain in the ledger for audit. They are excluded from Founder `/ops/admin/launch-kpi` totals (`includeTest: false`). They are distinguishable from production/launch-eligible rows via `classification=test` and the Stripe id prefix.

---

## Purchase/revenue reconciliation

Stripe/billing remains authoritative for payment status. The durable KPI purchase row stores the minimum needed to reconcile:

**Purchase event** ↔ **authoritative payment transaction** ↔ **campaign attribution** ↔ **dashboard reporting**

Idempotency keys: `purchase:<stripeCheckoutSessionId>` (events) and unique indexes on Stripe checkout session / payment intent (purchase ledger). Webhook retries do not double-count.

No card numbers, secrets, or prohibited payment data are stored.

---

## Data-retention behavior

Launch-critical KPI rows persist in Supabase Postgres across serverless invocations, restarts, and redeploys. Records are not rotated automatically. Historical baseline JSON in `ops/fab-5/marketing-kpi/` is kept in git as audit evidence.

---

## Migration performed

On 2026-08-19: 19 pre-launch paid billing purchases were classified as historical and snapshotted without user identifiers to `ops/fab-5/marketing-kpi/historical-paid-purchases.json`. The runtime upserts those rows into `marketing_kpi_purchases` on Supabase Postgres whenever `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` is available (Vercel Production already has these keys). Isolated mechanical tests may use `MARKETING_KPI_DB_FILE`. Temporary test events are never classified as launch-eligible. `.data/` is not the production source of truth.

Hosted round-trip for TEST D uses `POST /api/fab-5/kpi-durability` (CRON_SECRET). That route ships with this correction and is not present on the currently deployed production host until the next production deploy.

---

## Update cadence

| Data | Cadence | Freshness |
|---|---|---|
| Landing-page sessions | Near real time when the registration beacon fires | Shown as last event timestamp |
| Checkout starts | When Stripe Checkout session is created | Near real time |
| Purchases | After Stripe webhook processing | Delayed; not implied real-time |
| Native social metrics | Daily manual entry after platform refresh | Typically 24–48 hours delayed |

The dashboard always shows **Last updated**.

---

## Daily reporting procedure

1. Nia pulls native insights for the prior calendar day (ET) once the platform has refreshed.  
2. A person with `admin:ops:access` enters the numbers on the dashboard (blank = N/A).  
3. Michelle verifies against a screenshot in `ops/fab-5/social-evidence/` during launch week.  
4. Generate the daily report from the dashboard (or `GET /api/admin/marketing-kpi/daily-report?date=YYYY-MM-DD`). Do not rebuild numbers by hand.

Required days: August 28 (Day 1), 29 (Day 2), 30 (Day 3), 31 (LAUNCH DAY), then continuing daily in the launch-performance window.

---

## Manual-input requirements

**Who:** Nia owns the native-analytics pull. Entry requires the Founder/admin website role because Fab 5 agents do not have Instagram/LinkedIn/TikTok APIs (Row 76). Michelle verifies.

**What:** reach, impressions/views, engagements, followers, follower growth, link/profile clicks — per **required** channel (Instagram, TikTok) per ET date. LinkedIn may still be entered later; missing LinkedIn rows are not a launch reporting defect.

**When:** by 11:00 AM ET the following day when the platform allows; sooner if available.

**How verified:** screenshot of native insights vs the saved row. Negative numbers are rejected by the API and flagged if they appear in the ledger.

---

## Data-quality controls

- Missing daily native data for Instagram and TikTok on dates on/after August 28 that have already occurred. Missing LinkedIn native data is not a launch reporting defect.  
- Duplicate channel/date rows upsert rather than silently double-count  
- Invalid dates rejected  
- Negative counts rejected / flagged  
- Rates outside 0–500% flagged  
- Purchases without a campaign source labeled Direct / Organic / Unknown (not forced)  
- Channel landing-session totals must equal the overall total  

---

## Known limitations

1. Row 76 social accounts are not live — native metrics cannot exist until they do.  
2. GA4 / Microsoft Clarity are **not** connected. This dashboard is first-party + manual native insights.  
3. No separate email-signup mechanism on the launch path.  
4. Native link clicks will not equal first-party landing-page sessions.  
5. Asset-level **social** engagement is N/A unless a post-level native export is later entered; asset-level **site** attribution works via `utm_content`.  
6. Launch-critical KPI/billing **reporting** uses Supabase Postgres. `.data/` is not the production source of truth. Isolated tests may still use a temp file via `MARKETING_KPI_DB_FILE`.  
7. Landing-page sessions require the first-party beacon (JavaScript).  
8. TikTok remains in-scope only if the account is live.

---

## Owners

| Surface | Owner |
|---|---|
| Native social numbers | Nia Prism |
| Verification / unresolved tracking | Michelle Northstar |
| Ledger, checkout/purchase wiring, dashboard code | Imani Heartbeat |
| Founder view / acceptance | Founder |

Row 84 is **not** Complete until explicit Founder approval.
