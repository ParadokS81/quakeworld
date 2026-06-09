-- docs-l1-enrichment: QWCL light-synth + residual categorize.
--  Part A: 45 plain one-line descriptions for the QWCL-only cvar+command
--          (no ezQuake match). origin='synthesized', anchor='2.33'. Posterity
--          bar; source-grounded from QW/client/*.c (obscure ones verified).
--  Part B: categories for all 75 still-uncategorized QWCL cvar+command:
--          the 45 synth-set + the 30 that inherited a description but whose
--          ezQuake counterpart had no head-version group. Same major-group
--          (cvar) / command-group (cmd) vocabularies as the borrow.
-- QWCL is not arc-scoped, so 'synthesized' passes the global origin guard.
BEGIN;

-- Part A: descriptions (dollar-quoted to avoid apostrophe escaping)
CREATE TEMP TABLE _d(type text, name text, descr text) ON COMMIT DROP;
INSERT INTO _d(type,name,descr) VALUES
('cvar','ambient_fade',$$Controls how quickly looping ambient (environmental) sounds fade in or out as the player moves toward or away from their source.$$),
('cvar','ambient_level',$$Sets the baseline volume of ambient world sounds such as water, wind, and slime. 0 silences them.$$),
('cvar','bgmbuffer',$$Size, in samples, of the buffer used for background music playback.$$),
('cvar','cl_predict_players2',$$A second toggle, working alongside cl_predict_players, that controls client-side prediction of other players' movement; prediction is disabled only when both are off.$$),
('cvar','entlatency',$$Sets the latency window (in milliseconds) the client uses when interpolating other entities' movement between server updates.$$),
('cvar','gamma',$$Adjusts the display gamma (brightness) of the rendered image. Values below 1 brighten the picture.$$),
('cvar','gl_keeptjunctions',$$Controls whether T-junctions in world geometry are kept; keeping them avoids visible cracks between adjacent polygons at the cost of extra vertices.$$),
('cvar','gl_nobind',$$Developer toggle that skips binding textures, drawing surfaces untextured -- used to measure texture-binding cost.$$),
('cvar','gl_reporttjunctions',$$Developer toggle that prints the number of T-junctions found in the level geometry to the console.$$),
('cvar','gl_texsort',$$Controls whether world surfaces are sorted by texture before drawing (the multitexture render path); turning it off uses the simpler single-texture path.$$),
('cvar','host_speeds',$$Developer toggle that prints per-frame timing -- server, graphics, and total milliseconds -- to the console each frame.$$),
('cvar','joywwhack1',$$Joystick axis workaround: when nonzero, shifts the joystick's U-axis reading, a fix for certain controllers or drivers.$$),
('cvar','joywwhack2',$$Companion joystick axis workaround to joywwhack1 for adjusting problematic controller axis behavior.$$),
('cvar','lcd_x',$$Sets the horizontal eye-offset for the legacy LCD shutter-glasses stereo 3D mode. 0 disables the stereo split.$$),
('cvar','loadas8bit',$$Controls whether sound samples are converted to 8-bit when loaded, trading audio quality for lower memory use.$$),
('cvar','nosound',$$Disables all sound output when set to 1.$$),
('cvar','precache',$$Controls whether sounds are precached (preloaded) at level start rather than loaded on first use.$$),
('cvar','registered',$$Read-only flag indicating whether the registered (full, non-shareware) Quake data is present, which unlocks the complete content set.$$),
('cvar','r_mirroralpha',$$Sets the opacity of mirror surfaces; values below 1 make mirrors partly see-through.$$),
('cvar','r_norefresh',$$Developer toggle that stops the 3D world from being redrawn, leaving only the 2D elements -- used for profiling.$$),
('cvar','r_wateralpha',$$Sets the opacity of translucent liquid surfaces; values below 1 let you see through water, slime, and lava.$$),
('cvar','r_waterwarp',$$Controls the underwater screen-warp (ripple) distortion effect. 0 disables it.$$),
('cvar','_snd_mixahead',$$Sets how far ahead, in seconds, the sound engine mixes audio. Larger values reduce stutter but add audio latency.$$),
('cvar','snd_noextraupdate',$$Developer toggle that disables the extra mid-frame sound update, used to study sound timing.$$),
('cvar','snd_show',$$Developer toggle that prints the currently playing sound channels to the console each frame.$$),
('cvar','sys_linerefresh',$$Developer/debug toggle for the line-by-line screen refresh on the Linux build.$$),
('cvar','vid_redrawfull',$$Forces a full-screen redraw each frame on the Linux GL build, working around partial-refresh artifacts.$$),
('cvar','vid_wait',$$Controls whether the video update waits for vertical retrace (an early form of vertical sync).$$),
('cvar','vid_waitforrefresh',$$Linux-build toggle to wait for the monitor's refresh before presenting a frame, reducing tearing.$$),
('cvar','_vid_wait_override',$$Internal override governing the vid_wait vertical-retrace behavior.$$),
('command','changing',$$Internal command the server sends to tell the client a level change is underway; the client clears its state and prepares to reconnect to the new map.$$),
('command','envmap',$$Captures six screenshots from the current viewpoint, one per cardinal direction, forming an environment (cube) map -- a content/development tool.$$),
('command','fullserverinfo',$$Internal command carrying the server's complete serverinfo string to the client; sent by the server, not typed by users.$$),
('command','gl_texturemode',$$Sets the OpenGL texture filtering mode (for example GL_LINEAR or GL_NEAREST), controlling whether textures look smoothed or pixelated; with no argument it prints the current mode.$$),
('command','nextul',$$Internal command that sends the next block of an in-progress client file upload.$$),
('command','rerecord',$$Restarts demo recording on the current connection, beginning a fresh demo without disconnecting.$$),
('command','stopul',$$Stops an in-progress client file upload.$$),
('command','stuffcmds',$$Executes any '+' commands passed on the command line at startup (such as +connect or +map). Run once during initialization.$$),
('command','togglechat',$$Toggles the console chat input prompt on or off.$$),
('command','vid_debug',$$SVGAlib-build developer command that prints video-mode debugging information.$$),
('command','vid_describecurrentmode',$$Prints the details -- resolution, color depth, refresh -- of the video mode currently in use.$$),
('command','vid_describemode',$$Prints the details of a video mode identified by its number.$$),
('command','vid_describemodes',$$Lists every available video mode with its details.$$),
('command','vid_fullscreen',$$Switches the client into a fullscreen video mode.$$),
('command','vid_nummodes',$$Prints the number of available video modes.$$);

UPDATE entities q SET
  description = d.descr,
  description_origin = 'synthesized',
  description_anchor_version = '2.33',
  description_rereview = false
FROM _d d WHERE q.project='qwcl' AND q.type=d.type AND q.name_fold=d.name;

-- Part B: categories for the 75 still-uncategorized (synth-set + inherited-ungrouped)
CREATE TEMP TABLE _qc(type text, name text, cat text) ON COMMIT DROP;
INSERT INTO _qc(type,name,cat) VALUES
-- synth-set cvars
('cvar','ambient_fade','Sound'),('cvar','ambient_level','Sound'),('cvar','bgmbuffer','Sound'),
('cvar','cl_predict_players2','Multiplayer'),('cvar','entlatency','Multiplayer'),('cvar','gamma','Graphics'),
('cvar','gl_keeptjunctions','Graphics'),('cvar','gl_nobind','Graphics'),('cvar','gl_reporttjunctions','Graphics'),
('cvar','gl_texsort','Graphics'),('cvar','host_speeds','Miscellaneous'),('cvar','joywwhack1','Input'),
('cvar','joywwhack2','Input'),('cvar','lcd_x','Graphics'),('cvar','loadas8bit','Sound'),
('cvar','nosound','Sound'),('cvar','precache','Sound'),('cvar','registered','Miscellaneous'),
('cvar','r_mirroralpha','Graphics'),('cvar','r_norefresh','Graphics'),('cvar','r_wateralpha','Graphics'),
('cvar','r_waterwarp','Graphics'),('cvar','_snd_mixahead','Sound'),('cvar','snd_noextraupdate','Sound'),
('cvar','snd_show','Sound'),('cvar','sys_linerefresh','Miscellaneous'),('cvar','vid_redrawfull','Graphics'),
('cvar','vid_wait','Graphics'),('cvar','vid_waitforrefresh','Graphics'),('cvar','_vid_wait_override','Graphics'),
-- synth-set commands
('command','changing','Miscellaneous'),('command','envmap','Development'),('command','fullserverinfo','Miscellaneous'),
('command','gl_texturemode','Video'),('command','nextul','Miscellaneous'),('command','rerecord','Demos'),
('command','stopul','Miscellaneous'),('command','stuffcmds','Miscellaneous'),('command','togglechat','Communication'),
('command','vid_debug','Development'),('command','vid_describecurrentmode','Video'),('command','vid_describemode','Video'),
('command','vid_describemodes','Video'),('command','vid_fullscreen','Video'),('command','vid_nummodes','Video'),
-- inherited-but-ungrouped cvars
('cvar','block_switch','Miscellaneous'),('cvar','d_mipcap','Graphics'),('cvar','d_mipscale','Graphics'),
('cvar','d_subdiv16','Graphics'),('cvar','gl_affinemodels','Graphics'),('cvar','gl_cull','Graphics'),
('cvar','gl_ztrick','Graphics'),('cvar','pushlatency','Multiplayer'),('cvar','r_draworder','Graphics'),
('cvar','r_lightmap','Graphics'),('cvar','scr_printspeed','Graphics'),('cvar','vid_config_x','Graphics'),
('cvar','vid_config_y','Graphics'),('cvar','_vid_default_mode','Graphics'),('cvar','_vid_default_mode_win','Graphics'),
('cvar','vid_fullscreen_mode','Graphics'),('cvar','vid_mode','Graphics'),('cvar','vid_nopageflip','Graphics'),
('cvar','vid_stretch_by_2','Graphics'),('cvar','vid_windowed_mode','Graphics'),('cvar','vid_window_x','Graphics'),
('cvar','vid_window_y','Graphics'),('cvar','_windowed_mouse','Input'),
-- inherited-but-ungrouped commands
('command','menu_keys','Menu'),('command','menu_video','Menu'),('command','pointfile','Development'),
('command','vid_forcemode','Video'),('command','vid_minimize','Video'),('command','vid_testmode','Video'),
('command','vid_windowed','Video');

UPDATE cvar_versions qcv SET
  category_inferred = m.cat,
  category_inferred_origin = 'claude-opus-4-8|qwcl-synth-v1'
FROM entities q, _qc m
WHERE qcv.entity_id=q.id AND q.project='qwcl' AND q.type='cvar' AND q.name_fold=m.name AND m.type='cvar';

UPDATE command_versions qcm SET
  category_inferred = m.cat,
  category_inferred_origin = 'claude-opus-4-8|qwcl-synth-v1'
FROM entities q, _qc m
WHERE qcm.entity_id=q.id AND q.project='qwcl' AND q.type='command' AND q.name_fold=m.name AND m.type='command';

-- guards
SELECT 'desc_synth_applied' AS check, count(*) FROM entities WHERE project='qwcl' AND description_origin='synthesized';
SELECT 'unmatched_desc' AS check, d.type, d.name FROM _d d
  WHERE NOT EXISTS (SELECT 1 FROM entities e WHERE e.project='qwcl' AND e.type=d.type AND e.name_fold=d.name);
SELECT 'unmatched_cat' AS check, m.type, m.name FROM _qc m
  WHERE NOT EXISTS (SELECT 1 FROM entities e WHERE e.project='qwcl' AND e.type=m.type AND e.name_fold=m.name);
SELECT 'qwcl_null_desc' AS check, count(*) FROM entities WHERE project='qwcl' AND type IN ('cvar','command') AND (description IS NULL OR description='');
SELECT 'qwcl_null_cat_cvar' AS check, count(*) FROM entities e JOIN cvar_versions cv ON cv.entity_id=e.id WHERE e.project='qwcl' AND e.type='cvar' AND cv.category_inferred IS NULL;
SELECT 'qwcl_null_cat_cmd' AS check, count(*) FROM entities e JOIN command_versions cm ON cm.entity_id=e.id WHERE e.project='qwcl' AND e.type='command' AND cm.category_inferred IS NULL;
SELECT 'qwcl_xor_cvar' AS check, count(*) FROM cvar_versions cv JOIN entities q ON q.id=cv.entity_id WHERE q.project='qwcl' AND ((cv.category_inferred IS NULL)<>(cv.category_inferred_origin IS NULL));
SELECT 'qwcl_xor_cmd' AS check, count(*) FROM command_versions cm JOIN entities q ON q.id=cm.entity_id WHERE q.project='qwcl' AND ((cm.category_inferred IS NULL)<>(cm.category_inferred_origin IS NULL));
COMMIT;

-- final QWCL category distribution
SELECT 'cvar' t, cv.category_inferred, count(*) FROM entities q JOIN cvar_versions cv ON cv.entity_id=q.id AND cv.version='2.33' WHERE q.project='qwcl' GROUP BY 2 ORDER BY 3 DESC;
SELECT 'cmd' t, cm.category_inferred, count(*) FROM entities q JOIN command_versions cm ON cm.entity_id=q.id AND cm.version='2.33' WHERE q.project='qwcl' GROUP BY 2 ORDER BY 3 DESC;
