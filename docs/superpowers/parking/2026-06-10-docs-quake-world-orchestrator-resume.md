# Orchestrator resume -- docs.quake.world, Phases 3-5 (after 2b ship)

> Paste into a FRESH `claude` terminal: *"Read `docs/superpowers/parking/2026-06-10-docs-quake-world-orchestrator-resume.md` and follow it."* This is a mid-arc orchestrator handoff (arc-orchestrator skill). The prior orchestrator drove Phases 2a + 2b to ship and is handing off before the context smell zone so Phase-3 boundary verification keeps full judgment fidelity.

## Where things are

- **Arc:** `docs/superpowers/plans/2026-06-09-docs-quake-world/` -- the L1 reference site (VitePress + Tailwind v4 + daisyUI in `apps/docs-web`, pnpm subtree).
- **Branch:** `main` (operator does not touch git; commit only YOUR files -- parallel arcs (faq-gate / L3 concept-authoring) are committing to the SAME shared tree, so always `git add <explicit paths>` and `git diff --cached --stat` before every commit).
- **Shipped:** Phase 1 (`0979d4ad`, L1 export) + Phase 2a (`945a3292`, scaffold) + Phase 2b (`a160688a`..`f2f167b7`, the D14/D15 generic renderer proven on ezQuake). All boundary-verified cold. README status column is authoritative.
- **Next:** Phase 3 -- fan out the other 5 codebases (KTX / MVDSV / QTV / QWFWD / QWCL) through the SAME components as **data + config only**. NOT drafted yet. `phase-3-drafter-prompt.md` exists (arc-planner's pre-ship version) and needs orchestrator augmentation with 2b carry-forwards before dispatch (same pattern used for 2b).
- **What 2b built that Phase 3 reuses verbatim:** `EntityBrowse.vue` / `EntityCard.vue` / `CodebaseLanding.vue` (zero per-codebase code), the plain-TS `lib/` derivation layer (`derive`/`category`/`filter`/`version-walk`/`anchor`/`source-link`/`browse`), the per-page `paths()` params mechanism, the D22 anchor scheme (verified collision-free across all 20 files), and `source-link.ts`'s per-codebase config seam (only ezQuake populated).

## Reads required (in order)

1. The scaffold: `README.md` -> `decisions.md` (note the 2026-06-10 D18 amendment) -> `review-findings.md` (F1-F12; F2/F5/F7 are the graceful-degradation carry-forwards Phase 3 leans on) -> `phase-template.md`.
2. The SHIPPED 2b MD: `phase-2b-ezquake-template.md` (the contract Phase 3 inherits) and the live code `apps/docs-web/lib/*` + `.vitepress/theme/components/Entity*.vue`.
3. `phase-3-drafter-prompt.md` (augment it before dispatch -- see First actions).
4. The arc-orchestrator skill. Key memory: `feedback_orchestrator_terminal_pattern`, `feedback_no_subagents_for_mechanical_edits` (read the 2026-06-10 sharpening -- content-conditional execution modes, F12), `feedback_model_effort_range`, `feedback_audit_predictions_not_contracts`, `feedback_verify_dispatched_terminal_claims`.

## Critical rules

- **The orchestrator does NOT touch project code.** Verify cold at every boundary (read/grep/SQL/run build+tests yourself); never trust an executor's "PASS" -- re-run the probes. The prior orchestrator caught nothing wrong in 2a/2b because it verified everything; keep that bar.
- **D14 is the Phase-3 hard gate:** Phase 3 is data + config ONLY. If the Phase-3 executor finds itself writing new component code or adding a per-codebase branch, that is a 2b design FAILURE -- escalate to the operator, do NOT paper over. Boundary check #8 (grep `Entity*.vue` for `ezquake|'cvar'|...` -> empty) must stay green with all 6 codebases wired.
- **Graceful degradation is the Phase-3 story (D11/F5):** the leaner codebases lack what ezQuake has -- no `raw_type` (-> blank Type column), no `values`, no `default_history` (-> no version-walk), no `groups` (category is ALREADY a human label -> `resolveCategory` passthrough), info_key has `scope`. The components already handle absence (proven on ezQuake's command/macro/cmdline types). The Phase-3 verification must confirm each codebase degrades cleanly, not error.
- **Source links:** only ezQuake's `source-link.ts` config is populated. Non-ezQuake source links + F6 (qtv/qwfwd `upstream_commit` is a version string, not a SHA -> tag-based URL) are PHASE 4, not Phase 3. Phase 3's non-ezQuake rows show `file:line` as plain text (D11).
- **Content-conditional execution modes (F12):** annotate/honor inline only for truly-locked content; subagent for synthesis. Phase 3 is mostly config + data wiring (leaner than 2b) -- but the per-codebase landing/config and any degradation-handling is real work; size per task.
- **Operator prefs:** works at intent level (you are the technical gate); one question at a time; plain English first; be decisive (recommend, don't poll); momentum over ceremony; ASCII only (no em/en dashes); commit to `main` directly.

## First three actions

1. **Scope check:** read `README.md` + `decisions.md` + the 2b MD. Confirm Phase 3 = the 5-codebase fan-out through the existing components (it is; D2/D14). Verify the shipped 2b state cold: `pnpm --dir apps/docs-web run docs:build` exits 0 and `pnpm --dir apps/docs-web test` is 23/23 (the inherited foundation).
2. **Augment `phase-3-drafter-prompt.md`** with the 2b carry-forwards (mirror how 2b's drafter prompt was augmented): point at the SHIPPED components/lib (reuse verbatim, no new component code -- D14); the per-codebase degradation matrix (which fields each of the 5 codebases has/lacks -- derive it from `apps/docs-web/data/{ktx,mvdsv,qtv,qwfwd,qwcl}-*.json` key-unions); the category-is-already-a-label passthrough for the 5; source links deferred to Phase 4; the D14 grep gate (#8) must stay green with all 6 wired. Then dispatch the Phase-3 drafter in a fresh terminal, review the draft at the boundary (paper review against D14/D11/F5), approve, write the Phase-3 executor prompt, verify the execution boundary cold.
3. Proceed Phase 4 (cross-links: cvar->cvar within-codebase + the dormant entity->guide reverse-index; F6 source-link branch) then Phase 5 (Cloudflare Pages + vikpe DNS; deploy archetype -> operator-run public smoke is the verification FLOOR, not CI alone).

## Carried-forward concerns (operator radar -- none block Phase 3)

- **2b live click-through still pending an operator floor-check** (the one verification the headless orchestrator could not do): `pnpm --dir apps/docs-web run docs:dev`, open `/ezquake/cvar`, type `cl_` (narrows), toggle Group-by-category (regroups; `(uncategorized)` bucket on `/ezquake/command`), click a row (expands), open `/ezquake/cvar#cl_chunksperframe` (scrolls, shows v3.0->5, 3.6.3->30). Low residual risk (wiring read-correct + pure functions unit-tested), but it is the last unproven link.
- **Cosmetic (operator's call):** version-walk/value separators render via HTML entities `&rarr;` (arrow -- fine) and `&mdash;` (em-dash -- against the operator's ASCII output discipline even in render). Recommend swapping the `&mdash;` to ASCII (`-` or `/`); the arrow is fine. Trivial; a Phase-3 touch or a quick follow-up, not a gate.
- **cvar page ~1.17MB** -> a Rollup "chunk > 500 kB" advisory (not a failure), accepted for v1. Phase 3 adds more pages but each pays only its own weight (per-page params). Paginate/lazy is a contract-free later optimization.

## When in doubt

Route to the operator with one question and plain-English consequences. Do not propose scope deferrals without explicit operator approval. The arc design is locked (D1-D22); if a Phase-3 finding genuinely conflicts with a decision, amend `decisions.md` with a dated block (never silently override in a phase MD).
