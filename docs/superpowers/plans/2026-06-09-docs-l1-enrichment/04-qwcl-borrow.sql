-- docs-l1-enrichment: QWCL borrow. For the ~263 QWCL cvar+command that
-- name-match an ezQuake entity carrying a description:
--   (1) copy ezQuake entities.description -> QWCL entities.description
--       (origin='inherited', anchor=ezquake head commit e4a2c20a)
--   (2) cvar category_inferred = ezQuake cvar major-group (Obsolete remapped
--       to functional group), written to BOTH qwcl version rows
--   (3) command category_inferred = prettified ezQuake command-group name
-- QWCL is NOT in the origin_vocabulary arc-scoped guard, so 'inherited' passes
-- the global guard. Idempotent. Guards at end.
BEGIN;

-- ezQuake cvar group-id -> major-group (Obsolete ids remapped to the functional
-- major-group implied by their fine name: Audio->Sound, Video/SoftwareRenderer->
-- Graphics, InputSystems->Input, Authentication/CustomBrowser->Multiplayer,
-- serverinfokeys->Server, Commands/Invalid/generic->Miscellaneous).
CREATE TEMP TABLE _gmap(id text, major text) ON COMMIT DROP;
INSERT INTO _gmap(id,major) VALUES
('0','Miscellaneous'),('2','Miscellaneous'),('3','HUD'),('4','Miscellaneous'),
('5','HUD'),('6','Graphics'),('7','Demos'),('8','Graphics'),('9','Input'),
('10','Input'),('11','Input'),('12','Miscellaneous'),('13','Teamplay'),
('14','Teamplay'),('15','Graphics'),('16','Demos'),('17','Miscellaneous'),
('18','Sound'),('19','HUD'),('20','Demos'),('21','Multiplayer'),
('22','Miscellaneous'),('23','Miscellaneous'),('24','Miscellaneous'),
('25','Multiplayer'),('26','Sound'),('27','Multiplayer'),('28','Input'),
('29','Miscellaneous'),('30','Graphics'),('31','Graphics'),('32','Sound'),
('33','Miscellaneous'),('34','Server'),('35','Graphics'),('36','Graphics'),
('37','Multiplayer'),('38','Multiplayer'),('39','Graphics'),('40','Graphics'),
('41','Graphics'),('42','Multiplayer'),('43','Server'),('44','Multiplayer'),
('45','Sound'),('46','Multiplayer'),('47','HUD'),('48','Miscellaneous'),
('49','Teamplay'),('50','Graphics'),('51','Graphics'),('52','Graphics'),
('53','Graphics'),('54','Graphics');

-- (1) descriptions (entities, single row)
UPDATE entities q SET
  description = ez.description,
  description_origin = 'inherited',
  description_anchor_version = 'ezquake@e4a2c20a',
  description_rereview = false
FROM entities ez
WHERE q.project='qwcl' AND q.type IN ('cvar','command')
  AND ez.project='ezquake' AND ez.type=q.type AND ez.name_fold=q.name_fold
  AND ez.description IS NOT NULL AND ez.description<>'';

-- (2) cvar categories -> ezQuake major-group (both qwcl version rows)
UPDATE cvar_versions qcv SET
  category_inferred = gm.major,
  category_inferred_origin = 'claude-opus-4-8|qwcl-inherit-v1'
FROM entities q
  JOIN entities ez ON ez.project='ezquake' AND ez.type='cvar' AND ez.name_fold=q.name_fold
       AND ez.description IS NOT NULL AND ez.description<>''
  JOIN cvar_versions ezcv ON ezcv.entity_id=ez.id AND ezcv.version='head'
  JOIN _gmap gm ON gm.id = ezcv.help_group_id
WHERE qcv.entity_id=q.id AND q.project='qwcl' AND q.type='cvar';

-- (3) command categories -> prettified ezQuake command-group (both version rows)
UPDATE command_versions qcm SET
  category_inferred = CASE ezcm.help_group_id
    WHEN 'action' THEN 'Actions'
    WHEN 'misc' THEN 'Miscellaneous'
    WHEN 'config' THEN 'Configuration'
    WHEN 'comm' THEN 'Communication'
    WHEN 'game' THEN 'Game'
    WHEN 'demo' THEN 'Demos'
    WHEN 'menu' THEN 'Menu'
    WHEN 'video' THEN 'Video'
    WHEN 'hud' THEN 'HUD'
    WHEN 'sb' THEN 'Status bar'
    WHEN 'dev' THEN 'Development'
    WHEN 'teamplay' THEN 'Teamplay'
    WHEN 'server' THEN 'Server'
    WHEN 'screenshot' THEN 'Screenshot'
    ELSE initcap(ezcm.help_group_id)
  END,
  category_inferred_origin = 'claude-opus-4-8|qwcl-inherit-v1'
FROM entities q
  JOIN entities ez ON ez.project='ezquake' AND ez.type='command' AND ez.name_fold=q.name_fold
       AND ez.description IS NOT NULL AND ez.description<>''
  JOIN command_versions ezcm ON ezcm.entity_id=ez.id AND ezcm.version='head'
WHERE qcm.entity_id=q.id AND q.project='qwcl' AND q.type='command';

-- guards
SELECT 'desc_inherited' AS check, count(*) AS n FROM entities
  WHERE project='qwcl' AND description_origin='inherited';
SELECT 'cvar_cat_entities' AS check, count(DISTINCT q.id) AS n FROM entities q
  JOIN cvar_versions cv ON cv.entity_id=q.id WHERE q.project='qwcl' AND cv.category_inferred IS NOT NULL;
SELECT 'cmd_cat_entities' AS check, count(DISTINCT q.id) AS n FROM entities q
  JOIN command_versions cm ON cm.entity_id=q.id WHERE q.project='qwcl' AND cm.category_inferred IS NOT NULL;
SELECT 'xor_violation_cvar' AS check, count(*) AS n FROM cvar_versions cv JOIN entities q ON q.id=cv.entity_id
  WHERE q.project='qwcl' AND ((cv.category_inferred IS NULL) <> (cv.category_inferred_origin IS NULL));
SELECT 'xor_violation_cmd' AS check, count(*) AS n FROM command_versions cm JOIN entities q ON q.id=cm.entity_id
  WHERE q.project='qwcl' AND ((cm.category_inferred IS NULL) <> (cm.category_inferred_origin IS NULL));
SELECT 'inherited_no_cvar_cat' AS check, count(DISTINCT q.id) AS n FROM entities q
  JOIN cvar_versions cv ON cv.entity_id=q.id
  WHERE q.project='qwcl' AND q.type='cvar' AND q.description_origin='inherited' AND cv.category_inferred IS NULL;
COMMIT;

-- distribution (frozen version only, to count entities once)
SELECT 'cvar' AS type, cv.category_inferred, count(*) FROM entities q JOIN cvar_versions cv ON cv.entity_id=q.id AND cv.version='2.33'
  WHERE q.project='qwcl' AND cv.category_inferred IS NOT NULL GROUP BY 2 ORDER BY 3 DESC;
SELECT 'cmd' AS type, cm.category_inferred, count(*) FROM entities q JOIN command_versions cm ON cm.entity_id=q.id AND cm.version='2.33'
  WHERE q.project='qwcl' AND cm.category_inferred IS NOT NULL GROUP BY 2 ORDER BY 3 DESC;
