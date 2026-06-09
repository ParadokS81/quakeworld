---
date: 2026-06-09
type: sidequest-spec + fresh-terminal-handoff
arc-slug: docs-l1-enrichment
status: SHIPPED 2026-06-09 -- mvdsv/qtv/qwfwd categorized; QWCL 100% described+categorized incl. all 72 cmdline_params (operator opted in beyond the 308 scope); build-snapshot emitQwclVariables reads from L1. Apply scripts + locked taxonomy in docs/superpowers/plans/2026-06-09-docs-l1-enrichment/.
spun-out-of: docs/superpowers/parking/2026-06-09-docs-quake-world-brainstorm-handoff.md
parent-arc: docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md
---

# L1 enrichment sidequest: categorize MVDSV/QTV/QWFWD + complete QWCL

> **To launch:** open a fresh `claude` terminal in the quakeworld monorepo (main tree) and paste this doc, or tell it: *"Read `docs/superpowers/parking/2026-06-09-docs-l1-enrichment.md` and follow it."* This doc is both the durable spec and the launch prompt.

A focused L1-enrichment sidequest to make **MVDSV, QTV, QWFWD, and QWCL** docs-ready in the qw-oracle Layer 1 DB, ahead of the `docs.quake.world` arc. Two work items:

1. **Categorize MVDSV / QTV / QWFWD** -- they have synthesized descriptions but no categories.
2. **Complete QWCL to 100%** -- borrow descriptions + categories from ezQuake for the ~70% that name-match; light-synthesize one-line descriptions for the ~30% QWCL-only legacy.

**FTE is explicitly OUT** (see "Not in scope").

## Why this exists

A DB audit on 2026-06-09 (during the docs.quake.world brainstorm) found the 7 codebases unevenly enriched, and the docs site needs each codebase browsable by *category*, not just a flat dump:

| Codebase | Descriptions | Categories | Docs-ready? |
|---|---|---|---|
| ezQuake | upstream help_json (rich) | 43 source-groups | yes |
| KTX | 100% synthesized (prior arcs) | 13 categories (b6-categorize) | yes |
| **MVDSV** | ~99% synthesized | none | needs categories |
| **QTV** | 100% synthesized | none | needs categories |
| **QWFWD** | 100% synthesized | none | needs categories |
| **QWCL** | none (just a '0' sentinel) | none | needs borrow + light-synth |
| FTE | partial (cvars 76%, cmds 34%) | none | DEFERRED |

## Invoke first

- `superpowers:brainstorming` -- but ONLY for the one genuinely-open design question: the **per-codebase category taxonomy** (calibrate from the actual entities). Everything else below is decided; do not relitigate.
- This is execution-heavy. After the taxonomy is settled, go straight to the KTX categorize machinery + a QWCL borrow/synth script. It is one focused session / small arc -- likely no arc-planner ceremony needed.

## Required reads (in order)

1. **This doc** -- the full spec.
2. **`docs/superpowers/plans/2026-05-22-ktx-l1-categorize/`** -- `b6-categorize-prompt.md` + `-calibration.md` + `-overrides.md`. The categorize machinery to clone for MVDSV/QTV/QWFWD.
3. **`apps/qw-oracle/SCHEMA.md`** -- the `entities` table's "Description-provenance family" (`description` + `description_origin`; the `'inherited'` slot is reserved-unused and this sidequest is its first writer) + the v19 `category_inferred` / `category_inferred_origin` section.
4. **`apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`** -- `emitQwclVariables` (the current snapshot-time QWCL borrow you will move into L1) and how each project's category/description data is read.
5. (Reference) `describe-fill-synthesis` skill -- the synthesis pattern, but run **LIGHT** for QWCL (plain one-liners, no verdict-tracing, no 7-section cards).

## Scope + locked decisions

### Item 1 -- Categorize MVDSV (291) + QTV (52) + QWFWD (42)

- **Machinery:** clone the KTX b6-categorize pass (read #2).
- **Taxonomy (locked decision):** do NOT blind-reuse KTX's 13 categories -- they are mod-specific (Frogbot / Race / Match flow) and will not fit a server/proxy/forwarder. Run KTX's calibration step PER codebase to derive the set from the actual entities. Expected shapes: MVDSV -> server / network / protocol / antilag / accounts / admin; QTV -> stream / relay / buffer / connection; QWFWD -> routing / auth / logging. ~8-12 categories each. Reuse KTX category *names* only where they genuinely overlap (Admin, Voting, Server config).
- **Writes:** `category_inferred` + `category_inferred_origin` (format `{model}|{prompt_version}`, e.g. `claude-sonnet-4-6|mvdsv-categorize-v1`). The XOR invariant (both non-null or both null) is gated by `F1.category_inferred_provenance_integrity`.

### Item 2 -- Complete QWCL to 100% (308 entities)

QWCL is the original QuakeWorld client; this is a posterity reference. The earlier "no full synthesis" steer is honored by keeping the synthesis **light**, NOT by skipping entities. Rationale for 100%: the ~70% borrowable from ezQuake are by definition the entities ezQuake *also* has (a user could read the ezQuake page) -- the unique value of a QWCL page IS the ~30% QWCL-only legacy. Half-filling would document the redundant part and blank the distinctive part.

- **Borrow (~217 matched, ~70%):** name-match (via `name_fold`) each QWCL cvar/command to ezQuake `head`. Where ezQuake has a description, copy it into QWCL `entities.description` with `description_origin = 'inherited'` (the reserved slot's first real use). Record an anchor for the ezQuake version borrowed from. Category = the matched ezQuake entity's group-name.
- **Light-synth (~90 QWCL-only, ~30%):** these are QWCL originals ezQuake dropped/renamed -- `pointfile`, `envmap`, `rerecord`, `nextul`/`stopul`, `menu_keys`/`menu_video`, `gl_texturemode` (a command in QWCL), etc. Synthesize PLAIN one-liners from QWCL source. `description_origin = 'synthesized'`, anchor = QWCL version. The lighter rigor bar is operator-sanctioned (posterity, low-stakes consumer -- operator memory "rigor bar follows the consumer"); do not gold-plate.
- **Category column (default -- confirm at session start):** write QWCL categories to `category_inferred` (same lane as the other synthesized codebases, so the docs projection has one simple rule: "category_inferred if present, else ezQuake's help_group_id, else flat"). Map matched entities to their ezQuake group-name; assign the QWCL-only ones during light-synth. Alternative considered: inherit ezQuake's `help_group_id` directly + carry ezQuake's `groups` taxonomy. Pick whichever keeps the docs projection simplest.
- **build-snapshot cleanup (in scope -- it is QWCL-data-correctness):** once QWCL descriptions live in L1, simplify `emitQwclVariables` to read descriptions from L1 like every other project, instead of its current snapshot-time ezQuake cross-ref + name-prefix `inferQwclCategory` guess.

## Not in scope

- **FTE.** 3038 entities, 68% described (commands only 34%), no usable categories. Active project, nobody plays it today; the operator may consult Spike (the author) on categorization. Lands as its own later effort, not here.
- **The docs site / export pipeline.** This sidequest gets the L1 DATA correct in the DB. Extending `build-snapshot` to emit MVDSV/QTV/QWFWD/FTE for the docs site is the `docs.quake.world` arc's job (its export-pipeline phase). The only build-snapshot change here is the QWCL cleanup above.
- **Re-touching ezQuake or KTX** (already docs-ready).

## DB access + first actions

DB runs in Docker: `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`. Bun is the runtime for all load-knowledge scripts (`bun scripts/...`); use `bun install`, never npm, in `apps/qw-oracle`.

1. Invoke `superpowers:brainstorming` for the per-codebase taxonomy only.
2. **Re-verify the starting state cold** (do not trust this doc's numbers blind): description coverage + category emptiness for mvdsv/qtv/qwfwd/qwcl, and the QWCL->ezQuake `name_fold` overlap (~70% expected: 99/121 commands, 118/187 cvars matched-with-description).
3. Calibrate the category set for MVDSV first (biggest at 291), then QTV/QWFWD, by inspecting the actual entities (KTX calibration step as the template).
4. Execute: categorize fan-out (writes `category_inferred` + origin) -> QWCL borrow script (inherited descriptions + categories) -> QWCL light-synth fan-out (~90 one-liners) -> build-snapshot `emitQwclVariables` cleanup.
5. Verify (below).

## Verification

- F1 quality grid per touched project: `load-knowledge -- quality-grid --project <p>`.
- `F1.category_inferred_provenance_integrity` -- XOR invariant across cvar_versions + command_versions.
- `F1.describe_fill.origin_vocabulary` -- confirm it accepts `'inherited'` (it is in the column-wide superset per SCHEMA.md; the QWCL borrow must not trip it).
- Idempotent reload -- re-running produces identical rows (the loader idempotency rule).

## Operator notes + working preferences

- Verbatim steer: "qwcl is cheap because its same entities in ezquake so just add descriptions and inherit the categories from that ... its more for posterity." "FTE is different beast and also noone plays with that today ... i might ask spoike to get some input there."
- Active stack the docs site targets: ezQuake, KTX, MVDSV, QTV, QWFWD, + QWCL-for-posterity. FTE is the known later-add.
- One question at a time; plain English first; be decisive (recommend, don't poll).
- Output discipline: ASCII only in code/regex; no em/en dashes; no AI-slop voice.
- Momentum over ceremony; the operator does not touch git -- Claude commits to `main` directly, commit per-codebase as you go.
- Rigor bar follows the consumer: QWCL is posterity/low-stakes -- light synthesis is fine and intended.

## When done

Update `HANDOVER.md` (this sidequest's active-arcs entry -> delete on ship). Report back: enrichment complete, docs active-stack now 6 codebases (ezQuake/KTX/MVDSV/QTV/QWFWD/QWCL), FTE the known later-add -- ready to resume the `docs.quake.world` brainstorm at Q1 (IA/taxonomy).

## Related

- Parent spine: `docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md`.
- Spun out of: `docs/superpowers/parking/2026-06-09-docs-quake-world-brainstorm-handoff.md`.
- Machinery: `docs/superpowers/plans/2026-05-22-ktx-l1-categorize/`.
- Schema: `apps/qw-oracle/SCHEMA.md` (description-provenance family; v19 category_inferred).
- Memory: "rigor bar follows the consumer", "mod L1 documentation architecture" (two-layer: universal type axis + per-codebase category axis).
