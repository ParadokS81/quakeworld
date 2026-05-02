// apps/qw-oracle/shared/chunking.test.ts
import { describe, expect, test } from 'bun:test';
import { chunkMarkdown, sha256 } from './chunking.ts';

describe('chunkMarkdown', () => {
  test('splits a multi-section note into one chunk per ## heading plus the lead-in', () => {
    const md = '# Top\nintro\n\n## A\nbody A\n\n## B\nbody B';
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBe(3);
    expect(chunks[0]!.text).toContain('# Top');
    expect(chunks[1]!.text).toContain('## A');
    expect(chunks[1]!.text).toContain('body A');
    expect(chunks[2]!.text).toContain('## B');
  });

  test('further splits a section that exceeds the 500-token cap', () => {
    // ~4000 chars => >500 tokens at 4 chars/token. Sentences ensure
    // splitBySentence has clean break points.
    const sentence = 'one short sentence here. ';
    const longBody = sentence.repeat(200);
    const md = `# Top\n\n## Big\n${longBody}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2000);
    }
  });

  test('falls back to char-window splitting when a single sentence exceeds the cap', () => {
    // 'word ' x 800 = 4000 chars, no sentence terminators.
    const md = `# Top\n\n## Wall\n${'word '.repeat(800)}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const c of chunks) {
      expect(c.text.length).toBeLessThanOrEqual(2000);
    }
  });

  test('chunks are stable under no-op re-chunking', () => {
    const md = '# T\n\n## A\nfoo\n\n## B\nbar';
    expect(chunkMarkdown(md)).toEqual(chunkMarkdown(md));
  });

  test('empty and whitespace-only input produce no chunks', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('   \n\n   ')).toEqual([]);
  });

  test('a single section without ## headings is one chunk', () => {
    const chunks = chunkMarkdown('# Title\nbody only, no h2 sections.');
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain('# Title');
  });
});

describe('sha256', () => {
  test('hex-encodes a 64-char hash and is deterministic', async () => {
    const a = await sha256('hello');
    const b = await sha256('hello');
    expect(a).toBe(b);
    expect(a.length).toBe(64);
    expect(/^[0-9a-f]{64}$/.test(a)).toBe(true);
  });

  test('different inputs produce different hashes', async () => {
    const a = await sha256('hello');
    const b = await sha256('world');
    expect(a).not.toBe(b);
  });
});
