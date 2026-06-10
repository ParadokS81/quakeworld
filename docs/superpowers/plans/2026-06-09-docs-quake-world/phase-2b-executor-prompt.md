# Phase 2b executor prompt -- docs.quake.world (file-as-prompt)

> Paste into a FRESH `claude` terminal by typing
> `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2b-executor-prompt.md`.
> EXECUTION bootstrap (not a drafter prompt). The orchestrator that dispatched
> you verifies your output against live source at the boundary -- report honest
> probe outputs, not "PASS" claims.

You are EXECUTING Phase 2b of the **docs.quake.world** arc. Phase 2b is the
type-generic / codebase-generic browse + card renderer -- the D14/D15
architectural heart -- proven end-to-end on ezQuake's four types. It REPLACES the
Phase-2a stub at `/<codebase>/<type>` with a real filterable, inline-expanding
browse view. This is EXECUTION: you write real Vue + TS, run pnpm / vitest /
build, and ship the runnable "ezQuake renders end-to-end" state.

Use the **arc-executor** skill as your spine: read the phase MD cold, critically
review it against decisions.md / review-findings.md BEFORE executing, execute
each task per its declared execution mode, run phase-boundary verification, halt
with a structured status report.

STOP and re-check your arc if you see Postgres, category apply-scripts, or
`build-snapshot.ts` edits -- sibling/precursor arcs. Phase 2b touches ONLY the
`apps/docs-web/` subtree.

Working directory: /home/paradoks/projects/quakeworld

## Reads (in order)

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2b-ezquake-template.md` -- THE phase MD: 5 tasks, full file content / the locked contract, the 10 boundary checks.
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- D3/D4/D5/D8/D11/D14/D15/D17/D18/D22 central; note the 2026-06-10 D18 amendment (QWCL `choice`-unreachable).
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- F2/F5/F7 (graceful degradation), F10 (include-vs-usage), F11 (grep-comment FP), F12 (content-conditional exec modes).
4. The SHIPPED 2a scaffold (commit `945a3292`): `apps/docs-web/lib/{types,snapshot}.ts`, `.vitepress/theme/{index.ts,style.css,codebases.data.ts}`, the stub routes. EXTEND them; do not re-derive their shapes.

## Execution discipline (CRITICAL -- read before you start)

1. **HONOR the content-conditional execution modes (F12 -- the OPPOSITE posture from Phase 2a).** 2a legitimately ran inline because it shipped fully-locked content; 2b is SYNTHESIS:
   - Task 1 (`lib/browse-types.ts`, the locked render contract): **INLINE** (transcribe verbatim).
   - Task 2 (six pure lib modules + 2 vitest suites): **subagent (Sonnet medium)**.
   - Task 3 (build-time shaper + paths wiring): **subagent (Sonnet medium)**.
   - Task 4 (`EntityBrowse` + `EntityCard` -- the D14/D15 heart): **subagent (Opus medium). DO NOT inline this.** The isolated context IS the point -- the renderer is the win-or-lose work and must be built to the locked contract without crowding your main thread.
   - Task 5 (`CodebaseLanding` + include reconciliation): **subagent (Sonnet medium)**.
   Dispatch via `superpowers:subagent-driven-development`. Any fan-out: paced, honest counts.

2. **vitest: KEEP it** (operator-confirmed 2026-06-10), scoped to `derive` + `category` only (the two modules with non-obvious logic). The trivial modules (anchor / filter / version-walk / source-link) are covered by the build + dev checks, not unit suites.

3. **The mechanical D15/D14/F10 gates are the boundary's load-bearing checks -- you cannot declare DONE without them green:**
   - **#7 (D15 decoupling):** grep the 3 new components for `fetch(` / `readFileSync` / `.filter(` / `.map(` / `.reduce(` -> MUST be empty (including in comments -- keep component comments free of the literal tokens, F11).
   - **#8 (D14 type/codebase-generic):** grep `EntityBrowse.vue` + `EntityCard.vue` for `ezquake` / `'cvar'` / `'command'` / `'macro'` -> MUST be empty. A per-codebase/per-type literal baked into a component is a D14 FAILURE -> fix it, do not ship.
   - **#9 (F10 include-vs-usage):** every daisyUI component class the new components use is in the `include:` list in `style.css` -> 0 missing.

## Orchestrator augmentations (execution-time notes)

A. **Source links (D8, Task 2 `source-link.ts` + boundary #4).** The ezQuake `src/` prefix is VERIFIED (orchestrator confirmed `src/sv_main.c` -> HTTP 200 at the head commit). BUT some ezQuake files live in `src/` SUBDIRS; if `source_ref.file` is a bare basename for such a file, the URL 404s. When you spot-check 3 source links (#4), deliberately pick files in DIFFERENT locations (not all root-`src/` files) so the subdir edge surfaces NOW. A 404 must degrade to the plain-text `file:line` fallback (D11) -- NEVER ship a broken link. (Full per-file path resolution is Phase 4.)

B. **cvar page weight (~1.17MB in route params).** Expected and accepted for v1 (operator-confirmed). The build should handle it (it is JSON in params). If `docs:build` chokes on it OR the `/ezquake/cvar` page is unusably heavy/slow in dev, REPORT it as a concern -- do not silently ship a broken page. (Deferred mitigation: paginate / lazy-load; does not touch the contract.)

C. **Build on the REAL contract.** `lib/types.ts` already exports `EntityValue` / `DefaultHistoryEntry` / `SourceRef` (verified) -- Task 1 imports them. Do NOT modify `lib/types.ts` (the MD marks it do-not-edit).

D. **D22 anchor scheme is corpus-safe** -- the orchestrator verified zero `lower(name)` collisions across all 20 files, so `entityAnchor(name) = lower(name)` is sound for ezQuake now and the other 5 codebases Phase 3 inherits. Build it exactly as specced.

## Boundary + halt

Run ALL TEN phase-boundary checks in the MD's "Verification" section -- including the dev-server runnable-state checks (filter narrows the list, the Flat/Grouped toggle regroups, a row inline-expands, version-walk renders on `cl_chunksperframe`, the `#cl_chunksperframe` anchor scrolls). Commit your work to `main` directly when they pass (no branch ceremony; additive subtree). Then HALT with the arc-executor structured report: status, the ACTUAL probe outputs (tsc exit; vitest pass/fail counts incl. the boolean-with-values->toggle and QWCL-no-choice cases; build exit + page count; the #7/#8/#9 grep results; source-link spot-check HTTP codes; the D20 isolation diff), any concerns, and what Phase 3 inherits. Do NOT proceed to Phase 3.

## Critical rules

- ASCII only. Scope is Phase 2b ONLY (ezQuake, proven end-to-end): NO other-5-codebases wiring (Phase 3); NO cvar->cvar links / "Used in" reverse-index / non-ezQuake source links (Phase 4). The "Used in" slot renders NOTHING in v1 (no "coming soon" text -- no dead links).
- If Task 4 finds itself needing a per-codebase branch inside a component, that is a D14 design problem -- escalate to the orchestrator, do NOT fork a component.
- Operator works at intent level; you are the technical executor. One question at a time if you must ask; plain-English consequences. Momentum over ceremony.
