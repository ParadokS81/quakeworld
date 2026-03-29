#!/usr/bin/env node
/**
 * QW 4on4 Stats - Filtered to competitive 4on4 games only
 * Run: node scripts/stats-4on4.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'qw-stats.db');
const db = new Database(DB_PATH, { readonly: true });

// Competitive 4on4 maps
const COMP_MAPS = ['dm2', 'dm3', 'e1m2', 'schloss', 'phantombase'];
const MAP_FILTER = COMP_MAPS.map(m => `'${m}'`).join(',');

// Filter: 8 players, team mode, competitive maps
const GAME_FILTER = `
    g.player_count = 8
    AND g.mode = 'team'
    AND g.map IN (${MAP_FILTER})
    AND g.duration >= 600
`;

// Min games for ranking
const MIN_GAMES = 15;

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  QW 4on4 COMPETITIVE STATS');
console.log(`  Maps: ${COMP_MAPS.join(', ')}`);
console.log(`  Filter: 8 players, team mode, duration >= 10 min`);
console.log('══════════════════════════════════════════════════════════════════════\n');

// ─── OVERVIEW ──────────────────────────────────────────────────────
const gameCount = db.prepare(`SELECT COUNT(*) as c FROM games g WHERE ${GAME_FILTER}`).get().c;
const clanGames = db.prepare(`SELECT COUNT(*) as c FROM games g WHERE ${GAME_FILTER} AND g.is_clan_game = 1`).get().c;
const uniquePlayers = db.prepare(`
    SELECT COUNT(DISTINCT gp.player_name_normalized) as c
    FROM game_players gp JOIN games g ON g.id = gp.game_id
    WHERE ${GAME_FILTER} AND gp.player_name_normalized != ''
`).get().c;

const dateRange = db.prepare(`SELECT MIN(g.date) as earliest, MAX(g.date) as latest FROM games g WHERE ${GAME_FILTER}`).get();

console.log(`4on4 competitive games: ${gameCount}`);
console.log(`  Clan games:           ${clanGames} (${Math.round(100*clanGames/gameCount)}%)`);
console.log(`  Unique players:       ${uniquePlayers}`);
console.log(`  Date range:           ${(dateRange.earliest||'?').substring(0,10)} → ${(dateRange.latest||'?').substring(0,10)}`);

// Map breakdown
console.log('\n── Maps ──────────────────────────────────');
const maps = db.prepare(`SELECT g.map, COUNT(*) as cnt FROM games g WHERE ${GAME_FILTER} GROUP BY g.map ORDER BY cnt DESC`).all();
for (const m of maps) {
    const bar = '█'.repeat(Math.round(30 * m.cnt / (maps[0]?.cnt || 1)));
    console.log(`  ${(m.map||'?').padEnd(14)} ${String(m.cnt).padStart(4)}  ${bar}`);
}

// ─── STAT DISTRIBUTIONS (percentiles) ──────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`  STAT DISTRIBUTIONS (players with ${MIN_GAMES}+ 4on4 games)`);
console.log('══════════════════════════════════════════════════════════════════════\n');

const playerAvgs = db.prepare(`
    SELECT gp.player_name_normalized,
           gp.player_name_ascii,
           COUNT(*) as games,
           AVG(CASE WHEN gp.kills + gp.deaths > 0 THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END) as eff,
           AVG(gp.dmg_given) as avg_dmg,
           AVG(gp.taken_to_die) as ttd,
           AVG(CASE WHEN gp.sg_attacks > 50 THEN gp.sg_acc ELSE NULL END) as sg,
           AVG(CASE WHEN gp.rl_attacks > 10 THEN gp.rl_acc ELSE NULL END) as rl,
           AVG(gp.ra_time) as ra_time,
           AVG(gp.ya_time) as ya_time,
           AVG(gp.dmg_enemy_weapons) as ewep,
           AVG(gp.dmg_team) as team_dmg,
           ROUND(100.0 * SUM(gp.won) / COUNT(*), 1) as win_pct
    FROM game_players gp
    JOIN games g ON g.id = gp.game_id
    WHERE ${GAME_FILTER}
      AND gp.player_name_normalized != ''
    GROUP BY gp.player_name_normalized
    HAVING games >= ${MIN_GAMES}
    ORDER BY eff DESC
`).all();

function percentiles(arr, label) {
    const sorted = arr.filter(v => v != null && !isNaN(v)).sort((a,b) => a - b);
    const n = sorted.length;
    if (n === 0) { console.log(`  ${label.padEnd(16)} (no data)`); return; }
    const p = (pct) => sorted[Math.min(Math.floor(n * pct / 100), n-1)];
    console.log(`  ${label.padEnd(16)} p10=${p(10).toFixed(1).padStart(7)}  p25=${p(25).toFixed(1).padStart(7)}  p50=${p(50).toFixed(1).padStart(7)}  p75=${p(75).toFixed(1).padStart(7)}  p90=${p(90).toFixed(1).padStart(7)}  p99=${p(99).toFixed(1).padStart(7)}`);
}

percentiles(playerAvgs.map(p => p.eff), 'Efficiency %');
percentiles(playerAvgs.map(p => p.avg_dmg), 'Avg Damage');
percentiles(playerAvgs.map(p => p.ttd), 'Taken-to-Die');
percentiles(playerAvgs.map(p => p.sg), 'SG Accuracy %');
percentiles(playerAvgs.map(p => p.rl), 'RL Accuracy %');
percentiles(playerAvgs.map(p => p.ra_time), 'RA Time (sec)');
percentiles(playerAvgs.map(p => p.ya_time), 'YA Time (sec)');
percentiles(playerAvgs.map(p => p.ewep), 'Enemy Wpn Dmg');
percentiles(playerAvgs.map(p => p.team_dmg), 'Team Dmg');
percentiles(playerAvgs.map(p => p.win_pct), 'Win Rate %');

console.log(`\n  Qualified players: ${playerAvgs.length}`);

// ─── COMPOSITE RATING ──────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  COMPOSITE PERCENTILE RATING');
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  Weights: Eff=20%, DPM=20%, TTD=15%, ArmorCtrl=15%,');
console.log('           RL%=10%, SG%=10%, EnemyWpn=5%, TeamDmg=-5%\n');

// Calculate percentile for each stat
function calcPercentile(value, sortedArr) {
    if (value == null || isNaN(value)) return 50; // default to median if missing
    const n = sortedArr.length;
    let rank = 0;
    for (let i = 0; i < n; i++) {
        if (sortedArr[i] <= value) rank = i + 1;
        else break;
    }
    return 100 * rank / n;
}

// Pre-sort distributions
const dists = {
    eff: playerAvgs.map(p => p.eff).filter(v => v != null).sort((a,b) => a - b),
    dmg: playerAvgs.map(p => p.avg_dmg).filter(v => v != null).sort((a,b) => a - b),
    ttd: playerAvgs.map(p => p.ttd).filter(v => v != null && v < 500).sort((a,b) => a - b), // cap TTD outliers
    sg: playerAvgs.map(p => p.sg).filter(v => v != null).sort((a,b) => a - b),
    rl: playerAvgs.map(p => p.rl).filter(v => v != null).sort((a,b) => a - b),
    armor: playerAvgs.map(p => (p.ra_time || 0) + (p.ya_time || 0)).filter(v => v != null).sort((a,b) => a - b),
    ewep: playerAvgs.map(p => p.ewep).filter(v => v != null).sort((a,b) => a - b),
    tdmg: playerAvgs.map(p => p.team_dmg).filter(v => v != null).sort((a,b) => a - b),
};

// Weights
const W = {
    eff: 0.20,
    dmg: 0.20,
    ttd: 0.15,
    armor: 0.15,
    rl: 0.10,
    sg: 0.10,
    ewep: 0.05,
    tdmg: -0.05  // negative = penalty for high team damage
};

const rated = playerAvgs.map(p => {
    const armorTotal = (p.ra_time || 0) + (p.ya_time || 0);
    const cappedTtd = Math.min(p.ttd || 0, 500);

    const pcts = {
        eff: calcPercentile(p.eff, dists.eff),
        dmg: calcPercentile(p.avg_dmg, dists.dmg),
        ttd: calcPercentile(cappedTtd, dists.ttd),
        sg: calcPercentile(p.sg, dists.sg),
        rl: calcPercentile(p.rl, dists.rl),
        armor: calcPercentile(armorTotal, dists.armor),
        ewep: calcPercentile(p.ewep, dists.ewep),
        tdmg: calcPercentile(p.team_dmg, dists.tdmg),
    };

    // Composite: higher is better for all except team_dmg
    const rating =
        pcts.eff * W.eff +
        pcts.dmg * W.dmg +
        pcts.ttd * W.ttd +
        pcts.armor * W.armor +
        pcts.rl * W.rl +
        pcts.sg * W.sg +
        pcts.ewep * W.ewep +
        (100 - pcts.tdmg) * Math.abs(W.tdmg);  // invert: low team dmg = good

    return {
        name: p.player_name_ascii,
        games: p.games,
        rating: Math.round(rating * 10) / 10,
        eff: p.eff,
        dmg: p.avg_dmg,
        ttd: cappedTtd,
        sg: p.sg,
        rl: p.rl,
        armor: armorTotal,
        winPct: p.win_pct,
        pcts // raw percentiles for debugging
    };
});

rated.sort((a, b) => b.rating - a.rating);

// Print Top 50
console.log('\n── TOP 50 PLAYERS (Composite Rating) ──────────────────────────────────────────────────────');
console.log('  ' + '#'.padStart(3) + '  ' + 'Name'.padEnd(20) + 'Rating'.padStart(7) + ' Games'.padStart(6) +
            '  Eff%'.padStart(6) + ' AvgDmg'.padStart(7) + '  TTD'.padStart(5) +
            '  SG%'.padStart(6) + '  RL%'.padStart(6) + ' Armor'.padStart(6) + ' Win%'.padStart(6));
console.log('  ' + '─'.repeat(85));
for (let i = 0; i < Math.min(50, rated.length); i++) {
    const p = rated[i];
    console.log('  ' +
        String(i + 1).padStart(3) + '  ' +
        (p.name || '?').substring(0,19).padEnd(20) +
        p.rating.toFixed(1).padStart(7) +
        String(p.games).padStart(6) +
        (p.eff?.toFixed(1) ?? '-').padStart(6) +
        Math.round(p.dmg || 0).toFixed(0).padStart(7) +
        Math.round(p.ttd || 0).toFixed(0).padStart(5) +
        (p.sg?.toFixed(1) ?? '-').padStart(6) +
        (p.rl?.toFixed(1) ?? '-').padStart(6) +
        Math.round(p.armor || 0).toFixed(0).padStart(6) +
        ((p.winPct?.toFixed(0) ?? '-') + '%').padStart(6)
    );
}

// Print Bottom 10 for contrast
console.log('\n── BOTTOM 10 ──────────────────────────────────────────────────────────────────────────────');
for (let i = Math.max(0, rated.length - 10); i < rated.length; i++) {
    const p = rated[i];
    console.log('  ' +
        String(i + 1).padStart(3) + '  ' +
        (p.name || '?').substring(0,19).padEnd(20) +
        p.rating.toFixed(1).padStart(7) +
        String(p.games).padStart(6) +
        (p.eff?.toFixed(1) ?? '-').padStart(6) +
        Math.round(p.dmg || 0).toFixed(0).padStart(7) +
        Math.round(p.ttd || 0).toFixed(0).padStart(5) +
        (p.sg?.toFixed(1) ?? '-').padStart(6) +
        (p.rl?.toFixed(1) ?? '-').padStart(6) +
        Math.round(p.armor || 0).toFixed(0).padStart(6) +
        ((p.winPct?.toFixed(0) ?? '-') + '%').padStart(6)
    );
}

// ─── PER-MAP LEADERS ───────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  PER-MAP TOP 10 (by avg damage, min 10 games on that map)');
console.log('══════════════════════════════════════════════════════════════════════');

for (const mapName of COMP_MAPS) {
    const mapPlayers = db.prepare(`
        SELECT gp.player_name_ascii as name,
               COUNT(*) as games,
               ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0 THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) as eff,
               ROUND(AVG(gp.dmg_given), 0) as dmg,
               ROUND(AVG(gp.taken_to_die), 0) as ttd,
               ROUND(AVG(CASE WHEN gp.sg_attacks > 50 THEN gp.sg_acc ELSE NULL END), 1) as sg,
               ROUND(AVG(CASE WHEN gp.rl_attacks > 10 THEN gp.rl_acc ELSE NULL END), 1) as rl,
               ROUND(100.0 * SUM(gp.won) / COUNT(*), 0) as win_pct
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE g.player_count = 8 AND g.mode = 'team' AND g.map = ?
          AND g.duration >= 600 AND gp.player_name_normalized != ''
        GROUP BY gp.player_name_normalized
        HAVING games >= 10
        ORDER BY dmg DESC
        LIMIT 10
    `).all(mapName);

    if (mapPlayers.length === 0) continue;

    console.log(`\n── ${mapName.toUpperCase()} ──────────────────────────────────────────`);
    console.log('  ' + 'Name'.padEnd(20) + 'Games'.padStart(6) + '  Eff%'.padStart(6) +
                ' AvgDmg'.padStart(7) + '  TTD'.padStart(5) + '  SG%'.padStart(6) + '  RL%'.padStart(6) + ' Win%'.padStart(6));
    console.log('  ' + '─'.repeat(62));
    for (const p of mapPlayers) {
        console.log('  ' +
            (p.name || '?').substring(0,19).padEnd(20) +
            String(p.games).padStart(6) +
            String(p.eff ?? '-').padStart(6) +
            String(p.dmg ?? '-').padStart(7) +
            String(Math.min(p.ttd || 0, 500)).padStart(5) +
            String(p.sg ?? '-').padStart(6) +
            String(p.rl ?? '-').padStart(6) +
            ((p.win_pct ?? '-') + '%').padStart(6)
        );
    }
}

// ─── CLAN TEAMS SUMMARY ────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  TOP CLAN TEAMS (4on4 comp maps, clan games only)');
console.log('══════════════════════════════════════════════════════════════════════\n');

// QW character decoding
const QW_CHAR_LOOKUP = {
    0:'=', 2:'=', 5:'\u2022', 10:' ', 14:'\u2022', 15:'\u2022',
    16:'[', 17:']', 18:'0', 19:'1', 20:'2', 21:'3', 22:'4',
    23:'5', 24:'6', 25:'7', 26:'8', 27:'9', 28:'\u2022',
    29:'=', 30:'=', 31:'='
};
function qwToAscii(name) {
    if (!name) return '';
    return Array.from(name).map(ch => {
        let code = ch.charCodeAt(0);
        if (code >= 128) code -= 128;
        if (code >= 32) return String.fromCharCode(code);
        return QW_CHAR_LOOKUP[code] || '?';
    }).join('').trim();
}

const clanTeams = db.prepare(`
    SELECT team_a as team, COUNT(*) as games,
           SUM(CASE WHEN team_a_frags > team_b_frags THEN 1 ELSE 0 END) as wins,
           ROUND(AVG(team_a_frags), 0) as avg_frags,
           ROUND(AVG(team_a_frags - team_b_frags), 0) as avg_diff
    FROM games g
    WHERE ${GAME_FILTER} AND g.is_clan_game = 1
    GROUP BY team_a
    HAVING games >= 3
    UNION ALL
    SELECT team_b as team, COUNT(*) as games,
           SUM(CASE WHEN team_b_frags > team_a_frags THEN 1 ELSE 0 END) as wins,
           ROUND(AVG(team_b_frags), 0) as avg_frags,
           ROUND(AVG(team_b_frags - team_a_frags), 0) as avg_diff
    FROM games g
    WHERE ${GAME_FILTER} AND g.is_clan_game = 1
    GROUP BY team_b
    HAVING games >= 3
`).all();

// Aggregate both sides
const teamMap = {};
for (const t of clanTeams) {
    const ascii = qwToAscii(t.team);
    if (!teamMap[ascii]) teamMap[ascii] = { games: 0, wins: 0, totalFrags: 0, totalDiff: 0 };
    teamMap[ascii].games += t.games;
    teamMap[ascii].wins += t.wins;
    teamMap[ascii].totalFrags += t.avg_frags * t.games;
    teamMap[ascii].totalDiff += t.avg_diff * t.games;
}

const sortedTeams = Object.entries(teamMap)
    .map(([name, d]) => ({
        name,
        games: d.games,
        wins: d.wins,
        winPct: Math.round(100 * d.wins / d.games),
        avgFrags: Math.round(d.totalFrags / d.games),
        avgDiff: Math.round(d.totalDiff / d.games)
    }))
    .filter(t => t.games >= 3)
    .sort((a, b) => b.winPct - a.winPct || b.games - a.games);

console.log('  ' + 'Team'.padEnd(15) + 'Games'.padStart(6) + ' W-L'.padStart(8) + ' Win%'.padStart(6) +
            ' AvgFrg'.padStart(7) + ' AvgDiff'.padStart(8));
console.log('  ' + '─'.repeat(50));
for (const t of sortedTeams.slice(0, 20)) {
    console.log('  ' +
        t.name.substring(0,14).padEnd(15) +
        String(t.games).padStart(6) +
        (`${t.wins}-${t.games - t.wins}`).padStart(8) +
        (t.winPct + '%').padStart(6) +
        String(t.avgFrags).padStart(7) +
        ((t.avgDiff >= 0 ? '+' : '') + t.avgDiff).padStart(8)
    );
}

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`  Database: ${DB_PATH}`);
console.log(`  Total rated players: ${rated.length}`);
console.log('══════════════════════════════════════════════════════════════════════\n');

db.close();
