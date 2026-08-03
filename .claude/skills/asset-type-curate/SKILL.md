---
name: asset-type-curate
description: |
  Use this skill to investigate one QuakeWorld asset_type from
  qw-asset-types.yaml and produce a Layer 3 concept note in
  apps/qw-oracle/curated/asset-notes/. Triggers on
  "/asset-type-curate <slug>", "curate asset type <name>",
  "next asset-type slice", or "run asset-type-curate on <slug>".
  Walks pre-flight / source-verify / docs-cross-ref / corpus-mine /
  triage / output for one slug. L1-GAP halts before draft; all other
  flags produce a draft favoring source-truth.
---

# asset-type-curate

One asset_type slug per invocation. Produces an investigation report plus
(flag-gated) a draft Layer 3 note. Designed for parallel fan-out: Opus
orchestrator dispatches ~20 Sonnet sub-agents, one per slug.

## Trigger phrases

- `/asset-type-curate <slug>`
- "curate asset type <name>"
- "next asset-type slice"
- "run asset-type-curate on <slug>"

## Inputs

- **slug** -- required. Must match an `asset_type` key in
  `apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`.
  Verify the entry exists before proceeding.
- **engines** -- optional. Default: all four (ezquake, fte, qwcl, mvdsv)
  plus the `qw` namespace. Override only when the slug is known to apply
  to a subset.
- **audit_date** -- optional. Default: today (YYYY-MM-DD). Written to
  `last_verified` in the output frontmatter.

## Context files to load at start

Always read before beginning Step 1:

- `apps/qw-oracle/curated/asset-notes/README.md` -- frontmatter schema,
  voice/length tiers, progressive-disclosure rule, notes table.
- `apps/qw-oracle/curated/asset-notes/OPERATIONS.md` -- stewardship
  playbook, flag-triage table, L1-GAP handling, companion-asset convention.
- `references/asset-note-template.md` (this skill's references/) -- the
  .md skeleton with required + optional sections and voice exemplar.

These three documents govern the note shape. The skill does not duplicate
their content.

---

## 6-step workflow

### Step 1 -- Pre-flight

Load the seed entry for the slug from
`apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml`.
If the file `apps/qw-oracle/scripts/extractors/qw/output/qw-asset-types.json`
is older than the seed mtime, regenerate it before proceeding.

**L1 anchor pull -- which JSONs exist.** Two engines produce asset-loader-sites
JSON:
`apps/qw-oracle/scripts/extractors/ezquake/output/ezquake-asset-loader-sites-ast.json`
and `apps/qw-oracle/scripts/extractors/fte/output/fte-asset-loader-sites-ast.json`.
QWCL and MVDSV extractors produce cvar/command/variable JSON only -- no
asset-loader-sites file exists for either. When source-verifying a slug that
applies to QWCL/MVDSV, read C source directly; document the engine's
mechanism in the draft and the absence of L1 JSON in the investigation
report rather than reporting it as a gap.

**L1 query and fallback.** Filter by
`reads_category_id == "ezquake:asset_category:<slug>"` (and the FTE
equivalent). If both queries return zero results, **before flagging
L1-GAP**, check the seed entry's `l1_hint_bare_categories` field and re-query
with each listed bare category prefixed by the engine namespace
(`ezquake:asset_category:<bare>`). The seed slug name and the L1 extractor's
category name can diverge (e.g., seed slug `hud_element`, L1 category
`hud_overlay`); the `l1_hint_bare_categories` field is the bridge. **Also
enumerate** sites with `reads_category_id: null` whose enclosing-function
name fingerprints to the slug (e.g., a `Skywind_Load_f` site for the
`skybox` slug, identifiable by the "Skywind" substring). These are
uncategorized but semantically attached to the slug; surface them in the
investigation report as L1-CAT-AMBIGUOUS follow-ups (see
`references/status-flag-rubric.md` "Named enrichment-grade pattern").

If after both retries AND the null-category fingerprint scan, L1 has zero
anchors for the slug across both engines, flag L1-GAP and skip to Step 5.

### Step 2 -- Source verification

Read each L1-cited loader function in each engine supporting this asset_type.
Confirm source-probe behavior matches seed `engine_canonical_paths`. Note any
gaps: watchlist entries missing from LOADER_FUNCTIONS; mis-classified sites in
FUNCTION_TO_CATEGORY or ENCLOSING_FN_CATEGORY_RULES; roles that require
ENCLOSING_FN_CATEGORY_OVERRIDES (per `references/cross-engine-loader-grep.md`).

Multi-file types: for within-type sub-files (e.g., skybox 6 faces) describe
them in the draft body's "Files involved" / "Install layout" sections -- one
slug per asset_type. For cross-type companion files, populate the optional
`companion_asset_types` frontmatter field and add a cross-reference paragraph.

### Step 3 -- Documentation cross-reference

Search `research/repos/ezquake-docs/docs/docs/` for any page relevant to the
slug. Fetch the corresponding ezquake.com URL via jina reader
(`r.jina.ai/https://...`) as fallback when the local rip is absent or
materially older than upstream HEAD. When the local rip IS the upstream
content source (the `ezquake-docs/` repo is the source tree that builds
ezquake.com, not a snapshot of a separately-rendered site), skip the live
fetch -- the local rip is the authoritative content. Record: doc URL,
last-edit date, and any divergence from source behavior. Pages last-edited
on or before 2022-11-21 (boundary-inclusive) are presumed stale.

### Step 4 -- Corpus mining

Query the gfx corpus sandbox at `/home/paradoks/sandboxes/qw3-abab-gfx/` for
bundles matching the slug's `corpus_categories` from the seed entry. Sample
5-10 representative bundles for install-path evidence. Grep `gfx_comment`
(1,449 rows in `gfx.sql`) for type-specific install instructions or community
framing. See `references/corpus-mining-recipes.md` for bash/jq + SQL recipes.

### Step 5 -- Gap triage

Assign one status flag (definitions below). Record the evidence chain in the
investigation report. If the flag is L1-GAP, write the extractor-gap one-liner
in `## Extractor gap` (what the extractor or watchlist is missing and what is
needed to close it). If the seed entry needs correcting, write proposed deltas
in `## Suggested seed deltas` per `references/seed-patch-format.md`.

If the asset_type has cross-domain gameplay implications -- its full story
requires context from adjacent cvars, render systems, or ruleset gates
beyond pure asset-loading -- write a `## Suggested concept-note partner`
section: brief paragraph naming what the partner concept-note would cover,
what cross-domain context it needs, and why the asset-note alone is
insufficient. Authoring the partner concept-note is OUT of scope for this
skill; it follows the standard Path 2 (newly-earned authoring) workflow per
`apps/qw-oracle/curated/concept-notes/OPERATIONS.md`.

### Step 6 -- Output

Branch on flag per the output rules below. Always write the investigation
report. Write the note draft for all flags except L1-GAP. Halt with the
one-line status report.

**Re-walk note:** when re-running this skill on a slug whose draft already
exists on disk (calibration pass, post-extractor-fix re-dispatch, or any
update walk), both `<slug>.md` and `<slug>-investigation.md` may already
be present. The Write tool requires a `Read` call before overwriting an
existing file -- do a `Read` of each existing file first, then `Write` the
new content. This is a tooling-level requirement, not a content-review step.

---

## Status flags

Five flags. Full rubric with concrete examples per asset_type shape lives in
`references/status-flag-rubric.md`.

- **CONFIDENT** -- wide evidence across source + docs + corpus; sources agree;
  draft is ready with high authority.
- **L1-GAP** -- extractor or handler needs work first; draft would be built on
  suspect evidence; halt without draft per D5.
- **DOC-GAP** -- no usable documentation; author from source + corpus only;
  divergence section is empty (nothing to diverge from).
- **DIVERGENT** -- sources disagree (source wins per D4); draft notes the
  divergence prominently; see `references/divergent-resolution-rubric.md`.
- **SPARSE** -- minimal evidence everywhere; typically engine-internal types
  (palette, colormap, map_lighting, map_entities, locfile, demo,
  demo_archive); short draft confirms the type is engine-managed / non-shareable
  as appropriate.

---

## Flag-gated output branch

| Flag | Investigation report | Note draft |
|---|---|---|
| CONFIDENT | Yes -- evidence summary, no gap sections needed | Yes |
| DOC-GAP | Yes -- doc-gap section notes what is absent | Yes -- sourced from engine + corpus only |
| DIVERGENT | Yes -- divergence detail in body | Yes -- source-truth wins; divergence noted in body |
| SPARSE | Yes -- SPARSE evidence summary | Yes -- short; confirms engine-internal / non-shareable |
| L1-GAP | Yes -- includes `## Extractor gap` one-liner | NO -- skip draft entirely |

---

## Output locations

| Artifact | Path | When |
|---|---|---|
| Investigation report | `apps/qw-oracle/docs/asset-curation/<slug>-investigation.md` | Always |
| Note draft | `apps/qw-oracle/curated/asset-notes/<slug>.md` | All flags except L1-GAP |
| Inline seed-patch | `## Suggested seed deltas` section in investigation.md | When source surfaces seed drift |
| Extractor-gap one-liner | `## Extractor gap` section in investigation.md | L1-GAP flag only |
| Concept-note partner suggestion | `## Suggested concept-note partner` section in investigation.md | When asset_type has cross-domain gameplay implications |

**Promote-to-file exception (D6):** if a seed-patch exceeds 5 fields or
proposes a schema-shape change, write `<slug>.yaml` under
`apps/qw-oracle/scripts/extractors/qw/seeds/_patches/` and link from
investigation.md. See `references/seed-patch-format.md`.

---

## Pointers to references/

Load from this skill's `references/` subdirectory on demand per step.

| File | Purpose |
|---|---|
| `references/asset-note-template.md` | Full .md skeleton + frontmatter schema + required/optional body sections + voice exemplar |
| `references/status-flag-rubric.md` | Full rubric for all 5 flags with concrete examples per asset_type shape |
| `references/corpus-mining-recipes.md` | bash/jq + SQL recipes for gfx sandbox pass2-manifest.ndjson + gfx_comment table |
| `references/seed-patch-format.md` | Inline delta shape for `## Suggested seed deltas`, promote-to-file criteria |
| `references/cross-engine-loader-grep.md` | Multi-use-loader patterns + per-engine grep recipes + screenshot-regex bug fingerprint |
| `references/divergent-resolution-rubric.md` | Source-vs-docs and engine-A-vs-engine-B divergence handling + retired-feature shape |

---

## Verification discipline

Before writing any path, function name, cvar name, or version claim in the
investigation or draft: verify against the live source (seed YAML, extractor
JSON, or C source file). Mark unverified claims explicitly as hedged. Do not
explain away gaps between expected and observed behavior -- flag them.

---

## Halt contract

The final line of every skill invocation is:

```
<slug>: <FLAG> -- <one-line summary> -- artifacts: <paths>
```

Example (CONFIDENT):

```
skybox: CONFIDENT -- 6-face cubemap; 4 ezQuake probe variants + FTE bare-root; r_skyname + /loadsky + /skygroup; docs stale but source clear -- artifacts: docs/asset-curation/skybox-investigation.md, curated/asset-notes/skybox.md
```

Example (L1-GAP):

```
locfile: L1-GAP -- no loader-site entries in ezquake or fte extractor output; watchlist needs Loc_LoadLocations entry -- artifacts: docs/asset-curation/locfile-investigation.md
```

Do not commit. The orchestrator handles staging and commit after review.
