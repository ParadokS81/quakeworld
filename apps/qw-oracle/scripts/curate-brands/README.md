# curate-brands

Three-column interactive curation tool for the QWiki tournament-brands graph (Phase 4 brand-pages pivot).

Pre-fills brand assignments from wiki navbox templates, then surfaces what's left for manual sorting via a local HTML tracker. Designed for a multi-week, on-and-off curation cadence.

## Workflow phases

- **Phase A — rough sort.** Every tournament-shape article gets routed to a brand bucket OR creates a new bucket. Goal: empty the left pane. Output: brand-membership map. Fast, bulk operations.
- **Phase B — drain into schema.** Per bucket, populate brand row + tournament rows + format-line labels per the schema spec, author the brand-note `.md`, verify against original wiki. Slow, per-brand. *Promotion column 2 -> column 3 marks the bucket as ready for Phase B; full Phase B UX is designed in a separate brainstorm.*
- **Phase C — singletons.** Brand-of-one tournaments. By the time we reach here, patterns are established.

## Three columns

1. **Wiki inventory (left).** Read-only. Every top-level tournament article from the snapshot. Sub-pages (slugs containing `__` + a metadata-tab suffix like `Information`, `Playoffs`, `Division_N`) nest under their parent — click chevron to expand inline. Filter / search at top. Each row: title + tags (year, mode, competition_type) + sub-page count + navbox-ref badges + wiki-link icon.

2. **Rough-sorted (middle).** Working sort. Two sub-sections: *Multi-edition* (>=2 members, expanded) and *Singletons* (<2 members, collapsed by default when many). Pre-fill auto-creates ~29 multi-edition buckets from Navbox detection. Click an unassigned inventory row -> assign to existing bucket or create new. Each bucket card has `promote` / `edit` / `del` actions.

3. **Promoted (right).** Minimal v1 placeholder destination for buckets whose rough-sort is done. Shows label + member count + path to the brand-note `.md`. Full Phase B UX is deferred to a separate brainstorm.

## Usage

1. **Generate the pre-fill data** (run from the repo root):

   ```bash
   bun apps/qw-oracle/scripts/curate-brands/pre-fill.ts
   ```

   Writes `brand-pre-fill.json` (data) + `brand-pre-fill.js` (HTML loader). Both are gitignored — regenerate per snapshot.

2. **Open the tracker** in a browser:

   ```
   apps/qw-oracle/scripts/curate-brands/index.html
   ```

   Double-click in a file manager, or open the `file://` URL directly. No server needed.

3. **Curate** (Phase A — rough sort):
   - Click an inventory row -> modal: assign to existing bucket OR create new bucket.
   - Click a row's chevron to expand: shows admin / intro_sentence / sub-pages list.
   - Bulk: filter the inventory, "select all visible", click "Assign selected".
   - For brands with no Navbox (e.g., Casual Duel Cup): use "+ New bucket" to create the bucket, then assign members.
   - Click `promote` on a bucket card to mark its rough-sort as done — moves it to the right column.
   - State persists in localStorage; survives page reloads.

4. **Persist canonical state**: click "Export JSON" -> downloads `brand-curation-state.json`. Replace the committed file with this download and commit. This is what makes the curation state inspectable / handoff-ready.

5. **Resume on a new machine / browser**: click "Import JSON" -> pick the committed `brand-curation-state.json`. Replaces local state.

## Files

- `pre-fill.ts` -- extraction + pre-fill script. Reads the wiki snapshot, identifies navboxes (by content signal, not filename), maps articles to brands, extracts admin / intro_sentence / sub-page tree per article.
- `index.html` -- single-file HTML tracker. Loads `brand-pre-fill.js` directly (no fetch / CORS).
- `brand-pre-fill.json` -- pre-fill output (gitignored — regenerate with `pre-fill.ts`).
- `brand-pre-fill.js` -- same data, wrapped for `<script>` loading (gitignored).
- `brand-curation-state.json` -- canonical curation state (committed). Empty placeholder on initial check-in; replaced after each export.

## Pre-fill stats (last run, 2026-05-04 snapshot)

- 553 top-level tournament articles
- 76 sub-page articles (nested under 25 parents)
- 35 navbox templates discovered (content-based)
- 29 multi-edition brand buckets pre-filled
- 248 tournaments auto-assigned via Navbox membership
- 309 top-level tournaments unassigned (manual curation candidates)
- 10 navboxes flagged as "no clean brand-overview match" (operator review at curation time)

## Sub-page detection rules

Two complementary rules nest sibling pages under their parent:

**Rule 1 — `__<metadata-tab-suffix>`** (the wiki's `/Subpage` URL-encoded as `__` in the snapshot). An article qualifies as a sub-page when:
- the parent slug (everything before the LAST `__`) exists as another article in the snapshot, AND
- the suffix matches a metadata-tab pattern: `Division_N` / `Group_X` / `Information` / `InfoRules` / `Rules` / `Playoffs` / `standings` / `results` / `Schedule` / `signups` / `Teams` / `players` / `bracket` / `draft`.

This preserves real-tournament hierarchical names (`The_Big_4__Season_1`, `Quakeworld_Eternal__Dm3`) as top-level while nesting metadata-tab sub-pages under their parent.

**Rule 2 — `{{Tabs static}}` template.** When an article uses `{{Tabs static |link1=<parent> |link2..linkN=<siblings>|...}}` (the wiki's tabbed-page pattern), `link1` is the parent and the rest are sub-pages. Catches cases like `Kombat_Duel_2` + `Kombat_Duel_2_Monday/Tuesday/Wed/Thu` where the daily pages share a name prefix but are independent articles linked via tabs (no `/Subpage` URL-encoding involved).

## Reference

- Tool design spec: `docs/superpowers/specs/2026-05-07-curate-brands-three-column-design.md`
- Schema spec: `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`
- Pivot resume: `docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md`
- Brainstorm handover: `docs/superpowers/parking/2026-05-07-qwiki-phase-4-curation-workflow-handover.md`
