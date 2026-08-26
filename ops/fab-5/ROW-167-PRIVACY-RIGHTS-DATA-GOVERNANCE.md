# ROW 167 — Privacy Rights and Data Governance

**Status:** Technical process implemented. Founder acceptance is not recorded.  
**AOS work ID:** al-167  
**Process owner:** Imani Heartbeat — Chief Technology & Risk Officer  
**Routing owner:** Michelle Northstar — Chief of Staff & Operations Officer  
**Experience owner:** Nia Prism — Chief Experience & Transformation Officer  
**Founder:** Kimberly M. Walker — acceptance authority and Founder-reserved escalation only. Not the routine operator.  
**Authoritative system map:** `ops/fab-5/privacy-data-map.json`  
**Holds register:** `ops/fab-5/privacy-legal-holds.json`  
**Tracker:** `.data/privacy/requests.json` locally; `privacy_rights_requests` in Postgres when configured.

This is an operating process. It does not rewrite the Privacy Policy. It does not issue legal conclusions, statutory deadlines, or Founder acceptance.

---

## Intake

| Surface | Path |
|---|---|
| Public form | `/privacy/request` and `/es/privacy/request` |
| Architect settings | Link to the privacy request form |
| Support form / mailbox | Category **Privacy** opens a linked `BH-PR-` request when it is a rights request, not an incident |
| Mailbox | `privacy@thebackhalf.org` (Row 153 inbound still creates a support ticket) |

Do not ask for passwords, payment-card data, one-time codes, or government identification numbers.

---

## Request types

Access, correction, deletion, export, consent withdrawal where applicable, inquiry.

Incidents (breach, exposure, unauthorized disclosure) stay on the Row 153 P1 incident path. They are not fulfilled as ordinary rights requests.

---

## Identity verification

1. Signed-in session whose email matches the requester email → verified.  
2. Otherwise a confirmation link is emailed. The store keeps a hash, not the raw token.  
3. Login is never bypassed. Tokens do not grant account sessions.  
4. Deletion requires explicit confirmation in addition to identity verification.

---

## Tracking

IDs: `BH-PR-YYYYMMDD-XXXXX`.  
Statuses: RECEIVED, IDENTITY_PENDING, VERIFIED, IN_PROGRESS, WAITING_ON_REQUESTER, FULFILLED, PARTIALLY_FULFILLED, DENIED, CLOSED.  
Acknowledgment operating target: 72 hours.  
Fulfillment operating target after verification: 30 days. These are operational tracking targets, not legal interpretations.

Console: `/ops/admin/privacy-rights` (admin ops).

---

## Fulfillment

| Type | Action |
|---|---|
| Access / Export | Assemble a JSON package from mapped systems. Omit password hashes, Google ids, tokens, and payment-card data. |
| Correction | Update verified profile fields (name, locale, time zone). |
| Consent withdrawal | Disable Lumina memory and clear the memory payload. Required service consents are not withdrawn while the account remains active. |
| Deletion | Delete participant content; anonymize the account; revoke entitlements; unlink analytics user ids; retain consent audit, billing transactions, correspondence, request logs, backups, and vendor records. |
| Inquiry | Route. No autonomous legal answer. |

Active rows in `privacy-legal-holds.json` pause deletion. Qualified human legal review is required for hold scope. Agents must not conclude the law.

Stripe configuration is not changed. Stripe customer deletion is a manual vendor follow-up, not an API call from this process.

---

## Owners and escalation

| Event | Owner | Escalate |
|---|---|---|
| Intake / routing | Michelle Northstar | Imani if technical; Founder if regulator/attorney |
| Identity, access, export, deletion, correction, consent withdrawal | Imani Heartbeat | Founder if a privileged account or unresolved identity dispute |
| Architect-experience impact after deletion | Nia Prism | Michelle for coordination |
| Legal hold / legal conclusion | Human legal | Founder if Founder authority is required |
| Privacy/security incident | Imani + Row 153 P1 | Founder at existing incident thresholds |

Founder acceptance, if required, stays with Kimberly Walker (human).
