You are drafting Phase 4 of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). Phase 4 is CROSS-LINKS + enhancements:
build-time cvar->cvar auto-linking (within a codebase) and the entity->wiki
"Used in" reverse-index (over concept-note related_entities), with no dead links.

STOP and re-check your arc if you see Postgres migrations or category
apply-scripts -- sibling/precursor arcs. This arc touches `apps/docs-web/` and
READS (does not modify) the concept-note corpus.

This is a structured PLANNING task. Output is the Phase 4 MD. Paper-only.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-4-crosslinks.md

REQUIRED READING:
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (D7, D15, D19 central)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (sections 6, 7 -- cross-links)
6. apps/docs-web/   (the data-module layer from Phase 2b -- the cross-link resolvers are NEW data modules in this layer, per D15)
7. apps/qw-oracle/curated/   (the concept-note corpus; the notes' related_entities front-matter is the wiki reverse-index source -- read a few notes to confirm the related_entities shape)

DECISIONS THIS PHASE MUST HONOR:
- D7: cvar names mentioned inside descriptions are auto-linked at BUILD time
  against the known entity list (rendered green-dotted per spec). The
  entity->wiki "Used in" link is a reverse-lookup over concept-note
  related_entities; it renders ONLY where a note actually anchors the entity --
  zero "coming soon" dead links.
- D19: cvar->cvar resolves WITHIN one codebase's own entity-name set (NOT
  cross-fork -- forks share names but differ in meaning). The wiki reverse-index
  reads the concept-note corpus at docs-build time; if the corpus is unavailable
  at build, the index is empty and all "Used in" links omit (graceful, D11).
- D15: both resolvers are pure build-time data modules (plain TS), NOT logic in
  components. The card component already has the "Used in" slot (Phase 2b); this
  phase populates it via the module, and renders the auto-linked spans the
  resolver returns.

RECON: read a sample of concept notes in apps/qw-oracle/curated/ to confirm the
related_entities front-matter shape (the typed L1 anchors). Confirm how the card
component (Phase 2b) expects linked-description spans and the "Used in" data.
Confirm the codebase entity-name sets are available to a build-time module (from
the Phase-1 JSON).

DELIVERABLE / runnable state at boundary: in a rendered card, cvar names in the
description are clickable links to those cvars' rows (same codebase only); the
"Used in" meta line shows a wiki link only for entities a concept note anchors,
and is absent otherwise (verify a known-anchored entity shows it and a
known-unanchored one does not -- the no-dead-link guarantee).

EXECUTION-MODE GUIDANCE:
- The cvar-link resolver + the wiki reverse-index (build-time data modules with
  the scoping judgment of D19): `subagent (Sonnet MAX)`.
- Wiring the resolvers into the render + the card "Used in" slot: `subagent
  (Sonnet medium)`.

DRAFTING RULES: ASCII only; phase-template.md exactly (Execution-mode column);
full content for inlined files; no length cap.

STEP-BY-STEP:
1. Read required files + sample concept notes. Note applicable findings.
2. Recon the related_entities shape + the card's link/Used-in contract.
3. Draft phase-4-crosslinks.md per the template.
4. Dispatch the verification sub-agent (Explore). Its D19 (scope: within-codebase;
   no dead links) + D15 (logic in modules not components) checks are load-bearing.
5. Apply findings (decision wins).
6. Halt. Report MD path, finding counts, open questions, recommendation.

Do NOT proceed to Phase 5. Do NOT execute anything.
