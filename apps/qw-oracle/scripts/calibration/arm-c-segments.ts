// Arm C -- cheap mechanical segmentation (NO LLM). Forward pass over each
// channel's time-ordered messages: continue the current segment on a reply edge
// into it, OR on participant continuity within 30 min, OR on a sub-5-min gap;
// otherwise cut. This is the load-bearing "cheap signal" arm -- the test asks
// whether LLM fencing (arm D) actually beats this.

import { Database } from 'bun:sqlite';

interface MsgRow { id: string; author: string; content: string; created_at: string; ref_id: string | null }
export interface Segment { id: string; channel: string; text: string; memberIds: string[] }

const MIN = 60 * 1000;

export function buildArmCSegments(slice: Database, channels: string[]): Segment[] {
  const out: Segment[] = [];
  for (const ch of channels) {
    const slug = ch.replace(/^#/, '');
    const msgs = slice.query<MsgRow, [string]>(
      `SELECT id, author, content, created_at, ref_id FROM msg WHERE channel=? ORDER BY created_at`,
    ).all(ch);

    let cur: MsgRow[] = [];
    let ids = new Set<string>();
    let authors = new Set<string>();
    let lastTs = 0;
    let n = 0;

    const flush = () => {
      if (cur.length) {
        n += 1;
        out.push({
          id: `c-${slug}-${n}`,
          channel: ch,
          text: cur.map((m) => `${m.author}: ${m.content}`).join('\n'),
          memberIds: cur.map((m) => m.id),
        });
      }
      cur = []; ids = new Set(); authors = new Set();
    };

    for (const m of msgs) {
      const ts = new Date(m.created_at).getTime();
      const gap = lastTs ? ts - lastTs : 0;
      const cont =
        cur.length === 0 ||
        (m.ref_id != null && ids.has(m.ref_id)) ||      // reply edge into the segment
        (authors.has(m.author) && gap < 30 * MIN) ||    // participant continuity within 30 min
        gap < 5 * MIN;                                  // sub-5-min gap
      if (!cont) flush();
      cur.push(m); ids.add(m.id); authors.add(m.author); lastTs = ts;
    }
    flush();
  }
  return out;
}
