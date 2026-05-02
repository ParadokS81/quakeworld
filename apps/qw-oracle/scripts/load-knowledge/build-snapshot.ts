// apps/qw-oracle/scripts/load-knowledge/build-snapshot.ts
//
// Arc 2 of the qw-config dissolution: the producer-side CLI that reads
// knowledge.db and writes slipgate-shaped snapshots into
// apps/slipgate-app/src/lib/config/data/. Shape parity with the legacy
// JSONs is preserved so slipgate's loaders need zero structural change;
// each entity row gains five additive fields:
//
//   source_state         "source_backed"  (filter below excludes doc_only
//                                           and source_retired; dynamically_
//                                           registered is mapped through to
//                                           source_backed by loadEnrichment)
//   first_seen_version   string
//   last_seen_version    string
//   default_history?     Array<{ version, value }>      (omitted when no changes)
//   retired_at_version?  string                          (omitted when not retired)
//
// Filter scope: snapshots ship only entities the user can actually invoke at
// the targeted version (slipgate's config viewer shows what the engine will
// accept). doc_only zombies and source_retired entries stay in knowledge.db
// for Layer 1 historical queries but never reach the slipgate consumer.
//
// File-root metadata: schema_version, generated_at, oracle_commit,
// knowledge_db_schema_version. Lets debugging trace anomalies back to the
// exact extractor + loader code that produced the snapshot.
//
// Group taxonomies (the `groups` block on ezquake-variables.json / commands)
// live in the extractor AST output, not knowledge.db, so we read them from
// scripts/extractors/<project>/output/. QWCL has no group taxonomy.

import postgres from 'postgres';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project } from './types.js';
import { SCHEMA_VERSION } from './constants.js';
import { buildAssetBundle } from './build-asset-bundle.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');
const EXTRACTORS_ROOT = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'scripts', 'extractors');
const DEFAULT_OUTPUT_DIR = join(MONOREPO_ROOT, 'apps', 'slipgate-app', 'src', 'lib', 'config', 'data');

const SNAPSHOT_SCHEMA_VERSION = 'snapshot-v1';

// --- enrichment shape (shared by every emitter) ----------------------------

interface EnrichmentBlock {
  source_state: 'source_backed' | 'doc_only' | 'source_retired';
  first_seen_version: string;
  last_seen_version: string;
  default_history?: Array<{ version: string; value: string }>;
  retired_at_version?: string;
}

// Numeric-aware equality. Stored values stay raw (preserves fidelity to
// upstream help_variables.json), but the comparison ignores formatting-only
// differences like "0" vs "0.0", ".33" vs "0.33", "1.0" vs "1". Pure
// string-token changes ("%H:%M:%S" -> "0") still surface as transitions
// because Number() returns NaN for the non-numeric side.
const NUMERIC_RE = /^-?(\d+(\.\d+)?|\.\d+)$/;
function defaultsEqual(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (NUMERIC_RE.test(a) && NUMERIC_RE.test(b)) {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true;
  }
  return false;
}

// Per (entity_id) -> enrichment. Built once per project+type.
//
// default_history is computed by walking cvar_versions in ordinal order and
// emitting (version, value) when the default differs from the prior version.
// Only emitted when >=2 distinct values exist (otherwise the field is
// uninteresting and would just duplicate the current default). The first
// entry is always the value at first_seen_version (the baseline); subsequent
// entries are change points. Only applies to cvars -- other types don't carry
// a meaningful default_value column.
async function loadEnrichment(
  sql: postgres.Sql,
  project: Project,
  type: string,
): Promise<Map<string, EnrichmentBlock>> {
  const entities = await sql<Array<{
    id: number;
    name: string;
    source_state: 'source_backed' | 'doc_only' | 'source_retired' | 'dynamically_registered';
    first_seen_version: string;
    last_seen_version: string;
  }>>`
    SELECT id, name, source_state, first_seen_version, last_seen_version
    FROM entities
    WHERE project = ${project} AND type = ${type}
      AND source_state IN ('source_backed', 'dynamically_registered')
  `;

  const historyByEntity = new Map<number, Array<{ version: string; value: string }>>();
  if (type === 'cvar') {
    const rows = await sql<Array<{
      entity_id: number;
      version: string;
      default_value: string;
      ordinal: number;
    }>>`
      SELECT cv.entity_id, cv.version, cv.default_value, v.ordinal
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      JOIN versions v ON v.project = e.project AND v.version = cv.version
      WHERE e.project = ${project} AND cv.default_value IS NOT NULL
      ORDER BY cv.entity_id, v.ordinal
    `;

    let currentEntity: number | null = null;
    let priorValue: string | null = null;
    let history: Array<{ version: string; value: string }> = [];
    for (const r of rows) {
      const entityId = Number(r.entity_id);
      if (entityId !== currentEntity) {
        if (currentEntity != null && history.length >= 2) {
          historyByEntity.set(currentEntity, history);
        }
        currentEntity = entityId;
        priorValue = null;
        history = [];
      }
      if (!defaultsEqual(r.default_value, priorValue)) {
        history.push({ version: r.version, value: r.default_value });
        priorValue = r.default_value;
      }
    }
    if (currentEntity != null && history.length >= 2) {
      historyByEntity.set(currentEntity, history);
    }
  }

  // source_state_transitions records the canonical "removed_from_head" event.
  const retirements = await sql<Array<{ entity_id: number; version_context: string }>>`
    SELECT t.entity_id, t.version_context
    FROM source_state_transitions t
    JOIN entities e ON e.id = t.entity_id
    WHERE e.project = ${project} AND e.type = ${type} AND t.reason = 'removed_from_head'
  `;
  const retiredAt = new Map<number, string>();
  for (const r of retirements) retiredAt.set(Number(r.entity_id), r.version_context);

  const out = new Map<string, EnrichmentBlock>();
  for (const e of entities) {
    const block: EnrichmentBlock = {
      source_state: e.source_state === 'dynamically_registered' ? 'source_backed' : e.source_state,
      first_seen_version: e.first_seen_version,
      last_seen_version: e.last_seen_version,
    };
    const history = historyByEntity.get(Number(e.id));
    if (history) block.default_history = history;
    const retired = retiredAt.get(Number(e.id));
    if (retired != null) block.retired_at_version = retired;
    out.set(e.name, block);
  }
  return out;
}

// --- per-version row fetch (current state at the snapshot's version) -------

async function fetchCvarRows(sql: postgres.Sql, project: Project, version: string) {
  return await sql<Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    help_values: string | null;
    help_group_id: string | null;
    help_type: string | null;
    default_value: string | null;
    flag_names: string | null;
    server_only: boolean;
    source_root: string | null;
  }>>`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.help_values, cv.help_group_id,
           cv.help_type, cv.default_value, cv.flag_names, cv.server_only, cv.source_root
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ${project} AND cv.version = ${version}
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `;
}

async function fetchCommandRows(sql: postgres.Sql, project: Project, version: string) {
  return await sql<Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    help_group_id: string | null;
    source_root: string | null;
  }>>`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.help_group_id, cv.source_root
    FROM command_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ${project} AND cv.version = ${version}
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `;
}

async function fetchMacroRows(sql: postgres.Sql, project: Project, version: string) {
  // related_cvars_json is JSONB; postgres-js auto-decodes it to a JS value.
  return await sql<Array<{
    name: string;
    help_desc: string | null;
    macro_type: string | null;
    teamplay_restricted: boolean;
    related_cvars_json: unknown | null;
    source_root: string | null;
  }>>`
    SELECT e.name, mv.help_desc, mv.macro_type, mv.teamplay_restricted, mv.related_cvars_json, mv.source_root
    FROM macro_versions mv
    JOIN entities e ON e.id = mv.entity_id
    WHERE e.project = ${project} AND mv.version = ${version}
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `;
}

async function fetchCmdlineRows(sql: postgres.Sql, project: Project, version: string) {
  // systems_json / flags_json are JSONB; postgres-js auto-decodes them.
  return await sql<Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    systems_json: unknown | null;
    flags_json: unknown | null;
    arguments: string | null;
  }>>`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.systems_json, cv.flags_json, cv.arguments
    FROM cmdline_param_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ${project} AND cv.version = ${version}
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `;
}

// --- ezQuake variables / commands / macros / cmdline emit ------------------

interface EzqVariablesAst {
  groups: Array<{ id: string; 'major-group': string; name: string }>;
  vars: Record<string, {
    type?: string;
    'group-id'?: string;
    default?: string;
    'server-only'?: boolean;
    desc?: string;
    remarks?: string;
    values?: unknown;
  }>;
}

function readExtractorAst<T>(project: Project, fileName: string): T {
  const path = join(EXTRACTORS_ROOT, project, 'output', fileName);
  if (!existsSync(path)) {
    throw new Error(`Extractor AST output missing at ${path}; run extract-tag first.`);
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

async function emitEzqVariables(
  sql: postgres.Sql,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  // Groups taxonomy comes from the extractor AST output (carried over from
  // help_variables.json's `groups` block -- pure metadata, project-scoped).
  const ast = readExtractorAst<EzqVariablesAst>(project, 'ezquake-variables-ast.json');

  const enrichment = await loadEnrichment(sql, project, 'cvar');
  const rows = await fetchCvarRows(sql, project, version);

  const vars: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_type) entry.type = r.help_type;
    if (r.help_group_id) entry['group-id'] = r.help_group_id;
    if (r.default_value != null) entry.default = r.default_value;
    if (r.server_only) entry['server-only'] = true;
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.help_remarks) entry.remarks = r.help_remarks;
    if (r.help_values) {
      // help_values is TEXT (pre-stringified JSON); still need JSON.parse.
      try { entry.values = JSON.parse(r.help_values); } catch { /* keep absent */ }
    }
    if (r.source_root != null) entry.source_root = r.source_root;
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    vars[r.name] = entry;
  }

  const out = {
    ...meta,
    groups: ast.groups,
    vars,
  };
  return writeJson(join(outputDir, `${project}-variables.json`), out, rows.length);
}

interface EzqCommandsAst {
  groups: Array<{ id: string; name: string }>;
  commands: Record<string, unknown>;
}

async function emitEzqCommands(
  sql: postgres.Sql,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  const ast = readExtractorAst<EzqCommandsAst>(project, `${project}-commands-ast.json`);
  const enrichment = await loadEnrichment(sql, project, 'command');
  const rows = await fetchCommandRows(sql, project, version);

  const commands: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_group_id) entry['group-id'] = r.help_group_id;
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.help_remarks) entry.remarks = r.help_remarks;
    if (r.source_root != null) entry.source_root = r.source_root;
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    commands[r.name] = entry;
  }

  const out = { ...meta, groups: ast.groups, commands };
  return writeJson(join(outputDir, `${project}-commands.json`), out, rows.length);
}

async function emitEzqMacros(
  sql: postgres.Sql,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  const enrichment = await loadEnrichment(sql, project, 'macro');
  const rows = await fetchMacroRows(sql, project, version);

  const macros: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.macro_type) entry.type = r.macro_type;
    if (r.teamplay_restricted) entry['teamplay-restricted'] = true;
    if (r.related_cvars_json != null) {
      // related_cvars_json is JSONB; already decoded by postgres-js.
      entry['related-cvars'] = r.related_cvars_json;
    }
    if (r.source_root != null) entry.source_root = r.source_root;
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    macros[r.name] = entry;
  }

  const out = { ...meta, macros };
  return writeJson(join(outputDir, `${project}-macros.json`), out, rows.length);
}

async function emitEzqCmdline(
  sql: postgres.Sql,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  const enrichment = await loadEnrichment(sql, project, 'cmdline_param');
  const rows = await fetchCmdlineRows(sql, project, version);

  const params: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.help_remarks) entry.remarks = r.help_remarks;
    if (r.arguments) entry.arguments = r.arguments;
    // systems_json / flags_json are JSONB; already decoded.
    if (r.systems_json != null) entry.systems = r.systems_json;
    if (r.flags_json != null) entry.flags = r.flags_json;
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    params[r.name] = entry;
  }

  const out = { ...meta, params };
  return writeJson(join(outputDir, `${project}-cmdline-params.json`), out, rows.length);
}

// --- QWCL variables emit ---------------------------------------------------
//
// The legacy slipgate qwcl-variables.json is a flat array
// `[{name, default, description, category, descriptionSource}]`. Preserved
// here so slipgate's qwcl loader needs no structural change. Description
// cross-reference from ezQuake (when available) is computed against the same
// knowledge.db rather than reading legacy JSONs -- keeps Oracle as the single
// producer of truth.

function inferQwclCategory(name: string): string {
  if (name.startsWith('cl_')) return 'Client';
  if (name.startsWith('sv_')) return 'Server';
  if (name.startsWith('gl_') || name.startsWith('r_') || name.startsWith('vid_')) return 'Graphics';
  if (name.startsWith('snd_') || name.startsWith('cd_') || name === 'ambient_level' || name === 'ambient_fade') return 'Sound';
  if (name.startsWith('net_') || name === 'rate' || name === 'pushlatency') return 'Network';
  if (name.startsWith('m_') || name === 'sensitivity' || name === 'lookspring' || name === 'lookstrafe') return 'Input';
  if (['name', 'team', 'skin', 'topcolor', 'bottomcolor'].includes(name)) return 'Player';
  if (name === 'fov' || name.startsWith('scr_')) return 'HUD';
  if (['con_notifytime', 'developer', 'host_speeds', 'show_fps'].includes(name)) return 'System';
  return 'Miscellaneous';
}

async function emitQwclVariables(
  sql: postgres.Sql,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  const enrichment = await loadEnrichment(sql, 'qwcl', 'cvar');
  const rows = await fetchCvarRows(sql, 'qwcl', version);

  // Cross-reference description from ezquake when available (only for cvars
  // shared by name). Same producer, single trip through the DB.
  const ezqDescs = new Map<string, string>();
  const ezqRows = await sql<Array<{ name: string; help_desc: string }>>`
    SELECT e.name, cv.help_desc
    FROM cvar_versions cv JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = 'ezquake' AND cv.version = 'head' AND cv.help_desc IS NOT NULL
  `;
  for (const r of ezqRows) ezqDescs.set(r.name, r.help_desc);

  const out: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    const description = r.help_desc ?? ezqDescs.get(r.name) ?? '';
    const descriptionSource = r.help_desc ? 'self'
      : (ezqDescs.has(r.name) ? 'ezquake' : 'none');
    const entry: Record<string, unknown> = {
      name: r.name,
      default: r.default_value ?? '',
      description,
      category: inferQwclCategory(r.name),
      descriptionSource,
    };
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    out.push(entry);
  }

  // Array-shape file: file-root metadata can't live alongside the array, so
  // we emit a wrapper object with `_meta` + `entries`. Slipgate's existing
  // qwcl loader reads the array directly -- to preserve that, fall back to
  // emitting just the array when an env var asks for legacy shape. Default
  // is the wrapper, since Arc 2 is the migration boundary.
  //
  // Actually: keep array-shape exactly to avoid touching slipgate's loader.
  // Move file-root metadata into a sibling `<project>-variables-meta.json`
  // file when array-shape consumers exist.
  const metaPath = join(outputDir, 'qwcl-variables-meta.json');
  writeJson(metaPath, { ...meta, count: out.length }, out.length);
  return writeJson(join(outputDir, 'qwcl-variables.json'), out, out.length);
}

// --- asset bundle emit -----------------------------------------------------
//
// Delegates to build-asset-bundle.ts, which is the canonical seed-merging
// pipeline (4 seed YAMLs + 3 AST output JSONs -> 1 bundle JSON). Calling it
// here ensures the bundle in slipgate's data dir reflects the FULL current
// state of asset taxonomy: every extension recognized by the extractor,
// every cvar binding the seed + AST reconciler emitted, every loader site
// from the unified extractor's last run, plus client_defaults + reserved_subdirs
// derived live. The relation tables in knowledge.db carry only the subset
// without the Path 1 path_template fields, so going through buildAssetBundle
// (which reads from the AST JSONs directly) preserves the richer shape.

function emitEzqAssetBundle(
  project: Project,
  version: string,
  outputDir: string,
): { count: number; bytes: number } {
  const outputPath = join(outputDir, `${project}-asset-bundle.json`);
  const result = buildAssetBundle({ project, version, outputPath });
  const bytes = statSync(outputPath).size;
  return {
    count: result.extensionCount + result.pathRuleCount
         + result.cvarBindingCount + result.loaderSiteCount,
    bytes,
  };
}

// --- qw maps emitter -------------------------------------------------------

async function emitQwMaps(
  sql: postgres.Sql,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  // All *_json columns on `maps` are JSONB; postgres-js auto-decodes them to
  // JS values. Keep the raw row shape generic; the mapping below preserves
  // the legacy snapshot field names.
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT canonical_name, file_name, display_name, author,
           bsp_version, bsp_size_bytes, bsp_sha256,
           worldspawn_json, entity_count, class_counts_json,
           item_summary_json, spawn_summary_json, features_json,
           wads_referenced_json, inferred_gamemodes_json,
           popularity_total, popularity_by_mode_json, popularity_rank,
           notes, source_bsp_url, extracted_at
    FROM maps
    ORDER BY canonical_name
  `;

  const maps = rows.map((r) => ({
    canonical_name: r.canonical_name,
    file_name: r.file_name,
    display_name: r.display_name,
    author: r.author,
    bsp_version: r.bsp_version,
    bsp_size_bytes: r.bsp_size_bytes,
    bsp_sha256: r.bsp_sha256,
    worldspawn: r.worldspawn_json,
    entity_count: r.entity_count,
    class_counts: r.class_counts_json,
    item_summary: r.item_summary_json,
    spawn_summary: r.spawn_summary_json,
    features: r.features_json,
    wads_referenced: r.wads_referenced_json,
    inferred_gamemodes: r.inferred_gamemodes_json,
    popularity_total: r.popularity_total,
    popularity_by_mode: r.popularity_by_mode_json ?? null,
    popularity_rank: r.popularity_rank,
    notes: r.notes,
    source_bsp_url: r.source_bsp_url,
    extracted_at: r.extracted_at,
  }));
  const out = { ...meta, maps };
  return writeJson(join(outputDir, 'qw-maps.json'), out, maps.length);
}

// --- qw gameplay emitter ---------------------------------------------------

async function emitGameplay(
  sql: postgres.Sql,
  meta: SnapshotMeta,
  outputDir: string,
): Promise<{ count: number; bytes: number }> {
  const sources = await sql`
    SELECT id, display_name, description, source_root, notes
    FROM gameplay_sources
    ORDER BY id
  `;
  // props_json / ruleset_gate_json are JSONB; postgres-js already decoded
  // them. Rename the raw columns into the snapshot's field names below.
  const entityRows = await sql<Array<Record<string, unknown>>>`
    SELECT gameplay_source_id, kind, name, classname,
           damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
           pickup_amount, max_carry, duration_seconds,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_entity_defs
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `;
  const entities = entityRows.map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r;
    return { ...rest, props: props_json, ruleset_gate: ruleset_gate_json };
  });
  const mechanicRows = await sql<Array<Record<string, unknown>>>`
    SELECT gameplay_source_id, kind, name, value_numeric, value_text,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_mechanics
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `;
  const mechanics = mechanicRows.map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r;
    return { ...rest, props: props_json, ruleset_gate: ruleset_gate_json };
  });

  const payload = {
    schema_version: 14,
    generated_at: meta.generated_at,
    sources,
    entities,
    mechanics,
  };
  return writeJson(join(outputDir, 'qw-gameplay.json'), payload, entities.length + mechanics.length);
}

// --- meta + writer ---------------------------------------------------------

interface SnapshotMeta {
  schema_version: string;
  generated_at: string;
  oracle_commit: string;
  knowledge_db_schema_version: number;
  project: Project;
  version: string;
}

function buildMeta(project: Project, version: string): SnapshotMeta {
  let oracle_commit = 'unknown';
  try {
    oracle_commit = execSync(`git -C "${MONOREPO_ROOT}" rev-parse HEAD`, { encoding: 'utf-8' }).trim();
  } catch { /* unknown is fine */ }
  return {
    schema_version: SNAPSHOT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    oracle_commit,
    knowledge_db_schema_version: SCHEMA_VERSION,
    project,
    version,
  };
}

function writeJson(path: string, content: unknown, count: number): { count: number; bytes: number } {
  mkdirSync(dirname(path), { recursive: true });
  const body = JSON.stringify(content, null, 2) + '\n';
  writeFileSync(path, body, 'utf-8');
  return { count, bytes: body.length };
}

// --- public entry point ----------------------------------------------------

export interface BuildSnapshotOptions {
  sql?: postgres.Sql;
  project: Project;
  version?: string;
  outputDir?: string;
}

export interface BuildSnapshotResult {
  project: Project;
  version: string;
  outputDir: string;
  files: Array<{ file: string; entities: number; bytes: number }>;
}

// Default version per project -- qwcl has no `head` (single-commit repo);
// qw is the version-less game-itself namespace (maps table has no versions row);
// every other project tracks a moving head snapshot.
const PROJECT_DEFAULT_SNAPSHOT_VERSION: Record<Project, string> = {
  ezquake: 'head',
  fte:     'head',
  mvdsv:   'head',
  ktx:     'head',
  qwcl:    '2.33',
  qw:      'static',
};

export async function buildSnapshot(opts: BuildSnapshotOptions): Promise<BuildSnapshotResult> {
  const version = opts.version ?? PROJECT_DEFAULT_SNAPSHOT_VERSION[opts.project];
  const outputDir = opts.outputDir ?? DEFAULT_OUTPUT_DIR;
  mkdirSync(outputDir, { recursive: true });

  // build-snapshot is a pure consumer of the DB; the schema is owned by the
  // migrator. When the caller doesn't pass a Sql handle we open a local one
  // and tear it down at the end so CLI invocation remains self-contained.
  const ownedSql = opts.sql == null;
  const sql = opts.sql ?? postgres(
    process.env.DATABASE_URL ?? 'postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle',
    { onnotice: () => {} },
  );

  try {
    // qw is the static-version namespace (the game itself, not an engine).
    // It has no row in `versions`; skip the existence check.
    if (opts.project !== 'qw') {
      const verRows = await sql<{ one: number }[]>`
        SELECT 1 AS one FROM versions WHERE project = ${opts.project} AND version = ${version}
      `;
      if (verRows.length === 0) {
        throw new Error(`No versions row for ${opts.project}@${version}; run extract-tag first.`);
      }
    }

    const meta = buildMeta(opts.project, version);
    const files: Array<{ file: string; entities: number; bytes: number }> = [];

    if (opts.project === 'qwcl') {
      const r = await emitQwclVariables(sql, version, meta, outputDir);
      files.push({ file: 'qwcl-variables.json', entities: r.count, bytes: r.bytes });
    } else if (opts.project === 'ezquake') {
      const v = await emitEzqVariables(sql, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-variables.json`, entities: v.count, bytes: v.bytes });
      const c = await emitEzqCommands(sql, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-commands.json`, entities: c.count, bytes: c.bytes });
      const m = await emitEzqMacros(sql, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-macros.json`, entities: m.count, bytes: m.bytes });
      const cl = await emitEzqCmdline(sql, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-cmdline-params.json`, entities: cl.count, bytes: cl.bytes });
      const ab = emitEzqAssetBundle(opts.project, version, outputDir);
      files.push({ file: `${opts.project}-asset-bundle.json`, entities: ab.count, bytes: ab.bytes });
    } else if (opts.project === 'qw') {
      const r = await emitQwMaps(sql, meta, outputDir);
      files.push({ file: 'qw-maps.json', entities: r.count, bytes: r.bytes });
      const g = await emitGameplay(sql, meta, outputDir);
      files.push({ file: 'qw-gameplay.json', entities: g.count, bytes: g.bytes });
    } else {
      throw new Error(`build-snapshot does not yet support project=${opts.project}.`);
    }

    return { project: opts.project, version, outputDir, files };
  } finally {
    if (ownedSql) {
      await sql.end();
    }
  }
}
