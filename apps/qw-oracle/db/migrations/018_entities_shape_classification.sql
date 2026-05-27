-- 018_entities_shape_classification.sql
-- Adds shape_classification to entities. Captures the Layer B KTX shape
-- catalog typology (Shape 1 toggle / Shape 4 gate / Shape 7 election / etc.)
-- earned by the KTX L1 chunked-mode dispatch arc (2026-05-23 .. 2026-05-27).
--
-- Same pattern as 012 description_origin: free TEXT, vocabulary enforced
-- by an F1 probe rather than a CHECK constraint, so future shape additions
-- and per-engine forks don't require a CHECK-rebuild migration.
--
-- Format convention (mirrors canonical_id):
--   - Atomic shape: `shape_<id>` (e.g. `shape_1`, `shape_7b`, `shape_9a`)
--   - Compositions: pipe-separated, sorted (e.g. `shape_1|shape_4`)
--   - Shape-less:   `shape-less` or `shape-less:<variant>`
--                   (variants: `lever_for_shape_<id>`, `leaf_of_shape_<id>`)
--
-- First writer: apps/qw-oracle/scripts/apply-ktx-l1-recasts.ts (Phase 1
-- of the KTX L1 apply pass, 2026-05-28). KTX-scoped initially; future
-- MVDSV/QWFWD/QTV forks of the per-card skill will re-use the column with
-- their own catalogs.
--
-- Spec: docs/superpowers/parking/2026-05-28-ktx-l1-apply-pass-runbook.md

ALTER TABLE entities
  ADD COLUMN shape_classification TEXT;

COMMENT ON COLUMN entities.shape_classification IS
  'Layer B shape typology per the KTX L1 rewrite catalog. Free TEXT; vocabulary enforced by F1 probe. Atomic: shape_<id>; compositions: pipe-separated sorted; shape-less: shape-less or shape-less:<variant>.';
