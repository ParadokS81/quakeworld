# L1 extractor refinements mini-arc (Arc A)

**Status:** CLOSED 2026-05-27. Item 1 shipped (commit `c91c5ece`); Items 2-3 verified as mostly-no-op (premises were stale / framework-already-handles-it). One residual extractor framework finding for `-enablelocalcommand` parked separately.

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

### Item 3 -- `.h`-aware liveness (MOSTLY VERIFIED NO-OP + 1 residual, 2026-05-27)

- **Premise was off:** the F20 finding ("5 of 11 shipped Track-A entries were FALSE POSITIVES via `.h` macro wrappers") was assumed to mean 5 currently-mislabeled L1 entities. Empirical check found that 4 of the 5 are already correctly detected by the current `_handler_cmdline.py` via libclang macro-expansion:
  - `-cheats`: usage_count=1 (sv_ccmds.c, client variant) -- macro `SV_CommandLineEnableCheats()` resolves
  - `-progtype`: usage_count=1 (pr2_exec.c) -- macro `SV_CommandLineProgTypeArgument()` resolves
  - `-r-debug`: usage_count=166 across 9 GL files -- GL wrapper macros resolve cleanly
  - `-democache`: usage_count=2 (cl_demo.c + sv_demo.c)
- **`_CLASS3_BLOCK` is editorial markdown, not a "block-list":** it's the verbatim Class-3 section of `apps/qw-oracle/docs/upstream-prs/ezquake-runtime-dead-entities.md`, hand-corrected to the 4 verified-dead entries. There's no runtime block-list to remove.
- **1 residual case** parked separately: `-enablelocalcommand` still has usage_count=0 because its only consumer site (`sv_ccmds.c:1861`, gated by `#ifdef SERVERONLY`) is in the server-variant build path, and the cmdline handler's AST output contains zero server-variant findings (all 307 detected sites are client-variant). The dedup mechanism around `_seen_locations` + `walk_tu_dispatch`'s target-file filter is the likely cause -- root-cause analysis requires deeper extractor framework investigation. Captured as HANDOVER followup; sized ~1-3h for a focused fix once the framework behavior is understood.
- **No code work in this arc.** Findings recorded in the arc-history entry.

**Total estimated time:** originally 8-13h across 3 sessions; actual ~1.5h total (Item 1 shipped + Items 2-3 verified mostly-no-op).

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
- Sibling Arc B (HUD): `docs/superpowers/parking/2026-05-27-l1-extractor-hud-dynamic-names.md` -- **also CLOSED 2026-05-27 (verified no-op)**: the HUD dynamic-name cvar family was already shipped via `_handler_cvars.py`'s `HUD_Register` synthesis (1,463 hud_* cvars in L1, 87 distinct elements), and the HUD command half was shipped via Track-B of the enforce-L1-runtime-truth arc on 2026-05-19. The Arc B parking doc was created on stale premise; same lesson as Items 2-3 here.

## Exit criteria (closure 2026-05-27)

- [x] Item 1 shipped: 37 ezQuake legacy aliases populated at HEAD; F1 clean post prune-cross-type-orphans.
- [x] Item 2 verified: 11/11 bare-call sites correctly detected; HANDOVER 128 pruned.
- [x] Item 3 verified mostly-no-op: 4/5 F20 cases already correctly detected by libclang macro-expansion; `_CLASS3_BLOCK` is editorial (not a block-list, nothing to remove); 1 residual (`-enablelocalcommand`) parked to HANDOVER for a focused future session.
- [x] arc-history entry to be written summarizing all 3 items + the scope-shift findings.

## Lessons learned

- **HANDOVER findings can decay rapidly.** Item 2's premise was stale because an earlier arc closed the gap; Item 3's premise overstated the scope (5 entities claimed, only 1 actually wrong). Re-verify HANDOVER claims against current source before scoping work.
- **Investigation can beat implementation in time-to-value.** ~30 min of investigation closed two of three items as no-ops; the work avoided was ~10h of estimated implementation.
- **"Block-list" framing was misleading.** The `_CLASS3_BLOCK` was editorial markdown for the PR digest, not a runtime override mechanism. Reading the actual code structure before scoping work would have caught this earlier.
