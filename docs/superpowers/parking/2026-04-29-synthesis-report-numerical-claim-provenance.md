# Synthesis-report numerical-claim provenance gap

Extracted from quakeworld HANDOVER.md (pre-migration, lines 130-148) at the chunk-6 W17 migration, 2026-08-11. Filename dated to the content's own origin (2026-04-29), not the migration date.

**Added:** 2026-04-29. **Status:** Open. Process-improvement note for future validation arcs.

Validation reports authored 2026-04-28 (synthesis report at `docs/superpowers/reviews/2026-04-28-per-project-validation-synthesis.md` plus per-project deep-validation reports) contain numerical claims (e.g., "230 trailing_comments", "2989 cvars at HEAD") with no preserved SQL. The numbers did not match live DB at the moment of writing during the 2026-04-29 zero-debt arc, costing ~90 minutes reconciling irreproducible figures.

## Process improvement

Future validation reports must inline the SQL (or other reproducible derivation) for every numerical claim, as a comment block in the report itself. Three formats are acceptable:

1. Inline ` ```sql ... ``` ` block immediately after the claim.
2. Footnote-style citation pointing at a script file checked into the repo with the report.
3. A "queries" appendix section at the bottom of the report listing every claim and its derivation.

Without this, downstream readers can't distinguish "stale snapshot at write-time" from "extractor regression since write-time" from "writer arithmetic error."

## Pressure

Low; aspirational rule for future arcs. No retroactive fix planned for the 2026-04-28 reports -- rather, calibrate the next validation pass against this rule.
