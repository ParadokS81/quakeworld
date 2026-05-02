-- apps/qw-oracle/db/seeds/discord_channels.sql
-- Operator-known Discord channel metadata. Idempotent; values mirror data/qw.db
-- as of 2026-05-02. Apply via scripts/load-chat/seed-discord-channels.ts.

INSERT INTO discord_channels (channel_name, channel_id, guild_id) VALUES
  ('#antilag',     '854976516231397417', '166866762787192833'),
  ('#dev-corner',  '179895022366228481', '166866762787192833'),
  ('#helpdesk',    '709360526899150858', '166866762787192833'),
  ('#quakeworld',  '166866762787192833', '166866762787192833')
ON CONFLICT (channel_name) DO UPDATE
  SET channel_id = EXCLUDED.channel_id,
      guild_id   = EXCLUDED.guild_id;
