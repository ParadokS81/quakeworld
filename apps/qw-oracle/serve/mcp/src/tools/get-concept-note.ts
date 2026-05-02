// apps/qw-oracle/serve/mcp/src/tools/get-concept-note.ts
//
// Layer 3 concept note lookup. Reads from concepts + concept_concepts +
// concept_entities; the in-memory Map that lived here in Phase <pre-6> is
// gone (concept-loader.ts was deleted in Task 1). Frontmatter passes through
// JSONB.

import { db } from '../db.ts';
import type { ConceptNote, ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

interface Args {
  id: string;
}

interface ConceptRow {
  slug: string;
  title: string;
  summary: string;
  body: string;
  frontmatter: Record<string, unknown>;
}

const SUGGESTION_CAP = 50;

export async function getConceptNote(args: Args): Promise<ToolResponse<ConceptNote>> {
  const slug = args.id.startsWith('concept:') ? args.id.slice('concept:'.length) : args.id;
  const now = new Date().toISOString();

  const rows = await db<ConceptRow[]>`
    SELECT slug, title, summary, body, frontmatter
    FROM concepts
    WHERE slug = ${slug}
  `;
  const row = rows[0];

  if (!row) {
    const all = await db<{ slug: string }[]>`
      SELECT slug FROM concepts ORDER BY slug LIMIT ${SUGGESTION_CAP}
    `;
    const ids = all.map((r) => `concept:${r.slug}`);
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No concept note with id "${args.id}". Available ids: ${ids.join(', ')}`,
      meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
    };
  }

  const [entityRows, conceptRows] = await Promise.all([
    db<{ entity_canonical_id: string }[]>`
      SELECT entity_canonical_id
      FROM concept_entities
      WHERE concept_slug = ${row.slug}
      ORDER BY entity_canonical_id
    `,
    db<{ target_slug: string }[]>`
      SELECT target_slug
      FROM concept_concepts
      WHERE source_slug = ${row.slug}
      ORDER BY target_slug
    `,
  ]);

  const note: ConceptNote = {
    id: `concept:${row.slug}`,
    title: row.title,
    body: row.body,
    related_entities: entityRows.map((e) => e.entity_canonical_id),
    related_concepts: conceptRows.map((c) => `concept:${c.target_slug}`),
    external_refs: [], // legacy field; the loader's partitionRefs strands non-entity refs in concepts.frontmatter; surface them there if a consumer needs them
    frontmatter: row.frontmatter,
  };

  return {
    results: [note],
    match_quality: 'strong',
    suggested_fallback: null,
    meta: { tool: 'get_concept_note', server_version: SERVER_VERSION, queried_at: now },
  };
}
