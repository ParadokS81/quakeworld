// apps/qw-oracle/serve/mcp/src/tools/ktx-serving.test.ts
//
// Integration test for the KTX-serving realignment: source-default (all
// sources), the mode filter, the lava/slime DISTINCT-ON collision, the
// monster kind, match_event in the entity enum, and describe_mode's
// um-vs-overlay-less branch + concept-note graceful link, plus (Phase 3 wave
// B) describe_mode's gameplay_entity_defs / gameplay_mechanics override-layer
// join. Seeds qw_oracle_test in beforeAll, TRUNCATEs in afterAll. Mirrors
// maps.test.ts.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../db.ts';
import { searchMechanics } from './search-mechanics.ts';
import { lookupMechanic } from './lookup-mechanic.ts';
import { searchGameplayEntities } from './search-gameplay-entities.ts';
import { describeMode } from './describe-mode.ts';

const HAS_DB = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('qw_oracle_test');

describe.skipIf(!HAS_DB)('ktx serving (postgres-js)', () => {
  // Shared tables (concepts, entities) use targeted deletes, not TRUNCATE, so
  // this file does not clobber search-concepts / upsert tests. FK order: child
  // gameplay rows before gameplay_sources.
  async function cleanup() {
    await db`DELETE FROM gameplay_mechanics WHERE gameplay_source_id IN ('id1','ktx')`;
    await db`DELETE FROM gameplay_entity_defs WHERE gameplay_source_id IN ('id1','ktx')`;
    await db`DELETE FROM entities WHERE canonical_id IN ('ktx:cvar:k_instagib','ktx:cvar:k_noitems')`;
    await db`DELETE FROM concepts WHERE slug = 'ca'`;
    await db`DELETE FROM gameplay_sources WHERE id IN ('id1','ktx')`;
  }

  beforeAll(async () => {
    await cleanup();
    await db`
      INSERT INTO gameplay_sources (id, display_name, description, source_root) VALUES
        ('id1','id1','vanilla baseline','x'),
        ('ktx','KTX','ktx mod','y')
    `;
    // catalog: ca (standalone um-mode, with overlays) + instagib (mutator) +
    // bloodfest (standalone, overlay-less -- exercises the entity_defs
    // override-join path, which ca/instagib never touch)
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_text, ruleset_gate_json, source_ref, props_json) VALUES
        ('ktx','game_mode','ca','umCA', '{}', 'commands.c:4552',
          ${db.json({ mode_class: 'standalone', init_mechanism: 'um_init_string', user_facing_label: 'Clan Arena', community_name: 'Clan Arena', wiki_ref: 'https://w/Clan_Arena', source_xrefs: ['commands.c:4552'], activation_cvar: null })}),
        ('ktx','game_mode','instagib','', '{}', 'world.c:975',
          ${db.json({ mode_class: 'mutator', init_mechanism: 'cvar_toggle_only', user_facing_label: 'Instagib', activation_cvar: 'k_instagib', sub_flags_json: null })}),
        ('ktx','game_mode','bloodfest','umBLOODFEST', '{}', 'commands.c:4600',
          ${db.json({ mode_class: 'standalone', init_mechanism: 'um_init_string', user_facing_label: 'Bloodfest', community_name: 'Bloodfest', activation_cvar: null })})
    `;
    // overlays: common baseline + ca-specific (instagib/bloodfest have none)
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_numeric, value_text, ruleset_gate_json, source_ref, props_json) VALUES
        ('ktx','mode_default','maxspeed', 320, '320', ${db.json({ mode: 'common' })}, 'x', ${db.json({ apply_order: 1, is_baseline: true, comment: 'baseline', initstring_array: 'common_init' })}),
        ('ktx','mode_default','coop', 0, '0', ${db.json({ mode: 'ca' })}, 'x', ${db.json({ apply_order: 2, is_baseline: false, comment: 'no coop', initstring_array: 'carena_um_init' })}),
        ('ktx','mode_default','k_noitems', 1, '1', ${db.json({ mode: 'ca' })}, 'x', ${db.json({ apply_order: 2, is_baseline: false, comment: 'strip items', initstring_array: 'carena_um_init' })})
    `;
    // collision: lava in both sources, different kinds
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_text, ruleset_gate_json, source_ref, props_json) VALUES
        ('id1','env_hazard','lava','-20','{}','x','{}'),
        ('ktx','death_rule','lava','instant','{}','y','{}')
    `;
    // ca mechanic overrides (kind != mode_default, gated to ca): mirrors real
    // data -- KTX suppresses fall damage + drowning entirely inside isCA().
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_numeric, value_text, ruleset_gate_json, source_ref, props_json) VALUES
        ('ktx','env_hazard','fall_damage', 0, '0', ${db.json({ mode: 'ca' })}, 'combat.c:478', ${db.json({ mechanism: 'isCA() early return' })}),
        ('ktx','env_hazard','drowning', 0, '0', ${db.json({ mode: 'ca' })}, 'combat.c:477', ${db.json({ mechanism: 'isCA() early return' })})
    `;
    // bloodfest mechanic overrides (kind='constant', gated to bloodfest)
    await db`
      INSERT INTO gameplay_mechanics (gameplay_source_id, kind, name, value_text, ruleset_gate_json, source_ref, props_json) VALUES
        ('ktx','constant','bloodfest_respawn_rule','instant', ${db.json({ mode: 'bloodfest' })}, 'sp_monsters.c:40', '{}')
    `;
    // monster: shambler is ungated (search_gameplay_entities monster-kind
    // fixture); monster_army/monster_demon1 are bloodfest-gated (describe_mode
    // entity_defs override-join fixture).
    await db`
      INSERT INTO gameplay_entity_defs (gameplay_source_id, kind, name, classname, ruleset_gate_json, source_ref, props_json) VALUES
        ('ktx','monster','shambler',null,'{}','sp_monsters.c:35','{}'),
        ('ktx','monster','monster_army','monster_army', ${db.json({ mode: 'bloodfest' })}, 'sp_monsters.c:68', ${db.json({ hp_for_kill: 1 })}),
        ('ktx','monster','monster_demon1','monster_demon1', ${db.json({ mode: 'bloodfest' })}, 'sp_monsters.c:65', ${db.json({ hp_for_kill: 4 })})
    `;
    // entities: k_instagib (describe_mode mechanical related_entities), k_noitems
    // (curated path). created_at/updated_at are NOT NULL with no default.
    await db`
      INSERT INTO entities (project, type, name, canonical_id, first_seen_version, last_seen_version, created_at, updated_at, description) VALUES
        ('ktx','cvar','k_instagib','ktx:cvar:k_instagib','1','1','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','one-hit rail'),
        ('ktx','cvar','k_noitems','ktx:cvar:k_noitems','1','1','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','strip map items')
    `;
    // concept note for ca (loaded path); instagib has none (null path)
    await db`
      INSERT INTO concepts (slug, title, summary, body, frontmatter, body_sha256) VALUES
        ('ca','Clan Arena','Round-based team elimination.','body',
          ${db.json({ topic: 'game-mode-reference', experience_group: 'arena', roster: 'up to 4v4', loadout: 'full-spawn', objective: 'eliminate-all-enemies', score_system: 'rounds-won', related_entities: ['ktx:cvar:k_noitems'], related_modes: [{ slug: 'wipeout', relation: 'similar-shape' }] })}, 'sha')
    `;
  });

  afterAll(async () => {
    await cleanup();
  });

  test('search_mechanics: omitted source returns all sources', async () => {
    const r = await searchMechanics({ kind: 'death_rule' });
    expect(r.results.map((x) => x.gameplay_source_id).sort()).toEqual(['ktx']); // only ktx has death_rule here
    const r2 = await searchMechanics({}); // everything
    const sources = new Set(r2.results.map((x) => x.gameplay_source_id));
    expect(sources.has('id1')).toBe(true);
    expect(sources.has('ktx')).toBe(true);
  });

  test('search_mechanics: mode filter returns one mode\'s overlays with gate+props', async () => {
    const r = await searchMechanics({ kind: 'mode_default', mode: 'ca' });
    const names = r.results.map((x) => x.name).sort();
    expect(names).toEqual(['coop', 'k_noitems']);
    expect(r.results[0].ruleset_gate_json).toBeDefined();
    expect(r.results[0].props_json).toBeDefined();
  });

  test('lookup_mechanic: cross-source collision returns one row per source', async () => {
    const r = await lookupMechanic({ name: 'lava' });
    expect(r.match_quality).toBe('strong');
    expect(r.results.map((x) => x.gameplay_source_id).sort()).toEqual(['id1', 'ktx']);
  });

  test('search_gameplay_entities: monster kind', async () => {
    const r = await searchGameplayEntities({ kind: 'monster' });
    expect(r.results.map((x) => x.name)).toContain('shambler');
  });

  test('describe_mode: standalone mode with overlays + loaded concept note', async () => {
    const r = await describeMode({ mode: 'ca' });
    expect(r.match_quality).toBe('strong');
    const m = r.results[0];
    expect(m.mode_class).toBe('standalone');
    expect(m.applied_settings.map((s) => s.cvar).sort()).toEqual(['coop', 'k_noitems', 'maxspeed']);
    expect(m.applied_settings.find((s) => s.cvar === 'maxspeed')?.scope).toBe('baseline');
    expect(m.applied_settings.find((s) => s.cvar === 'coop')?.scope).toBe('mode');
    expect(m.concept_note?.experience_group).toBe('arena');
    // curated related_entities path (from note frontmatter):
    expect(m.related_entities.map((e) => e.name)).toContain('k_noitems');
    // override layer: ca has 2 mechanic overrides (env_hazard fall_damage +
    // drowning suppression), no entity_defs overrides.
    expect(m.gameplay_mechanic_overrides.map((o) => o.name).sort()).toEqual(['drowning', 'fall_damage']);
    expect(m.gameplay_mechanic_overrides.every((o) => o.kind === 'env_hazard')).toBe(true);
    expect(m.gameplay_entity_overrides).toEqual([]);
  });

  test('describe_mode: mutator is overlay-less + mechanical related_entities + null note', async () => {
    const r = await describeMode({ mode: 'instagib' });
    const m = r.results[0];
    expect(m.mode_class).toBe('mutator');
    expect(m.applied_settings).toEqual([]); // common NOT tacked on
    expect(m.activation.cvar).toBe('k_instagib');
    expect(m.related_entities.map((e) => e.name)).toContain('k_instagib');
    expect(m.concept_note).toBeNull();
    expect(m.gameplay_entity_overrides).toEqual([]);
    expect(m.gameplay_mechanic_overrides).toEqual([]);
  });

  test('describe_mode: standalone overlay-less mode with entity_defs override join', async () => {
    const r = await describeMode({ mode: 'bloodfest' });
    expect(r.match_quality).toBe('strong');
    const m = r.results[0];
    expect(m.mode_class).toBe('standalone');
    expect(m.applied_settings).toEqual([]); // overlay-less, like race/bloodfest per real data
    // entity_defs override join: the bloodfest-gated monster rows, NOT the
    // ungated 'shambler' fixture row from the search_gameplay_entities test.
    expect(m.gameplay_entity_overrides.map((o) => o.name).sort()).toEqual(['monster_army', 'monster_demon1']);
    expect(m.gameplay_entity_overrides.every((o) => o.kind === 'monster')).toBe(true);
    expect(m.gameplay_entity_overrides.find((o) => o.name === 'monster_army')?.classname).toBe('monster_army');
    // mechanic override join alongside it (kind='constant', gated to bloodfest).
    expect(m.gameplay_mechanic_overrides.map((o) => o.name)).toEqual(['bloodfest_respawn_rule']);
  });

  test('describe_mode: common is not a mode', async () => {
    const r = await describeMode({ mode: 'common' });
    expect(r.match_quality).toBe('none');
    expect(r.results).toEqual([]);
  });
});
