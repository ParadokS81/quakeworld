# Phase 3 executor prompt -- arc 2026-06-05-qtv-qwfwd-l1-extraction

You are the **arc-executor** (and the **mother terminal**, D10) for **Phase 3 -- describe-fill (QWFWD + QTV)** -- the arc's heaviest phase. Invoke the `arc-executor` skill and execute against the phase MD. You own a living mother ledger and dispatch disposable per-batch describe workers (Opus MAX, one knob each, via the `describe-fill-synthesis` skill); they read the ledger warm, do one batch, and return a tight DELTA you append.

**Arc identity (halt if mismatch):** arc `2026-06-05-qtv-qwfwd-l1-extraction`, scaffold `docs/superpowers/plans/2026-06-05-qtv-qwfwd-l1-extraction/`. You are writing source-verified descriptions for the QWFWD (C) + QTV (Go) Layer 1 knobs. The sibling KTX/MVDSV describe arc is a See-also reference ONLY -- if you find yourself editing `mvdsv-*-ledger-*.md`, STOP.

**Working directory:** `/home/paradoks/projects/quakeworld` (qw-oracle at `apps/qw-oracle/`).

## Read first (in this order)

1. `.../README.md`
2. `.../decisions.md` -- D6 (C-vs-Go QTV trap -- LOAD-BEARING), D8 (describe-fill at spec-locked Opus MAX -- do NOT re-select), D9 (concept notes deferred -- breadcrumbs only, no authoring), D10 (mother-ledger), D7 (ASCII).
3. `.../review-findings.md` -- **Phase 3 owns F8 (skill gate -- ALREADY RESOLVED, see below) + F11 (net_ip/net_port real defaults)**; D6 guard is the load-bearing item.
4. `.../phase-3-describe-fill.md` -- the phase MD. Read cold + critically. It carries the full mother-ledger shape, SR-1..SR-6 standing rules, the per-worker brief template, the apply mechanism (synthesize-qtv.ts / synthesize-qwfwd.ts), the quality-grid probe extension, and V1-V11.

## Orchestrator pre-flight (already done -- do NOT redo)

- **Phases 0, 1, 2 SHIPPED + independently re-verified green.** 102 L1 rows are loaded, descriptions NULL, all `source_backed`:
  - **qwfwd (50):** cvar 13 / command 29 / cmdline_param 2 / info_key 6.
  - **qtv (52):** cvar 40 / command 12.
- **Q-SKILL (F8) is RESOLVED.** The orchestrator already widened the `describe-fill-synthesis` gate to `{ktx,mvdsv,qtv,qwfwd}` (+ scope doc-refs), verified live as the only project-branch. **Your describe workers WILL dispatch for qtv/qwfwd -- do NOT re-edit the skill; do NOT halt on the line-102 gate.** (If a worker still reports an abort on project scope, STOP and tell the orchestrator -- the edit regressed.)
- `*version` is NOT a queryable entity (dropped by the loader, F13/F14) -- it gets NO describe row. Describe only the 102 loaded entities.
- Go binary is at `/usr/local/go/bin` if you need to read-run anything, but Phase 3 only READS the qtv Go source (`pkg/`) for register-site verification -- no `go run`.

## D6 guard -- LOAD-BEARING (the operator reviews Phase 3 specifically for this)

The C-vs-Go QTV trap: nQuake ships a *C-QTV* config whose knobs (`mvdport`, `admin_password`, `floodprot`, `allow_http`) DO NOT EXIST in the Go QTV target (they live only in `fteqtv/`). The mother ledger (Task 1) carries SR-2 (the verbatim D6 REJECT-LIST + Go equivalents); every QTV worker brief quotes it word-for-word. The orchestrator's Phase-2 D6 sanity already confirmed **none of the 4 C-only knobs are in the qtv L1 rows** (the Layer-1 floor holds -- you cannot describe a knob with no row), but the SEMANTIC teeth are the enforce-trace + V-pass (Task 4): a real Go knob (e.g. `fp_message`) described with paraphrased C semantics is the subtle failure only the V-pass catches. **The V-pass cannot be skipped or rushed.** V6 Probes A/B are mechanical backstops, not the teeth.

## CROSS-PHASE OBLIGATION -- SR-5 breadcrumbs feed the Phase 4 concept-note decision

When a knob's description touches one of the three concept-note candidates, the worker writes a `[L3 breadcrumb: <candidate>]` tag into `description_reasoning` (NEW convention, SR-5; do NOT author a concept note -- D9). The candidates:
1. **master-server registration/heartbeat** -- qwfwd `masters`/`masters_query`/`masters_heartbeat`/`masters_filter_servers`, qtv `masters`.
2. **MVD streaming + parse_delay ghosting** -- qtv `parse_delay` + `tick_time`.
3. **qtv_password cross-codebase auth matrix** -- qtv `qtv_password` (See-also the shipped MVDSV `qtv_password` ledger).

Phase 4 queries these tags as its decision evidence. **In your halt report, summarize the breadcrumb harvest: which knobs carried which candidate tag.** If the `parse_delay`/`tick_time` harvest comes back empty, say so explicitly -- Phase 4 defers candidate (b) when breadcrumbs are thin.

## F11 -- net_ip / net_port real defaults (QWFWD describe item)

The extractor emitted `default_value="ip"` / `"port"` (variable names, not literals -- `net.c` registers them with a variable arg; F11). The describe author reads `net.c` and surfaces the REAL defaults in the description: `net_ip` defaults to `0.0.0.0` (all interfaces) when no `-ip` cmdline; `net_port` defaults to `QWFWD_DEFAULT_PORT` = 30000. Whether to also correct the `default_value` column (static override) is an operator judgment noted in F11 -- default: leave the source-true variable name, fix it in the description prose.

## psql access + shared DB

Host `psql` is NOT installed. From `apps/qw-oracle/`: `set -a && . ./.env && set +a` then `docker exec -i qw-oracle-postgres-dev psql "$DATABASE_URL" -c "<query>"`. The dev DB is **shared with a parallel l2-calibration session** (different tables); your apply scripts upsert only `project IN ('qtv','qwfwd')` -- no global ops.

## Mother-ledger context discipline (D10 + budget)

This is the heaviest phase (102 knobs, Opus-MAX per knob, batched 4-6/wave). Watch YOUR (the mother's) context. If you approach ~350k mid-phase, wrap the current wave cleanly, commit its ledgers + the BATCH-LOG append, and hand off to a FRESH mother terminal (the committed mother ledger + per-knob ledgers are the durable contract -- a fresh mother reads them warm). Do NOT push a single mother terminal through all 102 knobs if context degrades.

## Execution notes

- ASCII-only (D7). Describe workers run at spec-locked Opus MAX via `describe-fill-synthesis` (D8) -- do NOT re-select model/effort.
- Task 1 (mother ledger) = `inline`. Task 2 (synthesize-qtv.ts + synthesize-qwfwd.ts, mirror synthesize-mvdsv.ts) + Task 3 (extend quality-grid `synthesized_requires_anchor` / `origin_vocabulary` arc-scoped guard / `provenance_entry_exists` to add `qtv,qwfwd`) = `subagent (Sonnet medium)`. Task 4 (the describe fan-out) = `subagent (Opus MAX via describe-fill-synthesis)` per knob + the mother orchestration + F-D6a grep-verify inline. Task 5 (apply) = `inline`.
- Apply via `synthesize-{qtv,qwfwd}.ts --from-ledger '<ABSOLUTE glob>'` -- the glob MUST be absolute (the script's cwd is apps/qw-oracle; ledgers live at monorepo-root docs/...). `description_origin` MUST be exactly `synthesized`. anchor = `1.16-dev` (qtv) / `1.40-dev` (qwfwd). `description_provenance = null` (cold-synth).
- Boundary verification V1-V11 (Postgres, D12): V1 coverage (every qtv/qwfwd entity has a description, missing=0), V2 origin (only `synthesized`), V3 anchor non-null, V4 origin_vocabulary probe, V5 synthesized_requires_anchor probe (now covers qtv/qwfwd), **V6 D6 probe (Probe A: no C-only knob name in qtv descriptions = 0 rows; Probe B: every described qtv entity anchors to a `pkg/` source_file = 0 rows)**, V7 JSONB provenance not stringified, V8 idempotency (re-apply = skipped-terminal, persisted 0), V9 F-D4a (a load-version reload does not clobber synthesized rows), V10 MCP smoke (data layer -- the live MCP targets PROD, a known gap; verify the row+description in Postgres), V11 tsc exit 0.

## Carry-forward you hand to Phase 4

- Every qtv (52) + qwfwd (50) entity described, `description_origin='synthesized'`, anchored.
- The `[L3 breadcrumb]` tags in `description_reasoning` (the concept-note decision evidence).
- `synthesize-qtv.ts` / `synthesize-qwfwd.ts` + the extended quality-grid probes (already live for Phase 4's grid run).

## Halt and report (do NOT auto-proceed to Phase 4)

Commit Phase 3 on `main` (ledgers + apply scripts + quality-grid extension; one-line message). Do NOT push. Then **halt** with a structured `DONE` / `DONE_WITH_CONCERNS` / `NEEDS_CONTEXT` / `BLOCKED` report including: V1 coverage (102/102 described), the V6 D6 probe results (both = 0 rows), the **breadcrumb harvest summary** (knobs per candidate), the idempotency/F-D4a results, V11 tsc, any new findings (next is F15), and whether you handed off to a fresh mother mid-phase. Report back to the orchestrator; do NOT start Phase 4.
