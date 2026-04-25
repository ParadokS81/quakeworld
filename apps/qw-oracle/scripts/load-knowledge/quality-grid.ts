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
      WHERE e.project=? AND e.type=?
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
// Registry + runner
// ---------------------------------------------------------------------------

const REGRESSION_PROBES: Probe[] = [
  { name: 'F1.first_seen_min_ordinal', family: 'regression', description: '', run: probeFirstSeenMinOrdinal },
  { name: 'F1.last_seen_max_ordinal', family: 'regression', description: '', run: probeLastSeenMaxOrdinal },
  { name: 'F1.head_ordinal_sentinel', family: 'regression', description: '', run: probeHeadOrdinalSentinel },
  { name: 'F1.cross_type_orphans', family: 'regression', description: '', run: probeCrossTypeOrphans },
  { name: 'F1.entity_has_version_rows', family: 'regression', description: '', run: probeEntityHasVersionRows },
];

const ANOMALY_PROBES: Probe[] = [
  { name: 'F2.flickering_presence', family: 'anomaly', description: '', run: probeFlickeringPresence },
  { name: 'F2.empty_body_density', family: 'anomaly', description: '', run: probeEmptyBodyDensity },
  { name: 'F2.source_backed_missing_citation', family: 'anomaly', description: '', run: probeSourceBackedMissingCitation },
  { name: 'F2.pair_symmetry', family: 'anomaly', description: '', run: probePairSymmetry },
  { name: 'F2.doc_only_crosstab', family: 'anomaly', description: '', run: probeDocOnlyCrosstab },
  { name: 'F2.default_value_ping_pong', family: 'anomaly', description: '', run: probeDefaultValuePingPong },
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
