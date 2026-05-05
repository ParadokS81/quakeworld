# Phase 1 executor prompt -- QWiki community-reference arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold against Phase 1.

Phase 0 shipped 2026-05-05 (commits af888e45, 296efc67, 408938c1). Snapshot is uniform-slugged, redirects populated (2,337 entries), manifest re-locked, snapshot committed. F14-F17 captured to `review-findings.md`. Phase 1 builds on the curated/ rename + community schema baseline.

---

=== BEGIN EXECUTOR PROMPT ===

You are executing Phase 1 of the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). The executor reads the phase MD cold, critically reviews the plan against decisions + review-findings BEFORE executing, executes each task per its declared execution mode (inline vs subagent), runs phase-boundary verification, and halts with a structured status report.

## Recommended model + effort for the executor terminal

**Sonnet MAX** for this Phase 1 terminal.

Rationale: Phase 1 is well-bounded but synthesis-dense -- T2 is a 15+-file path-rename sweep, T3 ships migration 008 (5 community tables with type/CHECK/index design), T4 extends `SCHEMA.md` with a new schema section. The critical-review pass against decisions (D2/D5/D9/D10/D15) + amended findings (F8/F9/F10) needs reasoning headroom; the subagent-output audit at task boundaries needs the same. Operator memory `feedback_model_effort_range.md` puts judgment-dense + multi-file work at Sonnet MAX or Opus medium; Sonnet MAX is the speed default.

Subagent dispatches within Phase 1 (T2 path sweep, T3 migration SQL, T4 SCHEMA.md update) are annotated `subagent (Sonnet medium)` in the phase MD itself. Keep them at Sonnet medium; do not bump.

## Required reads (in priority order, before executing any task)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-1-curated-rename.md`** -- the phase MD. Read top-to-bottom. Six tasks (T1-T6), eight phase-boundary verifications (V1-V8). Migration 008 SQL is shipped fully inline in T3.

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 1 is governed by D2 (community schema separate from L1), D3 (curated/ folder reframe), D5 (two-threshold model -- `is_substantive` AND `has_note` as separate booleans), D9 (tournament schema placeholder-only; full columns in Phase 4), D10 (source column on cross-link tables), D13 (ASCII), D14 (Bun for loader-pipeline), D15 (append-only migrations; this is migration 008), D16 (phase atomicity), D17 (verification at boundary), D19 (JSONB receives JS values, not pre-stringified).

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 17 findings. Three are LOAD-BEARING for Phase 1's migration 008:
   - **F8** -- `tournament_results.tournament_slug` is deliberately a soft reference (no FK to `community.tournaments(slug)`). Phase 5 backfill loads cross-link rows from achievements BEFORE Phase 4 populates `community.tournaments`; a hard FK would cause insertion failures. Migration 008 must NOT add `REFERENCES community.tournaments(slug)`.
   - **F9** -- `player_clan_eras` PK redesigned: surrogate `id BIGSERIAL PRIMARY KEY`, nullable `start_year`, new `era_seq INT` for list-order preservation, `UNIQUE (player_slug, clan_title, start_year, source)` for idempotency. The original composite PK `(player_slug, clan_title, start_year)` would have failed insertion of bullet-list clan-history rows (year-absent).
   - **F10** -- `community.clans.source_template` CHECK enum widened to include `'infobox_4on4team'` (44 articles / 5.4% of clans use this fourth template variant the spec didn't mention).
   
   The phase MD's inline migration 008 SQL is ALREADY amended for F8/F9/F10. Do NOT re-litigate these during execution. Do NOT propose a "tighter" PK for player_clan_eras or a hard FK for tournament_slug -- those would re-introduce the bugs F8/F9 caught and resolved before execution.

4. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md`** -- phase index, "Where we are right now" lines (currently shows Phase 0 SHIPPED).

## Phase-0 outputs you can rely on

Phase 0 shipped clean. Inputs to Phase 1:

- Snapshot trustworthy at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` -- 9,178 article files, 2,337 redirects, manifest re-locked. Phase 1 does NOT consume snapshot files (that's Phase 2 onward); but if your verification probes inspect the snapshot, the post-Phase-0 state is what's there.
- Migration sequence: last applied is `007_query_log.sql`. Phase 1 ships `008_community_schema.sql`.

## Operator-confirmed decisions baked into the phase MD (do NOT re-litigate)

- **D2 + D3 fully locked.** New `community` schema; tables there. `concept-notes/` -> `curated/concept-notes/` rename + 3 sibling empty dirs (`player-notes/`, `clan-notes/`, `tournament-notes/`). No detour into "what about a different folder name?"
- **D5 two-threshold model.** Migration 008 carries BOTH `is_substantive` and `has_note` as separate booleans on every row table. They are orthogonal -- do not collapse them.
- **D9 tournament placeholder.** `community.tournaments` ships with placeholder columns ONLY (slug, title, has_note, is_substantive, is_stub, source_template, source_categories, wiki_revision_id, wiki_fetched_at). Tournament-specific columns (year, mode, format, prize_pool, etc.) land in migration 009 (Phase 4) post-pilot. Do NOT pre-commit those columns in migration 008.
- **F8 soft tournament_slug reference.** No FK clause on `community.tournament_results.tournament_slug`. Cross-link integrity enforced by post-load join queries, not FK constraints.
- **F9 surrogate PK + nullable start_year + era_seq.** The amended `player_clan_eras` shape is in the migration 008 SQL inline in the phase MD. Do not "improve" it.
- **F10 widened CHECK.** `source_template` CHECK on `community.clans` includes `'infobox_4on4team'`. Do not narrow.

## Critical rules for this phase

1. **ASCII-only output discipline (D13).** No emoji, no em-dashes, no en-dashes -- ASCII hyphen-minus only. Applies to script output, doc additions, commit messages, SQL comments.

2. **Phase atomicity (D16).** Phase 1 has two coupled deliverables (rename + migration 008). They MUST land together in a coherent state -- the system is runnable when Phase 1 boundary is reached: `bunx tsc --noEmit` clean, `load-concepts` walks the new path successfully, all five `community.*` tables exist and are empty.

3. **Append-only migrations (D15).** Migration 008 is the next migration. Once `bun apps/qw-oracle/db/migrate.ts` applies it, do NOT edit `008_community_schema.sql`. If you discover the migration needs amendment AFTER apply, ship a new `009_*.sql`. (This is hypothetical -- the SQL is fully inline in the phase MD; subagent verifies before run.)

4. **Critical-review BEFORE executing.** Read the phase MD top-to-bottom and cross-check against decisions.md + review-findings.md. Particularly: the migration 008 SQL inline in T3. Confirm F8/F9/F10 are reflected (no FK on tournament_slug; surrogate id PK on player_clan_eras with nullable start_year + era_seq + UNIQUE composite; `infobox_4on4team` in clans CHECK enum). If you spot drift, halt and surface to operator BEFORE executing.

5. **Subagent dispatch per execution-mode annotations.** T2 (path-reference sweep), T3 (migration 008 SQL), T4 (SCHEMA.md update) are subagent (Sonnet medium). T1 (git mv + mkdir), T5 (run migration + verify tables), T6 (tsc + load-concepts smoke) are inline. Don't deviate.

6. **Backward-compat regex in `parse.ts` is intentional.** T2 updates `CONCEPT_LINK_RE` to accept BOTH `curated/concept-notes/<slug>.md` AND legacy `concept-notes/<slug>.md` forms (silent acceptance of old form, no deprecation warning). Phase MD Q1 documents this default. Do not add a deprecation warning unless operator asks.

7. **Skill files outside the monorepo are out of scope.** Phase MD Q2 flags `~/.claude/skills/guide-rewrite/SKILL.md` and siblings as referencing the old path; they are NOT updated in this phase. Do not chase scope creep into user-global skill files.

## Execution-mode annotations (from phase MD)

| Task | Mode | What |
|------|------|------|
| T1 | inline | `git mv concept-notes -> curated/concept-notes` + 3 sibling dirs with `.gitkeep` |
| T2 | subagent (Sonnet medium) | Path-reference sweep across 15+ files (load-concepts/index.ts CONCEPTS_DIR, parse.ts regex, parse.test.ts, multiple CLAUDE.md / OVERVIEW.md / VISION.md / README.md, migration 005 comment, OVERVIEW.md root diagram) |
| T3 | subagent (Sonnet medium) | Write `db/migrations/008_community_schema.sql` (full SQL shipped inline in phase MD; subagent verifies + writes) |
| T4 | subagent (Sonnet medium) | Append "Community schema" section to `SCHEMA.md` with five table entries matching existing per-table style |
| T5 | inline | `bun apps/qw-oracle/db/migrate.ts`; verify five `community.*` tables exist + empty |
| T6 | inline | `bunx tsc --noEmit` clean; run `bun apps/qw-oracle/scripts/load-concepts/index.ts` -- expect "loaded N, skipped 3" with N >= 9 |

## Pre-flight (operator-side -- verify before executing)

- `DATABASE_URL` is set in your shell (or sourceable from `apps/qw-oracle/.env`). Test: `psql $DATABASE_URL -c "SELECT 1"` returns OK.
- Postgres dev container is running. Test: `docker ps | grep qw-oracle-postgres` returns a running container.
- `apps/qw-oracle/concept-notes/` exists at the pre-rename location (it should -- Phase 0 didn't touch it).

If any pre-flight fails, halt with `NEEDS_CONTEXT` status before executing T1.

## First three actions

1. **Read all four scaffold docs** (phase-1 MD, decisions, review-findings, README) top-to-bottom. Note F8/F9/F10 carefully -- the migration 008 SQL must reflect all three amendments.

2. **Critical review pass.** Walk T1-T6. For each: does it align with the relevant decisions + findings? For T3 specifically: verify the inlined migration SQL has (a) NO `REFERENCES community.tournaments(slug)` clause on `tournament_results.tournament_slug`; (b) `id BIGSERIAL PRIMARY KEY` + nullable `start_year` + `era_seq INT` + `UNIQUE (player_slug, clan_title, start_year, source)` on `player_clan_eras`; (c) `'infobox_4on4team'` in the `community.clans.source_template` CHECK enum. If any of those three are missing, halt and surface BEFORE executing.

3. **Execute T1** (inline git mv + mkdir + .gitkeep files). Verify per T1 verification probes. Then dispatch T2 subagent. Then T3. Then T4. Then run T5 inline (apply migration). Then T6 inline (tsc + load-concepts smoke). Run V1-V8 at phase boundary.

## Halt-and-report contract

When V1-V8 are run (whether PASS or FAIL), halt and report back to the operator with:

**Status code (pick one):**
- `DONE` -- all tasks shipped, V1-V8 all PASS.
- `DONE_WITH_CONCERNS` -- shipped but flagged doubts. List them in the body.
- `NEEDS_CONTEXT` -- blocked by missing information. Specify exactly what is needed.
- `BLOCKED` -- cannot complete. Specify the blocker; route to operator.

**Body must include:**
- The commit hash(es) for Phase 1's deliverables. Phase MD does not prescribe a commit-count; one coherent commit at phase boundary is the default per D16. If you split (e.g., rename commit + migration commit), document why.
- The actual outputs of V1-V8 (counts, query results, sample lines) -- not "PASS" alone. The orchestrator will re-run probes independently.
- Confirmation of the F8/F9/F10 amendments in the applied migration 008 -- run `\d community.player_clan_eras` and `\d community.clans` and `\d community.tournament_results` (or `psql -c` equivalents) and paste the schema output.
- Any new findings (cross-app contract drift, library API gotcha, schema-shape surprise) to append to `review-findings.md` with sequential F-numbers (F18+). Surface; do NOT append to review-findings.md yourself -- the orchestrator owns cross-phase memory captures.
- Any decisions.md amendments needed. Surface; do NOT amend yourself.
- The load-concepts CLI output verbatim (loaded N, skipped 3, warnings ?).

**Do NOT:**
- Proceed to Phase 2.
- Mark Phase 1 complete in any tracking system.
- Append to `review-findings.md`, `decisions.md`, `arc-history.md`, or `README.md`.
- Update user-global skill files (`~/.claude/skills/...`).

The orchestrator session does the phase-boundary verification (re-runs V1-V8 cold), captures cross-phase memory, updates the README status column + arc-history bullet, and signs off Phase 1 before opening Phase 2's executor terminal.

## When in doubt

- **Migration 008 SQL inline in the MD looks different from what F8/F9/F10 say** -> halt; surface; do not silently amend either way. The MD is intended to already reflect F8/F9/F10; if it doesn't, that's a planning bug.
- **`git mv` produces unexpected status output** (e.g., shows files as deleted+added rather than renamed) -> verify with `git log --follow --oneline -- apps/qw-oracle/curated/concept-notes/<file>` after committing; if history is preserved, accept; if not, surface.
- **`bunx tsc --noEmit` errors after T2 sweep** -> the `CONCEPTS_DIR` path update in `scripts/load-concepts/index.ts` likely needs an extra `..` segment (relative to `__dirname`). Check the phase MD T2 step for `index.ts` -- the path should resolve to `apps/qw-oracle/curated/concept-notes/`.
- **`load-concepts` CLI ENOENT** -> same root cause as above; the path resolution from `__dirname` is the most common bug shape.
- **A path-reference grep finds remaining `concept-notes/` strings** that the MD didn't anticipate -> if they are inside `curated/concept-notes/` body content (a note linking to a sibling note via the legacy form), the backward-compat regex covers them; if they are in code or external doc paths, surface for operator decision.
- **Verification probe is ambiguous** -> read the phase MD's Recovery section; if unclear after that, surface with `NEEDS_CONTEXT`.

=== END EXECUTOR PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This prompt was drafted on 2026-05-05 by the orchestrator session for QWiki Phase 1 execution, after Phase 0 sign-off. After the executor terminal halts and reports back, the orchestrator:

1. Re-runs V1-V8 cold (read-only -- ls, grep, `psql -c`, `bunx tsc --noEmit`, `bun load-concepts/index.ts`).
2. Audits the executor's report against re-run output, particularly the `\d` schema outputs vs F8/F9/F10 expectations.
3. If clean: appends a Phase 1 sub-bullet to the in-execution arc-history entry, updates `README.md` "Where we are right now" + phase index status (Phase 1 -> shipped), captures any surfaced findings to `review-findings.md` (F18+), captures any decisions.md amendments as dated blocks.
4. Drafts the Phase 2 executor prompt (re-reads `phase-2-players.md` cold via offset/limit since it exceeds the 25k-token Read limit).
5. Surfaces sign-off + Phase 2 launch recommendation to operator.

If the executor returns BLOCKED or DONE_WITH_CONCERNS: orchestrator triages, resolves what's resolvable, surfaces unresolvable items to operator with plain-English consequences.
