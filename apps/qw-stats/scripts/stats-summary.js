#!/usr/bin/env node
/**
 * QW Stats Summary - Query the imported SQLite database
 * Run: node scripts/stats-summary.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'qw-stats.db');
const db = new Database(DB_PATH, { readonly: true });

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

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  QW 4on4 STATS DATABASE — OVERVIEW');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Basic counts
const gameCount = db.prepare('SELECT COUNT(*) as c FROM games').get().c;
const playerRecords = db.prepare('SELECT COUNT(*) as c FROM game_players').get().c;
const uniquePlayers = db.prepare("SELECT COUNT(DISTINCT player_name_normalized) as c FROM game_players WHERE player_name_normalized != ''").get().c;
const clanGames = db.prepare('SELECT COUNT(*) as c FROM games WHERE is_clan_game = 1').get().c;
const dateRange = db.prepare("SELECT MIN(date) as earliest, MAX(date) as latest FROM games WHERE date IS NOT NULL").get();

console.log(`Total games:        ${gameCount.toLocaleString()}`);
console.log(`Player-game slots:  ${playerRecords.toLocaleString()}`);
console.log(`Unique players:     ${uniquePlayers.toLocaleString()}`);
console.log(`Clan games:         ${clanGames.toLocaleString()} (${Math.round(100*clanGames/gameCount)}%)`);
console.log(`Date range:         ${(dateRange.earliest || '?').substring(0,10)} → ${(dateRange.latest || '?').substring(0,10)}`);

// Mode breakdown
console.log('\n── Game Modes ────────────────────────────');
const modes = db.prepare('SELECT mode, COUNT(*) as cnt FROM games GROUP BY mode ORDER BY cnt DESC').all();
for (const m of modes) {
    console.log(`  ${(m.mode || '?').padEnd(12)} ${m.cnt} games`);
}

// Duration stats
const durations = db.prepare('SELECT MIN(duration) as mi, AVG(duration) as av, MAX(duration) as ma FROM games WHERE duration > 0').get();
console.log(`\n  Avg duration: ${Math.round(durations.av / 60)} min  (range: ${Math.round(durations.mi / 60)}-${Math.round(durations.ma / 60)} min)`);

// Player count per game
const playerCounts = db.prepare('SELECT player_count, COUNT(*) as cnt FROM games GROUP BY player_count ORDER BY player_count').all();
console.log('\n── Players Per Game ──────────────────────');
for (const p of playerCounts) {
    console.log(`  ${p.player_count} players: ${p.cnt} games`);
}

// Top maps
console.log('\n── Top Maps ──────────────────────────────');
const maps = db.prepare('SELECT map, COUNT(*) as cnt FROM games GROUP BY map ORDER BY cnt DESC LIMIT 20').all();
for (const m of maps) {
    const bar = '█'.repeat(Math.round(40 * m.cnt / maps[0].cnt));
    console.log(`  ${(m.map || '?').padEnd(14)} ${String(m.cnt).padStart(5)}  ${bar}`);
}

// Top clan tags
console.log('\n── Top Clan Tags (clan games only) ───────');
const teamCounts = db.prepare(`
    SELECT team_a as team, COUNT(*) as cnt FROM games WHERE is_clan_game = 1 GROUP BY team_a
    UNION ALL
    SELECT team_b as team, COUNT(*) as cnt FROM games WHERE is_clan_game = 1 GROUP BY team_b
`).all();
const tagMap = {};
for (const t of teamCounts) {
    const ascii = qwToAscii(t.team);
    tagMap[ascii] = (tagMap[ascii] || 0) + t.cnt;
}
const sortedTags = Object.entries(tagMap).sort((a,b) => b[1] - a[1]).slice(0, 25);
for (const [tag, cnt] of sortedTags) {
    console.log(`  ${tag.padEnd(15)} ${cnt} games`);
}

// Matchtags (tournament identifiers)
console.log('\n── Match Tags (tournament/context) ───────');
const matchtags = db.prepare("SELECT matchtag, COUNT(*) as cnt FROM games WHERE matchtag IS NOT NULL AND matchtag != '' GROUP BY matchtag ORDER BY cnt DESC LIMIT 15").all();
for (const m of matchtags) {
    console.log(`  ${(m.matchtag || '?').padEnd(25)} ${m.cnt} games`);
}

// ─── PLAYER RANKINGS ───────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  PLAYER RANKINGS');
console.log('══════════════════════════════════════════════════════════════════════');

// Top 30 by games played
console.log('\n── Top 30 by Games Played ─────────────────');
const topByGames = db.prepare(`
    SELECT player_name_ascii,
           COUNT(*) as games,
           ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) as avg_eff,
           ROUND(AVG(dmg_given), 0) as avg_dmg,
           ROUND(AVG(taken_to_die), 0) as avg_ttd,
           ROUND(AVG(CASE WHEN sg_attacks > 50 THEN sg_acc ELSE NULL END), 1) as avg_sg,
           ROUND(AVG(CASE WHEN rl_attacks > 10 THEN rl_acc ELSE NULL END), 1) as avg_rl,
           ROUND(100.0 * SUM(won) / COUNT(*), 0) as win_pct
    FROM game_players
    WHERE player_name_normalized != ''
    GROUP BY player_name_normalized
    HAVING games >= 20
    ORDER BY games DESC
    LIMIT 30
`).all();

console.log('  ' + 'Name'.padEnd(18) + 'Games'.padStart(6) + ' Eff%'.padStart(6) +
            ' AvgDmg'.padStart(8) + '  TTD'.padStart(6) + '  SG%'.padStart(6) +
            '  RL%'.padStart(6) + ' Win%'.padStart(6));
console.log('  ' + '─'.repeat(62));
for (const p of topByGames) {
    console.log('  ' +
        (p.player_name_ascii || '?').substring(0,17).padEnd(18) +
        String(p.games).padStart(6) +
        String(p.avg_eff ?? '-').padStart(6) +
        String(p.avg_dmg ?? '-').padStart(8) +
        String(p.avg_ttd ?? '-').padStart(6) +
        String(p.avg_sg ?? '-').padStart(6) +
        String(p.avg_rl ?? '-').padStart(6) +
        (String(p.win_pct ?? '-') + '%').padStart(6)
    );
}

// Top 30 by efficiency (min 50 games)
console.log('\n── Top 30 by Efficiency (min 50 games) ────');
const topByEff = db.prepare(`
    SELECT player_name_ascii,
           COUNT(*) as games,
           ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) as avg_eff,
           ROUND(AVG(dmg_given), 0) as avg_dmg,
           ROUND(AVG(taken_to_die), 0) as avg_ttd,
           ROUND(AVG(CASE WHEN sg_attacks > 50 THEN sg_acc ELSE NULL END), 1) as avg_sg,
           ROUND(AVG(CASE WHEN rl_attacks > 10 THEN rl_acc ELSE NULL END), 1) as avg_rl,
           ROUND(100.0 * SUM(won) / COUNT(*), 0) as win_pct
    FROM game_players
    WHERE player_name_normalized != ''
    GROUP BY player_name_normalized
    HAVING games >= 50
    ORDER BY avg_eff DESC
    LIMIT 30
`).all();

console.log('  ' + 'Name'.padEnd(18) + 'Games'.padStart(6) + ' Eff%'.padStart(6) +
            ' AvgDmg'.padStart(8) + '  TTD'.padStart(6) + '  SG%'.padStart(6) +
            '  RL%'.padStart(6) + ' Win%'.padStart(6));
console.log('  ' + '─'.repeat(62));
for (const p of topByEff) {
    console.log('  ' +
        (p.player_name_ascii || '?').substring(0,17).padEnd(18) +
        String(p.games).padStart(6) +
        String(p.avg_eff ?? '-').padStart(6) +
        String(p.avg_dmg ?? '-').padStart(8) +
        String(p.avg_ttd ?? '-').padStart(6) +
        String(p.avg_sg ?? '-').padStart(6) +
        String(p.avg_rl ?? '-').padStart(6) +
        (String(p.win_pct ?? '-') + '%').padStart(6)
    );
}

// Top 30 by average damage (min 50 games)
console.log('\n── Top 30 by Avg Damage Given (min 50 games) ──');
const topByDmg = db.prepare(`
    SELECT player_name_ascii,
           COUNT(*) as games,
           ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) as avg_eff,
           ROUND(AVG(dmg_given), 0) as avg_dmg,
           ROUND(AVG(taken_to_die), 0) as avg_ttd,
           ROUND(AVG(CASE WHEN sg_attacks > 50 THEN sg_acc ELSE NULL END), 1) as avg_sg,
           ROUND(AVG(CASE WHEN rl_attacks > 10 THEN rl_acc ELSE NULL END), 1) as avg_rl,
           ROUND(100.0 * SUM(won) / COUNT(*), 0) as win_pct
    FROM game_players
    WHERE player_name_normalized != ''
    GROUP BY player_name_normalized
    HAVING games >= 50
    ORDER BY avg_dmg DESC
    LIMIT 30
`).all();

console.log('  ' + 'Name'.padEnd(18) + 'Games'.padStart(6) + ' Eff%'.padStart(6) +
            ' AvgDmg'.padStart(8) + '  TTD'.padStart(6) + '  SG%'.padStart(6) +
            '  RL%'.padStart(6) + ' Win%'.padStart(6));
console.log('  ' + '─'.repeat(62));
for (const p of topByDmg) {
    console.log('  ' +
        (p.player_name_ascii || '?').substring(0,17).padEnd(18) +
        String(p.games).padStart(6) +
        String(p.avg_eff ?? '-').padStart(6) +
        String(p.avg_dmg ?? '-').padStart(8) +
        String(p.avg_ttd ?? '-').padStart(6) +
        String(p.avg_sg ?? '-').padStart(6) +
        String(p.avg_rl ?? '-').padStart(6) +
        (String(p.win_pct ?? '-') + '%').padStart(6)
    );
}

// ─── STAT DISTRIBUTIONS ────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  STAT DISTRIBUTIONS (players with 20+ games)');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Build percentile distributions
const playerAvgs = db.prepare(`
    SELECT player_name_normalized,
           COUNT(*) as games,
           AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END) as eff,
           AVG(dmg_given) as avg_dmg,
           AVG(taken_to_die) as ttd,
           AVG(CASE WHEN sg_attacks > 50 THEN sg_acc ELSE NULL END) as sg,
           AVG(CASE WHEN rl_attacks > 10 THEN rl_acc ELSE NULL END) as rl
    FROM game_players
    WHERE player_name_normalized != ''
    GROUP BY player_name_normalized
    HAVING games >= 20
    ORDER BY eff
`).all();

function percentiles(arr, label) {
    const sorted = arr.filter(v => v != null).sort((a,b) => a - b);
    const n = sorted.length;
    if (n === 0) return;
    const p = (pct) => sorted[Math.floor(n * pct / 100)] ?? 0;
    console.log(`  ${label.padEnd(16)} p10=${p(10).toFixed(1).padStart(6)}  p25=${p(25).toFixed(1).padStart(6)}  p50=${p(50).toFixed(1).padStart(6)}  p75=${p(75).toFixed(1).padStart(6)}  p90=${p(90).toFixed(1).padStart(6)}  p99=${p(99).toFixed(1).padStart(6)}`);
}

percentiles(playerAvgs.map(p => p.eff), 'Efficiency %');
percentiles(playerAvgs.map(p => p.avg_dmg), 'Avg Damage');
percentiles(playerAvgs.map(p => p.ttd), 'Taken-to-Die');
percentiles(playerAvgs.map(p => p.sg), 'SG Accuracy %');
percentiles(playerAvgs.map(p => p.rl), 'RL Accuracy %');

console.log(`\n  Total qualified players: ${playerAvgs.length}`);

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log(`  Database: ${DB_PATH}`);
console.log('══════════════════════════════════════════════════════════════════════\n');

db.close();
