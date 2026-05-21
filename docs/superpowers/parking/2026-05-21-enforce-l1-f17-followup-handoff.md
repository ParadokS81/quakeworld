# enforce-L1 F17 follow-up handoff (fresh terminal)

You are a fresh terminal picking up **F17** -- the last post-ship
follow-up from the enforce-L1-runtime-truth arc. F12 (Phase-5-MD literal
correction) and F16 (deferred orphan-warning) shipped earlier today in
this same session; the operator paused before F17 to keep context fresh
and to surface F17's fix-shape decision-point cleanly.

Repo root: `/home/paradoks/projects/quakeworld`. Main tree, branch `main`.

## What already shipped today (2026-05-21)

- **F12 (Phase-5-MD literal correction)** -- commit `339a1033`. The
  locked Phase-5 MD's verification check 3 (line 707 -- the `bun
  scripts/load-knowledge/index.ts load-version --project ezquake
  --version head --force` literal) was replaced with the correct
  `extract-tag --project ezquake --version head --force
  --skip-release-notes` entrypoint, plus a narrative-preserved
  F6/F10/F12/F14 dated block at the top of the MD and an inline `[F12
  DATED CORRECTION 2026-05-21]` marker in the code block. Shipped code
  was always correct; this was MD-literal only.

- **F16 (deferred fully-orphaned warning)** -- commit `67d20d17`.
  Captured the 117/run noise scenario the F15 re-gate surfaced. Fix
  shape: `load-version.ts` now returns `fullyOrphanedEntityIds: number[]`
  from `LoadVersionResult` and emits no in-loop warnings; new exported
  helper `recheckFullyOrphanedAfterPostLoops(sql, project,
  orphansByType)` is called from `extract-tag.ts` step 3g (between 3f
  and step 4) and emits the identical-shape warning only for entities
  STILL orphaned after every adapter has finished. Real orphans still
  surface loudly; transient inter-step gaps stay quiet.
  - **Behaviorally verified 2026-05-21 23:05-23:07** via `bun
    scripts/load-knowledge/index.ts extract-tag --project ezquake
    --version head --force --skip-release-notes`. Log:
    `/tmp/f16-extract-tag-verify.log` (114 lines). Key evidence: `[load-version]
    cleaned up 117 stale command version rows at ezquake@head` (the
    F16 scenario), 0 `fully-orphaned` warnings emitted (was ~117 before),
    exit=0, full ExtractTagResult JSON returned cleanly.
  - F1 quality-grid gate (ran before F16 commit): ezquake/mvdsv/fte/qwcl
    0 regressions; ktx 2 fails are the pre-existing `log_template` floor
    sibling-arc drift the original handoff explicitly anticipates
    (1196 vs 1195, disjoint from F16/F17 mechanism).

These are SHIPPED. Do NOT re-derive their root causes; consult
`review-findings.md` F12/F16 + the post-arc analysis if you need a
refresher.

## What's left: F17

The substantive part. Original handoff:
`docs/superpowers/parking/2026-05-21-enforce-l1-followups-handoff.md`
section "3. F17 fail-safe-completeness gap" carries the full root-cause
chain (3 files byte-unchanged since `702421a1`: `extract-tag.ts` 3e/3f
`existsSync` gating + `emit_callgraph_signal.py` writes-but-never-unlinks
9th/10th artifact + `natural-keys.ts:234` COALESCE preserves the level-2
column). Read that section + review-findings F17 in full (~lines 767-830)
+ the post-arc analysis YELLOW for F17 before proposing.

### The fix-shape decision -- operator-not-default

F17 has multiple valid shapes; the operator wants the choice surfaced
before execution. The two named candidates:

- **(A) Gate the loaders on a live signal.** Modify `extract-tag.ts` 3e
  (Track-B HUD adapter) and 3f (Track-A overlay) so they don't run on
  bare `existsSync(<9th/10th artifact>)` -- additionally require the
  live toggle + D22 validation record + regen-this-run. Net: when the
  passenger is OFF or D22 RED, the loaders no-op and the prior-correct
  level-2 column stays unchanged (D22 fail-safe-CLOSED in spirit, even
  on an already-GREEN DB).

- **(B) Have the emitter clear the stale artifact on OFF/RED.** Modify
  `emit_callgraph_signal.py` so on OFF or D22-RED it actively `unlink`s
  the 9th/10th artifact (`ezquake-callgraph-reachability-ast.json` +
  `ezquake-hud-commands-ast.json`) rather than just declining to write
  new ones. Then `extract-tag.ts`'s existing `existsSync` gates trip
  correctly and the loaders no-op as designed.

Both options preserve the level-3 autonomous-trust safety property (0
`dump-confirmed` on RED AND broken-pin -- proven at the Phase-4 RE-VERIFY
gate; unaffected by F17). The choice is between gating at the consumer
(loaders) vs. cleaning at the producer (emitter). Recommend
characterizing both in plain English + presenting the trade-off; let the
operator pick.

### F8 substrate -- re-derive line cites live

`extract-tag.ts` and `natural-keys.ts` are F8-shared substrate (the
ktx-mvdsv describe-fill arc may have shipped further changes since the
2026-05-21 morning enforce-L1 post-arc; the original handoff documents
the rule). Specifically:

- BEFORE editing: re-run
  `git log --oneline arc-enforce-l1-runtime-truth-shipped..HEAD --
  apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
  apps/qw-oracle/scripts/load-knowledge/natural-keys.ts
  apps/qw-oracle/scripts/extractors/ezquake/emit_callgraph_signal.py`.
  Note: this session's F16 commit `67d20d17` already touches
  `extract-tag.ts` -- that's the only enforce-L1-followups-touched
  change; re-derive other line-cites BY SYMBOL not by frozen line
  number.
- AFTER editing: run the all-project F1 grid
  (`for proj in ezquake ktx mvdsv fte qwcl; do bun
  scripts/load-knowledge/index.ts quality-grid --project $proj; done`,
  from `apps/qw-oracle/`). The ezquake 2 anomalies (doc_only_crosstab
  57, gl_lightmode ping-pong) and ktx 2 regression failures
  (log_template floor 1196/1195) are EXPECTED PRE-EXISTING; a NEW
  ezquake regression IS your F17 fix's fault.

### X9 discipline

F17's recovery is "re-run the corrected extract+load pipeline
end-to-end", NEVER `UPDATE` the level-2 rows in place. The F17 fix is a
CODE change to the loader OR emitter; the L1 data correction comes from
running the corrected pipeline. The X9 re-extract is what PROVES checks
4 + 7 literally `count==0`:

```
$PSQL "SELECT count(*) FROM cvar_versions WHERE track_a_reachability IS NOT NULL;"
$PSQL "SELECT count(*) FROM command_versions WHERE track_a_reachability IS NOT NULL;"
```

Both must read 0 after a toggle-off or D22-RED extract+load run for the
fix to be SUBSTANTIVELY verified (not just literal-MD-reconciled like
the Phase-4 dated correction did).

### Reproduction scenario (need to design)

To prove F17 fixed, you need to:
1. Run a baseline extract+load with the passenger ON / D22 GREEN -> verify
   `track_a_reachability` populated (~2788 cvars + ~514 commands
   stamped). This is the starting GREEN state.
2. Then either force-toggle OFF or break the D22 record / pin, and
   re-extract+re-load with `--force`.
3. After re-load, `count(*) WHERE track_a_reachability IS NOT NULL`
   should be 0 (the level-2 column should retreat to NULL when the
   mechanism is OFF/RED).

Currently (pre-F17-fix) it stays 2788 -- the residual the F17 finding
named. Post-F17-fix it should drop to 0.

Watch: the toggle-off / D22-RED transition must NOT corrupt the
autonomous-trust level-3 column (which is already proven protected -- 0
`dump-confirmed` on RED at Phase-4). Confirm that property survives any
loader gating change.

## First three actions

1. **Cold-read F17 in `review-findings.md`** (~lines 767-830) +
   `review-findings.md` F8 standing rule context + the original
   handoff's F17 section. Also re-read this handoff doc's "fix-shape
   decision" + "F8 substrate" sections. Do NOT skim -- F17 has a
   non-obvious safety surface (the autonomous-trust tier vs.
   never-auto-shipped level-2 tier distinction).

2. **Verify F8 drift** -- `git log` on the three F17 root-cause files
   since the arc-tag. (The 2026-05-21 sibling-arc parallel work may
   have touched them.) Then re-derive any line-cite live by symbol.

3. **Characterize both fix shapes in plain English + present the
   trade-off** to the operator before writing code. Default toward
   least-invasive. The operator will pick (A) or (B); proceed only
   after their call.

After execute + verify: run the all-project F1 grid as the gate, run
the X9 re-extract as the substantive proof, commit, push.

## When in doubt

- F12 + F16 are SHIPPED; do not re-touch.
- F18 (Phase-5 MD check-2 "command reverse 129" literal) is a separate
  open YELLOW; explicitly out of scope for this session's mission. Do
  not bundle.
- F20-residue (5 mislabeled cmdline_params in L1) is routed to the
  L1-extractor sibling arc; out of scope.
- The upstream PR #1126 is LIVE awaiting maintainer; the original
  handoff says it doesn't block this session. Check status only
  out-of-curiosity, not as a gating step.
- Verification discipline: any prior-session "verified" claim in
  ledger text is a HYPOTHESIS until grep/SQL-re-checked. F8 standing
  rule applies harder than usual on F17 because the root-cause files
  are F8-shared substrate.

The fresh terminal opening this should land in main tree, branch
`main`, and start with the F17 reads.
