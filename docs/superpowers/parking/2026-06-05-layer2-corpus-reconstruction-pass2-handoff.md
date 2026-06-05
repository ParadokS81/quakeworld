# Layer 2 corpus reconstruction -- Pass 2 handoff (Calibration gate)

**For:** a fresh arc-brainstormer terminal running Pass 2 of the reshaped Layer 2 corpus reconstruction arc.
**Supersedes:** `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction-pass2-handoff.md` (that handoff was for the OLD Pass 2 = stage-by-stage refinement including the now-deleted Stage 0 primer; do NOT use it).
**Created:** 2026-06-05 at Pass 1.5 close.

## Where things are

The arc was shelved at brainstorm Pass 1, then reshaped at Pass 1.5 (2026-06-05). The reshape: the glossary / historical-data primer is NOT a prerequisite; embedding is knowledge-free; community knowledge moves to query time (lazy / agentic retrieval); the embedding arc is decoupled from the community-knowledge arc. Pass 1 + Pass 1.5 are committed.

Pass 2 is the **calibration gate**: design the cheap sample-test that decides how much LLM disentanglement the chunker actually needs, BEFORE speccing the chunker (Pass 3). This is the highest-leverage early decision -- it determines the whole segmentation approach.

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- the SoT. Read the "Reshape (Pass 1.5)" section FIRST, then the rest. It carries the locked + amended decisions; do NOT relitigate them.
2. `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- Pass 1 + Pass 1.5 status.
3. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- the 287-line architectural spine (cost model $130-140, schema shape, Voyage / vector(1024) / cosine 0.85 drafts, sample-test design). Now relevant: Pass 2 needs the cost + pipeline detail it carries.
4. `apps/qw-oracle/CLAUDE.md` Layer 2 status block + `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- the current live Layer 2 schema (`messages` / `sessions` / `session_references`) the test runs against.
5. Memory: `project_l2_lazy_retrieval_reshape.md`, `feedback_one_question_at_a_time.md`, `feedback_be_decisive.md`, `feedback_cheap_probes_inform_expensive_passes.md`.

## Critical rules

- This is arc-brainstormer, Pass 2. One sub-question per turn (the pass-naming flow already ran at Pass 1.5; do NOT re-run it). Drain locked decisions into the design spec's Pass 2 section inline.
- Do NOT re-introduce the Stage 0 primer. It is deleted. If a sub-question seems to need it, that is a signal to surface to the operator, not to silently restore it.
- The live corpus: 728,863 Discord messages, 4 channels (#quakeworld 393k / #dev-corner 209k / #helpdesk 106k / #antilag 20k), 2016-2026, currently grouped into 86,423 dumb 15-min-gap sessions. Postgres `qw_oracle` is live (container `qw-oracle-postgres-dev`, `postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle`).
- Cheap-probe discipline (`feedback_cheap_probes_inform_expensive_passes.md`): the sample-test is only worth designing if it informs the expensive Pass 3 chunker decision. Keep it cheap and decision-shaped.

## First three actions

1. Read the design spec Reshape section + the thread-reconstruction spine's sample-test and cost sections.
2. Open Pass 2: state scope ("calibration gate -- sample-test design"), drain destination (design spec Pass 2 section).
3. First sub-question: what is the corpus slice for the test (which months, which channels, how many messages), framed so the result generalizes to the full corpus.

## When in doubt

The point of Pass 2 is to replace "how smart does the chunker need to be?" (a guess) with a cheap experiment that answers it. If a decision does not change what the sample-test measures or what it unblocks, it belongs in Pass 3, not here. Keep Pass 2 bounded to the test design.
