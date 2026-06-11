You are drafting Phase 3 of the game-content-catalog completion arc (2026-06-11).

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer. This
phase touches research/repos/ktx/src -- which is ALSO the territory of the
KTX onboarding arc (2026-05-04, SHIPPED) and the ktx-l1-rewrite skill work.
You are in the WRONG arc if you find yourself: recasting L1 entity
descriptions (ktx-l1-rewrite), extracting match_events / log_templates /
mode_defaults (KTX onboarding -- already shipped), or authoring concept
notes (demand-driven-l3). This phase ONLY catalogs hardcoded gameplay VALUE
deltas vs the id1 baseline. HALT if the work drifts.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything. The phase MD becomes input to a separate execution
session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/README.md
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- especially D3, D4, D5, D9, D10, D11, D12, D13, D18 for this phase.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F3 (dual-writer keyspace).
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-template.md
5. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-1-audit.md
   + phase-2-monsters.md -- your baseline: audited id1 rows + monster rows.
6. docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md
   -- sections D2 (the bounded inventory -- your sweep's floor) and D3
   (gate vocabulary).
7. apps/qw-oracle/SCHEMA.md, the "KTX onboarding arc" section -- the D8
   single-key gate convention and the extracted per-kind row counts your
   disjointness probe guards against.
8. apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts +
   load-gameplay-taxonomies.ts (headers + the ON CONFLICT sites) -- the
   extractor-path writers whose keyspace your seed rows must avoid (F3).
9. apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml lines 1-35
   -- the header style ktx-gameplay.yaml mirrors.

PHASE SCOPE (what the MD you draft must cover):

a. Per-file Workflow sweep (D10) over the four file families:
   research/repos/ktx/src/weapons.c, items.c, combat.c, and sp_*.c (ls and
   pin the real sp_* list during recon). Each agent hunts cvar/mode-gated
   VALUE divergences from the id1 baseline rows -- exhaustive within the
   files, deltas-not-knobs (D4 three-layer filter stated verbatim in the
   agent prompt). The spec D2 inventory (yawnmode axe/SSG/SNG/GA/grenade/
   backpack, midair rocket speed, instagib bullets, bloodfest ammo/shambler
   rule, dmm4 quad, CTF rune modifiers, k_dis, k_hitboxcheck_bullets,
   k_classic_shotgun) is the FLOOR -- agents must rediscover it plus
   anything it missed; log what was dropped, no silent caps.
b. sp_*.c monster diff vs the Phase 2 id1 monster rows (D6): deviations
   become ktx overlay rows; if KTX is faithful, zero rows result and the MD
   says so explicitly as a valid outcome.
c. Gate assignment (D3): every row's gate uses a game_mode catalog token
   ({"mode":"<token>"}) or {"dm":N}; single-key only; compound conditions
   put the secondary condition in props. Verify each token against the live
   catalog during drafting.
d. Operator SME gate (D12): the consolidated delta list ("does this match
   community reality?") -- explicit HALT step with list format.
e. Assembly (D5): ONE inline assembler writes NEW
   apps/qw-oracle/scripts/extractors/qw/seeds/ktx-gameplay.yaml: header
   mirrors id1-gameplay.yaml (gameplay_source: ktx block -- this block
   becomes the canonical owner of the ktx registry row's display_name/
   description/notes, so carry overlay provenance there and preserve the
   intent of the existing row; expected_counts per D8; the D9 disjointness
   rule documented in the header comment).
f. Validation (D13 + D9): citation gate (ktx refs resolve under
   source_root /research/repos/ktx/src via the two-form rule), seed
   double-load of BOTH YAMLs, the keyspace disjointness probe (no seed row
   key collides with extractor-written keys -- pin the probe's mechanism:
   compare seed keys against the live extracted keyspace), re-baselined ktx
   F1 probes for any kind whose count changes (the existing
   makeGameplayKindProbe('ktx','gameplay_entity_defs','monster',13) breaks
   if monster deviations land -- own this), spot describe_mode check that a
   mode token joins catalog + mode_defaults + new overlay rows.

DRAFTING RULES:

- ASCII only; hyphen-minus (D18). YAML style mirrors id1-gameplay.yaml.
- id1-native dm1-4 variants stay as props on id1 rows -- never ktx rows (D4).
- Execution modes (D19): sweeps = workflow fan-out; assembler = inline;
  probe code with locked content = inline.
- Output: docs/superpowers/plans/2026-06-11-game-content-catalog/phase-3-ktx-overlay.md
- Follow phase-template.md exactly.

STEP-BY-STEP:

1. Read items 1-9.
2. Recon: ls research/repos/ktx/src/sp_*.c (pin count); query the live
   game_mode token list and the extracted ktx keyspace (per-kind names +
   gates); confirm the ktx gameplay_sources row content you must preserve.
3. Draft the phase MD per phase-template.md.
4. Dispatch the verification sub-agent (brief in phase-template.md).
5. Apply findings; decisions.md wins conflicts.
6. HALT. Reply with: MD path; verifier finding counts; open questions;
   recommendation.

Do NOT draft Phase 4. Do NOT execute anything. Drafting is paper-only.
