# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Pretty view + StatePanel visual polish](#pretty-view--statepanel-visual-polish) — deferred visual refinement on both the state editor and the pretty-render display; user wants to iterate on the feel tomorrow
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [qw-config package missing Layer 1 quartet](#qw-config-package-missing-layer-1-quartet) — no CLAUDE.md, VISION.md, or OVERVIEW.md; only a substantial README. qw-knowledge quartet completed 2026-04-21; qw-config still pending, surface next time it's touched substantially
- [Slipgate + monorepo VISION docs need web-services family addendum](#slipgate--monorepo-vision-docs-need-web-services-family-addendum) — 2026-04-20 brainstorm surfaced assets.quake.world / maps.quake.world triad + content-hash join key + GitHub OAuth backup; none of it reflected in VISION.md files yet
- [ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory](#ezquake-asset-bundle-gaps-surfaced-by-slipgate-quake-dir-inventory) — 2026-04-21: Gap A fixed upstream (client_defaults now seed-driven). Remaining: png/jpg path_hint variants; 9 loader families missing (.log, .loc, .lit, .dat, .kmap, .xml, .spr, .qwz, .dll). Post-Batch3 task for qw-oracle session.
- [Asset reference-resolution graph — research foundation](#asset-reference-resolution-graph--research-foundation) — 2026-04-21: spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes shift from category-classification to consumer-reference graph (parameterized-path extraction + BSP/progs parsers + asset_companions schema). Foundation for a future implementation plan; precondition met by post-Batch3 oracle work.

---

## Pretty view + StatePanel visual polish

**Added:** 2026-04-17
**Updated:** 2026-04-19 — StatePanel pass landed (sprite tiers + two-column layout, see OVERVIEW.md). User wants to continue iterating on sizing / spacing / interaction polish in a new terminal focused on UI. Pretty-view visual polish still untouched.
**Verification first:** ask the user what they landed on before doing anything -- this is intentionally judgment-heavy and needs the user's eye in the loop.

The pretty view and the StatePanel both shipped in their first functional form across 2026-04-17. User has identified that both need visual refinement once real usage surfaces what the display should actually communicate:

- **StatePanel:** first denoise + sprite-first redesign landed 2026-04-18/19. Vitals tier (face+HP / GA/YA/RA), Powerups tier, Weapons tier (2+2 then 2+1+1 family grid, ammo input per family, in-sprite `EQ` chip). Two-column panel layout claims horizontal space; collapsed disclosures (Location / Match / LEDs / Events) sit in the right column with the templates header. HUD-ring sketch idea explicitly scrapped. Active iteration area: slot / cell sizing, spacing rhythm, EQ chip discoverability, potential use of `anum_*` / `num_*` / `face_p*` sprites.
- **Pretty view:** untouched this session. The readability wins are there (colors render, $vars substitute, runtime tokens label or simulate) but the typography/spacing/active-leaf affordance is an early cut. Especially the dotted-underline + hover convention for variable/runtime spans deserves a second look once the user tries it against dense teamsay configs.

Both items are creative / iterative -- not the kind of thing to grind through solo. Pair with the user next session.

### Related

- StatePanel: `apps/slipgate-app/src/components/StatePanel.tsx`
- Pretty view CSS: `apps/slipgate-app/src/app.css` (search `sg-span-`)
- Active-leaf tint: `.sg-alias-chain-entry-active` in the same CSS file

---

## Phase 2d-2h: remaining QW knowledge rollout

**Added:** 2026-04-18 (originally as "Phase 2 schema + rollout")
**Updated:** 2026-04-20 — Phase 2c (4 more ezQuake types), 2c.5 (4 more + schema v2), and 2c.6 (asset consumption + schema v3) all shipped. ezQuake is fully loaded at head across 9 entity types (3849 entities total).
**Status:** ezQuake head complete. Next terminal session priorities (reordered 2026-04-20 after dir-browser context shift):

### What shipped through Phase 2c.6

- **Schema v3** at `apps/qw-oracle/scripts/load-knowledge/schema.ts` — entities with 9 type values (cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category) plus per-type version tables and 4 asset relation tables (asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites).
- **Loader pipeline** with `load-version`, `load-assets`, `diff`, `enrich` CLIs. Seed-first + AST auto-pass reconciliation proven against ezQuake head (bea2515). Phase 2b loader follow-ups (version-string comparison, blame memoization, src-prefix map, extractor trailing-whitespace) all drained 2026-04-20.
- **Extractors** in `packages/qw-config/scripts/` for all 8 ezQuake entity types plus asset loader sites, cvar bindings, path-rules verifier. Hand-authored seed YAMLs in `packages/qw-config/seeds/` for asset taxonomy and cvar bindings.
- **End-to-end loaded**: 3849 ezQuake entities, 110 asset_loader_sites, 26 asset_cvar_bindings, 14 source-verified path_rules, 17 asset_categories.

### Remaining sub-phases (roadmap reordered 2026-04-20)

**Tier 1 — Phase 2f Historical backfill (next).** Walk every ezQuake tag, diff consecutive tags, git-blame → PR enrichment. Reuses all extractors; pure orchestration. This is what separates a head-snapshot from a knowledge base with history. Preconditions (ordinal comparison, blame memoization, src-prefix map) already landed in the Tier-0 drain on 2026-04-20.

**Tier 2 — Phase 2d FTE cvars.** First second-engine port. Biggest structural risk left — validates the project-keyed schema on a codebase with different layout (`engine/client/`, `engine/server/`, etc.). The `PROJECT_SRC_PREFIX` map in `diff-versions.ts` has an empty FTE entry signaling the extractor must emit repo-relative paths directly.

**Tier 3 — Phase 2e MVDSV + KTX.** MVDSV is a small port (189 cvars, same struct form). KTX is tree-sitter-based (use `py-tree-sitter`, NOT Node `tree-sitter@0.25` which segfaulted on WSL/Node 20 during the spike).

**Tier 4 — Phase 2g MCP tool upgrades (deprioritized).** Adds `version` parameter to `lookup_entity`, new `get_entity_history` tool, version/date filters on `search_entities`. Was higher priority before the dir-browser context shifted — dir-browser reads SQLite directly so MCP upgrades serve Oracle-bot / Claude-session users only.

**Tier 5 — Layer 3 curated content.** Concept notes adapted from ezquake.com docs and community wisdom. Orthogonal to data expansion.

**Tier 6 — Phase 2h Automation.** Scheduled job to detect new tags, run delta extraction, enrich, insert.

### Out of scope for Phase 2

- **dusty-ktx QuakeC client module (`qcsrc/`)** — different language, needs its own spike later.
- **QWFWD** — not yet cloned to `research/repos/`. Add to Phase 2e when cloned.
- **Slipgate app refactor to consume new data** — deliberately deferred by the user. Phase 2 is about building the solid data foundation first; app consumption comes after the DB is complete.
- **Layer 2 / Layer 3 Oracle work** (chat log summarization, curated concept notes) — orthogonal track, proceeds independently.

### Key references

- Spike output: `packages/qw-config/src/data/ezquake-variables-ast.json`
- Spike report: `packages/qw-config/docs/extraction-comparison-report.md`
- Oracle design spec: `docs/superpowers/specs/2026-04-14-qw-knowledge-service-design.md`
- Memory: `project_qw_oracle_vision.md` (updated 2026-04-18 to reflect spike completion)
- Memory: `reference_libclang_ezquake_extraction.md` (WSL setup + ezQuake-specific conditional macros)

### Pressure

Not blocking anything. User is proceeding at their own pace. No freeze, no deadline.

---

## qw-config package missing Layer 1 quartet

**Added:** 2026-04-18
**Status:** Pre-existing gap. Not caused by the AST spike but surfaced during wrap-up.
**Verification first:** `ls /home/paradoks/projects/quakeworld/packages/qw-config/{CLAUDE.md,VISION.md,OVERVIEW.md} 2>&1`. If all three exist, resolved.

The qw-config package has a substantial `README.md` (96 lines, reasonably thorough) but is missing the other three mandatory-quartet files: `CLAUDE.md`, `VISION.md`, `OVERVIEW.md`. Per the doc philosophy (`docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`), every project — including shared packages — has the quartet.

**Update 2026-04-21:** sibling package `qw-knowledge` received its full quartet (commits `cd8a155` + `efeeba0`). qw-config is the remaining gap.

### Fix shape

Don't sweep. When Phase 2 work lands and starts adding significantly to `qw-config` (new extractors, SQLite loader, new data format), pause to:
1. Split `CLAUDE.md` from `README.md` — rules for Claude go in `CLAUDE.md`, product description stays in `README.md`
2. Write `VISION.md` — why qw-config exists (shared engine-feature database, authoritative-source discipline, consumer-agnostic)
3. Write `OVERVIEW.md` — the living map: all extractors, all data files, all consumers, with lifecycle status

The README already contains most of the OVERVIEW content; the work is mostly restructuring, not writing from scratch.

### Related

- Doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- Memory: `project_doc_philosophy.md`
- Monorepo OVERVIEW.md line 106: lazy-migration note

---

## Slipgate + monorepo VISION docs need web-services family addendum

**Added:** 2026-04-20
**Status:** New direction surfaced during the quake-dir browser brainstorm; not yet written into any VISION doc.
**Verification first:** `grep -i "assets.quake.world\|maps.quake.world\|content.hash\|github.backup" apps/slipgate-app/docs/VISION.md VISION.md 2>&1` — if any hits, the relevant bits already landed; refine scope accordingly.

The 2026-04-20 brainstorm that produced the quake-dir browser v1 spec + plan surfaced a much broader product direction for the Slipgate ecosystem that is NOT yet captured in any VISION.md file. Key facts:

1. **Web services family.** Three sibling services: `assets.quake.world` (catalog of custom content — skins, crosshairs, conchars, HUD overlays, etc. — with metadata, comments, provenance), `maps.quake.world` (map catalog with custom textures/lits/locs/mapshots cross-linked to tournament data), and `hub.quake.world` (existing — played matches with browser-replay, the Matches domain's upstream). All three follow the same philosophy: curated central catalogs with per-asset metadata, navigable via web, consumable via the slipgate app.

2. **Content hash as universal join key.** sha256 (or equivalent) of file bytes = the canonical identifier an asset carries across local-dir, central-catalog, and GitHub-backup contexts. The local app authors NO metadata — only the hash. All descriptive metadata (name, creator, categorization, bundle membership) lives centrally and is fetched by hash lookup. This is why the v1 `ScannedFile` record reserves a `content_hash` slot (deferred-compute in v1, becomes the join key when the central catalog ships).

3. **Curated bundle subscriptions.** Users subscribe to bundles (e.g. "Tournament Maps 2026"). The central catalog pins a hash list per bundle version; slipgate diffs local hashes against the manifest, pulls missing entries, optionally prunes stale. Clean, Git-like, zero-config.

4. **GitHub OAuth as personal backup + share layer.** Separate vertical from the catalog. User logs in with GitHub (same flow pattern as existing Discord OAuth), app creates a private-by-default git repo of their quake dir. Default-exclude list = demos/screenshots/full-map-pool (copyright + space). User opt-in for specific subsets. Clean-room baseline (Phase 3 feature) provides the natural v0 commit. Slipgate's existing `docs/AUTH.md` already references a future GitHub OAuth path — this is that.

5. **MyQuake 2-mode pattern (Browse + Domains).** Parallels slipgate-wide Settings/Teamplay/Weapons split. Browse = flat raw quake-dir lens. Domains = curated concept dashboards (Configs built; Maps/Matches/Assets future). The web services above are the upstream of each Domain — Maps domain consumes maps.quake.world data, Matches consumes hub.quake.world, Assets consumes assets.quake.world. App + web are built in the same frontend stack so the UX is a continuation, not a handoff.

### Where each fact lands

- **Slipgate `apps/slipgate-app/docs/VISION.md`** — gains the GitHub-backup feature (it is app-internal) + the MyQuake 2-mode architectural pattern + the content-hash join key as a design constraint that frames how future asset features bolt on. A short section is enough; the reason-why clauses matter more than the implementation.
- **Monorepo root `VISION.md`** — gains the web services family block (assets / maps / hub triad) as the broader Slipgate product vision: the apps are the desktop-native counterpart to a future web hub, both built in the same stack so features flow between them. This is the piece that extends "workshop monorepo" into "ecosystem."

### Supporting memories

- `project_slipgate_web_services_vision.md` (2026-04-20) — durable capture of the facts above.
- `project_slipgate_architecture.md` — updated 2026-04-20 with the 2-mode MyQuake pattern.

### Pressure

Not blocking the quake-dir browser implementation. The v1 plan is written and the ScannedFile record already has the `content_hash` slot reserved. But VISION is the front door for contributors and for future-you — leaving the web-services direction undocumented means a new session won't see the shape. Should land in the next slipgate or monorepo-docs session.

### Fix shape

Single session, ~60 minutes. Draft additions against both VISION files in parallel. Keep them declarative (what, why) not prescriptive (how). Cross-reference the supporting memories for details.

---

## ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory

**Added:** 2026-04-21
**Status:** Surfaced from a slipgate-side inventory dump of a real 14,859-file ezQuake install. Three concrete gaps; all belong upstream in qw-oracle, not in slipgate.
**Verification first:** `python3 -c "import json; b=json.load(open('packages/qw-config/src/data/ezquake-asset-bundle.json')); print('client_defaults present:', 'client_defaults' in b); exts=b['asset_extensions']; print('.png variants:', sum(1 for e in exts if e['extension']=='.png')); print('.jpg variants:', sum(1 for e in exts if e['extension']=='.jpg')); print('.tga variants:', sum(1 for e in exts if e['extension']=='.tga'))"` — if client_defaults shows True and .png/.jpg have multiple variants like .tga, the work is done.

### Context

Slipgate consumes `packages/qw-config/src/data/ezquake-asset-bundle.json` to classify every file in a user's Quake dir (category, loader-site references, cvar-binding references, default-shipped detection, multi-category resolution via path_hint). The bundle is regenerated by qw-oracle's extraction pipeline. A real-world inventory of a 14,859-file install (`/mnt/c/Games/QuakeWorld/QuakeWorld/quake-dir-inventory.md`, produced via the new `dump_inventory_report` IPC command in slipgate) exposed three gaps that the pipeline should close.

### Gap A: `client_defaults` block got wiped by the oracle regeneration — FIXED 2026-04-21

Resolved upstream in `build-asset-bundle.ts` by adding a `client_defaults` seed file pattern (sibling to the other seed YAMLs). New seed at `packages/qw-config/seeds/ezquake-client-defaults.yaml` carries the 8 fields; `ClientDefaults` type added to `apps/qw-oracle/scripts/load-knowledge/types.ts` as an optional bundle field; builder loads and emits it (warn-and-continue if seed missing, matching the path-rules fallback pattern). Future FTE/MVDSV bundles drop in their own `<project>-client-defaults.yaml` — zero Rust or builder change. Regenerated bundle semantically equal to the prior band-aid state; slipgate `compute_match_groups` unaffected.

### Gap B: `.png` and `.jpg` lack path_hint variants

The extractor picked up `.tga` with 6 path_hint-qualified rules (textures → texture, skins → skin, crosshairs → crosshair, gfx → hud_overlay, env → skybox, no-hint → screenshot). But `.png` only has one path-hinted rule (`textures/ → texture`) and `.jpg` has none. In a real install this means `qw/gfx/conback.png` and `qw/nquake/env/space_bk.jpg` are mis-classified as screenshots when they're actually hud_overlay and skybox respectively.

**Fix:** extend the extractor so the same loader-site-derived path_hints that produced `.tga`'s 6 variants also produce `.png` and `.jpg` variants. Same loaders (`Draw_CachePicSafe`, skybox loader, etc.); different extensions. The `image_type_manager.c` / `image.c` code path enumerates accepted extensions — the extractor should walk all of them for every path-hint it finds.

### Gap C: 9 loader families missing from the bundle

The scan report's "Unclassified" section (6252 files, the scanner's "Other" bucket) is dominated by extensions that ezQuake does consume but whose loaders aren't covered yet. Each has a concrete function family in the ezQuake C source:

| Extension | Count in real install | Loader family (to extract) |
|---|---:|---|
| `.log` | 2206 | `Log_*` in log.c — console/match logs (auto-recording writes these) |
| `.xml` | 2178 | help system in `help.c` / `Help_DescribeCmd` — reads help XML from ezquake.pk3 |
| `.loc` | 1621 | `TP_LoadLocFile`, `loc_name` cvar — location files keyed to bsp name |
| `.lit` | 80 | `R_LoadLighting` in gl_rlight.c — per-map light data, paired with bsp |
| `.qwz` | 38 | qwdtools integration — compressed demo archives |
| `.dat` | 11 | `FS_LoadFile("qwprogs.dat"...)` — QuakeC bytecode loaded by server |
| `.kmap` | 10 | `Key_LoadBindings` / keymap reader — keyboard layout files |
| `.spr` | 8 | sprite precache via model loader |
| `.dll` | 11 | FTE plugin family — `fteplug_*.dll` (noting FTE presence even though ezQuake doesn't load these; cross-client signal) |

**Fix:** each loader family adds 1-3 loader_site entries + an extension rule (with path_hint where applicable). The v3 schema's asset_* tables already support this — it's extraction-coverage work, not schema work.

### Secondary finding: FTE detection

Same real install has `fteqw64.exe`, `fteqw64.exe.db`, `fteqwsv64.exe.db`, `ezQuake-x86_64.AppImage`, and 11 `fteplug_*.dll` files — but slipgate's `clients_detected` only surfaced `ezquake`. Client-detection heuristic in slipgate is narrow. Not an oracle problem, but worth flagging: once an FTE asset-bundle ships, slipgate's client-detection should consume `owned_gamedirs` + binary-name hints from each bundle's `client_defaults` to populate the detected-clients list.

### Timing

Do **not** pause the current Batch 3 run (T4-T13 version-tolerance work). This task is post-Batch3. The fixes are orthogonal to the historical-backfill work — they extend coverage of the already-stable extractor families.

### Non-goals

- Not asking for new schema work. v3 asset_* tables are sufficient.
- Not asking to change how slipgate consumes the bundle. Scanner code is correct; the data is what's incomplete.
- Not asking to backfill historical versions for these loader families on day one. Fixing head first is sufficient; backfill comes along with whatever general backfill workflow ends Phase 2f.

### Fix shape

One sitting, probably ~90 minutes. Add png/jpg path_hint coverage (Gap B) and the 9 missing loader families (Gap C) — priority on .log / .loc / .lit / .xml since those account for ~6100 of the 6252 unclassified files. Gap A drained 2026-04-21 via seed-driven `client_defaults` in `build-asset-bundle.ts`.

---

## Asset reference-resolution graph — research foundation

**Added:** 2026-04-21
**Status:** Research-and-design foundation spec landed at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md`. Awaiting an implementation plan; not blocking any current work.
**Verification first:** `ls docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md && head -5 docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md`.

### Context

During a 2026-04-21 slipgate dir-browser iteration, ParadokS and Claude worked through two conceptual questions raised by a real-world inventory of a 14,859-file ezQuake install:

1. **The `.lit` blindspot.** The current extractor finds loader sites by scanning for concrete string-literal arguments (`FS_LoadFile("weapons/tink1.wav")`). It misses parameterized paths like `FS_LoadFile(va("maps/%s.lit", mapname))`. This blindspot generalizes: an entire class of engine behavior (per-map companions, cvar-keyed skins, skybox face sets, precache-name-keyed models) is invisible to the current extraction pattern.

2. **The classification-vs-reference reframe.** Real installs expose that "what category is this file" is often ambiguous (vikpe's `textures/particles/` collision case: a map named `particles` would share a namespace with the engine's reserved `textures/particles/` subdir). The resolution isn't more categories; it's a shift to "who references this file?" — a consumer-reference graph resolvable by JOIN rather than classification.

The spec captures both reasonings and proposes the extractor + schema additions to close them. It is NOT an implementation plan; it is the research foundation a future plan will build on.

### What the spec proposes

Four new extraction capabilities for the oracle pipeline:

- **Capability A — Parameterized-path loader sites.** Extend the libclang walker to capture `sprintf`/`va`/concat arguments to loader calls. Emit format template + parameter sources + locked-in extension + caller context. Unlocks the `asset_companions` section.
- **Capability B — BSP internal-content extraction.** Binary-format parser walking every bsp, emitting internal texture-name list + entity list. Closes the per-map texture resolution loop; serves all engines.
- **Capability C — QuakeC `progs.dat` precache extraction.** Bytecode parser emitting `precache_model`/`precache_sound`/`precache_file` string arguments as runtime asset expectations. Slots into Phase 2f historical-backfill.
- **Capability D — Reserved-subdirs catalog.** Derived table surfacing fixed-literal subdir prefixes (`textures/charsets/`, `textures/wad/`, `textures/particles/`, etc.) as engine-reserved so slipgate can disambiguate them from per-map directories.

Three new schema tables additive on top of v6: `asset_companions` (rigid / soft / fuzzy pairing tiers), `asset_consumers` (reverse-lookup graph), `reserved_shared_subdirs` (derived).

Slipgate's scanner vocabulary shifts from `category_id: string | null` to `consumers: Consumer[]`. Residual fuzziness collapses to two clean classes: unmapped engines/tools (shrinks with each port: FTE, MVDSV, KTX) and genuinely user-workflow files (`.bat`, `.ahk`, logs, tool artifacts).

### Relationship to other work

- Extends, does not replace, `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`.
- Non-blocking on the current Phase 2f Batch 3 run. Post-Batch3 reading material for the oracle session.
- Precondition for redesigning slipgate's Browse filters and (future) Domains-tab Maps / Matches / Assets surfaces. Slipgate work can proceed on the current category-based model until the graph ships; reframe happens after.

### Fix shape

Next step is an implementation plan (in the `docs/superpowers/plans/` track, not a new spec) that breaks Capabilities A-D into ordered tasks with TDD-shaped acceptance criteria. The spec's "Implementation phasing suggestion" section is a starting outline. Likely 5-8 plan tasks spanning multiple sittings; concrete sizing needs the planner's estimate.

### Non-goals for this handover item

- Not to write the implementation plan here. That's a separate session, preferably when Batch 3 T4-T13 have landed and the oracle session has capacity.
- Not to start any extractor code. Plan first; implementation via subagent-driven execution once the plan exists.

---
