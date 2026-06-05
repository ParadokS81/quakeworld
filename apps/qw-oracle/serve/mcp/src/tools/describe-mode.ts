// apps/qw-oracle/serve/mcp/src/tools/describe-mode.ts
//
// Layer 1 composite verb for KTX game modes. One call assembles a mode's
// catalog row + applied settings (common baseline + mode overlays, ordered)
// + activation cvars + the linked Layer 3 concept note, so consumers don't
// carry the assembly knowledge themselves. Branches on "does the mode have
// its own mode_default overlays" (NOT mode_class): race/bloodfest are
// standalone but overlay-less, mutators are overlay-less. 'common' is the
// internal baseline, not a user-facing mode.

import { db } from '../db.ts';
import type { ToolResponse } from '../types.ts';
import { SERVER_VERSION } from '../version.ts';

export type DescribeModeArgs = {
  mode: string;
  gameplay_source?: string; // omit = resolve across all sources (modes are ktx-only today)
};

export interface AppliedSetting {
  cvar: string;
  value: string | number | null;
  scope: 'baseline' | 'mode';
  apply_order: number | null;
  comment: string | null;
  initstring_array: string | null;
}

export interface ModeRelatedEntity {
  name: string;
  type: string;
  description: string | null;
}

export interface ModeConceptNote {
  slug: string;
  summary: string;
  experience_group: string | null;
  deathmatch_flag: number | null;
  roster: string | null;
  loadout: string | null;
  objective: string | null;
  score_system: string | null;
  related_modes: unknown[];
}

export interface ModeDescription {
  name: string;
  user_facing_label: string | null;
  community_name: string | null;
  mode_class: string | null;
  init_mechanism: string | null;
  wiki_ref: string | null;
  source_refs: string[];
  activation: {
    mechanism: string | null;
    cvar: string | null;
    um_label: string | null;
    sub_flag_cvars: string[];
  };
  applied_settings: AppliedSetting[];
  related_entities: ModeRelatedEntity[];
  concept_note: ModeConceptNote | null;
}

export type DescribeModeResponse = ToolResponse<ModeDescription>;

interface CatalogRow {
  gameplay_source_id: string;
  name: string;
  value_text: string | null;
  props_json: Record<string, unknown>;
}
interface OverlayRow {
  name: string;
  value_numeric: number | null;
  value_text: string | null;
  ruleset_gate_json: Record<string, unknown>;
  props_json: Record<string, unknown>;
}

function str(v: unknown): string | null {
  return typeof v === 'string' ? v : v == null ? null : String(v);
}
function num(v: unknown): number | null {
  return v == null ? null : Number(v);
}

export async function describeMode(args: DescribeModeArgs): Promise<DescribeModeResponse> {
  const meta = {
    tool: 'describe_mode',
    server_version: SERVER_VERSION,
    queried_at: new Date().toISOString(),
  };

  // 'common' is the baseline applied across all modes, surfaced inside every
  // um-mode's applied_settings -- not a standalone mode.
  if (args.mode.toLowerCase() === 'common') {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `'common' is the baseline applied across all modes, not a standalone mode. Use search_mechanics with kind='mode_default' and mode='common' to see the baseline overlays.`,
      meta,
    };
  }

  // 1. Catalog row (kind='game_mode').
  const sourceClause = args.gameplay_source ? db`AND gameplay_source_id = ${args.gameplay_source}` : db``;
  const catalogRows = await db<CatalogRow[]>`
    SELECT gameplay_source_id, name, value_text, props_json
    FROM gameplay_mechanics
    WHERE kind = 'game_mode'
      AND name ILIKE ${args.mode}
      ${sourceClause}
    ORDER BY gameplay_source_id
    LIMIT 1
  `;
  const catalog = catalogRows[0];
  if (!catalog) {
    return {
      results: [],
      match_quality: 'none',
      suggested_fallback: `No game mode named '${args.mode}'. Use search_mechanics with kind='game_mode' to list modes.`,
      meta,
    };
  }
  const props = catalog.props_json ?? {};
  const source = catalog.gameplay_source_id;

  // 2. Overlays: fetch common baseline + this mode's overlays. If the mode has
  // NO mode-specific overlays (mutators, race, bloodfest), it does not use the
  // overlay system -- return empty (do NOT tack on the common baseline alone).
  const overlayRows = await db<OverlayRow[]>`
    SELECT name, value_numeric, value_text, ruleset_gate_json, props_json
    FROM gameplay_mechanics
    WHERE kind = 'mode_default'
      AND gameplay_source_id = ${source}
      AND ruleset_gate_json->>'mode' = ANY(${['common', catalog.name]})
    ORDER BY (props_json->>'apply_order')::int NULLS FIRST, name
  `;
  const hasModeSpecific = overlayRows.some((r) => r.ruleset_gate_json?.mode === catalog.name);
  const applied_settings: AppliedSetting[] = hasModeSpecific
    ? overlayRows.map((r) => ({
        cvar: r.name,
        value: r.value_text ?? r.value_numeric,
        scope: r.ruleset_gate_json?.mode === 'common' ? 'baseline' : 'mode',
        apply_order: num(r.props_json?.apply_order),
        comment: str(r.props_json?.comment),
        initstring_array: str(r.props_json?.initstring_array),
      }))
    : [];

  // 3. Activation block.
  const subFlags = Array.isArray(props.sub_flags_json) ? (props.sub_flags_json as string[]) : [];
  const activation = {
    mechanism: str(props.init_mechanism),
    cvar: str(props.activation_cvar),
    um_label: catalog.value_text ?? null,
    sub_flag_cvars: subFlags,
  };

  // 4. Concept note (L3) by slug. Graceful: null until the note is loaded.
  const noteRows = await db<{ slug: string; summary: string; frontmatter: Record<string, unknown> }[]>`
    SELECT slug, summary, frontmatter
    FROM concepts
    WHERE lower(slug) = lower(${catalog.name})
      AND frontmatter->>'topic' = 'game-mode-reference'
    LIMIT 1
  `;
  const note = noteRows[0];
  const fm = note?.frontmatter ?? {};
  const concept_note: ModeConceptNote | null = note
    ? {
        slug: note.slug,
        summary: note.summary,
        experience_group: str(fm.experience_group),
        deathmatch_flag: num(fm.deathmatch_flag),
        roster: str(fm.roster),
        loadout: str(fm.loadout),
        objective: str(fm.objective),
        score_system: str(fm.score_system),
        related_modes: Array.isArray(fm.related_modes) ? (fm.related_modes as unknown[]) : [],
      }
    : null;

  // 5. Related entities: prefer the note's curated canonical_ids; else the
  // mechanical activation cvar + sub-flags. Resolve to entities rows.
  const curatedIds = Array.isArray(fm.related_entities) ? (fm.related_entities as string[]) : [];
  let related_entities: ModeRelatedEntity[] = [];
  if (curatedIds.length > 0) {
    related_entities = await db<ModeRelatedEntity[]>`
      SELECT name, type, description FROM entities WHERE canonical_id = ANY(${curatedIds})
    `;
  } else {
    const fallbackNames = [activation.cvar, ...subFlags].filter((x): x is string => !!x);
    if (fallbackNames.length > 0) {
      related_entities = await db<ModeRelatedEntity[]>`
        SELECT name, type, description FROM entities
        WHERE project = ${source} AND name = ANY(${fallbackNames})
      `;
    }
  }

  const description: ModeDescription = {
    name: catalog.name,
    user_facing_label: str(props.user_facing_label),
    community_name: str(props.community_name),
    mode_class: str(props.mode_class),
    init_mechanism: str(props.init_mechanism),
    wiki_ref: str(props.wiki_ref),
    source_refs: Array.isArray(props.source_xrefs) ? (props.source_xrefs as string[]) : [],
    activation,
    applied_settings,
    related_entities,
    concept_note,
  };

  return { results: [description], match_quality: 'strong', suggested_fallback: null, meta };
}
