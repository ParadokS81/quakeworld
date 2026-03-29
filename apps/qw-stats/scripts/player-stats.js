#!/usr/bin/env node
/**
 * Get detailed stats for a specific player
 * Run: node scripts/player-stats.js "• paradoks"
 */
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'qw-stats.db'), { readonly: true });

const playerName = process.argv[2] || '• paradoks';

const COMP_MAPS = ['dm2', 'dm3', 'e1m2', 'schloss', 'phantombase'];
const MAP_FILTER = COMP_MAPS.map(m => `'${m}'`).join(',');

const stats = db.prepare(`
    SELECT COUNT(*) as games,
           ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0 THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) as eff,
           ROUND(AVG(gp.dmg_given), 0) as dmg,
           ROUND(AVG(gp.taken_to_die), 0) as ttd,
           ROUND(AVG(CASE WHEN gp.sg_attacks > 50 THEN gp.sg_acc ELSE NULL END), 1) as sg,
           ROUND(AVG(CASE WHEN gp.rl_attacks > 10 THEN gp.rl_acc ELSE NULL END), 1) as rl,
           ROUND(AVG(gp.ra_time + gp.ya_time), 0) as armor,
           ROUND(AVG(gp.dmg_enemy_weapons), 0) as ewep,
           ROUND(AVG(gp.dmg_team), 0) as tdmg,
           ROUND(100.0 * SUM(gp.won) / COUNT(*), 1) as win_pct
    FROM game_players gp
    JOIN games g ON g.id = gp.game_id
    WHERE gp.player_name_normalized = ?
      AND g.player_count = 8 AND g.mode = 'team'
      AND g.map IN (${MAP_FILTER})
      AND g.duration >= 600
`).get(playerName);

console.log(`\nPlayer: ${playerName}`);
console.log(`Comp 4on4 games: ${stats.games}`);
console.log(`  Efficiency: ${stats.eff}%`);
console.log(`  Avg Damage: ${stats.dmg}`);
console.log(`  Taken-to-Die: ${stats.ttd}`);
console.log(`  SG%: ${stats.sg}%`);
console.log(`  RL%: ${stats.rl}%`);
console.log(`  Armor Control: ${stats.armor}s`);
console.log(`  Enemy Wpn Dmg: ${stats.ewep}`);
console.log(`  Team Damage: ${stats.tdmg}`);
console.log(`  Win Rate: ${stats.win_pct}%`);

// Per-map
console.log('\nPer-map breakdown:');
for (const map of COMP_MAPS) {
    const m = db.prepare(`
        SELECT COUNT(*) as games,
               ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0 THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) as eff,
               ROUND(AVG(gp.dmg_given), 0) as dmg,
               ROUND(100.0 * SUM(gp.won) / COUNT(*), 0) as win_pct
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE gp.player_name_normalized = ?
          AND g.player_count = 8 AND g.mode = 'team' AND g.map = ?
          AND g.duration >= 600
    `).get(playerName, map);
    if (m.games > 0) {
        console.log(`  ${map.padEnd(14)} ${m.games} games  Eff=${m.eff}%  Dmg=${m.dmg}  Win=${m.win_pct}%`);
    }
}

db.close();
