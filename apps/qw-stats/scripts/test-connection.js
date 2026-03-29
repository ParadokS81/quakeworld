const pool = require('./db');

async function main() {
    try {
        const games = await pool.query('SELECT count(*) as total FROM games');
        console.log('Connected! Total games:', games.rows[0].total);

        const clan = await pool.query('SELECT count(*) as total FROM games WHERE is_clan_game = true');
        console.log('Clan games:', clan.rows[0].total);

        const players = await pool.query('SELECT count(DISTINCT player_name_normalized) as total FROM game_players WHERE ping != 0');
        console.log('Unique player names:', players.rows[0].total);

        const recent = await pool.query('SELECT played_at, team_a_ascii, team_b_ascii, map FROM games ORDER BY played_at DESC LIMIT 5');
        console.log('\nMost recent games:');
        recent.rows.forEach(r => {
            console.log(`  ${r.played_at.toISOString().slice(0,10)}  ${r.team_a_ascii} vs ${r.team_b_ascii} on ${r.map}`);
        });

        await pool.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    }
}

main();
