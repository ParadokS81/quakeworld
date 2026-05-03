You are the Phase 8 executor terminal for qw-oracle Arc 1, taking over after the orchestrator signed off Phase 7 (observability shipped at `206b1a1`; closeDb teardown bug fixed at `d340431`). Your scope is to execute Phase 8 -- eval + calibration + Docker prod + Unraid deploy -- end-to-end through phase-boundary verification, then halt with a structured summary so the orchestrator can independently verify before sign-off. **This is the heaviest phase in the arc** (15 tasks vs 5 in Phase 7) and the one that ships the public MCP at `oracle.slipgate.me/mcp`.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where things are

- **Plan to execute:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-8-eval-deploy.md` (~2218 lines, the largest phase MD in the arc). The orchestrator audit pass found no critical drift in eval.ts / calibrate.ts imports against Phase 6 reality (verified `searchConcepts` / `searchEntities` / `searchSolvedIssues` / `lookupEntity` named-export shape and arg signatures match what the plan calls). Apply the same code-vs-comment discipline mid-flight if anything else drifts.
- **Cross-cutting decisions you must respect:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked). The two load-bearing for Phase 8: **D10** (eval set vs calibration set are DISJOINT -- the calibration sweep must NOT touch `eval-queries.json` and vice versa, otherwise the deploy gate becomes trivially passable post-calibration), and **D11** (eval scores out-of-corpus queries by `match_quality`, NOT by hit count -- the `expected_top_3: []` queries pass when no tool returns `match_quality: 'strong'`).
- **App-wide always-on rules:** `apps/qw-oracle/CLAUDE.md`. The "SQLite over Postgres" line you'll RETIRE in Task 14 -- that's a Phase 8 deliverable, not an in-flight constraint.
- **HANDOVER tracker:** `HANDOVER.md` lists "qw-oracle DEPLOYMENT.md authoring" as an open small followup, paired with Phase 8. Phase 8 ships `apps/qw-oracle/deploy/README.md` (the operator's first-time Unraid runbook); the HANDOVER followup is asking whether to also lift / link this from a top-level `apps/qw-oracle/DEPLOYMENT.md`. Default: ship the deploy/README.md as the plan specifies; surface the HANDOVER followup at phase-boundary so the operator can decide whether to fold the lift-to-top-level into this commit or defer it.
- **The shape of what shipped before Phase 8:**
  - Phase 7 ships `query_log` + dispatcher wrapper + `OBSERVABILITY.md`. The eval gate path (Task 2) bypasses the dispatcher to avoid flooding `query_log` with non-consumer rows during gate runs.
  - Phase 6 ships placeholder thresholds `MATCH_QUALITY_STRONG_THRESHOLD = 0.05` / `MATCH_QUALITY_WEAK_THRESHOLD = 0.02` in `search-entities.ts` and `search-concepts.ts`. Phase 8 calibration replaces these with real values.
  - Phase 6 ships `redirect_targets` seeded with 6 placeholder rows (Discord URLs use `REPLACE_GUILD_ID` etc.). Operator may swap real IDs in before Task 13's public smoke -- see Open question 7 in the plan.
  - The `apps/qw-oracle/scripts/helpdesk-{benchmark,coverage}.mjs` POCs are listed for deletion. Audit at execution time -- they may already be gone from earlier phases.
  - The closeDb teardown bug (Phase 7 cleanup at `d340431`) is fixed; `bun run test` is now 90 pass / 1 skip / 0 assertion failures / 1 unrelated module-load error. Phase 8's deploy gate verification (Probe 1) needs a green test suite -- do NOT regress this.

## Pre-flight (run before reading the plan)

The orchestrator already verified Phase 7 inheritance is intact. You do NOT need to re-run the L1/L2/L3 row-count probes. Do run these executor-side checks:

1. **Container up:**
   `docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev` -- must report `Up ... (healthy)`.
2. **Clean tree on main:**
   `git status --porcelain` -- must be empty. `git rev-parse --abbrev-ref HEAD` -- must be `main`. `git log --oneline -1` -- top must be `d340431` or newer.
3. **Test suite still green-modulo-known-noise:**
   `cd apps/qw-oracle && bun run test 2>&1 | tail -5` -- expect `90 pass / 1 skip / 1 fail / 1 error / 92 tests`. The `1 fail` is bun double-counting the `reserved-subdirs.test.ts` module-load error (long-standing pre-Phase-2 followup, documented in HANDOVER). Real assertion failures = 0. JUnit reporter confirms: `bun test --reporter=junit --reporter-outfile=/tmp/junit.xml; grep 'failures="0"' /tmp/junit.xml | head -1` should show the top-level summary with failures="0".
4. **Voyage state ready:**
   `grep '^VOYAGE_API_KEY=' apps/qw-oracle/.env | head -1` -- needed for the per-query embed path the eval and calibration sweeps drive (they go through `searchConcepts` / `searchEntities` which embed the query string each time).
5. **Operator prerequisites for the deploy half (per `prerequisites.md`):** these are operator-side, not yours to verify with code. Surface to the operator during pre-flight so they can confirm BEFORE you reach Task 8:
   - Tailscale up, `ssh root@100.114.81.91` returns to a prompt (Unraid box).
   - `/mnt/user/appdata/qw-oracle/` exists on Unraid with `postgres-data/` and `snapshots/` subdirs.
   - `gh auth status` shows logged in; `docker login ghcr.io` succeeds; push access to `ghcr.io/paradoks81/qw-oracle-mcp`.
   - The existing Unraid Cloudflare Tunnel is healthy; operator can add a new route in the CF dashboard.
   - DNS authority for `slipgate.me`; operator can add a CNAME for `oracle.slipgate.me`.
   - If any of these is uncertain, halt and ask the operator to confirm before reaching Task 8.
6. **Existing scripts to delete (audit-then-act):**
   `ls apps/qw-oracle/scripts/helpdesk-*.mjs 2>/dev/null` -- if either `helpdesk-benchmark.mjs` or `helpdesk-coverage.mjs` is present, Task 4's deletion list applies; if both are absent (cleaned up earlier), shrink Task 4's "Deleted" list to `(none)` and note the deviation.

If any pre-flight check fails (other than the operator-touchpoints in #5 which are surfaceable), halt and report -- do NOT proceed.

## Reads in order

1. The Phase 8 plan top to bottom (`phase-8-eval-deploy.md`, ~2218 lines). Budget the reading time -- this is the largest phase MD. Skim Tasks 1-5 (eval/calibrate code; mostly drop-in), focus on Tasks 6-7 (Dockerfile + nginx -- syntactic detail matters), focus on Tasks 8-13 (deploy choreography; multi-step + multi-host), Task 14 (doc updates), Task 15 (final commit).
2. `decisions.md` D10 + D11 (already named above), D12 (ASCII output discipline -- relevant to README.md / DEPLOYMENT.md prose), D13 (test DB isolation -- relevant to `eval/eval.test.ts`), D14 (phase atomicity -- the final commit at Task 15 should be one coherent unit).
3. `apps/qw-oracle/CLAUDE.md` always-on rules. The "SQLite over Postgres" line is what Task 14 retires.
4. `apps/qw-oracle/OVERVIEW.md` -- Task 14 replaces the "Layer 2 - state unknown" section here.
5. Root `OVERVIEW.md` -- Task 14 annotates the integration-map ASCII diagram with the public MCP endpoint.
6. `apps/qw-oracle/docs/arc-history.md` -- Task 14's Arc 1 ship entry prepends here. Note the file's append-newest-on-top convention (per its header).
7. The live tool function shapes you'll import: `serve/mcp/src/tools/search-concepts.ts`, `tools/search-entities.ts`, `tools/search-solved-issues.ts`, `tools/lookup-entity.ts`. Quick eyeball-check that the result shapes (`.slug`, `.canonical_id`, `.session_id`) match what eval.ts assumes; orchestrator did a structural pre-check, but verify before pasting.
8. `apps/qw-oracle/serve/mcp/src/transports/http.ts` -- Task 6's Dockerfile ENTRYPOINT runs the same MCP server with `MCP_TRANSPORT=http MCP_PORT=3000`; understand the transport before wrapping it in Docker.
9. `HANDOVER.md` -- the "qw-oracle DEPLOYMENT.md authoring" small-followup is paired with this phase. Decide at the boundary whether to drain it in this commit or leave it for a separate small commit.
10. `prerequisites.md` -- the deploy-half operator prereqs (Tailscale, Unraid path, GHCR, CF Tunnel, DNS) are listed there.

## Critical rules (apply to every file you write)

- **Bun is the runtime** (D2). All scripts use `bun ...`. `eval.ts` and `calibrate.ts` ship `#!/usr/bin/env bun` shebangs. Tests use `bun test` via the existing `npm run test` (which sets `DATABASE_URL` to qw_oracle_test).
- **`bun install` for any new deps.** Phase 8 typically adds nothing new; if you find yourself reaching for a missing package while pasting plan-shipped code, halt and check why -- don't silently add deps.
- **D10 disjoint sets.** `eval-queries.json` and `calibration-queries.json` MUST NOT share `query` strings. The plan ships scaffolds that are disjoint by construction; the verification at Task 1 includes a `jq diff` check. If the operator extends both files and a query overlaps, the eval gate becomes trivially passable -- treat any overlap as a hard FAIL, not a YELLOW.
- **D11 out-of-corpus scoring.** Queries with `expected_top_3: []` pass when NO tool returns `match_quality: 'strong'`. The plan-shipped `score()` function in eval.ts encodes this. Do NOT amend it to count hits; that's the regression D11 was created to prevent.
- **Calibration is iterative, not one-shot.** Task 11 runs the calibration sweep against prod; you write the printed thresholds back into the prod `.env`; the eval gate then runs against prod. If the gate fails, you re-author calibration queries (operator decides; you don't improvise) and re-sweep. Surface the calibration output to the operator BEFORE writing thresholds back.
- **Multi-host execution awareness.** Tasks 1-7 run on the laptop. Task 8 builds + pushes to GHCR (laptop + GHCR). Tasks 9-12 run on Unraid (over Tailscale SSH). Task 13 runs from Claude Desktop / Code with `oracle.slipgate.me/mcp` configured (operator-side). When you run a command via SSH, prefix it explicitly so the executor log makes the host clear (e.g., `ssh root@100.114.81.91 'cd /mnt/user/appdata/qw-oracle && docker compose pull'`).
- **Operator touchpoints are explicit halts.** Three operator-driven boundaries:
  - **After Task 1 scaffold.** The plan ships 4 eval queries + 3 calibration queries. The operator extends to 10-15 / 5-8 queries from Discord `#helpdesk` history. Halt after the scaffold lands so the operator can extend before Task 5 runs the gate.
  - **Task 11 calibration review.** Print thresholds; ask the operator to confirm before writing to prod `.env`.
  - **Task 12 CF Tunnel + DNS.** You can prep the nginx route description; the operator clicks the dashboard. Halt with the exact route values to enter (subdomain `oracle.slipgate.me`, service `http://qw-oracle-mcp:8080` or whatever Task 7 sets).
  - **Task 13 public smoke.** The operator runs the Claude Desktop probe -- you can't drive Desktop. Surface the canonical "screen wobble" probe verbatim so the operator copy-pastes.
- **Voyage cost watch.** Calibration runs hit Voyage per query per threshold sweep step. With 5-8 calibration queries and a sweep of ~5-10 threshold pairs, expect 25-80 embeds per calibration run; <5k tokens. Eval gate runs hit Voyage per query per tool; with 10-15 queries and 2-4 tools per query, expect 20-60 embeds per gate run; <3k tokens. Surface only if cumulative arc total crosses ~5M tokens (currently ~131,715).
- **Comments explain WHY, not WHAT.** ASCII only. No emoji. No em-dashes / en-dashes -- use `--`. (D12.) This applies to README.md, DEPLOYMENT.md (if shipped), nginx.conf comments, Dockerfile comments, arc-history entry.
- **Per-phase atomicity** (D14). Stage all Phase 8 work, then commit ONCE at phase boundary (Task 15). Do not push -- the orchestrator handles push after sign-off. The phase commit message names what shipped: eval gate + calibration + prod stack + public deploy + arc-history close-out.
- **No subagents for SQL writing or code edits** (D16). Plan ships full file content; execute directly with Edit / Write / Bash. Subagents OK for parallel verification probes if you genuinely have independent reads (e.g., grep + curl + docker probes against different surfaces).
- **The Arc 1 ship moment.** This is the highest-stakes phase. If you hit a hard blocker that you can't resolve at a clean boundary, HALT -- do not paper over it to land the commit. The arc-history entry attests Arc 1 shipped; that attestation needs to be honest.

## Phase 8 specifics

- **Scope.** 15 tasks: eval scaffold + runner + calibration + package.json wiring + operator-extends-then-runs + Dockerfile + compose+nginx+env+README + GHCR push + Unraid first-time deploy + prod data load + prod calibration + CF Tunnel/DNS + public smoke + doc updates + final commit. Three substantive sub-arcs:
  - **Arc A (Tasks 1-5):** eval + calibration framework, dev-DB-only.
  - **Arc B (Tasks 6-9):** prod image + compose stack + Unraid first-time setup. No public traffic yet.
  - **Arc C (Tasks 10-15):** prod data load + prod calibration + DNS/CF + public smoke + doc closeout + arc-history entry.
- **Task 1 halts for operator extension.** This is a planned halt, not a blocker. After scaffolding the two JSON files + README.md, surface a "halt for operator: extend eval-queries.json to 10-15 and calibration-queries.json to 5-8 from `#helpdesk` history; D10-disjoint; signal when done" note. Resume Task 2 once the operator confirms the extensions are written.
- **Task 5 dev-DB calibrate + eval are gated on the operator extensions.** Don't bypass with the scaffold-only set; that doesn't exercise enough of the corpus to pass recall@3 >= 70% meaningfully.
- **Task 8 GHCR push needs `gh` + `docker login`.** Before kicking off the build, verify both: `gh auth status` and `docker login ghcr.io` (or check `~/.docker/config.json` for `ghcr.io` credentials). If either fails, halt and ask the operator to fix locally.
- **Task 9 Unraid first-time setup is irreversible-ish.** Once `docker compose -f docker-compose.prod.yml up -d` runs and Postgres initialises with the operator's chosen password, that password gets baked into volume state. Confirm the password with the operator before running `up -d` for the first time.
- **Task 10 prod data load via `pg_dump | pg_restore` (Open question 2 default).** Faster than re-running loaders over Tailscale. Surface the alternative (re-run loaders against prod) if the operator wants reproducibility from raw extractors instead of dev-state replay.
- **Task 11 prod calibration may iterate.** Common pattern: first sweep prints thresholds, operator reviews, you write to `.env`, eval gate runs, gate FAILS by 1-2 queries, operator extends calibration set, sweep again. Don't lock thresholds into `.env` until the operator approves.
- **Task 12 CF Tunnel + DNS is the public-exposure moment.** Once DNS resolves, the MCP is reachable. Confirm with the operator that they're ready before adding the route (Task 13 smoke is the soft launch).
- **Task 13 public smoke uses Claude Desktop / Code.** Provide the operator with: (a) the MCP server URL `https://oracle.slipgate.me/mcp`, (b) the exact prompt ("how do I make my screen stop wobbling"), (c) the expected answer shape (cites `cl_bob` and the `weapon-scripts` concept note). Operator runs; you confirm via `query_log` that the row landed.
- **Task 14 doc updates touch FOUR files:** `apps/qw-oracle/CLAUDE.md` (retire SQLite line), `apps/qw-oracle/OVERVIEW.md` (replace "Layer 2 - state unknown"), root `OVERVIEW.md` (annotate integration map), `apps/qw-oracle/docs/arc-history.md` (Arc 1 ship entry, prepended). Audit each before the Task 15 commit.
- **Task 15 final commit message.** The phase commit message names the arc closeout: `qw-oracle: Phase 8 - eval gate + calibration + Docker prod + Unraid deploy (Arc 1 ship)`. Stage everything (eval/, deploy/, modified docs, deleted helpdesk-*.mjs if applicable). Do NOT push -- orchestrator handles.
- **DEPLOYMENT.md HANDOVER followup.** Post-Task-14, ask the operator: "deploy/README.md is the deploy runbook per the plan; HANDOVER tracks a separate item to lift this to a top-level apps/qw-oracle/DEPLOYMENT.md. Fold into this commit or defer?" Honor the answer. If folded, add the new DEPLOYMENT.md to the commit list.

## Execution shape

15 tasks in plan order:

1. **Task 1: Eval + calibration JSON scaffolds + README.md.** *Halt for operator extension before Task 5.*
2. **Task 2: `eval/eval.ts`.** Reads `eval-queries.json`, runs each query through Phase 6 tools, scores per D11, exits non-zero if recall@3 < 70%.
3. **Task 3: `eval/calibrate.ts`.** Sweeps `MATCH_QUALITY_STRONG_THRESHOLD` / `WEAK_THRESHOLD` against `calibration-queries.json`; prints best pair.
4. **Task 4: package.json scripts (`eval`, `calibrate`); delete `helpdesk-*.mjs` POCs (audit-then-act).**
5. **Task 5: Operator extends eval/calibration files; you run dev-DB sweep + gate.** *Operator-driven halt.*
6. **Task 6: Production Dockerfile + .dockerignore.** Multi-stage Bun image.
7. **Task 7: Production compose (`deploy/docker-compose.prod.yml`) + `deploy/nginx.conf` + `deploy/.env.prod.example` + `deploy/README.md`.**
8. **Task 8: Build + push image to GHCR.** Requires `gh auth status` + `docker login ghcr.io`.
9. **Task 9: First-time Unraid deploy via Tailscale SSH.** Bring up Postgres + MCP + nginx; password-bake moment.
10. **Task 10: Load Layer 1 + 2 + 3 + embeddings into prod Postgres.** `pg_dump | pg_restore` default; loader path is the alternative.
11. **Task 11: Calibrate match-quality thresholds against prod; eval gate.** *Iterative; surface thresholds for operator approval.*
12. **Task 12: CF Tunnel route + DNS CNAME.** *Operator-driven; you provide exact route values.*
13. **Task 13: Public-MCP smoke via Claude Desktop / Code.** *Operator runs; you confirm via query_log.*
14. **Task 14: Doc updates** (CLAUDE.md SQLite line + OVERVIEW.md Layer 2 + root OVERVIEW.md integration map + arc-history.md Arc 1 entry).
15. **Task 15: Final commit + arc closeout.** Surface the DEPLOYMENT.md HANDOVER followup decision.

Then run the full phase-boundary verification block (9 numbered probes against prod). Capture all probe outputs.

## Halt protocol

After all 15 tasks complete and all 9 phase-boundary verification probes have been run, halt with a structured summary:

```
PHASE 8 EXECUTION COMPLETE -- HALTING FOR ORCHESTRATOR REVIEW
ARC 1 SHIPPED (or BLOCKED -- name the blocker)

Tasks: 15/15 complete
Verification: <N>/9 PASS, <K> FAIL (or YELLOW if non-blocking)

Per-task summary (1-2 lines each):
  Task 1 (eval scaffold + README):              <result + operator extensions confirmed?>
  Task 2 (eval/eval.ts):                        <result + dev gate pass/fail>
  Task 3 (eval/calibrate.ts):                   <result + initial threshold pair>
  Task 4 (package.json + helpdesk-*.mjs):       <result + deletion noop or applied>
  Task 5 (dev calibrate + eval):                <result + recall@3 percentage>
  Task 6 (prod Dockerfile):                     <result + image build size>
  Task 7 (compose + nginx + env + README):      <result + 4-file confirmation>
  Task 8 (GHCR push):                           <result + image tag pushed>
  Task 9 (Unraid first-time deploy):            <result + 3 containers up>
  Task 10 (prod data load):                     <result + row counts vs dev>
  Task 11 (prod calibration + eval gate):       <result + final thresholds + recall@3>
  Task 12 (CF Tunnel + DNS):                    <result + DNS resolves?>
  Task 13 (public smoke):                       <result + query_log row + Desktop probe response shape>
  Task 14 (doc updates):                        <result + 4 files touched>
  Task 15 (final commit + DEPLOYMENT.md call):  <result + commit hash + DEPLOYMENT.md decision>

Per-probe summary (each numbered probe in the verification block):
  1. Eval gate against prod:                    <PASS|FAIL + recall@3>
  2. Public health endpoint:                    <PASS|FAIL + curl response>
  3. Public MCP transport:                      <PASS|FAIL>
  4. Production stack healthy:                  <PASS|FAIL + 3 container status>
  5. Migrations applied (prod):                 <PASS|FAIL + count>
  6. Embedding-space sanity stamped (prod):     <PASS|FAIL>
  7. query_log writes flowing (prod):           <PASS|FAIL + row count post-smoke>
  8. Docs reflect post-Arc-1 reality:           <PASS|FAIL>
  9. Phase commit landed:                       <PASS|FAIL + hash>

Voyage usage this phase (cost-watch):
  Calibration sweep tokens (dev + prod):        <count>
  Eval gate tokens (dev + prod):                <count>
  Public smoke tokens:                          <count>
  Total tokens this phase:                      <count>
  Cumulative arc total in api_log:              <count>

Operator touchpoints exercised:
  Task 1 extension confirmed:                   <yes/no + N queries final>
  Task 11 thresholds approved:                  <yes/no + values>
  Task 12 CF Tunnel + DNS opened:               <yes/no + when>
  Task 13 Claude Desktop probe:                 <yes/no + response cited which entities>
  DEPLOYMENT.md fold-or-defer:                  <decision>

Deviations from plan:
  - <list, or "(none)">

Open questions raised during execution:
  - <list, or "(none)">

Commits made:
  <hash> <message>

Do NOT push. Do NOT start a fresh arc. Orchestrator independently verifies, then either:
  - signs off and commits / pushes (you do nothing more)
  - flags issues and asks you to address (you address inline; do not start new work)

If Arc 1 SHIPPED: also surface to the operator that the post-arc analysis is its own
fresh session per orchestrator handoff doc -- new terminal pointed at the spec +
the four phase-executor-prompts + a "did this arc deliver what it set out to" prompt.
```

If you hit a hard blocker mid-execution that you cannot resolve at a clean boundary, halt at the boundary you reached -- DO NOT push past a failure to "see if the next thing works." Phase 8 has more potential blocker classes than earlier phases (image push auth, Tailscale connectivity, CF dashboard, DNS propagation, Claude Desktop config) -- treat each as a discrete operator-resolvable item if it surfaces.

## Operator preferences (durable)

- Verify before asserting. Plain English first, technical chain second. Be decisive -- recommendations not polls.
- One question at a time during operator interaction. Translate option menus into plain consequences.
- ASCII discipline in code + commits + halt summaries + doc edits. No emoji. No em-dashes.
- Comments explain WHY not WHAT.
- The operator does not touch git. All git operations silent on your side.
- Trust operator pace estimates. Surface only concrete blockers.
- Operator's Max subscription is 20x; compute is not the bottleneck. Surface costs only when meaningfully large.
- Voyage 200M-token grant is **lifetime per account**, not monthly recurring. Currently at ~131,715 tokens (~0.066%). Phase 8's eval + calibration adds maybe 5-10k tokens; surface only if cumulative crosses ~5M.

## When in doubt

Halt at a clean boundary and surface to the operator with a concise question. Do not improvise around D-doc rules; do not paper over a probe failure to keep moving. The plan was drafted to be executable as-is and orchestrator-audited; if it isn't, that is information worth surfacing. Phase 8 is the Arc 1 ship -- the bar for "ship it" is the verification block, not "I think it works."
