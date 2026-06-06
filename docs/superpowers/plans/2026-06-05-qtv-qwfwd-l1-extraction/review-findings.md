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

### F10 -- The Record<Project> surface is 13 sites, not 12 (a derived Exclude type the F4 grep missed)

**Status:** Found during Phase 0 execution (2026-06-05). Touches Phase 0 (resolved here) and Phase 4 (reproducibility-validation implication, below).

**Evidence:** F4's `grep -rn 'Record<Project'` found 12 literal sites. It missed `scripts/load-knowledge/idempotency.ts`, which types its config as `Record<IdempotencyProject, ...>` where `IdempotencyProject = Exclude<Project, 'qw'>`. Widening the `Project` union made `tsc` error there too -- a 13th site. The correct fix is NOT to add qtv/qwfwd config entries: `runIdempotency` (idempotency.ts:282) re-runs `extractTag(... force:true)`, and per D1 `PROJECT_EXTRACTOR[qtv|qwfwd]` is `null` (extract-tag throws by design on a null extractor). Including qtv/qwfwd in the idempotency scope would crash the probe. So the type was narrowed to `Exclude<Project, 'qw' | 'qtv' | 'qwfwd'>` -- qtv/qwfwd join `qw` as projects the extract-tag-coupled idempotency probe does not cover. V3 (tsc green) confirms the full surface (13 sites) is now addressed. Same class of miss as F1: a literal-string grep undercounting a derived form.

**Resolved by:** Phase 0 Task 3 (the narrowing edit, verified by V3 tsc-green).

**Phase 4 implication:** the `idempotency --project` CLI deliberately rejects qtv/qwfwd (exit 2, "must be one of ezquake|fte|qwcl|mvdsv|ktx"). Phase 4's reproducibility validation for qtv/qwfwd must therefore use the standalone-extractor-rerun + git-diff-on-output method (the Phase 1/2 reproducibility approach), NOT this extract-tag-coupled probe. The F1 floor-count + source-state probes in quality-grid.ts (D12) are separate and DO cover qtv/qwfwd.

### F11 -- QWFWD `net_ip` / `net_port` carry a variable-name `default_value`, not a resolved literal

**Status:** Found during Phase 1 execution (2026-06-06) by the cvars-handler sub-agent; verified against live source. Touches Phase 3 (describe-fill). Does NOT block Phase 1 -- the extractor behavior is correct; the consequence is a describe-pass handoff.

**Evidence:** `net.c:277-284` registers both cvars with a *variable* as the default arg, not a string literal:
```c
char *ip = (*ps.params.ip) ? ps.params.ip : "0.0.0.0";
char port[64] = {0};
snprintf(port, sizeof(port), "%d", ps.params.port ? ps.params.port : QWFWD_DEFAULT_PORT);
net_ip   = Cvar_FullSet("net_ip",   ip,   CVAR_NOSET);   // arg1 = `ip`   (a char*)
net_ip   = Cvar_Get    ("net_ip",   ip,   CVAR_NOSET);
net_port = Cvar_FullSet("net_port", port, CVAR_NOSET);   // arg1 = `port` (a char[64])
net_port = Cvar_Get    ("net_port", port, CVAR_NOSET);
```
The handler faithfully records the call-site arg text, so it emits `default_value="ip"` for `net_ip` and `default_value="port"` for `net_port`. An AST extractor cannot data-flow-resolve these to the real runtime defaults (`0.0.0.0` when no `-ip` cmdline; `QWFWD_DEFAULT_PORT` = 30000 when no port cmdline). This is the expected limitation for dynamically-computed defaults; capturing the call-site arg is correct extractor behavior (F7 -- the extractor reports source truth), not a bug to fix in the handler.

**Proposed disposition (Phase 3 owns):** the describe pass is source-register-site verified (D6); the describe author reads `net.c` and surfaces the real defaults (`0.0.0.0` / 30000, both cmdline-overridable) in the `description`. Whether to ALSO correct the `default_value` column for these two cvars (vs. leaving the source-true variable name) is a Phase-3 judgment for the operator -- a static override is the only mechanism, since re-extraction will always re-emit the variable name. The other ~11 QWFWD cvars use string-literal defaults and are unaffected.

### F12 -- Single-version frozen projects need a `head` load, not only a tag (Phase-1 recipe was incomplete) -- LOAD-BEARING for Phase 2

**Status:** Found AND fixed during Phase 1 execution (2026-06-06). Phase 1 resolved (recipe corrected, verified). **Phase 2 (QTV) MUST inherit the corrected recipe -- this is the load-bearing carry-forward.**

**Evidence:** `load-version` marks an entity `source_backed` only if its per-type `*_versions` rows reach `HEAD_ORDINAL` (999999). The mechanism is the entity-state-retreat block (`diff-versions.ts` `removed_from_head`; arc `2026-05-15-entity-state-retreat-loader-bug`): any entity whose max version ordinal is below head is retired to `source_retired`. The phase MD Task-7 recipe loaded each type ONLY as the tag (`--version 1.40-dev --ordinal 1`), so all 50 QWFWD entities loaded `source_retired` -- V5 (expects `source_backed`) would have failed. Verified against the two established single-version precedents: **mvdsv** loads as `head` (ordinal 999999); **qwcl** loads as BOTH the tag `2.33` (ordinal 233) AND `head` (999999), same commit -> entities `source_backed`. The phase MD's mental model (a tag load yields a live source-backed snapshot) was wrong: the live snapshot lives at HEAD; tags are historical.

**Fix (applied + verified):** load each type TWICE, both `--commit 1.40-dev`:
1. `--version head` (NO `--ordinal`; `head` auto-resolves to HEAD_ORDINAL) -- establishes the live source-backed snapshot.
2. `--version 1.40-dev --ordinal 1` -- the labeled tag identity (D4; satisfies V6 + `build-snapshot` default).
Canonical order is **head-first then tag** (tag-first works but logs spurious `removed_from_head` -> `re_added` transition churn). End state matches qwcl exactly: `versions = {1.40-dev ord1, head ord999999}`, all 50 entities `source_backed`, fully idempotent (re-load logs 0 transitions, counts stable).

**Phase 2 implication (LOAD-BEARING):** the Task-7 "reuse verbatim" recipe is now 8 calls (4 head + 4 tag), not 4. QTV is also a single frozen vendored snapshot; loading only the tag would retire every QTV entity identically. Substitute `qtv` + the QTV version label and run the head pass too.

**V6 implication:** the phase MD V6 "exactly 1 versions row" is superseded -- the correct state has 2 rows (tag + head), matching qwcl.

### F13 -- QWFWD `*version` is registered via `Cvar_Get` but dropped by the loader (starred serverinfo key)

**Status:** Found during Phase 1 execution (2026-06-06). The cvar-skip is CORRECT loader behavior; the residual is a cross-engine-consistency judgment for the operator. Not a Phase-1 blocker.

**Evidence:** `main.c` registers `*version` via `Cvar_Get("*version", QWFWD_VERSION, ...)`. The extractor correctly emits it (cvar count 14). The loader skips it (`[load-version] skipping entity with invalid name: *version`) because cvar names cannot begin with `*` -- the established, correct convention: `*`-prefixed names are `info_key` entities, never cvars. DB confirms across all projects: `*`-names exist only as `info_key` (mvdsv 18, ktx 13, including `*version:serverinfo`); zero as cvar. Same validation class as F24 (KTX colon-suffixed commands). So 13 cvars load, not 14, and the skip is right.

**The gap:** QWFWD sets `*version` via the cvar system, NOT via `Info_SetValueForStarKey`, so the info_keys handler (which detects `Info_*` call sites) does not capture it either. Net: `*version` is captured in neither type. mvdsv/ktx capture `*version:serverinfo` because they set it through `Info_*` calls; QWFWD's Cvar-registration idiom falls between the two handlers.

**Proposed disposition (operator judgment):** low impact -- the proxy version is already surfaced via the `versions` row (`1.40-dev`) and the `*qwfwd:userinfo` info_key (`QWFWD_VERSION_SHORT`). Capturing `*version:serverinfo` for cross-engine parity would require routing `*`-prefixed `Cvar_Get` names into the info_keys output (cross-handler) -- a Phase-3/follow-up enhancement, surfaced for the operator to decide, not a Phase-1 fix.

### F14 -- QTV `*version` dropped by the loader (same `*`-prefixed-cvar class as F13); QTV loads 40 cvars, not 41

**Status:** Found during Phase 2 execution (2026-06-06). The loader skip is CORRECT behavior (identical mechanism to F13 for QWFWD); the residual is the same cross-engine-consistency judgment F13 deferred to the operator. NOT a Phase-2 blocker.

**Evidence:** The extractor emits 41 cvars (source truth, F7), including `*version` (registered at `pkg/qtv/qtv.go:206` via `qvs.RegEx("*version", "QTVGO "+qtvRelease, qVarFlagReadOnly|qVarFlagServerInfo, nil)`, default resolves to `"QTVGO 1.16-dev"`). On load, `load-version` skips it: `[load-version] skipping entity with invalid name: *version` -- cvar names cannot begin with `*` (the established convention: `*`-prefixed names are `info_key`, never `cvar`; DB confirms zero `*`-cvars across all projects). So 40 cvars load, not 41. Verified live: `SELECT count(*) FROM entities WHERE project='qtv' AND name='*version'` returns 0 -- captured in neither type, since QTV has 0 `Info_*` call-sites (the same between-two-handlers gap as QWFWD F13).

**Phase MD correction:** the phase MD's `*version` note (line 344, "consistent with MVDSV's `*version` cvar") is WRONG -- MVDSV's `*version` is an `info_key` (`*version:serverinfo`), not a cvar (F13 established this). The phase MD (drafted 2026-06-05) predates the F13 discovery (Phase 1, 2026-06-06). The executor prompt's F7 caveat ("if the live count differs from 41/12, the live count wins -- report it and note the cause") anticipated exactly this.

**Floor-baseline implication (Phase 4):** the QTV F1 floor-count baseline is **cvar=40, command=12** (52 entities total), NOT 41/12 (53). All 52 are `source_backed`.

**Proposed disposition (operator judgment, same as F13):** low impact -- the QTV version is already surfaced via the `versions` row (`1.16-dev`), and the dropped registration's default (`QTVGO 1.16-dev`) is preserved in the extractor JSON. Capturing `*version:serverinfo` for cross-engine parity would require routing `*`-prefixed cvar registrations into the info_keys output (cross-handler) -- a follow-up enhancement, not a Phase-2 fix. Resolve identically to whatever F13's disposition becomes.

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
| Phase 0 (Schema + plumbing) | F1, F4, F9, F10 |
| Phase 1 (QWFWD extractor + vendored load path) | F2, F5, F6, F7; F12 (head-load recipe fix, RESOLVED); F13 (*version drop, surfaced) |
| Phase 2 (QTV Go extractor) | F2, F5, F7; **F12 (head+tag load recipe -- LOAD-BEARING, inherit corrected 8-call recipe)**; F14 (*version drop -- 40 cvars not 41, surfaced) |
| Phase 3 (Describe-fill) | F8 (skill gate); D6 guard is the load-bearing item; F11 (net_ip/net_port real defaults) |
| Phase 4 (Validate + concept-note decision) | F3, F7, F10 (reproducibility-method implication) |

---

*End of review findings. New findings discovered during phase drafting append with sequential F-numbers.*
