# Identity Seeds -- Confirmed Player Aliases

## How This File Works

Each cluster is a confirmed real person with all their known in-game names. These are **ground truth** -- confirmed by community knowledge (ParadokS) and validated by co-occurrence checks (never appeared in the same game).

Format:
```
### Display Name
- `name1` (games) -- context
- `name2` (games) -- context
Co-occurrence: [OK] All verified (no shared games)
Source: community / automated / wiki
```

When we build the `player_identities` / `player_aliases` tables, this file is the seed data.

---

## Confirmed Clusters

### tco (TheChosenOne)
Norwegian. Core oeks (axemen) player since 2023.
- `tco.........axe` (1,160) -- main oeks format
- `tco` (105) -- without clan suffix
- `tco.........nor` (2) -- nor suffix variant
- `tco........waxo` (1) -- waxo variant
- `tco.........axe name tco.......` (1) -- formatting glitch

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,269 games

---

### tim / timmi
Oeks (axemen) player, also plays in other teams.
- `tim.........axe` (1,030) -- main oeks format
- `timmi` (80) -- alternate name
- `t1mm1` (67) -- leetspeak variant
- `tim.........nor` (2) -- nor suffix
- `tim` (1) -- short form
- `- timmi` (1) -- decorated

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,181 games

---

### shazam / shaka
HX (Hell Express) player. Uses many anagram/variant names.
- `shazam` (1,056) -- primary name
- `zamsha` (149) -- anagram of shazam
- `shaka` (63) -- alternate name
- `szm` (62) -- abbreviation
- `5hazam` (54) -- leetspeak variant
- `sha` (1) -- shortest form

**NOT the same person as `sham`** -- co-occurred in 16 games. `sham` and `sham-dc` are different people.

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,385 games

---

### realpit / medic
HX player. High efficiency (63-67%), 10k+ damage. Switched from "medic" to "realpit" around Apr 2024.
- `realpit` (896) -- current primary name
- `medic` (187) -- previous name (Oct 2023 - Apr 2024 on HX)
- `(1)realpit` (11) -- team number prefix
- `(1)medic` (1) -- team number prefix
- `medico` (1) -- variant

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,096 games

---

### hmm / himmu
Finnish player. Active in 'tro and mix scene. Switched from "hmm" to "himmu" around Sep 2025.
- `hmm` (796) -- primary name (Jul 2023 - Sep 2025)
- `himmu` (267) -- current name (Sep 2025+)
- `hmmph` (12) -- variant

Co-occurrence: [OK] All verified
Source: community (ParadokS -- "it COULD be himmu, a Finnish player")
Confidence: High (never co-occurred, temporal succession, both Finnish scene)
Total: ~1,075 games

---

### paradoks (ParadokS)
The curator of this project. Long-time player, consistent naming.
- `- paradoks` (1,839) -- primary name
- `- paradoks -` (20) -- double bullet variant
- `tot_paradoks` (6) -- tot clan prefix format
- `- paradoksi` (1) -- Finnish-ified variant

Co-occurrence: [OK] (implicit -- same person filing this document)
Source: self-identified
Total: ~1,866 games

---

### hooraytio (hto)
-fu- core player. Known as hooraytio in the community.
- `hto =fu=` (867) -- primary name (Feb 2024+)
- `fu-hto` (230) -- old fu tag format (Apr 2022 - Jan 2024)
- `anza-hto` (5) -- paired name with anza
- `hto.skogsmaskin` (5 on oeks) -- standin for oeks

Co-occurrence: [OK] Implicit (tag format change, same clan)
Source: community (ParadokS)
Total: ~1,107 games (on fu tag)

---

### rusti
-fu- core player.
- `rusti =fu=` (763) -- primary name (Jan 2024+)
- `fu-rusti` (183) -- old fu tag format (Apr 2022 - Jan 2024)
- `(1)rusti =fu=` (3) -- team number prefix
- `rusti` (2) -- plain

Co-occurrence: [OK] Implicit (tag format change, same clan)
Source: community (ParadokS)
Total: ~951 games

---

### anza
-fu- core player. 62 years old. One of the most active mix scene players (3,387 games total, 81 team tags).
- `anza =fu=` (623) -- primary name (Feb 2024+)
- `fu/anza` (75) -- old fu tag format (Apr 2022 - Jan 2024)

Co-occurrence: [OK] Implicit (tag format change, same clan)
Source: community (ParadokS)
Total: ~698 games (on fu tag, many more on mix)

---

### rgh
-fu- core player.
- `rgh =fu=` (499) -- primary name (Feb 2024+)
- `fu-rgh` (159) -- old fu tag format (May 2023 - Jan 2024)
- `rghst` (29) -- "rgh standin" format

Co-occurrence: [OK] Implicit (tag format change, same clan)
Source: community (ParadokS)
Total: ~687 games

---

### kip / kippo
-fu- core player. Changed from kip to kippo around Aug 2025.
- `kip =fu=` (238) -- earlier name (Feb 2024 - Jun 2025)
- `kippo =fu=` (128) -- current name (Aug 2025+)
- `fu-kip` (93) -- old fu tag format (Apr 2022 - Jan 2024)
- `kippo` (2) -- plain

Co-occurrence: [OK] Temporal succession within same clan
Source: community (ParadokS)
Total: ~461 games

---

### slaughter
-fu- player. Uses many abbreviated forms.
- `slaugh=fu=` (229) -- primary abbreviation (Feb 2024 - Sep 2025)
- `fu-slaughter` (43) -- old fu tag format (Oct 2023 - Jan 2024)
- `fu-sla` (19) -- short form (Apr 2022 - Jan 2024)
- `sla =fu=` (11) -- short form, new tag format (Feb 2024)
- `fu-slaktarn` (4) -- Swedish for "the slaughterer" (Jan 2024)
- `slaughter[ssc]` (1) -- with ssc clan tag

Co-occurrence: [OK] Implicit (same clan, temporal succession)
Source: community (ParadokS)
Total: ~307 games

---

### xunito / overflow
-fu- standin, also plays on tot. Formerly known as overflow.
- `xunito` (611) -- current primary name
- `- xunito` (347) -- bullet prefix
- `tot_xunito` (70) -- tot clan prefix
- `overflow` (65) -- previous name
- `- overflow` (19) -- bullet prefix, old name
- `/xunito` (7) -- slash prefix
- `xunito =fu=` (4) -- fu tag format
- `fu-nito` (3) -- old fu tag format
- `/overflow` (3) -- slash prefix, old name

Co-occurrence: [OK] All verified (no shared games between xunito and overflow variants)
Source: community (ParadokS)
Total: ~1,129 games

---

### hangtime
Active mix player, standin for -fu-.
- `hangtime` (673) -- primary name
- `hangunit-ime` (12) -- variant/glitched name

Co-occurrence: [OK] Never in same game
Source: community (ParadokS)
Total: ~685 games

---

### lgh
-fu- standin. Only 6 games on fu tag, Jan 2024.
- `fu-lgh` (3) -- fu tag format
- `lghst` (3) -- "lgh standin" format

Note: NOT the same as rgh despite similar name pattern.
Source: community (ParadokS)
Total: ~6 games (on fu tag)

---

### diki
Finnish player. Originally from tVS (The Viper Squad, legendary Finnish clan founded 1997 -- predates our data window). Played as `[tVS]Diki` historically. In our data: Commands (`com`, 112 games) -> `bb` (110) -> Black Book (`book`, 68). Standin for -fu- (30 games). No aliases needed -- just `diki` everywhere in 2022-2026 data.

Note: `com` team tag = Commands/tVS successor clan (also had Milton, xantom, martin, xterm, henu).

Source: community (ParadokS) + wiki
Total: ~570+ games

---

### ok98
HX player. Previously played under `-s-` (Sudden Death). Also stands in widely (tsq, tot, fu, d2, etc.).
- `ok98` -- single name, no variants

Clans: `-hx-` (266) -> `[hx]` (192), `-s-` (2), plus heavy mix scene.
Source: community (ParadokS)
Total: ~1,000+ games

---

### dobezz
'tro player.
- `dobezz` (319) -- primary (with double z)
- `dobez` (68) -- single z variant

Co-occurrence: [OK] Never in same game
Source: community (ParadokS)
Total: ~387 games

---

### gore
'tro player. Also uses `gt-` prefix.
- `gt-gore` (205) -- with gt prefix (current)
- `gore` (184) -- plain
- `(1)gt-gore` (1) -- team number prefix

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~390 games

---

### ocoini
'tro core player.
- `ocoini` (892) -- primary
- `(1)ocoini` (1) -- team number prefix
- `ocojini` (1) -- typo variant
- `ococooii` (1) -- garbled variant

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~895 games

---

### robin
'tro player. Uses various decorated forms.
- `robin` (1,585) -- primary
- `jacorobin` (9) -- prefix variant
- `[r0b1n=6` (4) -- leetspeak
- `coronarobin` (3) -- prefix variant
- `rustyrobin` (1) -- prefix variant

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,602 games

---

### tumult
'tro and d2 player.
- `tumult` (804) -- primary
- `d2-tumult` (200) -- d2 clan prefix
- `tulumultulus` (3) -- joke/extended name

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,007 games

---

### anni
'tro player.
- `anni` (350) -- primary
- `anniagua` (6) -- joke mashup with paniagua (but NOT paniagua -- co-occurred with paniagua 5 times)
- `annihilazor` (3) -- extended joke name

Co-occurrence: [OK] All anni variants verified
Source: community (ParadokS)
Total: ~359 games

---

### velocity / velo
'tro standin.
- `velocity` (25) -- primary
- `velo` (7) -- shortened

Co-occurrence: [OK] Never in same game
Source: community (ParadokS)
Total: ~32 games

---

### macler
]sr[ core player. Uses bullet prefix and various joke names.
- `macler` (970) -- primary
- `- macler` (44) -- bullet prefix
- `- mc` (41) -- abbreviated
- `- crazy macler` (11) -- joke name (pun on old "crazymac" from Slackers)
- `(1)macler` (1) -- team number prefix

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~1,067 games

---

### phren
]sr[, tot, and tsq player. Many name variants, all verified.
- `phren` (325) -- plain
- `tot_phren` (317) -- tot clan prefix
- `- phren` (244) -- bullet prefix (on ]sr[)
- `phren_of_wine` (48) -- joke name
- `phrenic` (14) -- extended form
- `? phren` (9) -- question mark prefix
- `phren_test` (2) -- test name
- `tot_phrenic` (2) -- tot + phrenic
- `phren_of_fu` (1) -- fu standin

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~962 games

---

### niw
]sr[ core player. Good friends with mazer -- they troll each other's names.
- `- niw` (169) -- bullet prefix (on ]sr[)
- `niw` (339) -- plain
- `- niw-tele-cam` (1) -- joke name (likely mazer trolling, passes co-occurrence)

Source: community (ParadokS)

---

### mutilator
tsq core player. High efficiency (58-70%). Uses various joke names.
- `mutilator` (385) -- primary
- `mutilator_of_tsq` (21) -- clan-tagged variant
- `dramalator` (10) -- joke variant
- `smutilator` (3) -- joke variant
- `mutilator!` (1) -- decorated

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~420 games

---

### nas / nastic
tsq core player.
- `nas` (610) -- primary (short form)
- `nastic` (176) -- extended form

Note: `enas` (176), `nasander` (136), `nasa` (17) are DIFFERENT people -- co-occurred with nastic.
Co-occurrence: [OK] nas <-> nastic verified
Source: community (ParadokS)
Total: ~786 games

---

### djevulsk
tsq core player.
- `djevulsk` (580) -- primary
- `drunkulsk` (1) -- drunk joke variant

Source: community (ParadokS)
Total: ~581 games

---

### blixem
tsq/mix player. Multiple abbreviated forms.
- `blixem` (93) -- primary
- `blx` (80) -- abbreviated
- `blxm` (48) -- abbreviated
- `blxcop` (4) -- joke variant

Co-occurrence: [OK] All verified
Source: community (ParadokS)
Total: ~225 games

---

### wimpeh (NEEDS FULL CURATION)
Notorious name changer. Partial list of variants (top 10 by games):
- `wimsuit` (390) -- avg ping 25ms
- `wimbian` (71) -- avg ping 17ms
- `stepwim` (34) -- avg ping 15ms
- `step-wim` (2) -- hyphenated variant (seen on tsq)
- `wimppie` (14) -- avg ping 22ms
- `wimposter` (14) -- avg ping 28ms
- `wim95man` (13) -- avg ping 26ms
- `wimpeeh` (9) -- avg ping 24ms
- `wimtoxicated` (7) -- avg ping 29ms
- `wimensrights` (6) -- avg ping 23ms
- `cerawimic` (6) -- avg ping 21ms

Note: Likely many more variants. Needs dedicated curation pass. Ping typically 15-29ms.
Source: community (ParadokS identified as prolific name changer)

---

## Confirmed But Not Yet Fully Explored

### coj
- `coj` (1,829) -- primary
- `c0j` (11) -- leetspeak

Source: automated (exact core name match)
Total: ~1,840 games

### peppe
- `peppe` (1,202) -- primary
- `p3pp3` (43) -- leetspeak
- `- peppe -` (13) -- decorated

Source: automated (exact core name match)
Total: ~1,258 games

### grisling
- `- grisling` (645) -- bullet prefix
- `grisling` (403) -- plain
- `gr1sl1ng` (4) -- leetspeak

Source: automated (exact core name match)
Total: ~1,052 games

### cronus
- `cronus` (1,129) -- primary
- `cr0nus` (3) -- leetspeak

Source: automated (exact core name match)
Total: ~1,132 games

### dusty
- `dusty` (717) -- primary
- `du$ty` (9)
- `dus7y` (5)
- `du5ty` (5)

Source: automated (exact core name match)
Total: ~736 games

### andeh
- `andeh` (522) -- primary
- `4nd3h` (43) -- leetspeak

Source: automated (exact core name match)
Total: ~565 games

### chris
- `chr1s` (293) -- leetspeak primary
- `chris` (38)
- `]chris[` (3)
- `chri$` (1)
- `chr1$` (1)

Source: automated (exact core name match)
Total: ~336 games

### irn
- `irn` (1,536) -- primary
- `[irn]` (23) -- bracketed

Source: automated (exact core name match)
Total: ~1,559 games

### zero
- `- zero` (1,387) -- primary
- `zero` (7) -- plain

Source: automated (exact core name match)
Total: ~1,394 games

### riki
- `riki` (1,332) -- primary
- `-riki-` (19) -- dashed

Source: automated (exact core name match)
Total: ~1,351 games

### hmr
- `hmr` (1,114) -- primary
- `- hmr` (20) -- bullet

Source: automated (exact core name match)
Total: ~1,134 games

### mille
- `mille` (1,051) -- primary
- `- mille` (36) -- bullet

Source: automated (exact core name match)
Total: ~1,087 games

### macler
- `macler` (970) -- primary
- `- macler` (44) -- bullet

Source: automated (exact core name match)
Total: ~1,014 games

---

## Clan Tag Aliases (Same Organization)

| Real Clan | Tags Used | Notes |
|-----------|-----------|-------|
| Hell Express (HX) | `-hx-`, `[hx]` | Tag changed ~Aug 2025 |
| Axemen (oeks) | `oeks` | Norwegian. Players use `.........axe` name suffix |
| Fraggers United (fu) | `-fu-`, `fu-X` (old), `X =fu=` (new) | Tag format changed Jan 2024 |

---

## Known Different People (Cannot-Link from Co-occurrence)

These names LOOK similar but appeared in the same game = confirmed different players:

| Name A | Name B | Shared Games | Notes |
|--------|--------|-------------|-------|
| shazam | sham | 16 | Different people despite name similarity |
| shazam | sham-dc | 24 | sham on DC clan is also different |
| paniagua | anniagua | 5 | anniagua = anni, not paniagua |
| paniagua | panini | 2 | panini is a different person |
| nastic | enas | 3 | enas is "sane", American player |
| nastic | nasander | 4 | Different person |
| nastic | nasa | 3 | Different person |
| mushi | - musi | 1 | Different people |
| gor | gore | ? | Need to check -- both on HX |
| pre.........axe | pred | ? | Need to check |

---

## Clans Curated

- [x] oeks (axemen) -- core roster identified
- [x] -hx- / [hx] (Hell Express) -- roster explored, shazam cluster confirmed
- [x] -fu- -- core roster identified, tag format changed fu-X -> X =fu= in Jan 2024
- [x] 'tro -- mix-heavy clan, core roster + aliases identified
- [x] ]sr[ -- ParadokS's clan, core roster confirmed, macler cluster expanded
- [x] tsq -- core roster confirmed, mutilator/nas/phren/blixem clusters expanded
- [ ] tot -- 647 games, 77 names
- [ ] -s- -- 626 games, 23 names
- [ ] sk -- 623 games, 23 names
- [ ] 3b -- 571 games, 30 names
- [ ] koff -- 546 games, 15 names
- [ ] made -- 458 games, 91 names
- [ ] book -- 366 games, 27 names
- [ ] dc -- 334 games, 61 names
- [ ] d2 -- 290 games, 39 names

---

## Questions for Next Curation Session

From oeks roster -- ParadokS to confirm:
- `stepcop` (4 games oeks) -- is this `cop.........axe`?
- `carapace` (3 games oeks) -- standin or alias?
- `hto.skogsmaskin` (5 games oeks) -- hooraytio (confirmed fu member) standing in for oeks?
- `pep.........axe` (3 games oeks) -- is this peppe?
- `spl.........axe` (12 games oeks) -- is this splash?
- `try.........axe` (20 games oeks) -- who?
- `shah` (2 games oeks) -- another shazam variant?
- `wm..........axe` (2 games oeks) -- who?
- `and.........axe` (10 games oeks) -- andeh?

From HX:
- `zamsha` confirmed as shazam alias -- [OK]
- `szm` confirmed as shazam alias -- [OK]
- `bowser` (6 games [hx]) -- who?
- `unnamed` (6 games [hx], 63% eff) -- who? Good stats.
- `raket` vs `rocket` on -hx- -- same person?

From hmm/himmu:
- Confidence is "high" not "confirmed" -- ParadokS said "COULD be himmu"
- Need final confirmation or more evidence
