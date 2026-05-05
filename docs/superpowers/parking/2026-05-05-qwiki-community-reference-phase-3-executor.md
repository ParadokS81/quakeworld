# Phase 3 executor prompt -- QWiki community-reference arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold against Phase 3.

Phases 0-2 shipped 2026-05-05. community.players populated (5,900 rows, 571 notes). Phase 3 is the clan extraction pipeline: four-branch parser + load 822 rows into community.clans + emit tuned count of clan notes to curated/clan-notes/. No new migration needed.

---

=== BEGIN EXECUTOR PROMPT ===

You are executing Phase 3 of the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). The executor reads the phase MD cold, critically reviews the plan against decisions + review-findings BEFORE executing, executes each task per its declared execution mode (inline vs subagent), runs phase-boundary verification, and halts with a structured status report.

## Recommended model + effort for the executor terminal

**Sonnet medium** for this Phase 3 terminal.

Rationale: Phase 3 is simpler than Phase 2. The four-branch clan parser has fewer fields, no achievement template parsing, no active-year priority, no community-roles extraction -- simpler than the player parser. The subagent-output audit at task boundaries still needs care, but the reasoning density is lower than Phase 2's heaviest tasks. Subagent dispatches follow the execution-mode annotations in the phase MD (all Sonnet medium).

Subagent dispatches within Phase 3 (per phase MD execution-mode annotations):
- **T2 parse.ts (four-branch clan parser)**: Sonnet medium
- **T3 parse.test.ts**: Sonnet medium
- **T4 flags.ts + flags.test.ts**: Sonnet medium
- **T5 upsert.ts + upsert.test.ts**: Sonnet medium
- **T6 emit-note.ts + emit-note.test.ts**: Sonnet medium
- **T7 index.ts (CLI)**: Sonnet medium

T1 (scaffold), T8 (first run + has_note tuning; operator-in-the-loop), T9 (tsc + SCHEMA.md footnote) are inline.

## Required reads (in priority order, before executing any task)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-3-clans.md`** -- the phase MD. Read top-to-bottom. 9 tasks, 9 V probes. The inline content for the clan parser branches, flags signals, upsert SQL, emit-note template, and CLI dispatcher are all shipped in the MD. **Read in chunks if needed (file is ~1260 lines).**

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 3 is governed by D1 (two outputs per entity), D4 (deterministic extraction; NO LLM in clan flow), D5 (two-threshold model), D6 (is_substantive adapted for clans), D7 (has_note v1 tuned in T8), D13 (ASCII), D14 (Bun), D16 (phase atomicity), D17 (verification at boundary), D18 (note frontmatter mirrors row), D19 (JSONB; moot here -- community.clans uses TEXT[] only), D20 (is_stub = !is_substantive).

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 22 findings. Load-bearing for Phase 3:
   - **F7** -- 129 case-variant article pairs are intentionally distinct. Clan parser must treat slugs as case-sensitive; do NOT collapse case variants.
   - **F10** -- `{{Infobox 4on4team}}` is the fourth clan template variant (44 articles / ~5.4% of clans). Phase 1 migration 008 was amended 2026-05-05 to include `'infobox_4on4team'` in the source_template CHECK enum. Phase 3 parser writes `'infobox_4on4team'` directly; no coercion shim. This is already in the DB -- no action needed; just confirm during critical review.
   - **F11** -- Actual Category:Clans count is 822, not spec's 829. V1 PASS condition is 822.
   - **F16** -- 26 slash-title articles have legitimately empty wikitext. Parser must handle empty wikitext gracefully: return a zero-field ParsedClan with `source_template='none'`, `is_substantive=false`, `has_note=false`. Same pattern as Phase 2.
   - **F17** -- `.devil.json` is a hidden file. T7 CLI dispatcher MUST walk the articles directory using `readdirSync` (Node/Bun fs), NOT `ls` shell-out. The clan filter (Category:Clans) will exclude `.devil.json` anyway, but the walker must not crash on dotfiles.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index ("Where we are right now" shows Phases 0-2 SHIPPED).

## Phase 2 outputs you can rely on

- `community.players` is populated with 5,900 rows (Phase 2 complete). `community.clans` table exists (Phase 1 migration 008) and is empty.
- `apps/qw-oracle/scripts/load-community/` exists. `shared/wiki-text.ts`, `shared/iso-country.ts`, `shared/wiki-types.ts` are present and functional. **Reuse them -- do NOT copy or duplicate.**
- `apps/qw-oracle/curated/clan-notes/` exists with `.gitkeep`. Will be populated by Phase 3.
- `bunx tsc --noEmit` is clean post-Phase-2.
- `apps/qw-oracle/scripts/load-community/players/` contains the structural templates for the clan pipeline (upsert.ts, emit-note.ts, index.ts shapes). Read them before dispatching T5/T6/T7 subagents.
- Snapshot at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/` -- 9,178 article files.
- Migration 008 applied with `'infobox_4on4team'` in community.clans.source_template CHECK enum (F10 amendment applied at Phase 1 time).

**Key Phase 2 learnings that carry forward to Phase 3:**

1. **`extractSectionBody` now strips trailing Category/NOTOC/empty lines AND HTML comments.** This is already baked into `shared/wiki-text.ts` from Phase 2. Do not re-implement; rely on the existing behavior.

2. **HTML comment stripping before threshold checks.** Phase 2's `flags.ts` computes `narrativeClean` (HTML-comment-stripped version of narrative_intro) before the 500-char threshold check. Phase 3's `computeClanFlags` should do the same for `narrative_byte_length` if any clan articles have HTML-comment-polluted intro sections. Recommend: compute `narrative_byte_length` from the HTML-comment-stripped version of `narrative_intro + history_section`.

3. **Stale-note cleanup must be deterministic.** After T8 tuning, any `.md` file in `curated/clan-notes/` that does NOT correspond to a `has_note=TRUE` row in `community.clans` is stale and must be deleted. Same `comm -23` pattern as Phase 2.

4. **TRUNCATE with CASCADE if resetting.** If the executor needs to truncate `community.clans` for a clean re-run, use `TRUNCATE community.clans CASCADE` (not bare TRUNCATE) in case FK constraints exist. Currently no FK points at clans, but defensive is better.

5. **D13 ASCII discipline.** The Phase 2 commit message and all console output was ASCII-only. Apply the same discipline here. The wiki article content may contain non-ASCII (Swedish clan names, etc.) -- that is data, not script output.

6. **`readdirSync` + `.endsWith('.json')` for directory walk.** Phase 2's index.ts used `readdirSync(articlesDir).filter(f => f.endsWith('.json'))` for F17 compliance. Copy this pattern exactly in T7 (clans/index.ts).

## Operator-confirmed decisions baked into the phase MD (do NOT re-litigate)

- **D4 deterministic extraction.** No LLM per clan page. The four-branch parser handles all template variants mechanically.
- **D5 two-threshold model.** `is_substantive` and `has_note` are separate booleans. Compute both; persist both.
- **D6 adapted for clans.** 5 signals: hasPrefix, hasFounded, hasFoundedBy, hasIrc, hasNarrativeProse (>= 500B). >= 2 of 5 -> is_substantive=true. Tunable at T8.
- **D7 has_note v1 rule.** Ships in flags.ts T4; tuned empirically in T8. Not pre-locked.
- **D20 stub flag.** is_stub = !is_substantive. Do NOT trust wiki's `Category:Clan stubs` tag.
- **F7 case-sensitive slugs.** Do NOT lowercase slugs at upsert. `Slackers` and `slackers` (if both exist) are distinct rows.
- **F10 resolved.** `'infobox_4on4team'` is in the CHECK enum. Parser writes it directly.
- **F11 accepted.** 822 is the ground-truth count from file-system recon.

## Critical rules for this phase

1. **ASCII-only output discipline (D13)** for code, console output, doc additions, commit messages.

2. **Phase atomicity (D16).** Phase 3's coherent unit is "822 clan rows loaded + tuned has_note count of clan-notes emitted + SCHEMA.md updated + tests pass". Coherent state at boundary: V1-V9 PASS.

3. **Critical-review BEFORE executing.** Particularly verify:
   - **F10 awareness:** is `'infobox_4on4team'` actually in the live DB's CHECK constraint? Spot-check via `\d community.clans` or `SELECT column_name, check_clause FROM information_schema.check_constraints WHERE constraint_schema='community'`. Do not assume; verify.
   - **F16 awareness:** parser handles empty wikitext gracefully (no crash; source_template='none'; is_substantive=false; has_note=false).
   - **F17 awareness:** T7 CLI uses `readdirSync`, not `ls` shell-out.
   - **D6 5-signal heuristic** is implemented exactly per spec (not 4, not 6; the 5 clan signals differ from player signals).
   - **shared/ helper imports:** T2 subagent imports from `../shared/wiki-text.ts` etc. (3-level relative path from `clans/`), NOT from a copy.
   If any critical items fail review, halt with BLOCKED before starting work.

4. **Subagent dispatch per execution-mode annotations.** All code synthesis tasks are subagent (Sonnet medium). T1, T8, T9 are inline.

5. **Operator-in-the-loop at T8.** T8 is NOT auto-executable. Sequence:
   1. Run the full CLI on 822 Category:Clans articles (wall-clock ~1-3 minutes).
   2. Compute is_substantive=TRUE count and has_note=TRUE count.
   3. Sample 10 has_note=TRUE rows -- open the emitted .md files and judge: is the body content actually unique prose the schema cannot carry? Target: >= 8/10 precision.
   4. Sample 5 has_note=FALSE-with-is_substantive=TRUE rows -- check the source articles: is there prose the rule misses? Target: <= 40% false-negative.
   5. **Halt and surface to operator** with counts + sample summaries. Operator decides: ship as-is, tighten, or broaden.
   6. After operator response, ONE bounded edit to `hasUniqueProse` in flags.ts (if needed), re-run, clean stale notes.
   **Do NOT make the tuning judgment yourself.** The judgment is operator-owned per D7.

6. **Stale-note cleanup is deterministic.** After T8 tuning re-run, delete any `curated/clan-notes/<slug>.md` whose slug has `has_note=FALSE` in community.clans. V proof: compare `ls curated/clan-notes/*.md | sort` against `psql -t -c "SELECT slug FROM community.clans WHERE has_note = TRUE" | sort`.

7. **getClanTitleToSlugMap() export.** Task 7 (clans/index.ts) must export `getClanTitleToSlugMap(): Promise<Map<string, string>>` per the phase MD. Phase 5 imports this function. Do NOT skip it.

## Execution-mode annotations (from phase MD)

| Task | Mode | What |
|------|------|------|
| T1 | inline | Create `scripts/load-community/clans/` + CLAUDE.md line-edit. |
| T2 | subagent (Sonnet medium) | Build `clans/parse.ts` -- four-branch parser (clan_info / infobox_4on4team / infobox_clan / bullet_prose+none). Imports from shared/. |
| T3 | subagent (Sonnet medium) | Build `clans/parse.test.ts` -- 5 fixture articles (Sublime, Euthanasia, Apocalypse_2000, Firing_Squad, Morituri). |
| T4 | subagent (Sonnet medium) | Build `clans/flags.ts` + `flags.test.ts` -- is_substantive (5-signal D6), has_note (D7 v1), is_stub (D20). |
| T5 | subagent (Sonnet medium) | Build `clans/upsert.ts` + `upsert.test.ts` -- idempotent UPSERT to community.clans; mirrors players/upsert.ts with clan column set. |
| T6 | subagent (Sonnet medium) | Build `clans/emit-note.ts` + `emit-note.test.ts` -- markdown emitter; frontmatter mirrors row + body carries prose/history/achievements/external-links. |
| T7 | subagent (Sonnet medium) | Build `clans/index.ts` -- CLI dispatcher. Must export `getClanTitleToSlugMap()`. `readdirSync` for dotfile-inclusive directory walk. |
| T8 | inline (operator-in-the-loop) | First full run + has_note v1 tuning + stale-note cleanup. Halt mid-task for operator sample inspection. |
| T9 | inline | `bunx tsc --noEmit` + SCHEMA.md footnote. |

## Pre-flight (operator-side -- verify before executing)

- `DATABASE_URL` is set; Postgres container is running.
- `community.clans` table exists and is empty: `SELECT count(*) FROM community.clans` returns 0.
- `apps/qw-oracle/curated/clan-notes/` exists.
- Snapshot intact: `find apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ -name "*.json" | wc -l` returns 9178.
- Fixture articles accessible: `ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Sublime.json Euthanasia.json Apocalypse_2000.json Firing_Squad.json Morituri.json Slackers.json`.

If any pre-flight fails, halt with `NEEDS_CONTEXT` before executing T1.

## First three actions

1. **Read all four scaffold docs** (phase-3-clans MD, decisions, review-findings, README) top-to-bottom.

2. **Critical review pass.** Walk T1-T9. Verify: (a) F10 -- confirm `'infobox_4on4team'` is in the live CHECK; (b) F16 -- parser handles empty wikitext; (c) F17 -- T7 uses readdirSync; (d) D6 has exactly 5 signals using the clan-adapted signal set; (e) shared/ imports have the right relative path (3 levels: `../shared/`); (f) `getClanTitleToSlugMap()` export is in T7's Steps. If any drift, halt with BLOCKED before executing.

3. **Execute T1** (inline scaffold). Then dispatch T2 -> T3 -> T4 -> T5 -> T6 -> T7 (subagents). After T7 ships, run T8: full CLI + sample 10 has_note=TRUE + 5 has_note=FALSE-with-is_substantive=TRUE -> **HALT AND SURFACE TO OPERATOR** with counts + sample summaries; await operator response; apply one bounded `hasUniqueProse` edit (if directed); re-run CLI; clean stale notes. Then T9 (tsc + SCHEMA.md). Then run V1-V9 at phase boundary.

## Halt-and-report contract

When V1-V9 are run (whether PASS or FAIL), halt and report back to the operator with:

**Status code:** DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

**Body must include:**
- Commit hash(es). Phase 3 typically produces 1 commit (all code + notes at phase boundary per D16).
- Actual outputs of V1-V9 (counts, query results) -- not "PASS" alone.
- **Actual community.clans row count** (V1 expects 822; outside 800-850 warrants investigation).
- **Actual source_template distribution** (V2 expects ~500+ clan_info / ~280+ bullet_prose / ~44 infobox_4on4team / ~2 infobox_clan / <10 none).
- **Actual is_substantive=TRUE count** (expected: 400-700 based on clan data density; outside this range = signal miscalibration).
- **Actual has_note=TRUE count after T8 tuning** (no fixed gate; whatever operator approves; expected: 150-400).
- **The T8 sample summary** -- the 10 has_note=TRUE + 5 false-negative rows you sampled, what the operator decided, what `hasUniqueProse` edit landed (if any).
- **The 5-clan spot-check rows** (Slackers, Sublime, Euthanasia, Firing_Squad, Morituri) from the DB -- key fields: slug, prefix, nationality_iso, founded_year, has_note, is_substantive, is_stub, source_template.
- **Any new findings (F23+)** to capture. Surface; do NOT append to review-findings.md yourself without explicit operator instruction.
- **Confirmation `getClanTitleToSlugMap()` is exported** from clans/index.ts.
- **Confirmation V3 (no stub emits a note)** -- zero rows from `SELECT slug FROM community.clans WHERE is_substantive=FALSE AND has_note=TRUE`.

**Do NOT:**
- Proceed to Phase 4.
- Append to `review-findings.md`, `decisions.md`, `arc-history.md`, or `README.md` (those are orchestrator-layer updates).
- Make the T8 has_note tuning judgment yourself.

## When in doubt

- **Empty wikitext crashes the parser** -> handle gracefully (return zero-field ParsedClan with source_template='none'); F16 covers this. Same fix as Phase 2.
- **V1 fails (count < 822)** -> check `warnings` count. If > 0, a JSON parse error or CHECK violation caused a skip. Identify via loader log. Most likely: unknown status value not in normalizeClanStatus, or an unexpected source_template value hitting the CHECK constraint.
- **V2 fails (unexpected source_template value)** -> a NEW template variant beyond the five CHECK-constrained values surfaced. Treat as a new finding (F23+). DO NOT crash; add a defensive fallback to `'none'` and surface to operator.
- **is_substantive count is way off (< 100 or > 700)** -> signal miscalibration. Sample 20 random rows; verify the 5-signal logic fires correctly for a known-rich article (Euthanasia, Sublime).
- **getClanTitleToSlugMap() missing from index.ts** -> T7 subagent omitted it. Re-dispatch with the specific missing export named.
- **T7 CLI runs but skips Category:Clans articles** -> filter function uses `includes()` on article.categories; verify it's checking 'Category:Clans' (exact string, no trailing space, no colon variant).

=== END EXECUTOR PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This prompt was drafted 2026-05-05 as part of the Phase 2 wrap-up / Phase 3 launch handoff.

**Phase 2 learnings baked into this prompt:**
- extractSectionBody HTML-comment-stripping is live in shared/wiki-text.ts -- Phase 3 parser inherits it automatically.
- HTML comment inflation of narrative thresholds: baked into the "Phase 2 learnings" critical note to use comment-stripped narrative for byte-length computation.
- Stale-note cleanup pattern: explicitly scripted (same as Phase 2).
- TRUNCATE CASCADE note: defensive addition (no FK currently points at clans, but pattern is correct).

**After Phase 3 executor halts and reports back, the orchestrator:**
1. Re-runs V1-V9 cold via psql + filesystem checks.
2. Audits the 5-clan spot-check vs live DB rows.
3. Verifies source_template distribution falls in expected range.
4. Audits F16 handling -- spot-check 2-3 empty-wikitext clan articles confirm is_substantive=false, source_template='none', no crash.
5. Captures any new findings (F23+) to review-findings.md.
6. Updates README.md + arc-history.md bullet for Phase 3.
7. Drafts Phase 4 executor prompt (reads phase-4-tournaments.md).
8. Surfaces sign-off + Phase 4 launch recommendation to operator.
