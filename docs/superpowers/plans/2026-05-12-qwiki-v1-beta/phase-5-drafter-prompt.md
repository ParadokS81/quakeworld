You are drafting Phase 5 of the qwiki-v1-beta arc (2026-05-12).

This is the FIRST Modes mini-arc phase. The previous four phases (1-4) shipped the horizontal substrate; phases 5-8 ship the vertical Modes slice.

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".

If you see those, halt.

## Phase 5 scope

Mode page-type infrastructure. Three deliverables:

1. **Mode form** at `Form:Mode` (Page Forms `#forminput` + `{{{field|...}}}` structure). Implements the gate-level locked at Pass 5 5.2 for Modes (form+slots: bones strict, slots allow narrative inside named sections).
2. **Mode template** at `Template:Mode` (transcludable; structured display per D8 bones+slots + D10 baseline-plus-deviations pattern). Adds `[[Category:Needs review]]` to all saves (per D18 quality-tag auto-categorization).
3. **Modes Layer B category page** at `Category:Modes` (lists all mode pages; sub-categories per mode family if natural; cribs from visual companion HTML v3 Layer B Modes example).

Bones (strict-form): mode name / mode category / canonical-source (KTX commit ref or wiki authored) / engine-port-applicability (ezQuake / FTE / QWCL / MVDSV) / status (active / deprecated / experimental).

Slots (form+slots, narrative inside named sections): Gameplay rules / Starting-config deviations from baseline / Strategy / Variants / History / External links (KTX source ref + hub.quake.world match-link slot per D10).

Track C help-text scaffolding (per D11): the form includes inline help-text reminders for each section about the four Track C disciplines (section-as-atom / self-contained / L1-L3 cross-refs / citations).

Runnable state at phase boundary: `Form:Mode` renders correctly in browser; submitting it via a test mode page (e.g., "TestMode") creates a page with bones+slots structure visible; `Template:Mode` transcludes correctly when the test mode page is viewed; `[[Category:Needs review]]` is auto-added; `Category:Modes` lists the test mode page; the visual companion HTML v3 Hoonymode Layer C mockup matches the rendered structure shape.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D7 (6-tile nav, Modes is one) + D8 (12 page-types, Mode is one) + D9 (gate-level taxonomy; Modes is form+slots) + D10 (baseline-plus-deviations) + D11 (Track C disciplines baked into form help-text) + D14 (Modes is the vertical-slice proof) + D18 (Needs review auto-tag) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` through `phase-4-discipline-harvest.md` -- substrate outputs
6. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 4 4.3 (Mode page-type bones+slots specification) + Pass 5 5.2 (gate-level)
7. **`docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html`** -- v3 2026-05-12. THIS IS THE LOAD-BEARING DESIGN SUBSTRATE FOR THIS PHASE. Read the Layer B Modes example + Layer C Hoonymode mockup. The bones+slots tagging in the mockup is the structural reference.

## Phase-specific recon (before drafting)

a. Open the visual companion HTML in a browser preview (or read its raw HTML source) and trace the Hoonymode Layer C structure section by section. Note:
   - Bones header (mode name + category + canonical-source + ports + status)
   - "Gameplay rules" slot
   - "Starting-config deviations" slot (the explicit baseline-plus-deviations pattern)
   - "Strategy" slot
   - "Variants" slot
   - "History" slot
   - "External links" slot (with KTX source ref + hub-link slot)

b. Use Context7 to pull current Page Forms `#forminput` + `Form:` namespace conventions for MW 1.43 (per `decisions.md` D2 Amendment #2, the substrate is MW 1.43 LTS; Page Forms is on its REL1_43 branch). Note: the difference between `Form:` (the form-editor surface) and `Template:` (the display surface); how `{{{field|...}}}` placeholders work; how to add help-text inline.

c. Read Pass 4 4.3's Mode page-type spec in the vision doc carefully. Note any specific bones/slots names that differ from the visual companion. The spec wins where they differ.

d. Identify the existing baseline page-types in Game Content (`mechanic` / `weapon-baseline` / `item`) -- these are red-link targets in the Modes "Deviations from baseline" sections per D10 + D16. Phase 5 does NOT create them; mode pages can have red-links to them until a future arc.

e. Identify if SMW properties should be defined for Mode bones (e.g., `Has mode category`, `Has engine ports`). v1 baseline: yes, if the form populates them, SMW can later support semantic queries. Phase 5 defines a minimal set; can iterate.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-5-mode-page-type.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for the Mode form + template authoring (Page Forms syntax has gotchas; subagent verifies against PF docs). `subagent (Sonnet medium)` for the Modes category page. `inline` for Track C help-text (text strings shipped inline).
- Verification probes return YES/NO.

## Step-by-step

1. Read all required files (especially the visual companion HTML).
2. Run phase-specific recon (a-e above).
3. Draft the phase MD following `phase-template.md`.
4. Dispatch the verification sub-agent.
5. Apply findings.
6. Halt with structured summary.

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 5 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-5-mode-page-type.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

Add to the sub-agent brief: verify the Mode form bones+slots match Pass 4 4.3's spec AND the visual companion HTML v3 Hoonymode Layer C mockup. Flag any drift.

## Halt protocol

```
PHASE 5 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-5-mode-page-type.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 6.
