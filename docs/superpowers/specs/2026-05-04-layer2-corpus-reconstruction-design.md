# Layer 2 corpus reconstruction -- arc-scope design

**Status:** in progress (Pass 1 complete 2026-05-04; Passes 2-4 pending).
**Author:** ParadokS + Claude (Opus 4.7).
**Arc parking doc:** `docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md`.
**Spec for:** arc-planner scaffolding once brainstorm exits at Pass 4 close.

---

## Scope

This arc reconstructs Layer 2 of the QW Oracle knowledge service from the bottom up. It replaces the timestamp-bucket session unit (15-minute gap heuristic) with topic-coherent threads as the primary retrieval unit for `search_solved_issues`. Sessions remain as raw timestamp grouping for adjacent-context display; threads layer on top via a many-to-many junction.

The arc folds three previously-parked items into one cohesive piece of work:

1. **Layer 2 thread reconstruction** (parked 2026-05-03 at `docs/superpowers/parking/2026-05-03-layer2-thread-reconstruction.md`) -- the architectural spine. ~80% of the pipeline is specified there.
2. **Author trust weighting in retrieval ranking** (HANDOVER future-arc) -- only carries signal once threads are the retrieval unit (frequency-weighted-by-thread-resolution-status).
3. **Layer 2 hygiene leftovers #2 + #6** (HANDOVER recently-opened) -- both superseded by Stage 2's quiet-hour chunking + Stage 3's cross-session merging + Stage 3's reply-graph signal.

## Pipeline shape (locked from 2026-05-03 thread-reconstruction parking doc)

Five stages, primer-grounded, junk-pruned, lull-chunked. Each stage produces a durable artifact the next consumes; each is independently inspectable.

- **Stage 0:** Iterative glossary primer bootstrap (LLM-uncertainty-sampling loop until convergence).
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
| Author role hints in primer | Iterative skill-baked role-list. Operator-verified seed per channel before any production run; analyzer suggests additions per-chunk when someone stands out. Couples to author-trust weighting (Pass 3). |
| Bucket rubric depth | Empirical discovery via 3-6 month sample run. The 9 buckets + multi-tag stand; new buckets or rubric rules added only when patterns make obvious gaps. |

### Analyzer output format

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
2. **Prep-work calibration ("bigger brain insurance").** Glossary + L1-lookup + role-list + per-channel character notes are cheap insurance worth investing in; do NOT gold-plate (no exhaustive role lists, no bucket rubrics ahead of evidence). Marginal benefit per primer item is uncertain, but the floor cost is low and the artifacts are durable.

## Pass 2-4 scope (placeholders, to fill in via fresh-terminal passes)

### Pass 2: Stage-by-stage refinement

Walk Stages 0 through 4 in order. Per stage, confirm shape, surface deltas vs the 2026-05-03 thread-reconstruction parking doc, and settle stage-tied open questions:

- **Stage 0:** primer artifact location (extend `packages/qw-knowledge/terminology` vs new file under qw-oracle); active L1 auto-lookup loop placement; convergence criterion (current draft: <5% unknown-rate).
- **Stage 1:** heuristic-pruning bootstrap scope (10% sample stratification, banter-signal feature list); recall-precision tradeoff calibration.
- **Stage 2:** chunk-size sweep parameters (current draft: 500/1500/3000/6000); quiet-hour gap definitions (multi-hour / overnight / weekend); within-chunk reply-edge integration mechanics.
- **Stage 3:** cosine-similarity threshold (current draft: 0.85); participant-overlap weight; reply-graph edge weight; clustering algorithm choice (HDBSCAN / Louvain / etc.).
- **Stage 4:** schema confirmation (`chat_threads` + `thread_messages` shape from 2026-05-03 doc); bucket-tagging integration (single Stage 4 prompt vs separate post-Stage-4 pass); how role-list iteration is wired into the prompt.

Conditional carry-forward: multi-language handling, config-dump signal, re-run idempotency policy -- surface only if a specific stage needs them.

### Pass 3: Cross-cutting decisions

- Author trust weighting placement (Stage 4 metadata vs retrieval-time re-rank vs both).
- Trigger discipline: skip the post-Phase-8-deploy + `query_log`-evidence gate given architectural conviction has hardened, or hold to evidence-based unblocking?
- Pipeline ordering (serialize all five stages, or run Stage 0 + Stage 1 in parallel since they produce independent artifacts).
- Cost model refresh ($130-140 estimate from 2026-05-03 doc; verify against current Voyage + Sonnet pricing and corpus growth).
- Sample-test scope (four-pipeline comparison with L3 first-class status changing the comparison set).

### Pass 4: Phase decomposition + arc-planner handoff

- Phase shape (Stage 0 alone? Stage 2+3 bundled? sample test as Phase 0 prerequisite? schema migration phase?).
- Spec-to-scaffold handoff: this design spec frozen, what arc-planner needs to scaffold against.
- HANDOVER cleanup plan for three superseded items.
- Arc-planner handoff prompt at `docs/superpowers/parking/2026-05-XX-layer2-corpus-reconstruction-planner-handoff.md`.

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
