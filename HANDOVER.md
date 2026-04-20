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
- [Knowledge schema spec behind code (v1 only)](#knowledge-schema-spec-behind-code-v1-only) — `2026-04-18-qw-knowledge-extraction-schema.md` documents schema v1; v2 (keyname/hud_element/ruleset/token_primitive) and v3 (5 asset_* tables) are in `schema.ts` but absent from the spec
- [Slipgate + monorepo VISION docs need web-services family addendum](#slipgate--monorepo-vision-docs-need-web-services-family-addendum) — 2026-04-20 brainstorm surfaced assets.quake.world / maps.quake.world triad + content-hash join key + GitHub OAuth backup; none of it reflected in VISION.md files yet
- [Phase 2f stress-test gap catalog](#phase-2f-stress-test-gap-catalog) — A1/A2/A3 surfaced 10 gaps across 4 tiers; needs batched fix cycle before full historical backfill can run

---

## Phase 2f stress-test gap catalog

**Added:** 2026-04-20
**Status:** Discovery complete across three stress-test jumps (A1: 3.6.8→3.6.9, A2: 3.6.5→3.6.6, A3: 3.1→3.2). All gaps listed below surfaced from real runs, not speculation.
**Verification first:** `git log --oneline -5 apps/qw-oracle/scripts/load-knowledge/` — if most recent commit is `b1b7d9c feat(qw-oracle): Phase 2f stress test foundation`, the A1+A2 pipeline is on disk and the gap batch is still open.

### Stress test scorecard

| Jump | change_events | cross-linked to release_notes | Notes |
|---|---|---|---|
| A1: 3.6.8 → 3.6.9 | 6 | 4/6 (67%) | clean mechanics validator |
| A2: 3.6.5 → 3.6.6 | 77 | 2/77 (3%) | rich volume, exposed struct-blame + parser gaps |
| A3: 3.1 → 3.2 | 0 | N/A | catastrophic — every extractor failed on repo layout |

A1 and A2 live in knowledge.db under project=ezquake (3.6.5/3.6.6/3.6.8/3.6.9 versions loaded, 3.6.6 release_notes). A3 produced no data because every extractor assumes `<repo>/src` which didn't exist until 2023-01-05.

### Gap catalog (10 items, 4 tiers)

**Tier 1 — Blocks historical walks:**

1. **Repo-layout version-tolerance (A3).** Every extractor hardcodes `EZQ_SRC = EZQ_REPO / "src"`. That path only exists from 2023-01-05 (commit 97a9b1884, between 3.6.1 and 3.6.2). 14+ pre-2023 tags unreachable. Companion: `diff-versions.ts` `PROJECT_SRC_PREFIX['ezquake']='src/'` is the same assumption baked into blame. Fix: detect `<repo>/src` vs root per-version at extractor entry + store layout in `versions` table so diff can use it for blame.
2. **Version-tolerant struct parsing (A2).** Ruleset extractor patched inline (accepts 8-13 POLICY_FIELDS instead of exactly 13). Pattern will recur on older tags for other structs. Audit + fix each extractor against 3.6.1 / 3.6.0 / 3.2.3 once layout is fixed.
3. **Struct-field-addition blame lands wrong (A2).** 20/25 ruleset modifications + 8/8 hud_element modifications have null PR because blame anchors at struct INSTANCE line, not the struct FIELD DEFINITION line in the header. Extractors need to emit per-field source locations for struct-field-typed mods. Architectural.
4. **Cvar default-value blame via `Cvar_SetDefault` call sites (A2).** Same pattern for cvar mods — many modifications have null PR because blame lands on cvar_t declaration, not on the `Cvar_SetDefault(...)` call that changed the default. Related to gap 3.

**Tier 2 — Data completeness:**

5. **`flag_bit` entity type needed.** PEXT_TRANS, FTE_PEXT_COLOURMOD, FPD_*, CVAR_*, STAT_* etc. are all bitmask-domain features ezQuake treats as first-class facts but we don't capture. Probably 200-400 missing entities across history. New extractor + schema migration + type adapter.
6. **Asset relation diff mode.** asset_extensions / path_rules / cvar_bindings / loader_sites tables are version-keyed but not entity-keyed, so diff-versions skips them. Stable across A1 + A2 (identical 17/25/14/26/110 at both pairs) — gap didn't bite yet but will over longer spans. Options: extend change_events with nullable columns for relation events, or separate relation_changes table.

**Tier 3 — Parser precision/recall:**

7. **Token-primitive substring bug (A2).** `$dateiso` → false match to `token_primitive:$d`. Fix: `/\$([a-zA-Z0-9])(?![a-zA-Z0-9])/g`. One line.
8. **Parser patterns missing.** `+showscores` (+prefix, no underscore), `"smackdrive"` (quote-wrapped), `set_{calc,eval,ex,ex2}` (brace expansion), `hud_gun[2-8]_frame_hide` (bracket range). All surfaced in 3.6.6 release body.
9. **Bare-word command allowlist.** ~30 commands (connect, skywind family, hunk_print, exec, etc.) that don't match the "must have underscore" filter but are real commands. Hand-curated list.

**Tier 4 — Hygiene:**

10. **Drop-guard uses `entityCount` not `_versions` row count (A1).** Help-only entries inflate count. Edge-case hardening.

### Proposed fix sequencing (three batches)

**Batch 1 (mechanical, ~4-6h): gaps 1, 7, 8, 9, 10.**
Layout detection, token-primitive regex, parser patterns, bare-word allowlist, drop-guard fix. Unblocks every pre-2023 tag for A3-equivalent runs and pulls parser precision/recall up.

**Batch 2 (new data, ~4-6h): gaps 5, 6.**
`flag_bit` entity type (schema v4→v5, new extractor, new type adapter). Asset relation diff (extend change_events or new relation_changes table).

**Batch 3 (architectural, ~full day+): gaps 2, 3, 4.**
Struct-field-addition blame correction (per-field source location in extractors). Cvar default-value blame at call sites. Version-tolerance audit — run against 3.6.1 / 3.6.0 / 3.2.3 after Batch 1 and fix what surfaces extractor-by-extractor.

Then re-run A1, A2, A3 against the fixed pipeline to verify the gap fixes took effect.

### Known limitations NOT in the catalog

- **FTE / MVDSV / KTX repo-layout and struct-shape assumptions** are entirely untested. Phase 2d (FTE) is its own discovery pass.
- **Pre-v3.0 SVN-era tags** (`ezquake_19*`, `ezquake_2*`, 2005-2016) likely add a second-order layout/struct differential. Low priority.

### Companion finding: in-repo CHANGELOG exists in older tags

3.1 and 3.2 ship a root-level `CHANGELOG` file (47 lines, self-described as "INCOMPLETE"). Stopped being maintained when GitHub releases took over. Useful context for historical coverage but not reliable enough to replace GitHub release-notes as the canonical source.

### Speed optimization that was started

`/tmp/extract-tag-parallel.sh` runs cvars (heavy, 2m14s) in parallel with the 10 faster extractors (~30s total). Structure is sound but was never measurable because A3's extractors all failed instantly. Copy/promote into the qw-config scripts dir alongside Batch 1 so we get the measured speedup when we re-extract.

### Related

- Current loader code: `apps/qw-oracle/scripts/load-knowledge/` (generalized diff, release_notes ingestion shipped in commit `b1b7d9c`).
- Ruleset extractor patched: `packages/qw-config/scripts/extract-ezquake-rulesets-clang.py` — accepts 1..13 POLICY_FIELDS, fills missing with null.
- Memory: `project_qw_oracle_vision.md` holds Phase 2f roadmap; this catalog sits under it as Phase 2f prerequisites.

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

## Knowledge schema spec behind code (v1 only)

**Added:** 2026-04-20
**Status:** Drift surfaced during the Phase 2c.6 wrap-up verification; oracle team's concern.
**Verification first:** `grep -c 'asset_categor\|keyname_version\|hud_element_version' docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` — if 0, drift holds. `grep 'SCHEMA_VERSION' apps/qw-oracle/scripts/load-knowledge/schema.ts` should report `= 3`.

The schema design spec at `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` still documents only the v1 shape (cvar / command / macro / cmdline_param entities and the original eight tables). Since it was written, two migrations have landed in `apps/qw-oracle/scripts/load-knowledge/schema.ts`:

- **v1 -> v2 (Phase 2c.5)** added four entity types: `keyname`, `hud_element`, `ruleset`, `token_primitive` — and their four per-type version tables.
- **v2 -> v3 (Phase 2c.6)** added one new entity type (`asset_category`) plus four relation tables: `asset_extensions`, `asset_path_rules`, `asset_cvar_bindings`, `asset_loader_sites`.

The code is authoritative; the spec has silently drifted across two phases. The spec's header frontmatter says "Delete/archive once Phase 2b-2g implementation lands and the schema stabilizes, or once it is superseded by a revised Phase-3 schema spec." — either intention is fine, but the current state (the Layer 1 schema is well past the doc) should be resolved rather than left indefinite.

### Fix shape

Either (a) update the existing spec in place to cover v2 and v3, or (b) archive the v1 spec with a one-line supersession note and write a new consolidated spec at `docs/superpowers/specs/YYYY-MM-DD-qw-knowledge-schema-v3.md` that captures the current state. (b) is probably cleaner given the spec's own frontmatter anticipates supersession. Either way, the fix belongs with the oracle team and can slot in alongside the next oracle session naturally.

### Related

- Code: `apps/qw-oracle/scripts/load-knowledge/schema.ts` — search `SCHEMA_V2_ADDITIONS_SQL` and `SCHEMA_V3_ADDITIONS_SQL`.
- Phase 2c.5 plan: `docs/superpowers/plans/2026-04-19-qw-knowledge-phase-2c5.md` (describes v2 additions).
- Phase 2c.6 design spec: `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md` (describes v3 additions).
- E2E verify doc: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` has the current source-of-truth for what each v2/v3 table holds.

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
