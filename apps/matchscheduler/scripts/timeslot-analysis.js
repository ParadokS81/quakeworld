#!/usr/bin/env node
/**
 * Analyse scheduled matches and open proposals:
 * - How many confirmed matches (user-created, not big4_import) land on :00 vs :30 min marks
 * - Same breakdown for confirmed timeslots inside open proposals
 */

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

function minuteMark(slotId) {
    // slotId format: "mon_2000" or "mon_2030"
    const time = slotId.split('_')[1]; // "2000" or "2030"
    return time ? time.slice(2) : null; // "00" or "30"
}

async function main() {
    console.log('\n========== TIMESLOT USAGE ANALYSIS ==========\n');

    // --- 1. Confirmed scheduled matches (exclude big4_import) ---
    const matchSnap = await db.collection('scheduledMatches').get();

    const userMatches = [];
    const big4Matches = [];

    matchSnap.forEach(doc => {
        const d = doc.data();
        const origin = d.origin || 'proposal'; // legacy = proposal
        if (origin === 'big4_import') {
            big4Matches.push({ id: doc.id, slotId: d.slotId, origin });
        } else {
            userMatches.push({ id: doc.id, slotId: d.slotId, origin });
        }
    });

    console.log(`Total scheduledMatches: ${matchSnap.size}`);
    console.log(`  big4_import (excluded): ${big4Matches.length}`);
    console.log(`  User-created (proposal + quick_add): ${userMatches.length}\n`);

    const matchOn00 = userMatches.filter(m => minuteMark(m.slotId) === '00');
    const matchOn30 = userMatches.filter(m => minuteMark(m.slotId) === '30');
    const matchOther = userMatches.filter(m => !['00','30'].includes(minuteMark(m.slotId)));

    console.log('--- Scheduled Matches (user-created) ---');
    console.log(`  :00 (full hour):  ${matchOn00.length}`);
    console.log(`  :30 (half hour):  ${matchOn30.length}`);
    if (matchOther.length) console.log(`  Other:            ${matchOther.length}`);

    if (matchOn30.length > 0) {
        console.log('\n  :30 matches detail:');
        matchOn30.forEach(m => console.log(`    ${m.id} → ${m.slotId} (${m.origin})`));
    }

    // --- 2. Open proposals — confirmed timeslots on each side ---
    const proposalSnap = await db.collection('matchProposals')
        .where('status', '==', 'open')
        .get();

    console.log(`\nOpen proposals: ${proposalSnap.size}`);

    let propSlots00 = 0, propSlots30 = 0, propSlotsOther = 0;
    const prop30Details = [];

    proposalSnap.forEach(doc => {
        const d = doc.data();
        // confirmations map: { [slotId]: { ... } } for each side
        const sides = ['homeConfirmations', 'awayConfirmations'];
        sides.forEach(side => {
            const confs = d[side] || {};
            Object.keys(confs).forEach(slotId => {
                const mark = minuteMark(slotId);
                if (mark === '00') propSlots00++;
                else if (mark === '30') {
                    propSlots30++;
                    prop30Details.push({ proposalId: doc.id, slotId, side });
                }
                else propSlotsOther++;
            });
        });
    });

    const totalPropSlots = propSlots00 + propSlots30 + propSlotsOther;
    console.log(`\n--- Confirmed slots inside open proposals ---`);
    console.log(`  Total confirmed slots: ${totalPropSlots}`);
    console.log(`  :00 (full hour):  ${propSlots00}`);
    console.log(`  :30 (half hour):  ${propSlots30}`);
    if (propSlotsOther) console.log(`  Other:            ${propSlotsOther}`);

    if (prop30Details.length > 0) {
        console.log('\n  :30 proposal slots detail:');
        prop30Details.forEach(p => console.log(`    proposalId=${p.proposalId} slot=${p.slotId} (${p.side})`));
    }

    // --- Summary ---
    const total00 = matchOn00.length + propSlots00;
    const total30 = matchOn30.length + propSlots30;
    const grandTotal = total00 + total30 + matchOther.length + propSlotsOther;

    console.log('\n========== SUMMARY ==========');
    console.log(`Combined (matches + proposal confirmations):`);
    console.log(`  :00 full hour: ${total00}  (${grandTotal ? Math.round(total00/grandTotal*100) : 0}%)`);
    console.log(`  :30 half hour: ${total30}  (${grandTotal ? Math.round(total30/grandTotal*100) : 0}%)`);
    console.log('');
}

main().catch(console.error).finally(() => process.exit(0));
