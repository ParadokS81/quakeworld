#!/usr/bin/env node
const pool = require('./db');

async function main() {
    // Top clan teams by games played
    const teams = await pool.query(`
        SELECT team_ascii, COUNT(*) as games,
               SUM(CASE WHEN won THEN 1 ELSE 0 END) as wins
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE g.is_clan_game
        GROUP BY team_ascii
        ORDER BY games DESC LIMIT 15
    `);
    console.log('Top clan teams (ascii names):');
    console.table(teams.rows);

    // H2H example: book vs oeks
    const h2h = await pool.query(`
        SELECT g.map, COUNT(*) as games,
               SUM(CASE WHEN (team_a_ascii='book' AND team_a_frags > team_b_frags)
                         OR (team_b_ascii='book' AND team_b_frags > team_a_frags) THEN 1 ELSE 0 END) as book_wins,
               SUM(CASE WHEN (team_a_ascii='oeks' AND team_a_frags > team_b_frags)
                         OR (team_b_ascii='oeks' AND team_b_frags > team_a_frags) THEN 1 ELSE 0 END) as oeks_wins
        FROM games g
        WHERE is_clan_game
          AND ((team_a_ascii='book' AND team_b_ascii='oeks') OR (team_a_ascii='oeks' AND team_b_ascii='book'))
        GROUP BY g.map ORDER BY games DESC
    `);
    console.log('\nbook vs oeks H2H by map:');
    console.table(h2h.rows);

    // Book roster + participation
    const roster = await pool.query(`
        SELECT gp.player_name_ascii as player, COUNT(*) as games,
               ROUND(AVG(CASE WHEN kills+deaths>0 THEN 100.0*kills/(kills+deaths) ELSE 0 END),1) as eff,
               ROUND(AVG(dmg_given)) as avg_dmg,
               ROUND(100.0 * SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) / COUNT(*), 0) as win_pct
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE g.is_clan_game AND gp.team_ascii = 'book'
        GROUP BY gp.player_name_ascii
        ORDER BY games DESC
    `);
    console.log('\nBook roster (clan games):');
    console.table(roster.rows);

    await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
