#!/usr/bin/env node
/**
 * QW Stats — Manual Update Script
 *
 * Fetches new 4on4 games from QWHub and imports them into PostgreSQL.
 * First run catches up the entire gap, subsequent runs grab just the delta.
 *
 * Usage:
 *   # From project root (db.js loads .env automatically):
 *   node qw-stats/scripts/update-games.js
 */

const pool = require('./db');
const { runUpdate } = require('../api/updater');

async function main() {
    console.log('QW Stats — Manual Update\n');
    const result = await runUpdate(pool);
    if (result.error) {
        console.error('\nUpdate failed:', result.error);
        process.exit(1);
    }
}

main()
    .catch(err => {
        console.error('Fatal:', err);
        process.exit(1);
    })
    .finally(() => pool.end());
