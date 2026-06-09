# Phase 2a executor prompt -- docs.quake.world (file-as-prompt)

> Paste into a FRESH `claude` terminal in the monorepo main tree by typing
> `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2a-executor-prompt.md`.
> This is the EXECUTION bootstrap (not a drafter prompt). The orchestrator
> session that dispatched you verifies your output against live source at the
> boundary -- report honest probe outputs, not "PASS" claims.

You are EXECUTING Phase 2a of the **docs.quake.world** arc (date suffix
2026-06-09-docs-quake-world). This arc builds the WEBSITE that auto-projects QW
Oracle Layer 1 into a per-codebase browsable reference (VitePress + Tailwind v4 +
daisyUI on Cloudflare Pages). Phase 2a stands up `apps/docs-web` as a bootable
VitePress scaffold: pnpm subtree, daisyUI tokens, a plain-TS data layer, and a
data-driven routing skeleton. This is EXECUTION -- you write real code, run pnpm,
boot the dev server, and ship the runnable "site boots" state.

Use the **arc-executor** skill as your spine: read the phase MD cold, critically
review it against decisions.md / review-findings.md BEFORE executing, execute
each task per its declared execution mode, run phase-boundary verification, and
halt with a structured status report (DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT /
BLOCKED).

STOP and re-check which arc you are in if you see `category_inferred` SQL,
describe-fill synthesis, Postgres migrations, or `build-snapshot.ts` edits --
those belong to sibling/precursor arcs. Phase 2a touches ONLY the new
`apps/docs-web/` subtree. It does NOT modify `build-snapshot.ts`, anything under
`apps/qw-oracle/` or `apps/slipgate-app/`, or the monorepo-root `package.json`.

Working directory: /home/paradoks/projects/quakeworld

## Reads (in order)

1. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2a-scaffold.md` -- THE phase MD: your task list, full file content for every file, per-task execution mode, and the six boundary checks.
2. `docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md` -- D10/D15/D20 are central. NOTE the 2026-06-10 D18 amendment (value-list is ezQuake-only): it is mainly a 2b concern, but it confirms the `lib/types.ts` shape you ship here (`values?` = ezQuake cvar only; `raw_type?` = ezQuake + QWCL only).
3. `docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md` -- F8 (npm/pnpm workspace isolation) is the finding that bites this phase.
4. `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md` -- the shape the MD follows.

The MD ships FULL file content as a verified starting point. Honor the execution
modes: Task 1 `inline`; Task 2 (VitePress + Tailwind v4 + daisyUI integration)
`subagent (Sonnet MAX)` -- the known gotcha; Tasks 3/4/5 (data layer / landing
proof / routing) `subagent (Sonnet medium)`. Any sub-agent fan-out: paced, low
concurrency, honest counts.

## Orchestrator augmentations (apply these -- learnings from the 2a boundary review)

1. **tsconfig (Task 3).** The MD's Task 3 verification runs `tsc --noEmit` on
   bare files, but the scaffold ships NO `tsconfig.json`, so that invocation can
   spuriously fail (module resolution / `import.meta` / node types). Before that
   check, add a minimal `apps/docs-web/tsconfig.json` (esnext module + target,
   `moduleResolution: bundler`, `types: ["node"]`, `strict`, `noEmit`) OR
   substitute a `node --experimental-strip-types` smoke that imports
   `loadSnapshot` and prints `loadSnapshot('qtv','cvar').entries.length` (expect
   40). If you add the tsconfig, it is a new `apps/docs-web/` file (stays inside
   the subtree -- does not trip boundary check #6).

2. **F8 root package.json -- DO NOT edit it (operator decision 2026-06-10).** The
   belt-and-suspenders option (adding `"!apps/docs-web"` to the root `workspaces`
   array) is REJECTED. Rely on docs-web's own `pnpm-workspace.yaml` + the existing
   `npm --no-workspaces` convention, exactly as the MD's Task 1 + Open Questions
   default. The root `package.json` stays byte-unchanged (boundary check #6
   asserts this).

3. **Library setup is not memory.** The MD's file contents boot the scaffold, but
   the Task 2 VitePress + Tailwind v4 + daisyUI integration is judgment-dense and
   may need the documented preflight-vs-VitePress-chrome reconciliation (the MD
   ships both import forms). If the first boot fights you, pull current VitePress
   / Tailwind v4 / daisyUI docs via Context7 -- do NOT rely on training memory for
   v4 setup. The token VALUES in `style.css` are LOCKED (lifted from vikpe's
   slipgate web); you own only the import strategy that boots clean. Record which
   import form shipped in a one-line comment at the top of `style.css`.

## Boundary + halt

Run ALL SIX phase-boundary checks in the MD's "Verification (phase boundary)"
section -- do not declare DONE on a subset. The two that matter most:
- **D15 decoupling grep (#5)** must print nothing (no fetch / fs / `.filter` /
  `.map` / `.reduce` inside any component). Data work lives only in `lib/` and
  `codebases.data.ts`.
- **D20 isolation (#6):** `git status --short` shows ONLY new files under
  `apps/docs-web/`; nothing under `apps/qw-oracle/`, `apps/slipgate-app/`, or the
  root `package.json`; `apps/docs-web/data/*.json` is byte-unchanged (you read,
  never write, the Phase-1 output).

Commit the bootable scaffold to `main` directly when the boundary checks pass
(the operator does not touch git; no branch ceremony for this low-risk additive
subtree). Then HALT with the arc-executor structured report: status, the ACTUAL
probe outputs (install exit + lockfile written; dev boot clean; the live per-type
counts rendered on the landing page e.g. ezQuake cvar 2743 / qtv cvar 40; build
exit 0 + the 26 generated routes; the #5 grep result; the #6 isolation diff), any
concerns, and what Phase 2b inherits.

## Critical rules

- ASCII only -- no emoji, no em/en dashes (operator output-discipline rule).
- Scope is Phase 2a ONLY: site boots, tokens applied, loader reads the JSON,
  routing STUBS. NO browse view, card, friendly-type/category derivation, filter,
  or per-entity anchors (D22) -- all of that is Phase 2b. If you find yourself
  building a card or a derivation module, stop: that is 2b creep.
- Operator works at intent level; you are the technical executor. One question at
  a time if you must ask; plain-English consequences. Momentum over ceremony.
- Do NOT proceed to Phase 2b. Halt and report; the orchestrator gates the
  boundary and dispatches 2b.
