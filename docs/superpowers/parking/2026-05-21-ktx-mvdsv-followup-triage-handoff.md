# KTX/MVDSV follow-up triage + close-out planning -- fresh-terminal handoff

**Date:** 2026-05-21
**Status:** Triage exercise (planning, not execution).
**Mode:** Fresh terminal, COLD reads only -- this doc names what to read; do not skip the primary-source reads.

## What this is

KTX L1 format-unify just shipped (2026-05-21, tag `arc-ktx-format-unify-shipped`). The broader KTX/MVDSV describe-fill arc still has:

- A symmetric MVDSV side (mirror of what we just did for KTX), and
- 5 named follow-ups queued in HANDOVER + small-followups, and
- An open question about how to **visualize the KTX L1 we just built** for human consumption (qwiki wiki page vs single-page HTML vs other paths).

The operator's framing today: "mental capacity is limited -- different projects, several side-arcs, follow-ups piling up in HANDOVER, hard to track. Help organize -- don't expand scope."

**Your job:** Read the queued items cold, propose a prioritized sequence to close the KTX/MVDSV chapter cleanly, and recommend a visualization first-step. **Do NOT execute any of the items.** Output a plain-English recommendation the operator can react to in a follow-up turn.

## Reads required (in this order)

1. `HANDOVER.md` (full docket -- skim then focus on Small followups + Future arcs + Ongoing arcs touching describe-fill / qw-oracle / qwiki).
2. `apps/qw-oracle/docs/arc-history.md` -- top two entries (KTX format-unify SHIPPED 2026-05-21; enforce-L1-runtime-truth SHIPPED 2026-05-17 -- context for the cross-arc landscape).
3. `docs/superpowers/plans/2026-05-21-ktx-l1-format-unify.md` -- what just shipped and the mechanism that closed.
4. `docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/decisions.md` -- D20 (template lock, 2026-05-21 Session #9) + D21 (format-unify SHIPPED, 2026-05-21 Session #10). These are the locked editorial discipline.

## The five queued follow-ups

Each item below: name, trigger source, sized estimate, and the open question for you.

### 1. L3 concept note "QW team-chat visibility across the stack"

- **Source:** HANDOVER.md Small followups (surfaced Session #9 during KTX describe-fill).
- **What it is:** A Layer 3 concept note synthesising KTX `k_spectalk` + `k_sayteam_to_spec` + MVDSV `sv_user.c:1890-1900` spec-filter + ezQuake `cl_fakename` / `TP_ShortNick` + fteqtv MVD dem_multiple relay into one user-facing wiki-style explainer. Several L1 descriptions already point at it via `See also: qw-team-chat-visibility` (the slug exists in DB even though the note doesn't yet).
- **Path:** `apps/qw-oracle/curated/concept-notes/qw-team-chat-visibility.md`.
- **Size:** ~30-45 min in a fresh terminal (the audit trail is already in the git history -- commits `2ac11298` + `a8ce9345`).
- **Dependency:** None.
- **Question for you:** Should this run BEFORE MVDSV describe-fill (so MVDSV-side sub-agents can point at a real concept note instead of a forward-link slug), or AFTER (so it cites both KTX + MVDSV descriptions as anchors)?

### 2. arc-reviewer post-arc walkthrough for the 96-row KTX describe-fill cohort

- **Source:** HANDOVER.md Small followups (Session #9 -- the cohort that landed shape-wrong before D20 locked).
- **What it is:** The arc-reviewer skill (a DIFFERENT skill from arc-orchestrator -- fresh terminal mandatory, cannot have run any phase) reads the spec + decisions.md + plan dir + arc-history cold, walks each spec section to verdict (DELIVERED / DELIVERED-DIFFERENT / DEFERRED / MISSING), surfaces shipped-beyond-spec items, reports open YELLOW issues, produces Arc N+1 prep recommendations.
- **Size:** One full fresh-terminal session.
- **Dependency:** Cannot run in a terminal that executed any phase. The format-unify session counts as a phase.
- **Question for you:** Original plan was "arc-reviewer for the 96-row cohort." But the broader arc is now substantially more shipped (format-unify on top, MVDSV pending). Should arc-reviewer:
  - (a) Run NOW, scoped to the KTX-only side (96-cohort + format-unify), with MVDSV deferred to a separate later review?
  - (b) Wait until MVDSV ships, then one consolidated arc-reviewer pass covers both?
  - (c) Split: a quick "KTX SHIPPED" mini-review now + a full arc-review after MVDSV?

### 3. describe-fill-synthesis skill folds (3 items)

- **Source:** HANDOVER.md Small followups (Session #9 captured 3 specific edits to the user-global skill at `~/.claude/skills/describe-fill-synthesis/`).
- **What it is:**
  - (a) Add `ENGINE-BOUNDARY-HEDGED-OK` as a valid TRACED-CLEAN-compatible verdict subclass in `references/enforce-trace-discipline.md` (per Session #8 B5 surface).
  - (b) Add "commented-out runtime check masquerading as live condition" as a 4th sub-pattern in the ELABORATION DISCIPLINE list (alongside flag-NAME inversions / callee-branch dead code / command-name pattern inversions).
  - (c) Add "no engine/code jargon in L1 description" as a QA rule (file:line refs / cf_flags / think-handler / stuffcmd / fpd bit refs belong in `description_reasoning`, never in `description`). Calibration case: Session #9's k_dmm4_gren_mode draft leaked "explosion-on-think handler" caught by operator.
- **Size:** ~20 min user-global skill edits.
- **Dependency:** None.
- **Question for you:** This is the cheapest item on the list. Recommend doing it BEFORE MVDSV describe-fill so the skill matches the discipline we just locked? Or fold it in as part of the post-arc-reviewer skill-update pass?

### 4. L1 contextual build-availability arc (parked)

- **Source:** HANDOVER.md Future arcs (parked 2026-05-20 from enforce-L1 Phase 5 slime review).
- **Parking doc:** `docs/superpowers/parking/2026-05-20-l1-contextual-build-availability-arc.md`.
- **What it is:** L1 is build-agnostic but user questions are build-specific. An oracle/LLM answering about `gl_program_sky` / `cache_print` / `addloc` today can't say "renderer-scoped / SERVERONLY / legacy alias -- may not be in your build." Two paths: (1) cheap interim oracle answer-shape hedge using existing Track-A level-2 signal + small heuristic table (sized for `writing-plans` directly); (2) proper per-build-profile arc -- explicit CMake-options modeling + renderer-dispatch-table + legacy-alias chain + per-fork client profile (multi-week, needs `arc-brainstormer`).
- **Size:** Path 1 = one session; Path 2 = multi-week.
- **Dependency:** None hard-blocking, but adjacent to MVDSV describe-fill (both are about expanding L1 quality).
- **Question for you:** Is this in scope for "close KTX/MVDSV chapter cleanly" or is it a separate arc that should NOT bundle in? My read is the latter (different mechanism, different scope), but verify against the parking doc's framing.

### 5. Cmdline-liveness sibling arc (parked from enforce-L1 F20)

- **Source:** HANDOVER.md Recently opened / arc-history enforce-L1 Phase 5 retrospective.
- **What it is:** The Class 3 cmdline-consumer-presence feeder is `.c`-only-scoped; 5 of 11 shipped Track-A entries were LIVE via `.h` macro wrappers fanning into `.c` call sites. Visible artifact corrected via `_runtime_dead_entities.py:_CLASS3_BLOCK` regen to 6 entities, but L1 mislabeling of the 5 cmdline_params persists until the parked sibling arc mechanizes the feeder with proper `.c`+`.h` scope.
- **Size:** Unknown; sibling to enforce-L1, likely arc-shaped.
- **Dependency:** None hard-blocking. Cross-codebase relevance: when MVDSV / FTE / QWCL get the same liveness treatment, they hit the same bug.
- **Question for you:** Is this in scope for "close KTX/MVDSV chapter cleanly"? My read: NO -- it's an extractor-mechanism arc, not an editorial arc. Defer to its own scoping.

## The MVDSV mirror (the big close-out candidate)

- **Source:** Implicit in the KTX/MVDSV describe-fill arc (HANDOVER Ongoing arcs entry).
- **What it is:** Apply the same D20 template + same fan-out mechanism to MVDSV L1 descriptions. The KTX side just shipped the locked playbook.
- **Scope:** Per arc-history Phase 0 baseline (2026-05-17): mvdsv has **183 cvars / 108 commands / 11 cmdline / 45 info_keys = 347 entities**. So ~half the KTX volume; should be faster.
- **What's already done for MVDSV in the parent describe-fill arc:** Phase 0 freed 28 commands (`f3b356f3`); Phase 1 spine built; D6-D19 universal. The format-unify-style rewrite to D20 template has NOT been done.
- **Playbook locked from KTX side:**
  - D20 template (decisions.md:1233-1311).
  - Apply script `apps/qw-oracle/scripts/describe-fill/apply-l1-format-unify.py` works for any project (just needs `b5-format-unify-*.md` ledgers in a target dir; can be cloned/parameterized for MVDSV).
  - Three prompt amendments shipped: voting-cvar generic-framing hedge, exact-name preservation rule, intra-engine See-also scaffolding pattern.
- **Estimated size:** Probably one full session, possibly less (smaller volume, locked playbook).
- **Question for you:** Should MVDSV be its own session, or batched with one of the small followups?

## The visualization question

The operator surfaced this explicitly: "touch in how to visualize the documentation we built for ktx via the new wiki page or just our simpler single page htmls."

Context: the KTX L1 we just shipped is **DB-resident**. Consumers today are MCP queries (`lookup_entity`, `search_entities`) and the Slipgate snapshot pipeline. **Humans cannot browse it without writing SQL.** That's a gap.

Candidate paths (read each parking doc before recommending):

1. **qwiki wiki page** -- wiki.slipgate.me just stood up Phase 1-3 in qwiki-v1-beta (`docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`). Phase 4 is taxonomy / harvest work. Long-term, KTX cvar/command catalog could live as MediaWiki pages auto-generated from L1, with Semantic MediaWiki properties making them queryable. Per-game-mode pages, per-cvar pages, etc.
2. **Single-page HTML** -- the existing `apps/qw-oracle/reviews/` directory holds per-version HTML validation reports (mentioned as grandfathered in qw-oracle/docs/CLAUDE.md). A new single-page HTML catalog could mirror that pattern but for the user-facing KTX L1 set.
3. **Interactive HTML dashboard** -- shelved arc (`docs/superpowers/parking/2026-04-XX-interactive-html-dashboard.md`); operator-flagged as "visual anchors force doc hygiene" in memory (`feedback_visual_anchors_force_hygiene`). May be the right home for this.
4. **qw-oracle showcase site** -- parked under `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md`. Spec at `docs/superpowers/specs/2026-05-01-qw-oracle-showcase-site-design.md`. This is the big-arc home for "humans browse oracle content"; KTX visualization could be a slice.
5. **Slipgate consumer** -- slipgate-app already consumes the snapshot; the ConfigViewer UI could surface the new descriptions as a side panel when a user opens a cvar. But that's a different consumer pattern (user has their cvar; needs explanation), not a catalog (user wants to discover what cvars exist).

**Question for you:** Read the four parking docs (1/2/3/4 above) and propose a first-step visualization probe. Don't pick a winning long-term path -- that's an arc-classifier conversation. Recommend ONE small, low-cost first step that gets eyeballs on the KTX L1 (e.g. "regenerate a per-version HTML catalog using the same shape as reviews/, point it at the entities table"). That gives the operator a tangible artifact to evaluate against, and informs the bigger choice later.

## What I want from your output

A single response document, plain English, structured as:

1. **Recommended sequence** -- numbered list of items to ship, in order. Include the MVDSV mirror, the 3 small followups, the L3 concept note, the arc-reviewer pass. For each item: which session it belongs to, one sentence on the rationale, rough sizing.

2. **Items I'd defer / decouple from this close-out** -- the L1 contextual build-availability arc and the cmdline-liveness sibling arc fall here unless you disagree.

3. **Visualization first-step recommendation** -- one concrete proposal (path + scope + size), with a one-line "why this first" justification.

4. **Cross-dependencies surfaced** -- any "X gates Y" or "X benefits if Y goes first" relationships I missed.

5. **Open questions for the operator** -- max 3, that would meaningfully change the sequence if answered.

**Constraint:** Don't execute any of the items. Don't dispatch sub-agents for the work itself (this is planning, not doing). Read primary sources -- don't hallucinate from memory. If a parking doc names a trigger condition that's not met yet, surface that.

## First three actions (for the fresh terminal)

1. Read this doc + HANDOVER.md (full docket scan, then focus on Small followups + Future arcs + the describe-fill Ongoing arc entry) + the top KTX format-unify retrospective in `apps/qw-oracle/docs/arc-history.md`.
2. Open each of the 5 follow-up references named above (parking docs + small-followup bodies). For #4 and #5, read the parking doc's framing closely -- the operator wants to know if these are IN or OUT of the KTX/MVDSV close-out.
3. Read the four visualization parking docs (qwiki-v1-beta plan README, interactive-html-dashboard, showcase-site spec, the existing `apps/qw-oracle/reviews/` to see the HTML-grid prior art).

## When in doubt

- **Don't add new arcs.** Triage existing ones. The operator's framing is "organize, don't expand."
- **Default to `defer`** if a follow-up has unclear trigger or unclear dependency. Better to ship 3 things this week than scope 7.
- **Operator's pace:** trust their estimates; don't apply conservative buffers (memory: `feedback_trust_operator_pace_estimates`).
- **Plain English first** at the decision points (memory: `feedback_plain_english_at_decision_points`). Save technical depth for the support sections.
- **One question at a time** if you need to ask the operator (memory: `feedback_one_question_at_a_time`).
