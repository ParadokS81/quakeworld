// Shared MCP tool response shapes.
// match_quality + suggested_fallback let consumer-side outlets implement
// their own fallback policy without the server knowing about it.

export type MatchQuality = 'strong' | 'weak' | 'none';

export interface ToolResponse<T = unknown> {
  results: T[];
  match_quality: MatchQuality;
  suggested_fallback: string | null;
  // Optional metadata for filter-style tools. Set when meaningful, omit otherwise.
  count?: number;       // total matches available (may exceed results.length when truncated by limit)
  truncated?: boolean;  // true when results were clipped by the requested limit
  meta: {
    tool: string;
    server_version: string;
    queried_at: string;
  };
}

// User-facing entity types: everything reachable via the MCP `type`
// parameter (as opposed to the five internal-classifier types excluded
// below). cvar/command/macro/cmdline_param/ruleset are the DEFAULT set
// searched when `type` is omitted (USER_FACING_TYPES in lookup-entity.ts /
// search-entities.ts); the other six are explicit-only -- callers must pass
// `type` to reach match_event, info_key, log_template, protocol_message,
// qc_builtin, or cvar_alias. Layer 1 also stores keyname/hud_element/
// token_primitive/flag_bit/asset_category for internal classifier use; those
// are NOT directly looked up by humans and stay out of the MCP surface
// entirely (Amendment A2, 2026-08-04 -- schema-admits-what-the-DB-serves,
// no new tools, no SQL change).
export type EntityType =
  | 'cvar' | 'command' | 'macro' | 'cmdline_param' | 'ruleset'
  | 'match_event' | 'info_key' | 'log_template' | 'protocol_message'
  | 'qc_builtin' | 'cvar_alias';

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
  description: string | null; // entities.description (migration 012) -- the owned L1 prose, distinct from per-version help_desc (raw CD_ string / source comment).
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

// Layer 2 thread hit: one reconstructed topic-coherent thread from the Discord
// corpus. Returned by search_solved_issues (hybrid retrieval over chat_threads).
// score is the fused RRF score from the lexical + semantic retrieval pass.
export interface ThreadHit {
  thread_id: string;         // chat_threads.id as string (postgres-js BIGINT -> string)
  topic_label: string;
  channel: string;
  platform: 'discord';
  date_range_start: string;
  date_range_end: string;
  participant_count: number;
  participants: string[];
  message_count: number;
  resolution_status: 'solved' | 'unresolved' | 'informational' | null;
  messages: SessionMessage[]; // reuses SessionMessage (author/at/text/discord_url)
  score: number;              // fused RRF score
}

// D9-revised: Layer 2 corpus is Discord-only in Arc 1; the prior 'irc' option
// and the | string SQLite-era hedge are gone.
// SessionHit is retained for adjacent context (loader / session tables); it is
// no longer the return shape of search_solved_issues (which returns ThreadHit).
export interface SessionHit {
  session_id: string;
  numeric_id: number;
  channel: string;
  platform: 'discord';
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
  related_concepts: string[];
  external_refs: string[];
  frontmatter: Record<string, unknown>;
}

// Layer 3 search hit: per-chunk match with parent concept context.
export interface SearchConceptResult {
  id: string;                 // concept:<slug>
  slug: string;
  title: string;
  summary: string;
  match_score: number;        // fused RRF score
  match_quality: 'strong' | 'weak' | 'none';
  snippet: string;            // ~600 chars, centred on the matched span
  related_entities: string[];
  related_concepts: string[];
}

// One row of redirect_targets surfaced by the redirect_to_human tool.
export interface RedirectTarget {
  topic: string;
  display_name: string;
  url: string;
  description: string | null;
}
