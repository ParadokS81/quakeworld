---
Doc type: roadmap spec - orchestrates three sequential passes (doc realignment, per-entity formal documentation, dashboard build) that together fix the monorepo mental-model drift between "qw-oracle as chatbot" and "qw-oracle as knowledge service." Each pass is scoped for a single focused session. Read this file at the start of each pass.
---

# QW Knowledge Service - Realignment Roadmap

**Date:** 2026-04-22
**Status:** Frame-setting roadmap. This document is the main thread for three follow-up sessions. Each session opens by reading this file and executing exactly one pass.
**Scope:** Monorepo doc realignment + per-entity-type formal documentation + interactive HTML dashboard. All three together, sequenced.
**Phase:** Orchestration. Not an implementation plan. Each pass may spawn its own implementation plan when the session runs it.

## Why this exists

The monorepo's vision and structure drifted from reality. Three symptoms:

1. **qw-oracle is named and framed like a chatbot** ("Oracle Bot / Digest / Time Machine as the three paths"). In reality it is a knowledge service: three data layers plus an MCP server. A chatbot would be a consumer of the service, not the service itself.
2. **qw-config is misclassified.** Its name and history say "config-scraping helper for slipgate-app." Its current role is "Layer 1 extraction machinery for the knowledge service." It hosts 11 libclang AST extractors plus seed YAMLs - all of which feed qw-oracle, not slipgate directly.
3. **No formal per-entity documentation exists.** The Layer 1 schema stores 10 entity types (cvars, commands, keynames, token_primitives, etc.), but nothing in the repo explains what each entity type IS, why we extract it, or who consumes it. Developers curious about the extractor must read the source.

These gaps cause real harm:
- The orchestrator (user) cannot hold the system's structure in his head; every session starts with re-orientation.
- LLM assistants make wrong inferences from misaligned docs (e.g., "qw-oracle is a chatbot so changes here affect Discord").
- Future engine ports (FTE, MVDSV, KTX) have no template to inherit from; per-entity reasoning is scattered across spec headers and source comments.
- Seed-YAML entries with no AST backing (e.g., `.kmap` — see below) silently pass the extraction pipeline, producing false-positive "loader family" claims.

The realignment fixes all three by executing three sequential passes. The final visible artifact is an interactive HTML dashboard that makes the system's structure and extractor hygiene visible at a glance.

## Success criteria

At the end of the three passes, these are all true:

- Root `VISION.md`, root `OVERVIEW.md`, and `apps/qw-oracle/VISION.md` describe the three-tier model (extraction / knowledge / consumers) and name qw-oracle as the knowledge service, not a chatbot.
- `packages/qw-config/` has its mandatory doc quartet (CLAUDE.md + README.md + VISION.md + OVERVIEW.md), with docs framing it as transitional extraction-tier machinery until slipgate switches to consuming oracle directly.
- `apps/qw-oracle/docs/entity-types.md` (or equivalent) contains formal short-form documentation for all 10 ezQuake entity types, using a consistent five-field template.
- Seed-YAML entries whose AST backing is thin or contradicted are explicitly labelled with a verification status, not silently merged with verified entries.
- `docs/architecture.html` + `docs/architecture-data.json` exist and render the mockup's three-column drill-down pattern with real data. Double-click the HTML, works in any browser.
- `docs-check` skill knows to update `architecture-data.json` when schema, extractors, or entity-type docs change.

## The tier model (authoritative)

Three tiers. Everything in the monorepo fits in one of them.

```
+--------------------------+    +--------------------------+    +--------------------------+
|       EXTRACTION         |    |        KNOWLEDGE         |    |        CONSUMERS         |
|                          |    |                          |    |                          |
|  libclang AST extractors | -> |  qw-oracle               | -> |  Claude Code (MCP)       |
|  (packages/qw-config/)   |    |                          |    |  slipgate-app            |
|  seed YAMLs              |    |  Layer 1: knowledge.db   |    |  quad (chatbot future)   |
|  artifact parsers (fut)  |    |  Layer 2: qw.db          |    |  slipgate web (future)   |
|                          |    |  Layer 3: concept notes  |    |                          |
|                          |    |                          |    |                          |
|                          |    |  MCP server (tools)      |    |                          |
+--------------------------+    +--------------------------+    +--------------------------+
```

### Extraction tier

**What belongs here:** machinery that turns authoritative sources (engine C code, bundled artifacts, community corpora) into structured JSON the knowledge tier can ingest. No user-facing behavior.

**Current residents:**
- `packages/qw-config/scripts/extract-ezquake-*-clang.py` — 11 libclang Python extractors (cvars, commands, macros, cmdline_params, keynames, hud_elements, rulesets, token_primitives, flag_bits, asset_loader_sites, asset_cvar_bindings, asset_path_rules_verify).
- `packages/qw-config/seeds/*.yaml` — hand-authored taxonomies and bindings.
- `packages/qw-config/src/data/*.json` — committed extractor outputs (the input contract to the knowledge tier).
- Artifact parsers (BSP, progs.dat, pak/pk3, WAD, MDL/SPR) — roadmapped, not yet implemented. See `2026-04-21-layer1-identity-model-design.md`.

**Transitional status:** `packages/qw-config/` also still serves `apps/slipgate-app` directly via the legacy scraped cvar JSON. This is historical; slipgate refactors to consume qw-oracle (via MCP or direct SQLite) once AST extraction is feature-complete. Until then, qw-config wears two hats. Docs should name this honestly.

### Knowledge tier

**What belongs here:** the three-layer knowledge store plus the MCP server that exposes it.

**Current residents:**
- `apps/qw-oracle/data/knowledge.db` — Layer 1 SQLite. Source-extracted engine facts across 10 entity types plus 4 asset relation tables. Per-version history, per-field blame, schema v6.
- `apps/qw-oracle/data/qw.db` — Layer 2 SQLite. 2.66M community chat messages (IRC 2005-2016 + Discord 2016-present) plus FTS5 index. Processing pipeline not yet built.
- Layer 3 — hand-authored concept notes. Not yet populated.
- `apps/qw-oracle/scripts/load-knowledge/` — loader pipeline (TypeScript). Ingests extractor JSON into Layer 1 DB. Diff pipeline computes per-field change events with git-blame enrichment.
- MCP server — lives elsewhere in the monorepo's MCP infrastructure; exposes `lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`. The DB and schema live in qw-oracle; the MCP wire protocol lives separately.

### Consumers tier

**What belongs here:** apps and services that read from the knowledge tier. Each is a user-facing product.

**Current residents:**
- **Claude Code** (live) — every coding session uses the MCP. The primary consumer today.
- **slipgate-app** (transitional) — reads qw-config's legacy scraped JSON today. Will switch to oracle consumption after AST extractors are feature-complete.
- **quad — chatbot extension** (future) — quad is a voice-recording Discord bot today. A chat-over-oracle mode is a separate future capability.
- **slipgate web — help surface** (future) — per the 2026-04-20 web-services-family brainstorm.
- **New chatbot app** (future, possibly separate from quad).

## Per-entity writeup template

Every Layer 1 entity type documented identically. Five fields per entry, plus a verification-status field.

```markdown
### <entity_type_name>

**Tagline:** <one sentence, plain language. "The knob the player turns.">
**Verification status:** <ast_verified | seed_only_with_ast_support | seed_only_no_ast_support | orphaned_historical>

**What it entails:** <3-5 sentences. What the data IS: field shape, what the schema stores, examples of values in the wild.>

**Why we extract it:** <3-5 sentences. The motivation. Why a consumer tool needs this data. What becomes impossible without it. Ground in concrete consumer scenarios.>

**Example:** <a small, real piece of QW config or source to anchor the reader.>

**Consumers:**
- <app or future-app> - <how it uses this data>
- <next consumer>

**Sources:**
- Schema: `SCHEMA.md#<anchor>`
- Extractor: `<path to extractor script>`
- Seed (if applicable): `<path to seed YAML>`
```

### Verification statuses (concept)

- **ast_verified** — extractor's AST pass found authoritative declarations in engine source. Count matches the data.
- **seed_only_with_ast_support** — seed YAML provides the taxonomy; AST pass verifies that individual entries have matching call sites or struct declarations. Example: asset_categories where the category is named in seed but loader-sites confirm actual engine use.
- **seed_only_no_ast_support** — seed YAML claims something that the AST pass cannot verify. Needs a follow-up decision: either find evidence elsewhere (different engine, different subsystem), downgrade to `orphaned_historical`, or remove.
- **orphaned_historical** — the engine no longer consumes this data. Files may still ship for legacy reasons. Example: `.kmap` files ship in `ezquake.pk3/keymaps/` but loader support was removed in ezQuake commit `46b5046` on 2014-01-12. Documenting this is more useful than deleting: it explains to the next reader why the files appear in user installs but are not live facts.

### Worked example (reference for Pass 2)

### cvar

**Tagline:** User-tunable engine variable. The knob the player turns.
**Verification status:** ast_verified (2901 entries, all backed by `Cvar_Register` call sites at head).

**What it entails:** A named value the engine reads and the player can set. Covers every adjustable aspect of the client: graphics (`gl_fog`), input (`sensitivity`), gameplay toggles (`cl_smartjump`), teamplay behavior (`tp_pickup`), HUD layout. The schema stores name, default, type (int/float/string/enum), description, flag bits (`CVAR_ARCHIVE`, `CVAR_USERINFO`, etc.), enum values where applicable, and the source file plus line where the cvar was declared.

**Why we extract it:** cvars are the primary surface a player tunes. A config file is 95% cvar assignments. Any consumer that wants to understand, visualize, or validate a config needs the cvar definitions — types, defaults, valid enum values. Without this table, `seta crosshair 3` is just text.

**Example:** `sensitivity 3.0`, `cl_crossx -2`, `gl_fog 1`. In-engine declaration: `cvar_t sensitivity = { "sensitivity", "3", CVAR_ARCHIVE | CVAR_USERINFO };`

**Consumers:**
- slipgate ConfigViewer - renders cvars with descriptions, valid ranges, and defaults.
- chatbot Q&A (future) - answers "what does cvar X do" using stored description and flag-bit semantics.
- config linter (future) - validates cvar assignments against type and enum constraints.
- cvar diff tools - computes per-version cvar changes across engine releases.

**Sources:**
- Schema: `SCHEMA.md#cvars`
- Extractor: `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`

## Pass 1 — Monorepo doc realignment

**Goal:** Fix the docs-vs-reality drift so the three-tier model is authoritative across every VISION/OVERVIEW file in the monorepo.

**Estimated effort:** one focused session, docs-only, no code or schema changes.

**Session-start checklist:**
1. Read this roadmap's "The tier model" section.
2. Confirm with the user: any outstanding tier-model disputes or clarifications before starting.
3. Open the file list below; work top-down.

### Files to edit

- **`VISION.md` (monorepo root)**
  - Add the three-tier model as a first-class section. Replace any language that frames qw-oracle as a chatbot with "knowledge service."
  - Fold in the web-services-family addendum that has been sitting in HANDOVER since 2026-04-20. The three `*.quake.world` services are consumers of the knowledge tier and siblings of the desktop app.
- **`OVERVIEW.md` (monorepo root)**
  - Rewrite the ASCII integration diagram to show three tiers. Keep the existing QW Hub / Firestore / Storage shared-infrastructure sections; only the app-to-app relationships change.
  - Update the "Packages" section to describe qw-config as transitional extraction-tier machinery, not a slipgate helper.
- **`apps/qw-oracle/VISION.md`**
  - Reframe from "Oracle Bot / Digest / Time Machine as three paths" to "three layers plus MCP serving." The products the old framing called "Oracle Bot" etc. are consumer apps that will be built on top of the service.
  - Note: earlier HANDOVER entry mentions a "reframe to active assistance pending." This pass supersedes that note; update or delete the HANDOVER entry when done.
- **`apps/qw-oracle/OVERVIEW.md`**
  - Already mostly accurate. Add a short "Extractor location" note explicitly calling out that the libclang extractors currently live in `packages/qw-config/scripts/` for historical reasons; this is transitional, not architecturally intentional.
- **`packages/qw-config/CLAUDE.md`, `VISION.md`, `OVERVIEW.md`** — new files
  - This package has a substantial `README.md` but no CLAUDE/VISION/OVERVIEW. The doc philosophy (spec at `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md`) requires the quartet.
  - `CLAUDE.md`: rules for working in qw-config — extractor scripts are AST-based, seeds are hand-authored, reconciliation produces bundle JSONs, the transitional two-hat role.
  - `VISION.md`: why qw-config exists (shared engine-feature extraction pipeline, authoritative-source discipline). Name the future: extractors become the knowledge service's extraction tier; slipgate's legacy consumption retires once slipgate refactors.
  - `OVERVIEW.md`: the living map — all extractors, all seeds, all data files, all consumers. Largely factual; pulls content from the existing README plus a fresh audit.
- **`apps/slipgate-app/docs/VISION.md`**
  - Add one paragraph: slipgate's current qw-config consumption is legacy; future state is oracle consumer (via MCP or direct SQLite). This work is scheduled after AST extraction is feature-complete.

### Acceptance criteria

- [ ] The phrase "chatbot" does not appear as a primary framing of qw-oracle in any VISION or OVERVIEW file.
- [ ] The three-tier model is named in root VISION, root OVERVIEW, and qw-oracle VISION.
- [ ] qw-config has all four quartet files (CLAUDE, README, VISION, OVERVIEW).
- [ ] HANDOVER entry "qw-config package missing Layer 1 quartet" is resolvable after Pass 1 completes.
- [ ] HANDOVER entry "Slipgate + monorepo VISION docs need web-services family addendum" is resolvable after Pass 1 completes (folded into root VISION).
- [ ] No code files touched. No schema touched. No tests touched.

### Out of scope / drift guards

- Do NOT touch any `.py`, `.ts`, `.rs`, or `.tsx` file.
- Do NOT physically relocate `packages/qw-config/` or any of its scripts. This is documentation realignment only.
- Do NOT write per-entity-type documentation (that is Pass 2's job).
- Do NOT build the HTML dashboard or any of its data files (that is Pass 3's job).
- Do NOT retroactively validate seed-YAML entries (e.g., the `.kmap` question). Flag the finding in Pass 2; do not audit in Pass 1.
- Resist scope creep into non-tier-impacting doc cleanup. Matchscheduler docs drift, quad docs drift, qw-stats docs drift — all separate sessions. Only touch them if a specific tier-model claim requires it.
- Do NOT rename qw-config on disk. Naming change is a separate future refactor, scheduled after slipgate migrates off legacy consumption.

### Output

- Committed edits to the files above.
- HANDOVER entries resolved (deleted, not struck).
- No new HANDOVER entries unless Pass 1 surfaces a genuine follow-up that cannot be folded.

## Pass 2 — Per-entity formal documentation

**Goal:** Produce authoritative per-entity-type documentation for all 10 ezQuake entity types, with verification-status field populated by auditing seed YAMLs against AST output. This content becomes the data source for the Pass 3 dashboard.

**Estimated effort:** one focused session, docs-only, possibly with some SCHEMA.md edits.

**Session-start checklist:**
1. Read this roadmap's "Per-entity writeup template" and "worked example" sections.
2. Confirm Pass 1 is merged. If not, the tier language in the writeups will drift.
3. Open `apps/qw-oracle/SCHEMA.md` and the 11 extractor scripts in `packages/qw-config/scripts/`.

### What to produce

A new file: `apps/qw-oracle/docs/entity-types.md` (or a reorganized section of `SCHEMA.md` — decide based on size).

One writeup per entity type, using the template. The 10 types:

1. cvar (worked example is above - polish and ship)
2. command
3. macro
4. cmdline_param
5. keyname
6. hud_element
7. ruleset
8. token_primitive
9. flag_bit
10. asset_category (plus the 4 relation tables: asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites — covered as sub-sections)

### Verification-status audit

For each entity type, audit as follows:

1. Open the extractor script. Confirm it emits what the schema claims.
2. If a seed YAML exists (e.g., `ezquake-asset-categories.yaml`, `ezquake-asset-extensions.yaml`), compare seed entries to AST output.
3. Mark each entity type's overall status. Individual sub-entries (within asset_category) may have their own status — the dashboard reflects that.
4. Concrete findings expected (based on this roadmap session's investigation):
   - `.kmap` extension in `ezquake-asset-extensions.yaml` is `orphaned_historical`. ezQuake removed keymap loader support in commit `46b5046` (2014-01-12). Files still ship in `ezquake.pk3/keymaps/` but no C code consumes them. Document; do not fix the seed in Pass 2.
   - Other entries in the 9 "missing loader families" added by commit `119dd0e` (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`, `.dll`) — audit each. Some may be `seed_only_with_ast_support` (engine loads them via a path not captured in the initial extractor pass), some may be `orphaned_historical`, some may need AST-extractor work to upgrade.

### Acceptance criteria

- [ ] All 10 ezQuake entity types have writeups using the template.
- [ ] Each writeup has its verification-status field populated, not left as "TBD" or "unknown."
- [ ] At least the known findings (`.kmap`) are documented with the status and reason; other findings from the audit are similarly documented.
- [ ] The writeups reference file paths and schema anchors that actually exist.
- [ ] The file(s) are committed.

### Out of scope / drift guards

- Do NOT rewrite extractor scripts. The .kmap-class findings get documented; they are not repaired in this pass.
- Do NOT modify seed YAMLs, even if an entry is confirmed `orphaned_historical`. Seed-YAML cleanup is a separate future pass.
- Do NOT change the database schema.
- Do NOT build the dashboard or the JSON data file.
- Do NOT do the same writeup pass for FTE, MVDSV, or KTX. Those are Phase 2d-2e work and inherit the template from here when they run.
- Resist the urge to turn a 3-5 sentence "why we extract" into a philosophical treatise. Short-form is the contract; length is for SCHEMA.md.

### Output

- Committed `apps/qw-oracle/docs/entity-types.md` (or equivalent).
- Any new HANDOVER entries for repair work surfaced by the audit (e.g., "seed-YAML cleanup of orphaned_historical entries").

## Pass 3 — Dashboard build

**Goal:** Build `docs/architecture.html` plus `docs/architecture-data.json` as a double-click-to-open interactive dashboard. Data comes from Pass 2's entity-type docs plus the current tier model from Pass 1.

**Estimated effort:** one focused session. HTML plus a small JSON plus a docs-check integration note.

**Session-start checklist:**
1. Read this roadmap's "The tier model" section.
2. Open `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html` in a browser for the visual target.
3. Open `apps/qw-oracle/docs/entity-types.md` (Pass 2's output) — this is the content source.

### What to produce

- **`docs/architecture.html`** — single static file, no server required. Double-click opens in any browser. Structure matches the mockup: three columns (Knowledge Layers / MCP Surface / Consumers) at top, clickable entity-type list under Layer 1 -> ezQuake, detail panel below that populates on click. Uses pre-rendered hidden sections for entity-type details (one per type), toggled by JS click handlers. No innerHTML string interpolation (security hook will reject it).
- **`docs/architecture-data.json`** — data source the HTML reads at load time (or has inlined at build time, if simpler). Contains: tier definitions, per-entity short-form docs from Pass 2, counts at current head, MCP tool list, consumer list. Human-readable, hand-editable. This is what docs-check refreshes when reality changes.
- **`docs/architecture-README.md`** — one-page explainer: what this dashboard is, how to update it, how the data file is structured.

### Integration with docs-check

- docs-check gains a new responsibility: when SCHEMA.md, an extractor script, or `apps/qw-oracle/docs/entity-types.md` changes, flag whether `docs/architecture-data.json` needs a refresh.
- Start with a human-in-the-loop check (the skill asks the user to confirm). Automation is a future iteration.
- Document the integration in `docs/architecture-README.md`.

### Acceptance criteria

- [ ] `docs/architecture.html` opens in a browser from a file:// URL and renders the three columns plus working click-to-populate detail panel.
- [ ] `docs/architecture-data.json` contains per-entity-type short-form docs that match Pass 2's output.
- [ ] All 10 ezQuake entity types are reachable by click; each one populates a detail panel with the five fields plus verification status.
- [ ] Verification statuses (including `.kmap`-class findings) are visible in the detail panels.
- [ ] docs-check skill knows to check this data file.

### Out of scope / drift guards

- Do NOT add content that wasn't already in Pass 2's entity-type doc. If a detail panel needs a fact not in the source doc, stop and either (a) add the fact to Pass 2's doc and commit, or (b) file as a HANDOVER item. Do not ad-hoc-author content in the dashboard.
- Do NOT change tier model wording (Pass 1's output is authoritative).
- Do NOT build a backend, a server, a build step, or a generator. The dashboard is static HTML that reads a static JSON.
- Do NOT refactor `packages/qw-config/` or `apps/qw-oracle/`. This pass is pure presentation.
- Do NOT try to make the dashboard auto-update from SCHEMA.md in this pass. Human-updated-via-docs-check is the v1 maintenance model.

### Output

- Committed `docs/architecture.html`, `docs/architecture-data.json`, `docs/architecture-README.md`.
- docs-check skill update (in the skill file, if user-global; or a HANDOVER item describing the change, to be applied on the user-global skill later).

## Maintenance loop

After all three passes ship, the maintenance model is:

1. Whenever a developer adds a Layer 1 entity type, modifies an extractor, or changes SCHEMA.md, the docs-check skill flags `architecture-data.json` as potentially stale.
2. The user (or the assistant) updates `architecture-data.json` to match. Most updates are a one-line count change; some are a new entity type, which also requires a new detail-section in `architecture.html`.
3. The dashboard is always viewable as a static file. Zero build step, zero server, zero dependencies.
4. Future engine ports (FTE, MVDSV, KTX) slot into the dashboard by adding their panel under Layer 1. Template already set. No architectural churn.
5. Consumer list updates as new apps ship (slipgate web, chatbot app). Each new consumer appears in the rightmost column with a short description and a pointer to its VISION.md.

## Dependencies between passes

- Pass 2 should not start until Pass 1 is committed. Pass 2's writeups reference "consumer tier" language that Pass 1 solidifies. Starting Pass 2 first creates rework.
- Pass 3 should not start until Pass 2 is committed. Pass 3's JSON content comes from Pass 2's file. Starting Pass 3 first produces either speculative content or a dashboard that immediately goes stale when Pass 2 ships.
- HANDOVER entries created by Pass 2 (e.g., seed-YAML cleanup) are independent follow-ups, not gates on Pass 3.

## Related docs

- `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md` — Layer 1 identity model (source-derived + artifact-derived tracks). Still authoritative. Roadmap entries for artifact-derived facts (BSP, progs.dat, pak/pk3, WAD, MDL/SPR) land in the dashboard under Layer 1 as roadmapped slots.
- `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` — prior spec for Capabilities A + D (parameterized paths + reserved subdirs). In-flight. The AST extractor optimization running in parallel with this session implements these.
- `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` — the doc-philosophy quartet. Pass 1 brings qw-config into compliance with it.
- `apps/qw-oracle/SCHEMA.md` — Layer 1 data model. Pass 2 references it extensively; may be lightly edited.
- `apps/qw-oracle/VISION.md` — rewritten in Pass 1.
- `HANDOVER.md` — two entries cleared by Pass 1 ("qw-config package missing Layer 1 quartet", "Slipgate + monorepo VISION docs need web-services family addendum"). New entries likely from Pass 2.
- `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html` — visual target for Pass 3. Committed reference; the real `docs/architecture.html` supersedes it when Pass 3 ships.

## Not in scope for this roadmap

- Physical reorganization of `packages/qw-config/`. Rename, split, or relocate the package — separate future refactor, scheduled after slipgate switches to oracle consumption.
- Layer 2 processing pipeline (tier classification, session segmentation, summarization). Orthogonal track; has its own roadmap.
- Phase 2f historical backfill across all ezQuake tags. Orthogonal track; blocked on this realignment only insofar as verification-status definitions become authoritative during Pass 2.
- FTE / MVDSV / KTX source extraction. Inherits the template after Pass 2 ships.
- Artifact-parser implementation (BSP, progs.dat, pak/pk3, WAD, MDL/SPR). Roadmapped under the 2026-04-21 identity-model spec; no action here.
- Automatic regeneration of `architecture-data.json` from schema + extractor introspection. A future enhancement after the human-updated v1 proves the shape. Start simple.

## Session-start template

At the start of Pass 1, Pass 2, or Pass 3, the opening prompt is:

> Execute Pass N of the knowledge-service realignment roadmap at `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`. Read the roadmap's Pass N section and the shared tier-model section. Do exactly what the pass specifies, nothing more. Flag scope creep and ask before expanding. End with acceptance criteria verified and commit.

Each pass is a separate session. Do not run Pass N+1 in the same session as Pass N; the context pollution defeats the drift-prevention purpose of this roadmap.
