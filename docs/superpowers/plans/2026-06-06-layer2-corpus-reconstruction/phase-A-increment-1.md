# Phase A -- Increment 1 (the go/no-go gate)

> **Executor checklist before this phase:**
> 1. Read `decisions.md` (full) -- D1-D12 all bear on this phase.
> 2. Read `review-findings.md` -- this phase owns R1, R2, R3, R4, R8, R9, R10, R11, R12.
> 3. Grep the live files in "Files touched" BEFORE writing against them.
> 4. After drafting/executing, run the verification sub-agent brief (phase-template.md).

## Goal

Ship a thin end-to-end slice that proves the production question before any expensive backfill: **do fenced threads beat session-FTS on live queries?** Create the `chat_threads` + `thread_messages` schema, load the 1,008 already-fenced Feb-Mar 2021 threads from the probe's `scratch/wf-a.json` (reusing the cached embeddings), and rewire `search_solved_issues` to hybrid thread retrieval (vector primary + FTS via RRF). At the phase boundary the rewired MCP tool answers from threads on the 2021 slice, the old session-FTS path is retired as the retrieval unit, and the operator runs the go/no-go gate. **Runnable state:** `search_solved_issues` returns thread hits end-to-end on the 2021 slice; everything compiles and the MCP server starts.

## Inputs from previous phase

Phase A is first. Inputs are the items in `prerequisites.md`, in particular:
- Postgres up with the Arc 1 L2 corpus (`messages` populated -- `thread_messages` FKs into it).
- The probe output present and intact: `scripts/calibration/scratch/wf-a.json` (221 fenced chunks / 1,008 threads), `scratch/chunks/*.json` (221 files), `scratch/embed-cache.sqlite`. If `scratch/` was cleared (gitignored, local-only), see Recovery.
- `VOYAGE_API_KEY` + embedding-model pins in `.env` (the rewired tool calls Voyage live at query time).

## Files touched

### Created
```
apps/qw-oracle/db/migrations/0NN_layer2_threads.sql   # next FREE number (R9; 021 at planning time, verify); chat_threads + thread_messages per D4
apps/qw-oracle/scripts/load-chat/thread-key.ts        # shared deterministic thread_key helper (D5; Phase C reuses it)
apps/qw-oracle/scripts/load-chat/load-threads.ts      # thin loader: wf-a.json -> chat_threads + thread_messages; reuses embed cache (D10)
apps/qw-oracle/scripts/load-chat/gate-compare.ts       # gate harness: new thread retrieval vs old session-FTS, side-by-side (D11)
```
(`scripts/load-chat/` already exists -- it holds the Arc 1 Layer 2 loaders, `build-sessions.ts` etc. `ls` it first; the three new filenames do not collide.)

### Modified
```
apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts  # FTS-only -> hybrid RRF over chat_threads (D6)
apps/qw-oracle/serve/mcp/src/types.ts                       # SessionHit -> ThreadHit; keep SessionMessage for member messages
apps/qw-oracle/serve/mcp/src/index.ts                       # tool description (R11 truthing) + dispatch arg cast
apps/qw-oracle/serve/mcp/src/orientation.ts                 # "sessions" -> "threads"; session_id -> thread citation (R3)
apps/qw-oracle/API_CONTRACTS.md                             # open-drift #1: tool now hybrid over threads; L2_RRF_* provisional
apps/qw-oracle/SCHEMA.md                                    # document chat_threads + thread_messages
apps/qw-oracle/CLAUDE.md                                    # Layer 2 status: threads are the retrieval unit
```

### Deleted
```
n/a -- session_search / sessions / session_references stay (adjacent-context; no longer the retrieval unit).
```

## Tasks

### Task 1 -- Migration: `chat_threads` + `thread_messages`

- **Goal:** Create the two tables exactly per decisions.md D4.
- **Files:** `db/migrations/0NN_layer2_threads.sql`, `SCHEMA.md`.
- **Steps:**
  - [ ] `ls db/migrations/` and take the next free number (R9 -- do NOT hard-code 021; the qtv-qwfwd sibling may have taken it).
  - [ ] Write the migration with the D4 DDL verbatim (chat_threads: `thread_key` UNIQUE, `content` + `content_tsv` GENERATED `'simple'`, `topic_embedding vector(1024)`, `embedding_stale`, nullable `resolution_status` CHECK, nullable `buckets_*` JSONB, `reconstruction_version`; thread_messages junction with `ON DELETE CASCADE` both FKs; hnsw + GIN + the listed btree indexes). Header comment cites D3/D4/D7 and mirrors `004_layer2_chat.sql` conventions.
  - [ ] Run `bun db/migrate.ts`. Confirm it applies and `schema_migrations` records it.
  - [ ] Update `SCHEMA.md` with the two new tables.
- **Verification:**
  ```sql
  -- tables + key columns exist with the right types
  SELECT column_name, data_type FROM information_schema.columns
   WHERE table_name='chat_threads' ORDER BY ordinal_position;
  -- indexes present (hnsw on embedding, GIN on tsv, UNIQUE on thread_key)
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename='chat_threads';
  -- CHECK enums match D4
  SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='chat_threads'::regclass AND contype='c';
  ```
  PASS: both tables exist; `content_tsv` config is `'simple'`; `topic_embedding` is `vector(1024)` with an hnsw index; `thread_key` is UNIQUE; `resolution_status` + `buckets_*` are nullable.
  FAIL: any column type / CHECK enum / index drift vs D4.
- **Execution mode:** `subagent (Sonnet medium)` -- SQL synthesis against a fully-specified DDL (D4) + the proven 004/005 pattern; one migration file + SCHEMA.md.

### Task 2 -- Shared `thread_key` helper

- **Goal:** One deterministic keying function used by both this loader and Phase C (D5).
- **Files:** `scripts/load-chat/thread-key.ts`.
- **Steps:**
  - [ ] Export `threadKey({channel, reconstructionVersion, chunkId, threadIndex})` returning `"{channel}:{reconstructionVersion}:{chunkId}:{threadIndex}"`.
  - [ ] Export the batch-scope DELETE predicate builder (so C's re-run deletes exactly what it re-inserts -- R5). v1 scope for A is the whole 2021 slice at one `reconstruction_version`.
  - [ ] Export `RECONSTRUCTION_VERSION` constant tag for this arc (e.g. `'fence-sonnet-v1'`) per D12.
- **Verification:** `bun test` if a unit test is added; otherwise import-and-print a sample key. PASS: key is stable and matches the DELETE predicate.
- **Execution mode:** `subagent (Sonnet medium)` -- small, but Phase C depends on it; isolate so it is right once.

### Task 3 -- Thin loader: promote the probe's fenced threads

- **Goal:** Read `scratch/wf-a.json` + `scratch/chunks/*.json`, build `chat_threads` + `thread_messages` rows, embed each thread's raw member messages (reusing the probe cache, D10), idempotently by `thread_key` (D5).
- **Files:** `scripts/load-chat/load-threads.ts`, reads `scripts/calibration/scratch/`.
- **Steps:**
  - [ ] Pre-flight: assert `scratch/wf-a.json`, `scratch/chunks/`, `scratch/embed-cache.sqlite` exist; else print the Recovery instruction and exit non-zero (R1/R2/D10).
  - [ ] For each non-abstained fenced chunk: load `scratch/chunks/<chunkId>.json` (`{channel, messages:[{idx,id,author,content}]}`); for each thread, map `member_indices` -> the chunk messages by `idx`. NOTE: `idx` is **1-based** (`idx = j + 1`, `02-prep-chunks.ts:69`); build the lookup map keyed by the 1-based idx exactly like `03-embed-and-retrieve.ts:47` (`new Map(messages.map(m => [m.idx, m]))`), and the OOB guard drops any idx not in `[1..messages.length]` (defensive; the probe reported 0% but guard anyway -- R8). Skip threads that map to zero valid members.
  - [ ] Build the embedded/FTS text BYTE-IDENTICALLY to the probe: `members.map(m => "${m.author}: ${m.content}").join("\n")` -- this is the FULL text. (R2; matches `03-embed-and-retrieve.ts:56`.)
  - [ ] Embedding (mirror `vectors.ts` EXACTLY -- this is what makes the cache hit):
    - Cache key = `"{model}:{Bun.hash(fullText)}"` where `model` is the RESOLVED `EMBEDDING_MODEL_BUILD` (defaults to `'voyage-4-large'`; this is the `BUILD_MODEL` constant in `calibration/config.ts:17`). Hash the FULL text, NOT the sliced text (`vectors.ts:14` + `:43` key on the unsliced string).
    - On hit: use the cached vector. On miss: call `embedTexts(fullText.slice(0, 30000), buildModel, 'document')` -- the 30000-char slice is applied ONLY to the Voyage call (`vectors.ts:35`), never to the cache key. Log a truncation when `fullText` exceeds 30000 (R4). Log the call to `embedding_api_log` (source `'loader'`, the `embed-entities.ts` pattern). Store the new vector back under the full-text key.
    - Count hits vs misses; print the tally. If hit-rate is ~0%, the text reconstruction diverged -- STOP and diff against the probe (R2).
  - [ ] Compute per-thread metadata: `channel_name`, `platform='discord'`, `date_range_start/end` (min/max `created_at` of members -- join back to `messages` by id), `participant_count` + `participants_json` (distinct authors), `message_count`, `topic_label` (the fence label), `resolution_status=NULL`, `buckets_*=NULL` (R1), `reconstruction_version`, `thread_key` (Task 2).
  - [ ] Idempotent write in a transaction: DELETE existing `chat_threads` in the 2021-slice scope at this `reconstruction_version` (CASCADE drops `thread_messages`), then INSERT chat_threads (vector as `[${v.join(',')}]::vector`; JSONB as JS values per D12), then INSERT `thread_messages` junction rows. Re-running produces identical state (R5).
  - [ ] Print summary: threads loaded, junction rows, cache hits/misses, truncations.
- **Verification:**
  ```sql
  SELECT count(*) FROM chat_threads;                         -- ~1008
  SELECT count(*) FROM thread_messages;                      -- sum of member counts
  SELECT count(*) FROM chat_threads WHERE topic_embedding IS NULL;  -- 0
  SELECT count(DISTINCT thread_key) = count(*) FROM chat_threads;   -- t (unique)
  -- idempotency: re-run the loader, assert counts unchanged
  ```
  PASS: ~1008 threads, all embedded, thread_key unique, re-run leaves counts identical.
  FAIL: NULL embeddings, duplicate thread_keys, or counts grow on re-run.
- **Execution mode:** `subagent (Sonnet medium)` -- clear spec, one file, but integrates cache-reuse + byte-identical text + idempotency; isolate the context. (Bump to Sonnet MAX if the cache-key reconstruction proves fiddly in practice.)

### Task 4 -- Rewire `search_solved_issues` to hybrid thread retrieval

- **Goal:** Replace the session-FTS query path with vector-primary + FTS-secondary RRF over `chat_threads`, mirroring `search-entities.ts` (D6).
- **Files:** `serve/mcp/src/tools/search-solved-issues.ts`, `types.ts`, `index.ts`, `orientation.ts`, `API_CONTRACTS.md`.
- **Steps:**
  - [ ] In `types.ts`: add a `ThreadHit` interface (`thread_id` / `topic_label` / `channel` / `platform` / `date_range_start`/`end` / `participant_count` / `participants` / `message_count` / `resolution_status` (nullable) / `messages: SessionMessage[]` / `score`). Keep `SessionMessage`. Decide whether to retire `SessionHit` or leave it unused (note in Open questions).
  - [ ] In `search-solved-issues.ts`: embed the query (`embedTexts([query], QUERY_MODEL, 'query')`, log to `embedding_api_log` source `'mcp-query'`); `semanticCandidates` = kNN `ORDER BY topic_embedding <=> ${vec}::vector LIMIT fanout`; `lexicalCandidates` = `WHERE content_tsv @@ websearch_to_tsquery('simple', $q) ORDER BY ts_rank(...) LIMIT fanout`; fuse with `reciprocalRankFusion([lex, sem], t => String(t.thread_id))` (k=60); hydrate top `limit` hits' member messages via `thread_messages JOIN messages ORDER BY created_at LIMIT max_messages` (build `discord_url` from `discord_channels` as today). Degraded lexical-only path on Voyage failure (no throw), logged. `match_quality` from RRF score vs `L2_RRF_STRONG_THRESHOLD`/`L2_RRF_WEAK_THRESHOLD` (provisional defaults 0.02 / 0.005 -- R10).
  - [ ] In `index.ts`: rewrite the tool `description` (line ~281) -- drop the IRC + 2.66M claim (R11), describe thread retrieval over the Discord corpus, Discord-only. Keep the input schema (`query` / `limit` / `max_messages_per_session`) -- the args are unchanged.
  - [ ] In `orientation.ts`: update ALL three session references (R3) -- line ~14 ("Returns raw chat sessions" -> threads), AND the citation-discipline block at lines ~24 + ~26 ("cite by ... session_id" -> thread citation). Grep `session` in the file to confirm none is left stale. Keep the Discord-only note.
  - [ ] In `API_CONTRACTS.md`: update the `search_solved_issues` calibration row (now RRF-fused over `chat_threads`, `L2_RRF_*` provisional pending Phase D) and update open-drift #1 (was: "after Arc 3 lands embeddings"; now: embeddings landed in increment 1, thresholds still provisional pending Phase D recalibration on the full backfill).
  - [ ] Run `bunx tsc --noEmit` (or the project's typecheck) -- the type change ripples; fix all sites.
- **Verification:**
  ```bash
  bunx tsc --noEmit                          # clean
  bun test serve/mcp/src/                      # existing MCP tests pass (port/fix any session-shaped test)
  # start the server, call the tool on an in-slice query:
  #   search_solved_issues("subwoofer cuts out") -> returns thread hit(s) with member messages + score
  ```
  PASS: typecheck clean, tests green, the tool returns `ThreadHit`s with hydrated messages on an in-slice query.
  FAIL: typecheck errors, session-shaped hits, or empty results on a known in-slice query.
- **Execution mode:** `subagent (Sonnet MAX)` -- multi-file, judgment-dense (contract change + match_quality regime change + Discovery-contract truthing); the highest-care task in the phase.

### Task 5 -- Gate harness + operator go/no-go

- **Goal:** Produce the side-by-side comparison the operator judges (D11), fair to increment-1's 2021-only scope (R12).
- **Files:** `scripts/load-chat/gate-compare.ts`.
- **Steps:**
  - [ ] Load the 30 reverse-gen queries from `scratch/wf-a.json` (`.queries` where `answerable`) -- these are in-slice by construction (R12).
  - [ ] For each query: run the NEW thread retrieval (call the rewired tool's function directly, or replicate its query) AND the OLD session-FTS (the pre-rewire query against `session_search`). Print, per query: the query text, top-3 thread `topic_label`s + a snippet, and top-3 session snippets, side by side.
  - [ ] Optionally include the 12 Phase-8 anchors flagged as "noisier cross-check, 2026-sourced" (R12) -- not the primary signal.
  - [ ] Write the output to a readable file the operator skims.
- **Verification (the gate -- OPERATOR-RUN, D11):**
  - Operator reads the side-by-side. The gate is GREEN if fenced-thread retrieval is clearly more on-point than session-FTS on the in-slice reverse-gen queries (matching the probe's directional 69-72% thread-win, now confirmed live on the rewired tool).
  - GREEN -> greenlight Phase C (and consume Phase B's cap). UNDERWHELMS -> STOP the arc at A; capture the negative result in the spec + a HANDOVER note; the schema/loader/tool stay (no harm), but no backfill.
  - PASS condition: operator judges threads win (or at least match while offering richer transcripts). FAIL condition: threads do not beat sessions -> arc stops, finding captured.
- **Execution mode:** harness build `subagent (Sonnet medium)`; the gate decision is `operator-run` (D11) -- the executor prepares the comparison and hands it to the operator, does NOT self-certify the gate.

## Verification (phase boundary)

1. Migration applied; `chat_threads` + `thread_messages` match D4 (Task 1 queries).
2. ~1008 threads loaded, all embedded, `thread_key` unique, loader idempotent on re-run (Task 3 queries).
3. `bunx tsc --noEmit` clean; MCP tests green; the rewired tool returns `ThreadHit`s on an in-slice query (Task 4).
4. orientation.ts + index.ts description + API_CONTRACTS.md no longer claim sessions/IRC (R3/R11).
5. **The gate (operator-run):** side-by-side comparison reviewed; GREEN or STOP decision recorded.

## Outputs to next phase

- Schema (`chat_threads` + `thread_messages`) exists -> Phase C inserts into it; Phase B's cap sizes C.
- The shared `thread-key.ts` helper exists -> Phase C imports it.
- The hybrid `search_solved_issues` runs over threads -> Phase C's backfill makes it cover the whole corpus.
- **The gate decision:** GREEN unlocks C (+ B's cap). UNDERWHELMS stops the arc.

## Open questions / deferred items

- **Question:** Retire `SessionHit` or leave it as dead type? **Default:** leave it unreferenced (zero cost), note for a later cleanup; do not delete `session_search`/`sessions` (adjacent-context, D4 implication). **Who:** Phase A executor / later cleanup.
- **Question:** Should the gate also restrict the OLD session-FTS to 2021 sessions for a strict apples-to-apples? **Default:** no -- let the old tool use its full corpus; if it still loses to 2021-only threads on in-slice queries, the result is only stronger. Note the asymmetry in the gate output. **Who:** operator at gate time.

## Recovery (if verification fails)

- **Migration fails to apply:** it is a fresh additive migration; drop the two tables and re-run. Idempotent.
- **`scratch/` missing (D10 recovery):** regenerate -- `bun scripts/calibration/01-build-slice.ts` + `02-prep-chunks.ts`, then run Workflow `wf-a-fence-queries.js` against `scratch/wf-a-input.json`, writing the result to `scratch/wf-a.json` (~221+30 Sonnet agents, the proven recipe). Then re-run the loader; embeddings re-cache on first run (small Voyage cost).
- **Loader not idempotent (counts grow on re-run):** the DELETE scope does not match the INSERT scope (R5) -- align the DELETE predicate with the `thread_key` construction (Task 2) before re-running.
- **Cache all-misses (re-billing):** the reconstructed text is not byte-identical (R2) -- diff a sample thread's text against `03-embed-and-retrieve.ts`'s construction; fix the join/slice; re-run.
- **Gate underwhelms:** STOP -- do not improvise a fix or proceed to C. Capture the negative result; the architecture decision is the operator's.
