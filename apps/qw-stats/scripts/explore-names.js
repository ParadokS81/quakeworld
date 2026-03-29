/**
 * explore-names.js — Core name extraction + duplicate detection + game classification
 * Run: node qw-stats/scripts/explore-names.js
 */

const pool = require('./db');

// ─── TEAM CLASSIFICATION ───

// Generic/pickup team names that indicate NOT a real clan
const GENERIC_TEAMS = new Set([
    'red', 'blue', 'green', 'yellow', 'pink', 'brown', 'brwn', 'brw',
    'orange', 'oran', 'orng', 'violet', 'vio', 'purple', 'white', 'black',
    'teal', 'gold', 'wine', 'plum', 'mint', 'snow', 'lime',
    'sky', 'skyb', 'skyblue', 'bleu',
    'mix', 'mix1', 'mix2', 'm1x',
    't1', 't2', '1', '2', '11',
    'team1', 'team2',
    '', 'test',
]);

// These LOOK short/generic but are actually real clan tags
const SHORT_REAL_CLANS = new Set([
    'sk', 'dc', 'bb', 'gg', '3b', 'd2',
]);

function classifyTeamName(name) {
    const lower = name.toLowerCase().trim();
    if (GENERIC_TEAMS.has(lower)) return 'generic';
    if (lower.includes('mix')) return 'mix-ish'; // e.g. "fumix", "mixteam"
    return 'clan';
}

function classifyGame(teamA, teamB) {
    const a = classifyTeamName(teamA);
    const b = classifyTeamName(teamB);
    if (a === 'clan' && b === 'clan') return 'clan_vs_clan';
    if (a === 'generic' && b === 'generic') return 'pure_mix';
    // One side is clan, other is generic or mix-ish
    return 'hybrid';
}

// ─── CORE NAME EXTRACTION ───

function extractCoreName(normalized) {
    let name = normalized.trim();

    // Strip leading/trailing special chars: •, ·, ., _, -, =, [, ], {, }, (, ), <, >, |, *, ^
    // But preserve them in the middle of names
    name = name.replace(/^[•·._\-=\[\]{}<>|*^()\s]+/, '');
    name = name.replace(/[•·._\-=\[\]{}<>|*^()\s]+$/, '');

    // Strip clan tags in common formats:
    // [tag]name, (tag)name, {tag}name, ]tag[name
    // name[tag], name(tag), name{tag}
    // .tag.name, -tag-name, =tag=name
    name = name.replace(/^\[.*?\]\s*/, '');
    name = name.replace(/^\].*?\[\s*/, '');
    name = name.replace(/^\(.*?\)\s*/, '');
    name = name.replace(/^\{.*?\}\s*/, '');
    name = name.replace(/\s*\[.*?\]$/, '');
    name = name.replace(/\s*\(.*?\)$/, '');
    name = name.replace(/\s*\{.*?\}$/, '');

    // Strip "362." style clan prefixes (digits + dot)
    name = name.replace(/^\d+\.\s*/, '');

    // Strip ".tag." prefix/suffix patterns
    name = name.replace(/^\.[a-z0-9]{1,6}\.\s*/i, '');
    name = name.replace(/\s*\.[a-z0-9]{1,6}\.$/i, '');

    // Strip "-tag-" prefix/suffix
    name = name.replace(/^-[a-z0-9]{1,6}-\s*/i, '');
    name = name.replace(/\s*-[a-z0-9]{1,6}-$/i, '');

    // Strip "=tag=" prefix/suffix (like =fu=)
    name = name.replace(/^=[a-z0-9]{1,6}=\s*/i, '');
    name = name.replace(/\s*=[a-z0-9]{1,6}=$/i, '');

    // Strip repeated decorators like "tco.........axe" → "tco axe"?
    // Actually this IS the name format for axe clan: "name.........axe"
    // Strip the dots-axe suffix
    name = name.replace(/\.{2,}[a-z]+$/i, '');

    // Strip "6. " style number prefix
    name = name.replace(/^\d+\.\s+/, '');

    // Strip leading "(1)" style prefixes (team number indicators from demos)
    name = name.replace(/^\(\d+\)\s*/, '');

    // Strip xXnameXx decorators
    name = name.replace(/^x{1,2}([a-z])/i, '$1');
    name = name.replace(/([a-z])x{1,2}$/i, '$1');

    // Strip _afk, _away suffixes
    name = name.replace(/[_\s]*(afk|away|idle|spec)$/i, '');

    // Strip leading/trailing whitespace and special chars again
    name = name.replace(/^[•·._\-=\[\]{}<>|*^()\s]+/, '');
    name = name.replace(/[•·._\-=\[\]{}<>|*^()\s]+$/, '');

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

// ─── JARO-WINKLER SIMILARITY ───

function jaroWinkler(s1, s2) {
    if (s1 === s2) return 1.0;
    const len1 = s1.length, len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);

    let matches = 0, transpositions = 0;

    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, len2);
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }

    if (matches === 0) return 0.0;

    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Winkler prefix bonus (up to 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, len1, len2); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
}

async function run() {
    const client = await pool.connect();
    try {
        // ─── 1. GAME CLASSIFICATION SPECTRUM ───
        console.log('\n═══ GAME CLASSIFICATION (SPECTRUM) ═══\n');

        const allGames = await client.query(`
            SELECT team_a_ascii, team_b_ascii, is_clan_game, COUNT(*) AS cnt
            FROM games
            GROUP BY team_a_ascii, team_b_ascii, is_clan_game
        `);

        const classified = { clan_vs_clan: 0, hybrid: 0, pure_mix: 0 };
        const hybridExamples = [];

        for (const row of allGames.rows) {
            const cat = classifyGame(row.team_a_ascii, row.team_b_ascii);
            classified[cat] += parseInt(row.cnt);
            if (cat === 'hybrid' && hybridExamples.length < 15) {
                hybridExamples.push({
                    teams: `${row.team_a_ascii} vs ${row.team_b_ascii}`,
                    games: row.cnt,
                    was_clan: row.is_clan_game
                });
            }
        }

        console.log('Game categories:');
        console.log(`  Pure clan (both real tags):  ${classified.clan_vs_clan}`);
        console.log(`  Hybrid (clan vs mix/color):  ${classified.hybrid}`);
        console.log(`  Pure mix (both generic):     ${classified.pure_mix}`);
        console.log(`  Total:                       ${classified.clan_vs_clan + classified.hybrid + classified.pure_mix}`);

        console.log('\nHybrid examples (currently marked is_clan_game):');
        console.table(hybridExamples.sort((a, b) => b.games - a.games));

        // ─── 2. CORE NAME EXTRACTION ───
        console.log('\n═══ CORE NAME EXTRACTION ═══\n');

        const allNames = await client.query(`
            SELECT player_name_normalized AS name, COUNT(*) AS games
            FROM game_players
            GROUP BY player_name_normalized
            ORDER BY games DESC
        `);

        const nameMap = new Map(); // core_name → [{original, games}]
        const coreNames = [];

        for (const row of allNames.rows) {
            const core = extractCoreName(row.name);
            coreNames.push({ original: row.name, core, games: parseInt(row.games) });
            if (!nameMap.has(core)) nameMap.set(core, []);
            nameMap.get(core).push({ original: row.name, games: parseInt(row.games) });
        }

        // Show extraction examples for top players
        console.log('Core name extraction (top 40 by games):');
        for (const entry of coreNames.slice(0, 40)) {
            const changed = entry.original !== entry.core;
            console.log(`  ${entry.original.padEnd(25)} → ${entry.core.padEnd(20)} ${changed ? '  ✎ CHANGED' : ''} (${entry.games} games)`);
        }

        // ─── 3. SAME CORE NAME = LIKELY SAME PERSON ───
        console.log('\n═══ EXACT CORE NAME MATCHES (likely aliases) ═══\n');

        let exactMatches = 0;
        const exactGroups = [];

        for (const [core, entries] of nameMap) {
            if (entries.length > 1 && core.length >= 3) {
                exactMatches++;
                const totalGames = entries.reduce((sum, e) => sum + e.games, 0);
                exactGroups.push({
                    core,
                    count: entries.length,
                    totalGames,
                    names: entries.map(e => `${e.original}(${e.games})`).join(', ')
                });
            }
        }

        exactGroups.sort((a, b) => b.totalGames - a.totalGames);
        console.log(`Found ${exactMatches} core names with multiple original names:\n`);

        for (const g of exactGroups.slice(0, 50)) {
            console.log(`  "${g.core}" (${g.count} variants, ${g.totalGames} total games):`);
            console.log(`    ${g.names}`);
        }

        // ─── 4. FUZZY MATCHES (Jaro-Winkler on core names) ───
        console.log('\n═══ FUZZY MATCHES (JW ≥ 0.90 on core names, ≥10 games each) ═══\n');

        // Only compare names with enough games to have meaningful data
        const significantCores = coreNames
            .filter(e => e.games >= 10 && e.core.length >= 3);

        // Deduplicate to unique core names (keep the one with most games)
        const uniqueCores = new Map();
        for (const entry of significantCores) {
            if (!uniqueCores.has(entry.core) || entry.games > uniqueCores.get(entry.core).games) {
                uniqueCores.set(entry.core, entry);
            }
        }

        const coreList = [...uniqueCores.values()];
        const fuzzyPairs = [];

        for (let i = 0; i < coreList.length; i++) {
            for (let j = i + 1; j < coreList.length; j++) {
                const a = coreList[i], b = coreList[j];
                const jw = jaroWinkler(a.core, b.core);
                if (jw >= 0.88) {
                    fuzzyPairs.push({
                        name_a: a.original,
                        core_a: a.core,
                        games_a: a.games,
                        name_b: b.original,
                        core_b: b.core,
                        games_b: b.games,
                        similarity: jw.toFixed(3)
                    });
                }
            }
        }

        fuzzyPairs.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));
        console.log(`Found ${fuzzyPairs.length} fuzzy pairs (JW ≥ 0.88):\n`);

        for (const p of fuzzyPairs.slice(0, 60)) {
            console.log(`  ${p.similarity}  ${p.core_a.padEnd(18)} ↔ ${p.core_b.padEnd(18)}  (${p.name_a} [${p.games_a}] vs ${p.name_b} [${p.games_b}])`);
        }

        // ─── 5. KNOWN ALIASES CHECK ───
        console.log('\n═══ KNOWN ALIAS SEARCH ═══\n');

        // Check the aliases you mentioned
        const knownAliases = [
            ['shaka', 'xaka', 'shazam'],
            ['medic', 'mm'],
            ['paradoks', 'paradokz'],
        ];

        for (const group of knownAliases) {
            console.log(`\nSearching for aliases of: ${group.join(', ')}`);
            for (const alias of group) {
                const results = await client.query(`
                    SELECT player_name_normalized AS name, COUNT(*) AS games,
                        ARRAY_AGG(DISTINCT team_ascii ORDER BY team_ascii) AS teams
                    FROM game_players
                    WHERE player_name_normalized LIKE $1
                    GROUP BY player_name_normalized
                    ORDER BY games DESC
                `, [`%${alias}%`]);

                for (const r of results.rows) {
                    const topTeams = r.teams.filter(t => !GENERIC_TEAMS.has(t)).slice(0, 8);
                    console.log(`  ${r.name.padEnd(25)} ${String(r.games).padEnd(6)} games  teams: ${topTeams.join(', ')}`);
                }
            }
        }

        // ─── 6. PLAYERS WHO MIGHT BE BOTS/SPECS ───
        console.log('\n═══ SUSPICIOUS LOW-STAT PLAYERS (possible bots/specs that slipped through) ═══\n');

        const lowStats = await client.query(`
            SELECT
                player_name_normalized AS name,
                COUNT(*) AS games,
                ROUND(AVG(frags)) AS avg_frags,
                ROUND(AVG(kills)) AS avg_kills,
                ROUND(AVG(dmg_given)) AS avg_dmg,
                ROUND(AVG(CASE WHEN kills + deaths > 0
                    THEN 100.0 * kills / (kills + deaths) ELSE 0 END), 1) AS avg_eff
            FROM game_players
            GROUP BY player_name_normalized
            HAVING COUNT(*) >= 5 AND AVG(dmg_given) < 3000
            ORDER BY AVG(dmg_given) ASC
            LIMIT 20
        `);
        console.table(lowStats.rows);

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
