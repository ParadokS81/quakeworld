// Tier 1 in-process verification for the game-mechanics layer (schema v14).
// Imports tool functions directly and asserts data correctness, citation
// regressions, case-insensitivity, and headline counts. Exit 1 on failure.
// Run with: bun run scripts/verify-gameplay.ts (from serve/mcp/).

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
