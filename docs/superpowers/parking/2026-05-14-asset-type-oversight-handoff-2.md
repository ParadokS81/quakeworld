# Handoff: asset-type-curate oversight (continuation -- fresh terminal #2)

**Type:** fresh-terminal handoff (oversight role -- not a runner)
**Dispatched:** 2026-05-14
**Predecessor:** oversight session #1 (this session). Shipped commit `b0b736be` (vocab audit closure + seed annotations + refinement arc reorg). Original first oversight handoff at `2026-05-14-asset-type-oversight-handoff.md` (now obsolete -- the work it framed is done).

You're picking up the **oversight role** for the asset-type-curate workstream in its second oversight session. Session #1 closed the L1 vocabulary alignment audit and reorganized the L1 extractor refinement arc into 4 fix-shape categories. Session #1 retired at ~320k context with the next worker dispatch (Phase A) already drafted.

---

## Prompt to paste

```
You are taking over asset-type-curate oversight in continuation mode.
Session #1 (2026-05-14) shipped commit b0b736be: closed the L1 vocab
alignment audit, applied 5 seed YAML annotations, applied 2 user-
global skill patches, reorganized the L1 extractor refinement arc
into 4 fix-shape categories (17 entries total). Phase A worker
handoff already drafted at:

  docs/superpowers/parking/2026-05-14-handoff-l1-refinement-phase-a-worker.md

Working dir: /home/paradoks/projects/quakeworld

Your role:
- Dispatch the Phase A worker (handoff doc already paste-ready).
- Evaluate the worker's halt summary when it returns. Verify diff
  expectations, source-ground any decision they made (especially the
  FTE 5-case tier-fix vs per-site choice), check the spot-check
  output against affected slugs.
- If clean: commit Phase A as a single commit. If unclean: revise
  with the worker still loaded OR send them back.
- Then draft Phase B worker handoff (write-path leakage -- regex
  narrow vs branch drop architectural decision) and dispatch.
- After Phase B: draft + dispatch Phase C worker handoff (FTE
  charset watchlist gap; 3 functions to add to LOADER_FUNCTIONS).
- After refinement arc closes (all 3 phases shipped): proceed to
  Step 4 (re-walk skybox validation -- most-patched shape; compare
  cold-walk against shipped skybox.md to confirm patches changed
  behavior cleanly).
- Then Step 5 (concept-note partners: hud-configuration first, then
  map-selection-workflow; standard Path 2 authoring per
  apps/qw-oracle/curated/concept-notes/OPERATIONS.md Section 2).
- Then Step 6: evaluate state, decide whether to dispatch a small
  next batch (2-3 slugs max from Phase 3 fan-out queue, not all 16).

You did NOT run the skill yourself in session #1 -- it was dispatched
to fresh-terminal workers. Same pattern here.

Start by reading the artifacts below to load cold context. Then
review the Phase A handoff prompt and dispatch when ready.

DO NOT run the asset-type-curate skill in this terminal. Your
context window is for oversight; workers handle execution.
```

---

## Where things stand right now

**Commits landed (this workstream, 2026-05-14):**
- `3d2a1867` -- skybox post-audit re-run
- `03449c65` -- charset / hud_element / map Round 3 slices
- `45617006` -- Round 3 seed corrections + OPERATIONS Section 6 (companion typology)
- `ff76967b` -- 4 side-quest handovers
- `430be56e` -- session #1 oversight handoff
- `b0b736be` -- **THIS SESSION**: vocab audit closure + seed annotations + refinement arc reorg

**Calibrated and shipped (5 of 21 asset_types):** player_skin / skybox / charset / hud_element / map.

**Open side-quests (3, was 4 before vocab audit closed):**
1. L1 extractor refinement arc (`2026-05-14-l1-extractor-refinement-arc.md`) -- **NEXT EXECUTION**; 17 entries across 4 categories; phased dispatch A/B/C
2. Phase 3 fan-out (`2026-05-14-asset-type-phase-3-fanout.md`) -- 16 remaining slugs; deferred per operator preference ("no rushing to run 16")
3. Concept-note partner authoring (`2026-05-14-concept-note-partners-authoring.md`) -- 2 partners earned (hud-configuration + map-selection-workflow); deferred until after L1 refinement closes

**Closed in this session (no longer queued):**
- L1 vocabulary alignment audit -- decision doc at `docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md` (370 lines); arc parking doc deleted

**Skill patches (user-global, outside this repo):**
- `~/.claude/skills/asset-type-curate/SKILL.md` -- boundary-inclusive doc-currency phrasing
- `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md` -- new "Triage heuristics for vocabulary-alignment audits" section (NF4 + layered-vocabulary heuristic)
- Plus 9 patches from session #1's predecessor (already documented in the earlier oversight handoff)

---

## Reads required (in priority order)

1. **`docs/superpowers/parking/2026-05-14-handoff-l1-refinement-phase-a-worker.md`** -- the Phase A dispatch you'll send first. Pre-drafted, paste-ready.

2. **`docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md`** -- the full punch list (4 categories, 17 entries). Read after the Phase A handoff so you know what Phase B + C will cover.

3. **`docs/superpowers/specs/2026-05-14-l1-vocabulary-alignment-decisions.md`** -- the vocab audit worker's decision doc. Grounds Category 2's "new internal categories not null" routing and NF1 (hud_element is already aligned with the L1 entity-type vocabulary).

4. **`HANDOVER.md`** (root) -- "Recently opened (this session)" + "Ongoing arcs" sections for current state.

5. **`apps/qw-oracle/curated/asset-notes/README.md`** -- the bucket overview + shipped notes table (5 entries).

6. **`apps/qw-oracle/curated/asset-notes/OPERATIONS.md`** -- stewardship playbook, especially Section 6 (companion typology) and Section 5 (L1-GAP handling).

7. **The 4 Round 3 investigation reports** (read selectively when reviewing Phase A worker output): `apps/qw-oracle/docs/asset-curation/{skybox,charset,hud_element,map}-investigation.md`.

8. **The 4 shipped asset-notes** (read selectively if doubts arise on slug-level shifts): `apps/qw-oracle/curated/asset-notes/{charset,hud_element,map,player_skin,skybox}.md`.

9. **Skill files** (read only when actively dispatching a worker that runs the skill, e.g., Step 4 re-walk):
   - `~/.claude/skills/asset-type-curate/SKILL.md`
   - `~/.claude/skills/asset-type-curate/references/status-flag-rubric.md`

---

## Critical rules

### From session #1 + the predecessor's 9 user-global skill patches

These are baked into the user-global skill via patches A-J + the new NF4 / layered-vocabulary additions. Watch for them when reviewing returns:

- **Adjacency-cutoff rule for `related_entities`** (asset-note-template.md): in = same source file + affects asset behavior; out = different file, no direct effect.
- **L1-CAT-AMBIGUOUS named enrichment pattern** (status-flag-rubric.md): not a flag -- an embedded finding. Routes to L1 extractor refinement arc.
- **Seed flat-list -> per-engine-keys translation** (asset-note-template.md): asset-note frontmatter always uses per-engine keys regardless of seed shape.
- **Cross-engine section inclusion rule**: include whenever engine surface is asymmetric (divergent OR one-engine-absent); skip only when identical (rare).
- **Step 1 pre-flight expansion** (SKILL.md): zero-results-on-slug-name jq retry uses `l1_hint_bare_categories` from seed before flagging L1-GAP.
- **Bulk-L1 selection rule** (asset-note-template.md): when L1 sites > ~20, apply one-per-distinct-enclosing-function rule, cap 8-12 entries.
- **Procedural-family scope** (asset-note-template.md): when cvar family is engine-registered dynamically, list registration commands + system-level cvars, NOT per-element dynamic properties.
- **Companion typology** (OPERATIONS.md Section 6): trigger companion (engine-coupled, use the field) vs co-installed companion (corpus convention, prose-only).
- **Boundary-inclusive doc-currency phrasing** (SKILL.md, ADDED in this session): "Pages last-edited on or before 2022-11-21 (boundary-inclusive)".
- **NF4 corpus-absence heuristic** (status-flag-rubric.md, ADDED in this session): absence of a gfx.quakeworld.nu corpus_categories entry is strong evidence that an L1-only category is engine-internal.
- **Layered vocabulary** (status-flag-rubric.md, ADDED in this session): seed slugs (user-facing asset_types) and asset_category bucket labels (engine-internal load buckets) live at different L1 layers; do not force-align.

### From the vocab audit closure

- **Option C across the board** for the 4 mismatch cases (hud_element / player_skin / wad_file / model_q1). Seed slugs are KEPT; bridge via `l1_hint_bare_categories` is the artifact. Worker output that proposes renames is wrong.
- **New internal asset_category labels** for the 4 console sites: `fte:asset_category:inline_chat_url` (Con_DrawConsoleLines) and `fte:asset_category:console_window_ui` (Con_DrawConsole). NOT folded into seed `conback`. NOT null.
- **L1-only intentional categories** (`shader` / `quakec_progs` / `sprite`): no seed slugs. NF4 heuristic justifies.
- **Write-path leakage** (screenshot + log) is an extractor architecture concern, not a seed/vocab concern. Goes to Phase B.

### Operator preferences (from session #1 + earlier)

- **Plain English, decisive, ASCII-only.** Avoid emojis and waffly framing.
- **Terse and decisive over thorough and waffly** -- match the operator's communication tempo.
- **No deferring easy fixes.** Evaluate each finding on cost-to-fix (<20 min + no workflow conflict -> do it inline). Don't blanket-label "low priority" without per-finding cost analysis. (Memory: `feedback_dont_defer_easy_fixes.md` in the user's memory dir.)
- **Discussion vs selector boxes.** When the operator signals "let's discuss" / "I'm not sure", drop AskUserQuestion selectors and engage in prose. Reserve selectors for clean discrete picks. (Memory: `feedback_discussion_vs_selector.md`.)
- **Thorough not rushed.** Methodical closure work; review each phase before next dispatch. The operator hates skipped steps.
- **One question at a time during Q&A.** Avoid multi-question prompts.
- **Trust operator pace estimates.**

---

## First three actions

1. **Read the Phase A handoff** (`2026-05-14-handoff-l1-refinement-phase-a-worker.md`). It is paste-ready. Skim the prompt section so you understand what the worker is doing.

2. **Read the refinement arc parking doc** (`2026-05-14-l1-extractor-refinement-arc.md`) so you have the full Phase B + C scope loaded for after Phase A returns. Pay attention to Category 3 (write-path leakage architectural decision -- this is the load-bearing call for Phase B).

3. **Dispatch the Phase A worker.** Open a fresh terminal in the working dir, paste the prompt section. Then wait. Worker returns ~1-1.5 hours with a halt summary.

(After return: review against the expectations laid out in the Phase A handoff's "What oversight will check on return" section. If clean, commit and proceed to Phase B drafting. If unclean, work with the worker to revise.)

---

## When in doubt

- **Trust the committed state, not session memory.** Commits 3d2a1867 + 03449c65 + 45617006 + ff76967b + 430be56e + b0b736be are ground truth. Skill patches are in user-global skill files. Worker decision docs are in `docs/superpowers/specs/`.
- **Don't run the skill in this terminal.** Oversight = dispatch + review.
- **Phase A worker has one judgment call: FTE 5-case tier-fix vs per-site overrides.** Either is defensible; the source reading is what decides. If the worker's choice surprises you, ask them to justify before approving.
- **The vocab audit's NF1 finding is the most load-bearing precedent in this workstream.** If a future worker proposes Option-A-style alignment, NF1 is the rebuttal: seed slugs and asset_category buckets live at different L1 layers.
- **No commits during a worker dispatch.** Wait for halt, review, then commit. The CLAUDE.md "free range" rules apply but the worker dispatch contract supersedes ("worker does not commit; oversight does").
- **Phase B (write-path leakage) is the architecturally interesting phase.** The decision is whether to narrow the regex in `ENCLOSING_FN_CATEGORY_RULES` to exclude write functions, or to drop write-side branches from the GENERIC_FS_PRIMITIVES handling entirely. The decision doc Phase 2 case 2 has the reasoning; the worker is expected to evaluate both options and choose.
- **Phase C (FTE charset watchlist gap) is the smallest phase.** ~30-60 min. Worker adds 3 functions to FTE LOADER_FUNCTIONS + routing; re-runs; verifies FTE charset L1 goes from 0 sites to ~5-10.

---

## Why fresh terminal

Session #1 loaded the full vocab audit context + did the synthesis + closed the audit + wrote the commit + drafted the Phase A handoff. That's heavy context (~320k at retirement). The 3 phases of refinement + Step 4-6 ahead would push past 430k -- decisions get blurry past 350k.

A fresh oversight terminal loads cold from disk:
- The committed state (b0b736be is the canonical snapshot of "where the substrate is")
- The Phase A handoff (paste-ready dispatch)
- The arc punch list (Phase B + C scope)
- The decision doc (semantic context)

That cold load is ~50k. Plus 3 phases of dispatch + review + commit (~70k) + Step 4-6 (~60k) = ~180k total from cold. Comfortable.

The operator preferences are documented in this handoff so a fresh terminal applies them on first response, no warm-up cycle needed.
