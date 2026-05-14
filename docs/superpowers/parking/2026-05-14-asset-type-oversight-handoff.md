# Handoff: asset-type-curate oversight (fresh-terminal reset)

**Type:** fresh-terminal handoff (oversight role -- not a runner)
**Dispatched:** 2026-05-14
**Predecessor:** this session's commits `3d2a1867` (skybox post-audit re-run) + `03449c65` (Round 3 slices) + `45617006` (seed + OPERATIONS corrections) + `ff76967b` (4 side-quest handovers)

You're picking up the **oversight role** for the asset-type-curate workstream. The previous session calibrated the skill across 4 different slug shapes, applied 9 user-global skill patches, and queued 4 side-quest arcs. This session is NOT a calibration runner -- it's the operator's helper for evaluating side-quest progress, dispatching next-step terminals, and overseeing the remaining 16-slug fan-out.

The previous session's context is heavy (4 calibration synthesises + skill-patch drafting + commit drafting). A fresh terminal loads cold and reads the current state from disk; that's the right shape for oversight work where the source of truth is the committed history, not session memory.

---

## Prompt to paste

```
You are taking over the asset-type-curate workstream in oversight mode.
The previous session (2026-05-14) shipped Round 3 calibration (charset /
hud_element / map asset-notes) and queued 4 side-quest arcs for fresh-
terminal dispatch.

Working dir: /home/paradoks/projects/quakeworld

Your role:
- Help the operator decide which side-quest to dispatch next.
- Evaluate side-quest returns when they land (per the same review shape
  used for the 3 Round 3 calibrations).
- Help oversee the eventual Phase 3 fan-out (16 remaining asset_types).
- Synthesize findings across slices and propose skill patches when
  patterns confirm.

You did NOT run the skill yourself in the previous session -- it was
dispatched to fresh-terminal runners. You will likely do the same here.

Start by reading the four side-quest parking docs and the
asset-notes bucket README to load cold context (paths below). Then
ask the operator which side-quest they want to dispatch first.

DO NOT run the asset-type-curate skill in this terminal. Your context
window is for oversight; calibration runs go to fresh terminals via
operator paste.
```

---

## Where things stand right now

**Calibrated and shipped (5 of 21 asset_types):**

| Slug | Flag | Commit | Notes |
|---|---|---|---|
| player_skin | CONFIDENT | (earlier) | Concept-note partner shipped at `../concept-notes/player-skins.md` |
| skybox | DIVERGENT | 3d2a1867 | Multi-mechanism; companion `_wind.cfg`; no partner warranted |
| charset | CONFIDENT | 03449c65 | Brief tier; FTE has no parallel L1 category |
| hud_element | DIVERGENT | 03449c65 | Bulk-L1 (129->8); companion `wad_file`; partner WARRANTED |
| map | DOC-GAP | 03449c65 | Hub slug; 4 companions; partner WARRANTED |

**Skill state:** patched user-global at `~/.claude/skills/asset-type-curate/` with 9 fixes from Round 3 findings (see Critical rules below). The skill is production-ready for Phase 3 fan-out.

**Seed state:** corrected at `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` (commit 45617006); derived JSON regenerated.

**Bucket state:** README "Current notes" table carries 5 entries; OPERATIONS.md Section 6 carries the new companion typology subsection (trigger vs co-installed).

**Open side-quests (4):**

1. L1 extractor refinement (`2026-05-14-l1-extractor-refinement-arc.md`)
2. L1 vocabulary alignment audit (`2026-05-14-l1-vocabulary-alignment-audit.md`)
3. Phase 3 fan-out (`2026-05-14-asset-type-phase-3-fanout.md`)
4. Concept-note partner authoring (`2026-05-14-concept-note-partners-authoring.md`)

Routing entries for all 4 are in HANDOVER.md under "Recently opened (this session)".

---

## Reads required (in priority order)

1. **`HANDOVER.md`** (root) -- "Recently opened (this session)" section names the 5 new entries from 2026-05-14. Read to see what's queued.
2. **`apps/qw-oracle/curated/asset-notes/README.md`** -- bucket overview + Current notes table.
3. **`apps/qw-oracle/curated/asset-notes/OPERATIONS.md`** -- stewardship playbook including the new Section 6 companion typology subsection.
4. The 4 side-quest parking docs at `docs/superpowers/parking/2026-05-14-*.md` (l1-extractor-refinement-arc / l1-vocabulary-alignment-audit / asset-type-phase-3-fanout / concept-note-partners-authoring).
5. Optional context (only if a specific side-quest is being prepared):
   - The 3 Round 3 calibration handoff docs at `docs/superpowers/parking/2026-05-14-handoff-{charset,hud_element,map}-calibration.md`
   - The 3 Round 3 investigation reports at `apps/qw-oracle/docs/asset-curation/{charset,hud_element,map}-investigation.md`
   - The 3 Round 3 asset-notes at `apps/qw-oracle/curated/asset-notes/{charset,hud_element,map}.md`
   - The skybox pair (`skybox.md` + `skybox-investigation.md`) for reference
6. Skill files (read only when actively dispatching a Phase 3 slice):
   - `~/.claude/skills/asset-type-curate/SKILL.md`
   - `~/.claude/skills/asset-type-curate/references/{asset-note-template,status-flag-rubric,*}.md`

---

## Critical rules from the patches landed today

These 9 patches just landed user-global. They change runner behavior on subsequent dispatch. Watch for them when evaluating returns:

**A. Adjacency-cutoff rule for `related_entities`** (asset-note-template.md)
In = same source file + affects asset behavior. Out = different file, no direct effect. Tiebreaker = "would a user debugging this asset need it?"

**B. L1-CAT-AMBIGUOUS named enrichment pattern** (status-flag-rubric.md)
Not a flag -- an embedded finding. Investigation reports document under `## L1 extractor follow-up`. Three case shapes (asset-routes-to-neighbor / sibling-as-parent / generic-loader-missing-override). Routes to the L1 extractor refinement arc.

**D. Seed flat-list -> per-engine-keys translation** (asset-note-template.md)
Seed may carry `engine_canonical_paths` as flat list; asset-note frontmatter always uses per-engine keys. Flat seed list populates each loading engine unless source surfaces engine-specific deltas.

**E. Cross-engine section inclusion rule** (asset-note-template.md)
Include whenever engine surface is asymmetric (divergent OR one-engine-absent). Skip only when all engines load identically (rare).

**F+H. Step 1 pre-flight expansion** (SKILL.md)
QWCL/MVDSV produce no asset-loader-sites JSON -- read source directly, don't report as gap. Zero-results-on-slug-name jq retry uses `l1_hint_bare_categories` from seed before flagging L1-GAP. Also enumerate `reads_category_id: null` sites whose enclosing function fingerprints to the slug.

**G. Bulk-L1 selection rule** (asset-note-template.md)
When L1 sites > ~20, apply one-per-distinct-enclosing-function rule, cap 8-12 entries. Document selection in investigation report.

**I. Procedural-family scope** (asset-note-template.md)
When cvar family is engine-registered dynamically (e.g., `hud_<element>_<property>`), list registration commands + system-level cvars only, NOT per-element dynamic properties.

**J. Companion typology** (OPERATIONS.md Section 6, in qwiki repo)
Trigger companion (engine-coupled, use the field) vs co-installed companion (corpus convention, prose-only).

---

## First three actions

1. **Read HANDOVER.md "Recently opened" + the 4 side-quest parking docs.** Load the cold state.
2. **Ask the operator which side-quest they want to dispatch first.** Default recommendation: **L1 vocabulary alignment audit** -- it's the smallest (1 session, ~1-2 hours) AND it unblocks Phase 3 fan-out (every runner currently has to discover the slug/L1-cat-name mismatch cold per Patch F+H). Land it first, then Phase 3 can proceed without that friction.
3. **For whichever side-quest the operator picks, prepare the fresh-terminal dispatch.** Each parking doc is already fresh-terminal-ready; the dispatch is just opening a new terminal and pasting the relevant prompt section. You shouldn't need to do significant prep.

---

## Recommended side-quest ordering

If the operator asks for a recommendation:

1. **L1 vocabulary alignment audit** -- smallest, unblocks Phase 3.
2. **L1 extractor refinement** -- can run in parallel with #1; both touch extractor handlers but on different concerns.
3. **Phase 3 fan-out** -- after #1 (and ideally #2 too). 16 slugs in 3 waves.
4. **Concept-note partner authoring** -- can run in parallel with Phase 3 (different skill, different bucket). Hud-configuration first (smaller), then map-selection-workflow.

The Phase 3 fan-out is the big production work; everything else is preparation or follow-up to make the fan-out clean.

---

## When in doubt

- **Trust the committed state, not session memory.** The previous session's context decays; the commits 3d2a1867 + 03449c65 + 45617006 + ff76967b are the ground truth. The skill patches are in the user-global skill files at `~/.claude/skills/asset-type-curate/`.
- **Don't run the skill in this terminal.** Oversight = dispatch + review; runners go in fresh terminals.
- **The 4 Round 3 deliverables (charset / hud_element / map asset-notes + investigations) are the canonical voice + structure references.** When evaluating new runner outputs, compare against them.
- **L1-CAT-AMBIGUOUS findings are expected, not surprising.** Route them to the L1 extractor refinement arc; don't try to fix mid-review.
- **Operator preferences from earlier:** plain English, decisive, ASCII-only, one question at a time during Q&A, trust operator pace estimates, terse and decisive over thorough and waffly.
- **The reframe is balanced -- 4/4 confirmation from calibration. Don't second-guess length tiers.** Brief slugs land Brief; Rich slugs land Rich. Trust territory shape.

---

## Why fresh terminal

The previous session loaded 4 calibration runs + did the synthesis across patterns + wrote 9 skill patches + drafted 5 commits + wrote 4 side-quest handovers + wrote this handover. That's heavy context. Oversight work is structurally different: short-horizon, reactive (waiting for side-quest returns), and benefits from clean reads of the current committed state rather than memory of how we got here.

The previous session's view of "what the patches mean" is encoded in the patches themselves (read them). The view of "what to do next" is encoded in the 4 side-quest parking docs (read them). The view of "where we stand" is encoded in HANDOVER.md (read it). Everything you need is on disk.
