// apps/qw-oracle/scripts/load-knowledge/review/findings-help-json-classifications.ts
//
// Surfaces doc_only entities that lack an entry in the project's
// seeds/help_json_classifications.yaml. Each missing entry is a finding
// the operator must triage (or auto-classify via classify-help-json.py).
//
// The doc_only budget gate is enforced at the CLI level via --fail-on
// help-json-classification (returns non-zero exit when this bucket has
// any findings). See apps/qw-oracle/scripts/load-knowledge/index.ts.

import type Database from 'better-sqlite3';
import type { Finding } from './types.js';
import { makeFindingId } from './types.js';
import type { Project } from '../types.js';

export interface ClassificationEntry {
  classification: string;
  // Other YAML fields (rename_to, evidence_note, etc.) flow through but
  // aren't read here; the finder only needs to know the entry exists.
}

export type SeedMap = Record<string, ClassificationEntry>;

export function findHelpJsonClassifications(
  db: Database.Database,
  project: Project,
  seed: SeedMap,
): Finding[] {
  const docOnly = db.prepare(`
    SELECT type, name FROM entities
    WHERE project = ? AND source_state = 'doc_only'
    ORDER BY type, name
  `).all(project) as Array<{ type: string; name: string }>;

  const findings: Finding[] = [];
  for (const row of docOnly) {
    if (seed[row.name]) continue;
    const entityRef = `${project}:${row.type}:${row.name}`;
    findings.push({
      id: makeFindingId('help-json-classification', entityRef),
      bucket: 'help-json-classification',
      summary: `doc_only ${row.type} \`${row.name}\` has no classification in seeds/help_json_classifications.yaml`,
      evidence: { entity_ref: entityRef },
      proposed_disposition: {
        kind: 'classify',
        rationale: `Run scripts/classify-help-json.py --project ${project} --propose to generate a proposal, then operator-review and append to the seed YAML.`,
      },
    });
  }
  return findings;
}
