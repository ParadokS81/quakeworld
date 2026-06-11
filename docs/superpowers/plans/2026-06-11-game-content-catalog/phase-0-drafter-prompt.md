You are drafting Phase 0 of the game-content-catalog completion arc (2026-06-11).

ARC IDENTIFICATION -- read before anything else. This is the 2026-06-11
game-content-catalog arc: completing the qw-oracle gameplay_* L1 layer (id1
audit + monsters + KTX overlay + join keys). You are in the WRONG arc if you
see yourself working on: L3 concept notes / weapon-pair notes (that is the
demand-driven-l3 arc), VitePress or apps/docs-web (docs.quake.world arc),
match_event or log_template extraction (KTX onboarding arc, 2026-05-04), or
Postgres migration SQL (qw-oracle Arc 1, 2026-05-02). If the task in front of
you looks like one of those, HALT and tell the operator.

This is a structured planning task. Your output is ONE markdown file. You do
NOT execute anything (no loads, no git clones, no code edits). The phase MD
you write becomes input to a separate execution session later.

Working directory: /home/paradoks/projects/quakeworld

REQUIRED READING (in order; do not skip):

1. docs/superpowers/plans/2026-06-11-game-content-catalog/README.md
2. docs/superpowers/plans/2026-06-11-game-content-catalog/decisions.md
   -- especially D1, D2, D7, D8, D13, D18, D19 for this phase.
3. docs/superpowers/plans/2026-06-11-game-content-catalog/review-findings.md
   -- this phase owns F1 and F2.
4. docs/superpowers/plans/2026-06-11-game-content-catalog/phase-template.md
   -- the mandatory MD shape, including the Execution mode column.
5. docs/superpowers/specs/2026-06-11-game-content-catalog-completion.md
   -- sections: "The reframe", D1, D6, "Prerequisites (P1/P2)", M1, M3.
6. apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts (full, 206 lines)
   -- the SeedFile interface and ENTITY_KIND_BY_LIST you will extend.
7. apps/qw-oracle/scripts/load-knowledge/index.ts lines 555-600
   -- runLoadGameplay and its hardcoded 37/41 STOP gate (finding F2).
8. apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml lines 1-35
   -- the header + gameplay_source block your provenance note extends.

PHASE SCOPE (what the MD you draft must cover):

a. Acquire the original Quake v1.06 progs QC into research/repos/ (spec P1).
   Agent work at execution time; your MD pins: candidate mirror criteria
   (must be the ORIGINAL 1.06 QC source release, NOT the 2021 rerelease QC --
   rerelease values differ; must contain soldier.qc, demon.qc, shambler.qc,
   ogre.qc and peers), the provenance record shape (mirror URL +
   commit/checksum APPENDED to gameplay_sources.notes via the
   id1-gameplay.yaml gameplay_source block -- do not replace the existing
   notes prose), and the spot-verify step (known values: shambler 600hp,
   ogre 200hp, plus 2-3 more you pin from the wikis; pak progs.dat in
   data/pak-cache/ arbitrates disputes per D2).
b. Loader extension (spec M1): a `monsters` seed section -- SeedFile gains
   monsters?: EntityDefRow[], ENTITY_KIND_BY_LIST gains monsters->monster,
   the entity loop iterates the four lists. Ship the full diff inline.
c. Count STOP-gate rework (D8 / F2): expected_counts block in each seed YAML;
   runLoadGameplay validates per-file. Ship the full diff inline, including
   the id1-gameplay.yaml header edit declaring {entities: 37, mechanics: 41}.
d. The two reusable probe scripts (D13): citation gate (every source_ref /
   *_source_ref resolves under the D7 two-form rule: default =
   source_root-relative, leading slash = repo-root-relative; strip leading
   slash from source_root too) and seed double-load (load twice, identical
   counts + ordered-row content hash). Decide where they live (suggestion:
   scripts/load-knowledge/ alongside quality-grid.ts, wired as dispatcher
   subcommands mirroring the idempotency.ts CLI conventions) -- verify the
   dispatcher pattern against index.ts before locking.
e. A bun test exercising the monsters section + expected_counts gate against
   qw_oracle_test (NOT the dev DB) with a synthetic fixture seed -- this is
   what makes Phase 0's verification self-contained instead of waiting for
   Phase 2 (regime-collision rule). Check how existing tests connect
   (grep load-maps.test.ts / quality-grid.test.ts for the test-DB pattern).

DRAFTING RULES:

- ASCII only; hyphen-minus; comments explain WHY (D18).
- Execution-mode annotation is content-conditional (D19): tasks whose content
  you fully lock in the MD (the loader diffs, the YAML header edit) are
  `inline`; the probe scripts and the bun test are genuine small synthesis ->
  `subagent (Sonnet medium)` unless you lock their full content too.
- Verify every interface/field name against the live files; do not trust
  this prompt's claims (feedback_plan_snippet_vs_file_shape).
- Output: docs/superpowers/plans/2026-06-11-game-content-catalog/phase-0-prereqs-loader.md
- Follow phase-template.md exactly. Verification at boundary must include:
  tsc clean, bun test green, unchanged-id1 double-load green under the
  reworked gate, citation gate green on the CURRENT 400-ref baseline.

STEP-BY-STEP:

1. Read items 1-8. Note F1/F2 obligations.
2. Recon: grep index.ts for the dispatcher subcommand pattern; check
   package.json scripts; confirm qw_oracle_test conventions in existing
   tests; list research/repos/ to confirm no v1.06 tree exists yet.
3. Draft the phase MD per phase-template.md.
4. Dispatch the verification sub-agent (brief in phase-template.md, paths
   substituted for this phase).
5. Apply findings. If a finding contradicts decisions.md, decisions wins;
   note the rejection under Open questions.
6. HALT. Reply with: MD path; verifier finding counts
   (CRITICAL/SUBSTANTIVE/ADVISORY); open questions needing operator
   attention; recommendation ("ready for review" or "needs another pass").

Do NOT draft Phase 1. Do NOT execute anything. Drafting is paper-only.
