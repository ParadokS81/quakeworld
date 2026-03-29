#!/usr/bin/env node
const pool = require('./db');

async function main() {
    // Book vs Commandos overall comparison
    const compare = await pool.query(`
        SELECT team,
               SUM(games::int) as games,
               SUM(wins::int) as wins,
               SUM(losses::int) as losses,
               ROUND(100.0 * SUM(wins::int) / NULLIF(SUM(games::int), 0), 1) as win_pct,
               ROUND((SUM(avg_frag_diff::numeric * games::int) / NULLIF(SUM(games::int), 0))::numeric, 1) as avg_frag_diff
        FROM v_team_map_stats
        WHERE team IN ('com', 'book') AND is_clan_game
        GROUP BY team ORDER BY win_pct DESC
    `);
    console.log('=== Book vs Commandos — Overall ===');
    console.table(compare.rows);

    // Commandos date range
    const dates = await pool.query(`
        SELECT MIN(played_at)::date as first_game, MAX(played_at)::date as last_game,
               COUNT(*) as total_games
        FROM v_team_games WHERE team = 'com' AND is_clan_game
    `);
    console.log('\nCommandos active period:');
    console.table(dates.rows);

    // Commandos map stats
    const maps = await pool.query(`
        SELECT map, games, wins, losses, win_pct, avg_frag_diff
        FROM v_team_map_stats WHERE team = 'com' AND is_clan_game AND games::int >= 2
        ORDER BY games DESC
    `);
    console.log('\nCommandos — Map strength (clan):');
    console.table(maps.rows);

    // Commandos roster
    const roster = await pool.query(`
        SELECT player, games, win_pct, avg_eff, avg_dmg, avg_frags, avg_deaths, avg_ttd
        FROM v_roster_stats WHERE team = 'com' AND is_clan_game AND games::int >= 3
        ORDER BY games DESC
    `);
    console.log('\nCommandos — Roster (clan, 3+ games):');
    console.table(roster.rows);

    // Commandos top opponents
    const opp = await pool.query(`
        SELECT opponent, games, wins, losses, win_pct, avg_frag_diff
        FROM v_opponent_record WHERE team = 'com' AND is_clan_game AND games::int >= 3
        ORDER BY games DESC LIMIT 10
    `);
    console.log('\nCommandos — Top opponents:');
    console.table(opp.rows);

    // Milton's stats in Book vs Commandos
    const milton = await pool.query(`
        SELECT team, games, win_pct, avg_eff, avg_dmg, avg_frags, avg_deaths, avg_ttd
        FROM v_roster_stats
        WHERE player = 'Milton' AND is_clan_game AND team IN ('com', 'book')
        ORDER BY games DESC
    `);
    console.log('\nMilton — Book vs Commandos:');
    console.table(milton.rows);

    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
