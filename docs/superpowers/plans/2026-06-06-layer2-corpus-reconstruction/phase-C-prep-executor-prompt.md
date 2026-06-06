You are executing Phase C in PREP MODE (build + validate ONLY -- NO full backfill) of the Layer 2 corpus reconstruction arc (2026-06-06-layer2-corpus-reconstruction). Use the `arc-executor` skill.

WHY PREP MODE: the operator's LLM quota is exhausted this week and resets ~2026-06-08. The full ~4,058-agent backfill (the quota chew) MUST WAIT for reset. This pass builds + proves the pipeline on ONE tiny slice so reset-day is pure execution. Do NOT run the real batches.

PRECONDITION: Phase A gate assessed GREEN by the orchestrator (operator proceeding); Phase B gap LOCKED at 12h, cap = Phase B's swept value (>=750). If B's cap is not yet reported, build cap-parameterized and validate at 750, to be re-confirmed at the final cap.

ARC IDENTIFICATION: this arc fences Discord chat into THREADS and rewires search_solved_issues. Phase C fences+embeds+loads the corpus in idempotent (channel x year) batches at the 12h gap. You are in the WRONG arc if you touch engine-entity extraction, KTX/MVDSV/QTV/QWFWD, or community profiles, or are asked to merge threads at retrieval time -- STOP.

Working directory: /home/paradoks/projects/quakeworld (qw-oracle at apps/qw-oracle/).

REQUIRED READING:
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md -- ESPECIALLY the 2026-06-06 Amendment under D9 (12h gap; cap is a floor not a ceiling; ~4,058 agents; re-fence 2021; year-boundary straddle).
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md (Phase C owns R5, R6, R7, R8).
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-A-increment-1.md (REUSE A's load-threads.ts + thread-key.ts + batchScopeClause -- do NOT write a second loader).
5. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-C-batched-backfill.md -- YOUR SPEC (read its banner first).
6. apps/qw-oracle/scripts/calibration/wf-a-fence-queries.js (fence recipe) + scripts/calibration/02-prep-chunks.ts (lullChunks) + scripts/embed/embed-entities.ts (production embed) + scripts/load-chat/thread-key.ts (batchScopeClause -- already batch-ready) + load-threads.ts.

BATCH MAP (chat+link msgs, measured 2026-06-06 -- Phase C Task 1 density is DONE; do not re-query):
  #quakeworld 374,123  (2016=14k 2017=56k 2018=62k 2019=46k 2020=53k 2021=40k 2022=18k 2023=20k 2024=28k 2025=27k 2026=9k)
  #dev-corner 196,477  (2016=10k 2017=42k 2018=30k 2019=18k 2020=21k 2021=11k 2022=12k 2023=12k 2024=16k 2025=19k 2026=5k)
  #helpdesk   103,719  (2020=14k 2021=28k 2022=14k 2023=19k 2024=12k 2025=11k 2026=5k)
  #antilag     19,387  (2021=9k 2022=3k 2023=2k 2024=3k 2025=2k 2026=1k)
  TOTAL chat+link: 693,706 across ~38 (channel,year) batches.

PREP TASKS (build + validate; NO full backfill):

1. Batch plan / ledger: write `scripts/load-chat/backfill-ledger.md` listing all ~38 (channel,year) batches with a per-batch agent estimate at 12h/cap and a checkbox each. Order #helpdesk + #quakeworld first (high value), #dev-corner + #antilag as the tail (#antilag = cross-fork antilag-netcode discussion, NOT competitive gameplay). Use the BATCH MAP above as input; exact per-batch chunk/agent counts come from chunking at 12h in Task 2.

2. `scripts/load-chat/backfill-batch.ts`: (channel, year) -> pull that window from Postgres -> lull-chunk at the 12h gap with cap = B's value (reuse the 02-prep-chunks lullChunks logic; pass gap + cap as params, do NOT import the pinned CHUNK_CAP/gap) -> write chunk files -> fence via the Workflow recipe (Sonnet, conc-5, paced waves, recovery+retry, HONEST counts, startup log() banner, args normalized as a JSON string -- D9/R7) -> load via the existing load-threads.ts / thread-key.ts / batchScopeClause (idempotent DELETE-scope-then-INSERT, R5; embed live via the embed-entities.ts pattern -- the probe cache only covers 2021; JSONB as JS values, D12; DISTINCT on junction counts, R8).

3. resolution_status passenger: extend the fence schema + prompt so each thread MAY carry resolution_status in {solved, unresolved, informational} (per-conversation LOCAL truth only, never cross-conversation synthesis -- D7).

4. VALIDATE on the SMALLEST slice ONLY -- #antilag 2026 (~1,029 msgs -> a few agents, negligible quota):
   a. Run backfill-batch.ts on that slice. Confirm threads load + embed + are retrievable via search_solved_issues.
   b. Idempotency probe (R5): run the slice twice; assert identical chat_threads count AND identical thread_key set (DELETE-scope-then-INSERT replaced, did not duplicate).
   c. resolution_status kill-switch (R6/D7): fence the slice WITH vs WITHOUT resolution_status; compare index-hallucination + a coherence spot-check against the probe baseline (0% halluc, 4.38/5). DECIDE keep-riding vs drop-to-separate-pass; record the decision + evidence in the ledger.
   d. Year-boundary straddle (Amendment): confirm a 12h bite crossing Dec 31 -> Jan 1 is covered by exactly one batch's DELETE scope, or document how it is handled.

5. HALT. Do NOT run any other batch. Structured report: pipeline built (files), idempotency PASS/FAIL, kill-switch keep/drop decision + evidence, straddle handling, the ledger (all batches + estimates + projected total agents at 12h/cap). The #antilag-2026 validation slice stays loaded (it is a legit batch -- idempotently re-runnable on reset).

RESET-DAY (do NOT do now): on quota reset, resume with phase-C-executor-prompt.md (RUN mode) -- loop the real batches 1-2/session per the ledger, including re-fencing the 2021 slice under the production reconstruction_version.

Commit the code + ledger. This is PREP: leave the corpus unfenced except the tiny #antilag-2026 validation slice.
