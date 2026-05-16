# Handoff: enforce-L1-runtime-truth arc -- Pass 2 (fresh terminal)

**For:** arc-brainstormer, Pass 2. Fresh terminal. You are COLD -- read before
acting.

## Where things are

Pass 1 COMPLETE + AMENDED (commits `8fa383df`, `12ec5785`, + the amendment
commit). The arc is now **two-track under one North Star: enforce L1 to show
what is actually present and working** (today L1 both shows non-working
commands and hides working ones -- bi-directional, same outcome: L1 lies).

- **Track A -- ghost elimination** (L1 shows non-working): libclang
  call-graph reachability.
- **Track B -- hidden-command recovery** (L1 hides working): model the
  `HUD_Register` contract.
- **Shared foundation:** the command-direction detection harness is
  case-broken (verified: inflates the Track-B reverse-diff AND injects >=3
  false ghosts into Track A's 77-pool). Must be case-normalized before either
  track trusts its input.

Tracks are phased + separately gated, **zero mechanism blending**. Detection
is DONE -- this arc is the classifier/recovery, not detection; do not re-run
detection. The runtime dump is the shared answer key (Track A gate: correctly
absent/unreachable; Track B gate: now present/matches runtime).

## Reads required (cold)

- `docs/superpowers/specs/2026-05-16-libclang-callgraph-reachability-design.md`
  -- THE locked decisions (D1 amended two-track, D2 ezQuake-first), North
  Star, revised 5-pass plan. Source of truth.
- `docs/superpowers/parking/2026-05-16-libclang-callgraph-reachability-arc.md`
  -- Pass 1 block + amendment + original design constraints + 3-gate
  known-answer harness.
- `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`
  -- the verified Track-B mechanism detail (`hud.c:1232` bare name;
  `hud.c:1271-1278` `+hud_`/`-hud_`; `HUD_Register` literals at
  `hud_radar.c:1422` etc.) + the do-not-propagate retraction.
- Memory `reference_qw_oracle_extraction_liveness_gap`,
  `reference_libclang_ezquake_extraction`, `project_extraction_pipeline_vision`.
- LIVE source (verify, do not trust docs): `apps/qw-oracle/scripts/extractors/
  extractor_lib/clang_config.py` (real parse-variant set -- the parking doc's
  "dual-parse client/server" is STALE; memory says 4-variant
  client/server/win/apple) + `extractor_lib/_visitor.py` (shared-walk cursor
  dispatch). `EXTRACTOR-PLAYBOOK.md` (3-tier handler architecture).

## Critical rules

- **Verify, don't infer -- and don't trust your own probe.** This session
  caught CRLF, sort-locale, case-fold, grep line-boundary, a broken grep
  counter, AND a flawed case-fold probe -- each only via a known-answer gate.
  Never trust a heuristic without a known-present AND known-absent gate.
- Per-config union over the REAL variant set (verify in `clang_config.py`).
- Function-pointer conservative: address-taken => assume reachable; never
  false-accuse a live entity. Under-report OK -- the dump mops residue.
- Comment-strip (`//`, `/* */`) before locating registration sites.
- Two tracks, no blending. Only `Cmd_AddLegacyCommand` persistence +
  trailing-comment harvester remain siblings (feeder doc) -- do NOT pull in.
- Operator is the design + scope gate; one sub-question per turn;
  plain-English first; be decisive (recommend, don't poll). Solo-dev: Claude
  runs git silently, commits to main, pushes at session wrap, no PR ceremony.

## First three actions

1. Read the design spec + parking Pass-1/amendment + the feeder Track-B
   detail + the libclang/liveness memories. Do NOT dispatch anything.
2. Invoke arc-brainstormer; CONFIRM the revised 5-pass plan with the operator
   (it grew 4->5 on the amendment) before opening Pass 2.
3. Open Pass 2 (shared foundation: command case-fold harness fix + Track A
   call-graph construction). First sub-question: the case-fold harness
   correction shape (it is a prerequisite both tracks depend on) -- VERIFY
   against the live banked diff scripts (`/tmp/front1-diff.sh`) and
   `clang_config.py` before proposing.

## When in doubt

The goal is L1 telling the runtime truth, both directions, validated by the
shared dump. Conservative always (never false-accuse a live entity). A clean
per-config foundation the known-answer harness validates beats a fast
approximation. The operator's spot-checks keep catching real things -- that
is the process working.
