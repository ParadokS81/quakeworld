#!/usr/bin/env node
/**
 * Create SQL views for H2H queries on PostgreSQL.
 *
 * Views:
 *   v_team_games       — Normalized team perspective (one row per team per game)
 *   v_team_form        — Recent results for a team
 *   v_team_map_stats   — Win rate and frag differential per map
 *   v_roster_stats     — Player participation and stats within a team
 *   v_opponent_record  — Record vs each opponent
 *
 * Run: node qw-stats/scripts/create-views.js
 */

const pool = require('./db');

const VIEWS = [
    // ── v_team_games ──────────────────────────────────────────────────
    // Normalizes games into a "team perspective" — one row per team per game.
    // This is the foundation view: every game appears twice (once for each team).
    // Makes all downstream queries simpler since you always filter by `team`.
    {
        name: 'v_team_games',
        sql: `
CREATE OR REPLACE VIEW v_team_games AS
SELECT
    g.id AS game_id,
    g.played_at,
    g.map,
    g.hostname,
    g.matchtag,
    g.duration,
    g.is_clan_game,
    -- "Our" team
    g.team_a_ascii AS team,
    g.team_a_frags AS team_frags,
    -- Opponent
    g.team_b_ascii AS opponent,
    g.team_b_frags AS opponent_frags,
    -- Result
    g.team_a_frags - g.team_b_frags AS frag_diff,
    CASE
        WHEN g.team_a_frags > g.team_b_frags THEN 'W'
        WHEN g.team_a_frags < g.team_b_frags THEN 'L'
        ELSE 'D'
    END AS result
FROM games g
UNION ALL
SELECT
    g.id AS game_id,
    g.played_at,
    g.map,
    g.hostname,
    g.matchtag,
    g.duration,
    g.is_clan_game,
    g.team_b_ascii AS team,
    g.team_b_frags AS team_frags,
    g.team_a_ascii AS opponent,
    g.team_a_frags AS opponent_frags,
    g.team_b_frags - g.team_a_frags AS frag_diff,
    CASE
        WHEN g.team_b_frags > g.team_a_frags THEN 'W'
        WHEN g.team_b_frags < g.team_a_frags THEN 'L'
        ELSE 'D'
    END AS result
FROM games g`
    },

    // ── v_team_map_stats ──────────────────────────────────────────────
    // Per-team, per-map aggregate: games, wins, losses, avg frag diff.
    // Usage: WHERE team = 'book' AND is_clan_game
    {
        name: 'v_team_map_stats',
        sql: `
CREATE OR REPLACE VIEW v_team_map_stats AS
SELECT
    team,
    map,
    is_clan_game,
    COUNT(*) AS games,
    SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses,
    SUM(CASE WHEN result = 'D' THEN 1 ELSE 0 END) AS draws,
    ROUND(100.0 * SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct,
    ROUND(AVG(frag_diff), 1) AS avg_frag_diff,
    ROUND(AVG(team_frags), 0) AS avg_frags,
    ROUND(AVG(opponent_frags), 0) AS avg_opp_frags,
    MAX(played_at) AS last_played
FROM v_team_games
GROUP BY team, map, is_clan_game`
    },

    // ── v_opponent_record ─────────────────────────────────────────────
    // Per-team record vs each opponent (clan games only makes most sense).
    // Usage: WHERE team = 'book'
    {
        name: 'v_opponent_record',
        sql: `
CREATE OR REPLACE VIEW v_opponent_record AS
SELECT
    team,
    opponent,
    is_clan_game,
    COUNT(*) AS games,
    SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses,
    ROUND(100.0 * SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct,
    ROUND(AVG(frag_diff), 1) AS avg_frag_diff,
    MIN(played_at) AS first_played,
    MAX(played_at) AS last_played
FROM v_team_games
GROUP BY team, opponent, is_clan_game`
    },

    // ── v_roster_stats ────────────────────────────────────────────────
    // Per-player stats within a team. Covers clan and mix games separately.
    // Usage: WHERE team = 'book' AND is_clan_game
    {
        name: 'v_roster_stats',
        sql: `
CREATE OR REPLACE VIEW v_roster_stats AS
SELECT
    gp.team_ascii AS team,
    g.is_clan_game,
    gp.player_name_ascii AS player,
    COUNT(*) AS games,
    SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) AS wins,
    ROUND(100.0 * SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_pct,
    ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END)::numeric, 1) AS avg_eff,
    ROUND(AVG(dmg_given)::numeric) AS avg_dmg,
    ROUND(AVG(frags)::numeric, 1) AS avg_frags,
    ROUND(AVG(deaths)::numeric, 1) AS avg_deaths,
    ROUND(AVG(taken_to_die)::numeric, 1) AS avg_ttd,
    ROUND(AVG(CASE WHEN sg_attacks > 0 THEN sg_acc ELSE NULL END)::numeric, 1) AS avg_sg_acc,
    ROUND(AVG(CASE WHEN rl_attacks > 0 THEN rl_acc ELSE NULL END)::numeric, 1) AS avg_rl_acc,
    ROUND(AVG(ra_time + ya_time)::numeric, 0) AS avg_armor_time,
    MIN(g.played_at) AS first_game,
    MAX(g.played_at) AS last_game
FROM game_players gp
JOIN games g ON g.id = gp.game_id
GROUP BY gp.team_ascii, g.is_clan_game, gp.player_name_ascii`
    },
];

async function main() {
    console.log('Creating H2H views...\n');

    for (const view of VIEWS) {
        try {
            await pool.query(view.sql);
            console.log(`  ✓ ${view.name}`);
        } catch (err) {
            console.error(`  ✗ ${view.name}: ${err.message}`);
        }
    }

    // ── Smoke test the views ────────────────────────────────────────
    console.log('\n── Smoke Tests ──\n');

    // 1. Team form (last 10 clan games for "book")
    const form = await pool.query(`
        SELECT played_at::date AS date, map, opponent,
               team_frags || '-' || opponent_frags AS score, result, frag_diff
        FROM v_team_games
        WHERE team = 'book' AND is_clan_game
        ORDER BY played_at DESC
        LIMIT 10
    `);
    console.log('Book — Last 10 clan games:');
    console.table(form.rows);

    // 2. Map strength
    const maps = await pool.query(`
        SELECT map, games, wins, losses, win_pct, avg_frag_diff, avg_frags, avg_opp_frags
        FROM v_team_map_stats
        WHERE team = 'book' AND is_clan_game AND games >= 3
        ORDER BY games DESC
    `);
    console.log('\nBook — Map strength (clan, 3+ games):');
    console.table(maps.rows);

    // 3. Roster
    const roster = await pool.query(`
        SELECT player, games, win_pct, avg_eff, avg_dmg, avg_frags, avg_deaths, avg_ttd
        FROM v_roster_stats
        WHERE team = 'book' AND is_clan_game AND games >= 5
        ORDER BY games DESC
    `);
    console.log('\nBook — Roster (clan, 5+ games):');
    console.table(roster.rows);

    // 4. Opponent breakdown
    const opponents = await pool.query(`
        SELECT opponent, games, wins, losses, win_pct, avg_frag_diff
        FROM v_opponent_record
        WHERE team = 'book' AND is_clan_game AND games >= 3
        ORDER BY games DESC
        LIMIT 15
    `);
    console.log('\nBook — Opponent record (clan, 3+ games):');
    console.table(opponents.rows);

    // 5. H2H deep dive: book vs oeks (per map)
    const h2h = await pool.query(`
        SELECT tg.map, COUNT(*) AS games,
               SUM(CASE WHEN tg.result = 'W' THEN 1 ELSE 0 END) AS book_wins,
               SUM(CASE WHEN tg.result = 'L' THEN 1 ELSE 0 END) AS oeks_wins,
               ROUND(AVG(tg.frag_diff), 1) AS avg_book_diff
        FROM v_team_games tg
        WHERE tg.team = 'book' AND tg.opponent = 'oeks' AND tg.is_clan_game
        GROUP BY tg.map
        ORDER BY games DESC
    `);
    console.log('\nBook vs oeks — H2H by map:');
    console.table(h2h.rows);

    await pool.end();
    console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
