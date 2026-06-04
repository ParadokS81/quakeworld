// apps/qw-oracle/scripts/load-knowledge/quality-grid.ts
//
// Read-only Layer 1 quality grid. Two probe families:
//
//   Family 1 (regression) -- pinned invariants that must always hold. Each
//   PASS/FAIL is unambiguous; a FAIL means a fix shipped earlier has been
//   reintroduced or a new tag has the same shape as a known-bad pattern.
//
//   Family 2 (anomaly) -- open-ended consistency checks. They surface things
//   worth a human look. Most output is "fine, ignore" -- value is in the rare
//   hits. Each anomaly classifies as a new bug class drives a follow-up
//   regression probe (Family 1 promotion).
//
// Adding a probe: write a function returning ProbeResult, register it in
// REGRESSION_PROBES or ANOMALY_PROBES. Probes are pure read-only SQL -- no
// schema changes, no DB writes, no side effects. The runner is best-effort:
// a probe that throws is reported as ERROR, the rest still run.
//
// Run: npm run load-knowledge -- quality-grid [--project <p>] [--family regression|anomaly|both] [--probe <name>] [--json]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type postgres from 'postgres';
import { HEAD_ORDINAL } from './constants.js';
import type { AcceptanceValidationRecord, Project } from './types.js';

// enforce-L1-runtime-truth Phase 4 / Task 4 -- the SHIPPED acceptance
// validation record (written by extractor_lib._acceptance.run_stage1). The
// F1.runtime_fidelity_shape probe reads its `validation_commit` to enforce
// the level-3-pinned-only assertion (Phase 3 deferred it to Phase 4).
const QG_DIR = dirname(fileURLToPath(import.meta.url));
// scripts/load-knowledge/ -> scripts/ -> qw-oracle/ ; then data/detection/.
const DETECTION_DIR = join(QG_DIR, '..', '..', 'data', 'detection');

// Prefix-tolerant (case-insensitive) commit agreement -- the SAME mechanic
// _acceptance.validation_record_ok documents (F7 self-certifies via a short
// prefix): the validation record holds the SHORT pin token while oracle_meta
// holds the FULL 40-char hash. True iff either string is a prefix of the
// other. Empty inputs -> false.
function pinsAgree(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.startsWith(y) || y.startsWith(x);
}

// Read the SHIPPED acceptance validation record's commit IFF status==GREEN.
// Returns the SHORT validation_commit token, or null when the record is
// absent / not GREEN / unreadable. A null here means "no validated pin" ->
// the probe treats ANY dump-confirmed row as an offender (level-3 may not
// exist without a GREEN validated pin -- D18/D19/D22).
function readValidatedCommit(fork: string): string | null {
  try {
    const recordPath = join(DETECTION_DIR, `acceptance-validated-${fork}.json`);
    if (!existsSync(recordPath)) return null;
    const record = JSON.parse(
      readFileSync(recordPath, 'utf-8'),
    ) as AcceptanceValidationRecord;
    if (record.status !== 'GREEN') return null;
    return record.validation_commit ?? null;
  } catch {
    return null;
  }
}

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
  sql: postgres.Sql;
  project: Project;
}

export interface Probe {
  name: string;
  family: ProbeFamily;
  description: string;
  run(ctx: ProbeContext): Promise<ProbeResult>;
}

// ---------------------------------------------------------------------------
// Family 1 -- Regression probes
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
async function probeFirstSeenMinOrdinal(ctx: ProbeContext): Promise<ProbeResult> {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = await ctx.sql<{ name: string; recorded: string; expected: string }[]>`
      SELECT e.name,
             e.first_seen_version AS recorded,
             (SELECT v.version FROM versions v
              JOIN ${ctx.sql(versionTable)} xv ON xv.version=v.version AND v.project=e.project
              WHERE xv.entity_id=e.id ORDER BY v.ordinal ASC LIMIT 1) AS expected
      FROM entities e
      WHERE e.project=${ctx.project} AND e.type=${type}
        AND EXISTS (SELECT 1 FROM ${ctx.sql(versionTable)} xv WHERE xv.entity_id=e.id)
    `;
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
async function probeLastSeenMaxOrdinal(ctx: ProbeContext): Promise<ProbeResult> {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = await ctx.sql<{ name: string; recorded: string; expected: string }[]>`
      SELECT e.name,
             e.last_seen_version AS recorded,
             (SELECT v.version FROM versions v
              JOIN ${ctx.sql(versionTable)} xv ON xv.version=v.version AND v.project=e.project
              WHERE xv.entity_id=e.id ORDER BY v.ordinal DESC LIMIT 1) AS expected
      FROM entities e
      WHERE e.project=${ctx.project} AND e.type=${type}
        AND EXISTS (SELECT 1 FROM ${ctx.sql(versionTable)} xv WHERE xv.entity_id=e.id)
    `;
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
async function probeHeadOrdinalSentinel(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ version: string; ordinal: number }[]>`
    SELECT version, ordinal FROM versions
    WHERE project=${ctx.project} AND version='head' AND ordinal != ${HEAD_ORDINAL}
  `;
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
async function probeCrossTypeOrphans(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ doc_type: string; name: string; source_type: string }[]>`
    SELECT a.type AS doc_type, a.name, b.type AS source_type
    FROM entities a
    JOIN entities b ON b.project=a.project AND b.name=a.name AND b.type != a.type
    WHERE a.project=${ctx.project} AND a.source_state='doc_only' AND b.source_state='source_backed'
    ORDER BY a.name
  `;
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
async function probeEntityHasVersionRows(ctx: ProbeContext): Promise<ProbeResult> {
  const examples: string[] = [];
  let total = 0;
  for (const [type, versionTable] of Object.entries(PER_TYPE_VERSION_TABLE)) {
    const rows = await ctx.sql<{ name: string }[]>`
      SELECT e.name FROM entities e
      WHERE e.project=${ctx.project} AND e.type=${type}
        AND NOT EXISTS (SELECT 1 FROM ${ctx.sql(versionTable)} xv WHERE xv.entity_id=e.id)
    `;
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

// JSONB-shape regression: every JSONB column intended to hold an array or
// object must NOT contain a JSONB string scalar. Pre-fix loaders called
// JSON.stringify before binding to JSONB params; postgres-js then JSON-encoded
// the string a second time, storing a JSONB string-of-JSON instead of the
// intended structure. Failure here means a loader regressed to the legacy
// SQLite-era TEXT-with-stringify pattern. The probe runs cross-project on a
// single anchor (ezquake) so it doesn't quadruple-count when invoked per
// project; other-project runs no-op. Phase 7 (KTX onboarding) extends the
// target list with match_event_versions.{attributes_json,emission_call_sites_json}
// + gameplay_{mechanics,entity_defs}.props_json (D14 + F21).
export async function probeJsonbNotStrings(ctx: ProbeContext): Promise<ProbeResult> {
  // Phase 2 is first to write entities.description_provenance JSONB at volume
  // for ktx; this branch is the C5/F-C5a regression gate for that column.
  // Phase 4 (MVDSV describe-fill) extends it to mvdsv -- the first phase to
  // write mvdsv entities.description_provenance JSONB (C5: the probe lands in
  // the phase that first writes the shape at that project; the pm_* movement
  // batch is the first MVDSV describe-fill batch, cold-synth rows carry NULL
  // provenance so this is vacuously green until a shipped_doc batch writes a
  // real array -- the gate is in place for that batch). Same fail-if-string-
  // scalar semantics as ktx; ezQuake branch (below) unchanged.
  if (ctx.project === 'ktx' || ctx.project === 'mvdsv') {
    const rows = await ctx.sql<{ canonical_id: string }[]>`
      SELECT canonical_id
      FROM entities
      WHERE project = ${ctx.project}
        AND description_provenance IS NOT NULL
        AND jsonb_typeof(description_provenance) = 'string'
      ORDER BY canonical_id
      LIMIT 8
    `;
    const countRows = await ctx.sql<{ cnt: number }[]>`
      SELECT COUNT(*)::int AS cnt
      FROM entities
      WHERE project = ${ctx.project}
        AND description_provenance IS NOT NULL
        AND jsonb_typeof(description_provenance) = 'string'
    `;
    const total = countRows[0]?.cnt ?? 0;
    return {
      name: 'F1.jsonb_columns_not_strings',
      family: 'regression',
      description: 'JSONB array/object columns are not JSONB string scalars (loader bug regression gate)',
      status: total === 0 ? 'PASS' : 'FAIL',
      count: total,
      summary: total === 0
        ? `no JSONB string scalars in entities.description_provenance for ${ctx.project}`
        : `${total} JSONB string scalar(s) in entities.description_provenance for ${ctx.project}`,
      examples: rows.map(r => r.canonical_id),
    };
  }

  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.jsonb_columns_not_strings',
      family: 'regression',
      description: 'JSONB array/object columns are not JSONB string scalars (loader bug regression gate)',
      status: 'PASS',
      count: 0,
      summary: 'cross-project probe; only runs under --project ezquake',
      examples: [],
    };
  }
  const targets: Array<{ table: string; column: string }> = [
    { table: 'macro_versions', column: 'related_cvars_json' },
    { table: 'cmdline_param_versions', column: 'flags_json' },
    { table: 'cmdline_param_versions', column: 'systems_json' },
    { table: 'ruleset_versions', column: 'locked_cvars_json' },
    { table: 'hud_element_versions', column: 'owned_cvars_json' },
    { table: 'info_key_versions', column: 'call_sites_json' },
    { table: 'log_template_versions', column: 'all_call_sites_json' },
    { table: 'release_notes', column: 'referenced_entity_ids_json' },
    { table: 'release_notes', column: 'commit_urls_json' },
    { table: 'release_notes', column: 'pr_numbers_json' },
    { table: 'release_notes', column: 'author_handles_json' },
    { table: 'gameplay_entity_defs', column: 'ruleset_gate_json' },
    { table: 'gameplay_mechanics', column: 'ruleset_gate_json' },
    { table: 'match_event_versions', column: 'attributes_json' },
    { table: 'match_event_versions', column: 'emission_call_sites_json' },
    { table: 'gameplay_mechanics', column: 'props_json' },
    { table: 'gameplay_entity_defs', column: 'props_json' },
    // arc: enforce-L1-runtime-truth -- Track A/B reachability columns (R2 gate extension)
    { table: 'cvar_versions',    column: 'track_a_reachability' },
    { table: 'command_versions', column: 'track_a_reachability' },
    { table: 'command_versions', column: 'track_b_hud_recovery' },
  ];
  const examples: string[] = [];
  let total = 0;
  for (const t of targets) {
    const rows = await ctx.sql<{ cnt: number }[]>`
      SELECT COUNT(*)::int AS cnt
      FROM ${ctx.sql(t.table)}
      WHERE ${ctx.sql(t.column)} IS NOT NULL
        AND jsonb_typeof(${ctx.sql(t.column)}) = 'string'
    `;
    const cnt = rows[0]?.cnt ?? 0;
    if (cnt > 0) {
      total += cnt;
      examples.push(`${t.table}.${t.column}: ${cnt} rows`);
    }
  }
  return {
    name: 'F1.jsonb_columns_not_strings',
    family: 'regression',
    description: 'JSONB array/object columns are not JSONB string scalars (loader bug regression gate)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0 ? 'no JSONB string scalars in array/object columns' : `${total} JSONB string scalars detected`,
    examples,
  };
}

// arc: enforce-L1-runtime-truth -- structural shape probe for Track A/B reachability
// columns (F1.runtime_fidelity_shape).
//
// Asserts the D14 three-slot spine ({conclusion, evidence, dump_confirmation}) is
// intact and that each feeder-specific sub-shape is well-formed. Also enforces the
// D12 no-cross-track-blend rule: a track_a_reachability value must not carry
// Track-B keys (hud_element / hud_family) in its evidence, and a track_b_hud_recovery
// value must not carry Track-A keys (feeder / per_variant). A single column value
// carrying BOTH shapes is also an offender.
//
// Scoped to --project ezquake (mirrors probeJsonbNotStrings; other-project runs
// no-op). dump-confirmed is a VALID dump_confirmation value -- this probe asserts
// shape only; the "Phase 3 never writes dump-confirmed" invariant is a separate
// phase-boundary SQL check (X2/W4) and is NOT enforced here.
//
// NULL-safety: the IS NULL OR ... NOT IN form is mandatory throughout so that a
// NULL lhs (e.g. evidence->>'feeder' on a malformed row) yields TRUE (offender)
// rather than NULL (silently ignored). See probeDescribeFillOriginVocabulary for
// the established NULL-safety idiom (F-C5b root cause pattern).
export async function probeRuntimeFidelityShape(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.runtime_fidelity_shape',
      family: 'regression',
      description: 'Track A/B reachability columns hold a well-formed D14 three-slot spine (enforce-L1 R2 + D12 no-blend)',
      status: 'PASS',
      count: 0,
      summary: 'ezquake-scoped probe; skipped for other projects',
      examples: [],
    };
  }

  // -- Track A offenders (cvar_versions + command_versions where track_a_reachability IS NOT NULL) --
  //
  // A row is an offender if ANY of:
  //   - top-level key-set != exactly {conclusion, evidence, dump_confirmation}
  //   - conclusion not in the 2-value enum
  //   - evidence->>'feeder' not in the 2-value enum (NULL-safe: treat NULL as offender)
  //   - feeder='callgraph' and per_variant sub-shape is malformed
  //   - feeder='commented-register' and register_site sub-shape is malformed
  //   - dump_confirmation not in the 2-value enum (NULL-safe)
  //
  // Cross-track blend guard (D12): a track_a_reachability whose evidence carries
  // hud_element or hud_family (Track-B keys) is an offender.
  //
  // Key count uses (SELECT count(*)::int FROM jsonb_object_keys(val)) -- there is no
  // built-in jsonb_object_keys_as_array() in Postgres 16.
  // Union across cvar_versions and command_versions; examples are canonical_ids.
  const trackARows = await ctx.sql<{ canonical_id: string }[]>`
    WITH a_rows AS (
      SELECT e.canonical_id,
             cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake'
        AND cv.track_a_reachability IS NOT NULL
      UNION ALL
      SELECT e.canonical_id,
             cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake'
        AND cmv.track_a_reachability IS NOT NULL
    )
    SELECT canonical_id
    FROM a_rows
    WHERE
      -- top-level spine check: must have exactly the three expected keys
      NOT (
        (col ? 'conclusion') AND (col ? 'evidence') AND (col ? 'dump_confirmation')
        AND (SELECT count(*)::int FROM jsonb_object_keys(col)) = 3
      )
      -- conclusion enum (NULL-safe: IS NULL OR NOT IN)
      OR col->>'conclusion' IS NULL
      OR col->>'conclusion' NOT IN ('genuine-dead', 'build-excluded')
      -- feeder enum (NULL-safe)
      OR col->'evidence'->>'feeder' IS NULL
      OR col->'evidence'->>'feeder' NOT IN ('callgraph', 'commented-register')
      -- callgraph sub-shape: per_variant must exist with exactly 4 keys, each in enum;
      -- address_taken_residue must be a boolean
      OR (
        col->'evidence'->>'feeder' = 'callgraph'
        AND (
          NOT (col->'evidence' ? 'per_variant')
          OR NOT (
            (col->'evidence'->'per_variant' ? 'client')
            AND (col->'evidence'->'per_variant' ? 'server')
            AND (col->'evidence'->'per_variant' ? 'win')
            AND (col->'evidence'->'per_variant' ? 'apple')
            AND (SELECT count(*)::int FROM jsonb_object_keys(col->'evidence'->'per_variant')) = 4
          )
          OR col->'evidence'->'per_variant'->>'client' IS NULL
          OR col->'evidence'->'per_variant'->>'client' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'server' IS NULL
          OR col->'evidence'->'per_variant'->>'server' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'win' IS NULL
          OR col->'evidence'->'per_variant'->>'win' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'apple' IS NULL
          OR col->'evidence'->'per_variant'->>'apple' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR jsonb_typeof(col->'evidence'->'address_taken_residue') <> 'boolean'
        )
      )
      -- commented-register sub-shape: register_site must exist with source_file (non-empty) and source_line (number)
      OR (
        col->'evidence'->>'feeder' = 'commented-register'
        AND (
          NOT (col->'evidence' ? 'register_site')
          OR (col->'evidence'->'register_site'->>'source_file') IS NULL
          OR (col->'evidence'->'register_site'->>'source_file') = ''
          OR jsonb_typeof(col->'evidence'->'register_site'->'source_line') <> 'number'
        )
      )
      -- dump_confirmation enum (NULL-safe)
      OR col->>'dump_confirmation' IS NULL
      OR col->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      -- D12 cross-track blend guard: track_a_reachability must NOT carry Track-B evidence keys
      OR (col->'evidence' ? 'hud_element')
      OR (col->'evidence' ? 'hud_family')
    ORDER BY canonical_id
    LIMIT 8
  `;

  const trackACountRows = await ctx.sql<{ cnt: number }[]>`
    WITH a_rows AS (
      SELECT e.canonical_id,
             cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake'
        AND cv.track_a_reachability IS NOT NULL
      UNION ALL
      SELECT e.canonical_id,
             cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake'
        AND cmv.track_a_reachability IS NOT NULL
    )
    SELECT COUNT(*)::int AS cnt
    FROM a_rows
    WHERE
      NOT (
        (col ? 'conclusion') AND (col ? 'evidence') AND (col ? 'dump_confirmation')
        AND (SELECT count(*)::int FROM jsonb_object_keys(col)) = 3
      )
      OR col->>'conclusion' IS NULL
      OR col->>'conclusion' NOT IN ('genuine-dead', 'build-excluded')
      OR col->'evidence'->>'feeder' IS NULL
      OR col->'evidence'->>'feeder' NOT IN ('callgraph', 'commented-register')
      OR (
        col->'evidence'->>'feeder' = 'callgraph'
        AND (
          NOT (col->'evidence' ? 'per_variant')
          OR NOT (
            (col->'evidence'->'per_variant' ? 'client')
            AND (col->'evidence'->'per_variant' ? 'server')
            AND (col->'evidence'->'per_variant' ? 'win')
            AND (col->'evidence'->'per_variant' ? 'apple')
            AND (SELECT count(*)::int FROM jsonb_object_keys(col->'evidence'->'per_variant')) = 4
          )
          OR col->'evidence'->'per_variant'->>'client' IS NULL
          OR col->'evidence'->'per_variant'->>'client' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'server' IS NULL
          OR col->'evidence'->'per_variant'->>'server' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'win' IS NULL
          OR col->'evidence'->'per_variant'->>'win' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR col->'evidence'->'per_variant'->>'apple' IS NULL
          OR col->'evidence'->'per_variant'->>'apple' NOT IN ('reachable', 'unreachable', 'not-compiled')
          OR jsonb_typeof(col->'evidence'->'address_taken_residue') <> 'boolean'
        )
      )
      OR (
        col->'evidence'->>'feeder' = 'commented-register'
        AND (
          NOT (col->'evidence' ? 'register_site')
          OR (col->'evidence'->'register_site'->>'source_file') IS NULL
          OR (col->'evidence'->'register_site'->>'source_file') = ''
          OR jsonb_typeof(col->'evidence'->'register_site'->'source_line') <> 'number'
        )
      )
      OR col->>'dump_confirmation' IS NULL
      OR col->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      OR (col->'evidence' ? 'hud_element')
      OR (col->'evidence' ? 'hud_family')
  `;
  const trackATotal = trackACountRows[0]?.cnt ?? 0;

  // -- Track B offenders (command_versions where track_b_hud_recovery IS NOT NULL) --
  //
  // A row is an offender if ANY of:
  //   - top-level key-set != exactly {conclusion, evidence, dump_confirmation}
  //   - conclusion not in the 2-value enum
  //   - evidence->>'hud_element' is NULL or empty
  //   - evidence->>'hud_family' not in the 3-value enum (NULL-safe)
  //   - dump_confirmation not in the 2-value enum (NULL-safe)
  //
  // D12 cross-track blend guard: a track_b_hud_recovery value must NOT carry
  // Track-A keys (feeder / per_variant) in its evidence.
  const trackBRows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT e.canonical_id
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND (
        -- spine check
        NOT (
          (cmv.track_b_hud_recovery ? 'conclusion')
          AND (cmv.track_b_hud_recovery ? 'evidence')
          AND (cmv.track_b_hud_recovery ? 'dump_confirmation')
          AND (SELECT count(*)::int FROM jsonb_object_keys(cmv.track_b_hud_recovery)) = 3
        )
        -- conclusion enum (NULL-safe)
        OR cmv.track_b_hud_recovery->>'conclusion' IS NULL
        OR cmv.track_b_hud_recovery->>'conclusion' NOT IN ('bare-command', 'plus-minus-pair')
        -- hud_element: must be non-NULL and non-empty
        OR (cmv.track_b_hud_recovery->'evidence'->>'hud_element') IS NULL
        OR (cmv.track_b_hud_recovery->'evidence'->>'hud_element') = ''
        -- hud_family enum (NULL-safe)
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_family' IS NULL
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_family' NOT IN ('bare', 'plus', 'minus')
        -- dump_confirmation enum (NULL-safe)
        OR cmv.track_b_hud_recovery->>'dump_confirmation' IS NULL
        OR cmv.track_b_hud_recovery->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
        -- D12 blend guard: must NOT carry Track-A evidence keys
        OR (cmv.track_b_hud_recovery->'evidence' ? 'feeder')
        OR (cmv.track_b_hud_recovery->'evidence' ? 'per_variant')
      )
    ORDER BY e.canonical_id
    LIMIT 8
  `;

  const trackBCountRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND (
        NOT (
          (cmv.track_b_hud_recovery ? 'conclusion')
          AND (cmv.track_b_hud_recovery ? 'evidence')
          AND (cmv.track_b_hud_recovery ? 'dump_confirmation')
          AND (SELECT count(*)::int FROM jsonb_object_keys(cmv.track_b_hud_recovery)) = 3
        )
        OR cmv.track_b_hud_recovery->>'conclusion' IS NULL
        OR cmv.track_b_hud_recovery->>'conclusion' NOT IN ('bare-command', 'plus-minus-pair')
        OR (cmv.track_b_hud_recovery->'evidence'->>'hud_element') IS NULL
        OR (cmv.track_b_hud_recovery->'evidence'->>'hud_element') = ''
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_family' IS NULL
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_family' NOT IN ('bare', 'plus', 'minus')
        OR cmv.track_b_hud_recovery->>'dump_confirmation' IS NULL
        OR cmv.track_b_hud_recovery->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
        OR (cmv.track_b_hud_recovery->'evidence' ? 'feeder')
        OR (cmv.track_b_hud_recovery->'evidence' ? 'per_variant')
      )
  `;
  const trackBTotal = trackBCountRows[0]?.cnt ?? 0;

  // -- LEVEL-3-PINNED-ONLY assertion (enforce-L1 Phase 4 / Task 4) --
  //
  // Phase 3 explicitly DEFERRED this leg to Phase 4 (the probe asserted
  // shape only -- 'dump-confirmed' was a VALID value with no version
  // constraint). Phase 4 binds it: a row whose dump_confirmation is
  // 'dump-confirmed' (level-3, autonomously consumed) is well-formed ONLY
  // when its version IS the pinned-dump commit recorded in the SHIPPED
  // acceptance-validated-ezquake.json. A 'dump-confirmed' row at any
  // non-pinned version FAILS the probe (an autonomous delete-list verdict
  // that does not trace to a GREEN validated pin is version-noise -- D19).
  //
  // Pin resolution (prefix-tolerant, the _acceptance.validation_record_ok
  // mechanic -- F7 self-certifies via a short prefix): the SHIPPED record
  // holds the SHORT validation_commit token; oracle_meta holds the FULL
  // 40-char ezquake:source_repo_commit. The pinned-dump VERSION is 'head'
  // (extractor_lib._acceptance.PINNED_DUMP_VERSION -- every Phase-3/4
  // ezQuake reachability row sits at version='head', and that is what the
  // pin certifies). `pinnedOk` is true iff a GREEN record exists AND its
  // commit prefix-agrees with the current oracle_meta pin. When
  // `pinnedOk` is false (no GREEN validated pin) EVERY 'dump-confirmed'
  // row is an offender; when true, only those at a version other than the
  // pinned-dump version. Pure read-only SQL + the validation-record pin.
  const PINNED_DUMP_VERSION = 'head';
  const validatedCommit = readValidatedCommit('ezquake');
  const pinRows = await ctx.sql<{ value: string }[]>`
    SELECT value FROM oracle_meta WHERE key = 'ezquake:source_repo_commit'
  `;
  const currentPin = pinRows.length > 0 ? pinRows[0]!.value : null;
  const pinnedOk = pinsAgree(validatedCommit, currentPin);

  // Track-A level-3 rows (cvar_versions + command_versions) that violate
  // the pinned-only rule. NOT (pinned-version AND pinnedOk) == offender.
  const lvl3ARows = await ctx.sql<{ canonical_id: string }[]>`
    WITH a3 AS (
      SELECT e.canonical_id, cv.version AS v, cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake' AND cv.track_a_reachability IS NOT NULL
      UNION ALL
      SELECT e.canonical_id, cmv.version AS v, cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake' AND cmv.track_a_reachability IS NOT NULL
    )
    SELECT canonical_id
    FROM a3
    WHERE col->>'dump_confirmation' = 'dump-confirmed'
      AND NOT (${pinnedOk} AND v = ${PINNED_DUMP_VERSION})
    ORDER BY canonical_id
    LIMIT 8
  `;
  const lvl3ACountRows = await ctx.sql<{ cnt: number }[]>`
    WITH a3 AS (
      SELECT cv.version AS v, cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake' AND cv.track_a_reachability IS NOT NULL
      UNION ALL
      SELECT cmv.version AS v, cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake' AND cmv.track_a_reachability IS NOT NULL
    )
    SELECT COUNT(*)::int AS cnt
    FROM a3
    WHERE col->>'dump_confirmation' = 'dump-confirmed'
      AND NOT (${pinnedOk} AND v = ${PINNED_DUMP_VERSION})
  `;
  const lvl3ATotal = lvl3ACountRows[0]?.cnt ?? 0;

  // Track-B level-3 rows (command_versions.track_b_hud_recovery) that
  // violate the pinned-only rule.
  const lvl3BRows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT e.canonical_id
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND cmv.track_b_hud_recovery->>'dump_confirmation' = 'dump-confirmed'
      AND NOT (${pinnedOk} AND cmv.version = ${PINNED_DUMP_VERSION})
    ORDER BY e.canonical_id
    LIMIT 8
  `;
  const lvl3BCountRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND cmv.track_b_hud_recovery->>'dump_confirmation' = 'dump-confirmed'
      AND NOT (${pinnedOk} AND cmv.version = ${PINNED_DUMP_VERSION})
  `;
  const lvl3BTotal = lvl3BCountRows[0]?.cnt ?? 0;
  const lvl3Total = lvl3ATotal + lvl3BTotal;

  const total = trackATotal + trackBTotal + lvl3Total;
  const examples: string[] = [
    ...trackARows.map(r => `track_a:${r.canonical_id}`),
    ...trackBRows.map(r => `track_b:${r.canonical_id}`),
    ...lvl3ARows.map(r => `lvl3_pin_a:${r.canonical_id}`),
    ...lvl3BRows.map(r => `lvl3_pin_b:${r.canonical_id}`),
  ].slice(0, 8);

  return {
    name: 'F1.runtime_fidelity_shape',
    family: 'regression',
    description: 'Track A/B reachability columns hold a well-formed D14 three-slot spine (enforce-L1 R2 + D12 no-blend) AND every dump-confirmed (level-3) row is at the pinned-dump commit (Phase-4 deferral)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all Track A/B reachability rows are well-formed and every level-3 row is pin-anchored'
      : `${total} offending row(s): shape Track A=${trackATotal}, Track B=${trackBTotal}; level-3-non-pinned=${lvl3Total}`,
    examples,
  };
}

// arc: ktx-categorize (2026-05-22) -- v19 / migration 016 XOR integrity gate.
//
// Every populated category_inferred must have a populated category_inferred_origin
// and vice versa, across cvar_versions and command_versions. Scoped to "all" rows
// (the XOR check is project-agnostic). Trivially passes when both columns are NULL
// (pre-fan-out). Promoted to a FAIL signal once the b6-categorize ledgers apply and
// every KTX row carries the pair.
async function probeCategoryInferredProvenanceIntegrity(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT e.canonical_id FROM cvar_versions cv
    JOIN entities e ON e.id = cv.entity_id
    WHERE (cv.category_inferred IS NULL) <> (cv.category_inferred_origin IS NULL)
    UNION ALL
    SELECT e.canonical_id FROM command_versions cm
    JOIN entities e ON e.id = cm.entity_id
    WHERE (cm.category_inferred IS NULL) <> (cm.category_inferred_origin IS NULL)
    ORDER BY canonical_id
    LIMIT 8
  `;
  const countRows = await ctx.sql<{ cnt: number }[]>`
    SELECT (
      (SELECT COUNT(*) FROM cvar_versions WHERE (category_inferred IS NULL) <> (category_inferred_origin IS NULL))
      + (SELECT COUNT(*) FROM command_versions WHERE (category_inferred IS NULL) <> (category_inferred_origin IS NULL))
    )::int AS cnt
  `;
  const total = countRows[0]?.cnt ?? 0;
  return {
    name: 'F1.category_inferred_provenance_integrity',
    family: 'regression',
    description: 'Every category_inferred has a matching category_inferred_origin and vice versa (XOR invariant) -- ktx-categorize v19 / migration 016',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'category_inferred and category_inferred_origin are populated together across cvar_versions + command_versions'
      : `${total} offending row(s) where one of the pair is populated but the sibling is NULL`,
    examples: rows.map(r => r.canonical_id),
  };
}

// arc: enforce-L1-runtime-truth Phase 5 / Task 3 -- Track-A signal-pool level discipline.
//
// Every banked Track-A row (cvar_versions + command_versions) at version='head' must
// carry a dump_confirmation value that is well-formed per the D13 two-level vocabulary:
//   - build-excluded -> permanently level-2 (high-confidence-generalized). D20 / Phase-4 OQ-3
//     forbids stamping build-excluded rows dump-confirmed; this probe enforces that gate.
//   - genuine-dead   -> level-2 or level-3 (dump-confirmed); dump-confirmed is only valid
//     when conclusion='genuine-dead' (the pool member was observed absent in the dump).
//
// Scoped to ezquake (all Track-A rows are ezquake; other-project runs no-op).
// Does NOT assert the raw pool count (X7/X2/W4) -- count is the phase-boundary sanity-gate.
export async function probeCallgraphSignalPoolCoverage(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.callgraph_signal_pool_coverage',
      family: 'regression',
      description: 'Track-A pool: every member has a valid D13 level; build-excluded is never dump-confirmed (enforce-L1 D20 / Phase-5)',
      status: 'PASS',
      count: 0,
      summary: 'ezquake-scoped probe; skipped for other projects',
      examples: [],
    };
  }

  // Offenders: any Track-A row at version='head' where either:
  //   (a) dump_confirmation is NULL or outside the two-value vocabulary, OR
  //   (b) conclusion='build-excluded' AND dump_confirmation='dump-confirmed' (D20 violation), OR
  //   (c) dump_confirmation='dump-confirmed' AND conclusion != 'genuine-dead' (level-3 on non-dead row).
  // NULL-safety: IS NULL OR NOT IN form so a NULL dump_confirmation surfaces as an offender.
  const offenderRows = await ctx.sql<{ canonical_id: string; reason: string }[]>`
    WITH pool AS (
      SELECT e.canonical_id,
             cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake'
        AND cv.track_a_reachability IS NOT NULL
        AND cv.version = 'head'
      UNION ALL
      SELECT e.canonical_id,
             cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake'
        AND cmv.track_a_reachability IS NOT NULL
        AND cmv.version = 'head'
    )
    SELECT canonical_id,
      CASE
        WHEN col->>'dump_confirmation' IS NULL
          OR col->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
          THEN 'null-or-garbage-level'
        WHEN col->>'conclusion' = 'build-excluded'
          AND col->>'dump_confirmation' = 'dump-confirmed'
          THEN 'build-excluded-stamped-dump-confirmed'
        WHEN col->>'dump_confirmation' = 'dump-confirmed'
          AND col->>'conclusion' != 'genuine-dead'
          THEN 'dump-confirmed-on-non-genuine-dead'
        ELSE 'ok'
      END AS reason
    FROM pool
    WHERE
      col->>'dump_confirmation' IS NULL
      OR col->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      OR (col->>'conclusion' = 'build-excluded' AND col->>'dump_confirmation' = 'dump-confirmed')
      OR (col->>'dump_confirmation' = 'dump-confirmed' AND col->>'conclusion' != 'genuine-dead')
    ORDER BY canonical_id
    LIMIT 8
  `;

  const countRows = await ctx.sql<{ cnt: number }[]>`
    WITH pool AS (
      SELECT cv.track_a_reachability AS col
      FROM cvar_versions cv
      JOIN entities e ON e.id = cv.entity_id
      WHERE e.project = 'ezquake'
        AND cv.track_a_reachability IS NOT NULL
        AND cv.version = 'head'
      UNION ALL
      SELECT cmv.track_a_reachability AS col
      FROM command_versions cmv
      JOIN entities e ON e.id = cmv.entity_id
      WHERE e.project = 'ezquake'
        AND cmv.track_a_reachability IS NOT NULL
        AND cmv.version = 'head'
    )
    SELECT COUNT(*)::int AS cnt
    FROM pool
    WHERE
      col->>'dump_confirmation' IS NULL
      OR col->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      OR (col->>'conclusion' = 'build-excluded' AND col->>'dump_confirmation' = 'dump-confirmed')
      OR (col->>'dump_confirmation' = 'dump-confirmed' AND col->>'conclusion' != 'genuine-dead')
  `;
  const total = countRows[0]?.cnt ?? 0;

  return {
    name: 'F1.callgraph_signal_pool_coverage',
    family: 'regression',
    description: 'Track-A pool: every member has a valid D13 level; build-excluded is never dump-confirmed (enforce-L1 D20 / Phase-5)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all Track-A pool members have a well-formed D13 level; no D20 violation'
      : `${total} offending row(s): ${offenderRows.map(r => `${r.canonical_id}(${r.reason})`).join(', ')}`,
    examples: offenderRows.map(r => `${r.canonical_id}(${r.reason})`),
  };
}

// arc: enforce-L1-runtime-truth Phase 5 / Task 3 -- Track-B HUD recovery first-class gate.
//
// Every row that carries track_b_hud_recovery (the HUD-command recovery signal, Track B)
// must be a first-class entity: type='command', source_state='source_backed', non-empty
// evidence.hud_element, and a non-NULL dump_confirmation (D21: nothing withheld -- even a
// level-2 recovered command must carry a level). The D21 "nothing withheld" principle means
// NULL dump_confirmation is never acceptable for a recovered HUD command.
//
// Structural guard (D11/R7): cvar_versions does NOT have a track_b_hud_recovery column
// (the column exists only on command_versions). This probe asserts that invariant via
// information_schema so a schema drift (column accidentally added to cvar_versions) surfaces
// immediately.
//
// Scoped to ezquake.
export async function probeHudRecoveryFirstClass(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'ezquake') {
    return {
      name: 'F1.hud_recovery_first_class',
      family: 'regression',
      description: 'Every Track-B HUD recovery carrier is a first-class command/source_backed entity with non-NULL level (enforce-L1 D21 + D11/R7 / Phase-5)',
      status: 'PASS',
      count: 0,
      summary: 'ezquake-scoped probe; skipped for other projects',
      examples: [],
    };
  }

  // Structural check: track_b_hud_recovery must NOT exist on cvar_versions.
  // A count of 0 means the column is absent (correct); >0 means schema drift.
  const structRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cvar_versions'
      AND column_name = 'track_b_hud_recovery'
  `;
  const cvarColPresent = (structRows[0]?.cnt ?? 0) > 0;

  // Entity-shape offenders: command_versions rows where entity is not type='command'
  // or not source_state='source_backed', or evidence.hud_element is missing/empty,
  // or dump_confirmation is NULL or outside vocabulary.
  const offenderRows = await ctx.sql<{ canonical_id: string; reason: string }[]>`
    SELECT e.canonical_id,
      CASE
        WHEN e.type != 'command' THEN 'not-command-type'
        WHEN e.source_state != 'source_backed' THEN 'not-source-backed'
        WHEN cmv.track_b_hud_recovery->'evidence'->>'hud_element' IS NULL
          OR cmv.track_b_hud_recovery->'evidence'->>'hud_element' = ''
          THEN 'empty-hud-element'
        WHEN cmv.track_b_hud_recovery->>'dump_confirmation' IS NULL
          OR cmv.track_b_hud_recovery->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
          THEN 'null-or-garbage-dump-confirmation'
        ELSE 'ok'
      END AS reason
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND cmv.version = 'head'
      AND (
        e.type != 'command'
        OR e.source_state != 'source_backed'
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_element' IS NULL
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_element' = ''
        OR cmv.track_b_hud_recovery->>'dump_confirmation' IS NULL
        OR cmv.track_b_hud_recovery->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      )
    ORDER BY e.canonical_id
    LIMIT 8
  `;
  const countRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM command_versions cmv
    JOIN entities e ON e.id = cmv.entity_id
    WHERE e.project = 'ezquake'
      AND cmv.track_b_hud_recovery IS NOT NULL
      AND cmv.version = 'head'
      AND (
        e.type != 'command'
        OR e.source_state != 'source_backed'
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_element' IS NULL
        OR cmv.track_b_hud_recovery->'evidence'->>'hud_element' = ''
        OR cmv.track_b_hud_recovery->>'dump_confirmation' IS NULL
        OR cmv.track_b_hud_recovery->>'dump_confirmation' NOT IN ('high-confidence-generalized', 'dump-confirmed')
      )
  `;
  const entityTotal = countRows[0]?.cnt ?? 0;
  const total = entityTotal + (cvarColPresent ? 1 : 0);

  const structNote = cvarColPresent
    ? ['cvar_versions.track_b_hud_recovery column exists (D11/R7 schema violation)']
    : [];

  return {
    name: 'F1.hud_recovery_first_class',
    family: 'regression',
    description: 'Every Track-B HUD recovery carrier is a first-class command/source_backed entity with non-NULL level (enforce-L1 D21 + D11/R7 / Phase-5)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all Track-B HUD recovery carriers are first-class entities with a well-formed D21 level'
      : `${total} offending row(s): entity-shape=${entityTotal}; ${[...structNote, ...offenderRows.map(r => `${r.canonical_id}(${r.reason})`)].join(', ')}`,
    examples: [...structNote, ...offenderRows.map(r => `${r.canonical_id}(${r.reason})`)],
  };
}

// C5 probe for the origin-tag vocabulary shape (arc: ktx-mvdsv-l1-describe-fill).
//
// Two-part assertion:
//   (i)  GLOBAL guard: no entities row carries an out-of-vocabulary
//        description_origin value, and description_origin is NULL only
//        where description is also NULL (a NULL origin on a populated
//        description field is a loader bug, not an absent description).
//   (ii) ARC-SCOPED guard: for the D1 configurable buckets this arc
//        owns (project IN ('ktx','mvdsv') AND type IN ('cvar','command',
//        'cmdline_param','info_key')) every row with a non-NULL description
//        must have an in-vocabulary origin from the narrower owned-track
//        set {source_inline, synthesized, shipped_doc}.
//        help_json is ezquake-only and must not appear here; 'inherited'
//        is the full-vocabulary extension but is not an arc-owned origin.
//
// The IS NULL OR ... NOT IN form in part (ii) is mandatory for NULL-safety:
// a bare NOT IN evaluates to NULL (not TRUE) for a NULL lhs and would
// silently miss a NULL-origin row with a non-NULL description (F-C5b root
// cause pattern).
async function probeDescribeFillOriginVocabulary(ctx: ProbeContext): Promise<ProbeResult> {
  const examples: string[] = [];

  // Part (i): GLOBAL guard -- full entities table, no project filter.
  // Offender: description_origin is non-NULL but outside the allowed set,
  // OR description_origin IS NULL while description IS NOT NULL.
  const globalRows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT canonical_id
    FROM entities
    WHERE (
      description_origin IS NOT NULL
      AND description_origin NOT IN ('help_json', 'source_inline', 'inherited', 'synthesized', 'shipped_doc')
    )
    OR (
      description_origin IS NULL
      AND description IS NOT NULL
    )
    ORDER BY canonical_id
    LIMIT 8
  `;
  for (const r of globalRows) {
    examples.push(`GLOBAL:${r.canonical_id}`);
  }

  // Count total GLOBAL offenders (may exceed the 8-row example cap).
  const globalCountRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM entities
    WHERE (
      description_origin IS NOT NULL
      AND description_origin NOT IN ('help_json', 'source_inline', 'inherited', 'synthesized', 'shipped_doc')
    )
    OR (
      description_origin IS NULL
      AND description IS NOT NULL
    )
  `;
  const globalTotal = globalCountRows[0]?.cnt ?? 0;

  // Part (ii): ARC-SCOPED guard -- D1 configurable buckets for ktx + mvdsv.
  // A row is an offender when description IS NOT NULL but description_origin
  // is NULL or outside the owned-track set {source_inline, synthesized,
  // shipped_doc}. The IS NULL OR ... NOT IN form is mandatory so a NULL
  // origin (not in NOT IN's truth domain) is caught as an offender (F-C5b).
  const arcSlotsNeeded = 8 - examples.length;
  if (arcSlotsNeeded > 0) {
    const arcRows = await ctx.sql<{ canonical_id: string }[]>`
      SELECT canonical_id
      FROM entities
      WHERE project IN ('ktx', 'mvdsv')
        AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
        AND description IS NOT NULL
        AND (
          description_origin IS NULL
          OR description_origin NOT IN ('source_inline', 'synthesized', 'shipped_doc')
        )
      ORDER BY canonical_id
      LIMIT ${arcSlotsNeeded}
    `;
    for (const r of arcRows) {
      examples.push(`ARC:${r.canonical_id}`);
    }
  }

  const arcCountRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM entities
    WHERE project IN ('ktx', 'mvdsv')
      AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND description IS NOT NULL
      AND (
        description_origin IS NULL
        OR description_origin NOT IN ('source_inline', 'synthesized', 'shipped_doc')
      )
  `;
  const arcTotal = arcCountRows[0]?.cnt ?? 0;

  const total = globalTotal + arcTotal;
  return {
    name: 'F1.describe_fill.origin_vocabulary',
    family: 'regression',
    description: 'description_origin values are in-vocabulary; arc-scoped rows use owned-track origins only (C5)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all description_origin values in vocabulary; arc-scoped rows use owned-track origins'
      : `${total} offender(s): ${globalTotal} global vocabulary violation(s), ${arcTotal} arc-scoped owned-track violation(s)`,
    examples,
  };
}

// C5 probe for the synthesized-description anchor-version shape (arc:
// ktx-mvdsv-l1-describe-fill).
//
// ARC-SCOPED ONLY -- mirrors the part (ii) predicate of
// probeDescribeFillOriginVocabulary exactly: project IN ('ktx','mvdsv')
// AND type IN ('cvar','command','cmdline_param','info_key').
//
// Assertion: every arc-scoped row with description_origin='synthesized'
// must have a non-NULL description_anchor_version. A NULL anchor on a
// synthesized row means the staleness walk (D4) has no baseline to diff
// against -- the D2 anchor field is not optional for this origin.
//
// The type IN (...) filter structurally excludes the 7 pre-existing
// ktx:match_event:* rows (description_origin='synthesized',
// description_anchor_version=NULL by design, migrations 012/014).
// Those rows are structural-tier, out of D1 scope, and MUST NOT be
// policed here. A global probe would catch them and produce a
// vacuously-unfixable FAIL -- that is the exact shape F-C5b retired.
async function probeDescribeFillSynthesizedRequiresAnchor(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT canonical_id
    FROM entities
    WHERE project IN ('ktx', 'mvdsv')
      AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND description_origin = 'synthesized'
      AND description_anchor_version IS NULL
    ORDER BY canonical_id
    LIMIT 8
  `;

  const countRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM entities
    WHERE project IN ('ktx', 'mvdsv')
      AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND description_origin = 'synthesized'
      AND description_anchor_version IS NULL
  `;
  const total = countRows[0]?.cnt ?? 0;

  return {
    name: 'F1.describe_fill.synthesized_requires_anchor',
    family: 'regression',
    description: 'arc-scoped synthesized rows carry a non-NULL description_anchor_version (C5, D2/D4)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all arc-scoped synthesized rows have description_anchor_version set'
      : `${total} arc-scoped synthesized row(s) missing description_anchor_version`,
    examples: rows.map(r => r.canonical_id),
  };
}

// Arc-scoped: every shipped_doc row in the describe-fill arc must carry a
// description_provenance JSONB array with at least one entry (C5, D11/F-C5a).
// The triple NULL/typeof/length check is mandatory NULL-safety: a NULL
// provenance, a JSONB string scalar (pre-stringify loader regression), or an
// empty array all represent the same failure -- the loader did not retain the
// source evidence for the description it wrote. Arc-scoped to
// project IN ('ktx','mvdsv') + the four entity types Phase 2 fills, exactly
// like sibling probes origin_vocabulary and synthesized_requires_anchor.
async function probeDescribeFillProvenanceEntryExists(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ canonical_id: string }[]>`
    SELECT canonical_id
    FROM entities
    WHERE project IN ('ktx', 'mvdsv')
      AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND description_origin = 'shipped_doc'
      AND (
        description_provenance IS NULL
        OR jsonb_typeof(description_provenance) <> 'array'
        OR jsonb_array_length(description_provenance) < 1
      )
    ORDER BY canonical_id
    LIMIT 8
  `;

  const countRows = await ctx.sql<{ cnt: number }[]>`
    SELECT COUNT(*)::int AS cnt
    FROM entities
    WHERE project IN ('ktx', 'mvdsv')
      AND type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND description_origin = 'shipped_doc'
      AND (
        description_provenance IS NULL
        OR jsonb_typeof(description_provenance) <> 'array'
        OR jsonb_array_length(description_provenance) < 1
      )
  `;
  const total = countRows[0]?.cnt ?? 0;

  return {
    name: 'F1.describe_fill.provenance_entry_exists',
    family: 'regression',
    description: 'arc-scoped shipped_doc rows carry a non-empty description_provenance JSONB array (C5, D11/F-C5a)',
    status: total === 0 ? 'PASS' : 'FAIL',
    count: total,
    summary: total === 0
      ? 'all arc-scoped shipped_doc rows have a non-empty description_provenance array'
      : `${total} arc-scoped shipped_doc row(s) missing a valid description_provenance array`,
    examples: rows.map(r => r.canonical_id),
  };
}

// ---------------------------------------------------------------------------
// Family 2 -- Anomaly probes
// ---------------------------------------------------------------------------

// An entity present-then-absent-then-present across consecutive ordinal-
// ordered versions is almost always an extractor bug, not real history.
// Detection: build an ordered presence string per entity, look for "1 0 1"
// (or longer with gaps in the middle).
//
// EXCEPT pure help-JSON ghosts: ezquake documents some cvars in help_*.json
// with no source definition at any extracted tag. `s_stereo` is the
// canonical case -- a real Linux/ALSA cvar 2005-2013, purged from source
// before ezquake v3.0 (2016, our earliest tag), but carried in
// help_variables.json at 3.1, dropped 3.2.x, restored 3.6.0+. Its flicker
// is hand-curated help-JSON history, not a missed extraction.
//
// Exclude such ghosts by the provenance FACT -- no version row has a
// source_file -- NOT by source_state label. The 2026-05-15 entity-state-
// retreat fix (3be4d576) moved never-source-backed ghosts from doc_only to
// source_retired, so the prior label-only filter (`!= 'doc_only'`) silently
// re-admitted them (this is exactly how s_stereo started false-positiving).
// Keep the doc_only filter (unchanged for at-head doc_only rows) AND add a
// per-type "source_file present at some version" requirement. Skip the
// source_file clause for asset_category (its versions table has no
// source_file column -- same exclusion the retreat scan in load-version.ts
// applies).
async function probeFlickeringPresence(ctx: ProbeContext): Promise<ProbeResult> {
  const versions = await ctx.sql<{ version: string; ordinal: number }[]>`
    SELECT version, ordinal FROM versions WHERE project=${ctx.project} ORDER BY ordinal
  `;
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
    // Pure help-JSON ghost exclusion (see header comment): keep only
    // entities that are source_file-backed at some version. asset_category
    // has no source_file column, so it keeps the state filter alone.
    const ghostFilter =
      type === 'asset_category'
        ? ctx.sql``
        : ctx.sql`HAVING bool_or(xv.source_file IS NOT NULL)`;
    // Postgres uses STRING_AGG(expr, sep ORDER BY ...) where SQLite used
    // GROUP_CONCAT(expr, sep ORDER BY ...). Same shape, different name.
    const rows = await ctx.sql<{ id: number; name: string; pattern: string | null }[]>`
      SELECT e.id, e.name,
             STRING_AGG(v.version, '|' ORDER BY v.ordinal) AS pattern
      FROM entities e
      LEFT JOIN ${ctx.sql(versionTable)} xv ON xv.entity_id=e.id
      LEFT JOIN versions v ON v.project=e.project AND v.version=xv.version
      WHERE e.project=${ctx.project} AND e.type=${type} AND e.source_state != 'doc_only'
      GROUP BY e.id, e.name
      ${ghostFilter}
    `;
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
async function probeEmptyBodyDensity(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ name: string; version: string }[]>`
    SELECT e.name, cv.version FROM entities e
    JOIN cvar_versions cv ON cv.entity_id=e.id
    WHERE e.project=${ctx.project} AND e.type='cvar' AND e.source_state='source_backed'
      AND cv.help_desc IS NULL AND cv.help_type IS NULL
      AND cv.default_value IS NULL AND cv.flag_names IS NULL
      AND cv.source_file IS NULL
  `;
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
async function probeSourceBackedMissingCitation(ctx: ProbeContext): Promise<ProbeResult> {
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
    const rows = await ctx.sql<{ name: string; version: string }[]>`
      SELECT e.name, xv.version FROM entities e
      JOIN ${ctx.sql(table)} xv ON xv.entity_id=e.id
      JOIN versions vrow ON vrow.project=e.project AND vrow.version=xv.version
      WHERE e.project=${ctx.project} AND e.type=${type} AND e.source_state='source_backed'
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
    `;
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
async function probePairSymmetry(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ name: string }[]>`
    SELECT name FROM entities
    WHERE project=${ctx.project} AND type='command' AND source_state='source_backed'
      AND (name LIKE '+%' OR name LIKE '-%')
  `;
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
async function probeDocOnlyCrosstab(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ type: string; n: number }[]>`
    SELECT type, COUNT(*)::int AS n FROM entities
    WHERE project=${ctx.project} AND source_state='doc_only'
    GROUP BY type ORDER BY n DESC
  `;
  const total = rows.reduce((s, r) => s + r.n, 0);
  return {
    name: 'F2.doc_only_crosstab',
    family: 'anomaly',
    description: 'doc_only entity count broken down by type -- extractor coverage gauge',
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
async function probeDefaultValuePingPong(ctx: ProbeContext): Promise<ProbeResult> {
  const rows = await ctx.sql<{ name: string; defaults: string | null; vs: string }[]>`
    SELECT e.name,
           STRING_AGG(cv.default_value, '|' ORDER BY v.ordinal) AS defaults,
           STRING_AGG(cv.version, '|' ORDER BY v.ordinal) AS vs
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id=e.id
    JOIN versions v ON v.project=e.project AND v.version=cv.version
    WHERE e.project=${ctx.project} AND e.type='cvar' AND cv.default_value IS NOT NULL
    GROUP BY e.id, e.name
    HAVING COUNT(*) >= 3
  `;
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
// FTE Family 1 -- Regression probes
//
// Counts below are load-bearing equality assertions, not cushioned ranges.
// This probe file is the canonical source-of-truth: bump the expected values
// whenever entity counts shift deliberately (a legitimate source-truth update
// such as a new FTE build snapshot), so that any unexpected drift fails
// loudly as an extractor regression rather than slipping through a tolerance.
// ---------------------------------------------------------------------------

async function probeFteCvarsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.cvars_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM entities WHERE project='fte' AND type='cvar'`;
  const n = rows[0]!.n;
  const expected = 2482;
  return {
    name: 'F1.fte.cvars_count',
    family: 'regression',
    description: `total fte cvar entities equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} cvars` : `${n} cvars (expected ${expected})`,
    examples: [],
  };
}

async function probeFteEngineCvars(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.engine_cvars', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='engine' AND cv.version='head'
  `;
  const n = rows[0]!.n;
  const expected = 1397;
  return {
    name: 'F1.fte.engine_cvars',
    family: 'regression',
    description: `fte cvar_versions rows (version=head) with source_root='engine' equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} engine cvar rows` : `${n} engine cvar rows (expected ${expected})`,
    examples: [],
  };
}

async function probeFtePluginEzhudCvars(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.plugin_ezhud_cvars', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='plugin:ezhud' AND cv.version='head'
  `;
  const n = rows[0]!.n;
  const expected = 1085;
  return {
    name: 'F1.fte.plugin_ezhud_cvars',
    family: 'regression',
    description: `fte cvar_versions rows (version=head) with source_root='plugin:ezhud' equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} plugin:ezhud cvar rows` : `${n} plugin:ezhud cvar rows (expected ${expected})`,
    examples: [],
  };
}

async function probeFteCommandsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.commands_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM entities WHERE project='fte' AND type='command'`;
  const n = rows[0]!.n;
  const expected = 556;
  return {
    name: 'F1.fte.commands_count',
    family: 'regression',
    description: `total fte command entities equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} commands` : `${n} commands (expected ${expected})`,
    examples: [],
  };
}

async function probeFteMacrosCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.macros_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM entities WHERE project='fte' AND type='macro'`;
  const n = rows[0]!.n;
  const expected = 67;
  return {
    name: 'F1.fte.macros_count',
    family: 'regression',
    description: `total fte macro entities equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} macros` : `${n} macros (expected ${expected})`,
    examples: [],
  };
}

async function probeFteCmdlineCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.cmdline_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM entities WHERE project='fte' AND type='cmdline_param'`;
  const n = rows[0]!.n;
  const expected = 108;
  return {
    name: 'F1.fte.cmdline_count',
    family: 'regression',
    description: `total fte cmdline_param entities equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} cmdline params` : `${n} cmdline params (expected ${expected})`,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// FTE Family 2 -- Anomaly probes
// ---------------------------------------------------------------------------

// Guard: every fte cvar_versions row must have a non-NULL source_root.
// A NULL here means the loader failed to set the engine/plugin:ezhud tag.
async function probeFteNoNullSourceRootCvars(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.no_null_source_root_cvars', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; version: string }[]>`
    SELECT e.name, cv.version FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root IS NULL
    LIMIT 10
  `;
  return {
    name: 'F2.fte.no_null_source_root_cvars',
    family: 'anomaly',
    description: 'fte cvar_versions rows with NULL source_root -- loader failed to tag engine/plugin split',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte cvar rows have source_root' : `${rows.length} rows with NULL source_root`,
    examples: rows.map(r => `${r.name}@${r.version}`),
  };
}

// Guard: plugin:ezhud cvar rows must come from files under plugins/ezhud/.
// A mismatch means a non-ezhud file was incorrectly tagged as plugin:ezhud.
async function probeFtePluginEzhudSourceFilePrefix(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.plugin_ezhud_source_file_prefix', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; source_file: string }[]>`
    SELECT e.name, cv.source_file FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='plugin:ezhud'
      AND cv.source_file IS NOT NULL
      AND cv.source_file NOT LIKE 'plugins/ezhud/%'
    LIMIT 10
  `;
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
async function probeFteEngineNoPluginSourceFiles(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.engine_no_plugin_source_files', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; source_file: string }[]>`
    SELECT e.name, cv.source_file FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.source_root='engine'
      AND cv.source_file LIKE 'plugins/%'
    LIMIT 10
  `;
  return {
    name: 'F2.fte.engine_no_plugin_source_files',
    family: 'anomaly',
    description: "engine cvar rows where source_file begins with plugins/ -- source_root crossover",
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'no engine rows point at plugin source files' : `${rows.length} engine rows with plugin source_file`,
    examples: rows.map(r => `${r.name} -> ${r.source_file}`),
  };
}

// Guard: no fte cvar should have an absurdly long flags_raw (>5 commas).
// Regression guard for the inflated-flags bug fixed in Task 14 -- if flags_raw
// has >5 comma-separated tokens it almost certainly accumulated duplicates.
async function probeFteNoInflatedFlags(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.no_inflated_flags', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; flags_raw: string }[]>`
    SELECT e.name, cv.flags_raw FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte'
      AND cv.flags_raw IS NOT NULL
      AND length(cv.flags_raw) - length(replace(cv.flags_raw, ',', '')) > 5
    LIMIT 10
  `;
  return {
    name: 'F2.fte.no_inflated_flags',
    family: 'anomaly',
    description: 'fte cvar_versions rows with >5 commas in flags_raw -- regression guard for inflated-flags bug',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'no inflated flags_raw rows' : `${rows.length} rows with >5 commas in flags_raw`,
    examples: rows.map(r => `${r.name}: ${r.flags_raw}`),
  };
}

// ---------------------------------------------------------------------------
// FTE asset probes (Phase 2d-bundle) -- F1 count + F2 anomaly
// ---------------------------------------------------------------------------

async function probeFteAssetCategoriesCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_categories_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM entities WHERE project='fte' AND type='asset_category'`;
  const n = rows[0]!.n;
  const expected = 28;
  return {
    name: 'F1.fte.asset_categories_count',
    family: 'regression',
    description: `fte asset_category entities equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} asset_category entities` : `${n} asset_category entities (expected ${expected})`,
    examples: [],
  };
}

async function probeFteAssetExtensionsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_extensions_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM asset_extensions WHERE project='fte' AND version='head'`;
  const n = rows[0]!.n;
  const expected = 61;
  return {
    name: 'F1.fte.asset_extensions_count',
    family: 'regression',
    description: `fte asset_extensions rows (version=head) equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} asset_extensions` : `${n} asset_extensions (expected ${expected})`,
    examples: [],
  };
}

async function probeFteAssetPathRulesCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_path_rules_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM asset_path_rules WHERE project='fte' AND version='head'`;
  const n = rows[0]!.n;
  const expected = 13;
  return {
    name: 'F1.fte.asset_path_rules_count',
    family: 'regression',
    description: `fte asset_path_rules rows (version=head) equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} asset_path_rules` : `${n} asset_path_rules (expected ${expected})`,
    examples: [],
  };
}

async function probeFteAssetCvarBindingsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_cvar_bindings_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM asset_cvar_bindings WHERE project='fte' AND version='head'`;
  const n = rows[0]!.n;
  const expected = 25;
  return {
    name: 'F1.fte.asset_cvar_bindings_count',
    family: 'regression',
    description: `fte asset_cvar_bindings rows (version=head) equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} asset_cvar_bindings` : `${n} asset_cvar_bindings (expected ${expected})`,
    examples: [],
  };
}

async function probeFteAssetLoaderSitesCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F1.fte.asset_loader_sites_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM asset_loader_sites WHERE project='fte' AND version='head'`;
  const n = rows[0]!.n;
  const expected = 717;
  return {
    name: 'F1.fte.asset_loader_sites_count',
    family: 'regression',
    description: `fte asset_loader_sites rows (version=head) equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} asset_loader_sites` : `${n} asset_loader_sites (expected ${expected})`,
    examples: [],
  };
}

// Guard: every fte loader site must have source_file set. A NULL means
// the handler emitted a row without a source location, which is malformed.
async function probeFteLoaderSitesHaveSourceFile(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.loader_sites_have_source_file', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ canonical_id: string; function_name: string }[]>`
    SELECT canonical_id, function_name FROM asset_loader_sites
    WHERE project='fte' AND (source_file IS NULL OR source_file = '')
    LIMIT 10
  `;
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

// Guard: every fte path_rule must have source_verified=true. The verifier
// runs at every extract-tag and stamps source_verified=false when a citation
// fails to resolve to a function-internal line. Schema flipped from INTEGER
// (0/1) to BOOLEAN in the Postgres migration; comparison uses literal `false`.
async function probeFtePathRulesAllVerified(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.path_rules_all_verified', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ canonical_id: string; source_ref: string }[]>`
    SELECT canonical_id, source_ref FROM asset_path_rules
    WHERE project='fte' AND source_verified = false
    LIMIT 10
  `;
  return {
    name: 'F2.fte.path_rules_all_verified',
    family: 'anomaly',
    description: 'fte asset_path_rules rows with source_verified=false',
    status: rows.length === 0 ? 'CLEAN' : 'FOUND',
    count: rows.length,
    summary: rows.length === 0 ? 'all fte path_rules verified' : `${rows.length} path_rules unverified`,
    examples: rows.map(r => `${r.canonical_id} -> ${r.source_ref}`),
  };
}

// Guard: every fte asset_cvar_bindings row must reference an existing
// cvar entity. A NULL join means the seed cited a stale cvar name.
async function probeFteCvarBindingsResolve(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.cvar_bindings_resolve', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ cvar_canonical_id: string }[]>`
    SELECT ab.cvar_canonical_id FROM asset_cvar_bindings ab
    LEFT JOIN entities e ON e.canonical_id = ab.cvar_canonical_id
    WHERE ab.project = 'fte' AND e.id IS NULL
    LIMIT 10
  `;
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
async function probeFteShaderLoaderSitesPresent(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'fte') {
    return { name: 'F2.fte.shader_loader_sites_present', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM asset_loader_sites
    WHERE project='fte' AND function_name IN ('R_RegisterShader','R_LoadShader')
  `;
  const n = rows[0]!.n;
  return {
    name: 'F2.fte.shader_loader_sites_present',
    family: 'anomaly',
    description: 'fte shader-registration loader sites must remain >=80 (regression guard)',
    status: n >= 80 ? 'CLEAN' : 'FOUND',
    count: n >= 80 ? 0 : 1,
    summary: n >= 80 ? `${n} shader-registration loader sites` : `only ${n} shader loader sites -- expected >=80`,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// MVDSV Family 1 -- Regression probes
//
// Counts below are load-bearing equality assertions, not lower-only floors.
// The values pinned in each probe are today's source-of-truth at HEAD;
// update them whenever the MVDSV source legitimately changes (a new tag
// snapshot, an upstream addition that genuinely lands new entities) so
// that any unexpected drift fails loudly as an extractor regression.
// ---------------------------------------------------------------------------

async function probeMvdsvCvarsSourceBackedCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.cvars_source_backed_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='cvar' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  const expected = 183;
  return {
    name: 'F1.mvdsv.cvars_source_backed_count',
    family: 'regression',
    description: `mvdsv source_backed cvar count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed cvars` : `${n} source_backed cvars (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvCommandsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.commands_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='command' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  const expected = 108;
  return {
    name: 'F1.mvdsv.commands_count',
    family: 'regression',
    description: `mvdsv source_backed command count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed commands` : `${n} source_backed commands (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvCmdlineParamsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.cmdline_params_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='cmdline_param' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  const expected = 11;
  return {
    name: 'F1.mvdsv.cmdline_params_count',
    family: 'regression',
    description: `mvdsv source_backed cmdline_param count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed cmdline params` : `${n} source_backed cmdline params (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvProtocolMessagesCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.protocol_messages_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='protocol_message' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  const expected = 105;
  return {
    name: 'F1.mvdsv.protocol_messages_count',
    family: 'regression',
    description: `mvdsv source_backed protocol_message count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed protocol messages` : `${n} source_backed protocol messages (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvInfoKeysCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.info_keys_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='info_key' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  // Phase B 2026-04-28: bumped 44 -> 45. The Phase B `<bare>:<scope>` rename
  // recovered the second `*z_ext` registration (userinfo via SVC_DirectConnect)
  // that pre-Phase-B had been collapsed into the serverinfo row by the
  // entities UNIQUE(project, type, name) constraint.
  const expected = 45;
  return {
    name: 'F1.mvdsv.info_keys_count',
    family: 'regression',
    description: `mvdsv source_backed info_key count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed info keys` : `${n} source_backed info keys (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvLogTemplatesCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.log_templates_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='log_template' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  const expected = 691;
  return {
    name: 'F1.mvdsv.log_templates_count',
    family: 'regression',
    description: `mvdsv source_backed log_template count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed log templates` : `${n} source_backed log templates (expected ${expected})`,
    examples: [],
  };
}

async function probeMvdsvQcBuiltinsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.qc_builtins_count', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='mvdsv' AND type='qc_builtin' AND source_state='source_backed'
  `;
  const n = rows[0]!.n;
  // v18 (Phase 2 task 2.4) added `:<table_name>` suffix to qc_builtin canonical
  // names mirroring info_key Phase B's `:<scope>` shape. The audit predicted
  // 93 -> 97 from "cross-scope" recovery, but inspection shows the 4 dropped
  // duplicates (cvar_string / precache_model / precache_sound / precache_file)
  // are intra-table multi-index registrations, not cross-table. Recovering
  // those 4 needs handler-side aggregation (an `all_call_sites_json`-style
  // shape mirroring info_key Phase B); deferred to HANDOVER. Count stays 93.
  const expected = 93;
  return {
    name: 'F1.mvdsv.qc_builtins_count',
    family: 'regression',
    description: `mvdsv source_backed qc_builtin count equals ${expected}`,
    status: n === expected ? 'PASS' : 'FAIL',
    count: n,
    summary: n === expected ? `${n} source_backed qc builtins` : `${n} source_backed qc builtins (expected ${expected})`,
    examples: [],
  };
}

// MVDSV ships no help-JSON, so every entity must be source_backed. A non-
// source_backed row would mean a doc_only / source_retired classification
// crept in via a cross-type collision or a future help-JSON import.
async function probeMvdsvAllSourceBacked(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.all_source_backed', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ type: string; name: string; source_state: string }[]>`
    SELECT type, name, source_state FROM entities
    WHERE project='mvdsv' AND source_state != 'source_backed'
    ORDER BY type, name
  `;
  return {
    name: 'F1.mvdsv.all_source_backed',
    family: 'regression',
    description: 'mvdsv has zero non-source_backed entities (no help-JSON shipped)',
    status: rows.length === 0 ? 'PASS' : 'FAIL',
    count: rows.length,
    summary: rows.length === 0 ? 'all mvdsv entities source_backed' : `${rows.length} non-source_backed mvdsv entities`,
    examples: rows.slice(0, 5).map(r => `${r.type}:${r.name} (${r.source_state})`),
  };
}

// Sanity probe: maxfps default at head must be '77'. This is the canonical
// MVDSV server-side fps floor and the default value is hard-coded in the
// source. A change here means either the default genuinely shifted upstream
// or the cvar handler regressed on default-value extraction.
async function probeMvdsvMaxfpsDefault77(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.sv_maxfps_default_77', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ default_value: string | null }[]>`
    SELECT cv.default_value FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='mvdsv' AND e.name='maxfps' AND cv.version='head'
  `;
  const got = rows[0]?.default_value ?? '<missing>';
  const ok = got === '77';
  return {
    name: 'F1.mvdsv.sv_maxfps_default_77',
    family: 'regression',
    description: "mvdsv cvar `maxfps` default_value is '77' at head",
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary: ok ? "maxfps default='77'" : `maxfps default='${got}', expected '77'`,
    examples: [],
  };
}

// Sanity probe: svc_print at head must be a 'svc' kind with value '8'. This
// pins the protocol-message handler's value/kind extraction. svc_print=8 is
// fixed in the QuakeWorld protocol.
async function probeMvdsvSvcPrintValue8(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.svc_print_value_8', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ value: string | null; kind: string }[]>`
    SELECT pv.value, pv.kind FROM protocol_message_versions pv
    JOIN entities e ON pv.entity_id=e.id
    WHERE e.project='mvdsv' AND e.name='svc_print' AND pv.version='head'
  `;
  const row = rows[0];
  const ok = !!row && row.value === '8' && row.kind === 'svc';
  const summary = ok
    ? "svc_print kind='svc' value='8'"
    : `svc_print got kind='${row?.kind ?? '<missing>'}' value='${row?.value ?? '<missing>'}', expected kind='svc' value='8'`;
  return {
    name: 'F1.mvdsv.svc_print_value_8',
    family: 'regression',
    description: "mvdsv protocol_message `svc_print` is kind='svc' value='8' at head",
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary,
    examples: [],
  };
}

// Sanity probe: makevectors qc_builtin at head must live in std_builtins
// at builtin_index=1. This pins the qc_builtin handler's table_name +
// builtin_index extraction.
async function probeMvdsvMakevectorsBuiltin1(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F1.mvdsv.makevectors_builtin_1', family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  // v18 (Phase 2 task 2.4): qc_builtin canonical names carry `:<table_name>` suffix.
  const rows = await ctx.sql<{ table_name: string; builtin_index: number }[]>`
    SELECT bv.table_name, bv.builtin_index FROM qc_builtin_versions bv
    JOIN entities e ON bv.entity_id=e.id
    WHERE e.project='mvdsv' AND e.name='makevectors:std_builtins' AND bv.version='head'
  `;
  const row = rows[0];
  const ok = !!row && row.table_name === 'std_builtins' && row.builtin_index === 1;
  const summary = ok
    ? "makevectors table_name='std_builtins' builtin_index=1"
    : `makevectors got table_name='${row?.table_name ?? '<missing>'}' index=${row?.builtin_index ?? '<missing>'}, expected std_builtins/1`;
  return {
    name: 'F1.mvdsv.makevectors_builtin_1',
    family: 'regression',
    description: "mvdsv qc_builtin `makevectors` is table_name='std_builtins' builtin_index=1 at head",
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// MVDSV Family 2 -- Anomaly probes
// ---------------------------------------------------------------------------

// All four channels (broadcast/client/console/system) must be present in
// log_template_versions. A missing channel means the log-template handler
// stopped emitting one entire bucket.
async function probeMvdsvLogTemplateChannelsCount(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F2.mvdsv.log_template_channels_count', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ channel: string; n: number }[]>`
    SELECT lv.channel, COUNT(*)::int AS n FROM log_template_versions lv
    JOIN entities e ON lv.entity_id=e.id
    WHERE e.project='mvdsv'
    GROUP BY lv.channel ORDER BY lv.channel
  `;
  const ok = rows.length === 4;
  return {
    name: 'F2.mvdsv.log_template_channels_count',
    family: 'anomaly',
    description: 'mvdsv log_template channel count is exactly 4 (broadcast/client/console/system)',
    status: ok ? 'CLEAN' : 'FOUND',
    count: ok ? 0 : Math.abs(4 - rows.length),
    summary: ok ? `4 channels present (${rows.map(r => `${r.channel}=${r.n}`).join(', ')})` : `${rows.length} channels: ${rows.map(r => `${r.channel}=${r.n}`).join(', ')}`,
    examples: rows.map(r => `${r.channel}: ${r.n}`),
  };
}

// Distribution gauge for info_key scopes. userinfo and serverinfo are well-
// populated; localinfo is rare in MVDSV (operator-only). CLEAN if userinfo
// >25 and serverinfo >=10. Always emit the by-scope counts as informational.
async function probeMvdsvInfoKeyScopesDistribution(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F2.mvdsv.info_key_scopes_distribution', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ scope: string; n: number }[]>`
    SELECT iv.scope, COUNT(DISTINCT e.id)::int AS n FROM info_key_versions iv
    JOIN entities e ON iv.entity_id=e.id
    WHERE e.project='mvdsv'
    GROUP BY iv.scope ORDER BY iv.scope
  `;
  const byScope = new Map(rows.map(r => [r.scope, r.n]));
  const userinfo = byScope.get('userinfo') ?? 0;
  const serverinfo = byScope.get('serverinfo') ?? 0;
  const ok = userinfo > 25 && serverinfo >= 10;
  return {
    name: 'F2.mvdsv.info_key_scopes_distribution',
    family: 'anomaly',
    description: 'mvdsv info_key by-scope distribution: userinfo>25 AND serverinfo>=10',
    status: ok ? 'CLEAN' : 'FOUND',
    count: ok ? 0 : 1,
    summary: ok
      ? `userinfo=${userinfo} serverinfo=${serverinfo} (localinfo=${byScope.get('localinfo') ?? 0})`
      : `userinfo=${userinfo} serverinfo=${serverinfo} -- below floor (need userinfo>25 AND serverinfo>=10)`,
    examples: rows.map(r => `${r.scope}: ${r.n}`),
  };
}

// Phase C 2026-04-28: schema v16 widens kinds from 6 to 13 to disambiguate
// heterogeneous-bag classifications. Some of the new kinds may have zero rows
// at HEAD (e.g. `pext_fte_bit` -- all 12 FTE entries are hex consts at the
// 2026-01-04 mvdsv snapshot). The probe asserts that every observed kind is
// in the expected set rather than that every expected kind has rows. A new
// kind appearing in the DB that's NOT in the expected list means an
// extractor has emitted an unrecognized classification -- those are the
// failures to surface.
async function probeMvdsvProtocolMessageKindsDistribution(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F2.mvdsv.protocol_message_kinds_distribution', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ kind: string; n: number }[]>`
    SELECT pv.kind, COUNT(*)::int AS n FROM protocol_message_versions pv
    JOIN entities e ON pv.entity_id=e.id
    WHERE e.project='mvdsv'
    GROUP BY pv.kind ORDER BY pv.kind
  `;
  const expected = [
    'svc', 'clc', 'nq',
    'pext_fte_bit', 'pext_fte_const', 'pext_fte_alias', 'pext_fte_marker',
    'pext_mvd_bit', 'pext_mvd_const', 'pext_mvd_alias', 'pext_mvd_marker',
    'protocol_version', 'protocol_extension_id',
  ];
  const expectedSet = new Set(expected);
  const unexpected = rows.map(r => r.kind).filter(k => !expectedSet.has(k));
  const ok = unexpected.length === 0;
  return {
    name: 'F2.mvdsv.protocol_message_kinds_distribution',
    family: 'anomaly',
    description:
      'mvdsv protocol_message kinds: every observed kind is in the v16 13-kind set ' +
      '(svc/clc/nq + 4 pext_fte_* + 4 pext_mvd_* + protocol_version + protocol_extension_id)',
    status: ok ? 'CLEAN' : 'FOUND',
    count: unexpected.length,
    summary: ok
      ? `${rows.length}/13 kinds observed (${rows.map(r => `${r.kind}=${r.n}`).join(', ')})`
      : `unexpected kinds: ${unexpected.join(', ')}`,
    examples: rows.map(r => `${r.kind}: ${r.n}`),
  };
}

// MVDSV registers QC builtins under exactly three table names:
// std_builtins, ext_builtins, ext_syscalls. A different distinct count
// means the qc_builtin handler picked up an unexpected fourth registration
// table or dropped one of the three.
async function probeMvdsvQcBuiltinTables(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F2.mvdsv.qc_builtin_tables', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ table_name: string; n: number }[]>`
    SELECT bv.table_name, COUNT(*)::int AS n FROM qc_builtin_versions bv
    JOIN entities e ON bv.entity_id=e.id
    WHERE e.project='mvdsv'
    GROUP BY bv.table_name ORDER BY bv.table_name
  `;
  const ok = rows.length === 3;
  return {
    name: 'F2.mvdsv.qc_builtin_tables',
    family: 'anomaly',
    description: 'mvdsv qc_builtin distinct table_name count is exactly 3 (std_builtins/ext_builtins/ext_syscalls)',
    status: ok ? 'CLEAN' : 'FOUND',
    count: ok ? 0 : Math.abs(3 - rows.length),
    summary: ok
      ? `3 tables present (${rows.map(r => `${r.table_name}=${r.n}`).join(', ')})`
      : `${rows.length} tables: ${rows.map(r => `${r.table_name}=${r.n}`).join(', ')}`,
    examples: rows.map(r => `${r.table_name}: ${r.n}`),
  };
}

// Coverage gauge: trailing_comment is harvested opportunistically from
// CVAR_REGISTER lines in the source. Current rate at HEAD is ~19% (35/183).
// CLEAN if coverage stays >=15%. A drop means the trailing_comment harvest
// regressed (e.g., re-tokenization broke comment association).
async function probeMvdsvTrailingCommentCoverageCvars(ctx: ProbeContext): Promise<ProbeResult> {
  if (ctx.project !== 'mvdsv') {
    return { name: 'F2.mvdsv.trailing_comment_coverage_cvars', family: 'anomaly', description: '', status: 'CLEAN', count: 0, summary: 'skipped (not mvdsv project)', examples: [] };
  }
  const rows = await ctx.sql<{ total: number; with_tc: number }[]>`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN cv.trailing_comment IS NOT NULL THEN 1 ELSE 0 END)::int AS with_tc
    FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='mvdsv' AND cv.version='head'
  `;
  const row = rows[0]!;
  const pct = row.total > 0 ? (row.with_tc / row.total) * 100 : 0;
  const ok = pct >= 15;
  const pctStr = pct.toFixed(1);
  return {
    name: 'F2.mvdsv.trailing_comment_coverage_cvars',
    family: 'anomaly',
    description: 'mvdsv cvar trailing_comment coverage at head >= 15%',
    status: ok ? 'CLEAN' : 'FOUND',
    count: ok ? 0 : 1,
    summary: ok
      ? `${row.with_tc}/${row.total} cvars have trailing_comment (${pctStr}%)`
      : `${row.with_tc}/${row.total} cvars have trailing_comment (${pctStr}%) -- below 15% floor`,
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// Floor probes (Phase 6, 2026-04-28) -- universal mechanical floor
// ---------------------------------------------------------------------------
//
// Every (project, type) entity row gets a count probe + a source_state
// distribution probe. Closes the silent-dead-probe failure mode: probes
// for unloaded entity types would assert COUNT=0 and PASS forever.
//
// Seed values captured 2026-04-28 (post-W3, schema v18) from:
//   psql "$DATABASE_URL" -c "SELECT project, type, COUNT(*) FROM entities
//                            GROUP BY project, type HAVING COUNT(*) > 0
//                            ORDER BY project, type;"
//
// Per-project entity counts:
//   ezquake: asset_category=26, cmdline_param=77, command=560, cvar=2989,
//            flag_bit=50, hud_element=85, keyname=148, macro=68, ruleset=6,
//            token_primitive=33  (10 types)
//   fte:     asset_category=28, cmdline_param=108, command=556, cvar=2482,
//            cvar_alias=38, macro=67  (6 types)
//   mvdsv:   cmdline_param=11, command=108, cvar=183, info_key=45,
//            log_template=691, protocol_message=105, qc_builtin=93  (7 types)
//   qwcl:    cmdline_param=72, command=121, cvar=187  (3 types)
//   ktx:     command=358, cvar=260, info_key=7, log_template=1195,
//            match_event=7  (5 types)
//   total: 31 (project, type) pairs -> 62 floor probes (count + source_state).
//
// Source_state distributions captured from:
//   psql "$DATABASE_URL" -c "SELECT project, type, source_state, COUNT(*) FROM entities
//                            GROUP BY project, type, source_state HAVING COUNT(*) > 0
//                            ORDER BY project, type, source_state;"
//
//   ezquake: cmdline_param  doc_only=1 source_backed=69 source_retired=7
//            command        doc_only=7 source_backed=624 source_retired=62  (re-baselined 2026-05-18, F13; see the inline note at the command floor probe)
//            cvar           doc_only=47 source_backed=2741 source_retired=204
//            macro          doc_only=2 source_backed=66
//            hud_element    source_backed=83 source_retired=2
//            (others: source_backed only)
//   fte/mvdsv/qwcl: every type all source_backed.
//
// Last re-baselined 2026-05-15 after the entity-state-retreat loader fix
// (commit 3be4d576). The 154-entity retreat from doc_only->source_retired
// (114 cvar + 38 command + 2 cmdline_param) + 32 silent source_backed->
// doc_only reconciliations + natural growth (4 new commands, 8 new cvars,
// 4 new asset_categories, 2 hud_elements retiring) reshuffled the splits.
//
// When an entity-type count legitimately changes (new entities loaded,
// schema migration shifts row counts, etc.), update both the probe's
// `expected` constant AND this comment block. Failure messages surface
// actual-vs-expected naturally so drift is loud.

export function makeFloorCountProbe(
  project: Project,
  type: string,
  expected: number,
): Probe {
  const name = `F1.${project}.floor.${type}_count`;
  return {
    name,
    family: 'regression',
    description: `Floor count probe: entities[project=${project}, type=${type}] equals ${expected}.`,
    run: async (ctx: ProbeContext): Promise<ProbeResult> => {
      if (ctx.project !== project) {
        return {
          name,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${project} project)`,
          examples: [],
        };
      }
      const rows = await ctx.sql<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM entities WHERE project=${project} AND type=${type}
      `;
      const actual = rows[0]!.n;
      const status: ProbeStatus = actual === expected ? 'PASS' : 'FAIL';
      return {
        name,
        family: 'regression',
        description: '',
        status,
        count: actual,
        summary: `${type}: actual=${actual}, expected=${expected}`,
        examples: [],
      };
    },
  };
}

export function makeFloorSourceStateProbe(
  project: Project,
  type: string,
  expected: Record<string, number>,
): Probe {
  const name = `F1.${project}.floor.${type}_source_state`;
  return {
    name,
    family: 'regression',
    description: `Floor source_state probe: entities[project=${project}, type=${type}] grouped by source_state.`,
    run: async (ctx: ProbeContext): Promise<ProbeResult> => {
      if (ctx.project !== project) {
        return {
          name,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${project} project)`,
          examples: [],
        };
      }
      const rows = await ctx.sql<{ source_state: string; n: number }[]>`
        SELECT source_state, COUNT(*)::int AS n FROM entities WHERE project=${project} AND type=${type} GROUP BY source_state
      `;
      const actual: Record<string, number> = {};
      for (const r of rows) actual[r.source_state] = r.n;
      const expectedKeys = Object.keys(expected).sort().join(',');
      const actualKeys = Object.keys(actual).sort().join(',');
      let match = expectedKeys === actualKeys;
      if (match) {
        for (const k of Object.keys(expected)) {
          if (expected[k] !== actual[k]) {
            match = false;
            break;
          }
        }
      }
      const status: ProbeStatus = match ? 'PASS' : 'FAIL';
      return {
        name,
        family: 'regression',
        description: '',
        status,
        count: rows.reduce((s, r) => s + r.n, 0),
        summary: `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`,
        examples: [],
      };
    },
  };
}

export function makeGameplayKindProbe(
  gameplay_source_id: string,
  table: 'gameplay_entity_defs' | 'gameplay_mechanics',
  kind: string,
  expected: number,
): Probe {
  const name = `F1.${gameplay_source_id}.gameplay_kind.${kind}_count`;
  return {
    name,
    family: 'regression',
    description: `Gameplay-kind probe: ${table}[gameplay_source_id=${gameplay_source_id}, kind=${kind}] equals ${expected}.`,
    run: async (ctx: ProbeContext): Promise<ProbeResult> => {
      // Gameplay rows are project-scoped via gameplay_source_id; we want this
      // probe to run when ctx.project matches gameplay_source_id semantically.
      // Runs only under ctx.project === gameplay_source_id to avoid duplicate
      // execution per project.
      if (ctx.project !== gameplay_source_id) {
        return {
          name,
          family: 'regression',
          description: '',
          status: 'PASS',
          count: 0,
          summary: `skipped (not ${gameplay_source_id} project)`,
          examples: [],
        };
      }
      const rows = await ctx.sql<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM ${ctx.sql(table)}
        WHERE gameplay_source_id=${gameplay_source_id} AND kind=${kind}
      `;
      const actual = rows[0]!.n;
      const status: ProbeStatus = actual === expected ? 'PASS' : 'FAIL';
      return {
        name,
        family: 'regression',
        description: '',
        status,
        count: actual,
        summary: `${kind}: actual=${actual}, expected=${expected}`,
        examples: [],
      };
    },
  };
}

const EZQUAKE_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('ezquake', 'asset_category', 30),
  makeFloorSourceStateProbe('ezquake', 'asset_category', { source_backed: 30 }),
  makeFloorCountProbe('ezquake', 'cmdline_param', 77),
  makeFloorSourceStateProbe('ezquake', 'cmdline_param', { doc_only: 1, source_backed: 69, source_retired: 7 }),
  makeFloorCountProbe('ezquake', 'command', 693),
  makeFloorSourceStateProbe('ezquake', 'command', { doc_only: 7, source_backed: 624, source_retired: 62 }),
  // Re-baselined 2026-05-18 (enforce-L1-runtime-truth arc Phase 3, migration
  // 015; review-findings F13). Phase 3's D21/Track-B deliverable recovers the
  // hidden HUD_Register command family (bare <name> + +hud_/-hud_) as
  // first-class type='command' entities: +129 (== the Phase-2 handler's own
  // _stats.source_total; bare 83 + plus 23 + minus 23). 564 -> 693 and
  // source_backed 495 -> 624 (doc_only=7 / source_retired=62 UNCHANGED).
  // Primary-source-verified legitimate growth, NOT regression/idempotency
  // inflation: 693 DISTINCT name_fold, 0 dup (UNIQUE(project,type,name_fold)
  // forbids re-run inflation), 693-129 == exactly the prior 564 baseline
  // (intact). The reference_qw_oracle_floor_vs_clean_reload family. No
  // decisions.md amendment -- D20/D21/X7 were always correct; this is a
  // stale calibrated snapshot catching up to a correct deliverable.
  // Re-baselined 2026-05-16 (entity-name source-case-fidelity arc, migration
  // 013). The prior 2997 / source_retired:209 floor was captured against a
  // DB snapshot that still carried 5 phantom `doc_only` cvar entities for
  // names that are really commands (scr_weaponstats_x/y/order/scale/
  // frame_color, floodprotmsg, userdir -- mis-listed under ezquake's own
  // help_variables.json; source has only Cmd_AddCommand). The first clean
  // reload let pruneCrossTypeOrphans delete them (its documented job).
  // source_backed (2741) is UNCHANGED -- no real cvar lost; the net is purely
  // the 5 retired phantoms. Idempotent thereafter.
  makeFloorCountProbe('ezquake', 'cvar', 2992),
  makeFloorSourceStateProbe('ezquake', 'cvar', { doc_only: 47, source_backed: 2741, source_retired: 204 }),
  makeFloorCountProbe('ezquake', 'flag_bit', 50),
  makeFloorSourceStateProbe('ezquake', 'flag_bit', { source_backed: 50 }),
  makeFloorCountProbe('ezquake', 'hud_element', 85),
  makeFloorSourceStateProbe('ezquake', 'hud_element', { source_backed: 83, source_retired: 2 }),
  makeFloorCountProbe('ezquake', 'keyname', 148),
  makeFloorSourceStateProbe('ezquake', 'keyname', { source_backed: 148 }),
  makeFloorCountProbe('ezquake', 'macro', 68),
  makeFloorSourceStateProbe('ezquake', 'macro', { doc_only: 2, source_backed: 66 }),
  makeFloorCountProbe('ezquake', 'ruleset', 6),
  makeFloorSourceStateProbe('ezquake', 'ruleset', { source_backed: 6 }),
  makeFloorCountProbe('ezquake', 'token_primitive', 33),
  makeFloorSourceStateProbe('ezquake', 'token_primitive', { source_backed: 33 }),
];

const FTE_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('fte', 'asset_category', 28),
  makeFloorSourceStateProbe('fte', 'asset_category', { source_backed: 28 }),
  makeFloorCountProbe('fte', 'cmdline_param', 108),
  makeFloorSourceStateProbe('fte', 'cmdline_param', { source_backed: 108 }),
  makeFloorCountProbe('fte', 'command', 556),
  makeFloorSourceStateProbe('fte', 'command', { source_backed: 556 }),
  makeFloorCountProbe('fte', 'cvar', 2482),
  makeFloorSourceStateProbe('fte', 'cvar', { source_backed: 2482 }),
  makeFloorCountProbe('fte', 'cvar_alias', 38),
  makeFloorSourceStateProbe('fte', 'cvar_alias', { source_backed: 38 }),
  makeFloorCountProbe('fte', 'macro', 67),
  makeFloorSourceStateProbe('fte', 'macro', { source_backed: 67 }),
];

const MVDSV_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('mvdsv', 'cmdline_param', 11),
  makeFloorSourceStateProbe('mvdsv', 'cmdline_param', { source_backed: 11 }),
  makeFloorCountProbe('mvdsv', 'command', 108),
  makeFloorSourceStateProbe('mvdsv', 'command', { source_backed: 108 }),
  makeFloorCountProbe('mvdsv', 'cvar', 183),
  makeFloorSourceStateProbe('mvdsv', 'cvar', { source_backed: 183 }),
  makeFloorCountProbe('mvdsv', 'info_key', 45),
  makeFloorSourceStateProbe('mvdsv', 'info_key', { source_backed: 45 }),
  makeFloorCountProbe('mvdsv', 'log_template', 691),
  makeFloorSourceStateProbe('mvdsv', 'log_template', { source_backed: 691 }),
  makeFloorCountProbe('mvdsv', 'protocol_message', 105),
  makeFloorSourceStateProbe('mvdsv', 'protocol_message', { source_backed: 105 }),
  makeFloorCountProbe('mvdsv', 'qc_builtin', 93),
  makeFloorSourceStateProbe('mvdsv', 'qc_builtin', { source_backed: 93 }),
];

const QWCL_FLOOR_PROBES: Probe[] = [
  makeFloorCountProbe('qwcl', 'cmdline_param', 72),
  makeFloorSourceStateProbe('qwcl', 'cmdline_param', { source_backed: 72 }),
  makeFloorCountProbe('qwcl', 'command', 121),
  makeFloorSourceStateProbe('qwcl', 'command', { source_backed: 121 }),
  makeFloorCountProbe('qwcl', 'cvar', 187),
  makeFloorSourceStateProbe('qwcl', 'cvar', { source_backed: 187 }),
];

const KTX_FLOOR_PROBES: Probe[] = [
  // Phase 7 (KTX onboarding) -- Pass 1 entity-table types (Phase 2) +
  // Pass 4.5 match_event (Phase 6). Counts are LIVE values at Phase 6
  // ship (commit e0133248), not the F1-F4 + F14 floor anchors -- the
  // anchors are floors; live counts include source-walked drift since
  // Pass 5 (e.g., cvar 260 = 192 k_-prefixed + 68 non-k_ literal-name
  // per Phase 2 Exhaustive Mapping Rule). Equality assertion against
  // post-Phase-6 snapshot per the post-v17 probe convention; bump the
  // expected value when KTX source legitimately gains/loses entries
  // (verified by source-walk).
  makeFloorCountProbe('ktx', 'cvar', 260),
  makeFloorSourceStateProbe('ktx', 'cvar', { source_backed: 260 }),
  makeFloorCountProbe('ktx', 'command', 358),
  makeFloorSourceStateProbe('ktx', 'command', { source_backed: 358 }),
  // info_key 56 = 47 userinfo (all-sites consumer emission 2026-05-27 +
  // cross-engine re-synth) + 6 serverinfo world-reads + 3 new userinfo,
  // after the _handler_info_keys.py entity-aware-scope + infokey() fix
  // (2026-06-04, source-walked). Prior floor 7 was the old producer-only
  // star keys and predated the all-sites emission arc.
  makeFloorCountProbe('ktx', 'info_key', 56),
  makeFloorSourceStateProbe('ktx', 'info_key', { source_backed: 56 }),
  makeFloorCountProbe('ktx', 'log_template', 1195),
  makeFloorSourceStateProbe('ktx', 'log_template', { source_backed: 1195 }),
  makeFloorCountProbe('ktx', 'match_event', 7),
  makeFloorSourceStateProbe('ktx', 'match_event', { source_backed: 7 }),
];

const KTX_GAMEPLAY_KIND_PROBES: Probe[] = [
  // Phase 7 (KTX onboarding) -- per-kind equality probes for the gameplay
  // tables. Counts are LIVE values at Phase 6 ship; mode_default=317 is the
  // shipped count (F6 had ~309 estimate; Phase 3 + Phase 5.5 retrofit
  // confirmed 317 across parallel + serial runs). Bump expected when KTX
  // source legitimately gains/loses entries (verified by source-walk).
  makeGameplayKindProbe('ktx', 'gameplay_entity_defs', 'monster', 13),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'game_mode', 27),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'mode_default', 317),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'election_type', 5),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'death_rule', 27),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'score_system', 3),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'drop_item', 31),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'loc_macro', 15),
  makeGameplayKindProbe('ktx', 'gameplay_mechanics', 'teamplay_message', 21),
];

// ---------------------------------------------------------------------------
// Phase 6 anchor probes (2026-04-28) -- per-project load-bearing invariants
// ---------------------------------------------------------------------------

async function probeEzquakeGlLightmodePingPong(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ezquake.anchor.gl_lightmode_ping_pong';
  if (ctx.project !== 'ezquake') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ezquake project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(DISTINCT cv.default_value || ':' || cv.version)::int AS n
    FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='ezquake' AND e.name='gl_lightmode'
  `;
  const expected = 15;
  const actual = rows[0]!.n;
  return {
    name,
    family: 'regression',
    description: `gl_lightmode distinct (default_value, version) tuples equals ${expected}`,
    status: actual === expected ? 'PASS' : 'FAIL',
    count: actual,
    summary: `gl_lightmode distinct (default_value,version) tuples: actual=${actual}, expected=${expected}`,
    examples: [],
  };
}

async function probeEzquakeDocOnlyCount(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ezquake.anchor.doc_only_count';
  if (ctx.project !== 'ezquake') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ezquake project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='ezquake' AND source_state='doc_only'
  `;
  const expected = 57;
  const actual = rows[0]!.n;
  return {
    name,
    family: 'regression',
    description: `total ezquake doc_only entities equals ${expected}`,
    status: actual === expected ? 'PASS' : 'FAIL',
    count: actual,
    summary: `ezquake doc_only entities: actual=${actual}, expected=${expected}`,
    examples: [],
  };
}

async function probeEzquakeNoCommentPromotion(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ezquake.anchor.no_comment_promotion';
  if (ctx.project !== 'ezquake') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ezquake project)', examples: [] };
  }
  // Two-audience model (slime, 2026-05-15): a source `// trailing comment`
  // is coder rationale, NOT user documentation; it must never be promoted
  // into the help-JSON `desc` field. The 2026-05-15 _handler_cvars.py fix
  // removed that promotion. Post-fix the extractor only sets help_desc from
  // a genuine upstream help_*.json `desc`, so help_desc byte-identical to
  // trailing_comment with description_origin='help_json' can only be a
  // genuine dual-authored upstream mirror. Exactly three exist (cl_voip_*);
  // a regression of the promotion makes this jump to ~47. See parking doc
  // 2026-05-15-l1-extractor-entity-classification-followups.md.
  const rows = await ctx.sql<{ n: number; names: string[] }[]>`
    SELECT COUNT(DISTINCT e.id)::int AS n,
           COALESCE(ARRAY_AGG(DISTINCT e.name), '{}') AS names
    FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id
    WHERE e.project='ezquake' AND e.type='cvar'
      AND e.description_origin='help_json'
      AND cv.help_desc IS NOT NULL AND cv.help_desc = cv.trailing_comment
  `;
  const expected = 3;
  const actual = rows[0]!.n;
  return {
    name,
    family: 'regression',
    description: `ezquake cvars with help_desc==trailing_comment AND origin help_json equals ${expected} (genuine upstream mirrors only; > expected means comment-promotion regressed)`,
    status: actual === expected ? 'PASS' : 'FAIL',
    count: actual,
    summary: `ezquake comment-promotion guard: actual=${actual}, expected=${expected} (${(rows[0]!.names || []).slice().sort().join(', ')})`,
    examples: [],
  };
}

async function probeQwclAllSourceBacked(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.qwcl.anchor.all_source_backed';
  if (ctx.project !== 'qwcl') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not qwcl project)', examples: [] };
  }
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM entities
    WHERE project='qwcl' AND source_state != 'source_backed'
  `;
  const actual = rows[0]!.n;
  return {
    name,
    family: 'regression',
    description: 'qwcl has no help-JSON, so every entity must be source_backed',
    status: actual === 0 ? 'PASS' : 'FAIL',
    count: actual,
    summary: `qwcl entities with non-source_backed state: actual=${actual}, expected=0`,
    examples: [],
  };
}

async function probeFteEngineVsPluginEzhudSplit(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.fte.anchor.engine_vs_plugin_ezhud_split';
  if (ctx.project !== 'fte') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not fte project)', examples: [] };
  }
  const rows = await ctx.sql<{ source_root: string; n: number }[]>`
    SELECT cv.source_root, COUNT(*)::int AS n
    FROM cvar_versions cv
    JOIN entities e ON cv.entity_id=e.id
    WHERE e.project='fte' AND cv.version='head'
    GROUP BY cv.source_root
  `;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.source_root] = r.n;
  const expectedEngine = 1397;
  const expectedPluginEzhud = 1085;
  const actualEngine = counts['engine'] ?? 0;
  const actualPluginEzhud = counts['plugin:ezhud'] ?? 0;
  const ok = actualEngine === expectedEngine && actualPluginEzhud === expectedPluginEzhud;
  return {
    name,
    family: 'regression',
    description: `fte cvar_versions split (version=head): engine=${expectedEngine} + plugin:ezhud=${expectedPluginEzhud}`,
    status: ok ? 'PASS' : 'FAIL',
    count: actualEngine + actualPluginEzhud,
    summary: `engine: actual=${actualEngine} expected=${expectedEngine}, plugin:ezhud: actual=${actualPluginEzhud} expected=${expectedPluginEzhud}`,
    examples: [],
  };
}

async function probeKtxScoreSystemPositionsLength10(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.score_system_positions_length_10';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string; n: number }[]>`
    SELECT name, jsonb_array_length(props_json -> 'positions')::int AS n
    FROM gameplay_mechanics
    WHERE gameplay_source_id='ktx' AND kind='score_system'
  `;
  const violations = rows.filter(r => r.n !== 10);
  return {
    name,
    family: 'regression',
    description: 'every KTX score_system row has positions array length=10 (F10 invariant)',
    status: violations.length === 0 ? 'PASS' : 'FAIL',
    count: violations.length,
    summary: violations.length === 0 ? `all ${rows.length} score_system rows have positions length=10` : `${violations.length} violations`,
    examples: violations.slice(0, 5).map(r => `${r.name}: positions length=${r.n}`),
  };
}

async function probeKtxMonstersHaveHpForKill(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.monsters_have_hp_for_kill';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ name: string }[]>`
    SELECT name FROM gameplay_entity_defs
    WHERE gameplay_source_id='ktx' AND kind='monster'
      AND (props_json -> 'hp_for_kill') IS NULL
  `;
  return {
    name,
    family: 'regression',
    description: 'every KTX monster row has props_json.hp_for_kill non-NULL (F9 amended source-faithful field name)',
    status: rows.length === 0 ? 'PASS' : 'FAIL',
    count: rows.length,
    summary: rows.length === 0 ? 'all monster rows carry hp_for_kill' : `${rows.length} monster rows missing hp_for_kill`,
    examples: rows.slice(0, 5).map(r => r.name),
  };
}

async function probeKtxFishFirstInMonsters(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.fish_first_in_monsters';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{ array_position: string | null; is_first_required: string | null }[]>`
    SELECT (props_json ->> 'array_position') AS array_position,
           (props_json ->> 'is_first_required') AS is_first_required
    FROM gameplay_entity_defs
    WHERE gameplay_source_id='ktx' AND kind='monster' AND name='monster_fish'
  `;
  const row = rows[0];
  const ok = !!row && row.array_position === '0' && row.is_first_required === 'true';
  const summary = ok
    ? "fish is first (array_position=0, is_first_required=true)"
    : `fish row got array_position='${row?.array_position ?? '<missing>'}' is_first_required='${row?.is_first_required ?? '<missing>'}'`;
  return {
    name,
    family: 'regression',
    description: 'monster_fish row is at array_position=0 AND is_first_required=true (sp_monsters.c source comment "FISH _MUST_ BE _FIRST_"; QC classname is monster_fish)',
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary,
    examples: [],
  };
}

async function probeKtxMatchEventCount7WithAttributes(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.match_event_count_7_with_attributes';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  const rows = await ctx.sql<{
    entity_count: number;
    versions_with_attrs: number;
    versions_with_sites: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM entities WHERE project='ktx' AND type='match_event') AS entity_count,
      (SELECT COUNT(*)::int FROM match_event_versions
        WHERE attributes_json IS NOT NULL AND jsonb_typeof(attributes_json)='array') AS versions_with_attrs,
      (SELECT COUNT(*)::int FROM match_event_versions
        WHERE emission_call_sites_json IS NOT NULL AND jsonb_typeof(emission_call_sites_json)='array') AS versions_with_sites
  `;
  const r = rows[0]!;
  const ok = r.entity_count === 7 && r.versions_with_attrs >= 7 && r.versions_with_sites >= 7;
  return {
    name,
    family: 'regression',
    description: 'KTX match_event count=7 (F14 anchor) AND every match_event_versions row has attributes_json (array) + emission_call_sites_json (array) (D14 JSONB shape; attributes_json stores array of attribute descriptors)',
    status: ok ? 'PASS' : 'FAIL',
    count: ok ? 0 : 1,
    summary: `entities=${r.entity_count} (expected 7), versions with attrs object=${r.versions_with_attrs} (>=7), versions with sites array=${r.versions_with_sites} (>=7)`,
    examples: [],
  };
}

async function probeKtxDualRowLogTemplateMatchEvent(ctx: ProbeContext): Promise<ProbeResult> {
  const name = 'F1.ktx.anchor.dual_row_design_log_template_match_event';
  if (ctx.project !== 'ktx') {
    return { name, family: 'regression', description: '', status: 'PASS', count: 0, summary: 'skipped (not ktx project)', examples: [] };
  }
  // Per D10 + F17: every match_event has >=1 log_template peer with
  // channel='logfile' AND format_string carrying XML markup. Live KTX
  // log_printf format strings are FULL multi-line concatenated literals
  // (`\t\t<event>\n\t\t\t<damage>\n...`); the per-event tab-prefix shape
  // varies (some open with `\t\t<event>`, some with `\t<events>`, some
  // with `<ktxlog ...>`). The dual-row invariant is: at least 7 KTX
  // logfile rows contain XML-tag content. F23/F27 pattern: design holds,
  // probe wording adapted from "tab-prefix matches" to "XML markup
  // present". F17 amendment 2026-05-06 captures the relaxation.
  const rows = await ctx.sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM log_template_versions lv
    JOIN entities e ON lv.entity_id=e.id
    WHERE e.project='ktx' AND e.type='log_template'
      AND lv.channel='logfile'
      AND lv.format_string LIKE '%<%>%'
  `;
  const n = rows[0]!.n;
  const ok = n >= 7;
  return {
    name,
    family: 'regression',
    description: 'dual-row design holds: at least 7 KTX log_template rows with channel=logfile + XML markup (D10 + F17; F17 amendment 2026-05-06 relaxes prefix-shape to XML-tag-content)',
    status: ok ? 'PASS' : 'FAIL',
    count: n,
    summary: ok ? `${n} dual-row peers present` : `only ${n} dual-row peers (expected >=7)`,
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
  { name: 'F1.jsonb_columns_not_strings', family: 'regression', description: '', run: probeJsonbNotStrings },
  // arc: enforce-L1-runtime-truth -- Track A/B reachability column shape gate (Phase 3 / R2 + D12)
  { name: 'F1.runtime_fidelity_shape', family: 'regression', description: '', run: probeRuntimeFidelityShape },
  // arc: ktx-categorize (2026-05-22) -- category_inferred + provenance sibling XOR gate (v19 / migration 016)
  { name: 'F1.category_inferred_provenance_integrity', family: 'regression', description: '', run: probeCategoryInferredProvenanceIntegrity },
  // arc: enforce-L1-runtime-truth Phase 5 / Task 3 -- signal-pool level discipline + Track-B first-class gate
  { name: 'F1.callgraph_signal_pool_coverage', family: 'regression', description: '', run: probeCallgraphSignalPoolCoverage },
  { name: 'F1.hud_recovery_first_class', family: 'regression', description: '', run: probeHudRecoveryFirstClass },
  // arc: ktx-mvdsv-l1-describe-fill C5 probes -- origin-tag vocabulary + synthesized-anchor (Phase 1)
  { name: 'F1.describe_fill.origin_vocabulary', family: 'regression', description: '', run: probeDescribeFillOriginVocabulary },
  { name: 'F1.describe_fill.synthesized_requires_anchor', family: 'regression', description: '', run: probeDescribeFillSynthesizedRequiresAnchor },
  { name: 'F1.describe_fill.provenance_entry_exists', family: 'regression', description: '', run: probeDescribeFillProvenanceEntryExists },
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
  // MVDSV count-floor + classification + sanity probes (Phase 2e)
  { name: 'F1.mvdsv.cvars_source_backed_count', family: 'regression', description: '', run: probeMvdsvCvarsSourceBackedCount },
  { name: 'F1.mvdsv.commands_count', family: 'regression', description: '', run: probeMvdsvCommandsCount },
  { name: 'F1.mvdsv.cmdline_params_count', family: 'regression', description: '', run: probeMvdsvCmdlineParamsCount },
  { name: 'F1.mvdsv.protocol_messages_count', family: 'regression', description: '', run: probeMvdsvProtocolMessagesCount },
  { name: 'F1.mvdsv.info_keys_count', family: 'regression', description: '', run: probeMvdsvInfoKeysCount },
  { name: 'F1.mvdsv.log_templates_count', family: 'regression', description: '', run: probeMvdsvLogTemplatesCount },
  { name: 'F1.mvdsv.qc_builtins_count', family: 'regression', description: '', run: probeMvdsvQcBuiltinsCount },
  { name: 'F1.mvdsv.all_source_backed', family: 'regression', description: '', run: probeMvdsvAllSourceBacked },
  { name: 'F1.mvdsv.sv_maxfps_default_77', family: 'regression', description: '', run: probeMvdsvMaxfpsDefault77 },
  { name: 'F1.mvdsv.svc_print_value_8', family: 'regression', description: '', run: probeMvdsvSvcPrintValue8 },
  { name: 'F1.mvdsv.makevectors_builtin_1', family: 'regression', description: '', run: probeMvdsvMakevectorsBuiltin1 },
  // Phase 6 floor probes (added 2026-04-28) -- universal mechanical floor
  // (entity_type x {count, source_state}) across all four projects.
  ...EZQUAKE_FLOOR_PROBES,
  ...FTE_FLOOR_PROBES,
  ...MVDSV_FLOOR_PROBES,
  ...QWCL_FLOOR_PROBES,
  ...KTX_FLOOR_PROBES,
  ...KTX_GAMEPLAY_KIND_PROBES,
  // Phase 6 anchor probes (added 2026-04-28) -- per-project load-bearing invariants.
  { name: 'F1.ezquake.anchor.gl_lightmode_ping_pong', family: 'regression', description: '', run: probeEzquakeGlLightmodePingPong },
  { name: 'F1.ezquake.anchor.doc_only_count', family: 'regression', description: '', run: probeEzquakeDocOnlyCount },
  { name: 'F1.ezquake.anchor.no_comment_promotion', family: 'regression', description: '', run: probeEzquakeNoCommentPromotion },
  { name: 'F1.qwcl.anchor.all_source_backed', family: 'regression', description: '', run: probeQwclAllSourceBacked },
  { name: 'F1.fte.anchor.engine_vs_plugin_ezhud_split', family: 'regression', description: '', run: probeFteEngineVsPluginEzhudSplit },
  // KTX anchor probes (added 2026-05-06) -- per-project load-bearing invariants
  // for KTX onboarding (F5-F14 anchors + D10 dual-row design + D14 JSONB shape).
  { name: 'F1.ktx.anchor.score_system_positions_length_10', family: 'regression', description: '', run: probeKtxScoreSystemPositionsLength10 },
  { name: 'F1.ktx.anchor.monsters_have_hp_for_kill', family: 'regression', description: '', run: probeKtxMonstersHaveHpForKill },
  { name: 'F1.ktx.anchor.fish_first_in_monsters', family: 'regression', description: '', run: probeKtxFishFirstInMonsters },
  { name: 'F1.ktx.anchor.match_event_count_7_with_attributes', family: 'regression', description: '', run: probeKtxMatchEventCount7WithAttributes },
  { name: 'F1.ktx.anchor.dual_row_design_log_template_match_event', family: 'regression', description: '', run: probeKtxDualRowLogTemplateMatchEvent },
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
  // MVDSV distribution + coverage probes (Phase 2e)
  { name: 'F2.mvdsv.log_template_channels_count', family: 'anomaly', description: '', run: probeMvdsvLogTemplateChannelsCount },
  { name: 'F2.mvdsv.info_key_scopes_distribution', family: 'anomaly', description: '', run: probeMvdsvInfoKeyScopesDistribution },
  { name: 'F2.mvdsv.protocol_message_kinds_distribution', family: 'anomaly', description: '', run: probeMvdsvProtocolMessageKindsDistribution },
  { name: 'F2.mvdsv.qc_builtin_tables', family: 'anomaly', description: '', run: probeMvdsvQcBuiltinTables },
  { name: 'F2.mvdsv.trailing_comment_coverage_cvars', family: 'anomaly', description: '', run: probeMvdsvTrailingCommentCoverageCvars },
];

export interface QualityGridOptions {
  sql: postgres.Sql;
  project: Project;
  family?: 'regression' | 'anomaly' | 'both';
  probeFilter?: string;
}

export async function runQualityGrid(options: QualityGridOptions): Promise<ProbeResult[]> {
  const family = options.family ?? 'both';
  const probes: Probe[] = [];
  if (family === 'regression' || family === 'both') probes.push(...REGRESSION_PROBES);
  if (family === 'anomaly' || family === 'both') probes.push(...ANOMALY_PROBES);
  const filtered = options.probeFilter
    ? probes.filter(p => p.name === options.probeFilter)
    : probes;
  // Probes run sequentially: each opens its own queries against the shared
  // postgres-js Sql handle, and a probe that throws should be reported as
  // ERROR without aborting the rest. Parallel Promise.all would surface only
  // the first rejection and lose the per-probe diagnostic.
  const results: ProbeResult[] = [];
  for (const probe of filtered) {
    try {
      const r = await probe.run({ sql: options.sql, project: options.project });
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
      lines.push(`${tag} ${r.name} -- ${r.summary}`);
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
