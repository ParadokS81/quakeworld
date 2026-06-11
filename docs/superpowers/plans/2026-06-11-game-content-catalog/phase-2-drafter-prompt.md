You are drafting Phase 2 of the game-content-catalog completion arc (2026-06-11).

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer. You
are in the WRONG arc if you find yourself working on: L3 concept notes
(demand-driven-l3 arc), apps/docs-web (docs.quake.world arc), or KTX
match_event extraction (KTX onboarding, 2026-05-04). HALT if so.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything. The phase MD becomes input to a separate execution
session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/README.md
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- especially D2, D5, D6, D7, D10, D11, D12, D13, D15 for this phase.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-template.md
5. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-0-prereqs-loader.md
   + phase-1-audit.md -- your inputs: the v1.06 QC tree location, the
   monsters loader section, the probe scripts, the audited baseline.
6. docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md
   -- sections D1 (monsters decision + rationale) and M3 (wiki snapshot).
7. apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml lines 31-100
   -- the row style your monsters cluster mirrors (per-prop *_source_ref).
8. The live ktx bloodfest monster rows (docker exec qw-oracle-postgres-dev
   psql -U qworacle -d qw_oracle -c "SELECT name, ruleset_gate_json,
   props_json FROM gameplay_entity_defs WHERE kind='monster'") -- the
   fact-family you must NOT touch and whose names inform yours.

PHASE SCOPE (what the MD you draft must cover):

a. Roster pin: enumerate the monster QC files in the acquired v1.06 tree
   (Phase 0 output names the path) -- ~15 incl. boss/oldone/fish; the exact
   count is pinned HERE from source, not assumed (spec D1).
b. Wiki snapshot prep (D15): one task fetches each monster's page from
   quake.fandom.com and quakewiki.org via https://r.jina.ai/<url> into a
   local cache dir (suggestion: apps/qw-oracle/data/wiki-cache/monsters/;
   confirm gitignore status during recon), fetch-date + URL recorded per
   file. Stub pages degrade gracefully.
c. Per-monster Workflow extraction (D10/D11): ~15 agents, Sonnet high, low
   concurrency; structured output: health, melee/ranged attacks with damage
   dice, projectile speeds, behavior props -- every value with a source_ref
   in the leading-slash repo-root form (D7), since these cite the NEW tree,
   not the id1 source_root.
d. Verification: independent re-derivation by a second agent per monster
   (cold read), plus grep of the LOCAL wiki cache (zero per-agent web
   fetches, D15). Agreement auto-passes; discrepancies + wiki mismatches
   escalate to the SME gate (D12). Wiki results go in the arc findings doc,
   never in rows (D2/D15); pak progs.dat arbitrates disputes.
e. Assembly (D5): ONE inline assembler writes the monsters: cluster into
   id1-gameplay.yaml (new cluster header comment with final row count,
   uniform prop vocabulary defined once in the header per D6), bumps
   expected_counts (D8), reloads.
f. Validation (D13): citation gate (new refs resolve under the two-form
   rule), seed double-load, NEW F1 probe for (id1, monster) count, MCP spot
   query (search_gameplay_entities kind=monster gameplay_source=id1).

DRAFTING RULES:

- ASCII only; hyphen-minus (D18).
- The existing 13 ktx bloodfest rows are UNTOUCHED (D6) -- different
  fact-family (spawn economy), different gate. Your MD states this fence.
- Monster stats live in props_json -- the table has no health column; do
  NOT propose new columns (D14: no migration).
- Execution modes (D19): wiki prep = inline (Bash loop, locked URL list);
  extraction + verification = workflow fan-out; assembler = inline.
- Output: docs/superpowers/plans/2026-06-11-game-content-catalog/phase-2-monsters.md
- Follow phase-template.md exactly.

STEP-BY-STEP:

1. Read items 1-8.
2. Recon: ls the v1.06 QC tree (path from Phase 0's Outputs section); pin
   the roster + per-monster QC filenames; check data/ gitignore handling;
   verify the two wiki URL patterns resolve for one sample monster.
3. Draft the phase MD per phase-template.md.
4. Dispatch the verification sub-agent (brief in phase-template.md).
5. Apply findings; decisions.md wins conflicts.
6. HALT. Reply with: MD path; verifier finding counts; open questions;
   recommendation.

Do NOT draft Phase 3. Do NOT execute anything. Drafting is paper-only.
