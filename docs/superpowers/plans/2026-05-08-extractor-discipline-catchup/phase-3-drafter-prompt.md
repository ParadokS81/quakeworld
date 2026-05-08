You are drafting Phase 3 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs have similarly-named phase files in adjacent directories. If your reads start surfacing "modes handler", "Pass 1 entity handlers", "F5/F6/F15 anchors", "27 catalog rows", "_um_init", or any other KTX onboarding finding numbers / row counts, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 3 SCOPE: Lift KTX-only pytest helpers from `apps/qw-oracle/scripts/extractors/ktx/tests/` to a universal location at `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py` so every project can `from extractor_lib.tests import assert_parallel_serial_equivalent`. Per-handler tests for parallel-aggregation-risky handlers across all 5 projects (handlers walking MACRO_DEFINITION, doing per-TU enum walks, aggregating stats from worker emissions). Pytest-based; CI-ready by being pytest. NOT blanket coverage -- only handlers identified as parallel-aggregation-risky during the catch-up audit.

This phase is DIFFERENT from P1 / P2 / P4 in dispatch shape: pytest is the universal dispatcher (per D4 carve-out), not a TS subcommand under `bun run load-knowledge --`. No new case in index.ts.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no tests, no extractors). The phase MD becomes input to a separate execution session later.

REQUIRED READING (read all before drafting; do not skip):

1. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md`
2. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md`
   Particularly: D3 (per-project config -- in this case the per-handler test entrypoints lists), D4 (F1 carve-out -- pytest is its own dispatcher), D6 (per-gate catch-up audit across 5 projects), D7 (real-bug-fix rides commit), D8 (per-finding triage), D13 (phase atomicity), D15 (execution modes), D17 (git workflow main tree).
3. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
4. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md`
5. `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`
   Pass 1.2.3 (parallel-vs-serial test pattern -- the lock-shape spec) + Pass 2.3 (roadmap entry for Phase 3).
6. `apps/qw-oracle/scripts/extractors/ktx/tests/`
   Three KTX-only pytest files (test_handler_modes.py / test_handler_gameplay_taxonomies.py / test_handler_gameplay_tables.py). The reusable helpers in these files (likely `assert_parallel_serial_equivalent` or similar) are the lift source.
7. `apps/qw-oracle/scripts/extractors/extractor_lib/__init__.py`
   The shared infrastructure import root. New tests/ subdirectory lands here as a sibling to existing modules.
8. `apps/qw-oracle/scripts/extractors/_lib/` + each project's handler dir
   Source-walk handlers across all 5 projects to identify parallel-aggregation-risky handlers (walkers for MACRO_DEFINITION, per-TU enum walks, stats aggregators).

PHASE-SPECIFIC RECON (run before drafting):

a. Read all 3 KTX test files end-to-end. Identify the reusable helper functions (likely something like `assert_parallel_serial_equivalent` that takes handler class + project + worker counts and asserts parallel output == serial output).

b. Identify candidate handlers for catch-up coverage. For each project (ezquake / fte / qwcl / mvdsv / ktx), grep handlers that:
   - Walk MACRO_DEFINITION cursors: `grep -rn 'MACRO_DEFINITION' apps/qw-oracle/scripts/extractors/`
   - Do per-TU enum walks (ENUM_DECL): `grep -rn 'ENUM_DECL' apps/qw-oracle/scripts/extractors/`
   - Aggregate stats from worker emissions: `grep -rn 'workers' apps/qw-oracle/scripts/extractors/`
   List candidates per project. NOT blanket coverage; only handlers that aggregate state across worker boundaries.

c. Identify the per-handler test file naming convention. KTX uses `apps/qw-oracle/scripts/extractors/ktx/tests/test_handler_<name>.py`; Phase 3 follows the same pattern at `<project>/tests/test_handler_<name>_parallel_serial.py` for clarity.

d. Verify pytest infrastructure works:
     `python3 -m pytest --version`
     `python3 -m pytest apps/qw-oracle/scripts/extractors/ktx/tests/ --collect-only`
   The collect-only run confirms KTX tests are discoverable; Phase 3's lift extends discoverability to the new helper location.

e. Decide the helper module boundary. Pass 1.2.3 says lift to `extractor_lib/tests/parallel_serial_helpers.py`. The new module path is `apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py`. Confirm the module's import shape works: `from extractor_lib.tests import assert_parallel_serial_equivalent`.

f. KTX's existing tests should be ported (NOT just deleted) to use the lifted helper. The KTX-only versions can either:
   - Stay as-is and import from extractor_lib (cleanest; fewest changes to KTX execution).
   - Get rewritten to import from extractor_lib (cleaner long-term).
   Default: keep KTX tests in place; rewrite imports to point at extractor_lib. Document the choice in the phase MD.

DRAFT THE PHASE:

Output: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md`

Follow `phase-template.md` exactly. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji.
- pytest is the universal dispatcher for this gate (D4 carve-out). Verification command is `pytest apps/qw-oracle/scripts/extractors/`.
- Per-handler test entrypoints listed in `extractor_lib/tests/parallel_serial_helpers.py` per-project config dict (D3 spirit, even though pytest discovers via filename convention).
- 5-project catch-up audit (D6): identify candidate handlers across all 5 projects during recon; phase ships tests for those handlers; commit body captures findings (which handlers covered, which deferred, rationale per D8).
- Per-task execution mode declared in task table (D15). Helper module authoring is `subagent (Sonnet medium) -- code synthesis across 1 Python file, clear spec from KTX lift source`. Per-handler test files are mostly mechanical -- if the plan ships full content inline, declare `inline`; if the plan synthesizes per-handler test content per recon, declare `subagent (Sonnet medium)` and batch ~3-5 test files per subagent dispatch to keep executor context clean.

STEP-BY-STEP:

Step 1: Read all 8 required reads + run the recon (a-f).

Step 2: Draft the phase MD following `phase-template.md`. Phase 3 SCOPE statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type: Explore, model: Sonnet medium, prompt from `phase-template.md`'s "Verification sub-agent dispatch" section with absolute paths substituted for this phase's MD, decisions.md, and review-findings.md).

Step 4: Apply the sub-agent's findings. If a finding contradicts decisions.md, note rejection in "Open questions" with one-line rationale.

Step 5: Halt. Reply with phase MD path, sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY), open questions needing operator attention, and recommendation (ready for review / needs another pass).

Do NOT proceed to Phase 4. Do NOT execute. Drafting is paper-only.
