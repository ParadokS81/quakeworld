// apps/qw-oracle/scripts/describe-fill/synthesize-qwfwd.ts
// Mirror of synthesize-mvdsv.ts -- engine-swapped for QWFWD.
//
// Phase-3 QWFWD describe-fill PERSISTENCE driver.
//
// The QWFWD mirror of synthesize-ktx.ts's persistence half. The synthesis
// loop itself (D6 fan-out -> F-D6a grep-verify -> V-pass -> seeded re-synth)
// is orchestrated by the executor terminal per the Phase-3 volume executor
// prompt + the D7 Amendment 2026-05-19 V-pass contract (B1-B5); this script
// is the durable, idempotent WRITE path the loop hands its V-pass-clean
// records to, and the in-scope idempotency fingerprint. QWFWD is a frozen
// vendored C snapshot (anchor version 1.40-dev). Built small on the
// first subsystem batch and reused by every later QWFWD batch.
//
// Sub-command dispatch (guards `import.meta.main` at the bottom):
//
//   --persist <file> [--dry-run]
//                     Ingest a D6 records JSON array and UPDATE the matching
//                     QWFWD entity rows (fill-not-create -- D9). Idempotent:
//                     a terminal-owned row (synthesized, or shipped_doc with a
//                     verdict) is SKIPPED whole (the F-D9b clobber-guard), so
//                     re-running the same file leaves a byte-identical
//                     fingerprint (C4/P3 / F-D4a). --dry-run wraps everything
//                     in a rolled-back transaction so the operator can verify
//                     the change shape before committing.
//
//   --fingerprint     Read-only. Print the deterministic committed-row md5 over
//                     the in-scope QWFWD set (project='qwfwd',
//                     type IN cvar/command/cmdline_param/info_key) for the
//                     idempotency proof.
//
//   --status          Read-only. How many in-scope QWFWD entities carry a
//                     description_verdict (evaluated) vs remaining. The resume
//                     cursor for the one-subsystem-at-a-time scale-up.
//
// WHY a TS sibling, not the KTX apply-l1-from-ledgers.py: that script is
// ktx:-regex-scoped AND deliberately skips description_provenance (it emits
// SQL text, which cannot bind a JSONB JS value). QWFWD's persist must bind
// description_provenance via tx.json (P2/F-C5a) -- so it mirrors the
// synthesize-ktx.ts postgres-js shape, not the Python emitter. For a row
// synthesized purely from engine source with no shipped-config candidate,
// description_provenance is NULL (operator clarification 2026-05-30, Phase 3
// volume: provenance holds retained shipped-doc / multi-source DATA only; a
// cold-synth row's grounding is source_ref + anchor + the enforce-trace cites
// in description_reasoning -- mirrors synthesize-ktx.ts, preserves cross-engine
// serializer consistency).

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import type postgres from 'postgres';
import { sql, closeSql } from '../load-knowledge/db.js';

// ---------------------------------------------------------------------------
// In-scope QWFWD configurable buckets (C1 denominator shape; D1)
// ---------------------------------------------------------------------------

// WHY a shared constant: the fingerprint scope, the status scope, and any
// future coverage query must use the SAME four buckets or the idempotency
// proof and the coverage gate silently disagree.
const IN_SCOPE_TYPES = ['cvar', 'command', 'cmdline_param', 'info_key'] as const;

// ---------------------------------------------------------------------------
// Record shape accepted by --persist
// ---------------------------------------------------------------------------

// The D6 skill emits one of these per evaluated knob (the V-pass-clean form
// the executor assembles from the synthesis + V-pass loop). The persist path
// resolves each back to its live entity row by (project, type, knob) and fills
// the migration-014 description family columns. Mirrors synthesize-ktx.ts's
// D6Record exactly so the two engines share one record contract.
//
// Some fields may be null: description_provenance is NULL for a cold-synth row
// (no shipped-config candidate -- operator clarification 2026-05-30);
// description_proposed is the D7-reviewer re-check field (null here).
interface D6Record {
  project: string;
  knob: string;
  type: 'cvar' | 'command' | 'cmdline_param' | 'info_key';
  description: string | null;
  description_origin: string | null;
  description_anchor_version: string | null;
  // JS value (array/object/null) -- NEVER a pre-stringified string (P2).
  // null means "no retained shipped-doc/multi-source provenance on this row".
  description_provenance: unknown;
  description_verdict: string | null;
  description_confidence: string | null;
  description_reasoning: string | null;
  description_proposed: string | null;
}

// ---------------------------------------------------------------------------
// Fingerprint helper (shared by --fingerprint and --persist's in-tx check)
// ---------------------------------------------------------------------------

// WHY ::text cast on JSONB: postgres-js returns JSONB as a JS object; comparing
// JS serializations is key-order-dependent. The ::text cast uses Postgres's
// canonical JSONB serialization so the md5 is stable across drivers (mirrors
// synthesize-ktx.ts computeFingerprint).
//
// WHY exec parameter: the caller supplies the top-level `sql` for standalone
// --fingerprint (committed state) or the transaction handle `tx` inside
// --persist (so the dry-run/about-to-commit fingerprint sees this tx's own
// uncommitted writes; a separate connection would read stale pre-tx state).
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
    WHERE project = 'qwfwd'
      AND type IN ${exec(IN_SCOPE_TYPES as unknown as string[])}
  `;
  const fp = rows[0]?.fp;
  if (!fp) {
    throw new Error('computeFingerprint: md5 returned null -- no QWFWD entities in scope');
  }
  return fp;
}

// ---------------------------------------------------------------------------
// persist(): --persist <records.json> [--dry-run]
// ---------------------------------------------------------------------------

// The F-D9b clobber-guard: a row already in a terminal owned state is SKIPPED
// whole -- never re-touched. Terminal = description_origin='synthesized' OR
// (description_origin='shipped_doc' AND description_verdict IS NOT NULL).
// This is what makes re-runs idempotent (the 2nd run skips the rows the 1st
// run made terminal) AND protects Phase-2/3/4 owned rows from a later batch's
// re-run clobbering them (F-D4a / F-D9b).
function isTerminalOwned(origin: string | null, verdict: string | null): boolean {
  if (origin === 'synthesized') return true;
  if (origin === 'shipped_doc' && verdict !== null) return true;
  return false;
}

type ErrorEntry = { knob: string; reason: string };

// --persist <records.json>: the original explicit-array path (a JSON array of
// D6Record). Kept for the operator-override review-tail path + any externally
// assembled batch.
async function persistRecords(recordsPath: string, dryRun: boolean, overrideSet: Set<string>): Promise<void> {
  if (!existsSync(recordsPath)) {
    throw new Error(`--persist: records file not found: ${recordsPath}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(recordsPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `--persist: failed to parse records file as JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error('--persist: records file must be a JSON array');
  }
  await applyRecords(parsed as D6Record[], recordsPath, dryRun, overrideSet);
}

// --from-ledger <glob>: assemble the records array from per-knob committed
// ledger files. Each ledger carries exactly one fenced ```json block = its
// D6Record. This is the fix-#1 durable artifact: the ledgers are git-committed
// and the DB is reconstructable from them, with NO gitignored intermediate
// records.json (batch-1's gap). The bulky description_reasoning / enforce-trace
// lives on disk and goes disk -> DB without ever passing through the
// orchestrator's conversation context.
async function persistFromLedgers(glob: string, dryRun: boolean, overrideSet: Set<string>): Promise<void> {
  const files = globLedgers(glob);
  if (files.length === 0) {
    throw new Error(`--from-ledger: no files matched glob: ${glob}`);
  }
  const records: D6Record[] = [];
  const parseErrors: string[] = [];
  for (const file of files) {
    try {
      records.push(extractLedgerRecord(file));
    } catch (err) {
      parseErrors.push(`${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  // A malformed ledger must abort the whole batch -- a partial persist from a
  // glob is the silent-data-loss failure mode (C4). Fix the ledger, re-run.
  if (parseErrors.length > 0) {
    throw new Error(
      `--from-ledger: ${parseErrors.length} ledger(s) did not yield a D6Record:\n  ${parseErrors.join('\n  ')}`,
    );
  }
  await applyRecords(records, `${files.length} ledger(s) via ${glob}`, dryRun, overrideSet);
}

// Resolve a `dir/pattern` glob (single '*' wildcard in the basename) to sorted
// file paths. Dependency-free (readdirSync + a basename regex) -- the only glob
// shape the ledger flow needs.
function globLedgers(glob: string): string[] {
  const slash = glob.lastIndexOf('/');
  const dir = slash >= 0 ? glob.slice(0, slash) : '.';
  const pattern = slash >= 0 ? glob.slice(slash + 1) : glob;
  const re = new RegExp('^' + pattern.split('*').map(escapeRegExp).join('.*') + '$');
  if (!existsSync(dir)) {
    throw new Error(`--from-ledger: directory not found: ${dir}`);
  }
  return readdirSync(dir)
    .filter((f) => re.test(f))
    .sort()
    .map((f) => `${dir}/${f}`);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract the single fenced ```json block from a ledger and parse it as a
// D6Record. A ledger MUST carry exactly one such block (the contract the
// synthesis sub-agent writes); zero or >1 is an error the caller surfaces (it
// means the ledger drifted from the contract -- never guess which block wins).
function extractLedgerRecord(path: string): D6Record {
  const text = readFileSync(path, 'utf-8');
  const blocks = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (blocks.length === 0) {
    throw new Error('no ```json block found');
  }
  if (blocks.length > 1) {
    throw new Error(`${blocks.length} \`\`\`json blocks found (expected exactly 1)`);
  }
  let rec: unknown;
  try {
    rec = JSON.parse(blocks[0]![1]!);
  } catch (err) {
    throw new Error(`json block did not parse: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof rec !== 'object' || rec === null) {
    throw new Error('json block is not a JSON object');
  }
  return rec as D6Record;
}

// Shared persist core: apply an already-assembled D6Record[] inside one
// transaction. Both --persist and --from-ledger funnel through here so the
// F-D9b clobber-guard, tx.json provenance binding, in-tx fingerprint, and
// dry-run / error rollback are identical regardless of where the records came
// from.
async function applyRecords(
  records: D6Record[],
  sourceLabel: string,
  dryRun: boolean,
  overrideSet: Set<string>,
): Promise<void> {
  // --- Categorise before touching the DB ---

  const toApply: D6Record[] = [];
  const errors: ErrorEntry[] = [];

  for (const rec of records) {
    if (typeof rec !== 'object' || rec === null) {
      errors.push({ knob: '(non-object)', reason: 'record is not an object' });
      continue;
    }
    toApply.push(rec as unknown as D6Record);
  }

  // --- Execute inside a transaction so --dry-run can roll back ---

  await sql.begin(async (tx) => {
    let persisted = 0;
    const skippedTerminal: string[] = [];
    const operatorOverrides: string[] = [];

    for (const rec of toApply) {
      const knob = rec.knob;
      const type = rec.type;
      const project = rec.project ?? 'qwfwd';

      // Resolve to exactly one live entity row (D9 fill-not-create: NEVER create).
      const matched = await tx<Array<{
        canonical_id: string;
        description_origin: string | null;
        description_verdict: string | null;
      }>>`
        SELECT canonical_id, description_origin, description_verdict
        FROM entities
        WHERE project = ${project} AND type = ${type} AND name = ${knob}
      `;

      if (matched.length !== 1) {
        errors.push({
          knob,
          reason:
            matched.length === 0
              ? 'entity not found (D9 fill-not-create: will not create)'
              : `ambiguous: ${matched.length} rows matched`,
        });
        continue;
      }

      const row = matched[0]!;

      // F-D9b clobber-guard: skip terminal-owned rows whole -- UNLESS the
      // operator explicitly authorized re-writing this knob at the review tail
      // (D11 operator-override; named, logged, intentional -- NOT a blind re-run
      // or a sibling-arc clobber, which is what the guard protects against).
      if (isTerminalOwned(row.description_origin, row.description_verdict)) {
        if (overrideSet.has(knob)) {
          operatorOverrides.push(knob);
        } else {
          skippedTerminal.push(knob);
          continue;
        }
      }

      // WHY tx.json: postgres-js encodes a JS array/object passed as tx.json()
      // as a JSONB structured value. Pre-stringifying would store a JSONB string
      // scalar -- the P2 failure mode F1.jsonb_columns_not_strings catches. NULL
      // provenance stays SQL NULL (cold-synth rows -- operator clarification
      // 2026-05-30).
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
          description_embedding_stale = true,
          updated_at                 = now()
        WHERE canonical_id = ${row.canonical_id}
      `;

      if (result.count !== 1) {
        errors.push({ knob, reason: `UPDATE rowCount=${result.count} for ${row.canonical_id}` });
        continue;
      }
      persisted++;
    }

    // --- 4. Idempotency fingerprint inside the tx (sees this tx's writes) ---
    const fingerprint = await computeFingerprint(tx);

    // --- 5. Summary ---
    process.stdout.write('\n=== synthesize-qwfwd persist summary ===\n');
    process.stdout.write(`mode:             ${dryRun ? 'DRY-RUN (rolls back)' : 'LIVE'}\n`);
    process.stdout.write(`source:           ${sourceLabel}\n`);
    process.stdout.write(`records parsed:   ${records.length}\n`);
    process.stdout.write(`persisted:        ${persisted}\n`);
    process.stdout.write(
      `skipped-terminal: ${skippedTerminal.length}${skippedTerminal.length > 0 ? ` (${skippedTerminal.join(', ')})` : ''}\n`,
    );
    process.stdout.write(
      `operator-override:${operatorOverrides.length}${operatorOverrides.length > 0 ? ` (${operatorOverrides.join(', ')})` : ''}\n`,
    );
    process.stdout.write(`errors:           ${errors.length}\n`);
    for (const e of errors) process.stdout.write(`  ERROR knob=${e.knob}: ${e.reason}\n`);
    process.stdout.write(`in-scope QWFWD fingerprint (${dryRun ? 'rolled-back' : 'committed'}): ${fingerprint}\n\n`);

    if (errors.length > 0 && !dryRun) {
      // A resolve/UPDATE error must not commit a partial batch silently.
      throw new Error(`--persist: ${errors.length} record(s) failed; rolling back (fix the records, re-run -- C4).`);
    }

    if (dryRun) throw new DryRunRollback();
  }).catch((err: unknown) => {
    if (!(err instanceof DryRunRollback)) throw err;
    process.stdout.write('DRY-RUN: transaction rolled back -- no rows written.\n');
  });
}

// Sentinel thrown inside sql.begin() to trigger ROLLBACK for --dry-run.
class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback sentinel');
    this.name = 'DryRunRollback';
  }
}

// ---------------------------------------------------------------------------
// fingerprintCmd(): --fingerprint
// ---------------------------------------------------------------------------

async function fingerprintCmd(): Promise<void> {
  const fp = await computeFingerprint(sql);
  process.stdout.write('=== --fingerprint: QWFWD committed-row md5 ===\n');
  process.stdout.write(`scope: project='qwfwd', type IN (${IN_SCOPE_TYPES.join(',')})\n`);
  process.stdout.write(`md5:   ${fp}\n`);
}

// ---------------------------------------------------------------------------
// statusReport(): --status (resume cursor for the one-subsystem scale-up)
// ---------------------------------------------------------------------------

async function statusReport(): Promise<void> {
  const rows = await sql<Array<{ entity_type: string; evaluated: number; remaining: number }>>`
    SELECT
      type::text AS entity_type,
      count(*) FILTER (WHERE description_verdict IS NOT NULL)::int AS evaluated,
      count(*) FILTER (WHERE description_verdict IS NULL)::int     AS remaining
    FROM entities
    WHERE project = 'qwfwd' AND type IN ${sql(IN_SCOPE_TYPES as unknown as string[])}
    GROUP BY type
    ORDER BY type
  `;
  const totalEval = rows.reduce((n, r) => n + r.evaluated, 0);
  const totalRem = rows.reduce((n, r) => n + r.remaining, 0);

  process.stdout.write('=== --status: QWFWD describe-fill progress ===\n\n');
  process.stdout.write(`In-scope QWFWD entities: ${totalEval + totalRem}\n`);
  process.stdout.write(`  evaluated (verdict NOT NULL): ${totalEval}\n`);
  process.stdout.write(`  remaining (verdict NULL):     ${totalRem}\n\n`);
  process.stdout.write('Per-bucket:\n');
  for (const r of rows) {
    process.stdout.write(`  ${r.entity_type.padEnd(13)}: evaluated=${r.evaluated}  remaining=${r.remaining}\n`);
  }
}

// ---------------------------------------------------------------------------
// main() -- flag dispatch (Bun P1 -- import.meta.main guard)
// ---------------------------------------------------------------------------

// Shared --operator-override parser (D11 review-tail override): a
// comma-separated knob list whose terminal-owned rows --persist / --from-ledger
// may re-write. Absent -> empty set -> the F-D9b clobber-guard skips terminal
// rows.
function parseOverrideSet(args: string[]): Set<string> {
  const ovIdx = args.indexOf('--operator-override');
  return new Set<string>(
    ovIdx >= 0 && args[ovIdx + 1] && !args[ovIdx + 1]!.startsWith('--')
      ? args[ovIdx + 1]!.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--persist')) {
      const idx = args.indexOf('--persist');
      const recordsPath = args[idx + 1];
      if (!recordsPath || recordsPath.startsWith('--')) {
        process.stderr.write('synthesize-qwfwd --persist: missing records file.\nUsage: --persist <records.json> [--dry-run] [--operator-override <name,name>]\n');
        process.exit(1);
      }
      await persistRecords(recordsPath, args.includes('--dry-run'), parseOverrideSet(args));
    } else if (args.includes('--from-ledger')) {
      const idx = args.indexOf('--from-ledger');
      const glob = args[idx + 1];
      if (!glob || glob.startsWith('--')) {
        process.stderr.write('synthesize-qwfwd --from-ledger: missing glob.\nUsage: --from-ledger <glob> [--dry-run] [--operator-override <names>]\n');
        process.exit(1);
      }
      await persistFromLedgers(glob, args.includes('--dry-run'), parseOverrideSet(args));
    } else if (args.includes('--fingerprint')) {
      await fingerprintCmd();
    } else if (args.includes('--status')) {
      await statusReport();
    } else {
      process.stderr.write(
        'synthesize-qwfwd: no mode specified.\n' +
        'Modes: --persist <file> [--dry-run] | --from-ledger <glob> [--dry-run] | --fingerprint | --status\n',
      );
      process.exit(1);
    }
  } finally {
    await closeSql();
  }
}

if (import.meta.main) {
  main().catch((err: unknown) => {
    process.stderr.write(`synthesize-qwfwd error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
