-- docs-l1-enrichment: synth the 2 undescribed MVDSV antilag cvars.
-- Source-grounded from research/repos/mvdsv/src/sv_phys.c:53-55 + behavior
-- sites (sv_user.c:4513 lagged-ent list at any non-zero; pr_cmds.c:663
-- MOVE_LAGGED on QC traceline at ==2; sv_phys.c:751 projectile MOVE_LAGGED
-- requires ==2 && sv_antilag_projectiles). House style matches the 180
-- existing synthesized mvdsv cvars; anchor = mvdsv head git-describe.
-- Idempotent: re-running sets identical rows.
BEGIN;

UPDATE entities SET
  description = $d$Master switch for the server's antilag (lag compensation). When enabled, the server keeps a short history of each player's recent positions and, when a shot is fired, rewinds the other players to where the shooter actually saw them -- so hits register from the shooter's point of view instead of being lost to ping. The value is published in serverinfo.

0 (or empty) = off.
1 = on -- the firing player's shots are tested against other players' rewound positions.
2 = extended -- also routes mod (QuakeC) traceline checks through lag-compensated positions, and is the level required before sv_antilag_projectiles can lag-compensate projectiles.

Default: empty (off).
Set by: server config.$d$,
  description_origin = 'synthesized',
  description_anchor_version = '1.11-53-g18d0362',
  description_rereview = false
WHERE project='mvdsv' AND type='cvar' AND name='sv_antilag';

UPDATE entities SET
  description = $d$Extends lag compensation to projectiles (rockets, grenades, nails) so they are traced against the rewound positions of other players, not just instant-hit weapons. It only takes effect when sv_antilag is set to 2; at lower antilag levels the setting is ignored. The value is published in serverinfo.

0 (or empty) = off -- projectiles use live positions.
Non-zero = on -- projectiles are traced with lag-compensated positions (requires sv_antilag 2).

Default: empty (off).
Set by: server config.$d$,
  description_origin = 'synthesized',
  description_anchor_version = '1.11-53-g18d0362',
  description_rereview = false
WHERE project='mvdsv' AND type='cvar' AND name='sv_antilag_projectiles';

COMMIT;

-- verify
SELECT name, description_origin, description_anchor_version, left(description,48) AS preview
FROM entities WHERE project='mvdsv' AND type='cvar'
  AND name IN ('sv_antilag','sv_antilag_projectiles');
