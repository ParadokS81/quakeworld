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

import Database from 'better-sqlite3';
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

// ─── enrichment shape (shared by every emitter) ────────────────────────────

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
// string-token changes ("%H:%M:%S" → "0") still surface as transitions
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

// Per (entity_id) → enrichment. Built once per project+type.
//
// default_history is computed by walking cvar_versions in ordinal order and
// emitting (version, value) when the default differs from the prior version.
// Only emitted when ≥2 distinct values exist (otherwise the field is
// uninteresting and would just duplicate the current default). The first
// entry is always the value at first_seen_version (the baseline); subsequent
// entries are change points. Only applies to cvars — other types don't carry
// a meaningful default_value column.
function loadEnrichment(
  db: Database.Database,
  project: Project,
  type: string,
): Map<string, EnrichmentBlock> {
  const entities = db.prepare(`
    SELECT id, name, source_state, first_seen_version, last_seen_version
    FROM entities
    WHERE project = ? AND type = ?
      AND source_state IN ('source_backed', 'dynamically_registered')
  `).all(project, type) as Array<{
    id: number;
    name: string;
    source_state: 'source_backed' | 'doc_only' | 'source_retired' | 'dynamically_registered';
    first_seen_version: string;
    last_seen_version: string;
  }>;

  const historyByEntity = new Map<number, Array<{ version: string; value: string }>>();
  if (type === 'cvar') {
    const rows = db.prepare(`
      SELECT cv.entity_id, cv.version, cv.default_value, v.ordinal
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      JOIN versions v ON v.project = e.project AND v.version = cv.version
      WHERE e.project = ? AND cv.default_value IS NOT NULL
      ORDER BY cv.entity_id, v.ordinal
    `).all(project) as Array<{
      entity_id: number;
      version: string;
      default_value: string;
      ordinal: number;
    }>;

    let currentEntity: number | null = null;
    let priorValue: string | null = null;
    let history: Array<{ version: string; value: string }> = [];
    for (const r of rows) {
      if (r.entity_id !== currentEntity) {
        if (currentEntity != null && history.length >= 2) {
          historyByEntity.set(currentEntity, history);
        }
        currentEntity = r.entity_id;
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
  const retirements = db.prepare(`
    SELECT t.entity_id, t.version_context
    FROM source_state_transitions t
    JOIN entities e ON e.id = t.entity_id
    WHERE e.project = ? AND e.type = ? AND t.reason = 'removed_from_head'
  `).all(project, type) as Array<{ entity_id: number; version_context: string }>;
  const retiredAt = new Map<number, string>();
  for (const r of retirements) retiredAt.set(r.entity_id, r.version_context);

  const out = new Map<string, EnrichmentBlock>();
  for (const e of entities) {
    const block: EnrichmentBlock = {
      source_state: e.source_state === 'dynamically_registered' ? 'source_backed' : e.source_state,
      first_seen_version: e.first_seen_version,
      last_seen_version: e.last_seen_version,
    };
    const history = historyByEntity.get(e.id);
    if (history) block.default_history = history;
    const retired = retiredAt.get(e.id);
    if (retired != null) block.retired_at_version = retired;
    out.set(e.name, block);
  }
  return out;
}

// ─── per-version row fetch (current state at the snapshot's version) ───────

function fetchCvarRows(db: Database.Database, project: Project, version: string) {
  return db.prepare(`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.help_values, cv.help_group_id,
           cv.help_type, cv.default_value, cv.flag_names, cv.server_only, cv.source_root
    FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `).all(project, version) as Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    help_values: string | null;
    help_group_id: string | null;
    help_type: string | null;
    default_value: string | null;
    flag_names: string | null;
    server_only: number;
    source_root: string | null;
  }>;
}

function fetchCommandRows(db: Database.Database, project: Project, version: string) {
  return db.prepare(`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.help_group_id, cv.source_root
    FROM command_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `).all(project, version) as Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    help_group_id: string | null;
    source_root: string | null;
  }>;
}

function fetchMacroRows(db: Database.Database, project: Project, version: string) {
  return db.prepare(`
    SELECT e.name, mv.help_desc, mv.macro_type, mv.teamplay_restricted, mv.related_cvars_json, mv.source_root
    FROM macro_versions mv
    JOIN entities e ON e.id = mv.entity_id
    WHERE e.project = ? AND mv.version = ?
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `).all(project, version) as Array<{
    name: string;
    help_desc: string | null;
    macro_type: string | null;
    teamplay_restricted: number;
    related_cvars_json: string | null;
    source_root: string | null;
  }>;
}

function fetchCmdlineRows(db: Database.Database, project: Project, version: string) {
  return db.prepare(`
    SELECT e.name, cv.help_desc, cv.help_remarks, cv.systems_json, cv.flags_json, cv.arguments
    FROM cmdline_param_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = ? AND cv.version = ?
      AND e.source_state IN ('source_backed', 'dynamically_registered')
    ORDER BY e.name
  `).all(project, version) as Array<{
    name: string;
    help_desc: string | null;
    help_remarks: string | null;
    systems_json: string | null;
    flags_json: string | null;
    arguments: string | null;
  }>;
}

// ─── ezQuake variables / commands / macros / cmdline emit ──────────────────

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

function emitEzqVariables(
  db: Database.Database,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  // Groups taxonomy comes from the extractor AST output (carried over from
  // help_variables.json's `groups` block — pure metadata, project-scoped).
  const ast = readExtractorAst<EzqVariablesAst>(project, 'ezquake-variables-ast.json');

  const enrichment = loadEnrichment(db, project, 'cvar');
  const rows = fetchCvarRows(db, project, version);

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

function emitEzqCommands(
  db: Database.Database,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const ast = readExtractorAst<EzqCommandsAst>(project, `${project}-commands-ast.json`);
  const enrichment = loadEnrichment(db, project, 'command');
  const rows = fetchCommandRows(db, project, version);

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

function emitEzqMacros(
  db: Database.Database,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const enrichment = loadEnrichment(db, project, 'macro');
  const rows = fetchMacroRows(db, project, version);

  const macros: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.macro_type) entry.type = r.macro_type;
    if (r.teamplay_restricted) entry['teamplay-restricted'] = true;
    if (r.related_cvars_json) {
      try { entry['related-cvars'] = JSON.parse(r.related_cvars_json); } catch { /* keep absent */ }
    }
    if (r.source_root != null) entry.source_root = r.source_root;
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    macros[r.name] = entry;
  }

  const out = { ...meta, macros };
  return writeJson(join(outputDir, `${project}-macros.json`), out, rows.length);
}

function emitEzqCmdline(
  db: Database.Database,
  project: Project,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const enrichment = loadEnrichment(db, project, 'cmdline_param');
  const rows = fetchCmdlineRows(db, project, version);

  const params: Record<string, Record<string, unknown>> = {};
  for (const r of rows) {
    const entry: Record<string, unknown> = {};
    if (r.help_desc) entry.desc = r.help_desc;
    if (r.help_remarks) entry.remarks = r.help_remarks;
    if (r.arguments) entry.arguments = r.arguments;
    if (r.systems_json) {
      try { entry.systems = JSON.parse(r.systems_json); } catch { /* keep absent */ }
    }
    if (r.flags_json) {
      try { entry.flags = JSON.parse(r.flags_json); } catch { /* keep absent */ }
    }
    const enr = enrichment.get(r.name);
    if (enr) Object.assign(entry, enr);
    params[r.name] = entry;
  }

  const out = { ...meta, params };
  return writeJson(join(outputDir, `${project}-cmdline-params.json`), out, rows.length);
}

// ─── QWCL variables emit ───────────────────────────────────────────────────
//
// The legacy slipgate qwcl-variables.json is a flat array
// `[{name, default, description, category, descriptionSource}]`. Preserved
// here so slipgate's qwcl loader needs no structural change. Description
// cross-reference from ezQuake (when available) is computed against the same
// knowledge.db rather than reading legacy JSONs — keeps Oracle as the single
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

function emitQwclVariables(
  db: Database.Database,
  version: string,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const enrichment = loadEnrichment(db, 'qwcl', 'cvar');
  const rows = fetchCvarRows(db, 'qwcl', version);

  // Cross-reference description from ezquake when available (only for cvars
  // shared by name). Same producer, single trip through the DB.
  const ezqDescs = new Map<string, string>();
  const ezqRows = db.prepare(`
    SELECT e.name, cv.help_desc
    FROM cvar_versions cv JOIN entities e ON e.id = cv.entity_id
    WHERE e.project = 'ezquake' AND cv.version = 'head' AND cv.help_desc IS NOT NULL
  `).all() as Array<{ name: string; help_desc: string }>;
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
  // qwcl loader reads the array directly — to preserve that, fall back to
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

// ─── asset bundle emit ─────────────────────────────────────────────────────
//
// Delegates to build-asset-bundle.ts, which is the canonical seed-merging
// pipeline (4 seed YAMLs + 3 AST output JSONs → 1 bundle JSON). Calling it
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

// ─── qw maps emitter ───────────────────────────────────────────────────────

function emitQwMaps(
  db: Database.Database,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const rows = db.prepare(`
    SELECT canonical_name, file_name, display_name, author,
           bsp_version, bsp_size_bytes, bsp_sha256,
           worldspawn_json, entity_count, class_counts_json,
           item_summary_json, spawn_summary_json, features_json,
           wads_referenced_json, inferred_gamemodes_json,
           popularity_total, popularity_by_mode_json, popularity_rank,
           notes, source_bsp_url, extracted_at
    FROM maps
    ORDER BY canonical_name
  `).all() as Array<Record<string, unknown>>;

  const maps = rows.map((r) => ({
    canonical_name: r.canonical_name,
    file_name: r.file_name,
    display_name: r.display_name,
    author: r.author,
    bsp_version: r.bsp_version,
    bsp_size_bytes: r.bsp_size_bytes,
    bsp_sha256: r.bsp_sha256,
    worldspawn: JSON.parse(r.worldspawn_json as string),
    entity_count: r.entity_count,
    class_counts: JSON.parse(r.class_counts_json as string),
    item_summary: JSON.parse(r.item_summary_json as string),
    spawn_summary: JSON.parse(r.spawn_summary_json as string),
    features: JSON.parse(r.features_json as string),
    wads_referenced: JSON.parse(r.wads_referenced_json as string),
    inferred_gamemodes: JSON.parse(r.inferred_gamemodes_json as string),
    popularity_total: r.popularity_total,
    popularity_by_mode: r.popularity_by_mode_json ? JSON.parse(r.popularity_by_mode_json as string) : null,
    popularity_rank: r.popularity_rank,
    notes: r.notes,
    source_bsp_url: r.source_bsp_url,
    extracted_at: r.extracted_at,
  }));
  const out = { ...meta, maps };
  return writeJson(join(outputDir, 'qw-maps.json'), out, maps.length);
}

// ─── qw gameplay emitter ───────────────────────────────────────────────────

function emitGameplay(
  db: Database.Database,
  meta: SnapshotMeta,
  outputDir: string,
): { count: number; bytes: number } {
  const sources = db.prepare(`SELECT id, display_name, description, source_root, notes FROM gameplay_sources ORDER BY id`).all();
  const entities = (db.prepare(`
    SELECT gameplay_source_id, kind, name, classname,
           damage, splash_damage, splash_radius, refire_seconds, respawn_seconds,
           pickup_amount, max_carry, duration_seconds,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_entity_defs
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `).all() as Array<Record<string, unknown>>).map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r as { props_json: string; ruleset_gate_json: string };
    return { ...rest, props: JSON.parse(props_json), ruleset_gate: JSON.parse(ruleset_gate_json) };
  });
  const mechanics = (db.prepare(`
    SELECT gameplay_source_id, kind, name, value_numeric, value_text,
           ruleset_gate_json, source_ref, props_json, notes
    FROM gameplay_mechanics
    ORDER BY gameplay_source_id, kind, name, ruleset_gate_json
  `).all() as Array<Record<string, unknown>>).map((r) => {
    const { props_json, ruleset_gate_json, ...rest } = r as { props_json: string; ruleset_gate_json: string };
    return { ...rest, props: JSON.parse(props_json), ruleset_gate: JSON.parse(ruleset_gate_json) };
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

// ─── meta + writer ─────────────────────────────────────────────────────────

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

// ─── public entry point ────────────────────────────────────────────────────

export interface BuildSnapshotOptions {
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

// Default version per project — qwcl has no `head` (single-commit repo);
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

export function buildSnapshot(opts: BuildSnapshotOptions): BuildSnapshotResult {
  const version = opts.version ?? PROJECT_DEFAULT_SNAPSHOT_VERSION[opts.project];
  const outputDir = opts.outputDir ?? DEFAULT_OUTPUT_DIR;
  mkdirSync(outputDir, { recursive: true });

  const db = openDbReadonly();
  try {
    // qw is the static-version namespace (the game itself, not an engine).
    // It has no row in `versions`; skip the existence check.
    if (opts.project !== 'qw') {
      const ver = db.prepare(`SELECT 1 FROM versions WHERE project=? AND version=?`).get(opts.project, version);
      if (!ver) {
        throw new Error(`No versions row for ${opts.project}@${version}; run extract-tag first.`);
      }
    }

    const meta = buildMeta(opts.project, version);
    const files: Array<{ file: string; entities: number; bytes: number }> = [];

    if (opts.project === 'qwcl') {
      const r = emitQwclVariables(db, version, meta, outputDir);
      files.push({ file: 'qwcl-variables.json', entities: r.count, bytes: r.bytes });
    } else if (opts.project === 'ezquake') {
      const v = emitEzqVariables(db, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-variables.json`, entities: v.count, bytes: v.bytes });
      const c = emitEzqCommands(db, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-commands.json`, entities: c.count, bytes: c.bytes });
      const m = emitEzqMacros(db, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-macros.json`, entities: m.count, bytes: m.bytes });
      const cl = emitEzqCmdline(db, opts.project, version, meta, outputDir);
      files.push({ file: `${opts.project}-cmdline-params.json`, entities: cl.count, bytes: cl.bytes });
      const ab = emitEzqAssetBundle(opts.project, version, outputDir);
      files.push({ file: `${opts.project}-asset-bundle.json`, entities: ab.count, bytes: ab.bytes });
    } else if (opts.project === 'qw') {
      const r = emitQwMaps(db, meta, outputDir);
      files.push({ file: 'qw-maps.json', entities: r.count, bytes: r.bytes });
      const g = emitGameplay(db, meta, outputDir);
      files.push({ file: 'qw-gameplay.json', entities: g.count, bytes: g.bytes });
    } else {
      throw new Error(`build-snapshot does not yet support project=${opts.project}.`);
    }

    return { project: opts.project, version, outputDir, files };
  } finally {
    db.close();
  }
}

// Read-only handle that bypasses the normal applySchema migration path —
// build-snapshot is a pure consumer of the DB; it should never run migrations
// or write. If the DB is at an older schema, the caller should run any
// other CLI subcommand first (which triggers applySchema).
function openDbReadonly(): Database.Database {
  const path = join(MONOREPO_ROOT, 'apps', 'qw-oracle', 'data', 'knowledge.db');
  if (!existsSync(path)) {
    throw new Error(`knowledge.db not found at ${path}; run extract-tag first.`);
  }
  return new Database(path, { readonly: true });
}
