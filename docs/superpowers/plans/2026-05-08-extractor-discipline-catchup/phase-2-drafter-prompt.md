# Phase 2 drafter prompt -- Extractor discipline catch-up (Reproducibility probe)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 2 of the extractor discipline catch-up arc.

PHASE 2 SCOPE: Universal reproducibility probe. Package VALIDATION-RUNBOOK
Section 1.1 methodology as runnable: re-run extract.py per project, then
assert empty `git diff --stat HEAD` on each project's output directory.
New file at apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts;
per-project config dict with source roots (5 entries); optional --workers
<N> flag for parallelism testing; case 'reproducibility-check': in index.ts
mirroring P1's just-shipped pattern. 5-project catch-up audit baked in.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no probes, no extractors, no loaders). The
phase MD becomes input to a separate execution session later.

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D2 (CI-readiness conventions), D3 (per-project config
   dict, NOT unified registry), D4 (F1 quality-grid mirror), D5 (manual
   probes), D6 (per-gate catch-up audit across 5 projects), D7 (real-bug-
   fix rides commit), D8 (per-finding triage), D13 (phase atomicity), D15
   (execution modes), D17 (git workflow main tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 1.2.4 (reproducibility probe shape -- the lock-shape spec) +
   Pass 2.3 (roadmap entry for Phase 2).
6. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   Section 1.1 -- the methodology this probe packages as runnable.
7. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   The just-shipped Phase 1 universal probe. MIRROR ITS SHAPE: parseArgs
   from 'util'; PROJECT_<GATE>_CONFIG dict; runReproducibility /
   runReproducibilityCli / formatJson / formatText / printHelp split;
   --project / --all / --json / --help flags; exit 0 PASS / 1 FAIL /
   2 invalid args; --help exits 0 (informational).
8. apps/qw-oracle/scripts/load-knowledge/index.ts
   The dispatcher. Add `case 'reproducibility-check':` near the just-
   shipped 'idempotency' case per D4. Mirror the lazy-import wrapper
   pattern.
9. apps/qw-oracle/scripts/extractors/
   Per-project extractor structure. Each project has its own subdirectory
   (ezquake / fte / qwcl / mvdsv / ktx) and an extract.py invocation path.
   Identify how each project's extract.py is invoked (subcommand under
   extract-tag.ts, or standalone via python3 invocation).

PHASE-SPECIFIC RECON (run before drafting):

a. Read VALIDATION-RUNBOOK.md Section 1.1 end-to-end. Note the per-project
   source root paths, the extract.py invocation pattern, the git-diff
   assertion shape (likely `git diff --stat HEAD` on the project's output
   directory under apps/qw-oracle/scripts/extractors/<project>/output/).

b. Identify per-project source roots. From idempotency.ts Task 4 step 2,
   the slugs map: ezquake -> ezquake-source, fte -> fteqw, qwcl ->
   qwcl-original, mvdsv -> mvdsv, ktx -> ktx. Verify:
     ls research/repos/ezquake-source research/repos/fteqw \
        research/repos/qwcl-original research/repos/mvdsv research/repos/ktx

c. Identify per-project extract.py invocation:
     find apps/qw-oracle/scripts/extractors/ -maxdepth 2 -name 'extract.py' -o -name 'extract-tag.ts'
   Note whether each project has its own extract.py or whether they share
   apps/qw-oracle/scripts/extractors/_lib/extract.py via subcommand
   dispatch.

d. Read apps/qw-oracle/scripts/load-knowledge/idempotency.ts (Phase 1)
   end-to-end. Mirror its CLI shape, config dict shape, snapshot/diff
   pattern (adapted to source-tree git-diff instead of DB row-diff).

e. Decide --workers <N> default. Pass 1.2.4 says "optional --workers <N>
   flag... surfaces latent parallelism-naive aggregations alongside
   parallel-vs-serial pytest tests." Default behavior: omit flag -> run
   with project's default worker count; with flag -> override.

f. The output-directory diff assertion: each project writes JSON output
   to apps/qw-oracle/scripts/extractors/<project>/output/. The probe runs
   extract.py, then diffs that directory against HEAD. Empty diff = exit
   0 = reproducible; non-empty = exit 1 = drift detected.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md

Follow phase-template.md exactly: section order, section names,
verification format, per-task execution-mode declaration. Don't add
sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji.
- All TS scripts run under Bun. Use `bun` in command lines.
- Git workflow: main tree, no worktrees, no PRs (D17).
- CI-readiness conventions (D2): exit codes, --project, --all optional,
  --json, --help exits 0, env-var DB, no CWD assumptions, deterministic.
- Per-project config dict per gate, NOT unified registry (D3). Ship the
  dict shape inline with 5 entries.
- F1 quality-grid mirror dispatch (D4); add case in index.ts.
- Manual invocation only, not auto-run (D5).
- 5-project catch-up audit in verification (D6); per-finding triage per
  D8; real-bug-fix rides phase commit per D7.
- Per-task execution mode declared in task table (D15). The phase MD
  should ship full TS body + per-file diffs inline so all tasks can
  declare `inline` per feedback_no_subagents_for_mechanical_edits.md.

STEP-BY-STEP:

Step 1: Read all 9 required reads + run the recon (a-f).

Step 2: Draft the phase MD following phase-template.md. Phase 2 SCOPE
        statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type:
        Explore, model: Sonnet medium, prompt from phase-template.md
        "Verification sub-agent dispatch" with absolute paths substituted
        for this phase's MD, decisions.md, and review-findings.md).

Step 4: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note rejection in "Open questions" with one-line
        rationale.

Step 5: Halt. Reply with:
        - Path to drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Open questions needing operator attention.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to Phase 3. Do NOT execute. Drafting is paper-only.

=== END PROMPT ===
```
