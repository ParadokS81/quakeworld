# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Map knowledge layer SHIPPED](#map-knowledge-layer-shipped) — **NEW 2026-04-27, FULLY SHIPPED 2026-04-27.** Sidequest from a support-channel question oracle couldn't answer. New `maps` table (schema v13), 254 maps loaded (38 id1 stock + 216 maps.qw.nu/base/). Two new MCP tools (`lookup_map`, `search_maps`). Snapshot to slipgate at `apps/slipgate-app/src/lib/config/data/qw-maps.json`. Deferred follow-ups: slipgate map-browser UI, advanced search filters, author seed-YAML curation, automated quarterly stats refresh, future maps.quake.world richer-metadata refactor (release dates, README content).
- [Cross-engine alias scaffolding + slipgate version-awareness](#cross-engine-alias-scaffolding--slipgate-version-awareness) — **NEW 2026-04-26, sub-threads #2 + #3 SHIPPED later that day.** Umbrella for an arc spanning ezscript extraction, cross-engine alias schema, default-drift triage, and the structural shift that slipgate consumers should be version-aware. Sub-thread #2 (schema spec) + sub-thread #3 (schema migration v11→v12 + ezscript handler + 38 alias entities loaded at FTE@build-6698) closed; sub-thread #5 (slipgate consumer version-awareness) tracked-by Quake Dir Control plan; sub-thread #4 (FTE asset bundle) still open as adjacent track.
- [Retired cvars in snapshot + stale-config warning UX](#retired-cvars-in-snapshot--stale-config-warning-ux) — **NEW 2026-04-26.** Coupled producer+consumer work blocked on UX design. The `build-snapshot` CLI today emits only entities present at head (2,899 ezquake cvars; 2,835 source_backed + 149 doc_only). 5 retired cvars (`cl_showkeycodes`, `gl_smoothfont`, `keymap_name`, `r_fx_geometry`, `scr_printspeed` — alive in v3.0 through 3.6.2, removed before head) are silently dropped. Use case it blocks: opening an old config in slipgate where `keymap_name "us"` is present and getting a truthful "this was removed in 3.6.5" message instead of generic "unknown cvar" treatment. Defer until the stale-warning UX is on the table.
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — **QWCL 2.33 SHIPPED 2026-04-25** + **FTE Phase 2d-core SHIPPED 2026-04-26** + **FTE Phase 2d-bundle SHIPPED 2026-04-27** (28 asset_category + 61 extensions + 13 path_rules + 25 cvar_bindings + 717 loader_sites; quality-grid 30/30; 3 Path-1 fixtures green) + **Game-mechanics arc 1 SHIPPED 2026-04-27 evening** (schema v14: gameplay_sources/gameplay_entity_defs/gameplay_mechanics; 37 entities + 41 mechanics from id1 QC; 4 new MCP tools; SERVER_VERSION centralized 12 sites→1; v4 splits: telefrag/exit_level_kill + trigger_hurt env_hazard; commits a3dddc6→6110901) + **Phase 2e MVDSV SHIPPED 2026-04-27** (schema v15: protocol_message/info_key/log_template/qc_builtin; 1235 entities at mvdsv f816d28 head; runtime-validated against Ciscon's `1.20-dev` dump with zero extractor gaps; 26 commits `320f5de`→`c158da5`) + **Phase 2e MVDSV follow-up arc SHIPPED 2026-04-28** (schema v17: info_key cross-scope split, protocol_message 13-kind taxonomy, log_template all_call_sites_json, cvar flags_raw + escape normalisation, F1.*.count equality probes; 5 commits `f7b2a7a` -> `72a1630`). ezQuake deep-time walk at v3.0 floor. Remaining: Phase 2e-deep-time MVDSV (after KTX), Phase 2e KTX cvars (after MVDSV), Phase 2e KTX gameplay overrides, qw_event_log validation harness, Phase 2g MCP tool upgrades, Phase 2h automation.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — P3 from 2026-04-24 sanity-sample calibration. Release-notes using feature full-names (joystick) don't match clusters of abbreviated entity names (joy*). Not a Phase 2f blocker; worth fixing during or before real walks reach affected pairs.
- [Layer 1 doc_only audit](#layer-1-doc_only-audit--closed-with-one-deferred-row) — **CLOSED 2026-04-25 with one deferred row.** Six extractor patterns + one architectural change + one loader dedup shipped across the session: P1 Cmd_AddLegacyCommand, P2 log_t table, P3 nested cvar_t tables, P5a SERVER_ONLY misplacement, P6 #define resolution, Item A 4-variant parse architecture, Item B cross-type help-JSON orphan prune. Prior retraction was itself wrong (extractor was missing these; the "all 73 cat1 present in AST" claim was based on a second misreading). Doc_only 269 -> 210; zero regressions; +24 newly-discovered command entities; +1 asset cvar binding; +1 cmdline usage. Deferred: `-nopriority` cmdline_param at sv_sys_win.c:645 (requires Windows SDK headers unreachable on Linux libclang). One entry remains until MVDSV/FTE hit the same wall — then stub-headers solution lands in one place.
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Workstream B: concept-note authoring scaffolding](#workstream-b-concept-note-authoring-scaffolding) — provenance frontmatter landed in `concept-notes/README.md` 2026-04-23; still open: template MDX-compatibility test against ezquake.com vitepress, authoring-ritual shape (prompt/slash-command).
- [Workstream C: /docs ingest pipeline prep](#workstream-c-docs-ingest-pipeline-prep) — **Audit completed 2026-04-24** (15 mirror, 10 ignore, 4 split, 1 historical across 30 guide pages). **License resolved by operator decision 2026-04-24**: treat as CC-BY-4.0, vikpe consented verbally on Discord, no LICENSE commit required. **Framing flipped 2026-04-25**: ezquake.com/docs is single-maintainer-plus-stepped-back (vikpe: "1 edit beyond myself submitted in 6 years"); Oracle is the authoritative current-state source and upstream is the downstream human-readable surface. Most "imports" will actually be Path 2 rewrites citing upstream as source material rather than Path 1 mirrors. **Role map shipped 2026-04-24** (`docs/superpowers/specs/2026-04-24-layer3-role-map.md`): scale revised to ~22-26 notes; 7 roles surfaced; D1 voice resolved to tiered-per-shape; D2 (R7) parked as open bucket. **Two Path-2 rewrites shipped 2026-04-24/25**: `weapon-scripts.md` (first R7 exemplar) and `lightning-gun-customization.md` (second R7+R2 exemplar). Authority-grounding triad and progressive-disclosure structure both confirmed across 2 notes — pending 3rd-instance promotion to README rule. **Skill process improvements landed 2026-04-25**: Phase 7.5 operator consult gate + Phase 5b six-mechanism ruleset scan + help_remarks pull (in `~/.claude/skills/guide-rewrite/SKILL.md`). Remaining: gap-report output format as contributor onboarding kit (continues to grow), next guide rewrite (candidates: `scripting.md` for multi-concept ROI, `player-skins.md` for tighter scope).
- [Slipgate SCHEMA.md for snapshot consumer interface](#slipgate-schemamd-for-snapshot-consumer-interface) — **NEW 2026-04-26.** Slipgate's snapshot consumer types (`RawVar`, `RawCommand`, `RawMacro`, etc.) live inline in `apps/slipgate-app/src/lib/config/loaders/ezquake.ts`. The shape is small and single-file today, but the upcoming UI arc surfacing version-arc badges / source_state pills / default_history timelines will benefit from a single typed contract doc paired with oracle's `apps/qw-oracle/docs/entity-types.md` (the producer-side equivalent). Defer until that UI arc starts; revisit if the inline types start to fragment.
- [Feed tab future content](#feed-tab-future-content) — **NEW 2026-04-27 (evening).** The new Feed top-level tab created in Phase 3.5a hosts only Updates initially. Operator's intended Feed scope: the "what's happening in QW right now" surface — current/upcoming tournaments, developer landscape (active QW projects, recent commits / releases, project announcements), GitHub monitoring of the engine + tooling repos, possibly community announcements. Each future content type is its own arc with its own data source. Captured here so the framing isn't lost between 3.5a ship and the first Feed-content arc.
- [Screenshot POC → Profile picture generator](#screenshot-poc-profile-picture-generator) — **NEW 2026-04-27 (evening).** The Screenshot POC section was dropped from the user-facing Clients-Domain surface in Phase 3.5a, but the underlying `screenshot.rs` Rust command stays callable. Future arc graduates the POC into Profile as a "Generate profile pictures" feature: 1 button generates 5 standardized screenshots from a slipgate-shipped demo file, all users see the same scene/map/point-in-time so flipping through profiles shows "different visuals depending on user's setup." Operator's stated end-goal. Profile already has placeholder slots for these screenshots.
- [Tray menu launch](#tray-menu-launch) — **NEW 2026-04-27 (evening).** The Launch section (Server input + Join/Spec/Launch buttons) was dropped from the user-facing Clients-Domain surface in Phase 3.5a per VISION's "Not a game launcher" framing. If launch ever needs to come back (e.g. for the Profile screenshot-generator integration that needs slipgate to spawn ezQuake with specific args, or for any quick-join-from-anywhere UX), the natural home is the system tray menu (right-click → Launch / Join / Spec). Matches the "invisible until needed" tray-app philosophy and doesn't burn screen real estate. No active pressure to resurface.
- [Sub-pattern 2b: cmdline variant-matrix gaps](#sub-pattern-2b-cmdline-variant-matrix-gaps) — 2026-04-25. **Partially resolved 2026-04-25 (late):** `-U__linux__` added to Apple+Win clang variants flipped 2 of 4 entities — `-gl_ext` now cited at vid_common_gl.c:340, `-allowmultiple` now cited at sys_win.c:682. Remaining 2 (`-nohwtimer` at sys_win.c:572 and `-gl-forward-only-profile` at gl_sdl.c:50) are blocked on the same SDK-stub-headers solve as the deferred `-nopriority` row from the Layer 1 doc_only audit — both call sites live inside function bodies whose surrounding statements use unresolved Windows SDK / SDL types under Linux libclang, so PARSE_INCOMPLETE recovery skips the compound expressions even though simpler `if (COM_CheckParm(...))` calls in the same files succeed.
- [Plugin v-table asset detection (loader-sites handler)](#plugin-v-table-asset-detection-loader-sites-handler) — **NEW 2026-04-26.** FTE asset extraction (Phase 2d-bundle) found that plugin source roots emit zero rows from the asset_loader_sites handler, while the cvars handler captures plugin-registered cvars. Cause: FTE plugins reach asset loaders through `cvarfuncs->GetNVFDG()` and similar v-table calls, not direct C calls in LOADER_FUNCTIONS. Only `plugin:ezhud` is currently affected (HUD images). `plugin:ezscript` has zero asset surface; no other plugins are in scope. Pressure: low — ezhud's images ship bundled with FTE, so an installed user has the assets regardless of the bundle classifying them.
- [Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)](#cvar-binding-handler-indirection-gap-snprintf-chains--cvarfc-callbacks) — **NEW 2026-04-26.** The asset_cvar_bindings handler's auto-pass corroborates only the simplest pattern: `cvar.string` member-ref in the same compound scope as a loader CALL_EXPR. It does NOT follow snprintf chains (`Q_strncpyz(name, baseskin.string, ...)` then `FS_Open(name)`), CVARFC callbacks (`r_skybox` → `R_SkyBox_Changed` → `R_SetSky`), or any other multi-hop indirection. This is a Layer 1-wide handler limitation, not FTE-specific: confirmed at FTE build-6698 (4 of 22 seed bindings stand on seed authority alone) AND at ezQuake head (23 of 24 seed bindings stand on seed authority alone). Bundle reconciliation correctly treats these as `seedRetained` rows — they're not lost, just not mechanically corroborated. Pressure: low. Worth fixing only when the seed-authoring cost of writing bindings the handler could detect becomes painful.
- [qw-oracle DEVELOPMENT.md missing](#qw-oracle-developmentmd-missing) — **NEW 2026-04-27.** qw-oracle has accumulated multiple project-specific test runners (the ezQuake Path-1 fixtures at `apps/qw-oracle/scripts/extractors/ezquake/tests/test_parameterized_paths.py` and the FTE Path-1 fixtures at `apps/qw-oracle/scripts/extractors/fte/tests/test_fte_asset_paths.py` shipped 2026-04-27) plus per-project verifier scripts (`asset-path-rules-verify.py` for ezQuake and FTE) that don't appear in `CLAUDE.md ## Commands` and have no central index. Partial coverage exists in CLAUDE.md `## Commands` for the loader CLI (`load-version`, `extract-tag`, `quality-grid`, etc.) but not for the test/fixture surfaces or the verifier scripts. Pressure: low — discoverability gap, not a correctness gap.
- [Layer 3 concept note: death rules](#layer-3-concept-note-death-rules) — **NEW 2026-04-27 (evening), REFRAMED 2026-04-27 (after qw_event_log discovery).** "Death in QW" is conceptually richer than a single deathtype enum: real telefrag (teleport-overlap), exit-level kill (samelevel/noexit changelevel — what kills you on e1m2's end teleporter in 4on4), trigger_hurt (mapper-controlled void brushes), fall damage, crush/squish, lava/slime ticks, drowning. Three-anchor synthesis target: source-truth (Layer 1 deathtype + KTX overrides) + observed-behavior (qw_event_log obit corpus + WeaponType taxonomy as cross-validation oracle) + community testimony (Layer 2 "noexit lol" jokes). Sequence: arc 1 (id1) shipped 2026-04-27; arc 2a MVDSV cvars; arc 2b KTX cvars/commands; arc 2c KTX gameplay overrides (mirrors id1 work, fills `gameplay_source_id='ktx'` rows); arc 3 build qw_event_log validation harness (parser as ground-truth oracle for "what does Layer 1 claim vs what does the parser observe?"); arc 4 author the concept note once all four arcs converge. Pressure: low — concept-note bench is deep, and the build-out sequence forces several quality gates first.
- [qw_event_log as cross-validation oracle for Layer 1](#qw_event_log-as-cross-validation-oracle-for-layer-1) — **NEW 2026-04-27 (evening).** Operator's earlier collaboration with vikpe + Claude produced a Rust crate (`qw_event_log`) that parses MVDSV demos into structured `GameEvent` streams. The repo is FROZEN at `/home/paradoks/projects/qw-event-log-handoff/` (commit `2c584b4`); was originally PR #5 in vikpe/slipgate, moved to `.bak/` when vikpe decided to rewrite the MVD layer. Three artifacts inside that Oracle wants: `obituary.rs` (47 kill + 12 suicide + 16 world + 12 teamkill obit-string→cause patterns sourced from KTX `client.c` ClientObituary AND id1 `client.qc`), `events.rs` (`WeaponType` enum: clean unified taxonomy spanning vanilla weapons + KTX-promoted distinctions like Discharge/Stomp + environmental + Telefrag + Suicide), `ARCHITECTURE.md` (~350 lines documenting the engine-protocol model: modern KTX kills via MVDSV `DamageDone` hidden message; legacy demos via PRINT obit; environmental = attacker=world). Right framing: NOT a one-shot import but a permanent cross-validation oracle. Once KTX layer1 ships (arc 2c), build a harness that runs the parser over a demo corpus, aggregates observed event types, queries Oracle for the corresponding rows, and outputs a divergence report. Convergence corroborates Layer 1; anomalies are work to do. Generalizes beyond death — same loop applies to weapon damage, spawn rules, mod-specific behavior. Pressure: low; gated on MVDSV→KTX cvars→KTX gameplay overrides shipping first. Non-trivial caveat: the handoff repo is frozen; if vikpe's new `demo_parser` ships before our validation-harness arc, validate against the live version not the frozen snapshot.
- [SCHEMA.md doc-style inconsistency](#schemamd-doc-style-inconsistency) — **NEW 2026-04-27 (evening).** Task 2 of the game-mechanics arc 1 plan added a `## v14 (2026-04-27): game-mechanics tables (id1 baseline)` section to `apps/qw-oracle/SCHEMA.md`. The plan said to mirror "the v13 section verbatim" but in reality SCHEMA.md does NOT have a `## v13` section — v13 was documented as `## Map knowledge layer` (topical H2 with column-table + bold-prefixed paragraphs), and prior version migrations (v10, v11) appear as `### vN:` H3 sub-sections inside `## Cross-cutting notes`. The v14 section now uses a third style nobody else uses. Two cleanup options: convert v14 into a `## Game mechanics knowledge layer` topical heading parallel to Map knowledge layer; or harmonize the doc to a per-version style (v10/v11 bumped from H3 sub-sections to H2 sections). Operator decides. Also flagged: stale references in conventions paragraph still say "schema v12", migration walk text says "v1→v2→...→v11", table map says "Total: 22 tables at schema v12 + v13" — none reflect v13/v14. Pressure: low — facts are correct, only structure is inconsistent.
- [Phase 2e follow-up arc residuals](#phase-2e-follow-up-arc-residuals) -- **NEW 2026-04-28. PARTIALLY SUPERSEDED 2026-04-28** by the cross-extractor pattern audit follow-up arc. Of the six original residuals: **4 are now scoped into `docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md`** (qc_builtin cross-scope collisions → Phase 2 with schema v18 migration + handler canonicalization; `validInfoKey` regex alphabet → Phase 5 with schema export sync; FTE+QWCL `_handler_cvars.py` defensive normalization → Phase 2 with `_cvar_shared` lift; `pext_*_alias` classifier — verified by Subagent 3 to NOT be a silent drop, the catch-all alias bucket is correct, can close from this list). **2 remain**: pre-existing ezquake F2 informational anomalies (gl_lightmode + 194 doc_only); 14 historical-version ezquake `sv_demoregexp` rows still raw (auto-resolves on next deep-time walk). Both still low pressure; do-when-touched.
- [Cross-extractor pattern audit follow-up arc](#cross-extractor-pattern-audit-follow-up-arc) -- **NEW 2026-04-28. PARTIALLY SHIPPED 2026-04-28.** Five phases shipped (commits `566c5be` Phase 0 small patches; `08aa5b1` Phase 1 resolve_fn_ref lift; `4a98573` Phase 2 cvars normalization + schema v18; `64e32e3` Phase 3 string-shape helpers lift; `1a00704` Phase 4 FTE cmdline policy doc + Phase 5 alphabet exports + log_template SCHEMA.md note). All four projects pass quality grid clean. New deferred follow-ups (added below): Task 3.5 asset-helper lift requires design work (not a mechanical move — helpers close over project-specific data tables `TRIGGER_RULES` / `EXT_TO_CATEGORY` / `ENCLOSING_FN_CATEGORY_RULES` that differ per project); qc_builtin intra-table multi-index aggregation (audit D.1.10's predicted "cross-scope" recovery turned out to be intra-table multi-index; the schema v18 `:<table>` suffix is a structural alignment with info_key but doesn't disambiguate the 4 dropped dups — needs handler-side aggregation mirroring info_key Phase B `all_call_sites_json`). Original 13 audit-deferred residuals still apply (low pressure): FTE/QWCL fork-override hook documentation absent; FTE `enter_function`/`exit_function` lifecycle gap; ezquake cvars last-wins-vs-first-wins inconsistency; ProtocolMvdsvHandler module-level `_kind_for`; ezhud `_resolve_default` heuristic; ezquake `_resolve_enum_constant` intra-project duplicate; cvar_alias `differ_safe` dead-allow at extraction layer; `validIdentifier` regex blocks `:` separator; ezquake/qwcl missing `Config.set_library_file` call; handler-registry pattern divergence; ezquake `_split_handlers` legacy path; OUT_OF_SCOPE.md stale dates (CLOSED 2026-04-28: ezquake/fte/qwcl bumped to 2026-04-28 in synthesis commit); ezquake/fte/qwcl missing `validation-fixtures/`. Sequencing: per-project deep validations SHIPPED 2026-04-28 (see new entry below).
- [Per-project Mode B validation synthesis follow-ups](#per-project-mode-b-validation-synthesis-follow-ups) -- **NEW 2026-04-28.** Three Mode B per-project deep validations shipped (ezQuake@head / FTE@build-6698 / QWCL@2.33) companion to the cross-extractor audit. Total: 0 critical, 6 important, 13 nits across 20 findings. Three cross-cutting items (S-01 FTE Phase 2 convergence gap — 1085 source-backed FTE cvars carry `flags_raw IS NULL` instead of empty string + missing `unescape_c_string` adoption; S-02 D.1.8 lifecycle hooks confirmed open; S-03 uneven F1 probe coverage — qwcl has zero project-keyed equality probes) and three per-project items (F-EZQ-01 trailing-comment look-ahead misattribution affecting ~34% of ezquake cvar comments, 78 of 230 rows wrong; F-EZQ-03 + F-QWCL-06 `command_versions.registration_file` + `macro_versions.registration_file` columns misnamed schema migration; F-QWCL-01 doc drift drained-now in synthesis commit). Recommended next-arc shape: Arc A "cross-extractor Phase 6: FTE convergence + grid uplift" (S-01 + S-03) and Arc B "ezquake trailing-comment + registration_file rename" (F-EZQ-01 + F-EZQ-03). Synthesis report: `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md`; per-project reports + plans linked from synthesis.
- [Slipgate Managed Mode pivot — multi-arc project opened](#slipgate-managed-mode-pivot--multi-arc-project-opened) — **NEW 2026-04-28.** Phase 3.5b shipped + first-Windows-smoke fixes shipped (`121b2ba` PE numeric version + FTE no-hyphen server detection + canonical-rename collision resolution; `fc2541f` FTE arch-as-variant preserving `fteqw64.exe`). During the wrap-up conversation, the architecture pivoted: slipgate-IS-quakedir (the data warehouse IS the Quake install). Phase 4/5 (binary diff viewer) DEFERRED — superseded by profile-vs-profile diff in the new arc. Three project-level docs captured: vision (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`), architecture (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`), roadmap (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`). Eight implementation arcs (A-H) sequenced; V1 = A+B+D+E+C-minimal (asset warehouse + profile manifest + materializer + clean-room migration + watcher + minimal switch UI). V1+ = F+G+C-full+H (lossless export + version history + full profile UI + cloud catalog). Operator estimate: 1 week to V1. Pre-arc tail: TAIL-1 wrap FTE asset bundle consumer wiring (the existing HANDOVER entry "FTE asset bundle consumer wiring" — promoted from low-pressure to load-bearing because Arc D's classifier needs it). Existing HANDOVER entries superseded by this arc but left in place for context: "Add Quake Client / MyQuake unification" (3.5b shipped), "Canonical-mode default for warehoused clients" (resolved by 3.5b), "Tier 3 future arcs" (folded into Managed Mode roadmap), "Player profiles (bundle-shaped)" (folded as Arc B + Arc H). Docs-check at next session wrap-up should clean those entries.

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

## Phase 2e follow-up arc residuals

**Added:** 2026-04-28. **Status:** Six small residuals from the MVDSV Phase 2e follow-up arc (5 commits `f7b2a7a` -> `72a1630`, schema v15 -> v17). All low pressure; do-when-touched. **Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT user_version FROM pragma_user_version"` should return `17`.

### ezquake F2 informational anomalies

The `quality-grid --project ezquake --family anomaly` run surfaces 2 pre-existing F2 entries: `gl_lightmode` default ping-pong across 15 versions (`2 1 2 2 2 2 2 1 1 1 1 1 1 1 1`) and `194 doc_only_crosstab` rows (149 cvar / 41 command / 2 cmdline_param / 2 macro). Both are pre-existing, unrelated to the MVDSV arc, and were explicitly deferred per the follow-up arc plan. They surface today because the F2.default_value_ping_pong probe is `informational` not `regression`, but a future operator pass should triage them -- probably alongside the next ezQuake deep-time refresh.

### qc_builtin cross-scope name collisions (4 entries)

`cvar_string`, `precache_model`, `precache_sound`, `precache_file` register in both `std_builtins` and `ext_builtins` and are silently dropped during loader normalization today (the new `[load-version] dropped duplicate name` warning surfaces them at load time). Same architectural shape as info_key Phase B; the Pattern-14 suffix fix (`<bare>:<scope>`) would extend cleanly to qc_builtin. Forward-looking -- does not bite an immediate consumer today (lookup_entity for any of these returns the std_builtins row, which is the correct primary semantic). Worth fixing when qc_builtin gets next attention.

### 14 historical-version ezquake `sv_demoregexp` rows retain raw `\\.` representation

Phase E's escape-interpretation pass canonicalised `default_value` from raw `\\.` to interpreted `\.` for 16 rows during the most-recent re-extract. Only the head row was canonicalised; 14 historical-version ezquake `sv_demoregexp` rows still carry the raw `\\.` form because their per-version snapshots have not been re-walked under the new extractor. They normalise automatically on next ezquake deep-time walk. Acceptable today -- present-tense answers via lookup_entity already use the interpreted head value.

### `validInfoKey` regex hard-codes scope alphabet

`apps/qw-oracle/scripts/load-knowledge/load-version.ts` `validInfoKey` validator hard-codes scope alphabet `(userinfo|serverinfo|localinfo)`. If a future engine adds a fourth scope (e.g. some FTE/QWFWD context that introduces a new info-string surface), info_key names with that scope will silently fail validation rather than load. Worth refactoring to pull scope vocabulary from a shared constant -- e.g. `INFO_KEY_SCOPES` -- when next touched.

### `pext_*_alias` classification falls through for non-numeric expressions

`_handler_protocol.py` classifies `pext_fte`/`pext_mvd` macro bodies into `_bit`/`_const`/`_alias`/`_marker` by AST shape. `_alias` today catches identifier-in-parens bodies (one macro reusing another's value, e.g. `MVD_PEXT1_INCLUDEINMVD = ( MVD_PEXT1_HIDDEN_MESSAGES )`). A future arithmetic mask expression like `(MVD_PEXT1_FOO | MVD_PEXT1_BAR)` would match the parens-with-expression shape and get classified as alias rather than its true value-shape. The handler logs a warning but doesn't hard-fail. Refine when a real case appears.

### FTE/QWCL `_handler_cvars.py` lack defensive `_normalize_flags_raw`

Phase D added `_normalize_flags_raw` to MVDSV's `_handler_cvars.py` to canonicalise `flags_raw` to empty string for absent / `0` / `CVAR_NONE`. FTE and QWCL `_handler_cvars.py` files emit clean values today by convention (their seed conventions don't produce `0` or `CVAR_NONE` in flags_raw), but they lack explicit normalisation. If their conventions drift in a future engine release, the `0`/`CVAR_NONE` form could leak in unnoticed. Apply the same defensive normalisation when FTE/QWCL are next re-extracted.

### Pressure

All six residuals are low pressure. None block any consumer today. Captured here so they don't get lost between this arc's ship and the next time someone touches the affected surfaces.

### Related

- Plan: `docs/superpowers/plans/2026-04-28-mvdsv-phase2e-followups.md`
- Schema: `apps/qw-oracle/SCHEMA.md` v16 + v17 sections
- Pattern catalog: `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` Pattern 14

---

## Slipgate Managed Mode pivot — multi-arc project opened

**Added:** 2026-04-28. **Status:** Pivot confirmed by operator; vision + architecture + roadmap docs drafted. Pre-arc tail item identified (TAIL-1: FTE asset bundle wiring). First arc (A: asset warehouse substrate) not yet started.

**Verification first:** Confirm the three new docs exist:
```
ls docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md
ls docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md
ls docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md
```

### What changed

The architecture for slipgate's product positioning shifted during the conversation immediately following the Phase 3.5b ship. The companion-app framing ("slipgate analyses + manages your existing quake dir") collapsed into slipgate-IS-quakedir ("the data warehouse IS your Quake install").

This collapse was driven by the operator's empirical observation that a minimum viable Quake install is just `id1/pak0.pak` + `id1/pak1.pak` + a client. Everything else is content layered on top — and that content is precisely what the data warehouse pattern (shipped in Phase 3.5b for binaries) generalizes to handle.

The architecture is structurally identical to Git, NixOS, OSTree: content-addressed blobs (sha256-keyed) + per-thing manifests + materialization-as-view. Profiles become manifests; switching profiles becomes selecting which manifest to materialize against the engine's `-basedir`. Edits become register-new-blob + manifest-update. History falls out for free. Lossless export ("walk away with a portable Quake dir") falls out for free. Side-by-side profile diff (the "config compare at quakedir level") falls out for free.

### Project structure

The pivot is a project, not a feature. Three foundational docs capture the design:

1. **Vision** (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`) — product positioning, two-mode framing (Light vs Managed), load-bearing properties (lossless export pledge, non-destructive migration, SHA256 governance, web/desktop split), what this is and isn't, end-to-end scenarios.

2. **Architecture** (`docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`) — data model, storage layout, content taxonomy (5 buckets: stock / user-asset / user-content / cache-ephemera / engine-runtime), six primitive operations (register/materialize/swap/export/fork/merge), filesystem watcher contract (4-case dispatch), engine integration, SHA256 governance, cloud catalog interaction, migration algorithm.

3. **Roadmap** (`docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`) — eight implementation arcs (A-H), dependency graph, V1 vs V1+ scope, per-arc summaries, recommended next-session sequence, timeline expectation.

### Implementation arcs

- **Arc A** — Asset warehouse substrate (parallel to binary warehouse). 1-2 days.
- **Arc B** — Profile manifest + materializer (hardlink-or-copy + cross-volume fallback). 4-6 days.
- **Arc C-minimal** — Profile switch UI (V1). 2-3 days.
- **Arc D** — Migration on-ramp + clean-room extractor + config sanitization. 1 week+ (largest arc).
- **Arc E** — Filesystem watcher + classifier + mod-fingerprint registry. 4-5 days.
- **Arc F** — Lossless export. 1-2 days. (V1+)
- **Arc G** — Version history (per-config IDE-shaped restore). 3-4 days. (V1+)
- **Arc C-full** — Full profile UI (browse, side-by-side diff, fork, history view). 1 week+. (V1+)
- **Arc H** — Cloud catalog hookup. 1 week+. (V1+)

V1 = A+B+D+E+C-minimal (working Managed mode end-to-end). Operator estimate: ~1 week of focused implementation.

### Pre-arc tail (TAIL-1)

The existing HANDOVER entry "FTE asset bundle consumer wiring" is promoted from low-pressure to load-bearing. Arc D's clean-room migration classifier needs FTE-aware path/asset rules to work for any user with FTE in their dir. Wrap before Arc A starts. Half-day to one-day item.

### Items superseded by this pivot (cleanup at docs-check)

These existing HANDOVER entries are superseded but left in place for context:

- "Add Quake Client / MyQuake unification" — Phase 3.5b shipped
- "Canonical-mode default for warehoused clients" — resolved by Phase 3.5b's canonical-only design
- "Tier 3 future arcs (clean-room migration + asset warehouse + bundle install)" — folded into Managed Mode roadmap as Arcs A/B/D/E/F/G
- "Player profiles (bundle-shaped, share-via-hashlist)" — folded into Managed Mode roadmap as Arcs B+H

Docs-check at next session wrap-up should evaluate each for clean deletion.

### Recommended next-session sequence

1. Wrap TAIL-1 (FTE asset bundle wiring) — half-day to one day
2. Brainstorm Arc A + Arc B together (substrate co-design)
3. Write + execute Arc A
4. Write + execute Arc B
5. Brainstorm Arc D + Arc E together (classifier shared)
6. Write + execute Arc D
7. Write + execute Arc E
8. Write + execute Arc C-minimal
9. V1 ships; F/G/C-full/H follow as time and demand allow

### Pressure

High. This is the new main arc. All other slipgate-side work (binary version diff viewer Phase 4/5, retired-cvars stale-warning UX, etc.) is deferred until V1 ships or until the new arc creates demand for them.

### Related

- **Vision:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-vision.md`
- **Architecture:** `docs/superpowers/specs/2026-04-28-slipgate-managed-mode-architecture.md`
- **Roadmap:** `docs/superpowers/plans/2026-04-28-slipgate-managed-mode-roadmap.md`
- **Memory:** `project_slipgate_tier_ladder.md` — the four-tier intuition the two-mode framing distills
- **Phase 3.5b plan:** `docs/superpowers/plans/2026-04-26-add-quake-client.md` — binary half of the warehouse substrate



---

## Cross-extractor pattern audit follow-up arc

**Added:** 2026-04-28. **Status:** Five phases shipped 2026-04-28 (commits `566c5be` → `1a00704`). Two follow-ups deferred: asset-helper lift (Task 3.5) and qc_builtin intra-table multi-index aggregation. See "Shipped" and "New deferred follow-ups" sections below.

Cross-project pattern audit ran 2026-04-28 against the post-consolidation baseline (architecture-consolidation arc 5b943d4 → 8115b48). Three subagents in parallel covered:
- `extractor_lib/` end-to-end + lift candidates from project-private handlers (Subagent 1).
- cvar/command/cmdline triple across all four projects (Subagent 2).
- Project-specific handlers (FTE asset/ezhud/ezscript/macros, MVDSV info_keys/log_templates/protocol/qc_builtins, ezQuake macros/hud_elements/keynames/asset) + schema CHECK reachability (Subagent 3).

In-terminal: load-version.ts + schema.ts CHECK constraint mapping; `valid*` carve-outs; driver shape (extract.py); OUT_OF_SCOPE.md + validation-fixtures inventory.

### Findings

27 total. Severity split: 4 critical (D.1.3 / D.1.4 / D.1.10 / D.2.10), 16 important, 7 nits.

The full report is at `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md` with finding tables grouped by audit dimension (D.1 sibling-handler shape divergences; D.2 extractor_lib lift candidates; D.3 schema CHECK reachability; D.4 valid* carve-outs; D.5 architecture invariants; D.6 driver shape; D.7 idempotency smoke; D.8 OUT_OF_SCOPE / validation-fixtures).

### Plan

`docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md` — five phases plus a Phase 0 of small drain-now patches:

- **Phase 0** — drain-now: delete dead `extractor_lib/_base.py`; rename two FTE asset handler classes; rename mvdsv `containing_function` → `enclosing_function`.
- **Phase 1** — `resolve_fn_ref` lift adoption across 6 private copies in ezquake/fte/qwcl. Highest-correctness win; corner case (unresolved decls) surfaces as `cursor.spelling` instead of NULL.
- **Phase 2** — cvars normalization convergence (lift `_unescape_c_string` + `_normalize_flags_raw`) + qc_builtin canonical-name fix to schema v18 (parallels v16 info_key Phase B). Recovers 4 silently-dropped cross-scope variants. Schema migration territory.
- **Phase 3** — string-shape helper lifts (`_read_extent` x13, `_strip_quotes` x8, `_literal_string` L-tolerant x7, `_strip_array_and_qualifiers` x3, asset-handler bundle x17). Largest LOC reduction; no policy change.
- **Phase 4** — FTE cmdline param-prefix verification: grep + decide widen vs document-as-design.
- **Phase 5** — schema/loader alphabet sync (export `INFO_KEY_SCOPES` + `LOG_TEMPLATE_CHANNELS` from schema.ts); document log_template raw-escape preservation contract in SCHEMA.md.

### Sequencing

Drain this arc BEFORE the per-project deep validations (ezQuake / FTE / QWCL via `validate-extractor` skill in Mode B). Same logic that drove the MVDSV Phase 2e follow-up arc → runbook+skill sequencing: cleaner shared baseline = smaller per-project plans = less duplicate work across the three.

### Deferred to HANDOVER (13 items, all low pressure)

These findings have explicit dispositions in the audit report. None warrant a phase of their own:

1. **D.1.5** — FTE/QWCL handlers uniformly missing `Fork override hooks:` documentation. No concrete consumer fork target today; speculative hoisting violates "don't generalize without a second consumer." Revisit if/when a fork pressure surfaces.
2. **D.1.8** — FTE `_handler_commands.py` lacks `enter_function`/`exit_function` lifecycle hooks; `_handler_cmdline.py:167` always emits `enclosing_function: None`. Feature-coverage gap, not data loss.
3. **D.1.9** — ezquake cvars finalize uses last-wins overwrite; ezquake commands and all other projects use first-wins. Verify identical output on current corpus before harmonizing.
4. **D.1.12** — `ProtocolMvdsvHandler._kind_for` lives at module level rather than as a class-attribute dispatch table. Acknowledged in docstring. Defer until antilag-mvdsv onboarding pressures the override path.
5. **D.1.13** — FTE `_handler_ezhud.py:97-123` `_resolve_default` token heuristic stores unresolved identifier names as-is. Re-scan `plugins/ezhud/` for new SPEED_-style #defines on each FTE bump.
6. **D.2.8** — ezquake `_resolve_enum_constant` duplicated within ezquake (macros + cmdline). Single-project; below the lift bar.
7. **D.3.1** — `cvar_alias_versions.default_drift_status` schema CHECK admits `differ_safe` but no extractor emits it (FTE ezscript handler is conservative; manual review can promote `differ_dangerous` → `differ_safe`). Verify operator-promotion path; either document or remove from CHECK in a future revision.
8. **D.4.3** — `validIdentifier` regex in `load-version.ts:443` does NOT admit `:` separator. Blocks future `<bare>:<scope>` canonical fixes for entity types beyond info_key without coordinated regex work. Re-evaluate when the next cross-scope canonicalization arc lands (Phase 2 of the plan above kicks this for qc_builtin).
9. **D.6.1** — `Config.set_library_file("libclang-18.so.1")` called in fte/extract.py + mvdsv/extract.py but NOT in ezquake/extract.py + qwcl/extract.py. Functional today on WSL via libclang's default resolution; convergence is hygiene only.
10. **D.6.2** — Handler-registry pattern divergence (module-level `ALL_HANDLERS` dict literal in ezquake/qwcl vs `collect_handlers()` function with lazy imports in fte/mvdsv). Both work; convergence is code-hygiene.
11. **D.6.3** — ezquake `_split_handlers` + dual-path code in `_process_one_file` (extract.py:97-160) retained for the keynames handler (the only one still using `process_file` instead of Visitor). One-consumer legacy path; could be lifted into Visitor with custom variant args.
12. **D.8.1** — `OUT_OF_SCOPE.md` "last reviewed" dates: ezquake/fte/qwcl 2026-04-26 (precede the consolidation arc); mvdsv 2026-04-28 (current). Refresh dates as part of per-project deep validations.
13. **D.8.2** — Only mvdsv has `validation-fixtures/` (allowlists, prefixes, runtime dump). ezquake/fte/qwcl have no equivalent — ezquake's runtime cross-validation already happened pre-consolidation (Pass 1 closure documented in CLAUDE.md memory note); the absence of a `validation-fixtures/` directory means that Pass 1's allowlist + reference dump are not reproducible from the current tree. Capture per-project Pass-1 runtime dumps as part of per-project deep validations.

### Shipped

Five phases landed 2026-04-28:

- **Phase 0** (`566c5be`) — deleted dead `extractor_lib/_base.py`; renamed two FTE asset handler classes to `*FteHandler`; renamed mvdsv cmdline `containing_function` → `enclosing_function` for cross-project field-name consistency.
- **Phase 1** (`08aa5b1`) — lifted `resolve_fn_ref` import across 6 private copies (ezquake commands/macros/hud_elements; fte commands/macros; qwcl commands). JSON outputs byte-identical at current heads (no corner-case unresolved decls fired); the lift's permissive fallback remains load-bearing for older tags or future codebase changes.
- **Phase 2** (`4a98573`) — created `extractor_lib/_cvar_shared.py` with `unescape_c_string` / `normalize_flags_raw` / `parse_flag_names` / `FLAG_NAME_RE`; ezquake + mvdsv import from shared; fte + qwcl adopt `normalize_flags_raw` (and qwcl adopts `unescape_c_string`) so all four projects share the post-v17 sentinel-form contract. Fixed ezquake trailing-comment `};` anchor (D.1.4) — comma-bearing comments like `// can be 0, 1, or 2` no longer truncate. Schema v18 migration: qc_builtin canonical name carries `:<table_name>` suffix mirroring info_key Phase B `:<scope>`. The audit's predicted 93 → 97 recovery did NOT materialize (see "New deferred follow-ups" #2 below for why).
- **Phase 3** (`64e32e3`) — created `extractor_lib/_source.py` with `read_extent` / `strip_quotes` / `literal_string` (L-prefix-tolerant superset) / `strip_array_and_qualifiers`. 19 handler files across all four projects converted to import the shared helpers. Net diff: -604 / +202 lines. JSON outputs byte-identical for all four projects. Task 3.5 (asset-handler 17-helper lift) deferred — see "New deferred follow-ups" #1 below.
- **Phases 4 + 5** (`1a00704`) — FTE cmdline single-prefix policy documented as intentional (zero `+`-prefixed `COM_CheckParm` calls in FTE engine source verified via grep). `INFO_KEY_SCOPES` + `LOG_TEMPLATE_CHANNELS` exported from `schema.ts`; consumed in `load-version.ts` via dynamic regex builders. SCHEMA.md updated with `log_template_versions` "Escape-preservation contract" section (raw form preserved; contrast with cvar `default_value` post-v17 escape interpretation).

### New deferred follow-ups

These two follow-ups surfaced during execution, not in the original audit. Both low pressure.

1. **Task 3.5 asset-handler lift (D.2.3) — design work, not mechanical lift.** The audit's plan called for lifting 17 asset-handler helpers (`_classify_load_trigger`, `_is_dev_only`, `_category_from_extension`, `_category_from_enclosing`, `_resolve_cvar_ref`, `_conversion_slots`, `_extension_from_template`, `_resolve_semantic`, `_classify_parameterized_call`, `_extract_expression_snippet`, `_unary_op_token`, `_binary_op_token`, `_drill_to_decl_ref`, `_lookup_buffer_write_in_compound`, `_lookup_deref_assignment_in_compound`, `_classify_first_arg`, `_resolve_cvar_string_ref`) from ezquake + fte asset handlers to a shared `extractor_lib/_asset.py`. Inspection during Phase 3 found that several of these helpers close over project-specific module-level data tables (`TRIGGER_RULES`, `DEV_ONLY_RULES`, `EXT_TO_CATEGORY`, `ENCLOSING_FN_CATEGORY_RULES`, `LOADER_FUNCTIONS`, `FUNCTION_TO_CATEGORY`, `GENERIC_FS_PRIMITIVES`) whose contents differ between ezquake and fte (FTE has FTE-specific patterns like `Sh_RegisterShader_Init`, `R_LoadHL2Map`, `Shaders`, `Textures` that ezquake doesn't have). The lift requires either (a) parameterizing each helper with the project-specific data tables, (b) hoisting to a class with `self.<TABLE_NAME>` attributes, or (c) leaving the helpers per-project. Per-project today is the pragmatic state. Pressure: low — the duplication is real but the LOC cost is bounded (only ezquake + fte have asset handlers; mvdsv + qwcl have none); the design question shouldn't block other work.

2. **qc_builtin intra-table multi-index aggregation (audit D.1.10 follow-up).** Phase 2's schema v18 lifted qc_builtin canonical names from `<bare>` to `<bare>:<table_name>` mirroring info_key's `:<scope>` shape. The audit predicted this would recover 4 previously-collided "cross-scope" entities (`cvar_string`, `precache_model`, `precache_sound`, `precache_file`) and bump qc_builtin count from 93 to 97. Inspection during Phase 2 found the 4 dups are NOT cross-table — they're INTRA-table multi-index registrations (e.g., `cvar_string` registered TWICE in `ext_builtins` at indices 103 AND 448). The `:<table>` suffix doesn't disambiguate them; both rows still emit name=`cvar_string:ext_builtins` and the second is dropped at the loader's `rawEntries[item.name] === undefined` dedup (line 317-318 of load-version.ts). Recovery requires handler-side aggregation pre-emission: collapse multi-index registrations under the same name into one row with both indices recorded as a JSON list (mirrors info_key Phase B's `all_call_sites_json` pattern at line 270-281 of `mvdsv/_handler_info_keys.py`). The qc_builtin_versions table would need a new `all_indices_json TEXT` column added in a schema bump (v19?) and the handler emission would shift from per-(table, index) rows to per-(table, name) aggregated rows. Pressure: low — the intra-table multi-index pattern is rare (4 entities total), and the second registration is typically a back-compat alias to the same handler function. Capturing both indices is correctness, not data integrity. Re-evaluate when the qw_event_log validation oracle arc lands (which depends on qc_builtin completeness).

### Pressure

Done. Drain-in-arc work shipped. Two follow-ups added back to HANDOVER above. Per-project deep validations (ezQuake / FTE / QWCL Mode B in `validate-extractor` skill) can now resume.

### Related

- **Audit report:** `docs/superpowers/reviews/2026-04-28-cross-extractor-audit-report.md`
- **Follow-up plan:** `docs/superpowers/plans/2026-04-28-cross-extractor-shared-lib-arc.md` (5 phases shipped + Phase 0)
- **Spec:** `docs/superpowers/specs/2026-04-28-cross-extractor-pattern-audit.md`
- **Predecessor:** `docs/superpowers/plans/2026-04-28-extractor-architecture-consolidation.md` (the consolidation arc that built the pre-condition for this audit)
- **MVDSV Phase 2e follow-up plan:** `docs/superpowers/plans/2026-04-28-mvdsv-phase2e-followups.md` (parallel-shape reference)
- **Shipped commits:** `566c5be` (P0) → `08aa5b1` (P1) → `4a98573` (P2 v18) → `64e32e3` (P3) → `1a00704` (P4+P5)

## Per-project Mode B validation synthesis follow-ups

**Added:** 2026-04-28. **Status:** Three per-project deep validations shipped; drain-now items (F-QWCL-01 doc drift + D.8.1 OUT_OF_SCOPE.md date refresh) drained in synthesis commit. Two follow-up arcs queued.

Per-project Mode B deep validations ran in parallel as three subagents (one per project: ezQuake / FTE / QWCL) using the `validate-extractor` skill against the canonical `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`. Each agent walked Sections 1.1, 3, 4, 5, 7 end-to-end; Section 3.1 random sample size doubled to 40 rows per type per Mode B; Section 4.4 cross-project sibling audit required. The cleaner shared baseline established by the cross-extractor arc paid off: zero critical findings across 1,388 + 347 + 93 file-tasks (ezquake + fte + qwcl extractor reruns).

### Headline numbers

| Project | Verdict | Critical | Important | Nits | Total |
|---|---|---:|---:|---:|---:|
| ezQuake @ head | as-claimed-with-caveats | 0 | 2 | 3 | 6 |
| FTE @ build-6698 | as-claimed-with-caveats | 0 | 2 | 3 | 5 |
| QWCL @ 2.33 | as-claimed-with-caveats | 0 | 2 | 7 | 9 |
| **Total** | | **0** | **6** | **13** | **20** |

### Cross-cutting findings (S-NN)

- **S-01 (important, drain-in-arc): FTE Phase 2 normalization incompletely landed.** Two related gaps: 1085 source-backed FTE cvars carry `flags_raw IS NULL` instead of the post-v17 empty-string sentinel (all from `plugins/ezhud/hud_common.c`; QWCL 0/187 NULL, MVDSV 0/183 NULL, FTE 1085/2482 NULL -- discoverable because the runbook's Section 3.2 sentinel-form audit only checks `IN ('0', 'CVAR_NONE')`, not `IS NULL`); and FTE `_handler_cvars.py` uses a private `_concat_string_literals` instead of `extractor_lib._cvar_shared.unescape_c_string`, latent today (zero escape-bearing FTE defaults at build-6698) but silently wrong on the next FTE upstream tag that adds an escape-bearing default. Five FTE handlers carry near-identical `_concat_string_literals` clones. **Disposition:** Arc A "cross-extractor Phase 6: FTE convergence + grid uplift". Tighten runbook Section 3.2 to reject `IS NULL`; FTE handlers adopt `normalize_flags_raw` on no-flag-token paths and `unescape_c_string` for default extraction; re-run `extract-tag --project fte`; verify the 1085 NULL rows collapse to empty string.
- **S-02 (HANDOVER): cross-extractor audit's D.1.8 confirmed open for FTE.** FTE `_handler_commands.py`, `_handler_cmdline.py`, `_handler_macros.py` lack `enter_function`/`exit_function` lifecycle hooks. 556 FTE commands + 67 macros + 108 cmdline_params all carry `enclosing_function: None` -> `registration_file = NULL`. ezQuake + QWCL populate uniformly; MVDSV commands handler also lacks them. Pre-existing audit residual; no escalation.
- **S-03 (important, drain-in-arc): F1 quality-grid probe coverage uneven across projects.** qwcl-keyed F1 probes: 0 (vs mvdsv 22, fte 11, ezquake 6). The 58->72 cmdline_param drift QWCL agent discovered (F-QWCL-01) went undetected because no equality probe gates it. **Disposition:** Arc A bundles a probe-coverage uplift across all four projects; QWCL plan's 4 proposed qwcl-keyed equality probes drain-now-equivalent.

### Per-project unique findings

- **F-EZQ-01 (important, drain-in-arc): trailing-comment misattribution in ezquake cvars handler.** `_handler_cvars.py:_attach_trailing_comments` (lines 624-660) `+1`/`+2` look-ahead grabs neighboring cvar's trailing comment when origin cvar has no inline comment AND a later cvar within 2 lines does. **78 of 230 (~34%) cvar rows with non-empty `trailing_comment` at head are wrong.** Independent of the Phase 2 `};` literal anchor fix (`4a98573`); a different failure mode in the same helper. Concrete example: `scr_cursor_alpha` (cl_screen.c:122) carries `scr_showcrosshair`'s comment from line 124. Other affected: `cl_delay_packet_deviation`, `sys_command_line`, `cl_nofake`, `cl_camera_tpp_distance`, `con_notify`, `gl_lightning_size`, ~70 others. **Disposition:** Arc B Phase 1 -- local fix in one helper function, two-rule clamp (stop after first probe seeing `};`; abort on encountering fresh `cvar_t ... = {` line). High-value for data quality.
- **F-EZQ-03 (important, drain-in-arc): `command_versions.registration_file` + `macro_versions.registration_file` columns misnamed.** Columns store enclosing function names (e.g., `CL_InitInput`), not file paths. Handler-side field is `enclosing_function`; `hud_element_versions.enclosing_function` already uses correct name. QWCL agent surfaced same finding as F-QWCL-06 (nit). **Disposition:** Arc B Phase 2 schema migration (rename columns + loader INSERT list + SCHEMA.md). No data loss.
- **F-QWCL-01 (important, drain-now in synthesis commit): doc/code count drift.** `apps/qw-oracle/scripts/extractors/qwcl/OUT_OF_SCOPE.md` + `apps/qw-oracle/CLAUDE.md` both said "186/120/58 = 364"; live DB at v18 is 187/121/72 = 380. Drained 2026-04-28: qwcl OUT_OF_SCOPE.md + apps/qw-oracle/CLAUDE.md updated to 380.
- **D.8.1 (drain-now in synthesis commit): OUT_OF_SCOPE.md last-reviewed dates refreshed.** ezquake/fte/qwcl all bumped from 2026-04-26 to 2026-04-28. Closes the carry-forward from the cross-extractor audit.

### Recommended next-arc shape

- **Arc A -- "cross-extractor Phase 6: FTE convergence + grid uplift"** (small, ~2-3 phases): runbook Section 3.2 tightening (add `IS NULL` to sentinel-form audit); FTE cvars handler adoption of `normalize_flags_raw` + `unescape_c_string` (5 files); F1 probe coverage uplift (qwcl 4 probes drain-now from QWCL plan; +N ezquake probes); re-run extract-tag for fte and verify 1085 NULL collapse. Drains S-01 + S-03.
- **Arc B -- "ezquake trailing-comment + registration_file rename"** (small, ~2 phases): fix `_attach_trailing_comments` look-ahead misattribution; verify 78 misattributions resolve; schema migration v19 renames `command_versions.registration_file` + `macro_versions.registration_file` -> `enclosing_function`. Drains F-EZQ-01 + F-EZQ-03 + F-QWCL-06.

Sequence Arc A first (S-01's contract tightening updates the runbook Arc B will validate against). Both arcs are estimable at one focused session each.

### Pressure

Done for this session. Per-project plans live alongside reports under `docs/superpowers/{reviews,plans}/2026-04-28-<project>-validation*.md`. Doc drains shipped in synthesis commit; HANDOVER amendments shipped here. Arc A + Arc B sequenced for next session.

### Related

- **Synthesis report:** `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md`
- **ezQuake report + plan:** `docs/superpowers/reviews/2026-04-28-ezquake-validation.md` + `docs/superpowers/plans/2026-04-28-ezquake-validation-followups.md`
- **FTE report + plan:** `docs/superpowers/reviews/2026-04-28-fte-validation.md` + `docs/superpowers/plans/2026-04-28-fte-validation-followups.md`
- **QWCL report + plan:** `docs/superpowers/reviews/2026-04-28-qwcl-validation.md` + `docs/superpowers/plans/2026-04-28-qwcl-validation-followups.md`
- **Predecessor:** Cross-extractor pattern audit follow-up arc (above)
