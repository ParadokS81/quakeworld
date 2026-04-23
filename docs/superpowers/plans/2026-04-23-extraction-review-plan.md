# Extraction-review skill + CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `review` + `extract-tag` CLI subcommands and the `extraction-review` user-global skill so Phase 2f historical backfill captures every novelty / retirement / orphan / category-crossing finding through a closed disposition set.

**Architecture:** Two composable halves. CLI reads existing Layer 1 tables (`change_events`, `relation_changes`, `source_state_transitions`, `release_notes`) and emits a findings report (JSON on stdout + pre-seeded markdown draft). Skill orchestrates extraction pre-flight via CLI subcommands, then walks findings interactively in a Model B shape (Claude proposes a disposition, user approves / overrides / skips). Skill writes disposition side-effects (seed YAML updates, DB column stamps, concept-note stubs, HANDOVER entries) and fills the draft markdown's disposition blocks in place. One tag-pair per invocation.

**Tech Stack:** TypeScript + Node 20 / Bun, `better-sqlite3@11`, `js-yaml`, `ulid`. Python 3 + libclang via the existing `packages/qw-config/scripts/extract-ezquake-unified.py`. Skill prompt in markdown at `~/.claude/skills/extraction-review/SKILL.md`.

**Spec:** `docs/superpowers/specs/2026-04-23-extraction-review-design.md`.

---

## File structure

### New files

- `apps/qw-oracle/scripts/load-knowledge/review/types.ts` — `Finding`, `Bucket`, `DraftFinding`, `ReviewReport` interfaces.
- `apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts` — pure function that renders pre-seeded markdown from a `ReviewReport`.
- `apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts` — emits findings for Q1 (new rows).
- `apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts` — emits findings for Q2 (disappeared rows).
- `apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts` — emits findings for Q3 (category / flag / trigger shifts).
- `apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts` — emits findings for Q4 (confidence promotions).
- `apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts` — emits findings for Q5 (release-note vs entity-change gaps).
- `apps/qw-oracle/scripts/load-knowledge/review/index.ts` — composes finders, emits JSON, calls draft-writer.
- `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts` — orchestrates checkout + unified extractor + 9 load-version calls + load-assets + release-notes for one tag.
- `apps/qw-oracle/docs/reviews/.gitkeep` — directory placeholder.
- `~/.claude/skills/extraction-review/SKILL.md` — user-global skill prompt.

### Modified files

- `apps/qw-oracle/scripts/load-knowledge/index.ts` — register `extract-tag` + `review` subcommands; update usage banner.
- `apps/qw-oracle/CLAUDE.md` — add `extract-tag` + `review` to commands block.
- `HANDOVER.md` — remove item #1 (Extraction-review skill + CLI) and item #4 (Rebuild-and-load CLI subcommand) after first live run succeeds.

### Boundary rule

The CLI (`review` subcommand) only writes its own draft markdown file and stdout. Every other side-effect (seed YAML edits, DB column stamps, concept-note stubs, HANDOVER entries) is the skill's responsibility. This keeps the judgment layer (skill prompt) separate from mechanics (TypeScript).

### Testing posture

Per the monorepo's testing philosophy (compile + build first, manual verification second, automated tests only if project already has them), this ships without automated tests. Each code task's verification step is `bunx tsc --noEmit` plus a spot-check SQL query or CLI run against the live DB. The first live review run is the end-to-end validation.

---

## Task 1: Scaffold `review/types.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/types.ts`

- [ ] **Step 1: Create the review directory**

Run: `mkdir -p apps/qw-oracle/scripts/load-knowledge/review apps/qw-oracle/docs/reviews`

- [ ] **Step 2: Add .gitkeep to the reviews directory**

Run: `touch apps/qw-oracle/docs/reviews/.gitkeep`

- [ ] **Step 3: Write the types module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/types.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/types.ts
//
// Public types for the extraction-review CLI subcommand.
// Consumed by the five findings-*.ts modules, index.ts, draft-writer.ts,
// and by the extraction-review skill on the stdout side.
// Keep stable: skill prompt pattern-matches field names at runtime.

import type { Project } from '../types.js';

export type Bucket =
  | 'addition'
  | 'retirement'
  | 'semantic-crossing'
  | 'unclassified'
  | 'source-invisible';

export type DispositionKind =
  | 'classify'
  | 'mark-orphan'
  | 'concept-note'
  | 'handover'
  | 'reject-as-noise';

export interface FindingEvidence {
  entity_ref?: string;
  relation_row_key?: string;
  commit_sha?: string;
  source_file?: string;
  source_line?: number;
  from_value?: string;
  to_value?: string;
  release_note_body?: string;
}

export interface ProposedDisposition {
  kind: DispositionKind;
  rationale: string;
}

export interface Finding {
  id: string;
  bucket: Bucket;
  summary: string;
  evidence: FindingEvidence;
  proposed_disposition?: ProposedDisposition;
}

export interface ReviewCounts {
  addition: number;
  retirement: number;
  'semantic-crossing': number;
  unclassified: number;
  'source-invisible': number;
}

export interface ReviewReport {
  project: Project;
  from_version: string;
  to_version: string;
  generated_at: string;
  draft_path: string;
  counts: ReviewCounts;
  findings: Finding[];
}

// Helper for finding-id stability across re-runs of the same (project, from, to).
// Keep implementation in a single place so callers can't drift.
export function makeFindingId(bucket: Bucket, naturalKey: string): string {
  // Deterministic and short; collisions across buckets are allowed because
  // the bucket is part of the stored Finding anyway.
  return `${bucket}:${naturalKey}`;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors mentioning `review/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/types.ts apps/qw-oracle/docs/reviews/.gitkeep
git commit -m "feat(qw-oracle): review types + reviews/ directory

First piece of the extraction-review CLI. Interface-only commit so
downstream modules can compile against stable types."
```

---

## Task 2: Write the draft-writer module

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts`

- [ ] **Step 1: Write the draft-writer module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts
//
// Renders a ReviewReport to a pre-seeded markdown file. The CLI emits this
// file at --out; the extraction-review skill fills in the _(pending)_
// blocks as it walks findings.
//
// The skill pattern-matches on the exact labels "**Proposed disposition:**",
// "**Rationale:**", and "**Applied:**". Do not rename without updating the
// skill prompt.

import { writeFileSync } from 'fs';
import type { Finding, ReviewReport } from './types.js';

export function writeDraft(report: ReviewReport): void {
  const md = renderDraft(report);
  writeFileSync(report.draft_path, md, 'utf-8');
}

export function renderDraft(report: ReviewReport): string {
  const parts: string[] = [];
  parts.push(renderFrontmatter(report));
  parts.push('');
  parts.push(`# Extraction review: ${report.project} ${report.from_version} -> ${report.to_version}`);
  parts.push('');
  parts.push(renderSummary(report));
  parts.push('');
  parts.push('## Findings');
  parts.push('');
  for (const f of report.findings) {
    parts.push(renderFinding(f));
    parts.push('');
  }
  return parts.join('\n');
}

function renderFrontmatter(report: ReviewReport): string {
  return [
    '---',
    `project: ${report.project}`,
    `from_version: ${report.from_version}`,
    `to_version: ${report.to_version}`,
    `generated_at: ${report.generated_at}`,
    `reviewer: (skill fills)`,
    `status: draft`,
    '---',
  ].join('\n');
}

function renderSummary(report: ReviewReport): string {
  const c = report.counts;
  const total = c.addition + c.retirement + c['semantic-crossing'] + c.unclassified + c['source-invisible'];
  return [
    '## Summary',
    '',
    `- Additions: ${c.addition} (${c.addition} pending)`,
    `- Retirements: ${c.retirement} (${c.retirement} pending)`,
    `- Semantic crossings: ${c['semantic-crossing']} (${c['semantic-crossing']} pending)`,
    `- Unclassified promotions: ${c.unclassified} (${c.unclassified} pending)`,
    `- Source-invisible changes: ${c['source-invisible']} (${c['source-invisible']} pending)`,
    `- **Total:** ${total}`,
  ].join('\n');
}

function renderFinding(f: Finding): string {
  const ref = f.evidence.entity_ref ?? f.evidence.relation_row_key ?? '(no-ref)';
  const lines: string[] = [];
  lines.push(`### ${f.id} · ${f.bucket} · ${ref}`);
  lines.push('');
  lines.push(`**Summary:** ${f.summary}`);
  lines.push('');
  lines.push('**Evidence:**');
  if (f.evidence.commit_sha) lines.push(`- commit: ${f.evidence.commit_sha}`);
  if (f.evidence.source_file) {
    const loc = f.evidence.source_line ? `${f.evidence.source_file}:${f.evidence.source_line}` : f.evidence.source_file;
    lines.push(`- source: ${loc}`);
  }
  if (f.evidence.entity_ref) lines.push(`- entity_ref: ${f.evidence.entity_ref}`);
  if (f.evidence.relation_row_key) lines.push(`- relation_row_key: ${f.evidence.relation_row_key}`);
  if (f.evidence.from_value !== undefined) lines.push(`- from_value: ${formatValue(f.evidence.from_value)}`);
  if (f.evidence.to_value !== undefined) lines.push(`- to_value: ${formatValue(f.evidence.to_value)}`);
  if (f.evidence.release_note_body) {
    lines.push('- release_note_body:');
    lines.push('  ```');
    for (const line of f.evidence.release_note_body.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('  ```');
  }
  lines.push('');
  if (f.proposed_disposition) {
    lines.push(`**Proposed disposition:** ${f.proposed_disposition.kind}`);
    lines.push(`**Rationale:** ${f.proposed_disposition.rationale}`);
  } else {
    lines.push(`**Proposed disposition:** _(pending)_`);
    lines.push(`**Rationale:** _(pending)_`);
  }
  lines.push(`**Applied:** _(pending)_`);
  return lines.join('\n');
}

function formatValue(v: string): string {
  if (v === '') return '""';
  if (v.length > 120) return '`' + v.slice(0, 117) + '...`';
  return '`' + v + '`';
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Spot-check the output shape**

Create a temporary driver script in `scripts/load-knowledge/` (temp file, per the project's "tsx -e cannot resolve relative paths" rule):

```bash
cat > apps/qw-oracle/scripts/load-knowledge/_tmp-draft-check.ts <<'EOF'
import { renderDraft } from './review/draft-writer.js';
console.log(renderDraft({
  project: 'ezquake', from_version: '3.5.0', to_version: '3.6.0',
  generated_at: '2026-04-23T00:00:00Z',
  draft_path: '/tmp/x.md',
  counts: { addition: 1, retirement: 0, 'semantic-crossing': 0, unclassified: 0, 'source-invisible': 0 },
  findings: [{
    id: 'addition:ezquake:cvar:cl_foo',
    bucket: 'addition',
    summary: 'New cvar cl_foo',
    evidence: { entity_ref: 'ezquake:cvar:cl_foo', commit_sha: 'abc123', source_file: 'cl.c', source_line: 42, from_value: '', to_value: '0' },
  }],
}));
EOF
cd apps/qw-oracle && npx tsx scripts/load-knowledge/_tmp-draft-check.ts
rm apps/qw-oracle/scripts/load-knowledge/_tmp-draft-check.ts
```

Expected output starts with `---\nproject: ezquake\n...` and ends with `**Applied:** _(pending)_`.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/draft-writer.ts
git commit -m "feat(qw-oracle): review draft-writer

Renders ReviewReport to pre-seeded markdown with disposition blocks.
Skill will fill in the _(pending)_ lines in place."
```

---

## Task 3: Write `findings-additions.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts`

Context — Q1 surfaces **rows that appeared**:
- `change_events` rows with `change_kind='created'` for the tag-pair (new entity rows).
- `relation_changes` rows with `change_kind='created'` (new relation rows across the four asset_* tables).

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts
//
// Q1: rows that appeared between from_version and to_version.
// Pulls from change_events (entity creations) and relation_changes
// (asset_* relation creations). One Finding per row.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export function findAdditions(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Entity creations.
  const entityRows = db.prepare(`
    SELECT ce.entity_id, ce.to_version, ce.commit_sha, ce.commit_message_excerpt,
           e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.to_version = ?
      AND ce.change_kind = 'created'
      AND e.project = ?
    ORDER BY e.type, e.name
  `).all(toVersion, project) as Array<{
    entity_id: number;
    to_version: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
    canonical_id: string;
    type: string;
    name: string;
  }>;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('addition', r.canonical_id),
      bucket: 'addition',
      summary: `New ${r.type} \`${r.name}\` first observed at ${toVersion}.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { to_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  // Relation creations.
  const relationRows = db.prepare(`
    SELECT relation_table, row_key_json, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ? AND to_version = ? AND change_kind = 'created'
    ORDER BY relation_table, row_key_json
  `).all(project, toVersion) as Array<{
    relation_table: string;
    row_key_json: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>;

  for (const r of relationRows) {
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('addition', key),
      bucket: 'addition',
      summary: `New ${r.relation_table} row ${r.row_key_json} first observed at ${toVersion}.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { to_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  return findings;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Spot-check the query**

Run: `cd apps/qw-oracle && sqlite3 data/knowledge.db "SELECT COUNT(*) FROM change_events WHERE change_kind='created'"`
Expected: a non-zero integer if any diff has run (current DB has ezQuake head data). Confirms the SQL column names match the schema.

- [ ] **Step 4: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/findings-additions.ts
git commit -m "feat(qw-oracle): review findings — additions (Q1)

Emits one Finding per entity creation (change_events) and one per
relation-row creation (relation_changes) for the tag-pair."
```

---

## Task 4: Write `findings-retirements.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts`

Context — Q2 surfaces **rows that disappeared**: `change_events` / `relation_changes` rows with `change_kind='deleted'` for the tag-pair. The retirement finding's disposition is often `mark-orphan` (for asset_extensions) — that routing happens in the skill, not here.

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts
//
// Q2: rows that disappeared between from_version and to_version.
// change_events + relation_changes with change_kind='deleted'.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export function findRetirements(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Entity deletions. Pull commit blame from change_events and the entity's
  // type/name for the summary.
  const entityRows = db.prepare(`
    SELECT ce.entity_id, ce.commit_sha, ce.commit_message_excerpt,
           e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.from_version = ?
      AND ce.to_version = ?
      AND ce.change_kind = 'deleted'
      AND e.project = ?
    ORDER BY e.type, e.name
  `).all(fromVersion, toVersion, project) as Array<{
    entity_id: number;
    commit_sha: string;
    commit_message_excerpt: string | null;
    canonical_id: string;
    type: string;
    name: string;
  }>;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('retirement', r.canonical_id),
      bucket: 'retirement',
      summary: `${r.type} \`${r.name}\` present in ${fromVersion}, gone in ${toVersion}.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { from_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  // Relation deletions.
  const relationRows = db.prepare(`
    SELECT relation_table, row_key_json, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ? AND from_version = ? AND to_version = ? AND change_kind = 'deleted'
    ORDER BY relation_table, row_key_json
  `).all(project, fromVersion, toVersion) as Array<{
    relation_table: string;
    row_key_json: string;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>;

  for (const r of relationRows) {
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('retirement', key),
      bucket: 'retirement',
      summary: `${r.relation_table} row ${r.row_key_json} present in ${fromVersion}, gone in ${toVersion}.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        ...(r.commit_message_excerpt ? { from_value: r.commit_message_excerpt } : {}),
      },
    });
  }

  return findings;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/findings-retirements.ts
git commit -m "feat(qw-oracle): review findings — retirements (Q2)

Emits one Finding per deletion event in change_events or
relation_changes for the tag-pair."
```

---

## Task 5: Write `findings-semantic-crossings.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts`

Context — Q3 surfaces **field changes with categorical meaning**: a cvar's `flag_names` flipping, an asset_loader_site's `load_trigger` shifting from `unknown` to `on_map_load`, a ruleset's `restrict_*` flags changing. Value drift (e.g. cvar `default_value` 0 -> 1) is NOT a semantic crossing — a hard-coded allowlist per table keeps this deterministic.

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts
//
// Q3: field changes that indicate categorical / semantic evolution rather
// than value drift. Hard-coded allowlist per table so "cvar default_value
// changed from 0 to 1" does NOT surface as a semantic crossing (that's
// ordinary value drift), while "asset_loader_site load_trigger changed
// from unknown to on_map_load" DOES.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

// Entity-level fields whose changes are categorical.
// Keyed on change_events.field_name exactly as the diff pipeline writes it.
const ENTITY_SEMANTIC_FIELDS: readonly string[] = [
  'flag_names',          // cvar flag-bit set changed
  'teamplay_restricted', // macro restriction toggled
  'macro_type',          // runtime vs static
  'server_only',         // cvar server_only flipped
  'key_code',            // keyname remapped
  'build_variant',       // keyname platform changed
  'hud_alias',           // hud element alias changed
  'min_state_raw',       // hud element visibility gate
  'draw_order_raw',      // hud element paint order
  // ruleset restrict_* flags (all ten) + cap + pin list
  'restrict_triggers', 'restrict_packet', 'restrict_particles', 'restrict_play',
  'restrict_logging', 'restrict_rollangle', 'restrict_ipc', 'restrict_exec',
  'restrict_setcalc', 'restrict_seteval', 'restrict_setex',
  'maxfps',
  'locked_cvars_json',
  'enum_ident',          // ruleset enum rename
  'category',            // token_primitive category (led / glyph / separator / expansion)
  'bitmask_family',      // flag_bit family reassignment
];

// Relation fields whose changes carry categorical meaning.
// Per relation_table -> field_name allowlist. Keep in sync with the
// RELATION_DIFF_CONFIGS in diff-versions.ts.
const RELATION_SEMANTIC_FIELDS: Record<string, readonly string[]> = {
  asset_extensions: ['category_id'],
  asset_path_rules: ['rule_kind'],
  asset_cvar_bindings: ['load_trigger', 'confidence'],
  asset_loader_sites: ['reads_category_id', 'load_trigger', 'path_source', 'confidence'],
};

export function findSemanticCrossings(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Entity-level crossings.
  const entityPlaceholders = ENTITY_SEMANTIC_FIELDS.map(() => '?').join(',');
  const entityRows = db.prepare(`
    SELECT ce.entity_id, ce.field_name, ce.old_value, ce.new_value, ce.commit_sha,
           ce.commit_message_excerpt, e.canonical_id, e.type, e.name
    FROM change_events ce
    JOIN entities e ON e.id = ce.entity_id
    WHERE ce.from_version = ? AND ce.to_version = ?
      AND ce.change_kind = 'modified'
      AND e.project = ?
      AND ce.field_name IN (${entityPlaceholders})
    ORDER BY e.type, e.name, ce.field_name
  `).all(fromVersion, toVersion, project, ...ENTITY_SEMANTIC_FIELDS) as Array<{
    entity_id: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    commit_sha: string;
    commit_message_excerpt: string | null;
    canonical_id: string;
    type: string;
    name: string;
  }>;

  for (const r of entityRows) {
    findings.push({
      id: makeFindingId('semantic-crossing', `${r.canonical_id}:${r.field_name}`),
      bucket: 'semantic-crossing',
      summary: `${r.type} \`${r.name}\`: ${r.field_name} changed.`,
      evidence: {
        entity_ref: r.canonical_id,
        commit_sha: r.commit_sha,
        from_value: r.old_value ?? '',
        to_value: r.new_value ?? '',
      },
    });
  }

  // Relation-level crossings, one per (relation_table, field).
  for (const [table, fields] of Object.entries(RELATION_SEMANTIC_FIELDS)) {
    if (fields.length === 0) continue;
    const placeholders = fields.map(() => '?').join(',');
    const relRows = db.prepare(`
      SELECT relation_table, row_key_json, field_name, old_value, new_value,
             commit_sha, commit_message_excerpt
      FROM relation_changes
      WHERE project = ? AND from_version = ? AND to_version = ?
        AND change_kind = 'modified'
        AND relation_table = ?
        AND field_name IN (${placeholders})
      ORDER BY row_key_json, field_name
    `).all(project, fromVersion, toVersion, table, ...fields) as Array<{
      relation_table: string;
      row_key_json: string;
      field_name: string;
      old_value: string | null;
      new_value: string | null;
      commit_sha: string;
      commit_message_excerpt: string | null;
    }>;

    for (const r of relRows) {
      const key = `${r.relation_table}:${r.row_key_json}`;
      findings.push({
        id: makeFindingId('semantic-crossing', `${key}:${r.field_name}`),
        bucket: 'semantic-crossing',
        summary: `${r.relation_table}[${r.row_key_json}]: ${r.field_name} changed.`,
        evidence: {
          relation_row_key: key,
          commit_sha: r.commit_sha,
          from_value: r.old_value ?? '',
          to_value: r.new_value ?? '',
        },
      });
    }
  }

  return findings;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/findings-semantic-crossings.ts
git commit -m "feat(qw-oracle): review findings — semantic crossings (Q3)

Field allowlist per table distinguishes categorical evolution from
ordinary value drift. Ruleset flags, macro restrictions, loader-site
triggers, etc. surface; cvar default_value drift does not."
```

---

## Task 6: Write `findings-unclassified.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts`

Context — Q4 surfaces **confidence-field promotions / demotions** on `asset_cvar_bindings` and `asset_loader_sites`. First surface: rows at toVersion still stuck at low confidence. Second surface: rows whose confidence moved downward in the diff.

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts
//
// Q4: confidence promotions / demotions on relation rows that carry a
// confidence column (asset_cvar_bindings, asset_loader_sites).
// Two surfaces:
//   A. Rows at toVersion with confidence='unclassified' or 'heuristic'
//      (loader sites) or 'auto' / 'auto_orphan' (cvar bindings).
//   B. Rows whose confidence moved downward between the two versions.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

const CONFIDENCE_ORDER: Record<string, number> = {
  unclassified: 0,
  heuristic: 1,
  auto: 1,
  intentionally_generic: 2,
  auto_confirms_seed: 2,
  auto_orphan: 2,
  seed: 3,
  certain: 3,
};

export function findUnclassified(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  const findings: Finding[] = [];

  // Surface A: loader-sites still unclassified/heuristic at toVersion.
  const loaderRows = db.prepare(`
    SELECT canonical_id, confidence, source_file, source_line, notes
    FROM asset_loader_sites
    WHERE project = ? AND version = ? AND confidence IN ('unclassified','heuristic')
    ORDER BY canonical_id
  `).all(project, toVersion) as Array<{
    canonical_id: string;
    confidence: string;
    source_file: string;
    source_line: number;
    notes: string | null;
  }>;

  for (const r of loaderRows) {
    const key = `asset_loader_sites:${r.canonical_id}`;
    findings.push({
      id: makeFindingId('unclassified', key),
      bucket: 'unclassified',
      summary: `asset_loader_sites \`${r.canonical_id}\` at confidence='${r.confidence}'.`,
      evidence: {
        relation_row_key: key,
        source_file: r.source_file,
        source_line: r.source_line,
        ...(r.notes ? { to_value: r.notes } : {}),
      },
    });
  }

  // Surface A: cvar-bindings still low-confidence at toVersion.
  // asset_cvar_bindings.confidence ∈ {seed, auto, auto_confirms_seed, auto_orphan}.
  // 'auto' and 'auto_orphan' are candidates for promotion.
  const bindingRows = db.prepare(`
    SELECT cvar_canonical_id, category_id, path_pattern, confidence, notes
    FROM asset_cvar_bindings
    WHERE project = ? AND version = ? AND confidence IN ('auto','auto_orphan')
    ORDER BY cvar_canonical_id, category_id
  `).all(project, toVersion) as Array<{
    cvar_canonical_id: string;
    category_id: string;
    path_pattern: string | null;
    confidence: string;
    notes: string | null;
  }>;

  for (const r of bindingRows) {
    const key = `asset_cvar_bindings:${r.cvar_canonical_id}|${r.category_id}|${r.path_pattern ?? ''}`;
    findings.push({
      id: makeFindingId('unclassified', key),
      bucket: 'unclassified',
      summary: `asset_cvar_bindings \`${r.cvar_canonical_id}\` -> \`${r.category_id}\` at confidence='${r.confidence}'.`,
      evidence: {
        relation_row_key: key,
        ...(r.notes ? { to_value: r.notes } : {}),
      },
    });
  }

  // Surface B: downward confidence movements recorded in relation_changes.
  const movementRows = db.prepare(`
    SELECT relation_table, row_key_json, old_value, new_value, commit_sha, commit_message_excerpt
    FROM relation_changes
    WHERE project = ? AND from_version = ? AND to_version = ?
      AND change_kind = 'modified'
      AND field_name = 'confidence'
    ORDER BY relation_table, row_key_json
  `).all(project, fromVersion, toVersion) as Array<{
    relation_table: string;
    row_key_json: string;
    old_value: string | null;
    new_value: string | null;
    commit_sha: string;
    commit_message_excerpt: string | null;
  }>;

  for (const r of movementRows) {
    const oldOrd = CONFIDENCE_ORDER[r.old_value ?? ''] ?? -1;
    const newOrd = CONFIDENCE_ORDER[r.new_value ?? ''] ?? -1;
    if (newOrd >= oldOrd) continue; // only demotions in surface B
    const key = `${r.relation_table}:${r.row_key_json}`;
    findings.push({
      id: makeFindingId('unclassified', `${key}:confidence-demotion`),
      bucket: 'unclassified',
      summary: `${r.relation_table}[${r.row_key_json}]: confidence demoted.`,
      evidence: {
        relation_row_key: key,
        commit_sha: r.commit_sha,
        from_value: r.old_value ?? '',
        to_value: r.new_value ?? '',
      },
    });
  }

  return findings;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/findings-unclassified.ts
git commit -m "feat(qw-oracle): review findings — unclassified promotions (Q4)

Surfaces low-confidence relation rows at toVersion plus downward
confidence demotions. Promotions become disposition=classify in skill."
```

---

## Task 7: Write `findings-source-invisible.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts`

Context — Q5 surfaces **release-note bullets whose subject matter is NOT already represented in the entity or relation change streams**. Heuristic: a release_notes row at toVersion with `referenced_entity_ids_json` NULL AND whose `commit_urls_json` SHAs don't overlap with any commit in change_events/relation_changes for the tag-pair is source-invisible.

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts
//
// Q5: release-note bullets at toVersion that have no corresponding entity
// or relation change. A bullet is source-invisible when BOTH conditions hold:
//   (a) referenced_entity_ids_json is NULL (the bullet didn't mention any
//       loaded entity by identifier), AND
//   (b) none of the bullet's commit_urls resolve to a commit_sha present in
//       change_events or relation_changes for the tag-pair.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export function findSourceInvisible(
  db: Database.Database,
  project: Project,
  fromVersion: string,
  toVersion: string,
): Finding[] {
  // Collect all commit SHAs referenced by the tag-pair's entity + relation diff.
  const tagPairShas = new Set<string>();
  const entityShas = db.prepare(`
    SELECT DISTINCT commit_sha FROM change_events
    WHERE from_version = ? AND to_version = ?
  `).all(fromVersion, toVersion) as Array<{ commit_sha: string }>;
  for (const r of entityShas) tagPairShas.add(r.commit_sha.toLowerCase());
  const relationShas = db.prepare(`
    SELECT DISTINCT commit_sha FROM relation_changes
    WHERE project = ? AND from_version = ? AND to_version = ?
  `).all(project, fromVersion, toVersion) as Array<{ commit_sha: string }>;
  for (const r of relationShas) tagPairShas.add(r.commit_sha.toLowerCase());

  // Release notes for toVersion.
  const noteRows = db.prepare(`
    SELECT id, section, ordinal, body_md, referenced_entity_ids_json, commit_urls_json
    FROM release_notes
    WHERE project = ? AND version = ?
    ORDER BY section, ordinal
  `).all(project, toVersion) as Array<{
    id: number;
    section: string;
    ordinal: number;
    body_md: string;
    referenced_entity_ids_json: string | null;
    commit_urls_json: string | null;
  }>;

  const findings: Finding[] = [];
  for (const r of noteRows) {
    if (r.referenced_entity_ids_json) continue; // (a) fails: has entity ref
    const urls = r.commit_urls_json ? (JSON.parse(r.commit_urls_json) as string[]) : [];
    const shasFromUrls = urls
      .map((u) => /\/commit\/([a-f0-9]{7,40})/i.exec(u)?.[1]?.toLowerCase())
      .filter((s): s is string => !!s);
    const hasTagPairCommit = shasFromUrls.some((sha) =>
      [...tagPairShas].some((known) => known.startsWith(sha) || sha.startsWith(known)),
    );
    if (hasTagPairCommit) continue; // (b) fails: covered by entity/relation change

    findings.push({
      id: makeFindingId('source-invisible', `release_notes:${r.id}`),
      bucket: 'source-invisible',
      summary: `Release-note bullet in section \`${r.section}\` without entity / commit coverage.`,
      evidence: {
        release_note_body: r.body_md,
      },
    });
  }

  return findings;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/findings-source-invisible.ts
git commit -m "feat(qw-oracle): review findings — source-invisible changes (Q5)

Release-note bullets at toVersion with neither entity refs nor
commit-SHA overlap against the tag-pair's change streams. Candidates
for Layer 3 concept notes or handover deferrals."
```

---

## Task 8: Compose the review dispatcher

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/review/index.ts`

- [ ] **Step 1: Write the dispatcher**

Write this content to `apps/qw-oracle/scripts/load-knowledge/review/index.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/review/index.ts
//
// Composes the five finders, writes the pre-seeded markdown draft, returns
// a ReviewReport. Called by the CLI (index.ts) runReview handler.

import { existsSync, readFileSync } from 'fs';
import type Database from 'better-sqlite3';
import { findAdditions } from './findings-additions.js';
import { findRetirements } from './findings-retirements.js';
import { findSemanticCrossings } from './findings-semantic-crossings.js';
import { findUnclassified } from './findings-unclassified.js';
import { findSourceInvisible } from './findings-source-invisible.js';
import { writeDraft } from './draft-writer.js';
import type { Finding, ReviewCounts, ReviewReport } from './types.js';
import type { Project } from '../types.js';

export interface RunReviewOptions {
  db: Database.Database;
  project: Project;
  fromVersion: string;
  toVersion: string;
  outPath: string;
  force: boolean;
}

export function runReview(options: RunReviewOptions): ReviewReport {
  assertPreconditions(options);
  assertDraftNotFilled(options.outPath, options.force);

  const now = new Date().toISOString();

  const findings: Finding[] = [
    ...findAdditions(options.db, options.project, options.fromVersion, options.toVersion),
    ...findRetirements(options.db, options.project, options.fromVersion, options.toVersion),
    ...findSemanticCrossings(options.db, options.project, options.fromVersion, options.toVersion),
    ...findUnclassified(options.db, options.project, options.fromVersion, options.toVersion),
    ...findSourceInvisible(options.db, options.project, options.fromVersion, options.toVersion),
  ];

  const counts: ReviewCounts = {
    addition: 0,
    retirement: 0,
    'semantic-crossing': 0,
    unclassified: 0,
    'source-invisible': 0,
  };
  for (const f of findings) counts[f.bucket] += 1;

  const report: ReviewReport = {
    project: options.project,
    from_version: options.fromVersion,
    to_version: options.toVersion,
    generated_at: now,
    draft_path: options.outPath,
    counts,
    findings,
  };

  writeDraft(report);
  return report;
}

function assertPreconditions(options: RunReviewOptions): void {
  const { db, project, fromVersion, toVersion } = options;

  const fromRow = db.prepare(`SELECT 1 FROM versions WHERE project = ? AND version = ?`).get(project, fromVersion);
  if (!fromRow) {
    throw new Error(
      `No versions row for ${project}:${fromVersion}. Run \`extract-tag --version ${fromVersion}\` first.`,
    );
  }
  const toRow = db.prepare(`SELECT 1 FROM versions WHERE project = ? AND version = ?`).get(project, toVersion);
  if (!toRow) {
    throw new Error(
      `No versions row for ${project}:${toVersion}. Run \`extract-tag --version ${toVersion}\` first.`,
    );
  }

  const ceCount = db.prepare(
    `SELECT COUNT(*) AS n FROM change_events WHERE from_version = ? AND to_version = ?`,
  ).get(fromVersion, toVersion) as { n: number };
  const rcCount = db.prepare(
    `SELECT COUNT(*) AS n FROM relation_changes WHERE project = ? AND from_version = ? AND to_version = ?`,
  ).get(project, fromVersion, toVersion) as { n: number };
  if (ceCount.n === 0 && rcCount.n === 0) {
    throw new Error(
      `No change_events or relation_changes for ${project}:${fromVersion}->${toVersion}. ` +
      `Run \`diff --project ${project} --from ${fromVersion} --to ${toVersion}\` first.`,
    );
  }

  const rnCount = db.prepare(
    `SELECT COUNT(*) AS n FROM release_notes WHERE project = ? AND version = ?`,
  ).get(project, toVersion) as { n: number };
  if (rnCount.n === 0) {
    throw new Error(
      `No release_notes rows for ${project}:${toVersion}. ` +
      `Run \`release-notes --project ${project} --version ${toVersion} --github-token $GITHUB_TOKEN\` first.`,
    );
  }
}

function assertDraftNotFilled(outPath: string, force: boolean): void {
  if (!existsSync(outPath)) return;
  if (force) return;
  const body = readFileSync(outPath, 'utf-8');
  // "**Applied:** " followed by anything except "_(pending)_" indicates a
  // disposition has been recorded.
  const hasFilledApplied = /\*\*Applied:\*\*\s+(?!_\(pending\)_)/.test(body);
  const hasFilledDisposition = /\*\*Proposed disposition:\*\*\s+(?!_\(pending\)_)/.test(body);
  if (hasFilledApplied || hasFilledDisposition) {
    throw new Error(
      `Output draft at ${outPath} has filled-in dispositions. ` +
      `Pass --force to overwrite or resume via the extraction-review skill.`,
    );
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/review/index.ts
git commit -m "feat(qw-oracle): review dispatcher + preflight

Composes the five finders, writes the pre-seeded markdown draft,
hard-errors when prerequisites (versions / diff / release-notes)
are missing or when --out has existing filled-in dispositions."
```

---

## Task 9: Write `extract-tag.ts`

**Files:**
- Create: `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`

Context — this subcommand encapsulates "everything needed to make one tag fully loaded":

1. `git -C <repo> checkout <tag>` in `research/repos/ezquake-source`.
2. Run the unified Python extractor, writing to `packages/qw-config/src/data/`.
3. Call `loadVersion` once per entity type with the matching JSON file path.
4. Call `loadAssets` with the asset bundle JSON.
5. Call `loadReleaseNotes` if a GitHub token is available.

The JSON file naming follows the existing convention — the unified extractor writes `ezquake-<entity>-ast.json` to the output dir.

- [ ] **Step 1: Write the module**

Write this content to `apps/qw-oracle/scripts/load-knowledge/extract-tag.ts`:

```typescript
// apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
//
// Atomic "ensure this tag is fully loaded" operation. Runs:
//   1. git checkout <tag> in the project's source repo
//   2. the unified Python extractor (writes JSON files to packages/qw-config/src/data/)
//   3. loadVersion() for each of the 9 entity types
//   4. loadAssets() for the asset bundle
//   5. loadReleaseNotes() if a GitHub token is available
//
// Idempotent: re-running against the same tag upserts rows via the existing
// loaders' natural-key patterns. Safe to call from skill preflight.
//
// ezQuake only for the first ship. FTE / MVDSV / KTX each need their own
// extractor; this file stubs them as 'not-yet-supported' errors.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import { loadVersion } from './load-version.js';
import { loadAssets } from './load-assets.js';
import { loadReleaseNotes } from './load-release-notes.js';
import type { EntityType, Project } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const PROJECT_REPO_PATH: Record<Project, string> = {
  ezquake: join(MONOREPO_ROOT, 'research', 'repos', 'ezquake-source'),
  fte:     join(MONOREPO_ROOT, 'research', 'repos', 'fteqw'),
  mvdsv:   join(MONOREPO_ROOT, 'research', 'repos', 'mvdsv'),
  ktx:     join(MONOREPO_ROOT, 'research', 'repos', 'ktx'),
};

const PROJECT_EXTRACTOR: Record<Project, string | null> = {
  ezquake: join(MONOREPO_ROOT, 'packages', 'qw-config', 'scripts', 'extract-ezquake-unified.py'),
  fte: null,
  mvdsv: null,
  ktx: null,
};

const EXTRACTOR_OUTPUT_DIR = join(MONOREPO_ROOT, 'packages', 'qw-config', 'src', 'data');

// Per-entity-type JSON file mapping. Keyed on the unified extractor's output names.
const ENTITY_JSON_FILES: Record<EntityType, string | null> = {
  cvar:            'ezquake-cvars-ast.json',
  command:         'ezquake-commands-ast.json',
  macro:           'ezquake-macros-ast.json',
  cmdline_param:   'ezquake-cmdline-params-ast.json',
  keyname:         'ezquake-keynames-ast.json',
  hud_element:     'ezquake-hud-elements-ast.json',
  ruleset:         'ezquake-rulesets-ast.json',
  token_primitive: 'ezquake-token-primitives-ast.json',
  flag_bit:        'ezquake-flag-bits-ast.json',
  asset_category:  null, // loaded via asset bundle, not standalone
};

const ASSET_BUNDLE_FILE = 'ezquake-asset-bundle.json';

const EXTRACTOR_VERSION_DEFAULT = 'clang-ezquake-unified@1.0.0';

export interface ExtractTagOptions {
  db: Database.Database;
  project: Project;
  version: string;
  ordinal: number;
  commitSha?: string;    // resolved from tag if omitted
  tagDate?: string;      // resolved from tag if omitted
  githubToken?: string;
  skipReleaseNotes?: boolean;
  force?: boolean;
}

export interface ExtractTagResult {
  project: Project;
  version: string;
  commitSha: string;
  entitiesLoaded: Partial<Record<EntityType, number>>;
  assetsLoaded: { extensions: number; pathRules: number; cvarBindings: number; loaderSites: number };
  releaseNotesLoaded: number | null;
}

export async function extractTag(options: ExtractTagOptions): Promise<ExtractTagResult> {
  const repoPath = PROJECT_REPO_PATH[options.project];
  const extractorPath = PROJECT_EXTRACTOR[options.project];
  if (!extractorPath) {
    throw new Error(
      `extract-tag does not yet support project=${options.project}. ` +
      `Only ezquake is wired in the first ship; FTE/MVDSV/KTX require their own extractors.`,
    );
  }
  if (!existsSync(repoPath)) {
    throw new Error(`Source repo not found at ${repoPath}. Clone it first.`);
  }

  // 1. Checkout.
  execSync(`git -C "${repoPath}" fetch --tags`, { stdio: 'inherit' });
  execSync(`git -C "${repoPath}" checkout "${options.version}"`, { stdio: 'inherit' });

  const commitSha = options.commitSha ?? execSync(`git -C "${repoPath}" rev-parse HEAD`, {
    encoding: 'utf-8',
  }).trim();
  const tagDate = options.tagDate ?? resolveTagDate(repoPath, options.version);

  // 2. Extractor (Python).
  const spawn = spawnSync(
    'python3',
    [
      extractorPath,
      '--repo-root', repoPath,
      '--output-dir', EXTRACTOR_OUTPUT_DIR,
      '--handlers', 'all',
    ],
    { stdio: 'inherit' },
  );
  if (spawn.status !== 0) {
    throw new Error(`Python extractor failed with status ${spawn.status}`);
  }

  // 3. Entity loaders.
  const entitiesLoaded: Partial<Record<EntityType, number>> = {};
  for (const [type, jsonFile] of Object.entries(ENTITY_JSON_FILES) as [EntityType, string | null][]) {
    if (!jsonFile) continue;
    const jsonPath = join(EXTRACTOR_OUTPUT_DIR, jsonFile);
    if (!existsSync(jsonPath)) {
      console.warn(`[extract-tag] missing ${jsonFile}; skipping type=${type}`);
      continue;
    }
    const result = loadVersion({
      db: options.db,
      project: options.project,
      version: options.version,
      type,
      jsonPath,
      commitSha,
      tagDate,
      ordinal: options.ordinal,
      extractorVersion: EXTRACTOR_VERSION_DEFAULT,
      forceOverwrite: options.force ?? false,
    });
    entitiesLoaded[type] = result.entityCount;
  }

  // 4. Asset bundle.
  const bundlePath = join(EXTRACTOR_OUTPUT_DIR, ASSET_BUNDLE_FILE);
  if (!existsSync(bundlePath)) {
    throw new Error(
      `Asset bundle missing at ${bundlePath}. ` +
      `Run build-asset-bundle for ${options.project}:${options.version} before extract-tag.`,
    );
  }
  const assets = loadAssets({
    db: options.db,
    project: options.project,
    version: options.version,
    jsonPath: bundlePath,
    commitSha,
    tagDate,
    ordinal: options.ordinal,
    extractorVersion: EXTRACTOR_VERSION_DEFAULT,
  });

  // 5. Release notes (optional — skill preflight will call release-notes separately if skipped here).
  let releaseNotesLoaded: number | null = null;
  const token = options.githubToken ?? process.env.GITHUB_TOKEN;
  if (!options.skipReleaseNotes && token) {
    const rn = await loadReleaseNotes({
      db: options.db,
      project: options.project,
      version: options.version,
      githubToken: token,
    });
    releaseNotesLoaded = rn.bulletsInserted;
  }

  return {
    project: options.project,
    version: options.version,
    commitSha,
    entitiesLoaded,
    assetsLoaded: {
      extensions: assets.extensionsUpserted,
      pathRules: assets.pathRulesUpserted,
      cvarBindings: assets.cvarBindingsUpserted,
      loaderSites: assets.loaderSitesUpserted,
    },
    releaseNotesLoaded,
  };
}

function resolveTagDate(repoPath: string, tag: string): string | null {
  try {
    const iso = execSync(`git -C "${repoPath}" log -1 --format=%cI "${tag}"`, {
      encoding: 'utf-8',
    }).trim();
    return iso || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
git commit -m "feat(qw-oracle): extract-tag — atomic tag-load orchestration

Encapsulates checkout + python extractor + load-version x9 + load-assets
+ release-notes for one (project, version) tuple. Idempotent. ezQuake
only in this ship; FTE/MVDSV/KTX stubbed with clear error.

Absorbs HANDOVER item #4 (rebuild-and-load CLI subcommand)."
```

---

## Task 10: Register subcommands in `index.ts`

**Files:**
- Modify: `apps/qw-oracle/scripts/load-knowledge/index.ts`

- [ ] **Step 1: Add the `extract-tag` + `review` subcommand dispatches**

Edit `apps/qw-oracle/scripts/load-knowledge/index.ts`.

Find this block:

```typescript
  if (subcommand === 'release-notes') {
    await runReleaseNotes(rest);
    return;
  }
```

Replace with:

```typescript
  if (subcommand === 'release-notes') {
    await runReleaseNotes(rest);
    return;
  }

  if (subcommand === 'extract-tag') {
    await runExtractTag(rest);
    return;
  }

  if (subcommand === 'review') {
    await runReviewCli(rest);
    return;
  }
```

- [ ] **Step 2: Update the usage banner**

Find this block in `usageAndExit`:

```typescript
  release-notes --project <p> --version <v> --github-token <token>
`.trim());
```

Replace with:

```typescript
  release-notes --project <p> --version <v> --github-token <token>
  extract-tag   --project <p> --version <v> --ordinal <n>
                [--commit <sha>] [--tag-date <iso8601>]
                [--github-token <t>] [--skip-release-notes] [--force]
  review        --project <p> --from <v1> --to <v2>
                [--out <path>] [--force]
`.trim());
```

- [ ] **Step 3: Append the `runExtractTag` handler**

Append this to the end of `apps/qw-oracle/scripts/load-knowledge/index.ts` (after the existing `runReleaseNotes` function, before the `main().catch(...)` line):

```typescript
async function runExtractTag(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      version: { type: 'string' },
      ordinal: { type: 'string' },
      commit: { type: 'string' },
      'tag-date': { type: 'string' },
      'github-token': { type: 'string' },
      'skip-release-notes': { type: 'boolean' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'version', 'ordinal'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  const { extractTag } = await import('./extract-tag.js');
  const db = openKnowledgeDb();
  try {
    const result = await extractTag({
      db,
      project: values.project as Project,
      version: values.version!,
      ordinal: Number(values.ordinal),
      commitSha: values.commit,
      tagDate: values['tag-date'],
      githubToken: values['github-token'] ?? process.env.GITHUB_TOKEN,
      skipReleaseNotes: values['skip-release-notes'] ?? false,
      force: values.force ?? false,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    db.close();
  }
}
```

- [ ] **Step 4: Append the `runReviewCli` handler**

Append this to the end of `apps/qw-oracle/scripts/load-knowledge/index.ts` (after `runExtractTag`, before the `main().catch(...)` line):

```typescript
async function runReviewCli(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      out: { type: 'string' },
      force: { type: 'boolean' },
    },
  });

  for (const required of ['project', 'from', 'to'] as const) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }

  const outPath = values.out ?? defaultReviewPath(
    values.project as Project,
    values.from!,
    values.to!,
  );

  const { runReview } = await import('./review/index.js');
  const db = openKnowledgeDb();
  try {
    const report = runReview({
      db,
      project: values.project as Project,
      fromVersion: values.from!,
      toVersion: values.to!,
      outPath,
      force: values.force ?? false,
    });
    // stdout contract: emit the full report as JSON for the skill to consume.
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } finally {
    db.close();
  }
}

function defaultReviewPath(project: Project, from: string, to: string): string {
  const today = new Date().toISOString().slice(0, 10);
  // Relative to cwd at invocation time; skill invokes from apps/qw-oracle/.
  return `docs/reviews/${today}-${project}-${from}-to-${to}.md`;
}
```

- [ ] **Step 5: Verify it compiles**

Run: `cd apps/qw-oracle && bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Verify the usage banner shows both new subcommands**

Run: `cd apps/qw-oracle && npm run load-knowledge 2>&1 | head -30`
Expected: the banner lists `extract-tag` and `review` sections.

- [ ] **Step 7: Commit**

```bash
git add apps/qw-oracle/scripts/load-knowledge/index.ts
git commit -m "feat(qw-oracle): register extract-tag + review CLI subcommands

Wires the two new subcommands into the dispatcher. Usage banner
updated. review emits JSON on stdout per the skill contract."
```

---

## Task 11: Update `apps/qw-oracle/CLAUDE.md`

**Files:**
- Modify: `apps/qw-oracle/CLAUDE.md`

- [ ] **Step 1: Add the two new subcommands to the commands block**

Edit `apps/qw-oracle/CLAUDE.md`. In the `## Commands` section, find:

```
npm run load-knowledge -- load-version --project <p> --version <v> --type <t> --json <path> --commit <sha> --ordinal <n>
npm run load-knowledge -- load-assets   --project <p> --version <v> --json <bundle> --commit <sha> --ordinal <n>
npm run load-knowledge -- diff          --project <p> --from <v1> --to <v2>
npm run load-knowledge -- enrich        --project <p> --github-token <t> [--limit <n>]
```

Replace with:

```
npm run load-knowledge -- load-version --project <p> --version <v> --type <t> --json <path> --commit <sha> --ordinal <n>
npm run load-knowledge -- load-assets   --project <p> --version <v> --json <bundle> --commit <sha> --ordinal <n>
npm run load-knowledge -- diff          --project <p> --from <v1> --to <v2>
npm run load-knowledge -- enrich        --project <p> --github-token <t> [--limit <n>]
npm run load-knowledge -- extract-tag   --project <p> --version <v> --ordinal <n>  # atomic: checkout + extract + loaders
npm run load-knowledge -- review        --project <p> --from <v1> --to <v2>        # emits findings JSON + draft .md
```

- [ ] **Step 2: Commit**

```bash
git add apps/qw-oracle/CLAUDE.md
git commit -m "docs(qw-oracle): document extract-tag + review subcommands"
```

---

## Task 12: Write the `extraction-review` skill

**Files:**
- Create: `~/.claude/skills/extraction-review/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p ~/.claude/skills/extraction-review`

- [ ] **Step 2: Write the skill prompt**

Write this content to `~/.claude/skills/extraction-review/SKILL.md`:

```markdown
---
name: extraction-review
description: Use this skill when the user wants to review a QW knowledge-service tag-pair (Phase 2f or any ad-hoc pair). Triggers on "extraction review", "phase 2f review", "review tag pair", "/extraction-review", or any request to walk findings between two QW-engine tags. Orchestrates CLI pre-flight (extract-tag / diff / release-notes / enrich), invokes the review CLI to produce findings, then walks findings interactively with the user in a Model B flow (Claude proposes a disposition, user approves / overrides / skips).
---

# extraction-review

One tag-pair per invocation. Judgment layer on top of the mechanical CLI.

## Inputs

Ask the user for any missing value:
- `project` — default `ezquake`. First-ship only supports ezquake; FTE / MVDSV / KTX error out.
- `from` — the older tag.
- `to` — the newer tag.

Enforce monorepo root: `pwd` should end in `quakeworld` or a worktree of it. If not, tell the user to cd there.

All CLI commands below run from `apps/qw-oracle/` via `npm run load-knowledge -- <subcommand>`. Prefix with `cd apps/qw-oracle && ` if the current shell is at monorepo root.

## Pre-flight protocol

Execute in order. Each check is a single SQL query via `sqlite3 apps/qw-oracle/data/knowledge.db` or the absence of a file on disk. On a miss, run the paired CLI command and move on.

| Check                                                               | Remedy on miss                                                     |
|---------------------------------------------------------------------|--------------------------------------------------------------------|
| `versions` has a row for (project, from)                            | `extract-tag --project <p> --version <from> --ordinal <n>`        |
| `versions` has a row for (project, to)                              | `extract-tag --project <p> --version <to> --ordinal <n+1>`        |
| `change_events` or `relation_changes` exist for (from -> to)         | `diff --project <p> --from <from> --to <to>`                       |
| `release_notes` exist for (project, to)                              | `release-notes --project <p> --version <to> --github-token $GITHUB_TOKEN` |
| Enrichment fresh (any entity change_events lacking pr_number for the last 50 commits) | `enrich --project <p> --limit 50` |

Ordinal picker: if `extract-tag` is needed, look up the max `ordinal` in the `versions` table for that project and add 1 per new tag.

## Review generation

Once pre-flight passes:

```
cd apps/qw-oracle && npm run load-knowledge -- review \
  --project <p> --from <from> --to <to>
```

Parse the JSON printed on stdout. Expect fields: `project`, `from_version`, `to_version`, `generated_at`, `draft_path`, `counts`, `findings[]`.

If the CLI exits non-zero, surface its error verbatim to the user and stop. Do not auto-run extraction steps in response to a review-time error — by this point, pre-flight should have handled them, so a review-time error means something else is wrong.

## Interactive walk (Model B)

For each `finding` in `findings[]` where no disposition is recorded in the draft file yet:

1. Show the finding's `summary` plus `evidence` fields (entity_ref or relation_row_key, commit_sha, source_file:line, from_value, to_value, release_note_body if present).
2. If `finding.proposed_disposition` is present from the CLI: show `kind` + `rationale`, ask "approve / override / skip?"
3. If absent: derive a proposal using the evidence plus cross-reference reads:
   - `packages/qw-config/seeds/ezquake-asset-*.yaml` for existing seed coverage.
   - `apps/qw-oracle/docs/entity-types.md` for the classification vocabulary.
   - `apps/qw-oracle/concept-notes/README.md` and the directory listing for Layer 3 coverage.
   - `git -C research/repos/ezquake-source log -1 <commit_sha>` for change motivation.
   Then say "I propose `<kind>` because `<rationale>` — approve / override / skip?"

User responses map to:

- **approve** — apply the side-effect per the routing table below. Replace the three `_(pending)_` lines in the draft for this finding with the disposition, rationale, and applied-timestamp.
- **override `<kind>`** — user picks one of `classify`, `mark-orphan`, `concept-note`, `handover`, `reject-as-noise`; re-apply for the new kind.
- **skip** — leave the three `_(pending)_` lines alone and move on. Keeps the review resumable.
- **abort** — stop the walk, leave the partially filled draft on disk.

## Side-effect routing

When the user approves a disposition, apply the matching side-effect:

| Bucket              | Disposition        | Side-effect                                                                                                                                              |
|---------------------|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| addition            | classify           | Edit the appropriate seed YAML under `packages/qw-config/seeds/`. If a new entity type: prose update in `apps/qw-oracle/docs/entity-types.md`.           |
| addition            | concept-note       | Create `apps/qw-oracle/concept-notes/<slug>.md` from the template in `concept-notes/README.md`. Frontmatter filled; body left as a prompt for the user.  |
| addition            | reject-as-noise    | No file change. Record the reason inside the finding's block in the draft markdown so the rejection doesn't re-surface on re-run.                        |
| retirement          | mark-orphan        | `UPDATE asset_extensions SET verification_status='orphaned_historical', verification_reason=? WHERE project=? AND version=? AND extension=? AND path_hint=?` — run via sqlite3 on `apps/qw-oracle/data/knowledge.db`. If the retirement hits `asset_loader_sites` or `asset_cvar_bindings`, surface a handover instead (schema v9 work). |
| retirement          | classify           | Entity row is already stamped `source_retired` by the diff pipeline; add a prose note to `entity-types.md` explaining the retirement if taxonomy-relevant. |
| retirement          | concept-note       | Same as addition variant.                                                                                                                                |
| semantic-crossing   | classify           | Edit the seed YAML that owns the field's domain (category_id -> categories; load_trigger -> cvar bindings; etc.).                                        |
| semantic-crossing   | concept-note       | Category crossings are the canonical Layer 3 source.                                                                                                     |
| semantic-crossing   | reject-as-noise    | Record.                                                                                                                                                  |
| unclassified        | classify           | For `asset_loader_sites`: `UPDATE asset_loader_sites SET confidence='certain', notes=? WHERE canonical_id=?`. For `asset_cvar_bindings`: promote to `seed` and add to the seed YAML. |
| unclassified        | handover           | Append a new entry to the repo-root `HANDOVER.md` (follow the existing section template). Reason: extractor-side work is needed for promotion.           |
| source-invisible    | concept-note       | Create `apps/qw-oracle/concept-notes/<slug>.md` with the release_note_body captured in the body.                                                         |
| source-invisible    | handover           | Append to `HANDOVER.md`.                                                                                                                                 |
| any                 | reject-as-noise    | No file change; rejection recorded in draft.                                                                                                             |

## Draft markdown block format

Each finding's block in the draft has three lines to fill:

```
**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
```

On approve, replace with:

```
**Proposed disposition:** classify
**Rationale:** Matches existing cvar family pattern (cl_* toggles).
**Applied:** 2026-04-23T14:22:10Z
```

Use Edit (exact-match) to replace the three `_(pending)_` lines for the current finding. The finding's `id` line (`### F-...`) is the unique anchor.

## Commit protocol

After the walk:

- If every finding has a non-pending disposition, stage and commit:
  ```
  git add apps/qw-oracle/docs/reviews/<draft>.md \
    packages/qw-config/seeds/*.yaml \
    apps/qw-oracle/docs/entity-types.md \
    apps/qw-oracle/concept-notes/ \
    HANDOVER.md \
    apps/qw-oracle/data/knowledge.db
  git commit -m "review(qw-oracle): <project> <from> -> <to> — N findings"
  ```
  (Only stage paths that actually changed in this review.)

- If any finding was skipped, do NOT commit. Tell the user which finding IDs are still pending and that re-running the skill will resume from them.

## Resume protocol

Finding IDs are stable hashes. Re-invoking the skill against the same (project, from, to) reads the existing draft and treats filled dispositions as done. Only findings with `**Proposed disposition:** _(pending)_` get walked again.

Pass `--force` to the review CLI only if the user explicitly wants to regenerate from scratch (discards prior dispositions).

## Non-goals

- Do not run `extract-tag` or `diff` or `release-notes` on your own initiative outside the pre-flight table. Skill scope = pre-flight self-healing + interactive walk only.
- Do not write tests. The testing strategy is the live run itself (per spec).
- Do not auto-pick between `concept-note` and `handover` for source-invisible findings. Ask.
```

- [ ] **Step 3: Verify the skill file exists**

Run: `ls ~/.claude/skills/extraction-review/SKILL.md`
Expected: file exists.

- [ ] **Step 4: No git commit for the skill**

The skill lives outside the repo (`~/.claude/skills/`). Nothing to commit for this file.

---

## Task 13: First live run — the end-to-end test

**Files:** none created in this task. This task validates the previous 12.

Pick one ezQuake tag-pair the user wants to start Phase 2f on (typical first choice: `3.2.3 -> 3.5.0`, but the user decides).

- [ ] **Step 1: Confirm pair with the user**

Ask which tag-pair to review as the first live run.

- [ ] **Step 2: Invoke the skill**

Run `/extraction-review` with `--project ezquake --from <v1> --to <v2>`.

Skill executes the full protocol: pre-flight self-healing, review generation, interactive walk, commit.

- [ ] **Step 3: Verify outputs exist**

After the walk completes, confirm:
- Draft file present at `apps/qw-oracle/docs/reviews/<date>-ezquake-<v1>-to-<v2>.md`.
- All findings have non-pending disposition blocks.
- Any applied `classify` dispositions have corresponding seed/entity-types.md edits.
- Any applied `mark-orphan` dispositions show up in a SQL spot-check: `sqlite3 apps/qw-oracle/data/knowledge.db "SELECT extension, verification_status FROM asset_extensions WHERE verification_status='orphaned_historical'"`.
- Any applied `concept-note` dispositions have a new file under `apps/qw-oracle/concept-notes/`.
- Any applied `handover` dispositions have new entries in `HANDOVER.md`.

- [ ] **Step 4: Verify idempotency of the draft-guard**

Re-run the review CLI (not the skill, just the CLI) with the same args but without `--force`:

```
cd apps/qw-oracle && npm run load-knowledge -- review --project ezquake --from <v1> --to <v2>
```

Expected: CLI errors that the draft file already has filled-in dispositions and asks for `--force`. This confirms the resume-safety check works.

- [ ] **Step 5: Verify JSON determinism**

With `--force --out /tmp/first.md`:

```
cd apps/qw-oracle && npm run load-knowledge -- review --project ezquake --from <v1> --to <v2> --force --out /tmp/first.md > /tmp/first.json
cd apps/qw-oracle && npm run load-knowledge -- review --project ezquake --from <v1> --to <v2> --force --out /tmp/second.md > /tmp/second.json
diff <(jq 'del(.generated_at, .draft_path)' /tmp/first.json) <(jq 'del(.generated_at, .draft_path)' /tmp/second.json)
```

Expected: diff is empty (findings are deterministic modulo timestamp + output path).

- [ ] **Step 6: Commit any outstanding review artifacts**

If the skill already committed during Step 2, this step is a no-op. Otherwise, review `git status` and commit the review + any side-effects.

---

## Task 14: Drain HANDOVER items

**Files:**
- Modify: `HANDOVER.md`
- Modify: `memory/MEMORY.md` (user memory index)

- [ ] **Step 1: Remove HANDOVER item #1**

Edit `HANDOVER.md`. Delete the line in the "Open items" index that starts with `- [Extraction-review skill + CLI]`. Delete the entire `## Extraction-review skill + CLI` section (from the header to the next `---` divider).

- [ ] **Step 2: Remove HANDOVER item #4**

Delete the line in the "Open items" index that starts with `- [Rebuild-and-load CLI subcommand]`. Delete the entire `## Rebuild-and-load CLI subcommand` section.

- [ ] **Step 3: Update MEMORY.md pointer**

Edit `~/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md`. Update the open-handover-items count in the first bullet to reflect the new count (2 items remain: Phase 2d-2h rollout, Interactive HTML dashboard).

- [ ] **Step 4: Commit**

```bash
git add HANDOVER.md
git commit -m "chore(handover): drain extraction-review + rebuild-and-load items

Items #1 and #4 are now shipped as the review + extract-tag
subcommands plus the extraction-review skill."
```

---

## Self-review checklist

After implementation:

- [ ] **Spec coverage:** every scope-in item from the spec maps to a task. `review` subcommand → Tasks 1-8, 10. `extract-tag` subcommand → Tasks 9-10. `extraction-review` skill → Task 12. reviews directory → Task 1. HANDOVER cleanup → Task 14.
- [ ] **No placeholders:** no "TBD" / "TODO" / "fill in later" / "handle edge cases" anywhere in this plan's tasks. All code steps show the actual code.
- [ ] **Type consistency:** `Finding`, `Bucket`, `ReviewReport`, `ReviewCounts`, `makeFindingId`, `runReview`, `extractTag`, `ExtractTagOptions`, `ExtractTagResult` — all named the same way in every task that references them. Imports use `.js` suffix per the existing project convention (NodeNext module resolution).
- [ ] **Scope check:** plan covers one cohesive subsystem (review pipeline). No multi-subsystem bundling.
