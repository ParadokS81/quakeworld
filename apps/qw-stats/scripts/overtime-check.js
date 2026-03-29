const pool = require('./db');

async function main() {
    // First, see what duration/timelimit data looks like
    const stats = await pool.query(`
        SELECT
            count(*) as total,
            count(timelimit) as has_timelimit,
            min(duration) as min_dur,
            max(duration) as max_dur,
            avg(duration)::int as avg_dur,
            min(timelimit) as min_tl,
            max(timelimit) as max_tl
        FROM games WHERE is_clan_game = true
    `);
    console.log('Duration/timelimit stats:', stats.rows[0]);

    // Distribution of durations
    const dist = await pool.query(`
        SELECT
            CASE
                WHEN duration <= 1200 THEN '<=20min'
                WHEN duration <= 1500 THEN '20-25min'
                WHEN duration <= 1800 THEN '25-30min'
                ELSE '>30min'
            END as bucket,
            count(*) as games
        FROM games WHERE is_clan_game = true
        GROUP BY 1 ORDER BY min(duration)
    `);
    console.log('\nDuration distribution:');
    dist.rows.forEach(r => console.log(`  ${r.bucket.padEnd(10)} ${r.games} games`));

    // Games where duration significantly exceeds timelimit (overtime candidates)
    const overtime = await pool.query(`
        SELECT count(*) as ot_games
        FROM games
        WHERE is_clan_game = true
          AND timelimit > 0
          AND duration > timelimit * 60 + 30
    `);
    console.log('\nGames exceeding timelimit by >30s:', overtime.rows[0].ot_games);

    // Check that specific dm3 game
    const dm3game = await pool.query(`
        SELECT team_a_ascii, team_b_ascii, team_a_frags, team_b_frags,
               duration, timelimit, played_at,
               duration / 60 as minutes
        FROM games
        WHERE map = 'dm3' AND is_clan_game = true
        ORDER BY (team_a_frags + team_b_frags) DESC
        LIMIT 5
    `);
    console.log('\nTop 5 dm3 games by total frags:');
    dm3game.rows.forEach(r => {
        const ot = (r.timelimit > 0 && r.duration > r.timelimit * 60 + 30) ? ' ** OVERTIME **' : '';
        console.log(`  ${r.team_a_ascii} ${r.team_a_frags}-${r.team_b_frags} ${r.team_b_ascii}  dur=${r.minutes}min  tl=${r.timelimit}min  ${r.played_at.toISOString().slice(0,10)}${ot}`);
    });

    await pool.end();
}

main();
