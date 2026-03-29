/**
 * explore-data.js — Data quality exploration for ranking & identity work
 * Run: node qw-stats/scripts/explore-data.js
 */

const pool = require('./db');

async function run() {
    const client = await pool.connect();
    try {
        // ─── 1. OVERALL DATASET SHAPE ───
        console.log('\n═══ DATASET OVERVIEW ═══\n');

        const totals = await client.query(`
            SELECT
                COUNT(*) AS total_games,
                COUNT(*) FILTER (WHERE is_clan_game) AS clan_games,
                COUNT(*) FILTER (WHERE NOT is_clan_game) AS mix_games,
                MIN(played_at) AS earliest,
                MAX(played_at) AS latest
            FROM games
        `);
        console.log('Games:', totals.rows[0]);

        const playerCount = await client.query(`
            SELECT COUNT(DISTINCT player_name_normalized) AS unique_names
            FROM game_players
        `);
        console.log('Unique player names:', playerCount.rows[0].unique_names);

        // ─── 2. PLAYER NAME DISTRIBUTION ───
        console.log('\n═══ PLAYER GAME COUNT DISTRIBUTION ═══\n');

        const distrib = await client.query(`
            WITH player_counts AS (
                SELECT player_name_normalized, COUNT(*) AS games
                FROM game_players
                GROUP BY player_name_normalized
            )
            SELECT
                COUNT(*) FILTER (WHERE games = 1) AS "1_game",
                COUNT(*) FILTER (WHERE games BETWEEN 2 AND 4) AS "2-4_games",
                COUNT(*) FILTER (WHERE games BETWEEN 5 AND 9) AS "5-9_games",
                COUNT(*) FILTER (WHERE games BETWEEN 10 AND 24) AS "10-24_games",
                COUNT(*) FILTER (WHERE games BETWEEN 25 AND 49) AS "25-49_games",
                COUNT(*) FILTER (WHERE games BETWEEN 50 AND 99) AS "50-99_games",
                COUNT(*) FILTER (WHERE games BETWEEN 100 AND 199) AS "100-199_games",
                COUNT(*) FILTER (WHERE games BETWEEN 200 AND 499) AS "200-499_games",
                COUNT(*) FILTER (WHERE games >= 500) AS "500+_games"
            FROM player_counts
        `);
        console.log('Distribution:', distrib.rows[0]);

        // ─── 3. TOP 30 MOST ACTIVE PLAYERS ───
        console.log('\n═══ TOP 30 MOST ACTIVE PLAYERS ═══\n');

        const topPlayers = await client.query(`
            SELECT
                player_name_normalized AS name,
                COUNT(*) AS games,
                COUNT(*) FILTER (WHERE won) AS wins,
                ROUND(100.0 * COUNT(*) FILTER (WHERE won) / COUNT(*), 1) AS win_pct,
                ROUND(AVG(CASE WHEN kills + deaths > 0
                    THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) AS avg_eff,
                ROUND(AVG(dmg_given)) AS avg_dmg,
                COUNT(DISTINCT team_ascii) AS teams_used
            FROM game_players
            GROUP BY player_name_normalized
            ORDER BY games DESC
            LIMIT 30
        `);
        console.table(topPlayers.rows);

        // ─── 4. TEAM NAME ANALYSIS ───
        console.log('\n═══ TEAM NAME ANALYSIS ═══\n');

        // Most common team names (including mix/pickup indicators)
        const teamNames = await client.query(`
            SELECT
                team_ascii,
                COUNT(*) AS appearances,
                COUNT(DISTINCT game_id) AS games
            FROM game_players
            GROUP BY team_ascii
            ORDER BY appearances DESC
            LIMIT 50
        `);
        console.log('Top 50 team tags:');
        console.table(teamNames.rows);

        // ─── 5. "MIX" TEAM NAMES ───
        console.log('\n═══ GAMES WITH "MIX" IN TEAM NAME ═══\n');

        const mixTeams = await client.query(`
            SELECT
                team_a_ascii, team_b_ascii,
                is_clan_game,
                COUNT(*) AS games
            FROM games
            WHERE team_a_ascii LIKE '%mix%' OR team_b_ascii LIKE '%mix%'
            GROUP BY team_a_ascii, team_b_ascii, is_clan_game
            ORDER BY games DESC
            LIMIT 20
        `);
        console.table(mixTeams.rows);

        // ─── 6. CLAN GAME FALSE POSITIVES? ───
        console.log('\n═══ POTENTIALLY MISCLASSIFIED "CLAN" GAMES ═══\n');
        console.log('(is_clan_game=true but team names suggest mix/pickup)\n');

        const falsePositives = await client.query(`
            SELECT
                team_a_ascii, team_b_ascii,
                COUNT(*) AS games
            FROM games
            WHERE is_clan_game = true
            AND (
                team_a_ascii LIKE '%mix%'
                OR team_b_ascii LIKE '%mix%'
                OR team_a_ascii LIKE '%pracc%'
                OR team_b_ascii LIKE '%pracc%'
                OR team_a_ascii LIKE '%prac%'
                OR team_b_ascii LIKE '%prac%'
                OR team_a_ascii LIKE '%stand%'
                OR team_b_ascii LIKE '%stand%'
            )
            GROUP BY team_a_ascii, team_b_ascii
            ORDER BY games DESC
            LIMIT 30
        `);
        console.table(falsePositives.rows);

        // ─── 7. SHORT / SUSPICIOUS TEAM NAMES ───
        console.log('\n═══ SHORT TEAM NAMES (1-2 chars) MARKED AS CLAN ═══\n');

        const shortTeams = await client.query(`
            SELECT
                team_a_ascii, team_b_ascii,
                COUNT(*) AS games
            FROM games
            WHERE is_clan_game = true
            AND (LENGTH(team_a_ascii) <= 2 OR LENGTH(team_b_ascii) <= 2)
            GROUP BY team_a_ascii, team_b_ascii
            ORDER BY games DESC
            LIMIT 30
        `);
        console.table(shortTeams.rows);

        // ─── 8. NAMES THAT LOOK LIKE DUPLICATES ───
        console.log('\n═══ POTENTIAL DUPLICATE NAMES (same prefix) ═══\n');

        const potentialDupes = await client.query(`
            WITH player_names AS (
                SELECT DISTINCT player_name_normalized AS name
                FROM game_players
            )
            SELECT a.name AS name_a, b.name AS name_b
            FROM player_names a
            JOIN player_names b ON a.name < b.name
            WHERE LEFT(a.name, 4) = LEFT(b.name, 4)
            AND LENGTH(a.name) >= 4
            AND LENGTH(b.name) >= 4
            ORDER BY a.name, b.name
            LIMIT 60
        `);
        console.log(`Found ${potentialDupes.rows.length} pairs sharing 4-char prefix (showing first 60):`);
        for (const row of potentialDupes.rows) {
            console.log(`  ${row.name_a.padEnd(20)} ↔ ${row.name_b}`);
        }

        // ─── 9. PLAYERS WITH MANY DIFFERENT TEAM TAGS ───
        console.log('\n═══ PLAYERS WITH MOST TEAM TAGS (potential mercenaries or aliases) ═══\n');

        const manyTeams = await client.query(`
            SELECT
                player_name_normalized AS name,
                COUNT(DISTINCT team_ascii) AS team_count,
                COUNT(*) AS total_games,
                ARRAY_AGG(DISTINCT team_ascii ORDER BY team_ascii) AS teams
            FROM game_players
            GROUP BY player_name_normalized
            HAVING COUNT(DISTINCT team_ascii) >= 5
            ORDER BY team_count DESC
            LIMIT 20
        `);
        for (const row of manyTeams.rows) {
            console.log(`${row.name.padEnd(20)} ${row.team_count} teams, ${row.total_games} games: ${row.teams.join(', ')}`);
        }

        // ─── 10. CO-OCCURRENCE CHECK ───
        console.log('\n═══ CO-OCCURRENCE STATS ═══\n');

        const cooccur = await client.query(`
            SELECT COUNT(*) AS total_cannot_link_pairs
            FROM (
                SELECT DISTINCT
                    LEAST(a.player_name_normalized, b.player_name_normalized) AS p1,
                    GREATEST(a.player_name_normalized, b.player_name_normalized) AS p2
                FROM game_players a
                JOIN game_players b ON a.game_id = b.game_id
                WHERE a.player_name_normalized < b.player_name_normalized
            ) pairs
        `);
        console.log('Total cannot-link pairs (appeared in same game):', cooccur.rows[0].total_cannot_link_pairs);

        const totalPossible = playerCount.rows[0].unique_names;
        const totalPairs = (totalPossible * (totalPossible - 1)) / 2;
        console.log('Total possible pairs:', totalPairs);
        console.log('Cannot-link coverage:',
            (100 * cooccur.rows[0].total_cannot_link_pairs / totalPairs).toFixed(1) + '%');

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(err => {
    console.error('Error:', err);
    pool.end();
    process.exit(1);
});
