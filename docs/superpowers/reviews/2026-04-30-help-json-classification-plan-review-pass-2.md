# Help-JSON Classification Plan — Fresh-Eyes Review (Pass 2, Post-Revision)

**Plan:** `docs/superpowers/plans/2026-04-30-help-json-classification-infrastructure.md` (revised 2026-04-30 after pass-1 review)
**Reviewer:** fresh Claude session, no prior context with the brainstorm or the pass-1 reviewer
**Stance:** operator asked for pushback, not consensus. Treating "did the revision actually fix the prior findings?" as a hypothesis to test, not a default to accept. Findings ranked critical / important / nit.

---

## TL;DR

The revision **resolves all 5 critical findings and most of the 6 important findings** from the pass-1 review. C1 (ripgrep dropped), C2 (regex over union of names), C3 (Finding-shape rewrite + ReviewCounts extension), C4 (explicit Step 7 with `--fail-on` flag), and C5 (taxonomy down to 6 values) are all visibly addressed in the plan body. I1, I2, I3, I5, I6 are also addressed.

But the revision **introduces or leaves unaddressed several critical issues** the pass-1 review didn't see — most importantly:

- **`draft-writer.ts` is not modified by the plan.** Its `total` calculation and Summary section hard-code the original 5 buckets. With the new bucket added, the Summary will silently under-count the total and never surface help-json findings to the operator at the top of the draft.
- **The `extraction-review` skill at `~/.claude/skills/extraction-review/SKILL.md` has a bucket-keyed routing table** (lines 284-296). The plan never updates it, so when an operator walks a `help-json-classification` finding through the skill, there's no routing entry — the skill's per-bucket per-disposition side-effects table breaks for the new bucket.
- **The `--fail-on` CLI pseudo-code uses commander.js syntax (`.option()`)** but the existing `runReviewCli` (and the entire `load-knowledge/index.ts` CLI) uses Node's built-in `parseArgs` from `util`. Implementer who copies the pseudo-code verbatim will hit a parse-time error.
- **`PROJECT_REPOS` placeholders for FTE/QWCL/MVDSV are misleading.** Verified against the DB: only ezQuake has any `doc_only` entities (194); FTE/MVDSV/QWCL have 0. Verified against repo: only `ezquake-source` and `unezquake` have `help_*.json` files; FTE/MVDSV/QWCL have none. The "just add to PROJECT_REPOS" framing leaks scope by suggesting future cross-project work that has no current basis.
- **`last_source_file_pre_walk` will frequently be `None` or wrong** because the `file_re` only matches `+++ b/<path>`, not `--- a/<path>`. Whole-file deletions (the common case for retired entities) emit `+++ /dev/null`, so the parser doesn't capture the file path. Validator passes because it only checks key-presence, not None-rejection.
- **`git log --all` allows orphan-branch removals to set `retired_at_commit`** to a SHA that's not reachable from upstream main. PR digest output will reference unreachable commits.

Plus a few important issues around test coverage (the gate's exit-code behavior is verified only by manual smoke, not by an automated test), architecture (the seed loader couples `runReview` to disk I/O — was a pure DB consumer before), and timing claims (`5-15s` in the plan is closer to `20-40s` in reality based on a measured `git log` of ~168 MB completing in 8.25s for ezquake).

The plan is closer to ready than pass-1 was, but four of the six critical findings below would block clean execution and at least two more would yield silently-wrong behavior the operator wouldn't catch from the visible artifacts. **Recommendation: don't start execution until at least Critical 1, 2, 3 are addressed.**

---

## Pass-1 findings: did the revision actually fix them?

| Finding | Status | Notes |
|---|---|---|
| **C1** ripgrep strips commit context | ✓ FIXED | Pure-Python parser at `parse_git_log_stream`. State machine over commit boundaries. |
| **C2** rename regex misses source-backed siblings | ✓ FIXED | `build_blame_index` takes union of `doc_only_names | source_backed_names`. |
| **C3** Finding shape mismatch with `Finding` interface | ✓ FIXED | Two-arg `makeFindingId`, entity goes in `evidence.entity_ref`, `ReviewCounts` extended in types.ts and counts initializer. |
| **C4** doc_only budget gate undescribed code | ✓ FIXED | Explicit Task 5 Step 7 adds `--fail-on <bucket>` flag with `process.exit(2)`. (But: pseudo-code is wrong framework — see Critical 3 below.) |
| **C5** `retired_during_walk` unreachable | ✓ FIXED | Taxonomy now 6 values; plan body explains why. |
| **I1** Task 5 not parallel-safe with Task 4 | ✓ FIXED | Plan now sequences Task 5 strictly after Task 4 Step 3. |
| **I2** classify-help-json shouldn't be per-project | ✓ FIXED | Moved to `apps/qw-oracle/scripts/classify-help-json.py` with `--project` flag and `PROJECT_REPOS`. (But: see Critical 4 — the cross-project framing is misleading.) |
| **I3** cache file mentioned but never written | ✓ FIXED | Plan explicitly drops cache references and updates timing claim. (But: 5-15s timing claim is now optimistic — see Important 5.) |
| **I4** smoke test predicts working state | ✓ FIXED | Now contingent on C1+C2 fixes, which are present. |
| **I5** HANDOVER cleanups unconditional | ✓ FIXED | Task 8 Step 1 now verifies the seed before deletion. |
| **I6** `extractor_gap` placeholder sidequest | ✓ FIXED | Validator rejects `^\s*\(` strings; auto-classifier no longer proposes `extractor_gap`. |
| **N1** `BlameIndexEntry` unused in tests | ✗ STILL PRESENT | Imported but not referenced in any test body. |
| **N3** `git log --all` orphan branches | ✗ STILL PRESENT | Now elevated to Critical 6 — see below. |
| **N4** `last_source_line_pre_walk: None` wart | ⚠ PARTIAL | Plan made `last_source_line_pre_walk` optional, but `last_source_file_pre_walk` has the same bug for whole-file deletions and is still required. See Critical 5. |
| **N6** quoted-string regex misses some renames | ✗ STILL PRESENT | Acknowledged implicitly by docstring but no comment says so. |

So: 5/5 criticals fixed, 6/6 importants fixed, 2/3 nits unfixed (N1 cosmetic, N3 elevated to critical, N4 partial, N6 unfixed). Net: revision quality is high on the things it tried to fix; misses the ones it didn't look for.

---

## Critical issues (block execution; fix before starting)

### C1. `draft-writer.ts` is not modified by the plan

**Where:** Task 5 file list + draft-writer.ts:84-92.

**Issue:** The plan modifies `types.ts` (Bucket, ReviewCounts) and `index.ts` (counts initializer + finder list), but NEVER touches `draft-writer.ts`. That file pattern-matches on the original five buckets:

```typescript
// draft-writer.ts:84
const total = c.addition + c.retirement + c['semantic-crossing'] + c.unclassified + c['source-invisible'];
return [
  '## Summary',
  '',
  `- Additions: ${c.addition} (${c.addition} pending)`,
  `- Retirements: ${c.retirement} (${c.retirement} pending)`,
  `- Semantic crossings: ${c['semantic-crossing']} (${c['semantic-crossing']} pending)`,
  `- Unclassified promotions: ${c.unclassified} (${c.unclassified} pending)`,
  `- Source-invisible changes: ${c['source-invisible']} (${c['source-invisible']} pending)`,
  `- **Total:** ${total}`,
].join('\n');
```

After Task 5 lands, if 30 help-json findings are emitted, the draft's Summary section will say:
- Additions: X
- Retirements: Y
- Semantic crossings: Z
- Unclassified: W
- Source-invisible: V
- **Total:** X+Y+Z+W+V (under-counts by 30)

The 30 help-json findings appear in the Findings section but are invisible at the top. The operator scrolling the draft sees a Total that's wrong, no Help-JSON line, and might assume there's nothing in that bucket because the Summary doesn't mention it.

**This is silently-broken behavior** — TypeScript still compiles (the new key exists on `c`), tests still pass (no test exercises renderSummary against a help-json count), and the gate still fires correctly (gate reads `report.counts`, not the markdown). The bug surfaces only when the operator opens the draft and trusts the summary.

**Fix:** Plan must add `draft-writer.ts` to Task 5's modified-files list, with this change:
```typescript
const total = c.addition + c.retirement + c['semantic-crossing'] + c.unclassified +
              c['source-invisible'] + c['help-json-classification'];
return [
  '## Summary',
  '',
  // ... existing 5 lines ...
  `- Help-JSON classifications: ${c['help-json-classification']} (${c['help-json-classification']} pending)`,
  `- **Total:** ${total}`,
].join('\n');
```

This is the kind of thing the pass-1 review didn't catch because it asked "does the gate work" and not "does every consumer of ReviewCounts handle the new key". With strict TypeScript on `ReviewCounts` (no index signature), draft-writer's pattern-match-by-name is silent: `c['help-json-classification']` simply isn't read.

### C2. `extraction-review` skill (`~/.claude/skills/extraction-review/SKILL.md`) has no routing entry for the new bucket

**Where:** Plan's Task 5 + downstream consumer not in the plan.

**Issue:** The skill at `~/.claude/skills/extraction-review/SKILL.md` is the operator's tool for walking findings through dispositions. Its routing table at lines 284-296 is keyed on `(bucket, disposition) → side-effect`:

```
| Bucket              | Disposition        | Side-effect                                          |
|---------------------|--------------------|------------------------------------------------------|
| addition            | classify           | Edit the appropriate seed YAML ...                   |
| addition            | concept-note       | ...                                                   |
| addition            | reject-as-noise    | ...                                                   |
| retirement          | mark-orphan        | ...                                                   |
| retirement          | classify           | ...                                                   |
| retirement          | concept-note       | ...                                                   |
| semantic-crossing   | classify           | ...                                                   |
| semantic-crossing   | concept-note       | ...                                                   |
| semantic-crossing   | reject-as-noise    | ...                                                   |
| unclassified        | classify           | ...                                                   |
| unclassified        | handover           | ...                                                   |
| source-invisible    | concept-note       | ...                                                   |
| source-invisible    | handover           | ...                                                   |
| any                 | reject-as-noise    | No file change; rejection recorded in draft.         |
```

The plan emits findings in a new bucket `help-json-classification` with `proposed_disposition.kind: 'classify'`. The routing table has nothing for `(help-json-classification, classify)`. The "any / reject-as-noise" fallback doesn't cover this case.

**Two layered concerns:**
1. **Procedural:** the skill is user-global (lives at `~/.claude/skills/`), not in the project repo. Updating it isn't part of the plan's commit set, but it IS part of the change for this feature to work end-to-end. The plan must call out the skill update as a delivery item.
2. **Semantic:** what is the right side-effect for `(help-json-classification, classify)`? Probably "run `python scripts/classify-help-json.py --project <p> --propose` and append the result to the seed YAML". But that's a different shape than the existing routing entries (which all assume an in-place edit on a seed YAML or a direct DB UPDATE). The skill needs a dedicated section explaining the new workflow, not just a one-line table addition.

There's also a third concern: the plan's `proposed_disposition.rationale` says: `'Run scripts/classify-help-json.py --project ' + project + ' --propose to generate a proposal, then operator-review and append to the seed YAML.'` — but this routes the operator AWAY from the skill and INTO a manual CLI flow. So maybe the bucket isn't meant to be skill-walked at all? If so, the plan should explicitly say so and the skill should know to skip findings with this bucket.

**Fix options:**
1. **Skill update task:** Add Task 7 Step 4 (or a new Task 9): update SKILL.md's routing table with `(help-json-classification, classify) → run classify-help-json.py + append to seed`. Operator skill update is a user-global change, but the plan should document it.
2. **Skill-skip:** Add a note in the skill that `help-json-classification` findings are NOT walked individually — the gate fires, operator runs the dedicated CLI, re-runs review until gate passes. This is operationally cleaner. Plan should specify which model.

Either way, the plan currently leaves this in a half-finished state.

### C3. `--fail-on` pseudo-code uses commander.js syntax against a parseArgs CLI

**Where:** Task 5 Step 7.

**Issue:** Plan's pseudo-code:
```typescript
.option('--fail-on <bucket>', 'Exit non-zero when the named bucket has any findings (repeatable)', (value, prev: string[] = []) => prev.concat([value]), [])
```

This is **commander.js** API. The actual CLI at `apps/qw-oracle/scripts/load-knowledge/index.ts` uses **Node's built-in `parseArgs` from `util`** (see runReviewCli at lines 402-443):

```typescript
const { values } = parseArgs({
  args,
  options: {
    project: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    out: { type: 'string' },
    'ezquake-repo': { type: 'string' },
    force: { type: 'boolean' },
  },
});
```

`parseArgs` doesn't have `.option()`. Repeatable flags use `multiple: true`:
```typescript
'fail-on': { type: 'string', multiple: true }
```

Then `values['fail-on']` is `string[] | undefined`.

The plan acknowledges "Pseudo-code; adapt to the existing argparse / commander shape" but the choice of commander syntax is a sign the plan author didn't verify against the actual code. An implementer who follows the plan literally will fight TypeScript / runtime errors before realizing the framework mismatch.

**Fix:** Rewrite Step 7 with parseArgs-correct shape:
```typescript
const { values } = parseArgs({
  args,
  options: {
    // ... existing entries ...
    'fail-on': { type: 'string', multiple: true },
  },
});

// After runReview returns the report:
const failOnBuckets = (values['fail-on'] as string[] | undefined) ?? [];
for (const bucket of failOnBuckets) {
  const count = (report.counts as Record<string, number>)[bucket] ?? 0;
  if (count > 0) {
    process.stderr.write(
      `Gate fail: bucket '${bucket}' has ${count} findings.\n` +
      `Resolve via classify-help-json.py --project ${values.project} or pass --force.\n`
    );
    process.exit(2);
  }
}
```

Also: the existing `runReviewCli` calls `process.stdout.write(JSON.stringify(report, null, 2) + '\n')` after `runReview`. The plan's gate logic needs to fire BEFORE that JSON dump (or after, with care to not produce confusing output where the JSON gets emitted and THEN the gate fails). Decide and document.

### C4. PROJECT_REPOS for FTE/QWCL/MVDSV is YAGNI placeholder, not a clean defer

**Where:** Task 3 + plan-wide cross-project framing.

**Issue:** Verified facts:
- DB query (`SELECT project, source_state, COUNT(*) FROM entities GROUP BY project, source_state`):
  - ezquake: 194 doc_only, 3835 source_backed, 13 source_retired
  - fte: 0 doc_only, 3279 source_backed
  - mvdsv: 0 doc_only, 1236 source_backed
  - qwcl: 0 doc_only, 380 source_backed
- File system: `find research/repos -name "help_*.json"` returns ONLY `ezquake-source` and `unezquake`. No `fteqw`, no `mvdsv`, no QWCL clone.
- Source: `qwcl/_handler_cmdline.py:8` ("no `help_cmdline_params.json`"), `qwcl/_handler_commands.py:9` ("no `help_commands.json`").

So `doc_only` is structurally an **ezQuake-only state** in this codebase right now. FTE/QWCL/MVDSV will never produce doc_only entities through the existing extraction pipeline because they have no help-JSON file to compare source against.

The plan's PROJECT_REPOS table:
```python
PROJECT_REPOS: dict[str, Path] = {
    "ezquake": REPO_ROOT / "research/repos/ezquake-source",
    "fte":     REPO_ROOT / "research/repos/fteqw",
    "qwcl":    REPO_ROOT / "research/repos/qwcl-source",     # placeholder; verify
    "mvdsv":   REPO_ROOT / "research/repos/mvdsv",
}
```

Reads as "infrastructure ready for any project". But it actually does nothing for those three — running `classify-help-json.py --project fte --propose` would print "[fte] doc_only entities: 0" and exit 0. The placeholders give the false impression that onboarding FTE means "add to PROJECT_REPOS and you're done", when the actual prerequisite is "the project gains a help-JSON file" (which isn't on the roadmap for any of them).

The "What this plan does NOT include" section perpetuates this:
> FTE/QWCL/MVDSV onboarding to the same infrastructure (separate Arc D once ezQuake validates the shape — the cross-project CLI shape is already in place; just add the project to `PROJECT_REPOS` and create the seed file).

This is misleading. There's no Arc D to defer to because the precondition doesn't exist.

**Fix options:**
1. **Drop the placeholders.** Make PROJECT_REPOS single-entry for ezquake. Add a comment: "Other projects don't have help-JSON files; this CLI applies only when a project's source tree includes `help_*.json`." Defer FTE/QWCL/MVDSV onboarding to "if/when those projects gain help-JSON conventions" rather than "Arc D". This sets correct expectations without removing the cross-project SHAPE that's still good design.
2. **Keep placeholders but rewrite framing.** Plan's "deferred" section should say: "FTE/QWCL/MVDSV currently have no help-JSON files, so doc_only entities don't accumulate for them. PROJECT_REPOS is structured to support future addition if any project gains a help-JSON convention; until then, the entries are inert."

Either way, the current framing leaks scope and creates a phantom Arc D.

Side note: The pass-1 review's I2 fix (shared CLI vs per-project CLI) was the right call architecturally — it's just that the cross-project rationale ("FTE/QWCL/MVDSV onboarding") doesn't hold up. The shared CLI is still better than per-project, but for the simpler reason "less code".

### C5. `last_source_file_pre_walk` will frequently be `None` due to file_re scope

**Where:** Task 2, `parse_git_log_stream` + `classify_from_blame`.

**Issue:** The parser captures the file path from `+++ b/<path>` lines:
```python
file_re = re.compile(r"^\+\+\+ b/(.+)$")
...
m_file = file_re.match(line)
if m_file:
    cur_file = m_file.group(1)
    continue
```

For whole-file deletions, real `git log -p` output is:
```
diff --git a/cmdline_params_ids.h b/cmdline_params_ids.h
deleted file mode 100644
index a6e6522b..00000000
--- a/cmdline_params_ids.h
+++ /dev/null
@@ -1,75 +0,0 @@
-CMDLINE_DEF(client_nosound, "-nosound"),
...
```

The `+++ /dev/null` line doesn't match `file_re`. So `cur_file` retains whatever was set by the LAST `+++ b/<path>` match — possibly None (if this is the first file in the commit) or possibly a path from a previously-seen file in the same or earlier commit.

Result: every removal event from a whole-file deletion gets `file=None` (or `file=wrong-path`) attached. The plan's `classify_from_blame` then fills:
```python
"last_source_file_pre_walk": last_removal.get("file"),
```

— which is None for these cases.

The schema (`REQUIRED_PER_CLASSIFICATION[Classification.RETIRED_PRE_WALK_FLOOR]`) lists `last_source_file_pre_walk` as REQUIRED. The validator only checks key-presence, not None-rejection:
```python
required_extra = REQUIRED_PER_CLASSIFICATION[cls]
missing_extra = required_extra - set(entry.keys())
if missing_extra:
    raise ClassificationError(...)
```

So `last_source_file_pre_walk: None` passes validation and lands in the seed YAML. Then PR digest renders something like:
```
- `-old-feature` was removed in commit deadbeef (2010-05-01).
```
— without the file context the schema promised was required.

The pass-1 review's N4 made `last_source_line_pre_walk` optional. The same logic applies to the file path for whole-file deletions, but the plan didn't extend the optionality.

**Fix options:**
1. **Fix the parser:** match both `--- a/(.+)` and `+++ b/(.+)`, prefer the non-`/dev/null` side. Code:
   ```python
   file_a_re = re.compile(r"^\-\-\- a/(.+)$")
   file_b_re = re.compile(r"^\+\+\+ b/(.+)$")
   ...
   m_a = file_a_re.match(line)
   if m_a:
       pending_file_a = m_a.group(1)
       continue
   m_b = file_b_re.match(line)
   if m_b:
       cur_file = m_b.group(1)  # +++ b/path
       pending_file_a = None
       continue
   if line == '+++ /dev/null' and pending_file_a:
       cur_file = pending_file_a  # whole-file deletion: use --- a/ path
       pending_file_a = None
       continue
   ```
2. **Make `last_source_file_pre_walk` optional** in the schema, parallel to the existing line-number optionality.

Option 1 is correct (the path is recoverable, parser just isn't reading it). Option 2 is a giveup. Recommend option 1.

Also: the `aspirational_documentation` fallback's docstring says "If string IS in current HEAD source, operator should re-classify as extractor_gap" — but the auto-classifier never CHECKS whether the name is in source_backed. By the time the proposal reaches operator review, the operator has to manually verify HEAD source. A small `if name in source_backed_names: return {classification: 'aspirational_documentation', ..., evidence_note: '...string IS in current source per source_backed set; consider extractor_gap classification'}` would surface this directly. Currently the classifier has access to that information but doesn't use it. (Important, not Critical.)

### C6. `git log --all` makes `retired_at_commit` point to commits unreachable from upstream main

**Where:** Task 2, `run_git_log` + `classify_from_blame`.

**Issue:** Pass-1 review's N3 flagged this as a "probably fine" nit. Re-examining: it's a real correctness issue that surfaces in PR digest output.

`git log --all -p --no-merges` walks all refs, including stale feature branches that never merged. If a long-lived experimental branch had `-foo` removed at commit X (orphan) and the head's history removes `-foo` at commit Y (merged), the parser sees both events. `classify_from_blame` picks `removals[-1]` (last by date), which could be the orphan-branch commit.

Result: `retired_at_commit: <orphan-sha>` lands in the seed YAML. PR digest renders:
```
- `-foo` was removed in commit <orphan-sha> (2018-XX-XX).
```

The upstream PR reviewer sees a SHA that they can't `git show` because it's not reachable from their main branch. They'd have to dig.

For ezQuake specifically, the history is mostly linear so this risk is low. But it's not zero — `git branch -a` shows historical experimental branches. And as the infrastructure scales (cross-project, longer time-windows), the risk grows.

**Fix options:**
1. Use `git log --first-parent` to follow merges through the main branch only.
2. Filter `cur_commit` against `git rev-list HEAD` to ensure reachability.
3. Pass an explicit branch ref to the CLI (`--ref upstream/master`).

Option 1 is simplest and matches "events the upstream considers part of its history". Recommend option 1 unless there's a specific reason to walk all branches.

---

## Important issues (significant rework, but plan can proceed once addressed)

### I1. Gate behavior is verified only by manual smoke, not by automated test

**Where:** Task 5 Steps 2-5 (test) vs Step 8 (manual verify).

**Issue:** The plan's TS test (`findings-help-json-classifications.test.ts`) tests the FINDER:
- "emits a finding for each unclassified doc_only entity" ✓
- "zero findings when seed covers all doc_only entries" ✓

But the GATE behavior — "exit code 2 when bucket has findings, exit code 0 otherwise" — is verified only by Step 8's manual smoke (`echo "exit code: $?"`). No test exercises:
1. CLI with `--fail-on help-json-classification` against a DB+seed where findings exist → exit 2.
2. CLI with `--fail-on help-json-classification` against a DB+seed where seed covers everything → exit 0.
3. CLI without `--fail-on` against a DB+seed where findings exist → exit 0 (gate is opt-in).

If a future refactor breaks the gate (e.g., changes the exit code, or moves the gate before runReview), tests won't catch it. The user of `--fail-on` in CI/VALIDATION-RUNBOOK depends on this exit-code contract being stable.

**Fix:** Add an integration test that uses `child_process.execFileSync` (or Bun's equivalent) to run the actual CLI against a fixture DB+seed, asserts exit codes 0 and 2 in the right scenarios. This is the kind of test the plan's "manual verification only" gap most needs.

### I2. `runReview` couples to disk I/O for the seed YAML

**Where:** Task 5 Step 6 + index.ts:36-92 architecture.

**Issue:** The plan inlines `loadHelpJsonSeed` call inside `runReview`:
```typescript
const helpJsonSeed = loadHelpJsonSeed(options.project);
const rawFindings: Finding[] = [
  ...findHelpJsonClassifications(options.db, options.project, helpJsonSeed),
];
```

Existing finder modules are pure DB consumers — they all take `(db, project, fromVersion, toVersion)` and return `Finding[]`. The new pattern adds a filesystem-side dependency at the orchestration layer.

Test-wise this is awkward: how do you test `runReview` with a controlled seed? You can't pass it in. The test has to set up the disk file at the exact path `loadHelpJsonSeed` reads from.

**Fix options:**
1. Add `helpJsonSeed?: SeedMap` to `RunReviewOptions`. Caller (CLI) loads the seed and passes it in. `runReview` is back to pure DB consumer + plumbing.
2. Move `loadHelpJsonSeed` into `findings-help-json-classifications.ts` itself, with a default-path fallback that the test overrides via dependency injection.

Option 1 keeps the existing pattern of "options bag carries everything"; option 2 keeps the finder self-contained. Either works; current plan does neither.

### I3. The new bucket is project-scoped, not tag-pair-scoped — re-runs duplicate findings

**Where:** Task 5 + draft caching semantics.

**Issue:** Existing finders are tag-pair-scoped: `findAdditions(db, project, fromVersion, toVersion)`. The query against `change_events` filters by `to_version = ?`, so each tag-pair produces a tag-pair-specific finding set.

The new finder is project-scoped: `findHelpJsonClassifications(db, project, seed)`. The query against `entities` filters only by `project = ? AND source_state = 'doc_only'`. **Every review run, regardless of tag-pair, emits the same findings.**

If the operator runs `review --from 3.6.6 --to 3.6.7` and then `review --from 3.6.7 --to 3.6.8`, both drafts will have all unclassified doc_only entries duplicated. The reader of the second draft sees findings that have nothing to do with the 3.6.7→3.6.8 transition.

This is documented behavior — the plan says the new module is project-scoped — but the consequence isn't called out. Worth a sentence in the plan body explaining that the help-json bucket is "always-on" and reviewers should expect to see it on every tag-pair until the seed is up to date.

**Fix:** Add a paragraph in the plan body (probably under Task 5 Step 6 or Execution Notes) explaining that the bucket is project-scoped, not tag-pair-scoped. Operators expecting tag-pair-specific findings should know to look elsewhere for those.

### I4. The auto-classifier doesn't use `source_backed_names` to refine the additions-only fallback

**Where:** Task 2, `classify_from_blame`'s additions-only branch.

**Issue:** The branch:
```python
# Additions only, or other shapes — operator review needed.
return {
    "classification": "aspirational_documentation",
    "confidence": "low",
    "evidence_note": (
        "Blame events present but no clear rename or retirement signal. "
        "If string IS in current HEAD source, operator should re-classify "
        "as extractor_gap with a HANDOVER sidequest reference."
    ),
}
```

The classifier has `source_backed_names` available — that's literally a parameter. It could check:
```python
if name in source_backed_names:
    # The string IS source-backed but the entity is doc_only — extractor missed it.
    # This is operator-manual-only (extractor_gap requires a real sidequest);
    # but we can hint at it.
    return {
        "classification": "aspirational_documentation",
        "confidence": "low",
        "evidence_note": (
            f"String '{name}' IS in source_backed names — extractor likely missed a "
            f"registration site. Operator should hand-edit to extractor_gap with a "
            f"real sidequest reference."
        ),
    }
```

But wait: doc_only entities by definition aren't in source_backed_names. So `name in source_backed_names` would never be true for an entry being classified. The check would always be False.

OK, so the question is: is "additions exist in history but entity is doc_only and not source_backed" a coherent state? Possibilities:
- Additions inside `#if 0` blocks or comment regions — libclang skips, but the string literal is in the file as text.
- Additions in a build-flag-gated path (Windows-only when extractor parses Linux build).
- Additions in a file that the extractor doesn't walk (e.g., `_legacy/` excluded).

For all of these, the ground truth is "extractor missed something" — `extractor_gap` semantics. The auto-classifier returning `aspirational_documentation` is a misclassification, even at low confidence.

But changing the kind requires the operator to provide a sidequest reference (per validator). The classifier can't generate one.

**Fix:** Either:
1. Change the kind to `aspirational_documentation` only when there are NO blame events (no additions, no removals — the truly never-existed case). For "additions only" cases, route to manual review (confidence: 'low', evidence_note: "Auto-classifier cannot determine: additions exist in history but entity is doc_only. Investigate manually — either retired_pre_walk_floor with missed removal, or extractor_gap.").
2. Push the additions-only case to a "needs operator triage" sentinel state that's distinct from the four auto-proposed kinds. The validator would reject this state, forcing manual review.

Either is better than the current "low-confidence aspirational" misclassification.

### I5. Source-backed sibling check doesn't filter by entity type

**Where:** Task 2, `classify_from_blame` + Task 3, `fetch_source_backed_names`.

**Issue:** `fetch_source_backed_names` returns ALL source_backed names in the project, regardless of type:
```python
def fetch_source_backed_names(db: sqlite3.Connection, project: str) -> set[str]:
    rows = db.execute(
        "SELECT name FROM entities WHERE project = ? AND source_state = 'source_backed'",
        (project,),
    ).fetchall()
    return {r[0] for r in rows}
```

`classify_from_blame` then matches siblings across all types:
```python
for sibling, sibling_events in blame.items():
    if sibling == name or sibling not in source_backed_names:
        continue
```

If a doc_only `cmdline_param` named `-foo` and a source_backed `cvar` named `foo` are both in the project, AND they happen to share a removal/addition in the same commit (rare but possible), the classifier would propose:
```
{classification: 'renamed', rename_to: 'foo'}
```

But `foo` (cvar) and `-foo` (cmdline_param) are DIFFERENT entity types. The rename_to should be type-equivalent.

In practice, name collisions across types are rare in QW (different prefix conventions: `-` for cmdline, `_` for cvar), but not guaranteed. And the plan's "Update Tests" instruction at I5 from pass-1 review didn't address this.

**Fix:** Filter source_backed by type. Pass `(name, type)` pairs through:
```python
def fetch_source_backed_by_type(db, project) -> dict[str, set[str]]:
    rows = db.execute(
        "SELECT type, name FROM entities WHERE project = ? AND source_state = 'source_backed'",
        (project,),
    ).fetchall()
    result: dict[str, set[str]] = {}
    for (t, n) in rows:
        result.setdefault(t, set()).add(n)
    return result
```

Then `classify_from_blame(name, etype, blame, source_backed_by_type)` only checks siblings of the same type.

### I6. Timing claim "5-15s" understates real cost

**Where:** Plan body, multiple places ("~5-10s", "~5-15s", Task 3 Step 2 "runs for ~5-15s").

**Issue:** Measured: `git log --all -p --no-merges --pretty=format:'===COMMIT===%n%H%n%ad%n' --date=short` on `research/repos/ezquake-source` produces 168 MB of output in 8.25 seconds. That's just git's I/O.

The Python pipeline has to additionally:
1. Buffer that 168 MB into Python via `subprocess.run(..., capture_output=True, text=True)`.
2. Split into lines (`raw.splitlines()` over ~3-5 million lines).
3. For each line, run the alternation regex (~5000 alternates after include source-backed).
4. For each match, look up name in the `names` set and append.

Python regex against ~5000 alternates over ~3-5M lines is going to be 15-30 seconds on its own. Total: 25-40 seconds, not 5-15.

Not a blocker. But the plan's "ongoing cost: ~10s of git-log parse + ~30 seconds of operator review per new mystery" is wrong on the parse side.

**Fix:** Measure and update timing claims. Either accept 25-40s (still fine since it's not per-review, only per `classify-help-json` invocation) or stream the git output instead of buffering (`subprocess.Popen` + line iteration). Streaming is cleaner but more code; the plan is fine staying with buffer + measure.

### I7. `find_help_json_classifications` test fixture doesn't exercise multi-type entries

**Where:** Task 5 Step 2, test fixture.

**Issue:** The test inserts only `cmdline_param` rows:
```python
INSERT INTO entities (project, type, name, source_state) VALUES
  ('ezquake', 'cmdline_param', '-classified', 'doc_only'),
  ('ezquake', 'cmdline_param', '-unclassified', 'doc_only'),
  ('ezquake', 'cmdline_param', '-active', 'source_backed');
```

But the actual ezQuake `entities` table has 194 doc_only across multiple types (cvar, command, macro, cmdline_param). The test doesn't verify the finder handles cvar/command/macro doc_only entries the same way. The query is type-agnostic (`WHERE source_state = 'doc_only'`), so it should — but no test confirms it.

**Fix:** Add multiple types to the fixture. Cheap addition, removes ambiguity.

### I8. `parse_git_log_stream` test fixture doesn't match real git output shape

**Where:** Task 2 Step 1, test_parse_git_log_stream_captures_co_occurrence fixture.

**Issue:** Fixture:
```python
raw = """===COMMIT===
0d7ea051f0a06784ef59f79fe7f8488df3bc08c9
2018-07-21

diff --git a/cmdline_params_ids.h b/cmdline_params_ids.h
+++ b/cmdline_params_ids.h
-CMDLINE_DEF(client_video_gl_debug, "-gl-debug"),
+CMDLINE_DEF(client_video_r_debug, "-r-debug"),
"""
```

Real git output for the same commit (verified):
```
diff --git a/cmdline_params_ids.h b/cmdline_params_ids.h
index 605bb9c5..86ac533f 100644
--- a/cmdline_params_ids.h
+++ b/cmdline_params_ids.h
@@ -31,7 +31,7 @@ CMDLINE_DEF(client_video_displaynumber, "-display"),
 CMDLINE_DEF(client_video_conwidth, "-conwidth"),
 CMDLINE_DEF(client_video_conheight, "-conheight"),
 CMDLINE_DEF(client_video_glsl_renderer, "-glsl-renderer"),
-CMDLINE_DEF(client_video_gl_debug, "-gl-debug"),
+CMDLINE_DEF(client_video_r_debug, "-r-debug"),
 CMDLINE_DEF(client_nostdinput, "-noconinput"),
 ...
```

The fixture is missing: `index ...`, `--- a/<path>`, `@@` hunk header, leading-space context lines. The parser handles these correctly via the "skip non-+/- lines" check, but the test fixture doesn't exercise that path.

For testing the C5 fix above (whole-file deletion path attribution from `--- a/<path>`), a real-shaped fixture is required. The current fixture happens to pass for the rename test but doesn't catch the file-attribution bug.

**Fix:** Either:
1. Use a real-shape multi-line fixture with `index`, `---`, `@@`, context lines, and both rename + deletion shapes.
2. Add a separate test that uses a tiny fixture repo (init + add + commit + remove + commit) and runs the actual `git log -p` against it. End-to-end coverage that catches parser bugs unit tests can't.

Option 2 is more work but catches the C5 class of bug. Option 1 is good enough for now if the parser is fixed for whole-file deletions.

---

## Nits (worth fixing but not blocking)

### N1. `BlameIndexEntry` import unused in tests (still present from pass-1)

Same as pass-1 N1. Plan's test imports `BlameIndexEntry` but never references it. Dead import. Worth dropping or constructing a fixture from it.

### N2. `aspirational_documentation` semantics overlap with `never_implemented` is not docstring'd

Plan's taxonomy table distinguishes them, but the difference is operator narrative:
- `never_implemented`: code never existed.
- `aspirational_documentation`: feature was intended/planned but not coded.

Both have `evidence_note` as the only required field, both produce `upstream_pr_action: 'none'` (well, no — `never_implemented` is `remove_from_help_json`, `aspirational_documentation` is `none`). The distinction matters for the PR digest (never_implemented goes into the PR; aspirational_documentation is silently kept, signaling "yes the docs are wrong but the docs are also wrong on purpose").

Pass-1 review's flag on this carried forward. Worth a docstring example in `_help_json_classification.py` showing when an operator would pick which.

### N3. `--confidence-threshold low` would auto-accept aspirational_documentation entries

Default is `high`, so this isn't an immediate footgun. But `--apply --confidence-threshold low` would auto-accept the low-confidence `aspirational_documentation` proposals (which the plan describes as needing operator review). Worth a comment on the flag that `low` is meant for `--propose`-only use.

### N4. Quoted-string regex misses bare-identifier renames (still present from pass-1)

`build_alternation_regex` wraps each name in literal `"..."`. Catches `"-gl-debug"` references. Misses identifier-only references like `client_video_gl_debug` (the C symbol). For renames where the C symbol changes but the string literal stays the same, the regex catches it. For renames where the string literal changes but the C symbol stays, also caught. For renames where only the C symbol changes (the string already a typo), the parser sees the same string on both sides and won't capture as a rename event.

ezQuake's typical pattern is rename both sides (verified for `-gl-debug`). So this nit applies in edge cases only. Worth a comment in the docstring saying so.

### N5. PR-digest output skips `aspirational_documentation` and `intentional_typo_or_alias`

Plan's `render_digest`:
```python
by_kind: dict[str, list[dict]] = {
    "renamed": [],
    "retired": [],
    "never_implemented": [],
}
```

Only three kinds reach the PR. The other three (`extractor_gap`, `aspirational_documentation`, `intentional_typo_or_alias`) are excluded — correct for `extractor_gap` (it's our problem) but the plan doesn't explain why `aspirational_documentation` is excluded (it has `upstream_pr_action: 'none'`, so the early `continue` on `none` excludes it).

Why is the upstream_pr_action `none` for aspirational_documentation? Per the plan: "help-JSON describes intended/planned feature with no code anywhere". If there's no code, the help JSON is wrong — should have `upstream_pr_action: 'remove_from_help_json'` and land in the PR digest. The plan's default action map has it as `none`, which is inconsistent with the taxonomy intent.

**Fix:** Change `_default_pr_action`'s value for aspirational_documentation from `none` to `remove_from_help_json` (or leave as `none` if the operator policy is "we keep aspirational entries even though there's no code", but the plan should explain this choice).

### N6. `--ezquake-repo` flag remains project-specific in a now-multi-project review CLI

Existing CLI:
```typescript
'ezquake-repo': { type: 'string' },
```

The flag is used for cluster commit-timestamp lookups (`detectClusters`). Project-specific name in a project-agnostic CLI is a code smell. Not introduced by this plan; just worth noting that the cross-project framing in this plan re-exposes it. Defer the rename to a future cleanup.

### N7. Task 7 Step 1 PLAYBOOK update still has line-number-style guidance

The pass-1 N7 fix said "locate by heading, not line number". Plan now says:
```
locate by heading, not line number — find the `-nopriority` mention and append after the surrounding section
```
✓ partial fix. But the "find the `-nopriority` mention" assumes that mention exists in the playbook. If the playbook gets refactored, the marker disappears. Worth a fallback "or append at end if not found".

---

## Sequencing review

Plan claims:
- Tasks 1-3 prerequisite for Task 4. ✓
- Task 4 Steps 1-3 prerequisite for Task 5. ✓ (this is the pass-1 I1 fix)
- Tasks 4 Steps 4-6 + Task 6 parallel after Task 5. ✓
- Task 7 + Task 8 last. ✓ (Task 8 has its own seed-verification gate, ✓)

Sequencing is correct. The pass-1 issue is fully addressed.

The only sequencing question I'd raise: **should Task 5's TS work block on Task 4's manual operator review (Steps 4-6), or just on auto-accept (Step 3)?** Plan says Step 3 only. That's right — once the seed has high-confidence entries, the gate fires only on the medium/low remainder, which is the intent (force manual review). Operator runs `review --fail-on help-json-classification` and gets a non-zero exit until manual review completes. Good design.

---

## Architectural concerns

The three-layer split (seed YAML / blame index / TS review module) is sound. The seed-as-cache pattern is right. C1+C2+C3+C4+C5 fixes address the structural bugs. The remaining concerns are:

**Closed taxonomy:** 6 values is the right count for the targeted entity set. The pass-1 C5 fix is correct. Remaining concern: the additions-only fallback misuses `aspirational_documentation` (see Important I4). Fixing that without expanding the taxonomy means the auto-classifier needs an "operator-investigates" sentinel state, which complicates the closed-taxonomy contract. Worth thinking about whether to add a 7th kind specifically for this, named something like `auto_classifier_unable` or `unclear_history`.

**Gate placement:** CLI wrapper around `runReview` is correct. Pass-1 C4 fix lands. Critical 3 above is just about the wrong CLI framework in the pseudo-code; placement is right.

**The cache discipline:** seed YAML durable, no separate blame-index cache. Pass-1 I3 fix lands. Critical 6 (orphan-branch reachability) is a correctness concern about WHAT goes into the cache, not WHETHER to cache.

**Cross-project reuse:** shared `classify-help-json.py --project <name>`. Pass-1 I2 fix lands. Critical 4 (PROJECT_REPOS placeholders) is about FRAMING the cross-project deferral, not the architecture itself.

**The new finder's project-scoped vs tag-pair-scoped semantics:** see Important I3. Architecture is OK; documentation gap.

**Skill integration (extraction-review):** see Critical 2. Cross-cutting; the plan touches a downstream consumer that lives outside the project repo.

**Draft-writer integration:** see Critical 1. Plan doesn't touch a critical downstream consumer.

---

## Test coverage analysis

| Task | Test coverage | Adequate? |
|---|---|---|
| Task 1 (schema/validator) | 7 tests covering happy path, missing fields, invalid values, dict keying, enum closure, placeholder rejection | ✓ Good. Solid. |
| Task 2 (blame parser) | 6 tests covering regex escape, co-occurrence parsing, unknown-name filter, rename classification, never_implemented, retired_pre_walk_floor | ⚠ See I8 — fixture doesn't match real git output shape. Real `--- a/path` line absent, `index` and `@@` lines absent. Test passes but doesn't exercise the C5 path. Fix: real-shape fixture or end-to-end test against a tiny synthetic repo. |
| Task 3 (CLI) | None automated; manual smoke at Steps 2-3 | ⚠ Steps 2-3 are smoke tests against the live ezQuake repo. No fixture-based test for the CLI's argument parsing, propose-vs-apply behavior, or the auto-acceptance threshold. Worth at least one test that invokes `main()` against a tiny fixture DB+repo. |
| Task 4 (operator triage) | Manual operator work; no automated tests | ✓ Expected — this is operator-driven. |
| Task 5 (TS finder + gate) | 2 tests for the finder. No test for the gate's exit-code behavior. | ⚠ See I1 above. The gate IS the user-facing behavior; not having an automated test for it means the gate's contract is untested. Operator running `--fail-on help-json-classification` in CI/RUNBOOK depends on the contract. |
| Task 6 (PR digest) | 3 tests covering renamed grouping, never_implemented grouping, extractor_gap exclusion | ✓ Good. The "no Renamed section when only extractor_gap entries exist" assertion is correct. |
| Task 7 (docs) | None — docs | ✓ N/A |
| Task 8 (HANDOVER) | Step 1's verification script counts as a check | ✓ Good. |

**Specifically on the question "do tests pass for the right reasons":**
- Task 1 tests: yes.
- Task 2 tests: pass for the right reason on the rename/never_implemented paths. Pass for the WRONG REASON on retired_pre_walk_floor (the test fixture doesn't include a `--- a/<path>` line so the file-attribution-on-deletion bug doesn't surface; see C5 + I8).
- Task 5 tests: pass for the right reason on what they cover; but coverage is incomplete (no gate test).
- Task 6 tests: yes.

The most actionable test gap: an integration test that runs the CLI against a real-or-synthetic fixture and asserts exit code on `--fail-on`. That's the contract that matters operationally.

---

## Questions for the operator

If you re-issue with revisions, these are the points that need a decision:

1. **Critical 1 (draft-writer):** plan must add `draft-writer.ts` to Task 5's modified files and update the Summary section. Confirm the Summary line for the new bucket should appear, e.g., `- Help-JSON classifications: N (M pending)`.

2. **Critical 2 (skill update):** which model — add a routing-table entry for `(help-json-classification, classify)` in SKILL.md, or document that this bucket is NOT walked through the skill (operator runs `classify-help-json.py` instead)? My recommendation: skill-skip — the new flow has a dedicated CLI, no need to thread it through the skill's per-finding walk. Plan should explicitly say so.

3. **Critical 3 (parseArgs vs commander):** confirm the implementer should rewrite Step 7's pseudo-code to parseArgs shape. Should the gate fire BEFORE the JSON dump in `runReviewCli` or AFTER?

4. **Critical 4 (cross-project framing):** drop FTE/QWCL/MVDSV from PROJECT_REPOS, or keep them with a comment explaining "inert until those projects gain help-JSON files"?

5. **Critical 5 (file path on deletion):** fix the parser to read `--- a/<path>` for whole-file deletions, or make `last_source_file_pre_walk` optional? My recommendation: fix the parser — the path IS recoverable, just unread.

6. **Critical 6 (orphan-branch reachability):** use `git log --first-parent` or `--branches=master` to scope the pickaxe walk? My recommendation: `--first-parent` to follow merges through main only.

7. **Important I2 (runReview I/O coupling):** add `helpJsonSeed?` to RunReviewOptions, or leave inline? My recommendation: add to options bag for testability.

8. **Important I4 (additions-only misclassification):** route additions-only to a "needs operator triage" sentinel that fails validation, or keep as low-confidence aspirational_documentation? My recommendation: sentinel state. The 7-value taxonomy with one operator-investigates value is more honest than the 6-value taxonomy with a fallback that misclassifies.

9. **Nit N5 (aspirational_documentation upstream PR action):** is `upstream_pr_action: 'none'` correct for aspirational_documentation, or should it be `remove_from_help_json`?

---

## Summary of suggested plan edits

**Critical edits (block execution):**
- **Task 5:** add `draft-writer.ts` to modified-files list. Update Summary section + total to include the new bucket. Update test (or add new test) for renderSummary output.
- **Task 5 (or new task):** explicit step to update `~/.claude/skills/extraction-review/SKILL.md` routing table OR document that the new bucket is not skill-walked.
- **Task 5 Step 7:** rewrite pseudo-code to parseArgs API (`'fail-on': { type: 'string', multiple: true }`). Decide gate-before-JSON or gate-after-JSON ordering.
- **Task 3:** drop FTE/QWCL/MVDSV from PROJECT_REPOS or rewrite their entries with a "currently inert" comment. Update "What this plan does NOT include" to remove the phantom Arc D framing.
- **Task 2:** fix `file_re` to also handle `--- a/<path>` for whole-file deletions. Or make `last_source_file_pre_walk` optional in the schema.
- **Task 2:** change `git log --all` to `git log --first-parent` (or equivalent reachability filter) so retired_at_commit always points at upstream-reachable commits.

**Important edits:**
- **Task 5 Step 8:** convert manual smoke into automated test that exercises `--fail-on` exit-code contract.
- **Task 5 Step 6:** decouple seed loading from runReview by adding `helpJsonSeed?` to `RunReviewOptions`. Caller (CLI) loads seed and passes in.
- **Plan body:** add a paragraph noting that `help-json-classification` is project-scoped, not tag-pair-scoped, so it appears on every review until the seed catches up.
- **Task 2:** filter `source_backed_names` by entity type. Change `fetch_source_backed_names` to return `dict[str, set[str]]` keyed on type.
- **Task 2:** update auto-classifier's additions-only branch to either route to a "needs-investigation" sentinel state, or refine the proposal text to be specific about what the operator should look for.
- **Plan body:** update timing claims from "5-15s" to a measured number after the parser fix lands. Probably 25-40s for the full Python pipeline on ezquake.

**Nits:**
- Drop unused `BlameIndexEntry` import from Task 2 tests, or use it.
- Add docstring example to `_help_json_classification.py` distinguishing `aspirational_documentation` from `never_implemented`.
- Add comment on `--confidence-threshold low` discouraging combination with `--apply`.
- Add comment on `build_alternation_regex` noting it covers quoted-string surfaces only, not bare-identifier renames.
- Decide whether `aspirational_documentation` should default to `upstream_pr_action: 'remove_from_help_json'` or `'none'`. Document the choice.

---

*Reviewer's confidence:* High on Critical 1-5 (verified directly against `draft-writer.ts:84-92`, `~/.claude/skills/extraction-review/SKILL.md:284-296`, `apps/qw-oracle/scripts/load-knowledge/index.ts:402-443` parseArgs usage, DB query for doc_only counts per project, real `git log -p` output showing `+++ /dev/null` for whole-file deletions). Medium on Critical 6 — orphan-branch risk is real but ezQuake's history is mostly linear. Medium on the Important findings — they're correctness-or-architecture concerns that the operator might triage as "ship it and fix later". Low on nits — judgment calls.

*What this review didn't verify:* whether updating the user-global SKILL.md is part of the operator's normal change scope. If skills aren't normally edited by Claude in project arcs, Critical 2 might be deferred to a separate operator-driven task; the plan still needs to flag the dependency.
