# Chat-corpus retrieval-unit construction: method shortlist for the calibration test

Date: 2026-06-05
Author: Claude (Opus 4.8), synthesis lead
Scope: decide which of six researched methods become additional arms in the Layer 2
calibration test, which fold into how the LLM-fencing arm is built, and which to skip.
Ground truth read: `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md`,
`docs/superpowers/parking/2026-06-05-layer2-corpus-reconstruction-pass2-handoff.md`,
`docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md` (Pass 1.5 reshape),
`apps/qw-oracle/shared/embedding.ts`, `apps/qw-oracle/CLAUDE.md`.

---

## Executive summary

None of the six researched methods earns a new calibration arm. The four arms as
designed already span the real decision space for our specific problem -- how much LLM
work topic-segmentation of flat, interleaved, multi-topic Discord chat actually needs:

- A. FTS keyword baseline
- B. embed the existing 15-minute sessions as-is
- C. cheap mechanical-signal segments (time gaps + reply edges + participant overlap, no LLM)
- D. LLM-fenced topic threads

Every researched method fails one of two ways for our case:

1. Wrong pipeline layer. It enriches or re-embeds retrieval units that must ALREADY
   exist (Contextual Retrieval, late chunking, proposition/parent-doc/sentence-window).
   That is the exact thing the test is deciding how to construct. Including it as an arm
   confounds "how do we segment?" with "how do we enrich?" -- two separate decisions.
2. It collapses into an existing arm rather than standing beside it. LLM disentanglement
   IS arm D. The cheap classical tool buried in that same finding (CODI) belongs inside
   arm C.

The strongest evidence in the whole set is negative and points straight at our data shape:
semantic similarity-trough chunking and the document-chunking family are repeatedly shown
to fail on short-message conversational data. The one method that directly models our task
(LLM disentanglement) has no published quality number on flat unthreaded multi-topic chat
at scale -- which is precisely why the empirical test exists.

Recommendation:

- Add NO arm E.
- Fold finding 5 (LLM disentanglement) into HOW arm D is built, and lift its one free
  asset (CODI -- the only open tool benchmarked on Discord/IRC) into arm C as a zero-cost
  reference baseline.
- Fold finding 6 (eval without gold labels) into the SHARED test harness: pairwise
  LLM-as-judge with position-swap and a length-penalty rubric; explicitly NOT synthetic-
  query self-recall, explicitly NOT ARES.
- Skip the four chunking/enrichment methods as arms. Retain Anthropic Contextual Retrieval
  and voyage-context-3/4 as named post-segmentation revisit paths once an arm wins.

One method newer than early 2025 to know about: voyage-context-3 (2025) / voyage-context-4
(preview, 2026). It is REST-accessible and real, but it is a different model outside the
locked voyage-4-large/lite pair and it consumes a segmentation rather than producing one.
Revisit-after-the-test, not an arm. (See finding 2 and the newer-developments note.)

---

## Per-method assessment

### Finding 1 -- Anthropic Contextual Retrieval (September 2024)

What it is. A post-segmentation enrichment for RAG: before embedding each chunk, an LLM
writes a 50-100 token situating blurb that explains the chunk's role in its source
document; the blurb is prepended, and the enriched text feeds both a dense embedding and a
BM25 index. Optional reranker on top.

Evidence. All quality numbers are single-vendor (one Anthropic blog,
https://www.anthropic.com/news/contextual-retrieval) on clean structured documents (code,
fiction, arXiv, science): contextual embeddings alone cut retrieval-failure 35% (5.7% to
3.7%); plus contextual BM25, 49% (to 2.9%); plus a reranker, 67% (to 1.9%). No independent
replication exists. The post makes no conversational claim.

Cost. ~$1.02 per million source-document tokens with prompt caching; per-query reranking
~$0.002. Cheap, but untested on chat.

Fit to our case. Structurally wrong layer. The mechanism REQUIRES a coherent "overall
document" to hold in context alongside each chunk so the LLM can situate it. Flat
interleaved chat has no such document -- constructing one is what our test is about. The
Voyage truncation hazard sometimes attached to this method is a voyage-2 (4K window)
artifact and does not apply: voyage-4-large and voyage-4-lite both have 32K windows, so a
50-100 token prefix is harmless.

Verdict. SKIP as an arm. Retain as a named enrichment to revisit AFTER an arm wins:
applying contextual enrichment to already-fenced threads (the thread is the document) is
valid and cheap, but it is an optimization on the winner, not a contestant.

### Finding 2 -- Late Chunking (Jina AI, 2024) and its hosted cousin voyage-context-3/4

What it is. Pass the whole document through the encoder once, keep per-token hidden states,
then mean-pool over chunk spans so each chunk vector carries document-wide attention. No
retraining; one vector per chunk.

Evidence. BEIR nDCG@10 on Jina's own models: small gains that scale with document length
(NFCorpus +6.5pp; SciFact +1.9pp) and ZERO gain on Quora (avg 62 chars/document). Single
vendor, no independent replication, clean-document corpora only.

Cost. One forward pass over the full document; cheaper than per-chunk enrichment. But it
needs token-level vector access.

Fit to our case. Hard-blocked under the locked model, verified in our own code:
`apps/qw-oracle/shared/embedding.ts` lines 66-79 show the Voyage REST API returns exactly
one pooled `embedding: number[]` per input string. Late chunking needs the full per-token
hidden-state sequence to pool over arbitrary spans -- not exposed. Three more blockers:
(a) architecture mismatch (late chunking assumes encoder-only mean-pooling; voyage-4 is
MoE); (b) the benefit is document-length-proportional and our fenced threads are short, so
no lift (Jina's own Quora zero-gain is the proof); (c) wrong layer -- it consumes
boundaries, does not find them.

Newer-method flag. voyage-context-3 (2025) / voyage-context-4 (preview, 2026) reach the
same goal via training-time objectives and ARE REST-accessible. Verified live against
https://docs.voyageai.com/docs/contextualized-chunk-embeddings: a separate
`POST /v1/contextualizedembeddings` endpoint, no local model or token-level access, takes
pre-chunked documents (total <= 120K tokens, <= 16K chunks per request, 32K per-chunk
window), returns one context-aware vector per chunk, with lower chunk-size sensitivity
(2.06% vs 4.34%). BUT it is a different model outside the locked voyage-4-large/lite pair,
would re-architect the embedding pipeline, still lacks a verified conversational number,
and still needs boundaries solved upstream.

Verdict. SKIP as an arm (standard late chunking is impossible under the locked API).
voyage-context-3/4 is the one legitimate revisit-if-the-constraint-relaxes path, not an arm.

### Finding 3 -- Semantic chunking (embedding-similarity-trough splitting)

What it is. Embed each sentence (plus a buffer of neighbors), compute adjacent cosine
distance, cut where distance spikes above a percentile threshold. Ships in LlamaIndex and
LangChain.

Evidence. The strongest negative result in the whole set. NAACL 2025 (arxiv 2410.13070),
the most rigorous controlled study, found fixed-size chunking matched or beat semantic
chunking and concluded "computational costs are not justified by consistent performance
gains"; semantic chunking only won on synthetically stitched high-diversity inputs. The one
conversational datapoint (QuAC, ICNLSP 2025) was the WORST performer under semantic
chunking, explicitly attributed to conversational nature. Caveat: a few specific numbers
(the ~14x throughput penalty, the exact QuAC scores) could not be re-verified from primary
source, but the direction is robust.

Cost. Embeds every message at index time (~14x slower than token splitting per the Chonkie
benchmark) and needs per-corpus threshold tuning with no Discord prior.

Fit to our case. The core assumption -- within-topic embedding variance < between-topic
variance -- holds for paragraph prose and breaks for 20-50-token Discord messages, where
lexical noise dominates and the trough signal disappears. This is a worse version of arm C
for exactly our data.

Verdict. SKIP entirely. Arm C (time-window + reply + participant heuristics) is the correct
cheap baseline; the NAACL result is direct evidence that the simple baseline is the right
cheap arm.

### Finding 4 -- RAG chunking family: proposition/dense-X, parent-document/hierarchical, sentence-window

What it is. Three "advanced" document-chunking strategies. Proposition/dense-X decomposes
prose into atomic coreference-resolved factoids. Parent-document indexes small child chunks
but returns the larger parent at generation. Sentence-window indexes each sentence and
expands it to N neighbors at retrieval.

Evidence. Strong on clean prose (Dense-X +12.6 Recall@20 over passages on Wikipedia; ARAGOG
sentence-window top-ranked for precision on arXiv papers; HiChunk on Qasper). Every primary
benchmark is monologue prose. The finding itself concedes "thin to non-existent direct
evidence" for chat and cites arxiv 2310.17120 as proof that conversational topic
segmentation is a DISTINCT problem these methods do not transfer to.

Cost. Proposition is 10-50x fixed-chunk indexing cost (per-document LLM call; full
Wikipedia took ~500 GPU-hours). Parent-doc is near-free at index time. Sentence-window is
3-5x.

Fit to our case. All three need topic-coherent input to produce their lift -- the very
thing the test is deciding whether we can cheaply produce. Parent-document and sentence-
window are structurally unrecoverable: both expand a unit by its ADJACENT messages, but in
interleaved chat the neighbors belong to different concurrent threads, so expansion injects
noise. Proposition needs grammatically complete sentences; "yeah that fixed it lol" has no
self-contained meaning out of thread.

Verdict. SKIP all three as arms. Conditional retain: proposition chunking as a within-
thread sub-chunker ONLY if Stage-3 cross-session merging yields threads long enough to
degrade near Voyage's 32K ceiling -- a downstream optimization, not an arm.

### Finding 5 -- LLM conversation disentanglement / topic segmentation (this IS arm D)

What it is. Prompt an LLM over a windowed message stream; get structured topic-boundary or
thread output. SeCom (ICLR 2025), DASH-DTS (Dec 2025), Membox (Jan 2026) are LLM variants;
CODI (ICPC 2023) is a classical Max-Entropy reply-to classifier.

Evidence (honest, mostly cautionary). Headline numbers are all single-thread-sequential or
non-interleaved corpora: SeCom Pk=0.093/F1=0.888 on DialSeg711; DASH-DTS Pk=21.9 on
maritime VHF radio. SeCom's own scope statement EXCLUDES many-to-many interleaving. There
is NO published 2024-2025 quality number for LLM segmentation of flat unthreaded Discord
chat at scale. The largest annotated benchmark (Kummerfeld 2019) is 77,563 messages, one
channel one era, topping out at 38% conversation-level F1 classically (51.9% for the 2023
RL SOTA, Bhukar et al). CODI is the ONLY open tool explicitly benchmarked on
IRC/Slack/Discord -- and it publishes no F-score in the paper.

Cost. The finding's ~$168 / ~28,000-call estimate assumes sliding-window-with-50%-overlap.
Our architecture uses lull-chunked windows (500-3000 messages between quiet-hour cuts),
which collapses this to ~200-500 LLM calls -- two orders of magnitude cheaper. Do NOT
inherit the finding's cost figure; it priced a worse architecture.

Fit to our case. This finding does not add an arm; it characterizes arm D. Its real value
is two pointers: (1) our quiet-hour chunking already mitigates the message-ID-hallucination
/ lost-in-the-middle risk it raises (cross-ref Needle Threading, arxiv 2411.05000; Context
Rot, Chroma); (2) CODI is a free, MIT-licensed, Discord-benchmarked classical baseline that
belongs in arm C.

Verdict. KEEP as arm D (it is arm D). FOLD CODI into arm C as a zero-cost reference. FOLD
the "When F1 Fails" pointer (arxiv 2512.17083: W-F1 + BOR + purity/coverage beat single-
number F1) into the harness as a better-than-F1 diagnostic if we score boundary quality
directly.

### Finding 6 -- Retrieval eval without gold labels + Voyage v4 chunking guidance (this is the harness)

What it is. Part A: evaluate retrieval without hand labels via synthetic-query self-recall,
LLM-as-judge (pointwise or pairwise), or ARES (classifier + prediction-powered inference).
Part B: Voyage v4 chunk-size guidance.

Evidence. TREC 2024 RAG Track: GPT-4 judge matches human 56% outright, 72% post-edit --
sufficient for a comparative signal between two strategies. ARES: Kendall tau 0.91-0.97
in-domain but needs ~150 labels AND classifier fine-tuning. "No Free Labels" (arxiv
2503.05061): 35% of MT-Bench references were wrong yet aggregate agreement looked high ->
read judge numbers as RELATIVE only, never absolute. RAGAS: context-relevance (the
retrieval-specific dimension) is the weakest at 0.56 human agreement.

Cost. Synthetic-query generation at 50K-thread scale ~$500 (the finding's own estimate) --
for a signal that cannot discriminate our arms. Pairwise judging adds a call per
query-arm pair.

Fit to our case. This is the measurement design for the WHOLE test, not a fifth arm.
Settled by evidence:
- USE pairwise LLM-as-judge between arms on a shared query set, with A/B position-swap
  (count a verdict only if both orderings agree) and a rubric that PENALIZES length.
- DO NOT use synthetic-query self-recall as the primary metric: all four arms see the same
  corpus content, so the source unit lands in top-K for its own generated query regardless
  of fencing quality. It measures the fencer, not retrieval -- it cannot tell the arms
  apart.
- DO NOT use ARES: ~150 labels plus classifier fine-tuning is infrastructure we lack and is
  definitionally not a cheap gate.
- Two biases must be mitigated because our units are short conversational spans (a regime
  with NO published bias-calibration): verbosity bias (longer fenced threads score higher
  regardless of coherence) and positional bias. Swap + length-penalty rubric are the
  mitigations.
- Part B chunk-size guidance (256-512 tokens, 10-20% overlap) does NOT apply: our units are
  whole conversation threads, not token-bounded slices of one document. The relevant
  Voyage fact is the 32K ceiling (all plausible threads fit) and the confirmed shared
  embedding space (index with voyage-4-large, query with voyage-4-lite, no re-index) --
  already locked in `apps/qw-oracle/CLAUDE.md` and `shared/embedding.ts`.

Verdict. FOLD into the shared test harness. Anchor the pairwise judge against our existing
Phase 8 hand-labeled eval set as the small human ground-truth check.

---

## Ranked candidate-arms shortlist

| Rank | Candidate | Disposition |
|---|---|---|
| 1 | D. LLM-fenced topic threads (finding 5) | KEEP -- it is the arm the whole test is built to evaluate. Fold in the cost correction (lull-chunked ~200-500 calls, not ~28K) and the hallucination mitigation. |
| 2 | C. Cheap mechanical-signal segments (+ CODI from finding 5) | KEEP -- add CODI (MIT, Discord-benchmarked, classical, zero-cost) as a reference baseline inside this arm. The one place a researched method improves an existing arm. |
| 3 | Shared eval harness (finding 6) | FOLD into the harness, not an arm. Pairwise LLM-as-judge + position-swap + length-penalty rubric; NOT synthetic-query self-recall; NOT ARES. Anchor to the Phase 8 hand-labeled set. |
| 4 | B. Embed existing 15-minute sessions / A. FTS baseline | KEEP as-is -- the two cheap controls; no researched method displaces or improves them. |
| -- | Anthropic Contextual Retrieval (finding 1) | SKIP as arm; revisit as per-thread enrichment after an arm wins. |
| -- | voyage-context-3/4 (finding 2 newer-dev) | SKIP as arm; revisit-if-locked-model-relaxes. Newer than early 2025. |
| -- | Late chunking (finding 2) | SKIP -- hard-blocked: Voyage REST API exposes no token-level vectors (verified in embedding.ts). |
| -- | Semantic similarity-trough chunking (finding 3) | SKIP -- evidence shows it fails on short conversational data; arm C is the better cheap baseline. |
| -- | Proposition / parent-doc / sentence-window (finding 4) | SKIP all three as arms; proposition is a conditional within-thread sub-chunker only. |

Net: zero new arms. Two folds (D-build, harness). One lift (CODI into C). Two named
revisit-later paths (Contextual Retrieval, voyage-context-3/4).

---

## Uncharted -- only the test answers

The test exists because the literature stops at the edge of our problem. Five things no
method settles:

1. The central question: does LLM fencing (arm D) actually beat cheap mechanical signals
   (arm C) -- or even the dumb 15-min sessions (arm B) -- on retrieval quality for OUR
   corpus? Every cited LLM-disentanglement number is on single-thread or non-interleaved
   data. No published number exists for flat unthreaded multi-topic Discord at scale. The
   test replaces this guess with a measurement, and the live design already anticipates the
   outcome where B or C come within margin of D and kill the expensive Stage 2.

2. Where the coherence cliff is for short-message data. The Pass 1.5 reshape asserts
   retrieval quality is driven by boundary coherence (sharp coordinate for a one-topic
   chunk, mush for a 10-topic blob). Reasonable, but unmeasured on Discord. The test must
   locate the point at which a multi-topic span degrades the embedding enough to lose
   retrieval -- possibly more forgiving than assumed (arms B/C suffice), possibly less (only
   D works).

3. Quiet-hour chunk size: the largest lull-chunk (sweep 500/1500/3000 messages) at which
   message-ID hallucination stays near zero AND coherence holds. The lost-in-the-middle
   evidence says effective context is shorter than nominal, but the breakpoint for this
   corpus's message density and our prompt is empirical. Calibrates inside arms C/D.

4. Whether the judge can see the gradient that matters. Pairwise LLM-as-judge reliably
   catches gross failures (incoherent vs coherent). It is unproven whether it can split
   MODERATE-quality from GOOD-quality fencing on short conversational units -- the regime
   with zero published bias-calibration. Swap + length-penalty are designed in; their
   sufficiency on short chat is itself uncharted.

5. Cross-session merging (Stage 3) has no precedent at all. Multi-year recurring-topic
   linkage and many-to-many message-thread membership are absent from the entire academic
   literature (all benchmarks single-day, one-to-one). Recasting Stage 3 as embedding-
   similarity clustering side-steps the missing precedent, but the threshold (~cosine 0.85)
   and participant-overlap rule are untested. The four-arm test only partially probes this
   (arm D full-hybrid includes it); merge quality may need its own follow-on probe.

---

## Sources

Anthropic Contextual Retrieval
- https://www.anthropic.com/news/contextual-retrieval
- https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide

Late chunking and contextualized chunk embeddings
- https://arxiv.org/abs/2409.04701 (Jina late chunking)
- https://github.com/jina-ai/late-chunking
- https://docs.voyageai.com/docs/contextualized-chunk-embeddings (voyage-context-3/4; REST access verified)
- https://blog.voyageai.com/2026/01/15/voyage-4/ (voyage-4 family, MoE, shared space)

Semantic chunking
- https://arxiv.org/abs/2410.13070 (Is Semantic Chunking Worth the Computational Cost? NAACL 2025)
- https://aclanthology.org/2025.icnlsp-1.15.pdf (Recursive Semantic Chunking; QuAC result)
- https://www.firecrawl.dev/blog/best-chunking-strategies-rag (Chonkie throughput, unverified multiplier)

RAG chunking family
- https://aclanthology.org/2024.emnlp-main.845.pdf (Dense-X / proposition)
- https://arxiv.org/abs/2404.01037 (ARAGOG; sentence-window)
- https://arxiv.org/abs/2509.11552 (HiChunk hierarchical)
- https://arxiv.org/abs/2310.17120 (conversational topic segmentation is a distinct problem)

LLM conversation disentanglement / topic segmentation
- https://arxiv.org/abs/2502.05589 (SeCom, ICLR 2025)
- https://arxiv.org/abs/2512.15042 (DASH-DTS, Dec 2025)
- https://arxiv.org/abs/2601.03785 (Membox, Jan 2026)
- https://arxiv.org/abs/2512.17083 (When F1 Fails; W-F1 + BOR + purity/coverage)
- https://github.com/USIREVEAL/CODI (CODI, ICPC 2023, MIT; only Discord/IRC-benchmarked open tool)
- https://arxiv.org/abs/1810.11118 (Kummerfeld 2019 corpus)
- https://arxiv.org/abs/2411.05000 (Needle Threading)
- https://arxiv.org/abs/2211.14954 (Topic Segmentation in the Wild)

Retrieval eval without gold labels + Voyage v4
- https://arxiv.org/html/2311.09476v2 (ARES)
- https://arxiv.org/html/2503.05061v1 (No Free Labels)
- https://arxiv.org/pdf/2504.15205 (TREC 2024 RAG Track; 56%/72% agreement)
- https://docs.voyageai.com/docs/embeddings (voyage-4-large/lite specs)
- https://docs.voyageai.com/docs/faq (input_type guidance)

Internal ground truth
- docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md (the 287-line spine; four-arm sample-test design, $130-140 cost model)
- docs/superpowers/parking/2026-06-05-layer2-corpus-reconstruction-pass2-handoff.md (Pass 2 calibration-gate handoff; live corpus 728,863 messages / 4 channels)
- docs/superpowers/specs/2026-05-04-layer2-corpus-reconstruction-design.md (Pass 1.5 reshape: knowledge-free embedding, primer deleted, fencer needs no domain knowledge)
- apps/qw-oracle/shared/embedding.ts (Voyage client; lines 66-79 confirm one pooled vector per input, no token-level access)
- apps/qw-oracle/CLAUDE.md (locked tech stack: voyage-4-large build / voyage-4-lite query; shared embedding space)
