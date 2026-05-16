# dusty-* antilag fork -- L1 onboarding (future arc)

**Captured:** 2026-05-16 during the KTX/MVDSV Layer-1 describe-fill
arc-brainstormer, Pass 3.2 (drift/conflict policy). Operator already knows
this is an arc; this is durable capture so it does not drown in the backlog.
**Status:** future arc, waiting on trigger (operator-initiated).
**Parent context:** `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md`
D10 ships the L1 stopgap; this arc is the full fork extraction.

## What it is

`research/repos/dusty-ktx` and `research/repos/dusty-mvdsv` are the antilag
fork, cloned but never extracted. The 2026-05-15 KTX/MVDSV doc-landscape
probes and the M denominators (KTX cvars 260, MVDSV cvars 183) are
**mainline-only**; the fork is entirely outside current L1.

Most QW servers run both mainline and the antilag fork on different port
ranges, so an admin genuinely faces both behaviors.

## Verified shape (primary source, 2026-05-16) -- it is a behavior fork, not an entity-set fork

- **MVDSV engine side: identical.** `mvdsv` and `dusty-mvdsv` register
  `sv_antilag` / `sv_antilag_no_pred` / `sv_antilag_projectiles` on the same
  lines, same empty default, same `CVAR_SERVERINFO`.
- **Antilag-named entity surface: identical.** Both `ktx` and `dusty-ktx`
  register only `k_vp_antilag` and the `antilag` command. The fork adds **no
  new antilag-named cvars or commands**.
- **Behavior behind the shared names: massively different.**
  - mainline `ktx`: no `antilag.c`. `sv_antilag` is a thin passthrough,
    vote-toggled 0 <-> 2, "on" tested as `== 2`.
  - `dusty-ktx`: a 783-line `src/antilag.c` plus weapons/client/vote
    changes. Its antilag engages at `sv_antilag == 1`; vote increments it
    (`+1`, multi-mode, `AntilagModeString`).
- Net: same cvar name, different meaning per build. Setting `sv_antilag 1`
  turns dusty antilag on but is NOT the mainline on-state (mainline wants 2).

Honest bound: only the *antilag-named* surface was verified this session.
Whether `dusty-*` diverges in other-named entities is unknown -- that is the
first cheap probe of this arc, not a settled fact.

## Scope when triggered

- Onboard-extractor **fork path** (subclass parent KTX/MVDSV handlers; see the
  `onboard-extractor` skill, which already names an "antilag-mvdsv extractor").
- The value is divergent **descriptions for shared entities**, not a new
  entity catalog -- the provenance/description model must express
  "this knob means X on mainline, Y on the fork," per the describe-fill
  D10 cross-fork class.
- Cheap probe first: diff the full `dusty-*` registered cvar/command set
  against mainline to size the real divergent surface beyond antilag.

## Relationship to the describe-fill arc

- describe-fill D10 (`sv_antilag` dual description, C2-flagged, source-grounded,
  resolved inline at the D7 tail) is the L1 stopgap so the mainline KB does
  not lie about `sv_antilag` while this arc waits.
- This arc, when it ships, supplies the fork side of those dual descriptions
  through real extraction rather than a hand-noted stopgap.

## Related

- `docs/superpowers/specs/2026-05-15-ktx-mvdsv-l1-describe-fill-design.md` (D10).
- `docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/` (mainline-only denominators).
- Memory: `project_extraction_pipeline_vision`, `feedback_exhaustive_mapping`,
  `project_qw_oracle_source_truth`.
- `onboard-extractor` skill (fork-vs-port branch).
