# Loader bug: entity-level state doesn't retreat when entity leaves source + help-JSON

**Surfaced:** 2026-05-14 during ezquake HEAD re-walk to `3f9e724f` (the PR #1120 docs-cleanup-merge walk).
**Status:** Open. Fresh-terminal arc. Operator-overseen from main session.
**Pressure:** Medium. Pre-existing in prod since at least the prior walk; queries return stale `source_state='doc_only'` for 155 ezquake entities that have left both source and help-JSON. Not a regression introduced by today's walk, but the walk surfaced clean evidence and the F1 grid now has a probe (`F1.last_seen_max_ordinal`) that names it.

---

## The bug in one paragraph

When the loader walks a version and an entity that was previously present at that version is now absent from both source AND help-JSON, the loader correctly prunes the entity's row from the appropriate `*_versions` table at that version (`[load-version] cleaned up N stale <type> version rows at <project>@<version>` log line). But the entity row in `entities` keeps `last_seen_version` pointing at that version and `source_state` at its prior value. As a result, MCP queries that derive their answer from `entities.source_state` or `entities.last_seen_version` return stale, non-current state. The version-rows tell the truth; the entity row lies.

## Concrete evidence

Pre-walk ezquake entities source_state distribution: source_backed 3738 / doc_only 183 / source_retired 121.
Post-walk: source_backed 3750 / doc_only 183 / source_retired 121.

Only 12 transitions fired during the walk (the 12 newly-introduced entities from the new feature commits, all `initial_observation -> source_backed`). Zero transitions for the ~150 entities that disappeared from HEAD's help-JSON in PR #1120's 156 ghost deletes.

Cross-check against current source + current help-JSON (post-walk):

| type            | doc_only entities at head | still in current help-JSON | NO LONGER in help-JSON |
|-----------------|--------------------------:|---------------------------:|-----------------------:|
| cvar            |                       138 |                         25 |                    113 |
| command         |                        41 |                          3 |                     38 |
| cmdline_param   |                         2 |                          0 |                      2 |
| macro           |                         2 |                          0 |                      2 |
| **total**       |                   **183** |                     **28** |                **155** |

155 of 183 doc_only entries at HEAD are NOT in the current help-JSON and NOT in current source. They should have transitioned to `source_retired` (or had their `last_seen_version` retreated to the highest tag where they were actually observable). Instead they sit pointing at HEAD with stale state.

Sample stale entity: `auth_validate` (cvar). Not in `help_variables.json` (PR #1120 dropped it), not in any `src/*.c` registration, but DB shows `source_state='doc_only'`, `last_seen_version='head'`. Many similar examples across `auth_*`, `cfg_browser_*`, `demo_browser_*`, the broader cleanup PR's target set.

F1 quality grid signal: `[FAIL 154] F1.last_seen_max_ordinal -- 154 entities with stale last_seen_version`. That probe IS the canonical sensor for this bug; it's been failing for at least one prior walk (the HANDOVER:30 floor-probe note from 2026-04-28 references "classification drift" which is the downstream symptom).

## What this means for prod queries

If a user asks the MCP "what does cvar X do", and X is one of the 155 stale entities, the answer pipeline:
- For an MCP tool that filters by `source_state='source_backed'`: returns "no result" or routes to an "unknown" path. Mild miss — better than wrong.
- For one that returns the entity row directly with its `source_state`: returns `doc_only` (suggesting "help-JSON only, no source registration"), which is now wrong twice over — there's no source AND no help-JSON. Operator gets a misleading classification.
- For descriptions: the entity row still has the pre-PR-#1120 description text. Query returns prose that no longer corresponds to anything in current source. The 12 freshly-described cvars from PR #1120 are correct (those updated via the normal path). The 155 ghosts have stale prose that should never have been served because PR #1120 explicitly removed it from the help corpus.

None of these are deploy-blocking — same state as prior prod, just freshly evident. But for the empty-description audit sidequest (HANDOVER:62) the operator is actively driving, a clean entity-level state would prevent the audit's "missing description" candidates from being polluted by ghosts that should have been retired.

## Where the bug lives

Most likely: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`. Look for the existing prune logic that emits the `cleaned up N stale <type> version rows` log line — the prune handles `*_versions` but doesn't propagate to `entities`.

Adjacent code that needs review:
- `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts` — generates `change_events` between version-pairs; may need to emit a delete/retire event when an entity leaves the version's row set.
- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` "help-JSON orphan" pruner — this DOES retreat in one narrow case ("cross-type source_backed counterpart exists for <project>"), pruning 2 cvar + 15 command orphans in this walk. The general case is missing.
- The `source_state_transitions` table schema — already supports `to_state='source_retired'` with `reason='removed_from_head'` per its CHECK constraint. So the data shape is already there; the transition emission just doesn't fire.

## Fix sketch (for the fresh terminal to validate, not adopt blindly)

After all version-rows are pruned for an entity at the just-walked version, recompute:
1. `last_seen_version` = the highest version (by ordinal) that still has a row in any `*_versions` table for this entity. If no rows remain anywhere, the entity might warrant deletion (or a terminal "ghost-orphaned" state — TBD).
2. `source_state`:
   - If a `*_versions` row exists at `last_seen_version` AND that row has source-side fields populated -> `source_backed`.
   - If only the help-JSON enrichment side has fields at `last_seen_version` -> `doc_only`.
   - If `last_seen_version < latest_version_for_project` AND the entity is still in `entities` -> `source_retired`.
3. Emit a `source_state_transitions` row with reason `removed_from_head` (or `source_retired_at_version`) whenever the state actually changes.

Risks:
- Touching state-transition logic is load-bearing. `change_events` generation, slipgate consumer JSON, and MCP query paths all depend on `entities.source_state` and `entities.last_seen_version` being current.
- Need to confirm no caller relies on the CURRENT broken behavior. (Unlikely but worth a sweep — grep for `WHERE source_state` and `WHERE last_seen_version` in the load-knowledge + serve trees.)
- The 155-entity sweep this fix produces will surface as a one-time `change_events` flood on the next walk. That's correct; it's the backlog of missing transitions catching up.

## Regression safety

After the fix lands, the F1 grid probes to watch:
- `F1.last_seen_max_ordinal` should report 0 (down from 154 / 155).
- `F1.ezquake.anchor.doc_only_count` and the 5 floor probes (`F1.ezquake.floor.{cmdline_param,command,cvar,hud_element}_source_state`) all currently fail with "classification drift" per HANDOVER:30. After the loader-state-retreat fix lands AND a re-walk runs, the splits in these probes will shift -- floor probe `expected` values must be re-baselined as a follow-up commit. (Floor probes hardcode the expected source_state distribution, which is exactly what this bug invalidates.) Don't refresh the floor probes BEFORE the fix; the current "drift" numbers are real signal.

Cross-project: same bug must exist for FTE / MVDSV / QWCL / KTX walkers (shared loader code). Run F1.last_seen_max_ordinal across all projects after the fix; spot-check that the failing-entity count drops to 0 everywhere.

## Reads required

- `apps/qw-oracle/scripts/load-knowledge/load-version.ts` — the load path that emits the "cleaned up N stale <type>" log; this is where the bug sits.
- `apps/qw-oracle/scripts/load-knowledge/diff-versions.ts` — change_events generator; may need symmetric updates.
- `apps/qw-oracle/SCHEMA.md` — `source_state_transitions` semantics + the entity-level `source_state` + `last_seen_version` definitions.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` Section 6 (Quality grid) and the `F1.last_seen_max_ordinal` probe definition (grep `last_seen_max_ordinal` under `apps/qw-oracle/scripts/load-knowledge/`).
- This parking doc.

## Critical rules for the fresh terminal

- Don't bypass the regression drop-guard. If the fix causes a >50% drop in any entity count, that's a sign the retreat-logic over-fires, not a sign to add `--force`.
- Don't refresh the F1 floor probes' `expected` values until the loader fix lands AND a re-walk has shipped under the new logic. Refreshing first hides the bug.
- Don't touch unrelated derivers or backfill scripts. The 11 derivers that don't write `description_origin` (HANDOVER:25) are a SEPARATE follow-up and a separate arc; they don't interact with this fix.
- TDD lite: write a test or repro script that demonstrates the current bug first (entity that disappears between two walks of `head` keeps `last_seen_version='head'`), then watch it pass after the fix.

## First three actions

1. Re-read this parking doc + the evidence section. Verify the bug still reproduces by querying the live dev DB for `auth_validate` or any name from the 155-entity list. (`SELECT name, source_state, last_seen_version FROM entities WHERE project='ezquake' AND name='auth_validate';` should still show `doc_only / head`.)
2. Read `load-version.ts` end-to-end, particularly the prune block. Pinpoint where the entity-row state update should live but doesn't.
3. Write the failing-test-first repro (could be a small TS script under `scripts/load-knowledge/` that walks a synthetic project with a known retreat case, or a real-data integration check that asserts `F1.last_seen_max_ordinal=0` after a head re-walk).

## When in doubt

- Bug shape unclear -> re-read the F1 probe at `apps/qw-oracle/scripts/load-knowledge/`'s grid sources; it encodes the canonical contract.
- Scope creep pressure -> stay narrow. This arc is "make the entity row's last_seen_version + source_state match the version-row truth." Floor-probe refresh, deriver retrofits, asset_category re-baselining etc. are all OUT of scope and have their own tracking.
- Halt and ask main session if: the fix is causing >50% entity drops, the fix is touching files outside the load-knowledge/ tree, OR the F1.last_seen_max_ordinal counter is not converging to 0 after a clean re-walk.

## Handoff prompt for the fresh terminal

> I'm a fresh terminal opened by the operator to ship the entity-state-retreat loader fix described in `docs/superpowers/parking/2026-05-15-entity-state-retreat-loader-bug.md`. Main session is overseeing/reviewing. Read that parking doc end-to-end first, then `apps/qw-oracle/scripts/load-knowledge/load-version.ts` and `diff-versions.ts`. Use `superpowers:systematic-debugging` first (the bug is real, reproduce + locate before hypothesizing), then `superpowers:test-driven-development` for the fix. Halt for main-session review at: (a) before touching load-version.ts (share repro evidence + fix sketch), (b) before committing (share the diff + before/after F1.last_seen_max_ordinal output), (c) if anything in the parking doc's "When in doubt" list fires.
