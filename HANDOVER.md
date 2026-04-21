# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle VISION.md needs active-assistance reframe](#qw-oracle-visionmd-needs-active-assistance-reframe) — current VISION.md talks Oracle Bot / Digest / Time Machine but not the broader constructive-query / version-aware vision
- [Pretty view + StatePanel visual polish](#pretty-view--statepanel-visual-polish) — deferred visual refinement on both the state editor and the pretty-render display; user wants to iterate on the feel tomorrow
- [Alias chain pretty view cosmetic: duplicate `.msg.point` rows](#alias-chain-pretty-view-cosmetic-duplicate-msgpoint-rows) — when an alias is referenced from two parent branches, chain view shows it twice and both highlight if either path fires
- [Player state simulator -- follow-ups](#player-state-simulator----follow-ups) — .loc dropdowns, visual polish, minor carry-overs
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [qw-config package missing Layer 1 quartet](#qw-config-package-missing-layer-1-quartet) — no CLAUDE.md, VISION.md, or OVERVIEW.md; only a substantial README. Pre-existing; surface next time qw-config is being touched substantially
- [Knowledge schema spec behind code (v2-v4 undocumented)](#knowledge-schema-spec-behind-code-v1-only) — v5 and v6 now have dated specs (2026-04-21); v1 original spec is stale; v2/v3/v4 (keyname/hud_element/ruleset/token_primitive/asset_category/release_notes) still absent from any spec file
- [Slipgate + monorepo VISION docs need web-services family addendum](#slipgate--monorepo-vision-docs-need-web-services-family-addendum) — 2026-04-20 brainstorm surfaced assets.quake.world / maps.quake.world triad + content-hash join key + GitHub OAuth backup; none of it reflected in VISION.md files yet
- [Phase 2f stress-test gap catalog](#phase-2f-stress-test-gap-catalog) — A1/A2/A3 surfaced 10 gaps + 1 new; Batch 1 + Batch 2 + Batch 3 all shipped (2026-04-21). All 11 gaps closed plus the fresh-DB CHECK latent bug. Phase 2f historical backfill is unblocked.
- [ezquake asset-bundle gaps surfaced by slipgate quake-dir inventory](#ezquake-asset-bundle-gaps-surfaced-by-slipgate-quake-dir-inventory) — 2026-04-21: bb462ae regeneration wiped client_defaults; png/jpg lack path_hint variants; 9 loader families missing (.log, .loc, .lit, .dat, .kmap, .xml, .spr, .qwz, .dll). Post-Batch3 task for qw-oracle session.
- [Asset reference-resolution graph — research foundation](#asset-reference-resolution-graph--research-foundation) — 2026-04-21: spec at `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` proposes shift from category-classification to consumer-reference graph (parameterized-path extraction + BSP/progs parsers + asset_companions schema). Foundation for a future implementation plan; precondition met by post-Batch3 oracle work.

---

## Phase 2f stress-test gap catalog

**Added:** 2026-04-20
**Updated:** 2026-04-21 — Batch 3 complete. All 11 catalog gaps closed plus the fresh-DB CHECK latent bug. Phase 2f historical backfill is unblocked.
**Status:** Batch 3 landed across commits `f0ba2e9 .. d949108` (fresh-DB CHECK widening, loader-site canonical_id, extractor version-tolerance, schema v6 source_overrides, per-field extractor emissions, loader adapter wiring, diff blame override). A1+A2 re-validated against the fixed pipeline; ruleset UNKNOWN-mod count dropped 5 -> 0.
**Verification first:** `git log --oneline -15 -- apps/qw-oracle/scripts/load-knowledge/ packages/qw-config/scripts/ docs/superpowers/specs/` — should include `d949108 perf(qw-oracle): preload source_overrides into Map for diff hot-loop` and `bd285f8 feat(qw-oracle): schema v6 -- source_overrides blame index` near the top. Schema version query: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT value FROM schema_meta WHERE key='schema_version';"` returns `6`.

### Stress test scorecard

| Jump | change_events | cross-linked to release_notes | Notes |
|---|---|---|---|
| A1: 3.6.8 -> 3.6.9 | 6 | 4/6 (67%) | clean mechanics validator |
| A2: 3.6.5 -> 3.6.6 (pre-Batch1) | 77 | 2/77 (3%) | rich volume; exposed struct-blame + parser gaps |
| A2: 3.6.5 -> 3.6.6 (post-Batch1 re-parse) | 77 | 11/77 (14%) | parser fixes lifted rate 3% -> 14% |
| A3: 3.1 -> 3.2 (pre-Batch1) | 0 | N/A | catastrophic -- every extractor failed on repo layout |
| A3 crossover: 3.6.1 -> 3.6.2 (post-Batch1) | 88 | not yet evaluated | root->src layout boundary, 100% real SHA blame |
| A1: 3.6.8 -> 3.6.9 (post-Batch2) | 7 entity + 12 relation | not yet evaluated | +1 flag_bit creation (fpd_enable_player_count); relation_changes code path active |
| A2: 3.6.5 -> 3.6.6 (post-Batch2) | 77 entity + 22 relation | 11/77 (14%, unchanged) | flag_bit stable; relation_changes code path active |
| A1: 3.6.8 -> 3.6.9 (post-Batch3) | 7 entity | not yet evaluated | schema v6 source_overrides populated (577 rows at head); no ruleset/hud_element mods in this diff |
| A2: 3.6.5 -> 3.6.6 (post-Batch3) | 77 entity | 11/77 (14%, unchanged) | ruleset UNKNOWN-mod count: 5 -> 0; ruleset mods now blame to struct_field_decl commit (more correct semantic author); hud_element mods unchanged (no field_source_lines for `owned_cvars_json`) |

7 ezQuake tags loaded for entity types (3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, head). flag_bit loaded across 3.6.5, 3.6.6, 3.6.8, 3.6.9, head. Release_notes loaded for 3.6.2, 3.6.6, 3.6.9.

### Gap catalog (10 items, 4 tiers)

**Tier 1 -- Blocks historical walks:**

1. ~~Repo-layout version-tolerance (A3).~~ **RESOLVED (Batch 1, commit `18cb835`).** All 11 extractors auto-detect `<repo>/src` vs repo-root. `diff-versions.ts` resolves per-version prefix via `treeHasDirectory` (git ls-tree) on each blame ref independently. Validated end-to-end on 3.6.1 -> 3.6.2 crossover.
2. ~~Version-tolerant struct parsing (A2).~~ **RESOLVED (Batch 3, commits `2219c24` + `a35cd7f`).** Version-tolerance audit at 3.2.3 / 3.6.0 / 3.6.5 surfaced two concrete regressions: macros extractor failed on pre-`macro_ids.h` tags, cmdline extractor failed on pre-`cmdline_params_ids.h` tags. Both now fall back to the pre-enum identifier list. Ruleset patch from `8bf832b` and utf-8 tolerance from Batch 1 continue to hold.
3. ~~Struct-field-addition blame lands wrong (A2).~~ **RESOLVED (Batch 3, commits `5642754` + `314b5bd` + `49b4400` + `1d31ee3`).** Ruleset + hud_element extractors emit per-field `field_source_lines` maps. Loader adapters upsert `source_overrides` rows keyed by (entity_id, version, field_name). Diff pipeline consults overrides first, falls back to entity anchor. Post-Batch3 A2 re-run: ruleset UNKNOWN-mod count 5 -> 0; all 25 ruleset mods now blame to the struct_field_decl commit (more correct semantic author) rather than the loader call-site.
4. ~~Cvar default-value blame via `Cvar_SetDefault` call sites (A2).~~ **RESOLVED (Batch 3, commit `1dbe144`).** Cvars extractor emits `default_overrides` top-level payload with `&cvar_name`-anchored regex call-site matches for `Cvar_SetDefault` / `Cvar_ForceSet` / `Cvar_LockDefault`. Adapter wires them into `source_overrides` as `call_site` rows. Best-effort regex, not AST (macro-expanded forms don't match) -- YAGNI until evidence demands AST walk.

**Tier 2 -- Data completeness:**

5. ~~`flag_bit` entity type needed.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 adds `flag_bit_versions` table. Extractor `extract-ezquake-flag-bits-clang.py` covers `CVAR_*` (26), `FPD_*` (7), `STAT_*` (17) at ezQuake head = 50 entities. Extensible via `FAMILY_TARGETS` config. Loaded across 5 tags (head + 3.6.5/3.6.6/3.6.8/3.6.9). `PEXT_*`/`FTE_PEXT_*` deferred (0 at head; extractor will pick them up naturally if encountered during historical walks).
6. ~~Asset relation diff mode.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 adds `relation_changes` table (parallel to `change_events`, relation-keyed with deterministic `row_key_json`). `diff-versions.ts` emits created/deleted/modified rows for all four asset_* tables. Blame intentionally deferred in v5 (`commit_sha='UNKNOWN'`): relation rows don't carry source_file/source_line; proper blame is a Batch 3 item.

**Tier 3 -- Parser precision/recall:**

7. ~~Token-primitive substring bug (A2).~~ **RESOLVED (Batch 1).** `/\$([a-zA-Z0-9])(?![a-zA-Z0-9])/g` now guards against `$dateiso` matching `$d`.
8. ~~Parser patterns missing.~~ **RESOLVED (Batch 1).** `+showscores` via PLUS_MINUS_COMMAND_RE, `"smackdrive"` via QUOTE_WRAP_RE, `set_{calc,eval,ex,ex2}` via BRACE_EXPAND_RE, `hud_gun[2-8]_frame_hide` via BRACKET_RANGE_RE (capped at 16 items).
9. ~~Bare-word command allowlist.~~ **RESOLVED (Batch 1) -- conservatively.** 6-entry list (smackdrive/smackdown/thunderdome/mtfl/qcon + skywind). Deliberately small to avoid English-word false positives. Expand with evidence.

**Tier 4 -- Hygiene:**

10. ~~Drop-guard uses `entityCount` not `_versions` row count (A1).~~ **REJECTED after re-examination (Batch 1).** Help-only entries DO become rows in `_versions` (as doc_only), so the existing drop-guard comparison is self-consistent. Not a real bug.

### Phase 2f historical backfill is unblocked

All architectural prerequisites shipped across Batch 1 + Batch 2 + Batch 3 (2026-04-21). The fresh-DB CHECK latent bug (Task 2 reviewer flag) is also fixed (commits `f0ba2e9` + `6c0ba58`): `SCHEMA_V1_SQL` entities CHECK now lists the current type set, so bringing up a DB from empty no longer fails on v1 load before v2-v6 migrations apply the ALTER TABLE widenings.

Next Phase 2f step is the historical walk proper: iterate every ezQuake tag, run extractors + load-version per tag, diff consecutive tags. `source_overrides` populates automatically as a side effect of each load-version call (validated on 3.6.5 / 3.6.6 / 3.6.8 / 3.6.9 during Batch 3 revalidation). Pre-Batch-2 tags loaded before the adapter wiring will need a re-load to backfill `source_overrides` for them.

### Known limitations NOT in the catalog

- **FTE / MVDSV / KTX repo-layout and struct-shape assumptions** are entirely untested. Phase 2d (FTE) is its own discovery pass.
- **Pre-v3.0 SVN-era tags** (`ezquake_19*`, `ezquake_2*`, 2005-2016) likely add a second-order layout/struct differential. Low priority.

### New follow-ups surfaced during Batch 1

- **`$dateiso` in backticks doesn't link to the macro** `dateiso`. Backtick extractor preserves the `$` prefix but macros are stored without it. Small parser tweak: strip leading `$` when looking up non-token-primitive candidates. Low priority.
- **`$`-prefixed identifiers inside backticks** generally need a two-stage lookup: try as `$X` token primitive first, then strip `$` and try as macro. Same tweak as above.

### New follow-ups surfaced during Batch 2

11. ~~Loader-site natural-key fragility (surfaced during Batch 2 A1/A2 validation).~~ **RESOLVED (Batch 3, commit `bb462ae`).** `asset_loader_sites.canonical_id` formula changed from line-embedded `<function>_<basename>_<source_line>` to ordinal-based `<function>_<basename>_<nth-call-in-function>`. Line-independent; survives upstream edits that shift line numbers. Post-Batch3 A1/A2 re-runs observed 0 spurious (created, deleted) pairs in relation_changes for asset_loader_sites (down from 6+6 on A1 / 11+11 on A2).

### Companion finding: in-repo CHANGELOG exists in older tags

3.1 and 3.2 ship a root-level `CHANGELOG` file (47 lines, self-described as "INCOMPLETE"). Stopped being maintained when GitHub releases took over. Useful context for historical coverage but not reliable enough to replace GitHub release-notes as the canonical source.

### Extraction performance lesson

**The parallel extraction helper over-parallelizes at scale.** Running 2 tags concurrently with cvars-in-parallel-with-others per tag produces up to 22 concurrent libclang processes fighting for CPU. Measured wall time during Batch 1 validation was 811s per tag instead of the expected ~3-4 min -- each "fast" extractor slowed from ~5-30s to 140-160s under contention.

**Correct approach for next run:** 2 tags in parallel, but extractors SEQUENTIAL within each tag. libclang is already multi-threaded internally; one extractor at a time per tag avoids contention. Expected wall time: ~4 min total for 2 tags. Update `/tmp/extract-tag-parallel.sh` (or promote to `packages/qw-config/scripts/`) before the next extraction sweep.

### Related

- Batch 3 commits: `f0ba2e9` + `6c0ba58` (fresh-DB CHECK widening), `bb462ae` + `828b9fa` (ordinal-based loader-site canonical_id), `2219c24` + `a35cd7f` (cmdline + macros extractor version-tolerance), `c3cbc0d` + `bd285f8` (schema v6 spec + migration for source_overrides), `91dceda` (SourceOverrideRow type + upsert helper), `5642754` + `314b5bd` + `1dbe144` (per-field + call-site extractor emissions), `49b4400` (adapters emit source_overrides), `1d31ee3` + `d949108` (diff pipeline blame override + perf Map preload).
- Batch 3 plan: `docs/superpowers/plans/2026-04-21-phase-2f-batch-3.md` (13 tasks, full spec coverage of all Tier 1-complex gaps).
- Batch 3 spec: `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md`.
- Batch 3 validation note: `/tmp/batch3-validation.md` (observed counts, blame-quality comparison).
- Batch 2 commits: `b9d27a0` (spec) `f76f975` (schema v5) `83c4ff4` (types+upserts+adapter) `279a017`/`17f7603` (extractor) `2af6d6f` (flag_bit diff config) `c7f26ee`/`db72945` (relation_changes diff).
- Batch 2 plan: `docs/superpowers/plans/2026-04-21-phase-2f-batch-2.md` (11 tasks, 3+4 folded due to typecheck-atomicity).
- Batch 2 spec: `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.
- Batch 2 validation note: `/tmp/batch2-validation.md` (observed counts, loader-site finding).
- Batch 1 commit: `18cb835 feat(qw-oracle): Batch 1 gap fixes -- repo-layout tolerance + parser extensions`.
- Prior commits: `b1b7d9c` (Phase A1 + Phase B pipeline foundation), `8bf832b` (ruleset extractor patch + original gap catalog).
- Loader code: `apps/qw-oracle/scripts/load-knowledge/` (generalized diff, release_notes at v4, flag_bit + relation_changes at v5, source_overrides at v6).
- Memory: `project_qw_oracle_vision.md` holds Phase 2f roadmap; this catalog is Phase 2f prerequisites.

---

## qw-oracle VISION.md needs active-assistance reframe

**Added:** 2026-04-16
**Status:** pending, next qw-oracle session
**Verification first:** read `apps/qw-oracle/VISION.md` in the poc worktree. If it mentions "active assistance" / "constructive queries" / "version-aware retrieval", this is resolved.

The current VISION.md (light-edited 2026-04-14 to add three-layer block) still frames the project around the original three paths: Oracle Bot, Digest, Time Machine. The 2026-04-15 conversation with ParadokS crystallized a broader vision:

1. **Active assistance, not just retrieval.** The end product is a system that can *construct* configs (weapon priority chains, teamsay macros, hybrid binds) from Layer 3 pattern guides, not just look up cvars. This is a qualitative shift from "smart search" to "domain copilot."
2. **Version-aware retrieval.** Once the AST extractor version-walk ships, every cvar/command carries first_seen_version/last_seen_version. Cross-referencing Layer 2 session dates against those ranges gives temporal relevance filtering: "this advice predates the 3.6 rewrite."
3. **Layer 2 as FAQ signal for Layer 3.** Chat is not primarily a direct answer source — it's a compass for what concept notes to write. Mine the chat for frequent questions, author targeted Layer 3 notes for the top topics, link back into the sessions.
4. **ezquake.com docs conversion pipeline.** The existing curated guides (weapon-scripts.html, scripting.html, etc.) are the natural input for Layer 3. Each page gets adapted into 1-3 concept notes with canonical ID references.

All four points are captured in `project_qw_oracle_product_vision.md` memory, but VISION.md itself (the file other devs would read) does not reflect them yet. Low urgency — the memory carries the knowledge across sessions, and the VISION.md rewrite is best done alongside the presentation prep when the framing is most fresh.

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

## Alias chain pretty view cosmetic: duplicate `.msg.point` rows

**Added:** 2026-04-17
**Status:** known cosmetic limitation, not fixing now
**Verification first:** open the Point bind's expanded chain in Pretty mode. If `.msg.point` appears twice as separate rows AND both rows highlight when either parent branch reaches `.msg.point`, this issue still holds.

`resolveAliasChain` flattens the alias tree with only per-body dedup (`seen` set per-call scope). When an alias like `.msg.point` is referenced from two different parent branches (e.g. `__point` else AND `__point_powerup` else), it appears twice in the flat chain array. The active-leaf highlight matches on stripped `entry.command` text, so both duplicates highlight identically whenever either path's leaf fires.

Proper fix requires tracking the parent-path to disambiguate -- a non-trivial change that affects the chain visualization data model. Deferred because the user's reaction was "didn't quite understand... is it because 2 different chains end up with that msg" -- the behaviour is internally consistent, just visually redundant. Not blocking anything.

### Related

- `apps/slipgate-app/src/components/AliasChainResolver.tsx` `resolveAliasChain` + `activeLeafCommands` matching

---

## Player state simulator -- follow-ups

**Added:** 2026-04-17
**Status:** v1 shipped; polish and extension items parked
**Verification first:** `bun test src/lib/simulator` from `apps/slipgate-app/` — expect 92 pass. `src/components/StatePanel.tsx` exists. Right-rail toolbar has `[Keyboard] [State]` buttons on the far left.

The Player State Simulator (PlayerState model + ezQuake `if` evaluator + `evaluateTeamsay` walker + StatePanel UI + persistence) shipped 2026-04-17 across ~25 commits. OVERVIEW.md has the full feature description. This handover item captures deferred polish and extensions that didn't make v1.

### Sub-groups

**1. Minor carry-overs from v1 code review.**
- `useKeyboardPanelState.ts` error log messages: some use "Failed to X:" prefix, others use "X:" (the new simulator handlers are shorter-form). Cosmetic, 3-min fix. Files `apps/slipgate-app/src/components/useKeyboardPanelState.ts` lines 159/180/186/193/199/205.
- `resolveWeaponName` export from `src/lib/simulator/derivations.ts` is unused externally — safe to un-export (Task 4 implementer exported it unnecessarily during implementation). Minor API-surface cleanup.
- `useKeyboardPanelState.ts` is now ~236 lines. Not a problem but worth an eye if simulator features grow; may be worth extracting a `useSimulatorState` hook in future.

**2. Input behavior polish.** Debouncing, tab order, focus behavior in StatePanel form controls. Surface specific issues when using it in anger.

### Related

- Spec: `apps/slipgate-app/docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`
- Plan: `apps/slipgate-app/docs/superpowers/plans/2026-04-17-player-state-simulator.md`
- OVERVIEW.md has the full feature description and Code landmarks pointers.

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

The sibling package `qw-knowledge` has the same gap (only a few files, no README at all). The monorepo OVERVIEW.md explicitly acknowledges both packages are on lazy migration: "Neither has a README today; both will get one when the package is next touched."

### Fix shape

Don't sweep. When Phase 2 work lands and starts adding significantly to `qw-config` (new extractors, SQLite loader, new data format), pause to:
1. Split `CLAUDE.md` from `README.md` — rules for Claude go in `CLAUDE.md`, product description stays in `README.md`
2. Write `VISION.md` — why qw-config exists (shared engine-feature database, authoritative-source discipline, consumer-agnostic)
3. Write `OVERVIEW.md` — the living map: all extractors, all data files, all consumers, with lifecycle status

The README already contains most of the OVERVIEW content; the work is mostly restructuring, not writing from scratch.

Same treatment applies to `qw-knowledge` when it's next touched.

### Related

- Doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- Memory: `project_doc_philosophy.md`
- Monorepo OVERVIEW.md line 106: lazy-migration note

---

## Knowledge schema spec behind code (v2-v4 undocumented)

**Added:** 2026-04-20
**Updated:** 2026-04-21 — v5 and v6 now have dated specs. Drift narrowed to v2/v3/v4.
**Status:** Partial drain; schema is at v6 but v2/v3/v4 migrations never got their own spec files.
**Verification first:** `grep 'SCHEMA_VERSION' apps/qw-oracle/scripts/load-knowledge/schema.ts` should report `= 6`. `ls docs/superpowers/specs/2026-04-*qw-knowledge-schema*` — expect `v5-flag-bits-and-relation-changes.md` and `v6-source-overrides.md`.

The original schema design spec at `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` still documents only the v1 shape (cvar / command / macro / cmdline_param entities and the original eight tables). v5 and v6 now have their own dedicated spec files per the spec-first rule that kicked in at Phase 2f Batch 2. The remaining gap is v2, v3, v4:

- **v1 -> v2 (Phase 2c.5)** added four entity types: `keyname`, `hud_element`, `ruleset`, `token_primitive` — and their four per-type version tables.
- **v2 -> v3 (Phase 2c.6)** added one new entity type (`asset_category`) plus four relation tables: `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`.
- **v3 -> v4 (Phase 2f stress-test prep)** added `release_notes` table.
- **v4 -> v5 (Phase 2f Batch 2)** — documented at `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.
- **v5 -> v6 (Phase 2f Batch 3)** — documented at `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v6-source-overrides.md`.

### Fix shape

Either (a) retroactively write 3 dated spec files for v2, v3, v4 (small, mechanical), or (b) archive the v1 spec with a one-line supersession note and write a single consolidated `2026-04-XX-qw-knowledge-schema-v2-through-v4.md` covering all three. Option (b) is lighter-weight and matches the v5/v6 precedent of one-spec-per-migration-era. Worth doing next time someone is in oracle-docs mode; not blocking.

### Related

- Code: `apps/qw-oracle/scripts/load-knowledge/schema.ts` — search `SCHEMA_V2_ADDITIONS_SQL`, `SCHEMA_V3_ADDITIONS_SQL`, `SCHEMA_V4_ADDITIONS_SQL`.
- Phase 2c.5 plan: `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md` (describes v2 additions).
- Phase 2c.6 design spec: `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md` (describes v3 additions).
- E2E verify doc: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` has the current source-of-truth for what each v2-v6 table holds.

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

### Gap A: `client_defaults` block got wiped by the oracle regeneration

**Commit `bb462ae` (2026-04-21, "fix(qw-config): ordinal-based loader-site canonical_id, drops line-number")** regenerated the bundle JSON and dropped the entire `client_defaults` section that `cd68546` (2026-04-20) had added slipgate-side. That block is:

```json
"client_defaults": {
  "screenshot_filename_prefixes": ["ezquake"],
  "screenshot_dir_names": ["sshots", "screenshots"],
  "demo_extensions": [".dem", ".qwd", ".qwz", ".mvd"],
  "default_demo_ext": ".qwd",
  "image_extensions": [".png", ".jpg", ".jpeg", ".tga", ".pcx"],
  "log_extensions": [".log"],
  "match_format_cvars": ["match_format", "match_format_1on1", "match_format_2on2", "match_format_3on3", "match_format_4on4", "match_format_ffa"],
  "owned_gamedirs": ["ezquake"]
}
```

**Downstream effect:** slipgate's `compute_match_groups` early-returns when `demo_extensions` is empty, so match bundling (demo + screenshot + log triangles by shared parent+stem) returns 0 groups even though thousands of pairs exist on disk. Also breaks the screenshot heuristic that distinguishes `ezquake0001.png` (screenshot) from `textures/wall.png` (texture).

**Fix:** either (a) add `client_defaults` to whatever source files the extractor reads, or (b) make the extractor preserve/merge a known-schema top-level block when regenerating. Whichever keeps the data authoritative in the oracle without losing it on the next run. Values above are correct for ezQuake today; FTE/MVDSV when they ship will drop in their own block in a sibling bundle.

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

Two sittings, probably ~90 minutes each. Sitting 1: restore `client_defaults` handling in the extractor (Gap A) + add png/jpg path_hint coverage (Gap B). Sitting 2: add the 9 missing loader families (Gap C), with priority on .log / .loc / .lit / .xml since those account for ~6100 of the 6252 unclassified files.

**Slipgate-side band-aid applied 2026-04-21:** `client_defaults` block re-inserted directly into `packages/qw-config/src/data/ezquake-asset-bundle.json` + mirrored to `apps/slipgate-app/src-tauri/resources/`. Match bundling verified working (2265 bundles vs 0 before). The band-aid will be wiped again by the next oracle regeneration unless Gap A is fixed upstream. Subsequent inventory dump confirmed `.qwd`/`.mvd`/`.qwz` properly classified as demo and demo+log+screenshot triangles pairing correctly in `qw/matches/1on1/`.

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
