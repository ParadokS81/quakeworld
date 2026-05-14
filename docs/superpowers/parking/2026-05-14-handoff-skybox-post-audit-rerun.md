# Handoff: skybox calibration re-run (post-audit)

**Dispatched:** 2026-05-14
**Type:** fresh-terminal handoff (calibration test, post-audit)
**Source:** post-improvement validation after L1 audit + skill framing reframe
**Predecessor:** `2026-05-13-handoff-skybox-calibration-rerun.md` (first calibration; produced 80%-right output requiring orchestrator triage)

Second calibration pass on skybox. Three rounds of changes since the previous handoff:

1. **L1 watchlist expansion** (commit `47ea3615`): added 51 loader functions to ezQuake asset-loader-sites extractor via call-graph audit. Site count tripled (144 -> 375); skybox category went from 0 to 4 sites. The skybox loader chain is now fully visible at L1 (Sky_LoadSkyboxTextures, R_LoadSkyTexturePixels, plus FS_LoadTempFile for the `_wind.cfg` companion).

2. **L3 framing reframe** (commit `db4dfd90`): asset-note template + bucket docs reframed for LLM-feeder consumption. Body owns narrative / cross-engine philosophy / motive-intent; L1 owns exact defaults / source lines / help text. Length tiers softened to guidelines; explicit narrative-for-motive license; exhaustive related_entities mandate.

3. **Previous skybox draft cleared** (commit `ff4913ee`): `apps/qw-oracle/curated/asset-notes/skybox.md` and `apps/qw-oracle/docs/asset-curation/skybox-investigation.md` removed for clean re-run. Previous version retrievable for diff via `git show HEAD~:<path>`.

The fresh terminal opens cold, invokes the patched skill, produces a new skybox draft. Orchestrator terminal compares against the previous version (`HEAD~`) to validate whether the patched skill + expanded L1 produce a tighter, more LLM-feeder-shaped output.

---

## Prompt to paste

```
You're picking up a calibration test for the asset-type-curate skill.
Invoke the skill against the skybox slug. Produce the investigation
report and draft note per the skill's 6-step pipeline. This is the
SECOND calibration pass after substantial pipeline improvements:

1. L1 watchlist expanded from 14 to 65 loader functions via call-graph
   audit (commit 47ea3615). Skybox category went from 0 to 4 dedicated
   loader sites. The skywind _wind.cfg loader is now visible at L1 via
   FS_LoadTempFile.

2. Asset-note template + bucket docs reframed for LLM-feeder
   consumption (commit db4dfd90). Length tiers are now GUIDELINES not
   ceilings. Body owns narrative / motive-intent; L1 owns exact
   defaults via lookup_entity follow-ups. Exhaustive related_entities
   is mandatory (it's the join key to L1).

3. Previous skybox.md and skybox-investigation.md were removed (commit
   ff4913ee) for clean re-run. Skill should produce both files fresh.

Working dir: /home/paradoks/projects/quakeworld

Invoke: /asset-type-curate skybox

The skill will walk the 6-step pipeline (pre-flight / source-verify /
docs-cross-ref / corpus-mine / triage / output) and produce:
- apps/qw-oracle/docs/asset-curation/skybox-investigation.md
- apps/qw-oracle/curated/asset-notes/skybox.md

CRITICAL NOTES:

1. Both files were just removed (commit ff4913ee). Your re-run will
   create them fresh. Do NOT commit. The orchestrator handles the
   post-calibration commit decision.

2. Follow the skill exactly. Do NOT apply judgment from outside the
   skill's own rules. The point is to test whether the skill's
   discipline lands without orchestrator hand-holding.

3. Pay particular attention to the LLM-feeder framing changes:
   - related_entities is EXHAUSTIVE (every cvar/command the engine
     recognizes for this asset, including companion-file commands like
     the full skywind* family for skybox)
   - Length is shape-based GUIDELINE, not ceiling -- write what the
     territory needs
   - Narrative is welcome for motive/intent that structured data can't
     carry (mode-priority reasoning, cross-engine philosophical
     contrast)
   - Some overlap between body cvar-behavior summaries and L1 exact
     values is correct (one-hop queries resolve from body alone)

4. If the skill prompts ambiguity or you have to invent structure to
   complete a step, note it -- those are calibration findings for the
   skill itself.

5. The L1 layer now has skybox-specific loader sites. Use them in
   l1_canonical_ids; the previous draft had to compensate via prose
   because L1 was missing these.

After the skill halts with its one-line status report, paste back:

1. The skill's one-line halt-and-report line
2. wc -l output for the new skybox.md and skybox-investigation.md
3. git diff --stat HEAD~ -- apps/qw-oracle/curated/asset-notes/skybox.md \
                            apps/qw-oracle/docs/asset-curation/skybox-investigation.md
   (HEAD~ holds the previous committed version; diff shows post-audit
    delta against that baseline)
4. Calibration findings: places where the skill felt ambiguous,
   incomplete, contradictory, or where you had to invent structure.
   Be specific -- name the step and what was missing.
5. Anything in the framing changes (LLM-feeder reframe, length
   guidelines, exhaustive related_entities) that felt unclear or
   produced friction.

Do NOT commit. Do NOT push.
```

---

## Expected outcome shapes

Compared to the 2026-05-13 calibration:

**Clean post-audit calibration (ideal):**
- New `skybox.md`: 100-160 body lines (Rich tier guideline, not enforcement)
- New `skybox-investigation.md`: 247-300+ lines (uncapped)
- Flag: DIVERGENT (matches reality; FTE 3-mode dispatch + docs cover ezQuake subset only)
- `l1_canonical_ids` includes the new sky loader sites: `Sky_LoadSkyboxTextures`, `R_LoadSkyTexturePixels`, `Mod_LoadExternalSkyTexture` -- and the `FS_LoadTempFile` site inside `Skywind_Load_f` for `_wind.cfg`
- `related_entities` is exhaustive: full skywind* family (skywind, skywind_save, skywind_load, skywind_lookdir, skywind_rotate), all FTE rotation cvars + skyfog
- Diff vs previous (`HEAD~`) reflects the L1 enrichment + framing tightening
- Calibration findings list is empty or minor

**Calibration with minor findings (likely):**
- Output close to ideal with 1-3 small ambiguities
- Skill clarifies need patching on the specific findings

**Calibration regression (would need investigation):**
- New draft drops below previous quality (re-introduces the cvar-rename error from the first run, drops cvars, etc.)
- Would mean the skill patches didn't take

## After calibration returns

Orchestrator (this side) handles next steps:

1. **Diff** new draft against `git show HEAD~:apps/qw-oracle/curated/asset-notes/skybox.md` -- compare to the previous (pre-wipe) committed version to see post-audit delta.
2. **Verify L1 enrichment landed**: check that `l1_canonical_ids` now includes the new sky loader sites that weren't visible at L1 in the previous calibration.
3. **Decide**: commit the new draft (replacing the wiped version), or restore the previous + investigate why.
4. **If clean**: skybox row added back to `apps/qw-oracle/curated/asset-notes/README.md` "Current notes" table at the same commit.
5. **If clean**: bucket ready for next calibration slug (different shape from skybox -- a CONFIDENT/Simple slug like `charset` or `levelshot`, OR a SPARSE engine-internal like `palette` or `colormap`) before broader fan-out.
6. **If findings surface**: patch the skill on the specific findings, possibly recalibrate with a third fresh terminal.

## Why fresh terminal

Same reasoning as the 2026-05-13 handoff. The orchestrator terminal carries hours of context about the L1 audit, the framing reframe, the cvar-rename error from the first calibration, and the triage decisions. A cached terminal running the skill would unconsciously apply that context -- producing output that looks clean but actually depends on orchestrator memory rather than the patched skill's own rules.

Fresh terminal has none of that. It loads the skill cold, reads the post-audit L1 + the reframed template, and produces output based purely on what's codified. If the output is good, the post-audit pipeline is self-contained. If the output drifts, the codification needs more iteration before broader fan-out.
