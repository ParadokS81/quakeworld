# Phase 2 -- Players parser, row load, note emission

> **Drafter checklist:**
> 1. Read `decisions.md` (full). 20 decisions reviewed; D1 / D4 / D5 / D6 / D7 / D8 / D13 / D14 / D15 / D16 / D18 / D20 directly govern this phase. F7 (case-variant pairs intentionally distinct) is an awareness item.
> 2. Read `review-findings.md`. F-numbers F7 (Phase 2/3 awareness) tagged here. F1-F5 resolve in Phase 0. F6 is Phase 4 awareness. F8 is Phase 1 / Phase 5 awareness.
> 3. Read spec sections: "Pilot findings" (template variants + percentages), "Schema -> community.players column list", "Phase decomposition Phase 2 row", "Storage / curated layer reframe".
> 4. Read snapshot manifest + 5 sample player articles spanning template variants:
>    - `articles/Milton.json` -- `{{Infobox player}}` modern (rich infobox + Mouse settings + Crosshair + Achievements template + Quotes + Trivia + YouTube embeds + Gallery).
>    - `articles/ParadokS.json` -- `{{Player-info}}` older (pre-infobox prose intro + `adminof` + bullet-style Clan history + bullet-style Achievements + Quotes).
>    - `articles/Purity.json` -- `{{Player-info}}` with `adminof` + `crewmemberof` + year-grouped clan history + Quotes + See also (substantive, has_note shape).
>    - `articles/Crit.json` -- NO_INFOBOX bullet-prose (`* '''Real name:''' X` shape; substantive, no_note expected).
>    - `articles/Bomkia.json` -- NO_INFOBOX, mostly-empty (`???` placeholders; not substantive, not has_note, stub).
>    - `articles/Acid_(Finnish_Player).json` -- NO_INFOBOX with disambiguator title (substantive, no_note expected).
>    - `articles/Vo0.json` -- pure prose outlier, no infobox, no bullet-prose pattern, Wikipedia-copied body (the prose-fallback case D4 calls out).
> 5. Read the existing concept-notes pipeline as the loader-pattern exemplar:
>    - `apps/qw-oracle/scripts/load-concepts/parse.ts` (gray-matter + pure parse + chunk hash).
>    - `apps/qw-oracle/scripts/load-concepts/upsert.ts` (postgres-js `db.begin` transaction; `tx.json(...)` JSONB binding per D19; idempotent UPSERT with `body_sha256` skip).
>    - `apps/qw-oracle/scripts/load-concepts/index.ts` (CLI walker with `import.meta.main` guard; `loadAllConcepts()` exported for tests).
>    - `apps/qw-oracle/scripts/load-concepts/CLAUDE.md` (loader-pattern docs).
>    The Phase 2 player loader uses the same shape (parse + upsert + CLI) but ships under a new sibling subdirectory `apps/qw-oracle/scripts/load-community/players/` so future entity types (clans Phase 3, tournaments Phase 4) live alongside.
> 6. Read `apps/qw-oracle/shared/db.ts` (single postgres-js client `db`; `closeDb()` exported).
> 7. Read Phase 1's migration 008 source (`apps/qw-oracle/db/migrations/008_community_schema.sql` -- inlined in `phase-1-curated-rename.md` Task 3) for column types, CHECK constraints, and indexes.
> 8. After drafting, dispatch the verification sub-agent (Explore, Sonnet medium) per `phase-template.md` -- brief inlined at the bottom of this file.

---

## Goal

Phase 2 ships the deterministic player extraction pipeline end-to-end: a multi-branch wikitext parser that handles all three template variants (`{{Infobox player}}`, `{{Player-info}}`, NO_INFOBOX bullet-prose) plus a pure-prose fallback (Vo0-style), a row loader that populates `community.players` for every article in `Category:Players`, and a markdown emitter that writes `apps/qw-oracle/curated/player-notes/<slug>.md` for the subset whose `has_note=true`. The phase is the tracer bullet for the whole community-reference arc -- if the parser shape works for ~5,900 players spanning twenty years of editorial drift, Phases 3 (clans) and 4 (tournaments) reuse the same shape with narrower variants. At phase boundary: `community.players` row count equals the size of `Category:Players` in the snapshot (5,903 expected); the curated player-notes directory contains a tuned count of substantive notes; `bunx tsc --noEmit` is clean; the parser test fixtures pass against the five reference articles. Phase 3 (clans) can begin once row counts and emitted-note counts are operator-signed-off.

---

## Inputs from previous phase

- Phase 0 complete: snapshot is finalized at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`. All slash-title articles use the uniform double-underscore slug scheme (no mixed-scheme helper needed). Manifest counts are corrected. Snapshotter committed at `apps/qw-oracle/scripts/snapshot-wiki/snapshot.py`.
- Phase 1 complete: `apps/qw-oracle/curated/` exists with four sibling subdirectories; `concept-notes/` content is moved; `player-notes/` is empty (`.gitkeep` only). Migration 008 is applied; `community.players` exists with all required columns (`slug`, `title`, `display_name`, `aliases TEXT[]`, `real_name`, `nationality`, `nationality_iso`, `current_clan`, `active_year_start INT`, `active_year_end INT`, `status` with CHECK, `community_roles TEXT[]`, `has_note`, `is_substantive`, `is_stub`, `source_template` with CHECK, `source_categories TEXT[]`, `wiki_revision_id BIGINT`, `wiki_fetched_at TIMESTAMPTZ`). Indexes are present (`status`, `nationality_iso`, partial on `is_substantive`).
- `bunx tsc --noEmit` is clean on the post-Phase-1 codebase.
- `DATABASE_URL` is set (operator-side).
- Bun is installed and on PATH.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/load-community/                                  # new top-level loader subdir for Arc community types
apps/qw-oracle/scripts/load-community/CLAUDE.md                         # loader-pattern docs (mirrors load-concepts/CLAUDE.md)
apps/qw-oracle/scripts/load-community/shared/                           # cross-type helpers (slugify, wiki-link parse, year-min)
apps/qw-oracle/scripts/load-community/shared/wiki-types.ts              # shared TypeScript shapes (ParsedTH, ParsedAchievement, etc.)
apps/qw-oracle/scripts/load-community/shared/wiki-text.ts               # generic wikitext helpers (strip refs / images / templates from prose; extract section bodies; resolve `[[Foo|Bar]]` link targets)
apps/qw-oracle/scripts/load-community/shared/wiki-text.test.ts          # bun test
apps/qw-oracle/scripts/load-community/shared/iso-country.ts             # nationality string -> 2-letter ISO map (covers the ~30 distinct nationality strings observed in the wiki)
apps/qw-oracle/scripts/load-community/shared/iso-country.test.ts        # bun test
apps/qw-oracle/scripts/load-community/players/                          # Phase 2 player module
apps/qw-oracle/scripts/load-community/players/parse.ts                  # multi-branch wikitext parser; pure (no IO, no DB)
apps/qw-oracle/scripts/load-community/players/parse.test.ts             # bun test using snapshot articles as fixtures
apps/qw-oracle/scripts/load-community/players/flags.ts                  # is_substantive (D6) + has_note v1 (D7) + is_stub (D20) computation; pure
apps/qw-oracle/scripts/load-community/players/flags.test.ts             # bun test
apps/qw-oracle/scripts/load-community/players/upsert.ts                 # community.players row UPSERT via postgres-js; idempotent
apps/qw-oracle/scripts/load-community/players/upsert.test.ts            # bun test against qw_oracle_test
apps/qw-oracle/scripts/load-community/players/emit-note.ts              # frontmatter + body markdown emitter; writes curated/player-notes/<slug>.md when has_note=true
apps/qw-oracle/scripts/load-community/players/emit-note.test.ts         # bun test
apps/qw-oracle/scripts/load-community/players/index.ts                  # CLI dispatcher: walk snapshot, parse, upsert, emit; supports --dry-run / --limit / --slug
apps/qw-oracle/curated/player-notes/<tuned count>.md                    # markdown notes emitted for has_note=true rows; final count tuned in Task 7
```

The `shared/` subdirectory holds helpers that Phase 3 (clans) and Phase 4 (tournaments) will reuse. `wiki-text.ts` covers the section-body / wiki-link / strip-templates utilities that show up in every branch. `iso-country.ts` is the nationality lookup table -- separate file because it is data-shaped, not logic-shaped.

### Modified

```
apps/qw-oracle/scripts/load-community/CLAUDE.md         # populated in Task 1; not modified later
apps/qw-oracle/SCHEMA.md                                # row-count footnote on community.players ("populated by Phase 2 player loader; expected count 5903 from Category:Players")
```

The `SCHEMA.md` modification is comment-only (a footnote on the existing community.players entry that Phase 1 added). The functional schema is unchanged.

### Deleted

n/a -- no existing files deleted in this phase.

---

## Tasks

### Task 1 -- Create scripts/load-community/ scaffold + CLAUDE.md

**Goal:** Establish the new loader subdirectory with a CLAUDE.md that documents the loader pattern Phases 2/3/4 share. Mirror the shape of `apps/qw-oracle/scripts/load-concepts/CLAUDE.md` so the project structure is symmetric.

**Files:**
- `apps/qw-oracle/scripts/load-community/CLAUDE.md` (created)

**Steps:**

- [ ] Create directory `apps/qw-oracle/scripts/load-community/` (empty so far -- subdirectories follow in Task 2 and beyond).
- [ ] Create `apps/qw-oracle/scripts/load-community/CLAUDE.md` with the following content (full body inlined):

```markdown
# scripts/load-community/

Layer 3 community-reference loader. Walks `apps/qw-oracle/data/wiki-snapshots/<date>/articles/*.json`, parses each article via the per-type parser (`players/parse.ts`, `clans/parse.ts`, `tournaments/parse.ts`), upserts row + (conditionally) markdown note. Each per-type subdirectory ships its own CLI; a shared/ subdirectory holds helpers reused across types.

## Layout

- `shared/wiki-text.ts` -- generic wikitext helpers (strip templates, resolve `[[Foo|Bar]]` links, extract `==Section==` body, normalize whitespace).
- `shared/wiki-types.ts` -- shared TypeScript shapes (ParsedTH, ParsedAchievement, ClanHistoryEntry, etc.) used by all three per-type parsers.
- `shared/iso-country.ts` -- nationality string -> 2-letter ISO code lookup table.
- `players/` -- Phase 2 player loader (parse, flags, upsert, emit-note, CLI).
- `clans/` -- Phase 3 clan loader (added in Phase 3).
- `tournaments/` -- Phase 4 tournament loader (added in Phase 4).

## Loader pattern (per type)

Each per-type subdirectory follows this shape:

- `parse.ts` -- pure parser. Input: raw wikitext + categories. Output: rich `Parsed<Type>` object with structured fields (row data + cross-link inputs for Phase 5). No IO, no DB.
- `flags.ts` -- pure flag computation. Input: parsed object. Output: `{ is_substantive, has_note, is_stub, source_template }`. Heuristic-driven; tunable per D6 / D7.
- `upsert.ts` -- single-row idempotent UPSERT into `community.<type>` via postgres-js. Mirrors the load-concepts pattern: one transaction per slug.
- `emit-note.ts` -- pure markdown emitter. Input: parsed object + flags. Output: `{ slug, body }` written to `curated/<type>-notes/<slug>.md` only when `has_note=true`.
- `<type>.test.ts` -- bun tests using snapshot articles as fixtures (read from `data/wiki-snapshots/<date>/articles/`).
- `index.ts` -- CLI dispatcher: walk snapshot directory, parse each, upsert, emit. Supports `--dry-run` (parse only, no DB / no note write), `--limit N` (cap the count for smoke runs), `--slug <slug>` (single-article rerun).

## Always-on rules

- **Deterministic extraction (D4).** No LLM in the per-page loop. Regex / template-shape matching only. The Phase 4 tournament pilot is the one LLM-shaped task in the arc and is scoped to schema discovery, not parsing.
- **Two outputs per type (D1).** Every article in scope produces a row. Markdown notes are emitted only when has_note=true (D5).
- **Two-threshold flag model (D5).** is_substantive (recognition) and has_note (prose-content) are independent booleans. Do not conflate.
- **Bun runtime (D14).** All scripts run via `bun apps/qw-oracle/scripts/load-community/<type>/index.ts`. Use `import.meta.main` guards on CLI entry points. Tests use `bun test`.
- **Append-only migrations (D15).** New schema work lands as new migrations. This loader does not edit migrations 008+.
- **JSONB binding (D19).** Pass JS values to postgres-js via `tx.json(value as never)` for any JSONB column. The Phase 2/3 row schemas use TEXT[] arrays exclusively (no JSONB), so this rule is dormant for now; restated for Phase 4 awareness if a tournament JSONB column appears post-pilot.
- **Atomic per-slug upsert.** Row + (conditional) note are produced as a single logical unit. The DB UPSERT runs in a transaction; the markdown file write is best-effort outside the transaction (filesystem failure does not roll back the row, but the loader logs it for re-run).
```

**Verification:**
```
ls apps/qw-oracle/scripts/load-community/
# PASS: lists CLAUDE.md
cat apps/qw-oracle/scripts/load-community/CLAUDE.md | head -1
# PASS: "# scripts/load-community/"
```

**Execution mode:** inline -- structural directory creation + CLAUDE.md with full content shipped above; no code synthesis.

---

### Task 2 -- Build shared/ helpers (wiki-text + iso-country + types)

**Goal:** Land the three shared modules that the player parser (Task 3) and the future clan/tournament parsers will reuse. These are pure utilities -- no IO, no DB. Tests validate the helpers against extracted snippets from the reference articles.

**Files:**
- `apps/qw-oracle/scripts/load-community/shared/wiki-types.ts` (created)
- `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts` (created)
- `apps/qw-oracle/scripts/load-community/shared/wiki-text.test.ts` (created)
- `apps/qw-oracle/scripts/load-community/shared/iso-country.ts` (created)
- `apps/qw-oracle/scripts/load-community/shared/iso-country.test.ts` (created)

**Steps:**

- [ ] Author `wiki-types.ts` with TypeScript shapes covering:
  - `WikiArticle` (the snapshot JSON envelope: `title`, `pageid`, `revid`, `timestamp`, `wikitext`, `categories`).
  - `ClanHistoryEntry` -- `{ clan_title: string; clan_slug: string | null; start_year: number | null; end_year: number | null; flag_iso: string | null; source: 'wiki_TH' | 'wiki_bullet' }`. The `clan_slug` is null at parse time (Phase 5 backfill resolves slugs against `community.clans`).
  - `Achievement` -- `{ year: number | null; place: string | null; event_title: string; event_slug: string | null; mode: string | null; team: string | null; team_flag: string | null; additional: string | null; prize: string | null; source: 'wiki_achievement' | 'wiki_TH' }`. `event_slug` null at parse time (Phase 5 resolves).
  - `ParsedTH` -- intermediate shape inside the `{{TH|year-range|clan}}` parser; consumed by `ClanHistoryEntry` builder.
  - `Year` -- branded number type or alias for clarity.
  - `IsoCode` -- branded 2-letter string type or alias.

- [ ] Author `wiki-text.ts` with these exported functions:
  - `extractInfoboxBlock(wikitext: string, templateName: 'Infobox player' | 'Player-info' | 'Infobox clan' | 'Clan-info'): string | null` -- returns the matched `{{<templateName>...}}` body (between the opening and closing braces, balanced for nested templates one level deep) or null if not present. Case-insensitive on the template name (`Infobox Player` and `Infobox player` both match).
  - `parseInfoboxFields(block: string): Record<string, string>` -- splits the infobox body on top-level pipes (respecting one level of `{{...}}` and `[[...]]` nesting) into `key = value` pairs, trims whitespace, returns a string-to-string map. Empty values yield `''` (not omitted from the map).
  - `extractSectionBody(wikitext: string, headingTitle: string): string | null` -- returns the body between `==<headingTitle>==` and the next `==...==` heading (or end of document), case-insensitive on heading. Returns null if heading absent.
  - `stripWikiMarkup(text: string): string` -- normalizes wikitext to plain text: resolves `[[Foo|Bar]]` to `Bar`, resolves `[[Foo]]` to `Foo`, removes `[[Image:flag_xx.gif]]` patterns, removes `<ref>...</ref>`, removes `'''` / `''` emphasis, collapses whitespace runs to single spaces. Used for measuring "narrative prose between infobox and first section heading" for D6/D7 byte-length thresholds.
  - `resolveWikiLink(linkText: string): { target: string; display: string }` -- helper for parsing single `[[Foo|Bar]]` or `[[Foo]]` strings.
  - `extractCategoryNationality(categories: string[]): { nationality: string; iso: string } | null` -- looks for a `Category:<X> Players` entry whose `<X>` resolves via `iso-country.ts`. Returns `{ nationality: 'Finnish', iso: 'fi' }` for `Category:Finnish Players`. Used as nationality fallback when infobox is absent (Vo0 case).
  - `extractFlagIso(text: string): string | null` -- finds the first `[[Image:flag_<iso>.gif]]` pattern and returns the ISO code (e.g., `fi`, `se`, `dk`, `eu`). Returns null if no flag image present.

- [ ] Author `iso-country.ts` with a constant table mapping nationality strings to 2-letter ISO codes:
  ```ts
  export const NATIONALITY_TO_ISO: Record<string, string> = {
    finnish:    'fi',
    swedish:    'se',
    danish:     'dk',
    norwegian:  'no',
    dutch:      'nl',
    english:    'gb',
    british:    'gb',
    'united kingdom': 'gb',
    german:     'de',
    polish:     'pl',
    russian:    'ru',
    american:   'us',
    canadian:   'ca',
    spanish:    'es',
    portuguese: 'pt',
    italian:    'it',
    french:     'fr',
    czech:      'cz',
    slovak:     'sk',
    hungarian:  'hu',
    romanian:   'ro',
    bulgarian:  'bg',
    ukrainian:  'ua',
    austrian:   'at',
    swiss:      'ch',
    belgian:    'be',
    irish:      'ie',
    scottish:   'gb',
    welsh:      'gb',
    icelandic:  'is',
    estonian:   'ee',
    latvian:    'lv',
    lithuanian: 'lt',
    australian: 'au',
    'new zealander': 'nz',
    japanese:   'jp',
    chinese:    'cn',
    korean:     'kr',
    brazilian:  'br',
    argentine:  'ar',
    mexican:    'mx',
    croatian:   'hr',
    serbian:    'rs',
    slovenian:  'si',
    greek:      'gr',
    turkish:    'tr',
    israeli:    'il',
  };
  ```
  Plus reverse lookup `ISO_TO_NATIONALITY` and helpers `nationalityToIso(s: string): string | null` (case-insensitive lookup; returns null for unrecognized) and `isoToNationality(iso: string): string | null`.

  **Why this list:** the entries cover every nationality category observed in the snapshot's category list (`categories.json`) plus a few common variants. The list is intentionally additive -- if the parser encounters a new nationality string at run time, the loader logs a warning and stores `nationality_iso = NULL` for that row; operator can extend the table.

- [ ] Author `wiki-text.test.ts` covering:
  - `extractInfoboxBlock` against Milton's wikitext returns the `{{Infobox player|...}}` body.
  - `extractInfoboxBlock` against ParadokS's wikitext returns the `{{Player-info|...}}` body.
  - `extractInfoboxBlock` against Crit's wikitext returns null (no infobox).
  - `parseInfoboxFields` on Milton's infobox returns a map with `id='Milton'`, `name='Joni Sivula'`, `country='Finland'`, `clan='Black Book'`, `status='Active'`, `spawned='1997'`, `twitch='miltonizer'`.
  - `parseInfoboxFields` on ParadokS's infobox returns a map with `realname='David Larsen'`, `aka=''`, `nationality='Danish'`, `shortnationality='dk'`, `currentclan='Slackers'`, `adminof='[[QuakeWorld.nu]]'`.
  - `parseInfoboxFields` on Purity's infobox returns `aka='Louis, Bartje'`, `adminof` containing 7 link targets, `crewmemberof='[[Challenge Smackdown]] & [[Qwdrama]]'`.
  - `extractSectionBody` against Milton's wikitext for `Achievements` returns the body containing `{{Achievement|year=2026|place=1|...}}` rows.
  - `stripWikiMarkup` against `[[Foo|Bar]] some [[Image:flag_fi.gif]] text` returns `Bar some text`.
  - `resolveWikiLink` against `[[Foo|Bar]]` returns `{ target: 'Foo', display: 'Bar' }`; against `[[Foo]]` returns `{ target: 'Foo', display: 'Foo' }`.
  - `extractCategoryNationality(['Category:Finnish Players', 'Category:Players'])` returns `{ nationality: 'Finnish', iso: 'fi' }`; for `['Category:Players']` only, returns null.
  - `extractFlagIso('[[Image:flag_fi.gif]] Finnish')` returns `fi`.

- [ ] Author `iso-country.test.ts` covering:
  - `nationalityToIso('Finnish')` returns `fi`; `nationalityToIso('finnish')` returns `fi`; `nationalityToIso('Finland')` returns null (Finland is the country name, not the demonym -- the table is keyed by demonym).

  **Note on the country-vs-demonym asymmetry:** the wiki uses both `country=Finland` (Infobox player) and `nationality=Finnish` (Player-info). The parser handles both via a small case-table in parse.ts (Task 3), which canonicalizes country names to demonyms before calling `nationalityToIso`. The country-to-demonym table lives in `iso-country.ts` as `COUNTRY_TO_NATIONALITY` for symmetry.

  **Add the country-to-demonym table to iso-country.ts:**
  ```ts
  export const COUNTRY_TO_NATIONALITY: Record<string, string> = {
    finland: 'finnish',
    sweden: 'swedish',
    denmark: 'danish',
    norway: 'norwegian',
    netherlands: 'dutch',
    'united kingdom': 'british',
    england: 'english',
    germany: 'german',
    poland: 'polish',
    russia: 'russian',
    'united states': 'american',
    usa: 'american',
    canada: 'canadian',
    spain: 'spanish',
    portugal: 'portuguese',
    italy: 'italian',
    france: 'french',
    'czech republic': 'czech',
    czechia: 'czech',
    slovakia: 'slovak',
    hungary: 'hungarian',
    romania: 'romanian',
    bulgaria: 'bulgarian',
    ukraine: 'ukrainian',
    austria: 'austrian',
    switzerland: 'swiss',
    belgium: 'belgian',
    ireland: 'irish',
    iceland: 'icelandic',
    estonia: 'estonian',
    latvia: 'latvian',
    lithuania: 'lithuanian',
    australia: 'australian',
    'new zealand': 'new zealander',
    japan: 'japanese',
    china: 'chinese',
    korea: 'korean',
    brazil: 'brazilian',
    argentina: 'argentine',
    mexico: 'mexican',
    croatia: 'croatian',
    serbia: 'serbian',
    slovenia: 'slovenian',
    greece: 'greek',
    turkey: 'turkish',
    israel: 'israeli',
  };
  export function countryToNationality(country: string): string | null {
    return COUNTRY_TO_NATIONALITY[country.trim().toLowerCase()] ?? null;
  }
  ```

  Tests: `countryToNationality('Finland')` returns `finnish`; `countryToNationality('USA')` returns `american`; `countryToNationality('Atlantis')` returns null.

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/shared/`. All tests pass.
- [ ] Run `cd apps/qw-oracle && bunx tsc --noEmit`. Zero type errors.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/shared/
# PASS: all wiki-text + iso-country tests pass
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: zero type errors
```

**Execution mode:** subagent (Sonnet medium) -- multi-file synthesis with bounded shape: pure functions + lookup tables + test fixtures. Each helper is small and well-specified; isolated subagent context preferred over polluting the executor main thread with three small files plus tests.

---

### Task 3 -- Build players/parse.ts (multi-branch wikitext parser)

**Goal:** Land the central parser. Input: a `WikiArticle` envelope. Output: a rich `ParsedPlayer` object covering row fields + cross-link inputs (clan-history eras + achievement rows for Phase 5). The parser handles all three template branches (`{{Infobox player}}`, `{{Player-info}}`, NO_INFOBOX bullet-prose) plus a pure-prose fallback for outliers (Vo0). Pure -- no IO, no DB.

**Files:**
- `apps/qw-oracle/scripts/load-community/players/parse.ts` (created)

**Steps:**

- [ ] Author `parse.ts` with:

  - The exported shape:
    ```ts
    export interface ParsedPlayer {
      // Identity
      slug: string;                    // article filename minus .json
      title: string;                   // wiki canonical title (incl. parenthetical)
      display_name: string;            // title minus parenthetical
      aliases: string[];               // dedup, case-preserved; from aka/alias/ids/otheraliases + parenthetical disambiguator content

      // Demographic
      real_name: string | null;
      nationality: string | null;      // demonym form (Finnish, Dutch)
      nationality_iso: string | null;  // 2-letter ISO

      // Affiliation
      current_clan: string | null;     // wiki link target (e.g., "Black Book")
      community_roles: string[];       // adminof + crewmemberof + prose-mentioned admin/captain/caster
      status: 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown' | null;

      // Temporal
      active_year_start: number | null;
      active_year_end:   number | null;

      // Provenance
      source_template: 'infobox_player' | 'player_info' | 'bullet_prose' | 'none';
      source_categories: string[];
      wiki_revision_id: number;
      wiki_fetched_at: string;         // ISO 8601 (from snapshot timestamp)

      // Cross-link inputs (consumed by Phase 5)
      clan_history: ClanHistoryEntry[];
      achievements: Achievement[];

      // Body content (consumed by emit-note when has_note=true)
      narrative_intro: string;         // pre-infobox prose paragraph(s); empty string when absent
      info_section_extras: string;     // ==Information== body MINUS the infobox itself (Mouse settings tables, prose, etc.)
      quotes_section: string;          // ==Quotes== body; empty when section absent or `???`
      trivia_section: string;          // ==Trivia== body; empty when absent
      media_section: string;           // ==Media== body (YouTube embeds preserved as wikitext; converted to markdown links by emit-note)
      gallery_section: string;         // ==Gallery== body
      see_also_section: string;        // ==See also== body
      external_links_section: string;  // ==External links== body
      mouse_settings_present: boolean; // any `{{Mouse settings table}}` template found
      crosshair_present: boolean;      // any `{{crosshair table}}` template found
      gallery_image_count: number;     // count of `<gallery>` File: entries
    }
    ```

  - The exported function:
    ```ts
    export function parsePlayer(article: WikiArticle): ParsedPlayer
    ```

  Step-by-step parse flow (the function's body):

  1. **Pre-flight:** compute `slug` from filename (operator passes it in via the calling CLI -- the filename is the deterministic slug from Phase 0's uniform scheme; `parsePlayer` accepts it as part of `WikiArticle.slug`, which the CLI populates from the filename minus `.json`). Update `WikiArticle` shape in `wiki-types.ts` to include `slug: string`.

  2. **Title decomposition:** `title = article.title`. `display_name = title.replace(/\s*\([^)]*\)\s*$/, '').trim()`. Capture the parenthetical content separately as `disambiguator`.

  3. **Template detection:**
     - If `{{Infobox player` matches (case-insensitive) -> `source_template = 'infobox_player'`.
     - Else if `{{Player-info` matches -> `source_template = 'player_info'`.
     - Else if any of the bullet-prose patterns match (`* '''Real name:''' `, `* '''Nationality:''' `, `* '''Current clan:''' ` -- at least 2 of these on distinct lines) -> `source_template = 'bullet_prose'`.
     - Else -> `source_template = 'none'`.

  4. **Branch dispatch:**
     - `infobox_player` -> call `parseInfoboxPlayerBranch(wikitext)`.
     - `player_info` -> call `parsePlayerInfoBranch(wikitext)`.
     - `bullet_prose` -> call `parseBulletProseBranch(wikitext)`.
     - `none` -> call `parseProseFallbackBranch(wikitext)`.

     Each branch returns a partial `ParsedPlayer` shape (the row + cross-link fields the branch can populate). The remaining fields (body sections, flags) are filled by branch-agnostic post-processing.

  5. **Branch: `parseInfoboxPlayerBranch`** (Milton-style):
     - Extract infobox block via `extractInfoboxBlock(wikitext, 'Infobox player')`.
     - `parseInfoboxFields(block)` -> field map.
     - `real_name = fields.name || null`. (Note: `name` in Infobox player is the real-name slot, not the in-game id.)
     - `aliases = splitCsv(fields.ids)` (the `ids` field carries comma-separated aliases). Plus add `fields.id` if it differs from `display_name` (typically equals `display_name`, so drop on equality).
     - `nationality_iso` from `fields.country` -> `countryToNationality(...)` -> `nationalityToIso(...)`. `nationality` is the demonym output of the first lookup.
     - `current_clan = stripWikiLinks(fields.clan)` (resolve the link target if the clan field is a `[[Foo]]` pattern).
     - `status = normalizeStatus(fields.status)` -- map common values: `Active` -> `Active`, `Retired` -> `Retired`, `Inactive` -> `Inactive`, `Quit` -> `Quit`, anything else -> `unknown` (the CHECK constraint accepts this set + null per Phase 1 migration 008).
     - `spawned_year = parseYear(fields.spawned)` (e.g., `1997` -> 1997; null on miss).
     - **Clan history:** parse the `history` field (multi-line content with `{{TH|year-range|clan}}` rows). Each row produces a `ClanHistoryEntry`. Year ranges parse as: `'2024 - Present'` -> `start_year=2024, end_year=null`; `'2007 - 2010'` -> `start_year=2007, end_year=2010`; single year `'2010'` -> `start_year=2010, end_year=2010`. Source: `'wiki_TH'`. The dash character can be ASCII hyphen-minus `-`, em-dash (U+2014), en-dash (U+2013), or figure-dash (U+2012) -- the parser normalizes all of these to ASCII `-` before splitting. (Some wiki articles use Unicode dashes despite our project's ASCII discipline; we handle them at parse time. The phase MD itself stays ASCII-only per D13 -- the Unicode codepoints above are referenced by codepoint, not by literal character.) `clan_title` is the second pipe segment of the TH template; `flag_iso` is null for TH rows (TH does not carry per-row flag).
     - **Achievements:** parse the `==Achievements==` section. Find every `{{Achievement|...}}` template. Parse fields: `year`, `place`, `event`, `additional`, `mode`, `flag`, `team`, `prize`. Each produces an `Achievement` row with `source: 'wiki_achievement'`, `event_title=event`, `team_flag=flag`, `event_slug=null`.
     - `community_roles` -- not present in `Infobox player` schema as a structured field; scan prose for `Co-founder of:`, `Captain:`, `Founder of:`, etc. (See branch-agnostic post-processing.)

  6. **Branch: `parsePlayerInfoBranch`** (ParadokS / Purity / Acid (Finnish Player)-style):
     - Extract infobox block via `extractInfoboxBlock(wikitext, 'Player-info')`.
     - `real_name = fields.realname || null`.
     - `aliases = splitCsv(fields.aka || fields.alias || fields.otheraliases || '')`. Deduplicate against `display_name`.
     - `nationality = fields.nationality` (demonym already, e.g., `Danish`); `nationality_iso = fields.shortnationality || nationalityToIso(nationality) || null`. Lower-case the iso before storing.
     - `current_clan = stripWikiLinks(fields.currentclan)`.
     - `status` -- Player-info does not have a status field. Use `'unknown'` if `currentclan` resolves to a real clan, else `'Quit'` if `currentclan` is the literal string `Quit` or `-` (Acid Finnish case), else `'unknown'`.
     - `community_roles = splitWikiLinks(fields.adminof) ++ splitWikiLinks(fields.crewmemberof)`. Deduplicate. Strip `[[...]]` to bare text. (`splitWikiLinks` resolves comma-separated `[[Foo|Bar]]` patterns.)
     - **Foundquake:** `parseYear(fields.foundquake)` -> contributes to `active_year_start` priority.
     - **Retired:** `parseYear(fields.retired)` -> if non-null, contributes to `active_year_end` and shifts `status` to `'Retired'`.
     - **Clan history:** Player-info does NOT carry structured TH rows. Clan history lives in a separate `==Clan history==` section as a bullet list (sometimes year-grouped, sometimes flat). Parse via `parseClanHistoryBullets(extractSectionBody(wikitext, 'Clan history'))`. Each bullet line `* [[Image:flag_xx.gif]] [[ClanName]]` produces a `ClanHistoryEntry` with `clan_title=ClanName`, `flag_iso=xx` (from the image), `source='wiki_bullet'`. Year-grouped lists (Purity-style: `'''2000'''` then bullets) carry `start_year=2000, end_year=2000` per row in that group; flat lists (ParadokS-style: bullets only, no year headings) have `start_year=null, end_year=null`. **Q1 (open question below) -- year-absent rows.**
     - **Achievements:** Player-info articles mostly use bullet-prose achievements (`* [[2007]] - Winner: [[Tournament]] with [[Image:flag_xx.gif]] [[Clan]] - ([[Match report]])`). Parse via `parseAchievementBullets(extractSectionBody(wikitext, 'Achievements'))`. Each bullet attempts to extract `year` (first `[[YYYY]]` link), `place` (textual placement -- "Winner" / "Runner-up" / "1st place" / "Quarterfinalist" / "Semifinalist" / "5th place (tie)" / etc., normalized to a string code), `event_title` (first `[[Tournament]]` link after the year), `team` (clan link after `with`), `team_flag` (flag image preceding the team link). Source: `'wiki_achievement'`.

  7. **Branch: `parseBulletProseBranch`** (Crit / Bomkia / Acid (Finnish Player)-style):
     - No infobox. Parse the bullet-prose pattern lines. Patterns recognized:
       - `* '''Real name:''' X` (or `'''Realname:'''`) -> `real_name = X` (null if `???` or `??` or empty after strip).
       - `* '''Date of birth:''' X` -> ignored (D8: birth_date excluded).
       - `* '''Born:''' X` -> ignored (variant of birth date).
       - `* '''Nationality:''' [[Image:flag_xx.gif]] Y` -> `nationality = Y, nationality_iso = xx`.
       - `* '''Current clan:''' [[Image:flag_xx.gif]] [[Clan]]` -> `current_clan = Clan` (resolved); if `Quit` or `-` literal -> `current_clan = null, status = 'Quit'`.
       - `* '''Also known as:''' X` (or `'''AKA:'''`, `'''Aliases:'''`, `'''Alias:'''`) -> `aliases = splitCsv(X)`.
       - `* '''Status:''' X` -> `status = normalizeStatus(X)` if present.
       - `* '''Former [[Tournament]] admin'''` (or `'''Former admin of [[X]]'''`) -> add to `community_roles`.
       - `* '''Captain:''' [[Team]]` -> add `community_roles: ['Captain of <Team>']` (or just `'Captain'` if Team is a generic national team string).
       - `* '''Co-founder of:''' [[Foo]]` -> add `community_roles: ['Co-founder of <Foo>']`.
     - **Clan history + achievements:** identical to `parsePlayerInfoBranch`'s extraction (the bullet-list shape is shared between Player-info articles and bullet-prose articles).

  8. **Branch: `parseProseFallbackBranch`** (Vo0-style, ~50-100 articles expected):
     - No infobox, no bullet-prose pattern. Pure prose body.
     - `nationality / nationality_iso` from `extractCategoryNationality(article.categories)` only.
     - `real_name`: scan first paragraph for the pattern `'''<First> <Last>'''` or `'''<First> "<Nick>" <Last>'''`. The `'''` triple-tick is wikitext bold. If found, extract the bold text minus the nick (the nick is identifiable via `display_name`).
     - `aliases`: scan first paragraph for `also goes by the pseudonym '''<Alias>'''` or `also known as '''<Alias>'''` patterns.
     - `current_clan`: null (prose-fallback articles rarely state current clan in machine-readable form).
     - `status`: scan for `retired` / `quit` keywords in the first paragraph; default `'unknown'`.
     - `community_roles`: empty.
     - `clan_history`: empty (prose-fallback articles do not have structured Clan history sections; if a `==Clan history==` section exists with bullets, that branch is reached above via the bullet-prose detection -- prose-fallback is pure prose).
     - `achievements`: extract any bullet list under a `==Notable achievements==` or `==Achievements==` section using a relaxed regex (year + place + event line; Vo0's format `* 1st - CPL World Tour Stop UK 2005 - 1on1 (Sheffield, UK)`). Best-effort; achievements with `event_slug=null` and `mode` extracted from parenthetical.

  9. **Branch-agnostic post-processing (after branch dispatch):**
     - **Aliases dedup + parenthetical capture:** if title has a parenthetical (`Acid (Finnish Player)`), add the parenthetical content split-on-space to aliases (`['Finnish', 'Player']`); but skip generic discriminator words (`Player`, `Clan`, `Team`) from being added. In practice, only nationality-shaped tokens (matching `nationalityToIso`) and freeform alias tokens are added. **Q2 (open question below) -- whether to skip everything in parenthetical for v1.**
     - **community_roles prose scan:** scan the full wikitext for prose patterns matching admin/founder/captain/caster declarations: `'''Co-founder of:''' [[X]]`, `'''Founder:''' [[X]]`, `'''Captain:''' [[X]]`, `'''Founder of [[X]]''' clan`, `[[X|admin]]`, `caster for [[Y]]`. Append matches to `community_roles`. Deduplicate against branch-extracted roles.
     - **Body sections extraction (always run regardless of branch):**
       - `narrative_intro`: ALL prose paragraphs that appear BEFORE the first `==<Section>==` heading, EXCLUDING the infobox template body itself. Concretely: take the article wikitext, find the first `==<heading>==` line, slice everything before it, remove any `{{Infobox player|...}}` / `{{Player-info|...}}` block (their fields are already extracted), then call `stripWikiMarkup` on the remainder. The result is the lead paragraph(s) regardless of whether they sit before or after the infobox in source order. D6/D7's "narrative prose" byte-length signal reads this field. Captures: Milton's "Joni Sivula, hailing from Finland..." paragraph (post-infobox, pre-`==Information==`), ParadokS's "Legendary Danish player..." paragraph (pre-infobox), Crit's "brief introduction" (pre-bullet-list, very short), Vo0's entire prose body (pre-first-section).
       - `info_section_extras`: `==Information==` body minus any infobox template that appears inside it (some Player-info articles place their infobox inside the Information section). Captures the Mouse settings tables, Crosshair tables, post-infobox bullet lines like Purity's "Captain: Dutch National Team" line. Used by emit-note.ts as a body section, NOT by flags.ts as a substantive-prose signal (D6 reads narrative_intro only -- info_section_extras is largely structured-template content, not prose).
       - `quotes_section`: `==Quotes==` body. If body is `??` or `???` or empty after strip, set to empty string.
       - `trivia_section`: `==Trivia==` body.
       - `media_section`: `==Media==` body.
       - `gallery_section`: `==Gallery==` body.
       - `see_also_section`: `==See also==` body.
       - `external_links_section`: `==External links==` body.
     - **Equipment/media probes:**
       - `mouse_settings_present`: search the wikitext for `{{Mouse settings table` (case-insensitive).
       - `crosshair_present`: search for `{{crosshair table` (case-insensitive).
       - `gallery_image_count`: count `File:` lines inside `<gallery>...</gallery>` blocks.
     - **active_year_start (D8):**
       Compute `min(spawned_year, foundquake_year, earliest_TH_year, earliest_achievement_year)` ignoring nulls. If all nulls -> null. **birth_date is ignored.**
     - **active_year_end:**
       If `status == 'Active'` -> null.
       Else compute `max(latest_TH_year_with_end, latest_achievement_year)` -- the latest year with any structured trail. Null if no trail.
     - **wiki_revision_id, wiki_fetched_at:** from the article envelope (`revid`, `timestamp`).

  10. **Return the assembled `ParsedPlayer` object.**

- [ ] Add helpers used inside `parse.ts` either inline (private to the file) or in `wiki-text.ts` if shared with future clan/tournament parsers:
  - `splitCsv(s: string): string[]` -- splits on `,`, trims, filters empty / `???` / `??`.
  - `splitWikiLinks(s: string): string[]` -- splits a string of `[[A]], [[B|C]]` on commas, then resolves each link to its display.
  - `parseYear(s: string): number | null` -- extracts the first 4-digit year-like number from a string (also handles `[[1997]]` link form).
  - `parseTHRow(row: string): ParsedTH | null` -- parses a single `{{TH|year-range|clan}}` template body.
  - `parseAchievementTemplate(template: string): Achievement | null` -- parses a single `{{Achievement|...}}` template body.
  - `normalizeStatus(s: string | undefined): 'Active' | 'Retired' | 'Inactive' | 'Quit' | 'unknown'`.
  - `normalizeDash(s: string): string` -- replaces unicode dashes with ASCII hyphen-minus.

  Where these helpers go (parse.ts vs shared/wiki-text.ts) is a subagent decision driven by reusability: clan parser (Phase 3) needs `splitWikiLinks`, `parseYear`, `normalizeDash`; it does NOT need `parseTHRow`, `parseAchievementTemplate`, `normalizeStatus`. Lift the first three to shared/, keep the rest in parse.ts.

- [ ] Run `cd apps/qw-oracle && bunx tsc --noEmit`. Zero type errors.

**Verification:**
```
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: zero type errors
```

(Functional verification deferred to Task 4's tests.)

**Execution mode:** subagent (Sonnet MAX) -- the parser is the central technical risk of the whole arc. Three template branches plus prose fallback plus post-processing plus active-year priority plus dash normalization plus alias dedup is multi-axis judgment work, and getting it wrong silently corrupts ~5,900 rows downstream. Sonnet MAX preferred over Sonnet medium to absorb the breadth of branch-cross-cutting concerns; Opus MAX is overkill (this is implementation, not architecture).

---

### Task 4 -- Build players/parse.test.ts (fixture-based parser tests)

**Goal:** Validate `parsePlayer` against the five reference articles spanning all template branches plus the prose-fallback outlier. Fixture loading reads from the snapshot directory directly (no copy).

**Files:**
- `apps/qw-oracle/scripts/load-community/players/parse.test.ts` (created)

**Steps:**

- [ ] Author `parse.test.ts`. Each test reads the corresponding snapshot JSON via `readFileSync` + `JSON.parse`, calls `parsePlayer`, asserts on key fields. Tests:

  - **Milton (`{{Infobox player}}`):**
    ```
    expect(parsed.source_template).toBe('infobox_player');
    expect(parsed.real_name).toBe('Joni Sivula');
    expect(parsed.nationality).toBe('Finnish');
    expect(parsed.nationality_iso).toBe('fi');
    expect(parsed.current_clan).toBe('Black Book');
    expect(parsed.status).toBe('Active');
    expect(parsed.aliases).toContain('Milton'); // also satisfied if id == display_name and dedup drops it; verify the actual semantics in the helper
    expect(parsed.active_year_start).toBe(1997);  // spawned year
    expect(parsed.active_year_end).toBeNull();    // status=Active
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(13);
    expect(parsed.clan_history[0].clan_title).toBe('Black Book');
    expect(parsed.clan_history[0].start_year).toBe(2024);
    expect(parsed.clan_history[0].end_year).toBeNull();   // "Present"
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(80);
    expect(parsed.mouse_settings_present).toBe(true);
    expect(parsed.crosshair_present).toBe(true);
    expect(parsed.gallery_image_count).toBe(3);
    expect(parsed.quotes_section.length).toBeGreaterThan(0);
    expect(parsed.trivia_section).toContain('kenya.bsp');
    ```

  - **ParadokS (`{{Player-info}}`):**
    ```
    expect(parsed.source_template).toBe('player_info');
    expect(parsed.real_name).toBe('David Larsen');
    expect(parsed.nationality).toBe('Danish');
    expect(parsed.nationality_iso).toBe('dk');
    expect(parsed.current_clan).toBe('Slackers');
    expect(parsed.community_roles).toContain('QuakeWorld.nu');
    expect(parsed.aliases.length).toBe(0); // aka was empty
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(7);  // bullet-prose Clan history
    expect(parsed.clan_history[0].source).toBe('wiki_bullet');
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(40);
    expect(parsed.narrative_intro.length).toBeGreaterThan(100);    // pre-infobox prose intro present
    expect(parsed.quotes_section.length).toBeGreaterThan(0);
    ```

  - **Purity (`{{Player-info}}` with adminof + crewmemberof + year-grouped clan history):**
    ```
    expect(parsed.source_template).toBe('player_info');
    expect(parsed.real_name).toBe('Alex');
    expect(parsed.aliases).toEqual(expect.arrayContaining(['Louis', 'Bartje']));
    expect(parsed.community_roles.length).toBeGreaterThanOrEqual(7);  // adminof has 7 entries
    expect(parsed.community_roles).toContain('Challenge Smackdown'); // from crewmemberof
    expect(parsed.community_roles).toContain('Captain of Dutch National Team'); // prose post-infobox `'''Captain:''' [[Dutch National Team]]`
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(20);    // year-grouped bullet list
    const era2007 = parsed.clan_history.find((e) => e.start_year === 2007 && e.clan_title.includes('Slackers 2'));
    expect(era2007).toBeDefined();
    ```

  - **Crit (NO_INFOBOX bullet-prose, substantive but no_note expected):**
    ```
    expect(parsed.source_template).toBe('bullet_prose');
    expect(parsed.real_name).toBe('Maarten');
    expect(parsed.nationality).toBe('Dutch');
    expect(parsed.nationality_iso).toBe('nl');
    expect(parsed.current_clan).toBe('Firing Squad');
    expect(parsed.aliases).toContain('Critical');
    expect(parsed.community_roles).toContain('Trickery TDM League'); // 'Former [[Trickery TDM League]] admin'
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(3);
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(13);
    expect(parsed.quotes_section).toBe('');                          // body is `??`
    expect(parsed.mouse_settings_present).toBe(false);
    ```

  - **Bomkia (NO_INFOBOX, mostly empty stub):**
    ```
    expect(parsed.source_template).toBe('bullet_prose');
    expect(parsed.real_name).toBeNull();
    expect(parsed.nationality).toBe('Swedish');
    expect(parsed.nationality_iso).toBe('se');
    expect(parsed.current_clan).toBeNull();      // 'Quit' literal -> null
    expect(parsed.status).toBe('Quit');
    expect(parsed.aliases.length).toBe(0);
    expect(parsed.clan_history.length).toBe(1);  // just Euthanasia
    expect(parsed.achievements.length).toBe(0);  // body is `???`
    expect(parsed.quotes_section).toBe('');
    expect(parsed.narrative_intro.length).toBeLessThan(50); // 'player introduction' placeholder
    ```

  - **Acid (Finnish Player) (NO_INFOBOX with disambiguator title):**
    ```
    expect(parsed.title).toBe('Acid (Finnish Player)');
    expect(parsed.display_name).toBe('Acid');
    expect(parsed.aliases).toEqual(expect.arrayContaining(['Finnish'])); // parenthetical capture; depends on Q2 resolution
    expect(parsed.source_template).toBe('bullet_prose');
    expect(parsed.real_name).toBeNull();         // '??'
    expect(parsed.nationality).toBe('Finnish');
    expect(parsed.nationality_iso).toBe('fi');
    expect(parsed.current_clan).toBeNull();      // '-' literal -> null
    expect(parsed.clan_history.length).toBeGreaterThanOrEqual(3);
    expect(parsed.narrative_intro.length).toBeGreaterThan(100); // famous-Finnish-player prose
    ```

  - **Vo0 (prose fallback, Wikipedia-copied body):**
    ```
    expect(parsed.source_template).toBe('none');
    expect(parsed.real_name).toBe('Sander Kaasjager'); // bold pattern in prose
    expect(parsed.nationality).toBe('Dutch');           // from Category:Dutch Players
    expect(parsed.nationality_iso).toBe('nl');
    expect(parsed.current_clan).toBeNull();
    expect(parsed.aliases).toContain('Vo0');           // 'pseudonym Vo0' phrase OR display_name fallback
    expect(parsed.clan_history.length).toBe(0);        // prose-only, no structured history section
    expect(parsed.achievements.length).toBeGreaterThanOrEqual(20); // ==Notable achievements== bullet list
    expect(parsed.narrative_intro.length).toBeGreaterThan(500);    // long Wikipedia-copied prose body
    ```

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/players/parse.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/players/parse.test.ts
# PASS: all assertions pass for all 7 fixture articles
```

**Execution mode:** subagent (Sonnet medium) -- mechanical test authoring shaped by 7 well-defined fixture cases. The reasoning is in the assertions (which fields land where for each variant), not in the test plumbing. Sonnet medium is sufficient.

---

### Task 5 -- Build players/flags.ts (is_substantive + has_note + is_stub)

**Goal:** Land the flag-computation module that consumes `ParsedPlayer` and returns `{ is_substantive, has_note, is_stub, source_template }`. Per D5 / D6 / D7 / D20, `is_substantive` is multi-signal (>=2 of 5), `has_note` is the v1 prose-content rule (tunable in Task 8), `is_stub` is `NOT is_substantive`.

**Files:**
- `apps/qw-oracle/scripts/load-community/players/flags.ts` (created)

**Steps:**

- [ ] Author `flags.ts` with:

  ```ts
  export interface PlayerFlags {
    is_substantive: boolean;
    has_note:       boolean;
    is_stub:        boolean;
    // source_template passes through from ParsedPlayer; exported here for symmetry
    source_template: ParsedPlayer['source_template'];
  }

  export function computePlayerFlags(p: ParsedPlayer): PlayerFlags {
    // is_substantive (D6): >=2 of 5 structured-field signals.
    const hasRealName     = p.real_name !== null && p.real_name.trim() !== '' && p.real_name.trim() !== '???' && p.real_name.trim() !== '??';
    const hasAliases      = p.aliases.length > 0;
    const hasClanHistory  = p.clan_history.length >= 1;
    const hasAchievements = p.achievements.length >= 1;
    const hasProse500     = p.narrative_intro.length >= 500;

    const substantiveSignals =
      Number(hasRealName) +
      Number(hasAliases) +
      Number(hasClanHistory) +
      Number(hasAchievements) +
      Number(hasProse500);

    const is_substantive = substantiveSignals >= 2;

    // has_note v1 (D7): page carries content the row schema cannot represent.
    // Tunable -- Task 8 inspects Phase 2 first-run output and may adjust.
    const hasUniqueProse =
      p.narrative_intro.length >= 500 ||                                // significant intro paragraph
      (p.quotes_section.length > 0 && p.quotes_section !== '???') ||    // non-trivial Quotes section
      p.trivia_section.length > 0 ||
      p.mouse_settings_present ||
      p.crosshair_present ||
      p.gallery_image_count > 1 ||
      p.media_section.length > 0;

    const has_note = hasUniqueProse;

    // is_stub (D20): inverse of is_substantive. Multi-signal heuristic, not the wiki's
    // {{Player-stub}} template tag (the tag is editorial intent, not "page is empty").
    const is_stub = !is_substantive;

    return {
      is_substantive,
      has_note,
      is_stub,
      source_template: p.source_template,
    };
  }
  ```

- [ ] Author `flags.test.ts` covering:
  - Milton -> `{ is_substantive: true, has_note: true, is_stub: false }` (5/5 signals; mouse settings + crosshair + media + trivia = unique prose).
  - ParadokS -> `{ is_substantive: true, has_note: true, is_stub: false }` (4/5 signals: real_name, clan_history, achievements, narrative_intro; quotes section).
  - Purity -> `{ is_substantive: true, has_note: true, is_stub: false }` (5/5 signals).
  - Crit -> `{ is_substantive: true, has_note: false, is_stub: false }` (4/5 signals: real_name, aliases, clan_history, achievements; but no narrative_intro >= 500, no quotes/trivia, no mouse/crosshair, no media -- the canonical "row carries everything" case from D5).
  - Bomkia -> `{ is_substantive: false, has_note: false, is_stub: true }` (1/5 signals: clan_history only; no narrative; no quotes/trivia).
  - Acid (Finnish Player) -> assert `{ is_substantive: true, is_stub: false }` (2/5 signals guaranteed: clan_history >= 1 + achievements >= 1; narrative_intro byte-length is the third candidate but its value depends on the actual stripped length of the article's prose intro). The `has_note` flag is NOT pinned in this test -- the intro paragraph is short enough that its post-strip byte length sits near the 500 B threshold and could fall on either side. The test author measures the actual stripped length during implementation and pins `has_note` to whichever value the parser produces; both are acceptable for v1 and the operator-driven Task 9 tuning will adjust the threshold if this case turns out to be a false positive or false negative on inspection.
  - Vo0 -> `{ is_substantive: true, has_note: true, is_stub: false }` (signals: achievements, narrative_intro >= 500 -> 2/5; has_note via narrative_intro).

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/players/flags.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/players/flags.test.ts
# PASS: all flag assertions pass
```

**Execution mode:** subagent (Sonnet medium) -- well-specified pure logic with deterministic test assertions. The judgment is in the assertion expectations against fixture data; the implementation is mechanical.

---

### Task 6 -- Build players/upsert.ts (community.players row UPSERT) + tests

**Goal:** Land the row UPSERT that consumes `ParsedPlayer` + `PlayerFlags` and writes to `community.players`. Idempotent: re-running on the same article produces the same row; ON CONFLICT DO UPDATE for changed fields. One transaction per slug.

**Files:**
- `apps/qw-oracle/scripts/load-community/players/upsert.ts` (created)
- `apps/qw-oracle/scripts/load-community/players/upsert.test.ts` (created)

**Steps:**

- [ ] Author `upsert.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/players/upsert.ts
  //
  // Atomic per-slug UPSERT into community.players. Idempotent.
  // postgres-js arrays bind directly via tx.array(...) -- TEXT[] columns
  // receive JS arrays. JSONB rule (D19) does NOT apply: this row schema has
  // no JSONB columns (aliases / community_roles / source_categories are all
  // TEXT[] PostgreSQL arrays).

  import { db } from '../../../shared/db.ts';
  import type { ParsedPlayer } from './parse.ts';
  import type { PlayerFlags } from './flags.ts';

  export async function upsertPlayer(p: ParsedPlayer, f: PlayerFlags): Promise<void> {
    await db.begin(async (tx) => {
      await tx`
        INSERT INTO community.players (
          slug, title, display_name, aliases, real_name,
          nationality, nationality_iso, current_clan,
          active_year_start, active_year_end, status,
          community_roles, has_note, is_substantive, is_stub,
          source_template, source_categories, wiki_revision_id, wiki_fetched_at
        ) VALUES (
          ${p.slug}, ${p.title}, ${p.display_name}, ${p.aliases}, ${p.real_name},
          ${p.nationality}, ${p.nationality_iso}, ${p.current_clan},
          ${p.active_year_start}, ${p.active_year_end}, ${p.status},
          ${p.community_roles}, ${f.has_note}, ${f.is_substantive}, ${f.is_stub},
          ${f.source_template}, ${p.source_categories}, ${p.wiki_revision_id}, ${p.wiki_fetched_at}
        )
        ON CONFLICT (slug) DO UPDATE SET
          title             = EXCLUDED.title,
          display_name      = EXCLUDED.display_name,
          aliases           = EXCLUDED.aliases,
          real_name         = EXCLUDED.real_name,
          nationality       = EXCLUDED.nationality,
          nationality_iso   = EXCLUDED.nationality_iso,
          current_clan      = EXCLUDED.current_clan,
          active_year_start = EXCLUDED.active_year_start,
          active_year_end   = EXCLUDED.active_year_end,
          status            = EXCLUDED.status,
          community_roles   = EXCLUDED.community_roles,
          has_note          = EXCLUDED.has_note,
          is_substantive    = EXCLUDED.is_substantive,
          is_stub           = EXCLUDED.is_stub,
          source_template   = EXCLUDED.source_template,
          source_categories = EXCLUDED.source_categories,
          wiki_revision_id  = EXCLUDED.wiki_revision_id,
          wiki_fetched_at   = EXCLUDED.wiki_fetched_at
      `;
    });
  }
  ```

  **Notes on postgres-js array binding:** postgres-js binds JS arrays of strings directly to PostgreSQL `TEXT[]` columns via the parameterized query mechanism. No wrapper helper is required for plain TEXT[] arrays -- the driver handles the protocol-level array encoding. The `tx.json(...)` wrapper is for JSONB columns only (D19); none of the columns above are JSONB.

  **First TEXT[] usage in the project -- empirical verification gate.** The prior load-knowledge / load-concepts code uses JSONB and scalar TEXT only; this is the first TEXT[] schema in the codebase. The `upsert.test.ts` (Test 3 in this task) is the empirical gate: it inserts a row with a multi-element aliases array and asserts the column reads back as a Postgres TEXT[] (e.g., `aliases @> ARRAY['Critical']::text[]` returns true; `array_length(aliases, 1) = 1` for single-element). If postgres-js silently coerces JS arrays to text scalars in the project's configuration, Test 3 fails immediately and the upsert author switches to an explicit array-binding helper (postgres-js exposes `sql.array(value, oid)` for explicit type tagging when the default fails). Do NOT proceed past Task 6 until Test 3 passes.

- [ ] Author `upsert.test.ts` against `qw_oracle_test`:
  - Test 1: insert a fresh player; row appears with all fields populated.
  - Test 2: re-insert the same player with one field changed; row updates idempotently.
  - Test 3 (TEXT[] binding gate): insert a player with `aliases = ['Critical', 'Crit2', 'Maarten']` and `community_roles = ['Trickery TDM League admin']`. Read back via `SELECT aliases, community_roles, array_length(aliases, 1), aliases @> ARRAY['Critical']::text[] FROM community.players WHERE slug = $1`. PASS condition: `array_length` returns 3, `@>` returns TRUE, the JS-side `aliases` value is a JS string array of length 3 with the expected elements. FAIL condition: `array_length` returns NULL or 1 (driver coerced to scalar); the JS-side value is a string like `'{Critical,Crit2,Maarten}'` (string scalar). On FAIL, the upsert author switches to `sql.array(value, OID)` explicit binding and re-runs.
  - Test 4: insert with empty aliases array -> column reads back as `array_length(aliases, 1) IS NULL` (Postgres convention for empty array length) AND `aliases = ARRAY[]::text[]`. Not NULL -- a null aliases column would indicate the upsert bound `null` instead of an empty array.
  - Test 5: insert with status = 'Active' -> CHECK passes; status = 'BogusValue' -> CHECK rejects (the failed insert throws inside `db.begin`; assert the throw and assert the row is absent post-rollback).
  - Test 6 (F7 awareness): insert two players with slug case-distinct (`Acid` and `acid`) -> both rows persist (case-sensitive PK; F7 awareness). `SELECT count(*) FROM community.players WHERE LOWER(slug) = 'acid'` returns 2.

  Tests use a per-test transaction wrapper that ROLLBACKs at the end so the test DB is not polluted. The test file refuses to run unless `process.env.PGDATABASE === 'qw_oracle_test'` (mirrors the `load-concepts/upsert.test.ts` guard).

- [ ] Run `PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/players/upsert.test.ts`. All tests pass.

**Verification:**
```
PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/players/upsert.test.ts
# PASS: 5 upsert tests pass
```

**Execution mode:** subagent (Sonnet medium) -- postgres-js INSERT + ON CONFLICT DO UPDATE synthesis with array-binding semantics + test authoring. The shape mirrors the established `load-concepts/upsert.ts`; the work is calibration to the new column set.

---

### Task 7 -- Build players/emit-note.ts (markdown note emitter) + tests

**Goal:** Land the markdown-note emitter that consumes `ParsedPlayer` + `PlayerFlags` and writes `apps/qw-oracle/curated/player-notes/<slug>.md` only when `has_note=true`. Frontmatter mirrors the row's stable fields per D18; body carries the unique-content overlay (intro prose, mouse settings, crosshair, quotes, trivia, media, gallery, see also, external links). Achievements + clan history are NOT duplicated in the body (those live in cross-link tables; MCP tools render on demand per D18).

**Files:**
- `apps/qw-oracle/scripts/load-community/players/emit-note.ts` (created)
- `apps/qw-oracle/scripts/load-community/players/emit-note.test.ts` (created)

**Steps:**

- [ ] Author `emit-note.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/players/emit-note.ts
  //
  // Markdown emitter for has_note=true players. Frontmatter mirrors the row's
  // stable fields (D18); body carries the unique-content overlay.
  //
  // Pure: takes a ParsedPlayer + flags, returns the markdown string. The CLI
  // writes the file. Tests assert on the string.

  import type { ParsedPlayer } from './parse.ts';
  import type { PlayerFlags } from './flags.ts';

  export function buildNoteMarkdown(p: ParsedPlayer, f: PlayerFlags): string {
    const fm = buildFrontmatter(p, f);
    const body = buildBody(p);
    return `---\n${fm}\n---\n\n${body}`;
  }

  function buildFrontmatter(p: ParsedPlayer, f: PlayerFlags): string {
    // YAML-formatted; arrays as flow style for compactness; null as empty value.
    const yamlEscape = (s: string | null) => {
      if (s === null) return '';
      // Quote strings with special chars; otherwise emit bare.
      if (/[:\-#\[\]{}|>!&*?,\n"']/.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
        return `"${s.replace(/"/g, '\\"')}"`;
      }
      return s;
    };
    const yamlArray = (xs: string[]) => `[${xs.map(yamlEscape).join(', ')}]`;

    const lines: string[] = [
      `slug: ${p.slug}`,
      `title: ${yamlEscape(p.title)}`,
      `type: player`,
      `display_name: ${yamlEscape(p.display_name)}`,
      `real_name: ${yamlEscape(p.real_name)}`,
      `aliases: ${yamlArray(p.aliases)}`,
      `nationality: ${yamlEscape(p.nationality)}`,
      `nationality_iso: ${yamlEscape(p.nationality_iso)}`,
      `current_clan: ${yamlEscape(p.current_clan)}`,
      `active_year_start: ${p.active_year_start ?? ''}`,
      `active_year_end: ${p.active_year_end ?? ''}`,
      `status: ${yamlEscape(p.status)}`,
      `community_roles: ${yamlArray(p.community_roles)}`,
      `source_template: ${f.source_template}`,
      `wiki_revision_id: ${p.wiki_revision_id}`,
      `wiki_fetched_at: ${p.wiki_fetched_at}`,
    ];
    return lines.join('\n');
  }

  function buildBody(p: ParsedPlayer): string {
    const sections: string[] = [];

    if (p.narrative_intro.length > 0) {
      sections.push(p.narrative_intro);
    }
    if (p.info_section_extras.length > 0) {
      sections.push(`## Information\n\n${p.info_section_extras}`);
    }
    if (p.quotes_section.length > 0) {
      sections.push(`## Quotes\n\n${p.quotes_section}`);
    }
    if (p.trivia_section.length > 0) {
      sections.push(`## Trivia\n\n${p.trivia_section}`);
    }
    if (p.media_section.length > 0) {
      sections.push(`## Media\n\n${p.media_section}`);
    }
    if (p.gallery_section.length > 0) {
      sections.push(`## Gallery\n\n${p.gallery_section}`);
    }
    if (p.see_also_section.length > 0) {
      sections.push(`## See also\n\n${p.see_also_section}`);
    }
    if (p.external_links_section.length > 0) {
      sections.push(`## External links\n\n${p.external_links_section}`);
    }

    return sections.join('\n\n');
  }
  ```

  **Wikitext-to-markdown conversion:** the body sections are emitted as wikitext-flavored content (the parser's `narrative_intro` / `*_section` fields contain stripped-but-not-fully-converted text). Light conversion happens here:
  - `[[Foo|Bar]]` -> `Bar` (handled by `stripWikiMarkup` already in parser).
  - `[[Foo]]` -> `Foo`.
  - `<gallery>...</gallery>` -> markdown image list (best-effort; preserves the file names as plain text on image-resolution-failure).
  - `{{#ev:youtube|<id>|300}}` (YouTube embed template) -> `[YouTube video](https://youtube.com/watch?v=<id>)`.
  - Everything else passes through.

  Add helper `wikitextToMarkdown(text: string): string` inside `emit-note.ts` (or in `shared/wiki-text.ts` if Phase 3 needs it -- subagent decision).

- [ ] Author `emit-note.test.ts`:
  - Test 1: Milton's note has frontmatter with `slug: Milton`, `real_name: Joni Sivula`, `nationality: Finnish`, `current_clan: Black Book`, `status: Active`, `active_year_start: 1997`. Body contains `Mouse settings`-shaped content + Quotes section + Trivia section + Media section.
  - Test 2: ParadokS's note frontmatter has `community_roles: [QuakeWorld.nu]`. Body contains the narrative_intro paragraph + Quotes + External links.
  - Test 3: Crit (`has_note=false`) -> `buildNoteMarkdown` is still callable but the CLI does NOT write the file. The CLI logic guards on `f.has_note`. This is tested in the CLI test (Task 8); here we only assert that `buildNoteMarkdown(crit, { has_note: false, ...})` returns a non-empty string (the function does not refuse).
  - Test 4: YAML escaping: a real_name containing `'` (e.g., `O'Brien`) is double-quoted in frontmatter.
  - Test 5: Empty aliases -> frontmatter line `aliases: []`.
  - Test 6: `wikitextToMarkdown` converts `{{#ev:youtube|abc123|300}}` to `[YouTube video](https://youtube.com/watch?v=abc123)`.

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/players/emit-note.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/players/emit-note.test.ts
# PASS: all emit-note tests pass
```

**Execution mode:** subagent (Sonnet medium) -- markdown synthesis from a structured input. The shape is well-defined (frontmatter mirror + body sections); the judgment is in YAML escaping edge cases + wikitext-to-markdown conversion.

---

### Task 8 -- Build players/index.ts (CLI dispatcher)

**Goal:** Land the CLI that walks the snapshot's article directory, filters to `Category:Players`, parses each, computes flags, upserts the row, and (when `has_note=true`) writes the markdown note. Includes `--dry-run`, `--limit N`, and `--slug <slug>` flags. This task is pure CLI synthesis -- no first-run tuning yet; that is Task 9.

**Files:**
- `apps/qw-oracle/scripts/load-community/players/index.ts` (created)

**Steps:**

- [ ] Author `index.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/players/index.ts
  //
  // CLI dispatcher: walk the wiki snapshot, parse each player article, upsert
  // row, conditionally emit markdown note. Flags:
  //   --dry-run           parse only; no DB write, no note write.
  //   --limit N           stop after N articles processed (smoke runs).
  //   --slug <slug>       single-article rerun (for debugging a specific player).
  //   --snapshot <date>   override the default snapshot date (default 2026-05-04).

  import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
  import { resolve, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { closeDb } from '../../../shared/db.ts';
  import { parsePlayer } from './parse.ts';
  import { computePlayerFlags } from './flags.ts';
  import { upsertPlayer } from './upsert.ts';
  import { buildNoteMarkdown } from './emit-note.ts';
  import type { WikiArticle } from '../shared/wiki-types.ts';

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const APP_ROOT  = resolve(__dirname, '..', '..', '..');                    // apps/qw-oracle/
  const NOTES_DIR = resolve(APP_ROOT, 'curated', 'player-notes');

  interface Args {
    dryRun:   boolean;
    limit:    number | null;
    slug:     string | null;
    snapshot: string;
  }

  function parseArgs(): Args {
    const args: Args = { dryRun: false, limit: null, slug: null, snapshot: '2026-05-04' };
    for (let i = 2; i < process.argv.length; i++) {
      const a = process.argv[i];
      if (a === '--dry-run') args.dryRun = true;
      else if (a === '--limit') args.limit = Number(process.argv[++i]);
      else if (a === '--slug') args.slug = process.argv[++i] ?? null;
      else if (a === '--snapshot') args.snapshot = process.argv[++i] ?? '2026-05-04';
    }
    return args;
  }

  function isPlayerArticle(article: WikiArticle): boolean {
    return article.categories.includes('Category:Players');
  }

  export async function loadAllPlayers(args: Args = parseArgs()): Promise<{
    scanned: number; loaded: number; notesWritten: number; skipped: number; warnings: number;
  }> {
    const articlesDir = resolve(APP_ROOT, 'data', 'wiki-snapshots', args.snapshot, 'articles');
    const files = readdirSync(articlesDir).filter((f) => f.endsWith('.json'));

    let scanned = 0, loaded = 0, notesWritten = 0, skipped = 0, warnings = 0;

    for (const f of files) {
      if (args.slug && f !== `${args.slug}.json`) continue;
      const slug = f.replace(/\.json$/, '');
      const fullPath = resolve(articlesDir, f);
      const text = readFileSync(fullPath, 'utf8');
      let raw: unknown;
      try { raw = JSON.parse(text); } catch (e) {
        console.warn(`[load-players] WARN parse-fail ${slug}: ${(e as Error).message}`);
        warnings++;
        continue;
      }
      const article: WikiArticle = { ...(raw as WikiArticle), slug };
      scanned++;

      if (!isPlayerArticle(article)) {
        skipped++;
        continue;
      }

      const parsed = parsePlayer(article);
      const flags  = computePlayerFlags(parsed);

      if (!args.dryRun) {
        await upsertPlayer(parsed, flags);
        loaded++;
        if (flags.has_note) {
          mkdirSync(NOTES_DIR, { recursive: true });
          const md = buildNoteMarkdown(parsed, flags);
          writeFileSync(resolve(NOTES_DIR, `${slug}.md`), md, 'utf8');
          notesWritten++;
        }
      } else {
        loaded++;  // dry-run counts what would have been loaded
        if (flags.has_note) notesWritten++;
      }

      if (args.limit && loaded >= args.limit) break;
    }

    console.log(`[load-players] scanned ${scanned}, loaded ${loaded}, notes ${notesWritten}, skipped ${skipped}, warnings ${warnings}`);
    return { scanned, loaded, notesWritten, skipped, warnings };
  }

  if (import.meta.main) {
    try {
      await loadAllPlayers();
    } finally {
      await closeDb();
    }
  }
  ```

- [ ] Run a smoke test with `--limit 100 --dry-run` to confirm the flow does not error:
  ```
  bun apps/qw-oracle/scripts/load-community/players/index.ts --limit 100 --dry-run
  # Expected: prints "[load-players] scanned 100, loaded N, notes M, skipped K, warnings 0" with N + K = 100 (loaded includes dry-run "would-load" count).
  ```

- [ ] Run a single-slug re-test for each fixture article to confirm parser + emitter wiring:
  ```
  for s in Milton ParadokS Crit Bomkia "Acid_(Finnish_Player)" Vo0 Purity; do
    bun apps/qw-oracle/scripts/load-community/players/index.ts --slug "$s" --dry-run
  done
  # Expected: each prints scanned 1, loaded 1, notes 0 or 1 per the flag matrix from Task 5.
  ```

**Verification:**
```
bun apps/qw-oracle/scripts/load-community/players/index.ts --limit 10 --dry-run
# PASS: prints scanned/loaded/notes counts, exits 0
bun apps/qw-oracle/scripts/load-community/players/index.ts --slug Milton --dry-run
# PASS: prints "scanned 1, loaded 1, notes 1, skipped 0, warnings 0"
```

**Execution mode:** subagent (Sonnet medium) -- well-specified CLI flow with parameterized arg handling, snapshot directory walk, conditional dispatch to upsert + emit-note. Synthesis-shaped; isolated context preferred over polluting the executor main thread.

---

### Task 9 -- First full run + has_note rule tuning + stale-note cleanup

**Goal:** Run the loader against the full snapshot (5903 players), inspect the row + note distributions, sample emitted notes for content quality, tune the `has_note` v1 rule (the one knob in `flags.ts`'s `hasUniqueProse` expression) based on observed precision / recall, re-run the loader, and clean up any stale notes that no longer qualify under the tuned rule.

This task is operator-driven empirical work. The tuning judgment cannot be subagent-delegated because the operator is the source of truth for "is this note genuinely unique content."

**Files:**
- `apps/qw-oracle/scripts/load-community/players/flags.ts` (modified -- thresholds tuned post-first-run)

**Steps:**

- [ ] Run the full first pass (with DB writes + note writes):
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/players/index.ts
  # Expected: scanned ~9173, loaded 5903 (Category:Players count), notes <count>, skipped ~3270, warnings should be 0 or small.
  ```

  Capture the actual `loaded` count (must equal 5903 per spec; if not, investigate -- category miscount or filter logic bug) and `notesWritten` count.

- [ ] Sample 10 random has_note=true notes and 5 has_note=false / is_substantive=true rows for content quality:
  ```sql
  SELECT slug FROM community.players WHERE has_note = TRUE ORDER BY random() LIMIT 10;
  SELECT slug FROM community.players WHERE has_note = FALSE AND is_substantive = TRUE ORDER BY random() LIMIT 10;
  ```

  For each sampled has_note=true slug, open `apps/qw-oracle/curated/player-notes/<slug>.md` and verify the body carries genuinely unique prose / tables / quotes / media the row schema cannot represent. Flag any false positives (notes whose body is empty after stripping or duplicates row content).

  For each sampled has_note=false / is_substantive=true slug, open the source article in the snapshot and confirm the page body genuinely has nothing the row schema misses. Flag any false negatives (articles that should have notes but were skipped).

- [ ] Tune the `has_note` rule in `flags.ts` based on observation:
  - If precision is low (false positives >20% of sample): tighten the rule. Candidate tighteners:
    - require `quotes_section.length >= 30` (filter out single-token `"hi"` quotes),
    - require `narrative_intro.length >= 800` (the 500B threshold may be too lenient),
    - drop the `gallery_image_count > 1` clause if galleries turn out to be auto-generated noise.
  - If recall is low (false negatives >20% of sample): broaden the rule. Candidate broadeners:
    - include `external_links_section.length >= 200` (some articles carry a rich curated link list),
    - include `see_also_section.length >= 50`.
  - The tune is one bounded edit to `flags.ts`'s `hasUniqueProse` expression. Document the tune in a header comment in `flags.ts` referencing the sample observation (precision/recall numbers + which clauses changed and why).

- [ ] Re-run the full pipeline after tuning:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/players/index.ts
  # Expected: same loaded count (5903); notesWritten count adjusted per tune.
  ```

  Notes emitted under v1 but no longer qualifying under v2 are NOT auto-deleted by the loader. Run the stale-removal helper:
  ```
  bun -e '
    const { db, closeDb } = await import("./apps/qw-oracle/shared/db.ts");
    const rows: { slug: string }[] = await db`SELECT slug FROM community.players WHERE has_note = TRUE`;
    const valid = new Set(rows.map((r) => r.slug));
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = "apps/qw-oracle/curated/player-notes";
    let removed = 0;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const slug = f.replace(/\.md$/, "");
      if (!valid.has(slug)) {
        console.log("removing stale:", f);
        fs.unlinkSync(path.join(dir, f));
        removed++;
      }
    }
    console.log("removed", removed, "stale notes");
    await closeDb();
  '
  ```

  Phase 3 / Phase 4 will benefit from a similar idempotent-cleanup helper. After Phase 2, consider lifting the helper to `apps/qw-oracle/scripts/load-community/shared/cleanup-stale-notes.ts`. Phase 2 leaves it inline.

**Verification:**
```
SELECT count(*) FROM community.players;
# PASS: 5903
SELECT count(*) FROM community.players WHERE has_note = TRUE;
# PASS: tuned count (record both pre-tune and post-tune counts in commit message)
ls apps/qw-oracle/curated/player-notes/*.md 2>/dev/null | wc -l
# PASS: equals the has_note=TRUE count above (no stale files)
```

**Execution mode:** inline -- operator-driven empirical work (run, sample, eyeball, edit one rule, re-run, clean up). The judgment is human; the actions are deterministic shell + SQL + a single-clause edit. No code synthesis to delegate.

---

### Task 10 -- Update SCHEMA.md row-count footnote

**Goal:** Update `SCHEMA.md`'s community.players entry (added in Phase 1 Task 4) with the actual loaded row count and a pointer to Phase 2's loader.

**Files:**
- `apps/qw-oracle/SCHEMA.md` (modified)

**Steps:**

- [ ] Locate the `community.players` table entry in `SCHEMA.md` (added in Phase 1 Task 4).
- [ ] Append a "Populated by" + "Count at 2026-05-04 snapshot" footnote line, mirroring the style of existing per-table entries:
  ```
  **Populated by:** `apps/qw-oracle/scripts/load-community/players/index.ts` <- snapshot at `apps/qw-oracle/data/wiki-snapshots/<date>/articles/`.
  **Count at 2026-05-04 snapshot:** 5903 rows (matches Category:Players member count).
  **Notes emitted:** <tuned count> at `apps/qw-oracle/curated/player-notes/`.
  ```
  Use the actual tuned count from Task 8.

**Verification:**
```
grep -A 3 "community.players" apps/qw-oracle/SCHEMA.md | grep "Populated by"
# PASS: line found
```

**Execution mode:** inline -- single-file textual edit with full content shipped above; no synthesis.

---

## Verification (phase boundary)

Run these commands at the end of the phase. Each has a PASS/FAIL condition.

**V1. Phase 1 deliverables are present (pre-flight invariant):**

This is the structural input gate. If any of the four sub-checks fail, Phase 2 has not been started against a valid Phase 1 end-state -- abort and revisit the inputs section before retrying.

```sql
SELECT filename FROM schema_migrations WHERE filename = '008_community_schema.sql';
```
PASS: one row returned.
FAIL: zero rows. Recovery: re-run `bun apps/qw-oracle/db/migrate.ts`.

```
test -d apps/qw-oracle/curated/player-notes && echo present || echo missing
```
PASS: `present`. The Task 8 CLI's `mkdirSync(NOTES_DIR, { recursive: true })` would create the directory at runtime, but Phase 1 is supposed to ship it explicitly with a `.gitkeep`. Missing means Phase 1 did not ship its full deliverable.
FAIL: `missing`. Recovery: revisit Phase 1 Task 1 (the `.gitkeep` placeholder creation step). Do not paper over by letting Phase 2 silently create the directory -- that masks a Phase 1 incompleteness.

```
test -d apps/qw-oracle/curated/concept-notes && echo present || echo missing
```
PASS: `present` AND contains the moved Layer 3 concept-note files.
FAIL: `missing`. Recovery: Phase 1's `git mv` step did not run; do not proceed.

```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0 (Phase 1 left the codebase TypeScript-clean).
FAIL: type errors. Recovery: Phase 1 is incomplete; do not proceed.

**V2. community.players row count matches Category:Players:**
```sql
SELECT count(*) FROM community.players;
```
PASS: 5903.
FAIL: any other count. Recovery: see "Recovery" section below.

**V3. Notes file count matches has_note=true row count:**
```
ls apps/qw-oracle/curated/player-notes/*.md 2>/dev/null | wc -l
```
PASS: equals `(SELECT count(*) FROM community.players WHERE has_note = TRUE)` (record both numbers in the sign-off and confirm equality).
FAIL: counts diverge by >0. Recovery: re-run the stale-removal one-liner from Task 9.

**V4. Source-template distribution matches pilot expectations (within +/-5%):**
```sql
SELECT source_template, count(*)
FROM community.players
GROUP BY source_template
ORDER BY count(*) DESC;
```
PASS: rows show roughly 11% `infobox_player`, 48% `player_info`, 41% `bullet_prose`, with a small `none` tail (Vo0-class, expected ~50-150 rows).
FAIL: distribution is wildly off (e.g., 90% `none` -> branch detection logic is broken).

**V5. Spot-check Milton, ParadokS, Crit, Bomkia, Acid_(Finnish_Player), Vo0, Purity rows:**
```sql
SELECT slug, real_name, nationality, current_clan, status, active_year_start,
       has_note, is_substantive, is_stub, source_template
FROM community.players
WHERE slug IN ('Milton','ParadokS','Crit','Bomkia','Acid_(Finnish_Player)','Vo0','Purity')
ORDER BY slug;
```
PASS: Milton -> `Joni Sivula / Finnish / Black Book / Active / 1997 / true / true / false / infobox_player`. ParadokS -> `David Larsen / Danish / Slackers / unknown / 1999 / true / true / false / player_info` (active_year_start may be 1997 or 1999 depending on whether `foundquake` field was populated; verify against article). Crit -> `Maarten / Dutch / Firing Squad / unknown / 2000 / false / true / false / bullet_prose`. Bomkia -> `null / Swedish / null / Quit / null / false / false / true / bullet_prose`. Acid_(Finnish_Player) -> `null / Finnish / null / unknown / 2002 / has_note depends on intro length / true / false / bullet_prose`. Vo0 -> `Sander Kaasjager / Dutch / null / unknown / 2004 / true / true / false / none`. Purity -> `Alex / Dutch / Slackers / unknown / 1996 / true / true / false / player_info`.

FAIL: any row's key fields diverge from the expected shape. Recovery: re-parse via `--slug <slug> --dry-run`, inspect the parsed object, compare to the article wikitext, fix the parser branch, re-run.

**V6. is_substantive distribution sanity check:**
```sql
SELECT is_substantive, count(*)
FROM community.players
GROUP BY is_substantive;
```
PASS: roughly 1500-2200 rows have `is_substantive = TRUE` (per spec's pilot estimate of 30-35% substantive). The exact number is informational; the failure case is "<500 substantive" or ">3500 substantive" (heuristic miscalibrated).

**V7. has_note distribution + sample inspection:**
```sql
SELECT has_note, count(*)
FROM community.players
GROUP BY has_note;
```
Plus operator samples 10 random has_note=TRUE rows (open the .md file under curated/player-notes/) and 5 random has_note=FALSE / is_substantive=TRUE rows (verify they genuinely have nothing the row schema misses).

PASS: has_note count is the operator-tuned value (recorded in commit). Sample inspection shows >=8 of 10 have_note=TRUE notes carry genuinely unique content (>= 80% precision). Sample inspection shows >=4 of 5 has_note=FALSE / is_substantive=TRUE rows are correctly classified (no major false negatives).
FAIL: precision <70% or false-negative rate >40%. Recovery: re-tune `flags.ts` `hasUniqueProse` rule, re-run, re-sample.

**V8. No stale notes:**
```
comm -23 \
  <(ls apps/qw-oracle/curated/player-notes/*.md | xargs -n 1 basename | sed 's/\.md$//' | sort) \
  <(psql -d $PGDATABASE -At -c "SELECT slug FROM community.players WHERE has_note = TRUE ORDER BY slug")
```
PASS: empty output (every .md file has a corresponding has_note=TRUE row).
FAIL: any output (stale .md). Recovery: run the Task 9 stale-removal one-liner.

**V9. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.
FAIL: type errors -> fix at the file the error points to.

**V10. All Phase 2 tests pass:**
```
bun test apps/qw-oracle/scripts/load-community/
```
PASS: every test in shared/, players/parse.test.ts, players/flags.test.ts, players/emit-note.test.ts passes. The upsert test runs only if `PGDATABASE=qw_oracle_test` is set; otherwise it skips.

**V11. Stub flag is multi-signal heuristic, not template tag (D20 audit):**
```sql
-- Cross-tab: is_stub=TRUE rows that have {{Player-stub}} category vs not.
SELECT is_stub,
       'Category:Player stubs' = ANY(source_categories) AS template_tagged_stub,
       count(*)
FROM community.players
GROUP BY 1, 2
ORDER BY 1, 2;
```
PASS: there exist rows with `is_stub=FALSE` and `template_tagged_stub=TRUE` (the "tagged but not actually empty" pattern from the brainstorm pilot, ~141 of 190 such cases expected). And there exist rows with `is_stub=TRUE` and `template_tagged_stub=FALSE` (genuinely empty pages without the tag).
FAIL: `is_stub` aligns 1:1 with `template_tagged_stub` -> the multi-signal heuristic regressed to the template tag, contradicting D20.

---

## Outputs to next phase

- `community.players` is populated with 5903 rows.
- `apps/qw-oracle/curated/player-notes/` contains the tuned set of has_note=TRUE markdown notes.
- `apps/qw-oracle/scripts/load-community/` exists with the shared/ + players/ subtrees.
- `parse.ts` exports `parsePlayer` whose return type `ParsedPlayer` includes `clan_history: ClanHistoryEntry[]` and `achievements: Achievement[]`. **Phase 5 reuses this parser for cross-link backfill** -- the parser is the canonical source of TH rows + achievement rows for player_clan_eras / tournament_results loading.
- `apps/qw-oracle/SCHEMA.md` documents the row count + note count.
- `bunx tsc --noEmit` is clean.
- All Phase 2 tests pass.
- Phase 3 (clans) can begin. The clan parser will reuse `shared/wiki-text.ts` + `shared/iso-country.ts` + `shared/wiki-types.ts`; the upsert + emit-note shape mirrors players/.

---

## Open questions / deferred items

**Q1. Year-absent clan-history rows. RESOLVED 2026-05-05 by Phase 1 schema amendment.**
- **Original question:** ParadokS-style flat bullet-prose Clan history yields `ClanHistoryEntry` rows with `start_year=null`. Phase 1's original migration made `start_year INT NOT NULL`, which would block insertion.
- **Resolution:** Phase 1 schema amended before execution. `community.player_clan_eras` now uses surrogate `id BIGSERIAL PRIMARY KEY`, nullable `start_year`, new `era_seq INT` column for list-order, and `UNIQUE (player_slug, clan_title, start_year, source)` for idempotency. Year-absent rows (ParadokS-style flat bullet lists) insert faithfully with `start_year=null` + `era_seq=<list_index>`. Phase 5 backfill writes both year-known and year-absent rows; no migration 010 needed; no parser filtering required. See `review-findings.md` F9.
- **What this means for Phase 2 parser:** no change. The parser continues to produce `start_year=null` rows for bullet-list eras. Phase 2 tests still assert ParadokS's clan_history contains null-start_year entries (canonical regression gate). The era_seq value is computed at upsert time (Phase 5) from list position, not by Phase 2.

**Q2. Parenthetical disambiguator -> alias capture rule.**
- **Question:** For `Acid (Finnish Player)`, should the parenthetical content `Finnish Player` add aliases (`Finnish`)? Or is the parenthetical purely a wiki-namespace discriminator (no alias content)?
- **Default chosen for now:** add nationality-shaped tokens (matching `nationalityToIso`) from the parenthetical to aliases; skip generic discriminator tokens (`Player`, `Clan`, `Team`). E.g., `Acid (Finnish Player)` -> aliases gain `Finnish`. `187 (Polish Clan)` is not a player, so not in scope.
- **Who can resolve:** operator at Phase 2 sign-off. If alias capture from parenthetical produces noise (low-precision matches in Phase 6 `lookup_by_nick`), revisit. Low priority.

**Q3. NO_INFOBOX-with-Infobox-comment articles (Crit-style).**
- **Question:** Crit's wikitext contains a commented-out `<!-- {{Infobox Player...}} -->` block at the bottom (operator left a template scaffold for a future edit). The bullet-prose detection takes precedence (the live `* '''Real name:'''` lines fire first). The commented infobox is invisible to `extractInfoboxBlock` because the regex looks for the live `{{...}}` opening, not a commented one. This is correct behavior, but worth flagging as a case the parser handles silently.
- **Default chosen for now:** parser ignores commented-out infobox blocks (commented wikitext is invisible). If a future article has BOTH a live infobox AND a commented one, the live wins.
- **Who can resolve:** n/a -- behavior is correct.

**Q4. Multi-disambiguator clusters (Acid_(Finnish_Player) + Acid_(Polish_Player) + Acid_(Swedish_Player)).**
- **Question:** Three articles share `display_name=Acid` after stripping disambiguators. They are stored as three distinct rows (slug-distinct). Phase 6's `lookup_by_nick('Acid')` will return all three. Is that the right behavior?
- **Default chosen for now:** yes -- multiple rows for the same nick is the recognition signal. Phase 6 surfaces all matches; the consumer picks. F7 (case-variant pairs intentionally distinct) sets the precedent.
- **Who can resolve:** Phase 6 drafter (and operator at sign-off if surfacing all matches turns out to be noisy).

**Q5. Wikitext-to-markdown conversion fidelity.**
- **Question:** YouTube embeds (`{{#ev:youtube|<id>|300}}`) convert to markdown links. But other wiki templates (`{{box|start}}`, `{{Flag/fi}}`, `{{PrizepoolWZ|...}}`, `{{Mouse settings table|...}}`) are emitted as raw wikitext in the markdown body. Phase 6's MCP renderer might want richer conversion (e.g., render `{{Flag/fi}}` as a flag emoji or country name). For Phase 2 v1, raw passthrough is acceptable.
- **Default chosen for now:** raw passthrough for non-YouTube templates. Phase 6 or a follow-up arc adds richer conversion if MCP consumers report rendering problems.
- **Who can resolve:** Phase 6 drafter.

---

## Recovery (if verification fails)

**V2 fails (row count != 5903):**
- If `loaded < 5903`: the category filter `categories.includes('Category:Players')` may be missing edge-case category strings (e.g., a few articles tag `Category:Player` singular). Re-run with `--limit 50 --dry-run` and grep `skipped` reasons. Compare against the snapshot's `categories.json` for the exact member count of `Category:Players`.
- If `loaded > 5903`: the filter is too permissive (some non-player articles are slipping through). Most likely: a clan or tournament article also carries `Category:Players` by editorial mistake. Inspect the diff (DB rows minus expected slugs from `Category:Players` member list).

**V3 fails (note count != has_note count):**
- Run the stale-removal one-liner from Task 8.
- If notes are missing for has_note=TRUE rows, the CLI's writeFileSync may have silently failed mid-run. Re-run the CLI; the loader is idempotent.

**V4 fails (source-template distribution off):**
- Most likely cause: the branch-detection regex is over-matching or under-matching one variant. Sample 20 rows in the over/under-represented branch and inspect the wikitext + the `source_template` assignment.
- Re-run after a parser fix. The DB upsert will overwrite each row's `source_template` field via `ON CONFLICT DO UPDATE`.

**V5 fails (fixture row diverges):**
- Run `bun apps/qw-oracle/scripts/load-community/players/index.ts --slug <slug> --dry-run` and pipe the parsed object to stdout. Compare to the fixture article's wikitext line by line.
- The most common cause is a missing `parseInfoboxFields` edge case (a field with embedded `=`, a multi-line value, etc.).

**V6 fails (is_substantive distribution way off):**
- The 5-signal heuristic is the candidate to revisit. Run a SQL exploration:
  ```sql
  SELECT
    sum(CASE WHEN real_name IS NOT NULL AND real_name <> '' THEN 1 ELSE 0 END) AS has_real_name,
    sum(CASE WHEN array_length(aliases, 1) > 0 THEN 1 ELSE 0 END) AS has_aliases,
    sum(CASE WHEN current_clan IS NOT NULL THEN 1 ELSE 0 END) AS has_clan,
    sum(CASE WHEN active_year_start IS NOT NULL THEN 1 ELSE 0 END) AS has_year
  FROM community.players;
  ```
  Use this distribution to decide if the threshold (>=2 of 5) needs to drop to >=1 of 5 or rise to >=3 of 5. The thresholds are knobs in `flags.ts`.

**V7 fails (has_note precision low):**
- Re-tune the rule per Task 9. The loader is idempotent; re-running rewrites notes to match the new flag values. Stale notes need the cleanup one-liner.

**V11 fails (is_stub == template_tagged_stub):**
- This indicates the parser is using `Category:Player stubs` as a signal in `flags.ts`, contradicting D20. Re-read `flags.ts`'s is_stub computation: it must be `!is_substantive`, NOT a category check. Fix and re-run.

**General fallback:** the loader is idempotent. Re-running after any fix produces the correct end state without data loss. The DB ON CONFLICT DO UPDATE handles row updates; the markdown emitter overwrites files; the stale-removal one-liner handles deletes.

---

## Verification sub-agent dispatch

After drafting the phase MD, the drafter dispatches the following sub-agent. Brief reproduced inline; absolute paths filled in.

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec section relevant to this phase: /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md (sections "Pilot findings" + "Schema -> community.players" + "Phase decomposition Phase 2 row" + "Storage / curated layer reframe").

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - Phase 2 does not introduce any new schema; verify there are no SQL
     migrations in this phase MD. (If the plan mentions `community.players`
     columns, those came from migration 008 in Phase 1; verify against
     the current state of `apps/qw-oracle/db/migrations/008_community_schema.sql`
     -- Phase 1's MD inlines the SQL.)

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` exists.
   - For sample articles cited (Milton.json, ParadokS.json, Crit.json,
     Bomkia.json, Vo0.json, Purity.json, Acid_(Finnish_Player).json),
     spot-check the file actually exists.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only, no em-dashes /
     en-dashes (the wikitext parser explicitly handles these for input;
     the phase MD itself must be ASCII-clean).

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/, scripts/load-concepts/):
   - Verify the path exists.
   - Verify the symbol or function name matches (e.g.,
     `apps/qw-oracle/shared/db.ts` exports `db` and `closeDb`;
     `apps/qw-oracle/scripts/load-concepts/parse.ts` exports `parseConceptFile` and
     `extractBodyConceptLinks`; the phase MD references these as exemplars).

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode (don't claim "isolated context"
     for an inline task; don't claim "purely textual" for a code-synthesis
     task).
   - Flag tasks that are coded as `inline` but involve code synthesis,
     migration writing, or test authoring -- those should be subagent.
   - The phase has 9 tasks; verify that tasks involving multi-file code
     synthesis (Tasks 2, 3, 4, 5, 6, 7, 8) are subagent-dispatched and tasks
     that are pure structural / textual (Tasks 1, 9, parts of 8) are inline.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists. F7 is the only F-number this phase claims to
     touch (case-variant pairs intentionally distinct).
   - Confirm this phase actually resolves F7's awareness item (storing slugs
     case-sensitively, not collapsing case-variant pairs).

8. Every column / table introduced that is not in `decisions.md` and is not
   already in `apps/qw-oracle/SCHEMA.md` post-Phase-1:
   - This phase introduces no new columns or tables. The community.players
     row schema is fixed by migration 008 (Phase 1). Flag any column in the
     UPSERT that is not in the migration, or any column in the migration
     not in the UPSERT.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.
   - The parser branches (Task 3) describe each branch's logic in detail.
     Flag any sub-step that says "the parser handles this" without saying how.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing
    voice. Flag any. (Note: the parser's `normalizeDash` helper handles
    Unicode dashes IN SOURCE WIKITEXT; the phase MD itself must be ASCII-clean.)

11. Decision compliance audit (per-decision, where the decision touches Phase 2):
    - D1 (two outputs): row + (conditional) markdown. Confirm both pipelines exist.
    - D4 (deterministic): no LLM in per-page loop. Confirm the parser is regex-only.
    - D5 (two-threshold): is_substantive and has_note are independent. Confirm
      `flags.ts` computes them independently.
    - D6 (is_substantive heuristic): >=2 of 5 signals. Confirm the 5 signals
      match the decision's enumeration.
    - D7 (has_note v1): tunable rule shipped in Phase 2. Confirm Task 8 includes
      the tuning step.
    - D8 (active-year priority): min(spawned, foundquake, earliest TH/achievement).
      Confirm `birth_date` is excluded.
    - D13 (ASCII): scan the phase MD.
    - D14 (Bun): all CLI invocations use `bun`.
    - D15 (append-only migrations): Phase 2 ships no migration; confirm.
    - D16 (atomicity): phase boundary leaves a runnable state.
    - D18 (note frontmatter mirrors row + body): confirm `emit-note.ts`'s
      frontmatter shape matches the row's stable fields and body excludes
      achievements / clan history.
    - D19 (JSONB binding): Phase 2 has no JSONB columns; rule is dormant.
      Confirm the upsert uses bare JS arrays for TEXT[] columns, not
      `tx.json(...)`.
    - D20 (stub flag is multi-signal): confirm `flags.ts` computes is_stub as
      `!is_substantive`, NOT a category check on `Category:Player stubs`.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---

*End of Phase 2 draft. The drafter dispatches the sub-agent, applies findings, and halts for operator review per the handoff prompt.*
