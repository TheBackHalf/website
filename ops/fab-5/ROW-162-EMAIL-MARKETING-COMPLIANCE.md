# ROW 162 — EMAIL MARKETING COMPLIANCE AND SUPPRESSION CONTROLS

**Launch Readiness Row:** 162  
**AOS work ID:** al-162  
**Deliverable:** Implement Email Marketing Compliance and Suppression Controls  
**Owner:** Imani Heartbeat  
**Status:** Implemented in repository. Not marked Complete. Founder acceptance remains with Kimberly Walker (human).  
**Legal manuscripts:** Not rewritten. No new legal conclusion is claimed.

## What this row implements

Every non-transactional (marketing) email sent through the application must have:

1. Sender identification — The Back Half, operated by KLW Group, LLC
2. Required footer — commercial-message notice, physical postal address, privacy contact
3. Unsubscribe mechanism — signed `/unsubscribe` link plus RFC 8058 `List-Unsubscribe` / `List-Unsubscribe-Post` headers
4. Suppression behavior — unsubscribed addresses are stored and blocked from marketing sends
5. Consent/source records — explicit opt-in, founder-documented, or written consent only
6. Separation from transactional messages — account, payment, support, and Founder-ops mail do not use the marketing footer or marketing suppression list

Unsubscribe is tested end-to-end. Automations cannot re-add a suppressed recipient, including Row 86 outreach queueing.

## What this row does not do

- Does not wire Kit. Kit remains unwired.
- Does not treat Architect registration or Stripe purchase as marketing consent.
- Does not invent a production street address. Marketing sends fail closed unless `EMAIL_SENDER_PHYSICAL_ADDRESS` is set.
- Does not change Privacy Policy, Terms, or other Founder-accepted legal copy.
- Does not mark Row 162 Complete or record Founder acceptance.

## Production configuration

| Variable | Purpose |
|---|---|
| `EMAIL_SENDER_PHYSICAL_ADDRESS` | Valid physical postal address for commercial email footers. Required before any marketing send. |
| `AUTH_SECRET` or `EMAIL_UNSUBSCRIBE_SECRET` | Signs unsubscribe tokens. `AUTH_SECRET` is already required for authentication. |
| `EMAIL_MARKETING_REPLY_TO` | Optional. Defaults to `privacy@thebackhalf.org`. |

Transactional SMTP remains Google Workspace via existing `SMTP_*` variables. This row does not change Stripe, DNS, Vercel custom domains, or nameservers.

## Evidence

- Mechanical tests: `npx tsx scripts/fab-5/row-162-validate.ts`
- Review: `http://localhost:3000/_internal/row162-email-compliance-review`
- Validation JSON: `ops/fab-5/runs/row-162-email-compliance-validation.json`
