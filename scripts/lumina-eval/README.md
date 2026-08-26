# Lumina Evaluation Suite (Rows 80–81)

Honest evaluation of the **current stub pipeline** (no LLM provider).  
Row 80 delivered the suite; Row 81 tunes to the acceptance threshold and documents known limitations.

## Run

```bash
npm run eval:lumina
```

Uses `npx tsx` with the repo TypeScript path aliases. Stores are isolated under a temp directory via `ForTests` seams — production `.data/` is never touched.

## Categories

| Category | What is measured |
| --- | --- |
| VOICE | Banned generic-AI phrases, branded terms, EN/ES tone, scenario stubs |
| MEMORY | Enable/write/retrieve, disabled blocks, clear, isolation, consent, `[remember]` |
| CONSISTENCY | Deterministic stub content, journey stage stability, branded terms |
| ACCURACY | Journey fixture echo, no invented completions/citations, assemble match |
| SAFETY | `[force-error]`, secret-like writes, no context dump, cross-account, injection |
| USEFULNESS | Relevant reply, citations fixture, retry after error, stage awareness |
| BILINGUAL QUALITY | Locale priority, EN/ES markers, turn override, dictionaries |
| JOURNEY-AWARE CONTEXT | Authoritative assemble (ignores client hint), catalog upcoming, stage echo on send |
| PRIVACY/CONSENT BOUNDARIES | Consent append on enable, disabled insight gating, isolation, no client context dump |
| LATENCY | Wall-clock `sendLuminaMessageForUser` p50/p95/max (stub threshold 5s) |
| COST | Honest stub reporting: `provider=none`, `0` tokens, `$0` |
| LUMINA REGRESSIONS | Load/send/memory/assemble/locale smoke after suite mutations |

## Known limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for stub/architecture limits, severity, mitigation, and whether each blocks launch.

## Stub vs future LLM

Today there is **no model**. Cost is measured as:

- `provider=none`
- `promptTokens=0` / `completionTokens=0` / `totalTokens=0`
- `estimatedUsd=0`

`estimateCostFromUsage()` in `cases/cost.ts` is the repeatable placeholder for future providers. For any non-`none` provider it returns `{ status: "unavailable" }` until real rates are wired — do not fabricate pricing.

Latency measures real local wall-clock of the send/assemble stub path. Fail only on throw/error or absurd max (default >5000ms).
