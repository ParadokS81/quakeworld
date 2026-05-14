# Handoff: hud_element calibration (Round 3 -- bulk-L1 + slug/L1-cat-name mismatch)

**Dispatched:** 2026-05-14
**Type:** fresh-terminal handoff (calibration test, Round 3)
**Source:** post-skybox-saturation; branching to a different-shape slug to surface untested skill gaps
**Predecessor:** `docs/superpowers/parking/2026-05-14-handoff-skybox-post-audit-rerun.md` (skybox slice COMMITTED at `3d2a1867`)

Round 3 of asset-type-curate calibration. This handoff dispatches a bulk-L1 + name-mismatch test against the `hud_element` slug to find out:

1. **How does the skill curate L1 anchors when there are 129 of them** (vs skybox's 4)? The `l1_canonical_ids` field can't reasonably hold 129 IDs; what selection rule does the skill apply, and is the rule documented in the template?
2. **Does the skill discover the seed-slug vs L1-category-name mismatch on its own?** Seed slug is `hud_element`; L1 category name (in `reads_category_id`) is `ezquake:asset_category:hud_overlay` / `fte:asset_category:hud_overlay`. The standard jq query `.reads_category_id == "ezquake:asset_category:hud_element"` returns ZERO. Does the runner re-query, look at the seed YAML for the actual category name, or halt with L1-GAP?
3. **HUD is highly engine-specific** -- expected flag DIVERGENT. Does the skill handle multi-engine bulk-L1 with the same narrative discipline that skybox produced?

Post-audit L1 snapshot for `hud_element`:

| Engine | L1 category | Sites |
|---|---|---|
| ezquake | `ezquake:asset_category:hud_overlay` (NOTE: name mismatches seed slug `hud_element`) | 129 |
| fte | `fte:asset_category:hud_overlay` (same mismatch) | 23 |

This is the BIGGEST L1 pool for any single ezQuake asset_type, more than 5x larger than the next contender. Curation rule for `l1_canonical_ids` will be load-bearing.

---

## Prompt to paste

```
You're picking up a calibration test for the asset-type-curate skill.
Invoke /asset-type-curate hud_element. This is Round 3 of the post-
audit calibration sequence; player_skin and skybox already shipped.

Working dir: /home/paradoks/projects/quakeworld

Invoke: /asset-type-curate hud_element

CRITICAL NOTES:

1. Files apps/qw-oracle/curated/asset-notes/hud_element.md and
   apps/qw-oracle/docs/asset-curation/hud_element-investigation.md
   are expected to be new (untracked). Do NOT commit -- the
   orchestrator handles post-calibration commit decisions.

2. Follow the skill exactly. Do NOT apply judgment from outside the
   skill's own rules. The point is to test whether the skill's
   discipline lands cold without orchestrator hand-holding.

3. hud_element-specific watch-outs:
   - HEADS UP on L1 category name. The seed slug is hud_element, but
     the L1 extractor's reads_category_id values use hud_overlay
     (legacy pre-rename or deliberate L1-vocabulary divergence).
     The skill's Step 1 jq query
     `.reads_category_id == "ezquake:asset_category:hud_element"`
     will return zero results. If you hit this, NOTE IT in the
     findings -- this is the calibration test, not a skill error
     for you to silently work around. Then resolve by querying the
     actual L1 category name and continue.
   - L1 has 129 ezQuake sites + 23 FTE sites for this slug. The
     template's l1_canonical_ids field is unbounded but in practice
     should be 4-8 representative anchors, not a 152-entry dump.
     If the template doesn't tell you how to select, NOTE IT and
     pick the most-representative subset (e.g., primary loader
     entry points + one-per-distinct-mechanism).
   - HUD content is highly engine-specific; DIVERGENT is the
     expected flag. The cross-engine narrative will be substantial
     (ezQuake's hud_* cvar surface is large; FTE's HUD model
     differs). Length will be Rich tier -- that's fine per the
     reframe.

After the skill halts with its one-line status report, paste back:

1. The skill's one-line halt-and-report line
2. wc -l for the new hud_element.md and hud_element-investigation.md
3. git status --short -- apps/qw-oracle/curated/asset-notes/hud_element.md \
                          apps/qw-oracle/docs/asset-curation/hud_element-investigation.md
4. Calibration findings: places where the skill felt ambiguous,
   incomplete, contradictory, or where you had to invent structure.
   Be specific -- name the step and what was missing. SPECIFICALLY:
   - How did you handle the slug/L1-category-name mismatch?
   - What selection rule did you apply to curate 129 sites into
     l1_canonical_ids? Did the template tell you, or did you invent
     a rule?
5. Anything in the framing changes (LLM-feeder reframe, length
   guidelines, exhaustive related_entities) that produced friction
   for this slug shape -- especially: when "exhaustive" applies to
   the cvar surface of a slug with 100+ related cvars/commands,
   what's the right scope?

Do NOT commit. Do NOT push.
```

---

## What the orchestrator is watching for

- **Slug/L1-category-name mismatch discovery.** Did the runner hit the zero-results jq query, then resolve by querying the actual category? Or did they halt with L1-GAP? Or silently substitute without flagging? This is a real skill gap if not codified in the template's Step 1.
- **l1_canonical_ids curation rule.** 129 -> N. What's N? What's the rule? Did the runner invent one (top-by-trigger, top-by-enclosing-function, primary entry points only) or did the template hand it over? If invented, that's a skill patch opportunity.
- **related_entities scope at scale.** ezQuake's HUD cvar surface is dozens of `hud_*` and `scr_*` cvars. Does "exhaustive" mean "all 50+" or "load-bearing subset"? Same adjacency-cutoff question as skybox Finding #1 but at much higher scale.
- **Cross-engine narrative.** FTE's HUD model is fundamentally different (CSQC-based, configurable per-game). Skybox produced clean cross-engine narrative; hud_element is the next test of that pattern at higher cross-engine divergence.
- **Body length.** Rich tier; over 300 lines is fine. Watch for whether the chunk-first answer (first ~30 lines) still works when there's so much engine-specific surface.

## Why this slug

Three calibration axes in one slug:
1. **Bulk-L1 curation rule** -- never tested. 129 sites can't all live in `l1_canonical_ids`; rule must exist (explicit or invented).
2. **Slug/L1-cat-name mismatch** -- never tested. Bridges the gap between seed vocabulary and extractor vocabulary; if not codified, every future slug with a name-shift hits this same dead-end query.
3. **Wide cross-engine divergence** -- skybox tested medium divergence (3 modes vs 1). HUD is much wider; tests the narrative discipline at higher complexity.

## Why fresh terminal

Same reasoning as the skybox handoffs. The orchestrator carries hours of context about previous calibrations and skill patches; a cached terminal would unconsciously fill skill gaps. Fresh terminal loads the skill cold. The slug/L1-name mismatch is especially important to test cold -- the orchestrator KNOWS about the mismatch (just learned from the L1 category audit); a cached terminal would auto-resolve it without surfacing the discovery as a finding.
