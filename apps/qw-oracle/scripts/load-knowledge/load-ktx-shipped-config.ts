// apps/qw-oracle/scripts/load-knowledge/load-ktx-shipped-config.ts
//
// Phase-2 KTX shipped-config LOADER adapter (describe-fill arc).
//
// WHAT: reads the Task-1 extractor output (ktx-shipped-config-ast.json),
// resolves each shipped-config record to a live KTX cvar entity by
// case-insensitive name, and FILLS the description-provenance family on
// non-terminal rows with the harvested shipped-config comment + provenance.
//
// WHY this is a harvest with ZERO verdict (D9 seam): Phase 2 only stages
// the raw shipped-config comment and its multi-source provenance. The
// affirm-vs-synthesize judgement (description_verdict / _confidence /
// _reasoning / _proposed / _anchor_version) is Phase 3's job. Writing any
// of those columns here would cross the D9 phase seam.
//
// WHY fill-not-create (D9/D19): the entity rows were created by the L1
// extractor. This adapter never INSERTs. A record whose name does not
// resolve to a live KTX cvar is a C2/C3 config-drift datum (config sets a
// name absent from the registration set) -- collected into the report,
// never silently dropped (C1), never materialised as a new entity.
//
// WHY the terminal-skip clobber-guard is load-bearing (F-D4a / D19 / C4):
// the shared derive tail's owned-row guard protects the owned user-doc
// track. ktx:cvar:k_short_gib is a Phase-1 terminal owned row
// (description_origin='synthesized'). The general enum rule in the Task-1
// extractor emits `structured_choices` on a `(0 = no, 1 = yes)` boolean
// comment; Phase-1's boolean smoke deliberately OMITTED structured_choices
// from k_short_gib's provenance. Re-writing that terminal row with the
// general extractor's output would change its bytes and break the
// orchestrator's non-negotiable byte-identical-owned-record gate. So a
// terminal owned row is SKIPPED ENTIRELY -- Phase 2 writes nothing to it.
// The phase-MD phrase "reconciles provenance on every resolved row" is
// correctly read as "every NON-terminal resolved row".

import type { Sql } from 'postgres';
// The LOCKED multi-source provenance element (review-gate.ts lines 83-89).
// `structured_choices` is the additive optional widening (decisions.md D11
// Amendment 2026-05-17). Imported, not redefined -- the project tsc gate is
// non-vacuous (F-C5c) so a shape mismatch FAILS the build.
import type { ProvenanceEntry } from '../describe-fill/review-gate.js';
import { readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// AST input shape (Task-1 extractor contract -- verified live, do not doubt).
// `structured_choices` is a FLAT array and the KEY IS ABSENT when the cvar
// had no enum/bitmask. One record per (name, source-file); in-repo-vs-nQuake
// drift is TWO records, never merged at extraction time.
// ---------------------------------------------------------------------------

interface ShippedConfigRecord {
  name: string;
  source_file: string;
  source_line: number;
  shipped_value: string | null;
  raw_comment: string | null;
  structured_choices?: Array<{ value: string; label: string }>;
}

interface ShippedConfigAst {
  records: ShippedConfigRecord[];
  // Empty today (verified) but the code path is kept: AST-side unresolved
  // names fold into report.unresolved alongside resolve-time misses.
  unresolved?: Array<{ name: string; source_file: string; source_line: number }>;
}

export interface ShippedConfigLoadReport {
  records_read: number;
  resolved: number;
  filled: number;
  skipped_terminal: number;
  // covered = filled + skipped_terminal. A skipped terminal row already
  // carries a Phase-1/Phase-3 provenance, so it counts as covered even
  // though Phase 2 wrote nothing to it.
  covered: number;
  unresolved: Array<{ name: string; source_file: string; source_line: number }>;
  // Debug aid: provenance-entry count per filled cvar (deterministic).
  per_cvar_provenance_counts: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Deterministic source precedence. The provenance array order and the
// "authoritative entry" (= staged description) are derived from this fixed
// rank, NOT file-read order -- this is what makes the loader idempotent.
// ---------------------------------------------------------------------------

const SOURCE_RANK: Record<string, number> = {
  'research/repos/ktx/resources/example-configs/ktx/ktx.cfg': 0, // in-repo
  'research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg': 1, // nQuake sv-configs
  'research/repos/nquake-distfiles/sv-gpl/ktx/port_template.cfg': 2, // nQuake sv-gpl
};

// Unknown source files sort AFTER the three known ranks (defensive: an
// unexpected source must not silently win the authoritative pick). Stable
// secondary key is source_line asc.
function sourceRank(sourceFile: string): number {
  const r = SOURCE_RANK[sourceFile];
  return r === undefined ? 99 : r;
}

interface ResolvedEntity {
  id: number;
  canonical_id: string;
  description_origin: string | null;
  description_verdict: string | null;
}

// A row is TERMINAL OWNED when it is Phase-1 synthesized, OR a Phase-3
// shipped_doc row that already carries a verdict. Either way Phase 2 must
// not touch it (the byte-identity gate). A shipped_doc row WITHOUT a
// verdict is a prior Phase-2 harvest -- non-terminal, safe to re-fill
// (idempotently, with the same deterministic values).
function isTerminalOwned(e: ResolvedEntity): boolean {
  if (e.description_origin === 'synthesized') return true;
  if (e.description_origin === 'shipped_doc' && e.description_verdict !== null) return true;
  return false;
}

// Build the deterministic provenance array for one cvar from its
// contributing records. `structured_choices` is passed through verbatim
// ONLY when the source record had the key (do not emit null/[] -- the
// absence of the key is itself the boolean-vs-enum signal Phase 1 relied on).
function buildProvenance(records: ShippedConfigRecord[]): ProvenanceEntry[] {
  const ordered = [...records].sort((a, b) => {
    const ra = sourceRank(a.source_file);
    const rb = sourceRank(b.source_file);
    if (ra !== rb) return ra - rb;
    return a.source_line - b.source_line;
  });

  return ordered.map((r) => {
    const entry: ProvenanceEntry = {
      source_file: r.source_file,
      source_line: r.source_line,
      shipped_value: r.shipped_value,
      raw_comment: r.raw_comment,
    };
    if (Object.prototype.hasOwnProperty.call(r, 'structured_choices')) {
      entry.structured_choices = r.structured_choices;
    }
    return entry;
  });
}

export async function loadKtxShippedConfigFromFile(
  sql: Sql,
  jsonPath: string,
): Promise<ShippedConfigLoadReport> {
  const ast = JSON.parse(readFileSync(jsonPath, 'utf8')) as ShippedConfigAst;
  const records = ast.records ?? [];

  const report: ShippedConfigLoadReport = {
    records_read: records.length,
    resolved: 0,
    filled: 0,
    skipped_terminal: 0,
    covered: 0,
    unresolved: [],
    per_cvar_provenance_counts: {},
  };

  // Fold in any AST-side unresolved entries first (empty today; code path
  // kept so a future extractor that emits them is not silently lossy).
  for (const u of ast.unresolved ?? []) {
    report.unresolved.push({
      name: u.name,
      source_file: u.source_file,
      source_line: u.source_line,
    });
  }

  // Step 2: resolve each record's name to a live KTX cvar entity
  // case-insensitively via name_fold (= lower(name); cvars are not
  // token_primitive). Group resolved records by canonical_id; collect
  // misses into report.unresolved (C2/C3 config-drift datum -- NEVER
  // create an entity (D9), NEVER silently drop (C1)).
  const grouped = new Map<
    string,
    { entity: ResolvedEntity; records: ShippedConfigRecord[] }
  >();

  // Cache resolves by lower(name) so multi-source records for the same
  // cvar issue one lookup, not N.
  const resolveCache = new Map<string, ResolvedEntity | null>();

  for (const rec of records) {
    const key = rec.name.toLowerCase();
    let entity = resolveCache.get(key);
    if (entity === undefined) {
      const rows = await sql<ResolvedEntity[]>`
        SELECT id, canonical_id, description_origin, description_verdict
        FROM entities
        WHERE project = 'ktx' AND type = 'cvar' AND name_fold = ${key}
      `;
      entity = rows.length > 0 ? rows[0]! : null;
      resolveCache.set(key, entity);
    }

    if (entity === null) {
      report.unresolved.push({
        name: rec.name,
        source_file: rec.source_file,
        source_line: rec.source_line,
      });
      continue;
    }

    report.resolved += 1;
    let bucket = grouped.get(entity.canonical_id);
    if (!bucket) {
      bucket = { entity, records: [] };
      grouped.set(entity.canonical_id, bucket);
    }
    bucket.records.push(rec);
  }

  // Steps 3-4: per entity, apply the terminal-skip guard, else build the
  // deterministic provenance and fill. All non-terminal UPDATEs run in ONE
  // transaction; JSONB is bound with tx.json(... as never) (P2 -- never
  // JSON.stringify into a JSONB column; that stores a string scalar).
  await sql.begin(async (tx) => {
    for (const [, bucket] of grouped) {
      const { entity, records: recs } = bucket;

      if (isTerminalOwned(entity)) {
        // SKIP ENTIRELY: write nothing. Counted in skipped_terminal and
        // (since it already carries a Phase-1/Phase-3 provenance) in
        // covered. This is the non-negotiable byte-identity gate: e.g.
        // ktx:cvar:k_short_gib stays byte-identical (Phase 1's boolean
        // smoke deliberately omitted the structured_choices the general
        // extractor would now emit). D19: counted once, reproduced
        // identically by leaving it alone.
        report.skipped_terminal += 1;
        continue;
      }

      const provenance = buildProvenance(recs);

      // shipped_doc RETIRED (D11 amendment 2026-06-04): this loader now
      // populates ONLY description_provenance -- the retained reference/
      // evidence layer. description + description_origin are owned by the
      // synthesis path (always 'synthesized'); a shipped-config comment is
      // reference evidence to source-verify against, never a served origin.
      const result = await tx`
        UPDATE entities SET
          description_provenance = ${tx.json(provenance as never)},
          updated_at             = now()
        WHERE id = ${entity.id}
      `;

      // Exactly-1 confirms the entity exists (extractor loaded it) and no
      // spurious multi-row match. We never INSERT (fill-not-create D9).
      if (result.count !== 1) {
        throw new Error(
          `load-ktx-shipped-config: expected rowCount=1 for ${entity.canonical_id}, ` +
            `got ${result.count}. Entity must be loaded by the L1 extractor first; ` +
            `the loader never INSERTs (D9 fill-not-create).`,
        );
      }

      report.filled += 1;
      report.per_cvar_provenance_counts[entity.canonical_id] = provenance.length;
    }
  });

  report.covered = report.filled + report.skipped_terminal;
  return report;
}
