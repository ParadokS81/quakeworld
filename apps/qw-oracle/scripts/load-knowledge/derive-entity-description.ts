// apps/qw-oracle/scripts/load-knowledge/derive-entity-description.ts
//
// D6 / F7 implementation: populate entities.description for the version we
// just loaded, so Phase 6 hybrid retrieval has lexical and vector content
// to index. Called as a tail step inside load-version.ts's transaction;
// every entity whose last_seen_version equals this load's version gets its
// description recomputed from the per-version row.
//
// Per-type sources (verified against db/migrations/002_layer1_schema.sql at
// authoring time):
//   cvar           -> help_desc + help_remarks + help_values[].description,
//                     with trailing_comment as a fallback when the three
//                     JSON-derived sources are all empty (boolean value-names
//                     like true/false stripped, numeric and enum names kept
//                     as `<name>: <description>` to preserve mode-targeted
//                     query signal). The trailing_comment fallback unlocks
//                     code-only engines (KTX / MVDSV) and code-only ezquake
//                     cvars whose registration is documented inline rather
//                     than in help_*.json.
//   command        -> help_desc + help_remarks
//   cmdline_param  -> help_desc + help_remarks
//   macro / hud_element                                   -> help_desc
//   asset_category                                        -> description col
//   ruleset / keyname                                     -> NULL (no help text)
//   token_primitive / flag_bit / cvar_alias /
//     protocol_message / info_key / log_template /
//     qc_builtin                                          -> synthesised
//   match_event                                           -> templated
//                     narrative + attribute list. Hardcoded 7-entry mapping
//                     of event_name -> narrative intro; description_origin
//                     stamped 'synthesized' (audit signal -- KTX has no
//                     prose convention for log-output formats).
//
// Whenever description is recomputed, description_embedding_stale flips to
// TRUE so Phase 5's embedder knows to re-embed. Phase 5 hash-skips no-op
// recomputes via description_embedding_sha256, so the simple "always set
// stale on derive" pattern is safe.
//
// description_origin (column added migration 012) tracks provenance:
//   'help_json'    -- from external dev-curated metadata (help_*.json,
//                     asset YAML bundle).
//   'source_inline'-- from source code (trailing comments, struct fields,
//                     templated synthesis from extracted source data).
//   'inherited'    -- borrowed pointer (reserved for cross-engine borrow
//                     arc; not yet emitted by any deriver).
//   'synthesized'  -- AI/operator-authored narrative not present in source
//                     or external curation. Audit signal.
// All 13 derivers write description_origin every time they UPDATE; the
// label tracks the source columns the description came from on each
// re-derive, so adding a fallback branch (the way deriveCvar gained
// trailing_comment) automatically updates the label without a separate
// migration. Project-aware derivers (cvar/command/cmdline_param/macro/
// hud_element) emit 'help_json' for ezquake/FTE source-of-help-JSON paths
// and 'source_inline' otherwise; pure-template derivers (token_primitive/
// flag_bit/cvar_alias/protocol_message/info_key/log_template/qc_builtin)
// always emit 'source_inline'; deriveAssetCategory always emits 'help_json'
// (curated YAML); deriveMatchEvent always emits 'synthesized'.

import type postgres from 'postgres';
import type { EntityType, Project } from './types.js';

type DeriveFn = (tx: postgres.TransactionSql<{}>, project: Project, version: string) => Promise<void>;

// Each helper updates entities.description for the (project, type, version)
// triple via a single UPDATE statement. The WHERE filter keys on
// last_seen_version so we only touch entities whose freshest known shape is
// at the version we just ingested -- older rows whose last_seen_version is
// elsewhere are not disturbed.

async function deriveCvar(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // help_values is TEXT-typed (legacy SQLite carryover) carrying well-formed
  // JSON; cast to jsonb to drive jsonb_array_elements. Boolean value-names
  // are dropped as noise; numeric and enum names are kept as
  // `<name>: <description>` so queries like "noskins 2" still target the
  // right per-mode prose. NULLIF + CONCAT_WS handle the cases where any
  // of the three sources is absent without producing empty separators.
  //
  // Fallback: when all three JSON-derived sources are empty (NULLIF returns
  // NULL), drop down to vt.trailing_comment (`// ...` harvested at extract
  // time). This unlocks KTX (no help_*.json by design) and MVDSV (same)
  // plus the ~28 ezquake CODE_ONLY cvars whose registration carries an
  // inline `//` doc-string but no help_*.json entry. ezquake cvars with
  // BOTH a JSON description and a trailing comment keep the JSON
  // description: the operator preferred not to bolt code-comment text
  // onto cvars that already have curated prose.
  await tx`
    UPDATE entities SET
      description = COALESCE(
        NULLIF(CONCAT_WS('. ',
          NULLIF(TRIM(vt.help_desc), ''),
          NULLIF(TRIM(vt.help_remarks), ''),
          (SELECT STRING_AGG(
             CASE
               WHEN lower(v->>'name') IN ('true','false','yes','no','on','off','*','') THEN v->>'description'
               ELSE CONCAT(v->>'name', ': ', v->>'description')
             END,
             '. ' ORDER BY ordinality
           )
           FROM jsonb_array_elements(vt.help_values::jsonb) WITH ORDINALITY AS x(v, ordinality)
           WHERE v->>'description' IS NOT NULL AND length(trim(v->>'description')) > 0)
        ), ''),
        NULLIF(TRIM(vt.trailing_comment), '')
      ),
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.help_desc), '') IS NOT NULL
          OR NULLIF(TRIM(vt.help_remarks), '') IS NOT NULL
          OR (vt.help_values IS NOT NULL AND vt.help_values::text NOT IN ('[]', 'null'))
          THEN CASE WHEN entities.project IN ('ezquake', 'fte') THEN 'help_json' ELSE 'source_inline' END
        WHEN NULLIF(TRIM(vt.trailing_comment), '') IS NOT NULL THEN 'source_inline'
        ELSE NULL
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM cvar_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'cvar'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveCommand(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  await tx`
    UPDATE entities SET
      description = NULLIF(CONCAT_WS('. ',
        NULLIF(TRIM(vt.help_desc), ''),
        NULLIF(TRIM(vt.help_remarks), '')
      ), ''),
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.help_desc), '') IS NULL AND NULLIF(TRIM(vt.help_remarks), '') IS NULL THEN NULL
        WHEN entities.project IN ('ezquake', 'fte') THEN 'help_json'
        ELSE 'source_inline'
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM command_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'command'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveMacro(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  await tx`
    UPDATE entities SET
      description = vt.help_desc,
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.help_desc), '') IS NULL THEN NULL
        WHEN entities.project IN ('ezquake', 'fte') THEN 'help_json'
        ELSE 'source_inline'
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM macro_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'macro'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveCmdlineParam(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  await tx`
    UPDATE entities SET
      description = NULLIF(CONCAT_WS('. ',
        NULLIF(TRIM(vt.help_desc), ''),
        NULLIF(TRIM(vt.help_remarks), '')
      ), ''),
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.help_desc), '') IS NULL AND NULLIF(TRIM(vt.help_remarks), '') IS NULL THEN NULL
        WHEN entities.project IN ('ezquake', 'fte') THEN 'help_json'
        ELSE 'source_inline'
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM cmdline_param_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'cmdline_param'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveHudElement(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  await tx`
    UPDATE entities SET
      description = vt.help_desc,
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.help_desc), '') IS NULL THEN NULL
        WHEN entities.project IN ('ezquake', 'fte') THEN 'help_json'
        ELSE 'source_inline'
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM hud_element_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'hud_element'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveAssetCategory(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Source is the curated YAML bundle (slipgate-side asset metadata) regardless
  // of project; no source_inline branch needed today.
  await tx`
    UPDATE entities SET
      description = vt.description,
      description_origin = CASE
        WHEN NULLIF(TRIM(vt.description), '') IS NULL THEN NULL
        ELSE 'help_json'
      END,
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM asset_category_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'asset_category'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveTokenPrimitive(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "<category> token <form>" e.g. "led token $B".
  await tx`
    UPDATE entities SET
      description = vt.category || ' token ' || coalesce(vt.form, ''),
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM token_primitive_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'token_primitive'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveFlagBit(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "<bitmask_family> <entity name>" e.g. "cvar_flag CVAR_USERINFO".
  await tx`
    UPDATE entities SET
      description = vt.bitmask_family || ' ' || entities.name,
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM flag_bit_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'flag_bit'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveCvarAlias(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "alias of <target_canonical_id>; drift status: <default_drift_status>; freshness: <freshness_state>"
  // target_canonical_id may be NULL (resolution-deferred); fall back to target_name.
  await tx`
    UPDATE entities SET
      description =
        'alias of ' || coalesce(vt.target_canonical_id, vt.target_project || ':' || vt.target_kind || ':' || vt.target_name)
        || '; drift status: ' || vt.default_drift_status
        || '; freshness: ' || vt.freshness_state,
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM cvar_alias_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'cvar_alias'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveProtocolMessage(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "<kind> protocol message: <name>; value <value>; <trailing_comment>"
  await tx`
    UPDATE entities SET
      description =
        vt.kind || ' protocol message: ' || entities.name
        || coalesce('; value ' || vt.value, '')
        || coalesce('; ' || vt.trailing_comment, ''),
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM protocol_message_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'protocol_message'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveInfoKey(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "<scope> info key: <bare_name>; ops <operations>"
  // bare_name = entity name with the trailing :<scope> suffix stripped.
  await tx`
    UPDATE entities SET
      description =
        vt.scope || ' info key: ' || regexp_replace(entities.name, ':[a-z]+$', '')
        || coalesce('; ops ' || vt.operations, ''),
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM info_key_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'info_key'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveLogTemplate(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "<channel> log template: <format_string_normalized>"
  await tx`
    UPDATE entities SET
      description = vt.channel || ' log template: ' || vt.format_string_normalized,
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM log_template_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'log_template'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveMatchEvent(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // KTX's match_events are XSD-defined log-output formats. Source carries
  // no prose -- the C emitters write XML element tags + attribute values to
  // a log file consumed by downstream parsers, with no developer-authored
  // doc comment on the registration site. To give Phase 6 retrieval real
  // signal beyond the bare event name, synthesize a narrative description
  // from a hardcoded 7-entry mapping (verified against the C emit sites in
  // combat.c / client.c / items.c at the time of authoring).
  //
  // Per-event narratives are intentionally specific (mention the C-side
  // semantics like "fires twice per hit when armor absorbs", "z-height
  // where the kill happened") -- if KTX's log format evolves and adds new
  // attributes, the narratives need a re-pass alongside an XSD diff. The
  // ELSE branch is a safe fallback for any future event name not covered
  // here; landing without a narrative is preferable to crashing the load.
  //
  // description_origin = 'synthesized' so an audit query (e.g., 'show me
  // all AI-authored descriptions') can isolate these rows.
  await tx`
    UPDATE entities SET
      description = (
        CASE entities.name
          WHEN 'damage' THEN 'Damage event: emitted when a player takes damage. Fires twice per hit when armor absorbs some -- once for the armor-absorbed portion, once for the HP-taken portion. Attributes: time, attacker, target, type (weapon/cause: axe/sg/rl/lg_beam/lava/fall/...), quad, splash, value (damage amount), armor (1 = armor-absorbed emit, 0 = HP-taken emit).'
          WHEN 'death' THEN 'Death event: emitted when a player dies. Attributes: time, attacker, target, type (weapon/cause from the same axe/sg/rl/.../fall/suicide enum), quad, armorleft (armor remaining at death), killheight (z-height where the kill happened), lifetime (seconds the dead player had been alive that life).'
          WHEN 'pick_mapitem' THEN 'Pick-mapitem event: emitted when a player picks up a map-spawn item. Attributes: time, item (e.g. health_25, armor1, rl, rockets), player, value (amount: HP gained, armor strength, ammo count).'
          WHEN 'pick_powerup' THEN 'Pick-powerup event: emitted when a player picks up a powerup (quad/pent/ring/suit). Attributes: time, item (powerup name), player, timeleft (remaining duration on the powerup).'
          WHEN 'drop_powerup' THEN 'Drop-powerup event: emitted when a player drops an active powerup on death (still time remaining). Attributes: time, item (powerup name), player, timeleft (remaining duration).'
          WHEN 'pick_backpack' THEN 'Pick-backpack event: emitted when a player picks up a dropped backpack, gaining its weapon and ammo. Attributes: time, weapon (weapon in the pack, if any), shells, nails, rockets, cells, player.'
          WHEN 'drop_backpack' THEN 'Drop-backpack event: emitted when a player dies and drops a backpack carrying their current weapon and remaining ammo. Attributes: time, weapon, shells, nails, rockets, cells, player.'
          ELSE entities.name || ' match_event (KTX log-output format).'
        END
      ),
      description_origin = 'synthesized',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM match_event_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'match_event'
      AND entities.last_seen_version = ${version}
  `;
}

async function deriveQcBuiltin(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "qc_builtin <table_name>[<builtin_index>] -> <handler_fn>; <qc_signature>; <trailing_comment>"
  await tx`
    UPDATE entities SET
      description =
        'qc_builtin ' || vt.table_name || '[' || vt.builtin_index || '] -> ' || vt.handler_fn
        || coalesce('; ' || vt.qc_signature, '')
        || coalesce('; ' || vt.trailing_comment, ''),
      description_origin = 'source_inline',
      description_embedding_stale = TRUE,
      updated_at = now()
    FROM qc_builtin_versions vt
    WHERE entities.id = vt.entity_id
      AND vt.version = entities.last_seen_version
      AND entities.project = ${project}
      AND entities.type = 'qc_builtin'
      AND entities.last_seen_version = ${version}
  `;
}

const DERIVE_BY_TYPE: Partial<Record<EntityType, DeriveFn>> = {
  cvar: deriveCvar,
  command: deriveCommand,
  macro: deriveMacro,
  cmdline_param: deriveCmdlineParam,
  hud_element: deriveHudElement,
  asset_category: deriveAssetCategory,
  token_primitive: deriveTokenPrimitive,
  flag_bit: deriveFlagBit,
  cvar_alias: deriveCvarAlias,
  protocol_message: deriveProtocolMessage,
  info_key: deriveInfoKey,
  log_template: deriveLogTemplate,
  qc_builtin: deriveQcBuiltin,
  match_event: deriveMatchEvent,
  // ruleset and keyname have no help text; description stays NULL. Phase 6
  // retrieval falls back to entities.name for these types.
};

export async function deriveEntityDescriptionsForVersion(
  tx: postgres.TransactionSql<{}>,
  project: Project,
  type: EntityType,
  version: string,
): Promise<void> {
  const fn = DERIVE_BY_TYPE[type];
  if (!fn) return;
  await fn(tx, project, version);
}
