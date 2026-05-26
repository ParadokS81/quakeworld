# L1 extractor HUD dynamic-name family (Arc B)

**Status:** Parked, planned for after Arc A (the L1 extractor refinements mini-arc) ships.

**Genesis:** During the ezQuake help-JSON empty-entries audit, the HUD subsystem surfaced a class of cvars whose names are built at runtime: code takes a template (something like `hud_<element>_x`) and stitches it with HUD element names. The static extractor sees the template but doesn't fan it out into the actual cvar names. Net: some HUD cvars are missing from L1 or labeled less precisely than they should be.

## Scope: 1 item

### HUD dynamic-name fan-out (~1 day, possibly 2)

- libclang AST surgery to track template-string fan-out
- Already scoped as "Track B" two-track arc in the broader libclang two-track work (foundation + Track A reachability + Track B HUD recovery)
- Touches `apps/qw-oracle/scripts/extractors/ezquake/_handler_hud.py` and `_handler_hud_elements.py`; possibly extractor_lib shared foundation

## Why separate from Arc A

Different *shape* of work: AST surgery + template-string evaluation vs. small detector additions and a schema column. Bundling them would let HUD's longer timeline dominate the smaller wins in Arc A and make verification harder (changes coupled across unrelated subsystems).

## Cross-references

- Original parking doc: `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` (mentions HUD dynamic-name family being pulled OUT of the feeder INTO the libclang two-track arc -- Track B + shared foundation)
- Sibling Arc A: `docs/superpowers/parking/2026-05-27-l1-extractor-refinements-mini-arc.md`

## Exit criteria

- HUD cvars built from runtime templates are correctly enumerated in L1 (per-element fan-out emitted as distinct entities).
- F1 quality grid clean.
- arc-history entry written.
