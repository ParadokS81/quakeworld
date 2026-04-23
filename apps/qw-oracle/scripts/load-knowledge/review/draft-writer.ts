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
