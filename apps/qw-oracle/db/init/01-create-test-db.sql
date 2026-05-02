-- Runs once on first container boot via /docker-entrypoint-initdb.d/.
-- Creates the test database used by `bun test` (per decisions.md D13).
-- The dev database `qw_oracle` is created by POSTGRES_DB env on entrypoint.
CREATE DATABASE qw_oracle_test;
