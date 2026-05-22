#!/usr/bin/env bun
/**
 * build-l1-audit-catalog.ts -- single-page HTML catalog for L1 cvar+command entities.
 *
 * CLI:
 *   bun apps/qw-oracle/scripts/build-l1-audit-catalog.ts --project ktx [--output PATH]
 *
 * Reads DB rows for the named project, groups by category_inferred, emits a
 * self-contained HTML file with collapsible groups + entity cards + filter box.
 *
 * Spec: docs/superpowers/specs/2026-05-22-ktx-l1-audit-visualization-design.md
 */

import postgres from "postgres";
import { writeFileSync } from "fs";

interface EntityRow {
  canonical_id: string;
  name: string;
  type: "cvar" | "command";
  description: string | null;
  description_reasoning: string | null;
  description_verdict: string | null;
  description_origin: string | null;
  description_confidence: string | null;
  description_anchor_version: string | null;
  source_file: string | null;
  source_line: number | null;
  category_inferred: string;
  category_inferred_origin: string;
}

function parseArgs(argv: string[]): { project: string; output: string } {
  let project = "ktx";
  let output = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--project") project = argv[i + 1];
    if (argv[i] === "--output") output = argv[i + 1];
  }
  const today = new Date().toISOString().slice(0, 10);
  if (!output) {
    output = `apps/qw-oracle/docs/reviews/${today}-${project}-l1-catalog.html`;
  }
  return { project, output };
}

async function fetchEntities(sql: postgres.Sql, project: string): Promise<EntityRow[]> {
  const cvars = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cv.source_file, cv.source_line,
      cv.category_inferred, cv.category_inferred_origin
    FROM entities e
    JOIN cvar_versions cv ON cv.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'cvar'
    ORDER BY cv.category_inferred NULLS LAST, e.name
  `;
  const commands = await sql<EntityRow[]>`
    SELECT
      e.canonical_id, e.name, e.type::text AS type,
      e.description, e.description_reasoning,
      e.description_verdict, e.description_origin, e.description_confidence,
      e.description_anchor_version,
      cm.source_file, cm.source_line,
      cm.category_inferred, cm.category_inferred_origin
    FROM entities e
    JOIN command_versions cm ON cm.entity_id = e.id
    WHERE e.project = ${project} AND e.type = 'command'
    ORDER BY cm.category_inferred NULLS LAST, e.name
  `;
  return [...cvars, ...commands];
}

async function main() {
  const { project, output } = parseArgs(process.argv.slice(2));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL env var required");
    process.exit(1);
  }
  const sql = postgres(dbUrl);
  try {
    const rows = await fetchEntities(sql, project);
    console.error(`Fetched ${rows.length} entities for project=${project}`);

    const uncategorized = rows.filter((r) => !r.category_inferred);
    if (uncategorized.length > 0) {
      console.error(`ERROR: ${uncategorized.length} entities lack category_inferred:`);
      for (const r of uncategorized.slice(0, 20)) console.error(`  ${r.canonical_id}`);
      if (uncategorized.length > 20) console.error(`  ... and ${uncategorized.length - 20} more`);
      console.error("Refusing to emit HTML. Fix categorization first (see plan README Step 15.4).");
      process.exit(2);
    }

    const html = renderHtml(rows, project);
    writeFileSync(output, html);
    console.error(`Wrote ${output}`);
  } finally {
    await sql.end();
  }
}

function escapeHtml(s: string | null): string {
  if (s === null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstPara(desc: string | null): string {
  if (!desc) return "";
  const idx = desc.indexOf("\n\n");
  return idx === -1 ? desc.trim() : desc.slice(0, idx).trim();
}

function buildBadges(r: EntityRow): string {
  const badges: string[] = [];
  badges.push(`<span class="badge">${r.type}</span>`);
  const len = (r.description ?? "").length;
  badges.push(`<span class="badge">${len}c</span>`);
  if (r.description_reasoning === null) badges.push(`<span class="badge badge-anchor">anchor</span>`);
  if ((r.description ?? "").includes("See also:")) badges.push(`<span class="badge badge-seealso">See also</span>`);
  return badges.join(" ");
}

function renderCard(r: EntityRow): string {
  const desc = escapeHtml(r.description);
  const firstP = escapeHtml(firstPara(r.description));
  const reasoning = r.description_reasoning
    ? escapeHtml(r.description_reasoning)
    : "(anchor row -- no reasoning; D20 template authored by hand)";
  const sourceRef = r.source_file ? `${r.source_file}:${r.source_line}` : "(none)";
  return `
<div class="card" data-name="${escapeHtml(r.name)}" data-first="${escapeHtml(firstPara(r.description).toLowerCase())}">
  <div class="card-header" onclick="toggleCard(this)">
    <span class="chevron">&#x25B8;</span>
    <code class="entity-name">${escapeHtml(r.name)}</code>
    <span class="badges">${buildBadges(r)}</span>
    <div class="first-para">${firstP}</div>
  </div>
  <div class="card-body" hidden>
    <pre class="description">${desc}</pre>
    <div class="metadata-strip">
      <span>verdict: <code>${escapeHtml(r.description_verdict)}</code></span>
      <span>origin: <code>${escapeHtml(r.description_origin)}</code></span>
      <span>confidence: <code>${escapeHtml(r.description_confidence)}</code></span>
      <span>anchor: <code>${escapeHtml(r.description_anchor_version)}</code></span>
      <span>source: <code>${escapeHtml(sourceRef)}</code></span>
    </div>
    <div class="audit-trail">
      <div class="audit-label">audit trail (description_reasoning)</div>
      <div class="audit-body">${reasoning}</div>
    </div>
  </div>
</div>`;
}

function renderGroup(category: string, entities: EntityRow[]): string {
  const cards = entities.map(renderCard).join("\n");
  return `
<section class="group" data-category="${escapeHtml(category)}">
  <header class="group-header" onclick="toggleGroup(this)">
    <span class="chevron">&#x25B8;</span>
    <span class="group-name">${escapeHtml(category)}</span>
    <span class="group-count">${entities.length} entities</span>
  </header>
  <div class="group-body" hidden>${cards}</div>
</section>`;
}

function renderHtml(rows: EntityRow[], project: string): string {
  const byCategory = new Map<string, EntityRow[]>();
  for (const r of rows) {
    const c = r.category_inferred;
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(r);
  }
  const categories = Array.from(byCategory.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const anchorVersion = rows.find((r) => r.description_anchor_version)?.description_anchor_version ?? "(unknown)";
  const generatedAt = new Date().toISOString();
  const toc = categories
    .map(([c, ents]) => `<li><a href="#cat-${escapeHtml(c).replace(/\s+/g, "-")}">${escapeHtml(c)}</a> <span class="toc-count">${ents.length}</span></li>`)
    .join("\n");
  const sections = categories.map(([c, ents]) => `<a id="cat-${escapeHtml(c).replace(/\s+/g, "-")}"></a>${renderGroup(c, ents)}`).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(project)} L1 audit catalog</title>
<style>
${INLINE_CSS}
</style>
</head>
<body>
<header class="top-bar">
  <h1>${escapeHtml(project.toUpperCase())} L1 audit catalog</h1>
  <div class="meta">${rows.length} entities &middot; anchor ${escapeHtml(anchorVersion)} &middot; generated ${generatedAt}</div>
  <input type="text" id="filter" placeholder="filter by name or first paragraph..." oninput="applyFilter()">
</header>
<aside class="toc"><ul>${toc}</ul></aside>
<main class="main">${sections}</main>
<script>${INLINE_JS}</script>
</body>
</html>`;
}

const INLINE_CSS = `
/* placeholder -- replaced in Task 19 */
body { background: #1a1a1a; color: #ddd; font-family: ui-sans-serif, system-ui; margin: 0; }
`;

const INLINE_JS = `
/* placeholder -- replaced in Task 20 */
function toggleCard(el) { const b = el.parentElement.querySelector('.card-body'); b.hidden = !b.hidden; el.querySelector('.chevron').textContent = b.hidden ? '\\u25B8' : '\\u25BE'; }
function toggleGroup(el) { const b = el.parentElement.querySelector('.group-body'); b.hidden = !b.hidden; el.querySelector('.chevron').textContent = b.hidden ? '\\u25B8' : '\\u25BE'; }
function applyFilter() { /* placeholder */ }
`;

if (import.meta.main) main();
