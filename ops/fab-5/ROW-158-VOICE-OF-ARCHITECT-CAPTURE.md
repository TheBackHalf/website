# ROW 158 — Voice-of-Architect Capture System

**Status:** IMPLEMENTED — FOUNDER ACCEPTANCE REVIEW. Not Complete.  
**Founder Acceptance:** NOT YET RECORDED. Do not fabricate Founder approval.  
**AOS work ID:** al-158  
**Launch Readiness source:** Command Center August Launch row 158  
**Launch day:** August 31, 2026  
**Timezone:** America/New_York (Eastern)  
**Cost:** $0  
**Source of truth:** this document plus `ops/fab-5/voice-of-architect-log.json` and `lib/voice-of-architect/`.

Row 158 is an operations capture method. It does not create a public feedback form. It does not invent testimonials. It does not add launch scope. It does not mark this row Complete.

---

## Authority

Command Center workbook lists **Nia Prism** as primary owner (experience). AOS assigned this engineering pass to **Michelle Northstar** for operations, orchestration, and Launch Readiness coordination.

| Role | Duty |
|---|---|
| **Michelle Northstar — Chief of Staff & Operations Officer** | Capture operation, ledger, cadence, routing into defect triage, backup support logging. Does not take curriculum/brand ownership. |
| **Nia Prism — Chief Experience & Transformation Officer** | Experience interpretation, Architect-facing support replies, testimonial/permission handling under Row 33. Not replaced by this row. |
| **Imani Heartbeat — Chief Technology & Risk Officer** | Defect triage owner for critical product, access, payment, privacy, and analytics-failure issues after Michelle routes them. |
| **Founder — Kimberly Walker (human)** | Sole acceptance authority. Testimonial publication. Legal/reputational judgment. Not the routine capture operator. |
| **Kimberly Walker (AI)** | Not an operating agent. Not capture capacity. |

Do not send as Kimberly. Do not invent a `feedback@` mailbox.

---

## Purpose

Beginning launch day, capture:

1. Feedback  
2. Confusion  
3. Compliments  
4. Support themes  
5. Friction  
6. Testimonial / permission requests  
7. Product opportunities  

Route **critical issues into defect triage** immediately. Theme the rest. Do not wait for a weekly meeting to move a P1.

---

## Reuse existing intake — do not build a second front door

Architects already speak through production channels. This system records Voice-of-Architect from those channels. It does not add a participant-facing widget.

| Source | Existing system | How it enters VoA |
|---|---|---|
| Support form / email | Row 153 — `https://thebackhalf.org/support`, `support@thebackhalf.org`, `/ops/admin/support` | Operator captures from the ticket (`captureFromSupportTicket`) |
| Social | Row 83 log + T12–T16 / T24 handoff into a Row 153 ticket (`social_row83`) | Capture after the social item is logged and, if needed, ticketed |
| Product friction | Row 150 analytics failure events | Capture clustered friction (`captureFromAnalyticsEvent`) |
| Ops observation | Launch coverage, first-72-hour support, Launch Dashboard | `ops_observation` with a summary only |
| Founder observation | Only if the Founder actually observed it | `founder_observation` — never fabricate |

**Do not** create a new public “feedback” page, NPS popup, or testimonial form for August 31.

---

## Categories

| ID | Capture when | Default route |
|---|---|---|
| **FEEDBACK** | General reaction that is not a defect, compliment-as-publish, or feature ask | EXPERIENCE_THEME (Nia) |
| **CONFUSION** | Architect does not understand a step, label, or next action | EXPERIENCE_THEME (Nia) |
| **COMPLIMENT** | Praise, thanks, “Magical is Possible” as appreciation | COMPLIMENT_LEARNING (Nia). **Not a testimonial.** |
| **SUPPORT_THEME** | Recurring support subject or ordinary ticket theme | SUPPORT_OPERATION (Nia; Michelle routing). Keep the Row 153 ticket. |
| **FRICTION** | Stuck, error, cannot complete a step | EXPERIENCE_THEME unless it is a critical defect |
| **TESTIMONIAL_PERMISSION** | Ask to share a story, quote, name, or “you may use this” | TESTIMONIAL_PERMISSION_HOLD (Row 33). **Do not publish.** |
| **PRODUCT_OPPORTUNITY** | Feature request or “you should add…” | DEFERRED_ENHANCEMENT (Row 6). **Do not add launch scope.** |

Mechanical classification lives in `lib/voice-of-architect/classify.ts`. Operators may override the category in the ledger note if the classifier is wrong. They may not override “do not publish testimonials” or “do not add launch scope.”

---

## Defect triage

Critical Voice-of-Architect items **route into Imani defect triage immediately**. This is not a second bug tracker. It is the handoff into systems that already exist.

A VoA item is **critical** when any of these is true:

- Support priority **P1**
- Support category **PRIVACY**
- Product/access/payment/security language (outage, cannot checkout, cannot log in, cannot register, cannot save, Lumina down, download failed, data exposure)
- Row 150 friction event: `registration_failed`, `auth_failed`, `checkout_failed`, `checkout.payment_failed`, `journey_save_failed`, `lumina_error`, `download_failed`, `membership_payment_failed`
- The same product failure is already a support theme across more than one Architect **and** it blocks access or payment

| Step | Owner | System |
|---|---|---|
| 1. Capture the VoA record (`criticalDefect: true`, status `IN_TRIAGE`) | Michelle | `voice-of-architect-log.json` |
| 2. Keep or open the Row 153 ticket | Nia primary / Michelle backup | `/ops/admin/support` |
| 3. Escalate per Row 153 (Imani for technical/privacy/security) | Michelle routing | Ticket escalation + decision log if required |
| 4. If systemic / Launch Health impact, add a Row 151 launch risk | Michelle (ops) or Imani (tech/security) | `/ops/admin/launch-dashboard` |
| 5. Investigate and contain | Imani | Row 61 monitoring, incident path in the Launch-Day Runbook |
| 6. Theme remaining non-critical items | Michelle logs; Nia interprets | Daily rollup |

`routeToDefectTriage()` returns the handoff. `waitForCadence` is **false** for critical items.

SEV-1 / Launch Health RED / Founder Attention YES remain the existing incident rules. Voice-of-Architect does not replace them.

---

## Testimonial / permission hold (Row 33)

Compliments are **not** testimonials.

If an Architect offers a quote, story, name, or permission to publish:

1. Capture category **TESTIMONIAL_PERMISSION**.  
2. Route **TESTIMONIAL_PERMISSION_HOLD**.  
3. Set `testimonialPublishAllowed: false`.  
4. Do not post it on the website, social, or launch campaign.  
5. Retain only the Row 33 internal permission fields when a real permission package exists (person/source, authorization, approved quotation, date, where it may be used, material relationship, compensation/incentive, disclosure, approval status).  
6. Founder / Row 33 process publishes later, if at all. Launch campaign currently contains **none**.

AI-generated fake Architect praise remains prohibited.

---

## Product opportunities (Row 6)

Feature ideas go to **DEFERRED_ENHANCEMENT**. `addLaunchScope` is always **false**.

Do not open a new launch row from a Voice-of-Architect idea. Do not rewrite Journey, Blueprint, or Lumina content from this capture. Nia may later interpret opportunities; Michelle only logs and holds them.

---

## Ledger

**Path:** `ops/fab-5/voice-of-architect-log.json`  
**Override (tests / local live capture):** `VOA_LOG_FILE`  
**IDs:** `BH-VOA-YYYYMMDD-XXXXX` (not sequential account numbers)

Required fields: id, createdAt, category, source, summary, route, owner, coordinator, status, criticalDefect, immediate, fingerprint.

Statuses: **NEW**, **ROUTED**, **IN_TRIAGE**, **HOLD**, **THEMED**, **CLOSED**.

Rules:

- Summaries only (≤280 characters).  
- Redact payment-card, CVV, and password/OTP material.  
- Do not store Journey answers, Lumina transcripts, or another Architect’s private record.  
- Do not commit live Architect email addresses or raw messages.  
- Duplicate fingerprints are not re-inserted.  
- Label controlled validation rows `test: true`.

Live capture during launch may use `.data/voice-of-architect/log.json` (`VOA_LOG_FILE`) so PII stays out of git.

---

## Cadence — beginning launch day

Capture **starts August 31, 2026** with the first Architect contact. There is no pre-launch faux participant group.

| Window | Cadence | Owner |
|---|---|---|
| Launch day and first 72 hours | Review the VoA log **every 2 hours** while covering support/social (same unresolved check as Row 83 / runbook) | Michelle |
| Critical defect | Immediate. No cadence delay | Michelle → Imani |
| Daily (Aug 31–Sep 30 hypercare) | Theme rollup by category; feed Row 151 support/risk conversation | Michelle logs; Nia interprets experience themes |
| After first 30 days | Continue capture; cadence follows Hypercare Command Center (Row 208) once that row exists | Michelle |

Do not wait for Row 208 to start capture.

---

## What this row does not do

- Does not change Stripe, Cloudflare DNS, Vercel custom domains, or nameservers.  
- Does not weaken authentication.  
- Does not change public support-form copy, marketing claims, legal pages, Journey, Blueprint, or Lumina content.  
- Does not promise refunds or 24/7 support.  
- Does not treat Kimberly Walker (AI) as execution capacity.  
- Does not record Founder acceptance.

---

## Founder inspection

Localhost-only review: `/_internal/row158-voice-of-architect-review`  
Validation: `npm run fab5:row158`

Row 158 is **not Complete** until Kimberly Walker (human) accepts it.
