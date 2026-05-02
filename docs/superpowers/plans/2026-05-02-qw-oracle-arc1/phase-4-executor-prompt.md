You are the Phase 4 executor terminal for qw-oracle Arc 1, taking over from an orchestrator session that just finished verifying Phase 3 inheritance + auditing + amending the Phase 4 plan. Your scope is to execute Phase 4 -- Layer 3 storage + bidirectional graph + chunker -- end-to-end through phase-boundary verification, then halt with a structured summary so the orchestrator can independently verify before sign-off.

Stay in `/home/paradoks/projects/quakeworld` on branch `main`. NO worktree. The operator does not touch git -- you run all git operations silently. No PR menus, no merge prompts, no branch questions.

## Where things are

- **Plan to execute:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-4-layer3-graph.md` (latest version; an orchestrator amendment shipped at commit `be6e9b9` -- read the amended version, not the cached pre-amendment one).
- **Cross-cutting decisions you must respect:** `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` (D1-D18 locked).
- **App-wide always-on rules + tech stack:** `apps/qw-oracle/CLAUDE.md`. The JSONB always-on rule is load-bearing for this phase; read it carefully.
- **Phase 3 subsystem precedent (mirror its style):** `apps/qw-oracle/scripts/load-chat/CLAUDE.md` and the loader files under `apps/qw-oracle/scripts/load-chat/` -- they use the Bun + `import.meta.main` + `tx.json(... as never)` patterns Phase 4 should match.
- **Layer 1 loader precedent (also mirror its style):** `apps/qw-oracle/scripts/load-knowledge/CLAUDE.md` + the per-table loaders.

## Pre-flight (run before reading the plan)

The orchestrator already verified Phase 3 inheritance is intact (8937 entities; 728863 messages classified into chat/reaction/link/bot/system per `message_labels.category`; 86423 sessions; 35157 NULL-session label rows; 15489 reply edges; 4 platform CHECK constraints; 5 JSONB columns clean; tsvector `'simple'`). You do NOT need to re-run those probes. Do run these executor-side checks:

1. **Container up:**
   `docker ps --format "{{.Names}}\t{{.Status}}" | grep qw-oracle-postgres-dev` -- must report `Up ... (healthy)`.
2. **Clean tree:**
   `git status --porcelain` -- must be empty. `git rev-parse --abbrev-ref HEAD` -- must be `main`.
3. **Migrations 001-004 applied (Phase 4 reserves 005):**
   `docker exec -i qw-oracle-postgres-dev psql -U qworacle -d qw_oracle -c "SELECT filename FROM schema_migrations ORDER BY applied_at"` -- must list `001_init.sql`, `002_layer1_schema.sql`, `003_layer1_entities_search.sql`, `004_layer2_chat.sql`. The same query against `qw_oracle_test` must list the same set.
4. **No stale 005 file already present:**
   `ls apps/qw-oracle/db/migrations/` -- must NOT contain `005_layer3_concepts.sql` (you are creating it).
5. **Concept-notes inventory matches plan baseline:**
   `ls apps/qw-oracle/concept-notes/*.md | wc -l` -- expect 13. Of those, 9 carry top-of-file `slug:` frontmatter (gray-matter parses only top-of-file YAML; README.md mentions `slug:` inside a body code block but that does NOT count as frontmatter and the loader correctly skips README.md). The 4 expected to be skipped: `CLAUDE.md`, `README.md`, `OPERATIONS.md`, `_gap-report.md`. The 9 expected to be loaded: `weapon-scripts`, `lightning-gun-customization`, `player-skins`, `kmap-legacy-keymap-system`, `engine-internal-vs-player-facing-files`, `skywind-animated-skyboxes`, `completing-legacy-fte-protocol-extensions`, `client-side-server-exec-allowlist`, `ruleset-anti-script-restriction-pattern`.

If any pre-flight check fails, halt and report -- do NOT proceed.

## Reads in order

1. The Phase 4 plan, top to bottom (current commit `be6e9b9`-or-newer).
2. `decisions.md` -- you can skim D1, D3, D4 (Phase 2 concerns), D9-revised (settled in Phase 3); read D2, D7, D12, D13, D14, D15, D17 carefully -- they constrain Phase 4 directly.
3. The qw-oracle `CLAUDE.md` always-on rules section. Treat the JSONB rule as load-bearing.
4. `apps/qw-oracle/scripts/load-chat/CLAUDE.md` for subsystem-doc shape; the new `scripts/load-concepts/CLAUDE.md` should mirror it.
5. The MCP-side concept reader at `apps/qw-oracle/serve/mcp/src/concept-loader.ts` -- the partition-rule precedent. Phase 4's `partitionRefs` is a broader version (per the plan's documented rationale).

## Critical rules (apply to every file you write)

- **JSONB writes must use `tx.json(value as never)`** -- never `JSON.stringify(value)::jsonb`. The Phase 4 plan's `upsert.ts` code block was already amended to use `tx.json` (orchestrator audit at commit `be6e9b9`), but if you find yourself writing any other JSONB INSERT path, the same rule applies. Phase 2 + Phase 3 codebases (`load-knowledge/load-maps.ts`, `load-chat/import-discord.ts`, etc.) are reference implementations.
- **Bun is the runtime** (D2). All scripts use `bun scripts/.../index.ts`; CLI entry points use `if (import.meta.main)` guards. Tests use `bun test`. No `tsx`, no `ts-node`.
- **Test DB isolation** (D13). The `upsert.test.ts` self-guards: it throws if `DATABASE_URL` does not include `qw_oracle_test`. Run integration tests via `npm run test -- <path>` so the env var is set; never `bun test` directly against the dev DB.
- **Comments explain WHY, not WHAT.** ASCII only. No emoji. No em-dashes / en-dashes -- use `--`. No marketing voice. (D12.)
- **Verify before asserting.** Pre-flight told you the live state. After each task, eyeball the artifact before declaring it done. If the plan ships a code block, paste it as written (it has been verified) but if your IDE / linter flags an issue, halt and ask -- do not silently rewrite.
- **Per-phase atomicity** (D14). Stage all Phase 4 work, then commit ONCE at phase boundary with a message naming what changed. Do not push -- the orchestrator handles push after sign-off.
- **No subagents for SQL writing** (D16). The plan ships full file content; execute directly with Edit / Write / Bash. Subagents are reserved for parallel verification probes if you need them.

## Execution shape

The phase has 6 tasks (numbered in the plan). Recommended order:

1. Task 1 (migration 005) -- write file, run `bun db/migrate.ts`, verify both DBs.
2. Task 2 (`shared/chunking.ts` + tests) -- pure module; tests run without DB.
3. Task 3 (`load-concepts/parse.ts` + tests) -- pure module; tests run without DB.
4. Task 4 (`load-concepts/upsert.ts` + integration tests) -- needs the test DB; verify the JSONB-amended code block matches what's in the plan at commit `be6e9b9`.
5. Task 5 (`load-concepts/index.ts` + package.json edit) -- run `npm install --no-workspaces`, then `npm run load-concepts`.
6. Task 6 (subsystem CLAUDE.md) -- mirror the load-chat doc shape.

Then run the full phase-boundary verification block (12 numbered probes, including the orchestrator-added 9b JSONB regression gate). Capture all probe outputs.

## Halt protocol

After all 6 tasks complete and all 12 verification probes have been run, halt with a structured summary:

```
PHASE 4 EXECUTION COMPLETE -- HALTING FOR ORCHESTRATOR REVIEW

Tasks: 6/6 complete
Verification: <N>/12 PASS, <M>/12 FAIL (or YELLOW if non-blocking)

Per-task summary (1-2 lines each):
  Task 1 (migration 005): <result>
  Task 2 (chunker + tests): <result + "8 tests pass" if green>
  Task 3 (parse + tests):   <result + "15 tests pass" if green>
  Task 4 (upsert + tests):  <result + "5 tests pass" if green>
  Task 5 (index + load):    <result + "loaded 9, skipped 4, warnings <N>" if green>
  Task 6 (CLAUDE.md):       <result>

Per-probe summary (1-2 lines each, all 12 + 9b):
  1. ...
  2. ...
  ...
  9. ...
  9b. concepts.frontmatter jsonb_typeof string scalars: <count>
  10. ...
  ...

Deviations from plan (anything you didn't do exactly as the plan said, with reason):
  - <list, or "(none)">

Open questions raised during execution:
  - <list, or "(none)">

Commits made:
  <hash> <message>

Do NOT proceed to Phase 5. Orchestrator independently verifies, then either:
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

## Cleanup (low priority, do NOT do during Phase 4)

Two stale MCP background processes (PIDs 75998, 80729) still running with pre-Phase-3 `db.ts` in memory. Harmless until Phase 6 touches the MCP server. Phase 4 does not touch the MCP path. Leave them running.

## When in doubt

Halt at a clean boundary and surface to the operator with a concise question. Do not improvise around D-doc rules; do not paper over a probe failure to keep moving. The plan was drafted to be executable as-is; if it isn't, that is information worth surfacing.
