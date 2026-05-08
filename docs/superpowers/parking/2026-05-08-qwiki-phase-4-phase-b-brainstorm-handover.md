# QWiki Phase 4 -- Phase B brainstorm + first-brand drain handover

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.**

The prior session (2026-05-07 evening) shipped curate-brands v1 -- the three-column rough-sort tool -- and worked through ~10 wiki-data quirks discovered during operator's Phase A use (special-char URL collapse, `{{Tabs static}}` siblings, redirect-target wikilinks, brand-overview pages with sub-pages, slug drift on pre-fill changes, etc.). Context hit ~400k. Operator exported the curated state. Fresh terminal needed for the Phase B workflow brainstorm + first-brand drain.

This is a **BRAINSTORM session that may transition to implementation**, not pure implementation. Use `superpowers:brainstorming` to design the column 2 -> column 3 workflow, then transition to writing-plans (or directly to ship) once the design is settled.

---

## The pivot in one paragraph

Phase A (rough-sort all tournament-shape articles into brand buckets) is essentially complete. The curate-brands tool has 32 pre-filled buckets + operator-created custom buckets ("upcoming", "flagged for duplicates", and several synthesized brands the operator added for groups whose Navbox didn't have a brand-overview page). What remains is **Phase B: drain a bucket from middle column -> right column.** This means: author the brand-note `.md`, capture structured fields per the schema spec, parse bracket data for HoF, verify against the wiki source, and commit. The operator wants to start with **the bigger brands first** (EQL / Kombat / QHLAN / NQR / RQWL) to learn the workflow patterns, then handle the long tail. Schema migration (`012_tournament_brands.sql`) ships after the top 5 are stable.

---

## What's shipped (committed to main, since 2026-05-07)

### Tool: curate-brands v1 (three-column HTML)

`apps/qw-oracle/scripts/curate-brands/`
- `index.html` -- vanilla-JS three-pane tracker. Inventory (left, alphabetic case-insensitive) / Rough-sorted buckets (middle, multi-edition + singletons sub-sections) / Promoted (right, minimal placeholder).
- `pre-fill.ts` -- Bun script that reads the wiki snapshot, identifies tournament-shape articles + Navbox templates (content-based), pre-assigns articles to brands, extracts admin / intro_sentence / sub-page tree, emits `article_titles` map for special-char-preserving URLs.
- `brand-curation-state.json` -- canonical curation state (committed). **Operator exports here at end of each session.**
- `README.md` -- usage doc.

### Bug fixes / improvements during the session (in commit order)

- {{Tabs static}} template detection (Kombat_Duel_2 + 4 daily tabs) -- 632 articles use this.
- Sub-page rule broadened: any `__` slug whose parent is tournament-shape -> sub-page (catches QHLAN2017/1on1, QHLAN2024/QH24_Prewar, GetQuad sub-pages with empty categories, etc.).
- Brand-overview pages with sub-pages preserved in inventory (orphan fix for Quakeworld_Eternal, Get2Gether).
- Navbox member slugs resolved through redirect map (NQR ICC Season 1 -> NQR_Invitational_Classic_Cup).
- Special-char snapshot-encode resolution: GetQuad! Draft article (filename `GetQuad__Draft.json`, real URL `GetQuad!_Draft`) now resolves correctly. wikiUrl() uses article title for accurate URLs.
- Auto-merge: state on load reconciles new pre-fill auto-assignments without overriding manual work; metadata catch-up for previously-stuck buckets (Hammer Time was stuck synthesized).
- Slug-drift handler: when pre-fill changes a bucket's slug derivation, rename the existing state bucket via navbox_slug match.
- Brand-card expansion tracked in state (so member-chevron clicks don't collapse parent).
- Vertical member rows with chevron expand (admin / intro / sub-page chips inline).
- Hide-assigned toggle (default ON), brand-overview pages filtered from inventory, supplementary-page heuristic (`*_Hall_of_Fame`, `*_Map_Pool`, etc.).

### Spec

`docs/superpowers/specs/2026-05-07-curate-brands-three-column-design.md` -- locked. Column 3 deliberately scoped as v1 placeholder; full design deferred to **this** brainstorm pass.

---

## Operator's curation state (as of session end)

The operator has exported `brand-curation-state.json`. **Before this session starts substantive work, verify the exported state has been committed:**

```bash
ls -la apps/qw-oracle/scripts/curate-brands/brand-curation-state.json
# Should NOT be the placeholder (look for non-empty `brands` array).
```

If it's still the placeholder:
1. Operator has the JSON in `~/Downloads/` (or wherever browser saves).
2. Move it to `apps/qw-oracle/scripts/curate-brands/brand-curation-state.json`.
3. Commit: `git add apps/qw-oracle/scripts/curate-brands/brand-curation-state.json && git commit -m "data(curate-brands): canonical curation state after Phase A rough sort"`

Once committed, the fresh session can read it for an accurate picture of which brands have been touched / how members are distributed.

**Phase A coverage** (per pre-fill stats, may be more after operator's manual additions):
- 32 pre-filled buckets via Navbox detection + redirect resolution.
- Top 5 by member count: EQL (37+) / Kombat (~31) / QHLAN (~23) / NQR (19) / RQWL (~19).
- Synthesized buckets created by operator for brands whose Navbox lacks a brand-overview page (QWar, QWDL, Draftmasters, NAQL, OnemapDuel, sdCup, etc., plus operator-added customs).

---

## Phase B brainstorm -- the open questions

The spec's column 3 placeholder is intentional -- this brainstorm fills it in. Open questions to walk:

### 1. The drain workflow shape

How does an operator move a bucket from middle -> right? Plain English -- what does the operator DO, click by click?

Two endpoints to consider:
- **(a) Authoring-in-tool.** Tool grows a schema-fields form + markdown editor. Operator fills brand row fields (founder, eras, region, etc.), writes prose, saves. Tool persists to disk OR exports for git commit.
- **(b) Authoring-out-of-tool (terminal session with Claude).** Tool just tracks state; the operator opens a Claude terminal, says "drain EQL bucket", Claude reads the bucket's members + wiki content, drafts the .md, operator reviews, commits.

Hybrid is also possible. Operator's prior framing favored (b) for the prototype phase, with (a) as a Phase 2 (volunteer-onboarding) upgrade.

### 2. Bracket parsing -> Hall of Fame

Spec already foreshadows this. Liquipedia-style `R\dD\d` slot templates + BracketMatchSummary for per-map detail. Deterministic to parse. Need to design:
- Per-tournament parsing flow: what fields land in `community.tournaments` per row?
- Brand-level HoF rendering: SQL JOIN at read time vs materialized view vs MD-frontmatter-cached-at-author-time.
- Edge cases (no bracket / round-robin / Swiss / incomplete brackets / multi-discipline LANs).

### 3. Schema migration 012 timing

Currently deferred until top 5 brands stress-test the schema. When do we ship it? Brainstorm options: ship migration first then drain, OR drain into local-only artifacts first then migrate.

### 4. Verification + breadcrumb staleness

Each authored brand-note carries `wiki_revision_id` + `wiki_fetched_at`. Snapshot-diff CLI design (deferred from v1) plus how the tool surfaces "wiki source changed since you authored this" warnings. Operator wants to keep the workflow re-snapshot-friendly because alice + Hooraytio will fix wiki gaps over time.

### 5. Singleton handling (the UKCL case)

Operator's wrap-up note: some single-page tournaments (e.g., `UKCL` -- one info page, list of winners from 11 seasons, no sub-pages, data lost) deserve their own MD with prose, but the schema-rich path (rows + brackets + HoF) is too thin. How do we treat these? Options:
- Force them through the same flow with mostly-empty schema rows + prose-only brand-note.
- Separate "thin singleton" path: prose-only MD + minimal tournament row, no brand row.
- Defer entirely until top brands prove the workflow.

### 6. Volunteer handoff prep

After top 5 are drained end-to-end, what's the playbook a volunteer would follow? This is what the whole arc has been building toward. The brainstorm should sketch the deliverable shape (a CONTRIBUTING.md? A walkthrough video? A starter-kit branch?) but ship is post-Phase-B-proof.

---

## Critical rules (don't violate)

- **DO NOT modify the schema spec without operator sign-off.** `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md` is locked. Tweaks happen in follow-up specs.
- **DO NOT write migration 012 yet.** Top 5 brands must demonstrate the workflow first. The migration is the LAST step of Phase B, not the first.
- **DO NOT touch the curate-brands tool unless a real workflow gap is found.** It's been beaten on hard during Phase A; further changes risk regression. Tool is now stable.
- **DO NOT auto-fold operator's manual buckets.** Their custom buckets ("upcoming", "flagged for duplicates", synthesized adds) are intentional. Phase B treats them as first-class.
- **DO NOT run pre-fill.ts during a Phase B session unless a wiki re-snapshot has happened.** Re-running on the same snapshot just regenerates identical output; the auto-merge handles state catch-up on tool reload.
- **DO NOT extend the schema mid-brainstorm.** If a Phase B finding suggests a schema change, capture it as an open question; bake into a spec amendment AFTER brainstorm.
- **Operator memory rules are load-bearing.** Momentum over ceremony / plain English at decisions / one question at a time / decisive recommendations / no subagents for mechanical edits / ASCII-only in code and shared docs / commit early. Auto-loaded from MEMORY.md.

---

## First three actions

1. **Read this handover (you're reading it).**
2. **Verify operator's curation state is committed.** `cat apps/qw-oracle/scripts/curate-brands/brand-curation-state.json | head -20` -- if it's still the placeholder (`"_note": "Canonical curation state. Empty on initial commit..."`), prompt operator to drop in their exported JSON and commit. If it's already real data, note the bucket count + member distribution.
3. **Read the spec + schema spec (parallel reads):**
   - `docs/superpowers/specs/2026-05-07-curate-brands-three-column-design.md` -- the column 3 deferred section is the brainstorm scope.
   - `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md` -- the data shape Phase B fills in.

Then invoke `superpowers:brainstorming` and walk the open questions. **Lead with question 1 (drain workflow shape)** -- it's the highest-leverage decision and gates the rest. Don't try to pre-decide all 6 questions; the natural flow will surface what matters first.

---

## Reads required (priority order)

1. **This file (handover).**
2. **`apps/qw-oracle/scripts/curate-brands/brand-curation-state.json`** -- operator's curation snapshot.
3. **`docs/superpowers/specs/2026-05-07-curate-brands-three-column-design.md`** -- column 3 deferred section is the brainstorm target.
4. **`docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`** -- schema, locked.
5. **`apps/qw-oracle/scripts/curate-brands/README.md`** -- tool usage + sub-page rules.
6. **`apps/qw-oracle/scripts/curate-brands/pre-fill.ts`** -- if you need to understand what fields are in the bucket data.
7. **`docs/superpowers/parking/2026-05-07-qwiki-phase-4-curation-workflow-handover.md`** -- the prior session's handover (covers the column-1+2 design rationale).
8. **`apps/qw-oracle/API_CONTRACTS.md`** -- profile-notes pattern + frontmatter-mirrors-row convention.

If short on time: 1, 2, 3, 4 are mandatory. 5-8 for context.

---

## Operator preferences (carried, in addition to MEMORY.md)

- **Tackle bigger brands first.** Top 5 by member count are the proof artifacts.
- **Wiki is source of truth, but messy.** Multiple authoring conventions coexist (`__`-subpages, `{{Tabs static}}`, redirect-targeting wikilinks, navbox-without-brand-page, brand-page-without-navbox-listing, etc.). Tool absorbs as much complexity as it can; rest gets handled manually.
- **Active-assistance product framing.** The MD output isn't just for the operator -- it's the LLM-readable cleanup of the wiki, optimized for vector embeddings + concept-note authoring downstream.
- **Volunteer-handoff prep is the real goal.** After top 5 ship end-to-end, the workflow becomes the playbook. Tool decisions favor inspectable state + minimal hidden setup.
- **Comments and gaps fed back to wiki maintainers.** Operator collaborates with Hooraytio + alice on wiki cleanup. Findings surfaced from the curation flow (missing brand pages, duplicate seasons, etc.) become wiki-side TODO items, not just oracle-side annotations.

---

## When in doubt

- **New ambiguity in a bucket (mixed format-lines, etc.)** -> flag as operator-review item; don't auto-decide.
- **Tempted to add LLM to the discovery layer** -> don't. Wiki structures it; we surface it. LLM is for prose authoring + the eventual auto-suggest for new pages.
- **Tempted to touch the schema** -> capture the change as an open question; defer to a spec amendment AFTER brainstorm settles.
- **Tempted to write migration 012** -> wait until top 5 brands have stress-tested the schema. Premature migration is harder to fix than a deferred one.
- **Operator pauses mid-brainstorm to manually edit a bucket in the tool** -> that's expected; absorb feedback when they return.
- **Bracket parser produces unexpected output** -> log the wikitext that confused it; don't auto-correct.
- **Phase B brainstorm reveals new tool-side requirements** -> capture as a future tool work item; don't immediately context-switch to tool implementation.

---

## Halt-and-report contract

After the brainstorm:
- Surface to operator: agreed Phase B workflow shape (column 3 UX, schema-fields surface, brand-note authoring path, bracket parser interface).
- Spec amendment: write a follow-up spec at `docs/superpowers/specs/YYYY-MM-DD-curate-brands-phase-b-workflow-design.md` (or amend the existing spec if narrow enough). Commit.
- Identify the **first concrete deliverable** -- probably "drain EQL bucket end-to-end" as the workflow proof.

After implementation work (if it lands in the same session):
- Don't write code without operator sign-off on the workflow first.
- Commit each meaningful change separately (one-line messages).
- Don't push without explicit operator request.

---

## Context budget projection

Brainstorm session itself: ~30-50k tokens. Light, mostly conversation.

If Phase B spec amendment lands in same session: +20-30k tokens.

If first-brand drain (EQL end-to-end) ALSO happens: +60-100k tokens (read members' wikitext, parse brackets, draft brand-note, verify, commit).

Total expected: 110-180k for "brainstorm + spec + first drain" if cleanly scoped. Comfortable.

If approaching 300k while still in brainstorm: handoff again -- brainstorm shouldn't exceed 60k.
