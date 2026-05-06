// apps/qw-oracle/scripts/load-knowledge/load-match-events.ts
//
// Phase 6 KTX: match_event adapter. Consumes the array of {name, ast}
// rows emitted by ktx/_handler_match_events.py and writes them to
// match_event_versions. attributes_json + emission_call_sites_json are
// JSONB columns bound directly via postgres-js per D14 (passing JS
// arrays/objects directly produces the JSONB structured value;
// pre-stringifying produces a JSONB string scalar -- the legacy
// SQLite-era TEXT bug). F1.jsonb_columns_not_strings is the regression
// gate.
//
// The handler does not emit doc_only entries (the XSD is the producer
// and every event_name in the events <xs:choice> gets a row), so
// matchEventIsSourceBacked is effectively `entry.ast !== null` --
// future-proofing for the same pattern as info_key / log_template.
//
// Dual-row design with log_template (D10 / F17): every emission site
// tracked in emission_call_sites_json is ALSO captured as a
// log_template_versions row with channel='logfile' by Phase 2's
// printf-handler. The duplicate is intentional -- per-site truth in
// log_template + per-type truth in match_event. Future maintainers
// looking to "deduplicate" should read D10 first.

import { createHash } from 'crypto';
import type postgres from 'postgres';
import { upsertMatchEventVersion } from './natural-keys.js';
import type { MatchEventEntry, MatchEventVersionRow } from './types.js';

export const MATCH_EVENT_PAYLOAD_FIELD = 'match_events';

export function matchEventIsSourceBacked(entry: MatchEventEntry): boolean {
  return entry.ast !== null;
}

export function buildMatchEventVersionRow(
  entityId: number,
  version: string,
  entry: MatchEventEntry,
  now: string,
): MatchEventVersionRow {
  const ast = entry.ast;
  const raw_ast_hash = ast
    ? createHash('sha1').update(JSON.stringify(ast)).digest('hex')
    : null;

  return {
    entity_id: entityId,
    version,
    // NOT NULL at the schema level. Defensive empty fallback mirrors the
    // log_template builder; doc_only entries are filtered upstream by
    // matchEventIsSourceBacked.
    event_name: ast?.event_name ?? '',
    complex_type: ast?.complex_type ?? '',
    // JSONB columns. Pass JS arrays directly; postgres-js encodes as
    // JSONB structured values per D14. NEVER JSON.stringify here. The
    // natural-keys upsert wraps with tx.json(...) for explicit JSONB
    // type tagging.
    attributes_json: ast?.attributes ?? [],
    xsd_path: ast?.xsd_path ?? '',
    xsd_version: ast?.xsd_version ?? '',
    emission_call_sites_json: ast?.emission_call_sites ?? [],
    raw_ast_hash,
    // KTX is single-engine (no client / server split); source_root is
    // NULL = "engine" per SCHEMA.md semantics. Mirrors the log_template
    // and info_key handlers' single-engine convention.
    source_root: null,
    extracted_at: now,
  };
}

export async function upsertMatchEventRow(tx: postgres.TransactionSql<{}>, row: MatchEventVersionRow): Promise<void> {
  await upsertMatchEventVersion(tx, row);
}
