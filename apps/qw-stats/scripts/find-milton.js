const pool = require('./db');

async function main() {
    const res = await pool.query(`
        SELECT player_name_normalized, player_name_ascii, count(*) as games,
               array_agg(DISTINCT team_ascii) as teams
        FROM game_players
        WHERE ping != 0
          AND (player_name_normalized LIKE '%milton%'
               OR player_name_normalized LIKE '%milt%')
        GROUP BY player_name_normalized, player_name_ascii
        ORDER BY games DESC
    `);
    console.log('=== MILTON ===');
    res.rows.forEach(r => {
        console.log(`  "${r.player_name_ascii}" (normalized: ${r.player_name_normalized})  ${r.games} games  teams: ${r.teams.join(', ')}`);
    });
    await pool.end();
}

main();
