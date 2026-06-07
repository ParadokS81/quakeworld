---
date: 2026-05-27
type: vision-parking
arc-slug: docs-quake-world
status: SUPERSEDED 2026-06-07 -> docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md (triggers fired; content direction flipped wiki-first -> note-first; hosting Firebase -> Cloudflare). The cross-link contract, "why not MediaWiki", and free-L1-enhancements sections below are still valid and carried forward.
related:
  - docs/superpowers/parking/2026-05-12-qwiki-sandbox-planner-handoff.md
  - apps/qw-oracle/docs/arc-history.md (ktx-l1-rewrite + ktx-categorize entries)
---

# docs.quake.world — unified user-facing documentation surface

> **SUPERSEDED 2026-06-07** by [`2026-06-07-quake-world-docs-federation-roadmap.md`](2026-06-07-quake-world-docs-federation-roadmap.md). That doc is the current spine: it flips this doc's wiki-first content direction to **note-first**, retargets hosting from Firebase to **Cloudflare**, and locks the stack (VitePress + SolidJS/Vite + daisyUI). The **cross-link contract**, **"Why not host the reference under MediaWiki"**, and **free-L1-enhancements** sections below are still accurate and were carried forward. Read the rest as historical.

Vision/architecture for the user-facing QuakeWorld documentation site. Captured from brainstorm 2026-05-27. Not active work; activates when triggers below fire.

## Product framing

**Primary goal:** users (players + server admins) get easier and higher-quality access to docs and guides. Primary access path is MCP/LLM via the oracle (already mostly shipped). Secondary path is old-school browse (the docs.quake.world + wiki surfaces below) for users who prefer browsing or use cases where browsing is the natural shape — e.g. a server admin scanning a cvar list for one they vaguely remember, or a curious player skimming the ruleset of a mode they've never played.

The browse surface is polish + completeness, not the killer feature. The killer feature is "ask in plain English, get a grounded answer with citations". The browse surface is the fallback when LLM is overkill or unavailable.

**Out of scope:** developer-facing engine-internals docs (BSP / MVD / QWD formats, client architecture, contribution onboarding). vikpe plans to author this manually over time — it's a separate authoring model (author-led, abstraction-level-sensitive) that doesn't fit synthesis-from-source. Sibling track that may coexist under the same `quake.world` federation umbrella with shared design language; otherwise a separate concern.

## Architecture — three surfaces

| Surface | Purpose | Audience | Authoring |
|---|---|---|---|
| Oracle MCP | LLM-facing API serving L1 facts + L3 concept notes | LLMs querying via assistants | extractor (L1) + curator (L3) |
| Wiki (qwiki-sandbox arc) | Human narrative — modes, mechanics, server-admin guides, teamplay scripts, skins, tutorials | players, server admins, curious users | curator-gated (MediaWiki + PluggableAuth + Discord OAuth) |
| `docs.quake.world` | Browseable reference — per-engine cvar/command/info_key tables with search + filter + version-walk | players, server admins, config tweakers | auto-projected from oracle L1 JSON exports |

The wiki is *upstream* of L3 in the planned model: curators author canonical narrative on the wiki; the curator's load-bearing job (qwiki-sandbox Pass 5) is to harvest wiki narrative into L3 concept notes. Asymmetric: every wiki narrative page produces an L3 note via harvest; not every L3 note has a wiki page (some are directly-authored for LLM-only purposes; some are community imports).

## The cross-link contract

The load-bearing primitive is a small wiki template family:

```
{{cvar|name}}
{{cmd|name}}
{{infokey|name}}
```

Every reference to a setting/command in wiki narrative MUST use the template. From that single discipline three things fall out for free:

- **Link target.** `{{cvar|k_mode_X}}` renders as a link to `docs.quake.world/<engine>/cvar/k_mode_X`.
- **Hover tooltip.** A small JS shim on the wiki (similar pattern to MediaWiki's "Popups" extension that Wikipedia uses for article-link previews) intercepts template-generated links, fetches metadata from a tiny docs endpoint, shows a popover with name / type / default / brief description. No click required.
- **Reverse index.** Docs build parses wiki content for template invocations, assembles a "Used by:" backlink table on each cvar page. Bidirectional linking falls out automatically.

Asymmetric coupling: wiki→docs is engineering-light, bake in as a wiki authoring convention early. Docs→wiki backlinks require the docs rebuild to *read* wiki content; v1 can ship with hand-curated "see also" sections, v2 makes "Used by" automatic via rebuild-on-wiki-edit.

The Linux precedent is the right mental model: `man` pages (mechanical reference) and the Arch wiki (curated narrative) are separate surfaces but so tightly linked users navigate between them without noticing the divide.

## Schema is the contract; visuals iterate

Fixed early (v1 contracts):

- Per-entity JSON shape exported from L1 — `name / type / default / description / source-link / version-history / canonical_id / props_json`
- Cross-link template convention (`{{cvar|...}}` family)
- Docs URL pattern (`docs.quake.world/<engine>/<entity-type>/<name>`)
- Build coupling shape between wiki and docs (who reads whom and when)

Iterates freely on top (no v1 lock-in):

- Layout (table vs cards vs sidebar nav)
- Filtering / search UX
- Color palette, typography, design system
- Per-entity-type rendering (cvars vs commands vs info_keys may diverge)
- Shape-aware enhancements (KTX cvars getting "Applied in modes: [1on1, ca]" filterable badges from `props_json.applied_modes`)
- Cross-engine search default vs per-engine default
- Version-walk visualization

Design cohesion across the `quake.world` federation (docs + wiki + scheduler + hub + assets sharing a design language — Tailwind preset / CSS variables package) is a slow-burn long-term arc. Worth being aware of, not v1 scope.

## Why not host the reference under MediaWiki

Considered + rejected: auto-generate one MW page per cvar via SMW/Cargo so the reference lives inside the wiki structure.

1. **Wrong shape for the data.** Filter UI, full-text search, per-engine tabs, version-walks all want a static site generator; MW + SMW/Cargo can technically do it but fights the platform at a tenth the rebuild speed.
2. **Violates qwiki-sandbox Pass 5 page-type discipline.** The wiki's edit-gate taxonomy is `strict-form / form+slots / free-form+metadata`, all curator-gated. Auto-generated mechanical rows from an extractor pipeline are bot-pushed content; the curator workflow doesn't apply to mechanical re-imports.
3. **Bloat and search drift.** 3000+ cvars refreshed on every extractor run swells edit history with mechanical commits and dilutes search relevance.

Two surfaces, cross-linked aggressively, is the right shape.

## Sequencing — what happens before this arc activates

Current state (2026-05-27): KTX L1 rewrite is on its last batch (Race, ~45 cards). ezQuake L1 corpus is shipped + recently refreshed (PR #1127 macros + #1128 commands).

Path to docs.quake.world activation:

1. **Finish KTX L1 rewrite.** Race batch ships → thorough review pass → descriptions imported to L1 entities (consolidation step). This produces the second full corpus, paired against ezQuake.
2. **Cheap-shot KTX docs surface** (routine wrap-step of the KTX L1 arc, NOT a strategy commitment):
   - Export KTX L1 entities to `ktx-docs.json`
   - PR to `QW-Group/ktx` repo as `docs/ktx-docs.json` (per slime's "external JSON, don't touch the codebase" steer)
   - Promote `scheduler.quake.world/ktx-documentation.html` banner from "audit catalog" to "current KTX documentation"
   - KTX gets docs presence in days; the existing audit catalog is good enough to serve as interim public surface until docs.quake.world ships.
3. **ezQuake-vs-KTX comparison pass.** Cross-corpus calibration to surface schema gaps + ezQuake quality drift the KTX shape-catalog work likely exposed. Shape TBD (see open questions).
4. **MVDSV L1 description pass.** Applies the battle-tested KTX shape patterns to a third codebase. Skill choice depends on MVDSV's starting state — likely `describe-fill-synthesis` (cold synthesis from source) since MVDSV is greenfield per the vikpe chat, rather than the `ktx-l1-rewrite` recast shape which assumed pre-existing descriptions. Gives us three full corpuses to design the docs.quake.world schema against.
5. **THEN docs.quake.world arc activates.** With three engines' L1 in hand and ideally the wiki Modes mini-arc landing narrative to cross-link to.

The cheap-shot step (2) is NOT a strategy commitment — it's just normal wrap-up of the KTX L1 arc. The decision about docs.quake.world itself is deferred until at least 2-3 engines' L1 corpus is mature, so the JSON export schema is designed against real cross-corpus signal rather than over-fitting to one engine.

## Activation triggers

This arc activates when ALL of:

- KTX L1 corpus is shipped + imported + reviewed
- ezQuake-vs-KTX comparison pass has produced learnings
- MVDSV L1 description pass is in flight or shipped (at least one mid-arc milestone)
- qwiki-sandbox Modes mini-arc has shipped or is close to shipping (so there's wiki narrative to cross-link to)

OR when operator decides to pull it forward and accept the implied design risk of designing the schema against incomplete corpus data.

## Open questions to settle when this arc activates

- **Comparison pass shape** — dedicated audit arc with cross-corpus diff tooling, or operator inspection during normal MVDSV setup? Determines whether MVDSV starts from a refined v2-plus-deltas shape or the same starting point as KTX did.
- **Site generator stack** — Astro / Docusaurus / Nextra / Hugo / custom. Defer until activation; data shape matters more than generator choice.
- **Update cadence** — manual deploy / nightly cron / on-extractor-run.
- **Search scope default** — per-engine vs cross-engine.
- **Version-walk presentation** — how prominent. L1 has the data; how to surface it.
- **Per-entity-type rendering** — uniform vs per-type templates.
- **Wiki↔docs build coupling** — who triggers what.
- **ezquake.com/docs disposition** — redirect / contributor portal / dropped. xantom is open to changes (chat 2026-05-27).
- **Federation design system** — shared component library across quake.world surfaces vs distinct-but-linked v1.

## Context

- **Brainstorm session: 2026-05-27.** This doc captures it.
- **Related arc:** [`2026-05-12-qwiki-sandbox-planner-handoff.md`](2026-05-12-qwiki-sandbox-planner-handoff.md) — wiki authoring substrate; provides Track 1's narrative surface.
- **Related skill:** `ktx-l1-rewrite` — description pattern catalog being battle-tested on the L1 corpus that feeds this site.
- **vikpe (xantom) chat 2026-05-27** — bought in on unified-stack approach ("source code is the truth for each project, but we present it uniformly"); confirmed MVDSV/KTX docs are greenfield (no legacy to displace); named the parallel Track 2 (dev-internals) effort he plans to author manually.
- **ezQuake precedent** — trailing-comments-for-devs vs `help_commands.json`-for-users is the same two-audiences intuition applied at project level (see `reference_ezquake_dual_doc_model.md`).
- **slime steer** — for the KTX cheap-shot, docs live externally (JSON in repo) rather than retrofitting a `help_commands.json` system into KTX source.
