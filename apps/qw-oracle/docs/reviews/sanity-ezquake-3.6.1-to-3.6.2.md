---
project: ezquake
from_version: 3.6.1
to_version: 3.6.2
generated_at: 2026-04-23T22:35:48.362Z
reviewer: (skill fills)
status: draft
---

# Extraction review: ezquake 3.6.1 -> 3.6.2

## Summary

- Additions: 57 (57 pending)
- Retirements: 3 (3 pending)
- Semantic crossings: 2 (2 pending)
- Unclassified promotions: 0 (0 pending)
- Source-invisible changes: 9 (9 pending)
- **Total:** 71

## Clusters

### cluster:commit-17ed82c0 (confidence: strong)
Signals: commit-window:6, commit:17ed82c0, pr:567
Members (55):
- addition:ezquake:cvar:joyadvanced
- addition:ezquake:cvar:joyadvaxisr
- addition:ezquake:cvar:joyadvaxisu
- addition:ezquake:cvar:joyadvaxisv
- addition:ezquake:cvar:joyadvaxisx
- addition:ezquake:cvar:joyadvaxisy
- addition:ezquake:cvar:joyadvaxisz
- addition:ezquake:cvar:joyflysensitivity
- addition:ezquake:cvar:joyflythreshold
- addition:ezquake:cvar:joyforwardsensitivity
- addition:ezquake:cvar:joyforwardthreshold
- addition:ezquake:cvar:joyindex
- addition:ezquake:cvar:joyname
- addition:ezquake:cvar:joypitchsensitivity
- addition:ezquake:cvar:joypitchthreshold
- addition:ezquake:cvar:joysidesensitivity
- addition:ezquake:cvar:joysidethreshold
- addition:ezquake:cvar:joyyawsensitivity
- addition:ezquake:cvar:joyyawthreshold
- addition:ezquake:keyname:aux1
- addition:ezquake:keyname:aux10
- addition:ezquake:keyname:aux11
- addition:ezquake:keyname:aux12
- addition:ezquake:keyname:aux13
- addition:ezquake:keyname:aux14
- addition:ezquake:keyname:aux15
- addition:ezquake:keyname:aux16
- addition:ezquake:keyname:aux17
- addition:ezquake:keyname:aux18
- addition:ezquake:keyname:aux19
- addition:ezquake:keyname:aux2
- addition:ezquake:keyname:aux20
- addition:ezquake:keyname:aux21
- addition:ezquake:keyname:aux22
- addition:ezquake:keyname:aux23
- addition:ezquake:keyname:aux24
- addition:ezquake:keyname:aux25
- addition:ezquake:keyname:aux26
- addition:ezquake:keyname:aux27
- addition:ezquake:keyname:aux28
- addition:ezquake:keyname:aux3
- addition:ezquake:keyname:aux4
- addition:ezquake:keyname:aux5
- addition:ezquake:keyname:aux6
- addition:ezquake:keyname:aux7
- addition:ezquake:keyname:aux8
- addition:ezquake:keyname:aux9
- addition:ezquake:keyname:joy1
- addition:ezquake:keyname:joy2
- addition:ezquake:keyname:joy3
- addition:ezquake:keyname:joy4
- addition:ezquake:keyname:joypovdn
- addition:ezquake:keyname:joypovlt
- addition:ezquake:keyname:joypovrt
- addition:ezquake:keyname:joypovup

## Findings

### addition:ezquake:command:find_and_follow · addition · ezquake:command:find_and_follow

**Summary:** New command `find_and_follow` first observed at 3.6.2.

**Evidence:**
- commit: 10f247427ad6b21884c4f4e471e02b1688656531
- entity_ref: ezquake:command:find_and_follow
- to_value: `Fixing Issue #704

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:cl_maxfps_menu · addition · ezquake:cvar:cl_maxfps_menu

**Summary:** New cvar `cl_maxfps_menu` first observed at 3.6.2.

**Evidence:**
- commit: fc6b4df968ca97b43a35315f868bb33ae33e1ac2
- entity_ref: ezquake:cvar:cl_maxfps_menu
- to_value: `Add cl_maxfps_menu
update help

Add changes from ciscon,

get refresh rate in windowed mode

fix windowed fps, fix wh...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvanced · addition · ezquake:cvar:joyadvanced

**Summary:** New cvar `joyadvanced` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvanced
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisr · addition · ezquake:cvar:joyadvaxisr

**Summary:** New cvar `joyadvaxisr` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisr
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisu · addition · ezquake:cvar:joyadvaxisu

**Summary:** New cvar `joyadvaxisu` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisu
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisv · addition · ezquake:cvar:joyadvaxisv

**Summary:** New cvar `joyadvaxisv` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisv
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisx · addition · ezquake:cvar:joyadvaxisx

**Summary:** New cvar `joyadvaxisx` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisx
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisy · addition · ezquake:cvar:joyadvaxisy

**Summary:** New cvar `joyadvaxisy` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisy
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyadvaxisz · addition · ezquake:cvar:joyadvaxisz

**Summary:** New cvar `joyadvaxisz` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyadvaxisz
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyflysensitivity · addition · ezquake:cvar:joyflysensitivity

**Summary:** New cvar `joyflysensitivity` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyflysensitivity
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyflythreshold · addition · ezquake:cvar:joyflythreshold

**Summary:** New cvar `joyflythreshold` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyflythreshold
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyforwardsensitivity · addition · ezquake:cvar:joyforwardsensitivity

**Summary:** New cvar `joyforwardsensitivity` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyforwardsensitivity
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyforwardthreshold · addition · ezquake:cvar:joyforwardthreshold

**Summary:** New cvar `joyforwardthreshold` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyforwardthreshold
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyindex · addition · ezquake:cvar:joyindex

**Summary:** New cvar `joyindex` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyindex
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyname · addition · ezquake:cvar:joyname

**Summary:** New cvar `joyname` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyname
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joypitchsensitivity · addition · ezquake:cvar:joypitchsensitivity

**Summary:** New cvar `joypitchsensitivity` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joypitchsensitivity
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joypitchthreshold · addition · ezquake:cvar:joypitchthreshold

**Summary:** New cvar `joypitchthreshold` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joypitchthreshold
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joysidesensitivity · addition · ezquake:cvar:joysidesensitivity

**Summary:** New cvar `joysidesensitivity` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joysidesensitivity
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joysidethreshold · addition · ezquake:cvar:joysidethreshold

**Summary:** New cvar `joysidethreshold` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joysidethreshold
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyyawsensitivity · addition · ezquake:cvar:joyyawsensitivity

**Summary:** New cvar `joyyawsensitivity` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyyawsensitivity
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:cvar:joyyawthreshold · addition · ezquake:cvar:joyyawthreshold

**Summary:** New cvar `joyyawthreshold` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:cvar:joyyawthreshold
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux1 · addition · ezquake:keyname:aux1

**Summary:** New keyname `aux1` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux1
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux10 · addition · ezquake:keyname:aux10

**Summary:** New keyname `aux10` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux10
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux11 · addition · ezquake:keyname:aux11

**Summary:** New keyname `aux11` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux11
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux12 · addition · ezquake:keyname:aux12

**Summary:** New keyname `aux12` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux12
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux13 · addition · ezquake:keyname:aux13

**Summary:** New keyname `aux13` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux13
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux14 · addition · ezquake:keyname:aux14

**Summary:** New keyname `aux14` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux14
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux15 · addition · ezquake:keyname:aux15

**Summary:** New keyname `aux15` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux15
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux16 · addition · ezquake:keyname:aux16

**Summary:** New keyname `aux16` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux16
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux17 · addition · ezquake:keyname:aux17

**Summary:** New keyname `aux17` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux17
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux18 · addition · ezquake:keyname:aux18

**Summary:** New keyname `aux18` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux18
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux19 · addition · ezquake:keyname:aux19

**Summary:** New keyname `aux19` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux19
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux2 · addition · ezquake:keyname:aux2

**Summary:** New keyname `aux2` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux2
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux20 · addition · ezquake:keyname:aux20

**Summary:** New keyname `aux20` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux20
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux21 · addition · ezquake:keyname:aux21

**Summary:** New keyname `aux21` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux21
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux22 · addition · ezquake:keyname:aux22

**Summary:** New keyname `aux22` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux22
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux23 · addition · ezquake:keyname:aux23

**Summary:** New keyname `aux23` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux23
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux24 · addition · ezquake:keyname:aux24

**Summary:** New keyname `aux24` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux24
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux25 · addition · ezquake:keyname:aux25

**Summary:** New keyname `aux25` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux25
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux26 · addition · ezquake:keyname:aux26

**Summary:** New keyname `aux26` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux26
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux27 · addition · ezquake:keyname:aux27

**Summary:** New keyname `aux27` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux27
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux28 · addition · ezquake:keyname:aux28

**Summary:** New keyname `aux28` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux28
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux3 · addition · ezquake:keyname:aux3

**Summary:** New keyname `aux3` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux3
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux4 · addition · ezquake:keyname:aux4

**Summary:** New keyname `aux4` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux4
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux5 · addition · ezquake:keyname:aux5

**Summary:** New keyname `aux5` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux5
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux6 · addition · ezquake:keyname:aux6

**Summary:** New keyname `aux6` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux6
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux7 · addition · ezquake:keyname:aux7

**Summary:** New keyname `aux7` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux7
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux8 · addition · ezquake:keyname:aux8

**Summary:** New keyname `aux8` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux8
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:aux9 · addition · ezquake:keyname:aux9

**Summary:** New keyname `aux9` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:aux9
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joy1 · addition · ezquake:keyname:joy1

**Summary:** New keyname `joy1` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joy1
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joy2 · addition · ezquake:keyname:joy2

**Summary:** New keyname `joy2` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joy2
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joy3 · addition · ezquake:keyname:joy3

**Summary:** New keyname `joy3` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joy3
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joy4 · addition · ezquake:keyname:joy4

**Summary:** New keyname `joy4` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joy4
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joypovdn · addition · ezquake:keyname:joypovdn

**Summary:** New keyname `joypovdn` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joypovdn
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joypovlt · addition · ezquake:keyname:joypovlt

**Summary:** New keyname `joypovlt` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joypovlt
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joypovrt · addition · ezquake:keyname:joypovrt

**Summary:** New keyname `joypovrt` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joypovrt
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### addition:ezquake:keyname:joypovup · addition · ezquake:keyname:joypovup

**Summary:** New keyname `joypovup` first observed at 3.6.2.

**Evidence:**
- commit: 17ed82c08c7a1606ece125ec1b1d80f26daefa27
- entity_ref: ezquake:keyname:joypovup
- to_value: `INPUT: Restore joystick support.
Back in 2013, as part of transitioning to SDL to handle all
platform-specific I/O, s...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** commit-17ed82c0
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:command:follow · retirement · ezquake:command:follow

**Summary:** command `follow` present in 3.6.1, gone in 3.6.2.

**Evidence:**
- commit: 5c255dfb5feaae60516155f126b5380a4d70d8e6
- entity_ref: ezquake:command:follow
- from_value: `ADD: 'follow' command to find a player by name and connect to the same server
Works much like the find command, excep...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:flag_bit:fpd_enable_player_count · retirement · ezquake:flag_bit:fpd_enable_player_count

**Summary:** flag_bit `fpd_enable_player_count` present in 3.6.1, gone in 3.6.2.

**Evidence:**
- commit: 097b8761bad5b8bd429eaf216342590f2d33fed2
- entity_ref: ezquake:flag_bit:fpd_enable_player_count
- from_value: `new: re_triggers (same as msg_triggers, but with REGEXPs) debug only: 'string-hud' - you can put any string (like 'he...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### retirement:ezquake:ruleset:smackdrive · retirement · ezquake:ruleset:smackdrive

**Summary:** ruleset `smackdrive` present in 3.6.1, gone in 3.6.2.

**Evidence:**
- commit: 93598e30aa0624c30b3ba8c32d835011a2939a90
- entity_ref: ezquake:ruleset:smackdrive
- from_value: `cl_delay_packet: disable changing during match, announce (say) when changed, announce in f_ruleset reply

`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:cvar:joystick:flag_names · semantic-crossing · ezquake:cvar:joystick

**Summary:** cvar `joystick`: flag_names changed.

**Evidence:**
- commit: cc235d2a987b5e4fa55fcd4c13ee595716c27a14
- entity_ref: ezquake:cvar:joystick
- from_value: ""
- to_value: `["CVAR_SILENT"]`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### semantic-crossing:ezquake:ruleset:smackdown:locked_cvars_json · semantic-crossing · ezquake:ruleset:smackdown

**Summary:** ruleset `smackdown`: locked_cvars_json changed.

**Evidence:**
- commit: 7e70227c33ffda9e34cad201249422d73a2de074
- entity_ref: ezquake:ruleset:smackdown
- from_value: `[{"cvar_ident":"allow_scripts","value":"0"},{"cvar_ident":"cl_iDrive","value":"0"},{"cvar_ident":"cl_hud","value":"0"...`
- to_value: `[{"cvar_ident":"allow_scripts","value":"0"},{"cvar_ident":"cl_iDrive","value":"0"},{"cvar_ident":"cl_hud","value":"0"...`

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** likely-shared
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:27 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Yet again, fix text powerup width calculation (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:29 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `bugfixes` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  SKYBOX: Rotate 90 degrees to align with other engines (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:18 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Add support for lit water (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:20 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  use 64 bit time on 32 bit windows systems (ciscon)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:21 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Don't create lightmaps for unlit turbs (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:22 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Fix alphatest related fog/fence issues (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:23 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Warn on empty textures rather than break (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:24 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Fix fog blending of particles (dsvensson)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_

### source-invisible:release_notes:25 · source-invisible · (no-ref)

**Summary:** Release-note bullet in section `improvements` without entity / commit coverage.

**Evidence:**
- release_note_body:
  ```
  Restore joystick support (ewhac)
  ```

**Proposed disposition:** _(pending)_
**Rationale:** _(pending)_
**Applied:** _(pending)_
**Cluster:** none
**Cross-codebase hint:** unknown
**Upstream cvar reference:** _(pending)_
**Upstream guide candidate:** _(pending)_
