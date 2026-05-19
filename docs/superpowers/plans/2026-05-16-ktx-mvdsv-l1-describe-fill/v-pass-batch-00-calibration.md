# V-pass batch 0 -- CALIBRATION findings (2026-05-19, orchestrator session #6)

NOT a Stage-1 ledger. This is the calibration run that validated/repaired
the scale-up plan before 9 terminals fire. Authority for the method:
`decisions.md` D7 Amendment 2026-05-19 (B1-B5). Batch 0 = the first 40
synthesized/synthesized KTX rows by `ORDER BY canonical_id` (OFFSET 0
LIMIT 40, the 10 FIX knobs excluded), 8 read-only Opus subagents x 5
rows, oracle `/tmp/ktx-src-67253dc9` == `1.47-2-g67253dc`.

## Three findings

1. **CANARY FIRED (critical).** `autotrack` is a ground-truth C-FIX
   (probe-established + orchestrator re-grep: `CF_MATCHLESS` (1<<4) =
   "valid FOR matchless"; `CF_MATCHLESS_ONLY` (1<<8) = "matchless only";
   autotrack has CF_MATCHLESS not _ONLY, so "allowed only outside a live
   match" is WRONG -- no `match_in_progress` guard in the autotrack
   path). The offset-35 subagent returned `autotrack = TRACED-CLEAN`
   under the FULL hardened prompt -- a controlled false-negative on the
   exact invisible class, via the exact r42 pattern (saw the flag, saw a
   dispatch line, did not work through permissive-vs-restrictive). A
   different subagent (offset-30) got the identical flag/clause RIGHT on
   `auto_pow` in the same run. Conclusion: the hardened prompt is
   necessary but NOT sufficient; residual false-negative rate on the
   invisible class is non-zero; the per-wave spot-verify + a seeded
   known-defect canary is load-bearing, not optional. offset-35's whole
   wave (autotrack, autotrackktx, berzerk, blitz2v2, blitz4v4) is
   SUSPECT -- autotrackktx carries the identical CF_MATCHLESS clause and
   is a probable same false-negative; re-trace required.

2. **Alphabetical partition is non-representative.** The canonical_id
   head is ~50% the `Nfav_go` family + the `auto*`/spectator cluster,
   and carries TWO replicated root-cause defects: (a) fav_go
   populate-command misnaming (actual `favN_add` -- `fav1_add` etc.
   commands.c:846+ -- mis-stated as `1fav_add`/`Nfav_add`, and the
   FALSE claim that generic `fav_add` fills the favx[] slots; `favx[]`
   <- favX_add/Xfav_go vs separate `fav[]` <- fav_add/next_fav,
   progs.h:1009-1010 -- the C-FIX calls are REAL); (b) the CF_MATCHLESS
   name-inference shared across autotrack/auto_pow/autotrackktx/berzerk.
   Contiguous slicing CLUSTERS root-cause-correlated rows. Batch-0 raw
   ~42% (~17/40) is a clustering artifact, NOT a fleet estimate. The
   random-probe ~14% remains the fleet base rate. Per-batch contiguous
   rates will swing wildly and are not comparable; only a strided/hashed
   partition yields per-batch-meaningful rates + a sound global number.

3. **fav_go family defect is real + systemic** (~13 members): a genuine
   first B4 re-synth cohort. Subagents correctly split by exact row
   wording (specific wrong name / false fav_add->favx claim = C-FIX;
   loose "the fav add commands" = defensibly TRACED-CLEAN), which is
   evidence they were reading carefully, not blanket-flagging.

## Two required scale-up fixes (before 9 terminals fire)

- **F-V1 strided partition.** Replace contiguous `OFFSET k*size LIMIT
  size` with a deterministic stride/hash assignment (e.g. batch =
  `abs(hashtext(canonical_id)) % N`) so families spread across batches,
  no batch is defect-clustered, and the global rate is sound. Update the
  handover template's Step 0/2 SQL.
- **F-V2 structural canary + enforced spot-verify.** Each wave's row set
  MUST include >=1 seeded known-defect row (autotrack-class C-FIX or
  k_teamoverlay-class near-miss) whose expected verdict is known; if the
  wave does not reproduce it, the wave is rejected and re-dispatched.
  The terminal's own per-wave orchestrator re-grep (>=1 flagged + >=1
  clean) is promoted from "should" to a hard gate. Update the handover
  template Step 4.

## Status

Batch 0 is calibration-grade, NOT committed as a Stage-1 ledger. Scale-up
to 9 terminals is BLOCKED on operator ratification of F-V1 + F-V2. The
fleet base-rate estimate stands at ~14% (random probe); the ~574 V-pass
is still required by B2 (operator scan cannot retire flavour-C). C4
holds: nothing applied, no L1 row mutated, no re-synth run.
