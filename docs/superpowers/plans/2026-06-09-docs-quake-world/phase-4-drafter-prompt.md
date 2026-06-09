You are drafting Phase 4 of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). Phase 4 is CROSS-LINKS + enhancements:
build-time cvar->cvar auto-linking (within a codebase) and the entity->guide
"Used in" reverse-index (over concept-note related_entities), with no dead links.
RETARGET (decisions.md D7/D19 amendment 2026-06-09 +
contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md): the "Used in" link targets
the docs.quake.world GUIDES PORTAL (the L3-rendered guides surface), NOT the wiki.
The guides portal is a LATER docs-web surface (downstream of the L3 concept-notes
arc) and no notes have shipped yet, so in v1 this reverse-index is built but
DORMANT -- it renders zero "Used in" links (the empty-corpus path, which is also
the no-dead-link guarantee). cvar->cvar is the LIVE v1 cross-link and Phase 4's
primary v1 deliverable.

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
7. apps/qw-oracle/curated/   (the concept-note corpus; the notes' related_entities front-matter is the guides reverse-index source -- read a few notes to confirm the related_entities shape. NOTE: in v1 the corpus is empty/sparse for the guides surface -- the L3 arc authors these; design the reverse-index so empty-corpus is the DEFAULT path, not an error.)
8. contracts/active/DOCS-GUIDES-VS-REFERENCE-CONTRACT.md   (the cross-arc division of surfaces: the entity->guide retarget, the guide->entity stable-anchor requirement D22, and the deterministic-render principle)

DECISIONS THIS PHASE MUST HONOR:
- D7 (amended 2026-06-09): cvar names mentioned inside descriptions are
  auto-linked at BUILD time against the known entity list (rendered green-dotted
  per spec). The entity->guide "Used in" link is a reverse-lookup over
  concept-note related_entities, targeting the docs.quake.world GUIDES PORTAL
  (not the wiki); it renders ONLY where a note actually anchors the entity --
  zero "coming soon" dead links (and renders nothing at all in v1: no
  notes/portal exist yet).
- D19 (amended 2026-06-09): cvar->cvar resolves WITHIN one codebase's own
  entity-name set (NOT cross-fork -- forks share names but differ in meaning).
  The guides reverse-index reads the concept-note corpus at docs-build time; if
  the corpus is unavailable/empty at build (the v1 default), the index is empty
  and all "Used in" links omit (graceful, D11). Destination is the guides portal.
- D22 (contract-derived; Phase 2b owns, noted here for the reverse direction):
  the guide->entity link (a note's related_entities linking INTO the reference)
  needs stable per-entity anchors on the reference pages -- Phase 2b/3 provide
  them. Phase 4 does NOT build guide->entity links in v1 (they live on the later
  guides-portal surface); Phase 4 v1 ships the cvar->cvar links + the dormant
  entity->guide reverse-index only.
- D15: both resolvers are pure build-time data modules (plain TS), NOT logic in
  components. The card component already has the "Used in" slot (Phase 2b); this
  phase populates it via the module, and renders the auto-linked spans the
  resolver returns.

RECON: read a sample of concept notes in apps/qw-oracle/curated/ to confirm the
related_entities front-matter shape (the typed L1 anchors) AND whether the corpus
is empty/sparse at v1 build time (the L3 arc authors these -- design the
reverse-index so empty-corpus is the default path, not an error). Confirm how the
card component (Phase 2b) expects linked-description spans and the "Used in" data,
and that it exposes stable per-entity anchors (D22). Confirm the codebase
entity-name sets are available to a build-time module (from the Phase-1 JSON).

DELIVERABLE / runnable state at boundary: in a rendered card, cvar names in the
description are clickable links to those cvars' rows (same codebase only) -- the
LIVE v1 cross-link and Phase 4's primary deliverable. The entity->guide "Used in"
reverse-index is built as a data module but DORMANT in v1: with no concept notes
shipped it renders zero "Used in" links (verify the module loads, handles the
empty/sparse corpus as the default, and -- for any note that DOES anchor an
entity -- would emit a guides-portal-targeted link, never a wiki one). The
no-dead-link guarantee is trivially met in v1 because nothing renders.

EXECUTION-MODE GUIDANCE:
- The cvar-link resolver + the entity->guide reverse-index (build-time data
  modules with the scoping judgment of D19): `subagent (Sonnet MAX)`.
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
