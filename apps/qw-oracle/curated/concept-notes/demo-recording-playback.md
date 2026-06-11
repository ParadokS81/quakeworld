---
title: "Recording and watching QuakeWorld games: demos, screenshots, and match logs"
summary: "A QuakeWorld match record is three things captured together -- a demo, a scoreboard screenshot, and a console log -- and ezQuake's match tools record all of them automatically when a match starts. The short version: set match_auto_record 2 (plus match_auto_sshot 1) and forget it; record one-off demos with easyrecord; watch with playdemo or menu_demos. Auto-records sort themselves into per-gametype subfolders (duel/, tdm/, 2on2/, ...) with descriptive names, all configurable through the match_format_<category> templates and the match_name_* macros. Your client records a single-view .qwd, the server records the multiview .mvd everyone watches afterward -- usually through hub.quake.world, which has archived every server's demos for years."
slug: demo-recording-playback
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: new-page
primary_contributors:
  - "@ParadokS"
related_entities:
  - ezquake:command:easyrecord
  - ezquake:command:record
  - ezquake:command:recordqwd
  - ezquake:command:stop
  - ezquake:command:match_save
  - ezquake:cvar:match_auto_record
  - ezquake:cvar:match_auto_minlength
  - ezquake:cvar:match_auto_sshot
  - ezquake:cvar:match_auto_logconsole
  - ezquake:cvar:match_auto_logupload
  - ezquake:cvar:demo_dir
  - ezquake:cvar:demo_format
  - ezquake:cvar:sshot_dir
  - ezquake:command:match_format_macrolist
  - ezquake:cvar:match_format_duel
  - ezquake:cvar:match_format_2on2
  - ezquake:cvar:match_format_4on4
  - ezquake:cvar:match_format_ffa
  - ezquake:cvar:match_name_nick
  - ezquake:cvar:match_name_spec
  - ezquake:cvar:match_name_and
  - ezquake:cvar:match_name_versus
  - ezquake:command:playdemo
  - ezquake:command:menu_demos
  - ezquake:command:demo_jump
  - ezquake:command:demo_setspeed
  - ezquake:cvar:cl_demospeed
  - ezquake:command:demotimescale
  - ezquake:command:demo_controls
  - ezquake:cvar:cl_democlock
  - ezquake:cvar:mvd_autotrack
  - ezquake:command:log
  - ezquake:cmdline_param:-condebug
  - ezquake:command:cmd
  - ktx:command:dlist
  - fte:command:demo_nudge
  - fte:command:rerecord
  - fte:command:mvdrecord
  - fte:cvar:cl_demospeed
scope: cross-engine
engines_covered: [ezquake, fte, mvdsv, ktx]
best_practices_reviewed: 2026-06-11
last_updated: 2026-06-11
---

# Recording and watching QuakeWorld games

## Summary

A "match record" in QuakeWorld is three things captured together: a **demo** of the game, a **scoreboard screenshot**, and a **console log**. ezQuake's match tools record all three automatically when a match starts, so the usual answer to "how do I record my games" is one line of config you set once -- and the records auto-sort into per-gametype folders with descriptive names. Your client records a single-view `.qwd`; a real server records the multiview `.mvd` that people actually watch afterward -- most often through **hub.quake.world**, which has scraped and hosted the demos from essentially every QW server for years. The short version below covers recording and watching; the rest is the detail and the format differences.

## Record your games (the short version)

Set it once and forget it -- auto-record every match:

```
match_auto_record 2       // record a demo of every match and save it when the match ends
match_auto_sshot 1        // also snap the end-of-game scoreboard -- the easiest way to browse your history
match_auto_logconsole 1   // also keep a console log of the match
```

Demos and screenshots land in your `qw/` folder (or wherever `demo_dir` points). Recordings are small -- about 15 MB each -- so the folder grows to a few GB over a long time and surprises people; just prune it occasionally (operator SME, ParadokS 2026-06-11). In practice the **scoreboard screenshots** are often more useful than the demos: an archive you can flip through to see what you played and how it went.

To record a one-off demo by hand instead:

```
easyrecord blah    // start recording, auto-named from the current game
record blah        // ...or record to a plain blah.qwd in your qw folder
stop               // finish and save
```

## What a match record contains

The match tools capture three artifacts together at match start, each with its own toggle:

- **Demo** -- `match_auto_record`. `1` records but needs a manual `match_save` to keep it; `2` saves automatically when the match ends. `match_auto_minlength` discards very short ones, and `match_auto_spectating` extends recording to when you are spectating.
- **Screenshot** -- `match_auto_sshot` takes the final scoreboard shot (briefly clearing the console/menu so the shot is clean).
- **Console log** -- `match_auto_logconsole` writes a per-match log; `match_auto_logupload` can post it to a remote log service (the quakeworld.nu endpoint in `match_auto_logurl`). Outside the match tools, log on demand with the `log <name>` command, or launch with `-condebug` to log everything to `qw/qconsole.log`. (ezQuake has no `condump`.)

## Where records are saved, and how they are named

Auto-recorded matches sort themselves into per-gametype subfolders with descriptive names -- you rarely organize anything by hand. Two base directories sit at the top:

```
demo_dir <path>     // demos + auto-records (default: your qw/ folder)
sshot_dir <path>    // screenshots
```

Under those, ezQuake picks a filename template by game type. There is one template cvar per category -- `match_format_duel`, `match_format_2on2`, `match_format_4on4`, `match_format_ffa`, `match_format_race`, `match_format_tf_clanwar`, and so on -- and the client auto-selects which one applies from the gamedir and the team/player counts. Each default begins with a subfolder, so records self-sort:

```
match_format_4on4   tdm/%n - [%Oon%E_%t%v%e] - [%M]
                    //  -> demos/tdm/myname - [4on4_red_vs_blue] - [dm3].mvd
match_format_duel   duel/%n - %p%v%e - [dmm%D] - [%M]
                    //  -> demos/duel/myname - p1_vs_p2 - [dmm3] - [dm6].mvd
```

The `%` tokens are macros: `%n` your name, `%t` / `%e` your team or the opponent, `%M` the map, `%Y%m%d` / `%H%Q` the date and time, `%v` the "vs" join, and more -- run `match_format_macrolist` to print the full list. To change where a game type files its records, or how they are named, edit that category's `match_format_<category>` cvar: change the leading `/`-separated folder, or rearrange the macros. The `match_name_*` cvars feed the tokens -- `match_name_nick` overrides the name `%n` uses (set it if your in-game name carries color codes), `match_name_spec` tags it when you spectate (default `(SPEC)`), and `match_name_and` / `match_name_versus` are the join strings between teammates and teams (defaults `_&_` and `_vs_`). The demo, screenshot, and console log of one game share this base name, so a match's three artifacts line up.

## Watch a demo

```
playdemo blah      // play a demo file (.qwd or .mvd)
menu_demos         // ...or browse and launch demos from the in-game menu
```

While a demo plays:

```
demo_jump 4:30     // jump to 4 min 30 s into the demo (demo_jump 120 jumps to 120 seconds)
cl_demospeed 50    // half speed (demo_setspeed 50 is the same; demotimescale is a legacy alias)
demo_controls      // toggle an on-screen playback panel (timeline, speed, jump)
```

Show the elapsed-demo clock with the `democlock` HUD element (`cl_democlock 1`). Most players, though, do not keep local files to watch matches -- they use **hub.quake.world**, which hosts the MVDs from essentially every QW server going back years, and either watch in the browser or download the `.mvd` to play locally (operator SME, ParadokS 2026-06-11).

## `.qwd` vs `.mvd`

The two demo formats answer different questions:

- **`.qwd`** -- the original QuakeWorld demo: your single point of view, recorded **client-side** by `record` / `easyrecord`.
- **`.mvd`** -- MultiView Demo: every player's point of view in one file, recorded **server-side**. It is smaller per view and interpolated (smoother to watch), and it lets you switch POV freely or let `mvd_autotrack 1` follow the best player for you. Match demos are MVDs.

`demo_format` (`mvd` / `qwd` / `qwz`) sets which format the match tools record in.

## Getting a server's match demos

A real match server records the game as an MVD on its own side. To pull one straight from the server, send the listing and download commands to it with `cmd`:

```
cmd dlist          // list the server's demos, numbered (cmd demolist is the same command)
cmd dl 3           // download demo number 3 from that list
cmd dl .           // download the most recent recording (each extra dot goes one further back: .. = second-last)
```

Type these in **lowercase and not in colored text** -- a mixed-case or colored user command comes back as "bad user command" -- and the server has to permit downloads at all (the `allow_download_demos` server setting, on by default). For most people it is easier to just grab the game from hub.quake.world than to download it by hand.

Server-side MVD recording itself -- the `sv_demo*` settings an admin tunes on the server -- is server-admin territory and out of scope here.

## Cross-engine notes

Recording and playback basics are shared between **ezQuake and FTE**: `record`, `easyrecord`, `stop`, `playdemo`, `demo_jump`, and `demo_setspeed` / `cl_demospeed` all work in both. The **match-tools family** (`match_auto_record`, `match_auto_sshot`, `match_auto_logconsole`) and the `demo_controls` overlay are **ezQuake-specific** -- FTE has no client-side match auto-record (its `sv_demoAutoRecord` is a server setting), and it uses `demo_nudge` for frame-stepping and `rerecord` to restart a clean recording. The `cmd dl` / `cmd dlist` download path lives in the **mvdsv server**, so it works the same from any client.

## Ruleset interaction

Nothing to configure: recording and playback cvars are unrestricted under every competitive ruleset. The only ruleset interaction runs the other way -- the client *relaxes* a few visual restrictions (fullbright skins, powerup shells) while you watch a demo or spectate, since you are not the one playing.

## Consumer implications

- **Slipgate config-viewer.** Group the match-tools cvars (`match_auto_record` / `match_auto_sshot` / `match_auto_logconsole` / `match_auto_minlength`) as one "match recording" set -- they fire together -- and surface `demo_dir` / `sshot_dir` with a "where your demos and screenshots go" hint. The naming/foldering family (`match_format_<category>` templates + `match_name_*` macro feeders) is a natural advanced sub-panel: show the per-gametype template strings, and a `match_format_macrolist` legend for the `%` macros. The `match_auto_record` `1`-vs-`2` distinction (manual `match_save` vs auto-save) is the one worth a tooltip.
- **Oracle MCP / chatbot.** "How do I record / watch a demo" resolves to the short version: auto-record with the match tools, or `easyrecord` for a one-off; `playdemo` / `menu_demos` to watch. For "where are my old games," point at the auto-screenshots and at hub.quake.world. For "`cmd dl` doesn't work," check lowercase-not-colored and that the server supports it. `match_auto_record` left on is the usual cause of a quietly growing quake folder.

## References

- **Recording (ezQuake head):** `record` / `easyrecord` / `stop` (plus `recordqwd` / `stopqwd`, which force a client-side QWD on a listen-server build); `match_save`; `demo_dir` default `""` -> the `qw/` gamedir (`cl_demo.c:120`); `demo_format` (`mvd` / `qwd` / `qwz`). Match tools: `match_auto_record` (`1` manual-save / `2` auto-save), `match_auto_minlength`, `match_auto_sshot`, `match_auto_spectating`, `match_auto_logconsole`, `match_auto_logupload` (-> `match_auto_logurl`).
- **Naming + foldering (match tools):** the per-category template cvars and their defaults at `match_tools.c:40-60` (e.g. `match_format_4on4` = `tdm/%n - [%Oon%E_%t%v%e] - [%M]`, `match_format_duel` = `duel/%n - %p%v%e - [dmm%D] - [%M]` -- each leads with a gametype subfolder); the client auto-selects the category by gamedir + team/player count (`MT_NameForMatchInfo`, `match_tools.c:575`). The `%`-macro expander at `match_tools.c:505-562` (`%n` name, `%M` map, `%t`/`%e`/`%k`/`%l` team/opponent/rosters, `%G` gamedir, `%Y%m%d%H%Q%S` date/time); `match_format_macrolist` prints them. Feeder cvars `match_name_nick` (`""` -> in-game name), `match_name_spec` (`(SPEC)`), `match_name_and` (`_&_`), `match_name_versus` (`_vs_`) at `match_tools.c:56-60`. Base dirs `demo_dir` / `sshot_dir`.
- **Console logs:** `log <name>` command; `-condebug` launch flag -> `qw/qconsole.log`. ezQuake has no `condump` (Layer 1 + source both absent; confirmed against community testimony, thread #6953).
- **Playback:** `playdemo`, `menu_demos`, `demo_jump` (seconds or `m:ss`, plus `demo_jump_mark` / `demo_jump_end`), `demo_setspeed` (x% of normal), `cl_demospeed`, `demotimescale` (legacy alias for `cl_demospeed`), `demo_controls`, the `democlock` element / `cl_democlock`. MVD viewing: `mvd_autotrack`.
- **Server demo download (mvdsv):** the `dl` (`Cmd_DemoDownload_f`) and `dlist` / `demolist` (`SV_DemoList_f`) user commands in `mvdsv/src/sv_user.c:1643, 3325-3340`, reached from a client as `cmd dl` / `cmd dlist`; `cmd dl` syntax (`#` list numbers, `.` = Nth-last, `\`/`stop`/`cancel` clear the queue) at `sv_user.c:1658-1675`. `allow_download_demos` is a **server** gate (`sv_main.c:112`, default `1`), not a client cvar. KTX wraps the listing as `dlist` (`ktx/src/commands.c:965`). These mvdsv user commands are present in source but not yet in Layer 1 (extraction gap -- the `ucmds[]` table is not walked; flagged for handover 2026-06-11).
- **Cross-engine (FTE):** `record` / `easyrecord` / `stop` / `playdemo` / `demo_jump` / `demo_setspeed` / `cl_demospeed` present; `demo_nudge`, `rerecord`, `mvdrecord` FTE-side; no client `match_auto_*` family.
- **Upstream:** no ezquake.com/docs demos page exists (gap-candidate, new page).
- **Operator SME (ParadokS, 2026-06-11):** real-world usage -- a match record bundles demo + screenshot + console log; **hub.quake.world** as the de-facto MVD archive (all servers, ~6 years, browser-watch or download-to-watch); local auto-record as a set-and-forget "immutable record of your games" pruned periodically (~15 MB per demo); the scoreboard screenshot as the most-browsed artifact; `.qwd` single-view-client vs `.mvd` multiview-server-interpolated. Flagged inline as operator SME / field practice, not source-defensible measurement.

## Related concept notes

- `hud-configuration` -- `democlock` and the `mvd_*` info overlays are HUD elements; that note owns showing and placing them, and it covers hiding the `tracking: <name>` overlay for clean demo video.
- `weapon-scripts` -- server-side weapon switching (`w_rank`) is the sibling "stays reliable under packet loss" feature; a demo records whatever weapon path you actually used.
- **Forward references (not yet authored):** a **spectating / QTV** note (live `mvd_autotrack` and QTV) -- demo *playback* is owned here, live spectating there; a **video capture** note (`demo_capture` to render a demo to `.avi` / image sequences), which is the rendering step downstream of this note's playback.
