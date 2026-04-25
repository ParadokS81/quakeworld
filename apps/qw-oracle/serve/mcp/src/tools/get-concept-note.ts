// Layer 3 concept note lookup. The concept store is loaded once at server
// startup (see index.ts -> concept-loader.ts). This tool is effectively a
// typed wrapper around Map.get with the MCP response envelope.

import type { ConceptNote, ToolResponse } from '../types.ts';

const SERVER_VERSION = '0.1.0';

interface GetConceptNoteArgs {
  id: string;
}

export function getConceptNote(
  args: GetConceptNoteArgs,
  conceptStore: Map<string, ConceptNote>,
): ToolResponse<ConceptNote> {
  const note = conceptStore.get(args.id);
  const now = new Date().toISOString();

  if (!note) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No concept note with id "${args.id}". Available ids: ${[...conceptStore.keys()].join(', ')}`,
      meta: {
        tool: 'get_concept_note',
        server_version: SERVER_VERSION,
        queried_at: now,
      },
    };
  }

  return {
    results: [note],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: {
      tool: 'get_concept_note',
      server_version: SERVER_VERSION,
      queried_at: now,
    },
  };
}
