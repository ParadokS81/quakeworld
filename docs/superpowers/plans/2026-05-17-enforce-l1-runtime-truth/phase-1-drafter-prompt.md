You are drafting Phase 1 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  (libclang call-graph reachability + HUD hidden-command recovery;
   "enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 1 = TRACK A -- the call-graph reachability passenger.

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-1-track-a-callgraph-passenger.md
You do NOT execute anything. No extractor runs, no migrations, no DB writes,
no code changes. Drafting is paper-only.

SELF-CHECK -- you are in the WRONG arc if you see any of these; HALT and tell
the operator instead of writing:
  - "describe-fill", "C1-C5 / P1-P5 / D1-D18", probe-0 N/M denominators,
    KTX/MVDSV man-pages -> 2026-05-16-ktx-mvdsv-l1-describe-fill.
  - "Postgres port", "pgvector", "RRF", "schema-as-generator", 31-table
    inventory -> 2026-05-02-qw-oracle-arc1.
This arc's tells: D1-D22 + X1-X10, Track A / Track B, call-graph
reachability, HUD_Register, 74 cmd / 92 cvar / ~129 reverse, ezQuake-only.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. .../2026-05-17-enforce-l1-runtime-truth/decisions.md  (IN FULL; Phase 1 is
   governed by D1, D2, D3, D4, D5, D6, D7 and X1-X10. D3/D4/D5 are the
   mechanism core; D6 is the integration discipline; D7 splits the two
   feeders.)
2. .../2026-05-17-enforce-l1-runtime-truth/review-findings.md  (Phase 1 owns
   role "A": F2 stale numbers, F3 stale variant count, W2 verified=hypothesis,
   W3 zero-diff real check, W4 regime collision.)
3. .../2026-05-17-enforce-l1-runtime-truth/phase-template.md  (follow exactly;
   do not add/remove sections; the verification sub-agent brief is at the
   bottom.)
4. .../2026-05-17-enforce-l1-runtime-truth/prerequisites.md  (items 1-2 are
   Phase 1's preconditions; item 4 is NOT -- Phase 1 self-validates, it does
   not need the runtime dump.)
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (the WHY for D3-D7; do NOT re-open a D -- surface a deviation if one looks
   wrong.)
6. LIVE source recon (verify, do not copy from spec):
   - apps/qw-oracle/scripts/extractors/extractor_lib/_visitor.py  (the single
     per-variant walk Phase 1 observes read-only; the enter/exit hooks).
   - apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py  (the 4
     build variants -- clang_args_for / _server_for / _win_for / _apple_for;
     F3: confirm it is 4, NOT the parking doc's "dual client/server".)
   - the ezQuake program-entry cascade in research/repos/ezquake-source
     (main -> Host_Init -> the CL_Init/Cvar_Init/*_Init chain; the distinct
     SERVERONLY entry) -- D3 root set.
   - how the existing handlers record a registration site (D7.2: the
     entity->registrar is the enclosing function of the already-recorded
     site; ezquake/_handler_cvars.py / _handler_commands.py).
```

## What Phase 1 delivers (from the locked phase index)

A self-contained Tier-1 shared module beside `_visitor.py` / `clang_config.py`
that OBSERVES the existing single per-variant walk read-only, runs the
per-variant BFS post-walk (D3 root set = entry cascade UNION address-taken
closure; D4 full-subtree propagation; D5 three-valued reachable / unreachable
/ not-compiled + conservative combination), and exposes ONE contract:
`reachable(entity) -> {yes/no, which variants}`. The commented-register
textual concern is surfaced as the SEPARATE feeder (D7.1), not built into the
call-graph. Single subscription seam + single boolean, fail-safe-off,
off-by-default for non-ezQuake (D6/X4).

Runnable state at the boundary: the `reachable()` query answers for the
banked pool; the 3-gate known-answer probes are GREEN against the mechanism's
OWN output (`sb_qtvlist_url` unreachable-everywhere / `gl_outline_scale_world`
via the commented-register feeder / `cl_bobhead` in `V_Init` reachable);
existing entity JSON is byte-identical (X3 zero-diff command + empty result).

## Drafting rules (arc-specific; enforced -- full list in handoff-prompt.md)

```
- Follow phase-template.md exactly, incl. the "Recon facts (verified)"
  sub-block after Goal. ASCII only (X10), "--" for dashes.
- Verify before asserting (X8/W2): re-run the sanity gate against the live
  DB; use 74 cmd / 92 cvar (F2) and the 4 variants from clang_config.py
  (F3). NEVER the parking 77/97/166. Record each in "Recon facts".
- Conservative never-false-accuse (D3): bias to "reachable"; address-taken =
  root, fully traversed (D4); not-compiled is PHYSICALLY distinct from
  unreachable (D5). A live entity must never be classifiable as genuine-dead
  by this mechanism alone.
- Non-corrupting (X3/D6): the phase ships the ACTUAL before/after zero-diff
  command of emitted entity JSON + empty result, not prose. Single seam,
  fail-safe-off (any call-graph failure biases only to "reachable").
- Self-contained verification (X2/W4): verify on the reachable() query +
  feeder output with THIS phase's own 3-gate probes. Do NOT verify against
  an L1 column (no schema yet) or the combined harness (Phase 4). The
  combined one-time-per-fork harness is Phase 4's composition of these
  probes -- ship the probe LOGIC here, not the wiring.
- Zero mechanism blend (D1): no HUD / literal-modeling concern enters this
  module.
- Every task carries an Execution-mode annotation. Subagent-default; the
  call-graph mechanism design task is Opus MAX (X6); mechanical synthesis is
  Sonnet medium. Near-zero inline.
- Stay in scope: Phase 1 does NOT build the commented-register detector from
  scratch (the extractor already runs textual passes -- surface its output
  feeder-tagged per D7.1), does NOT touch the schema/loader (Phase 3), does
  NOT do the runtime-dump cross-check (Phase 4). No FTE/QWCL/MVDSV.
```

## Step-by-step

```
1. Read all required files (1-6).
2. Recon live: the 4 variants in clang_config.py; the entry cascade; the
   visitor walk hooks; how registration sites are recorded; re-run the
   sanity gate. Record every number/path/cite in "Recon facts (verified)".
3. Draft phase-1-track-a-callgraph-passenger.md per phase-template.md.
4. Dispatch the verification sub-agent (Agent, subagent_type=Explore) with
   the brief from phase-template.md's bottom, absolute paths filled.
5. Apply findings. Decision beats a contradicting finding -- record the
   rejection + rationale in "Open questions"; surface (do not silently
   resolve) any decision that looks wrong.
6. Halt with the structured status report. Do NOT start Phase 2.
```

## Halt-and-handback

Report: STATUS (drafted-awaiting-review | NEEDS_OPERATOR); the MD path;
sub-agent CRITICAL/SUBSTANTIVE/ADVISORY counts + how each was resolved; any
decisions.md deviation; open questions. Then STOP. The operator reviews
top-to-bottom, runs the YES/NO verification, and either flips status to
approved (then opens the Phase 2 fresh terminal) or returns this MD here with
feedback. If fundamentally wrong, the operator opens a NEW fresh terminal for
the redraft (this context is then polluted).
