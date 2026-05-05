-- 009_ktx_log_template_logfile_channel.sql
--
-- Widen log_template_versions.channel CHECK to admit 'logfile' for KTX's
-- log_printf() emission API. KTX's existing 3 channels map cleanly to MVDSV's
-- (G_bprint -> broadcast, G_sprint -> client, G_cprint -> console); the new
-- 'logfile' channel is unique to KTX's log_printf() (~28 call sites at
-- canonical KTX 1.46).
--
-- Pure additive; no data backfill required (no prior rows with
-- channel='logfile' exist).

ALTER TABLE log_template_versions
  DROP CONSTRAINT log_template_versions_channel_check;

ALTER TABLE log_template_versions
  ADD CONSTRAINT log_template_versions_channel_check
  CHECK (channel IN ('broadcast','client','console','system','logfile'));
