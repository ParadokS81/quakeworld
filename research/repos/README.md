# research/repos/

Third-party repositories cloned locally for reading. Not monorepo code. Not built. Not imported. These repos are here so Claude Code sessions (and human readers) can walk QuakeWorld source, engine history, server code, community installers, and related projects without repeated network round trips.

All clones are shallow unless otherwise noted; refresh by `git -C <dir> fetch --unshallow` if history beyond the tip is needed. Re-clone from the listed remote when a full refresh is wanted; this directory is not tracked in the monorepo's git history.

## Current contents

| Directory | Upstream | Purpose |
|---|---|---|
| `ezquake-source/` | `github.com/QW-Group/ezquake-source` | Primary reference engine. Layer 1 extractors run against this; concept notes cite commits and file:line against it. |
| `ktx/` | `github.com/QW-Group/ktx` | KTX server mod (QWProgs successor). Source for the `rpickup`, `autotrack`, `scores` command family that appear as KTX-only binds in slipgate. |
| `mvdsv/` | `github.com/QW-Group/mvdsv` | The QW server ezQuake clients connect to. Source for the MVD recording format and the server side of the stats.xml / ktxstats pipeline. |
| `fteqw/` | `github.com/fte-team/fteqw` | FTE engine - second client target for future Layer 1 ports (Phase 2d). Reference for the FTE converter feature in slipgate's ConfigViewer. |
| `qwcl-original/` | `github.com/id-Software/Quake` | id Software's original Quake (GPL release). Ancestor of both the single-player engine and the QW client; read for deep heritage questions. |
| `nquake-distfiles/` | `github.com/nQuake/distfiles` | nQuake's shared content repository - the `.pk3` bundles, configs, skins, and paks that the nQuake installers ship. The canonical source for "what files does nQuake actually put on a user's disk." |
| `nquake-client-win32/` | `github.com/nQuake/client-win32` | nQuake Windows installer scripts. Shows how Windows users get the files in `nquake-distfiles` onto their machine. |
| `nquake-client-linux/` | `github.com/nQuake/client-linux` | nQuake Linux installer scripts. Most recently maintained of the client repos (pushed 2025-02-20 at clone time); useful to cross-check what a current install assembles. |
| `dusty-mvdsv/` | `github.com/dusty-qw/mvdsv` | Dusty's MVDSV fork. Local reference for server-side experiments and divergent behaviours not in the upstream. |
| `dusty-ktx/` | `github.com/dusty-qw/ktx` | Dusty's KTX fork. Same role as `dusty-mvdsv` for the server mod side. Includes the QuakeC `qcsrc/` that a future Layer 1 extractor may need. |
| `mvdparser/` | `github.com/vikpe/mvdparser` | Vikpe's MVD parser. Reference for reading `.mvd` demo files - relevant when slipgate or qw-stats needs to inspect demo content. |
| `hub.quakeworld.nu/` | `github.com/quakeworldnu/hub.quakeworld.nu` | QW Hub source. The match-history + voice-replay web app that matchscheduler and slipgate consume via its Supabase + CDN endpoints. |
| `slipgate/` | `github.com/quakeworld/slipgate` | Vikpe's slipgate web repo - the community web hub that the slipgate-app will eventually graduate into. Currently reference material only; not consumed programmatically. |

## Conventions

- **Directory naming:** match the upstream repo name when possible. Prefix with the owner (`dusty-`, `nquake-`) when multiple forks exist for the same upstream project, so similar repos cluster.
- **No in-place edits.** Any modifications to these trees will be lost on re-clone. If a change is needed for experimentation, copy the relevant file into the monorepo proper or fork the repo.
- **Not imported by monorepo apps.** None of this code is run, compiled, or linked by the monorepo apps. The research/ tree is a reading room.
- **Gitignored.** This directory is not tracked by the monorepo's git. Re-clone after a fresh checkout.

## Adding a new repo

When cloning a new repo into this tree:

1. Pick a directory name per the convention above.
2. `git clone --depth 1 <url> <dirname>` (shallow unless full history is needed).
3. Add a row to the table above with directory, upstream URL, and one-line purpose. The purpose line is the most important part - future readers use it to decide whether the repo is relevant to their task without having to `ls` the tree.
4. If the clone is for a specific Layer 3 concept note or Layer 1 extraction task, note that task in the purpose line as well.
