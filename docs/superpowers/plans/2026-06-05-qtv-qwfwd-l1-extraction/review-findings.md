# Review findings -- planner pre-flight verification

This arc has **no prior monolithic plan** to review. Instead, this file is the evidence trail from the planner's pre-flight verification of the approved design against live source. Each finding records a fact the design got approximately, a real integration hazard, or a stale assumption in the supporting docs -- and which decision (in `decisions.md`) resolves it.

The fixes are encoded as decisions. This file is the WHY; `decisions.md` is the FIX. Phase drafters consult both.

New findings discovered during phase drafting append here with sequential F-numbers.

---

## How to use this doc

While drafting each phase MD:
1. Identify which findings touch the phase you're drafting (see the ownership table at the bottom).
2. Verify the relevant decision in `decisions.md` resolves the issue.
3. If the phase does not naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.

---

## Grave (would break execution if missed)

### F1 -- The project-CHECK surface was undercounted

**Resolved by:** D2.

**Evidence:** The design said "extend the `project` CHECK ... across `entities` and the ~5 per-version tables." Grep of `db/migrations/002_layer1_schema.sql` for `'ezquake'` returns **10 CHECK clauses across 9 tables**: `versions` (30), `entities` (50), `asset_extensions` (287), `asset_path_rules` (314), `asset_cvar_bindings` (332), `asset_loader_sites` (354), `release_notes` (384), `relation_changes` (421), and `cvar_alias_versions` carries **two** (`target_project` 461, `mimics_project` 467). The asset/release/relation tables are not "per-version" tables, so a "per-version" framing misses them. Migration 020 must widen all 10. (Spec corrected at `2b64c68e`.)

### F2 -- `extract-tag.ts` cannot drive vendored / no-`.git` / Go targets

**Resolved by:** D1.

**Evidence:** `extract-tag.ts` is hardwired to `git rev-parse`/`git fetch --tags`/`git checkout` the project repo (`358-365`) and to `spawnSync('python3', [extractorPath, ...])` for extraction (`394-403`). Both qtv and qwfwd are frozen vendored snapshots with **no `.git` dir** (verified by `ls`), and qtv's extractor is **Go**. So the git machinery has nothing to check out and the python branch cannot run a Go extractor. The design's one-word "load" step buried this -- it is the arc's actual technical risk. D1 bypasses `extract-tag` and loads via the canonical `load-version --json` entrypoint (`index.ts:60-63`), which has no git/python dependency. (Spec corrected at `2b64c68e` to promote this to the Phase-1 tracer-bullet crux.)

---

## Substantive (would ship buggy behavior or waste effort)

### F3 -- `VALIDATION-RUNBOOK.md` sqlite commands are stale

**Resolved by:** D12. Flagged for Phase 4.

**Evidence:** The runbook (and the terrain-mapping done during planning) reference `sqlite3 .../data/knowledge.db` for reproducibility and count-reconciliation queries. The DB is Postgres 16 (`package.json` postgres-js + `DATABASE_URL=postgresql://`; `db/migrate.ts` on `postgres.Sql`; `data/knowledge.db` is 0 bytes). The SQLite era ended with Arc 1 (`apps/qw-oracle/CLAUDE.md`). Phase 4 must run every validation query against Postgres.

### F4 -- Project union widening compiler-forces 12 `Record<Project,...>` sites

**Resolved by:** D3. (Checklist, not a bug.)

**Evidence:** `grep -rn 'Record<Project'` returns exactly 12 sites: 8 in `extract-tag.ts` (lines 36/48/57/73/88/102/235/282), 1 each in `build-snapshot.ts:685`, `diff-versions.ts:51`, `enrich-prs.ts:14`, `load-release-notes.ts:28`. Adding `'qtv'|'qwfwd'` to the union makes `tsc --noEmit` flag all 12 until filled. The MCP `serve/` side has zero `Record<Project>` (filters are raw passthrough), so no MCP filter code changes. Phase 0's gate is `tsc --noEmit` green.

### F5 -- `--commit` has no natural value for a git-less snapshot

**Resolved by:** D4. (Operator-flagged at slicing lock.)

**Evidence:** `load-version` requires `--commit <sha>` (`index.ts:63`), but a vendored copy has no local sha. D4: use the upstream sha if the vendoring recorded it; else fall back to the version constant string as the commit sentinel; record the snapshot date as provenance.

### F6 -- QWFWD `Cvar_Get` is both the registration idiom AND the cvar.c implementation

**Status:** Flagged for Phase 1.

**Evidence:** `grep Cvar_Get` in `qwfwd/src/` shows the registration idiom (`masters_query = Cvar_Get("masters_query","1",0)` in `query.c:697`) but also the function's own definition and internal pass-through (`cvar.c:98` `cvar_t *Cvar_Get(...)`, `cvar.c:228` `return Cvar_Get(var_name, value, flags)`). The QWFWD cvar handler must key on call-sites with a string-literal name + default (the registration shape) and exclude `cvar.c`'s own machinery, exactly as the MVDSV handler discriminates registration sites from the cvar subsystem. Count expectation: ~13-14 cvars, not the raw ~18 `Cvar_Get` hits.

### F7 -- Knob hand-counts are not authoritative; the extractor is the source of truth

**Status:** Advisory; applies to Phase 1/2 verification.

**Evidence:** The design's knob counts (QWFWD ~13-14 cvars / ~30 commands; QTV ~41 cvars / ~12 commands) are exploration-agent hand-counts; the scout already found one knob (`sys_readstdin`) an earlier inventory missed. Registration-idiom greps during planning roughly corroborate (QWFWD: 36 `Cmd_AddCommand`, ~18 `Cvar_Get`/`Cvar_Register`; QTV: 41 `qvs.Reg`/`RegEx`, 13 `cmd.Register`). Phase 1/2 verification counts what the extractor finds and records that as the F1 baseline (D12); it does not gate on the design's hand-counts.

### F8 -- describe-fill-synthesis skill pre-flight blocks qtv/qwfwd

**Status:** Flagged during Phase 3 drafting. Resolved by Q-SKILL Option A (operator to confirm -- shared user-global skill change).

**Evidence:** `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 102 hard-aborts when `project is not exactly 'ktx' or 'mvdsv'`. QTV/QWFWD are outside that scope, so Phase 3's describe workers cannot dispatch until the gate is widened. Independent verification + operator eyes-on (2026-06-05) confirmed the skill has no project-branching logic beyond the gate; widening it to `{'ktx','mvdsv','qtv','qwfwd'}` is the complete functional fix (safe-additive -- cannot change ktx/mvdsv behavior). Also update the FOUR doc references that name only ktx/mvdsv: SKILL.md lines 4 / 53 / 354 and `references/subagent-brief-template.md:17`. The skill's own frontmatter calls it "engine-agnostic." Resolved: Q-SKILL Option A.

### F9 -- Phase 0 constraint-introspection / V2 query is doubly broken (verification tooling, NOT the DDL)

**Status:** Found at orchestrator pre-flight (2026-06-05, before Phase 0 kickoff), by running the query against the live Postgres 16 catalog. Touches Phase 0. The migration DDL (the 10 ALTER TABLE pairs) is correct and unchanged; only the introspection/verification query needs a two-line fix, carried in the Phase-0 executor prompt augmentation.

**Evidence:** The `pg_constraint` introspection query in Phase 0 Task 1 step 1 AND verification probe V2 (identical text; the D2-implication query shares bug 2) fail against live Postgres for two independent reasons:
1. `ORDER BY tbl::text` -- Postgres rejects an output-alias with a cast applied in ORDER BY: `ERROR: column "tbl" does not exist`. The query cannot run as written (Task 1 step 1 and V2 both error out immediately).
2. `WHERE pg_get_constraintdef(oid) ILIKE '%project%'` over-matches `gameplay_entity_defs_kind_check`, whose definition lists `'projectile'::text` (the substring "project"). The query returns **11 rows, not the 10** the plan asserts. V2's PASS condition ("exactly 10 rows; every row contains qwfwd+qtv") would FAIL on the 11th (kind) row post-migration.

The 10 genuine project-CHECK clauses and their constraint names exactly match D2/F1 and the Task-1 DROP CONSTRAINT assumptions (re-verified live 2026-06-05): F1's "10 clauses" is confirmed; the migration's DROP/ADD names are all correct.

**Corrected query (use in Task 1 step 1 and V2 -- keys on the allow-list signature, returns exactly the 10):**
```sql
SELECT conrelid::regclass AS tbl, conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c'
  AND pg_get_constraintdef(oid) ILIKE '%ezquake%'
ORDER BY 1, 2;
```
Post-020 this returns exactly 10 rows, every one containing `ezquake` (allow-list retains it) AND `qwfwd` + `qtv` -- so V2's "exactly 10 / every row has qwfwd+qtv" passes cleanly.

---

## Findings the design got right (carry forward)

- The toolchain split (QWFWD libclang on `extractor_lib` rails; QTV native `go/ast`) is sound: QWFWD's idiom (`Cvar_Get`/`Cmd_AddCommand`) matches the existing C-port handler shape, and QTV's literal `qvs.Reg`/`cmd.Register` call-sites are clean for an AST walk.
- "No new entity types" holds: all knobs map to cvar/command/cmdline_param/info_key (D5).
- The C-vs-Go QTV config trap (D6) is a real, verified divergence (the C knobs live only in `fteqtv/`).
- Deferring concept-note authoring until after the describe pass (D9) is the right sequencing -- evidence before the authoring decision.

---

## Phase ownership of findings

| Phase | Findings to verify before sign-off |
|---|---|
| Phase 0 (Schema + plumbing) | F1, F4, F9 |
| Phase 1 (QWFWD extractor + vendored load path) | F2, F5, F6, F7 |
| Phase 2 (QTV Go extractor) | F2, F5, F7 |
| Phase 3 (Describe-fill) | F8 (skill gate); D6 guard is the load-bearing item |
| Phase 4 (Validate + concept-note decision) | F3, F7 |

---

*End of review findings. New findings discovered during phase drafting append with sequential F-numbers.*
