#!/usr/bin/env node
/**
 * Search for a player across all name variants
 * Run: node scripts/find-player.js paradok
 */
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'qw-stats.db'), { readonly: true });

const search = (process.argv[2] || 'paradok').toLowerCase();

console.log(`\nSearching for: "${search}"\n`);

// Find all name variants
const variants = db.prepare(`
    SELECT player_name_ascii, player_name_normalized, player_name_raw,
           COUNT(*) as total_games
    FROM game_players
    WHERE player_name_normalized LIKE ?
    GROUP BY player_name_normalized
    ORDER BY total_games DESC
`).all(`%${search}%`);

console.log(`Found ${variants.length} name variants:\n`);

for (const v of variants) {
    console.log(`  "${v.player_name_ascii}" (normalized: "${v.player_name_normalized}") — ${v.total_games} total games`);

    // Breakdown by mode/map/player_count
    const breakdown = db.prepare(`
        SELECT g.mode, g.map, g.player_count, COUNT(*) as cnt,
               SUM(CASE WHEN g.duration >= 600 THEN 1 ELSE 0 END) as long_games
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE gp.player_name_normalized = ?
        GROUP BY g.mode, g.map, g.player_count
        ORDER BY cnt DESC
    `).all(v.player_name_normalized);

    for (const b of breakdown) {
        const tag = b.player_count === 8 ? '4on4' : b.player_count === 4 ? '2on2' : b.player_count === 2 ? '1on1' : `${b.player_count}p`;
        console.log(`    ${tag.padEnd(5)} ${(b.map||'?').padEnd(14)} ${b.cnt} games (${b.long_games} >= 10min)`);
    }
    console.log();
}

// Also check teams played for
const teams = db.prepare(`
    SELECT gp.team, COUNT(*) as cnt
    FROM game_players gp
    WHERE gp.player_name_normalized LIKE ?
    GROUP BY gp.team
    ORDER BY cnt DESC
    LIMIT 10
`).all(`%${search}%`);

console.log('Teams played for:');
for (const t of teams) {
    const QW_CHAR_LOOKUP = {
        0:'=', 2:'=', 16:'[', 17:']', 18:'0', 19:'1', 20:'2', 21:'3', 22:'4',
        23:'5', 24:'6', 25:'7', 26:'8', 27:'9', 28:'\u2022'
    };
    const ascii = Array.from(t.team).map(ch => {
        let code = ch.charCodeAt(0);
        if (code >= 128) code -= 128;
        if (code >= 32) return String.fromCharCode(code);
        return QW_CHAR_LOOKUP[code] || '?';
    }).join('').trim();
    console.log(`  ${ascii.padEnd(15)} ${t.cnt} games`);
}

db.close();
