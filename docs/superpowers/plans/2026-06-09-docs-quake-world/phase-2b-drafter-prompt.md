You are drafting Phase 2b of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). Phase 2b is the ezQuake TEMPLATE: the
type-generic, codebase-generic browse + card renderer, PROVEN end-to-end on
ezQuake (the richest data). This is the tracer bullet -- it proves the whole
stack from Phase-1 JSON to a filterable, inline-expanding browse view. The other
5 codebases come in Phase 3 (data + config only, same components).

STOP and re-check your arc if you see Postgres migrations or category
apply-scripts -- sibling/precursor arcs. This arc touches `apps/docs-web/`.

This is a structured PLANNING task. Output is the Phase 2b MD. Drafting is
paper-only -- no dev server, no build.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-2b-ezquake-template.md

REQUIRED READING:
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (full; D3, D4, D5, D8, D11, D14, D15, D17, D18 are central)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md   (F2, F5)
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (sections 5, 6, 7 -- IA, the card, enhancements -- are the render spec)
6. apps/docs-web/   (the scaffold Phase 2a produced -- the module structure you build into; read it cold, it exists now)
7. apps/docs-web/data/ezquake-*.json (or the docs ezQuake file from Phase 1 -- the exact record shape you render)

DECISIONS THIS PHASE MUST HONOR -- this phase is where D14/D15 are won or lost:
- D14: the browse + card components are TYPE-GENERIC and CODEBASE-GENERIC. They
  take a list of uniform records (D13) + a small per-type/per-codebase config and
  render. NO per-codebase or per-type branching inside a component. If you find
  yourself writing an "ezQuake card" vs a "KTX card", stop -- that is the failure
  mode. Phase 3 must be able to feed 5 more codebases through these SAME
  components with zero new component code.
- D15: dumb components. ALL data-fetch / derivation / state lives in plain-TS
  modules: the friendly-type mapper (D18), the category grouper (D17), the
  filter/search, the version-walk reader. A `.filter()` or `fetch` inside a
  `.vue <script>` is drift -- the verifier flags it.
- D4: collapsed row = aligned columns `Name | Type | Default | Description-preview`
  (columns aligned vertically, no zigzag; description truncates to first
  sentence). Inline expansion (in place, not a modal). Expanded card = full
  description + remarks (when present) + values (when present) + meta strip
  (category, source link, version history, "Used in" cross-link slot -- the
  cross-link itself is Phase 4; leave the slot).
- D5/D18: friendly type word (toggle/number/choice/text) in the collapsed row;
  raw type on expand. Derivation in a pure module (unit-coverable).
- D3: per-type browse view with category-as-filter -- a Flat / Grouped-by-category
  toggle + free-text search. NOT static category pages.
- D8: source links (data: source_ref) + ezQuake version-walk (first_seen /
  last_seen / default_history). ezQuake is the only codebase with real history.
- D11: graceful degradation -- every field renders where present, omits cleanly
  where absent. Build the components so a missing type badge / missing values /
  missing history is simply absent, not an error. (This is what lets Phase 3's
  leaner codebases reuse these components.)

RECON: read the scaffold's module layout (Phase 2a), read the ezQuake docs JSON
shape, confirm which fields are present on ezQuake records (type badge + values
ARE present for ezQuake; they will be absent for other codebases later -- design
for that now). Use Context7 for current Vue 3 + VitePress custom-component docs
if needed.

DELIVERABLE / runnable state at boundary: the dev server renders ezQuake browse
views (Cvars at minimum, plus the other exported ezQuake types) end-to-end --
free-text filter narrows the list, the Flat/Grouped toggle works, a row expands
in place to the full card with description/remarks/values/meta, source links
resolve, and version-walk shows for ezQuake cvars with history.

EXECUTION-MODE GUIDANCE:
- The generic renderer design (browse component + card component + the data-module
  contract they consume -- the architectural heart, D14/D15): `subagent (Opus medium)`.
- Each pure data module (friendly-type mapper, category grouper, filter, version-walk
  reader): `subagent (Sonnet medium)`.
- Wiring ezQuake's per-type config / landing page: `subagent (Sonnet medium)` or inline.

DRAFTING RULES: ASCII only; phase-template.md exactly (Execution-mode column
required); full content for inlined files; no length cap; split only if the
generic-renderer build and the ezQuake-wiring are genuinely independent commits
(default: keep together -- they prove each other).

STEP-BY-STEP:
1. Read required files + the live scaffold. Note F2/F5.
2. Recon the scaffold module layout + the ezQuake JSON shape.
3. Draft phase-2b-ezquake-template.md per the template.
4. Dispatch the verification sub-agent (Explore). Its D14 (type-generic) + D15
   (logic-in-component) checks are the load-bearing ones for this phase.
5. Apply findings (decision wins).
6. Halt. Report MD path, finding counts, open questions, recommendation.

Do NOT proceed to Phase 3. Do NOT execute anything.
