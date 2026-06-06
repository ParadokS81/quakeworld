# Layer 2 corpus reconstruction -- arc plan

**Spec:** `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (brainstorm Passes 1-5, COMPLETE).
**Planner handoff:** `docs/superpowers/parking/2026-06-06-layer2-corpus-reconstruction-planner-handoff.md`.
**Proven recipe:** `apps/qw-oracle/scripts/calibration/` + `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md`.

**Goal:** Replace the 15-minute-session FTS unit in `search_solved_issues` with topic-coherent **threads** as the retrieval unit -- fence Discord chat into threads, embed each thread's raw member messages (voyage-4-large), store `chat_threads` + `thread_messages`, and rewire the tool to hybrid retrieval (vector primary + FTS via RRF). Calibration proved fenced threads beat session-FTS (arm D 72% over arm C, 69% over arm B; pure FTS whiffed 32/36 symptom queries). Then mine the tagged corpus for FAQ-discovery (the L3 authoring-priority signal).

**Status:** Planning. Phase MDs are drafted directly (lean mode -- the architecture is locked and the recipe is proven, so no per-phase fresh-terminal drafting fan-out), each sub-agent-verified before operator review. Execution fans out per-phase via `arc-executor` once approved.

---

## Read in this order

1. **[`decisions.md`](decisions.md)** -- 13 locked cross-cutting decisions. Every phase respects these. If one is wrong, amend it here (dated block); never drift in a phase MD.
2. **[`review-findings.md`](review-findings.md)** -- 10 pre-registered risks (no prior plan; these come from spec + live-source recon). Phase ownership table at the bottom.
3. **[`prerequisites.md`](prerequisites.md)** -- operator-side Task 0 (mostly already true from Arc 1; the one new item is verifying the probe's local-only output for Phase A).
4. **[`phase-template.md`](phase-template.md)** -- mandatory shape for each phase MD (includes the per-task execution-mode annotation).
5. **[`handoff-prompt.md`](handoff-prompt.md)** -- the per-phase executor-prompt template (file-as-prompt; strong arc identification).
6. **Per-phase MDs** (see the phase index).

---

## Phase index

Spine = the go/no-go path, planned in full. Deferred tier = named gated stubs, detail-planned only when their trigger opens. **Phase A is THE gate (decisions.md D2): C / buckets-E / D do not run unless A delivers.**

| Phase | Status | MD | Deliverable | Runnable state at end | Gate / depends on |
|---|---|---|---|---|---|
| **A** -- Increment 1 | drafted (verified) | `phase-A-increment-1.md` | migration (`chat_threads` + `thread_messages`) -> thin loader promotes the 1,008 already-fenced probe threads -> rewire `search_solved_issues` to hybrid thread retrieval | `search_solved_issues` answers from threads on the Feb-Mar 2021 slice; old session path retired | **THE GATE.** Nothing upstream. Go/no-go: do threads beat session-FTS on live queries? |
| **B** -- Chunk-size sweep | drafted (verified) | `phase-B-chunk-size-sweep.md` | 3 fence agents (750 / 1500 / 3000) on a worst-case `#quakeworld` chunk; pick the largest size holding 0% hallucination + coherence ~4+ | the production fence cap is chosen | Independent of A; runs in parallel. Output sizes C. |
| **C** -- Batched backfill | drafted (verified) | `phase-C-batched-backfill.md` | channel x ~1yr idempotent batches over the full corpus (Sonnet / conc-5 / paced / honest counts); `resolution_status` rides as a passenger | the whole corpus is fenced + embedded + retrievable | PRECONDITION: A gate green + B's cap. |
| **buckets-E** -- FAQ-substrate enrichment | drafted (verified) | `phase-buckets-E-enrichment.md` | a re-runnable Workflow pass labels each thread `buckets_question` / `buckets_answer` (9-bucket taxonomy) | threads carry bucket tags; FAQ-discovery queries are possible | Post-backfill; decoupled from fencing. |
| **D** -- Threshold recalibration | stub | (detail-planned on trigger) | retune `L2_RRF_*` against fenced-thread retrieval | calibrated `match_quality` for `search_solved_issues` | Trigger: enough corpus backfilled. |
| author-trust note | stub | (detail-planned on trigger) | tiny curated author-authority reference; consumer-side synthesis nudge, never overrides L1 | -- | Trigger: build when convenient. |
| clustering-for-analysis | stub | (detail-planned on trigger) | offline clustering to COUNT FAQ recurrence (never retrieval-time merge) | -- | Trigger: only if N-separate-hits annoys a consumer or FAQ-counting wants automation. |

Status transitions: `not started` -> `drafted (awaiting review)` -> `approved` -> `in execution` -> `shipped`.

**Pipeline ordering:** A + B (parallel) -> [A gate] -> C (`resolution_status` rides) -> buckets-E -> D. author-trust + clustering are to-the-side stubs.

---

## Slicing rationale (why these phases, this shape)

- **A is a tracer bullet** (Cockburn/Hunt-Thomas): a lean but complete end-to-end slice fired through the highest-risk axis (does thread retrieval actually win in production?). It is self-verifying -- the gate IS the verification -- so there is no verification-regime collision.
- **B is a calibration probe** -- 3 agents, self-contained gate (hallucination + coherence), independent of A.
- **C is horizontal data-backfill fan-out** against the proven schema (A) and proven cap (B). Idempotent by hard requirement.
- **buckets-E is data-backfill enrichment** -- post-backfill, re-runnable, decoupled.

This is the canonical "vertical tracer first, then horizontal fan-out" mixed pattern. No pure-horizontal-for-a-UI anti-pattern; no pass-through phases; no phase whose verification depends on a later phase existing.

---

## What this arc deliberately does NOT cover

Per `decisions.md` D13:

- Community profile tools (`search_profiles` / `lookup_by_nick`), the author->profile crosswalk, and the query-time lazy-resolve-mentions loop -> the qwiki community-reference arc (Pass 4 severed them).
- Cross-session merge at retrieval time -> demoted; survives only as the clustering-for-analysis stub (offline FAQ-counting).
- Per-thread summaries -> dropped (D3; embed raw messages).
- IRC -> excluded since Arc 1 D9-revised.

If a phase drifts into one of these, that is scope creep -- flag it.

---

## Operator quick-reference

- **Executing a phase:** open a fresh terminal, type `@docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-<ID>-executor-prompt.md`. The executor (arc-executor skill) reads the MD, executes per task modes, runs verification, halts.
- **The gate:** after Phase A, the operator runs the live-query comparison (threads vs sessions) per the gate procedure in `phase-A-increment-1.md`. Green -> greenlight C. Underwhelms -> stop; capture the negative result.
- **A new risk emerges during a phase:** append to `review-findings.md` with a sequential R-number + phase tag.
- **A decision turns out wrong:** amend `decisions.md` with a dated block before re-running the phase.
