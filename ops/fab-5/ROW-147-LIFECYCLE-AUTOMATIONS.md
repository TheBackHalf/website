# ROW 147 — Build Lifecycle Automations

**Status:** Implemented for Founder review. Founder Acceptance: NOT recorded. Row is not marked Complete.  
**AOS work ID:** al-147  
**Primary owner:** Imani Heartbeat  
**Supporting:** Nia Prism (participant-facing language), Michelle Northstar (support operations)  
**Launch date:** August 31, 2026  
**Workstream:** Email, Analytics, Support & Architect Experience  
**Requirement:** Connect account, payment, progress, inactivity, completion, membership, billing, and support triggers.

This document is the execution record for the approved Row 143 automation map. It does not change curriculum, brand voice, or Founder-facing marketing copy. It does not configure Stripe, Cloudflare DNS, Vercel custom domains, or thebackhalf.org nameservers.

---

## What was connected

Platform events already emitted by registration, Stripe webhooks, Journey progress, onboarding, and support ticketing now dispatch into a first-party lifecycle ledger (`lifecycle_dispatches` in Postgres in production; isolated file store in tests).

| Family | Trigger | Automation | Delay | Delivery |
| --- | --- | --- | --- | --- |
| Account | Verification email sent | `account.verification` | 0 | Existing sender |
| Account | Password reset requested | `account.password_reset` | 0 | Existing sender |
| Account | Email verified / Google verified | `account.verified` | 0 | Ledger only (session already established) |
| Payment | Payment succeeded | `payment.confirmed` | 0 | Existing billing notification |
| Payment | Payment failed | `payment.failed` | 0 | Existing billing notification |
| Payment | Refund processed | `payment.refunded` | 0 | Existing billing notification |
| Progress | Onboarding completed | `progress.onboarding_completed` | 0 | Lifecycle SMTP |
| Progress | Chapter completed | `progress.chapter_completed` | 0 | Lifecycle SMTP |
| Inactivity | No Journey progress for 7 days | `inactivity.journey_nudge` | 7 days | Lifecycle SMTP via daily cron |
| Completion | Journey completed | `completion.journey_completed` | 0 | Lifecycle SMTP |
| Membership | Community activated | `membership.activated` | 0 | Existing billing notification |
| Membership | Community canceled | `membership.canceled` | 0 | Existing billing notification |
| Membership | Recurring invoice paid | `membership.renewed` | 0 | Lifecycle SMTP |
| Billing | Entitlement past_due without a concurrent payment-failed email | `billing.past_due` | 0 | Lifecycle SMTP |
| Support | Ticket created | `support.acknowledged` | 0 | Existing support acknowledgment |

Machine-readable map: `lib/lifecycle/catalog.ts`.

---

## Fallback and success measures

- SMTP missing: product flow continues; dispatch is recorded as `skipped_not_configured`.
- Send failure: recorded as `failed`; entitlements, progress, and tickets are not rolled back.
- Webhook / progress retries: unique `idempotency_key`; duplicates become `skipped_duplicate`.
- Payload sanitization drops email, tokens, passwords, and free-text before the ledger write.
- Lifetime Blueprint access is not revoked by Community cancellation or past-due notices.
- All Row 147 automations are transactional. Marketing unsubscribe/suppression remains a later row.

---

## Hosted scan

Authenticated cron `GET/POST /api/lifecycle/run` (`CRON_SECRET` / heartbeat secret) runs the 7-day inactivity scan daily at 16:00 UTC. The response reports counts only — no recipient email addresses.

---

## Validation

`npm run fab5:row147` writes `ops/fab-5/runs/row-147-lifecycle-automations-validation.json`.

Founder acceptance stays with Kimberly Walker (human).
