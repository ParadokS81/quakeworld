# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Author 4 concept-note bodies from the 3.6.5 -> 3.6.6 shakedown walk](#author-4-concept-note-bodies-from-the-365---366-shakedown-walk) — 3 tracks covering 4 concept notes and 33 dispositioned findings. Track 1: Client-side server-exec allowlist (7 findings, security family, standalone). Track 2: QW competitive ruleset anti-script restriction pattern (16 findings, cross-codebase with KTX). Track 3: Batched skywind + Completing legacy FTE protocol extensions (10 findings combined, two smaller notes in one focused session).

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

## Author 4 concept-note bodies from the 3.6.5 -> 3.6.6 shakedown walk

**Added:** 2026-04-23 (session-close, after the 3.6.5 -> 3.6.6 shakedown walk completed 65/65 dispositions)
**Status:** 4 concept-note targets identified during the walk, all with grouped rationale already recorded in the review draft. Bodies deferred per the resume-protocol guidance (walk records disposition + evidence, note authoring is its own focused task).
**Verification first:** `ls apps/qw-oracle/concept-notes/*.md | wc -l` - baseline is 2 (kmap-legacy + engine-internal-vs-player-facing + README); after Track 1 it'll be 3; after Track 2 it'll be 4; after Track 3 it'll be 6.

The 2026-04-23 walk dispositioned 33 findings as `concept-note` spanning four note targets. Each note covers a family of entities + release-note bullets with shared rationale. Working titles are flag-don't-lock — refine to something the author judges reads well.

### Track 1 — Client-side server-exec allowlist (standalone, 7 findings, security family)

Working title: "Client-side server-exec allowlist" (domain-shaped, not version-stamped). Covers the 3-cvar allow_* family plus 4 release-note bullets from the Q5 walk. Origin: closes a server -> client command-injection exploit class where a hostile server could stufftext arbitrary client-side commands, download files + execute them, inject via qw:// URL parser, or ride the cbuf_svc buffer.

Findings covered:
- `ezquake:cvar:cl_allow_downloads` (commit 41852d49, extension allowlist default)
- `ezquake:cvar:cl_allow_uploads` (commit c04f608d, default off)
- `ezquake:cvar:cl_remote_capabilities` (commit b276b1d0, REMOTE_CAPABILITIES macro = 50+ command allowlist, Jan 2025 KTX tuning follow-ups via 5a124533 / 989ec708 / 94080d53 / PR #994)
- Release-note #64 (qw:// URL parser command-concatenation)
- Release-note #65 (cl_remote_capabilities validation)
- Release-note #66 (downloadable files execution prevention)
- Release-note #79 (cbuf_svc server-alias restriction — moved to this track via user override)

Upstream shape: `upstream_cvar_reference: settings/multiplayer.md` (autogenerated via VariableList already covers the 3 cvars). `upstream_guide_candidate: new-page` (the explainer has no home on ezquake.com; narrative note doesn't fit existing pages).

### Track 2 — QW competitive ruleset anti-script restriction pattern (standalone, 16 findings, cross-codebase)

Working title: "QW competitive ruleset anti-script restriction pattern" (flag-don't-lock). One note covers 1 addition + 15 semantic-crossings touching 4 rulesets.

Key teaching facts to capture (per user's scope-note during the walk):
1. **Greenfield-vs-retrofit asymmetry:** smackdrive is greenfield (all 5 restrictions enabled by default, commit 22b5b6c2); qcon / smackdown / thunderdome are retrofits (commit 2dbb3f1d adds restrict_setcalc / seteval / setex + updates existing restrict_exec / ipc).
2. **Why restrict_set* matters:** setcalc / seteval / setex are scriptable cvar-mutation functions; restricting them closes a bypass path for other anti-script gates.
3. **Cross-codebase:** `ruleset` is a KTX (server-side) concept that ezQuake observes — future KTX-side Phase 2 walk should reference this note rather than duplicate.

Findings covered:
- `ezquake:ruleset:smackdrive` (addition)
- 15 ruleset semantic-crossings: qcon / smackdown / thunderdome × {restrict_exec, restrict_ipc, restrict_setcalc, restrict_seteval, restrict_setex} — all commit 2dbb3f1d

Upstream shape: `upstream_cvar_reference: settings/multiplayer.md` (ruleset names autogenerated via VariableList). `upstream_guide_candidate: new-page` — note the new guide page likely needs a new sidebar section on ezquake.com too (slower upstream uptake but right target).

### Track 3 — Batched: Skywind + Completing legacy FTE protocol extensions (10 findings in two smaller notes, one focused session)

Two smaller notes can share a session. Both are well-scoped and should take less time than Track 1 or Track 2 separately.

#### Note 3a — Skywind animated skyboxes (6 findings)

Working title candidates: "Client-side server-exec allowlist"-style domain-shaped names; "Skywind animated skyboxes", "Alpha-skybox wind animation", or the user-facing "What is skywind?". Flag-don't-lock.

Key facts: feature ports from IronWail engine (cross-engine provenance), requires alpha-channel skyboxes (partial transparency), uses sidecar `gfx/env/<skyboxname>_wind.cfg` config-file convention that auto-loads with the skybox, 5 commands for parameter control + 1 scale-factor cvar.

Findings covered:
- `ezquake:command:skywind` + `skywind_load` + `skywind_lookdir` + `skywind_rotate` + `skywind_save`
- `ezquake:cvar:r_skywind`
- All commit d7e91ef3, PR #978 from qw-ctf/skywind (@dsvensson)

Upstream shape: `upstream_cvar_reference: settings/graphics.md` (or wherever r_* renders into). `upstream_guide_candidate: textures.md` — the existing Skyboxes guide section is the natural home for a skywind subsection.

#### Note 3b — Completing legacy FTE protocol extensions (4 findings)

Working title: "Completing legacy FTE protocol extensions" (broadened during the Q5 walk when PEXT_MODELDBL joined PEXT_TRANS — flag-don't-lock). Covers two long-dormant FTE extensions that sat half-implemented for ~12 years and were completed together in 3.6.6.

Key teaching facts: FTE_PEXT_TRANS (entity transparency protocol) was half-implemented in 2013 and sat dormant until 3.6.6 when @dsvensson landed the client fix + server-side version gate. FTE_PEXT_MODELDBL had a parallel shape ("didn't read short if U_MODEL was unset and U_FTE_MODELDBL set"). Pattern: "FTE extensions that sat half-implemented and got completed in 3.6.6" as a class.

Findings covered:
- `ezquake:cvar:pext_ezquake_verfortrans` (server-side version gate, commit f670f949, default `7814`)
- Release-note #77 (client-side PEXT_TRANS fix)
- Release-note #53 (entity alpha plumbing — the rendering side)
- Release-note #85 (PEXT_MODELDBL completion — joining the note broadened its scope)

Upstream shape: `upstream_cvar_reference: settings/multiplayer.md`. `upstream_guide_candidate: none-today` (too niche for a dedicated ezquake.com guide page; FAQ entry is probably the right upstream shape).

### Working order

Track 1 first (highest user-facing value, cleanest scope, closes a security story arc). Track 2 second (big scope + KTX cross-codebase dimension adds depth). Track 3 last (smaller, batched — good warm-down session).

### Pressure

Not blocking Phase 2f. Each note target has the grouped rationale preserved in `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` — authors pick up cold from the disposition blocks. Recommended cadence: one Track per session so the author can focus.

### Related

- Review draft with all grouped rationale: `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md`
- Concept-note authoring template: `apps/qw-oracle/concept-notes/README.md`
- Layer 3 two-path curation principle: `memory/project_layer3_two_path_curation.md`
- Two existing concept notes as style reference: `kmap-legacy-keymap-system.md` (narrative/history shape) + `engine-internal-vs-player-facing-files.md` (classifier shape)

---
