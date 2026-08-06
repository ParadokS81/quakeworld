# Phase 4 -- the grader

**Arc:** oracle-eval-simulation. **Ledger:** `decisions.md` -- this phase
implements E8 (blind, toolless grader) and E2's graded-delta invariant, and
consumes E1, E3, E5, E9, E10, E12, E13, E14, E15 unchanged. **Spec:**
`docs/superpowers/specs/2026-08-06-oracle-eval-simulation-design.md` D6 (the
whole of it) plus D3's `grade` field and the 2026-08-06 D4/D5 amendments.
**Findings consumed:** F2, F9, F10, F16, F23, F25, F30, F32, F35, F36, F38,
F41. **Findings raised here:** F44-F48. **Lane:** worktree
`/home/dev/projects/quakeworld-eval`, branch `eval-oracle-sim`.

## Goal

Build the grading machinery D6 stage 3 describes -- a byte-pinned rubric
implementing `match | partial | miss` plus the `divergent` flag, and a
compare-grader that sees `{question, answer, truth}` and nothing else (E8) --
and then measure whether it works before Phase 5's pilot is allowed to depend on
it. Nothing else: this phase answers no headline question, samples nothing, and
is not the pilot. The measurement is an agreement gate against a Claude
hand-graded fixture of 60 triples (20 threads drawn seed-deterministically from
Phase 3's effective sample, answered in all three cells by Phase 2's shipped
`runAnsweringPass`), whose operating characteristic is computed below rather
than asserted. The phase ends with `eval/sim/run-grading.ts` able to grade a run
file in place -- appending a `stage: 'graded'` byte-copy delta line per record
-- with `eval/sim/grader-fixture.json` committed carrying the confusion matrix,
the five sub-gate outcomes, the grader's measured self-consistency, and the
dollar total; and with a zero telemetry delta across the grading step proving
the grader touched no database.

## Inputs from previous phases

Verifiable claims, each traced to the landed doc that promises it. Task 0
re-probes every one before anything is built, because a landed doc is a promise
and not an observation.

**From Phase 1** (`phase-1-eval-surface-contract.md`, "Outputs to next phase"):

- `RunRecord` in `apps/qw-oracle/eval/sim/run-record.ts`, with `grade: Grade |
  null`, `stage: 'answered' | 'graded'`, `divergent: boolean` at the TOP level
  (not inside `Grade`), and `Verdict = 'match' | 'partial' | 'miss'` -- never
  the faq-gate vocabulary (F10).
- `validateRunRecord(value: unknown)` and
  `validateGradedDelta(answered, graded): string[]`, the latter returning the
  fields that differ **outside `{grade, stage}`**. That set is wrong by exactly
  one field for this phase; see F44 below -- it is the first thing this phase
  fixes and the reason Task 1 exists.
- `toGradingInput(r: RunRecord): { question, answer, truth }` -- three fields,
  no `condition`, no `retrieval_context`, no `tool_calls`, no
  `answering_model`, no `domain`. This is the E8 carrier and Phase 4's grader
  takes it as its ONLY input, so blindness is structural rather than
  disciplinary.
- Append rules: the graded line is a **byte-copy** of the answered line with
  only the permitted fields changed; reconstruction is last-line-wins per
  `record_id`; resume keys on `(record_id, stage)`; records live one file per
  run at `eval/sim/records/<run_id>.jsonl`, gitignored (E13).
- `eval/sim/telemetry-baseline.json` -- pre-arc `query_log` /
  `embedding_api_log` / `oracle_meta` / `chat_threads` counts.
- Phase 1 adds `eval/sim/**/*` to `apps/qw-oracle/tsconfig.json`'s `include`.
  Confirmed absent today: `jq '.include' apps/qw-oracle/tsconfig.json` lists
  seven patterns and none of them is `eval/sim/**/*`, and `apps/qw-oracle/eval/`
  today holds only `README.md`, `calibrate.ts`, `calibration-queries.json`,
  `eval-queries.json`, `eval.test.ts`, `eval.ts`, `sim-explorer.html`. Both
  checked read-only in the worktree at drafting time.

**From Phase 2** (`phase-2-answering-skeleton.md`, "Outputs to next phase"):

- `eval/sim/deepseek-client.ts` -- this phase uses `chatJson`, `runGently`,
  `emptyUsage`, `addUsage`, `formatSpend`, `DEEPSEEK_MODEL`, and the `Usage`
  re-export. It writes no second client (E15) and no second pricing table
  (E10); `chatJson` already returns `usage.cost_usd` filled.
- `chatJson` enforces E15's three provider rules locally: the literal word
  "json" must appear in the prompt (F38 -- HTTP 400 otherwise, reproduced
  twice), `max_tokens >= 512`, and `finish_reason === 'length'` throws. The
  rubric in this doc contains the lowercase word "json" twice, and Task 3's
  probe asserts it rather than trusting the reading.
- `eval/sim/jsonl-store.ts` -- `recordsPath`, `appendRecord` (validates before
  writing), `readRecords` (last-line-wins, tolerates one truncated tail line),
  `completedKeys` (keys on `(record_id, stage)`, treats an errored record as
  incomplete), `failureCount`.
- `eval/sim/run-answering.ts` -- `QuestionSpec` (seven fields, with
  `exclude_thread_id: string | null` kept distinct from `thread_id` because it
  is interpolated into `::bigint[]`), `runAnsweringPass(runId, q, cell, opts?)`,
  `loadPhase8Fixture`, and the CLI. **The loader that turns Phase 3's manifest
  into `QuestionSpec[]` is explicitly a `TBD` in Phase 2's doc and is not
  claimed by Phase 3 either** -- see F45; this phase builds it.
- `eval/sim/cells.ts` -- `ANSWERING_MODEL`, `TEMPERATURE = 0`,
  `MAX_TOOL_ROUNDS = 4`, `PINNED_LIMIT = 3`, `PINNED_MAX_MESSAGES = 40`,
  `ctxFor` (throws on a non-decimal exclusion id), `LEAK_SENTINEL`
  `/DSML|invoke name=|\uFF5C\uFF5C/` -- quoted in its escaped form per F39,
  because the third alternative's real bytes are doubled U+FF5C FULLWIDTH
  VERTICAL LINE and an ASCII-only transcription silently drops them.
- A record with `error !== null` is excluded from every rate. This phase never
  grades one.
- Phase 2's Task 7 prints `formatSpend` over a 36-pass smoke run. **That
  measured figure is what Task 5's 60-pass budget is quoted against**; this doc
  does not guess a cost-per-answering-pass.

**From Phase 3** (`phase-3-sample-and-keys.md`, "Outputs to next phase"):

- `loadEffectiveSample(): SampleThread[]` in `eval/sim/sample.ts` -- exactly 500
  threads, every one `#helpdesk`, non-empty `question` and `truth`, eras
  2020-2025, per-domain counts equal to the manifest allocation. Throws rather
  than degrading. No database access.
- `SampleThread` carries `thread_id`, `thread_key`, `domain`, `era`, `question`,
  `truth`, `key_quality`, `fix_tokens`, `content_sha256`, `channel_name`.
- `sample-manifest.json` (frozen, digest-bound) and `sample-keys.json` (keys,
  `rejected`, `substitutions`, the spot-read gate block, accounting).
- **The keys this phase grades against are certified in AGGREGATE only.** F41
  is a standing constraint: a systematic 15% `thin` rate passes Phase 3's gate
  ~20% of the time, and per-domain key quality is uncertified at every domain
  size. A `thin` key makes a correct specific answer read as `miss`, which
  biases every cell down and cell A least -- straight at the A-vs-C delta.
  Grader disagreement caused by a thin key is not a grader defect, and this
  phase's gate cannot tell the two apart. Stated here so Task 8 does not
  attribute a key defect to the rubric and rewrite a prompt that was fine.
- ~1.8% of pool threads have no extractable key and ~2.8% leak the fix into the
  question (F30); Phase 3 rejects and substitutes those, and
  `loadEffectiveSample()` is already the narrowed population. **This phase
  grades only the effective sample** and never reaches past it.

## The rubric (normative)

Lives in `apps/qw-oracle/eval/sim/grade-prompt.ts` as one exported const with
its sha256 recorded in `grader-fixture.json`, exactly as Phase 3 pins
`key-prompt.ts`. Changing a byte invalidates every verdict taken under it and
requires a re-grade; the gate's BLOCK path already prescribes that.

### The three verdicts

Spec D6's scale, transcribed with the operational edges that decide real cases:

- **`match`** -- the answer contains the specific fix that resolved the thread:
  the same cvar/setting *and its value*, the same file, the same download, or
  the same named procedure. Correct extra material around the fix does not
  demote it. Extra material that would send the player somewhere else *instead*
  does demote it to `partial`.
- **`partial`** -- right neighbourhood, incomplete or imprecise: the right
  subsystem but not the setting, the right cvar without the value that
  mattered, the right procedure missing the step that mattered.
- **`miss`** -- wrong direction, generic non-help ("check your settings", "ask
  on Discord"), or a decline to answer.

The `match`/`partial` edge is written out because it is the boundary the
headline is computed across; the `partial`/`miss` edge is written out because it
is where the grader's noise concentrates (measured below), even though moving it
does not move a match-rate headline.

### The `divergent` flag, and why the obvious wording does not work

D6 defines `divergent` as "differs from the thread's fix but looks plausibly
correct", routing to human review instead of a bulk verdict. It is how the spec
absorbs F2's era problem: the frozen frame holds zero 2026 threads and the eras
run 2020-2025, so every key is 1-6 years old and the oracle can be *currently*
right against a *dated* key.

**F47 (MAJOR) -- measured at drafting time (see "Probes run" for the exact
spend): the natural wording of that definition fires on half the fixture and is
useless.** A first draft phrased the trigger as prose ("set it when the answer
proposes a specific plausible fix that differs from the recorded fix ... leave
it false when the answer is merely vague or wrong") and, over 10 hand-built triples, flagged
**5 of 10** -- including a case whose answer contained the recorded fix
verbatim, and a case that was a plain wrong-direction `miss`. A flag that fires
on half of everything drains the disagreement pool into human review, which is
precisely the escape hatch this phase is supposed to close.

The wording that works replaces prose with three conditions and a falsifiability
requirement, and was clean across four independent runs:

```
Separately set "divergent". It has three conditions and ALL THREE must hold:
1. the ANSWER names a specific, actionable fix of its own (a cvar and value, a
   file, a download, a named procedure) -- not vague advice;
2. that fix is NOT the recorded fix and does not contain the recorded fix;
3. reading only the QUESTION, that fix looks like it could genuinely resolve
   the problem.
If the answer contains the recorded fix anywhere, divergent is false. If the
verdict is "miss" because the answer is generic, declines, or is simply wrong
about the problem, divergent is false. Divergence is not "the answer also
mentions other things". Most answers are NOT divergent -- expect fewer than one
in ten.
Write the alternative fix you found into "divergent_fix" as a short literal
phrase; if you cannot name one, divergent MUST be false and "divergent_fix"
MUST be the empty string.
```

Two things are doing the work and both are deliberate. Condition 2's "does not
contain the recorded fix" is a mechanical test the model can actually apply.
And `divergent_fix` makes the flag **falsifiable**: a model that cannot write
down the alternative it claims to have found has not found one. That is the same
move Phase 3 makes with `reviewer_fix` -- force the claim into text before the
verdict, so the verdict has something to be checked against.

Measured effect, same 10 triples, same model, four runs: divergent fired on
exactly the one intended case in 3 of 4 runs, and on that case plus one spurious
case in the fourth. 5-of-10 became 1-of-10.

`divergent` does NOT replace the verdict. A divergent answer is still graded
against the recorded fix and still lands in every denominator (G4 below makes
that mechanical). Routing to review is D6 stage 4's job and Phase 5's and Phase
6's to operate; this phase only produces the flag, the named alternative, and
the rate.

### The full prompt shape

```
You are grading one answer to a QuakeWorld player's help-channel question
against the fix that actually resolved the original thread. Reply with json
only.

QUESTION (what the player asked):
<question>

ANSWER (what an assistant replied):
<answer>

RECORDED FIX (what actually resolved the original thread; it may be several
years old):
<truth>

Decide how well the ANSWER delivers the RECORDED FIX.
- "match": ...
- "partial": ...
- "miss": ...

Grade only against the RECORDED FIX. Do not use your own knowledge of
QuakeWorld to decide what the correct fix is, and do not reward or punish the
answer for being more modern than the recorded fix.

<the divergent block above>

Reply with json only, no prose, no markdown fence:
{"verdict":"match"|"partial"|"miss","divergent":true|false,
 "divergent_fix":"<short phrase or empty string>",
 "rationale":"<one sentence, at most 200 characters, naming the specific thing
 you compared>"}
```

The "do not use your own knowledge" instruction is load-bearing under E8: the
grader has no tools by construction, so its only alternative source of truth is
its own priors, and a grader that silently substitutes them re-introduces
exactly the correlated-error problem E8 exists to prevent. The instruction does
not *enforce* that -- nothing at this layer can -- which is why `divergent` and
the review stage exist.

The literal lowercase word `json` appears twice, satisfying E15 rule 1
mechanically rather than by inspection.

### What blindness buys and what it does not

`gradeOne` takes a `GradingInput`, not a `RunRecord`. There is no parameter that
could carry the condition, the tool calls, the domain or the answering model,
so E8's requirement is met by the type rather than by a promise -- the same
argument Phase 1 makes for `RetrievalContext` being a separate positional
parameter.

E8's leakage-honesty amendment says field-level blindness is not total, because
a condition marker can survive inside the answer's own prose. **That is not
hypothetical and this phase measured it.** One drafting-probe triple carried the
answer "According to a #helpdesk thread from 2021, you want ..."; the grader
read it and graded correctly, with no sign it noticed the tell. So the residue
is real, and the honest response is to size it rather than to claim it away:
Task 5 counts how many of the 60 fixture answers contain a channel name
(`#helpdesk` / `#quakeworld` / `#dev-corner` / `#antilag`) or a bare four-digit
year in 2015-2026, records the count and up to five examples in
`grader-fixture.json.leakage`, and Phase 8 reports it. A cheap instrument for a
residue nobody else in the arc measures.

## The graded line, and the contract defect it exposes (F44)

E2's MAJOR-3 amendment and Phase 1's append rule 2 are unambiguous: the
`stage: 'graded'` line is a byte-copy of the `answered` line with **exactly
`grade` and `stage`** changed, and `validateGradedDelta` returns every field
that differs outside `{grade, stage}`.

But `divergent` is a top-level `RunRecord` field, Phase 2's runner writes it as
a constant `false` on the answered line, and the **only** stage that can
determine divergence is grading. As the contract stands, a grader that sets
`divergent: true` produces a line `validateGradedDelta` rejects, and a grader
that obeys the invariant produces a `divergent` field that is `false` on every
record in the arc -- a dead field, and with it D6's entire era/staleness
mechanism.

**Raised as F44 (MAJOR).** Disposition: a dated amendment to Phase 1's contract
widening the permitted delta set to `{grade, stage, divergent}`, applied in
Task 1 and ratified by the orchestrator before Task 7 writes a graded line.
Blast radius, stated rather than assumed: `validateGradedDelta`'s allowed set
(one identifier); Phase 1's two committed fixtures, whose graded/answered pair
must still differ in `stage` and `grade` and may now also differ in `divergent`;
Phase 1's boundary probe 7, whose "tampered answer not detected" assertion is
untouched because `answer` is not in the widened set; and Phase 5's explorer
generator, which runs `validateGradedDelta` while reconstructing and inherits
the change with no code of its own. Nothing computed from a number changes.

Rejected alternative: move `divergent` inside `Grade`. It is arguably the better
shape -- divergence IS a grading output, and it would keep the delta set at two
fields -- but it changes the `RunRecord` interface, both committed fixtures,
Phase 2's runner (which sets the field), and any Phase 5/8 reader that has
already been written against the flat field, in exchange for tidiness. Widening
by one boolean whose sole writer is the grader is the smaller blast radius.
Operator may overrule; if they do, Task 4 and Task 7 re-plan and nothing else
in this doc moves.

## The fixture

### Selection -- 20 threads, seed-deterministic, two strata

Drawn from `loadEffectiveSample()`, so the fixture inherits Phase 3's rejections
and substitutions and grades only threads the arc will actually use (F30).

- **Era stratum, 12** -- two threads per era for each of 2020-2025, taken as the
  lowest `sha256(seed + ":gradefix:" + thread_id)` within that era.
- **Free stratum, 8** -- the lowest 8 remaining hashes over all 500.

`seed` is the manifest's own seed, read from `sample-manifest.json`, so the draw
is reproducible from committed files with no database.

The era stratum is NOT there to certify per-era grader behaviour -- the OC
section shows that is unreachable at this size, exactly as F41 found for
per-domain key quality. It is there so the fixture cannot come out era-degenerate
by luck, which would silently make the staleness cases (the ones `divergent`
exists for) absent from the thing that certifies `divergent`. Two per era is the
cheapest guarantee that they are present at all.

Domains are deliberately NOT stratified. F41 already ruled per-domain
certification unreachable at 10x this size; pretending otherwise at n=20 would
be the same error the arc has now made twice.

### Answering -- 60 passes through Phase 2's shipped runner

20 threads x 3 cells. This is using a prior phase's shipped machinery on this
phase's own inputs, not a forward dependency: `runAnsweringPass(runId, q, cell,
opts?)`, `runGently`, and `appendRecord` are all named in Phase 2's Outputs.

The fixture driver imports them directly rather than shelling
`run-answering.ts`, for one concrete reason: Phase 2's CLI `--questions` flag is
documented against `loadPhase8Fixture`, and whether it can load an arbitrary
`QuestionSpec[]` JSON is not stated anywhere. Driving the exported function
needs no answer to that question. It does inherit two obligations from E7 and
must honour them explicitly, because the driver is a second call site for a
discipline the runner owns:

1. **One work queue.** Build the flat (question x cell) product ordered by
   (question index, cell) and hand it to ONE `runGently` call. Never three
   per-cell passes.
2. **One retry policy.** Never pass a second argument to `chatCompletion` /
   `chatJson`. Phase 2's `probe-cell-symmetry.ts` asserts this by globbing
   `eval/sim/` for client call sites, so this phase's new files fall under that
   probe automatically -- which is why the glob was written that way and why
   this phase does not add its own.

Stated plainly so nobody over-reads the fixture: these records use their own
`run_id`, they are **never pooled into any rate**, and Phase 1 already pins the
headline to the bulk run's file alone. A symmetry deviation here would not
corrupt a published number. Honouring E7 anyway is what makes the fixture
representative of the records the grader will meet later.

`exclude_thread_id` is the thread's own decimal `chat_threads.id` -- this is the
first place in the arc where D6's leave-one-out actually fires on a real sampled
thread, and `ctxFor` throws on anything that is not `/^[0-9]+$/` or `null`.

### Claude's blind hand-grade -- the reference

Claude grades all 60 from `eval/sim/fixtures/grader-fixture.blind.json`, a
projection carrying **only** `{fixture_index, question, answer, truth}` -- no
verdict, no condition, no thread id, no model. Same trick as `toGradingInput`,
and for the same reason: the reference grader must not be anchored by the thing
it is the reference for. F36 is the precedent -- Phase 3's checker found that
reading the key first turns the task into "find support for this" and fails
specifically toward the lenient verdict.

The blind projection also makes task ordering irrelevant. DeepSeek's verdicts
may already be on disk when Claude grades; Claude cannot see them, because the
file it is handed does not contain them.

Claude writes `{verdict, divergent, note}` per item into
`eval/sim/fixtures/grader-fixture.claude.json`, and **that file is committed
before any DeepSeek verdict is read**. The commit is the mechanical evidence
that the blind pass happened, exactly as Phase 3 uses a non-empty `reviewer_fix`.

Claude is the reference, not ground truth. Where Claude and DeepSeek disagree,
the gate counts a disagreement; it does not assert who was right. Task 8 surfaces
five disagreements to the operator for that reason.

## The gate

Five sub-gates over the 60 items. All must PASS. Composition floors can return
INCONCLUSIVE instead.

Let `C` be Claude's verdict and `D` be DeepSeek's rep-1 verdict.

| Gate | Statistic | Threshold |
|---|---|---|
| **G1 aggregate** | exact 3-way agreement, `C == D`, over all 60 | `>= 80%` (at most 12 disagreements) |
| **G2 match-recall** | of items with `C == 'match'`, the share with `D == 'match'` | `>= 80%` |
| **G3 match-precision** | of items with `D == 'match'`, the share with `C == 'match'` | `>= 80%` |
| **G4 divergent discipline** | DeepSeek's `divergent` count over all 60; every flagged item carries a non-empty `divergent_fix` | `<= 15%` (at most 9) **and** all flagged items carry a fix |
| **G5 self-consistency** | a second independent DeepSeek grading pass over the same 60; exact verdict agreement between rep 1 and rep 2 | `>= 85%` (at most 9 flips) |

**Composition floors -- INCONCLUSIVE, not PASS, if any fails:** Claude's `match`
class `>= 12`, Claude's `miss` class `>= 12`, Claude's `partial` class `>= 8`,
DeepSeek's `match` class `>= 12`. Remedy: extend the fixture by 8 more threads
from the same seeded order (24 more triples) and re-run Tasks 5-8 over the
enlarged set, capped at 36 threads / 108 triples; past that, stop and take it to
the operator.

Two things about that remedy matter. The `partial` floor is not decoration: a
fixture whose partial class is near-empty tests only the `match`-vs-`miss`
boundary, which is the easy one, and would certify a grader on exactly the cases
the trap section says prove nothing. And the extension trigger reads Claude's
verdict **composition** only -- never the agreement count. A rule that extended
the fixture because the agreement number came out near the threshold would be
optional stopping on the tested statistic and would invalidate the OC below.

### Why G2 and G3 exist, and why G1 alone would not

G1 is a gross-breakage floor and nothing more. Computed (binomial, n=60,
tolerate 12):

| true agreement | P(G1 PASS) | detection |
|---|---|---|
| 0.90 | 99.4% | 0.6% |
| 0.85 | 89.4% | 10.6% |
| 0.80 | 57.6% | 42.4% |
| 0.75 | 23.2% | 76.8% |
| 0.70 | 5.7% | 94.3% |
| 0.60 | 0.1% | 99.9% |

So G1 catches a grader that is broadly broken and is nearly blind to one that is
merely biased. The detection lives in G2 and G3, which are conditional rates on
the class that moves the headline.

### Operating characteristic of the adopted gate

False BLOCK against a **healthy** grader (all five sub-gates must pass; per-class
tolerance is `floor(0.20 * m)`, self-consistency modelled at `max(r, 0.90)`):

| match-class size `m` | healthy r=0.95 | r=0.92 | r=0.90 | r=0.85 |
|---|---|---|---|---|
| 12 (the composition floor) | 3.9% | 14.4% | 27.1% | 55.1% |
| 16 | 1.5% | 8.7% | 20.0% | 48.3% |
| **20 (expected)** | **0.6%** | **5.6%** | **15.6%** | 42.9% |
| 25 | 0.3% | 4.5% | 13.9% | 41.8% |

Read honestly: at an expected `m = 20` and a genuinely healthy grader agreeing
with Claude 92% of the time, the gate false-BLOCKs 5.6% of the time; at 90% it
false-BLOCKs 15.6%. That is the price of the detection below, and a false BLOCK
here is cheap -- revise the rubric wording, re-grade 60 triples for a couple of
cents, re-run Task 8. It is nothing like Phase 3's false BLOCK, which costs a
500-key re-extraction plus a 50-key human re-read. **The asymmetry is why this
gate is tuned tighter than Phase 3's was.**

Detection of the primary defect (see the scenario below), at 8% baseline noise:

| match-class size | P(G1 passes) | P(G2 passes) | P(BOTH pass) | **detection** |
|---|---|---|---|---|
| 12 | 94.5% | 14.1% | 13.4% | **86.6%** |
| 20 | 77.7% | 10.8% | 8.4% | **91.6%** |

And the cheaper candidate, **n=36** (12 threads x 3 cells), for comparison:

| | n=36, G1 tol 7 | n=60, G1 tol 12 |
|---|---|---|
| detection at true agreement 0.85 | 16.2% | 10.6% |
| detection at 0.80 | 43.4% | 42.4% |
| detection at 0.75 | 71.0% | 76.8% |
| safe-middle detection (with G2) | 89.7% | 91.6% |
| false BLOCK, healthy r=0.90 | 27.1% | 15.6% |

**n=60 is chosen for its false-BLOCK, not its detection** -- the two sizes detect
the scenario that matters within 2 points of each other, because the detection
comes from the conditional gate rather than from n. What n buys is a match class
of ~20 instead of ~12, and with it a per-class tolerance that does not fire on a
healthy grader. Saying that out loud is the point: a bigger fixture here is
insurance against wasted re-runs, not extra power.

G4's cap, computed (n=60, cap 9):

| true divergent rate | P(under cap) |
|---|---|
| 5% | 99.9% |
| 10% | 92.7% |
| 15% | 58.8% |
| 20% | 21.3% |
| 30% | 0.6% |
| 50% | 0.0% |

The v1 rubric's measured 50% rate would be caught with certainty. The v2 rubric's
measured ~10% sits comfortably under, with a 7% chance of a spurious BLOCK at
that true rate -- acceptable, and the remedy (tighten condition 2's wording) is
cheap.

G5's floor, computed (n=60, tolerate 9 flips):

| true self-consistency | P(G5 PASS) |
|---|---|
| 0.95 | 99.9% |
| 0.92 | 98.0% |
| 0.90 | 92.7% |
| 0.88 | 82.2% |
| 0.85 | 58.8% |
| 0.80 | 21.3% |

### Why G5 exists at all (F46)

**Measured at drafting time: the grader is not deterministic at `temperature: 0`.**
Four independent runs of the identical prompt over the identical 10 triples
produced identical verdicts on 8 of 10 and flipped on 2 -- both flips across an
adjacent boundary (`partial` <-> `miss`), and the `divergent` flag also flipped
once across the four runs. Pairwise run-to-run agreement ranged 8/10 to 10/10.

That has three consequences the arc has to carry, and none of them were in the
plan before this phase measured them:

1. **The gate's threshold cannot exceed the grader's own reproducibility.** If
   the grader disagrees with itself 15% of the time, no rubric revision can
   raise Claude-agreement above 85%, and a gate set there would BLOCK forever
   while the drafter kept rewriting a prompt that was never the problem. G5 is
   what distinguishes "the rubric is biased" from "the grader is noisy" -- two
   failures with the same symptom and completely different remedies.
2. **A post-bulk re-grade has a non-zero disagreement floor.** D6's post-bulk
   gate is a random 5-10% re-check; a perfect grader re-checking itself will
   still disagree at the self-inconsistency rate. Phase 6 must compare its
   re-check against G5's measured number, not against zero. Routed forward as an
   output.
3. **The remedy for noise is not a rubric change.** If G5 fails, the escalation
   is majority-of-3 grading (three `chatJson` calls, modal verdict), which
   raises effective consistency at 3x a cost that is a rounding error at this
   volume. It is NOT the default, because D6 stage 3 specifies a single
   compare-grading call and changing the instrument is an E1 spec matter, not a
   phase decision. Open question 2.

Caveat, stated because it bounds every number in this subsection: the 10 triples
were hand-built to sit on verdict boundaries, so 8/10 is a **lower bound** on
self-consistency, not an estimate of it. A representative fixture is mostly
non-boundary cases and should do better. G5's threshold of 85% is set above the
measured adversarial floor and below any plausible representative rate; if the
real fixture lands between them, that is information, and it is what the gate
exists to surface.

### The scenario where this gate PASSES while the grader is bad

Constructed with numbers, because "we thought about it" is not a design.

**S1 -- the safe middle (CAUGHT; this is what G2 is for).** The grader is shy of
`match`: whenever an answer names the fix but hedges or piles on extra
suggestions, it awards `partial` instead. Say that hits 30% of true-`match`
items, with 8% ordinary noise elsewhere. On a 60-item fixture with Claude at
20 match / 18 partial / 22 miss, expected disagreements are 7.1 in the match
class and 3.2 elsewhere: **aggregate agreement 82.8%, which sails through an 80%
aggregate gate**. Meanwhile the headline is wrecked -- cell C's match rate is
depressed by roughly a third while cell A's barely moves (cell A has few true
matches), so the A-vs-C delta, the arc's entire product claim, is compressed.
G2 catches it: within-match agreement is 64.4% against an 80% threshold, and the
combined detection is **91.6%**. This is the scenario that determined the gate's
shape.

**S2 -- divergent as an escape hatch (CAUGHT structurally, not statistically).**
The grader flags its own hard cases `divergent` and an implementer, reasonably
enough, excludes them from the agreement denominator on the grounds that they
are going to human review anyway. Worked on 60 items with 15 true disagreements:

| divergent flags placed on disagreements | agreement with divergents in the denominator | agreement with them excluded |
|---|---|---|
| 0 | 75.0% (BLOCK) | 75.0% (BLOCK) |
| 6 | 75.0% (BLOCK) | 83.3% (PASS) |
| 12 | 75.0% (BLOCK) | 93.8% (PASS) |
| 15 | 75.0% (BLOCK) | 100.0% (PASS) |

A grader with a 25% error rate certifies at 94% agreement by flagging its own
errors. G4 closes it by rule rather than by power: divergent items stay in every
denominator at their verdict, and the flag carries its own cap and its own
falsifiability requirement (`divergent_fix`). The probe recomputes G1-G3 from the
raw items so an implementation that quietly filtered them cannot pass.

**S3 -- an era-confined defect (NOT CAUGHT; F48, the declared limit).** The
grader is systematically harsh on the oldest threads: where a 2020-2021 key names
a long-dead cvar and the answer gives today's equivalent, it returns `miss`
instead of setting `divergent` -- the exact failure `divergent` was written to
prevent, failing silently in the safe-looking direction. 2020 and 2021 are 1,075
of the 3,164-thread pool (34%, F2), so about 7 of 20 fixture threads and 21 of
60 triples. If the defect fires on the third of those whose recorded fix is
genuinely dated, that is ~7 extra disagreements on top of ~4.8 of baseline
noise: expected aggregate agreement ~80%, just inside G1's 20% tolerance, and
the 7 spread across all three verdict classes so G2 and G3 barely move. **Detection is around 40% at best, and the gate PASSES more often
than not.** The consequence is not a broken headline -- it is a Phase 8 per-era
cut whose 2020-2021 rows are systematically depressed by a grader property that
reads as an oracle property.

Raised as **F48**. Nothing affordable fixes it inside this phase: resolving
grader behaviour per era needs roughly the whole sample read by hand, which is
the same arithmetic F41 ran for per-domain key quality and reached the same
answer. **Declared rather than
patched.** Three consequences carried forward: `grader-fixture.json` records the
fixture's era spread and the per-era disagreement counts as *reported* numbers
with no gate attached; Phase 8 must not read a per-era difference as an oracle
property without a targeted re-check; and the `divergent` rate per era is the
cheap tell -- a near-zero divergent rate on 2020-2021 answers alongside a nonzero
rate elsewhere is evidence the flag is failing exactly where it was needed.

**S4 -- a defect confined to any small stratum (NOT CAUGHT, same reason).**
Generalising S3: a defect confined to a class of `k` items adds at most `k`
disagreements, and G1 tolerates 12. Anything living in fewer than ~12 items is
invisible to the aggregate gate, and unless it lands in the match class it is
invisible to G2 and G3 as well. Answer-length bands, domains, and cell C
specifically are all in that regime at n=60. The one stratum this phase does
certify is the match class, because that is the one the headline is made of.

### How this relates to Phase 5's pilot gate

Spec D6 sets the pilot gate at **">=90% agreement on the match/miss boundary"**
over 30-50 threads through the full pipeline. That is Phase 5's, and passing
this phase's gate does not pre-empt it, for three reasons worth stating so the
orchestrator does not treat one as a rehearsal of the other:

1. **Different subject.** This gate measures the grader in isolation, against
   answers generated for the purpose, with Claude as reference. Phase 5's gate
   measures the whole pipeline -- key, leave-one-out retrieval, answering, and
   grading -- so a Phase 5 failure can be caused by any of four stages and a
   Phase 4 failure can only be caused by one. Isolating the grader is the only
   reason this is a separate phase (README's slicing rationale).
2. **Different population.** This fixture is drawn to spread verdicts and eras,
   with composition floors that will extend it if the spread is too narrow.
   Phase 5's slice is drawn to be representative. A grader that is fine on a
   deliberately spread fixture can still be wrong on the real verdict mix, and
   only Phase 5 can see that.
3. **Different boundary, and the coarser one is not the weaker one.** D6's
   match/miss dichotomy collapses `partial` into the non-match side; this phase's
   G2 and G3 gate the same collapse *conditionally*, which is strictly tighter,
   while G1 gates the finer 3-way scale at a looser threshold. Neither dominates.
   Phase 5's number is the one the arc reports as its calibration evidence;
   this one is a build gate that keeps Phase 5 from discovering a rubric defect
   with real money on the table.

Phase 5 also owns the key-quality half of D6's pilot check and the measured
cost-per-question that authorises the bulk run.
`TBD(phase-5: the pilot slice composition, the match/miss agreement arithmetic,
and whether the pilot re-uses this phase's rep mechanism for its own re-grade)`.

## Files touched

**Created:**
- `apps/qw-oracle/eval/sim/grade-prompt.ts` -- the byte-pinned rubric const,
  its sha256 helper, and the `GraderOutput` shape
- `apps/qw-oracle/eval/sim/grader.ts` -- `gradeOne(input: GradingInput)`,
  `GraderOutput`, verdict/flag validation
- `apps/qw-oracle/eval/sim/question-specs.ts` -- `sampleToQuestionSpecs()` (F45)
- `apps/qw-oracle/eval/sim/answer-fixture.ts` -- fixture selection + the 60-pass
  driver + the blind projection + the leakage count
- `apps/qw-oracle/eval/sim/run-grading.ts` -- the in-place grading CLI
- `apps/qw-oracle/eval/sim/probe-grader-blind.ts` -- the E8 payload probe
- `apps/qw-oracle/eval/sim/probe-graded-delta.ts` -- the E2 byte-copy probe
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.blind.json` -- committed
- `apps/qw-oracle/eval/sim/fixtures/grader-fixture.claude.json` -- committed
- `apps/qw-oracle/eval/sim/grader-fixture.json` -- committed (E13: the
  conclusion is committed, the run records stay gitignored)

**Modified:**
- `docs/superpowers/plans/2026-08-06-oracle-eval-simulation/phase-1-eval-surface-contract.md`
  (F44 dated amendment)
- `docs/superpowers/plans/2026-08-06-oracle-eval-simulation/decisions.md`
  (E2 dated amendment for F44)
- `apps/qw-oracle/eval/sim/run-record.ts` (`validateGradedDelta`'s allowed set)
- `apps/qw-oracle/eval/sim/fixtures/run-record.example.json` and
  `run-record.answered.json` (exercise the widened delta)

**Deleted:** none.

**Writes but does not commit:** `apps/qw-oracle/eval/sim/records/<fixture_run_id>.jsonl`
(gitignored per Phase 1 Task 5).

## Tasks

Numbered order is a valid topological order. **Edge list**, declared rather than
assumed: `1 -> 7`, `1 -> 8`, `2 -> 5`, `3 -> 4`, `4 -> 7`, `5 -> 6`, `5 -> 7`,
`6 -> 8`, `7 -> 8`. Tasks 1, 2 and 3 have no in-edges and could run in parallel;
every edge points from a lower number to a higher one, so no task consumes a
later task's output and the graph is acyclic by inspection. Task 0 precedes
everything and produces only assertions.

### Task 0 -- Entry re-verification of Phases 1, 2 and 3 · `inline`

**Goal:** every input this phase was drafted against is present and shaped as
promised, before anything is built on it.

**Files:** none.

**Steps:** run the probe below. It checks the six things whose absence would
invalidate a later task rather than merely inconvenience it: the Phase 1 record
module and its three exported functions; **`validateGradedDelta`'s actual
permitted set**, which is where F44 is confirmed at execution time rather than
inherited from this doc; Phase 2's client and store exports; Phase 3's
`loadEffectiveSample()` returning 500; the DeepSeek key resolving; and both
typechecks green.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const fails=[]; const ck=(ok,m)=>{console.log((ok?"PASS ":"FAIL ")+m); if(!ok) fails.push(m);};
    const rr = await import("./eval/sim/run-record.ts");
    ck(typeof rr.validateRunRecord==="function","validateRunRecord exported");
    ck(typeof rr.validateGradedDelta==="function","validateGradedDelta exported");
    ck(typeof rr.toGradingInput==="function","toGradingInput exported");
    const g = await Bun.file("eval/sim/fixtures/run-record.example.json").json();
    const a = await Bun.file("eval/sim/fixtures/run-record.answered.json").json();
    const ok=(x)=>{const r=rr.validateRunRecord(x); if(!r.ok) throw new Error(JSON.stringify(r.errors)); return r.record;};
    const A=ok(a), G=ok(g);
    ck(rr.validateGradedDelta(A,G).length===0,"clean answered/graded pair reports no delta");
    const d = rr.validateGradedDelta(A,{...G,divergent:!G.divergent});
    ck(d.length>0,"F44 CONFIRMED: a divergent-only change is currently reported as a delta -- Task 1 must run");
    const k=Object.keys(rr.toGradingInput(G)).sort().join(","); ck(k==="answer,question,truth","toGradingInput keys are exactly answer,question,truth (got "+k+")");
    const dc = await import("./eval/sim/deepseek-client.ts");
    for(const n of ["chatJson","runGently","emptyUsage","addUsage","formatSpend"]) ck(typeof dc[n]==="function","deepseek-client exports "+n);
    ck(typeof dc.DEEPSEEK_MODEL==="string" && dc.DEEPSEEK_MODEL.length>0,"DEEPSEEK_MODEL is a non-empty string");
    const js = await import("./eval/sim/jsonl-store.ts");
    for(const n of ["appendRecord","readRecords","completedKeys","recordsPath"]) ck(typeof js[n]==="function","jsonl-store exports "+n);
    const sm = await import("./eval/sim/sample.ts");
    const s = sm.loadEffectiveSample();
    ck(s.length===500,"loadEffectiveSample returns 500 (got "+s.length+")");
    ck(s.every(x=>x.truth && x.truth.trim().length>0),"every sampled thread carries a non-empty truth");
    ck(new Set(s.map(x=>x.era)).size>=5,"at least 5 distinct eras present");
    ck(s.every(x=>/^[0-9]+$/.test(x.thread_id)),"every thread_id is decimal (it reaches ::bigint[])");
    process.exit(fails.length?1:0);'

Expect `APP_TYPECHECK_OK`, every line `PASS`, exit 0. The F44 line is the one
that must read PASS **because the current contract rejects the change** -- if it
reads FAIL, either Task 1 already ran or Phase 1 shipped a different delta set,
and Task 1's amendment must be re-derived against what actually shipped rather
than applied blind.

### Task 1 -- F44: widen the graded delta to admit `divergent` · `agent (session-tier, high)`

**Goal:** the grader can record a divergence without violating the contract that
protects the evidence.

**Files:** `phase-1-eval-surface-contract.md` (amendment), `decisions.md` (E2
amendment), `eval/sim/run-record.ts`, both fixtures under `eval/sim/fixtures/`.

**Gate:** the orchestrator ratifies the amendment before the code edit. This is
E2's prescribed route for a needed-but-missing field, not a phase decision.

**Steps:**
1. Append a dated amendment block to Phase 1's "Append rules" section: the
   permitted delta set for a `stage: 'graded'` line is `{grade, stage,
   divergent}`; `divergent` is written only by the grader; every other field
   remains byte-identical. State the rejected alternative (moving `divergent`
   inside `Grade`) and its reason, per E1's "amendments re-derive, never
   re-word".
2. Append the matching dated block under E2 in `decisions.md`, citing F44.
3. Change `validateGradedDelta`'s allowed set in `run-record.ts`. One
   identifier. Do not touch `validateRunRecord`.
4. Update `run-record.answered.json` / `run-record.example.json` so the pair now
   differs in `stage`, `grade` **and** `divergent` -- so the widened rule is
   exercised by a committed file rather than only by a probe, exactly as Phase 1
   uses the absent-`grade` fixture to exercise absent-===-null.
5. Re-run Phase 1's boundary probe 7 verbatim from its own doc. It must still
   pass, including its "tampered answer not detected" assertion -- `answer` is
   not in the widened set and must still be caught.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && bun -e '
    const rr=await import("./eval/sim/run-record.ts"); const fails=[];
    const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const g=await Bun.file("eval/sim/fixtures/run-record.example.json").json();
    const a=await Bun.file("eval/sim/fixtures/run-record.answered.json").json();
    const A=rr.validateRunRecord(a), G=rr.validateRunRecord(g);
    ck(A.ok&&G.ok,"both fixtures still validate");
    ck(rr.validateGradedDelta(A.record,G.record).length===0,"the committed pair (stage+grade+divergent) reports no delta");
    ck(A.record.divergent!==G.record.divergent,"the committed pair actually exercises the divergent change");
    ck(rr.validateGradedDelta(A.record,{...G.record,answer:"tampered"}).length>0,"answer tampering is still caught");
    ck(rr.validateGradedDelta(A.record,{...G.record,truth:"tampered"}).length>0,"truth tampering is still caught");
    ck(rr.validateGradedDelta(A.record,{...G.record,usage:{...G.record.usage,cost_usd:99}}).length>0,"usage tampering is still caught");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. The three tampering assertions are the floor:
a `validateGradedDelta` that was widened by deleting the comparison entirely
would pass the first two lines and fail these.

### Task 2 -- `question-specs.ts`: the missing loader (F45) · `agent (workhorse, medium)`

**Goal:** a `SampleThread[]` becomes a `QuestionSpec[]`, with leave-one-out
wired, in one place that Phases 5 and 6 reuse.

**Files:** `eval/sim/question-specs.ts` (new).

**Why here:** Phase 2's Outputs list this loader as
`TBD(phase-3: sample-manifest -> QuestionSpec[] loader)`; Phase 3's Outputs say
it writes no run records and that "Phase 6 populates it from
`loadEffectiveSample()`". Neither phase claims it, and Phase 4 is the first
phase that has to answer a real sampled thread. Raised as F45 and built here as
a new file rather than as an edit to Phase 3's committed `sample.ts`, so no
landed artifact moves.

**Steps:**
1. Export `sampleToQuestionSpecs(threads: SampleThread[]): QuestionSpec[]`,
   mapping `thread_id`, `thread_key`, `domain`, `era`, `question`, `truth`
   straight across and setting `exclude_thread_id = thread_id`. That assignment
   IS D6's leave-one-out and deserves a why-comment naming D6 stage 2: without
   it the agent retrieves its own answer key and cells B and C collapse into
   self-retrieval.
2. Throw on a `thread_id` that is not `/^[0-9]+$/` -- it is interpolated into
   `::bigint[]` and `ctxFor` will throw anyway, but throwing at the loader names
   the row instead of failing inside the retrieval SQL 60 passes later. Same
   posture as Phase 1's `parseEnvContext()` and Phase 3's `loadEffectiveSample()`:
   refuse rather than degrade.
3. Throw on an empty `question` or `truth`. `loadEffectiveSample()` already
   guarantees both; asserting again costs nothing and keeps the guarantee local
   to the file that depends on it.
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

Expect every line `PASS`, exit 0. The last assertion is the one that matters:
Phase 2 measured that `ARRAY['p8-01']::bigint[]` throws inside
`search_solved_issues`, which under Phase 1's F22 re-throw would fail every
cell-B and cell-C pass identically and read as a total harness collapse.

### Task 3 -- The rubric, byte-pinned · `agent (session-tier, high)`

**Goal:** one exported prompt const, one digest, one output shape, and no second
copy of the verdict vocabulary anywhere.

**Files:** `eval/sim/grade-prompt.ts` (new).

**Steps:**
1. Export `GRADE_PROMPT_TEMPLATE` as a single template function
   `(g: GradingInput) => string` producing the prompt in "The full prompt shape"
   above, with the three verdict definitions and the three-condition `divergent`
   block written out **verbatim from this doc**. The wording is not decorative:
   the loose phrasing was measured firing on 5 of 10 and the tight phrasing on
   1 of 10.
2. Export `GRADE_PROMPT_SHA256` -- the sha256 of the template with the three
   interpolation slots filled by fixed sentinel strings, so the digest is a
   property of the template and not of one call's inputs. Record it in
   `grader-fixture.json`; a change invalidates every verdict taken under it.
3. Export the output type:

       export interface GraderOutput {
         verdict: 'match' | 'partial' | 'miss';   // Phase 1's Verdict; import it, do not redeclare (F10)
         divergent: boolean;
         divergent_fix: string;                    // '' when divergent is false
         rationale: string;
       }

   Import `Verdict` from `run-record.ts` rather than restating the union --
   F10 records that three different verdict vocabularies already exist in this
   repo and a fourth would be free.
4. No HTTP, no client import, no I/O. This file is a string and a type.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && bun -e '
    const gp=await import("./eval/sim/grade-prompt.ts"); const fails=[];
    const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const p=gp.GRADE_PROMPT_TEMPLATE({question:"QSENTINEL",answer:"ASENTINEL",truth:"TSENTINEL"});
    ck(p.length>800,"floor: prompt is non-trivial ("+p.length+" chars)");
    ck(p.includes("json"),"E15 rule 1: the literal lowercase word json is present -- chatJson would throw locally, and the provider 400s, without it");
    for(const s of ["QSENTINEL","ASENTINEL","TSENTINEL"]) ck(p.includes(s),"the "+s+" slot is interpolated");
    for(const w of ["\"match\"","\"partial\"","\"miss\"","divergent_fix","ALL THREE"]) ck(p.includes(w),"prompt carries "+w);
    ck(!/NAILED|WRONG/.test(p),"F10: the faq-gate vocabulary does not appear");
    ck(/^[0-9a-f]{64}$/.test(gp.GRADE_PROMPT_SHA256),"GRADE_PROMPT_SHA256 is a 64-hex digest");
    const h=new Bun.CryptoHasher("sha256"); h.update(gp.GRADE_PROMPT_TEMPLATE({question:"<Q>",answer:"<A>",truth:"<T>"}));
    ck(h.digest("hex")===gp.GRADE_PROMPT_SHA256,"the recorded digest is the digest of the sentinel-filled template");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. (The digest assertion pins the sentinel
strings `<Q>` / `<A>` / `<T>` as the canonical fill; the task must use those.)

### Task 4 -- `grader.ts` and the E8 blindness probe · `agent (workhorse, high)`

**Goal:** one grading call, structurally incapable of seeing the condition, with
its blindness proven by sentinel rather than by reading the code.

**Files:** `eval/sim/grader.ts` (new), `eval/sim/probe-grader-blind.ts` (new).

**Steps:**
1. Export
   `gradeOne(input: GradingInput, opts?: { model?: string }): Promise<{ out: GraderOutput; usage: Usage; latency_ms: number }>`.
   **`GradingInput` is the only data parameter.** No `RunRecord` overload, no
   optional context, no "for debugging" second argument -- E8's whole force
   comes from there being no parameter a condition could ride in, exactly as
   Phase 1 argues for `RetrievalContext`'s positional separation.
2. Body: build the prompt with `GRADE_PROMPT_TEMPLATE`, call `chatJson` with
   `temperature: 0` and `max_tokens: 2048`. Do not pass a second options
   argument to `chatJson` -- E7's one-retry-policy rule, which Phase 2's
   symmetry probe enforces by globbing `eval/sim/` for client call sites.
   Measured budget basis: over 40 drafting calls the reply consumed a mean 489
   completion tokens of which 438 were reasoning (~90%), so 2048 is roughly 4x
   headroom and `finish_reason === 'length'` never fired; E15 rule 3 makes a
   `length` finish throw inside `chatJson` regardless.
3. Validate the parsed value strictly before returning: `verdict` in the union,
   `divergent` a boolean, `divergent_fix` a string, `rationale` a non-empty
   string, and **`divergent === true` implies `divergent_fix.trim().length > 0`**
   -- the falsifiability rule from the rubric, enforced in code so a model that
   sets the flag without naming the alternative is a failed call rather than a
   silently accepted one. Throw on any violation so `runGently` counts it and
   retries.
4. Export nothing else. No file I/O, no database handle, no MCP import -- a
   grader that could reach a database is the correlated-error failure E8 exists
   to prevent, and the cheapest guarantee is that the module has no such import
   to reach for.
5. Write `probe-grader-blind.ts`. It builds an in-memory `RunRecord` from
   Phase 1's graded fixture with distinctive sentinels planted in every field the
   grader must not see -- `condition: 'B'`, `domain: 'ZZDOMAINSENTINEL'`,
   `answering_model: 'ZZMODELSENTINEL'`, `thread_key: 'ZZKEYSENTINEL'`, a tool
   call whose `arguments` carry `'ZZTOOLSENTINEL'`, and
   `retrieval_context.channels: ['ZZCHANNELSENTINEL']` -- then asserts, without
   making any network call, that the prompt
   `GRADE_PROMPT_TEMPLATE(toGradingInput(rec))` contains **none** of the six
   sentinels and **does** contain the record's `question`, `answer` and `truth`
   substrings. The positive half is the non-emptiness floor: a template that
   returned the empty string would pass the six negative assertions and prove
   nothing.
6. The probe also greps its own module graph: assert `grader.ts`'s source
   contains no `postgres`, no `../serve/mcp`, and no
   `@modelcontextprotocol` import literal. Stated honestly, this is a source
   grep and a wrapper would defeat it; it is here because the alternative is an
   unenforceable comment, which is the same trade Phase 2 made for its retry
   probe.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-grader-blind.ts

Expect every line `PASS` and exit 0. This probe makes no paid call.

### Task 5 -- The fixture: select 20, answer 60, project blind · `agent (workhorse, medium)`

**Goal:** 60 answered records on disk, a blind projection for Claude, a measured
leakage count, and a measured bill.

**Files:** `eval/sim/answer-fixture.ts` (new),
`eval/sim/fixtures/grader-fixture.blind.json` (new, committed),
`eval/sim/records/<fixture_run_id>.jsonl` (gitignored).

**Steps:**
1. Read `sample-manifest.json` for the seed. Draw the 20 threads per the
   "Selection" section: 2 per era for 2020-2025 by lowest
   `sha256(seed + ":gradefix:" + thread_id)` within era, then the lowest 8
   remaining hashes overall. Print all 20 ids and the era spread so the draw is
   auditable. If any era yields fewer than 2 threads, that is a Phase 3 sample
   defect, not a fixture problem -- stop and raise a finding rather than
   backfilling from another era.
2. `sampleToQuestionSpecs()` over those 20.
3. Mint `fixture_run_id` (a ULID, per Phase 1's `run_id` convention) and print
   it; every later task takes it as an argument rather than re-deriving it.
4. Build the flat (question x cell) product ordered by (question index, cell) --
   `ABC` per question, questions in draw order -- and hand it to ONE `runGently`
   call at `conc: 6`, calling `runAnsweringPass(fixtureRunId, q, cell)` and
   `appendRecord` inside the per-item function so a line lands the moment a pass
   completes (E9). Do not run three per-cell passes; E7's one-work-queue rule
   applies to this call site as much as to Phase 2's runner.
5. **Assert the semantic path was live** (E6's F37 amendment): check
   `VOYAGE_API_KEY` and `EMBEDDING_MODEL_QUERY` are set before starting, and
   after the run assert `embedding_api_log` gained at least one row with
   `error IS NULL` since the run's start timestamp. A degraded lexical-only run
   is a hard failure here as everywhere -- and it would be worse than usual,
   because the grader would then be certified against answers from an oracle
   running on half its retrieval.
6. Emit `grader-fixture.blind.json`: an array of
   `{fixture_index, question, answer, truth}` over the 60 records, in
   `fixture_index` order, and **nothing else** -- no verdict, no condition, no
   thread id, no model. Skip any record with `error !== null` and report how
   many were skipped; if more than 6 of 60 failed, stop and raise a finding
   rather than grading a survivor subset (E7 amendment channel 3 is about
   exactly this).
7. Count the E8 prose residue: how many of the 60 answers contain `#helpdesk`,
   `#quakeworld`, `#dev-corner`, `#antilag`, or a bare four-digit year in
   2015-2026. Print the count and up to five examples; Task 8 records them under
   `leakage`.
8. Print `formatSpend` and the per-cell forcing-turn rate and failure count
   (Phase 2's run summary already computes these; this driver prints its own
   because it is not going through Phase 2's `main`). Quote Phase 2's Task 7
   smoke total for 36 passes alongside, so the 60-pass figure is compared to a
   measured baseline rather than to an expectation.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const {readRecords}=await import("./eval/sim/jsonl-store.ts");
    const {validateRunRecord}=await import("./eval/sim/run-record.ts");
    const id=process.env.FIXTURE_RUN_ID; if(!id){console.log("FAIL FIXTURE_RUN_ID not set");process.exit(1);}
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const {records}=readRecords(id);
    ck(records.length===60,"60 reconstructed records (got "+records.length+")");
    ck(records.length>0,"floor: non-empty");
    ck(records.every(r=>validateRunRecord(r).ok),"every record validates");
    ck(records.every(r=>r.stage==="answered"&&r.grade===null),"every record is ungraded");
    ck(new Set(records.map(r=>r.record_id)).size===60,"60 distinct record_ids");
    for(const c of ["A","B","C"]) ck(records.filter(r=>r.condition===c).length===20,"20 records in cell "+c);
    ck(new Set(records.map(r=>r.thread_id)).size===20,"20 distinct threads");
    ck(new Set(records.map(r=>r.era)).size===6,"all six eras 2020-2025 present");
    ck(records.filter(r=>r.condition==="A").every(r=>r.tool_calls.length===0),"cell A used no tools");
    ck(records.filter(r=>r.condition!=="A").every(r=>r.retrieval_context.exclude_thread_ids[0]===r.thread_id),"leave-one-out is wired on every B/C record");
    ck(records.filter(r=>r.condition==="B").every(r=>JSON.stringify(r.retrieval_context.channels)===JSON.stringify(["#helpdesk"])),"cell B is helpdesk-scoped");
    ck(records.filter(r=>r.condition==="C").every(r=>r.retrieval_context.channels===null),"cell C is unscoped");
    ck(records.some(r=>r.usage.reasoning_tokens>0),"reasoning tokens recorded (E10)");
    const blind=await Bun.file("eval/sim/fixtures/grader-fixture.blind.json").json();
    ck(Array.isArray(blind)&&blind.length>0,"blind projection is a non-empty array");
    const keys=new Set(blind.flatMap(x=>Object.keys(x)));
    ck([...keys].sort().join(",")==="answer,fixture_index,question,truth","blind projection carries exactly fixture_index,question,answer,truth (got "+[...keys].sort().join(",")+")");
    const blob=JSON.stringify(blind);
    for(const s of ["\"condition\"","\"thread_id\"","\"answering_model\"","\"verdict\""]) ck(!blob.includes(s),"blind projection contains no "+s+" key");
    ck(blind.every(x=>x.answer&&x.answer.trim()&&x.truth&&x.truth.trim()),"every blind item has a non-empty answer and truth");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. Run with `FIXTURE_RUN_ID` set to the id Task 5
printed. The blind-projection key-set assertion is the one that protects Task 6
from being anchored, and the leave-one-out assertion is the first live proof in
the arc that D6 stage 2 fires on a real sampled thread.

### Task 6 -- Claude's blind hand-grade of all 60 · `agent (session-tier, high)`

**Goal:** a committed reference the gate can be measured against, produced
without sight of the thing it measures.

**Files:** `eval/sim/fixtures/grader-fixture.claude.json` (new, committed).

**Dispatch constraint, normative:** the agent is handed
`grader-fixture.blind.json` and **must not open**
`eval/sim/records/<fixture_run_id>.jsonl`, `sample-keys.json`, or any file
carrying a DeepSeek verdict. The blind projection makes that mechanical rather
than disciplinary -- it is the only file with the answers in it -- but the
prohibition is written down because a helpful agent will otherwise go looking
for context.

**Steps:**
1. For each of the 60 items, in `fixture_index` order, apply the rubric in this
   doc -- the same three verdict definitions and the same three-condition
   `divergent` test the model gets. Claude uses **no tools** for this: the
   reference must be blind and toolless in the same way the subject is, or the
   two are not measuring the same task. (D6 stage 4's tool-assisted review is a
   different, later stage with a different job.)
2. Write `{fixture_index, verdict, divergent, note}` per item, `note` being one
   line naming the specific thing compared. A non-empty `note` on every item is
   the mechanical evidence the pass was done item by item, the same role
   `reviewer_fix` plays in Phase 3.
3. Commit the file **before** reading any DeepSeek verdict. The commit is the
   audit trail; a file written after the fact is not a blind grade no matter what
   it contains.
4. Print the verdict composition (`match` / `partial` / `miss` counts) and stop
   if any composition floor is missed -- Claude `match >= 12`, `miss >= 12`,
   `partial >= 8`. That is an INCONCLUSIVE outcome and its remedy is the fixture
   extension in "The gate", not a re-grade.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const blind=await Bun.file("eval/sim/fixtures/grader-fixture.blind.json").json();
    const cl=await Bun.file("eval/sim/fixtures/grader-fixture.claude.json").json();
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    ck(cl.length===blind.length&&cl.length>0,"one Claude verdict per blind item ("+cl.length+" vs "+blind.length+")");
    const idx=cl.map(x=>x.fixture_index).sort((a,b)=>a-b);
    ck(JSON.stringify(idx)===JSON.stringify(blind.map(x=>x.fixture_index).sort((a,b)=>a-b)),"fixture_index sets match exactly");
    ck(cl.every(x=>["match","partial","miss"].includes(x.verdict)),"every verdict is in the D6 union");
    ck(cl.every(x=>typeof x.divergent==="boolean"),"every divergent is a boolean");
    ck(cl.every(x=>typeof x.note==="string"&&x.note.trim().length>0),"every item carries a non-empty note -- the item-by-item pass happened");
    const c={match:0,partial:0,miss:0}; for(const x of cl) c[x.verdict]++;
    console.log("composition match="+c.match+" partial="+c.partial+" miss="+c.miss);
    ck(c.match>=12,"composition floor: Claude match class >= 12 (got "+c.match+")");
    ck(c.miss>=12,"composition floor: Claude miss class >= 12 (got "+c.miss+")");
    ck(c.partial>=8,"composition floor: Claude partial class >= 8 (got "+c.partial+") -- below this the match/partial boundary is untested");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0. A composition-floor FAIL is INCONCLUSIVE, not
BLOCK: extend the fixture and re-run Tasks 5-8. Do not re-grade to reach a floor.

### Task 7 -- `run-grading.ts`, and both grading passes · `agent (workhorse, high)`

**Goal:** records move from `answered` to `graded` in place, byte-copy clean, and
the grader's own reproducibility is measured.

**Files:** `eval/sim/run-grading.ts` (new), `eval/sim/probe-graded-delta.ts`
(new); appends to `eval/sim/records/<fixture_run_id>.jsonl`.

**CLI contract** (Phases 5 and 6 drive this same file, so the flags are part of
this phase's output):

    bun eval/sim/run-grading.ts --run-id <id> [--conc N] [--limit N] [--rep2 <path>]

`--run-id` is required -- there is no default and no ULID minting, because
grading the wrong run file is silent and unrecoverable. `--conc` defaults to 6.
`--rep2 <path>` runs a second independent grading pass and writes
`{fixture_index|record_id, verdict, divergent}` to that JSON path **without
touching the run file**, which is what makes G5 measurable without polluting
last-line-wins reconstruction or the `(record_id, stage)` resume key.

**Steps:**
1. `readRecords(runId)`; reconstruct last-line-wins; keep records with
   `stage === 'answered'` and `error === null`. **Skip errored records** -- Phase
   2 excludes them from every rate and grading one would put a verdict on an
   answer nobody counts. Skip records already at `stage === 'graded'` via
   `completedKeys`, so grading is resumable exactly like answering (E9).
2. Per record: `gradeOne(toGradingInput(rec))` through ONE `runGently` call.
   Never construct the grading payload by hand -- `toGradingInput` is the E8
   carrier and Task 4's probe pins it.
3. Build the graded line as a **byte-copy**:
   `{ ...rec, stage: 'graded', divergent: out.divergent, grade: { verdict: out.verdict, by: 'deepseek', spot_checked: false, rationale: out.rationale, graded_at: <ISO> } }`.
   Spread the whole record; never construct `{record_id, stage, grade}`. E2's
   MAJOR-3 amendment exists because that delta line reads as compliant under
   last-line-wins and destroys `answer`, `tool_calls`, `usage`, `latency_ms`,
   `truth` and `question` on reconstruction -- the evidence for the headline,
   gone, with no error anywhere.
4. Before appending, run `validateGradedDelta(rec, graded)` and **throw on a
   non-empty result**. `appendRecord` validates the record's shape but not the
   delta; this is the only place the invariant is enforced at write time rather
   than checked afterwards.
5. Store `out.divergent_fix` in the graded line's `grade.rationale` prefix as
   `[divergent: <fix>] <rationale>` when the flag is set. `Grade` has no field
   for the alternative fix and Phase 1's contract should not grow one for a
   string that is only ever read by a human in the review pile; carrying it in
   the rationale keeps the schema unchanged and the information present. Stated
   here rather than left to the implementer because a second Phase 1 amendment
   for this would be the wrong trade.
6. Run pass 1 over the fixture run. Then run pass 2 with
   `--rep2 eval/sim/fixtures/grader-fixture.rep2.json`.
7. Record `query_log` and `embedding_api_log` counts immediately before and
   after **the grading step only** (not the Task 5 answering step, which
   legitimately writes rows). Both deltas must be **zero**: the grader touches no
   database and calls no tool, so E3's telemetry carve-out does not apply to it,
   and a non-zero delta means something in the grading path reached a handle it
   should not have. Print both.
8. Print `formatSpend` over both passes.
9. Write `probe-graded-delta.ts`: reconstruct the run file, and for every
   `record_id` find its last `answered` line and its last `graded` line, run
   `validateGradedDelta` on the pair, and assert an empty result plus a
   non-emptiness floor on the number of pairs found.

**Verification probe:**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-graded-delta.ts "$FIXTURE_RUN_ID"

Expect a `PASS` line per assertion, a printed `PAIRS <n>` equal to the number of
answered records in the run, and exit 0.
Then:

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM query_log;"

and compare against the number `run-grading.ts` printed as its post-grading
count. Equal means the grader wrote nothing; a difference means something
called a tool during grading, which is an E8 violation and blocks the phase.

### Task 8 -- Compute the gate, commit the fixture, surface to the operator · `agent (session-tier, high)`

**Goal:** the five sub-gates computed from raw items, the confusion matrix
committed, and the disagreements the operator should actually look at.

**Files:** `eval/sim/grader-fixture.json` (new, committed).

**Steps:**
1. Join Claude's verdicts, DeepSeek rep-1 verdicts (from the run file's graded
   lines) and rep-2 verdicts (from `grader-fixture.rep2.json`) on
   `fixture_index`. Assert all three sets cover the same indices.
2. Compute G1-G5 exactly as the gate table specifies. **Compute them from the
   items, never from a recorded summary** -- F32's lesson: a figure that is
   re-worded instead of re-derived reaches a ratified document and is caught only
   when somebody recomputes.
3. Compute the composition floors first. If any fails, the outcome is
   `INCONCLUSIVE`, the file records which floor and by how much, and the phase
   stops for the fixture extension. Do not report a PASS on an under-composed
   fixture.
4. Build the 3x3 confusion matrix (Claude rows x DeepSeek columns, order
   `match`, `partial`, `miss`) and record it. The matrix is what lets a reader
   see *which* boundary the disagreements sit on, which the five scalars cannot
   show.
5. Record the reported-not-gated numbers: per-era disagreement counts, per-cell
   disagreement counts, per-era divergent counts, and the `leakage` block from
   Task 5. Each carries a one-line note that it is **uncertified** -- at n=60 a
   defect confined to any stratum smaller than ~12 items is invisible (S4), and
   that includes every era, every cell and every domain.
6. Write `grader-fixture.json` with `schema_version:
   'eval-grader-fixture-v1'`, `manifest_sha256` (binding it to Phase 3's frozen
   manifest, as `sample-keys.json` does), `prompt_sha256`, `model`,
   `fixture_run_id`, `seed`, the 20 thread ids, the era spread, all 60 items with
   all three verdicts, `composition`, `gate`, `leakage`, `telemetry` and
   `accounting` (E10: the five token fields plus `cost_usd`).
7. **Surface five disagreements to the operator in chat**, drawn so the sample
   cannot be the grader's or Claude's own selection: at least 2 drawn
   seed-deterministically from all 60 regardless of agreement
   (`sha256(seed + ":gradeop:" + fixture_index)`, lowest first), the rest from
   the disagreement pool preferring match-class disagreements. Same construction
   and the same reason as Phase 3's operator draw (F36): if the operator only
   ever sees what Claude flagged, a systematically lenient reference is invisible
   from that sample by construction. Record dispositions in
   `gate.operator_read`.
8. On BLOCK: revise `grade-prompt.ts`, re-run Task 7 over the same 60 answers
   (the answers do not change, so no re-answering spend), re-run Task 8. Claude's
   verdicts are NOT re-done -- they were produced blind against the answers, not
   against the rubric version, and re-doing them after seeing a BLOCK is exactly
   the anchoring F36 warns about. Record every rubric revision and its
   `prompt_sha256` in a `revisions` array so the number of attempts is visible;
   a gate passed on the fourth rubric is a different object from one passed on
   the first, and Phase 5 should be able to see that.

**Verification probe:** phase-boundary probe 4 below is this task's probe.

## Phase-boundary verification

Every probe runs as written from a shell in the worktree, with
`FIXTURE_RUN_ID` exported to the id Task 5 printed. **Provenance, stated
precisely:** probe 6's SQL form was executed verbatim against the twin at
drafting time (read-only, using the main checkout's `.env`, which Phase 1 Task 1
makes identical) and returned the era histogram quoted under S3. Probes 1-5 and
7 exercise code this phase creates and **were not run** -- none of it exists yet;
they are stated with their exact expected stdout and exit status. The grading
behaviour the rubric section reports was measured by scratch probes against the
live DeepSeek API, described under "Probes run" below; those scripts are scratch
and are not part of the phase.

**1. Typecheck.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun run typecheck && echo APP_TYPECHECK_OK

Expect `APP_TYPECHECK_OK` -- YES/NO. Phase 1 added `eval/sim/**/*` to `include`,
so every file this phase creates is covered. Confirmed read-only at drafting
time that `include` does not carry it today, so a green typecheck here also
confirms Phase 1's tsconfig change survived.

**2. The rubric is pinned and provider-legal.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const gp=await import("./eval/sim/grade-prompt.ts");
    const f=await Bun.file("eval/sim/grader-fixture.json").json();
    const p=gp.GRADE_PROMPT_TEMPLATE({question:"<Q>",answer:"<A>",truth:"<T>"});
    const h=new Bun.CryptoHasher("sha256"); h.update(p);
    const d=h.digest("hex"); const fails=[];
    const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    ck(p.length>800,"floor: prompt non-trivial ("+p.length+")");
    ck(p.includes("json"),"E15 rule 1: literal lowercase json present");
    ck(d===gp.GRADE_PROMPT_SHA256,"exported digest matches the template");
    ck(d===f.prompt_sha256,"the fixture was graded under THIS prompt (fixture "+f.prompt_sha256.slice(0,12)+", live "+d.slice(0,12)+")");
    process.exit(fails.length?1:0);'

Expect four `PASS` lines, exit 0 -- YES/NO. The last assertion is what stops a
post-hoc prompt edit from silently orphaning the gate that certified it.

**3. E8 blindness.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-grader-blind.ts

Expect every line `PASS`, exit 0 -- YES/NO. Six sentinel-absence assertions plus
three presence assertions (question, answer, truth), so an empty-string template
cannot pass.

**4. The gate, recomputed from raw items.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const f=await Bun.file("eval/sim/grader-fixture.json").json();
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    const it=f.items||[];
    ck(it.length>=60,"floor: at least 60 fixture items (got "+it.length+")");
    ck(it.every(x=>x.claude&&x.deepseek_rep1&&x.deepseek_rep2),"every item carries all three verdicts");
    const V=["match","partial","miss"];
    ck(it.every(x=>V.includes(x.claude.verdict)&&V.includes(x.deepseek_rep1.verdict)&&V.includes(x.deepseek_rep2.verdict)),"every verdict is in the D6 union");
    const n=it.length;
    const cc={match:0,partial:0,miss:0}, dc={match:0,partial:0,miss:0};
    for(const x of it){cc[x.claude.verdict]++; dc[x.deepseek_rep1.verdict]++;}
    ck(cc.match>=12&&cc.miss>=12&&cc.partial>=8,"composition floors met (claude m="+cc.match+" p="+cc.partial+" s="+cc.miss+")");
    ck(dc.match>=12,"composition floor: deepseek match class >= 12 (got "+dc.match+")");
    const g1=it.filter(x=>x.claude.verdict===x.deepseek_rep1.verdict).length/n;
    const cm=it.filter(x=>x.claude.verdict==="match");
    const dm=it.filter(x=>x.deepseek_rep1.verdict==="match");
    const g2=cm.filter(x=>x.deepseek_rep1.verdict==="match").length/cm.length;
    const g3=dm.filter(x=>x.claude.verdict==="match").length/dm.length;
    const dv=it.filter(x=>x.deepseek_rep1.divergent);
    const g4rate=dv.length/n;
    const g4fix=dv.every(x=>typeof x.deepseek_rep1.divergent_fix==="string"&&x.deepseek_rep1.divergent_fix.trim().length>0);
    const g5=it.filter(x=>x.deepseek_rep1.verdict===x.deepseek_rep2.verdict).length/n;
    console.log("G1="+g1.toFixed(3)+" G2="+g2.toFixed(3)+" G3="+g3.toFixed(3)+" G4rate="+g4rate.toFixed(3)+" G5="+g5.toFixed(3));
    ck(g1>=0.80,"G1 aggregate exact agreement >= 0.80");
    ck(g2>=0.80,"G2 match-recall >= 0.80");
    ck(g3>=0.80,"G3 match-precision >= 0.80");
    ck(g4rate<=0.15,"G4 divergent rate <= 0.15");
    ck(g4fix,"G4 every divergent item names its alternative fix");
    ck(g5>=0.85,"G5 self-consistency >= 0.85");
    ck(f.gate&&f.gate.outcome==="PASS","recorded outcome is PASS");
    ck(Math.abs((f.gate.g1_aggregate||{}).rate-g1)<1e-9,"the recorded G1 equals the recomputed G1 -- the summary was derived, not typed");
    ck((f.gate.operator_read||[]).length>=5&&(f.gate.operator_read||[]).filter(o=>o.drawn_as==="seeded").length>=2,"5 operator dispositions, at least 2 drawn unconditionally");
    ck(f.accounting&&f.accounting.cost_usd>0&&f.accounting.reasoning_tokens>0,"E10: a positive dollar total and non-zero reasoning tokens");
    process.exit(fails.length?1:0);'

Expect the `G1=... G5=...` line, every assertion `PASS`, exit 0 -- YES/NO. This
probe recomputes all five gates from `items` and compares one against the
recorded summary, so a hand-typed `gate` block cannot pass. Note it counts
divergent items in G1-G3's denominators by construction, which is S2's structural
close.

**5. The graded lines are byte-copy deltas.**

    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun eval/sim/probe-graded-delta.ts "$FIXTURE_RUN_ID"

Expect a `PASS` line per assertion, a printed `PAIRS <n>` equal to the
fixture's answered-record count (60 unless the fixture was extended), exit 0 --
YES/NO. Every
`(answered, graded)` pair returns an empty `validateGradedDelta`, with a
non-emptiness floor on the pair count so an empty run file cannot pass.

**6. The corpus has not moved under the fixture** (E4 / F3):

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM chat_threads;"
    psql "$DATABASE_URL" -Atc "SELECT date_part('year', date_range_start)::int AS era, count(*) FROM chat_threads WHERE channel_name='#helpdesk' AND resolution_status='solved' GROUP BY 1 ORDER BY 1;"

Expect `40219` and the era histogram -- YES/NO. Executed verbatim at drafting
time (2026-08-06): the histogram read `2020|389 2021|768 2022|575 2023|649
2024|557 2025|487 2026|269`. Those are whole-channel counts, NOT the frozen
frame's pool (F1/F2: 3,164 solved non-noise, zero in 2026); they are quoted as a
shape check on the instrument, not as the pool. A `chat_threads` count other
than 40,219 is an E4/F3 event and stops the arc, not just this phase.

**7. The grader touched no database.**

    set -a; . /home/dev/projects/quakeworld-eval/apps/qw-oracle/.env; set +a
    psql "$DATABASE_URL" -Atc "SELECT count(*) FROM query_log;"
    cd /home/dev/projects/quakeworld-eval/apps/qw-oracle && bun -e '
    const f=await Bun.file("eval/sim/grader-fixture.json").json(); const t=f.telemetry||{};
    const fails=[]; const ck=(o,m)=>{console.log((o?"PASS ":"FAIL ")+m); if(!o) fails.push(m);};
    ck(typeof t.query_log_before==="number"&&typeof t.query_log_after==="number","telemetry block present");
    ck(t.query_log_before>0,"floor: the baseline count is non-zero, so the probe read a real table");
    ck(t.query_log_after===t.query_log_before,"E8/E3: zero query_log delta across the grading step (before "+t.query_log_before+", after "+t.query_log_after+")");
    ck(t.embedding_api_log_after===t.embedding_api_log_before,"zero embedding_api_log delta across the grading step");
    process.exit(fails.length?1:0);'

Expect every line `PASS`, exit 0 -- YES/NO. The `> 0` floor matters: a
before/after pair of two zeros would satisfy equality while proving the probe
never read anything. The live `psql` count is printed alongside so a reviewer can
see the recorded `after` is not stale.

## Outputs to next phase

Phases 5-9 may rely on exactly these:

- **`eval/sim/grade-prompt.ts`** -- `GRADE_PROMPT_TEMPLATE`,
  `GRADE_PROMPT_SHA256`, `GraderOutput`. The rubric is byte-pinned; any change
  invalidates every verdict taken under it and requires a re-grade of the
  affected run, which is cheap (grading does not re-answer) and must be recorded
  as a new `prompt_sha256`.
- **`eval/sim/grader.ts`** -- `gradeOne(input: GradingInput, opts?)`. Takes a
  `GradingInput` and nothing else; there is no `RunRecord` overload and none may
  be added, because E8's blindness is carried by the parameter list.
- **`eval/sim/run-grading.ts`** -- the CLI
  `--run-id <id> [--conc N] [--limit N] [--rep2 <path>]`. **Phase 5's pilot and
  Phase 6's bulk grading drive this same file.** It skips records with
  `error !== null`, resumes on `(record_id, stage)`, enforces
  `validateGradedDelta` at write time, and writes nothing to any database.
- **`eval/sim/question-specs.ts`** -- `sampleToQuestionSpecs()`, the
  `SampleThread[] -> QuestionSpec[]` loader neither Phase 2 nor Phase 3 claimed
  (F45). `exclude_thread_id` is the thread's own id; that assignment is D6's
  leave-one-out and Phases 5 and 6 must use this loader rather than re-deriving
  it.
- **`eval/sim/grader-fixture.json`** -- committed. The 60 items with all three
  verdicts, the confusion matrix, the five sub-gate outcomes, the composition,
  the era spread, `leakage`, `telemetry` and `accounting`.
- **The grader's measured self-consistency (G5).** Phase 6's post-bulk 5-10%
  re-grade has a **non-zero disagreement floor equal to this number**, not zero.
  A re-check disagreement rate at or below it is the expected result, not
  evidence of a grading problem; above it is worth investigating. Nothing else
  in the arc measures this and Phase 6 cannot derive it from its own data.
- **What is certified, and what is not.** This gate certifies the grader's
  aggregate agreement with Claude, and specifically its behaviour on the
  `match` class in both directions, within the OC curves above. It certifies
  **nothing per era, per domain, per cell, or per answer-length band** -- at
  n=60 a defect confined to any stratum smaller than ~12 items is invisible
  (S4), and the era-confined case (S3) is both the most likely and the one the
  arc's `divergent` mechanism is supposed to handle. **Phase 8 must not read a
  per-era or per-cell grading difference as an oracle property** without a
  targeted re-check, and the per-era `divergent` rate is the cheap tell that
  something is wrong there.
- **The measured E8 prose residue** (`leakage`): how many of 60 answers named a
  channel or a year in their own text. Field-level blindness is structural;
  this is the size of what leaks past it, and it is the only number in the arc
  that bounds it.
- **What this phase does NOT ship**, so no later phase plans on it: no pilot and
  no pilot slice (`TBD(phase-5: pilot slice composition and the D6 >=90%
  match/miss arithmetic)`); no explorer generator and no Runs tab (Phase 5, per
  F11); no bulk grading run and no headline; no Claude-side answering; no
  re-derivation of key quality -- Phase 3's spot-read gate is the only thing that
  certifies `truth`, and F41's per-domain limit stands unchanged. Whether Phase
  8 reports per-era match rates at all, given this phase leaves per-era grader
  behaviour uncertified, is `TBD(phase-8: per-era reporting under an
  aggregate-only grader certification)`.

## Open questions

1. **Fixture size: 60 triples (20 threads) or 36 (12 threads).** Default: **60**.
   Both detect the primary defect within 2 points (91.6% vs 89.7%), because the
   detection comes from the conditional match-class gate rather than from n.
   What 60 buys is a match class of ~20 instead of ~12, which drops the
   false-BLOCK against a healthy grader from 27.1% to 15.6% at r=0.90. The cost
   is 24 extra answering passes plus 48 extra grading calls. Overrule: operator,
   on cost; the gate arithmetic is unchanged by the choice and Task 8 recomputes
   from whatever `items` holds.
2. **Single grading call vs majority-of-3.** Default: **single**, with G5
   measuring the noise. D6 stage 3 specifies one compare-grading call and
   changing the instrument is an E1 spec matter. Majority-of-3 would raise
   effective consistency at 3x a cost that is a rounding error at ~1,500
   records, and it is the prescribed escalation **if G5 fails** -- but adopting
   it pre-emptively would mean the pilot and the bulk run measure with a
   different instrument than the one D6 describes, and the arc would have no
   record of what the single-call grader actually did. Overrule: operator, or a
   G5 failure.
3. **Claude as the reference grader.** Default: **yes**, blind and toolless,
   matching the subject's information exactly. The alternative -- the operator
   hand-grading 60 -- is a better reference and an unaffordable one; the
   operator sees 5 disagreements instead, drawn so that at least 2 are
   unconditional. Residual risk, stated: a systematically lenient Claude and a
   systematically lenient DeepSeek would agree with each other, and this gate
   would read clean. The 2 unconditional operator draws are the only instrument
   against that, and at n=2 they are a tripwire, not a check. Overrule:
   operator, by reading more.
4. **G1's threshold at 80%.** Default: 80%, tolerating 12 of 60. It is
   deliberately loose because G1 is a gross-breakage floor and the detection
   lives in G2/G3; tightening it to 85% would raise the combined false-BLOCK at
   r=0.90 from 15.6% to roughly 25% while adding almost nothing against the
   scenario that matters. Overrule: operator.
5. **`divergent_fix` carried in `grade.rationale` rather than as a schema
   field.** Default: in the rationale, prefixed `[divergent: <fix>]`. It is read
   only by a human in the review pile, and a second Phase 1 amendment for a
   display string would be the wrong trade against the F44 one, which is
   load-bearing. Overrule: operator, or a Phase 5 finding that the review pile
   needs it structured.
6. **F44's remedy: widen the delta set, or move `divergent` into `Grade`.**
   Default: widen. Moving it is arguably the cleaner shape but touches the
   interface, both fixtures, Phase 2's runner and any reader already written
   against the flat field. Overrule: operator; if overruled, Tasks 4 and 7
   re-plan and nothing else in this doc moves.

## Recovery

- **Task 0's F44 assertion reads FAIL.** Either Task 1 already ran, or Phase 1
  shipped a different permitted set than its doc describes. Read
  `validateGradedDelta`'s actual implementation before touching it and
  re-derive Task 1's amendment against what shipped. Do NOT apply the amendment
  blind -- E1's whole point is that a re-worded amendment is how a wrong figure
  reached a ratified document (F32).
- **`chatJson` throws "prompt must contain the word json" locally.** The rubric
  lost its literal lowercase `json` in an edit. This is E15 rule 1 and F38
  working exactly as designed -- a local throw before any spend. Restore the
  word; do not disable the assertion, and do not switch off `response_format`,
  which would make every reply a parse gamble.
- **`chatJson` throws on `finish_reason === 'length'`.** Raise `max_tokens`
  above 2048 and record why. Measured basis: 40 drafting calls averaged 489
  completion tokens of which 438 were reasoning, so a `length` finish at 2048
  means the answers are far longer than the fixture's or the model changed. E15
  rule 3 forbids accepting the truncated value in either case.
- **The gate comes out INCONCLUSIVE on a composition floor.** Extend the fixture
  by 8 threads from the same seeded order and re-run Tasks 5-8, capped at 36
  threads. Do NOT re-grade to reach a floor, and do NOT drop the floor -- an
  under-composed fixture certifies the easy boundary and is the exact trap the
  gate design is built around.
- **The gate BLOCKs.** First read G5. If self-consistency is below its floor the
  grader is noisy, not biased, and rewriting the rubric will not move G1-G3 --
  escalate to Open question 2 instead. If G5 is healthy and G2 or G3 failed,
  read the confusion matrix: a `match -> partial` concentration is the S1 defect
  and the rubric's `match` definition is where to look; a `match -> miss`
  concentration more likely means thin keys (F41), which is a Phase 3 property
  this phase cannot fix and must not paper over by loosening the `match`
  definition. Re-run Task 7 only -- the answers do not change, so a BLOCK costs
  grading calls, not answering passes.
- **The gate BLOCKs a third time.** Stop and take it to the operator with the
  three confusion matrices side by side. Three rubric revisions against a
  fixture of 60 is enough attempts to start fitting the fixture rather than
  fixing the rubric, and `revisions[]` exists so that is visible.
- **A non-zero `query_log` delta across the grading step.** Something in the
  grading path reached a database handle. Check `grader.ts`'s import graph
  first (Task 4's grep should have caught it) and then whether `run-grading.ts`
  imported a tool module for a "quick check". This is an E8 violation, it blocks
  the phase, and it is not fixable by subtracting the rows -- the concern is not
  the rows, it is that the grader had a handle at all.
- **`validateGradedDelta` returns a non-empty list at write time.** The graded
  line was built as a delta rather than a spread copy. The list names the fields
  that went missing. Rebuild it as `{ ...rec, ... }` per Task 7 step 3; do not
  relax the check, which is what E2's MAJOR-3 amendment exists to prevent.
- **`ctxFor` throws on an exclusion id during the fixture answering.** A
  non-decimal `thread_id` reached `question-specs.ts`. Phase 2 measured that
  `ARRAY['p8-01']::bigint[]` throws inside the retrieval SQL and, under Phase
  1's F22 re-throw, would fail all 40 cell-B and cell-C passes identically --
  reading as a harness collapse rather than as one bad row. Task 2's loader
  throws first and names the row; if it did not, the loader was bypassed.
- **More than 6 of 60 fixture answers failed.** Do not grade the survivors. A
  cell that fails more often has its rate computed over a survivor subset (E7
  amendment channel 3), and a fixture certifying a grader on a biased subset is
  worse than no fixture. Investigate the per-cell failure counts Task 5 printed.

---

## Probes run for this doc, and what was reasoned rather than run

**Run, read-only, against the dev twin (2026-08-06):** the `#helpdesk` solved
era histogram in phase-boundary probe 6, verbatim as written, using the main
checkout's `.env`. Result quoted there.

**Run, read-only, against the worktree:** `jq '.include'` on
`apps/qw-oracle/tsconfig.json` (seven patterns, no `eval/sim/**/*`) and
`ls apps/qw-oracle/eval/` (no `sim/` directory). Both confirm this phase's inputs
do not exist yet and are Phase 1's to create.

**Run, against the live DeepSeek API** (`deepseek-v4-flash`, `temperature: 0`,
`response_format: json_object`, `max_tokens: 2048`), from a scratch script
outside the repo, over 10 hand-built `{question, answer, truth}` triples written
to sit on verdict boundaries:

- **1 run of the loose `divergent` wording**: flagged 5 of 10, including an
  answer containing the recorded fix verbatim and a plain wrong-direction miss.
- **4 runs of the tightened three-condition wording with mandatory
  `divergent_fix`**: flagged the one intended case in 3 runs, and that case plus
  one spurious case in the fourth.
- **Self-consistency across those 4 runs**: 8 of 10 verdicts identical in all
  four; 2 flipped, both across an adjacent boundary (`partial` <-> `miss`); the
  `divergent` flag flipped once. Pairwise run-to-run agreement 8/10 to 10/10.
- **Token shape**: 717 prompt tokens and 489 completion tokens per call on
  average, of which 438 (~90%) were reasoning; `finish_reason` was `stop` on all
  50 calls; prompt caching engaged on repeat runs (13,056 of 14,334 prompt
  tokens cached on the fourth).

**Spend:** 50 calls, 34,805 prompt tokens and roughly 23,500 completion tokens.
No pinned pricing table exists in this repo yet (`pricing.ts` is Phase 2's), so
the dollar figure is an extrapolation from the Phase 2 checker's measured
~$0.011 over ~35 calls: **approximately $0.016**. Extrapolated, not measured.

**Reasoned and computed, not run:** every operating-characteristic figure in
"The gate" -- binomial arithmetic over the stated models, computed in a scratch
script. The models are stated with the tables so they can be checked rather than
trusted; the exact fixture sizes and class sizes are estimates until Task 8
computes them from real items, which is why Task 8 recomputes every gate from
`items` rather than reading a summary.

**Not run, and stated so:** probes 1-5 and 7 exercise code that does not exist.
The 10 triples used above are synthetic, written by the drafter; their "intended"
verdicts are the drafter's own judgment and are not ground truth. Only the
self-consistency measurement is independent of that judgment, which is why it,
and not the intended-verdict agreement, is the number G5 is calibrated against.
