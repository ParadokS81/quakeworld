# Layer 3 pivot -- handover for next session

**Date written:** 2026-04-23 (at session close, right after the extraction-review shakedown)
**Purpose:** Capture the nuance + intent behind the Layer 3 pivot discovered during the shakedown, so the next session can start a proper brainstorm with full context rather than re-deriving it from scratch.

This is NOT a design spec -- it's a primer. The actual design happens through the `superpowers:brainstorming` skill in the next session. The pivot is judgment-heavy and benefits from a dedicated walkthrough, not a quick execution.

## How this came up

The extraction-review skill + CLI shipped during this session. Thirteen commits of implementation, one code-review round, five rounds of root-causing on shakedown findings (extract-tag bugs, DB rebuild, Q3 schema-expansion filter, Q4 pre-existing-debt filter). The shakedown pair was ezquake 3.6.5 -> 3.6.6.

The walk got to Finding 3 (the skywind family) before the pivot surfaced.

**What happened:**

1. Finding 3 was "new command `skywind` at 3.6.6" plus 5 siblings (4 related commands + 1 cvar `r_skywind`). The unified-family pattern would normally resolve to `classify` -- AST picked it up, no seed edit needed, move on.

2. Claude proposed `classify` with a fallback of "concept-note if you want to document the IronWail provenance."

3. The user paused: "We had skyboxes before -- is this an alternative way to render them? Does it come with new filetypes? Is it documented? Our goto for ezquake documentation is https://ezquake.com/docs/textures.html#skyboxes."

4. Only after being pointed at ezquake.com did Claude check that site. skywind is NOT on ezquake.com/docs, even though it IS documented via in-engine /help (the PR updated help_commands.json + help_variables.json in the same commit).

5. This surfaced a real gap: **the skill's disposition-research protocol didn't include ezquake.com/docs as a source**. Claude was proposing dispositions with incomplete cross-referencing.

6. But deeper than the skill-prompt gap, it surfaced an architectural question: **what's the right relationship between ezquake.com/docs and Layer 3 of the knowledge service?**

## The pivot in plain terms

**Original Claude framing (probably too strict):** "Layer 3 concept notes are earned by consumer questions; don't pre-populate them." Cited `apps/qw-oracle/concept-notes/README.md`.

**User's challenge (correct):** ezquake.com/docs guides like https://ezquake.com/docs/charsets.html and https://ezquake.com/docs/crosshairs.html are already hand-curated community guidance -- explanations, best practices, usage idioms. That's Layer 3 content by definition. It's been earned by 15+ years of community questions; it's not speculative.

**Revised framing (what to design around):**

Layer 3 has two feeding paths, not one:

| Source of curation | Mechanism | Examples |
|---|---|---|
| **Community-curated elsewhere** | Import / normalize / link-to | ezquake.com/docs guide pages, Discord pinned explainers, qwiki articles |
| **Newly curated here** | Written during review or deliberate investigation | `kmap-legacy-keymap-system.md`, `engine-internal-vs-player-facing-files.md`, likely a future skywind note |

The "earn by question" rule prevents *us* from writing speculative notes from scratch. It does NOT reject importing work that has already been earned by the community.

## What the next session needs to design

Roughly in priority order -- NOT execution order. Brainstorming skill will tease these out.

**1. Ingest strategy for ezquake.com/docs.**

Three broad options to explore:

- **Bulk-import as concept notes.** One concept note per guide page, `source: ezquake.com/docs/<page>` in frontmatter, body normalized to our note template (Summary / topic-specific / Consumer implications / References). Heaviest, richest.
- **Reference-only.** Clone repo to `research/repos/ezquake-docs/`, skill reads it during disposition research, no ingestion into `apps/qw-oracle/concept-notes/`. Lightest, preserves "earn by question" strictly.
- **Hybrid / tiered.** Guide-heavy pages (charsets, crosshairs, HUD) get imported; Layer-1-heavy pages (cvar lists in textures.html middle section) stay as reference-only because they duplicate extraction.

The trade-off is between integration (imported notes show up in `get_concept_note` MCP queries, link to entity IDs) and complexity (maintaining normalized copies, handling drift when ezquake.com updates).

**2. Which pages are guide-heavy vs Layer-1-heavy?**

From the user's observations during the shakedown:
- `charsets.html` -- guide-heavy, Layer 3 material.
- `crosshairs.html` -- guide-heavy, Layer 3 material.
- `textures.html` -- mixed. "Skyboxes" section is guideline + image grid (Layer 3), cvar list section is Layer 1 duplicate.
- Sidebar on ezquake.com index (from the screenshot at `C:\Users\Administrator\Downloads\2026-04-23_12-26.png`) shows these categories: Features, Graphics, Reference, Settings reference, Misc. The first row (Features, Graphics) is guide territory; Settings reference is Layer 1 duplicate territory.

Walking the docs site page-by-page and classifying each is probably the first investigation step.

**3. Frontmatter + provenance scheme.**

If we import, we need to distinguish imported from authored notes. Options:

- `source:` field with URL pointing to upstream (`ezquake.com/docs/charsets.html`).
- `imported_from:` separate field, with `last_imported_at:` timestamp for drift tracking.
- `authored_by:` field distinguishing community vs qw-oracle-authored.

Imported notes would link back to entities via `related_entities:` (same as authored notes), so the `get_concept_note` MCP tool treats them uniformly on read.

**4. Drift management.**

ezquake.com evolves. If we import and normalize, we need a story for:
- When the upstream page changes -- do we re-import, or do our edits diverge?
- When our entity model gains / loses entities that the imported guide references.
- Contribution path: when a review surfaces a gap (like skywind's absence from ezquake.com), we write a local concept note, then optionally PR upstream to add it to ezquake.com. The two-way flow matters.

**5. Skill protocol update.**

Regardless of ingestion choice, the `extraction-review` skill's disposition-research protocol needs to expand. Current protocol (inside `~/.claude/skills/extraction-review/SKILL.md`):

- `packages/qw-config/seeds/*.yaml` -- seed coverage
- `apps/qw-oracle/docs/entity-types.md` -- classification vocabulary
- `apps/qw-oracle/concept-notes/` -- Layer 3 coverage
- `git log <commit_sha>` -- change motivation

Needs to add:

- In-engine help JSONs (`help_commands.json`, `help_variables.json` in ezquake-source) -- authoritative per-entity help.
- ezquake.com/docs markdown (via cloned repo) -- community guide coverage.
- Possibly: commit diff (`git show <sha>`) when the commit message alone isn't enough.

## The skywind finding is a good test case

When the next session resumes the review walk, Finding 3 will be the first one to exercise the updated protocol. Pre-loaded evidence:

- **New entities at 3.6.6:** commands `skywind`, `skywind_load`, `skywind_lookdir`, `skywind_rotate`, `skywind_save` + cvar `r_skywind`.
- **Commit:** `d7e91ef3` "RENDERER: Add support for skywind." PR #978 from qw-ctf/skywind branch, authored by Daniel Svensson (nano).
- **Release note:** "RENDERER: Add support for skywind, ported from IronWail (@dsvensson)" -- section "improvements."
- **In-engine help:** Both `help_commands.json` and `help_variables.json` updated in the same commit with full descriptions + syntax. So `/help skywind` works in console.
- **ezquake.com/docs status:** NOT present. Verified by fetching `https://ezquake.com/docs/textures.html` and grepping for "skywind" -- zero hits. Real public-docs gap.
- **What skywind actually is:** animation layer on top of existing skyboxes. Requires alpha-channel skyboxes (partial transparency). Blends cubemap with itself to simulate moving sky. Ported from IronWail (a single-player Quake engine). Sidecar config files at `gfx/env/<skyboxname>_wind.cfg` auto-load when the matching skybox loads.

**Expected disposition after the pivot:** `concept-note` -- but the note's content depends on the ingest strategy. If we import ezquake.com/docs, the skywind note becomes "documents the gap and adds to the ezquake.com/docs corpus via local Layer 3 authoring." If we reference-only, the skywind note stands as a pure qw-oracle-authored Layer 3 entry.

## What NOT to do next session

- Don't bulk-import all ezquake.com pages in one pass. Start with 2-3 guide-heavy pages (charsets, crosshairs, one of {HUD, teamplay, scripting}) and see how the normalization feels. Scale up only after pattern is proven.
- Don't rewrite the `concept-notes/README.md` authoring rules without care. The "earn by question" principle is still right for NEW authoring. The edit is adding a second authoring path (import), not replacing the first.
- Don't delay Phase 2f indefinitely. Layer 3 baseline improves reviews but isn't strictly required. If the brainstorm surfaces that the ingest is weeks of work, ship a lighter reference-only Phase A and defer the full import.

## Handover tips for starting the brainstorm

The starter prompt for next session should be something like:

> "Let's brainstorm the Layer 3 pivot. Read `docs/superpowers/specs/2026-04-23-layer3-pivot-handover.md` first for context. Then walk me through the ingest strategy options -- I want to see the tradeoffs before we commit to one."

Before diving into options, the brainstorm skill should:

1. Clone the ezquake.com repo to eyeball the structure: `git clone https://github.com/QW-Group/ezquake.com.git research/repos/ezquake-docs`.
2. Tour `research/repos/ezquake-docs/` to see how it's organized (docusaurus layout, MDX vs pure MD, sidebar config, etc.).
3. Count pages per category (Features, Graphics, Reference, Settings reference, Misc).
4. Sample 2-3 concrete pages (charsets, crosshairs, textures) to see the range of content density.
5. Then propose ingest options with that evidence in hand.

**Key user-side facts to keep in mind:**
- The ezquake.com/docs content is the community's go-to reference. Author-scraping it without permission would be rude; the right path is via the GitHub repo (public, MIT / CC-licensed presumably, check license file).
- Daniel Svensson (aka "nano") is the maintainer who ports features like skywind. Any ingest decisions that affect contribution-back-to-upstream workflow should preserve an easy path to PR improvements upstream.
- The user (ParadokS) is a visual learner who values momentum over ceremony. Don't brainstorm endlessly -- reach a viable option quickly, start small, iterate.

## Current state at handover

- Extraction-review shakedown review draft at `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md` has 2 filled dispositions (F1 hud_gun2_frame_hide, F2 cl_pext_colourmod -- both `classify`) and 63 pending. The skill's resume protocol will skip the 2 and walk the remaining 63 when we return.
- Task #13 (live run validation) stays `in_progress` carrying this state.
- Task #14 (drain HANDOVER items #1 and #4) stays `pending` -- we hold until the walk concludes.
- All 13 implementation commits are on `main` and unpushed.
- DB state: fresh rebuild of 7 ezquake tags under current unified pipeline, 6 consecutive diffs run, enrich run (84 + 313 rows updated).

## Linked artifacts

- Spec: `docs/superpowers/specs/2026-04-23-extraction-review-design.md`
- Plan: `docs/superpowers/plans/2026-04-23-extraction-review-plan.md`
- Skill: `~/.claude/skills/extraction-review/SKILL.md`
- Shakedown review draft: `apps/qw-oracle/docs/reviews/2026-04-23-ezquake-3.6.5-to-3.6.6.md`
- Concept-note authoring template: `apps/qw-oracle/concept-notes/README.md`
- Existing concept notes to match style: `apps/qw-oracle/concept-notes/kmap-legacy-keymap-system.md`, `apps/qw-oracle/concept-notes/engine-internal-vs-player-facing-files.md`
- ezquake.com docs source repo (verified exists): https://github.com/QW-Group/ezquake.com
