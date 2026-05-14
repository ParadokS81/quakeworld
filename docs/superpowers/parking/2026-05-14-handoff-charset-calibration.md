# Handoff: charset calibration (Round 3 -- Brief-tier discipline)

**Dispatched:** 2026-05-14
**Type:** fresh-terminal handoff (calibration test, Round 3)
**Source:** post-skybox-saturation; branching to a different-shape slug to surface untested skill gaps
**Predecessor:** `docs/superpowers/parking/2026-05-14-handoff-skybox-post-audit-rerun.md` (skybox slice COMMITTED at `3d2a1867`)

Round 3 of asset-type-curate calibration. Skybox has been calibrated twice (DIVERGENT, Rich tier, multi-engine multi-mechanism) and is information-saturated. This handoff dispatches a Brief-tier test against the `charset` slug to find out:

1. **Does the LLM-feeder reframe (commit `db4dfd90`) push every slug toward Rich tier**, or does the skill correctly restrain to Brief tier when territory doesn't need depth?
2. **Does the CONFIDENT flag flow work cold** -- skybox tested DIVERGENT; we don't have a fresh-terminal CONFIDENT result yet from the post-reframe skill.
3. **What does an "empty Cross-engine differences" section look like** when FTE has no parallel category? (charset has 11 ezQuake L1 sites and 0 FTE sites.)

Post-audit L1 snapshot for `charset`:

| Engine | L1 category | Sites |
|---|---|---|
| ezquake | `ezquake:asset_category:charset` | 11 |
| fte | (no charset category in L1; glyph rendering routed elsewhere) | 0 |

Likely flag: **CONFIDENT** (single-engine surface; mature; docs probably cover it). Possibly DOC-GAP if docs are silent on a real corner.

Expected body length: 30-80 lines. Anything over ~120 is a Brief-tier overflow signal worth flagging.

---

## Prompt to paste

```
You're picking up a calibration test for the asset-type-curate skill.
Invoke /asset-type-curate charset. This is Round 3 of the post-audit
calibration sequence; player_skin and skybox already shipped.

Working dir: /home/paradoks/projects/quakeworld

Invoke: /asset-type-curate charset

CRITICAL NOTES:

1. Files apps/qw-oracle/curated/asset-notes/charset.md and
   apps/qw-oracle/docs/asset-curation/charset-investigation.md are
   expected to be new (untracked). Do NOT commit -- the orchestrator
   handles post-calibration commit decisions.

2. Follow the skill exactly. Do NOT apply judgment from outside the
   skill's own rules. The point is to test whether the skill's
   discipline lands cold without orchestrator hand-holding.

3. Charset-specific watch-outs:
   - This is most likely a Brief-tier slug (CONFIDENT flag, single-
     engine surface, mature docs). The LLM-feeder reframe softened
     length tiers to GUIDELINES, not ceilings -- but the reframe was
     about not capping Rich-tier territory, not about expanding every
     slug to Rich. If your draft lands at 200+ body lines, that's
     worth noting as a potential reframe-over-correction signal.
   - FTE has no `charset` category in L1. The "Cross-engine
     differences" section guideline says "skip otherwise" when there
     is no divergence -- but the template doesn't say what to do
     when one engine has the category and the other simply doesn't
     surface it. Flag the ambiguity if you hit it.
   - related_entities is exhaustive on the ezQuake side; what's the
     correct shape when FTE has no parallel cvars/commands?

After the skill halts with its one-line status report, paste back:

1. The skill's one-line halt-and-report line
2. wc -l for the new charset.md and charset-investigation.md
3. git status --short -- apps/qw-oracle/curated/asset-notes/charset.md \
                          apps/qw-oracle/docs/asset-curation/charset-investigation.md
4. Calibration findings: places where the skill felt ambiguous,
   incomplete, contradictory, or where you had to invent structure.
   Be specific -- name the step and what was missing.
5. Anything in the framing changes (LLM-feeder reframe, length
   guidelines, exhaustive related_entities) that produced friction
   for this slug shape -- especially: does the reframe push you
   toward Rich tier when Brief would fit?

Do NOT commit. Do NOT push.
```

---

## What the orchestrator is watching for

- **Body length.** Brief tier guideline is 30-80 lines. Over ~120 = reframe-over-correction signal. At 30-50 = healthy restraint.
- **Flag.** CONFIDENT is the expected. DOC-GAP if the docs page omits something source covers. DIVERGENT would be surprising for charset.
- **Cross-engine differences section.** Present-but-empty vs absent vs "ezQuake-only" wording -- which did the skill produce when one engine has no parallel category? This is the unambiguous-asymmetry shape that skybox didn't test (skybox had divergence on both sides).
- **related_entities scope.** Likely something like `gl_consolefont`, `gl_smoothfont`, maybe charset-related console-text cvars. If the runner debates whether to include adjacency (e.g., `scr_conalpha`), that surfaces the same Finding #1 from skybox -- consistent signal across slugs means the adjacency-cutoff patch is high-value.
- **Calibration findings.** Specifically watching for: chunk-first not relevant at this length; length-guideline drift; "what to do when FTE has no parallel" ambiguity.

## Why this slug

Charset is the closest-to-pure Brief tier slug in the seed: single engine surface, single file format, single mechanism, mature docs, no community-corpus distribution shape to triangulate. If the skill produces a tight Brief-tier note, the reframe is balanced. If it overflows to Rich tier, the reframe pushed too hard.

## Why fresh terminal

Same reasoning as the skybox handoffs. The orchestrator carries hours of context about previous calibrations and skill patches; a cached terminal would unconsciously fill skill gaps. Fresh terminal loads the skill cold and tests whether the codification is self-sufficient at a lower-capability tier (Sonnet 4.6 default).
