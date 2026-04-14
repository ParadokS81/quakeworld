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

const __dirname = dirname(fileURLToPath(import.meta.url));
// serve/mcp/src -> serve/mcp -> serve -> qw-oracle -> layers/concepts
const CONCEPTS_DIR = resolve(__dirname, '..', '..', '..', 'layers', 'concepts');

const conceptStore = loadAllConcepts(CONCEPTS_DIR);

// Reverse index: entity_id -> [concept_id, ...]
// Built once at startup from concept frontmatter. Used by lookup_entity to
// populate linked_concepts without any runtime SQL.
const conceptIndex = new Map<string, string[]>();
for (const [conceptId, note] of conceptStore) {
  for (const cvarId of note.references.cvars) {
    const list = conceptIndex.get(cvarId) ?? [];
    list.push(conceptId);
    conceptIndex.set(cvarId, list);
  }
  for (const cmdId of note.references.commands) {
    const list = conceptIndex.get(cmdId) ?? [];
    list.push(conceptId);
    conceptIndex.set(cmdId, list);
  }
}

console.error(
  `[qw-oracle-mcp] loaded ${conceptStore.size} concept notes, ${conceptIndex.size} cross-ref entries`,
);

const server = new Server(
  { name: 'qw-oracle', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'lookup_entity',
      description:
        'Look up a QuakeWorld cvar OR command by name across all known projects (ezquake, ktx, fte, mvdsv). Returns Layer 1 rows (cvars and/or commands with a type discriminator) plus any linked Layer 3 concept notes. Use this when you have a name from a config or a user question and want to know what it is and where it comes from. For Layer 2 discussion history about the entity, call search_solved_issues with the entity name afterwards.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Entity name, e.g. cl_bob or rpickup. Literal match, case-sensitive.',
          },
          project: {
            type: 'string',
            description: 'Optional. Restrict to one project: ezquake | ktx | fte | mvdsv | qwcl.',
          },
          type: {
            type: 'string',
            enum: ['cvar', 'command'],
            description: 'Optional. Restrict to cvars only or commands only. Default returns both.',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'get_concept_note',
      description:
        'Retrieve a Layer 3 curated concept note by canonical id (e.g. concept:ktx_matchstart_injection). Concept notes are hand-written markdown that explicitly cross-link Layer 1 facts and Layer 2 chat discussions into human-level explanations. The tool response includes the note body, frontmatter, and all referenced cvar/command/session/concept ids so the outlet LLM can follow them.',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Canonical concept id, e.g. concept:ktx_matchstart_injection.',
          },
        },
        required: ['id'],
      },
    },
    {
      name: 'search_solved_issues',
      description:
        'Full-text search over 128,084 denoised QuakeWorld community chat sessions (IRC 2005-2016 plus Discord 2016-present, category="chat" filtered). Returns ranked session hits with raw chat transcripts so the outlet LLM can read what people actually said. Sessions with fewer than 5 chat messages are excluded to cut pickup-callout noise. Use this to find community discussion about a cvar, command, concept, or gameplay topic. The MCP server does no summarisation -- raw transcripts go straight to you for synthesis.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'FTS5 query. Supports phrase matching, prefix, AND/OR, NEAR. E.g. "rpickup", "crosshair AND size", "\"weapon priority\"".',
          },
          limit: {
            type: 'number',
            description:
              'Max number of session hits to return. Default 3. Raising this past 5 is usually wasteful -- FTS rank drops off fast.',
          },
          max_messages_per_session: {
            type: 'number',
            description:
              'Max chat messages to include per session transcript. Default 40. Long sessions get truncated; the outlet LLM still gets enough context to synthesise.',
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
        args as { name: string; project?: string; type?: 'cvar' | 'command' },
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
