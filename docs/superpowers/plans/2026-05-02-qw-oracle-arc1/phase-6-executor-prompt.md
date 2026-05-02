You are the Phase 6 executor terminal for qw-oracle Arc 1, taking over after the orchestrator signed off Phase 5 (Voyage embedding pipeline + D8/F14 verifier shipped at `ffe681b`). Your scope is to execute Phase 6 -- MCP rewrite, hybrid retrieval, two new tools, HTTP transport -- end-to-end through phase-boundary verification, then halt with a structured summary so the orchestrator can independently verify before sign-off.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where things are

- **Plan to execute:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-6-mcp-rewrite.md` (current commit; no orchestrator amendments needed for Phase 6 -- the audit found no critical issues).
- **Cross-cutting decisions you must respect:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked, including the Phase 5 D8 amendment dated 2026-05-03 about input_type='document' on both verifier calls).
- **App-wide always-on rules:** `apps/qw-oracle/CLAUDE.md`. The JSONB rule is not load-bearing for Phase 6 (no JSONB writes; only safe JSON.stringify for MCP text payloads + Voyage HTTP body). The `bun install` rule IS load-bearing for the new express dep in `serve/mcp/package.json`.
- **The shape of what shipped before Phase 6:**
  - Phase 4 ships the Layer 3 tables + chunker + load-concepts loader.
  - Phase 5 ships the Voyage client (`shared/embedding.ts`), the D8/F14 standalone verifier CLI, and the embed-entities + embed-chunks pipelines. As of sign-off: 5756 entity descriptions and 115 concept chunks have 1024-dim vectors stored in Postgres. The `oracle_meta(key='embedding_space_verified_at')` row is stamped to 2026-05-02T22:59:53Z.
  - Phase 5 amended D8 mid-execution: the verifier holds `input_type='document'` on both calls (model-size axis only). Production code in `embed-entities.ts` uses `'document'`; Phase 6 uses `'query'` for per-query embeddings -- this asymmetry is the intended retrieval design and is NOT a bug.

## Pre-flight (run before reading the plan)

The orchestrator already verified Phase 5 inheritance is intact (5756 L1 + 115 L3 vectors / oracle_meta stamped / 131,682 tokens consumed / migration 006 in both DBs). You do NOT need to re-run those probes. Do run these executor-side checks:

1. **Container up:**
   `docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev` -- must report `Up ... (healthy)`.
2. **Clean tree:**
   `git status --porcelain` -- must be empty. `git rev-parse --abbrev-ref HEAD` -- must be `main`. `git log --oneline -1` -- top commit should be `ffe681b` or newer.
3. **Migrations 001-006 applied to both DBs:**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` -- must list 001 through 006. Same for `qw_oracle_test`.
4. **Voyage state ready:**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT count(*) FILTER (WHERE description_embedding IS NOT NULL) AS l1_emb, (SELECT count(*) FILTER (WHERE embedding IS NOT NULL) FROM concept_chunks) AS l3_emb FROM entities"` -- expect `l1_emb=5756`, `l3_emb=115`. If either is 0, Phase 5 didn't actually embed -- halt.
5. **VOYAGE_API_KEY present:**
   `grep '^VOYAGE_API_KEY=' apps/qw-oracle/.env | head -1` -- needed for the per-query embedding path in `search_entities` / `search_concepts` and for the D8 startup gate when its TTL expires. Tests are gated on it.
6. **Stale MCP background processes:**
   `ps -p 75998 80729 -o pid,cmd 2>/dev/null` -- the orchestrator handoff mentioned these PIDs but they are already reaped (system-cleanup). If by chance they're alive again on your machine, kill them with `kill <pid>` before Task 1 -- old processes hold the stubbed db.ts in memory and could collide with the rewrite.
7. **Existing serve/mcp shape sanity:**
   `ls apps/qw-oracle/serve/mcp/src/` -- expect: `concept-loader.ts` (Phase 6 deletes), `db.ts` (Phase 6 rewrites), `entity-record.ts` (Phase 6 rewrites), `index.ts` (Phase 6 rewrites), `tools/` (Phase 6 rewrites every tool), `types.ts` (Phase 6 modifies), `version.ts` (Phase 6 leaves).

If any pre-flight check fails, halt and report -- do NOT proceed.

## Reads in order

1. The Phase 6 plan, top to bottom (`phase-6-mcp-rewrite.md`, ~2777 lines -- the largest phase in the arc; budget the time).
2. `decisions.md` -- skim D1-D6 (settled in earlier phases); read D7 (tsvector configs: 'simple' for L2 chat, 'english' for L1 entity descriptions and L3 concept chunks -- both reads matter in Phase 6's queries), D8 (with the 2026-05-03 amendment about input_type='document' on the verifier), D13 (test DB isolation), D14 (phase atomicity), D17 (open questions tracked, not improvised).
3. `apps/qw-oracle/CLAUDE.md` always-on rules.
4. `apps/qw-oracle/shared/embedding.ts` -- the Phase 5 client. Note especially the comment block above `verifyEmbeddingSpace` warning future readers not to revert the input_type='document' fix. Phase 6's MCP startup imports this verifier as-is; do not reach into the helper to re-query input_type semantics.
5. The live `apps/qw-oracle/serve/mcp/src/db.ts` to see the current tripwire stub (`makeStub('knowledge.db')`) -- you replace this with a re-export of the shared client in Task 1.
6. The live `apps/qw-oracle/serve/mcp/src/index.ts` so you understand the existing dispatcher shape Task 9 refactors.

## Critical rules (apply to every file you write)

- **Bun is the runtime** (D2). All scripts use `bun ...`; CLI entry points use `if (import.meta.main)` guards. Tests use `bun test`. No `tsx`, no `ts-node`.
- **`bun install` for deps** (post-Phase-4 always-on rule). Phase 6 adds `express ^5.2.1` and `@types/express ^5.0.0` to `apps/qw-oracle/serve/mcp/package.json` (Task 1 + Task 10). Run `bun install` from inside `apps/qw-oracle/serve/mcp/` after editing that subpackage's `package.json`. The outer `apps/qw-oracle/package.json` only needs the `seed:redirect-targets` script entry; no new deps there.
- **Test DB isolation** (D13). Integration tests must hit `qw_oracle_test`. Run via `npm run test -- <path>` so DATABASE_URL gets set; never `bun test` directly against the dev DB.
- **JSONB writes (when they happen)** must use `tx.json(value as never)`. Phase 6 has no JSONB writes in production code -- the redirect_targets seed uses TEXT columns only, and the JSON.stringify call you'll see at Task 6 line 1822 is for an MCP text-response payload (safe), not a JSONB column.
- **Per-query embedding asymmetry is correct.** When porting search_entities and search_concepts, the per-query embed call uses `input_type='query'` (production retrieval design). The verifier in `shared/embedding.ts` uses `'document'` on both calls (model-size axis test). Do NOT change either. The Phase 5 amendment block in `phase-5-embeddings.md` and the D8 amendment in `decisions.md` explain why.
- **Comments explain WHY, not WHAT.** ASCII only. No emoji. No em-dashes / en-dashes -- use `--`. (D12.)
- **Verify before asserting.** After each task, eyeball the artifact. The plan ships full file content in many tasks; paste as written but if your linter / tsc flags an issue, halt and ask -- do not silently rewrite.
- **Per-phase atomicity** (D14). Stage all Phase 6 work, then commit ONCE at phase boundary with a message naming what changed. Do not push -- the orchestrator handles push after sign-off.
- **No subagents for SQL writing** (D16). Plan ships full file content; execute directly with Edit / Write / Bash. Subagents OK for parallel verification probes if you need them.

## Phase 6 specifics

- **Scope.** This is the largest phase (12 tasks vs 4-6 in earlier phases). Two new tools (`search_concepts`, `redirect_to_human`) + 8 existing tools rewritten + new HTTP transport + dispatcher refactor + D8 startup gate + RRF helper + concept-loader retirement.
- **First phase that's user-facing.** When Phase 6 ships, slipgate-app and any other MCP client can actually query qw-oracle again. Phases 2-5 left the MCP server intentionally non-functional (db.ts was a tripwire stub since Phase 2/3). Phase 6 cuts it back online.
- **Two transports.** Stdio (default, Claude Desktop / Claude Code) and Streamable HTTP (`MCP_TRANSPORT=http MCP_PORT=3000 bun serve/mcp/src/index.ts`). The HTTP transport binds to 127.0.0.1; Phase 8 puts nginx + Cloudflare Tunnel in front. Phase 6 does NOT add app-level auth -- per D5, the public MCP relies on per-IP CF rate limiting.
- **D8 startup gate has a TTL.** Default 24h via `EMBEDDING_VERIFY_TTL_HOURS`. Warm restarts within the window skip the API call. Below threshold: server refuses to start. Voyage outage on first verify: server logs WARN and continues in lexical-only mode (degraded but not fatal). The Phase 5 stamp at `oracle_meta(key='embedding_space_verified_at', value='2026-05-02T22:59:53Z')` will be ~24h old by the time you run Phase 6 -- expect the first MCP startup to re-run the verifier (1 Voyage call, negligible cost).
- **redirect_targets seed has placeholder URLs.** The Discord guild/channel/user IDs are `REPLACE_GUILD_ID` etc. Operator fills them before Phase 8 deploy. Task 7 acknowledges this; do not invent values.
- **Test surface.** Task 11 ports tests for all 8 existing tools to postgres-js + adds tests for the 2 new tools. Expect ~25-30 tests total in `serve/mcp/`.
- **Voyage cost.** Per-query embeddings are ~10-50 tokens each via voyage-4-lite. Test runs hit Voyage maybe 10-20 times. Total <1k tokens. Plus the D8 startup re-run (~10 tokens). Negligible.

## Execution shape

12 tasks in plan order:

1. Task 1: Port `db.ts` to shared postgres-js client; delete `concept-loader.ts`; remove better-sqlite3 from `serve/mcp/package.json`; add express.
2. Task 2: Reciprocal rank fusion helper at `shared/rrf.ts`.
3. Task 3: Port read-only fact-lookup tools (lookup-entity, lookup-map, search-maps, lookup-mechanic, search-mechanics, lookup-gameplay-entity, search-gameplay-entities) to postgres-js.
4. Task 4: Upgrade `search_entities` to hybrid RRF (tsvector + pgvector + Voyage per-query embed).
5. Task 5: Upgrade `get_concept_note` to read from `concepts` + surface `related_concepts`.
6. Task 6: New tool `search_concepts` (hybrid RRF over `concept_chunks`).
7. Task 7: New tool `redirect_to_human` + seed `redirect_targets` (6 placeholder rows).
8. Task 8: Server orientation instructions string at `serve/mcp/src/orientation.ts`.
9. Task 9: Refactor `index.ts` -- createServer factory + dispatcher + tool registration + D8 startup gate.
10. Task 10: Streamable HTTP transport at `serve/mcp/src/transports/http.ts` (Express + SDK's StreamableHTTPServerTransport).
11. Task 11: Port existing tool tests + write tests for 2 new tools.
12. Task 12: Phase commit + operator-driven smoke (the canonical "screen wobble" query from Arc 1's origin).

Then run the full phase-boundary verification block. Capture all probe outputs.

## Halt protocol

After all 12 tasks complete and all phase-boundary verification probes have been run, halt with a structured summary:

```
PHASE 6 EXECUTION COMPLETE -- HALTING FOR ORCHESTRATOR REVIEW

Tasks: 12/12 complete
Verification: <N>/<M> PASS, <K> FAIL (or YELLOW if non-blocking)

Per-task summary (1-2 lines each):
  Task 1 (db.ts port + concept-loader delete):  <result>
  Task 2 (RRF helper):                           <result + tests pass count>
  Task 3 (read-only tool ports):                 <result + which tools ported>
  Task 4 (search_entities hybrid):               <result + smoke query result if applicable>
  Task 5 (get_concept_note rewrite):             <result>
  Task 6 (search_concepts new tool):             <result>
  Task 7 (redirect_to_human + seed):             <result + row count after seed>
  Task 8 (orientation instructions):             <result>
  Task 9 (index.ts refactor + D8 gate):          <result + verify outcome on first start>
  Task 10 (HTTP transport):                      <result + /health response>
  Task 11 (test ports + new tests):              <result + total test count>
  Task 12 (phase commit + smoke):                <result + smoke query response>

Per-probe summary (each numbered probe in the verification block):
  1. ...
  2. ...
  ...

Voyage usage this phase (for cost-watch sanity):
  mcp-query rows added to embedding_api_log: <count>
  verify rows added (D8 startup re-run if TTL expired): <count>
  Total tokens consumed this phase: <count>
  Cumulative arc total in api_log: <count>

Deviations from plan (anything you didn't do exactly as the plan said, with reason):
  - <list, or "(none)">

Open questions raised during execution:
  - <list, or "(none)">

Commits made:
  <hash> <message>

Do NOT proceed to Phase 7. Orchestrator independently verifies, then either:
  - signs off and commits / pushes (you do nothing more)
  - flags issues and asks you to address (you address inline; do not start new work)
```

If you hit a hard blocker mid-execution, halt at the boundary you reached -- DO NOT push past a failure to "see if the next thing works." The plan + decisions.md are the contract; deviating without operator approval breaks the per-phase atomicity invariant.

## Operator preferences (durable)

- Verify before asserting. Plain English first, technical chain second. Be decisive -- recommendations not polls.
- One question at a time during operator interaction. Translate option menus into plain consequences.
- ASCII discipline in code + commits + halt summaries. No emoji. No em-dashes.
- Comments explain WHY not WHAT.
- The operator does not touch git. All git operations silent on your side.
- Trust operator pace estimates. Surface only concrete blockers.

## When in doubt

Halt at a clean boundary and surface to the operator with a concise question. Do not improvise around D-doc rules; do not paper over a probe failure to keep moving. The plan was drafted to be executable as-is and orchestrator-audited; if it isn't, that is information worth surfacing.
