# ROW 212 — 30-Day Launch Performance Review Framework

**Status:** Ready for Founder Acceptance Review. Not marked Complete.  
**AOS work ID:** `al-212`  
**Command Center:** August Launch row 212 (excel row 213)  
**Phase:** Final Launch Readiness & Controls  
**Deliverable:** Create 30-Day Launch Performance Review Framework  
**This AOS run owner:** Nia Prism — Chief Experience & Transformation Officer  
**Command Center primary owner:** Michelle Northstar — Chief of Staff & Operations Officer  
**Supporting:** Nia Prism (experience, sentiment, Lumina usefulness, progress quality, support CX); Imani Heartbeat (technical/revenue integrity, defects telemetry, payment events); Kimberly Walker (human) — Founder acceptance only  
**Launch date:** August 31, 2026  
**Review window:** Monday, August 31, 2026 12:00 AM America/New_York through Wednesday, September 30, 2026 11:59:59 PM ET  
**Day 30 alignment:** Post Launch “30-Day Operating Review” (Day 30 — September 30)

This document establishes **targets, reporting, and corrective-action triggers** for the first 30 days of public launch. It does not create a new dashboard, analytics vendor, support channel, payment path, or marketing campaign. It does not change Stripe, Cloudflare, Vercel DNS, authentication, or legal copy.

Launch Roadmap and Founder Notes were not changed. This row is **not Complete** until Kimberly Walker (human) accepts it.

---

## 1. Purpose

Answer, on a fixed cadence, whether The Back Half launch is:

1. Enrolling Architects and collecting revenue as actually paid (not hoped).
2. Converting discovery → purchase without silent funnel collapse.
3. Acquiring through the approved Instagram/TikTok path (not invented channels).
4. Moving paid Architects through onboarding, Journey, and completion.
5. Making Lumina used and useful without storing conversation content.
6. Supporting Architects inside published SLAs.
7. Handling refund *requests* and cancellations without violating the no-refund policy.
8. Containing defects and Triple E failures.
9. Hearing participant sentiment without inventing testimonials or scores.

This framework **feeds** the Post Launch 30-Day Operating Review. It does **not** replace Row 84 campaign totals, Row 151 daily launch health, or Row 153 ticket operations.

---

## 2. Locked operating facts (do not relitigate here)

| Fact | Approved reality |
|---|---|
| Public launch | August 31, 2026. No soft launch. |
| Primary CTA / destination | Become an Architect → `https://thebackhalf.org/register` |
| Offers | Blueprint $1,500 one-time; Founding Architect $1,750 one-time (Blueprint + first six months of Architect Community); Community $50/month |
| Architect Community | Coming October 25, 2026. **Not live in this 30-day window.** |
| Active social | Instagram @backhalfco, TikTok @backhalfco. LinkedIn is a future enhancement. |
| Refunds | **No refunds.** Cancellation is not a refund. Support has no Refund category. |
| Eligibility | 18+ only |
| Historical purchases | 19 pre-launch paid records are **PRE-LAUNCH / HISTORICAL — EXCLUDED** from launch performance |
| Test / sandbox | `cs_test_`, `pi_test_`, `test=true` excluded from Founder totals |
| Founder role | Escalation and acceptance only. Not the continuous monitor. |
| Sentiment vendor | None. No NPS/CSAT product. Do not invent a score. |

Absolute enrollment headcount and revenue dollar **OKRs are Founder-reserved**. None are locked in this repository. This framework therefore sets **operating bands and investigation triggers**, not invented sales quotas. Founder may confirm, revise, or add numeric volume targets at acceptance without changing measurement definitions.

---

## 3. Systems of record (reuse only)

No new product, marketing, or legal files. Reporting uses the Launch KPI Systems already built:

| Need | System | Founder / admin surface |
|---|---|---|
| Daily launch health, traffic, conversion, revenue, activation, errors, support, risks | Row 151 | `/ops/admin/launch-dashboard` |
| Social acquisition + campaign funnel | Row 84 | `/ops/admin/launch-kpi` |
| Product / billing events | Row 150 | Durable `analytics_events` (Postgres) |
| Tickets, SLA, categories | Row 153 | `/ops/admin/support` |
| Social replies / sentiment clues | Row 83 | `ops/fab-5/social-engagement-log.json` + tickets with `source=social_row83` |
| Payments / cancellations / refund events | Billing + Row 150 | Stripe is authoritative for money; `payment.refunded`, `subscription.canceled`, `membership_cancelled` |
| Experience quality | Nia Triple E + Post Launch first-part / full-Journey reviews | Qualitative evidence packets, not a new score |

**Campaign vs 30-day performance (do not mix):**

| Period | Label | Use |
|---|---|---|
| Before 2026-08-28 12:00 AM ET | PRE-LAUNCH / HISTORICAL | Never count as launch performance |
| 2026-08-28 12:00 AM ET through 2026-08-31 | LAUNCH CAMPAIGN (Row 84) | Keep as its own campaign scorecard |
| 2026-08-31 12:00 AM ET through 2026-09-30 11:59 PM ET | **30-DAY PERFORMANCE WINDOW (this row)** | Enrollment, revenue, conversion, experience, support, defects, sentiment |
| On/after 2026-10-01 12:00 AM ET | AFTER DAY 30 | Monthly Business Operating Review; not this packet |

Post-launch Row 84 “POST-LAUNCH” traffic after September 1 is **included** in this 30-day packet. It is **not** added into August 28–31 campaign totals.

---

## 4. Owners and cadence

| Cadence | When | Product | Owner | Output |
|---|---|---|---|---|
| Daily | Each ET day in the window | Health, enrollment delta, revenue, conversion stalls, support SLA, defects, Lumina errors | Michelle reads; Imani validates systems; Nia validates experience/support/social | Row 151 daily brief + Row 84 social entry |
| 24-hour | Day 1 — September 1 | Enrollment, payments, access, defects, Lumina, support, sentiment | Michelle coordinates | Post Launch First 24-Hour Review |
| 72-hour | Day 3 — September 3 | Critical incidents closed; no enhancement-first work | Michelle; Nia retests participant-facing fixes | 72-Hour Stabilization Review |
| Day 7 | September 7 | Activation, onboarding, Journey starts, support themes, Triple E | Nia (experience); Imani (technical); Michelle (synthesis) | Early Architect Experience Review |
| Day 14 | September 14 | Funnel, progress stalls, Lumina usefulness, sentiment coding | Nia + Michelle | Mid-window performance note |
| Day 21 | September 21 | Defects vs V1.1 candidates; still no scope creep | Michelle; Nia on experience ranking | Feeds Version 1.1 Prioritization |
| Day 30 | September 30 | Full packet below | Michelle consolidates; Nia experience chapter; Imani technical/finance integrity chapter | **30-Day Launch Performance Review** → Post Launch 30-Day Operating Review |

Social native metrics (reach, impressions, engagements, followers, link clicks) remain **manual daily entry** by Nia, verified by Michelle, on Row 84. Do not estimate missing platform numbers.

---

## 5. Metric dictionary, targets, and reporting

Definitions reuse Row 84 / 150 / 151. **Target type** is one of:

- **Binding** — already approved operational rule (health, SLA, policy). Treat as in force.
- **Operating band** — proposed investigation threshold for this framework. Confirm or revise at Founder acceptance. Not a sales quota.
- **Qualitative** — Nia evidence, not a fabricated numeric score.

Where a source cannot produce a number, report **N/A — Not Available From Source**. Do not estimate.

### 5.1 Enrollment

| Item | Rule |
|---|---|
| Metric | Paid Architect purchases in the 30-day window (Blueprint and Founding Architect). Community-only subscription is tracked separately and is not “Architect enrollment.” |
| Formula | Count of launch-eligible paid purchases with timestamps in the review window. Exclude historical 19 and test/sandbox. |
| Source | Stripe/billing authoritative; Row 84 `marketing_kpi_purchases` mirror; Row 150 `purchase_completed` reconciliation |
| Report | Daily on Row 151; cumulative in the Day 7 / 14 / 21 / 30 packets |
| Binding target | Figures reconcilable. Billing vs Row 84 disagreement = data-quality **ERROR** (already YELLOW). Do not silently pick the larger number. |
| Operating band | **WATCH** if landing-page sessions > 0 and purchases = 0 by end of Day 1. **ACT** if checkout starts ≥ 1 and purchases = 0 by end of Day 3. **ESCALATE** if checkout starts exist with payment failures and zero purchases (Row 151 already flags this on/after Launch Day). |
| Volume OKR | **Not set.** Do not invent a headcount goal in this row. |

Account creation without payment is **registration**, not enrollment.

### 5.2 Revenue

| Item | Rule |
|---|---|
| Metric | Gross paid revenue in the 30-day window from launch-eligible purchases (USD). |
| Formula | Sum of paid offer amounts for enrollment-eligible purchases. Do not add historical 19. Do not add test charges. |
| Source | Stripe/billing; Row 151 revenue strip; Row 84 purchase mirror |
| Binding target | Displayed launch revenue follows Row 151 reconciliation order. Community $50/month is **not expected** as a material line in this window (Community not live until October 25). |
| Operating band | **ACT** on any `payment.refunded` event (policy is no refunds — any recorded refund is an exception requiring Michelle → Founder). **ACT** if billing and Row 84 disagree. |
| Volume OKR | **Not set.** Do not invent a dollar goal in this row. |

### 5.3 Conversion

Reuse Row 84 formulas. Extend them across the 30-day window without mixing campaign-only totals into this packet’s primary table.

| KPI | Formula | Source | Operating band (proposed) |
|---|---|---|---|
| Landing-page continuation | Landing-page sessions ÷ native link clicks | Row 84 (directional; two systems) | **WATCH** if clicks exist and sessions = 0 for 48 hours |
| Checkout-start rate | Checkout starts ÷ landing-page sessions | Row 84 / 150 | **WATCH** if sessions ≥ 10 and checkout-start rate = 0 |
| Checkout completion | Purchases ÷ checkout starts | Row 84 / 150 | **ACT** if checkout starts ≥ 5 and completion = 0; **WATCH** if completion < 25% once starts ≥ 8 |
| Purchase conversion | Purchases ÷ landing-page sessions | Row 84 (overall conversion; denominator labeled) | **WATCH** if sessions ≥ 20 and purchases = 0 |
| Registration success | `registration_succeeded` vs `registration_failed` / `auth_failed` | Row 150 | **ACT** if failures dominate successes on a given day with ≥ 5 attempts |

Rates are **N/A** when the denominator is 0. Do not treat N/A as 0%.

### 5.4 Marketing acquisition

| KPI | Formula / source | Owner | Operating band |
|---|---|---|---|
| Reach, impressions/views, engagements, engagement rate | Native Instagram/TikTok insights; Row 84 dictionary | Nia enters; Michelle verifies | **WATCH** if a live channel has no native entry for 2 consecutive days after Launch Day |
| Follower growth | Current − baseline (baseline 0 for new channels) | Calculated | Directional; no invented follower quota |
| Link clicks | Native link/profile clicks | Nia | **WATCH** if posting occurred (Row 80/82) and clicks = 0 for 3 days |
| Attributed sessions | UTM `utm_source=instagram\|tiktok`, campaign preserved | Row 84 / 150 | Missing source = Direct / Organic / Unknown — do not force-fit |
| Email signups | **N/A — No Separate Launch Email Signup Mechanism** | n/a | Do not create a newsletter KPI |
| LinkedIn | Future enhancement | n/a | Not required; do not treat absence as a miss |
| September content plan | Row 80: 3 posts/day Instagram + TikTok (180 executions). Production/scheduling are separate rows. | Nia | **WATCH** if approved cadence cannot be executed; do not spam or invent stories |

Transformation stories and social proof: **WHEN AVAILABLE — DO NOT INVENT.**

### 5.5 Completion / progress

Activation definition is unchanged from Row 151:

**Activated Architect = a paid purchaser who has started Architect onboarding.** Payment alone is not activation.

| Stage | Event / source | Operating band |
|---|---|---|
| Purchased | Paid purchase | Denominator for activation |
| Account active | Verified account | Reported; not the activation bar |
| Onboarding started | `onboarding_started` | **WATCH** if unpaid wait > 24h after purchase; **ACT** if < 50% of paid (n ≥ 4) have started onboarding by Day 7 |
| Onboarding completed | `onboarding_completed` | **WATCH** if started but not completed > 72h |
| Journey entered | `journey_entered` | **WATCH** if onboarding completed and Journey not entered > 48h |
| Chapter progress | `journey_chapter_completed`, `journey_progress_saved` | **ACT** on `journey_save_failed` ≥ 3 in a day or any P2 Journey access failure |
| Seven-part completion | `journey_completed` | Possible in 30 days; **not required**. First completion triggers Post Launch First Full Journey Completion Review. Zero completions at Day 30 is **WATCH** (Journey is a multi-week transformation), not an automatic fail |
| Certificate | `certificate_generated` / `certificate_downloaded` | Usage signal only |

Nia judges **clarity, Triple E, and transformation integrity** on first chapter completion and first full completion. Counts without that review are incomplete.

### 5.6 Lumina usage / usefulness

No Lumina conversation content is stored or displayed on ops dashboards.

| Signal | Definition | Source | Target / trigger |
|---|---|---|---|
| Usage — opened | Unique paid users with `lumina_opened` | Row 150 / 151 usage signals | **WATCH** if activated Architects ≥ 4 and Lumina opens = 0 by Day 7 |
| Usage — conversation | `lumina_message_sent` / `lumina_response_received` | Row 150 | **WATCH** if opens exist and messages = 0 by Day 14 (Architects opened but did not use) |
| Reliability | `lumina_error` ÷ `lumina_message_sent` (same day; N/A if sends = 0) | Row 150 | **ACT** if error rate ≥ 20% with ≥ 5 sends in a day, or any P1 Lumina outage |
| Usefulness (qualitative) | Did Lumina help the Architect move the Journey without identity/brand drift? | Nia Triple E + first-part completion review + LUMINA tickets | **Qualitative.** Do not invent a 1–5 usefulness score. **ACT** on a Triple E identity failure or repeated “not useful / harmful” LUMINA tickets (n ≥ 3 distinct Architects) |
| Support load | Tickets category `LUMINA` | Row 153 | Counts toward support themes; P2 due in 24h |

Lumina is not an operating executive and must not speak as the Founder.

### 5.7 Support

Published Architect expectation: response within 3 days, goal of 72 hours or less. Do not promise resolution time. Do not promise refunds.

| Signal | Binding target | Trigger |
|---|---|---|
| P1 Urgent | First response due 4 hours | **ESCALATE** if overdue; Founder if security/privacy/legal |
| P2 High | 24 hours | **ACT** if overdue |
| P3/P4 | 72 hours | **WATCH** approaching (≤12 hours remaining); **ACT** overdue |
| Backlog | Row 151: unresolved ≥ 10 → YELLOW | Binding |
| Duplicate critical failure | Multiple Architects, same critical failure | Treat as P1 |
| Theme review | Weekly + Day 7 / 14 / 30 | Cluster ACCOUNT_LOGIN, PAYMENT_BILLING, ONBOARDING, JOURNEY, LUMINA, TECHNICAL — assign corrective actions |

Ticket counts are ticket-level. Private bodies are not shown on Founder dashboards. Social + ticket = **one** case (Row 83 → Row 153).

### 5.8 Refunds / cancellations (where applicable)

| Signal | Policy | Reporting | Trigger |
|---|---|---|---|
| Refunds issued | **None.** Public and checkout policy: no refunds. | Count `payment.refunded` (expect **0**) | Any refund event → **ESCALATE** (Michelle → Founder). Do not reverse policy in support replies. |
| Refund *requests* | Stay in Payment category. Not a Refund category. | Count PAYMENT_BILLING tickets whose notes/history indicate a refund ask (ops coding; no new category) | **WATCH** at 1; **ACT** at ≥ 3 in 7 days (experience/friction review, still no refund promise) |
| Chargebacks / disputes | Stripe owner / Founder | Manual Founder/Stripe Dashboard — agents do not issue refunds | **ESCALATE** immediately |
| Community cancellation | Community not live until October 25. Founding Architect included period starts then. | `membership_cancelled` / `subscription.canceled` | Any cancellation in this window is **WATCH** (unexpected for Blueprint/bundle one-time offers; investigate entitlement so lifetime Blueprint is not revoked) |
| Access after cancel | Lifetime Blueprint access must not be accidentally revoked | Billing entitlements | **ACT** if `entitlement.revoked` on Blueprint after a community cancel |

Cancellation is **not** a refund and is **not** enrollment failure by itself.

### 5.9 Defects

| Signal | Source | Binding / band |
|---|---|---|
| Launch Health GREEN / YELLOW / RED | Row 151 `evaluateLaunchHealth` | Binding. RED → Founder attention YES. |
| Availability of website / registration / checkout / payment | Row 151 | Unavailable → RED |
| Application/server errors | `launch_ops_errors` + Row 150 failure events | ≥5 product failures today in a critical area, or ≥3 open HIGH ops errors → YELLOW |
| Open RED risk; security/privacy/legal | Risk register | RED / Founder |
| Triple E / experience block | Nia may block release for material Triple E or promise failure | Binding. Michelle cannot administratively clear a valid Nia block. |
| Journey save / Lumina / checkout named failures | Row 150 | Feed Day 7 / 21 V1.1 ranking. Nonessential ideas go to the Deferred-Enhancement Register. |

Not every application error is a RED launch risk.

### 5.10 Participant sentiment

No survey vendor. Do not fabricate NPS, CSAT, or testimonial quotes.

**Sources (only these):**

1. Support tickets (GENERAL / OTHER / feedback language; Journey/Lumina friction).
2. Row 83 social comments and DMs logged, plus tickets sourced `social_row83`.
3. Unsolicited Architect messages in support (not Journey answers, not Lumina transcripts).
4. Nia’s Day 7 / first-part / first-full-completion qualitative reviews.
5. Consented testimonials **only if** a later approved consent path exists — none are invented here.

**Coding (Nia, weekly and at Day 7 / 14 / 30):**

| Code | Meaning | Trigger |
|---|---|---|
| Positive | Architect expresses help, clarity, or aliveness without a defect | Record; eligible for future consented proof only with Founder/legal path |
| Mixed | Value plus friction | **WATCH**; log theme |
| Negative | Frustration, confusion, broken promise, brand mismatch | **ACT** if ≥ 3 distinct Architects share a theme in 7 days |
| Blocking | Safety, privacy, identity harm, cannot continue Journey, public reputational incident | **ESCALATE** same day |

Public replies use approved Row 83 templates only. Do not argue, diagnose payments in public, or promise refunds.

---

## 6. Corrective-action protocol

### 6.1 Severity

| Level | Meaning | Who acts | Timebox |
|---|---|---|---|
| **WATCH** | Investigate; log; no product change required yet | Domain owner | Mention in next daily brief |
| **ACT** | Corrective action required; evidence and retest | Domain owner; Michelle tracks | Start within 24h; close with evidence |
| **ESCALATE** | Founder, security/privacy/legal, RED health, refund/chargeback, or unresolved ACT past timebox | Michelle surfaces; Imani contains technical harm; Nia pauses participant-facing experience if Triple E/safety requires | Same day |

Unrelated authorized work continues while a gated item is paused.

### 6.2 Loop (every ACT / ESCALATE)

1. **Detect** — dashboard, ticket, social log, checkpoint review, or agent cycle.  
2. **Classify** — WATCH / ACT / ESCALATE using this framework. Do not invent a new severity ladder.  
3. **Own** — Nia (experience, sentiment, Lumina usefulness, support CX, Triple E); Imani (availability, errors, payments integrity, security); Michelle (orchestration, revenue ops visibility, brief).  
4. **Contain** — Imani may disable affected functionality, roll back, or isolate to prevent material technical/security harm, then notify Michelle and Founder.  
5. **Fix** — only approved behavior. No scope additions. No refunds. No new channels.  
6. **Retest** — technical evidence from Imani; **participant-facing fixes require Nia retest**. No self-certification.  
7. **Record** — risk/ticket/decision evidence. Close only when the trigger is cleared.  
8. **Founder** — only reserved decisions (material strategy/brand/pricing, spend outside the $5,000 launch cap, identity/MFA, legal, irreversible risk, genuine conflicts, Go/No-Go, refund exceptions). Do not fabricate Founder approval.

### 6.3 Trigger register (quick reference)

| ID | Trigger | Level | Default owner |
|---|---|---|---|
| T-ENR-1 | Sessions > 0, purchases = 0 through Day 1 | WATCH | Nia (funnel UX) + Michelle |
| T-ENR-2 | Checkout starts ≥ 1, purchases = 0 through Day 3 | ACT | Imani (checkout) + Nia (offer clarity) |
| T-ENR-3 | Checkout starts + payment failures + zero purchases on/after Launch Day | ESCALATE (also Row 151 YELLOW/Founder rules as coded) | Imani; Michelle surfaces |
| T-REV-1 | Billing vs Row 84 disagreement | ACT | Imani + Michelle |
| T-REV-2 | Any `payment.refunded` | ESCALATE | Michelle → Founder |
| T-CONV-1 | Checkout starts ≥ 5 and completion = 0 | ACT | Imani + Nia |
| T-CONV-2 | Checkout completion < 25% once starts ≥ 8 | WATCH | Nia + Imani |
| T-ACQ-1 | Live social channel missing native KPI entry 2 days | WATCH | Nia |
| T-ACT-1 | < 50% of paid (n ≥ 4) started onboarding by Day 7 | ACT | Nia |
| T-PROG-1 | `journey_save_failed` ≥ 3 in a day | ACT | Imani; Nia retests |
| T-LUM-1 | Lumina error rate ≥ 20% with ≥ 5 sends in a day | ACT | Imani; Nia Triple E |
| T-LUM-2 | ≥ 3 distinct Architects: Lumina not useful / harmful | ACT | Nia |
| T-SUP-1 | P1 overdue or SLA approaching/overdue | ACT / ESCALATE | Nia; Michelle backup |
| T-SUP-2 | Unresolved tickets ≥ 10 | ACT (Row 151 YELLOW) | Nia + Michelle |
| T-REF-1 | ≥ 3 refund-request tickets in 7 days | ACT (still no refund) | Nia + Michelle |
| T-CAN-1 | `membership_cancelled` / Blueprint entitlement revoked | ACT | Imani |
| T-DEF-1 | Launch Health RED or critical surface unavailable | ESCALATE | Imani; Michelle; Founder attention |
| T-EEE-1 | Material Triple E / promise failure | ACT (Nia release block) | Nia |
| T-SEN-1 | Blocking sentiment / public reputational incident | ESCALATE | Nia + Michelle |
| T-SEN-2 | ≥ 3 distinct Architects, same negative theme in 7 days | ACT | Nia |

---

## 7. Day 30 packet (what Michelle consolidates)

On September 30, one evidence packet — not a new product:

1. Enrollment and revenue (window totals, offer mix, reconciliation status).  
2. Conversion funnel with labeled denominators.  
3. Marketing acquisition (Instagram/TikTok only; LinkedIn N/A).  
4. Activation and Journey progress (counts + Nia quality note).  
5. Lumina usage counts + usefulness narrative + error rate.  
6. Support volume, SLA performance, themes, open P1/P2.  
7. Refund events (expect 0), refund requests, cancellations, chargebacks.  
8. Defects: health history, open risks, Triple E blocks, V1.1 vs deferred.  
9. Sentiment coding table (no invented quotes).  
10. Corrective actions opened / closed / still open.  
11. Decisions that remain Founder-reserved.

Nia authors the experience / curriculum / brand / transformation chapter. Imani authors technical, security, and payment-integrity chapter. Michelle synthesizes. Founder accepts or directs — agents do not mark the Post Launch 30-Day Operating Review complete.

---

## 8. Explicit non-goals

- Do not build another dashboard or add GA4/Mixpanel/Clarity.  
- Do not change Stripe configuration, prices, refund policy, or checkout copy.  
- Do not change Cloudflare DNS, Vercel custom domains, or nameservers.  
- Do not weaken auth.  
- Do not invent enrollment/revenue quotas, testimonials, or Lumina transcript scores.  
- Do not treat Kimberly Walker (AI) as operating capacity.  
- Do not mark Command Center row 212 Complete in this change.

---

## 9. Acceptance

| Item | State |
|---|---|
| Framework drafted | Yes — this document |
| Product / marketing / legal files changed | No |
| Founder acceptance | **Pending — Kimberly Walker (human)** |
| Row 212 Complete | **No** |

Next action: Founder Acceptance Review of this framework. Confirm or revise proposed operating bands. Optional: lock numeric enrollment/revenue OKRs. Do not mark Complete until explicit Founder approval.
