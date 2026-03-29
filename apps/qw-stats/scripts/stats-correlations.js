#!/usr/bin/env node
/**
 * QW 4on4 Stat Correlations
 * Checks which stats are independent vs redundant
 * Run: node scripts/stats-correlations.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'data', 'qw-stats.db');
const db = new Database(DB_PATH, { readonly: true });

const COMP_MAPS = ['dm2', 'dm3', 'e1m2', 'schloss', 'phantombase'];
const MAP_FILTER = COMP_MAPS.map(m => `'${m}'`).join(',');
const GAME_FILTER = `g.player_count = 8 AND g.mode = 'team' AND g.map IN (${MAP_FILTER}) AND g.duration >= 600`;
const MIN_GAMES = 15;

// Get player averages
const players = db.prepare(`
    SELECT gp.player_name_ascii as name,
           COUNT(*) as games,
           AVG(CASE WHEN gp.kills + gp.deaths > 0 THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END) as eff,
           AVG(gp.dmg_given) as dmg,
           AVG(CASE WHEN gp.taken_to_die < 500 THEN gp.taken_to_die ELSE NULL END) as ttd,
           AVG(CASE WHEN gp.sg_attacks > 50 THEN gp.sg_acc ELSE NULL END) as sg,
           AVG(CASE WHEN gp.rl_attacks > 10 THEN gp.rl_acc ELSE NULL END) as rl,
           AVG(gp.ra_time + gp.ya_time) as armor,
           AVG(gp.dmg_enemy_weapons) as ewep,
           AVG(gp.dmg_team) as tdmg,
           100.0 * SUM(gp.won) / COUNT(*) as win_pct,
           AVG(gp.frags) as avg_frags,
           AVG(gp.kills) as avg_kills,
           AVG(gp.deaths) as avg_deaths
    FROM game_players gp
    JOIN games g ON g.id = gp.game_id
    WHERE ${GAME_FILTER} AND gp.player_name_normalized != ''
    GROUP BY gp.player_name_normalized
    HAVING games >= ${MIN_GAMES}
`).all();

// Pearson correlation coefficient
function corr(xs, ys) {
    const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => x != null && y != null && !isNaN(x) && !isNaN(y));
    const n = pairs.length;
    if (n < 5) return null;
    const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
    const my = pairs.reduce((s, [,y]) => s + y, 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of pairs) {
        sxx += (x - mx) ** 2;
        syy += (y - my) ** 2;
        sxy += (x - mx) * (y - my);
    }
    if (sxx === 0 || syy === 0) return 0;
    return sxy / Math.sqrt(sxx * syy);
}

const stats = {
    'Efficiency': players.map(p => p.eff),
    'Avg Damage': players.map(p => p.dmg),
    'Taken-to-Die': players.map(p => p.ttd),
    'SG Accuracy': players.map(p => p.sg),
    'RL Accuracy': players.map(p => p.rl),
    'Armor Control': players.map(p => p.armor),
    'Enemy Wpn Dmg': players.map(p => p.ewep),
    'Team Damage': players.map(p => p.tdmg),
    'Win Rate': players.map(p => p.win_pct),
    'Avg Frags': players.map(p => p.avg_frags),
};

const keys = Object.keys(stats);

console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  STAT CORRELATION MATRIX');
console.log(`  ${players.length} players, ${MIN_GAMES}+ games each`);
console.log('══════════════════════════════════════════════════════════════════════\n');

// Print header
const SHORT = {
    'Efficiency': 'Eff',
    'Avg Damage': 'Dmg',
    'Taken-to-Die': 'TTD',
    'SG Accuracy': 'SG%',
    'RL Accuracy': 'RL%',
    'Armor Control': 'Armr',
    'Enemy Wpn Dmg': 'EWep',
    'Team Damage': 'TDmg',
    'Win Rate': 'Win%',
    'Avg Frags': 'Frag',
};

console.log('  ' + ''.padEnd(16) + keys.map(k => SHORT[k].padStart(6)).join(''));
console.log('  ' + '─'.repeat(16 + keys.length * 6));

for (const k1 of keys) {
    let row = '  ' + SHORT[k1].padEnd(16);
    for (const k2 of keys) {
        const r = corr(stats[k1], stats[k2]);
        const val = r != null ? r.toFixed(2) : '  -  ';
        row += val.padStart(6);
    }
    console.log(row);
}

// ─── KEY INSIGHTS ──────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  KEY CORRELATIONS WITH WIN RATE');
console.log('══════════════════════════════════════════════════════════════════════\n');

const winCorrs = keys
    .filter(k => k !== 'Win Rate')
    .map(k => ({ stat: k, r: corr(stats[k], stats['Win Rate']) }))
    .filter(c => c.r != null)
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

for (const { stat, r } of winCorrs) {
    const strength = Math.abs(r) > 0.7 ? 'STRONG' : Math.abs(r) > 0.4 ? 'MODERATE' : Math.abs(r) > 0.2 ? 'WEAK' : 'NONE';
    const bar = r > 0 ? '█'.repeat(Math.round(Math.abs(r) * 30)) : '░'.repeat(Math.round(Math.abs(r) * 30));
    console.log(`  ${stat.padEnd(16)} r=${r.toFixed(3).padStart(7)}  ${strength.padEnd(10)} ${r > 0 ? '+' : '-'}${bar}`);
}

// ─── TTD DEEP DIVE ─────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  TAKEN-TO-DIE DEEP DIVE');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Quartile analysis: split players into TTD quartiles, show avg stats per quartile
const validTtd = players.filter(p => p.ttd != null && !isNaN(p.ttd)).sort((a, b) => a.ttd - b.ttd);
const q1 = Math.floor(validTtd.length * 0.25);
const q2 = Math.floor(validTtd.length * 0.50);
const q3 = Math.floor(validTtd.length * 0.75);

const quartiles = [
    { label: 'Q1 (lowest TTD)', players: validTtd.slice(0, q1) },
    { label: 'Q2', players: validTtd.slice(q1, q2) },
    { label: 'Q3', players: validTtd.slice(q2, q3) },
    { label: 'Q4 (highest TTD)', players: validTtd.slice(q3) },
];

console.log('  Players split into TTD quartiles — what other stats look like:\n');
console.log('  ' + 'Quartile'.padEnd(22) + 'TTD Range'.padStart(12) + '  Eff%'.padStart(6) +
            '  Dmg'.padStart(7) + '  SG%'.padStart(6) + '  RL%'.padStart(6) +
            ' Armor'.padStart(6) + ' Win%'.padStart(6));
console.log('  ' + '─'.repeat(70));

for (const q of quartiles) {
    const avg = (arr, fn) => arr.reduce((s, p) => s + (fn(p) || 0), 0) / arr.length;
    const ttdMin = Math.round(q.players[0].ttd);
    const ttdMax = Math.round(q.players[q.players.length - 1].ttd);
    console.log('  ' +
        q.label.padEnd(22) +
        (`${ttdMin}-${ttdMax}`).padStart(12) +
        avg(q.players, p => p.eff).toFixed(1).padStart(6) +
        Math.round(avg(q.players, p => p.dmg)).toFixed(0).padStart(7) +
        avg(q.players, p => p.sg || 0).toFixed(1).padStart(6) +
        avg(q.players, p => p.rl || 0).toFixed(1).padStart(6) +
        Math.round(avg(q.players, p => p.armor)).toFixed(0).padStart(6) +
        avg(q.players, p => p.win_pct).toFixed(1).padStart(6)
    );
}

// ─── STAT INDEPENDENCE ─────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  STAT INDEPENDENCE ANALYSIS');
console.log('  (Do players exist who are high in one stat but average/low in another?)');
console.log('══════════════════════════════════════════════════════════════════════\n');

// Find interesting player profiles
function pct(value, sorted) {
    if (value == null) return 50;
    let rank = 0;
    for (let i = 0; i < sorted.length; i++) {
        if (sorted[i] <= value) rank = i + 1;
    }
    return Math.round(100 * rank / sorted.length);
}

const sortedEff = players.map(p => p.eff).sort((a,b) => a - b);
const sortedDmg = players.map(p => p.dmg).sort((a,b) => a - b);
const sortedTtd = players.filter(p => p.ttd != null).map(p => p.ttd).sort((a,b) => a - b);
const sortedSg = players.filter(p => p.sg != null).map(p => p.sg).sort((a,b) => a - b);
const sortedArmor = players.map(p => p.armor).sort((a,b) => a - b);
const sortedWin = players.map(p => p.win_pct).sort((a,b) => a - b);

// High Eff, Low Damage (efficient but low output)
console.log('  High Efficiency, Low Damage ("efficient but passive"):');
const hiEffLoDmg = players
    .filter(p => pct(p.eff, sortedEff) >= 75 && pct(p.dmg, sortedDmg) <= 35)
    .sort((a,b) => b.eff - a.eff).slice(0, 5);
for (const p of hiEffLoDmg) {
    console.log(`    ${p.name.padEnd(18)} Eff=${p.eff.toFixed(1)}%(p${pct(p.eff, sortedEff)})  Dmg=${Math.round(p.dmg)}(p${pct(p.dmg, sortedDmg)})  Win=${p.win_pct.toFixed(0)}%`);
}

// Low Eff, High Damage (aggressive but dying a lot)
console.log('\n  Low Efficiency, High Damage ("aggressive but reckless"):');
const loEffHiDmg = players
    .filter(p => pct(p.eff, sortedEff) <= 35 && pct(p.dmg, sortedDmg) >= 65)
    .sort((a,b) => b.dmg - a.dmg).slice(0, 5);
for (const p of loEffHiDmg) {
    console.log(`    ${p.name.padEnd(18)} Eff=${p.eff.toFixed(1)}%(p${pct(p.eff, sortedEff)})  Dmg=${Math.round(p.dmg)}(p${pct(p.dmg, sortedDmg)})  Win=${p.win_pct.toFixed(0)}%`);
}

// High TTD, Low Win Rate (surviving but losing)
console.log('\n  High TTD, Low Win Rate ("surviving but losing"):');
const hiTtdLoWin = players
    .filter(p => p.ttd != null && pct(p.ttd, sortedTtd) >= 75 && pct(p.win_pct, sortedWin) <= 35)
    .sort((a,b) => b.ttd - a.ttd).slice(0, 5);
for (const p of hiTtdLoWin) {
    console.log(`    ${p.name.padEnd(18)} TTD=${Math.round(p.ttd)}(p${pct(p.ttd, sortedTtd)})  Win=${p.win_pct.toFixed(0)}%(p${pct(p.win_pct, sortedWin)})  Eff=${p.eff.toFixed(1)}%`);
}

// High SG, Low Damage (good aim but not converting)
console.log('\n  High SG Accuracy, Low Damage ("sharp aim, low output"):');
const hiSgLoDmg = players
    .filter(p => p.sg != null && pct(p.sg, sortedSg) >= 75 && pct(p.dmg, sortedDmg) <= 40)
    .sort((a,b) => b.sg - a.sg).slice(0, 5);
for (const p of hiSgLoDmg) {
    console.log(`    ${p.name.padEnd(18)} SG=${p.sg.toFixed(1)}%(p${pct(p.sg, sortedSg)})  Dmg=${Math.round(p.dmg)}(p${pct(p.dmg, sortedDmg)})  Eff=${p.eff.toFixed(1)}%`);
}

// High Armor Control, Low Win Rate (map control but still losing)
console.log('\n  High Armor Control, Low Win Rate ("controlling but losing"):');
const hiArmorLoWin = players
    .filter(p => pct(p.armor, sortedArmor) >= 75 && pct(p.win_pct, sortedWin) <= 35)
    .sort((a,b) => b.armor - a.armor).slice(0, 5);
for (const p of hiArmorLoWin) {
    console.log(`    ${p.name.padEnd(18)} Armor=${Math.round(p.armor)}(p${pct(p.armor, sortedArmor)})  Win=${p.win_pct.toFixed(0)}%(p${pct(p.win_pct, sortedWin)})  Eff=${p.eff.toFixed(1)}%`);
}

console.log('\n══════════════════════════════════════════════════════════════════════\n');

db.close();
