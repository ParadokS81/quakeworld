# Phase 3 executor prompt -- docs.quake.world (file-as-prompt)

> Paste into a FRESH `claude` terminal by typing
> `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-3-executor-prompt.md`.
> EXECUTION bootstrap (not a drafter prompt). The orchestrator that dispatched you
> verifies your output against live source at the boundary -- report honest probe
> outputs, not "PASS" claims.

You are EXECUTING Phase 3 of the **docs.quake.world** arc. Phase 3 is LIGHT: the
5-codebase fan-out is ALREADY structurally shipped by 2b's codebase-generic loaders
(the build emits all 28 routes today -- F13). So Phase 3 = (1) confirm graceful
degradation across the 5 non-ezQuake codebases holds, and (2) a thin display-name /
ASCII polish pass. There is NO synthesis here -- every code edit ships as FULL
content in the phase MD. Apply it; do not re-architect.

Use the **arc-executor** skill as your spine: read the phase MD cold, critically
review it against decisions.md / review-findings.md BEFORE executing, execute each
task per its declared execution mode (all `inline` here), run phase-boundary
verification, halt with a structured status report.

STOP and re-check your arc if you see Postgres, category apply-scripts, or
`build-snapshot.ts` edits -- sibling/precursor arcs. Phase 3 touches ONLY the
`apps/docs-web/` subtree.

Working directory: /home/paradoks/projects/quakeworld

## Reads (in order)

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-3-fanout.md` -- THE phase MD: the degradation matrix, the 3 tasks (full content), the 7 boundary checks.
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- D2 / D11 / D14 / D15 / D17 central (D14: no per-codebase component branch; D15: derivation in `lib/`, not components).
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- F13 (why this phase is light), F5/F7 (graceful degradation), F11 (grep-comment false positive).
4. The SHIPPED 2b code (`a160688a`..`f2f167b7`): `apps/docs-web/lib/{browse,browse-types}.ts`, `.vitepress/theme/codebases.data.ts`, `.vitepress/theme/components/{EntityBrowse,EntityCard,CodebaseLanding,CodebaseGrid}.vue`. You EXTEND these with the shipped edits; do not re-derive their shapes.

## Execution discipline (read before you start)

1. **All three tasks are `inline` (F12: locked content is inline, not subagent).** The
   MD ships the full `codebase-label.ts`, the exact contract additions, and the exact
   component edits. Transcribe them. Do NOT dispatch synthesis subagents -- there is no
   synthesis. This is the opposite posture from 2b (which WAS synthesis).

2. **Task 1 is verification, not code.** The orchestrator already ran the cold STATIC
   degradation checks (recorded in the MD as `[x]`). Your job for Task 1: AFTER applying
   Tasks 2-3 and rebuilding, re-confirm those static checks still hold (the display-name
   change must not perturb the Type/Default columns, the toggle gating, or the scope
   path). The LIVE click-through (the `[ ]` item) is the OPERATOR's floor-check on the
   dev server -- do NOT claim it; leave it for the operator.

3. **The load-bearing boundary checks you cannot declare DONE without (green):**
   - **#5 (D14):** `grep -nE "ezquake|'cvar'|'command'|'macro'" .../components/Entity*.vue`
     -> MUST stay empty. The display-name change flows via the contract (`displayName`);
     if you find yourself typing a codebase slug into a component, STOP -- that is a D14
     violation. Resolve the label in `lib/codebase-label.ts` + the contract instead.
   - **#6 (D15):** the array/fetch-derivation grep on the 4 touched components -> empty
     (keep comments free of the literal trigger tokens, F11).
   - **#4 (ASCII):** `grep -rn "&mdash;" apps/docs-web/.vitepress` -> nothing.

## Orchestrator augmentations (execution-time notes)

A. **`displayName` goes in BOTH contract interfaces.** `BrowseData` AND
   `CodebaseLandingData` (in `browse-types.ts`) AND the local `CodebaseSummary` in
   `codebases.data.ts`. Adding it to only one is the most likely tsc failure (Recovery
   in the MD). After the edit, `tsc --noEmit` must exit 0.

B. **`href` stays the slug.** In `CodebaseGrid.vue` and the landing links, only the
   visible TEXT changes to `displayName`; every `:href` stays `/${...codebase}` (the
   slug). A friendly name in an href would 404. Boundary #3 checks this.

C. **The `&mdash;` is ONLY the values separator** (`EntityCard.vue` ~line 74). Leave
   `&rarr;` (the version-walk arrow) and `&middot;` (separators) -- they are not dashes
   and the operator's discipline is dash-specific. Do not over-swap.

D. **`docs:build` already emits all 6 codebases.** If after your edits a non-ezQuake
   page errors or a column/field renders wrong, that is NOT a Phase-3 wiring task -- if
   the fix needs component code it is a D14 gap in 2b: escalate to the orchestrator and
   recommend a `decisions.md` amendment. Do NOT fork or branch a component.

## Boundary + halt

Run ALL SEVEN phase-boundary checks in the MD's "Verification" section. Commit your
work to `main` directly when they pass (no branch ceremony; additive subtree). Then
HALT with the arc-executor structured report: status (DONE / DONE_WITH_CONCERNS /
NEEDS_CONTEXT / BLOCKED), the ACTUAL probe outputs (tsc exit; vitest pass/fail counts
-- still 23/23; build exit + route count; the #5/#6 grep results; the `&mdash;` grep;
a confirmation that /ezquake reads "ezQuake" and /ktx reads "KTX" and a non-ezQuake
page still drops the Type column; the D20 isolation `git status --short`), any
concerns, and an explicit note that the OPERATOR live click-through (Task 1's `[ ]`
item) is still pending. Do NOT proceed to Phase 4.

## Critical rules

- ASCII only. Scope is Phase 3 ONLY (verify the 5 non-ezQuake codebases + the display
  polish): NO cvar->cvar links / "Used in" reverse-index / non-ezQuake source links
  (Phase 4); NO deploy config (Phase 5). The "Used in" slot still renders NOTHING.
- If any verification defect needs NEW component code, that is a D14 design gap --
  escalate to the orchestrator, do NOT fork a component.
- Operator works at intent level; you are the technical executor. One question at a
  time if you must ask; plain-English consequences. Momentum over ceremony.
