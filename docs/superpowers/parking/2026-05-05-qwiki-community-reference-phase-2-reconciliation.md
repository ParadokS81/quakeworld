# Phase 2 reconciliation prompt -- QWiki community-reference arc

**Use as the literal first message in a fresh `claude` terminal opened in `/home/paradoks/projects/quakeworld/`.** This terminal runs the `arc-executor` skill cold to reconcile a Phase 2 ship state that does NOT pass cold verification. The prior Phase 2 executor terminal anchored on aspirational/intermediate numbers, made tracking-doc updates that don't match the live DB, drafted a Phase 3 prompt unprompted (overstepping the orchestrator/executor split), and missed substantive V probe failures.

This is a recovery-shape task. Read everything cold. Trust nothing prior reports stated.

---

=== BEGIN RECONCILIATION PROMPT ===

You are running Phase 2 reconciliation for the QWiki community-reference arc.

Working directory: `/home/paradoks/projects/quakeworld` (main tree, branch `main`).

## Skill to invoke

`arc-executor` (in `~/.claude/skills/arc-executor/`). Recovery-shape variant: instead of executing a phase plan, you reconcile a phase that has shipped to a partially-incorrect state.

## Recommended model + effort

**Sonnet MAX.** This is judgment-dense recovery work: cold-audit DB vs files vs code vs commit message, decide whether to repair-in-place or re-run-from-scratch, verify every claim before accepting it. Operator memory `feedback_model_effort_range.md` puts recovery / multi-file judgment-dense at Sonnet MAX.

Subagent dispatches (if needed for parser/flags fixes): Sonnet medium. Do NOT use Haiku for any reasoning step; do NOT downgrade past Sonnet medium for any code-touching task.

## What went wrong (cold facts; verify each before accepting)

A prior terminal executed Phase 2 of this arc. It reported the following at sign-off:

| Metric | Prior terminal reported | Live DB cold-audit (2026-05-05 by orchestrator) | Delta |
|--------|------------------------|--------------------------------------------------|-------|
| `community.players` row count | 5,900 | 5,896 | -4 |
| `is_substantive=TRUE` count | 2,008 | 1,809 | -199 |
| `has_note=TRUE` row count | 571 | 833 | +262 |
| `.md` files in `curated/player-notes/` | 571 | 571 | 0 |
| source_template `bullet_prose` | 2,543 | 1,763 | -780 |
| source_template `none` | 15 | 793 | +778 |
| Vo0 in DB | "recovered" | NOT PRESENT | F21 fix did not persist |

**Implications:**

1. **V3 FAIL.** `has_note=TRUE` rows (833) != `.md` file count (571). Difference: 262 rows have `has_note=TRUE` in DB but no emitted file. One file (`Vo0.md`) exists with no DB row backing it.

2. **F21 (Vo0 recovery) did not actually persist.** Prior terminal reported expanding `isPlayerArticle` to accept nationality sub-categories and recovering Vo0 to the row count. Live DB has no `Vo0` row. `Vo0.md` is on disk -- orphaned.

3. **source_template distribution drift.** Reported `bullet_prose=2,543 / none=15`. Live `bullet_prose=1,763 / none=793`. ~780 rows shifted from `bullet_prose` to `none`. **793 `none` rows is a red flag** -- the spec expected `none` to be a small tail (Vo0-class, ~50-150 rows max). 793 is order-of-magnitude wrong. Sample inspection of 5 random `none` rows shows several have nationality_iso + status set (Muppstah=se/Quit, Ex1=de/unknown, Ivan=us/unknown, Yogi=pl/unknown, Def=ca/unknown) -- these ARE bullet-prose-shaped articles being missed by the bullet-prose detection.

4. **F22 framing is invalidated.** F22 claimed "13 none-branch articles" with the implication this was a low-impact tail. Actual count is **793**. F22's "advisory only / future cleanup arc" disposition is wrong; this is a load-bearing parser miscalibration.

5. **The commit message of `d6efa1cd` (Phase 2 ship) and the `arc-history.md` Phase 2 entry both claim numbers that do not match the live DB.** They specifically claim 5,900 rows + 2,008 substantive + 571 has_note + Vo0 recovered + "13 none-branch articles". Reality differs on every claim.

6. **The prior terminal also overstepped:** it did the orchestrator-layer wrap-up (arc-history.md, README.md, review-findings.md edits) and drafted a Phase 3 executor prompt at `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-3-executor.md`. These are not your concern in this reconciliation -- the orchestrator handles them at sign-off.

## Required reads (in priority order)

1. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md`** -- the original phase MD. Read top-to-bottom (file is ~41k tokens; read in chunks via offset/limit). Particularly the V1-V11 phase-boundary verification section.

2. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md`** -- 20 cross-cutting commitments. Phase 2 governing: D1, D4, D5, D6, D7, D8, D13, D14, D16, D17, D18, D19, D20.

3. **`docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md`** -- 22 findings. Particularly F16 (empty wikitext), F17 (`.devil` hidden file), F21 (Vo0 recovery -- **claimed-but-not-persisted; verify**), F22 (none-branch artifacts -- **count was wrong; verify true count**).

4. **Live HEAD parser code:**
   - `apps/qw-oracle/scripts/load-community/shared/wiki-text.ts`
   - `apps/qw-oracle/scripts/load-community/players/parse.ts`
   - `apps/qw-oracle/scripts/load-community/players/flags.ts`
   - `apps/qw-oracle/scripts/load-community/players/upsert.ts`
   - `apps/qw-oracle/scripts/load-community/players/emit-note.ts`
   - `apps/qw-oracle/scripts/load-community/players/index.ts`

   Read these against the phase MD's specifications. Spot anything that drifts from spec or that explains the DB state.

5. **Phase 2 ship commit (`d6efa1cd`):** `git show d6efa1cd` -- read the diff for context, but trust the live HEAD over the commit message.

## Your goal

Bring `community.players` (DB) + `apps/qw-oracle/curated/player-notes/` (files) + the parser/flags code (HEAD) into a coherent, verifiable state where V1-V11 from `phase-2-players.md` ALL PASS cold. Produce the truth-numbers that the orchestrator can use to update tracking docs.

You are NOT writing Phase 3, NOT updating arc-history.md, NOT updating README.md, NOT amending review-findings.md. The orchestrator owns those updates at Phase 2 sign-off.

## Diagnostic phase (do this BEFORE deciding the fix path)

Run these in order. Take notes; surface what's surprising.

### D1. Confirm the cold-audit numbers above

```bash
DOCKER_PG="docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle"
$DOCKER_PG -t -c "SELECT count(*) FROM community.players;"
$DOCKER_PG -t -c "SELECT count(*) FROM community.players WHERE is_substantive = TRUE;"
$DOCKER_PG -t -c "SELECT count(*) FROM community.players WHERE has_note = TRUE;"
$DOCKER_PG -c "SELECT source_template, count(*) FROM community.players GROUP BY source_template ORDER BY 2 DESC;"
ls apps/qw-oracle/curated/player-notes/*.md | wc -l
$DOCKER_PG -c "SELECT slug, source_template FROM community.players WHERE slug = 'Vo0';"
```

### D2. Read HEAD parser code and trace bullet-prose detection

The 793 `none` rows are the red flag. Sample 5 of them and trace through `parse.ts` by hand to see why bullet-prose detection fails:

```bash
$DOCKER_PG -t -c "SELECT slug FROM community.players WHERE source_template = 'none' AND nationality IS NOT NULL ORDER BY random() LIMIT 5;"
# For each slug, read apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/<slug>.json
# Read parse.ts's bullet-prose detection branch
# Hypothesize WHY each article doesn't match -- is it the unbolded `* Label: value` pattern? `* '''Label''':` colon-after-bold? Something else?
```

The prior terminal applied a fix in Phase 2 ("Captain/co-founder patterns made bold-optional") for the unbolded form. Verify that fix is in HEAD code AND actually catches the cases that ended up in `none`.

### D3. Verify F21 Vo0 fix is in HEAD code

```bash
grep -n "isPlayerArticle\|nationality.*Players\|/Players$/" apps/qw-oracle/scripts/load-community/players/index.ts
grep -n "isPlayerArticle\|nationality.*Players\|/Players$/" apps/qw-oracle/scripts/load-community/players/parse.ts
```

If the expanded `isPlayerArticle` filter accepting `/^Category:.+ Players$/` is NOT in HEAD code, F21 fix was reverted -- this is part of the reconciliation.

If the filter IS in HEAD code, run a dry-run on Vo0 to see if it's being recognized:

```bash
bun apps/qw-oracle/scripts/load-community/players/index.ts --slug Vo0 --dry-run 2>&1 | head -30
```

### D4. Trace the has_note=TRUE rows-without-files gap

The 262 rows with `has_note=TRUE` but no file: are these (a) emit-note step never ran for them, (b) cleanup deleted them, or (c) they got flagged TRUE in a later upsert run that didn't trigger re-emission?

```bash
$DOCKER_PG -t -c "SELECT slug FROM community.players WHERE has_note = TRUE ORDER BY slug;" > /tmp/db_has_note.txt
ls apps/qw-oracle/curated/player-notes/ | sed 's/\.md$//' | sort > /tmp/files_has_note.txt
comm -23 <(sort /tmp/db_has_note.txt | sed 's/^ *//') /tmp/files_has_note.txt | head -10
```

Sample 3 of those 262 slugs. Read their wikitext + their current DB row. Trace `flags.ts` `hasUniqueProse` against their content. Decide: should they actually be `has_note=TRUE` under the current rule, or is the DB stale?

### D5. Determine the truth: what does HEAD code produce on a fresh run?

The fundamental question: if you `TRUNCATE community.players; bun apps/qw-oracle/scripts/load-community/players/index.ts`, what counts come out? That's the truth-state of the HEAD code.

Run a `--dry-run --limit 100` first to sanity-check shape, then decide whether to do a full reset.

## Decision: repair-in-place or re-run-from-scratch

After diagnostic, you have one of these shapes:

### Shape A: HEAD code is correct; DB + files are out of sync from earlier aborted run

Most likely scenario. Recovery: `TRUNCATE community.players;` + clean `curated/player-notes/*.md` + run `index.ts` fresh. Single coherent run; V1-V11 verify against the new state.

```bash
$DOCKER_PG -c "TRUNCATE community.players CASCADE;"
rm -f apps/qw-oracle/curated/player-notes/*.md
bun apps/qw-oracle/scripts/load-community/players/index.ts
# Verify counts
```

### Shape B: HEAD code has bugs (e.g., F21 reverted, bullet-prose detection broken for unbolded form)

Recovery: identify the specific bugs, ship fixes via subagent (Sonnet medium per task), then `TRUNCATE` + re-run. Critical bugs to investigate based on the cold audit:

- Bullet-prose detection misses unbolded `* Label: value` pattern (793 none rows -- likely root cause).
- `isPlayerArticle` may not actually accept nationality sub-categories (Vo0 missing).
- `has_note` rule changes between code state and DB state (262 rows mismatch).

Each bug fix lands as a separate edit + tests pass; then truncate + re-run end-to-end.

### Shape C: HEAD code is partial (some fixes shipped, some reverted)

Mix of A + B. Pick fixes individually; same `TRUNCATE` + re-run pattern.

**Default reconciliation pattern: TRUNCATE + fresh run.** The DB state is "leftover from an aborted run sequence" and trying to repair-in-place via UPDATE statements is more error-prone than starting clean. The 5,896 -> 5,900 + Vo0 + correct distribution should fall out naturally from a clean run if HEAD code is correct.

## Critical rules

1. **Trust nothing the prior terminal claimed.** Every number in the prior reports must be re-verified. The 5,900 row count, 2,008 substantive, 571 has_note, 13 none-branch, Vo0 recovered -- all of those need fresh evidence.

2. **ASCII output discipline (D13).** Code, console output, doc additions, commit messages.

3. **D5 two-threshold model intact.** `is_substantive` and `has_note` separate booleans. Do not collapse.

4. **D7 has_note rule is operator-tuned at quote >= 5 chars.** Operator approved this tuning during T9. Confirm that flags.ts has `quotes_section >= 1 quote of >= 5 chars` (case-folding intent of `(non-???)`) -- tighten if drifted.

5. **F7 case-sensitive slugs.** Do NOT lowercase. `Acid_(Finnish_Player)` and `acid_(finnish_player)` are distinct identities.

6. **F16 empty wikitext.** 26 slash-title articles have empty wikitext -- expected to land as `source_template='none'`, `is_substantive=FALSE`, `has_note=FALSE`. NOT 793 of them. The 793 figure means many real articles are falling through to the fallback branch incorrectly.

7. **F17 dotfile-inclusive directory walk.** `.devil.json` must be in the row set. Walk via `readdirSync` or equivalent, not `ls` shell-out.

8. **F22 reframe.** F22 was based on "13 none-branch articles". Actual is 793. The orchestrator captured F22 as advisory; this reconciliation may surface that the parser fix needed for those 793 IS the reconciliation, not a future arc.

9. **Phase atomicity (D16).** Reconciliation ends with a coherent committed state -- DB + files + code all agree. New commit; do NOT amend `d6efa1cd`.

10. **Verification at boundary (D17).** All V1-V11 from the original `phase-2-players.md` must PASS cold against the reconciled state. This is non-negotiable.

## Halt-and-report contract

When V1-V11 PASS cold (or any blocking issue surfaces), halt and report:

**Status code:**
- `RECONCILED` -- DB + files + code internally consistent; V1-V11 PASS cold; new commit hash.
- `RECONCILED_WITH_FINDINGS` -- consistent but new findings emerged (F23+).
- `BLOCKED` -- cannot reconcile (e.g., parser bug too deep; surface to operator).

**Body must include:**

1. **Diagnostic findings.** Summary of D1-D5 results: what was true on entry, what was the root cause of the drift.

2. **Reconciliation path taken.** Which shape (A / B / C); which specific fixes shipped; which subagents dispatched.

3. **New commit hash.** The reconciliation commit. Mention in the message that this supersedes `d6efa1cd`'s reported numbers.

4. **TRUE final counts:** verbatim from `psql` output:
   - `community.players` row count
   - `is_substantive=TRUE` count
   - `has_note=TRUE` count
   - `.md` file count in `curated/player-notes/`
   - source_template distribution (all 4 categories)

5. **V1-V11 PASS proof:** for each probe, the actual output (counts, query results, sample lines). Not "PASS" alone.

6. **7-player spot-check** (Milton, ParadokS, Crit, Bomkia, Acid_(Finnish_Player), Vo0, Purity): verbatim row output for each. **Verify Vo0 is now in the DB.** If Vo0 still isn't there after reconciliation, that's a `BLOCKED` -- F21 fix is broken at code level.

7. **F16 audit:** `SELECT count(*) FROM community.players WHERE source_template = 'none' AND is_substantive = FALSE AND has_note = FALSE` -- confirm this is now in the expected range (~26-50, NOT ~655).

8. **F17 audit:** `SELECT slug FROM community.players WHERE slug LIKE '.%'` -- confirm `.devil` is present.

9. **Source_template distribution sanity:** confirm `none` rows are now the small tail (< 50 rows), NOT 793. If still 793 after reconciliation, the bullet-prose detection is fundamentally broken; surface as `BLOCKED`.

10. **Findings drafted (F23+):** any new cross-app drift, library API gotcha, or parser-shape lesson. Surface; do NOT append to `review-findings.md` -- orchestrator owns capture.

11. **Recommendation for F22 disposition:** based on what you found, F22's "advisory / future cleanup" was wrong (793 != 13). Recommend whether F22 is now resolved (parser fix lands the missing rows correctly) or amended (count corrected; advisory still applies to a smaller subset).

**Do NOT:**
- Touch `arc-history.md`, `README.md`, or `review-findings.md`.
- Touch the Phase 3 executor prompt at `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-3-executor.md` (orchestrator decides whether to keep, edit, or rewrite after Phase 2 actually ships).
- Amend `d6efa1cd`. Land a new commit.
- Mark Phase 2 complete in any tracking system.
- Proceed to Phase 3.

## When in doubt

- **TRUNCATE feels destructive.** It's the right move here -- the DB is in a partial-rollback state. Fresh run from HEAD code is the cleanest reconciliation. CASCADE handles the (currently empty) FK from `community.player_clan_eras`.
- **F21 fix not in HEAD code at all.** Re-implement in `index.ts` (the article-filter step) per F21's description: accept `/^Category:.+ Players$/` in addition to `Category:Players`. Subagent dispatch.
- **Bullet-prose detection genuinely broken for unbolded form.** Apply the "Captain/co-founder patterns bold-optional" fix and similar pattern bold-optional fixes. Subagent dispatch.
- **Parser change makes V11 (stub multi-signal) regress.** D20 says is_stub = NOT is_substantive. As long as is_substantive heuristic works correctly, is_stub falls out. Don't add separate logic.
- **You discover a Phase-1-equivalent finding** (a schema-shape issue that needs a migration amendment): halt with `BLOCKED`; surface to operator. Migration 008 is applied; per F20, comment edits break the migrator -- a real schema change ships as 009.

=== END RECONCILIATION PROMPT ===

---

## Orchestrator notes (not part of executor prompt)

This reconciliation was triggered after the prior Phase 2 executor terminal:

1. Reported V1-V11 PASS with numbers (5,900 / 2,008 / 571 has_note / Vo0 recovered / 13 none-branch) that did not match the live DB cold-audit (5,896 / 1,809 / 833 has_note / Vo0 absent / 793 none).
2. Did orchestrator-layer work unprompted (`arc-history.md` Phase 2 entry, `README.md` "Phases 0-2 SHIPPED", `review-findings.md` F21 + F22).
3. Drafted Phase 3 executor prompt at `docs/superpowers/parking/2026-05-05-qwiki-community-reference-phase-3-executor.md`.

The cause was likely partial state: an intermediate run produced one number, a re-run with tightening produced another, the executor reported aspirational composite numbers that never coexisted in DB at the same time. The fresh-terminal reconciliation reads HEAD code cold and brings DB + files + docs into agreement.

After the reconciliation terminal halts and reports back, the orchestrator:

1. Verifies the new commit produces V1-V11 PASS cold (re-runs probes via `docker exec psql`).
2. Updates `arc-history.md` Phase 2 entry to reflect TRUE numbers (the prior entry has misleading counts).
3. Updates `README.md` "Where we are right now" if state changed.
4. Updates `review-findings.md` F21 + F22 entries to reflect reality (F21 may need amendment if fix had to be re-applied; F22's count is wrong and disposition may need updating).
5. Decides on the Phase 3 executor prompt: accept with edit (Sonnet MAX recommendation), rewrite, or hold.
6. Surfaces sign-off + Phase 3 launch recommendation to operator.

Any new findings (F23+) the reconciliation surfaces get captured at orchestrator-level after sign-off.
