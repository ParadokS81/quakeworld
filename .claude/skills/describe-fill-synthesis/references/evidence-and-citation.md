# Evidence requirement, citation mechanism, confabulation guard

The skill's Step 5 evidence rule and Step 4 confabulation guard reuse the
EXISTING qw-oracle citation mechanism. NO new citation/anchor format is
ever invented (P3; D6 says so explicitly). Where this file and
`decisions.md` / `SCHEMA.md` differ, those govern.

## The existing citation mechanism (reuse it; invent nothing)

Layer 1's source citation is the `source_file` + `source_line` pair (the
"source-location trio" in `SCHEMA.md`). The per-version snapshot tables
`cvar_versions` and `command_versions` already carry this pair and are
indexed for blame-style lookup:

- `cvar_versions` -- type-specific payload plus the shared
  `source_file` / `source_line` source-location pair.
  Index: `idx_cvar_versions_source ON (source_file, source_line)`.
- `command_versions` -- same shared `source_file` / `source_line` pair,
  same index family.

`SCHEMA.md` "source_ref discipline": every row that can carry a
`source_file` / `source_line` does. The D6 evidence requirement is exactly
this discipline applied to synthesized rows -- it is NOT a new format.

**The rule:** every `synthesized` row carries a `source_ref` expressed as
`source_file:source_line` PLUS the `anchor_version`. The `source_ref`
points at the AUTHORITATIVE read use-site -- the line that actually
exhibits the behavior the description claims (not merely the registration
site, unless the registration site is itself where the behavior is read).
The anchor version is the KTX/MVDSV dev-head version/commit the synthesis
was authored against (D2/D4 staleness anchor).

Do NOT introduce `cite:`, `@ref`, a URL form, a composite key, or any
bespoke shape. `source_file:source_line` + anchor, reusing the columns
above. This is the whole evidence format.

## The migration-014 description-provenance / decision-trail family

`SCHEMA.md` "Description-provenance family": `description` +
`description_origin` (migration 012) plus the seven migration-014 columns.
The skill's Step 6 record maps to these:

- `description` -- the owned Layer 1 text (adopted verbatim if affirmed,
  written from read use-sites if synthesized).
- `description_origin` -- the origin tag. Arc-scoped KTX/MVDSV
  configurable buckets write `source_inline` (affirmed) or `synthesized`.
  (The full column vocabulary is `{help_json, source_inline, inherited,
  synthesized, shipped_doc}`; this skill emits only `source_inline` /
  `synthesized`. `shipped_doc` is the Phase 2/4 mechanical-lift tag, not
  this skill's to set.)
- `description_anchor_version` -- the anchor for `synthesized` rows; NULL
  for affirmed `source_inline` rows (a `synthesized` row with NULL anchor
  is a C5 `synthesized_requires_anchor` probe failure -- never emit one).
- `description_rereview` -- D4 walk-time staleness flag. NOT set by this
  skill; the staleness walk owns it. Left at its default.
- `description_provenance` -- D11 retained multi-source provenance: a JSON
  array, one object per contributing shipped file
  `{source_file, source_line, shipped_value, raw_comment}` (a later phase
  additively widens with optional `structured_choices`; JSONB is
  schemaless). Bind as a JS value, NEVER pre-stringified (P2 -- pre-
  stringifying stores a JSONB string scalar, the legacy TEXT bug).
- `description_verdict` -- the skill's verdict enum value (`affirmed` /
  `synthesized` / `dead_stamped` / `hedged` / `residue_routed`).
- `description_confidence` -- `high` / `medium` / `low`.
- `description_reasoning` -- the Step 3/5 grading + grounding rationale,
  including any C2 conflict note. STORED, not just logged (D11: "we want
  the reasoning so we can review it").
- `description_proposed` -- the proposed text the D7 independent reviewer
  re-checks against the cited `source_ref`.

This skill emits the record. The consuming phase persists it (binding
JSONB as JS values, P2). The D7 two-tier gate (a separate task / separate
invocation) re-checks every `synthesized` row's `source_ref` before commit.

## The hard confabulation guard (Step 4)

If a knob's behavior is NOT legible from source even at Opus-4.7-MAX
reasoning:

- Do NOT guess. Do NOT infer behavior from the knob's name (name-only
  synthesis is forbidden at Step 1).
- Either (a) write a HEDGED description that states ONLY what IS source-
  legible and explicitly marks the unknown part as not-source-legible
  (verdict `hedged`); or (b) route to the C1 residue / community-outreach
  track (verdict `residue_routed`) -- see
  `c3-dead-stamp-and-residue.md`.
- Even a hedged row carries a `source_ref` (the legible part's use-site)
  + anchor. A residue row carries the registration-site `source_ref` +
  anchor so it is still a complete, traceable row (C1: tracked, never
  dropped).

The research landscape docs
(`docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape/`) are
admissible AIDS to locate use-sites and corroborate (D6/D7 amendment).
They are NOT a substitute citation: source stays ground truth, and the
committed `source_ref` file:line + anchor remain the evidence on the row
(source-truth dichotomy). A research doc never appears as the `source_ref`.
