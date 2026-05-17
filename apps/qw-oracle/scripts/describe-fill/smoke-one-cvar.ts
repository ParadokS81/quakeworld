// apps/qw-oracle/scripts/describe-fill/smoke-one-cvar.ts
//
// D19 walking-skeleton smoke -- deterministic harvest of a single real knob.
//
// Reads `k_short_gib` from BOTH shipped KTX config files and emits the
// candidate record in the EXACT shape the Phase 2 D9 mechanical extractor
// must also emit (per-(cvar, source-file) provenance records). This stub is
// the contract Phase 2 generalises (decisions.md D19 Open Q (c)); it is a
// REAL harvest, NOT a synthetic fixture.
//
// WHY two provenance entries are kept separate (D10/D11):
//   The in-repo config ships k_short_gib=1; nQuake ships k_short_gib=0.
//   These are config opinions (different server presets), NOT an L1 meaning
//   conflict. D10 says value differences are data, never flagged as conflicts.
//   D11 says retain one provenance entry per contributing source file; file
//   identity lives in the entry, never collapsed into a single merged record.
//   Both entries are retained and the differing shipped_value is preserved as
//   DATA so downstream phases can reason about community conventions.
//
// WHY candidate_text is the in-repo comment even when both agree (D10):
//   In the k_short_gib case the two raw_comments are byte-identical (verified
//   below by assertion). The in-repo source is picked as the canonical text
//   deterministically: if comments ever diverge in a future re-derive, the
//   caller picks in-repo first and the divergence is still visible in each
//   entry's raw_comment. Picking in-repo-first is a stable, re-runnable rule
//   that does not depend on inspection order (D19 idempotency contract / C4).
//
// SCOPE (decisions.md D9): harvest is a pure structured lift, ZERO quality
// verdict. This function emits candidate text + shipped value as data and
// STOPS. It does NOT judge the comment, does not rate confidence, does not
// write the DB, does not call synthesis. Those are later sub-steps.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateTier1 } from './review-gate.js';
import type {
  ProvenanceEntry,
  DescribeFillCandidate,
  ReviewerVerdict,
  GateResult,
  DescriptionVerdict,
  DescriptionConfidence,
} from './review-gate.js';
import { sql, closeSql } from '../load-knowledge/db.js';

// ---------------------------------------------------------------------------
// Path anchors
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

// 4 levels up: describe-fill -> scripts -> qw-oracle -> apps -> monorepo root
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

// Monorepo-root-relative paths stored in provenance (D11 -- file identity
// lives in provenance; these strings are the source_file values).
const IN_REPO_REL = 'research/repos/ktx/resources/example-configs/ktx/ktx.cfg';
const NQUAKE_REL = 'research/repos/nquake-distfiles/sv-configs/ktx/ktx.cfg';

const CVAR_NAME = 'k_short_gib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// The per-cvar candidate shape the D9 mechanical harvest emits and Phase 2
// generalises. Fields mirror the DescribeFillCandidate family (review-gate.ts)
// minus the synthesis fields (description_proposed / verdict / confidence /
// reasoning / source_ref / anchor_version) -- those are owned by D6 synthesis,
// which runs AFTER harvest. The gate receives a DescribeFillCandidate; this
// type is the pre-synthesis slice the harvest step produces.
export interface HarvestedCandidate {
  canonical_id: string;
  project: string;
  entity_name: string;
  provenance: ProvenanceEntry[];
  // The comment text used as synthesis candidate input (D9). Both config
  // files carry identical comment text for k_short_gib (D10 value-only
  // difference); candidate_text is set to the in-repo raw_comment and the
  // equality is asserted deterministically. If comments ever diverged,
  // in-repo-first is still the stable pick.
  candidate_text: string;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

// Parse ONE config file for the target cvar. Returns a ProvenanceEntry or
// throws if the cvar line cannot be found.
//
// WHY parse rather than hardcode line numbers: the smoke is deterministic
// because it derives the line number from file content, not from a constant
// baked in at authoring time. If either file is regenerated, the harvest
// self-corrects (D19 idempotency). The expected-line assertions below catch
// unexpected drift early without locking behaviour to a constant.
function parseConfigEntry(
  absolutePath: string,
  relPath: string,
  cvarName: string,
  expectedLine: number,
): ProvenanceEntry {
  const text = readFileSync(absolutePath, 'utf-8');
  // Strip \r so the regex $ anchor works on both CRLF and LF files.
  // The shipped config files use CRLF (Windows line endings); without this
  // the trailing \r is part of the last token and the $ anchor never matches.
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));

  // Match lines of the form: set <name> <value> [// <comment>]
  // Arbitrary whitespace between tokens; trailing whitespace trimmed.
  // The name token must be an exact match (word boundary: surrounded by
  // whitespace or end of token stream).
  const nameRe = /^\s*set\s+(\S+)\s+(\S+)(?:\s*\/\/\s*(.*))?$/;

  let foundLine = -1;
  let shippedValue: string | null = null;
  let rawComment: string | null = null;

  for (const [i, line] of lines.entries()) {
    const m = nameRe.exec(line);
    if (m && m[1] === cvarName) {
      foundLine = i + 1; // 1-based
      shippedValue = m[2] ?? null;
      rawComment = m[3] !== undefined ? m[3].trimEnd() : null;
      break;
    }
  }

  if (foundLine === -1) {
    throw new Error(`${cvarName} not found in ${relPath}`);
  }

  // Safety assertion: if the line number moves, something changed upstream
  // and the executor should re-verify the ground-truth block in the plan doc.
  if (foundLine !== expectedLine) {
    throw new Error(
      `${cvarName} found at line ${foundLine} in ${relPath}, expected ${expectedLine}. ` +
        'File may have been modified -- re-verify ground truth.',
    );
  }

  // Entry shape: ProvenanceEntry without structured_choices (boolean knob --
  // the field is entirely absent, not null/undefined, as required by
  // decisions.md D11 Amendment 2026-05-17 and review-gate.ts L81).
  return {
    source_file: relPath,
    source_line: foundLine,
    shipped_value: shippedValue,
    raw_comment: rawComment,
  };
}

// ---------------------------------------------------------------------------
// harvest() -- the exported contract (D19)
// ---------------------------------------------------------------------------

export function harvest(): HarvestedCandidate {
  const inRepoEntry = parseConfigEntry(
    join(MONOREPO_ROOT, IN_REPO_REL),
    IN_REPO_REL,
    CVAR_NAME,
    6, // expected line -- asserted inside, not hardcoded as the return value
  );

  const nquakeEntry = parseConfigEntry(
    join(MONOREPO_ROOT, NQUAKE_REL),
    NQUAKE_REL,
    CVAR_NAME,
    7, // expected line -- same assertion discipline
  );

  // Assert comment equality for k_short_gib (D10 value-difference, not meaning
  // conflict). Both raw_comments must be identical; if they ever diverge the
  // executor must triage before proceeding (candidate_text would no longer be
  // unambiguous and a D10 vs meaning-conflict determination is needed).
  if (inRepoEntry.raw_comment !== nquakeEntry.raw_comment) {
    throw new Error(
      `raw_comment mismatch for ${CVAR_NAME}: ` +
        `in-repo="${inRepoEntry.raw_comment}" nquake="${nquakeEntry.raw_comment}". ` +
        'Expected byte-identical comments (D10 value-difference case). Triage before proceeding.',
    );
  }

  // candidate_text: in-repo raw_comment is the stable pick (in-repo-first
  // rule; see file-level WHY comment). The non-null assertion is safe because
  // the equality check above would have thrown if either were null (null !=
  // non-null string), so both must be non-null here.
  const candidateText = inRepoEntry.raw_comment as string;

  return {
    canonical_id: `ktx:cvar:${CVAR_NAME}`,
    project: 'ktx',
    entity_name: CVAR_NAME,
    // D11: one entry per contributing shipped file, deterministic order
    // (in-repo first, then nQuake).
    provenance: [inRepoEntry, nquakeEntry],
    candidate_text: candidateText,
  };
}

// ---------------------------------------------------------------------------
// Frozen D6 synthesis output (verbatim Opus-4.7-MAX pass -- decisions.md D19/C4)
//
// WHY frozen: the smoke is deterministic / idempotent (D19/C4). These are the
// REAL outputs from a live Opus-4.7-MAX D6 synthesis pass and an independent
// Opus-4.7-MAX D7 reviewer pass on k_short_gib. They are baked in as typed
// constants so re-running the smoke does NOT re-invoke any model.
// ---------------------------------------------------------------------------

const FROZEN_D6 = {
  canonical_id: 'ktx:cvar:k_short_gib' as const,
  project: 'ktx' as const,
  entity_name: 'k_short_gib' as const,
  description_proposed:
    'Controls how long gib corpse pieces persist before the server removes them. When set to a non-zero value, each gib is removed 2 seconds after it is thrown. When set to 0, each gib is removed after a random delay of 10 to 20 seconds instead.',
  description_origin: 'synthesized' as const,
  source_ref: 'src/player.c:1063',
  description_anchor_version: '1.47-2-g67253dc',
  description_verdict: 'synthesized' as DescriptionVerdict,
  description_confidence: 'high' as DescriptionConfidence,
  description_reasoning:
    "Step 3 routed to synthesize: the registration line src/world.c:942 is a bare RegisterCvar with NO trailing comment (Layer 1 help_desc is null, corroborating). The read-site inline comment at src/player.c:1048 ('if set - remove faster') is cryptic dev-WHY and fails rubric clauses 1, 3, 5. The harvested shipped-config candidate ('remove gibs after 2 seconds (0 = no, 1 = yes)') is shipped_doc evidence (retained verbatim in description_provenance per D11) but is NOT affirmable: it omits the disabled-state behavior, and its implied '0 = gibs not removed' semantics are CONTRADICTED by source. At src/player.c:1063, when k_short_gib is 0 the gib is still removed, after a random 10-to-20 second delay (10 + g_random()*10), not never. D10 makes source the tiebreaker, so the owned description is synthesized from the read use-sites. Grounding: src/player.c:1048 reads the cvar inside ThrowGib(); src/player.c:1061 sets the gib entity's think to SUB_Remove (verified live -- this is what makes the nextthink schedule a removal, not an arbitrary callback); src/player.c:1063 sets nextthink to time + 2 when non-zero, else time + (10 + g_random()*10), i.e. fixed 2 seconds vs random 10-to-20 seconds after the gib is thrown. source_ref points at src/player.c:1063, the authoritative behavior-exhibiting use-site. Not a C3 suspect-pool member (ktx/cvar 259/259 validated, F-C3c) and independently confirmed runtime-reachable (read + behavior use-sites exist). Not a D8 bot/judgment knob. D10 VALUE-DIFFERENCE NOTE: the two shipped configs disagree on the shipped value (KTX example config = 1, nQuake sv config = 0); this is retained as DATA in description_provenance and is a value-difference across shipped files, NOT a meaning conflict and NOT a default-value claim (world.c:942 registers no default). Confidence high: the timing branch and the SUB_Remove think assignment are unambiguous and directly verified in the live C source.",
} as const;

// Frozen D7 reviewer verdict from the independent Opus-4.7-MAX re-check pass.
// The `as` casts satisfy DescriptionConfidence -- the literal 'high' is narrowed.
const FROZEN_REVIEWER: ReviewerVerdict = {
  evidenceExhibitsBehavior: true,
  textPassesSemanticRubric: true,
  recheckConfidence: 'high' as DescriptionConfidence,
  recheckReasoning:
    "Independently re-derived from live KTX source. Cited line player.c:1063 (nextthink = time + (k_short_gib ? 2 : (10 + g_random()*10))) is the authoritative READ use-site: combined with think=SUB_Remove at player.c:1061 and SUB_Remove's ent_remove(self) at g_spawn.c:211, it directly controls when each gib entity is deleted. The text's two branches map exactly: non-zero -> +2s; zero -> +(10 + g_random()*10). g_random() in [0,1) yields [10,20); 'random delay of 10 to 20 seconds' is the correct admin-facing characterization (open upper bound immaterial at this register). 'Non-zero value' is the correct generalization of the C int ternary (any non-zero is true), more honest than the shipped-config binary 0/1 framing. Text is mechanism-only, no recommended value, units stated, both enum branches spelled out, self-contained. Critically, the text correctly does NOT propagate the misleading shipped-config comment ('0 = no') whose implied 'gibs never removed' semantics are contradicted by source -- at 0 the gib is still removed after a random 10-20s. No expected-vs-observed gap found; D6 synthesize verdict is independently corroborated.",
};

// ---------------------------------------------------------------------------
// buildCandidate() -- assemble the DescribeFillCandidate from harvest + D6
// ---------------------------------------------------------------------------
//
// WHY this is a function not an inline object: the provenance array comes
// from harvest() which parses live files (D19 idempotency -- the provenance
// is structural data, not baked-in constants). The D6 fields are frozen
// constants (D19/C4 -- no model re-invocation).

function buildCandidate(): DescribeFillCandidate {
  const h = harvest();
  return {
    canonical_id: FROZEN_D6.canonical_id,
    project: FROZEN_D6.project,
    entity_name: FROZEN_D6.entity_name,
    description_proposed: FROZEN_D6.description_proposed,
    description_verdict: FROZEN_D6.description_verdict,
    description_confidence: FROZEN_D6.description_confidence,
    description_reasoning: FROZEN_D6.description_reasoning,
    source_ref: FROZEN_D6.source_ref,
    description_anchor_version: FROZEN_D6.description_anchor_version,
    // D11: provenance comes from the live harvest (two entries, in-repo first
    // then nQuake). Not baked into frozen constants -- the harvest asserts
    // file structure at parse time (line-number assertions), so provenance
    // is always structurally verified at candidate-build time.
    description_provenance: h.provenance,
    // Not a C3 suspect-pool member (F-C3c ratified: ktx/cvar 259/259 validated).
    suspect_pool_member: false,
  };
}

// ---------------------------------------------------------------------------
// persist() -- idempotent UPDATE of the existing ktx:cvar:k_short_gib row
// ---------------------------------------------------------------------------
//
// WHY UPDATE not INSERT: D9/D19 fill-not-create. The entity row was created
// by the L1 extractor; this step fills the description family columns only.
// A duplicate INSERT would violate the canonical_id UNIQUE constraint and
// would be wrong semantically (we are FILLING an existing entity, not creating
// one). Running persist() twice produces the identical owned record (idempotent
// by construction -- same values written both times).
//
// WHY sql.json() for description_provenance: postgres-js encodes a JS
// array/object passed as sql.json(value) as a JSONB structured value.
// Pre-stringifying (JSON.stringify) would store a JSONB string scalar --
// the P2 failure mode. Probe F1.jsonb_columns_not_strings catches this via
// jsonb_typeof(description_provenance)='array'. The established pattern
// across natural-keys.ts uses tx.json(row.col as never); we use sql.json()
// here (no transaction context needed for a single UPDATE).

async function persist(gate: GateResult, candidate: DescribeFillCandidate): Promise<void> {
  // On PASS, the committed description is the proposed text (the gate ratified
  // it; no delta between proposed and committed per the gate contract).
  // gate.descriptionReasoning on PASS is the reviewer's recheckReasoning (D11:
  // stored independently-verified rationale, not the D6 authoring reasoning).
  const result = await sql`
    UPDATE entities SET
      description                = ${candidate.description_proposed},
      description_origin         = 'synthesized',
      description_anchor_version = ${candidate.description_anchor_version},
      description_provenance     = ${sql.json(candidate.description_provenance as never)},
      description_verdict        = ${gate.descriptionVerdict},
      description_confidence     = ${gate.descriptionConfidence},
      description_reasoning      = ${gate.descriptionReasoning},
      description_proposed       = ${candidate.description_proposed},
      updated_at                 = now()
    WHERE canonical_id = 'ktx:cvar:k_short_gib'
  `;

  // rowCount is the postgres-js .count property on the result object.
  // Asserting exactly 1 confirms the entity row exists (the extractor loaded
  // it) and that no spurious multi-row match occurred. 0 means the entity
  // was not loaded (extractor must run first); >1 is a schema anomaly.
  const rowCount = result.count;
  if (rowCount !== 1) {
    throw new Error(
      `persist: expected rowCount=1, got ${rowCount}. ` +
        'Entity ktx:cvar:k_short_gib must be loaded by the L1 extractor before running the smoke.',
    );
  }
  console.log(`persist: rowCount=${rowCount} -- ok`);
}

// ---------------------------------------------------------------------------
// emitAuditPage() -- invoke the Task 5 serializer as a subprocess
// ---------------------------------------------------------------------------
//
// WHY subprocess not import: the serializer is an autonomous D11/D15 audit-
// page emitter with its own DB query, HTML generation, and closeSql() call.
// Importing and calling its internals would require splitting its lifecycle
// management (closeSql at the wrong time). Subprocess invocation is the
// canonical way to reuse it (the task plan's "reuse by subprocess invocation;
// do NOT duplicate its DB query" -- D19). We use execFileSync from
// node:child_process so failures throw and the audit-page assertion runs
// against the file the serializer actually wrote.

function emitAuditPage(qwOracleDir: string): string {
  // Default output path mirrors serialize-audit-review.ts DEFAULT_OUTPUT_PATH.
  const outputPath = join(qwOracleDir, 'output', 'describe-fill', 'cvar-audit-review.html');

  console.log('emitAuditPage: invoking serialize-audit-review.ts via bun subprocess...');
  // execFileSync throws on non-zero exit; stdout captured and printed.
  const stdout = execFileSync(
    'bun',
    ['scripts/load-knowledge/serialize-audit-review.ts'],
    { cwd: qwOracleDir, encoding: 'utf-8' },
  );
  console.log('emitAuditPage subprocess stdout:', stdout.trim());

  return outputPath;
}

// ---------------------------------------------------------------------------
// assertAuditPage() -- verify the emitted HTML meets D15 structural contracts
// ---------------------------------------------------------------------------
//
// WHY three assertions: D15 before/after/why inline in one row. The row must
// contain (1) the BEFORE provenance comment text, (2) the AFTER committed
// description text, (3) the WHY reasoning text -- all in the single k_short_gib
// row. The serializer renders exactly ONE <tr class="entity-row..."> per entity
// whose description_verdict IS NOT NULL; after the smoke persists k_short_gib,
// only k_short_gib qualifies. Asserting count=1 confirms no phantom rows.

function assertAuditPage(htmlPath: string): void {
  const html = readFileSync(htmlPath, 'utf-8');

  // Count entity-row <tr> elements. The serializer emits:
  //   <tr class="entity-row <verdict-class>" data-verdict="...">
  // for each qualifying row. One row expected (k_short_gib only).
  const rowMatches = html.matchAll(/<tr class="entity-row /g);
  const rowCount = [...rowMatches].length;
  if (rowCount !== 1) {
    throw new Error(
      `assertAuditPage: expected exactly 1 entity-row <tr>, found ${rowCount}. ` +
        'Only k_short_gib should have description_verdict IS NOT NULL at this point.',
    );
  }
  console.log('assertAuditPage: entity-row count = 1 -- ok');

  // BEFORE: raw_comment text from the shipped config provenance (both entries
  // carry the identical comment; the serializer renders both). The substring
  // used is from the frozen comment text known from harvest().
  const BEFORE_PROBE = 'remove gibs after 2 seconds';
  if (!html.includes(BEFORE_PROBE)) {
    throw new Error(
      `assertAuditPage: BEFORE provenance text not found. Looked for: "${BEFORE_PROBE}"`,
    );
  }
  console.log(`assertAuditPage: BEFORE provenance text present ("${BEFORE_PROBE}") -- ok`);

  // AFTER: the committed description text (a distinctive leading substring from
  // FROZEN_D6.description_proposed, confirming the synthesized text was written).
  const AFTER_PROBE = 'Controls how long gib corpse pieces persist';
  if (!html.includes(AFTER_PROBE)) {
    throw new Error(
      `assertAuditPage: AFTER description text not found. Looked for: "${AFTER_PROBE}"`,
    );
  }
  console.log(`assertAuditPage: AFTER description text present ("${AFTER_PROBE}") -- ok`);

  // WHY: the reviewer's recheckReasoning stored as description_reasoning (D11).
  // A distinctive substring from FROZEN_REVIEWER.recheckReasoning.
  const WHY_PROBE = 'Independently re-derived from live KTX source';
  if (!html.includes(WHY_PROBE)) {
    throw new Error(
      `assertAuditPage: WHY reasoning text not found. Looked for: "${WHY_PROBE}"`,
    );
  }
  console.log(`assertAuditPage: WHY reasoning text present ("${WHY_PROBE}") -- ok`);
}

// ---------------------------------------------------------------------------
// runProbe() -- run a single quality-grid probe as a subprocess and assert [PASS]
// ---------------------------------------------------------------------------
//
// WHY subprocess: quality-grid.ts is a heavyweight dispatcher that opens its
// own DB connection and has its own closeSql() lifecycle. Subprocess keeps the
// two lifecycles separate and mirrors the canonical invocation (bun scripts/
// load-knowledge/index.ts quality-grid --project ktx --family regression
// --probe <name>). A non-[PASS] output line or non-zero exit throws.

function runProbe(qwOracleDir: string, probeName: string): void {
  console.log(`runProbe: running ${probeName}...`);
  const stdout = execFileSync(
    'bun',
    [
      'scripts/load-knowledge/index.ts',
      'quality-grid',
      '--project', 'ktx',
      '--family', 'regression',
      '--probe', probeName,
    ],
    { cwd: qwOracleDir, encoding: 'utf-8' },
  );
  console.log(`runProbe ${probeName} stdout:`, stdout.trim());

  // The probe prints "[PASS] <probe-name>" on success. Non-zero exit already
  // throws via execFileSync. This substring check catches silent non-PASS output.
  if (!stdout.includes('[PASS]')) {
    throw new Error(
      `runProbe: probe ${probeName} did not print [PASS]. stdout: ${stdout}`,
    );
  }
  console.log(`runProbe: ${probeName} [PASS] -- ok`);
}

// ---------------------------------------------------------------------------
// idempotencySelfCheck() -- run persist() twice, SELECT before/after, assert equal
// ---------------------------------------------------------------------------
//
// WHY this test matters: D19/C4/P3 require that re-running the smoke produces
// the identical owned record and does NOT create duplicate rows or double-count
// the filled entity. A second UPDATE with the same values is idempotent by SQL
// semantics (same WHERE, same SET values); the self-check proves it end-to-end.
//
// Row shape: all 9 description-family columns + canonical_id. The SELECT uses
// description_provenance::text for the deep-equality comparison (postgres-js
// returns JSONB as JS object; JSON.stringify round-trips may differ by key
// order; casting to text gives the Postgres JSONB canonical serialization).

interface SnapshotRow {
  canonical_id: string;
  description: string | null;
  description_origin: string | null;
  description_anchor_version: string | null;
  description_provenance_text: string; // JSONB::text for stable comparison
  description_verdict: string | null;
  description_confidence: string | null;
  description_reasoning: string | null;
  description_proposed: string | null;
  description_rereview: boolean | null;
}

async function selectSnapshot(): Promise<SnapshotRow> {
  const rows = await sql<SnapshotRow[]>`
    SELECT
      canonical_id,
      description,
      description_origin,
      description_anchor_version,
      description_provenance::text AS description_provenance_text,
      description_verdict,
      description_confidence,
      description_reasoning,
      description_proposed,
      description_rereview
    FROM entities
    WHERE canonical_id = 'ktx:cvar:k_short_gib'
  `;
  if (rows.length !== 1) {
    throw new Error(`selectSnapshot: expected 1 row, got ${rows.length}`);
  }
  return rows[0] as SnapshotRow;
}

async function idempotencySelfCheck(gate: GateResult, candidate: DescribeFillCandidate): Promise<void> {
  // Snapshot before second persist.
  const before = await selectSnapshot();

  // Second persist -- must produce the identical owned record.
  await persist(gate, candidate);

  // Snapshot after second persist.
  const after = await selectSnapshot();

  // Deep-equality check: compare each field individually for clear failure messages.
  const FIELDS: (keyof SnapshotRow)[] = [
    'canonical_id',
    'description',
    'description_origin',
    'description_anchor_version',
    'description_provenance_text',
    'description_verdict',
    'description_confidence',
    'description_reasoning',
    'description_proposed',
    'description_rereview',
  ];
  for (const field of FIELDS) {
    const bVal = String(before[field]);
    const aVal = String(after[field]);
    if (bVal !== aVal) {
      throw new Error(
        `idempotencySelfCheck: field "${field}" changed between runs. ` +
          `before="${bVal}" after="${aVal}"`,
      );
    }
  }

  // Count check: exactly 1 row with a filled description_origin in ktx/cvar
  // (P3 / D19/C4: no duplicate, no double-count).
  const countRows = await sql<{ cnt: string }[]>`
    SELECT count(*) AS cnt
    FROM entities
    WHERE project = 'ktx'
      AND type = 'cvar'
      AND description_origin IN ('synthesized', 'shipped_doc')
  `;
  const cnt = parseInt(countRows[0]?.cnt ?? '0', 10);
  if (cnt !== 1) {
    throw new Error(
      `idempotencySelfCheck: expected exactly 1 ktx/cvar row with filled description_origin, got ${cnt}. ` +
        'Duplicate or extra rows indicate a fill-not-create violation.',
    );
  }

  console.log('IDEMPOTENT: ok');
}

// ---------------------------------------------------------------------------
// main() -- full pipeline (Bun P1)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // 2 levels up: describe-fill -> scripts -> qw-oracle (the subprocess cwd
  // for the serializer + probe invocations, which expect apps/qw-oracle).
  const qwOracleDir = join(__dirname, '..', '..');

  try {
    // Step 1: harvest (pure, no IO to DB)
    console.log('--- Step 1: harvest ---');
    const h = harvest();
    console.log(`harvest: canonical_id=${h.canonical_id} provenance_count=${h.provenance.length}`);

    // Step 2: build the DescribeFillCandidate from harvest + FROZEN_D6
    console.log('--- Step 2: buildCandidate ---');
    const candidate = buildCandidate();
    console.log(`buildCandidate: entity_name=${candidate.entity_name} verdict=${candidate.description_verdict}`);

    // Step 3: run the gate (pure, no IO) and assert PASS (C4: fail -> exit non-zero)
    console.log('--- Step 3: evaluateTier1 (gate) ---');
    const gate = evaluateTier1(candidate, FROZEN_REVIEWER);
    console.log(`gate: tier1=${gate.tier1} verdict=${gate.descriptionVerdict} confidence=${gate.descriptionConfidence}`);
    if (gate.tier1 !== 'pass') {
      // C4: a failed row does NOT commit. Print the gate result and exit non-zero.
      // Recovery is to re-run the corrected pipeline, never an UPDATE patch.
      console.error('GATE FAIL -- row does NOT commit. GateResult:');
      console.error(JSON.stringify(gate, null, 2));
      process.exit(1);
    }
    console.log('gate: PASS -- row eligible to commit');

    // Step 4: persist (idempotent UPDATE of the existing entity row)
    console.log('--- Step 4: persist ---');
    await persist(gate, candidate);

    // Step 5: emit the audit page via the Task 5 serializer subprocess
    console.log('--- Step 5: emitAuditPage ---');
    const htmlPath = emitAuditPage(qwOracleDir);
    assertAuditPage(htmlPath);

    // Step 6: run the two C5 regression probes
    console.log('--- Step 6: C5 regression probes ---');
    runProbe(qwOracleDir, 'F1.describe_fill.origin_vocabulary');
    runProbe(qwOracleDir, 'F1.describe_fill.synthesized_requires_anchor');

    // Step 7: idempotency self-check (second persist + before/after snapshot comparison)
    console.log('--- Step 7: idempotency self-check ---');
    await idempotencySelfCheck(gate, candidate);

    console.log('');
    console.log('SMOKE: PASS');
  } finally {
    // Close the DB connection regardless of pass/fail (P1 Bun lifecycle).
    await closeSql();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point (Bun P1)
// ---------------------------------------------------------------------------

if (import.meta.main) {
  main().catch((err) => {
    console.error('smoke-one-cvar error:', err);
    process.exit(1);
  });
}
