// apps/qw-oracle/scripts/build-brain-manifest.ts
//
// Emits the oracle-web "brain manifest": everything the three owned zoom levels
// of oracle.quake.world v1 render (counts + named inventory + glow/state), and
// nothing below the doors -- no thread contents, no note bodies, no per-entity
// rows. Spec: docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md (D3
// zoom-stop, D5 launch registry, D7 snapshots-URL serving + history stub).
//
// Usage (from apps/qw-oracle/):
//   bun scripts/build-brain-manifest.ts                 # writes snapshots/brain-manifest.json (committed)
//   bun scripts/build-brain-manifest.ts --out <path>
//   bun scripts/build-brain-manifest.ts --publish       # ALSO copies to /mnt/user/appdata/qw-oracle/snapshots/
//
// --publish makes the manifest live at https://oracle.slipgate.me/snapshots/
// (5-min cache). Do NOT publish until the prod DB reaches parity with the twin
// (Arc A finish-out) -- the public brain should not outgrow the public MCP.
//
// History stub: each build prepends the PREVIOUS manifest's built_at + per-
// datacenter headlines to `history` (capped at 12) so the brain can render
// growth trails without any external state.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { db, closeDb } from '../shared/db.ts';

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = outIdx !== -1 && argv[outIdx + 1] ? argv[outIdx + 1] : 'snapshots/brain-manifest.json';
const PUBLISH = argv.includes('--publish');
const PUBLISH_PATH = '/mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json';
const HISTORY_CAP = 12;

// ---------- Engine Facts (L1) ----------
const entityRows = await db<{ project: string; type: string; n: number }[]>`
  SELECT project, type, count(*)::int AS n FROM entities GROUP BY project, type`;
// Category lives on the version rows (source group, or the docs-l1-enrichment
// arc's inferred category), not on entities. One row per entity: prefer 'head'.
const cvarCategories = await db<{ project: string; category: string; n: number }[]>`
  SELECT e.project,
         COALESCE(NULLIF(cv.group_name_in_source, ''), NULLIF(cv.category_inferred, '')) AS category,
         count(*)::int AS n
  FROM (SELECT DISTINCT ON (entity_id) entity_id, group_name_in_source, category_inferred
        FROM cvar_versions ORDER BY entity_id, (version = 'head') DESC) cv
  JOIN entities e ON e.id = cv.entity_id
  WHERE COALESCE(NULLIF(cv.group_name_in_source, ''), NULLIF(cv.category_inferred, '')) IS NOT NULL
  GROUP BY 1, 2`;

const byProject = new Map<string, { types: Record<string, number>; total: number }>();
for (const r of entityRows) {
  const p = byProject.get(r.project) ?? { types: {}, total: 0 };
  p.types[r.type] = r.n;
  p.total += r.n;
  byProject.set(r.project, p);
}
const engineRegions = [...byProject.entries()]
  .sort((a, b) => b[1].total - a[1].total)
  .map(([project, p]) => ({
    id: project,
    entities: p.total,
    types: Object.fromEntries(Object.entries(p.types).sort((a, b) => b[1] - a[1])),
    top_cvar_categories: cvarCategories
      .filter((c) => c.project === project)
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
      .map((c) => ({ name: c.category, cvars: c.n })),
  }));
const engineTotal = engineRegions.reduce((s, r) => s + r.entities, 0);

// ---------- Community Memory (L2) ----------
const msgStats = await db<{ channel_name: string; n: number; from_year: number; to_year: number }[]>`
  SELECT channel_name, count(*)::int AS n,
         EXTRACT(YEAR FROM min(created_at))::int AS from_year,
         EXTRACT(YEAR FROM max(created_at))::int AS to_year
  FROM messages GROUP BY channel_name`;
const threadStats = await db<{ channel_name: string; threads: number; solved: number; unresolved: number; informational: number }[]>`
  SELECT channel_name, count(*)::int AS threads,
         count(*) FILTER (WHERE resolution_status = 'solved')::int AS solved,
         count(*) FILTER (WHERE resolution_status = 'unresolved')::int AS unresolved,
         count(*) FILTER (WHERE resolution_status = 'informational')::int AS informational
  FROM chat_threads GROUP BY channel_name`;
const recentSolved = await db<{ channel_name: string; topic_label: string }[]>`
  SELECT channel_name, topic_label FROM (
    SELECT channel_name, topic_label,
           row_number() OVER (PARTITION BY channel_name ORDER BY date_range_end DESC) AS rn
    FROM chat_threads WHERE resolution_status = 'solved'
  ) t WHERE rn <= 3`;

const memoryRegions = msgStats
  .sort((a, b) => b.n - a.n)
  .map((m) => {
    const t = threadStats.find((x) => x.channel_name === m.channel_name);
    return {
      id: m.channel_name.replace(/^#/, ''),
      messages: m.n,
      years: `${m.from_year}-${m.to_year}`,
      threads: t?.threads ?? 0,
      resolution: t ? { solved: t.solved, unresolved: t.unresolved, informational: t.informational } : null,
      recent_solved_labels: recentSolved.filter((r) => r.channel_name === m.channel_name).map((r) => r.topic_label),
    };
  });
const memMessages = memoryRegions.reduce((s, r) => s + r.messages, 0);
const memThreads = memoryRegions.reduce((s, r) => s + r.threads, 0);

// ---------- Curated Synthesis (L3) ----------
const notes = await db<{ slug: string; title: string; summary: string; shape: string | null }[]>`
  SELECT slug, title, summary, shape FROM concepts
  WHERE summary IS NOT NULL AND summary <> '' ORDER BY slug`;

// ---------- Game Content (qw namespace) ----------
const [{ maps }] = await db<{ maps: number }[]>`SELECT count(*)::int AS maps FROM maps`;
const defRows = await db<{ src: string; kind: string; n: number }[]>`
  SELECT gameplay_source_id AS src, kind, count(*)::int AS n
  FROM gameplay_entity_defs GROUP BY 1, 2`;
const mechRows = await db<{ src: string; kind: string; n: number }[]>`
  SELECT gameplay_source_id AS src, kind, count(*)::int AS n
  FROM gameplay_mechanics GROUP BY 1, 2`;
const groupKinds = (rows: { src: string; kind: string; n: number }[]) => {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.src] ??= {})[r.kind] = r.n;
  for (const src of Object.keys(out))
    out[src] = Object.fromEntries(Object.entries(out[src]).sort((a, b) => b[1] - a[1]));
  return out;
};

// ---------- Assemble (registry per D5) ----------
const datacenters = [
  {
    id: 'engine-facts', name: 'Engine Facts', glow: 'lit',
    headline: { entities: engineTotal, codebases: engineRegions.length },
    regions: engineRegions,
    door: { kind: 'site', label: 'Browse the full reference', url: 'https://quakeworld-docs.pages.dev/', note: 'docs.quake.world once DNS lands' },
  },
  {
    id: 'community-memory', name: 'Community Memory', glow: 'lit',
    headline: { messages: memMessages, threads: memThreads, channels: memoryRegions.length },
    regions: memoryRegions,
    door: { kind: 'agent', call: 'search_solved_issues("<your problem>")' },
  },
  {
    id: 'curated-synthesis', name: 'Curated Synthesis', glow: 'lit',
    headline: { notes: notes.length },
    regions: notes.map((n) => ({ id: n.slug, title: n.title, summary: n.summary, shape: n.shape })),
    door: { kind: 'agent', call: 'get_concept_note("<slug>")' },
  },
  {
    id: 'game-content', name: 'Game Content', glow: 'lit',
    headline: {
      maps,
      entity_defs: defRows.reduce((s, r) => s + r.n, 0),
      mechanics: mechRows.reduce((s, r) => s + r.n, 0),
    },
    regions: [
      { id: 'maps', maps, door: { kind: 'agent', call: 'lookup_map("dm3")' } },
      { id: 'entity-defs', by_source: groupKinds(defRows), door: { kind: 'agent', call: 'search_gameplay_entities("...")' } },
      { id: 'mechanics', by_source: groupKinds(mechRows), door: { kind: 'agent', call: 'search_mechanics("...")' } },
    ],
  },
  {
    id: 'community-history', name: 'Community History', glow: 'dim',
    teaser: 'Clans, players, official tournament results, LAN history -- a region this brain grows into as the community platform comes online.',
  },
  {
    id: 'match-stats', name: 'Match Stats', glow: 'dim',
    teaser: '18,000+ recorded 4on4 games await their wiring.',
  },
];

// ---------- History stub (D7): prepend previous build's headlines ----------
type Manifest = { built_at: string; datacenters: { id: string; headline?: unknown }[]; history?: unknown[] };
let history: unknown[] = [];
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8')) as Manifest;
    history = [
      { built_at: prev.built_at, headlines: Object.fromEntries(prev.datacenters.filter((d) => d.headline).map((d) => [d.id, d.headline])) },
      ...(prev.history ?? []),
    ].slice(0, HISTORY_CAP);
  } catch { /* unreadable previous manifest: start history fresh */ }
}

const manifest = {
  schema_version: 1,
  built_at: new Date().toISOString(),
  source: { db: 'dev-twin', note: 'L2 backfill in progress; prod parity ships at Arc A finish-out' },
  datacenters,
  history,
};

mkdirSync(dirname(join(process.cwd(), OUT)), { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
const kb = (Buffer.byteLength(JSON.stringify(manifest)) / 1024).toFixed(1);
console.log(`wrote ${OUT} (${kb} KB) -- ${datacenters.filter((d) => d.glow === 'lit').length} lit / ${datacenters.filter((d) => d.glow === 'dim').length} dim, history depth ${history.length}`);
if (PUBLISH) {
  copyFileSync(OUT, PUBLISH_PATH);
  console.log(`published to ${PUBLISH_PATH} (live at oracle.slipgate.me/snapshots/ within ~5 min)`);
}

await closeDb();
