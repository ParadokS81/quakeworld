# Post-review investigation + prod-prep -- KTX Layer 1 Onboarding

**Use as the literal first message in a fresh `claude` terminal.** The KTX onboarding arc shipped 2026-05-07; the arc-reviewer pass committed the spec-vs-shipped walkthrough at `33f67bb2`. This terminal picks up where the reviewer paused: the review surfaced + the operator's tonight session surfaced a set of items that need investigation and resolution before the dev-DB state ships to prod. Operator's directive: **do not skip anything unless it has a higher purpose; we are thorough, not rushed.**

---

## Where things stand

- **Arc shipped:** all 9 phases (0/1/2/3/4/5/5.5/6/7/8) committed and pushed to main. Last arc commit `83288501` (Phase 8). Arc-reviewer commit `33f67bb2` (review document).
- **Review verdict:** arc shipped clean at declared scope; no MISSING items in the cold spec walk. 6 YELLOW items at sign-off (1 added during the post-review session vs the original 5). Review at `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md`.
- **Live dev DB state:** 1827 KTX entity rows + 446 qw-namespace gameplay rows + 7 match_event_versions rows. All F1 quality-grid probes PASS at exact equality.
- **Prod state:** still pre-KTX. `oracle.slipgate.me/mcp` on Unraid has none of this yet. Prod deploy is the dump-restore per `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`; gated on completing the investigation work below.

### Live working-tree state (CRITICAL -- read before running git commands)

Per the operator's session-start `git status`, **the working tree is operator-fenced**: 23 uncommitted files were untouched throughout the 9-phase arc per the orchestrator's working-tree-fence discipline. Most are operator's parallel MCP-API WIP. **Do NOT touch them without asking.**

The fenced files at last check:
- `apps/qw-oracle/CLAUDE.md`, `apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts`, `apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts`, `apps/qw-oracle/serve/mcp/src/index.ts`, `apps/qw-oracle/serve/mcp/src/orientation.ts`, `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts`, `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts`, `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts`, `apps/qw-oracle/serve/mcp/src/tools/maps.test.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-concepts.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-entities.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts`, `apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts`, `apps/qw-oracle/serve/mcp/src/types.ts` (all `M`)
- `docs/superpowers/plans/2026-05-04-qwiki-community-reference/{README,decisions,phase-6-mcp-tools}.md` (all `M` -- qwiki arc work)
- Untracked: `apps/qw-oracle/API_CONTRACTS.md` (the operator's finished MCP-API contract doc; surfaced this session and is ALREADY drained of its drift in their cleanup pass per its own "Drift items closed in the 2026-05-06 cleanup pass" line; treat as authoritative reference)
- Untracked: `docs/superpowers/parking/2026-05-06-qwiki-phase-4-{brand-discovery-resume,investigative-resume}.md` and `2026-05-06-qwiki-phase-4-canonical/` (qwiki Phase 4 sidequest territory)
- Untracked (this terminal's predecessor added): `docs/superpowers/parking/2026-05-07-ktx-postreview-investigation-and-prod-prep.md` (THIS document)

**Plus one edit the previous terminal made on top of operator's WIP, awaiting operator decision:**
- `apps/qw-oracle/serve/mcp/src/orientation.ts` -- previous terminal added a KTX-aware paragraph on top of operator's existing reorder. See "Pending decisions" section below; operator has not approved or reverted yet.

If you find more uncommitted state than listed here, git-stash + investigate. Don't blunder forward.

---

## Required reads (in order, COLD)

1. **The arc-review document:** `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md`. Spec-vs-shipped walk; 6 YELLOWs; 6 Arc N+1 prep recommendations. The "shipped beyond spec" section explains Phase 5.5's mid-arc Pattern 13 retrofit.

2. **The post-arc handoff (which dispatched the reviewer):** `docs/superpowers/parking/2026-05-07-ktx-onboarding-postarc-handoff.md`. Cross-phase memory captures: 3 D-amendments + 7 new findings discovered during execution (F23-F29) + the F-amendment chain.

3. **The operator's authoritative API contracts doc:** `apps/qw-oracle/API_CONTRACTS.md` (untracked but operator-finished and treated as canonical). Three contracts (Discovery / Query / Storage); the new-dataset checklist at "When adding a dataset to qw-oracle" is load-bearing for evaluating whether the arc landed correctly per these contracts. The post-review investigation against this doc is what surfaced the orientation-blob YELLOW.

4. **Sibling spec for prod deploy:** `docs/superpowers/specs/2026-05-04-oracle-prod-update-lifecycle.md`. The dump-restore mechanics + 3-tier rollback. Read sections 2.1, 2.4, 2.5 before any prod-side action.

5. **The arc decisions:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md` (D1-D20, D3/D4/D5 amendments). The D-rules are still load-bearing for any code change you make in the post-review work -- D14 (JSONB direct-bind), D15 (idempotent loaders), D16 (single-commit per coherent unit), D19 (ASCII output), D20 (main tree, no PR ceremony) all apply.

6. **The arc findings:** `docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md` (F1-F29 + amendments). F-amendments are part of the durable record.

7. **Operator memory pointers** (read on-demand if a question hinges on operator preference): `feedback_no_subagents_for_mechanical_edits.md`, `feedback_be_decisive.md`, `feedback_planning_first.md`, `feedback_idempotency_before_staleness.md`, `feedback_audit_predictions_not_contracts.md`, `feedback_repair_by_reextract_not_sql_update.md`, `feedback_minimize_branch_ceremony.md`, `feedback_worktree_per_terminal.md`, `feedback_plain_english_at_decision_points.md`, `feedback_output_discipline_sentiment.md`.

8. **Top of qw-oracle arc-history:** `apps/qw-oracle/docs/arc-history.md` (KTX section starts at line 9). Per-phase shipped-state record.

---

## Critical rules for this session

1. **Working-tree fence respected.** The previous-session orchestrator + executors held it through 9 phases; you hold it through this investigation. Do not modify any operator-fenced file (see list above) without explicit operator OK. The one prior-session exception (orientation.ts) is documented as a pending decision below; do not stack additional unauthorized edits onto fenced files.
2. **Don't skip anything unless it has a higher purpose.** Operator's directive verbatim. If you find yourself wanting to defer or skip an investigation, surface to operator with the reason BEFORE deferring; do not silently skip.
3. **Investigate before fixing.** Per `feedback_audit_predictions_not_contracts.md` -- don't assume a prior fix mechanically applies. The cvar embedding gap (Issue #3 below) needs root-cause investigation, not a guess-fix.
4. **Repair via re-extract, not SQL UPDATE.** Per `feedback_repair_by_reextract_not_sql_update.md` -- if the cvar handler is broken, fix the handler and re-run extract-tag, do NOT patch dev DB rows directly with UPDATE statements.
5. **D-rule compliance still applies.** D14 (JSONB direct-bind, never pre-stringify), D15 (idempotent loaders + regression guard), D16 (commit a coherent unit per fix; small fixes can be one commit, multi-handler refactors should be one commit per logically distinct change), D19 (ASCII only, no em-dashes), D20 (main tree, no PR; commit + push at natural checkpoints).
6. **Plain-English at decision points.** Per `feedback_plain_english_at_decision_points.md` -- when surfacing a sub-decision to operator, lead with plain English. SQL DDL / JSON schemas / column lists go to the body or a draft file, not into the conversation.
7. **One question at a time during scoping** per `feedback_one_question_at_a_time.md` if you need clarification.
8. **Verify before claiming complete** per `feedback_no_inference.md` + `feedback_verify_typescript.md` (run `bunx tsc --noEmit` if you touch TS; run pytest if you touch Python handlers).

---

## Investigation tasks in priority order

### Issue #1 (BLOCKING for prod) -- KTX cvar embedding gap

**The state:**

```
SELECT type, COUNT(*) AS total,
       COUNT(description) AS have_description,
       COUNT(description_embedding) AS have_embedding
FROM entities WHERE project='ktx' GROUP BY type;

     type     | total | have_description | have_embedding
--------------+-------+------------------+----------------
 command      |   358 |              311 |            311
 cvar         |   260 |                0 |              0     <-- ZERO COVERAGE
 info_key     |     7 |                7 |              7
 log_template |  1195 |             1195 |           1195
 match_event  |     7 |                0 |              0     <-- ZERO COVERAGE (separate issue)
```

**What the spec promised** (Pass 1.2 + 1.3):
- *"Trailing-comment harvest via the existing convention used across all four shipped extractors."*
- *"Trailing-comment harvest origin: same logical line as the call site's `;` terminator."*

**What the live data shows:**

```
SELECT COUNT(*) AS total,
       COUNT(NULLIF(trailing_comment,'')) AS with_trailing_comment,
       COUNT(help_desc) AS have_help_desc
FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id
WHERE e.project='ktx';

 total | with_trailing_comment | have_help_desc
-------+-----------------------+----------------
   260 |                     0 |              0
```

All three description-source columns (`help_desc`, `help_remarks`, `help_values`) are empty for KTX cvars (correctly -- KTX has no help-JSON). And `trailing_comment` is also zero -- which means the trailing-comment harvest the spec promised did not land in the column the deriver reads.

**`deriveCvar` reads from:** `cvar_versions.{help_desc, help_remarks, help_values}`. It does NOT consult `trailing_comment`. So even if trailing comments WERE in the column, `deriveCvar` would not use them. Two layers of gap.

**Investigation directives:**

1. Open `apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py`. Determine whether the handler captures trailing comments at extraction time. If yes, trace where they land in the JSON output. If no, this is the first gap to close.
2. Open `apps/qw-oracle/scripts/load-knowledge/load-cvars.ts` (or wherever the cvar loader lives -- check `extract-tag.ts` wiring). Determine whether trailing comments arrive from the JSON and where they land in `cvar_versions`. If they're discarded, this is a second gap.
3. Compare against the equivalent surface for an engine that DOES populate trailing comments. Run `SELECT project, COUNT(NULLIF(trailing_comment,'')) FROM cvar_versions cv JOIN entities e ON e.id=cv.entity_id GROUP BY project;` to see if any other engine has a non-zero trailing_comment column. If ezQuake/MVDSV also have zero trailing_comment but DO have help_desc populated, the spec's "existing convention used across all four shipped extractors" claim itself may be false -- in which case the gap is wider than KTX (the spec promised a convention that doesn't exist).
4. Once you understand the failure shape, propose a fix:
   - **Handler fix only** if the data is captured but not landing.
   - **Handler + loader fix** if the data is captured but discarded.
   - **Handler + loader + deriver extension** if the trailing_comment column needs to feed `deriveCvar` as a fallback when help_desc is empty.
   - **Different mechanism entirely** if trailing-comment harvest turns out architecturally wrong and the spec was over-promised. (E.g., maybe the right fix is "for KTX cvars, derive description from `default_value` + something else heuristic.")
5. After the investigation -- do NOT implement immediately. Report back to operator with: (a) what's actually broken and where, (b) the proposed fix shape with effort estimate, (c) what re-running extract-tag + derive + embed will look like (counts, Voyage cost projection, dev-DB-only confirmation). Operator approves before implementation.

**Constraint:** the live KTX source has trailing comments in MANY places. Sample by hand from `research/repos/ktx/src/` if you need a sanity check that the source-side data exists. E.g. `grep -nE "RegisterCvar.*//\s*\w" research/repos/ktx/src/*.c | head -20` should surface real examples.

### Issue #2 (BLOCKING for prod) -- match_event embedding gap

**The state:** 7 match_event entity rows in dev DB. All have `description=NULL`, `description_embedding=NULL`. No `deriveMatchEvent` function exists in `derive-entity-description.ts:DERIVE_BY_TYPE`.

**The architectural question:** match_event is parallel to `ruleset` and `keyname` in the existing dispatcher -- those types also have no deriver and rely on name-fallback. With only 7 match_event rows and self-explanatory names (death, damage, pick_mapitem, pick_backpack, drop_backpack, pick_powerup, drop_powerup), name-fallback may be sufficient. But unlike ruleset/keyname, match_event has rich attribute schemas in `match_event_versions.attributes_json` -- a deriver could synthesize a useful description like "Death event: emitted when a player dies. Attributes: time, attacker, target, type, quad, armorleft, killheight, lifetime."

**Investigation directives:**

1. Read the comment block at `derive-entity-description.ts` after the `DERIVE_BY_TYPE` registry: *"ruleset and keyname have no help text; description stays NULL. Phase 6 retrieval falls back to entities.name for these types."* Confirm whether the fallback works in practice for match_event by hand-constructing the SQL `lookup_entity` and `search_entities` would run for canonical_id like `ktx:match_event:death` and verify the row surfaces.
2. Decide with operator: write `deriveMatchEvent` (extracts attribute summary from `match_event_versions.attributes_json` -> generates a 1-2 sentence description -> Voyage embeds it; ~30-60 min) OR accept name-fallback parallel to ruleset/keyname (skip deriver; document the choice in a code comment near `DERIVE_BY_TYPE`).
3. If operator chooses to write the deriver, the implementation belongs in the same commit as the cvar fix from Issue #1 (D16 -- coherent unit per logical change; "fix description coverage gaps for KTX entity types" is one logical unit).

### Issue #3 (NICE-TO-FIX before prod) -- gameplay_taxonomies parallel-stat bug

**The state:** D.3.1/D.6.1 from the Phase 7 cross-project audit. `_handler_gameplay_taxonomies.py:385` computes `source_total = len(raw_election_rows)` over pre-dedup data; under `--workers > 1`, value is 4x correct. Stat-only -- the actual `count` field correctly dedups to 5. Breaks Section-1.1 byte-reproducibility under default `--workers 12`.

**Investigation directives:**

1. Read the existing handler at `apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py` lines around 385.
2. Read the Pattern 13 retrofit precedent at Phase 5.5 (commit `44f5b894`) -- specifically the modes handler change at `_handler_modes.py`. The fix shape is "move `source_total` to typed pseudo-row aggregation (`_kind="_meta_election_count"` or similar) emitted from `end_file()`; finalize partitions and counts the unique rows post-dedup."
3. Sized at <30 lines per the audit's estimate. Run `pytest tests/test_handler_gameplay_taxonomies.py` after the fix; add a parallel-vs-serial equivalence test parallel to `tests/test_handler_modes.py:test_parallel_serial_equivalence`.
4. Single commit, message style matching prior arc commits (e.g. `fix(qw-oracle): gameplay_taxonomies source_total parallel-aggregator-naive (D.3.1)`).

### Issue #4 (DECISION needed) -- orientation blob update

**The state:** `apps/qw-oracle/serve/mcp/src/orientation.ts` has uncommitted changes. Two layers:

1. Operator's WIP (already in modified state at session start before the previous terminal touched it): reorder Layer 2 and Layer 3 in the layer list.
2. Previous terminal's edit on top: enriched the Layer 1 line with KTX entity types, project list, and gameplay-kind discriminator names.

Run `git diff HEAD apps/qw-oracle/serve/mcp/src/orientation.ts` to see the composite diff before doing anything else.

**Operator's pending decision** (per the previous-session conversation, paraphrased): "Keep / rewrite / revert" the previous terminal's KTX-aware enrichment. Operator did NOT approve or revert before sleeping; the file is awaiting their call. **Do NOT commit this change without operator's explicit OK** -- it's stacked on their MCP-API WIP and they may want to author the Discovery update themselves as part of the in-flight MCP-API arc.

If operator approves: the change can ride a single "discovery: orientation blob KTX update" commit cleanly, separate from the Issue #1/#2/#3 commits.

### Issue #5 (PRE-PROD SMOKE) -- run idempotency-ktx.sh

**The state:** `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh` ships executable (3265 bytes); never run live in Phase 7 because that executor terminal lacked `psql`. This terminal CAN run it via `docker exec qw-oracle-postgres-dev psql ...` -- the dev container is up.

**Investigation directives:**

1. Read the script (head it; ~102 lines). Understand what it asserts and how it runs.
2. Run it. Capture output. If FAIL, investigate root cause (does it gate on count drift, content-hash drift, or both? Was anything changed in dev DB by accident since Phase 6 closed? Does the script have a hardcoded path or env-var the host doesn't satisfy?).
3. If PASS, capture the success line in a brief commit-or-comment note for the audit trail. If the operator wants the script run as part of every prod deploy, fold it into DEPLOYMENT.md per the prod-update-lifecycle spec section 2.6.

### Issue #6 (NOT BLOCKING, deferred per review) -- 5 pre-existing ezquake F1 FAILs

Per HANDOVER:26 since 2026-04-28; not KTX-introduced. Re-anchor probe expected values OR investigate the 11-row delta. **Do not address this in the post-review session unless operator surfaces it explicitly.** The review's recommendation is "drain as small followup OR fold into a future ezquake refresh arc" -- not a KTX-blocking item.

### Issue #7 (NOT BLOCKING, cosmetic) -- KTX handler class-name shape inconsistency

Per D.2.1 of the Phase 7 audit. 4 use `<Type>KtxHandler`, 4 use `Ktx<Type>Handler`. Cosmetic only. **Skip indefinitely** unless operator surfaces it explicitly.

---

## After investigation -- pre-prod work order

Once Issues #1-#5 have a settled disposition (#1 + #2 + #3 fixed and merged; #4 settled; #5 PASS or root-caused), the remaining work to flip prod is:

1. **Re-run extract-tag** for KTX after any handler/deriver change that affects dev DB content. Confirm row counts unchanged (D15 idempotency). Confirm the cvar/match_event embedding coverage now reflects the fix.
2. **Re-run the F1 quality grid** for KTX (`bun run check-quality -- --project ktx`) plus a cross-project F1 sweep to ensure no prior-engine regression.
3. **Document the description-coverage state** in the review document or a successor note. If we shipped the cvar gap as fixed, the review's "Pass 1 -- DELIVERED-DIFFERENT" verdict needs an amendment. If we shipped it deferred, the YELLOW item gets a sized-out fix path captured for HANDOVER.
4. **Run idempotency-ktx.sh again** post-fix; confirm PASS.
5. **Operator-driven prod deploy** per `apps/qw-oracle/DEPLOYMENT.md` "Routine corpus refresh" section + the additions Pass 2 of the lifecycle spec calls for (Tier 2 dump archival, single-transaction restore). The operator runs this with Claude as collaborator; the fresh terminal should NOT initiate a prod deploy autonomously.
6. **Smoke prod from Claude Desktop** -- verify the new MCP responds with KTX rows in semantic search post-deploy.
7. **Delete the two HANDOVER bullets** per the post-arc handoff cleanup section: "qw-oracle slim-doc Arc 1 refresh sweep" (per F20; absorbed by Phase 8) + one operator-judgment item.

---

## Pending decisions for operator (do not act on without OK)

1. **Issue #4 -- orientation blob.** Keep / rewrite / revert the previous terminal's KTX-aware enrichment. Show diff, await answer.
2. **Issue #1 -- cvar embedding gap.** After investigation report-back: fix shape + effort estimate + dev-DB impact projection. Operator approves before implementation.
3. **Issue #2 -- match_event description deriver.** Write or accept name-fallback. Decision after Issue #1 investigation (treat as same logical commit if both fix).
4. **Review amendment.** If we fix Issue #1, the review's "Pass 1 -- DELIVERED-DIFFERENT" verdict on the description-coverage facet needs to flip to DELIVERED + amendment block citing the post-review session as the source of the discovery and the fix commit. Operator decides whether to amend the review in place or write a successor note.
5. **DEPLOYMENT.md additions** per Pass 2 of the lifecycle spec (Tier 2 archival, single-transaction restore). Operator-driven; can land alongside the prod-deploy commit or independently.

---

## First three actions when this terminal starts

1. **Run `git status` and `git diff HEAD apps/qw-oracle/serve/mcp/src/orientation.ts`.** Confirm working-tree state matches the description in this handoff. If anything has drifted, halt and surface to operator before doing anything else.
2. **Read the four required-reads in order: review document -> post-arc handoff -> API_CONTRACTS.md -> oracle-prod-update-lifecycle spec.** No skim-reading; the cold-context discipline is what makes the post-review investigation honest.
3. **Begin Issue #1 investigation.** Open `_handler_cvars.py`, `load-cvars.ts` (find via grep), and run the cross-engine `trailing_comment` query against dev DB. Report findings to operator before any code change. Do NOT touch handler files or `derive-entity-description.ts` until operator approves the proposed fix shape.

---

## When in doubt

- If a finding contradicts the spec or the review, surface it. The review is durable but the post-review session is allowed to amend it; that is exactly what this terminal is here for.
- If a fix turns out to be larger than expected (e.g., trailing-comment harvest is broken across multiple handlers, not just KTX cvars), surface to operator before scope-creeping. The right disposition might be a new arc, not an in-session fix.
- If the operator answers a question with a one-line answer, treat it as a hint to keep going, not a complete instruction. Re-anchor on the directive: thorough, not rushed; don't skip anything unless it has higher purpose.

End of post-review investigation handoff. Fresh terminal: start with the three actions above, then proceed in priority order.

---

## Session 1 progress (2026-05-07; appended at session close)

This terminal picked up the post-review work. Captures what shipped vs what's still pending so next session can resume cleanly.

### Issue #1 -- KTX cvar embedding gap: ROOT-CAUSED, fix shape AGREED, implementation NOT YET DONE

Two-bug compound. Wider blast radius than just KTX:

- **Bug A (handler):** `apps/qw-oracle/scripts/extractors/ktx/_handler_cvars.py:169` hardcodes `"trailing_comment": None`. Docstring at line 49 frames as "KTX has no convention" -- false; live source has 75 KTX cvar registrations with trailing comments (sampled `world.c:772-824`). Per `feedback_audit_predictions_not_contracts.md`, this was a contributor-introduced misjudgment; the convention DOES exist, just not on every cvar.
- **Bug B (deriver):** `derive-entity-description.ts:deriveCvar` reads only `help_desc` / `help_remarks` / `help_values`. Never consults `trailing_comment`. Pre-existing since Arc 1 (deriver authored for ezquake/FTE shape, never extended for code-only engines). MVDSV has been silently zero-coverage since onboarding.

Live cross-engine state (verified via dev DB, 2026-05-07):

| project | total_cvars | with_description | with_help_desc | with_trailing_comment | trailing_only_no_help_desc |
|---|---|---|---|---|---|
| ezquake | 2989 | 2223 | 2092 | 150 | 28 |
| fte | 2482 | 1883 | 1883 | 0 | 0 |
| ktx | 260 | 0 | 0 | 0 | 0 |
| mvdsv | 183 | 0 | 0 | 35 | 35 |
| qwcl | 187 | 0 | 0 | 0 | 0 |

The fix unlocks ~138 cvars across three engines (KTX 75 + MVDSV 35 + ezquake-CODE_ONLY 28). QWCL is NOT covered by this fix -- see borrow arc below.

**Fix shape (operator agreed: fallback-only semantics, NOT additive):**

- **Part A (KTX handler).** Copy MVDSV's `_trailing_comment` helper into `_handler_cvars.py`, anchored on `;` after `RegisterCvar*(...)`. Replace line 169 hardcoded null. ~30-40 LOC. Pattern reference: `apps/qw-oracle/scripts/extractors/mvdsv/_handler_cvars.py:63-114` (anchor changes from `};` to `);`; otherwise identical logic).
- **Part B (deriver).** Switch `deriveCvar` from `CONCAT_WS` additive to `COALESCE`-style fallback. JSON-derived sources first; trailing_comment only when JSON-side is empty. Effect on ezquake's 122 cvars-with-both: NO change (JSON keeps winning per operator preference). 28 trailing-only ezquake cvars gain new descriptions. ~5-line SQL change.
- **Single commit per D16:** "fix description coverage gaps for cvars across KTX/MVDSV/ezquake".

**Re-extract impact (projection):**
- ~75 KTX descriptions new
- ~35 MVDSV descriptions new
- ~28 ezquake descriptions new (trailing-only cases)
- Voyage cost: ~290 short-string embeddings, ~$0.05.
- Dev-DB-only; rides the same prod dump as the rest of KTX.

**Operator paused before code change.** Implementation is in agreed-shape state, awaiting "go". Next session: re-confirm and implement.

### Side discoveries (filed / captured this session)

1. **Issue #1117 follow-up comment filed.** 28 ezquake CODE_ONLY cvars (the symmetric direction to #1117's prune ask) surfaced as a comment on the existing issue: https://github.com/QW-Group/ezquake-source/issues/1117#issuecomment-4396819673. Pattern: server-side cluster (20 of 28 are sv_*-files), modern additions (2016-2020) still use the inline-comment-only convention -- likely deliberate client-only-doc convention. Body draft committed at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-coverage-gaps.md`. Awaiting slime's review tonight.

2. **Slime requested actual PR conversion** for #1117. The issue shape has been fine, but slime confirmed via Discord (2026-05-07): "we need to make an actual PR not just an issue". This is a NEW task: build PR(s) from the cleanup digest at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-cleanup.md`. PR shape (one PR vs three vs other) still awaiting his nightly review. Eventual PR commit uses kernel coding-assistants attribution: `Signed-off-by: David Larsen <david.larsen.1981@gmail.com>` from operator + `Assisted-by: Claude:claude-opus-4-7`. Convention anchored in CLAUDE.md "Upstream PRs (outside this monorepo)" subsection + memory file `reference_upstream_pr_attribution.md` + PreToolUse hook live this session (see below).

3. **QWCL cross-engine description borrow opportunity** -- separate arc, parked at `docs/superpowers/parking/2026-05-07-qwcl-cross-engine-description-borrow.md`. 156 of 187 QWCL cvars (83%) have name-matches with documented ezquake cvars; clean implementation is one column on `cvar_versions` (`description_inherited_canonical_id`) + deriver fallback + backfill script. Ships AFTER the trailing-comment fix per "narrow arc before broad". Open questions in the parking doc: also extend to MVDSV/FTE/KTX where applicable.

4. **Pattern analysis on #1117's "renamed" bucket** revealed three sub-patterns: (A) cosmetic client-side renames (cfg_browser_* -> file_browser_*) where new names have rephrased help-JSON entries; (B) server-side renames (sv_timeout -> timeout) where new names lose help-JSON coverage entirely (CODE_ONLY going forward, with only trailing comments as docs source); (C) semantic merges that look like renames (serverstatus -> status). #1117's prune ask removes drift on (A) safely, but on (B) leaves the renamed cvars with no help-JSON description -- which is the same root pattern as the 28 CODE_ONLY observation in our follow-up comment.

### Hook for upstream-PR convention enforcement (LIVE this session)

`PreToolUse` hook on `Bash` matcher with `if`-filtered entries for `Bash(gh pr create*)` and `Bash(gh pr edit*)`. Both fire `~/projects/quakeworld/.claude/scripts/upstream-pr-reminder.sh`, exit 2 to block the call and feed the reminder back. Convention: AI does NOT add `Signed-off-by`; operator signs and certifies DCO; use `Assisted-by: Claude:<model-id>`. Hook is project-scoped to this monorepo. Verified by triggering during installation (both `gh pr create --help` and `gh pr edit --help` blocked; `gh pr list` passed through cleanly). The eventual #1117 PR conversion will fire this hook -- apply convention per CLAUDE.md and proceed.

### Still pending from original list (Issues #2 / #3 / #4 / #5 / #6 / #7)

Unchanged; re-read the parking doc body above for shape:

- **#2:** match_event embedding gap (7 rows, no deriver). Operator decision: write `deriveMatchEvent` vs accept name-fallback parallel to ruleset/keyname.
- **#3:** gameplay_taxonomies parallel-stat fix (D.3.1; <30 LOC per Pattern 13 precedent).
- **#4:** orientation blob update (operator decision; previous-terminal edit awaiting their call).
- **#5:** run idempotency-ktx.sh (smoke; this terminal CAN run it via `docker exec`).
- **#6:** 5 pre-existing ezquake F1 FAILs (deferred per review).
- **#7:** KTX handler class-name shape inconsistency (cosmetic, deferred).

### Working-tree state at session close

23 uncommitted preserved (operator's MCP-API + qwiki WIP). This session's commits:
- `084ee28d` (carried in from session 0): KTX post-review investigation handoff parking doc
- All other session-1 work was committed via the docs-check wrap-up at the END of session 0 (commit `ee834790`); session 1 did NOT mutate the operator-fenced files
- Session 1 added: comment on #1117 (filed via gh, no local commit), parking doc for borrow arc (uncommitted at session close per "wrap up before context reset" handoff plan)

Note for next session: the borrow arc parking doc + this session-1 progress addendum are uncommitted at handoff time. Wrap them in the next session's first commit if appropriate.

### Next session -- first three actions

1. **Re-read this parking doc end-to-end** (cold pickup) plus the sibling borrow arc parking doc.
2. **Re-confirm with operator: ready to implement the trailing-comment fix?** Per the agreed fallback-only shape, single commit. Then re-run `extract-tag` (KTX), re-derive, re-embed, F1 grid for KTX + MVDSV + ezquake.
3. **After trailing-comment fix lands**, decide order for the remaining issues: #2 (match_event), #3 (parallel-stat), #5 (idempotency smoke), #4 (orientation), then prod deploy. The QWCL borrow arc is a separate session/arc per the borrow parking doc.

Hook will fire on any `gh pr create` / `gh pr edit` when the eventual #1117 PR conversion happens -- apply Signed-off-by + Assisted-by per convention and proceed.
