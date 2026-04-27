// apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
//
// Read-only Layer 1 quality grid. Two probe families:
//
//   Family 1 (regression) — pinned invariants that must always hold. Each
//   PASS/FAIL is unambiguous; a FAIL means a fix shipped earlier has been
//   reintroduced or a new tag has the same shape as a known-bad pattern.
//
//   Family 2 (anomaly) — open-ended consistency checks. They surface things
//   worth a human look. Most output is "fine, ignore" — value is in the rare
//   hits. Each anomaly classifies as a new bug class drives a follow-up
//   regression probe (Family 1 promotion).
//
// Adding a probe: write a function returning ProbeResult, register it in
// REGRESSION_PROBES or ANOMALY_PROBES. Probes are pure read-only SQL — no
// schema changes, no DB writes, no side effects. The runner is best-effort:
// a probe that throws is reported as ERROR, the rest still run.
//
// Run: npm run load-knowledge -- quality-grid [--project <p>] [--family regression|anomaly|both] [--probe <name>] [--json]

import type Database from 'better-sqlite3';
import { HEAD_ORDINAL } from './schema.js';
import type { Project } from './types.js';

export type ProbeFamily = 'regression' | 'anomaly';
export type ProbeStatus = 'PASS' | 'FAIL' | 'CLEAN' | 'FOUND' | 'ERROR';

export interface ProbeResult {
  name: string;
  family: ProbeFamily;
  description: string;
  status: ProbeStatus;
  count: number;
  summary: string;
  examples: string[];
  error?: string;
}

export interface ProbeContext {
  db: Database.Database;
  project: Project;
}

export interface Probe {
  name: string;
  family: ProbeFamily;
  description: string;
  run(ctx: ProbeContext): ProbeResult;
}

// ---------------------------------------------------------------------------
// Family 1 — Regression probes
// ---------------------------------------------------------------------------

const PER_TYPE_VERSION_TABLE: Record<string, string> = {
  cvar: 'cvar_versions',
  command: 'command_versions',
  macro: 'macro_versions',
  cmdline_param: 'cmdline_param_versions',
  keyname: 'keyname_versions',
  hud_element: 'hud_element_versions',
  ruleset: 'ruleset_versions',
  token_primitive: 'token_primitive_versions',
  asset_category: 'asset_category_versions',
  flag_bit: 'flag_bit_versions',
};

// Today's fix: entity.first_seen must equal the version with MIN ordinal
// across the entity's per-type version table.
function probeFirstSeenMinOrdinal(ctx: ProbeContext): ProbeResult {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = ctx.db.prepare(`
      SELECT e.name,
             e.first_seen_version AS recorded,
             (SELECT v.version FROM versions v
              JOIN ${versionTable} xv ON xv.version=v.version AND v.project=e.project
              WHERE xv.entity_id=e.id ORDER BY v.ordinal ASC LIMIT 1) AS expected
      FROM entities e
      WHERE e.project=? AND e.type=?
        AND EXISTS (SELECT 1 FROM ${versionTable} xv WHERE xv.entity_id=e.id)
    `).all(ctx.project, type) as { name: string; recorded: string; expected: string }[];
    for (const r of rows) {
      if (r.recorded !== r.expected) {
        total += 1;
        if (examples.length < 5) {
          examples.push(`${type}:${r.name}  recorded=${r.recorded}  expected=${r.expected}`);
        }
      }
    }
  }
  return {
    name: 'F1.first_seen_min_ordinal',
    family: 'regression',
    description: 'entities.first_seen_version equals MIN ordinal across the per-type version table',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0 ? 'all entities consistent' : `${total} entities with stale first_seen_version`,
    examples,
  };
}

// Today's fix: entity.last_seen must equal the version with MAX ordinal.
function probeLastSeenMaxOrdinal(ctx: ProbeContext): ProbeResult {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = ctx.db.prepare(`
      SELECT e.name,
             e.last_seen_version AS recorded,
             (SELECT v.version FROM versions v
              JOIN ${versionTable} xv ON xv.version=v.version AND v.project=e.project
              WHERE xv.entity_id=e.id ORDER BY v.ordinal DESC LIMIT 1) AS expected
      FROM entities e
      WHERE e.project=? AND e.type=?
        AND EXISTS (SELECT 1 FROM ${versionTable} xv WHERE xv.entity_id=e.id)
    `).all(ctx.project, type) as { name: string; recorded: string; expected: string }[];
    for (const r of rows) {
      if (r.recorded !== r.expected) {
        total += 1;
        if (examples.length < 5) {
          examples.push(`${type}:${r.name}  recorded=${r.recorded}  expected=${r.expected}`);
        }
      }
    }
  }
  return {
    name: 'F1.last_seen_max_ordinal',
    family: 'regression',
    description: 'entities.last_seen_version equals MAX ordinal across the per-type version table',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0 ? 'all entities consistent' : `${total} entities with stale last_seen_version`,
    examples,
  };
}

// Today's fix: head version row carries the HEAD_ORDINAL sentinel.
function probeHeadOrdinalSentinel(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT version, ordinal FROM versions
    WHERE project=? AND version='head' AND ordinal != ?
  `).all(ctx.project, HEAD_ORDINAL) as { version: string; ordinal: number }[];
  return {
    name: 'F1.head_ordinal_sentinel',
    family: 'regression',
    description: `head version row carries HEAD_ORDINAL=${HEAD_ORDINAL}`,
    status: rows.length === 0 ? 'PASS' : 'FAIL',
    count: rows.length,
    summary: rows.length === 0
      ? 'head ordinal is sentinel'
      : `head ordinal is ${rows[0]!.ordinal}, expected ${HEAD_ORDINAL}`,
    examples: rows.map(r => `${r.version} ordinal=${r.ordinal}`),
  };
}

// Item B fix (commit 146cd73): no entity should be doc_only when a same-name
// peer under another type is source_backed. Help-JSON cross-type orphans.
function probeCrossTypeOrphans(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT a.type AS doc_type, a.name, b.type AS source_type
    FROM entities a
    JOIN entities b ON b.project=a.project AND b.name=a.name AND b.type != a.type
    WHERE a.project=? AND a.source_state='doc_only' AND b.source_state='source_backed'
    ORDER BY a.name
  `).all(ctx.project) as { doc_type: string; name: string; source_type: string }[];
  return {
    name: 'F1.cross_type_orphans',
    family: 'regression',
    description: 'no entity is doc_only when same name is source_backed under another type',
    status: rows.length === 0 ? 'PASS' : 'FAIL',
    count: rows.length,
    summary: rows.length === 0 ? 'no cross-type orphans' : `${rows.length} cross-type orphans`,
    examples: rows.slice(0, 5).map(r => `${r.name}: ${r.doc_type} doc_only vs ${r.source_type} source_backed`),
  };
}

// Defensive invariant: every entity must have at least one row in its
// per-type version table. Bare entity rows (no body) signal a failed insert
// or an old schema-evolution bug.
function probeEntityHasVersionRows(ctx: ProbeContext): ProbeResult {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = ctx.db.prepare(`
      SELECT e.name FROM entities e
      WHERE e.project=? AND e.type=?
        AND NOT EXISTS (SELECT 1 FROM ${versionTable} xv WHERE xv.entity_id=e.id)
    `).all(ctx.project, type) as { name: string }[];
    for (const r of rows) {
      total += 1;
      if (examples.length < 5) examples.push(`${type}:${r.name}`);
    }
  }
  return {
    name: 'F1.entity_has_version_rows',
    family: 'regression',
    description: 'every entity has at least one row in its per-type version table',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0 ? 'all entities have version rows' : `${total} bare entities`,
    examples,
  };
}

// ---------------------------------------------------------------------------
// Family 2 — Anomaly probes
// ---------------------------------------------------------------------------

// An entity present-then-absent-then-present across consecutive ordinal-
// ordered versions is almost always an extractor bug, not real history.
// Detection: build an ordered presence string per entity, look for "1 0 1"
// (or longer with gaps in the middle).
//
// Doc_only entities are excluded: their version-row presence tracks the
// upstream help_*.json's own contents, which is hand-curated and can lose
// then re-add entries (e.g., ezquake `s_stereo` is in 3.1 help_variables.json,
// dropped 3.2..3.2.3, restored 3.6.0+, never source-defined at any tag).
// That help-JSON drift is real upstream documentation history, not an
// extractor anomaly. The probe stays useful for source_backed / source_retired
// entities, where flicker would still indicate a missed extraction.
function probeFlickeringPresence(ctx: ProbeContext): ProbeResult {
  const versions = ctx.db.prepare(`
    SELECT version, ordinal FROM versions WHERE project=? ORDER BY ordinal
  `).all(ctx.project) as { version: string; ordinal: number }[];
  if (versions.length < 3) {
    return {
      name: 'F2.flickering_presence',
      family: 'anomaly',
      description: 'entities present then absent then present across loaded tags',
      status: 'CLEAN',
      count: 0,
      summary: `need >=3 loaded versions; have ${versions.length}`,
      examples: [],
    };
  }
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = ctx.db.prepare(`
      SELECT e.id, e.name,
             GROUP_CONCAT(v.version, '|' ORDER BY v.ordinal) AS pattern
      FROM entities e
      LEFT JOIN ${versionTable} xv ON xv.entity_id=e.id
      LEFT JOIN versions v ON v.project=e.project AND v.version=xv.version
      WHERE e.project=? AND e.type=? AND e.source_state != 'doc_only'
      GROUP BY e.id
    `).all(ctx.project, type) as { id: number; name: string; pattern: string | null }[];
    for (const r of rows) {
      if (!r.pattern) continue;
      const seen = new Set(r.pattern.split('|'));
      const presence = versions.map(v => seen.has(v.version) ? '1' : '0').join('');
      if (/10+1/.test(presence)) {
        total += 1;
        if (examples.length < 5) {
          const labels = versions.map(v => `${v.version}${seen.has(v.version) ? '+' : '-'}`).join(' ');
          examples.push(`${type}:${r.name}  ${labels}`);
        }
      }
    }
  }
  return {
    name: 'F2.flickering_presence',
    family: 'anomaly',
    description: 'entities present then absent then present across loaded tags',
    status: total === 0 ? 'CLEAN' : 'FOUND',
    count: total,
    summary: total === 0 ? 'no flickering presence' : `${total} entities with non-monotonic presence`,
    examples,
  };
}

// Source_backed cvars whose head-version row has all body fields NULL. Either
// the extractor populated the name without the body, or there is a join bug.
function probeEmptyBodyDensity(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT e.name, cv.version FROM entities e
    JOIN cvar_versions cv ON cv.entity_id=e.id
    WHERE e.project=? AND e.type='cvar' AND e.source_state='source_backed'
      AND cv.help_desc IS NULL AND cv.help_type IS NULL
      AND cv.default_value IS NULL AND cv.flag_names IS NULL
      AND cv.source_file IS NULL
  `).all(ctx.project) as { name: string; version: string }[];
  return {
    name: 'F2.empty_body_density',
    family: 'anomaly',
    description: 'source_backed cvars with all body fields NULL on at least one version row',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'no empty cvars' : `${rows.length} cvar version rows fully empty`,
    examples: rows.slice(0, 5).map(r => `${r.name}@${r.version}`),
  };
}

// Source_backed entities should always have source_file + source_line on
// every version row -- UNLESS the row is explained by a transition:
//   - at or after a source_retired_at_version transition (entity retired in
//     source; help-JSON entry persisted, version legitimately has no citation)
//   - before a backfill_match transition (entity was doc_only at older
//     versions, gained source registration later; older NULL rows are the
//     pre-introduction state)
// Missing citation without either explanation = stale data or extractor regression.
function probeSourceBackedMissingCitation(ctx: ProbeContext): ProbeResult {
  const examples: string[] = [];
  let total = 0;
  const targets: [string, string][] = [
    ['cvar', 'cvar_versions'],
    ['command', 'command_versions'],
    ['macro', 'macro_versions'],
    ['cmdline_param', 'cmdline_param_versions'],
    ['hud_element', 'hud_element_versions'],
    ['flag_bit', 'flag_bit_versions'],
    ['keyname', 'keyname_versions'],
    ['ruleset', 'ruleset_versions'],
    ['token_primitive', 'token_primitive_versions'],
  ];
  for (const [type, table] of targets) {
    const rows = ctx.db.prepare(`
      SELECT e.name, xv.version FROM entities e
      JOIN ${table} xv ON xv.entity_id=e.id
      JOIN versions vrow ON vrow.project=e.project AND vrow.version=xv.version
      WHERE e.project=? AND e.type=? AND e.source_state='source_backed'
        AND (xv.source_file IS NULL OR xv.source_line IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM source_state_transitions sst
          JOIN versions vret ON vret.project=e.project AND vret.version=sst.version_context
          WHERE sst.entity_id=e.id
            AND sst.reason='source_retired_at_version'
            AND vret.ordinal <= vrow.ordinal
        )
        AND NOT EXISTS (
          SELECT 1 FROM source_state_transitions sst
          JOIN versions vbf ON vbf.project=e.project AND vbf.version=sst.version_context
          WHERE sst.entity_id=e.id
            AND sst.reason='backfill_match'
            AND vrow.ordinal < vbf.ordinal
        )
    `).all(ctx.project, type) as { name: string; version: string }[];
    for (const r of rows) {
      total += 1;
      if (examples.length < 5) examples.push(`${type}:${r.name}@${r.version}`);
    }
  }
  return {
    name: 'F2.source_backed_missing_citation',
    family: 'anomaly',
    description: 'source_backed entities with NULL citation, not explained by a retirement or backfill transition',
    status: total === 0 ? 'CLEAN' : 'FOUND',
    count: total,
    summary: total === 0 ? 'all source_backed entities cited (or transition-explained)' : `${total} version rows missing citation`,
    examples,
  };
}

// `+command` / `-command` pairs should be symmetric. An asymmetry usually
// means the parser caught one half and missed the other (e.g. a press-only
// macro registered without the matching release).
function probePairSymmetry(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT name FROM entities
    WHERE project=? AND type='command' AND source_state='source_backed'
      AND (name LIKE '+%' OR name LIKE '-%')
  `).all(ctx.project) as { name: string }[];
  const set = new Set(rows.map(r => r.name));
  const lonely: string[] = [];
  for (const name of set) {
    const counterpart = name.startsWith('+') ? '-' + name.slice(1) : '+' + name.slice(1);
    if (!set.has(counterpart)) lonely.push(name);
  }
  lonely.sort();
  return {
    name: 'F2.pair_symmetry',
    family: 'anomaly',
    description: '+command / -command pairs are symmetric',
    status: lonely.length === 0 ? 'CLEAN' : 'FOUND',
    count: lonely.length,
    summary: lonely.length === 0 ? 'all +/- pairs symmetric' : `${lonely.length} commands without counterpart`,
    examples: lonely.slice(0, 10),
  };
}

// Doc_only count broken down by type. Tracks the "extractor missed it"
// surface across loads. A spike in any bucket means the extractor regressed
// on its previous coverage of that type's help-JSON entries.
function probeDocOnlyCrosstab(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT type, COUNT(*) AS n FROM entities
    WHERE project=? AND source_state='doc_only'
    GROUP BY type ORDER BY n DESC
  `).all(ctx.project) as { type: string; n: number }[];
  const total = rows.reduce((s, r) => s + r.n, 0);
  return {
    name: 'F2.doc_only_crosstab',
    family: 'anomaly',
    description: 'doc_only entity count broken down by type — extractor coverage gauge',
    status: total === 0 ? 'CLEAN' : 'FOUND',
    count: total,
    summary: total === 0 ? 'no doc_only entities' : `${total} doc_only entities (informational)`,
    examples: rows.map(r => `${r.type}: ${r.n}`),
  };
}

// Default-value ping-pong: a cvar whose default_value flips X -> Y -> X
// across consecutive ordinal-ordered versions. Real defaults can change
// across releases, but oscillation is almost always extractor non-determinism
// or a flag-vs-default confusion.
function probeDefaultValuePingPong(ctx: ProbeContext): ProbeResult {
  const rows = ctx.db.prepare(`
    SELECT e.name,
           GROUP_CONCAT(cv.default_value, '|' ORDER BY v.ordinal) AS defaults,
           GROUP_CONCAT(cv.version, '|' ORDER BY v.ordinal) AS vs
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id=e.id
    JOIN versions v ON v.project=e.project AND v.version=cv.version
    WHERE e.project=? AND e.type='cvar' AND cv.default_value IS NOT NULL
    GROUP BY e.id
    HAVING COUNT(*) >= 3
  `).all(ctx.project) as { name: string; defaults: string | null; vs: string }[];
  const examples: string[] = [];
  let total = 0;
  for (const r of rows) {
    if (r.defaults === null) continue;
    const series = r.defaults.split('|');
    let oscillates = false;
    for (let i = 2; i < series.length; i++) {
      if (series[i] === series[i - 2] && series[i] !== series[i - 1]) {
        oscillates = true;
        break;
      }
    }
    if (oscillates) {
      total += 1;
      if (examples.length < 5) {
        examples.push(`${r.name}  defaults=[${series.join(' ')}]  versions=[${r.vs.replaceAll('|', ' ')}]`);
      }
    }
  }
  return {
    name: 'F2.default_value_ping_pong',
    family: 'anomaly',
    description: 'cvar default_value oscillates X -> Y -> X across consecutive versions',
    status: total === 0 ? 'CLEAN' : 'FOUND',
    count: total,
    summary: total === 0 ? 'no oscillating defaults' : `${total} cvars with oscillating defaults`,
    examples,
  };
}

// ---------------------------------------------------------------------------
// FTE Family 1 — Regression probes
//
// Ranges centered on post-Pattern-3-fix counts (2482 cvars / 556 commands /
// 67 macros / 103 cmdline_params) with +-15% tolerance. Pattern 3 fix
// recovered 103 nested cvar_t array / container-struct cvars; engine count
// rose from 1294 to 1397.
// ---------------------------------------------------------------------------

function probeFteCvarsCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.cvars_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='cvar'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [2110, 2855];
  return {
    name: 'F1.fte.cvars_count',
    family: 'regression',
    description: `total fte cvar entities in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} cvars (in range)` : `${n} cvars — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteEngineCvars(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.engine_cvars', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`
    SELECT COUNT(*) AS n FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='engine'
  `).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [1187, 1606];
  return {
    name: 'F1.fte.engine_cvars',
    family: 'regression',
    description: `fte cvar_versions rows with source_root='engine' in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} engine cvar rows (in range)` : `${n} engine cvar rows — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFtePluginEzhudCvars(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.plugin_ezhud_cvars', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`
    SELECT COUNT(*) AS n FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='plugin:ezhud'
  `).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [900, 1250];
  return {
    name: 'F1.fte.plugin_ezhud_cvars',
    family: 'regression',
    description: `fte cvar_versions rows with source_root='plugin:ezhud' in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} plugin:ezhud cvar rows (in range)` : `${n} plugin:ezhud cvar rows — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteCommandsCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.commands_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='command'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [470, 650];
  return {
    name: 'F1.fte.commands_count',
    family: 'regression',
    description: `total fte command entities in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} commands (in range)` : `${n} commands — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteMacrosCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.macros_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='macro'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [55, 80];
  return {
    name: 'F1.fte.macros_count',
    family: 'regression',
    description: `total fte macro entities in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} macros (in range)` : `${n} macros — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteCmdlineCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.cmdline_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='cmdline_param'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [85, 120];
  return {
    name: 'F1.fte.cmdline_count',
    family: 'regression',
    description: `total fte cmdline_param entities in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} cmdline params (in range)` : `${n} cmdline params — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// FTE Family 2 — Anomaly probes
// ---------------------------------------------------------------------------

// Guard: every fte cvar_versions row must have a non-NULL source_root.
// A NULL here means the loader failed to set the engine/plugin:ezhud tag.
function probeFteNoNullSourceRootCvars(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.no_null_source_root_cvars', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT e.name, cv.version FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root IS NULL
    LIMIT 10
  `).all() as { name: string; version: string }[];
  return {
    name: 'F2.fte.no_null_source_root_cvars',
    family: 'anomaly',
    description: 'fte cvar_versions rows with NULL source_root — loader failed to tag engine/plugin split',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte cvar rows have source_root' : `${rows.length} rows with NULL source_root`,
    examples: rows.map(r => `${r.name}@${r.version}`),
  };
}

// Guard: plugin:ezhud cvar rows must come from files under plugins/ezhud/.
// A mismatch means a non-ezhud file was incorrectly tagged as plugin:ezhud.
function probeFtePluginEzhudSourceFilePrefix(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.plugin_ezhud_source_file_prefix', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT e.name, cv.source_file FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='plugin:ezhud'
      AND cv.source_file IS NOT NULL
      AND cv.source_file NOT LIKE 'plugins/ezhud/%'
    LIMIT 10
  `).all() as { name: string; source_file: string }[];
  return {
    name: 'F2.fte.plugin_ezhud_source_file_prefix',
    family: 'anomaly',
    description: "plugin:ezhud cvar rows where source_file does not begin with plugins/ezhud/",
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all plugin:ezhud source files correctly prefixed' : `${rows.length} rows with wrong source_file prefix`,
    examples: rows.map(r => `${r.name} -> ${r.source_file}`),
  };
}

// Guard: engine-tagged cvar rows must not point at plugins/ source files.
// An engine row with a plugins/ path means the source_root tagging inverted.
function probeFteEngineNoPluginSourceFiles(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.engine_no_plugin_source_files', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT e.name, cv.source_file FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='engine'
      AND cv.source_file LIKE 'plugins/%'
    LIMIT 10
  `).all() as { name: string; source_file: string }[];
  return {
    name: 'F2.fte.engine_no_plugin_source_files',
    family: 'anomaly',
    description: "engine cvar rows where source_file begins with plugins/ — source_root crossover",
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'no engine rows point at plugin source files' : `${rows.length} engine rows with plugin source_file`,
    examples: rows.map(r => `${r.name} -> ${r.source_file}`),
  };
}

// Guard: no fte cvar should have an absurdly long flags_raw (>5 commas).
// Regression guard for the inflated-flags bug fixed in Task 14 — if flags_raw
// has >5 comma-separated tokens it almost certainly accumulated duplicates.
function probeFteNoInflatedFlags(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.no_inflated_flags', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT e.name, cv.flags_raw FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte'
      AND cv.flags_raw IS NOT NULL
      AND length(cv.flags_raw) - length(replace(cv.flags_raw, ',', '')) > 5
    LIMIT 10
  `).all() as { name: string; flags_raw: string }[];
  return {
    name: 'F2.fte.no_inflated_flags',
    family: 'anomaly',
    description: 'fte cvar_versions rows with >5 commas in flags_raw — regression guard for inflated-flags bug',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'no inflated flags_raw rows' : `${rows.length} rows with >5 commas in flags_raw`,
    examples: rows.map(r => `${r.name}: ${r.flags_raw}`),
  };
}

// ---------------------------------------------------------------------------
// FTE asset probes (Phase 2d-bundle) — F1 count + F2 anomaly
// ---------------------------------------------------------------------------

function probeFteAssetCategoriesCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_categories_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM entities WHERE project='fte' AND type='asset_category'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [25, 35];
  return {
    name: 'F1.fte.asset_categories_count',
    family: 'regression',
    description: `fte asset_category entities in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} asset_category entities (in range)` : `${n} asset_category entities — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteAssetExtensionsCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_extensions_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM asset_extensions WHERE project='fte'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [50, 100];
  return {
    name: 'F1.fte.asset_extensions_count',
    family: 'regression',
    description: `fte asset_extensions rows in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} asset_extensions (in range)` : `${n} asset_extensions — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteAssetPathRulesCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_path_rules_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM asset_path_rules WHERE project='fte'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [10, 20];
  return {
    name: 'F1.fte.asset_path_rules_count',
    family: 'regression',
    description: `fte asset_path_rules rows in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} asset_path_rules (in range)` : `${n} asset_path_rules — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteAssetCvarBindingsCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_cvar_bindings_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM asset_cvar_bindings WHERE project='fte'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [20, 50];
  return {
    name: 'F1.fte.asset_cvar_bindings_count',
    family: 'regression',
    description: `fte asset_cvar_bindings rows in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} asset_cvar_bindings (in range)` : `${n} asset_cvar_bindings — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

function probeFteAssetLoaderSitesCount(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_loader_sites_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`SELECT COUNT(*) AS n FROM asset_loader_sites WHERE project='fte'`).get() as { n: number };
  const n = row.n;
  const [lo, hi] = [600, 1200];
  return {
    name: 'F1.fte.asset_loader_sites_count',
    family: 'regression',
    description: `fte asset_loader_sites rows in range [${lo}, ${hi}]`,
    status: n >= lo && n <= hi ? 'PASS' : 'FAIL',
    count: n,
    summary: n >= lo && n <= hi ? `${n} asset_loader_sites (in range)` : `${n} asset_loader_sites — outside [${lo}, ${hi}]`,
    examples: [],
  };
}

// Guard: every fte loader site must have source_file set. A NULL means
// the handler emitted a row without a source location, which is malformed.
function probeFteLoaderSitesHaveSourceFile(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.loader_sites_have_source_file', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT canonical_id, function_name FROM asset_loader_sites
    WHERE project='fte' AND (source_file IS NULL OR source_file = '')
    LIMIT 10
  `).all() as { canonical_id: string; function_name: string }[];
  return {
    name: 'F2.fte.loader_sites_have_source_file',
    family: 'anomaly',
    description: 'fte asset_loader_sites rows with NULL/empty source_file',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte loader sites have source_file' : `${rows.length} loader sites missing source_file`,
    examples: rows.map(r => `${r.canonical_id} (fn=${r.function_name})`),
  };
}

// Guard: every fte path_rule must have source_verified=1. The verifier
// runs at every extract-tag and stamps source_verified=0 when a citation
// fails to resolve to a function-internal line.
function probeFtePathRulesAllVerified(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.path_rules_all_verified', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT canonical_id, source_ref FROM asset_path_rules
    WHERE project='fte' AND source_verified = 0
    LIMIT 10
  `).all() as { canonical_id: string; source_ref: string }[];
  return {
    name: 'F2.fte.path_rules_all_verified',
    family: 'anomaly',
    description: 'fte asset_path_rules rows with source_verified=0',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte path_rules verified' : `${rows.length} path_rules unverified`,
    examples: rows.map(r => `${r.canonical_id} -> ${r.source_ref}`),
  };
}

// Guard: every fte asset_cvar_bindings row must reference an existing
// cvar entity. A NULL join means the seed cited a stale cvar name.
function probeFteCvarBindingsResolve(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.cvar_bindings_resolve', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = ctx.db.prepare(`
    SELECT ab.cvar_canonical_id FROM asset_cvar_bindings ab
    LEFT JOIN entities e ON e.canonical_id = ab.cvar_canonical_id
    WHERE ab.project = 'fte' AND e.id IS NULL
    LIMIT 10
  `).all() as { cvar_canonical_id: string }[];
  return {
    name: 'F2.fte.cvar_bindings_resolve',
    family: 'anomaly',
    description: 'fte asset_cvar_bindings rows whose cvar does not resolve to an entities row',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte cvar_bindings resolve to a real cvar entity' : `${rows.length} stale cvar references`,
    examples: rows.map(r => r.cvar_canonical_id),
  };
}

// Guard: shader registrations are FTE-specific (no ezQuake counterpart) and
// the AST artifact at build-6698 surfaced 134 R_RegisterShader + 16 R_LoadShader
// = ~150 rows. Threshold conservatively at >=80 to catch a regression where
// the handler stops emitting shader sites entirely.
function probeFteShaderLoaderSitesPresent(ctx: ProbeContext): ProbeResult {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.shader_loader_sites_present', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const row = ctx.db.prepare(`
    SELECT COUNT(*) AS n FROM asset_loader_sites
    WHERE project='fte' AND function_name IN ('R_RegisterShader','R_LoadShader')
  `).get() as { n: number };
  const n = row.n;
  return {
    name: 'F2.fte.shader_loader_sites_present',
    family: 'anomaly',
    description: 'fte shader-registration loader sites must remain >=80 (regression guard)',
    status: n >= 80 ? 'CLEAN' : 'FOUND',
    count: n >= 80 ? 0 : 1,
    summary: n >= 80 ? `${n} shader-registration loader sites` : `only ${n} shader loader sites — expected >=80`,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// Registry + runner
// ---------------------------------------------------------------------------

const REGRESSION_PROBES: Probe[] = [
  { name: 'F1.first_seen_min_ordinal', family: 'regression', description: '', run: probeFirstSeenMinOrdinal },
  { name: 'F1.last_seen_max_ordinal', family: 'regression', description: '', run: probeLastSeenMaxOrdinal },
  { name: 'F1.head_ordinal_sentinel', family: 'regression', description: '', run: probeHeadOrdinalSentinel },
  { name: 'F1.cross_type_orphans', family: 'regression', description: '', run: probeCrossTypeOrphans },
  { name: 'F1.entity_has_version_rows', family: 'regression', description: '', run: probeEntityHasVersionRows },
  // FTE count-range probes
  { name: 'F1.fte.cvars_count', family: 'regression', description: '', run: probeFteCvarsCount },
  { name: 'F1.fte.engine_cvars', family: 'regression', description: '', run: probeFteEngineCvars },
  { name: 'F1.fte.plugin_ezhud_cvars', family: 'regression', description: '', run: probeFtePluginEzhudCvars },
  { name: 'F1.fte.commands_count', family: 'regression', description: '', run: probeFteCommandsCount },
  { name: 'F1.fte.macros_count', family: 'regression', description: '', run: probeFteMacrosCount },
  { name: 'F1.fte.cmdline_count', family: 'regression', description: '', run: probeFteCmdlineCount },
  // FTE asset count-range probes (Phase 2d-bundle)
  { name: 'F1.fte.asset_categories_count', family: 'regression', description: '', run: probeFteAssetCategoriesCount },
  { name: 'F1.fte.asset_extensions_count', family: 'regression', description: '', run: probeFteAssetExtensionsCount },
  { name: 'F1.fte.asset_path_rules_count', family: 'regression', description: '', run: probeFteAssetPathRulesCount },
  { name: 'F1.fte.asset_cvar_bindings_count', family: 'regression', description: '', run: probeFteAssetCvarBindingsCount },
  { name: 'F1.fte.asset_loader_sites_count', family: 'regression', description: '', run: probeFteAssetLoaderSitesCount },
];

const ANOMALY_PROBES: Probe[] = [
  { name: 'F2.flickering_presence', family: 'anomaly', description: '', run: probeFlickeringPresence },
  { name: 'F2.empty_body_density', family: 'anomaly', description: '', run: probeEmptyBodyDensity },
  { name: 'F2.source_backed_missing_citation', family: 'anomaly', description: '', run: probeSourceBackedMissingCitation },
  { name: 'F2.pair_symmetry', family: 'anomaly', description: '', run: probePairSymmetry },
  { name: 'F2.doc_only_crosstab', family: 'anomaly', description: '', run: probeDocOnlyCrosstab },
  { name: 'F2.default_value_ping_pong', family: 'anomaly', description: '', run: probeDefaultValuePingPong },
  // FTE source integrity probes
  { name: 'F2.fte.no_null_source_root_cvars', family: 'anomaly', description: '', run: probeFteNoNullSourceRootCvars },
  { name: 'F2.fte.plugin_ezhud_source_file_prefix', family: 'anomaly', description: '', run: probeFtePluginEzhudSourceFilePrefix },
  { name: 'F2.fte.engine_no_plugin_source_files', family: 'anomaly', description: '', run: probeFteEngineNoPluginSourceFiles },
  { name: 'F2.fte.no_inflated_flags', family: 'anomaly', description: '', run: probeFteNoInflatedFlags },
  // FTE asset anomaly probes (Phase 2d-bundle)
  { name: 'F2.fte.loader_sites_have_source_file', family: 'anomaly', description: '', run: probeFteLoaderSitesHaveSourceFile },
  { name: 'F2.fte.path_rules_all_verified', family: 'anomaly', description: '', run: probeFtePathRulesAllVerified },
  { name: 'F2.fte.cvar_bindings_resolve', family: 'anomaly', description: '', run: probeFteCvarBindingsResolve },
  { name: 'F2.fte.shader_loader_sites_present', family: 'anomaly', description: '', run: probeFteShaderLoaderSitesPresent },
];

export interface QualityGridOptions {
  db: Database.Database;
  project: Project;
  family?: 'regression' | 'anomaly' | 'both';
  probeFilter?: string;
}

export function runQualityGrid(options: QualityGridOptions): ProbeResult[] {
  const family = options.family ?? 'both';
  const probes: Probe[] = [];
  if (family === 'regression' || family === 'both') probes.push(...REGRESSION_PROBES);
  if (family === 'anomaly' || family === 'both') probes.push(...ANOMALY_PROBES);
  const filtered = options.probeFilter
    ? probes.filter(p => p.name === options.probeFilter)
    : probes;
  const results: ProbeResult[] = [];
  for (const probe of filtered) {
    try {
      const r = probe.run({ db: options.db, project: options.project });
      results.push(r);
    } catch (err) {
      results.push({
        name: probe.name,
        family: probe.family,
        description: probe.description,
        status: 'ERROR',
        count: 0,
        summary: err instanceof Error ? err.message : String(err),
        examples: [],
        error: err instanceof Error ? err.stack : String(err),
      });
    }
  }
  return results;
}

export function listProbes(): { name: string; family: ProbeFamily }[] {
  return [...REGRESSION_PROBES, ...ANOMALY_PROBES].map(p => ({ name: p.name, family: p.family }));
}

export function formatGridText(results: ProbeResult[]): string {
  const lines: string[] = [];
  const fams: ProbeFamily[] = ['regression', 'anomaly'];
  for (const fam of fams) {
    const fr = results.filter(r => r.family === fam);
    if (fr.length === 0) continue;
    lines.push(`== ${fam} probes (${fr.length}) ==`);
    for (const r of fr) {
      const tag = r.status === 'PASS' || r.status === 'CLEAN'
        ? `[${r.status}]`
        : `[${r.status}${r.count ? ` ${r.count}` : ''}]`;
      lines.push(`${tag} ${r.name} — ${r.summary}`);
      for (const ex of r.examples) lines.push(`    ${ex}`);
    }
    lines.push('');
  }
  const failures = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
  const findings = results.filter(r => r.status === 'FOUND').length;
  lines.push(
    `Summary: ${results.length} probes run; ` +
    `${results.filter(r => r.status === 'PASS' || r.status === 'CLEAN').length} clean, ` +
    `${failures} regression failures, ${findings} anomalies surfaced.`,
  );
  return lines.join('\n');
}
