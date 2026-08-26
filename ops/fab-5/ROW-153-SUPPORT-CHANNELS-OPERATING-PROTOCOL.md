# ROW 153 — Support Channels Operating Protocol

**Status:** Complete. Founder Acceptance: YES. Founder Decision: APPROVED. Recorded 2026-08-21. Launch Roadmap and Founder Notes were not changed.  
**Workstream:** Email, Analytics, Support & Architect Experience  
**Primary support / customer experience:** Nia Prism — Chief Experience & Transformation Officer  
**Backup / routing / operations:** Michelle Northstar — Chief of Staff & Operations Officer  
**Technical / security escalation:** Imani Heartbeat — Chief Technology & Risk Officer  
**Launch date:** August 31, 2026  
**Source of truth:** this document.

Row 153 is a working Architect support operation. It does not create new Fab 5 roles. It does not invent a `legal@` mailbox.

---

## Support email

**Address:** `support@thebackhalf.org`  
**Public sender / reply identity:** The Back Half Support  
**Do not reply as Kimberly or from a personal Founder mailbox.**

Inbound mail is mapped into the ticket tracker (IMAP poll using the existing Google Workspace SMTP credentials, plus a controlled ingest path). Ordinary replies that include the ticket ID in the subject or `In-Reply-To` attach to the existing case.

`privacy@thebackhalf.org` is reserved. Privacy requests currently enter this same tracker as category **Privacy**. Do not invent another address.

---

## Support form

**Location:** `https://thebackhalf.org/support` (English) and `/es/support` (Spanish).

Fields: Name, Email, Support Category, Subject, Message, optional “Are you already an Architect?”

The form instructs: **Please do not include passwords, payment-card information, or other sensitive account information in your message.**

It does not request passwords, authentication codes, full payment-card data, CVV, Journey answers, or Lumina transcripts.

A valid submission creates a ticket, assigns owner/priority/response-due, routes/escalates, and sends the automated acknowledgment.

---

## Ticket tracking

**Console:** `/ops/admin/support` (admin signed-in).  
**Store:** `.data/support/tickets.json` (server-only; gitignored).

Fields: Ticket ID, created, requester, category, subject, status, priority, assigned owner, last updated, response due, resolution, escalation, notes/history.

Statuses (one model): **NEW**, **IN PROGRESS**, **WAITING ON ARCHITECT**, **ESCALATED**, **RESOLVED**, **CLOSED**.

Ticket IDs look like `BH-S-YYYYMMDD-XXXXX` and are not sequential account numbers.

---

## Categories

| ID | Label |
|---|---|
| ACCOUNT_LOGIN | Account / Login |
| REGISTRATION | Registration |
| PAYMENT_BILLING | Payment |
| ONBOARDING | Onboarding |
| JOURNEY | Journey |
| LUMINA | Lumina |
| DOWNLOADS_MATERIALS | Downloads |
| MEMBERSHIP | Membership |
| PRIVACY | Privacy |
| TECHNICAL | Technical |
| GENERAL | General |
| OTHER | Other |

There is no Refund / Refunds category. The Back Half does not issue refunds. Payment questions, including refund requests, stay in **Payment**.

---

## Priorities

| Priority | Internal due | Examples |
|---|---|---|
| **P1 — Urgent** | 4 hours | Broad product access failure, checkout/payment outage, significant security concern, suspected privacy/data exposure, major production outage, multiple Architects with the same critical failure |
| **P2 — High** | 24 hours | Individual cannot access a purchased experience, duplicate-charge/payment problem, registration failure preventing entry, serious Lumina/Journey failure |
| **P3 — Normal** | 72 hours | Routine account question, general product assistance, download question, non-urgent Journey question |
| **P4 — Low** | 72 hours | Informational question, feedback, non-time-sensitive request |

Published Architect expectation: **response within 3 days, with a goal of 72 hours or less.** P1 items are not treated as ordinary three-day queue items. Do not promise a resolution time. Do not promise refunds.

SLA states: **within**, **approaching** (≤12 hours remaining), **overdue**, **urgent** (P1). The console and Row 151 dashboard flag overdue automatically.

---

## Automated acknowledgment

Exact P3/P4 body:

```
Hello {name},

Thank you for writing to The Back Half Support.

We received your request and created ticket {ticketId}.

We typically respond within 3 days, with a goal of 72 hours or less. Urgent security and privacy concerns are prioritized.

Please do not send passwords, payment-card information, or other sensitive account information in reply.

This is an automated acknowledgment. A member of The Back Half Support will follow up.

The Back Half Support
support@thebackhalf.org
```

P1 replaces the timing paragraph with: **This has been marked urgent and prioritized. We will not treat it as an ordinary three-day queue item.**

From: **The Back Half Support**. Reply-To: `support@thebackhalf.org`.

---

## Ownership

| Who | Duty |
|---|---|
| Nia Prism — Chief Experience & Transformation Officer | Primary support and customer-experience ownership |
| Michelle Northstar — Chief of Staff & Operations Officer | Backup, routing, and operational support |
| Imani Heartbeat — Chief Technology & Risk Officer | Technical, security, system-risk, and privacy/security investigation after appropriate routing |
| Founder | Only when Founder escalation criteria are met. Not the routine operator |

---

## Urgent escalation

| Trigger | Owner | Notification | Required response | Evidence |
|---|---|---|---|---|
| Security / privacy exposure, suspected breach, account-access with security implications | Imani Heartbeat — Chief Technology & Risk Officer (+ Michelle Northstar routing) | Ticket Escalated + decision log | Contain; do not request more secrets publicly | Ticket + `ops/fab-5/decision-log.json` |
| Major technical failure / outage / material access failure | Imani Heartbeat — Chief Technology & Risk Officer | Ticket Escalated + decision log | Investigate; restore | Ticket |
| Payment/revenue incident requiring urgent operational attention | Michelle Northstar — Chief of Staff & Operations Officer; Imani Heartbeat if outage; Founder if exception/chargeback severity | Ticket + decision log if Founder | No public refund promise | Ticket |
| Major Architect-experience failure | Nia Prism — Chief Experience & Transformation Officer + Michelle Northstar backup | Ticket Escalated | Experience diagnosis | Ticket |
| Legal (attorney, litigation, regulator) | Founder + Legal via established procedure | ACTION REQUIRED decision log | No substantive social/legal reply. No `legal@` | Ticket + evidence |
| Serious complaint / reputational / executive | Founder; Nia Prism for Architect-experience harm | ACTION REQUIRED | Founder judgment | Ticket + decision log |

---

## Email-to-ticket

1. Architect emails `support@thebackhalf.org`.  
2. Inbound poll (`/api/support/inbound`, Vercel cron `*/15 * * * *`, plus **Fetch inbound mail** on the console) creates or maps a ticket.  
3. Acknowledgment is sent unless the message is a reply to an existing ticket ID.  
4. Replies with `[BH-S-…]` or matching `In-Reply-To` append history instead of opening a duplicate.

If IMAP credentials are the existing Workspace SMTP user, no second platform is used.

---

## Row 83 social handoff

**Social interaction → private acknowledgment (T12–T16 / T24) → `support@` or `/support` → Row 153 ticket (`source: social_row83`) → owner assigned → tracked → escalation if required.**

Michelle creates the ticket from the social-engagement log so Instagram / LinkedIn / TikTok (if live) enter this same operation.

---

## Row 151 reporting

The Daily Launch Dashboard reads the ticket store and reports: new today, open, resolved today, unresolved, response-time, approaching/overdue SLA, repeat issues, tickets by category, P1/P2, urgent escalations, social routed counts. Definitions are the same as this protocol (72-hour published expectation; P1 uses the 4-hour due time).

---

## Privacy / security

- Form and acknowledgments never request prohibited credentials.  
- Stored messages redact payment-card patterns, CVV, and password/OTP material.  
- Acknowledgments do not echo the Architect’s message.  
- If an Architect voluntarily sends secrets: redact, do not repeat, escalate Privacy/Security to Imani, do not ask them to resend the secret.

---

## Manual steps

| Step | Owner |
|---|---|
| Authorize Google Workspace SMTP/IMAP for `support@thebackhalf.org` in production env (`SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM`) if not already present | Founder / Workspace admin |
| Use **Fetch inbound mail** if cron has not run yet | Michelle |
| Human reply from The Back Half Support identity, never Kimberly | Nia Prism (Michelle Northstar backup) |
| Close tickets after resolution | Nia Prism (Michelle Northstar backup) |

---

## Known limitations

- Dedicated `privacy@` mailbox READ/ROUTE is not a second tracker; Privacy is a category on this operation.  
- IMAP parsing of complex MIME/HTML mail may require a follow-up fetch of the plain-text part.  
- Production acknowledgment send uses the existing Workspace SMTP env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Local Google Workspace delivery was verified 2026-08-21 (authentication succeeded; Google accepted the message; automated acknowledgment status `sent`). The same five variable names are required in Vercel Production. Never log `SMTP_PASSWORD`.  
- Vercel Hobby may not honor 15-minute cron; the console fetch remains the launch-safe backup.

Row 153 is **Complete**. Founder Acceptance recorded 2026-08-21. The approved support implementation is preserved. Do not redesign this operation. Do not log `SMTP_PASSWORD`.
