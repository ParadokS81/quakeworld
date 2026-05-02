// apps/qw-oracle/scripts/load-chat/build-sessions.ts
//
// Port of scripts/process-tier1.mjs with filter-then-segment hygiene change.
// Key behavioral difference from process-tier1.mjs:148-172:
//   Old: ANY non-system message advances prevTs and can bridge a gap.
//   New: ONLY chat/link messages drive gap detection and session creation.
//   Bot/reaction/system messages are still classified and written to
//   message_labels with session_id IS NULL.
//
// Consequence: empty sessions (sessions with zero chat/link messages) disappear
// by construction -- no explicit skip needed because they never form a session
// boundary. Expected session count drops from 88,214 to 84,369 (verified against
// qw.db 2026-05-02; see Task 5 probe SQL in phase-3-layer2-port.md).
//
// Usage:
//   bun scripts/load-chat/build-sessions.ts            # checks processing_log; aborts if version 'v1' already shipped
//   bun scripts/load-chat/build-sessions.ts --force    # truncate + rebuild regardless

import { db, closeDb } from '../../shared/db.ts';
import { classifyMessage, type Category } from './classify.ts';

const VERSION = 'v1';
const GAP_THRESHOLD_MINUTES = 15;

interface MessageRow {
  id: string;
  author_name: string;
  author_is_bot: boolean;
  content: string;
  message_type: string;
  attachment_count: number;
  created_at: string;
}

interface ChannelRow { channel_name: string; platform: 'discord'; cnt: number }

async function alreadyProcessed(): Promise<boolean> {
  const rows = await db<{ id: number }[]>`
    SELECT id FROM processing_log
    WHERE version = ${VERSION} AND finished_at IS NOT NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

async function listChannels(): Promise<ChannelRow[]> {
  const rows = await db<ChannelRow[]>`
    SELECT channel_name, platform, COUNT(*)::int AS cnt
    FROM messages
    GROUP BY channel_name, platform
    ORDER BY cnt DESC
  `;
  return rows;
}

async function truncateProcessing(): Promise<void> {
  // CASCADE removes message_labels via FK.
  await db`TRUNCATE sessions RESTART IDENTITY CASCADE`;
}

async function processChannel(
  channel: ChannelRow,
): Promise<{ sessions: number; labeled: number }> {
  const messages = await db<MessageRow[]>`
    SELECT id, author_name, author_is_bot, content, message_type,
           attachment_count, created_at
    FROM messages
    WHERE channel_name = ${channel.channel_name} AND platform = ${channel.platform}
    ORDER BY created_at
  `;
  if (messages.length === 0) return { sessions: 0, labeled: 0 };

  const gapMs = GAP_THRESHOLD_MINUTES * 60 * 1000;

  interface PendingLabel { messageId: string; category: Category }
  let sessionStart: string | null = null;
  let sessionEnd: string | null = null;
  let sessionMessages: MessageRow[] = [];
  let sessionParticipants = new Set<string>();
  let sessionChatCount = 0;
  let labelsBuffer: PendingLabel[] = [];
  let prevTs: number | null = null;
  let totalSessions = 0;

  await db.begin(async (tx) => {
    async function flushSession(): Promise<void> {
      // Under filter-then-segment, sessionStart is only set when a chat/link
      // message opened this session. If sessionChatCount is 0 we somehow
      // reached flushSession with no chat/link content -- skip (shouldn't
      // happen under the new algorithm, but guards the empty-session invariant).
      if (!sessionStart || sessionChatCount === 0) return;
      const inserted = await tx<{ id: number }[]>`
        INSERT INTO sessions (channel_name, platform, started_at, ended_at,
                              message_count, chat_message_count, participant_count,
                              participants_json, version)
        VALUES (${channel.channel_name}, ${channel.platform},
                ${sessionStart}::timestamptz, ${sessionEnd}::timestamptz,
                ${sessionMessages.length}, ${sessionChatCount},
                ${sessionParticipants.size},
                ${tx.json([...sessionParticipants] as never)}, ${VERSION})
        RETURNING id
      `;
      const sessionId = inserted[0]!.id;
      for (const lbl of labelsBuffer) {
        await tx`
          INSERT INTO message_labels (message_id, session_id, category, version)
          VALUES (${lbl.messageId}, ${sessionId}, ${lbl.category}, ${VERSION})
          ON CONFLICT (message_id) DO UPDATE
            SET session_id = EXCLUDED.session_id,
                category   = EXCLUDED.category,
                version    = EXCLUDED.version
        `;
      }
      totalSessions += 1;
      sessionMessages = [];
      sessionParticipants = new Set();
      sessionChatCount = 0;
      labelsBuffer = [];
      sessionStart = null;
      sessionEnd = null;
    }

    // orphanBuffer: bot/reaction/system messages get labeled with session_id
    // IS NULL after the channel pass completes. Preserves the "every imported
    // message has a label row" invariant.
    const orphanBuffer: PendingLabel[] = [];

    for (const msg of messages) {
      const ts = new Date(msg.created_at).getTime();
      const category = classifyMessage({
        message_type: msg.message_type,
        author_is_bot: msg.author_is_bot,
        content: msg.content,
        attachment_count: msg.attachment_count,
      });

      // Only chat/link messages drive gap detection and session creation.
      // Bot/reaction/system messages do NOT advance prevTs (changed from
      // process-tier1.mjs:148-172 which advanced prevTs for all non-system).
      if (category === 'chat' || category === 'link') {
        if (prevTs === null || ts - prevTs > gapMs) {
          await flushSession();
          sessionStart = msg.created_at;
        }
        sessionEnd = msg.created_at;
        prevTs = ts;
        sessionMessages.push(msg);
        sessionParticipants.add(msg.author_name);
        sessionChatCount += 1;
        labelsBuffer.push({ messageId: msg.id, category });
      } else {
        sessionMessages.push(msg);
        orphanBuffer.push({ messageId: msg.id, category });
      }
    }
    await flushSession();

    for (const lbl of orphanBuffer) {
      await tx`
        INSERT INTO message_labels (message_id, session_id, category, version)
        VALUES (${lbl.messageId}, NULL, ${lbl.category}, ${VERSION})
        ON CONFLICT (message_id) DO UPDATE
          SET session_id = NULL,
              category   = EXCLUDED.category,
              version    = EXCLUDED.version
      `;
    }
  });

  return { sessions: totalSessions, labeled: messages.length };
}

export async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!force && await alreadyProcessed()) {
    console.log(`[build-sessions] processing_log already has version='${VERSION}' finished; pass --force to override`);
    return;
  }

  console.log(`[build-sessions] version=${VERSION}, gap=${GAP_THRESHOLD_MINUTES}min`);
  await truncateProcessing();

  const startedAt = new Date().toISOString();
  const logRow = await db<{ id: number }[]>`
    INSERT INTO processing_log (version, channels_processed, sessions_created,
                                messages_labeled, gap_threshold_minutes, started_at)
    VALUES (${VERSION}, 0, 0, 0, ${GAP_THRESHOLD_MINUTES}, ${startedAt}::timestamptz)
    RETURNING id
  `;
  const logId = logRow[0]!.id;

  const channels = await listChannels();
  console.log(`[build-sessions] processing ${channels.length} channels`);
  let totalSessions = 0;
  let totalLabeled = 0;
  for (const ch of channels) {
    const t0 = Date.now();
    const r = await processChannel(ch);
    totalSessions += r.sessions;
    totalLabeled += r.labeled;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const pad = ch.channel_name.padEnd(22);
    const platPad = ch.platform.padEnd(8);
    console.log(`  ${pad} ${platPad} ${ch.cnt.toLocaleString().padStart(9)} msgs -> ${r.sessions.toLocaleString().padStart(6)} sessions (${elapsed}s)`);
  }

  await db`
    UPDATE processing_log
       SET channels_processed = ${channels.length},
           sessions_created   = ${totalSessions},
           messages_labeled   = ${totalLabeled},
           finished_at        = now()
     WHERE id = ${logId}
  `;
  console.log(`\n[build-sessions] done: ${totalSessions.toLocaleString()} sessions, ${totalLabeled.toLocaleString()} labeled`);
}

if (import.meta.main) {
  try { await main(); } finally { await closeDb(); }
}
