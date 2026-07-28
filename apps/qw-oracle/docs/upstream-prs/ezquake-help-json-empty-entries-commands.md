# ezQuake help-JSON empty-entries audit -- command pass (2026-05-15)

Output of the parking-doc audit at `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`. This is the **command** pass following the cvar pass shipped 2026-05-14. Scope: client-side ezQuake commands (sv_*-source-file filter applied) that exist in current source HEAD AND have no human-written prose in `help_commands.json`.

## Counts

| Verdict | Count | Notes |
|---|---|---|
| `needs_doc` | 97 | 95 high confidence, 2 medium |
| `no_doc` | 0 | -- |
| `family_collapse` | 27 rows / 17 families | 13 families in queue, 4 with head already documented |
| `kick_to_ciscon` | 33 | 26 host.c shims + 5 dead/removed + 2 other legacy redirects |
| **Total** | **157** | matches queue size |

The dominant structural finding is the `host.c` Cmd_AddLegacyCommand block: 26 of the 33 kick_to_ciscon entries are deprecated compatibility shims registered in a single block at `host.c:559-595`. These are not commands -- they are legacy rename redirects (old cvar/command name -> new name) that the L1 extractor classified as commands because Cmd_AddLegacyCommand uses the same registration surface as Cmd_AddCommand. The five `null_source` entries are either ghost placeholders removed by PR #1120 or commands from the deleted mp3 subsystem. The remaining two (scr_printspeed, vid_framebuffer_palette) are Cmd_AddLegacyCommand shims to cvars found in other source files.

---

## Family collapse (17 families covering 27 entries)

### `+cl_wp_stats` (covers 2 siblings)
**Members:** `+cl_wp_stats`, `-cl_wp_stats`
**Augmented head description (paste into help_commands.json):**
> Hold to show the weapon stats HUD overlay. Sets hud_weaponstats_show to 1, making the on-screen weapon accuracy panel visible. Release with -cl_wp_stats to hide it.

**Reasoning:** SCR_MvdWeaponStatsOn_f sets hud_weaponstats_show=1; SCR_MvdWeaponStatsOff_f sets it to 0. Pure show/hide toggle driven by the hold gesture.

---

### `+fire` (covers 2 siblings)
**Members:** `+fire`, `-fire`
**Augmented head description (paste into help_commands.json):**
> Fires using a prioritized weapon list supplied as arguments (e.g. `+fire 3 5 2`). Selects the best available weapon from the list, issues the attack impulse, and tracks which key triggered the press so key-up correctly releases only the matching press. Use this for standard weapon-switch-and-fire binds. Release with `-fire`.

**Reasoning:** +fire and -fire share IN_FireDown / IN_FireUp and follow the standard +/- mirror convention (key-down / key-release). One sentence covers the pair.

---

### `+fire_ar` (covers 2 siblings)
**Members:** `+fire_ar`, `-fire_ar`
**Augmented head description (paste into help_commands.json):**
> Anti-rollover variant of `+fire`. Fires and selects the best weapon from the supplied list, but tracks pressed keys in a separate stack (`cl.ar_keycodes`) so that releasing one of several simultaneously-held fire keys restores the weapon order and attack state of the key still held, rather than simply releasing attack. Use `+fire_ar` instead of `+fire` when binding fire to multiple keys that may overlap (e.g. different weapon-priority lists on mouse buttons held at the same time). Release with `-fire_ar`.

**Reasoning:** Both handlers branch on Cmd_Argv(0) to detect the _ar suffix and take a distinct code path: KeyDown_common is called with NULL_KEY and the real key code is pushed onto cl.ar_keycodes[]; on key-up, IN_AntiRolloverFireKeyUp pops the stack and restores the previous weapon state.

---

### `+qtv_delay` (covers 2 siblings)
**Members:** `+qtv_delay`, `-qtv_delay`
**Augmented head description (paste into help_commands.json):**
> Pauses QTV stream playback while the key is held, letting the receive buffer fill. Releasing the key (via -qtv_delay) commits the accumulated buffer as a deliberate delay: qtv_buffertime is updated to the buffered duration in seconds and playback resumes from the buffered position. If no data was buffered when the key is released, playback resumes immediately with no delay applied. Only active during QTV playback.

**Reasoning:** QtvStartDelay_f sets qtv_playback_paused = true; QtvEndDelay_f calls Demo_BufferSize to measure the buffered milliseconds, writes that value into qtv_buffertime, then clears qtv_playback_paused.

---

### `+voip` (covers 2 siblings)
**Members:** `+voip`, `-voip`
**Augmented head description (paste into help_commands.json):**
> Hold to activate push-to-talk voice transmission. Sets bit 2 of cl_voip_send, enabling microphone capture and sending encoded voice data to the server. Release with -voip to stop transmitting.

**Reasoning:** S_Voip_Enable_f sets cl_voip_send |= 2 (bit 2 = manual PTT override); S_Voip_Disable_f clears that bit. VAD and cl_voip_send=1 can transmit independently; +voip is the explicit push-to-talk path.

---

### `+zoom` (covers 2 siblings)
**Members:** `+zoom`, `-zoom`
**Augmented head description (paste into help_commands.json):**
> Hold to enter zoom view. Saves the current fov and sensitivity values, then forces fov to 35 degrees and scales sensitivity proportionally so aim speed remains consistent at the narrower field of view. Release with -zoom to restore both values.

**Reasoning:** SCR_ZoomIn_f snaps scr_fov to the hardcoded ZOOMEDFOV=35 and rescales sensitivity by (35/currentfov); SCR_ZoomOut_f restores both saved values. No configurable zoom cvar -- the target FOV is a compile-time constant.

---

### `exec` (covers 1 sibling)
**Members:** `serverexec`
Head already documented in help_commands.json -- existing description stays.

**Member note (`serverexec`):** The member row carries a proposed_desc explaining the routing distinction (cbuf_server vs cbuf_main). Aggregator anomaly: member row had a non-null proposed_desc. The description is load-bearing context for anyone encountering serverexec -- recommend the head entry for `exec` be augmented with a cross-reference to serverexec and the explanation that serverexec routes the script to the server command buffer instead of the main client buffer.
**Member classification:** family_member, family_head: exec

---

### `fs_dir` (covers 2 siblings)
**Members:** `fs_dir`, `dir`
**Augmented head description (paste into help_commands.json):**
> Lists files in the VFS under a given directory, with optional filtering and display options.
> Usage: `fs_dir <directory> [file_suffix] [hidedir] [hideext] [hidesize]`
> `<directory>` is a path within the VFS search path; an optional `<file_suffix>` filters results to files with that extension.
> Display flags: hidedir removes the directory prefix from each filename; hideext strips the file extension; hidesize suppresses the file size column.
> Each matching entry is printed with its size in bytes unless hidesize is set.
> Legacy alias: `dir`.

**Reasoning:** FS_Dir_f (lines 2068-2105) parses Cmd_Argc args and passes FS_DIR_HIDE_* flags to FS_EnumerateFiles. `dir` is registered via Cmd_AddLegacyCommand.

---

### `fs_loadpak` (covers 2 siblings)
**Members:** `fs_loadpak`, `loadpak`
**Augmented head description (paste into help_commands.json):**
> Attempts to load one or more .pak files into the virtual filesystem search path.
> Usage: `fs_loadpak <pakname> [<pakname> ...]`
> Each `<pakname>` is tried first as a bare path, then under ezquake/, qw/, and id1/ with a .pak extension appended.
> Note: the add operation is currently stubbed out (VFS-FIXME in source) and will always report failure; only fs_removepak reliably changes the active pak set.
> Cannot be used while connected to a server. Legacy alias: `loadpak`.

**Reasoning:** FS_PakAdd_f calls FS_PakOper_Process(PAKOP_ADD). FS_PakOperation line 1122 shows PAKOP_ADD returns false unconditionally with a VFS-FIXME comment.

---

### `fs_locate` (covers 2 siblings)
**Members:** `fs_locate`, `locate`
**Augmented head description (paste into help_commands.json):**
> Locates a file within the VFS search path and reports which search entry contains it.
> Usage: `fs_locate <filename>`
> Prints the containing search path entry (directory or pak file). If the file is compressed inside an archive, prints "File is compressed inside" followed by the archive path. Prints "Not found" if the file does not exist in the search path.
> Legacy alias: `locate`.

**Reasoning:** FS_Locate_f (lines 2113-2136) calls FS_FLocateFile and branches on whether the raw name is populated (uncompressed vs compressed inside pack).

---

### `fs_removepak` (covers 2 siblings)
**Members:** `fs_removepak`, `removepak`
**Augmented head description (paste into help_commands.json):**
> Removes one or more .pak files from the virtual filesystem search path.
> Usage: `fs_removepak <pakname> [<pakname> ...]`
> Each `<pakname>` is tried as a bare path and then under ezquake/, qw/, and id1/ with a .pak extension; the first successful match is removed and the file cache is flushed.
> Cannot be used while connected to a server. Legacy alias: `removepak`.

**Reasoning:** FS_PakRem_f calls FS_PakOper_Process(PAKOP_REM) which calls FS_RemovePak. Unlike PAKOP_ADD, PAKOP_REM is fully implemented.

---

### `qtv_query_sourcelist` (covers 2 siblings)
**Members:** `qtv_query_sourcelist`, `qtv_query_demolist`
**Augmented head description (paste into help_commands.json):**
> Queries a QTV proxy for its list of active sources (live streams). Usage: `qtv_query_sourcelist hostname[:port] [password]`. Opens a TCP connection to the proxy and sends a `SOURCELIST` request; results are buffered and printed asynchronously as the proxy responds. The companion command `qtv_query_demolist` sends a `DEMOLIST` request to the same proxy instead.

**Reasoning:** CL_QTVList_f dispatches on Cmd_Argv(0): "qtv_query_sourcelist" sends "SOURCELIST\n", anything else sends "DEMOLIST\n". The commands differ by the request verb sent to the proxy (SOURCELIST vs DEMOLIST), returning different data sets.

---

### `record` (covers 1 sibling)
**Members:** `recordqwd`
Head already documented in help_commands.json -- existing description stays.

**Member classification:** family_member, family_head: record

---

### `s_restart` (covers 2 siblings)
**Members:** `s_restart`, `snd_restart`
**Augmented head description (paste into help_commands.json):**
> Restarts the sound system. Shuts down the current audio session, reinitialises the audio driver, and reprecaches all sounds the server has already sent to the client. Use after changing audio settings (such as s_khz or s_desiredsamples) that require a full audio reset to take effect. The legacy alias snd_restart is equivalent.

**Reasoning:** Handler S_Restart_f calls S_Shutdown then S_Startup, then iterates cl.sound_name[] to reprecache every server-sent sound. Also triggered automatically by OnChange callbacks for s_khz and s_desiredsamples.

---

### `set_ex` (covers 1 sibling)
**Members:** `set_ex2`
Head already documented in help_commands.json -- existing description stays.

**Member note (`set_ex2`):** set_ex2 uses the same handler Cvar_Set_ex_f but skips fun-char parsing (TP_ParseFunChars). set_ex expands macros AND parses fun chars (color/special character codes); set_ex2 expands macros but skips fun-char parsing. Recommend augmenting the head entry for `set_ex` with a cross-reference explaining this distinction.
**Member classification:** family_member, family_head: set_ex

---

### `stop` (covers 1 sibling)
**Members:** `stopqwd`
Head already documented in help_commands.json -- existing description stays.

**Member note (`stopqwd`):** The member row carries a proposed_desc. stopqwd bypasses the listen-server routing branch in CL_Stop_f and always stops client-side QWD recording, whereas `stop` routes to the server-side MVD stop command in a listen-server build. Recommend augmenting the head entry for `stop` with a note that stopqwd provides the guaranteed client-side path.
**Member classification:** family_member, family_head: stop

---

### `track1` (covers 4 siblings)
**Members:** `track1`, `track2`, `track3`, `track4`

**Aggregator note:** track2, track3, and track4 had non-null proposed_descs in the batch (anomaly -- member rows should have null). Their descriptions were slot-specific variants of the track1 head description. The head description below covers the family pattern; per-slot wording is in each member's batch entry if needed for individual JSON entries.

**Augmented head description (paste into help_commands.json):**
> In multiview mode, locks view slot 1 onto a specific player. Accepts a player name or user ID (usage: `track1 <userid> | <name> | off`). Pass "off" to reset slot 1 to its default assignment. Only available while connected as a spectator. Commands track2, track3, and track4 lock the corresponding view slots 2, 3, and 4 in the same manner.

**Reasoning:** CL_TrackMV1_f is CL_Track(MV_VIEW1) where MV_VIEW1=0. track1/2/3/4 are structurally identical -- each calls CL_Track(N) with slot index 0/1/2/3 respectively. The "off" keyword resets the slot; userid/name selects the player.

---

## Needs-doc drafts (97 entries)

Grouped by source file, sorted by entry count descending.

---

### cl_main.c (13 entries)

- **`hud_fps_min_reset`** (high) -- Resets the minimum FPS and maximum frametime counters tracked by the HUD performance display. Sets cls.min_fps back to 9999.0 and cls.max_frametime back to 0.0, then triggers a fresh FPS calculation via CL_CalcFPS. Use this after a stutter spike to clear the worst-case reading and start a clean measurement window.

- **`dev_gfxtexturedump`** (high) -- Dumps all currently loaded OpenGL textures to PNG files in a timestamped folder under qw/. Creates a directory named textures_YYYY-MM-DD_HH-MM-SS inside the base directory, then writes one PNG per loaded 2D texture and one PNG per face for cubemap textures, named by texture index and identifier. Requires a build compiled with WITH_RENDERING_TRACE and the rendering debug context active (-r-debug or -r-trace launch parameter).

- **`dev_physicsnormalsave`** (high) -- Saves all custom physics-normal overrides for the current map to a .qpn file. Writes to qw/<mapname>.qpn in the base directory and prints the filename on success. Requires the client to be active on a devmap (r_refdef2.allow_cheats must be set); prints "Not available outwith /devmap" otherwise. Part of the dev_physicsnormal* workflow: use dev_physicsnormalshow to inspect the current surface normal, dev_physicsnormalset to assign a new one, then dev_physicsnormalsave to persist it.

- **`authenticate`** (high) -- Initiates or cancels server authentication using the login token loaded for cl_username. If already logged in (loginname is set on the local player slot), sends a logout command to the server and prints "Logging out...". Otherwise sends "cmd login <username>" to begin the authentication handshake. Requires cl_username to be set and a valid login token to be loaded from the configuration directory; prints guidance if either is missing. Must be connected to a server; prints "Cannot authenticate, not connected" otherwise.

- **`dev_gfxbenchmarklightmaps`** (high) -- Benchmarks all supported OpenGL lightmap format and type combinations and prints results sorted by upload time. For each valid format/type pair, uploads a full lightmap tile 1000 times, measures total elapsed time, then prints a ranked table to the console with the fastest format highlighted. Helps developers identify the optimal lightmap format for the current GPU and driver. Registered unconditionally; available in all builds.

- **`dev_gfxtexturelist`** (high) -- Lists all currently loaded OpenGL textures to the console, showing index, identifier, width, height, and texture mode for each valid slot. Accepts an optional regex pattern as the first argument to filter output to matching identifiers only. Example: `dev_gfxtexturelist skin` lists only textures whose identifier contains "skin". Requires a build compiled with WITH_RENDERING_TRACE and the rendering debug context active.

- **`dev_gfxtrace`** (high) -- Queues a single-frame rendering trace for the next rendered frame. Sets an internal flag (dev_frame_debug_queued) that causes the renderer to emit a detailed GL state log for that frame. Requires a build compiled with WITH_RENDERING_TRACE and the debug profile context active (-r-debug or -r-trace launch parameter). The trace is also triggered automatically at the start of each frame when the debug context is active.

- **`dev_physicsnormalset`** (high) -- Sets a custom physics normal for the ground surface directly beneath the player. Usage: `dev_physicsnormalset <x> <y> <z> <flags>`. The x/y/z arguments specify the desired normal vector (normalized automatically). The flags argument is a string of zero or more characters: x, y, z to flip the corresponding axis, or n to set no flip flags. Requires devmap (allow_cheats) and that the player is standing on a surface with an existing physics normal entry; prints the updated normal via dev_physicsnormalshow on success.

- **`dev_physicsnormalshow`** (high) -- Prints the plane and physics normal for the ground surface directly beneath the player. Displays the geometry plane normal and, if a custom physics normal is defined for the surface, shows each axis value with a color highlight for any flipped axes. Reports "Not on ground" if no ground trace is found, and "No custom physics plane found" if the surface has no override. Requires devmap (allow_cheats) to run.

- **`hash`** (high) -- Prints the internal hash value for a given string using the engine's sdbm-based hash function. Usage: `hash <string>`. Outputs an unsigned integer to the console. The hash is case-insensitive (letters are folded to uppercase before hashing). Primarily a developer diagnostic for inspecting cvar and alias lookup keys.

- **`qwurl`** (high) -- Connects to a server or QTV stream using a qw:// URL. Usage: `qwurl <qw://host[:port][/command]>`. The URL must start with qw://. The optional path component selects the action: omitted or "join" or "connect" joins as a player; "spectate" or "observe" joins as a spectator; "qtv[/password]" connects to a QTV proxy. A challenge response path ("challenge?...") is also handled internally. Semicolons in the URL are rejected to prevent command injection. Example: `qwurl qw://qw.server.se:27500/spectate`.

- **`register_qwurl_protocol`** (high) -- Registers the qw:// URL scheme with the operating system so browsers and other applications can launch ezQuake directly from qw:// links. On Windows, writes registry entries under HKCU\Software\Classes\qw to associate the scheme with the current ezQuake executable. On Linux, writes a .desktop file to ~/.local/share/applications/qw-url-handler.desktop and calls xdg-mime to activate it. macOS prints "Not yet implemented". Accepts an optional "quiet" argument to suppress the confirmation message. Available on Windows and Linux builds only.

- **`togglespec`** (high) -- Toggles between spectator and player mode on the current server. If the spectator cvar is set (spectator mode is active), calls join to switch to player mode. If spectator is unset (player mode is active), calls observe to switch to spectator mode. Useful for binding a single key to flip between the two roles without two separate commands.

---

### cl_demo.c (9 entries)

- **`mvdrecord`** (high) -- Records the currently active QTV/MVD stream to a local .mvd file. Usage: `mvdrecord <filename>`. Without arguments, reports whether recording is in progress and the current output path. Stops any existing MVD recording before starting a new one. Only available while connected to a server or a QTV stream (not while mid-connection); the file is written to the demo directory with a `.mvd` extension appended automatically.

- **`mvdstop`** (high) -- Stops an in-progress client-side MVD recording started with `mvdrecord`. Finalises the .mvd file by writing a disconnect packet and closing the file handle. Prints "Completed demo" on success, "Not recording a demo" if no MVD recording is active, or a bug notice if the recording flag is set but the file handle is unexpectedly null.

- **`demo_controls`** (high) -- Toggles the graphical demo controls overlay during demo playback. When turned on, displays an interactive HUD panel with playback controls (speed, jump, timeline). Press Escape inside the panel to dismiss it. Has no effect and prints an error if no demo is currently playing and the panel is not already shown.

- **`demo_jump_mark`** (high) -- Seeks forward in the current demo to the next demo mark (a pre-embedded timestamp anchor in the .qwd or .mvd file). Requires a demo to be in active playback state. If no mark is found before the end of the demo, playback advances as far as possible. Prints an error if not playing a demo or if the demo is not yet in the active state.

- **`demo_jump_end`** (high) -- Seeks to near the end of the current demo, stopping approximately 2 seconds before the final frame (10 seconds before end if in intermission). Requires a demo to be in active playback state. Prints an error if already too close to the end, if not playing a demo, or if the demo is not yet fully active.

- **`timedemo2`** (high) -- Plays a demo at maximum speed and reports performance, like `timedemo`, but simulates playback at a fixed frame rate instead of uncapped. Usage: `timedemo2 <demoname> [fps]`. The optional fps argument sets the simulated frame rate; defaults to 308 fps and must be between 20 and 10000. This mode produces more consistent benchmark results across hardware compared to the classic uncapped timedemo.

- **`qtvplay`** (high) -- Connects to and begins streaming from a QTV proxy. Usage: `qtvplay [stream@]hostname[:port] [password]`. The optional stream prefix selects a specific source on the proxy (e.g. `5@qtv.host:28000`). An HTTP watch URL (`http://host:port/watch.qtv?sid=N`) is also accepted and rewritten internally. A `.qtv` file path prefixed with `#` is accepted and dispatched to the appropriate join/observe/stream command found inside the file. Saves the connection address for use by `qtvreconnect`.

- **`qtvreconnect`** (high) -- Reconnects to the most recently used QTV proxy using the address and password saved from the last successful `qtvplay` call. Prints an error and does nothing if no previous QTV connection has been established in the current session.

- **`qtv_fixuser`** (high) -- Manually overrides player userinfo fields for a specified user ID in a QTV stream, as a workaround for bugged QTV streams that send incorrect or missing player metadata. Usage: `qtv_fixuser <userid> <spectator|player> <name> [team] [topcolor] [bottomcolor]`. Without sufficient arguments, lists current players with their user IDs and frag counts. Only valid while viewing a QTV stream (`qtvplay`); has no effect on live server sessions or local demo playback.

---

### hud.c (8 entries)

- **`show`** (high) -- `show <element>` -- makes the named HUD element visible by setting its show cvar to 1. Use `show all` to make every registered HUD element visible at once. Running `show` with no argument prints usage and lists the current visibility status of all elements. Example: `show teaminfo`, `show clock`, `show all`.

- **`hide`** (high) -- `hide <element>` -- makes the named HUD element invisible by setting its show cvar to 0. Use `hide all` to hide every registered HUD element at once. Running `hide` with no argument prints usage and lists the current visibility status of all elements. Example: `hide teaminfo`, `hide clock`, `hide all`.

- **`togglehud`** (high) -- `togglehud <element | cvar>` -- toggles a HUD element between shown and hidden. If the argument matches a registered HUD element, its visibility is flipped; if it matches a cvar instead, the cvar value is toggled between 0 and 1. Requires exactly one argument; running without an argument prints usage. Example: `togglehud teaminfo`, `togglehud scr_fov`.

- **`move`** (high) -- `move <element> <x> <y>` -- sets the pixel offset of the named HUD element relative to its current placement and alignment anchor. Both x and y are floating-point values. Running `move <element>` with no coordinates prints the element's current x/y offset. Example: `move clock 10 5`, `move fps -20 0`.

- **`place`** (high) -- `place <element> <area>` -- anchors the named HUD element to a named screen area or to another HUD element. Built-in area names are: `screen`, `top`, `view`, `sbar`, `ibar`, `hbar`, `sfree`, `ifree`, `hfree`. To anchor inside another element use `@elem`; to anchor outside it use the bare element name. Running `place <element>` with no area argument prints the element's current placement. An invalid area is rejected and the old value is restored. Example: `place fps view`, `place clock @ping`, `place ammo sbar`.

- **`reset`** (high) -- `reset <element>` -- restores the named HUD element to its default screen-center position. Internally issues `place <element> screen`, `move <element> 0 0`, and `align <element> center center` as a single unit. Requires exactly one argument. Example: `reset clock`, `reset fps`.

- **`order`** (high) -- `order <element> <option>` -- controls the draw-order (z-order) of the named HUD element relative to all others. Option can be an integer (absolute order value), or one of the keywords: `backward` (decrease by 1), `forward` (increase by 1), `front` (bring to top), `back` (send to bottom). Running `order <element>` with no option prints the element's current order value. Example: `order teaminfo front`, `order clock backward`, `order fps 5`.

- **`align`** (high) -- `align <element> <ax> <ay>` -- sets the horizontal and vertical alignment of the named HUD element within its placement area. Horizontal values (ax): `left`, `center`, `right`, `before` (outside left), `after` (outside right). Vertical values (ay): `top`, `center`, `bottom`, `before` (outside top), `after` (outside bottom), `console` (below the console). Running `align <element>` with no alignment args prints the current alignment. Example: `align clock right bottom`, `align fps center console`.

---

### teamplay.c (8 entries)

- **`tp_msgkillme`** (high) -- Sends a team message requesting a teammate to kill you at your current location. Reports the weapon you are holding (RL or LG) and remaining ammo, plus any extra rockets or cells you carry. Skipped entirely if you are already dead. If a teammate is in your point the message includes their name so the request is targeted.

- **`tp_msgslipped`** (high) -- Sends a team message reporting that an enemy slipped past you at your current location. Uses the TP_MSG_GENERIC macro: includes your current powerup status (if any) followed by "enemy slipped" and your location.

- **`tp_msgtfconced`** (high) -- TeamFortress-specific command that reports a concussion grenade event to your team. If an enemy is in your crosshair point, sends "$point conced at [location]"; otherwise sends the generic "Enemy conced" message. Appends the tp_name_filter string, which can be used in TF to tag the message for filter routing.

- **`tp_msgitemsoon`** (high) -- Sends a team message indicating that an item at your location will spawn soon. Uses the TP_MSG_GENERIC macro: includes your current powerup status (if any) followed by "item soon" and your current location.

- **`tp_msgwaiting`** (high) -- Sends a team message indicating you are waiting at your current location, typically used when holding a powerup spawn. Uses the TP_MSG_GENERIC macro: includes your current powerup status (if any) followed by "waiting" and your location.

- **`tp_msgnocancel`** (high) -- Sends a team message signalling a negative response or cancellation, displayed in red as "no/cancel". Uses the TP_MSG_GENERIC macro: includes your current powerup status (if any) followed by the red-colored "no/cancel" text and your location.

- **`tp_msgutake`** (high) -- Sends a team message offering an item at your location for a teammate to take. Reports "you take [item at location]", or if a teammate is in your point, uses the shorter "take [item at location]" form addressed to them. Uses TP_FindPoint() to detect a nearby teammate and adjust the message wording accordingly.

- **`tp_msgyesok`** (high) -- Sends a team message with a positive affirmative response of "yes/ok" at your current location. Uses the TP_MSG_GENERIC macro: includes your current powerup status (if any) followed by "yes/ok" and your location.

---

### fs.c (7 entries)

Note: fs_dir, fs_loadpak, fs_locate, and fs_removepak are family heads (their legacy aliases dir, loadpak, locate, removepak appear in the family_collapse section). The descriptions below are the same descriptions used as augmented head descriptions above.

- **`fs_loadpak`** (high) -- Attempts to load one or more .pak files into the virtual filesystem search path. Usage: `fs_loadpak <pakname> [<pakname> ...]`. Each pakname is tried first as a bare path, then under ezquake/, qw/, and id1/ with a .pak extension appended. Note: the add operation is currently stubbed out (VFS-FIXME in source) and will always report failure; only fs_removepak reliably changes the active pak set. Cannot be used while connected to a server.

- **`fs_removepak`** (high) -- Removes one or more .pak files from the virtual filesystem search path. Usage: `fs_removepak <pakname> [<pakname> ...]`. Each pakname is tried as a bare path and then under ezquake/, qw/, and id1/ with a .pak extension; the first successful match is removed and the file cache is flushed. Cannot be used while connected to a server.

- **`fs_path`** (high) -- Prints the current VFS search path to the console, showing all active directories and pak files in the order they are searched. Pure paths (server-enforced) are listed first, separated from regular paths by a dashed line. Takes no arguments.

- **`fs_restart`** (high) -- Reloads all pack files in the current search path, rebuilding the VFS from scratch. Usage: `fs_restart [flags]`. With no argument (or 0), reloads all pack types (pak, pk3, pk4, wad, paklst). An optional numeric flags argument selects a subset of pack types to reload (bitmask: 2=pak, 4=pk3, 8=pk4, 16=doomwad, 32=paklst). If connected to a server, the client disconnects and reconnects automatically. Prints the resulting search path after reload (equivalent to fs_path).

- **`fs_diff`** (high) -- Debug command: performs a byte-by-byte comparison of two files through the VFS. Usage: `fs_diff <file1> <file2>`. The first file is opened via the OS filesystem; the second is opened through the VFS and can reside inside a zip, gzip, pak, or pk3 archive. Reports whether the files match or identifies the byte offset of the first difference.

- **`fs_dir`** (high) -- Lists files in the VFS under a given directory, with optional filtering and display options. Usage: `fs_dir <directory> [file_suffix] [hidedir] [hideext] [hidesize]`. An optional file_suffix filters results to files with that extension. Display flags: hidedir removes the directory prefix from each filename; hideext strips the file extension; hidesize suppresses the file size column.

- **`fs_locate`** (high) -- Locates a file within the VFS search path and reports which search entry contains it. Usage: `fs_locate <filename>`. Prints the containing search path entry (directory or pak file). If the file is compressed inside an archive, prints "File is compressed inside" followed by the archive path. Prints "Not found" if the file does not exist in the search path.

---

### snd_main.c (5 entries)

- **`s_restart`** (high) -- Restarts the sound system. Shuts down the current audio session, reinitialises the audio driver, and reprecaches all sounds the server has already sent to the client. Use after changing audio settings (such as s_khz or s_desiredsamples) that require a full audio reset to take effect. The legacy alias snd_restart is equivalent.

- **`mutesound`** (high) -- Toggles audio mute on and off. When muting, saves the current s_volume value and sets it to 0; when unmuting, restores the saved volume and prints the restored level to console. State is preserved across repeated calls within the same session. Bound by default in the options menu under "Mute/Unmute".

- **`s_listdrivers`** (high) -- Lists the audio drivers compiled into the SDL2 library. Prints one driver name per line to the console. Useful for diagnosing which audio backends are available on the current system (e.g. pulseaudio, alsa, pipewire on Linux; wasapi, directsound on Windows).

- **`s_audiodevicelist`** (high) -- Lists all available audio playback and input devices as reported by SDL2. Prints two sections -- "Playback devices" and "Input devices" -- each with a numbered id and device name. Device id 0 in each section represents the system default. Use the playback id with s_audiodevice to select a specific output device without restarting.

- **`stopsound_script`** (high) -- Stops the sound currently playing on the local player's script channel (channel 0 of the SELF_SOUND_ENTITY). This is the channel used by the play and playvol commands when triggered from scripts or the console, so stopsound_script silences a script-initiated sound without affecting other in-game sounds. Contrast with stopsound, which stops all sounds simultaneously.

---

### teamplay_locfiles.c (5 entries)

- **`locations_loadfile`** (high) -- Loads a location file from the `locs/` directory into memory, replacing any currently loaded locations. Usage: `locations_loadfile <filename>` -- the `.loc` extension is added automatically if omitted. The file is parsed as lines of `<x> <y> <z> <name>`, where coordinates are stored as integer world-units divided by 8; names support `$loc_name_<item>` macro tokens that resolve against `loc_name_*` cvars. On success, prints the filename and number of points loaded; prints an error if the file cannot be found or is empty. Legacy alias: `loadloc`.

- **`locations_savefile`** (high) -- Saves the current in-memory location list to a file in the `locs/` directory. Usage: `locations_savefile <filename>` -- the `.loc` extension is added automatically if omitted. Each location is written as a line of `<x> <y> <z> <name>` using integer world-unit coordinates. The command does nothing and prints an error if no locations are currently loaded. Legacy alias: `saveloc`.

- **`locations_add`** (high) -- Adds a new named location at the player's current position to the in-memory location list. Usage: `locations_add <name>` -- the name is a single argument (quote multi-word names). When spectating and tracking a player, the tracked player's origin is used instead of the camera position. The new entry is appended to the list and can later be saved with `locations_savefile`. Requires an active connection; prints an error if called while disconnected. Legacy alias: `addloc`.

- **`locations_remove`** (high) -- Removes the location nearest to the player's current position from the in-memory location list. Usage: `locations_remove` -- takes no arguments. When spectating and tracking a player, the tracked player's position is used for the proximity search. The removed location's name and coordinates are printed to confirm which entry was deleted. Use `locations_savefile` afterward to persist the change to disk. Legacy alias: `removeloc`.

- **`locations_clearall`** (high) -- Removes all locations from the in-memory location list and frees associated memory. Usage: `locations_clearall` -- takes no arguments. Prints the number of locations that were cleared. This does not delete any `.loc` file on disk; it only affects the runtime location database. Legacy alias: `clearlocs`.

---

### ignore.c (4 entries)

- **`ignore_voip`** (high) -- Adds a player to the VoIP-only ignore list, silencing their voice chat without affecting text messages. Accepts a player name or user ID (`ignore_voip <name|userid>`); with no argument, displays the current ignore lists. This is distinct from the text ignore command: a VoIP-ignored player can still send and receive text, but their voice transmission is suppressed via S_Voip_Ignore. The ignore state is in-memory and does not persist across sessions. Available only when the client is built with FTE_PEXT2_VOICECHAT support.

- **`unignore_voip`** (high) -- Removes a player from the VoIP-only ignore list, restoring their voice chat. Accepts a player name or user ID (`unignore_voip <name|userid>`); with no argument, displays the current ignore lists. If the player was also on the text ignore list, text chat remains suppressed -- this command clears only the vignored flag. Available only when the client is built with FTE_PEXT2_VOICECHAT support.

- **`unignoreall`** (high) -- Clears the entire player text ignore list in one step. Takes no arguments. Note that VoIP-only ignores (set with ignore_voip) are stored separately and are not cleared by this command; use unignore_voip per player to remove those. The clear is in-memory only and does not persist across sessions.

- **`unignoreall_team`** (high) -- Clears the entire team ignore list in one step, removing all team-level ignores added with ignore_team. Takes no arguments. Individual player ignores (set with ignore or ignore_voip) are stored separately and are unaffected. The clear is in-memory only and does not persist across sessions.

---

### central.c (3 entries)

- **`sv_web_get`** (medium) -- Developer diagnostic command (SERVER_ONLY build) that sends a form-encoded HTTP request to the central.qw.nu authentication server. Takes a URL path, a request-id string, and optional key-value pairs: `sv_web_get <path> <request-id> [<key> <value> ...]`. The server base URL is taken from `sv_www_address`; an `authKey` field from `sv_www_authkey` is automatically appended to every request. Despite the name, the underlying curl layer sends a POST (not a GET) whenever form fields are present; `sv_web_get` and `sv_web_post` share the same `Web_SendRequest` implementation and the `post` flag is unused. Responses are printed to the server console via `Con_DPrintf` and may trigger a broadcast or demo-upload if the central server returns those directives.

- **`sv_web_post`** (medium) -- Developer diagnostic command (SERVER_ONLY build) that sends a form-encoded HTTP POST request to the central.qw.nu authentication server. Takes a URL path, a request-id string, and optional key-value pairs: `sv_web_post <path> <request-id> [<key> <value> ...]`. The server base URL is taken from `sv_www_address`; `sv_www_authkey` is automatically included as the `authKey` form field. In practice this command is functionally identical to `sv_web_get` at the curl layer: both share the same `Web_SendRequest` implementation and the intended GET/POST distinction is not enforced in code. Intended for testing or manually triggering central-server API paths without a live match.

- **`sv_web_postfile`** (high) -- Developer diagnostic command (SERVER_ONLY build) that uploads a file to the central.qw.nu server via multipart HTTP POST. Syntax: `sv_web_postfile <path> <request-id> <file> [<key> <value> ...]`. The `<file>` argument can be a relative path under the game directory or the special token `*`, which resolves to the currently-recording MVD demo (fails with an error if no demo is active). Paths containing `.cfg` or lacking a slash are rejected as unsafe, and `FS_UnsafeFilename` is checked before the upload proceeds. The file is sent as the `file` form field; `sv_www_authkey` is added automatically. Unlike `sv_web_get`/`sv_web_post`, this command has a distinct implementation with its own file-open and safety-guard logic.

---

### cl_cmd.c (3 entries)

- **`showskins`** (high) -- Lists the name and active skin for every non-spectator player currently on the server. Output is a two-column table (name, skin) with the name column width adjusted to the longest player name in the session. Only prints while connected to a server that has active players; produces no output if no players are present.

- **`qstat`** (high) -- Queries a QuakeWorld server for its current status without connecting to it. Usage: `qstat <server_address>`. Sends a raw UDP status packet and prints a summary including hostname, map, game settings (deathmatch, teamplay, timelimit, fraglimit), password requirements, player count, and a ping/frags/name table for each player. The server address can include a port; if omitted, the default QW server port is used.

- **`z_ext_list`** (high) -- Displays the ZQuake protocol extensions that are currently active on the connection to the server. Prints each active extension by name (e.g. PM_TYPE, VWEP, VIEWHEIGHT); prints NONE if no extensions are negotiated. The extension set is agreed during connection handshake and affects physics simulation, view height sync, weapon model visibility, and other protocol-level features. Useful for diagnosing unexpected movement or rendering behaviour by confirming which extensions the server supports.

---

### cmd.c (3 entries)

- **`alias_out`** (high) -- Removes the value of a cvar from the body of an alias. Syntax: `alias_out <alias> <cvar> [options]`. The options argument is a bitmask: bit 0 (value 1) performs a check-only pass without deleting the match; bit 1 (value 2) suppresses the "not found" error message when the cvar's value is absent from the alias. If the cvar's string is found inside the alias body it is excised in-place; otherwise an error is printed unless option bit 1 is set. Example: `alias_out myalias cl_weaponpreference` removes the current value of cl_weaponpreference from the myalias alias body, useful for dynamically collapsing toggle aliases.

- **`cvar_in`** (high) -- Inserts the value of one cvar into the string of another. Syntax: `cvar_in <cvar1> <cvar2> [options]`. The options bitmask mirrors alias_in: bit 0 (1) appends to the right instead of prepending to the left; bit 1 (2) skips insertion if cvar2's value already appears in cvar1; bit 2 (4) prints an error if the value is already present; bit 3 (8) creates cvar1 if it does not yet exist. cvar1 is modified in-place via Cvar_Set.

- **`cvar_out`** (high) -- Removes the value of one cvar from the string of another. Syntax: `cvar_out <cvar1> <cvar2> [options]`. Searches cvar1's string for cvar2's value and excises it if found, then writes the result back to cvar1 via Cvar_Set. Options bitmask: bit 0 (1) performs a check-only pass without modifying cvar1; bit 1 (2) suppresses the "not found" error when cvar2's value is absent from cvar1.

---

### cvar.c (3 entries)

- **`set_eval`** (high) -- Sets a variable to the result of a richer expression than set_calc supports, using a dedicated expression evaluator (Expr_Eval). Syntax: `set_eval <cvar> <expression>`. The expression may produce an integer, float, boolean, or string result, which is written to the cvar accordingly. Blocked by the active ruleset during live matches (restrictSetEval flag); works freely in demos, spectator mode, and outside matches. Use set_calc for simple arithmetic or string operations; use set_eval when you need compound or multi-operator expressions that set_calc cannot handle.

- **`set_tp`** (high) -- Sets a cvar only when it carries the teamplay flag, preventing accidental writes to non-teamplay variables. Syntax: `set_tp <cvar> <value>`. If the named cvar does not exist yet it is created and tagged as a teamplay variable. If it exists but lacks the teamplay flag the command prints an error and does nothing. Useful in team-play scripts to ensure a value is only written to the intended teamplay slot.

- **`cvaredit`** (high) -- Loads a cvar's current value into the console input line for interactive editing. Syntax: `cvaredit <cvar>`. After calling this command the console input buffer is pre-filled with `/<cvarname> <currentvalue>` so you can adjust the value and press Enter to apply it, without retyping the name or the full current string. If the cvar does not exist an error is printed and nothing happens.

---

### mvd_utils.c (3 entries)

- **`mvd_name_item`** (high) -- Creates or updates a persistent respawn-clock entry for a map item during MVD demo playback. Takes coordinates and item type to locate the nearest matching entity, then assigns a display label used in the on-screen item clock overlay. Usage: `mvd_name_item <x> <y> <z> <type> <label>`, where type is one of: axe, sg, ssg, ng, sng, gl, rl, lg, rg, qd, pt, ga, ya, ra, mh. If an entry for that entity already exists its label and sort order are updated; otherwise a new persistent clock is created. Run mvd_list_items to see the mvd_name_item commands for all currently tracked items.

- **`mvd_list_items`** (high) -- Lists all persistent item-clock entries currently tracked during MVD demo playback, printed to the console as a series of ready-to-reuse mvd_name_item commands. Each line includes the item's world coordinates, type, label, and entity number as a comment. Useful for saving and restoring a named-item layout across demo sessions -- copy the output into a config or alias and replay it on the same map.

- **`mvd_remove_item`** (high) -- Hides or suppresses the persistent respawn-clock entry for a specific item at a given map position during MVD demo playback. Usage: `mvd_remove_item <x> <y> <z> <type>`. Locates the entity of the specified type nearest to the coordinates and marks its clock as hidden so it no longer appears in the item overlay. If no persistent clock exists for that entity yet, a hidden placeholder is created to prevent the item from re-appearing when the demo restarts.

---

### zone.c (3 entries)

- **`cache_print`** (high) -- Lists all currently allocated entries in the hunk cache, one per line. Each line shows the allocation's size in kilobytes followed by its name (e.g., "12.5 kB : skin/player"). Takes no arguments. Use to inspect what content is resident in the cache between map loads.

- **`cache_report`** (high) -- Prints a one-line summary of hunk cache memory availability. Reports free megabytes and total hunk size (e.g., "12.3 of 32.0 megabyte data cache free"). Takes no arguments. Useful for a quick check of remaining cache headroom without the full per-entry listing that cache_print provides.

- **`hunk_print`** (high) -- Dumps the hunk memory allocator's block layout to the console. With no arguments, prints one totals line per named block group showing cumulative KB and name; with any argument (e.g., "hunk_print all"), prints every individual block with its address, size, and name. Also reports total block count and the split between low and high hunk usage. Use for low-level memory debugging when diagnosing hunk exhaustion.

---

### EX_browser.c (2 entries)

- **`sb_proxygetpings`** (high) -- Queries a QW proxy server at the given IP address and prints the ping list it reports for all servers it knows about. Usage: `sb_proxygetpings <ip>`. Useful for diagnosing proxy-assisted ping measurements in the server browser. Output is written to the console and terminates with "End of list."

- **`sb_buildpingtree`** (high) -- Builds the ping tree used by the server browser to determine optimal routes to game servers via QW proxies. Runs a two-phase background process: Phase 1 initialises the tree and reads data from the server browser immediately; Phase 2 queries proxies for their ping data and runs Dijkstra's algorithm to compute shortest paths. Prints progress messages to the console and ignores the command if a build is already in progress.

---

### help.c (2 entries)

- **`dev_help_verify_config`** (high) -- Developer tool that cross-checks live cvar values against their type declarations in help_variables.json. For each cvar marked "boolean" it flags any value that is not 0 or 1; for each cvar marked "enum" it flags any value not present in the documented examples list. Output is printed to the console with the offending cvar name highlighted and a final count of mismatches. Cvars that exist in the JSON but are no longer registered at runtime are silently skipped (treated as intentionally obsolete documentation). Only available when ezQuake is launched in developer mode.

- **`dev_help_issues`** (high) -- Developer tool that audits all registered cvars, commands, macros, and command-line parameters against the four help JSON files and reports anything missing or malformed. Running without arguments prints a console report of each undocumented or invalid entry. Running with the "generate" subcommand (`dev_help_issues generate`) instead inserts a stub placeholder -- marked "system-generated": true -- for every missing entry and then writes all four JSON files back to disk under qw/; this is the mechanism that seeded the system-generated placeholder entries visible throughout the help JSON corpus. Only available when ezQuake is launched in developer mode.

---

### pr2_exec.c (2 entries)

- **`mod`** (high) -- Server-side command that forwards the current console command to the running PR2 game VM. When a PR2 mod (native .so/.dll or .qvm bytecode) is loaded, typing an unrecognized command at the server console causes `mod` to dispatch a GAME_CONSOLE_COMMAND call into the VM, allowing the mod to handle it via its own ConsoleCommand export. If no PR2 VM is active the command is a no-op. Arguments are retrieved by the mod itself using trap_argc()/trap_argv() inside the VM.

- **`vminfo`** (high) -- Prints diagnostic information about all registered PR2 virtual machines to the server console. For each VM slot with a loaded module it reports the module name and execution type (native, compiled-on-load, or interpreted), followed by the code segment length, instruction table length, and data segment size in bytes. Useful for confirming which game VM is active and whether it was JIT-compiled or run in bytecode mode.

---

### vid_sdl2.c (2 entries)

- **`vid_displaylist`** (high) -- Lists all SDL2 display outputs available to the system, printing each one as an index and display name (e.g. "0: Generic PnP Monitor"). Useful when configuring multi-monitor setups to identify the correct display index for vid_displayindex or similar cvars.

- **`vid_reload`** (high) -- Performs a soft video reload without a full renderer restart. Reloads the palette and colormap, re-runs video startup, and clears any pending reload flag. Lighter-weight than vid_restart, which tears down and fully reinitialises the renderer. Required for LATCH_GFX cvars that do not need window recreation to take effect.

---

### EX_browser_qtvlist.c (1 entry)

- **`observeqtv`** (high) -- Connects to a QTV stream for the specified server IP, or for the currently viewed server if no argument is given. Usage: `observeqtv [ip]`. Looks up the server address in the cached QTV list and issues a "qtvplay <link>" command when a matching entry is found. Requires the QTV list cache to be ready (run qtv_update first if not); prints an error if the cache is still being rebuilt, if no matching QTV entry is found, or if the resolved address is not an IP address.

---

### EX_qtvlist.c (1 entry)

- **`qtv_update`** (high) -- Refreshes the internal QTV server list by spawning a background updater thread. The updated list is used by observeqtv and related commands to resolve the current server's QTV stream link. Prints an error if the required mutex is not initialised or if the thread cannot be created. Also registered as "find_update" (identical handler).

---

### cl_cam.c (1 entry)

- **`track`** (high) -- Locks the spectator camera onto a specific player. Accepts a player name or user ID as its sole argument (usage: `track <userid> | <name>`). Only available while connected as a spectator. If multiview is active, targets the main view slot; the camera state is set to tracking mode and spec_locked is enabled, preventing free-fly until manually released.

---

### config_manager.c (1 entry)

- **`dev_dump_defaults`** (high) -- Writes the default values of all registered cvars to `ezquake/configs/cvar_defaults.cfg` in the base game directory. Cvars are written grouped by their cvar group, with ungrouped cvars appended at the end. Prints the output file path on success or an error message if the file cannot be opened or closed. Intended as a developer diagnostic tool.

---

### console.c (1 entry)

- **`messagemodeirc`** (high) -- Opens the console message input bar directed at the built-in IRC client. Text typed and submitted will be sent to the currently active IRC channel rather than to the game server. Only available when the client is connected to a server (ca_active state) and compiled with IRC support (WITH_IRC).

---

### fchecks.c (1 entry)

- **`f_ruleset`** (high) -- Provides ruleset fairness-check functionality. Usage: `f_ruleset [check]`. Without arguments, prints a help summary explaining the command's purpose and the meaning of the flag characters returned in replies (m = modified models/sounds, s = movement scripts, f = forced enemy skin, i = strafescript; + = enabled, - = disabled). With the "check" argument, broadcasts a "f_ruleset" say message to the server, prompting all clients to reply with their ruleset name and active feature flags. Spectators and clients who responded within the last 20 seconds are silently skipped when processing incoming replies.

---

### host.c (1 entry)

- **`floodprotmsg`** (high) -- Sets the message sent to a player who triggers flood protection on the server. Without arguments, displays the current flood protection message. With one quoted argument, sets the message to that string. Usage: `floodprotmsg "<message>"`. Server-side only. Companion to `floodprot`, which sets the trigger thresholds (messages / time window / silence duration). The message set here is what the silenced player sees when flood protection fires.

---

### in_sdl2.c (1 entry)

- **`in_restart`** (high) -- Restarts the input subsystem (mouse and keyboard handling). Shuts down the current SDL2 input state, reinitialises it, and reactivates the mouse if it was active before the restart. Useful after changing input-related settings that require a subsystem reinitialisation to take effect.

---

### irc.c (1 entry)

- **`irc`** (high) -- Provides access to the built-in IRC client. Usage: `irc <subcommand> [args]`. Supported subcommands: `connect` (connects using irc_user_nick / irc_server_address / irc_server_port / irc_server_password cvars, defaulting the nick to the player name), `disconnect`, `say <message>` (sends to current channel), `query <nick> <message>` (opens a private query and sends a message), `nick <newnick>` (changes nickname), `join <channel> [key]` / `part <channel>` (join or leave a channel), and `window next` / `prev` / `close` (navigates channel windows). Any unrecognised subcommand is sent as a raw IRC protocol string.

---

### menu.c (1 entry)

- **`toggleproxymenu`** (high) -- Toggles the proxy configuration menu open or closed. When the proxy menu is already active, closes it and returns to the previous key destination; when the menu is not open, enters the proxy menu screen. Typically bound to a key for quick access to proxy settings without navigating the full menu tree.

---

### qtv.c (1 entry)

- **`qtvusers`** (high) -- Lists all viewers currently watching the QTV stream you are connected to. Prints a table of numeric user IDs and display names, one per line, with a total count at the end. Only works during an active QTV playback session; if you are connected to a server but not watching QTV, the request is forwarded to the server instead.

---

### sys_sdl2.c (1 entry)

- **`batteryinfo`** (high) -- Reports the current battery status of the system via SDL's power info API. Prints one of: remaining charge percentage and estimated time (when on battery), charging progress, fully charged confirmation, or "No battery available" for desktop machines. Prints an error message if SDL cannot retrieve power state.

---

## No-doc classifications

None in this pass.

---

## Kick-to-ciscon (33 entries)

### L1 extractor misclassifications -- Cmd_AddLegacyCommand shims to cvars (26 entries from host.c + 2 others)

All 26 host.c entries are registered in the block at `host.c:559-595` via `Cmd_AddLegacyCommand(old_name, new_name)`. These are deprecated rename redirects, not real commands. The L1 extractor does not distinguish Cmd_AddLegacyCommand from Cmd_AddCommand, so it imported them as command entities. None of these should appear in the entity DB as commands -- they are deprecated aliases for renamed cvars/commands.

**host.c block (host.c:559-595):**

| Old name (in queue) | Canonical target |
|---|---|
| `nosound` | `s_nosound` |
| `precache` | `s_precache` |
| `loadas8bit` | `s_loadas8bit` |
| `ambient_level` | `s_ambientlevel` |
| `ambient_fade` | `s_ambientfade` |
| `snd_show` | `s_show` |
| `cl_chatsound` | `s_chat_custom` |
| `scr_weaponstats_order` | `hud_weaponstats_format` |
| `scr_weaponstats_frame_color` | `hud_weaponstats_frame_color` |
| `scr_weaponstats_scale` | `hud_weaponstats_scale` |
| `scr_weaponstats_y` | `hud_weaponstats_y` |
| `scr_weaponstats_x` | `hud_weaponstats_x` |
| `gl_smoothfont` | `r_smoothtext` |
| `gl_lighting_colour` | `gl_lighting_color` (typo correction alias) |
| `cl_truelightning` | `cl_fakeshaft` |
| `demotimescale` | `cl_demospeed` |
| `contrast` | `gl_contrast` (via v_contrast.name) |
| `gl_gammacorrection` | `vid_gammacorrection` |
| `con_sound_mm1_file` | `s_mm1_file` |
| `con_sound_mm2_file` | `s_mm2_file` |
| `con_sound_spec_file` | `s_spec_file` |
| `con_sound_other_file` | `s_otherchat_file` |
| `con_sound_mm1_volume` | `s_mm1_volume` |
| `con_sound_mm2_volume` | `s_mm2_volume` |
| `con_sound_spec_volume` | `s_spec_volume` |
| `con_sound_other_volume` | `s_otherchat_volume` |

**Question for ciscon:** Should the L1 extractor be taught to filter Cmd_AddLegacyCommand registrations out of the command entity table, or should legacy shims be retained as entities with a `is_legacy_alias: true` flag pointing at the canonical target?

**Additional shims in other files (2 entries):**

- **`scr_printspeed`** (hud_centerprint.c:57) -- `Cmd_AddLegacyCommand("scr_printspeed", "scr_centerspeed")`. Redirects the old name to the cvar `scr_centerspeed`. Same pattern as host.c block. Question for ciscon: should `scr_printspeed` be removed from the entity DB, or carry a redirect note pointing users to `scr_centerspeed`?

- **`vid_framebuffer_palette`** (vid_sdl2.c:1876) -- `Cmd_AddLegacyCommand("vid_framebuffer_palette", vid_software_palette.name)`. Redirects to cvar `vid_software_palette` (CVAR_NO_RESET | CVAR_LATCH_GFX; default 0 on macOS, 1 elsewhere). Question for ciscon: is `vid_software_palette` already documented as a cvar? Should `vid_framebuffer_palette` appear there as a legacy alias, or is this entry simply out of scope for the command audit?

---

### Dead / removed commands (3 entries from null_source)

These had system-generated placeholder entries in `help_commands.json` but no source registration exists at current HEAD. Three were removed by PR #1120 (commit c9dec3d9, "help-JSON: clean up 156 drift entries"); one is a ghost of the deleted mp3 subsystem; one is a name transposition.

- **`dev_cache_print`** -- No source registration. The real command is `cache_print` (zone.c:584). System-generated placeholder removed by PR #1120 as a drift entry. Question for ciscon: was `dev_cache_print` ever intentionally registered as a dev-mode alias, or is the removal correct?

- **`dev_cache_report`** -- No source registration. The real command is `cache_report` (zone.c:585). Removed by PR #1120. Same question applies.

- **`dev_hunk_print`** -- No source registration. The real command is `hunk_print` (zone.c:696). Removed by PR #1120. Same question applies.

- **`mp3_volume`** -- Was a real command (`Cmd_AddCommand("mp3_volume", Media_SetVolume_f)` in mp3_player.c). The entire mp3 player subsystem was removed in commit ae8b552f ("MP3 PLAYER: Remove functionality"). A `MACRO_DEF(mp3_volume)` slot in macro_ids.h survives but has no handler. Question for ciscon: should both the help_commands.json placeholder and the macro_ids.h slot be removed, or is there a plan to re-implement media volume control under a different name?

- **`loadfont`** -- No source registration. The actual font-loading command is `fontload` (fonts.c:497). `loadfont` appears to have been a name transposition in a system-generated placeholder, removed by PR #1120. Question for ciscon: was `loadfont` ever an alias for `fontload`, or was the placeholder name wrong from the start and the removal correct?

---

## Structural findings

**The host.c Cmd_AddLegacyCommand pattern is the dominant structural finding of this pass.** 26 of 33 kick_to_ciscon entries originate from a single registration block in host.c (lines 559-595) where Cmd_AddLegacyCommand is used in bulk to provide backwards-compatibility aliases for renamed cvars and commands. The L1 extractor does not distinguish Cmd_AddLegacyCommand from Cmd_AddCommand at classification time, so all 26 were imported into the entity DB as type=command. These are not commands -- they are passive redirect shims with no handler function pointer. The fix belongs in the L1 extractor (filter Cmd_AddLegacyCommand from the command entity table, or classify them separately as `is_legacy_alias`).

**The null_source batch** confirms five entries with no live source registration: three are PR #1120 drift removals where the dev_help_issues generate script had created stubs for commands that never existed (dev_cache_print, dev_cache_report, dev_hunk_print); one is a deleted subsystem ghost (mp3_volume from the removed mp3_player.c); one is a transposed name (loadfont vs fontload). These five support the case for periodic L1 DB freshness checks against live source HEAD.

**The floodprotmsg entry** is the only genuine real-server-side command in the host.c batch: registered via Cmd_AddCommand (not Cmd_AddLegacyCommand) at host.c:534, handler in sv_ccmds.c:1638.

**Family anomalies logged:**
- track2, track3, track4: member rows had non-null proposed_descs (slot-specific variants). Aggregator rule requires members to carry null; descriptions were written per-row for reference but the head entry covers the family.
- stopqwd: member row had non-null proposed_desc (routing distinction explanation). Head `stop` is already documented; the member description is load-bearing context for augmenting the stop entry.
- serverexec: member row had non-null proposed_desc (cbuf routing explanation). Head `exec` is already documented; the member description is load-bearing context for augmenting the exec entry.

---

## Calibration carry-forwards

The command pass added the following rubric knowledge not present after the cvar pass:

1. **Cmd_AddLegacyCommand = shim, not command.** The extractor needs a filter or a separate entity class. 26 false-positive commands in a single pass is a systemic signal.
2. **+/- command pairs are cleanly handled by family_collapse** with one head description covering both directions. Confirmed across fire, fire_ar, voip, zoom, cl_wp_stats, qtv_delay.
3. **fs.c legacy alias pattern** (fs_loadpak/loadpak, etc.) is the right shape for Cmd_AddLegacyCommand when the head IS a real command and the legacy name IS worth documenting. Distinguishing this from the host.c shims: in fs.c, the head is a real command with a handler; the legacy name is a convenience alias for the same handler. Both should be in the docs (as head + alias cross-reference). In host.c, neither side has a handler -- the target is a cvar, not a command.
4. **Developer-mode gating** (IsDeveloperMode(), WITH_RENDERING_TRACE, SERVER_ONLY) is common enough that descriptions should note it explicitly. The cvar pass did not surface this pattern as prominently.
5. **Dead-placeholder detection** (null_source batch) is a useful validation pass. Running it against the macro and cmdline_params queues may surface additional ghosts.

---

## Carry-forwards

- Macros (38) and cmdline_params (56) queues at `/tmp/macro-queue.json` and `/tmp/cmdline-queue.json` -- ready to fire.
- Operator-gated channels NOT yet produced: PR-ready diff against `help_commands.json`, classifications-yaml appends, GitHub issue bodies.
- L1 extractor fix: filter or re-classify `Cmd_AddLegacyCommand` registrations to prevent future bulk false-positive imports of legacy shim blocks.
