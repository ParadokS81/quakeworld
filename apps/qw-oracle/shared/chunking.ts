// apps/qw-oracle/shared/chunking.ts
//
// Markdown-aware chunker for Layer 3 concept notes. Splits primarily on `##`
// headings; falls back to sentence-boundary splitting (then char-window
// splitting) when a single section exceeds MAX_TOKENS. Token estimate is the
// 4-chars-per-token heuristic, fine for budget hygiene at this granularity -
// real Voyage tokenization happens in Phase 5 at embedding time.
//
// Stable output: equal input always produces equal output. No timestamps, no
// randomness. The loader's per-chunk sha256 lets Phase 5 skip re-embedding
// chunks whose text hasn't changed.

const MAX_TOKENS = 500;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CHARS = MAX_TOKENS * APPROX_CHARS_PER_TOKEN;

export interface Chunk {
  index: number;
  text: string;
}

export function chunkMarkdown(md: string): Chunk[] {
  const sections = splitOnH2(md);
  const chunks: Chunk[] = [];
  let idx = 0;
  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length <= MAX_CHARS) {
      chunks.push({ index: idx++, text: trimmed });
      continue;
    }
    for (const sub of splitBySentence(trimmed)) {
      chunks.push({ index: idx++, text: sub });
    }
  }
  return chunks;
}

function splitOnH2(md: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const line of md.split('\n')) {
    if (/^##\s/.test(line) && current.trim().length > 0) {
      out.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.trim().length > 0) out.push(current);
  return out;
}

function splitBySentence(text: string): string[] {
  const out: string[] = [];
  let buf = '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    // Single sentence longer than the cap: flush buf, then char-window-split
    // the giant sentence so no produced chunk exceeds MAX_CHARS.
    if (sentence.length > MAX_CHARS) {
      if (buf.trim().length > 0) {
        out.push(buf.trim());
        buf = '';
      }
      for (let i = 0; i < sentence.length; i += MAX_CHARS) {
        out.push(sentence.slice(i, i + MAX_CHARS).trim());
      }
      continue;
    }
    if (buf.length + sentence.length > MAX_CHARS && buf.length > 0) {
      out.push(buf.trim());
      buf = '';
    }
    buf += sentence + ' ';
  }
  if (buf.trim().length > 0) out.push(buf.trim());
  return out;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
