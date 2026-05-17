# Phase 3 -- Unified L1 fidelity schema + loader

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` IN FULL (D1-D22 + the D7/D11 amendments + X1-X10 +
>    non-goals). The brainstorm is closed -- do NOT re-open a D; if a D looks
>    wrong, surface a deviation block and STOP. -- DONE; no D looks wrong.
>    Phase 3 is governed by D1, D12, D13, D14, D15, D16 + X1-X10; D7.1/F5
>    consumed (Track-A evidence is passenger-derived, not handler-recorded).
> 2. Read `review-findings.md`; identify the F/R/W rows whose owning phase
>    role is this phase. Phase 3 = role "S": F5 (aware), F6 (X3 stems),
>    R2 (D15/D12 field shape -- OWN), R3-store (D16 element link -- OWN),
>    W2, W4. -- DONE.
> 3. Recon the LIVE source before inlining anything. -- DONE; see "Recon
>    facts (verified)".
> 4. After drafting, dispatch the verification sub-agent. -- DONE; findings
>    applied, see "Open questions".

> **No deviation -- all Phase-3 premises re-verified TRUE 2026-05-17.**
> D12 (two physically separate fields, no `kind`), D13 (three-level
> coverage, slot-3 representation-only), D14 (shared three-slot spine),
> D15 (Track-A feeder-tagged per-variant evidence), D16 (Track-B
> element-linked) all hold against live schema + the APPROVED Phase-1/2
> MDs. One emit->store BOUNDARY question is surfaced as OQ-1 (the Track-A
> `reachable()` contract is in-process and writes no file -- Phase 1
> Outputs hand it to Phase 3 as input; Phase 3 owns the representation
> seam per D7.3/D14). It is a Phase-3-scoped representation choice with a
> recommended default, NOT a refuted premise; surfaced for operator
> awareness because the default adds an additive write to the
> Phase-1-modified `extract.py` (additive only; X3 protects the 8
> byte-identical files; D6 zero-contact preserved).

## Goal

This phase delivers the unified L1 fidelity provenance: TWO physically
separate, independently-nullable JSONB columns -- `track_a_reachability`
(on `cvar_versions` AND `command_versions`, the 92-cvar + 74-command
banked pool spans both types -- D20) and `track_b_hud_recovery` (on
`command_versions` ONLY, commands-only -- D11 amended / D21) -- landed by
an append-only migration (ordinal EXECUTOR-DERIVED at execution, never
frozen -- review-findings F8) with the matching `SCHEMA.md` edit in the
SAME task. The two columns are STRUCTURALLY separate (D12: no single
`runtime_fidelity` column, no shared `kind` discriminator -- a reader
querying `track_b_hud_recovery` can never see a Track-A verdict because it
is a different physical column). Both conform to ONE shared three-slot
spine (D14: `conclusion` / `evidence` / `dump_confirmation`). Track A's
`evidence` slot is FEEDER-TAGGED (D15: `feeder:"callgraph"` -> per-variant
breakdown over the 4 ezQuake configs with the D5 three-valued state + the
`address_taken_residue` flag; `feeder:"commented-register"` -> a textual
register-site cite). Track B's `evidence` slot is ELEMENT-LINKED (D16: the
literal `HUD_Register` arg0 element key, so the LLM is TOLD `radar` /
`+hud_radar` / `-hud_radar` group to the one `radar` element -- not
inferred by string-prefix parsing). Slot 3 (`dump_confirmation`) is the
D13 three-level state, REPRESENTATION ONLY here -- the loader writes
`high-confidence-generalized` (level-2) for every populated row; the
runtime-dump cross-check that stamps `dump-confirmed` (level-3) is Phase 4
(D14/D19). The loader stores BOTH fields by round-tripping the real
APPROVED Phase-1 `reachable()` contract (via a Phase-3-owned additive
serialization seam -- OQ-1) and the real APPROVED Phase-2
`ezquake-hud-commands-ast.json`; the F1 quality-grid extends to the two
new JSONB shapes. **Runnable, verifiable state at the phase boundary:**
the migration (executor-derived ordinal -- F8) applied (idempotent
re-run is a no-op) + `SCHEMA.md` updated; the ezQuake extractor + loader run end-to-end and the real
Phase-1 verdicts + Phase-2 recovered HUD commands round-trip into the two
columns with the correct D14 three-slot shape (Track A feeder-tagged
per-variant; Track B element-linked); `dump_confirmation` is uniformly
level-2 (NO dump cross-check done here -- X2/D14 slot-3 boundary held);
every existing entity JSON is byte-identical to the prior-HEAD output
(the 8 F6 stems; the 9th + 10th files are additive) and existing
non-pool/non-HUD entity rows are unchanged save the two new NULL columns;
`npm run load-knowledge -- quality-grid --project ezquake` is GREEN
including the new shape probes. Verification reads ONLY this phase's own
loader output + F1 -- never the runtime dump (Phase 4 answer key), never
the combined harness (Phase 4/5). That is X2 by construction (W4 guarded).

### Recon facts (verified against live source 2026-05-17; do not re-derive blind)

- **Migration ordinal = EXECUTOR-DERIVED at execution, NEVER frozen here
  (review-findings F8 -- cross-arc drift).** At P3 freeze (2026-05-17
  14:04) the latest was `013_entity_name_source_case_fold.sql` and this
  recon said "Phase 3 is `014`". That is now STALE: the PARALLEL,
  out-of-scope **ktx-mvdsv describe-fill arc** consumed ordinal `014`
  (`014_description_provenance_trail.sql`, commit `95e8d726`, 2026-05-17
  17:54 -- 3h50m AFTER P3 froze) and is STILL ACTIVE (it may consume more
  before enforce-L1 executes). HARD RULE (X8 generalized to cross-arc
  drift -- F8): the executor DERIVES the ordinal at execution time as
  `(highest integer prefix in db/migrations/) + 1` (e.g.
  `ls db/migrations/ | sed 's/_.*//' | sort -n | tail -1` then +1 --
  currently `015`, but RE-DERIVE, do NOT trust this number; the
  ktx-mvdsv arc is live). The migration file is
  `<NNN>_l1_runtime_fidelity_provenance.sql` where `<NNN>` is that
  derived zero-padded ordinal. Do NOT hard-code `014` or `015` anywhere.
  Migrations are append-only `.sql` files applied by `bun db/migrate.ts`
  in lexical order, tracked in
  `schema_migrations(filename, applied_at, sha256)`; editing an applied
  migration is rejected (loader `CLAUDE.md` + `SCHEMA.md` Conventions) --
  which is exactly why a duplicate ordinal is silent-corruption-class and
  must be derived live.
  The SQLite-era `schema.ts` / `SCHEMA_VERSION` / `applySchema` /
  "Fresh DB vs migrated DB" prose in `SCHEMA.md` lines ~384-423 is
  STALE pre-Arc-1 text (the doc's own currency note + loader `CLAUDE.md`
  say trust the live DB + the `.sql` files; runtime constants are in
  `constants.ts`, runtime meta in `oracle_meta`). Phase 3 ships a pure
  `.sql` file, no `schema.ts` edit.
- **Additive-column migration precedent (verified, two shapes).**
  `012_description_origin.sql`: `ALTER TABLE entities ADD COLUMN
  description_origin TEXT NULL;` -- nullable, NO CHECK ("kept loose so
  future origin values can be introduced without a migration"), plus a
  one-time SQL backfill of pre-existing rows. `013`: `ALTER TABLE entities
  ADD COLUMN name_fold ... ` -- "Pure schema; no data backfill.
  [values] arrive when the loader is re-run". v11 `source_root` / v17
  `all_call_sites_json`: bare `ALTER TABLE <t> ADD COLUMN <c> <type>;`,
  NULL for pre-migration rows, no rebuild. **Phase 3 uses the `013` shape
  (pure schema, NO backfill)** -- the new columns are NULL on every
  existing row and are POPULATED only by re-running the loader against
  the Phase-1/2 output (X9: recovery/population is re-extract+re-load,
  never an in-place SQL UPDATE; a migration-time backfill would be the
  wrong shape here since the values come from the mechanisms, not from
  existing DB state).
- **`entities` / `*_versions` shape (verified `SCHEMA.md` + live).**
  `entities`(id, project, type, name, name_fold GENERATED, canonical_id
  UNIQUE, first_seen_version, last_seen_version, source_state CHECK
  [`source_backed` / `source_retired` / `doc_only` /
  `dynamically_registered`], predecessor_id, created_at, updated_at);
  natural key `(project, type, name_fold)` (migration 013). Per-version
  tables PK `(entity_id, version)`. `cvar_versions` /
  `command_versions` carry NO `source_file` column on `entities` --
  cites live in the `*_versions` rows. There is NO existing
  runtime/reachability/fidelity column anywhere (grep `reachable` /
  `runtime_fidelity` / `provenance` over `SCHEMA.md` -> only the
  unrelated `description_origin` + the `source_overrides` blame index).
  This phase introduces the first such columns.
- **JSONB binding discipline (verified live).** `natural-keys.ts`
  upserts: scalar columns bind `${row.col}`; JSONB array/object columns
  bind `${tx.json(row.col as never)}` (e.g. `match_event_versions`
  `attributes_json` / `emission_call_sites_json` at lines ~398/400 with
  the explicit "never JSON.stringify + TEXT bind" comment; `info_key`
  `call_sites_json`; `log_template` `all_call_sites_json`). NEVER
  `JSON.stringify(...)` then bind. The F1 regression gate is
  `probeJsonbNotStrings` (in `quality-grid.ts` -- RE-DERIVE the line range
  at execution by symbol search, do NOT trust a frozen cite: the sibling
  ktx-mvdsv arc added ~166 lines to this file post-P3-freeze, F8 / X2;
  pre-freeze it was ~`:217-272`): a `targets`
  array of `{table, column}` asserting
  `jsonb_typeof(col) != 'string'`; cross-project, ezQuake-anchored.
  Phase 3 adds the 3 new columns to that array (decisions.md R2
  drafting rule).
- **The loader adapter pattern (verified live).** `load-version.ts`
  imports per-type quartets `{TYPE}_PAYLOAD_FIELD`,
  `build{Type}VersionRow`, `{type}IsSourceBacked`, `upsert{Type}Row`
  (+ optional `build{Type}Overrides`) from `load-<type>.ts`.
  `load-commands.ts` (46 lines): `buildCommandVersionRow(entityId,
  version, entry, now) -> CommandVersionRow`; `upsertCommandRow ->
  upsertCommandVersion(tx,row)`. `upsertCommandVersion`
  (`natural-keys.ts:227-253`) / `upsertCvarVersion` (`:187-225`):
  `INSERT INTO <t>_versions (...) VALUES (...) ON CONFLICT
  (entity_id, version) DO UPDATE SET <every non-key col> =
  EXCLUDED.<col>`. `upsertEntity` (`:106-159`) keys existence on
  `name_fold`, returns `{id,isNew,prevSourceState}`. Adding a column =
  extend the `CvarVersionRow`/`CommandVersionRow` interface
  (`types.ts:439-453` / `:833-860`), the `build*VersionRow` adapter,
  and the INSERT col-list + VALUES (`tx.json(...)`) + ON CONFLICT SET in
  `natural-keys.ts`.
- **Per-project extractor JSON map (verified live).** `extract-tag.ts`
  `ENTITY_JSON_FILES: Record<Project, Partial<Record<EntityType,
  string>>>` (lines 120-163): `ezquake.command =
  'ezquake-commands-ast.json'`, `ezquake.cvar =
  'ezquake-variables-ast.json'`. A new payload file registers here.
  The 8 byte-identical F6 stems (verified, `review-findings` F6 /
  Phase-1 orchestrator correction): `ezquake-commands-ast.json`,
  `ezquake-variables-ast.json`, `ezquake-macros-ast.json`,
  `ezquake-cmdline-params-ast.json`, `ezquake-hud-elements-ast.json`,
  `ezquake-keynames-ast.json`, `ezquake-asset-cvar-bindings-ast.json`,
  `ezquake-asset-loader-sites-ast.json`. The Phase-2 9th file
  `ezquake-hud-commands-ast.json` is additive; Phase 3's Track-A signal
  file is a 10th additive file (NOT in the byte-identical set).
- **Phase 1 (Track A) OUTPUT contract (from the APPROVED Phase-1 MD).**
  `extractor_lib/_callgraph.py` exposes IN-PROCESS
  `reachable(entity) -> { "conclusion": "genuine-dead" |
  "build-excluded", "feeder": "callgraph" | "commented-register",
  "evidence": <feeder-tagged> }` where the `callgraph` evidence is
  `{client:<state>, server:<state>, win:<state>, apple:<state>}` +
  an address-taken-residue flag (`<state>` in `reachable` |
  `unreachable` | `not-compiled` -- D5), and the
  `commented-register` evidence is the textual register-site cite
  (`file:line`). Phase 1 "writes NO entity JSON file" and "ships NO
  schema and writes NO L1 column"; its Outputs say "Phase 3
  (schema/loader) consumes the `reachable()` contract shape ... as its
  input". The 4 variant identifiers AS THE OBSERVER GETS THEM are
  exactly `client` / `server` / `win` / `apple` (Phase-1 Recon: the
  true 4-way; the existing handlers' collapsed "client" label is
  untouched -- X3). F5: Track-A per-variant evidence is
  PASSENGER-derived (the passenger binds `Cvar_Register`/`Cmd_AddCommand`
  CALL_EXPRs to their enclosing FUNCTION_DECL), not
  handler-recorded -- Phase 3 stores it as opaque verdict evidence; it
  does not re-derive the registrar.
- **Phase 2 (Track B) OUTPUT contract (from the APPROVED Phase-2 MD).**
  `ezquake/_handler_hud.py` emits the additive 9th file
  `ezquake-hud-commands-ast.json`:
  `{ "hud_commands": { "<name>": { "hud_family": "bare"|"plus"|"minus",
  "hud_element": "<HUD_Register arg0 literal>", "ast": { "handler_fn":
  "HUD_Func_f"|"HUD_Plus_f"|"HUD_Minus_f", "source_file", "source_line",
  "source_column", "enclosing_function", "build_variant", 
  "registration_api": "Cmd_AddCommand"|"Cmd_AddRemCommand" } } },
  "r1": {"nonliteral_first_arg_sites":[...], "nonliteral_count":N},
  "_stats": {...} }`. Keys verified against the Phase-2 MD finalize
  step. D21: each becomes a first-class `command` entity. Phase-2 OQ-2
  explicitly hands the exact consumed field names to Phase 3 (this MD
  resolves them, below).
- **Pool numbers are banked context, NOT re-derived (F2/X7/X8).**
  74 commands + 92 cvars banked HEAD pool; ~129 Track-B reverse-diff.
  Phase 3 does NOT re-run detection and does NOT re-derive the pool
  (X7): the loader populates `track_a_reachability` for exactly the
  entities the Phase-1 `reachable()` signal enumerates (Phase 1's
  mechanism defines the populated set; D20 "every member gets its
  Track-A provenance populated"), and `track_b_hud_recovery` for
  exactly the entities in `ezquake-hud-commands-ast.json`. Honest X8
  posture (mirrors Phase 1/2): the runtime-diff that produced 74/92/129
  needs the pinned dump (`prerequisites.md` item 4 = Phase-4 answer
  key, NOT a Phase-3 precondition) and is unverifiable here by design;
  Phase 3's correctness rests on the round-trip shape + F1 + the
  Phase-1/2 self-validated probes, all on this phase's own output (X2).
- **Pin + environment (prerequisites 1-3).** `research/repos/
  ezquake-source` HEAD `3f9e724fa608e516040f02b9557808ff3efda53e`
  (Phase-1/2 re-verified; confirm again at execution -- a moved pin
  invalidates the Phase-1/2 JSON the loader consumes; X8/W2; STOP if
  moved). `qw-oracle-postgres-dev` up + healthy (REQUIRED by this phase
  -- the migration, loader, F1, SQL probes all run against it via
  `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`).
  Item 4 (pinned runtime dump) is NOT a Phase-3 precondition (X2;
  slot-3 stays level-2; the dump cross-check is Phase 4 / D19).

## Inputs from previous phase

Phase 1 (Track A) and Phase 2 (Track B) are approved and shipped before
this phase starts. Phase 3 shares NO code, NO schema discriminator, NO
gate between the two tracks (D1/D12); it consumes each track's OUTPUT
contract independently. Hard inputs:

- From `prerequisites.md`: item 1 (extractor toolchain) SATISFIED --
  confirm `ezquake/extract.py` + the loader run end-to-end; item 2
  (ezquake-source pinned `3f9e724f`) SATISFIED -- confirm again
  (STOP if moved -- X8/W2); item 3 (Postgres dev container) REQUIRED --
  confirm `qw-oracle-postgres-dev` up; item 4 (pinned dump) explicitly
  NOT a Phase-3 precondition (X2; Phase 4 owns the cross-check).
- From Phase 1: the in-process `reachable(entity)` contract on
  `extractor_lib/_callgraph.py` (conclusion / feeder / feeder-tagged
  evidence), GREEN per `ezquake/verify-callgraph-probes.py`. Phase 3
  does NOT touch the call-graph mechanism (D1 hard no-blend); it adds
  the representation seam D7.3/D14 assigns to the schema phase.
- From Phase 2: `ezquake-hud-commands-ast.json` (the additive 9th file)
  -- per-command `hud_family` + `hud_element` + `ast` block + the `r1`
  AST-confirm block, GREEN per `ezquake/verify-hud-probes.py`.

## Files touched

### Created

```
apps/qw-oracle/db/migrations/<NNN>_l1_runtime_fidelity_provenance.sql
    # <NNN> = ordinal DERIVED at execution ((highest db/migrations/ int)+1;
    # currently 015 but RE-DERIVE -- the ktx-mvdsv arc is live; F8). NEVER
    # hard-code the ordinal. Append-only. Pure-additive ALTER ADD COLUMN
    # x3, nullable, NO CHECK
    # (013 shape: pure schema, no backfill -- values arrive via loader
    # re-run, X9). Header comment documents the D14 three-slot shape,
    # D12 structural no-blend, D13 slot-3 representation-only.
apps/qw-oracle/scripts/extractors/ezquake/emit_callgraph_signal.py
    # Phase-3-owned Track-A serialization seam (OQ-1). Consumes Phase 1's
    # PUBLIC reachable() contract for the entities the existing
    # command/cvar handlers emitted; writes the additive 10th file
    # ezquake-callgraph-reachability-ast.json. Does NOT re-run the parse
    # (D6: re-paying the slowest stage is rejected) -- invoked from the
    # existing Phase-1 post-walk behind the SAME Phase-1 boolean.
apps/qw-oracle/scripts/load-knowledge/load-callgraph-reachability.ts
    # Track-A OVERLAY adapter. Reads the 10th file; populates
    # track_a_reachability on the EXISTING cvar_versions /
    # command_versions rows of the entities the signal enumerates
    # (overlay, NOT entity-create -- no detection re-run, X7). Writes
    # via the upsert ON CONFLICT path (idempotent; X9-consistent).
apps/qw-oracle/scripts/load-knowledge/load-hud-commands.ts
    # Track-B adapter quartet. Reads ezquake-hud-commands-ast.json;
    # upserts each recovered command as a first-class type='command'
    # entity (D21) + a command_versions row + the track_b_hud_recovery
    # JSONB (D14/D16). Commands only (R7 -- never a cvar row).
```

### Modified

```
apps/qw-oracle/SCHEMA.md
    # Same task as the migration (the migration+SCHEMA.md-in-one-task
    # discipline). New "v18 ... runtime fidelity provenance" section +
    # the cvar_versions / command_versions type-specific column lines +
    # the F1 jsonb target-list note.
apps/qw-oracle/scripts/load-knowledge/types.ts
    # CvarVersionRow += track_a_reachability (object|null);
    # CommandVersionRow += track_a_reachability + track_b_hud_recovery
    # (object|null). New input-shape interfaces for the two signal files.
apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
    # upsertCvarVersion / upsertCommandVersion: add the new JSONB
    # column(s) to the INSERT col-list + VALUES (tx.json(...)) + ON
    # CONFLICT DO UPDATE SET. No other column changes (X3 row parity).
apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
apps/qw-oracle/scripts/load-knowledge/load-commands.ts
    # buildCvarVersionRow / buildCommandVersionRow: default the new
    # column(s) to null (NOT populated by these adapters -- the Track-A
    # overlay + Track-B adapter own population; these only carry the
    # nullable field through so the row shape compiles). Zero behaviour
    # change for non-pool/non-HUD rows (X3 DB-row parity).
apps/qw-oracle/scripts/load-knowledge/load-version.ts
    # Import the load-hud-commands quartet + the load-callgraph-
    # reachability overlay; run the Track-B adapter in the per-type
    # loop and the Track-A overlay as a post-pass AFTER the command/cvar
    # loaders (so the rows it overlays exist). One wiring site each.
apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
    # ENTITY_JSON_FILES.ezquake += a hud_commands -> 
    # 'ezquake-hud-commands-ast.json' style entry for the Track-B
    # payload (and the Track-A signal file path constant). Additive.
apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
    # probeJsonbNotStrings.targets += the 3 new columns; a NEW shape
    # probe (three-slot keys present; conclusion in the allowed set; NO
    # cross-track kind; Track-A per_variant over exactly the 4 ids;
    # Track-B hud_element present; slot-3 in {high-confidence-
    # generalized} at this phase -- NEVER dump-confirmed here).
apps/qw-oracle/scripts/load-knowledge/quality-grid.test.ts
    # Test rows for the new probe (well-formed PASS; a kind-blended and
    # a dump-confirmed-too-early row FAIL).
```

### Deleted

```
n/a -- this phase is purely additive. A deletion touching existing
handler emission or existing entity rows would violate X3.
```

## Tasks

### Task 1 -- Lock the two-field / three-slot provenance shape (the schema DESIGN)

- **Goal:** Produce the single authoritative shape contract for both
  JSONB fields -- variant identifiers, residue-flag encoding, feeder
  tag, element link, slot-3 level vocabulary, the D12 structural
  no-blend -- validated against the REAL APPROVED Phase-1
  `reachable()` and Phase-2 `ezquake-hud-commands-ast.json` shapes, so
  Tasks 2-4 synthesize against a locked spec, not a sketch.
- **Files:** none written in this task -- it produces the locked shape
  block that this MD already states (below) and that the subagent
  re-validates against the live Phase-1/2 MD contracts + live schema.
- **Steps:**
  - [ ] Re-read the APPROVED Phase-1 + Phase-2 MD "Outputs" sections and
    confirm the consumed shapes verbatim (Phase-2 OQ-2 explicitly defers
    the exact field names here).
  - [ ] Lock `track_a_reachability` (on `cvar_versions` AND
    `command_versions`; nullable; populated only for the entities the
    Phase-1 signal enumerates -- D20):
    ```
    {
      "conclusion": "genuine-dead" | "build-excluded",          // D14 slot1 / D15
      "evidence": {                                              // D14 slot2 / D15 FEEDER-TAGGED
        "feeder": "callgraph",
        "per_variant": { "client": S, "server": S, "win": S, "apple": S },
        "address_taken_residue": <bool>                          // D5 residue, auditable
      },
      // OR, mutually exclusive on "feeder":
      "evidence": { "feeder": "commented-register",
                    "register_site": { "source_file": "...", "source_line": N } },
      "dump_confirmation": "high-confidence-generalized"         // D14 slot3 / D13; level-2 ONLY at this phase
    }
    ```
    where `S` in `"reachable" | "unreachable" | "not-compiled"` (D5
    three-valued; `not-compiled` is a DISTINCT string, never collapsed
    into `unreachable`). The 4 variant keys are EXACTLY
    `client` / `server` / `win` / `apple` (Phase-1 recon: the true
    4-way the observer is fed). The `feeder` key is an INTRA-Track-A
    tag (D7.1/D15 two-feeder split) -- it is NOT the D12-forbidden
    cross-track `kind` discriminator (that forbids one column carrying
    both a Track-A and a Track-B verdict; the feeder tag distinguishes
    Track A's OWN two feeders and is REQUIRED by D15).
  - [ ] Lock `track_b_hud_recovery` (on `command_versions` ONLY;
    nullable; populated only for the recovered HUD commands -- D21):
    ```
    {
      "conclusion": "bare-command" | "plus-minus-pair",          // D14 slot1: which HUD family
      "evidence": {                                              // D14 slot2 / D16 ELEMENT-LINKED
        "hud_element": "<HUD_Register arg0 literal>",            // D16 the element key the LLM is TOLD
        "hud_family": "bare" | "plus" | "minus",
        "registration_api": "Cmd_AddCommand" | "Cmd_AddRemCommand",
        "handler_fn": "HUD_Func_f" | "HUD_Plus_f" | "HUD_Minus_f",
        "site": { "source_file": "...", "source_line": N }
      },
      "dump_confirmation": "high-confidence-generalized"         // D14 slot3 / D13; level-2 ONLY here
    }
    ```
    D14 slot-1 for Track B = which HUD family (bare command | `+-`
    pair). Map Phase-2 `hud_family`: `bare` -> conclusion
    `"bare-command"`; `plus` OR `minus` -> conclusion
    `"plus-minus-pair"`. The fine `hud_family` (bare|plus|minus) is
    PRESERVED in `evidence` so `plus` vs `minus` is not lost. The D16
    element link is `evidence.hud_element` -- stored so the LLM is TOLD
    the grouping, never inferring it by stem-parsing.
  - [ ] Lock the D12 structural no-blend: TWO separate physical JSONB
    columns. There is NO single `runtime_fidelity` column, NO shared
    `kind`. Track A spans `cvar_versions` + `command_versions` (pool is
    cvars AND commands -- D20); Track B is `command_versions` only
    (commands-only -- D11 amended / D21). A consumer reads exactly one
    column for its track and structurally cannot mis-read the other.
  - [ ] Lock the D13 slot-3 representation-only rule: NULL column ==
    level-1 "no signal" (the natural sparse encoding, mirrors
    `source_root` NULL=default). A populated row's `dump_confirmation`
    is `"high-confidence-generalized"` (level-2) -- written by the
    Phase-3 loader for EVERY populated row, because the mechanism ran on
    that version's own AST but no runtime-dump cross-check has occurred.
    `"dump-confirmed"` (level-3) is a VALID enum value the column may
    hold but Phase 3 NEVER writes it -- it is stamped exclusively by
    Phase 4's runtime-dump cross-check (D14 slot-3 "representation only;
    Phase 4 owns the actual cross-check" / D19). The probe (Task 4)
    FAILS a Phase-3-written `dump-confirmed`.
  - [ ] Lock the D21 entity shape for recovered HUD commands:
    first-class `entities.type='command'`,
    `source_state='source_backed'` (the name is statically modeled
    from a source string LITERAL by `_handler_hud.py`; it is
    compile-time-determinable, just invisible to the literal command
    handler -- it is source-backed, recovered by a smarter static
    model. `dynamically_registered` is REJECTED as the state: D21 says
    these are distinguished ONLY by the Track-B provenance field, and
    they are not runtime-scripted aliases). Recorded as OQ-2 for
    operator transparency (the recommended default; the Track-B field
    is the designated distinguisher per D21).
- **Verification:** the subagent (dispatch brief at the scaffold
  bottom) independently re-derives both shapes from the live Phase-1/2
  MD "Outputs" + live schema and reports any mismatch. PASS: the
  subagent confirms the locked shapes match the APPROVED Phase-1/2
  contracts and D12/D14/D15/D16/D13 with no CRITICAL/SUBSTANTIVE.
- **Execution mode:** `subagent (Opus MAX)` -- this is THE
  cross-cutting schema-design decision the drafter prompt names as
  Opus-MAX-shaped (X6): the two-field/three-slot decomposition,
  variant-id + residue-flag + feeder-tag + element-link encoding
  (R2/R3-store), the D12 structural no-blend, the D13 slot-3
  representation boundary. A wrong shape ships a dishonest or
  track-blended provenance into an autonomously-consumed KB --
  architecturally load-bearing and correctness-critical.

### Task 2 -- Migration (executor-derived ordinal `<NNN>`) + `SCHEMA.md` (one task)

- **Goal:** Land the two physically separate JSONB columns via an
  append-only pure-additive migration and document them in `SCHEMA.md`
  in the SAME task (the migration+SCHEMA.md discipline).
- **Files:** `db/migrations/<NNN>_l1_runtime_fidelity_provenance.sql`
  (created; `<NNN>` derived at execution -- F8); `SCHEMA.md` (modified).
- **Steps:**
  - [ ] DERIVE the ordinal FIRST: `<NNN>` = the next integer after the
    highest existing `db/migrations/` numeric prefix (e.g.
    `ls db/migrations/ | sed 's/_.*//' | sort -n | tail -1`, +1, zero-pad
    to 3). At this writing that is `015` (the ktx-mvdsv arc consumed
    `014` post-freeze) but the executor RE-DERIVES live -- that arc is
    active and may consume more (F8 / X8). Do NOT hard-code.
  - [ ] Write `<NNN>_l1_runtime_fidelity_provenance.sql`. Header comment:
    the D14 three-slot shape (verbatim from Task 1's locked block), the
    D12 structural no-blend rationale, the D13 slot-3
    representation-only rule, and the X9 "pure schema; no backfill --
    values arrive via loader re-run" note (013 precedent). Body:
    ```
    ALTER TABLE cvar_versions    ADD COLUMN track_a_reachability JSONB;
    ALTER TABLE command_versions ADD COLUMN track_a_reachability JSONB;
    ALTER TABLE command_versions ADD COLUMN track_b_hud_recovery JSONB;
    ```
    Nullable (no NOT NULL), NO CHECK constraint (012 precedent: kept
    loose so the three-slot vocabulary can evolve without a migration;
    the loader + the F1 shape probe enforce shape). No backfill, no
    rebuild, no FK change. Idempotency: the migrator tracks applied
    files by sha256 so a re-run is a no-op; `ADD COLUMN IF NOT EXISTS`
    additionally makes a manual re-apply safe -- confirm the live
    `bun db/migrate.ts` convention during execution and match it
    (013/012 did NOT use IF NOT EXISTS because the migrator guards
    re-application; mirror whatever the live migrator does -- do not
    invent a new convention).
  - [ ] Update `SCHEMA.md`: add a dated section (mirror the v17 /
    KTX-onboarding section shape) describing the two columns, the D14
    three-slot shape, the D12 no-blend, the D13 slot-3 boundary, and
    that population is loader-driven (not migration backfill). Add the
    two column names to the `cvar_versions` and `command_versions`
    "Type-specific columns" lines. Add a one-line note to the F1
    jsonb-target list. ASCII only (X10).
- **Verification (the actual commands -- not prose):**
  ```
  cd apps/qw-oracle
  bun db/migrate.ts                       # applies the new <NNN> migration
  bun db/migrate.ts                       # idempotent re-run
  docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc \
    "SELECT column_name,data_type FROM information_schema.columns
     WHERE (table_name='cvar_versions' AND column_name='track_a_reachability')
        OR (table_name='command_versions' AND column_name IN
            ('track_a_reachability','track_b_hud_recovery'))
     ORDER BY 1,2;"
  ```
  PASS condition: first `migrate` applies the new `<NNN>` migration;
  second prints no new
  application (idempotent no-op); the SQL prints exactly 3 rows, all
  `jsonb`; `git grep -n track_a_reachability SCHEMA.md` and
  `track_b_hud_recovery` both non-empty. FAIL condition: a second-run
  re-application, a non-`jsonb` type, a CHECK constraint present, or
  `SCHEMA.md` not updated in this same task/commit.
- **Execution mode:** `subagent (Sonnet medium)` -- mechanical SQL +
  doc synthesis against the Task-1 locked design; reasoning (the
  idempotency convention match) but not architectural. Sonnet-medium
  floor per X6.

### Task 3 -- Loader stores BOTH fields (Track-A overlay + Track-B adapter + the Track-A emit seam)

- **Goal:** Round-trip the REAL APPROVED Phase-1 `reachable()` verdicts
  and Phase-2 recovered HUD commands into the two columns with the
  locked D14 three-slot shape -- Track A as an OVERLAY on existing
  cvar/command version rows, Track B as first-class `command` entities
  -- idempotently, populating slot-3 = level-2 only.
- **Files:** `ezquake/emit_callgraph_signal.py`,
  `load-knowledge/load-callgraph-reachability.ts`,
  `load-knowledge/load-hud-commands.ts` (created);
  `types.ts`, `natural-keys.ts`, `load-cvars.ts`, `load-commands.ts`,
  `load-version.ts`, `extract-tag.ts` (modified).
- **Steps:**
  - [ ] **Track-A emit seam (OQ-1).** `emit_callgraph_signal.py`:
    import `extractor_lib._callgraph`; for the command + cvar entities
    the existing handlers emitted, call the Phase-1 PUBLIC
    `reachable(entity)` and serialize `{ "<canonical-ish key>": {
    conclusion, feeder, evidence } }` to the additive 10th file
    `ezquake-callgraph-reachability-ast.json`. Invoke it from the
    EXISTING Phase-1 post-walk in `extract.py` behind the SAME Phase-1
    boolean (the BFS result is already live there -- D6: do NOT re-run
    the parse). This is an ADDITIVE write only: the 8 F6 byte-identical
    stems and the 9th file are untouched; `reachable()` is consumed
    read-only (Phase-1 mechanism unchanged; D1 no-blend; X3 protects
    the 8). Key the serialized entries by `(type, name)` so the loader
    can join to `entities` via `name_fold` (case-insensitive --
    migration 013).
  - [ ] **`load-callgraph-reachability.ts` (Track-A OVERLAY).** A
    post-pass (NOT a `build*VersionRow` quartet -- it creates no
    entities; X7 no detection re-run). For each entry in the 10th file:
    resolve the existing entity by `(project='ezquake', type,
    name_fold)`; for its row at the loaded version, set
    `track_a_reachability` to the Task-1 shape -- map Phase-1
    `feeder:"callgraph"` -> `evidence.per_variant` over the 4 ids +
    `address_taken_residue`; `feeder:"commented-register"` ->
    `evidence.register_site`; ALWAYS
    `dump_confirmation:"high-confidence-generalized"` (level-2;
    Phase 3 NEVER writes dump-confirmed). Write through the
    `upsertCvarVersion`/`upsertCommandVersion` ON CONFLICT path (the
    row already exists from the per-type loaders; ON CONFLICT DO UPDATE
    sets the JSONB column) -- this is the normal idempotent loader
    write, NOT an in-place repair (X9 satisfied: the value comes from
    re-running extract+load, the ON CONFLICT update is the loader's own
    path). Bind via `tx.json(...)` (never JSON.stringify -- F1 gate).
    If a signal entry matches no existing entity, SKIP it and count it
    (do NOT create an entity -- X7); a non-zero skip count is a loud
    warning, not a silent drop.
  - [ ] **`load-hud-commands.ts` (Track-B, the adapter quartet).**
    `HUD_COMMANDS_PAYLOAD_FIELD='hud_commands'`;
    `hudCommandIsSourceBacked` -> always true (every emitted row is a
    statically-modeled source literal -- D21);
    `buildHudCommandVersionRow(entityId, version, entry, now)` builds a
    `CommandVersionRow` (handler_fn/source_file/source_line/
    source_column from `entry.ast`; registration_file =
    `entry.ast.enclosing_function`; help_* = null -- the HUD command
    family is intentionally absent from `help_commands.json`, the
    doc-gap sibling arc, non-goal) PLUS `track_b_hud_recovery` = the
    Task-1 Track-B shape (conclusion from `hud_family`; evidence
    element-linked; `dump_confirmation:"high-confidence-generalized"`).
    `upsertHudCommandRow`: `upsertEntity({type:'command',
    source_state:'source_backed', ...})` then
    `upsertCommandVersion(row)`. COMMANDS ONLY -- it never builds a
    cvar row or calls cvar synthesis (R7; structurally there is no cvar
    code path). Idempotent by `(project,type,name_fold)` /
    `(entity_id,version)`. Wire the quartet import into
    `load-version.ts` and add `ezquake.hud_command ->
    'ezquake-hud-commands-ast.json'` to `ENTITY_JSON_FILES` (additive).
  - [ ] **Type + upsert plumbing.** `types.ts`: `CvarVersionRow +=
    track_a_reachability: object|null`; `CommandVersionRow +=
    track_a_reachability + track_b_hud_recovery: object|null`; add the
    two signal-file input interfaces. `natural-keys.ts`: add the
    column(s) to `upsertCvarVersion` / `upsertCommandVersion` INSERT
    col-list + VALUES (`${tx.json(row.track_a_reachability as never)}`
    etc.) + ON CONFLICT DO UPDATE SET. `load-cvars.ts` /
    `load-commands.ts` `build*VersionRow`: default the new field(s) to
    `null` (these adapters do NOT populate them -- the overlay /
    Track-B adapter own population; they only carry the nullable field
    so the shared row shape compiles and a normal cvar/command load
    leaves them NULL == D13 level-1 "no signal").
  - [ ] **Ordering in `load-version.ts`.** Run the per-type loaders
    (incl. the Track-B `hud_command` adapter, which creates the
    first-class command entities) FIRST; run the Track-A overlay
    post-pass AFTER, so every row it overlays already exists (Track A
    overlays the pre-existing literal cvar/command rows AND the
    just-created Track-B command rows where they are also in the pool;
    that double-population is correct -- the two columns are
    independent, D12).
- **Verification (the actual commands -- not prose; X2 -- this phase's
  own loader output only):**
  ```
  cd apps/qw-oracle
  # run the real extractor (Phase-1/2 toggles on) + the loader for head
  bun scripts/load-knowledge/index.ts load-version --project ezquake --version head --force
  PSQL="docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -tAc"
  # (a) Track-A populated for pool members, correct three-slot + level-2
  $PSQL "SELECT count(*) FROM command_versions WHERE track_a_reachability IS NOT NULL;"
  $PSQL "SELECT count(*) FROM cvar_versions    WHERE track_a_reachability IS NOT NULL;"
  $PSQL "SELECT track_a_reachability->>'dump_confirmation'
         FROM command_versions WHERE track_a_reachability IS NOT NULL GROUP BY 1;"
  # (b) Track-A 3-gate ground truth round-tripped (Phase-1 self-validated answers)
  $PSQL "SELECT e.name, cv.track_a_reachability
         FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id
         WHERE e.project='ezquake' AND e.name_fold IN
           ('sb_qtvlist_url','gl_outline_scale_world','cl_bobhead');"
  # (c) Track-B first-class command + element link
  $PSQL "SELECT e.name, cv.track_b_hud_recovery
         FROM command_versions cv JOIN entities e ON e.id=cv.entity_id
         WHERE e.project='ezquake' AND e.name_fold IN
           ('radar','+hud_radar','-hud_radar');"
  # (d) D12 structural no-blend + D11 commands-only
  $PSQL "SELECT count(*) FROM cvar_versions WHERE track_b_hud_recovery IS NOT NULL;"  # column does not exist on cvar_versions -> errors = PASS shape
  ```
  PASS condition: (a) Track-A count > 0 on BOTH tables and
  `dump_confirmation` is uniformly `high-confidence-generalized` (NO
  `dump-confirmed` -- Phase 3 never writes level-3); (b)
  `sb_qtvlist_url` -> conclusion `genuine-dead` feeder `callgraph`
  per_variant `unreachable` everywhere-compiled,
  `gl_outline_scale_world` -> `genuine-dead` feeder
  `commented-register` with a `register_site`, `cl_bobhead` ->
  `build-excluded` feeder `callgraph` per_variant reachable
  client/win/apple + `reachable` server (the Phase-1 self-validated
  answers, now round-tripped -- X2: this is Phase-1's OWN probe answer
  re-observed in L1, NOT a new dump cross-check) [F9 DATED CORRECTION
  2026-05-17: was `not-compiled` server -- refuted premise; decisions.md
  D5 AMENDMENT + review-findings F9; conclusion `build-excluded` is the
  load-bearing answer and is UNCHANGED]; (c) `radar` /
  `+hud_radar` / `-hud_radar` all present as `command` entities with
  `track_b_hud_recovery.evidence.hud_element = 'radar'`, conclusions
  `bare-command` / `plus-minus-pair` / `plus-minus-pair`; (d) the
  `track_b_hud_recovery` column does not exist on `cvar_versions` (the
  query errors -- structural D12/D11 proof, that error IS the pass).
  FAIL condition: any `dump-confirmed` written here, a blended/`kind`
  shape, a Track-B cvar row, a created-not-overlaid Track-A entity, or
  a 3-gate mismatch vs the Phase-1 self-validated answers.
- **Execution mode:** `subagent (Opus medium)` -- multi-file judgment-
  dense synthesis against the Task-1 locked shape + the live loader
  pattern: the emit->store boundary (OQ-1), overlay-not-create
  semantics (X7), the X9-consistent ON CONFLICT path, the D21
  first-class + D16 element-link + R7 commands-only, the slot-3 level-2
  discipline. Correctness-critical (a wrong store ships dishonest L1)
  and knowledge-breadth over the recon facts matters more than raw
  speed; not the architecturally-open Opus-MAX shape (the shape is
  locked in Task 1; this is synthesis against it) -- Opus medium per
  X6 ("Opus medium when knowledge breadth matters more").

### Task 4 -- F1 quality-grid extends to the two new JSONB shapes

- **Goal:** The F1 grid is GREEN including the new columns and FAILS a
  regressed shape (JSONB-string scalar, cross-track blend, or a
  Phase-3-written level-3).
- **Files:** `quality-grid.ts`, `quality-grid.test.ts` (modified).
- **Steps:**
  - [ ] `probeJsonbNotStrings.targets +=`
    `{cvar_versions,track_a_reachability}`,
    `{command_versions,track_a_reachability}`,
    `{command_versions,track_b_hud_recovery}` (the
    decisions.md R2 drafting rule -- a new JSONB shape extends this
    gate).
  - [ ] New regression probe `F1.runtime_fidelity_shape`: for each
    non-NULL `track_a_reachability` assert keys
    `{conclusion,evidence,dump_confirmation}` exactly, `conclusion in
    (genuine-dead,build-excluded)`, `evidence.feeder in
    (callgraph,commented-register)`, callgraph evidence has
    `per_variant` with EXACTLY keys `client,server,win,apple` each in
    `(reachable,unreachable,not-compiled)` + a boolean
    `address_taken_residue`, commented-register evidence has
    `register_site`, and `dump_confirmation in
    (high-confidence-generalized,dump-confirmed)`; for each non-NULL
    `track_b_hud_recovery` assert `conclusion in
    (bare-command,plus-minus-pair)`, `evidence.hud_element` non-empty,
    `evidence.hud_family in (bare,plus,minus)`. Pure read-only SQL
    (`jsonb` operators), the established probe shape. (Phase 4 will
    later add the "level-3 only at a pinned-dump commit" cross-check;
    Phase 3's probe asserts shape + that level-3 is well-formed IF
    present, it does NOT assert the dump linkage -- that is Phase 4,
    X2/W4.)
  - [ ] Extend `quality-grid.test.ts`: a well-formed Track-A + Track-B
    row PASS; a `kind`-blended row and a both-columns-populated-as-one
    row FAIL the shape probe; a JSONB-string-scalar row FAILs
    `jsonb_columns_not_strings`.
- **Verification:**
  ```
  cd apps/qw-oracle
  npm run load-knowledge -- quality-grid --project ezquake
  bun test scripts/load-knowledge/quality-grid.test.ts
  ```
  PASS condition: the grid prints `F1.jsonb_columns_not_strings PASS`
  and `F1.runtime_fidelity_shape PASS` and no FAIL in the regression
  family; the test file passes incl. the new cases. FAIL condition:
  any regression FAIL, or the new probe absent from the grid output.
- **Execution mode:** `subagent (Sonnet medium)` -- probe + test
  authoring against the locked shape and the established
  `quality-grid.ts` idiom; reasoning, not architecture. Sonnet-medium
  per X6.

## Verification (phase boundary)

Operator runs, YES/NO. All checks read THIS phase's own loader output +
F1 -- never the runtime dump (Phase 4 answer key, `prerequisites.md`
item 4), never the combined harness (Phase 4/5). X2 by construction
(W4 guarded).

1. **Migration applied + idempotent + columns are JSONB (Task 2):** run
   the Task-2 Verification block. PASS: the new `<NNN>` migration applies
   once, the second
   `bun db/migrate.ts` is a no-op, exactly 3 `jsonb` columns exist
   (`cvar_versions.track_a_reachability`,
   `command_versions.track_a_reachability`,
   `command_versions.track_b_hud_recovery`), no CHECK, `SCHEMA.md`
   updated in the same commit. FAIL: re-application, wrong type, a
   CHECK present, or `SCHEMA.md` not updated alongside.
2. **D12 structural no-blend (the load-bearing decision):**
   `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle
   -tAc "SELECT count(*) FROM information_schema.columns WHERE
   column_name IN ('runtime_fidelity') OR (table_name='cvar_versions'
   AND column_name='track_b_hud_recovery');"` PASS: prints `0` (no
   unified column; Track B absent from `cvar_versions`). And no column
   anywhere carries an internal cross-track `kind` discriminator
   (inspect the migration + the Task-1 shape). FAIL: a unifying column
   exists, or Track B is on `cvar_versions`, or a `kind` blends tracks.
3. **Real Phase-1/2 output round-trips with the correct three-slot
   shape (Task 3, X2):** run the Task-3 Verification block. PASS: all
   of (a)-(d) pass -- Track-A populated on both tables for the
   Phase-1-enumerated pool with feeder-tagged per-variant evidence;
   the 3-gate entities carry exactly the Phase-1 self-validated
   answers (sb_qtvlist_url genuine-dead/callgraph/unreachable-
   everywhere; gl_outline_scale_world genuine-dead/commented-register;
   cl_bobhead build-excluded/reachable-client+win+apple/reachable-server
   [F9 DATED CORRECTION 2026-05-17: was not-compiled-server -- refuted
   premise; decisions.md D5 AMENDMENT + review-findings F9; conclusion
   build-excluded UNCHANGED, load-bearing]); Track-B
   `radar`/`+hud_radar`/`-hud_radar` are first-class
   `command` entities element-linked to `radar`; the structural
   no-blend (d) holds. FAIL: any 3-gate mismatch, a missing/extra
   variant key, a Track-B cvar, or a created (not overlaid) Track-A
   entity.
4. **Slot-3 is representation-only -- NO Phase-3 dump cross-check
   (D14/D19, X2):** `docker exec qw-oracle-postgres-dev psql -U
   qworacle -d qw_oracle -tAc "SELECT DISTINCT
   track_a_reachability->>'dump_confirmation' FROM command_versions
   WHERE track_a_reachability IS NOT NULL UNION SELECT DISTINCT
   track_b_hud_recovery->>'dump_confirmation' FROM command_versions
   WHERE track_b_hud_recovery IS NOT NULL;"` PASS: the ONLY value is
   `high-confidence-generalized` (level-2). FAIL: any `dump-confirmed`
   -- Phase 3 must NOT stamp level-3 (that is Phase 4 / D19).
5. **F1 quality-grid GREEN incl. the new shapes (Task 4):**
   `npm run load-knowledge -- quality-grid --project ezquake` -- PASS:
   `F1.jsonb_columns_not_strings PASS`, `F1.runtime_fidelity_shape
   PASS`, no regression FAIL; `bun test
   scripts/load-knowledge/quality-grid.test.ts` passes. FAIL: any
   regression FAIL or the new probe absent.
6. **X3 non-corruption -- existing emission + existing rows unchanged:**
   the 8 F6 byte-identical stems are byte-identical to the prior-HEAD
   extractor output (Phase-1/2 already gate this; Phase 3 adds only the
   additive 10th file -- re-run the Phase-2 X3 `diff -q` loop over the
   8 stems and confirm empty), AND existing non-pool/non-HUD entity
   rows are unchanged after the loader re-run except the two new
   columns being NULL for them
   (`SELECT count(*) FROM command_versions WHERE track_a_reachability
   IS NULL AND track_b_hud_recovery IS NULL;` is the large majority).
   PASS: the 8-stem `diff -q` loop prints nothing; non-signal rows
   carry NULL in both columns. FAIL: any existing-stem diff, or an
   existing unrelated row mutated.

If all PASS, operator proceeds to Phase 4. If any FAIL, consult
Recovery.

## Outputs to next phase

State now true that was not before:

- The migration (executor-derived ordinal `<NNN>` -- F8) applied;
  `cvar_versions.track_a_reachability`,
  `command_versions.track_a_reachability`,
  `command_versions.track_b_hud_recovery` exist as nullable JSONB,
  no CHECK; `SCHEMA.md` documents them. Two physically separate fields,
  one shared D14 three-slot shape, D12 structural no-blend (D1 becomes
  STRUCTURAL at the data layer).
- The loader round-trips the REAL APPROVED Phase-1 `reachable()`
  verdicts (feeder-tagged per-variant evidence -- D15) and Phase-2
  recovered HUD commands (first-class `command` entities,
  element-linked -- D16/D21) into the two columns, idempotently
  (X9-consistent ON CONFLICT path; re-extract+re-load is the recovery
  shape).
- `dump_confirmation` is uniformly level-2
  (`high-confidence-generalized`) -- the D14 slot-3 representation
  exists and is populated, but NO runtime-dump cross-check has been
  done (D14/D19 boundary held; Phase 4 owns stamping level-3).
- F1 GREEN including `F1.runtime_fidelity_shape` +
  `F1.jsonb_columns_not_strings` extended.
- Runnable state: the ezQuake extractor + loader run end-to-end; the
  pipeline is committable at a working, byte-identical (8 F6 stems +
  existing rows) state (X1).
- Phase 4 (acceptance / dual gates) consumes: the populated two-field
  three-slot provenance as the surface its stage-2 runtime-dump
  cross-check READS to stamp `dump_confirmation` -> `dump-confirmed`
  (level-3) where the pinned dump confirms (D19); the feeder tag
  (D7.1/D15) its feeder-specific gates branch on; the D13 slot-3 enum
  it routes by (D17 stage 3). Phase 3 ships NO dump cross-check, NO
  combined harness, NO delete-list (Phase 4/5) -- X2/W4 held.

## Open questions / deferred items

- **OQ-1 (the Track-A emit->store seam) -- RESOLVED 2026-05-17
  (operator-ratified the recommended default; orchestrator independently
  re-verified the D6/D7.3/X3 reasoning vs primary source). Narrative
  below preserved as the record of the path.**
  - **Question:** Phase 1's `reachable()` is an IN-PROCESS contract
    that writes no file (Phase-1 X3 protects the 8 stems; Phase 1
    deliberately ships no L1 column -- D7.3). The loader needs
    loader-readable data. Phase 1's Outputs explicitly hand the
    `reachable()` contract to Phase 3 "as its input" and D7.3/D14
    assign representation to the schema phase -- so the serialization
    seam is Phase-3 scope.
  - **Default chosen for now:** `emit_callgraph_signal.py` consumes
    Phase 1's PUBLIC `reachable()` read-only and writes an ADDITIVE
    10th file (`ezquake-callgraph-reachability-ast.json`), invoked from
    the existing Phase-1 post-walk behind the SAME Phase-1 boolean (the
    BFS result is already live there -- a standalone re-run script
    would re-pay the parse, which D6 explicitly rejects). This is
    additive only: the 8 F6 byte-identical stems + the 9th file are
    untouched, `reachable()` is unchanged (D1 no-blend; X3 protects the
    8). It DOES add an additive write to the Phase-1-modified
    `extract.py` -- flagged because it touches a prior phase's file,
    even though additively and through Phase 1's public contract.
  - **Resolution (2026-05-17, operator-ratified):** the recommended
    default is ADOPTED -- `emit_callgraph_signal.py` consumes the
    PUBLIC `reachable()` read-only and writes the additive 10th file
    behind the EXISTING Phase-1 boolean (no new boolean). Operator
    explicitly accepts the consequence: post-Phase-3, toggling the
    Phase-1 passenger on ALSO emits the signal file -- additive and
    X3-safe (the 8 F6 stems stay byte-identical; check 6's 8-stem
    `diff -q` loop is the gate). The Phase-3 executor's `extract.py`
    change is additive-only and MUST NOT perturb the 8 stems or add a
    second boolean. Alternatives (a standalone re-run script) violate
    D6's no-re-pay-the-parse lock and were rejected, not deferred.
- **OQ-2 (recovered-HUD-command `source_state`) -- RESOLVED 2026-05-17
  (operator-ratified `source_backed`; orchestrator verified the
  `source_state` CHECK semantics vs `SCHEMA.md:75,82-85`).**
  - **Question:** D21 says recovered HUD commands are first-class
    `command` entities "distinguished ONLY by the Track-B provenance
    field". `entities.source_state` CHECK includes
    `dynamically_registered` ("registered at runtime ... extractor
    sees the registration site but not a static declaration") which
    superficially fits.
  - **Default chosen for now:** `source_state='source_backed'`. The
    name IS a compile-time source-string LITERAL (`HUD_Register` arg0),
    statically modeled by `_handler_hud.py` -- it is source-backed,
    merely invisible to the literal command handler; it is not a
    runtime-scripted alias. Using `dynamically_registered` would add a
    SECOND distinguisher beyond the Track-B field, contradicting D21's
    "distinguished only by". The Track-B provenance field is the
    designated distinguisher.
  - **Resolution (2026-05-17, operator-ratified):** `source_state =
    'source_backed'` is ADOPTED. Verified against `SCHEMA.md:82-85`:
    `source_backed` = "present in the current extraction pass";
    `dynamically_registered` = "registered at runtime rather than
    compile-time; the extractor can see the registration site but not
    a static declaration". The HUD command name IS a compile-time
    source literal statically modeled by `_handler_hud.py`, so
    `source_backed` is accurate and D21's "distinguished ONLY by the
    Track-B field" is decisive (a second `source_state` distinguisher
    would contradict D21). `dynamically_registered` rejected, not
    deferred.
- **Verification sub-agent outcome (Explore, run after drafting).**
  CRITICAL: none. SUBSTANTIVE: none. ADVISORY: none -- all 15 brief
  points returned confirmations against live source: migration 013 is
  the live latest (014 correct), the 8 F6 stems byte-exact to live
  `output_filename`, the `tx.json(...)` JSONB binding + `probeJsonb
  NotStrings.targets` extensible pattern + the `load-version.ts`
  adapter-quartet import pattern verified, the Phase-1 `reachable()`
  and Phase-2 `hud_commands` contracts correctly summarized, the
  two-column D12 structural no-blend + D13 slot-3 level-2-only +
  X2/X3/X7 compliance confirmed, 74/92/129 + the 4 variant ids exact,
  execution modes correctly graded. No sub-agent finding contradicted
  `decisions.md`; no finding was rejected; no decision looked wrong;
  no deviation surfaced. The two open items above are the OQ-1
  emit->store boundary (a Phase-3 representation choice with a
  D6-consistent default, flagged for operator awareness because the
  default additively touches the Phase-1-modified `extract.py`) and
  the OQ-2 `source_state` ratification -- not unresolved scope.
- **Orchestrator independent re-verification (2026-05-17; the trust
  anchor for this phase -- NOT the sub-agent's clean sweep).** The
  sub-agent reported "all 15 points confirmed, 0 findings". Per
  `feedback_verify_dispatched_terminal_claims` that is a hypothesis
  until grep/SQL'd, so the orchestrator independently re-verified every
  load-bearing recon fact against primary source: migration `013`->
  `014` (`ls db/migrations/`) [STALE post-freeze -- F8, see the dated
  correction below; ordinal is now executor-derived]; `source_state`
  CHECK + the
  `dynamically_registered` definition (`SCHEMA.md:75,82-85`); the
  natural key `(project,type,name_fold)` (`SCHEMA.md:71,79`);
  `tx.json(...)` discipline + the explicit "never JSON.stringify"
  comment (`natural-keys.ts:384`) + `probeJsonbNotStrings`
  (`quality-grid.ts` ~`:217/229/1968` AT SESSION-3 TIME -- now shifted,
  see the dated correction below / F8); the Phase-1 `reachable()` /
  Phase-2 `hud_commands` contracts (vs the APPROVED Phase-1/2 MDs).
  ONE point required escalation: the sub-agent's "load-version.ts
  adapter-quartet import pattern verified" could NOT be reproduced by
  grep (a tool malfunction on that file -- `grep -c ""` exit-1 on a
  37KB file); it was settled ONLY by a primary-source Read of
  `load-version.ts:8-70`, which CONFIRMED the recon (the per-type
  quartet import IS exactly as Recon fact #4 describes). The recon is
  correct; the lesson durable for the executor + arc-reviewer is that
  the sub-agent's confirmation on that point was lucky-correct, not
  independently rigorous -- the orchestrator re-verification is the
  trust anchor (`feedback_verification_layer_catches_lift_residuals`).
- **DATED CORRECTION 2026-05-17 (pre-execution cross-phase audit;
  review-findings F8 -- narrative above preserved as the record of the
  path).** Two facts the session-3 sub-agent AND orchestrator verified
  TRUE at the time -- "migration `013` is the live latest, `014` correct"
  and the `quality-grid.ts` line-cites (`:217-272` / `:217/229/1968`) --
  were INVALIDATED POST-FREEZE by the parallel, out-of-scope ktx-mvdsv
  describe-fill arc: commit `95e8d726` (2026-05-17 17:54, ~3h50m after P3
  froze) consumed ordinal `014` (`014_description_provenance_trail.sql`)
  AND appended ~166 lines to `quality-grid.ts` (its `F1.describe_fill.*`
  probes -- a DISJOINT namespace; the `REGRESSION_PROBES[]` registration
  idiom is intact, so no probe-name collision -- but every frozen
  `quality-grid.ts` line number is shifted). This is the
  `feedback_parking_verified_state_is_hypothesis` / X8 lesson
  GENERALIZED to cross-arc drift: a point-in-time verification is not a
  permanent guarantee when a sibling arc shares the migration chain +
  `quality-grid.ts`. RESOLUTION (operator-approved, this session): the
  migration ordinal is EXECUTOR-DERIVED at execution (the corrected Recon
  fact + Task 2 `<NNN>`); every `quality-grid.ts` cite is RE-DERIVED by
  symbol search at execution, never trusted frozen. No design changed --
  no `decisions.md` D-amendment; recorded as review-findings F8.

## Recovery (if verification fails)

Per failure mode (X9: recovery is re-run the corrected extract+load
pipeline end-to-end, NEVER an in-place SQL UPDATE of the bad rows --
the new columns are loader-populated; "UPDATE ... SET
track_a_reachability" as a repair is automatically the wrong instinct):

- **Migration non-idempotent (check 1 FAIL):** the migrator re-applied
  the new `<NNN>` migration -- the sha256/applied-tracking convention
  was not matched, or
  an `IF NOT EXISTS` clause diverges from the live migrator. Match the
  live `bun db/migrate.ts` convention exactly (do not invent one);
  re-run on a clean DB; re-verify.
- **D12 blend (check 2 FAIL):** a unifying column or a cross-track
  `kind` slipped in -- this is the central structural lock. Re-shape to
  TWO separate columns per Task 1; re-run the migration on a clean DB
  and the loader; re-verify. Do NOT "add a discriminator to tell them
  apart" -- that IS the rejected design.
- **3-gate mismatch (check 3 FAIL):** the loader mis-mapped the
  Phase-1 `reachable()` shape (feeder/variant/residue) OR the
  name_fold join missed (case). Inspect the 10th signal file vs the
  stored JSONB for `sb_qtvlist_url`/`gl_outline_scale_world`/
  `cl_bobhead`; fix the mapper/join in
  `load-callgraph-reachability.ts`; re-run extract+load end-to-end
  (X9); re-verify. The Phase-1 self-validated answers are ground
  truth -- never "adjust the expected answer".
- **Level-3 written at Phase 3 (check 4 FAIL):** the loader stamped
  `dump-confirmed` -- it must ALWAYS write
  `high-confidence-generalized` (D14 slot-3 representation-only; the
  dump cross-check is Phase 4 / D19). Remove the level-3 write path;
  re-run; re-verify. Do NOT add a dump read here (that is the W4
  regime collision -- it imports Phase 4's answer key).
- **F1 jsonb-string FAIL (check 5):** a JSON.stringify slipped before
  a JSONB bind -- replace with `tx.json(...)` / direct JS value
  (`reference_postgres_js_jsonb_binding`); re-run the loader; re-grid.
- **X3 existing-stem diff or mutated unrelated row (check 6 FAIL):**
  the Track-A emit seam wrote into an existing stem (not the additive
  10th file) OR a build*VersionRow change altered a non-signal row.
  The seam must ONLY write the 10th file; the per-type adapters must
  default the new field to NULL and change nothing else. Find the
  write, make it additive/NULL-only, re-run extract+load, re-diff. Do
  NOT post-process the JSON or patch the row.
- **Unanticipated failure:** route to operator with the exact command,
  output, the 10th signal file, and the stored JSONB for the 3-gate
  entities -- do not improvise a fix that mutates existing rows or the
  8 byte-identical stems.
