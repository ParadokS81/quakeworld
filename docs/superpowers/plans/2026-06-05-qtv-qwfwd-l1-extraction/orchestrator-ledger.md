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
| 3 describe-fill | **SHIPPED** (commits c5aa4092 -> 14b1e2d2; QWFWD+QTV halves) | **YES (orchestrator, 2026-06-06)** | 102/102 synthesized; V6 D6 gate clean (A=0,B=0/0); F15 resolved; F16 doc-only; breadcrumbs harvested -> P4 (cand-b NOT thin) |
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
   - **STATE: CAPTURED (orchestrator-verified live 2026-06-06).** 11 breadcrumb tags harvested from `description_reasoning`: (a) 6 [qtv masters + qwfwd masters/masters_heartbeat/masters_query/masters_filter_servers/heartbeat], (b) 4 [qtv parse_delay, tick_time, qtv, address] -- **NOT thin**, (c) 1 [qtv qtv_password]. See the concept-note bias section for the Phase-4 implication.
4. **Q-SKILL Option A gate-widening (describe-fill-synthesis skill).**
   - **STATE: DONE (orchestrator, 2026-06-06).** `~/.claude/skills/describe-fill-synthesis/SKILL.md` gate (live line 102) widened `{ktx,mvdsv}` -> `{ktx,mvdsv,qtv,qwfwd}` (the FUNCTIONAL fix). Verified live: grep confirms the gate was the ONLY project-equality branch (F8's claim holds). Scope-hygiene doc refs also widened: SKILL.md lines 4 (desc) / 56 (anchor_version) / 352 (escape-hatch) + `references/subagent-brief-template.md` lines 17 + 43 (worker-facing out-of-scope marker). Remaining `KTX/MVDSV` mentions are trigger-context, not scope-fences. This is an out-of-repo user-global skill edit (not in the quakeworld git history); recorded here. Phase 3 describe workers can now dispatch for qtv/qwfwd.

## Concept-note decision bias (Phase 4, operator-endorsed starting point; live breadcrumbs refine; operator ratifies)
- (a) master-server registration/heartbeat = AUTHOR (strong).
- (b) MVD streaming + `parse_delay` ghosting = author-lean; DEFER if breadcrumbs thin.
- (c) `qtv_password` auth matrix = DEFER (MVDSV ledger already documents the matrix; QTV row See-also-links to it).

**Harvest result (Phase-3 boundary, orchestrator-verified live 2026-06-06):** breadcrumbs are in.
- (a) AUTHOR (strong) STANDS -- 6 knobs tagged (qtv `masters` + qwfwd `masters`/`masters_heartbeat`/`masters_query`/`masters_filter_servers`/`heartbeat`); the QTV side is the heartbeat *sender*, pairs with qwfwd + the ezquake client querier.
- (b) **bias shifts DEFER-if-thin -> AUTHOR-LEAN.** The "defer if thin" trigger did NOT fire: 4 knobs tagged (qtv `parse_delay` = live-stream hold-back / anti-ghosting, `tick_time` = centralized tick pacing of both up/downstream loops, `qtv` command's per-stream delay overriding parse_delay, `address`). A real mechanism cluster, not a lone knob.
- (c) DEFER STANDS -- 1 knob (qtv `qtv_password`), See-also the shipped MVDSV qtv_password ledger.

Phase 4 DECIDES which to author (D9: decide-not-author; the FINAL call is the operator at P4 sign-off). Authoring, if greenlit, is a separate follow-on arc.

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

### Phase 3 -- PRE-FLIGHT GREEN (fresh orchestrator, 2026-06-06); NOT yet dispatched

New orchestrator session (the founding session hit ~500k writing the Phase-3 prompt + resume handoff). Before the operator dispatches the Phase-3 executor, re-verified the whole arc state cold AND critically reviewed the 500k-authored `phase-3-executor-prompt.md` against live source:

- Scope check GREEN: migration 020 applied (102 qtv/qwfwd rows exist), baselines match exactly (`qtv cvar 40 / command 12`; `qwfwd cvar 13 / command 29 / cmdline_param 2 / info_key 6`, all `source_backed`), versions head+tag for both (`{label ord1, head ord999999}`, F12), `bunx tsc --noEmit` exit 0, Q-SKILL gate still `{ktx,mvdsv,qtv,qwfwd}` (SKILL.md line 103). Phase 3 genuinely not started (no commit, no artifacts; 91/102 descriptions NULL).
- **F15 found + corrected (the prompt's one defect):** the prompt + phase MD line 180 claim "descriptions NULL for all" -- live DB shows **11 qwfwd rows already carry `source_inline` stubs** (5 commands = raw C comments, all 6 info_keys = adapter placeholders). The worklist (by name+type, phase MD line 486) reaches them, but a worker affirming a stub would leave `source_inline` and fail V2. Disposition: own+synthesize all 11 (matches V2 + the sibling-arc info_key precedent: ktx 56 / mvdsv 45 info_keys all `synthesized`, 0 `source_inline`). Logged to review-findings.md (F15) + ownership table; the prompt's pre-flight bullet now states the true pre-state and instructs convert-the-11.
- Everything else in the prompt verified correct against live source: counts, `source_backed`, `*version` dropped (F13/F14), the 3 breadcrumb candidates, F11 net_ip/net_port defaults, the `1.16-dev`/`1.40-dev` anchors. The prompt is clean to dispatch.

Next: operator dispatches the corrected Phase-3 executor in a fresh terminal. This orchestrator waits for the executor halt, then verifies the Phase-3 boundary independently (V1 coverage incl. the 11 converted; V2 origin all `synthesized`; V6 D6 Probes A/B; origin_vocabulary + synthesized_requires_anchor regressions; idempotency + F-D4a; the breadcrumb harvest for P4). Then generates the Phase-4 executor prompt.

### Phase 3 -- QWFWD HALF verified green (orchestrator, 2026-06-06); QTV half handed to a fresh mother

The Phase-3 executor reached context budget after the 50 QWFWD knobs and handed the QTV half to a fresh mother (D10 / ~350k rule; authorized by the executor prompt). MID-PHASE handoff, NOT the phase boundary -- the full V1-V11 runs after QTV on the complete 102-knob set. Independently spot-verified the QWFWD half before clearing the QTV mother (did not trust the executor PASS):

- **QWFWD: 50 synthesized / 0 source_inline / 0 NULL (with_desc=50).** F15 FULLY RESOLVED -- all 11 stubs (5 commands + 6 info_keys) converted to `synthesized`, exactly as the corrected prompt instructed. V3 anchor: 0 synthesized rows missing an anchor. Commits `55af4afc -> 3a8ddfe2` present (interleaved with l2-calibration commits -- expected); working tree clean of describe artifacts.
- **QTV pre-state confirms the mother handoff:** 52 NULL, 0 source_inline (F15 was qwfwd-only), 40 cvar + 12 command, anchor 1.16-dev. The handoff doc `phase-3-qtv-mother-handoff.md` is accurate + clean to dispatch.
- **Skill doc-ref fix (completes founding-orchestrator obligation #4):** `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 52 still read 'required. `ktx` or `mvdsv`' (the founding session widened the functional gate line 103 + the anchor_version doc-ref line 56, but missed the Inputs project line). Widened to '`ktx`, `mvdsv`, `qtv`, or `qwfwd`'. Doc-only, zero behavior change (the functional gate already lists all four; qwfwd workers dispatched fine). Out-of-repo user-global edit, recorded here.
- **F11 CLI nuance (informational, qwfwd-only):** the real QWFWD CLI is positional `qwfwd [port [ip]]` (no `-ip` flag); cfg `set` works, cmdline overrides. Shipped descriptions are source-correct; `default_value` column left source-true per SR-8. No action.
- Executor-surfaced enforce-trace wins (stale S2M_HEARTBEAT comment, whitelist dest-vs-source trap, protocol `#if 0` non-enforcement) confirm the V-pass is biting, not rubber-stamping -- the same scrutiny carries to the D6-critical QTV half.

QWFWD half pushed as a verified safety checkpoint (50 Opus-MAX knobs are expensive to regenerate). Next: operator dispatches the QTV mother (`phase-3-qtv-mother-handoff.md`); this orchestrator verifies the FULL Phase-3 boundary (V1-V11 incl. the load-bearing V6 D6 Probes A+B + the SR-5 breadcrumb harvest) when it halts.

### Phase 3 -- VERIFIED GREEN (orchestrator, 2026-06-06); arc describe-fill COMPLETE

QTV mother halted DONE_WITH_CONCERNS (every V1-V11 self-reported green; concerns = F16 doc-only + the known MCP-PROD gap + a non-defect narrowing). Independently re-ran the full boundary on the COMPLETE 102-knob set -- did not trust the PASS:

- V1/V2: 102/102 described, ALL `synthesized` (qtv 52, qwfwd 50) -- 0 source_inline, 0 null.
- V3: 0 synthesized rows missing anchor. V4 `describe_fill.origin_vocabulary` PASS + V5 `describe_fill.synthesized_requires_anchor` PASS + `provenance_entry_exists` PASS, for BOTH qtv and qwfwd (Task-3 extension confirmed live; quality-grid exit 0, no FAILs).
- **V6 [LOAD-BEARING D6 GATE]: Probe A = 0 (no C-only knob name -- mvdport/admin_password/floodprot/allow_http -- in any qtv description), Probe B = 0 for BOTH cvar and command (every qtv knob anchors `pkg/%`).** The D6 semantic gate holds on independent re-run.
- V7 provenance string-scalars = 0. V9 F-D4a owned-row guard present in all four derivers (`IS DISTINCT FROM 'synthesized'`, derive-entity-description.ts:150/179/216/245). V11 `bunx tsc --noEmit` exit 0.
- V8/V10 accepted from executor evidence: V8 fingerprint stable + the V9 guard confirm idempotency mechanically (did not re-run the write path on the shared DB); V10 PROD-MCP gap is known -- data-layer verified (qtv:qtv_password, qwfwd:masters synthesized + anchored).
- **F16 CONFIRMED:** the qtv fp_* knobs in the DB are `fp_messages`/`fp_persecond`/`fp_secondsdead` (the real triplet); the planning-doc D6-hint's `fp_time`/`fp_limit`/`fp_message` are non-existent in `pkg/`. Descriptions were written against the real knobs (V-pass TRACED-CLEAN; the `fp_persecond` seconds-window-not-rate trap was actively caught). Doc-only residual.
- **Breadcrumb harvest CONFIRMED, candidate (b) NOT thin** (obligation #3 + bias section updated).
- The D6 V-passes bit, not rubber-stamped: independent cold re-derivations confirmed `masters` excludes the qwfwd-C host:port/max-8 clauses; `qtv_password` is real SHA3-512 (not the crypto.go XXH3 decoy); `exec` is case-sensitive .cfg and collapses-not-rejects `..` (diverging from the qwfwd C sibling). Each flavour-C trap was a discrimination win.

Sign-off: **Phase 3 SHIPPED** (commits c5aa4092 -> 14b1e2d2; pushed at this boundary). Zero defects. No decision amendment. Open operator items (none block Phase 4): (1) **F16 doc-correction** -- recommend correcting the phase MD Mechanism-2 + `phase-3-qtv-mother-handoff.md` hint (`fp_time/fp_limit/fp_message` -> the real triplet) with a dated F16 note; leave the append-only mother-ledger untouched (the executor correctly did not retro-edit it); (2) F13/F14 `*version:serverinfo` cross-engine parity -- still the paired low-impact deferral. Next: generate `phase-4-executor-prompt.md` (breadcrumbs ready; candidate (b) now leans author; floor baselines qtv 40/12 + qwfwd 13/29/2/6 captured), then drive the Phase-4 boundary -> arc ship + arc-reviewer handoff.

### Phase 4 -- PREP DONE (orchestrator, 2026-06-06); prompt drafted, awaiting operator review -> dispatch

- **F16 applied (operator-approved, doc-only).** Corrected the wrong `fp_*` triplet in `phase-3-describe-fill.md` (Mechanism-2 hint, 2 spots + 1 illustrative example) and `phase-3-qtv-mother-handoff.md` (2 spots), each explicit-hint spot carrying a dated `[F16]` note. The append-only `mother-ledger.md` SR-2 was left untouched by contract (the F16 finding record + the two corrected forward-facing docs suffice; a future fork copies from the phase MD / handoff, not the spent mother ledger).
- **`phase-4-executor-prompt.md` written.** The phase-4 MD was drafted 2026-06-05 (before Phase-1/2 execution surfaced F12/F13/F14), so the prompt carries 4 LOAD-BEARING overrides ("this prompt wins where it disagrees with the MD"): (1) the `*version` count-reconciliation delta -- cvar JSON-1=DB (qtv 41->40, qwfwd 14->13; F13/F14), every other type exact -- so the executor does NOT mis-flag the documented drop as silent loss; (2) the F12 head+tag idempotency re-run = 8 qwfwd / 4 qtv calls (MD says 4/2), F-D4a-safe; (3) floor baselines qtv cvar=40 (not 41) + qwfwd 13/29/2/6; (4) V10/Section-8 MCP smoke verified at the DATA LAYER (live MCP is PROD-scoped, returns empty -- the known gap). Plus the breadcrumb-grounded concept-note framing (a=author / b=author-lean [not thin] / c=defer; operator ratifies at sign-off) and the F16 names for the 4b code review.
- **Phase-4 MD stale-count corrections applied (operator request, before dispatch).** Per the operator's "correct it in the MD so there's no ambiguity," patched all stale spots in `phase-4-validate-decision.md` DIRECTLY (it was drafted pre-F12/F13/F14): the qtv cvar `41 -> 40` loaded baseline (floor-probe values lines 258-259 + every prose mention; F14), the Section-0 versions-row count `1 -> 2` (F12 head+tag), the Section-1.2/1.3 + V3 idempotency recipe `4/2 -> 8/4` calls (F12), the V2/Section-1.2 + recovery count-reconciliation logic (cvar DB = JSON-1; the `*version` drop is NOT loss -- F13/F14), and V10 reframed to data-layer (PROD-scoped MCP gap). Each carries a dated `[F12]`/`[F13/F14]`/`[F14]` tag. Re-grep confirms 0 stale markers; every surviving `41` is correctly the extractor/registration-site count with the loaded count stated as 40. The MD and the executor prompt now agree (no more "this prompt wins" divergence on these points).
- Next: operator reviews the prompt -> dispatches the Phase-4 executor in a fresh terminal. This orchestrator then verifies the Phase-4 boundary (V1-V10) independently, tags `arc-qtv-qwfwd-l1-shipped`, pushes, and writes the post-arc handoff to `arc-reviewer` (fresh terminal -- the reviewer must read cold).
