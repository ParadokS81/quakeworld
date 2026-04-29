---
Doc type: roadmap spec - orchestrates three sequential passes (doc realignment, per-entity formal documentation, dashboard build) that together fix the monorepo mental-model drift between "qw-oracle as chatbot" and "qw-oracle as knowledge service." Each pass is scoped for a single focused session. Read this file at the start of each pass. Updated 2026-04-22 evening: ecosystem model is two-part (knowledge foundation + consumers), not three-tier; qw-config is a transitional holding pen that dissolves, not a package to formalize.
---

# QW Knowledge Service - Realignment Roadmap

**Date:** 2026-04-22
**Status:** Frame-setting roadmap. This document is the main thread for three follow-up sessions. Each session opens by reading this file and executing exactly one pass.
**Scope:** Monorepo doc realignment + per-entity-type formal documentation + interactive HTML dashboard. All three together, sequenced.
**Phase:** Orchestration. Not an implementation plan. Each pass may spawn its own implementation plan when the session runs it.

## Why this exists

The monorepo's vision and structure drifted from reality. Three symptoms:

1. **qw-oracle is named and framed like a chatbot** ("Oracle Bot / Digest / Time Machine as the three paths"). In reality it is a knowledge service: three data layers plus serving surfaces (MCP live queries + consumer-tailored snapshots). A chatbot would be a consumer of the service, not the service itself.
2. **qw-config is a transitional holding pen, not a package to formalize.** It exists because slipgate-app originally scraped ezQuake for its ConfigViewer, and the scraping code grew in this folder. The AST extractors that later landed there are legitimately oracle's machinery - they produce the facts that become Layer 1 - but their hosting location in qw-config is historical accident, not architecture. When oracle's extraction pipeline is feature-complete and slipgate migrates to consuming oracle snapshots, qw-config dissolves: extractors relocate into oracle's build, and slipgate's inputs become oracle snapshots.
3. **No formal per-entity documentation exists.** The Layer 1 schema stores 10 entity types (cvars, commands, keynames, token_primitives, etc.), but nothing in the repo explains what each entity type IS, why we extract it, or who consumes it. Developers curious about the extractor must read the source.

These gaps cause real harm:
- The orchestrator (user) cannot hold the system's structure in his head; every session starts with re-orientation.
- LLM assistants make wrong inferences from misaligned docs (e.g., "qw-oracle is a chatbot so changes here affect Discord").
- Future engine ports (FTE, MVDSV, KTX) have no template to inherit from; per-entity reasoning is scattered across spec headers and source comments.
- Seed-YAML entries with no AST backing (e.g., `.kmap` -- see below) silently pass the extraction pipeline, producing false-positive "loader family" claims.

The realignment fixes all three by executing three sequential passes. The final visible artifact is an interactive HTML dashboard that makes the system's structure and extractor hygiene visible at a glance.

## Success criteria

At the end of the three passes, these are all true:

- Root `VISION.md`, root `OVERVIEW.md`, and `apps/qw-oracle/VISION.md` describe the two-part ecosystem model (knowledge foundation + consumers, connected via MCP and snapshot distribution) and name qw-oracle as the knowledge service, not a chatbot.
- `packages/qw-config/` is named honestly across the docs it touches - transitional holding pen, not a package to formalize with a quartet.
- `apps/qw-oracle/docs/entity-types.md` (or equivalent) contains formal short-form documentation for all 10 ezQuake entity types, using a consistent five-field template.
- Seed-YAML entries whose AST backing is thin or contradicted are explicitly labelled with a verification status, not silently merged with verified entries.
- `apps/qw-oracle/docs/entity-types.md` is GitHub-navigable (top-of-file TOC + collapsible `<details>` blocks per entity + verification-status tags in summary lines). Page opens compact; reviewers expand what they want.
- `apps/qw-oracle/README.md` surfaces the three-layer foundation + MCP/snapshot serving surfaces + consumer list as named sections, and links to `docs/entity-types.md` as the per-type reference.
- Root `README.md` carries accurate per-app statuses (qw-oracle reads as Active, not Paused).

HTML dashboard (`docs/architecture.html` + `docs/architecture-data.json`) is explicitly deferred; see Pass 3's drift guards below for the reasoning. Tracked as a future "if needed" item in HANDOVER.

## The ecosystem model (authoritative)

Two parts, connected by serving surfaces.

```
+----------------------------------+     serving surfaces     +---------------------------+
|    qw-oracle (knowledge service) |    +-----------------+   |        consumers          |
|                                  |    |   MCP surface   |   |                           |
|  Layer 1: knowledge.db           |    | lookup_entity   |   |  Claude Code       (live) |
|   source-extracted engine facts  |--->| search_entities |-->|  slipgate-app (transitnl) |
|   per-version, per-field blame   |    | get_concept_... |   |  quad chatbot    (future) |
|                                  |    | ...             |   |  slipgate web    (future) |
|  Layer 2: qw.db                  |    +-----------------+   |  chatbot app     (future) |
|   2.66M chat messages + FTS5     |                          |                           |
|                                  |    +-----------------+   |                           |
|  Layer 3: concept notes          |--->|   snapshot      |-->|                           |
|   (not yet populated)            |    |  distribution   |   |                           |
|                                  |    | consumer-       |   |                           |
|  (backstage) extractors,         |    |  tailored JSON  |   |                           |
|   loaders, diff pipeline         |    +-----------------+   |                           |
+----------------------------------+                          +---------------------------+
```

### The knowledge service (qw-oracle)

Data foundation. Three layers plus the machinery that fills them:

- **Layer 1** - `apps/qw-oracle/data/knowledge.db`. Source-extracted engine facts across 10 entity types plus 4 asset relation tables. Per-version history, per-field blame, schema v6.
- **Layer 2** - `apps/qw-oracle/data/qw.db`. 2.66M community chat messages (IRC 2005-2016 + Discord 2016-present) plus FTS5 index. Processing pipeline not yet built.
- **Layer 3** - hand-authored concept notes. Not yet populated.

Backstage to these layers - not visible to consumers, but part of the service's responsibility:

- Extractor fleet - libclang Python extractors for ezQuake, plus the unified driver; hand-authored seed YAMLs. Currently hosted in `packages/qw-config/scripts/` and `packages/qw-config/seeds/` for historical reasons (see below). The JSON outputs at `packages/qw-config/src/data/` are the input contract for oracle's loader.
- Loader pipeline - `apps/qw-oracle/scripts/load-knowledge/`. TypeScript. Ingests extractor JSON into Layer 1 DB. Diff pipeline computes per-field change events with git-blame enrichment.

### Serving surfaces

- **MCP** - live queries. One tool per consumer need (`lookup_entity`, `search_entities`, `get_concept_note`, `search_solved_issues`). Used by interactive clients: Claude Code today, future chatbots. The server itself lives in the monorepo's MCP infrastructure (outside the qw-oracle directory); the DB and schema live in qw-oracle.
- **Snapshot distribution** - consumer-tailored JSON snapshots produced from the same foundation. Used by clients that need deterministic, pre-computed inputs (slipgate-app's ConfigViewer is the canonical case - it doesn't query MCP on every user action, it ships with a snapshot of the facts its features need).

Both surfaces serve the same underlying facts. A consumer picks the surface that fits its access pattern.

### Consumers

User-facing apps that read from the knowledge service. Each is its own product.

- **Claude Code** (live) - every coding session consumes MCP. The primary consumer today.
- **slipgate-app** (transitional) - reads `packages/qw-config/src/data/*.json` directly today (legacy). Future state: consumes oracle snapshots for the same data. Migration scheduled after oracle's extraction pipeline is feature-complete.
- **quad chatbot mode** (future) - quad is a voice-recording Discord bot today. A chat-over-oracle mode is a separate future capability on top of MCP.
- **slipgate web - help surface** (future) - per the 2026-04-20 web-services-family brainstorm.
- **New chatbot app** (future, possibly separate from quad).

### The qw-config question

`packages/qw-config/` is a holding pen, not an architectural tier. It exists because slipgate-app originally needed engine facts for its ConfigViewer, and the scraping code grew there. The AST extractors that now also live there are oracle's machinery - they produce Layer 1 facts - but their hosting location in qw-config is historical accident. When oracle's extraction pipeline is feature-complete and slipgate migrates to oracle-snapshot consumption, qw-config dissolves: extractors relocate into oracle's build; slipgate's inputs become oracle snapshots.

Consequence for this roadmap: qw-config does NOT get the mandatory doc quartet. We do not formalize a package we are dissolving. The dissolution trigger is already tracked (Phase 2d-2h extraction completion + slipgate refactor); no new follow-up item needed.

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

- **ast_verified** -- extractor's AST pass found authoritative declarations in engine source. Count matches the data.
- **seed_only_with_ast_support** -- seed YAML provides the taxonomy; AST pass verifies that individual entries have matching call sites or struct declarations. Example: asset_categories where the category is named in seed but loader-sites confirm actual engine use.
- **seed_only_no_ast_support** -- seed YAML claims something that the AST pass cannot verify. Needs a follow-up decision: either find evidence elsewhere (different engine, different subsystem), downgrade to `orphaned_historical`, or remove.
- **orphaned_historical** -- the engine no longer consumes this data. Files may still ship for legacy reasons. Example: `.kmap` files ship in `ezquake.pk3/keymaps/` but loader support was removed in ezQuake commit `46b5046` on 2014-01-12. Documenting this is more useful than deleting: it explains to the next reader why the files appear in user installs but are not live facts.

### Worked example (reference for Pass 2)

### cvar

**Tagline:** User-tunable engine variable. The knob the player turns.
**Verification status:** ast_verified (2901 entries, all backed by `Cvar_Register` call sites at head).

**What it entails:** A named value the engine reads and the player can set. Covers every adjustable aspect of the client: graphics (`gl_fog`), input (`sensitivity`), gameplay toggles (`cl_smartjump`), teamplay behavior (`tp_pickup`), HUD layout. The schema stores name, default, type (int/float/string/enum), description, flag bits (`CVAR_ARCHIVE`, `CVAR_USERINFO`, etc.), enum values where applicable, and the source file plus line where the cvar was declared.

**Why we extract it:** cvars are the primary surface a player tunes. A config file is 95% cvar assignments. Any consumer that wants to understand, visualize, or validate a config needs the cvar definitions -- types, defaults, valid enum values. Without this table, `seta crosshair 3` is just text.

**Example:** `sensitivity 3.0`, `cl_crossx -2`, `gl_fog 1`. In-engine declaration: `cvar_t sensitivity = { "sensitivity", "3", CVAR_ARCHIVE | CVAR_USERINFO };`

**Consumers:**
- slipgate ConfigViewer - renders cvars with descriptions, valid ranges, and defaults.
- chatbot Q&A (future) - answers "what does cvar X do" using stored description and flag-bit semantics.
- config linter (future) - validates cvar assignments against type and enum constraints.
- cvar diff tools - computes per-version cvar changes across engine releases.

**Sources:**
- Schema: `SCHEMA.md#cvars`
- Extractor: `packages/qw-config/scripts/extract-ezquake-cvars-clang.py`

## Pass 1 -- Monorepo doc realignment

**Goal:** Fix the docs-vs-reality drift so the two-part ecosystem model is authoritative across every VISION/OVERVIEW file in the monorepo.

**Estimated effort:** one focused session, docs-only, no code or schema changes.

**Session-start checklist:**
1. Read this roadmap's "The ecosystem model" section.
2. Confirm with the user: any outstanding model disputes or clarifications before starting.
3. Open the file list below; work top-down.

### Files to edit

- **`VISION.md` (monorepo root)**
  - Add the two-part ecosystem model (knowledge foundation + consumers + serving surfaces) as a first-class section. Replace any language that frames qw-oracle as a chatbot with "knowledge service."
  - Fold in the web-services-family addendum that has been sitting in HANDOVER since 2026-04-20. The three `*.quake.world` services are consumer-side products of the ecosystem and siblings of the desktop app.
  - Correct qw-oracle's lifecycle status (listed as "Paused" in Graduation paths; actually Active per the OVERVIEW).
- **`OVERVIEW.md` (monorepo root)**
  - Add a second integration diagram showing the knowledge-service ecosystem (Knowledge Layers / MCP Surface / Consumers columns, matching the mockup). Keep the existing server-to-server diagram; it is a different integration pattern.
  - Update the "Packages" section to describe qw-config as a transitional holding pen that dissolves when slipgate migrates, not a permanent package.
- **`apps/qw-oracle/VISION.md`**
  - Reframe from "Oracle Bot / Digest / Time Machine as three paths" to "knowledge service = Layers 1-3 + extraction capability + MCP serving + snapshot distribution." The products the old framing called "Oracle Bot" etc. are consumer apps built on top of the service.
  - Preserve the active-assistance answer-shape philosophy (moves from memory-only to VISION-captured).
- **`apps/qw-oracle/OVERVIEW.md`**
  - Remove the "note: reframe to 'active assistance' pending per HANDOVER" reference in the bottom "What this doc intentionally does NOT cover" section - superseded by the Pass 1 VISION edit.
  - Add a short "Extraction" section / callout explicitly framing the extractor fleet as oracle's responsibility even though scripts currently live in `packages/qw-config/scripts/` - this is transitional.
  - Add a one-sentence forward-pointer to Pass 2 for verification-status.
- **`apps/qw-oracle/CLAUDE.md`**
  - Update the "Where to find things" VISION line to remove "(note: pending reframe per HANDOVER)."
- **`apps/slipgate-app/docs/VISION.md`**
  - Add a paragraph: slipgate's current `packages/qw-config/src/data/*.json` consumption is legacy; future state is oracle-snapshot consumer. qw-config dissolves on migration.
  - Fold in the web-services-family addendum: assets/maps/hub.quake.world triad, content-hash join key, MyQuake 2-mode pattern.

**NOT written in this pass:** `packages/qw-config/CLAUDE.md`, `packages/qw-config/VISION.md`, `packages/qw-config/OVERVIEW.md`. qw-config is transitional and dissolves; formalizing it with a quartet works against the ecosystem model. The existing README stays as-is for now.

### Acceptance criteria

- [ ] The phrase "chatbot" does not appear as a primary framing of qw-oracle in any VISION or OVERVIEW file.
- [ ] The two-part ecosystem model is named in root VISION, root OVERVIEW, and qw-oracle VISION.
- [ ] qw-config's transitional / dissolving framing appears in root OVERVIEW's Packages section and in slipgate's VISION.
- [ ] HANDOVER entry "qw-config package missing Layer 1 quartet" is resolvable after Pass 1 completes (closed on structural basis - not written because the package dissolves).
- [ ] HANDOVER entry "Slipgate + monorepo VISION docs need web-services family addendum" is resolvable after Pass 1 completes (folded into root VISION + slipgate VISION).
- [ ] No code files touched. No schema touched. No tests touched.

### Out of scope / drift guards

- Do NOT touch any `.py`, `.ts`, `.rs`, or `.tsx` file.
- Do NOT physically relocate `packages/qw-config/` or any of its scripts. This is documentation realignment only.
- Do NOT write the qw-config quartet. Package is dissolving; the quartet is not warranted. Revisit only if the dissolution plan itself changes.
- Do NOT write per-entity-type documentation (that is Pass 2's job).
- Do NOT build the HTML dashboard or any of its data files (that is Pass 3's job).
- Do NOT retroactively validate seed-YAML entries (e.g., the `.kmap` question). Flag the finding in Pass 2; do not audit in Pass 1.
- Resist scope creep into non-tier-impacting doc cleanup. Matchscheduler docs drift, quad docs drift, qw-stats docs drift -- all separate sessions. Only touch them if a specific ecosystem-model claim requires it.
- Do NOT rename qw-config on disk. Naming change is moot - the package dissolves on migration rather than being renamed.

### Output

- Committed edits to the files above.
- HANDOVER entries resolved (deleted, not struck).
- No new HANDOVER entries unless Pass 1 surfaces a genuine follow-up that cannot be folded.

## Pass 2 -- Per-entity formal documentation

**Goal:** Produce authoritative per-entity-type documentation for all 10 ezQuake entity types, with verification-status field populated by auditing seed YAMLs against AST output. This content becomes the data source for the Pass 3 dashboard.

**Estimated effort:** one focused session, docs-only, possibly with some SCHEMA.md edits.

**Session-start checklist:**
1. Read this roadmap's "Per-entity writeup template" and "worked example" sections.
2. Confirm Pass 1 is committed. If not, the ecosystem-model language in the writeups will drift.
3. Open `apps/qw-oracle/SCHEMA.md` and the 11 extractor scripts in `packages/qw-config/scripts/`.

### What to produce

A new file: `apps/qw-oracle/docs/entity-types.md` (or a reorganized section of `SCHEMA.md` -- decide based on size).

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
10. asset_category (plus the 4 relation tables: asset_extensions, asset_path_rules, asset_cvar_bindings, asset_loader_sites -- covered as sub-sections)

### Verification-status audit

For each entity type, audit as follows:

1. Open the extractor script. Confirm it emits what the schema claims.
2. If a seed YAML exists (e.g., `ezquake-asset-categories.yaml`, `ezquake-asset-extensions.yaml`), compare seed entries to AST output.
3. Mark each entity type's overall status. Individual sub-entries (within asset_category) may have their own status -- the dashboard reflects that.
4. Concrete findings expected (based on this roadmap session's investigation):
   - `.kmap` extension in `ezquake-asset-extensions.yaml` is `orphaned_historical`. ezQuake removed keymap loader support in commit `46b5046` (2014-01-12). Files still ship in `ezquake.pk3/keymaps/` but no C code consumes them. Document; do not fix the seed in Pass 2.
   - Other entries in the 9 "missing loader families" added by commit `119dd0e` (`.log`, `.loc`, `.lit`, `.xml`, `.dat`, `.spr`, `.qwz`, `.dll`) -- audit each. Some may be `seed_only_with_ast_support` (engine loads them via a path not captured in the initial extractor pass), some may be `orphaned_historical`, some may need AST-extractor work to upgrade.

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

## Pass 3 -- GitHub-navigable per-entity doc + README refresh

**Goal:** Make Pass 2's per-entity content discoverable and compact-by-default on GitHub, and bring the qw-oracle README + root README into alignment with the Pass 1 ecosystem model.

**Estimated effort:** one focused session, docs-only, no new file classes at monorepo root.

**Why this shape** (2026-04-22 evening revision, during Pass 3's planning session): The original Pass 3 plan was to ship `docs/architecture.html` + `docs/architecture-data.json` + `docs/architecture-README.md` as an interactive dashboard rendered from a data file. A design review against the 2026-04-11 doc-philosophy spec surfaced three problems: (1) the doc-philosophy template has no class for a monorepo-wide HTML dashboard; Layer 3 reference docs live inside the owning app, not at the root `docs/` folder. (2) The static HTML + separate JSON pattern forces double-bookkeeping between the JSON source and the HTML's embedded copy, reintroducing exactly the drift risk the realignment was paying down. (3) GitHub doesn't execute HTML dashboards in the repo UI by default, so the "external reviewers can see what we extract" motivation is better served by GitHub-rendered markdown than by a `file://` HTML that requires a local checkout. The reshape below achieves the same reviewer outcome with one file touched, zero build step, and doc-philosophy compliance.

**Session-start checklist:**
1. Read this roadmap's "The ecosystem model" section.
2. Open `apps/qw-oracle/docs/entity-types.md` (Pass 2's output) - this is the content source.
3. Open `apps/qw-oracle/README.md` + root `README.md` - these need alignment.

### What to produce

- **Reshape `apps/qw-oracle/docs/entity-types.md` for GitHub navigation.** Add a top-of-file contents/TOC section with anchor links. Wrap each entity's 6-field block in `<details><summary>...</summary>...</details>`. Summary lines carry the entity name (implicit, from the preceding `##` heading), the count, and the verification status as a code-fenced tag for quick scanning. Content unchanged - pure presentation pass.
- **Refresh `apps/qw-oracle/README.md`.** Pull the "MCP + snapshot serving surfaces" and "consumer list" beats out of the status line into their own short named sections. Add a visible link to `docs/entity-types.md` from both the foundation section and the "Learn more" index. Drop any leftover pre-Pass-1 framing (e.g., "three paths Oracle Bot / Digest / Time Machine" pointer in the VISION line).
- **Fix stale per-app status lines in root `README.md`.** qw-oracle had drifted to "Paused"; reality is Active (Phase 2f mid-flight). Update the one-line entry to describe the knowledge-service shape and current stage. Other app lines untouched unless they're similarly rotten.

### Acceptance criteria

- [ ] `apps/qw-oracle/docs/entity-types.md` renders on GitHub with a contents index at the top and each entity block collapsed by default. Clicking a TOC entry jumps to the entity heading and auto-expands its `<details>` block.
- [ ] Each entity's summary line includes its count and verification-status tag, so a reviewer scanning the collapsed page can see the fleet status without expanding.
- [ ] `apps/qw-oracle/README.md` names the three data layers, the two serving surfaces (MCP + snapshot distribution), and the consumer list as separate sections. It links to `docs/entity-types.md` at least once.
- [ ] Root `README.md` reads qw-oracle as Active with a description that matches the OVERVIEW-level reality.
- [ ] No new files at monorepo root `docs/`. No HTML. No separate JSON data file. No build step.

### Out of scope / drift guards

- Do NOT add content that wasn't already in Pass 2's `entity-types.md`. The reshape is visual only.
- Do NOT change ecosystem-model wording (Pass 1's output is authoritative).
- Do NOT build the HTML dashboard, the JSON data file, or the architecture-README. Those are explicitly deferred; see "Deferred: HTML dashboard" below.
- Do NOT refactor `packages/qw-config/` or `apps/qw-oracle/`.
- Do NOT attempt to retroactively fix per-app doc gaps (matchscheduler / qw-stats / slipgate-app missing VISION/OVERVIEW). That is a separate doc-philosophy-compliance umbrella and deserves its own planning. Capture as HANDOVER only.

### Deferred: HTML dashboard

The `docs/architecture.html` + `docs/architecture-data.json` idea is not killed, just shelved. Revisit if either trigger fires:

- `entity-types.md` stops serving the orchestrator's (user's) mental-model-refresh need - i.e. scrolling + collapsibles becomes a meaningful friction compared to a click-to-drill dashboard.
- External reviewers ask for something more visual than a markdown document.

If built later, the right shape is likely (a) a GitHub Pages deploy driven by a 50-line `scripts/build-dashboard.ts` that reads `entity-types.md` and writes the HTML/JSON, so markdown stays the single source; or (b) a standalone interactive page that we point out-of-band viewers at. Either approach happens in its own session with its own plan.

### Output

- Committed edits to the three files above.
- Deferred-item note added to `HANDOVER.md` for the HTML dashboard, with the trigger conditions above.
- Separate HANDOVER entry added for per-app doc-philosophy compliance (matchscheduler / qw-stats / slipgate-app VISION/OVERVIEW gaps).

## Maintenance loop

After all three passes ship, the maintenance model is:

1. Whenever a developer adds a Layer 1 entity type, modifies an extractor, or changes SCHEMA.md, the docs-check skill flags `apps/qw-oracle/docs/entity-types.md` as potentially stale (count / status / new-type updates).
2. The user (or the assistant) updates entity-types.md to match. Most updates are a one-line count change in a summary line; a new entity type adds a new `## entity_name` + `<details>` block and a TOC entry.
3. The doc is always viewable directly on GitHub. Zero build step, zero server, zero dependencies.
4. Future engine ports (FTE, MVDSV, KTX) slot into the doc by adding their own `## entity_name` sections under a per-engine sub-header, or by adding "FTE" / "MVDSV" / "KTX" columns to each entity's extractor line. Template already set. No architectural churn.
5. Consumer list updates in `apps/qw-oracle/README.md` as new apps ship (slipgate web, chatbot app).
6. If the HTML dashboard ever becomes useful (see Pass 3 "Deferred: HTML dashboard"), it plugs into this loop as a second surface rendered from the same markdown.

## Dependencies between passes

- Pass 2 should not start until Pass 1 is committed. Pass 2's writeups reference "consumer tier" language that Pass 1 solidifies. Starting Pass 2 first creates rework.
- Pass 3 should not start until Pass 2 is committed. Pass 3 reshapes Pass 2's file in place; starting Pass 3 first produces either speculative content or churn.
- HANDOVER entries created by Pass 2 (e.g., seed-YAML cleanup) are independent follow-ups, not gates on Pass 3.

## Related docs

- `docs/superpowers/specs/2026-04-21-layer1-identity-model-design.md` -- Layer 1 identity model (source-derived + artifact-derived tracks). Still authoritative. Artifact-derived facts (BSP, progs.dat, pak/pk3, WAD, MDL/SPR) slot into `entity-types.md` as additional `## entity_name` sections when their parsers ship.
- `docs/superpowers/specs/2026-04-21-asset-reference-resolution-graph-design.md` -- prior spec for Capabilities A + D (parameterized paths + reserved subdirs). In-flight. The AST extractor optimization running in parallel with this session implements these.
- `docs/superpowers/specs/2026-04-11-monorepo-doc-philosophy-design.md` -- the doc-philosophy spec that Pass 3's reshape respects. Directly drove the revision from "new HTML dashboard" to "reshape existing Layer 3 doc in place."
- `apps/qw-oracle/SCHEMA.md` -- Layer 1 data model. Pass 2 references it extensively; may be lightly edited.
- `apps/qw-oracle/VISION.md` -- rewritten in Pass 1.
- `apps/qw-oracle/README.md` -- refreshed in Pass 3 to name the serving surfaces + consumers explicitly and link to `docs/entity-types.md`.
- `HANDOVER.md` -- two entries cleared by Pass 1 (qw-config quartet closed on structural basis; web-services addendum folded). Pass 3 adds a new deferred-HTML-dashboard entry and a per-app doc-philosophy-compliance umbrella.
- `docs/superpowers/specs/assets/2026-04-22-dashboard-mockup-v2.html` -- visual reference kept as the target shape for the deferred HTML dashboard. When/if that dashboard ships, this is the mockup it lands against.

## Not in scope for this roadmap

- Physical dissolution of `packages/qw-config/`. Extractors relocate into oracle's build and slipgate's inputs become oracle snapshots - scheduled after slipgate switches to oracle consumption. Docs describe this future state; the physical move happens when the migration does.
- Layer 2 processing pipeline (tier classification, session segmentation, summarization). Orthogonal track; has its own roadmap.
- Phase 2f historical backfill across all ezQuake tags. Orthogonal track; blocked on this realignment only insofar as verification-status definitions become authoritative during Pass 2.
- FTE / MVDSV / KTX source extraction. Inherits the template after Pass 2 ships.
- Artifact-parser implementation (BSP, progs.dat, pak/pk3, WAD, MDL/SPR). Roadmapped under the 2026-04-21 identity-model spec; no action here.
- Automatic regeneration of any rendered surface from schema + extractor introspection. A future enhancement if and when a second surface (HTML dashboard, external viewer) gets built. Start simple.
- Per-app doc-philosophy compliance (matchscheduler / qw-stats / slipgate-app VISION/OVERVIEW). Out of scope for this realignment; tracked as a separate HANDOVER umbrella.
- Interactive HTML dashboard. Deferred per Pass 3's revised shape. See Pass 3 "Deferred: HTML dashboard" for the trigger conditions that would unshelve it.

## Session-start template

At the start of Pass 1, Pass 2, or Pass 3, the opening prompt is:

> Execute Pass N of the knowledge-service realignment roadmap at `docs/superpowers/specs/2026-04-22-knowledge-service-realignment-roadmap.md`. Read the roadmap's Pass N section and the shared tier-model section. Do exactly what the pass specifies, nothing more. Flag scope creep and ask before expanding. End with acceptance criteria verified and commit.

Each pass is a separate session. Do not run Pass N+1 in the same session as Pass N; the context pollution defeats the drift-prevention purpose of this roadmap.
