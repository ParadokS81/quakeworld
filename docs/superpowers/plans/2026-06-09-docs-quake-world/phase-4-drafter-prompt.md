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

---

## ORCHESTRATOR AUGMENTATIONS (2026-06-10, post-Phase-3 ship)

The arc-planner wrote the prompt above PRE-SHIP. Phase 3 has now shipped + been
boundary-verified (commits `2b4c76a6`..`6dffd58c`); these augmentations carry
forward what 2b/3 built and FILL A GAP the pre-ship prompt has.

### AUG-1 (GAP -- you MUST add this task): source links for the 5 non-ezQuake codebases

The README assigns "source links wired everywhere" to Phase 4 and F6 is Phase-4-owned,
but the body above only covers cvar->cvar + the reverse-index. The source-link work is
MISSING. Add a source-link-completion task:

- **The seam exists + is verified for ezQuake:** read `apps/docs-web/lib/source-link.ts`
  cold -- a `REPOS: Record<string,{repo,prefix}>` map (ezQuake = `QW-Group/ezquake-source`
  + `src/` prefix) and `sourceUrl(codebase, meta, ref)` returning
  `https://github.com/{repo}/blob/{meta.upstream_commit}/{prefix}{file}#L{line}` or
  `undefined` (-> the card shows plain `file:line`, D11). It is the per-codebase config
  seam Phase 4 fills.
- **Populate REPOS for ktx/mvdsv/qtv/qwfwd/qwcl. Do NOT guess slugs/prefixes** -- RECON
  them from the authoritative source: `apps/qw-oracle/scripts/extractors/extractor_lib/clang_config.py`
  (+ each `scripts/extractors/<codebase>/` config) carry the clone URL and the source-path
  layout that determines the URL prefix (ezQuake's is `src/`; others may differ or be
  flat-root). Verified hints: ktx = `QW-Group/ktx`, mvdsv = `QW-Group/mvdsv`, ezQuake =
  `QW-Group/ezquake-source`. qtv / qwfwd / qwcl repos are RECON items (SCHEMA: qwcl is a
  single-commit repo, label `2.33` aliased to commit `bf4ac42` -- handle with care).
- **F6 is the load-bearing constraint:** `meta.upstream_commit` is a real git SHA for
  ezquake/ktx/mvdsv/qwcl (`e4a2c20a`/`67253dc9`/`18d03621`/`bf4ac424`) but a VERSION
  STRING for qtv (`1.16-dev`) and qwfwd (`1.40-dev`). The current `/blob/{commit}/`
  template yields a BROKEN link for qtv/qwfwd (a version string is not a git ref unless
  it is also a tag). The module must branch: SHA -> `/blob/{sha}/`; version-tag -> a
  tag-based ref IFF that tag exists in the repo, else omit (plain text, D11). **Verify
  each of the 5 by spot-checking a sample file resolves HTTP 200; any 404 degrades to
  plain text -- NEVER ship a broken link.**
- Execution mode for this task: `subagent (Sonnet medium)` -- config population + a
  URL-shape branch + per-codebase HTTP verification; bounded, below the cvar-link-resolver
  tier.

### AUG-2 (carry-forward): what Phase 2b/3 built that Phase 4 extends

- **Anchor scheme (D22 -- the cvar->cvar link TARGET):** `lib/anchor.ts` ->
  `entityAnchor(name) = name.toLowerCase()`; the deep link is
  `/<codebase>/<type>#<entityAnchor(name)>`. The resolver wraps a matched cvar name in a
  link to that anchor WITHIN the same codebase. Orchestrator verified the fold is
  collision-free across all 20 files.
- **Descriptions render PLAIN TEXT today** (`EntityCard.vue`:
  `<p style="white-space: pre-line">{{ row.descriptionFull }}</p>`). Phase 4 makes cvar
  names in that text clickable. **D15-clean approach (recommended; you design it):** the
  build-time resolver pre-computes the linked description as SEGMENTS (an array of
  `{text}` | `{name, anchor}` spans) carried on the render contract (`browse-types.ts`
  `BrowseRow`), and `EntityCard` `v-for`s over segments rendering text or `<a>`. AVOID
  `v-html` (escaping/XSS + it hides logic in the template). Everything else in this
  renderer is already pre-shaped at build time -- match that pattern.
- **The "Used in" slot already exists** in `EntityCard.vue` (the
  `<!-- Phase 4 reverse-index slot ... -->` comment). Phase 4 populates it; it renders
  nothing in v1.
- **Per-codebase config precedent (Phase 3):** `lib/codebase-label.ts` is a
  `Record<slug,label>` lookup with a `?? slug` fallback -- the SAME shape the source-link
  REPOS map uses; a 7th codebase degrades gracefully. Follow this pattern (no per-codebase
  branch -- D14).
- **The D14/D15 grep gates stay green:** the cvar-link resolver + reverse-index are `lib/`
  modules; the card gains NO codebase/type literal. Phase-boundary checks MUST include #5
  (`grep -nE "ezquake|'cvar'|'command'|'macro'" .../components/Entity*.vue` empty) and #6
  (the D15 `fetch|readFileSync|.filter(|.map(|.reduce(` grep empty) over every
  newly-touched component.

### AUG-3 (environment): a concurrent session is writing the concept-note corpus

A SECOND Claude session is actively authoring L3 concept notes in
`apps/qw-oracle/curated/` (the `demand-driven-l3-concept-authoring` arc). So: (a) the
corpus the reverse-index reads is LIVE + SPARSE and may change during the phase -- design
empty-OR-sparse as the DEFAULT path; (b) this arc only READS `curated/` front-matter, it
must NOT write there (no write collision -- Phase 4 writes only `apps/docs-web/`); (c) when
committing, `git add` explicit `apps/docs-web/` + plan-dir paths ONLY and run
`git diff --cached --stat` before every commit (shared tree).

### AUG-4 (scope boundary): NO visual polish in Phase 4

F14 logged an OPEN pre-deploy visual-polish pass (trim the daisyUI include, resolve D10
"adopt vikpe's theme", density/spacing) that the orchestrator slots BEFORE Phase 5. That
is NOT Phase 4. Phase 4 = cross-links + source links only; do not drift into theme work.

### Drafting note

The ORCHESTRATOR runs the Explore verification pass on your draft at the boundary (so you
need not nest one). Still self-check before halting: D19 (within-codebase scope; no
cross-fork), D15 (logic in modules, not the card), and the AUG-1 source-link F6 branch.
WRITE `docs/superpowers/plans/2026-06-09-docs-quake-world/phase-4-crosslinks.md`; halt
with the MD path + finding counts + open questions + recommendation.
