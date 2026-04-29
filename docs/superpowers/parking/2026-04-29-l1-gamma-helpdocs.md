# L1-gamma: Engine helpdoc / data-file recognition (2026-04-29)

**Added:** 2026-04-29 (Pass 3 carry-forward from Slipgate Managed Mode brainstorm).
**Pressure:** Medium. None of the four L1 expansion tracks gate Slipgate Managed Mode V1.

**Scope (from Pass 3 ratifications doc):**

Extend Phase 2d-bundle output. New roles in the asset-roles registry:

- `engine-asset:helpdoc-schema`
- `engine-asset:helpdoc-content`
- `engine-asset:engine-meta`

Path-pattern + extension rules in `path_rules` / `extensions` covering `<engine.pk3>/help/**`, `<engine-dir>/*.xsd`, ezQuake JSON helpdocs, and similar engine-bundled data files.

**Implementation shape:** seed-YAML additions for the new roles + extension/path-rule rows + classifier consumption updates. Adjacent to Phase 2d-bundle infrastructure; minimal new tooling.

**Why this exists:** ezQuake JSON helpdocs and similar engine-bundled metadata files appear in the operator's "other" bucket because Phase 2d-bundle's existing roles only cover user-facing assets (textures / sounds / configs / etc.), not engine-internal documentation or schema files.

**Source for scope and methodology:** `docs/superpowers/specs/2026-04-29-slipgate-managed-mode-pass3-ratifications.md` -- "Carry-forwards -- L1 expansion strategy."

---
