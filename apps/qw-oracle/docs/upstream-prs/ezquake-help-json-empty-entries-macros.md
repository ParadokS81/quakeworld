# ezQuake help-JSON empty-entries audit -- macro pass (2026-05-15)

Output of the parking-doc audit at `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md`. This is the **macro** pass following the cvar pass (2026-05-14) and command pass (2026-05-15). Scope: client-side ezQuake macros that exist in current source HEAD AND have no human-written prose in `help_macros.json`. `sv_*`-source-file filter applied (none matched for macros).

## Counts

| Verdict | Count | Notes |
|---|---|---|
| `needs_doc` | 36 | 34 high confidence, 2 low (legacy mp3 orphans) |
| `no_doc` | 0 | -- |
| `family_collapse` | 2 rows / 1 family | `team1`/`team2` shape-A pair (head in queue) |
| `kick_to_ciscon` | 0 | -- |
| **Total** | **38** | matches queue size |

The macro surface is relatively clean: nearly all macros have readable handler functions, most return a single scalar value, and the majority are teamplay-focused (teamplay.c dominates at 28 of 38 entries). Two entries (`mp3info`, `mp3_volume`) are legacy orphans from the mp3 player subsystem deleted in 2019 -- their macro IDs survive in `macro_ids.h` but handlers are no longer registered.

---

## Family collapse (1 family covering 2 entries)

### `team1` (covers 2 siblings)

**Members:** `team1`, `team2`
**Shape:** A (enumeration -- index 0 vs 1 of `Macro_TeamPick(N)`)
**Augmented head description (paste into help_macros.json `team1` entry):**
> Name of the Nth team (alphabetically sorted) visible in the current match: $team1 returns the first team name, $team2 returns the second. Teamplay-restricted.

**Reasoning:** `Macro_Team1` and `Macro_Team2` both delegate to `Macro_TeamPick(N, default)` with N=0 and N=1 respectively, differing only by the index argument. Shape A confirmed: one sentence covers both members with only the index varying. Both are `system-generated: true` in `help_macros.json` with no existing description. `team1` is head.

---

## needs_doc -- high confidence (34 entries)

### teamplay.c (26 entries)

**`$colored_short_powerups`**
> Current powerups held, as compact color-coded initials: `&c03f`q`&r` for quad, `&ce00`p`&r` for pent, `&cff0`r`&r` for ring. Returns empty string when no powerups are held.

**`$colored_powerups`**
> Current powerups held as color-coded full names (quad, pent, ring), concatenated without separator.

**`$dateiso`** _(teamplay-restricted)_
> Current local date and time in ISO-adjacent format YYYY-MM-DD_HH-MM. Teamplay-restricted.

**`$deathloc`**
> Map location name where the player last died, or tp_name_someplace if no death has been recorded this session.

_Note: unlike `$lastloc`, always returns the death location regardless of elapsed time since death._

**`$lastip`** _(teamplay-restricted)_
> IP address or hostname:port of the last server seen in console output, captured by an internal trigger pattern. Teamplay-restricted.

_Note: backing global has a `// FIXME: remove it` comment but macro is fully functional; FIXME refers to internal storage pattern, not behavior._

**`$lastloc`**
> Location name at time of last death if death occurred within the past 5 seconds; otherwise current location name.

_Note: 5-second time guard distinguishes this from `$location` (always current) and `$deathloc` (death location regardless of elapsed time)._

**`$lastpowerup`**
> Powerups last seen on the enemy within the past 5 seconds (e.g. "quad pent"), or "quad" as default when no recent sighting is available.

_Note: stale (>5s) sightings fall back to `tp_name_quad` rather than empty string -- document this default behavior explicitly._

**`$latency`** _(teamplay-restricted)_
> Current network latency in milliseconds, rounded to nearest integer. Teamplay-restricted.

_Note: `$ping` is a registered alias pointing to the same `Macro_Latency` handler._

**`$ledpoint`**
> LED color code indicating the type of entity the player is pointing at: red for enemy, green for teammate, yellow for powerup, blue for item.

**`$ledstatus`**
> LED color code reflecting how many items the player currently needs: green for nothing needed, yellow for one item, red for two or more items.

**`$location`**
> Name of the player's current map location, as defined by the active .loc file.

**`$need`**
> Separator-delimited list of items the player currently needs based on tp_need_* thresholds (e.g. "armor health rl").

**`$ping`** _(teamplay-restricted)_
> Current network latency in milliseconds, rounded to nearest integer. Alias for $latency. Teamplay-restricted.

**`$point`**
> Name of the nearest item or entity the player is pointing at, as used in location-pointing messages.

**`$pointatloc`**
> Pointed-at item name combined with its location, in "name at location" format, with a timeout guard.

**`$pointloc`**
> Map location name of the entity the player is pointing at, or current location if no specific point location is available.

**`$powerups`**
> Separator-delimited list of powerups currently held (quad, pent, ring, flag), or tp_name_none if none.

_Note: unlike `$colored_powerups`, uses plain `tp_name_*` strings with separator, no inline color codes. Also covers CTF/TF flag items via EF_FLAG1/EF_FLAG2/IT_KEY1/IT_KEY2._

**`$tf_skin`** _(teamplay-restricted)_
> Current player's skin name, with TeamFortress skin prefixes expanded to full class names (e.g. tf_demo -> demoman, tf_eng -> engineer). Teamplay-restricted.

**`$timestamp`** _(teamplay-restricted)_
> Current local date and time as a compact filesystem-safe string: YYYYMMDD-HHMM. Teamplay-restricted.

**`$took`**
> Name of the last item picked up, or tp_name_nothing if no item has been picked up yet.

**`$tookatloc`**
> Last item picked up with its pickup location, in "name at location" format.

**`$tookloc`**
> Map location name where the last item was picked up.

**`$triggermatch`** _(teamplay-restricted)_
> Full text of the console message that last fired a regexp trigger. Teamplay-restricted.

**`$weapon`** _(teamplay-restricted)_
> Name of the currently active weapon, using tp_name_* cvar values (e.g. "rl", "lg"). Teamplay-restricted.

_Note: returns name string, not a number -- compare `$weaponnum`._

**`$weaponnum`** _(teamplay-restricted)_
> Currently active weapon as a slot number (1-8), or pre-selected best weapon number when cl_weaponpreselect is enabled. Teamplay-restricted.

**`$weapons`**
> Separator-delimited list of all weapons currently held, ordered from strongest to weakest (lg, rl, gl, sng, ng, ssg, sg, axe).

---

### cl_main.c (6 entries)

_All 6 are teamplay-restricted._

**`$conheight`** _(teamplay-restricted)_
> Console (virtual) resolution height in pixels. Teamplay-restricted.

**`$conwidth`** _(teamplay-restricted)_
> Console (virtual) resolution width in pixels. Teamplay-restricted.

_Note: conwidth/conheight differ by axis (width vs height), not by enumeration index -- Shape A family_collapse explicitly excluded._

**`$demotime`** _(teamplay-restricted)_
> Current demo playback time in seconds (float, scaled by cl_demospeed). Intended for scripted and timed camera movement. Teamplay-restricted.

**`$matchstatus`** _(teamplay-restricted)_
> Current match state: "disconnected", "standby", or "normal". Teamplay-restricted.

_Note: handler is `CL_Macro_Serverstatus` (not "matchstatus"). Returns one of three fixed string literals based on `cls.state` and `cl.standby`._

**`$rand`** _(teamplay-restricted)_
> Random float in the range [0, 1). Teamplay-restricted.

**`$serverip`** _(teamplay-restricted)_
> Current server IP address and port. Teamplay-restricted.

_Note: format is `ip:port` string from `NET_AdrToString(cls.server_adr)` -- port is included._

---

### match_tools.c (2 entries)

_Both are teamplay-restricted._

**`$matchname`** _(teamplay-restricted)_
> Current match name, derived from the active match-format template (e.g. "duel/playerA_vs_playerB - [dm6]"). Returns "No match in progress" when not connected. Teamplay-restricted.

_Note: handler expands the `match_format_<type>` cvar template (e.g. `match_format_duel = "duel/%n - %p%v%e - [dmm%D] - [%M]"`). The result is a format-expanded composite string, not a simple key -- distinct from `$matchtype`._

**`$matchtype`** _(teamplay-restricted)_
> Current match type keyword (e.g. "duel", "2on2", "3on3", "tdm", "ffa", "arena", "tfduel", "tfclanwar", "solo", "coop", "race"). Returns "No match in progress" when not connected. Teamplay-restricted.

_Note: fixed vocabulary of 14 possible strings from `matchcvars[]` table -- useful to enumerate explicitly for scripting consumers._

---

## needs_doc -- low confidence (2 entries, legacy orphans)

These macros have `source_file: null` because `mp3_player.c` was deleted wholesale in commit `ae8b552f` ("MP3 PLAYER: Remove functionality", 2019-03-05). Macro IDs survive in `macro_ids.h` as dead enum entries; no handler is registered at runtime.

**Decision required for ciscon:** do these entries warrant a deprecation note in `help_macros.json`, or should they be removed from the JSON entirely (since the subsystem no longer exists)?

**`$mp3info`** _(legacy -- handler unregistered since 2019)_
> Title of the currently playing MP3 track. Legacy macro; the MP3 player subsystem was removed in 2019 (commit ae8b552f). Macro ID retained in macro_ids.h but handler is no longer registered at runtime.

_Original behavior: `MP3_Macro_MP3Info` read the current track title from the Winamp window title bar. Confidence low: recovered from git history._

**`$mp3_volume`** _(legacy -- handler unregistered since 2019)_
> Volume level of the MP3 player as a decimal fraction (0.0-1.0). Legacy macro; the MP3 player subsystem was removed in 2019 (commit ae8b552f). Macro ID retained in macro_ids.h but handler is no longer registered at runtime.

_Original behavior: `Media_GetVolume_f` returned a float string normalized from Winamp's 0-255 IPC volume scale. Confidence low: recovered from git history._

---

## Cross-references

- `$latency` and `$ping` are aliases (same handler). Both entries are in the queue; both need doc. Recommend the `$ping` entry explicitly cross-reference `$latency` as canonical.
- `$took` / `$tookloc` / `$tookatloc` form a named triplet (item name / location / combined). Descriptions reference the other two members for orientation.
- `$location` / `$deathloc` / `$lastloc` overlap in semantics. The critical distinctions: `$location` is always-current; `$deathloc` is always-death (no time guard); `$lastloc` is death-within-5s then falls back to current.
- `$point` / `$pointloc` / `$pointatloc` form a parallel triplet for pointed-at-entity information.
- `$weapon` (name) vs `$weaponnum` (slot number) should cross-reference each other.
