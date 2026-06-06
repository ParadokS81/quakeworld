# Layer 2 corpus reconstruction -- arc-scope design

**Status:** in progress. Pass 1 complete 2026-05-04; **Pass 1.5 reshape ratification complete 2026-06-05** (architecture reshaped -- primer prerequisite dropped, lazy/query-time retrieval adopted; see the Reshape section); Pass 2 complete 2026-06-05 (calibration gate -- sample-test designed + methods-research validated); **Pass 3 complete 2026-06-06 (index mechanics -- v1 = prune / fence / embed-raw-messages / hybrid-retrieve; merge + summary + labels deferred or dropped)**; Passes 4-5 pending.
**Author:** ParadokS + Claude (Opus 4.7 Pass 1; Opus 4.8 Pass 1.5).
**Arc parking doc:** `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md`.
**Spec for:** arc-planner scaffolding once brainstorm exits at Pass 5 close.

---

## Scope

This arc reconstructs Layer 2 of the QW Oracle knowledge service from the bottom up. It replaces the timestamp-bucket session unit (15-minute gap heuristic) with topic-coherent threads as the primary retrieval unit for `search_solved_issues`. Sessions remain as raw timestamp grouping for adjacent-context display; threads layer on top via a many-to-many junction.

The arc folds three previously-parked items into one cohesive piece of work:

1. **Layer 2 thread reconstruction** (parked 2026-05-03 at `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md`) -- the architectural spine. ~80% of the pipeline is specified there.
2. **Author trust weighting in retrieval ranking** (HANDOVER future-arc) -- only carries signal once threads are the retrieval unit (frequency-weighted-by-thread-resolution-status).
3. **Layer 2 hygiene leftovers #2 + #6** (HANDOVER recently-opened) -- both superseded by Stage 2's quiet-hour chunking + Stage 3's cross-session merging + Stage 3's reply-graph signal.

## Reshape (Pass 1.5 -- 2026-06-05): lazy retrieval; primer dropped as prerequisite

Pass 1 assumed a Stage 0 "glossary primer" had to be built and the corpus pre-annotated with community-recognition vocabulary *before* Claude could analyze conversations. Pass 1.5 retired that assumption. The reasoning, settled in conversation 2026-06-05:

**Three jobs, not one.** Segmentation (deciding where a conversation starts/ends), embedding (turning a span of text into a vector), and retrieval (matching a query to stored vectors) are distinct. The primer was conceived to help the first. But:

- **Embedding is knowledge-free.** Voyage places a span on its meaning-map by reading the raw text; Claude knowing or not knowing what a nick / clan / tournament means at index time does not move the vector. The primer never touches the embedding.
- **Segmentation needs text-comprehension, not background knowledge.** To bound or disentangle a conversation, Claude reads the visible messages and groups co-referent ones ("foppa's frag" <-> "foppa is nuts") without needing to know foppa is a player. Proper-noun recognition helps only on a narrow proper-noun-dense subset -- marginal, not load-bearing.
- **Retrieval recovers the "what" symmetrically.** "Who was the best clan in 2010" embeds into the same region as the 2010 chatter regardless of what Claude knew when it chunked. Pre-knowledge is not required for recall.

**What actually drives retrieval quality is boundary coherence**, not knowledge: a one-topic-ish chunk embeds to a sharp coordinate; a 10-topic blob embeds to mush; a 5-way fragment embeds five weak signals. Effort belongs on getting good-enough boundaries, and embeddings are forgiving of fuzzy ones.

### Lazy / agentic retrieval (where the community knowledge actually lives)

The historical knowledge (players / clans / tournaments / glossary) is not wasted -- it moves to the **other end of the pipe, at query time**:

1. User asks a question.
2. Embedding retrieval returns the relevant conversations (knowledge-free).
3. Claude reads the hits, spots tokens it cannot resolve, and calls back into the MCP (`lookup_player` / `lookup_clan` / `lookup_tournament`) to turn nicks and clan tags into rich profiles.
4. Claude writes the grounded answer.

This is the same tool-using loop the oracle already runs for L1 facts. Two properties make it strictly better than the index-time primer: (a) **disambiguation is easier at query time** -- Claude has the conversation context plus the user's question in hand, so "which Acid" is resolved by evidence rather than guessed-and-frozen at index time; (b) **the expensive artifact (embeddings) stays immutable while the cheap artifact (profiles) stays live** -- improving a profile tomorrow enriches every future answer retroactively, with no re-embedding.

### Decoupling

The embedding arc and the community-knowledge arc are now **independent tracks that meet only at the query-time lookup seam**:

- **Embedding arc (this spec):** prune -> segment -> embed -> retrieve. No glossary bootstrap, no primer dependency. Unblocked today.
- **Community-knowledge arc (the half-built qwiki community-reference arc):** parallel, never blocks the embedding arc. Its keystone deliverable is the **MCP lookup tools (its Phase 6)** -- the only piece the query-time loop calls. Tournaments / cross-links (its Phase 4/5) add incremental richness; the L2 primer (its Phase 7) is dropped/superseded by live lookups + Claude's judgment + the existing `match_quality` guard.

### Amended Pass-1 locks

| Pass-1 commitment | Reshape disposition |
|---|---|
| Stage 0 "glossary primer bootstrap" pipeline stage | **DELETED.** Embedding is knowledge-free; no index-time primer. |
| Lock "Author role hints in primer" (iterative role-list) | **RE-HOMED to query-time.** Author-trust / role signal, if kept, is a retrieval-time concern (Pass 5), not an index-time primer field. |
| Meta-pattern #2 "bigger brain insurance" (glossary as index-time investment) | **INVERTED.** The knowledge is cheap *query-time* insurance, lazy and optional -- not an upfront index-time investment. |
| Abstain reason "primer does not cover this vocabulary" | **REWORDED.** Abstain now signals topic-boundary uncertainty, not missing glossary coverage. |

### Implication: the sample-test is promoted to the first forward pass

Pass 2 ("calibration gate") now runs the cheap sample-test *first* -- it decides how much LLM disentanglement the chunker actually needs before the chunker is specced. Previously this was buried in Pass 3/4.

---

## Pipeline shape (locked 2026-05-03; Stage 0 struck Pass 1.5)

Stages, junk-pruned and lull-chunked. Each stage produces a durable artifact the next consumes; each is independently inspectable. How much of Stage 2's LLM disentanglement is actually needed -- vs cheap mechanical signals (time gaps, reply edges, participant overlap) -- is the open calibration question settled by the Pass 2 sample-test.

- **Stage 0:** ~~Iterative glossary primer bootstrap~~ **STRUCK (Pass 1.5)** -- embedding is knowledge-free; entity recognition moves to query-time lazy lookups.
- **Stage 1:** Heuristic junk pruning (LLM-bootstrap on 10% sample, then deterministic-script production pass on 90%).
- **Stage 2:** Within-session disentanglement (primer-grounded LLM, quiet-hour chunked).
- **Stage 3:** Cross-session topic merging (embedding clustering + reply-graph signal).
- **Stage 4:** Final summary + embed at thread granularity, with `resolution_status` + `buckets` metadata.

Pass 2 of the brainstorm refines per-stage sub-questions; this section captures the locked shape.

## Pass 1 outputs (settled 2026-05-04)

### Adjacent-topic resolution

| Topic | Lock |
|---|---|
| Cross-fork disambiguation | Light L1 inclusion of Dusty's antilag-focused ezQuake/MVDSV/KTX fork plus 1-2 concept notes on when-to-care-about-the-fork. NOT a Stage 4 metadata field. |
| Time / era awareness | Out of scope for L2 prep. Lives at MCP query-time discretion: the consumer LLM decides relevance across L1/L2/L3 hits. |
| Reply edges as Stage 2 signal | Within-chunk explicit-reply pairs go in the same sub-thread. Stage 3 still uses reply-edges as cross-session similarity signal. |
| Author role hints in primer | **AMENDED Pass 1.5: re-homed to query-time (no index-time primer).** Author / role signal, if kept, is a retrieval-time concern -- see Pass 5. ~~Iterative skill-baked role-list; operator-verified seed per channel; analyzer suggests additions per-chunk.~~ |
| Bucket rubric depth | Empirical discovery via 3-6 month sample run. The 9 buckets + multi-tag stand; new buckets or rubric rules added only when patterns make obvious gaps. |

### Analyzer output format

> **Pass 1.5 note:** retained as the broad output shape, subject to Pass 3 refinement under the reshape -- the `role_suggestions` field re-homes to query-time, and the abstain reason is reworded from "primer does not cover this vocabulary" to topic-boundary uncertainty.

LLMs emit text. That text needs to be parseable so a loader script can convert thread proposals into `chat_threads` + `thread_messages` rows. JSON is the format -- Anthropic native structured-output mode, parser-robust, machine-interchange (not a UX surface).

**Stage 2 emission shape (per chunk).** When the LLM successfully disentangles:

```json
{
  "abstained": false,
  "chunk_id": "...",
  "threads": [
    {
      "topic_label": "Linux NVIDIA stutter with sys_highpriority",
      "member_message_ids": ["mid-101", "mid-103", "mid-107"]
    },
    {
      "topic_label": "HUD layout newhud workflow",
      "member_message_ids": ["mid-102", "mid-104", "mid-105"]
    }
  ]
}
```

When comprehension fails:

```json
{
  "abstained": true,
  "chunk_id": "...",
  "abstain_reason": "Heavy multi-author Russian banter about an obscure 2017 cvar; primer does not cover this vocabulary."
}
```

**Stage 4 emission shape (per merged thread).** When the LLM successfully summarizes + tags:

```json
{
  "abstained": false,
  "thread_cluster_id": "...",
  "topic_summary": "Andeh, nas, Faustov hit screen flicker on Windows after closing ezQuake when HDR is enabled. Workaround: disable HDR before launch.",
  "resolution_status": "solved",
  "buckets_question": ["system", "engine-config"],
  "buckets_answer": ["system"],
  "role_suggestions": []
}
```

The `role_suggestions` field is the iterative-role-list mechanic: when an author stands out as authoritative on a topic and is not yet in the primer's role-list, the analyzer proposes them for operator review. Empty array is the common case.

### Abstain path semantics

Two failure modes the analyzer can hit, with different responses:

1. **Comprehension uncertainty.** "I do not understand what is being said." Triggers per-chunk (Stage 2) or per-thread (Stage 4) abstain. Abstained items go to a review pile; they do NOT produce database rows. Recurring abstentions on the same vocabulary drive primer-loop iteration -- Stage 0 runs again with operator triage to grow the glossary.
2. **Task uncertainty (close calls).** "I understand the content but the call I am making is close." Deferred for v1. Sample-test spot-checks during the calibration test catch this. Re-evaluate adding a per-thread `task_confidence` field if Stage 3 merging shows precision problems on close-call threads.

Comprehension uncertainty is the bigger failure mode for v1 because it produces *bad* output (fabricated threads). Task uncertainty produces *correct* output where a score would only refine downstream weighting. Hence: abstain in v1, confidence deferred.

### Meta-patterns shaping the arc

1. **Empirical discovery over top-down rubric.** Author-role-list seeding and bucket-rubric depth are answered by "run on a sample, see what emerges, then commit." This shapes the arc's Phase 0/1 -- the first runs are partly diagnostic, not just productive. Stage 0's primer-loop and Stage 1's heuristic-derivation already follow this shape; the same discipline extends to role-list seeding and bucket-rubric expansion.
2. **Prep-work calibration ("bigger brain insurance"). INVERTED Pass 1.5:** the knowledge is cheap *query-time* insurance (lazy MCP lookups resolved on demand), not an upfront index-time investment. ~~Glossary + L1-lookup + role-list + per-channel character notes are cheap index-time insurance worth investing in.~~ The "do NOT gold-plate" discipline survives and now applies to the query-time community-knowledge track: build profiles as queries demand them, not exhaustively ahead of evidence.

## Pass 2 outputs (settling -- 2026-06-05): Calibration gate

**Status:** COMPLETE (2026-06-05). All Pass 2 decisions locked. Test arm set, eval scoring, and decision rule confirmed against the methods-research pass (`docs/research/2026-06-05-chat-corpus-retrieval-methods.md`). Fills the "Pass 2" placeholder in the scope section below. **Next action: build + run the calibration test (implementation, not brainstorm) before Pass 3** -- Pass 3 is scoped by the result.

### Corpus slice (locked)

- **Channels: `#helpdesk` + `#quakeworld`.** They bracket the disentanglement-difficulty axis -- `#helpdesk` is the channel `search_solved_issues` serves and the EASY (reply-threaded Q&A) case; `#quakeworld` is the HARD (high-volume, interleaved) case. `#dev-corner` / `#antilag` sit between the extremes and are covered by the bracket; dropped from the test.
- **Temporal: one contiguous window in 2021.** The only era where BOTH channels are dense (verified per-year: `#helpdesk` peaks 2021 at 28,642; `#quakeworld` strong at 42,250). Contiguous, NOT scattered, because the load-bearing measurement is within-window interleaving (Stage 2 disentanglement); scattered slices would break the interleaving signal. Exact months TBD via a per-month density drill before the run.
- **Size: ~2-3 months, ballpark 12k (2mo) to 18k (3mo) messages** before prune.

### Prune prerequisite (locked)

- Use the EXISTING deterministic classifier labels (`message_labels.category`): drop `reaction` / `bot` / `system`, keep `chat` + `link`. Verified live (2026-06-05) this removes only ~2.5% of `#helpdesk` (2,633 / 106,352) and ~4.8% of `#quakeworld` (19,047 / 393,170) -- the obvious junk only.
- **Do NOT build the spine's Stage 1 banter-pruner as a test prerequisite.** Correction to a prior assumption: that heuristic was never built; only the lightweight classifier exists, and it does NOT "cut a lot." Under the reshape (LLM fences, does not analyze) we WANT the fencer to see banter so it fences banter into a throwaway thread instead of letting it bleed into a real thread's embedding. The test MEASURES whether banter volume hurts cost/quality; a positive result is what would justify building the pruner -- it is not assumed up front.

### Test arms (FINAL -- confirmed by methods research 2026-06-05)

Four construction methods, NO arm E. The methods research found every modern technique either needs a topic-coherent thread to ALREADY exist (Contextual Retrieval, late chunking, proposition/parent-doc/sentence-window -- wrong pipeline layer) or collapses into C/D. Each arm embedded with Voyage v4 and queried identically:

- **A -- FTS keyword baseline** (as shipped: session tsvector, no embedding).
- **B -- embed existing 15-min sessions as-is** (no re-segmentation).
- **C -- cheap mechanical-signal segments** (time gaps + reply edges + participant overlap; NO LLM). **+ CODI** (github.com/USIREVEAL/CODI, MIT, classical Max-Entropy reply-to classifier -- the only open tool benchmarked on Discord/IRC) folded in as a zero-cost reference baseline (no F-score published -> comparative datapoint, not a quality anchor).
- **D -- LLM-fenced topic threads** (the reshape job: group co-referent messages, one-line label, no domain priming). Cost: ~200-500 lull-chunked LLM calls -- a few dollars for the test slice; ~$90 production ballpark stands. Do NOT inherit the literature's ~28k-call / $168 figure (it prices a naive sliding-window architecture). Lull-chunking already mitigates the message-ID-hallucination / lost-in-the-middle risk.

Hypothesis to watch: C looks fine on `#helpdesk`, falls apart on `#quakeworld` -- that per-channel asymmetry is the headline calibration signal (LLM needed everywhere vs only on messy channels vs nowhere).

**Skipped + revisit-later (research-backed, NOT arms).** Semantic similarity-trough chunking SKIPPED -- the strongest negative result in the research, it fails on short conversational data (confirms C is the right cheap arm). Late chunking HARD-BLOCKED -- the Voyage REST API exposes no token-level vectors (verified in `apps/qw-oracle/shared/embedding.ts:66-79`). Proposition/parent-doc/sentence-window SKIPPED -- they need coherent input or inject cross-thread noise. Revisit only AFTER an arm wins: Anthropic Contextual Retrieval (per-thread enrichment on the winner, cheap with prompt caching); voyage-context-3/4 (2025/2026 contextualized-chunk-embedding model, REST-accessible, but outside the locked voyage-4 pair -- revisit if that constraint relaxes); proposition as a within-thread sub-chunker (only if Stage-3 merged threads approach the 32K ceiling). Full rationale: `docs/research/2026-06-05-chat-corpus-retrieval-methods.md`.

### Eval substrate (locked)

Two separate measurements; the gold-pair problem only touches the second.

1. **Disentanglement quality** (per arm): message-ID hallucination rate (objective, scriptable -- did the arm emit IDs not in the chunk?) + a coherence spot-check on a sample of fenced threads. No gold pairs needed.
2. **Retrieval quality** (the headline): measured on the **2021 window, NOT 2026**, because fencing only improves retrieval where sessions are badly interleaved -- scoring on thin 2026 `#helpdesk` would undersell the LLM arm.
   - **Query set:** ~20-30 questions reverse-generated from real 2021 threads (an LLM writes the naive-user, symptom-phrased question each answers; vocabulary deliberately != the thread's, to test semantic not lexical retrieval) PLUS the 12 real 2026 `#helpdesk` questions from `apps/qw-oracle/docs/phase-8-eval-candidates.md` as a real-phrasing cross-check + human anchor. Reverse-generation is now a QUERY SOURCE only.
   - **Scoring: pairwise LLM-as-judge (REVISED 2026-06-05; replaces self-recall).** Per query, put two arms' top hits head-to-head and have an LLM pick the more relevant, with **position-swap** (verdict counts only if it survives flipping the order) and an explicit **length-penalty rubric** (so a long mushy unit does not win by bulk). Anchor the judge against the Phase 8 hand-labeled set. Why the change (research finding 6): synthetic-query self-recall ("did the source thread come back") CANNOT discriminate the arms -- all four index the same corpus content, so the source unit lands top-k for its own generated query regardless of fencing quality; it measures the fencer, not retrieval. Do NOT use ARES (needs ~150 labels + classifier fine-tuning -- not a cheap gate).
   - Read judge outputs as RELATIVE pairwise signal only, never absolute scores ("No Free Labels", arxiv 2503.05061). Open risk (research uncharted #4): whether the judge can split MODERATE from GOOD fencing on short chat units is itself unproven -- swap + length-penalty are the designed mitigations; operator spot-check backstops it.
3. **Cost** (per arm D): tokens + $ recorded. Test LLM arm ~= 2% of corpus ~= a few dollars; production ballpark ~$90 at current corpus size, likely lower under the fence-only reshape.

### Decision rule (confirmed 2026-06-05)

No precise numeric threshold -- ~20-30 gold pairs cannot resolve a 5-point difference honestly. Pre-register the patterns + a cost-default tiebreaker:

- **C tracks D closely** -> cheap signals win; skip the LLM (big recurring-cost win).
- **B tracks D closely** -> do not even re-segment; just embed sessions.
- **D clearly separates from both C and B** -> LLM fencing earns its cost. "How deep" is read off the disentanglement metrics (low hallucination at large chunks = LLM-cheap; needs small chunks + careful prompting = LLM-expensive).
- **Per-channel split** (C fine on `#helpdesk`, fails on `#quakeworld`) -> the likeliest outcome -> LLM only where it is messy, volume-weighted.
- **A (FTS) ties everything** -> embedding is not the bottleneck; park the whole lever.

Tiebreaker: a close call defaults to the cheaper arm -- the LLM must VISIBLY earn its recurring cost. Research-backed: the methods report's "uncharted" section explicitly anticipates the B-or-C-within-margin-of-D outcome that would kill the expensive Stage 2.

(Scoring technique -- pairwise LLM-as-judge -- is resolved above under Eval substrate.)

### Verified probes (2026-06-05, live `qw_oracle`)

- Category split (`message_labels.category`): `#helpdesk` chat 101,144 / link 2,575 / reaction 2,589 / system 40 / bot 4. `#quakeworld` chat 363,052 / link 11,071 / reaction 15,840 / bot 3,142 / system 65.
- Per-year density (messages): `#helpdesk` 2020 14,712 / 2021 28,642 / 2022 14,255 / 2023 18,929 / 2024 12,693 / 2025 11,626. `#quakeworld` 2016 16,114 / 2017 60,151 / 2018 65,096 / 2019 48,575 / 2020 55,689 / 2021 42,250 / 2022 19,257 / 2023 20,615 / 2024 28,508 / 2025 27,854.
- Live corpus totals at probe time: 728,863 messages / 86,423 sessions (grown from the 717,389 / 84,369 port baseline via bot-live ingest).

## Pass 3 outputs (settled 2026-06-06): Index mechanics

**Status:** COMPLETE (2026-06-06). All seven sub-questions locked. Scoped by the Pass 2 calibration verdict (arm D wins; Sonnet; embeddings load-bearing; fence both channels; 0% hallucination at cap 750). Builds on the verdict; does not relitigate it. Full results: `docs/superpowers/parking/2026-06-05-layer2-calibration-test-results.md`.

### The v1 pipeline (locked)

Four steps. Cross-session merge, per-thread summary, and per-thread labels are deliberately deferred or dropped (see Carry-forwards):

1. **Prune** -- drop `bot` / `reaction` / `system` via `message_labels.category`; keep `chat` + `link`. Conversational banter is NOT pre-stripped -- the fencer quarantines it into throwaway threads (reshape logic). (Locked Pass 2; reaffirmed.)
2. **Fence** -- Sonnet groups each lull-chunk's messages into topic-coherent threads (one-line `topic_label` + `member_indices`). The proven arm-D recipe (`scripts/calibration/wf-a-fence-queries.js`).
3. **Embed** -- each thread's **raw member messages** (`author: content`, concatenated) embedded with voyage-4-large. NOT a summary.
4. **Store + retrieve** -- `chat_threads` + `thread_messages`; hybrid retrieval (vector primary + FTS secondary via RRF), reranker deferred.

### Locked decisions

**3.1 -- Cross-session merge: DECOUPLED.** v1 ships within-chunk fenced threads, separate-and-tagged. A recurring topic returns as N hits, not one merged thread; the query-time consumer LLM reads them and judges (and per-conversation status is preserved instead of flattened). The 72% win was measured WITHOUT merge -- merge is an unproven optimization on top, with zero schema cost to defer. Becomes its own follow-on probe + later increment, built only if "N hits not 1" proves to bother anyone in practice.

**3.2 -- Production chunk size: sweep up before the big backfill.** Probe proved 0% hallucination + 4.38/5 coherence at cap 750. Bigger chunks = fewer fence agents = the budget/throttle lever. Sweep method: 1 fence agent each at 750 / 1500 / 3000 on a worst-case (busy, interleaved) `#quakeworld` chunk; gate = 0% hallucination AND coherence ~4+; take the largest passing size for the backfill. Per-chunk hallucination check at backfill is the backstop (an out-of-range index is mechanically detectable). Increment 1 is already fenced at 750, so the sweep blocks nothing.

**3.3 -- Channel + time scope: all 4 channels, full history.** helpdesk / quakeworld / dev-corner / antilag, no time cutoff. Fencing is a one-time cost; staleness is handled at query-time (era-relevance is consumer-LLM discretion, locked Pass 1). Scope becomes a backfill *ordering* (helpdesk + quakeworld first; antilag is tiny, a cheap tail), not a wall. **Correction:** the spine's "#antilag = competitive gameplay" (input doc `2026-05-03-layer2-thread-reconstruction.md`) is wrong -- #antilag is a community channel debating the antilag netcode feature (two active mvdsv/ktx antilag combos, different styles, with the attendant controversy); high-value cross-fork technical content, smallest channel.

**3.4 -- Rollout: increment-gated, batched, budget-paced.**
- **Increment 1 = the already-fenced Feb-Mar 2021 slice**, promoted from the probe's `scratch/` output. A thin loader (embeddings already cached) -> `chat_threads` -> wire `search_solved_issues` to threads. Proves the whole pipeline end-to-end for ~zero new cost, AND is the go/no-go gate: does thread-retrieval beat session-FTS on live queries? Underwhelms -> stop before the expensive backfill. Delivers -> greenlight the backfill.
- **Move 2 = batched incremental backfill.** Batch = channel x ~1-year, sized by the per-year density table to stay inside the probe's proven-safe agent zone (biggest batch -- quakeworld 2018 -- is ~80 agents at cap 750, ~20 at 3000; the probe safely ran 251). Proven recipe per batch: Sonnet, conc-5, paced waves, recovery-retry, honest fail-count. One or two batches per session -- never the whole corpus at once -- paced to the operator's Max-subscription quota. The chunk-size sweep (3.2) is the budget dial: whole backfill is ~650-750 agents at 750, ~150-200 at 3000 (less than one probe run). HARD REQUIREMENT for the planner: each batch must be **idempotent** -- re-running replaces its threads, never duplicates.

**3.5 -- Retrieval shape: hybrid, reranker deferred.** Vector primary (pure-FTS killed -- arm A whiffed `[NO HIT]` on 32/36 symptom queries). FTS retained as a cheap secondary via RRF for literal-name queries (a typed cvar appears verbatim in the thread text). Reranker deferred -- add only if hybrid shows precision problems in practice.

**3.6 -- Embed representation + deferred enrichment.**
- **Embed the raw member messages** (the proven arm-D representation), NOT a distilled summary. The spine's "embed the summary" was never validated; the 72% was earned on raw messages.
- **Summary: DROPPED.** It was a crutch for keyword search; embeddings read raw text directly, and the answering LLM reading the real conversation beats reading a lossy summary (same logic as the no-merge decision). Likely permanent.
- **Per-thread labels (`resolution_status` + `buckets`): DEFERRED** to a post-gate enrichment pass. They are operator-side metadata (authoring backlog, L3 cross-domain flagging), not retrieval signal. v1 ships retrieval; labels follow once search is proven.
- **Schema:** spine's `chat_threads` + `thread_messages` (many-to-many junction, `vector(1024)`, GIN tsvector, `ON DELETE CASCADE`) + add the missing `buckets_question` / `buckets_answer` (JSONB, queryable) + make `resolution_status` and the rich summary nullable (relax the spine's `NOT NULL`) so increment 1 ships before enrichment. Arc-planner writes the migration.

**3.7 -- Analyzer JSON: aligned to the proven shape.** The v1 fence emission is the proven `FENCE_SCHEMA`: `{abstained, threads:[{topic_label, member_indices}]}` (integer indices, not string message-IDs). `role_suggestions` is gone (it lived in the deferred Stage 4 emission, and was re-homed to query-time anyway). The abstain path is reason-free in v1 (abstain=true drops the chunk to a review pile); the spec's earlier "reword the abstain reason" note is moot -- there is no reason field in the proven shape. The Stage 2 / Stage 4 emission examples earlier in this doc (the `member_message_ids` / `topic_summary` / `role_suggestions` shapes) are SUPERSEDED by this for v1.

### Carry-forwards

- **Cross-session merge** -> its own follow-on probe (cluster existing fenced threads by embedding similarity + participant overlap; cosine ~0.85 / HDBSCAN / Louvain are the untested hypotheses) + a later increment. Track: **Pass 5** phase-decomposition as a deferred, gated phase. Built only if "N hits not 1" proves to matter.
- **Stage 4 enrichment (`resolution_status` + `buckets`)** -> a post-gate enrichment pass feeding the operator-side workflows + the L3 lockstep-flagging architecture. Track: **Pass 5** phase-decomposition.
- **Chunk-size sweep run** -> implementation task at backfill time; method locked above. Track: arc-planner / executor.
- **Batch idempotency keying** -> implementation. Track: arc-planner.
- **Summary** -> dropped; revisit only if a future human-browse UI needs scannable descriptions (unlikely; the consumer is an LLM). Track: resolved.

Pass 4 (query-time seam) and Pass 5 (cross-cutting + phase decomposition + planner handoff) remain. Pass 5 grew slightly: it now also decomposes the deferred merge increment and the Stage 4 enrichment pass into phases.

## Pass 2-5 scope (reshaped Pass 1.5; replaces the original Pass 2-4 placeholders)

The original Pass 2-4 placeholders assumed the primer pipeline. Reshaped:

### Pass 2: Calibration gate (sample-test)

Promoted to first. Decide how much LLM disentanglement the chunker actually needs *before* speccing the chunker. Settle: which corpus slice (3-6 months, which channels), which pipelines to compare (the four-way -- FTS baseline / per-session embed / cheap-signal segments / LLM-disentangled threads -- trimmed now the primer is gone), the "good-enough" bar, and the decision it unblocks (cheap-signal segmentation vs LLM disentanglement, and how deep). Folds in Stage 1 junk-pruning as a test prerequisite. Reuses the live Layer 2 store (`messages` / `sessions` / `session_references`) as the substrate.

### Pass 3: Index mechanics

**COMPLETE (2026-06-06) -- see the "Pass 3 outputs" section above for the locked decisions.** v1 = prune -> fence -> embed raw messages -> hybrid retrieve. Cross-session merge decoupled, per-thread summary dropped, `resolution_status` + `buckets` labels deferred to a post-gate enrichment pass; clustering algorithm / similarity-threshold questions move with the merge carry-forward to its own follow-on probe.

### Pass 4: Query-time seam (new)

Where the two decoupled arcs meet. The lazy-retrieval answer loop; which community MCP lookup tools to finish (the keystone Phase 6 of the community-reference arc); how Claude decides which tokens are worth resolving (and a lookup budget / latency cap); the `match_quality` guard that keeps lookups honest. Output includes the concrete "what to resurrect vs drop" call on the stalled community arc (finish Phase 6 MCP tools; Phase 4/5 incremental; drop Phase 7 primer).

### Pass 5: Cross-cutting + phase decomposition + planner handoff

Author-trust weighting placement (now a query-time / retrieval concern, not Stage 4 metadata), pipeline ordering, cost model refresh (lower now -- no Stage 0 primer, possibly less Stage 2 LLM), trigger discipline. Then phase decomposition + the arc-planner handoff prompt at `docs/superpowers/parking/2026-05-XX-layer2-corpus-reconstruction-planner-handoff.md`. Also: HANDOVER cleanup plan for the three superseded items. Plus phase-decompose the two Pass-3 deferrals -- the cross-session merge increment (+ its follow-on probe) and the Stage 4 enrichment pass (`resolution_status` + `buckets`).

Conditional carry-forwards (surface only if a stage needs them): multi-language handling, config-dump signal, re-run idempotency policy.

## Inputs (input artifacts, not to be modified)

- `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md` -- arc capture + Pass 1 status.
- `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md` -- 287-line architectural spine. ~80% of the pipeline is specified there.
- `docs/superpowers/parking/2026-05-03-layer3-multidomain-bucket-framework.md` -- defines the 9-bucket taxonomy Stage 4 consumes.
- `docs/superpowers/specs/2026-05-02-layer2-hygiene-design.md` -- research on hygiene leftovers #2 and #6 (superseded; analysis informs Stage 1 / Stage 2).

## Cross-references

- `docs/superpowers/parking/2026-04-30-qw-oracle-showcase-site-contributor-pipeline.md` -- "Lockstep flagging architecture" section. Stage 4 buckets feed L3 frontmatter feeds wiki.
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/decisions.md` D5 (Arc 3 deferrals), D7 (tsvector simple), D9-revised (IRC exclusion), D18 (Phase 3 hygiene amendments).
- `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/phase-3-layer2-port.md` -- current Layer 2 schema; this arc proposes additions.
- `apps/qw-oracle/CLAUDE.md`, `CLAUDE.md` (monorepo root) -- project context.
- `packages/qw-knowledge/terminology/` -- existing 353-line voice-transcript-derived glossary; Stage 0 primer seed.
- `apps/quad/` voice-transcript analyzer -- precedent pattern for Stage 0 iterative LLM-uncertainty-sampling.

---

End of Pass-1 design spec. Updates land at end of each subsequent pass close.
