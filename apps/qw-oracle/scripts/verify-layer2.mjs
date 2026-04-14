// Layer 2 audit. Read-only sanity check over the existing sessions,
// message_labels, and session_search tables. Prints:
//   - total session count
//   - message_labels category breakdown
//   - FTS5 hit counts per demo target
//   - the top non-trivial session per demo target, with a transcript preview
//
// Used once during POC execution (Task 4) to lock in which sessions appear
// in the demo. Safe to re-run.

import Database from 'better-sqlite3';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatSessionForMcp } from '../layers/claims/get-session-text.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, '..', 'data', 'qw.db');
const db = new Database(DB_PATH, { readonly: true });

console.log('=== sessions overview ===');
const total = db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get();
console.log(`  total sessions: ${total.n}`);

console.log('\n=== message_labels categories ===');
for (const row of db.prepare(`SELECT category, COUNT(*) AS n FROM message_labels GROUP BY category ORDER BY n DESC`).all()) {
  console.log(`  ${row.category.padEnd(10)} ${row.n}`);
}

const TARGETS = ['rpickup', 'break', 'next_map', 'ready', 'scores', 'mapcycle', 'shownick'];

console.log('\n=== FTS5 hit counts per demo target ===');
for (const target of TARGETS) {
  const hits = db.prepare(`SELECT COUNT(*) AS n FROM session_search WHERE session_search MATCH ?`).get(target);
  console.log(`  ${target.padEnd(10)} ${hits.n} sessions`);
}

console.log('\n=== top non-trivial session per target (chat_message_count desc) ===');
for (const target of TARGETS) {
  const row = db.prepare(`
    SELECT ss.session_id
    FROM session_search ss
    JOIN sessions s ON s.id = ss.session_id
    WHERE session_search MATCH ?
      AND s.chat_message_count >= 5
    ORDER BY s.chat_message_count DESC
    LIMIT 1
  `).get(target);
  if (!row) {
    console.log(`\n  --- ${target}: no session with >= 5 chat messages ---`);
    continue;
  }
  const session = formatSessionForMcp(db, row.session_id);
  console.log(`\n  --- ${target} -> session ${session.numeric_id} (${session.platform} ${session.channel} ${session.started_at}) ---`);
  console.log(`      participants: ${session.participants.join(', ')}`);
  console.log(`      chat messages: ${session.chat_message_count}`);
  for (const msg of session.messages.slice(0, 8)) {
    const line = (msg.text || '').replace(/\s+/g, ' ').substring(0, 100);
    console.log(`      ${msg.author}: ${line}`);
  }
  if (session.messages.length > 8) console.log(`      ... ${session.messages.length - 8} more`);
}

db.close();
