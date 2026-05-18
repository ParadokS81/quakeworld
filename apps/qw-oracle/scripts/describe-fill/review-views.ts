// scripts/describe-fill/review-views.ts
//
// KTX Phase-3 describe-fill review page generator.
//
// Emits one self-contained HTML file with two toggleable views:
//   "Catalog"  (default) -- all 625 KTX entities, bucketed, filterable.
//   "By Mode"  -- gameplay-cvar subset grouped by game mode (standalone + mutators).
//
// Pure read-only DB projection. No DB writes. No external network deps in
// the emitted HTML. Deterministic / idempotent -- two runs produce byte-identical
// output (no timestamps, ULIDs, or process-dependent values embedded in the HTML).
//
// Runtime: Bun. Entry point guarded by import.meta.main.
// DB access via postgres-js. DATABASE_URL env var (default: local dev container).
// ASCII-only in this file and in all emitted HTML (P5 from serialize-audit-review.ts).
// JSONB decoded by postgres-js to JS values; never JSON.parse on JSONB columns (P2).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONOREPO_ROOT = join(__dirname, '..', '..', '..', '..');

const DEFAULT_URL = 'postgresql://qworacle:dev@127.0.0.1:5432/qw_oracle';

const DEFAULT_OUTPUT_PATH = join(
  MONOREPO_ROOT,
  'apps', 'qw-oracle', 'output', 'describe-fill', 'ktx-review-views.html',
);

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

function makeSql() {
  return postgres(process.env.DATABASE_URL ?? DEFAULT_URL, { onnotice: () => {} });
}

// ---------------------------------------------------------------------------
// HTML escape (ASCII-safe; entity refs only for the five HTML-special chars)
// ---------------------------------------------------------------------------

function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Truncate a string for display with a visible ellipsis (ASCII).
function trunc(s: string | null | undefined, max: number): string {
  if (s == null) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + '...';
}

// ---------------------------------------------------------------------------
// DB row shapes
// ---------------------------------------------------------------------------

interface ProvenanceEntry {
  source_file?: string | null;
  source_line?: number | null;
  shipped_value?: string | null;
  raw_comment?: string | null;
}

interface EntityRow {
  canonical_id: string;
  name: string;
  type: string;
  description: string | null;
  description_origin: string | null;
  description_verdict: string | null;
  description_confidence: string | null;
  description_reasoning: string | null;
  description_provenance: ProvenanceEntry[] | null;
  description_proposed: string | null;
  source_state: string | null;
}

interface ModeRow {
  name: string;
  props_json: {
    mode_class: 'standalone' | 'mutator';
    user_facing_label: string;
    community_name?: string | null;
    game_type?: string | null;
    auto_reset_on_match?: boolean | null;
    init_mechanism?: string | null;
    activation_cvar?: string | null;
    initstring_ref?: string | null;
  };
}

interface ModeDefaultRow {
  name: string;            // the cvar being set
  value_text: string | null;
  value_numeric: number | null;
  props_json: {
    initstring_array: string;
    is_baseline: boolean;
    comment?: string | null;
    apply_order?: number | null;
  };
}

// ---------------------------------------------------------------------------
// Bucket classification -- deterministic keyword/regex ruleset.
// No LLM calls; this function is called at render time with no side effects.
// Buckets (exactly these labels; "Other / server config" is the fallback):
//   Game-mode & match flow
//   Mutators & rule variants
//   Weapons & combat
//   Movement & physics
//   Items, spawns & powerups
//   CTF
//   Fresh Teams
//   Bots
//   Demo & recording
//   Logging & stats
//   Admin, voting & moderation
//   Spectator & view
//   Timing & match state
//   Internal runtime state
//   Other / server config
//
// Priority order matters: rules are checked top-to-bottom; first match wins.
// ---------------------------------------------------------------------------

const BUCKET_NAMES = [
  'Game-mode & match flow',
  'Mutators & rule variants',
  'Weapons & combat',
  'Movement & physics',
  'Items, spawns & powerups',
  'CTF',
  'Fresh Teams',
  'Bots',
  'Demo & recording',
  'Logging & stats',
  'Admin, voting & moderation',
  'Spectator & view',
  'Timing & match state',
  'Internal runtime state',
  'Other / server config',
] as const;

type BucketName = typeof BUCKET_NAMES[number];

function assignBucket(name: string, _type: string, desc: string | null): BucketName {
  const n = name.toLowerCase();
  const d = (desc ?? '').toLowerCase();
  const nd = n + ' ' + d;

  // Internal runtime state: _ prefix is the definitive signal.
  if (n.startsWith('_')) return 'Internal runtime state';

  // CTF -- strong prefix match + keyword match before generic game-mode.
  if (
    n.startsWith('k_ctf') ||
    n === 'ctf' || n === 'mctf' || n === 'noga' || n === 'nohook' || n === 'norunes' ||
    n.startsWith('hook_') ||
    n === 'captain' || n === 'coach' || n === 'tossflag' || n === 'tossrune' ||
    n === 'flagstatus' || n === 'ctfbasedspawn' ||
    /\b(ctf\s*(mode|flag|rune|only|hook|spawn|ga\b|based|rune_)|grappl(e|ing)|grappling hook|capture.the.flag|flag carrier|ctf rune)\b/.test(d)
  ) return 'CTF';

  // Fresh Teams -- before weapon/items checks.
  if (
    n.startsWith('k_freshteams') ||
    /^(fresh|freshguns|freshpacks|freshtime)$/.test(n)
  ) return 'Fresh Teams';

  // Bots.
  if (
    n.includes(':frogbot') ||
    /\bfrogbot\b/.test(nd)
  ) return 'Bots';

  // Demo & recording.
  if (
    /^(demo_|trx_|demomark|dinfo|dlist|k_demo|k_demoname|k_demotxt|k_keepspec|k_on_end_f|race_dl_record)/.test(n) ||
    n === 'demo_scoreslength' ||
    /\b(demo recording|record.*demo|auto.?record|mvd file|write.*demo|recorded demo)\b/.test(d)
  ) return 'Demo & recording';

  // Race mode -- puts race_* commands and k_race* cvars in Game-mode bucket.
  if (
    /^race_/.test(n) ||
    n === 'race' ||
    n.startsWith('k_race')
  ) return 'Game-mode & match flow';

  // Logging & stats.
  if (
    /^(laststats|lastscores|lastscoresktx|stats)$/.test(n) ||
    n.startsWith('k_log') ||
    n === 'k_extralog_xsd_uri' ||
    n === 'k_use_matchless_dir' ||
    /\b(matchlog|score.*log|logging.*file|match.*log|log.*format|xsd.*uri|matchless.*dir)\b/.test(d)
  ) return 'Logging & stats';

  // Spectator & view.
  if (
    /\bfav_go$/.test(n) ||
    /^(auto_pow|autotrack|autotrackktx|cam|shownick|status1|status2)$/.test(n) ||
    /\b(spectator|spec\b|autotrack\b|point.of.view|spectate|spectating|spec.*view|track.*player|spectator.only|point of view|pov\b|spectator view|spectator.*track|track.*spectator)\b/.test(nd)
  ) return 'Spectator & view';

  // Game-mode & match flow.
  if (
    /^(1on1|2on2|3on3|4on4|10on10|2on2on2|3on3on3|4on4on4|xonx|blitz2v2|blitz4v4|ffa|tot|wipeout|carena|hoonymode|gamemodes|agree|rules|dm)$/.test(n) ||
    /^(k_mode|k_defmode|k_free_mode|k_allowed_free_modes|k_auto_xonx|k_lockmode|lockmode|k_hoonyrounds|roundsup|roundsdown|k_hoonymode|gamemodes)$/.test(n) ||
    /\b(switches the server (to|into)|applies.*(preset|ruleset|game.mode)|game.?mode preset|broadcast.*mode|mode.*broadcast|ruleset preset|game mode)\b/.test(d)
  ) return 'Game-mode & match flow';

  // Mutators & rule variants.
  if (
    /^(arena|berzerk|instagib|killquad|midair|lgc|nosweep|yawnmode|dmm1|dmm4|dmm4_invinc_time|noitems|coop_nm_pu|fragsup|teleportcap|speed)$/.test(n) ||
    /^(k_bzk|k_instagib|k_cg_kb|k_lgc|k_midair|k_nosweep|k_yawnmode|k_yawn|k_killquad|k_rocketarena|k_bloodfest|k_btime|k_noitems|k_nightmare_pu|k_freeze|tkfjump|tkrjump)$/.test(n) ||
    n === 'bloodfest' ||
    /\b(mutator|instagib mode|midair mode|lgc\b|nosweep|yawnmode|berzerk mode|killquad|rocket arena|freeze\b.*map|kill.fjump|kill.rjump)\b/.test(d)
  ) return 'Mutators & rule variants';

  // Weapons & combat.
  if (
    /\b(weapon|rocket|grenade|railgun|nailgun|lightning gun|shaft|axe|ammo\b|damage|frag(s)?\b|combat|pellet|shotgun|vwep|visible weapons)\b/.test(nd)
  ) return 'Weapons & combat';

  // Movement & physics.
  if (
    /\b(movement|physics|velocity|friction|jump|fly\b|water|bunny|strafe|accel|gravity|airstep|airspeed|swim)\b/.test(nd)
  ) return 'Movement & physics';

  // Items, spawns & powerups.
  if (
    /^(dq|dr|dp|add_q_aerowalk|dropitem|droppack|giveme)$/.test(n) ||
    /^(k_clan_arena_max_respawns|k_clan_arena_rounds|k_pow|k_pow_check_time)$/.test(n) ||
    /\b(spawn(ing|point|ed)?|item\b|powerup|power.up|quad damage|pentagram|ring of shadows|backpack|mega.*health|health pack|armor|weapon.*respawn|respawn.*time|powerups)\b/.test(nd)
  ) return 'Items, spawns & powerups';

  // Admin, voting & moderation.
  if (
    /^(admin|ban|banip|banrem|elect|no|yes|whovote|lockmap|pickup|rpickup|votecoop|voteprivate|nospecs|swapall|antilag|suggestcolor)$/.test(n) ||
    /^(k_admincode|k_admins|k_allowvoteadmin|k_allowklist|toggleklist|votemap|k_lockmap|k_no_vote_map|k_privategame|k_privategame_voteable|k_vp_suggestcolor)$/.test(n) ||
    /^(k_vp_|k_cmd_fp|k_allowcountchange|k_exclusive|k_ann|k_teamoverlay|teamoverlay)/.test(n) ||
    /\b(admin|vote|kick\b|ban\b|rcon|cheat|flood.protect|access control|permission tier|grant.*read|moderat|flood protection|command flood)\b/.test(d)
  ) return 'Admin, voting & moderation';

  // Timing & match state.
  if (
    /^(ready|break|k_pause_without_matchtag|k_maxclients|k_overtime|k_exttime|fragsup)$/.test(n) ||
    n === 'timing_players_time' || n === 'k_membercount' || n === 'maxfps' ||
    n === 'latejoin' || n === 'k_spectalk' || n === 'k_sayteam_to_spec' ||
    /\b(timer|countdown|overtime|timelimit|time.limit|warmup|halftime|match.start|match.*time|pre.match|waitmatch|ready\b|intermission|fraglimit|lagged.*player|timing.*out|lagging)\b/.test(d)
  ) return 'Timing & match state';

  // Internal runtime state (broader catch for described-as-internal rows).
  if (
    /\binternal.*(state|store|cvar|write cursor|counter|carry)\b/.test(d)
  ) return 'Internal runtime state';

  return 'Other / server config';
}

// ---------------------------------------------------------------------------
// initstring_array -> mode name mapping (spec-defined; exact).
// ---------------------------------------------------------------------------

// Hoonymode has three initstring variants (team sizes). Returns an array
// because they all map to the same mode (hoonymode).
function initstringToMode(ia: string): string[] {
  if (ia === 'common_um_init') return ['__baseline__'];
  if (ia === '_1on1hm_um_init') return ['hoonymode'];
  if (ia === '_2on2hm_um_init') return ['hoonymode'];
  if (ia === '_4on4hm_um_init') return ['hoonymode'];
  // Strip leading optional _, strip trailing _um_init, special-case carena->ca
  const stripped = ia.replace(/^_/, '').replace(/_um_init$/, '');
  if (stripped === 'carena') return ['ca'];
  // Direct name match for the rest
  return [stripped];
}

// For display: given initstring_array, return a human-readable mode size hint
// for the hoonymode variants.
function hoonyModeSizeLabel(ia: string): string | null {
  if (ia === '_1on1hm_um_init') return '1on1';
  if (ia === '_2on2hm_um_init') return '2on2';
  if (ia === '_4on4hm_um_init') return '4on4';
  return null;
}

// ---------------------------------------------------------------------------
// Conflict detection: heuristic flag for rows where the raw source comment
// materially differs from our description (signals "operator should review").
// Uses a very simple approach: if there IS a raw_comment and both are non-trivial
// (> 5 chars), check if the first ~50 chars of the raw_comment appear anywhere
// in the description (case-insensitive). If not, mark as potentially conflicting.
// ---------------------------------------------------------------------------

function hasApparentConflict(row: EntityRow): boolean {
  if (!Array.isArray(row.description_provenance) || !row.description) return false;
  for (const entry of row.description_provenance) {
    const rawComment = entry.raw_comment;
    if (!rawComment || rawComment.length < 6) continue;
    // Take first meaningful phrase (up to 30 chars) from raw_comment
    const probe = rawComment.slice(0, 30).toLowerCase().trim();
    if (probe.length < 6) continue;
    // If the probe does not appear in the description, flag it.
    if (!row.description.toLowerCase().includes(probe)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Shipped/source text for display (raw_comment + shipped_value from provenance)
// ---------------------------------------------------------------------------

function renderProvenanceShort(provenance: ProvenanceEntry[] | null): string {
  if (!Array.isArray(provenance) || provenance.length === 0) return '<em class="none">none</em>';
  const parts: string[] = [];
  for (const entry of provenance) {
    const rc = entry.raw_comment ? esc(entry.raw_comment) : null;
    const sv = entry.shipped_value != null ? `<span class="prov-val">(shipped: ${esc(entry.shipped_value)})</span>` : '';
    const file = entry.source_file ? `<span class="prov-file">${esc(entry.source_file)}${entry.source_line != null ? ':' + entry.source_line : ''}</span>` : '';
    if (rc) {
      parts.push(`<div class="prov-entry">${file}${sv}<span class="prov-comment">${rc}</span></div>`);
    } else if (sv) {
      parts.push(`<div class="prov-entry">${file}${sv}</div>`);
    }
  }
  return parts.length > 0 ? parts.join('') : '<em class="none">none</em>';
}

// ---------------------------------------------------------------------------
// Verdict badge HTML
// ---------------------------------------------------------------------------

function verdictBadge(verdict: string | null): string {
  const v = verdict ?? 'unknown';
  return `<span class="vbadge vbadge-${esc(v.replace(/_/g, '-'))}">${esc(v)}</span>`;
}

function originBadge(origin: string | null): string {
  if (!origin) return '';
  return `<span class="obadge">${esc(origin)}</span>`;
}

function confidenceBadge(conf: string | null): string {
  if (!conf) return '';
  return `<span class="cbadge cbadge-${esc(conf)}">${esc(conf)}</span>`;
}

// ---------------------------------------------------------------------------
// Catalog view -- all 625 rows, bucketed.
// ---------------------------------------------------------------------------

function renderCatalogView(
  rows: EntityRow[],
  // Map from canonical_id to list of mode names (for mode tags on cvars)
  entityModeTags: Map<string, string[]>,
  // Set of canonical_ids in common_um_init (shared baseline)
  baselineEntityIds: Set<string>,
): string {
  // Assign buckets
  const bucketed = new Map<BucketName, EntityRow[]>();
  for (const b of BUCKET_NAMES) bucketed.set(b, []);

  for (const row of rows) {
    const b = assignBucket(row.name, row.type, row.description);
    bucketed.get(b)!.push(row);
  }

  // Sort within each bucket by name (case-insensitive)
  for (const [, arr] of bucketed) {
    arr.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }

  // Sort buckets by count descending
  const sortedBuckets = [...bucketed.entries()]
    .sort((a, b) => b[1].length - a[1].length);

  // Build anchors: canonical_id -> anchor string
  const anchorOf = (row: EntityRow) => `c-${esc(row.canonical_id)}`;

  const bucketHtml = sortedBuckets.map(([bucketName, bucketRows]) => {
    if (bucketRows.length === 0) return '';

    const rowsHtml = bucketRows.map(row => {
      const conflict = hasApparentConflict(row);
      const isHedged = row.description_verdict === 'hedged';
      const highlight = (isHedged || conflict) ? ' row-highlight' : '';

      // Mode tags for cvars
      const tags = entityModeTags.get(row.canonical_id) ?? [];
      const isBaseline = baselineEntityIds.has(row.canonical_id);
      const modeTagHtml = row.type === 'cvar' ? renderModeTags(tags, isBaseline) : '';

      const provHtml = renderProvenanceShort(row.description_provenance);
      const descHtml = row.description ? `<span class="desc-text">${esc(row.description)}</span>` : `<em class="none">none</em>`;
      const reasoningHtml = row.description_reasoning
        ? `<details class="reasoning-details"><summary>reasoning</summary><div class="reasoning-body">${esc(row.description_reasoning)}</div></details>`
        : '';

      return `<div id="${anchorOf(row)}" class="entity-row${highlight}" data-verdict="${esc(row.description_verdict ?? '')}" data-name="${esc(row.name.toLowerCase())}">
  <div class="row-head">
    <span class="ename">${esc(row.name)}</span>
    <span class="etype">${esc(row.type)}</span>
    ${verdictBadge(row.description_verdict)}
    ${originBadge(row.description_origin)}
    ${confidenceBadge(row.description_confidence)}
    ${isHedged ? '<span class="flag-hedged">hedged</span>' : ''}
    ${conflict ? '<span class="flag-conflict">check source</span>' : ''}
    ${modeTagHtml}
  </div>
  <div class="row-body">
    <div class="row-field"><span class="field-label">Shipped/source:</span> ${provHtml}</div>
    <div class="row-field"><span class="field-label">Description:</span> ${descHtml}</div>
    ${reasoningHtml}
  </div>
</div>`;
    }).join('\n');

    return `<details class="bucket-section" open>
  <summary class="bucket-header" data-bucket="${esc(bucketName)}">
    <span class="bucket-name">${esc(bucketName)}</span>
    <span class="bucket-count" data-count="${bucketRows.length}">${bucketRows.length}</span>
  </summary>
  <div class="bucket-body">
${rowsHtml}
  </div>
</details>`;
  }).join('\n');

  return `<div id="view-catalog" class="view-panel" data-total="${rows.length}">
<div class="catalog-controls sticky-bar">
  <label>Verdict: <select id="filter-verdict"><option value="">all verdicts</option><option value="synthesized">synthesized</option><option value="affirmed">affirmed</option><option value="hedged">hedged</option><option value="dead_stamped">dead_stamped</option><option value="residue_routed">residue_routed</option></select></label>
  <label>Name: <input type="text" id="filter-name" placeholder="substring..." autocomplete="off"></label>
  <span id="catalog-count" class="count-display">${rows.length} / ${rows.length}</span>
</div>
<div id="catalog-body">
${bucketHtml}
</div>
</div>`;
}

// Mode tags for a cvar row (chips)
function renderModeTags(modes: string[], isBaseline: boolean): string {
  if (modes.length === 0 && !isBaseline) return '';
  const chips: string[] = [];
  if (isBaseline) chips.push(`<span class="mtag mtag-baseline">shared baseline</span>`);
  if (modes.length > 0) {
    const preview = modes.slice(0, 3).map(m => `<span class="mtag">${esc(m)}</span>`).join('');
    const extra = modes.length > 3 ? `<span class="mtag mtag-more">+${modes.length - 3} more</span>` : '';
    chips.push(preview + extra);
  }
  return `<span class="mode-tags">${chips.join('')}</span>`;
}

// ---------------------------------------------------------------------------
// By-Mode view
// ---------------------------------------------------------------------------

function renderByModeView(
  modes: ModeRow[],
  modeDefaults: ModeDefaultRow[],
  entities: EntityRow[],
  anchorPrefix: string, // 'c-' prefix for Catalog links
): string {
  // Build entity lookup: name (lower) -> row
  const entityByName = new Map<string, EntityRow>();
  for (const e of entities) entityByName.set(e.name.toLowerCase(), e);
  const entityByCanonicalId = new Map<string, EntityRow>();
  for (const e of entities) entityByCanonicalId.set(e.canonical_id, e);

  // Group mode_defaults by initstring_array
  const defaultsByInit = new Map<string, ModeDefaultRow[]>();
  for (const md of modeDefaults) {
    const ia = md.props_json.initstring_array;
    if (!defaultsByInit.has(ia)) defaultsByInit.set(ia, []);
    defaultsByInit.get(ia)!.push(md);
  }

  // Sort within each initstring group by name
  for (const [, arr] of defaultsByInit) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Baseline (common_um_init) set
  const baselineDefaults = (defaultsByInit.get('common_um_init') ?? []).sort((a, b) => a.name.localeCompare(b.name));

  // Split modes
  const standalones = modes
    .filter(m => m.props_json.mode_class === 'standalone')
    .sort((a, b) => a.props_json.user_facing_label.localeCompare(b.props_json.user_facing_label));
  const mutators = modes
    .filter(m => m.props_json.mode_class === 'mutator')
    .sort((a, b) => a.props_json.user_facing_label.localeCompare(b.props_json.user_facing_label));

  // Render a cvar line in By-Mode view
  function renderModeDefaultLine(md: ModeDefaultRow): string {
    const val = md.value_text != null ? md.value_text : (md.value_numeric != null ? String(md.value_numeric) : '?');
    const comment = md.props_json.comment ? ` <span class="md-comment">${esc(md.props_json.comment)}</span>` : '';
    const entity = entityByName.get(md.name.toLowerCase());
    const anchor = entity ? `c-${esc(entity.canonical_id)}` : '';
    const nameHtml = anchor
      ? `<a href="#${anchor}" class="md-cvar-link" title="Jump to Catalog entry">${esc(md.name)}</a>`
      : `<span class="md-cvar">${esc(md.name)}</span>`;
    const descSnippet = entity?.description ? ` <span class="md-desc">${esc(trunc(entity.description, 140))}</span>` : '';
    return `<div class="md-row">${nameHtml} <span class="md-val">${esc(val)}</span>${comment}${descSnippet}</div>`;
  }

  // Shared baseline block (rendered ONCE, referenced by standalone modes)
  const baselineBlockHtml = `<details id="shared-baseline" class="baseline-block">
  <summary class="baseline-summary">Shared baseline (common_um_init) -- ${baselineDefaults.length} cvars applied to all um_init_string standalone modes</summary>
  <div class="baseline-body">
${baselineDefaults.map(renderModeDefaultLine).join('\n')}
  </div>
</details>`;

  // Render a standalone mode card
  function renderStandaloneCard(mode: ModeRow): string {
    const p = mode.props_json;
    const autoreset = p.auto_reset_on_match ? `<span class="badge badge-autoreset">auto-reset on match</span>` : '';
    const gameType = p.game_type ? `<span class="badge">${esc(p.game_type)}</span>` : '';

    // Find signature defaults (those whose initstring_array maps to this mode)
    const sigDefaults: ModeDefaultRow[] = [];
    // Also collect hoonymode size labels for this mode
    const hoonyLabels: Map<string, string> = new Map(); // name -> label
    for (const [ia, rows] of defaultsByInit) {
      const targets = initstringToMode(ia);
      if (targets.includes(mode.name) || targets.includes('__baseline__')) continue;
      if (!targets.includes(mode.name)) continue;
      for (const row of rows) sigDefaults.push(row);
      const sizeLabel = hoonyModeSizeLabel(ia);
      if (sizeLabel) {
        for (const row of rows) hoonyLabels.set(row.name, sizeLabel);
      }
    }
    sigDefaults.sort((a, b) => a.name.localeCompare(b.name));

    // Also collect hoonymode size buckets if this is hoonymode
    const hoonyBuckets: Map<string, ModeDefaultRow[]> = new Map();
    if (mode.name === 'hoonymode') {
      for (const [ia, rows] of defaultsByInit) {
        const sizeLabel = hoonyModeSizeLabel(ia);
        if (sizeLabel) {
          hoonyBuckets.set(sizeLabel, [...rows].sort((a, b) => a.name.localeCompare(b.name)));
        }
      }
    }

    const sigHtml = mode.name === 'hoonymode' && hoonyBuckets.size > 0
      ? [...hoonyBuckets.entries()].map(([label, rows]) =>
          `<div class="sig-subgroup"><div class="sig-subgroup-label">Signature (${esc(label)} variant)</div>${rows.map(renderModeDefaultLine).join('\n')}</div>`
        ).join('\n')
      : (sigDefaults.length > 0
          ? sigDefaults.map(renderModeDefaultLine).join('\n')
          : `<div class="none-text">No signature-only init (all defaults are baseline)</div>`);

    const hasBaselineRef = p.init_mechanism === 'um_init_string';
    const baselineRef = hasBaselineRef
      ? `<div class="baseline-ref"><a href="#shared-baseline">Baseline (common_um_init) -- ${baselineDefaults.length} shared cvars</a> -- see the shared baseline block above.</div>`
      : '';

    return `<div class="mode-card">
  <div class="mode-card-head">
    <span class="mode-label">${esc(p.user_facing_label)}</span>
    <span class="mode-name-raw">${esc(mode.name)}</span>
    ${gameType}${autoreset}
    <span class="badge badge-class">${esc(p.mode_class)}</span>
  </div>
  <div class="mode-card-body">
    <details class="mode-sig-section" open>
      <summary>Signature (this mode's own init) -- ${sigDefaults.length} cvars</summary>
      <div class="sig-body">
${sigHtml}
      </div>
    </details>
    ${baselineRef}
  </div>
</div>`;
  }

  // Render a mutator card (cvar-toggle; best-effort listing)
  function renderMutatorCard(mode: ModeRow): string {
    const p = mode.props_json;
    const autoreset = p.auto_reset_on_match ? `<span class="badge badge-autoreset">auto-reset on match</span>` : '';
    const gameType = p.game_type ? `<span class="badge">${esc(p.game_type)}</span>` : '';
    const activCvar = p.activation_cvar ?? '';

    // Best-effort: entities whose name or description mentions this mode (case-insensitive)
    // Plus the activation_cvar entity itself.
    const modeLower = mode.name.toLowerCase();
    const labelLower = p.user_facing_label.toLowerCase();
    const activCvarLower = activCvar.toLowerCase();

    const related = entities.filter(e => {
      if (activCvar && e.name.toLowerCase() === activCvarLower) return true;
      const combined = (e.name + ' ' + (e.description ?? '')).toLowerCase();
      return combined.includes(modeLower) || (labelLower.length > 3 && combined.includes(labelLower));
    }).sort((a, b) => a.name.localeCompare(b.name));

    const relatedHtml = related.map(e => {
      const anchor = `c-${esc(e.canonical_id)}`;
      const descSnippet = e.description ? ` <span class="md-desc">${esc(trunc(e.description, 140))}</span>` : '';
      const activFlag = activCvar && e.name.toLowerCase() === activCvarLower ? `<span class="badge badge-activ">activation cvar</span>` : '';
      return `<div class="md-row"><a href="#${anchor}" class="md-cvar-link">${esc(e.name)}</a> <span class="etype">${esc(e.type)}</span>${activFlag}${descSnippet}</div>`;
    }).join('\n');

    return `<div class="mode-card mode-card-mutator">
  <div class="mode-card-head">
    <span class="mode-label">${esc(p.user_facing_label)}</span>
    <span class="mode-name-raw">${esc(mode.name)}</span>
    ${gameType}${autoreset}
    <span class="badge badge-class">${esc(p.mode_class)}</span>
    ${activCvar ? `<span class="badge badge-activ-cvar">activation: <span class="ename">${esc(activCvar)}</span></span>` : ''}
  </div>
  <div class="mode-card-body">
    <div class="mutator-banner">association by activation cvar + description mention -- NOT a source-exhaustive list</div>
    <div class="mutator-related">
${relatedHtml}
    </div>
  </div>
</div>`;
  }

  const standaloneHtml = standalones.map(renderStandaloneCard).join('\n');
  const mutatorHtml = mutators.map(renderMutatorCard).join('\n');

  return `<div id="view-by-mode" class="view-panel" style="display:none">
<div class="mode-intro">
  <p>Init-string modes have exact source-extracted cvar lists. Cvar-toggle mutators
  (instagib, freshteams, berzerk, killquad, midair, lgc, nosweep, yawnmode, bloodfest, race)
  are activated by a cvar; their listing is best-effort, not source-exhaustive.
  Commands, admin, demo, logging, and internal knobs are not mode-controlled and live
  only in the Catalog view.</p>
</div>
${baselineBlockHtml}
<div class="mode-section-header">Standalone modes (${standalones.length})</div>
${standaloneHtml}
<div class="mode-section-header">Mutators (${mutators.length})</div>
${mutatorHtml}
</div>`;
}

// ---------------------------------------------------------------------------
// Full page renderer
// ---------------------------------------------------------------------------

export function renderPage(
  entities: EntityRow[],
  modes: ModeRow[],
  modeDefaults: ModeDefaultRow[],
): string {
  const totalEntities = entities.length;

  // Build mode tag index: entity canonical_id -> list of mode names
  // Also build baseline set
  const entityModeTags = new Map<string, string[]>();
  const baselineEntityIds = new Set<string>();
  const entityByNameLower = new Map<string, EntityRow>();
  for (const e of entities) entityByNameLower.set(e.name.toLowerCase(), e);

  for (const md of modeDefaults) {
    const entity = entityByNameLower.get(md.name.toLowerCase());
    if (!entity) continue;
    const ia = md.props_json.initstring_array;
    if (ia === 'common_um_init') {
      baselineEntityIds.add(entity.canonical_id);
    } else {
      const targets = initstringToMode(ia);
      for (const target of targets) {
        if (target === '__baseline__') continue;
        const existing = entityModeTags.get(entity.canonical_id) ?? [];
        if (!existing.includes(target)) existing.push(target);
        entityModeTags.set(entity.canonical_id, existing);
      }
    }
  }

  const catalogHtml = renderCatalogView(entities, entityModeTags, baselineEntityIds);
  const byModeHtml = renderByModeView(modes, modeDefaults, entities, 'c-');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KTX Phase-3 describe-fill review</title>
<style>
/* KTX Phase-3 describe-fill review page -- ASCII only */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; font-size: 13px; background: #1a1a1a; color: #e0e0e0; }

/* --- Top bar --- */
.top-bar {
  position: sticky; top: 0; z-index: 100;
  background: #222; border-bottom: 2px solid #444;
  padding: 8px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
}
.top-bar h1 { font-size: 14px; color: #c8c8c8; flex-shrink: 0; }
.view-tabs { display: flex; gap: 6px; }
.view-tab {
  padding: 4px 14px; border: 1px solid #555; background: #333; color: #bbb;
  cursor: pointer; border-radius: 3px; font-size: 12px; font-family: inherit;
}
.view-tab.active { background: #4a7a4a; border-color: #6a9a6a; color: #e8ffe8; }
.view-tab:hover:not(.active) { background: #3a3a3a; }

/* --- Catalog controls bar (sticky within catalog view, but below top bar) --- */
.sticky-bar {
  position: sticky; top: 44px; z-index: 90;
  background: #252525; border-bottom: 1px solid #444;
  padding: 6px 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.sticky-bar label { color: #aaa; font-size: 11px; display: flex; align-items: center; gap: 4px; }
.sticky-bar select, .sticky-bar input {
  background: #333; color: #ddd; border: 1px solid #555;
  padding: 3px 6px; font-family: monospace; font-size: 12px; border-radius: 2px;
}
.sticky-bar input[type=text] { width: 200px; }
.count-display { margin-left: auto; color: #888; font-size: 11px; }

/* --- Bucket sections --- */
.bucket-section { border-bottom: 2px solid #333; margin-bottom: 2px; }
.bucket-header {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px; background: #2a2a2a;
  cursor: pointer; list-style: none; font-size: 13px;
  border-left: 4px solid #555;
}
.bucket-header:hover { background: #333; }
.bucket-name { font-weight: bold; color: #d8d8d8; }
.bucket-count {
  background: #444; color: #aaa; padding: 1px 7px;
  border-radius: 10px; font-size: 11px;
}
.bucket-body { padding: 0 0 8px 0; }

/* --- Entity row --- */
.entity-row {
  padding: 8px 16px 6px 20px;
  border-bottom: 1px solid #252525;
  border-left: 3px solid transparent;
}
.entity-row:hover { background: #1f1f1f; }
.entity-row.row-hidden { display: none; }
.entity-row.row-highlight { border-left-color: #d87070; background: #211a1a; }

.row-head {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-bottom: 5px;
}
.ename { font-family: monospace; font-weight: bold; font-size: 13px; color: #e8e8e8; }
.etype { font-size: 11px; color: #888; background: #333; padding: 1px 5px; border-radius: 2px; }

/* --- Verdict / origin / confidence badges --- */
.vbadge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: bold; }
.vbadge-synthesized { background: #1a2a3a; color: #6a9fd8; border: 1px solid #2d5580; }
.vbadge-affirmed { background: #1a3a1a; color: #6dbe6d; border: 1px solid #2d6b2d; }
.vbadge-hedged { background: #3a2a1a; color: #d8b470; border: 1px solid #806030; }
.vbadge-dead-stamped { background: #3a1a1a; color: #d87070; border: 1px solid #802d2d; }
.vbadge-residue-routed { background: #2a1a3a; color: #b47ad8; border: 1px solid #5a2d80; }
.vbadge-unknown { background: #3a3a1a; color: #c8c870; border: 1px solid #7a7a30; }

.obadge { font-size: 10px; color: #999; background: #2a2a2a; padding: 1px 5px; border-radius: 2px; border: 1px solid #444; }
.cbadge { font-size: 10px; padding: 1px 5px; border-radius: 2px; }
.cbadge-high { background: #1a3a1a; color: #7ad87a; }
.cbadge-medium { background: #2a2a1a; color: #c8c870; }
.cbadge-low { background: #3a1a1a; color: #d87070; }

.flag-hedged { font-size: 10px; background: #3a2a1a; color: #d8b470; padding: 1px 6px; border-radius: 2px; border: 1px solid #806030; }
.flag-conflict { font-size: 10px; background: #3a1a1a; color: #d87070; padding: 1px 6px; border-radius: 2px; border: 1px solid #802d2d; }

/* --- Mode tags on cvar rows --- */
.mode-tags { display: inline-flex; gap: 3px; flex-wrap: wrap; align-items: center; }
.mtag { font-size: 10px; background: #1a2a3a; color: #7ab0d8; padding: 1px 5px; border-radius: 2px; border: 1px solid #2d5580; }
.mtag-baseline { background: #2a1a3a; color: #b47ad8; border-color: #5a2d80; }
.mtag-more { background: #333; color: #888; }

/* --- Row body (before/after/reasoning) --- */
.row-body { padding-left: 4px; }
.row-field { margin-bottom: 4px; font-size: 12px; }
.field-label { font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
.prov-entry { display: inline; }
.prov-file { font-size: 10px; color: #666; margin-right: 4px; font-family: monospace; }
.prov-val { font-size: 10px; color: #888; margin-right: 4px; }
.prov-comment { color: #bbb; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
.desc-text { color: #c8e6b8; font-size: 12px; font-family: monospace; white-space: pre-wrap; }
.none { color: #555; font-style: italic; }
.none-text { color: #555; font-style: italic; font-size: 11px; padding: 4px 8px; }

.reasoning-details { margin-top: 4px; }
.reasoning-details summary { font-size: 10px; color: #888; cursor: pointer; }
.reasoning-body { font-size: 11px; color: #d8cc9a; background: #252010; padding: 6px 8px; margin-top: 4px; white-space: pre-wrap; font-family: monospace; }

/* --- By-Mode view --- */
.mode-intro { padding: 10px 16px; background: #222; border-bottom: 1px solid #333; font-size: 12px; color: #aaa; line-height: 1.5; }
.mode-intro p { max-width: 900px; }

.baseline-block { margin: 8px 16px; border: 1px solid #3a3a3a; border-radius: 3px; }
.baseline-summary { padding: 8px 12px; cursor: pointer; font-size: 12px; color: #b47ad8; background: #1e1a2a; list-style: none; }
.baseline-summary:hover { background: #252030; }
.baseline-body { padding: 4px 8px; max-height: 400px; overflow-y: auto; }

.mode-section-header {
  padding: 10px 16px 6px; font-size: 13px; font-weight: bold;
  color: #c8c8c8; border-bottom: 2px solid #444; margin-top: 8px;
}

.mode-card {
  margin: 8px 16px; border: 1px solid #2a2a2a; border-radius: 3px;
  background: #1e1e1e;
}
.mode-card-mutator { border-color: #2a1a3a; }

.mode-card-head {
  padding: 8px 12px; display: flex; align-items: center; gap: 8px;
  flex-wrap: wrap; background: #252525; border-radius: 3px 3px 0 0;
  border-bottom: 1px solid #333;
}
.mode-label { font-weight: bold; font-size: 13px; color: #e8e8e8; }
.mode-name-raw { font-family: monospace; font-size: 11px; color: #888; }
.badge { font-size: 10px; padding: 1px 6px; border-radius: 2px; background: #333; color: #aaa; border: 1px solid #444; }
.badge-class { background: #1a2a1a; color: #6dbe6d; border-color: #2d6b2d; }
.badge-autoreset { background: #2a1a3a; color: #b47ad8; border-color: #5a2d80; }
.badge-activ { background: #1a2a3a; color: #6a9fd8; border-color: #2d5580; font-size: 10px; }
.badge-activ-cvar { background: #2a2a1a; color: #c8c870; border-color: #7a7a30; font-size: 10px; }

.mode-card-body { padding: 8px 12px; }

.mode-sig-section { margin-bottom: 6px; }
.mode-sig-section summary { font-size: 11px; color: #aaa; cursor: pointer; padding: 3px 0; }
.sig-body { padding: 4px 8px; }
.sig-subgroup { margin-bottom: 8px; }
.sig-subgroup-label { font-size: 10px; color: #888; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; }

.baseline-ref { font-size: 11px; color: #888; margin-top: 4px; }
.baseline-ref a { color: #b47ad8; text-decoration: none; }
.baseline-ref a:hover { text-decoration: underline; }

.mutator-banner {
  font-size: 11px; color: #d8b470; background: #251a00; padding: 5px 8px;
  border: 1px solid #5a3a00; border-radius: 2px; margin-bottom: 6px;
}
.mutator-related { padding: 2px 0; }

.md-row { padding: 3px 0; font-size: 12px; border-bottom: 1px solid #252525; display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px; }
.md-cvar { font-family: monospace; color: #c8c8c8; }
.md-cvar-link { font-family: monospace; color: #7ab0d8; text-decoration: none; }
.md-cvar-link:hover { text-decoration: underline; }
.md-val { font-family: monospace; color: #c8e6b8; background: #1a2a1a; padding: 1px 5px; border-radius: 2px; font-size: 11px; }
.md-comment { font-size: 10px; color: #888; font-style: italic; }
.md-desc { color: #a8a8a8; font-size: 11px; max-width: 600px; }
</style>
</head>
<body>
<div class="top-bar">
  <h1>KTX Phase-3 describe-fill review -- ${totalEntities} entities</h1>
  <div class="view-tabs">
    <button class="view-tab active" data-view="catalog">Catalog (${totalEntities})</button>
    <button class="view-tab" data-view="by-mode">By Mode</button>
  </div>
</div>
${catalogHtml}
${byModeHtml}
<script>
(function() {
  // View toggle
  var tabs = document.querySelectorAll('.view-tab');
  var panels = document.querySelectorAll('.view-panel');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var targetView = tab.getAttribute('data-view');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      panels.forEach(function(p) {
        p.style.display = p.id === 'view-' + targetView ? '' : 'none';
      });
    });
  });

  // Catalog filter
  var filterVerdict = document.getElementById('filter-verdict');
  var filterName = document.getElementById('filter-name');
  var countDisplay = document.getElementById('catalog-count');
  var total = parseInt(document.getElementById('view-catalog').getAttribute('data-total'), 10);

  function applyFilter() {
    var vf = filterVerdict ? filterVerdict.value : '';
    var nf = filterName ? filterName.value.toLowerCase() : '';
    var rows = document.querySelectorAll('.entity-row');
    var visible = 0;
    rows.forEach(function(row) {
      var verdict = row.getAttribute('data-verdict');
      var name = row.getAttribute('data-name');
      var show = (!vf || verdict === vf) && (!nf || (name && name.indexOf(nf) !== -1));
      if (show) { row.classList.remove('row-hidden'); visible++; }
      else { row.classList.add('row-hidden'); }
    });
    // Update bucket counts in headers
    var buckets = document.querySelectorAll('.bucket-section');
    buckets.forEach(function(bucket) {
      var brows = bucket.querySelectorAll('.entity-row');
      var bvis = 0;
      brows.forEach(function(r) { if (!r.classList.contains('row-hidden')) bvis++; });
      var countEl = bucket.querySelector('.bucket-count');
      if (countEl) countEl.textContent = bvis + ' / ' + countEl.getAttribute('data-count');
    });
    if (countDisplay) countDisplay.textContent = visible + ' / ' + total;
  }

  if (filterVerdict) filterVerdict.addEventListener('change', applyFilter);
  if (filterName) filterName.addEventListener('input', applyFilter);
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// DB queries
// ---------------------------------------------------------------------------

async function fetchEntities(sql: ReturnType<typeof postgres>): Promise<EntityRow[]> {
  const rows = await sql<EntityRow[]>`
    SELECT
      canonical_id,
      name,
      type,
      description,
      description_origin,
      description_verdict,
      description_confidence,
      description_reasoning,
      description_provenance,
      description_proposed,
      source_state
    FROM entities
    WHERE project = 'ktx'
      AND type IN ('cvar', 'command', 'info_key')
    ORDER BY name
  `;
  return rows;
}

async function fetchModes(sql: ReturnType<typeof postgres>): Promise<ModeRow[]> {
  const rows = await sql<ModeRow[]>`
    SELECT name, props_json
    FROM gameplay_mechanics
    WHERE kind = 'game_mode'
    ORDER BY name
  `;
  return rows;
}

async function fetchModeDefaults(sql: ReturnType<typeof postgres>): Promise<ModeDefaultRow[]> {
  const rows = await sql<ModeDefaultRow[]>`
    SELECT name, value_text, value_numeric, props_json
    FROM gameplay_mechanics
    WHERE kind = 'mode_default'
    ORDER BY props_json->>'initstring_array', name
  `;
  return rows;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const sql = makeSql();

  try {
    console.log('review-views: fetching entities...');
    const entities = await fetchEntities(sql);
    console.log(`review-views: ${entities.length} entities`);

    console.log('review-views: fetching modes...');
    const modes = await fetchModes(sql);
    console.log(`review-views: ${modes.length} modes`);

    console.log('review-views: fetching mode_defaults...');
    const modeDefaults = await fetchModeDefaults(sql);
    console.log(`review-views: ${modeDefaults.length} mode_defaults`);

    const html = renderPage(entities, modes, modeDefaults);

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, html, 'utf-8');

    console.log(`review-views: wrote ${html.length} bytes -> ${outputPath}`);

    // Self-verify: print bucket distribution
    const buckets = new Map<string, number>();
    for (const e of entities) {
      const b = assignBucket(e.name, e.type, e.description);
      buckets.set(b, (buckets.get(b) ?? 0) + 1);
    }
    const total = entities.length;
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    console.log('\nBucket distribution:');
    for (const [name, count] of sorted) {
      console.log(`  ${count.toString().padStart(4)}  ${name}`);
    }
    const otherCount = buckets.get('Other / server config') ?? 0;
    console.log(`\nOther %: ${(otherCount / total * 100).toFixed(1)}%  (${otherCount}/${total})`);
    console.log(`Total entities in buckets: ${[...buckets.values()].reduce((a, b) => a + b, 0)} (should be ${total})`);

  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error('review-views error:', err);
    process.exit(1);
  });
}
