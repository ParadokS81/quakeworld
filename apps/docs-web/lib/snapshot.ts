import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Snapshot } from './types'

// apps/docs-web/data, resolved relative to this module so it works regardless
// of the process cwd (VitePress data loaders + .paths loaders run in Node at
// build time).
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const SCHEMA_VERSION = 'docs-snapshot-v1'

export interface SnapshotRef {
  codebase: string
  type: string
}

// Lists the (codebase, type) pairs available on disk by parsing the data-dir
// filenames (<codebase>-<type>.json). Data-driven: adding a codebase or type
// is a Phase-1 emit + a new file, never a code change here (D14 spirit). The
// split is on the FIRST hyphen only -- codebase names carry no hyphen, and
// types use underscores (cmdline_param, info_key), so this is unambiguous.
export function listSnapshots(): SnapshotRef[] {
  return readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const stem = f.slice(0, -'.json'.length)
      const dash = stem.indexOf('-')
      return { codebase: stem.slice(0, dash), type: stem.slice(dash + 1) }
    })
}

// Reads + parses one Phase-1 snapshot file. Validates only the invariants
// (schema_version + the always-present record fields are not asserted here to
// keep the loader cheap; the shape contract is in types.ts) and passes every
// field through untouched -- so a field a future Phase-1 emit adds never trips
// the loader (D11/D13 forward-compat). Pure data work, no Vue import (D15).
export function loadSnapshot(codebase: string, type: string): Snapshot {
  const path = join(DATA_DIR, `${codebase}-${type}.json`)
  const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Snapshot
  if (snapshot._meta?.schema_version !== SCHEMA_VERSION) {
    throw new Error(
      `${codebase}-${type}.json: expected schema_version ${SCHEMA_VERSION}, got ${snapshot._meta?.schema_version}`
    )
  }
  return snapshot
}
