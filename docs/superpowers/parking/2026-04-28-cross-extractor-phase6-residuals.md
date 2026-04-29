# Cross-extractor Phase 6 residuals

**Added:** 2026-04-28. **Status:** Open follow-ups from the Phase 6 arc.

Three items defined out-of-scope by the Phase 6 spec but worth tracking so they don't get lost.

### D.1.8 lifecycle hooks gap (restate)

FTE `_handler_commands.py`, `_handler_macros.py`, `_handler_cmdline.py` and MVDSV `_handler_commands.py` do not implement `enter_function` / `exit_function` Visitor lifecycle hooks. Result: `enclosing_function` and `registration_file` columns are NULL on those rows. Already tracked under "Cross-extractor pattern audit follow-up arc -- Original 13 audit-deferred residuals." The Phase 6 spec restates it for visibility because the missing-hook surface intersects with the per-handler routing audit table the arc actually used. Per-arc fix would lift Visitor's lifecycle hooks across the missing handlers; deferred from Phase 6.

### Broader positive-contract coverage

The Phase 6 runbook 3.2.2 contract gates only on `flags_raw` for `source_state='source_backed'` cvars in `project IN ('ezquake', 'fte', 'mvdsv')`. Other fields with similar lift/contract gaps that may need positive contracts in future arcs:

- `default_value` C-escape interpretation across all four projects (post-v17 unescape contract; today gated only by hand-spot-check).
- `info_key` canonical name shape (`<bare>:<scope>` post-v17; today gated by `validInfoKey` carve-out).
- `qc_builtin` canonical name shape (`<bare>:<table>` post-v18 reshape).
- `handler_fn` shape across cvars + commands + macros (today carries no positive contract).
- Description fields (cvars, commands, macros, hud_elements; today carry no shape gate).
- QWCL `flags_raw` shape (lowercase boolean field values) -- distinct from the post-v17 CVAR_* contract (and from the ezquake legacy boolean shape captured in the next entry).

See `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` Section 3.2 candidate-positive-contracts list (kept in sync with this entry).

### Deep-time-walk re-extract obligation (FTE + QWCL)

FTE today has only `build-6698`; QWCL only `2.33`. A future deep-time walk on either project must re-extract under post-Phase-6 handlers (otherwise pre-Phase-6 historical versions would carry wrong-shape `flags_raw` the prior arc would have emitted). The obligation activates when a multi-version walk is scheduled; until then this entry just records the constraint so it's not forgotten at scheduling time. (The companion ezquake-specific obligation -- 14 already-loaded historical tags need re-extract -- is captured separately in the ezquake-exemptions entry below.)

---
