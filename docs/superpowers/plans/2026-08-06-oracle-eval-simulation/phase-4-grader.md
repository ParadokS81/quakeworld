# Phase 4 -- the grader

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` -- this phase
implements E8 (blind, toolless grader) and consumes E2 as amended twice on
2026-08-06 (F44, F49: the mutable set is the four keys
`{grade, stage, divergent, grade_usage}`, and F50's spread rule), plus E1, E3,
E5, E6, E7, E9, E10, E12, E13, E14, E15 unchanged. **Spec:**
`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md` D6 (the
whole of it) -- **and this phase requests one D6 wording amendment, see
"Decoupling `divergent` from the arithmetic"**. **Findings consumed:** F2, F9,
F10, F16, F23, F25, F30, F41, F44, F49, F50, F51-F69. **Findings raised here:**
F44-F48 (first draft), F70-F73 (this revision). **Lane:** worktree
`/home/dev/projects/quakeworld-eval`, branch `eval-oracle-sim`.

**Revision 2026-08-06 against the independent checker (F51-F69).** Five things
changed shape rather than wording: the `divergent` flag was **redesigned**, not
retuned (F51, F52, F70); the fixture is now **60 threads x 1 cell** instead of
20 x 3, because the old shape was 20 clusters and every binomial in the draft
treated it as 60 draws (F58); the operating characteristic is **recomputed
exactly**, with G4 folded in and the correlated gates jointly (F53, F63); Task 1
is **deleted** because Phase 1's F44 revision landed while this was being
drafted (F54); and two artifacts the draft assumed exist are now **built**
(F55, F56).

## Goal

Build the grading machinery D6 stage 3 describes -- a byte-pinned verdict rubric
implementing `match | partial | miss`, a compare-grader that sees
`{question, answer, truth}` and nothing else (E8), and a separate divergence
screener that routes era-stale cases to human review -- and then measure whether
it works before Phase 5's pilot depends on it. Nothing else: this phase answers
no headline question, samples nothing, and is not the pilot. The measurement is
an agreement gate against a Claude hand-graded fixture of **60 independent
threads** (10 per era from Phase 3's effective sample, one cell each, 20 per
cell, answered by Phase 2's shipped `runAnsweringPass`), whose operating
characteristic is computed exactly rather than asserted. The phase ends with
`eval/sim/run-grading.ts` able to grade a run file in place -- appending a
`stage: 'graded'` line produced by SPREADING the answered record and changing
only the four mutable keys (E2 as amended, F50) -- with
`eval/sim/grader-fixture.json` committed carrying the confusion matrix, the five
sub-gate outcomes, the grader's measured self-consistency, the screener's
measured rate and stability, and the dollar total; and with a zero telemetry
delta across the grading step proving the grader touched no database.

## Inputs from previous phases

Verifiable claims, each traced to the landed doc that promises it. Task 0
re-probes every one, because a landed doc is a promise and not an observation --
and F54 is what that discipline is for: Phase 1's contract moved under this doc
mid-draft.

**From Phase 1** (`phase-1-eval-surface-contract.md`, LANDED with the F44 + F49
revisions):

- `RunRecord` in `apps/qw-oracle/eval/sim/run-record.ts`, with `grade: Grade |
  null`, `stage`, `divergent: boolean` and `grade_usage: Usage | null` all at
  the top level, and `Verdict = 'match' | 'partial' | 'miss'` (never the
  faq-gate vocabulary, F10).
- **The mutable set is exactly four keys** --
  `{grade, stage, divergent, grade_usage}` -- exported as `MUTABLE_ON_GRADE`
  with a compile-time guard that every entry is a real `RunRecord` key.
  `validateGradedDelta` is a **denylist**: it skips those four and deep-compares
  everything else, so a field added later is protected by default.
- **Append rule 3 (F50): produce the graded line by SPREADING the answered
  record** -- `{...answered, stage: 'graded', grade, divergent, grade_usage}` --
  never by rebuilding it field by field. Deep equality on `retrieval_context`,
  `tool_calls` and `usage` means a rebuilt object with the same content but a
  different key order compares unequal, and a false-positive delta would block a
  legitimate write while reading like a contract violation.
- `usage` is the ANSWERING pass and is **immutable**; `grade_usage` is the
  compare-grading call and is mutable. They differ by a prefix and only one of
  them may move.
- `toGradingInput(r: RunRecord): { question, answer, truth }` -- three fields and
  nothing else. This is the E8 carrier and this phase's grader takes it as its
  only data parameter, so blindness is structural rather than disciplinary.
- Records live one file per run at `eval/sim/records/<run_id>.jsonl`, gitignored
  (E13); reconstruction is last-line-wins; resume keys on `(record_id, stage)`.
- `eval/sim/telemetry-baseline.json` -- pre-arc `query_log` /
  `embedding_api_log` / `oracle_meta` / `chat_threads` counts.
- Phase 1 adds `eval/sim/**/*` to `apps/qw-oracle/tsconfig.json`'s `include`.
  Confirmed read-only in the worktree at drafting time that `include` carries
  seven patterns and none is `eval/sim/**/*`, and that `apps/qw-oracle/eval/`
  holds no `sim/` directory -- so a green typecheck in this phase also confirms
  Phase 1's tsconfig change survived.

**From Phase 2** (`phase-2-answering-skeleton.md`, "Outputs to next phase"):

- `eval/sim/deepseek-client.ts` -- this phase uses `chatJson`, `runGently`,
  `emptyUsage`, `addUsage`, `formatSpend`, `DEEPSEEK_MODEL`,
  **`MAX_OUTPUT_TOKENS` (16,384)**, and the `Usage` re-export. It writes no
  second client (E15) and no second pricing table (E10); `chatJson` returns
  `usage.cost_usd` already filled.
- `chatJson` enforces E15's three rules locally: the literal word "json" must
  appear in the prompt (F38 -- HTTP 400 otherwise), `max_tokens >= 512`, and
  `finish_reason === 'length'` throws. Both prompts in this doc contain the
  lowercase word `json` twice, and Task 2's probe asserts it mechanically.
- `eval/sim/jsonl-store.ts` -- `recordsPath`, `appendRecord` (validates before
  writing), `readRecords`, `completedKeys`, `failureCount`.
- `eval/sim/run-answering.ts` -- `QuestionSpec` (seven fields, with
  `exclude_thread_id: string | null` distinct from `thread_id` because it is
  interpolated into `::bigint[]`), `runAnsweringPass(runId, q, cell, opts?)`,
  `loadPhase8Fixture`. The `SampleThread[] -> QuestionSpec[]` loader is a `TBD`
  in Phase 2's doc and unclaimed by Phase 3 (F45); this phase builds it.
- `eval/sim/cells.ts` -- `ANSWERING_MODEL`, `TEMPERATURE = 0`,
  `MAX_TOOL_ROUNDS = 4`, `PINNED_LIMIT = 3`, `PINNED_MAX_MESSAGES = 40`,
  `ctxFor` (throws on a non-decimal exclusion id), `LEAK_SENTINEL`
  `/DSML|invoke name=|\uFF5C\uFF5C/` (quoted escaped per F39 -- the third
  alternative's real bytes are doubled U+FF5C and an ASCII transcription drops
  them).
- A record with `error !== null` is excluded from every rate. This phase never
  grades one.
- Phase 2's Task 7 prints `formatSpend` over a 36-pass smoke run. **That
  measured figure is what Task 4's 60-pass budget is quoted against**; this doc
  guesses no cost-per-answering-pass.

**From Phase 3** (`phase-3-sample-and-keys.md`, "Outputs to next phase"):

- `loadEffectiveSample(): SampleThread[]` in `eval/sim/sample.ts` -- exactly 500
  threads, all `#helpdesk`, non-empty `question` and `truth`, eras 2020-2025,
  per-domain counts equal to the manifest allocation. Throws rather than
  degrading. No database access.
- `SampleThread` carries `thread_id`, `thread_key`, `domain`, `era`, `question`,
  `truth`, `key_quality`, `fix_tokens`, `content_sha256`, `channel_name`.
- `sample-manifest.json` (frozen, digest-bound; carries the seed) and
  `sample-keys.json`.
- **The keys are certified in AGGREGATE only.** F41 stands: a systematic 15%
  `thin` rate passes Phase 3's gate ~20% of the time, and per-domain key quality
  is uncertified at every size. A `thin` key makes a correct specific answer read
  as `miss`. **Grader disagreement caused by a thin key is not a grader defect,
  and this gate cannot tell the two apart** -- so a BLOCK whose confusion matrix
  concentrates on `match -> miss` is more likely a key problem than a rubric
  problem, and rewriting the rubric would be fixing the wrong thing.
- ~1.8% of pool threads have no extractable key and ~2.8% leak the fix into the
  question (F30); `loadEffectiveSample()` is already the narrowed population.
  This phase grades only the effective sample.

## The verdict rubric (normative)

`apps/qw-oracle/eval/sim/grade-prompt.ts`, one exported template plus its
sha256, recorded in `grader-fixture.json` -- exactly as Phase 3 pins
`key-prompt.ts`. Changing a byte invalidates every verdict taken under it.

- **`match`** -- the answer contains the specific fix: the same cvar/setting
  *and its value*, the same file, the same download, or the same named
  procedure. Correct extra material around it does not demote. Extra material
  that would send the player somewhere else *instead* demotes to `partial`.
- **`partial`** -- right neighbourhood, incomplete or imprecise: the right
  subsystem but not the setting, the right cvar without the value that mattered,
  the right procedure missing the step that mattered.
- **`miss`** -- wrong direction, generic non-help, or a decline to answer.

The `match`/`partial` edge is spelled out because the headline is computed
across it; the `partial`/`miss` edge is spelled out because that is where the
grader's noise concentrates (F46, independently confirmed: every observed flip
was on that boundary).

The prompt carries one further instruction, and it is the load-bearing one under
E8: **"Grade only against the RECORDED FIX. Do not use your own knowledge of
QuakeWorld to decide what the correct fix is, and do not reward or punish the
answer for being more modern than the recorded fix."** The grader has no tools
by construction, so its only alternative source of truth is its own priors, and
a grader that silently substitutes them re-introduces exactly the correlated
error E8 exists to prevent.

**The verdict prompt contains no `divergent` block at all.** That is the change
F51 and F52 forced, and the next section is why.

## `divergent`: what broke, why, and the redesign

### What the checker measured

F51: five triples built to be unambiguously `miss` -- a confident
wrong-direction cvar-and-value against a recorded fix lying elsewhere entirely
-- graded under the draft's tight three-condition rubric **verbatim**, 3 reps.
The model set `verdict: "miss"` **and** `divergent: true` on **14 of 15
gradings**, and every `divergent_fix` was a verbatim restatement of the wrong
answer's own advice. F52: on 12 independent triples the tight rubric fired at
**25%, stably across four reps** -- not the ~10% the draft claimed -- while the
loose wording reproduced the draft's 50% exactly, confirming the *diagnosis* and
refuting the *fix*.

### F70 -- why no wording could have fixed it

The rubric asks the grader to decide whether an alternative fix "looks like it
could genuinely resolve the problem" **in the same breath as forbidding it to
use its own QuakeWorld knowledge to decide what the correct fix is.** Condition
3 is a domain-knowledge judgment; the instruction three lines above revokes the
only faculty that could make it. So the model does the only thing left: it
restates the answer's claim and marks it plausible, because within the prompt's
own rules there is no ground on which to say otherwise. **That is not a wording
defect and no rewrite reaches it** -- which is exactly what the checker observed
when it noted that condition 3, not condition 2, is what fails.

The falsifiability trick failed for a second, compounding reason the checker
named precisely and this doc should not have missed: `reviewer_fix` in Phase 3
is written by a **different agent** against the **source thread**, so it can
contradict the thing it checks. `divergent_fix` was written by the **same call**
from the **same text** and checked only for non-emptiness. Copying satisfies it.

Raised as **F70**. It is the mechanism behind F51 and F52 and it is what
licenses the split below.

### Decoupling `divergent` from the arithmetic -- and the D6 wording conflict

Per the ratified direction: **a `divergent` item keeps its verdict in every rate
and every denominator, and is additionally queued for human review.** If review
later overturns a verdict, that is a dated correction to those records, never a
silent exclusion.

Why this matters more than tidiness, in the checker's own terms: cell A produces
confident wrong-direction specifics *by construction*, because it has no
retrieval and must speculate. So the flag fires hardest exactly where the
answers are worst. Under D6's "routes to review **instead of** bulk verdict",
cell A would lose a quarter of its items to a review queue, its rate would be
computed over a survivor subset, and **the A-vs-C delta would be biased toward
the null by the very mechanism meant to protect it.** Decoupling removes the
selection effect entirely and converts over-firing from a **bias** into a
**cost** (review time), which is a thing a threshold can trade against.

**This contradicts D6's wording, not its intent, and it needs a spec amendment
rather than a reinterpretation (E1).** The exact clause is D6's

> `divergent` = "differs from the thread's fix but looks plausibly correct" --
> routes to spot-check review instead of bulk verdict

and the phrase that must move is **"instead of bulk verdict"**. Proposed
replacement: *"...carries its bulk verdict AND routes to spot-check review; a
verdict overturned at review is a dated correction, never an exclusion."*
Everything else in D6 survives untouched -- stage 4 still reviews all divergent
flags, and the era/staleness purpose the flag exists for is preserved exactly.
**Task 0 asserts the amendment has landed and HALTS if it has not.** This doc
does not proceed on an unamended spec.

### The redesign: a separate, knowledge-permitted screener

F70 says the contradiction is structural, and the decoupling is what dissolves
it. Once the flag no longer moves a denominator, the call that produces it no
longer needs to be knowledge-forbidden -- because its errors cannot correlate
with the measured quantity, which is the entire reason E8 constrains the
verdict grader. So the two jobs split into two calls with opposite rules:

| | verdict grader (D6 stage 3) | divergence screener |
|---|---|---|
| sees | `toGradingInput` only | question, answer, truth |
| own knowledge | **forbidden** | **required** |
| output | `verdict`, `rationale` | `worth_review`, `alt_fix`, `why` |
| enters a rate | yes, every one | **no, never** |
| runs on | every gradable record | records whose verdict is not `match` |

The screener runs only on non-`match` verdicts because a `match` answer contains
the recorded fix, which makes it non-divergent by definition -- so the screener's
marginal cost is a fraction of the grading pass, not a doubling of it.

The screener prompt asks the binary directly and says out loud that it is the
opposite of the grading task:

```
You are deciding exactly one thing: should a human spend time on this answer as
a possible BETTER OR NEWER fix than the recorded one?

Answer "yes" only if BOTH hold:
- the answer names a specific actionable fix (a cvar and value, a file, a
  download, a named procedure) that is not the recorded fix; AND
- using what you actually know about Quake and QuakeWorld engines, that fix is
  a credible way to resolve THE PROBLEM THE PLAYER DESCRIBED -- not merely
  stated confidently.

You MAY and SHOULD use your own domain knowledge here. That is the point of
this question, and it is the opposite of the grading task.

Answer "no" if: the answer is generic; the fix is the same as the recorded one;
or the answer is confident but addresses a different problem than the one
asked, or names a setting that does not do what the answer claims. A
confidently wrong answer is a "no", not a "yes".
```

`alt_fix` is retained, but as **evidence for the reviewer, not as a gate** --
F56 is explicit that a non-emptiness check on a string the same call wrote
cannot fail, and F51 shows the failure that matters is a *wrong* fix, which no
syntactic check sees.

### Measured on triples this phase did not author

The coordinator's condition on this redesign was that it be measured on triples
this phase did not author for the purpose, and that the result be reported
whatever it says. It says the split is a real improvement on the failure class
F51 named, **and that it does not get the rate down.**

**Method** (fully read-only against the twin, then paid calls): 40 real
`#helpdesk` solved threads drawn deterministically (`ORDER BY md5(id::text)`),
`truth` extracted by Phase 3's byte-pinned key prompt, and the answer produced
**cold by DeepSeek with a persona and no tools** -- a cell-A-shaped answer to a
real question against a real key. Nothing in the triple was written for the
divergence question. 17 threads survived key extraction and the `key_quality` /
`question_leaks_fix` screen; **9 completed the full grading matrix** and are the
sample below. Each was graded twice under the draft's rubric, once under the
split verdict prompt, and twice under the screener.

**Results, n = 9:**

| statistic | measured |
|---|---|
| draft rubric's `divergent` rate | **5/9 = 56%** (rep 1 and rep 2 identical) |
| screener's `worth_review` rate | **4/9 = 44%** rep 1, **6/9 = 67%** rep 2 |
| screener flag stability rep-to-rep | 7/9 = 78% |
| verdict self-consistency (draft rubric, rep1 vs rep2) | **9/9 = 100%** |
| **verdict agreement, draft rubric vs split verdict prompt** | **9/9 = 100%** |

Three readings, in order of importance.

**1. The split does exactly what F70 predicted, on exactly F51's failure
class.** Two items the draft's rubric flagged, the screener rejected -- and both
are the `verdict: miss` + `divergent: true` + copied-`divergent_fix` pattern the
checker built its five triples to expose. The screener's `why` on each is the
domain-knowledge judgment the old prompt had revoked three lines above asking
for it:

> `ktx_allowlatejoin` is not a known KTX cvar; the known fix is `k_matchless`.

> chowning `~/.ezquake` does not fix the likely cause: write permissions in the
> `/opt/quake` installation dir for map downloads.

The first is a confabulated cvar caught by knowing the engine. Neither judgment
is reachable from the text alone, which is why no rewrite of the old prompt
could have produced it.

**2. F72 -- the rate is still high, and it is not all over-firing.** 44-67% is nowhere
near the "fewer than one in ten" the draft asserted, and the draft's G4 cap of
40% would BLOCK at the measured rate with probability 69-99%. But reading the
flagged items, most look *correct*: an `r_shownick_offs_x/y` answer against a
`scr_centershift` key, a step-by-step MVDSV procedure against an nquakesv/Docker
key, a 144 Hz refresh-rate answer against a "use 77 fps" key. Those are genuine
divergences a human should see. **Cell A produces plausible alternatives often
-- that is a property of the population, not only of the instrument** -- which
is the same observation F51 makes from the other direction when it says the flag
fires hardest where cell A speculates. Post-decoupling that is a review-load
number, not a bias, and the design below treats it as one.

**3. Splitting the prompts does not move the verdicts.** 9/9 verdict agreement
between the draft's combined rubric and the split verdict-only prompt, and 9/9
verdict self-consistency across reps. So removing the `divergent` block does not
perturb the quantity the gate measures, and F46's self-consistency finding
carries across the redesign rather than needing re-establishing.

**One design change falls straight out of the measurement.** One of the
screener's flags was on a `match` verdict (the answer contained the recorded
fix). Under this phase's rule the screener never runs on a `match`, so that flag
cannot occur -- the probe screened everything, the design does not. The
restriction is therefore not only a cost saving; it removes a class of flag that
is wrong by the screener's own condition 1.

**Raised as F72**, because it changes what the arc can promise: the divergence
pile is a standing review cost of a few hundred items on the bulk run, not a
handful of era-stale curiosities, and Phase 5 has to plan for that.

**Stated plainly, because this is the third design for this flag: it is not
converged.** n = 9 is a small sample, the flag stability is 78% rather than the
verdict's 100%, and the rate is high. What this revision claims is narrower than
"fixed": the split **demonstrably** removes F51's copied-justification failure,
**demonstrably** does not disturb the verdicts, and produces a rate that must be
**measured at n = 60 by Task 7 and sized as review load** rather than assumed
down. G4 is set from that measurement rather than above it.

## The graded line

Phase 1's contract as landed. The graded line is produced by **spreading**:

```ts
const graded = { ...answered, stage: 'graded' as const, grade, divergent, grade_usage };
```

and `validateGradedDelta(answered, graded)` must return `[]`. All four mutable
keys move on a normal grading write: `grade` (the verdict), `stage`,
`divergent` (the screener's determination, `false` when the screener did not
run because the verdict was `match`), and `grade_usage` (the compare-grading
call's `Usage`).

**F71 -- the screener's usage has no home in the record, deliberately.**
`grade_usage` is defined by Phase 1 as *the compare-grading call*, and F49 was
raised precisely so that the pilot's per-record grading cost is honest. The
screener is not D6 stage 3, it runs on a subset of records, and folding its
tokens into `grade_usage` would make the per-record figure both wrong and
non-comparable across records. So screener usage lives in the screener sidecar
and in the run summary, and `grader-fixture.json.accounting` totals all three
call types. E10's binding requirement -- a per-phase token and dollar total --
is met; the record field keeps the meaning F49 gave it. Recorded rather than
decided silently, because it is a fifth mutable key someone will otherwise
propose later.

The screener sidecar is `eval/sim/records/<run_id>.divergent.jsonl`, gitignored
alongside the records (E13), one line per screened record:
`{record_id, worth_review, alt_fix, why, usage, screened_at}`. It is the review
pile Phase 5 and Phase 6 work from, keyed so it joins to the run file with no
positional arithmetic.

## The fixture

### F58 -- the shape changed, and this is the most consequential revision

The draft's 60 items were **20 thread-clusters**: three cells of one thread share
one `question` and one `truth`, so a thin key or an ambiguous question produces a
disagreement in all three at once. Every binomial in the draft treated them as 60
exchangeable draws. Reproduced here:

| healthy r | G1&G2&G3 false-BLOCK, 20x3 (clustered) | same, 60x1 (independent) |
|---|---|---|
| 0.95 | **8.9%** | **0.5%** |
| 0.90 | **30.8%** | **8.7%** |
| S1 detection | 96.4% | 98.8% |

At the headline cell the clustered false-BLOCK is ~18x the independent figure,
which reproduces the checker's 17x. **60 threads x 1 cell is strictly dominant**
-- better on false-BLOCK *and* better on detection, at identical spend (60
answering passes, 60 verdict calls). What it gives up is within-thread contrast,
which this gate does not certify and never claimed to. **Ruling: 60 x 1.**

### Selection -- 60 threads, seed-deterministic, era-stratified, one cell each

Drawn from `loadEffectiveSample()`, so the fixture inherits Phase 3's rejections
and substitutions (F30).

- **10 threads per era** for each of 2020-2025, by lowest
  `sha256(seed + ":gradefix:" + thread_id)` within that era. If an era holds
  fewer than 10 in the sample, take all of them and top the deficit up from the
  global hash order, recording the actual spread rather than halting.
- **Cells assigned round-robin in draw order** (`A, B, C, A, B, C, ...`) across
  the full 60, giving 20 per cell. The assignment is a pure function of the
  draw, so it is reproducible from committed files.

`seed` comes from `sample-manifest.json`. Domains are deliberately not
stratified: F41 already ruled per-domain certification unreachable at ten times
this size.

**F67 -- the era arithmetic is now the fixture's own, not the pool's.** The
draft derived S3's exposure from the pool's era fractions (2020-2021 = 34% of
3,164). Under a 10-per-era draw the fixture's exposure is exact and needs no
derivation: **20 of 60 threads are 2020-2021, by construction.** S3 below is
recomputed on that.

### Answering -- 60 passes through Phase 2's shipped runner

Using a prior phase's shipped machinery on this phase's inputs, not a forward
dependency: `runAnsweringPass`, `runGently` and `appendRecord` are all named in
Phase 2's Outputs. The driver imports them directly rather than shelling
`run-answering.ts`, because whether the CLI's `--questions` flag accepts an
arbitrary `QuestionSpec[]` JSON is documented nowhere, and driving the exported
function needs no answer to that question.

Two E7 obligations the driver inherits as a second client call site:

1. **One work queue.** One `runGently` call over the flat list in draw order.
2. **One retry policy.** No second argument to `chatCompletion` / `chatJson`
   anywhere. Phase 2's `probe-cell-symmetry.ts` globs `eval/sim/` for client
   call sites, so this phase's files fall under it automatically -- which is why
   the glob was written that way and why this phase adds no probe of its own.

`exclude_thread_id` is the thread's own decimal `chat_threads.id`. This is the
first place in the arc where D6's leave-one-out fires on a real sampled thread.

Stated so nobody over-reads it: these records carry their own `run_id`, are
never pooled into any rate, and Phase 1 already pins the headline to the bulk
run's file alone.

### F55 -- the join, which the draft asserted away

The blind projection carries `{fixture_index, question, answer, truth}` and
nothing else, and the draft's own probe asserted the absence of `record_id`. But
`RunRecord` has no `fixture_index`, nothing carried a map, and positional
re-derivation is unreliable because the same step skips `error !== null`
records, shifting every later index. **The join could not execute.**

Fix: Task 4 emits a committed sidecar, `eval/sim/fixtures/grader-fixture.index.json`,
holding `[{fixture_index, record_id}]` for exactly the items in the blind file.
Claude never reads it -- the dispatch constraint names it explicitly alongside
the records file -- and Task 7 joins through it. `fixture_index` is assigned
**after** the error-skip, over the surviving records in draw order, so the map
and the blind file are generated in one pass from one array and cannot drift.

### Claude's blind hand-grade -- the reference

Claude grades all surviving items from `grader-fixture.blind.json`, writing
`{fixture_index, verdict, divergent, note}` to
`eval/sim/fixtures/grader-fixture.claude.json`, **committed before any DeepSeek
verdict is read**. The commit is the audit trail; a file written afterwards is
not a blind grade whatever it contains. Claude uses no tools -- the reference
must be blind and toolless in the same way the subject is, or the two are not
measuring the same task. (D6 stage 4's tool-assisted review is a later stage
with a different job.)

Claude's `divergent` judgment is recorded for the screener's precision and
recall numbers, which are **reported, not gated** (see "What the screener cannot
certify").

Claude is the reference, not ground truth. Where the two disagree, the gate
counts a disagreement; it does not assert who was right.

### The E8 prose residue, still sized

E8's leakage-honesty amendment says field-level blindness is not total, because
a condition marker can survive inside the answer's own prose -- and the first
draft measured it live: an answer opening "According to a #helpdesk thread from
2021..." was graded normally with no sign the grader registered the tell. Task 4
counts how many of the 60 answers contain a channel name (`#helpdesk`,
`#quakeworld`, `#dev-corner`, `#antilag`) or a bare four-digit year in 2015-2026,
records the count and up to five examples under `leakage`, and Phase 8 reports
it. It remains the only number in the arc that bounds prose leakage.

## The gate

Five sub-gates over the fixture. All must PASS.
Let `C` be Claude's verdict and `D` be DeepSeek's rep-1 verdict.

| Gate | Statistic | Threshold |
|---|---|---|
| **G1 aggregate** | exact 3-way agreement `C == D` over all items | `>= 80%` (<= 12 of 60) |
| **G2 match-recall** | of `C == 'match'`, the share with `D == 'match'` | `>= 80%` |
| **G3 match-precision** | of `D == 'match'`, the share with `C == 'match'` | `>= 80%` |
| **G4 screener ceiling** | the screener's `worth_review` rate over screened items | `<= 75%` (a ceiling, not a target -- see below) |
| **G5 verdict self-consistency** | a second independent verdict pass; exact agreement rep1 vs rep2 | `>= 85%` |

**G4 is a ceiling, and the rate it bounds is an operator-facing number.**
Post-decoupling an over-firing screener costs review time and biases nothing, so
the number that matters is the size of the pile. Computed from the measured
rate, over the bulk run's ~1,500 records with the screener running on
non-`match` verdicts only: at a 35-45% match share and a 30% flag rate the pile
is **248-292 items**; at the measured 44% it is **363-429**; at 60% it is
**495-585**. Those are not small, and D6 stage 4 already reviews all divergents
plus a random 5-10% slice. **The pile therefore ships ranked, not merely
flagged**: the sidecar carries the screener's `why`, and Phases 5 and 6 work it
in descending rank rather than exhaustively. That is option (c) from the
checker's list, adopted **on top of** the split rather than instead of it,
because the measurement says precision alone will not make the pile small.
`TBD(phase-5: the ranking the review pile is worked in, and how deep the
operator goes)`.

**Composition floors -- INCONCLUSIVE, and all three are Claude's:** `match >= 12`,
`miss >= 12`, `partial >= 8`. Each is evaluated **inside the blind pass and
committed before any DeepSeek verdict is read**, so none of them can be a
function of the instrument under test. Remedy: extend the fixture (below).

**F57 -- the fourth floor is deleted and becomes a BLOCK.** The draft also
required DeepSeek's `match` class `>= 12`, computed at join time from the
instrument under test -- and it is a monotone function of the defect the gate
exists to catch. Under a 45% safe-middle demotion it lands at ~11, misses the
floor, returns INCONCLUSIVE, and routes a *worse* defect to "extend and retry"
instead of BLOCK, through a channel the three-revisions cap does not count
because that cap counts BLOCKs. **Rule now: if Claude's `match` class meets its
floor and DeepSeek's is below 12, that is a BLOCK, not an INCONCLUSIVE** -- it
can only mean systematic demotion, which is precisely S1. G3's denominator is
then small, so Task 7 records G3 as `n/a (BLOCK on demotion)` rather than
computing a ratio over four items.

The extension trigger therefore reads Claude's verdict **composition** only,
never any agreement count and never any DeepSeek output. A rule that extended
because the agreement number came out near threshold would be optional stopping
on the tested statistic and would invalidate every figure below.

**F65 -- extension, costed correctly.** The draft said "+24 answering passes";
minting a fresh `run_id` would in fact have re-answered all 60 (84 passes) and
re-graded items Claude had already seen, which is the anchoring the BLOCK path
correctly forbids. Corrected: extension draws **12 more threads** (2 per era)
from the same seeded order, answers them under the **same `run_id`** so
`completedKeys` skips the existing 60, grades only the new 12, and appends
Claude's verdicts for only the new 12. Cost: 12 answering passes, 12 verdict
calls, 12 rep-2 calls, screener on the non-`match` subset, 12 Claude grades.
Cap: 96 threads total; past that, stop and take it to the operator.

### Why G2 and G3 exist, and why G1 alone would not

G1 is a gross-breakage floor and nothing else (binomial, n=60, tolerate 12):

| true agreement | detection |
|---|---|
| 0.90 | 0.6% |
| 0.85 | 10.6% |
| 0.80 | 42.4% |
| 0.75 | 76.8% |
| 0.70 | 94.3% |

It catches a broadly broken grader and is nearly blind to a biased one. The
detection lives in G2 and G3, which are conditional rates on the class the
headline is made of.

### Operating characteristic -- recomputed exactly (F53, F58, F63)

**F63 -- G1 and G2 are positively correlated** (G1 counts all disagreements
including the match class's), so the draft's product was wrong in the optimistic
direction. Computed exactly by conditioning on the match class:
`P(G1 & G2) = sum_x P(X_m = x) * [x <= tol_m] * P(X_o <= 12 - x)`.
G3's denominator overlaps G2's; it is folded in as conditionally independent
given the match class, and **that one step is an approximation, stated**.

**F53 -- G4 is now in the product.** The draft composed four gates while
claiming five. It is folded in below; the headline barely moves, and the reason
is that G4's cap was loosened from 9 to 24, not that it was hidden.

False BLOCK on a healthy grader, n=60 independent, match class m=20, per-class
tolerance `floor(0.20 * m) = 4`, G5 modelled at `max(r, 0.90)`, G4 at the
measured screener rate against its 75% ceiling:

| healthy r | G1&G2 exact | x G3 | x G5 | x G4 | **false BLOCK** |
|---|---|---|---|---|---|
| 0.95 | 99.7% | 99.5% | 99.4% | 99.4% | **0.6%** |
| 0.92 | 98.1% | 96.3% | 94.4% | 94.4% | **5.6%** |
| 0.90 | 95.4% | 91.3% | 84.6% | 84.6% | **15.4%** |
| 0.85 | 78.0% | 64.7% | 60.0% | 60.0% | **40.0%** |

Two honest readings of that table. **G5 is the dominant contributor** at r=0.90
(91.3% -> 84.6%), which is the price of measuring the grader's own noise rather
than assuming it away -- and F46 is why that price is worth paying. And **G4
contributes essentially nothing, because it was set from the measurement rather
than above it.** At the 75% ceiling it passes with probability 100.0% at the
measured 44% rate, 99.5% at 60%, 93.0% at 67%, and falls to 54.9% only at 75% --
the point at which the flag fires on three answers in four and carries nothing
worth reviewing.

The two rejected settings, both computed: the draft's 9-of-60 cap at F52's
measured 25% rate passes with probability **4.5%** (F52's ">99% BLOCK"
reproduced to the decimal), and this revision's own first instinct -- a 40% cap
-- passes with probability **31.2% at the measured 44% rate and 0.9% at 56%**.
Either would have BLOCKed the phase on a screener that is working. **A gate set
above what the instrument was measured to do fails the instrument, not the
defect**, which is precisely the error F52 caught in the draft. G4 is now a
ceiling on meaninglessness, and the rate itself is reported as review load.

Detection of S1, exact joint:

| demotion of true-`match` | G1&G2 detection | with G3 |
|---|---|---|
| 20% | 64.1% | 87.1% |
| 30% | **89.3%** | **98.8%** |
| 45% | 99.3% | 100.0% |

The 89.3% figure is F63's, reproduced exactly; the draft's 91.6% was the
independence approximation of that same pair. With G3 the detection is 98.8%.

**The design argument that survives intact:** a false BLOCK here is cheap. The
answers do not change, so a BLOCK costs a rubric revision plus 60 verdict calls
plus 60 rep-2 calls -- cents, and no re-answering and no Claude re-read. That is
nothing like Phase 3's false BLOCK, which costs a 500-key re-extraction plus a
50-key human re-read. **That asymmetry is why this gate is tuned tighter than
Phase 3's, and it is the reason a 15.4% false-BLOCK at r=0.90 is an acceptable
trade rather than a defect.**

### The scenarios where this gate PASSES while the grader is bad

**S1 -- the safe middle (CAUGHT; this is what G2 and G3 are for).** The grader
awards `partial` whenever an answer names the fix but hedges. At a 30% demotion
with 8% noise elsewhere, aggregate agreement is 82.8% -- **through an 80%
aggregate gate** -- while cell C's match rate drops by a third and cell A's
barely moves, compressing the A-vs-C delta. Detection 98.8%. This scenario
determined the gate's shape.

**S2 -- divergence as an escape hatch (CAUGHT structurally, and now by
construction).** A grader that flags its own hard cases and an implementer who
excludes them from the denominator: on 60 items with 15 true disagreements,
flagging 12 of them lifts measured agreement from 75.0% (BLOCK) to 93.8%
(PASS). **The decoupling closes this at the source** -- there is no exclusion
path left to take, because the screener's output never enters a denominator and
the screener does not even produce a verdict. The boundary probe recomputes
G1-G3 from the raw items, so an implementation that filtered anyway cannot pass.

**S3 -- an era-confined defect (NOT CAUGHT; F48, the declared limit).** The
grader is systematically harsh on the oldest threads, returning `miss` where the
answer gives today's equivalent of a dead 2020-2021 cvar -- the exact failure
the screener exists to catch, failing silently in the safe-looking direction.
Recomputed on the fixture's own composition (F67): 2020-2021 is exactly 20 of 60
threads. If the defect fires on the third whose recorded fix is genuinely dated,
that is ~7 extra disagreements on ~4.8 of baseline noise -- expected aggregate
~80%, just inside G1's tolerance, spread across all three verdict classes so G2
and G3 barely move. **Detection ~40%; the gate passes more often than it
catches this.** The consequence is a Phase 8 per-era cut whose oldest rows are
depressed by a grader property that reads as an oracle property.

Nothing affordable fixes S3 here: certifying grader behaviour per era needs
roughly the whole sample hand-read, which is the arithmetic F41 already ran for
per-domain key quality. **Declared, not patched.** Three consequences carried
forward: `grader-fixture.json` records per-era disagreement counts and per-era
screener rates as *reported* numbers with no gate attached; Phase 8 must not
read a per-era difference as an oracle property without a targeted re-check;
and a near-zero screener rate on 2020-2021 answers alongside a nonzero rate
elsewhere is the cheap tell that the flag is failing where it was needed.

**S4 -- a defect confined to any small stratum (NOT CAUGHT, same reason).** A
defect confined to `k` items adds at most `k` disagreements and G1 tolerates 12.
Anything under ~12 items is invisible to the aggregate gate, and unless it lands
in the match class it is invisible to G2 and G3 too. Era, cell, domain and
answer-length band are all in that regime at n=60. The one stratum this gate
certifies is the match class, because that is what the headline is made of.

### What the screener cannot certify (F41-shaped, and F69's residue)

Claude will flag only a handful of the 60 as divergent, so a gate on the
screener's **recall** against that class is uninformative at every plausible
size. Computed, recall gate at `>= 70%`:

| Claude's divergent class | P(PASS) at true recall 90% | 70% | 50% | 30% |
|---|---|---|---|---|
| 4 of 60 | 94.8% | 65.2% | 31.2% | 8.4% |
| 6 of 60 | 88.6% | 42.0% | 10.9% | 1.1% |
| 8 of 60 | 96.2% | 55.2% | 14.5% | 1.1% |
| 10 of 60 | 98.7% | 65.0% | 17.2% | 1.1% |

A gate that passes a 50%-recall screener between 11% and 31% of the time is not
a gate. **So screener precision, recall and stability are measured and reported,
never gated** -- G4 gates only the feasibility ceiling. Stated plainly because
recall is the failure that matters after decoupling: a spurious flag costs
review time, a missed flag is the S3 mechanism.

**F69 -- G5 covers the verdict only, and that is now correct rather than a
gap.** The checker measured the `divergent` flag at 75% run-to-run stability
versus 83% for verdicts, so under the draft's design the noisier signal was the
ungated one *and* it fed a gate. After the split, the noisy signal is out of the
arithmetic entirely: it produces no verdict, enters no denominator, and only
routes review. G5 therefore measures the verdict pair, which is the thing in the
arithmetic, and the screener's stability is reported alongside as a review-load
property. Task 7 records both.

### How this relates to Phase 5's pilot gate

D6 sets the pilot gate at ">=90% agreement on the match/miss boundary" over
30-50 threads through the full pipeline. Passing this gate does not pre-empt it:

1. **Different subject.** This measures the grader in isolation against answers
   generated for the purpose. Phase 5 measures key, retrieval, answering and
   grading together, so a Phase 5 failure has four candidate causes and a
   Phase 4 failure has one. Isolating the grader is the only reason this is a
   separate phase.
2. **Different population.** This fixture is drawn era-stratified with
   composition floors that extend it if the verdict spread is too narrow.
   Phase 5's slice is drawn to be representative, and only it can see whether
   the grader is right on the real verdict mix.
3. **Different boundary, neither dominating.** D6's match/miss dichotomy
   collapses `partial` onto the non-match side; G2 and G3 gate that same
   collapse *conditionally*, which is tighter, while G1 gates the finer 3-way
   scale at a looser threshold.

`TBD(phase-5: the pilot slice composition, the match/miss agreement arithmetic,
and whether the pilot re-uses this phase's rep-2 mechanism for its own
re-grade)`.

## Files touched

**Created:**
- `apps/qw-oracle/eval/sim/grade-prompt.ts` -- both byte-pinned prompts, their
  digests, and the `GraderOutput` / `ScreenerOutput` types (F64: these types are
  declared **here only** and imported by `grader.ts`)
- `apps/qw-oracle/eval/sim/grader.ts` -- `gradeOne`, `screenOne`
- `apps/qw-oracle/eval/sim/question-specs.ts` -- `sampleToQuestionSpecs()` (F45)
- `apps/qw-oracle/eval/sim/answer-fixture.ts` -- selection, the 60-pass driver,
  the blind projection, the index sidecar, the leakage count
- `apps/qw-oracle/eval/sim/run-grading.ts` -- the in-place grading CLI
- `apps/qw-oracle/eval/sim/probe-grader-blind.ts` -- the E8 payload probe
- `apps/qw-oracle/eval/sim/probe-graded-delta.ts` -- the spread-rule probe
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.blind.json` -- committed
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.index.json` -- committed
  (F55; the `fixture_index -> record_id` map, which Claude never reads)
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.claude.json` -- committed
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.rep2.json` -- **committed**
  (F62: it is the evidence for G5, a gated number, so E13's "conclusions are
  committed" applies to it exactly as it does to Claude's verdicts; it is small,
  it carries no answer text, and G5 is unauditable without it)

**Modified:** none. **Deleted:** none.

**Writes but does not commit:** `eval/sim/records/<fixture_run_id>.jsonl` and
`eval/sim/records/<fixture_run_id>.divergent.jsonl`, both gitignored under
Phase 1's `eval/sim/records/` rule.

## Tasks

**F54 -- the draft's Task 1 (the F44 amendment) is deleted**: Phase 1's revision
landed while this was being drafted, so its five steps are all Phase 1's work,
its four `Modified` files are no longer this phase's to touch, and its
ratification gate ratified something already ratified. Tasks renumbered; Task 0
inverted.

Numbered order is a valid topological order. **Edge list:** `1 -> 4`, `2 -> 3`,
`3 -> 6`, `4 -> 5`, `4 -> 6`, `5 -> 7`, `6 -> 7`. Tasks 1 and 2 have no
in-edges; every edge points from a lower number to a higher one, so no task
consumes a later task's output and the graph is acyclic by inspection. Task 0
precedes everything and produces only assertions.

### Task 0 -- Entry re-verification of the spec and Phases 1, 2, 3 · `inline`

**Goal:** every input this phase was drafted against is present and shaped as
promised -- including one that changed under it mid-draft, and one this phase
has asked to be changed.

**Files:** none.

**F60 -- the probe now checks all six things its prose claims**, plus the two
this revision adds. **F61 -- the Voyage check moved here**, because E6's F37
amendment says *entry probe* and the draft put it in the answering task, which
is after the point where a lexical-only run would already have happened.

**Steps:**
1. Assert the D6 amendment has landed: `grep` the spec for the replacement
   clause. **HALT if absent** -- this phase's whole divergent design rests on
   it and proceeding would be the silent reinterpretation E1 forbids.
2. Run the probe below.

**Verification probe:**

    grep -q 'carries its bulk verdict AND routes to spot-check review' /home/dev/projects/quakeworld-eval/docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md && echo D6_AMENDMENT_LANDED || { echo "HALT: D6 still says 'instead of bulk verdict' -- see Phase 4's decoupling section"; exit 1; }
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const fails=[]; const ck=(ok,m)=>{console.log((ok?"PASS ":"FAIL ")+m); if(!ok) fails.push(m);};
    const rr = await import("./eval/sim/run-record.ts");
    for(const n of ["validateRunRecord","validateGradedDelta","toGradingInput"]) ck(typeof rr[n]==="function","run-record exports "+n);
    ck(Array.isArray(rr.MUTABLE_ON_GRADE)&&rr.MUTABLE_ON_GRADE.slice().sort().join(",")==="divergent,grade,grade_usage,stage","MUTABLE_ON_GRADE is exactly the four keys (got "+JSON.stringify(rr.MUTABLE_ON_GRADE)+")");
    const g = await Bun.file("eval/sim/fixtures/run-record.example.json").json();
    const a = await Bun.file("eval/sim/fixtures/run-record.answered.json").json();
    const A=rr.validateRunRecord(a), G=rr.validateRunRecord(g);
    ck(A.ok&&G.ok,"both Phase 1 fixtures validate");
    ck(rr.validateGradedDelta(A.record,G.record).length===0,"clean answered/graded pair reports no delta");
    ck(rr.validateGradedDelta(A.record,{...G.record,divergent:!G.record.divergent}).length===0,"F44 LANDED: a divergent-only change is accepted");
    ck(rr.validateGradedDelta(A.record,{...G.record,grade_usage:null}).length===0,"F49 LANDED: a grade_usage-only change is accepted");
    ck(rr.validateGradedDelta(A.record,{...G.record,usage:{...G.record.usage,cost_usd:99}}).includes("usage"),"answering usage is still IMMUTABLE (not widened by name-matching)");
    ck(rr.validateGradedDelta(A.record,{...G.record,answer:"tampered"}).length>0,"answer tampering still caught");
    const k=Object.keys(rr.toGradingInput(G.record)).sort().join(","); ck(k==="answer,question,truth","toGradingInput keys exactly answer,question,truth (got "+k+")");
    const dc = await import("./eval/sim/deepseek-client.ts");
    for(const n of ["chatJson","runGently","emptyUsage","addUsage","formatSpend"]) ck(typeof dc[n]==="function","deepseek-client exports "+n);
    ck(typeof dc.DEEPSEEK_MODEL==="string"&&dc.DEEPSEEK_MODEL.length>0,"DEEPSEEK_MODEL is a non-empty string");
    ck(typeof dc.MAX_OUTPUT_TOKENS==="number"&&dc.MAX_OUTPUT_TOKENS>=8192,"MAX_OUTPUT_TOKENS >= 8192 (F73: 2048 truncates on real triples)");
    const js = await import("./eval/sim/jsonl-store.ts");
    for(const n of ["appendRecord","readRecords","completedKeys","recordsPath"]) ck(typeof js[n]==="function","jsonl-store exports "+n);
    const ra = await import("./eval/sim/run-answering.ts");
    ck(typeof ra.runAnsweringPass==="function","run-answering exports runAnsweringPass");
    const sm = await import("./eval/sim/sample.ts");
    const s = sm.loadEffectiveSample();
    ck(s.length===500,"loadEffectiveSample returns 500 (got "+s.length+")");
    ck(s.every(x=>x.truth&&x.truth.trim().length>0),"every sampled thread carries a non-empty truth");
    ck(s.every(x=>/^[0-9]+$/.test(x.thread_id)),"every thread_id is decimal (it reaches ::bigint[])");
    const byEra={}; for(const x of s) byEra[x.era]=(byEra[x.era]||0)+1;
    console.log("era spread of the effective sample: "+JSON.stringify(byEra));
    ck(Object.keys(byEra).length===6,"all six eras 2020-2025 present in the sample");
    ck(Object.values(byEra).filter(v=>v>=10).length>=5,"at least five eras can supply the 10-per-era draw (deficits top up from the global order)");
    ck(!!process.env.VOYAGE_API_KEY,"E6/F37 entry check: VOYAGE_API_KEY is set -- without it retrieval silently degrades to lexical-only");
    ck(!!process.env.EMBEDDING_MODEL_QUERY,"E6/F37 entry check: EMBEDDING_MODEL_QUERY is set");
    process.exit(fails.length?1:0);'

Expect `D6_AMENDMENT_LANDED`, `APP_TYPECHECK_OK`, every line `PASS`, exit 0.
The three `LANDED` assertions are inverted from the draft (F54): they now
require Phase 1's widened set, not the old two-key one.

### Task 1 -- `question-specs.ts`: the missing loader (F45) · `agent (workhorse, medium)`

**Goal:** a `SampleThread[]` becomes a `QuestionSpec[]`, with leave-one-out
wired, in one place Phases 5 and 6 reuse.

**Files:** `eval/sim/question-specs.ts` (new).

**Why here:** Phase 2 lists this as `TBD(phase-3: ...)`; Phase 3 says Phase 6
populates records from `loadEffectiveSample()`. Neither claims it, and Phase 4
is the first phase to answer a real sampled thread. Built as a new file, not an
edit to Phase 3's committed `sample.ts`, so no landed artifact moves.

**Steps:**
1. Export `sampleToQuestionSpecs(threads: SampleThread[]): QuestionSpec[]`,
   mapping the six shared fields straight across and setting
   `exclude_thread_id = thread_id`. That assignment IS D6's leave-one-out and
   gets a why-comment naming stage 2: without it the agent retrieves its own
   answer key and cells B and C collapse into self-retrieval.
2. Throw on a `thread_id` that is not `/^[0-9]+$/`, naming the row. It reaches
   `::bigint[]`, where the failure is 40 identical cell-B/C throws that read as
   a harness collapse rather than one bad row.
3. Throw on an empty `question` or `truth`.
4. No database access, no I/O.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && bun -e '
    const {loadEffectiveSample}=await import("./eval/sim/sample.ts");
    const {sampleToQuestionSpecs}=await import("./eval/sim/question-specs.ts");
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const s=loadEffectiveSample(); const q=sampleToQuestionSpecs(s);
    ck(q.length===500,"500 specs (got "+q.length+")");
    ck(q.length>0,"floor: non-empty");
    ck(q.every(x=>x.exclude_thread_id===x.thread_id),"every spec excludes its own thread (D6 leave-one-out)");
    ck(q.every(x=>/^[0-9]+$/.test(String(x.exclude_thread_id))),"every exclusion id is decimal");
    ck(q.every(x=>x.question.trim()&&x.truth.trim()),"no empty question or truth");
    ck(new Set(q.map(x=>x.thread_id)).size===500,"no duplicate thread_id");
    let threw=false; try{ sampleToQuestionSpecs([{...s[0],thread_id:"p8-01"}]); }catch{ threw=true; }
    ck(threw,"a non-decimal thread_id throws rather than reaching ::bigint[]");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0.

### Task 2 -- Both prompts, byte-pinned · `agent (session-tier, high)`

**Goal:** two exported prompts with opposite knowledge rules, two digests, two
output types, and no second copy of the verdict vocabulary.

**Files:** `eval/sim/grade-prompt.ts` (new).

**Steps:**
1. Export `GRADE_PROMPT_TEMPLATE(g: GradingInput): string` -- the verdict rubric
   from "The verdict rubric" above, **with no `divergent` block of any kind**.
   Its output shape is `{"verdict":..., "rationale":...}` only.
2. Export `SCREEN_PROMPT_TEMPLATE(g: GradingInput): string` -- the screener from
   "The redesign" above, verbatim. Its knowledge-permitting sentence is
   load-bearing and must not be softened: F70 is that the previous design
   revoked the faculty it then required.
3. Export `GRADE_PROMPT_SHA256` and `SCREEN_PROMPT_SHA256`, each the sha256 of
   its template with the three slots filled by the sentinels `<Q>`, `<A>`, `<T>`,
   so a digest is a property of the template and not of one call's inputs.
4. Export the two output types, **declared here and nowhere else** (F64):

       export interface GraderOutput { verdict: Verdict; rationale: string; }
       export interface ScreenerOutput { worth_review: boolean; alt_fix: string; why: string; }

   `Verdict` is imported from `run-record.ts`, never restated -- F10 records
   that three verdict vocabularies already exist in this repo.
5. No HTTP, no client import, no I/O. This file is two strings and two types.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && bun -e '
    const gp=await import("./eval/sim/grade-prompt.ts"); const fails=[];
    const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const fill={question:"<Q>",answer:"<A>",truth:"<T>"};
    const p=gp.GRADE_PROMPT_TEMPLATE(fill), s=gp.SCREEN_PROMPT_TEMPLATE(fill);
    ck(p.length>800,"floor: verdict prompt non-trivial ("+p.length+")");
    ck(s.length>500,"floor: screener prompt non-trivial ("+s.length+")");
    for(const [n,t] of [["verdict",p],["screener",s]]){
      ck(t.includes("json"),"E15 rule 1: literal lowercase json in the "+n+" prompt");
      for(const sl of ["<Q>","<A>","<T>"]) ck(t.includes(sl),n+" prompt interpolates "+sl);
    }
    ck(!/divergent/i.test(p),"F51/F70: the VERDICT prompt carries no divergent block");
    ck(/Do not use your own knowledge/.test(p),"the verdict prompt forbids own knowledge (E8)");
    ck(/MAY and SHOULD use your own domain knowledge/.test(s),"the screener prompt REQUIRES own knowledge -- the opposite rule, which is the point of the split");
    ck(!/NAILED|WRONG/.test(p+s),"F10: the faq-gate vocabulary appears nowhere");
    for(const [n,d,t] of [["GRADE",gp.GRADE_PROMPT_SHA256,p],["SCREEN",gp.SCREEN_PROMPT_SHA256,s]]){
      ck(/^[0-9a-f]{64}$/.test(d),n+"_PROMPT_SHA256 is a 64-hex digest");
      const h=new Bun.CryptoHasher("sha256"); h.update(t);
      ck(h.digest("hex")===d,n+" digest is the digest of the sentinel-filled template");
    }
    ck(gp.GRADE_PROMPT_SHA256!==gp.SCREEN_PROMPT_SHA256,"the two prompts are distinct");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. The three knowledge-rule assertions are the
ones that encode F70: one prompt forbids priors, the other requires them, and a
future edit that harmonises them re-creates the defect.

### Task 3 -- `grader.ts`, `screenOne`, and the E8 blindness probe · `agent (workhorse, high)`

**Goal:** two calls, the first structurally incapable of seeing the condition,
with blindness proven by sentinel rather than by reading the code.

**Files:** `eval/sim/grader.ts` (new), `eval/sim/probe-grader-blind.ts` (new).

**Steps:**
1. Export
   `gradeOne(input: GradingInput): Promise<{ out: GraderOutput; usage: Usage; latency_ms: number }>`
   and
   `screenOne(input: GradingInput): Promise<{ out: ScreenerOutput; usage: Usage; latency_ms: number }>`.
   **`GradingInput` is the only parameter on both.** No `RunRecord` overload, no
   optional context -- E8's force comes from there being no parameter a
   condition could ride in, the same argument Phase 1 makes for
   `RetrievalContext`'s positional separation.
2. **F59 -- no `opts.model`.** The draft's model-override option was either dead
   or a violation of E7's one-retry-policy rule, which Phase 2's symmetry probe
   enforces by globbing `eval/sim/` for client call sites that pass a second
   argument. Neither function takes options; both call `chatJson(req)` with no
   second argument.
3. **F73 -- budget `MAX_OUTPUT_TOKENS`, not a local constant.** The draft
   specified `max_tokens: 2048` on the strength of a 489-token average measured
   on short synthetic triples. Measured on real corpus triples during this
   revision, `finish_reason === 'length'` fired at 2048 on both key extraction
   and grading; the same prompts at 8192 completed. Use Phase 2's pinned
   `MAX_OUTPUT_TOKENS` (16,384) so there is one budget in the arc, and E15 rule
   3 still makes a `length` finish throw.
4. Validate the parsed values strictly and throw on any violation, so
   `runGently` counts and retries it: `verdict` in the union and `rationale`
   non-empty for `gradeOne`; `worth_review` a boolean, `alt_fix` a string and
   `why` non-empty for `screenOne`. **Do not** throw when `worth_review` is true
   and `alt_fix` is empty -- F56 showed that check is tautological (no violating
   record can reach the gate) and F51 showed the failure that matters is a
   *wrong* `alt_fix`, which no syntactic check sees. Record it and let the
   reviewer judge.
5. Export nothing else. No file I/O, no database handle, no MCP import: a grader
   that *could* reach a database is the correlated-error failure E8 exists to
   prevent, and the cheapest guarantee is having no such import to reach for.
6. Write `probe-grader-blind.ts`, making **no network call**. Build an in-memory
   `RunRecord` from Phase 1's graded fixture with sentinels in every field the
   grader must not see -- `condition: 'B'`, `domain: 'ZZDOMAINSENTINEL'`,
   `answering_model: 'ZZMODELSENTINEL'`, `thread_key: 'ZZKEYSENTINEL'`, a tool
   call argument `'ZZTOOLSENTINEL'`, `retrieval_context.channels:
   ['ZZCHANNELSENTINEL']` -- then assert that **both** templates applied to
   `toGradingInput(rec)` contain none of the six and do contain the record's
   `question`, `answer` and `truth`. The positive half is the non-emptiness
   floor: an empty template would pass all six negative assertions and prove
   nothing.
7. The probe also greps `grader.ts`'s source for `postgres`, `../serve/mcp` and
   `@modelcontextprotocol`, and fails on any. Stated honestly: a source grep
   defeated by a wrapper, kept because the alternative is an unenforceable
   comment -- the same trade Phase 2 made for its retry probe.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-grader-blind.ts

Expect every line `PASS` and exit 0. No paid call.

### Task 4 -- The fixture: draw 60, answer 60, project blind, emit the index · `agent (workhorse, medium)`

**Goal:** 60 answered records on disk, a blind projection, a join map, a leakage
count, and a measured bill.

**Files:** `eval/sim/answer-fixture.ts` (new),
`eval/sim/fixtures/grader-fixture.blind.json` (new, committed),
`eval/sim/fixtures/grader-fixture.index.json` (new, committed),
`eval/sim/records/<fixture_run_id>.jsonl` (gitignored).

**Steps:**
1. Read the seed from `sample-manifest.json`. Draw 10 threads per era for
   2020-2025 by lowest `sha256(seed + ":gradefix:" + thread_id)` within era; top
   up any deficit from the global hash order. Assign cells round-robin in draw
   order. Print all 60 ids, the era spread and the per-cell counts.
2. `sampleToQuestionSpecs()` over the 60.
3. Mint `fixture_run_id` (a ULID, per Phase 1's convention) and print it; every
   later task takes it as an argument rather than re-deriving it.
4. One `runGently` call at `conc: 6` over the flat draw-order list, calling
   `runAnsweringPass(fixtureRunId, q, cell)` and `appendRecord` inside the
   per-item function so a line lands the moment a pass completes (E9). E7's
   one-work-queue rule applies here as much as to Phase 2's runner.
5. **Assert the semantic path was live** (E6's F37 amendment): after the run,
   assert `embedding_api_log` gained at least one row with `error IS NULL` since
   the run's start timestamp. The env half of this check already ran in Task 0
   (F61). A degraded lexical-only run is a hard failure -- and worse than usual
   here, because the grader would be certified against answers from an oracle
   running on half its retrieval.
6. Drop records with `error !== null`, report how many, and **stop if more than
   6 of 60 failed** rather than certifying a grader on a survivor subset (E7
   amendment channel 3). Then, **in one pass over the surviving array**, assign
   `fixture_index` and emit both files together:
   - `grader-fixture.blind.json`: `[{fixture_index, question, answer, truth}]`
     and nothing else;
   - `grader-fixture.index.json`: `[{fixture_index, record_id}]` (F55).
   One array, one loop, two writes -- so the map cannot drift from the
   projection.
7. Count the E8 prose residue: answers containing `#helpdesk`, `#quakeworld`,
   `#dev-corner`, `#antilag`, or a bare four-digit year in 2015-2026. Print the
   count and up to five examples.
8. Print `formatSpend`, the per-cell forcing-turn rate and the per-cell failure
   count, alongside Phase 2's Task 7 smoke total for 36 passes, so the 60-pass
   figure is compared against a measured baseline rather than an expectation.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const {readRecords}=await import("./eval/sim/jsonl-store.ts");
    const {validateRunRecord}=await import("./eval/sim/run-record.ts");
    const id=process.env.FIXTURE_RUN_ID; if(!id){console.log("FAIL FIXTURE_RUN_ID not set");process.exit(1);}
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const {records}=readRecords(id);
    ck(records.length===60,"60 reconstructed records (got "+records.length+")");
    ck(records.every(r=>validateRunRecord(r).ok),"every record validates");
    ck(records.every(r=>r.stage==="answered"&&r.grade===null&&r.divergent===false&&r.grade_usage===null),"every record is ungraded with the three grading fields at their answered values");
    ck(new Set(records.map(r=>r.record_id)).size===60,"60 distinct record_ids");
    ck(new Set(records.map(r=>r.thread_id)).size===60,"60 DISTINCT THREADS -- the F58 independence property");
    for(const c of ["A","B","C"]) ck(records.filter(r=>r.condition===c).length===20,"20 records in cell "+c);
    const byEra={}; for(const r of records) byEra[r.era]=(byEra[r.era]||0)+1;
    console.log("fixture era spread: "+JSON.stringify(byEra));
    ck(Object.keys(byEra).length===6,"all six eras present");
    ck(Math.min(...Object.values(byEra))>=8,"no era below 8 threads (10 nominal, deficits topped up)");
    ck(records.filter(r=>r.condition==="A").every(r=>r.tool_calls.length===0),"cell A used no tools");
    ck(records.filter(r=>r.condition!=="A").every(r=>r.retrieval_context.exclude_thread_ids[0]===r.thread_id),"leave-one-out wired on every B/C record");
    ck(records.filter(r=>r.condition==="B").every(r=>JSON.stringify(r.retrieval_context.channels)===JSON.stringify(["#helpdesk"])),"cell B is helpdesk-scoped");
    ck(records.filter(r=>r.condition==="C").every(r=>r.retrieval_context.channels===null),"cell C is unscoped");
    ck(records.some(r=>r.usage.reasoning_tokens>0),"reasoning tokens recorded (E10)");
    const blind=await Bun.file("eval/sim/fixtures/grader-fixture.blind.json").json();
    const idx=await Bun.file("eval/sim/fixtures/grader-fixture.index.json").json();
    ck(Array.isArray(blind)&&blind.length>0,"blind projection is a non-empty array");
    const bk=new Set(blind.flatMap(x=>Object.keys(x)));
    ck([...bk].sort().join(",")==="answer,fixture_index,question,truth","blind projection carries exactly fixture_index,question,answer,truth (got "+[...bk].sort().join(",")+")");
    const blob=JSON.stringify(blind);
    for(const s of ["\"condition\"","\"thread_id\"","\"record_id\"","\"answering_model\"","\"verdict\""]) ck(!blob.includes(s),"blind projection contains no "+s+" key");
    ck(blind.every(x=>x.answer&&x.answer.trim()&&x.truth&&x.truth.trim()),"every blind item has a non-empty answer and truth");
    ck(idx.length===blind.length,"F55: the index map covers every blind item ("+idx.length+" vs "+blind.length+")");
    ck(JSON.stringify(idx.map(x=>x.fixture_index).sort((a,b)=>a-b))===JSON.stringify(blind.map(x=>x.fixture_index).sort((a,b)=>a-b)),"index and blind file share one fixture_index set");
    const rid=new Set(records.map(r=>r.record_id));
    ck(idx.every(x=>rid.has(x.record_id)),"every mapped record_id exists in the run file");
    ck(new Set(idx.map(x=>x.record_id)).size===idx.length,"the map is injective");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0, run with `FIXTURE_RUN_ID` set to the id Task 4
printed. Three assertions carry the weight: **60 distinct threads** is the F58
independence property the whole OC now rests on; the blind key-set is what
protects Task 5 from anchoring; and the index-map pair is F55's join, asserted
in both directions so a partial map cannot pass.

### Task 5 -- Claude's blind hand-grade · `agent (session-tier, high)`

**Goal:** a committed reference produced without sight of the thing it measures.

**Files:** `eval/sim/fixtures/grader-fixture.claude.json` (new, committed).

**Dispatch constraint, normative:** the agent is handed
`grader-fixture.blind.json` and **must not open**
`eval/sim/records/<fixture_run_id>.jsonl`,
`eval/sim/fixtures/grader-fixture.index.json`, `sample-keys.json`, or anything
else carrying a DeepSeek verdict or a thread identity. The blind projection makes
that mechanical -- it is the only file with the answers in it -- but the index
map now exists (F55) and would de-anonymise the fixture, so it is named
explicitly.

**Steps:**
1. Grade all items in `fixture_index` order under the verdict rubric in this
   doc, using **no tools**: the reference must be blind and toolless in the same
   way the subject is, or the two are not measuring the same task.
2. Independently, set `divergent` under the screener's standard -- would a human
   be right to spend time on this answer as a possible better-or-newer fix?
   Claude MAY use its own knowledge for that half, matching the screener's rule.
   This is the reference for the screener's reported precision and recall.
3. Write `{fixture_index, verdict, divergent, note}` per item; `note` is one line
   naming the specific thing compared. A non-empty `note` on every item is the
   mechanical evidence the pass was done item by item, the role `reviewer_fix`
   plays in Phase 3.
4. Commit **before** reading any DeepSeek output.
5. Print the verdict composition and stop if any floor is missed -- `match >= 12`,
   `miss >= 12`, `partial >= 8`. That is INCONCLUSIVE and its remedy is the
   extension in "The gate", not a re-grade.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const blind=await Bun.file("eval/sim/fixtures/grader-fixture.blind.json").json();
    const cl=await Bun.file("eval/sim/fixtures/grader-fixture.claude.json").json();
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    ck(cl.length===blind.length&&cl.length>0,"one Claude verdict per blind item ("+cl.length+" vs "+blind.length+")");
    ck(JSON.stringify(cl.map(x=>x.fixture_index).sort((a,b)=>a-b))===JSON.stringify(blind.map(x=>x.fixture_index).sort((a,b)=>a-b)),"fixture_index sets match exactly");
    ck(cl.every(x=>["match","partial","miss"].includes(x.verdict)),"every verdict is in the D6 union");
    ck(cl.every(x=>typeof x.divergent==="boolean"),"every divergent is a boolean");
    ck(cl.every(x=>typeof x.note==="string"&&x.note.trim().length>0),"every item carries a non-empty note -- the item-by-item pass happened");
    const c={match:0,partial:0,miss:0}; for(const x of cl) c[x.verdict]++;
    console.log("composition match="+c.match+" partial="+c.partial+" miss="+c.miss+" divergent="+cl.filter(x=>x.divergent).length);
    ck(c.match>=12,"floor: Claude match class >= 12 (got "+c.match+")");
    ck(c.miss>=12,"floor: Claude miss class >= 12 (got "+c.miss+")");
    ck(c.partial>=8,"floor: Claude partial class >= 8 (got "+c.partial+") -- below this the match/partial boundary is untested");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. A floor FAIL is INCONCLUSIVE, not BLOCK:
extend the fixture per F65 and re-run Tasks 4-7 **for the new threads only**. Do
not re-grade to reach a floor.

### Task 6 -- `run-grading.ts`, the screener pass, and both verdict reps · `agent (workhorse, high)`

**Goal:** records move from `answered` to `graded` by spreading, the review pile
exists as a keyed sidecar, and the grader's own reproducibility is measured.

**Files:** `eval/sim/run-grading.ts` (new), `eval/sim/probe-graded-delta.ts`
(new); appends to `eval/sim/records/<fixture_run_id>.jsonl` and writes
`eval/sim/records/<fixture_run_id>.divergent.jsonl`.

**CLI contract** (Phases 5 and 6 drive this same file):

    bun eval/sim/run-grading.ts --run-id <id> [--conc N] [--limit N] [--rep2 <path>]

`--run-id` is required -- no default and no ULID minting, because grading the
wrong run file is silent and unrecoverable. `--conc` defaults to 6. `--rep2
<path>` runs a second independent **verdict** pass and writes
`{record_id, verdict}` to that JSON path **without touching the run file**,
which is what makes G5 measurable without polluting last-line-wins
reconstruction or the `(record_id, stage)` resume key.

**Steps:**
1. `readRecords(runId)`; keep records with `stage === 'answered'` and
   `error === null`; skip anything already `graded` via `completedKeys`, so
   grading resumes exactly like answering (E9). **Never grade an errored
   record** -- Phase 2 excludes those from every rate.
2. Per record: `gradeOne(toGradingInput(rec))` through one `runGently` call.
   Never build the grading payload by hand -- `toGradingInput` is the E8 carrier
   and Task 3's probe pins it.
3. **Screener pass, on non-`match` verdicts only.** `screenOne(toGradingInput(rec))`
   through a second `runGently` call. Append one line per screened record to
   `<run_id>.divergent.jsonl`: `{record_id, worth_review, alt_fix, why, usage,
   screened_at}`. Records whose verdict is `match` are not screened and keep
   `divergent: false`, which is correct by the screener's own condition 1 -- an
   answer containing the recorded fix is not an alternative to it.
4. Build the graded line by **spreading** (Phase 1 append rule 3, F50):

       const graded = { ...rec, stage: 'graded' as const, grade, divergent, grade_usage };

   with `grade = { verdict, by: 'deepseek', spot_checked: false, rationale, graded_at }`,
   `divergent` from the screener (`false` when it did not run), and
   `grade_usage` = the **verdict** call's `Usage` only (F71 -- the screener's
   usage lives in the sidecar; `grade_usage` keeps the meaning F49 gave it).
   Never reconstruct the object field by field: deep equality on
   `retrieval_context`, `tool_calls` and `usage` makes a re-keyed rebuild
   compare unequal and produces a false-positive delta that blocks a legitimate
   write.
5. Before appending, run `validateGradedDelta(rec, graded)` and **throw on a
   non-empty result**. `appendRecord` validates shape, not delta; this is the
   only place the invariant is enforced at write time.
6. Run the verdict pass, then the screener pass, then
   `--rep2 eval/sim/fixtures/grader-fixture.rep2.json`.
7. Record `query_log` and `embedding_api_log` counts immediately before and
   after **the grading step only** (not Task 4's answering, which legitimately
   writes rows). Both deltas must be **zero**: the grader and the screener touch
   no database and call no tool, so E3's telemetry carve-out does not apply to
   them, and a non-zero delta means something reached a handle it should not
   have. Print both.
8. Print `formatSpend` separately for verdict calls, screener calls and rep-2
   calls, plus a combined total (E10).
9. Write `probe-graded-delta.ts`: reconstruct the run file, and for every
   `record_id` find its last `answered` and last `graded` line, run
   `validateGradedDelta`, and assert an empty result plus a non-emptiness floor
   on the pair count. It also asserts at least one pair actually moved
   `grade_usage` off `null`, so a grader that skipped the accounting field
   cannot pass.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-graded-delta.ts "$FIXTURE_RUN_ID"

Expect a `PASS` line per assertion, a printed `PAIRS <n>` equal to the number of
answered records in the run, and exit 0.

### Task 7 -- Compute the gate, commit the fixture, surface to the operator · `agent (session-tier, high)`

**Goal:** five sub-gates computed from raw items, the confusion matrix
committed, and the disagreements the operator should actually look at.

**Files:** `eval/sim/grader-fixture.json` (new, committed).

**Steps:**
1. Join through `grader-fixture.index.json` (F55): `fixture_index -> record_id`,
   then `record_id -> {graded line, rep-2 entry, screener sidecar line}`, then
   `fixture_index -> Claude's verdict`. Assert all four sources cover the same
   `fixture_index` set. **No positional arithmetic anywhere.**
2. Compute G1-G5 **from the items, never from a recorded summary** -- F32's
   lesson: a figure re-worded rather than re-derived reached a ratified document
   and was caught only when somebody recomputed.
3. Evaluate Claude's three composition floors first. Any miss is `INCONCLUSIVE`,
   recorded with which floor and by how much, and the phase stops for the
   extension. Then evaluate F57's BLOCK condition: Claude's `match` class at or
   above floor while DeepSeek's is below 12 is a **BLOCK**, recorded as
   `blocked_on: "systematic_demotion"`, with G3 written as
   `n/a (BLOCK on demotion)` rather than a ratio over a handful of items.
4. Build the 3x3 confusion matrix (Claude rows x DeepSeek columns, order
   `match`, `partial`, `miss`). It is what shows *which* boundary the
   disagreements sit on, which the five scalars cannot.
5. Record the reported-not-gated numbers: screener precision and recall against
   Claude's `divergent` (with the F41-shaped note that neither is certifiable at
   this class size), screener run-to-run stability if a second screener pass was
   taken, per-era and per-cell disagreement counts, per-era screener rates, and
   the `leakage` block. Each carries a one-line note that it is **uncertified**
   -- at n=60 a defect confined to any stratum under ~12 items is invisible (S4).
6. Write `grader-fixture.json` with `schema_version: 'eval-grader-fixture-v1'`,
   `manifest_sha256` (binding it to Phase 3's frozen manifest, as
   `sample-keys.json` does), `grade_prompt_sha256`, `screen_prompt_sha256`,
   `model`, `fixture_run_id`, `seed`, the 60 thread ids, the era spread, all
   items with Claude/rep1/rep2/screener outputs, `composition`, `gate`,
   `leakage`, `telemetry`, `accounting` (E10: the five token fields plus
   `cost_usd`, broken out by call type), and a `revisions` array.
7. **Surface five items to the operator in chat**, drawn so the sample is
   neither the grader's nor Claude's own selection: at least 2 drawn
   seed-deterministically from all items regardless of agreement
   (`sha256(seed + ":gradeop:" + fixture_index)`, lowest first), then
   disagreements preferring the match class, **then topped up from the seeded
   order when the disagreement pool is short** -- F68: on a clean gate there may
   be too few disagreements to fill five, and the draft's rule was
   unsatisfiable exactly when the gate passed most convincingly. Record
   dispositions in `gate.operator_read` with `drawn_as` in
   `seeded | disagreement | topup`.
8. On BLOCK: revise the prompt, re-run Task 6 over the same answers (no
   re-answering spend), re-run Task 7. **Claude's verdicts are NOT re-done** --
   they were produced blind against the answers, not against a rubric version,
   and re-doing them after seeing a BLOCK is the anchoring F36 warns about.
   Record each revision with its digest in `revisions`; a gate passed on the
   fourth rubric is a different object from one passed on the first, and Phase 5
   should be able to see that.

**Verification probe:** phase-boundary probe 4 below is this task's probe.

## Phase-boundary verification

**Provenance, stated precisely (F66).** Probe 6's SQL was executed verbatim at
drafting time against the twin, **substituting the main checkout's `.env` path**,
because `/home/dev/projects/quakeworld-eval/apps/qw-oracle/.env` does not exist
until Phase 1 Task 1 creates the symlink -- which it does before this phase
runs, so the literal below is correct at execution time and was correct in
substance at drafting time. Its quoted results are character-exact. Probes 1-5
and 7 exercise code that does not exist and **were not run**; they are stated
with their exact expected stdout and exit status. The grading behaviour reported
above was measured by scratch probes against the live DeepSeek API, itemised
under "Probes run".

**1. Typecheck.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK

Expect `APP_TYPECHECK_OK` -- YES/NO.

**2. Both prompts pinned and provider-legal.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const gp=await import("./eval/sim/grade-prompt.ts");
    const f=await Bun.file("eval/sim/grader-fixture.json").json();
    const fill={question:"<Q>",answer:"<A>",truth:"<T>"}; const fails=[];
    const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    for(const [n,tpl,rec] of [["grade",gp.GRADE_PROMPT_TEMPLATE,f.grade_prompt_sha256],["screen",gp.SCREEN_PROMPT_TEMPLATE,f.screen_prompt_sha256]]){
      const p=tpl(fill); const h=new Bun.CryptoHasher("sha256"); h.update(p); const d=h.digest("hex");
      ck(p.length>500,"floor: "+n+" prompt non-trivial ("+p.length+")");
      ck(p.includes("json"),"E15 rule 1: literal lowercase json in "+n);
      ck(d===rec,"the fixture was produced under THIS "+n+" prompt (fixture "+String(rec).slice(0,12)+", live "+d.slice(0,12)+")");
    }
    ck(!/divergent/i.test(gp.GRADE_PROMPT_TEMPLATE(fill)),"F51/F70: the verdict prompt still carries no divergent block");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0 -- YES/NO. The digest comparison is what stops a
post-hoc prompt edit from silently orphaning the gate that certified it.

**3. E8 blindness.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-grader-blind.ts

Expect every line `PASS`, exit 0 -- YES/NO. Six sentinel-absence assertions
against **both** templates plus three presence assertions, so an empty template
cannot pass.

**4. The gate, recomputed from raw items.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const f=await Bun.file("eval/sim/grader-fixture.json").json();
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const it=f.items||[];
    ck(it.length>=60,"floor: at least 60 fixture items (got "+it.length+")");
    ck(new Set(it.map(x=>x.thread_id)).size===it.length,"F58: every item is a DISTINCT thread -- the independence the OC assumes");
    ck(it.every(x=>x.claude&&x.deepseek_rep1&&x.deepseek_rep2),"every item carries all three verdicts");
    const V=["match","partial","miss"];
    ck(it.every(x=>V.includes(x.claude.verdict)&&V.includes(x.deepseek_rep1.verdict)&&V.includes(x.deepseek_rep2.verdict)),"every verdict is in the D6 union");
    const n=it.length;
    const cc={match:0,partial:0,miss:0}, dc={match:0,partial:0,miss:0};
    for(const x of it){cc[x.claude.verdict]++; dc[x.deepseek_rep1.verdict]++;}
    ck(cc.match>=12&&cc.miss>=12&&cc.partial>=8,"Claude composition floors met (m="+cc.match+" p="+cc.partial+" s="+cc.miss+")");
    ck(!(cc.match>=12&&dc.match<12),"F57: Claude at floor while DeepSeek match class is "+dc.match+" would be a BLOCK on systematic demotion");
    const g1=it.filter(x=>x.claude.verdict===x.deepseek_rep1.verdict).length/n;
    const cm=it.filter(x=>x.claude.verdict==="match"), dm=it.filter(x=>x.deepseek_rep1.verdict==="match");
    const g2=cm.filter(x=>x.deepseek_rep1.verdict==="match").length/cm.length;
    const g3=dm.filter(x=>x.claude.verdict==="match").length/dm.length;
    const scr=it.filter(x=>x.screener&&x.screener.worth_review);
    const g4=scr.length/n;
    const g5=it.filter(x=>x.deepseek_rep1.verdict===x.deepseek_rep2.verdict).length/n;
    console.log("G1="+g1.toFixed(3)+" G2="+g2.toFixed(3)+" G3="+g3.toFixed(3)+" G4rate="+g4.toFixed(3)+" G5="+g5.toFixed(3));
    ck(g1>=0.80,"G1 aggregate exact agreement >= 0.80");
    ck(g2>=0.80,"G2 match-recall >= 0.80");
    ck(g3>=0.80,"G3 match-precision >= 0.80");
    ck(g4<=0.75,"G4 screener rate <= 0.75 (ceiling on meaninglessness; the rate itself is REVIEW LOAD, not a bias -- it enters no denominator)");
    console.log("REVIEW_LOAD screener flagged "+scr.length+"/"+n+" = "+(100*g4).toFixed(0)+"% -- Phase 5 sizes the pile from this");
    ck(g5>=0.85,"G5 verdict self-consistency >= 0.85");
    ck(it.filter(x=>x.deepseek_rep1.verdict!=="match").every(x=>x.screener),"every non-match verdict was screened");
    ck(it.filter(x=>x.deepseek_rep1.verdict==="match").every(x=>!x.screener||!x.screener.worth_review),"no match-verdict item is flagged divergent");
    ck(f.gate&&f.gate.outcome==="PASS","recorded outcome is PASS");
    ck(Math.abs((f.gate.g1_aggregate||{}).rate-g1)<1e-9,"the recorded G1 equals the recomputed G1 -- the summary was derived, not typed");
    ck(typeof (f.gate.screener||{}).precision_vs_claude==="number"&&typeof (f.gate.screener||{}).recall_vs_claude==="number","screener precision and recall are RECORDED (reported, not gated)");
    ck((f.gate.operator_read||[]).length>=5&&(f.gate.operator_read||[]).filter(o=>o.drawn_as==="seeded").length>=2,"5 operator dispositions, at least 2 drawn unconditionally");
    ck(f.accounting&&f.accounting.cost_usd>0&&f.accounting.reasoning_tokens>0,"E10: positive dollar total and non-zero reasoning tokens");
    process.exit(fails.length?1:0);'

Expect the `G1=...` line, every assertion `PASS`, exit 0 -- YES/NO. This probe
recomputes all five gates from `items` and compares one against the recorded
summary, so a hand-typed `gate` block cannot pass. The distinct-thread assertion
is the F58 property; the two screener assertions prove the pass ran where it
should and nowhere else.

**5. The graded lines are spread copies.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-graded-delta.ts "$FIXTURE_RUN_ID"

Expect a `PASS` line per assertion, `PAIRS <n>` equal to the answered-record
count, exit 0 -- YES/NO. Every `(answered, graded)` pair returns an empty
`validateGradedDelta`, at least one pair moved `grade_usage` off `null`, and a
non-emptiness floor on the pair count stops an empty run file from passing.

**6. The corpus has not moved under the fixture** (E4 / F3):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;"
    psql "$DATABASE_URL" -Atc "SELECT date_part('year', date_range_start)::int AS era, count(*) FROM chat_threads WHERE channel_name='#helpdesk' AND resolution_status='solved' GROUP BY 1 ORDER BY 1;"

Expect `40219` and the era histogram -- YES/NO. Observed 2026-08-06 (main
checkout's `.env`, see the provenance note): `2020|389 2021|768 2022|575
2023|649 2024|557 2025|487 2026|269`. Those are whole-channel counts, **not** the
frozen frame's pool (F1/F2: 3,164 solved non-noise, zero in 2026); they are a
shape check on the instrument, not the pool. A `chat_threads` count other than
40,219 is an E4/F3 event and stops the arc, not just this phase.

**7. The grader touched no database.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM query_log;"
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const f=await Bun.file("eval/sim/grader-fixture.json").json(); const t=f.telemetry||{};
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    ck(typeof t.query_log_before==="number"&&typeof t.query_log_after==="number","telemetry block present");
    ck(t.query_log_before>0,"floor: the baseline count is non-zero, so the probe read a real table");
    ck(t.query_log_after===t.query_log_before,"E8/E3: zero query_log delta across grading (before "+t.query_log_before+", after "+t.query_log_after+")");
    ck(t.embedding_api_log_after===t.embedding_api_log_before,"zero embedding_api_log delta across grading");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0 -- YES/NO. The `> 0` floor matters: a
before/after pair of two zeros satisfies equality while proving the probe never
read anything. The live `psql` count is printed alongside so a reviewer can see
the recorded `after` is not stale.

## Outputs to next phase

Phases 5-9 may rely on exactly these:

- **`eval/sim/grade-prompt.ts`** -- `GRADE_PROMPT_TEMPLATE`,
  `SCREEN_PROMPT_TEMPLATE`, both digests, `GraderOutput`, `ScreenerOutput`.
  Two prompts with **opposite knowledge rules**: the verdict grader is
  knowledge-forbidden (E8), the screener is knowledge-required (F70). Harmonising
  them re-creates the F51 defect. Any change to either invalidates the outputs
  taken under it and requires a re-grade -- cheap, since grading does not
  re-answer.
- **`eval/sim/grader.ts`** -- `gradeOne(input)` and `screenOne(input)`. Both take
  a `GradingInput` and nothing else; neither takes options (F59); no overload may
  be added, because E8's blindness is carried by the parameter list.
- **`eval/sim/run-grading.ts`** -- `--run-id <id> [--conc N] [--limit N]
  [--rep2 <path>]`. **Phase 5's pilot and Phase 6's bulk grading drive this same
  file.** It skips `error !== null` records, resumes on `(record_id, stage)`,
  produces the graded line by spreading, enforces `validateGradedDelta` at write
  time, screens only non-`match` verdicts, and writes to no database.
- **`eval/sim/records/<run_id>.divergent.jsonl`** -- the review pile, keyed by
  `record_id`, one line per screened record with `alt_fix` and `why`. This is
  what D6 stage 4 works from. Gitignored (E13); the conclusions drawn from it
  are what get committed.
- **`eval/sim/question-specs.ts`** -- `sampleToQuestionSpecs()` (F45).
  `exclude_thread_id` is the thread's own id; that is D6's leave-one-out, and
  Phases 5 and 6 must use this loader rather than re-deriving it.
- **`eval/sim/grader-fixture.json`** plus the four committed fixture files. The
  items with all verdicts, the confusion matrix, the five sub-gate outcomes, the
  screener's reported precision/recall/stability, the era spread, `leakage`,
  `telemetry`, `accounting` and `revisions`.
- **`divergent` no longer excludes anything from anything.** A flagged record
  carries its bulk verdict into every rate and is *additionally* queued for
  review. **Phase 6 and Phase 8 must not filter on it**, and a verdict overturned
  at review is a dated correction to those records, never a silent exclusion.
  This is the D6 amendment Task 0 gates on; without it the flag would bias the
  A-vs-C delta toward the null through cell A, which produces confident
  wrong-direction specifics by construction.
- **The grader's measured self-consistency (G5).** Phase 6's post-bulk 5-10%
  re-grade has a **disagreement floor equal to this number, not zero**. A
  re-check at or below it is the expected result; above it is worth
  investigating. Nothing else in the arc measures this and Phase 6 cannot derive
  it from its own data.
- **The screener's measured rate, and the review pile it implies.** Measured
  44-67% on real unauthored triples at drafting time and re-measured at n=60 by
  Task 7. On the bulk run that is roughly **363-429 items** to review at the
  measured rate, so **the pile ships ranked and is worked in rank order, not
  exhaustively**; `why` is the ranking material. It is a **cost**, not a bias --
  that is what decoupling bought, and it is the number Phase 5 sizes from.
- **What is certified, and what is not.** The gate certifies aggregate agreement
  with Claude and, specifically, behaviour on the `match` class in both
  directions, within the OC above. It certifies **nothing per era, per domain,
  per cell, or per answer-length band** (S4), and **nothing about the screener's
  precision or recall** (the class is too small at any feasible size). Phase 8
  must not read a per-era or per-cell grading difference as an oracle property
  without a targeted re-check.
- **The measured E8 prose residue** (`leakage`) -- the only number in the arc
  bounding what field-level blindness leaves open.
- **What this phase does NOT ship:** no pilot and no pilot slice
  (`TBD(phase-5: pilot slice composition and the D6 >=90% match/miss
  arithmetic)`); no explorer generator or Runs tab (Phase 5, per F11); no bulk
  grading run and no headline; no Claude-side answering; no re-derivation of key
  quality -- Phase 3's spot-read is the only thing certifying `truth`, and F41's
  per-domain limit stands. Whether Phase 8 reports per-era match rates at all is
  `TBD(phase-8: per-era reporting under an aggregate-only grader
  certification)`.

## Open questions

1. **Fixture shape: 60 threads x 1 cell.** Not open -- **ruled**, on measurement
   (F58). It is strictly dominant over 20 x 3 at identical spend: false-BLOCK
   0.5% vs 8.9% at r=0.95 and 8.7% vs 30.8% at r=0.90, with detection 98.8% vs
   96.4%. Recorded here rather than deleted so the alternative is not
   re-proposed. Overrule: operator.
2. **Single verdict call vs majority-of-3.** Default: **single**, with G5
   measuring the noise. D6 stage 3 specifies one compare-grading call and
   changing the instrument is an E1 spec matter. Majority-of-3 would raise
   effective consistency at 3x a cost that is a rounding error at ~1,500
   records, and it is the prescribed escalation **if G5 fails** -- but adopting
   it pre-emptively means the pilot and bulk run measure with a different
   instrument than D6 describes, with no record of what the single-call grader
   did. Overrule: operator, or a G5 failure.
3. **Claude as the reference.** Default: **yes**, blind and toolless for the
   verdict, knowledge-permitted for the divergence judgment -- matching each
   subject's own rule. Residual risk, stated: a systematically lenient Claude and
   a systematically lenient DeepSeek would agree, and the gate would read clean.
   The 2 unconditional operator draws are the only instrument against that, and
   at n=2 they are a tripwire, not a check. Overrule: operator, by reading more.
4. **G1's threshold at 80%.** Default: 80%, tolerating 12 of 60. Deliberately
   loose because G1 is a gross-breakage floor and the detection lives in G2/G3;
   tightening to 85% would raise the r=0.90 false-BLOCK materially while adding
   almost nothing against S1. Overrule: operator.
5. **G4 as a ceiling rather than a precision gate, at 75%.** Default: ceiling
   75%, precision and recall reported not gated, pile ranked. It follows from
   the decoupling -- once the flag enters no denominator, over-firing costs
   review time rather than distorting a number -- and from the measurement: the
   screener ran at 44-67% on real unauthored triples, so any cap under that
   BLOCKs a working instrument, and the recall table shows a recall gate is
   uninformative at every plausible class size. **The honest cost is large and
   should be read as such**: a screener at the measured rate hands Phase 5 a
   pile of 363-429 items on the bulk run, which is why ranking is a requirement
   rather than a nicety. Overrule: operator -- lowering the ceiling trades
   review load against false BLOCKs on a screener the measurement says is
   behaving, and the numbers to trade with are in the OC section.
6. **F71 -- screener usage outside `grade_usage`.** Default: sidecar plus run
   summary. Folding it into `grade_usage` would make Phase 1's per-record
   compare-grading cost wrong and non-comparable across records, which is the
   exact property F49 was raised to protect. Overrule: operator, via a Phase 1
   amendment -- not a Phase 4 decision.

*(The draft's Open question 6, on F44's remedy, is CLOSED: Phase 1 shipped the
widened set. F54.)*

## Recovery

- **Task 0 halts on the D6 amendment.** The spec still says "instead of bulk
  verdict". Do not proceed and do not reinterpret (E1) -- the decoupling is what
  the whole divergent design rests on. Route the amendment, then re-run Task 0.
- **Task 0's `LANDED` assertions fail.** Phase 1 shipped a different mutable set
  than its doc describes. Read `MUTABLE_ON_GRADE` and `validateGradedDelta`
  before touching anything, and re-derive rather than re-word (F32).
- **`chatJson` throws "prompt must contain the word json" locally.** A prompt
  lost its literal lowercase `json`. E15 rule 1 and F38 working as designed -- a
  local throw before any spend. Restore the word; do not disable the assertion
  and do not switch off `response_format`.
- **`chatJson` throws on `finish_reason === 'length'`.** F73: measured on real
  corpus triples, 2048 truncates on both key extraction and grading where short
  synthetic triples averaged 489 completion tokens. If it fires at
  `MAX_OUTPUT_TOKENS` (16,384), the inputs are far longer than the fixture's or
  the model changed -- E15 rule 3 forbids accepting the truncated value either
  way.
- **`validateGradedDelta` returns a non-empty list at write time.** Two causes,
  and they need opposite fixes. If it names `answer`/`tool_calls`/`usage`, the
  line was built as a delta rather than a spread copy -- rebuild it as
  `{...rec, ...}` (Task 6 step 4). If it names a **nested** field whose content
  looks identical, that is F50: the object was reconstructed field by field and
  the key order differs. Spread; do not relax the check.
- **The gate comes out INCONCLUSIVE.** A Claude composition floor was missed.
  Extend by 12 threads under the **same `run_id`** so `completedKeys` skips the
  existing 60 (F65 -- a fresh run id re-answers everything), grade only the new
  ones, and append Claude's verdicts for only the new ones. Cap 96 threads. Do
  not re-grade to reach a floor and do not drop a floor: an under-composed
  fixture certifies the easy boundary, which is the trap the gate is built
  around.
- **The gate BLOCKs on `blocked_on: "systematic_demotion"` (F57).** Claude's
  match class is at floor and DeepSeek's is below 12. That is S1 at high
  amplitude. It is a BLOCK and never an extension -- extending would spend more
  money confirming a defect already visible.
- **The gate BLOCKs otherwise.** Read G5 first. If self-consistency is below its
  floor the grader is noisy, not biased, and rewriting the rubric will not move
  G1-G3 -- escalate to Open question 2. If G5 is healthy, read the confusion
  matrix: a `match -> partial` concentration is S1 and the rubric's `match`
  definition is where to look; a `match -> miss` concentration more likely means
  thin keys (F41), a Phase 3 property this phase cannot fix and must not paper
  over by loosening the `match` definition. Re-run Task 6 only.
- **The gate BLOCKs a third time.** Stop and take it to the operator with the
  three confusion matrices side by side. Three revisions against 60 items is
  enough attempts to start fitting the fixture rather than fixing the rubric,
  and `revisions[]` exists so that is visible.
- **The screener rate comes in high.** Expect 40-70%: that is what it measured
  on real unauthored triples, and it is review load rather than a defect. Do not
  tighten the verdict prompt -- they are separate prompts now and the verdict
  grader is not the cause. Read a sample of `alt_fix` and `why`: if `why` merely
  restates the answer's own advice, the screener has drifted back toward F51 and
  its knowledge-permitting sentence is the first thing to check; if `why`
  carries a real engine judgment ("that cvar does not exist"), the screener is
  working and the pile needs ranking, not a rubric change. Only a rate above the
  75% ceiling is a BLOCK, and it means the flag has stopped discriminating.
- **A non-zero `query_log` delta across the grading step.** Something in the
  grading or screening path reached a database handle. Check `grader.ts`'s
  import graph first (Task 3's grep should have caught it), then whether
  `run-grading.ts` imported a tool module for a "quick check". This is an E8
  violation, it blocks the phase, and it is not fixable by subtracting rows --
  the concern is not the rows, it is that the grader had a handle at all.
- **`ctxFor` throws on an exclusion id during the fixture answering.** A
  non-decimal `thread_id` reached `question-specs.ts`. Phase 2 measured that
  `ARRAY['p8-01']::bigint[]` throws inside the retrieval SQL and, under Phase 1's
  F22 re-throw, would fail all 40 cell-B and cell-C passes identically -- reading
  as a harness collapse rather than one bad row. Task 1's loader throws first and
  names the row; if it did not, the loader was bypassed.
- **More than 6 of 60 fixture answers failed.** Do not grade the survivors. A
  cell that fails more often has its rate computed over a survivor subset (E7
  amendment channel 3), and a fixture certifying a grader on a biased subset is
  worse than no fixture. Investigate the per-cell failure counts Task 4 printed.
- **Task 5's agent reports having read the index map or the run file.** The blind
  grade is void. Discard `grader-fixture.claude.json`, re-dispatch with a fresh
  agent, and note it in `revisions` -- an anchored reference is worse than none,
  because the gate would then certify agreement between two views of the same
  text.

---

## Probes run for this revision, and what was reasoned rather than run

**Run, read-only against the twin (2026-08-06):** the `#helpdesk` solved era
histogram in phase-boundary probe 6 (`2020|389 2021|768 2022|575 2023|649
2024|557 2025|487 2026|269`), the `query_log` (215) and `embedding_api_log`
(2,029) counts, the `chat_threads` schema, and the deterministic 40-thread draw
used by the measurement above. All used the main checkout's `.env` path, which
Phase 1 Task 1 makes identical to the worktree's before this phase runs (F66).

**Run, read-only against the worktree:** `jq '.include'` on
`apps/qw-oracle/tsconfig.json` (seven patterns, none `eval/sim/**/*`) and
`ls apps/qw-oracle/eval/` (no `sim/`), confirming this phase's inputs are still
Phase 1's to create. `git log` on the arc scaffold, confirming Phase 1's F44/F49
revisions landed (F54) -- which is how the draft's Task 1 was found to be dead
work rather than by reading the checker's summary.

**Run against the live DeepSeek API** (`deepseek-v4-flash`, `temperature: 0`,
`response_format: json_object`): the unauthored-triple measurement described
above, plus a single controlled diagnostic isolating a truncation.

**F73 -- the draft's `max_tokens: 2048` is too small, and something about the
key-extraction prompt is unexplained.** Two separate observations, kept separate
because only one of them is understood:
- **Solid:** at 2048 both a grading call and key extraction returned
  `finish_reason = 'length'` on real corpus triples, where 10 short synthetic
  triples had averaged 489 completion tokens. The draft's budget was set from
  the synthetic average. Fixed by using Phase 2's pinned `MAX_OUTPUT_TOKENS`
  (16,384) rather than a local constant -- Task 3 step 3.
- **Unexplained, and deliberately not escalated:** in the scratch harness, 20 of
  40 key extractions still hit `length` at **16,384**. A single controlled
  diagnostic on one of those exact threads (id 16774, 943 chars of content)
  completed cleanly at `finish_reason = 'stop'` with **577 completion tokens, of
  which 511 were reasoning** -- so the thread content is not the cause and the
  harness's own prompt assembly is the likelier one. **This doc therefore makes
  no claim that Phase 3's key extraction is at risk**, and states the
  observation only so a Phase 3 executor watching its own `extraction_failed`
  rate has seen it before. Escalating an unreproduced 50% failure rate into a
  cross-phase defect claim is exactly the inference-without-verification this
  repo keeps getting caught by.

**Spend for this revision:** approximately 210 `deepseek-v4-flash` calls across
the measurement runs and the diagnostic (the largest run alone made 40 key
extractions, 17 answers and 45 grading calls). On the Phase 2 checker's measured
rate of ~$0.011 per ~35 calls that is **approximately $0.07**, extrapolated
rather than measured -- no pricing table exists in the repo yet
(`pricing.ts` is Phase 2's). Cumulative for this phase's drafting and revision:
~260 calls, ~$0.08.

**Computed, not run:** every operating-characteristic figure. The exact joint
`P(G1 & G2)` is computed by conditioning on the match class rather than by
multiplying, per F63; `P(G3)` given the match class is folded in as conditionally
independent, and **that single step is an approximation, named here rather than
buried**. The clustered figures in the F58 table model a bad thread as
disagreeing in all three of its cells, which is the worst case and therefore an
upper bound on the harm -- the true clustering is somewhere between that and
independence, and the ruling does not depend on where, because 60 x 1 is
dominant at both ends.

**Not run, and stated so:** phase-boundary probes 1-5 and 7 exercise code that
does not exist. The 9 measured triples are real corpus data but a small sample;
the screener rate they give is directional, and Task 7 measures it at n = 60
against Claude's own judgment. Where this doc says "measured", it means one of
the runs above; where it says "computed", it means the binomial arithmetic;
there is no third category.
