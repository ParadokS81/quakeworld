You are drafting Phase 1 of the game-content-catalog completion arc (2026-06-11).

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer. You
are in the WRONG arc if you find yourself working on: L3 concept notes /
weapon-pair notes (demand-driven-l3 arc), apps/docs-web (docs.quake.world
arc), match_event / log_template extraction (KTX onboarding, 2026-05-04). If
the task looks like one of those, HALT and tell the operator.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything. The phase MD becomes input to a separate execution
session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/README.md
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- especially D1, D2, D5, D10, D11, D12, D13, D16 for this phase.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-template.md
5. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-0-prereqs-loader.md
   -- Phase 0's outputs are your inputs (probe scripts, expected_counts gate).
6. docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md
   -- sections D4 (audit), M2 (workflow shape), M3 (validation).
7. apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml (FULL, 1011
   lines) -- the audit target: 37 entity rows + 41 mechanics rows, ~400
   cited props. Note the cluster layout and per-prop *_source_ref shape.
8. apps/qw-oracle/scripts/load-knowledge/quality-grid.ts lines 2455-2500 +
   2650-2670 -- makeGameplayKindProbe and the ktx probe registrations; your
   new id1 probes mirror this helper (no id1 gameplay probes exist today).

PHASE SCOPE (what the MD you draft must cover):

a. Re-verify ALL existing values (D1, spec D4): every cited prop across the
   37 entity + 41 mechanics rows, citation correctness against the QC source
   at research/repos/qwcl-original/QW/progs/. Workflow fan-out per-cluster
   (weapons / projectiles / items / mechanics sub-lists), Sonnet high, low
   concurrency (D10), structured output with per-value verdicts. Independent
   re-derivation: the agent reads the QC cold and re-derives the value, then
   compares -- agreement auto-passes, discrepancies escalate (D11).
   IMPORTANT: the fan-out enumerates rows from the LIVE YAML at execution
   time, never from a frozen list in your MD -- Track-A backfills may have
   landed between drafting and execution (D16).
b. Exhaustive gap sweep (spec D4): per-file Workflow pass over the full
   QW/progs tree (~20 QC files -- ls it during recon and pin the real list)
   hunting gameplay-value constants/behaviors with no row. Known gap seeds
   to verify and include: splash falloff gradient (T_RadiusDamage in
   combat.qc: points = damage - 0.5*distance) and self-splash half damage
   (attacker takes 0.5x own radius damage). Your MD pins the candidate
   schema (name, value, source_ref, proposed kind, rationale).
c. Operator SME gate (D12): the gap-candidate list ("gameplay-relevant or
   engine plumbing?") -- an explicit HALT step with the list format.
d. Assembly (D5): ONE inline assembler applies corrections + accepted new
   mechanics rows to id1-gameplay.yaml, bumps expected_counts in the same
   edit (D8), reloads.
e. Validation (D13): citation gate, seed double-load, and NEW id1 per-kind
   F1 probes (8 mechanics kinds + 3 entity kinds today, plus any kind whose
   count this phase changes) -- predicates verified against the live dev DB
   before shipping (F29 discipline). Register them alongside the ktx ones.

DRAFTING RULES:

- ASCII only; hyphen-minus; comments explain WHY (D18).
- Execution-mode annotations (D19): fan-outs are `workflow fan-out` tasks
  with item lists, per-agent prompt shape, and schema fields (citations
  required); the assembler is `inline` (D5); probe registrations with full
  locked content are `inline`.
- Audit verdicts that correct a row must carry the corrected value AND the
  corrected source_ref -- repair via re-extract semantics, not patch-in-place
  guesswork (feedback_repair_by_reextract_not_sql_update).
- Output: docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-audit.md
- Follow phase-template.md exactly.

STEP-BY-STEP:

1. Read items 1-8.
2. Recon: ls research/repos/qwcl-original/QW/progs/ (pin the file list and
   count); run the live per-kind counts (docker exec qw-oracle-postgres-dev
   psql -U qworacle -d qw_oracle ...) to baseline what the probes will
   assert; check whether Track-A backfills already landed (git log
   --oneline -- apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml).
3. Draft the phase MD per phase-template.md.
4. Dispatch the verification sub-agent (brief in phase-template.md).
5. Apply findings; decisions.md wins conflicts.
6. HALT. Reply with: MD path; verifier finding counts; open questions;
   recommendation.

Do NOT draft Phase 2. Do NOT execute anything. Drafting is paper-only.
