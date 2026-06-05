// apps/qw-oracle/serve/mcp/src/orientation.ts
//
// Server-level orientation block. Returned to the consumer LLM at MCP
// initialize via the Server constructor's `instructions` field. Soft layer
// of the honest-failure stack; structural enforcement lives on each
// ToolResponse's match_quality field.

export const ORIENTATION_INSTRUCTIONS = `
QW Oracle is a knowledge service for QuakeWorld engine ports, game content, and community history.

Three layers:

- Layer 1 (engine + game-content facts): cvars, commands, macros, command-line params, rulesets, info_keys, log_templates, match_events, maps, gameplay mechanics, game modes. Use lookup_entity / search_entities (entity types: cvar, command, macro, cmdline_param, ruleset, match_event) / lookup_map / search_maps / lookup_mechanic / search_mechanics / lookup_gameplay_entity / search_gameplay_entities for definitive engine facts. For a whole KTX game mode assembled in one envelope (catalog + enforced settings + activation cvars + concept note), use describe_mode, e.g. describe_mode('ca'). Engine projects covered: ezquake, fte, mvdsv, qwcl, ktx. Gameplay rows carry a gameplay_source: omit it to search all sources (id1 base Quake + ktx), or pass 'ktx'/'id1' to scope. KTX gameplay content uses kind discriminators on search_mechanics: 'game_mode' (mode catalog: 1on1 / ca / wipeout / race / bloodfest / lgc / ...), 'mode_default' (per-cvar settings each mode applies -- filter to one mode with the mode parameter, e.g. mode='ca'), 'election_type', 'death_rule', 'score_system', 'drop_item', 'loc_macro', 'teamplay_message'; search_gameplay_entities admits 'monster' (bloodfest roster). KTX match-event types (death / damage / pick_mapitem / pick_backpack / drop_backpack / pick_powerup / drop_powerup) are entities.type='match_event', reachable via lookup_entity / search_entities with type='match_event'.
- Layer 2 (chat history): use search_solved_issues for "has this been debugged before" questions. Returns raw chat sessions for citation. Discord-only; pre-2016 IRC content is not in this corpus.
- Layer 3 (curated patterns and how-tos): use search_concepts for vague how-to questions. Concept notes synthesise Layer 1 facts into actionable guidance and reference related entities. The returned snippet + summary is the focused signal; call get_concept_note for the full body if the snippet alone is not enough.

Recommended iteration:
- Start with search_concepts for how-to / pattern questions ("how do I configure X").
- Start with search_entities for fact questions ("what does X do") or use lookup_entity if the canonical id is known.
- Use search_solved_issues for historical / community questions.

Honest failure: every search response includes match_quality (strong / weak / none).
- match_quality = 'none' or 'weak': do NOT synthesise an answer from training data. Either redirect (call redirect_to_human) or state that the corpus does not cover this.
- match_quality = 'strong': synthesise from the returned snippets and cite by entity canonical_id, concept slug, or session_id.

Citation discipline: every claim should trace back to a Layer 1 entity (cite canonical_id), a Layer 3 concept note (cite slug), or a Layer 2 chat session (cite session_id). "The AI says" is not a valid citation.
`.trim();
