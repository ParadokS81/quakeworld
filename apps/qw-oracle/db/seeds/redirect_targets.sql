-- apps/qw-oracle/db/seeds/redirect_targets.sql
-- Operator-curated routing for redirect_to_human. Idempotent: ON CONFLICT
-- updates display_name / url / description so re-running this seed picks up
-- edits. The Discord channel IDs and expert URLs are placeholders the
-- operator fills in before Phase 8 (public deploy); see Open question 5.

INSERT INTO redirect_targets (topic, display_name, url, description) VALUES
  ('discord-helpdesk',
   'Quake.World Discord #helpdesk',
   'https://discord.com/channels/REPLACE_GUILD_ID/REPLACE_CHANNEL_ID',
   'Active community helpdesk for ezQuake / FTE / general configuration questions.'),
  ('discord-dev-corner',
   'Quake.World Discord #dev-corner',
   'https://discord.com/channels/REPLACE_GUILD_ID/REPLACE_CHANNEL_ID',
   'Engine and tooling development discussion.'),
  ('ezquake-docs',
   'ezQuake Documentation',
   'https://ezquake.com/docs/',
   'Authoritative ezQuake feature guides.'),
  ('quakeworld-wiki',
   'wiki.quakeworld.nu',
   'https://wiki.quakeworld.nu/',
   'Community wiki: maps, configs, history.'),
  ('expert-spoike',
   'Spoike (FTE engine maintainer)',
   'https://discord.com/users/REPLACE_USER_ID',
   'Authoritative on FTE-specific behaviour.'),
  ('expert-meag',
   'meag (ezQuake maintainer)',
   'https://discord.com/users/REPLACE_USER_ID',
   'Authoritative on ezQuake recent versions.')
ON CONFLICT (topic) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  url          = EXCLUDED.url,
  description  = EXCLUDED.description;
