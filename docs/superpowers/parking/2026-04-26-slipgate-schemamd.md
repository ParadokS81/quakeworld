# Slipgate SCHEMA.md for snapshot consumer interface

**Added:** 2026-04-26 (after qw-config Half 2a + Arc 2 wrap-up).
**Status:** Deferred. Low-pressure observation, not blocking anything.
**Verification first:** `ls apps/slipgate-app/docs/SCHEMA.md 2>&1` should fail (file doesn't exist). `grep -n "interface RawVar" apps/slipgate-app/src/lib/config/loaders/ezquake.ts` should still surface the inline type. If either flips, this entry has been acted on.

### What's missing

Slipgate's `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` defines the consumer-side TypeScript interfaces (`RawVar`, `RawGroup`, `RawCommand`, `RawMacro`, `RawCmdlineParam`, `RawDefault`, etc.) that decode the JSON snapshots from oracle. They live inline in the loader file -- fine while the schema is small and single-file.

The producer side (oracle) has `apps/qw-oracle/docs/entity-types.md` documenting the shape from the producing perspective. Slipgate has no equivalent doc on the consuming side.

### When this becomes worth fixing

When the next UI arc lands -- surfacing the new enrichment fields (`source_state`, `first_seen_version`, `last_seen_version`, `default_history`) as visible UI elements (badges, pills, timelines). That arc will fan the type definitions out across multiple components and a SCHEMA.md becomes the natural single-contract doc. Until then, inline types are sufficient.

### Pressure

Low. Mode 1 trigger Q1 (durable data model) fires technically, but the schema is genuinely small and single-file today. Add SCHEMA.md when the inline types start to fragment.

### Related

- Producer-side equivalent: `apps/qw-oracle/docs/entity-types.md`
- Consumer types: `apps/slipgate-app/src/lib/config/loaders/ezquake.ts` (and siblings: `fte.ts`, `qwcl.ts`, `domains.ts`, `ktx.ts`)
- Snapshot files: `apps/slipgate-app/src/lib/config/data/*.json`

---
