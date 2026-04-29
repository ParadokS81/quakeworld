# Retired cvars in snapshot + stale-config warning UX

**Added:** 2026-04-26 (after build-snapshot CLI shipped 2026-04-25; default_history numeric-equality fix shipped 2026-04-26 commit `9917002`).
**Updated:** 2026-04-26 evening -- Quake Dir Control plan Phase 4 (`docs/superpowers/plans/2026-04-26-quake-dir-control.md`) now covers the producer-side retired-entity emission (across all 4 entity types, not just cvars). Phase 5 covers the diff-viewer consumer; the "stale-config warning UX in ConfigViewer" piece is still its own arc and stays open here.
**Status:** Producer change scoped + tiny, will land in Phase 4 of the Quake Dir Control plan; gated on consumer-side UX design for the ConfigViewer warning. Defer the UX half until the stale-warning feature is being designed in slipgate.
**Verification first:** `python3 -c "import json; v=json.load(open('apps/slipgate-app/src/lib/config/data/ezquake-variables.json'))['vars']; print(sum(1 for o in v.values() if o.get('source_state')=='source_retired'))"` -- currently `0`. When this returns `>0`, the producer side has shipped and consumer wiring is the remaining work.

### What's missing

The current `build-snapshot` CLI emits one row per entity present at the project's head version. Retired cvars (DB rows with `source_state='source_retired'` -- alive in older versions, removed before head) are silently dropped from the snapshot.

Today's ezQuake retired set (5 cvars): `cl_showkeycodes`, `gl_smoothfont`, `keymap_name`, `r_fx_geometry`, `scr_printspeed`. Each was alive in v3.0 through 3.6.2 and removed in 3.6.5+. Slipgate's loader returns `undefined` for these names today.

### Use case it blocks

A user opens a 2018-era config in ConfigViewer. The config has `keymap_name "us"`. Slipgate's lookup -> not found -> falls back to "unknown cvar" treatment (yellow warning, treated as either user-defined `set` variable or noise).

The truthful behavior is: "this cvar was removed in ezQuake 3.6.5; safe to delete." Same applies to FTE converter -- it should know "this isn't a bug, this is a removal -- translate to nearest equivalent or flag for the user." Same applies to FTE/MVDSV/KTX walks once they ship deep-time (the retired set will grow as more codebases get loaded).

### Why it's coupled work, not a producer-side one-liner

**Producer side (~30 min):** widen `build-snapshot.ts` to emit retired cvars too, marked with `source_state: "source_retired"` and `last_seen_version`. Snapshot grows by ~5 entries today, more when other codebases ship.

**Consumer side (slipgate, ~1-2 hours of UI design + wiring):**
- `loaders/ezquake.ts` `loadEzQuakeCvars` filter: today it loads everything in the JSON; needs to either filter retired cvars to a separate map or include them with a marker the UI consults
- `CvarRow.tsx` / `CvarTooltip.tsx`: new visual state for "retired in 3.6.5" -- different from "doc_only" (no source citation found) and from "unknown" (not in DB at all)
- `ConfigConverter.tsx`: retired cvars need their own status bucket (not "transferred", not "no equivalent" -- "removed upstream, drop or migrate")
- Copy + visual design: how loud is the warning, what does the suggestion read

The right time to do all this is when the stale-config-warning UX is on the design table, not as a speculative one-off.

### Pressure

Low. Five cvars affected today; nobody has hit the use case in practice. Worth doing when slipgate's "open old config and tell me what's stale" feature gets prioritized.

### Related

- Producer: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`
- Consumer: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` + `src/components/CvarRow.tsx`, `CvarTooltip.tsx`, `ConfigConverter.tsx`
- DB query: `SELECT name, first_seen_version, last_seen_version FROM entities WHERE project='ezquake' AND type='cvar' AND source_state='source_retired'`
- Sibling shipped fix: `default_history` numeric-equality (commit `9917002`, 2026-04-26) -- phantom transitions on cvars like `cl_bonusflash` no longer surface

---
