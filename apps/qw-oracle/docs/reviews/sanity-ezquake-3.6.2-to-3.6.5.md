---
project: ezquake
from_version: 3.6.2
to_version: 3.6.5
generated_at: 2026-04-23T22:53:34.436Z
reviewer: (skill fills)
status: draft
---

# Extraction review: ezquake 3.6.2 -> 3.6.5

## Summary

- Additions: 52 (52 pending)
- Retirements: 13 (13 pending)
- Semantic crossings: 1 (1 pending)
- Unclassified promotions: 0 (0 pending)
- Source-invisible changes: 13 (13 pending)
- **Total:** 79

## Clusters

### cluster:hud_scoreclock-family (confidence: strong)
Signals: commit:adb4d497, prefix:hud_scoreclock, prefix:hud_scoreclock_align, prefix:hud_scoreclock_pos
Members (15):
- addition:ezquake:cvar:hud_scoreclock_align_x
- addition:ezquake:cvar:hud_scoreclock_align_y
- addition:ezquake:cvar:hud_scoreclock_draw
- addition:ezquake:cvar:hud_scoreclock_format
- addition:ezquake:cvar:hud_scoreclock_frame
- addition:ezquake:cvar:hud_scoreclock_frame_color
- addition:ezquake:cvar:hud_scoreclock_item_opacity
- addition:ezquake:cvar:hud_scoreclock_order
- addition:ezquake:cvar:hud_scoreclock_place
- addition:ezquake:cvar:hud_scoreclock_pos_x
- addition:ezquake:cvar:hud_scoreclock_pos_y
- addition:ezquake:cvar:hud_scoreclock_proportional
- addition:ezquake:cvar:hud_scoreclock_scale
- addition:ezquake:cvar:hud_scoreclock_show
- addition:ezquake:hud_element:scoreclock

### cluster:gl_outline-family (confidence: strong)
Signals: commit:116022bb, commit:2adb43dc, commit:543f3404, commit:656184da, commit:8e689d8b, commit:bc4cb0dd, commit:ef7396bd, pr:800, pr:865, prefix:gl_outline, prefix:gl_outline_color, prefix:gl_outline_scale, prefix:gl_outline_world
Members (9):
- addition:ezquake:cvar:gl_outline_color_enemy
- addition:ezquake:cvar:gl_outline_color_model
- addition:ezquake:cvar:gl_outline_color_team
- addition:ezquake:cvar:gl_outline_color_world
- addition:ezquake:cvar:gl_outline_scale_model
- addition:ezquake:cvar:gl_outline_scale_world
- addition:ezquake:cvar:gl_outline_use_player_color
- addition:ezquake:cvar:gl_outline_world_depth_threshold
- addition:ezquake:cvar:gl_outline_world_normal_threshold

### cluster:r_tracker-family (confidence: strong)
Signals: commit:37b85307, commit:7a083870, pr:893, prefix:r_tracker
Members (4):
- addition:ezquake:cvar:r_tracker_colorfix
- addition:ezquake:cvar:r_tracker_inconsole_colored_weapon
- addition:ezquake:cvar:r_tracker_positive_enemy_vs_enemy
- addition:ezquake:cvar:r_tracker_string_inconsole_prefix

### cluster:commit-dcf8abc6 (confidence: strong)
Signals: commit:dcf8abc6, prefix:r_rlbloodcolor
Members (3):
- addition:ezquake:cvar:r_rlbloodcolor_big
- addition:ezquake:cvar:r_rlbloodcolor_small
- addition:ezquake:cvar:r_sgbloodcolor

### cluster:commit-fbcf8a89 (confidence: strong)
Signals: commit:fbcf8a89, pr:877
Members (2):
- addition:ezquake:command:vminfo
- addition:ezquake:cvar:vm_rtchecks

### cluster:gl_spec-family (confidence: strong)
Signals: commit:72445c30, prefix:gl_spec
Members (2):
- addition:ezquake:cvar:gl_spec_xray
- addition:ezquake:cvar:gl_spec_xray_distance

### cluster:hud_frags-family (confidence: strong)
Signals: commit:2ad6a2f2, prefix:hud_frags
Members (2):
- addition:ezquake:cvar:hud_frags_hidefrags
- addition:ezquake:cvar:hud_frags_wipeout

### cluster:keymap-family (confidence: medium)
Signals: prefix:keymap
Members (6):
- retirement:ezquake:command:keymap_init
- retirement:ezquake:command:keymap_list
- retirement:ezquake:command:keymap_load
- retirement:ezquake:command:keymap_reset
- retirement:ezquake:command:keymap_save
- retirement:ezquake:cvar:keymap_name

## Findings

### addition:ezquake:command:bindedit - addition - ezquake:command:bindedit

**Summary:** New command `bindedit` first observed at 3.6.5.

**Evidence:**
- commit: 37773e3322c7d02105be4c743259ca5e7451097a
- entity_ref: ezquake:command:bindedit
- to_value: `rename the functions to match in-game command names

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:clipboard - addition - ezquake:command:clipboard

**Summary:** New command `clipboard` first observed at 3.6.5.

**Evidence:**
- commit: 99d6201792511ef60e5675f03e4a4bce0fa11f81
- entity_ref: ezquake:command:clipboard
- to_value: `clipboard command

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:observebr - addition - ezquake:command:observebr

**Summary:** New command `observebr` first observed at 3.6.5.

**Evidence:**
- commit: 9362029db9d5f1cfe08e4e0a064493d281eb52ca
- entity_ref: ezquake:command:observebr
- to_value: `Added command /observebr

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:stopsound_script - addition - ezquake:command:stopsound_script

**Summary:** New command `stopsound_script` first observed at 3.6.5.

**Evidence:**
- commit: bf34282e7a0f3859acdd168032a5adb5a730ede4
- entity_ref: ezquake:command:stopsound_script
- to_value: `Adding back support for 'img' type for 'hud262_add', Add command to stop all sounds played using 'play' command.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:sys_forget_sandbox - addition - ezquake:command:sys_forget_sandbox

**Summary:** New command `sys_forget_sandbox` first observed at 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:sys_forget_sandbox

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:vid_reload - addition - ezquake:command:vid_reload

**Summary:** New command `vid_reload` first observed at 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:vid_reload

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:vminfo - addition - ezquake:command:vminfo

**Summary:** New command `vminfo` first observed at 3.6.5.

**Evidence:**
- commit: fbcf8a89f57da1902021cfb8a43dd109e9ccfdb7
- entity_ref: ezquake:command:vminfo
- to_value: `SERVER: add support for API16 so we could run latest KTX
Seems like there is some issues, minor testing was done unde...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-fbcf8a89
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_brush_polygonoffset_factor - addition - ezquake:cvar:gl_brush_polygonoffset_factor

**Summary:** New cvar `gl_brush_polygonoffset_factor` first observed at 3.6.5.

**Evidence:**
- commit: 3d64fe8fa1f00103b8022f9bf49fd0bacfd29c0c
- entity_ref: ezquake:cvar:gl_brush_polygonoffset_factor
- to_value: `fix z-fighting

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_color_enemy - addition - ezquake:cvar:gl_outline_color_enemy

**Summary:** New cvar `gl_outline_color_enemy` first observed at 3.6.5.

**Evidence:**
- commit: 543f34048f012c2f482e63956c0a787b5892568c
- entity_ref: ezquake:cvar:gl_outline_color_enemy
- to_value: `help texts + tweaks

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_color_model - addition - ezquake:cvar:gl_outline_color_model

**Summary:** New cvar `gl_outline_color_model` first observed at 3.6.5.

**Evidence:**
- commit: 2adb43dcebe83e710c60ef0273236757477762e9
- entity_ref: ezquake:cvar:gl_outline_color_model
- to_value: `add customizable color for aliasmodel outlines

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_color_team - addition - ezquake:cvar:gl_outline_color_team

**Summary:** New cvar `gl_outline_color_team` first observed at 3.6.5.

**Evidence:**
- commit: 543f34048f012c2f482e63956c0a787b5892568c
- entity_ref: ezquake:cvar:gl_outline_color_team
- to_value: `help texts + tweaks

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_color_world - addition - ezquake:cvar:gl_outline_color_world

**Summary:** New cvar `gl_outline_color_world` first observed at 3.6.5.

**Evidence:**
- commit: 8e689d8bd844cc7a2cbde02e1b390e3148503cec
- entity_ref: ezquake:cvar:gl_outline_color_world
- to_value: `add customizable color to world outlines

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_scale_model - addition - ezquake:cvar:gl_outline_scale_model

**Summary:** New cvar `gl_outline_scale_model` first observed at 3.6.5.

**Evidence:**
- commit: ef7396bd253e17d3aabca717b5fe1cbb2f076bfd
- entity_ref: ezquake:cvar:gl_outline_scale_model
- to_value: `bring back the old shader because it was less annoying and remove world scale again

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_scale_world - addition - ezquake:cvar:gl_outline_scale_world

**Summary:** New cvar `gl_outline_scale_world` first observed at 3.6.5.

**Evidence:**
- commit: ef7396bd253e17d3aabca717b5fe1cbb2f076bfd
- entity_ref: ezquake:cvar:gl_outline_scale_world
- to_value: `bring back the old shader because it was less annoying and remove world scale again

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_use_player_color - addition - ezquake:cvar:gl_outline_use_player_color

**Summary:** New cvar `gl_outline_use_player_color` first observed at 3.6.5.

**Evidence:**
- commit: 116022bb881f4d14673d865a58d098433be92a0d
- entity_ref: ezquake:cvar:gl_outline_use_player_color
- to_value: `outlines can use player color now + some cleanup

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_world_depth_threshold - addition - ezquake:cvar:gl_outline_world_depth_threshold

**Summary:** New cvar `gl_outline_world_depth_threshold` first observed at 3.6.5.

**Evidence:**
- commit: bc4cb0ddd366fbf67d28791515a92ceef6f44d7d
- entity_ref: ezquake:cvar:gl_outline_world_depth_threshold
- to_value: `thanks ciscon

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_outline_world_normal_threshold - addition - ezquake:cvar:gl_outline_world_normal_threshold

**Summary:** New cvar `gl_outline_world_normal_threshold` first observed at 3.6.5.

**Evidence:**
- commit: 656184da4e8d2d07c22bba154eede3523a284382
- entity_ref: ezquake:cvar:gl_outline_world_normal_threshold
- to_value: `gl_outline_world_normal_threshold

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_outline-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_part_bloodtrails - addition - ezquake:cvar:gl_part_bloodtrails

**Summary:** New cvar `gl_part_bloodtrails` first observed at 3.6.5.

**Evidence:**
- commit: 1de028a44a9b883d1c03b01e29935f549895941d
- entity_ref: ezquake:cvar:gl_part_bloodtrails
- to_value: `CVAR: changed default for new var to match previous behaviour

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_scalealphatextures - addition - ezquake:cvar:gl_scalealphatextures

**Summary:** New cvar `gl_scalealphatextures` first observed at 3.6.5.

**Evidence:**
- commit: d34035f7f086cc965d2dc6cbc92caffdb6784621
- entity_ref: ezquake:cvar:gl_scalealphatextures
- to_value: `TEXTURES: Configurable scaling of fence textures.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_spec_xray - addition - ezquake:cvar:gl_spec_xray

**Summary:** New cvar `gl_spec_xray` first observed at 3.6.5.

**Evidence:**
- commit: 72445c30ac6eaa5806c8eeb3b5d6bc06aa1e2771
- entity_ref: ezquake:cvar:gl_spec_xray
- to_value: `rename xray cvars, implement gl_spec_xray_distance

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_spec-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:gl_spec_xray_distance - addition - ezquake:cvar:gl_spec_xray_distance

**Summary:** New cvar `gl_spec_xray_distance` first observed at 3.6.5.

**Evidence:**
- commit: 72445c30ac6eaa5806c8eeb3b5d6bc06aa1e2771
- entity_ref: ezquake:cvar:gl_spec_xray_distance
- to_value: `rename xray cvars, implement gl_spec_xray_distance

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** gl_spec-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_frags_hidefrags - addition - ezquake:cvar:hud_frags_hidefrags

**Summary:** New cvar `hud_frags_hidefrags` first observed at 3.6.5.

**Evidence:**
- commit: 2ad6a2f2ea24c347f5c8946cb89459dbe5c7c47d
- entity_ref: ezquake:cvar:hud_frags_hidefrags
- to_value: `MINOR: Moving hud logic for frags/teamfrags to hud_frags.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_frags-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_frags_wipeout - addition - ezquake:cvar:hud_frags_wipeout

**Summary:** New cvar `hud_frags_wipeout` first observed at 3.6.5.

**Evidence:**
- commit: 2ad6a2f2ea24c347f5c8946cb89459dbe5c7c47d
- entity_ref: ezquake:cvar:hud_frags_wipeout
- to_value: `MINOR: Moving hud logic for frags/teamfrags to hud_frags.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_frags-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_align_x - addition - ezquake:cvar:hud_scoreclock_align_x

**Summary:** New cvar `hud_scoreclock_align_x` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_align_x
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_align_y - addition - ezquake:cvar:hud_scoreclock_align_y

**Summary:** New cvar `hud_scoreclock_align_y` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_align_y
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_draw - addition - ezquake:cvar:hud_scoreclock_draw

**Summary:** New cvar `hud_scoreclock_draw` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_draw
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_format - addition - ezquake:cvar:hud_scoreclock_format

**Summary:** New cvar `hud_scoreclock_format` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_format
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_frame - addition - ezquake:cvar:hud_scoreclock_frame

**Summary:** New cvar `hud_scoreclock_frame` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_frame
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_frame_color - addition - ezquake:cvar:hud_scoreclock_frame_color

**Summary:** New cvar `hud_scoreclock_frame_color` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_frame_color
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_item_opacity - addition - ezquake:cvar:hud_scoreclock_item_opacity

**Summary:** New cvar `hud_scoreclock_item_opacity` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_item_opacity
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_order - addition - ezquake:cvar:hud_scoreclock_order

**Summary:** New cvar `hud_scoreclock_order` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_order
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_place - addition - ezquake:cvar:hud_scoreclock_place

**Summary:** New cvar `hud_scoreclock_place` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_place
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_pos_x - addition - ezquake:cvar:hud_scoreclock_pos_x

**Summary:** New cvar `hud_scoreclock_pos_x` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_pos_x
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_pos_y - addition - ezquake:cvar:hud_scoreclock_pos_y

**Summary:** New cvar `hud_scoreclock_pos_y` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_pos_y
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_proportional - addition - ezquake:cvar:hud_scoreclock_proportional

**Summary:** New cvar `hud_scoreclock_proportional` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_proportional
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_scale - addition - ezquake:cvar:hud_scoreclock_scale

**Summary:** New cvar `hud_scoreclock_scale` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_scale
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoreclock_show - addition - ezquake:cvar:hud_scoreclock_show

**Summary:** New cvar `hud_scoreclock_show` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:cvar:hud_scoreclock_show
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_remove_collinear_vertices - addition - ezquake:cvar:r_remove_collinear_vertices

**Summary:** New cvar `r_remove_collinear_vertices` first observed at 3.6.5.

**Evidence:**
- commit: 22f39e2a79bd7dcb35ba2f320b344c860c1639ca
- entity_ref: ezquake:cvar:r_remove_collinear_vertices
- to_value: `RENDERER: Add option to filter out collinear vertices.
This is a temporary workaround primarily targeted at macOS arm...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_rlbloodcolor_big - addition - ezquake:cvar:r_rlbloodcolor_big

**Summary:** New cvar `r_rlbloodcolor_big` first observed at 3.6.5.

**Evidence:**
- commit: dcf8abc6c74ff33bf3e0af4f73f1ee2eb95da054
- entity_ref: ezquake:cvar:r_rlbloodcolor_big
- to_value: `New variables for rocket explosion blood color:
  r_rlbloodcolor_small
  r_rlbloodcolor_big

These work like r_lgbloo...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-dcf8abc6
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_rlbloodcolor_small - addition - ezquake:cvar:r_rlbloodcolor_small

**Summary:** New cvar `r_rlbloodcolor_small` first observed at 3.6.5.

**Evidence:**
- commit: dcf8abc6c74ff33bf3e0af4f73f1ee2eb95da054
- entity_ref: ezquake:cvar:r_rlbloodcolor_small
- to_value: `New variables for rocket explosion blood color:
  r_rlbloodcolor_small
  r_rlbloodcolor_big

These work like r_lgbloo...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-dcf8abc6
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_sgbloodcolor - addition - ezquake:cvar:r_sgbloodcolor

**Summary:** New cvar `r_sgbloodcolor` first observed at 3.6.5.

**Evidence:**
- commit: dcf8abc6c74ff33bf3e0af4f73f1ee2eb95da054
- entity_ref: ezquake:cvar:r_sgbloodcolor
- to_value: `New variables for rocket explosion blood color:
  r_rlbloodcolor_small
  r_rlbloodcolor_big

These work like r_lgbloo...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-dcf8abc6
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_tracker_colorfix - addition - ezquake:cvar:r_tracker_colorfix

**Summary:** New cvar `r_tracker_colorfix` first observed at 3.6.5.

**Evidence:**
- commit: 7a0838709aacbe2ff74752bd06eea9e0f0e512bf
- entity_ref: ezquake:cvar:r_tracker_colorfix
- to_value: `TRACKER: r_tracker_colorfix colors both names in frag line (#896)
* TRACKER: r_tracker_colorfix colors entire fraglin...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** r_tracker-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_tracker_inconsole_colored_weapon - addition - ezquake:cvar:r_tracker_inconsole_colored_weapon

**Summary:** New cvar `r_tracker_inconsole_colored_weapon` first observed at 3.6.5.

**Evidence:**
- commit: 37b85307af3b913d2cc8242e3e850abaf066f419
- entity_ref: ezquake:cvar:r_tracker_inconsole_colored_weapon
- to_value: `VX_TRACKER: Add r_tracker_inconsole_colored_weapon (#893)
* VX_TRACKER: Add r_tracker_inconsole_colored_weapon

* A...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** r_tracker-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_tracker_positive_enemy_vs_enemy - addition - ezquake:cvar:r_tracker_positive_enemy_vs_enemy

**Summary:** New cvar `r_tracker_positive_enemy_vs_enemy` first observed at 3.6.5.

**Evidence:**
- commit: 37b85307af3b913d2cc8242e3e850abaf066f419
- entity_ref: ezquake:cvar:r_tracker_positive_enemy_vs_enemy
- to_value: `VX_TRACKER: Add r_tracker_inconsole_colored_weapon (#893)
* VX_TRACKER: Add r_tracker_inconsole_colored_weapon

* A...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** r_tracker-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_tracker_string_inconsole_prefix - addition - ezquake:cvar:r_tracker_string_inconsole_prefix

**Summary:** New cvar `r_tracker_string_inconsole_prefix` first observed at 3.6.5.

**Evidence:**
- commit: 37b85307af3b913d2cc8242e3e850abaf066f419
- entity_ref: ezquake:cvar:r_tracker_string_inconsole_prefix
- to_value: `VX_TRACKER: Add r_tracker_inconsole_colored_weapon (#893)
* VX_TRACKER: Add r_tracker_inconsole_colored_weapon

* A...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** r_tracker-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:sys_update_check - addition - ezquake:cvar:sys_update_check

**Summary:** New cvar `sys_update_check` first observed at 3.6.5.

**Evidence:**
- commit: bac9f0312dd83c28ead8b080f842b7c8bd4221d7
- entity_ref: ezquake:cvar:sys_update_check
- to_value: `CFG: Rename allow_update_check to sys_update_check.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:vm_rtchecks - addition - ezquake:cvar:vm_rtchecks

**Summary:** New cvar `vm_rtchecks` first observed at 3.6.5.

**Evidence:**
- commit: fbcf8a89f57da1902021cfb8a43dd109e9ccfdb7
- entity_ref: ezquake:cvar:vm_rtchecks
- to_value: `SERVER: add support for API16 so we could run latest KTX
Seems like there is some issues, minor testing was done unde...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-fbcf8a89
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:hud_element:scoreclock - addition - ezquake:hud_element:scoreclock

**Summary:** New hud_element `scoreclock` first observed at 3.6.5.

**Evidence:**
- commit: adb4d497220f6b5aa87b442ef48d17f23e130b14
- entity_ref: ezquake:hud_element:scoreclock
- to_value: `add scoreclock (+docs), functionality for HUD_NO_DRAW flag

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_scoreclock-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:macro:dateiso - addition - ezquake:macro:dateiso

**Summary:** New macro `dateiso` first observed at 3.6.5.

**Evidence:**
- commit: 218d333e5822137198b4b7cb4494a4ae6138dfb9
- entity_ref: ezquake:macro:dateiso
- to_value: `dateiso macro

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:asset_loader_sites:{"canonical_id":"ezquake:loader_site:Draw_CachePicSafe_hud_262_Hud_Add_f_1"} - addition - asset_loader_sites:{"canonical_id":"ezquake:loader_site:Draw_CachePicSafe_hud_262_Hud_Add_f_1"}

**Summary:** New asset_loader_sites row {"canonical_id":"ezquake:loader_site:Draw_CachePicSafe_hud_262_Hud_Add_f_1"} first observed at 3.6.5.

**Evidence:**
- commit: UNKNOWN
- relation_row_key: asset_loader_sites:{"canonical_id":"ezquake:loader_site:Draw_CachePicSafe_hud_262_Hud_Add_f_1"}

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_cmd_CL_Download_Accept_1"} - addition - asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_cmd_CL_Download_Accept_1"}

**Summary:** New asset_loader_sites row {"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_cmd_CL_Download_Accept_1"} first observed at 3.6.5.

**Evidence:**
- commit: UNKNOWN
- relation_row_key: asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_cmd_CL_Download_Accept_1"}

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cmodel_CM_OpenMap_1"} - addition - asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cmodel_CM_OpenMap_1"}

**Summary:** New asset_loader_sites row {"canonical_id":"ezquake:loader_site:FS_OpenVFS_cmodel_CM_OpenMap_1"} first observed at 3.6.5.

**Evidence:**
- commit: UNKNOWN
- relation_row_key: asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cmodel_CM_OpenMap_1"}

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keycode - retirement - ezquake:command:keycode

**Summary:** command `keycode` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keycode

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymap_init - retirement - ezquake:command:keymap_init

**Summary:** command `keymap_init` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymap_init

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymap_list - retirement - ezquake:command:keymap_list

**Summary:** command `keymap_list` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymap_list

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymap_load - retirement - ezquake:command:keymap_load

**Summary:** command `keymap_load` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymap_load

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymap_reset - retirement - ezquake:command:keymap_reset

**Summary:** command `keymap_reset` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymap_reset

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymap_save - retirement - ezquake:command:keymap_save

**Summary:** command `keymap_save` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymap_save

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:keymaplist - retirement - ezquake:command:keymaplist

**Summary:** command `keymaplist` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:command:keymaplist

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:cvar:cl_showkeycodes - retirement - ezquake:cvar:cl_showkeycodes

**Summary:** cvar `cl_showkeycodes` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:cvar:cl_showkeycodes

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:cvar:gl_smoothfont - retirement - ezquake:cvar:gl_smoothfont

**Summary:** cvar `gl_smoothfont` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:cvar:gl_smoothfont

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:cvar:keymap_name - retirement - ezquake:cvar:keymap_name

**Summary:** cvar `keymap_name` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:cvar:keymap_name

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** keymap-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:cvar:r_fx_geometry - retirement - ezquake:cvar:r_fx_geometry

**Summary:** cvar `r_fx_geometry` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: 17c9bc17fa2f99a57775a6210512004f51f752c9
- entity_ref: ezquake:cvar:r_fx_geometry
- from_value: `MODERN: World outlining
Requires framebuffers enabled, then "r_fx_geometry 1"

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:cvar:scr_printspeed - retirement - ezquake:cvar:scr_printspeed

**Summary:** cvar `scr_printspeed` present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:cvar:scr_printspeed

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_parse_CL_CheckOrDownloadFile_1"} - retirement - asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_parse_CL_CheckOrDownloadFile_1"}

**Summary:** asset_loader_sites row {"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_parse_CL_CheckOrDownloadFile_1"} present in 3.6.2, gone in 3.6.5.

**Evidence:**
- commit: UNKNOWN
- relation_row_key: asset_loader_sites:{"canonical_id":"ezquake:loader_site:FS_OpenVFS_cl_parse_CL_CheckOrDownloadFile_1"}

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:cvar:sv_enableprofile:flag_names - semantic-crossing - ezquake:cvar:sv_enableprofile

**Summary:** cvar `sv_enableprofile`: flag_names changed.

**Evidence:**
- commit: UNKNOWN
- entity_ref: ezquake:cvar:sv_enableprofile
- from_value: `[]`
- to_value: ""

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:49 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Fixed a couple of types in the built-in help (a-detiste)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:50 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Remove dangerous commands (osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:51 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `build` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  homebrew dependency 'mpg123' is not available for big sur anymore (ziermmar)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:52 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `build` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Finalize the cmake transition (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:36 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Update server browser sources (namtsui)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:37 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Adding information about non-standard flag models (ezh-hammer)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** hud_scoreclock-family -- Entity-name keyword overlap: token "information" in release-note body matched cluster member `hud_scoreclock_format`.

### source-invisible:release_notes:38 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  HELP: updates from JSON generator and assorted cleanups (hemostx)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:40 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Adds style 3 to most numeric hud elements (health, ammo, armor, gameclock, ...) which makes the text small gold letters from the console charset (krizej)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** r_tracker-family -- Entity-name keyword overlap: token "console" in release-note body matched cluster member `r_tracker_inconsole_colored_weapon`.

### source-invisible:release_notes:41 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Improve error handling (krizej)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:42 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Sync mvdsv and ezquake so KTX could be able to run with ezquake as server + client (qqshka)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:44 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Allow server browser scrolling when serverinfo open (pkova)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:45 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Additions to hud_frags element (dusty)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** hud_frags-family -- Entity-name keyword overlap: token "hud_frags" in release-note body matched cluster member `hud_frags_hidefrags`.

### source-invisible:release_notes:46 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Add french dvorak bépo keymap (KJXV)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** keymap-family -- Entity-name keyword overlap: token "keymap" in release-note body matched cluster member `keymap_init`.
