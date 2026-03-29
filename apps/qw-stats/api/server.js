const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { runUpdate, getLastResult } = require('./updater');

const app = express();
const PORT = process.env.PORT || 3100;
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL || '900') * 1000; // default 15 min

// CORS - allow all origins (API is behind Tailscale/Cloudflare)
app.use(cors());

app.use(express.json());

// PostgreSQL connection (inside Docker network, postgres is at phoenix-postgres:5432)
const pool = new Pool({
    host: process.env.PG_HOST || 'phoenix-postgres',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'quake_stats',
    user: process.env.PG_USER || 'phoenix',
    password: process.env.PG_PASSWORD || '',
    max: 5,
});

// ─── Helpers ─────────────────────────────────────────────────────
// Parse comma-separated team tags into lowercase array (Slice 5.3)
function parseTags(param) {
    if (!param) return [];
    return param.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

// ─── Auto-updater: fetch new games from QWHub ────────────────────
let _updateRunning = false;

async function scheduledUpdate() {
    if (_updateRunning) {
        console.log('[updater] Skipping — previous run still active');
        return;
    }
    _updateRunning = true;
    try {
        await runUpdate(pool);
    } catch (err) {
        console.error('[updater] Error:', err.message);
    } finally {
        _updateRunning = false;
    }
}

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'qw-stats-api' });
});

// Sync status — when did the last update run and what happened
app.get('/api/sync-status', (req, res) => {
    const last = getLastResult();
    res.json({
        lastSync: last || null,
        updateIntervalSec: UPDATE_INTERVAL / 1000,
        updateRunning: _updateRunning,
    });
});

// Manual sync trigger
app.post('/api/sync-now', async (req, res) => {
    if (_updateRunning) {
        return res.status(409).json({ error: 'Update already running' });
    }
    scheduledUpdate(); // fire and forget
    res.json({ status: 'started' });
});

// ============================================================
// H2H: Direct matchup history between two teams
// GET /api/h2h?teamA=book&teamB=oeks&map=dm2&months=3&limit=10
// ============================================================
app.get('/api/h2h', async (req, res) => {
    try {
        const { teamA, teamB, map, months = 3, limit = 10 } = req.query;
        if (!teamA || !teamB) {
            return res.status(400).json({ error: 'teamA and teamB required' });
        }

        // Slice 5.3: Accept comma-separated tag arrays
        const tagsA = parseTags(teamA);
        const tagsB = parseTags(teamB);
        if (tagsA.length === 0 || tagsB.length === 0) {
            return res.status(400).json({ error: 'teamA and teamB required' });
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(months));

        let query = `
            SELECT g.id, g.played_at, g.map,
                   g.team_a_ascii, g.team_b_ascii,
                   g.team_a_frags, g.team_b_frags,
                   g.demo_sha256
            FROM games g
            WHERE g.is_clan_game
              AND ((g.team_a_ascii = ANY($1::text[]) AND g.team_b_ascii = ANY($2::text[]))
                OR (g.team_a_ascii = ANY($2::text[]) AND g.team_b_ascii = ANY($1::text[])))
              AND g.played_at >= $3
        `;
        const params = [tagsA, tagsB, cutoff.toISOString()];

        if (map) {
            query += ` AND g.map = $4`;
            params.push(map.toLowerCase());
        }

        query += ` ORDER BY g.played_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        // Add win/loss from teamA's perspective
        const games = result.rows.map(row => {
            const isTeamASide = tagsA.includes(row.team_a_ascii);
            const teamAFrags = isTeamASide ? row.team_a_frags : row.team_b_frags;
            const teamBFrags = isTeamASide ? row.team_b_frags : row.team_a_frags;
            return {
                id: row.id,
                playedAt: row.played_at,
                map: row.map,
                teamAFrags,
                teamBFrags,
                result: teamAFrags > teamBFrags ? 'W' : teamAFrags < teamBFrags ? 'L' : 'D',
                demoSha256: row.demo_sha256,
            };
        });

        res.json({ teamA: tagsA[0], teamB: tagsB[0], games, total: games.length });
    } catch (err) {
        console.error('H2H error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// FORM: Recent results for a single team (against everyone)
// GET /api/form?team=book&map=dm3&months=3&limit=10
// ============================================================
app.get('/api/form', async (req, res) => {
    try {
        const { team, map, months = 3, limit = 10 } = req.query;
        if (!team) {
            return res.status(400).json({ error: 'team required' });
        }

        // Slice 5.3: Accept comma-separated tag array
        const tags = parseTags(team);
        if (tags.length === 0) {
            return res.status(400).json({ error: 'team required' });
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(months));

        let query = `
            SELECT g.id, g.played_at, g.map,
                   g.team_a_ascii, g.team_b_ascii,
                   g.team_a_frags, g.team_b_frags,
                   g.demo_sha256
            FROM games g
            WHERE g.is_clan_game
              AND (g.team_a_ascii = ANY($1::text[]) OR g.team_b_ascii = ANY($1::text[]))
              AND g.played_at >= $2
        `;
        const params = [tags, cutoff.toISOString()];

        if (map) {
            query += ` AND g.map = $3`;
            params.push(map.toLowerCase());
        }

        query += ` ORDER BY g.played_at DESC LIMIT $${params.length + 1}`;
        params.push(parseInt(limit));

        const result = await pool.query(query, params);

        const games = result.rows.map(row => {
            const isTeamA = tags.includes(row.team_a_ascii);
            const teamFrags = isTeamA ? row.team_a_frags : row.team_b_frags;
            const oppFrags = isTeamA ? row.team_b_frags : row.team_a_frags;
            const opponent = isTeamA ? row.team_b_ascii : row.team_a_ascii;
            return {
                id: row.id,
                playedAt: row.played_at,
                map: row.map,
                teamFrags,
                oppFrags,
                opponent,
                result: teamFrags > oppFrags ? 'W' : teamFrags < oppFrags ? 'L' : 'D',
                demoSha256: row.demo_sha256,
            };
        });

        res.json({ team: tags[0], games, total: games.length });
    } catch (err) {
        console.error('Form error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// OPPONENTS: Unique opponents with match counts for a team
// GET /api/opponents?team=book,sr&months=3
// ============================================================
app.get('/api/opponents', async (req, res) => {
    try {
        const { team, months = 3 } = req.query;
        if (!team) {
            return res.status(400).json({ error: 'team required' });
        }

        const tags = parseTags(team);
        if (tags.length === 0) {
            return res.status(400).json({ error: 'team required' });
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(months));

        const result = await pool.query(`
            SELECT
                CASE
                    WHEN team_a_ascii = ANY($1::text[]) THEN team_b_ascii
                    ELSE team_a_ascii
                END as opponent,
                COUNT(*) as total,
                SUM(CASE
                    WHEN (team_a_ascii = ANY($1::text[]) AND team_a_frags > team_b_frags)
                      OR (team_b_ascii = ANY($1::text[]) AND team_b_frags > team_a_frags)
                    THEN 1 ELSE 0
                END) as wins,
                SUM(CASE
                    WHEN (team_a_ascii = ANY($1::text[]) AND team_a_frags < team_b_frags)
                      OR (team_b_ascii = ANY($1::text[]) AND team_b_frags < team_a_frags)
                    THEN 1 ELSE 0
                END) as losses
            FROM games
            WHERE is_clan_game
              AND (team_a_ascii = ANY($1::text[]) OR team_b_ascii = ANY($1::text[]))
              AND played_at >= $2
            GROUP BY opponent
            ORDER BY total DESC
        `, [tags, cutoff.toISOString()]);

        const opponents = result.rows.map(row => ({
            tag: row.opponent,
            total: parseInt(row.total),
            wins: parseInt(row.wins),
            losses: parseInt(row.losses),
        }));

        res.json({ team: tags[0], opponents });
    } catch (err) {
        console.error('Opponents error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// MAPS: Per-map win rates for a team
// GET /api/maps?team=book&months=6
// Optionally compare: GET /api/maps?team=book&vsTeam=oeks&months=6
// ============================================================
app.get('/api/maps', async (req, res) => {
    try {
        const { team, vsTeam, months = 6 } = req.query;
        if (!team) {
            return res.status(400).json({ error: 'team required' });
        }

        // Slice 5.3: Accept comma-separated tag arrays
        const tags = parseTags(team);
        if (tags.length === 0) {
            return res.status(400).json({ error: 'team required' });
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(months));

        let query = `
            SELECT g.map,
                   COUNT(*) as games,
                   SUM(CASE
                       WHEN (g.team_a_ascii = ANY($1::text[]) AND g.team_a_frags > g.team_b_frags)
                         OR (g.team_b_ascii = ANY($1::text[]) AND g.team_b_frags > g.team_a_frags)
                       THEN 1 ELSE 0 END) as wins,
                   SUM(CASE
                       WHEN (g.team_a_ascii = ANY($1::text[]) AND g.team_a_frags < g.team_b_frags)
                         OR (g.team_b_ascii = ANY($1::text[]) AND g.team_b_frags < g.team_a_frags)
                       THEN 1 ELSE 0 END) as losses,
                   ROUND(AVG(CASE
                       WHEN g.team_a_ascii = ANY($1::text[]) THEN g.team_a_frags - g.team_b_frags
                       ELSE g.team_b_frags - g.team_a_frags
                   END), 1) as avg_frag_diff
            FROM games g
            WHERE g.is_clan_game
              AND (g.team_a_ascii = ANY($1::text[]) OR g.team_b_ascii = ANY($1::text[]))
              AND g.played_at >= $2
        `;
        const params = [tags, cutoff.toISOString()];

        if (vsTeam) {
            const vsTags = parseTags(vsTeam);
            if (vsTags.length > 0) {
                query += ` AND (g.team_a_ascii = ANY($3::text[]) OR g.team_b_ascii = ANY($3::text[]))`;
                params.push(vsTags);
            }
        }

        query += `
            GROUP BY g.map
            ORDER BY COUNT(*) DESC
        `;

        const result = await pool.query(query, params);

        const maps = result.rows.map(row => ({
            map: row.map,
            games: parseInt(row.games),
            wins: parseInt(row.wins),
            losses: parseInt(row.losses),
            winRate: row.games > 0 ? Math.round(100 * row.wins / row.games) : 0,
            avgFragDiff: parseFloat(row.avg_frag_diff) || 0,
        }));

        res.json({ team: tags[0], maps, totalGames: maps.reduce((s, m) => s + m.games, 0) });
    } catch (err) {
        console.error('Maps error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// ROSTER: Player activity for a team
// GET /api/roster?team=book&months=3
// ============================================================
app.get('/api/roster', async (req, res) => {
    try {
        const { team, months = 3 } = req.query;
        if (!team) {
            return res.status(400).json({ error: 'team required' });
        }

        // Slice 5.3: Accept comma-separated tag array
        const tags = parseTags(team);
        if (tags.length === 0) {
            return res.status(400).json({ error: 'team required' });
        }

        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - parseInt(months));

        // Count total distinct team games in this period
        const totalResult = await pool.query(`
            SELECT COUNT(DISTINCT g.id) as total_games
            FROM games g
            JOIN game_players gp ON g.id = gp.game_id
            WHERE g.is_clan_game
              AND gp.team_ascii = ANY($1::text[])
              AND g.played_at >= $2
        `, [tags, cutoff.toISOString()]);
        const totalGames = parseInt(totalResult.rows[0]?.total_games || 0);

        const result = await pool.query(`
            SELECT gp.player_name_ascii as player,
                   COUNT(*) as games,
                   SUM(CASE WHEN gp.won THEN 1 ELSE 0 END) as wins,
                   ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0
                       THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) as eff,
                   ROUND(AVG(gp.dmg_given)) as avg_dmg,
                   MAX(g.played_at) as last_played
            FROM game_players gp
            JOIN games g ON g.id = gp.game_id
            WHERE g.is_clan_game
              AND gp.team_ascii = ANY($1::text[])
              AND g.played_at >= $2
            GROUP BY gp.player_name_ascii
            ORDER BY COUNT(*) DESC
        `, [tags, cutoff.toISOString()]);

        const players = result.rows.map(row => ({
            player: row.player,
            games: parseInt(row.games),
            wins: parseInt(row.wins),
            winRate: row.games > 0 ? Math.round(100 * row.wins / row.games) : 0,
            eff: parseFloat(row.eff),
            avgDmg: parseInt(row.avg_dmg),
            lastPlayed: row.last_played,
        }));

        res.json({ team: tags[0], players, totalPlayers: players.length, totalGames });
    } catch (err) {
        console.error('Roster error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`QW Stats API running on port ${PORT}`);
    console.log(`Auto-update every ${UPDATE_INTERVAL / 1000}s (set UPDATE_INTERVAL env to change)`);

    // Run first update 10s after startup (let DB connections warm up)
    setTimeout(scheduledUpdate, 10_000);

    // Then every UPDATE_INTERVAL
    setInterval(scheduledUpdate, UPDATE_INTERVAL);
});
