#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SERVER_VERSION } from './version.ts';
import { loadAllConcepts } from './concept-loader.ts';
import { lookupEntity } from './tools/lookup-entity.ts';
import { searchSolvedIssues } from './tools/search-solved-issues.ts';
import { getConceptNote } from './tools/get-concept-note.ts';
import { searchEntities } from './tools/search-entities.ts';
import { lookupMap } from './tools/lookup-map.ts';
import { searchMaps } from './tools/search-maps.ts';
import { lookupGameplayEntity } from './tools/lookup-gameplay-entity.ts';
import { lookupMechanic } from './tools/lookup-mechanic.ts';
import { searchGameplayEntities } from './tools/search-gameplay-entities.ts';
import { searchMechanics } from './tools/search-mechanics.ts';
import type { SearchGameplayEntitiesArgs } from './tools/search-gameplay-entities.ts';
import type { SearchMechanicsArgs } from './tools/search-mechanics.ts';
import { knowledgeDb } from './db.ts';
import type { EntityType } from './types.ts';
import type { SearchMapsArgs } from './tools/search-maps.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
// serve/mcp/src -> serve/mcp -> serve -> qw-oracle -> concept-notes
const CONCEPTS_DIR = resolve(__dirname, '..', '..', '..', 'concept-notes');

const conceptStore = loadAllConcepts(CONCEPTS_DIR);

// Reverse index: entity_canonical_id -> [concept_id, ...]
// Built once at startup from concept frontmatter so lookup_entity and
// search_entities can populate linked_concepts without runtime SQL.
const conceptIndex = new Map<string, string[]>();
for (const [conceptId, note] of conceptStore) {
  for (const entityId of note.related_entities) {
    const list = conceptIndex.get(entityId) ?? [];
    list.push(conceptId);
    conceptIndex.set(entityId, list);
  }
}

console.error(
  `[qw-oracle-mcp] loaded ${conceptStore.size} concept notes, ${conceptIndex.size} cross-ref entries`,
);

const ENTITY_TYPE_ENUM: EntityType[] = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'];

const server = new Server(
  { name: 'qw-oracle', version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'lookup_entity',
      description:
        'Look up a QuakeWorld entity by name across the four engine projects (ezquake, ktx, fte, mvdsv) and the five user-facing entity types (cvar, command, macro, cmdline_param, ruleset). Case-insensitive. Returns rich Layer 1 records: identity + project + type + source_state (live | retired | doc-only | dynamically-registered) + first_seen_version + last_seen_version + current per-version snapshot (default value, help text, type, flags, source file:line, plus any type-specific columns) + asset relations for cvars (which file categories the cvar controls) + linked Layer 3 concept notes that reference this entity. One call returns everything the asking LLM needs about the entity at its current state. For community discussion about the entity, call search_solved_issues with the entity name afterwards. info_key cross-scope rule: info_key entity names are stored as `<bare>:<scope>` (e.g. `*z_ext:serverinfo`, `*z_ext:userinfo`) so the same key registered in multiple scopes yields multiple rows; passing the bare form (e.g. `*z_ext`) with type=info_key returns every scope variant.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Entity name, e.g. cl_bob or rpickup. Case-insensitive.',
          },
          project: {
            type: 'string',
            description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv.',
          },
          type: {
            type: 'string',
            enum: ENTITY_TYPE_ENUM,
            description:
              'Optional. Restrict to one entity type. Default returns matches across all five types.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'search_entities',
      description:
        'Substring search for QuakeWorld entities by name or current help-description. Returns the same rich EntityRecord shape as lookup_entity (source_state, version arc, asset relations, linked concept notes). Use when you have a partial name, a topic word ("frag", "crosshair", "lightning"), or want to discover entities related to a concept. Name matches rank above description-only matches.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Substring to match against entity names and current help text. Case-insensitive.',
          },
          project: {
            type: 'string',
            description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv.',
          },
          type: {
            type: 'string',
            enum: ENTITY_TYPE_ENUM,
            description:
              'Optional. Restrict to one entity type. Default searches all five types.',
          },
          limit: {
            type: 'number',
            description: 'Max results to return. Default 10, max 25.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_concept_note',
      description:
        'Retrieve a Layer 3 curated concept note by canonical id (e.g. concept:weapon-scripts, concept:player-skins). Concept notes are hand-authored markdown that synthesises Layer 1 facts and Layer 2 community testimony into usable guidance. Returns the note body plus full frontmatter passthrough: title, slug, topic, status, source_url (when imported from upstream), primary_contributors, related_entities (canonical_ids), external_refs (commits, PRs, file extensions), scope (cross-engine | engine-specific), engines_covered, and any other fields the note declares.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Canonical concept id, e.g. concept:weapon-scripts.',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'search_solved_issues',
      description:
        'Full-text search over the QuakeWorld community chat corpus: 2.66M denoised messages from QuakeNet IRC (2005-2016, 1.94M) and the Quake.World Discord (2016-present, 717K). Returns ranked session transcripts so the asking LLM reads what people actually said. Sessions with fewer than 5 chat messages are excluded to drop pickup-callout noise. Use this for community discussion about cvars, commands, gameplay topics, troubleshooting, history. Discord hits include deep links back to the original message.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'FTS5 query. Supports phrase matching, prefix, AND/OR, NEAR. E.g. "rpickup", "crosshair AND size", "\\"weapon priority\\"".',
          },
          limit: {
            type: 'number',
            description:
              'Max session hits to return. Default 3. Raising past 5 is usually wasteful; FTS rank drops off fast.',
          },
          max_messages_per_session: {
            type: 'number',
            description:
              'Max chat messages per session transcript. Default 40. Long sessions get truncated; the asking LLM still gets enough context to synthesise.',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'lookup_map',
      description:
        'Look up a QuakeWorld map by canonical name (case-insensitive). Returns rich Layer 1 record: display name, author (when known), BSP version + size + hash, full worldspawn property dump, every entity-classname count, normalized item summary (RA/YA/GA/mh/h25/h15/quad/pent/ring/bio/SSG/NG/SNG/GL/RL/LG/cells/rockets/spikes/shells), spawn-point counts (dm/team1/team2/coop/start/intermission), feature flags (teleporter count, has_water/has_lava/has_slime), referenced WAD textures, inferred gamemodes (1on1/2on2/4on4/ffa from popularity + spawn-count fallback), and popularity stats from stats.quakeworld.nu. Use this when you have a specific map name. For "what map has X" or "maps without X" questions, use search_maps instead.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Map canonical name (file basename without .bsp), e.g. dm3, aerowalk, povdmm4. Case-insensitive.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'search_maps',
      description:
        'Filter QuakeWorld maps by item layout, features, gamemode, popularity, or player capacity. Returns compact rows ordered by popularity rank. Use this for questions like "maps without lightning gun" (lacks_weapon: [lg]), "4on4 maps with quad" (gamemode: 4on4, has_powerup: [quad]), "small 1on1 maps" (gamemode: 1on1, max_dm_spawns: 4), "maps with lava" (has_lava: true). For full record details on a single map, follow up with lookup_map.',
      inputSchema: {
        type: 'object',
        properties: {
          has_weapon: {
            type: 'array',
            items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
            description: 'Match maps that contain ALL listed weapons. Item codes: ssg (super shotgun), ng (nailgun), sng (super nailgun), gl (grenade launcher), rl (rocket launcher), lg (lightning gun).',
          },
          lacks_weapon: {
            type: 'array',
            items: { type: 'string', enum: ['ssg', 'ng', 'sng', 'gl', 'rl', 'lg'] },
            description: 'Match maps that contain NONE of the listed weapons.',
          },
          has_powerup: {
            type: 'array',
            items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
            description: 'Match maps that contain ALL listed powerups. quad=quad damage, pent=pentagram of protection, ring=ring of shadows, bio=biosuit.',
          },
          lacks_powerup: {
            type: 'array',
            items: { type: 'string', enum: ['quad', 'pent', 'ring', 'bio'] },
            description: 'Match maps that contain NONE of the listed powerups.',
          },
          has_armor: {
            type: 'array',
            items: { type: 'string', enum: ['ra', 'ya', 'ga'] },
            description: 'Match maps that contain ALL listed armors. ra=red armor, ya=yellow armor, ga=green armor.',
          },
          has_water:       { type: 'boolean', description: 'Match maps that contain water (true) or maps without water (false).' },
          has_lava:        { type: 'boolean', description: 'Match maps that contain lava (true) or maps without lava (false).' },
          has_slime:       { type: 'boolean', description: 'Match maps that contain slime/acid (true) or maps without slime (false).' },
          has_teleporters: { type: 'boolean', description: 'Match maps that have at least one teleporter (true) or no teleporters (false).' },
          gamemode: {
            type: 'string',
            enum: ['1on1', '2on2', '4on4', 'ffa'],
            description: 'Match maps that are popular (or have appropriate spawn count) in this gamemode.',
          },
          min_popularity_rank: { type: 'number', description: 'Minimum popularity rank (1 = most popular). Use with max_popularity_rank for ranges.' },
          max_popularity_rank: { type: 'number', description: 'Maximum popularity rank. Use 50 to limit to top-50 maps.' },
          min_dm_spawns:       { type: 'number', description: 'Minimum count of info_player_deathmatch entities. Higher = larger maps.' },
          max_dm_spawns:       { type: 'number', description: 'Maximum count of info_player_deathmatch entities. 4 or fewer = small 1on1 layouts.' },
          limit:               { type: 'number', description: 'Max results to return. Default 25, max 100.' },
        },
      },
    },
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  switch (name) {
    case 'lookup_entity': {
      const response = lookupEntity(
        args as { name: string; project?: string; type?: EntityType },
        conceptIndex,
      );
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'search_entities': {
      const response = searchEntities(
        args as { query: string; project?: string; type?: EntityType; limit?: number },
        conceptIndex,
      );
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'search_solved_issues': {
      const response = searchSolvedIssues(
        args as { query: string; limit?: number; max_messages_per_session?: number },
      );
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'get_concept_note': {
      const response = getConceptNote(args as { id: string }, conceptStore);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'lookup_map': {
      const response = lookupMap(knowledgeDb, args as { name: string });
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
    case 'search_maps': {
      const response = searchMaps(knowledgeDb, args as SearchMapsArgs);
      return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }] };
    }
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[qw-oracle-mcp] connected via stdio');
