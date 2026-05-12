You are drafting Phase 8 of the qwiki-v1-beta arc (2026-05-12).

This is the FINAL phase of the arc. Phase 8 is the vertical-slice verification moment -- the arc's success criterion lands here.

## Arc identification

This is the **2026-05-12 qwiki-v1-beta** arc. Tell-tale signs of being in a sibling arc -- halt if you see them:

- decisions.md with only D1-D17 (qw-oracle Arc 1).
- Phase MDs in `docs/superpowers/plans/2026-05-02-qw-oracle-arc1/` or sibling arcs.
- Decision references to "JSONB always-on rule", "voyage-4-large", "RRF retrieval", "Layer 2 hygiene".

If you see those, halt.

## Phase 8 scope

Layer 3 harvest + vertical-slice verification. Two deliverables:

1. **Harvest mode-page sections into oracle Layer 3 concept-notes.** For each substantial mode page from Phase 7 (the flagship-substantial subset), the operator (acting as curator per D17 + D11) distills mode-page sections into `apps/qw-oracle/curated/concept-notes/mode-<name>.md` files following the existing workflow at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`. The harvest applies Track C disciplines: section-as-atom, self-contained, L1-L3 cross-refs, citations. Run oracle's `load-concepts` ingest pipeline to load the new harvested .md files.

2. **Vertical-slice verification probes.** Run oracle MCP `search_concepts` queries for mode-related questions and confirm the harvested content returns. Example probe queries:
   - "How does Hoonymode work?" -> should return the harvested Hoonymode concept-note chunks.
   - "What are the gameplay rules in Clan Arena?" -> should return relevant CA chunks.
   - "Race mode rules" -> should return Race chunks.
   - At least one probe per flagship-substantial mode (typically 3-7 probes).

This phase closes the vertical slice from wiki authoring (Phase 7) through Layer 3 harvest (Phase 8a) to oracle MCP retrieval (Phase 8b). The arc's success criterion is this round-trip working end-to-end.

Runnable state at phase boundary: N flagship-mode concept-notes exist at `apps/qw-oracle/curated/concept-notes/mode-<name>.md` (with the right frontmatter per oracle's CLAUDE.md); oracle ingest log shows N concept-notes loaded successfully; oracle MCP `search_concepts` returns the harvested content for each probe query (match_quality = strong; cited via concept slug); the harvest workflow has been documented inline for future per-domain mini-arcs to crib.

## Working directory and git

- Working directory: `/home/paradoks/projects/quakeworld`
- Branch: `main` (no worktree)
- No PR / branch ceremony; commit + push to `main` directly at phase boundary
- Operator does not touch git; you run all git operations silently

## You are paper-only

Drafting is paper-only.

## Required reading

1. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md`
2. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md` -- D11 (Track C disciplines applied to harvest) + D15 (author-once-harvest-many; wiki upstream of oracle) + D17 (harvest is THE load-bearing curator activity) + D21-D26
3. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md`
4. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md`
5. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-7-triage-author.md` -- inputs (which modes are flagship-substantial)
6. `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-4-discipline-harvest.md` -- the Phase 4 harvest probe pattern; Phase 8 applies the same pattern at scale against real mode content (the difference: Phase 4 was a single test probe; Phase 8 is N real probes)
7. **`apps/qw-oracle/curated/concept-notes/CLAUDE.md`** -- the harvest workflow contract. READ END-TO-END. This is the load-bearing reference for Phase 8.
8. `apps/qw-oracle/curated/concept-notes/README.md` + `OPERATIONS.md` if they exist
9. `docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md` -- Pass 5 5.3 (curator workflow; harvest is load-bearing) + Pass 6 6.3 substrate item 3

## Phase-specific recon (before drafting)

a. Read `apps/qw-oracle/curated/concept-notes/CLAUDE.md` end-to-end. Confirm: required frontmatter (`slug:`, others?); section conventions; how `load-concepts` ingests; how chunks are split; how citations resolve. Note any constraints (e.g., one concept-note per file; file naming conventions; idempotency on re-load).

b. Identify the oracle MCP `search_concepts` tool's response shape. The `match_quality` field tells the operator whether to trust the result; `slug` is the citation handle. Phase 8 verification probes confirm `match_quality === 'strong'` AND the right `slug` returns.

c. Identify the existing concept-notes inventory (`ls apps/qw-oracle/curated/concept-notes/*.md`). Phase 8's mode-<name>.md files join this inventory. The naming convention (`mode-hoonymode.md` or `hoonymode-mode.md` etc.) should match operator preference; default to `<mode-name>-mode.md` so concept-notes lookup by mode name works naturally. Surface as Open Question if a convention conflict surfaces.

d. Verify oracle's `load-concepts` pipeline is operational. Phase 8 depends on it. Check `apps/qw-oracle/scripts/load-concepts/` or wherever the pipeline lives. If broken, surface as a blocker (the arc's success criterion depends on this).

e. Sketch the probe queries (per-flagship-mode). Use natural-language queries operators might actually ask: "how does <mode> work?" / "<mode> gameplay rules" / "what's the strategy in <mode>?". Verify each probe returns a strong-match-quality result with the right concept-note slug.

f. Decide whether Phase 8 documents the harvest workflow for future per-domain mini-arcs to crib. Yes: Phase 8 includes a "harvest workflow learnings" task that updates `apps/qw-oracle/curated/concept-notes/CLAUDE.md` (or adds a sibling doc) with Modes-specific learnings + general guidance for future domains. This is part of the arc's deliverable beyond just verification.

## Drafting rules

- ASCII only. (D21)
- Phase MD goes at: `docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-8-harvest-verification.md`
- Follow `phase-template.md` exactly.
- Every task declares Execution mode with one-line rationale. (D26)
- Default: `subagent (Sonnet medium)` for the harvest workflow execution (multi-step: wiki section read + .md distill + oracle ingest). `subagent (Sonnet medium)` for the MCP probe verification. `inline` for documentation updates (the workflow-learnings task).
- Verification probes return YES/NO.

## Step-by-step

1. Read all required files.
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
description: "Verify Phase 8 draft (qwiki-v1-beta)"
prompt: (paste the brief from phase-template.md "Verification sub-agent dispatch"
         section, substituting absolute paths for this phase:
         - phase MD: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-8-harvest-verification.md
         - decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
         - review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md)
```

Add to the sub-agent brief: verify the harvest workflow respects the existing contract at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`; verify the MCP probe queries match queries operators would actually ask; verify the workflow-learnings task captures lessons for future per-domain mini-arcs.

## Halt protocol

```
PHASE 8 DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-8-harvest-verification.md
Lines: <count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line each, or "(none)">
  ADVISORY: <count> -- <one-line each, or "(none)">

Open questions: <count> -- <one-line each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass
```

Phase 8 is the LAST phase of this arc. After operator approves the Phase 8 MD AND its execution ships, the arc closes. The arc-reviewer skill (separate fresh terminal) handles post-arc walkthrough (spec-vs-shipped review).
