# Layer 2 calibration test -- build + run handoff

**For:** a fresh terminal that BUILDS and RUNS the Layer 2 calibration test designed in brainstorm Pass 2.
**Created:** 2026-06-05 at Pass 2 close.
**Mode:** implementation probe (NOT brainstorm, NOT the production arc). Use `superpowers:writing-plans` to plan it, then execute. Keep it cheap and decision-shaped.

## Where things are

The "Layer 2 corpus reconstruction" arc is in its brainstorm phase. Pass 2 (the calibration gate) just closed: it DESIGNED a four-arm sample-test that decides how much LLM disentanglement the thread-chunker actually needs. This terminal's job is to BUILD that test, RUN it on a real corpus slice, and produce the result. **That result gates Pass 3** (the chunker spec is scoped by it), so the brainstorm cannot resume until this runs.

This is a bounded probe -- an afternoon of scripting, a few dollars in API calls. It is the cheap experiment that replaces a guess ("how smart does the chunker need to be?") with a measurement. Do not gold-plate it into production code.

## The probe in one paragraph

Pull a dense ~2-3 month 2021 slice of `#helpdesk` + `#quakeworld` from the live Postgres corpus. Light-prune it (existing classifier labels). Build retrieval units FOUR ways (A FTS / B 15-min sessions / C cheap mechanical signals / D LLM-fenced threads), embed each with Voyage v4, and run a shared query set against all four. Score by pairwise LLM-as-judge. Report which arm wins, by how much, per channel, and at what cost. Apply the pre-registered decision rule.

## Test pipeline (build steps)

1. **Slice.** Per-month density drill on both channels (2021); pick the densest contiguous ~2-3 month span (~12-18k messages). Do NOT hardcode months -- verify density first.
2. **Light-prune.** Keep `message_labels.category IN ('chat','link')`; drop reaction/bot/system (~3-5%). That is the ONLY prune -- no banter-pruner.
3. **Arm A (FTS).** Query the existing `session_search.session_tsv` -- already shipped, just run the queries.
4. **Arm B (sessions).** Embed each 15-min session's existing `session_search.content` with Voyage; vector search.
5. **Arm C (cheap signals).** Heuristic segmentation: time-gaps + reply edges (`session_references` / `messages.referenced_message_id`) + participant overlap. Embed segments. OPTIONAL zero-cost reference: run CODI (github.com/USIREVEAL/CODI, MIT, REST microservice) on the same slice as a published-method datapoint (no F-score -> comparative only).
6. **Arm D (LLM-fenced).** Lull-chunk the slice (cut at multi-hour quiet gaps), feed each chunk to an LLM, get topic-coherent threads (member message IDs + one-line label, NO domain priming). Embed each thread. Sweep ~2 chunk sizes (e.g. 1500 / 3000) and record message-ID hallucination rate per size.
7. **Query set.** Reverse-generate ~20-30 naive-user, symptom-phrased questions from real 2021 threads (vocabulary deliberately != the thread's) + the 12 real questions in `phase-8-eval-candidates.md`. Reverse-gen is a QUERY SOURCE only.
8. **Score (retrieval).** Pairwise LLM-as-judge: per query, two arms' top hits head-to-head, pick the more relevant, with **position-swap** (count only if the verdict survives flipping order) + **length-penalty rubric**. Anchor against the Phase 8 known answers. Read outputs as RELATIVE signal only.
9. **Score (disentanglement).** For C/D: message-ID hallucination rate (objective) + coherence spot-check on a sample.
10. **Decide.** Apply the decision rule from the spec (pattern-based + cost-default tiebreaker). Report the verdict + the per-channel asymmetry.

## Reads required (in order)

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- the **"Pass 2 outputs" section IS the test spec** (arms, eval substrate, decision rule, verified probes). Read the "Reshape (Pass 1.5)" section too: it is WHY there is no primer.
2. `docs/research/2026-06-05-chat-corpus-retrieval-methods.md` -- arm dispositions, the CODI lift, the pairwise-judge harness rationale, and the "Uncharted -- only the test answers" section (what the test must actually measure).
3. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- "The sample test" + cost model + chunk-size calibration detail (the original four-pipeline design).
4. `apps/qw-oracle/docs/phase-8-eval-candidates.md` -- the 12 real eval queries (anchor + cross-check) with known source sessions.
5. `apps/qw-oracle/shared/embedding.ts` -- the Voyage client (voyage-4-large index / voyage-4-lite query; one pooled vector per input).
6. `apps/qw-oracle/CLAUDE.md` -- Layer 2 status block + tech stack + always-on rules.
7. `apps/qw-oracle/scripts/load-chat/` -- existing `classify.ts` / `build-sessions.ts` / `build-session-references.ts`; reuse these patterns and the segmentation code for arm C.
8. Memory: `project_l2_lazy_retrieval_reshape.md`, `feedback_cheap_probes_inform_expensive_passes.md`.

## Critical rules

- **Do NOT build a primer / load community knowledge / pre-annotate the corpus.** Embedding is knowledge-free; the fencer needs NO domain knowledge -- it only draws topic boundaries. Entity resolution happens later at query time. (This is the Pass 1.5 reshape; rebuilding the primer is the one thing that would undo it.)
- **Eval scoring is pairwise LLM-as-judge, NOT synthetic-query self-recall.** Self-recall cannot discriminate the arms (all index the same corpus content). Reverse-generation is the query source only.
- **Voyage model is LOCKED** -- voyage-4-large (index) / voyage-4-lite (query), shared embedding space. Do not swap models. (voyage-context-3/4 is a post-test revisit, not for this probe.)
- **Light-prune only.** No banter-pruner -- the test MEASURES whether banter volume hurts.
- **Bun runtime + postgres-js.** DB is in Docker (container `qw-oracle-postgres-dev`); there is NO host `psql` -- use `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle ...` for ad-hoc SQL, or `shared/db.ts` (postgres-js) from Bun scripts (`DATABASE_URL=postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle`). The corpus is already imported -- read from `messages` / `sessions` / `message_labels` / `session_references` / `session_search`, NOT from export files.
- **Report results faithfully.** A result that kills the expensive LLM arm (B or C within margin of D) is a VALID, valuable outcome -- do not explain it away. Tag every generated output with model + prompt version (CLAUDE.md rule). ASCII discipline in checked-in artifacts.
- **Git:** there are ~21 pre-existing uncommitted changes in the working tree from other work -- do NOT sweep them in. `git add` only the probe's own files.

## First three actions

1. Read the spec's "Pass 2 outputs" section + the research doc (the two test specs).
2. Verify prerequisites: DB container up (`docker ps | grep postgres`), Voyage API key configured for `shared/embedding.ts`. Then run the per-month density drill and lock the exact 2021 window.
3. `superpowers:writing-plans` -- write a short plan for the four-arm build + judge harness (scripts, where they live, the run order), THEN execute. Suggested home: `apps/qw-oracle/scripts/calibration/` (a throwaway-probe dir; SQLite/JSON scratch outputs are fine here per the "derived artefacts" exception).

## When in doubt

The test exists to answer ONE central question (research uncharted #1): does LLM fencing (arm D) actually beat cheap mechanical signals (arm C) -- or even dumb 15-min sessions (arm B) -- on retrieval quality for OUR corpus? If a decision does not change what the test measures (arm comparison on retrieval quality + disentanglement quality + cost), it is gold-plating -- cut it. Keep the probe pointed at that question and report a clean verdict.

When the result is in hand, bring it back: a fresh terminal resumes the brainstorm at **Pass 3 (index mechanics)**, now scoped by real numbers.
