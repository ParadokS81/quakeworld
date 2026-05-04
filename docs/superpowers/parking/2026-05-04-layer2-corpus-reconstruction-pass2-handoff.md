# Brainstorm handoff -- Layer 2 corpus reconstruction Pass 2

**Use as the literal first message in a fresh `claude` terminal.** This terminal continues the multi-pass arc-brainstormer for the Layer 2 corpus reconstruction arc.

---

## Where things are

Pass 1 (adjacent topics drain) closed on 2026-05-04. The locks landed in:

- `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- the design spec, with Pass 1 outputs and Pass 2-4 scope placeholders. **Source of truth from Pass 1 onward.**
- `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- arc capture + Pass 1 status section (sub-question table + carry-forwards by track).

Pass 2 scope: stage-by-stage refinement. Walk Stages 0 through 4 in order; per stage, confirm shape, surface deltas vs the 2026-05-03 thread-reconstruction parking doc, settle the stage-tied open questions enumerated in the design spec's "Pass 2-4 scope" section.

## Skill to invoke

`arc-brainstormer` (in `~/.claude/skills/arc-brainstormer/`). The skill's pre-flight checks include reading prior-pass outputs as source-of-truth for locked decisions; do NOT relitigate Pass 1 locks silently.

## Required reads (in priority order)

**Primary inputs (read in full):**

1. `docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` -- Pass 1 outputs + Pass 2-4 scope placeholders. The locked decisions are durable; Pass 2 builds on them, not around them.
2. `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- arc capture + Pass 1 status. Carries the original "Open questions for the brainstorm" section -- many of those route to Pass 2 sub-questions.
3. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- 287-line architectural spine. Stage definitions, schema sketches, cost model, sample-test design. ~80% of the pipeline shape is here.
4. `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- 9-bucket taxonomy that Stage 4 consumes.

**Cross-references (skim):**

5. `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` -- research informing Stage 1 / Stage 2.
6. `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- lockstep flagging context for Stage 4 buckets.
7. `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` -- D5, D7, D9-revised, D18.
8. `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- current Layer 2 schema; this arc proposes additions.
9. `apps/qw-oracle/CLAUDE.md` and `CLAUDE.md` (monorepo root) -- project context.

**Precedents and seed data:**

10. `packages/qw-knowledge/terminology/` -- existing 353-line voice-transcript-derived glossary; Stage 0 primer seed.
11. `apps/quad/` voice-transcript analyzer -- precedent pattern for Stage 0 iterative LLM-uncertainty-sampling.

## Pass 1 locks (do NOT relitigate)

These are durable from Pass 1; Pass 2 does NOT re-decide them. They constrain stage-shape:

- **Cross-fork:** light L1 inclusion of Dusty's antilag fork + 1-2 concept notes; NOT a Stage 4 metadata field.
- **Time / era awareness:** out of scope for L2 prep (lives at MCP query-time discretion).
- **Reply edges:** within-chunk reply pairs go in the same Stage 2 sub-thread; cross-session edges still feed Stage 3 similarity.
- **Author role hints:** iterative skill-baked role-list with operator-verified seed; analyzer suggests additions per-chunk.
- **Bucket rubric depth:** empirical discovery via 3-6 month sample; 9 buckets + multi-tag stand.
- **Analyzer output format:** JSON (Anthropic structured-output mode); not a UX surface.
- **Abstain path:** per-chunk and per-thread abstain flag with reason. NO task-confidence score for v1.
- **Meta-patterns:** empirical discovery over top-down rubric; prep-work as cheap insurance, not gold-plated.

If a Pass 2 sub-question genuinely contradicts a Pass 1 lock, surface the conflict to the operator before proceeding. Do NOT silently redecide.

## Operator preferences (carry forward from Pass 1)

These remain durable; honour throughout Pass 2:

- Plain English first; technical chain follows only where it carries decision content.
- One question at a time during Q/A; batch dumps collapse discussion.
- Trust operator pace estimates; surface only concrete blockers.
- ASCII discipline in checked-in docs (no em / en dashes, no smart quotes, no emojis).
- Be decisive; give recommendations; do not poll for agreement.
- Inline pairs over split panels.
- Verification before synthesis.
- No subagents for mechanical markdown edits.
- No case sensitivity outside passwords.

## First action

When you start, do this in order:

1. Read the design spec (file 1 above) in full. The Pass 1 outputs are the foundation; the Pass 2-4 scope placeholders enumerate the stage-tied open questions.
2. Read the arc capture (file 2) -- focus on the Pass 1 status table and carry-forward tracks.
3. Skim the thread-reconstruction parking doc (file 3) -- specifically the Stage 0/1/2/3/4 sections to refresh the architectural shape Pass 2 will refine.
4. Acknowledge to the operator: brief one-paragraph orientation summary covering (a) Pass 1 closed with the lock-list (link the design spec), (b) Pass 2 scope is per-stage refinement walking Stages 0 to 4, (c) sub-questions are sourced from the design spec's Pass 2 placeholder section.
5. Propose the per-stage sub-question list for Pass 2:
   - Stage 0: primer artifact location, active L1 auto-lookup loop placement, convergence criterion calibration.
   - Stage 1: heuristic-pruning bootstrap scope, banter-signal feature list, recall-precision tradeoff.
   - Stage 2: chunk-size sweep parameters, quiet-hour gap definitions, within-chunk reply-edge integration mechanics.
   - Stage 3: cosine-similarity threshold, participant-overlap weight, reply-graph edge weight, clustering algorithm choice.
   - Stage 4: schema confirmation, bucket-tagging integration shape, role-list iteration wiring into the prompt.
6. Ask the operator: "Walk Stages 0 to 4 in order with those sub-questions, or restructure?" One question; wait for response before opening Stage 0.

Do NOT pre-empt by drafting stage refinements yourself. The operator may have stage-shape opinions accumulated since Pass 1.

## What this terminal does NOT do

- It does not write phase MDs. arc-planner does that, after all four brainstorm passes exit.
- It does not edit `HANDOVER.md`. The three superseded items stay in place until arc-planner / arc-orchestrator scaffolding.
- It does not modify the existing parking docs from 2026-05-03 or earlier. They are input artifacts.
- It does not litigate Pass 1 locks silently. Conflicts surface for explicit amendment.
- It does not execute any code. The Postgres database is read-only from this terminal's perspective.

## Exit condition for Pass 2

Pass 2 closes when each stage's open questions are settled (or explicitly carry-forwarded to Pass 3 / Pass 4) and the design spec gains a "Pass 2 outputs" section with the per-stage decisions. The pass ends with a fresh-terminal handoff prompt for Pass 3 (cross-cutting decisions): author-trust placement, trigger discipline, pipeline ordering, cost refresh, sample-test scope.

## When in doubt

- Re-read the design spec's Pass 1 outputs section -- the locks are durable.
- Re-read the 2026-05-03 thread-reconstruction parking doc -- it is the architectural source of truth for stage shape.
- Ask the operator. One question per turn.
