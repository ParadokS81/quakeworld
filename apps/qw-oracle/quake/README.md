# quake/ — reserved data for Track-A headless ezquake dumps

Minimal Quake install used to run ezquake headless and capture the runtime
cvar/command dump — the source for level-3 "dump-confirmed" `track_a_reachability`.

**Contents are gitignored — populate locally, never commit:**

```
quake/
  id1/
    pak0.pak     # shareware base data (palette/conchars/gfx) — needed to boot to a console
    pak1.pak     # registered/commercial id Software data — NOT redistributable
  <ezquake-linux> # a Linux client binary matching the commit being dumped
```

Operator's source copy: `/mnt/c/Games/QuakeWorld/QuakeWorld/` (reachable from WSL).
`id1/pak0.pak` + `id1/pak1.pak` are staged here already.

**Design + automation plan:**
`docs/superpowers/parking/2026-06-05-qw-oracle-head-pipeline-automation.md`
