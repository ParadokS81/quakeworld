# Orchestrator ledger -- arc 2026-06-05-qtv-qwfwd-l1-extraction

Running cross-phase memory for the arc-orchestrator session. Append-only per phase boundary. The README phase-index is the public status board; this ledger is the orchestrator's working memory (pre-flight state, cross-phase wires, decision amendments, boundary-verification log).

**Role:** orchestrator (coordination only -- does NOT modify project code; dispatches arc-executor terminals per phase, verifies boundaries independently).
**Execution mode chosen:** fresh arc-executor terminal per phase (operator decision, 2026-06-05).
**Session boundary (2026-06-06):** the founding orchestrator session approached its context budget after verifying Phase 2; it wrote the Phase-3 executor prompt + a fresh-orchestrator resume handoff at `docs/superpowers/parking/2026-06-06-qtv-qwfwd-l1-extraction-orchestrator-resume.md`. A FRESH orchestrator picks up at the Phase-3 boundary (verify P3 -> drive P4 -> arc ship -> arc-reviewer).

---

## Pre-flight (2026-06-05) -- COMPLETE

- All 5 phase MDs `approved`; full scaffold + spec + seed + all phase MDs read cold. Cross-phase contract chain consistent 0->1->2->3->4.
- **Prerequisites:** P1 PASS (Postgres up+healthy, migrator clean at `019`, 0 pending). P2 PASS (qtv/qwfwd sources present, no `.git` in either -- D1/F2 holds). P5 PASS (libclang-18 + python3-clang clean).
- **P6 (Go 1.24) -- RESOLVED 2026-06-06.** Go **1.24.4** installed at `/usr/local/go/bin` (operator ran the tarball install; orchestrator persisted the PATH to `~/.bashrc` line 149 -- the operator's "line 3" was a literal `#` comment, a no-op). `~/.bashrc` early-returns for non-interactive shells, so the Phase-2 executor prompt is hardened with a `/usr/local/go/bin` fallback. Phase 2 unblocked.
- **F9 recorded** (review-findings.md): Phase 0 introspection/V2 query doubly broken (ORDER BY alias-cast error + `ILIKE '%project%'` projectile false-positive -> 11 rows not 10). Migration DDL correct. Corrected query (key on `'ezquake'`) verified to return exactly 10. Fix carried in `phase-0-executor-prompt.md`, not the approved MD.
- psql access: host `psql` NOT installed; use `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL"` (DATABASE_URL from `apps/qw-oracle/.env`).

---

## Phase status board

| Phase | Status | Boundary verified by orchestrator? | Notes |
|---|---|---|---|
| 0 schema+plumbing | **SHIPPED** (commit bf944a3f) | **YES (2026-06-06)** | F9 fix used; F10 found+fixed by executor (13th Record site) |
| 1 qwfwd extractor | **SHIPPED** (commit 161c6c1a) | **YES (2026-06-06)** | F12 head+tag recipe fix (D4 amended); F11->Phase3; F13 open operator Q |
| 2 qtv extractor | **SHIPPED** (commit cc80ea6a) | **YES (2026-06-06)** | F12 head+tag worked (52 source_backed); F14 (*version drop, cvar=40 not 41) |
| 3 describe-fill | prompt handed off (Q-SKILL **DONE**) | pending -> fresh orchestrator | mother-ledger + batched describe; F11; D6 load-bearing; breadcrumbs -> P4 |
| 4 validate+decide | not started | -- | F10: standalone-rerun+git-diff, NOT `idempotency --project`; floor baselines below (qwfwd 13/29/2/6, qtv 40/12) |

---

## Cross-phase capture obligations (the wires that silently break)

1. **Phase 1 V4 QWFWD per-type counts -> Phase 4 floor baselines.** NOT hardcoded (F7: extractor count is truth).
   - **STATE: CAPTURED (orchestrator-verified live, 2026-06-06).** `QWFWD_FLOOR_PROBES` `expected` values for Phase 4 Task 2, all `source_state=source_backed`:
     - `cvar = 13` (extractor emitted 14; loader correctly drops `*version` -- F13)
     - `command = 29` (`cvar_hash_print` excluded -- `#ifdef CVAR_DEBUG` off; F7 holds)
     - `cmdline_param = 2`
     - `info_key = 6`
   - Phase 4 `makeFloorCountProbe('qwfwd', <type>, N)` + `makeFloorSourceStateProbe('qwfwd', <type>, { source_backed: N })` for each.
2. **Phase 2 V4 QTV counts -> Phase 4 QTV_FLOOR_PROBES.**
   - **STATE: CAPTURED (orchestrator-verified live, 2026-06-06), all `source_backed`:**
     - `cvar = 40` -- **NOT 41.** Extractor emits 41 (source truth), loader drops `*version` (F14, same class as F13 -- `*`-names are info_key, never cvar). Use 40.
     - `command = 12`
   - (52 total qtv entities.)
3. **Phase 3 `[L3 breadcrumb: <candidate>]` tags -> Phase 4 concept-note decision evidence.** New convention (mother-ledger SR-5; absent from sibling arc) written into `entities.description_reasoning`. Phase 4 Task 3 Step 0 queries these. If the `parse_delay`/`tick_time` harvest comes back empty, Phase 4 defers candidate (b) per the endorsed bias.
   - STATE: pending (Phase 3 not run).
4. **Q-SKILL Option A gate-widening (describe-fill-synthesis skill).**
   - **STATE: DONE (orchestrator, 2026-06-06).** `~/.claude/skills/describe-fill-synthesis/SKILL.md` gate (live line 102) widened `{ktx,mvdsv}` -> `{ktx,mvdsv,qtv,qwfwd}` (the FUNCTIONAL fix). Verified live: grep confirms the gate was the ONLY project-equality branch (F8's claim holds). Scope-hygiene doc refs also widened: SKILL.md lines 4 (desc) / 56 (anchor_version) / 352 (escape-hatch) + `references/subagent-brief-template.md` lines 17 + 43 (worker-facing out-of-scope marker). Remaining `KTX/MVDSV` mentions are trigger-context, not scope-fences. This is an out-of-repo user-global skill edit (not in the quakeworld git history); recorded here. Phase 3 describe workers can now dispatch for qtv/qwfwd.

## Concept-note decision bias (Phase 4, operator-endorsed starting point; live breadcrumbs refine; operator ratifies)
- (a) master-server registration/heartbeat = AUTHOR (strong).
- (b) MVD streaming + `parse_delay` ghosting = author-lean; DEFER if breadcrumbs thin.
- (c) `qtv_password` auth matrix = DEFER (MVDSV ledger already documents the matrix; QTV row See-also-links to it).

---

## Decision amendments log

- **D4 amended 2026-06-06 (F12).** "Insert exactly one versions row per target" SUPERSEDED -> single frozen snapshots need head+tag (2 rows): `head` (ord 999999, source-backed anchor) + `<label>` (ord 1, identity). Per-type recipe is 8 calls (qwfwd, 4 types) / 4 calls (qtv, 2 types). Dated block landed under D4 in decisions.md. LOAD-BEARING for Phase 2. (F10 stays consistent with D1; no D1 amendment.)

---

## Parallel-session awareness

A separate session is committing **l2-calibration** work to `main` concurrently (commits ed06d98a / 6ab6738d / a60c6d7c interleave with this arc's c3332a01 / bf944a3f). Different topic (L2 corpus reconstruction), shared main tree + shared Postgres (different tables). Per the operator's git rule this is NOT a flaggable collision. Discipline: scope every commit's `git add` to this arc's files only; verify `git diff --cached --stat` before commit; HEAD moves under us between turns.

---

## Boundary-verification log

### Phase 0 -- VERIFIED GREEN (orchestrator, 2026-06-06)

Independently re-ran every boundary probe (did not trust the executor's PASS):
- V2 (F9-corrected query): **10/10** project-CHECK clauses widened, every one carries both `qwfwd` + `qtv`.
- V6: migration `020_qtv_qwfwd_projects.sql` recorded in schema_migrations.
- V7: `bun db/migrate.ts` re-run = "20 total, 0 newly applied" (idempotent, sha256 intact).
- V4: `qtv` version + `qwfwd` entity INSERTs both succeed (rolled back).
- V5: `bogus` rejected by `entities_project_check` (rolled back).
- V3: `bunx tsc --noEmit` exit 0.
- F10 fix reviewed in source: `IdempotencyProject = Exclude<Project,'qw'|'qtv'|'qwfwd'>` -- D1-consistent (qtv/qwfwd bypass extract-tag), narrows-not-adds, comment explains why. Sound.
- Commit bf944a3f scope clean (10 files, all qtv-qwfwd). Pre-flight c3332a01 + bf944a3f both ancestors of HEAD.
- Phase 0->1 contract confirmed: `build-snapshot.ts` qtv/qwfwd = `'head'` provisional (lines 692-693); 0 versions rows for qtv/qwfwd; SCHEMA.md updated.

Sign-off: Phase 0 SHIPPED. No decision amendments. F10 captured (review-findings.md) with Phase-4 reproducibility-method implication already consistent with Phase 4's load-version-rerun idempotency (V3) -- no Phase-4 MD change needed.

### Phase 1 -- VERIFIED GREEN (orchestrator, 2026-06-06)

Independently re-ran the boundary (commit 161c6c1a):
- Per-type counts x source_state: **all 50 source_backed** (cvar 13 / command 29 / cmdline_param 2 / info_key 6); 0 non-source_backed. -> Phase-4 baselines captured above.
- versions: `{1.40-dev ord1, head ord999999}`, both `ok`, commit_sha `1.40-dev` -- confirms the F12 head+tag fix.
- Field spot-check `masters_query`: source_backed, default `1`, `src/query.c:697`.
- V9 tsc exit 0; V8 reproducibility: independent re-extract (workers 1) -> empty git diff.
- Commit scope clean (12 files: clang_config + 4 handlers + extract.py + 4 output JSON + build-snapshot + review-findings). 161c6c1a ancestor of HEAD.
- F12 deviation handled: D4 amended (above). F11 -> Phase 3 (net_ip/net_port real defaults via describe). F13 -> open operator Q (capture `*version:serverinfo` for cross-engine parity? low impact -- version already in versions row + `*qwfwd:userinfo`).
- CAVEAT (not a blocker): V5 MCP round-trip could not be confirmed against the dev DB -- the session's live qw-oracle MCP server targets PROD, so `lookup_entity(qwfwd,...)` returns empty there. Verified at the data layer instead (row + fields + source_backed). The tracer-bullet's load path is proven; MCP-against-dev (and eventual prod refresh) is a separate deploy concern.

Sign-off: Phase 1 SHIPPED. D4 amended (F12). Open items surfaced to operator: F13 disposition; the EXTRACTOR-PLAYBOOK head+tag-rule recommendation (executor's idea -- fold "single-version projects load head+tag" into the playbook/onboard-extractor skill so future onboardings don't repeat F12; surfaced, not done -- shared-tooling change, operator's call).

### Phase 2 -- VERIFIED GREEN (orchestrator, 2026-06-06)

Independently re-ran the boundary (commit cc80ea6a):
- counts x source_state: **cvar 40 + command 12, all 52 source_backed**, 0 non-source_backed (F12 head+tag worked for QTV). -> Phase-4 baselines captured above (40/12, NOT 41/12).
- versions: `{1.16-dev ord1, head ord999999}`, both `ok`, commit `1.16-dev`.
- F14 confirmed: extractor JSON emits 41 cvars incl `*version` (source truth); loader drops `*version` (`*`-names are info_key) -> 40 in DB. `SELECT ... name='*version'` returns 0.
- D6 sanity: the 4 C-only knobs (mvdport/admin_password/floodprot/allow_http) absent from qtv entities (0) -- the Go extractor leaked no C knobs (reinforces Phase-3 D6 Layer-1 floor).
- Field spot-check `qtv_password`: source_backed, default `''`, `pkg/qtv/downstream_storage.go`.
- V9 tsc exit 0; V8 reproducibility: independent `go run` re-extract -> empty git diff (Go extractor deterministic).
- Commit scope clean (extract.go + go.mod + 2 output JSON + build-snapshot + review-findings). cc80ea6a ancestor of HEAD.

Sign-off: Phase 2 SHIPPED. No decision amendment (F14 consistent with F13 + loader name-validation). Q-SKILL gate-widening landed (obligation #4 DONE) -> Phase 3 unblocked. Open items: F13+F14 are now a paired operator question (capture `*version:serverinfo` for qwfwd+qtv cross-engine parity, or defer? both low-impact -- version already in versions row + `*qwfwd:userinfo`).
