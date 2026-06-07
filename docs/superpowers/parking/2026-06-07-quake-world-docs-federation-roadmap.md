---
date: 2026-06-07
type: vision-roadmap-parking
arc-slug: quake-world-docs-federation
status: architecture LOCKED; build-in-workshop + self-host decided 2026-06-07 (don't wait on infiniti's design package or vikpe's community site). Per-arc execution pending operator quota; only open item is arc order (docs-first recommended). Triggers from the 2026-05-27 vision have fired.
supersedes: docs/superpowers/parking/2026-05-27-docs-quake-world-vision.md
  -- overturns its wiki-first content direction (now note-first) and its implied Firebase hosting (now Cloudflare). Its cross-link contract + "why not MediaWiki" + free-L1-enhancements sections still stand; read it for that detail.
related:
  - docs/superpowers/parking/2026-05-27-docs-quake-world-vision.md (prior vision; carry-over detail noted below)
  - docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md (oracle.quake.world CONTENT design; its Firebase + unspecified-framework choices are corrected here -> Cloudflare + SolidJS)
  - docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md (admin-panel + lockstep-flag architecture; staleness machinery)
  - apps/qwiki-sandbox/ (wiki substrate, live at wiki.slipgate.me)
  - research/repos/slipgate/web/ (vikpe's quake.world web monorepo -- the stack we match)
---

# quake.world knowledge surfaces -- federation architecture + roadmap

Captured from the 2026-06-07 brainstorm + a live vikpe (xantom) chat the same afternoon. This is the cold-start spine for the per-arc brainstorms that follow. It locks the architecture, the stack, and the build order; it does NOT plan any single arc (each arc gets its own brainstorm -> spec -> plan later).

## Product north star

The **oracle / MCP is the first-class product** -- a "modern search engine" for QuakeWorld. Engineering effort goes into making it return the right answers. Every other surface is either content that feeds answer quality (notes, L1) or a human-browse presentation of that same content. Browse surfaces are **polish + completeness, the fallback when an LLM is overkill or unavailable** -- not the killer feature. (Carried verbatim intent from the 2026-05-27 doc; reaffirmed.)

## What changed since 2026-05-27

1. **Triggers fired.** L1 now holds **7 codebases** (ezquake, fte, mvdsv, qwcl, ktx, qtv, qwfwd) -- all source-backed/synthesized/embedded. The 2026-05-27 doc was shelved pending KTX+MVDSV L1; that and more is done. The reference half can now be designed against real cross-corpus data.
2. **Content direction flipped: wiki-first -> note-first.** The 2026-05-27 doc (and qwiki Pass 5) assumed the wiki is authored by humans and harvested into L3 concept notes. Reality forced the opposite: the old wiki content was bad/missing, so concept notes were authored fresh. The **concept note is now canonical; the wiki page is derived from it.** This agrees with the existing `l3-three-layer-wiki-feeder` memory and retires the wiki-first assumption.
3. **Stack locked (vikpe's Cloudflare bet).** The 2026-05-27 doc listed "site generator stack" as a top open question; the 2026-05-01 showcase spec assumed Firebase. Both resolved -> **Cloudflare platform + Vite family** (detail below).

## The surfaces

| Surface | Job (what a human/LLM does) | Owner | Stack | Status |
|---|---|---|---|---|
| **qw-oracle backend** | LLM-facing MCP over L1/L2/L3 (the product) | operator | Python + TS | live (`apps/qw-oracle/serve/mcp`) |
| **oracle.quake.world** | explain the oracle + query playground + **admin/staleness console** + recruit contributors | operator (separate project) | SolidJS + Vite + CF | spec done (2026-05-01), retarget to CF |
| **docs.quake.world/`<codebase>`** | browse the L1 facts (all tunable knobs), per codebase | operator | VitePress (Vite/Vue) on CF Pages | to build |
| **wiki** | read domain narrative -- game modes, weapon scripts, HUD, server setup (concept-note domains, with pictures) | operator | MediaWiki (PHP/Docker) | substrate live (`apps/qwiki-sandbox`, wiki.slipgate.me) |
| **community site (quake.world)** | users / clans / tournaments / assets (structured data) | vikpe (platform) | SolidJS + Vite + CF | vikpe's, in progress |

`oracle.quake.world` is the operator's separate project but **tightly integrated** into the community site: as community sections come online (user DB, clan DB, tournaments, assets, apps), each plugs into the oracle as a data source. Separate *codebase and ownership*; integrated via *shared-platform (Cloudflare) data access*.

## Synthesis layer: note-first

Concept note and wiki page are **the same substance in two presentations**, not redundant:

- **Concept note** -- claim-dense, structured for LLM retrieval, prose human-readable-but-terse. Anchored to L1. **Canonical synthesis.**
- **Wiki page** -- same domain knowledge re-presented for a browsing human: pictures, worked examples, form-structured (the new wiki is rigid/templated for quality). Richer, not terser. **Hand-built from the note.**

Because the note's prose is already human-readable, building a wiki page from it is re-presenting + illustrating, not rewriting. Net-new community-authored wiki content can later flow the other way (wiki -> note harvest) as a *secondary* path -- that's the existing two-path-curation model, not the default.

## Staleness: flags flow downhill (nothing flows up)

The L1 reference **cannot go stale** -- it's regenerated from source every extract walk. Staleness lives ONLY in the synthesis layer (notes + wiki), which carry interpretation a source change can invalidate.

```
SOURCE CODE
   |  extract walk
   v
L1 FACTS --projection--> docs.quake.world   (auto-rebuilt; can't go stale)
   |
   |  a note declares which L1 entities it depends on (anchors, in `concept_entities` since Phase 4)
   |  -> entity changes  ==>  FLAG the note
   v
CONCEPT NOTE   (canonical synthesis -- you fix it here)
   |
   |  a wiki page is hand-built from a note
   |  -> note changes  ==>  FLAG the wiki page
   v
WIKI PAGE   (human view -- keeps its own pictures/examples)
```

Contract details:
- **Reverse is easy, forward is hard.** "entity retired/renamed -> flag notes that anchor it" is a deterministic FK lookup. "*new* entity added -> which notes *should* now mention it?" has no link to follow -- it's a semantic guess (embed the entity, similarity-search the notes, flag over a threshold). Useful but best-effort. (Matches the 2026-05-03 lockstep doc's "harder half.")
- **Flag on semantic change, not cosmetic.** default / flags / validation / rename / existence -> flag. A reworded description -> don't. Otherwise the queue floods and loses trust.
- The flag queue + admin worklist is a deliverable of `oracle.quake.world` (see roadmap Arc 2). Queue-storage mechanism (GitHub Issues vs `flagged_concepts` table vs frontmatter status) stays the 2026-05-03 doc's deferred decision.

## Community-data divide

Players / clans / tournaments / assets are **structured data, not explanation** -> they live once on `quake.world` (vikpe's platform), are queried live, and the oracle plugs in. **Never duplicated into the wiki.** This shrinks the wiki's job to exactly what only a wiki can do (explain + show) and removes a whole class of "duplicated data goes stale" before it starts.

## The stack (LOCKED)

Platform bet: **Cloudflare**. Build-tool through-line: **Vite**. Verified from `research/repos/slipgate/web/` (vikpe's monorepo): SolidJS + Vite + pnpm + Biome + Cloudflare Workers; styling is **Tailwind v4 + daisyUI v5** (`pnpm-workspace.yaml` catalog: `tailwindcss ^4.2.2`, `daisyui ^5.5.19`; theme defined in `web/apps/website/src/styles/main.css` via `@plugin "daisyui"` + `@plugin "daisyui/theme" {...}`).

| Surface | Framework | Why |
|---|---|---|
| docs.quake.world | **VitePress** (Vite + Vue) | content/reference; what ezquake.com already runs; markdown-first suits auto-projecting L1; vikpe-endorsed; "static + dynamic" (interactive Vue components inside doc pages give us version-walk / cross-engine filter / live search) |
| oracle.quake.world | **SolidJS + Vite** | it's an *app* (playground + admin), needs an app framework; matching vikpe's stack makes the community-data integration native (same CF bindings) and lets it share Solid components with the community site |
| wiki | **MediaWiki** (PHP) | already live; the human narrative surface |

**Cohesion is token-level, and that's now concrete: adopt vikpe's daisyUI theme.** daisyUI is a Tailwind plugin -> pure CSS component classes (`btn`, `card`, ...) -> framework-agnostic. A `btn btn-primary` renders identically in Vue (VitePress), Solid (oracle/community), and even PHP. So the shared design layer = **vikpe's Tailwind v4 config + daisyUI theme block**, lifted into a shared file every surface imports. You're sharing his system, not building one.
- Docs (VitePress): wire in Tailwind v4 + daisyUI, OR keep VitePress's clean docs theme and just pull the daisyUI *color tokens* for palette match (docs need readability more than `btn-primary`).
- Wiki (MediaWiki): can't run the Tailwind build easily; daisyUI themes compile to CSS custom properties, so the Citizen skin imports the theme's color variables to match the palette.

This makes the VitePress(Vue)/oracle(Solid) framework split a non-issue: same Vite tooling, same CF deploy, same daisyUI look; only literal component *code* doesn't cross the Vue/Solid line (no need for it to).

**Design is a swappable layer -- build functionality now, theme later.** The palette/fonts are a thin token layer; adopting daisyUI now and refining later (infiniti's design package, or any better theme) is largely a CSS-variable swap. daisyUI v5 is already **OKLCH-native**, so the OKLCH color ramps that were the point of waiting on infiniti are already in hand -- nothing about docs/oracle *functionality* depends on the final palette. So: do not block on infiniti's package or on vikpe's community site existing; build the surfaces now, adapt the look later without rework.

**Refinement (infiniti, 2026-06-07):** infiniti's deliverable is a *component platform* (modular + extensible), not merely a color theme -- and it's unfinished, so do NOT build on it yet ("the oil rig will collapse if you pile shipping containers on it"). His own directive matches the plan: build now with interim UI (daisyUI), but **keep logic decoupled from presentation** ("don't couple your logic to your presentation and it will be easy to replace"). Because it's a component platform, the eventual port may be *more* than a CSS-variable swap (daisyUI components -> infiniti components) -- which is cheap ONLY if presentation stays separable. **Build constraint for both arcs:** presentation components are "dumb" (take data, render); data-fetching / state / business logic live in their own modules. Then swapping the UI layer never touches logic. Lower risk on docs (mostly content + thin interactive bits); higher discipline needed in the oracle app (interactive). Interim design exploration (claude.ai/design with daisyUI) is explicitly endorsed by infiniti ("experiment with the Claude ux stuff and port it over later").

**Stack alignment confirmed end-to-end (infiniti, 2026-06-07):** his component platform is **SolidJS + daisyUI + pnpm workspaces** -- the SAME stack as the oracle app and vikpe's web. So the eventual port is a *same-stack* component swap (Solid+daisyUI -> Solid+daisyUI), not a framework change -- near-trivial given the decoupling discipline above. The earlier "may be more than a CSS-variable swap" caveat shrinks accordingly. **Setup constraint:** scaffold the frontends (esp. oracle-web) as **pnpm-workspaces** projects so infiniti's package drops in as a workspace/package dependency cleanly. (Our monorepo's qw-oracle uses `npm --no-workspaces` per [[reference-qw-oracle-toolchain]]; oracle-web can be its own pnpm-workspace subtree -- no conflict.)

## Monorepo layout

| Thing | Lives in | Note |
|---|---|---|
| Oracle data + MCP backend | `apps/qw-oracle` (`serve/mcp`) | stays -- the actual IP |
| Wiki | `apps/qwiki-sandbox` | stays (MediaWiki/Docker, separate beast) |
| `docs.quake.world` | new `apps/docs-web` (name bikeable) | VitePress; consumes L1 JSON export from qw-oracle |
| `oracle.quake.world` | new `apps/oracle-web` (name bikeable) | Solid+Vite; reads community data via CF |
| Shared design | the daisyUI theme, shared file (a `packages/qw-design` OR copied from slipgate) | tokens + Tailwind preset, framework-agnostic |

Build the two frontends on vikpe's stack so they **graduate** cleanly to `quakeworld/slipgate` later (the workshop->graduation model). The backend + wiki stay in the workshop either way.

## Roadmap (recommended build order)

- **Foundation (small, mostly settled here):** stack + folder layout + "design = adopt slipgate daisyUI theme." Largely decided by this doc; remaining bits are the two coordination items below.
- **Arc 1 -- `docs.quake.world/<codebase>`** (foundation surface): auto-project L1 -> per-codebase VitePress reference. First because it's the most tractable, proves the stack + the L1-JSON-export pipeline + the design language, de-risks the oracle's browse tab (the 2026-05-01 showcase spec already prototypes its L1-entity popover), and gives immediate value across all 7 codebases. Free enhancements over ezquake.com (carry-over from 2026-05-27): version-walk, cross-engine, source links, ruleset-disabled badges -- not v1 blockers, layer in after.
- **Arc 2 -- `oracle.quake.world`** (flagship): showcase + query playground + admin/staleness console. Reuses the design from Arc 1. **Folds in the new-version workflow** (below). Content design is the 2026-05-01 spec (retarget Firebase->CF, framework=Solid).
- **Ongoing / parallel -- wiki game-modes section** (`apps/qwiki-sandbox`): transfer the finished game-mode concept notes into wiki pages. First real note->wiki instance (validates note-first); first cross-link target for both sites. Doesn't block the websites.

**New-version workflow** is NOT a separate arc -- it's a deliverable inside Arc 2 (the admin console that renders the staleness queue) + existing pipeline mechanics (the 2026-05-04 prod-update-lifecycle CLI entry points + the 2026-05-03 lockstep-flag design). What's missing is wiring flag-detection into the loader + an admin view. The operator's instinct ("the workflow shapes up as we build the oracle page") is correct.

## Coordination items

**Resolved 2026-06-07** (operator decision -- build it ourselves, don't block on external deps):
1. **Frontend repo location -- RESOLVED:** build in the **operator's workshop** (`apps/`) + **self-host on Cloudflare Pages**; vikpe points the `quake.world` subdomain at it (the `scheduler.quake.world` pattern). Graduation into his `quakeworld/slipgate` monorepo is a later option, not a blocker. (Backend + wiki were always staying in the workshop.)
3. **oracle standalone vs section -- RESOLVED with #1:** standalone app in the workshop, integrating with the community site via shared-Cloudflare data, not a section of it.

**Still open:**
2. **Arc order** -- docs-first (recommended; lowest risk, proves the stack/pipeline/design cheaply) vs oracle-first (only if recruiting urgency or the new-version pain is acute; then start with the staleness *backend*, which is UI-independent). Operator's call when execution starts.

## Deferred (explicitly not this work)

- **L2 corpus mining** (the FAQ/community-demand signal) -- quota-blocked; will reveal which concept notes are missing. Multi-pass brainstorm COMPLETE, ready for arc-planner (see HANDOVER).
- **dusty's forks** (mvdsv/ktx/ezquake) -- same extraction pipeline, later; the methodology is proven across 7 codebases.
- **Community-data integration into the oracle** (reading user/clan/tournament/asset DBs) -- future, after the community-platform sections land.
- **vikpe's Rust quake client + locust.ktx** -- future codebases. The Rust client has its own "can't add a cvar without docs" system + doc-exporter, so it may ingest via exported docs rather than AST extraction (new onboarding path). Note: schema-enforced docs do NOT guarantee quality -- ezquake had the same system and still has empty/bad entries; synthesis + curation is the oracle's value-add.
- **Full federation design system** -- emerges from Arc 1, extracted into the shared design file. Not an up-front arc.

## Carried over from 2026-05-27 (still valid -- read that doc for detail)

- **Cross-link contract:** `{{cvar|name}}` / `{{cmd|name}}` / `{{infokey|name}}` templates in wiki narrative -> links to docs + hover tooltips + reverse "Used by" backlinks on docs pages. The bidirectional reference<->narrative linking the operator re-derived in this session.
- **Why not host the L1 reference inside MediaWiki** (rejected: wrong shape for filter/search/tabs, violates wiki page-type discipline, bloats edit history).
- The `man`-pages-vs-Arch-wiki precedent for the docs<->wiki split.

## Next step

When quota's back, run a per-arc brainstorm (arc-brainstormer) for the chosen first arc (recommended: docs.quake.world), reading this doc cold as the spine. Resolve the two coordination items with vikpe first if they gate the arc.
