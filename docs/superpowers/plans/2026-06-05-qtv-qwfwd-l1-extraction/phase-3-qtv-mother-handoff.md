# Phase 3 -- QTV mother handoff (fresh terminal)

You are the **fresh QTV mother** for Phase 3 of arc `2026-06-05-qtv-qwfwd-l1-extraction`. The QWFWD half shipped + applied + verified in the prior mother terminal (context budget reached after 50 QWFWD knobs -- D10 / executor-prompt fresh-mother handoff). You complete Phase 3: **QTV synthesis -> apply -> full phase-boundary verification (V1-V11) -> halt to the orchestrator.** You do NOT start Phase 4.

Invoke the `arc-executor` skill (you are the per-phase executor + mother, D10).

## State (verified live at handoff, 2026-06-06)

- **QWFWD: DONE.** 50/50 entities `synthesized`, anchor 1.40-dev, applied + idempotent. Committed (commits up to e1b7b3a4 + the cmdline/info commit). Do NOT touch qwfwd ledgers or rows.
- **QTV: REMAINS.** 52 entities, all `description` NULL (no source_inline stubs on qtv -- F15 was qwfwd-only): **40 cvar + 12 command**, all `source_backed`, source_file under `pkg/qtv/*.go`, anchor **1.16-dev**.
- Apply scripts (synthesize-qtv.ts), quality-grid probes (widened to qtv/qwfwd), and the mother ledger (standing rules SR-1..SR-8) are committed and ready.

## Read first (in order)

1. `mother-ledger.md` -- standing rules. **SR-2 (D6 reject-list) is LOAD-BEARING for every QTV worker.** SR-4 (See-also MVDSV), SR-5 (breadcrumbs).
2. This file.
3. `phase-3-describe-fill.md` -- Task 4 QTV batch groupings (QTV-1..QTV-5), the per-worker brief template, V1-V11. The D6 preamble (mechanisms 1-4) + the "where the teeth are" framing (LAYER 1 floor + LAYER 4 V-pass).
4. `decisions.md` D6 (C-vs-Go trap), D8 (Opus MAX, do not re-select), D9 (breadcrumbs only).
5. `batch-ledger-qwfwd-*.md` -- the proven QWFWD pattern + carry-forward findings.

## D6 -- the load-bearing item (the operator reviews Phase 3 for this)

The C-QTV config knobs (`mvdport`, `admin_password`, `floodprot`, `allow_http`) DO NOT exist in Go QTV (they live in `fteqtv/`). LAYER 1 floor holds (Phase 2 confirmed 0 of these in the qtv rows). The SEMANTIC teeth are the **V-pass** (independent cold re-derivation, enforce-trace-discipline.md): a real Go knob (e.g. `fp_persecond`) described with paraphrased C semantics is the subtle failure ONLY the V-pass catches. **The V-pass cannot be skipped or rushed.**

- Every QTV worker brief carries the SR-2 D6 REJECT-LIST verbatim.
- **Dispatch an independent Opus V-pass worker (B3 cold-context) on every D6-sensitive QTV knob:** the `fp_*` triplet (fp_messages/fp_persecond/fp_secondsdead) [F16: corrected from fp_time/fp_limit/fp_message], `http_*` (http_enabled/http_address/...), `listen_address`, `qtv_password`, `maxclients` (SR-3: source 1000 vs nquake 100 -- describe 1000), `parse_delay`, `tick_time`, `masters`. Plus one canary per non-sensitive wave.
- V6 Probes A (no C-only knob name in any qtv description = 0 rows) + B (every described qtv entity anchors to `pkg/%` = 0 rows) are mechanical BACKSTOPS, not the teeth.

## Proven worker-brief pattern (from the QWFWD half -- reuse verbatim, swap QTV facts)

Each Opus describe worker: STEP 0 invoke `describe-fill-synthesis` skill (fallback: Read the 7 files); STEP 0b read `mother-ledger.md`; SHARED FACTS (project=qtv, anchor=1.16-dev, GROUND-TRUTH source `/home/paradoks/projects/quakeworld/apps/slipgate-app/reference/qtv/pkg/`, seed hint `.../qtv/resources/qtv.cfg`, mechanical_candidate=none, suspect_pool_member=FALSE, entities confirmed live -- no DB query needed); METHOD (WI-1 grep whole pkg/ tree; B1 per-clause enforce-trace; D20 shape, zero file:line/jargon in description; TRACED-CLEAN); **QTV-ONLY: quote the SR-2 D6 REJECT-LIST verbatim**; SR-4 See-also for qtv_password/parse_delay/masters; SR-5 breadcrumb tags; OUTPUT one ledger per knob (`ledger-qtv-<knob>.md`, exactly ONE ```json block, project=qtv, type=cvar|command, origin=synthesized, anchor=1.16-dev, provenance=null); TIGHT return (one-line verdict + description verbatim + primary ref + V-pass self-class).

Get per-knob facts: `SELECT e.name, cv.source_file, cv.source_line, cv.default_value, cv.flags_raw, cv.flag_names FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id WHERE e.project='qtv' AND e.type='cvar' AND cv.version='head' ORDER BY e.name;` (and command_versions for the 12 commands). The Go register sites are `qvs.Reg`/`qvs.RegEx`/`qvs.Regf` (cvars) + `cmd.Register` (commands).

Pace: ~4 workers/wave, process + grep-verify primary refs + V-pass(D6-sensitive) + commit per wave, append BATCH LOG. Watch your own context; this is only the QTV half so one fresh mother should finish it.

## SR-5 breadcrumb harvest (Phase 4 evidence -- report in halt)

- (a) master-server registration/heartbeat: qtv `masters` (+ the qwfwd masters* already tagged).
- (b) MVD streaming + parse_delay ghosting: qtv `parse_delay` + `tick_time`. **If these yield no breadcrumb, say so explicitly -- Phase 4 defers candidate (b) when thin.**
- (c) qtv_password cross-codebase auth: qtv `qtv_password` (See-also the shipped MVDSV qtv_password ledger).

## Apply + boundary verification (the full Task 5 + V1-V11, on the COMPLETE set)

1. Dry-run then LIVE: `cd apps/qw-oracle && bun scripts/describe-fill/synthesize-qtv.ts --from-ledger '<ABSOLUTE glob>/ledger-qtv-*.md'` (anchor 1.16-dev). Confirm persisted=52, errors=0.
2. Run V1-V11 (phase MD) on the COMPLETE 102-knob set (qwfwd already applied + V-verified; qtv newly applied):
   - V1 coverage 102/102 missing=0. V2 origin only `synthesized`. V3 anchor non-null. V4 origin_vocabulary PASS. V5 synthesized_requires_anchor PASS (now covers qtv/qwfwd). **V6 D6 Probes A+B = 0 rows (QTV-specific, load-bearing).** V7 provenance not text. V8 idempotency (re-apply skipped-terminal=N, fingerprint stable). V9 F-D4a (a load-version reload does not clobber synthesized). V10 MCP smoke -- NOTE the live MCP targets PROD (known gap, orchestrator ledger): verify the row+description in Postgres instead. V11 `bunx tsc --noEmit` exit 0.
3. Commit Phase 3 (qtv ledgers + batch-ledgers + mother BATCH LOG). Do NOT push.
4. **Halt to the orchestrator** with the structured report: V1 102/102, V6 both probes=0, the breadcrumb harvest (knobs per candidate; explicit if parse_delay/tick_time empty), idempotency/F-D4a, V11, new findings, and the carry-forward findings below. Do NOT start Phase 4.

## Carry-forward findings from the QWFWD half (include in the halt report)

- **MINOR (skill doc-ref drift):** `~/.claude/skills/describe-fill-synthesis/SKILL.md` line 52-53 still says `project -- required. ktx or mvdsv` (the orchestrator widened the functional gate line 103 + line 4/56, but not line 53). Non-blocking (the functional gate lists all four; workers dispatched fine for qwfwd). Operator's shared-tooling call; prompt forbade the executor editing the skill. Verify the same holds for qtv (workers WILL dispatch).
- **F11 (qwfwd) CLI wording:** F11/SR-8 say "-ip cmdline"; the real CLI is positional `qwfwd [port [ip]]` and cfg `set` works (cmdline overrides). Descriptions are source-correct; default_value column left source-true per SR-8. (qwfwd-only; informational.)
- **Flavour-C discipline confirmed working:** workers caught a stale S2M_HEARTBEAT comment, the whitelist destination-vs-source trap, and the protocol `#if 0` non-enforcement -- enforce-trace + grep-verify are doing their job. Apply the same scrutiny to QTV (where C-semantics leakage is the D6 risk).
- **Access model (qwfwd):** no access tiers, no own rcon. (QTV has its own auth model -- do not copy; trace QTV's.)
