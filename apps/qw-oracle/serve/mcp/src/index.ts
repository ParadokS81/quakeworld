#!/usr/bin/env bun
// apps/qw-oracle/serve/mcp/src/index.ts
//
// Entry point. stdio transport is the default (local Claude Code consumers);
// MCP_TRANSPORT=http selects the Streamable HTTP transport (Task 10) for the
// public-MCP deploy. The Server is created via createServer() so HTTP mode
// can spin up a fresh Server per session per the SDK v1.x pattern.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializedNotificationSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { SERVER_VERSION } from './version.ts';
import { ORIENTATION_INSTRUCTIONS } from './orientation.ts';
import { db } from './db.ts';
import { verifyEmbeddingSpace, EMBEDDING_SPACE_THRESHOLD } from '../../../shared/embedding.ts';
import { dispatchAndLog, setConsumerHint } from './query-log.ts';

import { lookupEntity } from './tools/lookup-entity.ts';
import { searchEntities } from './tools/search-entities.ts';
import { getConceptNote } from './tools/get-concept-note.ts';
import { searchSolvedIssues } from './tools/search-solved-issues.ts';
import { lookupMap } from './tools/lookup-map.ts';
import { searchMaps } from './tools/search-maps.ts';
import { lookupMechanic } from './tools/lookup-mechanic.ts';
import { searchMechanics } from './tools/search-mechanics.ts';
import { lookupGameplayEntity } from './tools/lookup-gameplay-entity.ts';
import { searchGameplayEntities } from './tools/search-gameplay-entities.ts';
import { searchConcepts } from './tools/search-concepts.ts';
import { redirectToHuman } from './tools/redirect-to-human.ts';

import type { EntityType } from './types.ts';
import type { SearchMapsArgs } from './tools/search-maps.ts';
import type { SearchMechanicsArgs } from './tools/search-mechanics.ts';
import type { SearchGameplayEntitiesArgs } from './tools/search-gameplay-entities.ts';

import { startHttpServer } from './transports/http.ts';

// Compress filter-shaped tool args into a short summary so query_log.query_text
// stays legible. Returns null for an empty args object; caps at 200 chars.
function summariseFilterArgs(args: Record<string, unknown>): string | null {
  const keys = Object.keys(args);
  if (keys.length === 0) return null;
  const compact = keys.map((k) => {
    const v = args[k];
    if (Array.isArray(v)) return `${k}=[${(v as unknown[]).map(String).join(',')}]`;
    if (typeof v === 'object' && v !== null) return `${k}=<obj>`;
    return `${k}=${String(v)}`;
  }).join(' ');
  return compact.length > 200 ? compact.slice(0, 197) + '...' : compact;
}

const ENTITY_TYPE_ENUM: EntityType[] = ['cvar', 'command', 'macro', 'cmdline_param', 'ruleset'];
const VERIFY_TTL_HOURS = parseFloat(process.env.EMBEDDING_VERIFY_TTL_HOURS ?? '24');

async function maybeVerifyEmbeddingSpace(): Promise<void> {
  // D8 / F14: skip the API call on warm restart if a recent verify exists.
  const rows = await db<{ updated_at: string }[]>`
    SELECT updated_at FROM oracle_meta WHERE key = 'embedding_space_verified_at'
  `;
  const last = rows[0];
  if (last) {
    const ageMs = Date.now() - new Date(last.updated_at).getTime();
    const ttlMs = VERIFY_TTL_HOURS * 3600 * 1000;
    if (ageMs < ttlMs) {
      console.error(`[qw-oracle-mcp] embedding-space verify cached (age ${Math.round(ageMs / 60000)}m, ttl ${VERIFY_TTL_HOURS}h)`);
      return;
    }
  }
  try {
    const v = await verifyEmbeddingSpace();
    if (v.similarity < EMBEDDING_SPACE_THRESHOLD) {
      console.error(
        `[qw-oracle-mcp] FATAL: build/query embedding spaces appear divergent (cosine ${v.similarity.toFixed(4)} < ${EMBEDDING_SPACE_THRESHOLD}); verify Voyage 4-series shared-space claim`,
      );
      process.exit(1);
    }
    // Phase 5 contract: oracle_meta(key='embedding_space_verified_at') value
    // is the verifier's own timestamp (ISO-8601). The cosine itself is in the
    // embedding_api_log row Phase 5's verifier wrote during the verify call;
    // we do not duplicate it here. The TTL gate above reads `updated_at`, so
    // the value column is informational, not load-bearing.
    await db`
      INSERT INTO oracle_meta (key, value, updated_at)
      VALUES ('embedding_space_verified_at', ${new Date().toISOString()}, now())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
    console.error(`[qw-oracle-mcp] embedding-space verified (cosine ${v.similarity.toFixed(4)})`);
  } catch (err) {
    // Voyage outage is degraded, not fatal: lexical-only retrieval still works.
    // Phase 5 logged the api_log error row already.
    console.error(`[qw-oracle-mcp] WARN: embedding-space verify failed (${(err as Error).message}); continuing in lexical-only mode`);
  }
}

export function createServer(): Server {
  const server = new Server(
    { name: 'qw-oracle', version: SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions: ORIENTATION_INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_LIST,
  }));

  // Capture the consumer's name+version once the MCP handshake completes.
  // For stdio this is a single-process global; for HTTP/SSE the *last* client
  // to connect wins (Phase 7 Open question 5; revisit if Phase 8 traffic
  // shows overlapping concurrent sessions).
  server.setNotificationHandler(InitializedNotificationSchema, async () => {
    const info = server.getClientVersion();
    if (info && typeof info.name === 'string') {
      const version = typeof info.version === 'string' ? info.version : 'unknown';
      setConsumerHint(`${info.name}/${version}`);
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs } = request.params;
    const args = (rawArgs ?? {}) as Record<string, unknown>;
    switch (name) {
      case 'lookup_entity':
        return dispatchAndLog(
          { tool: 'lookup_entity', queryText: typeof args.name === 'string' ? args.name : null },
          () => lookupEntity(args as { name: string; project?: string; type?: EntityType }),
        );
      case 'search_entities':
        return dispatchAndLog(
          { tool: 'search_entities', queryText: typeof args.query === 'string' ? args.query : null },
          () => searchEntities(args as { query: string; project?: string; type?: EntityType; limit?: number }),
        );
      case 'search_concepts':
        return dispatchAndLog(
          { tool: 'search_concepts', queryText: typeof args.query === 'string' ? args.query : null },
          () => searchConcepts(args as { query: string; limit?: number }),
        );
      case 'get_concept_note':
        return dispatchAndLog(
          { tool: 'get_concept_note', queryText: typeof args.id === 'string' ? args.id : null },
          () => getConceptNote(args as { id: string }),
        );
      case 'search_solved_issues':
        return dispatchAndLog(
          { tool: 'search_solved_issues', queryText: typeof args.query === 'string' ? args.query : null },
          () => searchSolvedIssues(args as { query: string; limit?: number; max_messages_per_session?: number }),
        );
      case 'lookup_map':
        return dispatchAndLog(
          { tool: 'lookup_map', queryText: typeof args.name === 'string' ? args.name : null },
          () => lookupMap(args as { name: string }),
        );
      case 'search_maps':
        return dispatchAndLog(
          { tool: 'search_maps', queryText: summariseFilterArgs(args) },
          () => searchMaps(args as SearchMapsArgs),
        );
      case 'lookup_gameplay_entity':
        return dispatchAndLog(
          { tool: 'lookup_gameplay_entity', queryText: typeof args.name === 'string' ? args.name : null },
          () => lookupGameplayEntity(args as { name: string; gameplay_source?: string }),
        );
      case 'lookup_mechanic':
        return dispatchAndLog(
          { tool: 'lookup_mechanic', queryText: typeof args.name === 'string' ? args.name : null },
          () => lookupMechanic(args as { name: string; gameplay_source?: string }),
        );
      case 'search_gameplay_entities':
        return dispatchAndLog(
          { tool: 'search_gameplay_entities', queryText: summariseFilterArgs(args) },
          () => searchGameplayEntities(args as SearchGameplayEntitiesArgs),
        );
      case 'search_mechanics':
        return dispatchAndLog(
          { tool: 'search_mechanics', queryText: summariseFilterArgs(args) },
          () => searchMechanics(args as SearchMechanicsArgs),
        );
      case 'redirect_to_human':
        return dispatchAndLog(
          { tool: 'redirect_to_human', queryText: typeof args.topic_hint === 'string' ? args.topic_hint : null },
          () => redirectToHuman(args as { topic_hint?: string }),
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// TOOL_LIST is hoisted so createServer() does not rebuild it per session.
// The 10 existing tool definitions are copied verbatim from the pre-Phase-6
// serve/mcp/src/index.ts (commit 84154e6, lines 56-276) so descriptions and
// inputSchemas remain unchanged for downstream consumers. The two new tools
// (search_concepts, redirect_to_human) are appended after.
const TOOL_LIST = [
  {
    name: 'lookup_entity',
    description:
      'Look up a QuakeWorld entity by name across the four engine projects (ezquake, ktx, fte, mvdsv) and the five user-facing entity types (cvar, command, macro, cmdline_param, ruleset). Case-insensitive. Returns rich Layer 1 records: identity + project + type + source_state (live | retired | doc-only | dynamically-registered) + first_seen_version + last_seen_version + current per-version snapshot (default value, help text, type, flags, source file:line, plus any type-specific columns) + asset relations for cvars (which file categories the cvar controls) + linked Layer 3 concept notes that reference this entity. One call returns everything the asking LLM needs about the entity at its current state. For community discussion about the entity, call search_solved_issues with the entity name afterwards.',
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
      'Hybrid retrieval (lexical tsvector + semantic pgvector, fused via Reciprocal Rank Fusion) over QuakeWorld Layer 1 entities. Returns the same rich EntityRecord shape as lookup_entity (source_state, version arc, asset relations, linked concept notes). Use for partial names, topic words ("frag", "crosshair", "lightning"), or symptom-form queries ("fps drops when window minimized") -- the semantic half bridges user-vocabulary to upstream-developer-vocabulary even when there is no surface-keyword overlap. Name matches rank above description-only matches.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Free-text query matched against entity names + concatenated help text (help_desc + help_remarks + per-value descriptions for cvars). Case-insensitive.',
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
            'Full-text query. Supports Postgres `websearch_to_tsquery` syntax: phrase matching with double-quotes, AND/OR boolean operators, leading minus for exclude. E.g. "rpickup", "crosshair size", "weapon priority", "-bot".',
        },
        limit: {
          type: 'number',
          description:
            'Max session hits to return. Default 3. Raising past 5 is usually wasteful; rank drops off fast.',
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
      'Look up a QuakeWorld game-mechanics rule by name. Returns the rule\'s value, kind (constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule), source_ref pointing at the canonical id1 QuakeC line, and any ruleset gate. Examples: lava, slime, drowning, fall_damage, telefrag, quad_damage_multiplier, armor_absorb_formula, sv_gravity_default, spawn_invul_dm4, dm4_rules. Case-insensitive. To enumerate a category or a mode\'s settings use search_mechanics (kind + mode filters); for a whole game mode use describe_mode; for a specific weapon/item use lookup_gameplay_entity.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Mechanic name. Case-insensitive.' },
        gameplay_source: { type: 'string', description: 'Omit to search all sources (id1 + ktx); a name in both returns one row per source. Pass "ktx"/"id1" to scope.' },
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
        kind: { type: 'string', enum: ['item', 'weapon', 'projectile', 'monster'], description: 'Restrict to one kind. monster (KTX bloodfest roster).' },
        has_splash: { type: 'boolean', description: 'Match entities with splash damage > 0 (true) or without (false).' },
        min_damage: { type: 'number', description: 'Minimum damage column value.' },
        max_damage: { type: 'number', description: 'Maximum damage column value.' },
        min_respawn: { type: 'number', description: 'Minimum respawn_seconds.' },
        max_respawn: { type: 'number', description: 'Maximum respawn_seconds.' },
        ammo_type: { type: 'string', enum: ['shells','nails','rockets','cells'], description: 'Filter on props_json.ammo_type.' },
        gameplay_source: { type: 'string', description: 'Omit to search all sources (id1 + ktx). Pass "ktx"/"id1" to scope.' },
        limit: { type: 'number', description: 'Max rows. Default 25, max 100.' },
      },
    },
  },
  {
    name: 'search_mechanics',
    description:
      'Filter QuakeWorld game-mechanics rows by kind, mode, or substring. Returns rows (with gameplay_source_id + ruleset_gate_json + props_json) ordered by source+kind+name. Base-game (id1) kinds: constant, env_hazard, player_stat, powerup_behavior, armor_model, death_rule, spawn_rule, dm_mode_rule. KTX kinds: game_mode (mode catalog), mode_default (per-cvar settings a mode applies -- filter to one mode with the mode parameter, e.g. mode="ca"), election_type, score_system, drop_item, loc_macro, teamplay_message, plus death_rule (shared with base-game -- KTX adds 27 of its own). Omit gameplay_source to search all sources (id1 + ktx). For a whole game mode assembled in one call use describe_mode; for a single named rule use lookup_mechanic.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Substring match on name, value_text, or notes (case-insensitive).' },
        kind: { type: 'string', enum: ['constant','env_hazard','player_stat','powerup_behavior','armor_model','death_rule','spawn_rule','dm_mode_rule','game_mode','mode_default','election_type','score_system','drop_item','loc_macro','teamplay_message'], description: 'Restrict to one kind.' },
        mode: { type: 'string', description: 'For kind=mode_default: restrict to one mode token (ruleset_gate_json->>"mode"), e.g. ca, wipeout, 1on1, or common for the baseline.' },
        gameplay_source: { type: 'string', description: 'Omit to search all sources (id1 base Quake + ktx). Pass "ktx" or "id1" to scope.' },
        limit: { type: 'number', description: 'Max rows. Default 50, max 100.' },
      },
    },
  },

  // NEW: search_concepts
  {
    name: 'search_concepts',
    description:
      'Hybrid retrieval (lexical tsvector + semantic pgvector, fused via Reciprocal Rank Fusion) over Layer 3 concept notes. Use for vague how-to questions ("how do I make my screen stop wobbling", "weapon switching script"). Returns the matched chunk as a focused snippet plus the concept summary, related Layer 1 entities, and sibling concepts. Call get_concept_note(slug) for the full note body if the snippet is not enough.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query. No special syntax required.' },
        limit: { type: 'number', description: 'Max chunk hits to return. Default 5, max 25.' },
      },
      required: ['query'],
    },
  },
  // NEW: redirect_to_human
  {
    name: 'redirect_to_human',
    description:
      'Returns curated pointers to human-staffed surfaces (Discord helpdesk, expert handles, ezquake.com docs, wiki.quakeworld.nu). Call this when match_quality is weak or none on prior tools and the corpus genuinely does not cover the question - this is the honest-failure exit, not a fallback for retrieval misses.',
    inputSchema: {
      type: 'object',
      properties: {
        topic_hint: {
          type: 'string',
          description: 'Optional. Free-form hint about the topic (e.g. "fte", "config"). v1 returns all targets; future versions may rank by hint.',
        },
      },
    },
  },
];

async function main(): Promise<void> {
  await maybeVerifyEmbeddingSpace();

  const transport = process.env.MCP_TRANSPORT ?? 'stdio';
  if (transport === 'http') {
    const port = parseInt(process.env.MCP_PORT ?? '3000', 10);
    startHttpServer(createServer, port);
    console.error(`[qw-oracle-mcp] http transport listening on 0.0.0.0:${port}`);
  } else if (transport === 'stdio') {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    console.error('[qw-oracle-mcp] connected via stdio');
  } else {
    console.error(`[qw-oracle-mcp] FATAL: unknown MCP_TRANSPORT=${transport}; expected 'stdio' or 'http'`);
    process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
