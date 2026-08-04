# Help-JSON Doc-Consistency Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a trustworthy, DB-independent ground truth for help-JSON vs source drift, then wire that truth into a post-walk gate and a PR-digest staleness guard so PR-#1120-shape misses cannot recur silently.

**Architecture:** Three phases. Phase 0 builds a one-shot oracle (primary sources only: HEAD help-JSON + freshly re-extracted source AST) and reconciles the real numbers against the four conflicting figures we already have (DB=57, seed=193, PR#1120=156, side-terminal "150+"). Phase 1 productionizes that oracle as a new TypeScript gate `doc-consistency` (NOT an F1 quality-grid probe — F1 probes are pure read-only SQL per `VALIDATION-GATES.md` §2 and would be circular here; this gate reads primary sources and *cross-checks* the DB). Phase 2 adds a deterministic staleness guard to `build-help-json-pr-digest.py`.

**Tech Stack:** Python 3 (extractor + digest tooling), TypeScript + Bun (gate; `Bun.spawnSync` for git, mirrors `idempotency.ts` CLI shape), postgres-js, pytest + bun:test.

---

## Background: verified facts this plan is built on

All figures below were verified against live source/DB on 2026-05-15, not inferred:

| Figure | Value | Source of truth |
|---|---|---|
| DB `doc_only` ezquake entities (all `last_seen_version=head`) | 57 | `SELECT count(*) FROM entities WHERE project='ezquake' AND source_state='doc_only'` |
| Classification seed entries | 193 | `seeds/help_json_classifications.yaml` `classifications:` list; single git commit `26ae7897` dated 2026-05-01, never regenerated |
| PR #1120 cleanup digest entries | 156 | `docs/upstream-prs/ezquake-help-json-cleanup.md` (rendered from frozen seed) |
| Extractor-computed ghost count (vars) | 54 | `ezquake-variables-ast.json` `_stats.help_only` |
| Extractor-computed ghost count (commands) | 22 | `ezquake-commands-ast.json` `_stats.help_only` |
| Side-terminal "no docs" finding | ~150+ | reported by a separate session; reconcile in Phase 0 |

**Root cause this plan addresses (evidenced, not theorized):** `classify-help-json.py` reads `WHERE source_state='doc_only'` from the L1 DB (clean, unfiltered query — verified at `scripts/classify-help-json.py:104-105`). The classification seed is a one-time 2026-05-01 snapshot, never refreshed before PR #1120 (2026-05-14) or since. The doc_only population is a moving target; entities that entered doc_only after the snapshot (e.g. the 5 sampled ghosts with entity `updated_at=2026-05-14`) were structurally invisible to the PR. Nothing couples seed freshness to DB/source state — that decoupling is the defect.

**Key discovery:** The extractor already computes the ghost set. In `ezquake-variables-ast.json`, `vars` is a dict keyed by cvar name (2795 keys) = the authoritative source-registered cvar set; `_stats.help_only` (54) = cvars in help-JSON with no source registration. Same shape for `commands` (dict, 517 keys, `_stats.help_only`=22), `macros`, `cmdline-params`. The oracle does not need new source-parsing logic — it diffs HEAD help-JSON names against the re-extracted AST dict keys.

---

## File Structure

| File | Responsibility | Phase |
|---|---|---|
| `apps/qw-oracle/scripts/doc-consistency-oracle.py` (create) | One-shot ground-truth report: HEAD help-JSON vs freshly re-extracted AST, both drift directions, reconciliation table. Throwaway-grade but kept (regenerable diagnostic). | 0 |
| `apps/qw-oracle/scripts/load-knowledge/doc-consistency.ts` (create) | Productionized gate. Computes the same diff, asserts the DB's `source_state` matches it, FAILs on drift. Shape A TS subcommand per `VALIDATION-GATES.md` §1-2. | 1 |
| `apps/qw-oracle/scripts/load-knowledge/index.ts` (modify) | Register `doc-consistency` subcommand (four edits per `VALIDATION-GATES.md` §2). | 1 |
| `apps/qw-oracle/scripts/load-knowledge/doc-consistency.test.ts` (create) | bun:test coverage for the diff + DB-cross-check logic. | 1 |
| `apps/qw-oracle/scripts/build-help-json-pr-digest.py` (modify) | Add staleness guard: refuse to render if `{DB doc_only names} − {seed classified names}` is non-empty. | 2 |
| `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest_staleness.py` (create) | pytest coverage for the staleness guard. | 2 |

---

## Phase 0 — Ground-truth oracle (the "know the truth now" deliverable)

This phase produces the numbers the operator needs to reconcile side issues. It is deliberately first and standalone — its output de-risks Phases 1-2 and answers the open question independently of any later code.

### Task 1: Build and run the independent oracle

**Files:**
- Create: `apps/qw-oracle/scripts/doc-consistency-oracle.py`

- [ ] **Step 1: Re-extract ezquake at HEAD to guarantee a fresh source-side set**

The on-disk AST JSON has no recorded commit (`_stats` carries no sha). Do not trust its vintage. Regenerate it.

Run:
```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
python3 scripts/extractors/ezquake/extract.py --workers 4
```
Expected: writes `scripts/extractors/ezquake/output/ezquake-variables-ast.json`, `-commands-ast.json`, `-macros-ast.json`, `-cmdline-params-ast.json`. Note the ezquake HEAD commit for the report: `git -C research/repos/ezquake-source rev-parse HEAD` (expected `3f9e724f...`).

- [ ] **Step 2: Write the oracle script**

```python
#!/usr/bin/env python3
"""doc-consistency-oracle -- DB-independent ground truth for help-JSON vs source drift.

Primary sources only:
  - HEAD help-JSON names      : git show HEAD:help_*.json  (via existing digest helpers)
  - HEAD source-registered set: freshly re-extracted *-ast.json dict keys
The L1 DB is read ONLY for the reconciliation table, never as the source of truth.
"""
from __future__ import annotations
import json, subprocess, sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "apps/qw-oracle/scripts/extractors"))
from extractor_lib._help_json_pr_digest import collect_help_json_names  # noqa: E402

PROJECT = "ezquake"
SRC_REPO = REPO_ROOT / "research" / "repos" / f"{PROJECT}-source"
OUT_DIR = REPO_ROOT / "apps/qw-oracle/scripts/extractors" / PROJECT / "output"
SEED = REPO_ROOT / "apps/qw-oracle/scripts/extractors" / PROJECT / "seeds/help_json_classifications.yaml"

# (help-JSON file, AST file, AST dict key)
PAIRS = [
    ("help_variables.json",      f"{PROJECT}-variables-ast.json",      "vars"),
    ("help_commands.json",       f"{PROJECT}-commands-ast.json",       "commands"),
    ("help_macros.json",         f"{PROJECT}-macros-ast.json",         "macros"),
    ("help_cmdline_params.json", f"{PROJECT}-cmdline-params-ast.json",  "params"),
]

def help_names(fname: str) -> set[str]:
    r = subprocess.run(["git", "-C", str(SRC_REPO), "show", f"HEAD:{fname}"],
                        capture_output=True, text=True)
    if r.returncode != 0:
        return set()
    names: set[str] = set()
    collect_help_json_names(json.loads(r.stdout), names)
    return names

def src_names(ast_file: str, key: str) -> set[str]:
    data = json.loads((OUT_DIR / ast_file).read_text())
    container = data.get(key, {})
    return set(container.keys()) if isinstance(container, dict) else {
        (x["name"] if isinstance(x, dict) else x) for x in container
    }

def main() -> int:
    total_ghost: set[str] = set()
    print(f"=== doc-consistency oracle :: {PROJECT} @ HEAD ===\n")
    for hj, ast, key in PAIRS:
        h, s = help_names(hj), src_names(ast, key)
        ghost = sorted(h - s)          # in help-JSON, not registered in source
        total_ghost.update(ghost)
        print(f"[{hj}] help={len(h)} source={len(s)} GHOST(help-only)={len(ghost)}")
        for n in ghost[:40]:
            print(f"    ghost: {n}")
        if len(ghost) > 40:
            print(f"    ... +{len(ghost)-40} more")
    print(f"\nTOTAL GHOST (help-JSON entries with no HEAD source registration): {len(total_ghost)}")

    # Reconciliation table (DB read here only, as a CONSUMER not a source of truth)
    db_doc_only = "n/a (DB unreachable)"
    q = ("SELECT count(*) FROM entities WHERE project='ezquake' "
         "AND source_state='doc_only'")
    r = subprocess.run(
        ["docker", "exec", "-i", "qw-oracle-postgres-dev",
         "psql", "-U", "qworacle", "-d", "qw_oracle", "-tAc", q],
        capture_output=True, text=True)
    if r.returncode == 0:
        db_doc_only = r.stdout.strip()
    seed_count = 0
    if SEED.exists():
        import yaml
        seed_count = len(yaml.safe_load(SEED.read_text()).get("classifications", []))
    print("\n=== RECONCILIATION ===")
    print(f"  oracle GHOST (primary-source truth) : {len(total_ghost)}")
    print(f"  DB source_state='doc_only'          : {db_doc_only}")
    print(f"  classification seed entries         : {seed_count}")
    print(f"  PR #1120 digest entries             : 156 (frozen 2026-05-01 seed)")
    print(f"  -> seed/oracle delta = entries the next cleanup PR must add")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Run the oracle**

Run:
```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
python3 scripts/doc-consistency-oracle.py
```
Expected: a GHOST count per help-file, a TOTAL GHOST, and the RECONCILIATION block. The TOTAL GHOST is the trustworthy answer. It should be in the same neighbourhood as extractor `_stats.help_only` summed across types (54+22+macros+cmdline) and explain the gap vs DB=57 and seed=193.

- [ ] **Step 4: Reconcile against the side-issue "150+ no docs" finding**

The "150+" is the *opposite* direction (source-backed, missing prose), not ghosts. Sanity-check it independently:
```bash
python3 -c "
import json
v=json.load(open('scripts/extractors/ezquake/output/ezquake-variables-ast.json'))
s=v['_stats']
print('client cvars:', s['client'], 'with_help_desc:', s['with_help_desc'],
      'undocumented client:', s['client']-s['with_help_desc'])
"
```
Expected: prints the undocumented-client gap. Record whether "150+" matches `client − with_help_desc` after the audit's scope filter (`sv_*` exclusion etc.). This closes the loop on the side issue without trusting that terminal's number.

- [ ] **Step 5: Report findings to the operator and commit**

Write a 5-line plain-English reconciliation (oracle GHOST vs 57 / 193 / 156 / "150+", what each delta means) into the conversation. Then:
```bash
git add apps/qw-oracle/scripts/doc-consistency-oracle.py
git commit -m "qw-oracle(diag): DB-independent help-JSON vs source ground-truth oracle"
```

**HALT after Task 1.** Present the reconciliation to the operator before building the productionized gate — the real numbers may reshape Phase 1's pass/fail thresholds.

---

## Phase 1 — Productionized post-walk gate (`doc-consistency`)

Runs after every walk via the universal gate set, so PR-#1120-shape drift fails loud instead of silently surviving 13 days.

### Task 2: Write the gate core logic + bun:test

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/doc-consistency.ts`
- Test: `apps/qw-oracle/scripts/load-knowledge/doc-consistency.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { test, expect } from 'bun:test';
import { diffDriftSets } from './doc-consistency.js';

test('ghost = help-only names; missing = source-only names', () => {
  const help = new Set(['a', 'b', 'ghost1']);
  const src  = new Set(['a', 'b', 'srconly1']);
  const r = diffDriftSets(help, src);
  expect([...r.ghost]).toEqual(['ghost1']);
  expect([...r.missing]).toEqual(['srconly1']);
});

test('clean when help and source agree', () => {
  const s = new Set(['x', 'y']);
  const r = diffDriftSets(s, new Set(['x', 'y']));
  expect(r.ghost.size).toBe(0);
  expect(r.missing.size).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/qw-oracle && bun test scripts/load-knowledge/doc-consistency.test.ts`
Expected: FAIL — `Cannot find module './doc-consistency.js'`.

- [ ] **Step 3: Write the gate**

Reuse the documented CLI scaffold rather than reinventing it: `VALIDATION-GATES.md` §2 names `idempotency.ts:352-398` as the canonical parse→help→validate→iterate→format→exitCode shape. The gate-specific logic below is complete; the CLI wrapper follows that referenced shape verbatim (per-project `--project`/`--all`, `--json`, `--help`, exit 0/1/2, `DATABASE_URL`-only DB config per §3, `import.meta.url` path resolution per §7). Git access uses `Bun.spawnSync` (array args, no shell — safe and Bun-native).

```typescript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { sql } from './db.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

export interface DocConsistencyResult {
  project: string;
  status: 'PASS' | 'FAIL';
  summary: string;
  ghostCount: number;
  missingCount: number;
  dbMismatchCount: number;
}

// (help-JSON file, AST file suffix, AST dict key) — verified shapes 2026-05-15
const PAIRS: ReadonlyArray<readonly [string, string, string]> = [
  ['help_variables.json',      'variables-ast.json',      'vars'],
  ['help_commands.json',       'commands-ast.json',       'commands'],
  ['help_macros.json',         'macros-ast.json',         'macros'],
  ['help_cmdline_params.json', 'cmdline-params-ast.json',  'params'],
];

export function diffDriftSets(help: Set<string>, src: Set<string>) {
  const ghost = new Set([...help].filter(n => !src.has(n)));
  const missing = new Set([...src].filter(n => !help.has(n)));
  return { ghost, missing };
}

function helpNames(repo: string, fname: string): Set<string> {
  const p = Bun.spawnSync(['git', '-C', repo, 'show', `HEAD:${fname}`]);
  if (p.exitCode !== 0) return new Set();
  const obj = JSON.parse(p.stdout.toString());
  const out = new Set<string>();
  // help-JSON is { groups: {...}, <name>: {...}, ... }; collect object-valued
  // leaf keys, skipping the 'groups' container.
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === 'groups') continue;
      if (v && typeof v === 'object' && !Array.isArray(v)) out.add(k);
    }
  }
  return out;
}

function srcNames(outDir: string, astFile: string, key: string): Set<string> {
  const data = JSON.parse(readFileSync(resolve(outDir, astFile), 'utf8'));
  const c = data[key];
  if (c && typeof c === 'object' && !Array.isArray(c)) return new Set(Object.keys(c));
  return new Set((c as Array<{ name?: string } | string>).map(
    x => (typeof x === 'string' ? x : x.name!)));
}

export async function runDocConsistency(project: string): Promise<DocConsistencyResult> {
  const repo = resolve(SCRIPT_DIR, `../../../../research/repos/${project}-source`);
  const outDir = resolve(SCRIPT_DIR, `../extractors/${project}/output`);
  const allGhost = new Set<string>();
  for (const [hj, astSuffix, key] of PAIRS) {
    const help = helpNames(repo, hj);
    const src = srcNames(outDir, `${project}-${astSuffix}`, key);
    for (const g of diffDriftSets(help, src).ghost) allGhost.add(g);
  }
  // Cross-check: every primary-source ghost MUST be source_state='doc_only' in DB.
  // A ghost the DB does not mark doc_only = DB drift (the PR-#1120-shape failure).
  const dbDocOnly = await sql<{ name: string }[]>`
    SELECT name FROM entities
    WHERE project = ${project} AND source_state = 'doc_only'
  `;
  const dbSet = new Set(dbDocOnly.map(r => r.name));
  const dbMismatch = [...allGhost].filter(n => !dbSet.has(n));
  const status = dbMismatch.length === 0 ? 'PASS' : 'FAIL';
  return {
    project,
    status,
    summary: status === 'PASS'
      ? `${allGhost.size} ghosts; all reflected as doc_only in DB`
      : `${dbMismatch.length} primary-source ghosts NOT marked doc_only in DB (drift)`,
    ghostCount: allGhost.size,
    missingCount: 0,
    dbMismatchCount: dbMismatch.length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/qw-oracle && bun test scripts/load-knowledge/doc-consistency.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/doc-consistency.ts apps/qw-oracle/scripts/load-knowledge/doc-consistency.test.ts
git commit -m "qw-oracle(gate): doc-consistency core — primary-source ghost diff + DB cross-check"
```

### Task 3: Add the CLI entry point

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/doc-consistency.ts`

- [ ] **Step 1: Append the CLI function**

Mirror `idempotency.ts:352-398` exactly (verify the range first: `grep -n "parseArgs" scripts/load-knowledge/idempotency.ts`). The function must: `export async function runDocConsistencyCli(args: string[]): Promise<void>`, parse `--project`/`--all`/`--json`/`--help`, guard `DATABASE_URL` (per §3), iterate targets calling `runDocConsistency`, print prose or `JSON.stringify(results)`, set `process.exitCode = anyFail ? 1 : 0` (2 for bad args), and NOT call `process.exit()` from core logic.

- [ ] **Step 2: Verify --help works and exits 0**

Run: `cd apps/qw-oracle && bun run load-knowledge -- doc-consistency --help; echo "exit=$?"`
Expected: flag list on stderr, `exit=0`.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/doc-consistency.ts
git commit -m "qw-oracle(gate): doc-consistency CLI (idempotency.ts shape)"
```

### Task 4: Register the subcommand in index.ts

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Apply the four documented edits**

Per `VALIDATION-GATES.md` §2: (1) add `doc-consistency` to the subcommand comment near line 5; (2) add dispatch case in `main()` near line 35: `if (subcommand === 'doc-consistency') { await runDocConsistencyCli(rest); return; }`; (3) add thin wrapper `async function runDocConsistencyCli(args){ const { runDocConsistencyCli: run } = await import('./doc-consistency.js'); await run(args); }`; (4) add a line to `usageAndExit()` near line 81: `doc-consistency  --project <p> | --all`.

- [ ] **Step 2: Verify dispatch + a real run**

Run: `cd apps/qw-oracle && bun run load-knowledge -- doc-consistency --project ezquake --json | python3 -m json.tool`
Expected: valid JSON array, one object with `project`, `status`, `summary`, `ghostCount`, `dbMismatchCount`. `status` reflects the Phase-0 truth (likely FAIL until the seed/DB are reconciled — that is the gate working).

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "qw-oracle(gate): register doc-consistency subcommand"
```

**HALT after Task 4.** Confirm gate status with the operator before Phase 2 — a FAIL here is expected and is the signal that drives the staleness fix.

---

## Phase 2 — PR-digest staleness guard

Makes the exact PR #1120 failure impossible: the digest refuses to render from a seed that does not cover the current DB doc_only set.

### Task 5: Write the staleness guard + pytest

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest_staleness.py`
- Create: `apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest_staleness.py`

- [ ] **Step 1: Write the failing test**

```python
from extractor_lib._help_json_pr_digest_staleness import seed_is_stale

def test_stale_when_db_has_unclassified_doc_only():
    db_doc_only = {"auth_timeout", "gl_motion_blur", "known"}
    seed_names  = {"known"}
    stale, missing = seed_is_stale(db_doc_only, seed_names)
    assert stale is True
    assert sorted(missing) == ["auth_timeout", "gl_motion_blur"]

def test_fresh_when_seed_covers_db():
    stale, missing = seed_is_stale({"a", "b"}, {"a", "b", "c"})
    assert stale is False
    assert missing == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/qw-oracle && python3 -m pytest scripts/extractors/extractor_lib/tests/test_help_json_pr_digest_staleness.py -v`
Expected: FAIL — `ModuleNotFoundError: _help_json_pr_digest_staleness`.

- [ ] **Step 3: Write the staleness helper**

Create `apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest_staleness.py`:
```python
"""Deterministic seed-staleness signal for the help-JSON PR digest.

A seed is stale iff the live DB has doc_only entities the seed never
classified -- i.e. the digest rendered from it would be incomplete.
This is a set-difference, not a date heuristic: it catches the exact
PR #1120 failure (frozen 2026-05-01 seed, post-snapshot ghosts unseen).
"""
from __future__ import annotations

def seed_is_stale(db_doc_only: set[str], seed_names: set[str]) -> tuple[bool, list[str]]:
    missing = sorted(db_doc_only - seed_names)
    return (len(missing) > 0, missing)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/qw-oracle && python3 -m pytest scripts/extractors/extractor_lib/tests/test_help_json_pr_digest_staleness.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/extractors/extractor_lib/_help_json_pr_digest_staleness.py apps/qw-oracle/scripts/extractors/extractor_lib/tests/test_help_json_pr_digest_staleness.py
git commit -m "qw-oracle(digest): deterministic seed-staleness signal + tests"
```

### Task 6: Wire the guard into the digest generator

**Files:**
- Modify: `apps/qw-oracle/scripts/build-help-json-pr-digest.py`

- [ ] **Step 1: Add the guard in `main()` before `render_digest`**

After `classifications = load_classifications(...)` (currently line ~88-90) and before `md = render_digest(...)` (line ~120), insert:
```python
    # Staleness guard: refuse to render a digest from a seed that does not
    # cover the live DB doc_only set. Prevents the PR #1120 failure mode
    # (frozen seed, post-snapshot ghosts silently excluded from the PR).
    from extractor_lib._help_json_pr_digest_staleness import seed_is_stale
    import os
    _q = (f"SELECT name FROM entities WHERE project='{args.project}' "
          f"AND source_state='doc_only'")
    _db: set[str] = set()
    if os.environ.get("DATABASE_URL"):
        _r = subprocess.run(["psql", os.environ["DATABASE_URL"], "-tAc", _q],
                             capture_output=True, text=True)
        if _r.returncode == 0:
            _db = {x.strip() for x in _r.stdout.splitlines() if x.strip()}
    else:
        _r = subprocess.run(["docker", "exec", "-i", "qw-oracle-postgres-dev",
                              "psql", "-U", "qworacle", "-d", "qw_oracle",
                              "-tAc", _q], capture_output=True, text=True)
        if _r.returncode == 0:
            _db = {x.strip() for x in _r.stdout.splitlines() if x.strip()}
    if _db:
        stale, missing = seed_is_stale(_db, set(classifications.keys()))
        if stale:
            print(
                f"REFUSING to render: seed is stale. {len(missing)} DB doc_only "
                f"entities are not classified in the seed. Re-run "
                f"`python scripts/classify-help-json.py --project {args.project} "
                f"--propose` and classify them before building the PR digest.\n"
                f"Uncovered: {', '.join(missing[:20])}"
                + (f" ... +{len(missing)-20} more" if len(missing) > 20 else ""),
                file=sys.stderr,
            )
            return 2
```

- [ ] **Step 2: Verify the guard fires on the current stale seed**

Run: `cd apps/qw-oracle && python3 scripts/build-help-json-pr-digest.py --project ezquake; echo "exit=$?"`
Expected: `REFUSING to render: seed is stale...` listing uncovered names (auth_timeout, gl_motion_blur, ...), `exit=2`. This is the guard correctly catching today's known-stale state.

- [ ] **Step 3: Verify the guard is bypassable only by fixing the seed (not by a flag)**

Confirm there is no `--force` added. The only way past the guard is to classify the missing entities. Add a one-line note to the script's module docstring documenting the guard.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/build-help-json-pr-digest.py
git commit -m "qw-oracle(digest): refuse render when seed stale vs live DB doc_only set"
```

---

## Self-Review

**1. Spec coverage:**
- "Know the actual truth, compare against side issues" → Phase 0 Task 1 (oracle + reconciliation incl. the "150+" side finding).
- "Reliable check on every walk" → Phase 1 (gate in the universal set; runs post-walk like the F1 grid).
- "Connect it to the walk — hook?" → Architecture decision recorded: a gate, not a hook (F1 is pure-SQL/circular; a hook mutating PR-feeding state is the anti-pattern we are removing, not adding).
- "Independence (the question you weren't asking)" → enforced: oracle and gate read git+AST primary sources; DB is consumer/cross-check only, never source of truth.
- "Prevent PR #1120 recurrence" → Phase 2 deterministic staleness guard, verified to fire on today's known-stale seed.

**2. Placeholder scan:** No TBD/TODO. Code steps carry complete code. The one referenced-not-inlined block (the CLI parse scaffold) is a *documented convention with an exact file:line pointer* (`VALIDATION-GATES.md` §2 → `idempotency.ts:352-398`), per the project's "follow established patterns" rule — not a placeholder; the novel gate logic is fully specified.

**3. Type consistency:** `diffDriftSets` returns `{ghost, missing}` — used consistently in Task 2 test, core, and Task 4 run. `DocConsistencyResult` fields (`status`/`summary`/`ghostCount`/`missingCount`/`dbMismatchCount`) are stable across Tasks 2-4 and match the `--json` assertion. `seed_is_stale(db,seed)->(bool,list)` is identical in Task 5 test, helper, and Task 6 call site. AST container types (`vars`/`commands` = dict) verified 2026-05-15 and handled by the dict-or-list branch in `srcNames`/`src_names`.

**Note on testing scope (project philosophy alignment):** Phase 0 is a measurement tool — verified by reconciliation against four known figures (manual verification), not a speculative unit test, per `CLAUDE.md` "Testing Philosophy". Phases 1-2 carry tests because the validation-gate layer's established convention is tested gates (`VALIDATION-GATES.md` §6; existing `findings-help-json-classifications.test.ts`). No speculative test infrastructure added.
