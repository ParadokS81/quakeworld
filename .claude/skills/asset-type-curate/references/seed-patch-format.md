# seed-patch-format.md
# Reference: Seed delta format for asset-type-curate investigation reports

This document specifies how sub-agents record proposed changes to
`apps/qw-oracle/scripts/extractors/qw/seeds/qw-asset-types.yaml` entries,
and when those proposals must be promoted to standalone patch files.

---

## Section 1 -- Inline delta format (common case)

When source verification or corpus mining reveals that a seed field is
missing, mis-typed, or contains an incomplete value, the sub-agent captures
the change as an inline `## Suggested seed deltas` section at the bottom of
`<slug>-investigation.md`.

Each proposed change is a YAML block with exactly four keys:

```yaml
# Proposed delta to qw-asset-types.yaml asset_type: <slug>
field_name:
  old: <current value or null if field is absent>
  new: <proposed value>
  rationale: <one sentence>
```

Multiple field changes for the same slug stack as separate blocks under the
same section header. The section ends at EOF or the next `##` heading.

### Example A -- adding a missing corpus_categories entry

Source verification for `crosshair` reveals the corpus sandbox contains a
"Crosshairs / Color" subcategory not listed in the seed:

```yaml
# Proposed delta to qw-asset-types.yaml asset_type: crosshair
corpus_categories:
  old: ["Crosshairs", "Crosshairs / Transparent"]
  new: ["Crosshairs", "Crosshairs / Transparent", "Crosshairs / Color"]
  rationale: qw.nu/gfx sandbox contains ~40 bundles tagged "Crosshairs / Color" absent from seed.
```

### Example B -- correcting a l1_hint_bare_categories mis-match

Source verification for `charset` finds that `"fonts"` appears as a
reads_category_id in the extractor output but is absent from the seed hint:

```yaml
# Proposed delta to qw-asset-types.yaml asset_type: charset
l1_hint_bare_categories:
  old: ["charset"]
  new: ["charset", "fonts"]
  rationale: FTE extractor emits reads_category_id "fonts" for R_LoadCharsetImage call sites; seed hint omits it.
```

---

## Section 2 -- Promote-to-file criteria (D6 exception)

Inline deltas are appropriate for **0-3 field changes** that modify existing
scalar or list values. Promote to a standalone patch file when either of the
following is true:

**Field count > 5.** More than five field deltas for a single slug are too
long to read inline during an investigation review pass. The inline section
becomes noise that buries other findings.

**Schema-shape change.** A delta that changes the structural type of a field
(list -> dict, scalar -> nested map, adding a field that does not exist in the
YAML field-reference comment block at the top of the seed file, or introducing
a new top-level `- asset_type:` entry) requires promotion. Adding values to an
existing list is fine inline. Changing the *type* of a field or adding a new
top-level entry is not.

### Where promoted patches live

```
apps/qw-oracle/scripts/extractors/qw/seeds/_patches/<slug>.yaml
```

The patch file is self-describing YAML using the same four-key block shape
(field_name / old / new / rationale) at the top level, plus a header:

```yaml
# Seed patch: <slug>
# Origin: asset-type-curate slice YYYY-MM-DD
# Promotion reason: <field count > 5 | schema-shape change>
```

When a patch is promoted, the `## Suggested seed deltas` section in the
investigation.md becomes a short pointer:

```
## Suggested seed deltas

Patch exceeds inline threshold. See:
  apps/qw-oracle/scripts/extractors/qw/seeds/_patches/<slug>.yaml
```

---

## Section 3 -- Worked example: Skins / Gib seed split (promote-to-file)

The most likely upcoming promote-to-file case surfaces during the `player_skin`
or `model_texture` slice. Currently the seed has a single `player_skin` entry:

```yaml
corpus_categories:
  - "Skins"
  - "Skins / Player Model"
  - "Skins / Gib"
```

If the slice concludes that Skins / Gib bundles (and possibly Skins / Monster)
warrant a distinct asset_type slug with its own `engine_canonical_paths` and
`l1_hint_*` fields, the proposal is a new top-level `- asset_type:` entry in
the seed -- a schema-shape change that qualifies for promotion regardless of
field count.

Rough shape of the promoted patch file
(`apps/qw-oracle/scripts/extractors/qw/seeds/_patches/player_skin.yaml`):

```yaml
# Seed patch: player_skin (+ new gib_skin entry)
# Origin: asset-type-curate slice 2026-05-XX
# Promotion reason: schema-shape change -- new top-level asset_type entry proposed

player_skin.corpus_categories:
  old: ["Skins", "Skins / Player Model", "Skins / Gib"]
  new: ["Skins", "Skins / Player Model"]
  rationale: Skins / Gib corpus bundles map to distinct engine load paths; split proposed.

NEW_ENTRY.gib_skin:
  old: null
  new:
    asset_type: gib_skin
    description: Gib model replacement textures (body parts, heads, specific progs/ models).
    engine_canonical_paths: ["progs/<model>.mdl"]
    corpus_categories: ["Skins / Gib"]
    notes: |
      Engine loads as a replacement skin on the gib model's .mdl; same
      PCX/TGA/PNG format as player_skin but targeted at specific progs/ paths.
      Confirm enclosing-function routing in source before accepting split.
  rationale: Skins / Gib bundles target progs/ model paths distinct from player model paths; separate slug needed for accurate L1 routing.
```

The investigation.md for `player_skin` would have:

```
## Suggested seed deltas

Patch exceeds inline threshold (schema-shape change: new top-level asset_type proposed).
See: apps/qw-oracle/scripts/extractors/qw/seeds/_patches/player_skin.yaml
```

---

## Section 4 -- How the orchestrator applies deltas

The orchestrator reviews `## Suggested seed deltas` during the Phase 3 slice
triage walk. Accepted inline deltas are applied by the operator editing
`qw-asset-types.yaml` directly (find the field, update the value). Accepted
promoted patches are applied by the operator reading the `_patches/<slug>.yaml`
file and merging each proposed block into the seed by hand. Neither inline
deltas nor patch files are auto-applied -- they are authored proposals. The
derive pipeline (`derive_asset_types.py` -> `qw/output/qw-asset-types.json`)
is re-run after manual seed edits to propagate changes to downstream consumers.
