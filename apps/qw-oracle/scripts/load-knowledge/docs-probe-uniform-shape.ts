// docs-probe-uniform-shape.ts
//
// D13/F2 uniform-shape probe: proves every record in apps/docs-web/data/*.json
// conforms to the uniform DocsRecord shape:
//   - _meta carries exactly 6 expected keys
//   - entries is an array
//   - groups present (non-empty) ONLY for ezQuake cvar/command; absent for all others
//   - every entry key is in the allowed set
//   - required keys (name, first_seen, last_seen) are present on every entry
//   - no key holds a null value (absence must be omission, not null)
//   - source_ref, when present, is { file: string, line: number }
//   - values and default_history, when present, are non-null
//   - combined-form guard: description does NOT literally contain remarks

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');
const DOCS_DATA_DIR = join(MONOREPO_ROOT, 'apps', 'docs-web', 'data');

// Allowed keys on a DocsRecord entry.
const ALLOWED_ENTRY_KEYS = new Set([
  'name',
  'raw_type',
  'default',
  'description',
  'remarks',
  'values',
  'category',
  'source_ref',
  'first_seen',
  'last_seen',
  'default_history',
  'macro_type',
  'arguments',
  'scope',
]);

// Required keys on every DocsRecord entry.
const REQUIRED_ENTRY_KEYS = ['name', 'first_seen', 'last_seen'] as const;

// The 6 expected keys on _meta.
const EXPECTED_META_KEYS = new Set([
  'schema_version',
  'generated_at',
  'codebase',
  'type',
  'snapshot_version',
  'upstream_commit',
]);

// Files that MUST carry a non-empty groups array (ezQuake cvar and command only).
function requiresGroups(codebase: string, type: string): boolean {
  return codebase === 'ezquake' && (type === 'cvar' || type === 'command');
}

interface ViolationCounts {
  metaKey: number;
  groupsPresence: number;
  disallowedKey: number;
  missingRequired: number;
  nullValue: number;
  sourceRefShape: number;
  combinedForm: number;
}

interface FileResult {
  file: string;
  codebase: string;
  type: string;
  recordCount: number;
  violations: string[];
}

function probeFile(filePath: string): FileResult {
  const fname = filePath.split('/').pop()!;
  const raw = readFileSync(filePath, 'utf-8');
  const doc = JSON.parse(raw);
  const violations: string[] = [];

  // --- A: _meta checks ---
  const meta = doc._meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    violations.push(`[meta-key] _meta is absent or not an object`);
  } else {
    const metaKeys = Object.keys(meta);
    const metaKeySet = new Set(metaKeys);
    // Exactly 6 keys, no more, no less.
    for (const k of EXPECTED_META_KEYS) {
      if (!metaKeySet.has(k)) {
        violations.push(`[meta-key] _meta missing required key: ${k}`);
      }
    }
    for (const k of metaKeys) {
      if (!EXPECTED_META_KEYS.has(k)) {
        violations.push(`[meta-key] _meta has unexpected key: ${k}`);
      }
    }
  }

  const codebase: string = meta?.codebase ?? '';
  const type: string = meta?.type ?? '';

  // Assert entries is an array.
  if (!Array.isArray(doc.entries)) {
    violations.push(`[meta-key] entries is not an array`);
    // Cannot continue record checks without entries.
    return { file: fname, codebase, type, recordCount: 0, violations };
  }

  // --- B: groups presence ---
  const hasGroups = Object.prototype.hasOwnProperty.call(doc, 'groups');
  if (requiresGroups(codebase, type)) {
    if (!hasGroups) {
      violations.push(`[groups-presence] groups key is absent (required for ${codebase}/${type})`);
    } else if (!Array.isArray(doc.groups) || doc.groups.length === 0) {
      violations.push(`[groups-presence] groups is empty or not an array (required non-empty for ${codebase}/${type})`);
    }
  } else {
    if (hasGroups) {
      violations.push(`[groups-presence] groups key is present but must be absent for ${codebase}/${type}`);
    }
  }

  // --- C + D: per-record checks ---
  const entries: unknown[] = doc.entries;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      violations.push(`[disallowed-key] entry is not an object`);
      continue;
    }
    const rec = entry as Record<string, unknown>;
    const entryName: string = typeof rec.name === 'string' ? rec.name : String(rec.name ?? '(unknown)');

    // Disallowed-key check.
    for (const k of Object.keys(rec)) {
      if (!ALLOWED_ENTRY_KEYS.has(k)) {
        violations.push(`[disallowed-key] ${entryName}: unexpected key "${k}"`);
      }
    }

    // Required-keys check.
    for (const k of REQUIRED_ENTRY_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(rec, k)) {
        violations.push(`[missing-required] ${entryName}: missing required key "${k}"`);
      }
    }

    // No-null check: every present key must have a non-null value.
    for (const [k, v] of Object.entries(rec)) {
      if (v === null) {
        violations.push(`[null-value] ${entryName}: key "${k}" is null (must be omitted, not null)`);
      }
    }

    // source_ref shape: when present, must be { file: string, line: number }.
    if (Object.prototype.hasOwnProperty.call(rec, 'source_ref')) {
      const sr = rec.source_ref;
      if (
        sr === null ||
        typeof sr !== 'object' ||
        Array.isArray(sr) ||
        typeof (sr as Record<string, unknown>).file !== 'string' ||
        typeof (sr as Record<string, unknown>).line !== 'number'
      ) {
        violations.push(`[source_ref-shape] ${entryName}: source_ref has wrong shape (expected {file:string,line:number}), got ${JSON.stringify(sr)}`);
      }
    }

    // values: when present, must be non-null (already caught by null-value check, but assert non-null explicitly).
    if (Object.prototype.hasOwnProperty.call(rec, 'values') && rec.values === null) {
      violations.push(`[null-value] ${entryName}: "values" is null`);
    }

    // default_history: when present, must be a non-null array.
    if (Object.prototype.hasOwnProperty.call(rec, 'default_history')) {
      if (rec.default_history === null || !Array.isArray(rec.default_history)) {
        violations.push(`[null-value] ${entryName}: "default_history" is null or not an array`);
      }
    }

    // --- D: combined-form guard ---
    // description must NOT literally contain remarks.
    if (
      typeof rec.description === 'string' &&
      typeof rec.remarks === 'string' &&
      rec.description.includes(rec.remarks)
    ) {
      violations.push(`[combined-form] ${entryName}: description contains remarks verbatim`);
    }
  }

  return { file: fname, codebase, type, recordCount: entries.length, violations };
}

if (import.meta.main) {
  const jsonFiles = readdirSync(DOCS_DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(DOCS_DATA_DIR, f));

  console.log(`--- docs-probe-uniform-shape ---`);
  console.log(`Scanning ${jsonFiles.length} files in ${DOCS_DATA_DIR}`);
  console.log('');

  const counts: ViolationCounts = {
    metaKey: 0,
    groupsPresence: 0,
    disallowedKey: 0,
    missingRequired: 0,
    nullValue: 0,
    sourceRefShape: 0,
    combinedForm: 0,
  };

  let grandTotal = 0;
  const allFileResults: FileResult[] = [];

  for (const filePath of jsonFiles) {
    const result = probeFile(filePath);
    allFileResults.push(result);
    grandTotal += result.recordCount;
  }

  // Print per-file summaries.
  for (const r of allFileResults) {
    const status = r.violations.length === 0 ? 'OK' : 'FAIL';
    console.log(`  [${status}] ${r.file}  (${r.recordCount} records, ${r.violations.length} violations)`);
    if (r.violations.length > 0) {
      for (const v of r.violations) {
        console.log(`       ${v}`);
        // Tally by class.
        if (v.startsWith('[meta-key]')) counts.metaKey++;
        else if (v.startsWith('[groups-presence]')) counts.groupsPresence++;
        else if (v.startsWith('[disallowed-key]')) counts.disallowedKey++;
        else if (v.startsWith('[missing-required]')) counts.missingRequired++;
        else if (v.startsWith('[null-value]')) counts.nullValue++;
        else if (v.startsWith('[source_ref-shape]')) counts.sourceRefShape++;
        else if (v.startsWith('[combined-form]')) counts.combinedForm++;
      }
    }
  }

  const totalViolations =
    counts.metaKey +
    counts.groupsPresence +
    counts.disallowedKey +
    counts.missingRequired +
    counts.nullValue +
    counts.sourceRefShape +
    counts.combinedForm;

  console.log('');
  console.log(`Grand total records: ${grandTotal}`);
  console.log('');
  console.log('Violation counts by class:');
  console.log(`  meta-key        : ${counts.metaKey}`);
  console.log(`  groups-presence : ${counts.groupsPresence}`);
  console.log(`  disallowed-key  : ${counts.disallowedKey}`);
  console.log(`  missing-required: ${counts.missingRequired}`);
  console.log(`  null-value      : ${counts.nullValue}`);
  console.log(`  source_ref-shape: ${counts.sourceRefShape}`);
  console.log(`  combined-form   : ${counts.combinedForm}`);
  console.log(`  TOTAL           : ${totalViolations}`);
  console.log('');

  if (totalViolations === 0) {
    console.log('SHAPE OK -- all records conform.');
  } else {
    console.log(`SHAPE FAIL -- ${totalViolations} violation(s) found. See details above.`);
  }

  process.exitCode = totalViolations > 0 ? 1 : 0;
}
