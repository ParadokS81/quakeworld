# Phase 1 drafter prompt -- Extractor discipline catch-up (Idempotency probe)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 1 of the extractor discipline catch-up arc.

PHASE 1 SCOPE: Universal idempotency probe. Lift
apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh (KTX-only bash) to
apps/qw-oracle/scripts/load-knowledge/idempotency.ts (universal TS,
--project <p> dispatch). Per-project config dict (5 entries: ezquake /
FTE / QWCL / MVDSV / KTX). Add `case 'idempotency':` to index.ts
(mirroring F1 quality-grid pattern). Delete the KTX-only bash version.
Run the new probe against all 5 projects; findings inline in commit body
per D6 + D8.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no probes, no migrations, no extractors,
no loaders). The phase MD becomes input to a separate execution session
later (kicked off by arc-orchestrator or operator).

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D2 (CI-readiness conventions), D3 (per-project config
   dict, NOT unified registry), D4 (F1 quality-grid mirror), D5 (manual
   probes), D6 (per-gate catch-up audit across 5 projects), D7 (real-bug-fix
   rides commit), D8 (per-finding triage), D12 (JSONB binding), D13
   (phase atomicity), D15 (execution modes; subagent for code-synthesis,
   Sonnet medium floor), D16 (ASCII discipline), D17 (git workflow,
   main tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   Empty initially; F-entries accrue during execution.
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
   The mandatory shape your output must follow.
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 1.2.1 (idempotency probe shape -- the lock-shape spec) + Pass
   2.3 (roadmap entry for Phase 1).
6. apps/qw-oracle/CLAUDE.md
   JSONB-binding rule + Bun runtime + idempotency invariants.
7. apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh
   The KTX-only bash version. Read end-to-end. Volatile-column-strip
   pattern (Issue #5 post-fix shape: to_jsonb(row) - 'key' chain) is
   the lift source.
8. apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
   The model gate. Mirror its CLI dispatch shape (per D4): --project /
   --all / --json / --help / env-var DB / no docker exec.
9. apps/qw-oracle/scripts/load-knowledge/index.ts
   The dispatcher. Add `case 'idempotency':` here per D4. Find a clean
   slot near the existing quality-grid case.
10. apps/qw-oracle/scripts/extractors/ (the 5 projects' loader files)
    Identify *_versions tables and per-project table sets for the
    per-project config dict shape.

PHASE-SPECIFIC RECON (run before drafting):

a. Read idempotency-ktx.sh end-to-end. Note the three-bucket grouping
   (entities / *_versions / gameplay_*); the volatile-column-strip list
   (updated_at, extracted_at, description_embedding,
   description_embedding_sha256, description_embedding_stale); the
   table list per bucket.

b. Enumerate *_versions tables per project. Run:
     docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle \
       -c "\dt *_versions"
   List each project's per-version tables for the per-project config
   dict.

c. Verify volatile-column-strip list against current schema. Migration
   012 added `description_origin` -- determine whether it's volatile
   (changes on re-extract) or stable (set once). If volatile, add to
   the strip list. Read migration 012 (apps/qw-oracle/db/migrations/
   012_description_origin.sql) and its consumer code (load-version.ts
   or similar).

d. Read quality-grid.ts CLI dispatch shape. Confirm conventions:
   --project <p> / --all / --json / --help / env-var DATABASE_URL /
   no docker exec / no host psql / path.resolve(import.meta.dir, ...)
   for any file references.

e. Read index.ts dispatcher case shape. Identify the line where
   `case 'idempotency':` slots in (likely near the F1 case). Note the
   import shape and the invocation shape.

f. Source-walk the 5 projects' loaders to enumerate the table sets each
   writes to. The `entities` table is shared across all 5 projects
   (filtered by `project = '<X>'`); `*_versions` tables vary per
   project; `gameplay_*` tables are KTX-only. Per-project config dict
   captures the per-project subset.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md

Follow phase-template.md exactly: section order, section names,
verification format, per-task execution-mode declaration. Don't add
sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji. Hyphen-minus only; no em-dash, no
  en-dash, no smart quotes.
- All TS scripts run under Bun. Use `bun` in command lines, not `tsx`
  or `node`.
- Git workflow: main tree, no worktrees, no PRs (D17). Commit message
  one-liner naming the phase + change.
- CI-readiness conventions (D2): exit 0=pass / non-zero=fail, --project
  / --all optional / --json / --help / env-var DB / no CWD assumptions
  / deterministic.
- Per-project config dict per gate, NOT unified registry (D3). Ship
  the dict shape inline with 5 entries.
- F1 quality-grid mirror dispatch (D4); add case in index.ts.
- Manual invocation only, not auto-run (D5).
- 5-project catch-up audit in verification (D6); per-finding triage
  per D8 (drain-now / HANDOVER followup / explicit reject); real-bug-
  fix rides phase commit per D7.
- JSONB binding (D12): pass JS values directly to postgres-js or wrap
  with tx.json(). NEVER pre-stringify with JSON.stringify(...) then
  bind as TEXT.
- Per-task execution mode declared in task table (D15). Default
  subagent (Sonnet medium) for code-synthesis tasks; inline only for
  fully-specified-edit markdown / config tasks.

STEP-BY-STEP:

Step 1: Read all 10 required reads + run the recon steps (a-f).

Step 2: Draft the phase MD following phase-template.md. Phase 1 SCOPE
        statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent. Tool: Agent, subagent_type:
        Explore, model: Sonnet medium. Prompt from phase-template.md's
        "Verification sub-agent dispatch" section with absolute paths
        substituted for this phase's MD, decisions.md, and
        review-findings.md.

Step 4: Apply the sub-agent's findings. If a finding contradicts
        decisions.md, note the rejection in the phase's "Open questions"
        section with a one-line rationale.

Step 5: Halt. Reply to the operator with:
        - Path to the drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Any open questions needing operator attention before
          execution can begin.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to Phase 2. Do NOT execute probes / migrations /
extractors / loaders. Do NOT modify the live codebase. Drafting is
paper-only.

=== END PROMPT ===
```

---

## After Phase 1 ships

Once Phase 1 ships (drafted + reviewed + executed + committed), the operator can fan out Phase 2 + Phase 3 + Phase 4 in parallel (each in its own fresh terminal with its own pre-substituted drafter prompt). Phase 5 + Phase 6 + Phase 7 wait for Phase 1-4 drafts to exist (so doc phases reference real conventions). The remaining drafter prompts get generated when Phase 1 is approved.
