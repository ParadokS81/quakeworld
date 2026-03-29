const pool = require('./db');

async function search(label, pattern) {
    const res = await pool.query(`
        SELECT player_name_normalized, player_name_ascii, count(*) as games,
               array_agg(DISTINCT team_ascii) as teams
        FROM game_players
        WHERE ping != 0 AND player_name_normalized LIKE $1
        GROUP BY player_name_normalized, player_name_ascii
        ORDER BY games DESC
    `, [pattern]);
    console.log(`=== ${label} ===`);
    res.rows.forEach(r => {
        console.log(`  "${r.player_name_ascii}" (normalized: ${r.player_name_normalized})  ${r.games} games  teams: ${r.teams.join(', ')}`);
    });
    console.log();
}

async function main() {
    await search('GRISLING', '%grisling%');
    await search('GRIS (broader)', '%gris%');
    await search('RAZOR', '%razor%');
    await pool.end();
}

main();
