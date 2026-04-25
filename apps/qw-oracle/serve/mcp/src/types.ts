// Shared MCP tool response shapes.
// match_quality + suggested_fallback let consumer-side outlets implement
// their own fallback policy without the server knowing about it.

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

// User-facing entity types. Layer 1 also stores keyname/hud_element/
// token_primitive/flag_bit/asset_category for internal classifier use, but
// those are not directly looked up by humans and stay out of the MCP surface.
export type EntityType = 'cvar' | 'command' | 'macro' | 'cmdline_param' | 'ruleset';

export type SourceState =
  | 'source_backed'
  | 'source_retired'
  | 'doc_only'
  | 'dynamically_registered';

// Per-type version-table fields. Each entity type has a different shape; we
// expose a small common set plus an optional type_specific blob with the
// remaining columns so the asking LLM can read everything without a second
// tool call.
export interface EntityVersionData {
  version: string;
  help_desc: string | null;
  help_remarks: string | null;
  help_type: string | null;
  default_value: string | null;
  flag_names: string | null;
  source_file: string | null;
  source_line: number | null;
  type_specific: Record<string, unknown>;
}

export interface AssetRelation {
  category: string;
  extension: string | null;
  loader_site: string | null;
  source_file: string | null;
  source_line: number | null;
}

// What lookup_entity / search_entities returns. The librarian's catalog
// card: identity + state + version arc + cross-references, all in one shot.
export interface EntityRecord {
  id: string;
  type: EntityType;
  project: string;
  name: string;
  source_state: SourceState;
  first_seen_version: string;
  last_seen_version: string;
  current: EntityVersionData;
  asset_relations: AssetRelation[];
  linked_concepts: string[];
}

// One message inside a session, in the shape the outlet LLM consumes.
export interface SessionMessage {
  author: string;
  at: string;
  text: string;
  discord_url?: string;
}

export interface SessionHit {
  session_id: string;
  numeric_id: number;
  channel: string;
  platform: 'irc' | 'discord' | string;
  started_at: string;
  ended_at: string;
  chat_message_count: number;
  participants: string[];
  messages: SessionMessage[];
  rank: number;
}

// Concept note with full frontmatter passthrough. The librarian shows the
// catalog card: contributors, source URL, scope, engines covered, and
// anything else the note's frontmatter declares.
export interface ConceptNote {
  id: string;
  title: string;
  body: string;
  related_entities: string[];
  external_refs: string[];
  frontmatter: Record<string, unknown>;
}
