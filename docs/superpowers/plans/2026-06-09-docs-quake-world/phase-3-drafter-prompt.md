You are drafting Phase 3 of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). Phase 3 is the FAN-OUT: wire the other
5 codebases (KTX / MVDSV / QTV / QWFWD / QWCL) through the SAME type-generic
components Phase 2b built. This phase should be mostly data + config + per-codebase
landing pages -- if it needs new component code, Phase 2b's generic renderer
(D14) failed and you must escalate, not paper over.

STOP and re-check your arc if you see Postgres migrations or category
apply-scripts -- sibling/precursor arcs. This arc touches `apps/docs-web/`.

This is a structured PLANNING task. Output is the Phase 3 MD. Paper-only.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-3-fanout.md

REQUIRED READING:
1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (D2, D11, D14, D17 central)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md   (F2, F5)
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (section 13 data appendix -- each codebase's types + field coverage)
6. apps/docs-web/   (the renderer + module layer from Phase 2b -- you REUSE these; read them cold)
7. apps/docs-web/data/   (the Phase-1 JSON for ktx/mvdsv/qtv/qwfwd/qwcl)

DECISIONS THIS PHASE MUST HONOR:
- D14: REUSE the Phase 2b components unchanged. The deliverable is per-codebase
  DATA + CONFIG + landing pages, not new components. If a codebase needs
  rendering the generic components can't do, that is a Phase 2b design gap --
  STOP, record it as a CRITICAL open question, and recommend a Phase 2b
  amendment rather than forking a component.
- D11: graceful degradation does the heavy lifting here. These 5 codebases are
  LEANER than ezQuake (no type badge except QWCL, no value lists, no version
  history except none, category via category_inferred not AST groups). The
  components already handle absence (Phase 2b built for it). Verify each
  codebase renders with its present fields and omits the rest cleanly.
- D17: category source per codebase -- the other 5 read category_inferred (NOT
  ezQuake's AST groups). Types without a category (info_key, cmdline, and the
  deferred internal types if any were included) render uncategorized.
- D2: design the per-codebase wiring so a 7th codebase (FTE, later) slots in as
  another data+config entry, degrading to a flat searchable list. Do not
  hardcode "exactly 6".

RECON: read the 5 codebases' docs JSON shapes; confirm which types each one
exported in Phase 1 (per the Phase 1 type-scope decision); confirm category_inferred
coverage is present (the Phase 1 category-coverage probe should already prove this).

DELIVERABLE / runnable state at boundary: all 6 codebases are browsable -- each
has a landing page and per-type browse views rendering through the shared
components, with graceful degradation visibly correct (e.g., a server codebase's
info_key list renders with no type badge and no version history, cleanly).

EXECUTION-MODE GUIDANCE:
- Per-codebase data + config + landing page: `subagent (Sonnet medium)`. The 5
  codebases are independent -- this is a candidate for a small paced fan-out
  (Sonnet, low concurrency, report honest counts). Do NOT fan out at Opus.
- Any shared-config edit (e.g., the codebase registry): `inline` or `subagent
  (Sonnet medium)`.

DRAFTING RULES: ASCII only; phase-template.md exactly (Execution-mode column);
full content for inlined files; no length cap.

STEP-BY-STEP:
1. Read required files + the live Phase 2b renderer/modules. Note F2/F5.
2. Recon the 5 codebases' JSON + which types each exported.
3. Draft phase-3-fanout.md per the template.
4. Dispatch the verification sub-agent (Explore). Its D14 check (no new component
   code; no per-codebase branching) is the load-bearing one.
5. Apply findings (decision wins).
6. Halt. Report MD path, finding counts, open questions, recommendation.

Do NOT proceed to Phase 4. Do NOT execute anything.
