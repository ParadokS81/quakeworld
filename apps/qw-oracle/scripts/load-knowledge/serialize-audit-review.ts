// scripts/load-knowledge/serialize-audit-review.ts
//
// D11/D15 internal-tier audit-review HTML serializer.
//
// Emits one self-contained HTML page per the D13 internal-tier model:
// - One row per entity (row-per-entity, D15)
// - Sortable + filterable client-side (vanilla JS; no external CDN)
// - The before/after/why triple INLINE in each row (feedback_inline_pairs_over_split_panels; D15)
//   "Before" = the raw_comment(s) from description_provenance
//   "After"  = the committed description (or description_proposed if not yet committed)
//   "Why"    = description_reasoning (the D6 reasoning, stored for review)
// - Internal tier only: carries confidence + reasoning + verdict + losing provenance (D13)
//
// Selection predicate (D19 scope):
//   project IN ('ktx','mvdsv')
//   AND type IN ('cvar','command','cmdline_param','info_key')
//   AND description_verdict IS NOT NULL
//
// Verdict vocabulary (locked by Tasks 3+4 cross-task contract):
//   affirmed | synthesized | dead_stamped | hedged | residue_routed
//
// Output: apps/qw-oracle/output/describe-fill/cvar-audit-review.html (default)
//   mkdir -p is applied; the HTML is a regenerable projection, not a committed
//   artifact (the committed artifact is this .ts file).
//
// Runtime: Bun. Entry point guarded by import.meta.main (Bun-only).
// DB access via the existing postgres-js singleton in db.ts (P1 / no new layer).
// JSONB is received as decoded JS values from postgres-js; do NOT JSON.parse again (P2).
// ASCII only in this file and in the emitted HTML (P5).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql, closeSql } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const DEFAULT_OUTPUT_PATH = join(
  MONOREPO_ROOT,
  'apps', 'qw-oracle', 'output', 'describe-fill', 'cvar-audit-review.html',
);

// ---------------------------------------------------------------------------
// Row shape returned from Postgres
// ---------------------------------------------------------------------------

// A single entry in description_provenance (D11 retained multi-source provenance).
// The element shape is: {source_file, source_line, shipped_value, raw_comment}
// plus an optional structured_choices field (D11 amendment 2026-05-17).
// postgres-js decodes JSONB to JS values; we never JSON.parse here (P2).
interface ProvenanceEntry {
  source_file: string;
  source_line: number | null;
  shipped_value: string | null;
  raw_comment: string | null;
  structured_choices?: unknown; // optional per the D11 amendment; absent for boolean cvars
}

// Database row shape returned by the SELECT query.
// Column names map 1:1 to entities columns from migration-014.
interface AuditRow {
  canonical_id: string;
  name: string;
  project: string;
  type: string;
  // source_ref is read from cvar_versions/command_versions source_file+source_line via
  // the existing idx_cvar_versions_source mechanism (D6/P3). We select the most recent
  // version's source_file as the authoritative read use-site.
  source_ref: string | null;
  description: string | null;
  description_origin: string | null;
  description_verdict: string | null;      // affirmed|synthesized|dead_stamped|hedged|residue_routed
  description_confidence: string | null;
  description_reasoning: string | null;
  description_proposed: string | null;
  // JSONB decoded by postgres-js to a JS array (P2: never pre-stringify, never JSON.parse)
  description_provenance: ProvenanceEntry[] | null;
}

// ---------------------------------------------------------------------------
// HTML escape -- prevent XSS in the generated page (user data embedded as text)
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  // Replace only the five HTML-special characters.
  // ASCII-only output: replace characters above U+007E only if they appear in
  // source data; the entities here are safe ASCII named refs.
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format a provenance entry for display. Returns HTML snippet (inline, no block element).
// "Before" = the raw source comment the cvar had in the shipped config.
function renderProvenanceEntry(entry: ProvenanceEntry): string {
  const file = esc(entry.source_file);
  const line = entry.source_line != null ? `:${entry.source_line}` : '';
  const value = entry.shipped_value != null ? ` (shipped value: ${esc(entry.shipped_value)})` : '';
  const comment = entry.raw_comment ? esc(entry.raw_comment) : '<em>no comment</em>';

  let html = `<div class="prov-entry">`;
  html += `<span class="prov-source">${file}${esc(line)}${esc(value)}</span>`;
  html += `<div class="prov-comment">${comment}</div>`;

  // Render structured_choices if present (D11 amendment -- optional field).
  // Why: D9 mandates keeping enum/bitmask tables as DATA; the internal-tier
  // serializer must surface them so the operator can verify them at the D7 tail.
  if (entry.structured_choices != null) {
    const choicesJson = JSON.stringify(entry.structured_choices, null, 2);
    html += `<details class="structured-choices"><summary>structured choices</summary><pre>${esc(choicesJson)}</pre></details>`;
  }

  html += `</div>`;
  return html;
}

// ---------------------------------------------------------------------------
// Row renderer -- the load-bearing D15 shape
// ---------------------------------------------------------------------------
//
// Each entity gets ONE row. Inside that row, in order:
//   1. Entity identity (name, type, project, source_ref, verdict badge, confidence)
//   2. BEFORE -- the raw_comment(s) from description_provenance (all retained sources,
//      including losing alternates; this is the INTERNAL tier per D13)
//   3. AFTER  -- the committed description (description), or the proposed text if not yet
//      committed (description_proposed). Both shown when they differ.
//   4. WHY    -- the D6 reasoning (description_reasoning)
//
// WHY inline: D15 locks that the before/after/why triple is ONE comparison unit per row.
// The operator must see all three together to judge whether the proposed/committed
// description faithfully captures the source comment and the reasoning is sound.
// Splitting into panels would force the eye to reassemble the story -- a D15 violation.

function renderRow(row: AuditRow, idx: number): string {
  const verdict = row.description_verdict ?? 'unknown';
  const verdictClass = `verdict-${verdict.replace(/_/g, '-')}`;
  const confidence = row.description_confidence ?? '';
  const projectType = `${row.project}:${row.type}`;

  // Provenance entries (the "before" raw comments from all retained sources).
  // Losing alternates are shown -- internal tier, nothing hidden (D13).
  const provHtml = Array.isArray(row.description_provenance) && row.description_provenance.length > 0
    ? row.description_provenance.map(renderProvenanceEntry).join('')
    : '<em>no provenance entries</em>';

  // "After": committed description. Show proposed alongside if they differ.
  const committed = row.description ?? '';
  const proposed = row.description_proposed ?? '';
  const afterCommittedHtml = committed
    ? `<div class="after-committed">${esc(committed)}</div>`
    : `<div class="after-committed none">not yet committed</div>`;
  const afterProposedHtml = (proposed && proposed !== committed)
    ? `<div class="after-proposed"><span class="label">proposed (pre-gate):</span> ${esc(proposed)}</div>`
    : '';

  // "Why": the D6 reasoning, stored at D11 for review.
  const reasoning = row.description_reasoning ?? '';
  const whyHtml = reasoning
    ? `<div class="why-reasoning">${esc(reasoning)}</div>`
    : `<div class="why-reasoning none">no reasoning recorded</div>`;

  // source_ref for display
  const sourceRef = row.source_ref ? esc(row.source_ref) : '<em>unknown</em>';

  return `
  <tr class="entity-row ${verdictClass}" data-verdict="${esc(verdict)}" data-project="${esc(row.project)}" data-type="${esc(row.type)}" data-idx="${idx}">
    <td class="col-name">
      <span class="entity-name">${esc(row.name)}</span>
      <span class="entity-meta">${esc(projectType)}</span>
      <span class="entity-source">${sourceRef}</span>
    </td>
    <td class="col-verdict">
      <span class="verdict-badge ${verdictClass}">${esc(verdict)}</span>
      <span class="confidence">${esc(confidence)}</span>
    </td>
    <td class="col-before-after-why">
      <div class="baw-block">
        <div class="baw-section">
          <div class="baw-label">BEFORE -- source provenance (all retained sources)</div>
          <div class="baw-content before-content">${provHtml}</div>
        </div>
        <div class="baw-section">
          <div class="baw-label">AFTER -- committed description</div>
          <div class="baw-content after-content">
            ${afterCommittedHtml}
            ${afterProposedHtml}
          </div>
        </div>
        <div class="baw-section">
          <div class="baw-label">WHY -- D6 reasoning</div>
          <div class="baw-content why-content">${whyHtml}</div>
        </div>
      </div>
    </td>
  </tr>`;
}

// ---------------------------------------------------------------------------
// Full page renderer
// ---------------------------------------------------------------------------
//
// renderRows is exported so acceptance criterion 3 can call it with a
// synthetic record without hitting the DB.

export function renderRows(rows: AuditRow[]): string {
  const rowsHtml = rows.length > 0
    ? rows.map((r, i) => renderRow(r, i)).join('')
    : `<tr><td colspan="3" class="empty-state">No evaluate-and-filled entities found (description_verdict IS NOT NULL). Run the D19 smoke (Task 6) to populate the first row.</td></tr>`;

  const generatedAt = new Date().toISOString();
  const count = rows.length;

  // Why the verdict vocabulary is hardcoded here: Tasks 3+4 lock the five values
  // as a cross-task contract; a dynamic distinct-query could show out-of-vocabulary
  // tags and mislead the filter UI. The filter always shows all five buckets.
  const VERDICT_VALUES = ['affirmed', 'synthesized', 'dead_stamped', 'hedged', 'residue_routed'];
  const verdictOptions = VERDICT_VALUES.map(
    v => `<option value="${esc(v)}">${esc(v)}</option>`
  ).join('');

  const PROJECT_VALUES = ['ktx', 'mvdsv'];
  const projectOptions = PROJECT_VALUES.map(
    p => `<option value="${esc(p)}">${esc(p)}</option>`
  ).join('');

  const TYPE_VALUES = ['cvar', 'command', 'cmdline_param', 'info_key'];
  const typeOptions = TYPE_VALUES.map(
    t => `<option value="${esc(t)}">${esc(t)}</option>`
  ).join('');

  // The generated HTML is ASCII-only (P5). No em-dashes, no en-dashes, no emoji.
  // Any non-ASCII that comes from entity data passes through esc() above, which
  // preserves the bytes -- but the static HTML skeleton is ASCII.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KTX/MVDSV L1 describe-fill audit review (internal tier)</title>
<style>
/* D13 internal-tier audit-review page -- ASCII only (P5) */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: monospace; font-size: 13px; background: #1a1a1a; color: #e0e0e0; }
h1 { padding: 12px 16px; background: #2a2a2a; border-bottom: 1px solid #444; font-size: 15px; }
.meta { padding: 6px 16px; background: #222; border-bottom: 1px solid #333; color: #888; font-size: 11px; }
.controls { padding: 8px 16px; background: #252525; border-bottom: 1px solid #444; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.controls label { color: #aaa; font-size: 11px; }
.controls select, .controls input { background: #333; color: #ddd; border: 1px solid #555; padding: 3px 6px; font-family: monospace; font-size: 12px; }
.controls input[type=text] { width: 220px; }
#count-display { color: #888; font-size: 11px; margin-left: auto; }

table { width: 100%; border-collapse: collapse; }
thead th { background: #2a2a2a; padding: 8px 10px; text-align: left; border-bottom: 2px solid #555; font-size: 11px; color: #aaa; position: sticky; top: 0; cursor: pointer; user-select: none; }
thead th:hover { background: #333; }
thead th::after { content: " \\25B8"; color: #666; }
thead th.sort-asc::after { content: " \\25B4"; color: #aaa; }
thead th.sort-desc::after { content: " \\25BE"; color: #aaa; }

tbody tr { border-bottom: 1px solid #2a2a2a; vertical-align: top; }
tbody tr:hover { background: #1f1f1f; }
tbody tr.hidden { display: none; }

/* Column widths: name narrow, verdict narrow, before/after/why gets the rest */
.col-name { width: 200px; padding: 10px 8px; }
.col-verdict { width: 140px; padding: 10px 8px; }
.col-before-after-why { padding: 8px 10px; }

.entity-name { display: block; font-weight: bold; color: #e8e8e8; font-size: 13px; }
.entity-meta { display: block; color: #888; font-size: 11px; margin-top: 2px; }
.entity-source { display: block; color: #666; font-size: 10px; margin-top: 2px; word-break: break-all; }

/* Verdict badges */
.verdict-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
.verdict-affirmed .verdict-badge { background: #1a3a1a; color: #6dbe6d; border: 1px solid #2d6b2d; }
.verdict-synthesized .verdict-badge { background: #1a2a3a; color: #6a9fd8; border: 1px solid #2d5580; }
.verdict-dead-stamped .verdict-badge { background: #3a1a1a; color: #d87070; border: 1px solid #802d2d; }
.verdict-hedged .verdict-badge { background: #3a2a1a; color: #d8b470; border: 1px solid #806030; }
.verdict-residue-routed .verdict-badge { background: #2a1a3a; color: #b47ad8; border: 1px solid #5a2d80; }
.confidence { display: block; color: #888; font-size: 10px; margin-top: 4px; }

/* D15 before/after/why block -- inline, not split panels */
.baw-block { display: flex; flex-direction: column; gap: 0; }
.baw-section { padding: 6px 0; border-bottom: 1px solid #2a2a2a; }
.baw-section:last-child { border-bottom: none; }
.baw-label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.baw-content { padding-left: 8px; }

/* Before: provenance entries */
.prov-entry { margin-bottom: 6px; padding: 4px 8px; background: #222; border-left: 2px solid #555; }
.prov-source { font-size: 11px; color: #888; display: block; }
.prov-comment { margin-top: 3px; color: #bbb; font-size: 12px; white-space: pre-wrap; }
.structured-choices { margin-top: 4px; }
.structured-choices summary { font-size: 10px; color: #888; cursor: pointer; }
.structured-choices pre { font-size: 10px; color: #aaa; background: #1a1a1a; padding: 4px; overflow-x: auto; }

/* After: committed / proposed */
.after-committed { color: #c8e6b8; background: #1a2a1a; padding: 6px 8px; white-space: pre-wrap; font-size: 12px; }
.after-proposed { margin-top: 4px; color: #b8d4e6; font-size: 11px; }
.after-proposed .label { color: #668; font-style: italic; }

/* Why: reasoning */
.why-reasoning { color: #d8cc9a; background: #252010; padding: 6px 8px; white-space: pre-wrap; font-size: 12px; }

/* "none" = empty / not populated state */
.none { color: #555; font-style: italic; font-size: 11px; }

.empty-state { text-align: center; padding: 40px; color: #666; }

/* Row highlight by verdict (background tint) */
.verdict-affirmed { background: #1a201a; }
.verdict-synthesized { background: #1a1c22; }
.verdict-dead-stamped { background: #211a1a; }
.verdict-hedged { background: #221e1a; }
.verdict-residue-routed { background: #1e1a22; }
</style>
</head>
<body>
<h1>KTX/MVDSV L1 describe-fill -- internal-tier audit review</h1>
<div class="meta">
  Generated: ${esc(generatedAt)} -- ${count} row(s) -- D13 internal tier (confidence + reasoning + verdict + losing provenance) -- D15 before/after/why inline per row -- do not distribute externally
</div>
<div class="controls">
  <label>Filter name: <input type="text" id="filter-name" placeholder="substring..." autocomplete="off"></label>
  <label>Project: <select id="filter-project"><option value="">all</option>${projectOptions}</select></label>
  <label>Type: <select id="filter-type"><option value="">all</option>${typeOptions}</select></label>
  <label>Verdict: <select id="filter-verdict"><option value="">all</option>${verdictOptions}</select></label>
  <span id="count-display">${count} / ${count}</span>
</div>
<table id="audit-table">
<thead>
<tr>
  <th data-col="name" class="sort-asc">Entity</th>
  <th data-col="verdict">Verdict</th>
  <th>Before / After / Why</th>
</tr>
</thead>
<tbody id="audit-body">
${rowsHtml}
</tbody>
</table>
<script>
// Client-side sort + filter -- vanilla JS, no external deps (page works as a local file).
// Why inline script: the page is a self-contained generated artifact with no build step.
(function() {
  var table = document.getElementById('audit-table');
  var tbody = document.getElementById('audit-body');
  var countDisplay = document.getElementById('count-display');
  var filterName = document.getElementById('filter-name');
  var filterProject = document.getElementById('filter-project');
  var filterType = document.getElementById('filter-type');
  var filterVerdict = document.getElementById('filter-verdict');

  var sortCol = 'name';
  var sortDir = 1; // 1=asc, -1=desc

  function getRows() {
    return Array.from(tbody.querySelectorAll('tr.entity-row'));
  }

  function applyFilter() {
    var nameVal = filterName.value.toLowerCase();
    var projVal = filterProject.value;
    var typeVal = filterType.value;
    var verdVal = filterVerdict.value;
    var rows = getRows();
    var visible = 0;
    rows.forEach(function(row) {
      var name = row.querySelector('.entity-name').textContent.toLowerCase();
      var proj = row.getAttribute('data-project');
      var type = row.getAttribute('data-type');
      var verd = row.getAttribute('data-verdict');
      var show = (!nameVal || name.indexOf(nameVal) !== -1)
               && (!projVal || proj === projVal)
               && (!typeVal || type === typeVal)
               && (!verdVal || verd === verdVal);
      if (show) { row.classList.remove('hidden'); visible++; }
      else { row.classList.add('hidden'); }
    });
    countDisplay.textContent = visible + ' / ' + rows.length;
  }

  function applySort(col) {
    if (sortCol === col) { sortDir = -sortDir; }
    else { sortCol = col; sortDir = 1; }

    var headers = table.querySelectorAll('thead th[data-col]');
    headers.forEach(function(h) {
      h.classList.remove('sort-asc', 'sort-desc');
      if (h.getAttribute('data-col') === sortCol) {
        h.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
      }
    });

    var rows = getRows();
    rows.sort(function(a, b) {
      var av = '', bv = '';
      if (col === 'name') {
        av = a.querySelector('.entity-name').textContent;
        bv = b.querySelector('.entity-name').textContent;
      } else if (col === 'verdict') {
        av = a.getAttribute('data-verdict');
        bv = b.getAttribute('data-verdict');
      }
      if (av < bv) return -sortDir;
      if (av > bv) return sortDir;
      return 0;
    });
    rows.forEach(function(r) { tbody.appendChild(r); });
    applyFilter();
  }

  table.querySelectorAll('thead th[data-col]').forEach(function(th) {
    th.addEventListener('click', function() { applySort(th.getAttribute('data-col')); });
  });

  filterName.addEventListener('input', applyFilter);
  filterProject.addEventListener('change', applyFilter);
  filterType.addEventListener('change', applyFilter);
  filterVerdict.addEventListener('change', applyFilter);
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// DB query
// ---------------------------------------------------------------------------
//
// Why this predicate: D19 scope = arc-owned rows that have been through the
// evaluate-and-fill pipeline (description_verdict IS NOT NULL). Phase 1 produces
// exactly one such row (k_short_gib via the Task 6 smoke); the page must render
// correctly for 1 row and for the N rows Phases 3/4 will produce.
//
// source_ref: read the most-recent *_versions row's source_file (the canonical
// read use-site per P3/D6). We LEFT JOIN cvar_versions for cvars, command_versions
// for commands, etc. A CASE WHEN drives it; absent version rows yield NULL source_ref.
// This reuses the existing idx_cvar_versions_source mechanism (P3, no new citation format).

async function fetchAuditRows(): Promise<AuditRow[]> {
  // Why a single query over all four types: D15 "one page, all in-scope entries,
  // scan-the-whole-work." We use a subquery to pull source_file from the most recent
  // version snapshot per entity. The COALESCE chain covers all four type-specific tables.
  const rows = await sql<AuditRow[]>`
    SELECT
      e.canonical_id,
      e.name,
      e.project,
      e.type,
      e.description,
      e.description_origin,
      e.description_verdict,
      e.description_confidence,
      e.description_reasoning,
      e.description_proposed,
      e.description_provenance,
      COALESCE(
        (SELECT cv.source_file FROM cvar_versions cv WHERE cv.entity_id = e.id ORDER BY cv.extracted_at DESC LIMIT 1),
        (SELECT cmd.source_file FROM command_versions cmd WHERE cmd.entity_id = e.id ORDER BY cmd.extracted_at DESC LIMIT 1),
        (SELECT cp.source_file FROM cmdline_param_versions cp WHERE cp.entity_id = e.id ORDER BY cp.extracted_at DESC LIMIT 1),
        (SELECT ik.source_file FROM info_key_versions ik WHERE ik.entity_id = e.id ORDER BY ik.extracted_at DESC LIMIT 1)
      ) AS source_ref
    FROM entities e
    WHERE e.project IN ('ktx', 'mvdsv')
      AND e.type IN ('cvar', 'command', 'cmdline_param', 'info_key')
      AND e.description_verdict IS NOT NULL
    ORDER BY e.project, e.type, e.name
  `;
  return rows;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;

  console.log('serialize-audit-review: fetching rows...');
  const rows = await fetchAuditRows();
  console.log(`serialize-audit-review: ${rows.length} row(s) returned`);

  const html = renderRows(rows);

  // mkdir -p the output directory (it is under output/ which is not fully gitignored
  // for .html -- only output/*.json is covered; the serializer creates the subdir).
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf-8');

  console.log(`serialize-audit-review: wrote ${html.length} bytes -> ${outputPath}`);
  await closeSql();
}

// import.meta.main is Bun-only (P1 / always-on rules). Under Node it is undefined
// and the script is safely importable as a library (for tests / acceptance criterion 3).
if (import.meta.main) {
  main().catch((err) => {
    console.error('serialize-audit-review error:', err);
    process.exit(1);
  });
}
