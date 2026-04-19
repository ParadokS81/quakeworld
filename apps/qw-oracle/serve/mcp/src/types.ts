// Shared MCP tool response shapes.
// The match_quality + suggested_fallback fields let consumer-side outlets
// implement their own fallback policy without the server knowing about it.

export type MatchQuality = 'strong' | 'weak' | 'none';

export interface ToolResponse<T = unknown> {
  results: T[];
  match_quality: MatchQuality;
  suggested_fallback: string | null;
  meta: {
    tool: string;
    server_version: string;
    queried_at: string;
  };
}

// Unified entity record: a cvar or a command. The `type` discriminator lets
// consumer LLMs render them differently (cvars have default values, commands
// don't). Same MCP tool returns both; the demo query often hits one of each.
//
// Note: there is no `linked_sessions` field. Cross-layer linking to Layer 2
// happens by calling `search_solved_issues` with the entity name afterwards,
// not by precomputed junction at build time.
export interface EntityRecord {
  id: string;
  type: 'cvar' | 'command';
  project: string;
  name: string;
  value_type: string | null;       // cvar only: 'float' | 'int' | 'string' | 'bool' | 'enum'
  default_value: string | null;    // cvar only
  description: string | null;
  group_name: string | null;
  major_group: string | null;      // cvar only (commands don't carry a major group)
  source_file: string | null;      // populated for FTE rows, null for ezquake/ktx scraped rows
  extraction_method: string;       // 'scraped-json' | 'ast-extractor' | 'hand-curated'
  linked_concepts: string[];       // reverse-indexed at startup from concept note frontmatter
}

// One message inside a session, in the shape the outlet LLM consumes.
export interface SessionMessage {
  author: string;
  at: string;   // ISO 8601 timestamp
  text: string;
  discord_url?: string;  // present for platform='discord' messages whose channel is in discord_channels
}

// A session hit from search_solved_issues. Mirrors the shape of
// formatSessionForMcp() in layers/claims/get-session-text.mjs but inlined here
// so the MCP server is self-contained.
export interface SessionHit {
  session_id: string;          // canonical: session:<platform>:<channel>:<started_at>
  numeric_id: number;          // raw row id in the `sessions` table (for joining)
  channel: string;
  platform: 'irc' | 'discord' | string;
  started_at: string;
  ended_at: string;
  chat_message_count: number;
  participants: string[];
  messages: SessionMessage[];
  rank: number;                // FTS5 bm25 relevance; lower is better
}

export interface ConceptNote {
  id: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  references: {
    cvars: string[];
    commands: string[];
    sessions: string[];
    concepts: string[];
  };
  authored_by: string;
  authored_at: string;
  confidence: string;
}
