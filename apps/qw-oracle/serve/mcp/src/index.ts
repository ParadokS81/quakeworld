#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadAllConcepts } from './concept-loader.ts';
import { lookupEntity } from './tools/lookup-entity.ts';
import { searchSolvedIssues } from './tools/search-solved-issues.ts';
import { getConceptNote } from './tools/get-concept-note.ts';
import { searchEntities } from './tools/search-entities.ts';
import type { EntityType } from './types.ts';

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
  { name: 'qw-oracle', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[qw-oracle-mcp] connected via stdio');
