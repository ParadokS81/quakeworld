#!/usr/bin/env node
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'data', 'qw-stats.db'), { readonly: true });

// Date distribution
const dates = db.prepare(`
    SELECT substr(date, 1, 7) as month, COUNT(*) as cnt
    FROM games WHERE date IS NOT NULL
    GROUP BY month ORDER BY month
`).all();

console.log('Date distribution in local dataset:');
for (const d of dates) console.log('  ' + d.month + ': ' + d.cnt + ' games');

const total = db.prepare('SELECT COUNT(*) as c, MIN(date) as mi, MAX(date) as ma FROM games').get();
console.log('\nTotal: ' + total.c + ' games from ' + (total.mi || '').substring(0,10) + ' to ' + (total.ma || '').substring(0,10));

// 4on4 comp only
const comp = db.prepare(`
    SELECT substr(date, 1, 7) as month, COUNT(*) as cnt
    FROM games
    WHERE date IS NOT NULL AND player_count = 8 AND mode = 'team'
      AND map IN ('dm2','dm3','e1m2','schloss','phantombase') AND duration >= 600
    GROUP BY month ORDER BY month
`).all();

console.log('\nComp 4on4 by month:');
for (const d of comp) console.log('  ' + d.month + ': ' + d.cnt + ' games');

db.close();
