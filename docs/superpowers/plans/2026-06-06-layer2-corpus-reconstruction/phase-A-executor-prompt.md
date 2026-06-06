You are executing Phase A (Increment 1 -- the go/no-go gate) of the Layer 2 corpus reconstruction arc (2026-06-06-layer2-corpus-reconstruction). Use the `arc-executor` skill.

ARC IDENTIFICATION -- confirm before touching anything. This arc rebuilds qw-oracle Layer 2 retrieval: it fences Discord chat into topic-coherent THREADS, embeds raw member messages, stores chat_threads + thread_messages, and rewires search_solved_issues to hybrid thread retrieval. You are in the WRONG arc if you find yourself: extracting engine entities (cvars/commands), touching KTX/MVDSV/QTV/QWFWD or describe-fill or L1 *_versions tables; or working on player/clan profiles, lookup_by_nick, community.* tables; or being asked to merge threads at retrieval time, embed a summary, or build a query-time mention-resolve loop (all LOCKED-OUT, decisions.md D1/D13). If any of those, STOP and re-check.

Working directory: /home/paradoks/projects/quakeworld  (qw-oracle is at apps/qw-oracle/; run bun scripts from there.)

REQUIRED READING (all, before executing):
1. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/README.md
2. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/decisions.md  (D1-D12 all bear on Phase A)
3. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/review-findings.md  (Phase A owns R1, R2, R3, R4, R8, R9, R10, R11, R12)
4. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/prerequisites.md  (verify the probe output exists first)
5. docs/superpowers/plans/2026-06-06-layer2-corpus-reconstruction/phase-A-increment-1.md  -- YOUR SPEC.
6. Live source you will mirror or modify (grep BEFORE writing):
   - apps/qw-oracle/db/migrations/004_layer2_chat.sql + 005_layer3_concepts.sql  (migration conventions)
   - apps/qw-oracle/scripts/calibration/{03-embed-and-retrieve.ts, vectors.ts, 02-prep-chunks.ts}  (text + cache reconstruction, R2)
   - apps/qw-oracle/serve/mcp/src/tools/search-entities.ts  (the hybrid RRF pattern to copy) + tools/search-solved-issues.ts (what you replace) + types.ts + orientation.ts + index.ts (~line 281)
   - apps/qw-oracle/scripts/embed/embed-entities.ts  (embed/log pattern)

EXECUTION RULES: follow decisions.md. Highlights: ASCII only (D12); Bun + `bun db/migrate.ts`, append-only migrations, update SCHEMA.md (D4/D12); embed RAW member messages, reuse the probe cache, hash the FULL text (D3/D10/R2); JSONB gets JS values (D12); idempotent loader by thread_key (D5/R5); respect each task's execution mode.

STEP-BY-STEP:
1. Read all required files. Note Phase A's owned risks.
2. Critically review the phase MD against decisions.md + review-findings.md. If a task contradicts a decision, STOP and surface it.
3. Execute Tasks 1-5 per their execution modes. Commit after each meaningful change (one-line message).
4. Run the phase-boundary verification. Task 5 is the OPERATOR-RUN gate (D11) -- prepare the side-by-side comparison and hand it to the operator; do NOT self-certify the gate.
5. Halt with a structured status report: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED + the YES/NO verification results + open questions + the gate readiness (ready for operator to judge).

Do NOT auto-proceed to Phase C. The operator runs the gate and reviews at the boundary.
