# Fresh-terminal handover: close ghost-classification + F2-scoping (and consolidation)

**Date:** 2026-05-15. **For:** a fresh terminal, cold. **Scope:** two open issues + related consolidation. The L1 description/teamplay data fix that motivated this is DONE and verified — it is context here, not your task.

---

## Where things are (verified this session)

A long diagnostic arc traced three terminals' "documentation drift" pain to one root cause: the ezquake L1 extractor's merge step trusted help-JSON over the captured source/AST signal. Two surgical handler fixes shipped and were verified:

- **Fix 1** `_handler_cvars.py`: when help-JSON has no `desc` but a source `//` trailing comment exists, promote the comment to `desc` (was: silently dropped; the comment sat unused in `trailing_comment`). Verified HEAD (24/24 ezquake cvars) and 3.6.9 (29).
- **Fix 2** `_handler_macros.py`: derive `teamplay-restricted` from the AST registration form (`Cmd_AddMacro`→false; `Cmd_AddMacroEx` non-NORULES teamplay arg→true) instead of help-JSON passthrough. help_macros.json carried inverted `incomplete` placeholders. Verified 9/9 at HEAD and 3.6.9 (a tag where the inversion was provably present pre-fix).
- Pure logic; **no schema, no loader, no migration** (loaders already map `entry.desc→help_desc`, `entry['teamplay-restricted']→teamplay_restricted`).
- All 15 ezquake versions re-walked via `npm --no-workspaces run load-knowledge -- extract-tag --project ezquake --version <v>`. Regression guard did not trip. **Before starting, confirm the walk finished clean:** `tail -5 /tmp/walk-all.log` should show `WALK LOOP COMPLETE`; if it shows a `FAILED` line, the walk halted on the regression guard — investigate that first.

Durable facts in memory: `reference_ezquake_dual_doc_model.md` (dual-doc model + provenance routing), `reference_ezquake_dev_team.md` (nano = head ezquake dev, slime helps; ciscon is QWiki/community, NOT ezquake-dev).

---

## Your two issues

### Issue A — ghost classification (`source_retired` vs `doc_only`)

`s_stereo` (entity 10894) is stored `source_retired` but was **never source-backed at any extracted tag**. Verified lifecycle: born 2005 as a genuinely Linux-only cvar (`cvar_t s_stereo`, registered inside `#ifdef __linux__`, commit `b8236019`, ALSA backend); purged from C source for all platforms 2013 (SDL2 import, commits `0538d9ae` + `1215c7c3`); lingered as a stale `help_variables.json` ghost until removed 2026-05-07 (commit `c9dec3d9`, the "156 drift entries" cleanup). Its 10 DB version rows all have `source_file IS NULL` (present v3.0/v3.0.1/3.1 + 3.6.0–3.6.9, absent 3.2.x + head). So arguably it should be `doc_only`, not `source_retired`.

**CRITICAL — do not patch blindly.** `source_state` is **loader-derived** (`scripts/load-knowledge/diff-versions.ts` ~lines 384/389/430, `load-version.ts`, `transitions.ts`), and it was changed THIS SAME DAY: commit `3be4d576` (2026-05-15) added a 150-line "retreat entity-state when version-rows are pruned" fix that **deliberately moved 154 entities `doc_only`→`source_retired`**, and `quality-grid.ts` was re-baselined around it (see comment at `quality-grid.ts:1409-1410`). s_stereo's `source_retired` may be an *intended* consequence of that change. **Investigate whether this is a real misclassification or intended behavior before proposing anything.** This is an investigation, not a quick patch — that is exactly why it was deferred to a fresh terminal.

If a change is warranted: it is **loader-side → costs a reload, NOT a re-extract/re-walk**. Do not couple it to the expensive extractor walk.

### Issue B — F2.flickering_presence scoping

`F2.flickering_presence` (a quality-grid probe in `scripts/load-knowledge/quality-grid.ts`) false-positives on help-JSON-only ghosts. For a *source* entity, non-monotonic presence across versions signals extraction instability (real). For a **ghost** like s_stereo, non-monotonic presence is *expected* — it merely mirrors which release branches' committed `help_*.json` still carried the stale entry; the cvar itself was dead since 2013. F2 conflates the two.

Recommended scoping: F2 should not flicker-alarm on entities that are `source_file IS NULL` at **every** version (those are ghosts — owned by the doc_only/ghost classification, not the flicker probe). This is a **pure probe-definition edit in `quality-grid.ts`. No walk, no reload, no schema.** Mind the 2026-05-15 F2 re-baseline (commit context around `3be4d576`) — confirm your scoping change interacts correctly with the new baseline.

---

## Related consolidation (capture; lower priority than A/B)

1. **Quarantine commit `291268bd`.** It wrote a hallucinated "Sister finding (added 2026-05-15)" section into `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` claiming s_stereo is "a real, live, Linux-only sound cvar" invisible because "the libclang extractor parses a fixed non-Linux platform config." **Refuted this session:** the extractor runs a **4-variant platform union** (`scripts/extractors/extractor_lib/clang_config.py`, driven by `scripts/extractors/ezquake/extract.py:178`) with **Linux as the baseline** (`__linux__` predefined); `git grep -i s_stereo HEAD` in ezquake-source is zero (it is *deleted*, not platform-gated). Correct/revert that section; replace with the accurate lifecycle above. The commit message itself propagates the false claim.
2. **Relabel the help-JSON audit's `kick_to_ciscon` vocabulary.** ezquake-doc fixes route to **nano/slime**; `sv_*` entities originate in MVDSV → fix in MVDSV source (slime's rule). ciscon is QWiki/community, not ezquake-dev. The audit deliverables (`apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries*.md`) are mis-addressed.
3. **Home doc:** `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` is the convergence tracker — fold findings there. Note the `Cmd_AddLegacyCommand` item in it is **stale**: the handler already detects it and emits `ast.legacy_alias_of` (`_handler_commands.py` lines ~184/232-239/296-297); the only gap is loader-persistence + a schema column → that is arc work, not a handler bug.
4. **mvdsv (35) / ktx (68) — UNVERIFIED, do not assume a bug.** Those are the per-project counts of `help_desc`-empty-with-trailing-comment rows. But mvdsv/ktx/fteqw have **no help-JSON at all** (only ezquake has the dual system — verified). For single-source engines `help_desc` empty may be normal-by-design, and `scripts/load-knowledge/derive-entity-description.ts` may already surface their comment. Investigate before calling it a cross-project bug. (An earlier statement that "the same bug exists in mvdsv/ktx" was walked back — it is not verified.)

---

## Critical rules

- **Verify, don't infer.** This session repeatedly caught inference-as-evidence errors (a hallucinated committed finding; a "127" that was a cross-project unscoped-query artifact — real ezquake = 24; mvdsv = 35; ktx = 68). Primary-source every factual claim (grep / SQL / git), and project-scope every DB count (`JOIN entities ... WHERE project=...`).
- **Issue A is loader-side** → reload, never a re-extract/re-walk. Investigate the `3be4d576` interaction first.
- **Issue B is a pure probe edit** → no walk, no reload, no schema.
- DB is Postgres (`docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`). SQLite era ended.
- Git: solo-dev, Claude runs git silently, commit to `main`, no PR/branch ceremony (see monorepo CLAUDE.md).

---

## First three actions

1. `tail -5 /tmp/walk-all.log` — confirm `WALK LOOP COMPLETE` (the data fix landed clean). If `FAILED`, stop and report the regression-guard state.
2. Issue B (cheapest, fully scoped): read `scripts/load-knowledge/quality-grid.ts` F2 definition + the 2026-05-15 re-baseline; design the `source_file IS NULL at every version` exclusion; verify it would have suppressed the s_stereo false-positive and nothing legitimate.
3. Issue A: read `3be4d576` in full (`git show 3be4d576`) + `diff-versions.ts`/`load-version.ts` state derivation; determine whether s_stereo `source_retired` is intended by that change or a gap. Decide *investigate-only outcome* before any code.

## Reads required

- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` (convergence tracker — the home doc)
- `git show 3be4d576` and `git show b9b9b0c4` (the same-day loader state-derivation changes)
- `scripts/load-knowledge/quality-grid.ts` (F2), `scripts/load-knowledge/diff-versions.ts` + `load-version.ts` (source_state derivation)
- `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md` (the `291268bd` section to quarantine)
- memory: `reference_ezquake_dual_doc_model.md`, `reference_ezquake_dev_team.md`

## When in doubt

Issue A is an *investigation with a possible no-op outcome* (it may be working as intended post-`3be4d576`) — a clear "it's intended, here's why" is a valid, valuable result. Do not force a reclassification to feel productive. Issue B is the safe, self-contained win. The data fix is already done — nothing here should re-run the extractor walk.
