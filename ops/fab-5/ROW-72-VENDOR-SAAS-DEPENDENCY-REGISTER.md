# ROW-72-VENDOR-SAAS-DEPENDENCY-REGISTER

**Status:** COMPLETE. Founder accepted 2026-08-24. Vendor findings preserved. Canonical thebackhalf.org SOA-only DNS finding remains a Row 75 follow-up and is not marked resolved.  
**Authoritative register:** `ops/fab-5/vendor-saas-register.json`  
**Do not maintain a second register.** This file is a readable projection of that JSON.  
**Founder review:** http://localhost:3000/_internal/row72-vendor-dependency-review

Technical / risk owner: Imani Heartbeat — Chief Technology & Risk Officer  
Operational coordination: Michelle Northstar — Chief of Staff & Operations Officer  
Human account / billing owner for SaaS seats: Kimberly M. Walker — Founder  
AI executives are operational roles, not independent human credential holders.

Row 73 remains dedicated launch-critical capacity and billing verification.  
Row 74 remains credential and account recovery.  
Row 75 remains domain / DNS / SSL continuity.

## Current production architecture (not the historical Row 65 sentence)

- Website: Next.js on Vercel
- Database: Supabase Postgres
- Payments: Stripe (no refunds)
- Email: Google Workspace SMTP from support@thebackhalf.org (not Resend, not Kit)
- Analytics: first-party Rows 84 / 150 / 151 (not GA4 / Clarity)
- Auth: email/password required; Google Sign-In optional; Apple Sign-In not implemented
- Lumina: first-party scripted Guide (not OpenAI)
- Fab 5 production AI: OpenAI Agents SDK
- Founder media: static `public/videos` files (28 mp4 in this workspace); HeyGen is not a runtime API
- Instagram / TikTok: @backhalfco
- LinkedIn: not a launch requirement

## Vendors in the register

See the JSON and the Founder review page for the full field set (plan, renewal, quota, support, status, credentials, fallback, impact).

Launch-critical or named minimum vendors:

1. Vercel
2. Supabase
3. Stripe
4. Google Workspace
5. OpenAI
6. HeyGen (media production; not website runtime)
7. Cursor (Founder engineering; not website runtime)
8. GitHub
9. Domain registrar / DNS for thebackhalf.org
10. Instagram @backhalfco
11. TikTok @backhalfco

Documented non-launch-critical:

12. Google Cloud / Google Sign-In OAuth (optional)

Excluded: ElevenLabs, Resend, Kit, GA4, Clarity, Apple Sign-In, LinkedIn, YouTube, third-party APM.

## Observed launch-domain fact

On 2026-08-24 this workstation resolved an SOA for `thebackhalf.org` and no A/AAAA. The verified application origin remains `https://website-two-psi-49.vercel.app`. That DNS work belongs to Row 75. Row 72 documents the dependency and does not change DNS.

Secrets, passwords, API keys, MFA seeds, and backup codes are not stored in this register.
