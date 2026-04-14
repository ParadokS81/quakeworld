// Lints every concept note: parses frontmatter, checks required fields,
// confirms every cvar/command reference resolves to a real row in kb_*,
// and that every session reference parses and resolves in the live
// `sessions` table. Exits 1 on any hard failure.
//
// Soft warnings (missing session rows, missing concept cross-refs) do
// not fail the run but are printed for review.

import Database from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QW_ORACLE_ROOT = resolve(__dirname, '..');
const DB_PATH = resolve(QW_ORACLE_ROOT, 'data', 'qw.db');
const CONCEPTS_DIR = resolve(QW_ORACLE_ROOT, 'layers', 'concepts');

const db = new Database(DB_PATH, { readonly: true });
const existingCvarIds = new Set(db.prepare(`SELECT id FROM kb_cvars`).all().map((r) => r.id));
const existingCmdIds = new Set(db.prepare(`SELECT id FROM kb_commands`).all().map((r) => r.id));
const sessionExists = db.prepare(`
  SELECT 1 FROM sessions WHERE platform = ? AND channel_name = ? AND started_at = ?
`);

// Minimal YAML frontmatter parser. Only handles the fixed shape documented
// in layers/concepts/_schema.md; no generic YAML features. Intentional:
// zero runtime deps for the POC.
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  let currentKey = null;
  let currentList = null;

  for (const rawLine of body.split('\n')) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;

    const topMatch = rawLine.match(/^([a-z_]+):\s*(.*)$/);
    if (topMatch) {
      currentKey = topMatch[1];
      const val = topMatch[2];
      if (val === '') {
        out[currentKey] = {};
        currentList = null;
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        out[currentKey] = inner ? inner.split(',').map((s) => s.trim()) : [];
        currentList = null;
      } else {
        out[currentKey] = val.replace(/^"(.*)"$/, '$1');
        currentList = null;
      }
      continue;
    }

    const nestedMatch = rawLine.match(/^  ([a-z_]+):\s*(.*)$/);
    if (nestedMatch && currentKey && typeof out[currentKey] === 'object' && !Array.isArray(out[currentKey])) {
      const nestedKey = nestedMatch[1];
      const val = nestedMatch[2];
      if (val === '') {
        out[currentKey][nestedKey] = [];
        currentList = out[currentKey][nestedKey];
      } else if (val.startsWith('[') && val.endsWith(']')) {
        const inner = val.slice(1, -1).trim();
        out[currentKey][nestedKey] = inner ? inner.split(',').map((s) => s.trim()) : [];
        currentList = null;
      }
      continue;
    }

    const listMatch = rawLine.match(/^    - (.*)$/);
    if (listMatch && currentList) {
      currentList.push(listMatch[1].trim());
      continue;
    }
  }
  return out;
}

const REQUIRED = ['id', 'title', 'description', 'tags', 'references', 'authored_by', 'authored_at', 'confidence'];

let errors = 0;
let warnings = 0;
let ok = 0;

const files = readdirSync(CONCEPTS_DIR)
  .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
  .sort();

for (const file of files) {
  const path = resolve(CONCEPTS_DIR, file);
  const text = readFileSync(path, 'utf8');
  const fm = parseFrontmatter(text);

  if (!fm) {
    console.error(`  ERROR ${file}: no frontmatter`);
    errors++;
    continue;
  }

  const missing = REQUIRED.filter((k) => !(k in fm));
  if (missing.length) {
    console.error(`  ERROR ${file}: missing required fields: ${missing.join(', ')}`);
    errors++;
    continue;
  }

  const stem = basename(file, extname(file));
  const expectedId = `concept:${stem}`;
  if (fm.id !== expectedId) {
    console.error(`  ERROR ${file}: id mismatch. frontmatter=${fm.id} expected=${expectedId}`);
    errors++;
    continue;
  }

  let fileErrors = 0;
  const refs = fm.references ?? {};

  for (const id of refs.cvars ?? []) {
    if (!existingCvarIds.has(id)) {
      console.error(`  ERROR ${file}: dead cvar reference ${id}`);
      fileErrors++;
    }
  }

  for (const id of refs.commands ?? []) {
    if (!existingCmdIds.has(id)) {
      console.error(`  ERROR ${file}: dead command reference ${id}`);
      fileErrors++;
    }
  }

  for (const ref of refs.sessions ?? []) {
    // Canonical session id: session:<platform>:<channel>:<started_at>
    // channel has no colons; started_at is ISO8601 with colons, so we
    // split off the first 3 segments and rejoin the rest.
    const parts = ref.split(':');
    if (parts.length < 4 || parts[0] !== 'session') {
      console.warn(`  WARN ${file}: malformed session reference ${ref}`);
      warnings++;
      continue;
    }
    const platform = parts[1];
    const channel = parts[2];
    const startedAt = parts.slice(3).join(':');
    const hit = sessionExists.get(platform, channel, startedAt);
    if (!hit) {
      console.warn(`  WARN ${file}: session reference ${ref} not found in sessions table`);
      warnings++;
    }
  }

  for (const id of refs.concepts ?? []) {
    const otherFile = resolve(CONCEPTS_DIR, id.replace(/^concept:/, '') + '.md');
    try {
      readFileSync(otherFile);
    } catch {
      console.warn(`  WARN ${file}: concept cross-ref ${id} does not exist yet`);
      warnings++;
    }
  }

  if (fileErrors === 0) {
    ok++;
    console.log(`  ok  ${file}`);
  } else {
    console.log(`  ERR ${file} (${fileErrors} hard errors)`);
    errors += fileErrors;
  }
}

console.log(`\nConcepts: ${ok} ok, ${warnings} warnings, ${errors} errors`);
db.close();
process.exit(errors > 0 ? 1 : 0);
