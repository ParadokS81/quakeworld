# Phase B -- Chunk-size sweep

> **Executor checklist:** read `decisions.md` (D9 governs the Workflow recipe), `review-findings.md` (this phase owns R7). Reuse the probe's scripts -- do NOT rebuild lull-chunking from scratch.

## Goal

Find the largest fence chunk size that still fences cleanly, so Phase C runs the fewest agents (the budget/throttle dial). Run one fence agent each at caps 750 / 1500 / 3000 on a worst-case (busy, interleaved) `#quakeworld` window; gate each by 0% index-hallucination AND coherence ~4+; take the largest passing size. **Runnable state:** the production fence cap for Phase C is chosen and written down. This phase changes no schema and no tool -- it is a calibration probe whose only output is a number.

## Inputs from previous phase

Independent of Phase A (fresh fence agents on raw chunks; needs no `chat_threads`). Runs in parallel with A. Needs:
- The live L2 corpus in Postgres (or the probe's `scratch/slice.sqlite` for the 2021 `#quakeworld` data).
- The probe scripts: `scripts/calibration/02-prep-chunks.ts` (lull-chunking), `wf-a-fence-queries.js` (the fence recipe), the arm-D hallucination tally logic in `03-embed-and-retrieve.ts`, and `wf-b-judge.js` (the coherence spot-check).

## Files touched

### Created
```
apps/qw-oracle/scripts/calibration/sweep-prep.ts     # cut a worst-case #quakeworld window into chunks at caps 750/1500/3000
apps/qw-oracle/scripts/calibration/sweep-report.ts   # tally hallucination + coherence per cap; print the verdict
```
(Both live under `calibration/` -- this is probe-shaped throwaway analysis, like the rest of that dir.)

### Modified
```
n/a
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- Prep worst-case chunks at three caps

- **Goal:** Produce, from one busy/interleaved `#quakeworld` window, three chunk files sized at 750 / 1500 / 3000 messages.
- **Files:** `scripts/calibration/sweep-prep.ts`.
- **Steps:**
  - [ ] Pick a worst-case window: the densest interleaved `#quakeworld` span. NOTE the data source -- the existing `scratch/slice.sqlite` holds ONLY the Feb-Mar 2021 window (`config.ts` WINDOW_START/END). For a busier stretch (e.g. a 2018 peak by the per-year density table), re-slice from Postgres with the `01-build-slice.ts` pattern pointed at that window; OR just use the densest contiguous `#quakeworld` stretch inside the existing 2021 slice. Do NOT assume 2018 is already in `scratch/`.
  - [ ] Reuse the `lullChunks` logic from `02-prep-chunks.ts` -- but it is currently a module-private function (`02-prep-chunks.ts:27`, not exported). Either extract it to a small shared module both scripts import, or copy it into `sweep-prep.ts`. Do NOT import `CHUNK_CAP` from `config.ts` (it is pinned to 750) -- pass `750 / 1500 / 3000` as local cap constants, one per run, or all three runs silently cap at 750.
  - [ ] Emit three chunk files (`{id, channel, messages:[{idx,id,author,content}]}`) capturing the same window content at each cap. For 750 the window yields several chunks; for 3000 it is one or few -- the point is to stress the fencer at the larger cap (more interleaving in one context).
  - [ ] Print the per-cap chunk count = the fence-agent count.
- **Verification:** three chunk sets written; the 3000-cap chunk genuinely holds ~3000 interleaved messages. PASS: chunks exist at all three caps. FAIL: the worst-case window is too quiet to fill the 3000 cap (pick a busier window).
- **Execution mode:** `subagent (Sonnet medium)` -- reuses `02-prep-chunks.ts`; deterministic.

### Task 2 -- Fence at three caps (Workflow)

- **Goal:** Fence each cap's chunk(s) with the proven recipe.
- **Files:** reuse `wf-a-fence-queries.js` (or a trimmed fence-only variant) via the Workflow tool.
- **Steps:**
  - [ ] Run the fence Workflow over the three chunk sets. Sonnet, conc-5, paced waves, recovery+retry, honest counts; normalize `args` as a JSON string (R7 / D9). Tag output with `model=sonnet`, `prompt=vN`.
  - [ ] Capture the fenced output per cap (the `{topic_label, member_indices}` threads).
- **Verification:** all fence agents return (honest count shows 0 failures, or retried clean). PASS: every cap fenced. FAIL: rate-limit wipeout (re-check conc/pacing -- R7).
- **Execution mode:** `workflow (Sonnet, conc-5, paced)` -- the fan-out IS the Workflow tool (D9). Small (a handful of agents).

### Task 3 -- Measure + verdict

- **Goal:** Per cap, compute index-hallucination and a coherence spot-check; pick the largest passing cap.
- **Files:** `scripts/calibration/sweep-report.ts`.
- **Steps:**
  - [ ] Index-hallucination per cap: % of `member_indices` outside `[1..N]` (the `03-embed-and-retrieve.ts` arm-D tally). Probe baseline was 0.0% at cap 750.
  - [ ] Coherence per cap: dispatch a few coherence-judge agents (the `wf-b-judge.js` 1-5 rubric) on a sample of each cap's fenced threads. Probe baseline was 4.38/5 at cap 750.
  - [ ] Verdict: take the LARGEST cap with 0% hallucination AND coherence ~4+. Write it down (this is C's cap). If even 1500 regresses, C uses 750 (still proven); if 3000 holds, C uses 3000 (~4x fewer agents).
- **Verification:** the report prints per-cap hallucination + coherence + the chosen cap. PASS: a cap is chosen with the gate satisfied. FAIL: all caps regress (use 750; investigate before C).
- **Execution mode:** measurement `subagent (Sonnet medium)`; coherence judging `workflow (Sonnet, conc-5)`.

## Verification (phase boundary)

The chosen production cap is recorded (in the sweep report and carried into Phase C's batch plan), justified by per-cap 0% hallucination + coherence ~4+. PASS: cap chosen. FAIL: no cap passes -> fall back to 750 (proven by the probe) and note the sweep did not earn a bigger size.

## Outputs to next phase

- **The production fence cap** -> Phase C's batch sizing (agent counts per batch scale inversely with the cap; D9).

## Open questions / deferred items

- **Question:** Is one worst-case window enough, or sweep two windows? **Default:** one densest window is enough (the probe already proved 750 broadly; this only pushes the ceiling up). **Who:** executor; add a second window only if the first is borderline.

## Recovery (if verification fails)

- **Rate-limit wipeout:** lower conc / lengthen pacing; re-run the failed cap only (R7).
- **All caps regress below the gate:** use cap 750 for C (proven safe by the calibration probe) and record that the sweep did not justify a larger size. C still ships; it just runs more agents.
