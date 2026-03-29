/**
 * Shared PostgreSQL connection pool.
 * Reads credentials from environment variables (or .env file via dotenv).
 *
 * Set these in your .env (see ../.env.example):
 *   PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD
 */
try { require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') }); } catch (_) {}

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'quake_stats',
    user: process.env.PG_USER || 'phoenix',
    password: process.env.PG_PASSWORD || '',
    max: 5,
});

module.exports = pool;
