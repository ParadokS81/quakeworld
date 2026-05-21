# enforce-L1 follow-ups handoff (F16 + F17 + F12-class MD fix; fresh terminal)

You are a fresh terminal picking up the post-ship follow-ups for the
enforce-L1-runtime-truth arc. The arc itself shipped 2026-05-20 (tag
`arc-enforce-l1-runtime-truth-shipped`). The post-arc analysis shipped
2026-05-21 (commit `0b19c291`). The upstream PR #1126 is live and awaiting
maintainer review. This session focuses on the two small follow-ups the
arc-reviewer named in increasing scope: **F16** (log noise, ~30 min) and
**F17** (fail-safe-completeness gap, ~1-2 hr), preceded by a 5-min pre-step
correcting an F12-class literal-text defect in the Phase-5 MD.

Repo root: `/home/paradoks/projects/quakeworld`.

## Mission

In order, simplest first:

1. **F12-class Phase-5-MD correction (~5 min).** The locked Phase-5 MD's
   verification check 3 (line 707) still names the wrong subcommand
   (`bun scripts/load-knowledge/index.ts load-version --project ezquake
   --version head --force`). This is the same defect Phase 4 received a
   dated MD-correction for; Phase 5 did not. Apply the same narrative-
   preserved house-style dated correction so a future copy-runner does not
   hit the hard-throw. MD-literal only -- the shipped code is correct.
2. **F16 log noise (~30 min).** Each `extract-tag --force` re-load logs
   ~117 benign `[load-version] fully-orphaned entity ... investigate ...
   crashed mid-flight` warnings for Track-B HUD commands. Final state has
   0 real orphans (`F1.cross_type_orphans` PASS). Scope the step-3
   command retreat-scan's fully-orphaned warning to exclude the known
   Track-B-pending set, or defer it until after the 3e post-loop. Don't
   silence everything -- a future genuine orphan must still surface
   loudly.
3. **F17 fail-safe-completeness gap (~1-2 hr).** Toggle-off / RED keeps
   the level-2 Track-A column populated on an already-GREEN DB (stale
   9th/10th artifact + `extract-tag.ts` 3e/3f `existsSync` gating +
   `natural-keys.ts:234` COALESCE). The autonomous level-3 tier is
   PROVABLY protected (0 `dump-confirmed` on RED AND broken-pin); residual
   is the never-auto-shipped level-2 tier. Fix by gating the 3e/3f loaders
   on the live toggle + D22 validation record + regen-this-run, and/or
   having `emit_callgraph_signal.py` clear the stale 9th/10th artifact on
   OFF/RED. X9 re-extract to prove checks 4/7 literally `count==0`.

After these clear, the next thing on the queue is the **L1-extractor
sibling arc** (cmdline-liveness feeder + `Cmd_AddLegacyCommand`
persistence + trailing-comment harvester precision -- 3 siblings tracked
in `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`).
That is a multi-phase arc, needs arc-brainstormer, NOT in scope for this
session.

## Where things are

```
worktree  : /home/paradoks/projects/quakeworld (main, default working dir)
branch    : main
arc tag   : arc-enforce-l1-runtime-truth-shipped (557d8703 in the log)

shipped artifacts (DO NOT undo):
  apps/qw-oracle/scripts/extractors/extractor_lib/_callgraph.py
  apps/qw-oracle/scripts/extractors/ezquake/_handler_hud.py
  apps/qw-oracle/db/migrations/015_l1_runtime_fidelity_provenance.sql
  apps/qw-oracle/scripts/load-knowledge/load-callgraph-reachability.ts
  apps/qw-oracle/scripts/load-knowledge/load-hud-commands.ts
  apps/qw-oracle/scripts/extractors/extractor_lib/_acceptance.py
  apps/qw-oracle/scripts/extractors/ezquake/accept-runtime-truth.py
  apps/qw-oracle/data/detection/version-pin-proxy.sh
  apps/qw-oracle/scripts/build-runtime-dead-entities.py
  apps/qw-oracle/scripts/extractors/extractor_lib/_runtime_dead_entities.py
  apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md

post-arc artifacts (the reads + context for this session):
  docs/superpowers/reviews/2026-05-21-enforce-l1-runtime-truth-post-arc-analysis.md
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/review-findings.md
  HANDOVER.md  (the F16 + F17 entries near the top of "Small followups")

upstream PR (LIVE, awaiting maintainer):
  https://github.com/QW-Group/ezquake-source/pull/1126
  branch: ParadokS81/ezquake-source @ cleanup/runtime-dead-entities
  6 commits, 597 deletions, 0 additions, 4 files

hook infra (fixed 2026-05-21, content-validates now):
  .claude/scripts/upstream-pr-reminder.sh  (commit d7e82393)
```

## Reads required (in order, do not skim)

1. **`docs/superpowers/reviews/2026-05-21-enforce-l1-runtime-truth-post-arc-analysis.md`**
   -- the full post-arc analysis. The verdict is GREEN; the "Open YELLOWs
   from sign-off" section names F16 + F17 + F20-residue + the
   reviewer-found F12-class Phase-5-MD literal. Read the YELLOW + the
   Recommendations sections at minimum.
2. **`docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/review-findings.md`**
   -- the authoritative ledger. Read the F16 section (~lines 726-766) and
   the F17 section (~lines 767-830) IN FULL. They carry the
   primary-source-verified root cause, the safety argument (autonomous
   level-3 protected), the F8 cross-arc shared-substrate constraint, and
   the routed disposition.
3. **`HANDOVER.md`** root entries for F16 + F17 (currently around lines
   33-34). These name the fix shape and the F8 constraint in one
   paragraph each. Use them as the executive summary; the review-findings
   sections are the deep dive.
4. **The Phase-4 MD's F12+F14 dated-correction block** at the top of
   `docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-4-acceptance-contract.md`
   -- this is the house-style template to follow for the F12-class
   Phase-5-MD correction. Match its narrative-preserved shape exactly.
5. **Live source for each fix's blast radius**:
   - F16: `apps/qw-oracle/scripts/load-knowledge/load-version.ts`
     (the step-3 retreat-scan that emits the warning is here).
   - F17: `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` (3e/3f
     `existsSync` gating); `apps/qw-oracle/scripts/extractors/ezquake/emit_callgraph_signal.py`
     (writes the stale 9th/10th artifact); `apps/qw-oracle/scripts/load-knowledge/natural-keys.ts:234`
     (the COALESCE upsert that preserves the level-2 signal).
6. **Memory file** at
   `/home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_cross_phase_audit_shared_file_drift.md`
   -- the F8 cross-arc shared-substrate constraint that binds both fixes.
   The ktx-mvdsv arc may still be active; verify before editing
   `extract-tag.ts` / `natural-keys.ts` / `quality-grid.ts` /
   `load-version.ts`. Re-derive any line-cite by symbol at execution.

## Critical context (do not re-derive; consult cited memory)

### F8 standing rule binds this session

Three of the four target files (`extract-tag.ts`, `natural-keys.ts`,
`load-version.ts`) are F8-shared substrate -- the parallel ktx-mvdsv arc
edits them too. Each fix MUST be its own scoped change with the
all-project F1 grid as the gate, NEVER folded into the other. Concretely:

- Before editing: check `git log --oneline -- apps/qw-oracle/scripts/load-knowledge/load-version.ts`
  and `... extract-tag.ts` for sibling-arc commits AFTER the
  enforce-L1 arc-tag. Drift means re-derive every line cite live by
  symbol search; never trust a frozen `:NNN` line number from the F16/F17
  ledger text.
- After each fix: run the all-project F1 grid (`bun scripts/load-knowledge/quality-grid.ts`
  or equivalent) and confirm ezquake + ktx + mvdsv + fte + qwcl all clean.
  A ktx regression in `log_template` floor is PRE-EXISTING sibling drift,
  not your fix (the F15 RE-VERIFY proved this); a NEW ezquake regression
  IS yours.

### F16 is benign log noise, NOT a defect

- Final state of every `extract-tag --force` re-load has 0 real orphans
  (`F1.entity_has_version_rows` + `F1.cross_type_orphans` PASS).
- The warning is emitted because step-3 (the per-type command
  retreat-scan in `load-version.ts`) runs BEFORE 3e (the Track-B adapter)
  creates the `command_versions` rows for the recovered HUD commands.
- NOT F15-caused (the F15 fix is in `load-hud-commands.ts`, byte-untouched
  by this fix).
- The risk being fixed is HUMAN: a future operator / arc-reviewer reading
  `~117 fully-orphaned entity ... investigate ... crashed mid-flight`
  warnings and concluding the loader is broken. The warning text says
  "investigate (partial walk crashed mid-flight, or cross-type orphan
  pruner failure)" -- which is misleading when the orphan is just
  Track-B-pending in the same run.

### F17 is a real fail-safe-completeness gap, NOT-F15

- The autonomous level-3 tier is PROVABLY protected (0 `dump-confirmed`
  on RED AND on broken-pin -- the Phase-4 RE-VERIFY confirmed this).
- The residual is the never-auto-shipped level-2 tier on an already-GREEN
  DB across a transient OFF/RED run. NOT a level-3 safety hole.
- NOT F15-caused (the 3 root-cause files are byte-unchanged since
  `702421a1`). F17 was a sibling defect that Phase-4 RE-VERIFY surfaced.
- F17 is NON-Phase-5-blocking by design -- Phase 5 runs the pipeline
  GREEN, generates from level-3 ONLY, consumes `route_by_level` + the
  F15-stabilized pool. F17 only affects toggle-off / RED-pristine
  semantics on an already-GREEN DB.
- The fix has multiple shapes (gate the loader 3e/3f on the live toggle;
  OR have the emitter clean the stale artifact on OFF/RED). The
  review-findings F17 disposition section names both; pick the
  least-invasive shape and surface the choice to the operator before
  executing.

### X9 discipline applies to F17 specifically

Recovery is "re-run the corrected extract+load pipeline end-to-end",
NEVER "UPDATE the level-2 rows in place" or "DELETE FROM ... WHERE
track_a_reachability IS NOT NULL". The F17 fix is a CODE change to the
loader / emitter; the L1 data correction comes from running the
corrected pipeline. Any instinct to "fix the rows directly" is the X9
anti-pattern.

### Phase-5-MD F12-class fix is operator-not-technical-gate

Apply the dated correction directly to the locked phase MD. Match the
Phase-4 MD's F12+F14 dated-correction block shape exactly (narrative-
preserved, the original literal stays visible, the correction line is
inline + dated). No `decisions.md` amendment (code/data correct, only
the MD literal wrong). Do NOT silently rewrite the locked MD.

## First three actions

1. **Cold-read the arc-review report + the F16/F17 review-findings
   entries** (Reads 1-3 above). Build the picture of what shipped, what
   remains, and what is forbidden by F8. Do NOT skim -- the F8
   constraint catches a class of errors that ate session time during the
   arc.
2. **Verify nothing has drifted under you since 2026-05-21.** Specifically:
   `git log -- apps/qw-oracle/scripts/load-knowledge/load-version.ts
   apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
   apps/qw-oracle/scripts/load-knowledge/natural-keys.ts` -- if there
   are sibling-arc commits since 2026-05-21, re-derive every line cite by
   symbol before editing. Also `gh pr view 1126 --repo
   QW-Group/ezquake-source` to check if maintainer responded (does not
   block this session but is the natural status check).
3. **Land the Phase-5-MD F12-class correction first** (the 5-min job).
   That clears the smallest item and gives you a feel for the
   narrative-preserved dated-correction house style before tackling F16's
   actual code change.

After those three, work F16 (the ~30-min scope) and stop. F17 is its own
scoped fix-cycle (~1-2 hr) -- decide at the end of F16 whether to
continue in this session or hand off F17 to a separate fresh terminal.
If continuing, the F8 all-project F1 grid is the gate between fixes;
re-run it before declaring F16 done and before starting F17.

## When in doubt

- Re-verify against primary source. Both fixes touch F8-shared substrate;
  the arc's pattern is that prior-session "verified" claims are
  hypotheses until grep/SQL'd.
- Surface to the operator. F17's fix-shape choice (gate the loader vs
  clean the artifact) is an operator decision, not an executor default.
- Stay scoped. F16 fix does NOT touch F17's blast radius and vice versa.
- If a regression appears in the F1 grid that is NOT in the project you
  edited, suspect sibling-arc drift (the ktx-mvdsv arc was active when
  this session ran -- it may have shipped more by the time this fresh
  terminal opens). Verify before mis-routing the blame.
