You are drafting Phase 4 of the qwiki-v1-beta arc (2026-05-12).

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".

If you see those, halt.

## Phase 4 scope

Discipline + harvest verification. Three deliverables:

1. **Quality-tag categories.** Create three categories per D18: `Category:Needs review` (auto-added on save via page-type templates or `$wgHooks`-based hook), `Category:Stale` (explicit, manually added), `Category:Draft` (explicit, manually added).
2. **URL slug discipline (authoring rule).** Document the rule: for pages kept from the old wiki (extract path), use the same URL slug. Phase 4 documents the rule + adds form-validation hook to be implemented properly in Phase 5 (when forms exist). v1 baseline ships the authoring rule + a documentation page (`Wiki:URL slug discipline` or `Help:URL slugs`).
3. **Layer 3 harvest path observable end-to-end.** Author a test wiki page with a section worth harvesting. Run the existing harvest workflow at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`: distill the section into a `.md` file under `apps/qw-oracle/curated/concept-notes/`, run oracle's load-concepts pipeline, query oracle MCP `search_concepts` -- verify the harvested chunk returns.

Runnable state at phase boundary: three quality categories exist (`Special:Categories` lists them); saving a test page with a `[[Category:Needs review]]` tag adds it to the category; harvest probe: a test wiki section -> harvested .md at `apps/qw-oracle/curated/concept-notes/test-qwiki-harvest-probe.md` -> oracle MCP `search_concepts` returns the harvested chunk when queried.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D6 (URL slug) + D11 (Track C disciplines) + D15 (author-once-harvest-many) + D17 (curator scope -- harvest is THE load-bearing activity) + D18 (quality tags) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-1-mw-core.md` + `phase-2-extensions.md` + `phase-3-auth-groups.md` -- Outputs to next phase
6. **`apps/qw-oracle/curated/concept-notes/CLAUDE.md`** -- the harvest workflow contract. Read end-to-end. This is the load-bearing reference for Phase 4's harvest probe.
7. `apps/qw-oracle/curated/concept-notes/README.md` + `OPERATIONS.md` if they exist
8. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 4 4.4 (Track C disciplines) + Pass 5 5.3 (curator scope, harvest as load-bearing) + Pass 6 6.3 substrate item 3 (Layer 3 harvest path observable)

## Phase-specific recon (before drafting)

a. Read `apps/qw-oracle/curated/concept-notes/CLAUDE.md` end-to-end. Confirm: where harvested .md files land; what frontmatter is required; how `load-concepts` (or equivalent) ingests them; what oracle MCP tool returns the loaded content (`search_concepts` / `get_concept_note`).

b. Identify the oracle MCP server's reachable address from operator's terminal. Check `apps/qw-oracle/CLAUDE.md` for the deployed MCP path (likely `https://oracle.slipgate.me/mcp` per qw-oracle Arc 1 prerequisites). Confirm the operator has Claude Desktop / Claude Code wired to it (likely yes from prior arcs).

c. Sketch the harvest probe content: pick a tiny, self-contained wiki section that's representative (e.g., a glossary term like "spectator mode" with 2-3 sentences). The probe should verify the end-to-end path without requiring real Modes content (Modes content lands in Phase 7).

d. Confirm the URL slug authoring rule's enforcement mechanism for v1: documentation only (since forms don't exist until Phase 5). Phase 4's deliverable is the rule + doc page; form-validation hook is Phase 5's concern. Capture this as a cross-phase note in `review-findings.md` if needed.

e. Quality-tag categories: confirm MW category creation mechanism (create the category page, e.g., `Category:Needs review` with description). Auto-categorization on save: typically done via templates including `[[Category:Needs review]]` -- so Phase 5's Mode template adds this category; Phase 4 just creates the category pages themselves + documents the rule.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for the harvest probe (multi-step: wiki section + .md distill + oracle ingest + MCP query). `inline` for category creation (operator types in MW UI) + URL slug rule docs.
- Verification probes return YES/NO.

## Step-by-step

1. Read all required files.
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
description: "Verify Phase 4 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

## Halt protocol

```
PHASE 4 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Do NOT proceed to Phase 5. Phase 4 is the LAST substrate phase; Phase 5 begins the vertical Modes mini-arc.
