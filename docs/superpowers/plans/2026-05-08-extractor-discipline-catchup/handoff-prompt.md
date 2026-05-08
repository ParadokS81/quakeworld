[GENERIC TEMPLATE -- per-phase pre-substituted versions live at `phase-N-drafter-prompt.md` and `phase-N-executor-prompt.md`. Operator uses those directly via `@<path>`. This file is reference for arc-orchestrator (or arc-planner during scaffold-build) when generating new per-phase prompts.]

You are drafting Phase <PHASE_NUMBER> of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs have similarly-named phase files in adjacent directories. If your reads start surfacing KTX onboarding content (Pattern 6, migrations 008/009/010, modes handler, Pass 1 entity handlers, F-numbers from KTX review-findings.md), you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE <PHASE_NUMBER> SCOPE: see Pass 1.2.<X> in the brainstorm parking doc for the lock-shape spec; Pass 2.3 for roadmap context. Per-phase pre-substituted prompts at `phase-N-drafter-prompt.md` fill this in.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no probes, no migrations, no extractors, no loaders). The phase MD becomes input to a separate execution session later (kicked off by arc-orchestrator).

REQUIRED READING (read all before drafting; do not skip):

1. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md`
   - Phase index, "read in this order" guidance.

2. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md`
   - 17 locked cross-cutting decisions. Every phase respects these.

3. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md`
   - Empty initially; F-entries accrue during execution. If any have accrued, identify which findings touch Phase <PHASE_NUMBER> via the "Phase ownership of findings" table.

4. `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md`
   - The mandatory shape for the phase MD you produce.

5. `docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md`
   - The closed two-pass brainstorm parking doc. The relevant section for Phase <PHASE_NUMBER> is (pick one or more):
       Phase 1 -> Pass 1.2.1 (idempotency probe shape) + Pass 2.3 (roadmap entry); KTX bash idempotency-ktx.sh as lift source
       Phase 2 -> Pass 1.2.4 (reproducibility probe shape) + Pass 2.3; VALIDATION-RUNBOOK Section 1.1 as methodology source
       Phase 3 -> Pass 1.2.3 (parallel-vs-serial pattern) + Pass 2.3; apps/qw-oracle/scripts/extractors/ktx/tests/ as lift source
       Phase 4 -> Pass 1.2.2 (per-migration probes) + Pass 2.3; VALIDATION-RUNBOOK inline migration SQL as lift source
       Phase 5 -> Pass 1.2.6 (VALIDATION-GATES.md sections 1-7) + Pass 2.2 (skill update part 1) + Pass 2.3
       Phase 6 -> Pass 1.2.5 (audit cadence rule) + Pass 2.2 (skill update part 2) + Pass 2.3
       Phase 7 -> Pass 2.1 (per-gate ship + cert doc shape); existing cross-project audit at `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` as the closest precedent for cert-doc shape

6. `apps/qw-oracle/CLAUDE.md`
   - Project context. JSONB-binding rule + Bun runtime + idempotency.

7. `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`
   - Producer-side handler / extractor playbook. Phase 6 amends it with audit cadence section.

8. `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`
   - Consumer-side validation runbook. Phase 5 cross-links to VALIDATION-GATES.md from this doc's top.

9. `apps/qw-oracle/scripts/load-knowledge/quality-grid.ts`
   - The model gate. Every TS gate this arc ships mirrors its dispatch shape (per D4).

10. `apps/qw-oracle/scripts/load-knowledge/index.ts`
    - The dispatcher. Every TS-probe phase adds a `case` here per D4.

11. `apps/qw-oracle/scripts/extractors/ktx/idempotency-ktx.sh`
    - The KTX-only bash probe (deleted in Phase 1; reference for the volatile-column-strip pattern).

12. `apps/qw-oracle/scripts/extractors/extractor_lib/`
    - The shared Python extractor infrastructure. Phase 3's pytest helpers land in `extractor_lib/tests/parallel_serial_helpers.py`.

13. `~/.claude/skills/onboard-extractor/SKILL.md`
    - The user-global skill. Phase 5 + Phase 6 amend it inline (per D10).

14. `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_retrofit_later_discipline.md`
    - Operator memory: the principle this arc encodes. Phase 6's audit cadence rule cross-links to this.

DRAFT THE PHASE:

Output: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-<N>-<slug>.md`

Where `<N>-<slug>` matches the phase index in README.md. Slugs:
- `phase-1-idempotency-probe.md`
- `phase-2-reproducibility-probe.md`
- `phase-3-parallel-serial-tests.md`
- `phase-4-migration-probes.md`
- `phase-5-authoring-guide.md`
- `phase-6-audit-cadence.md`
- `phase-7-cert-doc.md`

Follow `phase-template.md` exactly: section order, section names, verification format, per-task execution-mode declaration. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji.
- All TS scripts run under Bun. Use `bun` in command lines, not `tsx` or `node`.
- Git workflow: main tree, no worktrees, no PRs (D17).
- CI-readiness conventions apply to all runtime probes (D2).
- Per-project config dict per gate, NOT unified registry (D3).
- Universal gate dispatch mirrors F1 quality-grid pattern (D4).
- Manual probes, not auto-invoked (D5).
- Each gate ships its own catch-up audit (D6); per-finding triage per D8.
- Real-bug-fix rides same phase commit (D7).
- Authoring guide doc is sibling to VALIDATION-RUNBOOK (D9).
- onboard-extractor SKILL.md update is part of arc, split P5/P6 (D10).
- Cross-project audit cadence is trigger-based (D11).
- JSONB binding (D12): pass JS values directly to postgres-js or wrap with tx.json(); NEVER pre-stringify.
- Per-task execution mode declared in task table (D15). Inline only for markdown-only / fully-specified-edit tasks; subagent for code-synthesis.
- Phase MDs have no hard length cap (per `phase-template.md` "Phase MD length"); split only if two natural sub-deliverables.

STEP-BY-STEP:

Step 1: Read all 14 required reads. Take notes on which decisions touch Phase <PHASE_NUMBER>.

Step 2: Run necessary recon on the live codebase (per phase MD's PHASE-SPECIFIC RECON section -- pre-substituted versions detail this per phase).

Step 3: Draft the phase MD following `phase-template.md`.

Step 4: Dispatch the verification sub-agent (instructions in `phase-template.md` "Verification sub-agent dispatch").

Step 5: Apply the sub-agent's findings. If a finding contradicts decisions.md, note the rejection in the phase's "Open questions" section with a one-line rationale.

Step 6: Halt. Reply to the operator with:
        - Path to the drafted phase MD.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Any open questions that need operator attention before execution can begin.
        - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to phase N+1. Do NOT execute migrations / extractors / loaders. Do NOT modify the live codebase. Drafting is paper-only.
