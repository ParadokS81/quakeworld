You are drafting Phase 4 of the game-content-catalog completion arc (2026-06-11).

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer. You
are in the WRONG arc if you find yourself working on: L3 concept notes
(demand-driven-l3), apps/docs-web pages (docs.quake.world), or the maps
extraction pipeline itself (2026-04-26 map-knowledge arc, SHIPPED -- this
phase only ADDS a props field to gameplay item rows that joins AGAINST the
maps table). HALT if the work drifts.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything. The phase MD becomes input to a separate execution
session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/README.md
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- especially D5, D7, D8, D13, D14, D20, D21 for this phase.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F4, F5, F6.
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-template.md
5. The three prior phase MDs (phase-1/2/3) -- their Outputs sections are
   your inputs; the conventions subsection you write documents what they
   actually did, not what was planned.
6. docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md
   -- sections D5 (join keys), D7 (SCHEMA.md), M3 (verify-gameplay fix), M5.
7. apps/qw-oracle/SCHEMA.md -- the maps table section (item_summary_json
   20-key vocabulary), the v14 section, and the KTX onboarding section
   (where your conventions subsection lands nearby; F6 count drift).
8. apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts (70 lines) -- the F4
   target: stale totals 37/41 + source-unscoped per-kind assertions.
9. apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts -- the gameplay
   snapshot path (grep for gameplay_sources / qw-gameplay) for M5 regen.
10. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md -- section
    structure; your qw section mirrors the per-engine sections (and the
    KTX-specific section's shape).

PHASE SCOPE (what the MD you draft must cover):

a. map_summary_key props (D21): the full 20-key mapping table LOCKED in the
   MD (keys from maps.item_summary_json: ga ra ya | mh h15 h25 bio | pent
   quad ring | cells shells spikes rockets | gl lg ng rl sng ssg -- verify
   the exact key list against the live maps table during recon). 1:1 for
   armors/health/powerups; weapon keys on pickup_* item rows; ammo keys
   shared by small+large variants. Assembler edit to id1-gameplay.yaml
   (D5; counts unchanged -- expected_counts untouched, state this).
b. SCHEMA.md "Gameplay conventions" subsection (D20): gate-token vocabulary,
   three-layer model, id1 props-variant convention, D7 two-form citation
   rule, map_summary_key aliasing, expected_counts gate, dual-writer
   disjointness rule, gameplay_sources registry model. Verify every count
   you write against the live DB (F6: the section currently says ~309
   mode_default vs live 317 -- correct it in passing).
c. VALIDATION-RUNBOOK.md gains a `qw` gameplay section mirroring the
   per-engine sections: seed-load reproducibility, citation gate, F1
   per-kind grid, seed double-load (D13 probes from Phase 0).
d. verify-gameplay.ts fix (F4, folds the standing HANDOVER:43 item): read
   the live tool implementations first (does searchMechanics scope by
   source?); make assertions gameplay_source-aware; derive totals from
   per-source sums or parametrize -- no fresh hardcoded numbers that rot.
e. Surfacing (M5 / D14): regenerate the slipgate snapshot via
   build-snapshot; confirm qw-gameplay.json carries monsters + overlay rows
   + map_summary_key props; MCP spot checks (search_gameplay_entities
   kind=monster; describe_mode on an overlay-bearing token; lookup_map join
   sanity: one map's item_summary_json key resolves to catalog rows).
f. Arc closeout checklist: full F1 sweep green; both seeds double-load
   green; HANDOVER edits (drop the folded verify-gameplay item from Small
   followups; the arc dashboard entry update is the orchestrator's job, but
   name it).

DRAFTING RULES:

- ASCII only; hyphen-minus (D18).
- Execution modes (D19): mapping table + doc text + verify-gameplay diff are
  locked content -> inline; only genuinely synthetic code (if any) goes to
  subagent (Sonnet medium).
- Mixed archetype: doc deliverables have an operator-run floor (operator
  reads the conventions subsection top-to-bottom); data + probes keep the
  automated floor. Both appear in Verification.
- Output: docs/superpowers/plans/2026-06-11-game-content-catalog/phase-4-joinkeys-docs.md
- Follow phase-template.md exactly.

STEP-BY-STEP:

1. Read items 1-10.
2. Recon: pull one live maps row's item_summary_json to verify the key
   vocabulary; grep build-snapshot.ts for the gameplay emit path and the
   snapshot output location; run verify-gameplay.ts mentally against live
   counts (or query them) to enumerate every failing assertion.
3. Draft the phase MD per phase-template.md.
4. Dispatch the verification sub-agent (brief in phase-template.md).
5. Apply findings; decisions.md wins conflicts.
6. HALT. Reply with: MD path; verifier finding counts; open questions;
   recommendation.

This is the last phase. Do NOT execute anything. Drafting is paper-only.
