// Shared database setup and schema
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'data', 'qw.db');

export function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,                -- Discord snowflake OR generated ID for IRC
      platform TEXT NOT NULL,             -- 'discord' or 'irc'
      network TEXT,                       -- 'quakenet' for IRC, NULL for Discord
      guild_id TEXT,                      -- Discord guild ID, NULL for IRC
      channel_name TEXT NOT NULL,         -- '#quakeworld', '#slackers', etc.
      author_id TEXT,                     -- Discord user ID, NULL for IRC
      author_name TEXT NOT NULL,          -- Username/nickname
      author_display_name TEXT,           -- Display name if available
      author_is_bot INTEGER DEFAULT 0,
      content TEXT NOT NULL DEFAULT '',
      message_type TEXT NOT NULL DEFAULT 'message',  -- 'message', 'action', 'join', 'part', 'quit', 'nick', 'topic', 'system'
      referenced_message_id TEXT,         -- Reply-to (Discord only)
      attachment_count INTEGER DEFAULT 0,
      attachments_json TEXT,
      embed_count INTEGER DEFAULT 0,
      embeds_json TEXT,
      reaction_count INTEGER DEFAULT 0,
      reactions_json TEXT,
      created_at TEXT NOT NULL,           -- ISO 8601 UTC
      edited_at TEXT,
      source TEXT NOT NULL,               -- 'discord-export', 'mirc-log', 'bot-live'
      source_file TEXT,                   -- Original filename
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_msg_platform_date ON messages(platform, created_at);
    CREATE INDEX IF NOT EXISTS idx_msg_channel_date ON messages(channel_name, created_at);
    CREATE INDEX IF NOT EXISTS idx_msg_author ON messages(author_name, created_at);
    CREATE INDEX IF NOT EXISTS idx_msg_type ON messages(message_type);
    CREATE INDEX IF NOT EXISTS idx_msg_created ON messages(created_at);

    -- Track import progress
    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT NOT NULL UNIQUE,
      platform TEXT NOT NULL,
      channel_name TEXT,
      message_count INTEGER DEFAULT 0,
      date_range_start TEXT,
      date_range_end TEXT,
      imported_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Tier 1 processing tables — regenerable from raw data
export function initProcessingSchema(db) {
  db.exec(`
    -- Conversation sessions: groups of messages forming a discussion
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT NOT NULL,
      message_count INTEGER NOT NULL,       -- all messages in this time window
      chat_message_count INTEGER NOT NULL,  -- excluding system/bot noise
      participant_count INTEGER NOT NULL,
      participants_json TEXT,               -- JSON array of unique author names
      version TEXT NOT NULL                 -- classifier version for regeneration
    );

    CREATE INDEX IF NOT EXISTS idx_sess_channel ON sessions(channel_name, started_at);
    CREATE INDEX IF NOT EXISTS idx_sess_date ON sessions(started_at);

    -- Per-message classification and session assignment
    CREATE TABLE IF NOT EXISTS message_labels (
      message_id TEXT PRIMARY KEY,
      session_id INTEGER,
      category TEXT NOT NULL,               -- 'chat', 'bot', 'reaction', 'link', 'system'
      version TEXT NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_labels_session ON message_labels(session_id);
    CREATE INDEX IF NOT EXISTS idx_labels_category ON message_labels(category);

    -- Track processing runs
    CREATE TABLE IF NOT EXISTS processing_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL,
      channels_processed INTEGER,
      sessions_created INTEGER,
      messages_labeled INTEGER,
      gap_threshold_minutes INTEGER,
      started_at TEXT NOT NULL,
      finished_at TEXT
    );
  `);
}

// Wipe processing tables for a fresh run
export function resetProcessing(db) {
  db.exec(`
    DELETE FROM message_labels;
    DELETE FROM sessions;
  `);
}

// FTS5 full-text search index over session content
export function initSearchSchema(db) {
  db.exec(`
    -- Concatenated chat content per session, searchable via FTS5
    CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5(
      session_id UNINDEXED,
      channel_name UNINDEXED,
      platform UNINDEXED,
      started_at UNINDEXED,
      participants UNINDEXED,
      chat_message_count UNINDEXED,
      content,                              -- the searchable text
      tokenize='porter unicode61'           -- stemming + unicode support
    );
  `);
}

export function resetSearch(db) {
  db.exec(`DELETE FROM session_search`);
}
