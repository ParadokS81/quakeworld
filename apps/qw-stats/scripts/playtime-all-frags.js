const pool = require('./db');

const players = [
    { label: 'ParadokS', condition: `gp.player_name_normalized IN ('• paradoks', '• paradoks •')` },
    { label: 'zero', condition: `gp.player_name_normalized = '• zero'` },
    { label: 'Milton', condition: `gp.player_name_normalized = 'milton'` },
    { label: 'grisling', condition: `gp.player_name_normalized IN ('• grisling', 'grisling')` },
    { label: 'razor', condition: `gp.player_name_normalized IN ('• razor', 'razor')` },
];

async function main() {
    const results = [];

    for (const p of players) {
        const res = await pool.query(`
            SELECT EXTRACT(YEAR FROM g.played_at)::int as year,
                   count(*) as games,
                   sum(g.duration) as total_seconds,
                   sum(gp.frags) as total_frags
            FROM game_players gp
            JOIN games g ON g.id = gp.game_id
            WHERE gp.ping != 0 AND (${p.condition})
            GROUP BY year
            ORDER BY year
        `);

        let totalGames = 0, totalSeconds = 0, totalFrags = 0;
        const years = {};
        res.rows.forEach(r => {
            years[r.year] = { games: parseInt(r.games), hours: (r.total_seconds / 3600).toFixed(0), frags: parseInt(r.total_frags) };
            totalGames += parseInt(r.games);
            totalSeconds += parseInt(r.total_seconds);
            totalFrags += parseInt(r.total_frags);
        });

        results.push({
            label: p.label,
            years,
            totalGames,
            totalHours: (totalSeconds / 3600).toFixed(0),
            totalFrags,
            avgFrags: (totalFrags / totalGames).toFixed(1)
        });
    }

    // Sort by avg frags desc
    results.sort((a, b) => b.avgFrags - a.avgFrags);

    // Print
    results.forEach(r => {
        console.log(`${r.label.padEnd(12)} ${String(r.totalGames).padStart(5)} games   ${String(r.totalHours).padStart(4)} hrs   ${String(r.totalFrags).padStart(7)} frags   avg: ${r.avgFrags}/game`);
    });

    await pool.end();
}

main();
