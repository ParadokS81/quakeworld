# Brainstorm handoff -- Layer 2 corpus reconstruction

**Use as the literal first message in a fresh `claude` terminal.** This terminal runs the multi-pass arc-brainstormer for the Layer 2 corpus reconstruction arc.

---

## Orientation

We are starting an arc-brainstormer pass for the **Layer 2 corpus reconstruction** arc -- a unified arc that folds three previously-parked items into one cohesive piece of work:

1. **Layer 2 thread reconstruction** (parked 2026-05-03). The architectural spine. ~80% of the pipeline is already specified -- 5 stages, full research backing, cost model.
2. **Author trust weighting in retrieval ranking** (HANDOVER future-arc).
3. **Layer 2 hygiene leftovers #2 + #6** (HANDOVER recently-opened) -- both superseded by the thread reconstruction pipeline.

The first parking doc (thread reconstruction) was most of the brainstorm already. The operator surfaced this consolidation in the 2026-05-04 main session and confirmed they have additional adjacent topics from the past week to fold in. The Postgres migration (Arc 1 Phase 3) just shipped, which is the precondition that makes this arc tractable now -- window functions, recursive CTEs over `referenced_message_id`, GIN-indexed `participants` arrays, and pgvector for thread embeddings all become natural to use.

The arc capture lives at `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md`. Read that first; it carries the full scope sketch, Why-arc-shaped justification, open questions, and what-is-NOT-in-scope.

## Skill to invoke

`arc-brainstormer` (in `~/.claude/skills/arc-brainstormer/`). If the skill is not yet present, fall back to `superpowers:brainstorming` and tell the operator the wave-1 skill hasn't shipped yet.

The arc-brainstormer skill names brainstorm passes upfront, runs each pass as a named scope with sub-questions, drains each pass into target docs (architecture spec / parking doc / decisions log), captures carry-forwards between passes, and exits when remaining unknowns are implementation-shaped (sized for arc-planner) rather than shape-shaped.

## Required reads (in priority order)

**Primary inputs (read in full):**
1. `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- the arc capture itself.
2. `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- the 287-line architectural spine.
3. `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- defines the 9-bucket taxonomy Stage 4 consumes.
4. `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` -- research on hygiene leftovers; #2 and #6 are superseded but the analysis informs Stage 1 and Stage 2 design.

**Cross-references (skim):**
5. `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- "Lockstep flagging architecture" section.
6. `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` -- focus on D5, D7, D9-revised, D18.
7. `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- current Layer 2 schema; this arc proposes additions.
8. `apps/qw-oracle/CLAUDE.md` -- project context.
9. `CLAUDE.md` (monorepo root) -- repo conventions.

**Precedents and seed data:**
10. `packages/qw-knowledge/terminology/` -- existing 353-line voice-transcript-derived glossary; Stage 0 primer seed.
11. `apps/quad/` codebase, particularly the voice-transcript analyzer -- precedent pattern for Stage 0 iterative LLM-uncertainty-sampling.

**HANDOVER state:**
12. `HANDOVER.md` -- read the three items being consolidated (line 37 author trust weighting; lines 38 + 59 L2 thread reconstruction + L2 hygiene). Do NOT edit handover until brainstorm produces a unified spec.

## Operator preferences (carry forward)

These are durable from operator memory; honour them throughout the brainstorm:

- **Plain English first.** Lead with what changes, what the tradeoff is, what the recommendation is. Technical chain follows only where it carries decision content.
- **One question at a time during Q/A.** Interactive scoping defaults to one question per turn. Batch dumps collapse discussion.
- **Trust operator pace estimates.** Operator's pace beats Claude's conservative ones; surface only concrete blockers.
- **ASCII discipline in checked-in docs.** No em dashes, en dashes, smart quotes, or emojis. Natural voice fine in conversation.
- **Be decisive.** Give architectural recommendations, don't poll for agreement.
- **Inline pairs over split panels.** Paired data renders inline at same depth.
- **Verification before synthesis.** Verify primary sources before writing synthesis docs. "Likely due to" is a research trigger, not a conclusion.
- **No subagents for mechanical markdown edits.** When the plan ships full file content / per-file diffs inline, execute directly with Edit/Write/Bash.
- **Output discipline is sentiment.** Every chosen format is itself communication; don't break ASCII discipline.
- **No case sensitivity outside passwords.** Lookups default to case-insensitive.

## First action

When you start, do this in order:

1. Read the arc capture (file 1 above) in full. It carries the framing.
2. Read the thread-reconstruction parking doc (file 2) in full. It carries the architecture.
3. Skim the L3 multi-domain doc (file 3) and the hygiene design (file 4).
4. Acknowledge to the operator: brief one-paragraph orientation summary covering the unified scope (one arc absorbing three handover items + adjacent topics), the architectural conviction (pipeline shape is ~80% locked from the 2026-05-03 doc), and the brainstorm goal (drain adjacent topics + lock open questions + size for arc-planner handoff).
5. Propose the brainstorm pass list -- arc-brainstormer's pattern is to NAME the passes upfront. Reasonable starter shape based on the open-questions section in the arc capture:
   - **Pass 1: Adjacent topics drain.** Operator enumerates the adjacent topics from the past week. Architectural fit + scope-or-defer triage on each. Carry-forwards captured.
   - **Pass 2: Stage-by-stage refinement.** Walk Stages 0-4. For each: confirm shape, surface deltas vs the 2026-05-03 doc, settle the open questions tied to that stage (primer location, L1 active investigation, bucket-tagging integration, schema additions, etc.).
   - **Pass 3: Cross-cutting decisions.** Author trust weighting placement, trigger discipline (Phase-8-gate vs architectural-conviction), pipeline ordering (serialize vs parallel Stage 0+1), cost model refresh, sample-test scope with L3 first-class.
   - **Pass 4: Phase decomposition + handoff to arc-planner.** Lock phase shape. Identify what the spec doc needs to look like before arc-planner scaffolds. Confirm what stays in the parking-doc trio (kept as input artifacts) vs what gets distilled into a new spec.
6. Ask the operator: "Does that pass list look right, or should we restructure / add / drop any?" One question; wait for response before starting Pass 1.

Do NOT pre-empt Pass 1 by drafting adjacent-topic positions yourself. The operator has the topics in their head; the pass exists to drain them.

## What this terminal does NOT do

- It does not write phase MDs. arc-planner does that, after this brainstorm produces a spec.
- It does not edit `HANDOVER.md`. Leave the three superseded entries in place; arc-planner / arc-orchestrator handle handover updates as part of scaffolding.
- It does not modify any of the existing parking docs. They become input artifacts; the brainstorm produces a NEW unified spec at session-end (probably under `docs/superpowers/specs/2026-05-XX-layer2-corpus-reconstruction-design.md` -- exact name decided by arc-brainstormer's exit step).
- It does not execute any code. The Postgres database is read-only from this terminal's perspective.
- It does not litigate the arc-shape classification. Arc-classifier already settled that (mode D, all 8 criteria fired).

## Exit condition

Arc-brainstormer's exit criterion: remaining unknowns are implementation-shaped (sized for arc-planner) rather than shape-shaped. When the architecture spec is locked, the bucket framework integration is settled, all adjacent topics are either folded in or explicitly out-of-scope, and the phase decomposition is sketched -- hand off to arc-planner in another fresh terminal.
