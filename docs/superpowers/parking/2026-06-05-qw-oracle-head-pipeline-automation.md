# Parked arc: qw-oracle head-pipeline automation (ezquake runtime dump)

**Date:** 2026-06-05
**Status:** Parked at design. Foundation staged (paks copied). Ready for a fresh-terminal brainstorm/build.

## Goal

Automate the **Track-A runtime-reachability refresh** so it pairs with the head re-walk — currently a manual Windows chore. End state: `re-walk head → build/fetch the Linux client at that commit → run it headless → dump cvarlist/cmdlist → validate → re-light track_a_reachability`, no human in the loop. Fits the operator's "rolling head at a decent cadence" model.

## Why now

This session re-walked ezquake head `3f9e724f → e4a2c20a` (+24 upstream commits, incl. the operator's own `cleanup/runtime-dead-entities` PR that removed ~104 dead cvars). That move **blanked `track_a_reachability` everywhere** — it's currently empty across all projects/versions. Reason: the overlay is **commit-gated** (only applies while head sits on the exact commit a runtime dump was validated against). Head moved off the validated commit (`3f9e724f`), so the gate withheld it. Establishes the rule: **re-walk and re-dump must be paired.** Automating the dump closes that loop.

## Key findings (verified this session)

- **The "dump" is just captured console output** of `/cvarlist` + `/cmdlist`. The existing artifact `apps/qw-oracle/data/detection/entities-runtime-dump-3f9e724f.txt` is exactly that (shows the `]/cmdlist` prompt + `&cXXX` color codes).
- **ezquake has NO native headless mode.** `vid_sdl2.c:995` does `Sys_Error("Couldn't initialize SDL video")` on failure, and it creates a real window. No `-dedicated` for the client (that's mvdsv). → must give it a **virtual display: xvfb + mesa software GL** (WSL2 has WSLg+mesa, so software GL works; no GPU needed). `-nosound` is honored (`snd_main.c:484`) for headless.
- **Minimal runtime = client binary + `id1/pak0.pak` + `id1/pak1.pak`** (~51 MB). Possibly `pak0.pak` alone for boot-to-console (untested — pak1 is registered maps/models, not touched without a map load).
- **Paks staged** at `apps/qw-oracle/quake/id1/` (gitignored — pak1 is commercial/not redistributable + bloat). Source: `/mnt/c/Games/QuakeWorld/QuakeWorld/id1/`.
- **Dump must come from the EXACT commit.** The validator checks the build~sha embedded in the `version` command output. Build from the commit (or fetch the matching nightly), not "latest."
- **Track-A is upgrade-only / additive.** `load-callgraph-reachability.ts:201` — a name not in the dump returns the spine UNCHANGED (stays level-2). The dump only flips entities to level-3 "dump-confirmed"; **absence never marks anything dead.** The callgraph (level-2) already covers all **4 parse variants: client / server / win / apple**, so cross-platform commands are captured regardless of dump platform. → a single Linux dump gives **level-3 for the Linux surface; win/apple-only stay level-2** (fine). Guardrails: **D20** (no dump-confirmed stamp on a build-excluded row), **D22 fail-safe-CLOSED** (when unsure, stay level-2).
- **Validator:** `scripts/extractors/ezquake/accept-runtime-truth.py` (3 stages: probe-gate → proxy-gated dump cross-check → stamp-set `level3-stamp-set-<pin>.json`). The Task-4 loader applies the stamp-set; `extract-tag.ts` 3f supplies it ONLY when the validation record is GREEN and the version is the pinned-dump version.

## Decisions

- **Head-only dumps for now.** The community runs dev-head, so that's where liveness matters. Per-version dumps are **deferred** (callgraph level-2 already covers historical tags; diminishing returns; older clients add headless friction). Archiving binaries per-version is cheap/harmless if wanted.
- **Quake data gitignored, never committed** (pak1 commercial + 51 MB bloat).
- **Linux build for WSL dumps**; the `.exe` is the Windows-dump path (operator's manual method).

## Open questions / to validate

1. Does **boot-to-console** (no map load) register the FULL cvar/command set, or are some lazy? Validate by diffing the headless dump against the source-extracted `ezquake@head` set (and/or the known-good manual dump).
2. **pak0-only** sufficient to boot?
3. **xvfb vs `SDL_VIDEODRIVER=offscreen`** — which is cleaner in WSL?
4. How to obtain the **Linux binary for a given commit** — build from source (`research/repos/ezquake-source`) vs the CI nightly/AppImage.
5. Wiring: after `extract-tag --version head`, trigger build → dump → `accept-runtime-truth.py` → re-light.

## Sibling parked items (same "head pipeline" cluster)

- **Doc-coverage trigger** — after each walk, flag new+undocumented entities (this session: 133 head-only entities, ~117 with no description; ~974 source-backed no-desc backlog). Tooling exists (`classify-help-json.py`, `insert-helpjson-synthesis-*.py`, `build-help-json-pr-digest.py`) but there's no standing trigger. Arc-shaped.
- **Gap-guard** — a ~15-line "our `versions` registry vs upstream git tags" check so the next missing release flags itself. (This session backfilled the 3 that had slipped: 3.6.3 / 3.6.4 / 3.6.7.)

## First actions for a fresh terminal

1. Read this doc.
2. Get a Linux ezquake build for `e4a2c20a` (build from `research/repos/ezquake-source`, currently checked out at that commit, or fetch the matching nightly).
3. Prototype the headless dump:
   `xvfb-run -a ./<ezquake-linux> -basedir apps/qw-oracle/quake -nosound +cvarlist +cmdlist +condump /tmp/dump.txt +quit`
4. Diff the captured output against the source-extracted `ezquake@head` cvar/command set — check completeness (open question #1).
5. If complete: wire dump → `accept-runtime-truth.py` → re-light `track_a_reachability` for head; then consider chaining it onto `extract-tag --version head`.

## State at park

- ezquake `head` = `e4a2c20a` on **dev and prod** (deployed this session). Stable line v3.0→3.6.9 complete (3.6.3/3.6.4/3.6.7 backfilled).
- `track_a_reachability` is **empty everywhere** (head moved off the validated commit `3f9e724f`; `track_b_hud_recovery` is intact on all versions).
- Paks staged + gitignored at `apps/qw-oracle/quake/id1/`.
- MCP server v0.6.0 live at oracle.slipgate.me (KTX-realignment arc shipped earlier this session).
