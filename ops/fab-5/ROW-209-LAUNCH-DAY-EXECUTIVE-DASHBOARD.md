# ROW-209 — Launch-Day Executive Dashboard

**Status:** Ready for Founder Acceptance Review. Not marked Complete.  
**AOS work ID:** al-209  
**Primary owner (Command Center):** Michelle Northstar — Chief of Staff & Operations Officer  
**This engineering pass:** Nia Prism — Chief Experience & Transformation Officer (composition / Founder-facing experience)  
**Supporting systems:** Imani Heartbeat (Row 61 / 150 / 151 instrumentation, unchanged)  
**Launch date:** August 31, 2026

---

## Dashboard location

**Founder / admin (signed in):** `/ops/admin/executive-dashboard`  
Spanish ops path: `/es/ops/admin/executive-dashboard`  
Localhost visual QA: `/_internal/row209-executive-dashboard-review`  
Linked from `/ops/admin`, the Row 151 daily dashboard, and Agent Operations.

This is the Command Center **one executive view**. It does **not** replace:

- Row 151 Daily Launch Dashboard (investigation location)
- Row 84 Launch Marketing KPI Dashboard (channel detail)
- Agent Operations (Approve / Reject / Review)

---

## Purpose

Answer: **What does Kimberly need to see on launch day, on one screen?**

Ten required areas:

1. Enrollment / revenue
2. Traffic / conversion
3. Production health
4. Payments
5. Account / access failures
6. Lumina health
7. Support volume
8. Marketing performance
9. Critical incidents
10. Decisions requiring Founder attention

---

## Architecture

Read-only composition. No new event taxonomy. No new payment, auth, or monitoring runtime.

| Panel | Authoritative source | Investigate |
| --- | --- | --- |
| Enrollment / revenue | Row 151 billing + activation | `/ops/admin/launch-dashboard` |
| Traffic / conversion | Row 150 events + Row 84 landing sessions | `/ops/admin/launch-dashboard` |
| Production health | Row 61 `launch_dashboard_meta` snapshot (`row61_monitoring`) | `/ops/admin/launch-dashboard` |
| Payments | Row 151 revenue/failures + Row 61 payments probe | `/ops/admin/launch-dashboard` |
| Account / access | Row 150 `auth_failed` / `registration_failed` + availability | `/ops/admin/launch-dashboard` |
| Lumina health | Row 150 `lumina_opened` / `lumina_error` + availability | `/ops/admin/launch-dashboard` |
| Support volume | Row 153 tickets (counts only) | `/ops/admin/support` |
| Marketing performance | Row 84 funnel (Instagram + TikTok) | `/ops/admin/launch-kpi` |
| Critical incidents | Row 151 risk register + Row 61 founder alerts | `/ops/admin/launch-dashboard` |
| Founder decisions | AOS `aos_founder_decisions` OPEN queue + Row 151 Founder gate | `/ops/admin/agent-operations` |

The page **reads** `loadMonitoringSnapshot()`. It does **not** run `runProductionMonitoring()`, does not write Stripe, and does not change middleware. `/ops/admin/*` is already admin-gated.

---

## Founder attention

**YES** when any of:

- Row 151 Launch Health is RED or Row 151 Founder attention is already YES
- Production, payments, account/access, or critical-incidents panel is RED
- An OPEN AOS Founder decision exists
- Row 61 snapshot marks Founder attention or a founder-facing alert

Otherwise the strip states **No Founder action required.**

Approve / Reject / Review is **not** duplicated here.

---

## Missing telemetry

| Condition | Display |
| --- | --- |
| Row 61 snapshot missing | Production health **N/A** — not an outage, not false GREEN |
| Lumina unreported and no `lumina_error` | Lumina health **N/A** — not advertised as ping-monitored |
| AOS not connected and no launch Founder gate | Founder decisions **N/A** |
| No Row 61 payments probe and no billing activity | Enrollment / revenue and Payments **N/A** — empty is not GREEN |
| No analytics sessions or conversion events | Traffic / conversion **N/A** unless launch-day zero (YELLOW) |
| No auth/registration events or account activity | Account / access **N/A** |
| No Row 153 tickets | Support volume **N/A** |
| No Row 84 landing sessions or purchases | Marketing performance **N/A** |
| No Row 61 snapshot and empty risk register | Critical incidents **N/A** |
| Empty ledgers **with** a confirmed source (Row 61 payments PASS, or recorded activity) | Honest zeroes may be GREEN |

GREEN requires confirmed telemetry. Missing/unreported sources are N/A, never false GREEN.

---

## Privacy

Aggregates and operational titles only. The view does not include passwords, tokens, card data, CVV, Journey answers, Lumina conversation text, support message bodies, or email addresses.

---

## Test-data isolation

Live pages call `includeTest: false`. Controlled validation may pass `includeTest: true` in `npm run fab5:row209` only.

---

## Testing

```
npm run fab5:row209
```

Evidence: `ops/fab-5/runs/row-209-executive-dashboard-validation.json`

---

## Out of scope (intentionally)

- Stripe configuration, Cloudflare DNS, Vercel custom domains
- Auth catalog / middleware edits
- Merging Row 84 into Row 151
- Marking this row Complete
- Fabricating Founder approval

Row 209 is **not** marked Complete. Founder Acceptance is Kimberly Walker (human).
