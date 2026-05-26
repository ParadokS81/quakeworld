# ktx-l1-rewrite drafts -- batch 2026-05-27 (Demo & spectator)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies clean
drafts, hand-edits flagged drafts after verifying the surfaced contradiction.
Drafts do NOT auto-apply to L1 (`entities.description`); the apply pass is a
separate phase.

Batch totals: 69 entities. 60 drafted clean + 9 drafted_with_flag + 0 parked.

Anchor: v1.36-1633-g67253dc

Sub-grouping: cards are organized into 6 sub-groups by behavioral family
(cvars / generic-fav / favN_add / Nfav_go / spec-automation / demo-nav-and-trex),
not alphabetically. Canonical-card pairs are grouped together for apply-pass review.

---

## Sub-group 1: Demo & spectator cvars (10)

## _k_nospecs (KTX cvar, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/world.c:785 (registration); src/vote.c:929,954 (write sites); src/spectate.c:125, src/coach.c:79 (read sites)
- **Catalog line**: 1546
- **Anchor**: v1.36-1633-g67253dc

### Current description

> No-spectators mode toggle. When active, incoming spectator connections are refused; exceptions are whitelisted VIP spectators and coaches. A coach demoted while this is active is disconnected. Automatically cleared to 0 when 10 seconds pass with no match in progress and no players on the server.
>
> 0 = spectators may connect normally.
> 1 = spectator connections refused (VIPs and coaches excepted).
>
> Default: 0.
> Set by: 'nospecs' admin command or vote.

### Shape classification

shape-less

`_k_nospecs` is the vote-result state container for the `nospecs` vote. The Shape 7b pattern (continuous toggle vote) lives on the `nospecs` command card. `_k_nospecs` itself is written only by the vote-resolution function (`vote_check_nospecs` via `cvar_fset`) and by the engine auto-clear function (`FixNoSpecs` via `cvar_set "0"`). The user never writes it directly; the `nospecs()` handler writes only `self->v.nospecs` (the per-player vote flag). This is the state-result cvar for a Shape 7b vote, not a Shape 9b pure engine mirror (the vote path is user-initiated) and not a Shape 3 server-config cvar (it is not server.cfg state). The shape tag belongs on the `nospecs` command card; `_k_nospecs` is a leaf/result.

### Proposed draft

```
Engine-managed state flag that records whether the no-spectators vote has passed. When set, incoming spectator connections are refused; VIP-whitelisted spectators and coaches are exempted. A coach who is demoted while this flag is active is immediately disconnected. Automatically cleared when 10 or more seconds pass with no match in progress and no players on the server.

0 = spectators may connect normally.
1 = spectator connections refused (VIPs and coaches excepted).

Permission:    Not user-settable directly. Written by the 'nospecs' vote when it passes (or by admin veto); cleared automatically by the engine when the server empties.
Match-state:   Written pre-match only (vote resolution is blocked mid-match); read at all times.
Default:       0.

Example:
  # In server.cfg, leave unset or set to 0; the vote system manages this at runtime.
  # Players invoke the 'nospecs' command to cast or withdraw their vote.

See also: nospecs (vote command that drives this state), k_vp_nospecs (vote threshold percentage)
```

### Notes

- FLAG: Existing description says "Set by: 'nospecs' admin command or vote." The `nospecs` command is registered `CF_PLAYER | CF_SPC_ADMIN` (any player or admin spectator), not admin-only. The "admin command" label is incorrect. Any player can run `nospecs` to cast or withdraw a vote; an admin's vote counts as a veto (solo threshold). Apply-pass author should verify the permission language is corrected.
- FLAG: Existing description says _k_nospecs is "set by ... 'nospecs' ... command" but the nospecs() handler writes only the per-player vote flag (`self->v.nospecs`), not `_k_nospecs` directly. `_k_nospecs` is written by the vote-resolution function after threshold is reached. The framing "set by the command" is technically inaccurate but the behavioral effect (typing nospecs can change this value) is correct.
- The underscore prefix is load-bearing: the registration comment says "internal usage, will reject spectators connection". This cvar is not intended as a server.cfg knob; it is vote-managed at runtime.
- Auto-clear condition (vote.c:926): `(g_globalvars.time > 10) && !match_in_progress && !CountPlayers() && cvar("_k_nospecs")` -- engine resets this to 0 when server is empty post-match.

---

## allow_spec_wizard (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:820 (registration); src/spectate.c:46 (read site in GetSpecWizard)
- **Catalog line**: 1301
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether spectators may use the free-roaming "wizard" camera. Wizards are always disabled during a live match, intermission, and race mode.
>
> 0 = spectator wizards never allowed.
> 1 = allowed only when there are no players on the server.
> 2 = allowed in prematch even when players are present.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvar("allow_spec_wizard")` at world.c:820 with no paired `cvar_toggle_msg` or `cvar_fset` command. The sole read site is `GetSpecWizard()` in spectate.c:46 which applies internal match-state gates independently of the cvar.

### Proposed draft

```
Sets the conditions under which spectators may use the free-roaming wizard camera for a spectator camera point. Wizards are always disabled during a live match, intermission, and race mode regardless of this setting.

0 = wizard camera never available.
1 = wizard camera allowed only when no players are on the server.
2 = wizard camera allowed in prematch even when players are present.

Permission:    server config only
Default:       0.

Example:
  # Allow wizard cameras in prematch for populated servers:
  allow_spec_wizard 2

See also: k_no_wizard_animation (controls whether the wizard model animates)
```

### Notes

- Clean recast. Existing description is accurate; content moved into v2 skeleton with Effect as value enum.
- The match-state enforcement (disabled during live match / intermission / race) is implemented in `GetSpecWizard()` at spectate.c:47-58 internally, not by checking the cvar -- the function returns 0 unconditionally in those states. This is a behavioral note for L1: the cvar has no effect during live play regardless of its value.

---

## demo_scoreslength (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:850 (registration, default "10"); src/client.c:690 (read site in execute_changelevel)
- **Catalog line**: 1333
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Number of seconds the end-of-game score table is displayed before the server changes to the next level. The enforced delay is 1 + max(1, demo_scoreslength), so values below 1 are treated as 1.
>
> Range: 0+ (seconds).
>
> Default: 10.
> Set by: server config only.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvarEx("demo_scoreslength", "10")` at world.c:850; read at client.c:690 as `g_globalvars.time + 1 + max(1, cvar("demo_scoreslength"))`. No `cvar_toggle_msg` or `cvar_fset` call.

### Proposed draft

```
Number of seconds the end-of-match scoreboard is displayed before the server changes to the next level.

The effective delay is 1 + max(1, demo_scoreslength), so values below 1 are silently treated as 1. Minimum enforced wait is always 2 seconds (1 + max(1, 0)).

Permission:    server config only
Default:       10.

Example:
  # Show scoreboard for 15 seconds before map change:
  demo_scoreslength 15
```

### Notes

- Clean recast. No contradictions. The formula behavior (1 + max(1, value)) is preserved from existing description and verified against client.c:690.
- No See-also added: no paired commands or direct dependency cvars at this site.

---

## demo_skip_ktffa_record (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:937 (registration, no default = 0); src/match.c:2367 (read site in StartDemoRecord)
- **Catalog line**: 1363
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether FFA games are included in server-side MVD auto-recording. Only applies when demo_tmp_record is enabled; has no effect otherwise.
>
> 0 = FFA games are auto-recorded like other modes.
> 1 = FFA games are skipped and not recorded.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvar("demo_skip_ktffa_record")` at world.c:937 (empty default = 0 numerically). Read at match.c:2367 inside the `if (cvar("demo_tmp_record"))` branch in `StartDemoRecord()`. No `cvar_toggle_msg` or `cvar_fset` command writes this.

### Proposed draft

```
When auto-recording is enabled, controls whether FFA games are skipped and not recorded. Has no effect when demo_tmp_record is off.

0 = FFA games recorded like other modes.
1 = FFA games skipped; no demo file created for FFA matches.

Permission:    server config only
Default:       0.

Example:
  # Skip FFA demos to reduce server disk usage:
  demo_tmp_record 1
  demo_skip_ktffa_record 1

See also: demo_tmp_record (master switch for auto-recording)
```

### Notes

- Clean recast. The dependency on `demo_tmp_record` is preserved in Effect and Example. No contradictions found.
- `RegisterCvar` without a value means empty string default, which evaluates as 0 numerically -- matches existing "Default: 0" claim.

---

## demo_tmp_record (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:936 (registration, default "0"); src/match.c:2355 (read site in StartDemoRecord)
- **Catalog line**: 1394
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master switch for KTX automatic server-side MVD demo recording. When enabled, a demo is started at match begin for most game types: race matches are always recorded, non-deathmatch and FFA (when demo_skip_ktffa_record is set) are skipped, and HoonyMode games past the first point are skipped. A running demo is cancelled before the new one starts.
>
> 0 = auto-recording off.
> 1 = auto-recording on (typical value).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvarEx("demo_tmp_record", "0")` at world.c:936; read at match.c:2355 in `StartDemoRecord()`. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Master switch for KTX automatic server-side MVD demo recording. When on, a demo is started at match begin. Recording rules by mode:

  Race: always recorded.
  Non-deathmatch: not recorded.
  FFA: not recorded when demo_skip_ktffa_record is set.
  HoonyMode (beyond the first point): not recorded.

If a demo is already running when a new match begins, the old recording is cancelled first.

0 = auto-recording off.
1 = auto-recording on.

Permission:    server config only
Default:       0.

Example:
  # Enable automatic demo recording, skip FFA matches:
  demo_tmp_record 1
  demo_skip_ktffa_record 1

See also: demo_skip_ktffa_record (skip FFA recording), k_demo_mintime (discard demos shorter than N seconds), k_demoname_date (append timestamp to demo filenames), k_demotxt_format (stats file format written alongside demos)
```

### Notes

- Clean recast. See-also lists all companion cvars that configure the recording behavior.
- Existing description is accurate; recast adds the explicit recording-rules breakdown as a scannable list.

---

## k_demo_mintime (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1005 (registration, no default = empty); src/match.c:2484,2507-2512 (read site in match_can_cancel_demo)
- **Catalog line**: 1425
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Minimum match duration (in seconds) below which the server discards the recorded demo. Prevents short or aborted matches (ended via /break, early disconnect, or admin abort) from accumulating useless demo files on the server.
>
> Range: 0-3600 (clamped). Value 0 falls back to a hardcoded 120 seconds at the use-site.
>
> Default: 0 (effective 120 seconds).
> Set by: server config only.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvar("k_demo_mintime")` at world.c:1005 (empty default); read at match.c:2484 in `match_can_cancel_demo()`. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Minimum match duration (in seconds) for a demo to be kept after a premature end (/break, disconnect, or admin abort). Demos from matches that ended before this threshold are discarded; demos from matches that ran the full duration are always kept.

Range: 0-3600 (clamped). Value 0 falls back to 120 seconds.

Exception: if the server has a matchtag set (infokey "matchtag"), the demo is never cancelled regardless of match duration.

0 = use the 120-second default.

Permission:    server config only
Default:       0 (effective: 120 seconds).

Example:
  # Keep demos only from matches lasting at least 5 minutes:
  k_demo_mintime 300

See also: demo_tmp_record (master switch; k_demo_mintime has no effect when demo_tmp_record is off)
```

### Notes

- FLAG: Existing description omits the matchtag exception. Source at match.c:2499-2503 shows: if `infokey(world, "matchtag")` is non-empty, `match_can_cancel_demo()` returns false (never cancels), regardless of elapsed time. This means demos from matchtag-tagged matches are always preserved even if the match was short. The existing description says the cvar "prevents short or aborted matches from accumulating useless demo files" without noting that matchtag overrides the discard. Apply-pass author should add the matchtag exception.
- The `bound(0, cvar("k_demo_mintime"), 3600)` clamp at match.c:2484 is verified: values above 3600 are treated as 3600.
- Empty registration (`RegisterCvar`) = cvar value of "" = 0.0 numerically, consistent with existing "Default: 0" claim.

---

## k_demoname_date (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:938 (registration comment: "add date to demo name, value is argument for strftime() function"); src/match.c:2337-2342 (read site in CompilateDemoName)
- **Catalog line**: 1455
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Appends a timestamp to auto-generated demo filenames. The value is a strftime format string (e.g. %Y%m%d-%H%M produces 20260518-1430). Empty value = no timestamp appended.
>
> Default: "" (no timestamp).
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command, string format cvar)

`RegisterCvar("k_demoname_date")` at world.c:938 (empty default); read at match.c:2337 via `cvar_string()` in `CompilateDemoName()`. The value is passed to `QVMstrftime()`. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Appends a timestamp to auto-generated demo filenames. The value is a strftime format string; an empty value disables the timestamp.

Empty = no timestamp appended to demo filenames.

Permission:    server config only
Default:       "" (no timestamp).

Example:
  # Append date and time to demo names (e.g. [dm4]20260518-1430):
  k_demoname_date %Y%m%d-%H%M

See also: demo_tmp_record (master switch for auto-recording; k_demoname_date only affects recordings made when this is on)
```

### Notes

- Clean recast. Existing description is accurate; strftime format usage verified at match.c:2339 (`QVMstrftime(date, sizeof(date), fmt, 0)`).
- The timestamp is appended after the map-name portion of the filename (e.g. `[dm4]20260518-1430`), confirmed by the string-concatenation order in `CompilateDemoName()`.

---

## k_demotxt_format (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1050 (registration, default "xml"); src/stats.c:573-610 (read site in stats write function)
- **Catalog line**: 1483
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Format of the per-game text stats file written next to each recorded demo.
>
> "xml" = XML stats file.
> "json" = JSON stats file.
> Any unrecognized value falls back to "xml".
>
> Default: "xml".
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvarEx("k_demotxt_format", "xml")` at world.c:1050; read at stats.c:573 via `cvar_string()` in `FindStatsFormat()`. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Controls whether an additional XML stats file is written alongside the auto-generated JSON stats file when a recorded demo ends.

The server always writes a JSON stats file internally (for embedding in the MVD/QTV stream). k_demotxt_format controls a separate additional file:

"xml"  = XML stats file also written next to the demo.
"json" = No additional file (JSON is already produced internally).
Any unrecognized value = falls back to "xml".

Permission:    server config only
Default:       "xml".

Example:
  # Write both JSON (internal) and XML stats files:
  k_demotxt_format xml

  # Write only the internal JSON (suppress the additional file):
  k_demotxt_format json

See also: demo_tmp_record (master switch; stats files are only written when this is on)
```

### Notes

- FLAG: Existing description frames k_demotxt_format as a choice between "XML stats file" vs "JSON stats file", implying only one file is produced. Source at stats.c:574-601 shows JSON is ALWAYS written first ("Always write json, so it can be embedded in demo"); k_demotxt_format then controls whether a non-JSON format is ALSO written. Setting k_demotxt_format to "json" means no additional file is produced (JSON was already written). The existing "json = JSON stats file" framing is misleading -- setting to json does not produce a new JSON file; it suppresses the additional output. Apply-pass author should verify this behavioral distinction is clearly conveyed.
- The `FindStatsFormat` fallback (stats.c:467) returns `file_formats[0]` which is the xml format -- verified as the default fallback for unrecognized values.

---

## k_keepspectalkindemos (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:863 (registration, default "0"); src/g_cmd.c:489 (read site in spectator chat handler)
- **Catalog line**: 1515
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether spectator chat is recorded into MVD demos. When off, spectator talk reaches the live QTV stream but is excluded from the saved demo file.
>
> 0 = spectator chat excluded from demos.
> 1 = spectator chat included in demos.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvarEx("k_keepspectalkindemos", "0")` at world.c:863; read at g_cmd.c:489 in the spectator chat branch. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Controls whether spectator chat is included in saved MVD demo files.

When off, spectator talk is broadcast to the live QTV stream but the BPRINT_QTVONLY flag is set, which excludes it from the saved demo file.

0 = spectator chat excluded from demo file (live QTV stream still receives it).
1 = spectator chat included in demo file.

Permission:    server config only
Default:       0.

Example:
  # Include spectator commentary in demo recordings:
  k_keepspectalkindemos 1
```

### Notes

- Clean recast. The `BPRINT_QTVONLY` mechanism (g_syscalls.h comment: "if broadcast print goes to demo, then it will be only qtv stream, but not file") is verified -- when 0, this flag is added to spectator talk, routing it to the QTV stream but not the file. Existing description is accurate.
- No See-also added: no direct dependency on other entities in the Effect chain. demo_tmp_record is a soft dependency (if no demo is recording, this cvar has no visible effect) but that relationship is not load-bearing enough to warrant See-also here.

---

## k_no_wizard_animation (KTX cvar, Demo & spectator -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:821 (registration, comment "disallow wizard animation"); src/spectate.c:78 (read site in wizard_think)
- **Catalog line**: 1577
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether the floating wizard model used for spectator camera points animates.
>
> 0 = wizard model animates (frame advances each tick).
> 1 = wizard model is static (animation held).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (set-once in config, no paired command)

`RegisterCvar("k_no_wizard_animation")` at world.c:821 (empty default = 0); read at spectate.c:78 in `wizard_think()`. No `cvar_toggle_msg` or `cvar_fset` command.

### Proposed draft

```
Controls whether the floating wizard model used for free-roaming spectator camera points plays its animation.

0 = wizard model animates (frame advances each tick).
1 = wizard model is static (animation frozen at current frame).

Permission:    server config only
Default:       0.

Example:
  # Disable wizard animation (static model):
  k_no_wizard_animation 1

See also: allow_spec_wizard (controls when wizard cameras are available)
```

### Notes

- Clean recast. Existing description is accurate; verified at spectate.c:78: `if (!cvar("k_no_wizard_animation")) { (self->s.v.frame)++; }`. When 1, the frame increment is skipped, freezing the animation.
- The wizard_think function also resets frame to 0 when out of range (0-14). When animation is frozen via this cvar, the frame stays at whatever value it was at when k_no_wizard_animation was set to 1.

---

## Sub-group 2: Generic fav family -- auto-list (5)

## fav_add (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:886 (registration), src/commands.c:5577 (handler)
- **Catalog line**: 2895
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Adds the player you are currently tracking to your auto-add favourites list, for later cycling with fav_next. Reports an error if you are not tracking a player, the player is already on the list, or all slots are full. Distinct from the named-slot list (fav1_add..fav20_add / 1fav_go..20fav_go).
>
> Default: n/a (command).
> Set by: any spectator.

### Shape classification

shape-less (standalone spectator action; no cvar pairing, no inter-entity relationship that maps to a cataloged shape; the fav_add / fav_del / fav_next family operates on a shared `self->fav[]` storage but each command is an independent imperative action, not a cvar+toggle or vote pattern).

### Proposed draft

```
Adds the player you are currently tracking to your personal auto-favourites list, for cycling with fav_next.

Effect:
  Stores the tracked player in the next free slot of self->fav[]. Prints a confirmation: "fav_add: <name> added to favourites".
  Refuses with an error if you are not tracking a player, the player is already in the list, or all slots are full.
  When the tracked player later disconnects, the server automatically removes them from your list.

Permission:    any spectator
Match-state:   any time (including matchless mode)

Example:
  Track a player first, then save them:
    (spectate a player)
    fav_add
  Cycle through saved players later:
    fav_next

See also: fav_next (cycles through this list), fav_del (removes current player from this list), fav_all_del (clears entire list), fav_show (displays both lists), fav1_add (named-slot variant)
```

### Notes

- Source-verified: registration at `commands.c:886` with `CF_SPECTATOR | CF_MATCHLESS`; handler `fav_add()` at `commands.c:5577`. Uses `self->fav[]` array (auto-list), distinct from `self->favx[]` (slot-based list used by `favN_add`).
- CF_MATCHLESS confirmed: available in matchless mode (unlike `fav1_add..fav20_add` which use `CF_SPECTATOR` only).
- Auto-removal on disconnect: `del_from_specs_favourites()` in `client.c:2999` calls `fav_del_do()` which clears `fav[]` entries for the disconnecting player. This is a user-surprise behavior worth surfacing briefly.
- The existing description omits the auto-removal behavior; added to Effect.
- shape-less rationale: standalone spectator action; no inter-entity relationship pattern from the catalog applies.

---

## fav_del (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:887 (registration), src/commands.c:5676 (handler)
- **Catalog line**: 2950
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Removes the currently tracked player (point-of-view target) from the spectator's auto-favourites list. Prints an error if the spectator is not tracking anyone, or if the tracked player is not on the list. Only affects the auto-list used by fav_add / fav_next -- not the per-slot list used by favN_add / Nfav_go.
>
> Set by: any spectator in-game ('fav_del').

### Shape classification

shape-less (standalone spectator action removing a single entry from `self->fav[]`; no cvar pairing, no vote pattern, no inter-entity relationship mapping to a cataloged shape).

### Proposed draft

```
Removes the player you are currently tracking from your personal auto-favourites list.

Effect:
  Clears the tracked player's entry from self->fav[]. Prints: "<name> removed from favourites".
  Refuses with an error if you are not tracking a player, or if the tracked player is not in your list.
  Does not affect the named-slot list (fav1_add..fav20_add / 1fav_go..20fav_go).

Permission:    any spectator
Match-state:   any time (including matchless mode)

Example:
  While tracking a player you no longer want to follow:
    fav_del

See also: fav_add (adds to this list), fav_all_del (clears entire list), fav_next (cycles through list), fav_show (displays both lists)
```

### Notes

- Source-verified: registration at `commands.c:887` with `CF_SPECTATOR | CF_MATCHLESS`; handler `fav_del()` at `commands.c:5676` calls `fav_del_do()`.
- CF_MATCHLESS confirmed: available in matchless mode.
- The `fav_del_do()` helper at `commands.c:5619` walks `self->fav[]` and zeroes matching entries; does NOT touch `self->favx[]` (slot list). Source-confirmed.
- shape-less rationale: standalone removal action; no inter-entity relationship matches catalog shapes.

---

## fav_all_del (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:888 (registration), src/commands.c:5696 (handler)
- **Catalog line**: 2923
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Clears the spectator's entire personal favourites list, zeroing every slot. Prints a confirmation message indicating whether the list was cleared or was already empty. Spectator-only; usable during a live match.
>
> Set by: any spectator 'fav_all_del'.

### Shape classification

shape-less (standalone bulk-clear command on `self->fav[]`; no cvar pairing, no inter-entity relationship pattern from the catalog).

### Proposed draft

```
Clears your entire personal auto-favourites list in one step.

Effect:
  Zeroes every entry in self->fav[]. Prints: "Favourites list deleted" on success, or "Favourites list already deleted" if the list was already empty.
  Does not affect the named-slot list (fav1_add..fav20_add / 1fav_go..20fav_go).

Permission:    any spectator
Match-state:   any time (including matchless mode)

Example:
  fav_all_del

See also: fav_del (removes one entry), fav_add (adds to this list), fav_show (displays both lists)
```

### Notes

- Source-verified: registration at `commands.c:888` with `CF_SPECTATOR | CF_MATCHLESS`; handler `fav_all_del()` at `commands.c:5696`. Loops `self->fav[]` zeroing all entries; does NOT touch `self->favx[]`.
- CF_MATCHLESS confirmed: available in matchless mode.
- Existing description says "usable during a live match" but says nothing about matchless mode -- the CF_MATCHLESS flag makes it also available in matchless mode. Updated to "any time (including matchless mode)" to be precise.
- shape-less rationale: standalone bulk-clear; no inter-entity relationship matches catalog shapes.

---

## fav_next (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:889 (registration), src/commands.c:5735 (handler)
- **Catalog line**: 2977
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Cycles your spectated view through your personal favourites list (managed by fav_add / fav_del / fav_all_del -- distinct from the numbered per-slot fav1_add..fav20_add / 1fav_go..20fav_go array).
>
> If currently tracking a player on the list, advances to the next favourite; otherwise jumps to the first. Reports "empty" if the list has no entries, or "already observing..." if the next favourite is already your current target.
>
> Default: n/a (command, not a cvar).
> Set by: any spectator.

### Shape classification

shape-less (cyclic-navigation command over `self->fav[]`; no cvar pairing, no vote pattern; the cycling behavior is its own imperative action, not a Shape 2 cvar+cycle pair).

### Proposed draft

```
Cycles your spectated point-of-view through your personal auto-favourites list (set via fav_add).

Effect:
  If you are currently tracking a player on your list, moves to the next favourite in list order.
  If you are not tracking anyone on the list (or are tracking someone not on it), jumps to the first favourite.
  Wraps around: reaching the end jumps back to the first favourite on the next call.
  Reports "favourites list is empty" if no entries exist, or "already observing..." if the next candidate is already your target.
  Note: a KTX alias "next_fav" is automatically installed as an alias for fav_next when you join as spectator.

Permission:    any spectator
Match-state:   any time (including matchless mode)

Example:
  Bind for quick cycling:
    bind mouse2 fav_next
  Or use the installed alias:
    bind mouse2 next_fav

See also: fav_add (builds the list this cycles), fav_del (removes from list), fav_show (displays both lists), fav1_add (named-slot alternative)
```

### Notes

- Source-verified: registration at `commands.c:889` with `CF_SPECTATOR | CF_MATCHLESS`; handler `fav_next()` at `commands.c:5735`.
- Auto-alias verified: `commands.c:1276` stuffs `"alias next_fav fav_next\n"` to spectators on join (STUFFCMD_IGNOREINDEMO). User-facing behavior worth surfacing in Example.
- CF_MATCHLESS confirmed: available in matchless mode.
- The wrap-around behavior is source-verified: when `desired_fav` reaches end of array, falls back to `first_fav`. The "already observing" print at `commands.c:5813` fires if the resolved target equals current goalentity.
- shape-less rationale: standalone cycling action; the `fav[]` array has no L1 entity of its own; no cataloged shape applies.

---

## fav_show (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:890 (registration), src/commands.c:5859 (handler)
- **Catalog line**: 3007
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Prints your personal favourites lists: first the named-slot entries (set via fav1_add..fav20_add), then the auto-add list (set via fav_add). Entries for players no longer connected are silently skipped. If both lists are empty, prints "Favourites list empty or nothing to show".
>
> Default: n/a (command).
> Set by: any spectator.

### Shape classification

shape-less (read-only state-printer; no cvar pairing, no dispatch, no inter-entity relationship pattern from the catalog; not Shape 10 because it is not a curated family help-printer of sibling commands).

### Proposed draft

```
Prints your saved favourites: first the named-slot list (fav1_add..fav20_add), then the auto-add list (fav_add).

Effect:
  Iterates self->favx[] (named slots) and prints: "slot N -> <name>" for each occupied slot whose player is still connected.
  Then iterates self->fav[] (auto-list) and prints each player name still connected.
  Players who have disconnected are silently skipped; their slots remain reserved until manually cleared.
  If nothing is shown in either list, prints: "Favourites list empty or nothing to show".

Permission:    any spectator
Match-state:   any time (including matchless mode)

Example:
  fav_show

See also: fav_add (populates auto-list), fav1_add (populates named-slot list), fav_next (cycles auto-list), fav_all_del (clears auto-list)
```

### Notes

- Source-verified: registration at `commands.c:890` with `CF_SPECTATOR | CF_MATCHLESS`; handler `fav_show()` at `commands.c:5859`. Loop at `5865` iterates `self->favx[]` first; loop at `5892` iterates `self->fav[]`.
- CF_MATCHLESS confirmed: available in matchless mode.
- Disconnected-player behavior: handler at `5870` checks `(p->ct != ctPlayer) || strnull(p->netname)` and does `continue` -- entries are silently skipped, NOT auto-removed. Only `del_from_specs_favourites()` (triggered at disconnect) auto-removes. This distinction is subtle but correct.
- shape-less rationale: pure state-printer; not a curated-family help-printer (no sibling commands marketed), so not Shape 10.

---

## Sub-group 3: favN_add slot-keyed save family -- 1 canonical + 19 references (20)

## fav1_add (KTX command, Demo & spectator -- shape-less (canonical for favN_add))

- **Status**: drafted
- **Source**: src/commands.c:846 (registration), src/commands.c:5713 (handler favx_add)
- **Catalog line**: 2625
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 1, overwriting any previous occupant. Use 1fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (canonical card for the favN_add slot-keyed family, N=1..20). All 20 favN_add commands share a single handler `favx_add(float fav_num)` registered with the slot number as the argument; behavior is identical modulo the slot index. No cataloged shape captures this slot-keyed fan-out pattern; the canonical-card layout from the dispatcher prompt is the correct structural choice. No new shape should be minted per earn-their-keep discipline.

### Proposed draft

```
Saves the player you are currently tracking into named favourite slot 1, for instant recall with 1fav_go.

Effect:
  Stores the tracked player in self->favx[0] (slot 1), overwriting any previous occupant in that slot.
  Prints: "fav add: <name> added to slot 1".
  Refuses with "fav add: you are not tracking player!" if you are not currently tracking a player.
  When the saved player later disconnects, the server automatically removes them from the slot.

Prerequisites: You must be actively tracking a player (spectating a specific player, not in free-fly).

Permission:    any spectator
Match-state:   pre-match and mid-match; NOT available in matchless mode (server-configured)

Example:
  Spectate the player you want to save, then:
    fav1_add
  Later, snap directly to that player:
    1fav_go
  (Optional: bind for quick access)
    bind kp_1 fav1_add
    bind kp_end 1fav_go

See also: 1fav_go (snaps view to slot 1), fav_add (auto-list add without choosing a slot), fav_show (displays both lists), fav2_add..fav20_add (other named slots)
```

### Notes

- **Canonical card for favN_add family (N=1..20); fav2_add..fav20_add are reference cards.**
- Source-verified: all 20 `favN_add` registrations at `commands.c:846-865` use `DEF(favx_add)` with slot number (1..20) as the arg and `CF_SPECTATOR` (no `CF_MATCHLESS`). Handler `favx_add(float fav_num)` at `commands.c:5713` uses `self->favx[(int)fav_num - 1]` — the `favx[]` array, separate from `fav[]` used by `fav_add`.
- **CF_SPECTATOR only (no CF_MATCHLESS)**: `isValidCmdForClass()` at `commands.c:1295` returns false for commands without CF_MATCHLESS when `k_matchLess` is active. This means `fav1_add..fav20_add` are NOT available in matchless mode — unlike `fav_add/del/all_del/next/show` which carry `CF_MATCHLESS`. This is a behavioral difference between the two subfamilies.
- Auto-removal on disconnect: `del_from_specs_favourites()` calls `favx_del_do()` at `commands.c:5573` which clears `favx[]` entries. Source-verified.
- Overwrite behavior: handler does NOT check if the slot already has an occupant — it writes unconditionally. The "overwriting any previous occupant" claim from the existing description is source-confirmed.
- shape-less rationale: slot-keyed structural pattern (20 commands, one handler, slot derived from arg); canonical-card layout applies per dispatcher mandate; no new shape per earn-their-keep.

---

## fav2_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add))

- **Status**: drafted
- **Source**: src/commands.c:847 (registration), src/commands.c:5713 (handler favx_add)
- **Catalog line**: 2679
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 2, overwriting any previous occupant. Use 2fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical). Behavior identical to fav1_add modulo slot=2.

### Proposed draft

```
Saves the spectator-tracked player to named favourite slot 2. See fav1_add for the full mechanism. This command operates on slot 2.

Permission:    any spectator
Match-state:   pre-match and mid-match; NOT available in matchless mode

See also: fav1_add (canonical card for favN_add family), 2fav_go (snaps view to slot 2)
```

### Notes

- Reference card -- behavior identical to fav1_add modulo slot=2.
- Source-verified: `commands.c:847` `{ "fav2_add", DEF(favx_add), 2, CF_SPECTATOR, CD_FAV2_ADD }`. Handler `favx_add(float fav_num)` uses `self->favx[(int)fav_num - 1]` with fav_num=2.

---

## fav3_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add))

- **Status**: drafted
- **Source**: src/commands.c:848 (registration), src/commands.c:5713 (handler favx_add)
- **Catalog line**: 2706
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 3, overwriting any previous occupant. Use 3fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical). Behavior identical to fav1_add modulo slot=3.

### Proposed draft

```
Saves the spectator-tracked player to named favourite slot 3. See fav1_add for the full mechanism. This command operates on slot 3.

Permission:    any spectator
Match-state:   pre-match and mid-match; NOT available in matchless mode

See also: fav1_add (canonical card for favN_add family), 3fav_go (snaps view to slot 3)
```

### Notes

- Reference card -- behavior identical to fav1_add modulo slot=3.
- Source-verified: `commands.c:848` `{ "fav3_add", DEF(favx_add), 3, CF_SPECTATOR, CD_FAV3_ADD }`. Handler `favx_add(float fav_num)` uses `self->favx[2]` with fav_num=3.

---

## fav4_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add))

- **Status**: drafted
- **Source**: src/commands.c:849 (registration), src/commands.c:5713 (handler favx_add)
- **Catalog line**: 2733
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 4, overwriting any previous occupant. Use 4fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical). Behavior identical to fav1_add modulo slot=4.

### Proposed draft

```
Saves the spectator-tracked player to named favourite slot 4. See fav1_add for the full mechanism. This command operates on slot 4.

Permission:    any spectator
Match-state:   pre-match and mid-match; NOT available in matchless mode

See also: fav1_add (canonical card for favN_add family), 4fav_go (snaps view to slot 4)
```

### Notes

- Reference card -- behavior identical to fav1_add modulo slot=4.
- Source-verified: `commands.c:849` `{ "fav4_add", DEF(favx_add), 4, CF_SPECTATOR, CD_FAV4_ADD }`. CD_FAV4_ADD is `CD_NODESC` (skipped from command listing) per `commands.c:469`.

---

## fav5_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add))

- **Status**: drafted
- **Source**: src/commands.c:850 (registration), src/commands.c:5713 (handler favx_add)
- **Catalog line**: 2760
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 5, overwriting any previous occupant. Use 5fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical). Behavior identical to fav1_add modulo slot=5.

### Proposed draft

```
Saves the spectator-tracked player to named favourite slot 5. See fav1_add for the full mechanism. This command operates on slot 5.

Permission:    any spectator
Match-state:   pre-match and mid-match; NOT available in matchless mode

See also: fav1_add (canonical card for favN_add family), 5fav_go (snaps view to slot 5)
```

### Notes

- Reference card -- behavior identical to fav1_add modulo slot=5.
- Source-verified: `commands.c:850` `{ "fav5_add", DEF(favx_add), 5, CF_SPECTATOR, CD_FAV5_ADD }`. CD_FAV5_ADD is `CD_NODESC` (skipped from command listing) per `commands.c:469`.

---

## fav6_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:851
- **Catalog line**: 2787
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 6, overwriting any previous occupant. Use 6fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (6). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 6. See `fav1_add` for full mechanism. This command operates on slot 6.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 6fav_go (snap view to slot 6)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=6.

---

## fav7_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:852
- **Catalog line**: 2814
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 7, overwriting any previous occupant. Use 7fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (7). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 7. See `fav1_add` for full mechanism. This command operates on slot 7.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 7fav_go (snap view to slot 7)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=7.

---

## fav8_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:853
- **Catalog line**: 2841
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 8, overwriting any previous occupant. Use 8fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (8). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 8. See `fav1_add` for full mechanism. This command operates on slot 8.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 8fav_go (snap view to slot 8)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=8.

---

## fav9_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:854
- **Catalog line**: 2868
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 9, overwriting any previous occupant. Use 9fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (9). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 9. See `fav1_add` for full mechanism. This command operates on slot 9.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 9fav_go (snap view to slot 9)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=9.

---

## fav10_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:855
- **Catalog line**: 2352
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 10, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 10fav_go to snap your view to whoever is stored in that slot.
>
> Default: n/a (command).
> Set by: any spectator in-game.

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (10). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 10. See `fav1_add` for full mechanism. This command operates on slot 10.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 10fav_go (snap view to slot 10)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=10.
- Existing description correctly notes "Does nothing if you are not tracking a real player" -- this is a behavioral detail belonging on the canonical card (fav1_add), not the reference card. No flag needed; reference cards defer to canonical.

---

## fav11_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:856
- **Catalog line**: 2380
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 11, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 11fav_go to snap your view to whoever is stored in that slot.
>
> Default: n/a (command).
> Set by: any spectator in-game.

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (11). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 11. See `fav1_add` for full mechanism. This command operates on slot 11.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 11fav_go (snap view to slot 11)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=11.

---

## fav12_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:857
- **Catalog line**: 2408
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 12, overwriting any previous entry. Does nothing if you are not tracking a real player. Use 12fav_go to snap your view to whoever is stored in that slot.
>
> Default: n/a (command).
> Set by: any spectator in-game.

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (12). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 12. See `fav1_add` for full mechanism. This command operates on slot 12.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 12fav_go (snap view to slot 12)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=12.

---

## fav13_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:858
- **Catalog line**: 2436
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 13, overwriting any previous occupant. Use 13fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (13). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 13. See `fav1_add` for full mechanism. This command operates on slot 13.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 13fav_go (snap view to slot 13)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=13.

---

## fav14_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:859
- **Catalog line**: 2463
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 14, overwriting any previous occupant. Use 14fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (14). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 14. See `fav1_add` for full mechanism. This command operates on slot 14.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 14fav_go (snap view to slot 14)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=14.

---

## fav15_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:860
- **Catalog line**: 2490
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 15, overwriting any previous occupant. Use 15fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

Source confirms identical handler `DEF(favx_add)` and flag `CF_SPECTATOR` as fav1_add; only the slot argument differs (15). Canonical-card pattern applies: no per-slot behavioral differences, no different gates, no asymmetric permissions.

### Proposed draft

```
Saves the spectator-tracked player to favourite slot 15. See `fav1_add` for full mechanism. This command operates on slot 15.

Permission:  any spectator
See also:    fav1_add (canonical for this family), 15fav_go (snap view to slot 15)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=15.

---

## fav16_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:861
- **Catalog line**: 2517
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 16, overwriting any previous occupant. Use 16fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

fav16_add is registered with `DEF(favx_add), arg=16, CF_SPECTATOR` -- identical handler and flag to fav1_add (arg=1) and every slot 2-20. Behavior is identical modulo the slot index. The canonical-card pattern applies: fav1_add holds the full description; fav16_add is a short reference card pointing at it.

### Proposed draft

```
Saves the player you are currently tracking into favourite slot 16. See `fav1_add` for the full slot-save mechanism.

This command sets slot 16 instead of slot 1 on save; `16fav_go` snaps your view to whoever is stored here.

Permission:  any spectator

See also: fav1_add (canonical for the favN_add family), 16fav_go (snap to slot 16)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=16.
- Source-confirmed: `DEF(favx_add), arg=16, CF_SPECTATOR` at commands.c:861; same handler and CF flag as fav1_add..fav15_add and fav17_add..fav20_add.

---

## fav17_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:862
- **Catalog line**: 2544
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 17, overwriting any previous occupant. Use 17fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

fav17_add is registered with `DEF(favx_add), arg=17, CF_SPECTATOR` -- identical handler and flag to fav1_add. Canonical-card pattern applies.

### Proposed draft

```
Saves the player you are currently tracking into favourite slot 17. See `fav1_add` for the full slot-save mechanism.

This command sets slot 17 instead of slot 1 on save; `17fav_go` snaps your view to whoever is stored here.

Permission:  any spectator

See also: fav1_add (canonical for the favN_add family), 17fav_go (snap to slot 17)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=17.
- Source-confirmed: `DEF(favx_add), arg=17, CF_SPECTATOR` at commands.c:862.

---

## fav18_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:863
- **Catalog line**: 2571
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 18, overwriting any previous occupant. Use 18fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

fav18_add is registered with `DEF(favx_add), arg=18, CF_SPECTATOR` -- identical handler and flag to fav1_add. Canonical-card pattern applies.

### Proposed draft

```
Saves the player you are currently tracking into favourite slot 18. See `fav1_add` for the full slot-save mechanism.

This command sets slot 18 instead of slot 1 on save; `18fav_go` snaps your view to whoever is stored here.

Permission:  any spectator

See also: fav1_add (canonical for the favN_add family), 18fav_go (snap to slot 18)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=18.
- Source-confirmed: `DEF(favx_add), arg=18, CF_SPECTATOR` at commands.c:863.

---

## fav19_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:864
- **Catalog line**: 2598
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 19, overwriting any previous occupant. Use 19fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

fav19_add is registered with `DEF(favx_add), arg=19, CF_SPECTATOR` -- identical handler and flag to fav1_add. Canonical-card pattern applies.

### Proposed draft

```
Saves the player you are currently tracking into favourite slot 19. See `fav1_add` for the full slot-save mechanism.

This command sets slot 19 instead of slot 1 on save; `19fav_go` snaps your view to whoever is stored here.

Permission:  any spectator

See also: fav1_add (canonical for the favN_add family), 19fav_go (snap to slot 19)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=19.
- Source-confirmed: `DEF(favx_add), arg=19, CF_SPECTATOR` at commands.c:864.

---

## fav20_add (KTX command, Demo & spectator -- shape-less (reference card under fav1_add canonical))

- **Status**: drafted
- **Source**: src/commands.c:865
- **Catalog line**: 2652
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Saves the player you are currently tracking into favourite slot 20, overwriting any previous occupant. Use 20fav_go to snap your point-of-view to whoever is stored in that slot.
>
> Set by: spectator (in-game command).

### Shape classification

shape-less (reference card under fav1_add canonical)

fav20_add is registered with `DEF(favx_add), arg=20, CF_SPECTATOR` -- identical handler and flag to fav1_add. Canonical-card pattern applies.

### Proposed draft

```
Saves the player you are currently tracking into favourite slot 20. See `fav1_add` for the full slot-save mechanism.

This command sets slot 20 instead of slot 1 on save; `20fav_go` snaps your view to whoever is stored here.

Permission:  any spectator

See also: fav1_add (canonical for the favN_add family), 20fav_go (snap to slot 20)
```

### Notes

- Reference card under fav1_add canonical -- behavior identical modulo slot=20.
- Source-confirmed: `DEF(favx_add), arg=20, CF_SPECTATOR` at commands.c:865.

---

## Sub-group 4: Nfav_go slot-keyed go family -- 1 canonical + 19 references (20)

## 1fav_go (KTX command, Demo & spectator -- shape-less (canonical for Nfav_go family))

- **Status**: drafted_with_flag
- **Source**: src/commands.c:866
- **Catalog line**: 1886
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Switches your point of view to the player saved in favourites slot 1. Slot 1 is populated with the `fav1_add` command (run while tracking a player). If the slot is empty, prints "fav go: slot 1 is not defined". If the saved player has since disconnected, prints "fav go: slot 1 can't find player". If already tracking that player, prints "fav go: already observing...". On success, your POV follows the stored player.
>
> Set by: spectator command '1fav_go' (spectator-only).

### Shape classification

shape-less (canonical for Nfav_go family -- paired with fav1_add canonical for the save-side)

`1fav_go` is registered with `DEF(xfav_go), arg=1, CF_SPECTATOR`. All 20 `Nfav_go` commands share the same `xfav_go` handler with only the arg (slot number) differing. No per-slot behavioral divergence. This is the canonical card for the family; 2fav_go..20fav_go are reference cards.

### Proposed draft

```
Snaps your spectator view to the player saved in favourite slot 1.

Effect:
  Reads the player stored in slot 1 (set via `fav1_add`) and issues a track command to follow them.
  If slot 1 is empty: prints "fav go: slot 1 is not defined".
  If the saved player has disconnected: prints "fav go: slot 1 can't find player".
  If already tracking that player: prints "fav go: already observing..." and does nothing further.

Permission:  any spectator
Match-state: not available in matchless mode (server must run with k_matchless 0)

Example:
  (First, while watching a player): fav1_add
  (Later, to snap back to them):    1fav_go

See also: fav1_add (saves a player into slot 1), fav_show (lists all populated slots), fav_next (cycles through saved favourites), 2fav_go (reference -- slot 2)
```

### Notes

- Canonical card for the Nfav_go family (N=1..20); 2fav_go..20fav_go are reference cards pointing here.
- Source-confirmed: `DEF(xfav_go), arg=1, CF_SPECTATOR` at commands.c:866. All Nfav_go commands (lines 866-885) share the same handler and CF flag.
- Match-state behavioral nuance: commands with only `CF_SPECTATOR` (no `CF_MATCHLESS`) are rejected by `DoCommand()` at commands.c:1078 when `k_matchLess` is active. Contrast: `fav_add`, `fav_show`, `fav_next` carry `CF_SPECTATOR | CF_MATCHLESS` and work in matchless mode. The slot-keyed save/go family (favN_add + Nfav_go) does not have CF_MATCHLESS and is therefore unavailable in matchless mode.
- The existing description is accurate and well-detailed. The v2 recast adds proper Effect bullets, Permission line from CF flags, and the Match-state nuance (matchless restriction not in the original).
- FLAG: existing description omits the matchless-mode restriction. Not foundational (description is otherwise correct); surfaced here for apply-pass review.

---

## 2fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:867
- **Catalog line**: 1940
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 2 (populated beforehand via fav2_add while observing a player). Prints an error if the slot is empty or the stored player has disconnected; does nothing if already tracking that player. The leading number is the slot index; sibling commands 1fav_go through 20fav_go target slots 1-20.
>
> Set by: any spectator (in-game command).

### Shape classification

shape-less (reference card under 1fav_go canonical)

`2fav_go` is registered with `DEF(xfav_go), arg=2, CF_SPECTATOR` -- identical handler and flag to `1fav_go` (arg=1). Canonical-card pattern applies; 1fav_go is the canonical card.

### Proposed draft

```
Snaps your spectator view to the player saved in favourite slot 2. See `1fav_go` for the full mechanism.

This command targets slot 2 instead of slot 1; `fav2_add` populates it.

Permission:  any spectator

See also: 1fav_go (canonical for the Nfav_go family), fav2_add (saves a player into slot 2)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=2.
- Source-confirmed: `DEF(xfav_go), arg=2, CF_SPECTATOR` at commands.c:867.

---

## 3fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:868
- **Catalog line**: 1967
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Switches your point of view to the player stored in named favourite slot 3 (set previously with fav3_add). Prints an error if the slot is empty or that player is no longer connected. One of the numbered family 1fav_go..20fav_go, each tied to its own slot.
>
> Default: n/a (command).
> Set by: any spectator.

### Shape classification

shape-less (reference card under 1fav_go canonical)

`3fav_go` is registered with `DEF(xfav_go), arg=3, CF_SPECTATOR` -- identical handler and flag to `1fav_go`. Canonical-card pattern applies.

### Proposed draft

```
Snaps your spectator view to the player saved in favourite slot 3. See `1fav_go` for the full mechanism.

This command targets slot 3 instead of slot 1; `fav3_add` populates it.

Permission:  any spectator

See also: 1fav_go (canonical for the Nfav_go family), fav3_add (saves a player into slot 3)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=3.
- Source-confirmed: `DEF(xfav_go), arg=3, CF_SPECTATOR` at commands.c:868.
- Existing description has a "Default: n/a (command)" line -- commands have no default; this is v1-shape artifact. Dropped in recast.

---

## 4fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:869
- **Catalog line**: 1995
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch your view to track the player saved in favorites slot 4 (set via fav4_add). Prints an error if the slot is empty or the player has left; does nothing if already tracking them. Parallel commands 1fav_go through 20fav_go cover all 20 slots.
>
> Set by: spectator command.

### Shape classification

shape-less (reference card under 1fav_go canonical)

`4fav_go` is registered with `DEF(xfav_go), arg=4, CF_SPECTATOR` -- identical handler and flag to `1fav_go`. Canonical-card pattern applies.

### Proposed draft

```
Snaps your spectator view to the player saved in favourite slot 4. See `1fav_go` for the full mechanism.

This command targets slot 4 instead of slot 1; `fav4_add` populates it.

Permission:  any spectator

See also: 1fav_go (canonical for the Nfav_go family), fav4_add (saves a player into slot 4)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=4.
- Source-confirmed: `DEF(xfav_go), arg=4, CF_SPECTATOR` at commands.c:869.

---

## 5fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:870
- **Catalog line**: 2022
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch to tracking the player saved in favourite slot 5. Reports an error if slot 5 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
>
> Set by: spectator (no arguments).

### Shape classification

shape-less (reference card under 1fav_go canonical)

`5fav_go` is registered with `DEF(xfav_go), arg=5, CF_SPECTATOR` -- identical handler and flag to `1fav_go`. Canonical-card pattern applies.

### Proposed draft

```
Snaps your spectator view to the player saved in favourite slot 5. See `1fav_go` for the full mechanism.

This command targets slot 5 instead of slot 1; `fav5_add` populates it.

Permission:  any spectator

See also: 1fav_go (canonical for the Nfav_go family), fav5_add (saves a player into slot 5)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=5.
- Source-confirmed: `DEF(xfav_go), arg=5, CF_SPECTATOR` at commands.c:870.

---

## 6fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:871
- **Catalog line**: 2049
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch to tracking the player saved in favourite slot 6. Reports an error if slot 6 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
>
> Set by: spectator (no arguments).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 6. See `1fav_go` for full mechanism. This command operates on slot 6.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav6_add (saves current tracked player into slot 6)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=6.
- CF flag: `CF_SPECTATOR` (bit 1, "command valid for specs") -- uniform across all 20 Nfav_go commands. Permission: `any spectator`.
- Handler: `xfav_go(float fav_num)` with `fav_num=6` passed via registration arg. Reads `self->favx[5]`. No per-slot code differences.

---

## 7fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:872
- **Catalog line**: 2076
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch to tracking the player saved in favourite slot 7. Reports an error if slot 7 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
>
> Set by: spectator (no arguments).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 7. See `1fav_go` for full mechanism. This command operates on slot 7.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav7_add (saves current tracked player into slot 7)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=7.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=7`. Reads `self->favx[6]`.

---

## 8fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:873
- **Catalog line**: 2103
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch to tracking the player saved in favourite slot 8. Reports an error if slot 8 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
>
> Set by: spectator (no arguments).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 8. See `1fav_go` for full mechanism. This command operates on slot 8.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav8_add (saves current tracked player into slot 8)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=8.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=8`. Reads `self->favx[7]`.

---

## 9fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:874
- **Catalog line**: 2130
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switch to tracking the player saved in favourite slot 9. Reports an error if slot 9 is empty, if the saved player has left, or if you are already tracking them. Use the corresponding fav add commands to populate favourite slots.
>
> Set by: spectator (no arguments).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 9. See `1fav_go` for full mechanism. This command operates on slot 9.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav9_add (saves current tracked player into slot 9)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=9.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=9`. Reads `self->favx[8]`.

---

## 10fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:875
- **Catalog line**: 1608
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Switches your point of view to the player saved in favourites slot 10. Slot 10 is populated with the `fav10_add` command (run while tracking a player). If the slot is empty, prints "fav go: slot 10 is not defined". If the saved player has since disconnected, prints "fav go: slot 10 can't find player". If already tracking that player, prints "fav go: already observing...". One command exists per slot (1fav_go through 20fav_go).
>
> Set by: spectator command '10fav_go' (spectator-only).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 10. See `1fav_go` for full mechanism. This command operates on slot 10.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav10_add (saves current tracked player into slot 10)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=10.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=10`. Reads `self->favx[9]`.

---

## 11fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:876
- **Catalog line**: 1635
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Switches your point of view to the player saved in favourites slot 11. Slot 11 is populated with `fav11_add` (run while tracking a player). Note: the generic `fav_add` command does NOT fill this slot -- it writes a separate array used by `fav_next`. If the slot is empty, prints "fav go: slot 11 is not defined". If the saved player has since disconnected, prints "fav go: slot 11 can't find player". If already tracking that player, prints "fav go: already observing...". One of a fixed family 1fav_go..20fav_go.
>
> Set by: spectator command '11fav_go' (spectator-only).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 11. See `1fav_go` for full mechanism. This command operates on slot 11.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav11_add (saves current tracked player into slot 11)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=11.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=11`. Reads `self->favx[10]`.

---

## 12fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:877
- **Catalog line**: 1662
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Switches your spectator camera to track the player saved in favourite slot 12 (set via fav12_add). If the slot is empty or that player is no longer connected, prints a notice and does nothing. If you are already tracking that player, reports that and does nothing.
>
> Set by: spectator only (has no effect for players or admins).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 12. See `1fav_go` for full mechanism. This command operates on slot 12.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav12_add (saves current tracked player into slot 12)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=12.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=12`. Reads `self->favx[11]`.

---

## 13fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:878
- **Catalog line**: 1689
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 13 (populated beforehand via fav13_add). Prints an error if the slot is empty, if the stored player has disconnected, or if already tracking that player. One of the 1fav_go..20fav_go family -- identical behaviour per slot index.
>
> Set by: any spectator (in-game command).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 13. See `1fav_go` for full mechanism. This command operates on slot 13.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav13_add (saves current tracked player into slot 13)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=13.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=13`. Reads `self->favx[12]`.

---

## 14fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:879
- **Catalog line**: 1716
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Switches your point of view to the player stored in named favourite slot 14 (set previously with fav14_add). Prints an error if the slot is empty or that player is no longer connected. One of the numbered family 1fav_go..20fav_go, each tied to its own slot.
>
> Default: n/a (command).
> Set by: any spectator.

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 14. See `1fav_go` for full mechanism. This command operates on slot 14.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav14_add (saves current tracked player into slot 14)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=14.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=14`. Reads `self->favx[13]`.

---

## 15fav_go (KTX command, Demo & spectator -- shape-less (reference card under 1fav_go canonical))

- **Status**: drafted
- **Source**: src/commands.c:880
- **Catalog line**: 1744
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Switches your spectator view to track the player saved in favourite slot 15. The slot is pre-populated by the companion command 'fav15_add' (which stores whoever you are currently tracking). The generic 'fav_add' command does NOT populate per-slot favourites -- it feeds a separate cycle list used by 'fav_next'. Prints an error if the slot is empty, the stored player has disconnected, or you are already tracking them.
>
> One of a fixed family of 20 per-slot commands: 1fav_go through 20fav_go.
>
> Set by: spectator only ('15fav_go' in-game).

### Shape classification

shape-less (reference card under 1fav_go canonical)

All 20 Nfav_go commands share a single handler (`xfav_go`) dispatched with the slot index as the argument. The only per-entity variable is the slot number. Canonical-card pattern applies; full mechanism lives on 1fav_go.

### Proposed draft

```
Snaps your spectator-tracking to the player saved in favourite slot 15. See `1fav_go` for full mechanism. This command operates on slot 15.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical for this family), fav15_add (saves current tracked player into slot 15)
```

### Notes

- Reference card under 1fav_go canonical -- behavior identical modulo slot=15.
- CF flag: `CF_SPECTATOR` (bit 1) -- uniform across all 20 Nfav_go commands.
- Handler: `xfav_go(float fav_num)` with `fav_num=15`. Reads `self->favx[14]`.

---

## 16fav_go (KTX command, Demo & spectator -- canonical-card reference)

- **Status**: drafted
- **Source**: src/commands.c:881
- **Catalog line**: 1773
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command that jumps your view to the player saved in favorites slot 16. Save a player to the slot first by tracking them and running 'fav16_add'. Takes no arguments.
>
> Prints "slot 16 is not defined" if the slot is empty, "slot 16 can't find player" if the saved player is no longer connected, or "already observing..." if you are already tracking them.
>
> Set by: spectators only (in-game command).

### Shape classification

Canonical-card reference -- points to `1fav_go` (canonical for the 1fav_go..20fav_go family). All 20 slots share the same `DEF(xfav_go)` handler and `CF_SPECTATOR` registration, differing only by slot integer argument.

### Proposed draft

```
Jumps your spectated view to the player stored in personal favourites slot 16. Reference card -- see 1fav_go for the full behaviour of the numbered-slot family. This command is identical to 1fav_go except it addresses slot 16 instead of slot 1.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical card for this family), fav16_add (save a player into slot 16)
```

### Notes

- Reference card under `1fav_go` canonical -- behaviour identical modulo slot=16.
- CF_SPECTATOR confirmed at src/commands.c:881.

---

## 17fav_go (KTX command, Demo & spectator -- canonical-card reference)

- **Status**: drafted
- **Source**: src/commands.c:882
- **Catalog line**: 1802
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Switches your point of view to track the player stored in favourite slot 17 (set up with fav17_add). Prints an error if the slot is empty, the player has left, or you are already tracking them.
>
> Set by: any spectator (player use rejected).

### Shape classification

Canonical-card reference -- points to `1fav_go`. Same `DEF(xfav_go)` handler and `CF_SPECTATOR` flag at src/commands.c:882.

### Proposed draft

```
Jumps your spectated view to the player stored in personal favourites slot 17. Reference card -- see 1fav_go for the full behaviour of the numbered-slot family. This command is identical to 1fav_go except it addresses slot 17 instead of slot 1.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical card for this family), fav17_add (save a player into slot 17)
```

### Notes

- Reference card under `1fav_go` canonical -- behaviour identical modulo slot=17.
- CF_SPECTATOR confirmed at src/commands.c:882.

---

## 18fav_go (KTX command, Demo & spectator -- canonical-card reference)

- **Status**: drafted
- **Source**: src/commands.c:883
- **Catalog line**: 1829
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Switches your spectated view to the player saved in slot 18 of your numbered favourites (populated by fav18_add). Part of the 1fav_go..20fav_go family -- each slot-number command tracks the player stored in that slot.
>
> If slot 18 is empty, the saved player has disconnected, or you are already watching them, it prints a status message and does nothing.
>
> Default: n/a (command, not a cvar).
> Set by: any spectator.

### Shape classification

Canonical-card reference -- points to `1fav_go`. Same `DEF(xfav_go)` handler and `CF_SPECTATOR` flag at src/commands.c:883.

### Proposed draft

```
Jumps your spectated view to the player stored in personal favourites slot 18. Reference card -- see 1fav_go for the full behaviour of the numbered-slot family. This command is identical to 1fav_go except it addresses slot 18 instead of slot 1.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical card for this family), fav18_add (save a player into slot 18)
```

### Notes

- Reference card under `1fav_go` canonical -- behaviour identical modulo slot=18.
- CF_SPECTATOR confirmed at src/commands.c:883.

---

## 19fav_go (KTX command, Demo & spectator -- canonical-card reference)

- **Status**: drafted
- **Source**: src/commands.c:884
- **Catalog line**: 1859
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only command. Jumps the spectator's view to track the player stored in personal favourite slot 19 (populated beforehand via the slot-based 'fav add' command while observing a player). Prints an error if the slot is empty or the player has disconnected; does nothing if already tracking that player. This slot list is independent of the fav_add/fav_next rotation list. One of the 1fav_go..20fav_go family.
>
> Set by: any spectator (in-game command).

### Shape classification

Canonical-card reference -- points to `1fav_go`. Same `DEF(xfav_go)` handler and `CF_SPECTATOR` flag at src/commands.c:884.

### Proposed draft

```
Jumps your spectated view to the player stored in personal favourites slot 19. Reference card -- see 1fav_go for the full behaviour of the numbered-slot family. This command is identical to 1fav_go except it addresses slot 19 instead of slot 1.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical card for this family), fav19_add (save a player into slot 19)
```

### Notes

- Reference card under `1fav_go` canonical -- behaviour identical modulo slot=19.
- CF_SPECTATOR confirmed at src/commands.c:884.

---

## 20fav_go (KTX command, Demo & spectator -- canonical-card reference)

- **Status**: drafted
- **Source**: src/commands.c:885
- **Catalog line**: 1913
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: switches your tracked view to the player stored in personal favourites slot 20. Use `fav20_add` beforehand to save a player into that slot. If the slot is empty, prints "slot 20 is not defined"; if the stored player is no longer connected, prints "slot 20 can't find player"; if you are already watching them, prints "already observing". One command exists per slot (1fav_go .. 20fav_go).
>
> Set by: any spectator.

### Shape classification

Canonical-card reference -- points to `1fav_go`. Same `DEF(xfav_go)` handler and `CF_SPECTATOR` flag at src/commands.c:885.

### Proposed draft

```
Jumps your spectated view to the player stored in personal favourites slot 20. Reference card -- see 1fav_go for the full behaviour of the numbered-slot family. This command is identical to 1fav_go except it addresses slot 20 instead of slot 1.

Permission:  any spectator
Match-state: any time

See also: 1fav_go (canonical card for this family), fav20_add (save a player into slot 20)
```

### Notes

- Reference card under `1fav_go` canonical -- behaviour identical modulo slot=20.
- CF_SPECTATOR confirmed at src/commands.c:885.

---

## Sub-group 5: Spec automation -- autotrack / next-* / auto_pow (5)

## autotrack (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:893
- **Catalog line**: 2187
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command that toggles automatic player tracking. When on, the view follows a hint player if one is set, otherwise the current best player, and re-evaluates as play progresses. Issuing it again turns autotrack off. The mode persists through level changes. Spectator-only; not available during a live match.
>
> Set by: spectator command (in-game).

### Shape classification

shape-less. `autotrack` is a standalone toggle command that sets per-spectator state (`self->autotrack = atKTPRO`, stored via `SetUserInfo` to `*at` key). It shares the `AutoTrack` handler with `autotrackktx` and `auto_pow` but passes a different mode argument (`atKTPRO`). The three commands are behaviorally distinct (different tracking algorithms: event-driven vs score-continuous vs powerup-weighted), so no canonical+reference collapse applies. No cvar pairing, no vote mechanism, no bitmask bit -- standalone toggle state.

### Proposed draft

```
Toggles KTXPro-style automatic player tracking: when active, your view switches to a hint player on game events (first rocket launcher taken, powerup picked up or expired, player dies) and falls back to the top-ranked player when no hint is queued. Running it again turns tracking off.

Effect:
  - Activates atKTPRO mode; the view switches automatically on game events rather than on every frame.
  - If a hint player is set and alive, the view goes to them; otherwise falls back to the current top-ranked player.
  - Re-running while atKTPRO is active turns tracking off.
  - Tracking mode is saved in the '*at' userinfo key and restored on map change.

Permission:  any spectator
Match-state: any time (including matchless mode)

Example:
  autotrack         -- start KTXPro-style event-driven tracking
  autotrack         -- run again to turn off; print confirms "Autotrack off"

See also: autotrackktx (KTX score-continuous tracking), auto_pow (powerup-carrier tracking), next_best (manual one-shot cycle between top 2 players)
```

### Notes

- FLAG: existing description says "not available during a live match" -- source registration is `CF_SPECTATOR | CF_MATCHLESS`. `CF_SPECTATOR` alone permits use during a live match (spectator slot); `CF_MATCHLESS` extends it to also work in matchless mode. The "not available during a live match" claim is incorrect. Corrected in draft.
- Behaviorally distinct from `autotrackktx` (atBest, continuous re-evaluation every frame) and `auto_pow` (atPow, powerup-carrier weighting). Source comment block at commands.c:6136-6146 confirms KTXPro event list: first RL taken, player dies, powerup taken, powerup expires without RL/LG.

---

## autotrackktx (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:894
- **Catalog line**: 2214
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator-only toggle for KTX "best player" autotracking. While active, the camera automatically follows whoever KTX rates as the best player to watch, switching targets each frame with a short hold after a player dies. Run again to turn autotracking off. The chosen tracking mode persists across map changes. Distinct from `autotrack` (event-driven) and `auto_pow` (follows powerup carriers). Available during live matches and in matchless mode.
>
> Set by: any spectator via 'autotrackktx' command.

### Shape classification

shape-less. Standalone toggle command. Same `AutoTrack` handler as `autotrack` and `auto_pow`, but passes `atBest` -- continuous score-based tracking via `get_ed_best1()` (calls `CalculateBestPlayers()`). Distinct enough from the other two modes that no canonical+reference pattern applies.

### Proposed draft

```
Toggles KTX score-based automatic player tracking: when active, your view continuously follows the player ranked first by KTX's scoring formula, re-evaluating every tracking tick. Running it again turns tracking off.

Effect:
  - Activates atBest mode; the view re-targets the top-ranked player each tick.
  - A 2-second hold applies after the tracked player dies before switching.
  - Re-running while atBest is active turns tracking off.
  - Tracking mode is saved in the '*at' userinfo key and restored on map change.

Permission:  any spectator
Match-state: any time (including matchless mode)

Example:
  autotrackktx      -- start continuous best-player tracking
  autotrackktx      -- run again to turn off

See also: autotrack (KTXPro event-driven tracking), auto_pow (powerup-carrier tracking), next_best (manual one-shot cycle between top 2 players)
```

### Notes

- FLAG: existing description says "switching targets each frame with a short hold after a player dies" -- the 2-second dead hold is confirmed at commands.c:6058-6063 (`g_globalvars.time - goal->dead_time) < 2`). That part is correct.
- FLAG: existing description describes this as "distinct from autotrack (event-driven)" -- confirmed by source. The three-way distinction (atKTPRO event-driven / atBest score-continuous / atPow powerup-weighted) is accurate in the existing description.
- All three AutoTrack commands share the same `AutoTrack(float)` handler; behavioral differences are entirely driven by the `autoTrackType` argument passed at registration (atKTPRO=3, atBest=1, atPow=2 per the enum in include/progs.h:312-315).

---

## auto_pow (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:895
- **Catalog line**: 2157
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Toggles automatic powerup tracking: when on, your view follows whichever player currently holds the highest-weighted powerup (pentagram > quad > ring, tiebroken by frags). Issuing again turns autotrack off.
>
> Tracking mode is saved in userinfo and restored after a level change. Usable both during a live match and in matchless mode.
>
> Default: n/a (command, not a cvar).
> Set by: any spectator.

### Shape classification

shape-less. Standalone toggle command; passes `atPow` to `AutoTrack(float)`. Uses `get_ed_bestPow()` -> `CalculateBestPowPlayers()` for powerup-weighted selection. No cvar pair, no vote mechanism.

### Proposed draft

```
Toggles automatic powerup-carrier tracking: when active, your view continuously follows the player holding the most valuable powerup combination (pentagram > quad > ring; frags as tiebreaker). Running it again turns tracking off.

Effect:
  - Activates atPow mode; the view re-targets the highest-weighted powerup carrier each tick.
  - Weighting: pentagram (4000) + quad (2000) + ring (1000) + frags; biosuit is not tracked.
  - A 2-second hold applies after the tracked player dies before switching.
  - Re-running while atPow is active turns tracking off.
  - Tracking mode is saved in the '*at' userinfo key and restored on map change.

Permission:  any spectator
Match-state: any time (including matchless mode)

Example:
  auto_pow          -- start following the highest-powerup carrier
  auto_pow          -- run again to turn off

See also: autotrackktx (score-based tracking), autotrack (KTXPro event-driven tracking), next_pow (manual one-shot cycle through powerup carriers)
```

### Notes

- FLAG: existing description says "pentagram > quad > ring, tiebroken by frags" -- confirmed correct in ranking, BUT omits that biosuit is NOT tracked (commented out at g_utils.c:2115 with note "Disabled biosuit to trigger autotrack, as recent gameplays of new 2024 maps with biosuit showed that this is unwanted"). Added explicit "biosuit is not tracked" to draft.
- FLAG: existing description says "ring or suit" in the broader description context -- source confirms ring is tracked (1000) but suit/biosuit is explicitly disabled. Corrected in draft.

---

## next_best (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:896
- **Catalog line**: 3062
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Switches your point-of-view to the next top-ranked player, toggling between the two best-performing players in the match. Available before and during a match.
>
> Set by: spectator only ('next_best' in-game).

### Shape classification

shape-less. One-shot toggle between the two top-ranked players (`get_ed_best1()` / `get_ed_best2()`). No persistent state, no userinfo write, no autotrack mode. Standalone command; no cvar pair, no vote mechanism.

### Proposed draft

```
Switches your spectated view to toggle between the two top-ranked players: if you are currently watching the top-ranked player, it switches to the second-ranked; otherwise it switches to the top-ranked.

Effect:
  - If currently watching rank-1 player, switches to rank-2 player (or rank-1 if no rank-2 exists).
  - If currently watching rank-2 player or anyone else, switches to rank-1 player.
  - One-shot; does not set persistent autotrack mode.
  - Prints an error if no ranked players are found.

Permission:  any spectator
Match-state: any time (including matchless mode)

Example:
  next_best         -- jump to the top-ranked player (or toggle to rank-2 if already there)

See also: autotrackktx (continuous score-based tracking), next_pow (cycle through powerup carriers)
```

### Notes

- One-shot command with no persistent autotrack state (no `SetUserInfo` call in handler). Clean shape-less standalone.
- Error message is `"next_best: can't do this now"` (source at commands.c:6319).

---

## next_pow (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:897
- **Catalog line**: 3089
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command. Cycles your point-of-view to the next player currently holding a powerup (quad, ring, invincibility, or suit). Wraps around after the last. Prints an error if no player is carrying a powerup. Available before and during a match.
>
> Set by: spectator only ('next_pow' in-game).

### Shape classification

shape-less. One-shot cycle through live powerup carriers in entity-list order. No persistent autotrack state, no cvar pair, no vote mechanism.

### Proposed draft

```
Cycles your spectated view to the next player currently holding any powerup (pentagram, quad, or ring); wraps back to the first after the last. Prints an error if no player carries a powerup.

Effect:
  - Scans live players in entity-list order for a current powerup holder (pentagram, quad, ring).
  - Switches to the next holder after the currently tracked player; wraps to the first on reaching the end.
  - One-shot; does not set persistent autotrack mode.
  - If no powerup carrier exists, prints "next_pow: can't find poweruped player" and does nothing.

Permission:  any spectator
Match-state: any time (including matchless mode)

Example:
  next_pow          -- jump to the next player holding a powerup

See also: auto_pow (continuous powerup-carrier autotrack), autotrackktx (continuous score-based tracking), next_best (toggle between the two top-ranked players)
```

### Notes

- FLAG: proposed-draft regression -- the Headliner and Effect-bullet enumerate "(pentagram, quad, or ring)" / "(pentagram, quad, ring)", omitting suit (radsuit). Source at commands.c:6358-6361 checks `invincible_finished` (pentagram), `super_damage_finished` (quad), `invisible_finished` (ring), AND `radsuit_finished` (suit) -- all four. Existing L1 description correctly listed all four ("quad, ring, invincibility, or suit"). Apply-pass-author must add "suit" to both the Headliner and the Effect bullet. Contrast: `auto_pow` legitimately excludes suit (commented out in `CalculateBestPowPlayers`); `next_pow` does include it.
- "Invincibility" in the existing description = pentagram of protection (`invincible_finished`). Correct mapping.
- Clean draft; no contradictions found.

---

## Sub-group 6: Demo navigation, cross-batch-threaded, and trex movement-capture (9)

## cam (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/spectate.c:68 (handler); src/commands.c:840 (registration)
- **Catalog line**: 2241
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints camera-control help to the invoking spectator. Lists: impulse 1 to jump between spawn points, [attack] to change camera mode, [jump] to change the tracked target. Spectator-only. Read-only.
>
> Set by: n/a (read-only command).

### Shape classification

shape-less (usage tutorial -- explains spectator keybindings, not a sibling-command roster).

Handler at `spectate.c:68` is a pure three-line `G_sprint` printing keybinding instructions (`impulse 1`, `[attack]`, `[jump]`). No state, no dispatch, no sibling family listed. Distinct from Shape 10 (curated-family help-printer) per the catalog disambiguation: Shape 10 markets a roster of independently-registered sibling commands; `cam` prints usage instructions (keybindings/controls for spectator camera). The worked-examples file cites `cam` explicitly as the canonical counter-example to Shape 10.

### Proposed draft

```
Prints spectator camera-control keybinding help.

Effect:
  Displays three lines: how to jump between spawn points (impulse 1),
  how to change camera mode ([attack]), and how to change the tracked
  target ([jump]).

Permission:    any spectator
Match-state:   any time

Example:
  cam
  > use impulse 1 to jump between spawn points
  > use [attack] to change cam mode
  > use [jump] to change target

See also: tracklist (view who each spectator is tracking)
```

### Notes

- No contradictions with source. Handler at `spectate.c:68` confirms three-line print with exactly those keybinding instructions.
- Registration: `CF_SPECTATOR | CF_MATCHLESS` -- any spectator, any time (including matchless/warmup). Permission wording: `any spectator`.
- `CF_MATCHLESS` means available even in matchless (warmup) mode; "any time" is the correct Match-state phrasing (Match-state section omitted per convention when "any time").
- Shape-less rationale: usage-tutorial (prints control instructions), not a sibling-command roster. Per catalog disambiguation and dispatcher override in this chunk's briefing.

---

## dlist (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:965 (registration), src/commands.c:7984 (handler)
- **Catalog line**: 2325
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lists the demos available on the server. Forwards the request to the MVDSV server with any arguments passed through, returning the demo listing to the caller's console.
>
> Set by: any player or spectator.

### Shape classification

shape-less (command action -- server-side demo listing passthrough via stuffcmd to MVDSV `demolist`).

Handler at `commands.c:7984`: `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demolist %s\n", params_str(1, -1))`. Sends the request to MVDSV's `demolist` handler via client-side `cmd`. Not CF_REDIRECT but achieves the same client-routes-to-server effect via stuffcmd. The `STUFFCMD_IGNOREINDEMO` flag excludes the request from any ongoing MVD recording. No inter-entity relationship, no gating cvar -- shape-less.

### Proposed draft

```
Requests the server's demo file listing and prints it to your console.

Effect:
  Sends a "cmd demolist" request to the MVDSV server. Optional
  arguments are forwarded as-is; the server returns the matching demo
  list.

Permission:    any player or spectator
Match-state:   any time

Example:
  dlist
  dlist dm6   (filter by map name, forwarded to server)

See also: dinfo (show metadata for a specific demo), demomark (place a marker in the current recording)
```

### Notes

- Registration: `CF_BOTH | CF_MATCHLESS | CF_PARAMS`. `CF_BOTH` = any player or spectator. `CF_MATCHLESS` = available in warmup/matchless. `CF_PARAMS` = takes forwarded arguments.
- The stuffcmd uses `STUFFCMD_IGNOREINDEMO` (defined as `1<<0` in g_syscalls.h) -- this means the outbound `cmd demolist` request is excluded from any active MVD recording stream. Existing description correctly notes this behavior.
- MVDSV's handler `SV_DemoList_f` is registered at `sv_user.c:3340`. The forwarded argument is passed through verbatim.
- No contradictions with source.

---

## dinfo (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:966 (registration), src/commands.c:7989 (handler)
- **Catalog line**: 2297
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Requests demo information from the server for the current or a specified demo, passing any arguments through to the server-side `demoinfo` handler. The request is excluded from any ongoing MVD recording (housekeeping that would clutter the demo stream).
>
> Default: n/a (command, not a cvar).
> Set by: any player or spectator.

### Shape classification

shape-less (command action -- demo info passthrough via stuffcmd to MVDSV `demoinfo`).

Handler at `commands.c:7989`: `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "cmd demoinfo %s\n", params_str(1, -1))`. Same pattern as `dlist`. No inter-entity relationship, no gating cvar -- shape-less.

### Proposed draft

```
Requests metadata for a specific demo from the server and prints it to
your console.

Effect:
  Sends a "cmd demoinfo" request to the MVDSV server. Optional
  arguments (demo number or filename) are forwarded; without arguments
  the server reports on the currently-recording demo.

Permission:    any player or spectator
Match-state:   any time

Example:
  dinfo          (info on the currently-recording demo)
  dinfo 3        (info on demo slot 3)

See also: dlist (list available demos)
```

### Notes

- Registration: `CF_BOTH | CF_MATCHLESS | CF_PARAMS`. Same flag set as `dlist`.
- `STUFFCMD_IGNOREINDEMO` excludes the housekeeping request from the MVD stream (same mechanism as `dlist`). Existing description correctly captures this.
- `Default: n/a` in the existing description is noise (commands have no default by definition). Dropped in recast.
- MVDSV handler `SV_MVDInfo_f` registered at `sv_user.c:3343`.
- No contradictions with source.

---

## demomark (KTX command, Demo & spectator -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:1043 (registration), src/commands.c:301 (handler)
- **Catalog line**: 2268
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Places a named, timestamped marker into the server-side MVD demo recording so the moment can be jumped to during playback. The marker is labelled with the caller's name and timestamped relative to match start (displayed as MM:SS on success).
>
> Only recorded during a live match. A second marker within 5 seconds of the previous one is ignored. Prints 'Demo markers full!' once the per-match cap is reached.
>
> Set by: any player (in-game command, match must be in progress).

### Shape classification

shape-less (command action -- places timestamped marker in server-side MVD demo recording).

Handler at `commands.c:301`: first calls `stuffcmd(self, "//demomark\n")` (client-side demo file bookmark, excluded from MVD stream), then writes a `demo_markers[]` entry (server-side, capped at 10). The server-side markers are printed with timestamps at match end via `match.c:249`. No inter-entity relationship, no gating cvar -- shape-less.

### Proposed draft

```
Places a timestamped marker in the server-side MVD demo recording at
the current match moment.

Effect:
  Records a marker entry (capped at 10 per match) with your name and
  a timestamp relative to match start (shown as MM:SS on success).
  Markers are listed at match end and can be used to locate key moments
  during demo playback.
  - Second marker within 5 seconds of the previous one is silently ignored.
  - Once the 10-marker cap is reached, prints "Demo markers full!" and
    does nothing further.

Prerequisites: match must be in progress (live match only; does nothing
  pre-match or during intermission).

Permission:    any player or spectator
Match-state:   mid-match only

Example:
  demomark
  > Added demo marker: 02:45

See also: dlist (list recorded demos), dinfo (view demo metadata)
```

### Notes

- FLAG: Registration is `CF_BOTH` (any player or spectator), NOT `CF_PLAYER` as implied by "Set by: any player" in the existing description. Both players and spectators can place markers. The draft reflects `CF_BOTH`.
- The handler first calls `stuffcmd(self, "//demomark\n")` -- this sends a client-side `//demomark` command (a QW client-side demo file bookmark), which is separate from the server-side `demo_markers[]` array entry. The stuffcmd path is not flagged to IGNOREINDEMO, so it goes into client-side recording only. This internal detail is omitted from L1 per action-level discipline.
- `match_in_progress <= 1` returns silently (no message): value 0 = not started, value 1 = countdown. Value 2 = live match is the only path that writes a marker. The existing description's "Only recorded during a live match" is correct but incomplete -- it also returns silently during pre-match (countdown).
- Server-side marker cap is 10 (hardcoded at `commands.c:292-293`). Existing description says "per-match cap" -- correct.
- Marker timestamps are printed at match end by `match.c:249` alongside the marker names, giving the post-match timeline overview.

---

## tracklist (KTX command, Demo & spectator -- Shape 4)

- **Status**: drafted
- **Source**: src/commands.c:842 (registration), src/commands.c:5426 (handler)
- **Catalog line**: 3116
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints the list of spectators and who each is tracking. Shows "not tracking" for spectators not currently following a player; "No spectators present" if there are none.
>
> Players cannot use this command during a live match unless k_allowtracklist is enabled.
>
> Set by: any player or spectator.

### Shape classification

Shape 4 (gated command -- gated by `k_allowtracklist` for players during live matches).

Gate at `commands.c:5433`: `if (!cvar("k_allowtracklist") && match_in_progress && self->ct == ctPlayer)`. The gate is partial: it only blocks players (`ctPlayer`) during active matches. Spectators are never blocked regardless of `k_allowtracklist`. This is a Shape 4 variant with a partial-caller-type gate (not full blanket gate).

### Proposed draft

```
Prints the spectator tracking list -- which player each spectator is
currently following.

Effect:
  Lists each spectator by name with their tracked player, or
  "not tracking" if they are not following anyone. Prints "No spectators
  present" if there are no spectators connected.

Prerequisites: during a live match, players require k_allowtracklist to
  be enabled. Spectators can always invoke tracklist.
  Refusal message: "tracklist is disabled".

Permission:    any player or spectator
Match-state:   any time (pre-match unrestricted; mid-match: players
  gated by k_allowtracklist)

Example:
  tracklist
  > Trackers list:
  >     SpectatorA -> PlayerX
  >     SpectatorB  not tracking

See also: k_allowtracklist (gate cvar, default 1), toggletracklist (toggle the gate), klist (list players and their ping/team/skin)
```

### Notes

- `k_allowtracklist` defaults to `1` (`RegisterCvarEx("k_allowtracklist", "1")` at `world.c:862`). The gate fires only when it is `0`. This is an important nuance: by default the command is unrestricted even mid-match for players.
- Registration: `CF_BOTH | CF_MATCHLESS` -- any player or spectator, any time including warmup. The additional runtime gate is inside the handler, not the CF flags.
- The `toggletracklist` handler (`commands.c:5457`) broadcasts a reminder to also toggle `klist` (which has a parallel `k_allowklist` gate). The cross-reminder is a UI concern, not L1 content; omitted per MVI discipline.
- `toggletracklist` is the Shape 1-like toggle for `k_allowtracklist`; `klist` is the sibling command with parallel gate.
- Cross-batch dependency: `k_allowtracklist` was drafted in Admin & permissions batch 2026-05-26 with `toggletracklist`. The shape tag on `tracklist` (Shape 4 gated command) should align with `k_allowtracklist`'s See-also.

---

## moreinfo (KTX command, Demo & spectator -- shape-less (command-side lever for Shape 11a relationship on k_spec_info))

- **Status**: drafted
- **Source**: src/commands.c:932 (registration), src/commands.c:7151 (handler)
- **Catalog line**: 3035
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Spectator command: cycle your extra-info detail level, controlling how much live item and powerup pickup information you receive during play. Levels progress from off, through powerups/armors/mega/RL, up to all weapons, then wrap back to off. If the server has spectator info disabled (k_spec_info), prints 'Spec info is turned off by server' and does nothing.
>
> Set by: spectator command.

### Shape classification

shape-less (command-side lever for the Shape 11a relationship on `k_spec_info`).

`moreinfo` cycles the per-spectator `mi` userinfo key (0 through 4, wrapping). It does NOT XOR a bit on `k_spec_info` -- it sets per-spectator detail level. The Shape 11a relationship (per-bit bitmask XOR) belongs to `infospec` (toggles `MI_ON`) and `infolock` (toggles `MI_ADM_ONLY`) on the server-side container `k_spec_info`. `moreinfo` is a per-spectator filter lever gated on whether `MI_ON` is set in `k_spec_info`. This is correctly shape-less: `moreinfo` is the consumer-side per-recipient level cycler, not a container-bit toggle.

5 detail levels (indices 0-4):
- 0: off ("Receiving extra infos: off")
- 1: powerups / armors / MH / RL
- 2: powerups / armors / MH / RL / GL / LG
- 3: powerups / armors / MH / weapons (all)
- 4: powerups only

### Proposed draft

```
Cycles your spectator extra-info detail level, setting how much live
item and powerup pick-up information you receive.

Effect:
  Advances your personal detail level through five steps, wrapping back
  to off:

  0  off -- no extra info
  1  powerups, armors, MH, RL
  2  powerups, armors, MH, RL, GL, LG
  3  powerups, armors, MH, all weapons
  4  powerups only

  Each step prints a confirmation line showing the active level.
  The server's mi_print sends matching pick-up events to spectators at
  or above the relevant level.

Prerequisites: k_spec_info must have the MI_ON bit set (server-side).
  If not set, prints "Spec info is turned off by server" and does nothing.

Permission:    any spectator
Match-state:   any time

Example:
  moreinfo        (first call: set level 1 -- powerups/armors/MH/RL)
  moreinfo        (second call: advance to level 2)
  moreinfo        (third call: advance to level 3)
  moreinfo        (fourth call: advance to level 4 -- powerups only)
  moreinfo        (fifth call: back to off)

See also: k_spec_info (bitmask gate -- MI_ON bit must be set), infospec (toggles MI_ON on k_spec_info), infolock (toggles MI_ADM_ONLY on k_spec_info)
```

### Notes

- `moreinfo` cycles the spectator's own `mi` userinfo key (`iKey(self, "mi")` + 1, wraps at `mi_levels_cnt` = 5). It does NOT write to `k_spec_info`. The Shape 11a tag belongs on the `k_spec_info` card; `moreinfo` is the per-spectator consumer-side lever.
- Registration: `CF_SPECTATOR | CF_MATCHLESS` -- any spectator, any time. Permission wording: `any spectator`.
- Gate: `mi_on()` = `(int)cvar("k_spec_info") & MI_ON` (defined at `g_consts.h:282`). If `MI_ON` is 0, the command prints the refusal message and returns.
- If `MI_ADM_ONLY` is also set in `k_spec_info`, then `mi_print` only sends events to admin spectators. `moreinfo` itself is not affected by `MI_ADM_ONLY` -- any spectator can cycle their level, but if `MI_ADM_ONLY` is set, non-admin spectators will never actually receive events even at level > 0. This nuance is omitted from L1 per MVI discipline (it belongs to the `k_spec_info` card or an L3 concept note).
- Cross-batch: `k_spec_info` was drafted in Spectator chat & visibility batch; `infospec` and `infolock` are the Shape 11a toggles. Per-card skill note: the Shape 11a description lives on `k_spec_info`'s card; this card documents the spectator-side cycler.

---

## trx_play (KTX command, Demo & spectator -- shape-less (one member of the trx_rec / trx_play / trx_stop trio))

- **Status**: drafted
- **Source**: src/commands.c:990 (registration), src/commands.c:8229 (handler)
- **Catalog line**: 3145
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Plays back a previously recorded trick movement capture. Stops any in-progress trick recording or playback first, then spawns a player-model entity that replays the capture. Prints 'can't playback now' and does nothing if playback is not currently possible.
>
> Set by: any player (in-game command).

### Shape classification

shape-less (one of the trx trio: trx_rec / trx_play / trx_stop -- internal per-player movement capture; not an external tool integration, not CF_REDIRECT).

Source verification: `mv_cmd_playback` at `commands.c:8229`. Calls `mv_stop_record()` and `mv_stop_playback()` first (resets prior state), then checks `mv_can_playback()`. If playback is possible, spawns a `pb_ent` (player model entity) that replays the captured frames. The buffer is per-player (`self->plrfrms[]`, max 1155 frames = 15 seconds at 77fps). No external tool integration, no stuffcmd dispatch to MVDSV, no `CF_REDIRECT`. Normal internal KTX per-player movement capture trio.

The trx trio is shape-less (three discrete actions with cross-references via See-also) because:
1. `trx_rec` starts recording (stateful start)
2. `trx_play` plays back the buffer (one-shot consumption)
3. `trx_stop` stops either active state

This could superficially resemble Shape 6 (stateful + one-shot pair), but Shape 6's defining pattern is a persistent *userinfo state* that a consumer command (`ClientSay`) reads for dispatch routing -- not a playback buffer. The trx family manages per-player movement frame buffers with no analogous state-routing consumer. Shape-less with See-also cross-references is the correct classification.

### Proposed draft

```
Plays back your most recently recorded trick-movement capture.

Effect:
  Stops any active recording or playback first, then starts replaying
  the captured movement frames as a visible player-model entity at your
  position.
  - Prints "can't playback now" and does nothing if no recording is
    available or if the match is in progress (including intermission).
  - Playback ends automatically when the last captured frame is reached,
    printing "playback finished".

Prerequisites: a prior trx_rec session must have captured frames;
  no live match or intermission must be in progress.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  trx_rec      (record your movement)
  trx_stop     (stop recording when done)
  trx_play     (replay the captured run)

  (Optional: set 'setinfo pbspeed 150' to play back at 150% speed,
  or 'setinfo pbspeed 50' for half speed.)

See also: trx_rec (start recording), trx_stop (stop recording or playback)
```

### Notes

- Registration: `CF_PLAYER` -- players only, spectators excluded. Permission: `any player (spectators excluded)`.
- `mv_can_playback()` at `commands.c:8156` returns false if `match_in_progress` or `intermission_running` (any truthy), or if no frames are available (`pb_frame >= rec_count`).
- The `pb_ent` is a player-model entity (`progs/player.mdl`) spawned at the recording origin. It is removed when playback ends or when `trx_stop` is called.
- `pbspeed` userinfo key at `commands.c:8195`: `iKey(self, "pbspeed")`, bounded 0-200, default 100 (100% speed). The key appears in `g_userinfo.c:80` as a commented-out handler entry -- it's documented as "for /trx_play". Documented in Example as an Optional knob.
- The existing description says "Stops any in-progress trick recording or playback first" -- confirmed correct.

---

## trx_rec (KTX command, Demo & spectator -- shape-less (one member of the trx_rec / trx_play / trx_stop trio))

- **Status**: drafted
- **Source**: src/commands.c:989 (registration), src/commands.c:8321 (handler)
- **Catalog line**: 3172
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Starts recording your movement into an in-memory trick-demo buffer for later replay. Stops any active recording or playback first, then prints "recording". Prints "can't record now" if the buffer is full or if recording is blocked (live match, intermission, or currently replaying a buffer). The buffer holds a fixed number of frames.
>
> No arguments.
>
> Set by: 'trx_rec' command (any player).

### Shape classification

shape-less (one of the trx trio -- see trx_play shape classification).

### Proposed draft

```
Starts recording your movement into an in-memory buffer for trick-run
replay.

Effect:
  Stops any active recording or playback first, then begins capturing
  your movement frames (position, angles, model frame, effects).
  Prints "recording" on success.
  - Prints "can't record now" and does nothing if a match is in
    progress, intermission is running, or you are currently in playback.
  - Buffer capacity is 1155 frames (~15 seconds at 77 fps per player).
    Reaching the cap automatically stops the recording.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  trx_rec      (start capturing your movement)
  -- move around, bunny-hop, execute trick run --
  trx_stop     (end the capture)
  trx_play     (replay the captured run)

See also: trx_play (replay the captured buffer), trx_stop (stop recording or playback)
```

### Notes

- Registration: `CF_PLAYER` -- players only. Permission: `any player (spectators excluded)`.
- `mv_can_record()` at `commands.c:8271` returns false if `match_in_progress` (any truthy value including countdown), `intermission_running`, `mv_is_playback()` (sanity block), or `rec_count >= MAX_PLRFRMS`.
- `MAX_PLRFRMS` is defined as `77*15 = 1155` frames at `include/progs.h:284`. Comment confirms "77 frames for each of 15 seconds."
- At cap, `mv_stop_record()` is called internally from the think loop (`mv_record()` at `commands.c:8300-8305`); not from the `trx_rec` command itself. Existing description's "buffer holds a fixed number of frames" is correct but underpowered; the draft supplies the actual cap.
- The existing description says "Prints 'can't record now' if ... currently replaying a buffer" -- confirmed at `commands.c:8278`.
- "No arguments." in existing description is noise (commands without args don't need this stated). Dropped per MVI discipline.

---

## trx_stop (KTX command, Demo & spectator -- shape-less (one member of the trx_rec / trx_play / trx_stop trio))

- **Status**: drafted
- **Source**: src/commands.c:991 (registration), src/commands.c:8341 (handler)
- **Catalog line**: 3201
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Stops the calling player's in-memory trick-demo recording and any active trick-demo playback. If a recording was running it is ended (the captured buffer is kept). If a playback was running it is removed and "playback finished" is printed. No effect if neither was active.
>
> Set by: any player (no arguments; see also: 'trx_rec', 'trx_play').

### Shape classification

shape-less (one of the trx trio -- see trx_play shape classification).

### Proposed draft

```
Stops any active trick-movement recording or playback.

Effect:
  Calls both the stop-recording and stop-playback routines:
  - If recording was active: ends the capture and keeps the buffer;
    prints "recording finished (N frames)".
  - If playback was active: removes the replay entity and prints
    "playback finished".
  - If neither is active: no effect, no message.

Permission:    any player (spectators excluded)
Match-state:   any time

Example:
  trx_rec     (start recording)
  trx_stop    (end recording -- buffer kept)
  trx_play    (replay the buffer)
  trx_stop    (abort the playback early)

See also: trx_rec (start recording), trx_play (replay the buffer)
```

### Notes

- Registration: `CF_PLAYER` -- players only. Permission: `any player (spectators excluded)`.
- Handler at `commands.c:8341` is minimal: calls `mv_stop_record()` then `mv_stop_playback()`. Both functions are no-ops if the respective state is not active.
- `mv_stop_record()` at `commands.c:8259` prints "recording finished (N) frames" where N is `self->rec_count`.
- `mv_stop_playback()` at `commands.c:8138` prints "playback finished" and removes `pb_ent`.
- No CF_MATCHLESS: `trx_stop` has no `CF_MATCHLESS` flag. However since the recording/playback can't start during a match, `trx_stop` during a match is effectively a no-op (nothing to stop). Match-state: "any time" is technically accurate.
- "No arguments" and the inline See-also in the existing description's Set-by line are noise. Dropped per MVI discipline.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: Permission-mislabel pattern surfaces 5th batch -- `demomark`

**Verdict**: ACTIONABLE

**Cards involved**: `demomark` (`drafted_with_flag`)

**Observation**: Existing description for `demomark` says "Set by: any player",
implying `CF_PLAYER` registration. Source registration is `CF_BOTH` (players +
spectators). This is the 5th batch surfacing the systematic Permission mislabel
pattern (prior: Mode-selection, Frogbot, Scoring-stats, Admin-permissions; in
those batches the mislabel was "Admin command" prose with `CF_PLAYER | CF_SPC_ADMIN`
or `CF_PLAYER` underlying). The `demomark` case is the inverse direction --
existing prose UNDER-states permission scope rather than over-stating.

**Source evidence**: `src/commands.c` registration row for `demomark` (line
near 845); CF flag table in
`~/.claude/skills/ktx-l1-rewrite/references/universal-shape-v2.md` Permission
discipline table; the per-card recast updates Permission line accordingly.

**Recommendation**: Apply the v2 Permission line as drafted (`any player or
spectator`). Add to the known-systematic Permission mislabel cumulative list.

---

### F2: `autotrack` "not available during a live match" claim is backwards

**Verdict**: ACTIONABLE

**Cards involved**: `autotrack` (`drafted_with_flag`)

**Observation**: Existing description for `autotrack` says "not available
during a live match". Source registration is `CF_SPECTATOR | CF_MATCHLESS`.
`CF_MATCHLESS` (bit 4 per `include/g_local.h:648-658`) EXTENDS availability to
matchless mode; it does NOT restrict from live matches. The existing claim is
backwards-stated: the command IS available during live matches AND in matchless
mode. Apply-pass-author replaces the wrong claim with the correct
Match-state line ("any time, including matchless mode").

**Source evidence**: `src/commands.c` registration for `autotrack`;
`include/g_local.h:648-658` CF flag semantics.

**Recommendation**: Apply the v2 Match-state line as drafted; consider this a
genuine factual fix, not a wording adjustment.

---

### F3: `next_pow` draft regression -- proposed Headliner + Effect drop "suit" (radsuit) from powerup enumeration

**Verdict**: ACTIONABLE

**Cards involved**: `next_pow` (`drafted_with_flag`)

**Observation**: The proposed-draft Headliner reads "(pentagram, quad, or ring)"
and the Effect bullet reads "(pentagram, quad, ring)", enumerating only 3
powerups. Source at `src/commands.c:6358-6361` iterates over all 4 powerup
finished timers (`invincible_finished`, `super_damage_finished`,
`invisible_finished`, AND `radsuit_finished`), including suit. The existing L1
description correctly listed all 4 ("quad, ring, invincibility, or suit"). The
sub-agent's Notes section verified source includes suit but its proposed draft
regressed to 3 powerups. This is an internal inconsistency in the draft.

**Source evidence**: `src/commands.c:6358-6361` (next_pow iteration loop);
existing description verbatim quoted in the draft's "Current description" block.

**Recommendation**: Apply-pass-author must restore "suit" to the proposed-draft
Headliner and Effect bullet. Contrast: `auto_pow` legitimately excludes suit
(see F4); `next_pow` includes it.

---

### F4: `auto_pow` vs `next_pow` -- suit semantics diverge by design

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `auto_pow` (`drafted_with_flag`), `next_pow`
(`drafted_with_flag`)

**Observation**: Both cards track powerup carriers but treat the radsuit
(biosuit) differently. `auto_pow` uses `CalculateBestPowPlayers()` which has
suit commented out (with a note about 2024 maps making suit-tracking unwanted);
`next_pow` has its own iteration loop that includes `radsuit_finished`. This
divergence is intentional, and the two cards now reflect it correctly (after
F3 is applied). The See-also lines on both cards distinguish the two as
related-but-different powerup-tracking commands.

**Source evidence**: `src/g_utils.c:2115` (CalculateBestPowPlayers suit
exclusion comment); `src/commands.c:6358-6361` (next_pow includes radsuit).

**Recommendation**: After F3 is applied, both cards correctly enumerate their
respective powerup sets. No further action required.

---

### F5: Canonical-card pattern applied at scale -- 40 of 69 entities

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `fav1_add` (canonical for favN_add); `fav2_add..fav20_add`
(19 references); `1fav_go` (canonical for Nfav_go); `2fav_go..20fav_go` (19
references). Total 40 cards.

**Observation**: The largest single canonical-card application to date (prior
batches applied to ~4-6 entities). All 38 reference cards were source-verified
against the canonical at registration (identical CF flag, identical handler
modulo slot index). The Frogbot batch F11 precedent (aim_pitch_* / aim_yaw_*
rejected from canonical because of clamp/formula differences) did NOT fire
here -- the slot-keyed fan-out is behaviorally uniform. Reference cards carry
Headliner + See-also + Notes only; the full v2 description lives on the
canonical card.

**Source evidence**: `src/commands.c:846-885` (registration rows for all 40
slot-keyed commands; same `DEF(favx_add)` / `DEF(xfav_go)` handlers).

**Recommendation**: No apply-pass action; the canonical-card discipline holds
cleanly. Track this batch as the largest canonical-card application reference
point for future batches.

---

### F6: Matchless-mode behavioral split surfaced within the fav family

**Verdict**: ACTIONABLE

**Cards involved**: Generic family (`fav_add`, `fav_del`, `fav_all_del`,
`fav_next`, `fav_show`) -- all `CF_SPECTATOR | CF_MATCHLESS`; slot-keyed family
(`favN_add` N=1..20, `Nfav_go` N=1..20) -- all `CF_SPECTATOR` only. The
slot-keyed family is REJECTED in matchless mode (`DoCommand()` at
`commands.c:1078` filters on `CF_MATCHLESS` when `k_matchLess` is active).

**Observation**: No existing description for any of the 45 fav-family entities
mentioned this behavioral split. The 1fav_go canonical (drafted_with_flag) now
flags it explicitly; fav1_add canonical adds it to Match-state. Apply-pass
author should ensure the Match-state distinction propagates to both canonicals,
since reference cards inherit Match-state from canonical.

**Source evidence**: `src/commands.c:846-885` (CF flag registrations);
`src/commands.c:1078` (DoCommand matchless-mode filter); `include/g_local.h:648`
(CF_MATCHLESS = bit 4).

**Recommendation**: Apply-pass-author validates the Match-state line on
fav1_add AND 1fav_go is "not available in matchless mode (server must run with
k_matchless 0)" or equivalent. Generic-family canonicals (fav_add etc.) carry
the matchless-available Match-state.

---

### F7: Two-array storage model surfaced -- `self->fav[]` vs `self->favx[]`

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `fav_add` / `fav_del` / `fav_all_del` / `fav_next` /
`fav_show` (operate on `self->fav[]`); `favN_add` / `Nfav_go` slot-keyed family
(operate on `self->favx[]`); `fav_show` is the only command that reads BOTH.

**Observation**: Source-confirmed that the generic family and the slot-keyed
family use SEPARATE per-player arrays. Existing descriptions implied "favourite
slots" without making the two-array distinction explicit. The `fav_show` card
serves as the bridge: its Effect describes printing both arrays. This finding
documents the model rather than requiring action -- the per-card recasts
already reflect it.

**Source evidence**: `src/commands.c` handler bodies for `fav_add` (modifies
`self->fav[]`) and `favx_add` (modifies `self->favx[]`); `fav_show` reads both
in sequence.

**Recommendation**: No action required; the model is now documented across
the relevant cards' Notes sections.

---

### F8: `_k_nospecs` reclassified -- vote-result state container, NOT Shape 9b engine state-mirror

**Verdict**: ACTIONABLE

**Cards involved**: `_k_nospecs` (`drafted_with_flag`)

**Observation**: The handoff doc hypothesized `_k_nospecs` as a Shape 9b
engine state-mirror cvar (single-underscore prefix). Source check shows
`_k_nospecs` is written by `vote_check_nospecs()` on vote-threshold pass --
it's a vote-RESULT state container related to the `nospecs` command (Shape 7b
vote-toggle) and the `k_vp_nospecs` threshold cvar. The sub-agent correctly
trusted source over the handoff hypothesis. Classification: `shape-less`
(state container for the Shape 7b relationship; the shape tag lives on the
`nospecs` command card per per-card skill discipline). Cross-batch threading
dependency: `nospecs` + `k_vp_nospecs` exist in prior batches (likely Voting
or Server config); apply-pass-author validates See-also wiring.

**Source evidence**: `vote_check_nospecs()` in `src/vote.c` (or equivalent
vote-handling file); `_k_nospecs` registration at `src/world.c:785`.

**Recommendation**: Apply-pass-author confirms `nospecs` + `k_vp_nospecs`
are present in L1 from prior batches and the See-also wiring is bidirectional
(see-also on `nospecs` should include `_k_nospecs`). Also: existing
`_k_nospecs` description's "nospecs admin command" prose mislabels `nospecs`'s
permission (it's `CF_PLAYER | CF_SPC_ADMIN`, not admin-only) -- F1 audit
residue, fix at apply-pass.

---

### F9: `autotrack` vs `autotrackktx` -- behaviorally distinct, no canonical-card collapse

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `autotrack`, `autotrackktx`

**Observation**: The names are near-similar but source shows separate code
paths and distinct semantic modes. `autotrack` passes `atKTPRO` (event-driven:
switches on RL pickup, player death, powerup events). `autotrackktx` passes
`atBest` (continuous score re-evaluation every tick). Per the Frogbot batch
F11 precedent (aim_pitch_* / aim_yaw_* rejected from canonical-card because of
clamp/formula differences), drafted as separate full cards. Canonical-card
pattern was NOT applied.

**Source evidence**: `src/commands.c:6006-6119` (autotrack vs autotrackktx
mode-flag dispatch paths).

**Recommendation**: No action; the two cards correctly diverge.

---

### F10: trex family (`trx_play` / `trx_rec` / `trx_stop`) is internal -- trigger 4 did NOT fire

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `trx_play`, `trx_rec`, `trx_stop`

**Observation**: The handoff doc flagged the trex family as a possible
trigger-4 sui-generis park candidate (compile-time-bound external tool
integration, stdcmd routing). Source check shows the trio is a fully INTERNAL
per-player movement-capture system: 1155-frame buffer at
`include/progs.h:284`, handlers `mv_cmd_record`, `mv_cmd_playback`,
`mv_cmd_stop` in `src/commands.c`. No external tool integration, no
`CF_REDIRECT`, no `stuffcmd`. Three shape-less command actions with mutual
See-also cross-references. Trigger 4 did NOT fire.

**Source evidence**: `src/commands.c:8229` (mv_cmd_playback / trx_play);
`src/commands.c:8321` (mv_cmd_record / trx_rec); `src/commands.c:8341`
(mv_cmd_stop / trx_stop); `include/progs.h:284` (per-player frame buffer
declaration).

**Recommendation**: No action; the trex family classified cleanly as
shape-less. Track this finding as an example of handoff-hypothesis vs
source-truth divergence (the "HYPOTHESES not contracts" discipline from
handoff Rule 7 worked as intended).

---

### F11: Cross-batch See-also threading -- 3 entities reference prior-batch entities

**Verdict**: ACTIONABLE

**Cards involved**: `_k_nospecs` (references `nospecs`, `k_vp_nospecs`);
`tracklist` (references `k_allowtracklist`, `toggletracklist`, `klist`);
`moreinfo` (references `k_spec_info`, `infospec`, `infolock`).

**Observation**: Three cards in this batch carry See-also pointers to entities
drafted in prior batches:

- `tracklist` -> `k_allowtracklist` + `toggletracklist` (Admin & permissions
  batch 2026-05-26, Shape 1 paired toggle). `klist` is likely a sibling
  command also in Admin & permissions or related; apply-pass-author validates.
- `moreinfo` -> `k_spec_info` + `infospec` + `infolock` (Spectator chat &
  visibility batch 2026-05-25 for `k_spec_info` Shape 11a;
  `infospec`/`infolock` are the per-bit toggles, drafted same batch).
- `_k_nospecs` -> `nospecs` + `k_vp_nospecs` (likely Voting or Server config
  batches; verify).

**Source evidence**: Each card's See-also list (drafted in this batch);
prior-batch drafts files `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-*.md`.

**Recommendation**: Apply-pass-author validates the named cross-batch entities
exist in L1 (or in prior batches' drafts pending apply) and the bidirectional
See-also wiring is symmetric where appropriate. If any referenced entity is
missing from L1, surface as a follow-up before applying these cards.

---

### F12: `k_demo_mintime` matchtag exception missing from existing description

**Verdict**: ACTIONABLE

**Cards involved**: `k_demo_mintime` (`drafted_with_flag`)

**Observation**: Existing description for `k_demo_mintime` omits the matchtag
exception: when the server has the `matchtag` infokey set,
`match_can_cancel_demo()` at `src/match.c:2499-2503` always returns false,
preserving the demo unconditionally regardless of match duration vs
`k_demo_mintime`. The recast adds this clause to the Effect bullet.

**Source evidence**: `src/match.c:2499-2503` (match_can_cancel_demo matchtag
guard); `src/world.c:1005` (k_demo_mintime registration).

**Recommendation**: Apply the v2 Effect line as drafted; the matchtag
exception is a real user-surprise behavior worth documenting at L1.

---

### F13: `k_demotxt_format` framing is misleading -- JSON is always written internally

**Verdict**: ACTIONABLE

**Cards involved**: `k_demotxt_format` (`drafted_with_flag`)

**Observation**: Existing description for `k_demotxt_format` frames the cvar
as a choice between xml/json formats. Source check at `src/stats.c:574-601`
shows JSON stats file is always written internally for demo embedding (comment:
"Always write json, so it can be embedded in demo"). The cvar controls only
whether an ADDITIONAL non-JSON file is also written. Setting the cvar to
"json" actually SUPPRESSES the additional file (not produces a new JSON file).
The xml/json framing inverts the meaning of one of the cvar's values.

**Source evidence**: `src/stats.c:574-601` (always-write JSON comment + branch
on k_demotxt_format for additional non-JSON file).

**Recommendation**: Apply the v2 prose as drafted (clarifies internal-JSON vs
additional-file semantics). Consider the existing description's framing a
foundational-ish factual error, though localized enough to flag (not park).
