-- docs-l1-enrichment (operator opt-in 2026-06-09): QWCL command-line params.
-- 72 total = 20 borrowed from ezQuake (origin='inherited', anchor=ezquake head)
-- + 52 QWCL-only synthesized one-liners (origin='synthesized', anchor='2.33'),
-- source-grounded from the QWCL arg parser (COM_CheckParm sites). cmdline_param
-- has no category column -> descriptions only. Idempotent.
BEGIN;

-- Part A: borrow 20 from ezQuake
UPDATE entities q SET
  description = ez.description,
  description_origin = 'inherited',
  description_anchor_version = 'ezquake@e4a2c20a',
  description_rereview = false
FROM entities ez
WHERE q.project='qwcl' AND q.type='cmdline_param'
  AND ez.project='ezquake' AND ez.type='cmdline_param' AND ez.name_fold=q.name_fold
  AND ez.description IS NOT NULL AND ez.description<>'';

-- Part B: synth 52 QWCL-only
CREATE TEMP TABLE _d(name text, descr text) ON COMMIT DROP;
INSERT INTO _d(name,descr) VALUES
('-allow360',$$Allows 360-pixel-wide video modes to remain in the mode list, which the client otherwise drops to save space when many 320-wide modes exist.$$),
('-cdmediacheck',$$Enables periodic checking for CD media changes (a disc being inserted or removed) for CD audio playback.$$),
('-current',$$Uses the current desktop resolution as the fullscreen video mode instead of switching to a preset mode.$$),
('-d',$$(SVGAlib build) Sets the color depth, in bits, of the requested video mode, used together with -w and -h.$$),
('-dibonly',$$Forces the WinQuake software renderer to use only the GDI/DIB output path, disabling DirectDraw and WinDirect.$$),
('-dinput',$$Uses DirectInput for mouse input instead of standard Windows messages, giving more reliable raw movement.$$),
('-force',$$Adds a custom video mode (from -width/-height) to the mode list even if the display did not enumerate it.$$),
('-fullsbar',$$Draws the status bar across the full width of the screen rather than at console width.$$),
('-gl11',$$Forces the plain OpenGL 1.1 path (loading opengl32.dll), bypassing multitexture and other extensions.$$),
('-h',$$(SVGAlib build) Sets the height, in pixels, of the requested video mode.$$),
('-lm_1',$$Selects the GL_LUMINANCE single-channel OpenGL lightmap texture format (the default).$$),
('-lm_2',$$Selects the GL_RGBA4 (16-bit) OpenGL lightmap texture format.$$),
('-lm_4',$$Selects the full GL_RGBA (32-bit) OpenGL lightmap texture format.$$),
('-lm_a',$$Selects the GL_ALPHA single-channel OpenGL lightmap texture format.$$),
('-lm_i',$$Selects the GL_INTENSITY single-channel OpenGL lightmap texture format.$$),
('-mdev',$$(Linux build) Sets the mouse device file to read, overriding the default /dev/mouse.$$),
('-mode',$$Selects the fullscreen video mode by its number in the mode list.$$),
('-mrate',$$(Linux build) Sets the serial mouse sample rate, overriding the default of 1200.$$),
('-no8bit',$$Disables the 8-bit shared-texture-palette OpenGL extension, forcing full-color textures.$$),
('-noadjustaspect',$$Stops the client from halving the width of very wide (dual-monitor) video modes.$$),
('-noautostretch',$$Prevents the client from automatically choosing a stretched windowed mode on desktops wider than 640 pixels.$$),
('-nocdaudio',$$Disables CD audio (music) playback entirely.$$),
('-nodd',$$Disables DirectDraw, forcing the WinQuake software renderer onto the GDI path (alias of -nodirectdraw).$$),
('-noddraw',$$Disables DirectDraw, forcing the WinQuake software renderer onto the GDI path (alias of -nodirectdraw).$$),
('-nodirectdraw',$$Disables DirectDraw, forcing the WinQuake software renderer onto the GDI path.$$),
('-noforcemaccel',$$Stops the client from overriding the Windows mouse acceleration setting while running.$$),
('-noforcemparms',$$Stops the client from overriding the Windows mouse parameters (threshold and speed) while running.$$),
('-noforcemspd',$$Stops the client from overriding the Windows mouse speed setting while running.$$),
('-noforcevga',$$Stops the software renderer from forcibly including the 320x200 VGA mode in the mode list.$$),
('-nofulldib',$$Disables the use of a fullscreen DIB (GDI) video mode in WinQuake.$$),
('-nojoy',$$Disables joystick input.$$),
('-nokbd',$$(Linux build) Disables keyboard input handling.$$),
('-nomouse',$$Disables mouse input.$$),
('-notriplebuf',$$Disables triple buffering of the video output.$$),
('-novesa',$$Disables the WinDirect fullscreen video path in the WinQuake software renderer (treated like -nowindirect).$$),
('-nowd',$$Disables the WinDirect fullscreen video path (short form of -nowindirect).$$),
('-nowindirect',$$Disables the WinDirect (MGL) fullscreen video path in the WinQuake software renderer.$$),
('-primarysound',$$Mixes directly into the DirectSound primary buffer instead of a secondary buffer, reducing latency on some hardware.$$),
('-resetwinpos',$$Resets the saved game-window position to the default, useful if the window opened off-screen.$$),
('-simsound',$$Enables fake-DMA sound: the mixer runs but no audio is sent to the hardware (used for testing).$$),
('-sndbits',$$(Linux/OSS build) Sets the sound sample size in bits (8 or 16).$$),
('-sndmono',$$(Linux/OSS build) Forces single-channel (mono) sound output.$$),
('-sndspeed',$$(Linux/OSS build) Sets the sound sample rate, in Hz.$$),
('-sndstereo',$$(Linux/OSS build) Forces two-channel (stereo) sound output.$$),
('-snoforceformat',$$Stops the DirectSound code from forcing its preferred sample format on the output device.$$),
('-surfcachesize',$$Sets the size, in bytes, of the surface cache used by the software renderer.$$),
('-verbose',$$(X11 build) Prints extra diagnostic information about the display and chosen visual at startup.$$),
('-visualid',$$(X11 build) Selects a specific X11 visual by its numeric id instead of letting the client choose.$$),
('-w',$$(SVGAlib build) Sets the width, in pixels, of the requested video mode.$$),
('-wavonly',$$Uses the older waveOut sound output instead of DirectSound.$$),
('-winsize',$$(X11 build) Sets the client window size as width and height in pixels.$$),
('-zone',$$Sets the size, in bytes, of the zone memory heap used for small dynamic allocations.$$);

UPDATE entities q SET
  description = d.descr,
  description_origin = 'synthesized',
  description_anchor_version = '2.33',
  description_rereview = false
FROM _d d WHERE q.project='qwcl' AND q.type='cmdline_param' AND q.name_fold=d.name;

-- guards
SELECT 'borrow_inherited' AS check, count(*) FROM entities WHERE project='qwcl' AND type='cmdline_param' AND description_origin='inherited';
SELECT 'synth_applied' AS check, count(*) FROM entities WHERE project='qwcl' AND type='cmdline_param' AND description_origin='synthesized';
SELECT 'unmatched_synth' AS check, d.name FROM _d d WHERE NOT EXISTS (SELECT 1 FROM entities e WHERE e.project='qwcl' AND e.type='cmdline_param' AND e.name_fold=d.name);
SELECT 'cmdline_null_desc' AS check, count(*) FROM entities WHERE project='qwcl' AND type='cmdline_param' AND (description IS NULL OR description='');
COMMIT;
