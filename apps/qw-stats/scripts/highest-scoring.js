const pool = require('./db');

async function main() {
    const maps = ['dm3', 'dm2', 'e1m2', 'schloss', 'phantombase'];

    for (const map of maps) {
        const res = await pool.query(`
            SELECT team_a_ascii, team_b_ascii, team_a_frags, team_b_frags,
                   (team_a_frags + team_b_frags) as total_frags,
                   played_at, map
            FROM games
            WHERE map = $1 AND is_clan_game = true
            ORDER BY (team_a_frags + team_b_frags) DESC
            LIMIT 1
        `, [map]);

        const r = res.rows[0];
        if (r) {
            const date = r.played_at.toISOString().slice(0, 10);
            console.log(`${r.map.padEnd(13)} ${r.team_a_ascii} ${r.team_a_frags} - ${r.team_b_frags} ${r.team_b_ascii}  (total: ${r.total_frags})  ${date}`);
        }
    }

    await pool.end();
}

main();
