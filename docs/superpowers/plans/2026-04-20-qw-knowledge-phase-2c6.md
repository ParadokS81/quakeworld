# QW Knowledge Phase 2c.6 Implementation Plan — ezQuake Asset Consumption

> **Predecessor:** Phase 2c.5 plan at `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md`.
> **Spec:** `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`.
> **Schema spec to bump:** `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` (v2 → v3).
> **Execution:** main tree, commit per task, no feature branch (see root `CLAUDE.md` git workflow).

**Goal:** extract ezQuake's filesystem-consumption behavior into `knowledge.db`. Adds five new tables describing what files the engine can read, from where, under what search-path rules, and which cvars drive which asset paths. End state: a downstream consumer (slipgate dir browser, MCP tools, future clients) can answer "what does ezQuake consume and how" from SQL joins alone, no source reading required.

**Non-goals:**
- MVDSV / KTX / FTE asset extraction (Phase 2d/2e).
- Mod-producer extraction ("what does TF ship"). Different table shape (`mod_contributions`), different extraction method (filesystem walk of mod repos). Future Phase 3+.
- Slipgate dir-browser implementation. Its vision spec is blocked on Phase 2c.6 landing; its own implementation spec/plan happens after.
- Layer 3 concept notes ("what is a conchar", "pak vs pk3 history"). Authored after Layer 1 facts exist.
- Runtime filesystem scanning of a user's quake dir. That is the consumer's job; Phase 2c.6 ships rules, not scans.

---

## Context for the executing session

### What Phase 2c.5 already gave us

`knowledge.db` at schema v2 has 3832 ezQuake entities across 8 types (cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive). The loader pipeline supports type-dispatched extraction JSON → SQL with per-type adapter modules, AST-hash-based idempotency, and source-state lifecycle (source_backed / source_retired / doc_only / dynamically_registered). The libclang Python extractor pattern is proven (dual-TU client+server parse, enum resolution, string-literal extraction, enclosing-function tracking via depth-first visitor stack).

Phase 2c.6 reuses **all** of that machinery. New extractors clone the existing extractor scaffolds (CLANG_ARGS, PARSE_OPTS, helper functions). New loader adapters clone the existing per-type `load-*.ts` modules. Schema migration follows the v1→v2 pattern from Phase 2c.5 with `foreign_keys = OFF` toggled outside the transaction.

### What's different about Phase 2c.6

Three things the previous phases did not face:

1. **Hand-seeded data alongside extracted data.** `asset_categories`, `asset_extensions`, and `asset_path_rules` are partially (or wholly) hand-authored and shipped as seed YAML files that the loader ingests. The extractor validates them — e.g. for path rules, the extractor confirms that the cited `source_ref` still points at the claimed function/line shape. Drift triggers a warning, not a silent pass.

2. **Data-flow inference for cvar→asset bindings.** `asset_cvar_bindings` links existing cvar entities to asset categories with optional path templates. A small AST pass handles the easy cases (cvar `.string` dereference textually near a loader call in the same function). The hard cases — cvar value flowing through struct fields across functions — go into a hand-curated seed YAML. The automation is a gap-filler and regression canary, not the primary source.

3. **Rules are first-class rows.** `asset_path_rules` is ordered, versioned, and describes engine behavior (search-path stack, pak precedence, gamedir semantics) that no single call site captures in isolation. Rules are written by reading `fs.c` carefully once, pinned to `source_ref`, and re-verified on every version load.

### Decisions baked in before planning (from spec review)

These were deliberated in the pre-plan conversation and are committed here so they don't get relitigated mid-execution:

- **Loader-site capture is exhaustive.** Every FS/asset loader call site gets a row, including dev/debug paths. Dev-only sites are tagged with a `dev_only = 1` column; consumers filter at read time. Data is cheap; filtering after the fact is flexible.
- **Cvar-binding is seed-first, automation-second.** A hand-curated YAML of ~60 asset-pointing cvars is the source of truth. The AST auto-pass runs as a validator: it emits its own rows with `confidence='auto'` and the loader warns when the auto-pass finds bindings the seed doesn't list (candidate for seed update) and warns when the seed claims a binding the auto-pass can't corroborate (stale seed or cross-function flow).
- **Path rules are hand-curated + source-pinned.** Each rule row cites a `source_ref`; extractor validates the cited function/line still exists and its AST shape is broadly unchanged. Rules describe engine semantics (search order, archive precedence, gamedir stack) — not call sites.
- **Asset categories are full entities.** Same schema uniformity (`canonical_id`, `source_state`, versioned table) as cvars/commands/etc. Lets MCP tools treat them identically.

### Extractor file naming

- `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py` — AST walk for call-site inventory.
- `packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py` — AST auto-pass for cvar→asset binding validation (peer to the seed, not primary).
- `packages/qw-config/scripts/extract-ezquake-asset-path-rules-verify.py` — runs over the hand-seeded path rules and cross-checks their `source_ref` citations against the current AST. Emits warnings, no DB writes.

Hand-seeded inputs live in `packages/qw-config/seeds/`:

- `ezquake-asset-categories.yaml`
- `ezquake-asset-extensions.yaml`
- `ezquake-asset-path-rules.yaml`
- `ezquake-asset-cvar-bindings.yaml`

All four merged with their auto-extracted peers at load time.

---

## Schema bump v2 → v3

New tables and expanded `entities.type` CHECK. Same migration pattern as v1→v2 — `foreign_keys = OFF` outside transaction, rebuild `entities` with widened CHECK, re-stamp `schema_meta`.

### New `entities.type` values

Add to the existing 8: `asset_category`. Categories are the only new first-class entity type. Path rules, loader sites, extensions, and cvar bindings are *relation rows* — they reference entities but are not themselves entities.

This is a deliberate shape choice. Making every row an entity bloats the `entities` table without query benefit; keeping rules and sites as dedicated tables with their own natural keys is cleaner.

### New tables

```sql
-- Category entity versions (mirrors existing per-type pattern)
CREATE TABLE asset_category_versions (
  entity_id       INTEGER NOT NULL REFERENCES entities(id),
  version         TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  description     TEXT,
  notes           TEXT,
  raw_ast_hash    TEXT,
  extracted_at    TEXT NOT NULL,
  PRIMARY KEY (entity_id, version)
);

-- Extension -> category mapping. (extension, path_hint) is the natural key;
-- path_hint is nullable for the unambiguous cases.
CREATE TABLE asset_extensions (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version          TEXT NOT NULL,
  extension        TEXT NOT NULL,
  path_hint        TEXT,
  category_id      TEXT NOT NULL REFERENCES entities(canonical_id),
  notes            TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  UNIQUE (project, version, extension, path_hint)
);
CREATE INDEX idx_asset_ext_cat ON asset_extensions(category_id);

-- Search-path / archive-precedence rules. Ordered per (project, version, rule_kind).
CREATE TABLE asset_path_rules (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version          TEXT NOT NULL,
  canonical_id     TEXT NOT NULL,                 -- 'ezquake:path_rule:gamedir_stack'
  rule_kind        TEXT NOT NULL CHECK (rule_kind IN (
                     'search_path','archive_precedence','cmdline_override','gamedir_behavior'
                   )),
  ordinal          INTEGER NOT NULL,              -- lower = applied first within (project, version, rule_kind)
  description      TEXT NOT NULL,
  source_ref       TEXT,                          -- 'fs.c:412'
  source_verified  INTEGER NOT NULL DEFAULT 0,    -- 1 if the extractor could confirm source_ref still valid
  notes            TEXT,
  raw_ast_hash     TEXT,
  extracted_at     TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);

-- Cvar -> asset binding. Joins an existing cvar entity to a category.
CREATE TABLE asset_cvar_bindings (
  id               INTEGER PRIMARY KEY,
  project          TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version          TEXT NOT NULL,
  cvar_canonical_id  TEXT NOT NULL REFERENCES entities(canonical_id),
  category_id        TEXT NOT NULL REFERENCES entities(canonical_id),
  path_pattern       TEXT,                        -- 'skins/{value}.pcx'
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  confidence         TEXT NOT NULL CHECK (confidence IN (
                       'seed','auto','auto_confirms_seed','auto_orphan'
                     )),
  source_ref         TEXT,                        -- call site or seed-specified reference
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, cvar_canonical_id, category_id, path_pattern)
);
CREATE INDEX idx_asset_cvar_bind_cvar ON asset_cvar_bindings(cvar_canonical_id);
CREATE INDEX idx_asset_cvar_bind_cat  ON asset_cvar_bindings(category_id);

-- File-I/O call site inventory. One row per distinct source location.
CREATE TABLE asset_loader_sites (
  id                 INTEGER PRIMARY KEY,
  project            TEXT NOT NULL CHECK (project IN ('ezquake','fte','mvdsv','ktx')),
  version            TEXT NOT NULL,
  canonical_id       TEXT NOT NULL,               -- 'ezquake:loader_site:fs_loadfile_gfx_wad'
  function_name      TEXT NOT NULL,               -- 'FS_LoadFile'
  source_file        TEXT NOT NULL,
  source_line        INTEGER NOT NULL,
  source_column      INTEGER,
  enclosing_function TEXT,
  reads_category_id  TEXT REFERENCES entities(canonical_id),  -- nullable when generic
  load_trigger       TEXT NOT NULL CHECK (load_trigger IN (
                       'startup','on_demand','on_connect','on_map_load','unknown'
                     )),
  path_source        TEXT NOT NULL CHECK (path_source IN ('literal','cvar','computed','unknown')),
  path_literal       TEXT,                        -- set when path_source='literal'
  path_cvar_id       TEXT REFERENCES entities(canonical_id), -- set when path_source='cvar'
  confidence         TEXT NOT NULL CHECK (confidence IN ('certain','heuristic','unclassified')),
  dev_only           INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  raw_ast_hash       TEXT,
  extracted_at       TEXT NOT NULL,
  UNIQUE (project, version, canonical_id)
);
CREATE INDEX idx_asset_loader_category ON asset_loader_sites(reads_category_id);
CREATE INDEX idx_asset_loader_cvar     ON asset_loader_sites(path_cvar_id);
CREATE INDEX idx_asset_loader_fn       ON asset_loader_sites(function_name);
```

### `schema_meta` bump

- `schema_version` → `'3'`.
- v2→v3 migration runs when `existingVersion === 2 && SCHEMA_VERSION === 3`: rebuild `entities` table with new `type` CHECK (adds `asset_category`), create new tables idempotently.

---

## Task 1: Seed YAMLs for categories, extensions, path rules, cvar bindings

**Intent:** land the hand-authored ground truth first. Downstream tasks (extractors, loader adapters) consume these plus their auto-extracted peers.

### 1a — `packages/qw-config/seeds/ezquake-asset-categories.yaml`

Canonical list. Start with:

```yaml
# project: ezquake
# version: head  (applies to any version unless explicitly scoped later)
categories:
  - name: config
    display_name: "Configuration Files"
    description: "Client configuration files (.cfg) parsed by exec at startup or runtime."
  - name: conchar
    display_name: "Console Character Set"
    description: "Bitmap font used to render the console and HUD text."
  - name: crosshair
    display_name: "Crosshair Image"
    description: "User-selectable crosshair overlay image."
  - name: texture
    display_name: "Texture"
    description: "World, model, or HUD textures. Includes 32-bit replacements for baseline .wad data."
  - name: skin
    display_name: "Player Skin"
    description: "Player model skin, loaded per-connect from userinfo."
  - name: sound
    display_name: "Sound"
    description: "Audio samples consumed by the sound engine."
  - name: model
    display_name: "Model"
    description: "3D model (.mdl, .md3, .bsp for brush-model entities)."
  - name: map
    display_name: "Map"
    description: "Level geometry (.bsp). Downloaded per-connect when absent."
  - name: wad
    display_name: "WAD Archive"
    description: "Legacy Quake asset archive (.wad) containing textures or HUD graphics."
  - name: pak
    display_name: "PAK Archive"
    description: "Original Quake pack archive (.pak). Mounted into search path at init."
  - name: pk3
    display_name: "PK3 Archive"
    description: "ZIP-based pack archive (.pk3). Mounted into search path at init."
  - name: demo
    display_name: "Demo Recording"
    description: "Recorded game replay (.qwd, .mvd, .qtv)."
  - name: screenshot
    display_name: "Screenshot"
    description: "Captured screen image (.tga, .png, .jpg)."
  - name: hud_overlay
    display_name: "HUD Overlay Image"
    description: "User-configurable HUD graphic referenced by a hud_* cvar."
  - name: skybox
    display_name: "Skybox"
    description: "Six-image cubemap for the world sky, selected by r_skyname."
  - name: charset
    display_name: "Charset Replacement"
    description: "Custom bitmap charset loaded via loadcharset. Distinct from conchar for indexing clarity."
  - name: other
    display_name: "Other"
    description: "Files the taxonomy doesn't otherwise cover."
```

Expected ~17 entries (15-20 range is fine; err toward inclusive).

### 1b — `packages/qw-config/seeds/ezquake-asset-extensions.yaml`

```yaml
# project: ezquake
extensions:
  - extension: ".cfg"
    category: config
  - extension: ".pak"
    category: pak
  - extension: ".pk3"
    category: pk3
  - extension: ".wad"
    category: wad
  - extension: ".bsp"
    category: map
  - extension: ".mdl"
    category: model
  - extension: ".md3"
    category: model
  - extension: ".wav"
    category: sound
  - extension: ".ogg"
    category: sound
  - extension: ".qwd"
    category: demo
  - extension: ".mvd"
    category: demo
  - extension: ".dem"
    category: demo
  - extension: ".qtv"
    category: demo
  # Texture-variant extensions need path_hint disambiguation.
  - extension: ".tga"
    path_hint: "textures/"
    category: texture
  - extension: ".tga"
    path_hint: "skins/"
    category: skin
  - extension: ".tga"
    path_hint: "crosshairs/"
    category: crosshair
  - extension: ".tga"
    path_hint: "gfx/"
    category: hud_overlay
  - extension: ".tga"
    path_hint: "env/"
    category: skybox
  - extension: ".tga"
    category: screenshot             # fallback when no path_hint matches
  - extension: ".png"
    path_hint: "textures/"
    category: texture
  - extension: ".png"
    category: screenshot
  - extension: ".jpg"
    category: screenshot
  - extension: ".pcx"
    path_hint: "skins/"
    category: skin
  - extension: ".pcx"
    path_hint: "gfx/"
    category: conchar
  - extension: ".lmp"
    category: hud_overlay            # legacy .lmp (conchars, menu graphics)
```

Consumer rule: longest-matching `path_hint` wins. If no `path_hint` matches, use the unqualified row. Spec allows this to grow; seed from what ezQuake source reveals.

### 1c — `packages/qw-config/seeds/ezquake-asset-path-rules.yaml`

Authored by reading `fs.c`. Ten to fifteen rules estimated; each cites `source_ref`:

```yaml
# project: ezquake
path_rules:
  - canonical_id: ezquake:path_rule:searchpath_stack_order
    rule_kind: search_path
    ordinal: 1
    description: "Search paths are consulted in LIFO order: the most recently added directory is checked first. FS_AddGameDirectory pushes onto com_searchpaths as the head of a linked list."
    source_ref: "fs.c:<FS_AddGameDirectory line>"   # filled by author reading source
  - canonical_id: ezquake:path_rule:pak_lex_order
    rule_kind: archive_precedence
    ordinal: 1
    description: "Within a search-path directory, .pak files are loaded in lexicographic ascending order (pak0, pak1, ...). Later paks override earlier ones for same-name entries."
    source_ref: "fs.c:<FS_LoadPackFile or pak-enum site>"
  - canonical_id: ezquake:path_rule:pk3_vs_pak_precedence
    rule_kind: archive_precedence
    ordinal: 2
    description: "<confirm during authoring: pk3 vs pak within the same dir>"
    source_ref: "fs.c:<site>"
  - canonical_id: ezquake:path_rule:loose_vs_archive
    rule_kind: archive_precedence
    ordinal: 3
    description: "<confirm: does loose-on-disk override archived, or vice versa>"
    source_ref: "fs.c:<site>"
  - canonical_id: ezquake:path_rule:id1_qw_base_stack
    rule_kind: search_path
    ordinal: 0
    description: "id1/ is mounted first; qw/ is mounted on top. gamedir mods mount above qw/."
    source_ref: "fs.c:<FS_Init or base-init site>"
  - canonical_id: ezquake:path_rule:gamedir_semantics
    rule_kind: gamedir_behavior
    ordinal: 1
    description: "A gamedir command swaps in a new mod directory ABOVE qw/ without removing qw/ from the stack. Assets missing from the mod dir fall through to qw/ and then id1/."
    source_ref: "fs.c:<gamedir handler site>"
  - canonical_id: ezquake:path_rule:basedir_cmdline
    rule_kind: cmdline_override
    ordinal: 1
    description: "-basedir CLI param sets the root above which id1/ and qw/ are resolved."
    source_ref: "<fs.c or COM_Init site>"
  # ... author adds further rules by reading fs.c ...
```

Task 1c is the task that **requires real source reading** during plan execution. The rest of the seeds can be written from prior knowledge; these rules get their value from being source-accurate.

### 1d — `packages/qw-config/seeds/ezquake-asset-cvar-bindings.yaml`

```yaml
# project: ezquake
# Each entry binds an existing cvar entity to an asset category with an
# optional path template. The loader checks that cvar_canonical_id resolves
# in entities; stale names emit a warning.
cvar_bindings:
  - cvar: crosshairimage
    category: crosshair
    path_pattern: "crosshairs/{value}.tga"
    load_trigger: on_demand
    source_ref: "<call site in r_draw.c or similar>"
  - cvar: r_skyname
    category: skybox
    path_pattern: "env/{value}_{face}.tga"      # face ∈ {ft,bk,lf,rt,up,dn}
    load_trigger: on_map_load
    source_ref: "<call site>"
  - cvar: cl_teamskin
    category: skin
    path_pattern: "skins/{value}.pcx"
    load_trigger: on_connect
    source_ref: "cl_parse.c:<skin-load site>"
  - cvar: cl_enemyskin
    category: skin
    path_pattern: "skins/{value}.pcx"
    load_trigger: on_connect
    source_ref: "cl_parse.c:<skin-load site>"
  # ... approx 40-60 entries; author fills by grepping cvar sinks ...
```

Expected ~40-60 entries. Author during Task 1 by:
1. Querying `knowledge.db` for cvars whose `help_desc` or `help_remarks` mention "image", "skin", "file", "path", "charset", "texture", "wad".
2. Cross-checking each candidate against its source site to confirm the cvar's value is consumed as a filename.

### Done signal

Four YAML files exist, pass YAML-parser validation, and every `cvar:` / `category:` reference resolves against existing knowledge.db entities. One commit.

---

## Task 2: Loader-site extractor

**Intent:** full AST inventory of file-I/O call sites across ezQuake.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-asset-loader-sites-clang.py`.
- [ ] Reuse CLANG_ARGS / CLANG_ARGS_SERVER dual-TU parse pattern.
- [ ] Walk CALL_EXPR nodes with spelling in the watchlist:
  - Generic FS: `FS_LoadFile`, `FS_FOpenFile`, `FS_OpenFile`, `COM_FOpenFile`, `COM_LoadFile`, `COM_FindFile`.
  - Texture: `GL_LoadTexture`, `GL_LoadPicImage`, `loadtextureimage`, `Draw_CachePic` (+ `_Modifier` / `_Adjust` variants — grep first).
  - Model: `Mod_ForName`, `Mod_LoadModel`.
  - Sound: `S_LoadSound`, `S_PrecacheSound`.
  - WAD: `LoadWadFile`, `W_LoadWadFile`.
- [ ] Per call, extract: function_name, source_file, source_line, source_column, enclosing_function, arg[0] text (the path expression). Classify `path_source`:
  - `literal` if arg[0] is a string literal → store as `path_literal`.
  - `cvar` if arg[0] is a `<cvar_t>.string` dereference → resolve cvar c_ident, look up canonical_id.
  - `computed` if arg[0] is a `va(...)` / snprintf result / local variable → capture the nearby string format or leave path_literal null.
  - `unknown` otherwise.
- [ ] Infer `load_trigger` from `enclosing_function` name using a small rule table:
  - `*_Init`, `Host_Init`, `Sys_Init`, `CL_Init`, `R_Init`, `S_Init`, `Cvar_Init` → `startup`.
  - `CL_Connect`, `CL_ParseServerData`, `CL_ProcessServerInfo`, `CL_NewTranslation`, `CL_ParseUpdate` → `on_connect`.
  - `CL_ParseMapSetup`, `R_NewMap`, `Mod_LoadBrushModel`, `GL_BuildLightmaps` → `on_map_load`.
  - Everything else → `on_demand`.
- [ ] Infer `reads_category_id` from function-name heuristics:
  - `S_*` loaders → `ezquake:asset_category:sound`.
  - `Mod_*`, `GL_LoadTexture*`, `loadtextureimage*` → `model` or `texture` based on extension hint.
  - `LoadWadFile` / `W_*` → `wad`.
  - Generic `FS_*` / `COM_*` → null (unclassified); consumer joins on `path_literal` extension or falls back to `other`.
- [ ] Mark `dev_only = 1` if `enclosing_function` matches `Dev_*`, `Debug_*`, `*_Debug_f`, `dev_*`, or appears inside a `#ifdef DEBUG*` block that the default TU would have preprocessed out. (Check by re-parsing without the `-DPARANOID` etc. flags and comparing visibility.)
- [ ] Confidence assignment:
  - `certain` if path_source is `literal` AND reads_category_id is resolved.
  - `heuristic` if any value is inferred from function-name rules.
  - `unclassified` if we could not determine category or trigger.
- [ ] `canonical_id` shape: `ezquake:loader_site:<fn>_<source_file_basename>_<source_line>`. Deterministic, reproducible. Collisions are structurally impossible.
- [ ] Output JSON: `packages/qw-config/src/data/ezquake-asset-loader-sites-ast.json`.
- [ ] Stats reported: total sites, by function, by confidence, by load_trigger, dev_only count.
- [ ] **Verify:** expected 80-200 rows. Spot-check 5 entries from different loaders. Each `certain` row should have a plausible `path_literal` and a category the reader would agree with.

**Done signal:** JSON produced, ≥70% of rows classified as `certain` or `heuristic` (≤30% `unclassified`), spot-checks sensible. One commit.

---

## Task 3: Cvar-binding auto-validation extractor

**Intent:** validate the hand-seed against the AST; surface drift.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-asset-cvar-bindings-clang.py`.
- [ ] For each `<cvar_name>.string` MEMBER_REF_EXPR dereference in the source, check whether its enclosing statement (same compound-statement scope) contains a call to any loader-site function name from Task 2.
- [ ] If yes, emit an auto-binding row with:
  - `cvar_canonical_id = ezquake:cvar:<name>`
  - `category_id`: inferred from the loader function's category heuristic, or `null` if ambiguous.
  - `load_trigger`: inferred from enclosing function (same rule table as Task 2).
  - `confidence = 'auto'` initially.
  - `source_ref = <file>:<line>` of the .string dereference.
  - `path_pattern = null` (auto-pass doesn't infer templates; seed does).
- [ ] Output JSON: `packages/qw-config/src/data/ezquake-asset-cvar-bindings-ast.json`.
- [ ] Loader merge logic (Task 5) reconciles with the seed:
  - Seed row + auto row present for same (cvar, category) → loader keeps seed, upgrades to `confidence='auto_confirms_seed'`.
  - Seed row but no auto row → loader keeps seed, logs "not corroborated by AST; possible cross-function flow or stale seed".
  - Auto row but no seed row → loader writes with `confidence='auto_orphan'`, warns "consider adding to seed or verify false positive".
- [ ] **Verify:** for 5 known cvars in the seed (e.g. `crosshairimage`, `r_skyname`, `cl_teamskin`), confirm the auto-pass either confirms them (`auto_confirms_seed`) or produces a clear `auto_orphan`/missing warning. No silent disagreements.

**Done signal:** auto JSON produced. Reconciliation against seed is logged on every load. Commit.

---

## Task 4: Path-rules verifier

**Intent:** keep Task 1c's hand-seeded rules honest against source drift.

- [ ] Create `packages/qw-config/scripts/extract-ezquake-asset-path-rules-verify.py`.
- [ ] Input: `packages/qw-config/seeds/ezquake-asset-path-rules.yaml`.
- [ ] For each rule with a `source_ref` like `fs.c:412`:
  - Open `fs.c`, read lines `[412-5, 412+20]`.
  - Extract the enclosing function name via libclang (same visitor pattern as other extractors).
  - Compute a fingerprint of the enclosing function's AST (function name + arg list + broad body shape).
  - Record `source_verified = 1` if the function exists and fingerprint is non-empty; `0` if the file/line is out of bounds or the enclosing function is gone.
- [ ] Output JSON: `packages/qw-config/src/data/ezquake-asset-path-rules-verified.json` — the seed rules augmented with `source_verified` + `verified_function_fingerprint` fields.
- [ ] **Verify:** all ≥10 seed rules produce `source_verified = 1` on head. If any come back 0, fix the seed before proceeding.

**Done signal:** verified JSON exists; all rules pass verification against head. Commit.

---

## Task 5: Schema migration v2 → v3

- [ ] Update `apps/qw-oracle/scripts/load-knowledge/schema.ts`:
  - `SCHEMA_VERSION = 3`.
  - Add `asset_category` to the v3 `entities.type` CHECK.
  - Create the 5 new tables idempotently (CREATE IF NOT EXISTS).
  - Add a `migrateV2ToV3(db)` function mirroring the v1→v2 pattern: toggle `foreign_keys = OFF` outside transaction, rebuild `entities` with the expanded CHECK, re-run table additions, update `schema_meta`.
- [ ] `bunx tsc --noEmit` passes.
- [ ] **Verify:** existing `knowledge.db` with 3832 entities upgrades cleanly. All prior rows preserved. `schema_meta.schema_version = '3'`. New tables exist empty.

**Done signal:** typecheck clean; manual migration test against live DB passes; `schema_meta.schema_version = 3`. Commit.

---

## Task 6: Loader support for 5 new payloads

- [ ] Extend `types.ts`:
  - `AssetCategoryEntry`, `AssetCategoryVersionRow`.
  - `AssetExtensionRow`, `AssetPathRuleRow`, `AssetCvarBindingRow`, `AssetLoaderSiteRow` (plain rows — not per-type entities).
- [ ] Add per-type upsert helpers in `natural-keys.ts`:
  - `upsertAssetCategoryVersion` (entity-style, mirrors existing per-type upserts).
  - `upsertAssetExtension`, `upsertAssetPathRule`, `upsertAssetCvarBinding`, `upsertAssetLoaderSite` (relation-row style; natural keys defined per table).
- [ ] Create per-type adapter module `apps/qw-oracle/scripts/load-knowledge/load-asset-categories.ts` for the categories entity (mirrors `load-cvars.ts` etc.).
- [ ] Create a single `apps/qw-oracle/scripts/load-knowledge/load-assets.ts` module that ingests the four non-entity tables (extensions, path_rules, cvar_bindings, loader_sites). Payload shape: a JSON blob with four keys (`extensions`, `path_rules`, `cvar_bindings`, `loader_sites`) each containing an array of rows. This module is a peer of the adapter pattern — registered outside `ADAPTERS` since it isn't an entity type.
- [ ] Extend the CLI in `index.ts`:
  - Keep `load-version --type asset_category` for the categories entity (goes through the normal adapter dispatch).
  - Add a new subcommand `load-assets --project <p> --version <v> --json <path-or-dir> --commit <sha> --ordinal <n>` that loads the four non-entity tables from an "asset bundle" JSON.
- [ ] The asset-bundle JSON is built by a small orchestrator step that merges seed YAMLs + extracted JSONs into one payload. This lives at `apps/qw-oracle/scripts/load-knowledge/build-asset-bundle.ts`. Reads:
  - Categories + extensions + path-rules-verified + cvar-bindings-seed (YAMLs).
  - Loader-sites AST + cvar-bindings AST (JSONs).
  - Reconciles cvar-bindings seed vs AST per Task 3's merge rules.
  - Writes `packages/qw-config/src/data/ezquake-asset-bundle.json`.
- [ ] `bunx tsc --noEmit` passes.
- [ ] **Verify:** cvar pipeline regression-test (re-load existing cvars, confirm 2901 unchanged). Then load the asset bundle dry-run (small --limit flag or staged test DB) and confirm writes land.

**Done signal:** typecheck clean; regression pass on existing pipelines; new `load-assets` CLI wired. Commit.

---

## Task 7: End-to-end run + verification

- [ ] Run each new extractor against ezQuake head.
- [ ] Run `build-asset-bundle` to produce the merged bundle JSON.
- [ ] Load via:
  ```bash
  npm run load-knowledge -- load-version --project ezquake --version head \
      --type asset_category --json .../ezquake-asset-bundle.json ...
  npm run load-knowledge -- load-assets --project ezquake --version head \
      --json .../ezquake-asset-bundle.json --commit <sha> --ordinal 2
  ```
- [ ] Verify per-table counts:
  ```sql
  SELECT 'asset_category entities',  COUNT(*) FROM entities WHERE type='asset_category';
  SELECT 'asset_category versions',  COUNT(*) FROM asset_category_versions;
  SELECT 'asset_extensions',         COUNT(*) FROM asset_extensions;
  SELECT 'asset_path_rules',         COUNT(*) FROM asset_path_rules;
  SELECT 'asset_cvar_bindings',      COUNT(*) FROM asset_cvar_bindings;
  SELECT 'asset_loader_sites',       COUNT(*) FROM asset_loader_sites;
  ```
  Expected rough shapes (not load-blocking until final tuning):
  - asset_category: ~17
  - asset_extensions: ~25
  - asset_path_rules: ~10-15, all with `source_verified = 1`
  - asset_cvar_bindings: ~40-60, ≥80% `confidence='seed'` or `'auto_confirms_seed'`
  - asset_loader_sites: 80-200, ≥70% `confidence='certain'` or `'heuristic'`
- [ ] Spot-check queries (added to `e2e-verify.md`):
  - "Which cvars bind to the skin category?" → returns `cl_teamskin`, `cl_enemyskin`, etc. with their path patterns.
  - "Which loader sites read sounds at startup?" → returns `S_LoadSound` / `S_PrecacheSound` rows with `load_trigger='startup'`.
  - "What are the search-path rules in precedence order?" → returns path rules sorted by (rule_kind, ordinal).
  - "Does r_skyname resolve to a path template?" → returns the seeded binding with `path_pattern='env/{value}_{face}.tga'`.
- [ ] Update `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` with the Phase 2c.6 section: load commands, per-table counts, spot-check queries, data-quality signals (auto_orphan count, unclassified loader-site count, path-rule verification summary).

**Done signal:** all 5 new tables populated, spot-checks pass, e2e-verify.md extended. Commit. Push main.

---

## Commit plan

- Task 1 → `feat(qw-config): Phase 2c.6 seed YAMLs for asset taxonomy + bindings`
- Task 2 → `feat(qw-config): libclang extractor for ezQuake asset loader sites`
- Task 3 → `feat(qw-config): AST validator for ezQuake asset cvar bindings`
- Task 4 → `feat(qw-config): seed-rule verifier for ezQuake path rules`
- Task 5 → `feat(qw-oracle): schema v3 — 5 new tables for asset consumption model`
- Task 6 → `feat(qw-oracle): loader support for asset categories + asset-bundle ingestion`
- Task 7 → `feat(qw-oracle): Phase 2c.6 e2e — ezQuake asset consumption model loaded`

Push at the end of Task 7. Drain HANDOVER's "Quake-dir browser vision + oracle prerequisite" item when the slipgate dir-browser spec is ready to unblock (separate session).

---

## Risks and mitigations

- **Path rules are wrong on first write.** Mitigation: Task 4 verifier runs on every load. Task 1c explicitly marks "confirm during authoring" fields — author must resolve them by reading source before committing the seed.
- **Auto-binding pass produces too many `auto_orphan` rows.** Mitigation: each orphan is logged per load. If the count is >20% of seed size, pause and decide: expand the seed, tighten the auto-pass heuristic, or accept orphans as signal for a future pass.
- **Loader-site count is much higher than estimated.** Not a risk to the plan — just means the table is bigger than guessed. Confidence distribution is what matters for quality.
- **Cvar-binding seed's cvar references are stale or wrong.** Mitigation: loader validates every `cvar:` reference in the seed resolves against `entities`. Stale names fail the load (loud, not silent).
- **Dev-only detection heuristic misclassifies.** Worst case, a real loader gets `dev_only = 1` and is hidden from the default consumer view. Consumer can always include dev_only rows. Low severity; the column is metadata not data loss.

---

## Scope reminder

Phase 2c.6 scope is **ezQuake consumer-side only**. Nothing about MVDSV server, KTX server-mod, FTE engine, or mod-producer inventory (TF/CTF asset shipping lists). Those phases get their own specs and plans. The schema shape here is deliberately project-keyed (`project='ezquake'` on every relation row) so future phases add rows with their own project tag without schema changes.
