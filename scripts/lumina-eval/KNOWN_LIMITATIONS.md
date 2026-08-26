# Lumina Known Limitations (Row 81)

Honest limitations of the **current stub / architecture surface** evaluated by `npm run eval:lumina`.  
Row 80 treated the stub interface as acceptable for launch-critical evaluation of the implemented surface; Row 81 accepts the same scope after tuning to the acceptance threshold.

| Limitation | User impact | Severity | Mitigation | Blocks launch? |
| --- | --- | --- | --- | --- |
| No live LLM/provider — stub replies only (`provider=none`) | Limited conversational depth; replies are voice-consistent stubs, not model reasoning | Medium / known | Keep stub voice-consistent until later intelligence rows wire a provider | **NO** — launch accepts stub interface for this phase |
| Cost/token metering unavailable until a real provider | Measured as `$0` / `0` tokens; no live spend visibility | Low / known | `estimateCostFromUsage()` placeholder returns `unavailable` for non-`none` providers; do not fabricate rates | **NO** — expected for stub |
| Journey engine Chapters I–VII are built | Interactive chapters I–VII exist; Lumina still uses stub replies rather than model reasoning over full chapter text | Medium / known | Row 196 audits instructional integrity of the built chapters; Lumina remains stub-scoped | **NO** — does not block this evaluation of the implemented Lumina surface |
| No automatic summarization via model | Durable memory only from explicit writes / `[remember]` / fixtures — no model-generated summaries | Medium / known | Explicit remember + consent-gated writes until provider intelligence rows | **NO** — matches stub memory contract |
| Full `journeyContext` object is server-only | Clients never receive assembled insights/upcoming dumps (by design) | Low / intentional | Stage/state echoed only via controlled stub markers; privacy eval asserts omission | **NO** — privacy boundary, not a defect |

## Acceptance note

No launch-critical limitation above remains with **Blocks launch? YES** while Row 81 is declared complete. If a future provider or Journey-engine row introduces a true launch blocker, stop and report it before claiming acceptance.
