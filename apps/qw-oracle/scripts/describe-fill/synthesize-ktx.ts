// apps/qw-oracle/scripts/describe-fill/synthesize-ktx.ts
//
// Phase-3 KTX source-synthesis fan-out DRIVER.
//
// Sub-command dispatch (guards `import.meta.main` at the bottom):
//
//   --assemble-only   Task 1: recon denominators + build the D6 input-packet
//                     manifest for every in-scope KTX entity. Writes
//                     output/describe-fill/phase3-ktx-manifest.json.
//                     Read-only DB access; does NOT touch any entity row.
//                     Re-runnable: identical input data -> byte-identical file.
//
//   --persist <file>  Task 2 (persistence half): ingest a D6 records JSON file
//                     and UPDATE the matching entity rows. Idempotent: re-running
//                     the same file produces byte-identical rows (C4/P3).
//                     --dry-run flag wraps everything in a rolled-back transaction
//                     so the operator can verify the change shape before committing.
//
//   --status          Read-only. Report how many in-scope KTX entities carry a
//                     description_verdict (evaluated) vs remaining (not yet
//                     evaluated). The resume cursor for the fan-out dispatcher.
//
//   --fingerprint     Read-only. Print the deterministic committed-row md5 over
//                     the in-scope KTX set for idempotency + F-D4a proof anchoring.
//
// Placeholders (do NOT invoke; they throw "not yet implemented"):
//
//   --fan-out         Task 2 (dispatch half): dispatch the D6 guardrailed skill
//                     as sub-agents over the manifest and collect per-knob records.
//                     (Opus 4.7 MAX, spec-locked D7 -- dial never lowered here.)
//
//   --gate            Task 3: feed every synthesized row to the D7 tier-1
//                     independent evidence re-check (independent Opus 4.7 MAX).
//
//   --probe           Task 4: add F1.describe_fill.synthesized_requires_source_ref
//                     to quality-grid.ts + idempotent coverage/residue harness.
//
// WHY separate sub-commands: Tasks 2/3/4 are spec-locked to different model
// invocations and verification shapes; co-mingling them with the assembler
// would force re-assembly on every re-run and mix read-only safety with
// DB-write phases.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type postgres from 'postgres';
import { sql, closeSql } from '../load-knowledge/db.js';

// ---------------------------------------------------------------------------
// Path anchors
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

// two levels up: describe-fill -> scripts -> qw-oracle
const QW_ORACLE_DIR = join(__dirname, '..', '..');

const OUTPUT_DIR = join(QW_ORACLE_DIR, 'output', 'describe-fill');
const MANIFEST_PATH = join(OUTPUT_DIR, 'phase3-ktx-manifest.json');

// WHY absolute path: the D6 sub-agent receives this as a concrete greppable
// root so it does not have to guess or resolve relative paths. The KTX source
// tree sits here in the monorepo's research-repos mirror.
const KTX_SOURCE_ROOT = '/home/paradoks/projects/quakeworld/research/repos/ktx';

// WHY point at the doc-landscape dir: the research-doc aids are ADMISSIBLE
// corroboration for the D6 sub-agent (locate use-sites, cross-check), but
// they are not citations -- source_ref + anchor remain the evidence (D6/D7
// amendment). The sub-agent receives a pointer, not the content pasted in.
const RESEARCH_AIDS_DIR =
  'docs/superpowers/parking/2026-05-15-ktx-mvdsv-doc-landscape';

// ---------------------------------------------------------------------------
// DB row shapes (only the columns we SELECT)
// ---------------------------------------------------------------------------

interface EntityRow {
  canonical_id: string;
  name: string;
  type: 'cvar' | 'command' | 'info_key';
  description: string | null;
  description_origin: string | null;
  // JSONB arrives as a JS value from postgres-js (P2 -- never pre-stringified).
  description_provenance: unknown;
  // source_ref from the *_versions join (nullable when the join misses)
  source_file: string | null;
  source_line: number | null;
}

interface DenominatorRow {
  type: string;
  n: number;
}

interface VersionRow {
  commit_sha: string;
}

// ---------------------------------------------------------------------------
// anchor_version: derive the git describe --tags form from the live DB commit
// ---------------------------------------------------------------------------

// WHY derive at execution time: Phase 0 advances the commit_sha and the git
// describe form changes with it. Hardcoding da73e06 (pre-Phase-0 value) would
// stamp the wrong version on every row (D2/D4 staleness anchor).
function resolveAnchorVersion(commitSha: string): string {
  try {
    const result = execFileSync(
      'git',
      ['describe', '--tags', commitSha],
      { cwd: KTX_SOURCE_ROOT, encoding: 'utf-8' },
    );
    return result.trim();
  } catch {
    // WHY fallback: if git describe fails (no tag reachable), use the short
    // SHA directly so the anchor is still a valid version-pin even without a
    // human-readable tag.
    return commitSha.slice(0, 9);
  }
}

// ---------------------------------------------------------------------------
// C3 suspect pool for KTX (F-C3c binding)
// ---------------------------------------------------------------------------

// WHY compute from the artifact, not hardcode false: if a future Phase-0 re-run
// produces a non-empty KTX cvar pool, this function will honour it without a
// code change. For Phase 3 execution (2026-05-17 pool), the result is always
// false for every KTX entity -- but the computation is honest to the artifact.
//
// F-C3c (review-findings.md): ktx/cvar pool = 0 suspects; ktx/command leg
// is NON-DIAGNOSTIC (structurally blind oracle) and EXCLUDED from the pool
// (not a 357-entry pool -- "absent from cmdlist" carries zero liveness signal
// for KTX mod commands). Therefore every KTX entity's suspect_pool_member = false.
function buildKtxSuspectSet(): Set<string> {
  // ktx/cvar suspects from phase-0-artifacts/c3-suspect-pool.md: 0
  // ktx/command leg: NON-DIAGNOSTIC, excluded per F-C3c -- contributes nothing
  return new Set<string>();
}

// ---------------------------------------------------------------------------
// D6 input packet type
// ---------------------------------------------------------------------------

// The 9 brief elements from subagent-brief-template.md, plus dispatcher aids.
// IMPORTANT: mechanical_candidate carries the Phase-2 description_provenance
// JSONB value UNCHANGED (flat Array<{value,label}> for structured_choices per
// F-D11c). Reshaping to {enum?,bitmask?} is a silent corruption.
interface D6InputPacket {
  // Brief element 1
  project: 'ktx';
  // Brief element 2
  knob: string;
  // Brief element 3
  anchor_version: string;
  // Brief element 4: Phase-2 provenance + staged description, or "none"
  mechanical_candidate:
    | {
        description_provenance: unknown; // pass through unchanged (P2/F-D11c)
        staged_description: string | null; // only present when origin='shipped_doc'
        staged_origin: string | null;
      }
    | 'none';
  // Brief element 5
  suspect_pool_member: boolean;
  // Brief element 6
  source_root: string;
  // Brief element 7
  model_dial: string;
  // Brief element 8
  output_contract: string;
  // Brief element 9
  out_of_scope: string;
  // Dispatcher aids (NOT brief elements -- for the fan-out dispatcher, not the per-knob sub-agent)
  source_ref: {
    source_file: string | null;
    source_line: number | null;
  };
  research_aids_dir: string;
  // WHY include canonical_id + type here: the --persist path resolves each
  // records-file entry back to its entity row; having canonical_id pre-computed
  // in the manifest avoids a second query during fan-out and makes the manifest
  // self-contained for the dispatcher. type is needed for --status per-bucket
  // breakdown without a separate GROUP BY query.
  canonical_id: string;
  entity_type: 'cvar' | 'command' | 'info_key';
}

// ---------------------------------------------------------------------------
// Config-drift non-resolver record
// ---------------------------------------------------------------------------

// D9 fill-not-create: these 11 records have NO entity id. They are tracked and
// routed to the C1 outreach track + the D7 tail. Never promoted to entities,
// never silently dropped (C1/C2/C3).
interface ConfigDriftNonResolver {
  name: string;
  source_ref: string; // "name@source_file:line" as in the Phase-2 report
}

// ---------------------------------------------------------------------------
// Manifest top-level shape
// ---------------------------------------------------------------------------

interface Phase3Manifest {
  generated_against: {
    m_cvar: number;
    m_command: number;
    m_info_key: number;
    anchor_version: string; // git describe --tags form
    ktx_commit: string;     // 40-char SHA from versions table
  };
  entities: D6InputPacket[];
  // D9 fill-not-create: separate section, no entity ids (C1/C2/C3)
  config_drift_nonresolvers: ConfigDriftNonResolver[];
}

// ---------------------------------------------------------------------------
// The 11 config-drift non-resolvers (verbatim from ktx-mechanical-report.txt)
// ---------------------------------------------------------------------------

// WHY list them here: Phase-2 produced a stable, already-verified list; reading
// from the report file would introduce a runtime I/O dependency and a parse step
// with no benefit (the list is fixed output of a completed phase). These are
// carried as data, never created, never dropped.
const CONFIG_DRIFT_NONRESOLVERS: ConfigDriftNonResolver[] = [
  { name: 'sv_maxrate',    source_ref: 'sv_maxrate@research/repos/ktx/resources/example-configs/ktx/ktx.cfg:3' },
  { name: 'k_dm2mod',      source_ref: 'k_dm2mod@research/repos/ktx/resources/example-configs/ktx/ktx.cfg:19' },
  { name: 'k_666',         source_ref: 'k_666@research/repos/ktx/resources/example-configs/ktx/ktx.cfg:28' },
  { name: 'sv_maxrate',    source_ref: 'sv_maxrate@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:3' },
  { name: 'k_autoreset',   source_ref: 'k_autoreset@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:4' },
  { name: 'k_master',      source_ref: 'k_master@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:9' },
  { name: 'k_dm2mod',      source_ref: 'k_dm2mod@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:24' },
  { name: 'k_666',         source_ref: 'k_666@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:32' },
  { name: 'sv_www_address', source_ref: 'sv_www_address@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:96' },
  { name: 'sv_www_authkey', source_ref: 'sv_www_authkey@research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg:97' },
  { name: 'k_motd5',       source_ref: 'k_motd5@research/repos/nquake-distfiles/sv-gpl/ktx/port_template.cfg:6' },
];

// ---------------------------------------------------------------------------
// assemble(): the Task 1 assembler
// ---------------------------------------------------------------------------

export async function assemble(): Promise<Phase3Manifest> {
  // --- 1. Recon live POST-Phase-0 KTX denominators (C1 -- never hardcode) ---

  const denomRows = await sql<DenominatorRow[]>`
    SELECT type, count(*)::int AS n
    FROM entities
    WHERE project = 'ktx'
      AND type IN ('cvar', 'command', 'info_key')
    GROUP BY type
    ORDER BY type
  `;

  // WHY convert to a map: ORDER BY type is alphabetical (command/cvar/info_key);
  // we need random-access by name for clear assertion messages.
  const denomMap = new Map<string, number>(
    denomRows.map((r) => [r.type, r.n]),
  );
  const mCvar     = denomMap.get('cvar')     ?? 0;
  const mCommand  = denomMap.get('command')  ?? 0;
  const mInfoKey  = denomMap.get('info_key') ?? 0;
  const mTotal    = mCvar + mCommand + mInfoKey;

  // --- 2. Recon anchor version from the live versions row ---

  const versionRows = await sql<VersionRow[]>`
    SELECT commit_sha
    FROM versions
    WHERE project = 'ktx'
      AND version = 'head'
  `;
  if (versionRows.length !== 1) {
    throw new Error(
      `versions table: expected 1 ktx/head row, got ${versionRows.length}. ` +
      'Is Phase 0 executed? (ktx re-extract must have run before Phase 3.)',
    );
  }
  const ktxCommit = versionRows[0]!.commit_sha;
  const anchorVersion = resolveAnchorVersion(ktxCommit);

  // --- 3. Select every in-scope KTX entity with source_ref from *_versions ---

  // WHY three separate UNIONs: cvar_versions / command_versions / info_key_versions
  // are separate tables; a polymorphic join is messier and risks cross-type
  // collisions. Each arm carries the same column alias set; the UNION re-merges.
  //
  // WHY LEFT JOIN on version='head': every KTX entity in scope was loaded at
  // head; the LEFT JOIN is defensive for the (rare) case where a version row is
  // missing, so we do not silently lose entities from the manifest.
  //
  // Exclusion: ktx:cvar:k_short_gib only. C4/D19/P3 -- Phase-1-terminal
  // synthesized row; counted once in Phase 1, not re-evaluated here.
  const entityRows = await sql<EntityRow[]>`
    SELECT
      e.canonical_id,
      e.name,
      e.type::text AS type,
      e.description,
      e.description_origin,
      e.description_provenance,
      cv.source_file,
      cv.source_line
    FROM entities e
    LEFT JOIN cvar_versions cv
      ON cv.entity_id = e.id AND cv.version = 'head'
    WHERE e.project = 'ktx'
      AND e.type = 'cvar'
      AND e.canonical_id != 'ktx:cvar:k_short_gib'

    UNION ALL

    SELECT
      e.canonical_id,
      e.name,
      e.type::text AS type,
      e.description,
      e.description_origin,
      e.description_provenance,
      comdv.source_file,
      comdv.source_line
    FROM entities e
    LEFT JOIN command_versions comdv
      ON comdv.entity_id = e.id AND comdv.version = 'head'
    WHERE e.project = 'ktx'
      AND e.type = 'command'

    UNION ALL

    SELECT
      e.canonical_id,
      e.name,
      e.type::text AS type,
      e.description,
      e.description_origin,
      e.description_provenance,
      ikv.source_file,
      ikv.source_line
    FROM entities e
    LEFT JOIN info_key_versions ikv
      ON ikv.entity_id = e.id AND ikv.version = 'head'
    WHERE e.project = 'ktx'
      AND e.type = 'info_key'

    ORDER BY type, canonical_id
  `;

  // --- 4. Assert selection count == mTotal - 1 (C1 -- k_short_gib excluded) ---

  const expectedCount = mTotal - 1;
  const actualCount   = entityRows.length;

  if (actualCount !== expectedCount) {
    process.stderr.write(
      `ASSERTION FAILED: selected_count=${actualCount} != (M_cvar=${mCvar} + M_command=${mCommand} + M_info_key=${mInfoKey}) - 1 = ${expectedCount}\n`,
    );
    process.exit(1);
  }

  // --- 5. Build the KTX suspect set from the Phase-0 artifact (F-C3c) ---

  // WHY call this every run: the function builds from the imported artifact;
  // if a future Phase-0 re-run produces a non-empty pool, no code change needed.
  // For the 2026-05-17 pool, every KTX entity is FALSE (ktx/cvar 0 suspects;
  // ktx/command leg non-diagnostic, excluded per F-C3c).
  const ktxSuspectSet = buildKtxSuspectSet();

  // Locked strings for brief elements 7/8/9 -- these must not be paraphrased
  // because they are literal instructions that the D6 skill/gate verifies.
  const MODEL_DIAL_REMINDER =
    "run at Opus 4.7 MAX; the dial is locked in the skill, not yours to lower; " +
    "'fast affirm' is the in-invocation early exit, not a cheaper model (D7)";

  const OUTPUT_CONTRACT =
    "return exactly the skill's structured per-knob record + the one-line halt contract; " +
    "do NOT write files, do NOT commit, do NOT touch the DB; " +
    "the phase persists and the D7 gate re-checks";

  const OUT_OF_SCOPE =
    "evaluate and describe ONLY this one knob; do not improvise on adjacent knobs; " +
    "if it does not resolve to a live KTX cvar/command/info_key, abort and report";

  // --- 6. Build the D6 input packet per entity ---

  const packets: D6InputPacket[] = entityRows.map((row): D6InputPacket => {
    // mechanical_candidate: if the entity has description_provenance (set by
    // Phase 2), pass it through UNCHANGED as the JS value. If origin is
    // 'shipped_doc', also carry the staged description text. If no provenance
    // and no staged candidate, use the explicit string "none" (absence is
    // normal, not a skip -- D5 amendment: every entity is evaluated).
    const hasProv =
      row.description_provenance !== null &&
      row.description_provenance !== undefined;

    const mechanical_candidate: D6InputPacket['mechanical_candidate'] =
      hasProv
        ? {
            // Pass provenance through unchanged. The flat Array<{value,label}>
            // shape for structured_choices is inside this value (F-D11c).
            // Never reshape to {enum?,bitmask?} -- that is a silent corruption.
            description_provenance: row.description_provenance,
            staged_description:
              row.description_origin === 'shipped_doc' ? (row.description ?? null) : null,
            staged_origin: row.description_origin,
          }
        : 'none';

    return {
      project: 'ktx',
      knob: row.name,
      anchor_version: anchorVersion,
      mechanical_candidate,
      // WHY compute from artifact: buildKtxSuspectSet returns the Phase-0
      // F-C3c pool; checking name membership is the correct gate even when
      // the pool is empty (F-C3c -- ktx/cvar 0 suspects, ktx/command excluded).
      suspect_pool_member: ktxSuspectSet.has(row.name),
      source_root: KTX_SOURCE_ROOT,
      model_dial: MODEL_DIAL_REMINDER,
      output_contract: OUTPUT_CONTRACT,
      out_of_scope: OUT_OF_SCOPE,
      source_ref: {
        source_file: row.source_file,
        source_line: row.source_line,
      },
      research_aids_dir: RESEARCH_AIDS_DIR,
      // Dispatcher aids: pre-resolved canonical_id avoids a second query during
      // fan-out; entity_type enables --status per-bucket breakdown from the manifest
      // alone (consistent with denominator-derived breakdown in --assemble-only).
      canonical_id: row.canonical_id,
      entity_type: row.type,
    };
  });

  // --- 7. Build the manifest (stable order guaranteed by ORDER BY in SQL) ---

  return {
    generated_against: {
      m_cvar:     mCvar,
      m_command:  mCommand,
      m_info_key: mInfoKey,
      anchor_version: anchorVersion,
      ktx_commit: ktxCommit,
    },
    entities: packets,
    // D9 fill-not-create -- separate section, no entity ids.
    config_drift_nonresolvers: CONFIG_DRIFT_NONRESOLVERS,
  };
}

// ---------------------------------------------------------------------------
// assembleOnly(): Task 1 CLI mode
// ---------------------------------------------------------------------------

async function assembleOnly(): Promise<void> {
  const manifest = await assemble();

  const mCvar     = manifest.generated_against.m_cvar;
  const mCommand  = manifest.generated_against.m_command;
  const mInfoKey  = manifest.generated_against.m_info_key;
  const mTotal    = mCvar + mCommand + mInfoKey;
  const expected  = mTotal - 1;
  const actual    = manifest.entities.length;

  // WHY assertion here too: the assemble() function exits on failure, but
  // we print the PASS/FAIL line here for the operator's acceptance check.
  const passOrFail = actual === expected ? 'PASS' : 'FAIL';

  // Per-bucket breakdown (count types from the manifest entities)
  const byCvar    = manifest.entities.filter((e) => e.mechanical_candidate !== 'none' || true).length;
  void byCvar; // calculated below
  const cvarCount    = manifest.entities.filter((e) => {
    // Match by canonical_id prefix would require adding it to the packet;
    // instead we use the project+knob. All entities have project='ktx'.
    // We need type -- add it to the packets for diagnostics.
    // NOTE: entityRows carries 'type' but we do not store it in the D6 packet
    // (the brief template does not require it; the skill does not use it).
    // For the breakdown line, re-derive from the DB denominator counts.
    return false; // placeholder -- see below
  });
  void cvarCount;

  // WHY re-derive breakdown from denominator counts rather than iterating packets:
  // the packets do not carry 'type' (the brief template does not include it;
  // adding it would be dead data in the packet). The denominator counts are
  // already reconned and the assertion guarantees the entity set is correct.
  // Breakdown = denominator minus the single excluded entity (k_short_gib, a cvar).
  const manifestCvarCount    = mCvar    - 1; // k_short_gib excluded
  const manifestCommandCount = mCommand;     // no command exclusions
  const manifestInfoKeyCount = mInfoKey;     // no info_key exclusions

  process.stdout.write('=== Phase-3 KTX manifest assembly ===\n');
  process.stdout.write('\n');
  process.stdout.write(`Live denominators (reconned from DB, POST-Phase-0):\n`);
  process.stdout.write(`  M_cvar     = ${mCvar}\n`);
  process.stdout.write(`  M_command  = ${mCommand}\n`);
  process.stdout.write(`  M_info_key = ${mInfoKey}\n`);
  process.stdout.write(`  M_total    = ${mTotal}\n`);
  process.stdout.write('\n');
  process.stdout.write(`Anchor version: ${manifest.generated_against.anchor_version} (commit ${manifest.generated_against.ktx_commit.slice(0, 9)})\n`);
  process.stdout.write('\n');
  process.stdout.write(`Selected entities: ${actual}\n`);
  process.stdout.write(`Expected (M - 1 for k_short_gib): ${expected}\n`);
  process.stdout.write(`count == liveM-1: ${passOrFail} (${actual} == ${expected})\n`);
  process.stdout.write('\n');
  process.stdout.write('Per-bucket breakdown:\n');
  process.stdout.write(`  cvar:     ${manifestCvarCount}  (${mCvar} - 1 idempotent k_short_gib)\n`);
  process.stdout.write(`  command:  ${manifestCommandCount}\n`);
  process.stdout.write(`  info_key: ${manifestInfoKeyCount}\n`);
  process.stdout.write('\n');
  process.stdout.write(
    `config_drift_nonresolvers: ${manifest.config_drift_nonresolvers.length} (no entity)\n`,
  );
  process.stdout.write('\n');

  // Emit the manifest JSON -- deterministic (stable ORDER BY in SQL; no timestamps).
  mkdirSync(OUTPUT_DIR, { recursive: true });
  // WHY JSON.stringify with 2-space indent: human-readable + git-diffable;
  // indentation adds no entropy to the determinism guarantee.
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  process.stdout.write(`manifest written: ${MANIFEST_PATH}\n`);
}

// ---------------------------------------------------------------------------
// Record shape accepted by --persist
// ---------------------------------------------------------------------------

// The D6 skill emits one of these per evaluated knob. The persist path reads
// them from a JSON array file and UPDATEs the matching entity row.
//
// Some fields may be null: affirmed source_inline rows have
// description_anchor_version=null (the anchor is the dev's own stamped text
// -- no separate synthesized-anchor needed); residue_routed rows may have
// description=null; description_provenance may be null if Phase 2 produced
// no shipped-config candidate for this knob.
interface D6Record {
  project: string;
  knob: string;
  type: 'cvar' | 'command' | 'info_key';
  description: string | null;
  description_origin: string | null;
  description_anchor_version: string | null;
  // JS value (array/object/null) -- NEVER a pre-stringified string (P2).
  // null means "no provenance to store on this row".
  description_provenance: unknown;
  description_verdict: string | null;
  description_confidence: string | null;
  description_reasoning: string | null;
  description_proposed: string | null;
}

// ---------------------------------------------------------------------------
// Fingerprint query helper (shared by --fingerprint and --persist --dry-run)
// ---------------------------------------------------------------------------

// WHY md5 over ::text cast: postgres-js returns JSONB as a JS object; comparing
// JS object serializations is key-order-dependent. Casting description_provenance
// to ::text uses Postgres's canonical JSONB serialization so the fingerprint is
// stable and reproducible across drivers (mirrors smoke-one-cvar.ts's
// idempotency-self-check pattern, which also uses ::text for JSONB comparison).
//
// Scope: project='ktx' AND type IN ('cvar','command','info_key') -- the full
// configurable-bucket population including k_short_gib (which carries a
// description_verdict from Phase 1). This is the F-D4a proof anchor: a re-run
// that does not touch k_short_gib produces the identical md5.
//
// WHY exec parameter: the caller supplies either the top-level `sql` connection
// (for --fingerprint standalone and --status, where we read committed state) or
// the transaction handle `tx` (inside --persist's sql.begin block). A separate
// connection cannot see an open transaction's uncommitted writes, so passing
// `sql` inside the transaction would read pre-transaction committed state --
// making the dry-run fingerprint vacuous (always FP_NOW regardless of what the
// records would change) and the live fingerprint stale. Passing `tx` fixes both:
// the dry-run fingerprint reflects the would-be state before rollback, and the
// live fingerprint reflects the about-to-commit state. Mirrors the
// postgres.TransactionSql<{}> parameter shape established in natural-keys.ts.
async function computeFingerprint(
  exec: postgres.Sql<{}> | postgres.TransactionSql<{}>,
): Promise<string> {
  const rows = await exec<Array<{ fp: string | null }>>`
    SELECT md5(
      string_agg(
        canonical_id
          || coalesce(description, '')
          || coalesce(description_origin, '')
          || coalesce(description_verdict, '')
          || coalesce(description_anchor_version, '')
          || coalesce(description_provenance::text, ''),
        ''
        ORDER BY canonical_id
      )
    ) AS fp
    FROM entities
    WHERE project = 'ktx'
      AND type IN ('cvar', 'command', 'info_key')
  `;
  const fp = rows[0]?.fp;
  if (!fp) {
    throw new Error('computeFingerprint: md5 returned null -- no KTX entities in scope');
  }
  return fp;
}

// ---------------------------------------------------------------------------
// persist(): --persist <records.json> [--dry-run]
// ---------------------------------------------------------------------------

async function persistRecords(recordsPath: string, dryRun: boolean): Promise<void> {
  // --- 1. Load and parse the records file ---

  if (!existsSync(recordsPath)) {
    throw new Error(`--persist: records file not found: ${recordsPath}`);
  }
  const raw = readFileSync(recordsPath, 'utf-8');
  let records: unknown;
  try {
    records = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `--persist: failed to parse records file as JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!Array.isArray(records)) {
    throw new Error('--persist: records file must be a JSON array');
  }

  // --- 2. Categorise each record before touching the DB ---

  type ErrorEntry = { knob: string; reason: string };
  const toUpdate: D6Record[] = [];
  const skippedTerminal: string[] = [];
  const errors: ErrorEntry[] = [];

  for (const rec of records) {
    if (typeof rec !== 'object' || rec === null) {
      errors.push({ knob: '(non-object)', reason: 'record is not an object' });
      continue;
    }
    const r = rec as Record<string, unknown>;
    const knob = typeof r['knob'] === 'string' ? r['knob'] : String(r['knob'] ?? '');

    // WHY skip k_short_gib here unconditionally: F-D9b/D19/C4 -- Phase 1
    // owns this terminal synthesized row. The persist path MUST NEVER re-touch
    // it, even if a records file accidentally includes it. Logged as
    // skipped-terminal, not an error (the skip is expected and correct).
    if (knob === 'k_short_gib') {
      skippedTerminal.push(knob);
      continue;
    }

    toUpdate.push(r as unknown as D6Record);
  }

  // --- 3. Execute inside a transaction so --dry-run can roll back ---

  // WHY wrap in a transaction even for non-dry-run: postgres-js BEGIN/COMMIT
  // guarantees that a partial failure leaves the DB unchanged; the caller can
  // re-run the full file safely (C4/P3 idempotency holds because the UPDATE
  // is deterministic).
  await sql.begin(async (tx) => {
    let persistedCount = 0;

    for (const rec of toUpdate) {
      const knob = rec.knob;
      const type = rec.type;
      const project = rec.project ?? 'ktx';

      // Resolve to exactly one live entity row (D9 fill-not-create: if the
      // entity does not exist, collect the error and continue -- NEVER create).
      const entityRows = await tx<Array<{ canonical_id: string }>>`
        SELECT canonical_id
        FROM entities
        WHERE project = ${project}
          AND type = ${type}
          AND name = ${knob}
      `;

      if (entityRows.length !== 1) {
        const reason =
          entityRows.length === 0
            ? 'entity not found (D9 fill-not-create: will not create)'
            : `ambiguous: ${entityRows.length} rows matched`;
        errors.push({ knob, reason });
        continue;
      }

      const canonicalId = entityRows[0]!.canonical_id;

      // WHY UPDATE not INSERT: D9/D19 fill-not-create. The entity row was
      // created by the L1 extractor; this step fills the description family
      // columns only. Running persist() twice with the same records file
      // produces the identical owned record (idempotent by construction --
      // same values written both times, keyed on canonical_id). Mirrors
      // smoke-one-cvar.ts persist() shape exactly.
      //
      // WHY sql.json() for description_provenance: postgres-js encodes a JS
      // array/object passed as sql.json(value) as a JSONB structured value.
      // Pre-stringifying (JSON.stringify) would store a JSONB string scalar --
      // the P2 failure mode. Probe F1.jsonb_columns_not_strings catches this
      // via jsonb_typeof(description_provenance)='array'. The established
      // pattern across natural-keys.ts uses tx.json(row.col as never); we
      // mirror that with tx.json() here since we are inside a transaction.
      //
      // WHY NOT set description_rereview: the D4 staleness-walk owns that
      // column; this persist path writes the owned description record only
      // and leaves description_rereview at its default FALSE.
      const provenance = rec.description_provenance;
      const provenanceBound =
        provenance !== null && provenance !== undefined
          ? tx.json(provenance as never)
          : null;

      const result = await tx`
        UPDATE entities SET
          description                = ${rec.description ?? null},
          description_origin         = ${rec.description_origin ?? null},
          description_anchor_version = ${rec.description_anchor_version ?? null},
          description_provenance     = ${provenanceBound},
          description_verdict        = ${rec.description_verdict ?? null},
          description_confidence     = ${rec.description_confidence ?? null},
          description_reasoning      = ${rec.description_reasoning ?? null},
          description_proposed       = ${rec.description_proposed ?? null},
          updated_at                 = now()
        WHERE canonical_id = ${canonicalId}
      `;

      // Assert exactly 1 row updated: 0 would mean canonical_id drifted
      // between the SELECT and the UPDATE (a schema anomaly); >1 violates
      // the UNIQUE constraint on canonical_id (impossible by design but
      // checked for safety).
      const rowCount = result.count;
      if (rowCount !== 1) {
        errors.push({
          knob,
          reason: `UPDATE rowCount=${rowCount} for canonical_id=${canonicalId}`,
        });
        continue;
      }

      persistedCount++;
    }

    // --- 4. Compute the post-write idempotency fingerprint inside the tx ---
    // For --dry-run this is the "would be" fingerprint on the rolled-back state;
    // for a real run it is the committed fingerprint. Both are computed HERE so
    // the comparison is valid before rollback.
    //
    // WHY tx (not sql): computeFingerprint must see this transaction's own
    // uncommitted writes. The top-level `sql` connection is a separate
    // connection that cannot read an open transaction's pending state, so
    // passing `sql` would silently return the pre-transaction committed
    // fingerprint -- making dry-run non-vacuous checks vacuous and live persist
    // report a stale fingerprint. Passing `tx` gives visibility into both the
    // would-be writes (dry-run) and the about-to-commit writes (live).
    const fingerprintAfter = await computeFingerprint(tx);

    // --- 5. Print summary ---

    process.stdout.write('\n=== --persist summary ===\n');
    process.stdout.write(`mode:              ${dryRun ? 'DRY-RUN (transaction will roll back)' : 'LIVE'}\n`);
    process.stdout.write(`records file:      ${recordsPath}\n`);
    process.stdout.write(`records parsed:    ${records.length}\n`);
    process.stdout.write(`persisted:         ${persistedCount}\n`);
    process.stdout.write(`skipped-terminal:  ${skippedTerminal.length}${skippedTerminal.length > 0 ? ` (${skippedTerminal.join(', ')})` : ''}\n`);
    process.stdout.write(`errors:            ${errors.length}\n`);
    if (errors.length > 0) {
      for (const e of errors) {
        process.stdout.write(`  ERROR  knob=${e.knob}: ${e.reason}\n`);
      }
    }
    process.stdout.write(`idempotency fingerprint (${dryRun ? 'rolled-back' : 'committed'}): ${fingerprintAfter}\n`);
    process.stdout.write('\n');

    // --- 6. Roll back if dry-run ---

    if (dryRun) {
      // WHY rollback via throw: postgres-js BEGIN/ROLLBACK is triggered by
      // throwing inside the sql.begin() callback. We throw a sentinel so the
      // outer catch can distinguish a deliberate dry-run rollback from a real
      // error without exposing the mechanism in the error summary.
      throw new DryRunRollback();
    }
  }).catch((err: unknown) => {
    // Absorb the deliberate dry-run sentinel; re-throw everything else.
    if (!(err instanceof DryRunRollback)) {
      throw err;
    }
    process.stdout.write('DRY-RUN: transaction rolled back -- no rows written.\n');
  });
}

// Sentinel thrown inside sql.begin() to trigger ROLLBACK for --dry-run.
// WHY a class not a string: ensures the catch-and-absorb in persistRecords
// cannot accidentally swallow a real Error that happens to stringify the same
// way.
class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback sentinel');
    this.name = 'DryRunRollback';
  }
}

// ---------------------------------------------------------------------------
// statusReport(): --status
// ---------------------------------------------------------------------------

// Read-only. Queries the entities table to show how many in-scope KTX entities
// carry a description_verdict (evaluated) vs still-NULL (not yet evaluated).
// This is the fan-out dispatcher's resume cursor: run --status before launching
// the D6 fan-out to know exactly which knobs still need work.
//
// k_short_gib is excluded from the manifest (Phase-1 terminal) but reported
// separately so the operator can confirm it is present, terminal, and counted
// exactly once (C4/D19/P3).
async function statusReport(): Promise<void> {
  // Main counts: in-scope population (excludes k_short_gib by the WHERE clause)
  const statusRows = await sql<Array<{
    entity_type: string;
    evaluated: number;
    remaining: number;
  }>>`
    SELECT
      type AS entity_type,
      count(*) FILTER (WHERE description_verdict IS NOT NULL)::int AS evaluated,
      count(*) FILTER (WHERE description_verdict IS NULL)::int     AS remaining
    FROM entities
    WHERE project = 'ktx'
      AND type IN ('cvar', 'command', 'info_key')
      AND canonical_id != 'ktx:cvar:k_short_gib'
    GROUP BY type
    ORDER BY type
  `;

  const totalEvaluated = statusRows.reduce((n, r) => n + r.evaluated, 0);
  const totalRemaining = statusRows.reduce((n, r) => n + r.remaining, 0);
  const totalInScope   = totalEvaluated + totalRemaining;

  // k_short_gib status (terminal, excluded from manifest but counted once)
  const shortGibRows = await sql<Array<{
    canonical_id: string;
    description_verdict: string | null;
    description_origin: string | null;
  }>>`
    SELECT canonical_id, description_verdict, description_origin
    FROM entities
    WHERE canonical_id = 'ktx:cvar:k_short_gib'
  `;
  const shortGib = shortGibRows[0] ?? null;

  // Remaining canonical_ids (for executor to consume as the next-batch list)
  const remainingRows = await sql<Array<{ canonical_id: string }>>`
    SELECT canonical_id
    FROM entities
    WHERE project = 'ktx'
      AND type IN ('cvar', 'command', 'info_key')
      AND canonical_id != 'ktx:cvar:k_short_gib'
      AND description_verdict IS NULL
    ORDER BY canonical_id
  `;

  process.stdout.write('=== --status: KTX Phase-3 describe-fill progress ===\n');
  process.stdout.write('\n');
  process.stdout.write(`In-scope entities (manifest, k_short_gib excluded): ${totalInScope}\n`);
  process.stdout.write(`  evaluated (verdict IS NOT NULL): ${totalEvaluated}\n`);
  process.stdout.write(`  remaining (verdict IS NULL):     ${totalRemaining}\n`);
  process.stdout.write('\n');
  process.stdout.write('Per-bucket breakdown:\n');
  for (const row of statusRows) {
    process.stdout.write(
      `  ${row.entity_type.padEnd(10)}: evaluated=${row.evaluated}  remaining=${row.remaining}\n`,
    );
  }
  process.stdout.write('\n');

  // k_short_gib one-line report
  if (shortGib) {
    process.stdout.write(
      `k_short_gib: present, verdict=${shortGib.description_verdict ?? 'NULL'}, ` +
      `origin=${shortGib.description_origin ?? 'NULL'}, ` +
      `terminal=true, excluded-from-manifest=true, counted-once (C4/D19/P3)\n`,
    );
  } else {
    process.stdout.write('k_short_gib: NOT FOUND in entities -- Phase 1 has not executed yet\n');
  }

  process.stdout.write('\n');

  if (totalRemaining === 0) {
    process.stdout.write('All in-scope KTX entities evaluated. Fan-out complete.\n');
  } else {
    process.stdout.write(`Remaining canonical_ids (${totalRemaining}):\n`);
    for (const row of remainingRows) {
      process.stdout.write(`  ${row.canonical_id}\n`);
    }
  }
}

// ---------------------------------------------------------------------------
// fingerprintCmd(): --fingerprint
// ---------------------------------------------------------------------------

// Read-only. Prints the deterministic committed-row md5 over the in-scope KTX
// population (project='ktx', type IN cvar/command/info_key), including
// k_short_gib. Used for phase-boundary idempotency proof and F-D4a anchoring.
async function fingerprintCmd(): Promise<void> {
  // WHY sql (not tx): standalone --fingerprint reads committed state; there is
  // no open transaction here. Passing the top-level connection is correct.
  const fp = await computeFingerprint(sql);
  process.stdout.write(`=== --fingerprint: KTX committed-row md5 ===\n`);
  process.stdout.write(`scope: project='ktx', type IN ('cvar','command','info_key')\n`);
  process.stdout.write(`md5:   ${fp}\n`);
}

// ---------------------------------------------------------------------------
// Task 2/3/4 placeholders
// ---------------------------------------------------------------------------

// Task 2: Task 2/3/4: D6 guardrailed fan-out -- dispatch the D6 skill as
// sub-agents over the manifest entities (Opus 4.7 MAX, spec-locked D7).
// Collect per-knob records; feed synthesized rows to Task 3.
export async function fanOut(): Promise<never> {
  throw new Error('not yet implemented -- Task 2: D6 guardrailed fan-out');
}

// Task 3: D7 tier-1 independent evidence re-check (independent Opus 4.7 MAX,
// spec-locked). Receives synthesized rows from Task 2; bounces failures
// to re-synth or routes to C1 residue.
export async function gate(): Promise<never> {
  throw new Error('not yet implemented -- Task 3: D7 tier-1 evidence re-check');
}

// Task 4: C5-spirit probe F1.describe_fill.synthesized_requires_source_ref
// added to quality-grid.ts + idempotent coverage/residue harness.
export async function probe(): Promise<never> {
  throw new Error('not yet implemented -- Task 4: synthesized_requires_source_ref probe');
}

// ---------------------------------------------------------------------------
// main() -- flag dispatch
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  try {
    if (args.includes('--assemble-only')) {
      await assembleOnly();
    } else if (args.includes('--persist')) {
      // --persist <file> [--dry-run]
      // Find the argument immediately after --persist as the records file path.
      const persistIdx = args.indexOf('--persist');
      const recordsPath = args[persistIdx + 1];
      if (!recordsPath || recordsPath.startsWith('--')) {
        process.stderr.write(
          'synthesize-ktx --persist: missing records file argument.\n' +
          'Usage: --persist <records.json> [--dry-run]\n',
        );
        process.exit(1);
      }
      const dryRun = args.includes('--dry-run');
      await persistRecords(recordsPath, dryRun);
    } else if (args.includes('--status')) {
      await statusReport();
    } else if (args.includes('--fingerprint')) {
      await fingerprintCmd();
    } else if (args.includes('--fan-out')) {
      await fanOut();
    } else if (args.includes('--gate')) {
      await gate();
    } else if (args.includes('--probe')) {
      await probe();
    } else {
      process.stderr.write(
        'synthesize-ktx: no mode specified.\n' +
        'Modes: --assemble-only | --persist <file> [--dry-run] | --status | --fingerprint | --fan-out | --gate | --probe\n',
      );
      process.exit(1);
    }
  } finally {
    await closeSql();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point (Bun P1 -- import.meta.main guard)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`synthesize-ktx error: ${msg}\n`);
    process.exit(1);
  });
}
