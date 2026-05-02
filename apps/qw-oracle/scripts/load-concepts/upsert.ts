// apps/qw-oracle/scripts/load-concepts/upsert.ts
//
// Atomic per-slug upsert. Single transaction:
//   1. UPSERT concepts row (frontmatter passthrough as JSONB).
//   2. DELETE+INSERT concept_entities for slug (cheap; rebuild always - drift-proof).
//   3. DELETE+INSERT concept_concepts for slug.
//   4. If body_sha256 changed (or no prior row): DELETE+INSERT concept_chunks for slug.
//      Phase 5 re-fills embeddings on chunks where embedding IS NULL OR embedding_stale.
//
// All four steps are in one transaction so a partial failure rolls back; the
// MCP never sees a half-rebuilt concept.

import { db } from '../../shared/db.ts';
import type { ParsedConcept } from './parse.ts';

export async function upsertConcept(c: ParsedConcept): Promise<{ slug: string; chunksRewritten: boolean }> {
  let chunksRewritten = false;
  await db.begin(async (tx) => {
    const existing = await tx<{ body_sha256: string }[]>`
      SELECT body_sha256 FROM concepts WHERE slug = ${c.slug}
    `;
    const skipChunks = existing.length > 0 && existing[0]!.body_sha256 === c.bodySha256;

    // frontmatter is JSONB. Pass via tx.json(value as never) per the
    // qw-oracle CLAUDE.md always-on rule: pre-stringifying with
    // JSON.stringify(...)::jsonb stores a JSONB string scalar (the legacy
    // SQLite-era TEXT bug Phase 2 fixed). Phase 2/3 code (load-knowledge,
    // load-chat) all use tx.json(... as never); Phase 4 matches.
    await tx`
      INSERT INTO concepts (slug, title, summary, body, shape, frontmatter, body_sha256, updated_at)
      VALUES (
        ${c.slug}, ${c.title}, ${c.summary}, ${c.body}, ${c.shape},
        ${tx.json(c.frontmatter as never)}, ${c.bodySha256}, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title       = EXCLUDED.title,
        summary     = EXCLUDED.summary,
        body        = EXCLUDED.body,
        shape       = EXCLUDED.shape,
        frontmatter = EXCLUDED.frontmatter,
        body_sha256 = EXCLUDED.body_sha256,
        updated_at  = now()
    `;

    await tx`DELETE FROM concept_entities WHERE concept_slug = ${c.slug}`;
    for (const eid of c.relatedEntities) {
      await tx`
        INSERT INTO concept_entities (concept_slug, entity_canonical_id)
        VALUES (${c.slug}, ${eid})
        ON CONFLICT DO NOTHING
      `;
    }

    await tx`DELETE FROM concept_concepts WHERE source_slug = ${c.slug}`;
    for (const target of c.relatedConcepts) {
      await tx`
        INSERT INTO concept_concepts (source_slug, target_slug)
        VALUES (${c.slug}, ${target})
        ON CONFLICT DO NOTHING
      `;
    }

    if (!skipChunks) {
      await tx`DELETE FROM concept_chunks WHERE concept_slug = ${c.slug}`;
      for (const ch of c.chunks) {
        await tx`
          INSERT INTO concept_chunks (concept_slug, chunk_index, text, text_sha256)
          VALUES (${c.slug}, ${ch.index}, ${ch.text}, ${ch.sha256})
        `;
      }
      chunksRewritten = true;
    }
  });
  return { slug: c.slug, chunksRewritten };
}
