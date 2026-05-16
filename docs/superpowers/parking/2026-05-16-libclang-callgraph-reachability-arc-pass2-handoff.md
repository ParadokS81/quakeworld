# Handoff: libclang reachability arc -- Pass 2 (fresh terminal)

**For:** arc-brainstormer, Pass 2 (call-graph construction mechanism). Fresh
terminal. You are COLD -- read before acting.

## Where things are

Pass 1 COMPLETE + committed (`8fa383df`). Locked: **SQ1.1 ghosts-only**
(reverse-diff HUD family / legacy-alias / harvester precision are SIBLINGS in
the feeder doc), **SQ1.2 ezQuake-first** (call-graph core engine-general;
per-fork follow-on gated on a pinned runtime answer key). The design spec is
the drain target for all passes. Detection is DONE and banked -- this arc is
the CLASSIFIER, not detection; do not re-run detection.

## Reads required (cold)

- `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  -- THE locked decisions + Pass 2 carry-forwards. Source of truth.
- `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1 COMPLETE block + the original design constraints + the 3-gate
  known-answer harness.
- Memory `reference_qw_oracle_extraction_liveness_gap`,
  `reference_libclang_ezquake_extraction`, `project_extraction_pipeline_vision`.
- LIVE source (verify, do not trust docs): `apps/qw-oracle/scripts/extractors/
  extractor_lib/clang_config.py` + `extractor_lib/_visitor.py` -- confirm the
  real parse-variant set (the parking doc's "dual-parse client/server" is
  STALE; memory says 4-variant client/server/win/apple) and how the shared
  walk dispatches cursors. `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
  -- the 3-tier handler architecture.

## Critical rules

- **Verify, don't infer.** This session caught multiple tooling artifacts
  (CRLF, sort-locale, case-fold, grep line-boundary, a broken grep counter)
  ONLY via known-answer gates. Never trust a heuristic without a
  known-present AND known-absent gate.
- **Per-config union over the REAL variant set.** A function dead in client
  can be live in server/win/apple. Verify the variant set in
  `clang_config.py` first.
- **Function-pointer conservative.** Address-taken => assume reachable; never
  false-accuse a live entity. Under-report is acceptable -- the runtime dump
  is the answer key and mops residue.
- **Comment-strip** (`//` and `/* */`) before locating registration sites
  (the `gl_outline_scale_world` commented-register class).
- **Ghosts-only.** The HUD reverse-diff family is a SIBLING (feeder doc) --
  do NOT pull it into this arc.
- Operator is the design gate; one sub-question per turn; plain-English
  first; be decisive (recommend, don't poll). Solo-dev: Claude runs git
  silently, commits to main, pushes at session wrap, no PR ceremony.

## First three actions

1. Read the design spec + parking Pass-1 block + the libclang/liveness
   memories. Do NOT dispatch anything.
2. Invoke arc-brainstormer; open Pass 2 (call-graph construction mechanism);
   state scope + drain destination (the design spec).
3. First sub-question: tier placement + edge-collection shape -- extend the
   shared visitor's per-cursor walk to record caller->callee CALL_EXPR edges
   in Tier 1 so all forks inherit. VERIFY the visitor architecture against
   live `_visitor.py` before proposing; do not design from the memory alone.

## When in doubt

The goal is a trustworthy ghost classifier on the clean detection
foundation. Reachability must never false-accuse a live entity
(conservative); a clean per-config call-graph the known-answer harness
validates beats a fast approximation. The operator's spot-checks keep
catching real things -- that is the process working.
