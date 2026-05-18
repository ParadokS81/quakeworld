# KTX Phase-3 cat-1 FLEET handoff -- 4 parallel slice workers (2026-05-18)

> **!!! THIS IS THE LAUNCH CONTRACT for the overnight cat-1 volume fleet.
> The 488 remaining cat-1 knobs are partitioned into 4 DISJOINT lanes.
> Open 4 fresh terminals, paste one PROMPT-slice-N.txt into each, sleep.
> Workers drain VOLUME only -- they do NOT commit, do NOT run Task 3/4/5,
> do NOT do the phase boundary. A later SINGLE reconciliation terminal
> does that. !!!**

Sidecar to the main resume handoff
`docs/superpowers/parking/2026-05-17-ktx-mvdsv-l1-describe-fill-phase3-executor-resume.md`
(the per-knob recipe + critical rules still govern). This doc adds the
parallel-fan-out layer the operator requested: wall time -- not context --
is now the binder (the subagent-writes-to-disk optimization keeps the
dispatcher's context lean, so a single terminal could run for hours; each
Opus-4.7-MAX 10-knob batch is ~5-6 min serial -> ~5 h single-terminal for
the rest of cat-1). 4 disjoint terminals drain it in ~1.5 h in parallel.

## State at fleet launch (live-verified 2026-05-18; re-verify, do not trust blind)

- Cursor: **136 evaluated / 488 remaining** (command 95/263, cvar 41/218,
  info_key 0/7). `--fingerprint` = `33bf5da640e8e3c13e99460075b67983`.
  `k_short_gib` terminal, counted-once. cat-2 + cat-3 fully drained
  (carried by the cursor); the 488 remaining are 100% cat-1.
- This session shipped batch-03 (116->126) + batch-04 (126->136), both
  F-D6a zero-fabrication, idempotent. Fingerprint lineage this session:
  `3a7ac3e4...` -> `89ca5db4...` (+batch-03 10) ->
  `33bf5da6...` (+batch-04 10).
- The 488 remaining == the fleet pool exactly. Partition (disjoint,
  complete, verified no-dups, all gitignored):

| Lane | ids file (apps/qw-oracle/) | count | range | composition |
|---|---|---|---|---|
| 1 | output/describe-fill/fleet/slice-1-ids.txt | 130 | `cam` .. `pos_origin` | pure command |
| 2 | output/describe-fill/fleet/slice-2-ids.txt | 119 | `pos_save` .. `voteprivate` | pure command |
| 3 | output/describe-fill/fleet/slice-3-ids.txt | 119 | `vwep` .. `_k_lastmap` | 14 command + 105 cvar |
| 4 | output/describe-fill/fleet/slice-4-ids.txt | 120 | `_k_last_xonx` .. `*mu:userinfo` | 113 cvar + 7 info_key (incl. the 11 D9 config-drift non-resolvers) |

- The 4 paste-ready prompts: `apps/qw-oracle/output/describe-fill/fleet/PROMPT-slice-{1,2,3,4}.txt`
  (gitignored data; regenerate with `bun scripts/describe-fill/gen-fleet-prompts.mjs`
  from one template -- zero drift across the 4).

## Launch ritual (operator)

1. Open 4 fresh terminals (plain `claude` in the monorepo root).
2. In each terminal N: `cat apps/qw-oracle/output/describe-fill/fleet/PROMPT-slice-N.txt`,
   copy the whole thing, paste as the first message. (Mis-pasting slice X
   into terminal Y is the ONLY way to break disjointness -- double-check
   the number. Even then the idempotent UPSERT prevents DB corruption;
   worst case is wasted compute.)
3. Sleep. Each worker self-paces: pre-flight -> 10-knob batches
   (dispatch Opus-4.7-MAX -> F-D6a cross-grep -> persist) -> halt when its
   lane is drained or it hits ~300k context, writing
   `output/describe-fill/fleet/slice-N-STATUS.md`.

## Why this is collision-safe (the operator asked; verified)

- **Records + status files are slice-numbered** in the filename
  (`phase3-records-sliceN-batchNN.json`, `slice-N-STATUS.md`) -> disjoint
  paths, no shared file.
- **DB sink**: `--persist` is idempotent UPSERT on project+type+name;
  the 4 lanes are disjoint id sets -> disjoint rows; no row is ever
  written by two workers; concurrent Postgres txns on disjoint rows do
  not contend.
- **Global `--fingerprint`** is the one genuinely shared mutable signal
  (md5 over all committed ktx rows). It is ANTICIPATED: each worker uses
  **parallel-mode gating** -- it does NOT assert "fp moved by my delta"
  (siblings perturb it, expected/benign); it asserts "my N knobs now
  carry a verdict". The single-terminal global-fp-delta check is reserved
  for the post-fleet phase-boundary (single terminal).
- **ktx clone + manifest read-only**; **commits forbidden** for workers
  (only the reconciliation terminal commits). Each worker pre-flight
  ASSERTS the clone HEAD == `67253dc9` and never mutates it.

## Carry-forward learnings baked into the prompts

- **batch-04 raw_comment learning (load-bearing).** A 10-knob batch
  passed shape + behaviour but cited `cmd_t cmds[]` registration lines
  with the CD_* macro's RESOLVED STRING in `raw_comment` instead of the
  line's verbatim text (the real `#define CD_*` lives elsewhere, e.g.
  `commands.c:590`). F-D6a caught it (6 assert-fails). Fix: `raw_comment`
  MUST be the verbatim trimmed text AT that exact line, OR `null`; a
  macro's value is evidence only via a SEPARATE entry citing the real
  `#define` line. The prompts carry this as sharpened requirement (d) +
  the dispatcher's strict re-check (`raw_comment === null ||
  === trimmed-live-line`). This is a BRIEF-quality fix, not a model one
  (the Opus-MAX synthesis judgment was sound).
- **F-D6a is the dispatcher's non-negotiable job** -- it just caught a
  real defect that would otherwise have propagated across ~488 knobs
  unattended. Never delegate/skip it; never relax zero-fab under budget
  (wrap instead).
- Mixed/qualified-case knob = the manifest packet's `knob` byte-for-byte
  (= entities.name, source case; e.g. `anglehint:frogbot:editor`). Wrong
  case -> entity-not-found on persist.
- Hedged/residue verdicts are CORRECT (C1-routed for the operator D7
  tail), not failures (e.g. `ban`/`banip`/`banrem` redirect to mvdsv;
  ban semantics not legible from the KTX tree -> hedged, not guessed).

## Post-fleet RECONCILIATION (one fresh single terminal, after all 4 lanes report)

Do NOT resume serial volume. When the 4 `slice-N-STATUS.md` files all
report their lane drained (or smell-zone-halted with a remaining tail):

1. Invoke `arc-executor`. Tiered re-verify (git-immutable cheap drift
   from baseline `292d3ad5` over the plan dir; live-mutable M / `--status`
   / `--fingerprint` / base commits / F-D4a guard / `--verify-binding`
   machinery).
2. Read all 4 slice-STATUS files. If any lane has a remaining tail
   (smell-zone halt) or a HALTED/DEFECTIVE batch: resume just that tail
   via the proven loop (the cursor is the idempotent source of truth --
   `--status` lane-intersect skips the done).
3. When `--status` == **624 evaluated / 0 remaining** and `k_short_gib`
   still its byte-identical `synthesized` record: proceed to **Task 3**
   (build + run the D7 tier-1 `gate()` -- still a STUB), **Task 4** (C5
   probe + harness + `--twice` + run report), **Task 5** (operator D7
   tier-2 tail -- all hedged/residue/meaning-conflict + sampled affirms),
   then the **phase boundary** incl. the verbatim F-D4a owned-row
   re-derive-safe fingerprint pair. Halt; do NOT proceed to Phase 4; do
   NOT re-run the holistic gate. (All per the main resume handoff +
   phase-3 MD + decisions.md -- which still govern.)

## When in doubt

The main resume handoff + phase-3 MD + decisions.md + review-findings.md
are the contract; this doc is the parallel-launch + reconciliation
layer. The live DB cursor wins over any doc. Zero-fabrication is the
held bar across all 4 lanes -- a worker that cannot hold it wraps and
records, never relaxes it.
