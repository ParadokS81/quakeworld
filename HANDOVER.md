# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Cross-engine alias scaffolding + slipgate version-awareness](#cross-engine-alias-scaffolding--slipgate-version-awareness) — **NEW 2026-04-26, sub-threads #2 + #3 SHIPPED later that day.** Umbrella for an arc spanning ezscript extraction, cross-engine alias schema, default-drift triage, and the structural shift that slipgate consumers should be version-aware. Sub-thread #2 (schema spec) + sub-thread #3 (schema migration v11→v12 + ezscript handler + 38 alias entities loaded at FTE@build-6698) closed; sub-thread #5 (slipgate consumer version-awareness) tracked-by Quake Dir Control plan; sub-thread #4 (FTE asset bundle) still open as adjacent track.
- [Retired cvars in snapshot + stale-config warning UX](#retired-cvars-in-snapshot--stale-config-warning-ux) — **NEW 2026-04-26.** Coupled producer+consumer work blocked on UX design. The `build-snapshot` CLI today emits only entities present at head (2,899 ezquake cvars; 2,835 source_backed + 149 doc_only). 5 retired cvars (`cl_showkeycodes`, `gl_smoothfont`, `keymap_name`, `r_fx_geometry`, `scr_printspeed` — alive in v3.0 through 3.6.2, removed before head) are silently dropped. Use case it blocks: opening an old config in slipgate where `keymap_name "us"` is present and getting a truthful "this was removed in 3.6.5" message instead of generic "unknown cvar" treatment. Defer until the stale-warning UX is on the table.
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake deep-time walk reached **v3.0 floor (14 versions: v3.0 through head)** 2026-04-25 late; pre-3.0 era de-scoped on community-security framing. Walk infrastructure shipped same session: `extract-tag --skip-prune` + `prune-cross-type-orphans` finalize CLI + per-version `backfill_match` detection. Reusable for FTE/MVDSV/KTX. **QWCL 2.33 SHIPPED 2026-04-25** (first cross-codebase port; 186 cvar / 120 command / 58 cmdline_param at qwcl@2.33; schema v10 widened project CHECK; quality-grid 5/5 F1 PASS). **FTE Phase 2d-core FULLY SHIPPED 2026-04-26** (build-6698 SHA 35843773: 2482 cvars / 556 commands / 67 macros / 103 cmdline_params; schema v11 source_root; ezhud plugin in scope; Pass 1 runtime diff CLOSED -- 114 residual all explained). Remaining: Phase 2d-bundle (asset extraction), Phase 2e MVDSV+KTX, Phase 2g MCP tool upgrades, Phase 2h automation.
- [Semantic-pass abbreviation-bridge heuristic](#semantic-pass-abbreviation-bridge-heuristic) — P3 from 2026-04-24 sanity-sample calibration. Release-notes using feature full-names (joystick) don't match clusters of abbreviated entity names (joy*). Not a Phase 2f blocker; worth fixing during or before real walks reach affected pairs.
- [Layer 1 doc_only audit](#layer-1-doc_only-audit--closed-with-one-deferred-row) — **CLOSED 2026-04-25 with one deferred row.** Six extractor patterns + one architectural change + one loader dedup shipped across the session: P1 Cmd_AddLegacyCommand, P2 log_t table, P3 nested cvar_t tables, P5a SERVER_ONLY misplacement, P6 #define resolution, Item A 4-variant parse architecture, Item B cross-type help-JSON orphan prune. Prior retraction was itself wrong (extractor was missing these; the "all 73 cat1 present in AST" claim was based on a second misreading). Doc_only 269 -> 210; zero regressions; +24 newly-discovered command entities; +1 asset cvar binding; +1 cmdline usage. Deferred: `-nopriority` cmdline_param at sv_sys_win.c:645 (requires Windows SDK headers unreachable on Linux libclang). One entry remains until MVDSV/FTE hit the same wall — then stub-headers solution lands in one place.
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Workstream B: concept-note authoring scaffolding](#workstream-b-concept-note-authoring-scaffolding) — provenance frontmatter landed in `concept-notes/README.md` 2026-04-23; still open: template MDX-compatibility test against ezquake.com vitepress, authoring-ritual shape (prompt/slash-command).
- [Workstream C: /docs ingest pipeline prep](#workstream-c-docs-ingest-pipeline-prep) — **Audit completed 2026-04-24** (15 mirror, 10 ignore, 4 split, 1 historical across 30 guide pages). **License resolved by operator decision 2026-04-24**: treat as CC-BY-4.0, vikpe consented verbally on Discord, no LICENSE commit required. **Framing flipped 2026-04-25**: ezquake.com/docs is single-maintainer-plus-stepped-back (vikpe: "1 edit beyond myself submitted in 6 years"); Oracle is the authoritative current-state source and upstream is the downstream human-readable surface. Most "imports" will actually be Path 2 rewrites citing upstream as source material rather than Path 1 mirrors. **Role map shipped 2026-04-24** (`docs/superpowers/specs/2026-04-24-layer3-role-map.md`): scale revised to ~22-26 notes; 7 roles surfaced; D1 voice resolved to tiered-per-shape; D2 (R7) parked as open bucket. **Two Path-2 rewrites shipped 2026-04-24/25**: `weapon-scripts.md` (first R7 exemplar) and `lightning-gun-customization.md` (second R7+R2 exemplar). Authority-grounding triad and progressive-disclosure structure both confirmed across 2 notes — pending 3rd-instance promotion to README rule. **Skill process improvements landed 2026-04-25**: Phase 7.5 operator consult gate + Phase 5b six-mechanism ruleset scan + help_remarks pull (in `~/.claude/skills/guide-rewrite/SKILL.md`). Remaining: gap-report output format as contributor onboarding kit (continues to grow), next guide rewrite (candidates: `scripting.md` for multi-concept ROI, `player-skins.md` for tighter scope).
- [Slipgate SCHEMA.md for snapshot consumer interface](#slipgate-schemamd-for-snapshot-consumer-interface) — **NEW 2026-04-26.** Slipgate's snapshot consumer types (`RawVar`, `RawCommand`, `RawMacro`, etc.) live inline in `apps/slipgate-app/src/lib/config/loaders/ezquake.ts`. The shape is small and single-file today, but the upcoming UI arc surfacing version-arc badges / source_state pills / default_history timelines will benefit from a single typed contract doc paired with oracle's `apps/qw-oracle/docs/entity-types.md` (the producer-side equivalent). Defer until that UI arc starts; revisit if the inline types start to fragment.
- [Quake Dir Control Phase 3 — refined scope](#quake-dir-control-phase-3--refined-scope) — **NEW 2026-04-26 night.** Phase 3 (swap + UI + delete + foreign backup) ready to execute, with refinements from the late-evening fingerprinter conversation: design version list to anticipate MyQuake unification, include stubbed "Add Quake client" button, apply three-tier identity surfacing principles, address the "mid-session path changes don't re-import" gap with explicit version-list actions.
- [Add Quake Client / MyQuake unification — Phase 3.5 plan written](#add-quake-client--myquake-unification-post-phase-3-scope-sketch) — **NEW 2026-04-26 night.** Plan SHIPPED at `docs/superpowers/plans/2026-04-26-add-quake-client.md` (804 lines, commit `509f1e5`). Four sub-phases (~6-8hrs): ClientFingerprint Rust module + release_cache module + MyQuake browser augmentation + Add-Client entry-point flow with default-select-all bulk-import checklist. Seven design decisions (D1-D7) + sixteen engineer gotchas. Position: between Phase 3 (swap+UI+delete) and Phase 4 (oracle snapshot widening) — user-facing multi-client UX before internal diff-viewer plumbing. Operator's plan: start a fresh session for second-pass review, report back any pushback / scope creep before execution. **REFINEMENT 2026-04-27:** see "Canonical-mode default" entry below — Phase 3.5 plan needs explicit canonical-mode-on-import policy + opt-out toggle design before execution.
- [Canonical-mode default for warehoused clients](#canonical-mode-default-for-warehoused-clients) — **NEW 2026-04-27.** Operator-surfaced design refinement after Phase 3 ship: clean `<family>.exe` per family in quake dir is the right default (shortcuts/launchers stay valid, dir doesn't accumulate cruft, matches stated mission of zero-friction version switching). Opt-out "messy mode" for filename-versioned side-by-side users. Phase 3 reverted its filename-preserving polish back to hardcoded `ezquake.exe`. Phase 3.5 plan needs canonical-mode policy embedded into bulk-import flow before execution — second-pass review is the place to design it.
- [Sub-pattern 2b: cmdline variant-matrix gaps](#sub-pattern-2b-cmdline-variant-matrix-gaps) — 2026-04-25. **Partially resolved 2026-04-25 (late):** `-U__linux__` added to Apple+Win clang variants flipped 2 of 4 entities — `-gl_ext` now cited at vid_common_gl.c:340, `-allowmultiple` now cited at sys_win.c:682. Remaining 2 (`-nohwtimer` at sys_win.c:572 and `-gl-forward-only-profile` at gl_sdl.c:50) are blocked on the same SDK-stub-headers solve as the deferred `-nopriority` row from the Layer 1 doc_only audit — both call sites live inside function bodies whose surrounding statements use unresolved Windows SDK / SDL types under Linux libclang, so PARSE_INCOMPLETE recovery skips the compound expressions even though simpler `if (COM_CheckParm(...))` calls in the same files succeed.
- [Plugin v-table asset detection (loader-sites handler)](#plugin-v-table-asset-detection-loader-sites-handler) — **NEW 2026-04-26.** FTE asset extraction (Phase 2d-bundle) found that plugin source roots emit zero rows from the asset_loader_sites handler, while the cvars handler captures plugin-registered cvars. Cause: FTE plugins reach asset loaders through `cvarfuncs->GetNVFDG()` and similar v-table calls, not direct C calls in LOADER_FUNCTIONS. Only `plugin:ezhud` is currently affected (HUD images). `plugin:ezscript` has zero asset surface; no other plugins are in scope. Pressure: low — ezhud's images ship bundled with FTE, so an installed user has the assets regardless of the bundle classifying them.
- [Cvar-binding handler indirection gap (snprintf chains + CVARFC callbacks)](#cvar-binding-handler-indirection-gap-snprintf-chains--cvarfc-callbacks) — **NEW 2026-04-26.** The asset_cvar_bindings handler's auto-pass corroborates only the simplest pattern: `cvar.string` member-ref in the same compound scope as a loader CALL_EXPR. It does NOT follow snprintf chains (`Q_strncpyz(name, baseskin.string, ...)` then `FS_Open(name)`), CVARFC callbacks (`r_skybox` → `R_SkyBox_Changed` → `R_SetSky`), or any other multi-hop indirection. This is a Layer 1-wide handler limitation, not FTE-specific: confirmed at FTE build-6698 (4 of 22 seed bindings stand on seed authority alone) AND at ezQuake head (23 of 24 seed bindings stand on seed authority alone). Bundle reconciliation correctly treats these as `seedRetained` rows — they're not lost, just not mechanically corroborated. Pressure: low. Worth fixing only when the seed-authoring cost of writing bindings the handler could detect becomes painful.

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
**Status:** ezQuake head + deep-time walk complete (v3.0 to head); QWCL 2.33 shipped; FTE Phase 2d-core fully shipped (Pass 1 closed). Next: Phase 2d-bundle (asset extraction), then Phase 2e MVDSV+KTX.

### What shipped through Phase 2c.6

- **Schema v3** at `apps/qw-oracle/scripts/load-knowledge/schema.ts` — entities with 9 type values (cvar, command, macro, cmdline_param, keyname, hud_element, ruleset, token_primitive, asset_category) plus per-type version tables and 4 asset relation tables (asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites).
- **Loader pipeline** with `load-version`, `load-assets`, `diff`, `enrich` CLIs. Seed-first + AST auto-pass reconciliation proven against ezQuake head (bea2515). Phase 2b loader follow-ups (version-string comparison, blame memoization, src-prefix map, extractor trailing-whitespace) all drained 2026-04-20.
- **Extractors** in `apps/qw-oracle/scripts/extractors/ezquake/` for all 8 ezQuake entity types plus asset loader sites, cvar bindings, path-rules verifier. Hand-authored seed YAMLs in `apps/qw-oracle/scripts/extractors/ezquake/seeds/` for asset taxonomy and cvar bindings.
- **End-to-end loaded**: 3849 ezQuake entities, 110 asset_loader_sites, 26 asset_cvar_bindings, 14 source-verified path_rules, 17 asset_categories.

### Remaining sub-phases (roadmap reordered 2026-04-20)

**Tier 1 — Phase 2f Historical backfill (UNBLOCKED 2026-04-24).** Walk every ezQuake tag, diff consecutive tags, git-blame → PR enrichment. Reuses all extractors; pure orchestration. **Sanity-sample calibration cleared the same day:** 4 tag pairs eyeball-reviewed (3.6.5→3.6.6 regression + 3.6.1→3.6.2 oldest + 3.6.6→3.6.8 recent + 3.6.2→3.6.5 stress), all §8 thresholds hold at starting values, P1 detector bug (commit-UNKNOWN sentinel) fixed in-flight in `clusters.ts`, P3 semantic-pass abbreviation-bridge captured to its own HANDOVER entry. Full calibration note at `docs/superpowers/specs/2026-04-24-extraction-review-sanity-sample-calibration.md`. Extraction is ~55x faster via `extract-ezquake-unified.py` (shared-walk + 12-core parallelism, ~14s per tag vs 749s legacy sequential). Byte-equivalent to legacy output across HEAD + 3.6.6 + 3.6.0 + 3.2.3. Remaining cost is the per-pair walk time (operator judgment, not machine throughput).

**Tier 2 — Phase 2d FTE cvars -- SHIPPED 2026-04-26.** See Updated notes above. Pass 1 runtime cvarlist diff CLOSED (Pattern 3 fix + residual 114 all explained). Remaining FTE work: Phase 2d-bundle (asset extraction).

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

## Quake Dir Control Phase 3 — refined scope

**Added:** 2026-04-26 night (post-Phase-2 wrap, after extended fingerprinter design conversation).
**Status:** Phase 3 ready to execute in a fresh terminal. Plan-as-written at `docs/superpowers/plans/2026-04-26-quake-dir-control.md` Phase 3 (lines 1614+) is the authoritative starting point; this entry layers the design refinements that emerged after Phase 2 verified end-to-end on Windows.
**Verification first:** `git log --oneline 73c2624..HEAD` should show the 8 Phase 2 commits (`c4238f9`, `f2bee06`, `07ac770`, `53953ca`, `9396a25`, `7f133aa`, `8aefc60`, `ae875ca`). `cargo test --quiet 2>&1 | grep "test result"` from `apps/slipgate-app/src-tauri/` should show `102 passed`. `bun test src/lib/quake-dir/` from `apps/slipgate-app/` should show `8 pass`. Operator's Windows install at `%APPDATA%\com.slipgate.app\binaries\` should contain `index.json` + `blobs/<sha>.exe` + `ezquake/<version>/manifest.json` (proof of Phase 2 working end-to-end).

### Plan-as-written deliverables (unchanged)

- New `commands/version_swap.rs` module owning ALL canonical-exe mutation
- Refactor `download_and_install_update` (per D7) to extract straight into `<data-root>/binaries/.staging/` and call `swap_active_version` instead of doing its own backup/rename. Delete legacy `backup_exe` and stages 5-7 of `download_and_install_update`.
- New `VersionWarehouse` SolidJS component listing every warehoused version with switch + delete buttons
- D6 foreign-exe backup heuristic: hash currently-installed exe before swap; if sha256 is in the warehouse, no backup needed (we already have the bytes); if foreign, rename to `<stem>.bak.exe`

### Design refinements from late-evening fingerprinter conversation

These layer on top of the plan-as-written; they don't replace any of it.

- **Group version list by client even if only ezquake is populated today.** The UI structure should anticipate the post-Phase-3 unification with MyQuake (see "Add Quake Client / MyQuake unification" entry below). When that next phase lands, the list will fill in unezQuake / FTE sections without needing a structural rewrite. Empty client sections can be hidden until populated.
- **Include "Add Quake client" button at the top of the version list, stubbed for now.** Either no-op with a tooltip ("coming soon") or a minimal "type a path" fallback that delegates to existing `import_existing_install`. Real flow comes in the next phase. The button placement decision matters now because the version list is what users will look at when asking "how do I add another client?" — having no answer is worse than a stub.
- **Apply three-tier identity surfacing principles per `reference_three_tier_identity_model.md`.** When displaying entries in the version list:
  - Tier 1 (family, always known): version row shows client family identifier (ezquake / unezquake / fte)
  - Tier 2 (matched-to-official, when applicable): positive UI signal ("verified") for versions that match GitHub Releases data
  - Tier 3 (unrecognized): for warehoused versions whose version string isn't in the official release list, surface "unrecognized build" with an inline upgrade nudge to the latest official version
  - Phase 3 doesn't need to BUILD the Tier 2/3 cross-check (that's the next phase's release-cache work); just design the UI rows so the Tier 2/3 visual states are easy to add later
- **Address the "mid-session path changes don't re-import" gap.** Phase 2 verified that the warehouse bootstrap fires once at app launch; switching exe path in the UI mid-session updates which exe slipgate uses but doesn't trigger a new reconcile/import. To populate more versions today, the user must fully quit and relaunch. **Phase 3's version list panel needs explicit "import this version" + "switch to this version" actions** so the user can manage their warehouse without quit-and-relaunch cycles. Wire `import_existing_install` and the new `swap_active_version` into UI buttons; also call `reconcile_active_version` on user-initiated path changes via the existing path picker.

### Specific code anchors verified during Phase 2 execution

- `apps/slipgate-app/src-tauri/src/commands/updater.rs:507-538` (existing `backup_exe` — Phase 3 deletes this)
- `apps/slipgate-app/src-tauri/src/commands/updater.rs:661-831` (existing `download_and_install_update` — stages 5-7 are what Phase 3 replaces with `swap_active_version` call)
- `apps/slipgate-app/src-tauri/src/commands/updater.rs:157` (`parse_pe_version` made `pub` during Phase 2 normalization fix `ae875ca`; reuse for any new code that needs PE-version normalization)
- `apps/slipgate-app/src-tauri/src/commands/version_warehouse.rs` (Phase 2 module; `register_version_at` / `list_warehoused_versions_at` / `read_index_at` / `write_index_at` / `blob_path_for` are the helpers Phase 3's swap module composes with)
- `apps/slipgate-app/src-tauri/src/commands/warehouse_reconcile.rs` (Phase 2 module; reconcile is what Phase 3's path-change handler should call)
- `apps/slipgate-app/src/lib/quake-dir/warehouse.ts` (Phase 2 frontend wrappers Phase 3 UI consumes)
- `apps/slipgate-app/src/lib/quake-dir/firstRunImport.ts` (Phase 2 bootstrap; design parallel `userInitiatedReconcile` for path-change events)

### Pressure

Medium. Phase 2 is verified working end-to-end on Windows. Phase 3 unblocks the user-facing "switch between warehoused versions" feature, which is the first phase of Quake Dir Control that produces visible UX value. Plan estimate ~4 hours; should be a single-session execution.

### Related

- Plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md` Phase 3 (~lines 1614-2120)
- Memory: `project_quake_dir_control.md` (full multi-phase status)
- Memory: `reference_three_tier_identity_model.md` (Tier 1/2/3 principles)
- Memory: `reference_slipgate_devtools_invoke.md` (why filesystem inspection beats devtools for verification)

---

## Canonical-mode default for warehoused clients

**Added:** 2026-04-27 (after Phase 3 Windows smoke surfaced the multi-install + filename-preservation tension).
**Status:** Design refinement that lands in Phase 3.5 second-pass review — NOT a separate phase. Phase 3 reverted its targetExeName-from-basename polish back to hardcoded `ezquake.exe` so the canonical-mode default holds today; Phase 3.5 implements the full policy + opt-out toggle.
**Verification first:** `grep -n 'targetExeName' apps/slipgate-app/src/components/ClientsTab.tsx` — should show `targetExeName="ezquake.exe"` hardcoded (commit reverted the basename derivation 2026-04-27). When Phase 3.5 ships canonical-mode, this hardcode gets replaced by `<family>.exe` lookup keyed off `client_def`.

### The model

**Canonical-mode (default):** One clean `<family>.exe` per client family in the user's quake dir (`ezquake.exe`, `fte.exe`, etc.). Warehouse owns all versions in `<data-root>/binaries/blobs/`. Switching versions or updating mutates the canonical file in place, atomic-rename via `version_swap` (already shipped). Shortcuts, batch files, Steam links, Discord rich-presence registrations all keep working forever because the path never changes.

**Messy mode (opt-out):** Per-path tracking, filename preserved on import, switching writes bytes to whatever filename the user is currently pointing at. This is what Phase 3 polish briefly shipped before being reverted — preserves multi-install side-by-side layouts (`ezquake-3.6.6.exe`, `ezquake-3.6.9.exe`, etc.) but produces the misleading-state problem (a file named `ezquake-3.6.6.exe` containing 3.6.9 bytes after a switch).

### Why canonical is the right default (operator's framing)

- **Zero-friction switching matches the stated product mission.** From `reference_three_tier_identity_model.md`: "I want people to get updated clients instead of sitting on old stale stuff out of laziness." Canonical-mode means "switch versions" doesn't break anything the user has set up; nudge succeeds.
- **Quake dir stays clean.** Today's reality (operator-observed): users accumulate `ezquake.exe`, `ezquake-3.6.6.exe`, `ezquake-3.6.9.exe`, `ezquake-glsl.exe`, plus stale `ezquake-3.6.6-1746834821.exe` timestamp-suffix backups from the old `backup_exe` path. Canonical-mode keeps the dir to one file per family; warehouse is the source of truth for "what versions exist."
- **Shortcuts and launchers stay valid.** Steam, Windows pinned items, Discord rich-presence, batch files — all reference paths. If `<family>.exe` is canonical and stable, every external integration keeps working across version switches.
- **Opt-out is honest.** Power users who genuinely want filename-versioned side-by-side installs (some QW community members do) get a toggle; canonical-mode doesn't trap them. **Default opt-IN to canonical, advanced setting opts out.**

### What Phase 3.5 plan needs to absorb

Phase 3.5's plan at `docs/superpowers/plans/2026-04-26-add-quake-client.md` already has the bulk-import flow (scan → checklist → ingest → set-as-primary). Canonical-mode embeds into that flow at task 4.x ("Import selected"):

1. **Profile schema gain.** `clients` map keyed by family: `{ ezquake: { mode: 'canonical' | 'messy', quake_dir: string, primary_exe?: string } }`. Replaces the per-path `exe_path` for canonical-mode entries; messy-mode entries can still store `exe_path` to preserve current Phase 3 behavior. Schema migration on first launch after the Phase 3.5 ship.
2. **Canonicalize-on-import.** For each ticked entry in the bulk-import checklist:
   - Hash, write blob, write manifest (existing flow).
   - **New:** if canonical-mode is on for that family AND the source filename is non-canonical AND no canonical `<family>.exe` exists in the same dir yet → rename source to `<family>.exe`. If canonical exists already → leave the source as-is (warehouse has the bytes; user can delete the dupe later via the panel).
   - **New:** "Set as primary" radio sets `clients[family].primary_exe` to the canonical path (`<quake_dir>/<family>.exe`).
3. **Opt-out toggle UI.** Settings tab gains a per-client mode toggle. Default canonical. Switching from canonical → messy: existing canonical file stays, no migration. Switching from messy → canonical: prompt "rename `ezquake-3.6.6.exe` to `ezquake.exe`?" — user-confirmed action.
4. **Variant filenames (per Phase 3.5 D6).** Filename-suffix variants (`-glsl`, `-debug`) become `<family>-<variant>.exe` canonical names with `version` suffixed `-glsl` etc. Stays consistent with the canonical-naming policy.
5. **Phase 3 stub button stays disabled until Phase 3.5 ships the bulk-import.** Already true today.

### What this changes in the Phase 3.5 plan as written

Plan-as-written doesn't have an explicit "canonicalize on import" step — operator confirmed 2026-04-27 that the implicit assumption was "preserve user filename" (which is messy-mode). The fresh terminal doing Phase 3.5 second-pass review should:

- Add a new design decision (D8?) to the plan: "Canonical-mode is the default; opt-out via per-client toggle."
- Update task 4.x ("Import selected") to include the canonicalize-on-import step.
- Update the profile schema preview / state docs to describe the new `clients[family]` shape.
- Surface the opt-out toggle in the Settings tab plan (today the plan focuses on MyQuake browser; Settings tab gets a small addition).
- Decide schema-migration strategy for existing profiles (one-shot migrator on first launch, vs lazy on first read).

### Don't do this in Phase 3

Phase 3 already shipped. The targetExeName=basename polish was reverted 2026-04-27 because preserving the user's `ezquake-3.6.6.exe` filename produced the misleading-state problem (file name says 3.6.6 but bytes are 3.6.9 after a switch). Hardcoded `ezquake.exe` is the canonical-mode default and stays. The foreign-exe Import affordance (also shipped 2026-04-27) stays — it's still valid; canonical-mode just changes what happens *after* import (the rename-to-canonical step). The single-exe Import flow doesn't need to canonicalize today because the user-pointed exe IS the canonical exe by definition (it's already in the canonical-named slot, or we treat it as the source file the user wants to canonicalize next).

### Open questions for Phase 3.5 second-pass

1. **Per-client toggle granularity.** Should canonical-mode be a global slipgate setting, or per-client family? Operator's instinct: per-client (might want canonical for ezQuake daily-use, messy for FTE experimentation). Worth confirming during second-pass.
2. **What's the canonical filename per family?** `ClientDef.exe_name` already encodes today's choices: `ezquake.exe`, `unezquake.exe`. FTE's canonical name probably `fte.exe` or `ftequake.exe`. Lock during plan refinement.
3. **First-launch UX after slipgate auto-detects an existing install.** Today first-run import keys off `exePath()`. If that exe is at a non-canonical name in canonical-mode, do we silently rename, prompt, or wait until next user action? Lean toward prompt, since it's a one-time decision the user should be aware of.
4. **Inverse direction: switching modes after the fact.** If user starts in canonical and switches to messy, current canonical bytes stay as `ezquake.exe`. If user starts in messy with `ezquake-3.6.9.exe` and switches to canonical, do we batch-rename or expect the user to rename manually? Probably "offer to rename now" with a single-button prompt.

### Pressure

Medium. Phase 3.5 second-pass is the next session in the chain; this refinement needs to be absorbed before any Phase 3.5 implementation kicks off. Adding ~200 lines of canonical-mode design to the existing plan is plan-only work, no code yet. Estimate ~1 hour of plan refinement before execution starts.

### Related

- Plan: `docs/superpowers/plans/2026-04-26-add-quake-client.md` (Phase 3.5 plan that absorbs this refinement)
- Plan: `docs/superpowers/plans/2026-04-26-quake-dir-control.md` (parent multi-phase plan; Phase 3 shipped 2026-04-27)
- Memory: `reference_three_tier_identity_model.md` (the mission framing canonical-mode supports)
- Memory: `project_quake_dir_control.md` (Phase 3 fully shipped + polished as of 2026-04-27)
- Phase 3 final state commits: `9051e4b` through `e157e42` + `3b2d831` (running-check guard) + revert at `<commit-this-entry-lands-in>`

---

## Add Quake Client / MyQuake unification (post-Phase-3 scope sketch)

**Added:** 2026-04-26 night (extended design conversation after Phase 2 verification). **Plan written same night** at `docs/superpowers/plans/2026-04-26-add-quake-client.md` (commit `509f1e5`, 804 lines). Operator's stated plan: start a fresh session for second-pass review of the plan before execution — invite pushback / scope creep concerns before committing.
**Status:** Plan ready for second-pass review. Phase 3 must ship before this phase executes (Phase 3's version warehouse panel hosts the "Add Quake client" button this phase wires up). Below is the executive summary of the plan; full details in the plan file.
**Verification first:** This is forward-looking; no current state to verify. Read in conjunction with `project_quake_dir_control.md` (the multi-phase plan's current state) and `reference_three_tier_identity_model.md` (the identity-surfacing principles this phase implements).

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
