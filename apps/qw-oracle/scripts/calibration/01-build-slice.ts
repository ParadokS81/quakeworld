// Stage 1.1 -- build the calibration slice: live Postgres -> scratch/slice.sqlite.
//
// Deterministic, zero LLM, zero Voyage. Reads the LIVE corpus (messages /
// message_labels / session_search), filtered to the locked window + channels +
// chat/link category. Idempotent: drops and rebuilds the scratch tables.
//
//   bun scripts/calibration/01-build-slice.ts
//
// Verify target (density drill): #helpdesk ~6131 / #quakeworld ~10115 chat/link msgs.

import { Database } from 'bun:sqlite';
import { db, closeDb } from '../../shared/db.ts';
import { CHANNELS, WINDOW_START, WINDOW_END, SLICE_DB } from './config.ts';

interface MsgRow {
  id: string;
  channel: string;
  author: string;
  content: string;
  created_at: string | Date;
  ref_id: string | null;
  session_id: string | number | null;
  category: string;
}

interface SessRow {
  session_id: string | number;
  channel: string;
  started_at: string | Date;
  chat_count: number;
  content: string;
}

const chans = CHANNELS as unknown as string[];

async function main(): Promise<void> {
  // In-window chat/link messages, ordered for the lull-chunker (channel + time).
  const msgs = await db<MsgRow[]>`
    SELECT m.id,
           m.channel_name           AS channel,
           m.author_name            AS author,
           m.content,
           m.created_at,
           m.referenced_message_id  AS ref_id,
           ml.session_id,
           ml.category
    FROM messages m
    JOIN message_labels ml ON ml.message_id = m.id
    WHERE m.channel_name IN ${db(chans)}
      AND m.created_at >= ${WINDOW_START} AND m.created_at < ${WINDOW_END}
      AND ml.category IN ('chat', 'link')
    ORDER BY m.channel_name, m.created_at
  `;

  // In-window sessions WITH content (session_search only indexes chat_count>0).
  // Single source for both arm-B units and the query-gen session sample.
  const sess = await db<SessRow[]>`
    SELECT session_id,
           channel_name        AS channel,
           started_at,
           chat_message_count  AS chat_count,
           content
    FROM session_search
    WHERE channel_name IN ${db(chans)}
      AND started_at >= ${WINDOW_START} AND started_at < ${WINDOW_END}
    ORDER BY channel_name, started_at
  `;

  const slice = new Database(SLICE_DB);
  slice.run(`DROP TABLE IF EXISTS msg`);
  slice.run(`DROP TABLE IF EXISTS sess_search`);
  slice.run(`CREATE TABLE msg (
    id TEXT, channel TEXT, author TEXT, content TEXT,
    created_at TEXT, ref_id TEXT, session_id INTEGER, category TEXT
  )`);
  slice.run(`CREATE TABLE sess_search (
    session_id INTEGER, channel TEXT, started_at TEXT, chat_count INTEGER, content TEXT
  )`);

  const iso = (x: string | Date) => new Date(x).toISOString();

  const insMsg = slice.prepare(
    `INSERT INTO msg VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  slice.transaction(() => {
    for (const m of msgs) {
      insMsg.run(
        m.id, m.channel, m.author, m.content,
        iso(m.created_at), m.ref_id, m.session_id == null ? null : Number(m.session_id), m.category,
      );
    }
  })();

  const insSess = slice.prepare(`INSERT INTO sess_search VALUES (?, ?, ?, ?, ?)`);
  slice.transaction(() => {
    for (const s of sess) {
      insSess.run(Number(s.session_id), s.channel, iso(s.started_at), s.chat_count, s.content);
    }
  })();

  // Per-channel report (the density-drill check).
  console.log('[01-build-slice] chat/link messages per channel (in-window):');
  for (const ch of chans) {
    const n = slice.query<{ n: number }, [string]>(`SELECT COUNT(*) AS n FROM msg WHERE channel=?`).get(ch)!.n;
    console.log(`  ${ch.padEnd(14)} ${String(n).padStart(6)}`);
  }
  console.log(`[01-build-slice] sessions (in-window, chat_count>0): ${sess.length}`);
  for (const ch of chans) {
    const n = slice.query<{ n: number }, [string]>(`SELECT COUNT(*) AS n FROM sess_search WHERE channel=?`).get(ch)!.n;
    console.log(`  ${ch.padEnd(14)} ${String(n).padStart(6)} sessions`);
  }
  console.log(`[01-build-slice] wrote ${SLICE_DB}`);
  slice.close();
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
