# Row 60 — Participant Age Eligibility and Minor Access Policy

**Status:** COMPLETE. Founder Acceptance: YES. Founder Decision: APPROVED. Percent Complete: 100%.  
**Technical / risk owner:** Imani Heartbeat — Chief Technology & Risk Officer  
**Operational coordination:** Michelle Northstar — Chief of Staff & Operations Officer  
**Experience:** Nia Prism — Chief Experience & Transformation Officer

### Founder Acceptance record

- Minimum Participant Age: **18**
- Eligibility: **18+ Only**
- Founder Decision: **Approved**
- Age Gate: **Implemented**
- Registration Enforcement: **Implemented**
- Checkout Enforcement: **Implemented**
- Protected Experience Enforcement: **Implemented**
- Under-18 Support Submission: **Blocked**
- Date of Birth Collection: **None**
- Founder Acceptance: **Yes**
- Remaining Row 60 Blockers: **None**
- Percent Complete: 100%
- Status: Complete
- Founder accepted: 2026-08-21

The Row 60 implementation presented for Founder Review is accepted. The approved 18+ implementation is preserved exactly as reviewed. Legal-document bodies, Row 150, Row 151, Row 153, Launch Roadmap, and Founder Notes are outside this closure.

## What launched

- Privacy-preserving 18+ attestation. Date of birth is not collected.
- Signed `bh-age-eligibility` cookie. Forged cookies are not treated as eligible.
- Accounts store `ageEligible` only after confirmation. No COPPA, minor, teen, parent, or guardian workflows.
- Ineligible visitors cannot register, check out, use Lumina, open AI Kimberly participant URLs, buy membership, or submit Architect support personal information.
- Marketing philosophy is unchanged. Eligibility language says participants must be at least 18. It does not say The Back Half is “for adults only.”

## Surfaces

| Surface | Enforcement |
| --- | --- |
| Marketing CTAs | Disclosure only |
| Registration / Google registration | Age gate + server cookie check |
| Checkout / membership | Cookie + account flag |
| Architect / Journey / Lumina | Middleware + account flag |
| AI Kimberly URLs | Path gated even though no public chat exists |
| Support form | Cookie required before ticket creation |
| Privacy, Terms, Participant, Membership, AI Disclosure | Launch eligibility notice |
| English / Spanish, desktop / mobile | Same rule |

## Analytics

Anonymous `page_viewed` events may fire on public pages before eligibility. They do not include name, email, or date of birth. Row 150 taxonomy is unchanged.
