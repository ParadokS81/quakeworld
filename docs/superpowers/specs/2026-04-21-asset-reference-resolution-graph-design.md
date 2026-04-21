---
Doc type: current - Research-and-design foundation. Partially superseded: Capabilities A + D remain authoritative (in-pass source extraction); Capabilities B + C are reframed by `2026-04-21-layer1-identity-model-design.md` and execute under that spec's artifact-identity model.
---

# Asset Reference-Resolution Graph - Research & Design Foundation

> **Read this first:** `2026-04-21-layer1-identity-model-design.md` puts this spec's work inside a larger frame (source-derived + artifact-derived facts as two identity tracks under one Layer 1). This spec's Capabilities A (parameterized paths) + D (reserved subdirs) stay authoritative for the current ezQuake source-extraction pass. Its Capabilities B (BSP parser) + C (progs.dat parser) are roadmapped under the identity-model spec as artifact-parser work, not as one-off extractor additions.

**Date:** 2026-04-21
**Status:** Research foundation. Captures a design conversation between ParadokS and Claude that reframed how slipgate should classify files. Precondition for a future oracle-side extraction implementation plan. See header note above for the larger identity-model frame that subsumes this spec's artifact-side capabilities.
**Scope:** qw-oracle extraction pipeline (Layer 1 additions) + `ezquake-asset-bundle.json` schema additions + slipgate scanner vocabulary shift. Multi-client by design (ezQuake today; FTE / MVDSV / KTX as each is mapped).
**Phase:** Post-Phase-2f. Not blocking the current historical-backfill work. Foundation for later phases once Batch 3 architectural fixes ship.

## Related docs

- `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md` - the first asset-extraction spec. Introduces `asset_categories`, `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`. **This doc extends that model, it does not replace it.**
- `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` - schema v1 baseline.
- `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md` - most recent schema iteration.
- `apps/slipgate-app/docs/superpowers/plans/2026-04-20-quake-dir-browser-v1.md` - the slipgate consumer whose real-world usage surfaced the gaps this doc addresses.
- HANDOVER.md entry "ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory" - the concrete bundle-regeneration gaps (client_defaults wipe + png/jpg path_hint coverage + 9 missing loader families) that prompted this deeper reframe.

## Motivation

On 2026-04-21 a real-world inventory of a 14,859-file ezQuake install was dumped from slipgate's Browse mode (see `apps/slipgate-app/src-tauri/src/commands/inventory_report.rs`). The dump surfaced three categories of finding:

1. **Concrete bundle regeneration gaps** - captured in the HANDOVER entry; mechanical fixes.
2. **Extractor pattern gaps** - the current extractor finds concrete string-literal loader arguments but misses parameterized paths like `maps/%s.lit`. This class is what motivates `asset_companions` (new schema section) and a second extraction pattern.
3. **A deeper framing shift** - when you look at a real install, the right question is no longer "what category is this file?" It is "who consumes this file, if anyone?" Classification by category is lossy and ambiguous (see the `textures/particles/` collision case vikpe surfaced); classification by consumer-reference is deterministic once the graph is complete.

This doc captures the reasoning behind the reframe, the extractor capabilities it implies, and the residual-unresolvables it leaves behind. It is a foundation for a future implementation plan, not the plan itself.

## The conceptual shift

### What we were doing

The current bundle says, for each file, "this is a texture" or "this is a screenshot" or "unclassified." The scanner picks the best category from a pile of extension rules + path_hints + client-default overrides. Files that don't match any rule land in an "Other" bucket.

This framing has two structural problems exposed by the real inventory:

**Problem 1 - Category is ambiguous when namespaces collide.** A `.png` in `qw/gfx/conback.png` could legitimately be a hud_overlay (engine loads `gfx/conback.*` as a hud asset). A `.png` in `qw/sshots/ezquake0042.png` is a screenshot. A `.png` in `qw/textures/wall.png` is a map texture. Same extension, different categories, determined by path. The current bundle's `.png` rule has only one path_hint (`textures/`) and defaults to screenshot, so the first and third cases mis-classify. Band-aiding by adding more path_hints works until you hit a real collision (vikpe's example: a map named `particles` would share a namespace with the engine's particle-system reserved subdir `textures/particles/`).

**Problem 2 - Quake's asset namespace was never designed.** QuakeWorld's file layout accreted over two decades. Original id Quake (1996) had `id1/` with paks, period. Every convention layered on afterward solved its own problem in its own way:

- `textures/` added for external texture support (community feature, mid-late 90s)
- `.lit` for colored lighting (community format, Q2 origin, backported)
- `.loc` for team-reporting locations (pure community invention, no engine-forced path)
- `textures/charsets/`, `textures/scoreboard/`, `textures/wad/` - ezQuake-specific HUD customization, each subdir added independently
- `mapshots/` for map previews - community convention
- Per-map texture subdirs `textures/<mapname>/` - came with external texture support

There was no namespace-design meeting. Collisions like "a map named `particles` vs the reserved `textures/particles/` subdir" are the inevitable result of a namespace grown one feature at a time. The engine doesn't care - it does path lookups, not namespace arbitration. Humans care, but the engine provides them no protection.

### What we should do instead

Stop asking "what category is this file." Start asking "who, if anyone, references this file?"

The engine source encodes a reference graph. For every file a user has on disk, one of these is true:

- **Referenced by a known consumer.** Some loader site, cvar binding, bsp internal texture list, progs precache list, entity reference, or config value in the graph resolves to this file's path. The consumer is the "category" in a deeper sense - it explains what the file IS by explaining who needs it.
- **Pattern-match unresolved.** The file's path matches a parameterized-path loader template (e.g. `textures/<mapname>/<texname>.<ext>`), but the specific consumer isn't in your install (e.g. no bsp with that name exists). Classification: "candidate asset for a consumer you don't have."
- **Orphan of known shape.** File is asset-shaped (correct extension, plausible path) but no consumer in any mapped engine references it. Classification: "orphan asset, probably user-dropped or leftover from a previous install."
- **Not asset-shaped.** User-workflow files (`.bat`, `.ahk`, `.tmp`, `.lst`), logs, scripts. Not engine-consumed at all.
- **Consumed by an engine we haven't mapped.** FTE plugin `.dll`, bot waypoint `.way` files, darkplaces-specific shader files. These are unknown today but deterministically knowable - they collapse into the "referenced by a known consumer" bucket as each engine's source gets mapped.

Under this model, "fuzzy classification" is replaced with a small, well-defined set of resolution states. The scanner no longer guesses - it joins.

## What Layer 1 extraction needs to add

The current extractor (per `2026-04-19-ezquake-asset-consumption-extraction-design.md`) finds string-literal loader arguments. Three new extraction capabilities are needed:

### Capability A: Parameterized-path loader sites

**What:** Record loader calls whose path argument is a `sprintf`/`va`/concatenation, not a string literal. Capture the format template, the parameter source, the locked-in extension, and the caller context.

**Example:** `FS_LoadFile(va("maps/%s.lit", cl.worldmodel->name))` produces a loader-site record with:

```
template: "maps/%s.lit"
parameter_sources: [{slot: 0, expression: "cl.worldmodel->name", semantic: "current_map_name"}]
extension: ".lit"
enclosing_function: "Mod_LoadLighting"
fires_when: "a bsp is loaded"
```

**Why it matters:** This single pattern unlocks a large class of engine behavior invisible to literal-path extraction:

| Template | Relation it reveals |
|---|---|
| `maps/%s.bsp` | map-name primary asset |
| `maps/%s.lit` | `.bsp` companion (colored lighting) |
| `maps/%s.ent` | `.bsp` companion (entity overrides) |
| `skins/%s.pcx` | cvar-keyed skin (already captured via cvar_bindings; parameterized form is the fallback path) |
| `textures/%s/*.tga` | per-map texture subdir |
| `env/%s_%s.tga` | skybox face set keyed to skybox name |
| `progs/%s.mdl` | precache-name-keyed model |
| `sound/%s` | generic sound by precache name |

**Implementation sketch:** libclang traversal of loader-site call expressions. When the argument is a call to `va` / `sprintf` / `snprintf` / `Q_snprintfz` / `strcat` / similar, unwrap the format string and record parameter provenance. The existing "find calls to FS_LoadFile et al." walker extends naturally.

### Capability B: BSP internal-content extraction

**What:** A binary-format parser that walks every `.bsp` in a known map set and emits:

- Internal texture-name list (strings the map references by name; the engine resolves these against `textures/`)
- Entity list (spawn points, location markers, trigger references)
- Embedded wad / lightmap / precache metadata

**Why it matters:** Closes the loop on per-map texture resolution. With this:

- `textures/schloss/wall.tga` + `schloss.bsp` exists + `schloss.bsp` references `wall` in its texture list -> **"per-map texture, consumed by schloss"**, deterministic.
- `textures/schloss/wall.tga` + `schloss.bsp` does not exist -> **"per-map texture for a map you don't own"**, actionable (slipgate can surface "install schloss map pack" hint).
- `textures/phantombase/random.tga` + `phantombase.bsp` exists but does not reference `random` -> **"orphan texture in a per-map folder"**, actionable (cleanup candidate).

**Where it lives:** Probably a separate extractor stage from the C-source walker. BSP format is well-documented; parsing is a one-time investment that benefits every consumer. Output is a per-map reference table in `knowledge.db`.

**Multi-client note:** BSP format is engine-agnostic. One parser serves ezQuake + FTE + MVDSV + KTX. Later engines with extended BSP formats (BSP2, Q2 BSP) require additional parsers, but each adds incrementally.

### Capability C: Precache-list extraction from QuakeC `progs.dat`

**What:** Parse `progs.dat` (client-side CSQC) and `spprogs.dat` / `qwprogs.dat` (server-side progs) for `precache_model`, `precache_sound`, `precache_file` calls. Emit the string arguments as runtime-loaded asset expectations.

**Why it matters:** The server and mod progs precache an enormous asset set that's invisible to C-source extraction (it's interpreted bytecode, not C calls). Closing this loop classifies files like:

- `progs/g_light.mdl` - shows up in `spprogs.dat` precache list -> **"gameplay model, consumed by server progs"**, classified.
- `sound/misc/rescue.wav` - shows up in `qwprogs.dat` precache list -> **"gameplay sound"**, classified.

**Where it lives:** Another separate extractor stage. QuakeC progs format is documented; precache calls are identifiable opcodes. Output is a per-progs-version reference table. Engine version matters because different ezQuake tags may bundle different progs; this extraction slots naturally into the Phase 2f historical-backfill machinery.

### Capability D (already partial): Reserved-subdir catalog

**What:** When extracting loader sites, detect ones that use a fixed-literal subdir (e.g. `textures/bmodels/...`, `textures/charsets/...`, `textures/scoreboard/...`, `textures/wad/...`, `textures/particles/...`). These are "reserved" - the engine expects them to contain shared resources, not per-map content.

**Why it matters:** Disambiguates the per-map-vs-shared question for `textures/` subdirs. Cross-reference any `textures/<name>/` against the reserved set + the known map set:

- `<name>` is in reserved set -> shared resource, not per-map.
- `<name>` matches a known `<name>.bsp` -> per-map candidate, verify against bsp internal texture list.
- `<name>` matches both -> collision case, flag explicitly (engine serves the file for both uses; user intent ambiguous).
- `<name>` matches neither -> likely community resource or leftover; flag as such.

**Why "already partial":** The existing extractor already captures literal path prefixes. Elevating them into a first-class reserved-subdirs table is a small addition - a new view over existing data.

## Schema additions

Additive only. No existing v3/v4/v5/v6 tables change shape.

### `asset_companions`

Expresses "if you have file X, the engine will also look for file Y at a related path." Tiered by rigidity:

| Tier | Characteristic | Example | How rendered downstream |
|---|---|---|---|
| 1 - Rigid 1:1 | Parent + stem + fixed-other-ext | `bsp <-> lit` | Slipgate Maps card renders as a firm slot (present/missing/broken) |
| 2 - Soft per-key set | Parent + stem-as-subdir, content unspecified | `bsp <-> textures/<stem>/*` | Slipgate renders with disambiguation (reserved-subdirs list + map-set join + confidence flag) |
| 3 - Fuzzy convention | No engine loader; community practice only | `bsp <-> waypoints/<stem>.way` (if unmapped) | Slipgate renders with "community-convention, not engine-enforced" badge. Once the relevant engine is mapped, this rule promotes to tier 1 or tier 2. |

Schema sketch:

```sql
CREATE TABLE asset_companions (
  canonical_id TEXT PRIMARY KEY,  -- e.g. "ezquake:asset_companion:bsp_lit"
  anchor_category TEXT,            -- "ezquake:asset_category:map"
  companion_extension TEXT,        -- ".lit"
  companion_category TEXT,         -- "ezquake:asset_category:map_lighting" (new category, added alongside)
  relationship_kind TEXT,          -- "rigid_1to1" | "soft_per_key_set" | "fuzzy_convention"
  path_template TEXT,              -- "maps/%s.lit"
  parameter_source TEXT,           -- "anchor_basename_stem"
  loader_site_ref TEXT,            -- FK to asset_loader_sites (canonical_id)
  optional INTEGER,                -- 1 if engine falls back when absent; 0 if required
  ambiguity_note TEXT,             -- pointer to Layer 3 disambiguation note, if any
  notes TEXT
);
```

### `asset_consumers`

The reverse-lookup graph. For each file the engine can load, emit records linking path-or-pattern to consumer (loader_site, cvar_binding, bsp_content_ref, progs_precache, companion_rule). This is the join table slipgate uses to resolve "does anyone reference this file?"

Schema sketch:

```sql
CREATE TABLE asset_consumers (
  consumer_id INTEGER PRIMARY KEY,
  path_or_pattern TEXT,            -- literal or parameterized
  is_parameterized INTEGER,        -- 0 for literals, 1 for templates
  parameter_sources TEXT,          -- JSON array when parameterized
  consumer_kind TEXT,              -- "loader_site" | "cvar_binding" | "bsp_ref" | "progs_precache" | "companion"
  consumer_canonical_id TEXT,      -- FK into whichever table owns this consumer
  fires_when TEXT,                 -- "startup" | "map_load" | "connect" | "user_action" | etc.
  confidence TEXT                  -- inherited from the source loader_site / binding
);
```

For a file on disk:

```
SELECT * FROM asset_consumers WHERE <file_path matches path_or_pattern, literal or templated>;
```

returns every reason the engine might load it. Zero rows = orphan. One row = cleanly referenced. Multiple rows = multi-consumer (shared resource; the `particles` collision is this case when resolvable).

### `reserved_shared_subdirs`

A derived table surfaced from fixed-literal loader sites that target subdir prefixes. Used by slipgate (and any other consumer) for fast disambiguation.

```sql
CREATE TABLE reserved_shared_subdirs (
  canonical_id TEXT PRIMARY KEY,   -- e.g. "ezquake:reserved_subdir:textures_charsets"
  parent_dir TEXT,                 -- "textures"
  subdir_name TEXT,                -- "charsets"
  purpose TEXT,                    -- "conchar/font replacements"
  loader_site_refs TEXT            -- JSON array of source loader_sites that use this prefix
);
```

Populated by scanning extracted `asset_loader_sites` for literal path prefixes that look like `<parent>/<fixed-name>/`.

## Slipgate-side vocabulary shift

Once the graph above exists, slipgate's scanner output shape changes:

- **Before:** each `ScannedFile` carries `category_id: string | null`. Ambiguity encoded as null-or-"other".
- **After:** each `ScannedFile` carries:
  - `consumers: Consumer[]` - references that resolve to this file (possibly empty)
  - `pattern_match: ParameterizedRef | null` - matched a parameterized template whose specific consumer is not installed
  - `is_referenced: boolean` - convenience roll-up of the above
  - `category_hint: string | null` - for display/search only; derived from the dominant consumer's category

Classification UI moves from "here's what this file IS" to "here's what needs this file." The old `category_id` field stays available as a hint but stops being the primary truth.

### What this does to slipgate features

- **Browse tree:** filters by domain (Matches / Maps / Textures / Configs / ...) become "files referenced by consumers of this domain," not "files whose extension/path matches this domain." The `textures/particles/` collision case naturally splits: each file in that dir lists both consumers (map + particle system) or just one, deterministically.
- **Maps domain (future):** a map card renders slots for every tier-1 companion (bsp + lit + loc + ent), every tier-2 soft set (per-map texture dir + mapshot + per-map sound), and an "orphan content in this map's dirs" section. All driven by join queries, no hardcoded knowledge in the app.
- **Stats buckets:** the "Loaded / Available / Shipped / Other" split already in the scanner becomes redundant. Replace with "Referenced (and by whom) / Candidate (pattern-match, consumer absent) / Orphan (asset-shaped, no reference) / Non-asset / Cross-engine (referenced only by engines not installed)."

## Residual unresolvables (after everything above ships)

With parameterized-path extraction + BSP/progs parsers + reserved-subdirs catalog + multi-client bundle coverage (ezQuake, FTE, MVDSV, KTX), the fuzzy residual collapses to two clean classes:

**Class 1 - Unmapped engines / tools.** Files consumed by engines we have not yet extracted. Once every QW-ecosystem engine is mapped (even as a minimal loader-site walk), this class shrinks toward zero. The remaining long-tail is exotic one-off engines / mod tools with tiny user bases.

**Class 2 - Genuinely user-workflow.** `.bat`, `.ahk`, `.tmp`, `.lst`, personal scripts, the inventory dump itself. Not engine-consumed at all; don't need classification beyond "user workflow file." Pattern-recognizable by heuristics (user-editable text, shell scripts, tool artifacts).

Neither class is "fuzzy" in the bad sense. Each is well-defined and actionable.

## What Layer 3 (Obsidian wiki) owns under this model

Layer 3's role shifts from "resolve ambiguity" to "annotate context." Specifically:

- **Origin stories.** "`.lit` added circa 1998 for colored lighting; production tools hmap2 and ImpQ."
- **Community-practice notes.** "Map packs typically ship bsp + lit + loc; solo author releases often skip lit."
- **Collision catalogs.** "Reserved subdir names that collide with common map names (`particles`, `models`). Mappers avoid these."
- **Quality / tooling notes.** "Community lit packs differ in palette; some engines embed lighting in bsp itself in modern versions."
- **Cross-engine provenance.** "BSP2 format is FTE-specific; ezquake head supports it as of tag X. Files with BSP2 magic in `maps/` resolve to the FTE bundle's asset_companions."

None of that is mechanically extractable. All of it is context that makes a Layer-1 answer useful to humans. When slipgate or an MCP tool renders a file, it joins the mechanical answer from Layer 1/2 with the contextual annotation from Layer 3.

The cooperation pattern:
- **Layer 1** says: `wall01.tga` is in schloss's per-map texture dir and schloss.bsp references it. Consumer: `bsp_ref:schloss:wall01`.
- **Layer 2** says: this relationship is stable across ezQuake 3.0 -> head, no version drift.
- **Layer 3** says: schloss is a mid-2000s community map pack by [author]; its texture set was produced by [tool]; the conventional distribution bundle is `schloss.bsp + textures/schloss/* + schloss.lit + schloss.loc + mapshots/schloss.jpg`.

Slipgate's Maps card renders all three together.

## Implementation phasing suggestion

Not a plan - a suggestion the planner should adjust:

**Phase A - Parameterized-path loader sites (Capability A).** Extend the existing libclang walker. Emits `asset_loader_sites` with parameterized entries. Unlocks `asset_companions` tier-1 (bsp <-> lit, bsp <-> ent, skybox face set, etc.). Lowest effort, highest immediate return.

**Phase B - Reserved-subdirs catalog (Capability D).** Derived table over existing extraction output. Minimal new work. Unblocks slipgate's per-map-texture disambiguation once Phase A exists.

**Phase C - BSP internal-content extraction (Capability B).** Binary-format parser, separate from C-source walker. Benefits every engine. Closes the per-map texture resolution loop. Investment earns compounding interest.

**Phase D - QuakeC progs precache extraction (Capability C).** Bytecode parser. Classifies the long tail of runtime-precached models/sounds. Slots naturally into Phase 2f historical-backfill since different progs ship with different versions.

**Phase E - Slipgate vocabulary shift.** Consumer of the above. Refactor `ScannedFile` + Browse lens + (future) Maps domain to speak in consumer-reference terms. Not blocking any oracle work; can happen incrementally as each capability above lands.

**Cross-cutting - FTE / MVDSV / KTX port.** Each new engine's loader-site + parameterized-path + precache extraction reuses the same patterns. The engine-unknown residual shrinks with each port.

## Open questions for the eventual plan

- **Parameter-source semantics.** Capability A needs a small ontology of parameter sources (`current_map_name`, `precached_model_name`, `cvar_value:baseskin`, etc.). Does this overlap with the existing cvar-binding model, or does it need its own namespace?
- **BSP format variants.** Standard Quake BSP, BSP2, Q2 BSP, HL BSP. Which do we care about? What's the minimum viable parser for the QW ecosystem today?
- **Progs variant handling.** ezQuake uses its own embedded QuakeC; server mods (KTX) use their own progs.dat; mods (CA, CTF, etc.) ship their own. How are per-mod precache lists scoped in `knowledge.db`?
- **Schema-versioning cadence.** These additions want to bump schema version from v6 to v7. Coordination with Phase 2f and any in-flight schema changes needed.
- **Performance.** A `SELECT * FROM asset_consumers WHERE path_or_pattern matches <file>` query per file on disk, for a 15k-file install, needs an index design. Pre-compute common joins? Materialized views? Out of scope for this doc; concern for the implementation plan.

## Non-goals

- Not proposing any slipgate-side code change in this doc. Slipgate's consumer model shifts only after the oracle schema lands.
- Not proposing Layer 3 wiki authoring content. That's the oracle wiki track, downstream of this.
- Not proposing to backfill all historical ezQuake versions for the new extraction capabilities on day one. Head-first is sufficient; backfill follows Phase 2f's general machinery.

## Succession

Once an implementation plan exists that addresses Capabilities A-D and the schema additions, this doc is superseded. Archive it rather than deleting - the reasoning behind the reframe is reusable for future extraction scope decisions (e.g. when adding a new engine, the same Layer-1-vs-Layer-3 question will recur).
