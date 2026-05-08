You are drafting Phase 6 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch the same `~/.claude/skills/onboard-extractor/SKILL.md` and the same `EXTRACTOR-PLAYBOOK.md`. Phase 6 of THIS arc lands the cross-project audit cadence rule + skill update part 2 ("no per-project bash scripts" callout); it is NOT a re-do of any KTX onboarding documentation work. If your reads start surfacing "Pattern 6 cross-header lift", "F25 mode_defaults", "F7/F8 anchors", "modes-handler refactor", "taxonomies handler", or other KTX onboarding implementation specifics, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 6 SCOPE: Cross-project audit cadence rule lands as a process-rule deliverable across three locations, plus skill update part 2:

(1) `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` -- new section "Cross-project audit cadence" capturing the trigger set per parking doc Pass 1.2.5:

  Run cross-project audit (via the `validate-extractor` skill in cross-project mode) after every arc that:
  - adds a new project, OR
  - adds a new entity type, OR
  - ships a schema migration, OR
  - modifies `extractor_lib/` or `load-version.ts` (cross-cutting infrastructure)

  Skip for per-handler tweaks within a single project that don't touch shared infrastructure. Audit doc lands at `docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`.

(2) `HANDOVER.md` -- tracking entry for cross-project audit lifecycle. One-liner pointing at the cadence rule + the most recent audit reference. Goes in "Small followups" section (existing F1 conftest entry is the most recent precedent).

(3) `~/.claude/skills/onboard-extractor/SKILL.md` (USER-GLOBAL, NOT in repo) -- skill update PART 2 (Phase 5 lands part 1: register-in-config-dict step + validation step expansion). Phase 6 lands ONE concrete change per parking doc Pass 2.2:

  EXPLICIT "no per-project bash scripts" CALLOUT: the KTX-style `idempotency-ktx.sh` pattern is gone. Universal gates handle this; per-project bash extracts are an anti-pattern. The skill MUST state this explicitly so future onboarders don't recreate the pattern.

(4) Optional: cross-link to operator memory `feedback_retrofit_later_discipline.md` (the principle this arc encodes) -- decide during recon whether the cross-link belongs in EXTRACTOR-PLAYBOOK or in SKILL.md or both.

Phase 6 is paper-only doc authoring + skill markdown editing. No new code, no audit doc generation. Mostly inline execution per D15.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything (no doc writes, no SKILL.md edits, no audit runs). The phase MD becomes input to a separate execution session later.

REQUIRED READING (read all before drafting; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md
2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   Particularly: D10 (skill update split: P5 lands part 1; P6 lands part 2 -- THIS phase ships part 2), D11 (cross-project audit cadence is trigger-based; trigger set is locked), D15 (execution modes; mostly inline for this markdown phase), D16 (ASCII), D17 (git workflow main tree).
3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
4. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-template.md
5. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 1.2.5 (cross-project audit cadence -- the lock-shape spec for the trigger set) + Pass 2.2 (skill update part 2: "no per-project bash" callout) + Pass 2.3 (roadmap entry for Phase 6).
6. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   Read end-to-end. Identify the right insertion point for the new "Cross-project audit cadence" section. Look for existing structure: producer-facing checklists, validation guidance, etc.
7. HANDOVER.md
   Read the structure (sections: Open items / Small followups / Sidequests / Ongoing arcs / Future arcs / Recently opened). The Phase 3 F1 entry ("Per-project conftest.py for extractor pytest") is in Small followups -- the new audit-cadence tracker entry follows the same shape.
8. ~/.claude/skills/onboard-extractor/SKILL.md
   USER-GLOBAL skill. Read end-to-end. If Phase 5 has already shipped (check phase-5-authoring-guide.md exists), verify Phase 5's edits do not conflict with the location for Phase 6's "no per-project bash" callout. Identify the precise insertion point -- probably near the validation step (Phase 5's expanded section) or the scaffolding step (where per-project bash would historically have lived).
9. /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_retrofit_later_discipline.md
   Optional cross-link target. Read end-to-end; if its content matches the Pass 1.2.5 framing, the cross-link is appropriate.
10. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md (IF Phase 5 has been drafted by then; check `ls` for the file)
    If P5 exists: cross-check Phase 6's SKILL.md edits do not collide with P5's. The SKILL.md is a single user-global file; both phases edit it; coordination matters.

PHASE-SPECIFIC RECON (run before drafting):

a. Read parking doc Pass 1.2.5 trigger set verbatim. The four-trigger list is LOCKED; do NOT add or remove triggers.

b. Source-walk EXTRACTOR-PLAYBOOK.md to find the right place for the new "Cross-project audit cadence" section. Likely candidates: after any existing "validation" or "audit" content; near the end of the producer-facing flow; OR a top-level section if PLAYBOOK is short. Capture the existing TOC and propose the insertion point with rationale.

c. Source-walk HANDOVER.md "Small followups" section. Decide the audit-tracker entry shape: one-liner pointing at the cadence rule (location: PLAYBOOK new section) plus the most recent audit reference (the cross-project audit at `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` is the most recent precedent if one exists at draft time).

d. Source-walk SKILL.md. Identify the precise location where the "no per-project bash" callout lands. Two options: (i) embedded in the validation step Phase 5 expanded; (ii) standalone callout block near the scaffolding step. Decide based on stylistic flow with Phase 5's edits.

e. Verify the optional `feedback_retrofit_later_discipline.md` cross-link is appropriate. Read the memory; if its content matches the Pass 1.2.5 framing (extraction work is arc-based, not calendar-based; trigger set captures cross-project-affecting changes), include the cross-link in EXTRACTOR-PLAYBOOK.md or SKILL.md (or both). If the memory is more general than the cadence rule, leave the cross-link out.

f. Verify Phase 5's SKILL.md edits (if drafted) do not conflict with Phase 6's "no per-project bash" callout location. If they do, surface as an open question; default: "no per-project bash" goes in a separate callout block to avoid overloading the validation step.

DRAFT THE PHASE:

Output: `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md`

Follow `phase-template.md` exactly. Don't add sections; don't drop sections.

Concrete authoring rules (from decisions.md):
- ASCII only (D16). No emoji. No em-dashes / en-dashes / smart quotes.
- Phase 6 ships the FULL EXTRACTOR-PLAYBOOK.md new-section content INLINE in the phase MD.
- Phase 6 ships the FULL HANDOVER.md tracker entry INLINE.
- Phase 6 ships the FULL SKILL.md "no per-project bash" callout INLINE (concrete diff or before/after block).
- Per-task execution mode declared in task table (D15). Almost all tasks `inline` for this phase (markdown content shipped inline).
- HANDOVER.md edits use ASCII (`--`) per the operator-memory ASCII rule, even though existing entries may use em-dashes (those are pre-existing drift).

STEP-BY-STEP:

Step 1: Read all 10 required reads + run the recon (a-f).

Step 2: Draft the phase MD following `phase-template.md`. Phase 6 SCOPE statement above is your "Goal" paragraph seed.

Step 3: Dispatch the verification sub-agent (Tool: Agent, subagent_type: Explore, model: Sonnet medium, prompt from `phase-template.md`'s "Verification sub-agent dispatch" section with absolute paths substituted).

Step 4: Apply the sub-agent's findings. If a finding contradicts decisions.md, note rejection in "Open questions" with one-line rationale.

Step 5: Halt. Reply with phase MD path, sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY), open questions needing operator attention, and recommendation (ready for review / needs another pass).

Do NOT proceed to Phase 7. Do NOT execute. Drafting is paper-only.
