You are the Phase 5 executor terminal for qw-oracle Arc 1, taking over after the orchestrator signed off Phase 4 (Layer 3 storage + bidirectional graph + chunker shipped at `dd9a181`; post-Phase-4 doc-drift cleanup at `eeab23d`). Your scope is to execute Phase 5 -- Voyage embedding pipeline + D8/F14 verifier -- end-to-end through phase-boundary verification, then halt with a structured summary so the orchestrator can independently verify before sign-off.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where things are

- **Plan to execute:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-5-embeddings.md` (current commit; no orchestrator amendments needed for Phase 5).
- **Cross-cutting decisions you must respect:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked). Especially relevant for Phase 5: D2 (Bun), D8 (embedding-space verification at startup; this phase ships the verifier), D12 (ASCII discipline), D13 (test DB isolation), D14 (phase atomicity), D15 (verification at boundaries), D17 (open questions tracked, not improvised).
- **App-wide always-on rules + tech stack:** `apps/qw-oracle/CLAUDE.md`. Updated post-Phase-4: `bun install` (not npm) for deps; tech-stack section now lists load-chat + load-concepts; "Postgres for L1+L2+L3 (post-Phase-4)" -- Phase 5 keeps that line accurate (no new layer; just adds vectors to existing tables + one new log table).
- **Phase 4 subsystem precedent (closely mirror):** `apps/qw-oracle/scripts/load-concepts/CLAUDE.md` + the loader files. The new `scripts/embed/` subsystem doc should mirror this shape if Phase 5 ships one (the plan does not require a CLAUDE.md for `scripts/embed/`; if you find yourself wanting one, add it -- it's free and load-bearing for future executors).
- **Voyage API key** is in `apps/qw-oracle/.env` (`VOYAGE_API_KEY`). The pre-flight will confirm. Tests are gated on it (`describe.skipIf(!HAS_KEY)`), so a missing key skips integration tests cleanly but blocks the actual embed run.

## Pre-flight (run before reading the plan)

The orchestrator already verified Phase 4 inheritance is intact (9 concepts / 115 chunks / 82 entity edges / 0 sibling links / 5 new tables in both DBs / JSONB regression gate clean). You do NOT need to re-run those probes. Do run these executor-side checks:

1. **Container up:**
   `docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev` -- must report `Up ... (healthy)`.
2. **Clean tree:**
   `git status --porcelain` -- must be empty. `git rev-parse --abbrev-ref HEAD` -- must be `main`. `git log --oneline -1` -- top commit should be `eeab23d` or newer (the post-Phase-4 doc-drift cleanup).
3. **Migrations 001-005 applied (Phase 5 reserves 006):**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` -- must list `001_init.sql` through `005_layer3_concepts.sql`. Same for `qw_oracle_test`.
4. **No stale 006 file already present:**
   `ls apps/qw-oracle/db/migrations/` -- must NOT contain `006_embedding_api_log.sql` (you are creating it).
5. **VOYAGE_API_KEY available:**
   `grep '^VOYAGE_API_KEY=' apps/qw-oracle/.env | head -1` -- must show a `pa-...` value, not empty. If missing, halt and ask -- Phase 5 cannot run the integration tests or the live embed pass without it.
6. **Phase 4 entity-description coverage:**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT count(*) FILTER (WHERE description IS NOT NULL AND length(description) > 0) FROM entities"` -- expect a number near ~8000-9000. If 0, Phase 2's description derivation never ran and Phase 5's first run will embed nothing. Halt if 0.

If any pre-flight check fails, halt and report -- do NOT proceed.

## Reads in order

1. The Phase 5 plan, top to bottom (`phase-5-embeddings.md`, ~1314 lines; large but coherent).
2. `decisions.md` -- skim D1-D6 (settled in earlier phases); read D8 (embedding-space verification, this phase's main deliverable), D13 (test DB isolation; both Phase 5 integration tests refuse to run against any DB whose URL doesn't include `qw_oracle_test`), D17 (open questions section is mandatory).
3. `apps/qw-oracle/CLAUDE.md` always-on rules -- the JSONB rule is not load-bearing for Phase 5 (the plan has no JSONB writes that pre-stringify; the only `'{}'::jsonb` in the test seed is a literal-SQL empty object, safe). The `bun install` rule IS load-bearing -- use `bun install` to add fetch-runtime deps if any need installing (Phase 5 does not add new package deps; the Voyage call uses native `fetch`).
4. `apps/qw-oracle/scripts/load-concepts/CLAUDE.md` for subsystem-doc shape (precedent if you decide to add one for `scripts/embed/`).
5. The live `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` and `apps/qw-oracle/scripts/load-concepts/index.ts` -- you will modify both. The plan's text says "BEFORE closeDb()" but the live extract-tag.ts function ends with a `return { ... }` block and does NOT call closeDb (that's in a higher-level CLI runner). Read both files first, then place the embed hook before the return block in extract-tag and inside the CLI block (between `loadAllConcepts()` and `closeDb()`) in load-concepts/index.ts.

## Critical rules (apply to every file you write)

- **Bun is the runtime** (D2). All scripts use `bun scripts/.../index.ts`; CLI entry points use `if (import.meta.main)` guards. Tests use `bun test`. No `tsx`, no `ts-node`.
- **Test DB isolation** (D13). Both `embed-entities.test.ts` and `embed-chunks.test.ts` self-guard: they throw if `DATABASE_URL` does not include `qw_oracle_test`. Run integration tests via `npm run test -- <path>` so the env var is set; never `bun test` directly against the dev DB.
- **`bun install` for deps** (post-Phase-4 always-on rule). Phase 5 does not add new package deps, but if you discover one is needed, use bun, not npm.
- **JSONB writes (when they happen)** must use `tx.json(value as never)`. Phase 5 has no JSONB writes in production code; the test seed uses literal `'{}'::jsonb` which is safe. If you find yourself adding a JSONB write outside the plan, the rule applies.
- **Comments explain WHY, not WHAT.** ASCII only. No emoji. No em-dashes / en-dashes -- use `--`. No marketing voice. (D12.)
- **Verify before asserting.** Pre-flight told you the live state. After each task, eyeball the artifact before declaring it done. If the plan ships a code block, paste it as written (it has been verified by the drafter sub-agent + orchestrator audit) but if your linter flags an issue, halt and ask -- do not silently rewrite.
- **Per-phase atomicity** (D14). Stage all Phase 5 work, then commit ONCE at phase boundary with a message naming what changed. Do not push -- the orchestrator handles push after sign-off.
- **No subagents for SQL writing** (D16). Plan ships full file content; execute directly with Edit / Write / Bash. Subagents are reserved for parallel verification probes if you need them.

## Phase 5 specifics

- **Cost.** Voyage `voyage-4-large` is currently in the free tier (200M tokens/month). Phase 5's first run embeds ~8000-9000 entity descriptions × ~50 tokens each ~= 400k-450k tokens, plus ~115 chunks × ~200 tokens ~= 23k tokens, plus 2 verifier calls. Total well under 1M tokens, ~0.5% of the monthly free envelope. Surface only if the actual run blows past 5M tokens or returns a billing-related error.
- **Failure semantics are by design.** If Voyage rejects a batch, the affected rows are flagged stale (`description_embedding_stale = TRUE` for entities, `embedding_stale = TRUE` for chunks) and lexical search continues working. Do not retry the same batch in-pipeline -- the next pass picks stale rows up automatically. This is per spec (architecture-design.md lines 433-451).
- **D8 verifier is shipped as a standalone CLI** in this phase. Phase 6 wires it into MCP startup. Phase 5 only needs it to exit 0 when run directly + stamp `oracle_meta(key='embedding_space_verified_at')` + log a `'verify'`-source row pair into `embedding_api_log`.
- **Hash-skip semantics.** The entity pass computes `sha256(description)` in JS and compares against `description_embedding_sha256`. Only changed-text rows are re-embedded. Verification step 5 is the regression gate: second run reports `embedded=0`. The chunker pass uses Phase 4's `embedding_stale` flag + `embedding IS NULL` predicate -- no in-JS hash compare needed because Phase 4's loader already manages the stale signal.
- **embed-entities.ts dead-code conditional** at the embedding_metadata upsert site (plan lines 648-651) -- both branches of the `versionLabel` ternary return `buildModel`. The plan's intent is "always store the configured alias, response model is captured per-call in api_log." Feel free to simplify to `const versionLabel = buildModel;` (or just inline `buildModel` directly) -- this is a cleanup, not a behavior change.

## Execution shape

The phase has 5 tasks (numbered in the plan). Recommended order:

1. Task 1 (migration `006_embedding_api_log.sql`) -- write file, run `bun db/migrate.ts` against both DBs, verify table shape + CHECK enum.
2. Task 2 (`shared/embedding.ts` + tests) -- pure module + integration test; tests gated on VOYAGE_API_KEY.
3. Task 3 (`scripts/embed/verify-embedding-space.ts` standalone CLI) -- D8/F14 closure; run it once against dev DB, confirm cosine + oracle_meta stamp + api_log rows.
4. Task 4 (`embed-entities.ts` + extract-tag hook + tests) -- write the pass, hook into extract-tag.ts BEFORE its return block, run end-to-end against dev DB (~8-9k entities, expect ~150 batches, sub-5-min wall time).
5. Task 5 (`embed-chunks.ts` + load-concepts hook + tests) -- write the pass, hook into load-concepts/index.ts inside the CLI block, run against dev DB (~115 chunks, sub-second wall time).

Then run the full phase-boundary verification block (11 numbered probes). Capture all probe outputs.

## Halt protocol

After all 5 tasks complete and all 11 verification probes have been run, halt with a structured summary:

```
PHASE 5 EXECUTION COMPLETE -- HALTING FOR ORCHESTRATOR REVIEW

Tasks: 5/5 complete
Verification: <N>/11 PASS, <M>/11 FAIL (or YELLOW if non-blocking)

Per-task summary (1-2 lines each):
  Task 1 (migration 006):     <result>
  Task 2 (embedding client):  <result + "6 tests pass" if green>
  Task 3 (verify CLI):        <result + "cosine=<value> threshold=0.85" if green>
  Task 4 (embed-entities):    <result + "embedded=<N> failed=<M> total=<K>" if green>
  Task 5 (embed-chunks):      <result + "embedded=<N> failed=<M> remaining_null=0" if green>

Per-probe summary (1-2 lines each, all 11):
  1. Migrations applied to both DBs:    <result>
  2. embedding_api_log shape + CHECK:   <result>
  3. F14/D8 cosine + oracle_meta stamp: <result>
  4. Entity coverage missed=0:          <result>
  5. Entity hash-skip embedded=0:       <result>
  6. Chunk coverage without_emb=0:      <result>
  7. Chunk stale-flag re-embed:         <result>
  8. embedding_metadata reflects build: <result>
  9. embedding_api_log source mix:      <result>
  10. Tests green:                      <result + total test count>
  11. Type check (bunx tsc --noEmit):   <result>

Voyage usage this phase (for cost-watch sanity check):
  Total input_tokens across all rows in embedding_api_log this run: <count>
  Approximate cost (voyage-4-large at $0.18/M tokens): $<value>

Deviations from plan (anything you didn't do exactly as the plan said, with reason):
  - <list, or "(none)">

Open questions raised during execution:
  - <list, or "(none)">

Commits made:
  <hash> <message>

Do NOT proceed to Phase 6. Orchestrator independently verifies, then either:
  - signs off and commits / pushes (you do nothing more)
  - flags issues and asks you to address (you address inline; do not start new work)
```

If you hit a hard blocker mid-execution (a probe fails in a way that suggests a real bug, or a code path the plan didn't anticipate), halt at the boundary you reached -- DO NOT push past a failure to "see if the next thing works." The plan + decisions.md are the contract; deviating without operator approval breaks the per-phase atomicity invariant.

## Operator preferences (durable)

- Verify before asserting. Plain English first, technical chain second. Be decisive -- recommendations not polls.
- One question at a time during operator interaction. Translate option menus into plain consequences.
- ASCII discipline in code + commits + halt summaries. No emoji. No em-dashes.
- Comments explain WHY not WHAT.
- The operator does not touch git. All git operations silent on your side.
- Trust operator pace estimates. Surface only concrete blockers.
- The operator's Max subscription is 20x. They can chew through compute for quality verification without budget concerns; surface costs only when meaningfully large or surprising.

## Cleanup (low priority, do NOT do during Phase 5)

Two stale MCP background processes (PIDs 75998, 80729) still running with pre-Phase-3 `db.ts` in memory. Harmless until Phase 6 touches the MCP server. Phase 5 does not touch the MCP path. Leave them running. (Phase 6 should kill them with `kill 75998 80729` if they still exist at that point.)

## When in doubt

Halt at a clean boundary and surface to the operator with a concise question. Do not improvise around D-doc rules; do not paper over a probe failure to keep moving. The plan was drafted to be executable as-is and orchestrator-audited; if it isn't, that is information worth surfacing.
