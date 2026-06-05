# Layer 2 corpus reconstruction -- arc-scope design

**Status:** in progress. Pass 1 complete 2026-05-04; **Pass 1.5 reshape ratification complete 2026-06-05** (architecture reshaped -- primer prerequisite dropped, lazy/query-time retrieval adopted; see the Reshape section); Passes 2-5 pending.
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

## Pass 2-5 scope (reshaped Pass 1.5; replaces the original Pass 2-4 placeholders)

The original Pass 2-4 placeholders assumed the primer pipeline. Reshaped:

### Pass 2: Calibration gate (sample-test)

Promoted to first. Decide how much LLM disentanglement the chunker actually needs *before* speccing the chunker. Settle: which corpus slice (3-6 months, which channels), which pipelines to compare (the four-way -- FTS baseline / per-session embed / cheap-signal segments / LLM-disentangled threads -- trimmed now the primer is gone), the "good-enough" bar, and the decision it unblocks (cheap-signal segmentation vs LLM disentanglement, and how deep). Folds in Stage 1 junk-pruning as a test prerequisite. Reuses the live Layer 2 store (`messages` / `sessions` / `session_references`) as the substrate.

### Pass 3: Index mechanics

The "build the index" pass, scoped by Pass 2's calibration result. Chunk boundaries / quiet-hour chunking, cross-session merging (cosine + participant-overlap + reply-graph), embed granularity, `chat_threads` + `thread_messages` schema (from the 2026-05-03 spine: vector(1024), CHECK enum on `resolution_status`, GIN tsvector, junction PK), `resolution_status` + `buckets` metadata, similarity threshold (draft 0.85) + clustering algorithm (HDBSCAN / Louvain). Reshape-adjusts the analyzer JSON shapes (`role_suggestions` out, abstain reworded).

### Pass 4: Query-time seam (new)

Where the two decoupled arcs meet. The lazy-retrieval answer loop; which community MCP lookup tools to finish (the keystone Phase 6 of the community-reference arc); how Claude decides which tokens are worth resolving (and a lookup budget / latency cap); the `match_quality` guard that keeps lookups honest. Output includes the concrete "what to resurrect vs drop" call on the stalled community arc (finish Phase 6 MCP tools; Phase 4/5 incremental; drop Phase 7 primer).

### Pass 5: Cross-cutting + phase decomposition + planner handoff

Author-trust weighting placement (now a query-time / retrieval concern, not Stage 4 metadata), pipeline ordering, cost model refresh (lower now -- no Stage 0 primer, possibly less Stage 2 LLM), trigger discipline. Then phase decomposition + the arc-planner handoff prompt at `docs/superpowers/parking/2026-05-XX-layer2-corpus-reconstruction-planner-handoff.md`. Also: HANDOVER cleanup plan for the three superseded items.

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
