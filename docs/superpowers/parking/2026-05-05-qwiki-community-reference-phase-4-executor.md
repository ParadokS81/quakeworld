# Phase 4 executor prompt -- QWiki community-reference arc -- SUPERSEDED

> **SUPERSEDED 2026-05-05** at the T2 operator review gate. Do NOT execute this prompt as-is. The Phase 4 design pivoted from deterministic 4-branch parser to LLM-with-checklist extraction (D4 amendment pending design pass). Players + clans stay deterministic; tournaments only get the LLM treatment. See the side-quest brainstorm handoff:
>
> `docs/superpowers/parking/2026-05-05-qwiki-phase-4-llm-extraction-sidequest.md`
>
> The side-quest's deliverable is a redrafted Phase 4 MD using the LLM-extraction path. Once design converges, a new executor parking doc will be drafted by orchestrator session #3 to replace this one. This document is preserved as historical record of the deterministic-path plan -- the three-halt structure (HALT 1 column-list / HALT 2 has_note tuning / HALT 3 phase-boundary V-probes) and the F23/F24/F27/F28 lessons baked in below remain relevant reference material for the redrafted plan.

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold against Phase 4.

Phases 0-3 shipped 2026-05-05. community.players populated (5,900 rows / 2,008 substantive / 571 notes); community.clans populated (822 rows / 688 substantive / 350 notes; F28 doc-correction at orchestrator session #2 boundary). Phase 4 is tournaments: a stratified ~50-article LLM pilot (Opus MAX) drives migration 009 column shape, then a deterministic four-branch parser loads ~627-900 tournament rows + emits a tuned count of tournament-notes.

**Phase 4 is structurally different from Phase 2/3** -- it has a mid-phase pilot (T1) + a mid-phase operator review gate (T2) BEFORE migration 009 lands. Three halts in this phase, not one:

- **HALT 1:** after T1 pilot output is written, halt for operator review at T2 gate (column list / heuristic / has_note rule sign-off).
- **HALT 2:** after T10 first full run, halt for operator T11 has_note tuning gate (sample 10 has_note=TRUE + 5 false-negative; one bounded edit if directed).
- **HALT 3:** at phase boundary after T12, run V1-V14 and halt-and-report.

**Three procedural lessons from Phases 2-3 to keep in mind:**
- **F23 -- silent DB drift.** If you find yourself in a state where intermediate runs may have left the DB partially populated, prefer `TRUNCATE community.tournaments CASCADE` + fresh run over UPSERT-on-existing-state. Each fresh run produces a coherent state.
- **F24 -- V-probe expected values.** V5 (row count ~627), V7 (template distribution fractions), V9 (substantive distribution 60-80%) are all hand-derived or pilot-proposed. Verify expected values against the parser spec or pilot output at critical-review time, not by trusting the phase MD's pre-pilot skeleton numbers. If the pilot recommends different fractions, the pilot wins.
- **F28 -- cold-verify wrap-up doc numbers.** When you write the halt-and-report numbers, run the SQL/filesystem queries again at report time -- do NOT transcribe a count from earlier in the session. Cross-check internal consistency (substantive count vs outlier count vs has_note count vs source_template totals must agree under one threshold). Phase 3's `397 vs 688` doc error came from transcribing a calibration trial value into wrap-up text.

---

=== BEGIN EXECUTOR PROMPT ===

You are executing Phase 4 of the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). The executor reads the phase MD cold, critically reviews the plan against decisions + review-findings BEFORE executing, executes each task per its declared execution mode, runs phase-boundary verification, and halts with a structured status report.

## Recommended model + effort for the executor terminal

**Sonnet MAX** for this Phase 4 terminal.

Rationale: Phase 4's pilot output review (T2 gate) is judgment-dense -- the executor presents pilot output to the operator, surfaces edge cases, flags any pilot recommendation that contradicts decisions.md. The downstream cost of a missed schema-drift or missed-edge-case at T2 is migration + parser rework + Phase 5/6/7 spill. Sonnet MAX matches Phase 0/1/2/3 ceiling. Operator memory `feedback_model_effort_range.md` puts judgment-dense + multi-file + post-pilot-review work at Sonnet MAX. Do NOT downgrade to medium.

Subagent dispatches within Phase 4 (per phase MD execution-mode annotations):

- **T1 pilot (~50-article schema discovery):** **Opus MAX** -- the one Opus dispatch in this arc. Architecture-level synthesis: column-list derivation, is_substantive heuristic threshold derivation, has_note rule v1 derivation, edge-case enumeration across 25+ years of editorial drift, observed precision/recall on the sample. Output is a structured 7-section markdown report (sample composition / template variants / field-to-column proposal / edge cases / is_substantive heuristic / has_note v1 / open questions). Read the pilot output critically before halt at T2.
- **T3 migration 009 (ALTER TABLE from pilot-approved column list):** Sonnet medium.
- **T4 shared helpers (parsePlayerTemplate + parseFlexDate):** Sonnet medium.
- **T5 tournaments/parse.ts (multi-branch parser; central technical risk):** **Sonnet MAX** -- four branches (infobox_league / infobox_lan / bullet_prose / none) with multi-field infobox parsing, date-range handling, mode/series extraction, navbox template inference, player-template collection, prize-pool parsing edge cases. Mirror Phase 3 parser at Sonnet MAX precedent.
- **T6 parse.test.ts (10 fixture-based tests):** Sonnet medium.
- **T7 flags.ts + flags.test.ts (tournament-shaped is_substantive + has_note v1 + is_stub):** Sonnet medium.
- **T8 upsert.ts + upsert.test.ts:** Sonnet medium.
- **T9 emit-note.ts + emit-note.test.ts:** Sonnet medium.
- **T10 index.ts (CLI dispatcher):** Sonnet medium.

T2 (operator pilot review), T11 (first run + has_note tuning; operator-in-the-loop), T12 (SCHEMA.md footnote) are inline.

## Required reads (in priority order, before executing any task)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-tournaments.md`** -- the phase MD. **27k tokens; read in chunks via offset/limit.** 12 tasks, V1-V14 verification probes. The pilot prompt structure (T1's required output sections) is shipped in the MD; the migration 009 skeleton is ALSO in the MD but is **pre-pilot** -- pilot output supersedes it per D9.

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 4 is governed by D1 (two outputs per entity), D4 (deterministic extraction; LLM ONLY in the T1 pilot, not in the parser per-page loop), D5 (two-threshold model), D9 (tournament schema TBD until pilot drives it; migration 009 ships post-pilot), D13 (ASCII), D14 (Bun -- per-phase one-off scripts stay Bun per the 2026-05-05 sharpening), D15 (append-only migrations; 008 was the last applied; 009 is yours), D16 (phase atomicity), D17 (verification at boundary), D18 (note frontmatter mirrors row), D19 (JSONB; potential here if pilot recommends JSONB for prize-pool/maps -- verify with operator), D20 (is_stub = !is_substantive).

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 28 findings. Load-bearing for Phase 4:
   - **F6** -- spec DDL is pre-D5; `decisions.md` D9 + your pilot output are the column-shape source of truth. Spec DDL is scope/intent only. Do NOT use the spec's column list.
   - **F8** -- `community.tournament_results.tournament_slug` has NO FK to `community.tournaments(slug)`. Soft reference. Do NOT add an FK in migration 009. Phase 5 backfill loads cross-link rows from achievement strings; FK would block legit inserts.
   - **F16** -- 26 slash-title articles have legitimately empty wikitext. Parser must handle gracefully: return a zero-field ParsedTournament with `source_template='none'`, `is_substantive=false`, `has_note=false`.
   - **F17** -- `.devil.json` is hidden; T10 CLI dispatcher MUST walk articles directory using `readdirSync` (Node/Bun fs), NOT `ls` shell-out. The Category:* filter excludes `.devil.json` anyway; walker must not crash.
   - **F23** -- if you ever find DB count drifting between intermediate runs, TRUNCATE + fresh run rather than upsert-on-partial-state. Each phase ship is one coherent run.
   - **F24** -- V-probe expected values may drift from parser spec / pilot output. Verify V5 row count, V7 template distribution, V9 substantive fraction against the pilot output and parser logic, NOT against the MD's pre-pilot hand-written numbers. If the pilot proposes 700 rows and the loader produces 705, the pilot wins (close enough). If the loader produces 400, that's a parser bug.
   - **F26** -- D6 5-signal heuristic for clans omits achievements_count; same shape MAY apply to tournaments. The pilot proposes a tournament-specific signal set; if achievements/results-count is omitted and rich-results-but-sparse-infobox tournaments fall on the wrong side, surface as a finding.
   - **F27** -- HTML comments in section bodies interrupt `extractSectionBody` trailing-meta-trim. The 27a local fix landed in clans/parse.ts; broader 27b fix in shared/wiki-text.ts is deferred. If your tournament parser hits the same pattern, apply the same local fix in tournaments/parse.ts.
   - **F28** -- when writing wrap-up numbers, re-run SQL at report time. Cross-check substantive count vs has_note count vs source_template totals for internal consistency.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index ("Where we are right now" shows Phases 0-3 SHIPPED).

## Phase 0-3 outputs you can rely on

- `community.players` populated (5,900 rows / 2,008 substantive / 571 notes); `community.clans` populated (822 rows / 688 substantive / 350 notes); `community.tournaments` table exists (Phase 1 migration 008 placeholder shape: slug, title, has_note, is_substantive, is_stub, source_template, source_categories, wiki_revision_id, wiki_fetched_at) and is empty.
- `community.player_clan_eras`, `community.tournament_results` exist and are empty (Phase 5 populates).
- `apps/qw-oracle/scripts/load-community/shared/{wiki-text.ts,iso-country.ts,wiki-types.ts}` exist and are functional. **Reuse them -- do NOT copy or duplicate.**
- `apps/qw-oracle/scripts/load-community/players/` and `clans/` contain the structural templates for the tournament pipeline (parse.ts, flags.ts, upsert.ts, emit-note.ts, index.ts). Read them before dispatching T5-T10 subagents.
- `apps/qw-oracle/curated/tournament-notes/` exists with `.gitkeep`. Will be populated at T11.
- `bunx tsc --noEmit` clean post-Phase-3.
- Snapshot at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/` -- 9,178 article files; uniform double-underscore slug scheme for slash-titles (Phase 0 corpus-wide refetch).
- Migration sequence applied: 008 was the most recent. Phase 4 ships 009 (post-pilot column shape).

**Key Phase 2-3 learnings that carry forward to Phase 4:**

1. **`extractSectionBody` strips trailing Category/NOTOC/empty/HTML-comment lines.** Live in `shared/wiki-text.ts`. Tournament parser inherits this; do not re-implement.
2. **HTML-comment stripping before threshold checks.** Phase 2/3 `flags.ts` computes byte-length AFTER stripping HTML comments. T7 (tournaments/flags.ts) should do the same for any narrative-byte-length signal the pilot recommends.
3. **F27 27a pattern -- standalone `[[Category:...]]` lines.** Phase 3's `clans/parse.ts:stripClanStubBoilerplate` drops standalone `[[Category:...]]` lines from External links body. If tournament External links sections have the same pattern (likely they do for older tournament pages with stub markers), apply the same defensive strip in `tournaments/parse.ts`.
4. **Stale-note cleanup must be deterministic.** After T11 tuning, any `.md` in `curated/tournament-notes/` that does NOT correspond to a `has_note=TRUE` row is stale and must be deleted. Same `comm -23` pattern.
5. **TRUNCATE with CASCADE** if resetting. `TRUNCATE community.tournaments CASCADE` (defensive even though no FK currently points at tournaments).
6. **D13 ASCII discipline.** Code, console output, doc additions, commit messages: ASCII-only, no emoji, no em/en-dashes. Wiki content may be non-ASCII (Russian/Finnish/Swedish tournament names) -- that's data, not output.
7. **`readdirSync` + `.endsWith('.json')` for directory walk** (F17 pattern; copy from Phase 2/3 index.ts).

## Operator-confirmed decisions baked into the phase MD (do NOT re-litigate)

- **D4 deterministic extraction.** No LLM in the per-page parser loop. The T1 pilot is the ONE LLM-shaped subtask in the arc (schema discovery, ~50 articles, one-time).
- **D5 two-threshold model.** is_substantive (recognition) and has_note (prose-content) are separate booleans. Compute both; persist both.
- **D6 spirit preserved for tournaments** (signal-based recognition flag) -- pilot proposes the tournament-specific signal set. Not D6 player rule literally.
- **D7 has_note rule v1 ships in T7 (per pilot proposal); tuned empirically in T11.** Not pre-locked.
- **D9 tournament schema is TBD-until-pilot.** Migration 009 ships post-pilot from operator-approved column list, NOT from MD pre-pilot skeleton.
- **D14 carve-out scope (sharpened 2026-05-05).** Per-phase one-off scripts (stratification helpers, ad-hoc selection scripts) stay Bun. Python is ONLY for snapshotter + engine extractors.
- **D15 append-only migrations.** Migration 009 is yours. Do NOT edit applied migration 008 (F20: SHA-checked file hash).
- **D18 note frontmatter mirrors row + body for unique prose.** Achievement / TH / results lists do NOT duplicate in the body -- they live in `community.tournament_results` populated by Phase 5.
- **D20 stub flag.** is_stub = !is_substantive. Do NOT trust wiki's `Category:Tournament stubs` if any.
- **F8 -- no FK on tournament_results.tournament_slug.** Migration 009 must NOT add one.

## Critical rules for this phase

1. **ASCII-only output discipline (D13)** for code, console output, doc additions, commit messages.

2. **Phase atomicity (D16).** Phase 4's coherent unit is "pilot output approved + migration 009 applied + tournaments parser landed + ~627-900 rows loaded + tuned has_note count of tournament-notes emitted + SCHEMA.md updated + tests pass". Coherent state at boundary: V1-V14 PASS.

3. **Critical-review BEFORE executing.** Particularly verify:
   - **F6 awareness:** spec DDL is pre-D5; do NOT use it. Migration 009 column shape comes from pilot output ONLY.
   - **F8 awareness:** migration 009 must NOT add FK on tournament_results.tournament_slug. (Phase 1 already correctly omitted it; do not re-introduce.)
   - **F16 awareness:** parser handles empty wikitext gracefully (no crash; source_template='none'; is_substantive=false; has_note=false).
   - **F17 awareness:** T10 CLI uses `readdirSync`, not `ls` shell-out.
   - **D9 awareness:** the migration 009 skeleton in T3 is **pre-pilot drafter recon**; do not ship it verbatim. Pilot output supersedes. If pilot output adds/removes/renames columns from the skeleton, **use the pilot's list verbatim** -- do NOT silently merge the skeleton with the pilot output.
   - **D14 awareness:** any one-off script for the pilot stratification is Bun (not Python). Snapshotter and engine extractors are the only Python carve-outs.
   - **shared/ helper imports:** subagents import from `../shared/wiki-text.ts` etc. (3-level relative path from `tournaments/`), NOT from a copy.
   If any critical items fail review, halt with BLOCKED before starting work.

4. **Subagent dispatch per execution-mode annotations.** T1 = Opus MAX. T5 = Sonnet MAX. T3, T4, T6, T7, T8, T9, T10 = Sonnet medium. T2, T11, T12 = inline.

5. **HALT 1 -- T2 operator review gate (BEFORE migration 009 ships).** After T1 pilot subagent writes `phase-4-pilot-output.md`, do NOT proceed to T3 automatically. Sequence:
   1. Read the pilot output critically -- check pilot's column list against decisions.md (no FK on tournament_results.tournament_slug, no JSONB without operator confirmation, no column shape that contradicts D9's "Phase 4 ships migration 009 with tournament-specific columns").
   2. Surface to operator: pilot output path + summary of column-list / heuristic / has_note recommendations + any pilot recommendations that conflict with decisions or look wrong.
   3. **Halt with NEEDS_CONTEXT** until operator approves or revises pilot output.
   4. Operator approval -> proceed to T3 (migration 009 from approved column list).
   **Do NOT make the column-list judgment yourself.** D9 puts this in operator's hands.

6. **HALT 2 -- T11 has_note tuning gate (after first full run).** Sequence:
   1. Run the full CLI on tournament articles (~627-900 rows; wall-clock ~1-3 minutes).
   2. Compute is_substantive=TRUE count and has_note=TRUE count.
   3. Sample 10 has_note=TRUE rows -- open emitted .md files, judge: is the body content actually unique prose the schema cannot carry? Target: >= 8/10 precision.
   4. Sample 5 has_note=FALSE-with-is_substantive=TRUE rows -- check source articles: is there prose the rule misses? Target: <= 40% false-negative.
   5. **Halt and surface to operator** with counts + sample summaries. Operator decides: ship as-is, tighten, or broaden.
   6. After operator response, ONE bounded edit to `hasUniqueProse` (or the equivalent named clause from pilot's has_note v1) in flags.ts (if needed), re-run, clean stale notes.
   **Do NOT make the tuning judgment yourself.** Operator-owned per D7.

7. **HALT 3 -- phase-boundary V1-V14.** Run V1-V14 cold (re-run the SQL, do NOT transcribe earlier counts). Cross-check internal consistency (F28 lesson):
   - is_substantive count + 19-style outlier count + has_note count + source_template totals must all agree under one heuristic threshold.
   - If you ran multiple threshold trials during T1/T7/T11, only the final post-tune values appear in the report.
   - Cite SQL output verbatim for each V probe.

8. **Stale-note cleanup is deterministic.** After T11 tuning re-run, delete any `curated/tournament-notes/<slug>.md` whose slug has `has_note=FALSE` in community.tournaments. V proof: compare `find curated/tournament-notes -name "*.md" | sort` against `psql -t -c "SELECT slug FROM community.tournaments WHERE has_note = TRUE" | sort`.

9. **Pilot output is committed.** `phase-4-pilot-output.md` is part of the phase ship. It's the durable record of why migration 009 has its shape. Operator's approval annotation goes IN that file (or in the commit message that ships it).

## Execution-mode annotations (from phase MD)

| Task | Mode | What |
|------|------|------|
| T1 | subagent (Opus MAX) | Pilot: read ~50 stratified tournament articles; produce `phase-4-pilot-output.md` (7 sections: sample composition / template variants / field-to-column proposal / edge cases / is_substantive heuristic / has_note v1 rule / open questions). |
| T2 | inline (operator-in-the-loop) | Operator review gate. Read pilot output, surface to operator, await approval. **HALT 1.** |
| T3 | subagent (Sonnet medium) | Write migration 009 ALTER TABLE from operator-approved column list. Apply via `bun apps/qw-oracle/db/migrate.ts`. |
| T4 | subagent (Sonnet medium) | Add shared helpers: `parsePlayerTemplate` ({{Player\|id\|flag=xx}}) + `parseFlexDate` (wiki date variants) in `shared/wiki-text.ts` + `shared/date-parse.ts`. With tests. |
| T5 | subagent (Sonnet MAX) | Build `tournaments/parse.ts` -- four-branch parser (infobox_league / infobox_lan / bullet_prose / none). Imports from shared/. |
| T6 | subagent (Sonnet medium) | Build `tournaments/parse.test.ts` -- 10 fixture articles. |
| T7 | subagent (Sonnet medium) | Build `tournaments/flags.ts` + `flags.test.ts` -- tournament-shaped is_substantive (pilot signal set), has_note (D7 v1 from pilot), is_stub (D20). |
| T8 | subagent (Sonnet medium) | Build `tournaments/upsert.ts` + `upsert.test.ts` -- idempotent UPSERT to community.tournaments; mirrors players/clans pattern. |
| T9 | subagent (Sonnet medium) | Build `tournaments/emit-note.ts` + `emit-note.test.ts` -- frontmatter mirrors row + body carries prose/results/bracket/external-links sections. |
| T10 | subagent (Sonnet medium) | Build `tournaments/index.ts` -- CLI dispatcher. `readdirSync` for dotfile-inclusive walk. |
| T11 | inline (operator-in-the-loop) | First full run + has_note v1 tuning + stale-note cleanup. **HALT 2.** |
| T12 | inline | `bunx tsc --noEmit` + SCHEMA.md footnote update (community.tournaments column list + row count). |

## Pre-flight (operator-side -- verify before executing)

- `DATABASE_URL` is set; Postgres container is running.
- `community.tournaments` table exists and is empty: `SELECT count(*) FROM community.tournaments` returns 0.
- `apps/qw-oracle/curated/tournament-notes/` exists.
- Snapshot intact: `find apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ -name "*.json" | wc -l` returns 9178.
- Last applied migration is 008: `psql -c "SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 3"` shows 008 at top.
- Phase 3 ship state matches expectations: `community.clans` count = 822, is_substantive = 688, has_note = 350.

If any pre-flight fails, halt with `NEEDS_CONTEXT` before executing T1.

## First three actions

1. **Read all four scaffold docs** (phase-4-tournaments MD via offset/limit chunks since 27k tokens; decisions; review-findings; README) top-to-bottom.

2. **Critical review pass.** Walk T1-T12. Verify: (a) F6 -- pilot output supersedes spec DDL; (b) F8 -- migration 009 must NOT add FK; (c) F16 -- parser handles empty wikitext; (d) F17 -- T10 uses readdirSync; (e) D9 -- migration 009 skeleton in T3 is pre-pilot drafter recon, not ship spec; (f) D14 -- per-phase scripts stay Bun; (g) shared/ imports have the right relative path (3 levels: `../shared/`); (h) F23/F24/F27/F28 lessons baked into your halt-and-report contract. If any drift, halt with BLOCKED before executing.

3. **Dispatch T1 (Opus MAX pilot).** Provide the subagent with: phase-4 MD's T1 prompt (7 required output sections), the tournament-category pages list, the snapshot path, and the constraint that output goes to `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-4-pilot-output.md`. After T1 completes, **HALT 1** -- read pilot output critically, surface to operator with structured summary, await operator approval before proceeding to T3.

## Halt-and-report contract

Three halts in this phase. Each one has its own report shape.

**HALT 1 report (after T1 pilot):**
- Path to `phase-4-pilot-output.md`.
- Plain-English summary: column-list count, is_substantive heuristic shape, has_note v1 rule shape, open questions count.
- Any pilot recommendations that conflict with decisions or look wrong (cite specific decisions).
- Status: `NEEDS_CONTEXT` (await operator approval).

**HALT 2 report (after T11 first run + tuning):**
- Actual `community.tournaments` row count.
- Actual is_substantive=TRUE count + has_note=TRUE count.
- The 10 has_note=TRUE samples + 5 false-negative samples (slug + body excerpt summary).
- What `hasUniqueProse` edit (if any) the operator directed.
- Status: `NEEDS_CONTEXT` (await operator approval to ship as-is OR re-tune).

**HALT 3 report (phase boundary, after T12):**
- Status code: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED.
- Commit hash(es). Phase 4 typically produces 1-2 commits (pilot output + migration + code at phase boundary per D16).
- **Cold-verified V1-V14 outputs** (re-run SQL at report time per F28 lesson; cite verbatim).
- **Actual community.tournaments row count** (V5; expected ~627-900 from pilot).
- **Actual source_template distribution** (V7; from pilot proposal -- e.g., infobox_league / infobox_lan / bullet_prose / none).
- **Actual is_substantive=TRUE count** (V9; expected 60-80% per pilot).
- **Actual has_note=TRUE count after T11 tuning** (no fixed gate; whatever operator approved).
- **The 10-tournament spot-check rows** (from pilot's reference fixture set; expose key fields per pilot output).
- **The pilot output approval marker** (commit message, file annotation, or operator-verbal).
- **Migration 009 column list** (the actual columns added; cite from `\d community.tournaments`).
- **Internal-consistency cross-check** (F28): substantive count + outlier count + has_note count agree under final heuristic.
- **Any new findings (F29+)** to capture. Surface; do NOT append to review-findings.md yourself without explicit operator instruction.

**Do NOT:**
- Proceed to Phase 5 from this terminal.
- Append to `review-findings.md`, `decisions.md`, `arc-history.md`, or `README.md` (those are orchestrator-layer updates).
- Make the T2 column-list judgment yourself.
- Make the T11 has_note tuning judgment yourself.
- Ship migration 009 verbatim from the MD's pre-pilot skeleton.
- Add JSONB columns without operator confirmation (D19 reminder; pilot may propose JSONB for prize-pool / maps -- escalate before shipping).

## When in doubt

- **Empty wikitext crashes the parser** -> handle gracefully (return zero-field ParsedTournament with source_template='none'); F16 covers this. Same fix as Phase 2/3.
- **Pilot output column list contradicts D9 placeholder columns** -> D9 sized the placeholder for safety; pilot output drives the actual. If pilot adds tournament-specific columns (parent_series, season_number, etc.), that's the design. If pilot recommends modifying placeholder columns (slug, title, etc.), surface to operator -- those are stable.
- **Pilot recommends JSONB for prize_pool or maps** -> halt with NEEDS_CONTEXT. D19 is dormant for tournaments today; introducing JSONB needs operator confirmation + F1 regression-gate update.
- **Migration 009 SHA-mismatch on rerun** -> migration 009 was edited after applying. F20 lesson; create migration 010 instead. Do NOT edit 009 in place.
- **V5 fails (count below pilot estimate by >10%)** -> category-filter regex over-narrowing OR a new category variant. Sample 10 expected-but-missing slugs; identify systematic pattern.
- **V5 fails (count above pilot estimate by >10%)** -> category-filter over-matching (e.g., match-report leakage into Category:Leagues per phase MD Q3). Sample 10 unexpected-included slugs; propose exclusion rule; surface to operator.
- **V7 fails (template distribution off)** -> pilot's branch-detection regex doesn't match parser's. Re-read pilot output to confirm; align parser regex.
- **V9 fails (is_substantive distribution off)** -> signal threshold miscalibration. Sample 20 random rows; verify the tournament-specific signal set fires correctly for a known-rich tournament (EQL_Season_1 or similar from pilot fixtures).
- **`tournaments/index.ts` skips tournament articles** -> filter function uses the wrong category names. Pilot output enumerates which Category:* values qualify; verify all are in the filter.
- **Pilot subagent's output is shorter than expected or skips one of the 7 required sections** -> NOT acceptable; re-dispatch the pilot with explicit "complete all 7 sections" instruction. Opus MAX should not skip sections.

=== END EXECUTOR PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This prompt was drafted 2026-05-05 by orchestrator session #2 as part of the Phase 3 wrap-up / Phase 4 launch handoff.

**Phase 3 learnings baked into this prompt:**
- F26 awareness for tournament heuristic: if tournaments have rich-results-but-sparse-infobox cases, the pilot's signal set may need an achievements/results-count signal even if the placeholder doesn't.
- F27 27a pattern: standalone `[[Category:...]]` line stripping in External links body is likely needed for tournament parser too. Apply local fix in tournaments/parse.ts if the pattern surfaces.
- F28 cold-verify discipline: orchestrator caught Phase 3's `397 vs 688` doc-transcription error at session-boundary cold-verify. Phase 4 executor must re-run V probes at HALT 3 report time, not transcribe earlier counts.

**Architectural notes for orchestrator:**
- This is the only phase in the arc with a mid-phase Opus MAX dispatch. The pilot's downstream cost is high (migration + parser + Phase 5/6/7 spill), justifying the model jump.
- Three halts in this phase. Operator engagement is mandatory at HALT 1 (column list) and HALT 2 (has_note tuning).
- Migration 009's column shape is genuinely TBD until pilot. The MD's skeleton in T3 is drafter pre-pilot recon; pilot output is the actual spec.

**After Phase 4 executor halts and reports back at HALT 3, the orchestrator:**
1. Re-runs V1-V14 cold via psql + filesystem checks (F23 discipline).
2. Audits 10-tournament spot-check vs live DB rows.
3. Verifies migration 009 column list vs operator-approved pilot output.
4. Audits F16 handling (spot-check 2-3 empty-wikitext tournament articles).
5. Cross-checks internal consistency of report numbers (F28 discipline).
6. Captures any new findings (F29+) to review-findings.md.
7. Updates README.md + arc-history.md bullet for Phase 4.
8. Drafts Phase 5 executor prompt (reads phase-5-cross-link-backfill.md).
9. Surfaces sign-off + Phase 5 launch recommendation to operator.

**Context budget projection:**
- Phase 4 executor at Sonnet MAX: ~150-220k expected (T1 Opus pilot + T5 Sonnet MAX parser are the heaviest). Should fit comfortably under 350k smell zone.
- This orchestrator session at handoff time: ~85k consumed. Plenty of room to pick up HALT 3 and draft Phase 5.
