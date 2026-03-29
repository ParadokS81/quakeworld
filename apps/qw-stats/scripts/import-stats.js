#!/usr/bin/env node
/**
 * QW Stats Import Pipeline
 *
 * Extracts games.7z, parses ktxstats JSON, imports into SQLite.
 * Run: node qw-stats/scripts/import-stats.js
 *
 * Prerequisites: npm install better-sqlite3, apt install p7zip-full
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');

const QW_STATS_ROOT = path.resolve(__dirname, "..");
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ARCHIVE_PATH = path.join(PROJECT_ROOT, 'assets', 'games.7z');
const EXTRACT_DIR = path.join(QW_STATS_ROOT, "data", "games");
const DB_PATH = path.join(QW_STATS_ROOT, "data", "qw-stats.db");

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

// ─── Step 1: Extract Archive ────────────────────────────────────────
function extractArchive() {
    if (fs.existsSync(EXTRACT_DIR)) {
        const files = fs.readdirSync(EXTRACT_DIR);
        if (files.length > 1000) {
            console.log(`✓ Already extracted (${files.length} files in ${EXTRACT_DIR})`);
            return;
        }
    }

    console.log('Extracting games.7z...');
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    execSync(`7z x "${ARCHIVE_PATH}" -o"${path.join(QW_STATS_ROOT, "data")}" -y`, {
        stdio: 'pipe',
        maxBuffer: 50 * 1024 * 1024
    });

    const files = fs.readdirSync(EXTRACT_DIR);
    console.log(`✓ Extracted ${files.length} files`);
}

// ─── Step 2: Create Database Schema ────────────────────────────────
function createSchema(db) {
    db.exec(`
        -- Match/game level data
        CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            demo_sha256 TEXT UNIQUE NOT NULL,
            date TEXT,
            map TEXT,
            hostname TEXT,
            mode TEXT,
            matchtag TEXT,
            duration INTEGER,
            timelimit INTEGER,
            team_a TEXT,
            team_b TEXT,
            team_a_frags INTEGER DEFAULT 0,
            team_b_frags INTEGER DEFAULT 0,
            player_count INTEGER DEFAULT 0,
            is_clan_game INTEGER DEFAULT 0
        );

        -- Per-player per-game stats (flattened from ktxstats)
        CREATE TABLE IF NOT EXISTS game_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            player_name_raw TEXT,
            player_name_ascii TEXT,
            player_name_normalized TEXT,
            team TEXT,
            ping INTEGER,
            login TEXT,

            -- Core stats
            frags INTEGER DEFAULT 0,
            kills INTEGER DEFAULT 0,
            deaths INTEGER DEFAULT 0,
            tk INTEGER DEFAULT 0,
            suicides INTEGER DEFAULT 0,
            spawn_frags INTEGER DEFAULT 0,

            -- Damage
            dmg_given INTEGER DEFAULT 0,
            dmg_taken INTEGER DEFAULT 0,
            dmg_team INTEGER DEFAULT 0,
            dmg_self INTEGER DEFAULT 0,
            dmg_enemy_weapons INTEGER DEFAULT 0,
            taken_to_die REAL DEFAULT 0,

            -- Streaks
            spree_max INTEGER DEFAULT 0,
            spree_quad INTEGER DEFAULT 0,

            -- Speed
            speed_avg REAL DEFAULT 0,
            speed_max REAL DEFAULT 0,

            -- Weapon accuracy (percentage, pre-calculated)
            sg_attacks INTEGER DEFAULT 0,
            sg_hits INTEGER DEFAULT 0,
            sg_acc REAL DEFAULT 0,
            sg_dmg INTEGER DEFAULT 0,

            rl_attacks INTEGER DEFAULT 0,
            rl_hits INTEGER DEFAULT 0,
            rl_acc REAL DEFAULT 0,
            rl_dmg INTEGER DEFAULT 0,

            lg_attacks INTEGER DEFAULT 0,
            lg_hits INTEGER DEFAULT 0,
            lg_acc REAL DEFAULT 0,
            lg_dmg INTEGER DEFAULT 0,

            gl_attacks INTEGER DEFAULT 0,
            gl_hits INTEGER DEFAULT 0,
            gl_dmg INTEGER DEFAULT 0,

            ssg_attacks INTEGER DEFAULT 0,
            ssg_hits INTEGER DEFAULT 0,
            ssg_dmg INTEGER DEFAULT 0,

            -- Weapon transfers
            xfer_rl INTEGER DEFAULT 0,
            xfer_lg INTEGER DEFAULT 0,

            -- Items (took count)
            health_100 INTEGER DEFAULT 0,
            ya_took INTEGER DEFAULT 0,
            ya_time INTEGER DEFAULT 0,
            ra_took INTEGER DEFAULT 0,
            ra_time INTEGER DEFAULT 0,
            ga_took INTEGER DEFAULT 0,
            ga_time INTEGER DEFAULT 0,
            quad_took INTEGER DEFAULT 0,
            quad_time INTEGER DEFAULT 0,
            pent_took INTEGER DEFAULT 0,
            pent_time INTEGER DEFAULT 0,
            ring_took INTEGER DEFAULT 0,
            ring_time INTEGER DEFAULT 0,

            -- Result context
            won INTEGER DEFAULT 0,

            FOREIGN KEY (game_id) REFERENCES games(id)
        );

        -- Player identity mapping (for merging aliases)
        CREATE TABLE IF NOT EXISTS player_identities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            canonical_name TEXT UNIQUE NOT NULL,
            display_name TEXT
        );

        -- Alias table: maps normalized names to canonical identities
        CREATE TABLE IF NOT EXISTS player_aliases (
            normalized_name TEXT PRIMARY KEY,
            identity_id INTEGER NOT NULL,
            FOREIGN KEY (identity_id) REFERENCES player_identities(id)
        );

        -- Indexes for fast queries
        CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id);
        CREATE INDEX IF NOT EXISTS idx_game_players_name ON game_players(player_name_normalized);
        CREATE INDEX IF NOT EXISTS idx_game_players_team ON game_players(team);
        CREATE INDEX IF NOT EXISTS idx_games_map ON games(map);
        CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
        CREATE INDEX IF NOT EXISTS idx_games_teams ON games(team_a, team_b);
        CREATE INDEX IF NOT EXISTS idx_games_clan ON games(is_clan_game);
    `);

    console.log('✓ Schema created');
}

// ─── Step 3: Parse & Import Games ──────────────────────────────────
function importGames(db) {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM games').get().c;
    if (existingCount > 0) {
        console.log(`✓ Database already has ${existingCount} games, skipping import`);
        return;
    }

    const files = fs.readdirSync(EXTRACT_DIR).filter(f => f.endsWith('.json'));
    console.log(`Importing ${files.length} games...`);

    const insertGame = db.prepare(`
        INSERT INTO games (demo_sha256, date, map, hostname, mode, matchtag, duration, timelimit,
                           team_a, team_b, team_a_frags, team_b_frags, player_count, is_clan_game)
        VALUES (@demo_sha256, @date, @map, @hostname, @mode, @matchtag, @duration, @timelimit,
                @team_a, @team_b, @team_a_frags, @team_b_frags, @player_count, @is_clan_game)
    `);

    const insertPlayer = db.prepare(`
        INSERT INTO game_players (game_id, player_name_raw, player_name_ascii, player_name_normalized,
            team, ping, login, frags, kills, deaths, tk, suicides, spawn_frags,
            dmg_given, dmg_taken, dmg_team, dmg_self, dmg_enemy_weapons, taken_to_die,
            spree_max, spree_quad, speed_avg, speed_max,
            sg_attacks, sg_hits, sg_acc, sg_dmg,
            rl_attacks, rl_hits, rl_acc, rl_dmg,
            lg_attacks, lg_hits, lg_acc, lg_dmg,
            gl_attacks, gl_hits, gl_dmg,
            ssg_attacks, ssg_hits, ssg_dmg,
            xfer_rl, xfer_lg,
            health_100, ya_took, ya_time, ra_took, ra_time, ga_took, ga_time,
            quad_took, quad_time, pent_took, pent_time, ring_took, ring_time,
            won)
        VALUES (@game_id, @player_name_raw, @player_name_ascii, @player_name_normalized,
            @team, @ping, @login, @frags, @kills, @deaths, @tk, @suicides, @spawn_frags,
            @dmg_given, @dmg_taken, @dmg_team, @dmg_self, @dmg_enemy_weapons, @taken_to_die,
            @spree_max, @spree_quad, @speed_avg, @speed_max,
            @sg_attacks, @sg_hits, @sg_acc, @sg_dmg,
            @rl_attacks, @rl_hits, @rl_acc, @rl_dmg,
            @lg_attacks, @lg_hits, @lg_acc, @lg_dmg,
            @gl_attacks, @gl_hits, @gl_dmg,
            @ssg_attacks, @ssg_hits, @ssg_dmg,
            @xfer_rl, @xfer_lg,
            @health_100, @ya_took, @ya_time, @ra_took, @ra_time, @ga_took, @ga_time,
            @quad_took, @quad_time, @pent_took, @pent_time, @ring_took, @ring_time,
            @won)
    `);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Use a transaction for bulk insert performance
    const importBatch = db.transaction((batch) => {
        for (const { filePath, fileName } of batch) {
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(raw);

                // Skip non-4on4 or weird games
                if (!data.players || data.players.length < 2) {
                    skipped++;
                    continue;
                }

                // Filter bogus players (ping === 0)
                const validPlayers = data.players.filter(p => p.ping !== 0);
                if (validPlayers.length < 2) {
                    skipped++;
                    continue;
                }

                // Extract demo SHA from filename
                const demoSha = fileName.replace('.mvd.ktxstats.json', '');

                // Determine teams
                const teams = data.teams || [];
                const teamA = teams[0] || '';
                const teamB = teams[1] || '';

                // Calculate team frags
                const teamFrags = {};
                for (const p of validPlayers) {
                    const t = p.team || '';
                    teamFrags[t] = (teamFrags[t] || 0) + (p.stats?.frags || 0);
                }
                const teamAFrags = teamFrags[teamA] || 0;
                const teamBFrags = teamFrags[teamB] || 0;

                // Is this a clan game? (not blue/red, not empty)
                const genericTeams = ['blue', 'red', 'green', 'yellow', '', 'team1', 'team2'];
                const isClanGame = teamA && teamB &&
                    !genericTeams.includes(teamA.toLowerCase()) &&
                    !genericTeams.includes(teamB.toLowerCase()) ? 1 : 0;

                const gameResult = insertGame.run({
                    demo_sha256: demoSha,
                    date: data.date || null,
                    map: data.map || null,
                    hostname: data.hostname || null,
                    mode: data.mode || null,
                    matchtag: data.matchtag || null,
                    duration: data.duration || null,
                    timelimit: data.tl || null,
                    team_a: teamA,
                    team_b: teamB,
                    team_a_frags: teamAFrags,
                    team_b_frags: teamBFrags,
                    player_count: validPlayers.length,
                    is_clan_game: isClanGame
                });

                const gameId = gameResult.lastInsertRowid;

                // Determine winning team
                const winningTeam = teamAFrags > teamBFrags ? teamA :
                                    teamBFrags > teamAFrags ? teamB : null;

                // Import each player
                for (const p of validPlayers) {
                    const asciiName = qwToAscii(p.name || '');
                    const normalizedName = normalizePlayerName(asciiName);
                    const w = p.weapons || {};
                    const items = p.items || {};
                    const stats = p.stats || {};
                    const dmg = p.dmg || {};

                    // Weapon accessors
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

                    insertPlayer.run({
                        game_id: gameId,
                        player_name_raw: p.name || '',
                        player_name_ascii: asciiName,
                        player_name_normalized: normalizedName,
                        team: p.team || '',
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
                        sg_dmg: (sg.damage?.enemy || 0),
                        rl_attacks: rlAtk,
                        rl_hits: rlHit,
                        rl_acc: rlAtk > 0 ? Math.round(1000 * rlHit / rlAtk) / 10 : 0,
                        rl_dmg: (rl.damage?.enemy || 0),
                        lg_attacks: lgAtk,
                        lg_hits: lgHit,
                        lg_acc: lgAtk > 0 ? Math.round(1000 * lgHit / lgAtk) / 10 : 0,
                        lg_dmg: (lg.damage?.enemy || 0),
                        gl_attacks: gl.acc?.attacks || 0,
                        gl_hits: gl.acc?.hits || 0,
                        gl_dmg: (gl.damage?.enemy || 0),
                        ssg_attacks: ssg.acc?.attacks || 0,
                        ssg_hits: ssg.acc?.hits || 0,
                        ssg_dmg: (ssg.damage?.enemy || 0),
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
                        won: (p.team === winningTeam) ? 1 : 0
                    });
                }

                imported++;
            } catch (err) {
                errors++;
                if (errors <= 5) {
                    console.error(`  Error in ${fileName}: ${err.message}`);
                }
            }
        }
    });

    // Process in batches of 500 for transaction efficiency
    const BATCH_SIZE = 500;
    const allFiles = files.map(f => ({
        filePath: path.join(EXTRACT_DIR, f),
        fileName: f
    }));

    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const batch = allFiles.slice(i, i + BATCH_SIZE);
        importBatch(batch);

        if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= allFiles.length) {
            console.log(`  Progress: ${Math.min(i + BATCH_SIZE, allFiles.length)} / ${allFiles.length}`);
        }
    }

    console.log(`✓ Imported ${imported} games (${skipped} skipped, ${errors} errors)`);
}

// ─── Step 4: Build Player Identities ───────────────────────────────
function buildPlayerIdentities(db) {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM player_identities').get().c;
    if (existingCount > 0) {
        console.log(`✓ Player identities already built (${existingCount} players), skipping`);
        return;
    }

    console.log('Building player identities...');

    // Get all unique normalized names with their game counts
    const names = db.prepare(`
        SELECT player_name_normalized, player_name_ascii,
               COUNT(*) as game_count
        FROM game_players
        WHERE player_name_normalized != ''
        GROUP BY player_name_normalized
        ORDER BY game_count DESC
    `).all();

    console.log(`  Found ${names.length} unique player names`);

    const insertIdentity = db.prepare(
        'INSERT INTO player_identities (canonical_name, display_name) VALUES (?, ?)'
    );
    const insertAlias = db.prepare(
        'INSERT INTO player_aliases (normalized_name, identity_id) VALUES (?, ?)'
    );

    const createIdentities = db.transaction(() => {
        for (const row of names) {
            const result = insertIdentity.run(row.player_name_normalized, row.player_name_ascii);
            insertAlias.run(row.player_name_normalized, result.lastInsertRowid);
        }
    });

    createIdentities();
    console.log(`✓ Created ${names.length} player identities`);
}

// ─── Step 5: Quick Stats Summary ───────────────────────────────────
function printSummary(db) {
    console.log('\n══════════════════════════════════════════');
    console.log('  QW STATS DATABASE SUMMARY');
    console.log('══════════════════════════════════════════\n');

    const gameCount = db.prepare('SELECT COUNT(*) as c FROM games').get().c;
    const playerRecords = db.prepare('SELECT COUNT(*) as c FROM game_players').get().c;
    const uniquePlayers = db.prepare('SELECT COUNT(DISTINCT player_name_normalized) as c FROM game_players WHERE player_name_normalized != ""').get().c;
    const clanGames = db.prepare('SELECT COUNT(*) as c FROM games WHERE is_clan_game = 1').get().c;

    console.log(`Total games:        ${gameCount}`);
    console.log(`Total player slots:  ${playerRecords}`);
    console.log(`Unique players:     ${uniquePlayers}`);
    console.log(`Clan games:         ${clanGames} (${Math.round(100*clanGames/gameCount)}%)`);

    // Date range
    const dateRange = db.prepare('SELECT MIN(date) as earliest, MAX(date) as latest FROM games WHERE date IS NOT NULL').get();
    console.log(`Date range:         ${dateRange.earliest?.substring(0,10)} → ${dateRange.latest?.substring(0,10)}`);

    // Top maps
    console.log('\n── Top Maps ──────────────────────────────');
    const maps = db.prepare(`
        SELECT map, COUNT(*) as cnt FROM games
        GROUP BY map ORDER BY cnt DESC LIMIT 15
    `).all();
    for (const m of maps) {
        console.log(`  ${(m.map || '?').padEnd(15)} ${m.cnt} games`);
    }

    // Top teams (from clan games)
    console.log('\n── Top Clan Tags (most games) ─────────────');
    const teamCounts = db.prepare(`
        SELECT team, COUNT(*) as cnt
        FROM game_players gp
        JOIN games g ON g.id = gp.game_id
        WHERE g.is_clan_game = 1 AND team != ''
        GROUP BY team
        ORDER BY cnt DESC
        LIMIT 20
    `).all();
    for (const t of teamCounts) {
        const asciiTeam = qwToAscii(t.team);
        console.log(`  ${asciiTeam.padEnd(15)} ${t.cnt} player-games`);
    }

    // Top players by games played (min 20 games)
    console.log('\n── Top Players by Games Played ────────────');
    const topPlayers = db.prepare(`
        SELECT player_name_ascii, player_name_normalized,
               COUNT(*) as games,
               ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) as avg_eff,
               ROUND(AVG(dmg_given), 0) as avg_dmg,
               ROUND(AVG(taken_to_die), 0) as avg_ttd,
               ROUND(AVG(CASE WHEN sg_attacks > 0 THEN sg_acc ELSE NULL END), 1) as avg_sg,
               ROUND(AVG(CASE WHEN rl_attacks > 0 THEN rl_acc ELSE NULL END), 1) as avg_rl,
               SUM(won) as wins
        FROM game_players
        WHERE player_name_normalized != ''
        GROUP BY player_name_normalized
        HAVING games >= 20
        ORDER BY games DESC
        LIMIT 30
    `).all();

    console.log('  ' + 'Name'.padEnd(18) + 'Games'.padStart(6) + 'Eff%'.padStart(6) +
                'AvgDmg'.padStart(8) + 'TTD'.padStart(6) + 'SG%'.padStart(6) +
                'RL%'.padStart(6) + 'WinRate'.padStart(8));
    console.log('  ' + '─'.repeat(64));
    for (const p of topPlayers) {
        const winRate = p.games > 0 ? Math.round(100 * p.wins / p.games) : 0;
        console.log('  ' +
            (p.player_name_ascii || '?').padEnd(18) +
            String(p.games).padStart(6) +
            String(p.avg_eff || 0).padStart(6) +
            String(p.avg_dmg || 0).padStart(8) +
            String(p.avg_ttd || 0).padStart(6) +
            String(p.avg_sg || '-').padStart(6) +
            String(p.avg_rl || '-').padStart(6) +
            (winRate + '%').padStart(8)
        );
    }

    // Quick top 20 by efficiency (min 50 games)
    console.log('\n── Top 20 by Efficiency (min 50 games) ────');
    const topEff = db.prepare(`
        SELECT player_name_ascii, player_name_normalized,
               COUNT(*) as games,
               ROUND(AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) as avg_eff,
               ROUND(AVG(dmg_given), 0) as avg_dmg,
               ROUND(AVG(taken_to_die), 0) as avg_ttd,
               SUM(won) as wins
        FROM game_players
        WHERE player_name_normalized != ''
        GROUP BY player_name_normalized
        HAVING games >= 50
        ORDER BY avg_eff DESC
        LIMIT 20
    `).all();

    console.log('  ' + 'Name'.padEnd(18) + 'Games'.padStart(6) + 'Eff%'.padStart(6) +
                'AvgDmg'.padStart(8) + 'TTD'.padStart(6) + 'WinRate'.padStart(8));
    console.log('  ' + '─'.repeat(52));
    for (const p of topEff) {
        const winRate = p.games > 0 ? Math.round(100 * p.wins / p.games) : 0;
        console.log('  ' +
            (p.player_name_ascii || '?').padEnd(18) +
            String(p.games).padStart(6) +
            String(p.avg_eff || 0).padStart(6) +
            String(p.avg_dmg || 0).padStart(8) +
            String(p.avg_ttd || 0).padStart(6) +
            (winRate + '%').padStart(8)
        );
    }

    console.log('\n── Stat Distributions (all players, min 20 games) ──');
    const distributions = db.prepare(`
        WITH player_avgs AS (
            SELECT player_name_normalized,
                   COUNT(*) as games,
                   AVG(CASE WHEN kills + deaths > 0 THEN 100.0 * kills / (kills + deaths) ELSE 0 END) as eff,
                   AVG(dmg_given) as dpm,
                   AVG(taken_to_die) as ttd,
                   AVG(CASE WHEN sg_attacks > 50 THEN sg_acc ELSE NULL END) as sg,
                   AVG(CASE WHEN rl_attacks > 10 THEN rl_acc ELSE NULL END) as rl
            FROM game_players
            WHERE player_name_normalized != ''
            GROUP BY player_name_normalized
            HAVING games >= 20
        )
        SELECT
            COUNT(*) as player_count,
            ROUND(MIN(eff), 1) as eff_min,
            ROUND(AVG(eff), 1) as eff_avg,
            ROUND(MAX(eff), 1) as eff_max,
            ROUND(MIN(dpm), 0) as dpm_min,
            ROUND(AVG(dpm), 0) as dpm_avg,
            ROUND(MAX(dpm), 0) as dpm_max,
            ROUND(MIN(ttd), 0) as ttd_min,
            ROUND(AVG(ttd), 0) as ttd_avg,
            ROUND(MAX(ttd), 0) as ttd_max,
            ROUND(MIN(sg), 1) as sg_min,
            ROUND(AVG(sg), 1) as sg_avg,
            ROUND(MAX(sg), 1) as sg_max,
            ROUND(MIN(rl), 1) as rl_min,
            ROUND(AVG(rl), 1) as rl_avg,
            ROUND(MAX(rl), 1) as rl_max
        FROM player_avgs
    `).get();

    console.log(`  Players with 20+ games: ${distributions.player_count}`);
    console.log(`  Efficiency:  ${distributions.eff_min}% — ${distributions.eff_avg}% — ${distributions.eff_max}%  (min / avg / max)`);
    console.log(`  Avg Damage:  ${distributions.dpm_min} — ${distributions.dpm_avg} — ${distributions.dpm_max}`);
    console.log(`  Taken-to-Die: ${distributions.ttd_min} — ${distributions.ttd_avg} — ${distributions.ttd_max}`);
    console.log(`  SG Accuracy: ${distributions.sg_min}% — ${distributions.sg_avg}% — ${distributions.sg_max}%`);
    console.log(`  RL Accuracy: ${distributions.rl_min}% — ${distributions.rl_avg}% — ${distributions.rl_max}%`);

    console.log('\n══════════════════════════════════════════');
    console.log(`  Database: ${DB_PATH}`);
    console.log('══════════════════════════════════════════\n');
}

// ─── Main ──────────────────────────────────────────────────────────
function main() {
    console.log('QW Stats Import Pipeline\n');

    // Step 1: Extract
    extractArchive();

    // Step 2: Create DB
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Step 3: Schema
    createSchema(db);

    // Step 4: Import
    importGames(db);

    // Step 5: Player identities
    buildPlayerIdentities(db);

    // Step 6: Summary
    printSummary(db);

    db.close();
}

main();
