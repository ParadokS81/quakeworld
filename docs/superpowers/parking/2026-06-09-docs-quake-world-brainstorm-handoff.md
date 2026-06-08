# Fresh-terminal handoff: `docs.quake.world` focused design brainstorm

> Paste the body below as the first message to a fresh `claude` terminal opened in the quakeworld monorepo (main tree). Or open the terminal and tell it: *"Read `docs/superpowers/parking/2026-06-09-docs-quake-world-brainstorm-handoff.md` and follow it."*

---

We're starting a **focused design brainstorm for `docs.quake.world`** -- the human-browsable, per-codebase reference site that projects the QW Oracle's Layer 1 corpus (7 codebases: ezquake, fte, mvdsv, qwcl, ktx, qtv, qwfwd). The goal of this session is to turn it into an **executable arc**: resolve the docs-specific design questions, drain them into a design spec, then hand to **arc-planner** to scaffold phases.

**This is a FOCUSED brainstorm, not a from-scratch one.** The cross-cutting architecture is already LOCKED in a roadmap doc (stack, content direction, cohesion, hosting, monorepo shape). Do NOT relitigate those -- read them, confirm orientation, and spend the session on the ~2 genuinely-open docs-specific questions (**information architecture** + **per-entity rendering**). The other questions have defaults already in hand; confirm and move on.

## Invoke first
- `superpowers:brainstorming` (single-session; `arc-classifier` rides along as watcher and will escalate to `arc-brainstormer` only if the surface turns out bigger than expected -- it shouldn't, given how much is locked).
- The deliverable routes to **`arc-planner`** afterward (the execution is multi-phase / arc-shaped), NOT `writing-plans`.

## Required reads (in order)
1. **`docs/superpowers/parking/2026-06-07-quake-world-docs-federation-roadmap.md`** -- THE spine. Read fully. Locked tenets: note-first synthesis, VitePress on Cloudflare Pages, per-codebase, daisyUI-theme cohesion (adopt vikpe's), self-host + vikpe points DNS, build in the workshop. Do not reopen these.
2. **`docs/superpowers/parking/2026-05-27-docs-quake-world-vision.md`** -- superseded overall, but these sections are carried-forward and directly relevant: **the cross-link contract** (`{{cvar}}` templates + hover tooltips + "Used by" backlinks), **"Why not host the reference under MediaWiki"**, **"Schema is the contract; visuals iterate"**, and the **four free L1 enhancements** (version-walk / cross-engine / source-links / ruleset-disabled badges).
3. **`apps/qw-oracle/SCHEMA.md`** + the **`build-snapshot`** script under `apps/qw-oracle/scripts/` -- what L1 data is available to project (entity fields: name / type / default / description / source_ref / version-history / `category_inferred` / `props_json`) and the existing export that already emits L1 JSON for slipgate-app. `docs.quake.world` is a THIRD consumer of this pipeline, not a new one -- extend it, don't reinvent.
4. (Reference, optional) **`docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md`** -- that's the *oracle* site, but its "Browse notes" + L1-entity-popover design prototypes the docs entity-rendering; precedent for question #3.

## Visual reference
**ezquake.com/docs** is the inspiration (it's VitePress too). Structure: left sidebar grouped **Features / Graphics / Reference / Settings reference / Misc / Source code**, with per-category cvar/command lists. The operator wants to replicate the *intent* but improve it (ezquake.com is incomplete + sometimes wrong at the source; our L1 fixes that). If you fetch it, use the Jina reader (`r.jina.ai/https://ezquake.com/docs`) -- plain WebFetch fails on JS-rendered sites (operator memory `feedback_jina_reader`).

## The agenda (resolve these; most have defaults)
Real design work = #1 and #3. For the rest, confirm the default and move on.

1. **IA / taxonomy** (the meaty one) -- how to organize each codebase's entities for browsing. Candidates: replicate ezquake.com's hand-built categories / drive nav from L1's `category_inferred` field / by entity type. Per-codebase nav + landing page. NOTE: operator memory `feedback_column_layout_scannability` already prefers a scannable one-line-per-row column layout (name | metadata | preview; click to expand) for browse UIs -- lean into that.
2. **L1 -> VitePress projection** -- *default:* the 2026-05-27 per-entity JSON shape, produced by extending `build-snapshot`. Confirm the export shape + whether VitePress consumes markdown-per-entity or data-files + Vue components for the tables.
3. **Per-entity rendering** -- own page per cvar vs filterable table; uniform template vs per-type templates (cvar / command / info_key / cmdline_param / macro / match_event differ in fields). The genuine 2nd design question.
4. **v1 scope** -- *default:* ezquake-first-as-template, then fan out to the other 6. Decide which enhancements ship v1 (version-walk / cross-engine / source-links / ruleset-badges) and what the wiki cross-links do *before the wiki has content* (stub / hide / "coming soon").
5. **Search** -- *default:* VitePress built-in local search for v1; cross-engine filter as a later enhancement.
6. **Build + deploy + cadence** -- *default:* scaffold `apps/docs-web` as a pnpm-workspaces VitePress project; pipeline L1-export -> build -> Cloudflare Pages; manual deploy v1 (automate on-extract later). qw-oracle backend uses `npm --no-workspaces` (memory `reference_qw_oracle_toolchain`); `docs-web` is its own pnpm subtree -- no conflict.

## Deliverable
Drain into **`docs/superpowers/specs/2026-06-09-docs-quake-world-design.md`** (adjust date if the session runs later). Then invoke **`arc-planner`** to scaffold the executable arc. Likely phases: L1-export pipeline -> VitePress scaffold + ezquake as template -> fan-out to the other 6 -> cross-link + enhancements -> CF Pages deploy.

## Operator working preferences (carry forward)
- **One question at a time** in interactive scoping. Don't batch.
- **Plain English first** at every decision point; technical chain only where it carries decision content.
- **Be decisive** -- recommend, don't poll. Lead with your recommendation + reasoning.
- **Output discipline** -- ASCII only in code/regex; no em/en dashes; no AI-slop voice.
- Operator is a **visual learner** -- for layout/mockup questions, offer the brainstorming **visual companion** ONCE (its own message). The operator is mildly quota-conscious; use it only for genuinely visual questions (IA layout, entity-page mockups), not conceptual ones.
- **Momentum over ceremony** (operator does not touch git; Claude runs all git silently; commit to `main` directly).

## First action
1. Invoke `superpowers:brainstorming`.
2. Read the roadmap doc (read #1) + the carried-forward 2026-05-27 sections (read #2).
3. Confirm the locked tenets back to the operator in 3-4 lines (so they know you're oriented), then open question #1 (IA / taxonomy) -- one question, plain English, with your recommendation.
