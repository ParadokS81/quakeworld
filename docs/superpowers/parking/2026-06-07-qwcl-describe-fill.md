# QWCL Layer 1 describe-fill (ezQuake-prior-seeded) -- arc seed

**Captured:** 2026-06-07 (warm, during the qtv-qwfwd-l1 post-arc review -- the per-project coverage query exposed QWCL at 0% described).
**Status:** PARKED, low priority. No hard dependency; pick up when L1 description completeness is wanted, or as a warm-up before a cross-engine "cvar evolution" concept note that needs QWCL described.
**Shape:** describe-fill follow-on, NOT a full multi-phase arc. There is no novel build here (contrast qtv-qwfwd, which needed a Go extractor) -- QWCL is already extracted and loaded. This is a re-run of the existing `describe-fill-synthesis` + mother-ledger machinery on one already-loaded project, with one project-specific twist (the ezQuake prior). Likely 2-4 describe batches, not a planner-scaffolded arc.

## Why this exists

QWCL (the original QuakeWorld client, slug `qwcl`, version `2.33` -- the pipeline's first cross-codebase port, 2026-04-25) is the only L1 project with **0% description coverage**: 380 source_backed entities (187 cvar / 121 command / 72 cmdline_param), all `description IS NULL`, none embedded. Every other project carries descriptions (ktx/mvdsv 100%, ezquake 75% via help-JSON, fte 66%, qtv/qwfwd 100%). QWCL is the lone bare skeleton -- an eyesore more than a user-facing gap (nobody runs QWCL today), but it is the **lineage root**: ezQuake descends from this client, so describing QWCL directly is what lets a future "how did cvar X evolve QWCL -> ezQuake" cross-engine concept note actually anchor both ends.

## The leverage: QWCL is ~74% a described-ezQuake subset

Measured live 2026-06-07 (join on `name_fold` + `type` to ezQuake entities that already carry a description):

| type | QWCL total | overlaps a DESCRIBED ezQuake entity | QWCL-only (no described ezQuake match) |
|---|---|---|---|
| cvar | 187 | **157 (84%)** | 30 |
| command | 121 | **106 (88%)** | 15 |
| cmdline_param | 72 | **20 (28%)** | 52 |
| **total** | **380** | **283 (74%)** | **97** |

The overlap is genuine shared QW-era surface (`cl_bob`, `cl_bobcycle`, `bgmvolume`, `bottomcolor`, `cl_anglespeedkey`, ...). The cmdline_params barely overlap because QWCL's command line is full of 1996-era DOS/sound/video flags ezQuake dropped -- those map to the operator's "no longer in ezQuake = retired/deprecated" intuition.

## Load-bearing methodology decision: SEED, do not COPY

The attractive shortcut -- copy the ezQuake description text onto the matching QWCL row -- is **wrong**, for three reasons (all verified, not theoretical):

1. **Semantic drift.** Of the 283 borrowable ezQuake descriptions, **~94% are `help_json` origin** (cvar 156/157, command 103/106) -- i.e. ezQuake's *user documentation describing ezQuake*, a client with 25 years of features layered on the QWCL base. The text frequently documents value ranges / options / behavior added *after* QWCL; pasting it onto QWCL attributes behavior the 1996 source does not have.
2. **No honest provenance.** There is no truthful `description_origin` value for "copied from a sibling codebase." It is not qwcl `help_json` (QWCL ships none) and not `synthesized` from QWCL source. Inventing an origin breaks the `describe_fill.origin_vocabulary` + F-D4a guards (the `feedback_description_origin_provenance` lesson).
3. **It is the D6 trap, again.** The qtv-qwfwd arc just shipped a load-bearing guard against exactly this error class: do NOT seed a description for one codebase from a *sibling's* artifact, because the same-named knob may not mean the same thing. Borrowing ezQuake's help-JSON onto QWCL is the same mistake the D6 guard exists to prevent.

**The correct realization (keeps the speed, loses the trap):** run `describe-fill-synthesis` on QWCL with the matching ezQuake row supplied as a **strong prior / cross-reference hint**, verified against QWCL's own source register-site (`research/repos/qwcl-original/QW/...`). The skill's affirm-or-synthesize early-exit means the 283 overlapping knobs go *fast* -- the worker confirms the ezQuake semantics still hold against QWCL source, writes a QWCL-true description, and stamps `description_origin='synthesized'` anchored to QWCL source. Only the ~97 QWCL-only entities need full cold synthesis. Honest provenance, drift caught where ezQuake diverged, existing proven machinery.

## Known ragged edge: the 52 QWCL-only cmdline_params

72 cmdline_params, only 20 overlap a described ezQuake flag; 52 are QWCL-only -- mostly 1996-era DOS / sound-card / video-mode flags (the genuine retirements). These are the lowest-value, highest-effort slice. Recommend a triage pass first: decide which deserve a real description vs. which get a one-line "historical: <subsystem>, removed in modern clients" stub vs. which are pure trivia. Do not let the 52 dominate the effort budget for a project nobody runs.

## Open questions for the brainstorm / executor

- Batch slicing: by type (cvars -> commands -> cmdline) or by overlap-vs-QWCL-only? (Overlap-first banks the cheap 283; QWCL-only is the residual cold-synthesis tail.)
- Does the `describe-fill-synthesis` skill need a small "prior row" input hook, or is pasting the ezQuake row into the per-knob brief enough? (Probably the latter -- no skill change.)
- After describe: run `embed-entities.ts` for qwcl (it is currently 0 embedded) so `search_entities` can surface it. Add `F1.qwcl.*` floor + source-state probes (mirror the qtv/qwfwd Phase-4 pattern).
- Cross-engine wiring: should described QWCL cvars that mimic ezQuake get See-also / `mimics_project` relations now, or is that a later concept-note concern? (Lean: later -- describe first.)

## What is NOT in scope

- Re-opening or re-litigating ezQuake L1 rows -- they are the prior/seed, read-only.
- Copying ezQuake description text verbatim (the methodology decision above forbids it).
- Inventing a new `description_origin` value -- end state is `synthesized`, QWCL-anchored.
- Any QWCL *extractor* change -- QWCL is already extracted and loaded (380 rows); this is description-only.

## Related

- Post-arc review that surfaced the gap: `docs/superpowers/reviews/2026-06-06-qtv-qwfwd-l1-extraction-post-arc-analysis.md`.
- The describe machinery to reuse: `describe-fill-synthesis` skill; the sibling campaigns `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/` and `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/` (Phase 3 mother-ledger + per-knob ledgers).
- QWCL extraction origin: arc-history 2026-04-25 "QWCL 2.33 (first cross-codebase port)".
- The payoff direction this feeds: cross-engine "cvar evolution" concept notes (QWCL -> ezQuake lineage), per the qtv-qwfwd concept-note decision and `project_qw_oracle_corpus_cross_engine`.
