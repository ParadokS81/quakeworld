You are drafting Phase 7 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. KTX onboarding has its own arc-close cert doc at `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md`; that doc is a STYLE EXEMPLAR for Phase 7 but it is NOT the cert doc you are drafting. Phase 7 of THIS arc produces a NEW cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`. If your reads start surfacing "Pattern 6 cross-header lift", "F25 mode_defaults", "F7/F8 anchors", "modes-handler refactor", "taxonomies handler", "27 catalog rows", or other KTX onboarding implementation specifics from KTX's review, you are in the WRONG arc -- the KTX cert doc is read for SHAPE, not content. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 7 SCOPE: Arc-close cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`. Graduation-readiness artifact written ONCE at arc close. Phase 7 is the final phase in the arc; it consolidates pass state across all 6 prior phases.

Per parking doc Pass 2.1 + Pass 2.3:

  - Per-gate pass state across the 5 projects (ezquake / fte / qwcl / mvdsv / ktx) for the 4 runtime gates (P1 idempotency / P2 reproducibility / P3 parallel-vs-serial / P4 migration-probes).
  - Doc/process gates (P5 authoring guide / P6 audit cadence + skill updates) summary.
  - Total findings ledger (F1 + any others surfaced during execution).
  - HANDOVER carry-forwards (Phase 3 F1 conftest.py + any others).
  - Graduation-readiness statement: discipline is now visible and runnable.

Phase 7 is paper-only cert-doc authoring. Inline execution per D15 (markdown content shipped inline in the phase MD; executor Writes the cert doc to the reviews/ dir).

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no doc writes, no extractor runs). The phase MD becomes input to a separate execution session later that Writes the cert doc + commits it.

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
   The phase index status column shows which phases shipped vs are still in progress. Cert doc records the AS-OF-Phase-7 state.
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D6 (per-gate ship + per-gate audit -- catch-up audit findings live inline in commit bodies), D8 (per-finding triage track), D13 (phase atomicity), D15 (mostly inline for this markdown phase), D16 (ASCII), D17 (git workflow main tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   F-entries with HANDOVER tracks become carry-forwards in the cert doc.
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 2.1 (per-gate ship discipline + arc-close cert doc shape) + Pass 2.3 (Phase 7 roadmap entry). The cert doc consolidates state once at arc close as a graduation-readiness artifact.
6. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-1-idempotency-probe.md
   Phase 1 MD. Read the "Verification (phase boundary)" section + the "Post-execution amendments" section + the commit body for `f64ef308` (`git show f64ef308 --stat | head -50` -- read the body for the 5-project catch-up audit dispositions).
7. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-2-reproducibility-probe.md
   Phase 2 MD. Same shape: verification probes + post-execution amendments + commit body for `2e7808eb`.
8. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-3-parallel-serial-tests.md
   Phase 3 MD. Same shape: verification probes + post-execution amendments (V6 strictness amendment + F1 HANDOVER pointer) + commit body for `8f561cba`.
9. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-4-migration-probes.md
   Phase 4 MD. Verification probes V1-V8 (no post-execution amendments needed; phase shipped clean) + commit body for `9901f308` (12-probe disposition).
10. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md (IF P5 has shipped)
    Phase 5 MD + commit body. If P5 not shipped at draft time, leave a placeholder for SHA + ship-state in the cert doc.
11. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md (IF P6 has shipped)
    Phase 6 MD + commit body. If P6 not shipped at draft time, leave a placeholder.
12. docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md
    The most recent arc-close cert doc. STYLE EXEMPLAR for Phase 7 -- read for shape (sections, summary table format, graduation-readiness language, carry-forward shape). Do NOT copy content.
13. apps/qw-oracle/docs/arc-history.md
    The qw-oracle arc-history ledger. Phase 7's cert doc gets a corresponding one-line entry here at arc close (executor adds it). Read for the entry shape.

PHASE-SPECIFIC RECON (run before drafting):

a. Run `git log --oneline | head -30` to capture the arc's commit graph: scaffold commit, per-phase MD approvals, per-phase ship commits, ship-housekeeping commits, prompt refactors. The cert doc summarizes the ship sequence.

b. For each shipped phase (P1 / P2 / P3 / P4 at minimum; P5 + P6 if shipped at draft time), capture from the commit body:
   - 5-project catch-up audit dispositions (D6) -- which projects PASS / FAIL / DEFERRED / N-A per gate.
   - Findings triage (D8) -- drain-now bugfixes, HANDOVER carry-forwards, explicit rejects.
   - Phase-boundary verification status (V1-VN PASS counts).

c. Build the per-gate cross-project pass-state matrix. Recommended shape:

     Gate | ezquake | fte | qwcl | mvdsv | ktx
     -----|---------|-----|------|-------|----
     idempotency       | PASS | PASS | PASS | PASS | PASS
     reproducibility   | PASS | PASS | PASS | PASS | PASS
     parallel-serial   | n/a  | n/a  | n/a  | NEW  | UPDATED
     migration-probes  | global -- 12/12 PASS

   Adapt cells per actual ship state. "n/a" = explicitly deferred per D8 with rationale; "NEW" = test added; "UPDATED" = test refactored to lifted helper.

d. Build the findings ledger. Walk `review-findings.md` F-entries; capture each as:
   - F-number + title
   - Severity / track (drain-now / HANDOVER / explicit reject)
   - Phase that surfaced it
   - Disposition / current status

e. Build the graduation-readiness statement. The arc shipped 5 universal probes + 1 process rule + 1 doc + 1 cert doc = 8 deliverables. The discipline is now (1) visible -- documented in VALIDATION-GATES.md / EXTRACTOR-PLAYBOOK / SKILL.md; (2) runnable -- 4 runtime gates dispatch via standard CLI; (3) self-bootstrapping -- onboarding skill teaches future arcs to inherit by default.

f. Identify carry-forwards from this arc to next arcs:
   - F1 (per-project conftest.py) -- HANDOVER, deferred
   - CI setup arc -- the next logical arc; consumes this arc's universal probes
   - Other carry-forwards per parking doc + commit bodies

DRAFT THE PHASE:

Output: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-7-cert-doc.md`

Follow `phase-template.md` exactly. Don't add sections; don't drop sections.

The cert doc itself ships AT EXECUTION at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`. The phase MD ships the FULL cert-doc content INLINE so the executor Writes it verbatim.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji. No em-dashes / en-dashes / smart quotes.
- Phase 7 ships the FULL cert doc content INLINE in the phase MD.
- Per-task execution mode declared in task table (D15). Almost all tasks `inline` (markdown content shipped inline; the executor's job is to Write the cert doc + commit + push).
- The cert doc's tone is graduation-readiness: matter-of-fact, evidence-grounded, references commits and phase MDs by SHA / path. NOT marketing prose.

STEP-BY-STEP:

Step 1: Read all 13 required reads + run the recon (a-f). Use `git show <sha>` and `git log --oneline | head -30` to gather commit-body details.

Step 2: Draft the phase MD following `phase-template.md`. Phase 7 SCOPE statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type: Explore, model: Sonnet medium, prompt from `phase-template.md`'s "Verification sub-agent dispatch" section with absolute paths substituted).

Step 4: Apply the sub-agent's findings. If a finding contradicts decisions.md, note rejection in "Open questions" with one-line rationale.

Step 5: Halt. Reply with phase MD path, sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY), open questions needing operator attention, and recommendation (ready for review / needs another pass).

Do NOT proceed to arc-reviewer pass (separate fresh-terminal invocation per `arc-reviewer` skill -- the operator initiates that after Phase 7 ships). Do NOT execute. Drafting is paper-only.
