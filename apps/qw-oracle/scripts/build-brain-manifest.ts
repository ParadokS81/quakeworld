// apps/qw-oracle/scripts/build-brain-manifest.ts
//
// Emits the oracle-web "brain manifest" (`brain-manifest-v1`): every number and
// display line the three owned zoom levels of oracle.quake.world v1 render, and
// nothing below the doors -- no thread contents or topic labels, no note bodies
// or summaries, no per-entity rows, no participant lists. Spec:
// docs/superpowers/specs/2026-08-05-oracle-web-v1-design.md (D3 zoom-stop, D5
// launch registry, D7 snapshots-URL serving + history stub); contract:
// docs/superpowers/plans/2026-08-06-oracle-web-v1/phase-1-manifest-pipeline.md.
//
// The exported `BrainManifest` interface below IS the arc's machine-readable
// data contract (ledger P2): phases 2-6 mirror these types, never reshape them.
// A field the site needs but the manifest lacks is a dated amendment to the
// phase doc, not a downstream invention.
//
// Usage (from apps/qw-oracle/):
//   bun scripts/build-brain-manifest.ts                 # writes snapshots/brain-manifest.json (committed)
//   bun scripts/build-brain-manifest.ts --out <path>
//   bun scripts/build-brain-manifest.ts --publish       # ALSO copies to /mnt/user/appdata/qw-oracle/snapshots/
//
// --publish makes the manifest live at https://oracle.slipgate.me/snapshots/
// (5-min cache). Do NOT publish while the twin has outgrown prod -- the public
// brain should not outgrow the public MCP.
//
// History stub (D7): each build prepends the PREVIOUS manifest's timestamp +
// per-datacenter headline counts to `history` (capped at 12) so the brain can
// render growth trails without any external state.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, renameSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../shared/db.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..');

const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const OUT = outIdx !== -1 && argv[outIdx + 1] ? argv[outIdx + 1] : 'snapshots/brain-manifest.json';
const PUBLISH = argv.includes('--publish');
const PUBLISH_PATH = '/mnt/user/appdata/qw-oracle/snapshots/brain-manifest.json';
// Dot-prefixed so a torn intermediate is never served under the manifest's own
// name; the rename onto PUBLISH_PATH is same-filesystem and therefore atomic.
const PUBLISH_TMP = '/mnt/user/appdata/qw-oracle/snapshots/.brain-manifest.json.tmp';
const HISTORY_CAP = 12;

// The `ef` door's target while `docs.quake.world` DNS is pending: the displayed
// `code` already reads docs.quake.world (mockup copy). Flip this constant to
// 'https://docs.quake.world/' and re-emit once DNS resolves -- no site change.
const EF_DOCS_HREF = 'https://quakeworld-docs.pages.dev/';

// ---------- contract types (arc data contract, ledger P2) ----------

export type Door =
  | { kind: 'site'; label: string; code: string; href: string }
  | { kind: 'agent'; call: string };

export interface LitDatacenter {
  id: string;
  name: string;
  lit: true;
  num: number;                     // headline count, RAW -- the site formats it
  sub: string;                     // drill-card sub-line, emitter-composed
  stationSubs: string[];           // station reveal lines (long subs pre-split)
  share: number;                   // scaffold density, 3 decimals (formula below)
  threads?: number;                // raw topic-thread count (cm at launch)
  solved?: number;                 // raw solved-thread count (cm at launch)
  bars?: Array<[string, number]>;  // region breakdown rows (label, raw count), count-desc
  stats?: Array<[number, string]>; // stat tiles (raw value, label); gc's three
                                   // labels are BYTE-PINNED contract literals
  notes?: string[];                // curated highlight lines, no counts (cs at launch)
  door: Door;                      // level-4 exit descriptor (D3/P9)
}

export interface DormantDatacenter {
  id: string;
  name: string;
  lit: false;
  teaser: string;                  // honest inspiration, never a promise (P9)
}

export type Datacenter = LitDatacenter | DormantDatacenter;

export interface HistoryEntry {
  generated_at: string;            // the prior emit's timestamp
  nums: Record<string, number>;    // headline num per LIT datacenter id, that emit
}

export interface BrainManifest {
  schema_version: 'brain-manifest-v1';
  generated_at: string;
  oracle_commit: string;
  source: 'twin' | 'prod';
  datacenters: Datacenter[];       // OPEN REGISTRY (D4): consumers key by id
  history: HistoryEntry[];         // growth trail, newest first, capped at 12
}

const fmt = (n: number) => n.toLocaleString('en-US');

// ---------- numbers (all derived live; never hardcode a count) ----------

// ENGINE FACTS (L1)
const [engine] = await db<{ entities: number; codebases: number }[]>`
  SELECT count(*)::int AS entities, count(DISTINCT project)::int AS codebases FROM entities`;
const engineBars = await db<{ project: string; n: number }[]>`
  SELECT project, count(*)::int AS n FROM entities
  GROUP BY project ORDER BY count(*) DESC, project ASC`;

// DISCORD (L2)
const [{ messages }] = await db<{ messages: number }[]>`
  SELECT count(*)::int AS messages FROM messages`;
const [threadStats] = await db<{ threads: number; solved: number }[]>`
  SELECT count(*)::int AS threads,
         count(*) FILTER (WHERE resolution_status = 'solved')::int AS solved
  FROM chat_threads`;
const messageBars = await db<{ channel_name: string; n: number }[]>`
  SELECT channel_name, count(*)::int AS n FROM messages
  GROUP BY channel_name ORDER BY count(*) DESC, channel_name ASC`;

// CONCEPT NOTES (L3). The empty-summary rows are harvest-probe breadcrumbs, not
// notes -- excluding them is what makes this count match the published figure.
const [{ notes: conceptNotes }] = await db<{ notes: number }[]>`
  SELECT count(*)::int AS notes FROM concepts WHERE summary IS NOT NULL AND summary <> ''`;

// GAME CONTENT (qw namespace)
const [{ maps }] = await db<{ maps: number }[]>`SELECT count(*)::int AS maps FROM maps`;
const [{ mechanics }] = await db<{ mechanics: number }[]>`
  SELECT count(*)::int AS mechanics FROM gameplay_mechanics`;
const [{ entity_defs }] = await db<{ entity_defs: number }[]>`
  SELECT count(*)::int AS entity_defs FROM gameplay_entity_defs`;

// ---------- assemble the registry (D5 launch set, P8 display names) ----------

const lit: LitDatacenter[] = [
  {
    id: 'ef',
    name: 'ENGINE FACTS',
    lit: true,
    num: engine.entities,
    sub: `entities · ${fmt(engine.codebases)} codebases`,
    stationSubs: [`entities · ${fmt(engine.codebases)} codebases`],
    share: 0, // filled below
    bars: engineBars.map((r) => [r.project, r.n] as [string, number]),
    door: {
      kind: 'site',
      label: 'browse the full reference',
      code: 'docs.quake.world',
      href: EF_DOCS_HREF,
    },
  },
  {
    id: 'cm',
    name: 'DISCORD',
    lit: true,
    num: messages,
    sub: `messages · ${fmt(threadStats.threads)} threads · ${fmt(threadStats.solved)} solved`,
    stationSubs: [`messages · ${fmt(threadStats.threads)} threads`, `${fmt(threadStats.solved)} solved`],
    share: 0,
    threads: threadStats.threads,
    solved: threadStats.solved,
    bars: messageBars.map((r) => [r.channel_name, r.n] as [string, number]),
    door: { kind: 'agent', call: 'search_solved_issues("…")' },
  },
  {
    id: 'cs',
    name: 'CONCEPT NOTES',
    lit: true,
    num: conceptNotes,
    sub: 'curated notes · honest gap list',
    stationSubs: ['curated notes · honest gap list'],
    share: 0,
    // Editorial groupings, no counts embedded: they drift only when notes are
    // added, and the operator curates the lines at that point (Open question 3).
    notes: [
      '1on1 · 4on4 · hoonymode · clan arena · race',
      'weapon scripts · player skins · HUD configuration',
      'network & connection · match recording · rulesets',
    ],
    door: { kind: 'agent', call: 'get_concept_note("…")' },
  },
  {
    id: 'gc',
    name: 'GAME CONTENT',
    lit: true,
    num: maps,
    sub: 'maps · mechanics · entity defs',
    stationSubs: ['maps · mechanics · entity defs'],
    share: 0,
    // Labels are BYTE-PINNED contract literals in this order (2026-08-06
    // amendment F6): consumers may key rows by them. Rewording is a contract
    // change requiring a dated amendment, never a silent edit here.
    stats: [
      [maps, 'maps'],
      [mechanics, 'mechanics'],
      [entity_defs, 'entity defs'],
    ],
    door: { kind: 'agent', call: 'lookup_map("dm3")' },
  },
];

const dormant: DormantDatacenter[] = [
  {
    id: 'ch',
    name: 'COMMUNITY HISTORY',
    lit: false,
    teaser:
      'Clans, players, official tournament results, LAN history — a region this brain grows into as the community platform comes online.',
  },
  {
    id: 'ms',
    name: 'MATCH STATS',
    lit: false,
    // The 18,000+ figure is qw-stats territory, not in this DB: static copy.
    teaser: '18,000+ recorded 4on4 games await their wiring.',
  },
];

// Scaffold density on a log scale, so a 741K-message datacenter does not crush
// a 44-note one out of the layout. Emitter-side because which count is "the"
// headline is registry knowledge -- a newly attached datacenter arrives with its
// share and the static site needs no redeploy (D4/P3, Open question 1).
const weights = lit.map((d) => Math.log(1 + d.num));
const weightTotal = weights.reduce((s, w) => s + w, 0);
lit.forEach((d, i) => {
  d.share = Math.round((weights[i] / weightTotal) * 1000) / 1000;
});

const datacenters: Datacenter[] = [...lit, ...dormant];

// ---------- envelope ----------

const generated_at = new Date().toISOString();

let oracle_commit = 'unknown';
try {
  oracle_commit = execSync(`git -C "${MONOREPO_ROOT}" rev-parse HEAD`, { encoding: 'utf-8' }).trim();
} catch { /* unknown is fine */ }

// Self-report which DB the numbers came from: the cockpit can only reach the
// twin (prod is off devnet by design), so 'prod' from a cockpit emit is itself
// a finding rather than a reassurance.
const source: BrainManifest['source'] =
  (process.env.DATABASE_URL ?? '').includes('qw-oracle-postgres-dev') ? 'twin' : 'prod';

// ---------- history stub (D7) ----------

let history: HistoryEntry[] = [];
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8')) as Partial<BrainManifest>;
    // SHAPE GUARD, not a bare try/catch: the pre-contract 2026-08-05 emit is
    // valid JSON, so it parses cleanly and an unguarded adapt would prepend a
    // contract-violating `{ "nums": {} }` entry with no generated_at. Only a v1
    // envelope may seed the trail; anything else restarts it at [].
    if (prev.schema_version === 'brain-manifest-v1' && typeof prev.generated_at === 'string') {
      const prevHistory = Array.isArray(prev.history) ? prev.history : [];
      const sameUtcDay = prev.generated_at.slice(0, 10) === generated_at.slice(0, 10);
      if (sameUtcDay) {
        // Cadence guard: a burst of debug re-emits would otherwise flood the
        // 12 slots with same-day entries and evict a year of monthly history.
        history = prevHistory.slice(0, HISTORY_CAP);
      } else {
        const nums: Record<string, number> = {};
        for (const d of prev.datacenters ?? []) {
          if (d.lit && typeof d.num === 'number') nums[d.id] = d.num;
        }
        history = [{ generated_at: prev.generated_at, nums }, ...prevHistory].slice(0, HISTORY_CAP);
      }
    }
  } catch { /* unparseable previous manifest: start history fresh */ }
}

// ---------- write ----------

const manifest: BrainManifest = {
  schema_version: 'brain-manifest-v1',
  generated_at,
  oracle_commit,
  source,
  datacenters,
  history,
};

mkdirSync(dirname(join(process.cwd(), OUT)), { recursive: true });
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
const kb = (Buffer.byteLength(JSON.stringify(manifest)) / 1024).toFixed(1);
console.log(
  `wrote ${OUT} (${kb} KB) -- ${lit.length} lit / ${dormant.length} dormant, source ${source}, history depth ${history.length}`,
);

if (PUBLISH) {
  // Copy-then-rename so a concurrent nginx read never sees a torn file.
  copyFileSync(OUT, PUBLISH_TMP);
  renameSync(PUBLISH_TMP, PUBLISH_PATH);
  console.log(`published to ${PUBLISH_PATH} (live at oracle.slipgate.me/snapshots/ within ~5 min)`);
}

await closeDb();
