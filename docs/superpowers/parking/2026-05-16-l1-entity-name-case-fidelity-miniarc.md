# Mini-arc: L1 entity-name case fidelity (source-case in, structural fold on compare)

**Created:** 2026-05-16. **Shape:** small focused L1 loader+schema arc. **Status:**
ready to execute, fresh terminal, COLD. **Provenance:** spun out of the
enforce-L1-runtime-truth (libclang-callgraph-reachability) arc, Pass 2 SQ2.1.
This **supersedes** that arc's Pass-4 "L1 source-case representation"
carry-forward (one track, not two). The Pass-2 bash-harness case-fold is a
SEPARATE fix that does NOT belong here (shell `comm`, never touches the DB).

## Why this exists

A year of recurring "search misses things" pain across projects, same root
cause every time: the case fold is applied by **convention** ("remember to
lowercase before comparing"), not enforced **structurally**. One forgetful
consumer reintroduces the bug. The durable fix is to make a case-sensitive
compare *impossible at the data layer*, and to stop destroying the source-case
form (L1's job is to tell the truth about what the code registered).

This also removes a class of false ghosts/hidden-commands from the reachability
arc's pools, but the reachability arc does NOT depend on this shipping first --
its Pass-2 harness gets its own shell-level fold independently.

## Verified state (this session, 2026-05-16 -- primary-source)

VERIFIED -- do not re-derive, but DO re-confirm the two RE-VERIFY items below
before writing the migration ("verify, don't infer; don't trust your own
probe").

- **Extractors already keep fidelity. No re-extraction, no re-walk.**
  `apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-commands-ast.json`
  contains `"unignoreAll"` / `"loadFragfile"` (source camelCase). The folded
  form appears in NO extracted JSON. Source itself is camelCase
  (`research/repos/ezquake-source/src/ignore.c:526`
  `Cmd_AddCommand("unignoreAll", ...)`; `src/fragstats.c:861`
  `Cmd_AddCommand("loadFragfile", ...)`).
- **The entire fold is ONE loader function:**
  `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts`
  - `:64-67` `canonicalIdFor()` -> lowercases (except `token_primitive`).
  - `:113-114` `upsertEntity()` `canonicalName = input.name.toLowerCase()`
    (except `token_primitive`).
  - `:121` existence check: `WHERE project=.. AND type=.. AND name=${canonicalName}`.
  - `:145-146` `INSERT INTO entities (.. name ..) VALUES (.. ${canonicalName} ..)`
    -- the FOLDED value is written into `entities.name` itself, not just
    `canonical_id`. This is where source case is destroyed.
  - `:688-700` alias target resolution: `lookupName = row.target_name.toLowerCase()`
    then `SELECT canonical_id FROM entities WHERE .. name=${lookupName}`.
- **Deliberate existing carve-out (SACRED):** `:65` keeps `token_primitive`
  case-sensitive on purpose -- `$B` (blue LED) vs `$b` (glyph) are different
  entities. Any fold mechanism MUST preserve this. This is why blanket
  `CITEXT` on `entities.name` is WRONG here (all-or-nothing per column).
- **At-rest:** 100% lowercase across every project x type
  (ezquake/fte/ktx/mvdsv/qwcl; cvar/command/macro/cmdline_param;
  `count(*) FILTER (WHERE name <> lower(name)) = 0` everywhere). Consistent
  with the single loader chokepoint. KTX rows already in the DB get fixed on
  reload automatically.
- **`canonical_id` is the stable opaque join key.** `*_versions` rows
  (ruleset/asset-cvar-binding/loader-site, `natural-keys.ts:592-642`) and
  snapshots/MCP key off `canonical_id`, format `project:type:lowercased`.
  Keep it lowercased and UNCHANGED -- that is why blast radius is small.

RE-VERIFY before migrating (cheap, load-bearing):
1. Exact current uniqueness on `entities` -- read the `entities` DDL in
   `apps/qw-oracle/db/migrations/` (and `SCHEMA.md`). Today uniqueness is
   effectively on the lowercased `name`. The new generated fold-key column
   must carry that uniqueness or reload creates duplicates.
2. Every caller path into `upsertEntity` -- confirm all `load-*.ts` adapters
   route through it (grep `upsertEntity` / `canonicalIdFor` across
   `scripts/load-knowledge/`), so no adapter independently re-folds `name`.

## Locked design decisions

- **D1 -- `entities.name` stores source case.** Stop folding it in
  `upsertEntity`; write `input.name` verbatim.
- **D2 -- add a generated STORED fold-key column with the carve-out baked
  in.** Expression form:
  `CASE WHEN type='token_primitive' THEN name ELSE lower(name) END`.
  Unique index on `(project, type, <foldkey>)`. This enforces the fold
  structurally AND preserves the token_primitive case-sensitivity in the
  same column -- the reason a generated column beats blanket `CITEXT` here.
- **D3 -- `canonical_id` unchanged** (`project:type:lowercased`, opaque,
  token_primitive still case-sensitive per existing `:65` logic). No
  versioned-table / snapshot / MCP ripple.
- **D4 -- loader-only + reload. No extractor change, no re-walk.** Reload all
  projects/tags from existing extractor JSON.
- **D5 (THE TRAP) -- the existence check and the alias lookup MUST switch
  off `name` and onto the fold-key column.** `natural-keys.ts:121` and
  `:698` currently match `WHERE name=${lowercased}`. Once `name` is
  source-case, matching on `name` with a lowercased literal finds nothing
  and **every reload inserts duplicates**. Both must query the new fold-key
  column instead. This is the single highest-risk correctness item.
- **D6 -- consumer sweep.** Enumerate readers of `entities.name` (MCP tools,
  `build-snapshot.ts`, F1/F2 probes, the help-JSON audit pipeline,
  `derive-entity-description.ts`, `review/` tools). MCP/search WILL now
  return `unignoreAll` instead of `unignoreall` -- that is the GOAL, not a
  regression. Only flag a consumer that hard-codes a lowercase-display
  assumption or a lowercased literal compare against `name`.

## Reads required (cold)

- This doc.
- `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` (the chokepoint;
  read `canonicalIdFor`, `upsertEntity`, the alias-resolution block).
- `apps/qw-oracle/scripts/load-knowledge/CLAUDE.md` (adapter pattern,
  append-only migration rule, regression drop-guard).
- `apps/qw-oracle/db/migrations/` (latest N; find the `entities` DDL +
  current unique constraint) and `apps/qw-oracle/SCHEMA.md`.
- `apps/qw-oracle/CLAUDE.md` "Always-on rules" (Bun runtime, idempotency,
  append-only migrations, JSONB rule, regression guards).
- Memory: `feedback_no_case_sensitivity`,
  `reference_qw_oracle_extraction_liveness_gap`,
  `project_extraction_pipeline_vision`,
  `feedback_repair_by_reextract_not_sql_update` (here the correct repair IS
  re-running the loader, not SQL UPDATE -- matches that memory),
  `feedback_idempotency_before_staleness`.
- Source of the design conversation:
  `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  (Pass-4 line is superseded by this mini-arc).

## Critical rules

- **Solo-dev git (operator does not touch git):** Claude runs git silently,
  commits to `main` directly, one-line messages, push at session wrap. No
  PR ceremony, no branch unless genuinely risky.
- **Schema = append-only migration** in `apps/qw-oracle/db/migrations/`
  (`bun apps/qw-oracle/db/migrate.ts`), update `SCHEMA.md` alongside.
  Changing a primary identifier column's semantics is architecturally
  significant -- this parking doc IS the design seed; a dated spec under
  `docs/superpowers/specs/` is optional given the doc, operator's call.
- **Bun runtime / `bun install`** in `apps/qw-oracle/` (never npm).
- **Regression drop-guard is load-bearing** -- `load-version.ts` aborts on
  >50% entity-count drop without `--force`. A correct reload changes `name`
  *casing*, not entity *count*: total entities per project must be
  UNCHANGED. A count change means D5 (duplicate insert) was botched -- stop
  and fix, do not `--force`.
- **Idempotency gate** -- reload twice; second run must produce 0 new rows
  and 0 duplicate `(project,type,foldkey)`. (`feedback_idempotency_before_staleness`.)
- **Verify, don't infer; don't trust your own probe** -- every numeric/path
  claim re-verified against live DB/source before asserting.

## Known-answer gate (REQUIRED before declaring done)

All must hold post-reload, primary-sourced:

1. **Fidelity restored:** `SELECT name FROM entities WHERE project='ezquake'
   AND type='command' AND <foldkey>='unignoreall'` returns `unignoreAll`
   (likewise `loadFragfile`, and `unignoreAll_team` if present in source).
2. **Structural fold works:** a case-insensitive lookup for `UNIGNOREALL` /
   `unignoreall` / `unignoreAll` all resolve to the same single row via the
   fold-key path.
3. **token_primitive carve-out intact:** a `$B` vs `$b` style token-primitive
   pair (or any two token_primitives differing only by case) remains TWO
   distinct rows -- the fold did NOT collapse them.
4. **Counts unchanged:** entity count per (project,type) identical to the
   pre-change at-rest numbers (ezquake command 564, cvar 2997, macro 68,
   cmdline_param 77; fte/ktx/mvdsv/qwcl per the verified probe). Any drift =
   D5 botched.
5. **Idempotent:** a second reload yields 0 inserts, 0 duplicates.
6. **No new regression-floor failures** beyond the (expected) casing change;
   spot-check one MCP entity lookup returns source case.

## First actions

1. Read the cold list above. Re-verify the two RE-VERIFY items (entities
   unique constraint DDL; all `upsertEntity` caller paths).
2. Write the append-only migration: add the generated STORED fold-key column
   with the token_primitive `CASE` expression; add unique index
   `(project,type,foldkey)`; (decide whether the old name-based unique
   constraint is dropped/replaced -- it must not double-constrain).
3. Edit `natural-keys.ts`: D1 (write `input.name` verbatim to `name`),
   D5 (existence check `:121` and alias lookup `:698` switch to the
   fold-key column), keep `canonical_id` exactly as is (D3).
4. Reload all projects/tags through the corrected loader. Watch the
   drop-guard (count must not move). Then run the full known-answer gate.
5. D6 consumer sweep; fix only genuine lowercase-display/literal-compare
   dependencies. typecheck clean. Commit, update `SCHEMA.md`, push.

## Scope boundary (NOT in this mini-arc)

- The reachability arc's Pass-2 **bash-harness** case-fold (`/tmp/front1-diff.sh`
  command direction) -- separate shell-level fix, tracked in that arc.
- Anything else in the reachability arc (Track A call-graph, Track B HUD,
  ghost classification).
- `Cmd_AddLegacyCommand` `legacy_alias_of` persistence and trailing-comment
  harvester precision -- still siblings in
  `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`.
- Player/map/chat-corpus name columns -- engine-identifier columns only.

## When in doubt

`name` tells the source truth (the case the code actually registered).
Matching is folded by the data layer, never by a consumer that has to
remember. The `token_primitive` case-sensitivity carve-out is sacred --
if a design choice would collapse `$B`/`$b`, it is wrong. Reload, never
SQL-UPDATE, is the repair. Counts must not move; if they do, D5 is the
bug. Conservative: a correct change is invisible except that `name` now
shows source case.
