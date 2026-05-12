You are drafting Phase 7 of the qwiki-v1-beta arc (2026-05-12).

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".

If you see those, halt.

## Phase 7 scope

Complete 27-mode triage + author Pass 1 (substantial v1 mode pages). Two deliverables:

1. **Complete 27-mode triage cycle** using the curator tool from Phase 6. Operator drives the tool through the remaining 22-24 modes (those not done in Phase 6 smoke triage). Per-mode disposition recorded: extract (from old wiki page) / new-build (no usable old content) / merge (combine multiple old pages) / abandon (don't migrate; for any mode that turns out non-substantial or out-of-scope).

2. **Author Pass 1** of substantial v1 mode pages per disposition. KTX flagship modes get full treatment (Hoonymode / Wipeout / Clan Arena / Race / 1v1 / 2v2 / 4v4 / and any other operator-flagged flagship). Non-flagship dispositioned-as-extract modes get the extract path (curator-friendly extract from old wiki + Track C discipline pass + form authoring). Non-flagship dispositioned-as-new-build modes get skeleton pages with bones populated + slots empty + `Category:Draft` tagged. Abandoned modes get no page.

Track C disciplines (D11) apply to all authored content: section-as-atom / self-contained / L1-L3 cross-refs / citations.

Runnable state at phase boundary: all 27 modes have dispositions recorded in the curator state file; N flagship modes have substantial content (specific count + which modes is determined in the phase MD); non-flagship extract modes have authored content per their extract source; non-flagship new-build modes have skeleton pages; abandoned modes have no page (recorded in state file with rationale).

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D6 (URL slug discipline applies to extract path) + D8 (Mode page-type) + D9 (form+slots gate) + D10 (baseline-plus-deviations; Modes reference Game Content baselines, red-links acceptable per D16) + D11 (Track C disciplines) + D14 (Modes is the vertical-slice proof) + D17 (curator scope; harvest comes in Phase 8) + D18 (quality tags: Needs review auto, Draft explicit for skeleton modes) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-5-mode-page-type.md` -- Mode form + template specifics; authoring flows through them
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-6-modes-curator.md` -- curator tool + state file location; Phase 7 consumes the tool
7. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 4 4.3 (Mode bones+slots) + Pass 6 6.2 (Modes priority + 27-mode inventory framing)

## Phase-specific recon (before drafting)

a. Read the Phase 6 curator tool state file format. Confirm how dispositions are recorded; the per-mode "target shape" alignment with Phase 5's Mode form.

b. Identify the 27-mode KTX canonical list. If not readily available from Phase 6's MD, the source is KTX itself (`apps/quad/research/ktx/` or external KTX source clone; check operator's `project_qw_oracle_*` memory for KTX source paths). Phase 7's MD must reference the canonical list explicitly (either inline or via citation).

c. Identify which modes are KTX flagship vs non-flagship. Operator memory + Pass 2 carry-forward names some (Hoonymode is THE flagship example from Pass 2). Phase 7 MD lists the flagship subset explicitly (with operator-sign-off as an open question if the list isn't pre-locked).

d. For the extract path: identify the old-wiki dump's mode-page content. Query `qwiki-analysis` mariadb container for each kept mode (per Phase 6 dispositions) and extract the wikitext. Track C discipline pass cleans up the extracted content before authoring into the new wiki.

e. For new-build skeletons: each non-flagship new-build mode gets a page with bones populated (mode name, category, ports, status) + slots empty + `Category:Draft` tag. Skeletons are not finished content; they're placeholders for future contributor pickup.

f. Decide the flagship-substantial threshold. "Substantial" needs an operator-confirmable definition. Candidates: word count (>500 words?); section completion (all slots non-empty?); Track C compliance score (all 4 disciplines visible?). Default: "all bones populated + all slots non-empty + Track C compliance reviewed manually." Surface in Open Questions if operator should pre-decide.

g. Note: Phase 7 spans potentially multiple sessions for the operator (triage takes time; authoring takes more time). The phase MD's verification probes must support resumption (curator state file + per-page commit log). Phase atomicity (D23) means the phase ENDS when all 27 dispositions + flagship-substantial threshold are met; not at any earlier checkpoint.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-7-triage-author.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for any extract-from-old-wiki script work (analyze step within the per-mode extract task). `inline` for content authoring guidance (operator authors via wiki UI; planning side is light). `subagent (Sonnet medium)` for verification probes (counting dispositions, checking flagship-substantial status).
- Verification probes return YES/NO.

## Step-by-step

1. Read all required files.
2. Run phase-specific recon (a-g above).
3. Draft the phase MD following `phase-template.md`.
4. Dispatch the verification sub-agent.
5. Apply findings.
6. Halt with structured summary.

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 7 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-7-triage-author.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

Add to the sub-agent brief: verify the 27-mode inventory is sourced from KTX canonical list (not invented); verify Track C disciplines (D11) are referenced in the per-mode authoring task; verify URL slug discipline (D6) is enforced for extract-path modes.

## Halt protocol

```
PHASE 7 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-7-triage-author.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 8.
