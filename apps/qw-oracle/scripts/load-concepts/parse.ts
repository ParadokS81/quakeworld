// apps/qw-oracle/scripts/load-concepts/parse.ts
//
// Parse a concept-note .md file. Pure: no IO, no DB. Returns null when the
// frontmatter has no slug (skips README.md / OPERATIONS.md / _gap-report.md
// the same way serve/mcp/src/concept-loader.ts already does).
//
// gray-matter is the YAML+body splitter the existing MCP-side concept reader
// uses (apps/qw-oracle/serve/mcp/src/concept-loader.ts:1). Phase 4 reuses the
// same library so frontmatter parsing has one shape across the project.

import matter from 'gray-matter';
import { chunkMarkdown, sha256, type Chunk } from '../../shared/chunking.ts';

// Refs whose 3-part canonical form points at a non-entity artifact. Used to
// keep concept_entities pointing at real Layer 1 entities. The narrower set in
// serve/mcp/src/concept-loader.ts (cvar/command/macro/cmdline_param/ruleset
// only) is a current MCP-surface filter, not a graph-storage filter; Phase 4's
// concept_entities table backs lookup_entity for ALL Layer 1 entity types so
// the partition is "exclude known external prefixes" rather than "include only
// the user-facing five."
const EXTERNAL_REF_PREFIXES: ReadonlySet<string> = new Set(['commit', 'pr', 'extension']);

// Body-link patterns the drift check recognises:
//   [text](curated/concept-notes/<slug>.md)   - relative from the app root
//   [text](<slug>.md)                          - sibling reference within curated/concept-notes/
const CONCEPT_LINK_RE = /\(\s*(?:(?:curated\/)?concept-notes\/)?([a-z0-9][a-z0-9-]*)\.md\s*(?:#[^)]*)?\)/g;

export interface ChunkWithHash extends Chunk {
  sha256: string;
}

export interface ParsedConcept {
  slug: string;
  title: string;
  summary: string;
  body: string;
  bodySha256: string;
  shape: string | null;
  frontmatter: Record<string, unknown>;
  relatedEntities: string[];        // partitioned in: 3-part canonical_ids whose middle segment is an entity type
  externalRefs: string[];           // partitioned out: commits / PRs / extensions (preserved on the parsed object for callers that want them, but not written to concept_entities)
  relatedConcepts: string[];        // from `related_concepts:` frontmatter (Phase-4-introduced convention)
  chunks: ChunkWithHash[];
}

export function partitionRefs(raw: unknown): { entities: string[]; external: string[] } {
  if (!Array.isArray(raw)) return { entities: [], external: [] };
  const entities: string[] = [];
  const external: string[] = [];
  for (const ref of raw) {
    if (typeof ref !== 'string' || ref.length === 0) continue;
    const parts = ref.split(':');
    if (parts.length !== 3 || parts[0]!.length === 0 || parts[1]!.length === 0 || parts[2]!.length === 0) {
      external.push(ref);
      continue;
    }
    if (EXTERNAL_REF_PREFIXES.has(parts[1]!)) {
      external.push(ref);
    } else {
      entities.push(ref);
    }
  }
  return { entities, external };
}

export function extractBodyConceptLinks(body: string): string[] {
  const out = new Set<string>();
  for (const m of body.matchAll(CONCEPT_LINK_RE)) {
    out.add(m[1]!);
  }
  return [...out];
}

export async function parseConceptFile(text: string): Promise<ParsedConcept | null> {
  const parsed = matter(text);
  const fm = parsed.data as Record<string, unknown>;
  const slug = fm.slug;
  if (typeof slug !== 'string' || slug.length === 0) return null;

  const body = parsed.content.trim();
  const bodySha = await sha256(body);
  const rawChunks = chunkMarkdown(body);
  const chunks: ChunkWithHash[] = await Promise.all(
    rawChunks.map(async (c) => ({ ...c, sha256: await sha256(c.text) })),
  );

  const { entities: relatedEntities, external: externalRefs } = partitionRefs(fm.related_entities);
  const relatedConceptsRaw = Array.isArray(fm.related_concepts) ? (fm.related_concepts as unknown[]) : [];
  const relatedConcepts: string[] = [];
  for (const v of relatedConceptsRaw) {
    if (typeof v === 'string' && v.length > 0) relatedConcepts.push(v);
  }

  return {
    slug,
    title: typeof fm.title === 'string' ? fm.title : slug,
    summary: typeof fm.summary === 'string' ? fm.summary : '',
    body,
    bodySha256: bodySha,
    shape: typeof fm.shape === 'string' ? fm.shape : null,
    frontmatter: fm,
    relatedEntities,
    externalRefs,
    relatedConcepts,
    chunks,
  };
}
