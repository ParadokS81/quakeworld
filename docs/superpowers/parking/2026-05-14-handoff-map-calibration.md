# Handoff: map calibration (Round 3 -- cross-type companion + concept-note partner)

**Dispatched:** 2026-05-14
**Type:** fresh-terminal handoff (calibration test, Round 3)
**Source:** post-skybox-saturation; branching to a different-shape slug to surface untested skill gaps
**Predecessor:** `docs/superpowers/parking/2026-05-14-handoff-skybox-post-audit-rerun.md` (skybox slice COMMITTED at `3d2a1867`)

Round 3 of asset-type-curate calibration. This handoff dispatches a cross-type-companion + partner-candidate test against the `map` slug to find out:

1. **Does the skill correctly populate `companion_asset_types`** with cross-type relationships (map_texture, map_lighting, map_entities, skybox via worldspawn.sky push)? Skybox's `_wind.cfg` tested the within-type sub-file convention; map is the first slug to test the cross-type companion convention.
2. **Does the skill produce a "Suggested concept-note partner" finding?** The asset-notes README explicitly names map as a partner candidate ("`map` may earn one for map-selection workflow"). player_skin earned one, skybox did not -- map is the borderline case the skill must judge.
3. **How does the skill handle a hub slug** -- one that other slugs (skybox, map_texture, etc.) cross-reference back to?

Post-audit L1 snapshot for `map`:

| Engine | L1 category | Sites |
|---|---|---|
| ezquake | `ezquake:asset_category:map` | 12 |
| fte | `fte:asset_category:map` | 1 |

FTE's 1 site is surprising given how central BSP is to the engine; expect either L1-categorization-questionable finding (similar to skybox's Mod_LoadExternalSkyTexture routing) or that the FTE map loader chain is mostly null-categorized in L1. Watch for this.

---

## Prompt to paste

```
You're picking up a calibration test for the asset-type-curate skill.
Invoke /asset-type-curate map. This is Round 3 of the post-audit
calibration sequence; player_skin and skybox already shipped.

Working dir: /home/paradoks/projects/quakeworld

Invoke: /asset-type-curate map

CRITICAL NOTES:

1. Files apps/qw-oracle/curated/asset-notes/map.md and
   apps/qw-oracle/docs/asset-curation/map-investigation.md are
   expected to be new (untracked). Do NOT commit -- the orchestrator
   handles post-calibration commit decisions.

2. Follow the skill exactly. Do NOT apply judgment from outside the
   skill's own rules. The point is to test whether the skill's
   discipline lands cold without orchestrator hand-holding.

3. map-specific watch-outs:
   - This is a HUB slug. Other slugs (skybox, map_texture, map_entities,
     map_lighting) cross-reference back to map; map is the BSP that
     pushes worldspawn keys (sky, fog, etc.) into client cvars. The
     companion_asset_types field is non-empty for the first time
     (skybox's was []). Watch for: does the skill correctly identify
     the cross-type companions, or does it leave the field empty?
   - The asset-notes/README.md ("Concept-note partners" section)
     explicitly names map as a partner-candidate. The skill's output
     should include a "## Suggested concept-note partner" finding.
     player_skin earned a partner; skybox did not. Map is the
     borderline. Does the skill's earn-the-partner heuristic land?
   - FTE has only 1 L1 site categorized as map (vs 12 on ezQuake).
     BSP loading is core to FTE -- this is almost certainly an L1
     categorization gap. If you hit it, route it as an L1 extractor
     follow-up (same shape as skybox's Mod_LoadExternalSkyTexture
     routing question).
   - Map is the most central asset_type. Length will likely be Rich
     tier; that's fine per the reframe.

After the skill halts with its one-line status report, paste back:

1. The skill's one-line halt-and-report line
2. wc -l for the new map.md and map-investigation.md
3. git status --short -- apps/qw-oracle/curated/asset-notes/map.md \
                          apps/qw-oracle/docs/asset-curation/map-investigation.md
4. Calibration findings: places where the skill felt ambiguous,
   incomplete, contradictory, or where you had to invent structure.
   Be specific -- name the step and what was missing. SPECIFICALLY:
   - How did you determine which slugs go in companion_asset_types?
     Was the template's guidance clear, or did you have to invent
     scope?
   - Did the partner-candidate heuristic land, or did you have to
     judge based on outside-skill reasoning?
   - How did you handle the ezquake-vs-fte L1 site count asymmetry
     (12 vs 1)?
5. Anything in the framing changes (LLM-feeder reframe, length
   guidelines, exhaustive related_entities) that produced friction
   for this slug shape.

Do NOT commit. Do NOT push.
```

---

## What the orchestrator is watching for

- **companion_asset_types population.** Should contain at minimum: map_texture (textures/<mapname>/), map_lighting (.lit), map_entities (.ent override). Possibly skybox (worldspawn.sky pushes into r_skyname). If the skill leaves it empty or under-populates, that's a skill gap on the cross-type companion convention.
- **Partner-candidate finding.** Should produce "## Suggested concept-note partner" with a verdict (yes/no/borderline) and rationale. README's heuristic says: "an asset_type earns a concept-note partner when its full gameplay story requires cross-domain context (other cvars, render systems, ruleset gates) beyond pure asset-loading."
- **L1 asymmetry handling.** 12 vs 1 is suspicious. Did the skill investigate, document the gap, or just report it?
- **Cross-references to skybox.** skybox.md was just committed; map.md should reference it in "Related" (worldspawn.sky push). Tests bidirectional cross-reference discipline.
- **Length and chunk-first.** Rich tier expected. Test of chunk-first answer at the most central asset_type -- can a reader who loads only the first ~30 lines answer "what is a map and how does it load" without context-switching?

## Why this slug

Map is the BSP -- the most central asset in QuakeWorld. Three calibration axes:
1. **Cross-type companion field** -- never tested; this is the first non-empty `companion_asset_types`.
2. **Partner-candidate decision** -- player_skin earned, skybox didn't, map is borderline. Tests the heuristic.
3. **Hub-slug cross-references** -- skybox's "Related" section already points back to map; map's draft must close the loop.

## Why fresh terminal

Same reasoning as the skybox handoffs. The orchestrator carries hours of context about previous calibrations and skill patches; a cached terminal would unconsciously fill skill gaps. Fresh terminal loads the skill cold. For map specifically, the partner-candidate decision is judgment-heavy -- the orchestrator KNOWS the README's partner heuristic and could pre-resolve it; a cached terminal would skip the heuristic application as a discovery and just write the verdict directly.
