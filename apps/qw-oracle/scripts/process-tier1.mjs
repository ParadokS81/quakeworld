/**
 * Tier 1 Processing: Classification + Session Grouping
 *
 * What it does:
 *   1. Classifies every message: chat, reaction, bot, link, system
 *   2. Groups chat messages into conversation sessions based on time gaps
 *   3. Stores results in sessions + message_labels tables
 *
 * Principles:
 *   - Raw data is NEVER modified
 *   - Processing is fully regenerable (drop tables, re-run)
 *   - All rules are deterministic (no LLM needed)
 *   - Version-tagged so we can iterate on rules
 */

import { getDb, initProcessingSchema, resetProcessing } from './db.mjs';

// ── Configuration ──────────────────────────────────────────────────────

const VERSION = 'v1';
const GAP_THRESHOLD_MINUTES = 15;  // silence longer than this = new session

// ── Classification Rules ───────────────────────────────────────────────

// Known bot trigger patterns (from data analysis)
const BOT_COMMAND_PATTERNS = [
  /^[!.]\w/,                         // !command or .command
  /^(my luck|fishbot |learn |forget |suka|logan)/i,
  /^(ttop10|!ttop10|!top10)/i,
];

// Short reactions — common emoticons, single-word responses, gaming shorthand
const REACTION_WORDS = new Set([
  // Emoticons (text)
  ':)', ':(', ':D', ':P', ':p', ':/', ':\\', ':>', ':<', ';)', ';(',
  ':-)', ':-(', ':-D', ':-P', ':-/', ':-\\', ':o', ':O', ':x', ':X',
  'xD', 'XD', 'xd', ':3', '<3', '>:(',
  // Reactions
  'lol', 'heh', 'hehe', 'rofl', 'lmao', 'xd',
  'ah', 'oh', 'ha', 'haha', 'k', 'ok',
  'ya', 'ye', 'jo', 'yep', 'yea', 'nah', 'mhm', 'hmm',
  // Gaming shorthand
  '+1', 'gg', 'gl', 'hf', 'ns', 'nt', 'wp', 'gj', 'thx', 'ty', 'np',
]);

function isReaction(content) {
  if (REACTION_WORDS.has(content)) return true;
  // Single emoji (Unicode)
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]{1,3}$/u.test(content)) return true;
  return false;
}

// URL-only messages
const LINK_PATTERN = /^https?:\/\/\S+$/;

function classifyMessage(msg) {
  // Non-chat message types are system noise
  if (msg.message_type !== 'message' && msg.message_type !== 'action') {
    return 'system';
  }

  // Bot authors
  if (msg.author_is_bot) {
    return 'bot';
  }

  const content = (msg.content || '').trim();

  // Empty messages (attachment-only on Discord)
  if (content.length === 0) {
    return msg.attachment_count > 0 ? 'link' : 'reaction';
  }

  // Bot commands from humans
  for (const pattern of BOT_COMMAND_PATTERNS) {
    if (pattern.test(content)) {
      return 'bot';
    }
  }

  // Short reactions/emoticons (≤5 chars)
  if (content.length <= 5 && isReaction(content)) {
    return 'reaction';
  }

  // Link-only messages (no commentary)
  if (LINK_PATTERN.test(content)) {
    return 'link';
  }

  // Everything else is chat
  return 'chat';
}

// ── Session Grouping ───────────────────────────────────────────────────

function processChannel(db, channelName, platform, stmts) {
  // Fetch all messages for this channel, chronologically
  const messages = db.prepare(`
    SELECT id, author_name, author_is_bot, content, message_type,
           attachment_count, created_at
    FROM messages
    WHERE channel_name = ? AND platform = ?
    ORDER BY created_at
  `).all(channelName, platform);

  if (messages.length === 0) return { sessions: 0, labeled: 0 };

  const gapMs = GAP_THRESHOLD_MINUTES * 60 * 1000;
  let currentSession = null;
  let sessionMessages = [];
  let sessionParticipants = new Set();
  let sessionChatCount = 0;
  let sessionsCreated = 0;
  let labelsBuffer = [];

  function flushSession() {
    if (!currentSession || sessionMessages.length === 0) return;

    // Write session
    const result = stmts.insertSession.run(
      channelName,
      platform,
      currentSession.startedAt,
      currentSession.endedAt,
      sessionMessages.length,
      sessionChatCount,
      sessionParticipants.size,
      JSON.stringify([...sessionParticipants]),
      VERSION
    );
    const sessionId = result.lastInsertRowid;

    // Update labels with session ID
    for (const label of labelsBuffer) {
      stmts.insertLabel.run(label.messageId, sessionId, label.category, VERSION);
    }

    sessionsCreated++;
    sessionMessages = [];
    sessionParticipants = new Set();
    sessionChatCount = 0;
    labelsBuffer = [];
  }

  let prevTs = null;

  for (const msg of messages) {
    const ts = new Date(msg.created_at).getTime();
    const category = classifyMessage(msg);

    // Check for session boundary (only on non-system messages)
    if (category !== 'system') {
      if (prevTs === null || (ts - prevTs) > gapMs) {
        // Flush previous session
        flushSession();
        // Start new session
        currentSession = { startedAt: msg.created_at, endedAt: msg.created_at };
      }
      currentSession.endedAt = msg.created_at;
      prevTs = ts;
    }

    // Track message
    sessionMessages.push(msg);
    if (category === 'chat' || category === 'link') {
      sessionParticipants.add(msg.author_name);
      sessionChatCount++;
    }

    labelsBuffer.push({ messageId: msg.id, category });
  }

  // Flush last session
  flushSession();

  return { sessions: sessionsCreated, labeled: messages.length };
}

// ── Main ───────────────────────────────────────────────────────────────

function main() {
  const db = getDb();
  initProcessingSchema(db);

  console.log('Tier 1 Processing');
  console.log(`  Version: ${VERSION}`);
  console.log(`  Gap threshold: ${GAP_THRESHOLD_MINUTES} minutes`);
  console.log('');

  // Check if already processed with this version
  const existing = db.prepare(
    'SELECT * FROM processing_log WHERE version = ? AND finished_at IS NOT NULL'
  ).get(VERSION);

  if (existing) {
    console.log(`Already processed with ${VERSION} on ${existing.finished_at}`);
    console.log(`  Sessions: ${existing.sessions_created}, Messages: ${existing.messages_labeled}`);
    console.log('');
    console.log('To re-run, either bump VERSION in the script or delete from processing_log.');
    process.exit(0);
  }

  // Reset any partial runs
  resetProcessing(db);

  // Log the run
  const startTime = new Date().toISOString();
  const logResult = db.prepare(
    'INSERT INTO processing_log (version, channels_processed, sessions_created, messages_labeled, gap_threshold_minutes, started_at) VALUES (?, 0, 0, 0, ?, ?)'
  ).run(VERSION, GAP_THRESHOLD_MINUTES, startTime);
  const logId = logResult.lastInsertRowid;

  // Get all channel/platform combos
  const channels = db.prepare(`
    SELECT channel_name, platform, COUNT(*) as cnt
    FROM messages
    GROUP BY channel_name, platform
    ORDER BY cnt DESC
  `).all();

  console.log(`Processing ${channels.length} channels...`);
  console.log('');

  // Prepare statements
  const stmts = {
    insertSession: db.prepare(`
      INSERT INTO sessions (channel_name, platform, started_at, ended_at,
        message_count, chat_message_count, participant_count, participants_json, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    insertLabel: db.prepare(`
      INSERT INTO message_labels (message_id, session_id, category, version)
      VALUES (?, ?, ?, ?)
    `),
  };

  let totalSessions = 0;
  let totalLabeled = 0;

  for (const ch of channels) {
    const t0 = Date.now();

    // Wrap each channel in a transaction for speed
    const result = db.transaction(() => {
      return processChannel(db, ch.channel_name, ch.platform, stmts);
    })();

    totalSessions += result.sessions;
    totalLabeled += result.labeled;

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const pad = ch.channel_name.padEnd(22);
    const plat = ch.platform.padEnd(8);
    console.log(`  ${pad} ${plat} ${ch.cnt.toLocaleString().padStart(9)} msgs → ${result.sessions.toLocaleString().padStart(6)} sessions  (${elapsed}s)`);
  }

  // Update processing log
  db.prepare(`
    UPDATE processing_log
    SET channels_processed = ?, sessions_created = ?, messages_labeled = ?, finished_at = ?
    WHERE id = ?
  `).run(channels.length, totalSessions, totalLabeled, new Date().toISOString(), logId);

  console.log('');
  console.log(`Done!`);
  console.log(`  Channels: ${channels.length}`);
  console.log(`  Sessions: ${totalSessions.toLocaleString()}`);
  console.log(`  Messages labeled: ${totalLabeled.toLocaleString()}`);
  console.log(`  Time: ${((Date.now() - new Date(startTime).getTime()) / 1000).toFixed(1)}s`);
}

main();
