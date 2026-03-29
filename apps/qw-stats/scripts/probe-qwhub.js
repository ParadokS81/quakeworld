#!/usr/bin/env node
/**
 * Probe QWHub API to see how much 4on4 data exists
 */

const API_BASE = 'https://ncsphkjfominimxztjip.supabase.co/rest/v1/v1_games';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jc3Boa2pmb21pbmlteHp0amlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTY5Mzg1NjMsImV4cCI6MjAxMjUxNDU2M30.NN6hjlEW-qB4Og9hWAVlgvUdwrbBO13s8OkAJuBGVbo';

async function query(params, countOnly = false) {
    const url = API_BASE + '?' + params;
    const headers = { 'apikey': API_KEY };
    if (countOnly) {
        headers['Prefer'] = 'count=exact';
        headers['Range-Unit'] = 'items';
        headers['Range'] = '0-0';
    }
    const res = await fetch(url, { headers });
    if (countOnly) {
        const range = res.headers.get('content-range');
        // format: "0-0/12345" or "*/0"
        const match = range ? range.match(/\/(\d+)/) : null;
        return match ? parseInt(match[1]) : 0;
    }
    return res.json();
}

async function main() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('  QWHub API — 4on4 Data Availability');
    console.log('══════════════════════════════════════════════════════════════\n');

    // Total 4on4
    const total4on4 = await query('select=id&mode=eq.4on4&limit=1', true);
    console.log('Total 4on4 games on QWHub: ' + total4on4.toLocaleString());

    // Oldest and newest
    const oldest = await query('select=id,timestamp,map,teams&mode=eq.4on4&order=timestamp.asc&limit=3');
    console.log('\nOldest 4on4 games:');
    for (const g of oldest) {
        const teams = (g.teams || []).map(t => t.name).join(' vs ');
        console.log('  ' + (g.timestamp || '?').substring(0,10) + '  ' + (g.map || '?').padEnd(14) + '  ' + teams);
    }

    const newest = await query('select=id,timestamp,map,teams&mode=eq.4on4&order=timestamp.desc&limit=3');
    console.log('\nNewest 4on4 games:');
    for (const g of newest) {
        const teams = (g.teams || []).map(t => t.name).join(' vs ');
        console.log('  ' + (g.timestamp || '?').substring(0,10) + '  ' + (g.map || '?').padEnd(14) + '  ' + teams);
    }

    // By year
    console.log('\n── 4on4 games by year ──');
    for (const year of ['2018','2019','2020', '2021', '2022', '2023', '2024', '2025', '2026']) {
        const nextYear = String(parseInt(year) + 1);
        const count = await query(
            'select=id&mode=eq.4on4&timestamp=gte.' + year + '-01-01&timestamp=lt.' + nextYear + '-01-01&limit=1',
            true
        );
        if (count > 0) console.log('  ' + year + ': ' + count.toLocaleString() + ' games');
    }

    // By comp map
    console.log('\n── 4on4 by competitive map (all time) ──');
    for (const map of ['dm2', 'dm3', 'e1m2', 'schloss', 'phantombase']) {
        const count = await query('select=id&mode=eq.4on4&map=eq.' + map + '&limit=1', true);
        console.log('  ' + map.padEnd(14) + count.toLocaleString() + ' games');
    }

    // Try to filter out blue/red team games
    // PostgREST: team_names does not overlap with {blue,red}
    // Actually cs = contains, ov = overlaps. We want NOT overlaps
    // But team_names is an array of strings. Let's try a different approach:
    // Get sample of team names to understand
    console.log('\n── Sample team names (4on4, comp maps) ──');
    const samples = await query(
        'select=id,timestamp,map,teams&mode=eq.4on4&map=eq.dm2&order=timestamp.desc&limit=20'
    );
    for (const g of samples) {
        const t = (g.teams || []);
        const names = t.map(x => x.name).join(' vs ');
        console.log('  ' + (g.timestamp||'?').substring(0,10) + '  ' + names);
    }

    // Count dm2 4on4 games where team is NOT blue/red
    // We can check if a specific clan tag appears using cs (contains)
    // Let's get a rough idea by checking some known clan tags
    console.log('\n── Specific team tag counts (4on4 dm2) ──');
    for (const tag of [']sr[', 'pol', 'Book', 'tSQ', 'oeks', 'cool', 'n-n', 'sk', '-fu-', 'sr']) {
        const encoded = encodeURIComponent('{' + tag.toLowerCase() + '}');
        const count = await query(
            'select=id&mode=eq.4on4&map=eq.dm2&team_names=cs.' + encoded + '&limit=1',
            true
        );
        if (count > 0) console.log('  ' + tag.padEnd(10) + count + ' dm2 games');
    }

    // How many have demo_sha256 (meaning ktxstats available)
    console.log('\n── Data availability ──');
    const withDemo = await query('select=id&mode=eq.4on4&demo_sha256=not.is.null&limit=1', true);
    const withoutDemo = await query('select=id&mode=eq.4on4&demo_sha256=is.null&limit=1', true);
    console.log('  With ktxstats (demo_sha256):    ' + withDemo.toLocaleString());
    console.log('  Without ktxstats:               ' + withoutDemo.toLocaleString());

    // Comp maps with ktxstats
    console.log('\n── Comp map 4on4 WITH ktxstats ──');
    for (const map of ['dm2', 'dm3', 'e1m2', 'schloss', 'phantombase']) {
        const count = await query(
            'select=id&mode=eq.4on4&map=eq.' + map + '&demo_sha256=not.is.null&limit=1',
            true
        );
        console.log('  ' + map.padEnd(14) + count.toLocaleString() + ' games with detailed stats');
    }

    console.log('\n══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
