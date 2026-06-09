You are drafting Phase 1 of the **docs.quake.world** arc
(date suffix 2026-06-09-docs-quake-world). This arc builds the WEBSITE that
auto-projects QW Oracle Layer 1 into a per-codebase browsable reference
(VitePress + Tailwind/daisyUI on Cloudflare Pages). Phase 1 is the L1 export
pipeline: extend `build-snapshot.ts` to emit uniform docs JSON for all 6
codebases.

STOP and re-check which arc you are in if you see any of these -- they belong
to a DIFFERENT, already-shipped arc and mean you opened the wrong prompt:
  - `category_inferred` SQL apply-scripts, `01-mvdsv-antilag-synth.sql`,
    taxonomy tables assigning categories to MVDSV/QTV/QWFWD/QWCL
      -> that is the PRECURSOR `2026-06-09-docs-l1-enrichment` (same date
         prefix, different arc). It enriched the DATA. THIS arc consumes that
         data. Do NOT re-run enrichment.
  - describe-fill / synthesis of L1 descriptions, F-D4a guards
      -> describe-fill arc. Not this one.
This arc EXTENDS (does not rewrite) `build-snapshot.ts` and creates the docs
JSON it will consume. No website code in Phase 1.

This is a structured PLANNING task. Your output is a markdown file -- the
Phase 1 MD. You do NOT execute anything (no build-snapshot runs, no DB writes).
The phase MD becomes input to a separate execution session later.

Working directory: /home/paradoks/projects/quakeworld
Output file: docs/superpowers/plans/2026-06-09-docs-quake-world/phase-1-l1-export.md

REQUIRED READING (all of these, before drafting):

1. docs/superpowers/plans/2026-06-09-docs-quake-world/README.md
2. docs/superpowers/plans/2026-06-09-docs-quake-world/decisions.md   (D1-D21, full)
3. docs/superpowers/plans/2026-06-09-docs-quake-world/review-findings.md  (F1-F5)
4. docs/superpowers/plans/2026-06-09-docs-quake-world/phase-template.md   (the shape you produce)
5. docs/superpowers/specs/2026-06-09-docs-quake-world-design.md   (the spec; section 13 is the verified data inventory)
6. apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts   (FULL -- this is what you extend; note lines 683-744: the per-project dispatch + PROJECT_DEFAULT_SNAPSHOT_VERSION map)
7. apps/qw-oracle/SCHEMA.md   (the `entities` table + the per-type `*_versions` tables -- the columns you project: name, description, description_origin, source_state, first_seen/last_seen_version; cvar_versions.help_type/help_desc/help_remarks/help_values/help_group_id/default_value/category_inferred/source_root; command_versions.category_inferred/help_group_id/source_root)
8. apps/qw-oracle/scripts/load-knowledge/types.ts + constants.ts   (the Project union, SCHEMA_VERSION)
9. docs/superpowers/plans/2026-06-09-docs-l1-enrichment/taxonomy.md   (the precursor's verified category-version gotcha -- D16/F3 -- and which categories exist per codebase)

DECISIONS THIS PHASE MUST HONOR (call them out by number in the MD):
- D12 (HARD GATE): docs export is a SEPARATE emit path writing to a docs-owned
  dir (default apps/docs-web/data/). Do NOT modify build-snapshot's
  ezquake/qwcl/qw emit paths or DEFAULT_OUTPUT_DIR in any way that changes
  slipgate's consumed files. Ship a slipgate-parity probe (F1).
- D13: ONE generic per-type emitter that reads `entities` JOIN `<type>_versions`
  for ANY project and projects the uniform record
  { name, friendly_type, raw_type, default, description, remarks, values,
    category, source_ref, first_seen, last_seen, default_history }. Omit absent
  fields; do not null-fill. (friendly_type + category MAY be derived in the
  frontend instead -- see Open Question default below.)
- D16 (F3): read the FROZEN snapshot version per codebase -- qtv=1.16-dev,
  qwfwd=1.40-dev, qwcl=2.33, the rest=head. NOT head for those three.
- D17 (F4): ezQuake category = help_group_id + AST `groups` taxonomy; the other
  5 = category_inferred. Category exists only on cvar+command (F5); other types
  render uncategorized.

PHASE-1 RECON (do this before drafting):
- Map, per codebase, which entity types to export. Spec section 13 has the
  inventory. RECOMMENDED v1 type set: the user-facing tunable types --
  cvar, command, macro (where present), cmdline_param (where present),
  info_key (where present). DEFER the deep-internal / high-count types --
  log_template (KTX 1196 / MVDSV 691), protocol_message, qc_builtin, flag_bit,
  token_primitive, keyname, hud_element -- to a later refinement. Because the
  renderer is type-generic (D14), adding a deferred type later is pure data, no
  rework. RECORD this type-scope choice as an Open Question for operator review
  at the Phase 1 boundary (do not bury it).
- Confirm the column reads per type against SCHEMA.md (every column you SELECT
  must exist).
- Confirm the docs output dir does not collide with slipgate's data dir.

THREE PROBES the phase must ship (these are the verification regime):
1. slipgate-parity probe (F1/D12): sha256 of slipgate's consumed files
   (ezquake-*.json, qwcl-variables*.json, qw-maps.json, qw-gameplay.json)
   unchanged after the docs emit. Baseline captured in prerequisites Task 0.
2. uniform-shape probe (D13/F2): every emitted record validates against the
   uniform shape; absent fields are omitted, not null.
3. category-coverage probe (D16/F3): category coverage is non-empty for
   qtv/qwfwd/qwcl at their FROZEN versions (catches the head-vs-frozen
   inversion).

EXECUTION-MODE GUIDANCE (annotate every task per phase-template.md):
- The generic emitter + per-codebase dispatch (the core synthesis touching the
  shared producer under the slipgate gate): `subagent (Opus medium)` -- breadth
  of types + the hard gate justify the tier.
- Each of the 3 probes: `subagent (Sonnet medium)`.
- Any pure-mechanical config/list edit with full content inlined: `inline`.

DRAFTING RULES:
- ASCII only. No emoji. ASCII hyphen-minus.
- Follow phase-template.md EXACTLY (section order, names, the per-task
  Execution-mode column). Don't add/drop sections.
- If a step ships file content, ship the FULL content. "Engineer ports X" is a
  smell -- inline it or split it.
- No length cap; don't cut tasks to fit.

STEP-BY-STEP:
1. Read all required files. Note which findings (F1-F5) Phase 1 owns.
2. Run the Phase-1 recon above (Read/grep on build-snapshot.ts, SCHEMA.md, the
   extractor output dirs).
3. Draft phase-1-l1-export.md per the template, execution mode on every task.
4. Dispatch the verification sub-agent (brief in phase-template.md, paths filled
   in for this phase's MD + decisions.md + review-findings.md; subagent_type=Explore).
5. Apply findings. A finding contradicting decisions.md is rejected with a
   one-line rationale in "Open questions" (decision wins).
6. Halt. Report: path to the MD, sub-agent finding counts
   (CRITICAL/SUBSTANTIVE/ADVISORY), open questions for the operator (the
   type-scope choice is one), recommendation (ready / needs another pass).

Do NOT proceed to Phase 2. Do NOT execute anything. Drafting is paper-only.
