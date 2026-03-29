/**
 * clan-rosters.js — Build clan rosters from game data for alias curation
 *
 * Shows who played under each clan tag, with activity windows and stats.
 * Makes it easy to spot aliases within the same clan.
 *
 * Usage:
 *   node qw-stats/scripts/clan-rosters.js                  # top 30 clans
 *   node qw-stats/scripts/clan-rosters.js --clan oeks      # specific clan
 *   node qw-stats/scripts/clan-rosters.js --clan -hx-      # specific clan
 *   node qw-stats/scripts/clan-rosters.js --player shaka   # find all teams for a player
 *   node qw-stats/scripts/clan-rosters.js --co-check "shaka,shazam"  # check co-occurrence
 */

const pool = require('./db');

// ─── GENERIC TEAM NAMES (not real clans) ───
const GENERIC_TEAMS = new Set([
    'red', 'blue', 'green', 'yellow', 'pink', 'brown', 'brwn', 'brw',
    'orange', 'oran', 'orng', 'violet', 'vio', 'purple', 'white', 'black',
    'teal', 'gold', 'wine', 'plum', 'mint', 'snow', 'lime',
    'sky', 'skyb', 'skyblue', 'bleu',
    'mix', 'mix1', 'mix2', 'm1x',
    't1', 't2', '1', '2', '11', '0', '000',
    'team1', 'team2',
    '', 'test', 'afk',
    // Common throwaway/joke tags
    'lol', 'asdf', 'xxx', 'xx', 'x', 'zzz', 'zz',
    '666', '69', '99', '999', '123', '1337', '4', '7777', '555', '98',
    'pug', 'quad', 'pent',
    // More colors/shades
    'grn', 'gree', 'yllw', 'ylw', 'brow',
]);

// ─── CORE NAME EXTRACTION (improved) ───
function extractCoreName(normalized) {
    let name = normalized.trim();

    // Strip leading bullet/dot decorators
    name = name.replace(/^[•·]+\s*/, '');
    name = name.replace(/\s*[•·]+$/, '');

    // Strip clan tags in bracket formats
    name = name.replace(/^\[.*?\]\s*/, '');
    name = name.replace(/^\].*?\[\s*/, '');
    name = name.replace(/^\(.*?\)\s*/, '');
    name = name.replace(/^\{.*?\}\s*/, '');
    name = name.replace(/\s*\[.*?\]$/, '');
    name = name.replace(/\s*\(.*?\)$/, '');
    name = name.replace(/\s*\{.*?\}$/, '');

    // Strip "362." style clan prefixes (digits + dot)
    name = name.replace(/^\d+\.\s*/, '');

    // Strip ".tag." prefix/suffix
    name = name.replace(/^\.[a-z0-9]{1,6}\.\s*/i, '');
    name = name.replace(/\s*\.[a-z0-9]{1,6}\.$/i, '');

    // Strip "-tag-" prefix/suffix
    name = name.replace(/^-[a-z0-9]{1,6}-\s*/i, '');
    name = name.replace(/\s*-[a-z0-9]{1,6}-$/i, '');

    // Strip " =tag=" or "=tag=" suffix (handles =fu=, =ht= etc.)
    name = name.replace(/\s*=[a-z0-9]{1,6}=\s*$/i, '');
    // Strip "=tag=" prefix
    name = name.replace(/^=[a-z0-9]{1,6}=\s*/i, '');

    // Strip ".........axe" / ".........nor" suffix (axe clan format)
    name = name.replace(/\.{2,}[a-z]+$/i, '');

    // Strip "|gf" suffix (gf2 team indicator)
    name = name.replace(/\|gf\d*$/i, '');

    // Strip "•dc" / "•tag" suffix (clan tag joined with bullet)
    name = name.replace(/•[a-z0-9]{1,5}$/i, '');

    // Strip "d2•" prefix (d2 clan prefix)
    name = name.replace(/^d2•/i, '');

    // Strip ">> " prefix
    name = name.replace(/^>>\s*/, '');

    // Strip "6. " style number prefix
    name = name.replace(/^\d+\.\s+/, '');

    // Strip leading "(1)" style prefixes
    name = name.replace(/^\(\d+\)\s*/, '');

    // Strip xXnameXx decorators (only if surrounding actual name)
    name = name.replace(/^x{1,2}([a-z]{2,})/i, '$1');
    name = name.replace(/([a-z]{2,})x{1,2}$/i, '$1');

    // Strip _afk, _away suffixes
    name = name.replace(/[_\s]*(afk|away|idle|spec)$/i, '');

    // Strip leading/trailing decorators
    name = name.replace(/^[._\-=\[\]{}<>|*^()\s/]+/, '');
    name = name.replace(/[._\-=\[\]{}<>|*^()\s]+$/, '');

    // Leetspeak normalization
    name = name.replace(/0/g, 'o');
    name = name.replace(/1/g, 'i');
    name = name.replace(/3/g, 'e');
    name = name.replace(/4/g, 'a');
    name = name.replace(/5/g, 's');
    name = name.replace(/7/g, 't');
    name = name.replace(/\$/g, 's');

    return name.toLowerCase().trim();
}

async function showClanRoster(client, clanTag) {
    const tag = clanTag.toLowerCase();
    console.log(`\n═══ ROSTER: "${tag}" ═══\n`);

    const result = await client.query(`
        SELECT
            gp.player_name_normalized AS name,
            COUNT(*) AS games,
            COUNT(*) FILTER (WHERE gp.won) AS wins,
            ROUND(100.0 * COUNT(*) FILTER (WHERE gp.won) / COUNT(*), 1) AS win_pct,
            ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0
                THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) AS avg_eff,
            ROUND(AVG(gp.dmg_given)) AS avg_dmg,
            ROUND(AVG(gp.rl_acc)::numeric, 1) AS rl_acc,
            ROUND(AVG(gp.lg_acc)::numeric, 1) AS lg_acc,
            ROUND(AVG(gp.sg_acc)::numeric, 1) AS sg_acc,
            MIN(g.played_at)::date AS first_seen,
            MAX(g.played_at)::date AS last_seen,
            ARRAY_AGG(DISTINCT gp.team_ascii ORDER BY gp.team_ascii) FILTER (
                WHERE gp.team_ascii NOT IN (${[...GENERIC_TEAMS].map((_, i) => `$${i + 2}`).join(',')})
            ) AS other_clans
        FROM game_players gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.team_ascii = $1
        GROUP BY gp.player_name_normalized
        ORDER BY games DESC
    `, [tag, ...GENERIC_TEAMS]);

    // Group by core name
    const coreGroups = new Map();
    for (const row of result.rows) {
        const core = extractCoreName(row.name);
        if (!coreGroups.has(core)) coreGroups.set(core, []);
        coreGroups.get(core).push(row);
    }

    // Show ungrouped first, then grouped
    let groupedCount = 0;
    for (const [core, entries] of coreGroups) {
        if (entries.length > 1) {
            groupedCount++;
            console.log(`  ┌─ ALIAS GROUP: "${core}" (${entries.length} names)`);
            for (const r of entries) {
                const otherClans = (r.other_clans || []).filter(t => t !== tag).slice(0, 6);
                console.log(`  │  ${r.name.padEnd(25)} ${String(r.games).padEnd(5)} games  eff:${String(r.avg_eff).padEnd(5)} dmg:${String(r.avg_dmg).padEnd(6)} ${r.first_seen} → ${r.last_seen}${otherClans.length ? '  also: ' + otherClans.join(', ') : ''}`);
            }
            console.log(`  └─`);
        }
    }

    console.log('');
    for (const [core, entries] of coreGroups) {
        if (entries.length === 1) {
            const r = entries[0];
            const otherClans = (r.other_clans || []).filter(t => t !== tag).slice(0, 6);
            const marker = core !== r.name.toLowerCase() ? `  (→${core})` : '';
            console.log(`  ${r.name.padEnd(25)} ${String(r.games).padEnd(5)} games  eff:${String(r.avg_eff).padEnd(5)} dmg:${String(r.avg_dmg).padEnd(6)} ${r.first_seen} → ${r.last_seen}${marker}${otherClans.length ? '  also: ' + otherClans.join(', ') : ''}`);
        }
    }

    console.log(`\n  Total: ${result.rows.length} names, ${groupedCount} auto-detected alias groups`);
}

async function showPlayerTeams(client, playerSearch) {
    console.log(`\n═══ PLAYER SEARCH: "${playerSearch}" ═══\n`);

    const result = await client.query(`
        SELECT
            gp.player_name_normalized AS name,
            gp.team_ascii AS team,
            COUNT(*) AS games,
            MIN(g.played_at)::date AS first_seen,
            MAX(g.played_at)::date AS last_seen,
            ROUND(AVG(CASE WHEN gp.kills + gp.deaths > 0
                THEN 100.0 * gp.kills / (gp.kills + gp.deaths) ELSE 0 END), 1) AS avg_eff,
            ROUND(AVG(gp.dmg_given)) AS avg_dmg
        FROM game_players gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.player_name_normalized ILIKE $1
        GROUP BY gp.player_name_normalized, gp.team_ascii
        HAVING COUNT(*) >= 2
        ORDER BY gp.player_name_normalized, games DESC
    `, [`%${playerSearch}%`]);

    let currentName = '';
    for (const r of result.rows) {
        if (r.name !== currentName) {
            currentName = r.name;
            const core = extractCoreName(r.name);
            console.log(`\n  ${r.name} (core: "${core}"):`);
        }
        const isGeneric = GENERIC_TEAMS.has(r.team);
        const marker = isGeneric ? ' [mix]' : '';
        console.log(`    ${r.team.padEnd(12)}${marker.padEnd(7)} ${String(r.games).padEnd(5)} games  ${r.first_seen} → ${r.last_seen}  eff:${r.avg_eff} dmg:${r.avg_dmg}`);
    }
}

async function checkCoOccurrence(client, names) {
    const nameList = names.split(',').map(n => n.trim().toLowerCase());
    console.log(`\n═══ CO-OCCURRENCE CHECK: ${nameList.join(' vs ')} ═══\n`);

    // Find all matching normalized names
    const allNames = [];
    for (const search of nameList) {
        const result = await client.query(`
            SELECT DISTINCT player_name_normalized AS name, COUNT(*) AS games
            FROM game_players
            WHERE player_name_normalized ILIKE $1
            GROUP BY player_name_normalized
            ORDER BY games DESC
        `, [`%${search}%`]);
        console.log(`  Matches for "${search}":`);
        for (const r of result.rows) {
            console.log(`    ${r.name} (${r.games} games)`);
        }
        allNames.push(result.rows.map(r => r.name));
    }

    // Check every pair across groups
    if (allNames.length >= 2) {
        console.log('\n  Co-occurrence (same game = DIFFERENT people):');
        for (let i = 0; i < allNames[0].length; i++) {
            for (let j = 0; j < allNames[1].length; j++) {
                const a = allNames[0][i], b = allNames[1][j];
                if (a === b) continue;

                const coCheck = await client.query(`
                    SELECT COUNT(DISTINCT a.game_id) AS shared_games
                    FROM game_players a
                    JOIN game_players b ON a.game_id = b.game_id
                    WHERE a.player_name_normalized = $1
                    AND b.player_name_normalized = $2
                `, [a, b]);

                const shared = parseInt(coCheck.rows[0].shared_games);
                const verdict = shared > 0 ? `❌ DIFFERENT PEOPLE (${shared} shared games)` : '✓ Never in same game — could be same person';
                console.log(`    ${a.padEnd(25)} ↔ ${b.padEnd(25)} ${verdict}`);
            }
        }
    }
}

async function showTopClans(client, limit = 30) {
    console.log(`\n═══ TOP ${limit} CLAN TAGS (by games, excluding generic) ═══\n`);

    const genericList = [...GENERIC_TEAMS];
    const placeholders = genericList.map((_, i) => `$${i + 1}`).join(',');

    const result = await client.query(`
        SELECT
            team_ascii AS clan,
            COUNT(DISTINCT game_id) AS games,
            COUNT(DISTINCT player_name_normalized) AS unique_names,
            MIN(g.played_at)::date AS first_seen,
            MAX(g.played_at)::date AS last_seen
        FROM game_players gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.team_ascii NOT IN (${placeholders})
        AND g.is_clan_game = true
        GROUP BY team_ascii
        HAVING COUNT(DISTINCT game_id) >= 20
        ORDER BY COUNT(DISTINCT game_id) DESC
        LIMIT $${genericList.length + 1}
    `, [...genericList, limit]);

    for (const r of result.rows) {
        console.log(`  ${r.clan.padEnd(12)} ${String(r.games).padEnd(6)} games  ${String(r.unique_names).padEnd(4)} names  ${r.first_seen} → ${r.last_seen}`);
    }

    console.log(`\n  Use --clan <tag> to see full roster`);
}

async function run() {
    const client = await pool.connect();
    const args = process.argv.slice(2);

    try {
        if (args.includes('--clan')) {
            const idx = args.indexOf('--clan');
            const clan = args[idx + 1];
            if (!clan) { console.error('Usage: --clan <tag>'); return; }
            await showClanRoster(client, clan);
        } else if (args.includes('--player')) {
            const idx = args.indexOf('--player');
            const player = args[idx + 1];
            if (!player) { console.error('Usage: --player <name>'); return; }
            await showPlayerTeams(client, player);
        } else if (args.includes('--co-check')) {
            const idx = args.indexOf('--co-check');
            const names = args[idx + 1];
            if (!names) { console.error('Usage: --co-check "name1,name2"'); return; }
            await checkCoOccurrence(client, names);
        } else {
            await showTopClans(client);
        }
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
