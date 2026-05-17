# Handoff prompt -- generic shape for per-phase drafting

This file is the TEMPLATE the planner uses to generate per-phase
`phase-<N>-drafter-prompt.md` files (after the slicing gate). The operator
does NOT use this file directly. Per-phase files are **file-as-prompt**: the
operator types `@docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-<N>-drafter-prompt.md`
in a fresh terminal; the file content IS the instruction (no BEGIN/END
wrapper, no copy-paste markers, no afterword).

Every generated per-phase prompt substitutes `<N>` / `<NAME>` / the
phase-specific reads and decisions, and carries the sections below.

---

## Strong arc identification (mandatory at the top of every per-phase prompt)

```
You are drafting Phase <N> of the arc:
  2026-05-17-enforce-l1-runtime-truth
  (libclang call-graph reachability + HUD hidden-command recovery;
   "enforce L1 runtime-truth"; ghost elimination + hidden-command recovery)

This is a STRUCTURED PLANNING task. Your output is ONE markdown file:
  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-<N>-<name>.md
You do NOT execute anything. No extractor runs, no migrations, no DB writes,
no code changes. Drafting is paper-only.

SELF-CHECK -- you are in the WRONG arc if you see any of these; HALT and tell
the operator instead of writing:
  - "describe-fill", "C1-C5 / P1-P5 / D1-D18", probe-0 N/M denominators,
    KTX/MVDSV man-pages -> that is 2026-05-16-ktx-mvdsv-l1-describe-fill.
  - "Postgres port", "pgvector", "RRF", "schema-as-generator", 31-table
    inventory -> that is 2026-05-02-qw-oracle-arc1.
  - "qwiki", "MediaWiki", "Page Forms" -> a qwiki arc.
This arc's tells: D1-D22 + X1-X10, Track A / Track B, call-graph
reachability, HUD_Register, 74 cmd / 92 cvar / ~129 reverse, ezQuake-only.
```

## Working directory

```
Repo root: /home/paradoks/projects/quakeworld
Scaffold:  docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/
```

## Required reading (numbered; read ALL before drafting)

```
1. docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/decisions.md
   (D1-D22 + D11 amendment + X1-X10 + non-goals -- IN FULL).
2. docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/review-findings.md
   (find the F/R/W rows whose owning phase role is THIS phase).
3. docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/phase-template.md
   (the mandatory shape -- follow it exactly; do not add/remove sections).
4. docs/superpowers/plans/2026-05-17-enforce-l1-runtime-truth/prerequisites.md
   (what is assumed to exist when this phase starts).
5. docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md
   (the locked rationale -- decisions.md is the distilled contract; the spec
   is WHY. Do NOT re-open a D; if one looks wrong, surface a deviation.)
6. <phase-specific live-source reads -- substituted per phase: e.g. the
   extractor_lib/_visitor.py + clang_config.py for Track A; hud.c +
   ezquake/_handler_cvars.py + ezquake/_handler_commands.py for Track B;
   apps/qw-oracle/SCHEMA.md + db/migrations/ for the schema phase; the
   in-repo ezquake-runtime-dead-entities.md for the application phase.>
```

## Drafting rules (arc-specific; enforced)

```
- Follow phase-template.md exactly. Goal -> Recon facts (verified) -> Inputs
  -> Files touched -> Tasks -> Verification -> Outputs -> Open questions ->
  Recovery -> verification sub-agent dispatch. "n/a" for empty sections.
- ASCII only (X10): no em-dash, en-dash, or emoji; "--" for dashes.
- Verify before asserting (X8 / W2): recon LIVE source for every number,
  path, line cite, column. NEVER copy a number from the spec unchecked.
  Re-run the sanity gate for any pool number the phase rests on and record
  the result in "Recon facts (verified)". Use 74 cmd / 92 cvar / ~129
  reverse and the 4 build variants from clang_config.py -- NEVER the parking
  Scope numbers 77/97/166/132 (review-findings F2/F3).
- Zero mechanism blend (D1/D12): Track A and Track B share no code, no
  schema discriminator, no acceptance gate.
- Track B is COMMANDS ONLY (D11 amended / R7): the new _handler_hud.py emits
  zero type='cvar' entities (collision with _handler_cvars.py).
- Conservative never-false-accuse (D3/D5): not-compiled is distinct from
  unreachable; reachable-in-any-variant -> build-excluded -> never
  auto-shipped.
- Non-corrupting (X3/D6/D9): the phase ships the ACTUAL before/after
  zero-diff command + empty result, not a prose assertion. Single toggle
  seam, fail-safe-off, off-by-default for non-ezQuake (X4).
- Self-contained verification (X2 / W4): verify on THIS phase's own output;
  never on a later phase's L1 column or the combined harness.
- Every task carries an Execution-mode annotation (subagent <model>
  <effort> + rationale | inline + rationale). Subagent-default for code
  synthesis; near-zero inline; design tasks Opus MAX (X5/X6).
- No length cap; do not cut tasks/verification to fit. Split only if two
  sub-deliverables ship as independent commits; default NOT to split and
  surface in Open questions.
- Stay in scope: no FTE/QWCL/MVDSV, no cvar half, no help-JSON doc-gap arc,
  no entity-name case mini-arc, no detection re-run (non-goals). Drift =
  flag a deviation, do not silently proceed.
```

## Step-by-step

```
1. Read all required files (1-6).
2. Recon the live codebase for this phase's specifics (paths, line cites,
   schema columns, the 4 variants, the re-run sanity-gate result). Record
   each in "Recon facts (verified)".
3. Draft the phase MD at the output path, following phase-template.md.
4. Dispatch the verification sub-agent (Agent, subagent_type=Explore) with
   the brief from phase-template.md's bottom, absolute paths filled.
5. Apply the sub-agent's findings. If a finding contradicts decisions.md,
   the decision wins -- record the rejected finding + one-line rationale in
   "Open questions". If a decision itself looks wrong, do NOT comply or
   override silently -- surface for an operator amendment.
6. Halt with a structured status report (below). Do NOT proceed to Phase
   N+1. Do NOT execute anything.
```

## Halt-and-handback shape

```
Report to the operator:
- STATUS: drafted (awaiting review) | NEEDS_OPERATOR (deviation/decision)
- Phase MD path.
- Sub-agent verification: CRITICAL / SUBSTANTIVE / ADVISORY counts + how each
  was resolved (applied | rejected-with-rationale).
- Any decisions.md deviation surfaced (with the D/X number and why).
- Open questions left for the operator.
Then STOP. The operator reviews top-to-bottom and either flips status to
approved (and opens the next phase's fresh terminal) or returns this MD to
THIS terminal with feedback. If the MD is fundamentally wrong, the operator
opens a NEW fresh terminal for the redraft (this context is then polluted).
```

---

## Recovery -- a phase MD comes back wrong

If a drafted phase MD is fundamentally wrong (drafter context polluted, or
it re-opened a decision), do NOT re-prompt the same terminal. Open a NEW
fresh terminal, paste the same `@phase-<N>-drafter-prompt.md`, and prepend a
one-paragraph hint naming the prior draft's specific defects so the redraft
avoids them. The polluted terminal's context cannot be trusted to self-correct.
