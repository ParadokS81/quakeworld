# Phase 2 executor prompt -- QWiki community-reference arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold against Phase 2.

Phase 0 + Phase 1 shipped 2026-05-05. Migration 008 applied with all five `community.*` tables empty. F8/F9/F10 amendments live in DB. curated/ rename complete. F14-F20 captured to `review-findings.md`. Phase 2 is the **heaviest phase of the arc** -- 10 tasks, 11 V probes, 5,903 player rows + tuned has_note count of markdown notes to emit.

---

=== BEGIN EXECUTOR PROMPT ===

You are executing Phase 2 of the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). The executor reads the phase MD cold, critically reviews the plan against decisions + review-findings BEFORE executing, executes each task per its declared execution mode (inline vs subagent), runs phase-boundary verification, and halts with a structured status report.

## Recommended model + effort for the executor terminal

**Sonnet MAX** for this Phase 2 terminal.

Rationale: Phase 2 is the heaviest phase. The critical-review pass spans a multi-branch parser (4 template variants + post-processing + active-year priority + alias dedup), an `is_substantive` heuristic, a `has_note` v1 rule that's deliberately tuned in T9, a CLI dispatcher that walks 5,903 articles, and a markdown emitter with YAML escaping and wikitext-to-markdown conversion. The subagent-output audit at every task boundary needs the same reasoning headroom. T3 (parser) is the central technical risk and gets its own elevated subagent model. Operator memory `feedback_model_effort_range.md` puts judgment-dense + multi-file work at Sonnet MAX or Opus medium; Sonnet MAX is the speed default.

Subagent dispatches within Phase 2 (per phase MD execution-mode annotations):
- **T2 shared/ helpers**: Sonnet medium
- **T3 parse.ts (multi-branch parser)**: **Sonnet MAX** -- central risk; do NOT downgrade to medium
- **T4 parse.test.ts**: Sonnet medium
- **T5 flags.ts**: Sonnet medium
- **T6 upsert.ts + tests**: Sonnet medium
- **T7 emit-note.ts + tests**: Sonnet medium
- **T8 index.ts (CLI)**: Sonnet medium

T1 (scaffold), T9 (first run + operator-tuning), T10 (SCHEMA.md row-count footnote) are inline.

## Required reads (in priority order, before executing any task)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md`** -- the phase MD. Read top-to-bottom. 10 tasks, 11 V probes. **This file exceeds 25k tokens; read it in chunks if your Read tool has a token limit (offset 0-1000, then 1001-2000, etc. -- DO NOT skip sections).** Inline content for shared/ helpers, parser branches, flags rules, upsert SQL, emit-note template, CLI dispatcher all shipped in the MD.

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 2 is governed by D1 (two outputs per entity), D4 (deterministic extraction; NO LLM in player flow), D5 (two-threshold model -- `is_substantive` AND `has_note` separate booleans), D6 (is_substantive = >=2 of 5 structured-field signals), D7 (has_note v1 ships in Phase 2, tuned empirically in first run; Phase 3/4 reuse tuned shape), D8 (active_year_start = min(spawned, foundquake, earliest TH/achievement year); ignore birth_date), D13 (ASCII), D14 (Bun for loader-pipeline), D16 (phase atomicity), D17 (verification at boundary), D18 (note frontmatter mirrors row + body for unique prose), D19 (JSONB receives JS values), D20 (is_stub multi-signal, NOT `{{Player-stub}}` template tag).

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 20 findings. Five are LOAD-BEARING for Phase 2:
   - **F7** -- 129 case-variant article pairs are intentionally distinct identities (e.g., `AGAIN` vs `Again`). Parser must treat slugs as case-sensitive; do NOT collapse case-variants during stub detection or alias building. T6 (upsert) and V5 (spot-check) lock this.
   - **F9** -- `player_clan_eras` schema accepts year-absent rows (Phase 1 amended). Parser produces `clan_history: ClanHistoryEntry[]` with `start_year=null` when wiki source is year-absent (ParadokS-style flat bullet lists). Phase 5 backfill consumes; do NOT filter year-absent rows out at parser level.
   - **F16** -- 26 slash-title articles have legitimately empty wikitext (verified live). Parser + flags + upsert MUST handle gracefully -- empty wikitext yields `is_substantive=false`, `has_note=false`, source_template=`'none'`, all other fields null/empty. Do NOT crash; do NOT log as error. The two-threshold model handles natively. **Phase MD does NOT explicitly mention F16; you should verify at critical-review time that parser + flags handle empty wikitext.**
   - **F17** -- `.devil.json` is a hidden file (article titled `.devil`). T8 CLI dispatcher MUST walk the articles directory using `readdirSync` (Node/Bun fs), `Bun.Glob`, or Python `Path.iterdir()`-equivalent -- NOT `ls` shell-out. If the dispatcher misses `.devil.json`, V2 row count will return 5,902 (or 9,177 articles total) instead of the expected counts. **Phase MD does NOT explicitly mention F17; you should verify at critical-review time that the CLI's directory walk is dotfile-inclusive.**
   - **F19** -- prior-phase lesson: V probes that gate on exact "skipped N" counts are off-by-one prone. If V8 (no stale .md files) or V3 (note count match) shows a one-off discrepancy, investigate before flagging FAIL.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index ("Where we are right now" shows Phases 0-1 SHIPPED).

## Phase-1 outputs you can rely on

- Migration 008 applied; `community.players` table (16 columns + indexes) exists and is empty. Schema:
  - PK `slug TEXT`
  - `aliases TEXT[]`, `community_roles TEXT[]`, `source_categories TEXT[]` (Postgres arrays, NOT JSONB; D19 is moot for these columns)
  - `status` CHECK enum: `('Active', 'Retired', 'Inactive', 'Quit', 'unknown')`
  - `source_template` CHECK enum: `('infobox_player', 'player_info', 'bullet_prose', 'none')`
  - `is_substantive`, `has_note`, `is_stub` BOOLEAN NOT NULL DEFAULT
  - Partial index on `is_substantive WHERE is_substantive = TRUE`
- `apps/qw-oracle/curated/player-notes/` directory exists with `.gitkeep`.
- `apps/qw-oracle/curated/concept-notes/` content moved (Phase 1 git mv).
- `bunx tsc --noEmit` clean post-Phase-1.
- Snapshot at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/` -- 9,178 article files (uniform `__` slug scheme); `articles/` includes `.devil.json` (hidden).

## Operator-confirmed decisions baked into the phase MD (do NOT re-litigate)

- **D4 deterministic extraction.** No LLM-per-page. The 4-branch parser handles all template variants mechanically. T3 ships the parser; do not slip in an LLM "fallback" for hard pages.
- **D5 two-threshold model.** `is_substantive` and `has_note` are separate booleans. Compute both per row; persist both.
- **D6 is_substantive heuristic.** Exactly 5 signals (real_name non-empty/non-`???`, aliases.length > 0, clan_history.length >= 1, achievements.length >= 1, narrative_intro >= 500 bytes); >= 2 of 5 -> `is_substantive=true`. Tunable in T9 via operator review of the actual count distribution.
- **D7 has_note v1 rule.** Phase 2 ships v1; T9 tunes empirically. Phase 3/4 reuse the tuned shape. The v1 starting rule is in T5 (flags.ts) per phase MD; T9 runs the full corpus, samples 10 has_note=TRUE + 5 has_note=FALSE-with-is_substantive=TRUE, operator inspects + judges precision/recall, ONE bounded edit to `hasUniqueProse` rule, re-run.
- **D8 active-year priority.** `active_year_start = min(spawned, foundquake, earliest TH year, earliest achievement year)`. **Ignore `birth_date`.** Disagreements between fields are not surfaced as warnings; minimum wins. If all four signals absent, `active_year_start=null`.
- **D20 stub flag heuristic.** `is_stub = NOT is_substantive`. Do NOT trust the wiki's `{{Player-stub}}` template tag (editorial intent, not actual stub state). V11 verifies multi-signal vs template-tag aliasing.
- **F7 case-sensitive slugs.** Slug PK is case-preserving. Do NOT lowercase slugs at upsert. Do NOT collapse case-variant aliases ("Milton" and "MILTON" are distinct).

## Critical rules for this phase

1. **ASCII-only output discipline (D13)** for code, console output, doc additions, commit messages. The `wikitext` content from articles preserves non-ASCII (player names in Finnish/Russian/Swedish; that's data, not script output).

2. **Phase atomicity (D16).** Phase 2's coherent unit is "5,903 player rows loaded + tuned has_note count of player-notes emitted + SCHEMA.md updated + tests pass". Coherent state at boundary: V1-V11 PASS.

3. **Critical-review BEFORE executing.** Read the phase MD top-to-bottom. Particularly verify:
   - **F16 awareness**: Parser + flags handle empty wikitext gracefully (no crash; correct flag values).
   - **F17 awareness**: T8 CLI dispatcher walks the snapshot directory in a dotfile-inclusive way (`readdirSync`, `Bun.Glob`, etc.), NOT `ls` shell-out.
   - **D8 birth_date exclusion**: parser does NOT use birth_date in `active_year_start` computation.
   - **F7 case-preservation**: aliases dedup is case-sensitive; slugs are not lowercased.
   - **D6 5-signal heuristic** is implemented exactly per spec (not 4, not 6 signals).
   If any of these drift, halt and surface BEFORE executing.

4. **Subagent dispatch per execution-mode annotations.** T3 is the parser -- Sonnet MAX subagent. Do NOT downgrade to medium; the multi-branch logic + post-processing breadth needs the reasoning depth. T4-T8 are Sonnet medium.

5. **Operator-in-the-loop at T9.** T9 is NOT auto-executable. Sequence:
   1. Run the full CLI on 5,903 articles (wall-clock ~5-15 minutes depending on I/O).
   2. Compute the actual is_substantive=TRUE count and has_note=TRUE count.
   3. Sample 10 has_note=TRUE rows (random, not stratified) -- read the emitted .md files and judge: is the body content actually unique to the row's structured fields? Target: >= 8/10 precision.
   4. Sample 5 has_note=FALSE-with-is_substantive=TRUE rows -- read the source articles and judge: is there content the schema misses? Target: <= 40% false-negative.
   5. **Halt and surface to operator** with the count + sample summaries. Operator decides: ship as-is (rule v1 holds), tighten (e.g., narrative_intro >= 800), or broaden (e.g., add see_also section).
   6. After operator response, ONE bounded edit to `hasUniqueProse` in `flags.ts`, re-run the CLI, clean stale .md files (every emitted file must have a `has_note=TRUE` row).

   **Do NOT attempt to make the tuning judgment yourself.** The judgment is operator-owned; this is the explicit gate per D7.

6. **Stale-note cleanup must be deterministic.** After T9's tuning re-run, any `.md` file in `curated/player-notes/` that does NOT have a corresponding `community.players` row with `has_note=TRUE` is stale and must be deleted. V8 verifies. Use a `comm -23` of `ls curated/player-notes/*.md | sort` against `psql -t -c "SELECT slug FROM community.players WHERE has_note = TRUE" | sort` (or equivalent).

7. **F19 lesson (off-by-one V probes).** If V3 (note count = `has_note=TRUE` row count) or V8 (no stale files) shows a one-off discrepancy, investigate the cause before flagging FAIL. Most common: a stale .md file from a prior partial run, or a `.gitkeep` accidentally counted.

## Execution-mode annotations (from phase MD)

| Task | Mode | What |
|------|------|------|
| T1 | inline | Create `apps/qw-oracle/scripts/load-community/` + CLAUDE.md (full content shipped in MD). |
| T2 | subagent (Sonnet medium) | Build `shared/` utils: `wiki-text.ts`, `iso-country.ts`, `wiki-types.ts` + tests. Reused by Phases 3/4. |
| T3 | subagent (Sonnet MAX) | Build `players/parse.ts` -- 4-branch parser (Infobox player / Player-info / NO_INFOBOX bullet-prose / prose fallback) + post-processing (alias dedup, active-year priority, body-section extraction). Central technical risk. |
| T4 | subagent (Sonnet medium) | Build `players/parse.test.ts` -- fixture-based tests against Milton, ParadokS, Crit, Bomkia, Acid_(Finnish_Player), Vo0, Purity. |
| T5 | subagent (Sonnet medium) | Build `players/flags.ts` -- compute `is_substantive` (D6) + `has_note` (D7 v1 rule) + `is_stub` (D20). Pure logic + tests. |
| T6 | subagent (Sonnet medium) | Build `players/upsert.ts` + tests -- idempotent UPSERT to `community.players`; one transaction per slug. |
| T7 | subagent (Sonnet medium) | Build `players/emit-note.ts` + tests -- markdown emitter with YAML frontmatter + body sections (D18). |
| T8 | subagent (Sonnet medium) | Build `players/index.ts` -- CLI dispatcher with `--dry-run`, `--limit N`, `--slug <name>` flags. **MUST use dotfile-inclusive directory walk per F17.** |
| T9 | inline (operator-in-the-loop) | First full run + has_note v1 tuning + stale-note cleanup. Halt mid-task for operator sample inspection. |
| T10 | inline | Append row count + note count footnote to `community.players` entry in `SCHEMA.md`. |

## Pre-flight (operator-side -- verify before executing)

- `DATABASE_URL` is set; `docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT 1"` returns OK.
- `community.players` table is empty: `SELECT count(*) FROM community.players` returns 0.
- `apps/qw-oracle/curated/player-notes/` exists (Phase 1 created with `.gitkeep`).
- Snapshot intact: `find apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ -name "*.json" | wc -l` returns 9,178.

If any pre-flight fails, halt with `NEEDS_CONTEXT` status before executing T1.

## First three actions

1. **Read all four scaffold docs** (phase-2 MD in chunks, decisions, review-findings, README) top-to-bottom. Particularly note the phase MD's parser branch logic, flags signals, and T9 tuning loop.

2. **Critical review pass.** Walk T1-T10. Verify (a) F16 + F17 are addressed implicitly or surface them as findings if not; (b) D8 birth_date exclusion is enforced; (c) F7 case-preservation is in alias dedup + slug PK; (d) D6 has exactly 5 signals; (e) parser branch ordering doesn't accidentally swallow Crit-style commented-infobox pages (Q3 in phase MD); (f) T8 CLI's directory walk is dotfile-inclusive. If any drift, halt and surface BEFORE executing.

3. **Execute T1** (inline scaffold). Then dispatch T2 -> T3 (Sonnet MAX) -> T4 -> T5 -> T6 -> T7 -> T8 (subagents). After T8 ships, run T9: full CLI run + sample 10 has_note=TRUE + 5 has_note=FALSE-with-is_substantive=TRUE -> **HALT AND SURFACE TO OPERATOR** with counts + sample summaries; await operator response; apply one bounded `hasUniqueProse` edit; re-run CLI; clean stale .md files. Then T10 (SCHEMA.md). Then run V1-V11 at phase boundary.

## Halt-and-report contract

When V1-V11 are run (whether PASS or FAIL), halt and report back to the operator with:

**Status code (pick one):**
- `DONE` -- all tasks shipped, V1-V11 all PASS, T9 tuning gate cleared with operator approval.
- `DONE_WITH_CONCERNS` -- shipped but flagged doubts. List them in the body.
- `NEEDS_CONTEXT` -- blocked by missing information (most likely shape: T9 mid-phase halt for sample review).
- `BLOCKED` -- cannot complete. Specify the blocker.

**Body must include:**
- Commit hash(es). Phase 2 may produce 1-2 commits (one for code/scaffold + one for first-run output, or one combined). One per D16 is the default; document if you split.
- Actual outputs of V1-V11 (counts, query results, sample lines) -- not "PASS" alone.
- **The actual `is_substantive=TRUE` count (V6 expects 1500-2200; outside that range is heuristic miscalibration).**
- **The actual `has_note=TRUE` count after T9 tuning** (no fixed PASS threshold; whatever operator approves).
- **The actual source_template distribution** (% infobox_player, % player_info, % bullet_prose, % none) for V4.
- **The 7-player spot-check rows** (Milton, ParadokS, Crit, Bomkia, Acid_(Finnish_Player), Vo0, Purity) -- selected fields including `slug`, `display_name`, `real_name`, `nationality`, `current_clan`, `status`, `active_year_start`, `is_substantive`, `has_note`, `is_stub`, `source_template`. Paste verbatim from `psql` output.
- **T9 sample summary** -- the 15 rows you sampled, what the operator decided, what `hasUniqueProse` edit landed (if any).
- **Any new findings (F21+)** to capture. Surface; do NOT append to review-findings.md yourself.
- **Empty-wikitext row count** (rows where `source_template='none'` AND article wikitext was empty per F16). Should be ~26 (matches F16's count).
- **Confirmation T8 walks all 9,178 articles including `.devil.json`** -- spot-check `SELECT slug FROM community.players WHERE slug LIKE '.%'` returns at least one row.

**Do NOT:**
- Proceed to Phase 3.
- Mark Phase 2 complete in any tracking system.
- Append to `review-findings.md`, `decisions.md`, `arc-history.md`, or `README.md`.
- Make the T9 has_note rule tuning judgment yourself.

The orchestrator session does the phase-boundary verification (re-runs V1-V11 cold), captures cross-phase memory, updates tracking docs, and signs off Phase 2 before opening Phase 3's executor terminal.

## When in doubt

- **Empty wikitext crashes the parser** -> handle gracefully (return empty `ParsedPlayer` with all fields null/empty + source_template='none'); F16 covers this. If parser was synthesized without F16 awareness, surface for revision.
- **`.devil.json` not in `community.players` after T8 run** -> CLI directory walk skipped dotfiles; F17 not addressed. Bug in T8 implementation; surface and route back to T8 subagent.
- **is_substantive count is way off (< 500 or > 3500)** -> heuristic miscalibration. V6 FAILs. Sample 20 random rows; verify the 5-signal logic. Most common bug: signal "narrative_intro >= 500 bytes" measures wrong thing (whole article instead of pre-first-heading prose).
- **T9 sample reveals has_note rule is way off** (e.g., < 50% precision on the 10 has_note=TRUE) -> tighten the rule; one bounded edit per D7. If multiple unrelated edits are needed, surface to operator for re-scope.
- **T8 CLI runs slow (> 30 min)** -> diagnose: parser is the most common bottleneck. The `wikitext` parsing should be < 50ms per article on average; > 200ms suggests regex backtracking or repeated full-corpus scans inside the per-article loop.
- **Verification probe is ambiguous** -> read the phase MD's Recovery section; if unclear, surface with `NEEDS_CONTEXT`.
- **Subagent reports completion but spot-check shows unexpected output shape** (e.g., Milton's row missing nationality_iso) -> halt; route back to subagent with the specific failure case; operator memory `feedback_audit_predictions_not_contracts.md` -- prior-claim verification is not the same as fresh verification.

=== END EXECUTOR PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This prompt was drafted on 2026-05-05 by the orchestrator session for QWiki Phase 2 execution, after Phase 1 sign-off. Drafting included a verification subagent (Explore, Sonnet medium) that read `phase-2-players.md` in full and reported back:

**Smells the Explore agent caught (worth verifying during execution):**
- F16 / F17 NOT explicitly mentioned in phase MD body -- this prompt augments with explicit critical-review checks.
- Alias dedup case-sensitivity not specified in MD -- F7 precedent suggests case-sensitive; flagged for executor verification.
- `active_year_end` fallback logic when end_year null is unspec -- minor; default behavior is acceptable.
- COUNTRY_TO_NATIONALITY table in `iso-country.ts` is incomplete (~20 of 30+ wiki nationalities). Recommend logging warnings for unrecognized nationalities; set `nationality_iso=null`.

After the Phase 2 executor halts and reports back, the orchestrator:

1. Re-runs V1-V11 cold via `docker exec qw-oracle-postgres-dev psql` + filesystem checks.
2. Audits the 7-player spot-check vs live DB rows.
3. Verifies the source_template distribution falls in the expected range (V4 PASS = ~11/48/41/0.5% +/- a reasonable band).
4. Audits F16 handling -- spot-check 3 of the 26 empty-wikitext articles (e.g., MSKLAN2003/4on4(Playoffs)) to confirm their rows have `is_substantive=false`, `has_note=false`, `source_template='none'`, no crash.
5. Audits F17 handling -- confirm `community.players` has a row for the `.devil` article.
6. Captures any surfaced findings (F21+) to `review-findings.md`.
7. Updates README + arc-history bullet for Phase 2.
8. Drafts Phase 3 executor prompt (re-reads `phase-3-clans.md` via Explore subagent since the file likely also exceeds Read limit).
9. Surfaces sign-off + Phase 3 launch recommendation to operator.

Phase 2 has the highest mid-phase halt probability (T9 operator-tuning gate). Operator should expect to be in the loop ~once during Phase 2.
