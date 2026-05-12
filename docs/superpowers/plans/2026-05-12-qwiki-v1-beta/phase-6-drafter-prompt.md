You are drafting Phase 6 of the qwiki-v1-beta arc (2026-05-12).

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".

If you see those, halt.

## Phase 6 scope

Modes curator tool + smoke triage. Two deliverables:

1. **Modes curator tool** at `apps/qwiki-sandbox/scripts/curate-modes/` (specific subdir name finalized in the drafted MD). Cribs from `apps/qw-oracle/scripts/curate-brands/` per D20. Pattern: three-column inventory -> triage -> sign-off. JSON sidecar state. Pauseable + resumable. Inventory source: the running `qwiki-analysis` mariadb container (per prerequisites; holds the old-wiki dump). Query the dump for mode pages (Category:Modes membership + KTX-mode-tagged pages + any sub-category mode pages).

2. **Smoke triage of 3-5 modes.** Operator drives the tool through 3-5 modes to validate it works. JSON state file populates. Operator kills the tool mid-triage, relaunches, verifies state restored. This proves the pauseable+resumable property without committing to full 27-mode triage (full triage is Phase 7).

Runnable state at phase boundary: `bun apps/qwiki-sandbox/scripts/curate-modes/index.ts` (or whatever the tool's entry point is) launches; three-column view renders; inventory loaded from `qwiki-analysis` mariadb (N rows for the N old-wiki mode pages plus null-row placeholders for the 27-N missing modes); operator can triage 3-5 modes through the UI; JSON sidecar at `apps/qwiki-sandbox/scripts/curate-modes/mode-curation-state.json` (or similar) persists between launches; killing + relaunching the tool restores the JSON state.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D13 (per-domain workflow) + D14 (Modes is vertical-slice proof) + D20 (Modes curator follows brand-curator pattern) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-5-mode-page-type.md` -- specifies the Mode page-type bones+slots; curator tool's "target shape" column reflects this
6. **`apps/qw-oracle/scripts/curate-brands/`** -- the precedent pattern. Read end-to-end: `README.md`, `index.html`, `brand-curation-state.json` (state file shape), any TS/JS source. This is the load-bearing reference.
7. `apps/qwiki-sandbox/CLAUDE.md` -- sandbox conventions (subdirectory layout, scripts vs deploy convention)
8. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 6 6.1 LOCKED (per-domain workflow shape, curator tool pattern)

## Phase-specific recon (before drafting)

a. Read `apps/qw-oracle/scripts/curate-brands/` end-to-end. Note:
   - File structure (TS entry point? HTML UI? Both?)
   - State file shape (`brand-curation-state.json`): per-item state badges, triage decisions
   - Inventory data source (DB query? JSON file?)
   - Three-column shape (inventory column / triage column / sign-off column)
   - Pauseable + resumable mechanism (state save on every action vs explicit save?)
   - UI surface (browser-based local server? Terminal TUI? File-based with manual edit?)

b. Connect to `qwiki-analysis` mariadb container (verify it's still running per prerequisites; if not, surface as a blocker). Query for mode pages. Likely query:

   ```sql
   SELECT page_id, page_title, page_namespace
   FROM page
   WHERE page_namespace = 0
   AND page_id IN (
     SELECT cl_from FROM categorylinks WHERE cl_to = 'Modes'
   );
   ```

   Note exact count. Cross-reference against the 27-mode KTX inventory from Pass 6 6.2.

c. Identify the 27 KTX modes. Pass 6 doesn't enumerate them; the source is KTX itself (probably `apps/quad/research/ktx/` or a KTX source clone elsewhere). Phase 6 needs the canonical 27-mode list as the curator tool's TARGET inventory (all 27 modes get a row in the triage; missing-from-old-wiki modes get a null placeholder + "new-build" disposition default). If the 27-mode list isn't readily findable, surface as an Open Question with default-chosen "operator provides the list during smoke triage."

d. Identify the tool's state file location. Convention from brand-curator: `apps/qw-oracle/scripts/curate-brands/brand-curation-state.json`. For Modes: `apps/qwiki-sandbox/scripts/curate-modes/mode-curation-state.json` (final name in drafted MD).

e. Decide the curator tool's UI surface. Brand-curator pattern is likely HTML + browser preview from a local server. Confirm via reading `apps/qw-oracle/scripts/curate-brands/index.html` (if it exists). For Modes, mirror that pattern unless the data shape demands different.

f. Note: the smoke triage step is operator-driven. Phase 6's tasks include the tool build + the smoke probe (3-5 modes through the tool, kill+relaunch, verify state restored). The phase MD verification probe documents the smoke result.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-6-modes-curator.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet MAX)` for the curator tool design + initial implementation (multi-file code synthesis; cribs brand-curator pattern). `subagent (Sonnet medium)` for the inventory query + ingestion. `inline` for the smoke triage runbook (operator-driven).
- Verification probes return YES/NO.

## Step-by-step

1. Read all required files (especially curate-brands).
2. Run phase-specific recon (a-f above).
3. Draft the phase MD following `phase-template.md`.
4. Dispatch the verification sub-agent.
5. Apply findings.
6. Halt with structured summary.

## Sub-agent verification brief

After drafting, dispatch:

```
Tool: Agent
subagent_type: Explore
description: "Verify Phase 6 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-6-modes-curator.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

Add to the sub-agent brief: verify the Modes curator tool's design respects D20 (brand-curator pattern cribbed) AND matches Pass 5's Mode form bones+slots from Phase 5 (so the curator's "target shape" column reflects what authors will actually fill in).

## Halt protocol

```
PHASE 6 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-6-modes-curator.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 7.
