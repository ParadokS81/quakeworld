# Orchestrator resume -- docs.quake.world, F23 close-out + Phase 5 deploy (after F14 ship)

> Paste into a FRESH `claude` terminal: *"Read `docs/superpowers/parking/2026-06-11-docs-quake-world-orchestrator-resume-phase5.md` and follow it."* Mid-arc orchestrator handoff (arc-orchestrator skill). The prior orchestrator drove Phase 4 close -> the entire F14 pre-deploy pass (draft / review / execute) -> the F22 search-styling fix, and is handing off before deploy so the ONE remaining F14 item (F23) + Phase 5 run on clean context.

## Where things are

- **Arc:** `docs/superpowers/plans/2026-06-09-docs-quake-world/` -- the L1 reference site (VitePress + Tailwind v4 + daisyUI in `apps/docs-web`, pnpm subtree).
- **Branch:** `main`. Operator does not touch git. A SECOND Claude session is concurrently writing `apps/qw-oracle/curated/` (the demand-driven-l3 arc) -- different files, but its commits interleave on `main` (e.g. `432d53cb`, `c5ca2dd3`). ALWAYS `git add <explicit apps/docs-web + plan-dir paths>` and `git diff --cached --stat` before every commit. (Note: that arc has its OWN finding numbers -- its "F14" is unrelated to this arc's F14.)
- **Shipped + pushed (all boundary-verified cold):** Phases 1-4. **The F14 pre-deploy pass is SHIPPED + verified:** F17 cvar-link auto-expand (`93c925ad`), F18 global entity search (`ef79737a`), daisyUI include trim (`009e26a1`), density polish (`2d899115`), F19/F20/F21 ledger (`57463627`), F21 split ratification (`c5f58383`), F22 fix (`3b9317fc`). README status column is authoritative.
- **F14 is DONE except ONE item (F23):** the operator floor-check (2026-06-11) confirmed the F18 search renders + works (after the F22 fix), BUT the VitePress built-in **Ctrl+K** search box is a prose-only dead box (indexes only the home page) sitting next to the working search. **Operator chose Option A: disable it.** Trivial `config.ts` change -- the last pre-deploy fix. See review-findings F23.
- **Phase 5 (deploy) NOT started.** `phase-5-drafter-prompt.md` pre-exists (arc-planner). `phase-5-deploy.md` does not exist yet.
- A preview server was left running on `localhost:4173` (bg task `bke95q14o`) on the F22-fixed build; it may have died on a session event -- restart with `pnpm --dir apps/docs-web docs:preview --port 4173` if stale.

## Reads required (in order)

1. The scaffold: `README.md` (status column) -> `decisions.md` (**D9 amended** = flat global entity search is in scope; **D10 closed** = no theme swap, docs theme already = vikpe's; D22 anchors; D15 decoupling; D11 graceful) -> `review-findings.md` (**F17-F23**; note **F22**'s "mechanism corrected" block and **F23** the pending Ctrl+K-disable fix).
2. `phase-f14-predeploy.md` (the shipped F14 plan) + the live F14 code: `GlobalSearch.vue`, `lib/search-index.ts` (client) + `lib/search-builder.ts` (build-time, F21 split), `EntityBrowse.vue`/`EntityCard.vue` (F17 hash glue), `.vitepress/theme/style.css` (the F22 UNLAYERED `.input`/`.toggle` re-assertions at the bottom), `.vitepress/config.ts` (the `search: { provider: 'local' }` block F23 removes).
3. `phase-5-drafter-prompt.md` -- the deploy drafter prompt (CF Pages + vikpe DNS).
4. The arc-orchestrator skill + the **deploy archetype** in `arc-planner/references/arc-phase-archetypes.md` (deploy floor = operator-run public smoke). Key memory: `feedback_orchestrator_terminal_pattern`, `feedback_verify_dispatched_terminal_claims`, **`feedback_no_inference`** (load-bearing this arc -- see Critical rules), `feedback_no_subagents_for_mechanical_edits`, `feedback_every_finding_gets_a_track`.

## Critical rules

- **The orchestrator verifies cold at every boundary -- in BOTH directions.** Re-run probes; never trust a "PASS". This session: the build caught a plan defect the paper review missed (F21, node:fs in the client bundle), AND the F22-fix executor caught the *orchestrator's own wrong diagnosis* by analysing the compiled bytes. Hold that bar.
- **The corrected F22 lesson (carry into Phase 5; relay to infiniti):** a VitePress host's **UNLAYERED** CSS resets outrank ALL of Tailwind/daisyUI's layered output. daisyUI component overrides in docs-web must be UNLAYERED (the `style.css` `.input`/`.toggle` re-assertions), NOT layer-ordered -- a named-layer reorder is a no-op. If the deployed build looks different from local, suspect host CSS, not the data. The same gotcha will hit infiniti's Solid+daisyUI port under any layered host (D15). **`feedback_no_inference`:** the orchestrator's first F22 diagnosis was wrong because it INFERRED which `@layer` each rule sat in from partial greps instead of brace-matching the compiled CSS. For any cascade claim, verify the actual layer/specificity structure, don't infer it.
- **`docs:build`, not `build` (F20):** the docs-web build script is `docs:build`. Every rebuild = `pnpm --dir apps/docs-web docs:build`.
- **Deploy archetype:** Cloudflare Pages + vikpe DNS (scheduler.quake.world precedent). The verification FLOOR is the **operator-run public smoke** -- `docs.quake.world` responds with the right shape (a cvar page renders; the entity search finds a cvar; a cvar-link click lands on the expanded card). CI / build-exit-0 stacks on top but is NOT the floor. Manual deploy for v1 (automate-on-extract is a deferred non-goal).
- **Git:** shared tree, sibling session in `qw-oracle/curated/`. Explicit `git add` of `apps/docs-web` + plan-dir paths; `git diff --cached --stat` before each commit; commit to `main` directly.
- **Operator prefs:** works at intent level (you are the technical gate); one question at a time; plain English first; be decisive (recommend, don't poll); momentum over ceremony; ASCII only.

## First three actions

1. **Close F14 -- ship F23 (the last pre-deploy fix).** Route a thin fix to a fresh terminal (it is a one-block deletion -- a light executor or a `superpowers:subagent-driven-development` task, not a full arc-executor): remove the `search: { provider: 'local' }` block from `apps/docs-web/.vitepress/config.ts` (operator chose A, 2026-06-11). Rebuild (`docs:build`); verify cold that the top **Ctrl+K box is gone** AND `GlobalSearch` (hero + `/search`) still works AND prior routes are intact; commit (explicit paths) + push. Restart the `localhost:4173` preview on the fixed build; operator does a 30-second confirm (Ctrl+K box gone, GlobalSearch still works). Then F14 is fully DONE.
2. **Draft Phase 5.** Open a fresh terminal: `@docs/superpowers/plans/2026-06-09-docs-quake-world/phase-5-drafter-prompt.md` -> produces `phase-5-deploy.md`. Boundary-review it cold (CF Pages build config + output dir = `.vitepress/dist`; `docs:build` not `build`; the vikpe-DNS step). Augment the executor prompt with the F22 host-CSS lesson + the `docs:build` rule.
3. **Execute Phase 5 -> deploy.** Fresh executor terminal: CF Pages config + build + deploy + vikpe DNS. The floor is the operator-run public `docs.quake.world` smoke (not CI). When it is live + smoke-passed, the arc is shipped -> write the **post-arc handoff to arc-reviewer** (fresh terminal, reads cold) and tag the ship (`git tag -a arc-docs-quake-world-shipped`).

## When in doubt

Route to the operator with one question and plain-English consequences. Don't propose scope deferrals without explicit operator approval. The arc design is locked (D1-D22 + dated amendments); a finding that genuinely conflicts with a decision gets a dated amendment block in `decisions.md`, never a silent override. Pre-launch nicety (NOT blocking Phase 5): F7's ezQuake HUD-command categorization (a qw-oracle L1 loader enrichment, not a docs phase).
