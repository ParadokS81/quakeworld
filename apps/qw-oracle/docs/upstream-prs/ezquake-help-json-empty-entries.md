# ezQuake help-JSON empty-entries audit -- cvar pass (2026-05-14)

Output of the parking-doc audit at `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`. Catalyst: mushi asking what `sb_ignore_proxy` does in the helper channel. Scope: client-side ezQuake cvars (sv_*-source-file filter applied) that exist in current source HEAD AND have no human-written prose in `help_variables.json`.

## Counts

| Verdict | Count | Notes |
|---|---|---|
| `needs_doc` | 87 | 82 high / 4 medium / 1 low confidence; all drafted |
| `no_doc` | 16 | classifications below |
| `family_collapse` | 30 rows / 6 unique families | augmented head descriptions below |
| `kick_to_ciscon` | 7 | ciscon-question text below |
| **Total** | **140** | matches queue size |

Baseline parking-doc estimate was 128 cvars; current head yields 140 (+9%, within tolerance). Increase is from new cvars added since the parking-doc estimate was captured.

**Operator review pass (2026-05-14):** post-/goal review revised the original 82/16/36/6 distribution. Three corrections applied:
- `cl_mvinset` reclassified from family_collapse to 6 individual `needs_doc` rows. Members (`offset_x`, `offset_y`, `size_x`, `size_y`, `top`, `right`) differ by axis/dimension/role, failing the family functional-equivalence test. Existing `cl_mvinset` description in help_variables.json ("Turns inset screen with multitrack on/off.") stays untouched.
- `cl_weaponforgetondeath` moved from low-confidence `needs_doc` to `kick_to_ciscon`. Cvar registration not located in src/; needs ciscon confirmation of whether it exists at all before drafting.
- `vid_depthbits` / `vid_stencilbits` no_doc classification renamed from `server_mirror_or_obsolete` to plain `obsolete` (they are obsolete client video cvars, not server mirrors).

Parking doc updated with tightened family_collapse rubric and aggregator row-selection rules to prevent recurrence on remaining queues.

## Family collapse (7 families covering 36 entries)

### `re_trigger_match_0` (covers 8 siblings)

**Members:** `re_trigger_match_2`, `re_trigger_match_3`, `re_trigger_match_4`, `re_trigger_match_5`, `re_trigger_match_6`, `re_trigger_match_7`, `re_trigger_match_8`, `re_trigger_match_9`

**Head unchanged:** `re_trigger_match_0` is already documented upstream as *"Whole matched pattern of the regular expression match."* No change to the head desc in this PR (the earlier-drafted augmented head was inaccurate -- `_0` is the whole match, not a capture group).

**Sibling descriptions (paste into each in help_variables.json):**

- `re_trigger_match_2`: "Capture group 2 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_3`: "Capture group 3 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_4`: "Capture group 4 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_5`: "Capture group 5 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_6`: "Capture group 6 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_7`: "Capture group 7 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_8`: "Capture group 8 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."
- `re_trigger_match_9`: "Capture group 9 from the most recent re_trigger or re_trigger_match. Empty if no such group existed. See re_trigger_match_0."

**Reasoning:** CVAR_ROM; set via Re_Trigger_Copy_Subpatterns() from the pcre2 ovector after each match. Siblings _0 and _1 are already documented ("Whole matched pattern" / "First matched subpattern"). Entries 2..9 differ only by capture-group index; no behavioral distinction. Sibling pointer descriptions match the locked template from `2026-05-26-handoff-helpjson-cvar-pr-execute.md`.

### `internal0` (covers 10 siblings) -- OUT OF SCOPE

**Status:** Removed from PR scope 2026-05-26. `internal0..internal9` source-side `cvar_t` structs exist at `tp_triggers.c:43-52` but are NEVER `Cvar_Register`-ed (intentional per `cvar.c:135` comment: "variables for internal triggers are not registered intentionally"). They are not in `help_variables.json` and have no console surface. Engine-private scratch slots. No PR action.

### `hud_score_team_digits` (covers 3 siblings)

**Members:** `hud_score_team_align`, `hud_score_team_colorize`, `hud_score_team_digits`

**Augmented head description (paste into `hud_score_team_digits` in help_variables.json):**

> Controls the score_team HUD element: minimum character width (digits, 0=auto),
> text alignment (align: left/center/right), and colorization (colorize: 0=off,
> 1=red when negative, 2=always red) for the own-team score display.

**Sibling descriptions (paste into each in help_variables.json):**

- `hud_score_team_align`: "Horizontal alignment of the own-team score readout ('left' | 'center' | 'right'). See hud_score_team_digits."
- `hud_score_team_colorize`: "Colorization mode for the own-team score readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_team_digits."

**Reasoning:** Head of a three-member family sharing the same draw path (SCR_HUD_DrawNum via SCR_HUD_DrawScoresTeam). Siblings differ only by _align/_colorize/_digits suffix. Colorize semantics verified against SCR_HUD_DrawScoresTeam: low=true when teamFrags<0 || colorize->integer>1.

### `hud_score_enemy_digits` (covers 3 siblings)

**Members:** `hud_score_enemy_align`, `hud_score_enemy_colorize`, `hud_score_enemy_digits`

**Augmented head description (paste into `hud_score_enemy_digits` in help_variables.json):**

> Controls the score_enemy HUD element: minimum character width (digits, 0=auto),
> text alignment (align: left/center/right), and colorization (colorize: 0=off,
> 1=red when negative, 2=always red) for the top enemy score. In non-teamplay,
> shows the highest-scoring opponent; in teamplay, shows the enemy team total.

**Sibling descriptions (paste into each in help_variables.json):**

- `hud_score_enemy_align`: "Horizontal alignment of the enemy score readout ('left' | 'center' | 'right'). See hud_score_enemy_digits."
- `hud_score_enemy_colorize`: "Colorization mode for the enemy score readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_enemy_digits."

**Reasoning:** Head of a three-member family sharing SCR_HUD_DrawScoresEnemy. The non-teamplay vs teamplay branch is verified in the draw function source (lines 444-458).

### `hud_score_difference_digits` (covers 3 siblings)

**Members:** `hud_score_difference_align`, `hud_score_difference_colorize`, `hud_score_difference_digits`

**Augmented head description (paste into `hud_score_difference_digits` in help_variables.json):**

> Controls the score_difference HUD element: minimum character width (digits, 0=auto),
> text alignment (align: left/center/right), and colorization (colorize: 0=off,
> 1=red when losing/negative, 2=always red) for the team-minus-enemy score delta.
> Default colorize=1 so the number turns red automatically when behind.

**Sibling descriptions (paste into each in help_variables.json):**

- `hud_score_difference_align`: "Horizontal alignment of the score-difference readout ('left' | 'center' | 'right'). See hud_score_difference_digits."
- `hud_score_difference_colorize`: "Colorization mode for the score-difference readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_difference_digits."

**Reasoning:** Head of score_difference family. Draw path SCR_HUD_DrawScoresDifference passes teamFrags-enemyFrags; low=true when delta<0 || colorize>1. Default colorize=1 confirmed in HUD_Register call (line 820). Meaningful to call out the default since it differs from score_team/score_enemy (which default to 0).

### `hud_score_position_digits` (covers 3 siblings)

**Members:** `hud_score_position_align`, `hud_score_position_colorize`, `hud_score_position_digits`

**Augmented head description (paste into `hud_score_position_digits` in help_variables.json):**

> Controls the score_position HUD element: minimum character width (digits, 0=auto),
> text alignment (align: left/center/right), and colorization (colorize: 0=off,
> 1=red when not in 1st place, 2=always red) for the current scoreboard rank.
> Counts teams in teamplay, players in FFA. Default colorize=1.

**Sibling descriptions (paste into each in help_variables.json):**

- `hud_score_position_align`: "Horizontal alignment of the position-rank readout ('left' | 'center' | 'right'). See hud_score_position_digits."
- `hud_score_position_colorize`: "Colorization mode for the position-rank readout (0 = off, 1 = red when negative, 2 = always red). See hud_score_position_digits."

**Reasoning:** Head of score_position family. SCR_HUD_DrawScoresPosition verified: position increments once per team/player ahead; low=true when position!=1 || colorize>1. Teamplay vs FFA branch is explicit in source (lines 515-528). Default colorize=1 confirmed in HUD_Register (line 832).

## Kick to ciscon (7 questions for upstream)

### `show_velocity_3d_offset_forward` (`cl_screen.c`)

show_velocity_3d_offset_forward and show_velocity_3d_offset_down are
registered but have zero read sites in the entire source tree. Are they
intentional placeholders for an in-progress or feature-flagged
implementation, or are they orphaned stubs that should be removed?

### `show_velocity_3d_offset_down` (`cl_screen.c`)

Same as show_velocity_3d_offset_forward -- both offset cvars have no read
sites. Are they planned, in-progress, or dead?

### `hud_teamstackbar_simpleitems` (`hud_common.c`)

hud_teamstackbar_simpleitems is registered in HUD_Register for the teamstackbar
element (hud_common.c line 1008) but SCR_Hud_StackBar never calls HUD_FindVar for
it and never passes it to TeamHold_DrawPercentageBar. The same "simpleitems"
parameter IS used in hud_radar.c. Is hud_teamstackbar_simpleitems a dead/vestigial
parameter (copy-paste from radar), or was it intentionally reserved for future use,
or does it somehow influence behavior through a code path I missed?

### `sv_progtype` (`pr2_exec.c`)

sv_progtype selects the progs VM type: 0=pr1 (.dat), 1=native (.so/.dll), 2=q3vm
(.qvm), 3=q3vm+JIT. This lives in ezQuake's server code (pr2_exec.c, guarded by
USE_PR2) but appears to belong to the QW262/mvdsv progs2 extension rather than the
ezQuake client. Is sv_progtype exposed to operators running ezQuake as a standalone
listen server, or is it effectively dead code in ezQuake and the canonical cvar
belongs to mvdsv? Should this entry be flagged as mvdsv-only or is there a valid
ezQuake listen-server use case?

### `sv_pr2references` (`pr2_exec.c`)

sv_pr2references enables pr2 string_t fields as byte offsets (required for native
progs with mod API version >= 15 in 64-bit mode). Like sv_progtype this lives in
pr2_exec.c under USE_PR2. Same question: is this a live ezQuake listen-server cvar
or effectively mvdsv-only? The source comment says "0 = standard, 1 = pr2 mods set
string_t fields as byte offsets" -- is that description accurate enough to doc, or
does ciscon need to confirm whether ezQuake exposes this at all in shipped binaries?

### `gl_outline_scale_world` (`r_rmain.c`)

gl_outline_scale_world is declared but its Cvar_Register call is commented
out and no code reads it -- is this intentionally parked for future world
outline thickness control (analogous to gl_outline_scale_model), or was it
superseded by gl_outline_world_depth_threshold / gl_outline_world_normal_threshold?
Should it be excluded from the knowledge base entirely?

### `cl_weaponforgetondeath` (no source file — appears only in help_variables.json)

cl_weaponforgetondeath has no Cvar_Register call anywhere in src/. The
help_variables.json entry is system-generated (group-id 0). The underlying
mechanic exists in com_msg.c:785 (clc_mvd_weapon_reset_on_death flag, encoded
into weapon-switch packets sent to MVDSV) and the flag name matches. Is
cl_weaponforgetondeath actually exposed as a user-facing cvar in some build
configuration not present in the searched tree, or is this an orphan
help_variables.json stub that should be removed entirely? If it is real,
where is the Cvar_Register call?

## needs_doc medium / low confidence (5 entries -- operator review before ciscon)

### [medium] `localid` (`cl_main.c`)

**Proposed:** Secret token used to authenticate remote-control command packets sent from a local server browser or front-end; once set, command packets without a matching token are rejected.

**Reasoning:** Read at cl_main.c:1588-1606 in the A2C_CLIENT_COMMAND handler. When allowremotecmd is false (set at connect), inbound local-loopback command packets must present a matching localid string or they are rejected with a console warning and localid is cleared. This is a legacy GUI-front-end authentication mechanism, not a visible user preference. The empty default is meaningful (no localid = only pre-connect commands allowed). Confidence medium because the broader browser-protocol context is not fully clear from source alone.

### [medium] `hud_iammo_show_always` (`hud_ammo.c`)

**Proposed:** Registered as a parameter of the iammo element but not read by its draw function (SCR_HUD_DrawAmmoIconCurrent reads only scale and style); the icon already hides itself when num==0 via HUD_PrepareDraw returning false.

**Reasoning:** SCR_HUD_DrawAmmoIconCurrent (line 350) initializes only scale and style (line 353-358); show_always is registered (line 506) but never retrieved via HUD_FindVar inside that function. The ammo (numeric) element does use show_always; the iammo (icon) element does not. Medium confidence -- there may be a secondary path via the HUD framework itself, but no code path in SCR_HUD_DrawAmmoIconCurrent consumes the value.

### [medium] `scr_scoreboard_login_flagfile` (`sbar.c`)

**Proposed:** Image atlas file for country flags drawn next to logged-in players on the scoreboard. Default `flags`. When a player has no country flag (or the atlas does not include theirs), scr_scoreboard_login_indicator is shown instead.

**Reasoning:** OnChange_scr_scoreboard_login_flagfile calls CL_LoginImageLoad(newvalue) immediately at line 2631; the file is loaded as an atlas and indexed by the player's loginflag identifier (sbar.c:1685, CL_LoginFlag). Confidence raised to high during family-coordinated rewrite (2026-05-26): description no longer makes claims about the exact path/extension convention (gfx/ prefix etc.) -- just names the role and cross-references the fallback indicator. Family: scr_scoreboard_login_{names,color,indicator,flagfile}.

### [low] `cl_voip_demorecord` (`snd_voip.c`)

**Proposed:** Controls whether VoIP audio is recorded into demos; currently registered but the flag is not read in existing code -- may be reserved for future implementation.

**Reasoning:** Cvar is declared with inline comment "Record VOIP in demo" (line 53) but the only reference beyond registration (line 484) is the declaration itself. No read site found in snd_voip.c or any other file. Default 1. Low confidence: the variable may be wired in a build-config path not inspected, or is a planned stub. Flag as unverified behaviour.

### [medium] `sys_fontsdir` (`sys_posix.c`)

**Proposed:** Path to the system fonts directory used for font loading on POSIX platforms; default "/usr/local/share/fonts/" which may need adjustment on Debian/Ubuntu systems where fonts live under /usr/share/fonts/.

**Reasoning:** Read at line 747 of sys_posix.c: returned from a Sys_GetFontsDir()-equivalent function called by the font loader. Default "/usr/local/share/fonts/" is the BSD convention and wrong on most Linux distros. Medium confidence: exact usage context (which font formats, font fallback behaviour) not traced further. Mentioning the platform mismatch adds actionable value.

## no_doc (16 entries -- classification)

| Entry | Source | Classification | Reasoning |
|---|---|---|---|
| `hud_gun_frame_hide` | `hud_guns.c` | `self_documenting` | The sibling hud_gun2_frame_hide is documented in help_variables.json (line 8817: "Hide the frame unless you have the wea |
| `irc_filter_join_part_messages` | `irc_filter.c` | `self_documenting` | Transparent name: suppresses IRC join/part messages in the in-game IRC overlay. Default 0 (show). Three identical-patter |
| `irc_filter_quit_messages` | `irc_filter.c` | `self_documenting` | Same pattern as irc_filter_join_part_messages. Suppresses IRC quit-notification lines. Read only via IRC_filter_show_con |
| `irc_filter_private_messages` | `irc_filter.c` | `self_documenting` | Same pattern. Suppresses private (PRIVMSG) messages. Read via IRC_filter_show_private_messages(). Default 0, no on_chang |
| `irc_filter_notice_messages` | `irc_filter.c` | `self_documenting` | Same pattern. Suppresses NOTICE messages. Read via IRC_filter_show_notice_messages(). Default 0, no on_change. |
| `sv_local_addr` | `net.c` | `self_documenting` | Registered CVAR_ROM at net.c:90; set automatically by the engine at startup to the server's bound IP address via Cvar_Se |
| `sv_use_internal_cmd_dl` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; also absent from mvdsv and ktx trees searched.  Appears only in help_va |
| `sv_demonovis` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; present only in help_variables.json (group-id 43) and unezquake's mirro |
| `sv_enableprofile` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; present only in help_variables.json (group-id 43) and unezquake's mirro |
| `sv_ktpro_mode` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; present only in help_variables.json (group-id 43, type: string) and une |
| `sv_cpserver` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; present only in help_variables.json (group-id 43) and unezquake's mirro |
| `sv_qwfwd_port` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file; present only in help_variables.json (group-id 43) and unezquake's mirro |
| `sv_cullentities` | `null` | `server_mirror` | Not registered in any ezquake-source .c/.h file.  Appears in help_variables.json (group-id 43) and in a KTX QC comment ( |
| `vid_depthbits` | `null` | `obsolete` | Not registered in any ezquake-source .c/.h file.  Group-id 31 = "Obsolete (3.0) - Video" (major-group: Obsolete).  OpenG |
| `vid_stencilbits` | `null` | `obsolete` | Not registered in any ezquake-source .c/.h file.  Group-id 31 = "Obsolete (3.0) - Video" (major-group: Obsolete).  OpenG |
| `sys_nostdout` | `sys_posix.c` | `self_documenting` | Transparent name and a single-purpose read: `if (sys_nostdout.value) return` in Sys_Printf (line 83) and mirrored in sv_ |

## needs_doc high confidence (82 entries -- ready-to-paste drafts)

Grouped by source file. These are ready to paste into `help_variables.json` as the `desc` field for each entry. Style follows ezQuake house style (terse single-sentence, imperative or noun-fragment, no type restate).

### `EX_FileList.c` (1 entries)

- **`file_browser_sort_archives`** -- When enabled, archive files (.zip, .pak) are sorted among other entries using the active sort mode; when disabled (default), archives are always grouped and sorted alphabetically regardless of sort mode.

### `EX_browser.c` (1 entries)

- **`sb_ignore_proxy`** -- Excludes specific proxies from the automatic best-route ping lookup. Example: `sb_ignore_proxy "1.2.3.4:27500 5.6.7.8:27500"`. Leave empty to allow all discovered proxies; only relevant when sb_findroutes is enabled.

### `EX_browser_qtvlist.c` (1 entries)

- **`sb_qtvlist_url`** -- URL of the QTV server RSS feed fetched by the server browser's QTV tab; defaults to the official qtv.quakeworld.nu feed.

### `central.c` (4 entries)

- **`cl_www_address`** -- Base URL of the QuakeWorld central authentication server used for client-side login requests; read-only (CVAR_ROM) to prevent config-level override.
- **`sv_www_address`** -- Base URL of the central server for server-side authentication and periodic check-ins; leave empty to disable remote logins on this server instance.
- **`sv_www_authkey`** -- Authentication key sent to the central server as part of server check-in and challenge/response form data.
- **`sv_www_checkin_period`** -- Minimum seconds between server check-in pings to the central server; floored at 60 seconds regardless of the value set.

### `cl_main.c` (7 entries)

- **`cl_pext_serversideweapon`** -- Enables the MVD_PEXT1_SERVERSIDEWEAPON protocol extension, which offloads weapon-selection script execution to the server (KTX/MVDSV only); when set and the server does not advertise the extension, a console warning is shown at connect time.
- **`cl_username`** -- Sets the authentication username for server login; on change, validates the new value (alphanumeric plus _ [ ] ( ) . -), loads the matching .apikey token file from the config directory, and if already connected, automatically sends a login or logout command to the server.
- **`hud_fps_min_reset_interval`** -- How many seconds before the minimum-FPS tracker resets its baseline (default 30); once elapsed, the lowest observed FPS is replaced by the current value.
- **`hud_frametime_max_reset_interval`** -- How many seconds before the maximum-frametime tracker resets its baseline (default 30); mirrors hud_fps_min_reset_interval for the frametime direction.
- **`hud_performance_average`** -- Enables the running min-FPS and max-frametime trackers used by HUD performance elements (default 1 = on); changing the value resets both trackers immediately via Cl_Reset_Min_fps_f.
- **`r_lightmap_lateupload`** -- When set to 1, defers lightmap texture uploads to the GPU until the brush model draw call (classic renderer only), trading CPU-GPU synchronization points for potential throughput in scenes with many dynamic lights.
- **`r_lightmap_packbytexture`** -- Controls the surface sort order when packing surfaces into lightmap atlases: 0 = no sort, 1 = sort by area (largest first), 2 = sort by height then width (default), which typically reduces atlas waste.

### `cl_screen.c` (6 entries)

- **`r_drawhud`** -- Toggles HUD rendering. 1 (default) draws the HUD; 0 hides it.
- **`scr_damage_floating`** -- Enables floating damage numbers above the point of impact (default 0 = off); when active, damage indicators are projected into 3D space and drift upward with gravity applied over their lifetime.
- **`scr_damage_hitbeep`** -- When enabled, plays dmg-notification.wav each time damage is dealt (default 0 = off); fires independently of scr_damage_floating so the audio cue can be enabled without the floating numbers.
- **`scr_damage_offset_ingame`** -- Vertical world-space offset applied to the spawn origin of floating damage numbers when playing (default 14 units); shifts the indicator above the impact point so it is readable at head-height. Compare scr_damage_offset_spectator.
- **`scr_damage_offset_spectator`** -- Vertical world-space offset for floating damage numbers when spectating (default 28 units, twice the ingame default); higher because spectators typically view from a wider angle and need more separation from the model.
- **`scr_damage_scale`** -- Text scale multiplier for floating damage numbers (default 1 = normal size); values of 0 or below are treated as 1.

### `cl_view.c` (1 entries)

- **`cl_bobhead`** -- When enabled, applies the weapon-bob amplitude to vertical head position instead of the weapon model, so the entire view bobs rather than just the gun (default 0 = off).

### `fs.c` (1 entries)

- **`fs_savegame_home`** -- When enabled (default), save games are written under the ezQuake home directory: `~/.ezquake/<gamedir>/save/` on Linux/macOS, `Documents\ezQuake\<gamedir>\save\` on Windows. When disabled, saves go to the game directory alongside the pak files.

### `hud_ammo.c` (1 entries)

- **`hud_ammo_show_always`** -- Display the ammo count even when no weapon is active or selected (the element would otherwise render blank space to preserve layout alignment).

### `hud_armor.c` (1 entries)

- **`hud_armor_pent_666`** -- Replace the armor value with "666" while carrying the Pentagram of Protection (invulnerability), mimicking the classic status bar display.

### `hud_centerprint.c` (1 entries)

- **`hud_centerprint_speed`** -- Characters-per-second rate at which centerprint text is revealed during intermission; has no effect during normal play where text appears instantly.

### `hud_common.c` (9 entries)

- **`hud_notify_time`** -- Seconds each console notification line stays visible in the notify HUD element. Default 4.
- **`hud_itemsclock_backpacks`** -- When enabled, include dropped backpack respawns in the items clock display. Disabled by default.
- **`hud_itemsclock_timelimit`** -- Look-ahead window in seconds for pending item respawns. Live items on the map are always shown regardless of this setting. Default 5.
- **`hud_keys_player`** -- Player name or slot to show key input for during demo or MVD playback. Empty string (default) follows the current camera target in MVD; has no effect in live play.
- **`hud_static_text_text`** -- Text string to render via the static_text HUD element during demo or QTV playback; inactive in live play. Supports QW color codes and \r line breaks.
- **`hud_static_text_textalign`** -- Horizontal alignment of the static_text content within the HUD element. Accepts "left" (default), "center", or "right".
- **`hud_teamstackbar_show_text`** -- Show percentage labels on the team stack bar. Enabled by default.
- **`hud_teamstackbar_vertical`** -- Draw the team stack bar vertically (top-to-bottom) instead of horizontally. Disabled by default.
- **`hud_teamstackbar_vertical_text`** -- When the stack bar is vertical, also draw the percentage labels vertically. Has no effect if hud_teamstackbar_vertical is 0. Disabled by default.

### `hud_frags.c` (3 entries)

- **`hud_frags_fixedwidth`** -- Fix the name/team column width to hud_frags_maxname characters rather than auto-sizing to the longest name in the current player list.
- **`hud_frags_hidefrags`** -- Suppress the frag count from each cell when in KTX wipeout/clan-arena mode while a player is alive; dead players still show respawn countdown instead of the count.
- **`hud_frags_wipeout`** -- Enable KTX clan-arena/wipeout display adaptations: dead players' cells appear at 50% alpha with a respawn countdown, eliminated-no-respawn cells go dark; has no effect outside KTX wipeout modes.

### `hud_gamesummary.c` (3 entries)

- **`hud_gamesummary_circles`** -- Draw a filled color circle behind each item icon instead of the plain icon texture, using the item's team color.
- **`hud_gamesummary_flash`** -- Flash the icon at full brightness for one second when an item is picked up, then fade back to normal over the following two seconds.
- **`hud_gamesummary_ratio`** -- Pixel size multiplier for each item icon (icon_size = 8 * ratio, clamped 1-8); higher values produce larger icons at the cost of more screen space.

### `hud_performance.c` (4 entries)

- **`hud_framestats_amfstats`** -- Extend the framestats overlay to include AMF particle and corona counts (AMF particle count, AMF particle peak, corona count, corona peak).
- **`hud_frametime_show_max`** -- Show the maximum frametime alongside the average in the frametime HUD element (formatted as "max/avg ms").
- **`hud_frametime_spike`** -- Threshold in milliseconds above which the frametime element appears in style 2 and 3; frames below the threshold are hidden.
- **`hud_frametime_title`** -- Append "ms" unit label after the frametime value.

### `hud_radar.c` (2 entries)

- **`hud_radar_colornames`** -- Render each player's name on the radar in their team color rather than the default white; has no effect on the highlighted/tracked player, which uses hud_radar_highlight_color instead.
- **`hud_radar_simpleitems`** -- Use the model's simple-texture icon (a small flat sprite) when drawing weapons and items on the radar; when disabled, items are drawn as colored letter characters instead.

### `hud_scores.c` (1 entries)

- **`hud_ownfrags_timeout`** -- Seconds the "You fragged <player>" banner stays visible before disappearing. Default 3. (A fade alpha is computed but not currently applied at the draw call.)

### `hud_teaminfo.c` (3 entries)

- **`hud_teaminfo_layout`** -- Format string controlling which fields appear in each teaminfo row; tokens include %p (powerup), %n (name), %l (location), %a (armor), %H (health), %w (weapon), with $x10/$x11 for column separators.
- **`hud_teaminfo_low_health`** -- Health threshold below which a teammate's health value is rendered in red (default 25).
- **`hud_teaminfo_show_headers`** -- Show a team-name header row with combined frag count above each group when hud_teaminfo_show_enemies is enabled; has no effect in single-team view.

### `hud_weapon_stats.c` (2 entries)

- **`hud_weaponstats_format`** -- Format string for the weapon-stats overlay; %N outputs accuracy percentage for weapon N and #N outputs raw hit count, where N is the weapon slot (2=SG, 3=SSG, 7=RL, 8=LG); supports ezQuake color codes.
- **`hud_weaponstats_textalign`** -- Horizontal alignment of the weapon-stats text block; accepts "left", "center", or "right".

### `match_tools_challenge.c` (2 entries)

- **`match_auto_logupload_token`** -- Authentication token for the challenge-mode log upload service; included in the SHA1 hash used to verify match authenticity, and cannot be changed during a live match.
- **`match_auto_logurl`** -- URL endpoint where match logs are posted after a challenge-mode game; default targets the quakeworld.nu log upload service.

### `mvd_utils.c` (3 entries)

- **`mvd_autoadd_items`** -- Pre-populate the MVD item clock list from entity baselines at demo start, so powerup and item respawn timers are seeded before any pickup events are seen.
- **`mvd_info_setup`** -- Format string for per-player rows in the MVD info overlay; supports % tokens: %n name, %l location, %h health, %a armor, %w current weapon, %W best weapon, %f frags, %P ping, %v value.
- **`mvd_sortitems`** -- Sort the MVD item clock list by respawn time (1) rather than fixed entity order (0).

### `net_chan.c` (1 entries)

- **`sv_showdrop`** -- Log dropped server-side packets to the console. Server-only counterpart of showdrop; mirrors that cvar's function for the server network channel.

### `pr_edict.c` (1 entries)

- **`sv_progsname`** -- Basename (without .dat extension) of the QW server progs file to load; defaults to "qwprogs", which resolves to qwprogs.dat. Override to load a custom mod progs file; falls back to qwprogs.dat then spprogs.dat if the named file is missing.

### `r_aliasmodel.c` (4 entries)

- **`gl_powerupshells_effect1level`** -- Color intensity for the first powerup-shell layer (0-1, default 0.75). Higher values make the powerup's color more saturated (e.g., blue for Quad, red for Pentagram).
- **`gl_powerupshells_base1level`** -- Baseline color level for the first powerup-shell layer (0-1, default 0.05). Adds a faint floor to all color channels regardless of which powerup is active.
- **`gl_powerupshells_effect2level`** -- Color intensity for the second powerup-shell layer (0-1, default 0.4). See gl_powerupshells_effect1level.
- **`gl_powerupshells_base2level`** -- Baseline color level for the second powerup-shell layer (0-1, default 0.1). See gl_powerupshells_base1level.

### `r_rmain.c` (7 entries)

- **`cl_mvinset_offset_x`** -- Pixel offset applied to the multiview inset window along the X axis. Positive values shift the inset right; combine with cl_mvinset_offset_y to fine-tune inset placement relative to its corner anchor.
- **`cl_mvinset_offset_y`** -- Pixel offset applied to the multiview inset window along the Y axis. Positive values shift the inset down on screen. See cl_mvinset_offset_x.
- **`cl_mvinset_right`** -- When 1 (default), anchors the multiview inset to the right side of the screen; when 0, anchors it to the left. Pairs with cl_mvinset_top.
- **`cl_mvinset_size_x`** -- Width of the multiview inset window as a fraction of the total view width (default 0.333 = one third).
- **`cl_mvinset_size_y`** -- Height of the multiview inset window as a fraction of the total view height (default 0.333 = one third). See cl_mvinset_size_x.
- **`cl_mvinset_top`** -- When 1 (default), anchors the multiview inset to the top of the screen; when 0, anchors it to the bottom. Pairs with cl_mvinset_right.
- **`r_drawworld`** -- Setting to 0 suppresses world (BSP brush) draw during timedemos only; no effect during normal play.

### `sbar.c` (3 entries)

- **`scr_scoreboard_login_names`** -- Shows the QuakeWorld.nu login-name column on the scoreboard for authenticated players. Default 1. See scr_scoreboard_login_color for the name tint.
- **`scr_scoreboard_login_indicator`** -- Marker shown next to logged-in players who don't have a country flag drawn; accepts ezQuake colour codes. Default `&cffc*&r` (yellow asterisk). See scr_scoreboard_login_flagfile for the country-flag source.
- **`scr_scoreboard_login_color`** -- RGB tint applied to the login-name column when shown via scr_scoreboard_login_names. Default `255 255 192` (warm yellow).

### `snd_voip.c` (2 entries)

- **`cl_voip_capturingvol`** -- Volume multiplier applied to game audio while your microphone is actively capturing, to reduce bleed-through heard by others; default 0.5.
- **`s_inputdevice`** -- SDL audio capture device index for VoIP microphone input; 0 uses the system default, 1+ selects a specific device from the SDL device list (1-based).

### `vid_sdl2.c` (2 entries)

- **`vid_gamma_workaround`** -- Use the X11 XF86VidMode extension for hardware gamma ramps instead of SDL's SDL_SetWindowGammaRamp, working around broken SDL gamma support on some Linux/X11 setups; Linux/FreeBSD only, latched.
- **`vid_reload_auto`** -- Automatically trigger a graphics reload (vid_reload) when CVAR_RELOAD_GFX cvars change; when off, the engine instead prints a reminder to run vid_reload manually.

### `vm.c` (1 entries)

- **`vm_rtChecks`** -- Bitmask enabling runtime safety checks in the x86 JIT VM: bit 1 = stack underflow, bit 2 = opstack overflow, bit 4 = pointer bounds, bit 8 = data segment mask. Disable specific checks with care; disabling all (0) reduces safety for untrusted progs.

### `vx_tracker.c` (4 entries)

- **`r_tracker`** -- Master toggle for the frag-tracker overlay; set to 0 to hide all tracker messages.
- **`r_tracker_pickups`** -- Show item pickup events (armour, weapons, powerups) in the frag tracker; default off.
- **`r_tracker_string_suicides`** -- Label appended to suicide frag-tracker messages; contrasted with r_tracker_string_died (world kills) and r_tracker_string_teammate / r_tracker_string_enemy.
- **`r_tracker_string_teammate`** -- Teammate role label shown in team-kill tracker lines -- appears as either the killer or the victim label depending on which player is the teammate in the event; contrasts with r_tracker_string_enemy (opponent kills) and r_tracker_string_suicides.

## Followups / observations

Dead-cvar / orphan findings (no read sites or no registration anywhere in the tree, all surfaced as kick_to_ciscon):
- `show_velocity_3d_offset_forward` (`cl_screen.c`) -- registered, never read.
- `show_velocity_3d_offset_down` (`cl_screen.c`) -- registered, never read.
- `gl_outline_scale_world` (`r_rmain.c`) -- declared but `Cvar_Register` call is commented out.
- `hud_iammo_show_always` (`hud_ammo.c`) -- registered on the iammo element but the draw function never calls `HUD_FindVar` for it.
- `hud_teamstackbar_simpleitems` (`hud_common.c`) -- registered on the teamstackbar element but never read by SCR_Hud_StackBar.
- `cl_weaponforgetondeath` (no source file) -- exists only in `help_variables.json` with `system-generated:true`; no `Cvar_Register` call anywhere. Moved to kick_to_ciscon during the operator review pass (originally drafted as low-confidence needs_doc; reassessed as needing cvar-existence confirmation first).

The 7 `sv_*`-prefixed null-source entries are not registered in ezQuake, mvdsv, or ktx trees -- they appear only as `help_variables.json` entries. Classified `no_doc / server_mirror`. The 2 `vid_*bits` entries (`vid_depthbits`, `vid_stencilbits`) are obsolete OpenGL tunables removed in the SDL2 transition (group-id 31 "Obsolete - Video"). Classified `no_doc / obsolete`.

**PR-body question for nano (concerns walkthrough 2026-05-26):** `mvd_info_setup` has a `%p` token in its Replace_In_String table (`mvd_utils.c:1116`) that maps to `mvd_info_powerups`. The code that would populate `mvd_info_powerups` with Quad/Pent/Ring names is fully commented out at `mvd_utils.c:1089-1103`. As a result, `%p` always expands to empty. The default `mvd_info_setup` cvar value still includes `%p%n` (`mvd_utils.c:218`). The description was sharpened to drop `%p` from the live token list. Should the powerup-population code be re-enabled, or `%p` removed from the token table? Note: `hud_teaminfo_layout` has an independently-working `%p` (icon draw at `hud_teaminfo.c:508`); the two cvars look similar but only `hud_teaminfo` actually renders powerups.

## Calibration learnings (for remaining queues)

The cvar pass surfaced two structural issues that the parking doc has been updated to prevent on commands / macros / cmdline runs:

1. **family_collapse rubric tightened with a member functional-equivalence test.** The original "members differ only by index/identifier, not by behavior" criterion was too loose; `cl_mvinset_*` slipped through despite members having distinct axes, dimensions, and roles. The rubric now adds an explicit lit-test ("can ONE sentence describe what all N members do interchangeably?") and an explicit false-positives list. See parking doc `Verdict rubric → family_collapse`.

2. **Aggregator row-selection rule made explicit.** The original aggregator picked the alphabetically-first row of each family group for the augmented head description; this works coincidentally when the head is the lowest-named member but fails when alphabetical order doesn't match family-head position. Updated rule: pick the row where `name == family_head` AND `proposed_desc` is non-null, otherwise emit no augmented head description and leave the existing help_*.json desc untouched. See parking doc `Aggregator rules`.

Both changes are also reflected in the handoff prompt template so executor sub-agents apply the tightened rubric directly.

## Carry-forwards

- This is the **cvar** pass only. Commands (157), macros (38), and cmdline_params (56) queues exist in `/tmp/cmd-queue.json`, `/tmp/macro-queue.json`, `/tmp/cmdline-queue.json` -- ready to fire when this pass is reviewed.
- The per-source-file batch yamls are at `/tmp/audit-batch-*.yaml` (37 files). The aggregator script is in this audit's session log.
- Channels NOT yet produced (operator-gated): PR-ready diff against `help_variables.json`, classifications-yaml appends, GitHub issue bodies for ciscon. Trigger those after reviewing this summary.
