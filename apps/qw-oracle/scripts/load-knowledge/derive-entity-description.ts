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
//
// Whenever description is recomputed, description_embedding_stale flips to
// TRUE so Phase 5's embedder knows to re-embed. Phase 5 hash-skips no-op
// recomputes via description_embedding_sha256, so the simple "always set
// stale on derive" pattern is safe.

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
  await tx`
    UPDATE entities SET
      description = vt.description,
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

async function deriveQcBuiltin(tx: postgres.TransactionSql<{}>, project: Project, version: string): Promise<void> {
  // Form: "qc_builtin <table_name>[<builtin_index>] -> <handler_fn>; <qc_signature>; <trailing_comment>"
  await tx`
    UPDATE entities SET
      description =
        'qc_builtin ' || vt.table_name || '[' || vt.builtin_index || '] -> ' || vt.handler_fn
        || coalesce('; ' || vt.qc_signature, '')
        || coalesce('; ' || vt.trailing_comment, ''),
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
