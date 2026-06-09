-- docs-l1-enrichment: QTV (52) + QWFWD (42) categorize. Writes category_inferred
-- to ALL version rows per entity (both projects are dual-version: frozen +
-- head), origin built per project. Match on name_fold. Idempotent + guards.
BEGIN;
CREATE TEMP TABLE _c(project text, type text, name text, cat text) ON COMMIT DROP;
INSERT INTO _c(project,type,name,cat) VALUES
-- ===== QTV: Upstream sources =====
('qtv','command','close','Upstream sources'),
('qtv','command','list','Upstream sources'),
('qtv','command','playdemo','Upstream sources'),
('qtv','command','qtv','Upstream sources'),
('qtv','cvar','maxchains','Upstream sources'),
('qtv','cvar','maxservers','Upstream sources'),
('qtv','cvar','parse_delay','Upstream sources'),
('qtv','cvar','ustream_read_buf_size','Upstream sources'),
('qtv','cvar','ustream_timeout','Upstream sources'),
('qtv','cvar','ustream_write_buf_size','Upstream sources'),
-- ===== QTV: Downstream viewers =====
('qtv','command','dclose','Downstream viewers'),
('qtv','command','dlist','Downstream viewers'),
('qtv','cvar','dstream_read_buf_size','Downstream viewers'),
('qtv','cvar','dstream_timeout','Downstream viewers'),
('qtv','cvar','dstream_write_buf_size','Downstream viewers'),
('qtv','cvar','fp_messages','Downstream viewers'),
('qtv','cvar','fp_persecond','Downstream viewers'),
('qtv','cvar','fp_secondsdead','Downstream viewers'),
('qtv','cvar','maxclients','Downstream viewers'),
-- ===== QTV: Downloads =====
('qtv','cvar','allow_download','Downloads'),
('qtv','cvar','allow_download_demos','Downloads'),
('qtv','cvar','allow_download_maps','Downloads'),
('qtv','cvar','allow_download_models','Downloads'),
('qtv','cvar','allow_download_other','Downloads'),
('qtv','cvar','allow_download_skins','Downloads'),
('qtv','cvar','allow_download_sounds','Downloads'),
('qtv','cvar','demo_dir','Downloads'),
-- ===== QTV: Web interface =====
('qtv','cvar','http_enabled','Web interface'),
('qtv','cvar','http_idletimeout','Web interface'),
('qtv','cvar','http_readtimeout','Web interface'),
('qtv','cvar','http_server_cert_file','Web interface'),
('qtv','cvar','http_server_key_file','Web interface'),
('qtv','cvar','http_upload_enabled','Web interface'),
('qtv','cvar','http_upload_file_limit','Web interface'),
('qtv','cvar','http_upload_total_limit','Web interface'),
('qtv','cvar','http_writetimeout','Web interface'),
-- ===== QTV: Logging =====
('qtv','cvar','log_level','Logging'),
('qtv','cvar','log_pretty','Logging'),
('qtv','cvar','log_timeformat','Logging'),
-- ===== QTV: Network & identity =====
('qtv','cvar','address','Network & identity'),
('qtv','cvar','hostname','Network & identity'),
('qtv','cvar','listen_address','Network & identity'),
('qtv','cvar','masters','Network & identity'),
('qtv','cvar','network','Network & identity'),
('qtv','cvar','qtv_password','Network & identity'),
('qtv','cvar','tick_time','Network & identity'),
-- ===== QTV: Console control =====
('qtv','command','cmdlist','Console control'),
('qtv','command','echo','Console control'),
('qtv','command','exec','Console control'),
('qtv','command','quit','Console control'),
('qtv','command','status','Console control'),
('qtv','command','varlist','Console control'),
-- ===== QWFWD: Access control & bans =====
('qwfwd','command','addip','Access control & bans'),
('qwfwd','command','banip','Access control & bans'),
('qwfwd','command','banlist','Access control & bans'),
('qwfwd','command','banremove','Access control & bans'),
('qwfwd','command','listip','Access control & bans'),
('qwfwd','command','removeip','Access control & bans'),
('qwfwd','command','whitelist','Access control & bans'),
('qwfwd','command','whitelistadd','Access control & bans'),
('qwfwd','command','whitelistpurge','Access control & bans'),
('qwfwd','command','whitelistremove','Access control & bans'),
('qwfwd','command','writeip','Access control & bans'),
-- ===== QWFWD: Master servers & discovery =====
('qwfwd','command','heartbeat','Master servers & discovery'),
('qwfwd','command','svlist','Master servers & discovery'),
('qwfwd','cvar','masters','Master servers & discovery'),
('qwfwd','cvar','masters_filter_servers','Master servers & discovery'),
('qwfwd','cvar','masters_heartbeat','Master servers & discovery'),
('qwfwd','cvar','masters_query','Master servers & discovery'),
-- ===== QWFWD: Network, identity & forwarding =====
('qwfwd','command','cllist','Network, identity & forwarding'),
('qwfwd','command','serverinfo','Network, identity & forwarding'),
('qwfwd','cvar','city','Network, identity & forwarding'),
('qwfwd','cvar','coords','Network, identity & forwarding'),
('qwfwd','cvar','countrycode','Network, identity & forwarding'),
('qwfwd','cvar','hostname','Network, identity & forwarding'),
('qwfwd','cvar','hostport','Network, identity & forwarding'),
('qwfwd','cvar','maxclients','Network, identity & forwarding'),
('qwfwd','cvar','net_ip','Network, identity & forwarding'),
('qwfwd','cvar','net_port','Network, identity & forwarding'),
-- ===== QWFWD: Console & scripting =====
('qwfwd','command','alias','Console & scripting'),
('qwfwd','command','cmdlist','Console & scripting'),
('qwfwd','command','cvarlist','Console & scripting'),
('qwfwd','command','echo','Console & scripting'),
('qwfwd','command','exec','Console & scripting'),
('qwfwd','command','help','Console & scripting'),
('qwfwd','command','if','Console & scripting'),
('qwfwd','command','inc','Console & scripting'),
('qwfwd','command','quit','Console & scripting'),
('qwfwd','command','set','Console & scripting'),
('qwfwd','command','toggle','Console & scripting'),
('qwfwd','command','unalias','Console & scripting'),
('qwfwd','command','unaliasall','Console & scripting'),
('qwfwd','command','wait','Console & scripting'),
-- ===== QWFWD: Diagnostics =====
('qwfwd','cvar','developer','Diagnostics');

UPDATE cvar_versions cv SET
  category_inferred = m.cat,
  category_inferred_origin = 'claude-opus-4-8|'||m.project||'-categorize-v1'
FROM entities e, _c m
WHERE cv.entity_id=e.id AND e.project=m.project AND e.type='cvar'
  AND e.name_fold=m.name AND m.type='cvar';

UPDATE command_versions cm SET
  category_inferred = m.cat,
  category_inferred_origin = 'claude-opus-4-8|'||m.project||'-categorize-v1'
FROM entities e, _c m
WHERE cm.entity_id=e.id AND e.project=m.project AND e.type='command'
  AND e.name_fold=m.name AND m.type='command';

-- guards
SELECT 'dup_mapping' AS check, project, type, name, count(*) FROM _c GROUP BY project,type,name HAVING count(*)>1;
SELECT 'unmatched_mapping' AS check, m.project, m.type, m.name FROM _c m
  WHERE NOT EXISTS (SELECT 1 FROM entities e WHERE e.project=m.project AND e.type=m.type AND e.name_fold=m.name);
SELECT 'null_cat_cvar' AS check, count(*) AS n FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id
  WHERE e.project IN ('qtv','qwfwd') AND e.type='cvar' AND cv.category_inferred IS NULL;
SELECT 'null_cat_cmd' AS check, count(*) AS n FROM entities e JOIN command_versions cm ON cm.entity_id=e.id
  WHERE e.project IN ('qtv','qwfwd') AND e.type='command' AND cm.category_inferred IS NULL;
COMMIT;

-- distribution
SELECT e.project, COALESCE(cv.category_inferred,cm.category_inferred) AS cat, count(DISTINCT e.id) AS n
FROM entities e
  LEFT JOIN cvar_versions cv ON cv.entity_id=e.id AND e.type='cvar' AND cv.version IN ('1.16-dev','1.40-dev')
  LEFT JOIN command_versions cm ON cm.entity_id=e.id AND e.type='command' AND cm.version IN ('1.16-dev','1.40-dev')
WHERE e.project IN ('qtv','qwfwd') AND e.type IN ('cvar','command')
GROUP BY 1,2 ORDER BY 1,3 DESC;
