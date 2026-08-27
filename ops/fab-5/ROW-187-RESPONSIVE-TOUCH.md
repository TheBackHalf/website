# Row 187 — Fix Responsive and Touch Issues

**Technical / risk owner:** Imani Heartbeat  
**Supporting experience owner:** Nia Prism  
**Founder acceptance:** Open — Kimberly Walker (human) only. This file does not record Founder acceptance.

## Scope

Resolve overflow, clipped text, keyboard overlap, tap targets, scrolling, media, and performance on launch-critical public and Architect surfaces.

Workbook dependency: Mobile Device Testing (row 186). Mechanical source proof is in this pull request. Nia retests the participant experience on priority iPhone/Android sizes before Founder review.

## What changed

- Root Next.js `viewport` now sets `viewport-fit=cover` and `interactive-widget=resizes-content`. Pinch-to-zoom is unchanged.
- `VisualViewportInset` publishes `--bh-keyboard-inset` and scrolls focused fields into view on coarse pointers so Lumina and forms stay above the software keyboard.
- Document root clips horizontal overflow. Hero supporting copy wraps below 1280px. Site header wraps. Journey stage labels wrap instead of clipping.
- Interactive launch controls use a 44px tap floor: language switcher, public/Architect nav, account menu, onboarding ratings, chapter nav, footer/legal links, age-gate choices, consent checkboxes.
- Architect mobile navigation locks background scroll and respects safe-area insets.
- Replaced media (`img` / `video` / canvas and founder media hosts) cannot overflow their content box.
- Hero kenburns is disabled at mobile widths to reduce paint cost. Reduced-motion remains globally respected.

## What this does not claim

- Founder acceptance
- Production/runtime device-lab proof
- Nia participant retest
- Row 186 mobile-device testing complete

## Evidence

- Validator: `npm run fab5:row187`
- Report: `ops/fab-5/runs/row-187-responsive-touch-validation.json`
- Next action: Nia retests participant experience. Founder acceptance stays with Kimberly Walker (human).
