# Phase 8 eval set candidates -- draft from #helpdesk 90d scan

**Source:** `#helpdesk` last 90 days (2026-02-02 → 2026-05-02), 4,117 chat+link messages across 601 sessions, dumped to `/tmp/qw-oracle-eval/helpdesk-90d.log` and read by Claude.

**Selection method:** First-pass scan for recurring real user questions matching each category. No curation -- whatever was actually asked at least occasionally over the period. Answer keys verified against `entities` and `concepts` tables in `qw_oracle`.

**Operator's job:** Adjust phrasing to match the way YOU would phrase it as a real user. Confirm or change the answer keys. Discard any that don't survive your read.

---

## Eval set (12 questions)

### Concept-anchored (4) -- mostly easy, 1 hard

| # | Question (real shape, paraphrased from #helpdesk) | Difficulty | L3 slug | L1 entities |
|---|---|---|---|---|
| 1 | "How do I change the lightning gun color, the white beam looks bad" | easy | `lightning-gun-customization` | ezquake/cvar `gl_custom_lg_color`, ezquake/cvar `gl_colorlights` |
| 2 | "How do I make a weapon script that picks the best weapon I have ammo for" | easy | `weapon-scripts` | (multi-cvar / command -- concept note covers) |
| 3 | "What's the difference between teamskin, baseskin, and teamforceskins" | easy | `player-skins` | ezquake/cvar `teamskin`, `baseskin`, `teamforceskins` |
| 4 | "Why are %e/%E removed from teamplay messages, what should I use instead" | hard | `ruleset-anti-script-restriction-pattern` | ezquake/macro family + ezquake/cvar `tp_msg*` |

### Vague natural-language (4) -- 2 easy, 2 hard

| # | Question (symptom-only, no cvar named) | Difficulty | L1 entities | Notes |
|---|---|---|---|---|
| 5 | "After I close ezquake on Windows the screen brightness keeps flickering between two states" | easy | ezquake/cvar `vid_software_palette`, `vid_hwgammacontrol` | Recurring across multiple users (nas, Andeh, Faustov). Tests embedding-driven retrieval -- no cvar named. |
| 6 | "When I pick up quad I only see a white tint instead of the blue glow" | easy | ezquake/cvar `gl_colorlights` (primary), `v_quadcshift`, `gl_polyblend`, `gl_flashblend`, `r_dynamic` | Edwhine's session 83303. mrphren walked through the candidates; the answer was `gl_colorlights 1`. |
| 7 | "Some walls show up flat-colored or wireframe-looking but only in certain places" | hard | ezquake/cvar `r_drawflat`, `r_wallcolor`, `r_floorcolor` | Faustov session 83290. Multi-entity, requires interpreting drawflat as a fallback for missing textures. |
| 8 | "I get small stutters every few minutes on linux even with sys_highpriority and CPU affinity set" | hard | ezquake/cvar `vid_renderer`, `vid_software_palette`, `hud_performance_average`, `sys_highpriority` | niomic's recurring frustration. Symptom maps to multiple potential causes (compositor, vid_renderer, frametime measurement quirk). Hard because no single canonical fix. |

### Exact-name (2) -- both easy

| # | Question (user already named it) | L1 entity |
|---|---|---|
| 9 | "What's the variable for the armor icon in the HUD" | ezquake/hud_element `iarmor` (+ `hud_iarmor_*` cvar family) |
| 10 | "What does cl_portpingprobe_enable do" | ezquake/cvar `cl_portpingprobe_enable` (and `cl_portpingprobe_*` family) |

### Out-of-corpus (2) -- 1 obvious-no, 1 QW-adjacent

| # | Question | Why OOC | Expected behavior |
|---|---|---|---|
| 11 | "Can I play ezquake on my phone" | No mobile-client entity in Layer 1; corpus is Linux/Mac/Windows engine only. Atom1K asked this directly. | Honest "weak/none" label; no hallucinated cvar |
| 12 | "How do I set up automatic map rotation on my fteqw-sv64 server" | Map rotation lives in KTX gamecode (QC), which is explicitly out of Arc 1 corpus. halides's session 83424; Spoike confirmed "map rotation is a gamecode thing." | Honest "weak/none" or "this is server-side gamecode, not engine" |

---

## Calibration set (5 questions, no overlap with eval)

For tuning thresholds before running the real eval.

| # | Question | Category | Difficulty | Answer key |
|---|---|---|---|---|
| C1 | "How do I scale the scoreboard, scr_scoreboard_scale doesn't exist" | exact-name (negative) | easy | OOC for ezquake (cvar exists in unezquake fork only); workaround = `vid_conscale` alias bound to scoreboard key |
| C2 | "Where do deathmessages show up in the HUD, they disappeared from mine" | vague-NL | easy | ezquake/cvar `con_fragmessages` |
| C3 | "How do I register the qw:// URL handler so links open in ezquake" | exact-name | easy | ezquake/command `register_qwurl_protocol` |
| C4 | "What is r_lgbloodcolor and what does setting it do" | exact-name | easy | ezquake/cvar `r_lgbloodcolor` (verify exists) |
| C5 | "How do I make my downloads faster from a server, mine caps at 350 KB/s" | vague-NL | easy | ezquake/cvar `cl_chunksperframe` (default 30, was set to 5 in some old configs); ezquake/cvar `rate` |

---

## Notes on what surprised me reading the log

1. **#helpdesk is heavily skewed toward platform/OS troubleshooting**, not gameplay-cvar questions. Linux NVIDIA / Wayland / X11 / mouse accel / audio dominate the volume. The corpus answers most of these via individual cvars (vid_*, sys_*, in_*) but the user-side phrasing is symptom-only.

2. **Strong recurring pattern: HDR + ezquake on Windows** mangles SDR brightness across multiple users (nas, Andeh, Faustov). This is a real, repeated, unresolved-feeling thread. Good test of `unresolved` status tagging if/when the parking-doc thread reconstruction lands.

3. **Several questions self-resolved in the channel without the asker confirming a fix** (the Faustov drawflat thread eventually settled on vid_renderer 0 working; the niomic stutters are arguably never resolved). Status tagging would surface these as `unresolved` -- exactly the survivorship-bias signal the parking doc points at.

4. **Many "questions" aren't actually helpdesk questions** -- HangTime's session 83312 noted "probably best discuss this on a different channel" mid-cheater-discussion. Real signal from the eval perspective: the channel mixes in social/dev chatter even after our filter. Phase 7 query_log will show whether real users phrase queries the way these helpdesk threads do.

5. **`scr_scoreboard_scale` is a perfect calibration question** because Dusty in the log explicitly said "it's only in unezquake" -- giving us a real recurring negative case where the right answer is "not in this corpus" rather than a cvar.
