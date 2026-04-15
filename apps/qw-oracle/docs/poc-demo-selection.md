# POC demo candidate shortlist

Source: legacy `tier2-sample.json` (8 entries, hand-labelled) + top-scored helpdesk sessions from `helpdesk-sample.json` (30 entries, pre-extracted question lists).
Both files live at `/home/paradoks/projects/quake/qw-oracle/output/` from the February 2026 POC pass.

Every session id below was verified to exist in the current `sessions` table of `apps/qw-oracle/data/qw.db`.

## How to use this doc

Skim each candidate. For the ones that look demo-worthy, mark them with `WINNER` in the notes. We then run a baseline pass: feed each winning question to the MCP cold (no skill), see what comes back, and pick the final 3-5 for rehearsal.

Experts are highlighted in **bold** — their presence in a session usually signals authoritative answers.

---

## [T1] session 13181 — Technical IRC (ezQuake)

**irc #ezQuake | 2007-11-27 | 17 chat msgs | 4 participants**

Participants: AlexMax_, Cokeman, deurk, qqshka

**Why interesting:** Concrete weird-hardware bug. 2007 IRC #ezQuake. Very specific symptom + specific hardware. 17 msgs.

**Proposed demo question (paraphrased natural language):**
> Why does quitting ezquake restart my computer? Running nQuake off a thumb drive on a Dell Optiplex GX620.

**Chat excerpt (first 10 lines):**

```
16:48 <AlexMax_> Hrm
16:49 <AlexMax_> is there any particular reason why quitting ezquake would cause a computer to restart?
16:49 <AlexMax_> I'm running the latest nQuake off of a thumb drive on a lab computer here at school, and have found that when I quit the game, it restarts the 
16:49 <AlexMax_> A Dell Optiplex GX620 in particular
16:50 <AlexMax_> any ideas?
16:50 <Cokeman> not really
16:50 <deurk> To get rid of all fingerprints of the game!
16:53 <AlexMax_> i've played q3a on lab computers before
16:53 <qqshka> some ppl close windows with computer restart
16:53 <AlexMax_> and ive seen koreans play starcraft
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [T5] session 83006 — Technical Discord (dev-corner)

**discord #dev-corner | 2022-01-10 | 43 chat msgs | 3 participants**

Participants: miltonizer, **tenacious_papaya_33909**, fzwoch

**Why interesting:** Compile/install pain. 2022 #dev-corner Discord. eb (tenacious_papaya, MVDSV maintainer) is present and takes ownership.

**Proposed demo question (paraphrased natural language):**
> I can't compile ezquake on my system -- no gcc, no sudo access, download also fails.

**Chat excerpt (first 10 lines):**

```
16:03 <miltonizer> Same issue when downloading manually.
16:09 <miltonizer> And can't compile. No gcc nor sudo access.
16:12 <tenacious_papaya_33909> <@!196702597699076096> This is my fault
16:12 <tenacious_papaya_33909> ;x
16:12 <tenacious_papaya_33909> I updated the binaries not long ago
16:12 <tenacious_papaya_33909> Let me fix it
16:25 <tenacious_papaya_33909> <@!196702597699076096> Call the update_binaries.sh script
16:25 <tenacious_papaya_33909> It should be fixed now
16:28 <miltonizer> nope
16:28 <miltonizer> still the same
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [T7] session 110497 — Helpdesk Discord

**discord #helpdesk | 2023-10-28 | 10 chat msgs | 2 participants**

Participants: rob044222, ninjaa8849

**Why interesting:** Classic HUD config question. Short and clean Q&A (10 msgs). rob044222 walks ninjaa8849 through r_tracker_frags, hud_frags_show, newhud, scr_compacthud.

**Proposed demo question (paraphrased natural language):**
> My frag tracker isn't showing up. What cvars do I need?

**Chat excerpt (first 10 lines):**

```
12:00 <rob044222> you have r_tracker_frags 2?
12:05 <rob044222> maybe you have hud_frags_show 1? r_tracker should work with newhud 0
12:05 <rob044222> scr_compacthud 1--4
12:06 <ninjaa8849> thank u
12:06 <rob044222> 1 or 4 is best imo
12:06 <rob044222> then you can hide the stuff on the left/right with
12:07 <ninjaa8849> it is scr_centersbar
12:07 <ninjaa8849> but u lead me the right direction robben ❤️
12:16 <rob044222> If you decide to use scr_compacthud 1 or 4, you can hide the guns/ammo to the left/right with scr_sbar_drawammocounts 0 and scr_sbar_drawguns 
12:16 <rob044222> since they show in the compacthud anyway
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H29] session 102340 — Helpdesk Discord

**discord #helpdesk | 2020-10-19 | 178 chat msgs | 8 participants**

Participants: funkybaws, **tenacious_papaya_33909**, Deleted User, **rauvz**, **fragleberg**, **meag.qw**, hmstx, ake_vader

**Why interesting:** Real ezQuake bug report with eb (MVDSV maintainer) helping. Concrete visual symptom. 2020-10-19. 178 msgs.

**Proposed demo question (paraphrased natural language):**
> My lifts and platforms are jittery on the latest ezQuake 3.6. I tried other people's configs and it still happens.

**Questions extracted by the earlier analysis (first 3):**
- <funkybaws> Anyone know what might be causing lifts and platforms to be jittery? I'm on latest ezquake 3.6. Tried other people's configurations but to
- <tenacious_papaya_33909> <@!295477206115811328> Have you tried the default config?
- <tenacious_papaya_33909> Unstable ping? PL?

**Chat excerpt (first 10 lines):**

```
07:57 <funkybaws> Anyone know what might be causing lifts and platforms to be jittery? I'm on latest ezquake 3.6. Tried other people's configurations but to no 
07:59 <tenacious_papaya_33909> <@!295477206115811328> Have you tried the default config?
07:59 <tenacious_papaya_33909> And check whether it still jitters
07:59 <tenacious_papaya_33909> E.g. you could do this:
```
/cvar_reset_re .*
/cfg_reset
```
07:59 <tenacious_papaya_33909> And see whether the jitter is gone
07:59 <tenacious_papaya_33909> Then we would know that it's definitely something in your config
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H11] session 107005 — Helpdesk Discord

**discord #helpdesk | 2022-06-27 | 245 chat msgs | 6 participants**

Participants: Deleted User, **ciscon**, **spoike**, skurk, **dp_blood_dog**, **fragleberg**

**Why interesting:** NixOS compile issue with ciscon explaining pkg-config. 2022-06-27. 245 msgs. Linux-specific.

**Proposed demo question (paraphrased natural language):**
> I'm trying to compile ezquake on NixOS. libpng.dev is installed but it still can't find it.

**Questions extracted by the earlier analysis (first 3):**
- <skurk> NixOS on a gaming box? brave
- <skurk> but where's the *fun* in that?
- <ciscon> do you really have that much stuff you can't apt install?

**Chat excerpt (first 10 lines):**

```
20:18 <Deleted User> it's apparently called `libpng.dev` and is also seemingly installed
20:18 <ciscon> don't know how his stuff detects things, though i'd assume it's just using pkg-config
20:22 <Deleted User> yeah about that
20:24 <ciscon> yeah it's using cmake's find_package which probably calls that underneath, or at least falls back to it if whatever other methods it uses fail.  
20:24 <ciscon> you'd think it'd just fall back to "pkg-config" for a native build, but whatever
20:25 <spoike> `cd engine && make makelibs -j8 && make m-rel -j8`
20:25 <ciscon> i always just use your script 😛
20:26 <spoike> the `makelibs` bit should download+compile libpng etc, ready for static linking
20:26 <Deleted User> i think if i ever do try this again i'm making a flake.nix
20:26 <ciscon> do what he said, it's his software heh
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H09] session 103674 — Helpdesk Discord

**discord #helpdesk | 2021-03-16 | 248 chat msgs | 4 participants**

Participants: **rauvz**, Deleted User, praxismo, hangtime5246

**Why interesting:** Hardware tuning Q&A with rauvz (hardware/perf specialist). Concrete sens/DPI numbers debated. 2021-03-16. 248 msgs.

**Proposed demo question (paraphrased natural language):**
> What mouse DPI should I use for QuakeWorld? Does higher DPI actually help?

**Questions extracted by the earlier analysis (first 3):**
- <rauvz> wasn't it 400, 800, 1800, 4000?
- <Deleted User> so, could I try 4000 dpi and get ok like 800 dpi ?
- <Deleted User> 3.2 from 16 ?

**Chat excerpt (first 10 lines):**

```
23:46 <rauvz> <@456226577798135808> considering your sens is considerably higher than carapace's you might benefit a little from having a higher dpi if you find
23:47 <rauvz> for me there's no real discernable difference in my gameplay between 400 and 1600 dpi on a glass pad because I don't feel the counting distance as
23:47 <rauvz> but on certain cloth pads due to the higher friction 400 dpi to me is personally really noticeable, and even 800 is
23:47 <rauvz> so I tend to prefer around 1200ish-1800 on *some* cloth pads
23:48 <rauvz> but if I'm looking I can easily tell the difference between an in-game sens of 5.4 at 400 dpi, and 2.7at 800dpi regardless of the pad
23:48 <Deleted User> always read using native dpi is the only way to go
23:48 <rauvz> it's the only way to go if you're using a mouse with a native step
23:49 <rauvz> newer mice like that hyperX mouse don't have native steps
23:49 <rauvz> they do have a native grid size though, but it does't have to use the complete grid and there's some other stuff going on in terms taking the coun
23:49 <rauvz> IIRC the grid is 1600 points on those newer sensors
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H02] session 103264 — Helpdesk Discord

**discord #helpdesk | 2021-02-07 | 345 chat msgs | 6 participants**

Participants: **ciscon**, cooldevice, .foogs, ninjaa8849, **spoike**, macisum

**Why interesting:** Linux CPU performance tuning with ciscon. Technical deep-dive. 2021-02-07. 345 msgs.

**Proposed demo question (paraphrased natural language):**
> My CPU keeps downclocking during QW. I tried changing the performance governor but I'm not sure it's working.

**Questions extracted by the earlier analysis (first 3):**
- <ciscon> had you changed the governor directly by touching files in sys?
- <ciscon> like my "desktop"?
- <.foogs> hey <@!274648596803092480> isnt there a way to write a launcher for <@!209497482592387082> that resets all the nvidia-settings to default eac

**Chat excerpt (first 10 lines):**

```
17:02 <ciscon> sudo i7z
17:03 <cooldevice> what should i be looking for
17:03 <cooldevice> and yeah it appears im using pulseaudio
17:06 <cooldevice> the cores are jumping all over the place
17:06 <ciscon> if you're running ezquake, by default it doesn't yield cpu so it should force the clock all the way up on the core it's running on (at the very l
17:07 <cooldevice> i haven't ran ez yet because i need to compile it from source. This is like a general issue im dealing with atm. I'm using quake 3 and csgo a
17:08 <cooldevice> like i said, it worked totally fine, then i rebooted and im back with this problem
17:08 <ciscon> right, so i'd use the performance governor
17:08 <cooldevice> two distros, so something is bothering it
17:08 <ciscon> had you changed the governor directly by touching files in sys?
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H28] session 104570 — Helpdesk Discord

**discord #helpdesk | 2021-08-03 | 179 chat msgs | 4 participants**

Participants: youknowhowitgo, **ciscon**, Deleted User, ginzberg

**Why interesting:** OSX install question. Platform-specific getting-started. 2021-08-03. 179 msgs.

**Proposed demo question (paraphrased natural language):**
> I installed nQuake on macOS Catalina but I can't figure out how to actually run it.

**Questions extracted by the earlier analysis (first 3):**
- <youknowhowitgo> however, I am unsure how to run it after installing?
- <youknowhowitgo> but nothing happens?
- <Deleted User> ???

**Chat excerpt (first 10 lines):**

```
02:53 <youknowhowitgo> I downloaded the nquake installer for OSX catalina
02:54 <youknowhowitgo> however, I am unsure how to run it after installing?
02:54 <youknowhowitgo> I click on the ezQuake Application
02:54 <youknowhowitgo> but nothing happens?
02:58 <ciscon> <@456226577798135808> hud_editor
02:59 <ciscon> <@!323275641053249537> you need to throw the pak files somewhere inside of the app directory structure, resources something something
03:02 <Deleted User> ???
03:02 <ciscon> /hud_editor
in the console
03:03 <ginzberg> i can help the mac person
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## [H14] session 104553 — Helpdesk Discord

**discord #helpdesk | 2021-07-31 | 214 chat msgs | 2 participants**

Participants: **ciscon**, clonk1456

**Why interesting:** ARM/Pi performance deep-dive with ciscon. Shows /sys/devices diagnostics. 2021-07-31. 214 msgs.

**Proposed demo question (paraphrased natural language):**
> Does the Raspberry Pi actually stay at max CPU frequency with the performance governor? How do I check?

**Questions extracted by the earlier analysis (first 3):**
- <clonk1456> can I write to those files like that?
- <clonk1456> it’s also reading it?
- <clonk1456> Should I do min_freq or cur?

**Chat excerpt (first 10 lines):**

```
03:28 <ciscon> yeah, the performance governor "should" keep it all the way up, but especially with the pi, it's really up to the hardware- forcing the clock wil
03:28 <ciscon> % sudo cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_cur_freq 
1500000
03:29 <ciscon> setting the min frequency to the max "might" do it if you want an immediate solution, i don't even remember if i tried that
03:29 <clonk1456> Hmm
03:30 <ciscon> (that's really what the performance governor should be accomplishing)
03:31 <clonk1456> can I write to those files like that?
03:31 <ciscon> yeah, if you're root
03:32 <clonk1456> I thought the system was writing to it
03:32 <ciscon> that is if the cpufreq driver being used allows it and it's a valid value
```

**Verdict:** _mark WINNER / SKIP / MAYBE_

---

## What happens after you mark

1. I take the WINNER list.
2. For each, I run the proposed demo question through the live MCP (`lookup_entity` / `search_solved_issues` / `get_concept_note`) with no skill guidance, and save the raw response.
3. We review: does the MCP surface the right session in top-3? Does the answer land?
4. Sort questions into 2-3 natural answer shapes (entity lookup / troubleshoot / historical / etc).
5. Draft one MCP prompt per shape. Re-run. Compare baseline vs skilled.
6. The 3-4 best end up as the rehearsed demo for vikpe/infiniti. The skill/prompt delta is itself part of the pitch.