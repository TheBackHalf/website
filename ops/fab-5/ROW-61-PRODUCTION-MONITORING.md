# ROW-61-PRODUCTION-MONITORING

**Status:** COMPLETE. Founder Acceptance: YES. Founder Decision: APPROVED. Percent Complete: 100%.  
**Technical / risk owner:** Imani Heartbeat — Chief Technology & Risk Officer  
**Operational coordination:** Michelle Northstar — Chief of Staff & Operations Officer  
**Requirement:** Implement uptime, error, database, and payment monitoring before launch.

### Founder Acceptance record

- Founder Acceptance: YES
- Founder Decision: APPROVED
- Percent Complete: 100%
- Status: Complete
- Uptime Monitoring: PASS (preserved)
- Error Monitoring: PASS (preserved)
- Database Monitoring: PASS (preserved)
- Payment Monitoring: PASS (preserved)
- Alerting: PASS (preserved)
- Row 151 integration: PASS (preserved)
- Security/privacy protections: PASS (preserved)
- Remaining blockers: NONE
- Final status: COMPLETE
- Founder accepted: 2026-08-21

This row reuses the existing Vercel production application, Supabase Postgres, Stripe billing, `launch_ops_errors`, and Row 151 Launch Dashboard. It does not create a second Founder dashboard.

## Production targets

- Canonical domain: `https://thebackhalf.org`
- Active application origin used when the canonical domain does not resolve: the public Vercel production host already used by hosted Fab 5 validation
- Synthetic HTTP probes: `/`, `/register`, `/login`, `/checkout`, `/api/ops/health`
- Failure detection: a missing path must classify as `missing` (HTTP 404). That is not a site outage.
- Recovery: homepage HTTP 2xx after the missing-path check

Expected authentication redirects (3xx on login/checkout) are treated as healthy. 5xx and DNS/network failures on critical paths are outages.

## Automated cadence

Vercel Cron `GET /api/ops/monitoring/run` every 15 minutes, authorized with the existing `CRON_SECRET`. Public health: `GET /api/ops/health` (no secrets).

The cron becomes live on the next production deploy. Mechanical verification is executed against the live production application and production Postgres from this repository.

## Error monitoring

Existing `instrumentation.ts` `onRequestError` plus Stripe webhook `recordLaunchOpsError` plus the durable `launch_ops_errors` ledger. Controlled test errors use `test=true` and are resolved immediately after verification.

## Database monitoring

`SELECT 1` against production Supabase Postgres, then a write / read-back / delete of `launch_dashboard_meta` key `row61_db_probe_test`. Row 150 `analytics_events` is not modified.

## Payment monitoring

Stripe is the production payment provider. Monitoring uses a read-only Balance retrieve. No charge, refund, price change, or checkout-copy change is performed. The Back Half does not issue refunds; this row does not add refund monitoring.

Webhook/API failure visibility remains the existing `/api/stripe/webhook` recordings. Checkout initiation/processing failures remain `checkout_failed` / `checkout.payment_failed` events plus ops errors.

## Alerting

Critical failures write sanitized `launch_ops_errors` rows and update Row 151 availability. That drives Launch Health and Founder Attention under the existing Row 151 rules. Duplicate alerts for the same fingerprint are cooldown-limited (30 minutes). Alert payloads include environment, system, time, failure type, severity, route, and `/ops/admin/launch-dashboard` as the investigation location. They do not include secrets.

Founder escalation follows the existing Launch Dashboard protocol. Imani owns technical/risk response. Michelle coordinates operational escalation.

## Founder review

Localhost-only: `/_internal/row61-production-monitoring-review`

## Operational follow-up notes (not Row 61 blockers)

These observations were verified during Founder Acceptance Review. They remain launch follow-up notes. They were not converted into Row 61 blockers, and closure did not record them as resolved.

- `https://thebackhalf.org` did not resolve from the test workstation during acceptance testing.
- Production probes successfully verified the existing Vercel production host: `https://website-two-psi-49.vercel.app`
- `/api/ops/health` and the 15-minute monitoring execution endpoint were implemented and locally verified and require the applicable production deployment to become active on the production host.
- `STRIPE_WEBHOOK_SECRET` was not available in the workstation environment during testing; production configuration should remain part of production environment verification.
- One existing CRITICAL `registration/Error` operational record remained open and correctly caused Founder Attention = Yes. It was not automatically resolved to close Row 61.
- `AUTH_SECRET` was not available in the workstation `.env.local`; production login remained reachable during verification.

Launch Roadmap and Founder Notes were not changed by this closure.
