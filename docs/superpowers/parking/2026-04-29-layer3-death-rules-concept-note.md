# Layer 3 concept note: death rules

**Added:** unknown (HANDOVER index reference orphaned — no body section migrated; entry surfaced during 2026-04-29 docs-system-redesign migration as an index-only reference at HANDOVER:27 with cross-reference at HANDOVER:1104)
**Status:** Future arc. Stub. Captured intent only — no detail to migrate.
**Verification first:** `grep -rn "death rules" apps/qw-oracle/concept-notes/` — currently no concept note exists. `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT name FROM entities WHERE project='qw' AND type='gameplay_mechanic' AND name LIKE '%death%'"` returns the death-rule mechanic rows that the eventual concept note would synthesize against.

### Intent

Author a Layer 3 concept note covering QuakeWorld death rules — the death_rules mechanic-kind in the `qw` namespace's `gameplay_mechanics` table, plus KTX gameplay overrides (when those land), plus community testimony about edge cases.

### Three-anchor synthesis

The note follows the R7 authority-grounding triad established by `concept-notes/weapon-scripts.md` (2026-04-24):

1. **Source truth** — id1 baseline death rules from `gameplay_mechanics` (telefrag, exit_level_kill, suicide, lava/slime/void hazards, etc.) plus KTX overrides when arc 2c ships.
2. **Observed behavior** — verifiable from demos and the simulator.
3. **Community testimony** — chat corpus references, known edge cases.

### Gated on

KTX gameplay overrides (qw-oracle arc 2c). Until KTX is loaded, the death-rules picture is incomplete (id1 baseline is loaded; KTX modifies it).

### Pressure

Low. Future arc; no consumer demand today. Authoring waits until KTX overrides land.

### Related

- HANDOVER index reference (orphaned, now indexed via this parking file)
- `apps/qw-oracle/concept-notes/README.md` — entry template + 6 recognized shapes
- `apps/qw-oracle/concept-notes/OPERATIONS.md` — stewardship playbook
- `apps/qw-oracle/concept-notes/weapon-scripts.md` — R7 authority-grounding exemplar to model against
- Related parking file: `2026-XX-XX-qw-event-log-cross-validation.md` (`qw_event_log` validation harness — adjacent track)
