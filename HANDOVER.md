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
- [Phase 2f stress-test gap catalog](#phase-2f-stress-test-gap-catalog) — A1/A2/A3 surfaced 10 gaps across 4 tiers; Batch 1 + Batch 2 shipped (7 of 10 closed plus 1 new gap surfaced). Batch 3 architectural fixes remain before full historical backfill.

---

## Phase 2f stress-test gap catalog

**Added:** 2026-04-20
**Updated:** 2026-04-21 — Batch 2 complete (7 of 10 gaps closed). Batch 3 (Tier 1-complex) remains.
**Status:** Batch 2 landed across commits `b9d27a0 .. db72945` (schema v5 spec, v5 migration, types+adapter, extractor, diff config, asset-relation diff). A1+A2 validation run against the new pipeline.
**Verification first:** `git log --oneline -12 -- apps/qw-oracle/scripts/load-knowledge/ packages/qw-config/scripts/ docs/superpowers/specs/` — should include `db72945 chore(qw-oracle): comment-hygiene on relation_changes UNKNOWN + drop as-any` near the top.

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

7 ezQuake tags loaded for entity types (3.6.1, 3.6.2, 3.6.5, 3.6.6, 3.6.8, 3.6.9, head). flag_bit loaded across 3.6.5, 3.6.6, 3.6.8, 3.6.9, head. Release_notes loaded for 3.6.2, 3.6.6, 3.6.9.

### Gap catalog (10 items, 4 tiers)

**Tier 1 -- Blocks historical walks:**

1. ~~Repo-layout version-tolerance (A3).~~ **RESOLVED (Batch 1, commit `18cb835`).** All 11 extractors auto-detect `<repo>/src` vs repo-root. `diff-versions.ts` resolves per-version prefix via `treeHasDirectory` (git ls-tree) on each blame ref independently. Validated end-to-end on 3.6.1 -> 3.6.2 crossover.
2. **Version-tolerant struct parsing (A2).** Ruleset extractor patched inline (commit `8bf832b`). The unicode-strict reads across all 11 extractors were also relaxed to `errors='replace'` in Batch 1 for legacy Windows-1252 bytes in old `.c` comments. Pattern will recur on other structs for older tags. Audit + fix each extractor against 3.6.1 / 3.6.0 / 3.2.3 now that layout is fixed.
3. **Struct-field-addition blame lands wrong (A2).** 20/25 ruleset modifications + 8/8 hud_element modifications have null PR because blame anchors at struct INSTANCE line, not the struct FIELD DEFINITION line in the header. Extractors need to emit per-field source locations for struct-field-typed mods. Architectural.
4. **Cvar default-value blame via `Cvar_SetDefault` call sites (A2).** Same pattern for cvar mods -- many modifications have null PR because blame lands on cvar_t declaration, not on the `Cvar_SetDefault(...)` call that changed the default. Related to gap 3.

**Tier 2 -- Data completeness:**

5. ~~`flag_bit` entity type needed.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 adds `flag_bit_versions` table. Extractor `extract-ezquake-flag-bits-clang.py` covers `CVAR_*` (26), `FPD_*` (7), `STAT_*` (17) at ezQuake head = 50 entities. Extensible via `FAMILY_TARGETS` config. Loaded across 5 tags (head + 3.6.5/3.6.6/3.6.8/3.6.9). `PEXT_*`/`FTE_PEXT_*` deferred (0 at head; extractor will pick them up naturally if encountered during historical walks).
6. ~~Asset relation diff mode.~~ **RESOLVED (Batch 2, 2026-04-21).** Schema v5 adds `relation_changes` table (parallel to `change_events`, relation-keyed with deterministic `row_key_json`). `diff-versions.ts` emits created/deleted/modified rows for all four asset_* tables. Blame intentionally deferred in v5 (`commit_sha='UNKNOWN'`): relation rows don't carry source_file/source_line; proper blame is a Batch 3 item.

**Tier 3 -- Parser precision/recall:**

7. ~~Token-primitive substring bug (A2).~~ **RESOLVED (Batch 1).** `/\$([a-zA-Z0-9])(?![a-zA-Z0-9])/g` now guards against `$dateiso` matching `$d`.
8. ~~Parser patterns missing.~~ **RESOLVED (Batch 1).** `+showscores` via PLUS_MINUS_COMMAND_RE, `"smackdrive"` via QUOTE_WRAP_RE, `set_{calc,eval,ex,ex2}` via BRACE_EXPAND_RE, `hud_gun[2-8]_frame_hide` via BRACKET_RANGE_RE (capped at 16 items).
9. ~~Bare-word command allowlist.~~ **RESOLVED (Batch 1) -- conservatively.** 6-entry list (smackdrive/smackdown/thunderdome/mtfl/qcon + skywind). Deliberately small to avoid English-word false positives. Expand with evidence.

**Tier 4 -- Hygiene:**

10. ~~Drop-guard uses `entityCount` not `_versions` row count (A1).~~ **REJECTED after re-examination (Batch 1).** Help-only entries DO become rows in `_versions` (as doc_only), so the existing drop-guard comparison is self-consistent. Not a real bug.

### Remaining fix sequencing

**Batch 3 (architectural, ~full day+): gaps 2, 3, 4 plus new gap 11 surfaced during Batch 2.**
Extractor version-tolerance audit -- run against 3.6.0 / 3.2.3 now that layout-detection is in place and catalog what new struct-shape mismatches surface. Struct-field-addition blame correction (per-field source location in extractors). Cvar default-value blame at `Cvar_SetDefault` call sites. Plus the loader-site natural-key fragility surfaced by A1/A2 Batch 2 validation (see gap 11 below).

Then re-run A1, A2, A3 against the fixed pipeline to verify.

### Known limitations NOT in the catalog

- **FTE / MVDSV / KTX repo-layout and struct-shape assumptions** are entirely untested. Phase 2d (FTE) is its own discovery pass.
- **Pre-v3.0 SVN-era tags** (`ezquake_19*`, `ezquake_2*`, 2005-2016) likely add a second-order layout/struct differential. Low priority.

### New follow-ups surfaced during Batch 1

- **`$dateiso` in backticks doesn't link to the macro** `dateiso`. Backtick extractor preserves the `$` prefix but macros are stored without it. Small parser tweak: strip leading `$` when looking up non-token-primitive candidates. Low priority.
- **`$`-prefixed identifiers inside backticks** generally need a two-stage lookup: try as `$X` token primitive first, then strip `$` and try as macro. Same tweak as above.

### New follow-ups surfaced during Batch 2

11. **Loader-site natural-key fragility (surfaced during Batch 2 A1/A2 validation).** `asset_loader_sites.canonical_id` is shaped `ezquake:loader_site:<function>_<basename>_<source_line>`. The embedded line number makes the natural key shift whenever upstream edits add or remove lines, producing spurious (created, deleted) pairs in `relation_changes` even when the loader site itself is unchanged. A1 observed 6+6 such pairs; A2 observed 11+11. Underlying row counts remain stable at 110/110 on both pairs, so the noise is purely in the diff stream. Batch 3 candidate fixes: (a) change the canonical_id formula to `<function>_<basename>_<nth-call-in-function>` (line-independent), or (b) add a secondary key that survives line shifts. Either way the extractor is the site of the fix -- the diff pipeline is doing exactly what we asked. Tier 3 (precision/recall).

### Companion finding: in-repo CHANGELOG exists in older tags

3.1 and 3.2 ship a root-level `CHANGELOG` file (47 lines, self-described as "INCOMPLETE"). Stopped being maintained when GitHub releases took over. Useful context for historical coverage but not reliable enough to replace GitHub release-notes as the canonical source.

### Extraction performance lesson

**The parallel extraction helper over-parallelizes at scale.** Running 2 tags concurrently with cvars-in-parallel-with-others per tag produces up to 22 concurrent libclang processes fighting for CPU. Measured wall time during Batch 1 validation was 811s per tag instead of the expected ~3-4 min -- each "fast" extractor slowed from ~5-30s to 140-160s under contention.

**Correct approach for next run:** 2 tags in parallel, but extractors SEQUENTIAL within each tag. libclang is already multi-threaded internally; one extractor at a time per tag avoids contention. Expected wall time: ~4 min total for 2 tags. Update `/tmp/extract-tag-parallel.sh` (or promote to `packages/qw-config/scripts/`) before the next extraction sweep.

### Related

- Batch 2 commits: `b9d27a0` (spec) `f76f975` (schema v5) `83c4ff4` (types+upserts+adapter) `279a017`/`17f7603` (extractor) `2af6d6f` (flag_bit diff config) `c7f26ee`/`db72945` (relation_changes diff).
- Batch 2 plan: `docs/superpowers/plans/2026-04-21-phase-2f-batch-2.md` (11 tasks, 3+4 folded due to typecheck-atomicity).
- Batch 2 spec: `docs/superpowers/specs/2026-04-21-qw-knowledge-schema-v5-flag-bits-and-relation-changes.md`.
- Batch 2 validation note: `/tmp/batch2-validation.md` (observed counts, loader-site finding).
- Batch 1 commit: `18cb835 feat(qw-oracle): Batch 1 gap fixes -- repo-layout tolerance + parser extensions`.
- Prior commits: `b1b7d9c` (Phase A1 + Phase B pipeline foundation), `8bf832b` (ruleset extractor patch + original gap catalog).
- Loader code: `apps/qw-oracle/scripts/load-knowledge/` (generalized diff, release_notes at v4, flag_bit + relation_changes at v5).
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
