# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [Pretty view + StatePanel visual polish](#pretty-view--statepanel-visual-polish) — deferred visual refinement on both the state editor and the pretty-render display; user wants to iterate on the feel tomorrow
- [Phase 2d-2h: remaining QW knowledge rollout](#phase-2d-2h-remaining-qw-knowledge-rollout) — ezQuake fully loaded at head through Phase 2c.6 (2026-04-20); remaining: Phase 2d FTE cvars, Phase 2e MVDSV+KTX extractors, Phase 2f historical backfill, Phase 2g MCP tool upgrades, Phase 2h automation
- [Knowledge-service realignment roadmap — Pass 2 and Pass 3 pending](#knowledge-service-realignment-roadmap--pass-2-and-pass-3-pending) — 2026-04-22 umbrella. Pass 1 doc realignment **shipped 2026-04-22 evening**. Pass 2 per-entity formal docs + Pass 3 HTML dashboard still pending. Each pass is a separate session.

---

## Knowledge-service realignment roadmap — Pass 2 and Pass 3 pending

**Added:** 2026-04-22
**Updated:** 2026-04-22 evening — Pass 1 shipped. Ecosystem model reframed from three-tier to two-part (knowledge foundation + consumers, connected via MCP live queries and snapshot distribution). qw-config framed as transitional holding pen that dissolves on slipgate migration; quartet explicitly not written.
**Status:** Roadmap at `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`. Dashboard mockup v2 at `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html`. Pass 1 committed; Pass 2 and Pass 3 each pending in separate focused sessions.
**Verification first:** `ls docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md apps/qw-oracle/docs/entity-types.md docs/architecture.html 2>&1`. If `entity-types.md` exists, Pass 2 shipped. If `architecture.html` exists, Pass 3 shipped.

Monorepo structure drifted from reality (qw-oracle framed as chatbot when it is a knowledge service; qw-config misclassified as a permanent package when it is a transitional holding pen; no formal per-entity documentation of the 10 ezQuake entity types). Pass 1 fixed the vision-layer drift across root + qw-oracle + slipgate VISION/OVERVIEW. Pass 2 and Pass 3 remain.

The roadmap introduces verification-status as a first-class extractor-hygiene concept. Triggering discovery: `.kmap` seed YAML entry (`packages/qw-config/seeds/ezquake-asset-extensions.yaml`) claims ezQuake loads keymap files, but ezQuake commit `46b5046` (2014-01-12) removed keymap loader support. Files still ship in `ezquake.pk3/keymaps/` but no current C code consumes them. Pass 2's audit surfaces all `.kmap`-class findings; Pass 3's dashboard makes verification status visible per entity type.

### Pass-by-pass summary

- **Pass 1 — Monorepo doc realignment** — **SHIPPED 2026-04-22 evening.** Reframed the monorepo's vision docs to the two-part ecosystem model (knowledge foundation + consumers, MCP + snapshot distribution as serving surfaces). Folded in the web-services-family addendum. Explicitly did NOT write a qw-config quartet (the package is dissolving, so formalization works against the intent). Committed in the same pass as the roadmap edits themselves.
- **Pass 2 — Per-entity formal documentation** (docs-only). Ten ezQuake entity types get formal writeups using the five-field-plus-verification-status template defined in the roadmap. Output file is `apps/qw-oracle/docs/entity-types.md` (or a restructured SCHEMA.md section). Audits seed YAMLs against AST output; marks each entry's verification status. Expected finding: `.kmap` = `orphaned_historical`. Other entries in the "9 missing loader families" list need per-entry audits. Drift guards: no extractor rewrites, no seed-YAML repairs (audit + document only), no schema changes, no dashboard work.
- **Pass 3 — Dashboard build.** Static HTML + JSON at `docs/architecture.html` and `docs/architecture-data.json`. Readable via double-click (file://), no server. Matches the committed mockup's three-column-plus-detail-panel pattern. Integrates with docs-check skill for staleness flagging. Drift guards: no content that isn't already in Pass 2's doc, no ecosystem-model rewording, no backend or build step.

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

