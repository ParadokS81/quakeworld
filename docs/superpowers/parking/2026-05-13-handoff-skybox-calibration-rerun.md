# Handoff: skybox calibration re-run for asset-type-curate skill

**Dispatched:** 2026-05-13
**Type:** fresh-terminal handoff (calibration test)
**Source:** post-improvement validation of asset-type-curate skill before fan-out

Paste-into-fresh-`claude`-terminal handoff. The fresh terminal opens cold, invokes the skill, produces a new skybox draft. Orchestrator terminal compares against the committed reference (commit `4a4eade0` on main) to validate whether the skill improvements produce tight output without orchestrator hand-holding.

The test question: **does the patched skill produce a clean draft on its own, or does it still need orchestrator-side guidance to land?** A cached terminal can't answer this honestly because it remembers the earlier conversation; a fresh terminal can.

---

## Prompt to paste

```
You're picking up a calibration test for the asset-type-curate skill. Invoke
the skill against the skybox slug. Produce the investigation report and draft
note per the skill's 6-step pipeline. This is a validation pass after several
skill patches: scope discipline (compress sprawl but keep depth, three-layer
wiki-feeder model), length targets (130-160 lines for multi-engine/multi-mech),
threshold rule for L1-GAP (enrichment-grade vs block-grade), "Related"
optional section in template, README-table-update as orchestrator-side step.

Working dir: /home/paradoks/projects/quakeworld

Invoke: /asset-type-curate skybox

The skill will walk the 6-step pipeline (pre-flight / source-verify /
docs-cross-ref / corpus-mine / triage / output) and produce:
- apps/qw-oracle/docs/asset-curation/skybox-investigation.md
- apps/qw-oracle/curated/asset-notes/skybox.md

CRITICAL NOTES:
1. Both files already exist on main (committed at 4a4eade0). Your re-run
   will overwrite them locally. Do NOT commit. The orchestrator terminal
   handles the post-calibration commit decision.
2. Follow the skill exactly. Do NOT apply judgment from outside the skill's
   own rules ("I think this should be shorter" / "I'll add a section the
   template doesn't mention"). The point is to test whether the skill's
   discipline lands without orchestrator hand-holding.
3. If the skill prompts ambiguity or you have to invent structure to
   complete a step, note it -- those are calibration findings for the
   skill itself.

After the skill halts with its one-line status report, paste back:

1. The skill's one-line halt-and-report line
2. wc -l output for the new skybox.md and skybox-investigation.md
3. git diff --stat 4a4eade0 -- apps/qw-oracle/curated/asset-notes/skybox.md \
                                 apps/qw-oracle/docs/asset-curation/skybox-investigation.md
4. Calibration findings: places where the skill felt ambiguous, incomplete,
   contradictory, or where you had to invent structure. Be specific -- name
   the step and what was missing.

Do NOT commit. Do NOT push.
```

---

## Expected outcome shapes

**Clean calibration (ideal):**
- New `skybox.md`: 130-160 lines
- New `skybox-investigation.md`: 200-280 lines
- Flag: DIVERGENT (matches committed version)
- Diff vs `4a4eade0` is small (mostly prose-level tightening, same structural skeleton)
- Calibration findings list is empty or minor

**Calibration with minor findings (likely):**
- New draft lands at target length but with 1-3 small structural differences
- 1-3 calibration findings in the report -- specific skill steps where the rules were ambiguous
- We patch the skill on those exact ambiguities, possibly recalibrate

**Calibration failure (unlikely but possible):**
- New `skybox.md` lands <100 or >180 lines
- Wrong flag, missing scope sections, generic prose, or invented structure
- Skill isn't self-contained yet -- more iteration needed before fan-out

## After calibration returns

The orchestrator terminal (this one) handles next steps:

1. **Compare** new draft to `4a4eade0`'s version via `git diff`.
2. **Decide**: commit the new draft (replacing the current), keep the existing, or `git restore` the new and patch the skill before re-running.
3. **If calibration is clean**: asset-notes bucket is ready for Phase 3 fan-out planning. Add skybox row to `README.md` "Current notes" table at the same commit.
4. **If calibration has findings**: patch the skill on the specific findings, possibly recalibrate with a second fresh terminal.

## Why fresh terminal matters here

The orchestrator terminal (where this handoff was written) has hours of context about skybox, FTE three-mode dispatch, the static-array enumeration pattern, the scope discipline debates. A cached terminal running the skill would unconsciously apply that context -- producing output that looks clean but actually depends on orchestrator memory rather than the skill's own rules.

Fresh terminal has none of that. It loads the skill cold, reads the seed and source, and produces output based purely on what the skill says. If the output is good, the skill is self-contained. If the output drifts, the skill needs more codification before fan-out.

This is the only honest signal we have before committing to a 19-slug fan-out.
