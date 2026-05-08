# Review findings -- evidence trail for extractor discipline catch-up arc

This arc has no prior plan attempt; the two-pass arc-brainstormer (`docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`) closed cleanly with operator sign-off at each pass close. Findings here are NOT plan-bug fixes; they are:

1. **Per-gate catch-up audit findings** that surface during phase execution -- when each gate runs against all 5 projects, real bugs / pre-existing anomalies / acceptable gaps get captured here.
2. **Spec-callouts** that influence one or more phase drafts and don't fit cleanly into a single decision.
3. **Caveats** the brainstorm surfaced as worth flagging for execution-time vigilance.

The fixes (where applicable) are encoded as decisions in `decisions.md`. This file is the audit trail: per-finding evidence + which phase resolves it.

New findings discovered during phase drafting / execution append to this file with sequential F-numbers. Each finding gets a track per D8 (drain-now / HANDOVER small followup / explicit reject).

---

## How to use this doc

While drafting each phase MD:

1. Identify which findings touch the phase you're drafting (see "Phase ownership of findings" table at bottom).
2. Verify the relevant decision in `decisions.md` resolves the issue, OR confirm the finding is a count / shape anchor your phase must reproduce exactly.
3. If the phase doesn't naturally resolve a finding that touches it, surface that in the phase's "Open questions" section.
4. New findings emerging during phase drafting append to this file with sequential F-numbers and tag the phase that resolves them.

While executing each phase:

1. Run the gate against all 5 projects per D6.
2. Triage each finding per D8 (drain-now / HANDOVER small followup / explicit reject).
3. Append a section here for any drain-now or HANDOVER-bound finding (skipping explicit-reject is fine; commit body captures the rejection).

---

## Findings

### F1: Full-suite pytest discovery -- sys.path pollution causes FTE and QW collection errors

**Severity:** Low (no FAIL; only affects collection in full-suite `pytest extractors/` mode)

**Track:** HANDOVER small followup

**Discovered:** Phase 3 execution (2026-05-08) when V6 ran `pytest apps/qw-oracle/scripts/extractors/ --collect-only -q`.

**Evidence:**

- `fte/tests/test_fte_asset_paths.py` -- `ImportError: cannot import name 'AssetLoaderSitesFteHandler' from '_handler_asset_loader_sites' (.../ezquake/_handler_asset_loader_sites.py)`. Root cause: when pytest discovers both ezquake and fte test dirs in the same session, ezquake's handler dir lands in sys.path first; fte's `_handler_asset_loader_sites.py` import resolves to the wrong file.
- `qw/tests/test_bsp_parser.py` and `test_pak_extract.py` -- `ModuleNotFoundError: No module named 'tests.test_bsp_parser'`. Root cause: multiple `tests/` packages in the extractors tree (`extractor_lib/tests/`, `qw/tests/`, `mvdsv/tests/`) cause pytest to misinterpret the `qw/tests/` package as a sub-module of another `tests` namespace.

**Pre-existing determination:** Both errors occur due to sys.path contamination that predates Phase 3. `extractor_lib/tests/__init__.py` (the `tests` package that creates the namespace conflict) existed before Phase 3 (pre-flight confirmed 0 bytes). Adding `mvdsv/tests/__init__.py` adds a 3rd `tests` package but the root cause (multiple `tests/` package namespaces in one pytest session) was already present. All 15 affected tests collect and pass when run in isolation.

**Impact on Phase 3 deliverables:** None. All 3 Phase 3 parallel-serial tests PASS (verified with `--continue-on-collection-errors`). Phase 3 V7 condition "all parallel-serial tests PASS or SKIP" is met.

**Proposed fix (HANDOVER):** Add per-project `conftest.py` files that insert the project-specific handler dir at index 0 and explicitly exclude the ezquake handler dir. Alternatively, rename each project's test package (`ktx_tests`, `fte_tests`, `qw_tests`, `mvdsv_tests`) to avoid the shared `tests` namespace. Fix deferred -- out of Phase 3 scope; tracked in HANDOVER.

---

## Phase ownership of findings

| Finding | Phase | Status | Resolution |
|---|---|---|---|
| F1: Full-suite pytest sys.path pollution (FTE + QW) | Phase 3 (surfaced) | HANDOVER | Per-project conftest.py fix; deferred to separate work item |

When new findings land, append rows here mapping F-number -> phase that resolves it -> status (open / in-progress / resolved) -> short resolution description.

---

*End of review-findings. This file accrues during execution; it is not pre-populated at scaffold time.*
