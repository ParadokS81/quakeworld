# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [Interactive HTML dashboard (deferred)](#interactive-html-dashboard-deferred) — Pass 3 shipped as a markdown reshape instead of an HTML dashboard. The dashboard is not killed; it's shelved until a concrete trigger fires. See the entry for unshelve conditions.
- [Layer 3 ingest brainstorm + ezquake.com/docs baseline](#layer-3-ingest-brainstorm--ezquakecomdocs-baseline) — Pivot surfaced 2026-04-23 during the extraction-review shakedown. Next-session brainstorm needed: whether to bulk-import ezquake.com/docs guides as Layer 3 concept notes, reference-only, or hybrid. Full reasoning + starter pointers in `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md`.
- [Resume extraction-review shakedown walk](#resume-extraction-review-shakedown-walk) — ezquake 3.6.5 -> 3.6.6 draft has 2/65 dispositions filled (F1 hud_gun2_frame_hide, F2 cl_pext_colourmod). Blocked on Layer 3 ingest completing first, so a `concept-note` disposition for skywind (F3) can cross-reference the imported guides.

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


## Layer 3 ingest brainstorm + ezquake.com/docs baseline

**Added:** 2026-04-23 (session-close of the extraction-review shakedown)
**Status:** Needs its own brainstorm session. Judgment-heavy architectural decision about how Layer 3 relates to ezquake.com/docs as a community-curated knowledge source.
**Verification first:** `ls research/repos/ezquake-docs/ docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md 2>&1` - the handover doc exists and the repo may or may not be cloned depending on whether the next session started yet.

Full reasoning, context, and starter pointers are in `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md`. The short version: during the extraction-review shakedown walk, a finding about the new `skywind` feature surfaced that the skill's disposition-research protocol didn't consult ezquake.com/docs. Deeper than a prompt gap, this surfaced an architectural question: are community-curated guides on ezquake.com/docs supposed to BE Layer 3 (imported / normalized), or are they a peer reference system (read-only)?

The next session should run `superpowers:brainstorming` starting from the pivot handover doc, tour the ezquake.com source repo at `https://github.com/QW-Group/ezquake.com`, and settle the ingest strategy before continuing the shakedown walk. Recommended approach is likely hybrid (import guide-heavy pages like charsets / crosshairs / HUD; reference-only for cvar-listing pages that duplicate Layer 1).

### Pressure

Blocks the resumed extraction-review walk. Not a hard deadline but the walk can't proceed cleanly without settling how ezquake.com content is incorporated — the next `concept-note` disposition (skywind, Finding 3) depends on the decision.

### Related

- Pivot handover: `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md`
- Shakedown review draft (paused): `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md`
- Concept-note authoring template: `apps/qw-oracle/concept-notes/README.md`
- ezquake.com source repo: https://github.com/QW-Group/ezquake.com

---

## Resume extraction-review shakedown walk

**Added:** 2026-04-23 (session-close of the extraction-review shakedown)
**Status:** 2 of 65 findings dispositioned. Paused pending the Layer 3 ingest decision (see entry above).
**Verification first:** `ls apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md && grep -c "^### " apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` - should return 65 headings; `grep -c "Applied.*2026" apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` should return 2 until the walk resumes.

The `extraction-review` skill + CLI shipped this session and was validated end-to-end on the 3.6.5 -> 3.6.6 shakedown pair. Two findings were dispositioned (F1 hud_gun2_frame_hide and F2 cl_pext_colourmod, both `classify`). The walk paused at Finding 3 (the skywind 6-entity family) because that finding surfaced the Layer 3 pivot.

The skill's resume protocol handles stable finding IDs — re-invoking `/extraction-review --project ezquake --from 3.6.5 --to 3.6.6` after the Layer 3 ingest settles will skip the 2 already-done findings and walk the remaining 63. No code changes needed; just pick up where we left off.

**Expected disposition for Finding 3 after Layer 3 decisions settle:** `concept-note` for the skywind family, with the note's shape informed by whatever ingest strategy was chosen (e.g., if ezquake.com/docs is bulk-imported as notes, the skywind note flags the public-docs gap and proposes upstream contribution; if reference-only, the skywind note stands as a pure qw-oracle-authored entry with cross-refs to the absent ezquake.com section).

### Pressure

Blocked on Layer 3 ingest. Zero pressure until that resolves. Once unblocked, the walk is a ~30 minute session to disposition the remaining 63 findings.

### Related

- Draft: `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md`
- Skill: `~/.claude/skills/extraction-review/SKILL.md`
- Spec: `docs/superpowers/specs/2026-04-23-extraction-review-design.md`

---
