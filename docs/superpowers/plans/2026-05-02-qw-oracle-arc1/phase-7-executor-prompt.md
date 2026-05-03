You are the Phase 7 executor terminal for qw-oracle Arc 1, taking over after the orchestrator signed off Phase 6 (MCP-on-Postgres + hybrid retrieval + 2 new tools + HTTP transport shipped at `08312cc`). Your scope is to execute Phase 7 -- observability (`query_log` table + dispatcher-level wrapper + `OBSERVABILITY.md` cheatsheet) -- end-to-end through phase-boundary verification, then halt with a structured summary so the orchestrator can independently verify before sign-off.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where things are

- **Plan to execute:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-7-observability.md`. **Read the "Orchestrator pre-execution amendment (2026-05-03)" callout block at the top FIRST** -- six fixes were applied to the plan after live-Phase-6 audit caught drift in the dispatcher signatures, the import path, the redirect arg name, and the verification compose-file paths. The body of the plan reflects the fixes; the callout is your map of what changed and why.
- **Cross-cutting decisions you must respect:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked, including the Phase 5 D8 amendment dated 2026-05-03 about input_type='document' on both verifier calls).
- **App-wide always-on rules:** `apps/qw-oracle/CLAUDE.md`. The JSONB rule is not load-bearing for Phase 7 (no JSONB writes; `query_log` is plain text/integer columns). The `bun install` rule is also not triggered -- Phase 7 adds no new deps.
- **The shape of what shipped before Phase 7:**
  - Phase 5 ships `embedding_api_log` (already in place; the loader-side observability table). Phase 7 wires the *query* side.
  - Phase 6 ships the 12-tool MCP server on Postgres + dispatcher in `serve/mcp/src/index.ts`. The dispatcher's current shape is `switch (name) { ... response = await tool(args); break; }` followed by a single `return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };` outside the switch. Task 3 of Phase 7 rewrites this so each `case` returns `dispatchAndLog(...)` directly.
  - Phase 6 did NOT ship inline `INSERT INTO query_log` writes inside any tool. The grep check at the end of Task 3 confirms this; expect zero hits in `serve/mcp/src/tools/`.

## Pre-flight (run before reading the plan)

The orchestrator already verified Phase 6 inheritance is intact (8937 L1 / 5756 with embeddings / 728863 L2 messages / 9 L3 concepts / 115 chunks / 6 redirect_targets / 6 migrations / oracle_meta stamped). You do NOT need to re-run those probes. Do run these executor-side checks:

1. **Container up:**
   `docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev` -- must report `Up ... (healthy)`.
2. **Clean tree on main:**
   `git status --porcelain` -- must be empty. `git rev-parse --abbrev-ref HEAD` -- must be `main`. `git log --oneline -1` -- top commit must be `b52d166` (the Phase 7 amendment) or newer.
3. **Migrations 001-006 applied to both DBs (007 lands in this phase):**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` -- must list 001 through 006 (no 007 yet). Same for `qw_oracle_test`.
4. **VOYAGE_API_KEY present:**
   `grep '^VOYAGE_API_KEY=' apps/qw-oracle/.env | head -1` -- needed for the D8 startup gate (the Phase 5 stamp at `oracle_meta(key='embedding_space_verified_at', value='2026-05-02T22:59:53Z')` may now be past the 24h TTL; if so the first MCP startup re-runs the verifier with one Voyage call, negligible cost).
5. **Phase 6 dispatcher shape sanity:**
   `grep -n "case '" apps/qw-oracle/serve/mcp/src/index.ts | head -15` -- expect 12 cases (lookup_entity, search_entities, get_concept_note, search_solved_issues, lookup_map, search_maps, lookup_gameplay_entity, lookup_mechanic, search_gameplay_entities, search_mechanics, search_concepts, redirect_to_human). If you see a different number or set, halt -- the plan's case-rewrite list assumes this exact set.
6. **No inline query_log writes in tool bodies (Phase 7 Task 3 grep gate, pre-state):**
   `grep -rln "INSERT INTO query_log" apps/qw-oracle/serve/mcp/src/` -- must report zero hits. If any tool body has an inline INSERT, the plan's "wrapper is the only writer" invariant is violated; halt and report which file.

If any pre-flight check fails, halt and report -- do NOT proceed.

## Reads in order

1. The Phase 7 plan top to bottom (`phase-7-observability.md`, ~860 lines including the orchestrator amendment callout at top + 6 open questions at bottom). The callout block (~25 lines) tells you exactly what was fixed; read it first so the body reads cleanly.
2. `decisions.md` -- skim D1-D6 (settled in earlier phases); read D12 (ASCII output discipline -- relevant to the OBSERVABILITY.md prose), D13 (test DB isolation -- relevant to the query-log.test.ts you'll write), D14 (phase atomicity).
3. `apps/qw-oracle/CLAUDE.md` always-on rules.
4. The live `apps/qw-oracle/serve/mcp/src/index.ts` (421 lines) -- you'll edit this in Task 3 to wrap every case in `dispatchAndLog`. Note especially the existing imports block (lines 9-36), the `createServer()` factory shape (lines 81-141), the dispatcher (lines 94-138), and the `TOOL_LIST` (lines 148-398, no edits needed).
5. The live tool function signatures: `serve/mcp/src/tools/lookup-entity.ts:39`, `tools/get-concept-note.ts:26`, `tools/redirect-to-human.ts:14-17`. The plan's case bodies are correct against these post-amendment; do not introduce a `conceptIndex` / `conceptStore` / `topic` arg if your memory drifts back to a pre-Phase-6 shape.
6. `apps/qw-oracle/serve/mcp/src/types.ts` -- the `MatchQuality` union the migration's CHECK aligns to.

## Critical rules (apply to every file you write)

- **Bun is the runtime** (D2). All scripts use `bun ...`. Tests use `bun test`. The new test file `query-log.test.ts` runs via the existing `apps/qw-oracle/package.json` `test` script (which sets `DATABASE_URL=postgresql://qworacle:dev@localhost:5432/qw_oracle_test`). Never run tests against the dev DB.
- **No new deps.** Phase 7 adds nothing. If you find yourself reaching for `bun add`, stop and re-read the plan -- everything Phase 7 needs is already in place from Phase 6 (postgres-js, the SDK, the existing test runner).
- **JSONB rule is not triggered.** `query_log` columns are TEXT / INTEGER / REAL / TIMESTAMPTZ -- no JSONB. The plan's wrapper does `JSON.stringify(response, null, 2)` for the MCP text payload (safe; that's not a DB write).
- **Import path discipline.** `query-log.ts` lives at `serve/mcp/src/`, same depth as `index.ts` and `db.ts`. Import the DB client via `import { db } from './db.ts';` -- the path is the orchestrator-amended form. Do NOT use `'../../shared/db.ts'` (resolves nowhere) or `'../../../shared/db.ts'` (works, but breaks the convention used elsewhere at this depth).
- **Per-query embedding asymmetry stays untouched.** Phase 7 does not touch any tool body's embed call. If you find yourself editing `search-entities.ts` or `search-concepts.ts` for any reason other than the Task 3 grep-gate (which expects zero hits), halt -- you've drifted out of scope.
- **Comments explain WHY, not WHAT.** ASCII only. No emoji. No em-dashes / en-dashes -- use `--`. (D12.)
- **Verify before asserting.** After each task, eyeball the artifact. The plan ships full file content for `query-log.ts`, `query-log.test.ts`, the migration SQL, the `OBSERVABILITY.md` body, and the dispatcher case bodies; paste as written. If your linter / `tsc` flags an issue, halt and ask -- do not silently rewrite.
- **Per-phase atomicity** (D14). Stage all Phase 7 work, then commit ONCE at phase boundary with the message Task 5 specifies. Do not push -- the orchestrator handles push after sign-off.
- **No subagents for SQL writing or code edits** (D16). Plan ships full file content; execute directly with Edit / Write / Bash. Subagents OK for parallel verification probes if you genuinely have independent reads.

## Phase 7 specifics

- **Scope.** This is the smallest phase since Phase 1: 5 tasks, 4 new files, 2 modified files (index.ts + docs/CLAUDE.md). Should run cleanly. The plan estimate from the handoff doc is "fastest phase since Phase 1."
- **Two observability tables, one journal each.** `embedding_api_log` (loader + mcp-query + verify sources, shipped Phase 5) is the *spend* journal. `query_log` (this phase) is the *query* journal. Both are append-only for v1; no triggers, no views, no materialized state. The cheatsheet at `docs/OBSERVABILITY.md` is the entire operator-facing tooling.
- **Dispatcher rewrite is mechanical.** Phase 6's dispatcher uses "switch sets `response`, trailing line wraps it." Phase 7 rewrites every `case` to `return dispatchAndLog(...)`. Twelve cases. The plan ships all 12 case bodies verbatim (post-amendment). Paste as written.
- **`consumer_hint` capture for stdio is single-global.** The MCP `initialized` notification handler calls `setConsumerHint(...)`; for stdio that's one client per process, fine. For HTTP/SSE the wrapper still uses one global -- the *last* client to connect wins. Phase 7's Open Question 5 names this; the plan defers proper per-session capture to a future amendment if Phase 8 traffic shows overlapping concurrent sessions. Do NOT try to thread per-session hints through `dispatchAndLog` in this phase.
- **`OBSERVABILITY.md` indexing.** Per the orchestrator amendment, the doc-index row lands in `apps/qw-oracle/docs/CLAUDE.md` (the docs-subsystem index, sibling to `arc-history.md` / `entity-types.md` / `layer1-extraction-roadmap.md`). NOT the top-level `apps/qw-oracle/CLAUDE.md`. The plan's Task 4 already reflects this; the verification grep target is `apps/qw-oracle/docs/CLAUDE.md`.
- **Open Questions are pre-resolved or stable defaults.** OQ4 (SDK API for `getClientVersion`) was resolved at audit time -- the SDK is `1.29.0` and both `InitializedNotificationSchema` and `server.getClientVersion()` exist. OQ1 (Phase 6 inline INSERTs) is mooted by the pre-flight grep gate above. OQ2 (migration ordinal) is settled -- 007 is correct. OQ3, OQ5, OQ6 are deferred-by-design; do not try to resolve them in-phase.
- **Voyage cost.** Effectively zero. The first MCP startup may re-run the D8 verifier if the Phase 5 stamp is past TTL (1 Voyage call, ~10 tokens). The smoke probe in Task 5 invokes `lookup_entity` (no embedding) and `search_entities` (one per-query embed, ~10-50 tokens). Test runs hit the test DB which has no L1 corpus to query, so most tests don't touch Voyage. Total <1k tokens. Cumulative arc total stays well under the 200M lifetime grant.

## Execution shape

5 tasks in plan order:

1. **Task 1: Migration `007_query_log.sql`.** Create the file, apply to dev + test DBs, verify with `\d+ query_log`.
2. **Task 2: `query-log.ts` wrapper module + `query-log.test.ts`.** Create both files at `serve/mcp/src/`. Import path is `'./db.ts'` (orchestrator-amended). Run the 4-test integration suite against `qw_oracle_test`; expect 4 PASS / 0 FAIL.
3. **Task 3: Wire the dispatcher in `index.ts`.** Add the two new imports (`dispatchAndLog`, `setConsumerHint`, plus `InitializedNotificationSchema`). Register the `initialized` notification handler inside `createServer()`. Replace every `case` body in the `setRequestHandler(CallToolRequestSchema, ...)` switch with `return dispatchAndLog(...)`. Add `summariseFilterArgs` helper for the filter-shaped tools. Run the grep gate -- expect zero `INSERT INTO query_log` hits in tool bodies.
4. **Task 4: `OBSERVABILITY.md` cheatsheet.** Author the file at `apps/qw-oracle/docs/OBSERVABILITY.md` with the 10 sections shipped in the plan. Add the doc-index row to `apps/qw-oracle/docs/CLAUDE.md`. Verify the section count is 10 and the doc-index grep returns >= 1.
5. **Task 5: Phase smoke + commit.** Start the dev MCP server. Invoke `lookup_entity` and `search_entities` (manual MCP probe or via Claude Desktop / Code if running). Verify a row lands in `query_log` with non-null `latency_ms`. Tear down the server. Run `bunx tsc --noEmit` (zero errors) and `bun run test` (all tests pass including the 4 new ones). Stage the 6 files (per the orchestrator-amended commit list) and commit as one atomic phase commit per D14.

Then run the full phase-boundary verification block (6 numbered probes). Capture all probe outputs.

## Halt protocol

After all 5 tasks complete and all 6 phase-boundary verification probes have been run, halt with a structured summary:

```
PHASE 7 EXECUTION COMPLETE -- HALTING FOR ORCHESTRATOR REVIEW

Tasks: 5/5 complete
Verification: <N>/6 PASS, <K> FAIL (or YELLOW if non-blocking)

Per-task summary (1-2 lines each):
  Task 1 (migration 007_query_log.sql):       <result>
  Task 2 (query-log.ts + tests):              <result + tests pass count>
  Task 3 (dispatcher wire-up):                <result + grep-gate hit count>
  Task 4 (OBSERVABILITY.md + doc-index):      <result + section count>
  Task 5 (phase smoke + commit):              <result + smoke probe row landed?>

Per-probe summary (each numbered probe in the verification block):
  1. Migration applied:                       <PASS|FAIL + sha256 prefix>
  2. Table shape correct:                     <PASS|FAIL>
  3. Tests pass:                              <PASS|FAIL + total test count>
  4. Typecheck clean:                         <PASS|FAIL>
  5. Smoke -- live MCP populates query_log:   <PASS|FAIL + tool name + latency_ms>
  6. Inline INSERT INTO query_log purge:      <PASS|FAIL + files listed>

Voyage usage this phase (for cost-watch sanity):
  D8 startup verify re-run (TTL expired?):    <count + tokens>
  mcp-query rows added during smoke:          <count>
  Total tokens consumed this phase:           <count>
  Cumulative arc total in api_log:            <count>

Deviations from plan (anything you didn't do exactly as the plan said, with reason):
  - <list, or "(none)">

Open questions raised during execution:
  - <list, or "(none)">

Commits made:
  <hash> <message>

Do NOT proceed to Phase 8. Orchestrator independently verifies, then either:
  - signs off and commits / pushes (you do nothing more)
  - flags issues and asks you to address (you address inline; do not start new work)
```

If you hit a hard blocker mid-execution, halt at the boundary you reached -- DO NOT push past a failure to "see if the next thing works." The plan + decisions.md + the orchestrator amendment block are the contract; deviating without operator approval breaks the per-phase atomicity invariant.

## Operator preferences (durable)

- Verify before asserting. Plain English first, technical chain second. Be decisive -- recommendations not polls.
- One question at a time during operator interaction. Translate option menus into plain consequences.
- ASCII discipline in code + commits + halt summaries. No emoji. No em-dashes.
- Comments explain WHY not WHAT.
- The operator does not touch git. All git operations silent on your side.
- Trust operator pace estimates. Surface only concrete blockers.

## When in doubt

Halt at a clean boundary and surface to the operator with a concise question. Do not improvise around D-doc rules; do not paper over a probe failure to keep moving. The plan was drafted to be executable as-is and orchestrator-audited; if it isn't, that is information worth surfacing.
