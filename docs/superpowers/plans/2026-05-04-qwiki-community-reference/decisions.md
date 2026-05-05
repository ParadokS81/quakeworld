# QWiki community-reference -- locked cross-cutting decisions

These choices apply to every phase. If any phase needs to deviate, surface a "deviation" section at the top of that phase MD and stop for operator review. Mid-arc amendments land here as dated amendment blocks under the original decision; never silently override in a phase MD.

The decisions here translate the spec's ratified choices (`docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`) plus the planning-conversation refinements (deterministic extraction, two-threshold row model) into commitments every per-phase drafter respects.

---

## D1. Two outputs per entity type

**Decision:** Every entity (player, clan, tournament) lands as a row in `community.<table>` regardless of content depth. Markdown notes under `apps/qw-oracle/curated/<type>-notes/` are emitted only for entries with content the row schema cannot carry.

**Why:** The DB row is the recognition signal (does this nick / clan / tournament name resolve to a real entity?). The markdown note is the unique-content overlay (prose, quotes, equipment tables, trivia). Conflating them produces ~5,000 markdown stubs that wrap DB rows -- pure noise.

**Implication:** Phase 2/3/4 each ship two parallel outputs. Phase 6 MCP tools render profiles by composing rows + (optional) markdown body. A profile renders correctly whether or not a note exists.

---

## D2. `community` schema is new and separate from L1

**Decision:** Phase 1 creates a new `community` schema in the existing `qw_oracle` Postgres database. Tables: `community.players`, `community.clans`, `community.tournaments`, `community.player_clan_eras`, `community.tournament_results`. Existing L1 entity tables are untouched.

**Why:** Different lifecycle. L1 regenerates from source-code extractions per engine version; community is durable curated reference, refreshed on wiki re-scrape or human edit. Mixing them in `public` muddles the regen story and the FK conventions.

**Implication:** All migrations for this arc are append-only `.sql` files under `apps/qw-oracle/db/migrations/` (next file 008 onward). No L1 tables modified. MCP tools query `community.*` qualified names.

---

## D3. `curated/` folder reframe -- single rename + typed sub-folders

**Decision:** Phase 1 moves `apps/qw-oracle/concept-notes/` to `apps/qw-oracle/curated/concept-notes/` and adds three sibling directories: `curated/player-notes/`, `curated/clan-notes/`, `curated/tournament-notes/`. All four are siblings under `curated/`. Same MCP retrieval contract (frontmatter + body); per-type templates differ.

**Why:** Layer 3 stops being "concept-notes only" and becomes "curated knowledge layer with multiple typed note-folders". The reframe is load-bearing for future arcs (map-notes, era-notes, match-report-notes). Doing it now while only concept-notes content exists is much cheaper than later.

**Implication:** Phase 1 updates every loader-script and MCP-tool reference to `concept-notes/` (currently in `apps/qw-oracle/scripts/load-concepts/` and `apps/qw-oracle/serve/mcp/`). Existing concept-note retrieval must still work post-rename -- that's Phase 1's verification gate.

---

## D4. Deterministic extraction -- no LLM-per-page in player/clan flow

**Decision:** Phase 2 (players) and Phase 3 (clans) extract via deterministic TypeScript parsers using regex/template-shape matching. No LLM invocation in the per-page extraction loop. The parser handles all template variants mechanically:

- `{{Infobox player}}` -- pipe-separated key=value fields, regex-extractable.
- `{{Player-info}}` -- same shape, different field names.
- NO_INFOBOX bullet-prose -- `* '''Field:''' value` per line, regex-extractable.
- Categories -- `[[Category:X]]`, regex.
- Achievement rows -- `{{Achievement|year=X|place=Y|event=Z|mode=W|team=V|...}}`, template parse.
- Clan history (TH rows) -- `{{TH|year-range|clan}}`, template parse.

**Why:** ~9,000 LLM calls is wasteful and worse than regex on this corpus. Every player/clan page, regardless of template variant, has structured fields extractable by deterministic logic. The brainstorm pilot (310 stratified players + 50 clans) confirmed the three-branch + fallback structure.

**Implication:** Phase 2/3 parser tasks dispatch to subagents at Sonnet medium for code synthesis (multi-branch parser), not for content generation. Subagent writes the parser; the parser runs deterministically. Tournaments (Phase 4) get a narrow LLM-shaped pilot for schema discovery (~50 pages, one-time), then go deterministic for the parser.

---

## D5. Two-threshold model on rows -- `is_substantive` and `has_note` are separate booleans

**Decision:** Each row in `community.players` / `community.clans` / `community.tournaments` carries TWO independent boolean flags:

- `is_substantive` (boolean) -- recognition flag. Set when the page has enough structured-field signal to be a "real entity" rather than a typo or placeholder. Drives the L2 corpus reconstruction primer's nick-recognition list.
- `has_note` (boolean) -- markdown-emission flag. Set when the page carries content the row schema cannot capture (prose, quotes, equipment tables, trivia). Drives whether `curated/<type>-notes/<slug>.md` exists.

These are orthogonal. Possible combinations:
- Both true: substantive entity with unique content (Milton, ParadokS).
- Substantive, no note: real entity but page is structured fields only (Crit-tier -- DB row carries everything).
- Not substantive, has note: rare; e.g., Wikipedia-copied prose page with sparse structured fields (Vo0-style).
- Both false: stub (Bomkia-tier). DB row exists for completeness.

**Why:** The original spec's single `has_note` flag conflated two concepts. ~1,500 of ~2,000 "substantive" players on the spec's threshold are actually Crit-tier: structured fields filled, but page body is just lists already in DB rows. Emitting markdown for them produces noise. Decoupling lets DB rows carry recognition for everyone and markdown carry only unique content.

**Implication:** Phase 1 schema has both columns. Phase 2/3/4 parsers compute both flags per page. Phase 6 MCP `lookup_*` tools render profile from rows + (if has_note) markdown body. Phase 7 primer uses `is_substantive=true` to populate the recognition list.

---

## D6. `is_substantive` heuristic -- multi-signal on structured fields

**Decision:** `is_substantive=true` when at least 2 of 5 structured-field signals fire:

- `real_name` non-empty and not `???`
- `aliases` non-empty (from `aka` / `alias` / `ids` / `otheraliases`)
- >= 1 entry in clan history (TH rows or `Clan history` bullet list)
- >= 1 achievement entry
- >= 500 B narrative prose between infobox and `==Achievements==`

The threshold (2 of 5) is the default. Phase 2 first run produces the actual count; operator may tune tighter or looser based on observed quality.

**Why:** Brainstorm pilot validated this heuristic against the `{{Player-stub}}` template tag, which is editorial intent (57% tagged but only ~33% truly empty), not "page is empty". Multi-signal on real fields is the trustworthy gate.

**Implication:** Same heuristic applies to clans (substituting `clan-history` -> `members` if available, etc.). Tournament heuristic TBD post-Phase-4 pilot. The flag is computed at parse time and persisted; not re-derived on read.

---

## D7. `has_note` (prose-content signal) -- v1 rule shipped in Phase 2, tuned in first run

**Decision:** `has_note=true` when the page carries content the row schema cannot represent. Phase 2 ships a v1 rule and runs it; operator inspects the output and tunes once. The v1 rule is intentionally NOT pre-locked here -- it is implementation-detail of the parser, refined empirically.

**Starting v1 rule (Phase 2 may adjust before first run):** `has_note=true` if any of:
- >= 500 B narrative prose between infobox and the first `==<section>==` heading
- Page contains a non-trivial Quotes / Trivia section (non-`???` content)
- Page contains an equipment / settings template (Mouse settings, Crosshair, etc.)
- Page contains gallery / media embeds beyond a single image
- Page is Wikipedia-copied prose body with sparse structured fields (catches Vo0-style outliers)

**Why:** Defining prose-content signals precisely up front risks lock-in to rules that don't match what the corpus actually contains. The brainstorm pilot didn't sample by content-uniqueness; the parser's first run is the empirical source of truth. Tuning once after first run is cheaper than guessing twice.

**Implication:** Phase 2 verification reports BOTH counts: `is_substantive=true` count and `has_note=true` count. Operator eyeballs the note count, samples emitted notes, signs off or asks to tune. Phase 3 reuses the tuned rule shape for clans; Phase 4 lands its own rule post-pilot.

---

## D8. Active-year priority -- `min(spawned, foundquake, earliest TH/achievement year)`

**Decision:** `community.players.active_year_start` is `min(spawned, foundquake, earliest TH year, earliest achievement year)`. `birth_date` is **ignored** for active-year computation. `active_year_end` is null when status is Active or unknown; otherwise it is set to the latest year with a TH row or achievement.

**Why:** Birth date conflates "born then" with "started playing then" -- the wiki has both, and the latter is what L2 corpus reconstruction needs (when did this nick start showing up in chat?). Multiple structured fields touch the year question; minimum across them is the closest the wiki gives us to "first appearance."

**Implication:** Phase 2 parser implements this priority deterministically. Disagreements between fields are not surfaced as warnings; the minimum just wins. If all four signals are absent, `active_year_start` is null.

---

## D9. Tournament schema is genuinely TBD -- Phase 4 pilot drives final shape

**Decision:** `community.tournaments` ships in Phase 1 with a placeholder column set (slug, title, has_note, is_substantive, source_template, source_categories, wiki_revision_id, wiki_fetched_at). The tournament-specific columns (parent_series, season_number, year, mode, format, prize_pool, organizer, dates, status) are **NOT** added in Phase 1. They are added in Phase 4 after the pilot surfaces template variants.

**Why:** Tournaments were not pilot'd in the brainstorm. The wiki has ~700-900 tournament pages with overlap, and template variants are unknown. Pre-committing column names risks 30% of fields being wrong or missing. Phase 4's pilot (~50 stratified pages) drives the final schema, then a migration adds the columns and the parser runs.

**Implication:** Phase 1 migration creates `community.tournaments` minimally. Phase 4 ships a second migration (009 or later) that adds the tournament-specific columns. The two-step migration is intentional -- Phase 1 unblocks the schema-rename / curated-folder reframe without committing tournament shape.

---

## D10. `source` column on cross-link tables -- additive xantom merge

**Decision:** `community.player_clan_eras` and `community.tournament_results` carry a `source TEXT NOT NULL` column with values:

- Era table: `'wiki_TH'` (from Achievement-table TH rows), `'wiki_bullet'` (from Clan-history bullet list), `'tournament-archive'` (future xantom merge), `'manual'`.
- Results table: `'wiki_achievement'`, `'wiki_TH'`, `'tournament-archive'`, `'manual'`.

**Why:** xantom's tournament-site database archive is a future arc that will land additively. Without `source`, a re-merge silently overwrites wiki rows; with it, conflicts surface as multiple rows per (player, tournament) tuple, and human review picks the canonical entry.

**Implication:** Phase 5 backfill writes `source='wiki_*'` on every row it produces. Future xantom-merge arc writes `source='tournament-archive'`. MCP tools that surface these rows can filter by source or render all sources side-by-side.

---

## D11. Per-type MCP tools for v1 -- `search_players`, `search_clans`, `search_tournaments`

**Decision:** Phase 6 ships per-type MCP tools mirroring the existing L1 entity-tool shape:

- `search_players(query, limit)` / `lookup_player(slug)` / `get_player_note(slug)`
- `search_clans(query, limit)` / `lookup_clan(slug)` / `get_clan_note(slug)`
- `search_tournaments(query, limit)` / `lookup_tournament(slug)` / `get_tournament_note(slug)`
- `lookup_by_nick(nick, limit)` -- cross-type alias resolution (returns all entities matching the nick across players + clans).

A unified `search_curated(type, query)` tool is **not** in v1 scope. It is a follow-up arc.

**Why:** Per-type tools match the existing L1 surface (search_entities + search_concepts + search_solved_issues). Operators (and Claude consumers) discover the right tool by name. Unification can come later without breaking v1 callers.

**Implication:** Phase 6 ships ~9 new tools. Each one mirrors the response shape of its L1 sibling (rows, snippet, match_quality). `lookup_by_nick` is the new shape -- joins across players + clans on alias arrays.

---

## D12. Snapshot directory is permanent -- commit policy decided in Phase 0

**Decision:** Wiki snapshots live permanently at `apps/qw-oracle/data/wiki-snapshots/<YYYY-MM-DD>/`. The 2026-05-04 snapshot is the first; future re-scrapes are sibling dated directories.

Phase 0 decides whether the snapshot is git-committed or gitignored. Recommended default: commit (compresses to ~10 MB; rarely changes; provides historical record). Operator final call.

**Why:** The snapshot is reusable across future arcs (maps, match reports, xantom-merge). Per-arc re-scraping wastes API calls and produces drift. Permanent storage with date-keyed versions is the standard.

**Implication:** Phase 0 either adds the dir to `.gitignore` or commits the 2026-05-04 contents. Phase 0 also ensures `data/` (the parent) is correctly handled. Future arcs reference snapshots by date, not by "latest" -- explicit version pinning.

---

## D13. ASCII output discipline (project standard, re-stated)

ASCII-only. No emoji. No em-dashes / en-dashes -- use ASCII hyphen-minus. No marketing voice. Code comments explain WHY, not WHAT.

This is enforced because the operator runs `docs-check` style validation and these patterns trigger noise. Re-stated here defensively for drafters who skip CLAUDE.md.

---

## D14. Bun runtime for all scripts (project standard, re-stated)

All scripts run under Bun: parsers, loaders, note-emitters, snapshot-finalize, primer-build. `import.meta.main` guards are valid (Bun-supported). CLI scripts run via `bun scripts/.../index.ts`. Tests use `bun test`.

Same as Arc 1 D2. Re-stated because this arc adds new scripts under `scripts/load-knowledge/` (or a new `scripts/load-community/` subdir, drafter-decided in Phase 1).

---

## D15. Append-only migrations (project standard, re-stated)

New schema additions land as new `db/migrations/<NNN>_<name>.sql` files. Never edit an applied migration. Update `SCHEMA.md` alongside.

This arc's expected migration sequence:
- 008: `community` schema + tables (Phase 1).
- 009: tournament-specific columns (Phase 4 post-pilot).
- 010 (optional): cross-link tables index tuning (Phase 5 if needed).

If a migration number is taken when this arc executes, drafters bump to next free number.

---

## D16. Phase atomicity -- each phase commits a working state

Each phase ends with a commit that leaves the system runnable. If a phase mid-task leaves the system broken, that's a phase-internal concern; phase boundaries must be green.

The phase MD's "Outputs to next phase" section names what's runnable at the end of the phase. Drafters do not write phase MDs that ship in non-working state -- if a phase's natural deliverable is non-working, split the phase.

---

## D17. Verification at every phase boundary

Each phase MD ends with a "Verification" section listing copy-paste commands the operator runs to confirm the phase landed correctly. Verification commands return YES/NO answers, not interpretive prose.

Examples:
- SQL queries with expected row counts (Phase 2: `SELECT count(*) FROM community.players` returns 5903).
- Markdown count probes (Phase 2: `ls apps/qw-oracle/curated/player-notes/ | wc -l` returns the tuned has_note count).
- `bunx tsc --noEmit` for tooling consistency (Phase 1: post-rename, no type errors).
- MCP tool smoke tests (Phase 6: `lookup_player('milton')` returns row + note body).

Operator runs the queries, eyeballs the output, decides whether to proceed to phase N+1. The execution terminal does NOT auto-proceed.

---

## D18. Note frontmatter mirrors row + body for unique prose

**Decision:** Each markdown note's frontmatter is a YAML block mirroring the row's stable fields. The body is the unique-content overlay that the row cannot represent (narrative prose, quotes, settings tables, trivia).

Example player-note frontmatter:

```yaml
---
slug: milton
title: Milton
type: player
display_name: Milton
real_name: Joni Sivula
aliases: []
nationality: Finland
nationality_iso: fi
current_clan: Black Book
active_year_start: 1997
active_year_end: null
status: Active
community_roles: []
source_template: infobox_player
wiki_revision_id: 79062
wiki_fetched_at: 2026-05-04T20:02:42Z
---
```

The body carries everything else (intro paragraph, Mouse-settings table, Crosshair table, Quotes section, Trivia, Media embeds). Achievement and TH lists are NOT duplicated in the body -- they live in `community.tournament_results` and `community.player_clan_eras` rows; MCP tools render them on demand.

**Why:** Frontmatter pins the structured snapshot per row at note-emission time; mismatch detection (Phase 6 MCP retrieval) can flag drift between row and frontmatter. Body avoids duplicating row content -- single source of truth.

**Implication:** Phase 2/3/4 emitters template the frontmatter from the row dict and copy the unique-content body sections from wikitext (lightly converted to markdown). MCP `get_*_note` tools read the body; `lookup_*` tools read the row.

---

## D19. JSONB columns receive JS values, not pre-stringified JSON (project standard, re-stated)

JSONB columns receive JS arrays/objects directly via postgres-js. Do not `JSON.stringify(value)` before binding -- that produces a JSONB string scalar, not a JSON object/array.

Probe `F1.jsonb_columns_not_strings` is the regression gate (defined in `apps/qw-oracle/scripts/load-knowledge/probes/`). New JSONB columns added by this arc (e.g., `aliases TEXT[]` -- actually array, not JSONB; `community_roles TEXT[]` -- same; `source_categories TEXT[]` -- same) are not JSONB by default; they are PostgreSQL arrays. If any column adopts JSONB, the rule applies.

**Implication:** None for the spec'd columns -- all the array-shaped fields are `TEXT[]` arrays. Re-stated defensively in case Phase 4 tournament schema adopts JSONB for prize-pool or rules structure.

---

## D20. Stub flag uses multi-signal heuristic, not template tag

`community.players.is_stub` (and clan equivalent) is computed as `NOT is_substantive` -- the inverse of the multi-signal heuristic in D6. The wiki's `{{Player-stub}}` template tag is editorial intent ("could use more"), not "page is empty."

**Why:** Pilot found 141 of 190 stub-tagged pages had real infobox data. Trusting the tag would mark substantive pages as stubs and lose recognition signal.

**Implication:** Phase 2/3 parsers store both `is_stub` (the inverse of `is_substantive`) and `source_categories` (which includes `Category:Player stubs` if present). Operators querying "show me stubs" use `is_stub=true`, not the category list.

---

*End of decisions. If a future phase needs to override one of these, that override goes here as an amendment with date + reason -- not silently in the phase MD.*
