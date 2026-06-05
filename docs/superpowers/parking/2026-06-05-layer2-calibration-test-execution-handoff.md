# Layer 2 calibration test -- EXECUTION handoff (fresh terminal)

**For:** a fresh terminal that BUILDS and RUNS the Layer 2 calibration probe.
**Created:** 2026-06-05 (planning session hit ~330k context; handing off clean before execution).
**Mode:** implementation probe (NOT brainstorm, NOT the production arc). Keep it cheap and decision-shaped. Nothing has been built yet -- start from Stage 1.

## Where things are

The probe was DESIGNED in the brainstorm (Pass 2) and the build was PLANNED in a prior session. That session also discovered a hard constraint that reshaped the architecture: **the operator runs on a Claude Max subscription -- there is NO `ANTHROPIC_API_KEY`.** So the LLM-in-the-loop jobs are done by **Claude workflow-agents** (the `Workflow` tool), not API calls. The deterministic spine (slice / Voyage embed / cosine / FTS / aggregate) runs as Bun scripts -- `VOYAGE_API_KEY` already exists and works.

The authoritative spec for what to build is the plan. **Nothing in `apps/qw-oracle/scripts/calibration/` exists yet** -- you create it. The 2021 window is already locked (Feb-Mar 2021) via a density drill; do not re-derive it.

## Reads required (in order)

1. **`docs/superpowers/plans/2026-06-05-layer2-calibration-test.md`** -- THE PLAN. Hybrid architecture, locked params, full Stage 1-5 with code for the deterministic scripts + both Workflow scripts (schemas + agent prompts). This is your build spec; follow it.
2. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- the "Pass 2 outputs" section IS the test design (arms, eval substrate, decision rule). Read the "Reshape (Pass 1.5)" section: it is WHY there is no primer and why the fencer needs no domain knowledge.
3. `docs/research/2026-06-05-chat-corpus-retrieval-methods.md` -- arm dispositions + the pairwise-judge rationale + the "Uncharted" section (what the test must measure).
4. `docs/superpowers/parking/2026-06-05-layer2-calibration-test-handoff.md` -- the ORIGINAL build handoff. Still correct on intent + reads; **SUPERSEDED only on the execution mechanism** (it pre-dates the no-API-key discovery -- ignore any implication of direct API calls; the plan's workflow-based approach wins).
5. `apps/qw-oracle/shared/embedding.ts` (Voyage client) + `apps/qw-oracle/shared/db.ts` (postgres-js) + `apps/qw-oracle/scripts/load-chat/` (slice/segment patterns to reuse).
6. The `Workflow` tool description (you will run two workflows). The operator has ALREADY opted into the workflow run for this probe -- launch them directly, no re-confirmation needed.

## Critical rules

- **No API key / no SDK.** LLM jobs = Workflow agents only. Do NOT `bun add @anthropic-ai/sdk`. If a step seems to need a key, re-read the plan's architecture.
- **Voyage LOCKED** (voyage-4-large index / voyage-4-lite query); do not swap. **Light-prune only** (chat/link); no banter-pruner. **Eval = pairwise judge with position-swap, NOT self-recall**; query source is neutral real sessions.
- **Chunk size:** cap 750 messages, cut at 3h lulls -- safely below the attention cliff so arm D is fairly powered. The Stage-1 prep script prints chunk/session counts (the agent-spend preview) BEFORE you launch Workflow A -- glance at it.
- **DB:** Postgres in Docker (`qw-oracle-postgres-dev`, `postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle`); read live `messages`/`sessions`/`session_search`, not export files. Bun runtime.
- **Git:** there are ~21 pre-existing uncommitted files from other work -- `git add` ONLY the probe's own files, never `git add -A`.
- **Report faithfully:** a result that kills the expensive arm D (B or C within margin of D) is a VALID, valuable outcome. Tag outputs with model + prompt version; ASCII in checked-in artifacts.

## First three actions

1. Verify prereqs: `docker ps | grep postgres` (up), `grep VOYAGE apps/qw-oracle/.env` (key present). Read the plan end-to-end.
2. Build Stage 1 (deterministic, zero quota): `config.ts` + `vectors.ts`, `01-build-slice.ts` (verify ~6131 helpdesk / ~10115 quakeworld chat/link msgs), `02-prep-chunks.ts` (note the printed chunk count = fence-agent count).
3. Launch Workflow A (`wf-a-fence-queries.js`) with `args` from `scratch/wf-a-input.json`; on completion, build Stage 3 (embed + retrieve), then Workflow B, then Stage 5 report.

## When in doubt

The probe answers ONE question (research uncharted #1): does LLM fencing (arm D) actually beat cheap mechanical signals (arm C) -- or even dumb 15-min sessions (arm B) -- on retrieval quality for OUR corpus, and is there a per-channel asymmetry? If a decision does not change what the test measures (arm comparison on retrieval quality + disentanglement + cost), it is gold-plating -- cut it. When the verdict is in, a fresh terminal resumes the brainstorm at **Pass 3 (index mechanics)**, scoped by the numbers.
