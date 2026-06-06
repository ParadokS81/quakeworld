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

### F15 -- 11 QWFWD entities arrive at Phase 3 with `source_inline` descriptions, not NULL (the phase MD + executor-prompt "descriptions NULL" premise is false)

**Status:** Found at orchestrator Phase-3 pre-flight (2026-06-06), before Phase 3 kickoff, by querying live DB description coverage. The Phase-3 executor prompt was authored at ~500k context (orchestrator failure zone), so every factual claim in it was re-verified live -- this is the one that did not hold. Touches Phase 3. NOT a blocker (the worklist already reaches the rows); the fix is a premise correction + an explicit convert instruction so V2 passes.

**Evidence:** Live `entities` shows 11 of 102 qtv/qwfwd rows already carry a non-null `description` with `description_origin='source_inline'`, all on `project='qwfwd'`:
- 5 commands -- `alias`, `cvarlist`, `echo`, `serverinfo`, `wait` -- raw C source-comment text captured by the `load-commands` adapter (e.g. `cvarlist` = `List all cvars TODO: allow cvar name mask as a parameter, e.g. cvarlist cl_*` -- carries a literal `TODO`; `alias` misspells "seperated").
- All 6 info_keys -- adapter-generated placeholders shaped `userinfo info key: <name>; ops [...]` (e.g. `challenge:userinfo` = `userinfo info key: challenge; ops ["read"]`).

The other 91 rows (all 52 qtv; qwfwd's 13 cvars + 2 cmdline_params + 24 commands) are genuinely NULL. The phase MD line 180 ("`description` is NULL for all qtv/qwfwd rows") and the Phase-3 executor prompt ("102 L1 rows loaded, descriptions NULL") both mis-state the pre-state. `source_inline` is a legitimate in-vocabulary origin (the load adapters set it from source comments / templated stubs); nothing is broken -- the premise was just inaccurate.

**Impact (contained, not catastrophic):** the describe worklist enumerates `SELECT name, type FROM entities WHERE project='<p>' ORDER BY type, name` (phase MD line 486 -- by name+type, NOT `WHERE description IS NULL`), so all 11 are dispatched regardless. But (a) the mother terminal could be confused finding 11 non-NULL rows the prompt said do not exist, and (b) the `describe-fill-synthesis` skill's native contract is "affirm existing comment OR synthesize" -- if a worker AFFIRMS one of these stubs and leaves `description_origin='source_inline'`, the V2 boundary probe (phase MD line 635: "only `synthesized` ... no `source_inline`") FAILS, and the executor prompt's "origin MUST be exactly `synthesized`" is violated.

**Resolved by (Phase 3, premise correction only -- no code, no decision amendment):** the describe pass owns+synthesizes ALL 11 (end state `description_origin='synthesized'`). Justified three ways: V2 already requires it; none of the 11 stubs clear the v2 user-doc shape (raw comments / templated placeholders), so there is nothing worth affirming; and the sibling KTX/MVDSV describe arc set every one of its info_keys (ktx 56, mvdsv 45) to `synthesized` with 0 `source_inline` -- the precedent is convert, not affirm. The Phase-3 executor prompt's pre-flight bullet is corrected to state the true pre-state and instruct convert-the-11; the phase MD line-180 premise is superseded by this finding (no MD edit -- the executor reads this finding via the prompt). V1/V2 enforce the end state; no probe change.

### F16 -- QTV Go flood-protection triplet is `fp_messages`/`fp_persecond`/`fp_secondsdead`, NOT the `fp_time`/`fp_limit`/`fp_message` named in the planning docs

**Status:** Found during Phase 3 QTV-half execution (2026-06-06) by the QTV mother during pre-flight source-grep. NON-blocking; the QTV ledgers used the correct names. Touches planning PROSE only -- no DB/probe/output impact.

**Evidence:** mother-ledger SR-2, phase MD Mechanism 2 (the D6 reject-list "Go equivalents" hint), and the `phase-3-qtv-mother-handoff.md` all give the C-`floodprot` Go-equivalent as `fp_time`/`fp_limit`/`fp_message`. Those identifiers do not exist in Go QTV (`grep -rn 'fp_time\|fp_limit\|fp_message' pkg/` = 0). The real Go flood triplet is `fp_messages` (downstream_storage.go:209), `fp_persecond` (:210), `fp_secondsdead` (:211), read in downstream_client_commands.go:635-648. The reject-list's CORE function (reject the 4 C knobs `mvdport`/`admin_password`/`floodprot`/`allow_http`) is intact and source-confirmed -- all 4 are absent from `pkg/` (D6 Layer-1 floor holds); only the Go-equivalent ORIENTATION HINT for `floodprot` named non-existent cvars.

**Impact (contained):** none on output. The QTV workers described the real `fp_*` knobs from their per-knob facts; all three are V-pass TRACED-CLEAN, and the `fp_persecond` name-vs-arithmetic trap (it is a seconds-window, not a per-second rate) was actively caught. The only risk was a worker reading the SR-2 hint cold and being confused; the mother's briefs supplied corrected names verbatim.

**Proposed disposition (orchestrator/operator):** doc-only correction of the orientation hint in `mother-ledger.md` SR-2 + `phase-3-describe-fill.md` Mechanism 2 (`fp_time`/`fp_limit`/`fp_message` -> `fp_messages`/`fp_persecond`/`fp_secondsdead`) for future readers. The mother did NOT retroactively edit the committed contract docs (append-only mother ledger; the phase MD is the contract) -- the correction is the orchestrator's call, consistent with the retroactive-change discipline. No code, no decision amendment.

### F17 -- QTV Go extractor emits `flags_raw=null` for unflagged cvars; C extractors emit the `''` sentinel -- fails the runbook 3.2.1 negative bar

**Status:** Found during Phase 4 validation (2026-06-06) by the cross-front-end adapter audit (sub-agent 4c) and the Section 3.2.1 negative-bar query against live Postgres. Touches the QTV extractor + the post-v17 flags contract. NOT a phase blocker; NOT data loss; caught by NO quality-grid probe.

**Evidence:** The QTV `Reg(name, default)` registration form takes no flag argument; `extract.go`'s `resolveFlags` returns nil for such cvars, so the JSON emits `flags_raw: null` (verified: `address`, `allow_download`, ... all `flags_raw=None`, `flag_names=[]` in `qtv-variables-ast.json`). `load-cvars.ts:52` (`flags_raw: ast?.flags_raw ?? null`) preserves it as NULL. The C extractors (incl QWFWD via `normalize_flags_raw`) emit the post-v17 empty-string sentinel `''` instead (verified: qwfwd `developer`/`masters` flags_raw=`''`). Live DB: qtv has 54 cvar version-rows (27 distinct cvars x 2 versions) with `flags_raw IS NULL` and 0 with `''`; qwfwd has 10 `''` and 0 NULL. The 3.2.1 negative bar (`flags_raw IN ('0','CVAR_NONE') OR IS NULL` for source_backed cvars -> expect 0 rows) FAILS for qtv (54 rows), PASSES for qwfwd (0). The phase MD's claim "Phase-2 extractor's `resolveFlags` emits `""` for 0" is false against live data -- it emits nil. This is the negative-bar sibling of the already-deferred Q-QTV-FLAGS-CONTRACT (the positive `qVarFlag*` contract).

**Why it is not data loss:** `flag_names=[]` correctly encodes "no flags"; the cvars genuinely have none. NULL-vs-`''` is a representation choice. No consumer breaks (MCP serves `entities.description`, not `flags_raw`); no quality-grid probe (regression floor or the 19 anomaly probes) asserts on it.

**Proposed disposition (operator judgment -- surfaced, NOT deferred by the executor):** recommend a small follow-up qtv-extractor normalization -- `resolveFlags` returns `""` (not nil) for the no-flags case, bringing the Go front-end into sentinel-parity with the C front-ends; then re-extract + re-load + re-run V1-V6. Alternative: document a qtv carve-out mirroring Q-QTV-FLAGS-CONTRACT. NOT fixed in-phase: it touches shipped Phase-2 extractor code and the phase MD scoped qtv flags handling as future-arc work; fixing in-phase is scope drift the executor prompt did not authorize. Operator decides fix-now vs follow-up vs carve-out.

### F18 -- V6 full-grid surfaced pre-existing ezquake floor-baseline drift (NOT a Phase-4 regression)

**Status:** Found during Phase 4 V6 (2026-06-06, the full 7-project regression grid). Touches ezquake floor baselines only; NOT caused by this arc; out of Phase-4 scope.

**Evidence:** `quality-grid --project ezquake --family regression` reports 8 failures: `F1.ezquake.floor.cvar_count` (live 2996 vs baseline 2992), `command_count` (699 vs 693), `cvar_source_state` / `command_source_state` / `cmdline_param_source_state` (doc_only/source_retired shifts), `F1.first_seen_min_ordinal` (117 stale `first_seen_version`), `gl_lightmode_ping_pong` (18 vs 15), `doc_only_count` (61 vs 57). These are NOT this arc's regression: the Phase-4 Task-2 edit is purely additive (`git diff` = 30 insertions, 0 deletions, 0 lines touching ezquake; 19 added lines reference qtv/qwfwd), and no ezquake load ran in this phase (the idempotency reload was scoped to `project IN ('qtv','qwfwd')`). The ezquake floor baselines are stale vs live dev-head data -- the recurring "floor counts are snapshots" situation (`reference_qw_oracle_floor_vs_clean_reload`). The other four existing projects (fte/mvdsv/qwcl/ktx) and both new projects (qtv/qwfwd) are all grid-clean.

**Proposed disposition:** out of Phase-4 scope. Recommend a separate ezquake floor re-baseline pass (source-walk to confirm the new counts are legitimate dev-head growth, then bump the `EZQUAKE_FLOOR_PROBES` expected values, per the KTX 2026-06-04 bump precedent). Surfaced to the operator/orchestrator for routing; the executor did not self-route to HANDOVER nor bump the baselines (that is a separate, source-walk-gated decision).

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
| Phase 3 (Describe-fill) | F8 (skill gate); D6 guard is the load-bearing item; F11 (net_ip/net_port real defaults); **F15 (11 qwfwd source_inline stubs -> own+synthesize all 11; pre-state premise corrected)**; F16 (QTV Go floodprot triplet is fp_messages/fp_persecond/fp_secondsdead not the planning-docs' fp_time/fp_limit/fp_message -- surfaced, doc-only) |
| Phase 4 (Validate + concept-note decision) | F3, F7, F10 (reproducibility-method implication); **found in execution: F17 (qtv flags_raw null-vs-sentinel -- operator decision), F18 (pre-existing ezquake floor drift -- out of scope)** |

---

*End of review findings. New findings discovered during phase drafting append with sequential F-numbers.*
