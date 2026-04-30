# Fresh-session prompt — Help-JSON classification Tasks 5-8

**Created:** 2026-05-01. **Status:** ready to execute. Paste the prompt block below into a fresh Claude Code session at the monorepo root.

## What landed already

Tasks 1-4 of the plan at `docs/superpowers/plans/2026-04-30-help-json-classification-infrastructure.md` shipped 2026-05-01 in commits `bb092fc`..`26ae789`. The arc-history entry at `apps/qw-oracle/docs/arc-history.md` (top entry) summarizes what shipped + the post-smoke filter improvements + the seed YAML.

The seed YAML at `apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml` has 193 classifications covering all 194 ezQuake doc_only entities. **All 31 extractor_lib tests pass.** The smoke test for `-gl-debug → -r-debug` validated.

Tasks 5-8 are mostly pure-mechanical TypeScript work plus documentation. They do NOT need the same level of active operator triage that Tasks 4 needed.

## What's left (4 tasks)

**Task 5 — TypeScript review-module integration** (most consequential). Wires the new `help-json-classification` bucket into the existing `runReview` infrastructure at `apps/qw-oracle/scripts/load-knowledge/review/`:
- `types.ts`: extend `Bucket` union + `ReviewCounts` interface
- new `findings-help-json-classifications.ts` + `.test.ts`
- `index.ts`: register the new module + extend the `counts` initializer
- `draft-writer.ts`: extend `total` calc + Summary section
- `apps/qw-oracle/scripts/load-knowledge/index.ts`: add `--fail-on <bucket>` flag (`parseArgs` `multiple: true` shape)

The plan spells out the full TypeScript code for each file. Out of scope: the user-global `~/.claude/skills/extraction-review/SKILL.md` routing table — operators resolve `help-json-classification` findings by running the Python CLI directly, not via the skill walker.

**Task 6 — PR digest generator** (Python). New helper `extractor_lib/_help_json_pr_digest.py` + CLI `scripts/build-help-json-pr-digest.py` that read the seed YAML and emit `docs/upstream-prs/ezquake-help-json-cleanup.md`. Markdown structure spelled out in the plan.

**Task 7 — Wire `--fail-on` into the extraction-review CLI bucket gate.** Small CLI plumbing. Plan spells out the parseArgs shape.

**Task 8 — Documentation updates.**
- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`: new section on help-JSON classification workflow.
- `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`: doc_only budget gate added to review-time checks.

## Prompt block to paste into fresh session

```
Execute Tasks 5-8 of the implementation plan at:
docs/superpowers/plans/2026-04-30-help-json-classification-infrastructure.md

Use the superpowers:subagent-driven-development skill. Dispatch one
subagent per task; review the result; dispatch the next.

Context (don't re-derive):
- Tasks 1-4 already shipped. See top entry of apps/qw-oracle/docs/arc-history.md
  for what landed and the post-smoke filter improvements that are NOT in the
  original plan but ARE folded into the "Post-smoke amendment" subsection of
  Task 2 in the plan.
- Seed YAML at apps/qw-oracle/scripts/extractors/ezquake/seeds/help_json_classifications.yaml
  has 193 classifications covering all 194 ezQuake doc_only entities.
- The Python validator already accepts a `rename_similarity` field on renamed
  entries (added during the post-smoke fix). The TS findings module in Task 5
  doesn't need to validate it; just pass it through if surfaced.
- All 31 extractor_lib tests pass. Don't break them.

Working directory: /home/paradoks/projects/quakeworld (branch main).

Sequencing for this session:
1. Task 5: TS review module + types.ts + index.ts + draft-writer.ts + the
   --fail-on flag in load-knowledge/index.ts. Bun-test green before commit.
   Verify: run a review against the live knowledge.db and confirm the new
   bucket shows count 0 (since the seed covers everything) and that
   --fail-on help-json-classification exits zero.
2. Task 6: Python PR digest generator + CLI. Run it once and verify the
   markdown output at docs/upstream-prs/ezquake-help-json-cleanup.md
   reads cleanly. Commit the generated markdown alongside the code.
3. Task 7: --fail-on wiring (likely already done as part of Task 5; the
   plan separates them but they touch the same flag). If already done in
   Task 5, skip with a note.
4. Task 8: Documentation updates to PLAYBOOK + RUNBOOK.

Stop after Task 8 commits. Report:
- Each task's commit SHA
- TS tests passed / failed
- Did the new bucket gate fire as zero on the current seed?
- Generated PR digest markdown — paste the first 30 lines so the operator
  can skim before scheduling an actual upstream PR.

Quality bar: mechanical TDD against a thoroughly-reviewed plan.
Don't redesign. The plan was reviewed twice + amended once post-smoke.
If a step in the plan reads ambiguously, follow the literal instruction;
if it produces a wrong result, that's signal worth reporting.

Do not touch the seed YAML or the Python classify-help-json.py CLI.
```

## Notes for the next operator session

- The Python classifier (`extractor_lib/_help_json_blame.py`) added `rename_similarity` as a non-required field on renamed entries. The schema validator (`_help_json_classification.py`) does NOT reject extra fields, so it passes. The TS findings module in Task 5 might surface this field in the finding metadata — useful operator context, not required.
- The `extraction-review` user-global skill at `~/.claude/skills/extraction-review/SKILL.md` is intentionally NOT being extended to walk the new `help-json-classification` bucket. Operators resolve those findings by running the Python CLI directly. If a future arc decides otherwise, that's a separate skill-update task.
- One open observation captured in HANDOVER's "Recently opened" section: bare `COM_CheckParm("...")` call sites aren't recognized by our cmdline-param extractor (only `CMDLINE_DEF(...)` macros are). Surfaced via the -nomouse classification. Not a Task 5-8 concern.
