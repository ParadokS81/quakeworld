# Layer 2 corpus reconstruction -- Pass 4 (Query-time seam) brainstorm handoff

**For:** a fresh terminal resuming the multi-pass brainstorm at **Pass 4**, via the `arc-brainstormer` skill.
**Created:** 2026-06-06 at Pass 3 close.
**Mode:** BRAINSTORM (arc-brainstormer), NOT implementation. Drain into the spec's Pass 4 section.

## Where things are

The brainstorm is at **Pass 4 of 5**. Passes 1, 1.5 (reshape), 2 (calibration gate), and 3 (index mechanics) are complete. Pass 3 locked the v1 index: **prune -> fence -> embed raw messages -> hybrid retrieve**, with cross-session merge decoupled, per-thread summary dropped, and resolution/bucket labels deferred. The index produces within-chunk fenced threads of raw conversation; the query-time consumer LLM does the rest.

**Pass 3 verdict in one line:** v1 is fence + embed + hybrid-search, nothing else; the answering LLM reads the real messages and resolves everything else at query time. That "everything else at query time" IS Pass 4.

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- THE SPEC. Read the **"Pass 3 outputs"** section (the locked v1 index) + the **Reshape (Pass 1.5)** section (the lazy-retrieval thesis -- Pass 4 is where it lands) + the **"Pass 4: Query-time seam"** scope blurb.
2. Memory `project_l2_lazy_retrieval_reshape.md` -- the query-time lookup loop is the whole point of Pass 4.
3. Memory `project_qw_oracle_vision.md` + the stalled community-reference arc docs -- Pass 4 decides which of its MCP lookup tools (its Phase 6) to finish, since the query-time loop calls them. Find the community-reference arc parking doc(s) under `docs/superpowers/parking/` (qwiki / community-reference).

## What Pass 4 must decide (query-time seam)

- **The lazy-retrieval answer loop.** User asks -> embedding retrieval returns conversations -> Claude spots unresolved tokens (nicks / clan tags / tournament names) -> calls back into the MCP (`lookup_player` / `lookup_clan` / `lookup_tournament`) -> writes the grounded answer. Settle the loop's shape + where it lives (MCP tool internals vs consumer-LLM discretion).
- **Which community MCP lookup tools to finish** -- the keystone Phase 6 of the stalled community-reference arc; the only piece the loop calls. The concrete "what to resurrect vs drop" call: finish Phase 6 tools; Phase 4/5 incremental; drop Phase 7 primer (already superseded by the reshape).
- **Lookup budget / latency cap** -- how Claude decides which tokens are worth resolving without unbounded lookups per query.
- **The `match_quality` guard** -- keeps lookups honest (don't fabricate a profile for an unrecognized nick). Cross-ref the existing `match_quality` semantics in `apps/qw-oracle/API_CONTRACTS.md`.
- **Author-trust / role signal placement** -- re-homed here from the deleted index-time primer (Pass 1.5). Is it a query-time retrieval concern at all, or dropped? (Also slated for Pass 5 -- decide which pass owns it.)

## Critical rules

- **Brainstorm, not build.** Exit Pass 4 when unknowns are implementation-shaped (sized for arc-planner at Pass 5).
- **The index is LOCKED (Pass 3).** Pass 4 is the *consumer* of the index, not a re-litigation of it. Do NOT reopen merge / summary / embed-representation / chunk size.
- **Honor the reshape.** Community knowledge resolves at query-time via live MCP lookups, NOT an index-time primer. The expensive artifact (embeddings) stays immutable; the cheap artifact (profiles) stays live and compounds.

## First three actions

1. Read the spec's Pass 3 outputs + Reshape sections + the Pass 4 scope blurb. Confirm the Pass 3 -> 4 seam: the index returns raw-message conversation threads; Pass 4 is what the consumer does with them.
2. Invoke `arc-brainstormer` for "Pass 4 of Layer 2 corpus reconstruction (query-time seam)"; name the sub-questions upfront (answer loop / which lookup tools to finish / lookup budget / match_quality guard / author-trust placement).
3. Triage each as settled-by-reshape vs open.

## When in doubt

Pass 4 is where the two decoupled arcs (embedding + community-knowledge) finally meet, at the query-time lookup seam. The index hands over raw-message conversation threads; everything that turns them into a grounded answer -- resolving nicks, judging resolution, citing sources -- happens here, lazily, at query time.

---

**Handoff prompt (paste in a fresh terminal):**

> Pass 4 of the Layer 2 corpus reconstruction brainstorm (query-time seam). Read `docs/superpowers/parking/2026-06-06-layer2-pass4-query-time-seam-handoff.md` and resume via the arc-brainstormer skill.
