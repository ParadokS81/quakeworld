# curate-brands

Interactive curation tool for the QWiki tournament-brands graph (Phase 4 brand-pages pivot).

Pre-fills brand assignments from wiki navbox templates, then surfaces what's left for manual sorting via a local HTML tracker.

## Usage

1. **Generate the pre-fill data** (run from the repo root):

   ```bash
   bun apps/qw-oracle/scripts/curate-brands/pre-fill.ts
   ```

   Writes `brand-pre-fill.json` (data) + `brand-pre-fill.js` (HTML loader).

2. **Open the tracker** in a browser:

   ```
   apps/qw-oracle/scripts/curate-brands/index.html
   ```

   Just double-click in a file manager, or open the `file://` URL directly. No server needed.

3. **Curate**:
   - Left pane: unassigned tournaments (filterable by slug / year / mode / navbox-ref).
   - Right pane: brand cards (pre-filled from navbox analysis + your manual assignments).
   - Click an unassigned tournament → assign to existing brand or create new.
   - Bulk-assign: filter the left pane, "select all visible", assign to brand.
   - State persists in localStorage; survives page reloads.

4. **Export**: click "Export JSON" to download the curated state. Feeds the brand-loader (Phase 4 next step).

## Files

- `pre-fill.ts` — extraction + pre-fill script. Reads the wiki snapshot, identifies navboxes (by content signal, not filename), maps articles to brands.
- `index.html` — single-file HTML tracker. Loads `brand-pre-fill.js` directly (no fetch / CORS).
- `brand-pre-fill.json` — pre-fill output (gitignored — regenerate with `pre-fill.ts`).
- `brand-pre-fill.js` — same data, wrapped for `<script>` loading (gitignored).

## Pre-fill stats (last run)

- 629 tournament-shape articles
- 35 navbox templates discovered (content-based signal includes non-"Navbox"-filename templates like `Polish Duel Championship`)
- 29 brands pre-filled
- 248 tournaments auto-assigned
- 385 tournaments unassigned (manual curation candidates)
- 11 navboxes without a clean brand-overview match (operator review at curation time)
- 2 empty navboxes (deprecated)

## Reference

- Schema spec: `docs/superpowers/specs/2026-05-06-tournament-brands-schema-design.md`
- Pivot resume: `docs/superpowers/parking/2026-05-06-qwiki-phase-4-brand-discovery-resume.md`
