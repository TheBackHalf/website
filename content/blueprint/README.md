# The Back Half Blueprint — Production Content

Founder-approved manuscript text lives under `content/blueprint/manuscript/`.

## Insertion workflow

1. Add approved manuscript modules under `content/blueprint/manuscript/` (one file per section, verbatim text).
2. Wire sections in `content/blueprint/manuscript/index.ts` to export typed content blocks.
3. Update print components to read manuscript when present; until then, slots display **APPROVED COPY REQUIRED**.
4. Run `npx puppeteer browsers install chrome` once (if export fails to launch Chrome).
5. Run `npm run export:blueprint` (requires dev server or `BASE_URL`).

## Document structure

See `document-structure.ts` for the canonical section order matching the approved Blueprint table of contents.

## Do not

- Invent, summarize, or rewrite approved copy in this folder.
- Change section order without founder approval.

## Export outputs

PDFs are written to `public/downloads/blueprint/`:

- `the-back-half-blueprint.pdf` — The Back Half Blueprint guidebook
- Standalone artifact PDFs (6)
- `back-half-architect-completion-certificate.pdf`

The former Print Edition / Digital Edition split is retired for Architect-facing downloads.
