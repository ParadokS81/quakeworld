# Handover

Dynamic backlog of deferred items from prior wrap-up sessions. Entries get added during the `docs-check` skill's Step 7.5 triage when a finding is judgment-heavy or substantial enough that addressing it inline would bloat the current session. Entries get **deleted** (not struck through) when resolved.

This file is referenced from `MEMORY.md` so every new session sees the open-items count at context load. Memory is for durable facts; this file is for todo state. Do not move entries back into memory when they age — either resolve them or leave them here.

**How to work an item:** pick one from the Open items index below, find its section in this file, verify the described state still matches reality (code changes quickly, handover notes can rot), then address it. When done, delete both the index line AND the section. Do not leave resolved items struck through.

## Open items

- [slipgate-app: Binds section multi-path lookup gap](#slipgate-app-binds-section-multi-path-lookup-gap) — `categorizeBinds` drops secondary FiringPath rows for hybrid weapon keys. Needs a design call before implementation.

---

## slipgate-app: Binds section multi-path lookup gap

**Added:** 2026-04-14 (migrated from memory file `project_slipgate_binds_section_multipath.md` on the same date — should have been migrated during the 2026-04-14 wrap-up but was prose-deferred instead)
**Status:** pending, design call required before implementation
**Verification first:** open `apps/slipgate-app/src/components/configMerger.ts` and grep for `categorizeBinds`. Confirm the `Map<string, FiringPath>` shape is still there and still keyed by `trigger_key.toUpperCase()`. If it has already become a `Map<string, FiringPath[]>`, the issue is resolved and this entry can be deleted.

### The bug

`categorizeBinds` in `configMerger.ts` uses `Map<string, FiringPath>` keyed by `trigger_key.toUpperCase()`. For hybrid weapon keys that emit multiple paths (e.g., ParadokS's C key producing both a Quickfire SSG and a Manual-Select SSG via persistent mouse1 rebind), all but the last path are silently dropped by the map-set overwrite. The Settings > Binds section then shows only one row per key even when the classifier emitted several.

### Why it exists

The weapon classifier v2 rewrite (branch `feature/qw-config`) landed a flat-list `FiringPath[]` model that allows multiple paths per weapon. The two primary consumers were updated to render all paths: `WeaponBindViz` (Profile tab, which now collapses to one via `pickPrimaryPath` by design) and `ConfigWeaponBindsSection` (Config Viewer, which renders all of them pair-by-identity). `categorizeBinds` was the third consumer and was missed. It still assumes one-to-one key -> weapon.

### The two fix options (needs a design call)

1. **Switch the lookup to `Map<string, FiringPath[]>`** and have the Binds section render multiple rows per key when there are multiple paths. Preserves the Binds section as a full view over all classifier output. More code, larger diff.
2. **Remove weapon classification from the Binds section entirely.** Let the Config Viewer's "Weapons Binds" domain section be the single source of truth for weapon display, and have the Settings Binds section show binds in a flat, raw-ish form without per-weapon grouping. Smaller diff, cleaner separation of concerns.

Option 2 is likely the cleaner call — the Binds section is meant to be a neutral "here's what's in your config" view, and having it duplicate the Weapons domain logic is the kind of drift that causes the two views to disagree over time. But the user should decide.

### Related

- Design spec: `docs/superpowers/specs/2026-04-13-weapon-classifier-v2-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-13-weapon-classifier-v2.md`
- Was flagged in the final code review of the weapon-classifier v2 branch (Important Issue I1, Task 22 wrap-up) and then miscategorized as memory.
