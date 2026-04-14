// Layer 2 retrieval helper. Given a session_id from the existing `sessions`
// table, returns a structured representation: metadata + the ordered chat
// messages (filtered to category='chat' via message_labels).
//
// The MCP `search_solved_issues` tool calls formatSessionForMcp() after
// matching session_search via FTS5. The return shape is what the outlet
// LLM consumes to produce its final answer.
//
// No build-time LLM dependency. The raw transcripts go straight from SQLite
// to the query-time outlet LLM, which synthesises an answer per-query.

const CHAT_SELECT = `
  SELECT m.id, m.author_name, m.created_at, m.content
  FROM messages m
  JOIN message_labels l ON l.message_id = m.id
  WHERE l.session_id = @sessionId
    AND l.category = 'chat'
  ORDER BY m.created_at
`;

const META_SELECT = `
  SELECT id, channel_name, platform, started_at, ended_at,
         chat_message_count, participant_count, participants_json
  FROM sessions
  WHERE id = ?
`;

export function getSessionText(db, sessionId) {
  return db.prepare(CHAT_SELECT).all({ sessionId }).map((r) => ({
    author: r.author_name,
    at: r.created_at,
    text: r.content,
  }));
}

export function getSessionMeta(db, sessionId) {
  return db.prepare(META_SELECT).get(sessionId);
}

// Canonical Layer 2 id for cross-layer references (concept notes etc).
// Shape: session:<platform>:<channel>:<started_at>
export function canonicalSessionId(meta) {
  return `session:${meta.platform}:${meta.channel_name}:${meta.started_at}`;
}

export function formatSessionForMcp(db, sessionId) {
  const meta = getSessionMeta(db, sessionId);
  if (!meta) return null;
  const messages = getSessionText(db, sessionId);
  return {
    session_id: canonicalSessionId(meta),
    numeric_id: meta.id,
    channel: meta.channel_name,
    platform: meta.platform,
    started_at: meta.started_at,
    ended_at: meta.ended_at,
    chat_message_count: meta.chat_message_count,
    participants: JSON.parse(meta.participants_json || '[]'),
    messages,
  };
}
