# QW Oracle Game-Mechanics Layer 1 - id1 Baseline (Arc 1, v4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Pre-plan + primary-source inventory:** `apps/qw-oracle/docs/game-mechanics-preplan.md` (Appendix A is the literal source for the YAML; Appendix B drives Arc 2 and is referenced by the schema-fitness spike in Task 0). Citation fixes from the v1 review are now applied to Appendix A.
>
> **Git workflow override:** Per repo CLAUDE.md, no worktree creation, no PR ceremony. Commit to `main` directly after each task. Run all git operations silently.
>
> **What changed vs v3 (after third review):**
> - **Death rules split:** v3's single `telefrag` row at `client.qc:230` was conflating two distinct 50000-damage mechanics. Real telefrag (teleport-overlap) lives in `triggers.qc` -- re-cited to `triggers.qc:334` with full teledeath/teledeath2/teledeath3 obit dispatch. The `client.qc:230` mechanism is the samelevel/noexit changelevel kill (what kills you on e1m2's end teleporter in 4on4); split out as new `exit_level_kill` row. death_rules count 6 -> 7.
> - **Env_hazard added: `trigger_hurt`** at `triggers.qc:548-572`. Mapper-controlled `dmg` field (default 5, but typically 1000+ on void brushes); retriggers every 1s; armor + pent DO apply (unlike telefrag/exit_level_kill which use 50000 to overwhelm). This is the void-brush mechanism on most maps. env_hazards count 6 -> 7.
> - **Mechanics total bump: 39 -> 41. Grand total 76 -> 78.** Cascading updates to Task 14 grand-total verification, Task 16 expectedMechanics + step 5/6/7 outputs, Task 23 expected counts, Task 24 verify-gameplay assertions, Task 25 OVERVIEW.md/CLAUDE.md/e2e-verify.md content.
> - **NG refire citation made consistent with SNG:** v3 cited NG refire at `player.qc:190` while SNG was at `weapons.qc:726`. Both fire functions set `attack_finished` (NG: `weapons.qc:759` inside W_FireSpikes; SNG: `weapons.qc:726` inside W_FireSuperSpikes), and both player frames re-set it after. Citation moved to `weapons.qc:759` for parity. Misleading "not weapons.qc" note dropped.
> - **Task 22 expanded to 10 files (was 6).** v3's centralization fixed 6 existing tools but left the 4 new ones (Tasks 17-20 outputs) with inline `const SERVER_VERSION = '0.4.0';` literals -- drift waiting to happen. Task 22 step 4 now backfills all 10 files; step 7 commit message bumped to "12 drift sites -> 1".
> - **Task 24 fixes pre-existing broken assertion in verify-rewrite.ts:38** (`tools.tools.length === 4` was correct at v0.2.0 but the maps PR brought count to 6, and Task 21 brings it to 10). Step 3 explicitly bumps the literal to `=== 10` before adding the new client.callTool blocks.
> - **Self-review checklist updated:** stale "LG refire_source_ref (weapons.qc:1057)" -> 1056; added v4 fixes to the propagated-citations list.
> - **HANDOVER seed:** death-rules concept note (Layer 3) candidate, deferred until Layer 1 rows ship and corpus search has material.
>
> **What changed vs v2 (after second review):**
> - 7 citation regressions fixed: NG refire `weapons.qc:190` -> `player.qc:190` (refire is in player.qc); GL refire `weapons.qc:1046` -> `weapons.qc:1045`; LG refire `weapons.qc:1057` -> `weapons.qc:1056`; squish `client.qc:1268` -> `plats.qc:114` (with check-site annotated); quad multiplier `combat.qc:127` -> `combat.qc:130` (the multiply line, not the if-check); DM4 axe gate `client.qc:527` -> `client.qc:525`; deathtype enum dropped non-existent `ax`, added `laser` (misc.qc:319), confirmed no `grenade` deathtype.
> - CLI dispatcher snippet rewritten to match actual `if (subcommand === 'X') { await runX(rest); return; }` chain (NOT a switch); help text uses two-line subcommand+description format.
> - Four new MCP tools include `meta: { tool, server_version, queried_at }` block in every response, matching the existing-tool convention.
> - Task 22 expanded: centralizes SERVER_VERSION into a new `serve/mcp/src/version.ts` and backfills the 6 existing tool files (eliminating 8-site version drift), in addition to bumping package.json + Server constructor.
> - Task 23's emitGameplay reuses the existing `writeJson(path, content, count)` helper from build-snapshot.ts:556 instead of rolling its own writeFileSync.
> - Task 24 split into two-tier verify: Tier 1 in-process (`verify-gameplay.ts` for data correctness) + Tier 2 subprocess-driven (extending `verify-rewrite.ts` with `client.callTool` per new tool to exercise the dispatcher wiring).
>
> **What changed vs v1 (first review):**
> - Schema tables drop the `qw_` prefix (use `gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`) to match the existing `maps` table precedent.
> - `ruleset_variant TEXT` becomes `ruleset_gate_json TEXT NOT NULL DEFAULT '{}'`. Compound KTX gates (yawnmode AND dmm3) encode as JSON. The `NOT NULL DEFAULT '{}'` fixes the v1 NULL-in-UNIQUE upsert idempotency bug.
> - 5 ENGINE-source-ref constant rows (`sv_maxspeed`, `sv_accelerate`, `sv_friction`, `sv_stopspeed`, `sv_edgefriction`) are dropped from arc 1. They belong in the cvar track per the pre-plan.
> - Task 0 added: KTX schema-fitness spike before schema commits.
> - Tasks 19 + 20 added: `search-gameplay-entities` + `search-mechanics` MCP tools, matching the `lookup_map`/`search_maps` precedent.
> - Task 6 (items) split into Tasks 6a-6f.
> - Schema-add pattern fixed: new `SCHEMA_V14_ADDITIONS_SQL` constant + appended `db.exec(...)` in `applySchema`, mirroring `SCHEMA_V13_ADDITIONS_SQL`.
> - Loader signature changed to take an existing `db` handle (`loadGameplayFromFile(db, yamlPath)`), opening via `openKnowledgeDb()` in the CLI. Result shape is `{inserted, updated, total}` per `load-maps.ts` precedent.
> - MCP tools rewritten to use `bun:sqlite` + `db.query(...)` + kebab-case filenames + camelCase exported functions + inline tool literals registered in `index.ts`, matching the existing pattern.
> - Citation fixes (7 from review): `gib_threshold` -> `player.qc:598`; `spawn_invul_default` -> `client.qc:471`; `start_weapon_default secondary` -> `client.qc:69`; DM4 255-ammo gated by `infokey(world,"axe")==0`; megahealth respawn annotated as decay-cycle; `health_15_rotten cap_source_ref` -> `items.qc:217`; LG `refire_source_ref` added (`weapons.qc:1057`).

**Goal:** Ship id1 baseline game-mechanics knowledge into qw-oracle Layer 1. Schema v14 adds three flat tables (`gameplay_sources`, `gameplay_entity_defs`, `gameplay_mechanics`). One hand-curated YAML at `scripts/extractors/qw/seeds/id1-gameplay.yaml` carries every weapon, projectile, item pickup, and mechanic from canonical id1 QuakeWorld QC. A small TypeScript loader hydrates the tables. Four new MCP tools (`lookup_gameplay_entity`, `lookup_mechanic`, `search_gameplay_entities`, `search_mechanics`) expose the data. Slipgate consumes via a new snapshot file.

**Architecture:** Mirrors the `qw.maps` pattern shipped 2026-04-27 - flat tables outside the `entities`/per-version model. Polymorphic `kind` discriminator, indexed numeric columns for the common filterable surface, JSON props for kind-specific fields. id1 baseline is the only `gameplay_source_id` populated in this arc. KTX overrides land in Arc 2 with no schema changes (the schema-fitness spike in Task 0 confirms this before v14 commits).

**Tech Stack:** TypeScript + Node-via-tsx for the loader (uses better-sqlite3 via `openKnowledgeDb()`); js-yaml for seed parsing; bun + `bun:sqlite` for the MCP server (separate binding because the native better-sqlite3 module does not load under Bun).

**Final row counts (stop-condition gate):** 37 entities (8 weapons + 4 projectiles + 25 items) + 41 mechanics (2 constants + 7 env_hazards + 12 player_stats + 3 powerup_behaviors + 1 armor_model + 7 death_rules + 5 spawn_rules + 4 dm_mode_rules) = **78 total rows** loaded into the live `data/knowledge.db`. Re-runs of `load-gameplay` must produce identical counts (idempotency).

---

## Pre-flight (do this once before Task 0)

- [ ] **Read the source-of-truth docs.** Open and skim:
  - `apps/qw-oracle/docs/game-mechanics-preplan.md` (entire file - locked decisions + Appendix A inventory + Appendix B KTX surface)
  - `apps/qw-oracle/CLAUDE.md` (oracle conventions, especially the schema-evolution rule and the always-on rules)
  - `apps/qw-oracle/scripts/load-knowledge/schema.ts` lines 1050-1078 (`SCHEMA_V13_ADDITIONS_SQL` is the structural template), lines 1183-1262 (`applySchema` + migration chain)
  - `apps/qw-oracle/scripts/load-knowledge/load-maps.ts` lines 105-135 (loader signature + return-shape pattern)
  - `apps/qw-oracle/scripts/load-knowledge/index.ts` lines 491-510 (`runLoadMaps` CLI dispatcher pattern using `openKnowledgeDb()`)
  - `apps/qw-oracle/scripts/load-knowledge/db.ts` (the `openKnowledgeDb()` export; centralises WAL pragmas + `applySchema`)
  - `apps/qw-oracle/serve/mcp/src/index.ts` lines 40-260 (MCP server + tool registration via inline literals + `setRequestHandler` switch)
  - `apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts` (canonical MCP tool example: `bun:sqlite` import, `db.query(...).get()`, kebab-case filename, camelCase exported function `lookupMap`)
  - `apps/qw-oracle/serve/mcp/src/tools/search-maps.ts` (canonical search-tool example with multi-filter inputSchema)

- [ ] **Verify the canonical id1 source is present.**

```bash
ls /home/paradoks/projects/quakeworld/research/repos/qwcl-original/QW/progs/{items.qc,weapons.qc,combat.qc,client.qc,player.qc,defs.qc,world.qc} 2>&1 | tail -10
```

Expected: all 7 files exist. If any are missing, stop and report.

- [ ] **Confirm working directory.**

```bash
cd /home/paradoks/projects/quakeworld/apps/qw-oracle
pwd
```

Expected: `/home/paradoks/projects/quakeworld/apps/qw-oracle`. All `npm run`, `bun run`, and `npx tsx` commands below assume this CWD.

- [ ] **Print current schema version on the live DB before any changes.**

```bash
sqlite3 data/knowledge.db "SELECT key,value FROM schema_meta;" 2>&1 || echo "(no schema_meta yet; fresh DB)"
```

Expected: `schema_version|13` for an existing tree.

---

## File Structure

**New files:**
- `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` - hand-curated seed (only YAML in this arc)
- `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts` - YAML -> DB loader; mirrors load-maps.ts shape
- `apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts` - one-off verification script (deletable; left in tree as record)
- `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts` - kebab filename, exports `lookupGameplayEntity(db, args)`
- `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts` - exports `lookupMechanic(db, args)`
- `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts` - exports `searchGameplayEntities(db, args)`
- `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts` - exports `searchMechanics(db, args)`
- `apps/slipgate-app/src/lib/config/data/qw-gameplay.json` - snapshot (Task 23)

**Modified files:**
- `apps/qw-oracle/scripts/load-knowledge/schema.ts` - bump `SCHEMA_VERSION` to 14, add `SCHEMA_V14_ADDITIONS_SQL`, add `migrateV13ToV14`, append migration step + final `db.exec(SCHEMA_V14_ADDITIONS_SQL)` in `applySchema`
- `apps/qw-oracle/scripts/load-knowledge/index.ts` - add `runLoadGameplay` dispatcher case + help-text entry
- `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts` - add `emitGameplay` alongside `emitQwMaps` in the `opts.project === 'qw'` branch
- `apps/qw-oracle/SCHEMA.md` - document v14
- `apps/qw-oracle/serve/mcp/src/index.ts` - import the four camelCase handlers; add four inline tool definitions in the `tools: [...]` array; add four cases in the `setRequestHandler(CallToolRequestSchema, ...)` switch
- `apps/qw-oracle/serve/mcp/package.json` - reconcile version drift with constructor (currently `0.1.0` in package.json vs `0.3.0` in `index.ts:44`); pick `0.4.0` and update both
- `apps/qw-oracle/CLAUDE.md` - status section announces game-mechanics shipped; Layer 1 row of the database table is reworded to "structured engine + game-mechanics facts"
- `apps/qw-oracle/OVERVIEW.md` - add a `gameplay_*` row to the Layer 1 table
- `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md` - add a per-arc verification block

**Reference files (read-only):**
- `research/repos/qwcl-original/QW/progs/*.qc` - source-of-truth for every YAML row's file:line citation
- `research/repos/ktx/src/{weapons.c,items.c,combat.c}` - used in Task 0's schema-fitness spike

---

## Phase 0 - Schema-fitness spike (BEFORE schema commits)

The v1 review surfaced that compound KTX gates (yawnmode AND dmm3 simultaneously) cannot be represented by a scalar `ruleset_variant` TEXT column without ad-hoc string concatenation. The v2 schema uses `ruleset_gate_json TEXT NOT NULL DEFAULT '{}'`. Task 0 validates this works before v14 ships.

### Task 0: Schema-fitness spike against KTX rows

**Files:**
- Create (temporary): `apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml`
- Create (temporary): `apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts`

- [ ] **Step 1: Hand-encode 5 KTX overrides as YAML rows shaped per the proposed schema.**

Pick rows that exercise the hardest cases per Appendix B:

```yaml
# Spike: do these 5 KTX rows fit the proposed schema cleanly?
# If any need a free-form column we don't have, schema needs a redesign before v14.
rows:
  # 1. Single-gate yawnmode override (axe DMM3 damage)
  - kind: weapon
    name: axe
    gameplay_source_id: ktx
    damage: 50
    ruleset_gate_json: '{"yawn":true,"dm":3}'
    source_ref: weapons.c:128
    notes: yawnmode-only DMM3 axe damage 50 (vs 20 in non-yawn DMM3 and 75 in DMM4).

  # 2. Compound gate: yawnmode + DMM4 (LG self-kill always)
  - kind: weapon
    name: lightning_gun
    gameplay_source_id: ktx
    damage: 4000
    ruleset_gate_json: '{"yawn":true,"dm":4,"in_water":true}'
    source_ref: weapons.c:1192
    notes: yawnmode DMM4 lightning discharge in water always kills self with 4000 dmg.

  # 3. Function-dispatch ruleset (CA respawn formula reference)
  - kind: spawn_rule
    name: ca_respawn_time
    gameplay_source_id: ktx
    value_text: bound_3_teamsize_plus_1_6_then_pow2_per_death
    ruleset_gate_json: '{"mode":"ca"}'
    source_ref: clan_arena.c:142
    notes: formula not literal; see clan_arena.c:142-149 for full algorithm.

  # 4. Cvar-driven KTX behavior (freshteams weapon respawn)
  - kind: item
    name: weapon_respawn_default
    gameplay_source_id: ktx
    respawn_seconds: 20
    ruleset_gate_json: '{"freshteams":true}'
    source_ref: items.c:812
    notes: gated by k_freshteams_weapon_time cvar (default 20).

  # 5. Compound: instagib + shotgun
  - kind: weapon
    name: shotgun
    gameplay_source_id: ktx
    damage: 1
    ruleset_gate_json: '{"instagib":true}'
    source_ref: weapons.c:839
    notes: instagib mode shotgun fires single coilgun bullet, 1 dmg = instakill.
```

Write the file at `apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml`.

- [ ] **Step 2: Write a one-off TypeScript that materialises the spike rows in an in-memory SQLite, using the proposed v14 schema.**

Create `apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts`:

```typescript
// Schema-fitness spike. Verifies the proposed v14 schema accepts compound
// KTX ruleset gates and that re-runs are idempotent. Delete after Task 0.

import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';

const PROPOSED_SCHEMA = `
CREATE TABLE gameplay_sources (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  source_root TEXT NOT NULL,
  notes TEXT
);
CREATE TABLE gameplay_entity_defs (
  id INTEGER PRIMARY KEY,
  gameplay_source_id TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind TEXT NOT NULL CHECK (kind IN ('item','weapon','projectile')),
  name TEXT NOT NULL,
  classname TEXT,
  damage REAL,
  splash_damage REAL,
  splash_radius REAL,
  refire_seconds REAL,
  respawn_seconds REAL,
  pickup_amount REAL,
  max_carry REAL,
  duration_seconds REAL,
  ruleset_gate_json TEXT NOT NULL DEFAULT '{}',
  source_ref TEXT NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE TABLE gameplay_mechanics (
  id INTEGER PRIMARY KEY,
  gameplay_source_id TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind TEXT NOT NULL CHECK (kind IN (
    'constant','env_hazard','player_stat','powerup_behavior',
    'armor_model','death_rule','spawn_rule','dm_mode_rule'
  )),
  name TEXT NOT NULL,
  value_numeric REAL,
  value_text TEXT,
  ruleset_gate_json TEXT NOT NULL DEFAULT '{}',
  source_ref TEXT NOT NULL,
  props_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
`;

const db = new Database(':memory:');
db.exec(PROPOSED_SCHEMA);
db.prepare('INSERT INTO gameplay_sources VALUES (?,?,?,?,?)').run('ktx', 'KTX', 'spike', 'research/repos/ktx/src/', null);
db.prepare('INSERT INTO gameplay_sources VALUES (?,?,?,?,?)').run('id1', 'id1', 'baseline', 'research/repos/qwcl-original/QW/progs/', null);

const seed = yaml.load(fs.readFileSync('scripts/extractors/qw/seeds/_ktx-spike.yaml', 'utf8')) as { rows: any[] };

const upsertEntity = db.prepare(`
  INSERT INTO gameplay_entity_defs (
    gameplay_source_id, kind, name, classname, damage, splash_damage, splash_radius,
    refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds,
    ruleset_gate_json, source_ref, props_json, notes
  ) VALUES (
    @gameplay_source_id, @kind, @name, @classname, @damage, @splash_damage, @splash_radius,
    @refire_seconds, @respawn_seconds, @pickup_amount, @max_carry, @duration_seconds,
    @ruleset_gate_json, @source_ref, @props_json, @notes
  )
  ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
    damage = excluded.damage,
    source_ref = excluded.source_ref,
    notes = excluded.notes
`);
const upsertMechanic = db.prepare(`
  INSERT INTO gameplay_mechanics (
    gameplay_source_id, kind, name, value_numeric, value_text,
    ruleset_gate_json, source_ref, props_json, notes
  ) VALUES (
    @gameplay_source_id, @kind, @name, @value_numeric, @value_text,
    @ruleset_gate_json, @source_ref, @props_json, @notes
  )
  ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
    value_numeric = excluded.value_numeric,
    value_text = excluded.value_text,
    source_ref = excluded.source_ref,
    notes = excluded.notes
`);

const ENTITY_KINDS = new Set(['item','weapon','projectile']);

function pad(row: any) {
  return {
    gameplay_source_id: row.gameplay_source_id,
    kind: row.kind,
    name: row.name,
    classname: row.classname ?? null,
    damage: row.damage ?? null,
    splash_damage: row.splash_damage ?? null,
    splash_radius: row.splash_radius ?? null,
    refire_seconds: row.refire_seconds ?? null,
    respawn_seconds: row.respawn_seconds ?? null,
    pickup_amount: row.pickup_amount ?? null,
    max_carry: row.max_carry ?? null,
    duration_seconds: row.duration_seconds ?? null,
    value_numeric: row.value_numeric ?? null,
    value_text: row.value_text ?? null,
    ruleset_gate_json: row.ruleset_gate_json ?? '{}',
    source_ref: row.source_ref,
    props_json: '{}',
    notes: row.notes ?? null,
  };
}

// First load
for (const row of seed.rows) {
  const r = pad(row);
  if (ENTITY_KINDS.has(row.kind)) upsertEntity.run(r);
  else upsertMechanic.run(r);
}
const e1 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_entity_defs').get() as any).c;
const m1 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_mechanics').get() as any).c;
console.log(`first load:  entity_defs=${e1}, mechanics=${m1}`);

// Second load (idempotency check)
for (const row of seed.rows) {
  const r = pad(row);
  if (ENTITY_KINDS.has(row.kind)) upsertEntity.run(r);
  else upsertMechanic.run(r);
}
const e2 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_entity_defs').get() as any).c;
const m2 = (db.prepare('SELECT COUNT(*) AS c FROM gameplay_mechanics').get() as any).c;
console.log(`second load: entity_defs=${e2}, mechanics=${m2}`);
console.log(`idempotent:  ${e1 === e2 && m1 === m2 ? 'YES' : 'NO'}`);

// Compound gate query (must work)
const compound = db.prepare(`
  SELECT name, damage, ruleset_gate_json, source_ref FROM gameplay_entity_defs
  WHERE gameplay_source_id = ?
    AND json_extract(ruleset_gate_json, '$.yawn') = 1
    AND json_extract(ruleset_gate_json, '$.dm') = 4
`).all('ktx');
console.log('compound-gate query result:', compound);
db.close();
```

- [ ] **Step 3: Run the spike.**

```bash
npx tsx scripts/load-knowledge/_smoke-ktx-fit.ts
```

Expected output:

```
first load:  entity_defs=4, mechanics=1
second load: entity_defs=4, mechanics=1
idempotent:  YES
compound-gate query result: [ { name: 'lightning_gun', damage: 4000, ruleset_gate_json: '{"yawn":true,"dm":4,"in_water":true}', source_ref: 'weapons.c:1192' } ]
```

Stop conditions:
- If `idempotent: NO` -> the unique-index design is broken. Investigate the JSON-as-key strategy (canonicalise key order before insert? use a generated column? consider hash-of-canonicalised-json?).
- If the compound-gate `json_extract` query returns 0 rows -> SQLite version mismatch (need 3.38+ for proper `json_extract` semantics). Check `sqlite3 :memory: 'SELECT sqlite_version()'`.
- If anything else fails -> redesign before Task 1.

- [ ] **Step 4: Delete the spike artifacts only after schema is committed in Task 1.**

(Leave them in place for now so reviewers can see the spike was real. Cleanup happens in Task 25 step 5.)

- [ ] **Step 5: Do NOT commit yet.** The spike is a private check; it commits as part of the schema-introduction commit in Task 1.

---

## Phase 1 - Schema v14 migration

### Task 1: Add `SCHEMA_V14_ADDITIONS_SQL`, `migrateV13ToV14`, and the migration-chain entry

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/schema.ts`

The pattern to mirror is `SCHEMA_V13_ADDITIONS_SQL` (defined at schema.ts:1053, executed last in `applySchema` at line 1262) and `migrateV12ToV13` (declared above `applySchema`, called inside `applySchema` when `existingVersion === 12 && SCHEMA_VERSION >= 13`).

- [ ] **Step 1: Bump `SCHEMA_VERSION`.**

In `schema.ts:8`, change:

```
export const SCHEMA_VERSION = 13;
```

to:

```
export const SCHEMA_VERSION = 14;
```

- [ ] **Step 2: Add the `SCHEMA_V14_ADDITIONS_SQL` constant immediately after `SCHEMA_V13_ADDITIONS_SQL`** (around schema.ts:1078).

Find the closing backtick + semicolon of `SCHEMA_V13_ADDITIONS_SQL` (line ~1078). Insert this block on the next line:

```typescript
// v14 (game-mechanics, 2026-04-27).
// Three flat tables outside the entities/per-version model. Mirrors the
// SCHEMA_V13_ADDITIONS_SQL pattern for the maps table. ruleset_gate_json
// is NOT NULL DEFAULT '{}' so the unique index has no NULL columns
// (SQLite treats NULLs as distinct in unique indexes, which would defeat
// upsert idempotency). KTX overrides in arc 2 store compound gates as
// JSON like '{"yawn":true,"dm":3}'.
const SCHEMA_V14_ADDITIONS_SQL = `
CREATE TABLE IF NOT EXISTS gameplay_sources (
  id           TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description  TEXT NOT NULL,
  source_root  TEXT NOT NULL,
  notes        TEXT
);

CREATE TABLE IF NOT EXISTS gameplay_entity_defs (
  id                     INTEGER PRIMARY KEY,
  gameplay_source_id     TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind                   TEXT NOT NULL CHECK (kind IN ('item','weapon','projectile')),
  name                   TEXT NOT NULL,
  classname              TEXT,
  damage                 REAL,
  splash_damage          REAL,
  splash_radius          REAL,
  refire_seconds         REAL,
  respawn_seconds        REAL,
  pickup_amount          REAL,
  max_carry              REAL,
  duration_seconds       REAL,
  ruleset_gate_json      TEXT NOT NULL DEFAULT '{}',
  source_ref             TEXT NOT NULL,
  props_json             TEXT NOT NULL DEFAULT '{}',
  notes                  TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_kind  ON gameplay_entity_defs(kind);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_name  ON gameplay_entity_defs(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_gameplay_entity_defs_class ON gameplay_entity_defs(classname);

CREATE TABLE IF NOT EXISTS gameplay_mechanics (
  id                     INTEGER PRIMARY KEY,
  gameplay_source_id     TEXT NOT NULL REFERENCES gameplay_sources(id),
  kind                   TEXT NOT NULL CHECK (kind IN (
                            'constant','env_hazard','player_stat',
                            'powerup_behavior','armor_model','death_rule',
                            'spawn_rule','dm_mode_rule'
                         )),
  name                   TEXT NOT NULL,
  value_numeric          REAL,
  value_text             TEXT,
  ruleset_gate_json      TEXT NOT NULL DEFAULT '{}',
  source_ref             TEXT NOT NULL,
  props_json             TEXT NOT NULL DEFAULT '{}',
  notes                  TEXT,
  UNIQUE (gameplay_source_id, kind, name, ruleset_gate_json)
);
CREATE INDEX IF NOT EXISTS idx_gameplay_mechanics_kind ON gameplay_mechanics(kind);
CREATE INDEX IF NOT EXISTS idx_gameplay_mechanics_name ON gameplay_mechanics(name COLLATE NOCASE);
`;
```

- [ ] **Step 3: Add `migrateV13ToV14` immediately after `migrateV12ToV13`.**

Find the existing `migrateV12ToV13` function (look for `function migrateV12ToV13` in schema.ts). Add this directly after it:

```typescript
function migrateV13ToV14(db: Database.Database): void {
  // Pure-additive: three new flat tables. No FKs into pre-v14 tables, no
  // rebuilds, no foreign_keys toggle needed. SCHEMA_V14_ADDITIONS_SQL is
  // also executed unconditionally at the end of applySchema (idempotent
  // CREATE IF NOT EXISTS), so the migration itself only stamps the version.
  const txn = db.transaction(() => {
    db.exec(SCHEMA_V14_ADDITIONS_SQL);
    db.prepare(`UPDATE schema_meta SET value = ? WHERE key = 'schema_version'`).run('14');
  });
  txn();
}
```

- [ ] **Step 4: Wire the v14 step into the migration chain inside `applySchema`.**

Find the existing block:

```typescript
    if (existingVersion === 12 && SCHEMA_VERSION >= 13) {
      migrateV12ToV13(db);
      existingVersion = 13;
    }
    if (existingVersion !== SCHEMA_VERSION) {
```

Insert this block between the v12->v13 step and the version-check:

```typescript
    if (existingVersion === 13 && SCHEMA_VERSION >= 14) {
      migrateV13ToV14(db);
      existingVersion = 14;
    }
```

- [ ] **Step 5: Append `db.exec(SCHEMA_V14_ADDITIONS_SQL);` to the trailing block** (around line 1262).

Find the existing closing block of `applySchema`:

```typescript
  db.exec(SCHEMA_V12_ADDITIONS_SQL);
  db.exec(SCHEMA_V13_ADDITIONS_SQL);
}
```

Insert one line:

```typescript
  db.exec(SCHEMA_V12_ADDITIONS_SQL);
  db.exec(SCHEMA_V13_ADDITIONS_SQL);
  db.exec(SCHEMA_V14_ADDITIONS_SQL);
}
```

Update the comment two lines above (which currently says "v2 / v3 / v4 / v5 / v6 / v12 / v13 additions are idempotent...") to also list v14:

```
  // v2 / v3 / v4 / v5 / v6 / v12 / v13 / v14 additions are idempotent CREATE IF NOT EXISTS --
```

- [ ] **Step 6: Typecheck.**

```bash
npm run typecheck
```

Expected: PASS, no errors.

- [ ] **Step 7: Write a temporary smoke script to verify both fresh-DB and migration paths.**

Create `apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts`:

```typescript
// Schema-apply smoke. Tests fresh-DB and migration paths.
// Run with: npx tsx scripts/load-knowledge/_smoke-v14-schema.ts
import * as fs from 'node:fs';
import Database from 'better-sqlite3';
import { applySchema, SCHEMA_VERSION } from './schema';

function dump(db: Database.Database, label: string) {
  const meta = db.prepare("SELECT value FROM schema_meta WHERE key='schema_version'").get() as any;
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'gameplay_%' ORDER BY name`).all();
  console.log(`${label}: schema_version=${meta?.value}, tables=${JSON.stringify(tables)}`);
}

// Fresh-DB path
fs.rmSync('/tmp/v14-fresh.db', { force: true });
const fresh = new Database('/tmp/v14-fresh.db');
applySchema(fresh);
dump(fresh, 'fresh');
fresh.close();

// Migration path: simulate a v13 DB then apply schema
fs.rmSync('/tmp/v14-migrate.db', { force: true });
const old = new Database('/tmp/v14-migrate.db');
// Apply schema once with VERSION temporarily forced to 13... easier to copy live DB if it's v13.
// Simpler: copy live data/knowledge.db (which is at v13 per pre-flight) and apply.
old.close();
fs.copyFileSync('data/knowledge.db', '/tmp/v14-migrate.db');
const migrated = new Database('/tmp/v14-migrate.db');
applySchema(migrated);
dump(migrated, 'migrated');
console.log(`SCHEMA_VERSION constant: ${SCHEMA_VERSION}`);
migrated.close();
```

Run it:

```bash
npx tsx scripts/load-knowledge/_smoke-v14-schema.ts
```

Expected output (both lines should match):

```
fresh: schema_version=14, tables=[{"name":"gameplay_entity_defs"},{"name":"gameplay_mechanics"},{"name":"gameplay_sources"}]
migrated: schema_version=14, tables=[{"name":"gameplay_entity_defs"},{"name":"gameplay_mechanics"},{"name":"gameplay_sources"}]
SCHEMA_VERSION constant: 14
```

If either path fails or shows missing tables, stop and investigate before proceeding.

- [ ] **Step 8: Apply v14 to the live `data/knowledge.db` by running the existing CLI** (which calls `openKnowledgeDb` -> `applySchema` and stamps v14):

```bash
npx tsx scripts/load-knowledge/_smoke-v14-schema.ts && sqlite3 data/knowledge.db "SELECT value FROM schema_meta WHERE key='schema_version'; SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'gameplay_%' ORDER BY name;"
```

Expected: `14` and the three table names. The smoke script above already migrates a copy AND mutates a copy at `/tmp/v14-migrate.db`; the live DB is migrated by the CLI on its next loader call - but since the spike's smoke script copied the live DB to /tmp, do an explicit upgrade now:

```bash
npx tsx -e "
import('./scripts/load-knowledge/db.js').then(m => {
  const db = m.openKnowledgeDb();
  console.log(db.prepare(\"SELECT value FROM schema_meta WHERE key='schema_version'\").get());
  db.close();
});
" 2>&1 | tail -3
```

If `tsx -e` chokes on relative path resolution per `reference_qw_oracle_toolchain.md`, replace with a temp file `scripts/load-knowledge/_apply.ts` containing the same body and run `npx tsx scripts/load-knowledge/_apply.ts`. Either way, expected: `{ value: '14' }`.

- [ ] **Step 9: Commit schema + smoke + spike together.**

```bash
git add apps/qw-oracle/scripts/load-knowledge/schema.ts \
        apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts \
        apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts \
        apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml
git commit -m "feat(qw-oracle): schema v14 - gameplay_sources/entity_defs/mechanics tables + KTX-fitness spike"
```

---

### Task 2: Document v14 in SCHEMA.md

**Files:**
- Modify: `apps/qw-oracle/SCHEMA.md`

- [ ] **Step 1: Find the v13 section.**

```bash
grep -n "^## v" apps/qw-oracle/SCHEMA.md | tail -5
```

- [ ] **Step 2: Append v14 section after the last v13 sub-heading.**

Add (matching the format of the v13 section verbatim -- read it first):

```markdown
## v14 (2026-04-27): game-mechanics tables (id1 baseline)

Adds three flat tables (no `qw_` prefix to match the existing `maps` precedent). Outside the entities/per-version model.

- **`gameplay_sources`** - registry of gameplay sources (`id1` baseline, `ktx` overrides in arc 2, future mods). Stable string ID, display name, source-tree root, free-form notes.

- **`gameplay_entity_defs`** - polymorphic table for game entities. `kind in (item, weapon, projectile)`. Indexable common columns (damage, splash_damage, splash_radius, refire_seconds, respawn_seconds, pickup_amount, max_carry, duration_seconds, classname). `props_json` carries kind-specific fields. `source_ref` is the file:line citation.

- **`gameplay_mechanics`** - polymorphic table for game rules. `kind in (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule)`. Indexable common columns (value_numeric, value_text). Same source_ref discipline.

Both polymorphic tables share `ruleset_gate_json TEXT NOT NULL DEFAULT '{}'`. The default empty object is used by id1 baseline rows and by KTX rows that apply unconditionally; KTX overrides with mode/yawnmode/dmm gates serialise as JSON like `{"yawn":true,"dm":3}` and join into the same row identity. The `NOT NULL DEFAULT` is load-bearing: SQLite treats NULL columns in unique indexes as distinct, which would defeat upsert idempotency. By keeping the column always non-NULL, `ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE` works as expected for re-runs.

Migration is pure-additive (no rebuilds, no FK toggling). Function: `migrateV13ToV14`. Pattern: new `SCHEMA_V14_ADDITIONS_SQL` constant + appended `db.exec(...)` in `applySchema`, mirroring `SCHEMA_V13_ADDITIONS_SQL`.

Engine-tunable cvars (`sv_maxspeed`, `sv_friction`, `sv_accelerate`, etc.) are deliberately NOT in `gameplay_mechanics`. They live in the `cvars` table (engine-config track) once each engine's extraction tags surface them. Only QC-defined gameplay constants (e.g. `sv_gravity` set in worldspawn QC at world.qc:182) belong here.

Rationale, primary-source inventory, and KTX schema-fitness check: see `apps/qw-oracle/docs/game-mechanics-preplan.md` (Appendices A and B).
```

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/SCHEMA.md
git commit -m "docs(qw-oracle): document schema v14 game-mechanics tables"
```

---

## Phase 2 - id1 baseline YAML curation

The YAML at `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` is the literal seed. Every row carries a `source_ref` field with the file:line citation from Appendix A of the pre-plan. The YAML is hand-authored - no scripts in this phase.

### Task 3: Author the YAML scaffold and gameplay_source row

**Files:**
- Create: `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`

- [ ] **Step 1: Verify the seeds directory exists.**

```bash
ls apps/qw-oracle/scripts/extractors/qw/seeds/ 2>&1 || mkdir -p apps/qw-oracle/scripts/extractors/qw/seeds/
ls apps/qw-oracle/scripts/extractors/qw/seeds/
```

Expected: directory exists; possibly already contains `_ktx-spike.yaml` from Task 0.

- [ ] **Step 2: Create the scaffold.**

Write `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml`:

```yaml
# id1 baseline game mechanics for QuakeWorld.
#
# Source: research/repos/qwcl-original/QW/progs/ (canonical QW gamecode).
# Every row carries source_ref of the form "<file>:<line>" pointing into the
# canonical source. See apps/qw-oracle/docs/game-mechanics-preplan.md
# Appendix A for the primary-source inventory this YAML is built from.
#
# Loader: apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
# Schema:  gameplay_sources / gameplay_entity_defs / gameplay_mechanics
#          (v14, 2026-04-27).
#
# Ruleset gating: id1 baseline rows leave ruleset_gate_json empty (loader
# defaults to '{}'). Cvar-driven differences (DM3 ammo respawn, DM4 starting
# loadout, etc.) are encoded as separate rows in gameplay_mechanics.dm_mode_rule
# rather than as gates on the affected entity rows; this keeps weapon/item/
# projectile rows clean and lets clients filter dm-mode behavior in one place.

gameplay_source:
  id: id1
  display_name: id1 (vanilla QuakeWorld)
  description: >
    Canonical QuakeWorld gamecode shipped with the original QW source release.
    Frozen baseline that every mod (KTX, clan-arena, freshteam, etc.) inherits
    from. Source files at research/repos/qwcl-original/QW/progs/.
  source_root: research/repos/qwcl-original/QW/progs/
  notes: >
    Engine-side constants (sv_maxspeed=320, friction=4, accelerate=10,
    stopspeed=100, edgefriction=2) live in the cvars table once each engine's
    extraction picks them up; not loaded into gameplay_mechanics.

# Cluster 1: weapons (8 rows)
weapons:
# (filled by Task 4)

# Cluster 2: projectiles (4 rows)
projectiles:
# (filled by Task 5)

# Cluster 3: items (25 rows: 3 health + 3 armor + 4 powerups + 8 ammo + 6 weapon-pickups + 1 backpack)
items:
# (filled by Tasks 6a-6f)

# Cluster 4: mechanics (41 rows total)
mechanics:
  constants:
  # (filled by Task 7) - 2 rows (sv_gravity_default, rocket_jump_multiplier_default)
  env_hazards:
  # (filled by Task 8) - 6 rows
  player_stats:
  # (filled by Task 9) - 12 rows
  powerup_behaviors:
  # (filled by Task 10) - 3 rows
  armor_models:
  # (filled by Task 11) - 1 row
  death_rules:
  # (filled by Task 12) - 6 rows
  spawn_rules:
  # (filled by Task 13) - 5 rows
  dm_mode_rules:
  # (filled by Task 14) - 4 rows
```

- [ ] **Step 3: Verify YAML parses.**

```bash
node -e "const y=require('js-yaml').load(require('fs').readFileSync('apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml','utf8')); console.log(Object.keys(y))"
```

Expected: `[ 'gameplay_source', 'weapons', 'projectiles', 'items', 'mechanics' ]`.

- [ ] **Step 4: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 gameplay seed scaffold"
```

---

### Task 4: Curate the 8 weapon rows

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` (`weapons:` section)

- [ ] **Step 1: Replace the `weapons:` placeholder with these 8 rows.**

```yaml
weapons:
  - name: axe
    classname: null
    damage: 20
    refire_seconds: 0.5
    source_ref: weapons.qc:57
    props:
      melee_range: 64
      melee_range_source_ref: weapons.qc:44
      damage_dm_gt_3: 75
      damage_dm_gt_3_source_ref: weapons.qc:55
      refire_source_ref: weapons.qc:1010
    notes: 75 damage in deathmatch>3.

  - name: shotgun
    classname: weapon_shotgun
    damage: 4
    refire_seconds: 0.5
    source_ref: weapons.qc:285
    props:
      damage_kind: per_pellet
      pellet_count: 6
      pellet_count_source_ref: weapons.qc:311
      spread: [0.04, 0.04, 0]
      spread_source_ref: weapons.qc:311
      ammo_per_shot: 1
      ammo_per_shot_source_ref: weapons.qc:308
      ammo_type: shells
      max_carry_ammo: 100
      max_carry_ammo_source_ref: items.qc:474
      refire_source_ref: weapons.qc:1025
    notes: null

  - name: super_shotgun
    classname: weapon_supershotgun
    damage: 4
    refire_seconds: 0.7
    source_ref: weapons.qc:285
    props:
      damage_kind: per_pellet
      pellet_count: 14
      pellet_count_source_ref: weapons.qc:338
      spread: [0.14, 0.08, 0]
      spread_source_ref: weapons.qc:338
      ammo_per_shot: 2
      ammo_per_shot_source_ref: weapons.qc:336
      ammo_type: shells
      refire_source_ref: weapons.qc:1031
    notes: null

  - name: nailgun
    classname: weapon_nailgun
    damage: 9
    refire_seconds: 0.2
    source_ref: weapons.qc:797
    props:
      ammo_per_shot: 1
      ammo_per_shot_source_ref: weapons.qc:761
      ammo_type: nails
      max_carry_ammo: 200
      max_carry_ammo_source_ref: items.qc:477
      projectile: spike
      projectile_velocity: 1000
      projectile_velocity_source_ref: weapons.qc:717
      projectile_lifetime_seconds: 6
      projectile_lifetime_source_ref: weapons.qc:712
      refire_source_ref: weapons.qc:759
      refire_source_ref_player_frames: [player.qc:190, player.qc:203]
    notes: damage realised on spike_touch. Refire timer is set inside W_FireSpikes at weapons.qc:759 (parallels SNG's weapons.qc:726 inside W_FireSuperSpikes); the player_nail1/player_nail2 frames at player.qc:190/203 also re-set attack_finished after each W_FireSpikes call. Citing the fire-function body for parity with SNG.

  - name: super_nailgun
    classname: weapon_supernailgun
    damage: 18
    refire_seconds: 0.2
    source_ref: weapons.qc:844
    props:
      ammo_per_shot: 2
      ammo_per_shot_source_ref: weapons.qc:728
      ammo_type: nails
      projectile: super_spike
      projectile_velocity: 1000
      projectile_velocity_source_ref: weapons.qc:717
      projectile_lifetime_seconds: 6
      projectile_lifetime_source_ref: weapons.qc:712
      refire_source_ref: weapons.qc:726
    notes: shares spike-launcher with nailgun; damage realised on superspike_touch.

  - name: grenade_launcher
    classname: weapon_grenadelauncher
    damage: 0
    splash_damage: 120
    splash_radius: 160
    refire_seconds: 0.6
    source_ref: weapons.qc:600
    props:
      damage_kind: splash_only
      splash_damage_source_ref: weapons.qc:600
      splash_radius_source_ref: combat.qc:258
      splash_radius_formula: damage_plus_40
      ammo_per_shot: 1
      ammo_per_shot_source_ref: weapons.qc:634
      ammo_type: rockets
      max_carry_ammo: 100
      max_carry_ammo_source_ref: items.qc:478
      projectile: grenade
      projectile_lifetime_seconds: 2.5
      projectile_lifetime_source_ref: weapons.qc:676
      refire_seconds_dm4: 1.1
      refire_seconds_dm4_source_ref: weapons.qc:671
      refire_source_ref: weapons.qc:1045
    notes: direct hit deals 0 damage; explosion only.

  - name: rocket_launcher
    classname: weapon_rocketlauncher
    damage: 110
    splash_damage: 120
    splash_radius: 160
    refire_seconds: 0.8
    source_ref: weapons.qc:385
    props:
      damage_kind: direct_plus_splash
      damage_formula: 100_plus_random_times_20
      splash_damage_source_ref: weapons.qc:397
      splash_radius_source_ref: combat.qc:258
      splash_radius_formula: damage_plus_40
      ammo_per_shot: 1
      ammo_per_shot_source_ref: weapons.qc:422
      ammo_type: rockets
      projectile: rocket
      projectile_velocity: 1000
      projectile_velocity_source_ref: weapons.qc:437
      projectile_lifetime_seconds: 5
      projectile_lifetime_source_ref: weapons.qc:445
      refire_source_ref: weapons.qc:1051
    notes: damage is 100 + random()*20 = 100..120 effective.

  - name: lightning_gun
    classname: weapon_lightning
    damage: 30
    refire_seconds: 0.1
    source_ref: weapons.qc:586
    props:
      damage_kind: per_tick
      ammo_per_shot: 1
      ammo_per_shot_source_ref: weapons.qc:569
      ammo_type: cells
      max_carry_ammo: 100
      max_carry_ammo_source_ref: items.qc:480
      range: 600
      range_source_ref: weapons.qc:573
      water_self_damage_dm4: 4000
      water_self_damage_dm4_source_ref: weapons.qc:539
      refire_source_ref: weapons.qc:1056
    notes: in DM4+ discharge in water deals 4000 dmg (instakill).
```

- [ ] **Step 2: Verify count.**

```bash
node -e "const y=require('js-yaml').load(require('fs').readFileSync('apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml','utf8')); console.log('weapons:', y.weapons.length)"
```

Expected: `weapons: 8`.

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 weapons curated (8 rows, source-cited)"
```

---

### Task 5: Curate the 4 projectile rows

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` (`projectiles:` section)

- [ ] **Step 1: Replace `projectiles:` placeholder with these 4 rows.**

```yaml
projectiles:
  - name: spike
    damage: 9
    source_ref: weapons.qc:797
    props:
      movetype: MOVETYPE_FLYMISSILE
      movetype_source_ref: weapons.qc:704
      velocity: 1000
      velocity_source_ref: weapons.qc:717
      lifetime_seconds: 6
      lifetime_source_ref: weapons.qc:712
      gravity_factor: 0
    notes: nailgun projectile.

  - name: super_spike
    damage: 18
    source_ref: weapons.qc:844
    props:
      movetype: MOVETYPE_FLYMISSILE
      velocity: 1000
      velocity_source_ref: weapons.qc:717
      lifetime_seconds: 6
      lifetime_source_ref: weapons.qc:712
      gravity_factor: 0
    notes: super-nailgun projectile.

  - name: rocket
    damage: 110
    splash_damage: 120
    splash_radius: 160
    source_ref: weapons.qc:385
    props:
      movetype: MOVETYPE_FLYMISSILE
      movetype_source_ref: weapons.qc:431
      velocity: 1000
      velocity_source_ref: weapons.qc:437
      lifetime_seconds: 5
      lifetime_source_ref: weapons.qc:445
      gravity_factor: 0
      damage_formula: 100_plus_random_times_20
      splash_damage_source_ref: weapons.qc:397
      splash_radius_source_ref: combat.qc:258
    notes: direct damage is 100..120 random; splash flat 120.

  - name: grenade
    damage: 0
    splash_damage: 120
    splash_radius: 160
    source_ref: weapons.qc:600
    props:
      movetype: MOVETYPE_BOUNCE
      movetype_source_ref: weapons.qc:644
      velocity_forward: 600
      velocity_up: 200
      velocity_source_ref: weapons.qc:653
      lifetime_seconds: 2.5
      lifetime_source_ref: weapons.qc:676
      gravity_factor: 1
      direct_damage: 0
      direct_damage_source_ref: weapons.qc:612
      splash_damage_source_ref: weapons.qc:600
      splash_radius_source_ref: combat.qc:258
    notes: bounces, affected by gravity, no damage on direct touch.
```

- [ ] **Step 2: Verify count.**

```bash
node -e "const y=require('js-yaml').load(require('fs').readFileSync('apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml','utf8')); console.log('projectiles:', y.projectiles.length)"
```

Expected: `projectiles: 4`.

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 projectiles curated (4 rows)"
```

---

### Task 6a: Items - health (3 rows)

**Files:**
- Modify: `apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml` (`items:` section)

- [ ] **Step 1: Replace `items:` placeholder with these 3 rows** (keep the `# (filled by ...)` comment in place; subsequent tasks 6b-6f append).

```yaml
items:
  - name: health_15_rotten
    classname: item_health
    pickup_amount: 15
    respawn_seconds: 20
    source_ref: items.qc:250
    props:
      spawnflag: 1
      spawnflag_meaning: H_ROTTEN
      classname_source_ref: items.qc:239
      respawn_source_ref: items.qc:330
      cap_rule: clamps_to_max_health_via_T_Heal_ignore_zero
      cap_source_ref: items.qc:217
    notes: T_Heal with ignore=0 caps at max_health (default 100); items.qc:217 is the cap site, items.qc:220 is megahealth's separate ignore=1 path.

  - name: health_25_normal
    classname: item_health
    pickup_amount: 25
    respawn_seconds: 20
    source_ref: items.qc:269
    props:
      spawnflag: 0
      cap_rule: clamps_to_max_health_via_T_Heal_ignore_zero
      cap_source_ref: items.qc:217
      classname_source_ref: items.qc:239
    notes: null

  - name: megahealth_100
    classname: item_health
    pickup_amount: 100
    respawn_seconds: 20
    source_ref: items.qc:260
    props:
      spawnflag: 2
      spawnflag_meaning: H_MEGA
      max_carry: 250
      max_carry_source_ref: items.qc:291
      cap_rule: ignore_max_health_up_to_250
      cap_source_ref: items.qc:220
      healtype: 2
      healtype_source_ref: items.qc:261
      decay_rule: minus_1_hp_per_second_back_to_max_health
      decay_rule_source_ref: items.qc:345
      decay_initial_delay_seconds: 5
      decay_initial_source_ref: items.qc:321
      respawn_after_decay_seconds: 20
      respawn_after_decay_source_ref: items.qc:356
      respawn_semantics: respawn_seconds_field_describes_normal_pickup_cycle_decay_uses_separate_5s_initial_then_20s_regen
    notes: respawn_seconds=20 for the basic regen-after-pickup cycle; the megahealth-specific decay-then-regen sequence is separate (5s initial decay tick at items.qc:321, then -1 hp/s back to max, then 20s regen at items.qc:356).
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.health curated (3 rows)"
```

---

### Task 6b: Items - armor (3 rows)

- [ ] **Step 1: Append these 3 rows after the megahealth row.**

```yaml
  - name: green_armor
    classname: item_armor1
    pickup_amount: 100
    respawn_seconds: 20
    source_ref: items.qc:386
    props:
      armortype: 0.3
      armortype_source_ref: items.qc:386
      armorvalue_cap: 100
      armorvalue_cap_source_ref: items.qc:387
      classname_source_ref: items.qc:384
      respawn_source_ref: items.qc:412
    notes: absorbs 30% of damage up to 100 armor.

  - name: yellow_armor
    classname: item_armor2
    pickup_amount: 150
    respawn_seconds: 20
    source_ref: items.qc:392
    props:
      armortype: 0.6
      armorvalue_cap: 150
      classname_source_ref: items.qc:390
    notes: absorbs 60%.

  - name: red_armor
    classname: item_armorInv
    pickup_amount: 200
    respawn_seconds: 20
    source_ref: items.qc:398
    props:
      armortype: 0.8
      armorvalue_cap: 200
      classname_source_ref: items.qc:396
    notes: absorbs 80%.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.armor curated (3 rows)"
```

---

### Task 6c: Items - powerups (4 rows)

- [ ] **Step 1: Append these 4 rows.**

```yaml
  - name: quad_damage
    classname: item_artifact_super_damage
    duration_seconds: 30
    respawn_seconds: 60
    source_ref: items.qc:1417
    props:
      damage_multiplier: 4
      damage_multiplier_dm4: 8
      damage_multiplier_source_ref: combat.qc:127
      damage_multiplier_dm4_source_ref: combat.qc:128
      duration_source_ref: items.qc:1346
      respawn_source_ref: items.qc:1308
      drop_on_death_gate: infokey_dq
      drop_on_death_source_ref: client.qc:552
    notes: dropped on death only when worldspawn key 'dq' is set.

  - name: pentagram
    classname: item_artifact_invulnerability
    duration_seconds: 30
    respawn_seconds: 300
    source_ref: items.qc:1358
    props:
      mechanic: damage_blocked_while_invincible_finished_gte_time
      mechanic_source_ref: combat.qc:184
      duration_source_ref: items.qc:1328
      respawn_source_ref: items.qc:1306
      hit_sound: items/protect3.wav
      hit_sound_source_ref: combat.qc:188
    notes: invul absorbs all damage; 5-minute respawn.

  - name: ring_of_shadows
    classname: item_artifact_invisibility
    duration_seconds: 30
    respawn_seconds: 300
    source_ref: items.qc:1397
    props:
      mechanic: modelindex_eyes_when_invisible_finished_gt_zero
      mechanic_source_ref: client.qc:991
      duration_source_ref: items.qc:1334
      drop_on_death_gate: infokey_dr
      drop_on_death_source_ref: client.qc:568
    notes: 5-minute respawn.

  - name: biosuit
    classname: item_artifact_envirosuit
    duration_seconds: 30
    respawn_seconds: 60
    source_ref: items.qc:1378
    props:
      duration_source_ref: items.qc:1322
      respawn_source_ref: items.qc:1308
      effect: prevents_lava_slime_drown_damage
    notes: null
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.powerups curated (4 rows)"
```

---

### Task 6d: Items - ammo (8 rows)

- [ ] **Step 1: Append these 8 rows.**

```yaml
  - name: shells_small
    classname: item_shells
    pickup_amount: 20
    respawn_seconds: 30
    source_ref: items.qc:906
    props:
      ammo_type: shells
      max_carry: 100
      max_carry_source_ref: items.qc:474
      classname_source_ref: items.qc:889
      respawn_dm3_dm5_seconds: 15
      respawn_source_ref: items.qc:868
      respawn_dm3_dm5_source_ref: items.qc:872
    notes: null

  - name: shells_large
    classname: item_shells
    pickup_amount: 40
    respawn_seconds: 30
    source_ref: items.qc:900
    props:
      ammo_type: shells
      max_carry: 100
      spawnflag_meaning: WEAPON_BIG2
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: nails_small
    classname: item_spikes
    pickup_amount: 25
    respawn_seconds: 30
    source_ref: items.qc:934
    props:
      ammo_type: nails
      max_carry: 200
      max_carry_source_ref: items.qc:477
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: nails_large
    classname: item_spikes
    pickup_amount: 50
    respawn_seconds: 30
    source_ref: items.qc:928
    props:
      ammo_type: nails
      max_carry: 200
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: rockets_small
    classname: item_rockets
    pickup_amount: 5
    respawn_seconds: 30
    source_ref: items.qc:963
    props:
      ammo_type: rockets
      max_carry: 100
      max_carry_source_ref: items.qc:478
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: rockets_large
    classname: item_rockets
    pickup_amount: 10
    respawn_seconds: 30
    source_ref: items.qc:957
    props:
      ammo_type: rockets
      max_carry: 100
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: cells_small
    classname: item_cells
    pickup_amount: 6
    respawn_seconds: 30
    source_ref: items.qc:993
    props:
      ammo_type: cells
      max_carry: 100
      max_carry_source_ref: items.qc:480
      respawn_dm3_dm5_seconds: 15
    notes: null

  - name: cells_large
    classname: item_cells
    pickup_amount: 12
    respawn_seconds: 30
    source_ref: items.qc:987
    props:
      ammo_type: cells
      max_carry: 100
      respawn_dm3_dm5_seconds: 15
    notes: null
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.ammo curated (8 rows)"
```

---

### Task 6e: Items - weapon pickups (6 rows)

- [ ] **Step 1: Append these 6 rows.**

```yaml
  - name: pickup_nailgun
    classname: weapon_nailgun
    pickup_amount: 30
    respawn_seconds: 30
    source_ref: items.qc:580
    props:
      ammo_type: nails
      dm_gate: dm_le_3
      respawn_source_ref: items.qc:669
    notes: weapon pickups exist on map only when deathmatch <= 3.

  - name: pickup_super_nailgun
    classname: weapon_supernailgun
    pickup_amount: 30
    respawn_seconds: 30
    source_ref: items.qc:588
    props:
      ammo_type: nails
      dm_gate: dm_le_3
    notes: null

  - name: pickup_super_shotgun
    classname: weapon_supershotgun
    pickup_amount: 5
    respawn_seconds: 30
    source_ref: items.qc:596
    props:
      ammo_type: shells
      dm_gate: dm_le_3
    notes: null

  - name: pickup_rocket_launcher
    classname: weapon_rocketlauncher
    pickup_amount: 5
    respawn_seconds: 30
    source_ref: items.qc:604
    props:
      ammo_type: rockets
      dm_gate: dm_le_3
    notes: null

  - name: pickup_grenade_launcher
    classname: weapon_grenadelauncher
    pickup_amount: 5
    respawn_seconds: 30
    source_ref: items.qc:612
    props:
      ammo_type: rockets
      dm_gate: dm_le_3
    notes: null

  - name: pickup_lightning_gun
    classname: weapon_lightning
    pickup_amount: 15
    respawn_seconds: 30
    source_ref: items.qc:620
    props:
      ammo_type: cells
      dm_gate: dm_le_3
    notes: null
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.weapon-pickups curated (6 rows)"
```

---

### Task 6f: Items - backpack (1 row)

- [ ] **Step 1: Append the backpack row.**

```yaml
  - name: backpack
    classname: backpack
    duration_seconds: 120
    source_ref: items.qc:1656
    props:
      drop_rule: dropped_on_death_if_any_ammo_gt_0
      drop_rule_source_ref: items.qc:1614
      contents: current_weapon_plus_all_ammo
      contents_source_ref: items.qc:1620
    notes: 120s lifetime then auto-removed; pickup grants weapon + remaining ammo.
```

- [ ] **Step 2: Verify items count = 25.**

```bash
node -e "const y=require('js-yaml').load(require('fs').readFileSync('apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml','utf8')); console.log('items:', y.items.length)"
```

Expected: `items: 25`.

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 items.backpack curated; items section complete (25 rows)"
```

---

### Task 7: `mechanics.constants` (2 rows)

- [ ] **Step 1: Replace `constants:` placeholder.**

Only QC-defined constants live here. Engine-tunable cvars (`sv_maxspeed`, `sv_friction`, etc.) belong in the cvars table per the pre-plan and are NOT loaded.

```yaml
  constants:
    - name: sv_gravity_default
      value_numeric: 800
      source_ref: world.qc:182
      props:
        scope: worldspawn_default
        cvar_name: sv_gravity
        e1m8_override: 100
        e1m8_override_source_ref: world.qc:180
      notes: per-map override on e1m8 (boss fight). The cvar itself is tunable by the engine; this row captures the QC-side default set in worldspawn.

    - name: rocket_jump_multiplier_default
      value_numeric: 1
      source_ref: client.qc:517
      props:
        scope: worldspawn_default
        gate: infokey_rj
        applies_to: self_damage_knockback
      notes: rj=0 disables rocket jumping; rj=1 default; some servers set rj=2.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 mechanics.constants curated (2 rows; engine cvars deferred to cvar track)"
```

---

### Task 8: `mechanics.env_hazards` (7 rows)

- [ ] **Step 1: Replace `env_hazards:` placeholder.**

Note: `gib_threshold.source_ref` is `player.qc:598`, not client.qc. The `trigger_hurt` row (new in v4) is the void-brush mechanic -- mappers place a high-damage `trigger_hurt` brush at the bottom of out-of-bounds areas; armor and pent both DO apply (it's a normal `T_Damage` call), unlike telefrag/exit_level_kill which use 50000 damage to overwhelm them.

```yaml
  env_hazards:
    - name: lava
      source_ref: client.qc:825
      props:
        damage_per_tick_formula: 10_times_waterlevel
        damage_source_ref: client.qc:825
        tick_seconds_default: 0.2
        tick_seconds_default_source_ref: client.qc:823
        tick_seconds_with_biosuit: 1
        tick_seconds_with_biosuit_source_ref: client.qc:821
        biosuit_blocks: false
        biosuit_attenuates_via: radsuit_finished_gt_time
        biosuit_source_ref: client.qc:820
      notes: ticks 5x more often than slime; biosuit only slows ticks (does NOT block).

    - name: slime
      source_ref: client.qc:833
      props:
        damage_per_tick_formula: 4_times_waterlevel
        damage_source_ref: client.qc:833
        tick_seconds: 1
        tick_seconds_source_ref: client.qc:832
        biosuit_blocks: true
        biosuit_source_ref: client.qc:830
      notes: biosuit fully blocks slime damage.

    - name: drowning
      source_ref: client.qc:797
      props:
        grace_seconds: 12
        grace_source_ref: client.qc:466
        air_refill_when_waterlevel_lt_3: true
        air_refill_source_ref: client.qc:790
        starts_when: air_finished_lt_time
        starts_source_ref: client.qc:793
        damage_initial: 2
        damage_increment_per_tick: 2
        damage_cap: 10
        damage_source_ref: client.qc:797
        tick_seconds: 1
        tick_seconds_source_ref: client.qc:801
        biosuit_blocks: true
        biosuit_source_ref: client.qc:1089
      notes: 12s grace, then 1s ticks scaling 2->4->6->8->10 dmg.

    - name: fall_damage
      source_ref: client.qc:1146
      props:
        grace_velocity: -300
        grace_velocity_source_ref: client.qc:1139
        damage_threshold_velocity: -650
        damage_threshold_source_ref: client.qc:1143
        damage: 5
        damage_source_ref: client.qc:1146
        water_absorbs: true
        water_absorbs_source_ref: client.qc:1141
        deathtype: falling
      notes: flat 5 dmg above -650 velocity; water absorbs entirely.

    - name: crush_squish
      source_ref: plats.qc:114
      props:
        deathtype: squish
        delivery: T_Damage_with_squish_dtype
        squish_assigners:
          - plats.qc:114
          - plats.qc:227
          - doors.qc:34
          - doors.qc:683
        obituary_check_source_ref: client.qc:1268
      notes: damage value comes from the crushing entity (door/plat dmg field); often instakill if dmg unset. plats.qc:114 is the first concrete deathtype="squish" assignment; client.qc:1268 is the obituary-check site (where the deathtype string is read), not where it's set.

    - name: gib_threshold
      source_ref: player.qc:598
      props:
        threshold_health: -40
        models: [h_player, gib1, gib2, gib3]
        models_source_ref: player.qc:521
        gib_function: GibPlayer
        gib_function_source_ref: player.qc:600
      notes: when health drops below -40 player explodes into gibs instead of ragdoll. Lives in player.qc, not client.qc.

    - name: trigger_hurt
      source_ref: triggers.qc:548
      props:
        delivery: hurt_touch_calls_T_Damage_with_self_dmg
        damage_call_source_ref: triggers.qc:553
        default_damage: 5
        default_damage_source_ref: triggers.qc:571
        damage_value_origin: per_instance_set_by_mapper_in_entity_properties
        retrigger_seconds: 1
        retrigger_source_ref: triggers.qc:553
        applies_armor: true
        applies_pent: true
        common_uses: [void_brush_at_map_bottom, custom_hazard_areas, mapper_traps]
        relation_to_engine_out_of_world_z: well_built_maps_place_high_dmg_trigger_hurt_above_engine_z_floor_so_QC_path_runs_first
      notes: |
        Damage-dealing brush placed by the mapper. self.dmg is per-instance: a void brush
        with dmg=1000 instakills, a low-damage hazard area at default dmg=5 is just
        attrition. Unlike telefrag/exit_level_kill (50000 dmg), trigger_hurt damage goes
        through normal T_Damage so armor and pent both apply. There is no QC handler for
        engine-level out-of-world Z; instead, mappers put a trigger_hurt brush above the
        engine's hard Z floor to catch players first. This is what kills you when you
        jump into the void on most maps.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 env_hazards curated (7 rows incl. trigger_hurt void-brush mechanic)"
```

---

### Task 9: `mechanics.player_stats` (12 rows)

- [ ] **Step 1: Replace `player_stats:` placeholder.**

Note: `start_weapon_default.secondary_source_ref` is `client.qc:69` (parm1 = IT_SHOTGUN | IT_AXE; bitmask both flags on one line).

```yaml
  player_stats:
    - name: start_health
      value_numeric: 100
      source_ref: client.qc:459
      props: {}
      notes: standard DM starting health.

    - name: max_health
      value_numeric: 100
      source_ref: client.qc:464
      props: {}
      notes: clamps health on pickup of normal/rotten.

    - name: max_health_with_megahealth
      value_numeric: 250
      source_ref: items.qc:220
      props:
        decay_rule: minus_1_hp_per_second_back_to_max_health
        decay_rule_source_ref: items.qc:343
      notes: megahealth allows health > max_health up to 250 then decays.

    - name: start_ammo_shells
      value_numeric: 25
      source_ref: client.qc:72
      props: {}
      notes: null

    - name: start_ammo_nails
      value_numeric: 0
      source_ref: client.qc:73
      props: {}
      notes: null

    - name: start_ammo_rockets
      value_numeric: 0
      source_ref: client.qc:74
      props: {}
      notes: null

    - name: start_ammo_cells
      value_numeric: 0
      source_ref: client.qc:75
      props: {}
      notes: null

    - name: start_weapon_default
      value_text: shotgun_plus_axe
      source_ref: client.qc:69
      props:
        items_bitmask_source_ref: client.qc:69
      notes: parm1 = IT_SHOTGUN | IT_AXE (both items granted via bitmask OR on the same line).

    - name: view_offset_z
      value_numeric: 22
      source_ref: client.qc:502
      props:
        view_ofs_vec: [0, 0, 22]
      notes: eye height. Engine-side really; surfaced in QC default but often considered engine constant.

    - name: bbox_min
      value_text: "-16 -16 -24"
      source_ref: defs.qc:329
      props:
        vector: [-16, -16, -24]
      notes: VEC_HULL_MIN. Bounding box is engine-enforced.

    - name: bbox_max
      value_text: "16 16 32"
      source_ref: defs.qc:330
      props:
        vector: [16, 16, 32]
      notes: VEC_HULL_MAX.

    - name: knockback_factor
      value_numeric: 8
      source_ref: combat.qc:171
      props:
        formula: velocity_plus_eq_dir_times_damage_times_8
        rocket_jump_factor_via: infokey_rj
        rocket_jump_source_ref: combat.qc:174
      notes: knockback scales with damage. rj cvar multiplies self-damage knockback.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 player_stats curated (12 rows)"
```

---

### Task 10: `mechanics.powerup_behaviors` (3 rows)

- [ ] **Step 1: Replace `powerup_behaviors:` placeholder.**

```yaml
  powerup_behaviors:
    - name: quad_damage_multiplier
      value_numeric: 4
      source_ref: combat.qc:130
      props:
        if_check_source_ref: combat.qc:127
        dm4_multiplier: 8
        dm4_source_ref: combat.qc:128
        excludes_inflictor_classname: door
        exclusion_source_ref: combat.qc:126
      notes: door damage is NOT quaded. combat.qc:127 is the if(deathmatch==4) gate; line 128 is the *8 path; line 130 is the default *4 path.

    - name: pent_invulnerability_mechanic
      value_text: invincible_finished_gte_time_returns_before_T_Damage_applies
      source_ref: combat.qc:184
      props:
        hit_sound: items/protect3.wav
        hit_sound_source_ref: combat.qc:188
      notes: implementation is full damage absorb (not partial).

    - name: ring_invisibility_mechanic
      value_text: modelindex_eyes_when_invisible_finished_gt_zero
      source_ref: client.qc:991
      props:
        condition_source_ref: client.qc:955
      notes: client modelindex swap; partial visibility threshold is engine-side.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 powerup_behaviors curated (3 rows)"
```

---

### Task 11: `mechanics.armor_models` (1 row)

- [ ] **Step 1: Replace `armor_models:` placeholder.**

```yaml
  armor_models:
    - name: armor_absorb_formula
      value_text: save_eq_ceil_armortype_times_damage
      source_ref: combat.qc:134
      props:
        cap_rule: if_save_gte_armorvalue_then_save_eq_armorvalue_armor_depleted
        cap_source_ref: combat.qc:135
        remaining_damage_formula: take_eq_ceil_damage_minus_save
        remaining_source_ref: combat.qc:143
        absorb_pct_green: 0.3
        absorb_pct_yellow: 0.6
        absorb_pct_red: 0.8
      notes: armor depletes first, then health takes the remainder.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 armor_models curated (1 row)"
```

---

### Task 12: `mechanics.death_rules` (7 rows)

- [ ] **Step 1: Replace `death_rules:` placeholder.**

Note (v4): `telefrag` and `exit_level_kill` were a single conflated row in v1-v3. They are two distinct game rules -- same 50000 damage value, different triggers, different attacker classnames. Telefrag is the teleport-overlap mechanic at `triggers.qc:334`. Exit-level kill is the samelevel/noexit changelevel touch at `client.qc:230` (this is what kills you on e1m2's end teleporter in 4on4). Both ignore armor and pent (50000 overwhelms both).

```yaml
  death_rules:
    - name: telefrag
      value_numeric: 50000
      source_ref: triggers.qc:334
      props:
        trigger: teleport_destination_overlap
        delivery: teledeath_entity_T_Damage_50000
        damage_sites:
          - triggers.qc:334  # teledeath3 path, kills both occupants
          - triggers.qc:337  # teledeath3 path, owner branch
          - triggers.qc:343  # teledeath2 (Satan's-power) path, owner gets killed instead
          - triggers.qc:351  # default teleport_touch path
        teleport_touch_source_ref: triggers.qc:375
        teledeath_obit_classes: [teledeath, teledeath2, teledeath3]
        teledeath_obit_source_refs:
          teledeath: client.qc:1232
          teledeath2: client.qc:1244  # Satan's-power-deflects: pent reflects the kill back to attacker
          teledeath3: client.qc:1256
        no_deathtype_string: true
        attacker_classname_used_for_obit: true
      notes: |
        Real telefrag: when a player teleports onto another player, an invisible
        teledeath entity is spawned at the destination and deals 50000 damage to
        whoever's standing there. Pent has a special interaction: the teledeath2
        path at triggers.qc:343 routes the kill back to the would-be attacker
        (Satan's-power-deflects message), costing them a frag. No deathtype string
        is assigned; the obituary handler dispatches on attacker.classname.

    - name: exit_level_kill
      value_numeric: 50000
      source_ref: client.qc:230
      props:
        trigger: trigger_changelevel_touch_when_samelevel_eq_2_or_3
        trigger_source_ref: client.qc:228
        gate_check_history: ZOID_overloaded_samelevel_to_replace_original_quake_noexit
        gate_history_source_ref: client.qc:226
        attacker_classname: trigger_changelevel
        attacker_classname_obit_source_ref: client.qc:1489
        no_deathtype_string: true
        common_setting: 4on4_servers_running_single_player_maps_set_samelevel_to_2
        observable_example: jumping_into_end_of_level_teleporter_on_e1m2_in_4on4
      notes: |
        Distinct from telefrag despite the same 50000 damage. This is the rule
        that kills you when you touch a trigger_changelevel brush on a server
        with samelevel=2 (or samelevel=3 on non-start maps). Most servers running
        single-player maps in QW deathmatch enable this so randos can't advance
        the map mid-match. The obituary reads attacker.classname=='trigger_changelevel'
        -- same dispatch model as telefrag but different attacker class.

    - name: friendly_fire_teamplay_0
      value_text: all_damage_applies
      source_ref: combat.qc:199
      props:
        teamplay_value: 0
      notes: free-for-all.

    - name: friendly_fire_teamplay_1
      value_text: same_team_damage_blocked
      source_ref: combat.qc:199
      props:
        teamplay_value: 1
        condition: targ_neq_attacker_AND_team_match_AND_team_nonempty
      notes: standard teamplay 1.

    - name: friendly_fire_teamplay_2
      value_text: same_team_damage_blocked_with_neg_frag_penalty
      source_ref: client.qc:1336
      props:
        teamplay_value: 2
        penalty_frags: -1
      notes: teamkill costs 1 frag.

    - name: friendly_fire_teamplay_3
      value_text: same_team_damage_blocked
      source_ref: combat.qc:204
      props:
        teamplay_value: 3
      notes: similar to 1; specific QW variant.

    - name: deathtype_enum
      value_text: nail|supernail|rocket|falling|squish|selfwater|laser
      source_ref: weapons.qc:796
      props:
        sources:
          nail: weapons.qc:796
          supernail: weapons.qc:843
          rocket: weapons.qc:389
          falling: client.qc:1145
          squish: plats.qc:114
          selfwater: weapons.qc:538
          laser: misc.qc:319
        squish_additional_sites: [plats.qc:227, doors.qc:34, doors.qc:683]
        no_grenade_deathtype: true
        no_ax_deathtype: true
        ax_uses_axhitme_boolean_instead: defs.qc:516
      notes: 7 deathtypes total. There is NO "ax" deathtype (axe uses axhitme boolean at defs.qc:516, set at weapons.qc:52). There is NO "grenade" deathtype (grenade explosion goes through T_RadiusDamage which assigns "rocket" downstream). "laser" exists in misc.qc:319 (laser-trap entities).
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 death_rules curated (7 rows; telefrag/exit_level_kill split)"
```

---

### Task 13: `mechanics.spawn_rules` (5 rows)

- [ ] **Step 1: Replace `spawn_rules:` placeholder.**

Note: `spawn_invul_default.source_ref` is `client.qc:471` (line 470 is `invisible_finished`, line 471 is `invincible_finished`).

```yaml
  spawn_rules:
    - name: spawn_invul_default
      value_numeric: 0
      source_ref: client.qc:471
      props:
        applies_when: deathmatch_le_3
      notes: no spawn invul in DM<=3. Line 470 in client.qc is invisible_finished=0; line 471 is invincible_finished=0.

    - name: spawn_invul_dm4
      value_numeric: 3
      source_ref: client.qc:544
      props:
        applies_when: deathmatch_eq_4
      notes: 3-second invul on spawn in OctaPower mode.

    - name: spawn_invul_dm5
      value_numeric: 3
      source_ref: client.qc:565
      props:
        applies_when: deathmatch_eq_5
      notes: 3-second invul on spawn in Quadmachine mode.

    - name: respawn_button_press
      value_text: respawn_on_button_press_after_DEAD_RESPAWNABLE
      source_ref: client.qc:728
      props: {}
      notes: id1 respawn requires +attack/+jump press; no auto-respawn timer.

    - name: intermission_exit_delay
      value_numeric: 5
      source_ref: client.qc:189
      props: {}
      notes: 5-second wait after intermission before any player can advance.
```

- [ ] **Step 2: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 spawn_rules curated (5 rows; invul_default at client.qc:471 not 470)"
```

---

### Task 14: `mechanics.dm_mode_rules` (4 rows)

- [ ] **Step 1: Replace `dm_mode_rules:` placeholder.**

Note: DM4 255-ammo + extra-weapons block is gated by `if (stof(infokey(world,"axe")) == 0)`. Axe-mode DM4 servers do NOT get the 255s.

```yaml
  dm_mode_rules:
    - name: dm2_rules
      value_text: respawn_30s_ammo_no_health_respawn
      source_ref: items.qc:411
      props:
        ammo_respawn_seconds: 30
        ammo_respawn_source_ref: items.qc:868
        no_health_respawn: true
      notes: classic deathmatch mode 2.

    - name: dm3_rules
      value_text: 15s_ammo_respawn
      source_ref: items.qc:872
      props:
        ammo_respawn_seconds: 15
      notes: half ammo respawn time.

    - name: dm4_rules
      value_text: octapower
      source_ref: client.qc:522
      props:
        start_health: 250
        start_health_source_ref: client.qc:541
        start_armor_value: 200
        start_armor_value_source_ref: client.qc:539
        start_armortype: 0.8
        start_armortype_source_ref: client.qc:540
        spawn_invul_seconds: 3
        spawn_invul_source_ref: client.qc:544
        loadout_axe_mode_off:
          gate: infokey_axe_eq_0
          gate_source_ref: client.qc:525
          all_weapons_minus_gl: true
          all_weapons_source_ref: client.qc:531
          start_ammo_all_types: 255
          start_ammo_source_ref: client.qc:527
        loadout_axe_mode_on:
          gate: infokey_axe_neq_0
          start_weapons: shotgun_plus_axe_only
          start_ammo: default_25_shells
          notes: axe-mode DM4 inherits the same 250hp/200armor/3s-invul block but skips the 255-ammo + extra-weapons grant.
        quad_multiplier: 8
        quad_multiplier_source_ref: combat.qc:128
        lg_water_self_damage: 4000
        lg_water_source_ref: weapons.qc:539
        backpack_bonus_health: 10
        backpack_bonus_source_ref: items.qc:1475
        bonus_health_threshold: 299
        bonus_threshold_source_ref: items.qc:1484
      notes: DM4 OctaPower preset. The 255-ammo block is gated by the worldspawn 'axe' infokey.

    - name: dm5_rules
      value_text: quadmachine
      source_ref: client.qc:548
      props:
        start_health: 200
        start_health_source_ref: client.qc:562
        start_armor_value: 200
        start_armor_value_source_ref: client.qc:560
        start_armortype: 0.8
        start_armortype_source_ref: client.qc:561
        spawn_invul_seconds: 3
        spawn_invul_source_ref: client.qc:565
        all_weapons: true
        all_weapons_source_ref: client.qc:553
        start_ammo_nails: 80
        start_ammo_nails_source_ref: client.qc:549
        start_ammo_shells: 30
        start_ammo_shells_source_ref: client.qc:550
        start_ammo_rockets: 10
        start_ammo_rockets_source_ref: client.qc:551
        start_ammo_cells: 30
        start_ammo_cells_source_ref: client.qc:552
        ammo_respawn_seconds: 15
        ammo_respawn_source_ref: items.qc:872
      notes: DM5 Quadmachine preset.
```

- [ ] **Step 2: Final YAML grand-total verification.**

```bash
node -e "
const y = require('js-yaml').load(require('fs').readFileSync('apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml','utf8'));
const counts = {
  weapons: y.weapons.length,
  projectiles: y.projectiles.length,
  items: y.items.length,
  constants: y.mechanics.constants.length,
  env_hazards: y.mechanics.env_hazards.length,
  player_stats: y.mechanics.player_stats.length,
  powerup_behaviors: y.mechanics.powerup_behaviors.length,
  armor_models: y.mechanics.armor_models.length,
  death_rules: y.mechanics.death_rules.length,
  spawn_rules: y.mechanics.spawn_rules.length,
  dm_mode_rules: y.mechanics.dm_mode_rules.length,
};
const entities = counts.weapons + counts.projectiles + counts.items;
const mechanics = counts.constants + counts.env_hazards + counts.player_stats + counts.powerup_behaviors + counts.armor_models + counts.death_rules + counts.spawn_rules + counts.dm_mode_rules;
console.log(counts);
console.log({ entities, mechanics, total: entities + mechanics });
"
```

Expected:

```
{ weapons: 8, projectiles: 4, items: 25, constants: 2, env_hazards: 7, player_stats: 12, powerup_behaviors: 3, armor_models: 1, death_rules: 7, spawn_rules: 5, dm_mode_rules: 4 }
{ entities: 37, mechanics: 41, total: 78 }
```

If any sub-count diverges, fix that section before proceeding. Do NOT proceed past this point with mismatched counts; the loader's stop-condition gate (Task 15) requires exactly 37 entities + 41 mechanics.

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/scripts/extractors/qw/seeds/id1-gameplay.yaml
git commit -m "feat(qw-oracle): id1 dm_mode_rules curated; YAML inventory complete (78 rows; DM4 255-ammo gated by axe infokey; telefrag/exit_level_kill split + trigger_hurt env_hazard)"
```

---

## Phase 3 - Loader

### Task 15: Implement `load-gameplay.ts` mirroring `load-maps.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts`

The loader takes an existing `db` handle (the CLI in Task 16 opens via `openKnowledgeDb()`). It does NOT call `applySchema` (the CLI handles that). Result shape matches `LoadMapsResult` (`inserted` + `updated` + `total`), separated for entities vs mechanics.

- [ ] **Step 1: Write the loader.**

Create `apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts`:

```typescript
// Loader for the gameplay_sources / gameplay_entity_defs / gameplay_mechanics
// tables. Reads scripts/extractors/qw/seeds/id1-gameplay.yaml and upserts every
// row in a single transaction. Idempotent (relies on ruleset_gate_json being
// NOT NULL DEFAULT '{}' so the unique index has no NULL columns; see schema.ts
// SCHEMA_V14_ADDITIONS_SQL comment for rationale).

import { readFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import type Database from 'better-sqlite3';

interface GameplaySourceRow {
  id: string;
  display_name: string;
  description: string;
  source_root: string;
  notes?: string | null;
}

interface EntityDefRow {
  name: string;
  classname?: string | null;
  damage?: number | null;
  splash_damage?: number | null;
  splash_radius?: number | null;
  refire_seconds?: number | null;
  respawn_seconds?: number | null;
  pickup_amount?: number | null;
  max_carry?: number | null;
  duration_seconds?: number | null;
  ruleset_gate?: Record<string, unknown> | null;
  source_ref: string;
  props?: Record<string, unknown>;
  notes?: string | null;
}

interface MechanicRow {
  name: string;
  value_numeric?: number | null;
  value_text?: string | null;
  ruleset_gate?: Record<string, unknown> | null;
  source_ref: string;
  props?: Record<string, unknown>;
  notes?: string | null;
}

export interface SeedFile {
  gameplay_source: GameplaySourceRow;
  weapons: EntityDefRow[];
  projectiles: EntityDefRow[];
  items: EntityDefRow[];
  mechanics: {
    constants: MechanicRow[];
    env_hazards: MechanicRow[];
    player_stats: MechanicRow[];
    powerup_behaviors: MechanicRow[];
    armor_models: MechanicRow[];
    death_rules: MechanicRow[];
    spawn_rules: MechanicRow[];
    dm_mode_rules: MechanicRow[];
  };
}

export interface LoadGameplayResult {
  inserted: { entities: number; mechanics: number };
  updated: { entities: number; mechanics: number };
  total: { entities: number; mechanics: number };
}

const ENTITY_KIND_BY_LIST: Record<'weapons' | 'projectiles' | 'items', 'item' | 'weapon' | 'projectile'> = {
  weapons: 'weapon',
  projectiles: 'projectile',
  items: 'item',
};

const MECHANIC_KIND_BY_LIST: Record<string, string> = {
  constants: 'constant',
  env_hazards: 'env_hazard',
  player_stats: 'player_stat',
  powerup_behaviors: 'powerup_behavior',
  armor_models: 'armor_model',
  death_rules: 'death_rule',
  spawn_rules: 'spawn_rule',
  dm_mode_rules: 'dm_mode_rule',
};

// Canonicalise object key order so the same logical gate always serialises
// identically. The unique index keys on the literal string, so {a:1,b:2}
// and {b:2,a:1} would otherwise produce two rows.
function canonicaliseGate(gate: Record<string, unknown> | null | undefined): string {
  if (!gate || Object.keys(gate).length === 0) return '{}';
  const sortedKeys = Object.keys(gate).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) ordered[k] = gate[k];
  return JSON.stringify(ordered);
}

export function loadGameplayFromArray(db: Database.Database, seed: SeedFile): LoadGameplayResult {
  const upsertSource = db.prepare(`
    INSERT INTO gameplay_sources (id, display_name, description, source_root, notes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      display_name = excluded.display_name,
      description  = excluded.description,
      source_root  = excluded.source_root,
      notes        = excluded.notes
  `);

  const existsEntity = db.prepare(`
    SELECT 1 FROM gameplay_entity_defs
    WHERE gameplay_source_id = ? AND kind = ? AND name = ? AND ruleset_gate_json = ?
  `);
  const existsMechanic = db.prepare(`
    SELECT 1 FROM gameplay_mechanics
    WHERE gameplay_source_id = ? AND kind = ? AND name = ? AND ruleset_gate_json = ?
  `);

  const upsertEntity = db.prepare(`
    INSERT INTO gameplay_entity_defs (
      gameplay_source_id, kind, name, classname,
      damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
      pickup_amount, max_carry, duration_seconds,
      ruleset_gate_json, source_ref, props_json, notes
    ) VALUES (
      @gameplay_source_id, @kind, @name, @classname,
      @damage, @splash_damage, @splash_radius, @refire_seconds, @respawn_seconds,
      @pickup_amount, @max_carry, @duration_seconds,
      @ruleset_gate_json, @source_ref, @props_json, @notes
    )
    ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
      classname = excluded.classname,
      damage = excluded.damage,
      splash_damage = excluded.splash_damage,
      splash_radius = excluded.splash_radius,
      refire_seconds = excluded.refire_seconds,
      respawn_seconds = excluded.respawn_seconds,
      pickup_amount = excluded.pickup_amount,
      max_carry = excluded.max_carry,
      duration_seconds = excluded.duration_seconds,
      source_ref = excluded.source_ref,
      props_json = excluded.props_json,
      notes = excluded.notes
  `);

  const upsertMechanic = db.prepare(`
    INSERT INTO gameplay_mechanics (
      gameplay_source_id, kind, name, value_numeric, value_text,
      ruleset_gate_json, source_ref, props_json, notes
    ) VALUES (
      @gameplay_source_id, @kind, @name, @value_numeric, @value_text,
      @ruleset_gate_json, @source_ref, @props_json, @notes
    )
    ON CONFLICT (gameplay_source_id, kind, name, ruleset_gate_json) DO UPDATE SET
      value_numeric = excluded.value_numeric,
      value_text = excluded.value_text,
      source_ref = excluded.source_ref,
      props_json = excluded.props_json,
      notes = excluded.notes
  `);

  const result: LoadGameplayResult = {
    inserted: { entities: 0, mechanics: 0 },
    updated: { entities: 0, mechanics: 0 },
    total: { entities: 0, mechanics: 0 },
  };

  const txn = db.transaction(() => {
    upsertSource.run(
      seed.gameplay_source.id,
      seed.gameplay_source.display_name,
      seed.gameplay_source.description,
      seed.gameplay_source.source_root,
      seed.gameplay_source.notes ?? null,
    );

    for (const listName of ['weapons', 'projectiles', 'items'] as const) {
      const kind = ENTITY_KIND_BY_LIST[listName];
      const rows = seed[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const wasExisting = !!existsEntity.get(seed.gameplay_source.id, kind, row.name, gateJson);
        upsertEntity.run({
          gameplay_source_id: seed.gameplay_source.id,
          kind,
          name: row.name,
          classname: row.classname ?? null,
          damage: row.damage ?? null,
          splash_damage: row.splash_damage ?? null,
          splash_radius: row.splash_radius ?? null,
          refire_seconds: row.refire_seconds ?? null,
          respawn_seconds: row.respawn_seconds ?? null,
          pickup_amount: row.pickup_amount ?? null,
          max_carry: row.max_carry ?? null,
          duration_seconds: row.duration_seconds ?? null,
          ruleset_gate_json: gateJson,
          source_ref: row.source_ref,
          props_json: JSON.stringify(row.props ?? {}),
          notes: row.notes ?? null,
        });
        if (wasExisting) result.updated.entities++; else result.inserted.entities++;
        result.total.entities++;
      }
    }

    for (const listName of Object.keys(MECHANIC_KIND_BY_LIST)) {
      const kind = MECHANIC_KIND_BY_LIST[listName];
      const rows = (seed.mechanics as Record<string, MechanicRow[]>)[listName] ?? [];
      for (const row of rows) {
        const gateJson = canonicaliseGate(row.ruleset_gate);
        const wasExisting = !!existsMechanic.get(seed.gameplay_source.id, kind, row.name, gateJson);
        upsertMechanic.run({
          gameplay_source_id: seed.gameplay_source.id,
          kind,
          name: row.name,
          value_numeric: row.value_numeric ?? null,
          value_text: row.value_text ?? null,
          ruleset_gate_json: gateJson,
          source_ref: row.source_ref,
          props_json: JSON.stringify(row.props ?? {}),
          notes: row.notes ?? null,
        });
        if (wasExisting) result.updated.mechanics++; else result.inserted.mechanics++;
        result.total.mechanics++;
      }
    }
  });
  txn();
  return result;
}

export function loadGameplayFromFile(db: Database.Database, yamlPath: string): LoadGameplayResult {
  const seed = yaml.load(readFileSync(yamlPath, 'utf-8')) as SeedFile;
  return loadGameplayFromArray(db, seed);
}
```

- [ ] **Step 2: Typecheck.**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
git commit -m "feat(qw-oracle): load-gameplay loader (db-handle arg, mirrors load-maps shape)"
```

---

### Task 16: Wire `load-gameplay` into the index CLI

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Read the existing dispatcher pattern.**

```bash
grep -nE "(case 'load-maps'|runLoadMaps|usageAndExit|case 'load-)" apps/qw-oracle/scripts/load-knowledge/index.ts | head -20
```

- [ ] **Step 2: Add the `runLoadGameplay` function alongside `runLoadMaps`.**

After `runLoadMaps` (around line 510), insert:

```typescript
async function runLoadGameplay(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      yaml: { type: 'string' },
    },
  });

  const yamlPath = values.yaml ?? join(__dirname, '..', 'extractors', 'qw', 'seeds', 'id1-gameplay.yaml');
  const { loadGameplayFromFile } = await import('./load-gameplay.js');
  const db = openKnowledgeDb();
  try {
    const r = loadGameplayFromFile(db, yamlPath);
    console.log(
      `load-gameplay: entities inserted=${r.inserted.entities} updated=${r.updated.entities} total=${r.total.entities}; ` +
      `mechanics inserted=${r.inserted.mechanics} updated=${r.updated.mechanics} total=${r.total.mechanics}`,
    );

    const expectedEntities = 37;
    const expectedMechanics = 41;
    if (r.total.entities !== expectedEntities || r.total.mechanics !== expectedMechanics) {
      console.error(
        `load-gameplay: STOP - row-count mismatch. Expected entities=${expectedEntities} mechanics=${expectedMechanics}. ` +
        `Got entities=${r.total.entities} mechanics=${r.total.mechanics}. Investigate the YAML before re-running.`,
      );
      process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}
```

- [ ] **Step 3: Add the dispatcher branch.**

The dispatcher in `main()` is a chain of `if (subcommand === 'X') { await runX(rest); return; }` blocks (NOT a switch). Find the `if (subcommand === 'load-maps') { ... }` block (around index.ts:73-76) and add this block immediately after it, before the `'full'` block:

```typescript
  if (subcommand === 'load-gameplay') {
    await runLoadGameplay(rest);
    return;
  }
```

- [ ] **Step 4: Add the help-text entry in `usageAndExit`** (around index.ts:85-123).

Existing entries are two-line: subcommand+args on one line, indented description below. Match exactly. Add this block after the existing `load-maps` entry:

```
  load-gameplay [--yaml <path>]
                Load id1 game-mechanics seed YAML (37 entity defs + 41
                mechanics) into gameplay_* tables (schema v14). Defaults
                to scripts/extractors/qw/seeds/id1-gameplay.yaml.
```

- [ ] **Step 5: Run the loader against the live DB.**

```bash
npm run load-knowledge -- load-gameplay
```

Expected output:

```
load-gameplay: entities inserted=37 updated=0 total=37; mechanics inserted=41 updated=0 total=41
```

- [ ] **Step 6: Run again to verify idempotency.**

```bash
npm run load-knowledge -- load-gameplay
```

Expected output (note: now all updated, none inserted):

```
load-gameplay: entities inserted=0 updated=37 total=37; mechanics inserted=0 updated=41 total=41
```

If the second run shows `inserted=37` again, the unique-index/upsert design is broken; stop and investigate.

- [ ] **Step 7: Verify rows are queryable from the live DB.**

```bash
sqlite3 data/knowledge.db "SELECT name, damage, splash_damage, splash_radius, refire_seconds, source_ref FROM gameplay_entity_defs WHERE name='rocket_launcher';"
sqlite3 data/knowledge.db "SELECT name, respawn_seconds, duration_seconds, source_ref FROM gameplay_entity_defs WHERE name='quad_damage';"
sqlite3 data/knowledge.db "SELECT name, value_numeric, source_ref FROM gameplay_mechanics WHERE kind='env_hazard';"
sqlite3 data/knowledge.db "SELECT (SELECT COUNT(*) FROM gameplay_entity_defs) AS e, (SELECT COUNT(*) FROM gameplay_mechanics) AS m;"
```

Expected:
- rocket_launcher: damage 110, splash 120, splash_radius 160, refire 0.8, source_ref weapons.qc:385
- quad_damage: respawn 60, duration 30, source_ref items.qc:1417
- env_hazard rows include lava, slime, drowning, fall_damage, crush_squish, gib_threshold, trigger_hurt (gib row's source_ref must be `player.qc:598`, not client.qc; trigger_hurt at triggers.qc:548)
- counts: e=37, m=41

- [ ] **Step 8: Commit.**

```bash
git add apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): wire load-gameplay into load-knowledge CLI with row-count gate"
```

---

## Phase 4 - MCP tools

The MCP server uses `bun:sqlite` (not `better-sqlite3`) because the native module does not load under Bun. Tool functions take a `Database` from `bun:sqlite` and use `db.query(sql).get()` / `.all()`. Filenames are kebab-case; the function exported is camelCase. Tools are registered via inline object literals in `index.ts`'s `tools: [...]` array, NOT via separate Tool exports.

### Task 17: Implement `lookup-gameplay-entity.ts`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts`

- [ ] **Step 1: Read the canonical `lookup-map.ts` once more to verify shape.**

```bash
cat apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts | head -50
```

- [ ] **Step 2: Write the tool.**

Create `apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts`. Note: every existing MCP tool returns a `meta: { tool, server_version, queried_at }` block; new tools must too. The inline `const SERVER_VERSION` matches the existing-tool pattern (six tool files have their own); Task 22 later deduplicates all 10 occurrences into a single import from `version.ts`.

```typescript
import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type LookupGameplayEntityArgs = {
  name: string;
  gameplay_source?: string;
};

export interface GameplayEntityRow {
  gameplay_source_id: string;
  kind: 'item' | 'weapon' | 'projectile';
  name: string;
  classname: string | null;
  damage: number | null;
  splash_damage: number | null;
  splash_radius: number | null;
  refire_seconds: number | null;
  respawn_seconds: number | null;
  pickup_amount: number | null;
  max_carry: number | null;
  duration_seconds: number | null;
  ruleset_gate_json: string;
  source_ref: string;
  props_json: string;
  notes: string | null;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export type LookupGameplayEntityResponse =
  | { found: false; message: string; meta: Meta }
  | {
      found: true;
      entity: Omit<GameplayEntityRow, 'props_json' | 'ruleset_gate_json'> & {
        props: Record<string, unknown>;
        ruleset_gate: Record<string, unknown>;
      };
      meta: Meta;
    };

export function lookupGameplayEntity(db: Database, args: LookupGameplayEntityArgs): LookupGameplayEntityResponse {
  const meta: Meta = {
    tool: 'lookup_gameplay_entity',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const row = db
    .query(`
      SELECT
        gameplay_source_id, kind, name, classname,
        damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
        pickup_amount, max_carry, duration_seconds,
        ruleset_gate_json, source_ref, props_json, notes
      FROM gameplay_entity_defs
      WHERE name = ? COLLATE NOCASE
        AND gameplay_source_id = ?
      ORDER BY length(ruleset_gate_json) ASC, ruleset_gate_json
      LIMIT 1
    `)
    .get(args.name, source) as GameplayEntityRow | null;

  if (!row) {
    return {
      found: false,
      message: `No gameplay entity named '${args.name}' in source '${source}'.`,
      meta,
    };
  }
  const { props_json, ruleset_gate_json, ...rest } = row;
  return {
    found: true,
    entity: {
      ...rest,
      props: JSON.parse(props_json),
      ruleset_gate: JSON.parse(ruleset_gate_json),
    },
    meta,
  };
}
```

- [ ] **Step 3: Typecheck.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
```

- [ ] **Step 4: Commit.**

```bash
git add apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts
git commit -m "feat(qw-oracle): MCP lookup_gameplay_entity tool"
```

---

### Task 18: Implement `lookup-mechanic.ts`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts`

- [ ] **Step 1: Write the tool.**

Create `apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts`:

```typescript
import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type LookupMechanicArgs = {
  name: string;
  gameplay_source?: string;
};

export interface GameplayMechanicRow {
  gameplay_source_id: string;
  kind: string;
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  ruleset_gate_json: string;
  source_ref: string;
  props_json: string;
  notes: string | null;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export type LookupMechanicResponse =
  | { found: false; message: string; meta: Meta }
  | {
      found: true;
      mechanic: Omit<GameplayMechanicRow, 'props_json' | 'ruleset_gate_json'> & {
        props: Record<string, unknown>;
        ruleset_gate: Record<string, unknown>;
      };
      meta: Meta;
    };

export function lookupMechanic(db: Database, args: LookupMechanicArgs): LookupMechanicResponse {
  const meta: Meta = {
    tool: 'lookup_mechanic',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const row = db
    .query(`
      SELECT gameplay_source_id, kind, name, value_numeric, value_text,
             ruleset_gate_json, source_ref, props_json, notes
      FROM gameplay_mechanics
      WHERE name = ? COLLATE NOCASE
        AND gameplay_source_id = ?
      ORDER BY length(ruleset_gate_json) ASC, ruleset_gate_json
      LIMIT 1
    `)
    .get(args.name, source) as GameplayMechanicRow | null;

  if (!row) {
    return {
      found: false,
      message: `No mechanic named '${args.name}' in source '${source}'.`,
      meta,
    };
  }
  const { props_json, ruleset_gate_json, ...rest } = row;
  return {
    found: true,
    mechanic: {
      ...rest,
      props: JSON.parse(props_json),
      ruleset_gate: JSON.parse(ruleset_gate_json),
    },
    meta,
  };
}
```

- [ ] **Step 2: Typecheck + commit.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
git add apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts
git commit -m "feat(qw-oracle): MCP lookup_mechanic tool"
```

---

### Task 19: Implement `search-gameplay-entities.ts`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts`

- [ ] **Step 1: Read `search-maps.ts` for the multi-filter pattern.**

```bash
head -60 apps/qw-oracle/serve/mcp/src/tools/search-maps.ts
```

- [ ] **Step 2: Write the tool.**

Create `apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts`:

```typescript
import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type SearchGameplayEntitiesArgs = {
  query?: string;
  kind?: 'item' | 'weapon' | 'projectile';
  has_splash?: boolean;
  min_damage?: number;
  max_damage?: number;
  min_respawn?: number;
  max_respawn?: number;
  ammo_type?: 'shells' | 'nails' | 'rockets' | 'cells';
  gameplay_source?: string;
  limit?: number;
};

export interface SearchGameplayEntityRow {
  kind: string;
  name: string;
  classname: string | null;
  damage: number | null;
  splash_damage: number | null;
  splash_radius: number | null;
  refire_seconds: number | null;
  respawn_seconds: number | null;
  pickup_amount: number | null;
  duration_seconds: number | null;
  source_ref: string;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export interface SearchGameplayEntitiesResponse {
  rows: SearchGameplayEntityRow[];
  count: number;
  truncated: boolean;
  meta: Meta;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

export function searchGameplayEntities(db: Database, args: SearchGameplayEntitiesArgs): SearchGameplayEntitiesResponse {
  const meta: Meta = {
    tool: 'search_gameplay_entities',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const where: string[] = ['gameplay_source_id = ?'];
  const params: unknown[] = [source];

  if (args.query) {
    where.push('(name LIKE ? COLLATE NOCASE OR classname LIKE ? COLLATE NOCASE)');
    const q = `%${args.query}%`;
    params.push(q, q);
  }
  if (args.kind) { where.push('kind = ?'); params.push(args.kind); }
  if (args.has_splash === true)  { where.push('splash_damage IS NOT NULL AND splash_damage > 0'); }
  if (args.has_splash === false) { where.push('(splash_damage IS NULL OR splash_damage = 0)'); }
  if (typeof args.min_damage === 'number') { where.push('damage >= ?'); params.push(args.min_damage); }
  if (typeof args.max_damage === 'number') { where.push('damage <= ?'); params.push(args.max_damage); }
  if (typeof args.min_respawn === 'number') { where.push('respawn_seconds >= ?'); params.push(args.min_respawn); }
  if (typeof args.max_respawn === 'number') { where.push('respawn_seconds <= ?'); params.push(args.max_respawn); }
  if (args.ammo_type) {
    where.push("json_extract(props_json, '$.ammo_type') = ?");
    params.push(args.ammo_type);
  }

  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const sql = `
    SELECT kind, name, classname, damage, splash_damage, splash_radius,
           refire_seconds, respawn_seconds, pickup_amount, duration_seconds, source_ref
    FROM gameplay_entity_defs
    WHERE ${where.join(' AND ')}
    ORDER BY kind, name
    LIMIT ?
  `;
  params.push(limit + 1);
  const rowsPlusOne = db.query(sql).all(...params as never[]) as SearchGameplayEntityRow[];
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);
  return { rows, count: rows.length, truncated, meta };
}
```

- [ ] **Step 3: Typecheck + commit.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
git add apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts
git commit -m "feat(qw-oracle): MCP search_gameplay_entities tool"
```

---

### Task 20: Implement `search-mechanics.ts`

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts`

- [ ] **Step 1: Write the tool.**

Create `apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts`:

```typescript
import type { Database } from 'bun:sqlite';

const SERVER_VERSION = '0.4.0';

export type SearchMechanicsArgs = {
  query?: string;
  kind?: 'constant' | 'env_hazard' | 'player_stat' | 'powerup_behavior'
       | 'armor_model' | 'death_rule' | 'spawn_rule' | 'dm_mode_rule';
  gameplay_source?: string;
  limit?: number;
};

export interface SearchMechanicsRow {
  kind: string;
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  source_ref: string;
}

interface Meta {
  tool: string;
  server_version: string;
  queried_at: string;
}

export interface SearchMechanicsResponse {
  rows: SearchMechanicsRow[];
  count: number;
  truncated: boolean;
  meta: Meta;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

export function searchMechanics(db: Database, args: SearchMechanicsArgs): SearchMechanicsResponse {
  const meta: Meta = {
    tool: 'search_mechanics',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };
  const source = args.gameplay_source ?? 'id1';
  const where: string[] = ['gameplay_source_id = ?'];
  const params: unknown[] = [source];

  if (args.query) {
    where.push('(name LIKE ? COLLATE NOCASE OR value_text LIKE ? COLLATE NOCASE OR notes LIKE ? COLLATE NOCASE)');
    const q = `%${args.query}%`;
    params.push(q, q, q);
  }
  if (args.kind) { where.push('kind = ?'); params.push(args.kind); }

  const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const sql = `
    SELECT kind, name, value_numeric, value_text, source_ref
    FROM gameplay_mechanics
    WHERE ${where.join(' AND ')}
    ORDER BY kind, name
    LIMIT ?
  `;
  params.push(limit + 1);
  const rowsPlusOne = db.query(sql).all(...params as never[]) as SearchMechanicsRow[];
  const truncated = rowsPlusOne.length > limit;
  const rows = rowsPlusOne.slice(0, limit);
  return { rows, count: rows.length, truncated, meta };
}
```

- [ ] **Step 2: Typecheck + commit.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
git add apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts
git commit -m "feat(qw-oracle): MCP search_mechanics tool"
```

---

### Task 21: Wire all four tools into the MCP server

**Files:**
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`

- [ ] **Step 1: Add imports.** After the `import { searchMaps }...` line (around index.ts:14), add:

```typescript
import { lookupGameplayEntity } from './tools/lookup-gameplay-entity.ts';
import { lookupMechanic } from './tools/lookup-mechanic.ts';
import { searchGameplayEntities } from './tools/search-gameplay-entities.ts';
import { searchMechanics } from './tools/search-mechanics.ts';
import type { SearchGameplayEntitiesArgs } from './tools/search-gameplay-entities.ts';
import type { SearchMechanicsArgs } from './tools/search-mechanics.ts';
```

- [ ] **Step 2: Add four tool definitions to the `tools: [...]` array.**

Find the closing `}` of the `search_maps` tool definition (around index.ts:208). Insert these four new tool objects immediately before the closing `]` of the `tools:` array:

```typescript
    {
      name: 'lookup_gameplay_entity',
      description:
        'Look up a QuakeWorld game entity (weapon, projectile, item pickup) by name. Returns damage, splash, refire, respawn, ammo, classname, source_ref pointing at the canonical id1 QuakeC line, and any ruleset gate. Case-insensitive. Names use snake_case: rocket_launcher, super_shotgun, megahealth_100, red_armor, quad_damage, pentagram, ring_of_shadows, biosuit, shells_small, pickup_lightning_gun, etc. For a topical search ("which weapons have splash damage", "all powerups with respawn > 60s"), use search_gameplay_entities. For game rules (lava damage, fall damage, telefrag), use lookup_mechanic.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Entity name. Case-insensitive snake_case.' },
          gameplay_source: { type: 'string', description: 'Defaults to id1.' },
        },
        required: ['name'],
      },
    },
    {
      name: 'lookup_mechanic',
      description:
        'Look up a QuakeWorld game-mechanics rule by name. Returns the rule\'s value, kind (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule), source_ref pointing at the canonical id1 QuakeC line, and any ruleset gate. Examples: lava, slime, drowning, fall_damage, telefrag, quad_damage_multiplier, armor_absorb_formula, sv_gravity_default, spawn_invul_dm4, dm4_rules. Case-insensitive. To enumerate by category use search_mechanics with kind filter; for a specific weapon/item use lookup_gameplay_entity.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Mechanic name. Case-insensitive.' },
          gameplay_source: { type: 'string', description: 'Defaults to id1.' },
        },
        required: ['name'],
      },
    },
    {
      name: 'search_gameplay_entities',
      description:
        'Filter QuakeWorld game entities (weapons, projectiles, item pickups) by kind, damage range, splash, ammo type, respawn time, or substring match on name/classname. Returns compact rows ordered by kind+name. Use this for "which weapons have splash damage" (has_splash:true), "all rockets/grenade ammo" (kind:item, ammo_type:rockets), "powerups with respawn > 60s" (kind:item, min_respawn:60), or partial-name search ("rocket" -> rocket_launcher + rocket projectile + rockets_small/large pickups). For full record details follow up with lookup_gameplay_entity.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Substring match on name or classname (case-insensitive).' },
          kind: { type: 'string', enum: ['item', 'weapon', 'projectile'], description: 'Restrict to one kind.' },
          has_splash: { type: 'boolean', description: 'Match entities with splash damage > 0 (true) or without (false).' },
          min_damage: { type: 'number', description: 'Minimum damage column value.' },
          max_damage: { type: 'number', description: 'Maximum damage column value.' },
          min_respawn: { type: 'number', description: 'Minimum respawn_seconds.' },
          max_respawn: { type: 'number', description: 'Maximum respawn_seconds.' },
          ammo_type: { type: 'string', enum: ['shells','nails','rockets','cells'], description: 'Filter on props_json.ammo_type.' },
          gameplay_source: { type: 'string', description: 'Defaults to id1.' },
          limit: { type: 'number', description: 'Max rows. Default 25, max 100.' },
        },
      },
    },
    {
      name: 'search_mechanics',
      description:
        'Filter QuakeWorld game-mechanics rules by kind or substring. Returns compact rows ordered by kind+name. Use this for "all environmental hazards" (kind:env_hazard), "all spawn rules" (kind:spawn_rule), "anything mentioning quad" (query:quad), or "all death rules" (kind:death_rule). For a specific named rule use lookup_mechanic.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Substring match on name, value_text, or notes (case-insensitive).' },
          kind: { type: 'string', enum: ['constant','env_hazard','player_stat','powerup_behavior','armor_model','death_rule','spawn_rule','dm_mode_rule'], description: 'Restrict to one kind.' },
          gameplay_source: { type: 'string', description: 'Defaults to id1.' },
          limit: { type: 'number', description: 'Max rows. Default 50, max 100.' },
        },
      },
    },
```

- [ ] **Step 3: Add four cases in the dispatcher switch.**

Find the existing `case 'search_maps': { ... }` block (around index.ts:235-244). After it, before the `default:` case, insert:

```typescript
    case 'lookup_gameplay_entity': {
      const response = lookupGameplayEntity(knowledgeDb, args as { name: string; gameplay_source?: string });
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'lookup_mechanic': {
      const response = lookupMechanic(knowledgeDb, args as { name: string; gameplay_source?: string });
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'search_gameplay_entities': {
      const response = searchGameplayEntities(knowledgeDb, args as SearchGameplayEntitiesArgs);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'search_mechanics': {
      const response = searchMechanics(knowledgeDb, args as SearchMechanicsArgs);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
```

- [ ] **Step 4: Typecheck.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
```

- [ ] **Step 5: Smoke-test the server starts.**

```bash
cd serve/mcp
timeout 3 bun run src/index.ts < /dev/null 2>&1 | head -10
cd -
```

Expected: server prints `[qw-oracle-mcp] loaded N concept notes...` and `[qw-oracle-mcp] connected via stdio` before the timeout. No "tool not found" or schema errors.

- [ ] **Step 6: Commit.**

```bash
git add apps/qw-oracle/serve/mcp/src/index.ts
git commit -m "feat(qw-oracle): register lookup/search gameplay+mechanic tools in MCP server"
```

---

### Task 22: Centralize SERVER_VERSION + bump to 0.4.0

**Files:**
- Create: `apps/qw-oracle/serve/mcp/src/version.ts`
- Modify: `apps/qw-oracle/serve/mcp/package.json`
- Modify: `apps/qw-oracle/serve/mcp/src/index.ts`
- Modify: 10 tool files (6 existing + 4 new from Tasks 17-20):
  - existing: `lookup-entity.ts`, `lookup-map.ts`, `search-entities.ts`, `search-maps.ts`, `search-solved-issues.ts`, `get-concept-note.ts`
  - new (from Tasks 17-20): `lookup-gameplay-entity.ts`, `lookup-mechanic.ts`, `search-gameplay-entities.ts`, `search-mechanics.ts`

Pre-flight surfaced 8 version-drift sites: `package.json` is `0.1.0`; `Server({ ..., version: '0.3.0' })` in index.ts:44; six per-tool `const SERVER_VERSION` constants (4 still at `'0.2.0'`, 2 at `'0.3.0'`). Tasks 17-20 add 4 more inline literals (each `'0.4.0'`), bringing the total drift surface to 12 sites. Centralise ALL OF THEM into `version.ts` so every site reads the same constant -- including the 4 new tools, otherwise they'd start drifting at the next bump.

- [ ] **Step 1: Create `apps/qw-oracle/serve/mcp/src/version.ts`.**

```typescript
// Single source of truth for the MCP server version. Imported by index.ts
// (the Server constructor) and by every tool file's meta block. Update here
// when bumping; package.json is updated in lockstep but is not imported.
export const SERVER_VERSION = '0.4.0';
```

- [ ] **Step 2: Update `serve/mcp/package.json` `version` to `0.4.0`.**

- [ ] **Step 3: Update `serve/mcp/src/index.ts`.**

Add the import near the top (after the `bun:sqlite` imports added in Task 21):

```typescript
import { SERVER_VERSION } from './version.ts';
```

Find the `Server({ name: 'qw-oracle', version: '0.3.0' }, ...)` line at index.ts:44 and replace the literal with the import:

```typescript
const server = new Server(
  { name: 'qw-oracle', version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);
```

- [ ] **Step 4: Update all 10 tool files.**

For each of:
- existing: `lookup-entity.ts`, `lookup-map.ts`, `search-entities.ts`, `search-maps.ts`, `search-solved-issues.ts`, `get-concept-note.ts`
- new (from Tasks 17-20): `lookup-gameplay-entity.ts`, `lookup-mechanic.ts`, `search-gameplay-entities.ts`, `search-mechanics.ts`

1. Find the line `const SERVER_VERSION = '0.X.X';` near the top (existing tools are at `'0.2.0'` or `'0.3.0'`; new tools are at `'0.4.0'`).
2. Replace it with `import { SERVER_VERSION } from '../version.ts';` (placed in the import block at the top of the file).
3. The rest of the file is unchanged - the existing `meta: { tool, server_version: SERVER_VERSION, queried_at: ... }` blocks pick up the centralized value automatically.

- [ ] **Step 5: Typecheck.**

```bash
cd serve/mcp && bunx tsc --noEmit && cd -
```

- [ ] **Step 6: Server boot smoke (must report 0.4.0).**

```bash
cd serve/mcp
timeout 3 bun run src/index.ts < /dev/null 2>&1 | head -5
cd -
```

Expected: `[qw-oracle-mcp] connected via stdio` with no version-mismatch warnings.

- [ ] **Step 7: Commit.**

```bash
git add apps/qw-oracle/serve/mcp/src/version.ts \
        apps/qw-oracle/serve/mcp/package.json \
        apps/qw-oracle/serve/mcp/src/index.ts \
        apps/qw-oracle/serve/mcp/src/tools/lookup-entity.ts \
        apps/qw-oracle/serve/mcp/src/tools/lookup-map.ts \
        apps/qw-oracle/serve/mcp/src/tools/search-entities.ts \
        apps/qw-oracle/serve/mcp/src/tools/search-maps.ts \
        apps/qw-oracle/serve/mcp/src/tools/search-solved-issues.ts \
        apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts \
        apps/qw-oracle/serve/mcp/src/tools/lookup-gameplay-entity.ts \
        apps/qw-oracle/serve/mcp/src/tools/lookup-mechanic.ts \
        apps/qw-oracle/serve/mcp/src/tools/search-gameplay-entities.ts \
        apps/qw-oracle/serve/mcp/src/tools/search-mechanics.ts
git commit -m "chore(qw-oracle): MCP server v0.4.0 + centralize SERVER_VERSION (12 drift sites -> 1)"
```

---

## Phase 5 - Slipgate snapshot

### Task 23: Extend `build-snapshot` to emit `qw-gameplay.json`

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts`

- [ ] **Step 1: Read the existing `emitQwMaps` function and the `opts.project === 'qw'` branch.**

```bash
sed -n '480,640p' apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts
```

Note the file path it writes to (likely `apps/slipgate-app/src/lib/config/data/qw-maps.json`). Mirror exactly.

- [ ] **Step 2: Add an `emitGameplay` function next to `emitQwMaps`.** Reuse the existing `writeJson(path, content, count)` helper at build-snapshot.ts:556 (which mkdir-p's, JSON-stringifies with trailing newline, and returns `{count, bytes}`). DO NOT roll your own writeFileSync -- every other emitter in this file uses writeJson, and rolling our own would diverge on trailing-newline + mkdir defense.

```typescript
function emitGameplay(
  db: Database.Database,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const sources = db.prepare(`SELECT id, display_name, description, source_root, notes FROM gameplay_sources ORDER BY id`).all();
  const entities = (db.prepare(`
    SELECT gameplay_source_id, kind, name, classname,
           damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
           pickup_amount, max_carry, duration_seconds,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_entity_defs
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `).all() as Array<Record<string, unknown>>).map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r as { props_json: string; ruleset_gate_json: string };
    return { ...rest, props: JSON.parse(props_json), ruleset_gate: JSON.parse(ruleset_gate_json) };
  });
  const mechanics = (db.prepare(`
    SELECT gameplay_source_id, kind, name, value_numeric, value_text,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_mechanics
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `).all() as Array<Record<string, unknown>>).map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r as { props_json: string; ruleset_gate_json: string };
    return { ...rest, props: JSON.parse(props_json), ruleset_gate: JSON.parse(ruleset_gate_json) };
  });

  const payload = {
    schema_version: 14,
    generated_at: meta.generatedAt,
    sources,
    entities,
    mechanics,
  };
  return writeJson(join(outputDir, 'qw-gameplay.json'), payload, entities.length + mechanics.length);
}
```

(The `writeJson` helper, `outputDir` resolution, `SnapshotMeta` type, and `join` import already exist in the file - reuse.)

- [ ] **Step 3: Wire `emitGameplay` into the `opts.project === 'qw'` branch.**

Find the line `} else if (opts.project === 'qw') {` (around line 623). After the existing `emitQwMaps` call + `files.push({ file: 'qw-maps.json', ... })`, add:

```typescript
      const g = emitGameplay(db, meta, outputDir);
      files.push({ file: 'qw-gameplay.json', entities: g.count, bytes: g.bytes });
```

- [ ] **Step 4: Typecheck.**

```bash
npm run typecheck
```

- [ ] **Step 5: Build the snapshot.**

```bash
npm run load-knowledge -- build-snapshot --project qw
```

Expected: emits `qw-maps.json` AND `qw-gameplay.json`.

- [ ] **Step 6: Verify the file.**

```bash
ls -la /home/paradoks/projects/quakeworld/apps/slipgate-app/src/lib/config/data/qw-gameplay.json
node -e "const j=require('/home/paradoks/projects/quakeworld/apps/slipgate-app/src/lib/config/data/qw-gameplay.json'); console.log({sources: j.sources.length, entities: j.entities.length, mechanics: j.mechanics.length, schema: j.schema_version})"
```

Expected: sources 1, entities 37, mechanics 41, schema 14.

- [ ] **Step 7: Commit.**

```bash
git add apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts apps/slipgate-app/src/lib/config/data/qw-gameplay.json
git commit -m "feat(qw-oracle): build-snapshot emits qw-gameplay.json for slipgate"
```

---

## Phase 6 - End-to-end verification + docs + cleanup

### Task 24: End-to-end MCP smoke (two-tier: in-process + dispatcher-driven)

The existing `verify-rewrite.ts` (if present) spawns the MCP server as a subprocess via `StdioClientTransport` and tests through the MCP protocol -- it exercises the dispatcher switch. An in-process script that imports the tool functions directly only exercises the data layer; if a tool is wired up wrong in `index.ts`, the in-process script still passes. Both are useful but neither is sufficient alone. Ship both:

- **Tier 1 (in-process, `verify-gameplay.ts`)** -- fast assertions on data correctness, citation regressions, case-insensitivity.
- **Tier 2 (subprocess, extend `verify-rewrite.ts`)** -- at least one client-driven `client.callTool()` per new tool name to confirm the dispatcher routes correctly and the inline tool literals in `index.ts` are syntactically valid.

- [ ] **Step 1: Inspect the existing harness.**

```bash
ls apps/qw-oracle/serve/mcp/scripts/ 2>&1
test -f apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts && head -30 apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts
```

If `verify-rewrite.ts` exists, note its `client.callTool()` pattern -- Step 3 below adds 4 new calls to it. If it does NOT exist, skip Step 3 and document in the plan that Tier 2 is deferred.

- [ ] **Step 2: Write Tier 1 (`verify-gameplay.ts`).**

Write a new file `apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts`:

```typescript
import { knowledgeDb } from '../src/db';
import { lookupGameplayEntity } from '../src/tools/lookup-gameplay-entity';
import { lookupMechanic } from '../src/tools/lookup-mechanic';
import { searchGameplayEntities } from '../src/tools/search-gameplay-entities';
import { searchMechanics } from '../src/tools/search-mechanics';

let failures = 0;
function assert(cond: boolean, label: string) {
  if (!cond) { console.error('FAIL', label); failures++; } else { console.log('PASS', label); }
}

const rl = lookupGameplayEntity(knowledgeDb, { name: 'rocket_launcher' });
assert(rl.found && rl.entity.damage === 110, 'lookup rocket_launcher damage=110');
assert(rl.found && rl.entity.splash_damage === 120, 'lookup rocket_launcher splash=120');
assert(rl.found && rl.entity.source_ref === 'weapons.qc:385', 'lookup rocket_launcher source_ref');

const rlUpper = lookupGameplayEntity(knowledgeDb, { name: 'ROCKET_LAUNCHER' });
assert(rlUpper.found && rlUpper.entity.name === 'rocket_launcher', 'lookup case-insensitive');

const missing = lookupGameplayEntity(knowledgeDb, { name: 'nonexistent_xyz' });
assert(!missing.found, 'lookup missing returns found:false');

const lava = lookupMechanic(knowledgeDb, { name: 'lava' });
assert(lava.found && lava.mechanic.kind === 'env_hazard', 'lookup lava is env_hazard');
assert(lava.found && lava.mechanic.source_ref === 'client.qc:825', 'lookup lava source_ref');

const gib = lookupMechanic(knowledgeDb, { name: 'gib_threshold' });
assert(gib.found && gib.mechanic.source_ref === 'player.qc:598', 'gib_threshold cites player.qc not client.qc');

// Telefrag/exit-level split (v4): two separate rows with different source_refs
const telefrag = lookupMechanic(knowledgeDb, { name: 'telefrag' });
assert(telefrag.found && telefrag.mechanic.source_ref === 'triggers.qc:334',
  'telefrag cites triggers.qc:334 (real teleport-overlap mechanic)');
const exitKill = lookupMechanic(knowledgeDb, { name: 'exit_level_kill' });
assert(exitKill.found && exitKill.mechanic.source_ref === 'client.qc:230',
  'exit_level_kill cites client.qc:230 (samelevel/noexit changelevel)');

// trigger_hurt env_hazard (v4): the void-brush mechanic
const triggerHurt = lookupMechanic(knowledgeDb, { name: 'trigger_hurt' });
assert(triggerHurt.found && triggerHurt.mechanic.source_ref === 'triggers.qc:548',
  'trigger_hurt cites triggers.qc:548 (mapper-controlled void-brush damage)');

const splashWeapons = searchGameplayEntities(knowledgeDb, { kind: 'weapon', has_splash: true });
const splashNames = splashWeapons.rows.map(r => r.name).sort();
assert(JSON.stringify(splashNames) === JSON.stringify(['grenade_launcher','rocket_launcher']),
  'search splash weapons = GL+RL only');

const hazards = searchMechanics(knowledgeDb, { kind: 'env_hazard' });
assert(hazards.rows.length === 7, 'search env_hazards count = 7');

const deaths = searchMechanics(knowledgeDb, { kind: 'death_rule' });
assert(deaths.rows.length === 7, 'search death_rules count = 7 (telefrag + exit_level_kill split)');

const totalEntities = knowledgeDb.query(`SELECT COUNT(*) AS c FROM gameplay_entity_defs`).get() as any;
const totalMechanics = knowledgeDb.query(`SELECT COUNT(*) AS c FROM gameplay_mechanics`).get() as any;
assert(totalEntities.c === 37, `entity count = 37 (got ${totalEntities.c})`);
assert(totalMechanics.c === 41, `mechanic count = 41 (got ${totalMechanics.c})`);

if (failures > 0) {
  console.error(`${failures} FAILURES`);
  process.exit(1);
} else {
  console.log('all PASS');
}
```

Run:

```bash
cd apps/qw-oracle/serve/mcp
bun run scripts/verify-gameplay.ts
cd -
```

Expected: `all PASS`.

- [ ] **Step 3: Tier 2 -- extend `verify-rewrite.ts` with one client-driven call per new tool.**

(Skip if Step 1 found no `verify-rewrite.ts`.)

**First -- fix the pre-existing broken assertion.** The file at line 38 has `check('listTools returns 4 tools', tools.tools.length === 4, ...)`. That count was correct at v0.2.0 but the maps PR added 2 tools (now 6 existing). After Task 21 there will be 10. The assertion is currently failing on `main`; without this fix, Tier 2 will exit 1 regardless of whether the new dispatcher checks pass. Update the literal:

```diff
-check('listTools returns 4 tools', tools.tools.length === 4, `got ${tools.tools.length}`);
+check('listTools returns 10 tools', tools.tools.length === 10, `got ${tools.tools.length}`);
```

Open `apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts`. Find an existing `client.callTool({ name: '...' })` block. Add 4 new blocks after it, one per new tool:

```typescript
// Game-mechanics tools (added 2026-04-27, schema v14).
{
  const r = await client.callTool({ name: 'lookup_gameplay_entity', arguments: { name: 'rocket_launcher' } });
  const text = (r.content as Array<{ type: string; text: string }>)[0].text;
  const parsed = JSON.parse(text);
  assert(parsed.found === true && parsed.entity.damage === 110, 'dispatcher: lookup_gameplay_entity rocket_launcher');
}
{
  const r = await client.callTool({ name: 'lookup_mechanic', arguments: { name: 'lava' } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  assert(parsed.found === true && parsed.mechanic.kind === 'env_hazard', 'dispatcher: lookup_mechanic lava');
}
{
  const r = await client.callTool({ name: 'search_gameplay_entities', arguments: { kind: 'weapon', has_splash: true } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  assert(parsed.rows.length === 2, 'dispatcher: search_gameplay_entities splash weapons = 2');
}
{
  const r = await client.callTool({ name: 'search_mechanics', arguments: { kind: 'env_hazard' } });
  const parsed = JSON.parse((r.content as Array<{ type: string; text: string }>)[0].text);
  assert(parsed.rows.length === 7, 'dispatcher: search_mechanics env_hazard = 7');
}
```

Run the harness:

```bash
cd apps/qw-oracle/serve/mcp
bun run scripts/verify-rewrite.ts
cd -
```

Expected: all original assertions + 4 new ones PASS.

- [ ] **Step 4: If a failure surfaces, return to the relevant earlier task** and fix; do NOT skip past failures. Tier 1 failures point at the tool implementation; Tier 2 failures point at the dispatcher wiring (Task 21) or tool registration (Task 21 + 22).

- [ ] **Step 5: Commit.**

```bash
git add apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts \
        apps/qw-oracle/serve/mcp/scripts/verify-rewrite.ts
git commit -m "test(qw-oracle): two-tier MCP verify (in-process + dispatcher-driven)"
```

---

### Task 25: Update OVERVIEW.md, CLAUDE.md, e2e-verify.md, and cleanup spike artifacts

**Files:**
- Modify: `apps/qw-oracle/OVERVIEW.md`
- Modify: `apps/qw-oracle/CLAUDE.md`
- Modify: `apps/qw-oracle/scripts/load-knowledge/e2e-verify.md`
- Delete: `apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts`
- Delete: `apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts`
- Delete: `apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml`

- [ ] **Step 1: Update OVERVIEW.md Layer 1 section.** Add a row to the Layer 1 table for the gameplay tables:

```
| `gameplay_*` (qw namespace) | id1 baseline game mechanics: 8 weapons + 4 projectiles + 25 items + 41 mechanics (incl. telefrag/exit_level_kill split + trigger_hurt void-brush). Schema v14 (2026-04-27). KTX overrides queued as arc 2. |
```

- [ ] **Step 2: Update CLAUDE.md status section** (the first paragraph).

Append after the existing FTE Phase 2d-bundle line:

```
**Game mechanics Layer 1 SHIPPED 2026-04-27** -- schema v14 adds gameplay_sources/gameplay_entity_defs/gameplay_mechanics tables (no qw_ prefix to match the existing maps precedent); id1 baseline loaded with 37 entity defs + 41 mechanic rows from qwcl-original/QW/progs/ (every row source_ref-cited; ruleset_gate_json carries an empty object today and KTX-style compound gates as JSON in arc 2). Notable v4 splits: telefrag (triggers.qc:334 teleport-overlap) and exit_level_kill (client.qc:230 samelevel/noexit changelevel) are distinct rows despite both dealing 50000 damage; trigger_hurt env_hazard (triggers.qc:548) captures the void-brush mechanism on most maps. Four new MCP tools: lookup_gameplay_entity, lookup_mechanic, search_gameplay_entities, search_mechanics (server v0.4.0). Snapshot for slipgate at apps/slipgate-app/src/lib/config/data/qw-gameplay.json. KTX overrides + sub_select_spawn_point + clan_arena algorithmic mechanics queued as arc 2; engine-tunable cvars (sv_maxspeed, sv_friction, etc.) intentionally NOT loaded - they belong in the cvars table.
```

Update the Layer 1 row of the database table to mention game mechanics:

Find the existing line:

```
| `data/knowledge.db` | **Layer 1** - structured engine facts (cvars, commands, macros, HUD elements, rulesets, keynames, token primitives, cmdline params, asset consumption, flag bits) plus a source_overrides blame index. ...
```

Reword to:

```
| `data/knowledge.db` | **Layer 1** - structured engine + game-mechanics facts. Engine: cvars, commands, macros, HUD elements, rulesets, keynames, token primitives, cmdline params, asset consumption, flag bits. Game mechanics (qw namespace): gameplay_sources, gameplay_entity_defs, gameplay_mechanics. Plus a source_overrides blame index. ...
```

- [ ] **Step 3: Append a per-arc verification block to e2e-verify.md.**

```markdown
## Arc: game-mechanics Layer 1 (id1 baseline, schema v14, 2026-04-27)

### Loader stop conditions (npm run load-knowledge -- load-gameplay)

- First run: `entities inserted=37 updated=0 total=37; mechanics inserted=41 updated=0 total=41`
- Second run (idempotency): `entities inserted=0 updated=37 total=37; mechanics inserted=0 updated=41 total=41`
- If totals differ from 37/41, the YAML inventory diverges from the canonical source-cited count; investigate before proceeding.

### Spot-checked rows (canonical id1 from qwcl-original/QW/progs/)

```sql
-- Rocket launcher: damage 110, splash 120, splash_radius 160, refire 0.8s
SELECT name, damage, splash_damage, splash_radius, refire_seconds, source_ref
FROM gameplay_entity_defs WHERE name='rocket_launcher';
-- Expected: weapons.qc:385

-- Quad: 30s duration, 60s respawn
SELECT name, duration_seconds, respawn_seconds, source_ref
FROM gameplay_entity_defs WHERE name='quad_damage';
-- Expected: items.qc:1417

-- Gib threshold lives in player.qc, not client.qc
SELECT name, source_ref FROM gameplay_mechanics WHERE name='gib_threshold';
-- Expected: player.qc:598

-- Spawn invul default lives at client.qc:471, not 470
SELECT name, source_ref FROM gameplay_mechanics WHERE name='spawn_invul_default';
-- Expected: client.qc:471
```

### MCP server assertions (apps/qw-oracle/serve/mcp/scripts/verify-gameplay.ts)

12 assertions covering case-insensitivity, missing-entity handling, telefrag/exit_level_kill split, trigger_hurt presence, splash-weapon search, env_hazard count (7), death_rule count (7), and citation-bug regressions.
```

- [ ] **Step 4: Delete the spike artifacts** (now that v14 has shipped and idempotency is verified).

```bash
rm apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts
rm apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts
rm apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml
```

- [ ] **Step 5: Commit doc updates + cleanup.**

```bash
git add apps/qw-oracle/OVERVIEW.md \
        apps/qw-oracle/CLAUDE.md \
        apps/qw-oracle/scripts/load-knowledge/e2e-verify.md
git rm apps/qw-oracle/scripts/load-knowledge/_smoke-v14-schema.ts \
       apps/qw-oracle/scripts/load-knowledge/_smoke-ktx-fit.ts \
       apps/qw-oracle/scripts/extractors/qw/seeds/_ktx-spike.yaml
git commit -m "docs(qw-oracle): announce game-mechanics Layer 1 + e2e-verify entry; drop spike artifacts"
```

---

### Task 26: Push to origin

- [ ] **Step 1: Push.**

```bash
git push origin main
```

- [ ] **Step 2: Confirm clean tree.**

```bash
git status
```

Expected: "nothing to commit, working tree clean".

---

## Out of scope (Arc 2)

The following are explicitly deferred:

- **KTX C extraction** via libclang. Targets: `research/repos/ktx/src/{weapons.c, items.c, combat.c, client.c, world.c}`. Will use the existing `extractor_lib/` Visitor + walk_tu_dispatch. Stores override rows with `gameplay_source_id='ktx'` plus compound `ruleset_gate_json` (e.g. `{"yawn":true,"dm":3}` for yawnmode-DMM3 axe). The schema-fitness spike in Task 0 already validated this representation against the hardest 5 KTX rows.
- **Engine-tunable cvars** (sv_maxspeed/friction/accelerate/stopspeed/edgefriction). They land in the `cvars` table for ezQuake/MVDSV/QWCL once each engine's extraction tags surface them. NOT loaded into `gameplay_mechanics`.
- **Algorithmic mechanics** that aren't pure literal extractions: `Sub_SelectSpawnPoint` (client.c:1044-1290), `clan_arena` respawn formula (clan_arena.c:128-207), race timing/checkpoints, fair-spawn weighting. These need a different shape than v14 accommodates - either a `gameplay_algorithm` table (kind: spawn_selection / respawn_formula / etc. with a code-pointer + structured params) or Layer 3 concept-note refs. Defer the design to arc 2.
- **Layer 3 game-mechanics concept notes**. Wait until arc 2 ships KTX overrides and there's enough cross-source variation to write meaningful guidance.

The Arc 2 plan should be authored after Arc 1 ships and the KTX-fitness spike's compound-gate representation has run against real production data for at least a session.

---

## Self-review checklist (run before declaring complete)

- [ ] **Spec coverage:** every cluster in Appendix A has a corresponding YAML section curated in tasks 4-14? YES (3 entity sub-clusters + 8 mechanic sub-clusters).
- [ ] **Schema covers KTX overrides** without further migration? YES - confirmed by Task 0 spike.
- [ ] **Unique-index upsert idempotency** works? YES - `ruleset_gate_json NOT NULL DEFAULT '{}'` ensures no NULL columns; canonical key-order JSON in loader prevents `{a:1,b:2}` vs `{b:2,a:1}` fragmentation. Verified in Task 16 step 6 second-run.
- [ ] **MCP tools follow `feedback_no_case_sensitivity.md`?** YES - `COLLATE NOCASE` in every WHERE clause; verified in Task 24.
- [ ] **MCP tools follow `feedback_mcp_answer_shape.md`?** YES - tool returns the structured row only; descriptions volunteer cross-references between lookup/search and across the gameplay/mechanic split.
- [ ] **Every YAML row has `source_ref`?** YES.
- [ ] **Loader takes `db` handle from `openKnowledgeDb()`** instead of opening its own? YES.
- [ ] **MCP tools use `bun:sqlite`** (not better-sqlite3)? YES.
- [ ] **MCP tools registered as inline literals + switch dispatch** (not separate Tool exports)? YES.
- [ ] **Filenames are kebab-case; functions are camelCase**? YES.
- [ ] **Engine-tunable cvars (sv_maxspeed etc.) deliberately NOT in `gameplay_mechanics.constant`** per pre-plan? YES - dropped from Task 7.
- [ ] **Citation fixes propagated to YAML**? YES - gib (player.qc:598), spawn_invul_default (client.qc:471), start_weapon (client.qc:69), DM4 axe-mode gate annotated, megahealth respawn semantics annotated, h15 cap_source_ref (items.qc:217), LG refire_source_ref (weapons.qc:1056), NG refire cited at weapons.qc:759 for SNG parity, telefrag/exit_level_kill split, trigger_hurt env_hazard added.
- [ ] **No `--no-verify` on commits, no `--force` on push**? YES.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-qw-oracle-game-mechanics-id1-baseline.md`.

**Two execution options:**

**1. Subagent-driven (recommended).** Fresh subagent per task, review between tasks. Best for the YAML curation tasks (4-14, especially the 6a-6f split) which are mechanical-but-voluminous.

**2. Inline execution.** Run tasks in this session via `superpowers:executing-plans`. Faster but less context-isolation.

**Stop conditions for the executor:**

- Task 0 step 3: if the spike reports `idempotent: NO` or compound-gate query returns 0 rows, redesign before Task 1.
- Task 14 step 2: if grand-total counts differ from 37 entities + 41 mechanics, fix the YAML before proceeding to Task 15.
- Task 16 step 5: if loader reports any total other than 37/41, do not proceed.
- Task 16 step 6: if second-run reports any `inserted > 0`, the upsert design is broken; stop.
- Task 24: if any of the 8 verify-gameplay assertions fail, return to the relevant earlier task.
