const pool = require('./db');

async function main() {
    const res = await pool.query(`
        SELECT EXTRACT(YEAR FROM g.played_at)::int as year,
               count(*) as games,
               sum(g.duration) as total_seconds
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE gp.ping != 0 AND gp.player_name_normalized = 'milton'
        GROUP BY year
        ORDER BY year
    `);

    console.log('\n=== Milton ===');
    let totalGames = 0, totalSeconds = 0;
    res.rows.forEach(r => {
        const hours = (r.total_seconds / 3600).toFixed(1);
        console.log(`  ${r.year}   ${String(r.games).padStart(4)} games   (${hours} hrs)`);
        totalGames += parseInt(r.games);
        totalSeconds += parseInt(r.total_seconds);
    });
    console.log(`  ----`);
    console.log(`  TOTAL  ${String(totalGames).padStart(4)} games   (${(totalSeconds / 3600).toFixed(1)} hrs)`);
    await pool.end();
}

main();
