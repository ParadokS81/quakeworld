You are drafting Phase 5 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch some of the same documentation files (`apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`, `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`, `~/.claude/skills/onboard-extractor/SKILL.md`). Phase 5 of THIS arc lands the producer-side authoring guide doc + skill update part 1; it is NOT a re-do of any KTX onboarding documentation work. If your reads start surfacing "Pattern 6 cross-header lift", "F25 mode_defaults", "F7/F8 anchors", "modes-handler refactor", "taxonomies handler", "27 catalog rows", or other KTX onboarding implementation specifics, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 5 SCOPE: Two deliverables.

(1) NEW DOC at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` -- producer-side authoring guide for new universal gates. The seven-section list is LOCKED per parking doc Pass 1.2.6:

  Section 1. CLI shape conventions (`bun run load-knowledge -- <gate> --project <p>`, `--help` exits 0, `--json` valid JSON, exit code scheme 0/1/2)
  Section 2. Reuse the F1 quality-grid pattern (`quality-grid.ts` is the model; new gates mirror its dispatch shape)
  Section 3. Env-var driven DB config (`DATABASE_URL`, postgres-js, no `docker exec` or host-psql; pre-flight unset-guard pattern)
  Section 4. Volatile-column strip pattern (the `to_jsonb(row) - 'key'` chain from `idempotency.ts`)
  Section 5. Per-project config dict shape (how to add a new project's table-set entry without forking a script; D3 spirit)
  Section 6. Test pattern conventions (pytest equivalence-tests for parallel-vs-serial; finalize-via-param requirement so dead `self._all_rows` attrs do not get inadvertently used cross-worker -- relates to F1 + Phase 3 Q1)
  Section 7. CI-readiness checklist (the conventions table from D2; consolidates must-haves and the `--json` recommendation)

  Plus a one-line cross-link from the top of `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` ("For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`.") -- per D9.

(2) SKILL UPDATE PART 1 at `~/.claude/skills/onboard-extractor/SKILL.md` (USER-GLOBAL, NOT in repo). Two concrete changes per parking doc Pass 2.2:
  - NEW STEP between scaffolding and validation: "register the new project in each universal gate's config dict." 5-minute edit per gate file (volatile columns for idempotency, source root for reproducibility, per-handler tests for parallel-vs-serial, n/a for migration-probes). Cross-references VALIDATION-GATES.md Section 5.
  - VALIDATION STEP EXPANSION: smoke-validation grows from "re-run extract, confirm zero diff" to "run ALL universal gates against the new project; all must pass before declaring onboarding done." 4-5 probes (idempotency / reproducibility / parallel-vs-serial pytest / migration-probes if relevant).

Phase 5 is paper-only doc authoring + skill markdown editing. No new code, no DB writes, no migrations.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no doc writes, no SKILL.md edits, no extractor runs). The phase MD becomes input to a separate execution session later.

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D2 (CI-readiness conventions table -- becomes Section 7), D3 (per-project config dict shape -- becomes Section 5), D4 (F1 quality-grid mirror -- becomes Section 2), D9 (sibling doc, NOT extension of RUNBOOK), D10 (skill update split: P5 lands part 1; P6 lands part 2), D15 (execution modes; P5 is markdown-heavy so mostly inline), D16 (ASCII), D17 (git workflow main tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   F1 entry from Phase 3 (HANDOVER track) -- VALIDATION-GATES.md Section 6 should reference the finalize-via-param requirement that prevents future authors from breaking the parallel-safe pattern.
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 1.2.6 (authoring guide doc location + sections list) + Pass 2.2 (skill update sketch -- P5 lands new step + validation step expansion; P6 lands "no per-project bash" callout) + Pass 2.3 (roadmap entry for Phase 5).
6. apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
   The model universal gate. Section 2 of VALIDATION-GATES.md describes how new gates mirror its shape.
7. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   Phase 1 universal probe. Section 4 (volatile-column strip) describes its `to_jsonb(row) - 'key'` chain pattern.
8. apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts
   Phase 2 universal probe. Sections 1 + 3 reference its CLI shape + env-var DATABASE_URL handling.
9. apps/qw-oracle/scripts/load-knowledge/migration-probes.ts AND apps/qw-oracle/db/migration-probes.ts
   Phase 4 runner + registry. Section 1's exit-code conventions reference `--migration NNN` flag handling; Section 5 references the explicit-registry pattern (D3 spirit even though migrations are global).
10. apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py
    Phase 3 lifted helper. Section 6 (test pattern conventions) describes the pytest dispatch shape + finalize-via-param requirement.
11. apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
    Sibling doc. Top-of-file area is the cross-link insertion point (D9: one-liner pointing at VALIDATION-GATES.md).
12. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
    Producer-facing playbook. Read for stylistic alignment (table-of-contents shape, header levels, prose tone).
13. ~/.claude/skills/onboard-extractor/SKILL.md
    USER-GLOBAL skill. Read end-to-end. Identify (a) the right insertion point for the new register-in-config-dict step (between scaffolding and validation -- the skill's existing F4-or-P4 area), (b) the validation step's current text + the expansion target.

PHASE-SPECIFIC RECON (run before drafting):

a. Read parking doc Pass 1.2.6 + Pass 2.2 end-to-end. The seven-section list of VALIDATION-GATES.md is LOCKED; do NOT add or remove sections.

b. Run each shipped gate's `--help` (read source code for the help text; do NOT execute):
     bun run load-knowledge -- idempotency --help
     bun run load-knowledge -- reproducibility-check --help
     bun run load-knowledge -- migration-probes --help
     bun run load-knowledge -- quality-grid --help
   Capture the common shape (flag names, exit codes, env-var requirements). Section 1 of VALIDATION-GATES.md captures these conventions verbatim.

c. Identify the volatile-column strip pattern's exact code shape in `idempotency.ts`. The `to_jsonb(row) - 'key'` chain is the canonical example; Section 4 describes when and how to use it for new gates.

d. Identify the per-project config dict shape in each shipped gate. The shape varies (idempotency = volatile columns + `*_versions` tables; reproducibility = source roots + optional `--workers`; parallel-serial = per-handler test entrypoints; migration-probes = n/a -- migrations are global). Section 5 documents the per-gate variation pattern.

e. Source-walk SKILL.md to identify (1) the current "after scaffolding" cut point (where the new register-in-config-dict step inserts), (2) the current "smoke validation" section (where the 4-5-probes expansion replaces the 1-probe re-extract test). Capture the exact line ranges or section headers.

f. Verify VALIDATION-RUNBOOK.md does NOT already have gate-authoring content (per D9 it shouldn't -- RUNBOOK is consumer-perspective). The cross-link target at the top of RUNBOOK is a one-liner: "For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`."

DRAFT THE PHASE:

Output: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md`

Follow `phase-template.md` exactly. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji. No em-dashes / en-dashes / smart quotes.
- Phase 5 ships the FULL VALIDATION-GATES.md content INLINE in the phase MD, not a sketch. Per operator memory `feedback_no_subagents_for_mechanical_edits.md`: when the phase MD ships full content inline, executor edits inline (no subagent dispatch).
- Phase 5 ships the FULL SKILL.md edits INLINE: the new step content + the expanded validation step content, both as concrete diffs or before/after blocks targeting specific section headers.
- The cross-link addition to VALIDATION-RUNBOOK.md is a one-line edit; ship inline.
- Per-task execution mode declared in task table (D15). Most tasks should be `inline` for this phase (markdown content shipped inline). Tasks requiring multi-file synthesis (e.g., aggregating CLI conventions from 4 gate files into Section 1) MAY use `subagent (Sonnet medium)` -- but if you're shipping the full Section 1 content inline anyway, declare inline.

STEP-BY-STEP:

Step 1: Read all 13 required reads + run the recon (a-f).

Step 2: Draft the phase MD following `phase-template.md`. Phase 5 SCOPE statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type: Explore, model: Sonnet medium, prompt from `phase-template.md`'s "Verification sub-agent dispatch" section with absolute paths substituted for this phase's MD, decisions.md, and review-findings.md).

Step 4: Apply the sub-agent's findings. If a finding contradicts decisions.md, note rejection in "Open questions" with one-line rationale.

Step 5: Halt. Reply with phase MD path, sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY), open questions needing operator attention, and recommendation (ready for review / needs another pass).

Do NOT proceed to Phase 6 or Phase 7. Do NOT execute. Drafting is paper-only.
