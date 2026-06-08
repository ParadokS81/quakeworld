You are executing Phase C (batched backfill) of the Layer 2 corpus reconstruction arc (2026-06-06-layer2-corpus-reconstruction). Use the `arc-executor` skill.

[RUN MODE -- reset day. PREP (build the pipeline + the batch ledger + validate on a tiny slice + the resolution_status kill-switch decision) is done separately via phase-C-prep-executor-prompt.md BEFORE the quota reset. This prompt RUNS the real ~3,796-agent backfill on reset: loop the batches 1-2/session per backfill-ledger.md, re-fencing the 2021 slice under the production reconstruction_version. Scale (12h gap, cap 1500): decisions.md Amendment under D9. R13: keep chunks <256KB (~2,700 msgs); cap 1500 is safe. GUARD: once a 2021 full-year v2 batch supersedes Phase A's v1, do NOT run load-threads.ts -- its range-delete would regress 2021 to v1 probe threads; RUN uses backfill-batch.ts only. Re-confirm the resolution_status kill-switch (with vs without) on batch-1 (#helpdesk or #quakeworld) BEFORE letting the passenger ride all batches (D7).]

PRECONDITION -- STOP if not met: Phase A's go/no-go gate is GREEN (decisions.md D2) and Phase B's fence cap is chosen. If the gate is not green, this phase does not run. [GATE GREEN -- operator-formalized 2026-06-08 (see README + arc-history); Phase B cap = 1500 (D9 amendment). Precondition MET -- proceed.]

ARC IDENTIFICATION -- confirm before touching anything. This arc fences Discord chat into THREADS and rewires search_solved_issues. Phase C fences + embeds + loads the WHOLE corpus in idempotent (channel x ~1yr) batches, paced to quota. You are in the WRONG arc if you find yourself touching engine-entity extraction, KTX/MVDSV/QTV/QWFWD, or community profiles, or being asked to merge threads at retrieval time. If so, STOP.

Working directory: /home/paradoks/projects/quakeworld  (qw-oracle is at apps/qw-oracle/.)

REQUIRED READING (all, before executing):
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md  (D5 idempotency, D7 resolution_status passenger, D9 Workflow recipe)
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md  (Phase C owns R5, R6, R7, R8)
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-A-increment-1.md  (C REUSES A's load-threads.ts + thread-key.ts -- do NOT write a second loader)
5. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-C-batched-backfill.md  -- YOUR SPEC.
6. Live source: apps/qw-oracle/scripts/calibration/wf-a-fence-queries.js (the recipe) + scripts/embed/embed-entities.ts (production embed at backfill scale -- the probe cache only covers 2021) + the per-year density table in docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md Pass 2 (covers only #helpdesk + #quakeworld; query #dev-corner + #antilag density live).

EXECUTION RULES: follow decisions.md. Highlights: idempotency is a HARD requirement -- deterministic thread_key, DELETE-scope-then-INSERT with the predicate matching the key (D5/R5); the resolution_status passenger has a batch-1 kill-switch that MUST actually run the with-vs-without comparison (D7/R6); Workflow fence = Sonnet/conc-5/paced/recovery+retry/honest counts + startup log() + args-as-JSON-string (D9/R7); embed live via the embed-entities.ts pattern; JSONB gets JS values (D12); DISTINCT on junction counts (R8). Pace 1-2 batches per session to quota; trial a small wave first.

STEP-BY-STEP:
1. Read all required files. Confirm the precondition (A gate green + B cap).
2. Critically review the phase MD against decisions.md + review-findings.md.
3. Execute: Task 1 (batch plan + ledger, incl. the live density query for the two unprobed channels), Task 2 (resolution_status passenger + batch-1 kill-switch), Task 3 (per-batch pipeline -- the repeating unit, 1-2 batches/session), Task 4 (idempotency probe). Commit per batch; update the ledger with honest fail-counts.
4. Run the phase-boundary verification (full corpus fenced + embedded + retrievable, idempotent, honest counts).
5. Halt with a structured status report + which batches are done / remaining + the resolution_status keep/drop decision.

This phase spans multiple sessions by design. Each session: pick up the ledger, run 1-2 batches, halt. Do NOT run the whole corpus at once.
