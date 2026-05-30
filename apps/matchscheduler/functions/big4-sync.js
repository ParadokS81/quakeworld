// big4-sync.js - One-way sync of scheduled games from TheBig4.se API
// Creates scheduledMatches for Big4 games that don't exist in MatchScheduler.
// Rule: If Big4 has a game and we don't → create it. Otherwise don't touch.

const functions = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const https = require('https');
const { getISOWeekYear, getISOWeekNumber } = require('./week-utils');

const db = getFirestore();

const BIG4_API_URL = 'https://www.thebig4.se/api/public/scheduled-games/';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetch scheduled games from Big4 API.
 * Returns { timezone, count, games: [...] }
 */
function fetchBig4Games() {
    const apiKey = process.env.BIG4_API_KEY;
    if (!apiKey) {
        throw new Error('BIG4_API_KEY not set in environment');
    }

    return new Promise((resolve, reject) => {
        const url = new URL(BIG4_API_URL);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            headers: { 'X-API-Key': apiKey }
        };
        https.get(options, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Big4 API returned ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Big4 API returned invalid JSON'));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Convert Big4 CET/CEST time to UTC Date.
 * Big4 API returns scheduled_date as ISO string and scheduled_time as "HH:MM:SS"
 * in Swedish local time (Europe/Stockholm): CET (UTC+1) in winter, CEST (UTC+2) in summer.
 */
function big4ToUtcDate(scheduledDate, scheduledTime) {
    // Big4 API returns scheduled_date as a full ISO datetime string
    // (e.g. "2026-04-28T00:00:00.000Z"), so trim to YYYY-MM-DD before reuse.
    const ymd = String(scheduledDate).slice(0, 10);
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    // Probe the Stockholm offset for this date (1 for CET, 2 for CEST).
    // Use formatToParts to read Stockholm wall-clock numerics directly --
    // round-tripping through `new Date(toLocaleString(...))` breaks on Node 20+
    // because en-US emits U+202F (narrow no-break space) before AM/PM.
    const probe = new Date(`${ymd}T${hh}:${mm}:00Z`);
    const offsetHours = stockholmOffsetHours(probe);

    const date = new Date(`${ymd}T00:00:00Z`);
    date.setUTCHours(hours - offsetHours, minutes, 0, 0);
    return date;
}

function stockholmOffsetHours(instant) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Stockholm',
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(instant);
    const get = (t) => Number(parts.find(p => p.type === t).value);
    let hour = get('hour');
    if (hour === 24) hour = 0; // Intl quirk: midnight may render as 24
    const wall = Date.UTC(get('year'), get('month') - 1, get('day'),
                          hour, get('minute'), get('second'));
    return Math.round((wall - instant.getTime()) / 3600000);
}

/**
 * Compute UTC slotId from a Date object.
 * E.g. Date for Tuesday 20:00 UTC → "tue_2000"
 */
function computeSlotId(date) {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[date.getUTCDay()];
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const mins = String(date.getUTCMinutes()).padStart(2, '0');
    return `${day}_${hours}${mins}`;
}

/**
 * Generate an eventLog document ID.
 * Format: YYYYMMDD-HHMM-teamname-eventtype_XXXX
 */
function generateEventId(teamName, eventType) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const teamNameClean = teamName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${dateStr}-${timeStr}-${teamNameClean}-${eventType}_${randomSuffix}`;
}

/**
 * Build a lookup map of teamName (lowercase) → team document data.
 * Returns Map<string, { id, teamName, teamTag, ... }>
 */
async function buildTeamLookup() {
    const snapshot = await db.collection('teams').get();
    const lookup = new Map();
    snapshot.forEach(doc => {
        const data = doc.data();
        lookup.set(data.teamName.toLowerCase(), { id: doc.id, ...data });
    });
    return lookup;
}

/**
 * Get all existing big4-imported matches keyed by fixture_id.
 * Returns Map<number, { id, ...data }> for O(1) dedup + reschedule checks.
 * .has(fixtureId) keeps the original Set-shaped call sites working.
 */
async function getExistingFixtureIds() {
    const snapshot = await db.collection('scheduledMatches')
        .where('origin', '==', 'big4_import')
        .get();

    const byFixtureId = new Map();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.big4FixtureId != null) {
            byFixtureId.set(data.big4FixtureId, { id: doc.id, ...data });
        }
    });
    return byFixtureId;
}

/**
 * Check if two teams already have a scheduled match on the same day.
 * Checks all origins (proposal, quick_add, big4_import).
 */
async function teamsHaveMatchOnDate(teamAId, teamBId, scheduledDate) {
    // Query matches where teamA is involved on this date
    const snapshot = await db.collection('scheduledMatches')
        .where('scheduledDate', '==', scheduledDate)
        .where('status', '==', 'upcoming')
        .get();

    return snapshot.docs.some(doc => {
        const d = doc.data();
        const teamsMatch = (
            (d.teamAId === teamAId && d.teamBId === teamBId) ||
            (d.teamAId === teamBId && d.teamBId === teamAId)
        );
        return teamsMatch;
    });
}

// ─── Core Sync Logic ────────────────────────────────────────────────────────

/**
 * Sync Big4 scheduled games into MatchScheduler.
 * Returns a summary of actions taken.
 */
async function syncBig4Games() {
    const summary = {
        fetched: 0,
        created: 0,
        rescheduled: 0,
        skippedExisting: 0,
        skippedMatched: 0,
        skippedUnknownTeam: 0,
        skippedPast: 0,
        warnings: []
    };
    const created = [];
    const rescheduled = [];

    // 1. Fetch from Big4
    console.log('📡 Fetching Big4 scheduled games...');
    const big4Data = await fetchBig4Games();
    summary.fetched = big4Data.count || big4Data.games.length;
    console.log(`   Got ${summary.fetched} games`);

    // 2. Load our team lookup + existing fixture IDs
    const [teamLookup, existingFixtureIds] = await Promise.all([
        buildTeamLookup(),
        getExistingFixtureIds()
    ]);
    console.log(`   Team lookup: ${teamLookup.size} teams, ${existingFixtureIds.size} existing imports`);

    // 3. Process each game
    const now = new Date();

    for (const game of big4Data.games) {
        const { fixture_id, division, scheduled_date, scheduled_time, team1, team2 } = game;
        const label = `[${fixture_id}] ${team1} vs ${team2}`;

        // 3a. Compute schedule fields up-front so we can detect Big4 reschedules.
        const utcDate = big4ToUtcDate(scheduled_date, scheduled_time);
        const slotId = computeSlotId(utcDate);
        const weekYear = getISOWeekYear(utcDate);
        const weekNum = getISOWeekNumber(utcDate);
        const weekId = `${weekYear}-${String(weekNum).padStart(2, '0')}`;
        const scheduledDate = utcDate.toISOString().split('T')[0];

        // 3b. Already imported? Detect reschedule vs unchanged.
        if (existingFixtureIds.has(fixture_id)) {
            const existing = existingFixtureIds.get(fixture_id);
            const dateChanged = existing.scheduledDate !== scheduledDate || existing.slotId !== slotId;

            if (!dateChanged) {
                summary.skippedExisting++;
                console.log(`   ⏭️  ${label} — already imported`);
                continue;
            }

            // Big4 moved this fixture. Update our record.
            // If our copy was auto-completed by the stale-date cron and the new
            // date is still in the future, revive it; otherwise leave status alone
            // (preserves legitimate manual completions / past games).
            const update = {
                scheduledDate,
                slotId,
                blockedSlot: slotId,
                weekId
            };
            if (existing.status === 'completed' && utcDate > now) {
                update.status = 'upcoming';
                update.completedAt = null;
            }

            await db.collection('scheduledMatches').doc(existing.id).update(update);

            summary.rescheduled++;
            rescheduled.push({
                matchId: existing.id,
                fixtureId: fixture_id,
                from: { date: existing.scheduledDate, slot: existing.slotId },
                to: { date: scheduledDate, slot: slotId },
                revived: update.status === 'upcoming'
            });
            console.log(`   🔄 ${label} — rescheduled ${existing.scheduledDate} ${existing.slotId} → ${scheduledDate} ${slotId}${update.status === 'upcoming' ? ' (revived)' : ''}`);
            continue;
        }

        // 3c. Resolve teams (only required for new imports)
        const teamA = teamLookup.get(team1.toLowerCase());
        const teamB = teamLookup.get(team2.toLowerCase());

        if (!teamA || !teamB) {
            summary.skippedUnknownTeam++;
            const missing = !teamA ? team1 : team2;
            const warning = `${label} — team "${missing}" not found in our DB`;
            summary.warnings.push(warning);
            console.log(`   ⚠️  ${warning}`);
            continue;
        }

        // 3d. Skip if in the past (new imports only — existing imports are handled above)
        if (utcDate <= now) {
            summary.skippedPast++;
            console.log(`   ⏭️  ${label} — in the past`);
            continue;
        }

        // 3e. Check if these teams already have a match on this day (any origin)
        const alreadyMatched = await teamsHaveMatchOnDate(teamA.id, teamB.id, scheduledDate);
        if (alreadyMatched) {
            summary.skippedMatched++;
            console.log(`   ⏭️  ${label} — teams already matched on ${scheduledDate}`);
            continue;
        }

        // 3f. Create scheduledMatch
        const matchRef = db.collection('scheduledMatches').doc();

        await matchRef.set({
            teamAId: teamA.id,
            teamAName: teamA.teamName,
            teamATag: teamA.teamTag,
            teamBId: teamB.id,
            teamBName: teamB.teamName,
            teamBTag: teamB.teamTag,
            weekId,
            slotId,
            scheduledDate,
            blockedSlot: slotId,
            blockedTeams: [teamA.id, teamB.id],
            teamARoster: [],
            teamBRoster: [],
            proposalId: null,
            origin: 'big4_import',
            addedBy: null,
            status: 'upcoming',
            gameType: 'official',
            gameTypeSetBy: null,
            big4FixtureId: fixture_id,
            big4Division: division,
            confirmedAt: now,
            confirmedByA: null,
            confirmedByB: null,
            createdAt: now
        });

        // 3g. Event log (one entry per team involved)
        const eventIdA = generateEventId(teamA.teamName, 'match_big4_imported');
        await db.collection('eventLog').doc(eventIdA).set({
            eventId: eventIdA,
            teamId: teamA.id,
            teamName: teamA.teamName,
            type: 'MATCH_BIG4_IMPORTED',
            category: 'SCHEDULING',
            timestamp: now,
            userId: null,
            details: {
                matchId: matchRef.id,
                big4FixtureId: fixture_id,
                big4Division: division,
                slotId,
                weekId,
                gameType: 'official',
                origin: 'big4_import',
                teams: {
                    a: { id: teamA.id, name: teamA.teamName },
                    b: { id: teamB.id, name: teamB.teamName }
                }
            }
        });

        summary.created++;
        created.push({
            matchId: matchRef.id,
            teamA: teamA.teamTag,
            teamB: teamB.teamTag,
            date: scheduledDate,
            time: scheduled_time,
            division,
            fixtureId: fixture_id
        });
        console.log(`   ✅ ${label} → ${matchRef.id} (${scheduledDate} ${slotId})`);
    }

    return { summary, created, rescheduled };
}

// ─── Cloud Function: Admin-triggered sync ───────────────────────────────────

// ─── Cloud Function: Admin-triggered sync (onCall) ──────────────────────────

exports.syncBig4Matches = functions
    .region('europe-west3')
    .https.onCall(async (data, context) => {
        try {
            if (!context.auth) {
                throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
            }

            console.log(`🔄 Big4 sync triggered by ${context.auth.uid}`);

            const { summary, created, rescheduled } = await syncBig4Games();

            console.log('📊 Sync summary:', JSON.stringify(summary));

            return {
                success: true,
                summary,
                created,
                rescheduled
            };

        } catch (error) {
            console.error('❌ Big4 sync error:', error);
            if (error instanceof functions.https.HttpsError) throw error;
            throw new functions.https.HttpsError('internal', `Sync failed: ${error.message}`);
        }
    });

// ─── Cloud Function: Scheduled sync (every 15 min = 4 req/hour) ────────────

exports.scheduledBig4Sync = functions
    .region('europe-west3')
    .pubsub.schedule('3,18,33,48 * * * *')   // :03, :18, :33, :48 — 4x/hour
    .timeZone('UTC')
    .onRun(async () => {
        console.log(`⏰ Scheduled Big4 sync at ${new Date().toISOString()}`);

        try {
            const { summary, created, rescheduled } = await syncBig4Games();

            if (summary.created > 0) {
                console.log(`🆕 Imported ${summary.created} new match(es):`,
                    created.map(c => `${c.teamA} vs ${c.teamB} (${c.date})`).join(', '));
            }
            if (summary.rescheduled > 0) {
                console.log(`🔄 Rescheduled ${summary.rescheduled} match(es):`,
                    rescheduled.map(r => `fixture ${r.fixtureId} ${r.from.date} ${r.from.slot} → ${r.to.date} ${r.to.slot}${r.revived ? ' (revived)' : ''}`).join(', '));
            }
            if (summary.created === 0 && summary.rescheduled === 0) {
                console.log(`✅ All synced (${summary.fetched} checked, 0 new, 0 moved)`);
            }

            return null;
        } catch (error) {
            console.error('❌ Scheduled Big4 sync failed:', error.message);
            return null;
        }
    });
