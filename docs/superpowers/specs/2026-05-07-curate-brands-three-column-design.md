# QWiki curate-brands tool v2 -- three-column design

**Date:** 2026-05-07
**Status:** Draft (for review)
**Arc:** qwiki-community-reference (Phase 4 brand-pages pivot, curation-workflow brainstorm)
**Companion spec:** `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md` (data model)
**Tool location:** `apps/qw-oracle/scripts/curate-brands/`

## Context

The v1 curate-brands tool is a two-pane HTML (`unassigned tournaments | brand cards`) that conflates two distinct phases of work: **rough sorting** (fast, bulk grouping by brand identity) and **schema processing** (slow, per-brand authoring of brand-note + structured fields). The conflation makes progress invisible -- no way to see "230 sorted, 12 actually processed."

A second framing emerged during the curation-workflow brainstorm: the tool's purpose isn't just operator-throughput; it's the **prototype of the volunteer playbook**. After top 5 brands ship end-to-end (curated + brand-note authored + DB-loaded), the workflow becomes the template that future volunteers follow. Tool decisions therefore bias toward **inspectable state** and **minimal hidden setup**.

This spec defines v2 of the tool -- three columns, separated by workflow phase.

## Workflow phases

- **Phase A -- rough sort.** Every tournament-shape article gets routed to a brand bucket OR creates a new bucket. Goal: empty the left pane. Output: brand-membership map. Fast, bulk operations.
- **Phase B -- drain into schema.** For each bucket (biggest first), populate the brand row + tournament rows + format-line labels per the schema spec, author the brand-note `.md`, verify against original wiki. Slow, per-brand.
- **Phase C -- singletons.** Brand-of-one tournaments. By the time we reach here, patterns are established; mostly automated lift with operator flagging exceptions.

## Tool architecture

Single-file vanilla-JS HTML (`index.html`), `file://` open or local server, no backend. State persists via localStorage during edits and `brand-curation-state.json` (committed to git) as canonical record.

### Column 1 (LEFT) -- wiki inventory

Read-only. Every tournament-shape article from the snapshot. Two-level tree (top-level article -> sub-pages).

**Per-row, compact (default):**
- Title (slug rendered as human-readable form).
- Inline tags: `year` / `mode` / `competition_type`. (`brand` tag dropped -- assignment lives in column 2 now.)
- `+N sub-pages` badge if it has children.
- Navbox-ref badge (e.g., `via EQL Navbox`) when present -- rough-sort gold.
- Wiki-link icon -> opens `https://www.quakeworld.nu/wiki/<slug-with-__-converted-to-/>` in new tab.

**Per-row, expanded (click chevron):**
- Sub-page list (suffix rendered as small chip: `Information` / `Playoffs` / `Division 1`). Sub-pages are informational only; not directly assignable. They ride along with parent on assignment.
- Admin / organizer line (extracted from infobox).
- Intro sentence (first non-template line of wikitext).
- Full navbox-ref list when there are multiple (cross-listed cases).

**Search / filter:** year / mode / competition_type / "has navbox-ref" / "new since last snapshot" (when wiki-diff has run).

### Column 2 (MIDDLE) -- rough-sorted buckets

Working sort. Light schema.

**Two sub-sections, both visible:**
- *Multi-edition brands* -- expanded by default, sorted by member count desc. Pre-fill auto-creates ~29 buckets from Navbox detection.
- *Singletons* -- collapsed by default, sorted alphabetic, scrollable. Buckets with 1 member.

**Per-bucket:**
- Label (brand name).
- Member list with sub-page tree expandable per member (the "Windows Explorer" UX -- click member, see its sub-pages inline).
- Color tag: green = derived from wiki brand-page, purple = synthesized (no wiki brand-page exists), orange = empty/new bucket.
- "Create new bucket" button -- handles name-similarity-only cases (e.g., Casual Duel Cup) where no Navbox asserts the brand identity.

**Assignment actions:**
- Click an unassigned left-pane article -> modal: assign to existing bucket (recent + search) OR create new.
- Bulk: filter left, "select all visible," assign to bucket.

**Bucket data shape:** `{label, member_slugs[], color, notes, created_at}`. No deep schema fields here -- those live on right-column promotion.

### Column 3 (RIGHT) -- promoted buckets (v1 minimal)

**v1 ships a placeholder column 3.** A destination for buckets that have been "promoted" from column 2. Per-card v1 surfaces:
- Bucket label, member count.
- "Promoted" state badge.
- File-path link to brand-note `.md` at `apps/qw-oracle/curated/tournament-brand-notes/<slug>.md` (the file may or may not exist yet -- linked optimistically).

**The full column 3 design is deferred to a separate Phase B workflow brainstorm.** Open questions for that brainstorm (out of scope here):
- How middle -> right promotion actually works (schema-field form? `.md` authoring affordance? wholly out-of-tool?).
- Verification states + UX (`drafted` / `verified` / `committed` advancement triggers).
- Bracket-parser integration for HoF generation.
- Snapshot-diff staleness warnings on right-pane cards.
- Volunteer-onboarding shape (does the tool become an authoring environment, or stay tracker-only?).

The v1 minimal column 3 lets operator see "X buckets promoted" as a visual progress signal without committing to UX choices that are still in design.

### State machine per bucket (v1)

```
unsorted (column 1)
   |  assign
   v
rough-sorted (column 2)
   |  promote
   v
promoted (column 3 placeholder)
```

State advances are explicit operator actions. No automatic transitions.

The v1 state machine stops at `promoted`. Downstream states (`drafted` / `verified` / `committed`) are Phase B concerns and get designed in the Phase B workflow brainstorm. The state field in `brand-curation-state.json` is open-string-typed so Phase B can extend without a schema break.

### Sub-page handling

- All `__`-slug articles included in pre-fill data (no strict-regex filter).
- Detected as sub-pages when slug contains `__`.
- Column 1: nested under parent, collapsible.
- Column 2: ride along with parent when sorted; rendered as small chips on parent's expand.
- Column 3: surface in member list of brand card on expand; informational only.
- Never directly assignable -- always inherit from parent.
- **Edge case:** ~30 ambiguous `__` slugs are real tournaments, not metadata-tabs (e.g., `The_Big_4__Season_2`). Operator can promote one to top-level via a context-menu action ("Treat as top-level"). No automatic detection -- operator judgment.

### Persistence

- `brand-pre-fill.json` -- generated by `pre-fill.ts`, gitignored, regenerated per snapshot. The input.
- `brand-curation-state.json` -- committed to git. Canonical curation record (column 2 + column 3 state). Tool reads on load; edits buffer in localStorage; "Save to file" downloads JSON which operator commits.

This is what makes the workflow inspectable and handoff-ready. Volunteer (or future operator) can `git pull`, open the tool, see exactly where curation left off.

### Wiki integration

External wiki link is the deep-inspection path. No in-tool content preview pane (would require reinventing MediaWiki rendering -- bracket templates, infobox styling, navboxes -- and would consume real estate that's better used by columns 2/3 once column 1 drains).

URL pattern: `https://www.quakeworld.nu/wiki/<title-with-spaces-as-underscores-and-__-as-/>`. Reconstructable from each article's `title` field; no URL field needed in JSON.

### Companion: `wiki-diff.ts` CLI (deferred)

Out-of-tool script. Compares two snapshots (or curation-state vs current snapshot), emits flags JSON consumed by the HTML tool:
- New articles (filtered to tournament-shape categories) -> "needs initial sort" badge in column 1.
- Edited articles (revision_id bumped) -> "wiki-source changed" warning on column 3 cards.
- Deleted/renamed articles (with redirect chase) -> flag harder.

Coarse (revision-level) diff for v1. Section-hash upgrade is YAGNI deferred until review volume is empirically too high.

**Deferred until first re-snapshot is actually needed.** Not in v1 ship.

## What v1 ships

1. `apps/qw-oracle/scripts/curate-brands/index.html` -- three-column rewrite of the existing single-file vanilla-JS tool. Columns 1 + 2 fully featured; column 3 minimal placeholder per the column-3 v1 section above.
2. `apps/qw-oracle/scripts/curate-brands/pre-fill.ts` -- extension to additionally emit:
   - `sub_pages` tree per top-level article (slugs starting with `<parent>__`).
   - `admin` / `organizer` field from infobox.
   - `intro_sentence` (first non-template wikitext line, trimmed).
3. `apps/qw-oracle/scripts/curate-brands/brand-curation-state.json` -- initial empty file, committed to git as canonical state.
4. `apps/qw-oracle/scripts/curate-brands/README.md` -- usage doc updated for v2 shape.

## What v1 explicitly does NOT ship

- **Full column 3 UX** (schema-field forms, brand-note authoring affordance, verification states, bracket-parser integration, snapshot-diff warnings). Deferred to the Phase B workflow brainstorm + a follow-up build pass.
- **Drag/drop.** Click-to-assign + bulk-via-filter is sufficient for v1.
- **Embedding-based new-page suggestion.** Deterministic fallbacks (navbox-match + name-substring-match) catch ~80%.
- **Section-hash diff.** Coarse revision-level diff is the v1 cut.
- **`wiki-diff.ts` CLI.** Spec-aware but deferred until first re-snapshot is needed.
- **Bracket parser / HoF generator.** Phase B work, separate spec.
- **Brand-note `.md` authoring.** Operator + Claude in terminal until volunteer-shape arrives (also gated on Phase B brainstorm).
- **Migration `012_tournament_brands.sql`.** Deferred until top 5 brands are processed end-to-end (stress-test the schema before committing).

## Decisions settled during brainstorm

- **Uniform brand model.** Every tournament gets a brand row, including singletons. Brand notes scale (thick for multi-edition, thin for one-off). Operator-preferred for consistency over data-model purity.
- **Sub-pages ride along, never assignable.** Visible nested under parent in left + middle; inherit parent's brand assignment.
- **Tracker, not editor.** Brand-note authoring stays out-of-tool for v1.
- **Wiki link over content preview.** External link in new tab beats reinventing MediaWiki rendering.
- **localStorage + JSON commit.** Inspectable state for volunteer-handoff readiness.
- **Coarse staleness diff first.** Revision-level only; section-hash later if review volume is too high.
- **Bracket data is parseable.** Liquipedia-style templates with `R\dD\d` slot structure; deterministic extraction. Will inform Phase B HoF generator.

## Schema implications (deferred to migration 012)

The settled design doesn't change the existing schema spec, but it foreshadows these placement columns to be added to `community.tournaments` when migration 012 ships (alongside the bracket-parser HoF builder in Phase B):
- `winner_slug TEXT` -- FK to `community.players(slug)` for individual modes, `community.clans(slug)` for team modes (resolution by `mode` field).
- `runner_up_slug TEXT`.
- `semi_finalist_slugs TEXT[]`.
- `bronze_match_played BOOLEAN` -- when false, semi-finalists are joint-3rd; when true, the array carries explicit 3rd / 4th in order.

All nullable. Brand-level HoF derives via JOIN on `brand_slug`.

## Sequencing

1. **Now (this spec):** review + approve + transition to writing-plans for the v1 build.
2. **Build pass (separate session):** v1 tool ship -- HTML (columns 1 + 2 full, column 3 placeholder) + pre-fill.ts extension + initial state JSON. Single PR / commit chain.
3. **Phase A run:** operator drives rough-sort, top-down by brand size. Captures handoff after 5-10 brands rough-sorted to validate the columns 1 + 2 UX in practice.
4. **Phase B workflow brainstorm (fresh terminal):** design how middle -> right promotion + brand-note authoring + verification + bracket-parser integration actually works as an operator workflow. Output is a follow-up spec amending the column 3 section of this one.
5. **Column 3 build pass:** ship the full column 3 UX per the Phase B spec.
6. **Phase B per-brand drain (separate sessions):** top 5 brands end-to-end -- author brand-note `.md`, capture structured fields, run bracket-parser for HoF. Migration 012 ships when all 5 are stable.
7. **Phase C:** singletons + tail.
8. **Volunteer handoff:** when Phase B has demonstrated end-to-end on top 5, document the playbook and open up volunteer participation.

## References

- `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md` -- schema spec, locked.
- `docs/superpowers/parking/2026-05-07-qwiki-phase-4-curation-workflow-handover.md` -- handover that opened this brainstorm.
- `docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md` -- pivot resume.
- `apps/qw-oracle/scripts/curate-brands/README.md` -- current v1 tool docs.
- `apps/qw-oracle/scripts/curate-brands/pre-fill.ts` -- current pre-fill script.
