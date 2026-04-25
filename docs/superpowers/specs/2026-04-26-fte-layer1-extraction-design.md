# FTE Layer 1 Extraction — Design

**Date:** 2026-04-26
**Status:** Design approved, ready for implementation plan
**Related:** Phase 2d of the QW knowledge service rollout (per HANDOVER.md)
**Predecessors:** ezQuake extraction (head + deep-time walk v3.0 to head, shipped through 2026-04-25), QWCL 2.33 (first cross-codebase port, shipped 2026-04-25)

## Goal

Load FTE Layer 1 entities (cvars, commands, macros, cmdline_params, asset relations) into `apps/qw-oracle/data/knowledge.db` so slipgate-app's config converter and ConfigViewer can map FTE configurations alongside ezQuake and QWCL. FTE is the primary client of the Quake1 single-player community and powers the web QuakeWorld player on hub.quakeworld.nu, but is rarely used in competitive 4on4 — Phase 2d builds the bridge so cross-engine config translation is possible without committing to historical depth.

## Why FTE is structurally simpler than it looks

FTE has a multi-game reputation (Quake 1, 2, 3, Hexen 2 in one engine) that suggests an exotic extractor. In practice, FTE differs from ezQuake along three preprocessor axes — game type, renderer, feature flags — and is otherwise the same shape: C source, libclang-extractable, same registration model. The "multi-game" question becomes a scope decision (which preprocessor profile do we extract under), not an architectural one.

A prior session validated the load-bearing question with `apps/qw-oracle/scripts/extractors/fte/cvars-check.py`: libclang's `PARSE_DETAILED_PROCESSING_RECORD` flag expands FTE's `CVARD`/`CVARFD`/`CVARAFD`/`CVARAD` macros cleanly, and (name, default, description, alias, callback, flags) are recoverable from the resolved struct initializer by field index. That makes FTE's base-case cvar pattern fall under the playbook's Pattern 1 (literal `cvar_t` struct-init) — just delivered via macro expansion instead of literally.

## Locked scope decisions

These were resolved during brainstorming (2026-04-26 session) and should not be re-litigated without a fresh trigger.

| Decision | Choice | Rationale |
|---|---|---|
| Game profile | Q1 + QW only — no Q2/Q3/Hexen2 | Slipgate's QW use case; Q2/Q3 cvars are noise, not value. Smaller surface, easier validation. |
| Renderers | GL + Vulkan; software and D3D excluded | GL is the QW player's default; Vulkan is forward-looking; software/D3D have no QW competitive use. |
| Platform variants | Linux (base) + Windows; Apple excluded | FTE has 0 cvar declarations gated by `__APPLE__`/`MACOSX` (verified 2026-04-26). ezQuake had 29; FTE genuinely doesn't have an Apple-specific config surface. |
| Plugins | `plugins/ezhud/` only this phase; allowlist for future plugins | Spoike has shown willingness to add ezQuake-parity plugins (`ezhud` already does this). Architecture supports future plugins via single-line allowlist additions. |
| QuakeC modules | Out of scope | `quakec/` directory contains demo/reference modules; verified zero literal cvar registrations. Real QuakeC concern is KTX/dusty-ktx server mods (Phase 2e, separate `tree-sitter` spike). |
| Versioning | Single `head` snapshot per cadence; autobuild number as version label (e.g. `build-6488`) | FTE has no release tags; user community doesn't think in autobuild numbers; nobody runs old FTE for competitive QW. |
| Update cadence | Manual quarterly + event-triggered extras; Phase 2h automation deferred | Same automation question exists for all engines; gets solved once for all of them later. |
| Historical backfill | None | No equivalent of ezQuake's "configs from 3.6.2-era cvars" use case for FTE. |
| Asset bundle | **Included** — Phase 2d-bundle sub-phase | Slipgate user-quake-dir mapping needs to know what files FTE consumes, same as ezQuake. |
| Help-JSON authoring | Not needed | FTE descriptions live inline as `CVARD` macro args; no separate `help_*.json` files exist or need to be authored. |

## Architecture

### File layout

All files under `apps/qw-oracle/scripts/extractors/fte/` are new (the directory currently contains only the retired regex-based prototype `cvars.ts` and the libclang validation script `cvars-check.py`, both retired in the Cleanup section below). Files under `extractor_lib/` and `load-knowledge/` are existing and modified per the loader section.

```
apps/qw-oracle/scripts/extractors/fte/
├── extract.py                     # driver: source-roots × variant matrix
├── _handler_cvars.py              # CVARD/CVARFD/CVARAFD/CVARAD + Cvar_Register
├── _handler_commands.py           # Cmd_AddCommand{,D,AD,Old}
├── _handler_macros.py             # Cmd_AddMacro{,D}
├── _handler_cmdline.py            # COM_CheckParm callsites
├── _handler_ezhud.py              # plugin-only: HUD_Register synth + GetNVFDG
├── _handler_assets.py             # asset loader-sites + cvar bindings
├── seeds/
│   ├── fte-asset-categories.yaml
│   ├── fte-asset-extensions.yaml
│   ├── fte-asset-path-rules.yaml
│   ├── fte-asset-cvar-bindings.yaml
│   └── ezhud-hud-elements.yaml
├── asset-path-rules-verify.py     # adapts ezQuake's verifier
└── output/                        # ast.json files (committed to git)
    ├── fte-variables-ast.json
    ├── fte-commands-ast.json
    ├── fte-macros-ast.json
    ├── fte-cmdline-params-ast.json
    ├── fte-asset-loader-sites-ast.json
    └── fte-asset-cvar-bindings-ast.json
```

### Source-root concept (Approach 2 from brainstorming)

The driver iterates over a list of source roots, not a single source tree:

```python
SOURCE_ROOTS = [
    ("engine",        FTE_REPO / "engine"),
    ("plugin:ezhud",  FTE_REPO / "plugins/ezhud"),
]
```

Each emitted entity row carries a `source_root` field (`"engine"` or `"plugin:ezhud"`). Adding a future plugin is one line in `SOURCE_ROOTS` plus a confirmation that its registration patterns match existing handlers. The cvars/commands/macros handlers are plugin-agnostic — they run identically on engine and plugin code. The ezhud handler runs **only** on `plugins/ezhud/` paths and never sees engine code.

### Variant matrix

Four TU parses per file:

| Variant | Defines applied | Catches |
|---|---|---|
| `client` | `-DHAVE_CLIENT -DGLQUAKE -DNQPROT -DCSQC_DAT -DRTLIGHTS -DMVD_RECORDING -DMULTITHREAD -DSUPPORT_ICE -DPLUGINS` | base GL client cvars; QW + NetQuake protocols on |
| `server` | `-DHAVE_SERVER -DSERVERONLY -DNQPROT -DMVD_RECORDING -DQUAKESTATS` | server-only cvars |
| `win` | client defines + `-D_WIN32 -DWIN32` | Windows-gated client cvars |
| `client_vk` | client defines minus `-DGLQUAKE`, plus `-DVKQUAKE` | Vulkan-only cvars |

Game-type defines (`HEXEN2`, `Q2CLIENT`, `Q2SERVER`, `Q3CLIENT`, `Q3BSPS`, `Q2BSPS`, `VM_Q1`) deliberately undefined — that's the Option B contract.

### Handler responsibilities

| Handler | Detects | Output rows |
|---|---|---|
| `_handler_cvars.py` | `cvar_t` post-macro struct-init from `CVARD`/`CVARFD`/`CVARAFD`/`CVARAD`; `Cvar_Register(&var, group)` for group attribution; in-file `cvargroup_xxx` `#define`s and `char[]` literals | name, default, description, alias, callback fn name, flag tokens, group, source_file, source_line, source_root |
| `_handler_commands.py` | `Cmd_AddCommand`/`Cmd_AddCommandD`/`Cmd_AddCommandAD`/`Cmd_AddCommandOld` callsites | name, handler fn, description (D-variants), alias (AD-variants), legacy flag (Old) |
| `_handler_macros.py` | `Cmd_AddMacro`/`Cmd_AddMacroD` callsites | name, handler fn, description (D-variant) |
| `_handler_cmdline.py` | `COM_CheckParm("-flag")` callsites | flag name, callsites |
| `_handler_ezhud.py` | `HUD_Register(...)` calls in `plugins/ezhud/` only — synthesizes 9 standard subcvars + custom params per element, reading the seed YAML for known custom-param tables; `cvarfuncs->GetNVFDG()` standalone v-table cvars | synthesized cvar rows tagged `source_root: "plugin:ezhud"` and merged into the cvars output |
| `_handler_assets.py` | Loader callsites (`FS_LoadFile`, `FS_OpenFile`, `Mod_LoadModel`, `Image_LoadTextureFromMemory`, `S_PrecacheSound`, etc.) + cvar→category bindings from seed | asset_loader_sites rows + asset_cvar_bindings rows |

Cross-handler dedup invariants (`_seen_in_file`, `_seen_names`) follow the playbook unchanged.

### Loader & schema

**Schema migration v10 → v11.** One additive change: `source_root TEXT` column on each version table that can carry plugin-sourced rows.

```sql
ALTER TABLE cvar_versions ADD COLUMN source_root TEXT;
ALTER TABLE command_versions ADD COLUMN source_root TEXT;
ALTER TABLE macro_versions ADD COLUMN source_root TEXT;
```

Cmdline params, keynames, HUD-elements, rulesets, token-primitives don't get the column — they're engine-only by definition. `NULL` `source_root` semantically equals `"engine"` for backfill; documented in `SCHEMA.md`. No backfill needed for existing ezQuake/qwcl rows.

**Project allowlist update.** `schema.ts` `CHECK` constraint widens across the 8 tables that carry `project`:

```sql
CHECK (project IN ('ezquake','qwcl','fte','mvdsv','ktx'))
```

`fte` is added; `mvdsv` and `ktx` already pre-allowed (per realignment roadmap).

**Loader passthroughs (`apps/qw-oracle/scripts/load-knowledge/`):**
- `load-cvars.ts`, `load-commands.ts`, `load-macros.ts` — each reads `source_root` from the ast.json row and writes it to the version table column. ~2 lines per loader.
- `load-version.ts` orchestrator unchanged.
- `build-snapshot.ts` carries `source_root` through to the slipgate-shaped JSON snapshots so consumers can render plugin cvars distinctly.
- `PROJECT_VERSION_ALIASES['fte'] = ['head']`
- `PROJECT_HAS_ASSET_BUNDLE['fte'] = true`
- `PROJECT_SRC_PREFIX['fte'] = ''` (FTE extractor emits repo-relative paths directly per HANDOVER note)

**Help-JSON status.** FTE doesn't ship `help_variables.json` / `help_commands.json` files. All FTE rows will be `source_state = 'source_backed'` or absent. No `doc_only` complement, no description-augmentation step. The cross-type orphan prune still runs — idempotent and safe with nothing to prune. Descriptions come directly from `CVARD` macro args.

## Versioning & cadence

**Version label.** `build-<N>` where N is FTE's autobuild number, read from source via:
1. Preferred: `engine/common/quakedef.h` or `engine/common/version.c` — search for `FTE_VER_REVISION`/`BUILDNUMBER`/similar `#define` literals.
2. Fallback: `git rev-list --count HEAD` against master (FTE CI uses this monotonic count).

If autobuild number is unreadable, fall back to a date label `YYYY-MM-DD`. Recorded in three places: spec, ast.json `_stats`, DB `commit_sha` column.

**Initial head SHA.** Phase 2d locks one specific master SHA at extraction time. Captured at first run and documented in the per-engine findings doc.

**Idempotency contract.** Re-running `extract-tag --project fte --version build-N --commit <sha>` against the same SHA produces identical rows. Same contract as ezQuake/qwcl loaders.

**Update cadence.** Three-layer mechanism:
1. **Manual quarterly** — every ~3 months pull master, capture new SHA + autobuild number, run `extract-tag`. New version row created; old stays as history. Diffs flow through `diff` and `enrich` CLIs unchanged.
2. **Event-triggered extras** — major Spoike commit, ezhud update, regression fix → unscheduled snapshot. Same mechanism, operator judgment.
3. **Phase 2h automation** — deferred; same problem exists for all engines and gets solved once.

**No deep-time backfill.** Single head + quarterly cadence. If a future need genuinely surfaces, `extract-tag --version build-<old>` against an older SHA works — no new code needed — but not proactively done.

## Validation

**Pass 1 — Runtime cvarlist / cmdlist diff.**

1. Boot FTE (Linux or Windows), open console.
2. `condump runtime-fte.log` after `cvarlist`, `cmdlist`, `cmdline_params`.
3. Strip color codes (`^Cxxx`, `&cff3`-style) and CRLF; case-fold to lowercase. Filter to identifier lines.
4. Pull source-backed names from DB:
   ```bash
   sqlite3 apps/qw-oracle/data/knowledge.db \
     "SELECT name FROM entities WHERE project='fte' AND type='cvar'" | sort -u > db-fte-cvars.txt
   ```
5. `comm -23 runtime-fte-cvars.txt db-fte-cvars.txt` = runtime-only (potential extractor gaps).
6. `comm -13 runtime-fte-cvars.txt db-fte-cvars.txt` = DB-only (source-visible but not in this build's runtime — usually variant-specific).

Categorization buckets:
- Runtime-only, plausibly Q2/Q3/H2-gated → expected exclusion (Option B). Confirm by greppig source for `#ifdef Q2CLIENT`/etc. around the declaration.
- Runtime-only, plugin-resident → check whether runtime FTE has plugins beyond `ezhud`; log as "future-plugin-candidate."
- Runtime-only, dynamic (`Cvar_Get`/`Cvar_FindOrGet`) → out of static reach; document the absence.
- Runtime-only, genuine extractor gap → drive to zero. Each survivor becomes a tracked finding.

**Pass 2 — Field-accuracy sample audit.** 20 random source_backed cvars, compare DB row's `default_value`, `flags_raw`, `description`, `source_file`, `source_line` against literal source. Pass criterion: 20/20 fields accurate.

**Pass 3 — Plugin-source-root sanity.**

```bash
sqlite3 apps/qw-oracle/data/knowledge.db \
  "SELECT source_root, COUNT(*) FROM cvar_versions WHERE entity_id IN (SELECT id FROM entities WHERE project='fte') GROUP BY source_root"
```

Expected: two buckets — `engine` (~80-90%) and `plugin:ezhud` (~10-20%). Zero rows with `NULL` `source_root`. Spot-check 5 random `plugin:ezhud` rows — `source_file` must start with `plugins/ezhud/`.

**Pass 4 — Asset bundle sanity.** `asset_loader_sites` count non-zero (~80-150 expected). 5 random rows spot-checked against source. Path-rules YAML claims verified by greppig source. `asset_cvar_bindings` rows reference real cvars present in the cvars output.

**Expected counts (rough).**

| Type | Range | Notes |
|---|---|---|
| Cvars | 2700-3000 | engine ~2200-2500 + ezhud HUD-synth ~400-500 + ezhud GetNVFDG ~30-50 |
| Commands | 600-800 | |
| Macros | 50-100 | |
| Cmdline params | 150-250 | |
| Asset loader sites | 80-150 | |
| Asset cvar bindings | 30-50 | from seed YAML |

If cvars land dramatically below ~1500 → macro-expansion path missing patterns; investigate. Above ~4500 → Q2/Q3/H2 leaking through; check variant matrix excludes those defines.

**Quality grid integration.** Once head loads cleanly, register `fte` entry in `quality-grid.ts` with regression and anomaly probes adapted from QWCL pattern.

## Sequencing

Phase 2d ships in two sub-phases under this single spec:

**Phase 2d-core (1-2 sessions):**
1. Schema v11 migration (one commit).
2. `clang_config.py` widened for FTE variants.
3. Driver + 4 core handlers (cvars, commands, macros, cmdline) + ezhud handler.
4. Loader passthroughs + project gates.
5. First head load + Pass 1, 2, 3 validation.

**Phase 2d-bundle (1 session, sequenced after core):**
6. Asset seed YAMLs authored (categories ~90% reuse, extensions ~85% reuse, path-rules verified, cvar-bindings authored fresh).
7. Asset handler + path-rules verifier ship.
8. `load-assets` runs against fte head. Pass 4 validation.

The sequencing isolates diagnosis if anything weird surfaces in core extraction — asset bundle complications don't muddy the picture.

## Out of scope (deferrals with revisit triggers)

| Deferral | Trigger to revisit |
|---|---|
| More plugins (`quakebot`, `cef`, `avplug`, etc.) | User pushes for ezQuake-parity feature in a plugin OR runtime cvarlist diff surfaces missing names traceable to a plugin |
| SWQUAKE / D3D variants | Runtime validation surfaces a cvar a real user actually cares about |
| Apple variant for FTE | Mac user reports an FTE cvar mystery; evidence shows it's behind `__APPLE__` |
| Help-JSON authoring | Slipgate's converter needs description text not in `CVARD` args (unlikely) |
| Phase 2h automation | Manual quarterly cadence becomes onerous OR multiple stale-snapshot incidents |
| Historical walk | Concrete consumer asks "what did FTE look like in build-X" with a real reason |
| QuakeC `progs.dat` extraction | Phase 2e (KTX) — separate engine port with `tree-sitter` spike |

## Known limits

**Runtime-dynamic registrations** (`Cvar_Get`/`Cvar_FindOrGet`). Same fundamental limit as ezQuake's `Cvar_Create`. Cvars created at runtime via `exec`. Static extraction can never see them.

**CSQC-registered cvars in user `progs.dat`.** A user-loaded mod can register cvars via QuakeC's `registercvar` builtin. We don't parse `progs.dat`. Out of scope, fundamentally.

**Stub-headers for SDK-dependent code.** Same wall ezQuake hit (the `-nopriority` deferral). FTE's `engine/client/sys_win.c`, `engine/gl/gl_videowin.c` likely have call sites inside function bodies referencing Win32 SDK or DirectX headers Linux libclang can't find. Recovery path documented in playbook: stub headers under `research/repos/fteqw/win-sdk-stubs/` referenced via `-I` in `clang_args_win_for`. **If FTE Phase 2d hits this wall**, that's the trigger to actually build the stub-headers solve — closes ezQuake's `-nopriority` + QWCL's 11 deferred rows + FTE's gaps in one shot.

## Cleanup

Prior session's scaffolding gets retired once new pipeline ships:
- `apps/qw-oracle/scripts/extractors/fte/cvars.ts` (regex-based, pre-libclang) — logic absorbed into new libclang handlers + ezhud seed YAML.
- `apps/qw-oracle/scripts/extractors/fte/cvars-check.py` (validation prototype) — findings drove design; file no longer needed.

## Findings doc

When Phase 2d ships, write `docs/superpowers/specs/<date>-fte-extraction-findings.md` capturing pattern catalog vs. ezQuake, counts that landed, runtime validation results, anything for future sessions. Becomes the artifact MVDSV (Phase 2e) reads when porting.

## Related

- HANDOVER entry: "Phase 2d-2h: remaining QW knowledge rollout"
- Playbook: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
- Predecessor spec: ezQuake unified extractor (shipped 2026-04-22)
- Sibling spec: QWCL 2.33 first cross-codebase port (shipped 2026-04-25)
- Schema: `apps/qw-oracle/SCHEMA.md` (v10 today; this design ships v11)
- Memory: `project_realignment_roadmap.md`, `reference_libclang_ezquake_extraction.md`, `reference_asset_loader_extractor_capabilities.md`
