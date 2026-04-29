---
project: ezquake
from_version: 3.6.6
to_version: 3.6.8
generated_at: 2026-04-23T22:36:50.582Z
reviewer: (skill fills)
status: draft
---

# Extraction review: ezquake 3.6.6 -> 3.6.8

## Summary

- Additions: 39 (39 pending)
- Retirements: 0 (0 pending)
- Semantic crossings: 4 (4 pending)
- Unclassified promotions: 0 (0 pending)
- Source-invisible changes: 2 (2 pending)
- **Total:** 45

## Clusters

### cluster:commit-652abacb (confidence: strong)
Signals: commit-window:5, commit-window:6, commit:3c7fb2ab, commit:652abacb, prefix:hud_scoremapname, prefix:hud_scoremapname_align, prefix:hud_scoremapname_pos, prefix:scr_scoreboard
Members (19):
- addition:ezquake:cvar:hud_scoremapname_align_x
- addition:ezquake:cvar:hud_scoremapname_align_y
- addition:ezquake:cvar:hud_scoremapname_draw
- addition:ezquake:cvar:hud_scoremapname_frame
- addition:ezquake:cvar:hud_scoremapname_frame_color
- addition:ezquake:cvar:hud_scoremapname_item_opacity
- addition:ezquake:cvar:hud_scoremapname_order
- addition:ezquake:cvar:hud_scoremapname_place
- addition:ezquake:cvar:hud_scoremapname_pos_x
- addition:ezquake:cvar:hud_scoremapname_pos_y
- addition:ezquake:cvar:hud_scoremapname_proportional
- addition:ezquake:cvar:hud_scoremapname_scale
- addition:ezquake:cvar:hud_scoremapname_show
- addition:ezquake:cvar:hud_scoremapname_style
- addition:ezquake:cvar:qtv_event_msglevel
- addition:ezquake:cvar:scr_scoreboard_qtv_name
- addition:ezquake:cvar:scr_scoreboard_showmapname
- addition:ezquake:cvar:scr_scoreboard_showqtvusers
- addition:ezquake:hud_element:scoremapname

### cluster:commit-5a926632 (confidence: strong)
Signals: commit-window:1, commit:5a926632, prefix:hud_ammo1, prefix:hud_ammo1_text, prefix:hud_ammo1_text_color, prefix:hud_ammo2, prefix:hud_ammo2_text, prefix:hud_ammo2_text_color, prefix:hud_ammo3, prefix:hud_ammo3_text, prefix:hud_ammo3_text_color, prefix:hud_ammo4, prefix:hud_ammo4_text, prefix:hud_ammo4_text_color
Members (8):
- addition:ezquake:cvar:hud_ammo1_text_color_low
- addition:ezquake:cvar:hud_ammo1_text_color_normal
- addition:ezquake:cvar:hud_ammo2_text_color_low
- addition:ezquake:cvar:hud_ammo2_text_color_normal
- addition:ezquake:cvar:hud_ammo3_text_color_low
- addition:ezquake:cvar:hud_ammo3_text_color_normal
- addition:ezquake:cvar:hud_ammo4_text_color_low
- addition:ezquake:cvar:hud_ammo4_text_color_normal

### cluster:cl_portpingprobe-family (confidence: strong)
Signals: commit-window:7, commit:221c76b3, prefix:cl_portpingprobe
Members (4):
- addition:ezquake:cvar:cl_portpingprobe_delay
- addition:ezquake:cvar:cl_portpingprobe_enable
- addition:ezquake:cvar:cl_portpingprobe_port_probes
- addition:ezquake:cvar:cl_portpingprobe_probes

### cluster:commit-adcf86d2 (confidence: strong)
Signals: commit-window:3, commit:adcf86d2
Members (4):
- semantic-crossing:ezquake:ruleset:qcon:restrict_play
- semantic-crossing:ezquake:ruleset:smackdown:restrict_play
- semantic-crossing:ezquake:ruleset:smackdrive:restrict_play
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_play

### cluster:commit-d5a59a6b (confidence: strong)
Signals: commit-window:9, commit:d5a59a6b
Members (2):
- addition:ezquake:cvar:ignore_no_weapon
- addition:ezquake:cvar:ignore_not_enough_ammo

### cluster:hud_ammo_text_color-family (confidence: strong)
Signals: commit-window:2, commit:0007d03f, prefix:hud_ammo, prefix:hud_ammo_text, prefix:hud_ammo_text_color
Members (2):
- addition:ezquake:cvar:hud_ammo_text_color_low
- addition:ezquake:cvar:hud_ammo_text_color_normal

## Findings

### addition:ezquake:cvar:cl_portpingprobe_delay - addition - ezquake:cvar:cl_portpingprobe_delay

**Summary:** New cvar `cl_portpingprobe_delay` first observed at 3.6.8.

**Evidence:**
- commit: 221c76b3e776f69bed0bb353151f8a018219a0a4
- entity_ref: ezquake:cvar:cl_portpingprobe_delay
- to_value: `Add cl_portpingprobe_port_probes
Re-run the probe for each port cl_portpingprobe_port_probes number of
times.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** cl_portpingprobe-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_portpingprobe_enable - addition - ezquake:cvar:cl_portpingprobe_enable

**Summary:** New cvar `cl_portpingprobe_enable` first observed at 3.6.8.

**Evidence:**
- commit: 221c76b3e776f69bed0bb353151f8a018219a0a4
- entity_ref: ezquake:cvar:cl_portpingprobe_enable
- to_value: `Add cl_portpingprobe_port_probes
Re-run the probe for each port cl_portpingprobe_port_probes number of
times.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** cl_portpingprobe-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_portpingprobe_port_probes - addition - ezquake:cvar:cl_portpingprobe_port_probes

**Summary:** New cvar `cl_portpingprobe_port_probes` first observed at 3.6.8.

**Evidence:**
- commit: 221c76b3e776f69bed0bb353151f8a018219a0a4
- entity_ref: ezquake:cvar:cl_portpingprobe_port_probes
- to_value: `Add cl_portpingprobe_port_probes
Re-run the probe for each port cl_portpingprobe_port_probes number of
times.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** cl_portpingprobe-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_portpingprobe_probes - addition - ezquake:cvar:cl_portpingprobe_probes

**Summary:** New cvar `cl_portpingprobe_probes` first observed at 3.6.8.

**Evidence:**
- commit: 221c76b3e776f69bed0bb353151f8a018219a0a4
- entity_ref: ezquake:cvar:cl_portpingprobe_probes
- to_value: `Add cl_portpingprobe_port_probes
Re-run the probe for each port cl_portpingprobe_port_probes number of
times.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** cl_portpingprobe-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_safestrafe - addition - ezquake:cvar:cl_safestrafe

**Summary:** New cvar `cl_safestrafe` first observed at 3.6.8.

**Evidence:**
- commit: 8d60ba3e8f810b8967ecf22945189354a7395a8a
- entity_ref: ezquake:cvar:cl_safestrafe
- to_value: `CL_SAFESTRAFE: can enable safestrafe mode in the client

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_window_caption_delimiter - addition - ezquake:cvar:cl_window_caption_delimiter

**Summary:** New cvar `cl_window_caption_delimiter` first observed at 3.6.8.

**Evidence:**
- commit: 0bd4692215eeb82cb52e49f00e52174fd41e6dd2
- entity_ref: ezquake:cvar:cl_window_caption_delimiter
- to_value: `Add cl_window_caption 3
The new window caption shows:

- When connected: <connected players>/<max players> | <map>
- ...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:con_margin_left - addition - ezquake:cvar:con_margin_left

**Summary:** New cvar `con_margin_left` first observed at 3.6.8.

**Evidence:**
- commit: b893b6d5e29e6ed368c5001e8d9d565f03228e41
- entity_ref: ezquake:cvar:con_margin_left
- to_value: `Add con_margin_left (#1074)
If set, messages are padded by the number of spaces defined in the
variable.

Co-authored...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo1_text_color_low - addition - ezquake:cvar:hud_ammo1_text_color_low

**Summary:** New cvar `hud_ammo1_text_color_low` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo1_text_color_low
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo1_text_color_normal - addition - ezquake:cvar:hud_ammo1_text_color_normal

**Summary:** New cvar `hud_ammo1_text_color_normal` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo1_text_color_normal
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo2_text_color_low - addition - ezquake:cvar:hud_ammo2_text_color_low

**Summary:** New cvar `hud_ammo2_text_color_low` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo2_text_color_low
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo2_text_color_normal - addition - ezquake:cvar:hud_ammo2_text_color_normal

**Summary:** New cvar `hud_ammo2_text_color_normal` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo2_text_color_normal
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo3_text_color_low - addition - ezquake:cvar:hud_ammo3_text_color_low

**Summary:** New cvar `hud_ammo3_text_color_low` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo3_text_color_low
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo3_text_color_normal - addition - ezquake:cvar:hud_ammo3_text_color_normal

**Summary:** New cvar `hud_ammo3_text_color_normal` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo3_text_color_normal
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo4_text_color_low - addition - ezquake:cvar:hud_ammo4_text_color_low

**Summary:** New cvar `hud_ammo4_text_color_low` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo4_text_color_low
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo4_text_color_normal - addition - ezquake:cvar:hud_ammo4_text_color_normal

**Summary:** New cvar `hud_ammo4_text_color_normal` first observed at 3.6.8.

**Evidence:**
- commit: 5a926632145748bd850388080d9a96b298d83462
- entity_ref: ezquake:cvar:hud_ammo4_text_color_normal
- to_value: `MINOR: Move ammo-related HUD code to hud_ammo.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-5a926632
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo_text_color_low - addition - ezquake:cvar:hud_ammo_text_color_low

**Summary:** New cvar `hud_ammo_text_color_low` first observed at 3.6.8.

**Evidence:**
- commit: 0007d03f4de044a2700f29458215f3f886a45914
- entity_ref: ezquake:cvar:hud_ammo_text_color_low
- to_value: `HUD: Allow ammo elements to remain when axe selected
They just print empty space but other hud elements
  can still b...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_ammo_text_color-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_ammo_text_color_normal - addition - ezquake:cvar:hud_ammo_text_color_normal

**Summary:** New cvar `hud_ammo_text_color_normal` first observed at 3.6.8.

**Evidence:**
- commit: 0007d03f4de044a2700f29458215f3f886a45914
- entity_ref: ezquake:cvar:hud_ammo_text_color_normal
- to_value: `HUD: Allow ammo elements to remain when axe selected
They just print empty space but other hud elements
  can still b...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** hud_ammo_text_color-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_align_x - addition - ezquake:cvar:hud_scoremapname_align_x

**Summary:** New cvar `hud_scoremapname_align_x` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_align_x
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_align_y - addition - ezquake:cvar:hud_scoremapname_align_y

**Summary:** New cvar `hud_scoremapname_align_y` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_align_y
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_draw - addition - ezquake:cvar:hud_scoremapname_draw

**Summary:** New cvar `hud_scoremapname_draw` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_draw
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_frame - addition - ezquake:cvar:hud_scoremapname_frame

**Summary:** New cvar `hud_scoremapname_frame` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_frame
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_frame_color - addition - ezquake:cvar:hud_scoremapname_frame_color

**Summary:** New cvar `hud_scoremapname_frame_color` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_frame_color
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_item_opacity - addition - ezquake:cvar:hud_scoremapname_item_opacity

**Summary:** New cvar `hud_scoremapname_item_opacity` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_item_opacity
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_order - addition - ezquake:cvar:hud_scoremapname_order

**Summary:** New cvar `hud_scoremapname_order` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_order
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_place - addition - ezquake:cvar:hud_scoremapname_place

**Summary:** New cvar `hud_scoremapname_place` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_place
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_pos_x - addition - ezquake:cvar:hud_scoremapname_pos_x

**Summary:** New cvar `hud_scoremapname_pos_x` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_pos_x
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_pos_y - addition - ezquake:cvar:hud_scoremapname_pos_y

**Summary:** New cvar `hud_scoremapname_pos_y` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_pos_y
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_proportional - addition - ezquake:cvar:hud_scoremapname_proportional

**Summary:** New cvar `hud_scoremapname_proportional` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_proportional
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_scale - addition - ezquake:cvar:hud_scoremapname_scale

**Summary:** New cvar `hud_scoremapname_scale` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_scale
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_show - addition - ezquake:cvar:hud_scoremapname_show

**Summary:** New cvar `hud_scoremapname_show` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_show
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_scoremapname_style - addition - ezquake:cvar:hud_scoremapname_style

**Summary:** New cvar `hud_scoremapname_style` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:hud_scoremapname_style
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:ignore_no_weapon - addition - ezquake:cvar:ignore_no_weapon

**Summary:** New cvar `ignore_no_weapon` first observed at 3.6.8.

**Evidence:**
- commit: d5a59a6bb8ec143c4e35a85c8af6eefa800f98b5
- entity_ref: ezquake:cvar:ignore_no_weapon
- to_value: `Add ignore_{no_weapon,not_enough_ammo}
Setting ignore_no_weapon to 1 will suppress the "no weapon" message
emitted by...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-d5a59a6b
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:ignore_not_enough_ammo - addition - ezquake:cvar:ignore_not_enough_ammo

**Summary:** New cvar `ignore_not_enough_ammo` first observed at 3.6.8.

**Evidence:**
- commit: d5a59a6bb8ec143c4e35a85c8af6eefa800f98b5
- entity_ref: ezquake:cvar:ignore_not_enough_ammo
- to_value: `Add ignore_{no_weapon,not_enough_ammo}
Setting ignore_no_weapon to 1 will suppress the "no weapon" message
emitted by...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-d5a59a6b
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:qtv_event_msglevel - addition - ezquake:cvar:qtv_event_msglevel

**Summary:** New cvar `qtv_event_msglevel` first observed at 3.6.8.

**Evidence:**
- commit: 3c7fb2aba50bedd89387751b16694c22dcbdca72
- entity_ref: ezquake:cvar:qtv_event_msglevel
- to_value: `Add support for displaying QTV users in the scoreboard
By setting scr_scoreboard_showqtvusers to 1, you can display t...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_drawviewmodel_invisible - addition - ezquake:cvar:r_drawviewmodel_invisible

**Summary:** New cvar `r_drawviewmodel_invisible` first observed at 3.6.8.

**Evidence:**
- commit: efac0cc8f0ebc5eebdf112af068824761bf4fdad
- entity_ref: ezquake:cvar:r_drawviewmodel_invisible
- to_value: `Add r_drawviewmodel_invisible
This variable controls whether or not to draw the weapon when invisible.
It needs to be...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_qtv_name - addition - ezquake:cvar:scr_scoreboard_qtv_name

**Summary:** New cvar `scr_scoreboard_qtv_name` first observed at 3.6.8.

**Evidence:**
- commit: 3c7fb2aba50bedd89387751b16694c22dcbdca72
- entity_ref: ezquake:cvar:scr_scoreboard_qtv_name
- to_value: `Add support for displaying QTV users in the scoreboard
By setting scr_scoreboard_showqtvusers to 1, you can display t...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_showmapname - addition - ezquake:cvar:scr_scoreboard_showmapname

**Summary:** New cvar `scr_scoreboard_showmapname` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:cvar:scr_scoreboard_showmapname
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_showqtvusers - addition - ezquake:cvar:scr_scoreboard_showqtvusers

**Summary:** New cvar `scr_scoreboard_showqtvusers` first observed at 3.6.8.

**Evidence:**
- commit: 3c7fb2aba50bedd89387751b16694c22dcbdca72
- entity_ref: ezquake:cvar:scr_scoreboard_showqtvusers
- to_value: `Add support for displaying QTV users in the scoreboard
By setting scr_scoreboard_showqtvusers to 1, you can display t...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:hud_element:scoremapname - addition - ezquake:hud_element:scoremapname

**Summary:** New hud_element `scoremapname` first observed at 3.6.8.

**Evidence:**
- commit: 652abacb5b30cfd28d1f7dadaf9f11646f290108
- entity_ref: ezquake:hud_element:scoremapname
- to_value: `Add scr_scoreboard_showmapname and hud_scoremapname variables
The new options allow you to display the current map na...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-652abacb
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_play - semantic-crossing - ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_play changed.

**Evidence:**
- commit: adcf86d27defec6e93fe9bc70f2bb4bf26bac46f
- entity_ref: ezquake:ruleset:qcon
- from_value: `0`
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-adcf86d2
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_play - semantic-crossing - ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_play changed.

**Evidence:**
- commit: adcf86d27defec6e93fe9bc70f2bb4bf26bac46f
- entity_ref: ezquake:ruleset:smackdown
- from_value: `0`
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-adcf86d2
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdrive:restrict_play - semantic-crossing - ezquake:ruleset:smackdrive

**Summary:** ruleset `smackdrive`: restrict_play changed.

**Evidence:**
- commit: adcf86d27defec6e93fe9bc70f2bb4bf26bac46f
- entity_ref: ezquake:ruleset:smackdrive
- from_value: `0`
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-adcf86d2
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_play - semantic-crossing - ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_play changed.

**Evidence:**
- commit: adcf86d27defec6e93fe9bc70f2bb4bf26bac46f
- entity_ref: ezquake:ruleset:thunderdome
- from_value: `0`
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-adcf86d2
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:89 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SECURITY: protect against server/proxy injection of malicious triggers (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:90 - source-invisible - (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Allow exec and IPC from localhost (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
