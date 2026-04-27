# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Map knowledge layer SHIPPED](#map-knowledge-layer-shipped) — **NEW 2026-04-27, FULLY SHIPPED 2026-04-27.** Sidequest from a support-channel question oracle couldn't answer. New `maps` table (schema v13), 254 maps loaded (38 id1 stock + 216 maps.qw.nu/base/). Two new MCP tools (`lookup_map`, `search_maps`). Snapshot to slipgate at `apps/slipgate-app/src/lib/config/data/qw-maps.json`. Deferred follow-ups: slipgate map-browser UI, advanced search filters, author seed-YAML curation, automated quarterly stats refresh, future maps.quake.world richer-metadata refactor (release dates, README content).
- [Cross-engine alias scaffolding + slipgate version-awareness](#cross-engine-alias-scaffolding--slipgate-version-awareness) — **NEW 2026-04-26, sub-threads #2 + #3 SHIPPED later that day.** Umbrella for an arc spanning ezscript extraction, cross-engine alias schema, default-drift triage, and the structural shift that slipgate consumers should be version-aware. Sub-thread #2 (schema spec) + sub-thread #3 (schema migration v11→v12 + ezscript handler + 38 alias entities loaded at FTE@build-6698) closed; sub-thread #5 (slipgate consumer version-awareness) tracked-by Quake Dir Control plan; sub-thread #4 (FTE asset bundle) still open as adjacent track.
- [Retired cvars in snapshot + stale-config warning UX](#retired-cvars-in-snapshot--stale-config-warning-ux) — **NEW 2026-04-26.** Coupled producer+consumer work blocked on UX design. The `build-snapshot` CLI today emits only entities present at head (2,899 ezquake cvars; 2,835 source_backed + 149 doc_only). 5 retired cvars (`cl_showkeycodes`, `gl_smoothfont`, `keymap_name`, `r_fx_geometry`, `scr_printspeed` — alive in v3.0 through 3.6.2, removed before head) are silently dropped. Use case it blocks: opening an old config in slipgate where `keymap_name "us"` is present and getting a truthful "this was removed in 3.6.5" message instead of generic "unknown cvar" treatment. Defer until the stale-warning UX is on the table.
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — **QWCL 2.33 SHIPPED 2026-04-25** + **FTE Phase 2d-core SHIPPED 2026-04-26** + **FTE Phase 2d-bundle SHIPPED 2026-04-27** (28 asset_category + 61 extensions + 13 path_rules + 25 cvar_bindings + 717 loader_sites; quality-grid 30/30; 3 Path-1 fixtures green) + **Game-mechanics arc 1 SHIPPED 2026-04-27 evening** (schema v14: gameplay_sources/gameplay_entity_defs/gameplay_mechanics; 37 entities + 41 mechanics from id1 QC; 4 new MCP tools; SERVER_VERSION centralized 12 sites→1; v4 splits: telefrag/exit_level_kill + trigger_hurt env_hazard; commits a3dddc6→6110901) + **Phase 2e MVDSV SHIPPED 2026-04-27** (schema v15: protocol_message/info_key/log_template/qc_builtin; 1235 entities at mvdsv f816d28 head; runtime-validated against Ciscon's `1.20-dev` dump with zero extractor gaps; 26 commits `320f5de`→`c158da5`). ezQuake deep-time walk at v3.0 floor. Remaining: Phase 2e-deep-time MVDSV (after KTX), Phase 2e KTX cvars (after MVDSV), Phase 2e KTX gameplay overrides, qw_event_log validation harness, Phase 2g MCP tool upgrades, Phase 2h automation.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — P3 from 2026-04-24 sanity-sample calibration. Release-notes using feature full-names (joystick) don't match clusters of abbreviated entity names (joy*). Not a Phase 2f blocker; worth fixing during or before real walks reach affected pairs.
- [Layer 1 doc_only audit](#layer-1-doc_only-audit--closed-with-one-deferred-row) — **CLOSED 2026-04-25 with one deferred row.** Six extractor patterns + one architectural change + one loader dedup shipped across the session: P1 Cmd_AddLegacyCommand, P2 log_t table, P3 nested cvar_t tables, P5a SERVER_ONLY misplacement, P6 #define resolution, Item A 4-variant parse architecture, Item B cross-type help-JSON orphan prune. Prior retraction was itself wrong (extractor was missing these; the "all 73 cat1 present in AST" claim was based on a second misreading). Doc_only 269 -> 210; zero regressions; +24 newly-discovered command entities; +1 asset cvar binding; +1 cmdline usage. Deferred: `-nopriority` cmdline_param at sv_sys_win.c:645 (requires Windows SDK headers unreachable on Linux libclang). One entry remains until MVDSV/FTE hit the same wall — then stub-headers solution lands in one place.
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Workstream B: concept-note authoring scaffolding](#workstream-b-concept-note-authoring-scaffolding) — provenance frontmatter landed in `concept-notes/README.md` 2026-04-23; still open: template MDX-compatibility test against ezquake.com vitepress, authoring-ritual shape (prompt/slash-command).
- [Workstream C: /docs ingest pipeline prep](#workstream-c-docs-ingest-pipeline-prep) — **Audit completed 2026-04-24** (15 mirror, 10 ignore, 4 split, 1 historical across 30 guide pages). **License resolved by operator decision 2026-04-24**: treat as CC-BY-4.0, vikpe consented verbally on Discord, no LICENSE commit required. **Framing flipped 2026-04-25**: ezquake.com/docs is single-maintainer-plus-stepped-back (vikpe: "1 edit beyond myself submitted in 6 years"); Oracle is the authoritative current-state source and upstream is the downstream human-readable surface. Most "imports" will actually be Path 2 rewrites citing upstream as source material rather than Path 1 mirrors. **Role map shipped 2026-04-24** (`docs/superpowers/specs/2026-04-24-layer3-role-map.md`): scale revised to ~22-26 notes; 7 roles surfaced; D1 voice resolved to tiered-per-shape; D2 (R7) parked as open bucket. **Two Path-2 rewrites shipped 2026-04-24/25**: `weapon-scripts.md` (first R7 exemplar) and `lightning-gun-customization.md` (second R7+R2 exemplar). Authority-grounding triad and progressive-disclosure structure both confirmed across 2 notes — pending 3rd-instance promotion to README rule. **Skill process improvements landed 2026-04-25**: Phase 7.5 operator consult gate + Phase 5b six-mechanism ruleset scan + help_remarks pull (in `~/.claude/skills/guide-rewrite/SKILL.md`). Remaining: gap-report output format as contributor onboarding kit (continues to grow), next guide rewrite (candidates: `scripting.md` for multi-concept ROI, `player-skins.md` for tighter scope).
- [Slipgate SCHEMA.md for snapshot consumer interface](#slipgate-schemamd-for-snapshot-consumer-interface) — **NEW 2026-04-26.** Slipgate's snapshot consumer types (`RawVar`, `RawCommand`, `RawMacro`, etc.) live inline in `apps/slipgate-app/src/lib/config/loaders/ezquake.ts`. The shape is small and single-file today, but the upcoming UI arc surfacing version-arc badges / source_state pills / default_history timelines will benefit from a single typed contract doc paired with oracle's `apps/qw-oracle/docs/entity-types.md` (the producer-side equivalent). Defer until that UI arc starts; revisit if the inline types start to fragment.
- [Phase 3.5a: IA restructure — split Clients tab into Feed + MyQuake → Domains → Clients](#phase-35a-absorb-clients-tab-into-myquake--domains--clients) — **NEW 2026-04-27 (late afternoon), EXPANDED 2026-04-27 (evening).** IA restructure surfaced during the 3.5b second-pass review. The standalone Clients tab dissolves into (a) a new top-level Feed tab hosting the extracted Updates section, and (b) a trimmed Clients sub-tab inside MyQuake → Domains keeping only Installation + Versions. Four sections dropped from the user-facing surface (Input, Video, Launch, Screenshot POC); code retained for future arcs. SideNav stays at 6 tabs (Schedule / Profile / Feed / Tools / MyQuake / Settings — Clients out, Feed in). Tools stays separate (general FPS-gamer tools, not Quake-only); Schedule stays as placeholder (matchscheduler integration parked). Plan at `docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md`. ~3-4 hour fresh-terminal session. Sequenced before Phase 3.5b.
- [Add Quake Client / MyQuake unification — Phase 3.5b feature plan, pending pass-2 revision](#add-quake-client--myquake-unification-post-phase-3-scope-sketch) — **NEW 2026-04-26 night, RESCOPED 2026-04-27 (afternoon + late afternoon).** This is now Phase 3.5b. Original plan at `docs/superpowers/plans/2026-04-26-add-quake-client.md` was first-pass revised 2026-04-27 afternoon (canonical-only naming + tier-ladder framing absorbed in commit `01e4081`); a pass-2 reviewer in a fresh terminal returned 14 findings (F1-F14). The plan needs a pass-2 revision to absorb (a) the F-series findings and (b) four open operator decisions: multi-quake-dir semantics (warehouse-only-without-claiming-primary leaning), variant encoding decoupled from version key (separate `variant: Option<String>` field on `WarehousedVersion`), release_cache channel modeling (per-channel files leaning), primary-radio uses `swap_active_version` not `reconcile_active_version` to honor user choice. F1 (entry-point ambiguity) dissolves under 3.5a's IA restructure; F2-F14 are still in scope for the pass-2 revision. Do NOT execute the plan as currently written — top-of-file note flags this. Sequenced AFTER 3.5a ships.
- [Canonical-mode default for warehoused clients](#canonical-mode-default-for-warehoused-clients) — **NEW 2026-04-27, REFRAMED 2026-04-27 (afternoon).** Slipgate writes client binaries only at `<quake-dir>/<family>.exe`. No mode toggle, no opt-out. The earlier "default canonical with messy-mode opt-out" framing was dropped during the second-pass review session — canonical-only is now a *consequence* of the four-tier opt-in ladder (see new `project_slipgate_tier_ladder.md` memory and the "Tier 3 future arcs" entry below) rather than a contested default. Phase 3 already reverted to hardcoded `ezquake.exe` in `f6fe481`. Phase 3.5 plan needs the canonicalize-on-import flow embedded before execution.
- [Tier 3 future arcs (clean-room migration + asset warehouse + bundle install)](#tier-3-future-arcs-clean-room-migration--asset-warehouse--bundle-install) — **NEW 2026-04-27 (afternoon).** Architectural realization captured during Phase 3.5 second-pass review: the warehouse + swap substrate Phase 2/3 shipped (content-addressed blobs + per-thing manifests + index + atomic-rename swap to canonical slot) generalizes from binaries to any content with identity + versions + canonical slot. Future arcs A/B/C/D — asset warehouse + 1-click texture-set switching, bundle install (slackers_tp / curated nQuake-style), fresh-install / clean-room migration, MyQuake → Domains → Bundles dashboard — all reuse the same primitive at parallel `<data-root>/<kind>/...` roots. Captured here so the framing isn't lost in the gap between Phase 3.5 ship and the first asset/bundle work. Pressure low; substrate is already in place.
- [Feed tab future content](#feed-tab-future-content) — **NEW 2026-04-27 (evening).** The new Feed top-level tab created in Phase 3.5a hosts only Updates initially. Operator's intended Feed scope: the "what's happening in QW right now" surface — current/upcoming tournaments, developer landscape (active QW projects, recent commits / releases, project announcements), GitHub monitoring of the engine + tooling repos, possibly community announcements. Each future content type is its own arc with its own data source. Captured here so the framing isn't lost between 3.5a ship and the first Feed-content arc.
- [Screenshot POC → Profile picture generator](#screenshot-poc-profile-picture-generator) — **NEW 2026-04-27 (evening).** The Screenshot POC section was dropped from the user-facing Clients-Domain surface in Phase 3.5a, but the underlying `screenshot.rs` Rust command stays callable. Future arc graduates the POC into Profile as a "Generate profile pictures" feature: 1 button generates 5 standardized screenshots from a slipgate-shipped demo file, all users see the same scene/map/point-in-time so flipping through profiles shows "different visuals depending on user's setup." Operator's stated end-goal. Profile already has placeholder slots for these screenshots.
- [Tray menu launch](#tray-menu-launch) — **NEW 2026-04-27 (evening).** The Launch section (Server input + Join/Spec/Launch buttons) was dropped from the user-facing Clients-Domain surface in Phase 3.5a per VISION's "Not a game launcher" framing. If launch ever needs to come back (e.g. for the Profile screenshot-generator integration that needs slipgate to spawn ezQuake with specific args, or for any quick-join-from-anywhere UX), the natural home is the system tray menu (right-click → Launch / Join / Spec). Matches the "invisible until needed" tray-app philosophy and doesn't burn screen real estate. No active pressure to resurface.
- [Player profiles (bundle-shaped, share-via-hashlist)](#player-profiles-bundle-shaped-share-via-hashlist) — **NEW 2026-04-27 late evening.** "Play like Milton" use case: pull a community member's profile (manifest of asset hashes + optional filter like onlyVisuals/onlyHud), dedupe against locally-warehoused assets, swap in/out between own profile and another's. Bundle-shaped — reuses Tier 3 future arc B (bundle install) infrastructure at a different abstraction level. Captured for a future research session; no immediate impact on 3.5b decisions. Operator confirmed scope-out for this phase.
- [Sub-pattern 2b: cmdline variant-matrix gaps](#sub-pattern-2b-cmdline-variant-matrix-gaps) — 2026-04-25. **Partially resolved 2026-04-25 (late):** `-U__linux__` added to Apple+Win clang variants flipped 2 of 4 entities — `-gl_ext` now cited at vid_common_gl.c:340, `-allowmultiple` now cited at sys_win.c:682. Remaining 2 (`-nohwtimer` at sys_win.c:572 and `-gl-forward-only-profile` at gl_sdl.c:50) are blocked on the same SDK-stub-headers solve as the deferred `-nopriority` row from the Layer 1 doc_only audit — both call sites live inside function bodies whose surrounding statements use unresolved Windows SDK / SDL types under Linux libclang, so PARSE_INCOMPLETE recovery skips the compound expressions even though simpler `if (COM_CheckParm(...))` calls in the same files succeed.
- [Plugin v-table asset detection (loader-sites handler)](#plugin-v-table-asset-detection-loader-sites-handler) — **NEW 2026-04-26.** FTE asset extraction (Phase 2d-bundle) found that plugin source roots emit zero rows from the asset_loader_sites handler, while the cvars handler captures plugin-registered cvars. Cause: FTE plugins reach asset loaders through `cvarfuncs->GetNVFDG()` and similar v-table calls, not direct C calls in LOADER_FUNCTIONS. Only `plugin:ezhud` is currently affected (HUD images). `plugin:ezscript` has zero asset surface; no other plugins are in scope. Pressure: low — ezhud's images ship bundled with FTE, so an installed user has the assets regardless of the bundle classifying them.
- [Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)](#cvar-binding-handler-indirection-gap-snprintf-chains--cvarfc-callbacks) — **NEW 2026-04-26.** The asset_cvar_bindings handler's auto-pass corroborates only the simplest pattern: `cvar.string` member-ref in the same compound scope as a loader CALL_EXPR. It does NOT follow snprintf chains (`Q_strncpyz(name, baseskin.string, ...)` then `FS_Open(name)`), CVARFC callbacks (`r_skybox` → `R_SkyBox_Changed` → `R_SetSky`), or any other multi-hop indirection. This is a Layer 1-wide handler limitation, not FTE-specific: confirmed at FTE build-6698 (4 of 22 seed bindings stand on seed authority alone) AND at ezQuake head (23 of 24 seed bindings stand on seed authority alone). Bundle reconciliation correctly treats these as `seedRetained` rows — they're not lost, just not mechanically corroborated. Pressure: low. Worth fixing only when the seed-authoring cost of writing bindings the handler could detect becomes painful.
- [qw-oracle DEVELOPMENT.md missing](#qw-oracle-developmentmd-missing) — **NEW 2026-04-27.** qw-oracle has accumulated multiple project-specific test runners (the ezQuake Path-1 fixtures at `apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py` and the FTE Path-1 fixtures at `apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py` shipped 2026-04-27) plus per-project verifier scripts (`asset-path-rules-verify.py` for ezQuake and FTE) that don't appear in `CLAUDE.md ## Commands` and have no central index. Partial coverage exists in CLAUDE.md `## Commands` for the loader CLI (`load-version`, `extract-tag`, `quality-grid`, etc.) but not for the test/fixture surfaces or the verifier scripts. Pressure: low — discoverability gap, not a correctness gap.
- [Layer 3 concept note: death rules](#layer-3-concept-note-death-rules) — **NEW 2026-04-27 (evening), REFRAMED 2026-04-27 (after qw_event_log discovery).** "Death in QW" is conceptually richer than a single deathtype enum: real telefrag (teleport-overlap), exit-level kill (samelevel/noexit changelevel — what kills you on e1m2's end teleporter in 4on4), trigger_hurt (mapper-controlled void brushes), fall damage, crush/squish, lava/slime ticks, drowning. Three-anchor synthesis target: source-truth (Layer 1 deathtype + KTX overrides) + observed-behavior (qw_event_log obit corpus + WeaponType taxonomy as cross-validation oracle) + community testimony (Layer 2 "noexit lol" jokes). Sequence: arc 1 (id1) shipped 2026-04-27; arc 2a MVDSV cvars; arc 2b KTX cvars/commands; arc 2c KTX gameplay overrides (mirrors id1 work, fills `gameplay_source_id='ktx'` rows); arc 3 build qw_event_log validation harness (parser as ground-truth oracle for "what does Layer 1 claim vs what does the parser observe?"); arc 4 author the concept note once all four arcs converge. Pressure: low — concept-note bench is deep, and the build-out sequence forces several quality gates first.
- [qw_event_log as cross-validation oracle for Layer 1](#qw_event_log-as-cross-validation-oracle-for-layer-1) — **NEW 2026-04-27 (evening).** Operator's earlier collaboration with vikpe + Claude produced a Rust crate (`qw_event_log`) that parses MVDSV demos into structured `GameEvent` streams. The repo is FROZEN at `/home/paradoks/projects/qw-event-log-handoff/` (commit `2c584b4`); was originally PR #5 in vikpe/slipgate, moved to `.bak/` when vikpe decided to rewrite the MVD layer. Three artifacts inside that Oracle wants: `obituary.rs` (47 kill + 12 suicide + 16 world + 12 teamkill obit-string→cause patterns sourced from KTX `client.c` ClientObituary AND id1 `client.qc`), `events.rs` (`WeaponType` enum: clean unified taxonomy spanning vanilla weapons + KTX-promoted distinctions like Discharge/Stomp + environmental + Telefrag + Suicide), `ARCHITECTURE.md` (~350 lines documenting the engine-protocol model: modern KTX kills via MVDSV `DamageDone` hidden message; legacy demos via PRINT obit; environmental = attacker=world). Right framing: NOT a one-shot import but a permanent cross-validation oracle. Once KTX layer1 ships (arc 2c), build a harness that runs the parser over a demo corpus, aggregates observed event types, queries Oracle for the corresponding rows, and outputs a divergence report. Convergence corroborates Layer 1; anomalies are work to do. Generalizes beyond death — same loop applies to weapon damage, spawn rules, mod-specific behavior. Pressure: low; gated on MVDSV→KTX cvars→KTX gameplay overrides shipping first. Non-trivial caveat: the handoff repo is frozen; if vikpe's new `demo_parser` ships before our validation-harness arc, validate against the live version not the frozen snapshot.
- [SCHEMA.md doc-style inconsistency](#schemamd-doc-style-inconsistency) — **NEW 2026-04-27 (evening).** Task 2 of the game-mechanics arc 1 plan added a `## v14 (2026-04-27): game-mechanics tables (id1 baseline)` section to `apps/qw-oracle/SCHEMA.md`. The plan said to mirror "the v13 section verbatim" but in reality SCHEMA.md does NOT have a `## v13` section — v13 was documented as `## Map knowledge layer` (topical H2 with column-table + bold-prefixed paragraphs), and prior version migrations (v10, v11) appear as `### vN:` H3 sub-sections inside `## Cross-cutting notes`. The v14 section now uses a third style nobody else uses. Two cleanup options: convert v14 into a `## Game mechanics knowledge layer` topical heading parallel to Map knowledge layer; or harmonize the doc to a per-version style (v10/v11 bumped from H3 sub-sections to H2 sections). Operator decides. Also flagged: stale references in conventions paragraph still say "schema v12", migration walk text says "v1→v2→...→v11", table map says "Total: 22 tables at schema v12 + v13" — none reflect v13/v14. Pressure: low — facts are correct, only structure is inconsistent.
- [FTE asset bundle consumer wiring](#fte-asset-bundle-consumer-wiring) — **NEW 2026-04-27 (orchestrator wrap-up).** Producer-side `fte-asset-bundle.json` shipped with Phase 2d-bundle but `apps/slipgate-app/src/lib/assets/bundle.ts:2` hardcodes the ezQuake import. The MyQuake → Browse classifier currently classifies every quake-dir file using ezQuake rules only; FTE-specific surfaces (shaders, heightmaps, .po localization, FTE path conventions) bucket as "other" instead of being properly categorized. Half-day to a day of slipgate work; pressure low (asset overlap is ~70%, classifier still does most useful work). Worth doing when a slipgate-side arc next touches the asset classifier (Phase 3.5a MyQuake → Domains restructure or whichever Tier 3 future arc lands first).

---

## Map knowledge layer SHIPPED

**Added:** 2026-04-27. **Status:** Fully shipped. **Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT COUNT(*) FROM maps"` should return `254`. `cat apps/slipgate-app/src/lib/config/data/qw-maps.json | python3 -c "import json,sys; print(len(json.load(sys.stdin)['maps']))"` should return `254`. End-to-end MCP probe via stdio: `cd apps/qw-oracle/serve/mcp && echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_maps","arguments":{"lacks_weapon":["lg"],"limit":5}}}' | bun run src/index.ts` should include povdmm4 in the result list.

### What shipped

- **Schema v13** -- pure-additive `maps` table + 2 indexes. Plan + spec live at `docs/superpowers/{plans,specs}/2026-04-26-qw-oracle-map-knowledge*.md`.
- **Extractor pipeline** at `apps/qw-oracle/scripts/extractors/qw/`: `pak_extract.py` (pak0/pak1 -> 38 id1 stock BSPs), `download_maps.py` (maps.qw.nu/base/ -> 216 community BSPs), `fetch_stats.py` (stats.quakeworld.nu top-200 popularity), `bsp_parser.py` (entity + texture lump -> normalized item/spawn/feature dicts), `extract.py` (orchestrator -> qw-maps-ast.json).
- **Loader** `load-maps.ts` + CLI subcommand `npm run load-knowledge -- load-maps`. Idempotent UPSERT keyed on canonical_name.
- **Snapshot** `build-snapshot --project qw` emits `apps/slipgate-app/src/lib/config/data/qw-maps.json`. New `qw` value in the `Project` union.
- **MCP tools** `lookup_map(name)` (full record + Levenshtein typo suggestion) + `search_maps(...filters)` (15 filter dimensions, popularity-rank sort, items_compact one-liner).
- **Tests:** 9 pytest (BSP parser), 3 pytest (PAK extractor), 4 node:test (loader), 13 bun:test (MCP tools) -- all green.

### Deferred follow-ups

- **Slipgate map-browser UI.** Snapshot is shipped; UI is a future arc.
- **Advanced `search_maps` filters.** Once we see what queries actually land, add what's missing (e.g. has_func_secret, by_year-from-future-metadata).
- **Author seed-YAML curation.** `seeds/qw-map-seed.yaml` is scaffolded empty. Fill as community-known authors surface.
- **Automated quarterly stats refresh.** Manual `fetch_stats.py` for now; automate when cron infra exists.
- **Future maps.quake.world metadata-pass refactor.** When vikpe's site exposes richer per-map metadata (READMEs, release dates, design notes), refactor to consume that source. Spec calls this out as a non-goal for v1.
- **Locs.** Spec dropped them; slipgate already reads user's local locs for the simulator. Add `map_locs` table only if a future use case (voice-analysis position tagging?) needs oracle-side loc lookup.

### Pressure

None. Sidequest closed. Layer 1 now answers the motivating support-channel question and a class of related ones.

### Related

- Spec: `docs/superpowers/specs/2026-04-26-qw-oracle-map-knowledge-design.md`
- Plan: `docs/superpowers/plans/2026-04-26-qw-oracle-map-knowledge.md`
- Schema: `apps/qw-oracle/SCHEMA.md` § "Map knowledge layer"
- Extractor: `apps/qw-oracle/scripts/extractors/qw/`
- Loader: `apps/qw-oracle/scripts/load-knowledge/load-maps.ts`
- MCP tools: `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`, `search-maps.ts`
- Snapshot consumer: `apps/slipgate-app/src/lib/config/data/qw-maps.json`

---

## Cross-engine alias scaffolding + slipgate version-awareness

**Added:** 2026-04-26 (mid-investigation, captured as savegame). **Sub-threads #2 + #3 closed 2026-04-26 evening.**
**Status:** Schema + ezscript extractor SHIPPED. Sub-thread #5 (slipgate consumer version-awareness) is the last in-flight piece and is tracked-by the Quake Dir Control plan. Sub-thread #4 (FTE asset bundle) remains open as an adjacent track.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT COUNT(*) FROM entities WHERE project='fte' AND type='cvar_alias'"` should return `38`. `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name FROM entities WHERE project='ezquake' AND type='cvar' AND name='cl_fakeshaft'"` should return the cvar row. `git -C research/repos/ezquake-source log -1 --format='%h %s'` should show `bea2515d CVAR: cl_fakeshaft - default to 1 (#1110)` if the source clone is still at the same HEAD that produced today's findings; otherwise re-validate the `head` snapshot freshness before continuing.

### Why this is one umbrella

Each thread below started independently but converges on the same structural finding: **Layer 1's data model already encodes per-version richness (`default_history`, `first_seen_version`, `last_seen_version`, `source_state`), but slipgate consumes a flattened HEAD view, so users on stable releases see incorrect data**. The drift sweep on ezscript aliases surfaced this. The schema decision for cross-engine aliases needs the same version-pair shape. ezscript itself is 17 years stale. The `cl_fakeshaft` puzzle was the canary that exposed the version-skew. All threads share root infrastructure decisions.

### Closed today

- **Plugin audit (22 FTE plugins).** Only `ezhud` (already extracted) + `ezscript` (pending) are QW-relevant. Other 20 confirmed not alias-shaped, not QW-targeted, or empty. Three additional plugins (`hud`, `serverb`, `spaceinv`) use `Plug_ExecuteCommand` but are FTE-namespace-internal or sample-game commands, not alias bridges. ezscript is the only QW migration alias plugin in FTE.
- **ezscript freshness check (38 aliases).** 25 A_LIVE (both sides `source_backed` at head) + 7 B_LHS_GONE (ezQuake LHS retired, FTE target alive — historical aliases for old configs) + 4 F_DOC_ONLY (ezQuake LHS in help-JSON only) + 1 D_BOTH_GONE (`in_m_mwhook` → `in_mwhook`) + 1 C_RHS_GONE (`vid_vsync` → `_vid_wait_override`; FTE renamed to `vid_vsync`, target obsolete). **37/38 importable; 1 needs target investigation/update.**
- **`cl_fakeshaft` default puzzle resolved.** User observed default=0 in 3.6.9 binary; DB at HEAD reports default=1. Root cause: commit `bea2515d` (2026-03-23, post-3.6.9 tag, on 3.7.0 dev line) literally titled "CVAR: cl_fakeshaft - default to 1 (#1110)". Our cloned ezquake-source is on 3.7.0-dev; user's binary is on 3.6.9 stable. **Both correct for their version.** This was the canary that exposed the slipgate version-blindness gap.
- **Default-drift sweep — both HEAD and 3.6.9 versions run.** HEAD vs build-6698: 11 same / 14 DIFF / 13 na. **3.6.9 vs build-6698: 12 same / 13 DIFF / 13 na.** Single delta: `cl_fakeshaft` flipped DIFF→same at 3.6.9 (the version-skew artifact, exactly as predicted). The 13 real drift rows at 3.6.9 are the alias-schema triage queue — including ones that genuinely need value transforms (`bgmvolume` 1 → `musicvolume` 0.3 likely scale; `cl_bonusflash` 0 → `v_bonusflash` 1 likely boolean flip), real model differences (`cl_physfps` 0=auto vs `cl_netfps` 150=hardcoded; `r_farclip` 8192=fixed vs `gl_maxdist` 0=dynamic), color triplet drift (3 r_*color rows), macro-vs-literal (`sshot_format` `DEFAULT_SSHOT_FORMAT` vs `png` — extractor doesn't resolve `#define`), and serverinfo redirects (`sv_maxpitch`/`sv_minpitch` ezQuake has defaults, FTE serverinfo target is empty by design). Saved data: `/tmp/ezscript-audit/aliases.tsv` (38 raw alias pairs) + `/tmp/ezscript-audit/drift-369.tsv` (full sweep with source_state). Regeneratable from source if /tmp clears.

### Open sub-threads, ordered by dependency

1. ~~**Re-run drift sweep at ezQuake 3.6.9 vs FTE build-6698.**~~ **DONE 2026-04-26.** 12 same / 13 DIFF / 13 na (vs HEAD's 11 / 14 / 13). Seed committed to `apps/qw-oracle/scripts/extractors/fte/seeds/ezscript-drift-369-vs-build-6698.tsv` (was `/tmp/`).
2. ~~**Schema decision for cross-engine aliases.**~~ **DONE 2026-04-26.** Spec at `docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md`. Option A landed: new entity type `cvar_alias` + per-version table `cvar_alias_versions`. Schema bumped v11→v12 with CHECK widening on `entities.type` and new table. Field set: `target_project / target_kind / target_name / target_canonical_id / mimics_project / value_transform / value_transform_params_json / default_drift_status / semantic_confidence / verified_target_version / verified_mimics_version / freshness_state / source_root`. Two nullable text columns for verification stamp (chosen over JSON for SQL-filterability per review). `freshness_state` owns existence; `default_drift_status` is meaningless when one side is gone. SCHEMA.md updated.
3. ~~**ezscript extract handler.**~~ **DONE 2026-04-26.** `_handler_ezscript.py` walks `Plug_ExecuteCommand` IF_STMT chain, extracts (LHS, RHS) pairs from strcmp + assignment subtrees, joins drift seed by LHS. `load-cvar-aliases.ts` loader validates `verified_*` strings via `parseVersionSpec` from `@qw/version-resolution`. extract-tag wired for FTE (PROJECT_EXTRACTOR.fte set, ENTITY_JSON_FILES.fte populated; this also makes prior FTE entity types reloadable through extract-tag for future deep-time runs). Verification at FTE@build-6698: 38 entities loaded (36 cvar + 2 serverinfo); 25 alive / 11 mimics_lhs_gone / 1 target_gone / 1 both_gone; 12 same / 13 differ_dangerous / 13 unknown drift; N-to-1 sanity check `r_skycolor` + `fps_skycolor` → `fte:cvar:r_fastskycolour` confirmed; quality-grid 21/21 clean. cl_truelightning entity migration deferred (parked thread "cl_truelightning slipgate search gap").
4. **Phase 2d-bundle: FTE asset extraction.** Separate plan needed; not scoped today. FTE asset surface is the largest among QW engines. Probably 2-3 sessions. **Adjacent track (closes "what FTE has, we extract" together with ezscript).** **Blocks:** nothing immediate; FTE Layer 1 chapter doesn't fully close until this lands.
5. **Slipgate consumer version-awareness.** Biggest fundamental shift. Slipgate's loader (`apps/slipgate-app/src/lib/config/loaders/ezquake.ts`) currently reads cvar `default` as static and renders HEAD's view. Needs to: read user's installed binary version (updater already knows this), resolve each cvar's effective default via `default_history` keyed to that version, hide cvars where `first_seen_version > user_version`, mark `last_seen_version < user_version` as retired-after-X. Single snapshot bundle stays — no per-version files needed because `default_history` + `first_seen_version` / `last_seen_version` already encode everything per-cvar. **2026-04-26 update:** version-resolution helpers now exist as `@qw/version-resolution` (Phase 0 of `docs/superpowers/plans/2026-04-26-quake-dir-control.md` shipped today — `parseVersionSpec` / `compareVersions` / `existsAtVersion` / `defaultAtVersion`). Phases 4 + 5 of that plan execute the consumer-side widening (snapshot retired-entity emission + diff viewer). The "ConfigViewer current-vs-default per-version" piece is NOT covered by the Quake Dir Control plan — that's still its own arc, but it consumes the same lib. **Touches every cvar field render.** Affects: ConfigViewer current-vs-default comparison, stale-warning UX, FTE converter behavior, "what changed" UI.

### Adjacent threads surfaced but parked

- **help_variables.json default vs source-literal default disagreement.** Today's investigation found `Cvar_Register` populates `cvar_t.defaultvalue` from the source literal (`var->string`). help_variables.json carries an independent `default` field that may diverge (e.g., curator-asserted vs source-asserted). Worth a one-shot scan: how many ezQuake cvars have help-JSON `default` ≠ source-literal default at any loaded version? Bounded answer; might surface a systemic Layer 1 extractor question or be a one-off (`cl_fakeshaft` was just version-skew, not extractor disagreement). Not a blocker for the alias arc — separate Layer 1 hygiene check.
- **`cl_truelightning` slipgate search gap (Cmd_AddLegacyCommand UX).** ezQuake's `host.c:580` registers `cl_truelightning` as a legacy command alias for `cl_fakeshaft`. Our DB stores it as a `command` entity (P1 from doc_only audit). Slipgate's CvarRow / search UI is cvar-table-only, so `cl_truelightning` is invisible there. Either fold legacy-command-aliases into cvar search results with an "aliases to X" indicator, or extend search across the command table. Same UX shape as cross-engine aliases at smaller scope; the schema decision in sub-thread #2 should not preclude internal-engine aliases consuming the same lookup path.
- **CI cadence for ezQuake new-tag → snapshot regen.** When ezQuake tags 3.7.0, oracle's `extract-tag --version 3.7.0` + `build-snapshot` should run automatically and update slipgate's data dir. Not urgent; slipgate isn't in full production. Right shape: tag-driven trigger on the ezquake-source mirror; no nightly extraction (tip-of-main produces churn without value between tags).
- **"What changed between version A and B" UI feature.** Free fall-out of sub-thread #5. Layer 1's `change_events` table already encodes adds / retires / default-flips per version transition. Slipgate's existing per-version changelog UI (right detail panel of the updater) can render this in cvar-level granularity. Becomes a natural feature once the loader is version-aware. Use case the user named: returning player on 3.2.2 (eizor) wants to know what's changed before upgrading.

### Schema implications already established

From today's investigation, the cross-engine alias schema must support:
- **N-to-1 mappings** (multiple LHS → same RHS — `r_skycolor` + `fps_skycolor` both → `r_fastskycolour`)
- **Different target kinds** (cvar / serverinfo / userinfo / command — ezscript has 2 serverinfo redirects: `sv_maxpitch` → `serverinfo maxpitch`)
- **Per-row freshness state** (ezscript's 7 historical-LHS rows are still useful for old configs, even though LHS is retired in current ezQuake)
- **Value transforms beyond name swap** (some 14-row drift candidates may need bool_flip / scale / etc., not just identity)
- **Version-pair verification stamp** (when was this alias last sanity-checked against which engine versions)

### Pressure

Lower now that the schema + extractor are shipped. Sub-thread #4 (FTE asset bundle) is shape-defined but not scoped to a session; pick up when the FTE Layer 1 chapter is being closed out. Sub-thread #5 (slipgate version-awareness) is owned by the Quake Dir Control plan; do not duplicate effort here.

### Related

- ezscript source: `research/repos/fteqw/plugins/ezscript/ezscript.c`
- FTE plugin scope decision: `apps/qw-oracle/scripts/extractors/fte/OUT_OF_SCOPE.md` § "Plugin allowlist gap"
- Audit findings: full plugin audit + freshness check + drift sweep documented in conversation only (this entry is the durable summary)
- Skywind concept note: `apps/qw-oracle/concept-notes/skywind-animated-skyboxes.md` — example of "ezQuake feature with no FTE counterpart" (vs alias case)
- Slipgate consumer entry point: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts`
- ezQuake source-of-truth memory: `memory/project_qw_oracle_source_truth.md` (path 2 transition-log, source-as-ground-truth)
- ezQuake updater UI screenshot reference: `/mnt/c/Users/Administrator/Downloads/2026-04-26_14-49.png` (multi-engine tabs, version list with install state, per-version changelog detail panel)
- HEAD position (today): `bea2515d 2026-03-23 CVAR: cl_fakeshaft - default to 1 (#1110)` — three commits past the `3.6.9` tag (`b2d448f2 2026-03-01`)

---

## Retired cvars in snapshot + stale-config warning UX

**Added:** 2026-04-26 (after build-snapshot CLI shipped 2026-04-25; default_history numeric-equality fix shipped 2026-04-26 commit `9917002`).
**Updated:** 2026-04-26 evening — Quake Dir Control plan Phase 4 (`docs/superpowers/plans/2026-04-26-quake-dir-control.md`) now covers the producer-side retired-entity emission (across all 4 entity types, not just cvars). Phase 5 covers the diff-viewer consumer; the "stale-config warning UX in ConfigViewer" piece is still its own arc and stays open here.
**Status:** Producer change scoped + tiny, will land in Phase 4 of the Quake Dir Control plan; gated on consumer-side UX design for the ConfigViewer warning. Defer the UX half until the stale-warning feature is being designed in slipgate.
**Verification first:** `python3 -c "import json; v=json.load(open('apps/slipgate-app/src/lib/config/data/ezquake-variables.json'))['vars']; print(sum(1 for o in v.values() if o.get('source_state')=='source_retired'))"` — currently `0`. When this returns `>0`, the producer side has shipped and consumer wiring is the remaining work.

### What's missing

The current `build-snapshot` CLI emits one row per entity present at the project's head version. Retired cvars (DB rows with `source_state='source_retired'` — alive in older versions, removed before head) are silently dropped from the snapshot.

Today's ezQuake retired set (5 cvars): `cl_showkeycodes`, `gl_smoothfont`, `keymap_name`, `r_fx_geometry`, `scr_printspeed`. Each was alive in v3.0 through 3.6.2 and removed in 3.6.5+. Slipgate's loader returns `undefined` for these names today.

### Use case it blocks

A user opens a 2018-era config in ConfigViewer. The config has `keymap_name "us"`. Slipgate's lookup → not found → falls back to "unknown cvar" treatment (yellow warning, treated as either user-defined `set` variable or noise).

The truthful behavior is: "this cvar was removed in ezQuake 3.6.5; safe to delete." Same applies to FTE converter — it should know "this isn't a bug, this is a removal — translate to nearest equivalent or flag for the user." Same applies to FTE/MVDSV/KTX walks once they ship deep-time (the retired set will grow as more codebases get loaded).

### Why it's coupled work, not a producer-side one-liner

**Producer side (~30 min):** widen `build-snapshot.ts` to emit retired cvars too, marked with `source_state: "source_retired"` and `last_seen_version`. Snapshot grows by ~5 entries today, more when other codebases ship.

**Consumer side (slipgate, ~1-2 hours of UI design + wiring):**
- `loaders/ezquake.ts` `loadEzQuakeCvars` filter: today it loads everything in the JSON; needs to either filter retired cvars to a separate map or include them with a marker the UI consults
- `CvarRow.tsx` / `CvarTooltip.tsx`: new visual state for "retired in 3.6.5" — different from "doc_only" (no source citation found) and from "unknown" (not in DB at all)
- `ConfigConverter.tsx`: retired cvars need their own status bucket (not "transferred", not "no equivalent" — "removed upstream, drop or migrate")
- Copy + visual design: how loud is the warning, what does the suggestion read

The right time to do all this is when the stale-config-warning UX is on the design table, not as a speculative one-off.

### Pressure

Low. Five cvars affected today; nobody has hit the use case in practice. Worth doing when slipgate's "open old config and tell me what's stale" feature gets prioritized.

### Related

- Producer: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`
- Consumer: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` + `src/components/CvarRow.tsx`, `CvarTooltip.tsx`, `ConfigConverter.tsx`
- DB query: `SELECT name, first_seen_version, last_seen_version FROM entities WHERE project='ezquake' AND type='cvar' AND source_state='source_retired'`
- Sibling shipped fix: `default_history` numeric-equality (commit `9917002`, 2026-04-26) — phantom transitions on cvars like `cl_bonusflash` no longer surface

---

## Phase 2d-2h: remaining QW knowledge rollout

**Added:** 2026-04-18 (originally as "Phase 2 schema + rollout")
**Updated:** 2026-04-20 — Phase 2c (4 more ezQuake types), 2c.5 (4 more + schema v2), and 2c.6 (asset consumption + schema v3) all shipped. ezQuake is fully loaded at head across 9 entity types (3849 entities total).
**Updated:** 2026-04-25 (late) — Deep-time walk reached **v3.0 floor**: 14 ezQuake versions clean (v3.0, v3.0.1, 3.1, 3.2, 3.2.1, 3.2.2, 3.2.3, 3.6.0/.1/.2/.5/.6/.8/.9, head). Pre-3.0 era explicitly de-scoped on community-security framing (infiniti). Walk infrastructure shipped: `extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version `backfill_match` detection + flicker-probe doc_only filter — all reusable for FTE/MVDSV/KTX walks. Schema v9 stamped (per-version transition log).
**Updated:** 2026-04-25 (late, post-QWCL) — **QWCL 2.33 SHIPPED** as the first cross-codebase port: 186 cvar / 120 command / 58 cmdline_param at qwcl@2.33; schema v10 widened the project CHECK across 8 tables; loader-side gates (`PROJECT_VERSION_ALIASES`, `PROJECT_HAS_ASSET_BUNDLE`, per-project `ENTITY_JSON_FILES`) parameterize the cross-project boundary. Quality grid 5/5 F1 PASS. Three QWCL-specific handlers under `apps/qw-oracle/scripts/extractors/qwcl/` reuse the shared Visitor + walk_tu_dispatch from `extractor_lib`. Next codebase port: FTE.
**Updated:** 2026-04-26 (late) -- **FTE Phase 2d-core SHIPPED.** build-6698 at SHA 35843773: 2379 cvars (1294 engine + 1085 plugin:ezhud) / 556 commands / 67 macros / 103 cmdline_params loaded clean. Schema v11 stamped (additive source_root TEXT column on cvar/command/macro version tables; NULL = engine for backwards compat). 4-variant matrix (client/server/win/client_vk); Apple variant verified unnecessary (0 Apple-gated cvars in FTE). ezhud plugin in scope; future plugins land via single-line allowlist addition to SOURCE_ROOTS. In-flight bug: flag_names inflation on 60 cvars from zero-extent INIT_LIST_EXPR field cursor pulling ambient TU tokens; fixed via parent VAR_DECL extent filter, single quality-grid anomaly probe guards regression. Field-accuracy audit 20/20 PASS post-fix. Quality grid 21/21 PASS. Phase 2d-bundle (asset extraction) gets a separate plan after this. Pass 1 (runtime cvarlist diff) DEFERRED -- requires operator-side FTE boot for cvarlist/cmdlist dump. Findings: docs/superpowers/specs/2026-04-26-fte-extraction-findings.md.
**Updated:** 2026-04-26 (afternoon) -- **Pass 1 CLOSED + Pattern 3 fix.** Runtime cvarlist diff against FTE build-6698 (qconsole.log via logfile 1) revealed 217 runtime-only cvars; root cause was Pattern 3 (cvar_t nested inside container struct/array initializers) which the handler did not detect. Fix shipped commits 274eb16 + 2e65839: any INIT_LIST_EXPR with libclang-resolved type cvar_t is now detected regardless of nesting depth. Recovered 103 cvars; total FTE cvars now 2482 (was 2379; engine 1294 -> 1397). Pass 1 residual: 114 cvars, all explained -- 26 non-ezhud plugins (IRC/XMPP/ODE/addon, out of scope), 27 Cvar_Get/Cvar_FindOrGet dynamic registration (fundamentally unreachable), 56 runtime-synthesized names without source literals (gl_ext_*, addon[N], music_playlist_*, fundamentally unreachable), 5 Win-SDK-blocked function bodies (deferred until stub-headers solve becomes pressure). Zero genuine extractor gaps under locked Phase 2d-core scope. Quality grid 21/21 PASS for all 3 projects. Phase 2d-core fully shipped.
**Updated:** 2026-04-27 -- **FTE Phase 2d-bundle SHIPPED.** Asset extraction landed at FTE build-6698: 28 asset_category entities + 61 asset_extensions + 13 asset_path_rules (all source_verified=1) + 25 asset_cvar_bindings + 717 asset_loader_sites. Five hand-authored seed YAMLs at `apps/qw-oracle/scripts/extractors/fte/seeds/` + two AST handlers (`_handler_asset_loader_sites.py`, `_handler_asset_cvar_bindings.py`) + path-rules verifier. extract-tag wired with PROJECT_HAS_ASSET_BUNDLE.fte=true and per-project ASSET_BUNDLE_FILE map. Quality grid extended to 30 probes (16 regression + 14 anomaly), all PASS/CLEAN. Three Path-1 fixtures at `fte/tests/test_fte_asset_paths.py` cover R_RegisterShader / FS_OpenVFS / COM_LoadFile patterns. Cross-engine spot-check confirms skin family resolves to :skin in both ezquake + fte; shader sites are FTE-exclusive (129 rows). Two known-limitation HANDOVER entries filed: plugin v-table asset detection (ezhud-only, low pressure) and cvar-binding handler indirection (engine-agnostic, ezQuake 23/24 + FTE 4/22 seed-not-corroborated, low pressure). Plan: `docs/superpowers/plans/2026-04-26-fte-phase-2d-bundle.md`. Spec: `docs/superpowers/specs/2026-04-26-cross-engine-alias-schema-design.md` (alias schema sub-thread shipped earlier in same arc).
**Updated:** 2026-04-27 (late evening) -- **Phase 2e MVDSV SHIPPED at HEAD.** 1235 entities loaded across 7 types into knowledge.db at version='head' (mvdsv `f816d2867b3d66f24c1553685041ee95cb7abcd5`, 2026-01-04 snapshot): cvar 183, command 108, cmdline_param 11, protocol_message 105 (NEW), info_key 44 (NEW; 18 `*`-prefixed system keys), log_template 691 (NEW; broadcast 32 / client 63 / console 544 / system 53), qc_builtin 93 (NEW; std_builtins 69 / ext_builtins 24 / ext_syscalls 4). All source_backed (MVDSV ships no help-JSON). Schema v15 added the four new entity types + per-version tables (pure-additive migration). Three-variant TU dispatch: server-base + server+Win + server+Linux with CMakeLists-verified defines (`SERVERONLY`, `USE_PR2`, `MVD_PEXT1_SERVERSIDEWEAPON{,2}`, `FTE_PEXT2_VOICECHAT`, `WWW_INTEGRATION`); protocol-extension constants reach via `-I src/qwprot/src` (qwprot submodule). Runtime validation against Ciscon's `1.20-dev` nicotinelounge.com dump (758 cvars + 107 commands, 2026-04-27): zero extractor gaps; two DB-only entries categorized in `apps/qw-oracle/scripts/extractors/mvdsv/OUT_OF_SCOPE.md` (`sys_sleep` Linux/Windows platform-split; `localcommand` gated by `-enablelocalcommand` cmdline). KTX-progs allowlist refined (7 false positives removed, 6 actual KTX-only added; final 13 entries). Quality grid extended with 11 MVDSV regression probes + 5 anomaly probes, all PASS/CLEAN, zero ezquake/fte/qwcl regressions. Six bug fixes shipped during validation: cvars `_trailing_comment` `};` literal anchor (commit `8747ad9`); `load-cvars.ts` `default_value` ast-block fallback (`9d61924`); `load-cmdline-params.ts` flat `ast.source_file` fallback recovering 11 source citations (`a905c22`); Python handler `payload_field` rename `variables`→`vars` and `cmdline_params`→`params` (`9d61924`); `load-version.ts` `validLogTemplate` carve-out for names with `:` / `%` / spaces / escapes (`9d61924`); `load-version.ts` `validInfoKey` `*`-prefix carve-out for QW system keys (`30969c1`, recovered 18 of 45). New patterns surfaced: function-banner harvest, TU-root cursor intercept for MACRO_DEFINITION, recursive `_resolve_*` AST walks for libclang `UNEXPOSED_EXPR` wrappers, `log_t logs[N]` struct-array `Cmd_AddCommand` recovery (parallel to ezQuake `log_t`), multiprocessing-safe two-row emission for cross-file resolution. `extract-tag --project mvdsv --version head` wires up atomic checkout + extract + load (4.4s for 51 .c files × 3 variants × 7 handlers). `build-snapshot --project mvdsv` intentionally unsupported (server-side; slipgate is the client). 26 commits `320f5de`→`c158da5`. Spec: `docs/superpowers/specs/2026-04-27-mvdsv-extraction-design.md`. Plan: `docs/superpowers/plans/2026-04-27-mvdsv-layer1-extraction.md`. Findings absorbed into EXTRACTOR-PLAYBOOK.md and the new `project_mvdsv_phase2e.md` memory.
**Status:** ezQuake head + deep-time walk complete (v3.0 to head); QWCL 2.33 shipped; FTE Phase 2d-core + 2d-bundle fully shipped; MVDSV Phase 2e fully shipped at HEAD. Next: Phase 2e KTX.

### What shipped through Phase 2c.6

- **Schema v3** at `apps/qw-oracle/scripts/load-knowledge/schema.ts` — entities with 9 type values (cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category) plus per-type version tables and 4 asset relation tables (asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites).
- **Loader pipeline** with `load-version`, `load-assets`, `diff`, `enrich` CLIs. Seed-first + AST auto-pass reconciliation proven against ezQuake head (bea2515). Phase 2b loader follow-ups (version-string comparison, blame memoization, src-prefix map, extractor trailing-whitespace) all drained 2026-04-20.
- **Extractors** in `apps/qw-oracle/scripts/extractors/ezquake/` for all 8 ezQuake entity types plus asset loader sites, cvar bindings, path-rules verifier. Hand-authored seed YAMLs in `apps/qw-oracle/scripts/extractors/ezquake/seeds/` for asset taxonomy and cvar bindings.
- **End-to-end loaded**: 3849 ezQuake entities, 110 asset_loader_sites, 26 asset_cvar_bindings, 14 source-verified path_rules, 17 asset_categories.

### Remaining sub-phases (roadmap reordered 2026-04-20)

**Tier 1 — Phase 2f Historical backfill (UNBLOCKED 2026-04-24).** Walk every ezQuake tag, diff consecutive tags, git-blame → PR enrichment. Reuses all extractors; pure orchestration. **Sanity-sample calibration cleared the same day:** 4 tag pairs eyeball-reviewed (3.6.5→3.6.6 regression + 3.6.1→3.6.2 oldest + 3.6.6→3.6.8 recent + 3.6.2→3.6.5 stress), all §8 thresholds hold at starting values, P1 detector bug (commit-UNKNOWN sentinel) fixed in-flight in `clusters.ts`, P3 semantic-pass abbreviation-bridge captured to its own HANDOVER entry. Full calibration note at `docs/superpowers/specs/2026-04-24-extraction-review-sanity-sample-calibration.md`. Extraction is ~55x faster via `extract-ezquake-unified.py` (shared-walk + 12-core parallelism, ~14s per tag vs 749s legacy sequential). Byte-equivalent to legacy output across HEAD + 3.6.6 + 3.6.0 + 3.2.3. Remaining cost is the per-pair walk time (operator judgment, not machine throughput).

**Tier 2 — Phase 2d FTE cvars -- SHIPPED 2026-04-26.** See Updated notes above. Pass 1 runtime cvarlist diff CLOSED (Pattern 3 fix + residual 114 all explained). Remaining FTE work: Phase 2d-bundle (asset extraction).

**Tier 3 — Phase 2e MVDSV + KTX.** MVDSV SHIPPED 2026-04-27 (1235 entities, schema v15, runtime-validated against Ciscon's 1.20-dev dump). KTX is tree-sitter-based (use `py-tree-sitter`, NOT Node `tree-sitter@0.25` which segfaulted on WSL/Node 20 during the spike).

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

## Semantic-pass abbreviation-bridge heuristic

**Added:** 2026-04-24 (sanity-sample calibration P3)
**Status:** Spec-ready. Not a Phase 2f blocker — operators catch these at walk time. Worth fixing during or before Phase 2f walks reach the affected pairs for better automation.
**Verification first:** `grep -n "abbreviation\|startsWith.*entity\|prefix.*release" apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` — if any match surfaces, this entry has been acted on and should be removed or updated.

The semantic pass in `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts` currently matches release-note bodies to clusters via (a) entity-name token overlap, (b) commit-message prefix tags (SECURITY:, RENDERER:, etc.), and (c) cross-name transforms for protocol extensions (`FTE_PEXT_*` ↔ `cl_pext_*`). It does not bridge **abbreviation ↔ expansion**.

### Concrete case that failed during calibration

3.6.1 → 3.6.2 has a 55-member cluster (PR 567 by ewhac, "INPUT: Restore joystick support") containing entities `joyadvanced`, `joyflysensitivity`, `joypitchsensitivity`, `joyindex`, `joyname`, `aux1`-`aux32`, etc. The associated release-note bullet reads *"Restore joystick support (ewhac)"*. The semantic pass did not propose cluster membership because no entity token literally equals "joystick" — they tokenize as `joy*` single-token names (no underscore) and `aux*`.

A human would bridge trivially: "joystick" starts with "joy", which is the common prefix of N cluster members. The detector should do the same.

### Proposed heuristic

Add to `semantic-match.ts` a fourth match path after (a)-(c):

1. For each cluster, compute a `prefix_signature`: the set of first-3-char substrings shared by at least 3 cluster members' first token. Example: joy-cluster → `{'joy'}`; hud_ammo cluster → `{'hud'}`; gl_outline → `{'gl_'}` (rejected, contains underscore — single-token only).
2. For each release-note body, tokenize to words (split on whitespace + punctuation).
3. For each word W of length ≥ 6, test whether W starts with any cluster's `prefix_signature` entry.
4. When match, propose cluster membership with rationale: *"abbreviation match: release-note word 'joystick' starts with cluster prefix 'joy' (N members share prefix)"*.

### Guard rails

- **Min word length ≥ 6:** avoids short-word coincidences. "joystick" (8) matches; "joy" (3) would not trigger match against itself (too short to be release-note expansion of anything).
- **Min shared-prefix char length ≥ 3:** avoids 2-char noise.
- **Min members sharing prefix ≥ 3:** avoids 2-member coincidences. 3+ members sharing `joy` as first 3 chars is a real family signal; 2 is too noisy.
- **Single-token names only:** gl_outline-family already clusters via `prefix:gl_outline` in the mechanical pass. Abbreviation bridge is specifically for entities whose names are single tokens without underscores (joy*, aux*, vmi*, etc.) where the mechanical prefix pass can't help.
- **Over-proposal is the designed failure mode.** Semantic pass output is a hint for operator confirmation at walk time. The mechanical pass's "17/26 annotated on 3.6.5→3.6.6" already demonstrates operators handle over-propose-then-filter comfortably.

### Known false-positive risk

"hudson" (6 chars) starts with "hud" → would propose match to a `hud_*` cluster even though it's coincidence. 3.6.2→3.6.5 release-notes contain no such words, but future tags may. Acceptable — operator rejects at walk. If the noise rate becomes a problem, tighten min-word-length to 7 or require the shared prefix to appear in ≥5 members.

### Test cases to include

- 3.6.1 → 3.6.2 release_notes:25 ("Restore joystick support (ewhac)") should propose joy-cluster.
- Grep past ezQuake release-notes for other candidates (particle, screen, console, etc.) and verify each proposes correctly or benignly misses.
- Negative: release-notes with no abbreviation-expansion content should not over-propose.

### File inventory

- Modify: `apps/qw-oracle/scripts/load-knowledge/review/semantic-match.ts`
- Verify: re-run `review --project ezquake --from 3.6.1 --to 3.6.2` and confirm release_notes:25 gains `proposed_cluster_id` pointing at the joystick cluster.

### Pressure

Low. Not blocking Phase 2f. Real walks will catch the gap at operator judgment time. If Phase 2f walks reach 3.6.1 → 3.6.2 before this ships, that's fine — manual bridge at walk.

---

## Layer 1 doc_only audit — closed with one deferred row

**Added:** 2026-04-24 (during weapon-scripts guide-rewrite Phase 3+4).
**Closed:** 2026-04-25 after seven shipped fixes (six extractor patterns + one loader dedup + one architectural multi-variant-parse change) with full primary-source verification per fix.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT type, COUNT(*) FROM entities WHERE project='ezquake' AND source_state='doc_only' GROUP BY type"` — current state: 160 cvar, 45 command, 3 cmdline_param, 2 macro = 210. Was 269 before fixes (269 → 239 extractor fixes → 232 Item A platform variants → 210 Item B type-mismatch dedup).

### What shipped (2026-04-25)

| Commit | Pattern | Recovery |
|---|---|---|
| c6fdcf3 | P5a (move `-DSERVER_ONLY` from client clang args to server) | +1 cvar |
| a099231 | P1 (detect `Cmd_AddLegacyCommand(old, new)` alias shims) | +40 commands (16 audit-flagged + 24 newly-discovered) |
| 8f67843 | P2 (struct-literal table: `log_t logs[]` in sv_ccmds.c) | +7 commands |
| 0f8f170 | P3 (nested cvar_t tables: `custom_model_color_t custom_model_colors[]`) | +10 cvars |
| 5dd466c | P6 (resolve `#define NAME "literal"` at Cmd_AddCommand call sites) | +1 command (vid_reload) |
| Item A | 4-variant parse architecture: `clang_args_win_for` + `clang_args_apple_for`, unified driver runs two extra TU parses per file with variant="client". Handlers unchanged — existing `variant == "client"` primary path covers the additive detection; per-file `_seen_in_file` dedup handles repeat visits. | +7 cvars (cl_verify_qwprotocol, con_deadkey, demo_capture_{codec,mp3,mp3_kbps,vid_maxlen}, in_ignore_deadkeys); bonus +1 asset cvar binding (demo_capture_dir at movie.c:430, WAVCaptureStart) and +1 cmdline usage site (gl_sdl.c:85). |

**Net:** 18 cvars flipped + 19 commands flipped + 24 new command entities discovered + 1 asset binding + 1 cmdline usage. Zero regressions (per-type before/after diff on all previously-source-backed names showed none lost).

### Pattern 4 reclassified — NOT an extractor bug

Handler `handler_macros.py` already parses `MACRO_DEF(name)` tokens from `macro_ids.h` at setup. The three remaining `doc_only` macro-family rows (`mp3_volume` as command, `mp3_volume` as macro, `mp3info` as macro) are genuine cat2 drift: the MACRO_DEF declarations persist in source but the corresponding `Cmd_AddMacro(macro_mp3_volume, ...)` call sites were removed when the MP3 feature was deprecated. These belong in the upstream help-JSON gap report, not the extractor fix queue.

### Deferred — `-nopriority` cmdline_param

Item A shipped 7 of 8 expected rows. The eighth — `-nopriority` at `sv_sys_win.c:645` — remains unrecovered. The 4-variant architecture is architecturally sound and reaches the file, but `sv_sys_win.c`'s `Sys_Init` function body references Windows SDK types (`VER_PLATFORM_WIN32_NT`, `GetCurrentProcess()`, `SetPriorityClass`, `HIGH_PRIORITY_CLASS`) via `#include <mmsystem.h>` and `<winsock2.h>` — headers that don't exist in the Linux libclang environment. With `PARSE_INCOMPLETE`, the file's top-level parses and the two `COM_CheckParm("-noerrormsgbox")` calls at lines 374/409 ARE captured (those call sites live in function bodies with fewer Windows SDK dependencies). The Sys_Init body at line ~623 refuses to parse cleanly past the SDL.h / winsock2.h errors, so the COM_CheckParm at line 645 is never visited by the walker.

Recovery options when this becomes pressure:
1. **Stub Windows SDK headers.** A minimal directory of empty/declarative `.h` files for winsock2, mmsystem, SDL, etc. at the root of `research/repos/ezquake-source/win-sdk-stubs/`, added to `clang_args_win_for` via `-I`. Adds env complexity; unblocks parsing of all Windows-specific TUs in one go.
2. **Hand-register the -nopriority row** in `help_cmdline_params.json` upstream and treat Linux-side extraction as silent on Windows-SDK-dependent call sites.
3. **Source refactor upstream** — split Sys_Init so the COM_CheckParm call isn't intertwined with Windows-SDK type usage. Unlikely to happen just for Oracle's benefit.

Low priority. Deferred until MVDSV or another engine hits the same wall — then solve in one place.

### Item B — help-JSON type-mismatch dedup (SHIPPED, commit `146cd73`)

Loader-side cleanup added to `load-version.ts`. At the end of each load-version transaction, entities of the current type with `source_state='doc_only'` and a same-name same-project `source_backed` counterpart under any OTHER type are deleted (version rows, transitions, overrides, entity row). Per-type-scoped + idempotent — each re-run cleans only what its own type would produce; already-clean DBs yield zero prunes.

Initial cleanup on ezquake head: **22 orphan rows pruned**:
- 15 `command doc_only` (12 HUD elements labeled-as-command in help_commands.json; 3 cvars labeled-as-command: `password`, `spectator_password`, `vid_fullscreen`)
- 7 `cvar doc_only` (2 commands labeled-as-cvar: `floodprotmsg`, `userdir`; 5 `scr_weaponstats_*` that became `command source_backed` via P1's Cmd_AddLegacyCommand detection while help_variables.json still lists them as cvars)

Verify-after-cleanup: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name, type, source_state FROM entities WHERE project='ezquake' AND name='radar' ORDER BY type"` — returns one row (`hud_element source_backed`). The earlier `command doc_only` orphan is gone.

### Pressure

None. Audit closed. `-nopriority` remains a known deferral with a clear recovery path (Windows SDK stub headers) if MVDSV/FTE need the same solve later.

### Related

- Findings doc (supersedes retraction): `docs/superpowers/specs/2026-04-24-layer1-doc-only-audit-findings.md` — being rewritten in same session
- Raw sweep TSVs: `docs/superpowers/specs/assets/2026-04-24-doc-only-sweep.tsv` + `assets/2026-04-24-doc-only-cat1-semantic.tsv`
- Extractor reference: `memory/reference_libclang_ezquake_extraction.md`, `memory/reference_asset_loader_extractor_capabilities.md`
- Schema field: `source_state` on `entities` table — `source_backed | doc_only | source_retired`. Load-bearing for data-quality queries.
- Cross-session lesson: every derived conclusion needs a primary-source check. This session overturned two prior rounds of analysis; the pattern of "analysis looked right at step N, was actually wrong" appears when queries aren't structure-verified first. Always `jq 'keys'` or equivalent before assuming the shape of what you're querying.

---

## Slipgate SCHEMA.md for snapshot consumer interface

**Added:** 2026-04-26 (after qw-config Half 2a + Arc 2 wrap-up).
**Status:** Deferred. Low-pressure observation, not blocking anything.
**Verification first:** `ls apps/slipgate-app/docs/SCHEMA.md 2>&1` should fail (file doesn't exist). `grep -n "interface RawVar" apps/slipgate-app/src/lib/config/loaders/ezquake.ts` should still surface the inline type. If either flips, this entry has been acted on.

### What's missing

Slipgate's `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` defines the consumer-side TypeScript interfaces (`RawVar`, `RawGroup`, `RawCommand`, `RawMacro`, `RawCmdlineParam`, `RawDefault`, etc.) that decode the JSON snapshots from oracle. They live inline in the loader file — fine while the schema is small and single-file.

The producer side (oracle) has `apps/qw-oracle/docs/entity-types.md` documenting the shape from the producing perspective. Slipgate has no equivalent doc on the consuming side.

### When this becomes worth fixing

When the next UI arc lands — surfacing the new enrichment fields (`source_state`, `first_seen_version`, `last_seen_version`, `default_history`) as visible UI elements (badges, pills, timelines). That arc will fan the type definitions out across multiple components and a SCHEMA.md becomes the natural single-contract doc. Until then, inline types are sufficient.

### Pressure

Low. Mode 1 trigger Q1 (durable data model) fires technically, but the schema is genuinely small and single-file today. Add SCHEMA.md when the inline types start to fragment.

### Related

- Producer-side equivalent: `apps/qw-oracle/docs/entity-types.md`
- Consumer types: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` (and siblings: `fte.ts`, `qwcl.ts`, `domains.ts`, `ktx.ts`)
- Snapshot files: `apps/slipgate-app/src/lib/config/data/*.json`

---

## Canonical-mode default for warehoused clients

**Added:** 2026-04-27 (after Phase 3 Windows smoke surfaced the multi-install + filename-preservation tension). **Reframed:** 2026-04-27 (afternoon — second-pass review session settled the four-tier opt-in ladder; canonical-naming is a *consequence* of the ladder, not a contested default).
**Status:** Plan-only design refinement landing in Phase 3.5 second-pass review. Phase 3 reverted its targetExeName-from-basename polish back to hardcoded `ezquake.exe` in `f6fe481`; canonical-only holds today and stays. The earlier framing of this entry (canonical-mode default with a messy-mode opt-out toggle, opt-out via Settings tab, schema gain `clients[family].mode`, mode-switching prompts) was DROPPED during the 2026-04-27 second-pass review — see `project_slipgate_tier_ladder.md` for the framing that replaces it.
**Verification first:** `grep -n 'targetExeName' apps/slipgate-app/src/components/ClientsTab.tsx` — should show `targetExeName="ezquake.exe"` hardcoded.

### The decision

When slipgate writes a client binary into a user's quake dir, the destination is always `<quake-dir>/<family>.exe` (`ezquake.exe`, `unezquake.exe`, `fte.exe`, etc.). No mode toggle. No per-import-decision. Canonical-only.

This applies in every code path that writes a binary:
- **Updater install** — already canonical (atomic rename to `ezquake.exe`).
- **Phase 3 swap** — already canonical (`swap_active_version` writes to the canonical slot).
- **Phase 3.5 bulk-import** — canonical via the canonicalize-on-import step (rename source if non-canonical, with user confirmation when canonical slot is empty; refuse with prompt when canonical slot already exists).
- **Future fresh-install / clean-room migration / bundle install** — canonical by construction.

### Why canonical-only (not "default canonical with opt-out")

The earlier framing assumed slipgate needed to accommodate users who run filename-versioned side-by-side installs (`ezquake-3.6.6.exe` + `ezquake-3.6.9.exe` simultaneously runnable as separate installs). The 2026-04-27 second-pass review changed that read:

1. **The product is a four-tier opt-in ladder** (don't use / read-only / managed versions / full dir management). The "I don't want slipgate to canonicalize my files" position is fully expressed by staying at Tier 0 or Tier 1 — slipgate doesn't write at all in those tiers, so naming policy is moot. There's no need for a Tier-2-flavor that writes-but-preserves-filenames. See `project_slipgate_tier_ladder.md`.

2. **Side-by-side simultaneous binaries is portable-mode multi-install territory**, not messy-mode territory. Phase 1 already shipped portable-mode (`<exe-dir>/data/portable.flag`). A user who genuinely needs two ezQuake binaries runnable at once can set up two quake dirs each with their own portable slipgate root. Each dir has its own canonical `ezquake.exe`. Both runnable, both Steam-pinnable. No toggles in slipgate's product.

3. **Bundles will absorb most "I want multiple setups" needs anyway.** "I want my slackers_tp setup AND my custom setup, both runnable, switch with one click" is a bundle-switching question (different teamsay configs / HUD overlays / scoreboard graphics layered on top of a shared binary), not a binary-version question. Bundle work is a future arc — see "Tier 3 future arcs" entry below.

A toggle to express "users who want messy-mode" only made sense if Tier 2 had to serve everyone. It doesn't — Tiers 0/1 + portable-mode + bundles serve the constituencies the toggle was for.

### What Phase 3.5 plan needs to absorb

Phase 3.5's plan at `docs/superpowers/plans/2026-04-26-add-quake-client.md` already has the bulk-import flow (scan → fingerprint → checklist → import). Canonical-only embeds at task 4.x ("Import selected"):

1. **Profile schema gain (smaller than the earlier framing).** Lift `quake_dir` to a top-level `setups[0].quake_dir` field, derived from `client.exe_path` parent on first migration. No `clients[family].mode` field. No mode tracking. The canonical exe per family is fully derivable: `<setups[0].quake_dir>/<family>.exe`.

2. **Canonicalize-on-import step.** For each ticked entry in the bulk-import checklist:
   - Hash, write blob, write manifest (existing flow).
   - **New:** if source filename is non-canonical AND no `<family>.exe` exists in the same dir yet → prompt "About to rename `<source>` → `<family>.exe` so slipgate can manage versions. OK?", default-yes. On confirm, rename source.
   - **New:** if source filename is non-canonical AND `<family>.exe` already exists in the same dir → leave source as-is (warehouse has the bytes; user can delete the duplicate later via MyQuake's "Delete from disk" action).
   - **New:** "Set as primary" radio sets the active version pointer to the canonical path.

3. **No Settings tab toggle.** Drop entirely.

4. **No mode-switching prompts.** Drop entirely. There are no modes.

5. **Variant filenames stay handled per D6** (filename-suffix variants `-glsl`, `-debug` map to canonical names like `ezquake-glsl.exe` with version key suffix `-glsl`). No conflict with canonical-only — variants ARE canonical-named, just with a stable suffix per the family's known-variant list.

6. **Phase 3 stub "Add Quake client" button** stays disabled until Phase 3.5 ships the bulk-import. Already true today.

### Don't do this in Phase 3

Phase 3 already shipped. The targetExeName-from-basename polish was reverted in `f6fe481` because preserving the user's filename produced the misleading-state problem (file named `ezquake-3.6.6.exe` containing 3.6.9 bytes after a switch). Hardcoded `ezquake.exe` is canonical-only's default and stays.

The foreign-exe Import affordance (also shipped 2026-04-27 in `e157e42`) stays — canonical-only just changes what happens *after* import (the canonicalize-on-import rename step lives in the bulk-import flow Phase 3.5 builds, not in single-exe Import).

### Pressure

Medium. Phase 3.5 plan revision is the immediate followup; this entry's reframe needs to land in the plan before code starts. ~30-40 minutes of plan editing once the captures (this entry + tier-ladder memory + Tier-3 future-arcs HANDOVER entry) are locked.

### Related

- Memory: `project_slipgate_tier_ladder.md` (the four-tier opt-in ladder framing this entry rests on)
- HANDOVER: "Tier 3 future arcs" entry below (clean-room migration + asset warehouse + bundle install + 1-click texture switch — future arcs sharing the warehouse substrate Phase 2/3 built)
- Plan: `docs/superpowers/plans/2026-04-26-add-quake-client.md` (Phase 3.5 plan being revised to absorb this)
- Plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (parent multi-phase plan; Phase 3 shipped 2026-04-27)
- Memory: `reference_three_tier_identity_model.md` (orthogonal — three-tier *identity* model for honest artifact classification, not the four-tier opt-in *ladder*)
- Phase 3 final state commits: `9051e4b` through `e157e42` + `3b2d831` (running-check guard) + `f6fe481` (canonical-mode revert)

---

## Phase 3.5a: Absorb Clients tab into MyQuake → Domains → Clients

**Added:** 2026-04-27 (late afternoon — surfaced during 3.5b second-pass review when entry-point ambiguity exposed an underlying IA tension). **Expanded:** 2026-04-27 (evening — operator added Feed-tab extraction + four-section drops after walking through the actual Clients-tab UI, screenshot 17:03).
**Status:** Plan ready for execution at `docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md`. Sequenced BEFORE Phase 3.5b. Frontend restructure; no Rust changes; no schema changes.
**Verification first:** `grep -n "Clients" apps/slipgate-app/src/components/SideNav.tsx` should still show the standalone Clients tab today. After 3.5a ships, SideNav contains Schedule / Profile / Feed / Tools / MyQuake / Settings (Clients out, Feed in); MyQuake → Domains has Clients sub-tab; dropped sections (Input, Video, Launch, Screenshot POC) are not visible anywhere.

### The triggers

**Trigger 1 (afternoon):** The 2026-04-27 second-pass review of the Phase 3.5b plan surfaced an entry-point contradiction: the plan said "Add Quake client" routes to MyQuake → Browse → Clients filter, but BrowseView is gated on `props.exePath` — meaning a Tier 1 → Tier 2 user (no exe configured yet) lands on a "Pick an ezQuake install in the Clients tab to browse its files" fallback. Circular dead-end. The deeper question surfaced: where does client management actually belong in the app? Operator's reframe: "its my quake, my clients" — client management belongs inside MyQuake the same way Configs management already does.

**Trigger 2 (evening):** Walking through the actual Clients-tab UI exposed that it has 7 sections, not the abbreviated count described in docs/OVERVIEW. Four of them don't belong in the new Clients-Domain home: Input + Video are redundant with Profile; Launch contradicts VISION's "Not a game launcher"; Screenshot POC is internal-only and graduates to Profile (profile-picture generator) when ready. Updates needs its own home — operator surfaced the Feed tab idea: a top-level "what's happening in QW right now" surface for tournaments + dev landscape + GitHub monitoring + Updates.

### The decisions

1. **Standalone Clients tab dissolves.** Replaced by:
   - **Feed (new top-level tab):** hosts the extracted Updates section. Future content (tournaments, dev landscape, GitHub monitoring) tracked in HANDOVER's "Feed tab future content" entry.
   - **MyQuake → Domains → Clients (new Domain sub-tab):** hosts Installation + Versions only.
2. **SideNav stays at 6 tabs:** Schedule / Profile / Feed / Tools / MyQuake / Settings (Clients out, Feed in).
3. **Four sections dropped from surface:** Input, Video, Launch, Screenshot POC. Code retained in version control; future arcs may resurface them elsewhere.
4. **Schedule stays as placeholder.** Matchscheduler website integration is parked until the app is closer to ship-ready (per VISION's "Partial: auth built, notifications planned" + operator confirmation 2026-04-27 evening).
5. **Tools stays separate.** Not Quake-only — sens-recalc and FOV-recalc are general FPS-gamer tools.

### Why this is structurally right

- **Matches the four-tier opt-in ladder.** MyQuake IS the surface for "your relationship to your quake dir." Browse mode = look at it; Domains mode = manage things in it. Clients-as-a-Domain joins Configs-as-a-Domain naturally.
- **Feed is the right home for "world activity."** Updates, tournaments, dev landscape, community announcements — all distinct from MyQuake (your local stuff) and Profile (you). Feed becomes the "what's happening in QW right now" surface.
- **Drops the redundant overlap.** Input/Video duplicated Profile's mouse + specs surfaces. Launch contradicted VISION's "Not a game launcher." Removing them reduces cognitive surface area.
- **Scales right with future Tier 3 arcs.** Bundle install, asset warehouse, texture-set switching all live in Domains alongside Clients. One navigation pattern, one UI grammar across all managed-content surfaces. Feed similarly scales for future external-content arcs (tournaments, dev landscape).

### Scope discipline (what's IN 3.5a)

- Extract Updates section out of ClientsTab.tsx into a new `UpdatesPanel.tsx`.
- Create new `FeedTab.tsx` containing Updates only (initial Feed content).
- Rename `ClientsTab.tsx` → `ClientsDomain.tsx`, trimmed to Installation + Versions sections only.
- Wire ClientsDomain into MyQuake → Domains → Clients sub-tab.
- Wire FeedTab into SideNav + App.tsx routing.
- Drop Input + Video + Launch + Screenshot POC sections from the surface (code retained per critical-context #17 in the plan).
- Migrate App.tsx tab routing + persisted state (`activeTab="clients"` → `activeTab="myquake"` + Domain `"clients"`).
- Verify nothing else broke (tsc / bun test / cargo build / Windows manual smoke).
- Single commit, push to main.

### Scope discipline (what's NOT in 3.5a)

- No fingerprinter, no release_cache, no AddClientPanel, no bulk-import. All Phase 3.5b.
- No Tools tab absorption.
- No VersionWarehouse component changes (Phase 3's shipped state stays).
- No Browse-view changes.
- No store schema changes.
- No Rust changes (pure frontend refactor; `screenshot.rs` Rust command stays callable even with no UI surface in 3.5a).
- No Profile screenshot-generator integration (future arc).
- No Schedule tab implementation (placeholder stays).
- No Feed-future content (tournaments / dev landscape / GitHub monitoring — future arc).

### Pressure

Medium-high. Phase 3.5b waits on this. ~3-4 hour fresh-terminal session (expanded from the original 1-2 hour estimate due to the Feed extraction + section drops).

### Related

- Plan: `docs/superpowers/plans/2026-04-27-clients-as-myquake-domain.md` (this phase)
- Plan: `docs/superpowers/plans/2026-04-26-add-quake-client.md` (Phase 3.5b — runs after this; pending pass-2 revision)
- HANDOVER: "Feed tab future content" (the post-3.5a content arc)
- HANDOVER: "Screenshot POC → Profile picture generator" (where the dropped Screenshot POC eventually graduates)
- HANDOVER: "Tray menu launch" (where the dropped Launch section may eventually resurface)
- Memory: `project_slipgate_tier_ladder.md` (the four-tier opt-in ladder framing this restructure embodies)
- Reference: `apps/slipgate-app/docs/OVERVIEW.md` § The 6 tabs (current IA before 3.5a ships)
- Reference: `apps/slipgate-app/VISION.md` § "Not a game launcher" (rationale for Launch drop)
- Memory: `feedback_verify_typescript.md` (mandatory `bunx tsc --noEmit` for slipgate frontend changes)

---

## Add Quake Client / MyQuake unification (post-Phase-3 scope sketch)

**Added:** 2026-04-26 night (extended design conversation after Phase 2 verification). **Plan written same night** at `docs/superpowers/plans/2026-04-26-add-quake-client.md` (commit `509f1e5`, 804 lines). **First-pass revised 2026-04-27 afternoon** in commit `01e4081` (canonical-only naming + tier-ladder framing absorbed). **Pass-2 reviewer feedback received 2026-04-27 (late afternoon)** — 14 findings F1-F14, plus four open operator decisions. **Rescoped 2026-04-27 (late afternoon)**: this is now Phase 3.5b; F1 (entry-point ambiguity) dissolves under the Phase 3.5a IA restructure (sequenced before this); F2-F14 + the four decisions remain in scope for a pass-2 plan revision.
**Status:** Plan needs pass-2 revision before execution. Top-of-file note in `2026-04-26-add-quake-client.md` flags this. Phase 3.5a (`2026-04-27-clients-as-myquake-domain.md`) MUST ship first — the AddClientPanel built in 3.5b lives inside the MyQuake → Domains → Clients surface that 3.5a creates.
**Verification first:** Read `2026-04-26-add-quake-client.md` top-of-file note, then `project_slipgate_tier_ladder.md` memory, then the four-tier-ladder HANDOVER entries above ("Canonical-mode default" + "Tier 3 future arcs"). The four open decisions (multi-quake-dir semantics, variant encoding, release_cache channel modeling, primary-radio swap-not-reconcile) need operator answers before the pass-2 revision can land.

### Pass-2 reviewer findings to absorb (F1 dissolved by 3.5a)

- **F2** (operational): Wire fingerprint into existing scan via a new `scan_clients_in_dir` thin Tauri wrapper around `fingerprint_folder`; keep `scan_quake_dir` unchanged. Lock the choice in the plan.
- **F3** (operational): `import_existing_install` is the wrong primitive for bulk-import (no fingerprint integration, no variant suffix, no canonicalize-rename, hardcoded `"imported"` channel). Either extend it or build a new bulk-import command that orchestrates rename → register → swap.
- **F4** (architectural — accept reviewer's pushback on D6): Variant encoded in the version key contaminates the shared `qw-version-resolution` lib (oracle's snapshot consumer in Phase 4/5 mis-attributes glsl-variant cvars). Decouple: add `variant: Option<String>` to `WarehousedVersion`, nest variants under the version dir as `binaries/ezquake/3.6.6/variants/glsl/manifest.json`. Version-resolution lib stays variant-naive.
- **F5** (operational): For the user's primary-radio choice, call `swap_active_version` (which honors the user's choice authoritatively), NOT `reconcile_active_version` (which observes whatever bytes happen to be at the canonical slot — non-deterministic with respect to user intent).
- **F6** (data correctness): FTE family canonical filename is `fteqw.exe`, NOT `fte.exe`. Verified at `research/repos/fteqw/CMakeLists.txt:1148`. Make family→canonical-filename mapping explicit in code.
- **F7** (data correctness): FTE server build (`fteqw-sv.exe`) shares `InternalName="ftequake"` with the client. Add explicit exclusion: filter on `OriginalFilename` ending `-sv.exe` or filename `.starts_with("fteqw-sv")` → return Unknown/NotAClient.
- **F8** (scope): Trim `KNOWN_VARIANT_SUFFIXES` from `["glsl", "debug", "dev", "test"]` to just `["glsl"]`. The broad list false-positives on user `myezquake-test.exe` cases. Add `-debug` only if/when a concrete debug-build case arrives.
- **F9** (honesty): `matches_official_release` strict-equality misses common cases — PE FileVersion is `3.6.6.7949` (4-component), GitHub tag is `3.6.6`. Either normalize via `parse_pe_version` first then prefix-match, or document explicitly that 3.5b ships strict-equality Tier 2 with known false negatives. Update goal statement to be honest about partial coverage.
- **F10** (operator decision needed): When bulk-import dir ≠ existing primary `quake_dir`, default behavior is currently "always overwrite" — this silently breaks the user's existing canonical install at the old dir. Operator's lean: warehouse-only without claiming the dir as primary. Confirm.
- **F11** (scope): "Delete from disk" action is referenced in the action grammar but never specified. Either spec it (`fs::remove_file` on a non-canonical exe path with safety guards: refuse if path is canonical slot, refuse if path matches active version's source) or remove from 3.5b action grammar and defer.
- **F12** (bookkeeping): `rename_to_canonical` Tauri command is hidden in prose; add to file-structure preview + the two-step Tauri registration tasks.
- **F13** (operator decision needed): release_cache channel modeling. ezQuake stable + snapshot have different distribution shapes but the cache keys by client only. Operator's lean: per-channel cache files (`release-cache/ezquake-stable.json` + `release-cache/ezquake-snapshot.json`).
- **F14** (honesty): Goal statement "switch to latest official one click away from any unrecognized state" is partial in 3.5b — works for ezQuake stable + unezQuake; nudge omitted for ezQuake snapshot (BuildsQuakeworld stub) + FTE (fetch_fte_builds stub). Acknowledge in goal or "What this plan does NOT cover."

### Four open operator decisions (need answers before pass-2 revision lands)

1. **Multi-quake-dir semantics** (F10) — operator lean: (b) warehouse-only without claiming primary. Confirm vs (a) refuse vs (c) explicit retarget prompt.
2. **Variant encoding** (F4 + D6) — operator lean: accept reviewer's pushback; split variant from version key. Confirm.
3. **release_cache channel modeling** (F13) — operator lean: per-channel files. Confirm vs one-file-multi-channel-shape.
4. **Primary-radio uses swap_active_version not reconcile** (F5) — accept reviewer's finding (no operator decision needed; reviewer's failure case is concrete).

### The core idea

Single button **"Add Quake client"** that routes into MyQuake's existing browser surface (already classifies files in the user's quake dir by type — see `apps/slipgate-app/src/components/MyQuakeTab.tsx` and the screenshot in operator's `Downloads/2026-04-26_20-35.png` if still present). MyQuake's left sidebar already shows "CLIENTS DETECTED" — this phase upgrades that from passive display to actionable.

Two affordances inside the panel (folder vs specific exe), single follow-up screen showing a checklist of detected clients (ezQuake / unezQuake-family / FTE / Unknown), user ticks what to import, picks one as primary via radio, hits "Import selected." Slipgate hashes + warehouses + writes manifests for each ticked entry. User curates exactly once at the moment they care; after that, slipgate has clean canonical knowledge.

### Why "single point of entry" is right (operator's framing)

Operator: "i would attempt to make it a single point of entry to simplify it for the user. Add Quake client, and then we have some good ui that guides the user to show us to the quake folder to scan, or a direct exe. but the main concept should resolve some of the burden. Cause during that step, the user would import them so we dont auto add everything."

Discovery-and-curation in one step replaces the alternative of either (a) auto-importing everything found (bloats warehouse with old beta exes the user forgot about) or (b) refusing to act (forces user to type paths). User-in-the-loop exactly once, at the moment they care.

### Three deliverables

1. **`ClientFingerprint` Rust module.** Reads PE resource strings (CompanyName, ProductName, FileDescription, OriginalFilename, FileVersion, ProductVersion, InternalName) — extends the existing `read_exe_version` infrastructure in `commands/ezquake.rs` (which currently reads only the numeric VS_FIXEDFILEINFO block) to also read the StringFileInfo block via a second `VerQueryValueW` call. Three classification rules from authoritative source evidence:
   - `InternalName == "ftequake"` → FTE
   - `ProductName == "ezQuake"` AND `version_string` substring-contains `"antilag"` (case-insensitive) → unezQuake-family
   - `ProductName == "ezQuake"` AND no antilag substring → ezQuake
   - Otherwise → Unknown / NotAClient (filtered out before user sees the import list)

   Critical implementation detail: enumerate the translation table per file, don't assume `040904B0` (ezQuake langid) — FTE uses `080904B0`. The diagnostic dance: query `\VarFileInfo\Translation` to get the lang+codepage pairs, then iterate them building `\StringFileInfo\<lang+cp>\<KeyName>` paths. See `feedback_substring_not_regex_fingerprinting.md` for why version-string matching uses substrings rather than regex.

2. **MyQuake browser integration.** The existing browser already does directory walking and per-file classification (file-type counts, etc.). Add a "Clients" first-class category with import actions on .exe rows. The CLIENTS DETECTED sidebar gains actionable rows: each detected client shows status (warehoused / not warehoused / active), and right-click or hover exposes "Import" / "Set as primary" / "Remove from warehouse." The "Add Quake client" button (stubbed in Phase 3) becomes "open MyQuake, filter to Clients, tick what you want, hit Import to warehouse."

3. **Release-cache Rust module.** Owns the per-client release-list fetch + cache + Tier-2 lookup. Reuses slipgate's existing GitHub Releases fetch from `commands/updater.rs` (which already fetches release lists when checking for updates) — caches responses at `<data-root>/release-cache/<client>.json`, refreshes-on-launch (cheap, <500ms total for 4 clients via parallel fetch). Consumed by both the fingerprinter (for Tier-2 cross-check) AND the existing updater (replacing its current ad-hoc fetching). Net architectural improvement: one source of truth for "what releases exist for client X", consumed by multiple features.

### Per-client distribution-model policy

The three-tier identity model (`reference_three_tier_identity_model.md`) doesn't apply uniformly. Different clients have fundamentally different distribution shapes:

| Client | Distribution model | Tier 2 viable? | Notes |
|---|---|---|---|
| ezQuake stable | GitHub Releases (~30) | Yes | ~1.5KB cached |
| ezQuake snapshot | builds.quakeworld.nu (rolling) | Yes (live) | Updater already scrapes |
| KTX | GitHub Releases (~30) | Yes | ~1.5KB cached |
| MVDSV | GitHub Releases (~30) | Yes | ~1.5KB cached |
| QWFWD | GitHub Releases (~30) | Yes | ~1KB cached |
| unezQuake | GitHub Releases (~30+) at dusty-qw/unezquake | Yes | ~1.5KB cached |
| FTE | Continuous nightly builds at fte.triptohell.info, no formal releases | **No** | Skip Tier 2 entirely |

For FTE specifically, the question "is this an official release?" doesn't map. Asking whether `FTE QW build 6428` is "official" is roughly like asking whether `git rev-parse HEAD` is "official" — yes, it's whatever the build system produced that day, no separate canonical-vs-unofficial axis exists. Classify as `FTE QW (build NNN)` without judgment; the upgrade-nudge UX becomes "build NNN is from <date>; latest available is build MMM" rather than "this is unrecognized."

### Variant tiebreaker rule (GLSL etc.)

ezQuake historically shipped both `ezquake.exe` and `ezquake-glsl.exe` — same version, same release, same PE strings, different binaries (different sha256). If a user has both warehoused, they'd collide at the manifest path (`binaries/ezquake/3.6.6/manifest.json`) but not the blob (sha256 different). Two reasonable resolutions:

1. **Variant in version key** — detect from filename (`-glsl` suffix → version becomes `3.6.6-glsl`). Different folder, no collision. Clean.
2. **Refuse second import if same client+version exists** — prompt user: "You already have ezQuake 3.6.6 warehoused. This binary has different bytes — replace, keep both as variants, or skip?"

Lean toward (1) for known filename-suffix variants (glsl, debug, etc.); (2) only as the safety net for genuinely surprising sha collisions. Pick during execution.

### Research artifacts

- `research/repos/unezquake/` — dusty-qw/unezquake cloned 2026-04-26 night; full history, all branches. Useful for future authority lookups (e.g., "did unezQuake ever ship version X").
- `research/repos/fteqw/` — already present; FTE source for fingerprinter design.
- `research/repos/ezquake-source/` — already present; ezQuake source for fingerprinter design and `winquake.rc` authority.

### unezQuake-fork lineage finding (for context)

During Phase 2 verification, operator's `ezquake-glsl.exe` (filename misleading) was identified as unezQuake-family via PE substring + behavioral cvar probing. Specific build (`3.6-dev-alpha10-antilag-r402`) doesn't appear in either ezQuake mainline OR dusty-qw/unezquake history (which started at clean v1.0 in Sep 2020). Lineage genuinely unresolved — possibly a pre-public dusty dev build, possibly a different antilag fork that predated dusty's project. **Not blocking** — fingerprinter design works regardless of which specific fork built it; the substring-based rule classifies correctly. Captured here as evidence for why the fingerprinter must be substring-based not regex-based: orphan binaries from forks we don't have local source for are the exact case that breaks brittle pattern matching. See `feedback_substring_not_regex_fingerprinting.md`.

### Pressure

Low for now — depends on Phase 3 shipping first to give the version list a home where the "Add Quake client" button lives and to prove the warehouse + swap pipeline works for multi-version scenarios. Once Phase 3 lands, this becomes the natural next priority because it's the first phase that delivers the user's broader product vision: "I want people to get updated clients instead of sitting on old stale stuff out of laziness." Three-tier identity surfacing + inline upgrade nudges are the UX that achieves this without lecturing the user.

### Related

- Memory: `reference_three_tier_identity_model.md` (Tier 1/2/3 principles)
- Memory: `reference_behavioral_probing_escalation.md` (cvar-existence checks as PE-string ambiguity escalation)
- Memory: `feedback_substring_not_regex_fingerprinting.md` (why substring beats regex for cross-version-history matching)
- Memory: `project_quake_dir_control.md` (multi-phase plan status; Phases 0+1+2 shipped)
- Plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (the original 6-phase plan; this entry sketches a phase that wasn't in the original scope)

---

## Tier 3 future arcs (clean-room migration + asset warehouse + bundle install)

**Added:** 2026-04-27 (afternoon — surfaced during Phase 3.5 second-pass review when the warehouse substrate's generalization to non-binary content became explicit).
**Status:** Future arcs, not Phase 3.5 scope. Captured here so the architectural insight isn't lost between Phase 3.5 ship and the first asset/bundle work. Each arc reuses the warehouse + swap substrate Phase 2/3 already shipped — content-addressed blobs, per-thing manifests, top-level index, atomic-rename swap to canonical slot — keyed at `<data-root>/<kind>/...` with `kind` parallel-able from binaries to assets to bundles.
**Verification first:** `ls apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs apps/slipgate-app/src-tauri/src/commands/version_swap.rs` — these are the substrate modules the future arcs parallel.

### The four future arcs

These arcs share an architectural realization rather than a feature spec. They land independently as separate plans when their preconditions arrive (Phase 3.5 shipped + Layer 1 asset mapping mature + assets.quake.world catalog live).

**A. Asset warehouse + 1-click texture-set switching.** Parallel modules `commands/asset_warehouse.rs` and `commands/asset_swap.rs` with the same shape as `version_warehouse` / `version_swap` but keyed at `<data-root>/assets/blobs/<sha256>.<ext>` and `<data-root>/assets/<kind>/<name>/<version>/manifest.json`. `register_asset` / `swap_active_asset` / `delete_warehoused_asset` Tauri commands. Atomic-rename swap to a canonical slot determined by the asset's kind (e.g. textures land at `<quake-dir>/qw/textures/<name>.<ext>`). 1-click switching between texture sets is the same operation as 1-click switching between client versions today — `swap_active_asset(name, target_version)` overwrites the canonical slot with bytes from a different blob. **Precondition:** Layer 1 asset-mapping fully shipped so slipgate knows where each asset kind's canonical slot is per quake dir convention.

**B. Bundle install (slackers_tp / curated nQuake-style).** A bundle is a manifest of (asset_id, version) pairs — slackers_tp could be `{teamalias_configs: 1.2, scoreboard_graphics: 0.4, skins: 1.0}`. Installing a bundle iterates the manifest and calls `register_asset` + `swap_active_asset` for each entry. Anyone can author a bundle; assets.quake.world hosts the catalog. The user's existing `slackers_tp.zip` in their quake dir today is the manual version of this — the future flow makes it native. Bundles are the answer to "I want my slackers_tp setup AND my custom setup, switch with one click" without needing a binary-level mode toggle. **Precondition:** Asset warehouse (A) shipped + assets.quake.world catalog API.

**C. Fresh-install / clean-room migration.** "I just installed slipgate, set up a clean managed dir for me." Slipgate fetches a chosen client version, downloads the GPL-allowed Quake content, applies one or more curated bundles, lands the result at a fresh `<quake-dir>` with everything at canonical slots. The clean-room variant is the migration path for a user with an existing messy dir: slipgate uses Layer 1 asset mapping to identify which files in the messy dir are real (vs cruft), copies the real ones to a new dir, and lets the user walk away from the old dir at their own pace. After extraction, the old messy dir CAN remain registered as a `role: "secondary-readonly"` entry in `setups[0].quake_dirs` so the user can still browse it via MyQuake — but slipgate doesn't write to it. Tier 1 → Tier 3 on-ramp. Operator's framing 2026-04-27: "since it knows asset mapping from the clients, it knows exactly what files its loading and touching ... so you can copy only those parts out, into a new dir, and let the app manage from there. then you can look at the old dir and know its all junk." **Schema substrate:** Phase 3.5b ships `setups[0].quake_dirs: QuakeDirEntry[]` plural-shaped per D9 — `role: "primary"` is the only value used in 3.5b; clean-room adds `role: "secondary-readonly"` without further schema migration. **Precondition:** Asset warehouse (A) + bundle install (B) shipped + Layer 1 asset mapping covers the kinds being migrated + a small Settings-tab "Quake dirs" manager UI for explicit add/remove/promote actions.

**D. MyQuake → Domains → Bundles dashboard.** First-class Browse-style catalog of warehoused bundles with the same Import / Set primary / Remove / Switch action grammar Phase 3.5 establishes for client versions. Bundle catalog browsing might also live as a slipgate-web hub view that deep-links into the desktop client (assets.quake.world's "Install in slipgate" button → routes to the desktop with the bundle id pre-selected). **Precondition:** Bundle install (B) shipped + slipgate-web design landed (gated on infiniti's OKLCH Harmonizer ramp).

### Architectural shape worth preserving

- **Warehouse substrate is content-kind-parallel.** `<data-root>/binaries/...` and `<data-root>/assets/...` and (later) `<data-root>/bundles/...` are parallel top-level dirs, not nested under a shared `warehouse/` root. Different content kinds, different blob extensions, different index shapes — but the same primitives (content-addressed blobs, per-thing manifests, top-level index, atomic-rename swap).
- **Action grammar is consistent.** Every Domain (Clients today; Assets, Bundles, Maps, Matches in future) reuses the same verbs: Import / Set primary or Set active / Remove from warehouse / Switch / Delete from disk. Phase 3.5's Clients-domain row is the first instance and sets the precedent.
- **Tier crossing is button-click, not global setting.** Per the four-tier opt-in ladder: a user moves from Tier 1 to Tier 2 by clicking "Add Quake client" / "Install update"; from Tier 2 to Tier 3 by clicking "Install texture set" / "Install bundle" / "Migrate to clean dir." No mode dropdowns, no global settings.

### Pressure

Low for now. Phase 3.5 must ship before any of this. Items A and B are the natural next two arcs after 3.5. Item C lands later. Item D is gated on slipgate-web. The point of capturing this is preserving the architectural framing during the gap, not pressure to start.

### Related

- Memory: `project_slipgate_tier_ladder.md` (the four-tier opt-in ladder this entry's "future arcs" sit at the top of)
- Memory: `project_slipgate_web_services_vision.md` (assets/maps/hub.quake.world triad + content-hash join key — the catalog side that A/B/D consume)
- HANDOVER: "Canonical-mode default for warehoused clients" entry above (the binary-domain version of canonical-naming-no-toggle that this entry generalizes from)
- Plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (parent multi-phase plan; Phases 0-3 shipped; Phase 3.5 wires the binary-domain consumer)
- Plan: `docs/superpowers/plans/2026-04-26-add-quake-client.md` (Phase 3.5 plan being revised)
- Substrate code: `apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs`, `version_swap.rs`, `warehouse_reconcile.rs` (the modules future arcs parallel)

---

## Feed tab future content

**Added:** 2026-04-27 (evening — surfaced when operator decided to extract the Updates section from the Clients tab into a new Feed tab during Phase 3.5a planning).
**Status:** Future arcs; not Phase 3.5a scope. Phase 3.5a ships the Feed tab with only the extracted Updates section as initial content. This entry captures the operator's intended Feed scope so the framing isn't lost between 3.5a ship and the first Feed-content arc.
**Verification first:** After 3.5a ships, `apps/slipgate-app/src/components/FeedTab.tsx` should exist and render only `<UpdatesPanel />`. No tournaments / dev landscape / GitHub monitoring surfaces.

### What Feed is

The "what's happening in QW right now" top-level surface. Distinct from MyQuake (your local quake stuff) and Profile (you). Conceptually a community + tooling activity feed — pulls in external data about Quake-world activity that isn't tied to the user's specific install.

### Future content types (each is its own arc)

**A. Tournaments.** Current + upcoming tournament data, probably consumed from hub.quake.world or a successor catalog. Eventually integrates with Schedule (your matches in scheduled tournaments). Out of scope until matchscheduler integration becomes a priority.

**B. Developer landscape.** Active QW projects (engine forks, server mods, tooling, community sites) with recent activity. Could pull from GitHub for any project with a public repo: ezQuake, FTE, KTX, MVDSV, QWFWD, unezQuake, plus tooling repos like nQuake distfiles, QW Hub, qw-stats, this monorepo, etc. Surface "what shipped recently" / "who's actively committing" / "what's getting attention."

**C. GitHub monitoring.** Subset of (B) but specifically the recent-releases and recent-commits firehose. Useful for "is there a new ezQuake snapshot since yesterday?" beyond the existing Updates section's per-project check. Could surface as a unified activity timeline.

**D. Community announcements.** Possibly. Discord pin scrapes, forum thread highlights, anything moderated as "community-relevant news." Lower-priority because Discord is already where this happens; slipgate doesn't need to compete.

### Operator's framing

Direct quote 2026-04-27: "i would almost create a new entry poiint all together called Feed.. where we can pull in data about current running tournaments, and whats the dewveloper landscape, where we have this github monitoring of the active quake projects."

### Pressure

Low. Phase 3.5a ships the empty Feed shell with Updates inside. Future content arcs land independently when each data source has a clear shape and the operator wants to invest. No specific trigger for any of A/B/C/D yet.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake → Domains → Clients" (the phase that creates the Feed shell)
- Memory: `project_slipgate_web_services_vision.md` (the assets/maps/hub.quake.world triad — adjacent ecosystem context, but Feed is a different surface from those catalogs; Feed pulls in activity, the catalogs serve content)
- Memory: `project_slipgate_tier_ladder.md` (Feed is orthogonal to the four-tier ladder — visible at all tiers since it's external content, not local writes)

---

## Screenshot POC → Profile picture generator

**Added:** 2026-04-27 (evening — surfaced when operator decided to drop the Screenshot POC section from the Clients-Domain surface during Phase 3.5a planning).
**Status:** Future arc; not Phase 3.5a scope. Phase 3.5a removes the Screenshot POC section from the user-facing UI but leaves the `screenshot.rs` Rust command intact and callable. This entry captures the eventual graduation path.
**Verification first:** After 3.5a ships, `grep -rn "capture_screenshot" apps/slipgate-app/src/` should return zero hits in the frontend (no UI calls the Rust command), but `apps/slipgate-app/src-tauri/src/commands/screenshot.rs` should still exist and `capture_screenshot` should still be registered in `lib.rs` handler block. Profile tab should still have its placeholder screenshot slots (per docs/OVERVIEW's Profile description).

### The use case

Profile pictures for slipgate users — generated from a shipped demo file with standardized scene / map / point-in-time, so flipping through profiles surfaces "different visuals, same scene" depending on each user's video setup (resolution, FOV, texture pack, conchars, HUD, etc.). 1-button-press generates 5 screenshots, replaces or augments the user's profile picture slots.

Operator's stated end-goal 2026-04-27: "for profile pictures, we can press 1 button and it generates 5 screenshots. for all users i our app they will look the same, in terms of same map, point in time etc. from a demo we ship with the app. so when you flip through profiles its the same screenshots just different visuals, depending on users setup."

### Why Profile is the right home

- Output IS profile pictures. The action button should live where the result lives.
- Profile tab already has placeholder slots for screenshots (per docs/OVERVIEW: "Output section — 'res @ Hz @ FOV' single-liner + screenshot placeholders").
- Closes a feature loop the Profile tab has been signaling for months.
- Alternative homes (MyQuake, Tools) don't fit: MyQuake is "your dir," Tools is for utilities, neither is "your identity."

### Concrete shape (when it lands)

- Profile tab gains a "Generate profile pictures" button near the existing screenshot slots.
- Click → guard "is ezQuake running? close it first" → spawn ezQuake with the shipped demo file + slipgate's mailslot puppet IPC → seek to predefined timestamps → screenshot at each → quit ezQuake → write the 5 PNGs into the user's profile-picture cache → display in the slots.
- Demo file ships with slipgate (small, GPL-clean, like a 30-second clip on a public-license map; e.g. operator picks a recreated scene from a famous match on dm3 or similar).
- The 5 timestamps capture different scene types: weapon-up close, enemy-engagement, item-pickup, movement, map-overview. So the 5 screenshots collectively give a sense of how the user's full setup looks.

### Preconditions

- Screenshot POC graduates from "internal-only, hardcoded path" to a real feature (per memory `project_slipgate_screenshot_automation`). Today's blockers: hardcoded `C:/Users/Administrator/projects/slipgate-app/assets/screenshots`, fragile timing, untested-at-scale.
- Demo file curation: pick the demo, ship it with slipgate, define the timestamps.
- Profile-tab UI work: the placeholder slots become real, with affordances for replace / regenerate / clear.

### Pressure

Low for now. The screenshot POC works end-to-end on operator's box but isn't user-ready. Profile-picture generation is a polish feature; it shines when slipgate has more users and the profile-card display matters. Until then, parking is fine.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake → Domains → Clients" (the phase that drops Screenshot POC from Clients-Domain)
- Memory: `project_slipgate_screenshot_automation` (the existing screenshot POC's design + current state)
- Source: `apps/slipgate-app/src-tauri/src/commands/screenshot.rs` (the Rust command that stays in place)
- Reference: `apps/slipgate-app/docs/OVERVIEW.md` § Profile tab (the screenshot placeholder slots that this feature fills)

---

## Tray menu launch

**Added:** 2026-04-27 (evening — surfaced when operator decided to drop the Launch section from the Clients-Domain surface during Phase 3.5a planning).
**Status:** Optional future arc; no specific trigger. Phase 3.5a removes the Launch section (Server input + Join / Spec / Launch buttons) from the user-facing UI per VISION's "Not a game launcher" framing. This entry captures the natural home if launch ever needs to come back.
**Verification first:** After 3.5a ships, no UI in slipgate spawns ezQuake. Users launch via ezQuake's own desktop shortcut. The `launch_ezquake` Tauri command in `commands/ezquake.rs` stays callable but no frontend code invokes it (except possibly the future Screenshot POC integration when that ships).

### Why Launch was dropped

VISION explicitly: "Not a game launcher. ezQuake handles that. The app can launch ezQuake with arguments, but it does not try to replace the client." The Server-input + Join/Spec/Launch buttons in the Clients tab gave users a quick-connect surface but duplicated functionality available elsewhere (QW Hub website's quick-connect, future `qw://` URL handler, ezQuake's own console). Dropping it shrinks slipgate's responsibility surface to match the stated product positioning.

### When this might come back

Three plausible triggers:

1. **Screenshot POC integration.** When the profile-picture generator ships (HANDOVER entry above), slipgate will need to spawn ezQuake with specific args (load demo, seek to timestamp, screenshot, quit). That uses the same `launch_ezquake` Rust command. If the user-facing surface for that is "click button in Profile," no tray-menu launch is needed; the button does it. If the architecture splits launch into a slipgate-managed surface, the tray menu becomes the home.

2. **Quick-join-from-tray UX desire.** Operator could decide in the future that "right-click slipgate tray → Quick join → server-IP-input" is genuinely useful even though VISION says slipgate isn't a launcher. Tray menu fits "invisible until needed" — visible only when right-clicking the tray icon, doesn't burn UI real estate.

3. **External "Launch in slipgate" deep links.** If hub.quake.world or assets.quake.world ships an "Open in slipgate" button (e.g. for "join this server" or "preview this asset"), slipgate needs an entry point that doesn't require navigating to a specific tab. Tray icon menu OR custom URL protocol handler are the options.

### Why tray over re-adding to a tab

- "Invisible until needed" matches slipgate's tray-app posture.
- Doesn't compete with VISION's "not a launcher" framing because it's not a primary surface; it's a contextual menu attached to the always-visible tray icon.
- Cheap to implement: Tauri v2 tray-menu plumbing already exists in `lib.rs` (per docs/OVERVIEW: "System tray — show/hide/quit menu, left-click toggles window, right-click menu"). Adding Launch / Join / Spec entries is a small extension.

### Concrete shape (when it lands)

- Tray right-click menu gains: separator → "Launch ezQuake" / "Join server..." / "Spectate server..."
- "Launch ezQuake" — spawns the active version directly (no args).
- "Join / Spectate server..." — opens a small input prompt for IP:PORT, then spawns with the appropriate args. Could reuse the `launch_ezquake` Rust command's existing options.
- No version-picker in tray; launch always uses the active version (`index.json:active`).

### Pressure

None. No specific trigger. Capture this so the natural home is documented if any future need arises.

### Related

- HANDOVER: "Phase 3.5a: Absorb Clients tab into MyQuake → Domains → Clients" (the phase that drops Launch from Clients-Domain)
- HANDOVER: "Screenshot POC → Profile picture generator" (one possible trigger for needing slipgate-side launch back)
- Source: `apps/slipgate-app/src-tauri/src/commands/ezquake.rs` (`launch_ezquake` — the command that stays callable)
- Source: `apps/slipgate-app/src-tauri/src/lib.rs` (existing tray-menu plumbing)
- Reference: `apps/slipgate-app/VISION.md` § "Not a game launcher" (the framing that justified the drop)

---

## Player profiles (bundle-shaped, share-via-hashlist)

**Added:** 2026-04-27 late evening — surfaced during Phase 3.5b pass-2 D9 conversation when operator described the "play like Milton" use case while picking the multi-quake-dir model.
**Status:** Future arc; needs its own research/design session before any implementation. Not Phase 3.5b scope and not blocking 3.5b decisions. Captured here so the framing isn't lost.
**Verification first:** No code today. The substrate that enables this — content-addressed warehouse (Phase 2/3 shipped) + plural-shaped `setups[0].quake_dirs` (Phase 3.5b ships per D9) + asset warehouse + bundle install (Tier 3 future arcs A + B) + assets.quake.world catalog (separate web-services arc) — is all preconditional.

### What player-profile import means

The "play like Milton" use case: a community member shares their setup with the app; another user imports it and can swap into Milton's setup vs their own with one click.

Operator's framing 2026-04-27 evening:

> "play like milton, we pull his 'profile' it consists of a list of assets he is using, or chose to share via the app. one or more assets we have to get for sure, is the configs. and maybe some custom graphics textures and what not. i imagine it knows what assets we have locally already, it would create a profile folder with the full manifest, but only put there what we dont have already in the own quakedir. or maybe even duplicate it. and then swap in and out between own profile and anothers. so it knows what should be in our own dir, when our profile is active. And in terms of what to load.. that is easy right. we know al the cmdline commands, i think there might even be something to load specific files or paks."

### Where this fits in the architecture

Player profiles are **bundle-shaped**. They reuse the future bundle-install infrastructure (Tier 3 future arc B) at a different abstraction level:

- A profile = a manifest of (asset_id, version) pairs, optionally with a filter (e.g. `onlyVisuals: true` excludes binds + movement to avoid overwriting the user's own gameplay setup).
- Content-hash dedupe: the warehouse already content-addresses blobs at `<data-root>/assets/blobs/<sha256>.<ext>`. If the user already has Milton's HUD overlay locally (same sha256), no re-download — just reference. If they don't, fetch from assets.quake.world.
- Storage: the profile manifest itself lives at `<data-root>/profiles/<profile-id>/manifest.json` (or similar). Bundle blobs reuse the asset warehouse — they're not duplicated per profile.
- Loading: swapping into Milton's profile means writing the profile's asset blobs to their canonical slots in the active quake dir. Or — if the user wants A/B without bulldozing their own setup — the profile lives in a separate registered dir (`role: "profile"` entry in `setups[0].quake_dirs`).

### Open questions for the design session

These aren't decisions for now; just the surface a future research arc would explore:

1. **Same-dir overlay vs separate-dir A/B.** Does Milton's profile overwrite my own canonical slots and require explicit "swap back to my own" actions? Or does it land in its own dir so I can launch from either? Both have UX merit.
2. **Filter semantics.** `onlyVisuals` is the operator's example. Other natural filters: `onlyHud` (HUD overlays + scoreboard graphics only), `onlyBinds` (controls only), `onlyConfigs` (everything but visuals). Should filters be enumerated or arbitrary key-list?
3. **Manifest authoring.** Who creates Milton's profile? Milton himself via slipgate's "Share my setup" action? Slipgate scans Milton's quake dir and produces a hash list? Both?
4. **Cmdline / asset-load semantics.** Operator noted "we know all the cmdline commands ... maybe our oracle would know" — slipgate may need to inject `gamedir`-switches or `exec` commands on launch to make the profile take effect. Oracle's command knowledge is the right consumer here.
5. **Profile versioning.** When Milton updates his setup, do existing profile imports auto-update? Pin to a specific version? Show a "Milton has a new profile version" notification?
6. **Privacy / sharing controls.** Not all assets are shareable (custom skins might be in good taste; account-bound items are not). Probably governed by whoever curates the catalog (assets.quake.world).

### Why not now

Operator's stated reasoning 2026-04-27: "this is probably also out of scope. because it requires its own full session research, how to handle profiles." Agreed. The bundle-install infrastructure (Tier 3 arc B) needs to ship first; profiles are a richer consumer of it. Doing profile design now without the bundle substrate would generate a lot of speculative work.

### Pressure

Low. No specific trigger. Captured to preserve the framing for the eventual research session.

### Related

- HANDOVER: "Tier 3 future arcs" — the bundle-install future arc (B) is the substrate this builds on
- HANDOVER: "Phase 3.5a" — the IA restructure that put Clients management in MyQuake, where profile management would naturally live too (likely as a future MyQuake → Domains → Profiles dashboard)
- Memory: `project_slipgate_web_services_vision.md` — assets.quake.world catalog with content-hash join key is the upstream source for profile manifests
- Memory: `project_slipgate_tier_ladder.md` — profiles are Tier 3 territory (require slipgate to manage parts of the user's quake dir actively)

---

## Plugin v-table asset detection (loader-sites handler)

**Added:** 2026-04-26 (during FTE Phase 2d-bundle Phase 1 ship).
**Status:** Known limitation; not a Phase 2d-bundle blocker.
**Verification first:** `python3 -c "import json; d=json.load(open('apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json')); sites=d['loader_sites']; from collections import Counter; print({k:v for k,v in Counter(('plugin' if '/plugins/' in (s.get('source_file') or '') else 'engine') for s in sites).items()})"` — should print `{'engine': 717}` (or whatever the current engine count is). Zero plugin entries = the gap is still present. A non-zero plugin count means someone has shipped the v-table detection.

### What's missing

The asset_loader_sites handler watches a fixed set of LOADER_FUNCTIONS (FS_OpenVFS, S_PrecacheSound, R_RegisterShader, etc.) and emits one row per direct CALL_EXPR. FTE plugins reach those same loaders indirectly: a plugin gets a `plugincorefuncs_t` struct from FTE at init, then calls `corefuncs->S_PrecacheSound(...)` or similar through the v-table. libclang sees this as a member-ref on a function pointer, not a CALL_EXPR with `spelling=='S_PrecacheSound'`, so the handler does not fire.

`plugin:ezhud` is the only QW-relevant plugin currently in scope that loads assets (HUD images via `Draw_CachePicSafe`-equivalent v-table calls). `plugin:ezscript` has zero asset surface (its only cvar is `ezscript_silentmode`; no images, sounds, models). Other FTE plugins (IRC/XMPP/ODE/etc.) are out of QW scope.

### Use case it blocks

A user's FTE+ezhud install has HUD-image PNGs that slipgate's directory scanner classifies via the asset_extensions seed (extension + path_hint match). The bundle's `asset_loader_sites` array does not show those images as having a registered loader site, but the categorization still works because `gfx/<image>.png` matches the `gfx/` path_hint in the extensions seed. The visible gap is in oracle's "show me every site that loads asset category X" query — plugin-side sites are missing.

### Why low pressure

ezhud is the only affected plugin. Its images ship bundled inside the FTE distribution; an installed user has them automatically. Slipgate's classification works via the extensions seed regardless. The only consumer that loses signal is a hypothetical "show me every plugin asset loader site for cross-engine impact analysis" query — which nobody has asked for.

### Fix shape (when it lands)

Two paths:
1. Detect the `plugincorefuncs_t` member-ref pattern in CALL_EXPRs and re-route to the corresponding LOADER_FUNCTION classification. Complicated because the v-table struct definition lives in `engine/client/plugin.h` and the field names map to function pointers, so we'd need a struct-aware pass.
2. Add a hand-authored seed that lists per-plugin known loader sites, similar to asset-cvar-bindings. Ezhud's loader patterns are stable enough to enumerate by hand.

(2) is faster to ship; (1) is more general. No decision yet — defer until a concrete consumer asks.

### Related

- FTE Phase 2d-bundle plan: `docs/superpowers/plans/2026-04-26-fte-phase-2d-bundle.md`
- Research artifact commit: `308da47`
- Bundle commit: `70d1d27`
- Sibling memory: `reference_asset_loader_extractor_capabilities.md`

### Pressure

Low. No ezhud feature blocks on this.

---

## qw-oracle DEVELOPMENT.md missing

**Added:** 2026-04-27 (during FTE Phase 2d-bundle wrap-up docs-check).
**Status:** Discoverability gap. qw-oracle is `Active` but lacks a `DEVELOPMENT.md`. Multiple test runners + verifier scripts live under `scripts/extractors/<project>/` without a central index.
**Verification first:** `ls apps/qw-oracle/DEVELOPMENT.md` should report no such file. `grep -nE 'test_fte|test_parameterized|asset-path-rules-verify' apps/qw-oracle/CLAUDE.md` should return empty (no command-block coverage of these surfaces).

### What's missing

`apps/qw-oracle/CLAUDE.md` has a `## Commands` block that documents the loader CLI (`load-version`, `extract-tag`, `quality-grid`, `build-snapshot`) and the MCP server boot. It does NOT document:

- **Path-1 fixture test runners.** Two exist today:
  - `apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py` (8 fixtures, ezQuake)
  - `apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py` (3 fixtures, FTE; shipped 2026-04-27)
- **Path-rules verifiers.** Two project-specific scripts:
  - `apps/qw-oracle/scripts/extractors/ezquake/asset-path-rules-verify.py`
  - `apps/qw-oracle/scripts/extractors/fte/asset-path-rules-verify.py`
- **Direct extractor invocations** for one-off runs (e.g., `python3 apps/qw-oracle/scripts/extractors/fte/extract.py --handlers asset_loader_sites --workers 1`). These get used for ad-hoc verification but aren't named anywhere a fresh contributor can find them.

### What good looks like

A `DEVELOPMENT.md` at `apps/qw-oracle/DEVELOPMENT.md` per the doc-philosophy template. Sections:
- "Run the loader" (mirror of CLAUDE.md `## Commands`, more verbose with examples)
- "Run the extractors directly" (per-project Python invocations)
- "Run the test fixtures" (Path-1 fixture commands per project)
- "Run the path-rules verifier" (per-project)
- "End-to-end smoke for a project" (combined recipe: extract + load + quality-grid + spot-check)

When this lands, trim the relevant entries from CLAUDE.md `## Commands` so the two files don't drift.

### Why low pressure

Existing operators (and Claude when given a session of context) find the runners through grep / git history. The gap costs ~30 seconds of search per onboarding event. Worth fixing in a docs-only session, not blocking any feature work.

### Related

- Doc philosophy reference: `~/.claude/skills/docs-check/references/doc-template.md`
- Sibling Layer 2 doc that DOES exist: `apps/qw-oracle/SCHEMA.md` (schema reference)
- Sibling Layer 3 stewardship doc: `apps/qw-oracle/concept-notes/OPERATIONS.md`

### Pressure

Low.

---

## Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)

**Added:** 2026-04-26 (during FTE Phase 2d-bundle Phase 1 ship).
**Status:** Known engine-agnostic limitation in `extractor_lib/handler_asset_cvar_bindings.py`.
**Verification first:** Run the bundle build for either project and inspect the reconciliation summary:
- `cd apps/qw-oracle && npx tsx scripts/load-knowledge/build-asset-bundle.ts --project ezquake --version head 2>&1 | tail -8`  -> `seedNotCorroborated: 23` (of 24 seed entries).
- `cd apps/qw-oracle && npx tsx scripts/load-knowledge/build-asset-bundle.ts --project fte --version build-6698 2>&1 | tail -8`  -> `seedNotCorroborated: 4` (of 22 seed entries).

Both engines exercise the same handler; the per-row miss is the same shape across both.

### What's missing

The handler emits a binding when a `cvar.string` member-ref appears in the same COMPOUND_STMT as a loader-function CALL_EXPR. That covers ~10% of real bindings. The other ~90% are missed because real code does multi-step indirection that the handler does not follow:

1. **snprintf chains.** `Q_strncpyz(name, baseskin.string, sizeof(name)); ...; FS_Open(name);` — the cvar.string is captured into a local buffer; the loader call uses the buffer, not the cvar directly. The two member-refs are in the same compound scope but the handler doesn't connect them across the buffer-write.

2. **CVARFC callbacks.** FTE registers `r_skybox` with a `R_SkyBox_Changed` callback (CVARFC macro). The asset load happens inside the callback (`R_SetSky`) which is invoked at runtime, not at the cvar registration site. The handler walks each compound scope independently; it doesn't follow function pointers.

3. **Multi-function call chains.** `cvar.string` -> `va()` -> wrapper function -> loader. Every additional function-call hop hides the cvar from the handler's same-scope detector.

### Why this is engine-agnostic

The handler is in `apps/qw-oracle/scripts/extractors/extractor_lib/handler_asset_cvar_bindings.py`. Both ezQuake and FTE use this code unchanged. The 23/24 vs 4/22 split is a function of how each engine's loader code is structured, not a function of the handler having different capabilities per project. Any future MVDSV/KTX seed will see the same shape.

### Why low pressure

The seed-not-corroborated rows are NOT lost. They land in the bundle as `seedRetained` with confidence `seed`. Slipgate's directory scanner reads them just like auto-corroborated rows. The signal that goes missing is "did the AST also see this binding?" — useful for spotting drift over time but not blocking any current consumer.

### Fix shape (when it lands)

The asset-loader-sites handler already has Path 1 structured extraction that follows buffer writes, format-call args, and deref-assignments inside a compound scope (see `reference_asset_loader_extractor_capabilities.md`). Lifting the same buffer-write tracking into the cvar-bindings handler would catch the snprintf chains. Following CVARFC callbacks would require resolving the callback function pointer to its target FUNCTION_DECL and walking that function's body — bigger surgery.

### Related

- ezQuake seed: `apps/qw-oracle/scripts/extractors/ezquake/seeds/ezquake-asset-cvar-bindings.yaml` (24 entries, 23 uncorroborated)
- FTE seed: `apps/qw-oracle/scripts/extractors/fte/seeds/fte-asset-cvar-bindings.yaml` (22 entries, 4 uncorroborated)
- Handler: `apps/qw-oracle/scripts/extractors/extractor_lib/handler_asset_cvar_bindings.py` (216 lines)
- Sibling reference: `reference_asset_loader_extractor_capabilities.md` (already documents the loader-sites handler's same-class capabilities)

### Pressure

Low. Bundle output is correct; only the AST-corroboration signal is partial.

---

## Sub-pattern 2b: cmdline variant-matrix gaps

**Added:** 2026-04-25 (surfaced during 3.6.0 deep-time walk, parked while shipping 2a + case-fold-merge + Path 2).
**Updated:** 2026-04-25 late — Recovery option 1 (`-U__linux__` to Apple+Win variants) shipped and flipped 2 of 4 entities. `clang_config.py` change in commit forthcoming.
**Updated:** 2026-04-25 (post-QWCL) — same root-cause re-confirmed during QWCL post-flight reconciliation. **11 QWCL cmdline params** also miss source citation for the same reason: their `COM_CheckParm` call sites live in `sys_win.c` / `vid_win.c` / `gl_vidnt.c` function bodies that reference unresolved Win32 SDK types (`__int64`, `LARGE_INTEGER`, `QueryPerformanceFrequency`, DirectDraw types, etc.) under Linux libclang, so PARSE_INCOMPLETE skips the compound statements. Affected: `-heapsize`, `-noautostretch`, `-nodd`, `-noddraw`, `-nodirectdraw`, `-nomtex`, `-novbeaf`, `-novesa`, `-nowd`, `-nowindirect`, `-starttime`. Manifest-fallback citation (which ezQuake has via cmdline_params_ids.h) doesn't apply since QWCL has no manifest, so these 11 surface as undeclared/literal-only entities with empty `usage_sites`. Same stub-headers solve closes ezQuake's 3 + qwcl's 11 together.
**Status:** Partial. ezQuake: 2 of 4 entities now source-cited at head: `-gl_ext` at vid_common_gl.c:340 (Win/Apple variant catches the FreeBSD/Apple block now that `__linux__` is undef'd) and `-allowmultiple` at sys_win.c:682 (Win variant reaches the simpler `Sys_Init_` body). 2 ezQuake entities + 11 QWCL entities remain manifest-fallback / undeclared-only and are gated on a separate SDK-stub-headers solve.
**Verification first:** check the AST output JSON. From the monorepo root: `python3 -c "import json; d=json.load(open('apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-cmdline-params-ast.json')); [print(k, len(d['params'][k]['ast']['usage_sites']) if d['params'][k]['ast'] else 0) for k in ['-gl_ext', '-nohwtimer', '-allowmultiple', '-gl-forward-only-profile']]"`. Expected current counts: `-gl_ext=1`, `-nohwtimer=0`, `-allowmultiple=1`, `-gl-forward-only-profile=0`. If `-nohwtimer` or `-gl-forward-only-profile` now shows ≥1, the SDK stub-headers solve has landed and this entry can be closed entirely.

### Remaining unresolved entities

Two cmdline_params still rely on the manifest-fallback citation only; their real `COM_CheckParm` call sites stay invisible to libclang under Linux:

| Entity | Real call site | Why libclang misses it |
|---|---|---|
| `-nohwtimer` | `sys_win.c:572` (inside `Sys_InitDoubleTime`) | Function body opens with `__int64 freq; ... QueryPerformanceFrequency((LARGE_INTEGER *)&freq)`. Windows SDK types (`__int64`, `LARGE_INTEGER`, `QueryPerformanceFrequency`) fail under Linux libclang; PARSE_INCOMPLETE recovery skips the compound expression containing the COM_CheckParm. Note: the simpler `if (COM_CheckParm(...))` at sys_win.c:682 (in `Sys_Init_`) and sys_win.c:1278 (in `WinMain`) ARE reached by the Win variant — only function bodies whose surrounding code can't be type-checked get skipped. |
| `-gl-forward-only-profile` | `gl_sdl.c:50` (inside `GL_SDL_SetupAttributes`) | Function body uses unresolved SDL macros (`SDL_GL_CONTEXT_PROFILE_MASK`, `SDL_GL_CONTEXT_FORWARD_COMPATIBLE_FLAG`, etc.) because `SDL.h` isn't found under Linux libclang. The COM_CheckParm at L50 is embedded in a compound expression `flags \|= cond && COM_CheckParm(X) ? Y : 0`; the parse-incomplete state of the surrounding statements blocks the cursor from surfacing. The simpler `if (COM_CheckParm(...))` calls at L78 and L97 in the next function (`GL_SDL_CreateBestContext`) DO surface — same SDL-missing context, simpler call structure. |

Probe-confirmed 2026-04-25 by directly parsing gl_sdl.c with the Linux client args: libclang surfaces only L78 and L97, not L50, despite L50 being in the always-compiled `#else`-of-`#ifdef __APPLE__` branch.

### Recovery option (consolidated with `-nopriority`)

Both remaining entities share the root cause of the deferred `-nopriority` cmdline_param in the (closed) Layer 1 doc_only audit: function bodies whose surrounding code references SDK types Linux libclang can't resolve. The previously-listed Recovery option 2 (stub Windows SDK / SDL headers under `research/repos/ezquake-source/win-sdk-stubs/`) would unblock all three at once. When MVDSV or FTE eventually hits the same wall, a stub-headers directory becomes the cleanest single solve for ezQuake / FTE / MVDSV / KTX simultaneously. Until then, manifest-fallback coverage means these are not grid anomalies.

### Pressure

Low. Manifest-fallback citations satisfy the grid; the residual gap is `loader_sites` analytics fidelity (queries like "which files actually call -nohwtimer" return empty for these two). The fix is consolidated with `-nopriority` so a single stub-headers effort closes all three deferred entities together.

### Related

- Cmdline handler: `apps/qw-oracle/scripts/extractors/extractor_lib/handler_cmdline.py`
- 4-variant clang args: `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py` (now with `-U__linux__` for Apple/Win)
- AST output: `apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-cmdline-params-ast.json`
- Loader fallback: `apps/qw-oracle/scripts/load-knowledge/load-cmdline-params.ts:28-40`
- Sibling deferred row: Layer 1 doc_only audit § Deferred — `-nopriority` cmdline_param

---

## Interactive HTML dashboard (deferred)

**Added:** 2026-04-22 late evening (during Pass 3 planning, after the design review surfaced conflicts between the original HTML dashboard plan and the monorepo doc philosophy).
**Status:** Shelved, not killed. Pass 3 shipped as a GitHub-navigable markdown reshape of `apps/qw-oracle/docs/entity-types.md` instead of a standalone HTML dashboard.
**Verification first:** `ls docs/architecture.html docs/architecture-data.json 2>&1` - if either exists, this entry has been acted on and should be removed or updated.

Why deferred (design review findings):

1. The doc-philosophy template has no class for a monorepo-wide HTML dashboard. Layer 1 quartet + Layer 2 conditionals + Layer 3 in-app reference docs is the full shape. Adding `docs/architecture.html` at monorepo root is a new artifact class that hasn't been planned.
2. Separate `.html` + `.json` forces double-bookkeeping between the authoritative JSON and the HTML's embedded copy (browsers block fetch on `file://`). That's exactly the drift risk the realignment is paying down.
3. GitHub doesn't execute HTML dashboards in the repo UI; a dashboard is only useful via GitHub Pages or a local clone. For the "external reviewers can see what we extract" goal, GitHub-rendered markdown is strictly better than HTML that requires a deploy or checkout.
4. The markdown reshape achieves the same reviewer outcome (top-of-file TOC + collapsible per-entity blocks + status-at-a-glance) with one file touched, zero build step, and doc-philosophy compliance.

### Unshelve triggers

Revisit if either fires:

- `entity-types.md` stops serving the user's mental-model-refresh need - i.e. scrolling through 14 collapsibles becomes meaningfully worse than a click-to-drill dashboard for quick orientation.
- External reviewers ask for something more visual than a markdown document.

### Fix shape (if unshelved)

The right shape for a dashboard at that point is likely:

- A ~50-line `scripts/build-dashboard.ts` (Bun/Node) that reads `apps/qw-oracle/docs/entity-types.md` and writes `docs/architecture.html` + `docs/architecture-data.json`. Markdown stays the single source; the HTML is regenerated.
- GitHub Pages deploy to publish the dashboard at a stable URL, so external reviewers click a link rather than clone the repo.
- docs-check integration to flag dashboard staleness when `entity-types.md` or the extractors change.

Committed reference assets for this future work:

- Visual target: `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html` (three-column + detail-panel pattern).
- Source content: `apps/qw-oracle/docs/entity-types.md` (10 entity types + 4 asset sub-relations with Pass 2 verification-status audit).

### Pressure

Zero. Not blocking anything. Only revive if the triggers above actually fire, not speculatively.

### Related

- Pass 3 final shape: `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md` § "Pass 3 — GitHub-navigable per-entity doc + README refresh" (revised 2026-04-22 late evening to drop the dashboard deliverables).
- Doc philosophy spec that drove the revision: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`.

## Workstream B: concept-note authoring scaffolding

**Added:** 2026-04-23 (session-close, after shakedown walk)
**Status:** Frontmatter schema + two-path framing + earn-the-note tests + note-shape taxonomy + all 4 note bodies landed in `apps/qw-oracle/concept-notes/` (2026-04-23). Still open: template MDX-compatibility test + authoring-ritual shape (lower priority now — 4 notes drafted successfully without formal ritual tooling, suggests natural authoring flow is sufficient).
**Verification first:** grep `concept-notes/README.md` for `primary_contributors` — if present, full frontmatter is landed. `ls apps/qw-oracle/concept-notes/*.md | wc -l` should return 7 (6 notes + README).

Concept-note bodies aren't the review skill's job; this workstream handled the non-body infrastructure. With all 4 queued bodies drafted and template stabilized across 3 drafting sessions, remaining items are minor polish rather than blockers.

### Done

- **Provenance frontmatter schema.** Fields `authored_by`, `source_url`, `imported_from`, `last_imported_at`, `upstream_status`, `upstream_target`, `primary_contributors` added to the template in `concept-notes/README.md`. Applies to both imported (path 1) and authored-here (path 2) notes.
- **Two-path curation framing.** Added to `concept-notes/README.md` ahead of the earn-the-note tests.
- **Earn-the-note tests.** 5 tests explicitly documented in `concept-notes/README.md` (previously only implicit in the `last_updated: 2026-04-22` bootstrap notes).
- **Entity-ref format formalized.** `<project>:<kind>:<identifier>` vocabulary including `ezquake:pr:<n>` for load-bearing PR provenance.
- **Topic vocabulary guidance.** `domain-guide` is intentionally broad / audience-agnostic; new topic values only when existing ones would actively miscategorize.
- **Recognized note shapes enumerated.** Narrative/history, taxonomy/classifier, domain walkthrough, policy+iteration-story — each with an exemplar note in the directory.
- **All 4 queued concept-note bodies from the 3.6.5 -> 3.6.6 shakedown walk landed** (2026-04-23 same-day). Security family (`client-side-server-exec-allowlist.md`), skywind (`skywind-animated-skyboxes.md`), FTE protocol extensions (`completing-legacy-fte-protocol-extensions.md`), ruleset anti-script pattern (`ruleset-anti-script-restriction-pattern.md`). Concept-notes directory now holds 6 notes (2 bootstrap + 4 from this session). **Correction captured during Track 2 drafting:** the greenfield-vs-retrofit framing in the original walk rationale was inaccurate — the 5 restriction primitives did not exist when smackdrive launched (Oct 2024); all 4 rulesets were retrofitted in one commit 2dbb3f1d (Feb 2025). The note reflects ground truth rather than the paraphrased rationale.

### Still open

- **Template MDX-compatibility test.** Generate one test note in the current template, check it renders through ezquake.com's vitepress pipeline (`research/repos/ezquake-docs/`). Fix template before writing four note bodies in a shape that won't PR cleanly upstream. Probably a 30-minute experiment: copy one concept note into `research/repos/ezquake-docs/docs/docs/_test.md`, run the vitepress build, eyeball output, delete.
- **Authoring ritual.** Session prompt shape, disposition-record handoff (skill -> author), cross-reference handling. Possibly a small skill or slash command; possibly just documentation in the README. Decide after drafting the first note (skywind) — implementation-level rituals are best derived from real experience.

### Pressure

Low. Does not block any other work. The four note bodies can be drafted without the MDX test — but if the test surfaces a template change, the notes would need retrofitting. Cheap to do the test first; cheap to retrofit if needed.

### Related

- Design doc: `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` (Workstream B section)
- Authoring template: `apps/qw-oracle/concept-notes/README.md`
- The 4 drafted notes: `apps/qw-oracle/concept-notes/{client-side-server-exec-allowlist,skywind-animated-skyboxes,completing-legacy-fte-protocol-extensions,ruleset-anti-script-restriction-pattern}.md`

---

## Workstream C: /docs ingest pipeline prep

**Added:** 2026-04-23 (session-close, after shakedown walk)
**Status:** Audit done (2026-04-24). License resolved by operator decision — treat as CC-BY-4.0. **Framing flipped 2026-04-25** after vikpe Discord confirmation that ezquake.com/docs is single-maintainer-plus-stepped-back: Oracle is the producer, ezquake.com is the downstream consumer, most "imports" become Path 2 rewrites. **Role map shipped 2026-04-24** resolving scale + voice questions (see Item 4). Gap-report format open and reframed as contributor onboarding kit. First Path-2 rewrite session on `weapon-scripts` pending.
**Verification first:** `ls research/repos/ezquake-docs/docs/docs/*.md | wc -l` should return 26; `ls research/repos/ezquake-docs/docs/docs/settings/*.md | wc -l` should return ~7-8. Total ~33 guide pages.

Preparation for importing ezquake.com/docs guide content into `apps/qw-oracle/concept-notes/` as Layer 3 baseline. No ingest work starts until remaining items resolve.

### Item 1 — audit (DONE 2026-04-24)

Full per-page classification of 30 guide pages. Buckets: **15 mirror** (community-earned guides worth importing), **10 ignore** (auto-gen reference already in Layer 1 — the 9 `settings/*.md` + commands/structure/faq), **4 split** (guide + reference mix requiring separation: command-line-parameters, macros, textures, triggers), **1 historical** (`upgrading.md`, pre-3.5 changelog). 32/33 guide pages content-stale since 2022-11-21, confirming the guide-frozen / reference-auto-updated asymmetry.

Mirror set (import candidates): `charsets.md`, `crosshairs.md`, `fakeshaft.md`, `frag-tracker.md`, `hud.md`, `independent-physics.md`, `message-filtering.md`, `multiview.md`, `particles.md`, `player-skins.md`, `scripting.md`, `server-browser.md`, `teamplay-communication.md`, `video-capture.md`, `voice-support.md`, `weapon-scripts.md`.

Split set (partial import, guide section only): `command-line-parameters.md`, `macros.md`, `textures.md`, `triggers.md`.

### Item 2 — license (RESOLVED 2026-04-24 by operator decision)

`QW-Group/ezquake.com` has no LICENSE file and `gh api` returns `"license": null`. Vikpe (original author of ezquake.com and /docs, confirmed in Discord 2026-04-24) stated his intent was GPL-2.0 "same as client." Adjacent `QW-Group/ezquake-source` is GPL-2.0.

**Operator decision 2026-04-24:** treat mirrored content as CC-BY-4.0. Rational community-scale risk assessment — guides were originally curated from old QW forums / articles / self-written over many years; original author consented verbally; QW community is small and nobody will contest a mirror. No LICENSE commit required before proceeding. Save the Discord screenshot as evidence alongside the per-note `source_url` + `primary_contributors` frontmatter.

**Not in scope for this HANDOVER:** persuading QW-Group to add a formal LICENSE file. If a future consumer ever needs cleaner legal footing, revisit.

### Item 3 — gap-report output format as contributor onboarding kit (OPEN)

Machine-readable + human-readable digest emitted per review run listing new entities that are reference-present but guide-absent, with enough surrounding context that a non-Oracle contributor can write the missing page from solid ground rather than from scratch.

**Reframed 2026-04-25** after Discord with vikpe: the guide corpus has had "1 edit beyond myself submitted in 6 years." The gap report isn't a PR queue — it's an onboarding kit. Someone wanting to help update ezquake.com should consume the gap report + Oracle's Layer 1/2/3 snapshots and be able to write a draft page without doing fresh research.

Output shape implications:

- **Per-gap entry carries everything needed to write the page:** Layer 1 facts (when added, by whom, related entities), Layer 2 testimony pointers (community discussion excerpts with message IDs), Layer 3 concept-note cross-reference if we've authored one.
- **Target primary format: Markdown** (human-readable, PR-ready-ish) with a JSON sidecar for future tooling. Not JSON-only — humans are the intended consumers of this specific output.
- **Explicit "suggested page target"** per gap (new page vs existing page + section vs multi-page split) to lower onboarding friction.

**Canonical "needs human docs" source set:** the help JSON emits `system-generated: true` for rows the extractor produced from source without any human-authored description. Combined with absent-desc detection (Workstream A item 8), the predicate `system-generated: true && desc: absent` is the canonical upstream-documentation-gap set — cvars/commands that ezquake.com reference pages auto-surface with empty descriptions because no human has written docs. Separate from the guide-gap set (entity undocumented in any `docs/docs/*.md` guide page). Both categories belong in the gap report but should be distinguished: help-desc PR to ezQuake vs guide-page PR to ezquake.com.

### Item 4 — role map + voice decision (DONE 2026-04-24)

Fresh-session analysis of the full 20-candidate /docs corpus against the 6 existing concept notes. Artifact at `docs/superpowers/specs/2026-04-24-layer3-role-map.md` (3873 words, evidence-cited). Resolves three load-bearing questions before Workstream C execution starts:

- **Scale.** Revised from ~15 mirror notes to **~22-26 Layer 3 notes** (11 full-note + 4 multi-concept guides yielding 2-3 notes each + 4 nugget-patch absorbed into siblings + 6 existing notes). Ignore-set validated (9 settings + commands.md auto-gen; `structure.md` is trivially-absorbable convention, not auto-gen — minor rationale correction from the audit).
- **D1 voice.** Seven roles surface in the corpus (R1 why-it-exists, R2 feature-family workflow, R3 pattern library, R4 convention specs, R5 infrastructure, R6 short how-to, R7 opinionated best-practice). Existing 6 notes are all R5. Incoming ~18 guide-derived notes are mostly R2/R3. **Tiered-voice decision**: one skeleton, voice register and length flex per shape. Captured in `concept-notes/README.md` § "Voice and length by shape" with a per-shape table. Two new shapes added to the shape catalog (Pattern library, Short how-to).
- **D2 R7.** Opinionated best-practice is absent from /docs (guides are toolbox-presentation, not normative) and absent from existing notes (template excludes editorial voice). **Parked as open bucket**: not required for C, not forbidden later. If/when R7 content is authored, it comes from Layer 2 testimony synthesis, separate authoring lane, does not block this workstream. README `Outside current Layer 3 scope` paragraph captures the parking.

**D3-D6 deferred to per-guide judgment during walks**: multi-concept splitting (4 guides), Layer-1-seed-vs-Layer-3 boundary for ~3 convention specs, R6 short-how-to posture, Path-1-vs-Path-2 per guide. No blocker; per-walk operator call.

**Coverage gaps** flagged in the role-map spec § 5: rulesets, cmdline params, macros, keynames, token primitives, flag bits, HUD child cvars at scale, and all post-2022 features are unserved by /docs. The gap-report output format (Item 3) should surface these for contributor onboarding.

### Why prep-before-ingest

The two-halves asymmetry of ezquake.com/docs (reference auto-updates via `data/ezquake/*.json`; guides frozen at ~2022-11-21) means the import target is well-scoped (the 33 guide pages, not the reference data). But the shape of the relationship with ezquake.com maintainers is load-bearing for the longer-term bi-directional flow — rushing into mirroring without license confirmation or nano's buy-in risks building on an unstable foundation.

### Pressure

Low. No downstream work blocked. Can proceed in parallel with Workstream A and B.

### Related

- Design doc: `docs/superpowers/specs/2026-04-23-layer3-pivot-design.md` (Workstream C section)
- Role map: `docs/superpowers/specs/2026-04-24-layer3-role-map.md` (evidence-based; resolves scale, D1, D2)
- Template with voice guidance: `apps/qw-oracle/concept-notes/README.md` § "Voice and length by shape"
- ezquake.com repo cloned: `research/repos/ezquake-docs/`
- Memory: `memory/project_layer3_two_path_curation.md` (updated 2026-04-23)
- Git-trail audit finding: 32/33 guide pages last content-edited <= 2022-11-21

---

## qw_event_log as cross-validation oracle for Layer 1

**Added:** 2026-04-27 (evening, surfaced during game-mechanics arc 1 wrap-up conversation).
**Status:** Captured for later — gated on KTX layer1 (arc 2c) shipping first.
**Verification first:** `ls /home/paradoks/projects/qw-event-log-handoff/crates/qw_event_log/src/{obituary.rs,events.rs} /home/paradoks/projects/qw-event-log-handoff/crates/qw_event_log/ARCHITECTURE.md` — all three files must exist. If the repo has been deleted or moved, the validation-oracle plan needs a new artifact source.

### What the artifact is

The repo at `/home/paradoks/projects/qw-event-log-handoff/` is the FROZEN handoff snapshot (commit `2c584b4` from vikpe/slipgate, March 2026) of `qw_event_log` — the Rust crate ParadokS authored with vikpe + Claude as PR #5 in vikpe's slipgate workspace. Parses MVDSV `.mvd` demos into structured `GameEvent` streams. Originally for slipgate-internal use; got packaged for Xerial's DEMOPASHA project when vikpe moved it aside to `.bak/` and started a fresh `demo_parser` rewrite.

Three internal artifacts have direct value for Oracle:

1. **`crates/qw_event_log/src/obituary.rs`** — exhaustive obit-string→cause map. 47 KILL_PATTERNS + 12 SUICIDE_PATTERNS + 16 WORLD_PATTERNS + 12 teamkill patterns. Each pattern annotated with a `WeaponType` enum value. Comment in source reads: *"Patterns sourced from KTX `client.c` ClientObituary and original id Software QuakeC `client.qc`."* Mixed origin — most patterns are KTX-only (e.g. `"X was brutalized by Y's quad rocket"`, `"X eats Y's pineapple"`, `"X discharges into the water"`), about 17 are id1-vanilla (`"X drowned"`, `"X was nailed by Y"`, `"X was telefragged by Y"`).

2. **`crates/qw_event_log/src/events.rs`** — `WeaponType` enum providing a clean unified death-cause taxonomy spanning vanilla weapons (RL/GL/LG/NG/SNG/SG/SSG/Axe), KTX-promoted distinctions (Discharge as own category vs id1's "selfwater"; Stomp; Squish), Telefrag, environmental (Lava/Drown/Slime/Fall/Trigger), Suicide (`/kill` command). Notable: `Trigger` covers both the noexit/exit-level kill AND mapper-controlled trigger_hurt — same QC mechanism, different obit strings.

3. **`crates/qw_event_log/ARCHITECTURE.md`** — ~350-line design doc. Documents the engine-protocol model: modern KTX kills flow through MVDSV's `DamageDone` hidden message (type 0x000C); legacy demos pre-DamageDone fall back to PRINT obituary parsing; environmental deaths arrive as `attacker = world` with no Kill event. Decision rationale captured throughout. This is the kind of QW infrastructure knowledge nobody else has packaged this cleanly.

### The validation-oracle role (NOT data import)

Earlier conversation framed this as "import the obit corpus into Layer 1." Operator's revised framing makes the role substantively better: use the parser as a permanent cross-validation oracle for Layer 1, not as a data source.

The loop:
1. Layer 1 ships hard facts (id1 today; MVDSV+KTX cvars in arc 2a/2b; KTX gameplay overrides in arc 2c — citations against `ktx/src/*.c` and `mvdsv/src/*.c`).
2. Build a harness that runs `qw_event_log` over a corpus of representative `.mvd` demos and aggregates observed event types: which deathtypes fire, at what frequency, paired with which obit strings.
3. Query Oracle for the corresponding rows.
4. Output a divergence report: did the parser observe an obit string Oracle has no row for? Did Oracle claim a death category nothing observed? Either signal is work to do.

Why this is materially better than one-shot import:
- No need to create speculative Layer 1 rows for KTX-only obit strings before KTX layer1 ships.
- Parser stays the ground truth for "what actually happens in real games" while Layer 1 stays the ground truth for "what the source code says." Two anchors, complementary.
- Generalizes beyond deaths. Same loop applies to weapon damage (parser observes hit damage values; Oracle has weapon damage rows), powerup respawn timers, mod-specific spawn rules.
- Survives `qw_event_log` being frozen: the validation harness can swap to vikpe's new `demo_parser` when it ships, since the role (parse demos, emit structured events) is stable while the implementation churns.

### When to build the harness

Sequence is rigid:
- Arc 1 (id1 game mechanics): SHIPPED 2026-04-27.
- Arc 2a (MVDSV cvars + commands): NEXT. Smaller than KTX, validates project-keyed schema works for a third codebase, gives us source-cited rows for `DamageDone` protocol references.
- Arc 2b (KTX cvars + commands): same extractor pipeline as ezQuake/FTE; reuses libclang + Visitor. KTX is C, not QuakeC.
- Arc 2c (KTX gameplay overrides): mirrors id1 game-mechanics work but extracted from C. Adds rows with `gameplay_source_id='ktx'` and populated `ruleset_gate_json`. THIS is the prerequisite for the validation harness because KTX-only obit strings need source-cited Layer 1 anchors.
- Arc 3 (validation harness): `apps/qw-oracle/scripts/validate-against-parser.ts` (or similar). Reads a `.mvd` corpus, runs the Rust parser as a subprocess (`cargo run --example parse_demo`), parses the JSON event stream, queries Layer 1, emits divergence report.
- Arc 4 (death-rules concept note): Layer 3 note "Death rules in QW" written once arcs 2c + 3 have proven Layer 1 covers what the parser sees.

### Caveats

- **Frozen snapshot risk.** README explicitly states the handoff is the frozen working copy; vikpe's new `demo_parser` will eventually supersede. Validation harness should either (a) point at whichever crate is current at harness-build time, OR (b) include the handoff source in its test fixtures and bump explicitly when newer parser becomes preferred.
- **Test coverage of the parser is partial.** README: "Tested on MVDSV demos. `.dem` (NetQuake) and `.qwd` (legacy QW) are partially supported by the `quake` crate but not exercised by `qw_event_log`." So validation against legacy QW demos may need the harness to skip those or stamp them as "parser doesn't see" rather than "Layer 1 has a gap."
- **Don't take a runtime dependency.** The repo is for one-shot tooling: build it locally, run it as a subprocess, parse stdout. Do NOT vendor it as a Cargo dependency in qw-oracle (which is TypeScript anyway), and do NOT fold it back into vikpe/slipgate.

### Related

- HANDOVER: "Layer 3 concept note: death rules" (consumes the harness output)
- HANDOVER: "Phase 2d-2h: remaining QW knowledge rollout" (drives the prerequisite arcs)
- Pre-plan: `apps/qw-oracle/docs/game-mechanics-preplan.md` Appendix B (KTX gameplay-override inventory; informs arc 2c work)
- Frozen-snapshot README: `/home/paradoks/projects/qw-event-log-handoff/README.md` (architecture summary, ParseOptions surface, DEMOPASHA integration notes)

### Pressure

Low. Multiple arcs gate the harness; nothing blocked downstream by this entry's existence. The value is making sure none of this gets forgotten between game-mechanics arc 1 ship and whenever the KTX work starts.

---

## SCHEMA.md doc-style inconsistency

**Added:** 2026-04-27 (evening, surfaced during game-mechanics arc 1 Task 2).
**Status:** Captured. Operator decides between two reshape options before next SCHEMA.md edit.
**Verification first:** `grep -nE "^## |^### v" apps/qw-oracle/SCHEMA.md | head -30` — should reveal three competing styles: topical H2 (`## Map knowledge layer`, `## Game mechanics knowledge layer`-target, `## Cross-cutting notes`), per-version H2 (`## v14 (2026-04-27): game-mechanics tables`, currently single-instance), per-version H3 (`### v10:`, `### v11:`).

### What happened

Task 2 of the game-mechanics arc 1 plan instructed: *"Append v14 section after the last v13 sub-heading. Add (matching the format of the v13 section verbatim — read it first):"* followed by a 20-line markdown block. The implementer ran the prerequisite grep, found that no `## v13` section exists in SCHEMA.md, and followed the literal plan instruction anyway — appending a new `## v14 (date): description` H2 section. Commit `8555f96`.

This introduced a third style nobody else uses. The doc previously had two:

- **Topical H2:** `## Map knowledge layer` documents v13's content thematically with a column-table + bold-prefixed paragraphs.
- **Per-version H3 inside `## Cross-cutting notes`:** `### v10:`, `### v11:` document additive migrations as version-numbered sub-sections.

The v14 entry now reads as a `## v14`-style top-level heading, matching neither.

### What's also stale (out of scope for the immediate fix but worth knowing)

- Conventions paragraph at top of SCHEMA.md says "schema v12".
- Migration walk text references "v1→v2→...→v11".
- Table map text says "Total: 22 tables at schema v12 + v13".

None of these were touched by this session. Whoever harmonizes the doc style should also catch these.

### Two reshape options

**Option A — Convert v14 to a topical heading.** Rename `## v14 (2026-04-27): game-mechanics tables (id1 baseline)` to `## Game mechanics knowledge layer`. Restructure the body to match the `## Map knowledge layer` template: column-table summary at the top, bold-prefixed paragraphs explaining each table, design-rationale links to spec/preplan. This makes the doc consistent with v13's style and aligns to "the doc is organized topically, not chronologically" framing.

**Option B — Harmonize to per-version style.** Promote the existing `### v10:` and `### v11:` H3s to H2 sections; relocate the v13 content from `## Map knowledge layer` into `## v13 (2026-04-27): map knowledge layer`; the v14 section already conforms. Ensures every schema bump gets a section, consistently.

Option A keeps the topical framing the doc currently announces (which is friendlier for "what does this DB hold?" reading) and is a smaller edit. Option B is more invasive but produces a chronologically-traceable schema history alongside any topical content.

### Pressure

Low. The v14 facts are correct; only the structure is inconsistent. Address before the next SCHEMA.md edit (e.g. when MVDSV/KTX arc 2 changes the schema again — that's a natural time to sweep).

### Related

- SCHEMA.md current state: `apps/qw-oracle/SCHEMA.md`
- v14 section added in commit `8555f96`
- Plan that produced the inconsistency: `docs/superpowers/plans/2026-04-27-qw-oracle-game-mechanics-id1-baseline.md` Task 2

---

## FTE asset bundle consumer wiring

**Added:** 2026-04-27 (orchestrator wrap-up).
**Status:** Producer side shipped (`apps/slipgate-app/src/lib/config/data/fte-asset-bundle.json` exists with 28 categories / 61 extensions / 13 path_rules / 25 cvar_bindings / 717 loader_sites). Consumer side untouched — slipgate's classifier reads ezQuake bundle only. Not in any current plan.
**Verification first:** `grep -n "ezquake-asset-bundle\|fte-asset-bundle" apps/slipgate-app/src/lib/assets/bundle.ts` should currently show only the ezQuake import on line 2. When this returns both, this entry has been resolved.

### What's missing

`apps/slipgate-app/src/lib/assets/bundle.ts` line 2 hardcodes `import raw from "../config/data/ezquake-asset-bundle.json"`. The MyQuake → Browse → Domains panel's `FILTER BY DOMAIN` classification (Texture / Sound / Demo Recording / Skybox / etc.) is driven entirely by the ezQuake bundle today. The FTE bundle file sits in the data dir but no slipgate code imports it.

### What it would take

Three small pieces of consumer-side wiring:

1. Refactor `bundle.ts` to load both bundles into a per-engine map (or add a parallel `bundle-fte.ts` and have the classifier merge). New file/refactor either way.
2. Project-aware classification at the call sites — when classifying files in a quake dir, decide whether to apply ezQuake rules, FTE rules, or both. Default-both-with-ezQuake-priority is probably the right starting policy until there's a reason to differentiate.
3. UI surface — possibly nothing changes (more files become classified instead of hitting "other"); possibly a per-engine filter toggle for power users.

Half-day to one day of slipgate work.

### Why it's worth tracking

The producer-side investment for FTE asset extraction was significant (Phase 2d-bundle, ~5 hours of work across 2 implementation sessions). Without consumer wiring, that data sits unused in the repo. The asset overlap between ezQuake and FTE is high (~70% — sounds, models, configs, demos, screenshots are identical) so the user-visible delta is bounded. The genuinely FTE-specific gain is shaders, heightmaps, .po localization files, and FTE-specific path conventions for skybox / skins.

### Pressure

Low. Slipgate isn't shipping. The ezQuake-only classifier still does most of the useful work. Worth doing when a slipgate-side arc next touches the asset classifier — probably during Phase 3.5a (MyQuake → Domains restructure) or whichever Tier 3 future arc lands first.

### Related

- Bundle consumer: `apps/slipgate-app/src/lib/assets/bundle.ts:2`
- Producer-side ship: HANDOVER `Phase 2d-2h` entry, line item "FTE Phase 2d-bundle SHIPPED 2026-04-27"
- MyQuake screenshot the user shared during the orchestrator wrap-up: `/mnt/c/Users/Administrator/Downloads/2026-04-27_15-17.png`

