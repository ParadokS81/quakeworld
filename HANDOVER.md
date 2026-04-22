# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [Pass 2 follow-up: asset-extension per-row verification-status audit](#pass-2-follow-up-asset-extension-per-row-verification-status-audit) — 7 entries in `ezquake-asset-extensions.yaml` (.log, .loc, .lit, .xml, .dat, .spr, .qwz) need per-row AST verification to stamp their verification-status
- [Extraction-review skill + baseline-cleanup before Phase 2f](#extraction-review-skill--baseline-cleanup-before-phase-2f) — 2026-04-22 evening thinking. Design a per-release review process (CLI + skill) so historical backfill captures novelties / retirements / orphans as they surface, rather than silently absorbing them. Four pre-backfill cleanup items at head first; then build the skill; then run Phase 2f forward-chronologically.
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.

---

## Pass 2 follow-up: asset-extension per-row verification-status audit

**Added:** 2026-04-22 (evening, during Pass 2)
**Status:** Pass 2 flagged 7 rows in `packages/qw-config/seeds/ezquake-asset-extensions.yaml` as "audit pending" for verification-status: `.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`. The Pass 2 doc (`apps/qw-oracle/docs/entity-types.md` § asset_extensions) documents the shape of the audit without executing the row-level stamp.
**Verification first:** Check whether `entity-types.md` § asset_extensions still lists "audit pending" for these seven extensions; if all seven are stamped with a real verification-status, this entry is resolved.

The audit is mechanical: for each of the seven extensions, walk the ezQuake source and either (a) find a concrete loader site that reads the extension and stamp `ast_verified`; (b) find no loader evidence and stamp `seed_only_no_ast_support` (likely for `.qwz` which is decoded externally by qwdtools); or (c) find the loader site was removed at a specific commit and stamp `orphaned_historical` (as already done for `.kmap`).

Best done alongside or after Phase 2f historical backfill, when the extraction toolchain is warm and cross-version visibility is at its best. Not blocking Pass 3.

### Fix shape

1. Run the unified extractor's `asset-loader-sites` handler and query `reads_category_id` groupings for each of the seven extensions.
2. For any extension with zero loader sites at head, check git history via `git log -p -- <plausible path>` to find the commit that removed loader support (the `.kmap` case is the template; commit `46b5046` removed keymap loading on 2014-01-12).
3. Stamp each row's status in the entity-types.md sub-section. Do NOT edit the seed YAML - document findings, don't silently fix.
4. If an extension is confirmed `orphaned_historical`, open a separate future-pass HANDOVER item for seed-YAML cleanup (category decision: keep-as-archive vs remove).

### Related

- Pass 2 doc: `apps/qw-oracle/docs/entity-types.md` § asset_extensions.
- Seed: `packages/qw-config/seeds/ezquake-asset-extensions.yaml`.
- `.kmap` template finding: ezQuake commit `46b5046` (2014-01-12) removed keymap loader.
- Pre-existing related entry: "Asset-bundle loader-family gaps" in the Phase 2d-2h umbrella section lower down (the audit and the gap-fill work are complementary).

### Session-start template (use exactly this)

> Execute Pass N of the knowledge-service realignment roadmap at `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`. Read the roadmap's Pass N section and the shared tier-model section. Do exactly what the pass specifies, nothing more. Flag scope creep and ask before expanding. End with acceptance criteria verified and commit.

### Dependencies

Pass 2 starts only after Pass 1 is committed (Pass 2 writeups use tier-aligned language from Pass 1). Pass 3 starts only after Pass 2 is committed (Pass 3's JSON content is sourced from Pass 2's doc).

### Pressure

Not blocking anything concrete. But user identified this realignment as preventing **wrong inferences** — the docs-vs-reality drift causes Claude sessions to make incorrect assumptions. Running the three passes at any sustainable cadence (not necessarily back-to-back) pays down that cognitive debt.

### Related files

- Roadmap: `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`
- Dashboard mockup (Pass 3 target): `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html`
- Prior frame-setting: `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md`
- Doc philosophy baseline: `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`

---

## Extraction-review skill + baseline-cleanup before Phase 2f

**Added:** 2026-04-22 evening (end-of-session thinking after Pass 2 shipped)
**Status:** Design sketch. No implementation work yet. Not blocking Pass 3 (dashboard). IS blocking a well-curated Phase 2f historical backfill.
**Verification first:** `ls apps/qw-oracle/scripts/load-knowledge/review-*.ts ~/.claude/skills/extraction-review/ 2>&1` - if either exists, the skill+CLI is at least partly built.

The problem this solves: today's pipeline extracts-then-loads silently. Novel findings (new entity types, new extensions, loader retirements, category shifts) pass without being captured as classification-hygiene events. Pass 2's `.kmap` finding was surfaced by accident; the next one will too. The mental model shift the user brought: "normally you'd document a release as it ships, but we're walking backwards through history - so we need a review process that runs per tag-pair, captures novelties as we go, and forces each finding into a disposition rather than silently absorbing it."

### The 5-question checklist (per consecutive tag-pair)

Every (from_version → to_version) review asks:

1. **Additions** - rows that appeared. Fit an existing entity type + verification-status? Need a new seed entry? Genuinely new kind?
2. **Retirements** - rows that disappeared. Orphaned-historical with reason captured (commit + why)? Renamed (link via `predecessor_id`)? Legitimately retired?
3. **Semantic crossings** - rows that shifted category / flags / load_trigger / path_pattern in a way that changes meaning, not just value. Worth a Layer 3 note explaining why?
4. **Unclassified promotions** - `asset_loader_sites` with `confidence='unclassified'` or `'heuristic'` that moved or arrived. Enough evidence now to promote to `certain`?
5. **Source-invisible changes** - GitHub release notes reference a behavioral change that entity rows don't capture. Concept-note candidate?

### The closed disposition set

Every finding gets exactly ONE of five dispositions - no "think about it later" bucket (anti-pattern per the user's "every finding gets a track" feedback):

- **classify** - update seed YAML or entity-types.md.
- **mark-orphan** - stamp `orphaned_historical` with commit SHA + reason.
- **concept-note** - write a Layer 3 note capturing the story.
- **handover** - defer to its own tracked HANDOVER item.
- **reject-as-noise** - no action, but the rejection is captured in the review output so it doesn't re-surface.

### Order matters: extraction vs review

Extraction is mechanical; run on every tag, order doesn't matter (55x unified extractor makes the full tag set minutes of work).
Review is the judgment layer; direction matters.

**Recommendation: forward-chronological review** (oldest → latest). Reasons:
- Narrative arrives naturally forward. "`.kmap` supported in 3.5.x; removed in 3.6.x commit 46b5046 because OS handles it" reads forward cleanly.
- Additions are cleaner to classify than subtractions (brain does less reconstruction work).
- PR enrichment is forward-directional.

Backward walk (head → oldest) is the alternative; weaker because head's classification is already the anchor, so temporal proximity doesn't buy you much.

### Strengthen the baseline at head BEFORE Phase 2f

If head is still unfinished when backfill runs, every tag-pair surfaces "novelty vs already-unclassified-at-head" ambiguity. Four items to land at head first so backfill asks crisp questions:

1. **Audit the 7 pending asset-extensions** (the HANDOVER item above - `.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`). Stamp each.
2. **Classify the 25 `unclassified` asset_loader_sites at head** (out of 110 total). Promote to `heuristic` or `certain`, or mark intentionally-unclassified with reason.
3. **Decide `seed_only_no_ast_support` schema policy.** `.dll` (intentional cross-engine signal) and `.kmap` (orphaned) need first-class DB representation - a `verification_status` column on relevant tables, or a separate annotations table - so the review skill can query for them cleanly. Today both are implicit in seed comments.
4. **Write at least one Layer 3 concept note as a prototype.** The `.kmap` story is the natural first note. Establishes the shape; backfill will surface more candidates.

### Proposed shape of the skill + CLI

Two halves, compose:

- **CLI** - `npm run load-knowledge -- review --from <v1> --to <v2>`. Mechanical. Queries `change_events` / `relation_changes` / `source_state_transitions` plus documented-claims surfaces (seeds, entity-types.md, Layer 3 notes directory), emits a structured report (JSON + markdown) of findings flagged by the 5 questions. No decisions, just surfaces.
- **Skill** - `extraction-review` (user-global or project-scoped, TBD). Walks the report interactively with the user, prompts disposition per finding, writes outputs to the right places (seed updates, entity-types.md updates, new HANDOVER items, new Layer 3 notes).

Conceptually analogous to `docs-check` but for extraction hygiene instead of session wrap-up.

### Recommended order of operations

1. **Pass 3 (dashboard)** - unblocked. Separate session. Renders Pass 2 content as HTML.
2. **Baseline-cleanup pass at head** - the 4 items above. One focused session.
3. **Build the review skill + CLI** - one focused session (design + implementation).
4. **Phase 2f historical backfill (forward-chronological)** - walk ezQuake tags 3.2.x → head. Review skill runs per tag-pair; findings captured as classified / orphaned / concept-noted / handover / rejected.
5. **FTE / MVDSV / KTX ports** - each new engine's extraction uses the review skill from day one. New-engine ports become a natural test of the skill: genuine greenfield classification plus cross-engine orphans/retirements.

Phase 2f should NOT run without the review skill. Running it bare absorbs findings silently and recreates the `.kmap`-class debt we're trying to prevent.

### Pressure

Not blocking Pass 3 (that's the immediate next session, orthogonal). Blocking a well-curated Phase 2f in the sense that running Phase 2f without this work produces a larger cleanup debt later. Better to scope the baseline-cleanup + skill-build work before backfill than to do the backfill twice.

### Related

- Pass 2 doc: `apps/qw-oracle/docs/entity-types.md` (the classification surface the review skill reads against).
- Pass 2 asset-extensions audit HANDOVER (above) - manual one-off instance of exactly this pattern.
- Phase 2d-2h umbrella (below) - Phase 2f is the trigger; baseline-cleanup reorders the first steps of that umbrella.
- Layer 1 identity model spec (`docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md`) - the artifact-derived bucket shares this review pattern when its parsers ship.
- User feedback memories: `feedback_every_finding_gets_a_track.md` (the closed-disposition-set principle), `feedback_best_tool_no_overkill.md` (CLI + skill composition rather than one monolithic tool).

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

**Tier 1 — Phase 2f Historical backfill (next).** Walk every ezQuake tag, diff consecutive tags, git-blame → PR enrichment. Reuses all extractors; pure orchestration. This is what separates a head-snapshot from a knowledge base with history. Preconditions (ordinal comparison, blame memoization, src-prefix map) already landed in the Tier-0 drain on 2026-04-20. **2026-04-22 update:** extraction is now ~55x faster (`extract-ezquake-unified.py`, shared-walk + 12-core parallelism — ~14s per tag vs 749s legacy sequential). A 15-tag backfill that would have taken ~3 hours now takes ~4 minutes of extraction time. Verified byte-equivalent to legacy output across HEAD + 3.6.6 + 3.6.0 + 3.2.3 (spanning the flat-repo / src-dir layout boundary). The orchestration work (diff + blame + enrich) is the remaining cost.

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

---

