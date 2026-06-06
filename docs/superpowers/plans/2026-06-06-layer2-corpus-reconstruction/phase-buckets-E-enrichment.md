# Phase buckets-E -- FAQ-substrate enrichment

> **Executor checklist:** read `decisions.md` (D8 decoupled+re-runnable, D9 Workflow recipe, D12 JSONB-as-JS-value), `review-findings.md` (owns R7, R8).
>
> **PRECONDITION: Phase C backfill complete (the corpus is fenced).** This is a post-backfill pass; it does not touch fencing.

## Goal

Label each thread with `buckets_question` / `buckets_answer` (the 9-bucket taxonomy) so the tagged corpus becomes the FAQ-discovery substrate -- the recurring-problem signal that drives L3 concept-note authoring priority. This is a separate, re-runnable Workflow pass over the fixed `chat_threads`, decoupled from the expensive fence pass (D8), so taxonomy iteration never forces a re-fence. **Runnable state:** every thread carries bucket tags; the FAQ-discovery query (cross-domain + recurrence) returns an authoring-priority list. Retrieval is unaffected (buckets are operator-side metadata, not a retrieval signal).

## Inputs from previous phase

- **PRECONDITION:** Phase C complete -- `chat_threads` holds the full-corpus threads. (The schema columns `buckets_question` / `buckets_answer` already exist nullable from Phase A's migration, D4.)

## Files touched

### Created
```
apps/qw-oracle/scripts/load-chat/label-buckets.ts     # read threads -> (Workflow label) -> UPDATE bucket columns (idempotent)
apps/qw-oracle/scripts/load-chat/faq-discovery.ts      # the payoff query: cross-domain + recurrence -> L3 authoring-priority list
```

### Modified
```
n/a -- the columns exist from Phase A's migration.
```

### Deleted
```
n/a
```

## Tasks

### Task 1 -- Bucket-labeling Workflow

- **Goal:** For each thread, assign question-buckets and answer-buckets from the 9-bucket taxonomy.
- **Files:** `label-buckets.ts` + a labeling Workflow.
- **Steps:**
  - [ ] Taxonomy (the 9 buckets, multi-tag): `engine-config` / `engine-content` / `visual-customization` / `system` / `hardware` / `peripherals` / `network` / `server-side` / `community` (spine + `2026-05-03-layer3-multidomain-bucket-framework.md`).
  - [ ] `label-buckets.ts` reads `chat_threads` (id + `content` or `topic_label` + member messages), batches the threads, writes per-thread input files (the agents read files; the script has no FS access of its own -- the `wf-a-fence-queries.js` pattern).
  - [ ] Labeling Workflow: each agent reads one thread and returns `{buckets_question: [...], buckets_answer: [...]}` (which buckets the QUESTION drew on vs which the ANSWER drew on). Sonnet, conc-5, paced, recovery+retry, honest counts; normalize `args` as a JSON string (R7 / D9). Tag with `model=sonnet`, `prompt=vN`.
- **Verification:** all agents return (honest count); a sample of labels is sane (a config-debugging thread tags `engine-config`). PASS: labels returned. FAIL: rate-limit wipeout (R7).
- **Execution mode:** prep/orchestration `subagent (Sonnet medium)`; labeling `workflow (Sonnet, conc-5, paced)`.

### Task 2 -- Write labels (idempotent UPDATE)

- **Goal:** Persist the labels to `buckets_question` / `buckets_answer`.
- **Files:** `label-buckets.ts`.
- **Steps:**
  - [ ] UPDATE `chat_threads` SET the two JSONB columns from the labeling output, BY thread id. JSONB receives JS arrays, NOT pre-stringified JSON (D12 / the `F1.jsonb_columns_not_strings` lesson) -- pass the array or wrap with `tx.json(...)`.
  - [ ] Re-runnable: a re-run overwrites the columns (no key churn; the threads are fixed). Use `DISTINCT` on any thread-message join (R8).
- **Verification:**
  ```sql
  SELECT count(*) FROM chat_threads WHERE buckets_question IS NOT NULL;   -- ~ all threads
  SELECT jsonb_typeof(buckets_question) FROM chat_threads WHERE buckets_question IS NOT NULL LIMIT 1;  -- 'array', NOT 'string'
  ```
  PASS: buckets populated as JSONB arrays (not string scalars). FAIL: `jsonb_typeof` returns `'string'` (the pre-stringify bug -- D12).
- **Execution mode:** `subagent (Sonnet medium)`.

### Task 3 -- FAQ-discovery query (the payoff)

- **Goal:** Turn the tagged corpus into an L3 authoring-priority list.
- **Files:** `faq-discovery.ts`.
- **Steps:**
  - [ ] Cross-domain signal: threads where `buckets_question != buckets_answer` (or the answer spans multiple buckets) are L3 concept-note candidates by construction (the lockstep-flagging architecture).
  - [ ] Recurrence signal: group/cluster threads by topic to count how often a problem recurs (frequency IS the FAQ signal -- the no-merge justification, D1). A simple version: aggregate by bucket-pair + a topic_label similarity; a richer version defers to the clustering-for-analysis stub.
  - [ ] Output a ranked list: which recurring problems are most common and least reliably solved (`resolution_status` from Phase C feeds this) -> the operator's concept-note authoring queue.
- **Verification:** the query returns a ranked, readable authoring-priority list over the real corpus. PASS: list is non-empty and plausible. FAIL: empty or obviously wrong grouping.
- **Execution mode:** `subagent (Sonnet medium)` -- a SQL/aggregation script; the ranking heuristic is simple.

## Verification (phase boundary)

1. ~all threads carry `buckets_question` / `buckets_answer` as JSONB arrays (not string scalars -- D12).
2. The pass is re-runnable (re-run overwrites, no row churn).
3. The FAQ-discovery query returns an authoring-priority list (the primary payoff).
PASS: corpus tagged + FAQ list produced. FAIL: untagged threads, string-scalar JSONB, or no FAQ output.

## Outputs to next phase

- Tagged corpus + FAQ-discovery list -> feeds L3 concept-note authoring (out of this arc's scope; the bridge to L3). Phase D (threshold recalibration) is independent and can run before or after buckets-E.

## Open questions / deferred items

- **Question:** How rich should recurrence-counting be (simple bucket-pair aggregation vs real clustering)? **Default:** ship the simple aggregation; if FAQ-counting wants automation, that triggers the clustering-for-analysis stub (D13). **Who:** operator, once they see the simple list.
- **Question:** Does the taxonomy need new buckets after seeing real labels? **Default:** keep the 9; add a bucket only when labels show an obvious gap (empirical-discovery meta-pattern). Because buckets-E is decoupled + re-runnable (D8), a taxonomy change is a cheap re-label, not a re-fence. **Who:** operator.

## Recovery (if verification fails)

- **Rate-limit wipeout:** lower conc / lengthen pacing; re-run (idempotent UPDATE -- R7 / D8).
- **JSONB stored as string scalar:** the loader pre-stringified -- pass JS arrays or `tx.json(...)` (D12); re-run the UPDATE.
- **FAQ list looks wrong:** the grouping heuristic is too coarse -- refine it, or escalate to the clustering-for-analysis stub; the labels themselves are fine (re-runnable, no re-fence needed).
