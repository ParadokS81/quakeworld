import matter from 'gray-matter';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import type { ConceptNote } from './types.ts';

export function loadAllConcepts(conceptsDir: string): Map<string, ConceptNote> {
  const out = new Map<string, ConceptNote>();
  const files = readdirSync(conceptsDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md',
  );

  for (const file of files) {
    const text = readFileSync(resolve(conceptsDir, file), 'utf8');
    const parsed = matter(text);
    const fm = parsed.data as Partial<ConceptNote> & {
      references?: Partial<ConceptNote['references']>;
    };
    const id = fm.id ?? `concept:${basename(file, extname(file))}`;
    const note: ConceptNote = {
      id,
      title: fm.title ?? id,
      description: fm.description ?? '',
      body: parsed.content.trim(),
      tags: Array.isArray(fm.tags) ? (fm.tags as string[]) : [],
      references: {
        cvars: fm.references?.cvars ?? [],
        commands: fm.references?.commands ?? [],
        sessions: fm.references?.sessions ?? [],
        concepts: fm.references?.concepts ?? [],
      },
      authored_by: fm.authored_by ?? 'unknown',
      authored_at: fm.authored_at ?? 'unknown',
      confidence: fm.confidence ?? 'medium',
    };
    out.set(id, note);
  }
  return out;
}
