# Phase 2 executor prompt -- arc 2026-06-05-qtv-qwfwd-l1-extraction

You are the **arc-executor** for **Phase 2 -- QTV Go extractor (`go/ast`)** -- the pipeline's first non-C front-end. Invoke the `arc-executor` skill and execute this phase against its MD. This is **execution**: you write a standalone Go AST extractor, run it, load output into Postgres via the (CORRECTED) `load-version` recipe, and run the boundary probes.

**Arc identity (halt if this does not match):** arc `2026-06-05-qtv-qwfwd-l1-extraction`; scaffold at `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are adding the Go QTV streaming proxy (`qtv`, `QW-Group/qtv`) to qw-oracle Layer 1. Wrong-arc guard: if the material is about KTX/MVDSV describe-fill codes or `mvdsv-*-ledger-*.md`, STOP.

**Working directory:** `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`).

## PREREQUISITE GATE -- Go is installed; just confirm your shell can see it

Go **1.24.4 is installed at `/usr/local/go/bin`** (orchestrator-verified 2026-06-06; satisfies qtv/go.mod's `go 1.24.0`). Confirm your shell finds it:

```bash
go version || { export PATH="$PATH:/usr/local/go/bin"; go version; }
```

If bare `go` is not on your Bash-tool PATH (non-interactive shells early-return in `~/.bashrc` before its PATH line), use `/usr/local/go/bin/go` directly, OR prepend `export PATH="$PATH:/usr/local/go/bin" && ` to each `go` command below. Each Bash-tool call is a FRESH shell, so set PATH per-call (an `export` in one call does not carry to the next). Do NOT halt for a missing-Go reason -- it is installed; this is only a PATH-visibility concern.

## Read first (in this order)

1. `.../README.md`
2. `.../decisions.md` -- D1, D4 **(read its 2026-06-06 F12 Amendment -- head+tag load, NOT one versions row)**, D5, D7, D11.
3. `.../review-findings.md` -- **Phase 2 owns F2, F5, F7, and F12 (LOAD-BEARING: inherit the corrected 8-call/per-project head+tag recipe -- for QTV that is 4 calls)**.
4. `.../phase-2-qtv-extractor.md` -- the phase MD. Read cold, critically review. **EXCEPTION (do not follow the MD verbatim here): the MD's Task-2 load recipe is the OLD tag-only recipe (2 calls). It is superseded by F12 -- use the corrected head+tag recipe below.** Everything else in the MD (the Go extractor spec, JSON contract, V-probes) stands.

## Orchestrator pre-flight (already confirmed)

- **Phase 0 + Phase 1 SHIPPED + independently re-verified green.** Schema accepts qtv; the `load-version --json` path is proven end-to-end (QWFWD: 50 rows source_backed); `tsc --noEmit` exit 0; `build-snapshot.ts` has `qwfwd: '1.40-dev'` and `qtv: 'head'` (provisional -- your Task 3 updates qtv).
- QTV recon (from the MD, grep-verified): version label `qtvRelease = "1.16-dev"` (`pkg/qtv/qtv.go:29`); **41 cvars + 12 commands**, 0 cmdline_param, 0 info_key. No `.git` (D4/F5: `--commit 1.16-dev` sentinel).

## CRITICAL -- the F12-corrected load recipe (use THIS, not the MD's Task 2)

The MD Task-2 recipe loads tag-only, which would mark every QTV entity `source_retired` (the entity-state-retreat block retires any entity whose max ordinal is below `HEAD_ORDINAL`). Load each type TWICE -- `head` first, then the tag -- both `--commit 1.16-dev`. This matches the qwcl precedent and exactly what Phase 1 did for qwfwd.

```bash
# Step 0: build the extractor output (from the qtv extractor dir, which carries its own go.mod)
# If bare `go` is not on PATH, prepend:  export PATH="$PATH:/usr/local/go/bin" &&
cd apps/qw-oracle/scripts/extractors/qtv
go run . --src ../../../../slipgate-app/reference/qtv --out output
ls -la output/    # qtv-variables-ast.json (vars) + qtv-commands-ast.json (commands)

# Step 1: cvars -- HEAD first (no --ordinal; head auto-resolves to HEAD_ORDINAL), then TAG
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
bun scripts/load-knowledge/index.ts load-version --project qtv --version head     --type cvar    --json scripts/extractors/qtv/output/qtv-variables-ast.json --commit 1.16-dev
bun scripts/load-knowledge/index.ts load-version --project qtv --version 1.16-dev --type cvar    --json scripts/extractors/qtv/output/qtv-variables-ast.json --commit 1.16-dev --ordinal 1

# Step 2: commands -- HEAD first, then TAG
bun scripts/load-knowledge/index.ts load-version --project qtv --version head     --type command --json scripts/extractors/qtv/output/qtv-commands-ast.json --commit 1.16-dev
bun scripts/load-knowledge/index.ts load-version --project qtv --version 1.16-dev --type command --json scripts/extractors/qtv/output/qtv-commands-ast.json --commit 1.16-dev --ordinal 1
```

End state (matches qwfwd): `versions = {1.16-dev ord1, head ord999999}`, all 53 entities `source_backed`. Idempotent on re-run (head-first order avoids spurious `removed_from_head` churn).

## Carry-forwards to act on

- **Task 3:** update `build-snapshot.ts` `PROJECT_DEFAULT_SNAPSHOT_VERSION.qtv` from `'head'` to `'1.16-dev'` (verified `pkg/qtv/qtv.go:29`). Then `tsc --noEmit` (V9).
- **--ordinal:** present only on the TAG loads (`--ordinal 1`); the `head` loads take no `--ordinal`.

## CROSS-PHASE OBLIGATION -- report the per-type counts (-> Phase 4 QTV_FLOOR_PROBES)

QTV's counts are expected to be exactly **cvar=41, command=12** (Phase-2 V4 hardcoded + grep-verified), but per F7 the extractor's live count is truth. After load, capture:
```sql
SELECT type, source_state, count(*) FROM entities WHERE project='qtv' GROUP BY type, source_state ORDER BY type;
```
**Put the exact cvar/command counts (and confirm all source_backed) in your halt report.** They become Phase 4's `QTV_FLOOR_PROBES` baselines. If the live count differs from 41/12, the live count wins -- report it and note the cause (e.g. a const-table pre-pass miss).

## psql access (host `psql` NOT installed; container up + healthy)

From `apps/qw-oracle/`: `set -a && . ./.env && set +a` then `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<query>"`. The dev DB is **shared with a parallel l2-calibration session** (different tables); your upserts are scoped to `project='qtv'` -- no global/TRUNCATE ops.

## Execution notes

- ASCII-only (D7).
- Task 1 (the Go extractor `extract.go` + minimal `go.mod`) is `subagent (Sonnet MAX)` per the MD -- the arc's most novel task (Go AST walk: const-table pre-pass for `qwDefaultMasters`/`qtvRelease`, BinaryExpr int-fold for the `Regf` buf sizes, `cmd.Register` name-lowercasing, `*version` verbatim). Task 2 (run the corrected recipe above) and Task 3 (one-line build-snapshot edit) are `inline`.
- Determinism: the extractor MUST sort by name before emitting (V8 reproducibility = empty `git diff output/`).
- Boundary verification V1-V9 (Postgres, D12): V1 extractor clean (no unresolved-default warnings for basic `Reg(name, literal)` calls), V2 payload-field contract (`vars`/`commands`; cvar=41, command=12), V3 load errors=0 (the corrected recipe), **V4 counts + ALL source_backed (capture!)**, V5 MCP smoke `lookup_entity(qtv, qtv_password)` -- NOTE the session's live MCP server targets PROD not the dev DB (verify at the data layer; the MCP-against-dev round-trip is a known environmental gap, not a Phase-2 failure), V6 versions rows (now TWO: head+tag, per F12 -- the MD's "exactly 1" is superseded), V7 idempotency (re-run the corrected recipe -> inserted:0), V8 reproducibility (empty diff), V9 tsc exit 0.

## Carry-forward you hand to Phase 3

- 53 qtv + (already-loaded) 50 qwfwd L1 rows, descriptions NULL -- Phase 3 describes them.
- **Phase 3 is BLOCKED until the Q-SKILL gate-widening lands** (describe-fill-synthesis SKILL.md line 102 -> `{ktx,mvdsv,qtv,qwfwd}`). Not your task; flagged so the orchestrator sequences it before Phase 3.

## Halt and report (do NOT auto-proceed to Phase 3)

Commit Phase 2 on `main`, one-line message (e.g. `arc(qtv-qwfwd-l1): Phase 2 -- QTV go/ast extractor; 53 qtv L1 rows source_backed (head+tag)`). Do NOT push. Then **halt** with a structured `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` report including: the exact **cvar/command counts + that all are source_backed**, the V3 errors:0 summary, the V6 two-versions-row state, the V8 reproducibility diff, the V9 tsc exit, and any new findings (next is F14). Report back to the orchestrator; do NOT start Phase 3.
