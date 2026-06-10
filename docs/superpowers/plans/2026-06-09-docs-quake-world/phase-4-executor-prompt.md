# Phase 4 executor prompt -- docs.quake.world (file-as-prompt)

> Paste into a FRESH `claude` terminal by typing
> `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-4-executor-prompt.md`.
> EXECUTION bootstrap (not a drafter prompt). The orchestrator that dispatched you
> verifies your output against live source at the boundary -- report honest probe
> outputs (actual counts, HTTP codes, grep results), not "PASS" claims.

You are EXECUTING Phase 4 of the **docs.quake.world** arc: cross-links + source-link
completion. Three deliverables: (1) cvar->cvar within-codebase auto-linking [the
primary v1 deliverable], (2) source links for the 5 non-ezQuake codebases incl. the
F6 version-string handling, (3) the entity->guide reverse-index, BUILT but
render-SUPPRESSED in v1 (the guides portal does not exist yet). This is EXECUTION:
real TS/Vue, run pnpm/vitest/build, ship the runnable state.

Use the **arc-executor** skill as your spine: read the phase MD cold, critically
review it against decisions.md / review-findings.md BEFORE executing, execute each
task per its declared execution mode, run phase-boundary verification, halt with a
structured status report.

STOP and re-check your arc if you see Postgres migrations, category apply-scripts,
or `build-snapshot.ts` edits -- sibling/precursor arcs. Phase 4 touches ONLY the
`apps/docs-web/` subtree and READS (never writes) `apps/qw-oracle/curated/`.

Working directory: /home/paradoks/projects/quakeworld

## Reads (in order)

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-4-crosslinks.md` -- THE phase MD: 6 tasks (full content), the 10 boundary checks, the recon table. This MD was orchestrator-boundary-reviewed + revised (2 defects fixed cold before you got it -- see "Critical rules").
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- D7/D15/D19/D22 central; D7 = NO dead links; D19 = cvar links within-codebase only; D15 = logic in lib/, not components.
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- F6 (qtv/qwfwd version-string-not-SHA), F11 (grep-comment false positive).
4. The SHIPPED Phase-3 code: `apps/docs-web/lib/{source-link,anchor,browse,browse-types}.ts`, `.vitepress/theme/components/EntityCard.vue`. You EXTEND these with the MD's shipped content; do not re-derive their shapes.

## Execution discipline (read before you start)

1. **Honor the per-task execution modes (F12):**
   - Task 1 (source-link REPOS for ktx/mvdsv/qwcl + F6 omits): **inline** (full content shipped; the HTTP spot-check is verification).
   - Task 2 (browse-types.ts: DescriptionSegment/GuideRef/BrowseRow fields): **inline** (locked type additions).
   - Task 3 (`lib/cvar-link.ts` + tests): **subagent (Sonnet MAX)** -- regex/segment synthesis.
   - Task 4 (`lib/guide-index.ts` + tests): **subagent (Sonnet MAX)** -- parser + the GUIDES_PORTAL_LIVE flag.
   - Task 5 (wire into `browse.ts`): **subagent (Sonnet medium)**.
   - Task 6 (`EntityCard.vue`: segments loop + Used-in slot): **subagent (Sonnet medium)**.
   Dispatch via `superpowers:subagent-driven-development`. Any fan-out: paced, honest counts.

2. **The load-bearing boundary checks you cannot declare DONE without (green):**
   - **D7 / GUIDES_PORTAL_LIVE suppression (Check 9, CRITICAL):** the corpus is NON-EMPTY (52 notes / ~286 refs resolve to real docs entities -- verified), so the gate is what prevents dead links. `GUIDES_PORTAL_LIVE` MUST be `false`; browse.ts MUST gate via `GUIDES_PORTAL_LIVE ? buildGuideIndex() : undefined` and attach `[]` otherwise. After build, `grep -rl "/guides/" apps/docs-web/.vitepress/dist` and a "Used in:" grep MUST both be EMPTY. If ANY `/guides/` link or "Used in:" row appears in the dist, the gate was bypassed -> STOP, do not ship (that is 286 dead 404s, a D7 violation).
   - **#4 D14:** `grep -nE "ezquake|'cvar'|'command'|'macro'" .../components/Entity*.vue` -> empty (the segment `<a>` renders `seg.name`/`seg.anchor` from props, no literals).
   - **#5 D15:** `fetch(|readFileSync|.filter(|.map(|.reduce(` grep over the components -> empty (the segments `v-for` is a template loop over a pre-shaped prop, not an array-method call; keep comments free of the trigger tokens, F11).
   - **Source links (Check 6/7):** spot-check the ktx + qwcl sample URLs resolve HTTP 200; confirm qtv/qwfwd render plain `file:line` (no `<a>`, no broken link). A 404 degrades to plain text -- NEVER ship a broken link.
   - **cvar->cvar (Check 8):** on an ezQuake cvar whose description names another cvar, the name renders as an `<a href="#...">` to that row on the same page.

3. **vitest: the new suites** (`cvar-link.test.ts`, `guide-index.test.ts`) run under the existing `pnpm test`. Report the actual pass/fail counts (was 23; the MD adds the cvar-link + guide-index suites incl. the `GUIDES_PORTAL_LIVE === false` lock and the live-corpus `.size > 0` test).

## Critical rules

- **D7 is the hard gate.** The guide-index is BUILT + unit-tested (proves the wiring) but its render is SUPPRESSED in v1 via `GUIDES_PORTAL_LIVE = false`. This is by-construction, not "decide later." Do NOT flip the flag, do NOT render Used-in links. The future guides-portal arc flips it.
- **cvar->cvar styling is in-scope** (the spec's green-dotted signal: `text-primary underline decoration-dotted`). That is NOT the deferred F14 visual-polish pass -- it is the functional link affordance. Do NOT do any other theme/spacing/include-list work (F14 is a separate pre-deploy pass the orchestrator owns).
- If a cvar-link or guide-index need forces a per-codebase branch INSIDE a component, that is a D14 design problem -- escalate to the orchestrator, do NOT fork a component.
- ASCII only. Scope is Phase 4 ONLY: NO Phase 5 deploy config; NO daisyUI/theme polish.
- **Concurrent session:** a second Claude session is writing `apps/qw-oracle/curated/` (the L3 arc). You only READ it. Commit EXPLICIT `apps/docs-web/` paths via `git add <paths>`; run `git diff --cached --stat` before every commit (shared tree); commit to `main` directly.

## Boundary + halt

Run ALL boundary checks in the MD's "Verification" section (Checks 1-10), including the
dev-server runnable-state checks (cvar link clicks scroll to the row; qtv source is plain
text; NO "Used in" anywhere). Commit to `main` when green. Then HALT with the arc-executor
structured report: status (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED), the ACTUAL
probe outputs (tsc exit; vitest counts; build exit + route count; the #4/#5 grep results; the
Check-9 `/guides/` + "Used in:" dist greps -- MUST be empty; the ktx/qwcl HTTP codes; the D20
isolation `git status --short`), any concerns, and what Phase 5 inherits. Do NOT proceed to
Phase 5. The OPERATOR runs a live floor-check after you halt (the orchestrator coordinates it).
