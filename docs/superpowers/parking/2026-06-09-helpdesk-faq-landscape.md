# #helpdesk FAQ landscape (reference snapshot)

**Generated:** 2026-06-09 from the dev DB after the #helpdesk backfill completed (7/7 years).
**Source of truth:** the live dev DB (`chat_threads`, channel `#helpdesk`, `reconstruction_version` LIKE `fence-sonnet-v2%`). This doc is a SNAPSHOT -- re-query the DB for current/exact numbers.
**Purpose:** orient a fresh terminal on what #helpdesk users ask and how often it gets resolved, so the "how do we make this useful" work (L3 concept-note authoring / active assistance) is grounded in real demand.

## Corpus

- **6623 #helpdesk threads** (topic-coherent conversations), all fenced + embedded + retrievable.
- **Resolution split:** solved 3610 (54.5%) / informational 1593 (24.1%) / unresolved 1418 (21.4%) / (null) 2 (0.0%).
  - solved+unresolved = the real Q&A (FAQ candidates); informational = banter/noise.
- **5028 FAQ-candidate threads clustered into 48 topics** via spherical k-means on the voyage-4-large `topic_embedding` vectors (deterministic, seed=42, FREE -- no LLM). Informational threads are excluded from the ranking but remain in the DB / browser.

## How to read this

- **size** = number of THREADS (distinct conversations) in the cluster = how often the topic is asked (the FAQ-frequency signal).
- **unres%** = fraction of that cluster's threads the fencer labelled `unresolved` = where the community answer was weak (the GAP signal -- prime L3 targets).
- **terms** = distinctive auto-extracted terms (TF-IDF on topic labels). **medoid** = the most-representative single thread's label.
- CAVEAT: cluster titles/terms are auto-derived (free). The single highest-unres cluster is usually a "nobody replied" noise bucket, not a coherent topic -- verify by reading (the browser, or query the DB).

## All 48 clusters (by size)

| rank | size | unres% | terms | representative thread |
|---|---|---|---|---|
| 1 | 200 | 20% | rocket, glow, color, quad, powerup, trail | Fullbright colors for rockets and grenades in streams |
| 2 | 181 | 17% | textures, texture, models, pk3, custom, model | HD item textures vs 2D items in nquake / gl_simpleitems fix |
| 3 | 166 | 13% | server, quakeworld, nquake, quake, setup, mvdsv | New player setup: best QW engine, nQuake recommendation, prx userinfo error |
| 4 | 157 | 21% | server, ktx, mode, spawn, admin, command | Visible spawn points in prewar (k_spm_show cvar) |
| 5 | 157 | 29% | show, frag, display, hud, qtv, showing | brunno4596: showing frag/kill count in HUD corner (hud_frags_show) |
| 6 | 157 | 13% | hud, armor, ammo, health, element, bar | Deleted User asking how to move or disable HUD sbar/ibar elements in ezQuake |
| 7 | 156 | 72% | unanswered, answer, bot, looking, inquiry, follow | grasshopper asks about spamming for mix in quake console |
| 8 | 150 | 51% | fps, drops, windows, gpu, nvidia, cpu | ezQuake unstable FPS / microstutter on Ryzen 5800x + GTX 1080 Ti (andeh) |
| 9 | 149 | 26% | demo, demos, mvd, recording, qwd, server | How to record demos (client-side and server-side MVD demos) |
| 10 | 147 | 50% | crash, error, ezquake, map, crashes, crashing | Client crashes (closes) right before map loads on connect |
| 11 | 140 | 15% | textures, texture, look, r_drawflat, lit, pixelated | Drawflat wall/floor color cvars (r_drawflat, r_wallcolor, r_floorcolor) question and usage |
| 12 | 134 | 17% | weapon, fire, alias, switching, bind, script | .finalexit asks how to bind a key to temporarily override mouse1 with an alternate weapon |
| 13 | 132 | 20% | server, port, forwarding, qtv, nquakesv, setup | radicalcat: mvdsv server errors, KTX commands, /ffa workaround, port forwarding, IP sharing |
| 14 | 131 | 20% | download, nquake, ezquake, installer, where, latest | Where to download the latest ezQuake version |
| 15 | 119 | 23% | bots, bot, ktx, frogbot, botcmd, server | Adding bots to a self-hosted game -- missing frogbot.pk3 and bot commands |
| 16 | 119 | 50% | audio, sound, sounds, ambient, echo, headset | Sub-woofer cuts out in ezquake 3.6 (SDL_AUDIODRIVER=directsound suggestion) |
| 17 | 117 | 26% | team, hud, color, showing, frag, display | Colored team/enemy score HUD element like vikpe/streambot (hud_teamfrags_style) |
| 18 | 116 | 17% | discord, quakeworld, badplace, account, server, login | mysykkz asks for the QuakeWorld Discord invite link |
| 19 | 115 | 29% | packet, ping, loss, antilag, cl_c2sdupe, lag | Packet loss in ezquake -- WiFi, cl_physfps, cl_c2sdupe diagnosis |
| 20 | 113 | 20% | hud, messages, hud_notify, notify, moving, position | Positioning teamsay messages on screen using HUD editor |
| 21 | 109 | 23% | skin, enemy, color, skins, player, colors | rakunari: forced enemy skins not loading/changing |
| 22 | 106 | 31% | monitor, fps, refresh, rate, 240hz, vsync | Recommended maxfps for 240hz monitor |
| 23 | 105 | 33% | spawn, damage, ruleset, quad, whether, weapon | Was glow considered a cheat in QW |
| 24 | 103 | 18% | map, loc, maps, files, server, file | darkolausi asks about a loc-pack for custom maps; zigg__ points to nicotinelounge zip |
| 25 | 102 | 17% | config, cfg, saving, cfg_save, nquake, location | cfg_save writing to wrong directory |
| 26 | 101 | 49% | servers, down, server, badplace, hub, error | snapcase: fteqtv.quake.world proxy down, vikpe restores it |
| 27 | 100 | 18% | pak, files, pak1, nquake, pk3, quake | Missing e2/e3 maps — need pak1.pak from full Quake copy |
| 28 | 96 | 35% | proxy, ping, connectbr, server, cl_proxyaddr, port | Forcing a proxy via cl_proxyaddr and connectbr behavior |
| 29 | 95 | 29% | ezquake, fps, glsl, vid_renderer, gpu, renderer | ezQuake 3.2+ FPS capped at ~250 compared to 2000fps on older versions -- GPU selection issue on laptop |
| 30 | 90 | 20% | gl_outline, outlines, r_fx_geometry, ruleset, outline, vid_renderer | ezquake 3.6 world outline broken -- vid_renderer / vid_framebuffer / r_fx_geometry fix |
| 31 | 89 | 69% | quake, map, mdl, project, model, response | fluffacorn asks about a dump of DM maps from the new Quake port (no answer) |
| 32 | 89 | 20% | linux, compile, ezquake, build, source, compiling | ezQuake on Linux: building from source (klenha) |
| 33 | 83 | 22% | browser, server, servers, master, sources, list | ezQuake server browser empty / sources.txt setup |
| 34 | 81 | 21% | alt, ezquake, tab, working, windowed, vid_grab_keyboard | psyzq asks how to use ezQuake with bspwm tiling window manager on Linux |
| 35 | 79 | 15% | resolution, fov, scaling, vid_conscale, vid_conwidth, hud | 4K HUD scaling: vid_conscale and vid_conheight/conwidth settings |
| 36 | 79 | 39% | gamma, brightness, vid_software_palette, dark, screenshots, ezquake | gl_gamma not working on HDR monitor -- Windows bug suspected |
| 37 | 75 | 17% | movement, sensitivity, mouse, m_pitch, speed, jump | hmr.qw mouse sensitivity different on X vs Y axis -- m_pitch command |
| 38 | 69 | 12% | console, keyboard, alias, string, name, bind | How to bind additional commands to the console toggle key |
| 39 | 66 | 52% | linux, xfce, ezquake, monitor, tab, alt | Wayland: ezquake forces second monitor resolution instead of proper one |
| 40 | 64 | 28% | alias, teamplay, script, aliases, auto, start | sorhin asking where tp_msg aliases are in ezquake -- hardcoded, not in cfg |
| 41 | 61 | 16% | font, charset, console, fonts, ttf, ezquake | ostx asks how to change font/charset for HUD and console in ezquake |
| 42 | 60 | 35% | mouse, in_raw, input, polling, dpi, linux | Windows enhance pointer precision (mouse accel) -- on or off, and in_raw relevance |
| 43 | 58 | 38% | autotrack, spectator, player, qtv, command, spectating | Demowatch autotrack locked to one team |
| 44 | 51 | 45% | textures, texture, gfx, file, png, loading | How to see a list of textures used on a map (TexMex tool) |
| 45 | 51 | 22% | linux, bootable, usb, debian, distro, boot | ocoini FPS stuttering and bootable Linux USB for QuakeWorld |
| 46 | 43 | 40% | hardware, windows, gpu, recommendation, ram, compatibility | Intel iGPU compatibility with ciscon linux bootable OS |
| 47 | 38 | 47% | monitor, recommendation, settings, resolution, panel, ips | 240hz monitor and QW difference inquiry |
| 48 | 29 | 31% | usb, disk, partition, boot, image, hdd | Opening a bootable disk image file on Windows |

## Top 10 high-gap clusters (size>=20, by unresolved-rate) -- where chat failed

- **72% unresolved** (112/156) -- unanswered, answer, bot, looking -> "grasshopper asks about spamming for mix in quake console"
- **69% unresolved** (61/89) -- quake, map, mdl, project -> "fluffacorn asks about a dump of DM maps from the new Quake port (no answer)"
- **52% unresolved** (34/66) -- linux, xfce, ezquake, monitor -> "Wayland: ezquake forces second monitor resolution instead of proper one"
- **51% unresolved** (77/150) -- fps, drops, windows, gpu -> "ezQuake unstable FPS / microstutter on Ryzen 5800x + GTX 1080 Ti (andeh)"
- **50% unresolved** (73/147) -- crash, error, ezquake, map -> "Client crashes (closes) right before map loads on connect"
- **50% unresolved** (59/119) -- audio, sound, sounds, ambient -> "Sub-woofer cuts out in ezquake 3.6 (SDL_AUDIODRIVER=directsound suggestion)"
- **49% unresolved** (49/101) -- servers, down, server, badplace -> "snapcase: fteqtv.quake.world proxy down, vikpe restores it"
- **47% unresolved** (18/38) -- monitor, recommendation, settings, resolution -> "240hz monitor and QW difference inquiry"
- **45% unresolved** (23/51) -- textures, texture, gfx, file -> "How to see a list of textures used on a map (TexMex tool)"
- **40% unresolved** (17/43) -- hardware, windows, gpu, recommendation -> "Intel iGPU compatibility with ciscon linux bootable OS"

## Tooling + how to regenerate

- Clustering: `bun scripts/calibration/scratch/faq-cluster.ts [K=48]` -> `faq-clusters.json` (reads embeddings from DB).
- HTML data export: `bun scripts/calibration/scratch/faq-export.ts` -> `faq-data.js` (all 6623 threads + content + cluster ids).
- Offline browser: `faq-browser.html` (+ `faq-data.js`); a working copy is at `C:\Users\Administrator\Downloads\qw-faq\` (open in a Windows browser).
- These scripts currently live in gitignored `apps/qw-oracle/scripts/calibration/scratch/` -- promote them to a committed home once the product direction settles.
- The live DB has everything (content, resolution_status, 1024-d embeddings) -- prefer querying it over the snapshot for anything exact.

## What this is NOT (scope guards)

- buckets-E (the 9-bucket taxonomy LLM labeling) was DEFERRED -- it's an expensive fan-out and is NOT needed for FAQ-discovery (clustering + resolution_status already rank authoring priority).
- The rest of the backfill (#quakeworld / #dev-corner / #antilag) is PAUSED at a clean checkpoint (budget) -- #helpdesk is the highest-yield channel. Resumable from `scripts/load-chat/backfill-ledger.md`.
- Backfill landed in the DEV DB; the prod MCP is not yet rewired/deployed (post-arc deploy step).
