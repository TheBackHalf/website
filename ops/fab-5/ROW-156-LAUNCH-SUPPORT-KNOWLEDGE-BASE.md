# ROW 156 — Launch Support Knowledge Base

**Status:** Ready for Founder review. Not Founder-accepted. Do not mark Complete.  
**AOS work ID:** al-156  
**Workstream:** Email, Analytics, Support & Architect Experience  
**Primary support / customer experience:** Nia Prism — Chief Experience & Transformation Officer  
**Backup / routing / operations:** Michelle Northstar — Chief of Staff & Operations Officer  
**Technical / security escalation:** Imani Heartbeat — Chief Technology & Risk Officer  
**Launch date:** August 31, 2026  
**Structured source of truth:** `lib/support/knowledge-base.ts`  
**Operator console:** `/ops/admin/support/knowledge-base`  
**Channels protocol (do not replace):** `ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md`  
**Social FAQ library (public comments/DMs only):** `ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md`

Row 55 finalized Help Center content as a separate workbook deliverable. Row 156 is the **launch operating knowledge base**: participant-facing reply scripts plus internal routing that match **actual production behavior**. It is not a second public FAQ page. Do not invent policy. Do not change legal, marketing, auth, or payment systems from this row.

---

## How to use this KB

1. Open the ticket on `/ops/admin/support`.  
2. Confirm category, priority, and owner (Row 153 classifier).  
3. Look up the Architect on `/ops/support` when an account exists.  
4. Open `/ops/admin/support/knowledge-base` and use the matching article.  
5. Send the **participant-facing** script. Add only the person’s name and ticket ID. Do not “improve” prices, dates, or refund language.  
6. Follow **internal** notes for lookup, routing, and known gaps.  
7. If production behavior and this article disagree, stop. Do not guess. Route Imani for technical/billing facts; Nia for experience copy.

Reply as **The Back Half Support** from `support@thebackhalf.org`. Do not reply as Kimberly.

---

## Hard rules (all articles)

- Participants must be **18 or older**. No date of birth. No other cutoff.  
- **No refunds.** Cancellation is not a refund. There is no Refund ticket category.  
- **Architect Community — Coming October 25, 2026.** Not live on August 31, 2026. Never say October 19.  
- Founding Architect Community period: **October 25, 2026 through April 25, 2027** (first six months). Not first year.  
- Do not request passwords, payment-card data, OTPs, Journey answers, or Lumina transcripts.  
- Do not promise a resolution time. Published response expectation: within 3 days, goal of 72 hours or less. P1 is not an ordinary three-day queue item.  
- Do not invent `legal@`. Privacy uses category Privacy on this tracker.  
- Do not promise 24/7 support, live chat, phone support, coupons, or guaranteed outcomes.  
- This is not therapy and not a crisis service. If someone is in danger: local emergency services or a local crisis line.

Live offers (from `lib/checkout/offers.ts`):

| Offer | Price | Mode |
|---|---|---|
| The Back Half Blueprint | $1,500 | one-time |
| Founding Architect | $1,750 | one-time |
| The Back Half Community | $50/month | subscription |

---

## Articles

Use the structured scripts in `lib/support/knowledge-base.ts`. Summary for operators:

### 1. Account creation — REGISTRATION — Nia — P2

Door: `https://thebackhalf.org/register`. Age 18+ attestation, then name / email / password (8+ characters, letter + number) or Google. Four account-creation acknowledgments. Email+password must verify. Google is verified on create. Registration is not a purchase.

### 2. Email verification — REGISTRATION — Nia — P2

Verification link expires in 24 hours. Resend cooldown 60 seconds. Google accounts skip this. Support cannot mint tokens. SMTP failure for email registrants is an access incident.

### 3. Login — ACCOUNT_LOGIN — Michelle (routing) / Nia (reply) — P2

Email+password (verified) or Google. No magic link. No OTP. Forgot password: `https://thebackhalf.org/forgot-password` — always-neutral confirmation; 24-hour reset link; Google-only accounts have no password. Session 30 days. Support lookup cannot reset passwords.

### 4. Payment — PAYMENT_BILLING — Michelle — P2

Signed-in checkout at `/checkout`. Card only. No promo codes. Access after Stripe processing / webhook. Public line: “Cancellation is not a refund. The Back Half standard policy is no refunds.” Duplicate charge → P2, still no refund promise. Checkout outage → P1.

### 5. Receipts — PAYMENT_BILLING — Michelle — P3

Confirmation email is not the invoice. Invoices & receipts: `/architect/billing`. Stripe hosted documents. Do not fabricate receipts.

### 6. Onboarding — ONBOARDING — Nia — P3

Blueprint or Founding Architect → `/architect/onboarding`. Steps: welcome → preferences → consent → Lumina → assessment → Awakening. Sequential. Community-only does **not** include Journey onboarding. Webhook lag copy is approved on the success page.

### 7. Journey progress — JOURNEY — Nia — P2

Seven chapters at `/architect/journey`. Resume on the same account. No support reset. Do not collect Journey answers. Community-only has no Journey. Production does not sequentially lock chapters 1–7 after onboarding; within-chapter sections still gate.

### 8. Blueprint downloads — DOWNLOADS_MATERIALS — Nia — P3

`/architect/resources` after sign-in. Personalized PDFs use saved Journey responses. Download APIs require authentication; they do not enforce chapter completion. Puppeteer failures are technical (Imani).

### 9. Lumina — LUMINA — Nia — P2

AI Guide, not a person, not the Founder. `/architect/lumina` after sign-in. AI Disclosure: `https://thebackhalf.org/legal/ai-disclosure`. No medical / mental-health / legal / financial / emergency help. Memory optional. Current replies are the stub Guide; do not promise a later model. Lumina routes are not gated on Journey purchase.

### 10. Cancellations — MEMBERSHIP — Michelle — P3

Standalone $50/month: Manage billing on `/architect/billing`. Stops future renewals; access through the paid period. One-time Blueprint / Founding Architect cannot be cancelled after payment. Founding Architect Community benefit cannot be cancelled separately. Refund requests stay in Payment.

### 11. Community timing — MEMBERSHIP — Nia — P3

Not live August 31, 2026. Coming October 25, 2026. Founding Architect includes first six months, October 25, 2026 through April 25, 2027. **Internal only:** billing entitlement fallback currently uses `addOneYear` if `communityEndsAt` is missing. Tell Architects the published six-month period. If stored `endsAt` disagrees, route Imani. Nia does not change billing code.

### 12. Technical issues — TECHNICAL — Michelle — P3 (P1 if outage)

What they were doing + what happened. No secrets. Spanish UI under `/es/…`. No invented browser matrix. No invented Spanish legal text.

### 13. Escalation — GENERAL / any — Nia primary

P1 4h, P2 24h, P3/P4 72h. Crisis boundary on `/support`. Security/privacy → Imani. Legal/attorney/regulator → Founder. Do not reply as Kimberly.

---

## Production gaps operators must not paper over

| Gap | What to tell the Architect | What to do internally |
|---|---|---|
| Bundle `community_access` fallback `addOneYear` vs published six months | Use October 25, 2026 through April 25, 2027 | Route Imani; do not change entitlements from Support |
| Standalone Community copy says after Blueprint completion; checkout does not enforce it | Direct to live `/checkout`; do not advertise a loophole | Do not invent a gate |
| Lumina not gated on `journey_access` | Lumina is the signed-in AI Guide | Do not promise it is members-only if the live route is not |
| Download APIs not chapter-gated | Sign in at Resources; incomplete PDFs usually mean unfinished saved work | Do not invent a completion lock |
| No Journey reset API | Support cannot reset progress | Do not promise a manual rebuild |
| Row 55 Help Center pages are not in this repository | Use this operating KB and `/support` | Do not create a second public FAQ from this row |

---

## Related surfaces (do not duplicate)

| Surface | Role |
|---|---|
| `/support` and `/es/support` | Public intake, response expectation, crisis boundary, form |
| `/ops/admin/support` | Ticket tracker |
| `/ops/admin/support/knowledge-base` | This KB |
| `/ops/support` | Read-only account lookup |
| Row 83 library | Social comments/DMs only; still hand off to Support |
| Row 153 protocol | Channels, SLA, acknowledgment, escalation table |

---

## Founder acceptance

Kimberly Walker (human) is the sole Founder acceptance authority. This row is **not** marked Complete. Launch Roadmap and Founder Notes were not changed from this work.
