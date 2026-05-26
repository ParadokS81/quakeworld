# L1 extractor refinements mini-arc (Arc A)

**Status:** Active, started 2026-05-27 immediately after ezQuake help-JSON empty-entries audit closure (PR #1131).

**Genesis:** During the audit, three extractor-side gaps were surfaced as side-findings (parking doc `2026-05-15-l1-extractor-entity-classification-followups.md` consolidates them). They're not blocking, but baking them in now means future ezquake version walks surface these patterns automatically instead of needing manual re-discovery.

## Scope: 3 items

### Item 1 -- `Cmd_AddLegacyCommand` persistence (~2-4h)

- Extractor already emits `legacy_alias_of` in the AST entry (both ezQuake `_handler_commands.py:234-252` and FTE `_handler_commands.py:112-126`).
- **Gap:** the loader drops it for lack of a storage column on `command_versions`.
- **Fix:** schema column (migration 017) + `CommandVersionRow` type + `buildCommandVersionRow` + `upsertCommandVersion`. Optional SCHEMA.md note.

### Item 2 -- bare `COM_CheckParm` detection (VERIFIED NO-OP, 2026-05-27)

- HANDOVER 128's claim ("extractor only recognizes `CMDLINE_DEF(...)` macros, bare-call params silently become doc_only") is **stale**.
- Current `_handler_cmdline.py` already detects bare-call sites via the literal-string fallback at line 122 and emits them as `undeclared_source_only` entries with non-null AST blocks.
- Verified post-extract-tag against ezQuake HEAD: all 11 bare-call sites in source (`COM_CheckParm("-cdaudio")`, `COM_CheckParm("-cheats")`, `COM_CheckParm("-d")`, `COM_CheckParm("-democache")`, `COM_CheckParm("-enablelocalcommand")`, `COM_CheckParm("-heapsize")`, `COM_CheckParm("-mem")`, `COM_CheckParm("-minmemory")`, `COM_CheckParm("-noerrormsgbox")`, `COM_CheckParm("-nohwtimer")`, `COM_CheckParm("-progtype")`) are stored as `source_backed` (10) or `source_retired` (1: `-nomouse`, removed from source).
- Extractor stats confirm: `source_only_undeclared=3` -- the 3 bare-call params not in `cmdline_params_ids.h` manifest are still emitted correctly.
- The handler was likely upgraded during an earlier arc between when the HANDOVER finding was logged and now.
- **No code work required.** HANDOVER 128 is retracted in this arc's commit.

### Item 3 -- `.h`-aware liveness (~4-6h)

- Cmdline-consumer-presence detector scans `.c` files only.
- **Gap:** params kept alive by `.h`-macro wrappers fanning into `.c` call sites get mislabeled "dead". F20 tactical workaround at `_runtime_dead_entities.py:_CLASS3_BLOCK` covers the 5 currently-known cases via a manual block-list.
- **Fix:** extend the liveness detector to follow `.h` macro definitions back to their `.c` callsites. Remove `_CLASS3_BLOCK` block-list after the principled detection lands.

**Total estimated time:** 8-13h across (likely) 3 focused sessions.

## Sequencing

Smallest / most contained first to ship momentum:

1. **Item 1** -- Cmd_AddLegacyCommand persistence (no extractor logic change; just plumbing)
2. **Item 2** -- bare COM_CheckParm detection (extractor pattern addition)
3. **Item 3** -- `.h`-aware liveness (most complex; cross-file scanning)

## Shape: lightweight, not full arc-planner scaffold

Session-shaped tasks. No per-phase MDs, no formal review checkpoints, no executor terminals. Direct work in fresh sessions with run-extractor-verify-commit cadence. Each item ships its own commit (or small commit cluster); arc-history entry written when all 3 land.

## Cross-references

- Original parking doc: `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md` (Command pass section, F20 finding)
- Sibling parking docs (may eventually consolidate, low pressure):
  - `docs/superpowers/parking/2026-05-13-l1-extractor-asset-loader-enhancements.md`
  - `docs/superpowers/parking/2026-05-14-l1-extractor-refinement-arc.md`
- Audit closure: `apps/qw-oracle/docs/arc-history.md` (2026-05-26 ezquake cmdline_params entry)
- Sibling Arc B (HUD): `docs/superpowers/parking/2026-05-27-l1-extractor-hud-dynamic-names.md`

## Exit criteria

- All 3 items shipped and verified (column populated / new params detected / liveness reclassifications applied).
- F1 quality grid clean post-each-item.
- Tactical workaround `_CLASS3_BLOCK` block-list removed at the end of Item 3 (no longer needed).
- arc-history entry written summarizing the arc.
