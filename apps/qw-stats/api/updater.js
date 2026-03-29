/**
 * QW Stats — Incremental Updater Module
 *
 * Fetches new 4on4 games from QWHub Supabase, downloads ktxstats,
 * and imports them into PostgreSQL.
 *
 * Used by:
 *   - server.js (scheduled every 15 min)
 *   - scripts/update-games.js (manual CLI)
 *
 * Requires a pg Pool to be passed in — does NOT create its own connection.
 */

// ─── Config ───────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3Boa2pmb21pbmlteHp0amlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY5Mzg1NjMsImV4cCI6MjAxMjUxNDU2M30.NN6hjlEW-qB4Og9hWAVlgvUdwrbBO13s8OkAJuBGVbo';

const PAGE_SIZE = 100;
const KTXSTATS_CONCURRENCY = 5;
const INSERT_BATCH_SIZE = 20;

// ─── QW Character Encoding ───────────────────────────────────────
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

// ─── Generic teams ───────────────────────────────────────────────
const GENERIC_TEAMS = new Set([
    'blue', 'red', 'green', 'yellow', '', 'team1', 'team2',
    'pink', 'brown', 'brwn', 'brw', 'orange', 'oran', 'orng',
    'violet', 'vio', 'purple', 'white', 'black', 'teal', 'gold',
    'wine', 'plum', 'mint', 'snow', 'lime', 'sky', 'skyb', 'skyblue',
    'bleu', 'grn', 'gree', 'yllw', 'ylw', 'brow',
    'mix', 'mix1', 'mix2', 'm1x',
    't1', 't2', '1', '2', '11', '0', '000',
    'lol', 'asdf', 'xxx', 'xx', 'x', 'zzz', 'zz', '666', '69',
    '99', '999', '123', '1337', '4', '7777', '555', '98',
    'pug', 'quad', 'pent', 'test', 'afk'
]);

// ─── Supabase Fetch ──────────────────────────────────────────────

async function fetchSupabasePage(since, offset = 0) {
    const params = new URLSearchParams({
        select: 'id,timestamp,mode,map,demo_sha256',
        mode: 'eq.4on4',
        'demo_sha256': 'not.is.null',
        order: 'timestamp.asc',
        limit: String(PAGE_SIZE),
        offset: String(offset),
    });

    if (since) {
        params.set('timestamp', `gt.${since}`);
    }

    const url = `${SUPABASE_URL}?${params}`;
    const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY }
    });

    if (!res.ok) {
        throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    }

    return res.json();
}

async function fetchAllNewGames(since) {
    const allGames = [];
    let offset = 0;

    while (true) {
        const page = await fetchSupabasePage(since, offset);
        allGames.push(...page);
        if (page.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return allGames;
}

// ─── ktxstats Fetch ──────────────────────────────────────────────

function getKtxstatsUrl(demoSha256) {
    const prefix = demoSha256.substring(0, 3);
    return `https://d.quake.world/${prefix}/${demoSha256}.mvd.ktxstats.json`;
}

async function fetchKtxstats(demoSha256) {
    const url = getKtxstatsUrl(demoSha256);
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

async function fetchKtxstatsBatch(games) {
    const results = new Map();
    const queue = [...games];

    async function worker() {
        while (queue.length > 0) {
            const game = queue.shift();
            try {
                const data = await fetchKtxstats(game.demo_sha256);
                if (data) results.set(game.demo_sha256, data);
            } catch (_) { /* skip, retry next run */ }
        }
    }

    const workers = Array.from(
        { length: Math.min(KTXSTATS_CONCURRENCY, games.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results;
}

// ─── Parse ktxstats ──────────────────────────────────────────────

function parseKtxstats(data, demoSha256) {
    if (!data.players || data.players.length < 2) return null;

    const validPlayers = data.players.filter(p => p.ping !== 0);
    if (validPlayers.length !== 8) return null;
    if (data.mode !== 'team') return null;
    if (!data.duration || data.duration < 600) return null;

    const teams = data.teams || [];
    if (teams.length < 2) return null;

    const teamA = teams[0];
    const teamB = teams[1];

    const teamFrags = {};
    for (const p of validPlayers) {
        const t = p.team || '';
        teamFrags[t] = (teamFrags[t] || 0) + (p.stats?.frags || 0);
    }
    const teamAFrags = teamFrags[teamA] || 0;
    const teamBFrags = teamFrags[teamB] || 0;

    const teamAAscii = qwToAscii(teamA).toLowerCase();
    const teamBAscii = qwToAscii(teamB).toLowerCase();
    const isClanGame = teamA && teamB &&
        !GENERIC_TEAMS.has(teamAAscii) &&
        !GENERIC_TEAMS.has(teamBAscii);

    const winningTeam = teamAFrags > teamBFrags ? teamA :
                        teamBFrags > teamAFrags ? teamB : null;

    let playedAt = null;
    if (data.date) {
        try { playedAt = new Date(data.date).toISOString(); } catch (_) {}
    }

    const game = {
        demo_sha256: demoSha256,
        played_at: playedAt,
        map: data.map || 'unknown',
        hostname: data.hostname || null,
        matchtag: data.matchtag || null,
        duration: data.duration,
        timelimit: data.tl || null,
        team_a: teamA,
        team_b: teamB,
        team_a_ascii: teamAAscii,
        team_b_ascii: teamBAscii,
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
        const sg = w.sg || {}, rl = w.rl || {}, lg = w.lg || {};
        const gl = w.gl || {}, ssg = w.ssg || {};

        const sgAtk = sg.acc?.attacks || 0, sgHit = sg.acc?.hits || 0;
        const rlAtk = rl.acc?.attacks || 0, rlHit = rl.acc?.hits || 0;
        const lgAtk = lg.acc?.attacks || 0, lgHit = lg.acc?.hits || 0;

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
            sg_attacks: sgAtk, sg_hits: sgHit,
            sg_acc: sgAtk > 0 ? Math.round(1000 * sgHit / sgAtk) / 10 : 0,
            sg_dmg: sg.damage?.enemy || 0,
            rl_attacks: rlAtk, rl_hits: rlHit,
            rl_acc: rlAtk > 0 ? Math.round(1000 * rlHit / rlAtk) / 10 : 0,
            rl_dmg: rl.damage?.enemy || 0,
            lg_attacks: lgAtk, lg_hits: lgHit,
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
            ya_took: items.ya?.took || 0, ya_time: items.ya?.time || 0,
            ra_took: items.ra?.took || 0, ra_time: items.ra?.time || 0,
            ga_took: items.ga?.took || 0, ga_time: items.ga?.time || 0,
            quad_took: items.q?.took || 0, quad_time: items.q?.time || 0,
            pent_took: items.p?.took || 0, pent_time: items.p?.time || 0,
            ring_took: items.r?.took || 0, ring_time: items.r?.time || 0,
            won: p.team === winningTeam,
        };
    });

    return { game, players };
}

// ─── SQL Insert ──────────────────────────────────────────────────

const GAME_COLS = ['demo_sha256','played_at','map','hostname','matchtag','duration','timelimit',
    'team_a','team_b','team_a_ascii','team_b_ascii','team_a_frags','team_b_frags','is_clan_game'];

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
        const params = Array.from({ length: colCount }, (_, j) => `$${offset + j + 1}`);
        placeholders.push(`(${params.join(',')})`);
    }
    return `INSERT INTO ${table} (${cols.join(',')}) VALUES ${placeholders.join(',')}`;
}

async function insertBatch(client, batch) {
    if (batch.length === 0) return 0;

    const gameVals = [];
    for (const { game } of batch) gameVals.push(...gameValues(game));

    const gameSql = buildMultiInsert('games', GAME_COLS, batch.length, GAME_COLS.length)
        + ' ON CONFLICT (demo_sha256) DO NOTHING RETURNING id, demo_sha256';
    const gameRes = await client.query(gameSql, gameVals);

    const idMap = {};
    for (const row of gameRes.rows) idMap[row.demo_sha256] = row.id;

    const playerVals = [];
    let playerRowCount = 0;
    for (const { game, players } of batch) {
        const gameId = idMap[game.demo_sha256];
        if (!gameId) continue;
        for (const p of players) {
            playerVals.push(...playerValues(gameId, p));
            playerRowCount++;
        }
    }

    if (playerRowCount > 0) {
        const playerSql = buildMultiInsert('game_players', PLAYER_COLS, playerRowCount, PLAYER_COLS.length);
        await client.query(playerSql, playerVals);
    }

    return Object.keys(idMap).length;
}

// ─── Main Update Logic ───────────────────────────────────────────

let _lastResult = null;

async function runUpdate(pool) {
    const startTime = Date.now();
    const log = [];

    function emit(msg) {
        const ts = new Date().toISOString().slice(11, 19);
        const line = `[${ts}] ${msg}`;
        console.log(line);
        log.push(line);
    }

    try {
        // 1. Find latest game in DB
        const latest = await pool.query('SELECT MAX(played_at) as latest, COUNT(*) as total FROM games');
        const latestDate = latest.rows[0].latest;
        const totalBefore = parseInt(latest.rows[0].total);

        if (latestDate) {
            emit(`DB: ${totalBefore} games, latest: ${latestDate.toISOString().slice(0, 19)}Z`);
        } else {
            emit('DB is empty — full fetch');
        }

        // Supabase `timestamp` ≈ match start, but DB `played_at` ≈ match end
        // (ktxstats date). The ~20 min gap causes the cutoff to overshoot and
        // skip games whose Supabase timestamp is earlier than the DB's latest
        // played_at.  Subtract 60 min as a safety buffer — duplicates are
        // harmless thanks to ON CONFLICT DO NOTHING.
        const BUFFER_MS = 60 * 60 * 1000; // 60 min
        const since = latestDate
            ? new Date(latestDate.getTime() - BUFFER_MS).toISOString()
            : null;

        // 2. Fetch new game listings from Supabase
        emit('Querying Supabase for new 4on4 games...');
        const newGames = await fetchAllNewGames(since);
        emit(`Supabase: ${newGames.length} games since cutoff`);

        if (newGames.length === 0) {
            emit('Up to date!');
            _lastResult = { imported: 0, at: new Date().toISOString(), log };
            return _lastResult;
        }

        // 3. Filter out already imported
        const existingCheck = await pool.query(
            'SELECT demo_sha256 FROM games WHERE demo_sha256 = ANY($1)',
            [newGames.map(g => g.demo_sha256)]
        );
        const existingSet = new Set(existingCheck.rows.map(r => r.demo_sha256));
        const toFetch = newGames.filter(g => !existingSet.has(g.demo_sha256));

        if (existingSet.size > 0) {
            emit(`Already have ${existingSet.size}, need ${toFetch.length}`);
        }

        if (toFetch.length === 0) {
            emit('Up to date!');
            _lastResult = { imported: 0, at: new Date().toISOString(), log };
            return _lastResult;
        }

        // 4. Fetch ktxstats
        emit(`Fetching ${toFetch.length} ktxstats (concurrency: ${KTXSTATS_CONCURRENCY})...`);
        const ktxstatsMap = await fetchKtxstatsBatch(toFetch);
        const failed = toFetch.length - ktxstatsMap.size;
        emit(`Got ${ktxstatsMap.size} ktxstats` + (failed > 0 ? ` (${failed} failed)` : ''));

        // 5. Parse
        const parsed = [];
        let filterSkipped = 0;
        for (const [sha, data] of ktxstatsMap) {
            const result = parseKtxstats(data, sha);
            if (result) parsed.push(result);
            else filterSkipped++;
        }
        if (filterSkipped > 0) emit(`Filtered out ${filterSkipped} (not valid 4on4)`);
        emit(`${parsed.length} games ready to import`);

        // 6. Insert
        const client = await pool.connect();
        let totalImported = 0;
        try {
            for (let i = 0; i < parsed.length; i += INSERT_BATCH_SIZE) {
                const chunk = parsed.slice(i, i + INSERT_BATCH_SIZE);
                await client.query('BEGIN');
                try {
                    const count = await insertBatch(client, chunk);
                    await client.query('COMMIT');
                    totalImported += count;
                } catch (err) {
                    await client.query('ROLLBACK');
                    emit(`Batch error: ${err.message}`);
                }
            }
        } finally {
            client.release();
        }

        // 7. Summary
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const after = await pool.query('SELECT COUNT(*) as total, MAX(played_at) as latest FROM games');
        const totalAfter = parseInt(after.rows[0].total);
        const latestAfter = after.rows[0].latest;

        emit(`Done: +${totalImported} games in ${elapsed}s → ${totalAfter} total, latest: ${latestAfter?.toISOString().slice(0, 19)}Z`);

        _lastResult = { imported: totalImported, totalGames: totalAfter, at: new Date().toISOString(), elapsed, log };
        return _lastResult;

    } catch (err) {
        emit(`FAILED: ${err.message}`);
        console.error(err);
        _lastResult = { imported: 0, error: err.message, at: new Date().toISOString(), log };
        return _lastResult;
    }
}

function getLastResult() {
    return _lastResult;
}

module.exports = { runUpdate, getLastResult };
