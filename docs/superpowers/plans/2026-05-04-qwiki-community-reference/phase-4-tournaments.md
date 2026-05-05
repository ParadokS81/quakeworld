# Phase 4 -- Tournaments pilot, schema migration 009, parser, row load, note emission

> **Drafter checklist:**
> 1. Read `decisions.md` (full). 20 decisions reviewed. D1 / D4 / D5 / D7 / D9 / D13 / D14 / D15 / D16 / D18 / D19 / D20 directly govern this phase. D6's player-specific 5-signal heuristic is replaced for tournaments by a tournament-shaped heuristic that the pilot proposes and the operator approves; D6's spirit (multi-signal recognition flag) carries over.
> 2. Read `review-findings.md`. F-numbers F6 and F8 are the awareness items for this phase. F6: spec DDL pre-D5; decisions.md is authoritative for column shape. F8: `tournament_results.tournament_slug` is a soft reference (no FK); Phase 4 must not introduce a hard FK.
> 3. Read spec sections: "Pilot findings" (player + clan template variants -- tournaments NOT pilot'd in brainstorm), "Schema -> community.tournaments" (placeholder columns only per D9), "Phase decomposition Phase 4 row", "Storage / curated layer reframe", "Decisions deferred to arc-planner / executor -> Tournament schema details".
> 4. Read snapshot manifest + 10 reference tournament articles spanning template variants + format families (see Section "Reference articles" below).
> 5. Read Phase 1 migration 008 (`apps/qw-oracle/db/migrations/008_community_schema.sql` -- inlined in `phase-1-curated-rename.md` Task 3) for the placeholder `community.tournaments` columns. Phase 4 ships migration 009 that ADDs columns; it does not redefine 008.
> 6. Read Phase 2 (`phase-2-players.md`) Tasks 2-8 as the loader-pattern exemplar. Phase 4 mirrors the parse / flags / upsert / emit-note / index shape, with a tournament-shaped pilot prepended that drives the schema for migration 009.
> 7. Read `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts` and `apps/qw-oracle/scripts/load-community/shared/iso-country.ts` (created in Phase 2). Tournament parser reuses them; Phase 4 adds two helpers (`parsePlayerTemplate`, `parseFlexDate`) under `shared/`.
> 8. Read `apps/qw-oracle/shared/db.ts` (single postgres-js client `db`; `closeDb()` exported).
> 9. After drafting, dispatch the verification sub-agent (Explore, Sonnet medium) per `phase-template.md` -- brief inlined at the bottom of this file.

---

## Goal

Phase 4 is the only phase in the arc with a designed-in LLM-shaped sub-deliverable. The pilot (Task 1) reads ~50 stratified tournament articles and produces a schema-discovery doc that drives migration 009's column list. Operator reviews and approves the doc before any schema-altering work begins. Tasks 2 through 11 then ship the deterministic pipeline end-to-end: migration 009 (ALTER TABLE adding tournament-specific columns), shared/ helper additions (`parsePlayerTemplate`, `parseFlexDate`), the multi-branch tournament parser (`{{Infobox league}}`, `{{Infobox lan}}`, NO_INFOBOX bullet-prose, prose fallback), `community.tournaments` row UPSERT, markdown note emission for `has_note=true` rows, the CLI dispatcher, the first full run with operator-driven `has_note` rule tuning, and the SCHEMA.md row-count footnote. At phase boundary: `community.tournaments` row count equals the size of the union of the seven tournament categories in the snapshot (~627 expected, pending pilot refinement); the curated tournament-notes directory contains the tuned set of `has_note=true` markdown notes; `bunx tsc --noEmit` is clean; the parser test fixtures pass against the ten reference articles. Phase 5 (cross-link backfill) can begin once row counts are operator-signed-off; Phase 5's tournament_results loader joins achievement strings against `community.tournaments.slug` for fuzzy matching.

---

## Inputs from previous phase

- Phase 0 complete: snapshot is finalized at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`. All slash-title articles use the uniform double-underscore slug scheme. Manifest counts are corrected.
- Phase 1 complete: migration 008 is applied; `community.tournaments` exists with the placeholder column set (`slug`, `title`, `has_note`, `is_substantive`, `is_stub`, `source_template`, `source_categories`, `wiki_revision_id`, `wiki_fetched_at`). `apps/qw-oracle/curated/tournament-notes/` exists as an empty directory with a `.gitkeep` placeholder.
- Phase 2 complete: `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts`, `shared/iso-country.ts`, and `shared/wiki-types.ts` exist and are tested. The loader-pattern (parse + flags + upsert + emit-note + CLI per type) is established under `apps/qw-oracle/scripts/load-community/players/`. `community.players` is populated.
- Phase 3 complete: `community.clans` is populated; `apps/qw-oracle/scripts/load-community/clans/` shipped on the same loader-pattern. Any helpers Phase 3 lifted to `shared/` are documented in `shared/CLAUDE.md` (or `load-community/CLAUDE.md`); Phase 4 reads that file before adding new helpers to avoid duplication.
- `bunx tsc --noEmit` is clean on the post-Phase-3 codebase.
- `DATABASE_URL` is set (operator-side).
- Bun is installed and on PATH.

---

## Files touched

### Created

```
docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md   # Task 1 deliverable; LLM-driven schema discovery report
apps/qw-oracle/db/migrations/009_tournament_columns.sql                                # Task 3 migration: ALTER community.tournaments adding tournament-specific columns
apps/qw-oracle/scripts/load-community/shared/date-parse.ts                             # parseFlexDate helper (multiple wiki date formats)
apps/qw-oracle/scripts/load-community/shared/date-parse.test.ts                        # bun test
apps/qw-oracle/scripts/load-community/tournaments/                                     # Phase 4 tournament module
apps/qw-oracle/scripts/load-community/tournaments/parse.ts                             # multi-branch wikitext parser; pure
apps/qw-oracle/scripts/load-community/tournaments/parse.test.ts                        # bun test against 10 fixture tournaments
apps/qw-oracle/scripts/load-community/tournaments/flags.ts                             # is_substantive (tournament-shaped) + has_note v1 + is_stub
apps/qw-oracle/scripts/load-community/tournaments/flags.test.ts                        # bun test
apps/qw-oracle/scripts/load-community/tournaments/upsert.ts                            # community.tournaments UPSERT; idempotent
apps/qw-oracle/scripts/load-community/tournaments/upsert.test.ts                       # bun test against qw_oracle_test
apps/qw-oracle/scripts/load-community/tournaments/emit-note.ts                         # frontmatter + body markdown emitter
apps/qw-oracle/scripts/load-community/tournaments/emit-note.test.ts                    # bun test
apps/qw-oracle/scripts/load-community/tournaments/index.ts                             # CLI dispatcher
apps/qw-oracle/curated/tournament-notes/<tuned count>.md                               # markdown notes emitted for has_note=true rows; final count tuned in Task 10
```

### Modified

```
apps/qw-oracle/scripts/load-community/shared/wiki-text.ts        # add parsePlayerTemplate helper for {{Player|<id>|flag=<iso>}} parsing
apps/qw-oracle/scripts/load-community/shared/wiki-text.test.ts   # add tests for parsePlayerTemplate
apps/qw-oracle/scripts/load-community/CLAUDE.md                  # document tournaments/ subdir + new shared helpers
apps/qw-oracle/SCHEMA.md                                         # update community.tournaments entry post-009 (column list expanded; row-count footnote added)
```

### Deleted

n/a -- no existing files deleted in this phase.

---

## Reference articles (10 stratified tournaments used as parser fixtures)

These are the test fixtures for `parse.test.ts` (Task 6) and the seed examples in the pilot (Task 1). Each is at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<slug>.json` with the slug below.

| Slug | Template | Why selected |
|---|---|---|
| `EQL_Season_1` | `{{Infobox league}}` | 4on4 league, modern infobox, structured format/admin/winners |
| `EQL_Season_12` | NO_INFOBOX | 4on4 league, older sibling, demonstrates branch-detection vs `EQL_Season_1` |
| `QHLAN_8` | `{{Infobox lan}}` | LAN event variant, capitalized field names (Industry / Founded / Employees), `date=5-9 Jan 2005` free-form |
| `QuakeCon_2017` | `{{Infobox league}}` | LAN event with `prizepoolusd=5,000` (numeric prize-pool extraction), `country=us`, `city=Dallas` |
| `Thunderdome_Season_5` | `{{Infobox league}}` | Online Seasonal League, four organizers via `{{Player\|<id>\|flag=<iso>}}` template, `team_number=108` |
| `Duelmania_3` | `{{Infobox league}}` | 1on1, `format=1on1`, multi-organizer, full winner / runner-up / third / `team_number=230` |
| `Sdcup3` | `{{Infobox league}}` | Race format (`format=Individual racing`), illustrates non-1on1/4on4/CTF mode discovery |
| `Kombat_DMM4` | `{{Infobox league}}` | DMM4 mode, modern PrizepoolSE template usage, illustrates mode-token extraction beyond the four common modes |
| `Swedish_Quake_League` | NO_INFOBOX (pure prose) | Pre-template era (1997), narrative-only, illustrates prose fallback branch and minimal extraction |
| `Polish_Duel_Season_2` | `{{Infobox league}}` with `tournaments=` alt | `tournaments=1on1` instead of `format=1on1` (alt field name); `sdate=2022.02.14` dot-separated date format |

The pilot (Task 1) draws a wider sample (~50 articles); these ten are the durable fixtures the parser is regression-tested against.

---

## Tasks

### Task 1 -- Pilot: stratified-sample schema discovery

**Goal:** Produce `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md`, a markdown report that surveys ~50 stratified tournament articles, enumerates template variants and field shapes, recommends migration 009's column list, recommends the tournament-shaped `is_substantive` heuristic, and recommends the `has_note` v1 rule. The pilot is the only LLM-shaped task in the arc per D4. Operator reviews the report and approves (or requests revisions to) the column list before Task 3 writes migration 009.

**Files:**
- `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md` (created)

**Steps:**

- [ ] Build the stratified sample programmatically. The selection script lives inline in this task (no committed artifact); the 50 selected slugs are listed in the pilot output's "Sample composition" section.

  Stratification rules (target):
  - 5 `{{Infobox lan}}` articles (sample from `Category:Offline Tournaments` + `Category:LAN Tournaments`).
  - 25 `{{Infobox league}}` articles, sub-stratified across `|type=` values: 12 `Online`, 6 `Offline`, 4 `Online Seasonal League`, 1 `Online Draft`, 2 with mode-edge-case `format=` values (Race, DMM4, CTF). Note: `|type=` value casing varies (`Online` vs `online`); the matcher lower-cases before grouping.
  - 12 NO_INFOBOX older bullet-prose articles (the EQL_Season_12 / Swedish_Quake_League shape).
  - 8 outlier / multi-mode / pure-prose articles (Clanbase, NQR_CMT_Season_1, etc.).

  Plus the 10 reference articles in the table above are guaranteed to be in the sample (some may overlap with stratification quotas; that is fine).

  Selection helper (Bun one-off; do NOT commit as a script -- single-use; runs from repo root). The helper is Bun per D14 (the D14 carve-out for Python applies to the snapshotter / extractors only; per-phase one-off scripts remain Bun):
  ```bash
  bun -e '
    import { readdirSync, readFileSync, existsSync } from "node:fs";
    import { resolve } from "node:path";

    const ARTICLES_DIR = "apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles";
    const TOURNAMENT_CATS = new Set([
      "Category:Online Tournaments", "Category:Team Tournaments", "Category:Leagues",
      "Category:Offline Tournaments", "Category:LAN Tournaments",
      "Category:Online Seasonal League Tournaments", "Category:Online Draft Tournaments",
    ]);

    // Deterministic seeded RNG (mulberry32) so repeated runs produce the same sample.
    function mulberry32(seed: number) {
      return function() {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rng = mulberry32(20260504);
    function sample<T>(arr: T[], n: number): T[] {
      const copy = arr.slice();
      const out: T[] = [];
      const take = Math.min(n, copy.length);
      for (let i = 0; i < take; i++) {
        const idx = Math.floor(rng() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    }

    type Bucket = "lan" | "league_online" | "league_offline" | "league_seasonal"
      | "league_draft" | "league_edge" | "no_infobox" | "outlier";
    const buckets: Record<Bucket, string[]> = {
      lan: [], league_online: [], league_offline: [], league_seasonal: [],
      league_draft: [], league_edge: [], no_infobox: [], outlier: [],
    };

    for (const f of readdirSync(ARTICLES_DIR).sort()) {
      let obj: any;
      try { obj = JSON.parse(readFileSync(resolve(ARTICLES_DIR, f), "utf8")); }
      catch { continue; }
      const cats = new Set<string>(obj.categories ?? []);
      let touchesTournament = false;
      for (const c of cats) if (TOURNAMENT_CATS.has(c)) { touchesTournament = true; break; }
      if (!touchesTournament) continue;
      const text: string = obj.wikitext ?? "";
      if (/\{\{[Ii]nfobox\s+lan\b/.test(text)) { buckets.lan.push(f); continue; }
      if (/\{\{[Ii]nfobox\s+league\b/.test(text)) {
        const m = text.match(/\|\s*type\s*=\s*([^\n|}]+)/);
        const t = (m?.[1] ?? "").trim().toLowerCase();
        const modeEdge = /\b(race|dmm4|ctf)\b/i.test(text.slice(0, 3000));
        if      (modeEdge)             buckets.league_edge.push(f);
        else if (t.includes("seasonal")) buckets.league_seasonal.push(f);
        else if (t.includes("draft"))  buckets.league_draft.push(f);
        else if (t.includes("offline") || t.includes("lan")) buckets.league_offline.push(f);
        else if (t.includes("online")) buckets.league_online.push(f);
        else                           buckets.outlier.push(f);
        continue;
      }
      if (/^\*\s*'\'\'/.test(text) || /\n\*\s*'\'\'/.test(text)) buckets.no_infobox.push(f);
      else                                                       buckets.outlier.push(f);
    }

    const quotas: Record<Bucket, number> = {
      lan: 5, league_online: 12, league_offline: 6, league_seasonal: 4,
      league_draft: 1, league_edge: 2, no_infobox: 12, outlier: 8,
    };
    const picked = new Set<string>();
    for (const [k, n] of Object.entries(quotas) as [Bucket, number][]) {
      for (const f of sample(buckets[k], n)) picked.add(f);
    }
    const FIXTURES = [
      "EQL_Season_1.json", "EQL_Season_12.json", "QHLAN_8.json",
      "QuakeCon_2017.json", "Thunderdome_Season_5.json", "Duelmania_3.json",
      "Sdcup3.json", "Kombat_DMM4.json", "Swedish_Quake_League.json",
      "Polish_Duel_Season_2.json",
    ];
    for (const fx of FIXTURES) {
      if (existsSync(resolve(ARTICLES_DIR, fx))) picked.add(fx);
    }
    for (const f of [...picked].sort()) console.log(f);
  '
  ```

  Capture the printed list as the pilot's input. The list goes into the pilot output's "Sample composition" section verbatim.

- [ ] Dispatch the pilot subagent. The subagent reads each sampled article (raw `wikitext` field of the JSON envelope), builds a per-template field-frequency table, and synthesizes findings into `phase-4-pilot-output.md`. The subagent is allowed to read source files and write the output markdown; it does NOT modify any other repo files and does NOT execute SQL or run other scripts.

  Pilot subagent dispatch shape (run from the executor terminal):
  ```
  Tool: Agent
  subagent_type: general-purpose
  model: opus
  description: "Tournament schema discovery pilot"
  prompt: |
    You are doing a one-time schema-discovery pilot for the QWiki
    community-reference arc, Phase 4 (tournaments).

    Working directory: /home/paradoks/projects/quakeworld

    Read the following files first:
    - docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
      (note D9: tournament schema is genuinely TBD; D6: substantive heuristic
      shape; D7: has_note v1 rule shipped in this phase)
    - docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md
      (sections: Schema -> community.tournaments, Phase decomposition Phase 4)
    - docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md
      (loader-pattern exemplar; flags.ts shape; has_note tuning protocol)

    Then read all 50 sampled tournament articles at
    apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<slug>.json
    (the operator pastes the slug list when invoking this prompt).

    Produce
    docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
    with these sections in order:

    1. Sample composition -- the 50 slugs grouped by bucket (Infobox lan,
       Infobox league by type=, NO_INFOBOX, outlier).

    2. Template variants -- for each of {Infobox league, Infobox lan,
       NO_INFOBOX, prose fallback}: occurrence count, full field-frequency
       table (field name -> percent of articles in this bucket where the
       field is present and non-empty), top 5 example articles for each.

    3. Field-to-column proposal -- a recommended migration 009 column list.
       Each row: column name (snake_case), Postgres type, source field(s)
       in the wikitext, NULL semantics, CHECK constraint candidates,
       example value extracted from one or more sample articles. Group
       columns by lifecycle: identity, schedule, format/mode, prizes,
       organizers/admins, location/venue, online presence, results,
       maps. Indicate which columns the cross-link table community.tournament_results
       indirectly depends on (notably: year, mode -- so achievement-string
       fuzzy matching in Phase 5 has a target field).

    4. Edge cases observed -- enumerate at least:
       - Date-format variants in sdate / edate / date / Founded fields
       - Mode-token variants (1on1 vs 1v1 vs Duel; 4on4 vs 4v4; DMM4; FFA;
         Race; CTF; mixed)
       - Series-name extraction signals (Navbox templates like
         {{EQL navbox}}, {{NQR Navbox}}; series= field; title prefix)
       - Season-number extraction signals (title regex /Season \d+/,
         /S\d+/, /Volume \d+/, /Cup \d+/)
       - Country / city / venue patterns (LAN events only)
       - Prize-pool variants ($N,N00 / N USD / N EUR / "Fame and glory" /
         empty / "$500,00" comma-misuse)
       - Organizer template variants ({{Player|id|flag=xx}} vs
         {{player|id|flag=xx}} vs raw [[Wikilink]] vs plain text)
       - Multi-mode tournaments (events with both 1on1 and 4on4 brackets)
       - "Pages under construction" Category articles (incomplete data;
         must be loaded but tagged)
       - Match-report leakage (Category:Leagues members that are actually
         match reports per F-style, e.g., 'EQL1 Final FS-F0M' -- if any
         appear in the sample, recommend an exclusion rule)

    5. is_substantive heuristic -- recommend the tournament-shaped
       multi-signal rule. The player heuristic is real_name/aliases/
       clan_history/achievements/prose; tournament shape is different.
       Suggested signal candidates (refine empirically):
       - organizer / admin field present and non-empty
       - sdate or edate or year present
       - winner team identifiable (teamfirst/idfirst non-empty OR
         ==Final== section names a team)
       - format and mode both identifiable
       - >= 200B narrative prose between infobox and first ==Section==
       - Bracket / Results section non-empty
       Recommend: which N of which set; report observed precision/recall
       against the sample (eyeballing 50 articles).

    6. has_note v1 rule -- recommend the prose-content gate.
       Player rule was: narrative_intro >= 500B OR Quotes/Trivia non-trivial
       OR mouse_settings_present OR crosshair_present OR media OR gallery>1.
       Tournament shape is different (no mouse settings; rules / format /
       gallery / bracket-image / prize-pool-prose are the candidates).
       Recommend a v1 rule plus the empirical justification.

    7. Open questions for operator -- enumerate any decisions that the
       pilot surfaces but cannot resolve alone (e.g., "should multi-mode
       tournaments be one row or split into two rows by mode?").

    Discipline:
    - ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash.
    - Cite specific article slugs for every claim ("16 of 25 Infobox league
      articles set series=; the other 9 set it via {{<Series> Navbox}}
      template, e.g., Sdcup3 uses {{Sdcup Navbox}}").
    - Length follows from the work; don't compress claims to fit a target
      word count. The output document is what the operator approves; brevity
      that elides edge cases is the wrong move.
    - Do NOT propose column shapes that contradict decisions.md (e.g.,
      do not propose JSONB columns that would re-introduce the F1
      pre-stringification regression -- recommend TEXT[] instead).

    Halt when the document is written. Report the path back to the
    dispatching session.
  ```

  The dispatch is one-shot. The operator may need to manually compose the slug list (output of the selection helper above) into the prompt. Alternatively, the subagent runs the selection helper itself (the operator can include "build the sample yourself using the selection rule below" in the prompt body); document choice in the pilot output's "Sample composition" section.

- [ ] HALT after pilot output is written. The operator opens `phase-4-pilot-output.md`, reads the column proposal, the heuristic recommendation, and the open questions. Operator either:
  - Approves -> Task 3 writes migration 009 against the approved column list.
  - Requests revisions -> the pilot subagent is re-dispatched with the revision prompt; or the operator hand-edits the document.

  Do NOT proceed to Task 3 until operator signs off in writing (commit message, conversation, or annotation in the pilot output).

**Verification:**
```
ls docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
# PASS: file exists
wc -l docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
# PASS: >= 200 lines (sanity floor; the report covers 7 sections of substance)
grep -c '^##' docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
# PASS: >= 7 (one heading per top-level section)
```

**Execution mode:** subagent (Opus MAX) -- schema-discovery synthesis from 50 articles spanning 25+ years of editorial drift. The reasoning is multi-axis: template variant identification, field-frequency tabulation, column-shape derivation, heuristic threshold derivation, edge-case enumeration. Architecture-level synthesis; Opus MAX is the right ceiling because the cost of a bad column list is migration 009 + parser drift + downstream Phase 5/6/7 rework. The dispatching subagent is permitted to read source files and write the single pilot output file; it does not modify other repo files or run live SQL.

---

### Task 2 -- Operator review gate (no code; documented halt)

**Goal:** Capture the operator's column-list approval before any schema-altering work begins. This is a mandatory gate per D9 (tournament schema is genuinely TBD until the pilot ships).

**Files:** none (review-only).

**Steps:**

- [ ] Operator reads `phase-4-pilot-output.md` end-to-end.
- [ ] Operator confirms or revises:
  - The recommended migration 009 column list (column names, types, CHECK constraints).
  - The recommended `is_substantive` heuristic (signals + threshold).
  - The recommended `has_note` v1 rule.
  - Any pilot-surfaced open questions.
- [ ] Operator records approval. Acceptable forms:
  - Conversation message ("approved; proceed to Task 3").
  - Annotation block at the top of the pilot output reading `Approved by operator on YYYY-MM-DD; column list locked.`
  - Commit message reference.

  Whichever the operator picks, it is the sign-off boundary. The next task does not execute without it.

- [ ] If revisions are requested: the pilot subagent re-runs (Task 1 dispatch repeats) OR the operator hand-edits the pilot output. Either way, this gate re-fires: no advance until approval is recorded.

**Verification:**
```
# Operator-recorded approval; check by reading the pilot output for the approval line OR by checking conversation context.
grep -i "approved" docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
# PASS: at least one match (the approval annotation), OR operator confirms verbally in the conversation.
```

**Execution mode:** inline -- operator-driven review and sign-off; no code synthesis. The execution session reads the pilot output, surfaces it to the operator, and waits.

---

### Task 3 -- Write migration 009 (ALTER TABLE community.tournaments)

**Goal:** Produce `apps/qw-oracle/db/migrations/009_tournament_columns.sql` adding the operator-approved tournament-specific columns to `community.tournaments`. The column list comes from the approved Task 1 pilot output; this task does not invent column names. Append-only per D15. Drafter awareness: the column list below is a PLACEHOLDER SKELETON drafted from pre-pilot recon (the spec sketch + my inspection of 8 articles). The pilot output supersedes this skeleton; if the pilot's approved list differs, use the pilot's list verbatim. The skeleton exists so the verification sub-agent has a starting point to compare against -- not as the locked migration.

**Files:**
- `apps/qw-oracle/db/migrations/009_tournament_columns.sql` (created)

**Steps:**

- [ ] Read the operator-approved column list from `phase-4-pilot-output.md`'s "Field-to-column proposal" section.

- [ ] Author `apps/qw-oracle/db/migrations/009_tournament_columns.sql`. The migration uses `ALTER TABLE community.tournaments ADD COLUMN ... ` statements (one per column), then `CREATE INDEX` statements for any indexes the pilot recommends.

  Skeleton (drafter pre-pilot recon; replace with pilot-approved list):

  ```sql
  -- apps/qw-oracle/db/migrations/009_tournament_columns.sql
  -- Phase 4 (QWiki community-reference arc): tournament-specific columns.
  --
  -- D9: tournament schema is genuinely TBD until the Phase 4 pilot surfaces
  --     template variants. This migration ALTERs community.tournaments
  --     (created in 008) to add the operator-approved column list from
  --     docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md.
  -- D15: append-only. Never edit this file after it is applied.
  -- D19: TEXT[] columns receive JS arrays directly via postgres-js; no
  --      JSONB columns are added in this migration (per F1 regression gate).

  -- Identity / series
  ALTER TABLE community.tournaments ADD COLUMN series         TEXT;
  ALTER TABLE community.tournaments ADD COLUMN season_number  INT;
  ALTER TABLE community.tournaments ADD COLUMN year           INT;

  -- Format / mode
  ALTER TABLE community.tournaments ADD COLUMN tournament_type TEXT
    CHECK (tournament_type IS NULL
           OR tournament_type IN ('online', 'offline', 'lan',
                                  'online_seasonal_league',
                                  'online_draft', 'mixed', 'unknown'));
  ALTER TABLE community.tournaments ADD COLUMN format         TEXT;
  ALTER TABLE community.tournaments ADD COLUMN mode           TEXT
    CHECK (mode IS NULL
           OR mode IN ('1on1', '2on2', '4on4', 'CTF', 'FFA', 'DMM4',
                       'Race', 'mixed', 'unknown'));

  -- Schedule
  ALTER TABLE community.tournaments ADD COLUMN start_date     DATE;
  ALTER TABLE community.tournaments ADD COLUMN end_date       DATE;

  -- Prizes
  ALTER TABLE community.tournaments ADD COLUMN prize_pool     TEXT;
  ALTER TABLE community.tournaments ADD COLUMN prize_pool_usd INT;

  -- Organizers / admins
  ALTER TABLE community.tournaments ADD COLUMN organizers     TEXT[];
  ALTER TABLE community.tournaments ADD COLUMN admins         TEXT[];
  ALTER TABLE community.tournaments ADD COLUMN founder        TEXT;

  -- Location (LAN-relevant)
  ALTER TABLE community.tournaments ADD COLUMN country        TEXT;
  ALTER TABLE community.tournaments ADD COLUMN country_iso    TEXT;
  ALTER TABLE community.tournaments ADD COLUMN city           TEXT;
  ALTER TABLE community.tournaments ADD COLUMN venue          TEXT;

  -- Online presence
  ALTER TABLE community.tournaments ADD COLUMN website        TEXT;
  ALTER TABLE community.tournaments ADD COLUMN twitch_handle  TEXT;
  ALTER TABLE community.tournaments ADD COLUMN youtube_handle TEXT;
  ALTER TABLE community.tournaments ADD COLUMN discord_url    TEXT;
  ALTER TABLE community.tournaments ADD COLUMN irc_channel    TEXT;

  -- Participation
  ALTER TABLE community.tournaments ADD COLUMN team_count     INT;

  -- Results (top four)
  ALTER TABLE community.tournaments ADD COLUMN winner          TEXT;
  ALTER TABLE community.tournaments ADD COLUMN winner_flag     TEXT;
  ALTER TABLE community.tournaments ADD COLUMN runner_up       TEXT;
  ALTER TABLE community.tournaments ADD COLUMN runner_up_flag  TEXT;
  ALTER TABLE community.tournaments ADD COLUMN third_place     TEXT;
  ALTER TABLE community.tournaments ADD COLUMN third_place_flag TEXT;
  ALTER TABLE community.tournaments ADD COLUMN fourth_place    TEXT;
  ALTER TABLE community.tournaments ADD COLUMN fourth_place_flag TEXT;

  -- Maps
  ALTER TABLE community.tournaments ADD COLUMN maps           TEXT[];

  -- Indexes
  CREATE INDEX community_tournaments_series        ON community.tournaments (series)
    WHERE series IS NOT NULL;
  CREATE INDEX community_tournaments_year          ON community.tournaments (year)
    WHERE year IS NOT NULL;
  CREATE INDEX community_tournaments_mode          ON community.tournaments (mode)
    WHERE mode IS NOT NULL;
  CREATE INDEX community_tournaments_type          ON community.tournaments (tournament_type)
    WHERE tournament_type IS NOT NULL;
  CREATE INDEX community_tournaments_is_substantive ON community.tournaments (is_substantive)
    WHERE is_substantive = TRUE;
  ```

  **If the pilot's approved column list adds, removes, or renames any of the columns above:** use the pilot's list. Do not silently merge the skeleton with the pilot.

- [ ] Apply the migration locally:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/db/migrate.ts
  # Expected: logs "[migrate] applying 009_tournament_columns.sql" with no errors
  ```

- [ ] Verify columns exist:
  ```sql
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'community' AND table_name = 'tournaments'
  ORDER BY ordinal_position;
  ```
  Expected: the original Phase 1 placeholder columns plus the operator-approved additions.

**Verification:**
```
bun apps/qw-oracle/db/migrate.ts
# PASS: applies cleanly
psql -d $PGDATABASE -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='community' AND table_name='tournaments'"
# PASS: count >= 9 (Phase 1 placeholders) + N (Task 3 additions). Verify exact count post-pilot.
```

**Execution mode:** subagent (Sonnet medium) -- SQL synthesis from a structured input (the operator-approved column list). Schema judgment is in CHECK constraints + index choices + column type alignment with existing 008 conventions. Sonnet medium is sufficient because the column list is given; the synthesis is constrained.

---

### Task 4 -- Add shared helpers: parsePlayerTemplate + parseFlexDate

**Goal:** Land two shared helpers needed by the tournament parser. `parsePlayerTemplate` parses `{{Player|<id>|flag=<iso>}}` (case-insensitive) and is also useful for Phase 5 cross-link backfill (achievement-team rows). `parseFlexDate` parses the wiki's many date formats (`2015-10-14`, `2022.02.14`, `5-9 Jan 2005`, `4 April`, etc.) into a normalized `Date` or null.

**Files:**
- `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts` (modified -- add `parsePlayerTemplate`)
- `apps/qw-oracle/scripts/load-community/shared/wiki-text.test.ts` (modified -- add `parsePlayerTemplate` tests)
- `apps/qw-oracle/scripts/load-community/shared/date-parse.ts` (created)
- `apps/qw-oracle/scripts/load-community/shared/date-parse.test.ts` (created)

**Steps:**

- [ ] Add `parsePlayerTemplate` to `shared/wiki-text.ts`:

  ```ts
  // Parses a {{Player|<id>|flag=<iso>}} or {{player|<id>|flag=<iso>}} template
  // string and returns the structured fields. Case-insensitive on the template
  // name. Used by the tournament parser (organizer / admin / founder fields)
  // and by Phase 5 cross-link backfill (achievement-team parsing).
  //
  // Returns null if the input does not match the {{Player|...}} shape.
  // Multi-line variants and nested templates (e.g.,
  // {{player|VVD|flag=ru}}<br />{{player|dirtbox|flag=au}}) are split externally
  // by the caller -- this function parses ONE template at a time.
  export interface PlayerTemplateRef {
    name: string;        // the first positional arg (player id)
    flag: string | null; // the |flag= named arg, lowercased; null if absent
    raw:  string;        // the original template text, for round-trip / debug
  }

  export function parsePlayerTemplate(text: string): PlayerTemplateRef | null {
    const m = text.match(/^\s*\{\{\s*[Pp]layer\s*\|([^|}]+)((?:\|[^}]*)*)\}\}\s*$/);
    if (!m) return null;
    const name = m[1].trim();
    const rest = m[2] ?? '';
    const flagMatch = rest.match(/\|\s*flag\s*=\s*([a-zA-Z]{2})\b/);
    const flag = flagMatch ? flagMatch[1].toLowerCase() : null;
    return { name, flag, raw: text };
  }

  // Helper for callers that want to enumerate all {{Player|...}} templates
  // in a multi-template field like organizer={{player|A|flag=x}}<br />{{player|B|flag=y}}.
  export function extractPlayerTemplates(text: string): PlayerTemplateRef[] {
    const regex = /\{\{\s*[Pp]layer\s*\|[^}]*\}\}/g;
    const out: PlayerTemplateRef[] = [];
    for (const m of text.matchAll(regex)) {
      const ref = parsePlayerTemplate(m[0]);
      if (ref) out.push(ref);
    }
    return out;
  }
  ```

- [ ] Add tests to `shared/wiki-text.test.ts`:

  ```ts
  import { parsePlayerTemplate, extractPlayerTemplates } from './wiki-text';

  test('parsePlayerTemplate parses {{Player|VVD|flag=ru}}', () => {
    const r = parsePlayerTemplate('{{Player|VVD|flag=ru}}');
    expect(r).toEqual({ name: 'VVD', flag: 'ru', raw: '{{Player|VVD|flag=ru}}' });
  });

  test('parsePlayerTemplate is case-insensitive on the template name', () => {
    const r = parsePlayerTemplate('{{player|samon|flag=pl}}');
    expect(r?.name).toBe('samon');
    expect(r?.flag).toBe('pl');
  });

  test('parsePlayerTemplate returns null on non-Player template', () => {
    expect(parsePlayerTemplate('{{Flag/se}}')).toBeNull();
  });

  test('parsePlayerTemplate handles missing flag', () => {
    const r = parsePlayerTemplate('{{Player|Bethesda}}');
    expect(r?.name).toBe('Bethesda');
    expect(r?.flag).toBeNull();
  });

  test('extractPlayerTemplates enumerates multi-template fields', () => {
    const refs = extractPlayerTemplates(
      '{{player|VVD|flag=ru}}<br />{{player|dirtbox|flag=au}}<br />{{player|phil|flag=us}}'
    );
    expect(refs.length).toBe(3);
    expect(refs.map((r) => r.name)).toEqual(['VVD', 'dirtbox', 'phil']);
    expect(refs.map((r) => r.flag)).toEqual(['ru', 'au', 'us']);
  });
  ```

- [ ] Author `shared/date-parse.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/shared/date-parse.ts
  //
  // Flexible date parser for wiki tournament fields. The wiki uses many
  // formats; this helper normalizes to Date | null. Year-only and
  // month-only inputs return null (use parseYear from wiki-text.ts for those).
  //
  // Recognized inputs:
  //   '2015-10-14'         -> Date(2015, 9, 14)
  //   '2022.02.14'         -> Date(2022, 1, 14)
  //   '2003-06-09'         -> Date(2003, 5, 9)
  //   '5-9 Jan 2005'       -> Date(2005, 0, 5)   (range start; end caller-side if needed)
  //   '5 Jan 2005'         -> Date(2005, 0, 5)
  //   '4 April'            -> null (year missing)
  //   'October 14, 2015'   -> Date(2015, 9, 14)
  //   '14 October 2015'    -> Date(2015, 9, 14)

  const MONTHS: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  export function parseFlexDate(input: string): Date | null {
    if (!input) return null;
    const s = input.trim();
    if (!s) return null;

    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (m) {
      const [_, y, mo, d] = m;
      const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
      return Number.isNaN(date.getTime()) ? null : date;
    }

    // Range: '5-9 Jan 2005' -> take start
    m = s.match(/^(\d{1,2})\s*[-]\s*\d{1,2}\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const [_, d, mon, y] = m;
      const moIdx = MONTHS[mon.toLowerCase()];
      if (moIdx !== undefined) {
        return new Date(Date.UTC(Number(y), moIdx, Number(d)));
      }
    }

    // 'D Month YYYY' or 'DD Month YYYY'
    m = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const [_, d, mon, y] = m;
      const moIdx = MONTHS[mon.toLowerCase()];
      if (moIdx !== undefined) {
        return new Date(Date.UTC(Number(y), moIdx, Number(d)));
      }
    }

    // 'Month D, YYYY' / 'Month DD YYYY'
    m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const [_, mon, d, y] = m;
      const moIdx = MONTHS[mon.toLowerCase()];
      if (moIdx !== undefined) {
        return new Date(Date.UTC(Number(y), moIdx, Number(d)));
      }
    }

    // Year-only / month-only / unparseable -> null
    return null;
  }

  // Returns { start, end } for range strings like '5-9 Jan 2005' or
  // 'October 14-16, 2017'. If the input is a single date, end equals start.
  // Returns null if neither end can be parsed.
  export function parseFlexDateRange(input: string): { start: Date; end: Date } | null {
    if (!input) return null;
    const s = input.trim();

    let m = s.match(/^(\d{1,2})\s*[-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (m) {
      const [_, d1, d2, mon, y] = m;
      const moIdx = MONTHS[mon.toLowerCase()];
      if (moIdx === undefined) return null;
      return {
        start: new Date(Date.UTC(Number(y), moIdx, Number(d1))),
        end:   new Date(Date.UTC(Number(y), moIdx, Number(d2))),
      };
    }

    const single = parseFlexDate(s);
    if (single) return { start: single, end: single };
    return null;
  }
  ```

- [ ] Author `shared/date-parse.test.ts`:

  ```ts
  import { parseFlexDate, parseFlexDateRange } from './date-parse';

  test('parseFlexDate handles ISO-like YYYY-MM-DD', () => {
    expect(parseFlexDate('2015-10-14')?.toISOString().slice(0, 10)).toBe('2015-10-14');
  });

  test('parseFlexDate handles YYYY.MM.DD dot-separated', () => {
    expect(parseFlexDate('2022.02.14')?.toISOString().slice(0, 10)).toBe('2022-02-14');
  });

  test('parseFlexDate handles "D Month YYYY"', () => {
    expect(parseFlexDate('5 Jan 2005')?.toISOString().slice(0, 10)).toBe('2005-01-05');
  });

  test('parseFlexDate handles "Month D, YYYY"', () => {
    expect(parseFlexDate('October 14, 2015')?.toISOString().slice(0, 10)).toBe('2015-10-14');
  });

  test('parseFlexDate returns range start for "D-D Month YYYY"', () => {
    expect(parseFlexDate('5-9 Jan 2005')?.toISOString().slice(0, 10)).toBe('2005-01-05');
  });

  test('parseFlexDate returns null for year-only', () => {
    expect(parseFlexDate('2024')).toBeNull();
  });

  test('parseFlexDate returns null for month-only', () => {
    expect(parseFlexDate('4 April')).toBeNull();
  });

  test('parseFlexDate returns null for empty', () => {
    expect(parseFlexDate('')).toBeNull();
    expect(parseFlexDate('   ')).toBeNull();
  });

  test('parseFlexDateRange returns start/end for "5-9 Jan 2005"', () => {
    const r = parseFlexDateRange('5-9 Jan 2005');
    expect(r?.start.toISOString().slice(0, 10)).toBe('2005-01-05');
    expect(r?.end.toISOString().slice(0, 10)).toBe('2005-01-09');
  });

  test('parseFlexDateRange single date -> start equals end', () => {
    const r = parseFlexDateRange('2015-10-14');
    expect(r?.start.getTime()).toBe(r?.end.getTime());
  });
  ```

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/shared/`. All tests pass.
- [ ] Run `cd apps/qw-oracle && bunx tsc --noEmit`. Zero type errors.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/shared/
# PASS: all wiki-text + iso-country + date-parse tests pass
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: zero type errors
```

**Execution mode:** subagent (Sonnet medium) -- well-bounded helper synthesis with full content shipped above. Date-parsing edge cases and template-regex disambiguation justify Sonnet medium over Haiku; the implementation is constrained, the judgment is in test coverage of date variants.

---

### Task 5 -- Build tournaments/parse.ts (multi-branch wikitext parser)

**Goal:** Land the central parser for tournament articles. Input: a `WikiArticle` envelope. Output: a rich `ParsedTournament` object covering every column added in migration 009 plus body sections for the note emitter. The parser handles four branches: `{{Infobox league}}` (dominant modern, ~63% of corpus per Task 1 pilot), `{{Infobox lan}}` (LAN events, ~5%), NO_INFOBOX bullet-prose (older style, ~20%), prose fallback (the rest). Pure -- no IO, no DB.

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/parse.ts` (created)

**Steps:**

- [ ] Author `parse.ts`. Exported shape (the column-list-aligned interface; if pilot output approves additional columns, the interface gains the corresponding fields):

  ```ts
  import type { WikiArticle } from '../shared/wiki-types';
  import {
    extractInfoboxBlock,
    parseInfoboxFields,
    extractSectionBody,
    stripWikiMarkup,
    extractPlayerTemplates,
    parsePlayerTemplate,
  } from '../shared/wiki-text';
  import { parseFlexDate, parseFlexDateRange } from '../shared/date-parse';
  import {
    nationalityToIso,
    countryToNationality,
    ISO_TO_NATIONALITY,
  } from '../shared/iso-country';

  export type TournamentTemplate = 'infobox_league' | 'infobox_lan' | 'bullet_prose' | 'none';

  export type TournamentTypeEnum =
    | 'online'
    | 'offline'
    | 'lan'
    | 'online_seasonal_league'
    | 'online_draft'
    | 'mixed'
    | 'unknown';

  export type ModeEnum =
    | '1on1'
    | '2on2'
    | '4on4'
    | 'CTF'
    | 'FFA'
    | 'DMM4'
    | 'Race'
    | 'mixed'
    | 'unknown';

  export interface ParsedTournament {
    // Identity
    slug: string;
    title: string;
    series: string | null;
    season_number: number | null;

    // Schedule
    year: number | null;
    start_date: string | null;     // ISO YYYY-MM-DD; postgres-js binds string -> DATE natively
    end_date: string | null;

    // Format / mode
    tournament_type: TournamentTypeEnum | null;
    format: string | null;         // free-form (e.g., 'Seeded Double-Elimination Bracket')
    mode: ModeEnum | null;

    // Prizes
    prize_pool: string | null;
    prize_pool_usd: number | null;

    // Organizers / admins
    organizers: string[];
    admins: string[];
    founder: string | null;

    // Location (LAN-relevant)
    country: string | null;
    country_iso: string | null;
    city: string | null;
    venue: string | null;

    // Online presence
    website: string | null;
    twitch_handle: string | null;
    youtube_handle: string | null;
    discord_url: string | null;
    irc_channel: string | null;

    // Participation
    team_count: number | null;

    // Results (top four)
    winner: string | null;
    winner_flag: string | null;
    runner_up: string | null;
    runner_up_flag: string | null;
    third_place: string | null;
    third_place_flag: string | null;
    fourth_place: string | null;
    fourth_place_flag: string | null;

    // Maps
    maps: string[];

    // Provenance
    source_template: TournamentTemplate;
    source_categories: string[];
    wiki_revision_id: number;
    wiki_fetched_at: string;        // ISO 8601

    // Body content (consumed by emit-note when has_note=true)
    narrative_intro: string;        // pre-infobox / pre-first-section prose
    format_section: string;         // ==Format== body
    rules_section: string;          // ==Rules== / ==Settings, Rules, Maps== body
    bracket_section: string;        // ==Bracket== / ==Playoffs== body
    results_section: string;        // ==Results== body
    participants_section: string;   // ==Participants== / ==Signups== body
    prize_pool_section: string;     // ==Prize Pool== body
    gallery_section: string;        // ==Gallery== body
    broadcast_section: string;      // ==Broadcast Talent== / ==Broadcast== body
    links_section: string;          // ==Links== body
    other_section_count: number;    // count of other ==Section== headings (signal for has_note)
  }

  export function parseTournament(article: WikiArticle): ParsedTournament {
    // ... see step-by-step below
  }
  ```

  Step-by-step parse flow (the function body):

  1. **Pre-flight:** `slug = article.slug` (CLI populates from filename; same convention as Phase 2). `title = article.title`. Compute `source_categories = article.categories`.

  2. **Template detection:**
     - If `{{Infobox league` matches (case-insensitive) -> `source_template = 'infobox_league'`.
     - Else if `{{Infobox lan` matches -> `source_template = 'infobox_lan'`.
     - Else if at least 2 of `* '''Website:'''`, `* '''Gametype:'''`, `* '''Admin:'''`, `* '''Format:'''`, `* '''Number of teams:'''` are present -> `source_template = 'bullet_prose'`.
     - Else -> `source_template = 'none'`.

  3. **Branch dispatch:**
     - `infobox_league` -> `parseInfoboxLeagueBranch(wikitext)`.
     - `infobox_lan` -> `parseInfoboxLanBranch(wikitext)`.
     - `bullet_prose` -> `parseBulletProseBranch(wikitext)`.
     - `none` -> `parseProseFallbackBranch(wikitext)`.

     Each branch returns a partial `ParsedTournament` shape (the fields that branch can populate). Branch-agnostic post-processing fills body sections, year inference, mode/series extraction.

  4. **Branch: `parseInfoboxLeagueBranch`** (Thunderdome / EQL / Duelmania / QuakeCon / Sdcup / Kombat-style):
     - Extract block via `extractInfoboxBlock(wikitext, 'Infobox league')`.
     - `parseInfoboxFields(block)` -> field map.
     - **Identity:**
       - `series = fields.series.trim() || null` (if empty, drop to navbox-template inference in branch-agnostic post-processing).
     - **Schedule:**
       - `start_date = parseFlexDate(fields.sdate)?.toISOString().slice(0,10) || null`.
       - `end_date = parseFlexDate(fields.edate)?.toISOString().slice(0,10) || null`.
       - If `fields.date` is present and `sdate`/`edate` both null, parse `date` and set both `start_date`/`end_date` to that single date (or to range bounds via `parseFlexDateRange`).
       - `year = Number(fields.year) || (start_date ? new Date(start_date).getUTCFullYear() : null)`.
     - **Format / mode:**
       - `tournament_type = normalizeTournamentType(fields.type)`. Lower-cases `fields.type`; maps `'online'`->`'online'`, `'offline'`->`'offline'`, `'online seasonal league'`->`'online_seasonal_league'`, `'online draft'`->`'online_draft'`, `'lan'`->`'lan'`, anything else -> `'unknown'`.
       - `format = fields.format.trim() || null`. Free-form passthrough.
       - `mode = extractMode(fields.format, fields.tournaments, title, source_categories)`. The helper checks `fields.tournaments` (alt name; e.g., Polish_Duel_Season_2 uses `tournaments=1on1`), then `fields.format` for `1on1|2on2|4on4|CTF|FFA|DMM4|Race` tokens (case-insensitive), then title regex (e.g., `/DMM4/`, `/Race/`, `/Cup/`), then category fallback. Returns one of the enum values or `'unknown'`.
     - **Prizes:**
       - `prize_pool = fields.prizepool.trim() || null`.
       - `prize_pool_usd = parsePrizePoolUsd(fields.prizepoolusd, fields.prizepool)`. Helper: prefer `prizepoolusd` if numeric (strip `$`, `,`, USD); fallback to `prize_pool` if it matches `/\$?\s*([0-9,]+)\s*USD?/`. Returns int or null. `'Fame and glory'` -> null. `'$500,00'` (the wiki's accidental Euro-style decimal) -> 500 with a warning logged once per snapshot.
     - **Organizers / admins / founder:**
       - `organizers = collectPlayerNames(fields.organizer, fields.organizer2, fields.organizer3, fields.organizer4)`. Helper: each input may be a `{{Player|id|flag=xx}}` template, a wikilink `[[Foo]]`, plain text, or a `<br />`-joined sequence. The helper calls `extractPlayerTemplates` first; if zero matches, falls back to `splitWikiLinks`; if still zero, splits on `<br />` and trims. Returns deduped string array of names (player ids only, flags discarded -- the parser carries names, Phase 5 cross-link backfill resolves to player slugs).
       - `admins = collectPlayerNames(fields.admin, fields.admin2, fields.admin3, fields.admin4)`. Same helper.
       - `founder = collectPlayerNames(fields.founder, fields.founder2)[0] ?? null`. First match wins.
     - **Location:**
       - `country_iso = (fields.country.trim().toLowerCase() || null)` if it matches `/^[a-z]{2}$/`; otherwise treat as country name and call `nationalityToIso(countryToNationality(fields.country))`.
       - `country` is the demonym-or-country-name canonical form (use `iso-country.ts`'s reverse lookup if iso is present).
       - `city = fields.city.trim() || null`.
       - `venue = fields.venue.trim() || null`.
     - **Online presence:**
       - `website = fields.website.trim() || fields.web?.trim() || null`. (QuakeCon_2017 uses `web=` instead of `website=`; the parser accepts both.)
       - `twitch_handle = fields.twitch.trim() || null`.
       - `youtube_handle = fields.youtube.trim() || null`.
       - `discord_url = fields.discord.trim() || null`.
       - `irc_channel = fields.irc.trim() || null`.
     - **Participation:**
       - `team_count = Number(fields.team_number) || Number(fields.participants_number) || null`.
     - **Results:**
       - `winner = (fields.teamfirst || fields.idfirst).trim() || null`.
       - `winner_flag = (fields.teamfirstflag || fields.flagfirst).trim().toLowerCase() || null`.
       - Same pattern for runner_up (`teamsecond` / `idsecond`), third (`teamthird` / `idthird`), fourth (`teamfourth` / `idfourth`).
     - **Maps:**
       - `maps = []`. For each `mapN` field (1 through 10, or higher if seen) where the value is non-empty, push the trimmed value. Preserves order.

  5. **Branch: `parseInfoboxLanBranch`** (QHLAN-style):
     - Extract block via `extractInfoboxBlock(wikitext, 'Infobox lan')`.
     - The Infobox lan field set is smaller and CASE-INCONSISTENT (the wiki uses capitalized `Industry`, `Founded`, `Employees` mixed with lowercase `country`, `organizer`). The parser treats infobox field names case-insensitively for this branch.
     - **Identity / schedule:**
       - `series = null` initially; navbox post-processing may set it.
       - `start_date / end_date / year` from `date` field via `parseFlexDateRange` (LAN events have a single `date=` field, often a range like `5-9 Jan 2005`).
     - **Format / mode:** Infobox lan has no `format`/`type`/`mode` fields. Set:
       - `tournament_type = 'lan'`.
       - `format = null` (no source).
       - `mode = extractMode(null, null, title, source_categories)` (falls back to title/category inference).
     - **Prizes:** Infobox lan has no prize fields. Set both to null. (LAN tournaments often carry prize data in a separate `==Prizes==` section; the body extraction captures it but doesn't re-derive structured fields from it.)
     - **Organizers:** `organizers = collectPlayerNames(fields.organizer)` (one field; may be a `{{Flag/se}} Lornelin` shape with raw text -- the helper preserves the raw text minus the flag template).
     - **Location:** `country = fields.country.trim() || null`. `country_iso = nationalityToIso(countryToNationality(country))` if country matches a known country name. `city = fields.city.trim() || null`. `venue = fields.venue.trim() || null`.
     - **Online:** `website = fields.website.trim() || null`. `website2` is appended to `website` with `; ` separator if present.
     - **Participation:** Infobox lan has no team_number; set null.
     - **Results:** Infobox lan does not list winner / runner_up at the parent level (LAN events typically host multiple per-mode tournaments; the `==Tournaments==` section lists those). Set all four to null.
     - **Maps:** none in Infobox lan.

  6. **Branch: `parseBulletProseBranch`** (EQL_Season_12-style):
     - No infobox. Parse bullet-prose lines:
       - `* '''Website:''' X` -> `website = X`.
       - `* '''Gametype:''' [[4on4]] [[Team Deathmatch]]` -> `format = '4on4 Team Deathmatch'` (link-stripped); `mode = '4on4'`.
       - `* '''Number of teams:''' 39` -> `team_count = 39`.
       - `* '''Structure:''' Divisions, 3` -> `format = format ? format + '; Divisions, 3' : 'Divisions, 3'`.
       - `* '''Number of playoff teams:''' Top 8 of every division` -> appended to `format`.
       - `* '''Admins:''' [[Image:flag_nl.gif]] [[Blixem]], [[Image:flag_se.gif]] [[fog]], ...` -> `admins = splitFlagWikilinkList(line)`.
       - `* '''Clients allowed:''' ...` -> ignored (not a structured column).
       - `* '''Format:''' ...` -> append to `format`.
     - `tournament_type` defaults to `'online'` (older bullet-prose articles are online seasonal leagues; the few that are offline get re-categorized in post-processing via `source_categories` check).
     - `start_date / end_date / year` -> none in bullet-prose; year inferred from `source_categories` (the wiki tags articles with `Category:YYYY` reliably for bullet-prose-era tournaments).
     - `winner / runner_up / etc.` -> often absent from bullet-prose; recoverable from `==Final==` or `==Results==` body sections via post-processing (best-effort, low-precision; flagged in pilot output as a known limitation).

  7. **Branch: `parseProseFallbackBranch`** (Swedish_Quake_League / Clanbase-style):
     - No infobox, no bullet-prose pattern. Pure prose.
     - `series = null` initially; navbox post-processing may set it (rare for prose-fallback).
     - `tournament_type = 'unknown'`.
     - `mode` from title regex (e.g., `Swedish Quake League` -> match `4on4` only via category lookup) and source_categories.
     - `start_date / end_date / year` -> from prose-mention (best-effort regex on first paragraph for `started.*\d{4}`, `until.*\d{4}`); fall back to `source_categories` year tag.
     - All structured-field columns null; the body's `narrative_intro` carries everything.

  8. **Branch-agnostic post-processing (after branch dispatch):**
     - **Series inference (when fields.series is empty):**
       Scan the wikitext for navbox templates: `{{[A-Z][\w ]*Navbox}}` (capture group 1). Examples: `{{EQL navbox}}`, `{{NQR Navbox}}`, `{{QHLAN_Navbox}}`, `{{QCON Navbox}}`, `{{Sdcup Navbox}}`, `{{Kombat Navbox}}`, `{{Duelmania Navbox}}`, `{{Polish Duel Championship}}`. The captured navbox name (minus trailing 'Navbox' / 'Championship') becomes `series`. The wiki convention is loose; the parser handles the dominant cases and leaves rare ones null.
     - **Season-number inference (when not pre-extracted):**
       Title-regex extraction. Patterns:
       - `/Season\s+(\d+)/i` -> capture group 1.
       - `/\bS(\d+)\b/` -> for shorthand 'S5'.
       - `/Volume\s+(\d+)/i` -> for DPL-style.
       - `/Cup\s+#?(\d+)/i` -> for Sdcup #3.
       - `/\b(\d+)$/` -> trailing-digit fallback (e.g., `Duelmania_3` -> 3, `QHLAN_8` -> 8).
       Returns the first non-null capture.
     - **Body sections extraction (always run regardless of branch):**
       - `narrative_intro`: ALL prose paragraphs BEFORE the first `==<heading>==`, EXCLUDING any infobox / navbox / under-construction template. Concretely: take wikitext, remove `{{Infobox league|...}}` / `{{Infobox lan|...}}` / `{{[A-Z][\w ]*Navbox}}` / `{{Under construction}}` blocks, slice everything before the first `==<...>==`, strip wiki markup.
       - `format_section`: `==Format==` body.
       - `rules_section`: union of `==Rules==` and `==Settings, Rules, Maps==` bodies (the older Duelmania-style hybrid section). Concatenate with `\n\n` if both present.
       - `bracket_section`: union of `==Bracket==`, `==Playoffs==`, `==Final==`, `==Semi-finals==`, `==Quarter-finals==`, `==Bronze Final==` (the EQL multi-section bracket layout). Concatenate.
       - `results_section`: `==Results==` body.
       - `participants_section`: union of `==Participants==`, `==Signups==`. Concatenate.
       - `prize_pool_section`: `==Prize Pool==` body (capitalization variant `==Prizes==` is also accepted).
       - `gallery_section`: `==Gallery==` body.
       - `broadcast_section`: union of `==Broadcast==`, `==Broadcast Talent==`. Concatenate.
       - `links_section`: union of `==Links==`, `==External links==`. Concatenate.
       - `other_section_count`: count of `==<heading>==` lines NOT matched by any of the above.
     - **`year` fallback when null:** if `start_date` is null but `source_categories` includes a `Category:YYYY` entry (single 4-digit year), set `year = YYYY`.
     - **`tournament_type` correction:** if branch chose `'unknown'` but `source_categories` includes `Category:LAN Tournaments` -> `'lan'`. If it includes `Category:Offline Tournaments` and current value is `'unknown'` or `'online'` -> `'offline'`. Category signals override branch defaults when the branch is undecided.
     - **wiki_revision_id, wiki_fetched_at:** from the article envelope (`revid`, `timestamp`).

  9. **Return the assembled `ParsedTournament` object.**

- [ ] Helper functions used inside `parse.ts` (private to file unless reusable across types):
  - `normalizeTournamentType(s: string | undefined): TournamentTypeEnum | null`.
  - `extractMode(format: string | undefined, tournaments: string | undefined, title: string, cats: string[]): ModeEnum | null`.
  - `parsePrizePoolUsd(prizepoolusd: string | undefined, prizepool: string | undefined): number | null`.
  - `collectPlayerNames(...inputs: (string | undefined)[]): string[]` (uses `extractPlayerTemplates` from shared/wiki-text.ts).
  - `splitFlagWikilinkList(line: string): string[]` (parses `[[Image:flag_xx.gif]] [[Name]], [[Image:flag_yy.gif]] [[Name]]` patterns; returns names).
  - `extractSeriesFromNavbox(wikitext: string): string | null`.
  - `extractSeasonNumber(title: string): number | null`.
  - `extractMaps(fields: Record<string, string>): string[]`.

- [ ] Run `cd apps/qw-oracle && bunx tsc --noEmit`. Zero type errors.

**Verification:**
```
cd apps/qw-oracle && bunx tsc --noEmit
# PASS: zero type errors
```

(Functional verification deferred to Task 6's tests.)

**Execution mode:** subagent (Sonnet MAX) -- the parser is the central technical risk of Phase 4. Four template branches plus prose fallback plus navbox series inference plus mode normalization plus date/range parsing plus organizer-template extraction is multi-axis judgment work, and parser bugs silently corrupt ~627 rows. Sonnet MAX preferred over Sonnet medium to absorb the breadth; Opus MAX is overkill (this is implementation, not architecture; the architecture lives in the pilot output).

---

### Task 6 -- Build tournaments/parse.test.ts (fixture-based parser tests)

**Goal:** Validate `parseTournament` against the ten reference articles spanning all four branches. Fixture loading reads from the snapshot directory directly (no copy).

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/parse.test.ts` (created)

**Steps:**

- [ ] Author `parse.test.ts`. Each test reads the snapshot JSON via `readFileSync` + `JSON.parse`, calls `parseTournament`, asserts on key fields. Tests:

  - **EQL_Season_1 (`{{Infobox league}}`, 4on4 league):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.title).toBe('EQL Season 1');
    expect(parsed.series).toBe('EQL');                  // from {{EQL navbox}}
    expect(parsed.season_number).toBe(1);
    expect(parsed.tournament_type).toBe('online');
    expect(parsed.mode).toBe('4on4');
    expect(parsed.start_date).toBe('2005-10-10');
    expect(parsed.end_date).toBe('2006-01-12');
    expect(parsed.year).toBe(2005);                     // start year wins
    expect(parsed.organizers).toEqual(expect.arrayContaining(['zanne']));
    expect(parsed.admins.length).toBeGreaterThanOrEqual(4);  // Ake Vader, Nopee, Sassa, Term
    expect(parsed.winner).toBe('Fragomatic');
    expect(parsed.winner_flag).toBe('se');
    expect(parsed.runner_up).toBe('Firing Squad');
    expect(parsed.website).toBe('eql.quakeworld.nu/eql1/');
    ```

  - **EQL_Season_12 (NO_INFOBOX, bullet-prose):**
    ```
    expect(parsed.source_template).toBe('bullet_prose');
    expect(parsed.title).toBe('EQL Season 12');
    expect(parsed.series).toBeNull();                   // no navbox in this article
    expect(parsed.season_number).toBe(12);              // title regex
    expect(parsed.mode).toBe('4on4');                   // from '* Gametype: [[4on4]]'
    expect(parsed.team_count).toBe(39);
    expect(parsed.admins.length).toBeGreaterThanOrEqual(4);  // Blixem, fog, Itsinen, Zalon, Hooraytio
    expect(parsed.tournament_type).toBe('online');      // bullet-prose default
    expect(parsed.year).toBeNull();                     // no Category:YYYY tag in this article (verify against snapshot)
    ```
    Note: the assertion on `parsed.year` is provisional; the test author verifies against the actual `source_categories` of `EQL_Season_12.json` and pins to the observed value (null or the year tag).

  - **QHLAN_8 (`{{Infobox lan}}`):**
    ```
    expect(parsed.source_template).toBe('infobox_lan');
    expect(parsed.title).toBe('QHLAN 8');               // or 'QHLAN8' depending on canonical title
    expect(parsed.series).toBe('QHLAN');                // from {{QHLAN_Navbox}}
    expect(parsed.season_number).toBe(8);
    expect(parsed.tournament_type).toBe('lan');
    expect(parsed.start_date).toBe('2005-01-05');       // 5-9 Jan 2005 -> start
    expect(parsed.end_date).toBe('2005-01-09');
    expect(parsed.year).toBe(2005);
    expect(parsed.country).toBe('Sweden');
    expect(parsed.country_iso).toBe('se');
    expect(parsed.organizers).toEqual(expect.arrayContaining(['Lornelin']));
    expect(parsed.website).toContain('qhlan.org');
    ```

  - **QuakeCon_2017 (`{{Infobox league}}`, LAN, prizepoolusd numeric):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('QuakeCon');
    expect(parsed.season_number).toBeNull();            // year-tagged, not season-tagged
    expect(parsed.year).toBe(2017);
    expect(parsed.start_date).toBe('2017-08-26');
    expect(parsed.tournament_type).toBe('offline');     // type=Offline
    expect(parsed.country_iso).toBe('us');              // country=us literal iso
    expect(parsed.country).toBe('United States');       // reverse-lookup from iso
    expect(parsed.city).toBe('Dallas');
    expect(parsed.venue).toBe('Gaylord Texan Resort');
    expect(parsed.prize_pool_usd).toBe(5000);           // $5,000 -> 5000
    expect(parsed.organizers).toEqual(expect.arrayContaining(['Bethesda']));
    expect(parsed.team_count).toBe(128);                // participants_number
    ```

  - **Thunderdome_Season_5 (`{{Infobox league}}`, multi-organizer player templates):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('Thunderdome');
    expect(parsed.season_number).toBe(5);
    expect(parsed.tournament_type).toBe('online_seasonal_league');
    expect(parsed.organizers).toEqual(expect.arrayContaining(['VVD', 'dirtbox', 'phil', 'mushi']));
    expect(parsed.start_date).toBe('2015-10-14');
    expect(parsed.end_date).toBe('2015-12-30');
    expect(parsed.team_count).toBe(108);
    expect(parsed.maps).toEqual(['dm2', 'dm4', 'dm6', 'aerowalk', 'ztndm3']);
    expect(parsed.format).toBe('Seeded Double-Elimination Bracket');
    ```

  - **Duelmania_3 (`{{Infobox league}}`, 1on1, year field present):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('Duelmania');
    expect(parsed.season_number).toBe(3);
    expect(parsed.tournament_type).toBe('online');
    expect(parsed.mode).toBe('1on1');                   // format=1on1
    expect(parsed.year).toBe(2003);                     // from |year=2003 OR sdate=2003-06-09
    expect(parsed.start_date).toBe('2003-06-09');
    expect(parsed.end_date).toBe('2003-08-10');
    expect(parsed.organizers).toEqual(expect.arrayContaining(['Vertigo', 'ParadokS', 'eb']));
    expect(parsed.winner).toBe('Milton');
    expect(parsed.winner_flag).toBe('fi');
    expect(parsed.team_count).toBe(230);
    ```

  - **Sdcup3 (`{{Infobox league}}`, race format, edge case mode):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('Sdcup');
    expect(parsed.season_number).toBe(3);
    expect(parsed.tournament_type).toBe('online');
    expect(parsed.mode).toBe('Race');                   // 'Individual racing' -> Race
    expect(parsed.year).toBe(2021);
    expect(parsed.prize_pool).toContain('500');         // '$500,00' literal preserved
    expect(parsed.prize_pool_usd).toBe(500);            // parsed numeric ($500 with wiki's "$500,00" idiosyncrasy)
    expect(parsed.maps).toEqual(['race17_sdcup']);
    expect(parsed.twitch_handle).toBe('suddendeathTV');
    ```

  - **Kombat_DMM4 (`{{Infobox league}}`, DMM4 mode):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('Kombat');
    expect(parsed.mode).toBe('DMM4');
    expect(parsed.tournament_type).toBe('unknown');     // verify against article; if |type= is missing
    expect(parsed.year).toBe(2024);
    ```
    Note: `tournament_type` assertion is provisional; the test author verifies against the actual wikitext (`Kombat_DMM4.json`) and pins to whichever value the parser produces.

  - **Swedish_Quake_League (NO_INFOBOX, pure prose):**
    ```
    expect(parsed.source_template).toBe('none');        // pure prose, no bullet-pattern hits
    expect(parsed.title).toBe('Swedish Quake League');
    expect(parsed.series).toBeNull();
    expect(parsed.year).toBe(1997);                     // prose mention 'January 27th 1997'
    expect(parsed.tournament_type).toBe('unknown');
    expect(parsed.mode).toBeNull();                     // category is just Category:Leagues; no mode signal
    expect(parsed.narrative_intro.length).toBeGreaterThan(300);  // prose body present
    expect(parsed.organizers.length).toBe(0);           // no structured field; prose mention only
    ```

  - **Polish_Duel_Season_2 (`{{Infobox league}}`, alt `tournaments=` field):**
    ```
    expect(parsed.source_template).toBe('infobox_league');
    expect(parsed.series).toBe('Polish Duel Championship');  // from {{Polish Duel Championship}} navbox
    expect(parsed.season_number).toBe(2);
    expect(parsed.tournament_type).toBe('online');
    expect(parsed.mode).toBe('1on1');                   // tournaments=1on1 alt field
    expect(parsed.year).toBe(2022);
    expect(parsed.start_date).toBe('2022-02-14');       // 2022.02.14 dot-format -> ISO
    expect(parsed.end_date).toBe('2022-07-10');
    expect(parsed.admins).toEqual(expect.arrayContaining(['samon', 'Tom']));
    expect(parsed.founder).toBe('samon');
    expect(parsed.maps).toEqual(['dm2', 'dm4', 'dm6', 'aerowalk', 'ztndm3', 'bravado', 'skull', 'catalyst', 'panzer']);
    ```

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/tournaments/parse.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/tournaments/parse.test.ts
# PASS: all assertions pass for all 10 fixture articles
```

**Execution mode:** subagent (Sonnet medium) -- mechanical test authoring shaped by 10 well-defined fixture cases. The reasoning is in the assertions (which fields land where for each variant); the test plumbing is mechanical. Sonnet medium is sufficient.

---

### Task 7 -- Build tournaments/flags.ts (is_substantive + has_note + is_stub)

**Goal:** Land the flag-computation module. Per D5 / D6 / D7 / D20: `is_substantive` is multi-signal (the tournament-shaped heuristic from the pilot output); `has_note` is the v1 prose-content rule from the pilot output (tunable in Task 10); `is_stub` is the inverse of `is_substantive`. The pilot output is authoritative for the signal set and threshold; the skeleton below is the drafter's pre-pilot starting point.

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/flags.ts` (created)
- `apps/qw-oracle/scripts/load-community/tournaments/flags.test.ts` (created)

**Steps:**

- [ ] Read the operator-approved `is_substantive` heuristic and `has_note` v1 rule from the Task 1 pilot output's sections "is_substantive heuristic" and "has_note v1 rule".

- [ ] Author `flags.ts` (skeleton; replace signal set with pilot-approved version):

  ```ts
  // apps/qw-oracle/scripts/load-community/tournaments/flags.ts
  //
  // is_substantive (D5/D6 tournament-shaped): >=N of M structured-field signals.
  // The signal list and threshold come from the Phase 4 pilot output;
  // pre-pilot starting point below uses 6 signals at >=3 threshold.
  //
  // has_note v1 (D7 tournament-shaped): page carries content the row schema cannot
  // represent. Tunable in Task 10 first-run inspection.
  //
  // is_stub (D20): inverse of is_substantive.

  import type { ParsedTournament } from './parse';

  export interface TournamentFlags {
    is_substantive: boolean;
    has_note:       boolean;
    is_stub:        boolean;
    source_template: ParsedTournament['source_template'];
  }

  export function computeTournamentFlags(p: ParsedTournament): TournamentFlags {
    // is_substantive (skeleton; pilot output supersedes):
    const hasOrganizer       = p.organizers.length >= 1 || p.admins.length >= 1 || p.founder !== null;
    const hasSchedule        = p.start_date !== null || p.year !== null;
    const hasWinner          = p.winner !== null && p.winner.trim() !== '';
    const hasFormatAndMode   = p.format !== null && p.mode !== null && p.mode !== 'unknown';
    const hasNarrativeProse  = p.narrative_intro.length >= 200;
    const hasResultsSection  = p.results_section.length >= 200 || p.bracket_section.length >= 200;

    const substantiveSignals =
      Number(hasOrganizer) +
      Number(hasSchedule) +
      Number(hasWinner) +
      Number(hasFormatAndMode) +
      Number(hasNarrativeProse) +
      Number(hasResultsSection);

    const is_substantive = substantiveSignals >= 3;

    // has_note v1 (skeleton; pilot output supersedes):
    const hasUniqueProse =
      p.narrative_intro.length >= 200 ||
      p.format_section.length >= 200 ||
      p.rules_section.length >= 200 ||
      p.bracket_section.length >= 400 ||
      p.results_section.length >= 400 ||
      p.broadcast_section.length > 0 ||
      p.gallery_section.length > 0 ||
      p.prize_pool_section.length >= 200;

    const has_note = hasUniqueProse;

    const is_stub = !is_substantive;

    return {
      is_substantive,
      has_note,
      is_stub,
      source_template: p.source_template,
    };
  }
  ```

- [ ] Author `flags.test.ts` covering the ten fixture articles. Per-fixture expected flag values:

  - EQL_Season_1: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + schedule + winner + format/mode + bracket; substantive 5/6).
  - EQL_Season_12: `{ is_substantive: true, has_note: false-or-true, is_stub: false }` (admin + format/mode + maybe results -- substantive 3-4/6; has_note depends on rules-section length, pinned by test author against actual data).
  - QHLAN_8: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + schedule + format/mode-via-categories questionable; has_note via `==Tournaments==` + `==Prizes==` sections).
  - QuakeCon_2017: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + schedule + format + bracket + results + prize -> 5+/6; has_note via Prize Pool / Bracket / Gallery sections).
  - Thunderdome_Season_5: `{ is_substantive: true, has_note: false-or-true, is_stub: false }` (multi-organizer, schedule, format -- substantive 4/6; has_note depends on rules-section length, pinned by test author).
  - Duelmania_3: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + schedule + winner + format/mode + ==Settings, Rules, Maps== body).
  - Sdcup3: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + schedule + format/mode -- substantive 3/6; has_note via narrative_intro >= 200B).
  - Kombat_DMM4: `{ is_substantive: true, is_stub: false }` (4+/6 signals; has_note pinned post-implementation).
  - Swedish_Quake_League: `{ is_substantive: true, has_note: true, is_stub: false }` (narrative_intro >= 300B + schedule via prose; has_note via narrative_intro length).
  - Polish_Duel_Season_2: `{ is_substantive: true, has_note: true, is_stub: false }` (organizer + admin + schedule + format/mode -- substantive 4/6).

  Per Phase 2's Crit precedent (Task 5): when a flag value's exact pinning depends on a byte-length that only post-implementation measurement can resolve, the test author measures during implementation and pins to the parser-produced value. Document each such case in a comment.

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/tournaments/flags.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/tournaments/flags.test.ts
# PASS: all flag assertions pass
```

**Execution mode:** subagent (Sonnet medium) -- pure logic with deterministic test assertions against fixture data. The judgment is in mapping the pilot's heuristic into the signal expressions; the implementation is mechanical.

---

### Task 8 -- Build tournaments/upsert.ts (community.tournaments UPSERT) + tests

**Goal:** Land the row UPSERT consuming `ParsedTournament` + `TournamentFlags`. Idempotent. The column count is large (~30 tournament-specific columns plus the 9 placeholder columns from Phase 1); the SQL pattern follows Phase 2's `players/upsert.ts` exactly. No JSONB columns added in this arc per D19 (defensive); all multi-value fields are TEXT[] arrays.

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/upsert.ts` (created)
- `apps/qw-oracle/scripts/load-community/tournaments/upsert.test.ts` (created)

**Steps:**

- [ ] Author `upsert.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/tournaments/upsert.ts
  //
  // Atomic per-slug UPSERT into community.tournaments. Idempotent.
  // postgres-js arrays bind directly via parameterized queries -- TEXT[]
  // columns receive JS arrays. JSONB rule (D19) does not apply: this row
  // schema has no JSONB columns (organizers / admins / maps / source_categories
  // are TEXT[] PostgreSQL arrays).
  //
  // Date columns (start_date, end_date) receive ISO YYYY-MM-DD strings;
  // postgres-js binds them to the DATE type natively.

  import { db } from '../../../shared/db';
  import type { ParsedTournament } from './parse';
  import type { TournamentFlags } from './flags';

  export async function upsertTournament(p: ParsedTournament, f: TournamentFlags): Promise<void> {
    await db.begin(async (tx) => {
      await tx`
        INSERT INTO community.tournaments (
          slug, title, series, season_number, year,
          start_date, end_date, tournament_type, format, mode,
          prize_pool, prize_pool_usd, organizers, admins, founder,
          country, country_iso, city, venue,
          website, twitch_handle, youtube_handle, discord_url, irc_channel,
          team_count,
          winner, winner_flag, runner_up, runner_up_flag,
          third_place, third_place_flag, fourth_place, fourth_place_flag,
          maps,
          has_note, is_substantive, is_stub,
          source_template, source_categories, wiki_revision_id, wiki_fetched_at
        ) VALUES (
          ${p.slug}, ${p.title}, ${p.series}, ${p.season_number}, ${p.year},
          ${p.start_date}, ${p.end_date}, ${p.tournament_type}, ${p.format}, ${p.mode},
          ${p.prize_pool}, ${p.prize_pool_usd}, ${p.organizers}, ${p.admins}, ${p.founder},
          ${p.country}, ${p.country_iso}, ${p.city}, ${p.venue},
          ${p.website}, ${p.twitch_handle}, ${p.youtube_handle}, ${p.discord_url}, ${p.irc_channel},
          ${p.team_count},
          ${p.winner}, ${p.winner_flag}, ${p.runner_up}, ${p.runner_up_flag},
          ${p.third_place}, ${p.third_place_flag}, ${p.fourth_place}, ${p.fourth_place_flag},
          ${p.maps},
          ${f.has_note}, ${f.is_substantive}, ${f.is_stub},
          ${f.source_template}, ${p.source_categories}, ${p.wiki_revision_id}, ${p.wiki_fetched_at}
        )
        ON CONFLICT (slug) DO UPDATE SET
          title             = EXCLUDED.title,
          series            = EXCLUDED.series,
          season_number     = EXCLUDED.season_number,
          year              = EXCLUDED.year,
          start_date        = EXCLUDED.start_date,
          end_date          = EXCLUDED.end_date,
          tournament_type   = EXCLUDED.tournament_type,
          format            = EXCLUDED.format,
          mode              = EXCLUDED.mode,
          prize_pool        = EXCLUDED.prize_pool,
          prize_pool_usd    = EXCLUDED.prize_pool_usd,
          organizers        = EXCLUDED.organizers,
          admins            = EXCLUDED.admins,
          founder           = EXCLUDED.founder,
          country           = EXCLUDED.country,
          country_iso       = EXCLUDED.country_iso,
          city              = EXCLUDED.city,
          venue             = EXCLUDED.venue,
          website           = EXCLUDED.website,
          twitch_handle     = EXCLUDED.twitch_handle,
          youtube_handle    = EXCLUDED.youtube_handle,
          discord_url       = EXCLUDED.discord_url,
          irc_channel       = EXCLUDED.irc_channel,
          team_count        = EXCLUDED.team_count,
          winner            = EXCLUDED.winner,
          winner_flag       = EXCLUDED.winner_flag,
          runner_up         = EXCLUDED.runner_up,
          runner_up_flag    = EXCLUDED.runner_up_flag,
          third_place       = EXCLUDED.third_place,
          third_place_flag  = EXCLUDED.third_place_flag,
          fourth_place      = EXCLUDED.fourth_place,
          fourth_place_flag = EXCLUDED.fourth_place_flag,
          maps              = EXCLUDED.maps,
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

  If the pilot-approved column list adds, removes, or renames columns: the INSERT and the ON CONFLICT DO UPDATE clauses must be regenerated to match. A column mismatch silently corrupts data; the upsert author re-derives the column list from migration 009 source verbatim.

- [ ] Author `upsert.test.ts` against `qw_oracle_test`:
  - Test 1: insert a fresh tournament (Duelmania_3 fixture); row appears with all fields populated.
  - Test 2: re-insert same tournament with one field changed; row updates idempotently.
  - Test 3 (TEXT[] binding): insert with `organizers = ['Vertigo','ParadokS','eb']`, `admins = []`, `maps = ['dm2','dm4','dm6']`. Read back via `array_length` and `@>` operators; assert correct cardinality and content. Same regression gate as Phase 2 Task 6 Test 3.
  - Test 4: insert with `tournament_type = 'mixed'` -> CHECK passes; `tournament_type = 'BogusValue'` -> CHECK rejects (failed insert throws inside `db.begin`; assert the throw and assert the row is absent post-rollback).
  - Test 5: insert with `start_date = '2003-06-09'` and `end_date = '2003-08-10'`; read back via `SELECT (start_date)::text` and assert ISO format.
  - Test 6 (mode CHECK): insert with `mode = '1on1'` -> passes; `mode = 'invalid'` -> rejects.

  Tests use a per-test transaction wrapper that ROLLBACKs at end. The test file refuses to run unless `process.env.PGDATABASE === 'qw_oracle_test'` (mirrors Phase 2).

- [ ] Run `PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/tournaments/upsert.test.ts`. All tests pass.

**Verification:**
```
PGDATABASE=qw_oracle_test bun test apps/qw-oracle/scripts/load-community/tournaments/upsert.test.ts
# PASS: 6 upsert tests pass
```

**Execution mode:** subagent (Sonnet medium) -- postgres-js INSERT + ON CONFLICT DO UPDATE synthesis with array + date binding + CHECK constraint validation in tests. The shape mirrors `players/upsert.ts`; the work is calibration to the new column set.

---

### Task 9 -- Build tournaments/emit-note.ts (markdown emitter) + tests

**Goal:** Land the markdown-note emitter consuming `ParsedTournament` + `TournamentFlags`. Frontmatter mirrors the row's stable fields per D18; body carries the unique-content overlay (intro prose, format / rules / bracket / results / prize-pool / participants / broadcast / gallery / links sections). Per-mode result rows and per-team participant rows are NOT duplicated in the body when they live in cross-link tables (Phase 5); for tournaments the body retains them as raw section text because Phase 5 cross-link backfill works on the player-side achievement strings, not the tournament-side bracket sections.

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/emit-note.ts` (created)
- `apps/qw-oracle/scripts/load-community/tournaments/emit-note.test.ts` (created)

**Steps:**

- [ ] Author `emit-note.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/tournaments/emit-note.ts
  //
  // Markdown emitter for has_note=true tournaments. Frontmatter mirrors row
  // stable fields (D18); body carries the unique-content overlay.
  //
  // Pure: takes a ParsedTournament + flags, returns the markdown string.
  // The CLI writes the file. Tests assert on the string.

  import type { ParsedTournament } from './parse';
  import type { TournamentFlags } from './flags';

  export function buildNoteMarkdown(p: ParsedTournament, f: TournamentFlags): string {
    const fm   = buildFrontmatter(p, f);
    const body = buildBody(p);
    return `---\n${fm}\n---\n\n${body}`;
  }

  function buildFrontmatter(p: ParsedTournament, f: TournamentFlags): string {
    const yamlEscape = (s: string | null) => {
      if (s === null) return '';
      if (/[:\-#\[\]{}|>!&*?,\n"']/.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
        return `"${s.replace(/"/g, '\\"')}"`;
      }
      return s;
    };
    const yamlArray = (xs: string[]) => `[${xs.map(yamlEscape).join(', ')}]`;

    const lines: string[] = [
      `slug: ${p.slug}`,
      `title: ${yamlEscape(p.title)}`,
      `type: tournament`,
      `series: ${yamlEscape(p.series)}`,
      `season_number: ${p.season_number ?? ''}`,
      `year: ${p.year ?? ''}`,
      `start_date: ${yamlEscape(p.start_date)}`,
      `end_date: ${yamlEscape(p.end_date)}`,
      `tournament_type: ${yamlEscape(p.tournament_type)}`,
      `format: ${yamlEscape(p.format)}`,
      `mode: ${yamlEscape(p.mode)}`,
      `prize_pool: ${yamlEscape(p.prize_pool)}`,
      `prize_pool_usd: ${p.prize_pool_usd ?? ''}`,
      `organizers: ${yamlArray(p.organizers)}`,
      `admins: ${yamlArray(p.admins)}`,
      `country: ${yamlEscape(p.country)}`,
      `country_iso: ${yamlEscape(p.country_iso)}`,
      `city: ${yamlEscape(p.city)}`,
      `venue: ${yamlEscape(p.venue)}`,
      `website: ${yamlEscape(p.website)}`,
      `team_count: ${p.team_count ?? ''}`,
      `winner: ${yamlEscape(p.winner)}`,
      `winner_flag: ${yamlEscape(p.winner_flag)}`,
      `runner_up: ${yamlEscape(p.runner_up)}`,
      `runner_up_flag: ${yamlEscape(p.runner_up_flag)}`,
      `third_place: ${yamlEscape(p.third_place)}`,
      `third_place_flag: ${yamlEscape(p.third_place_flag)}`,
      `fourth_place: ${yamlEscape(p.fourth_place)}`,
      `fourth_place_flag: ${yamlEscape(p.fourth_place_flag)}`,
      `maps: ${yamlArray(p.maps)}`,
      `source_template: ${f.source_template}`,
      `wiki_revision_id: ${p.wiki_revision_id}`,
      `wiki_fetched_at: ${p.wiki_fetched_at}`,
    ];
    return lines.join('\n');
  }

  function buildBody(p: ParsedTournament): string {
    const sections: string[] = [];

    if (p.narrative_intro.length > 0)        sections.push(p.narrative_intro);
    if (p.format_section.length > 0)         sections.push(`## Format\n\n${p.format_section}`);
    if (p.rules_section.length > 0)          sections.push(`## Rules\n\n${p.rules_section}`);
    if (p.participants_section.length > 0)   sections.push(`## Participants\n\n${p.participants_section}`);
    if (p.bracket_section.length > 0)        sections.push(`## Bracket\n\n${p.bracket_section}`);
    if (p.results_section.length > 0)        sections.push(`## Results\n\n${p.results_section}`);
    if (p.prize_pool_section.length > 0)     sections.push(`## Prize Pool\n\n${p.prize_pool_section}`);
    if (p.broadcast_section.length > 0)      sections.push(`## Broadcast\n\n${p.broadcast_section}`);
    if (p.gallery_section.length > 0)        sections.push(`## Gallery\n\n${p.gallery_section}`);
    if (p.links_section.length > 0)          sections.push(`## Links\n\n${p.links_section}`);

    return sections.join('\n\n');
  }
  ```

- [ ] Author `emit-note.test.ts`:
  - Test 1: Duelmania_3 note frontmatter has `slug: Duelmania_3`, `series: Duelmania`, `season_number: 3`, `mode: 1on1`, `winner: Milton`, `winner_flag: fi`, `team_count: 230`. Body contains `## Rules` (or merged Settings, Rules, Maps section content).
  - Test 2: QuakeCon_2017 frontmatter has `country_iso: us`, `city: Dallas`, `venue: "Gaylord Texan Resort"` (quoted due to space), `prize_pool_usd: 5000`. Body contains `## Prize Pool` + `## Bracket` + `## Gallery`.
  - Test 3: EQL_Season_12 frontmatter (`has_note=false` per likely flags) -- still callable; CLI guards on flag in Task 11.
  - Test 4: YAML escaping: a venue containing `'` is double-quoted; value with `:` is double-quoted.
  - Test 5: Empty arrays render as `maps: []`, `organizers: []`.
  - Test 6: A tournament with date range produces `start_date: 2005-01-05`, `end_date: 2005-01-09` (QHLAN_8 fixture).

- [ ] Run `bun test apps/qw-oracle/scripts/load-community/tournaments/emit-note.test.ts`. All tests pass.

**Verification:**
```
bun test apps/qw-oracle/scripts/load-community/tournaments/emit-note.test.ts
# PASS: all emit-note tests pass
```

**Execution mode:** subagent (Sonnet medium) -- markdown synthesis from a structured input. The shape is well-defined (frontmatter mirror + body sections); the judgment is in YAML escaping edge cases.

---

### Task 10 -- Build tournaments/index.ts (CLI dispatcher)

**Goal:** Land the CLI walking the snapshot's article directory, filtering to the union of seven tournament categories, parsing each, computing flags, upserting the row, and (when `has_note=true`) writing the markdown note. Includes `--dry-run`, `--limit N`, `--slug <slug>`, `--snapshot <date>` flags. Pure CLI synthesis -- no first-run tuning yet (Task 11).

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/index.ts` (created)

**Steps:**

- [ ] Author `index.ts`:

  ```ts
  // apps/qw-oracle/scripts/load-community/tournaments/index.ts
  //
  // CLI dispatcher: walk the wiki snapshot, parse each tournament article,
  // upsert row, conditionally emit markdown note. Flags:
  //   --dry-run           parse only; no DB write, no note write.
  //   --limit N           stop after N articles processed (smoke runs).
  //   --slug <slug>       single-article rerun.
  //   --snapshot <date>   override the default snapshot date (default 2026-05-04).

  import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
  import { resolve, dirname } from 'node:path';
  import { fileURLToPath } from 'node:url';
  import { closeDb } from '../../../shared/db';
  import { parseTournament } from './parse';
  import { computeTournamentFlags } from './flags';
  import { upsertTournament } from './upsert';
  import { buildNoteMarkdown } from './emit-note';
  import type { WikiArticle } from '../shared/wiki-types';

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const APP_ROOT  = resolve(__dirname, '..', '..', '..');                    // apps/qw-oracle/
  const NOTES_DIR = resolve(APP_ROOT, 'curated', 'tournament-notes');

  const TOURNAMENT_CATEGORIES = new Set([
    'Category:Online Tournaments',
    'Category:Team Tournaments',
    'Category:Leagues',
    'Category:Offline Tournaments',
    'Category:LAN Tournaments',
    'Category:Online Seasonal League Tournaments',
    'Category:Online Draft Tournaments',
  ]);

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

  function isTournamentArticle(article: WikiArticle): boolean {
    for (const cat of article.categories) {
      if (TOURNAMENT_CATEGORIES.has(cat)) return true;
    }
    return false;
  }

  export async function loadAllTournaments(args: Args = parseArgs()): Promise<{
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
        console.warn(`[load-tournaments] WARN parse-fail ${slug}: ${(e as Error).message}`);
        warnings++;
        continue;
      }
      const article: WikiArticle = { ...(raw as WikiArticle), slug };
      scanned++;

      if (!isTournamentArticle(article)) {
        skipped++;
        continue;
      }

      const parsed = parseTournament(article);
      const flags  = computeTournamentFlags(parsed);

      if (!args.dryRun) {
        await upsertTournament(parsed, flags);
        loaded++;
        if (flags.has_note) {
          mkdirSync(NOTES_DIR, { recursive: true });
          const md = buildNoteMarkdown(parsed, flags);
          writeFileSync(resolve(NOTES_DIR, `${slug}.md`), md, 'utf8');
          notesWritten++;
        }
      } else {
        loaded++;
        if (flags.has_note) notesWritten++;
      }

      if (args.limit && loaded >= args.limit) break;
    }

    console.log(`[load-tournaments] scanned ${scanned}, loaded ${loaded}, notes ${notesWritten}, skipped ${skipped}, warnings ${warnings}`);
    return { scanned, loaded, notesWritten, skipped, warnings };
  }

  if (import.meta.main) {
    try {
      await loadAllTournaments();
    } finally {
      await closeDb();
    }
  }
  ```

- [ ] Run a smoke test:
  ```
  bun apps/qw-oracle/scripts/load-community/tournaments/index.ts --limit 50 --dry-run
  # Expected: prints scanned/loaded/notes/skipped/warnings; loaded ~ matches the 50-cap; warnings 0.
  ```

- [ ] Run a single-slug re-test for each fixture article:
  ```
  for s in EQL_Season_1 EQL_Season_12 QHLAN_8 QuakeCon_2017 Thunderdome_Season_5 Duelmania_3 Sdcup3 Kombat_DMM4 Swedish_Quake_League Polish_Duel_Season_2; do
    bun apps/qw-oracle/scripts/load-community/tournaments/index.ts --slug "$s" --dry-run
  done
  # Expected: each prints "scanned 1, loaded 1, notes 0 or 1" per the flag matrix from Task 7.
  ```

**Verification:**
```
bun apps/qw-oracle/scripts/load-community/tournaments/index.ts --limit 10 --dry-run
# PASS: prints scanned/loaded/notes counts, exits 0
bun apps/qw-oracle/scripts/load-community/tournaments/index.ts --slug Duelmania_3 --dry-run
# PASS: prints "scanned 1, loaded 1, notes 1, skipped 0, warnings 0"
```

**Execution mode:** subagent (Sonnet medium) -- well-specified CLI flow following the Phase 2 `players/index.ts` template. Synthesis-shaped; isolated context preferred over polluting the executor main thread.

---

### Task 11 -- First full run + has_note rule tuning + stale-note cleanup

**Goal:** Run the loader against the full snapshot, inspect the row + note distributions, sample emitted notes for content quality, tune the `has_note` rule (and possibly the `is_substantive` heuristic) per Task 1 pilot recommendation, re-run, clean up stale notes.

**Files:**
- `apps/qw-oracle/scripts/load-community/tournaments/flags.ts` (modified -- thresholds tuned post-first-run)

**Steps:**

- [ ] Run the full first pass (with DB writes + note writes):
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/tournaments/index.ts
  # Expected: scanned ~9173, loaded ~627 (union of seven tournament categories per pre-pilot recon),
  # notes <count>, skipped ~8500, warnings 0 or small.
  ```

  Capture `loaded` and `notesWritten` counts. The `loaded` count is the operator's first opportunity to compare against the union-of-categories expectation. If the count diverges by >20%, see Recovery section (most likely cause: editorial leakage of non-tournament articles into a tournament category).

- [ ] Sample 10 random `has_note=true` notes and 5 random `has_note=false` / `is_substantive=true` rows:
  ```sql
  SELECT slug FROM community.tournaments WHERE has_note = TRUE ORDER BY random() LIMIT 10;
  SELECT slug FROM community.tournaments WHERE has_note = FALSE AND is_substantive = TRUE ORDER BY random() LIMIT 10;
  ```

  For each `has_note=true` slug, open `apps/qw-oracle/curated/tournament-notes/<slug>.md` and verify the body carries genuinely unique prose / rules / bracket / results that the row schema cannot represent. Flag false positives (notes whose body is empty post-strip or duplicates row content).

  For each `has_note=false / is_substantive=true` slug, open the source article and confirm the page genuinely has nothing the row schema misses. Flag false negatives.

- [ ] Tune `flags.ts` based on observation. The pilot output's "has_note v1 rule" section is the starting point; this task's first-run inspection is the empirical gate per D7.

  - If precision is low (false positives >20% of sample): tighten. Candidate tighteners: raise `narrative_intro` threshold from 200B to 400B; require `bracket_section` length >= 600B before counting it; drop `gallery_section.length > 0` if galleries turn out to be auto-generated noise.
  - If recall is low (false negatives >20%): broaden. Candidate broadeners: include `participants_section.length >= 200`; include `prize_pool_section` shorter threshold; include `links_section.length >= 200` for older bullet-prose articles.

  The tune is one bounded edit to `flags.ts`'s `hasUniqueProse` expression (or, in rare cases, a parallel adjustment to `is_substantive`'s threshold). Document the tune in a header comment in `flags.ts` referencing the precision / recall numbers and which clauses changed.

- [ ] Re-run the full pipeline after tuning:
  ```
  DATABASE_URL=$DATABASE_URL bun apps/qw-oracle/scripts/load-community/tournaments/index.ts
  # Expected: same loaded count; notesWritten count adjusted per tune.
  ```

  Stale notes (notes emitted under v1 but no longer qualifying under v2) require explicit cleanup. The Phase 2 stale-removal one-liner adapts to tournaments verbatim:
  ```
  bun -e '
    const { db, closeDb } = await import("./apps/qw-oracle/shared/db.ts");
    const rows: { slug: string }[] = await db`SELECT slug FROM community.tournaments WHERE has_note = TRUE`;
    const valid = new Set(rows.map((r) => r.slug));
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = "apps/qw-oracle/curated/tournament-notes";
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

  If Phase 2 lifted this helper to `shared/cleanup-stale-notes.ts` (Phase 2 deferred this), Phase 4 calls the lifted helper instead of inlining.

**Verification:**
```
SELECT count(*) FROM community.tournaments;
# PASS: matches union-of-categories count from snapshot (~627 pre-pilot; final number locked by Task 1)
SELECT count(*) FROM community.tournaments WHERE has_note = TRUE;
# PASS: tuned count (record both pre-tune and post-tune counts in commit message)
ls apps/qw-oracle/curated/tournament-notes/*.md 2>/dev/null | wc -l
# PASS: equals the has_note=TRUE count above (no stale files)
```

**Execution mode:** inline -- operator-driven empirical work (run, sample, eyeball, edit one rule, re-run, clean up). The judgment is human; the actions are deterministic shell + SQL + a single-clause edit. No code synthesis to delegate.

---

### Task 12 -- Update SCHEMA.md row-count footnote

**Goal:** Update `SCHEMA.md`'s `community.tournaments` entry to reflect the migration 009 column expansion plus the populated row count.

**Files:**
- `apps/qw-oracle/SCHEMA.md` (modified)

**Steps:**

- [ ] Locate the `community.tournaments` table entry in `SCHEMA.md` (added in Phase 1 Task 4, with placeholder column list).
- [ ] Replace the placeholder column list with the migration 009 column set (mirror the style of the players/clans entries). Append:
  ```
  **Populated by:** `apps/qw-oracle/scripts/load-community/tournaments/index.ts` <- snapshot at `apps/qw-oracle/data/wiki-snapshots/<date>/articles/`.
  **Count at 2026-05-04 snapshot:** <loaded> rows (union of seven tournament categories; see Phase 4 README).
  **Notes emitted:** <tuned count> at `apps/qw-oracle/curated/tournament-notes/`.
  **Schema source:** migration 008 (placeholder) + migration 009 (tournament-specific columns; column list locked by Phase 4 pilot output).
  ```
  Use the actual loaded + tuned counts from Task 11.

**Verification:**
```
grep -A 4 "community.tournaments" apps/qw-oracle/SCHEMA.md | grep "Populated by"
# PASS: line found
grep "migration 009" apps/qw-oracle/SCHEMA.md
# PASS: at least one match referencing the migration source
```

**Execution mode:** inline -- single-file textual edit with full content shipped above; no synthesis.

---

## Verification (phase boundary)

Run these commands at the end of the phase. Each has a PASS/FAIL condition.

**V1. Phase 1 + Phase 2 + Phase 3 deliverables present (pre-flight invariant):**

```sql
SELECT filename FROM schema_migrations WHERE filename IN ('008_community_schema.sql', '009_tournament_columns.sql');
```
PASS: two rows returned. FAIL: missing migration -> revisit prior phase output.

```
test -d apps/qw-oracle/curated/tournament-notes && echo present || echo missing
```
PASS: `present`. FAIL: revisit Phase 1.

```
ls apps/qw-oracle/scripts/load-community/shared/wiki-text.ts apps/qw-oracle/scripts/load-community/shared/iso-country.ts apps/qw-oracle/scripts/load-community/shared/wiki-types.ts
```
PASS: three files listed (Phase 2 helpers; Phase 4 reuses).

```
SELECT count(*) FROM community.players;
```
PASS: > 0 (Phase 2 populated). FAIL: revisit Phase 2.

```
SELECT count(*) FROM community.clans;
```
PASS: > 0 (Phase 3 populated). FAIL: revisit Phase 3.

```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0 (post-Phase-3 codebase is type-clean).

**V2. Pilot output exists and is approved:**
```
ls docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
grep -i "approved" docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md
```
PASS: file present and contains an approval annotation OR operator confirmed approval in the conversation.

**V3. Migration 009 applied:**
```sql
SELECT filename FROM schema_migrations WHERE filename = '009_tournament_columns.sql';
```
PASS: one row.

**V4. Tournament-specific columns exist:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'community' AND table_name = 'tournaments'
ORDER BY ordinal_position;
```
PASS: includes `series, season_number, year, start_date, end_date, tournament_type, format, mode, prize_pool, prize_pool_usd, organizers, admins, founder, country, country_iso, city, venue, website, twitch_handle, youtube_handle, discord_url, irc_channel, team_count, winner, winner_flag, runner_up, runner_up_flag, third_place, third_place_flag, fourth_place, fourth_place_flag, maps` (per the skeleton; the pilot's approved list may differ).
FAIL: any expected column missing.

**V5. community.tournaments row count matches expected:**
```sql
SELECT count(*) FROM community.tournaments;
```
PASS: count is within +/-5% of the union-of-categories count from the snapshot (~627 pre-pilot; pilot may revise the expected target). The exact number is operator-confirmed at sign-off.

**V6. Notes file count matches has_note=true row count:**
```
ls apps/qw-oracle/curated/tournament-notes/*.md 2>/dev/null | wc -l
```
PASS: equals `(SELECT count(*) FROM community.tournaments WHERE has_note = TRUE)`. Record both numbers.

**V7. Source-template distribution matches pilot expectations:**
```sql
SELECT source_template, count(*)
FROM community.tournaments
GROUP BY source_template
ORDER BY count(*) DESC;
```
PASS: distribution approximately matches the pilot's bucket fractions (e.g., ~63% `infobox_league`, ~5% `infobox_lan`, ~20% `bullet_prose`, ~12% `none` -- subject to pilot refinement).
FAIL: distribution wildly off (e.g., 90% `none` -> branch detection logic broken).

**V8. Spot-check the ten reference tournaments:**
```sql
SELECT slug, series, season_number, mode, tournament_type, year,
       has_note, is_substantive, is_stub, source_template
FROM community.tournaments
WHERE slug IN ('EQL_Season_1','EQL_Season_12','QHLAN_8','QuakeCon_2017','Thunderdome_Season_5',
               'Duelmania_3','Sdcup3','Kombat_DMM4','Swedish_Quake_League','Polish_Duel_Season_2')
ORDER BY slug;
```
PASS: each row matches the assertions in Task 6's parse.test.ts (cross-checked against the parser tests).
FAIL: any row diverges -> re-run via `--slug <slug> --dry-run`, inspect parsed object, fix branch.

**V9. is_substantive distribution sanity check:**
```sql
SELECT is_substantive, count(*)
FROM community.tournaments
GROUP BY is_substantive;
```
PASS: roughly 60-80% substantive (tournament corpus is more curated than the player corpus; bullet-prose-era leagues without organizer / schedule may push the substantive count down). The exact target comes from the pilot output's heuristic-evaluation section.

**V10. has_note distribution + sample inspection:**
```sql
SELECT has_note, count(*)
FROM community.tournaments
GROUP BY has_note;
```
Plus operator samples 10 random `has_note=TRUE` notes (inspect content) and 5 random `has_note=FALSE / is_substantive=TRUE` rows (verify nothing the row misses).

PASS: tuned count signed off by operator. >= 80% precision on has_note=true sample. Recovery: re-tune.

**V11. No stale notes:**
```
comm -23 \
  <(ls apps/qw-oracle/curated/tournament-notes/*.md | xargs -n 1 basename | sed 's/\.md$//' | sort) \
  <(psql -d $PGDATABASE -At -c "SELECT slug FROM community.tournaments WHERE has_note = TRUE ORDER BY slug")
```
PASS: empty output. FAIL: stale `.md` -> run Task 11 stale-removal one-liner.

**V12. TypeScript clean:**
```
cd apps/qw-oracle && bunx tsc --noEmit
```
PASS: exits 0, no output.

**V13. All Phase 4 tests pass:**
```
bun test apps/qw-oracle/scripts/load-community/
```
PASS: every test in shared/ (including new date-parse and parsePlayerTemplate), tournaments/parse.test.ts, tournaments/flags.test.ts, tournaments/emit-note.test.ts passes. The upsert test runs only if `PGDATABASE=qw_oracle_test` is set; otherwise it skips.

**V14. Stub flag is multi-signal heuristic, not template tag (D20 audit):**
```sql
-- The wiki has no {{Tournament-stub}} convention I observed; this audit
-- is the analog of Phase 2 V11 to confirm is_stub is computed, not category-derived.
SELECT
  is_stub,
  'Category:Pages under construction' = ANY(source_categories) AS under_construction_tagged,
  count(*)
FROM community.tournaments
GROUP BY 1, 2
ORDER BY 1, 2;
```
PASS: there exist `is_stub=FALSE / under_construction_tagged=TRUE` rows (incomplete pages with real data) and `is_stub=TRUE / under_construction_tagged=FALSE` rows (genuinely empty pages without the tag). This confirms `is_stub` is computed from `is_substantive`, not from categories.

---

## Outputs to next phase

- `community.tournaments` is populated with the union-of-tournament-categories row count.
- `apps/qw-oracle/curated/tournament-notes/` contains the tuned set of `has_note=TRUE` markdown notes.
- `apps/qw-oracle/scripts/load-community/tournaments/` exists with parse / flags / upsert / emit-note / index.
- `apps/qw-oracle/scripts/load-community/shared/date-parse.ts` and the new `parsePlayerTemplate` helper exist; Phase 5 cross-link backfill reuses `parsePlayerTemplate` for achievement-team parsing.
- Migration 009 applied; tournament-specific columns landed.
- `apps/qw-oracle/SCHEMA.md` documents the column list + row count + note count.
- `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md` exists as the durable record of the schema-discovery pilot (input to Arc 2 if a tournament-archive merge re-opens schema).
- `bunx tsc --noEmit` is clean.
- All Phase 4 tests pass.
- Phase 5 (cross-link backfill) can begin. The Phase 5 tournament_results loader fuzz-matches achievement strings against `community.tournaments.slug`, `series`, `year`, `mode` -- the column shape Phase 4 ships is the matchable surface.

---

## Open questions / deferred items

**Q1. Pilot column list may differ from the skeleton in Task 3.**
- **Question:** The drafter's pre-pilot skeleton in Task 3 lists ~30 columns. The pilot may approve a smaller / larger / renamed set.
- **Default chosen for now:** Task 3 explicitly states "use the operator-approved column list from `phase-4-pilot-output.md`". The skeleton exists to let the verification sub-agent sanity-check shape; it is not the locked migration. The execution session writes migration 009 from the pilot output, not from the skeleton.
- **Who can resolve:** Pilot drives. Operator signs off on Task 2 gate.

**Q2. Tournament-specific `is_substantive` heuristic differs from D6 player heuristic.**
- **Question:** D6 enumerates the player heuristic (>=2 of 5 specific player signals). The tournament heuristic uses a different signal set (organizer/schedule/winner/format-mode/narrative/results). Is this a D6 deviation that needs explicit decisions.md amendment?
- **Default chosen for now:** No amendment. D6 says "Same heuristic applies to clans (substituting clan-history -> members if available, etc.). Tournament heuristic TBD post-Phase-4 pilot." This is exactly the case D6 anticipates -- tournament heuristic is documented in the pilot output and in `flags.ts` header comments. The amendment-here-not-silently rule (decisions.md preamble) does not apply to TBD items D6 itself flags.
- **Who can resolve:** Operator at Phase 4 sign-off if they want a formal amendment recorded; otherwise the pilot output is the durable record.

**Q3. Match-report leakage into Category:Leagues.**
- **Question:** The wiki has 369 match-report pages (V1 Final E-ZR-style). Most are NOT in Category:Leagues, but some may be (editorial drift). The pilot enumerates any sample-found leakage; if the loader's full run finds non-tournament articles in the categories, the row count will exceed the union-of-categories estimate.
- **Default chosen for now:** Loader processes everything in the seven categories. The pilot output recommends an exclusion rule if any leakage was sampled (e.g., title regex `/Final|Semi|Quarter [A-Z]+-[A-Z]+$/` indicates a match report). If no leakage in the sample, no exclusion rule.
- **Who can resolve:** Pilot output recommends; operator approves or asks for an exclusion. Phase 5 separately flags non-resolving tournament_slug values, which is a complementary detection signal.

**Q4. Multi-mode tournaments -- one row or split?**
- **Question:** Some events host both 1on1 and 4on4 brackets under one wiki article (e.g., LAN events with multiple per-mode tournaments listed in the body). One row + `mode='mixed'`, or split into two rows + `mode='1on1'` / `mode='4on4'` joined by series?
- **Default chosen for now:** One row + `mode='mixed'`. The wiki article is one row; the per-mode bracket data lives in body sections. Splitting would require slug-disambiguation (`LAN_Event_1on1`, `LAN_Event_4on4`) that the wiki's URL contract does not support.
- **Who can resolve:** Pilot may surface a different recommendation; operator approves.

**Q5. `country_iso` parsing: country code vs country name in `|country=` field.**
- **Question:** Some Infobox league articles set `country=us` (already an iso code); others set `country=Sweden` (country name needing reverse lookup). The parser handles both, but if the field contains an unknown value (not iso, not in the country-to-nationality table), the parser sets `country_iso=null` and stores `country` as the raw string. Acceptable?
- **Default chosen for now:** Yes -- raw passthrough on unknown values. Operator can extend `iso-country.ts`'s `COUNTRY_TO_NATIONALITY` table if a new country shows up.
- **Who can resolve:** Operator at sign-off if `country=` field analysis surfaces frequent unknowns.

**Q6. Unique-page detection for re-fetched articles.**
- **Question:** F3 (Phase 0) noted that 503 slash-title articles use single-underscore slugs. Phase 0 re-fetched the 4 collision pairs; the other 499 single-underscore slugs are correctly stored. Tournament articles are a subset of these; the parser opens files by filename, so the slug-scheme question does not affect parsing. Worth confirming?
- **Default chosen for now:** Confirmed by reading F3. The parser is filename-driven; both single-underscore and double-underscore slugs work transparently. No special handling needed.
- **Who can resolve:** n/a -- confirmed.

**Q7. `EQL_Season_12` vs `EQL_Season_1` series consistency.**
- **Question:** EQL_Season_1 has `{{EQL navbox}}` -> series='EQL'. EQL_Season_12 is NO_INFOBOX with no navbox -> series=null. Two articles in the same series have different series fields. Is this acceptable?
- **Default chosen for now:** Yes -- the parser cannot infer series from a missing template. The downstream Phase 6 `search_tournaments` tool can use title prefix matching as a fallback ("EQL_Season_*" -> implied series 'EQL'); that is a Phase 6 concern, not a Phase 4 column-shape concern.
- **Who can resolve:** Phase 6 drafter adds title-prefix series inference if the lookup miss rate is high.

---

## Recovery (if verification fails)

**V1 fails (pre-flight invariant):** revisit the prior phase. Phase 4 cannot start against an incomplete Phase 1/2/3 state.

**V2 fails (pilot output missing or unapproved):** re-dispatch the Task 1 pilot subagent. If the subagent failed to write the file, check the dispatched prompt for path correctness. If the operator did not approve, surface the open questions explicitly and pause for sign-off.

**V3 fails (migration 009 not applied):** ensure `DATABASE_URL` is set. Run `bun apps/qw-oracle/db/migrate.ts` directly. If the migration file has a SHA mismatch error (modified after apply), that is a D15 violation -- create a corrective 010 migration instead of editing 009.

**V5 fails (row count diverges from expected):**
- If `loaded < expected`: the category filter `TOURNAMENT_CATEGORIES` may be missing edge-case category strings. Compare the loader's `loaded` count to the pilot output's union-of-categories count; if the pilot found 627 and the loader produced 600, 27 articles may carry a category not in the seven-set. Inspect the diff.
- If `loaded > expected`: editorial leakage; some articles in the categories are not actually tournaments (clans / players / match reports miscategorized). Sample 10 unexpected rows; if they share a structural signature, propose an exclusion rule.

**V6 fails (note count != has_note count):** run the stale-removal one-liner from Task 11. If notes are missing for `has_note=TRUE` rows, the CLI's `writeFileSync` may have silently failed mid-run. Re-run; the loader is idempotent.

**V7 fails (source-template distribution off):** sample 20 rows in the over/under-represented branch. The most likely cause is the branch-detection regex over-matching one variant. For example, if `bullet_prose` is much higher than expected, the bullet-pattern threshold (>=2 of 5 specified patterns) may be too lenient -- bump to >=3.

**V8 fails (fixture row diverges):** run `bun apps/qw-oracle/scripts/load-community/tournaments/index.ts --slug <slug> --dry-run` and pipe the parsed object to stdout. Compare to the article wikitext field by field. The most common causes are missing infobox-field edge cases (a field with embedded `=`, a `<br />`-separated multi-value field) and missing branch-detection regex precision.

**V9 fails (is_substantive distribution way off):** run a SQL exploration:
```sql
SELECT
  sum(CASE WHEN organizers IS NOT NULL AND array_length(organizers,1) >= 1 THEN 1 ELSE 0 END) AS has_organizer,
  sum(CASE WHEN start_date IS NOT NULL OR year IS NOT NULL THEN 1 ELSE 0 END) AS has_schedule,
  sum(CASE WHEN winner IS NOT NULL THEN 1 ELSE 0 END) AS has_winner,
  sum(CASE WHEN format IS NOT NULL AND mode IS NOT NULL AND mode <> 'unknown' THEN 1 ELSE 0 END) AS has_format_mode
FROM community.tournaments;
```
Use the distribution to decide whether the threshold (>=3 of 6) needs to drop or rise. Tweak the knob in `flags.ts`.

**V10 fails (has_note precision low):** re-tune per Task 11. The loader is idempotent.

**V14 fails (is_stub aligns with under_construction_tagged):** indicates `flags.ts` is incorrectly using `Category:Pages under construction` as a stub signal. Read `flags.ts`'s `is_stub` computation: it must be `!is_substantive`, NOT a category check. Fix and re-run.

**General fallback:** the loader is idempotent. Re-running after any fix produces the correct end state without data loss. The DB ON CONFLICT DO UPDATE handles row updates; the markdown emitter overwrites files; the stale-removal one-liner handles deletes.

---

## Verification sub-agent dispatch

After drafting the phase MD, the drafter dispatches the following sub-agent. Brief reproduced inline; absolute paths filled in.

```
You are verifying a draft plan phase against the live codebase and the arc scaffold.

Read this phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
Read the design spec section relevant to this phase: /home/paradoks/projects/quakeworld/docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md (sections "Pilot findings" + "Schema -> community.tournaments" + "Phase decomposition Phase 4 row" + "Storage / curated layer reframe" + "Decisions deferred to arc-planner / executor -> Tournament schema details").

Then verify, file-by-file:

1. Every file path mentioned in "Files touched":
   - For Modified/Deleted: verify the path exists in the live codebase.
   - For Created: verify the parent directory exists. The file ITSELF is
     expected NOT to exist yet -- this is a paper plan, not executed code.
     Do NOT flag a Created file's non-existence as CRITICAL.

2. Every CREATE TABLE / ALTER TABLE / CREATE INDEX in this phase:
   - Verify schema name is `community` (D2) for new tables / altered tables.
   - Verify column types match common Postgres conventions and align with
     migration 008's column-type style (TEXT for string, INT for integer,
     BOOLEAN for boolean, TEXT[] for array, DATE for date).
   - Verify CHECK constraints enumerate sensible values (no typos in enum
     strings).
   - Verify indexes are partial (WHERE clause) where the column is
     frequently null -- this matches migration 008's style.
   - The migration 009 column list in this MD is a SKELETON; the actual
     migration is generated from phase-4-pilot-output.md. If the MD's
     skeleton has a column that decisions.md or the spec contradicts,
     flag.

3. Every reference to a wiki snapshot artifact:
   - Verify the path under `apps/qw-oracle/data/wiki-snapshots/2026-05-04/`
     exists.
   - Spot-check the ten reference articles cited (EQL_Season_1.json,
     EQL_Season_12.json, QHLAN_8.json, QuakeCon_2017.json,
     Thunderdome_Season_5.json, Duelmania_3.json, Sdcup3.json,
     Kombat_DMM4.json, Swedish_Quake_League.json,
     Polish_Duel_Season_2.json) actually exist as files.

4. Every shell command or `bun` invocation:
   - Confirm it uses `bun` for scripts (D14).
   - Confirm `import.meta.main` guards (if used) are valid (Bun-supported).
   - Confirm output discipline (D13): no emoji, ASCII-only, no em-dashes /
     en-dashes.

5. Every reference to existing code (load-knowledge/, load-community/, serve/mcp/, db/):
   - Verify the path exists.
   - Verify the symbol or function name matches (e.g.,
     `apps/qw-oracle/shared/db.ts` exports `db` and `closeDb`;
     `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts` exports
     `extractInfoboxBlock`, `parseInfoboxFields`, `extractSectionBody`,
     `stripWikiMarkup`, etc.;
     `apps/qw-oracle/scripts/load-community/shared/iso-country.ts` exports
     `nationalityToIso`, `countryToNationality`).
   - Phase 4 ADDS `parsePlayerTemplate` and `extractPlayerTemplates` to
     `shared/wiki-text.ts`; verify the existing file does not already
     export these (drift detection).

6. Every Task's Execution mode annotation:
   - Verify the rationale matches the mode.
   - Flag tasks coded as `inline` but involving code synthesis,
     migration writing, or test authoring -- those should be subagent.
   - Phase 4 has 12 tasks. Task 1 (pilot) is subagent (Opus MAX) per
     architecture-level synthesis. Tasks 3-10 are subagent (Sonnet medium
     or Sonnet MAX for the parser). Tasks 2 (operator review gate),
     11 (operator-driven empirical work), and 12 (single-file textual
     edit) are inline.

7. Every reference to a finding (F-numbers in review-findings.md):
   - Confirm the finding exists. Phase 4 cites F6 (drafter awareness:
     decisions.md is authoritative for column shape, not the spec DDL)
     and F8 (drafter awareness: tournament_slug is a soft reference;
     Phase 4 does not introduce hard FK).
   - Confirm Phase 4 actually respects these awareness items.

8. Every column / table introduced that is not in `decisions.md` and is
   not already in `apps/qw-oracle/SCHEMA.md`:
   - The migration 009 skeleton in this MD adds tournament-specific
     columns. None are in SCHEMA.md yet (Task 12 adds them) and decisions.md
     defers the column list to the pilot output. Therefore the columns
     in the skeleton are not "drift" per se -- they are the drafter's
     pre-pilot proposal that the pilot supersedes. Flag any that
     contradict decisions.md (e.g., a JSONB column would contradict D19
     in spirit; a column name conflicting with the placeholder columns
     from migration 008 would be a duplicate-column error).

9. "Engineer ports X" / "fills in details" / TODO smell -- list any.
   - The parser branches in Task 5 describe each branch's logic in detail.
     Flag any sub-step that says "the parser handles this" without saying
     how.
   - Task 1's pilot subagent prompt is intentionally open-ended (the
     pilot's job is discovery). That is not a TODO smell -- the open-endedness
     is the deliverable shape.

10. Output discipline (D13): scan for em-dash / en-dash / emoji / marketing
    voice. Flag any. The parser's `normalizeDash` (Phase 2) handles Unicode
    dashes IN SOURCE WIKITEXT; the phase MD itself must be ASCII-clean.

11. Decision compliance audit (per-decision, where the decision touches Phase 4):
    - D1 (two outputs): row + (conditional) markdown. Confirm both pipelines exist.
    - D4 (deterministic): the pilot is the only LLM-shaped task; the parser
      is deterministic. Confirm the parser tasks (5-10) do not invoke an LLM.
    - D5 (two-threshold): is_substantive and has_note are independent.
      Confirm `flags.ts` computes them independently.
    - D6 (is_substantive heuristic): the player heuristic does not apply
      to tournaments; the pilot drives the tournament heuristic. Confirm
      Task 1's pilot prompt explicitly asks for a tournament-shaped heuristic.
    - D7 (has_note v1): tunable rule shipped in Phase 2 and re-tuned per
      type in Phase 3/4. Confirm Task 11 includes the tuning step.
    - D9 (tournament schema TBD): pilot drives migration 009. Confirm
      Task 1 -> Task 2 (review gate) -> Task 3 (migration 009) is the
      sequence.
    - D10 (source column on cross-link tables): Phase 4 does not write
      cross-link rows; that is Phase 5. Confirm Phase 4 does NOT introduce
      a cross-link table.
    - D13 (ASCII): scan the phase MD.
    - D14 (Bun): all CLI invocations use `bun`.
    - D15 (append-only migrations): migration 009 ALTERs community.tournaments;
      it does not edit migration 008. Confirm.
    - D16 (atomicity): phase boundary leaves a runnable state.
    - D18 (note frontmatter mirrors row + body): confirm `emit-note.ts`'s
      frontmatter shape matches the row's stable fields.
    - D19 (JSONB binding): the skeleton in Task 3 has no JSONB columns
      (organizers, admins, maps are TEXT[] arrays, not JSONB). Confirm
      no JSONB column appears.
    - D20 (stub flag from heuristic, not template tag): confirm
      `flags.ts` computes `is_stub = !is_substantive`, not via a category
      check.

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
