# Help-JSON Classification Plan — Fresh-Eyes Review

**Plan:** `docs/superpowers/plans/2026-04-30-help-json-classification-infrastructure.md`
**Reviewer:** fresh Claude session, no prior context with the brainstorm
**Stance:** the operator asked for pushback, not consensus. Findings ranked critical / important / nit. Operator decides whether to ping the original session for a second opinion before applying.

---

## TL;DR

Three of the eight tasks have **structural bugs that prevent them from working as written**:
- Task 2's blame pipeline pipes `git log -p` through ripgrep, which discards every `===COMMIT===` / SHA / date sentinel because they don't match the alternation regex. The parser then sees diff lines with no commit context and assigns `cur_commit=None` to every event, so every entity collapses to `never_implemented`.
- Task 2's classifier looks for sibling rename targets in the blame map, but the alternation regex is built from **doc_only names only** — the very names that source-backed rename targets are *not* in. The `renamed` classification path can never fire under the as-written design.
- Task 5's TypeScript module emits a Finding shape (`entity_type`, `entity_name`) that isn't in the actual `Finding` interface, calls `makeFindingId` with three args against a two-arg signature, uses a bucket literal (`'help-json'`) that isn't valid, and forgets to extend `ReviewCounts` (which is hard-coded in `runReview`'s counts initializer and would either fail TypeScript or NaN at runtime).

Plus one taxonomy gap: `retired_during_walk` cannot apply to any entity in the targeted set (`source_state='doc_only'`) by definition. It's dead weight in the closed taxonomy.

Plus one sequencing issue: Task 5 is described as parallel-safe with Task 4, but landing the gate before the seed is populated would block every review run with 194 findings.

The Python schema/validator (Task 1) and the PR-digest renderer (Task 6) are clean. The architecture's three-layer split (seed YAML / blame index / TS review module) is sound. Most of the breakage is in the middle layer's implementation details and the TS integration's misalignment with the existing review CLI's types.

I recommend fixing the criticals before execution starts. The plan's intent is good, but the worker who follows it task-by-task will hit a runtime failure in Task 3's smoke test ("`-gl-debug` proposes `renamed`") and not understand why, because the failure is two layers deep in a parser that silently drops context.

---

## Critical issues (block execution; fix before starting)

### C1. Ripgrep filter strips commit context from blame stream

**Where:** Task 2, `run_pickaxe_pass` + `parse_pickaxe_output`.

**Issue:** The pipeline is

```
git log --all -p --pretty=format:'===COMMIT===%n%H%n%ad%n' --date=short
  | rg --no-line-number '"(name1|name2|...)"'
```

Ripgrep's default behavior is to print only lines matching the pattern. The sentinel lines `===COMMIT===`, the SHA, and the date contain no `"<name>"` tokens — so ripgrep **discards them**. The parser then receives a stream of bare `+/-` diff lines with no commit context. Inside `parse_pickaxe_output`, `cur_commit` and `cur_date` stay `None` forever, and every event hits the `if cur_commit is None or cur_date is None: continue` guard.

Result: `blame[name] == []` for every name. `classify_from_blame` treats them all as `never_implemented`. Task 3's smoke test ("`-gl-debug` should classify as `renamed`") fails.

**Fix options (pick one):**
1. **Drop ripgrep from the pipeline.** Read `git log -p` directly into Python and run `re.compile(alternation).search(line)` per diff line, maintaining commit context locally. Same big-O, correct attribution, no sentinel-loss class of bug.
2. Use `rg --before-context=3 --after-context=0` plus `--no-heading --json` and parse the JSON envelope to recover commit context. Workable but more fragile than option 1.
3. Two-pass approach: `git log -S<name> --all` per name to find candidate commits, then `git show <sha> -p` to extract diffs. Defeats the "single-pass" promise but works.

I recommend option 1 — Python-side matching for 194 names is well under a second per commit.

### C2. Rename detection has no source-backed names in the alternation regex

**Where:** Task 2, `classify_from_blame` + Task 3, `run_pickaxe_pass(EZQUAKE_REPO, names_to_lookup)`.

**Issue:** The CLI builds `names_to_lookup = [n for (n, _t) in unclassified]` — i.e., **doc_only-and-unclassified names only** (currently all 194 of them). The alternation regex is built from this list. `parse_pickaxe_output` filters events by membership in this same set.

`classify_from_blame` then iterates `blame.items()` looking for a co-occurring sibling that's in `source_backed_names`. But the source-backed sibling (e.g. `-r-debug`, the rename target of `-gl-debug`) is **never in the regex**, so its addition events are never captured, so `blame["-r-debug"]` doesn't exist (or has zero events even if seeded).

Result: the `renamed` classification path can never fire. Every co-occurrence rename will silently classify as `retired_pre_walk_floor`. The PR digest's "Renamed entries" section will be empty.

This is the **most common case** the system is designed to handle (rename-but-help-not-pruned per the brainstorm). The auto-classifier failing here defeats the system's main value prop.

**Fix:** Pass `names_to_lookup + sorted(source_backed_names)` to `run_pickaxe_pass` and `parse_pickaxe_output`. Update the `parse_pickaxe_output` `names` set parameter to be the union. The blame map then carries source-backed sibling events; co-occurrence detection works.

Cost: regex grows from 194 alternates to ~5000 (all ezquake entity names). Test with a real run before judging — should still be sub-minute on ezQuake's history.

Update the test `test_classify_from_blame_renamed_via_co_occurrence`'s setup to reflect that both the focal name AND the source-backed sibling come pre-populated in the blame map.

### C3. TypeScript review module's Finding shape doesn't match existing types

**Where:** Task 5, `findings-help-json-classifications.ts` + its test.

**Issue:** Multiple shape mismatches against `apps/qw-oracle/scripts/load-knowledge/review/types.ts`:

1. **`makeFindingId` arity.** Plan calls `makeFindingId('help-json', project, row.name)` — three arguments. Actual signature is `(bucket: Bucket, naturalKey: string)` — two. TypeScript will error.

2. **Bucket literal mismatch.** Plan passes `'help-json'` as the first arg to `makeFindingId`, but the new bucket value is `'help-json-classification'`. The literal `'help-json'` isn't even in the proposed extended `Bucket` union.

3. **Finding shape: `entity_type` / `entity_name` aren't fields.** The plan's emit:
   ```ts
   findings.push({
     id: ...,
     bucket: 'help-json-classification',
     project,                   // not on Finding
     entity_type: row.type,     // not on Finding
     entity_name: row.name,     // not on Finding
     summary: ...,
     evidence: { entity_ref: `${project}:${row.type}:${row.name}` },
     ...
   });
   ```
   Existing convention (per `findings-additions.ts:42-53`): the entity is identified via `evidence.entity_ref`, which is the canonical_id string `${project}:${type}:${name}`. There's no `project` / `entity_type` / `entity_name` field on `Finding`.

4. **Test assertion broken.** `expect(findings[0].entity_name).toBe('-unclassified')` — `entity_name` doesn't exist. Should assert `evidence.entity_ref` or pull from `summary`.

5. **`ReviewCounts` not extended.** The plan extends the `Bucket` union but never extends:
   ```ts
   export interface ReviewCounts {
     addition: number;
     retirement: number;
     'semantic-crossing': number;
     unclassified: number;
     'source-invisible': number;
     // missing: 'help-json-classification': number;
   }
   ```
   And `runReview` (`index.ts:70-77`) initializes `counts` with the five existing buckets and increments via `counts[f.bucket] += 1`. Without the new key:
   - With strict TS: compile error.
   - At runtime: `counts['help-json-classification']` is `undefined`, `undefined + 1 = NaN`, the count silently corrupts.

**Fix:** Rewrite the emit block:
```ts
findings.push({
  id: makeFindingId('help-json-classification', `${project}:${row.type}:${row.name}`),
  bucket: 'help-json-classification',
  summary: `doc_only ${row.type} \`${row.name}\` has no classification in seeds/help_json_classifications.yaml`,
  evidence: { entity_ref: `${project}:${row.type}:${row.name}` },
  proposed_disposition: {
    kind: 'classify',
    rationale: 'Run classify-help-json.py --propose to generate a proposal, then operator-review and append to the seed YAML.',
  },
});
```
And update both `ReviewCounts` (add the new key) and `runReview`'s counts initializer.

### C4. `runReview` has no exit-code or fail-on-findings concept; "doc_only budget gate" is undescribed code

**Where:** Task 5 + Task 7's VALIDATION-RUNBOOK update.

**Issue:** The plan repeatedly references "the doc_only budget gate fails review when mysteries lack classifications." The runbook addition says "the snapshot must NOT be merged ... If the bucket has >0 findings."

But `runReview` (`index.ts:36-92`) returns a `ReviewReport`. It doesn't throw, doesn't set an exit code, doesn't have any concept of "fail." The CLI that calls it — wherever that is — also isn't modified by this plan.

So the gate is **described as a behavior but never implemented as code**. A user following the plan would land Task 5, see the findings show up in the draft, and then... nothing happens. The build proceeds.

**Fix options:**
1. Add an explicit gate inside `runReview`: `if (counts['help-json-classification'] > 0 && !options.force) throw new Error(...)`. Mirrors the existing `assertDraftNotFilled` pattern.
2. Add it in the CLI wrapper that calls `runReview` (need to identify the actual command — likely in `apps/qw-oracle/scripts/load-knowledge/index.ts`). Exit code 2 on findings present.

Either way, the plan must specify *which file gets the gate code*, not just narrate that it exists.

### C5. `retired_during_walk` cannot apply to any doc_only entity

**Where:** Closed taxonomy section + Task 1 schema.

**Issue:** Per `SCHEMA.md:25-29` + `81`:
- `source_state='doc_only'` = "help-text entry with no source-code counterpart (help JSON documents a feature the extractor cannot find)."
- `source_state='source_retired'` = was source-backed at some walked version, no longer is.

If an entity transitions `source_backed → source_retired` during the walk window, its current `source_state` is `source_retired`, not `doc_only`. The plan's targeted entity set (Task 3: `WHERE source_state = 'doc_only'`) **excludes** all retired-during-walk entities by definition.

So the `retired_during_walk` classification value:
- Can never be proposed by `classify_from_blame` (correct — it isn't).
- Can never be operator-assigned to a doc_only entity (because doc_only and retired-during-walk are mutually exclusive states).
- Its required fields (`retired_at_version`, `last_source_file`, `last_source_line`) refer to a per-version timeline that exists in the DB for source_retired entities but not for doc_only ones.

It's dead weight in a "closed" taxonomy and slightly misrepresents the system as covering more ground than it does.

**Fix options:**
1. **Drop it from the taxonomy** (down to 6 values). Cleaner; matches what the code actually targets.
2. **Broaden scope** to cover `source_retired` entities too (then `retired_during_walk` is the natural classification for them). Bigger arc; would change Task 4's entity count and the seed's role. Probably don't want this scope creep mid-plan.

I recommend option 1 — and add a sentence to the seed docstring saying "this seed covers `source_state='doc_only'` only; `source_retired` entities have their own per-version retirement record in the DB."

---

## Important issues (significant rework, but plan can proceed once addressed)

### I1. Task 5 isn't parallel-safe with Task 4

**Where:** "Sequencing dependencies" execution note + the gate behavior.

**Issue:** Plan says: "Task 5 (TS review integration) can run in parallel with Task 4."

But Task 5 ships the gate. Once landed, every `runReview` invocation reads `seeds/help_json_classifications.yaml`, which doesn't exist yet (Task 4 creates it). `loadSeed` returns `{}`. The gate fires with 194 findings on every review run.

If Task 5 lands before Task 4 completes the seed, all in-progress review work elsewhere on the project is blocked.

**Fix:** Sequence Task 5 *after* Task 4's high-confidence auto-accept pass at minimum. Or make the gate soft-default to off when the seed file is missing — operator opt-in via a flag. The plan should pick an explicit answer.

### I2. `classify-help-json.py` shouldn't be per-project

**Where:** Task 3.

**Issue:** Plan locates the CLI at `apps/qw-oracle/scripts/extractors/ezquake/classify-help-json.py` with hardcoded `EZQUAKE_REPO`, `PROJECT='ezquake'`, etc. To onboard FTE/QWCL/MVDSV, you'd copy-paste this file with edits.

This is the kind of duplication the three-tier handler architecture (per `extractors/CLAUDE.md`) explicitly avoids. Cross-engine logic lives in `extractor_lib/`; per-project files only contain genuine per-project specializations.

There's no per-project specialization here — just a project name and a repo path. Both are obvious CLI arguments.

**Fix:** Move the script to `apps/qw-oracle/scripts/classify-help-json.py` (sibling of `build-help-json-pr-digest.py`, which the plan correctly puts at the top level). Take `--project ezquake` as a flag. Look up the upstream repo via a project-to-repo map (or just a `--upstream-repo` flag).

This also affects Task 7's PLAYBOOK update — describe the workflow as `python scripts/classify-help-json.py --project ezquake`, not the per-project path.

### I3. Cache file is mentioned but never written

**Where:** "File Structure" section + execution-note "cache invalidation strategy."

**Issue:** Plan declares `seeds/help_json_blame_cache.json (gitignored if large; committed if small enough — decided in Task 7)`. Task 7 is the docs task. Nothing in Task 7 makes that decision; nothing in any task writes the cache file.

The blame index is rebuilt from scratch every CLI run (~30-60s). The "cache invalidation strategy" note ("re-runs only process NEW unclassified entries") describes the seed-skip behavior, not blame-index caching. Plan conflates two distinct caches.

**Fix:** Either:
1. **Drop the cache file from the plan.** Acknowledge that the pickaxe pass runs fresh each time; 30-60s is fine since `classify-help-json.py` runs a few times per arc, not per review.
2. **Implement the cache.** `_help_json_blame.py` writes the parsed blame map to a JSON file keyed by repo HEAD SHA + name-set hash; reads it on next run if both match. Maybe 50 LOC.

Option 1 is simpler. If picked, also update the "30-60s" claim in the execution note's "ongoing cost" paragraph to match reality.

### I4. Task 4 Step 3's expected output assumes the rename detection works

**Where:** Task 4 Step 3 sanity checks.

**Issue:** Plan says:
```
python classify-help-json.py --propose 2>/dev/null | grep -A 5 '"-gl-debug"'
# Expected: classification: renamed, rename_to: "-r-debug", rename_at_commit: 0d7ea051
```

Given the C1 + C2 bugs, this would actually output `classification: never_implemented` (because the parser drops commit context, the blame map is empty, and the no-events branch fires). The smoke test's "expected" wouldn't match reality — but the test reads as if it's a fact that will hold.

**Fix:** This goes away once C1 + C2 are fixed. If the C1 + C2 fixes land, the prediction is correct. Just noting the dependency so it doesn't get treated as an independent verification.

### I5. HANDOVER cleanups in Task 8 are conditional, not unconditional

**Where:** Task 8 Step 1.

**Issue:** Plan says "DELETE the cmdline variant-matrix gaps sidequest" — both ezquake entries (`-gl-debug`, `-nomouse`) properly classified.

But Task 4 Step 3 only auto-accepts **high-confidence** proposals. If `-gl-debug` or `-nomouse` end up at medium/low confidence (depends on what the blame stream actually contains), they go to manual review (Step 4) and only land in the seed after operator confirmation. The sidequest can't be deleted before that confirmation.

The plan reads as "after Task 4 the sidequest is gone" but actually the contingency is "after Task 4 + operator confirms both entries at high confidence."

**Fix:** Add a "verify both entries are present in `seeds/help_json_classifications.yaml` before deleting the sidequest" gate to Task 8 Step 1. Otherwise the cleanup hides a half-completed job.

### I6. `extractor_gap` proposals carry placeholder `sidequest` strings

**Where:** Task 2, `classify_from_blame` extractor_gap branch.

**Issue:** The classifier proposes:
```python
"sidequest": "(operator should attach a HANDOVER sidequest)",
```

This passes `validate_entry` (which only checks the field is *present*). When auto-accepted at `--confidence-threshold medium`, the seed gets entries with placeholder sidequest strings.

PR-digest correctly excludes `extractor_gap` (Task 6 test confirms). But the seed is now polluted with garbage values that look like real refs.

**Fix options:**
1. Tighten the validator to reject `sidequest` strings that match the placeholder.
2. Force `extractor_gap` proposals into the manual-review queue regardless of confidence threshold (don't auto-accept).
3. Lower the proposal confidence to `low` so they never auto-accept under default `--confidence-threshold high`.

Plan should pick one. My recommendation: option 2 — extractor gaps need a sidequest reference humans actually wrote.

---

## Nits (worth fixing but not blocking)

### N1. `BlameIndexEntry` is imported in tests but never used
Task 2's test imports `BlameIndexEntry` from `_help_json_blame` but the imported symbol is never referenced in any test body. Dead import.

### N2. Ripgrep is an undeclared dependency
Plan's tech stack mentions ripgrep but doesn't note that it's a runtime dep of the classify CLI. Worth a line in `apps/qw-oracle/CLAUDE.md`'s "Always-on rules" or `DEVELOPMENT.md`. (Moot if C1 is fixed by dropping ripgrep.)

### N3. `git log --all` may include orphan branches
Pickaxe over `--all` picks up commits on long-lived feature branches that never merged. Could pollute the rename co-occurrence detection if a branch had a renamed-then-reverted experiment. Probably fine for ezquake (mostly linear history) but worth a `--first-parent` consideration if false positives appear.

### N4. `last_source_line_pre_walk: None` in retired_pre_walk_floor proposals
Task 2's `classify_from_blame` returns `last_source_line_pre_walk: None` because "blame doesn't preserve line numbers." `validate_entry` only checks presence (None passes), but a None where an int is expected is a wart. Either:
- Drop `last_source_line_pre_walk` from required fields (it's not really discoverable).
- Synthesize it via a follow-up `git show <sha>:<file>` parse for the pre-removal version (extra work).

### N5. `intentional_typo_or_alias` is operator-manual-only — not stated
Task 2's classifier never proposes `intentional_typo_or_alias`. That's correct (it requires similarity scoring against source_backed names, which the plan doesn't include). But the plan never says this — operators reading the closed-taxonomy table might wonder why this kind never auto-suggests. Worth a line in the taxonomy intro or a comment in `_help_json_classification.py`'s docstring.

### N6. Quoted-string regex misses some rename surfaces
Plan's regex matches `"<name>"` (with literal double quotes). Catches cvar struct-init renames (`cvar_t cl_foo = {"cl_foo", ...}`) and `Cmd_AddCommand("foo", ...)` and `CMDLINE_DEF(..., "-foo")`. Misses renames that touch the C identifier without the string literal — rare, but worth a comment in the docstring saying so.

### N7. PLAYBOOK update reads as if Task 7 modifies a known section
Task 7 Step 1 says "add a new section after the existing 'Known limit' notes (around line 270 where `-nopriority` is mentioned)." If the playbook has shifted (it's evolving), the line number is brittle. The pattern in the rest of the project is "find the section by heading, not line number."

---

## Sequencing review

Plan claims:
- Tasks 1-3 prerequisite for Task 4. ✓ correct.
- Task 5 parallel with Task 4. ✗ see I1.
- Task 6 depends on Task 4. ✓ correct.
- Tasks 7-8 last. ✓ correct.

**Suggested re-sequencing:**
1. Tasks 1, 2, 3 (Python infrastructure + classifier)
2. Task 4 Step 1-3 (auto-accept high-confidence proposals — first cut at populated seed)
3. Task 5 (TS gate; now safe because seed exists with high-confidence entries)
4. Task 4 Steps 4-6 in parallel with Task 6 (operator manual review of remaining entries; PR-digest builder)
5. Task 7 (docs)
6. Task 8 (handover) — with the contingent-cleanup caveat from I5

---

## Architectural concerns (high-level)

The three-layer split (seed YAML / blame index / TS review module) is sound. The seed-as-cache pattern is the right way to keep this from reburning operator effort on every tag bump.

**The closed taxonomy:** 6 of 7 values are well-justified. `retired_during_walk` is the dead-weight one (C5). I'd also push back gently on `aspirational_documentation` vs `never_implemented` — the difference seems to be operator narrative, not a structurally distinct case (both = "doc exists, code doesn't, never did"). The plan keeps them separate; that's fine, but a docstring example of when you'd pick one over the other would help future operators.

**Gate placement** (review CLI vs extract-tag): plan correctly places it in `runReview`, not `extract-tag`. Extract-tag's job is Layer 1 ingestion; classification is a downstream review concern. Good call.

**The cache discipline:** seed YAML is durable and per-project — correct shape. PR digest is a derived artifact that regenerates from the seed — correct shape. The only cache that's underspecified is the blame index (I3).

**Cross-project reuse:** the per-project `classify-help-json.py` (I2) is the only architectural smell. Easy fix.

---

## Test coverage

**Task 1 tests:** good. Cover the happy path, missing-required-field, invalid-classification-value, dict-keying, and enum closure. No false positives.

**Task 2 tests:** the `parse_pickaxe_output` test will pass against the *test fixture* (which preserves commit boundaries), but the **runtime input** to `parse_pickaxe_output` (post-ripgrep) won't have those boundaries — see C1. The test passes for the wrong reason: it uses synthetic well-formed input, but the actual production input is malformed by the ripgrep filter. This is the worst kind of test — green light, broken integration. Recommendation: add a higher-level test that runs the full `git log` → ripgrep → parse pipe against a tiny fixture repo. Or fix C1 (drop ripgrep) and the unit test becomes accurate.

**Task 5 tests:** would fail compilation given C3. Once C3 is fixed, the test shape is OK but trivial. Worth adding:
- A test that asserts `ReviewCounts` increments correctly when a help-json finding is in the report.
- A test that exercises the gate fail-on-findings path (once C4 is implemented).

**Task 6 tests:** good. Cover renamed grouping, never_implemented grouping, and extractor_gap exclusion. The "no Renamed section when only extractor_gap entries exist" assertion is correct. Solid.

---

## Questions for the operator

If you ping the original session, these are the points that need a decision before re-issuing:

1. **C1 fix preference:** drop ripgrep and parse `git log -p` directly in Python? Or keep ripgrep with `--before-context` for sentinel preservation? (I recommend dropping ripgrep — simpler, same speed.)

2. **C2 fix:** is the source_backed-names-in-regex inclusion an oversight, or was the `renamed` classification meant to be operator-manual-only with the auto-classifier downgrading to `retired_pre_walk_floor`? (If the latter, the plan should say so, and the `renamed` taxonomy value's auto-population path should be explicitly removed from `classify_from_blame`.)

3. **C5 taxonomy fix:** drop `retired_during_walk` (down to 6 values) or broaden scope to include `source_retired` entities? (I recommend dropping.)

4. **C4 gate location:** inside `runReview`, or in the CLI wrapper above it? Operator preference?

5. **I1 sequencing:** Task 5 strictly after Task 4-Step-3, or soft-default the gate to off when seed file missing?

6. **I2 CLI shape:** per-project `classify-help-json.py` (current plan) or shared `--project X` flag? (I recommend shared.)

7. **I3 cache:** drop blame_cache references, or implement caching? (I recommend dropping.)

8. **I6 placeholder sidequest:** auto-reject placeholders, force manual review, or accept and rely on operator hygiene?

---

## Summary of suggested plan edits

- **Task 1:** drop `RETIRED_DURING_WALK` from the enum + REQUIRED_PER_CLASSIFICATION + closed-taxonomy table. Update test expectation `len(list(Classification)) == 6`.
- **Task 2:** rewrite `run_pickaxe_pass` to drop the ripgrep stage; do alternation matching in Python while parsing. Update `parse_pickaxe_output`'s name set to be the union of doc_only + source_backed names.
- **Task 3:** move the CLI to `apps/qw-oracle/scripts/classify-help-json.py` with a `--project` flag and a project-to-repo lookup table. Update import paths accordingly. Make `extractor_gap` proposals NEVER auto-accept (force manual review).
- **Task 5:** rewrite the Finding emit to use `evidence.entity_ref`, drop bogus `entity_type`/`entity_name`/`project` properties, fix `makeFindingId` arity. Extend `ReviewCounts` interface and `runReview`'s counts initializer. Add the gate code: throw or exit-2 when `counts['help-json-classification'] > 0` without `--force`.
- **Task 7:** drop the line-number-based "around line 270" instruction; refer to the section heading instead.
- **Task 8:** add a "verify both entries are seeded before deleting the cmdline variant-matrix sidequest" precondition to Step 1.
- **Execution notes:** drop or implement the blame_cache reference. Re-sequence Task 5 to after Task 4 Step 3.
- **Throughout:** swap "30-60s ripgrep pass" wording for whatever the actual Python-only timing turns out to be.

---

*Reviewer's confidence:* High on critical findings (verified against `apps/qw-oracle/scripts/load-knowledge/review/types.ts`, `index.ts`, `findings-additions.ts`, `findings-source-invisible.ts`, `SCHEMA.md`'s source_state definitions, and the actual SQLite count of 194 doc_only entries). Medium on important findings (some involve trade-offs the operator might disagree with). Low on nits — they're judgment calls.
