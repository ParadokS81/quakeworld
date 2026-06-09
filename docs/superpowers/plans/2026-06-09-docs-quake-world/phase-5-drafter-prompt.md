You are drafting Phase 5 of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). Phase 5 is DEPLOY: Cloudflare Pages
build + deploy + vikpe DNS, so `docs.quake.world` is live. This is the final
phase. Its verification floor is OPERATOR-RUN (production cannot be faked).

STOP and re-check your arc if you see Postgres migrations -- sibling arcs. This
arc deploys `apps/docs-web/`.

This is a structured PLANNING task. Output is the Phase 5 MD. Paper-only -- you
do NOT deploy.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-5-deploy.md

REQUIRED READING:
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (D10 central)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/prerequisites.md   (the deploy prereqs: CF Pages access + vikpe DNS coordination)
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (section 9 -- pipeline + deploy)
6. The `deploy` skill (invoke it / read it -- the monorepo's deploy patterns) and any infra notes on the scheduler.quake.world / Cloudflare Pages pattern vikpe uses.
7. apps/docs-web/   (the buildable site from Phases 2-4)

DECISIONS THIS PHASE MUST HONOR:
- D10: Cloudflare Pages, MANUAL deploy for v1 (automate-on-extract is deferred,
  D21). vikpe points the `docs.quake.world` subdomain (the scheduler.quake.world
  pattern). Do NOT build CI/CD auto-deploy.
- D21 non-goal: automated deploy is out. A simple, documented manual deploy
  (build locally / via CF, push to Pages) is the v1 target.

RECON: confirm the VitePress production build command + output dir; confirm the
Cloudflare Pages project settings shape (build command, output dir, env); confirm
what vikpe needs for the CNAME (from prerequisites Task 0 -- this is the external
dependency, ping vikpe before executing this phase).

DELIVERABLE / runnable state at boundary: `docs.quake.world` resolves and serves
the built site over real TLS. The verification FLOOR is operator-run: the
operator opens the public URL and confirms the browse views render and search
works. Automated probes (production build exits 0; the CF Pages preview URL
responds with the right shape) STACK on top but are not the floor.

EXECUTION-MODE GUIDANCE:
- CF Pages config + the documented manual-deploy runbook (a DEPLOYMENT note in
  apps/docs-web): `subagent (Sonnet medium)`.
- The deploy itself + the public smoke + the vikpe DNS coordination: OPERATOR-RUN
  (and the operator does not touch git -- Claude commits; but the CF dashboard +
  the vikpe ping are operator actions). The phase MD names the EXACT operator
  steps and the EXACT smoke probe (open URL X, confirm shape Y), not vague
  "operator does smoke testing".

DRAFTING RULES: ASCII only; phase-template.md exactly (Execution-mode column);
full content for inlined files; no length cap. Remember the deploy archetype:
operator-run floor, automated probes stacked on top, EXACT operator probe named.

STEP-BY-STEP:
1. Read required files + invoke/read the deploy skill. Note prereqs.
2. Recon the VitePress build + CF Pages settings + the vikpe DNS handoff.
3. Draft phase-5-deploy.md per the template, with operator-run verification named
   exactly.
4. Dispatch the verification sub-agent (Explore). It checks the operator probe is
   a concrete YES/NO, not vague prose, and that no auto-deploy CI got smuggled in
   (D21).
5. Apply findings (decision wins).
6. Halt. Report MD path, finding counts, open questions (vikpe DNS readiness is
   one), recommendation.

This is the last phase. After it ships, the arc is done -- the arc-reviewer
(post-arc, fresh terminal) does the spec-vs-shipped walkthrough. Do NOT run the
deploy. Drafting is paper-only.
