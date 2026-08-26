# ROW-73-VENDOR-CAPACITY-BILLING

**Status:** NOT READY FOR FOUNDER ACCEPTANCE. Not Complete.  
**Vendor inventory:** Row 72 `ops/fab-5/vendor-saas-register.json` (do not maintain a second register).  
**Founder review:** http://localhost:3000/_internal/row73-vendor-capacity-billing-review  
**Validation:** `ops/fab-5/runs/row-73-vendor-capacity-billing-validation.json`  
**Generated:** 2026-08-25

Technical / risk owner: Imani Heartbeat — Chief Technology & Risk Officer  
Operational coordination: Michelle Northstar — Chief of Staff & Operations Officer  
Human billing owner: Kimberly M. Walker — Founder

This file is a readable projection of the Row 73 verification. It is not a vendor register.

## 1. Vendor inventory

Launch-critical vendors are those in the Row 72 register with `launchCritical` starting YES. No vendors were invented.

| Vendor | Launch function | Rating |
|---|---|---|
| Vercel | Hosting, registration UI, Lumina UI, cron, static media | YELLOW |
| Supabase Postgres | Durable analytics / tickets / Fab 5 / dashboard | YELLOW |
| Stripe | Checkout / webhooks / live payments | RED |
| Google Workspace | SMTP / support mailbox | YELLOW |
| OpenAI | Fab 5 hosted agents (not Lumina) | YELLOW |
| HeyGen | Pre-rendered Founder media production only | GREEN (non-runtime) |
| Cursor | Founder IDE + AOS Cloud Agents | YELLOW |
| GitHub | Source / deploy origin | GREEN |
| Domain / DNS thebackhalf.org | Canonical public URL | RED (Row 75) |
| Instagram @backhalfco | Launch communications | GREEN |
| TikTok @backhalfco | Launch communications | GREEN |

Explicitly not launch runtime: ElevenLabs, Resend, Kit, GA4, Clarity, Apple Sign-In, LinkedIn, YouTube, Twilio/SMS (no TWILIO_* on Vercel Production), Google Sign-In OAuth (optional; GOOGLE_CLIENT_* absent).

## 2. Capacity / billing matrix

See the Founder review page and `row-73-vendor-capacity-billing-validation.json` for the full per-vendor fields (plan, billing, payment method, quotas, rate limits, health, credentials, failure impact).

Plan names, payment-card status, and remaining quota dollars are **FOUNDER VERIFICATION REQUIRED** wherever a vendor console was not opened. This row did not purchase plans or change payment methods.

## 3. Production validation evidence

- Current Production deployment: `dpl_FtuhBQ54o6kPBdaV7KDEGTjgGzak` at `https://website-8btgaomba-back-half.vercel.app`
- Public Production host used for Stripe: `https://website-two-psi-49.vercel.app` (anonymous HTTP 200). `website-back-half.vercel.app` redirects to Vercel SSO and is not usable as a Stripe webhook host.
- `/register` `/login` `/lumina` `/support` HTTP 200 on the two-psi alias (`data-dpl-id=dpl_FtuhBQ54o6kPBdaV7KDEGTjgGzak`)
- `/api/ops/health` HTTP 200 `{ ok:true, environment:production, checks.application:ok, checks.database:ok }`
- POST `/api/stripe/webhook` HTTP 503 `{ error: webhook_not_configured }` — route is reachable; signing secret is absent
- Vercel Production env **names** present (values not printed): AUTH_SECRET, POSTGRES_URL, POSTGRES_URL_NON_POOLING, STRIPE_SECRET_KEY, OPENAI_API_KEY, SMTP_*, CRON_SECRET, Supabase/Postgres cluster names
- Vercel Production env **names** absent: STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BLUEPRINT, STRIPE_PRICE_BUNDLE, STRIPE_PRICE_COMMUNITY, CURSOR_API_KEY
- Runtime classification of Production `STRIPE_SECRET_KEY` (value not printed): **Test/Sandbox, not Live**. Live product catalog cannot be read with this key. Sandbox price IDs from `.env.example` were not copied.
- DNS-over-HTTPS: SOA + Cloudflare NS; apex A/AAAA count 0. DNS was not changed (Row 75).
- 28 Founder mp4 files under `public/videos`
- Row 153 SMTP delivery PASS (2026-08-21) reused; no live mail sent
- Stripe tax-ID review was not opened or modified

## 4. Risks / remediations

Corrected in this pass (safe):

- Confirmed the public Production webhook host is `website-two-psi-49.vercel.app` (SSO does not intercept it)
- Classified Production `STRIPE_SECRET_KEY` as Test/Sandbox without printing it
- Refused to attach Live prices or a Live webhook to a Test key
- Did not copy sandbox price IDs
- Did not change tax-ID review, legal identity, banking, payout, support details, DNS, or AOS credentials

Not done (blocked):

- Did not retrieve Live price IDs (Live API is not the key on Production)
- Did not create a Live webhook
- Did not add `STRIPE_PRICE_*` or `STRIPE_WEBHOOK_SECRET`
- Did not overwrite Production `STRIPE_SECRET_KEY` (no Live key is available on this workstation; Stripe CLI Live auth needs re-login; Dashboard was not signed in)
- Did not add `CURSOR_API_KEY`

## 5. Remaining Founder actions

1. **Stripe (blocks live purchase / Row 73):** In Stripe Dashboard switch to **Live** (not Test) → Developers → API keys. Copy the Live secret key. In Vercel → Project → Settings → Environment Variables, replace Production `STRIPE_SECRET_KEY` with that Live key (Sensitive). Do not paste the key into chat. Then re-run Row 73 so the three approved Live prices and the Live webhook secret can be connected to `https://website-two-psi-49.vercel.app/api/stripe/webhook`. Confirm tax-ID review status without changing legal/tax identity. Do not create a charge, refund, or payout. **Consequence if skipped:** live Checkout cannot start.

2. **Vercel Billing (does not block this row):** Confirm active payment method, no past-due balance, and plan/cron/bandwidth headroom through August 31.

3. **Supabase Billing (does not block this row):** Confirm project not paused and database/storage/connection usage within plan.

4. **Google Workspace Billing (does not block this row):** Confirm Workspace billing and that support@ / kimberly@ remain enabled. Do not change MX/DNS.

5. **OpenAI Billing (does not block customer Lumina):** Confirm API billing/payment method and usage headroom for Fab 5 hosted cycles.

6. **Cursor / AOS (does not block customer launch):** Add `CURSOR_API_KEY` to Vercel Production if unattended Cloud Agent engineering is required.

7. **Row 75 (canonical URL; not mutated here):** Attach A/AAAA (or CNAME) for thebackhalf.org / www. Confirm registrar auto-renew. Do not change DNS from Row 73.

## 6. Final launch-readiness determination

Row 73 is **NOT READY** because a launch-critical vendor (Stripe) is RED: Production is wired to Stripe Test/Sandbox, and Live price IDs / webhook secret are absent.

Canonical DNS remains an Actual Launch Blocker assigned to **Row 75**. Domain RED is not used to close Row 73 by changing DNS.

Do not mark Row 73 Complete. Do not record Founder acceptance.
