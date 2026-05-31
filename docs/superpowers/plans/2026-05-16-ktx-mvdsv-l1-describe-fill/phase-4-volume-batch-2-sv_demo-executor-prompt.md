# EXECUTE Phase 4 -- MVDSV volume batch 2: `sv_demo*` (MVD demo-recording subsystem)

You are the **arc-executor** for the **second MVDSV volume batch** of the
2026-05-16 KTX/MVDSV L1 describe-fill arc, Phase 4. Batch 1 (`pm_*` movement,
6 cvars) shipped 2026-05-30/31: the synthesize -> V-pass -> persist loop is
validated and the reusable write path exists. You ship ONE subsystem cluster --
the `sv_demo*` cold-synth cvars -- end to end and HALT with a report. Open this
in a FRESH terminal (batch 1 ended at ~500k; do not continue a hot terminal).

Invoke the `arc-executor` skill first. Working dir:
`/home/paradoks/projects/quakeworld`. Run the session at `/effort max`.

## What batch 1 already built (REUSE, do not rebuild)

- **`apps/qw-oracle/scripts/describe-fill/synthesize-mvdsv.ts`** -- the MVDSV
  write path. Modes: `--persist <records.json> [--dry-run] [--operator-override
  <names>]`, `--fingerprint`, `--status`. fill-not-create, F-D9b clobber-guard
  (skips terminal-owned rows), `tx.json` provenance binding, transaction +
  dry-run rollback, in-scope idempotency fingerprint. The `--operator-override`
  flag is the D11 review-tail correction path (re-write a named terminal row).
- **`F1.jsonb_columns_not_strings` extended to mvdsv** in `quality-grid.ts`
  (PASS). The other live describe_fill probes: `origin_vocabulary` (currently
  RED on a PRE-EXISTING KTX `recast_v2` issue -- NOT yours; see carry-forward),
  `synthesized_requires_anchor` (PASS), `provenance_entry_exists` (PASS, gates
  shipped_doc only). NOTE: `synthesized_requires_source_ref` was never
  registered (placeholder only) -- there are 3 describe_fill probes, not 4.
- The proven loop + worked records are in **`mvdsv-pm-batch-ledger.md`** and the
  12-knob **`mvdsv-calibration-ledger.md`**. Read these as your loop template.

## Three process fixes baked in (the point of this batch -- batch 1 hit ~500k)

1. **Keep the heavy text OUT of the orchestrator's context (the KTX b4-ledger
   pattern).** Each synthesis sub-agent writes its FULL record -- description +
   `description_reasoning` + the per-clause enforce-trace table -- into its OWN
   committed ledger file `mvdsv-svdemo-ledger-<knob>.md` (one file per knob, no
   write races). It returns to you ONLY: the one-line verdict, the final
   `description` text (needed for the V-pass), and the `source_ref`(s) (needed
   for F-D6a). The bulky reasoning/trace never enters your conversation. Then
   either build a small `--from-ledger <glob>` parser into `synthesize-mvdsv.ts`
   (mirror `apply-l1-from-ledgers.py`, but TS + the D6Record fields) OR assemble
   `records.json` from the per-knob ledgers -- either way the durable artifact
   is git-committed and the DB is reconstructable from it (batch 1's gitignored
   records.json was the gap).
2. **KTX-override cross-check for any command UX (F-MV1).** Batch 1's
   `pm_airstep` Set-by initially documented the MVDSV ENGINE command, but that
   command is `overrideable=true` and KTX replaces it (real players hit KTX's
   toggle, not the engine). `sv_demo*` are pure config cvars (server.cfg-set, no
   in-game command), so this is LOW risk here -- but if any `Set by:` clause
   would cite an in-game command, the sub-agent MUST grep `research/repos/ktx/
   src/commands.c` for a KTX override before describing its UX. The V-pass
   (MVDSV-only oracle) cannot catch this. The cvar PHYSICS/behavior is
   engine-owned and unaffected.
3. **One canary per V-pass wave from the start.** Batch 1's first round put a
   canary in only one wave; it CAUGHT a false-negative (a sub-agent
   rubber-stamped an inverted-polarity row), forcing a full re-run. Inject one
   planted-wrong canary (e.g. an inverted on/off or a wrong default) into EVERY
   wave; HARD GATE 1 = reject+re-dispatch the wave if its canary verdict is
   wrong. Sharpen with the reachability rule that fixed batch 1: for any
   trigger/direction clause, solve the branch arithmetic, do not trust the prose.

Also: read the contract SURGICALLY. This prompt distills what you need. Do NOT
re-read `phase-4-mvdsv-fill.md` or `decisions.md` cover-to-cover (that was batch
1's context bloat) -- grep them for a specific lock only if a real question
arises. Halt at the next clean knob boundary if you approach ~300k.

## Scope -- the `sv_demo*` cold-synth cvars (recon live; ~12 + optional 3 qtv_*)

All `cvar`, all cold-synth (`description IS NULL`, no shipped-config candidate),
engine-owned (MVD demo recording). Recon the exact set live (do NOT trust this
list blind -- a prior session's list is a hypothesis):
`sv_demoCacheSize, sv_demoClearOld, sv_demoDir, sv_demoDirAlt, sv_demoExtraNames,
sv_demofps, sv_demoIdlefps, sv_demoMaxDirSize, sv_demoMaxSize, sv_demopings,
sv_demoPrefix, sv_demoRegexp, sv_demoSuffix, sv_demotxt, sv_demoUseCache` (~12-18
`sv_demo*`). Optional fold-in: `qtv_maxstreams, qtv_password, qtv_streamport`
(3, QTV streaming -- engine-side). Confirm the cluster + suspect-pool status at
first action; NONE of these are in the Phase-0 C3 MVDSV suspect pool (the genuine
pool is `sv_www_*`/`sv_web_*`/`sys_sleep`/`localcommand`), so suspect_pool=FALSE
for all -- but verify against `phase-0-artifacts/c3-suspect-pool.md`.

These are simple config cvars -- expect LEAN descriptions (operator-locked bar:
richness scales to the entity; KTX is a coordinator and runs rich, MVDSV engine
cvars are one-knob-one-thing and run lean -- do NOT pad them with Example/
Permission scaffolding the knob does not need).

## The loop (proven in batch 1 -- repeat with the fixes above)

1. **Recon live:** `git -C research/repos/mvdsv describe --tags` (anchor, was
   `1.11-53-g18d0362`; do NOT hardcode), the cluster's NULL-description rows +
   their `cvar_versions` source_ref, the DB up
   (`docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle`),
   `bun scripts/describe-fill/synthesize-mvdsv.ts --status`.
2. **Synthesis fan-out.** One `describe-fill-synthesis` sub-agent per knob,
   model `opus` MAX reasoning, MINIMAL brief (the 9 non-inferential elements from
   `~/.claude/skills/describe-fill-synthesis/references/subagent-brief-template.md`
   -- the skill supplies D20; do NOT re-inject it). provenance = NULL (cold-synth;
   operator clarification 2026-05-30 -- provenance is shipped-doc DATA only).
   Sub-agent writes its full record to `mvdsv-svdemo-ledger-<knob>.md`, returns
   only verdict + description + source_ref (fix #1).
3. **F-D6a grep-verify.** Independently grep every returned `source_ref`/line
   against live MVDSV source BEFORE trusting it. A fabricated line is a shipped
   lie. (Batch 1: zero fabrication -- the discipline holds, keep it.)
4. **V-pass.** Independent, READ-ONLY, cold-context sub-agents (model `opus`,
   MAX), each given ONLY knob + the synthesized `description` (NOT the reasoning
   -- B3 independence). Per-clause enforce-trace against MVDSV source at the
   anchor; classify TRACED-CLEAN / C-NEAR-MISS / C-FIX / WI2-FIX. ONE canary per
   wave (fix #3). HARD GATE 1 (canary) + HARD GATE 2 (you re-grep >=1 clause per
   wave). Adapt `v-pass-handover-prompt.md` (source oracle = the loaded MVDSV
   head, NOT KTX).
5. **Seeded re-synth (B4)** for any flagged REAL row: back through D6 from step
   1, seeded with the V-pass finding, full trace-every-clause, re-V-pass.
   Terminate at TRACED-CLEAN or a genuine hedge/residue.
6. **Persist** via `synthesize-mvdsv.ts` (the `--from-ledger`/records path),
   prove idempotency (byte-identical fingerprint on a second run -- the guard
   skips terminal rows), assert the 3 describe_fill probes + jsonb GREEN for
   mvdsv. Append the batch ledger + commit (this arc's files only).

## Critical rules (locked -- carried from batch 1)

- **Verification discipline is highest priority.** Re-derive every load-bearing
  number/path/anchor via psql/grep/git. This handoff is a hypothesis. A
  confident domain-expert correction from the operator outranks a clean
  single-codebase trace -- dig for the cross-codebase cause (F-MV1), do not
  explain it away.
- **D20 split + lean-scales-to-complexity.** `description` = condensed
  ezquake.com-style user-doc, NO file:line / engine jargon; cites + trace ->
  `description_reasoning`. These are simple cvars -> short descriptions; do not
  inflate.
- **D6 confabulation guard.** Not source-legible -> hedge or C1-route; NEVER
  guess. Name-only synthesis is FORBIDDEN.
- **C4 -- repair by re-running the corrected pipeline, never a hand UPDATE.**
  Operator corrections at the review tail use `--operator-override`. JSONB binds
  JS values / `tx.json`, never pre-stringified (P2).
- ASCII only in committed docs/code. Bun runner. Main-tree git, commit-on-main,
  push at checkpoint, no worktree/PR ceremony (you run git silently). Commit
  ONLY this batch's files; `git diff --cached --stat` between add and commit.

## Carry-forward (orchestrator/operator items -- NOT blockers for this batch)

- **`recast_v2` vocab decision (un-reds `origin_vocabulary`).** 633 KTX rows
  carry `description_origin='recast_v2'` (the D21 format-unify owned tag), absent
  from the probe's allowed set + D2's vocabulary. It is a legitimate owned-track
  tag (all carry anchor + reasoning). Operator decides: add `recast_v2` (+ note
  MVDSV uses `synthesized`) to the vocab, or treat it as a D21 mis-stamp. The
  probe is RED until resolved, but 0 MVDSV contribution.
- **Fold the provenance-NULL clarification into `decisions.md` D11** (executor
  recorded it in the ledgers; orchestrator ratifies into decisions).
- **Promote F-MV1 to `review-findings.md`** (overrideable-command cross-check) --
  it governs the 108-command MVDSV bucket especially.

## First actions (cold start)

1. Invoke `arc-executor`. Read (surgically): `mvdsv-pm-batch-ledger.md` (the
   proven loop + the F-MV1 finding), `mvdsv-calibration-ledger.md`, the
   `describe-fill-synthesis` SKILL.md + its 6 references, and skim
   `synthesize-mvdsv.ts` (the persist path you reuse). Do NOT cover-to-cover the
   phase MD / decisions.md.
2. Recon live (anchor, the cluster, suspect-pool, DB, `--status`). Confirm the
   `sv_demo*` cluster (+/- qtv_*) with the operator if the count differs.
3. Run the loop with the three fixes. HARD GATE 1+2 each wave.
4. Persist; prove idempotency + probes GREEN; ledger; commit + push.

## Halt-and-report

HALT with: **DONE** (cluster persisted, idempotent, probes GREEN [note the
pre-existing `origin_vocabulary` RED is not yours], V-pass clean) /
**DONE_WITH_CONCERNS** (name them) / **NEEDS_CONTEXT** / **BLOCKED**. Report:
per-knob verdict + V-pass classification + any re-synth, the idempotency
fingerprint, the probe results, any HG2 catch, any F-MV1 command cross-check
outcome, and a one-line batch-3 recommendation (candidate: `allow_download*` (8),
or `sv_www*`/the C3 suspect cluster, or a first `sv_*` admin slice -- which needs
the deferred mechanical shipped-config sibling). Do NOT proceed to batch 3 in the
same terminal if you near ~300k -- wrap and write the next handoff.
