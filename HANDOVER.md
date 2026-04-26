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
- [Sub-pattern 2b: cmdline variant-matrix gaps](#sub-pattern-2b-cmdline-variant-matrix-gaps) — 2026-04-25. **Partially resolved 2026-04-25 (late):** `-U__linux__` added to Apple+Win clang variants flipped 2 of 4 entities — `-gl_ext` now cited at vid_common_gl.c:340, `-allowmultiple` now cited at sys_win.c:682. Remaining 2 (`-nohwtimer` at sys_win.c:572 and `-gl-forward-only-profile` at gl_sdl.c:50) are blocked on the same SDK-stub-headers solve as the deferred `-nopriority` row from the Layer 1 doc_only audit — both call sites live inside function bodies whose surrounding statements use unresolved Windows SDK / SDL types under Linux libclang, so PARSE_INCOMPLETE recovery skips the compound expressions even though simpler `if (COM_CheckParm(...))` calls in the same files succeed.

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
