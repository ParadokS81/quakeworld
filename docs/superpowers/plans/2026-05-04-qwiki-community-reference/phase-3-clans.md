# Phase 3 -- Clans parser, row load, note emission

> **Drafter checklist:**
> 1. Read `decisions.md` (full). 20 decisions reviewed; D1 / D3 / D4 / D5 / D6 / D7 / D11 / D13 / D14 / D15 / D16 / D17 / D18 / D19 / D20 directly govern this phase. F7 (case-variant pairs intentionally distinct) is an awareness item for the parser.
> 2. Read `review-findings.md`. F7 (Phase 2/3 awareness) tagged here. F9 (player_clan_eras surrogate PK) is Phase 1/2/5 awareness -- not directly touched here. New F10 (Infobox 4on4team third branch) and F11 (clan count 822 not 829) accrued during drafting of this phase; see review-findings.md additions requested at end of file.
> 3. Read spec "Clan templates" section, "Schema -> community.clans column list", "Phase 3 row in phase-decomposition table".
> 4. Read snapshot manifest + 5 sample clan articles:
>    - `articles/Sublime.json` -- `{{Clan-info}}` (older, modern field set; has founded_year, prefix, irc).
>    - `articles/Euthanasia.json` -- `{{Infobox 4on4team}}` (modern, see F10; has `created`, `team` for prefix, `flag` for nationality).
>    - `articles/Apocalypse_2000.json` -- `{{Infobox clan}}` (rare; only 2 in snapshot).
>    - `articles/Firing_Squad.json` -- NO_INFOBOX prose (richest prose case; substantive, has_note expected).
>    - `articles/Morituri.json` -- NO_INFOBOX `== Information ==` bullet-list (structural pattern distinct from raw prose).
> 5. Read Phase 1 migration 008 (inlined in phase-1-curated-rename.md Task 3) for community.clans column types, CHECK constraints, indexes.
> 6. Read Phase 2's shared/ helpers (wiki-text.ts, iso-country.ts, wiki-types.ts) -- reused in full by the clan parser.
> 7. Read Phase 2's players/upsert.ts, players/emit-note.ts, players/index.ts -- structural templates for the clan equivalents.
> 8. After drafting, dispatch the verification sub-agent (Explore, Sonnet medium) per phase-template.md brief -- dispatched at bottom of this file.

---

## Goal

Phase 3 ships the deterministic clan extraction pipeline end-to-end: a multi-branch wikitext parser
handling all four template variants in the snapshot (`{{Clan-info}}`, `{{Infobox 4on4team}}`,
`{{Infobox clan}}`, and NO_INFOBOX bullet/prose), a row loader that populates `community.clans`
for every article in `Category:Clans`, and a markdown emitter that writes
`apps/qw-oracle/curated/clan-notes/<slug>.md` for the subset whose `has_note=true`. The phase
reuses the `shared/` helpers Phase 2 shipped (wiki-text, iso-country, wiki-types) and mirrors the
structural pattern of the player pipeline (parse -> flags -> upsert -> emit-note -> CLI dispatcher).
No new schema migration is needed: `community.clans` was created by Phase 1's migration 008. At
phase boundary: `community.clans` row count equals the count of `Category:Clans` articles in the
snapshot (822 confirmed by live recon; the spec's 829 figure includes articles that redirected or
were miscounted -- see F11); the curated/clan-notes/ directory contains a tuned count of
substantive notes; `bunx tsc --noEmit` is clean; parser test fixtures pass. Phase 4 (tournaments)
can begin once row counts and emitted-note counts are operator-signed-off.

---

## Inputs from previous phase

- Phase 0 complete: snapshot is finalized at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`.
  Manifest is corrected.
- Phase 1 complete: `apps/qw-oracle/curated/` exists with four subdirectories; `clan-notes/`
  is empty (`.gitkeep` only). Migration 008 is applied; `community.clans` exists with all
  required columns: `slug TEXT PRIMARY KEY`, `title TEXT NOT NULL`, `prefix TEXT`, `nationality
  TEXT`, `nationality_iso TEXT`, `founded_year INT`, `founded_month INT`, `founded_day INT`,
  `founded_by TEXT`, `disbanded TEXT`, `status TEXT CHECK (... IN ('Active','Inactive',
  'Disbanded','unknown'))`, `irc_channel TEXT`, `irc_network TEXT`, `website TEXT`, `has_note
  BOOLEAN NOT NULL DEFAULT FALSE`, `is_substantive BOOLEAN NOT NULL DEFAULT FALSE`, `is_stub
  BOOLEAN NOT NULL DEFAULT TRUE`, `source_template TEXT CHECK (... IN ('infobox_clan',
  'clan_info','bullet_prose','none'))`, `source_categories TEXT[]`, `wiki_revision_id BIGINT`,
  `wiki_fetched_at TIMESTAMPTZ`.
- Phase 2 complete: `apps/qw-oracle/scripts/load-community/` exists; `shared/wiki-text.ts`,
  `shared/iso-country.ts`, `shared/wiki-types.ts` are present with all reusable helpers.
  `community.players` is populated; curated/player-notes/ has the tuned count of substantive
  notes. `bunx tsc --noEmit` is clean on the post-Phase-2 codebase.
- `DATABASE_URL` is set (operator-side).
- Bun is installed and on PATH.

---

## Files touched

### Created

```
apps/qw-oracle/scripts/load-community/clans/                                      # Phase 3 clan module
apps/qw-oracle/scripts/load-community/clans/parse.ts                              # four-branch wikitext parser; pure (no IO, no DB)
apps/qw-oracle/scripts/load-community/clans/parse.test.ts                         # bun test using snapshot articles as fixtures
apps/qw-oracle/scripts/load-community/clans/flags.ts                              # is_substantive + has_note v1 + is_stub for clans; pure
apps/qw-oracle/scripts/load-community/clans/flags.test.ts                         # bun test
apps/qw-oracle/scripts/load-community/clans/upsert.ts                             # community.clans UPSERT via postgres-js; idempotent
apps/qw-oracle/scripts/load-community/clans/upsert.test.ts                        # bun test against qw_oracle_test
apps/qw-oracle/scripts/load-community/clans/emit-note.ts                          # frontmatter + body markdown emitter; writes curated/clan-notes/<slug>.md when has_note=true
apps/qw-oracle/scripts/load-community/clans/emit-note.test.ts                     # bun test
apps/qw-oracle/scripts/load-community/clans/index.ts                              # CLI dispatcher: walk snapshot, parse, upsert, emit; supports --dry-run / --limit / --slug
apps/qw-oracle/curated/clan-notes/<tuned-count>.md                                # markdown notes emitted for has_note=true rows; final count tuned in Task 8
```

### Modified

```
apps/qw-oracle/scripts/load-community/CLAUDE.md    # add clans/ entry to Layout table (created by Phase 2; exists at Phase 3 start)
apps/qw-oracle/SCHEMA.md                           # row-count footnote on community.clans ("populated by Phase 3 clan loader; expected count 822 from Category:Clans")
```

**Note on CLAUDE.md:** `scripts/load-community/CLAUDE.md` is created by Phase 2 Task 1. It does
not exist in the live codebase at planning time (Phase 2 is not yet executed), but it is present
at Phase 3 execution time per the "Inputs from previous phase" requirement. The sub-agent verifier
should NOT flag its absence in the live codebase as CRITICAL -- it is a Phase-2 output being
modified in Phase 3.

The SCHEMA.md modification is a footnote only (same pattern as Phase 2's player-count footnote).
The functional schema (migration 008) is unchanged.

### Deleted

n/a -- no existing files deleted in this phase.

---

## Tasks

### Task 1 -- Create scripts/load-community/clans/ scaffold

**Goal:** Establish the clans/ subdirectory. No code synthesis -- directory creation only.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/` (directory; empty until Tasks 2-7 populate it)

**Steps:**
- [ ] From repo root, create the directory:
  ```
  mkdir -p apps/qw-oracle/scripts/load-community/clans
  ```
  (Bun test runner discovers tests by file; the empty directory is inert until .ts files land.)
- [ ] Update `apps/qw-oracle/scripts/load-community/CLAUDE.md`:
  - In the `## Layout` section, add the line:
    ```
    - `clans/` -- Phase 3 clan loader (parse, flags, upsert, emit-note, CLI).
    ```
    after the `players/` line and before `- `tournaments/``.

**Verification:**
```
ls apps/qw-oracle/scripts/load-community/
# PASS: lists CLAUDE.md, players/, clans/, shared/
```

**Execution mode:** inline -- directory creation + single-line CLAUDE.md edit; no code synthesis.

---

### Task 2 -- Build clans/parse.ts (four-branch wikitext parser)

**Goal:** Land the clan parser. Input: a `WikiArticle` envelope (the same shape Phase 2 uses).
Output: a `ParsedClan` object with all structured fields for the `community.clans` row plus body
content for note emission. Four template branches:

1. `Clan-info` (~55% of clan articles): pipe-separated key=value inside `{{Clan-info|...}}` or
   `{{clan-info|...}}`. Field names: `foundedyear`, `foundedmonth`, `foundedday`, `foundedby`,
   `nationality`, `shortnationality`, `prefix`, `ircchannel`, `ircnetwork`, `website`, `disbanded`,
   `status`, `color1`, `color2`.

2. `Infobox 4on4team` (~5% of clan articles, per live recon): pipe-separated key=value inside
   `{{Infobox 4on4team|...}}`. Field names differ from Clan-info: `name`, `team` (the prefix tag),
   `flag` (2-letter ISO code, not demonym), `founder` (may contain nested `{{player|...|flag=}}`
   templates), `status`, `created` (year or "year, month" string), `irc-channel`, `website`. No
   disbanded field. This branch is NOT mentioned in the spec's "two branches" framing; it was
   surfaced by live recon during Phase 3 drafting (see F10). The `source_template` value for this
   branch is `'infobox_4on4team'`. Phase 1 migration 008 was amended 2026-05-05 (F10) to include
   this value in the CHECK enum before execution; the parser writes it directly. See Open
   Questions Q2 for the audit trail.

3. `Infobox clan` (~0.2% / 2 articles in snapshot): pipe-separated key=value inside
   `{{Infobox Clan|...}}` or `{{Infobox clan|...}}`. Field names very similar to Clan-info:
   `foundedday`, `foundedmonth`, `foundedyear`, `founders`, `nationality`, `shortnationality`,
   `prefix`, `ircchannel`, `ircnetwork`, `status`, `website`. Parse identically to Clan-info
   (same field name set; the distinct template name is just a wiki editorial variation).
   `source_template = 'infobox_clan'` as per migration 008 CHECK.

4. NO_INFOBOX bullet/prose (~40% of clan articles): two sub-patterns detected in live recon:
   - `== Information ==` bullet list (`* Founded: ???`, `* Nationality: ...`, `* Clan prefix: ...`,
     `* IRC channel: ...`, `* Website: ...`). Example: Morituri.
   - Pure prose body with no structured Information section (Firing Squad, Slackers). These are
     the richest `has_note` candidates.
   Both sub-patterns use `source_template = 'bullet_prose'` (the migration 008 CHECK value).

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/parse.ts` (created)

**Steps:**

- [ ] Author `parse.ts` with:

  **Exported shape:**
  ```ts
  export interface ParsedClan {
    // Identity
    slug:             string;      // article filename minus .json
    title:            string;      // wiki canonical title (no parentheticals observed in clan articles)

    // Structured row fields (mirrors community.clans columns)
    prefix:           string | null;     // e.g. "[SR]", "[E]", "[s]"; load-bearing for L2 chat parser
    nationality:      string | null;     // demonym form (Swedish, Finnish)
    nationality_iso:  string | null;     // 2-letter ISO
    founded_year:     number | null;
    founded_month:    number | null;
    founded_day:      number | null;
    founded_by:       string | null;     // comma-separated as-is from wiki (TEXT column, not array)
    disbanded:        string | null;     // freeform: year, date, or note; NOT parsed to INT
    status:           'Active' | 'Inactive' | 'Disbanded' | 'unknown' | null;
    irc_channel:      string | null;
    irc_network:      string | null;
    website:          string | null;

    // Provenance
    source_template:  'clan_info' | 'infobox_clan' | 'infobox_4on4team' | 'bullet_prose' | 'none';
    source_categories: string[];
    wiki_revision_id: number;
    wiki_fetched_at:  string;       // ISO 8601

    // Body content (consumed by emit-note when has_note=true)
    narrative_intro:  string;       // prose before the first ==Section== heading; empty string when absent
    history_section:  string;       // ==History== body; empty when absent
    info_section:     string;       // ==Information== body (minus the infobox template itself); may contain member bullet lists
    achievements_section: string;   // ==Achievements== body; empty when absent
    members_section:  string;       // ==Members== body; empty when absent
    see_also_section: string;       // ==See also== body; empty when absent
    external_links_section: string; // ==External links== body; empty when absent

    // Flags computed downstream by flags.ts
    narrative_byte_length: number;  // len(narrative_intro + history_section) after stripWikiMarkup; used by flags.ts
    has_history:       boolean;     // ==History== section exists and has non-trivial content (>100B after strip)
    achievements_count: number;     // count of {{AchievementStripped|...}} rows in the achievements section
  }
  ```

  **Exported function:**
  ```ts
  export function parseClan(article: WikiArticle): ParsedClan
  ```

  **Parse flow:**

  1. **Pre-flight:** `slug` is injected from filename by the calling CLI (same as player parser).
     `wiki_revision_id = article.revid`, `wiki_fetched_at = article.timestamp`.
     `source_categories = article.categories`.

  2. **Template detection (case-insensitive substring match on wikitext):**
     - If `{{clan-info` matches -> `source_template = 'clan_info'`.
     - Else if `{{infobox clan` matches -> `source_template = 'infobox_clan'`.
     - Else if `{{infobox 4on4team` matches -> `source_template = 'infobox_4on4team'`.
     - Else if the `== Information ==` section (case-insensitive) contains any of the bullet
       patterns (`* Founded:`, `* Nationality:`, `* Clan prefix:`, `* IRC`) OR if the article
       has `{{Clan-info` anywhere with a misspelling (defensive; rare) -> `source_template =
       'bullet_prose'`.
     - Else -> `source_template = 'none'`.

  3. **Branch dispatch:** each branch extracts row fields via `extractInfoboxBlock` +
     `parseInfoboxFields` (from `shared/wiki-text.ts`) for template-bearing branches; regex
     line-matching for bullet_prose and none.

  4. **Branch: `clan_info` and `infobox_clan` (treat identically):**
     - Extract infobox block via `extractInfoboxBlock(wikitext, 'Clan-info')` (for clan_info) or
       `extractInfoboxBlock(wikitext, 'Infobox Clan')` (for infobox_clan).
     - `parseInfoboxFields(block)` -> field map (string-to-string).
     - `prefix = fields.prefix || null`. Do NOT transform; store as-is from wiki (e.g. `[SR]`).
       If missing and clan title has format `ClanName [TAG]`, attempt to extract from title --
       see "Prefix title-fallback" note below.
     - `nationality = normalize(fields.nationality || null)`. Capitalize first letter; lowercase
       rest. E.g., `swedish` -> `Swedish`.
     - `nationality_iso = fields.shortnationality || nationalityToIso(nationality) || null`.
       Lowercase before storing.
     - `founded_year = parseYear(fields.foundedyear) || null`.
     - `founded_month = parseMonthName(fields.foundedmonth) || null`. Map month names to 1-12;
       also accept numeric strings.
     - `founded_day = parseInt(fields.foundedday, 10) || null`. Strip ordinals (`13th` -> 13).
     - `founded_by = fields.foundedby ? stripWikiMarkup(fields.foundedby).trim() : null`.
       Preserved as comma-separated text; NOT split into an array. Multiple founders stay in
       the string as the wiki wrote them.
     - `disbanded = fields.disbanded ? fields.disbanded.trim() : null`. PRESERVED AS-IS (freeform
       text; may be a year, a full date, or a note like "merged with X"). Do NOT attempt to parse
       to INT.
     - `status = normalizeClanStatus(fields.status)` -- map: `active`/`Active` -> `'Active'`;
       `inactive`/`Inactive` -> `'Inactive'`; `disbanded`/`Disbanded` -> `'Disbanded'`; anything
       else or missing -> `'unknown'`. The CHECK constraint in migration 008 accepts only these
       four values.
     - `irc_channel = fields.ircchannel || null`. Strip leading `#` if present so the value is
       just the channel name (e.g., `euthanasia` not `#euthanasia`).
     - `irc_network = fields.ircnetwork || fields.ircnetworkname || null`.
     - `website = fields.website || null`. Trim whitespace.

  5. **Branch: `infobox_4on4team`:**
     - Extract block via `extractInfoboxBlock(wikitext, 'Infobox 4on4team')`.
     - `parseInfoboxFields(block)` -> field map.
     - `prefix = fields.team || null`. The `team` field holds the clan tag (e.g., `[E]`, `D#`,
       `Book`). Some values are not bracket-wrapped; store as-is.
     - `nationality_iso = fields.flag || null`. The `flag` field is a 2-letter ISO code directly
       (e.g., `se`, `fi`). Lowercase before storing.
     - `nationality = isoToNationality(nationality_iso) || null`. Reverse lookup from
       `shared/iso-country.ts`.
     - `founded_year = parseCreatedYear(fields.created)`. The `created` field format is `YYYY`
       or `YYYY, Month` (e.g., `1997, April`). Extract the 4-digit year component; store month
       in `founded_month` if present.
     - `founded_month = parseCreatedMonth(fields.created)`. Extract month name from the
       `created` string if present; map to 1-12. Null if absent.
     - `founded_day = null`. The `created` field in Infobox 4on4team does not carry day.
     - `founded_by = parseFounderField(fields.founder)`. The `founder` field may contain nested
       `{{player|Nick|flag=xx}}` templates. Strip templates to extract the display name(s). If
       multiple players, join as comma-separated. Null if empty.
     - `disbanded = null`. Infobox 4on4team has no disbanded field (all 4on4team clans observed
       in snapshot are modern / Active).
     - `status = normalizeClanStatus(fields.status)`.
     - `irc_channel = fields['irc-channel'] || null`. Note: hyphenated key.
     - `irc_network = null`. Infobox 4on4team does not carry ircnetwork.
     - `website = fields.website || null`.

  6. **Branch: `bullet_prose` and `none`:**
     - Extract the `== Information ==` section body via `extractSectionBody(wikitext,
       'Information')`. If absent, treat full body as prose.
     - For each bullet line in the Information body, attempt:
       - `* Founded: X` -> parse as date string; try to extract `founded_year/month/day`.
       - `* Nationality: [[Image:flag_xx.gif]] Y` -> `nationality = Y`, `nationality_iso = xx`.
       - `* Clan prefix: X` -> `prefix = X.trim()`.
       - `* IRC channel: X` -> `irc_channel = extractIrcChannel(X)`. The IRC channel field in
         bullet lists may be an IRC link (`[irc://host/channel #channel]`); extract the channel
         name from the fragment.
       - `* Website: X` -> `website = X.trim()`.
     - `founded_by = null`. Bullet-list Information sections in the snapshot do not carry
       founded_by (Morituri, for example, omits it).
     - `disbanded = null` unless found in the text.
     - `status = inferStatusFromCategories(source_categories)`. If categories include
       `Category:Clan stubs` only, status = `'unknown'`. If no explicit disbanded or inactive
       indicator, default to `'unknown'`.
     - `irc_network = extractIrcNetwork(irc_channel_raw)`. Parse the host from any `irc://` URL
       present in the IRC channel bullet (e.g., `irc://port80.se.quakenet.org/mor` -> `irc_network
       = 'QuakeNet'`). Use a lookup table: `quakenet.org` -> `QuakeNet`; `efnet.org` -> `EFnet`;
       `freenode.net` -> `Freenode`; `irc.gamesurge.net` -> `GameSurge`; anything else -> preserve
       the host as-is.

  7. **Prefix title-fallback (all branches):** if `prefix` is null after branch dispatch AND the
     article title matches the pattern `Clan Name [TAG]` or `Clan Name (TAG)` with a short
     uppercase tag (2-6 chars), extract the bracketed/parenthetical portion as the prefix.
     This is a best-effort fallback -- do not force a prefix from a title that does not match
     the pattern.

  8. **Branch-agnostic body sections (always run regardless of branch):**
     - `narrative_intro`: ALL prose before the first `==<Section>==` heading, after removing
       any infobox template block via `stripWikiMarkup`. This is the clan's lead paragraph.
       Slackers and Firing Squad have rich narrative intros; stub clans have `brief introduction`
       placeholder or empty.
     - `history_section`: `extractSectionBody(wikitext, 'History')` or `extractSectionBody(
       wikitext, ']SR[ History')` (name variants observed in snapshot). Strip wikitext markup
       for byte-length measurement.
     - `info_section`: `extractSectionBody(wikitext, 'Information')` with the infobox template
       body removed (so only prose/bullet lines outside the template remain).
     - `achievements_section`: `extractSectionBody(wikitext, 'Achievements')`.
     - `members_section`: `extractSectionBody(wikitext, 'Members')` (including `== Lineup ==`
       as an alias; observed in Infobox 4on4team articles which use "Lineup" instead of "Members").
     - `see_also_section`: `extractSectionBody(wikitext, 'See also')`.
     - `external_links_section`: `extractSectionBody(wikitext, 'External links')`.
     - `narrative_byte_length`: `(narrative_intro + '\n' + history_section).length` after
       `stripWikiMarkup`. This combined measure is passed to flags.ts (clan narrative signal is
       richer if you include the history section -- many clans have short narrative_intro but
       substantial ==History==).
     - `has_history`: `history_section.length > 100` after `stripWikiMarkup`.
     - `achievements_count`: count of `{{AchievementStripped|` occurrences in
       `achievements_section`.

  **Normalization notes (D13 compliance):**
  - When the wiki uses Unicode dashes (em-dash U+2014, en-dash U+2013) in `founded_by` or
    `disbanded` fields, the parser normalizes them to ASCII hyphen-minus via `normalizeDash`
    (already in `shared/wiki-text.ts` from Phase 2). The stored values are ASCII-clean.
  - `nationality` stored values are normalized to title-case (first letter upper, rest lower):
    `Swedish`, `Finnish`, `Dutch` -- not `swedish`, `DUTCH`.

- [ ] Run `cd apps/qw-oracle && bunx tsc --noEmit`. Zero type errors.

**Verification:**
```
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: zero type errors
```
(Functional verification deferred to Task 3's fixture tests.)

**Execution mode:** subagent (Sonnet medium) -- four-branch parser code synthesis. Simpler than
Phase 2's three-branch player parser (no TH row parsing, no achievement template parsing, no
community_roles extraction, no active-year priority computation). Isolated subagent context
preferred to keep the executor thread under 200k tokens.

---

### Task 3 -- Build clans/parse.test.ts (fixture-based parser tests)

**Goal:** Validate `parseClan` against five reference articles spanning all four template branches.
Tests read snapshot JSON directly (no copy -- same pattern as Phase 2).

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/parse.test.ts` (created)

**Steps:**

- [ ] Author `parse.test.ts`. Each test reads the snapshot JSON, calls `parseClan`, asserts key
  fields. Tests:

  **Sublime (`{{Clan-info}}`):**
  ```
  expect(parsed.source_template).toBe('clan_info');
  expect(parsed.prefix).toBe('[s]');
  expect(parsed.nationality).toBe('Swedish');
  expect(parsed.nationality_iso).toBe('se');
  expect(parsed.founded_year).toBe(2011);
  expect(parsed.founded_month).toBe(4);             // April
  expect(parsed.founded_day).toBe(13);
  expect(parsed.founded_by).toContain('votary');    // comma-separated string
  expect(parsed.irc_channel).toBe('sublime');       // stripped of '#' if present
  expect(parsed.irc_network).toContain('QuakeNet'); // from ircnetwork field
  expect(parsed.status).toBe('unknown');            // not set in Clan-info for Sublime; default
  expect(parsed.disbanded).toBeNull();
  expect(parsed.history_section.length).toBeGreaterThan(0);
  ```

  **Euthanasia (`{{Infobox 4on4team}}`):**
  ```
  expect(parsed.source_template).toBe('infobox_4on4team');
  expect(parsed.prefix).toBe('[E]');                // from 'team' field
  expect(parsed.nationality_iso).toBe('se');        // from 'flag' field
  expect(parsed.nationality).toBe('Swedish');       // reverse-looked-up
  expect(parsed.founded_year).toBe(1997);           // from 'created' = '1997, April'
  expect(parsed.founded_month).toBe(4);             // April
  expect(parsed.founded_day).toBeNull();            // Infobox 4on4team carries no day
  expect(parsed.founded_by).toContain('Ettan');     // parsed from {{player|Ettan|flag=se}}
  expect(parsed.irc_channel).toBe('euthanasia');    // from 'irc-channel' field
  expect(parsed.status).toBe('Inactive');           // from 'status' field
  expect(parsed.narrative_intro.length).toBeGreaterThan(200);  // rich narrative lead
  expect(parsed.has_history).toBe(false);           // no ==History== section in Euthanasia
  expect(parsed.achievements_count).toBeGreaterThanOrEqual(4); // 4 AchievementStripped rows
  ```

  **Apocalypse_2000 (`{{Infobox clan}}`):**
  ```
  expect(parsed.source_template).toBe('infobox_clan');
  expect(parsed.prefix).toBe('a2k');
  expect(parsed.nationality).toBe('English');
  expect(parsed.nationality_iso).toBe('gb');        // shortnationality='england'; iso-country maps 'english' -> 'gb'
  expect(parsed.founded_year).toBe(1999);
  expect(parsed.founded_month).toBe(5);             // May
  expect(parsed.irc_channel).toBe('a2k.qw');
  expect(parsed.status).toBe('Active');             // status='active' in template, normalized
  expect(parsed.website).toContain('apocalypse2000');
  ```

  **Firing_Squad (NO_INFOBOX prose):**
  ```
  expect(parsed.source_template).toBe('bullet_prose');
  // No structured infobox fields extractable from pure prose:
  expect(parsed.prefix).toBeNull();                 // no Information bullet section
  expect(parsed.nationality_iso).toBeNull();        // prose does not use flag images
  // But rich narrative makes it substantive and has_note:
  expect(parsed.narrative_byte_length).toBeGreaterThan(500);
  expect(parsed.history_section.length).toBeGreaterThan(500); // ==History== section present
  expect(parsed.narrative_intro.length).toBeGreaterThan(100); // lead paragraph
  expect(parsed.nationality).toBeNull();
  expect(parsed.founded_year).toBeNull();
  ```

  **Morituri (NO_INFOBOX `== Information ==` bullet list):**
  ```
  expect(parsed.source_template).toBe('bullet_prose');
  expect(parsed.prefix).toBe('mor');
  expect(parsed.nationality).toBe('British');
  expect(parsed.nationality_iso).toBe('gb');
  expect(parsed.irc_channel).toBe('mor');
  expect(parsed.irc_network).toContain('QuakeNet');
  expect(parsed.website).toContain('atrophied.co.uk');
  expect(parsed.founded_year).toBeNull();           // '???' in template
  expect(parsed.founded_by).toBeNull();
  expect(parsed.narrative_intro.length).toBeLessThan(100); // 'brief introduction' placeholder
  ```

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/clans/parse.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/clans/parse.test.ts
# PASS: all assertions pass for all 5 fixture articles
```

**Execution mode:** subagent (Sonnet medium) -- mechanical test authoring shaped by 5 well-defined
fixture cases. Reasoning is in the assertion expectations; test plumbing is mechanical.

---

### Task 4 -- Build clans/flags.ts (is_substantive + has_note + is_stub)

**Goal:** Land the flag-computation module that consumes `ParsedClan` and returns
`{ is_substantive, has_note, is_stub, source_template }`. Per D5 / D6 / D7 / D20.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/flags.ts` (created)
- `apps/qw-oracle/scripts/load-community/clans/flags.test.ts` (created)

**Steps:**

- [ ] Author `flags.ts` with:

  ```ts
  export interface ClanFlags {
    is_substantive: boolean;
    has_note:       boolean;
    is_stub:        boolean;
    source_template: ParsedClan['source_template'];
  }

  export function computeClanFlags(c: ParsedClan): ClanFlags {
    // is_substantive (D6 adapted for clans): >=2 of 5 structured-field signals.
    // Signals selected to mirror the spirit of D6 but for clan-shaped data:
    const hasPrefix       = c.prefix !== null;
    const hasFounded      = c.founded_year !== null;
    const hasFoundedBy    = c.founded_by !== null && c.founded_by.trim() !== '';
    const hasIrc          = c.irc_channel !== null;
    const hasNarrativeProse = c.narrative_byte_length >= 500;

    const substantiveSignals =
      Number(hasPrefix) +
      Number(hasFounded) +
      Number(hasFoundedBy) +
      Number(hasIrc) +
      Number(hasNarrativeProse);

    const is_substantive = substantiveSignals >= 2;

    // has_note v1 (D7 adapted for clans): clan carries content the row schema cannot represent.
    // Tunable -- Task 8 first-run inspection may adjust.
    const hasUniqueProse =
      c.narrative_byte_length >= 500 ||                     // rich narrative_intro + history
      (c.history_section.length > 200 && c.has_history) ||  // substantial ==History== section
      (c.achievements_count >= 3) ||                         // meaningful tournament record
      c.external_links_section.length > 0;                   // external resources (demos, etc.)

    const has_note = hasUniqueProse;

    // is_stub (D20): inverse of is_substantive.
    const is_stub = !is_substantive;

    return { is_substantive, has_note, is_stub, source_template: c.source_template };
  }
  ```

  **Rationale for clan-specific signal set:**
  - `prefix` replaces `real_name` as the load-bearing identity signal. A clan without a prefix
    is editorial-incomplete; a prefix present means the article has at least one machine-readable
    structured field. This is also the load-bearing field for the L2 chat parser.
  - `founded_year` replaces `aliases` (clans don't have aka lists).
  - `founded_by` is an independent signal (clans often have founders recorded even when other
    fields are empty).
  - `irc_channel` is included as a structured-field signal (early 2000s clans reliably have
    IRC info even when prose is sparse -- it's biographical metadata per spec).
  - `narrative_byte_length >= 500` mirrors the player heuristic threshold for the prose signal.
    For clans this is computed as `narrative_intro + history_section` combined (clan narrative
    is often in the History section, not the intro paragraph).

  **Note on Phase 2 has_note tuning:** Phase 2's first run produced tuned thresholds for players.
  Phase 3 ships the v1 has_note rule above and tunes it empirically in Task 8, same pattern as
  Phase 2 Task 9. The rule is intentionally not pre-locked here (D7).

  **Note on achievements_count >= 3 threshold:** clan achievement lists are shorter than player
  achievement lists on average. The `>=3` threshold avoids emitting notes for stub clans that
  have exactly one or two achievement rows with `???` content.

- [ ] Author `flags.test.ts` covering:
  - Slackers -> `{ is_substantive: true, has_note: true, is_stub: false }`. (Reasoning: Slackers
    has no Clan-info template -- it is NO_INFOBOX. But it has a rich narrative lead + large
    History section -> `narrative_byte_length >= 500` fires, so `hasNarrativeProse` alone makes
    it 1/5. Nationality can be inferred from `Category:European Clans` -> low. The has_note
    fires via `narrative_byte_length >= 500`. Verify against the actual article during
    implementation; pin to whatever the parser produces. The test author reads Slackers.json
    during sub-agent synthesis and writes assertions that match the live parse output.)
  - Sublime (Clan-info) -> `{ is_substantive: true, is_stub: false }`. At minimum `hasFounded`
    (2011) + `hasIrc` fire -> 2/5. `has_note` depends on history_section length; pin during
    implementation.
  - Euthanasia (Infobox 4on4team) -> `{ is_substantive: true, has_note: true, is_stub: false }`.
    `hasPrefix` ([E]) + `hasFounded` (1997) + `hasFoundedBy` (Ettan) >= 3/5 signals. has_note
    fires via `narrative_byte_length >= 500` (rich founding narrative + history text).
  - Firing Squad (NO_INFOBOX prose) -> `{ is_substantive: true, has_note: true, is_stub: false }`.
    `hasNarrativeProse` fires alone at 1/5; but additional category signals may or may not fire
    (no prefix extracted, no founded extracted from prose). Test author verifies the actual
    substantive count during implementation. Both is_substantive and has_note expected true.
  - Morituri (NO_INFOBOX bullet list) -> `{ is_substantive: true, has_note: false, is_stub: false }`.
    `hasPrefix` (mor) + `hasIrc` (mor@QuakeNet) fire -> 2/5. But prose is thin (no history
    section, minimal narrative) -> has_note likely false. Pin during implementation.
  - A fully-empty stub article (fictional fixture with only `brief introduction` and no bullets,
    no infobox, no categories beyond `Category:Clans`) -> `{ is_substantive: false, has_note:
    false, is_stub: true }` (0/5 signals).

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/clans/flags.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/clans/flags.test.ts
# PASS: all flag assertions pass
```

**Execution mode:** subagent (Sonnet medium) -- well-specified pure logic with deterministic test
assertions adapted from Phase 2's flags.ts shape.

---

### Task 5 -- Build clans/upsert.ts (community.clans UPSERT) + tests

**Goal:** Land the idempotent UPSERT into `community.clans`. Mirrors players/upsert.ts structurally;
points at the `community.clans` column set instead.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/upsert.ts` (created)
- `apps/qw-oracle/scripts/load-community/clans/upsert.test.ts` (created)

**Steps:**

- [ ] Author `upsert.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/clans/upsert.ts
  //
  // Atomic per-slug UPSERT into community.clans. Idempotent.
  // community.clans uses TEXT[] only for source_categories (no JSONB columns).
  // D19 (JSONB binding) does not apply for TEXT[] -- postgres-js binds JS arrays
  // directly to TEXT[] columns.
  //
  // source_template values accepted by migration 008's CHECK constraint:
  //   'infobox_clan' | 'clan_info' | 'infobox_4on4team' | 'bullet_prose' | 'none'
  // (F10 resolution: Phase 1 migration 008 amended 2026-05-05 to include
  // 'infobox_4on4team' before Phase 1 executes; no coercion needed.)

  import { db } from '../../../shared/db.ts';
  import type { ParsedClan } from './parse.ts';
  import type { ClanFlags } from './flags.ts';

  export async function upsertClan(c: ParsedClan, f: ClanFlags): Promise<void> {
    const source_template = f.source_template;
    await db.begin(async (tx) => {
      await tx`
        INSERT INTO community.clans (
          slug, title, prefix, nationality, nationality_iso,
          founded_year, founded_month, founded_day, founded_by,
          disbanded, status, irc_channel, irc_network, website,
          has_note, is_substantive, is_stub,
          source_template, source_categories, wiki_revision_id, wiki_fetched_at
        ) VALUES (
          ${c.slug}, ${c.title}, ${c.prefix}, ${c.nationality}, ${c.nationality_iso},
          ${c.founded_year}, ${c.founded_month}, ${c.founded_day}, ${c.founded_by},
          ${c.disbanded}, ${c.status}, ${c.irc_channel}, ${c.irc_network}, ${c.website},
          ${f.has_note}, ${f.is_substantive}, ${f.is_stub},
          ${source_template}, ${c.source_categories}, ${c.wiki_revision_id}, ${c.wiki_fetched_at}
        )
        ON CONFLICT (slug) DO UPDATE SET
          title             = EXCLUDED.title,
          prefix            = EXCLUDED.prefix,
          nationality       = EXCLUDED.nationality,
          nationality_iso   = EXCLUDED.nationality_iso,
          founded_year      = EXCLUDED.founded_year,
          founded_month     = EXCLUDED.founded_month,
          founded_day       = EXCLUDED.founded_day,
          founded_by        = EXCLUDED.founded_by,
          disbanded         = EXCLUDED.disbanded,
          status            = EXCLUDED.status,
          irc_channel       = EXCLUDED.irc_channel,
          irc_network       = EXCLUDED.irc_network,
          website           = EXCLUDED.website,
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

  **Notes:**
  - `source_categories` is `TEXT[]`; postgres-js binds JS string arrays directly (same as
    `aliases` in the player upsert; Task 6 of Phase 2 verified this binding works).
  - No coercion shim required. Phase 1 migration 008 was amended 2026-05-05 (per F10 resolution) to include `'infobox_4on4team'` in the CHECK enum before execution; the parser's value binds directly.

- [ ] Author `upsert.test.ts` against `qw_oracle_test`:
  - Test 1: insert a fresh clan (Sublime fixture); row appears with all fields correct.
  - Test 2: re-insert with one field changed (prefix modified); row updates idempotently.
  - Test 3 (TEXT[] binding): insert with `source_categories = ['Category:Clans',
    'Category:Swedish Clans']`; read back via `array_length(source_categories, 1)`. PASS: returns
    2 and the JS-side value is a JS string array. FAIL: returns NULL or 1 (driver coerced to
    scalar). (The Phase 2 upsert already verified TEXT[] binding works; this test is a quick
    regression check that the binding carries forward to the clan upsert shape.)
  - Test 4: insert with status = 'Active' -> CHECK passes. `status = 'BogusStatus'` -> CHECK
    rejects with a thrown error; assert the throw and verify the row is absent post-rollback.
  - Test 5 (F7 awareness): insert two clans with case-distinct slugs (`Slackers` and `slackers`)
    -> both rows persist. `SELECT count(*) FROM community.clans WHERE lower(slug) = 'slackers'`
    returns 2.
  - Test 6 (infobox_4on4team direct insert): insert a clan with
    `source_template = 'infobox_4on4team'` (ParsedClan value); verify the stored row has
    `source_template = 'infobox_4on4team'` (CHECK accepts; no coercion). Confirms F10 fix lands
    cleanly post-Phase-1-amendment.
  - Tests run in per-test transaction with ROLLBACK. Guard: `process.env.PGDATABASE ===
    'qw_oracle_test'`.

- [ ] Run `PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/clans/upsert.test.ts`.
  All tests pass.

**Verification:**
```
PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/clans/upsert.test.ts
# PASS: all upsert tests pass (including the 4on4team direct-insert test, F10 regression gate)
```

**Execution mode:** subagent (Sonnet medium) -- postgres-js INSERT + ON CONFLICT DO UPDATE
synthesis; mirrors players/upsert.ts with the clan column set.

---

### Task 6 -- Build clans/emit-note.ts (markdown note emitter) + tests

**Goal:** Land the markdown-note emitter for clans. Frontmatter mirrors the row's stable fields per
D18; body carries unique content the schema cannot represent (narrative prose, history, achievements,
external links). Clan achievements and member lists are NOT duplicated in the note body -- they
live in distinct sources (achievements in a separate future schema if ever added, members would be
cross-link data). The body focuses on prose narrative, history, and external links.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/emit-note.ts` (created)
- `apps/qw-oracle/scripts/load-community/clans/emit-note.test.ts` (created)

**Steps:**

- [ ] Author `emit-note.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/clans/emit-note.ts
  //
  // Markdown emitter for has_note=true clans. Frontmatter mirrors the row (D18);
  // body carries the unique-content overlay (narrative prose, history, achievements,
  // external links). Pure: takes ParsedClan + ClanFlags, returns a markdown string.

  import type { ParsedClan } from './parse.ts';
  import type { ClanFlags } from './flags.ts';

  export function buildClanNoteMarkdown(c: ParsedClan, f: ClanFlags): string {
    const fm = buildFrontmatter(c, f);
    const body = buildBody(c);
    return `---\n${fm}\n---\n\n${body}`;
  }

  function buildFrontmatter(c: ParsedClan, f: ClanFlags): string {
    // Same yamlEscape / yamlArray helpers as players/emit-note.ts.
    // Subagent: reuse or inline the helpers -- do not import from emit-note.ts
    // (wrong module boundary; helpers are private to each emitter).
    const lines: string[] = [
      `slug: ${c.slug}`,
      `title: ${yamlEscape(c.title)}`,
      `type: clan`,
      `prefix: ${yamlEscape(c.prefix)}`,
      `nationality: ${yamlEscape(c.nationality)}`,
      `nationality_iso: ${yamlEscape(c.nationality_iso)}`,
      `founded_year: ${c.founded_year ?? ''}`,
      `founded_month: ${c.founded_month ?? ''}`,
      `founded_day: ${c.founded_day ?? ''}`,
      `founded_by: ${yamlEscape(c.founded_by)}`,
      `disbanded: ${yamlEscape(c.disbanded)}`,
      `status: ${yamlEscape(c.status)}`,
      `irc_channel: ${yamlEscape(c.irc_channel)}`,
      `irc_network: ${yamlEscape(c.irc_network)}`,
      `website: ${yamlEscape(c.website)}`,
      `source_template: ${f.source_template}`,
      `wiki_revision_id: ${c.wiki_revision_id}`,
      `wiki_fetched_at: ${c.wiki_fetched_at}`,
    ];
    return lines.join('\n');
  }

  function buildBody(c: ParsedClan): string {
    const sections: string[] = [];

    if (c.narrative_intro.length > 0) {
      sections.push(c.narrative_intro);
    }
    if (c.history_section.length > 0) {
      sections.push(`## History\n\n${c.history_section}`);
    }
    if (c.achievements_section.length > 0) {
      sections.push(`## Achievements\n\n${c.achievements_section}`);
    }
    if (c.see_also_section.length > 0) {
      sections.push(`## See also\n\n${c.see_also_section}`);
    }
    if (c.external_links_section.length > 0) {
      sections.push(`## External links\n\n${c.external_links_section}`);
    }

    return sections.join('\n\n');
  }
  ```

  **What is NOT in the body:**
  - `info_section`: the Information section (member lists, etc.) is structural data. The row
    already captures prefix, IRC, website. Duplicating the member list in the note body adds
    noise.
  - `members_section`: member lists stale quickly. The body skips them. Future Phase 5 / Phase 6
    MCP tooling renders clan rosters on demand from `player_clan_eras`.

  **Frontmatter note:** the `source_template` frontmatter field emits the ParsedClan value
  (`infobox_4on4team` if applicable). Post-F10-amendment the frontmatter and the DB row carry
  identical values; no provenance drift.

- [ ] Author `emit-note.test.ts`:
  - Test 1: Euthanasia (Infobox 4on4team) -> frontmatter has `slug: Euthanasia`, `type: clan`,
    `prefix: "[E]"`, `nationality: Swedish`, `nationality_iso: se`, `founded_year: 1997`,
    `source_template: infobox_4on4team`. Body contains the founding narrative paragraph.
  - Test 2: Firing Squad (NO_INFOBOX prose) -> frontmatter has `type: clan`,
    `source_template: bullet_prose`. Body contains the history section prose.
  - Test 3: Morituri (`has_note=false`) -> `buildClanNoteMarkdown` is still callable; the CLI
    does NOT write the file. Assert `buildClanNoteMarkdown(morituri, { has_note: false, ...})`
    returns a non-empty string (function does not refuse; guard is in the CLI).
  - Test 4: YAML escaping -- a founded_by containing `,` (e.g., `votary, cara, overdose`) is
    double-quoted in frontmatter.
  - Test 5: `disbanded` containing `merged with X` is double-quoted in frontmatter.

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/clans/emit-note.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/clans/emit-note.test.ts
# PASS: all emit-note tests pass
```

**Execution mode:** subagent (Sonnet medium) -- markdown synthesis from a structured input. The
shape is well-defined (frontmatter mirror + body sections). The `yamlEscape` helper can be
copied from players/emit-note.ts or refactored -- subagent decides.

---

### Task 7 -- Build clans/index.ts (CLI dispatcher)

**Goal:** Land the CLI that walks the snapshot, filters to `Category:Clans`, parses, computes flags,
upserts, and conditionally emits markdown notes. Mirrors players/index.ts structurally.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/index.ts` (created)

**Steps:**

- [ ] Author `index.ts`. Full structural mirror of `players/index.ts` (same arg flags: `--dry-run`,
  `--limit N`, `--slug <slug>`, `--snapshot <date>`). Key differences:
  - `NOTES_DIR = resolve(APP_ROOT, 'curated', 'clan-notes')`.
  - Filter function: `article.categories.includes('Category:Clans')`.
  - Calls `parseClan`, `computeClanFlags`, `upsertClan`, `buildClanNoteMarkdown`.
  - Log prefix: `[load-clans]`.
  - F7 awareness: do NOT deduplicate or collapse case-variant slugs. Two clans with slugs
    `Slackers` and `slackers` (if both exist in Category:Clans) produce two distinct rows.

  **`import.meta.main` guard** (D14): same pattern as players/index.ts.

  **Clan title -> slug export** (Phase 5 need): expose a helper export so Phase 5's cross-link
  backfill can do clan_title -> slug lookups:
  ```ts
  // Exported for Phase 5 cross-link backfill.
  // Returns a map of { [clan_title: string]: string } (title -> slug).
  // Reads from community.clans (must be called after a full load run).
  export async function getClanTitleToSlugMap(): Promise<Map<string, string>> {
    const rows = await db`SELECT slug, title FROM community.clans`;
    return new Map(rows.map((r) => [r.title as string, r.slug as string]));
  }
  ```
  This avoids Phase 5 re-parsing all clan articles just to resolve title -> slug. The function
  queries the DB post-load rather than building the map in-memory during the parse run.

- [ ] Run a smoke test:
  ```
  bun apps/qw-oracle/scripts/load-community/clans/index.ts --limit 50 --dry-run
  # Expected: prints "[load-clans] scanned 50, loaded N, notes M, skipped K, warnings 0"
  ```

- [ ] Run single-slug re-test for each fixture article:
  ```
  for s in Sublime Euthanasia Apocalypse_2000 Firing_Squad Morituri; do
    bun apps/qw-oracle/scripts/load-community/clans/index.ts --slug "$s" --dry-run
  done
  # Expected: each prints scanned 1, loaded 1, notes 0 or 1 per the flag matrix from Task 4.
  ```

**Verification:**
```
bun apps/qw-oracle/scripts/load-community/clans/index.ts --limit 10 --dry-run
# PASS: prints scanned/loaded/notes counts, exits 0
bun apps/qw-oracle/scripts/load-community/clans/index.ts --slug Euthanasia --dry-run
# PASS: prints "scanned 1, loaded 1, notes 1, skipped 0, warnings 0"
bun apps/qw-oracle/scripts/load-community/clans/index.ts --slug Morituri --dry-run
# PASS: prints "scanned 1, loaded 1, notes 0, skipped 0, warnings 0"
```

**Execution mode:** subagent (Sonnet medium) -- CLI synthesis from a well-specified structural
template (players/index.ts). Key differences are the NOTES_DIR, filter function, and the
getClanTitleToSlugMap export.

---

### Task 8 -- First full run + has_note rule tuning + stale-note cleanup

**Goal:** Run the loader against the full snapshot (822 Category:Clans articles), inspect the
row + note distributions, sample emitted notes for content quality, tune the `has_note` v1 rule
(the `hasUniqueProse` expression in flags.ts) based on observed precision / recall, re-run if
needed, and clean up stale notes. Same empirical pattern as Phase 2 Task 9.

**Files:**
- `apps/qw-oracle/scripts/load-community/clans/flags.ts` (modified -- thresholds tuned post-run)

**Steps:**

- [ ] Run the full first pass (with DB writes + note writes):
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/clans/index.ts
  # Expected: scanned ~9173, loaded 822 (Category:Clans count), notes <count>, skipped ~8351.
  # source_template distribution should include ~44 'infobox_4on4team' rows (per F10 live recon).
  ```
- [ ] Check distribution:
  ```sql
  SELECT is_substantive, has_note, is_stub, count(*) FROM community.clans GROUP BY 1,2,3 ORDER BY 1,2,3;
  SELECT source_template, count(*) FROM community.clans GROUP BY 1 ORDER BY 2 DESC;
  SELECT status, count(*) FROM community.clans GROUP BY 1 ORDER BY 2 DESC;
  ```
- [ ] Spot-check emitted notes: sample 10 notes from `curated/clan-notes/`. Open each. Ask: does
  this body carry content the DB row cannot? If a note is just the infobox fields reformatted
  (prefix, nationality, founded) with no prose, it is a false positive -- tighten `has_note`.
  If a rich prose article does NOT have a note, it is a false negative -- loosen `has_note`.
- [ ] If tuning is needed, edit `flags.ts` thresholds and re-run. Re-run produces ON CONFLICT
  DO UPDATE rows (idempotent) and overwrites/creates/does-NOT-remove notes (the loader writes
  notes but does not delete files that are no longer `has_note=true`).
- [ ] Clean up stale notes from the first run if the rule was tightened:
  ```sql
  SELECT slug FROM community.clans WHERE has_note = FALSE;
  ```
  Then remove any `curated/clan-notes/<slug>.md` files whose slugs appear in that list:
  ```
  # Operator verifies the list before running rm
  bun apps/qw-oracle/scripts/load-community/clans/index.ts --slug <slug> --dry-run
  # Confirm notes=0 for each stale slug; then delete the file.
  ```
- [ ] Record the tuned counts in the SCHEMA.md footnote:
  ```
  bun apps/qw-oracle/scripts/load-community/clans/index.ts --limit 1 --slug Slackers
  ls apps/qw-oracle/curated/clan-notes/ | wc -l
  # Note the final count and update SCHEMA.md footnote.
  ```

**Verification:** per Task 8 steps above (SQL queries + file count).

**Execution mode:** inline -- operator-driven empirical work. The tuning judgment cannot be
subagent-delegated because the operator is the source of truth for content quality.

---

### Task 9 -- bunx tsc --noEmit + SCHEMA.md footnote

**Goal:** Confirm TypeScript is clean post-Phase-3 and SCHEMA.md has a row-count footnote on
`community.clans`.

**Files:**
- `apps/qw-oracle/SCHEMA.md` (modified)

**Steps:**

- [ ] Run TypeScript check:
  ```
  cd apps/qw-oracle && bunx tsc --noEmit
  ```
- [ ] Add a footnote to the `community.clans` entry in SCHEMA.md:
  ```
  Populated by Phase 3 clan loader (scripts/load-community/clans/index.ts).
  Expected row count: 822 (Category:Clans articles in 2026-05-04 snapshot).
  Clan notes emitted to curated/clan-notes/ (count tuned in Phase 3 Task 8 first run).
  ```

**Verification:**
```
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: exits 0
grep "822" apps/qw-oracle/SCHEMA.md
# PASS: footnote present
```

**Execution mode:** inline -- single `bunx tsc --noEmit` + one-line SCHEMA.md edit.

---

## Verification (phase boundary)

Run these commands after all tasks complete. Each has a PASS/FAIL condition.

**V1. community.clans populated:**
```sql
SELECT count(*) FROM community.clans;
```
PASS: returns 822 (confirmed count from Category:Clans in live recon).
FAIL: < 822 (some articles were skipped due to parse error or category mismatch).
NOTE: if the operator's Phase 0 re-fetch or snapshot fix changes the clan count, the PASS
condition should be updated to the new verified count. 822 is the live-recon figure.

**V2. source_template distribution sanity:**
```sql
SELECT source_template, count(*) FROM community.clans GROUP BY 1 ORDER BY 2 DESC;
```
PASS: returns rows for 'clan_info' (~500+), 'bullet_prose' (~280+), and 'none' (<20).
PASS: 'infobox_clan' appears with count ~2 (Apocalypse_2000, Dies_Ater).
PASS: 'infobox_4on4team' appears with count ~44 (per F10 live recon; CHECK accepts directly post-Phase-1-amendment).
FAIL: a source_template value other than the five CHECK-constrained values appears (CHECK
      violation indicates a NEW template variant beyond F10).

**V3. No clan note for a stub article:**
```sql
SELECT slug FROM community.clans WHERE is_substantive = FALSE AND has_note = TRUE;
```
PASS: empty result (no stub emits a note; the combination would indicate the is_substantive
      and has_note flags are not being computed independently per D5).
FAIL: any rows returned.

**V4. Clan-notes directory has the tuned count:**
```
ls apps/qw-oracle/curated/clan-notes/ | grep '\.md$' | wc -l
```
PASS: returns the tuned has_note count from Task 8. Operator confirms the count is plausible
      (expected: 200-400 substantive clan notes; exact range depends on Task 8 tuning).
FAIL: 0 (emitter did not run) or >600 (threshold likely too loose -- most stubs would have notes).

**V5. Prefix field is present for substantive Clan-info clans:**
```sql
SELECT count(*) FROM community.clans WHERE source_template = 'clan_info' AND prefix IS NOT NULL;
```
PASS: > 300 (most Clan-info clans carry a prefix field in the template).
FAIL: < 100 (prefix extraction is broken).

**V6. IRC fields present for Clan-info clans with irc data:**
```sql
SELECT count(*) FROM community.clans WHERE irc_channel IS NOT NULL;
```
PASS: > 200 (many early 2000s clans have IRC channel data in Clan-info template).
FAIL: < 50 (irc_channel extraction is broken or stripping too aggressively).

**V7. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.
FAIL: type errors printed.

**V8. Slackers spot-check:**
```sql
SELECT slug, prefix, nationality_iso, founded_year, has_note, is_substantive
FROM community.clans WHERE slug = 'Slackers';
```
PASS: `is_substantive = true`, `has_note = true`, `nationality_iso` is null or 'eu' (Slackers
      has no Clan-info, so nationality comes from Category:European Clans which maps 'european'
      -- verify whether iso-country.ts covers this demonym), `prefix` is null or '[SR]' if the
      title-fallback extracted it from the history text mentioning "]SR[".
NOTE: if Slackers has no extractable prefix from template or title, it may still qualify as
      substantive via `has_history=true` + `hasFounded` or `narrative_byte_length >= 500`.
      The key assertion is `is_substantive = true` and `has_note = true`.

**V9. SCHEMA.md footnote:**
```
grep "822" apps/qw-oracle/SCHEMA.md
```
PASS: line found.
FAIL: no match (footnote not added).

---

## Outputs to next phase

- `community.clans` is populated with 822 rows (one per `Category:Clans` article).
- `apps/qw-oracle/curated/clan-notes/` contains the tuned count of markdown notes.
- `apps/qw-oracle/scripts/load-community/clans/` contains the full parser pipeline.
- `getClanTitleToSlugMap()` is exported from `clans/index.ts` for Phase 5's cross-link backfill.
- `bunx tsc --noEmit` is clean.
- SCHEMA.md footnote on `community.clans` row count is current.
- Phase 4 (tournaments pilot) can begin.
- Phase 5 can use `getClanTitleToSlugMap()` to resolve clan_title -> slug in player_clan_eras.

---

## Open questions / deferred items

**Q1. Slackers category `Category:European Clans` -> nationality_iso.**
- **Question:** The `is-country.ts` lookup table (Phase 2) maps demonyms like 'Finnish', 'Swedish'
  etc. to ISO codes. `Category:European Clans` has demonym `European`. Does iso-country.ts map
  `european` to an ISO code? There is no ISO 3166-1 alpha-2 code for "Europe" as a political
  entity; some wiki pages use `eu` as a convention. Slackers has no Clan-info template, so
  `Category:European Clans` is the only nationality signal.
- **Default chosen for now:** `nationality = 'European'`, `nationality_iso = null` (no valid ISO
  for European as a political unit). The iso-country.ts table does not need to be extended with
  `european -> eu` -- that would misrepresent the country. If the operator wants a display
  nationality of 'European', that lives in `nationality` TEXT only, not in `nationality_iso`.
- **Who can resolve:** operator before or during Phase 3 execution. Low impact -- Slackers' row
  will have `nationality = 'European'` and `nationality_iso = null`, which is accurate.

**Q2. `infobox_4on4team` not in migration 008 CHECK constraint. RESOLVED 2026-05-05.**
- **Original question:** The parser produces `source_template = 'infobox_4on4team'` for ~44 clan articles. Migration 008's original CHECK enum did not include this value.
- **Resolution:** Phase 1 migration 008 amended 2026-05-05 to include `'infobox_4on4team'` in the CHECK enum BEFORE execution (same pattern as F9). No migration 010 is needed; no coercion shim is needed. The parser writes `'infobox_4on4team'` directly; the CHECK accepts it. See `review-findings.md` F10 for the full evidence trail.

**Q3. Clan article count: 822 vs spec's 829.**
- **Question:** The spec states 829 clan articles. Live recon of `Category:Clans` in the snapshot
  yields 822. The 7-article discrepancy is unresolved: possible causes include articles that are
  in redirects.json (redirects to Category:Clans members not stored as separate article files),
  articles that were in the article-list.json enumeration but failed to fetch, or the spec's 829
  being from a pre-Phase-0 count that included the 4 slug-collision duplicates.
- **Default chosen for now:** accept 822 as the accurate count from live recon (the snapshot
  files are the ground truth; Phase 0 fixed the manifest count). The PASS condition for V1 is
  822. If Phase 0 or Phase 1 executor discovers the true count is different, update V1's PASS
  condition before running Phase 3.
- **Who can resolve:** Phase 0 executor can verify the exact count by grepping Category:Clans
  from article-list.json and comparing to article files. If the discrepancy persists, it is
  likely redirects or talk pages that were counted in article-list.json but excluded by the
  article-file snapshotter.

**Q4. Infobox 4on4team `founder` field with nested `{{player|Nick|flag=}}` templates.**
- **Question:** The `founder` field in Infobox 4on4team can contain nested template calls like
  `{{player|BLooD_DoG|flag=ca}}<br />{{player|bogojoker|flag=us}}`. The `parseInfoboxFields`
  helper from Phase 2 handles one level of `{{...}}` nesting. Multi-player founders with multiple
  `{{player|...}}` calls are parsed at the field value level. The subagent must strip these nested
  templates to extract the player nick(s) as a comma-separated `founded_by` string.
- **Default chosen for now:** the `parseFounderField(s)` helper (defined inline in parse.ts)
  strips `{{player|Nick|...}}` patterns to extract `Nick`, joins multiple matches with `, `, and
  returns the result. This is a private helper not shared with shared/wiki-text.ts (it is specific
  to the Infobox 4on4team founder format).
- **Who can resolve:** resolved in Task 2 implementation. Not a blocker.

**Q5. Phase 5 cross-link backfill -- clan parser outputs available.**
- **Question:** Phase 5 parses player articles' `player_clan_eras` and needs to resolve
  `clan_title -> clan_slug` via `community.clans`. The `getClanTitleToSlugMap()` function
  exported from `clans/index.ts` (Task 7) provides this lookup. Phase 5 should import it.
  However, Phase 5 also processes players whose clan history references clans NOT in the wiki
  (externally-formed clans, typos, etc.); these resolve to `clan_slug = null` (soft reference
  per F8). The map covers wiki-named clans; anything not in the map stays null.
- **Default chosen for now:** the export is shipped in Task 7. Phase 5 drafter reads Task 7
  and imports from `clans/index.ts`. No open decision needed.
- **Who can resolve:** Phase 5 drafter. Flagged here for cross-phase awareness.

---

## Recovery (if verification fails)

**V1 fails (count < 822):**
Check the loader's warning count. If `warnings > 0`, some articles failed to JSON-parse. Identify
them via `grep -rn 'parse-fail' <loader-log>`. Fix JSON parse errors (unlikely if snapshot is
intact) or re-run with `--slug <problem-slug>`. If count is slightly off (e.g., 818), compare
`SELECT count(*) FROM community.clans` to `ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | xargs python3 -c "..." | grep Category:Clans | wc -l` to confirm the true file count.

**V2 fails (unexpected source_template value):**
The CHECK violation surfaces as a thrown error in upsert.ts. Check the loader log for which slug
triggered the error. The five accepted values are 'infobox_clan', 'clan_info',
'infobox_4on4team', 'bullet_prose', 'none' (post-F10 amendment). If a NEW template variant beyond
these five surfaces, treat it as F12+ -- amend Phase 1 migration 008 again BEFORE Phase 1
re-execution OR ship a new migration to widen the CHECK if Phase 1 has already shipped.

**V4 fails (clan-notes count = 0):**
Confirm `has_note = TRUE` exists in the DB:
```sql
SELECT count(*) FROM community.clans WHERE has_note = TRUE;
```
If count > 0 but files are missing, the `writeFileSync` in index.ts may have a path issue.
Check NOTES_DIR resolves to `apps/qw-oracle/curated/clan-notes/` (not player-notes/).

**V7 fails (TypeScript errors):**
Most likely a type mismatch on `ParsedClan.source_template` (the type union must include all five
CHECK-accepted values: `'infobox_clan' | 'clan_info' | 'infobox_4on4team' | 'bullet_prose' | 'none'`).
Run `bunx tsc --noEmit 2>&1 | head -30` to identify the specific error.

**Loader run fails with CHECK violation on status:**
A clan article uses a status value not in `('Active', 'Inactive', 'Disbanded', 'unknown')`. The
`normalizeClanStatus` function in parse.ts should catch all variants; if not, extend the
normalization table and add a test. If the new value is genuinely required, treat it as a new
finding (F12+) and amend Phase 1 migration 008 BEFORE Phase 1 re-execution (same pattern as F10),
OR ship a new migration to widen the status CHECK if Phase 1 has already shipped.

---

## Verification sub-agent dispatch (drafter runs after drafting, before operator review)

The following brief was dispatched to a verification sub-agent (Explore, Sonnet medium):

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-3-clans.md
Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec clan sections:
  /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md
Read the structural reference:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - Verify schema name is `community` (D2) for new tables.
   - Verify column types match common Postgres conventions.
   - Verify FK references are well-formed.

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
     exists.
   - For sample articles cited, spot-check the file actually exists.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only.

5. Every reference to existing code (load-knowledge/, serve/mcp/, db/):
   - Verify the path exists.
   - Verify the symbol or function name matches.

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode.
   - Flag tasks that are coded as `inline` but involve code synthesis,
     migration writing, or test authoring -- those should be subagent.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists.
   - Confirm this phase actually resolves the findings it claims to.

8. Every column / table introduced that is not in `decisions.md` and is not
   already in `apps/qw-oracle/SCHEMA.md`:
   - Flag as potential drift.

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing
    voice. Flag any.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

---

## Appendix: new findings to append to review-findings.md

The following findings were surfaced during Phase 3 drafting and should be appended to
`review-findings.md` by the planner in a groom pass before Phase 3 executes:

**F10 -- Infobox 4on4team is an undocumented third clan template variant (44 articles / 5.4%).**
Live recon of Category:Clans articles in the 2026-05-04 snapshot found 44 articles using
`{{Infobox 4on4team}}` -- not mentioned in the spec's "two template branches + Infobox clan rare"
framing. Field names differ from Clan-info: `team` for prefix, `flag` for nationality ISO, `created`
for founding date (year or "year, month"), `irc-channel` (hyphenated key), no disbanded field.
The `source_template` value for this branch is `'infobox_4on4team'`. Phase 1 migration 008 was
amended 2026-05-05 (F10 resolution) to include this value in the CHECK enum before execution;
the parser writes it directly with no shim required.
Phase: 3.

**F11 -- Actual Category:Clans article count is 822, not the spec's 829.**
Live recon counts 822 article files tagged `Category:Clans` in the 2026-05-04 snapshot. The
spec's 829 figure is unverified; the 7-article discrepancy is likely from redirects or talk-page
enumeration in article-list.json that were not stored as content files. Phase 3 V1 PASS condition
is set to 822. Phase 0 executor can verify by cross-referencing article-list.json with actual
files. Resolves via: Phase 3 V1 (accepted as accurate from file-system ground truth).
Phase: 3 (awareness).
