---
Doc type: current - Frame-setting design. Defines Layer 1's identity model (source-derived + artifact-derived tracks). Reframes the 2026-04-21 asset-reference-resolution-graph spec: that spec stays alive for its in-pass Capabilities A + D (source extraction); its Capabilities B + C (artifact parsers) move into this spec's roadmap.
---

# Layer 1 Identity Model - Source Facts + Artifact Facts Under One Roof

**Date:** 2026-04-21
**Status:** Frame-setting spec. Captures the identity-model reframe that surfaced on 2026-04-21 while scoping the prior day's reference-graph work. Establishes where future artifact-parser work (BSP, progs.dat, pak/pk3, WAD, MDL/SPR) slots in, while leaving the in-flight ezQuake source-extraction pass on unchanged ground.
**Scope:** qw-oracle Layer 1 identity model + roadmap for artifact-derived facts. Consumed by every future Layer 1 extraction decision.
**Phase:** Concurrent with the in-flight ezQuake source pass. Does not change v6 schema; shapes how v7+ additions slot in.

## Related docs

- `2026-04-21-asset-reference-resolution-graph-design.md` - prior spec. Narrows under this one: its in-pass Capabilities A (parameterized paths) + D (reserved subdirs) stay authoritative for the current pass; its Capabilities B (BSP parser) + C (progs.dat parser) move into this spec's roadmap.
- `2026-04-19-ezquake-asset-consumption-extraction-design.md` - schema baseline for asset_* tables.
- `2026-04-18-qw-knowledge-extraction-schema.md` - schema v1 baseline.
- `2026-04-21-qw-knowledge-schema-v6-source-overrides.md` - current schema version.
- HANDOVER.md entries: "ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory" (concrete bundle fixes) and "Asset reference-resolution graph - research foundation" (prior reframe).

## Motivation

A 2026-04-21 slipgate inventory of a real 14,859-file ezQuake install surfaced classification gaps. The first pass at addressing them (the reference-graph spec) reframed "what category is this file" into "who references this file." That reframe is correct but insufficient: it addresses gaps inside the current identity model without questioning the model itself.

The second reframe, captured here, is that Layer 1's current identity model only covers **source-derived facts** - what the engine's C source says about cvars, commands, loader sites, and so on, keyed by project + version tag. That model is structurally unable to represent **artifact-derived facts** - what a specific .bsp contains internally, what a specific progs.dat precaches at runtime, what a specific pak ships. Both kinds are authoritative; both carry provenance; both answer questions users and downstream apps have. They are the same species of Layer 1 fact with different identity rules.

Settling that now - before the next round of discovery ("oh, maps should be here too," "paks should be here too") forces a retrofit under pressure - is the point of this spec. Nothing in v6 changes. The frame establishes where future additions land cleanly.

## The identity model

Layer 1 has two identity tracks. Both are Layer 1. Both are authoritative. They differ only in how an entity is keyed.

### Track 1 - source-derived facts

**What:** Facts extracted from source code or hand-authored taxonomy seeds.
**Examples:** cvars, commands, macros, hud elements, rulesets, flag_bits, asset_categories, loader sites, reserved subdirs.
**Key:** `(project, entity_type, natural_key, version_ordinal)`.
**Why version-keyed:** the same cvar can change default, semantics, or existence between engine tags. Version is part of identity.
**Populated by:** libclang extractors against source repos (ezQuake today; FTE / MVDSV / KTX in roadmap) + hand-authored seed YAMLs in `packages/qw-config/seeds/`.
**Current state:** this is the entire v6 schema. Fully operational.

### Track 2 - artifact-derived facts

**What:** Facts extracted by parsing authoritative binary or packaged artifacts.
**Examples:** BSP internal texture lists, BSP entity lists, progs.dat precache lists, pak / pk3 manifest contents, WAD lump listings, MDL and SPR internal textures.
**Key:** `(artifact_type, content_hash)`. Content hash over the raw bytes is the primary identity.
**Why hash-keyed:** a .bsp's contents don't change with an ezQuake release. `dm3.bsp` is what it is; multiple engines load the same bytes and get the same internal texture list. Engine tag is irrelevant to the artifact's identity.
**Secondary identity:** common names ("dm3", "schloss"), provenance records ("shipped in nquake pak0", "in tournament pool 2024 S1"), and version labels for multi-revision artifacts ("dm3 original", "dm3 fixed rune"). These are **not** primary keys - two files with identical bytes are the same artifact regardless of what anyone calls them.
**Populated by:** artifact parsers (BSP, progs.dat, pak, WAD, MDL, SPR), each a separate extractor stage.
**Current state:** not yet extracted. Fully roadmapped below.

### Why both belong under Layer 1

Layer 1 is defined by **authoritative, mechanically-extractable facts**. Both tracks satisfy that:

- Source-derived facts are extracted from source code; citations point to file + line + commit.
- Artifact-derived facts are extracted from binary files; citations point to artifact hash + structural reference.

Neither requires human judgment or community consensus. That's what distinguishes Layer 1 from Layer 2 (community chat corpus, requires summarization) and Layer 3 (curated concept notes, authored by humans).

A file-on-disk resolution query joins across both tracks. Asking "what is `textures/schloss/wall.tga`" answers from source-track data ("ezQuake loads `textures/<mapname>/*.tga` via parameterized extraction, firing on map load") **and** artifact-track data ("schloss.bsp's internal texture list references `wall`"). Neither track alone is complete. Both together answer exhaustively.

### Schema shape (no migration today)

Nothing in v6 changes. The identity model establishes where future tables live, not what gets added now.

When artifact parsers eventually land, expect a new schema layer mirroring the source-derived shape:

- `artifacts` - primary table, keyed by `(artifact_type, content_hash)`. Carries type, hash, size, optional common_name.
- `artifact_<type>_content` tables - per-artifact-type content. E.g. `artifact_bsp_textures`, `artifact_bsp_entities`, `artifact_progs_precaches`, `artifact_pak_manifest_entries`, `artifact_wad_lumps`, `artifact_mdl_textures`, `artifact_spr_frames`.
- `artifact_provenance` - many-to-many linkage to named collections (nquake pak inventory, tournament map pool, known map packs, canonical .loc sets).
- `artifact_versions` - optional, for multi-revision artifacts with known lineage (e.g. "dm3 original -> dm3 fixed rune").

The reference graph proposed in the prior spec (`asset_consumers`, `asset_companions`) sits over both tracks. A consumer edge can target a source-derived entity (a loader site, a cvar binding) or an artifact-derived entity (a specific bsp's internal texture name).

Table-level design is for the implementation plan, not this spec. The **shape** is the commitment here.

## What's in the current ezQuake source pass

Three extraction-coverage tasks that are pure source work. They happen regardless of when artifact extraction starts and they do not touch schema.

### Path 1 - Parameterized-path extraction

Teach the libclang walker to capture `sprintf` / `va` / `snprintf` / concat-style arguments to loader calls. Emit format template + parameter sources + locked-in extension + caller context.

Unlocks: `.lit`, `.ent`, per-map texture subdirs, skybox face sets, precache-keyed models and sounds - the whole class of engine behavior invisible to literal-path extraction.

Detail-level extractor design: prior spec, "Capability A."

### Path 2 - Reserved-subdirs catalog

Derived table surfacing fixed-literal subdir prefixes the engine unconditionally uses (`textures/charsets/`, `textures/wad/`, `textures/particles/`, `textures/scoreboard/`, and others). Lets downstream consumers disambiguate "engine reserves this" from "per-map or community directory."

Detail-level design: prior spec, "Capability D."

### Path 3 - Asset-bundle coverage fill

Close the concrete gaps the real-world inventory surfaced:

- `.png` + `.jpg` path_hint variants matching the `.tga` coverage (~6 rules each).
- Nine loader families still missing: `.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.kmap`, `.spr`, `.qwz`, `.dll`.

Mechanism overlaps with Path 1 - most of these loaders are reachable by the same extractor walk. Likely folds into Path 1's implementation rather than standing alone.

Detail: HANDOVER.md "ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory."

### What these three do not touch

- No schema migration. All three emit into existing asset_* tables.
- No artifact parsing. BSP / progs / pak / WAD / MDL stay in the roadmap.
- No multi-engine work. FTE / MVDSV / KTX ports proceed on their own track and inherit these extractors.

## Roadmap (artifact-derived, not started)

Each entry below is a **slot**, not a scheduled task. Order is suggestive, not committed. Nothing here is being implemented now.

**Note on existing QW-community parsers.** Several of the formats below already have working parsers in the QW ecosystem (vikpe's `quake` crate in `research/repos/slipgate/rust/crates/quake/` covers BSP V29 + BSP2, QWD / MVD / DEM demo formats, and the QW + NQ wire protocol). Those parsers were not written with Layer 1 extraction in mind, so fit has to be evaluated per-slot: some may be directly reusable (JSON-emitting CLI, or dependency on the crate), some may only serve as existence proof that the format is tractable. The roadmap entries below note where existing parsers are known to exist; reuse decisions belong in the implementation plan, not here.

### BSP internal-content extraction

Binary-format parser over Quake BSP (and later BSP2, Q2 BSP for FTE coverage). Emits per-bsp internal texture-name list, entity list (spawn points, location markers, trigger targets, `worldspawn` fields including wad references), lightmap metadata.

Artifacts: `.bsp` files from known map pools, custom maps, shipped paks.
Output tables: `artifact_bsp_textures`, `artifact_bsp_entities`.
Why it's here: closes per-map texture resolution. With this table plus Path 1's parameterized extraction, `textures/schloss/wall.tga` resolves as "schloss.bsp internal reference" deterministically. Without it, the reference is only a pattern match with no concrete target.

Cross-engine: one parser serves ezQuake + FTE + MVDSV + KTX. Extended formats (BSP2, Q2 BSP) add incrementally.

Existing parser: vikpe's `quake::bsp` module (V29 + BSP2, entities as key-value maps, textures with embedded mipmap data). Evaluate reuse at plan time.

Detail-level sketch: prior spec, "Capability B."

### QuakeC progs.dat precache extraction

Bytecode parser over `progs.dat` (client-side), `qwprogs.dat` / `spprogs.dat` (server-side), and mod progs. Emits `precache_model`, `precache_sound`, `precache_file` string arguments as runtime-loaded asset expectations.

Artifacts: progs.dat files bundled with ezQuake tags, KTX tags, CA mod, CTF mod, custom mods.
Output tables: `artifact_progs_precaches`.
Why it's here: server and mod progs precache a large asset set that is invisible to C-source extraction. Without it, `progs/g_light.mdl` looks like an orphan; with it, it's "precached by KTX server progs."

**Partial substitute via demo parsing.** When a server starts a match, it transmits a full precache list to the client in the opening signon messages. That list appears in every MVD / QWD / DEM file. Parsing demos recovers precache sets as *observed* facts per match, which captures dynamic precaches that static bytecode analysis would miss. Demo parsing is already solved in vikpe's `quake::demo` module + `demo_parser` crate. Full QuakeC bytecode extraction is a separate, more involved capability; the demo route may answer enough questions to deprioritize it.

Detail-level sketch: prior spec, "Capability C."

### Pak / PK3 manifest extraction

Manifest parser over `.pak` (id1 pak format) and `.pk3` (zip-based). Emits per-pak file listing with content hashes.

Artifacts: id1/pak0.pak, qw/pak0.pak, nquake distribution paks, ezquake.pk3, community bundle paks.
Output tables: `artifact_pak_manifest_entries` + `artifact_provenance` linkage.
Why it's here: answers "is this file stock Quake" / "did it ship with nquake" / "was it user-added." Provenance for every asset in a canonical distribution becomes a JOIN away.

### WAD lump listing

WAD format parser. Emits per-wad lump name + lump type listing.

Artifacts: `gfx.wad`, map-bundled WADs, texture WADs.
Output tables: `artifact_wad_lumps`.
Why it's here: some HUD and texture references resolve to WAD lumps, not files. Closing this loop classifies a set of otherwise-unreferenceable names.

### MDL / SPR internal texture extraction

Binary parser over Quake MDL (models) and SPR (sprites) formats. Emits internal texture-name / frame listing per artifact.

Artifacts: `.mdl` and `.spr` files from progs/, player/, stock paks, custom models.
Output tables: `artifact_mdl_textures`, `artifact_spr_frames`.
Why it's here: some models ship with embedded textures, some reference external ones. Extracting the internal list disambiguates which.

### Community artifact corpora

Not parsers - curated reference data keyed by content-hash, providing provenance and naming for artifacts that have no code-derived identity.

Corpora to capture:

- **Canonical map pool** - every tournament map with authoritative hash + common name + author + release year.
- **Canonical .loc set** - community-maintained location files (e.g. the commonly-shipped tp location packs) by content-hash.
- **Shipped-pak inventories** - hash lists for canonical QW distributions (id1 retail, nquake 2011, nquake 2020, ezQuake bundles, QRack pack, and similar).
- **Known custom-map packs** - schloss, phantombase, and so on, each with hash + author + bundle list.

Each corpus is a hand-curated YAML or JSON (likely under `packages/qw-knowledge/`) that loads into `artifact_provenance`. These entries are NOT extracted from code; they are authored and versioned like the current seed taxonomies.

### Cross-cutting - FTE / MVDSV / KTX source ports

Each new engine's loader-site + parameterized-path + (eventually) progs extraction reuses the same patterns. Unknown-engine residual shrinks with each port. Ordering lives in the existing Phase 2d-2h roadmap; not reopened here.

## What this frame explicitly does NOT commit to

- **No schema migration today.** v6 stands. v7+ shape is implied but not designed in detail.
- **No artifact-parser code today.** All artifact-derived work is roadmapped; none is scheduled.
- **No Layer 1 claim over community-subjective facts.** Rankings, quality judgments, "which map is better" - those stay Layer 3. Layer 1's artifact track extracts mechanical facts only.
- **No slipgate work.** Slipgate continues consuming the current bundle shape. Vocabulary shift to consumer-reference language happens after the graph ships; that's the prior spec's scope.
- **No lock-in on artifact-type table layout.** `artifact_bsp_textures` vs. a single polymorphic `artifact_content` table is an implementation-plan decision. This spec commits to hash-keyed primary identity; details ride on that.

## Open questions for later

- **Artifact without canonical source.** A custom map from 2003 has a content-hash and extractable internal facts but thin provenance ("it exists, these communities used it"). First-class Layer 1 entity, or "known-artifacts" side table? Leaning first-class: the facts are still mechanically extracted and authoritative; provenance is just thinner.
- **Search-path-order resolution.** Same relative path can resolve to different physical files depending on `id1/` vs `qw/` vs `<gamedir>/` vs `~/.ezquake/` precedence. Is the resolver a query layer over the graph, or does the graph encode search-path order itself? Leaning query layer: search-path order is client-side state, not a Layer 1 fact.
- **Artifact versioning.** When is "dm3 fixed rune" a separate entity from "dm3 original," vs. the same entity with two hashes? Proposal: always separate entities (each keyed by its own hash), optionally linked by a `same_map_lineage` relationship. Keeps identity rules clean.
- **Performance over large artifact sets.** A file-resolution query across thousands of BSPs + thousands of user files needs index design. Out of scope here; implementation-plan concern.
- **Layer 2 / Layer 3 linkage.** When a community chat discussion references a specific map by name, should Layer 2 link resolve through Layer 3 naming to Layer 1 artifacts? Probably yes, but the edge type isn't nailed down.

## Relationship to the 2026-04-21 reference-graph spec

That spec remains alive and authoritative for its in-pass Capabilities A + D (the source-extraction paths above). Its Capabilities B (BSP) and C (progs.dat) are reframed by this spec: they stay technically accurate but execute under the artifact-identity model described here, not as one-off additions to the current extractor.

The reference-graph spec's schema sketches for `asset_companions`, `asset_consumers`, and `reserved_shared_subdirs` remain correct for the source side. The artifact side adds the `artifacts` / `artifact_*_content` / `artifact_provenance` layer described here and joins into the consumer graph.

A header pointer will be added to the reference-graph spec directing readers here for the larger frame.

## Succession

This spec is superseded when an implementation plan exists that:

1. Executes the three in-pass paths (parameterized extraction, reserved subdirs, coverage fill).
2. Schedules artifact-parser work with concrete schema migrations (v7+).

Until then, this spec is the frame. Archive - do not delete - once superseded: the reasoning behind "source + artifact under one Layer 1" is reusable every time a new data source (demo files, match records, player profiles) is evaluated for Layer 1 admission.
