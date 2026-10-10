# quake/ — local QuakeWorld engines for testing (gitignored data)

Shared minimal Quake install for running real QW engines locally. Two uses:

1. **Headless ezquake dumps (Track-A)** — run ezquake headless and capture the
   runtime cvar/command dump; the source for level-3 "dump-confirmed"
   `track_a_reachability`.
2. **Local mvdsv + KTX server** — run a real game server to test/experiment with
   mvdsv builds (demo recording, protocol, new versions). Added 2026-06-06 while
   verifying the `0x000A` paused-duration framing fix (QW-Group/mvdsv PR #210).

**Contents are gitignored — populate locally, never commit** (only `README.md`,
`.gitignore`, and `run-server.sh` are tracked):

```
quake/
  id1/             # pak0.pak (shareware) + pak1.pak (registered/commercial — NOT redistributable)
  qw/maps/         # extra .bsp maps (dm6 etc. resolve from id1/pak1)
  ezquake/         # a Linux client binary for headless dumps
  ktx/             # KTX gamedir: nQuake sv-configs/ktx + qwprogs.so (+ local pwd.cfg/server.cfg tweaks)
  mvdsv            # a local mvdsv server build (swap this to test a version)
  run-server.sh    # launcher (tracked)
```

The pak files come from the operator's own Quake install; nothing is staged on the cockpit as of 2026-10-10 (`quake/` holds only the tracked files).

## Run the mvdsv + KTX server

```
./run-server.sh [map] [/path/to/mvdsv]      # defaults: dm6, and ./mvdsv
```

Then connect a client to this box on port 27500 -- from the operator's desktop that is
the Tailscale address `100.114.81.91:27500`, which needs the port published in the
cockpit's compose first (an ops letter; the user-global `CLAUDE.md` names the rule). In-game: `botcmd enable; addbot; ready` for a bot match
(KTX auto-records to `ktx/demos/`), or just `pause` (matchless pause is enabled).
rcon password is `test123` — the local config sets `sv_crypt_rcon 0` and raises
`sv_rconlim` so scripted rcon works (`Rcon_Validate` consumes the bandwidth limit
twice per command).

Rebuild sources: KTX configs `research/repos/nquake-distfiles/sv-configs/ktx`;
KTX progs `research/repos/nquake-distfiles/sv-bin-x64/ktx/qwprogs.so`; mvdsv from
the `mvdsv-pr-work` clone (`build-native/mvdsv`).

**Design + automation plan (ezquake dumps):**
`docs/superpowers/parking/2026-06-05-qw-oracle-head-pipeline-automation.md`
