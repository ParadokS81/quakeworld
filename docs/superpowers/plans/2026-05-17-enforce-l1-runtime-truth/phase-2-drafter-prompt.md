You are drafting Phase 2 of the arc:
  2026-05-17-enforce-l1-runtime-truth
  ("enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

Phase 2 = TRACK B -- ezquake/_handler_hud.py, COMMANDS ONLY.

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-2-track-b-handler-hud.md
You do NOT execute anything. Drafting is paper-only.

SELF-CHECK -- WRONG arc if you see "describe-fill / C1-C5 / probe-0 N/M"
(ktx-mvdsv) or "Postgres port / pgvector / RRF" (qw-oracle-arc1). HALT and
tell the operator. This arc's tells: D1-D22 + X1-X10, Track B, HUD_Register,
commands-only, 74/92/~129, ezQuake-only.

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. .../decisions.md  (IN FULL; Phase 2 is governed by D1, D2, D8, D9, D10,
   D11-AMENDED, D16 and X1-X10. Read the D11 amendment block CLOSELY: the
   cvar half is STRUCK; this handler is COMMANDS ONLY.)
2. .../review-findings.md  (Phase 2 owns role "B": F1 order/show prose
   awareness, R1 AST-confirm 0 non-literal first args, R3-emit element key,
   R7 zero-cvar collision guard, W2/W3/W4.)
3. .../phase-template.md  (follow exactly; verification sub-agent brief at
   the bottom.)
4. .../prerequisites.md  (items 1-2 are preconditions; item 4 is NOT --
   Phase 2 self-validates on handler JSON.)
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (D8-D11 WHY; the D11 amendment is authoritative over the D11 body.)
6. docs/superpowers/parking/2026-05-17-hud-cvar-coverage-audit-findings.md
   (the evidence the cvar half is REDUNDANT and why the new handler must not
   emit cvars -- collision specifics.)
7. LIVE source recon (verify, do not copy from spec):
   - research/repos/ezquake-source hud.c: HUD_Register definition (~1182),
     the bare Cmd_AddCommand(name, HUD_Func_f) (~1232), the
     Cmd_AddRemCommand +/- pair (~1273-1278) double-gated by if(show) +
     if(flags & HUD_PLUSMINUS); HUD_PLUSMINUS in hud.h (~37); the literal
     control togglehud (~819, a plain Cmd_AddCommand, NOT HUD_Register).
   - apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py:288-351
     (_synthesize_hud_cvars, wired :384/:413/:481-482) -- the cvar emitter
     this handler MUST NOT duplicate (R7 collision on
     entities UNIQUE(project,type,name)).
   - apps/qw-oracle/scripts/extractors/ezquake/_handler_commands.py  (the
     literal-only command handler whose blind spot created the gap -- D9
     premise: it emits nothing for the variable-named registration).
   - the 8-handler architecture (memory project_extraction_pipeline_vision;
     the ezquake/ project handler dir).
```

## What Phase 2 delivers (from the locked phase index)

A NEW project-private handler `apps/qw-oracle/scripts/extractors/ezquake/
_handler_hud.py` that models the `HUD_Register` COMMAND contract end to end
(D8): bare `<name>` unconditional for every call site (literal arg #1);
`+hud_<name>`/`-hud_<name>` gated on the call site's `flags` literally
containing `HUD_PLUSMINUS` AND `show` a non-NULL literal. Element key (the
literal `HUD_Register` arg #1) emitted per recovered command for D16. Purely
additive, inherits D6's non-invasive bar (D9), single seam, fail-safe-off
(X4). It emits ZERO `type='cvar'` entities (D11-amended / R7). The literal
0-non-literal-first-arg assumption is AST-confirmed before it is load-bearing
(R1).

Runnable state at the boundary: the handler emits the bare/`+`/`-` commands;
the 3 HUD anchors are GREEN on the handler JSON (`radar` bare; `+hud_radar`
+`-hud_radar`; `togglehud` present and NOT emitted/duplicated -- the
additivity gate) PLUS a probe asserting zero `type='cvar'` emission (R7);
existing entity JSON byte-identical (X3 zero-diff command + empty result).

## Drafting rules (arc-specific; full list in handoff-prompt.md)

```
- Follow phase-template.md exactly incl. "Recon facts (verified)". ASCII
  only (X10).
- COMMANDS ONLY (D11-amended / R7): the handler MUST NOT synthesize any
  cvar. Ship a probe that proves zero type='cvar' emission. A cvar emitter
  collides with _handler_cvars.py:288-351.
- R1: the "83 sites, 0 non-literal first arg" finding is a TEXTUAL probe.
  The phase must AST-confirm 0 non-literal HUD_Register first args via the
  extractor's libclang AST before the literal-only path is load-bearing. If
  a non-literal is found: STOP, surface to operator (do NOT constant-
  propagate -- that blends toward Track A, violating D1).
- F1 awareness: the spec D11 body mislabels `order` as gated; live hud.c
  shows `order` UNCONDITIONAL, `show` gated. No code impact (cvar half
  struck) -- do not be misled into an analogous command-half error; D8's
  +/- gating (HUD_PLUSMINUS + non-NULL show) is independently correct.
- Non-corrupting (X3/D6/D9): purely additive; ACTUAL before/after zero-diff
  command + empty result; single seam; off == today's pipeline.
- Self-contained verification (X2/W4): the 3 anchors + zero-cvar probe run
  against the handler JSON. Do NOT verify against an L1 column (Phase 3) or
  the combined harness (Phase 4). Ship the anchor LOGIC; Phase 4 wires it.
- Zero mechanism blend (D1): literal/constant modeling only -- no call-graph,
  no Track-A concern.
- Execution-mode per task; subagent-default; mechanical synthesis Sonnet
  medium; near-zero inline.
- Stay in scope: no cvar half, no schema/loader (Phase 3 stores the element
  key -- R3-store), no dump cross-check (Phase 4), no FTE/QWCL/MVDSV.
```

## Step-by-step

```
1. Read all required files (1-7).
2. Recon live: the hud.c line cites; _handler_cvars.py:288-351; the literal
   command handler; re-run the sanity gate. Record in "Recon facts".
3. Draft phase-2-track-b-handler-hud.md per phase-template.md.
4. Dispatch the verification sub-agent (Explore) with the bottom brief.
5. Apply findings; decision beats a contradicting finding (record rejection
   + rationale); surface a wrong-looking decision, do not silently resolve.
6. Halt with the structured status report. Do NOT start Phase 3.
```

## Halt-and-handback

Report STATUS; MD path; sub-agent CRITICAL/SUBSTANTIVE/ADVISORY + resolution;
any decisions.md deviation; open questions. Then STOP. Operator reviews + runs
the YES/NO verification, flips to approved (opens the Phase 3 terminal) or
returns this MD here; fundamentally-wrong -> NEW fresh terminal for redraft.
