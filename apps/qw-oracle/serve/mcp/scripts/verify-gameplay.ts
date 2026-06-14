// Tier 1 in-process verification for the game-mechanics layer (schema v14+).
// Imports tool functions directly and asserts data correctness, citation
// regressions, case-insensitivity, and source-partitioned headline counts.
// Exit 1 on failure. Run with: bun run scripts/verify-gameplay.ts (from serve/mcp/).
//
// Count discipline (game-content-catalog arc, F4): per-kind and headline
// assertions are gameplay_source-scoped and DERIVED from the live DB, never
// frozen literals. The catalog grows every phase (audit rows, id1 monsters, ktx
// overrides), and an unscoped search returns id1 + ktx rows together. Row-count
// regression is the loader's job (the seed expected_counts STOP-gate, plan D8);
// this script verifies the TOOL surface faithfully reflects the loaded data.

import { db } from '../src/db';
import { lookupGameplayEntity } from '../src/tools/lookup-gameplay-entity';
import { lookupMechanic } from '../src/tools/lookup-mechanic';
import { searchGameplayEntities } from '../src/tools/search-gameplay-entities';
import { searchMechanics } from '../src/tools/search-mechanics';

let failures = 0;
function assert(cond: boolean, label: string) {
  if (!cond) { console.error('FAIL', label); failures++; } else { console.log('PASS', label); }
}

// --- per-entity spot checks (citation-regression pins) ---------------------
// These source_ref pins are deliberate regression anchors. Phase 1's audit may
// have corrected some; at execution re-confirm each against the live id1 row and
// update the literal to the post-audit ref if the audit moved it (a one-time
// re-baseline, not rot). All values below were live-verified at Phase 4 drafting.
const rl = await lookupGameplayEntity({ name: 'rocket_launcher' });
assert(rl.match_quality === 'strong' && rl.results[0]?.damage === 110, 'lookup rocket_launcher damage=110');
assert(rl.match_quality === 'strong' && rl.results[0]?.splash_damage === 120, 'lookup rocket_launcher splash=120');
assert(rl.match_quality === 'strong' && rl.results[0]?.source_ref === 'weapons.qc:385', 'lookup rocket_launcher source_ref');

const rlUpper = await lookupGameplayEntity({ name: 'ROCKET_LAUNCHER' });
assert(rlUpper.match_quality === 'strong' && rlUpper.results[0]?.name === 'rocket_launcher', 'lookup case-insensitive');

const missing = await lookupGameplayEntity({ name: 'nonexistent_xyz' });
assert(missing.match_quality === 'none', 'lookup missing returns match_quality=none');

const lava = await lookupMechanic({ name: 'lava' });
assert(lava.match_quality === 'strong' && lava.results[0]?.kind === 'env_hazard', 'lookup lava is env_hazard');
assert(lava.match_quality === 'strong' && lava.results[0]?.source_ref === 'client.qc:825', 'lookup lava source_ref');

const gib = await lookupMechanic({ name: 'gib_threshold' });
assert(gib.match_quality === 'strong' && gib.results[0]?.source_ref === 'player.qc:598', 'gib_threshold cites player.qc not client.qc');

const telefrag = await lookupMechanic({ name: 'telefrag' });
assert(telefrag.match_quality === 'strong' && telefrag.results[0]?.source_ref === 'triggers.qc:334',
  'telefrag cites triggers.qc:334 (real teleport-overlap mechanic)');
const exitKill = await lookupMechanic({ name: 'exit_level_kill' });
assert(exitKill.match_quality === 'strong' && exitKill.results[0]?.source_ref === 'client.qc:230',
  'exit_level_kill cites client.qc:230 (samelevel/noexit changelevel)');

const triggerHurt = await lookupMechanic({ name: 'trigger_hurt' });
assert(triggerHurt.match_quality === 'strong' && triggerHurt.results[0]?.source_ref === 'triggers.qc:548',
  'trigger_hurt cites triggers.qc:548 (mapper-controlled void-brush damage)');

// --- source-scoped search filters (F4: assertions are gameplay_source-aware) -
// search_* tools default to ALL sources; scope to id1 so ktx override rows
// (axe / super_shotgun / rocket joins after Phase 3) never inflate id1 shapes.
const splashWeapons = await searchGameplayEntities({ kind: 'weapon', has_splash: true, gameplay_source: 'id1' });
const splashNames = splashWeapons.results.map(r => r.name).sort();
assert(JSON.stringify(splashNames) === JSON.stringify(['grenade_launcher', 'rocket_launcher']),
  'search splash weapons (id1) = GL+RL only');

// Per-kind counts: derive the id1 baseline from the DB, assert the tool (scoped
// to id1) agrees. No frozen per-kind literal -> survives Phase 1 gap rows and
// ktx's same-named kinds (id1 death_rule=7 vs ktx death_rule=27).
const id1ByKind = new Map(
  (await db<{ kind: string; c: number }[]>`
     SELECT kind, COUNT(*)::int AS c FROM gameplay_mechanics
     WHERE gameplay_source_id = 'id1' GROUP BY kind`).map(r => [r.kind, r.c]));
for (const kind of ['env_hazard', 'death_rule'] as const) {
  const scoped = await searchMechanics({ kind, gameplay_source: 'id1', limit: 100 });
  assert(scoped.results.length === id1ByKind.get(kind),
    `search_mechanics id1 ${kind}: tool=${scoped.results.length} db=${id1ByKind.get(kind)}`);
}

// --- headline totals: source partition, not frozen magic numbers (F4) -------
// id1 + ktx are the only gameplay_sources this arc ships. Assert both
// partitions are populated and the unscoped totals equal id1 + ktx (a surprise
// third source, or either vanishing, is a real change that must update this).
const entBySource = new Map(
  (await db<{ s: string; c: number }[]>`
     SELECT gameplay_source_id AS s, COUNT(*)::int AS c FROM gameplay_entity_defs GROUP BY 1`).map(r => [r.s, r.c]));
const mechBySource = new Map(
  (await db<{ s: string; c: number }[]>`
     SELECT gameplay_source_id AS s, COUNT(*)::int AS c FROM gameplay_mechanics GROUP BY 1`).map(r => [r.s, r.c]));
const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

assert((entBySource.get('id1') ?? 0) > 0 && (entBySource.get('ktx') ?? 0) > 0,
  'entity partitions present: id1 + ktx');
assert((mechBySource.get('id1') ?? 0) > 0 && (mechBySource.get('ktx') ?? 0) > 0,
  'mechanic partitions present: id1 + ktx');
assert(sum(entBySource) === (entBySource.get('id1') ?? 0) + (entBySource.get('ktx') ?? 0),
  `entity total ${sum(entBySource)} = id1 + ktx (no unaccounted source)`);
assert(sum(mechBySource) === (mechBySource.get('id1') ?? 0) + (mechBySource.get('ktx') ?? 0),
  `mechanic total ${sum(mechBySource)} = id1 + ktx (no unaccounted source)`);

if (failures > 0) {
  console.error(`${failures} FAILURES`);
  process.exit(1);
} else {
  console.log('all PASS');
}
