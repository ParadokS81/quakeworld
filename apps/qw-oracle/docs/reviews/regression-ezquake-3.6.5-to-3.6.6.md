---
project: ezquake
from_version: 3.6.5
to_version: 3.6.6
generated_at: 2026-04-23T22:34:18.068Z
reviewer: (skill fills)
status: draft
---

# Extraction review: ezquake 3.6.5 -> 3.6.6

## Summary

- Additions: 24 (24 pending)
- Retirements: 0 (0 pending)
- Semantic crossings: 15 (15 pending)
- Unclassified promotions: 0 (0 pending)
- Source-invisible changes: 26 (26 pending)
- **Total:** 65

## Clusters

### cluster:commit-2dbb3f1d (confidence: strong)
Signals: commit-window:9, commit:2dbb3f1d, prefix:smackdown, prefix:thunderdome
Members (15):
- semantic-crossing:ezquake:ruleset:qcon:restrict_exec
- semantic-crossing:ezquake:ruleset:qcon:restrict_ipc
- semantic-crossing:ezquake:ruleset:qcon:restrict_setcalc
- semantic-crossing:ezquake:ruleset:qcon:restrict_seteval
- semantic-crossing:ezquake:ruleset:qcon:restrict_setex
- semantic-crossing:ezquake:ruleset:smackdown:restrict_exec
- semantic-crossing:ezquake:ruleset:smackdown:restrict_ipc
- semantic-crossing:ezquake:ruleset:smackdown:restrict_setcalc
- semantic-crossing:ezquake:ruleset:smackdown:restrict_seteval
- semantic-crossing:ezquake:ruleset:smackdown:restrict_setex
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_exec
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_ipc
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_setcalc
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_seteval
- semantic-crossing:ezquake:ruleset:thunderdome:restrict_setex

### cluster:commit-2c7fd802 (confidence: strong)
Signals: commit-window:1, commit:2c7fd802
Members (8):
- addition:ezquake:cvar:hud_gun_frame_hide
- addition:ezquake:cvar:hud_gun2_frame_hide
- addition:ezquake:cvar:hud_gun3_frame_hide
- addition:ezquake:cvar:hud_gun4_frame_hide
- addition:ezquake:cvar:hud_gun5_frame_hide
- addition:ezquake:cvar:hud_gun6_frame_hide
- addition:ezquake:cvar:hud_gun7_frame_hide
- addition:ezquake:cvar:hud_gun8_frame_hide

### cluster:skywind-family (confidence: strong)
Signals: commit-window:5, commit:d7e91ef3, pr:978, prefix:skywind
Members (6):
- addition:ezquake:command:skywind
- addition:ezquake:command:skywind_load
- addition:ezquake:command:skywind_lookdir
- addition:ezquake:command:skywind_rotate
- addition:ezquake:command:skywind_save
- addition:ezquake:cvar:r_skywind

### cluster:commit-41852d49 (confidence: strong)
Signals: commit-window:6, commit:41852d49, commit:b276b1d0, commit:c04f608d, prefix:cl_allow
Members (3):
- addition:ezquake:cvar:cl_allow_downloads
- addition:ezquake:cvar:cl_allow_uploads
- addition:ezquake:cvar:cl_remote_capabilities

### cluster:scr_scoreboard-family (confidence: strong)
Signals: commit-window:7, commit-window:8, commit:1243feb4, commit:73742101, commit:e5684e4b, prefix:scr_scoreboard
Members (3):
- addition:ezquake:cvar:scr_scoreboard_classic
- addition:ezquake:cvar:scr_scoreboard_highlightself
- addition:ezquake:cvar:scr_scoreboard_showclock

### cluster:commit-e5bc1600 (confidence: strong)
Signals: commit-window:4, commit:e5bc1600, commit:f670f949
Members (2):
- addition:ezquake:cvar:cl_pext_colourmod
- addition:ezquake:cvar:pext_ezquake_verfortrans

## Findings

### addition:ezquake:command:skywind · addition · ezquake:command:skywind

**Summary:** New command `skywind` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:command:skywind
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:skywind_load · addition · ezquake:command:skywind_load

**Summary:** New command `skywind_load` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:command:skywind_load
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:skywind_lookdir · addition · ezquake:command:skywind_lookdir

**Summary:** New command `skywind_lookdir` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:command:skywind_lookdir
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:skywind_rotate · addition · ezquake:command:skywind_rotate

**Summary:** New command `skywind_rotate` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:command:skywind_rotate
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:command:skywind_save · addition · ezquake:command:skywind_save

**Summary:** New command `skywind_save` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:command:skywind_save
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_allow_downloads · addition · ezquake:cvar:cl_allow_downloads

**Summary:** New cvar `cl_allow_downloads` first observed at 3.6.6.

**Evidence:**
- commit: 41852d4945f97271957a9c4660f9e12bebeab46b
- entity_ref: ezquake:cvar:cl_allow_downloads
- to_value: `Add cl_allow_downloads
This variable controls which file extensions a client/server can
download/upload from/to the s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-41852d49
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_allow_uploads · addition · ezquake:cvar:cl_allow_uploads

**Summary:** New cvar `cl_allow_uploads` first observed at 3.6.6.

**Evidence:**
- commit: c04f608def8782e6943a6bc31b67770c43924cd3
- entity_ref: ezquake:cvar:cl_allow_uploads
- to_value: `Add cl_allow_uploads
With cl_allow_uploads, you can toggle whether the server is allowed to
upload files from your qu...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-41852d49
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_pext_colourmod · addition · ezquake:cvar:cl_pext_colourmod

**Summary:** New cvar `cl_pext_colourmod` first observed at 3.6.6.

**Evidence:**
- commit: e5bc1600586b5a761e3144584c1ce2aec0ea781c
- entity_ref: ezquake:cvar:cl_pext_colourmod
- to_value: `CLIENT: Support FTE_PEXT_COLOURMOD.
If server sends colourmod data, aliasmodels are forced to
apply this color blendi...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-e5bc1600
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_remote_capabilities · addition · ezquake:cvar:cl_remote_capabilities

**Summary:** New cvar `cl_remote_capabilities` first observed at 3.6.6.

**Evidence:**
- commit: b276b1d029157ae286d7ce2413306f8bd8d923f8
- entity_ref: ezquake:cvar:cl_remote_capabilities
- to_value: `Add cl_remote_capabilities
The cl_remote_capabilities setting controls which commands and variables
the server is all...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-41852d49
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun2_frame_hide · addition · ezquake:cvar:hud_gun2_frame_hide

**Summary:** New cvar `hud_gun2_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun2_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun3_frame_hide · addition · ezquake:cvar:hud_gun3_frame_hide

**Summary:** New cvar `hud_gun3_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun3_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun4_frame_hide · addition · ezquake:cvar:hud_gun4_frame_hide

**Summary:** New cvar `hud_gun4_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun4_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun5_frame_hide · addition · ezquake:cvar:hud_gun5_frame_hide

**Summary:** New cvar `hud_gun5_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun5_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun6_frame_hide · addition · ezquake:cvar:hud_gun6_frame_hide

**Summary:** New cvar `hud_gun6_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun6_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun7_frame_hide · addition · ezquake:cvar:hud_gun7_frame_hide

**Summary:** New cvar `hud_gun7_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun7_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun8_frame_hide · addition · ezquake:cvar:hud_gun8_frame_hide

**Summary:** New cvar `hud_gun8_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun8_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:hud_gun_frame_hide · addition · ezquake:cvar:hud_gun_frame_hide

**Summary:** New cvar `hud_gun_frame_hide` first observed at 3.6.6.

**Evidence:**
- commit: 2c7fd80237947cbe4b9bfcece369f6602ae9d654
- entity_ref: ezquake:cvar:hud_gun_frame_hide
- to_value: `FONTS: Add proportional font support to 'gun' hud elements
Also move to hud_guns.c

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2c7fd802
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:pext_ezquake_verfortrans · addition · ezquake:cvar:pext_ezquake_verfortrans

**Summary:** New cvar `pext_ezquake_verfortrans` first observed at 3.6.6.

**Evidence:**
- commit: f670f949f7b3e53bb965b2fc3e8372ed3febf932
- entity_ref: ezquake:cvar:pext_ezquake_verfortrans
- to_value: `SERVER: Disable FTE_PEXT_TRANS if client is outdated.
As outdated clients have a broken implementation of FTE_PEXT_TR...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-e5bc1600
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:r_skywind · addition · ezquake:cvar:r_skywind

**Summary:** New cvar `r_skywind` first observed at 3.6.6.

**Evidence:**
- commit: d7e91ef3a4f7d396bc5001d9be6f8bc34aabb971
- entity_ref: ezquake:cvar:r_skywind
- to_value: `RENDERER: Add support for skywind.
Feature available in the SP community. Ported mostly verbatim from
the IronWail en...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** skywind-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_classic · addition · ezquake:cvar:scr_scoreboard_classic

**Summary:** New cvar `scr_scoreboard_classic` first observed at 3.6.6.

**Evidence:**
- commit: 1243feb44dffa6dc3bf7512695ff85f682d89836
- entity_ref: ezquake:cvar:scr_scoreboard_classic
- to_value: `Add scr_scoreboard_classic
By setting scr_scoreboard_classic to 1 you'll adapt the scoreboard shown
by +showscores an...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** scr_scoreboard-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_highlightself · addition · ezquake:cvar:scr_scoreboard_highlightself

**Summary:** New cvar `scr_scoreboard_highlightself` first observed at 3.6.6.

**Evidence:**
- commit: 7374210107ac528511544c1512a76cfc5d386a4e
- entity_ref: ezquake:cvar:scr_scoreboard_highlightself
- to_value: `Add scr_scoreboard_highlightself
Toggle the highlighting of your own scores in the scoreboard.

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** scr_scoreboard-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:scr_scoreboard_showclock · addition · ezquake:cvar:scr_scoreboard_showclock

**Summary:** New cvar `scr_scoreboard_showclock` first observed at 3.6.6.

**Evidence:**
- commit: e5684e4b9af5adba3c33ea6b2faafdb5d8a5d8c3
- entity_ref: ezquake:cvar:scr_scoreboard_showclock
- to_value: `Add scr_scoreboard_showclock
Allow toggling the visibility of the clock at the bottom of the screen
when using +shows...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** scr_scoreboard-family
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:vid_framebuffer_fxaa · addition · ezquake:cvar:vid_framebuffer_fxaa

**Summary:** New cvar `vid_framebuffer_fxaa` first observed at 3.6.6.

**Evidence:**
- commit: eb825c3b30f15ea891ba3ec516fa04c1ef6fbe74
- entity_ref: ezquake:cvar:vid_framebuffer_fxaa
- to_value: `RENDERER: Add FXAA option.
Default disabled, ideally used with vid_framebuffer 2 to
avoid adding AA to HUD.

NVIDIA F...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:ruleset:smackdrive · addition · ezquake:ruleset:smackdrive

**Summary:** New ruleset `smackdrive` first observed at 3.6.6.

**Evidence:**
- commit: 22b5b6c202dd44f5a031d0acff45690a6b8051e8
- entity_ref: ezquake:ruleset:smackdrive
- to_value: `Add ruleset smackdrive

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_exec · semantic-crossing · ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_exec changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:qcon
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_ipc · semantic-crossing · ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_ipc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:qcon
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_setcalc · semantic-crossing · ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_setcalc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:qcon
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_seteval · semantic-crossing · ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_seteval changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:qcon
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:qcon:restrict_setex · semantic-crossing · ezquake:ruleset:qcon

**Summary:** ruleset `qcon`: restrict_setex changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:qcon
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_exec · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_exec changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:smackdown
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_ipc · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_ipc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:smackdown
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_setcalc · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_setcalc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:smackdown
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_seteval · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_seteval changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:smackdown
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:restrict_setex · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: restrict_setex changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:smackdown
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_exec · semantic-crossing · ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_exec changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:thunderdome
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_ipc · semantic-crossing · ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_ipc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:thunderdome
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_setcalc · semantic-crossing · ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_setcalc changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:thunderdome
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_seteval · semantic-crossing · ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_seteval changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:thunderdome
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:thunderdome:restrict_setex · semantic-crossing · ezquake:ruleset:thunderdome

**Summary:** ruleset `thunderdome`: restrict_setex changed.

**Evidence:**
- commit: 2dbb3f1d8d3c68e3fe984bd55684919d3263324e
- entity_ref: ezquake:ruleset:thunderdome
- from_value: ""
- to_value: `1`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-2dbb3f1d
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:77 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  PROTOCOL: Make FTE_PEXT_TRANS from 2013 actually work, originally half implemented. (@dsvensson).
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Entity-name keyword overlap: token "fte_pext_trans" in release-note body matched cluster member `cl_pext_colourmod`.

### source-invisible:release_notes:78 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SERVER: Fix loading of QVM on macOS. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:79 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SECURITY: Only pass server defined aliases through cbuf_svc (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Shared "SECURITY:" theme with 2 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:80 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  CONSOLE: Fix buffer overflow (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:81 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  FOV: fix rare CalcFov+viewsize glitches (@hemostx)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:82 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  RENDERER: Powerup shells weren't rendered with fog enabled. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Shared "RENDERER:" theme with 1 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:83 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  RENDERER: Lightmaps for aliasmodels were broken when using high-res lightmaps (DECOUPLED_LM). (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Shared "RENDERER:" theme with 1 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:84 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  RENDERER: Lightmaps for classic renderer were cleared each frame when using modern renderer, expensive. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-2c7fd802 — Entity-name keyword overlap: token "frame" in release-note body matched cluster member `hud_gun_frame_hide`.

### source-invisible:release_notes:85 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  PROTOCOL: PEXT_MODELDBL was only half-implemented, didn't read short if U_MODEL was unset and U_FTE_MODELDBL set. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Entity-name keyword overlap: token "pext_modeldbl" in release-note body matched cluster member `cl_pext_colourmod`.

### source-invisible:release_notes:86 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `build` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  CI: Switch Windows builds to msvc to avoid gpl_maps.pk3 bug. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Shared "CI:" theme with 1 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:75 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `changes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Remove seconds from the $dateiso macro (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:53 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  RENDERER: Connect PEXT_TRANS (entity field `alpha`) to transparency of aliasmodels and brush models.
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Entity-name keyword overlap: token "pext_trans" in release-note body matched cluster member `cl_pext_colourmod`.

### source-invisible:release_notes:56 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  PROTOCOL: Support FTE_PEXT_COLOURMOD, for example colored spawn markers. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Entity-name keyword overlap: token "fte_pext_colourmod" in release-note body matched cluster member `cl_pext_colourmod`.

### source-invisible:release_notes:57 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Support up to 65535 screenshots.
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:58 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  RENDERER: Add FXAA option (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-e5bc1600 — Shared "RENDERER:" theme with 1 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:59 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  BUILD: Support Devuan linux distribution in build-linux.sh script
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:60 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  BUG: Do not crash when no opengl driver/library can successfully create an opengl context
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:61 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  CI: Unify GitHub Actions into single workflow, upload macOS releases and snapshots. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Entity-name keyword overlap: token "upload" in release-note body matched cluster member `cl_allow_uploads`.

### source-invisible:release_notes:64 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SECURITY: Prevent command concatenation in the qw url parser (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Shared "SECURITY:" theme with 2 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.

### source-invisible:release_notes:65 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SECURITY: Add remote capabilities validation (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Entity-name keyword overlap: tokens ["capabilities", "remote"] in release-note body matched cluster member `cl_remote_capabilities`.

### source-invisible:release_notes:66 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SECURITY: Prevent downloadable files from being executed (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Entity-name keyword overlap: token "downloadable" in release-note body matched cluster member `cl_allow_downloads`.

### source-invisible:release_notes:69 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  HUD: Resurrect the turtle (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:70 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  HASH: Fix incorrect node removal in Hash_Remove and Hash_RemoveKey (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:71 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  LIGHTMAPS: The semi-new e5bgr9 lightmap format was added to ericw-tools early 2024, existed in FTE for years, now loads, initially as LDR. (@dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** commit-41852d49 — Entity-name keyword overlap: token "loads" in release-note body matched cluster member `cl_allow_downloads`.

### source-invisible:release_notes:72 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  UI: Add scoreboard settings (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** scr_scoreboard-family — Entity-name keyword overlap: token "scoreboard" in release-note body matched cluster member `scr_scoreboard_classic`.

### source-invisible:release_notes:73 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  UI: Add more userinfo (@osm)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
**Proposed cluster:** scr_scoreboard-family — Shared "UI:" theme with 1 Q5 finding(s) already matched to this cluster in the direct pass; no entity-name overlap, proposing via theme extension.
