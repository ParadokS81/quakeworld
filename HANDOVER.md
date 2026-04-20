# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)](#qw-oracleclaudemd-is-179-lines-still-over-150-ceiling) — improved by Task 1 rewrite, remaining bloat is raw messages schema
- [qw-oracle/CLAUDE.md stale after Phase 2b](#qw-oracle-claudemd-stale-after-phase-2b) — main tree's `apps/qw-oracle/CLAUDE.md` (192 lines) says "No TypeScript yet" and omits the new `scripts/load-knowledge/` loader; rewrite belongs with the POC plan's Task 1 not standalone
- [qw-oracle VISION.md needs active-assistance reframe](#qw-oracle-visionmd-needs-active-assistance-reframe) — current VISION.md talks Oracle Bot / Digest / Time Machine but not the broader constructive-query / version-aware vision
- [Pretty view + StatePanel visual polish](#pretty-view--statepanel-visual-polish) — deferred visual refinement on both the state editor and the pretty-render display; user wants to iterate on the feel tomorrow
- [Alias chain pretty view cosmetic: duplicate `.msg.point` rows](#alias-chain-pretty-view-cosmetic-duplicate-msgpoint-rows) — when an alias is referenced from two parent branches, chain view shows it twice and both highlight if either path fires
- [Player state simulator -- follow-ups](#player-state-simulator----follow-ups) — .loc dropdowns, visual polish, minor carry-overs
- [Phase 2c-2h: remaining QW knowledge rollout](#phase-2c-2h-remaining-qw-knowledge-rollout) — Phase 2a schema + Phase 2b loader both shipped 2026-04-18; remaining: ezQuake commands/macros/cmdline extractors, FTE/MVDSV/KTX extractors, historical backfill, MCP tool upgrades, automation
- [qw-oracle loader follow-ups from Phase 2b final review](#qw-oracle-loader-follow-ups-from-phase-2b-final-review) — 4 small items flagged for future phases: string-compare on version strings, git blame memoization, per-project src path prefix map, upstream extractor trailing-whitespace bug
- [qw-config package missing Layer 1 quartet](#qw-config-package-missing-layer-1-quartet) — no CLAUDE.md, VISION.md, or OVERVIEW.md; only a substantial README. Pre-existing; surface next time qw-config is being touched substantially
- [Quake-dir browser vision — unblocked, ready for implementation brainstorm](#quake-dir-browser-vision--unblocked-ready-for-implementation-brainstorm) — oracle Phase 2c.6 shipped 2026-04-20; slipgate dir-browser vision spec's prerequisites are all satisfied; next step is a fresh-context implementation brainstorm
- [Knowledge schema spec behind code (v1 only)](#knowledge-schema-spec-behind-code-v1-only) — `2026-04-18-qw-knowledge-extraction-schema.md` documents schema v1; v2 (keyname/hud_element/ruleset/token_primitive) and v3 (5 asset_* tables) are in `schema.ts` but absent from the spec

---

## qw-oracle/CLAUDE.md is 179 lines (still over 150 ceiling)

**Added:** 2026-04-14, **Updated:** 2026-04-16
**Status:** improved by Task 1 rewrite (192 -> 179), still 29 lines over hard ceiling
**Verification first:** `wc -l /home/paradoks/projects/quakeworld-poc/apps/qw-oracle/CLAUDE.md`. If under 150, resolved.

The monorepo doc philosophy puts a soft ceiling at 120 lines and a hard ceiling at 150 lines on any `CLAUDE.md`. Bloat is diagnostic: the cause is almost always a missing Layer 2 doc that should be holding the overflow content. `apps/qw-oracle/CLAUDE.md` is currently 192 lines, 28% over the hard ceiling.

The POC implementation plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` includes rewriting `apps/qw-oracle/CLAUDE.md` in Task 1 as part of the three-layer scaffolding. That task will naturally trim the file AND create the Layer 2 docs (`layers/README.md`, `serve/README.md`, etc.) that should hold the content currently stuffed into CLAUDE.md.

### Fix shape

Don't split preemptively. The POC plan already handles it — Task 1 in `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` rewrites `apps/qw-oracle/CLAUDE.md` to the three-layer structure and creates the overflow docs. When that task lands, this handover item should resolve automatically. Only revisit if the POC plan stalls and qw-oracle/CLAUDE.md stays bloated for an extended period.

### Related

- The POC plan: `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` Task 1
- The doc philosophy: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`
- The memory: `project_doc_philosophy.md`

---

## qw-oracle CLAUDE.md stale after Phase 2b

**Added:** 2026-04-18
**Status:** pending
**Verification first:** `head -30 /home/paradoks/projects/quakeworld/apps/qw-oracle/CLAUDE.md` — if it still says "No TypeScript yet" and does not mention `scripts/load-knowledge/`, the item holds.

The main tree `apps/qw-oracle/CLAUDE.md` (192 lines) was written when the project was chat-corpus-only and Node/.mjs. Phase 2b added a TypeScript loader (`scripts/load-knowledge/`) with its own build toolchain, `knowledge.db` alongside `qw.db`, and new `npm run load-knowledge` commands. The file currently:

- Declares "No TypeScript yet - plain .mjs scripts for now. Move to TS when the pipeline solidifies." (stale)
- Omits `scripts/load-knowledge/` entirely from the project-structure listing
- Commands section lists only `import:discord`, `import:irc`, `stats`; missing `typecheck` and `load-knowledge`
- No mention of the new `knowledge.db` (Layer 1) alongside `qw.db` (Layer 2)

This rewrite is the first task of the POC plan at `docs/superpowers/plans/2026-04-14-qw-knowledge-service-poc.md` (Task 1: rewrite qw-oracle/CLAUDE.md to the three-layer model). Leave it there. A standalone drive-by fix would need to be redone once the POC plan executes.

Also covers the structural doc-quartet gap: qw-oracle has only CLAUDE.md + VISION.md today, missing README.md and OVERVIEW.md. Per monorepo doc philosophy, those should be written when the project lifecycle warrants it. The CLAUDE.md rewrite in POC Task 1 is a natural moment to also produce README.md (short) and OVERVIEW.md (map of layers + layer files).

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

## Phase 2c-2h: remaining QW knowledge rollout

**Added:** 2026-04-18 (originally as "Phase 2 schema + rollout")
**Updated:** 2026-04-18 — Phase 2a schema spec + Phase 2b TypeScript loader both shipped. Full pipeline proven end-to-end against ezQuake 3.6.9 -> head (1 change_event captured: cl_fakeshaft default 0->1, PR #1110).
**Status:** 2a + 2b done. 2c through 2h remaining.

### What shipped (2a + 2b)

- **Schema spec** at `docs/superpowers/specs/2026-04-18-qw-knowledge-extraction-schema.md` — 9 tables defined (schema_meta, versions, entities, cvar_versions, command_versions, macro_versions, cmdline_param_versions, change_events, source_state_transitions), canonical ID convention, field-level change events, source-state lifecycle, storage layout, loader interface.
- **Loader pipeline** at `apps/qw-oracle/scripts/load-knowledge/` — TypeScript + better-sqlite3, three stages wired through a `npm run load-knowledge -- {load-version|diff|enrich}` CLI. Extractor patched with `--repo-root`/`--output` flags. Proven end-to-end against ezQuake 3.6.9 -> head: 2901 entities, `cl_fakeshaft` default 0->1 change event captured with PR #1110 enrichment.

### Remaining sub-phases

**2c. Port the remaining ezQuake extractors.** Commands, macros, cmdline-params using the libclang pattern. Feed through the loader. End state: ezQuake is fully in SQL.

**2d. FTE cvars extractor.** Full port of the validated approach.

**2e. MVDSV + KTX extractors.** MVDSV is a small port (189 cvars, same struct form as ezQuake). KTX is a different script (tree-sitter-based call-site extraction — use `py-tree-sitter` Python bindings, NOT the Node `tree-sitter@0.25` binding which segfaulted on WSL/Node 20 during the spike).

**2f. Historical backfill.** Run each extractor against every tag. Diff consecutive tags. For each diff row, run `git blame` → commit SHA → parse PR number from commit message (ezQuake uses `CVAR: ... (#NNNN)` convention) → GitHub API call for PR title/body/linked issues → insert `change_events` rows. Rate-limit safe (<2000 requests per full historical pull).

**2g. MCP tool upgrades.** Add `version` parameter to `lookup_entity` (defaults to "latest"). Add `get_entity_history` tool. Add version/date filters to `search_entities`.

**2h. Automation.** Scheduled job — detect new tags on each research repo's upstream, run delta extraction, enrich, insert.

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

## qw-oracle loader follow-ups from Phase 2b final review

**Added:** 2026-04-18
**Status:** Four small items flagged during the Phase 2b final code review. None block merge. Each is best addressed when its context re-enters the conversation rather than swept now.

1. **Version-string comparison in `extendFirstSeenVersion`** (load-version.ts). The path uses JavaScript `>` on version strings, which breaks on multi-tag orderings like `3.10.0 < 3.6.6`. Safe for Phase 2b (only exercised on doc-only backfill match, not hit in the single-version e2e). Before Phase 2f historical backfill touches multiple non-head versions, switch to `ordinal` comparison via the `versions` table. Single query + one comparison change.

2. **`git blame` memoization in `resolveBlame`** (diff-versions.ts). Current implementation runs `git blame` once per *changed field* on a modified entity; should run once per `(source_file, source_line)` per entity. Invisible at the Phase 2b e2e scale (1 change event) but becomes a perf leak at Phase 2f (~32 tags x thousands of cvars). Fix: a `Map<string, BlameResult | null>` cache scoped to a single `diffVersions` call.

3. **Per-project source-path prefix map** (diff-versions.ts:218). `resolveBlame` hardcodes `src/${file}` which matches ezQuake/MVDSV/KTX layout but not FTE (uses `engine/client/...`). When Phase 2d's FTE extractor lands, blames will silently return UNKNOWN without this fix. Add `PROJECT_SRC_PREFIX: Record<Project, string>` alongside the existing `PROJECT_REPOS` map in enrich-prs.ts.

4. **Extractor emits one cvar name with trailing whitespace** (`cl_voip_capturingvol ` - note trailing space). The loader correctly rejects via `/^[a-z0-9_.]+$/` name regex with a visible warning, so 2901 entities load instead of 2902. Fix belongs upstream in `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`, not the loader. File when that script is next touched (Phase 2c).

### Related

- Phase 2b plan: `docs/superpowers/plans/2026-04-18-qw-knowledge-loader-phase-2b.md`
- Final review captured in the same session transcript that produced commit `389a19b`.

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

## Quake-dir browser vision — unblocked, ready for implementation brainstorm

**Added:** 2026-04-19, **Updated:** 2026-04-20 (oracle prerequisite shipped)
**Status:** Prerequisites satisfied. Next step is the slipgate implementation brainstorm in a fresh session.
**Verification first:** `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT 'cat',COUNT(*) FROM entities WHERE type='asset_category' UNION ALL SELECT 'ext',COUNT(*) FROM asset_extensions UNION ALL SELECT 'rules',COUNT(*) FROM asset_path_rules UNION ALL SELECT 'bind',COUNT(*) FROM asset_cvar_bindings UNION ALL SELECT 'sites',COUNT(*) FROM asset_loader_sites;"` — expect 17/25/14/26/110.

Brainstorm session 2026-04-19 identified a new MyQuake feature ("Browse the quake dir") whose success depended on oracle extracting ezQuake filesystem-consumption facts. User chose to build the oracle foundation first rather than hardcode QW lore into slipgate. Oracle Phase 2c.6 shipped and pushed 2026-04-20; slipgate vision spec is now unblocked on all four prerequisite fronts (category catalog, path rules, cvar->asset bindings, loader-site inventory).

### Specs

1. **Slipgate vision spec** — `apps/slipgate-app/docs/superpowers/specs/2026-04-19-quake-dir-browser-vision-design.md`. Product frame (two-layer browse, wiki + filesystem, loaded-vs-available, hybrid taxonomy, v1 = read-only lens, multi-install deferred, subtab rename deferred). Prerequisites section now carries a "Satisfied 2026-04-20" note.
2. **Oracle extraction spec** — `docs/superpowers/specs/2026-04-19-ezquake-asset-consumption-extraction-design.md`. Delivered as Phase 2c.6: 5 new tables, schema v2 -> v3. Bundle JSON at `packages/qw-config/src/data/ezquake-asset-bundle.json`.

### Verification snapshot (2026-04-20)

- Counts match spec exactly. Schema `v3`. ezQuake source pin `bea2515d0511bdf250dee43f0df7c4ace3fdfc17`.
- All 14 path rules `source_verified=1` with plain-prose descriptions suitable for slipgate UI tooltips.
- Loader-site classification rate 77% (19 certain + 66 heuristic + 25 unclassified). 29 rows have null category — slipgate classifier will need extension+path_hint fallback for these.
- Only 9 startup + 1 on_map_load triggers on loader sites — slipgate should prefer `asset_cvar_bindings.load_trigger` as the authoritative startup signal rather than inferring from call sites.
- `seedNotCorroborated=23` on cvar bindings is expected (single-compound-scope auto-pass can't follow ezQuake's cross-statement flows). Seed remains source of truth.
- 2 `auto_orphan` bindings on `mapname` (radar + conback path templates) — seed-expansion candidates, not current blockers.

### Next step

**Fresh-context brainstorm** to turn the vision spec into an implementation spec. Scope for that session: visual mockups (wiki overview, filesystem layer, per-category view), subtab rename decision, component breakdown, data-model for how slipgate caches the oracle bundle, scanner architecture (pure pak extraction vs lazy-scan, WSL+Windows split considerations), integration with existing MyQuake tab + ConfigViewer's `exePath` anchor.

### Key references

- Companion oracle spec cross-links are in each spec's "Related docs" block.
- Schema bumped: `apps/qw-oracle/scripts/load-knowledge/schema.ts` (search `SCHEMA_V3_ADDITIONS_SQL`).
- E2E verify doc with spot-check queries: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` (Phase 2c.6 section).

### Pressure

No deadline. User explicitly chose to build oracle foundation before resuming slipgate work and remains in no hurry.

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
