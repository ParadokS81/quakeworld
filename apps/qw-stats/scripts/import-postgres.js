#!/usr/bin/env node
/**
 * QW Stats → PostgreSQL Import (4on4 only)
 *
 * Reads ktxstats JSON files from qw-stats/data/games/
 * Imports only 4on4 games (8 players, duration >= 600s) into PostgreSQL.
 *
 * Run: node qw-stats/scripts/import-postgres.js
 * Prerequisites: npm install pg
 *
 * PostgreSQL: configure via .env (see ../.env.example)
 */

const fs = require('fs');
const path = require('path');
const pool = require('./db');

const GAMES_DIR = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, '..', 'data', 'games');

// ─── QW Character Encoding ─────────────────────────────────────────
const QW_CHAR_LOOKUP = {
    0:'=', 2:'=', 5:'\u2022', 10:' ', 14:'\u2022', 15:'\u2022',
    16:'[', 17:']', 18:'0', 19:'1', 20:'2', 21:'3', 22:'4',
    23:'5', 24:'6', 25:'7', 26:'8', 27:'9', 28:'\u2022',
    29:'=', 30:'=', 31:'='
};

function qwToAscii(name) {
    if (!name) return '';
    return Array.from(name).map(ch => {
        let code = ch.charCodeAt(0);
        if (code >= 128) code -= 128;
        if (code >= 32) return String.fromCharCode(code);
        return QW_CHAR_LOOKUP[code] || '?';
    }).join('').trim();
}

function normalizePlayerName(asciiName) {
    return asciiName.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ─── Schema ──────────────────────────────────────────────────────────
async function createSchema(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            demo_sha256 TEXT UNIQUE NOT NULL,
            played_at TIMESTAMPTZ,
            map TEXT NOT NULL,
            hostname TEXT,
            matchtag TEXT,
            duration INTEGER NOT NULL,
            timelimit INTEGER,
            team_a TEXT NOT NULL,
            team_b TEXT NOT NULL,
            team_a_ascii TEXT NOT NULL,
            team_b_ascii TEXT NOT NULL,
            team_a_frags INTEGER NOT NULL DEFAULT 0,
            team_b_frags INTEGER NOT NULL DEFAULT 0,
            is_clan_game BOOLEAN NOT NULL DEFAULT false
        );

        CREATE TABLE IF NOT EXISTS game_players (
            id SERIAL PRIMARY KEY,
            game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
            player_name_raw TEXT,
            player_name_ascii TEXT,
            player_name_normalized TEXT NOT NULL,
            team TEXT NOT NULL,
            team_ascii TEXT NOT NULL,
            ping INTEGER NOT NULL DEFAULT 0,
            login TEXT,

            -- Core stats
            frags INTEGER NOT NULL DEFAULT 0,
            kills INTEGER NOT NULL DEFAULT 0,
            deaths INTEGER NOT NULL DEFAULT 0,
            tk INTEGER NOT NULL DEFAULT 0,
            suicides INTEGER NOT NULL DEFAULT 0,
            spawn_frags INTEGER NOT NULL DEFAULT 0,

            -- Damage
            dmg_given INTEGER NOT NULL DEFAULT 0,
            dmg_taken INTEGER NOT NULL DEFAULT 0,
            dmg_team INTEGER NOT NULL DEFAULT 0,
            dmg_self INTEGER NOT NULL DEFAULT 0,
            dmg_enemy_weapons INTEGER NOT NULL DEFAULT 0,
            taken_to_die REAL NOT NULL DEFAULT 0,

            -- Streaks
            spree_max INTEGER NOT NULL DEFAULT 0,
            spree_quad INTEGER NOT NULL DEFAULT 0,

            -- Speed
            speed_avg REAL NOT NULL DEFAULT 0,
            speed_max REAL NOT NULL DEFAULT 0,

            -- Weapons: sg
            sg_attacks INTEGER NOT NULL DEFAULT 0,
            sg_hits INTEGER NOT NULL DEFAULT 0,
            sg_acc REAL NOT NULL DEFAULT 0,
            sg_dmg INTEGER NOT NULL DEFAULT 0,

            -- Weapons: rl
            rl_attacks INTEGER NOT NULL DEFAULT 0,
            rl_hits INTEGER NOT NULL DEFAULT 0,
            rl_acc REAL NOT NULL DEFAULT 0,
            rl_dmg INTEGER NOT NULL DEFAULT 0,

            -- Weapons: lg
            lg_attacks INTEGER NOT NULL DEFAULT 0,
            lg_hits INTEGER NOT NULL DEFAULT 0,
            lg_acc REAL NOT NULL DEFAULT 0,
            lg_dmg INTEGER NOT NULL DEFAULT 0,

            -- Weapons: gl
            gl_attacks INTEGER NOT NULL DEFAULT 0,
            gl_hits INTEGER NOT NULL DEFAULT 0,
            gl_dmg INTEGER NOT NULL DEFAULT 0,

            -- Weapons: ssg
            ssg_attacks INTEGER NOT NULL DEFAULT 0,
            ssg_hits INTEGER NOT NULL DEFAULT 0,
            ssg_dmg INTEGER NOT NULL DEFAULT 0,

            -- Weapon transfers
            xfer_rl INTEGER NOT NULL DEFAULT 0,
            xfer_lg INTEGER NOT NULL DEFAULT 0,

            -- Items
            health_100 INTEGER NOT NULL DEFAULT 0,
            ya_took INTEGER NOT NULL DEFAULT 0,
            ya_time INTEGER NOT NULL DEFAULT 0,
            ra_took INTEGER NOT NULL DEFAULT 0,
            ra_time INTEGER NOT NULL DEFAULT 0,
            ga_took INTEGER NOT NULL DEFAULT 0,
            ga_time INTEGER NOT NULL DEFAULT 0,
            quad_took INTEGER NOT NULL DEFAULT 0,
            quad_time INTEGER NOT NULL DEFAULT 0,
            pent_took INTEGER NOT NULL DEFAULT 0,
            pent_time INTEGER NOT NULL DEFAULT 0,
            ring_took INTEGER NOT NULL DEFAULT 0,
            ring_time INTEGER NOT NULL DEFAULT 0,

            -- Result
            won BOOLEAN NOT NULL DEFAULT false
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_gp_game_id ON game_players(game_id);
        CREATE INDEX IF NOT EXISTS idx_gp_player ON game_players(player_name_normalized);
        CREATE INDEX IF NOT EXISTS idx_gp_team ON game_players(team);
        CREATE INDEX IF NOT EXISTS idx_games_map ON games(map);
        CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at);
        CREATE INDEX IF NOT EXISTS idx_games_teams ON games(team_a_ascii, team_b_ascii);
        CREATE INDEX IF NOT EXISTS idx_games_clan ON games(is_clan_game);

        -- Composite indexes for common H2H queries
        CREATE INDEX IF NOT EXISTS idx_games_clan_map ON games(is_clan_game, map);
        CREATE INDEX IF NOT EXISTS idx_gp_player_game ON game_players(player_name_normalized, game_id);
        CREATE INDEX IF NOT EXISTS idx_gp_team_ascii ON game_players(team_ascii);
    `);

    console.log('✓ Schema created');
}

// ─── Import ──────────────────────────────────────────────────────────
const GENERIC_TEAMS = new Set(['blue', 'red', 'green', 'yellow', '', 'team1', 'team2']);

function parseGame(filePath, fileName) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    // Filter: must have players
    if (!data.players || data.players.length < 2) return null;

    // Filter bogus players (ping === 0)
    const validPlayers = data.players.filter(p => p.ping !== 0);

    // Filter: must be 4on4 (8 valid players)
    if (validPlayers.length !== 8) return null;

    // Filter: must be team mode
    if (data.mode !== 'team') return null;

    // Filter: must be at least 10 minutes
    if (!data.duration || data.duration < 600) return null;

    // Must have two teams
    const teams = data.teams || [];
    if (teams.length < 2) return null;

    const teamA = teams[0];
    const teamB = teams[1];

    // Calculate team frags
    const teamFrags = {};
    for (const p of validPlayers) {
        const t = p.team || '';
        teamFrags[t] = (teamFrags[t] || 0) + (p.stats?.frags || 0);
    }
    const teamAFrags = teamFrags[teamA] || 0;
    const teamBFrags = teamFrags[teamB] || 0;

    const isClanGame = teamA && teamB &&
        !GENERIC_TEAMS.has(teamA.toLowerCase()) &&
        !GENERIC_TEAMS.has(teamB.toLowerCase());

    const winningTeam = teamAFrags > teamBFrags ? teamA :
                        teamBFrags > teamAFrags ? teamB : null;

    const demoSha = fileName.replace('.mvd.ktxstats.json', '');

    // Parse date — ktxstats format: "2025-05-19 18:20:27 +0000"
    let playedAt = null;
    if (data.date) {
        try { playedAt = new Date(data.date).toISOString(); } catch (e) { /* skip */ }
    }

    const game = {
        demo_sha256: demoSha,
        played_at: playedAt,
        map: data.map || 'unknown',
        hostname: data.hostname || null,
        matchtag: data.matchtag || null,
        duration: data.duration,
        timelimit: data.tl || null,
        team_a: teamA,
        team_b: teamB,
        team_a_ascii: qwToAscii(teamA).toLowerCase(),
        team_b_ascii: qwToAscii(teamB).toLowerCase(),
        team_a_frags: teamAFrags,
        team_b_frags: teamBFrags,
        is_clan_game: isClanGame,
    };

    const players = validPlayers.map(p => {
        const asciiName = qwToAscii(p.name || '');
        const normalizedName = normalizePlayerName(asciiName);
        const w = p.weapons || {};
        const items = p.items || {};
        const stats = p.stats || {};
        const dmg = p.dmg || {};

        const sg = w.sg || {};
        const rl = w.rl || {};
        const lg = w.lg || {};
        const gl = w.gl || {};
        const ssg = w.ssg || {};

        const sgAtk = sg.acc?.attacks || 0;
        const sgHit = sg.acc?.hits || 0;
        const rlAtk = rl.acc?.attacks || 0;
        const rlHit = rl.acc?.hits || 0;
        const lgAtk = lg.acc?.attacks || 0;
        const lgHit = lg.acc?.hits || 0;

        return {
            player_name_raw: p.name || '',
            player_name_ascii: asciiName,
            player_name_normalized: normalizedName,
            team: p.team || '',
            team_ascii: qwToAscii(p.team || '').toLowerCase(),
            ping: p.ping || 0,
            login: p.login || '',
            frags: stats.frags || 0,
            kills: stats.kills || 0,
            deaths: stats.deaths || 0,
            tk: stats.tk || 0,
            suicides: stats.suicides || 0,
            spawn_frags: stats['spawn-frags'] || 0,
            dmg_given: dmg.given || 0,
            dmg_taken: dmg.taken || 0,
            dmg_team: dmg.team || 0,
            dmg_self: dmg.self || 0,
            dmg_enemy_weapons: dmg['enemy-weapons'] || 0,
            taken_to_die: dmg['taken-to-die'] || 0,
            spree_max: p.spree?.max || 0,
            spree_quad: p.spree?.quad || 0,
            speed_avg: p.speed?.avg || 0,
            speed_max: p.speed?.max || 0,
            sg_attacks: sgAtk,
            sg_hits: sgHit,
            sg_acc: sgAtk > 0 ? Math.round(1000 * sgHit / sgAtk) / 10 : 0,
            sg_dmg: sg.damage?.enemy || 0,
            rl_attacks: rlAtk,
            rl_hits: rlHit,
            rl_acc: rlAtk > 0 ? Math.round(1000 * rlHit / rlAtk) / 10 : 0,
            rl_dmg: rl.damage?.enemy || 0,
            lg_attacks: lgAtk,
            lg_hits: lgHit,
            lg_acc: lgAtk > 0 ? Math.round(1000 * lgHit / lgAtk) / 10 : 0,
            lg_dmg: lg.damage?.enemy || 0,
            gl_attacks: gl.acc?.attacks || 0,
            gl_hits: gl.acc?.hits || 0,
            gl_dmg: gl.damage?.enemy || 0,
            ssg_attacks: ssg.acc?.attacks || 0,
            ssg_hits: ssg.acc?.hits || 0,
            ssg_dmg: ssg.damage?.enemy || 0,
            xfer_rl: p.xferRL || 0,
            xfer_lg: p.xferLG || 0,
            health_100: items.health_100?.took || 0,
            ya_took: items.ya?.took || 0,
            ya_time: items.ya?.time || 0,
            ra_took: items.ra?.took || 0,
            ra_time: items.ra?.time || 0,
            ga_took: items.ga?.took || 0,
            ga_time: items.ga?.time || 0,
            quad_took: items.q?.took || 0,
            quad_time: items.q?.time || 0,
            pent_took: items.p?.took || 0,
            pent_time: items.p?.time || 0,
            ring_took: items.r?.took || 0,
            ring_time: items.r?.time || 0,
            won: p.team === winningTeam,
        };
    });

    return { game, players };
}

// ─── Bulk Insert (multi-row VALUES) ──────────────────────────────────

const GAME_COLS = ['demo_sha256','played_at','map','hostname','matchtag','duration','timelimit',
    'team_a','team_b','team_a_ascii','team_b_ascii','team_a_frags','team_b_frags','is_clan_game'];
const GAME_N = GAME_COLS.length; // 14

function gameValues(g) {
    return [g.demo_sha256, g.played_at, g.map, g.hostname, g.matchtag, g.duration, g.timelimit,
        g.team_a, g.team_b, g.team_a_ascii, g.team_b_ascii, g.team_a_frags, g.team_b_frags, g.is_clan_game];
}

const PLAYER_COLS = ['game_id','player_name_raw','player_name_ascii','player_name_normalized',
    'team','team_ascii','ping','login',
    'frags','kills','deaths','tk','suicides','spawn_frags',
    'dmg_given','dmg_taken','dmg_team','dmg_self','dmg_enemy_weapons','taken_to_die',
    'spree_max','spree_quad','speed_avg','speed_max',
    'sg_attacks','sg_hits','sg_acc','sg_dmg','rl_attacks','rl_hits','rl_acc','rl_dmg',
    'lg_attacks','lg_hits','lg_acc','lg_dmg','gl_attacks','gl_hits','gl_dmg',
    'ssg_attacks','ssg_hits','ssg_dmg','xfer_rl','xfer_lg',
    'health_100','ya_took','ya_time','ra_took','ra_time','ga_took','ga_time',
    'quad_took','quad_time','pent_took','pent_time','ring_took','ring_time','won'];
const PLAYER_N = PLAYER_COLS.length; // 58

function playerValues(gameId, p) {
    return [gameId, p.player_name_raw, p.player_name_ascii, p.player_name_normalized,
        p.team, p.team_ascii, p.ping, p.login,
        p.frags, p.kills, p.deaths, p.tk, p.suicides, p.spawn_frags,
        p.dmg_given, p.dmg_taken, p.dmg_team, p.dmg_self, p.dmg_enemy_weapons, p.taken_to_die,
        p.spree_max, p.spree_quad, p.speed_avg, p.speed_max,
        p.sg_attacks, p.sg_hits, p.sg_acc, p.sg_dmg, p.rl_attacks, p.rl_hits, p.rl_acc, p.rl_dmg,
        p.lg_attacks, p.lg_hits, p.lg_acc, p.lg_dmg, p.gl_attacks, p.gl_hits, p.gl_dmg,
        p.ssg_attacks, p.ssg_hits, p.ssg_dmg, p.xfer_rl, p.xfer_lg,
        p.health_100, p.ya_took, p.ya_time, p.ra_took, p.ra_time, p.ga_took, p.ga_time,
        p.quad_took, p.quad_time, p.pent_took, p.pent_time, p.ring_took, p.ring_time, p.won];
}

function buildMultiInsert(table, cols, rowCount, colCount) {
    const placeholders = [];
    for (let i = 0; i < rowCount; i++) {
        const offset = i * colCount;
        const params = Array.from({length: colCount}, (_, j) => `$${offset + j + 1}`);
        placeholders.push(`(${params.join(',')})`);
    }
    return `INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders.join(',')}`;
}

async function bulkInsertGames(client, batch) {
    // Insert all games in one statement, return IDs
    const allValues = [];
    for (const { game } of batch) {
        allValues.push(...gameValues(game));
    }
    const sql = buildMultiInsert('games', GAME_COLS, batch.length, GAME_N)
        + ' ON CONFLICT (demo_sha256) DO NOTHING RETURNING id, demo_sha256';
    const res = await client.query(sql, allValues);

    // Map demo_sha256 -> game_id
    const idMap = {};
    for (const row of res.rows) {
        idMap[row.demo_sha256] = row.id;
    }
    return idMap;
}

async function bulkInsertPlayers(client, batch, idMap) {
    // Collect all player rows that have a game_id
    const allValues = [];
    let rowCount = 0;
    for (const { game, players } of batch) {
        const gameId = idMap[game.demo_sha256];
        if (!gameId) continue; // duplicate game, skipped
        for (const p of players) {
            allValues.push(...playerValues(gameId, p));
            rowCount++;
        }
    }
    if (rowCount === 0) return 0;

    const sql = buildMultiInsert('game_players', PLAYER_COLS, rowCount, PLAYER_N);
    await client.query(sql, allValues);
    return rowCount;
}

async function main() {
    console.log('QW Stats → PostgreSQL Import (4on4 only)\n');

    // Check games directory
    if (!fs.existsSync(GAMES_DIR)) {
        console.error(`Games directory not found: ${GAMES_DIR}`);
        console.error('Run the archive extraction first, or place ktxstats files in qw-stats/data/games/');
        process.exit(1);
    }

    const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} ktxstats files`);

    // Create schema
    const client = await pool.connect();
    try {
        await createSchema(client);

        // Check existing count
        const existing = await client.query('SELECT COUNT(*) as cnt FROM games');
        if (existing.rows[0].cnt > 0) {
            console.log(`Database already has ${existing.rows[0].cnt} games (will skip duplicates)`);
        }

        // Parse all files, filter to 4on4
        console.log('Parsing and filtering to 4on4...');
        let parsed = 0;
        let skipped = 0;
        let errors = 0;
        const batch = [];

        for (const fileName of files) {
            try {
                const result = parseGame(path.join(GAMES_DIR, fileName), fileName);
                if (result) {
                    batch.push(result);
                    parsed++;
                } else {
                    skipped++;
                }
            } catch (err) {
                errors++;
                if (errors <= 5) {
                    console.error(`  Error parsing ${fileName}: ${err.message}`);
                }
            }
        }

        console.log(`Parsed: ${parsed} 4on4 games, skipped: ${skipped}, errors: ${errors}`);

        // Drop indexes for fast bulk insert
        console.log('Dropping indexes for bulk insert...');
        await client.query(`
            DROP INDEX IF EXISTS idx_gp_game_id;
            DROP INDEX IF EXISTS idx_gp_player;
            DROP INDEX IF EXISTS idx_gp_team;
            DROP INDEX IF EXISTS idx_gp_team_ascii;
            DROP INDEX IF EXISTS idx_gp_player_game;
            DROP INDEX IF EXISTS idx_games_map;
            DROP INDEX IF EXISTS idx_games_played_at;
            DROP INDEX IF EXISTS idx_games_teams;
            DROP INDEX IF EXISTS idx_games_clan;
            DROP INDEX IF EXISTS idx_games_clan_map;
        `);

        // Bulk insert — 50 games per batch (50×14=700 game params, 400×58=23200 player params, under PG 65535 limit)
        const BATCH_SIZE = 50;
        let imported = 0;
        const startTime = Date.now();

        for (let i = 0; i < batch.length; i += BATCH_SIZE) {
            const chunk = batch.slice(i, i + BATCH_SIZE);

            await client.query('BEGIN');
            try {
                const idMap = await bulkInsertGames(client, chunk);
                await bulkInsertPlayers(client, chunk, idMap);
                await client.query('COMMIT');
                imported += Object.keys(idMap).length;

                if (imported % 1000 < BATCH_SIZE || i + BATCH_SIZE >= batch.length) {
                    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                    console.log(`  ${imported} / ${batch.length} games (${elapsed}s)`);
                }
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`  Batch error at ${i}: ${err.message}`);
            }
        }

        // Recreate indexes
        console.log('Recreating indexes...');
        await client.query(`
            CREATE INDEX idx_gp_game_id ON game_players(game_id);
            CREATE INDEX idx_gp_player ON game_players(player_name_normalized);
            CREATE INDEX idx_gp_team ON game_players(team);
            CREATE INDEX idx_gp_team_ascii ON game_players(team_ascii);
            CREATE INDEX idx_gp_player_game ON game_players(player_name_normalized, game_id);
            CREATE INDEX idx_games_map ON games(map);
            CREATE INDEX idx_games_played_at ON games(played_at);
            CREATE INDEX idx_games_teams ON games(team_a_ascii, team_b_ascii);
            CREATE INDEX idx_games_clan ON games(is_clan_game);
            CREATE INDEX idx_games_clan_map ON games(is_clan_game, map);
        `);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n✓ Import complete: ${imported} games in ${totalTime}s`);

        // Print summary
        const summary = await client.query(`
            SELECT
                COUNT(*) as total_games,
                COUNT(*) FILTER (WHERE is_clan_game) as clan_games,
                COUNT(*) FILTER (WHERE NOT is_clan_game) as mix_games,
                MIN(played_at) as earliest,
                MAX(played_at) as latest
            FROM games
        `);
        const s = summary.rows[0];
        console.log(`\n=== Database Summary ===`);
        console.log(`Total 4on4 games: ${s.total_games}`);
        console.log(`  Clan: ${s.clan_games}, Mix: ${s.mix_games}`);
        console.log(`  Date range: ${s.earliest?.toISOString().slice(0,10)} → ${s.latest?.toISOString().slice(0,10)}`);

        const maps = await client.query(`
            SELECT map, COUNT(*) as cnt,
                   COUNT(*) FILTER (WHERE is_clan_game) as clan
            FROM games GROUP BY map ORDER BY cnt DESC LIMIT 10
        `);
        console.log(`\n=== Maps ===`);
        for (const m of maps.rows) {
            console.log(`  ${m.map.padEnd(15)} ${String(m.cnt).padStart(4)} total, ${String(m.clan).padStart(4)} clan`);
        }

        const playerCount = await client.query(`
            SELECT COUNT(DISTINCT player_name_normalized) as cnt FROM game_players
        `);
        console.log(`\nUnique players: ${playerCount.rows[0].cnt}`);

    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
