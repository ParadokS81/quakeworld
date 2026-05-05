-- apps/qw-oracle/db/migrations/008_community_schema.sql
-- Phase 1 (QWiki community-reference arc): community schema + placeholder tables.
--
-- D2: community schema is separate from L1 (different lifecycle).
-- D5: is_substantive (recognition signal) and has_note (prose-content flag) are
--     independent booleans on every row table. Do not merge them.
-- D9: community.tournaments ships with placeholder columns only; tournament-specific
--     columns (year, mode, format, etc.) land in migration 009 post-Phase-4 pilot.
-- D10: source TEXT NOT NULL on cross-link tables; CHECK constraints enforce the
--      enum values defined in decisions.md.
-- D15: append-only. Never edit this file after it is applied.

CREATE SCHEMA IF NOT EXISTS community;

-- ---------------------------------------------------------------------------
-- community.players
-- Every player gets a row (recognition signal). Notes are emitted only for
-- entries with has_note=true (unique prose content the schema cannot carry).
-- is_substantive drives the L2 corpus primer nick-recognition list (D5, D6).
-- ---------------------------------------------------------------------------
CREATE TABLE community.players (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  display_name      TEXT,
  aliases           TEXT[],
  real_name         TEXT,
  nationality       TEXT,
  nationality_iso   TEXT,
  current_clan      TEXT,
  active_year_start INT,
  active_year_end   INT,
  status            TEXT
                      CHECK (status IS NULL
                             OR status IN ('Active', 'Retired', 'Inactive', 'Quit', 'unknown')),
  community_roles   TEXT[],
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT
                      CHECK (source_template IS NULL
                             OR source_template IN ('infobox_player', 'player_info',
                                                    'bullet_prose', 'none')),
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

CREATE INDEX community_players_status      ON community.players (status);
CREATE INDEX community_players_nationality ON community.players (nationality_iso);
CREATE INDEX community_players_is_substantive ON community.players (is_substantive)
  WHERE is_substantive = TRUE;

-- ---------------------------------------------------------------------------
-- community.clans
-- Every clan gets a row. Same two-threshold model as players (D5).
-- ---------------------------------------------------------------------------
CREATE TABLE community.clans (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  prefix            TEXT,
  nationality       TEXT,
  nationality_iso   TEXT,
  founded_year      INT,
  founded_month     INT,
  founded_day       INT,
  founded_by        TEXT,
  disbanded         TEXT,
  status            TEXT
                      CHECK (status IS NULL
                             OR status IN ('Active', 'Inactive', 'Disbanded', 'unknown')),
  irc_channel       TEXT,
  irc_network       TEXT,
  website           TEXT,
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT
                      CHECK (source_template IS NULL
                             OR source_template IN ('infobox_clan', 'clan_info',
                                                    'infobox_4on4team',
                                                    'bullet_prose', 'none')),
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

CREATE INDEX community_clans_status            ON community.clans (status);
CREATE INDEX community_clans_nationality       ON community.clans (nationality_iso);
CREATE INDEX community_clans_is_substantive    ON community.clans (is_substantive)
  WHERE is_substantive = TRUE;

-- ---------------------------------------------------------------------------
-- community.tournaments
-- Placeholder columns only per D9. tournament-specific columns land in
-- migration 009 after the Phase 4 pilot surfaces template variants.
-- ---------------------------------------------------------------------------
CREATE TABLE community.tournaments (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  has_note          BOOLEAN NOT NULL DEFAULT FALSE,
  is_substantive    BOOLEAN NOT NULL DEFAULT FALSE,
  is_stub           BOOLEAN NOT NULL DEFAULT TRUE,
  source_template   TEXT,
  source_categories TEXT[],
  wiki_revision_id  BIGINT,
  wiki_fetched_at   TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- community.player_clan_eras
-- Clan membership per player, per era. Parsed from TH rows and bullet-prose
-- clan history sections (Phase 5 backfill). clan_slug is nullable when the
-- referenced clan does not resolve to a community.clans row (unrecognized
-- clan name preserved in clan_title). source column per D10.
--
-- PK is a surrogate id (BIGSERIAL). start_year is nullable: bullet-list
-- Clan-history sections (ParadokS-style) routinely lack year information;
-- the parser produces those rows faithfully and the schema accepts them.
-- era_seq preserves source-list order for year-absent rows so the rendered
-- timeline is stable across re-loads. Idempotency on re-load is enforced by
-- the UNIQUE constraint over (player_slug, clan_title, start_year, source) --
-- year-known rows dedupe deterministically; year-absent rows are uncommon
-- and Phase 5 truncates-and-rebuilds the table per re-run regardless.
-- ---------------------------------------------------------------------------
CREATE TABLE community.player_clan_eras (
  id           BIGSERIAL PRIMARY KEY,
  player_slug  TEXT NOT NULL REFERENCES community.players (slug),
  clan_slug    TEXT,
  clan_title   TEXT NOT NULL,
  start_year   INT,
  end_year     INT,
  era_seq      INT,
  source       TEXT NOT NULL
                 CHECK (source IN ('wiki_TH', 'wiki_bullet',
                                   'tournament-archive', 'manual')),
  UNIQUE (player_slug, clan_title, start_year, source)
);

CREATE INDEX community_player_clan_eras_player_slug ON community.player_clan_eras (player_slug);
CREATE INDEX community_player_clan_eras_clan_slug   ON community.player_clan_eras (clan_slug)
  WHERE clan_slug IS NOT NULL;
CREATE INDEX community_player_clan_eras_start_year  ON community.player_clan_eras (start_year)
  WHERE start_year IS NOT NULL;

-- ---------------------------------------------------------------------------
-- community.tournament_results
-- Per-player tournament results. Parsed from achievement lists (Phase 5).
-- tournament_slug is nullable when the referenced tournament does not resolve
-- to a community.tournaments row. source column per D10.
-- No surrogate PK: (player_slug, tournament_title, year, place) is not
-- perfectly unique in the wiki (a player can place at the same tournament
-- in two modes). Using a BIGSERIAL surrogate PK for simplicity; the
-- natural composite is enforced via a unique index only when duplicates
-- surfaced in Phase 5 data turn out to be errors vs real multi-entry data.
-- ---------------------------------------------------------------------------
CREATE TABLE community.tournament_results (
  id               BIGSERIAL PRIMARY KEY,
  player_slug      TEXT NOT NULL REFERENCES community.players (slug),
  tournament_slug  TEXT,
  tournament_title TEXT NOT NULL,
  year             INT,
  place            TEXT,
  mode             TEXT,
  team             TEXT,
  team_flag        TEXT,
  source           TEXT NOT NULL
                     CHECK (source IN ('wiki_achievement', 'wiki_TH',
                                       'tournament-archive', 'manual'))
);

CREATE INDEX community_tournament_results_player_slug      ON community.tournament_results (player_slug);
CREATE INDEX community_tournament_results_tournament_slug  ON community.tournament_results (tournament_slug)
  WHERE tournament_slug IS NOT NULL;
CREATE INDEX community_tournament_results_year             ON community.tournament_results (year);
