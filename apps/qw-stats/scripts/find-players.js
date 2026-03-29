const pool = require('./db');

async function main() {
    // Find zero-like names
    const zero = await pool.query(`
        SELECT player_name_normalized, player_name_ascii, count(*) as games,
               array_agg(DISTINCT team_ascii) as teams
        FROM game_players
        WHERE ping != 0
          AND (player_name_normalized LIKE '%zero%'
               OR player_name_normalized LIKE '%zer0%'
               OR player_name_normalized LIKE '%z3ro%')
        GROUP BY player_name_normalized, player_name_ascii
        ORDER BY games DESC
    `);
    console.log('=== ZERO matches ===');
    zero.rows.forEach(r => {
        console.log(`  "${r.player_name_ascii}" (normalized: ${r.player_name_normalized})  ${r.games} games  teams: ${r.teams.join(', ')}`);
    });

    // Find ParadokS-like names
    const para = await pool.query(`
        SELECT player_name_normalized, player_name_ascii, count(*) as games,
               array_agg(DISTINCT team_ascii) as teams
        FROM game_players
        WHERE ping != 0
          AND (player_name_normalized LIKE '%paradok%'
               OR player_name_normalized LIKE '%parad0k%'
               OR player_name_normalized LIKE '%pdks%')
        GROUP BY player_name_normalized, player_name_ascii
        ORDER BY games DESC
    `);
    console.log('\n=== PARADOKS matches ===');
    para.rows.forEach(r => {
        console.log(`  "${r.player_name_ascii}" (normalized: ${r.player_name_normalized})  ${r.games} games  teams: ${r.teams.join(', ')}`);
    });

    await pool.end();
}

main();
