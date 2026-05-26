# ktx-l1-rewrite drafts -- batch 2026-05-26 (Admin & permissions)

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies clean
drafts, hand-edits flagged drafts after verifying the surfaced contradiction.
Drafts do NOT auto-apply to L1 (`entities.description`); the apply pass is a
separate phase.

Batch totals: 37 entities. 21 drafted clean + 14 drafted_with_flag + 2 parked
(operator-accepted park; see `ktx-l1-rewrite-parked-2026-05-26-admin-permissions.md`).

Anchor: v1.36-1633-g67253dc

---
## admin (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:750 (registration); src/admin.c:313-394 (ReqAdmin handler)
- **Catalog line**: 579
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Claims or relinquishes admin status on the server using the admin password (k_admincode) or a VIP auto-grant.
>
> With no argument: if already admin, relinquishes admin; if a code-entry is in progress, cancels it; otherwise starts admin-code entry (use number/impulse commands to enter the code). VIPs flagged as admin are granted immediately.
> With one argument: treated as the admin password; grants admin on match, with a 5-second anti-brute-force delay between failed attempts.
>
> Refused if k_admins is 0, or while the caller is currently the subject of a pending admin election.
>
> Default: n/a (command, not a cvar).
> Set by: any player or spectator.

### Shape classification

Shape-less. The `admin` command is the password-entry command that grants or relinquishes admin status. It has no cvar+command pair relationship, no vote mechanism, no sibling family. The CF_BOTH|CF_MATCHLESS|CF_PARAMS flags reflect that any player or spectator can reach this command (including not-yet-admins who need to enter the password). The handler's branching logic (pending-election guard, already-admin relinquish, code-cancel, k_admins check, VIP fast-grant, one-arg password path, no-arg code-start) is sui-generis procedure rather than a cataloged inter-entity shape.

### Proposed draft

```
Claims or relinquishes admin status on the server using the server password or a VIP fast-grant.

Effect:
  Pending-election guard: if you are currently the subject of a running admin
    election (via elect), the command is refused -- abort the election first.
  Already admin: relinquishes admin status and broadcasts the demotion.
  Code entry in progress (no-arg path only): cancels the active code-entry session.
  Admin system disabled: refused ("NO admins on this server!") if k_admins is 0.
  VIP fast-grant: if your VIP entry carries the admin flag, admin is granted
    immediately without a password.
  One-argument path (admin <password>): compares the argument against k_admincode.
    On match, grants admin. On failure, prints "Access denied" and starts a 5-second
    cooldown before another attempt is accepted.
  No-argument path (admin with no args): starts a multi-step code-entry session.
    Use number keys or impulse commands to enter the code digit by digit.

Prerequisites: k_admins must be 1 (admin system enabled).

Permission:    any player or spectator
Match-state:   any time (CF_MATCHLESS -- usable during live matches)

Example:
  # Quick password entry (typical):
  admin mypassword

  # Start interactive code entry session (when password is numeric):
  admin
  # then use number keys or impulse commands to enter code digits

See also: k_admins (master admin-system toggle; must be 1), k_admincode (the server password this command checks against), elect (alternative admin promotion via player vote)
```

### Notes

- CF_BOTH|CF_MATCHLESS|CF_PARAMS confirmed at `commands.c:750`. CF_BOTH means any player or spectator. CF_MATCHLESS means usable during a live match (correct -- people need to become admin during matches).
- The "pending election" guard at `admin.c:313-317` checks `is_elected(self, etAdmin)` -- the guard fires when the caller has an **active outgoing** election (they themselves started one), not when they are the **subject** of an election by others. The existing description says "while the caller is currently the subject of a pending admin election" -- this is a localized inaccuracy. Source: `is_elected(self, etAdmin)` checks the caller's own pending election, not whether others have elected to promote this person. Recast reflects source truth.
- FLAG: The existing description says the command is refused "while the caller is currently the subject of a pending admin election." Source (`admin.c:313-317`: `if (is_elected(self, etAdmin)) { G_sprint(self, 2, "Abort election first\n"); return; }`) shows the guard fires when the CALLER has an active outgoing election (they started an `elect` call themselves). The phrasing "subject of a pending admin election" suggests others are voting for this person, which is the opposite direction. Corrected in the proposed draft.
---
## allow_toggle_practice (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:876 (registration); src/commands.c:4914 (gate read in TogglePractice)
- **Catalog line**: 191
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Access control for the /practice command (toggles the server in and out of practice mode).
>
> 0 = no one may use /practice.
> 1 or 2 = admins only.
> 3 or 4 = admins only (judge tiers are not implemented; these values fall back to admin-only).
> 5 = all players.
> Other = command rejected (server misconfigured).
>
> The command is always blocked while a match is in progress, force-start is active, or an idlebot is present.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command) + Shape 4 (gates the `practice` command).

The `allow_toggle_practice` cvar is read by `TogglePractice()` at `commands.c:4914-4968`. Unlike `k_allowcountchange`, the tier logic is implemented inline in the handler rather than via `check_perm()`, but the permission tier semantics are the same pattern. No `cvar_toggle_msg`; no cycle handler. Shape 3 + Shape 4 composition.

A key distinction from `k_allowcountchange`: values 3 and 4 print "judges is not implemented in this mode" and fall back to requiring admin (not a full refusal like case 0), whereas cases 3 and 4 in `k_allowcountchange`'s `check_perm()` are a full refusal. This distinction is source-verified.

### Proposed draft

```
Controls who may use the practice command to toggle the server in and out of practice mode.

Effect:
  Gates the practice command. The command is always blocked while a match is in
  progress, a force-start (k_force) is active, or an idlebot is present on the server.
  Also blocked if lock_practice is set to 2 (server locked in current practice mode)
  or any value other than 0 or 1.

Values:
  0 = no one (command always refused).
  1 = real admin only.
  2 = admin (real or elected).
  3 = "judges" tier not implemented -- falls back to admin-only.
  4 = "judges" tier not implemented -- falls back to admin-only.
  5 = all players.
  other = command rejected (server misconfiguration message printed).

Permission:    server config only
Default:       0

Example:
  # server.cfg -- open practice toggle to all players (typical pub setup)
  allow_toggle_practice 5

  # server.cfg -- race mode default locks practice off
  allow_toggle_practice 0

See also: practice (the command this gates), lock_practice (can lock the server in practice mode regardless of this setting)
```

### Notes

- Source at `commands.c:4921-4927`: the `lock_practice` early-return fires before the `allow_toggle_practice` switch, so `lock_practice` takes precedence. This is a surprise-bearing prerequisite not mentioned in the existing description -- added to Effect.
- The existing description correctly says values 3 and 4 "fall back to admin-only" -- source confirms this (they print the judges message then check `is_adm(self)`). This is distinct from k_allowcountchange where 3/4 are full refusals. Preserved accurately.
- Race mode defaults at `race.c:298` set this to 0 (locked), and at `race.c:320` set this to 5 (open); noted in example for pedagogical value.
---
## ban (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:975 (KTX registration); mvdsv src/sv_main.c:2503 (handler SV_Cmd_Ban_f)
- **Catalog line**: 612
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bans a connected player by user id or nick for a timed period. KTX passes this command to the underlying server engine, which performs the actual ban; ban duration and ban-list semantics are controlled by the server, not by KTX.
>
> Default: n/a (command).
> Set by: admin command 'ban <userid|nick>'.

### Shape classification

shape-less (command-side lever for CF_REDIRECT pass-through -- no KTX-side inter-entity relationship)

The command is registered with CF_REDIRECT in KTX; the handler `redirect` passes the command directly to mvdsv's `SV_Cmd_Ban_f`. KTX has no handler-side cvar pairing, no vote relationship, no toggle relationship. The inter-entity shape lives in mvdsv (ban/banip/banrem sibling family), not in KTX's relationship catalog. Layer B tag: shape-less on the KTX card; the sibling cross-links in See-also are the only relational signal.

### Proposed draft

```
Bans a connected player by user ID or name for a specified time period. KTX routes this command to the server engine (mvdsv), which performs the ban and records it to the ban list.

Effect:
  - Disconnects the matched player and blocks their IP from reconnecting for the specified duration.
  - Broadcasts the ban to all players: "<name> was banned for <N><unit>".
  - Writes the ban to the server's persistent ban list (survives map changes).

Permission:    admin only (handler in mvdsv)
Match-state:   any time

Example:
  ban 42 10m              ban player with userid 42 for 10 minutes
  ban PlayerName 2h       ban player named "PlayerName" for 2 hours
  ban PlayerName 1d reason  ban for 1 day with reason appended to broadcast

  Time units: s (seconds), m (minutes), h (hours), d (days). Maximum 999 per unit.

See also: banip (ban by IP address directly), banrem (remove ban or list active bans), kick (immediate disconnect without ban)
```

### Notes

- mvdsv handler: `SV_Cmd_Ban_f` at `sv_main.c:2503`. Handler checks `mod_admin` field (AF_REAL_ADMIN flag) -- only real admins (not elected admins) can issue bans from within the game; mvdsv enforces this at the engine level.
- CF_MATCHLESS in the KTX registration means the command is usable even in matchless-mode servers; match-state is "any time".
- Sibling family: ban / banip / banrem are registered together at commands.c:975-977; all share CF_BOTH_ADMIN | CF_MATCHLESS | CF_PARAMS | CF_REDIRECT.
- The broadcast format `"<name> was banned for <N><unit><reason>"` is verified from `sv_main.c:2590`.
---
## banip (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:976 (KTX registration); mvdsv src/sv_main.c:2601 (handler SV_Cmd_Banip_f)
- **Catalog line**: 640
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command for timed IP bans. KTX passes the command through to the underlying server (MVDSV); the actual ban duration and ban-list behaviour is handled by the server, not by KTX.
>
> Set by: admin command in-game.

### Shape classification

shape-less (sibling of `ban` family; CF_REDIRECT pass-through; same rationale as `ban`)

### Proposed draft

```
Bans a specific IP address from the server for a specified time period. KTX routes this command to the server engine (mvdsv), which performs the ban and records it to the ban list.

Effect:
  - Blocks the specified IP from connecting for the given duration.
  - Broadcasts the ban to all players: "<IP> was banned for <N><unit>".
  - Writes the ban to the server's persistent ban list.

Permission:    admin only (handler in mvdsv)
Match-state:   any time

Example:
  banip 1.2.3.4 30m     ban IP address 1.2.3.4 for 30 minutes
  banip 1.2.3.4 1d      ban for 1 day

  Time units: s (seconds), m (minutes), h (hours), d (days). Maximum 999 per unit.

See also: ban (ban connected player by user ID or name), banrem (remove ban or list active bans), kick (immediate disconnect without ban)
```

### Notes

- mvdsv handler: `SV_Cmd_Banip_f` at `sv_main.c:2601`. Unlike `ban`, `banip` does not look up a connected player -- it takes a raw IP string directly, so it can ban an address that is not currently connected.
- Handler also checks `mod_admin` field (AF_REAL_ADMIN flag) -- real admin only.
- Broadcast format `"<IP> was banned for <N><unit>"` verified from `sv_main.c:2663`.
- The existing description is thin (no example, no time-unit format) but accurate; this recast adds the user-facing detail.
---
## banrem (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:977 (KTX registration); mvdsv src/sv_main.c:2669 (handler SV_Cmd_Banremove_f)
- **Catalog line**: 667
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Removes a ban or lists current bans. KTX passes this command through to the underlying server (MVDSV); the actual ban-removal and ban-list behaviour is handled by the server, not by KTX itself.
>
> Set by: admin command 'banrem'.

### Shape classification

shape-less (sibling of `ban` family; CF_REDIRECT pass-through; same rationale as `ban`)

### Proposed draft

```
Removes a ban entry by its list index, or prints the full ban list when called with no argument. KTX routes this command to the server engine (mvdsv).

Effect:
  - With argument: removes the ban at the given index from the server's ban list.
  - Without argument: prints all active ban entries with their index numbers, then exits (no removal).

Permission:    admin only (handler in mvdsv)
Match-state:   any time

Example:
  banrem          print the current ban list (shows index numbers)
  banrem 2        remove ban entry at index 2

See also: ban (ban by user ID or name), banip (ban by IP address), kick (immediate disconnect without ban)
```

### Notes

- mvdsv handler: `SV_Cmd_Banremove_f` at `sv_main.c:2669`. No-arg path calls `SV_BanList()` (`sv_main.c:2443`) and then returns without removing anything -- verified from `sv_main.c:2689-2693`.
- Handler also checks `mod_admin` field (AF_REAL_ADMIN flag) -- real admin only.
- The "or lists current bans" semantic is the no-arg behavior; verified from the handler's `Cmd_Argc() < 2` branch at `sv_main.c:2689`.
---
## check (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:994 (registration); src/commands.c:8418-8510 (fcheck handler)
- **Catalog line**: 694
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Sends an anti-cheat query to every connected client and broadcasts the responses. Usage: 'cmd check <f_query>' (e.g. f_version).
>
> Allowed queries for non-admins: f_version, f_modified, f_server, f_movement. Real admins may issue any f_* query.
> f_movement reports each non-bot player's perfect-strafe percentage and SOCD detection counts immediately.
> All other queries broadcast a randomized challenge and collect replies for ~3 seconds before reporting.
>
> Refused: during a live match, if not given exactly one argument, or while a previous check is still pending.
>
> Set by: admin command 'check' in-game.

### Shape classification

Shape-less. The `check` command is a standalone anti-cheat query dispatcher. It has no cvar pairing, no sibling family, no vote mechanism. CF_BOTH|CF_PARAMS -- any player or spectator can invoke it (with the handler enforcing per-caller query restrictions).

### Proposed draft

```
Sends an anti-cheat query to every connected client and reports the responses.

Effect:
  Broadcasts the f_query to all clients and collects replies.
  f_movement: immediately reports per-player perfect-strafe percentage and SOCD
    detection counts for all non-bot players (no wait required).
  All other queries: broadcasts a randomized challenge string, waits ~3 seconds,
    then reports all replies received.

Prerequisites:
  Exactly one argument required (the query name).
  No previous check may be pending (one check at a time).
  k_admins is not checked by this command -- the caller's real-admin status
    controls query scope only.

Permission:    any player or spectator; real admins may issue any f_* query;
               non-admins are limited to: f_version, f_modified, f_server, f_movement
Match-state:   pre-match only

Example:
  # Check client versions (available to all):
  cmd check f_version

  # Check SOCD detection (available to all):
  cmd check f_movement

  # Real admin -- check arbitrary query:
  cmd check f_client

See also: klist (shows connected client IDs to correlate against check output)
```

### Notes

- CF_BOTH|CF_PARAMS confirmed at `commands.c:994`. NO CF_MATCHLESS, so the engine framework would ordinarily block during matches. The handler ALSO has an explicit `if (match_in_progress) { return; }` (silent return, no message). Match-state is pre-match only.
- The permission split (non-admin limited to 4 queries; real admin unrestricted) is verified at `commands.c:8449-8455`. The 4 allowed queries for non-admins are: f_version, f_modified, f_server, f_movement. These are exact string comparisons with `strneq`.
- The existing description is accurate. Recast to v2 shape: split Permission into two tiers (any player/spectator for access, real-admin for query scope), formalized Match-state section.
- The "3 seconds" wait is source-verified: `f_check = g_globalvars.time + 3` at `commands.c:8489`.
---
## commands (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:702 (registration); src/commands.c:1460-1511 (ShowCmds/Do_ShowCmds handlers)
- **Catalog line**: 727
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Lists all KTX server commands in two sections: common commands and admin commands. Both sections are shown to every caller regardless of admin status -- the split is by command flag, not by caller rights. Commands with no description or not valid for the caller's class are omitted. An optional argument filters the list to names containing that substring.
>
> Set by: any player or spectator (no match-state restriction).

### Shape classification

Shape-less. The `commands` command is an introspective command lister: it iterates the command table dynamically with class/permission/match-state filters and an optional substring search. Output is per-caller-dynamic (filtered by the caller's player/spectator class). As documented in `shape-catalog.md`'s "Distinguish from these neighbors" section under Shape 10: this is explicitly classified shape-less -- "1-of-1 in KTX; shape-less for now -- crystallize if a sibling surfaces."

### Proposed draft

```
Lists KTX server commands available to the caller, split into common and admin sections.

Effect:
  Calls Do_ShowCmds twice: once for common commands, once for admin commands.
  Each pass filters the command table by:
    - Commands with no description (or CD_NODESC) are omitted.
    - Commands not valid for the caller's class (player vs spectator) are omitted.
    - Commands not matching the admin/common split being printed are omitted.
    - If a substring argument is given, only commands whose name contains it are shown.
  Both sections (common and admin) are shown to all callers regardless of
  admin status; the section label ("admin commands") reflects the command's
  flag, not a permission gate on displaying it.

Permission:    any player or spectator
Match-state:   any time (CF_MATCHLESS)

Example:
  # List all commands:
  commands

  # Filter to commands whose name contains "kick":
  commands kick

See also: (none -- standalone introspective lister)
```

### Notes

- CF_BOTH|CF_MATCHLESS|CF_PARAMS confirmed at `commands.c:702`. Any player or spectator, any time, takes optional substring argument.
- Source-verified: `Do_ShowCmds` at `commands.c:1460-1505` walks `cmds[]` array and applies class/description/admin-flag filters. The `isValidCmdForClass()` and `isCmdRequireAdmin()` checks at lines 1476 and 1481 are the filter mechanisms.
- The existing description is accurate. Recast to v2 shape with explicit Effect section showing the filter chain.
- See-also is empty: there are no load-bearing peer entities (the `qizmo`/`options` help-printers are Shape 10; `commands` is explicitly shape-less and distinct from those per the catalog).
---
## dropitem (KTX command, Admin & permissions -- Shape 4b serverinfo-key-gated command)

- **Status**: drafted
- **Source**: src/commands.c:1037; handler src/commands.c:9205
- **Catalog line**: 754
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Debug/map-testing command that spawns a named item at your position. Requires cheats enabled (*cheats serverinfo set) and is refused during a match. No argument prints the list of valid names.
>
> Accepted names: health (h15/h25/h100), armor (ga/ya/ra), weapons (ssg/ng/sng/gl/rl/lg), ammo (sh20/sh40/sp25/sp50/ro5/ro10/ce6/ce12), powerups (p/s/r/q), CTF flags (fl_r/fl_b), spawnpoints (sp_r/sp_b/sp_dm/sp_cp/sp_sp). Spawned items can later be exported with 'dumpent'.
>
> Set by: any player (cheats required).

### Shape classification

Shape 4b (serverinfo-key-gated command)

The handler checks `strnull(ezinfokey(world, "*cheats"))` (`commands.c:9215`) as the gate. CF flag is `CF_BOTH | CF_PARAMS` -- any player or spectator. `*cheats` serverinfo is the effective gate.

### Proposed draft

```
Spawns a named item at your current position. Used for map layout testing; spawned items persist in the session and can be exported with 'dumpent'. No argument prints the list of accepted item names.

Effect:
  - Spawns the specified item entity at the invoker's origin.
  - Reports "Spawned <classname>" on success, or "Can't spawn <classname>" if spawn fails.
  - No argument: prints the full item name roster instead of spawning.

Prerequisites: the '*cheats' serverinfo key must be set on the server. Pre-match only (refused while match is in progress).

Permission:    any player or spectator (gated at runtime by *cheats serverinfo key)
Match-state:   pre-match only

Example:
  dropitem              print the item name list
  dropitem ra           spawn a red armor at your position
  dropitem rl           spawn a rocket launcher
  dropitem fl_r         spawn a red CTF flag

  Health:      h15, h25, h100
  Armor:       ga, ya, ra
  Weapons:     ssg, ng, sng, gl, rl, lg
  Ammo:        sh20, sh40, sp25, sp50, ro5, ro10, ce6, ce12
  Powerups:    p (pent), s (suit), r (ring), q (quad)
  CTF flags:   fl_r, fl_b
  Spawnpoints: sp_r, sp_b, sp_dm, sp_cp, sp_sp

See also: dumpent (exports all dropitem-placed entities to dump.ent for reuse)
```

### Notes

- Handler `dropitem` at `commands.c:9205`. Gate checks `strnull(ezinfokey(world, "*cheats"))` at line 9215; `match_in_progress` check at line 9210.
- CF_BOTH (`CF_PLAYER | CF_SPECTATOR`) means any player or spectator; `*cheats` is the effective gate.
- Item table `dropitems[]` at `commands.c:9084-9117` verified; item names, classnames, and spawnflags are hardcoded there. The full name list in the draft is verified against this table.
- Spawned items have `p->dropitem = true` set (`commands.c:9144`), which is how `dumpent` identifies them for export.
---
## dumpent (KTX command, Admin & permissions -- Shape 4b serverinfo-key-gated command)

- **Status**: drafted
- **Source**: src/commands.c:1039; handler src/commands.c:9330
- **Catalog line**: 783
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Exports entities placed with 'dropitem' to a file named dump.ent on the server. Each entity block records classname, origin, and (when set) angle/angles and spawnflags. Reports "Dumped N entities" on completion. Only entities spawned via 'dropitem' in the current session are included -- pre-existing map entities are not.
>
> Requires cheats to be enabled on the server. Refused while a match is in progress.
>
> Set by: admin command 'dumpent' (cheats required).

### Shape classification

Shape 4b (serverinfo-key-gated command)

The handler checks `strnull(ezinfokey(world, "*cheats"))` (`commands.c:9341`) and returns early with a refusal message if cheats are disabled. Gate is the `*cheats` serverinfo key, not a `k_*` cvar. CF flag is `CF_BOTH | CF_PARAMS` -- any player or spectator at the gate level, but the handler's `*cheats` check and `match_in_progress` check effectively narrow the usable scope.

### Proposed draft

```
Exports all items placed with 'dropitem' in the current session to a file named 'dump.ent' on the server. Useful for persisting a custom item layout as an entity file that can be loaded on future map runs.

Effect:
  - Writes a 'dump.ent' file in the server's file system. Each entry records classname, origin, and (if set) angle/angles and spawnflags.
  - Reports "Dumped N entities" to the invoker on completion.
  - Only items spawned via 'dropitem' in the current session are included; pre-existing map entities are not.

Prerequisites: the '*cheats' serverinfo key must be set on the server ("Cheats are disabled on this server" refusal otherwise). Pre-match only (refused while match in progress).

Permission:    any player or spectator (gated at runtime by *cheats serverinfo key)
Match-state:   pre-match only

Example:
  dropitem ra       spawn a red armor at your position
  dropitem rl       spawn a rocket launcher
  dumpent           export the placed items to dump.ent

See also: dropitem (spawns individual items that dumpent will export)
```

### Notes

- Handler `dumpent` at `commands.c:9330`. Gate checks `strnull(ezinfokey(world, "*cheats"))` at line 9341; `match_in_progress` check at line 9336.
- CF_BOTH (`CF_PLAYER | CF_SPECTATOR`) means any player or spectator at the gate level; the `*cheats` serverinfo key is the effective gate. Any player or spectator can issue the command if cheats are enabled.
- The `dump.ent` format mirrors the standard Quake entity file format (classname/origin/angle/angles/spawnflags blocks) -- verified from `commands.c:9368-9388`.
- Only `p->dropitem == true` entities are exported (`commands.c:9358`) -- these are items spawned by `dropitem` command; pre-existing map entities have `dropitem = false`.
- The exported file can be used as a custom entity override (`.ent` file) loaded via the `k_entityfile` side-channel mechanism.
---
## force_spec (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:973 (registration); src/admin.c:974-1028 (force_spec handler)
- **Catalog line**: 812
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Forces one or all players to reconnect as spectators. The target is taken from the command argument, or from the admin's "fs" userinfo key if no argument is given. Using "*" moves every unreadied player (except the admin) to spectator. Otherwise a single player is targeted by name or by a negative spectator slot number, and is toggled to spectator -- or back to player if already spectating. Usable in and out of a match.
>
> Set by: admin command 'force_spec' in-game.

### Shape classification

Shape-less. The `force_spec` command is a standalone admin action that moves clients between player and spectator slots. CF_BOTH_ADMIN|CF_PARAMS. No cvar pairing, no vote mechanism, no sibling family that fits a cataloged shape.

### Proposed draft

```
Moves a player to spectator, or toggles a spectator back to player. Admin-only.

Effect:
  With argument "*": moves every unreadied player (except the issuing admin)
    to spectator.
  With player name or ID: moves the named player to spectator. If the target
    is already spectating, toggles them back to player.
  Negative IDs (e.g. -3) target spectators by slot number.
  Without argument: falls back to the admin's "fs" userinfo key for the target.
    If "fs" is not set, prints a usage hint.

Permission:    admin only
Match-state:   any time

Example:
  # Move all unreadied players to spec before match start:
  force_spec *

  # Move a specific player by name:
  force_spec badplayer

  # Set fs userinfo for repeated use without retyping:
  setinfo fs "badplayer"
  force_spec

See also: kick (removes player from server entirely), klist (shows player/spectator IDs for targeting)
```

### Notes

- FLAG: The existing description says the target is a "negative spectator slot number." Source at `admin.c:1013`: `p = ((i_fs = atoi(c_fs)) < 0 ? spec_by_id(-i_fs) : SpecPlayer_by_IDorName(c_fs))`. The negative-number path calls `spec_by_id(-i_fs)`, which targets a spectator by slot, not a player. The description says "single player is targeted by name or by a negative spectator slot number" which is accurate in meaning but slightly ambiguous: negative numbers target spectators (to toggle them back to player), not players. The recast makes the toggle behavior explicit.
- The existing description says players "reconnect as spectators" which implies a full reconnect. Source uses `do_force_spec()` which moves the client directly without disconnection. Not a foundational framing error (the outcome is the same), but "moves to spectator" is more accurate than "reconnect as spectator."
- handler at `admin.c:978`: the first check is `if (!is_adm(self)) { return; }` -- silent refusal for non-admins. CF_BOTH_ADMIN at registration handles the CF-level gate; the handler adds a redundant runtime check. Both confirm admin-only.
---
## fp (KTX command, Admin & permissions -- Shape 2)

- **Status**: drafted
- **Source**: src/commands.c:963 (handler: fp_toggle at g_cmd.c:193, type=1)
- **Catalog line**: 839
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Cycles the chat flood-protection level to the next configured preset (wrapping back to first after last). Each preset sets how many messages are allowed, over what time window, and how long a flooder is muted. The new level and its limits are broadcast to everyone.
>
> Set by: admin command 'fp'.
> See also: k_fp (cvar storing the current level index).

### Shape classification

Shape 2: cvar + paired cycle command. Handler reads `cvar("k_fp")`, increments + wraps at `say_fp_levels_cnt` (3), writes back via `cvar_fset("k_fp", k_fp)`. Three hardcoded presets in `say_fp_levels[]` (g_cmd.c:150-155): Low (9/1s/1s), Medium (4/1s/5s), High (5/3s/7s). k_fp default is 1 (Low). No match-state gate in handler (fp works any time).

### Proposed draft

```
Cycles the chat flood-protection level for players to the next preset (wrapping back to 1 after the last), updating k_fp and broadcasting the new level's limits to everyone.

Effect:
  Increments k_fp by 1; wraps from 3 back to 1.
  Presets (1-indexed):
    1 = Low    -- 9 messages per 1 second; mute 1 second
    2 = Medium -- 4 messages per 1 second; mute 5 seconds
    3 = High   -- 5 messages per 3 seconds; mute 7 seconds

Permission:    admin only

Example: fp

See also: k_fp (paired cvar -- stores current preset index; can be set directly to skip cycling), fp_spec (sibling cycle command for spectator chat)
```

### Notes

- No match-state restriction in handler (g_cmd.c:193-219); fp works at any time -- Match-state line omitted.
- Cross-batch: paired cvar `k_fp` lives in a different category/batch (likely Server-config or Flood-protection). Apply-pass-author should verify symmetric See-also when that batch ships.
---
## fp_spec (KTX command, Admin & permissions -- Shape 2)

- **Status**: drafted
- **Source**: src/commands.c:964 (handler: fp_toggle at g_cmd.c:193, type=2)
- **Catalog line**: 867
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Cycles the chat flood-protection level for spectators to the next preset, updating k_fp_spec and broadcasting the new level's name and limits to all players. Each preset defines how many messages are allowed, over what time window, and how long a flooder is muted.
>
> Set by: admin command 'fp_spec' (cycles through the configured presets).

### Shape classification

Shape 2: cvar + paired cycle command. Same `fp_toggle` handler with type=2; operates on `k_fp_spec` instead of `k_fp`. Same three presets (Low/Medium/High). k_fp_spec default is 3 (High) per `RegisterCvarEx("k_fp_spec", "3")` in world.c:1008 -- different default from player-side `k_fp` (default=1).

### Proposed draft

```
Cycles the chat flood-protection level for spectators to the next preset (wrapping back to 1 after the last), updating k_fp_spec and broadcasting the new level's limits to everyone.

Effect:
  Increments k_fp_spec by 1; wraps from 3 back to 1.
  Presets are identical to the player-side presets (see fp for the full table).

Permission:    admin only

Example: fp_spec

See also: k_fp_spec (paired cvar -- stores current spectator preset index; can be set directly to skip cycling), fp (sibling -- player-side flood-protection cycle)
```

### Notes

- Cross-batch: paired cvar `k_fp_spec` lives in a different batch. Apply-pass-author should verify symmetric See-also when that batch ships.
---
## hdptoggle (KTX command, Admin & permissions -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:835 (handler: hdptoggle at commands.c:5196)
- **Catalog line**: 894
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that toggles the server-wide handicap lock (k_lock_hdp) and announces the new state to all players. While locked, any player's attempt to change their handicap is refused. Has no effect while a match is in progress.
>
> Default: unlocked (follows k_lock_hdp default of 0).
> Set by: admin command 'hdptoggle' (match-gated).

### Shape classification

Shape 1: cvar + paired toggle command. Handler uses `trap_cvar_set_float("k_lock_hdp", !cvar("k_lock_hdp"))` (boolean NOT flip) rather than `cvar_toggle_msg`, but the semantic pattern is identical to Shape 1 -- binary flip on the paired cvar + broadcast. Pre-match gate via `match_in_progress` early-return. CF_BOTH_ADMIN confirms admin-only. Paired cvar `k_lock_hdp` registered with no default (= 0) in world.c:801.

### Proposed draft

```
Toggles the server-wide handicap lock (k_lock_hdp), preventing or re-enabling players' ability to set their own handicap.

Effect:
  Flips k_lock_hdp between 0 (unlocked) and 1 (locked).
  While locked: player handicap changes are refused, and all players' effective handicap is forced to 100 (neutral) until unlocked.
  Broadcasts the new state including the admin's name.

Permission:    admin only
Match-state:   pre-match only

Example: hdptoggle

See also: k_lock_hdp (paired cvar -- stores the lock state)
```

### Notes

- FLAG: Existing description includes "Default: unlocked (follows k_lock_hdp default of 0)" on the command card. Commands have no default in the v2 shape -- defaults belong on the cvar card (`k_lock_hdp`). This is a v1-shape artifact; apply-pass-author should move the default note to the k_lock_hdp cvar card when that batch ships.
- Source adds one behavioral detail not in existing description: `GetHandicap()` at g_utils.c:1662 forces effective handicap to 100 when locked -- players don't just get refused on new changes; their active handicap is overridden too. Surfaced in Effect.
- Cross-batch: paired cvar `k_lock_hdp` lives in a different batch. Apply-pass-author should verify symmetric See-also when that batch ships.
---
## iplist (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:984 (registration); src/commands.c:8073-8110 (iplist handler)
- **Catalog line**: 922
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints IP addresses for connected clients. If the caller has the required permission (set by k_ip_list), lists all players and spectators with their IP, an 'A' marker if admin, and their name. If the caller lacks permission, prints only their own IP. Output is private to the caller. Available to both players and spectators.
>
> Set by: any player or spectator (output depends on k_ip_list permission level).

### Shape classification

Shape-less. The `iplist` command is a standalone IP-listing tool gated by `k_ip_list` (Shape 4 relationship). As the gated command in that Shape 4 relationship, `iplist` itself is shape-less from its own card's perspective. CF_BOTH -- any player or spectator.

### Proposed draft

```
Prints IP addresses for connected clients. Output scope depends on caller permission.

Effect:
  If the caller passes the k_ip_list permission tier check:
    Lists all players and spectators with their IP address, an 'A' admin marker,
    and name. Output is private to the caller.
  If the caller does not pass the k_ip_list check:
    Prints only the caller's own IP address. No access error message is shown --
    the fallback to self-IP is the implicit refusal.

Permission:    any player or spectator; full output gated by k_ip_list tier
Match-state:   any time

Example:
  # Run as any player -- shows own IP if k_ip_list is 0:
  iplist

  # As real admin on a server with k_ip_list 1:
  iplist
  # prints: <ip> A <name> for each connected client

See also: k_ip_list (permission tier controlling full-list access), klist (client list with IDs, no IPs)
```

### Notes

- CF_BOTH confirmed at `commands.c:984`. NO CF_MATCHLESS, but the handler does not check `match_in_progress` -- available any time (the engine framework allows it mid-match because CF_BOTH without CF_MATCHLESS restriction only matters for matchless-mode-exclusive commands; CF_MATCHLESS means "valid in matchless mode," not "restricted to matchless"). On further review: the matchless handling in KTX means commands without CF_MATCHLESS are still available during matches via the CF_BOTH flag for normal in-game play. The command is available any time.
- Source at `commands.c:8073-8085`: `check_perm(self, cvar("k_ip_list"))` -- on failure, the handler prints the caller's own IP and returns (does NOT print an error). This "silent fallback to self-IP" behavior is a surprise-bearing detail not in the existing description. Added to Effect.
- The 'A' marker in full-list output: source at `commands.c:8068` -- `is_adm(p)` check, not `is_real_adm`. So elected admins also get the 'A' marker. Minor detail not worth flagging as existing description just says "admin marker."
- k_ip_list default is 0 (`RegisterCvar("k_ip_list")` -- no default string means 0). At default, no one passes the check_perm, so `iplist` always falls back to showing only the caller's IP unless an admin has set k_ip_list > 0.
---
## k_admincode (KTX cvar, Admin & permissions -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:843 (RegisterCvar); src/admin.c:365 (string match); src/admin.c:420 (numeric impulse match)
- **Catalog line**: 227
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Server passcode that grants a player real admin privileges when supplied to the /admin command. Matched as a string (/admin <code>) or via the numeric impulse path (integer match). Set to empty or "none" to disable passcode-based admin access. Failed attempts are throttled by a 5-second cooldown. Also gated by k_admins (master admin toggle).
>
> Default: (empty -- passcode access disabled).
> Set by: server config only.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

`RegisterCvar("k_admincode")` in world.c with no `cvar_toggle_msg` or `cvar_fset` write-back anywhere in the codebase. Read at two sites in admin.c: string comparison for `/admin <code>` argument path and integer accumulation for numeric impulse path. No runtime mutation path exists.

### Proposed draft

```
Server passcode for the /admin command. Players can authenticate by typing '/admin <code>' or by entering the code digit-by-digit via impulse inputs.

Effect:
  When set to a non-empty value other than "none", enables passcode-based admin authentication via /admin.
  When empty or set to "none", passcode authentication is disabled; only VIP-flagged players and elected admins can gain admin status.
  Failed attempts trigger a 5-second cooldown before the next attempt is accepted.

Prerequisites: k_admins must be enabled (master admin toggle). If k_admins is 0, /admin refuses all callers regardless of this value.

Permission:    server config only
Default:       (empty) -- passcode authentication disabled.

Example:
  # server.cfg
  k_admins 1
  k_admincode secretpass

  # In-game (text entry):
  /admin secretpass

  # In-game (impulse entry -- code 7392 entered one digit at a time via impulse):
  /admin
  # then enter digits via impulse

See also: k_admins (master admin toggle -- must be enabled for this to work), admin (command that reads this passcode)
```

### Notes

- No contradictions. Existing description accurately captures the behavior; recast applies v2 structure.
- Impulse path: `AdminImpBot` accumulates per-digit impulse inputs into `self->k_added`; on the last digit, compares integer value to `cvar("k_admincode")`. Both paths share the 5-second cooldown via `self->k_adm_lasttime`.
- VIP_ADMIN players bypass the passcode entirely (BecomeAdmin called before the string check); this is implicit -- not part of the admin passcode logic.
---
## k_admins (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:853 (RegisterCvar); src/admin.c:347 (admin command gate); src/admin.c:489 (elect/VoteAdmin gate)
- **Catalog line**: 255
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Master toggle for the KTX admin system. When disabled, all admin-related commands print "NO admins on this server!" and bail; admins cannot be designated or take admin actions.
>
> 0 = admin system unavailable on the server.
> 1 = admin system enabled (commands like /admin, /elect, designation of rcon admins, etc. work).
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 + Shape 4 composition.

Shape 3: `RegisterCvar("k_admins")` in world.c, no `cvar_toggle_msg` or `cvar_fset` write-back site anywhere. Shape 4: the cvar is read as a gate condition (`if (!cvar("k_admins")) { print("NO admins on this server!"); return; }`) in two command handlers in admin.c: the `admin` command handler (line 347) and the `VoteAdmin` handler (line 489, which backs the `elect` command).

### Proposed draft

```
Master toggle that enables the KTX admin system. When disabled, the /admin and /elect commands refuse all callers.

Effect:
  0 = admin system disabled; /admin and /elect both refuse with "NO admins on this server!" and return immediately.
  1 = admin system enabled; /admin accepts passcode or VIP-admin authentication; /elect allows admin elections (subject to k_allowvoteadmin).

Permission:    server config only
Default:       0

Example:
  # server.cfg -- enable admin system with a passcode
  k_admins 1
  k_admincode secretpass

See also: k_admincode (passcode read by /admin), k_allowvoteadmin (controls whether /elect is further allowed), admin (the login command this gates), elect (the election command this gates)
```

### Notes

- FLAG: Existing description claims "all admin-related commands print 'NO admins on this server!'" -- source shows only TWO specific command handlers check `k_admins`: the `admin` command (admin.c:347) and `VoteAdmin`/`elect` (admin.c:489). Other admin-gated commands (kick, force_spec, etc.) check `is_adm(self)` on the caller, not `k_admins` directly. Once an admin is designated (e.g. via rcon/VIP), they retain admin status and can issue admin commands even if `k_admins` is changed -- the gate is at DESIGNATION time, not at every admin-command invocation. The recast prose corrects to the verified scope.
- "Designation of rcon admins" in the existing description is not directly verified at this gate -- rcon admin designation path was not fully traced; the recast omits this unverified claim.
---
## k_allowcountchange (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:988 (registration); src/commands.c:8027 (gate read)
- **Catalog line**: 286
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Permission tier controlling who may run the player/spectator count change commands (upplayers, downplayers, upspecs, downspecs). Always refused during a live match regardless of this setting.
>
> 0 = no one may change slot counts.
> 1 = real admin only.
> 2 = admin.
> 3 = denied (judge role not implemented in this mode).
> 4 = denied (judge role not implemented in this mode).
> 5 = anyone.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config) + Shape 4 (gates commands: `upplayers`, `downplayers`, `upspecs`, `downspecs`).

Source at `commands.c:8027` reads `cvar("k_allowcountchange")` and passes it to `check_perm()`, which implements the tiered permission model. The gated commands are registered as CF_PLAYER|CF_SPC_ADMIN. No `cvar_toggle_msg` site; no cycle handler. Shape 3 + Shape 4 composition is the correct classification.

### Proposed draft

```
Controls who may use the slot-count adjustment commands (upplayers, downplayers, upspecs, downspecs).

Effect:
  Gates all four slot-count commands via the shared check_perm() permission tier.
  Any attempt to change slot counts during a live match is silently refused
  regardless of this setting.

Values:
  0 = no one (command always refused).
  1 = real admin only.
  2 = admin (real or elected).
  3 = refused ("judges" tier not implemented; same as 0).
  4 = refused ("judges" tier not implemented; same as 0).
  5 = anyone (any player or spectator).

Permission:    server config only
Default:       0

Example:
  # server.cfg -- allow real admins to adjust slot counts
  k_allowcountchange 1

See also: upplayers (adds a player slot), downplayers (removes a player slot), upspecs (adds a spectator slot), downspecs (removes a spectator slot)
```

### Notes

- Source-verified: `check_perm()` implementation at `commands.c:1513-1548` confirms the tier semantics exactly as the existing description states. Values 3 and 4 print "judges is not implemented in this mode" and return false, which is functionally identical to case 0 from the caller's perspective.
- The existing description is correct. Recast to v2 shape: split "Set by" into Permission, added Values block label for clarity, added explicit Effect section noting the match-in-progress block.
---
## k_allowed_free_modes (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:873 (RegisterCvar); src/globals.c:75 (C global loaded at map spawn); src/commands.c:4730-4735 (UserMode gate check)
- **Catalog line**: 321
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Bitmask controlling which game modes players may switch the server into via the usermode command. Evaluated once at map load; requests for modes whose bit is not set are silently discarded.
>
> 1 = 1on1, 2 = 2on2, 4 = 3on3, 8 = 4on4, 16 = 10on10, 32 = ffa, 64 = ctf, 128 = 1on1 hoonymode, 256 = 2on2on2, 512 = 3on3on3, 1024 = 4on4on4, 2048 = XonX.
>
> Add bits together for multiple modes (e.g. 4095 = all above). FFA is force-enabled on matchless servers regardless of this setting.
>
> Default: 0.
> Set by: server config (takes effect at next map load).

### Shape classification

Shape 3 + Shape 4 composition.

Shape 3: `RegisterCvar("k_allowed_free_modes")` in world.c, no `cvar_toggle_msg` or `cvar_fset` write-back anywhere. Shape 4: the cvar value is loaded into the C global `k_allowed_free_modes` at world spawn (world.c:1106) and checked in `UserMode` at commands.c:4730 -- `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))`. Gates ALL mode-switch commands that funnel through `UserMode` (1on1, ffa, ctf, 2on2, etc.).

### Proposed draft

```
Bitmask controlling which game modes players are allowed to switch the server into. Loaded once at map start; a server.cfg change requires a map restart to take effect.

Effect:
  Each bit enables one mode for the usermode path. Modes whose bit is not set are refused when a player or server invokes a mode-switch command.
  Player-invoked requests for a disallowed mode receive "Server disallows this command".
  FFA (bit 32) is force-enabled on matchless servers regardless of this cvar.

  Bit values:
    1 = 1on1
    2 = 2on2
    4 = 3on3
    8 = 4on4
    16 = 10on10
    32 = ffa
    64 = ctf
    128 = 1on1 hoonymode
    256 = 2on2on2
    512 = 3on3on3
    1024 = 4on4on4
    2048 = XonX

  Add bits together for multiple modes (e.g. 4095 enables all modes above).

Prerequisites: A server.cfg change does not take effect until the next map load (value is read into a C global at world spawn).

Permission:    server config only
Default:       0 (all mode switches disabled)

Example:
  # server.cfg -- allow 1on1, 2on2, and ffa
  k_allowed_free_modes 35   # 1 + 2 + 32

See also: k_free_mode (controls WHO may issue mode-switch commands; checked before this bitmask), k_auto_xonx (blocks usermode entirely when set)
```

### Notes

- FLAG: Existing description says "silently discarded" for disallowed mode requests -- source shows player-invoked requests receive `G_sprint(self, 2, "Server %s this command\n", redtext("disallows"))`. Server-invoked requests (sv_invoked=true) print a bprint. Neither path is silent. Recast corrects to "refused".
- The C global `k_allowed_free_modes` is loaded at world spawn (world.c:1106): `k_allowed_free_modes = cvar("k_allowed_free_modes")`. If matchless mode is active, FFA is OR'd in (world.c:1109). The `UserMode` function reads the C global, not the live cvar, so runtime `cvar_set` of this cvar has no effect until the next map load. Recast surfaces the map-reload requirement.
---
## k_allowklist (KTX cvar, Admin & permissions -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:861 (RegisterCvarEx("k_allowklist", "1")); src/commands.c:5077 (klist gate); src/commands.c:5177-5186 (toggleklist handler -- cvar_fset write-back)
- **Catalog line**: 353
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether players may use /klist (the connected-clients list) during a live match.
>
> 0 = /klist is refused for players during a match ("klist is disabled").
> 1 = /klist is allowed at all times.
>
> Spectators and use outside a match are unaffected regardless of this setting.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 1 (cvar + paired toggle command -- binary flip).

`RegisterCvarEx("k_allowklist", "1")` in world.c. The `toggleklist` handler (commands.c:5177-5186) reads `!cvar("k_allowklist")` and writes back via `cvar_fset("k_allowklist", ...)` -- a binary flip. The handler has `if (match_in_progress) { return; }` early-return (pre-match only). Registered as `CF_BOTH | CF_MATCHLESS` -- any player or spectator. Note: the handler uses `cvar_fset` + negate rather than `cvar_toggle_msg`, but the effect is an identical binary flip; Shape 1 is the correct classification.

### Proposed draft

```
Controls whether players may use /klist (connected-clients list) during a live match. Toggle with 'toggleklist' pre-match.

Effect:
  0 = /klist is refused for players during a live match ("klist is disabled"). Spectators and pre-match use are always permitted.
  1 = /klist is allowed for players at all times including during a match.

Permission:    server config or 'toggleklist' in-game (pre-match, any player or spectator)
Match-state:   toggleklist is pre-match only (refused silently if match is running)
Default:       1

Example:
  # server.cfg -- disable in-match klist access
  k_allowklist 0

  # In-game (pre-match) -- any player or spectator can toggle:
  toggleklist

See also: toggleklist (in-game toggle command for this cvar -- any player or spectator, pre-match only), k_allowtracklist (sibling cvar for tracklist; toggleklist hints to also toggle tracklist when changing this)
```

### Notes

- FLAG: Existing description says "Set by: server config" -- misses the paired `toggleklist` in-game toggle command. The toggle is accessible to ANY player or spectator (CF_BOTH | CF_MATCHLESS), not admin-only. This is a significant gap in the existing description.
- FLAG: The `toggleklist` handler broadcasts "klist: on/off - remember to also toggle tracklist" when toggled, indicating these two cvars are operationally paired. The recast surfaces this relationship in See-also.
- The toggle does NOT use `cvar_toggle_msg` (the canonical Shape 1 implementation) -- it uses `int k_allowklist = !cvar("k_allowklist")` + `cvar_fset("k_allowklist", k_allowklist)`. Effect is identical binary flip; Shape 1 classification stands.
---
## k_allowtracklist (KTX cvar, Admin & permissions -- Shape 1)

- **Status**: drafted_with_flag
- **Source**: src/world.c:862 (RegisterCvarEx("k_allowtracklist", "1")); src/commands.c:5433 (tracklist gate); src/commands.c:5459-5468 (toggletracklist handler -- cvar_fset write-back)
- **Catalog line**: 386
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether players may use the 'tracklist' command (which lists spectators and who each is tracking) during a live match. The restriction applies to players only; spectators and out-of-match use are unaffected.
>
> 0 = tracklist is disabled for players during a match ("tracklist is disabled").
> 1 = tracklist is allowed at all times.
>
> Default: 1.
> Set by: server config.

### Shape classification

Shape 1 (cvar + paired toggle command -- binary flip).

`RegisterCvarEx("k_allowtracklist", "1")` in world.c. The `toggletracklist` handler (commands.c:5459-5468) reads `!cvar("k_allowtracklist")` and writes back via `cvar_fset("k_allowtracklist", ...)` -- a binary flip. The handler has `if (match_in_progress) { return; }` early-return. Registered as `CF_BOTH | CF_MATCHLESS` -- any player or spectator. Same pattern as `k_allowklist` / `toggleklist`.

### Proposed draft

```
Controls whether players may use 'tracklist' (which lists spectators and who each is tracking) during a live match. Toggle with 'toggletracklist' pre-match.

Effect:
  0 = tracklist is refused for players during a live match ("tracklist is disabled"). Spectators and pre-match use are always permitted.
  1 = tracklist is allowed for players at all times including during a match.

Permission:    server config or 'toggletracklist' in-game (pre-match, any player or spectator)
Match-state:   toggletracklist is pre-match only (refused silently if match is running)
Default:       1

Example:
  # server.cfg -- disable in-match tracklist access
  k_allowtracklist 0

  # In-game (pre-match) -- any player or spectator can toggle:
  toggletracklist

See also: toggletracklist (in-game toggle command for this cvar -- any player or spectator, pre-match only), k_allowklist (sibling cvar for klist; toggletracklist hints to also toggle klist when changing this)
```

### Notes

- FLAG: Existing description says "Set by: server config" -- misses the paired `toggletracklist` in-game toggle command. Same gap as k_allowklist.
- FLAG: The `toggletracklist` handler broadcasts "tracklist: on/off - remember to also toggle klist" -- paired with k_allowklist operationally. Recast surfaces this.
- Same `cvar_fset` + negate pattern as `toggleklist`; Shape 1 classification stands.
---
## k_allowvoteadmin (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:878 (RegisterCvar); src/admin.c:497 (VoteAdmin/elect gate); src/commands.c:2030 (rules display)
- **Catalog line**: 417
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggle for whether players may elect a temporary admin via the /elect vote system. Independent of k_admins (which is the master admin toggle).
>
> 0 = admin election is disabled (the election prints "Admin election is not allowed on this server").
> 1 = players can vote to grant admin status.
>
> Default: 0.
> Set by: server config only.

### Shape classification

Shape 3 + Shape 4 composition.

Shape 3: `RegisterCvar("k_allowvoteadmin")` in world.c, no `cvar_toggle_msg` or `cvar_fset` write-back. Shape 4: read as gate condition in `VoteAdmin` (`if (!cvar("k_allowvoteadmin")) { G_sprint(self, 2, "Admin election is not allowed on this server\n"); return; }` at admin.c:497). Also read for display in the rules printout (commands.c:2030).

Note: `VoteAdmin` checks `k_admins` FIRST (admin.c:489), then `k_allowvoteadmin` (admin.c:497). So both cvars must be enabled for `elect` to proceed.

### Proposed draft

```
Controls whether players may use /elect to start an admin election. Requires k_admins to also be enabled.

Effect:
  0 = admin elections disabled; /elect refuses with "Admin election is not allowed on this server".
  1 = players may start an admin election via /elect.

Prerequisites: k_admins must also be enabled. /elect checks k_admins before reaching this gate -- disabling k_admins blocks elections regardless of k_allowvoteadmin.

Permission:    server config only
Default:       0

Example:
  # server.cfg -- enable admin system and allow player elections
  k_admins 1
  k_allowvoteadmin 1

See also: k_admins (prerequisite master toggle checked before this gate), k_vp_admin (percentage threshold for election to pass), elect (the command this gates)
```

### Notes

- No contradictions. Existing description is accurate; added prerequisite ordering (k_admins checked first) which is source-verified.
- The "Independent of k_admins" line in the existing description is technically accurate (the cvars are independent registrations) but misleading -- in practice k_admins is a prerequisite for elect to even reach the k_allowvoteadmin check. Recast surfaces the actual ordering.
---
## k_free_mode (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:872 (RegisterCvar); src/commands.c:4634 (UserMode reads value); src/commands.c:4716-4723 (permission gate in UserMode); src/commands.c:1513-1550 (check_perm definition)
- **Catalog line**: 448
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Access level required to issue mode-switch commands (XonX, ffa, ctf and related). In matchless mode the effective level is forced to 5 regardless of this setting.
>
> 0 = no one may switch modes.
> 1 = real admin only.
> 2 = admin.
> 3-4 = not implemented (denied).
> 5 = anyone.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 + Shape 4 composition.

Shape 3: `RegisterCvar("k_free_mode")` in world.c, no `cvar_toggle_msg` or `cvar_fset` write-back. Shape 4: `UserMode` reads this cvar as `k_free_mode = (k_matchLess ? 5 : cvar("k_free_mode"))` and calls `check_perm(self, k_free_mode)` to gate mode-switch commands. Works alongside `k_allowed_free_modes` (checked second: first the permission level, then the mode bitmask).

### Proposed draft

```
Permission level required to issue game-mode switch commands (1on1, ffa, ctf, 2on2, etc.). Checked before k_allowed_free_modes -- the caller must meet this level before the mode bitmask is consulted.

Effect:
  0 = no one may switch modes ("no one can use this command").
  1 = real admin only (password-authenticated admin).
  2 = any admin (real or elected).
  3, 4 = judges -- not implemented in KTX; refused with "judges is not implemented in this mode".
  5 = any player.
  In matchless mode: effective level is forced to 5 regardless of this cvar (anyone may switch modes in matchless).

Permission:    server config only
Default:       0

Example:
  # server.cfg -- allow any player to switch modes, with mode list controlled by k_allowed_free_modes
  k_free_mode 5
  k_allowed_free_modes 35   # 1on1 + 2on2 + ffa

See also: k_allowed_free_modes (bitmask checked after this gate -- controls which modes are permitted), k_matchless (overrides this to 5 in matchless mode)
```

### Notes

- No contradictions. Existing description is accurate; recast applies v2 structure and clarifies the two-gate model with k_allowed_free_modes.
- `check_perm` (commands.c:1513) verifies the caller's role: cases 3 and 4 print "judges is not implemented in this mode" -- source confirms the existing description's "not implemented (denied)" wording.
---
## k_ip_list (KTX cvar, Admin & permissions -- Shape 3 + Shape 4)

- **Status**: drafted_with_flag
- **Source**: src/world.c:992 (RegisterCvar); src/commands.c:8078 (iplist gate via check_perm); src/commands.c:4202 (example in admin defaults comment); src/commands.c:1513-1550 (check_perm definition)
- **Catalog line**: 482
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Permission level required to view all connected players' IP addresses via the iplist command. Players who do not meet the level can still run iplist but only see their own IP.
>
> 0 = no one (iplist always shows own-IP only).
> 1 = real (password-authenticated) admin only.
> 2 = any admin.
> 5 = all players and spectators.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 + Shape 4 composition.

Shape 3: `RegisterCvar("k_ip_list")` in world.c, no write-back. Shape 4: `iplist` handler (commands.c:8078) calls `if (!check_perm(self, cvar("k_ip_list"))) { G_sprint(self, 2, "Your IP is: %s\n", cl_ip(self)); return; }` -- gate on the permission level. `iplist` is registered `CF_BOTH` (any player or spectator); the cvar determines what level can see the full list vs own-IP-only.

### Proposed draft

```
Permission level required to view the full IP address list via 'iplist'. Callers below the required level see only their own IP.

Effect:
  0 = full list restricted from everyone; iplist shows own IP only to all callers.
  1 = real admin only (password-authenticated) can view the full list.
  2 = any admin (real or elected) can view the full list.
  3, 4 = judges -- not implemented in KTX; treated as refused.
  5 = all players and spectators may view the full list.
  Callers who do not meet the threshold always see their own IP address regardless.

Permission:    server config only
Default:       0

Example:
  # server.cfg -- allow any admin to view full IP list
  k_ip_list 2

See also: iplist (the command whose output scope this controls)
```

### Notes

- FLAG: Existing description omits values 3 and 4. `check_perm` at commands.c:1530-1533 handles cases 3 and 4: prints "judges is not implemented in this mode" and returns false. In effect they are treated as refused (caller sees own IP only). Recast adds these values with a brief note.
- The fallback when the gate fails is graceful -- the caller still gets their own IP, not a hard refusal. Existing description correctly surfaces this; recast preserves it.
---
## k_privategame_allow_specs (KTX cvar, Admin & permissions -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1090 (RegisterCvarEx("k_privategame_allow_specs", "1")); src/vote.c:1552 (private_game_toggle reads value)
- **Catalog line**: 515
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether unauthenticated spectators are tolerated when private-game mode is active. When enabled, spectators are not forced to authenticate and non-logged-in players are moved to spectator rather than disconnected. When disabled, unauthenticated spectators are disconnected and non-logged-in players receive a 'Please reconnect & login' message.
>
> 0 = unauthenticated spectators not allowed (disconnected when private mode activates).
> 1 = unauthenticated spectators tolerated.
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

`RegisterCvarEx("k_privategame_allow_specs", "1")` in world.c. No `cvar_toggle_msg` or `cvar_fset` write-back. Read in `private_game_toggle` (vote.c:1552) together with `k_privategame_force_reconnect` to decide how to treat unauthenticated spectators when private-game mode is activated.

### Proposed draft

```
Controls whether unauthenticated spectators may remain connected when private-game mode is enabled. Works together with k_privategame_force_reconnect to define the ejection policy.

Effect:
  0 = unauthenticated spectators are disconnected when private-game mode activates ("Please reconnect & login"). Non-logged-in players are also disconnected if k_privategame_force_reconnect is set.
  1 = unauthenticated spectators are tolerated; they remain connected. Non-logged-in players are moved to spectator (not disconnected) when k_privategame_force_reconnect is set.

  When private-game mode activates, sv_login is set to 1 (players-only) if this cvar is 1, or 2 (everyone) if 0 -- controlling the engine-level login requirement independently.

Permission:    server config only
Default:       1

Example:
  # server.cfg -- private game that tolerates spectators but requires players to be logged in
  k_privategame_allow_specs 1
  k_privategame_force_reconnect 1

See also: k_privategame_force_reconnect (controls whether unauthed players are acted on immediately when private mode enables), k_privategame (the active private-game state cvar), k_privategame_voteable (controls whether players can vote to enable private game)
```

### Notes

- FLAG: Existing description states "Default: 0" -- source shows `RegisterCvarEx("k_privategame_allow_specs", "1")` (world.c:1090). Default is 1. The recast corrects this.
- FLAG: The `private_game_toggle` handler (vote.c:1552-1553) uses `sv_login` = 1 when allow_specs=true (players need login; spectators don't), and sv_login = 2 when allow_specs=false (everyone needs login). This sv_login interaction is a notable behavior surfaced by source inspection; recast includes it as an Effect bullet.
---
## k_privategame_force_reconnect (KTX cvar, Admin & permissions -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1091 (RegisterCvarEx("k_privategame_force_reconnect", "1")); src/vote.c:1553 (private_game_toggle reads value)
- **Catalog line**: 546
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Controls whether unauthenticated players are ejected immediately when private-game mode is enabled mid-setup.
>
> 0 = unauthed players are only unreadied and left connected (they are cleared at the next map change).
> 1 = unauthed players are acted on immediately: force-spectated with 'You must login to play.' if unauthenticated spectators are permitted, or disconnected with 'Please reconnect & login' otherwise.
>
> Only relevant when private-game mode is toggled on during setup (has no effect once a match is running).
>
> Default: 0.
> Set by: server config.

### Shape classification

Shape 3 (cvar with no paired command -- set-once in config).

`RegisterCvarEx("k_privategame_force_reconnect", "1")` in world.c. No `cvar_toggle_msg` or `cvar_fset` write-back. Read in `private_game_toggle` (vote.c:1553) alongside `k_privategame_allow_specs` to determine immediate ejection behavior.

### Proposed draft

```
Controls whether unauthenticated players are acted on immediately when private-game mode is enabled. Works together with k_privategame_allow_specs to define the ejection policy.

Effect:
  0 = unauthenticated players are only unreadied when private mode enables; they remain connected and are cleared at the next map change.
  1 = unauthenticated players are acted on immediately:
      - If k_privategame_allow_specs is 1: force-spectated with "You must login to play."
      - If k_privategame_allow_specs is 0: disconnected with "Please reconnect & login."
  Only applies when private-game mode is toggled on during pre-match setup; has no effect once a match is running.

Permission:    server config only
Default:       1

Example:
  # server.cfg -- immediate ejection of unauthed players when private mode enables
  k_privategame_force_reconnect 1
  k_privategame_allow_specs 1   # tolerate unauthed specs; move unauthed players to spec

See also: k_privategame_allow_specs (controls spec tolerance policy, determines which ejection message is used), k_privategame (the active private-game state cvar), k_privategame_voteable (controls whether players can vote to enable private game)
```

### Notes

- FLAG: Existing description states "Default: 0" -- source shows `RegisterCvarEx("k_privategame_force_reconnect", "1")` (world.c:1091). Default is 1. The recast corrects this.
- The existing description's behavioral coverage is otherwise accurate; this is a pure default-value correction.

---

# ktx-l1-rewrite parked entities -- batch 2026-05-26

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of batch.

*(No parks in Chunk A -- all 10 entities drafted.)*
---
## kick (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:794 (registration); src/admin.c:119-172 (AdminKick handler)
- **Catalog line**: 949
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command to kick a connected player. Two modes:
>
> 'kick <id/name> [reason]' -- kicks the named player immediately; if a reason is given it is broadcast to all players.
> 'kick' (no argument) -- starts an interactive kick session; type 'y' to kick the highlighted player, 'n' to advance to the next, or 'kick' again to exit the session.
>
> Non-admins are told "You are not an admin".
>
> Set by: admin command 'kick'.

### Shape classification

Shape-less. The `kick` command is a standalone admin action with an interactive walkthrough mode. It has no cvar pairing, no sibling vote family, no shape-cataloged inter-entity relationship. CF_BOTH_ADMIN confirms admin-only at the registration level, but the handler also does an explicit `is_adm(self)` check that produces the user-facing refusal message.

### Proposed draft

```
Kicks a connected player, either immediately by name/ID or via an interactive walkthrough session.

Effect:
  With argument (kick <id/name> [reason]): kicks the named player immediately.
    If a reason string follows, it is broadcast to all players.
    Accepts player ID numbers or name substrings.
  Without argument: starts an interactive kick session. Players are displayed
    one at a time. Type y to kick the highlighted player, n to advance to
    the next, or kick again to exit the session without kicking anyone.
  Entering kick while already in a kick session exits the session.

Permission:    admin only
Match-state:   any time

Example:
  # Kick by name with reason:
  kick badplayer cheating

  # Interactive session:
  kick
  # then y / n to advance, kick to exit

See also: mkick (kicks multiple players by ID in one call), force_spec (moves players to spectator instead of disconnecting)
```

### Notes

- CF_BOTH_ADMIN confirmed at `commands.c:794`. The FIXME comment in source (`/* FIXME: interference with ezq server kick command | CF_PARAMS */`) notes that CF_PARAMS was intentionally omitted due to an interference concern with the ezQuake server-side `kick` command. This is implementation metadata; not surfaced in L1.
- Handler at `admin.c:119`: the admin check uses `is_adm(self)` (not `is_real_adm`) -- elected admins can also kick. Existing description says "Non-admins are told 'You are not an admin'" which matches the source exactly.
- The `y` command is `YesKick` and `n` is `DontKick` at `commands.c:796-797`, both CF_BOTH_ADMIN. These are the interactive session counterparts; not added to See-also as they are session-local commands rather than peer entities.
---
## klist (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:833 (registration); src/commands.c:5071-5175 (klist handler)
- **Catalog line**: 981
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Prints a detailed client list to the caller, grouped into four sections: players (id, admin marker, VIP, handicap, team, name), spectators (id, admin marker, VIP, coach marker, name, tracking target), ghosts (frags, team, name), and connecting clients (id, VIP, state, name). Each section ends with a "-- N found --" count.
>
> During a live match, ordinary players are blocked unless k_allowklist is set.
> Set by: any player or spectator.

### Shape classification

Shape-less. The `klist` command is a standalone client-state report. CF_BOTH|CF_MATCHLESS. No cvar pairing, no vote mechanism, no sibling family. The `k_allowklist` gate is a gating-cvar relationship (Shape 4), but `klist` is the gated command in that relationship -- the shape tag for Shape 4 lives on `k_allowklist`'s card, not here. `klist` is shape-less as a standalone state-printer.

### Proposed draft

```
Prints a detailed client list to the caller, grouped by connection state.

Effect:
  Output is private to the caller (not broadcast).
  Four sections, each with a "-- N found --" footer:

  Players:   id | A/a (real/elected admin) | VIP | handicap | team | name
  Spectators: id | A/a | VIP | c (coach) | name | tracking-target
  Ghosts:    frags | team | name
  Connecting: id | VIP | state (connecting/zombie) | name

  During a live match, ordinary players (not spectators) are blocked if
  k_allowklist is 0. By default k_allowklist is 1, so this block is inactive
  unless an admin disables it.

Permission:    any player or spectator
Match-state:   any time (CF_MATCHLESS); mid-match player access gated by k_allowklist

Example:
  # Print full client list:
  klist

See also: k_allowklist (controls whether players may use klist during a match), iplist (prints IP addresses; separate command), mkick (uses player IDs shown by klist for targeting)
```

### Notes

- CF_BOTH|CF_MATCHLESS confirmed at `commands.c:833`. The command is matchless (can be issued anytime), but the handler at `commands.c:5077` adds an additional runtime gate for ctPlayer during match_in_progress when k_allowklist is 0. Spectators are never blocked by this gate (gate condition checks `self->ct == ctPlayer`).
- k_allowklist default is 1 (`RegisterCvarEx("k_allowklist", "1")` at world.c:861), meaning the mid-match player block is INACTIVE by default. The existing description says "blocked unless k_allowklist is set" which is accurate but slightly ambiguous about the direction. Recast makes the default clear.
- The existing description does not mention the "A/a" distinction (real admin vs elected admin) in the player/spectator sections. Source at `commands.c:5095`: `(is_real_adm(p) ? redtext("A") : is_adm(p) ? redtext("a") : "")`. Added to the output section description.
- Ghost section verified at `commands.c:5128-5143`. Connecting/zombie section verified at `commands.c:5145-5172`.
---
## lock (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:967; handler src/admin.c:912
- **Catalog line**: 1009
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Temporarily locks the server for 15 seconds, preventing non-VIP players from connecting (they are told the lock duration); spectators are unaffected. Auto-expires with a broadcast on timeout. Issuing again while the lock is active clears it immediately. Broadcasts the lock or unlock action to all.
>
> Set by: admin command 'lock' (toggle -- first call locks, second call unlocks early).

### Shape classification

shape-less

`lock` is a standalone toggle with no paired cvar (`k_sv_locktime` is an internal engine float, not a registered user-accessible cvar). It does not follow the Shape 1 cvar+toggle pattern (no `cvar_toggle_msg`; no registered cvar that users can read/set). No vote relationship, no sibling family. The on/off toggle behavior is self-contained in `sv_lock()` via the `k_sv_locktime` internal state. Listed as a sibling in the `options` help-printer but that is a Shape 10 membership, not a relational shape for `lock` itself.

### Proposed draft

```
Temporarily locks the server for 15 seconds, blocking non-VIP players from connecting. A second invocation before the timer expires clears the lock immediately.

Effect:
  - First call: blocks non-VIP players from connecting for 15 seconds; broadcasts "<name> locked server for 15 seconds". Spectators and VIP-flagged players are unaffected.
  - Second call (while locked): clears the lock immediately; broadcasts "<name> unlocked server".
  - After 15 seconds: lock expires automatically (no broadcast).

Permission:    admin only
Match-state:   any time

Example:
  lock      lock the server (blocks non-VIP joins for 15 seconds)
  lock      (again, while locked) clear the lock immediately

See also: options (prints full server-setting command roster including lock)
```

### Notes

- Handler `sv_lock` at `admin.c:912`. Toggles internal float `k_sv_locktime`; this is NOT a registered cvar -- it is an engine-internal global. Users cannot read it via `cvar("k_sv_locktime")` in configs.
- Spectator check: `client.c:1319` reads `k_sv_locktime && !VIP(self)` -- the gate is on VIP status, not spectator vs player. Spectators bypass the lock only if VIP. Non-VIP spectators reconnecting as players would be blocked.
- The 15-second timer is hardcoded (`int lock_time = 15` at `admin.c:914`); not configurable.
- Lock does NOT auto-expire with a broadcast -- the existing description says "Auto-expires with a broadcast on timeout" but the source shows only two explicit broadcasts (lock + early-unlock). The timer is checked at connect-time (`client.c:1319-1328`) but there is no timeout-broadcast. This is a localized inaccuracy in the existing description but not foundational to the card framing; noted here for apply-pass review.
- FLAG: "Auto-expires with a broadcast on timeout" -- source shows the lock expires silently (no timeout broadcast found); only the initial lock and manual early-unlock are broadcast.
---
## lockmap (KTX command, Admin & permissions -- Shape 1 command-side lever for k_lockmap)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:756; handler src/admin.c:849
- **Catalog line**: 1036
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Toggles map lock on/off. While locked: non-admin map votes are refused ("MAP IS LOCKED! You are NOT allowed to change!"); the server does not auto-revert to the default map when it empties.
>
> Broadcasts the new state when no match is running; confirms privately to the admin during a match.
>
> 0 = map unlocked.
> 1 = map locked.
>
> Set by: admin command 'lockmap' (toggle).

### Shape classification

Shape 1 command-side lever for `k_lockmap` (command toggles the cvar 0↔1 via `cvar_fset`)

`ToggleMapLock` reads `cvar("k_lockmap")`, branches on current value, writes back via `cvar_fset`. This is a toggle of the `k_lockmap` cvar -- the Shape 1 pattern. However, unlike the canonical Shape 1 pattern which uses `cvar_toggle_msg`, this handler also has a runtime `is_adm(self)` check (not just CF_BOTH_ADMIN gate) and different broadcast behavior depending on match state. The value enum (0/1) belongs on the `k_lockmap` cvar card, not here. Note: `k_lockmap` is not in this batch; cross-batch threading dependency applies.

### Proposed draft

```
Toggles map lock on and off. When locked, non-admin map votes are blocked and the server does not auto-rotate to the default map when it empties.

Effect:
  - When off: enables map lock (k_lockmap = 1). Broadcasts "<name> locks map" to all (pre-match); confirms privately to the admin during a live match.
  - When on: disables map lock (k_lockmap = 0). Broadcasts "<name> unlocks map" to all (pre-match); confirms privately during a match.

Permission:    admin only
Match-state:   any time (broadcasts vs private confirm differ by match state; see Effect)

Example:
  lockmap     lock the current map (blocks non-admin map votes)
  lockmap     (again) unlock the map

See also: k_lockmap (state cvar this toggles -- paired cvar, in Match flow batch)
```

### Notes

- Handler `ToggleMapLock` at `admin.c:849`. Registration flag is `CF_BOTH_ADMIN` (`commands.c:756`) -- admin only confirmed.
- Handler has a secondary `is_adm(self)` check at `admin.c:853` in addition to CF gate -- no functional difference since CF gate already enforces admin, but matches the dispatcher override table pattern.
- Two behavioral effects of `k_lockmap` verified from source:
  1. `maps.c:434` -- vote function blocked for non-admins with message "MAP IS LOCKED!\nYou are NOT allowed to change!".
  2. `world.c:112` -- `CheckDefMap()` only auto-reverts to `k_defmap` when `k_lockmap` is 0.
- FLAG: The existing description correctly states both behavioral effects. No factual contradiction; this is drafted_with_flag only because the permission wording in the existing description ("Admin command") is correct for CF_BOTH_ADMIN, but the value enum (0/1) is on the command card rather than the cvar card (where Shape 1 discipline puts it). The apply-pass-author should note the value enum belongs on `k_lockmap`'s card.
- Cross-batch threading: `k_lockmap` cvar is not in this batch. The See-also pointer names it and notes the batch.
---
## lockmode (KTX command, Admin & permissions -- Shape 2 cycle command-side lever for k_lockmode)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:748; handler src/commands.c:3344
- **Catalog line**: 1068
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Cycles the server connection-lock state and announces the change to all players. Has no effect while a match is in progress.
>
> 0 = unlocked (anyone may connect).
> 1 = team lock (only players already on an existing team may connect during a game).
> 2 = fully locked (no players may connect during a game).
>
> Set by: admin command 'lockmode' (cycles 0 -> 1 -> 2 -> 0).

### Shape classification

Shape 2 cycle command-side lever for `k_lockmode`

`ChangeLock` reads `cvar("k_lockmode")`, increments and wraps at 3 (0→1→2→0), writes back via `cvar_fset`. This is a Shape 2 cycle command paired with the `k_lockmode` cvar. Value enum (0/1/2) belongs on the `k_lockmode` cvar card. Note: `k_lockmode` is not in this batch; cross-batch dependency.

### Proposed draft

```
Cycles the server's connection-lock level one step forward (0 → 1 → 2 → 0) and broadcasts the new state to all players.

Effect:
  0 (unlocked): broadcasts "Server locking off" -- anyone may connect.
  1 (team lock): broadcasts "Teamlock on -- only players in existing teams can connect during game".
  2 (full lock): broadcasts "Server locked -- players cannot connect during game".

Permission:    any player or admin spectator
Match-state:   pre-match only

Example:
  lockmode    advance to next lock level (cycles 0 → 1 → 2 → 0)

See also: k_lockmode (state cvar this cycles -- value enum and default on cvar card, in Server configuration batch)
```

### Notes

- FLAG: The existing description labels this "Admin command" but the registration flag is `CF_PLAYER | CF_SPC_ADMIN` (`commands.c:748`), which means any player OR admin spectator -- NOT admin-only. This is a material factual error in the existing description. The apply-pass-author must correct the Permission line.
- Handler `ChangeLock` at `commands.c:3344`. `match_in_progress` early-return confirmed at line 3348; pre-match only confirmed.
- Broadcast messages verified: "Server locking off" (`commands.c:3362`), "Teamlock on - only players in existing teams can connect during game" (`commands.c:3370-3372`), "Server locked - players cannot connect during game" (`commands.c:3366`).
- `k_lockmode` is read at player-connect time in `client.c:1343,1352` to enforce the connection policy; the `ChangeLock` command's write takes effect on the next connect attempt.
- Value enum (0/1/2) with broadcast-message descriptions belongs on `k_lockmode` cvar card per Shape 2 discipline; the command card carries only the cycle behavior.
- Cross-batch threading: `k_lockmode` cvar is not in this batch.
---
## mkick (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted
- **Source**: src/commands.c:795 (registration); src/admin.c:174-228 (m_kick handler)
- **Catalog line**: 1099
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin-only command that kicks one or more clients by numeric user ID in a single call. Syntax: 'mkick <id1 [id2 [id3 ...]] [reason]>'. Any trailing non-numeric argument is broadcast as the kick reason. Unknown IDs are reported and skipped. Non-admins are refused.
>
> Set by: admin command 'mkick'.

### Shape classification

Shape-less. The `mkick` command is a standalone admin action. It has no cvar pairing, no vote mechanism, no sibling family. CF_BOTH_ADMIN|CF_PARAMS.

### Proposed draft

```
Kicks one or more clients by numeric user ID in a single command call.

Effect:
  Accepts one or more numeric user IDs as arguments; kicks each in sequence.
  Any trailing non-numeric argument is treated as the kick reason and broadcast
  to all players.
  Unknown IDs are reported to the caller and skipped; the remaining IDs are
  still processed.
  At least one successful kick must occur before the reason is broadcast.

Permission:    admin only
Match-state:   any time

Example:
  # Kick two players by ID with reason:
  mkick 3 7 spamming

  # Kick one player by ID (no reason):
  mkick 5

See also: kick (interactive or single-target kick), klist (prints client IDs needed for mkick targeting)
```

### Notes

- CF_BOTH_ADMIN|CF_PARAMS confirmed at `commands.c:795`.
- Source at `admin.c:174`: handler uses `is_adm(self)` for the admin check (elected admins can use mkick, not just real admins).
- The reason broadcast is conditional: source at `admin.c:220-223` shows `if (!k) { return; }` before the reason broadcast, meaning no successful kicks = no reason broadcast. This subtle behavior is surfaced in Effect.
- Unlike `kick`, `mkick` does not accept name substrings -- only numeric IDs. Source: `only_digits(arg_x)` check at `admin.c:192`.
---
## qlag (KTX command, Admin & permissions -- Shape 11b)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:784 (handler: ToggleQLag at commands.c:3686)
- **Catalog line**: 1153
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Toggles the QiZmo lag-settings flag on or off. When enabled, KTX signals the QiZmo proxy to disable its lag-related adjustments; the restriction is applied by QiZmo on the client side. Announces "QiZmo lag settings in effect" or "not in effect" to all players on each toggle. Has no effect while a match is in progress.
>
> Set by: admin command 'qlag'.

### Shape classification

Shape 11b: serverinfo-key-backed bitmask toggle. Handler reads `iKey(world, "fpd")` into a local int, XORs bit 8 (literal `fpd ^= 8`), writes back via `localcmd("serverinfo fpd %d\n", fpd)`. Pre-match gate via `match_in_progress` early-return. Three siblings share the 'fpd' serverinfo key: `qlag` (bit 8), `qenemy` (bit 32, Spectator-chat category), `qpoint` (bit 128). Family marketed via Shape 10 `qizmo` help-printer.

### Proposed draft

```
Toggles the "lag settings" bit (bit 8) in the server's 'fpd' serverinfo key, signalling the QiZmo proxy to enable or disable lag-adjustment features for clients.

Effect:
  XOR-flips bit 8 of the 'fpd' serverinfo key. When the bit is set, QiZmo proxies suppress their lag-related adjustments; when clear, lag adjustments are active (default).
  Broadcasts "QiZmo lag settings in effect" or "not in effect" to all players on each toggle.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example: qlag

See also: qpoint (sibling -- toggles bit 128 of 'fpd'), qenemy (sibling -- toggles bit 32 of 'fpd'; Spectator-chat category), qizmo (Shape 10 help-printer for this family)
```

### Notes

- FLAG: Existing description labels this "admin command 'qlag'" implying admin-only. CF flag at commands.c:784 is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, NOT admin-only. Recast reflects source-truth.
- Cross-batch: paired sibling `qenemy` (bit 32) lives in Spectator-chat category -- cross-batch threading dependency. Apply-pass-author should verify symmetric See-also when that batch ships.
---
## qpoint (KTX command, Admin & permissions -- Shape 11b)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:786 (handler: ToggleQPoint at commands.c:3719)
- **Catalog line**: 1180
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command that toggles the QiZmo proxy pointing restriction on or off server-wide. When enabled, clients are prevented from using the pointing feature. The new state is announced to all players. Has no effect while a match is in progress.
>
> Set by: admin command 'qpoint' in-game (not during a live match).

### Shape classification

Shape 11b: serverinfo-key-backed bitmask toggle. Same family and container as `qlag`. Handler reads `iKey(world, "fpd")`, XORs bit 128 (literal `fpd ^= 128`), writes back via `localcmd("serverinfo fpd %d\n", fpd)`. Broadcast uses `Enabled(fpd & 128)` helper.

### Proposed draft

```
Toggles the "point function" bit (bit 128) in the server's 'fpd' serverinfo key, enabling or disabling the QiZmo proxy's waypoint-marker feature for clients.

Effect:
  XOR-flips bit 128 of the 'fpd' serverinfo key. When the bit is set, QiZmo proxies enable the pointing/waypoint feature; when clear, pointing is disabled.
  Broadcasts "QiZmo pointing" enabled or disabled to all players.

Permission:    any player or admin spectator
Match-state:   pre-match only

Example: qpoint

See also: qlag (sibling -- toggles bit 8 of 'fpd'), qenemy (sibling -- toggles bit 32 of 'fpd'; Spectator-chat category), qizmo (Shape 10 help-printer for this family)
```

### Notes

- FLAG: Existing description labels this "Admin command" implying admin-only. CF flag at commands.c:786 is `CF_PLAYER | CF_SPC_ADMIN` -- any player or admin spectator, NOT admin-only. Recast reflects source-truth.
- Cross-batch: sibling `qenemy` (bit 32) lives in Spectator-chat category -- cross-batch threading dependency. Apply-pass-author should verify symmetric See-also when that batch ships.
---
## socd (KTX command, Admin & permissions -- Shape 2 cycle command-side lever for k_socd)

- **Status**: drafted
- **Source**: src/commands.c:1040; handler src/commands.c:9398
- **Catalog line**: 1207
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Cycles the k_socd enforcement level one step per invocation (0 -> 1 -> 2 -> 3 -> 0) and announces the new mode. Cannot be used while a match is in progress.
>
> 0 = allow (SOCD inputs are not acted on).
> 1 = stats only (post-game SOCD detection count is reported).
> 2 = warn (broadcasts a public warning after repeated detections, prewar only).
> 3 = kick (force-disconnects the player after repeated detections).
>
> Set by: admin command 'socd' in-game (not allowed during a live match).

### Shape classification

Shape 2 cycle command-side lever for `k_socd`

`socd` reads `cvar("k_socd")`, increments and wraps at 4 (0→1→2→3→0), writes back via `cvar_set`. This is a Shape 2 cycle command paired with the `k_socd` cvar. The value enum (0-3 with meanings) belongs on the `k_socd` cvar card. The SOCD detection mechanism itself (strafe-change pattern analysis in `PlayerPreThink`) is sophisticated, but the `socd` command's role is the simple cycle-lever -- consistent with Shape 2.

### Proposed draft

```
Cycles the SOCD (Simultaneous Opposite Cardinal Directions) enforcement level one step per invocation (0 → 1 → 2 → 3 → 0) and broadcasts the new mode.

Effect:
  0 (allow):      no enforcement -- SOCD inputs are permitted and unreported.
  1 (stats):      SOCD detection counts appear in the post-game movement report for each player.
  2 (warn):       broadcasts a public warning when a player accumulates repeated SOCD detections (prewar only -- detection during live match does not warn).
  3 (kick):       force-disconnects a player after repeated SOCD detections.

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  socd      advance enforcement from current level to next (wraps 3 → 0)

See also: k_socd (state cvar this cycles -- default and value enum on cvar card)
```

### Notes

- Handler `socd` at `commands.c:9398`. Reads `cvar("k_socd")`, increments, wraps using `SOCD_ALLOW` (0) / `SOCD_KICK` (3) bounds check, writes back via `cvar_set`. `match_in_progress` early-return at `commands.c:9402` confirmed; pre-match only.
- Constants verified: `SOCD_ALLOW=0`, `SOCD_STATS=1`, `SOCD_WARN=2`, `SOCD_KICK=3` from `include/g_consts.h:346-349`.
- SOCD detection mechanism (for context -- not in L1): `PlayerPreThink` (`client.c:3748-3804`) tracks rapid direction reversals (fStrafeChangeCount >= 25 with >= 75% frame-perfect reversals). Detection fires as a counter increment; levels 2/3 check `socdDetectionCount >= 3` threshold.
- Default: `RegisterCvarEx("k_socd", "1")` at `world.c:1017` -- default is 1 (SOCD_STATS), not 0. Value enum and default belong on `k_socd` cvar card.
- CF registration is `CF_PLAYER` (`commands.c:1040`) -- any player in a player slot; spectators are excluded. Permission corrected from the existing description (which does not specify this) to "any player (spectators excluded)".
- FLAG: `CF_PLAYER` alone (not `CF_PLAYER | CF_SPC_ADMIN`) means spectators cannot invoke `socd`. The existing description says "admin command" -- source shows any player in a player slot can cycle socd, not admin-only. This is a material factual error in the existing description.
- Warn level (2): source at `client.c:3785` confirms warn only fires `!match_in_progress` -- detection during a live match is silently counted but no public broadcast. The existing description's "prewar only" annotation is correct.
---
## speed (KTX command, Admin & permissions -- shape-less)

- **Status**: drafted_with_flag
- **Source**: src/commands.c:757; handler src/commands.c:3215
- **Catalog line**: 1239
- **Anchor**: v1.36-1633-g67253dc

### Current description

> Admin command. Toggles sv_maxspeed between the standard 320 and the server's high-speed value (k_highspeed, clamped 0-9999). If sv_maxspeed is not currently 320, it is reset to 320; otherwise it is raised to k_highspeed. The change applies to all connected players immediately and is announced. Has no effect while a match is in progress.
>
> Set by: admin command 'speed'.

### Shape classification

shape-less

`ToggleSpeed` does NOT call `cvar_toggle_msg` and does NOT pair with a dedicated boolean cvar in the Shape 1 sense. It reads `k_maxspeed` (an internal tracking float) and toggles `sv_maxspeed` between 320 and `cvar("k_highspeed")`. The command has a dependency on `k_highspeed` (the high-speed threshold cvar) but does not toggle that cvar -- it reads it as a configuration parameter. No vote relationship, no sibling family. Listed in the `options` help-printer (Shape 10 membership), but `speed` itself is shape-less.

### Proposed draft

```
Toggles the server's maximum player speed between the standard value (320) and the high-speed value configured in 'k_highspeed'. The change applies to all connected players immediately.

Effect:
  - If current maxspeed is 320: raises it to k_highspeed (clamped to 0-9999). Broadcasts "Maxspeed set to <N>".
  - If current maxspeed is not 320: resets it to 320. Broadcasts "Maxspeed set to 320".
  - Applies to all currently connected players immediately (per-player maxspeed is updated).

Permission:    any player (spectators excluded)
Match-state:   pre-match only

Example:
  k_highspeed 600   (in server.cfg) set the high-speed target
  speed             toggle maxspeed to 600
  speed             toggle maxspeed back to 320

See also: k_highspeed (configures the high-speed target value), options (prints full server-setting command roster including speed)
```

### Notes

- FLAG: The existing description labels this "Admin command" but the registration flag is `CF_PLAYER` (`commands.c:757`) -- not `CF_BOTH_ADMIN` or `CF_PLR_ADMIN`. `CF_PLAYER` means any player (spectators excluded). This is a material factual error in the existing description. The Permission line must be corrected.
- Handler `ToggleSpeed` at `commands.c:3215`. Reads `k_maxspeed` (internal float tracking current state), not `sv_maxspeed` directly -- but writes back via `cvar_fset("sv_maxspeed", k_maxspeed)` (`commands.c:3234`). Also iterates all connected players and sets `p->maxspeed = k_maxspeed` (`commands.c:3236-3239`) for immediate per-player effect.
- `k_highspeed` is registered with no default (`RegisterCvar("k_highspeed")` at `world.c:870`) -- defaults to 0. A server with no `k_highspeed` set will raise maxspeed to 0 (clamped by `bound(0, cvar("k_highspeed"), 9999)`), effectively disabling movement. Servers should set `k_highspeed` before using `speed`.
- The CF_PLAYER flag means spectators cannot invoke `speed`; any player in a player slot can.

---

## Cross-card consistency notes

Checks performed during the cross-card pass; findings the apply-pass-author
should resolve before applying drafts to L1.

### F1: Permission-mislabel pattern persists across 5 admin-category commands

**Verdict**: ACTIONABLE

**Cards involved**: `lockmode`, `speed`, `socd`, `qlag`, `qpoint` (all `drafted_with_flag`)

**Observation**: Existing descriptions for these five commands all begin with
"Admin command" prose. Source CF flags show otherwise:

| Command | Existing prose | Source CF flag | Correct wording |
|---|---|---|---|
| `lockmode` | "Admin command" | `CF_PLAYER \| CF_SPC_ADMIN` | any player or admin spectator |
| `speed` | "Admin command" | `CF_PLAYER` | any player (spectators excluded) |
| `socd` | "admin command" | `CF_PLAYER` | any player (spectators excluded) |
| `qlag` | implies admin-only | `CF_PLAYER \| CF_SPC_ADMIN` | any player or admin spectator |
| `qpoint` | "Admin command" | `CF_PLAYER \| CF_SPC_ADMIN` | any player or admin spectator |

This batch surfaces a NEW variant of the F1 audit pattern (prior batches:
Mode-selection, Frogbot, Scoring-stats): the `CF_PLAYER` alone case (no
spectator-admin path) where the command is any-player-in-player-slot.
`shape-catalog.md`'s 2026-05-26 Permission discipline table already covers
this row; the existing descriptions predate the audit.

**Source evidence**: `src/commands.c:748` (lockmode), `:757` (speed), `:1040`
(socd), `:784` (qlag), `:786` (qpoint); CF flag definitions at
`include/g_local.h:647-658`.

**Recommendation**: Apply v2 Permission lines as drafted. The "Admin command"
prose prefix has now been caught on 5 cards in 4 different batches; consider
this a known systematic mislabel class.

---

### F2: Cross-batch threading dependencies for paired entities

**Verdict**: ACTIONABLE (apply-pass coordination)

**Cards involved**: `k_allowklist`, `k_allowtracklist`, `lockmap`, `lockmode`,
`socd`, `fp`, `fp_spec`, `hdptoggle`, `qlag`, `qpoint`

**Observation**: 10 cards in this batch reference paired cvars or sibling
commands that live in other (not-yet-drafted) batches. Each card names its
paired entity in See-also; apply-pass-author should verify bidirectional
See-also when the paired batch ships.

| This batch | Paired entity | Likely paired batch |
|---|---|---|
| `k_allowklist` | `toggleklist` cmd | (cmd not in catalog scope yet -- verify) |
| `k_allowtracklist` | `toggletracklist` cmd | (same) |
| `lockmap` | `k_lockmap` cvar | Match flow |
| `lockmode` | `k_lockmode` cvar | Match flow / Server config |
| `socd` | `k_socd` cvar | Gameplay rules / Server config |
| `fp` | `k_fp` cvar | Server config |
| `fp_spec` | `k_fp_spec` cvar | Server config |
| `hdptoggle` | `k_lock_hdp` cvar | Gameplay rules |
| `qlag` / `qpoint` | `qenemy` sibling | Spectator chat (open follow-up from prior batch) |

`toggleklist` (at `commands.c:834`, `CF_BOTH \| CF_MATCHLESS`) and
`toggletracklist` (at `:843`, same flags) source-verified -- both are
any-player-or-spectator pre-match toggles. Their L1-entity status should be
confirmed against the live catalog; if they exist, they're cross-batch dependencies.

**Source evidence**: cited per-card in the proposed drafts' Notes sections.

**Recommendation**: Track as cross-batch coordination items. When the paired
batch ships, the dispatcher's cross-card pass (or apply-pass-author) verifies
symmetric See-also threading. No action needed at this batch's apply pass --
the See-also pointer text is already correct.

---

### F3: V1-shape artifacts on command cards (defaults / value enums)

**Verdict**: ACTIONABLE (cleanup during apply pass)

**Cards involved**: `hdptoggle`, `lockmap`, `lockmode`, `socd`

**Observation**: Four command cards carry data that the v2 shape places on
the paired cvar's card instead:

- `hdptoggle` includes "Default: unlocked (follows k_lock_hdp default of 0)"
  -- commands have no default in v2; the default belongs on `k_lock_hdp`'s
  cvar card.
- `lockmap` carries a 0/1 value enum -- Shape 1 discipline places the enum
  on `k_lockmap`'s cvar card.
- `lockmode` carries a 0/1/2 value enum -- Shape 2 discipline places it on
  `k_lockmode`'s cvar card.
- `socd` carries a 0/1/2/3 value enum -- same as `lockmode`, belongs on
  `k_socd`'s cvar card.

The v2 drafts for these four cards still document the cycle/toggle behavior
prose-wise (so users querying the command card still see what each value
does), but the formal value-enum block belongs on the cvar.

**Recommendation**: When the paired-cvar batch ships, apply-pass-author
moves the formal enum block + Default line to the cvar card; the command
card retains only the cycle behavior + a See-also pointer. This is a clean
Shape 1/2 discipline application; the work is mechanical.

---

### F4: Privategame cvar default-value errors -- family sweep likely needed

**Verdict**: ACTIONABLE

**Cards involved**: `k_privategame_allow_specs`, `k_privategame_force_reconnect`

**Observation**: Both cvars have existing descriptions claiming `Default: 0`
but source uses `RegisterCvarEx(..., "1")`. Verified at `world.c:1090` and
`:1091` respectively.

This is a systematic default-value error class on the privategame family.
Other privategame cvars not in this batch's scope (`k_privategame`,
`k_privategame_voteable`, etc.) may carry similar errors.

**Source evidence**: `src/world.c:1090-1091`; both `RegisterCvarEx` calls
specify `"1"` as the default string.

**Recommendation**: Apply v2 default values as drafted. Open follow-up:
when future batches surface other privategame-family cvars (Match flow or
Mode selection batches likely), sweep their existing descriptions for
default-value errors before drafting.

---

### F5: `k_admins` scope overstatement -- gate at designation not invocation

**Verdict**: ACTIONABLE

**Cards involved**: `k_admins`

**Observation**: Existing description says "all admin-related commands print
'NO admins on this server!' and bail." Source shows only TWO command
handlers check `cvar("k_admins")` directly:

- `admin` (the password-entry command) at `src/admin.c:347`
- `VoteAdmin` (backing `/elect`) at `src/admin.c:489`

Other admin-gated commands (`kick`, `force_spec`, `mkick`, etc.) check
`is_adm(self)` on the caller, NOT `k_admins` directly. Once an admin is
designated (via rcon or VIP_ADMIN), they retain admin status and can issue
admin commands even if `k_admins` were changed mid-session -- the gate is
at DESIGNATION time, not at every admin-command invocation.

**Source evidence**: tree-wide grep for `cvar("k_admins")` returns 2 matches
in admin.c (the `admin` and `VoteAdmin` paths); no other handler reads this
cvar.

**Recommendation**: Apply v2 framing as drafted. The corrected scope
explains the admin-system architecture more accurately for server admins
reading the cvar's role.

---

### F6: `lock` auto-expire broadcast claim contradicts source

**Verdict**: ACTIONABLE

**Cards involved**: `lock`

**Observation**: Existing description states "Auto-expires with a broadcast
on timeout." Source check (`admin.c:912-933`) shows the 15-second timer is
checked passively at player connect time (`client.c:1319-1328`); there is
NO timeout-broadcast site. Only the initial lock and the manual early-unlock
are broadcast.

**Source evidence**: `src/admin.c:912-933` (sv_lock handler); `src/client.c:1319-1328`
(connect-time check, no broadcast).

**Recommendation**: Apply v2 Effect text as drafted -- removes the false
auto-expire-broadcast claim and accurately documents silent expiry.

---

### F7: y/n parked (operator-accepted); apply-pass-author may hand-author

**Verdict**: ACTIONABLE (follow-up)

**Cards involved**: `y`, `n` (parked); cross-link to `kick`

**Observation**: `y` and `n` are admin-only kick-walkthrough session-response
commands (handlers `YesKick`/`DontKick` at `admin.c:264, 286`; CF_BOTH_ADMIN).
The pattern -- parent command (`kick` no-arg) initiates a per-admin session
state (`k_kicking` field on the admin's edict); response commands gate on
that state and advance -- is not in the shape catalog. Park trigger 1 fired;
operator accepted the park.

For the apply pass: apply-pass-author may hand-author v2 cards using Layer A
only (shape-less Layer B). The existing descriptions are factually correct;
the parks are purely on shape classification grounds.

`kick`'s See-also in this batch's draft does NOT include y/n (Chunk B Notes:
"not added to See-also as they are session-local commands rather than peer
entities"). The cross-card pass disagrees: y/n ARE peer entities within the
walkthrough family. Apply-pass-author should consider adding y/n to `kick`'s
See-also -- they are the response counterparts to the no-arg invocation.

**Source evidence**: `src/commands.c:796-797` (registrations); `src/admin.c:264, 286`
(handlers); kick handler initiates session at `admin.c:119-172`.

**Recommendation**: (a) Hand-author v2 cards for y/n at apply-pass time;
(b) revise `kick`'s See-also to include y/n bidirectional. If a sibling
wizard-walkthrough surfaces in MVDSV / future KTX additions, the operator
crystallizes a new Shape N at that point.

---

### F8: Dispatcher-brief misidentification caught by sub-agent (process working)

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `y`, `n` (parked)

**Observation**: The dispatcher brief classified `y`/`n` as Shape 7a vote-response
commands. Chunk D's sub-agent verified against source and corrected: `y`/`n`
are kick-walkthrough commands (handlers `YesKick`/`DontKick`, `CF_BOTH_ADMIN`);
the actual vote-response commands are `yes` and `no` at `commands.c:801-802`
(handlers `VoteYes`/`VoteNo`, `CF_PLAYER | CF_MATCHLESS`).

This is the sub-agent's source-verification discipline working as intended.
The sub-agent's reporting includes a clear correction trail: the dispatcher
brief's claim is named, the source evidence is cited, the corrected
classification is documented. No further action; documented here to
acknowledge the process catch.

**Recommendation**: No apply-pass action. Open follow-up: when drafting
`yes`/`no` (the actual vote responses, likely in Voting category extension
or similar), reference this finding to avoid recurrence.

---

### F9: `commands` correctly shape-less per catalog disambiguation

**Verdict**: CONFIRMED_CLEAN

**Cards involved**: `commands`

**Observation**: The shape catalog's Shape 10 entry explicitly names
`commands` as a non-Shape-10 introspective lister: "iterates the command
table dynamically with class/permission/match-state filters + optional
substring search. Output is per-caller-dynamic. 1-of-1 in KTX; shape-less
for now -- crystallize if a sibling surfaces." Chunk B sub-agent followed
this disambiguation correctly and classified the entity shape-less.

This confirms the catalog's disambiguation guidance is load-bearing -- the
"Distinguish from these neighbors" subsections in `shape-catalog.md` Shape
10 (and the Shape 11 distinguishers added for the qizmo family) directly
prevent over-classification.

**Recommendation**: No action. Documents that the catalog's per-shape
disambiguation sections are doing their job.

---
