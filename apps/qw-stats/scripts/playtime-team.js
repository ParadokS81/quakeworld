const pool = require('./db');

async function getPlaytime(label, nameCondition) {
    const res = await pool.query(`
        SELECT EXTRACT(YEAR FROM g.played_at)::int as year,
               count(*) as games,
               sum(g.duration) as total_seconds
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE gp.ping != 0 AND (${nameCondition})
        GROUP BY year
        ORDER BY year
    `);

    console.log(`\n=== ${label} ===`);
    let totalGames = 0, totalSeconds = 0;
    res.rows.forEach(r => {
        const hours = (r.total_seconds / 3600).toFixed(1);
        const mins = Math.round(r.total_seconds / 60);
        console.log(`  ${r.year}   ${String(r.games).padStart(4)} games   ${String(mins).padStart(5)} min   (${hours} hrs)`);
        totalGames += parseInt(r.games);
        totalSeconds += parseInt(r.total_seconds);
    });
    const totalHours = (totalSeconds / 3600).toFixed(1);
    console.log(`  ----`);
    console.log(`  TOTAL  ${String(totalGames).padStart(4)} games   (${totalHours} hrs)`);
}

async function main() {
    await getPlaytime('grisling', `gp.player_name_normalized IN ('• grisling', 'grisling')`);
    await getPlaytime('razor', `gp.player_name_normalized IN ('• razor', 'razor')`);
    await pool.end();
}

main();
