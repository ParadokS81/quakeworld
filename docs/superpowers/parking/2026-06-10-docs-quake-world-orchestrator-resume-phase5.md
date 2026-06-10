# Orchestrator resume -- docs.quake.world, Phase 5 + F14 polish (after Phase 4 ship)

> Paste into a FRESH `claude` terminal: *"Read `docs/superpowers/parking/2026-06-10-docs-quake-world-orchestrator-resume-phase5.md` and follow it."* Mid-arc orchestrator handoff (arc-orchestrator skill). The prior orchestrator drove Phases 3 + 4 to ship (boundary-verified cold) and is handing off before the context smell zone so Phase-5 deploy verification + the F14 visual-polish pass keep full judgment fidelity.

## Where things are

- **Arc:** `docs/superpowers/plans/2026-06-09-docs-quake-world/` -- the L1 reference site (VitePress + Tailwind v4 + daisyUI in `apps/docs-web`, pnpm subtree).
- **Branch:** `main`. Operator does not touch git. A SECOND Claude session is concurrently writing `apps/qw-oracle/curated/` (the demand-driven-l3 arc) -- different files, no collision, but ALWAYS `git add <explicit apps/docs-web + plan-dir paths>` and `git diff --cached --stat` before each commit.
- **Shipped + pushed:** Phase 1 (`0979d4ad`), 2a (`945a3292`), 2b (`a160688a`..`f2f167b7`), 3 (`2b4c76a6`..`6dffd58c`). All boundary-verified cold. README status column is authoritative.
- **Phase 4 shipped LOCAL, NOT pushed:** 3 executor commits (`d1940492`, `cfcabe8f`, `236326c3`) + 1 orchestrator wrap (this handoff + the F15 MD correction + README). The prior orchestrator verified Phase 4 cold (tsc 0 / 40-40 tests / build 0 / 28 routes; D14+D15 greps empty; F15 source-link fix HTTP-200 confirmed for ktx/mvdsv/qwcl; D7 suppression holds -- 0 of 28 html pages carry `/guides/` or "Used in:"). **The commits were HELD for the operator live floor-check** (operator's explicit sequencing). PUSH after the floor-check passes.
- **Next:** (A) operator live floor-check [gates Phase 5], (B) the F14 visual-polish pass [pre-deploy, needs a D10 decision], (C) Phase 5 deploy. NOT drafted yet -- no phase-5 MD exists.

## Reads required (in order)

1. The scaffold: `README.md` (status column authoritative) -> `decisions.md` (D1-D22 + the 2026-06-09/06-10 amendments; D10 "adopt vikpe's theme" is the OPEN decision for F14) -> `review-findings.md` (F1-F16; F14 is the polish-pass spec, F15/F16 are Phase-4 execution drains).
2. `phase-4-crosslinks.md` (shipped) + the live Phase-4 code (`apps/docs-web/lib/{cvar-link,guide-index,source-link,browse}.ts`, `EntityCard.vue`). The `GUIDES_PORTAL_LIVE=false` flag in `guide-index.ts` is the D7 no-dead-links gate -- it STAYS false until the future guides-portal arc; do not flip it.
3. The arc-orchestrator skill. Key memory: `feedback_orchestrator_terminal_pattern`, `feedback_no_subagents_for_mechanical_edits`, `feedback_model_effort_range`, `feedback_verify_dispatched_terminal_claims`, `feedback_every_finding_gets_a_track`, the deploy archetype in `arc-planner/references/arc-phase-archetypes.md` (deploy floor = operator-run public smoke, not CI alone).

## Critical rules

- **The orchestrator does NOT touch project code.** Verify cold at every boundary (read/grep/SQL/run build+tests/HTTP yourself); never trust an executor's "PASS" -- re-run the probes. The prior orchestrator caught F15 (a 404-producing source-link prefix in the approved plan) and 2 draft defects (286 dead links + a path bug) by verifying cold; keep that bar.
- **F14 visual-polish pass is owed BEFORE Phase 5 (operator-approved 2026-06-10).** Presentation-layer only (respects D15): (1) trim the daisyUI `include:` list to the ~6 components actually used (kills latent generic-classname collisions like the nav `.menu` / card `.vp-doc h2` ones already fixed in Phase 3 -- F14); (2) **resolve D10 "adopt vikpe's theme"** -- import vikpe's actual daisyUI theme vs keep the custom `quakeworld` one. vikpe (the theme-source author) flagged 2026-06-10: VitePress renders data-driven (the arc already does this); see his source vendored at `research/repos/slipgate/` for examples -- it is the reference for this pass. THIS NEEDS AN OPERATOR DECISION before the pass executes. (3) density/spacing polish on browse tables + landing cards. Size it (likely a thin executor); the D10 call may make it bigger.
- **Phase 5 deploy:** Cloudflare Pages + vikpe DNS (scheduler.quake.world precedent). The verification FLOOR is operator-run public smoke (`docs.quake.world` responds with the right shape) -- CI/build-exit-0 stacks on top but is NOT the floor. Manual deploy for v1 (automate-on-extract is a deferred non-goal). Pre-launch nicety (NOT blocking): F7's ezQuake HUD-command categorization (a qw-oracle loader enrichment, not a docs phase).
- **Operator prefs:** works at intent level (you are the technical gate); one question at a time; plain English first; be decisive (recommend, don't poll); momentum over ceremony; ASCII only (no em/en dashes); commit to `main` directly.

## First three actions

1. **Confirm Phase 4 cold + close it:** verify the operator floor-check passed (cvar->cvar link renders + scrolls on an ezQuake card whose description names another cvar; a qtv card shows plain `file:line`, no broken link). Then PUSH the 4 held commits (`git push origin main`). If the floor-check has not happened, prompt the operator for it first. Re-run the cold probes yourself if you want independent confirmation (build + the html-scoped `grep -rl "/guides/\|Used in:" dist --include=*.html` = 0).
2. **F14 polish pass:** route the D10 decision to the operator (one question, plain English: import vikpe's theme from `research/repos/slipgate/` vs keep the custom theme + just trim/polish). Then draft + execute the pass per the operator's call (thin if "keep custom + trim"; bigger if "adopt vikpe's"). Verify the daisyUI `include:` trim does not drop a used component (the F10/F11 include-vs-usage probe).
3. **Phase 5 deploy:** draft `phase-5-deploy.md` (deploy archetype) -> CF Pages config + build + vikpe DNS. Execute. The floor is the operator-run public `docs.quake.world` smoke, not CI.

## Carried-forward concerns (operator radar -- none block Phase 5 except where noted)

- **Phase-4 live floor-check is the Phase-5 gate** (the one verification the headless orchestrator could not do): cvar-link click-through + qtv plain-text. Low residual risk (data-layer proven: ezquake 347 rows/538 spans, ktx 274/1258; source URLs HTTP-200; D7 suppression dist-verified), but it is the last unproven link.
- **cvar self-link UX oddity (minor):** a cvar whose description names itself links to its own anchor (`b_switch`->`#b_switch`). Harmless (valid anchor, not a dead link), within spec. Candidate for the F14 pass or a `cvar-link.ts` refinement (exclude the entity's own name). Not a blocker.
- **F16 (grep scope):** the dormant compiled "Used in:" label lives in the theme JS bundle (F11-class). The CORRECT Check-9 gate is `.html`-scoped (green: 0/28). The future guides-portal arc that flips `GUIDES_PORTAL_LIVE` must use the `.html`-scoped grep, not `grep -rl ... dist`.
- **cvar page ~1.17MB** -> Rollup ">500 kB" advisory (not a failure), accepted for v1.

## When in doubt

Route to the operator with one question and plain-English consequences. Do not propose scope deferrals without explicit operator approval. The arc design is locked (D1-D22); if a finding genuinely conflicts with a decision, amend `decisions.md` with a dated block (never silently override in a phase MD). D10 (vikpe theme) is the one decision genuinely still open -- get it before the F14 pass executes.
