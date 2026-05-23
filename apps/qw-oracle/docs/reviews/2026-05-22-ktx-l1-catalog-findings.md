# KTX L1 catalog findings -- 2026-05-22 walk

Sibling to `2026-05-22-ktx-l1-catalog.html`. Per-card findings from the operator's visual review pass on the rendered KTX L1 catalog.

Per-finding sections capture: current description, the gap operator spotted, the proposed L1 description draft, and apply status. Drafts are not applied to L1 (`entities.description`) until operator signs off the batch -- one apply pass per review session (or batched across review sessions).

## Resume in a fresh session

This file is the load-bearing session record. To continue the discovery walk from a cold session:

1. **Auto-loaded memory** at session start gives you the templates -- four reference files (updated end-of-session-2):
   - `feedback-mod-l1-documentation-architecture` -- the two-layer model (Layer A universal shape + Layer B per-codebase shape catalog); L1-as-graph-node; L1 vs L3 division; replicable across mod codebases.
   - `feedback-l1-description-template` -- v2 universal shape (Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also); action-level not impl-level; Prereqs must be user-actionable; subsequent-invocation toggle; canonical-card pattern.
   - `reference-ktx-entity-categories` -- three-bucket model (`k_*` cvars / userinfo keys / commands); `k_sdir` false-positive trap.
   - `reference-ktx-cvar-command-pairing` -- 12+ shape model (1 / 1c / 1d / 2 / 3 / 4 / 4b / 5 / 6 / 7a / 7b / 8) + command-per-value fan-out modifier + shape-composition (facets-not-buckets) + tooling-mode prerequisite type.
2. **Catalog source-of-truth**: `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` (sibling file). Search cards via `grep 'data-name="X"'`.
3. **KTX source tree** for verification: `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`. For mvdsv-redirected commands (the ban family etc.), also `/home/paradoks/projects/quakeworld/research/repos/mvdsv/src/`.
4. **Working method per card**: operator picks a card -> verify against source -> draft per templates -> discuss + iterate -> lock into this file with Source / Current / Gap / Proposed / Notes sections.
5. **Hunt target this work-stream**: new pattern variations that surface new templates or sub-shapes (Shape 1c with mode-precondition + Shape 4b serverinfo-gated were discovered late in session 1; Shapes 1d / 6 / 7a / 7b / 8 + the canonical-card discipline + tooling-mode prereq + shape-composition principle were all discovered in session 2). Bias toward unusual entries to keep surfacing variations.
6. **Apply path stays parked**: drafts are NOT applied to L1 (`entities.description`) until operator runs the apply pass. Don't touch the DB.
7. **Session-3 intent (operator-stated end-of-session-2)**: ONE more spot-check pass from a fresh session before the `ktx-l1-rewrite` skill build. Walk 3-5 cards across unfamiliar territory (uncovered categories: Demo & spectator / Internal state / Race / Spectator chat / Server config & network) to confirm the framework holds against unfamiliar shapes. If it does, the skill build is the next major work item. If new shapes surface, lock them first.

State at end of session 2 (2026-05-23):

- **45 L1 card drafts** locked: 32 from session 1 + 13 from session 2 (`mmode`, `tot`, `totmode`, `k_tot_mode`, `elect`, `k_ctf_hookstyle`, `k_vp_hookstyle`, `hook_smooth`, `hook_fast`, `hook_classic`, `hook_crhook`, `breakondeath`, `fill`, `addmarker:editor`).
- **Open findings**: 4 (`handicap` value range; game-mode bidirectional cross-link; `game_mode` mechanics extraction sparseness; `multi` editor-framing + `=` syntax retest).
- **Follow-up arcs surfaced**: 7 (`admin-and-user-management` L3 note; catalog-wide template-application arc; `game_mode` mechanics extraction; RA-style "modifier on a mode" concept note candidate; `qw-player-messaging` L3 note; `qw-game-modes` L3 note; `ktx-l1-rewrite` skill build).
- **Templates locked (session 2, 2026-05-23)**:
  - **Universal L1 card shape v2** (`[[feedback-l1-description-template]]` Headliner / Effect / Prerequisites / Permission / Match-state / Default / Example / See-also; action-level not impl-level).
  - **Two-layer architecture** (`[[feedback-mod-l1-documentation-architecture]]` -- Layer A universal shape + Layer B per-codebase shape catalog; replicable across MVDSV / QWFWD / QTV).
  - **KTX shape catalog extended to 12+ shapes** (`[[reference-ktx-cvar-command-pairing]]`): added Shape 1c (mode-precondition), Shape 1d (preset+cvar+toggle triad), Shape 6 (stateful + one-shot command pair), Shape 7a (election with yes/no), Shape 7b (continuous-toggle vote), Shape 8 (subcommand-of-parent-dispatcher), command-per-value fan-out modifier.
  - **Tooling-mode prerequisite type** -- distinct from game-mode and match-state. A runtime tooling state (frogbot editor mode) that controls which subcommands are *visible at all* (hide-when-inactive, not refuse-with-message).
  - **Shape composition**: shapes are facets, not exclusive buckets -- an entity can have multiple shape facets at once (Shape 7 + Shape 4 × 2 on `elect`; Shape 7b + Shape 1c + command-per-value fan-out on hook family).
  - **Prerequisites must be user-actionable or surprise-bearing** (action-plan-changing); self-state refusals implied by user intent are noise. Audit trail keeps the exhaustive list.
  - **Subsequent-invocation toggle**: alternate-behavior-on-re-invoke convention (e.g. `elect` started while your own election is pending aborts it).
  - **Canonical-card pattern**: for N near-identical sibling entities (ksound1..6 or hook_smooth/fast/classic/crhook), ONE canonical card carries the full description; the rest are short reference cards pointing at it. Catalog HTML keeps separate cards for direct `lookup_entity` matches; content is centralized for maintenance.
- **Skill build deferred**: `ktx-l1-rewrite` skill (against the locked v2 spec) is the next major work item, to be built as its own arc once templates have settled.
- No pending tasks.

Per-card drafts below tag their Shape where it fits (e.g. "Shape 1 paired toggle", "Shape 1d preset half"). Session-1 + early-session-2 cards (~32) use the v1 description shape (merged Set-by, no explicit Effect/Prerequisites slots) -- content is correct; shape gets recast during the catalog-wide template-application arc, not retroactively.

## Status legend

- `drafted` -- proposed text written below, not yet applied to L1
- `pending-apply` -- operator approved; queued for batch apply
- `applied` -- DB updated, catalog re-rendered (or pending re-render)

---

## tpmsg (KTX command, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:1052` (registration); `src/teamplay.c:1645-1718` (`messages[]` table + dispatcher)
- **Catalog line**: 13469

### Current description

> Sends a predefined teamplay status message by name. Called with no argument (or an unrecognized name), prints the full list of available message names and their descriptions.
>
> Set by: any player via 'tpmsg <message-name>'.

### Gap

- Description gestures at "the full list" but doesn't enumerate -- AI/UI consumers have no way to see what message names exist without running the command in-game.
- No usage example for the typical bind-a-key pattern.
- Operator's intuition (and source code confirms): this is a noob-friendly alternative to handwritten teamsay scripts. The 21 names are NOT registered as standalone commands (except `report`), so `tpmsg <name>` is the only invocation path.

### Proposed draft

```
Sends one of 21 predefined teamplay status messages by name. Lets a single
key invoke a status message without writing custom teamsay scripts. Called
with no argument (or an unrecognized name), prints the full usage list
in-game.

Available messages:
  yesok        yes/ok
  nocancel     no/cancel
  soon         item soon
  waiting      waiting
  slipped      enemy slipped
  replace      replace me
  trick        trick
  coming       coming
  getquad      get quad
  getpent      get pent
  quaddead     quad dead
  enemypwr     enemy powerup
  youtake      you take
  "kill me"    kill me  (quotes required -- space in name)
  lost         area lost
  secure       area secure
  help         area needs help
  need         report needs
  report       report status
  took         item taken
  point        player/item point

Set by: any player via 'tpmsg <message-name>'.
Example: bind x "tpmsg help"   (binds X to call for help)
         tpmsg lost            (sends "area lost" once)
```

### Notes

- 21 entries in source order (matches what the in-game usage dump prints).
- `"kill me"` is the only entry with a space in `cmdname` -- requires quoting to invoke. Possibly a KTX bug; preserving as-is in the description.
- Only `report` is also registered as a standalone command (separate card in the same category); the other 20 are tpmsg-only.

---

## victim (KTX command, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:781` (registration `CF_PLAYER|CF_MATCHLESS`); `src/commands.c:1797-1800` (`SendVictimMsg`); `src/commands.c:1807-1840` (`SendMessage` -- shared wrapper)
- **Catalog line**: 13496

### Current description

> Sends a say message to the player the caller most recently fragged, addressed by name. The message is optionally wrapped with the caller's "premsg" / "postmsg" userinfo strings as prefix and suffix. Does nothing if no matching connected client is found. Usable outside a match.
>
> Set by: any player (no arguments; see also: 'killer' command for the inverse).

### Gap

- Description mentions `premsg`/`postmsg` but doesn't show how to USE them (operator's report: tried embedding `$victim` as a macro -- that's not the mechanism).
- Minor inaccuracy: "Does nothing if no matching connected client is found" -- actually prints `"No name to display"` (source line 1839).

### Proposed draft

```
Sends a public 'say' message naming the player you most recently fragged.
The name is optionally wrapped with your 'premsg' / 'postmsg' userinfo
strings. Prints "No name to display" if the target has disconnected or
no frag is recorded yet. Usable outside a match.

Set by: any player (no arguments). See also: 'killer' (the inverse).
Example: setinfo premsg "I killed"
         setinfo postmsg "again - so easy!"
         bind v victim
         (pressing V prints in chat:
            <yournick>: I killed <opponent_name> again - so easy!)
```

---

## killer (KTX command, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:780` (registration `CF_PLAYER|CF_MATCHLESS`); `src/commands.c:1792-1795` (`SendKillerMsg`); `src/commands.c:1807-1840` (`SendMessage` -- shared wrapper)
- **Catalog line**: 13023

### Current description

> Opens a chat line pre-filled with the name of the player who last killed you, so you can send them a message. If your 'premsg' or 'postmsg' userinfo keys are set, they are inserted before and after the name. Prints "No name to display" if no killer is recorded.
>
> Set by: any player via 'killer' command (usable outside a match).

### Gap

- **Factual error**: "Opens a chat line pre-filled" -- WRONG. The handler stuffs `say <wrapped_name>` via `stuffcmd_flags` and the client executes it immediately. There is no prompt, no edit step.
- No usage example for the typical bind-a-key pattern.

### Proposed draft

```
Sends a public 'say' message naming the player who most recently killed
you. The name is optionally wrapped with your 'premsg' / 'postmsg'
userinfo strings. Prints "No name to display" if the killer has
disconnected or no death is recorded yet. Usable outside a match.

Set by: any player (no arguments). See also: 'victim' (the inverse).
Example: setinfo premsg "nice shot"
         setinfo postmsg ", well played!"
         bind k killer
         (pressing K prints in chat:
            <yournick>: nice shot <killer_name>, well played!)
```

---

## newcomer (KTX command, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:782` (registration); `src/commands.c:1802-1805` (`SendNewcomerMsg`); `src/commands.c:1807-1840` (`SendMessage` -- shared wrapper); `src/globals.c:49` + `src/client.c:1685` (`newcomer` global)
- **Catalog line**: ~13280 (per earlier grep)

### Current description

> Sends a chat message to the most recently joined player. The message text is taken from the caller's 'premsg'/'postmsg' userinfo wrapping.

(per audit trail the description was AFFIRMED verbatim from `CD_NEWCOMER = "message to last player joined"`)

### Gap

- "The message text is taken from..." is misleading -- the message text IS the player name; premsg/postmsg only WRAP it, not replace it.
- No usage example.

### Proposed draft

```
Sends a public 'say' message naming the player who most recently joined
the server. The name is optionally wrapped with your 'premsg' / 'postmsg'
userinfo strings. Usable outside a match.

Set by: any player (no arguments).
Example: setinfo premsg "welcome"
         setinfo postmsg ", have fun!"
         newcomer
         (running 'newcomer' prints in chat:
            <yournick>: welcome <new_player_name>, have fun!)
```

---

## ksound1 (KTX command, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:770` (registration `CF_PLAYER`); `src/commands.c:3377` (`TeamSay(N)` handler shared with ksound2-6); `include/g_consts.h:245` (`KF_KTSOUNDS = 1`)
- **Catalog**: Player communication section

### Current description

> Plays team audio cue 1 (ktsound1.wav) for teammates who have kt sounds enabled. Each recipient's sound is played from their configured sound directory (k_sdir). Only active in team or CTF games. No effect on players with kt sounds disabled.

### Gap

- No usage example -- new players cannot tell HOW to invoke or enable it.
- Mechanism not explicit: file loads from the RECIPIENT'S `qw/sound/`, not the sender's, so each teammate hears their own file by that name.
- Opt-in mechanism (`setinfo kf 1`) not named in actionable form -- "kt sounds enabled" is descriptive but not invocable.

### Proposed draft

```
Triggers 'qw/sound/ktsound1.wav' to play on each opted-in teammate's
machine.

Set by: any player.
Example: bind 1 "ksound1"             (Press 1 to signal teammates.)
         setinfo kf 1                 (Recipients run once to receive.)
         setinfo k_sdir clansounds    (Optional: load from a subdir --
                                       qw/sound/clansounds/ktsound1.wav)

See also: ksound2..ksound6 (same mechanism, different ktsound<N>.wav).
```

### Notes (for the apply-pass author)

- "Team/CTF games only" + "not for sender" both implied by the word "teammate" -- redundant, cut.
- Historical "voice-chat replacement" context dropped -- speculation, not load-bearing for usage.
- Deprecation flag `// useless command now` dropped -- status metadata, fails MVI test (does not explain what it does or how to use it).
- `setinfo kf 1` lives only in Example, not in prose -- duplication discipline for whole-record consumers (Oracle MCP, catalog HTML, Slipgate UI all return the full record together).

---

## ksound2..ksound6 (KTX commands, Player communication)

- **Status**: drafted
- **Source**: `src/commands.c:771-775` (registrations); same `TeamSay(N)` handler as ksound1
- **Catalog**: Player communication section

### Current description (example: ksound2)

> Plays team audio cue 2 (ktsound2.wav) for every teammate who has kt sounds enabled. Only available in team or CTF games.

(ksound3-6 nearly identical, swapping the cue number.)

### Gap

- Same as ksound1 -- no example, opt-in not named -- but these are SECONDARY cards. Once ksound1 carries the canonical detail, these defer to it.

### Proposed draft (apply to each, substitute `<N>` = 2..6)

```
Triggers 'qw/sound/ktsound<N>.wav' to play on each opted-in teammate's
machine. See ksound1 for the mechanism and example.
```

### Notes

- The "See ksound1" pointer pattern avoids 5x duplication of the same example block. Each card stays self-sufficient for the basic "what does this do?" question; details defer to the canonical entry.

---

## mmode (KTX command, Player communication -- new shape: stateful recipient-setter)

- **Status**: drafted
- **Source**: `src/commands.c:938` (registration `CF_BOTH | CF_MATCHLESS | CF_PARAMS`); `src/commands.c:550` (`CD_MMODE "switch message mode"`); `src/g_cmd.c:1092-1252` (`mmode` handler -- arg parsing + per-mode dispatch); `src/g_cmd.c:1043-1046` (`mmode_usage`); `src/g_cmd.c:287-405` (`ClientSay` -- the say-interception that consumes `*mm` userinfo state); `src/g_userinfo.c:44` (`*mm` userinfo binding)
- **Catalog line**: 13213

### Current description

> Sets your message mode -- the implicit recipient for subsequent messaging and say macros. Arguments: `off` (no target), `player <id|name>`, `team <name>`, `multi` (open multi-message editor), `name`, `rcon` (requires rcon password or VIP rights), `.` (last player sent to), `,` (last player received from), `last` (restore previous mode). With no argument, operates on your current stored mode. An unrecognized argument prints the usage line.
>
> Set by: any player via 'mmode' command (per-player state).

### Gap

- Flat-pack: 9 mode arguments wedged into one paragraph, hard to scan. Operator reported having to focus "200% brain power" to decode behavior.
- "multi (open multi-message editor)" is **factually wrong** -- there is no editor. `mmode multi` activates routing to the previously-built multi-set (see `multi` card); if the set is empty, it just prints "0 players found" and does nothing.
- Missing the load-bearing disambiguation: KTX `mmode` is unrelated to engine `messagemode 1/2/3` (the chat-prompt binds). The name collision is the primary source of operator confusion.
- Missing the conceptual hook: `mmode <X>` is the *stateful* form; `s-p` / `s-r` / `s-m` are *one-shot* equivalents. The relationship isn't surfaced anywhere.
- "implicit recipient for subsequent messaging and say macros" is true but opaque -- doesn't tell the reader where the interception happens (`ClientSay`) or what the actual user-visible flow is.
- No example showing the flow.

### Proposed draft

```
Sets your "talk-to" target for follow-up 'say' messages. After mmode,
anything you type into 'say' gets intercepted and routed to the chosen
recipient instead of going to public chat. The state persists until
you change it.

Not to be confused with engine messagemode 1/2/3 (the chat-prompt
binds) -- this is KTX's recipient-state layer that sits on top of the
normal say command.

Recipient modes (route your next 'say'):
  off              public chat (default; clears the target)
  player <id|name> private message to one player
  team <name>      message to one team color
  multi            route to your multi-set (build it first with the
                   'multi' command, e.g. 'multi + alice bob')
  name             your next 'say <text>' renames you to <text>
  rcon             your next 'say <cmd>' runs as rcon (requires
                   rcon_password or VIP_RCON; 5s anti-brute delay)

Shortcuts:
  .                re-target the last player you sent to
  ,                re-target the last player who sent to you (reply)
  last             restore your previous mmode

No argument re-applies your current stored mode. Unknown argument
prints the usage line.

Set by: any player via 'mmode <mode> [arg]' (per-player state).
Example: mmode player vikpe   (lock target to vikpe)
         say "gl hf"            ("gl hf" goes privately to vikpe)
         mmode ,                (reply-target whoever last messaged me)
         mmode off              (back to public chat)

See also: s-p / s-r / s-m (one-shot equivalents -- no persistent
          state), multi (the multi-set state-setter commands),
          messagemode 1/2/3 (engine-level chat binds; unrelated).
```

### Notes (for the apply-pass author)

- **New shape**: stateful-recipient-setter with one-shot counterpart. `mmode <X>` is the persistent form; `s-p` / `s-r` / `s-m` / `s-t` / `s-l` are the one-shot forms. Both routes pass through `ClientSay` interception (`g_cmd.c:287`). Worth formalizing as a new entry in `[[reference-ktx-cvar-command-pairing]]` (or a parallel command-pair doc, since this is command-to-command not cvar-to-command). Tentatively "Shape 6: stateful + one-shot pair".
- **State lives in starred userinfo keys**: `*mm` (mode enum), `*mp` (player id), `*mt` (team name), `*ml` (last mode), `*mu` (multi-set bitmask). Mentioned generally in the draft but not enumerated; downstream MCP can surface the keys if needed.
- **Messagemode disambiguation paragraph** is deliberate -- this naming collision is the load-bearing confusion. Reuse this framing in the planned `qw-player-messaging` L3 concept note (see Follow-up).
- **"name" mode side-effect**: `say <text>` after `mmode name` runs `name "<text>"` as a stuffcmd (`g_cmd.c:391`). Effectively a rename gun. Worth flagging at apply time if the description is being condensed.
- **"rcon" mode anti-brute**: 5-second cooldown on failed attempts (`g_cmd.c:1217-1223`); cprint logs failures with the offender's IP. Not in the draft to keep it tight; mention if operator wants a security note.

---

## k_admincode (KTX cvar, Administration & Access)

- **Status**: drafted
- **Source**: `src/world.c:843` (registration); `src/admin.c:313-394` (`ReqAdmin` -- /admin command handler); `src/admin.c:365, 420` (cvar read sites, string + integer)
- **Catalog line**: 227

### Current description

> Server passcode that grants a player real admin privileges when supplied to the /admin command. Matched as a string (/admin <code>) or via the numeric impulse path (integer match). Set to empty or "none" to disable passcode-based admin access. Failed attempts are throttled by a 5-second cooldown. Also gated by k_admins (master admin toggle).
>
> Default: (empty -- passcode access disabled).
> Set by: server config only.

### Gap

- Dense prose -- five technical clauses without a worked example.
- "real admin privileges" is engine jargon (the `AF_REAL_ADMIN` flag); doesn't help the reader.
- "numeric impulse path (integer match)" describes an obscure alternate entry path that nobody uses today.
- No example showing the configuration -> invocation flow across server and client.
- The `k_admins` dependency is mentioned but its actionable shape (`k_admins 1`) is buried.

### Proposed draft

```
Server passcode for becoming admin via the '/admin' command. Has no
effect unless 'k_admins' is also enabled.

Default: (empty -- passcode access disabled).
Set by: server config only.
Example: k_admins 1                  (in server.cfg -- enable admin system)
         k_admincode "secret123"     (in server.cfg -- set the passcode)
         /admin secret123            (player runs in console -- becomes
                                      admin on match)
         k_admincode "none"          (Optional: explicit way to disable
                                      passcode access while leaving
                                      k_admins on.)

See also: k_admins (master toggle).
```

### Notes (for the apply-pass author)

- "real admin privileges" → just "admin" (the `AF_REAL_ADMIN` vs other-admin distinction does not change usage).
- Numeric impulse path → dropped entirely (obscure; source-flagged in `ReqAdmin`'s "Use numbers or impulses" fallback at admin.c:393).
- 5-second cooldown → dropped (fails MVI; affects fail path only).
- "k_admins gate" → kept in prose because without it, your passcode silently does nothing.
- See-also pointer to the planned admin-authentication L3 concept note deferred until that note exists.

---

## k_allowvoteadmin (KTX cvar, Administration & Access)

- **Status**: drafted
- **Source**: `src/world.c:878` (registration); `src/admin.c:450-509` (`VoteAdmin` -- /elect handler); `src/admin.c:489, 497` (gate checks: k_admins THEN k_allowvoteadmin); `src/world.c:824` (`k_vp_admin` registration -- inline comment "votes percentage for admin election")
- **Catalog line**: 417

### Current description

> Toggle for whether players may elect a temporary admin via the /elect vote system. Independent of k_admins (which is the master admin toggle).
>
> 0 = admin election is disabled (the election prints "Admin election is not allowed on this server").
> 1 = players can vote to grant admin status.
>
> Default: 0.
> Set by: server config only.

### Gap

- **Factual error**: "Independent of k_admins" is WRONG. Source at `admin.c:489` gates on `k_admins` FIRST ("NO admins on this server"); `admin.c:497` then gates on `k_allowvoteadmin` ("Admin election is not allowed on this server"). Both must be enabled.
- No example showing the configuration -> invocation flow.
- Sibling threshold cvar `k_vp_admin` not surfaced (it's how many yes-votes the election needs to succeed).

### Proposed draft

```
Server toggle for whether players may elect a temporary admin via /elect.
Requires 'k_admins' to also be enabled. Vote threshold controlled by
'k_vp_admin'.

0 = admin election disabled.
1 = admin election allowed.

Default: 0.
Set by: server config only.
Example: k_admins 1            (in server.cfg -- master admin toggle)
         k_allowvoteadmin 1    (in server.cfg -- allow elections)
         k_vp_admin 51         (in server.cfg -- yes-vote percentage needed)
         /elect                (player nominates self in console)
         /yes                  (other players vote; /no opposes)

See also: k_admins (master toggle), k_vp_admin (vote threshold).
```

### Notes (for the apply-pass author)

- Factual fix: drop the "Independent of k_admins" claim. Source proves both gates apply.
- The in-game feedback message ("Admin election is not allowed on this server") dropped from the enum -- fails MVI for the cvar itself; useful only when troubleshooting why /elect isn't working.
- `k_vp_admin` reference surfaced in prose AND example -- bonus retrievability per the LLM-keyword principle.
- `/yes` and `/no` are admin-election votes; `/agree` is a DIFFERENT command for map voting (`commands.c:902` -- `agree_on_map` handler). Do not conflate.

---

## admin (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:750` (registration `CF_BOTH | CF_MATCHLESS | CF_PARAMS`); `src/admin.c:313-394` (`ReqAdmin` handler)
- **Catalog line**: 579

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

### Gap

- `Default: n/a` is a pointless field for a command -- the template's Default line is for cvars.
- "number/impulse commands to enter the code" -- obscure impulse-entry path (same path dropped from k_admincode).
- "5-second anti-brute-force delay" -- fails MVI; fail-path only.
- "code-entry is in progress, cancels it" -- only meaningful inside the impulse flow; drops with it.
- "subject of a pending admin election" -- edge case nobody plans for.
- No example -- same gap as the other admin-family cards.

### Proposed draft

```
Becomes admin (or relinquishes admin if already admin). Requires
'k_admins' to be enabled. Pass the server's `k_admincode` as the
argument to authenticate; VIP-listed players become admin without
a code.

Set by: any player.
Example: /admin secret123       (pass the server's k_admincode -- become admin)
         /admin                  (no args, when already admin -- step down)

See also: k_admincode (the passcode), k_admins (master toggle),
          k_allowvoteadmin (alternative path via election).
```

### Notes (for the apply-pass author)

- All edge cases (impulse entry, code-cancel, election-collision, cooldown) dropped per MVI.
- `Default: n/a` line removed -- commands don't have defaults; the template field doesn't apply.
- "any player or spectator" trimmed to "any player" -- the original CF_BOTH flag means both can call it, but "any player" reads naturally to a human reader (spectators are players in the casual sense). If a reader specifically queries spec-eligibility, they can check the audit trail.
- Example body intentionally contains `k_admincode` + `admin` together for LLM-keyword bleed in both directions.
- See-also points at all three admin-family entities (`k_admincode`, `k_admins`, `k_allowvoteadmin`) -- the future admin-authentication L3 concept note will pull them together more completely.

---

## ban (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:975` (KTX registration `CF_REDIRECT`); mvdsv `src/sv_main.c:2503` (`SV_Cmd_Ban_f` -- actual handler); mvdsv `src/sv_user.c:3348` (mvdsv ucmds dispatch)
- **Catalog line**: 612

### Current description

> Bans a connected player by user id or nick for a timed period. KTX passes this command to the underlying server engine, which performs the actual ban; ban duration and ban-list semantics are controlled by the server, not by KTX.
>
> Default: n/a (command).
> Set by: admin command 'ban <userid|nick>'.

### Gap

- "Hedged" verdict (medium confidence) because the previous arc could not reach mvdsv-side facts. Source now verified: mvdsv handles via `SV_Cmd_Ban_f` (sv_main.c:2503).
- No usage example, no time-format spec, no reason-arg mention.
- `Default: n/a (command)` is template-meaningless (we drop it per the same logic as `/admin`).
- Engine-attribution prose ("KTX passes this command...") is internal architecture from the user's POV.

### Proposed draft

```
Bans a connected player by user id or name for a specific duration.
Requires admin status. Time format: <N><unit> where unit is s/m/h/d
(max 999 per unit).

Set by: any admin.
Example: ban 12 1d                  (ban userid 12 for 1 day)
         ban joe 30m flaming        (ban "joe" for 30 minutes, reason
                                     "flaming")

See also: banip (ban by IP), banrem (remove or list bans), /admin
          (how to become admin).
```

### Notes (for the apply-pass author)

- Verdict shifts from `hedged` to `synthesized` (high confidence) -- mvdsv source now verified.
- Engine-attribution dropped: the user does not need to know which engine layer implements the ban; from a KTX-server-user POV, `ban` bans.
- `Default: n/a` field removed (commands do not have defaults; template field does not apply).
- mvdsv-side cross-refs (`filterban`, `addip`, `removeip`, `writeip`) deferred to the L3 concept note rather than fragmented into See also.

---

## banip (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:976` (KTX registration `CF_REDIRECT`); mvdsv `src/sv_main.c:2601` (`SV_Cmd_Banip_f`)
- **Catalog line**: 640

### Current description

> Admin command for timed IP bans. KTX passes the command through to the underlying server (MVDSV); the actual ban duration and ban-list behaviour is handled by the server, not by KTX.
>
> Set by: admin command in-game.

### Gap

Same shape as `ban` -- hedged, no example, no time-format spec, engine-attribution prose.

### Proposed draft

```
Bans an IP address for a specific duration. Requires admin status.
Time format: <N><unit> where unit is s/m/h/d (max 999 per unit).

Set by: any admin.
Example: banip 1.2.3.4 1d           (ban IP for 1 day)

See also: ban (ban a connected player by id/nick), banrem (remove or
          list bans), /admin (how to become admin).
```

### Notes (for the apply-pass author)

- Same un-hedge + engine-attribution drop as `ban`.

---

## banrem (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:977` (KTX registration `CF_REDIRECT`); mvdsv `src/sv_main.c:2669` (`SV_Cmd_Banremove_f`)
- **Catalog line**: 667

### Current description

> Removes a ban or lists current bans. KTX passes this command through to the underlying server (MVDSV); the actual ban-removal and ban-list behaviour is handled by the server, not by KTX itself.
>
> Set by: admin command 'banrem'.

### Gap

Same shape -- hedged, no example, no list-vs-remove signature.

### Proposed draft

```
Removes a ban by its ID, or lists current bans if no ID is given.
Requires admin status.

Set by: any admin.
Example: banrem                     (list current bans with IDs)
         banrem 3                   (remove ban with ID 3)

See also: ban (ban a connected player), banip (ban by IP), /admin
          (how to become admin).
```

### Notes (for the apply-pass author)

- Same un-hedge + engine-attribution drop.
- "Safe" ban type that cannot be removed (mvdsv `sv_main.c:2703`) dropped from L1 -- edge case; user gets "Can't remove such ban with id: %d" feedback if they hit it.

---

## fp (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:963` (registration -- DEF(fp_toggle, 1)); `src/g_cmd.c:193-219` (`fp_toggle(type)` handler -- shared with fp_spec); `src/g_cmd.c:150-155` (`say_fp_levels[]` hardcoded preset array); `src/g_cmd.c:159-191` (`FixSayFloodProtect` -- applies the preset values)
- **Catalog line**: 839

### Current description

> Admin command. Cycles the chat flood-protection level to the next configured preset (wrapping back to first after last). Each preset sets how many messages are allowed, over what time window, and how long a flooder is muted. The new level and its limits are broadcast to everyone.
>
> Set by: admin command 'fp'.
> See also: k_fp (cvar storing the current level index).

### Gap

- **"configured preset"** is misleading -- presets are HARDCODED in `say_fp_levels[]`, not configurable by the admin.
- No enumeration of the 3 presets (Low / Medium / High) and their concrete values.
- No example.
- Doesn't surface the direct-set alternative (`k_fp 1` jumps to Low without cycling).

### Proposed draft

```
Admin command that cycles the player chat flood-protection level to
the next built-in preset (Low -> Medium -> High -> Low). The preset
sets how many messages a player can send per N seconds before being
muted for M seconds. Three presets are hardcoded; admins cannot add
new ones.

Presets:
  1 = Low:    9 messages per 1 second, muted 1 second.
  2 = Medium: 4 messages per 1 second, muted 5 seconds.
  3 = High:   5 messages per 3 seconds, muted 7 seconds.

Set by: any admin.
Example: fp                  (cycles to next preset; broadcasts the
                              new level + limits to everyone.)

See also: fp_spec (same mechanism for spectator chat), k_fp (cvar
          storing current preset; can be set directly to skip
          cycling).
```

### Notes (for the apply-pass author)

- Factual fix: "configured" -> "built-in". Source array is hardcoded.
- Preset table values verified against `say_fp_levels[]` at `g_cmd.c:150-155`.
- The "set k_fp directly to skip cycling" hint surfaced in See also -- not in prose, because cycling IS the primary purpose of the command; direct-set is the alternative.

---

## fp_spec (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:964` (registration -- DEF(fp_toggle, 2)); shares `fp_toggle` handler with `fp`, differing only in cvar name (`k_fp_spec` vs `k_fp`)
- **Catalog line**: 867

### Current description

> Admin command. Cycles the chat flood-protection level for spectators to the next preset, updating k_fp_spec and broadcasting the new level's name and limits to all players. Each preset defines how many messages are allowed, over what time window, and how long a flooder is muted.
>
> Set by: admin command 'fp_spec' (cycles through the configured presets).

### Gap

- Same "configured" misnomer as fp.
- No example.
- No reference back to fp (which now carries the canonical preset table).

### Proposed draft

```
Admin command that cycles the SPECTATOR chat flood-protection level to
the next built-in preset. Uses the same three Low/Medium/High presets
as 'fp' (see fp for the preset table).

Set by: any admin.
Example: fp_spec             (cycles to next preset; broadcasts the
                              new level + limits to everyone.)

See also: fp (player chat version with the preset table), k_fp_spec
          (cvar storing current preset; can be set directly to skip
          cycling).
```

### Notes (for the apply-pass author)

- Same "configured" -> "built-in" framing fix as fp.
- Preset table NOT duplicated -- references `fp` as the canonical entry (same pattern as `ksound2..ksound6` -> `ksound1`).
- `fp` and `fp_spec` share one handler (`fp_toggle`); only the cvar name differs (`k_fp` for players, `k_fp_spec` for spectators).

---

## k_lock_hdp (KTX cvar, Administration & Access)

- **Status**: drafted
- **Source**: `src/world.c:801` (registration); `src/g_utils.c:1662` (`GetHandicap` -- forces 100 when locked); `src/g_utils.c:1674-1679` (`SetHandicap` -- refuses changes when locked); `src/commands.c:5203` (`hdptoggle` flips the cvar)
- **Catalog line**: 6008

### Current description

> Locks player handicap. When enabled, every player's effective handicap is forced to 100 (neutral) and attempts to change it are refused.
>
> 0 = handicap allowed (players may set their own value).
> 1 = handicap locked (forced to 100; changes refused with "handicap changes are not allowed").
>
> Default: 0.
> Set by: server config or 'handicap' admin command in-game.

### Gap

- Already accurate, but missing an inline example.
- The "Set by" reference to the `handicap` command is misleading -- `handicap` is the PLAYER command that gets blocked; the toggling admin command is `hdptoggle`.
- No See-also pointing at `handicap` (where the 50-150 damage-% semantics live).

### Proposed draft

```
Locks player handicap. When enabled, every player's effective handicap
is forced to 100 (neutral) and attempts to change it via /handicap are
refused.

0 = handicap allowed (players may set their own value via /handicap).
1 = handicap locked (forced to 100; changes refused).

Default: 0.
Set by: server config or 'hdptoggle' admin command in-game (pre-match only).
Example: k_lock_hdp 1     (in server.cfg -- handicap locked at server start)
         hdptoggle        (admin runs in console pre-match to flip
                           the current state)

See also: handicap (player command; value 50-150 = damage % you deal,
          100 = off), hdptoggle (the in-game admin toggle that flips
          this cvar).
```

### Notes (for the apply-pass author)

- Correction: "Set by ... 'handicap' admin command" was wrong (handicap is the PLAYER command); the actual toggling admin command is `hdptoggle`. Drafted fix names hdptoggle.
- Inline semantic hint in See-also for `handicap` so the reader sees the damage-% meaning without an extra lookup.

---

## hdptoggle (KTX command, Administration & Access)

- **Status**: drafted
- **Source**: `src/commands.c:835` (registration `CF_BOTH_ADMIN`); `src/commands.c:5196-5206` (`hdptoggle` handler); `src/commands.c:5198-5201` (match-in-progress gate); `src/commands.c:5203` (flip via `trap_cvar_set_float`)
- **Catalog line**: 894

### Current description

> Admin command that toggles the server-wide handicap lock (k_lock_hdp) and announces the new state to all players. While locked, any player's attempt to change their handicap is refused. Has no effect while a match is in progress.
>
> Default: unlocked (follows k_lock_hdp default of 0).
> Set by: admin command 'hdptoggle' (match-gated).

### Gap

- Pre-match-only constraint is buried at the end ("Has no effect while a match is in progress"); operator confused about whether it's conditional on `k_lock_hdp`.
- No example.
- `Default: unlocked` is template-meaningless for a command -- defaults belong to cvars.

### Proposed draft

```
Admin command that toggles the handicap lock (`k_lock_hdp`) and
announces the new state to all players. Pre-match only -- refused once
a match is running. While locked, /handicap changes are refused with
"handicap changes are not allowed".

Set by: any admin (pre-match only).
Example: hdptoggle        (flip the current k_lock_hdp state; broadcast
                           "<name> Allows/Disallows handicap")

See also: k_lock_hdp (the cvar this toggles), handicap (player command
          gated by the lock; value 50-150 = damage % you deal).
```

### Notes (for the apply-pass author)

- `Default: unlocked` field dropped -- commands do not have defaults.
- Pre-match constraint promoted to the prose's primary clause (was buried).
- Source confirms: hdptoggle is a true flip (XOR), not a conditional enable; only gate is `match_in_progress`.

---

## k_nightmare_pu (KTX cvar, bloodfest)

- **Status**: drafted
- **Source**: `src/world.c:973` (registration, default 0); `src/sp_monsters.c:745` (gate at monster death); `src/sp_monsters.c:641-686` (`MonsterDropPowerups` -- skill-3 gate, drop logic with 4/6 quad + 1/6 pent + 1/6 ring weighted distribution); `src/commands.c:8630` (`nightmare_pu` admin toggle via `cvar_toggle_msg`)
- **Catalog line**: 6069

### Current description

> Enables Nightmare powerup drops: monsters killed at skill 3 or higher have a chance to drop a Quad, Pentagram, or Ring at their death location. Drop probability is set by k_nightmare_pu_droprate.
>
> 0 = disabled.
> 1 = enabled.
>
> Default: 0.
> Set by: server config or admin command 'nightmare_pu'.

### Gap

- No mention of **bloodfest** -- the mode this mechanic is for. Users searching the catalog by mode name don't find it.
- No example.
- Sibling per-powerup-type cvars (`k_pow_q`, `k_pow_p`, `k_pow_r`) not surfaced.
- 30-second powerup lifetime not noted.

### Proposed draft

```
Enables powerup drops from killed monsters in bloodfest (or any mode
with monsters; requires skill 3+). On each monster kill, rolls a
probability check (k_nightmare_pu_droprate) to decide if a powerup
spawns at the corpse. Possible drops: Quad (most common), Pentagram,
or Ring of Shadows; each lasts 30 seconds.

0 = disabled.
1 = enabled.

Default: 0.
Set by: server config or 'nightmare_pu' admin command in-game.
Example: k_nightmare_pu 1                (in server.cfg)
         k_nightmare_pu_droprate 0.3     (~30% chance per kill)
         nightmare_pu                    (admin runs in-game to toggle)

See also: k_nightmare_pu_droprate (drop probability), k_pow_q /
          k_pow_p / k_pow_r (per-powerup enables; disable any to
          exclude that type from the drop pool), bloodfest (the mode).
```

### Notes (for the apply-pass author)

- Drop weighting (4/6 quad, 1/6 pent, 1/6 ring) verified at `sp_monsters.c:660-685`. "Most common" framing chosen over numeric ratios -- exact distribution feels too detailed for L1.
- 30-second lifetime per `DropPowerup(30, ...)` calls.
- The admin `nightmare_pu` command surfaced; it just `cvar_toggle_msg`-flips the cvar with banner "New Nightmare mode (drops powerups)".

---

## k_nightmare_pu_droprate (KTX cvar, bloodfest)

- **Status**: drafted
- **Source**: `src/world.c:974` (registration, default 0.15); `src/sp_monsters.c:655` (`if (g_random() > cvar(...)) return;` -- the probability gate inside `MonsterDropPowerups`)
- **Catalog line**: 6100

### Current description

> Drop probability for powerups when a monster is killed in Nightmare powerup mode (k_nightmare_pu on, skill 3+). Higher values mean more frequent drops. Has no effect unless k_nightmare_pu is enabled.
>
> Range: 0.0 to 1.0.
>
> Default: 0.15.
> Set by: server config.

### Gap

- Already accurate; just needs an example and a bloodfest reference for discoverability.
- "Higher values mean more frequent drops" is redundant once we frame the value as "probability".

### Proposed draft

```
Drop probability for monster powerup drops in bloodfest. Active only
when k_nightmare_pu is enabled (and skill 3+).

Range: 0.0 (never drops) to 1.0 (every kill drops).

Default: 0.15 (15% chance per monster kill).
Set by: server config.
Example: k_nightmare_pu 1                (enable the mechanic)
         k_nightmare_pu_droprate 0.3     (boost drops to ~30%)

See also: k_nightmare_pu (the master toggle), bloodfest (the mode).
```

### Notes (for the apply-pass author)

- "Higher = more drops" dropped (redundant once value is framed as probability).
- Example uses the same shape as k_nightmare_pu so the pair reads consistently when the reader bounces between them.

---

## k_remove_end_hurt (KTX cvar, gameplay)

- **Status**: drafted
- **Source**: `src/world.c:877` (registration); `src/triggers.c:978-983` (`SP_trigger_hurt` removes hurt entities on "end" map); `src/client.c:773-779` (`SP_trigger_changelevel` removes level-end trigger when cvar != 2)
- **Catalog line**: 6438

### Current description

> On the "end" map only, controls removal of built-in level triggers.
>
> 0 = no modifications; hurt and changelevel triggers behave normally.
> 1 = remove both the hurt trigger and the changelevel trigger.
> 2 = remove only the hurt trigger (changelevel trigger kept).
>
> Default: 0.
> Set by: server config only.

### Gap

- "Hurt trigger" is engine jargon -- doesn't name what users actually experience (the lava that surrounds the central plate).
- No use-case context -- without "this is for RL practice", "remove level-end trigger" reads as random admin trivia.
- Value enum is technically correct but each value's behavior reads in a single dense line; pairing each value with the user-visible outcome would help.
- No example.

### Proposed draft

```
On the "end" map only, controls whether the lava damage zones
(trigger_hurt entities) and the level-end trigger are removed.
Typically set for 1on1 rocket-launcher practice on the map's central
plate -- without removal, RL splash knocks players into the surrounding
lava for instant death.

0 = no modifications (lava damage and level-end trigger both active).
1 = remove both (no lava damage, no auto level-end).
2 = remove only lava damage; level-end trigger still works.

Default: 0.
Set by: server config only.
Example: k_remove_end_hurt 2     (RL practice -- no lava deaths, match
                                  still ends normally)

See also: end (the map this targets).
```

### Notes (for the apply-pass author)

- "trigger_hurt entities" kept alongside "lava damage zones" -- bridges user-vocabulary and engine-vocabulary in one phrase (useful for both human readers and source-grepping LLM consumers).
- Use case spelled out (1on1 RL practice) -- accepted as load-bearing because without it the level-end-trigger control reads as aimless.
- Value 2 is the actually-useful setting; example shows it.

---

## k_pow_check_time (KTX cvar, gameplay)

- **Status**: drafted
- **Source**: `src/world.c:817` (registration); `src/g_utils.c:1786-1816` (`Get_Powerups` -- the auto-disable check, gated by `k_matchLess && k_pow_min_players && deathmatch`); `src/g_utils.c:1789` (default-10 fallback when value is 0)
- **Catalog line**: 6223

### Current description

> In matchless (pickup-style) deathmatch, the interval in seconds between checks of whether enough players are present to keep powerups enabled (governed by k_pow_min_players). Has no effect outside matchless mode or when k_pow_min_players is 0.
>
> Range: 0-999 (seconds). Value 0 uses the built-in default of 10 seconds.
>
> Default: 0 (effective 10 seconds).
> Set by: server config only.

### Gap

- "Matchless" without context easy to misread as "no ongoing match / pre-war" -- it's actually a separate server MODE (pickup-style continuous play, k_matchless 1).
- No example showing the typical k_matchless + k_pow_min_players + k_pow_check_time trio.
- No mention of the broadcast message ("Server decides to turn powerups off") so users don't recognize the trigger.

### Proposed draft

```
Throttle interval (seconds) for the matchless-mode auto-disable check
of powerups. In matchless mode, if connected players drop below
k_pow_min_players, the server temporarily turns powerups off and
announces "Server decides to turn powerups off"; this cvar sets how
often that check runs. No effect outside matchless mode or when
k_pow_min_players is 0.

Range: 0 to 999 (seconds). Value 0 uses the built-in default of 10
seconds.

Default: 0 (effective 10 seconds).
Set by: server config only.
Example: k_matchless 1                (server is in matchless mode)
         k_pow_min_players 4          (auto-disable powerups below 4 players)
         k_pow_check_time 15          (re-evaluate every 15 seconds)

See also: k_pow_min_players (the player threshold), k_pow (powerup
          master enable), k_matchless (matchless mode toggle).
```

### Notes (for the apply-pass author)

- "matchless" mode-name reaffirmed in prose so the reader can connect it to the matchless server setup (open / pickup-style continuous play -- distinct from pre-war / warmup which is a phase WITHIN match mode).
- Example shows the three-cvar dependency that makes this knob meaningful; example doubles as keyword bleed for k_matchless / k_pow_min_players.

---

## discharge (KTX command, gameplay)

- **Status**: drafted
- **Source**: `src/commands.c:723` (registration `CF_PLAYER | CF_SPC_ADMIN`); `src/commands.c:2856-2864` (`ToggleDischarge` -- match-in-progress gate then `cvar_toggle_msg(self, "k_dis", ...)`)
- **Catalog line**: (not memorized; near droppack)

### Current description

> Toggles underwater weapon discharges (chain-reaction self-damage when firing a discharge weapon in water). Broadcasts the new state to all players. Has no effect while a match is in progress.
>
> Set by: admin command 'discharge' (flips the k_dis cvar).

### Gap

- Match-state constraint duplicated -- once buried in prose tail, missing from Set-by.
- "discharge weapon" is jargon -- LG is the actual weapon; spelling it out helps.

### Proposed draft

```
Toggles the underwater discharge rule (k_dis) -- whether firing the
lightning gun underwater triggers a chain-reaction self-damage
explosion. Broadcasts the new state.

Set by: any in-game player or admin spectator (pre-match only).
Example: discharge        (flip the rule; broadcasts new state)

See also: k_dis (the cvar this toggles).
```

### Notes (for the apply-pass author)

- Match-state constraint moved into Set-by as `(pre-match only)`, dropped from prose. Standardized convention.
- "discharge weapon" replaced with "the lightning gun" -- removes the indirection.

---

## droppack (KTX command, gameplay)

- **Status**: drafted
- **Source**: `src/commands.c:743` (registration `CF_PLAYER | CF_SPC_ADMIN`); `src/commands.c:3165-3173` (`ToggleDropPack` -- match-in-progress gate + `cvar_toggle_msg(self, "dp", ...)`); `src/items.c:2667-2699` (`DropBackpack` -- bloodfest/match-state/suicide/empty guards)
- **Catalog line**: (per screenshot)

### Current description

> Toggles the dp (drop backpack) rule and broadcasts the new state to all players. Must be set before the match starts (refused while a match is in progress). When enabled, players drop a backpack containing their ammo and weapon on death during a live match (subject to standard guards: bloodfest disables it, suicides in non-yawn modes do not drop, empty inventory drops nothing).
>
> Set by: any in-game player or admin spectator ('droppack' command; warmup only).

### Gap

- Match-state constraint in BOTH prose and Set-by -- duplication.
- "Subject to standard guards" + dense parenthetical list of conditions -- hard to parse.
- "non-yawn modes" is jargon without a See-also pointer.

### Proposed draft

```
Toggles the dp (drop backpack) rule and broadcasts the new state. When
enabled, players drop a backpack containing their ammo and weapon on
death during a live match. The backpack does NOT drop when:

- bloodfest mode is active (always disabled).
- the death was a suicide (except in yawn mode, where suicides also
  drop).
- inventory is empty (no ammo, no droppable weapon).

Set by: any in-game player or admin spectator (pre-match only).
Example: droppack         (flip the rule; broadcasts new state)

See also: dp (the cvar this toggles), yawnmode (server variant where
          the suicide-exception is removed).
```

### Notes (for the apply-pass author)

- Match-state constraint consolidated in Set-by; removed from prose.
- "Subject to standard guards" replaced with explicit bullet list of conditions where drop does NOT happen.
- yawn-mode jargon glossed via See-also pointer.
- Example brief because the command is trivial (just toggles); the bullet list does the heavy lifting.

---

## k_fallbunny (KTX cvar, gameplay -- Shape 1)

- **Status**: drafted
- **Source**: `src/world.c:846` (registration); `src/g_utils.c:2723-2727` (`get_fallbunny` -- forces 1 in race/yawn); `src/client.c:4497-4504` (use site -- broken-ankle on hard fall when fallbunny off; 5 damage applied regardless)
- **Catalog line**: 5884

### Current description

> Controls whether a hard landing from a long fall triggers a "broken ankle" state that prevents the player from jumping until they land again, disrupting bunnyhopping after big drops.
>
> 0 = broken ankle on hard fall (voluntary jump suppressed until next landing).
> 1 = standard QuakeWorld landing behaviour (no broken-ankle penalty).
>
> Default: 0. Race mode and yawnmode always behave as 1 regardless of this setting.
> Set by: server config.

### Gap

- Already accurate but misses the **5 fall damage is constant** clarification -- a reader could plausibly infer that fallbunny controls fall DAMAGE (it doesn't; the 5 dmg always applies, only the jump-suppression toggles).
- No example.
- Mode exemptions buried at end of Default line.
- No See-also pointer to the paired `fallbunny` command (Shape 1).

### Proposed draft

```
Controls whether a hard landing from a long fall triggers a "broken
ankle" state -- voluntary jump is suppressed until the next time the
player lands, disrupting bunnyhopping after big drops. The 5 fall
damage applies regardless; only the jump-suppression penalty is
toggled by this cvar.

Mode exemptions (always behaves as 1 regardless of k_fallbunny):
- race mode
- yawn mode

0 = broken ankle on hard fall (jump suppressed until next landing).
1 = standard QuakeWorld landing (no broken-ankle penalty).

Default: 0.
Set by: server config or 'fallbunny' admin command in-game (pre-match only).
Example: k_fallbunny 1     (in server.cfg -- allow bunny landings)
         fallbunny         (admin runs in-game pre-match to flip)

See also: fallbunny (the in-game admin toggle), race + yawnmode
          (modes that override this cvar).
```

### Notes (for the apply-pass author)

- 5-damage-is-constant clarification added -- prevents reader from misreading "broken ankle" as "fall damage toggle".
- Mode exemptions promoted to a bullet list above the value enum (consistent with droppack's exception-list pattern).
- Shape 1 cvar template applied: cvar carries value enum + Default + mode notes; paired command in See-also.

---

## fallbunny (KTX command, gameplay -- Shape 1 paired toggle)

- **Status**: drafted
- **Source**: `src/commands.c:735` (registration `CF_PLAYER | CF_SPC_ADMIN`); `src/admin.c:888-910` (`ToggleFallBunny` -- match_in_progress + race/yawn refusal + cvar_toggle_msg)
- **Catalog line**: 6835

### Current description

> Admin command that toggles the fallbunny setting (k_fallbunny). Controls whether hard landings after a high fall apply the broken-ankle movement penalty to the player.
>
> 0 = broken-ankle penalty applies on hard landings after bunny-hopping.
> 1 = broken-ankle penalty suppressed; hard landings carry no movement consequence.
>
> Blocked during a live match and when race mode or yawnmode is active.
> Set by: admin command 'fallbunny' or server config (k_fallbunny).

### Gap

- **0/1 value enum on a COMMAND card** -- wrong; values belong on the paired cvar's card (Shape 1 rule). The command just flips.
- Match-state constraint in prose; should be in Set-by parenthetical.
- "Set by: admin command 'fallbunny' or server config (k_fallbunny)" conflates the command with its underlying cvar. The COMMAND is admin-invoked; the CVAR is server-config-set. Different entities.
- Race/yawn refusal mentioned but the in-game "Command blocked" message not noted.

### Proposed draft

```
Admin command that toggles the fallbunny rule (k_fallbunny). Refused
in race mode and yawnmode (both modes always behave as fallbunny on,
so the toggle is meaningless and prints "Command blocked").

Set by: any in-game player or admin spectator (pre-match only).
Example: fallbunny       (flip the rule; broadcasts new state)

See also: k_fallbunny (the cvar this toggles -- explains 5-damage
          baseline + broken-ankle distinction + value enum), race +
          yawnmode (modes that bypass this toggle).
```

### Notes (for the apply-pass author)

- Value enum dropped -- belongs on the cvar card per Shape 1 rule.
- Match-state moved to Set-by parenthetical: `(pre-match only)`.
- Race/yawn refusal kept in prose with the exact in-game message ("Command blocked") for recognizability.
- Set-by corrected: command is admin-invoked, not server-config-set.
- See-also notes that the cvar card explains the 5-damage baseline -- avoids duplicating it here.

---

## giveme (KTX command, gameplay -- Shape 4b serverinfo-gated)

- **Status**: drafted
- **Source**: `src/commands.c:1036` (registration `CF_PLAYER | CF_MATCHLESS | CF_PARAMS`); `src/commands.c:8944` (`giveme` handler); `src/commands.c:8951` (cheat gate `if (strnull(ezinfokey(world, "*cheats")))`); `src/commands.c:8966-9028` (argument dispatch); `include/g_consts.h:269-272` (`CTF_RUNE_RES`=1, `CTF_RUNE_STR`=2, `CTF_RUNE_HST`=4, `CTF_RUNE_RGN`=8 -- rune-number-to-effect mapping)
- **Catalog line**: 6921

### Current description

> Cheat command. Grants the calling player a powerup or runes. Requires the *cheats serverinfo key to be set; refused otherwise.
>
> giveme <q|p|r|s> [seconds] -- grants Quad (q), Pentagram (p), Ring (r), or Biosuit (s) for the given duration (default 30 s).
> giveme rune [1-4] -- grants the numbered runeflag.
> giveme runes -- grants all four runes.
> giveme norunes -- clears all four runes.
>
> Default: n/a (command).
> Set by: any player (requires cheats enabled on the server).

### Gap

- `Default: n/a (command)` -- pointless field for a command.
- Sub-command list inline-mixed with prose; a labeled `Sub-commands:` block reads cleaner.
- No example.
- `*cheats` not in See-also.
- Ring sub-command would benefit from a name gloss (invisibility).
- **Rune numbers not mapped to effects** -- `giveme rune 2` is opaque without knowing 2 = Strength. Source verifies a hardcoded 1-4 mapping (Resistance / Strength / Haste / Regeneration).

### Proposed draft

```
Cheat command that grants the caller powerups or runeflags. Requires
the '*cheats' serverinfo key to be set on the server (otherwise prints
"Cheats are disabled").

Sub-commands:
  giveme <q|p|r|s> [seconds]   Grant powerup for N seconds (default 30):
                                 q = Quad, p = Pentagram,
                                 r = Ring (invisibility), s = Biosuit.
  giveme rune <1-4>            Grant the numbered runeflag:
                                 1 = Resistance, 2 = Strength,
                                 3 = Haste, 4 = Regeneration.
  giveme runes                 Grant all four runes.
  giveme norunes               Clear all four runes.

Set by: any player (cheats must be enabled on the server).
Example: giveme q 60         (grant Quad for 60 seconds)
         giveme rune 2       (grant Strength rune)

See also: *cheats (the serverinfo gate).
```

### Notes (for the apply-pass author)

- `Default` field dropped.
- Sub-commands promoted to a labeled block (matches `tpmsg`'s `Available messages:` shape).
- Rune-number-to-effect mapping added; verified at `include/g_consts.h:269-272`.
- Ring gloss added (invisibility) -- powerup is referenced by multiple names in QW community ("ring", "eyes", "invisibility").
- This is a Shape 4b entity (serverinfo-key-gated command). See [[reference-ktx-cvar-command-pairing]] for the template.

---

## kill (KTX command, gameplay)

- **Status**: drafted
- **Source**: `src/commands.c:947` (registration `CF_PLAYER | CF_MATCHLESS`); `src/client.c:943-1010` (`ClientKill` -- 6+ refusal branches + suicide trigger); `src/client.c:5270` (suicide -2 frag penalty); `src/items.c:2688` (non-yawn suicide skips backpack drop)
- **Catalog line**: 6981

### Current description

> Kills your own player (suicide). Blocked while the server is paused or in standby, in RA mode, during CA/wipeout at restricted times (wipeout-round suicide also blocks respawn for that round), and during the first 10 seconds of a CTF match. Rate-limited to one per second.
>
> Default: n/a (command).
> Set by: any player.

### Gap

- All 6+ refusal conditions packed into one dense sentence.
- **Missing the common-case behavior**: in normal DM, /kill suicide costs -2 frags AND blocks backpack drop. Both are live-match facts that affect player strategy.
- **Missing the RACE mode behavior** (race-event handler bypass) entirely.
- `Default: n/a` -- drop.
- No example.

### Proposed draft

```
Kills your own player (suicide). Triggers a normal death + respawn cycle.

Live Deathmatch penalties:
- Loses 2 frags (vs 1 for a natural death).
- No backpack drops (suicide deaths excluded in non-yawn modes; see
  droppack).

Warmup / pre-war: works freely; just respawns the player.

Mode-specific restrictions:
- RA mode -- refused with "Can't suicide in RA mode".
- CA mode (live match) -- refused with "Can't suicide at this time",
  EXCEPT during the active fight phase.
- Wipeout (fight phase) -- allowed, but you sit out the rest of the
  round (no respawn until round ends).
- CTF (live match) -- refused during the first 10 seconds.
- RACE mode -- handled by race-mode logic (race-specific reset).
- Server paused or in standby -- silently ignored.

Rate-limited to one suicide per second.

Set by: any player.
Example: kill           (instant suicide; effects depend on mode and
                         match phase)
```

### Notes (for the apply-pass author)

- Structure: live-DM penalties first (most common case), warmup behavior second, mode-specific overrides third, rate limit last. Reader sees common-case info before edge cases.
- -2 frag penalty verified at client.c:5270 (`targ->s.v.frags -= (dtSUICIDE == targ->deathtype ? 2 : 1)`).
- No-backpack-on-suicide verified at items.c:2688 (`if (dtSUICIDE == self->deathtype) return;` in non-yawn modes).
- Each mode-specific refusal quotes the in-game message verbatim for recognizability.
- Universal Quake mechanics intentionally NOT mentioned: "frags reset at match start", "respawn placement", etc. -- these apply to every death, not just /kill, so they fail MVI here.

---

## k_allowed_free_modes (KTX cvar, gameplay -- Shape 4 gating)

- **Status**: drafted
- **Source**: `src/world.c:873` (registration); `src/world.c:1106-1113` (read at map load); `src/world.c:1109` (matchless FFA force-OR); `src/commands.c:4535-4553` (`um_list[]` -- mode name -> flag mapping); `src/commands.c:4730-4735` (enforcement: `if (!(um_list[(int)umode].um_flags & k_allowed_free_modes))` -> discarded); `include/g_local.h:693-705` (`UM_*` bit constants)
- **Catalog line**: 321

### Current description

> Bitmask controlling which game modes players may switch the server into via the usermode command. Evaluated once at map load; requests for modes whose bit is not set are silently discarded.
>
> 1 = 1on1, 2 = 2on2, 4 = 3on3, 8 = 4on4, 16 = 10on10, 32 = ffa, 64 = ctf, 128 = 1on1 hoonymode, 256 = 2on2on2, 512 = 3on3on3, 1024 = 4on4on4, 2048 = XonX.
>
> Add bits together for multiple modes (e.g. 4095 = all above). FFA is force-enabled on matchless servers regardless of this setting.
>
> Default: 0.
> Set by: server config (takes effect at next map load).

### Gap

- **Multi-mode-per-bit fact NOT surfaced**: `um_list[]` maps 17 mode names to only 12 bits. Bits 8 / 32 / 128 each enable multiple modes simultaneously. A server admin enabling "just 4on4" via bit 8 also unwittingly opens wipeout + ca.
- No example.
- See-also missing -- doesn't point at sibling `k_free_mode` access cvar or the individual mode entities.
- Long inline list of bits would read better as a column table.

### Proposed draft

```
Bitmask controlling which game modes are selectable on this server via
the 'usermode' command. Evaluated once at map load; mode switches whose
bit is not set are silently discarded.

Bit -> mode mapping (some bits enable multiple modes that share the
underlying category):

   1 = 1on1
   2 = 2on2
   4 = 3on3
   8 = 4on4 + wipeout + ca              (all three share UM_4ON4)
  16 = 10on10
  32 = ffa + tot                        (both share UM_FFA)
  64 = ctf
 128 = hoonymode + blitz2v2 + blitz4v4  (all three share UM_1ON1HM)
 256 = 2on2on2
 512 = 3on3on3
1024 = 4on4on4
2048 = XonX

Add bits together for multiple categories. FFA is force-enabled on
matchless servers regardless of this setting.

Default: 0.
Set by: server config (takes effect at next map load).
Example: k_allowed_free_modes 127  (1on1 + 2on2 + 3on3 + 4on4/wipeout/ca
                                    + 10on10 + ffa + ctf -- standard
                                    competitive)
         k_allowed_free_modes 8    (4on4-family only -- enables 4on4,
                                    wipeout, AND ca)

See also: k_free_mode (access level for issuing mode-switch commands),
          individual modes (1on1, 2on2, ffa, ctf, ca, wipeout, etc. --
          each gated by this bitmask).
```

### Notes (for the apply-pass author)

- Multi-mode-per-bit fact verified at `commands.c:4535-4553` -- 17 entries, only 12 distinct UM_* flags.
- The matchless-FFA force-enable is a `world.c:1109` post-read OR-in: `k_allowed_free_modes |= UM_FFA;`.
- Shape 4 entity: gating cvar for the `usermode` / `xonx` / mode-name commands. No paired toggle command in KTX.

---

## Open findings (not yet drafted)

- **`handicap`** (KTX command, catalog line 6954) -- current description says "below 100 reduce the damage you deal as the attacker" but does NOT mention that above 100 BOOSTS damage (range is 50-150 per `g_utils.c:1660`). Source: `combat.c:626` `damage *= 0.01f * hdp`. Needs: state the full 50-150 range explicitly, note both clamping (40 -> 50) and the above-100 boost case, add example showing `handicap 50` -> "50% damage" framing.

- **Game-mode entities lack back-link to `k_allowed_free_modes`** (bidirectional cross-link gap). Each mode entity (`1on1`, `2on2`, `3on3`, `4on4`, `10on10`, `ffa`, `ctf`, `ca`, `wipeout`, `hoonymode`, `blitz2v2`, `blitz4v4`, `2on2on2`, `3on3on3`, `4on4on4`, `XonX`, `tot`) should have `See also: k_allowed_free_modes (gates whether this mode is selectable on a given server)` added. This is per-mode fanout work -- 17 entries to touch. Belongs in the catalog-wide template-application arc rather than this session.

- **L1 mechanics `game_mode` catalog is sparse** (extraction gap). `search_mechanics(kind=game_mode, gameplay_source=ktx)` returns ONLY `hoonymode` and `yawnmode` -- because those are the only modes with dedicated `k_<name>mode` cvars. The other 15+ modes (1on1, ctf, ca, wipeout, ffa, etc.) exist as L1 COMMAND entities but not as `game_mode` mechanics. Separate from the bidirectional-link fanout above; this is an extraction-pipeline question (should the game_mode mechanics catalog be expanded to include all `um_list[]` entries? Currently the answer is "no by accident"). Defer to a future extractor-improvement arc.

- **`multi`** (KTX command, catalog line 13240) -- current description says "edit or print your multi recipient set" with example `multi = name1 name2 = replace the set`. Two issues: (a) the "editor" framing is wrong (there is no UI, just state-setter commands with `+`/`-`/`=`/`?`/`??` operators against the `*mu` bitmask -- see `g_cmd.c:828-1041`); (b) operator reports `multi = name1 name2` does NOT work in practice despite source at `g_cmd.c:906` accepting `=` as MMOP_S (replace). Likely engine-side tokenizer ate the `=`. Needs: drop the editor framing, lead with `multi + a b` (verified working), park the `=` claim until retested in-game during the apply pass. Operator set + path verified once `mmode multi` is also corrected to mean "route to existing set" (drafted in this session's mmode card).

---

## k_rocketarena (KTX cvar, gameplay -- Shape 1 with mode-precondition)

- **Status**: drafted
- **Source**: `src/world.c:979` (registration with inline comment `// rocket arena`); `src/arena.c:130-132` (`isRA()` definition: `return (isDuel() && cvar("k_rocketarena"))`; preceded by comment `// ra is just modificator of duel`); `src/commands.c:8842-8870` (`ToggleArena` -- paired `arena` command handler); arena.c entire subsystem (winner-stays queue logic at arena.c:194, 237, 544, 775, etc.)
- **Catalog line**: 12289

### Current description

> Enables Rocket Arena mode within a duel server. Instead of a single ongoing 1v1, a winner-stays queue is used: the round winner stays in the arena and the next challenger from the spectator queue comes in to fight. Has no effect outside duel mode.
>
> 0 = standard duel.
> 1 = Rocket Arena (winner-stays queue).
>
> Default: 0.
> Set by: server config.

### Gap

- "Within a duel server" understates the mechanism -- RA is a **modifier** on duel mode (source-verified by `arena.c:131` comment "ra is just modificator of duel"), not a sub-mode of a server type.
- No mention of the paired `arena` toggle command.
- No example showing the activation flow (1on1 -> arena, or k_rocketarena 1 in server.cfg).
- See-also missing the paired command + the prerequisite 1on1 mode.

### Proposed draft

```
Modifier cvar that turns the active duel into Rocket Arena mode --
winner-stays queue where the round winner stays in the arena and the
next challenger comes in from the spectator queue to fight. Not a
standalone usermode (won't appear in k_allowed_free_modes); requires
duel mode to already be active. No effect outside duel mode.

0 = standard duel (1v1).
1 = Rocket Arena (winner-stays queue).

Default: 0.
Set by: server config or 'arena' admin command in-game (loads
        configs/usermodes/1on1/ra/default.cfg when enabling).
Example: 1on1                  (first activate duel mode)
         arena                 (toggle RA via the paired command)
         k_rocketarena 1       (or set the cvar directly in server.cfg)

See also: arena (the in-game toggle command), 1on1 (the prerequisite
          mode), k_allowed_free_modes (does NOT include RA -- RA is a
          modifier, not a mode).
```

### Notes (for the apply-pass author)

- Naming offset: cvar is `k_rocketarena` but the paired toggle command is `arena` (community-style shorthand). Worth knowing for cross-linking.
- Shape 1 (cvar + paired toggle command) but with a mode-precondition (duel required). If this pattern repeats with other modifiers, consider formalizing as Shape 1c in [[reference-ktx-cvar-command-pairing]].
- The "1on1" reference is valid -- 1on1 exists as an L1 command entity (catalog line 8851), distinct from the sparse `game_mode` mechanics catalog.

---

## arena (KTX command, gameplay -- Shape 1 paired toggle for k_rocketarena)

- **Status**: drafted
- **Source**: `src/commands.c:971` (registration `CF_PLAYER | CF_SPC_ADMIN`); `src/commands.c:8842-8900` (`ToggleArena` -- rules-change-allowed gate + isDuel precondition + `cvar_toggle_msg` + auto-load of RA config when enabling)
- **Catalog line**: 12412

### Current description

> Toggles Rocket Arena mode on or off and announces the change server-wide. Rocket Arena is a duel modifier: the server must already be in duel mode for this command to work, and rule changes must be permitted at the time it is issued.
>
> When enabling: loads the Rocket Arena default config and the per-map RA config if one exists, and sets safe spawn mode on.
>
> Set by: admin command 'arena' in-game.

### Gap

- "Rule changes must be permitted at the time it is issued" buries the match-state constraint -- should be in Set-by as `(pre-match only)` per the standardized convention.
- The exact in-game refusal message ("Set 1 on 1 mode first") not surfaced.
- See-also missing the paired cvar + prerequisite mode.

### Proposed draft

```
Toggles Rocket Arena mode (k_rocketarena) on or off and announces the
change. Rocket Arena is a modifier on duel mode -- requires the server
to be in 1on1 (duel) mode first; otherwise prints "Set 1 on 1 mode
first" and refuses.

When enabling: also loads configs/usermodes/1on1/ra/default.cfg + any
per-map RA config, and sets safe spawn mode on.

Set by: any in-game player or admin spectator (pre-match only).
Example: 1on1            (first activate duel)
         arena           (then toggle RA on or off)

See also: k_rocketarena (the cvar this toggles), 1on1 (the
          prerequisite mode).
```

### Notes (for the apply-pass author)

- Match-state constraint moved from prose tail to Set-by parenthetical: `(pre-match only)` -- the source gate is `is_rules_change_allowed()` which checks match state.
- The "Set 1 on 1 mode first" refusal message quoted verbatim for recognizability.
- Set-by uses "any in-game player or admin spectator" matching the registration flag `CF_PLAYER | CF_SPC_ADMIN` (consistent with discharge / droppack / fallbunny).

---

## tot (KTX command, Game-mode presets -- Shape 1d preset half)

- **Status**: drafted
- **Source**: `src/commands.c:825` (registration `CF_PLAYER | CF_SPC_ADMIN | CF_PARAMS`); `src/commands.c:586` (`CD_TOT "toggle Tribe of Tjernobyl mode"`); `src/commands.c:4511-4533` (`tot_um_init[]` cvar bundle); `src/commands.c:4553` (`um_list[]` entry); `src/commands.c:4625+` (`UserMode` dispatcher); `src/commands.c:9558` (`tot_mode_enabled()`)
- **Catalog line**: 10897

### Current description

> Applies the Tribe of Tjernobyl (ToT) game-mode preset: a fireball-mode free-for-all variant based on DMM4. Enables the fireball system with an 8x quad-fireball multiplier, disables invincibility-on-respawn, disallows certain weapons, caps the server at 9 players, no teams, no overtime, and enables powerups. The shared common reset runs first.
>
> Default: not active (preset command, applies on invocation).
> Set by: server-side preset command 'tot' (resets all mode settings).

### Gap

- Comma-chain prose ("enables X, disables Y, disallows Z, caps W, no V, no U, and enables T") is exactly the "reads kind of weird" pattern operator flagged.
- "fireball-mode free-for-all variant" presumes the reader knows what fireball-mode is.
- No mention of the sibling `totmode` (in-mode toggle) or `k_tot_mode` (state cvar) -- triad relationship not surfaced.
- "The shared common reset runs first" is implementation noise that violates MVI.
- Match-state constraint absent ("pre-match only" -- preset commands gate on `is_rules_change_allowed()`).

### Proposed draft (drafted under emerging v2 shape; recast at catalog-wide apply pass)

```
Applies the Tribe of Tjernobyl (ToT) preset -- a dmm4-based
free-for-all with fireball weapons.

Effect: bundles the dmm4 base ruleset, sets k_tot_mode 1 (the
runtime flag), and applies several rule tweaks:
  deathmatch 4           dmm4 base ruleset
  k_tot_mode 1           ToT runtime flag on
  k_fb_enabled 1         fireball weapon enabled
  k_fb_quad_multiplier 8 fireball 8x boost under quad
  maxclients 9           server capped at 9 players
  teamplay 0             no teams (FFA)
  timelimit 5            5-minute match
  k_overtime 0           no overtime
  k_pow 1                powerups on
  k_spw 1                safe-spawns on
  dmm4_invinc_time -1    no spawn invincibility
  k_disallow_weapons 80  some weapons disallowed

Prerequisites: k_allowed_free_modes must permit this mode to be
selectable on this server.

Permission: any player or admin spectator.
Match-state: pre-match only.
Example: tot                  (apply the full preset)
         totmode              (later: toggle just ToT off, keep
                                the rest of the bundle)

See also: totmode (in-mode toggle), k_tot_mode (state cvar),
          1on1 / ffa / ctf / ca / wipeout / XonX (sibling presets),
          k_allowed_free_modes (gates whether 'tot' is selectable).
```

### Notes (for the apply-pass author)

- Shape 1d preset half (the `tot` command is the preset that bundles dmm4 + sets k_tot_mode + applies rule tweaks).
- "Activates" was the original section name; renamed to "Effect" during this session's universal-shape lock. v1.5 drafts (this card was drafted as the rename happened) may use "Activates"; recast to "Effect" at apply.
- Permission + Match-state are split lines in v2 (replaces v1 merged "Set by: ... (pre-match only)").
- The Effect bundle list is borrowed-style from the `tpmsg` labeled-block precedent from session 1.

---

## totmode (KTX command, Mode-scoped knobs -- Shape 1d paired toggle)

- **Status**: drafted
- **Source**: `src/commands.c:958` (registration `CF_PLAYER | CF_SPC_ADMIN`); `src/commands.c:586` (`CD_TOT` -- shared with `tot`); `src/commands.c:7911-7940` (`ToggleToT` handler -- match-state gate + dmm4 requirement + midair/instagib mutex + `cvar_toggle_msg`)
- **Catalog line**: 10925

### Current description

> Toggles Tribe of Tjernobyl (ToT) mode on or off and broadcasts the new state. Only takes effect when a rules change is currently allowed.
>
> Enabling requires dmm4; the attempt is refused otherwise. Turning ToT on also disables midair mode and instagib if either is active.
>
> Default: n/a (command).
> Set by: admin command 'totmode' in-game.

### Gap

- Match-state constraint buried as prose ("Only takes effect when a rules change is currently allowed") -- should be the Match-state line, not prose.
- "Enabling requires dmm4; the attempt is refused otherwise" splits across paragraphs; the verbatim refusal message ("ToT mode requires dmm4") isn't surfaced.
- Mutual-exclusion with midair/instagib is correct but flat-packed prose.
- No relationship surfaced to sibling `tot` (preset) or `k_tot_mode` (cvar) -- reader has no map of the triad.
- No example.

### Proposed draft

```
Toggles Tribe of Tjernobyl (ToT) mode on or off and broadcasts
the change.

Effect: flips k_tot_mode between 0 and 1. Does NOT touch the
surrounding rules (timelimit, maxclients, fireballs) -- those
stay whatever they were. Disables k_midair and k_instagib if
either was active (mutually exclusive modifiers).

Prerequisites: dmm4 must be the active base mode -- prints
"ToT mode requires dmm4" and refuses otherwise.

Permission: any player or admin spectator.
Match-state: pre-match only.
Example: totmode              (toggle ToT on)
         totmode              (toggle off)

See also: tot (the preset that bundles ToT with other tweaks),
          k_tot_mode (the cvar this toggles),
          k_midair / k_instagib (mutually-exclusive modifiers).
```

### Notes (for the apply-pass author)

- Shape 1d paired toggle half. Cvar lives on the k_tot_mode card; this card has no value enum.
- The "surgical" framing ("Does NOT touch the surrounding rules") is the load-bearing distinction from the preset `tot`. Worth keeping when condensing.

---

## k_tot_mode (KTX cvar, Mode-scoped knobs -- Shape 1d state cvar)

- **Status**: drafted
- **Source**: `src/world.c:1084` (`RegisterCvar("k_tot_mode")`); `src/commands.c:9558` (`tot_mode_enabled()` -- canonical read); read-sites: `src/combat.c:545` (quad multiplier swap), `src/bot_*.c` (bot weapon/item rules), `src/items.c:2183, 2446` (item pickup branching), `src/client.c:2227, 4139, 4165` (death-type variations)
- **Catalog line**: 12350

### Current description

> Toggle for Tribe of Tjernobyl (ToT) mode. Requires deathmatch mode 4. When enabled, alters dmm4 rules: replaces the standard octa (8x) quad-damage multiplier with a configurable bot quad multiplier, and switches item, health-cap, and bot-weapon rules to ToT variants. Mutually exclusive with midair and instagib (enabling tot disables them).

### Gap

- "Toggle for..." is awkward framing -- this is a state cvar, not a toggle (the toggle is `totmode`).
- The implementation-level detail ("replaces the standard octa (8x) quad-damage multiplier", "switches item, health-cap, and bot-weapon rules to ToT variants") violates action-level discipline -- belongs in the qw-game-modes concept note.
- No default value listed.
- No example for setting in server.cfg.
- Mutual-exclusion fact is correct but belongs on the `totmode` command card (that's where the side-effect fires), not the cvar.

### Proposed draft

```
Whether Tribe of Tjernobyl (ToT) mode is currently active.

Values:
  0 = inactive (plain dmm4 behavior)
  1 = active (ToT-specific quad / bot / item rules apply)

Prerequisites: deathmatch 4 -- without dmm4 as the base mode,
setting this cvar has no behavioral effect.

Default: 0.
Permission: server config, or in-game via 'tot' / 'totmode'.
Example: k_tot_mode 1         (in server.cfg: ToT on at boot;
                                assumes deathmatch 4 also set)

See also: tot (the preset), totmode (the toggle command).
```

### Notes (for the apply-pass author)

- Shape 1d state cvar. Value enum (0/1) lives here, not on the command cards.
- The "ToT-specific quad / bot / item rules apply" phrasing summarizes the mechanism without listing the specific branches. Detail lives in the planned qw-game-modes L3 concept note.
- Mutual-exclusion side-effect (disables k_midair / k_instagib) is on the `totmode` card -- it's a side-effect of the toggle command, not a behavior of the cvar itself.
- Permission line says "server config, or in-game via 'tot' / 'totmode'" -- splits responsibility correctly.

---

## elect (KTX command, Voting -- Shape 7 vote-starter composed with Shape 4 × 2 gates)

- **Status**: drafted
- **Source**: `src/commands.c:800` (registration `CF_BOTH | CF_MATCHLESS`); `src/commands.c:429` (`CD_ELECT "toggle admin election"`); `src/admin.c:450-537` (`VoteAdmin` handler -- the actual elect logic, 7 refusal paths + broadcast + 60-second election guard)
- **Catalog line**: 17923

### Current description

> Starts an admin-election vote: all other connected players are prompted to type "yes" to approve, and the requester gains admin rights if enough approve. Running it again while your own election is pending aborts that election instead. Refused if you are already an admin, if another election is already in progress, if admin elections are disabled (k_allowvoteadmin = 0), while a cooldown timer is active, or for a spectator during a live match.

### Gap

- Refusal-condition prose chain is dense (5 conditions listed inline); reader has to mentally parse comma-separated list to know all the gates.
- "Refused if you are already an admin" / "mid-way through entering an admin code" -- both are *logically implied by user intent* (you wouldn't try to elect if you're already admin) -- prerequisite noise.
- `k_admins` master toggle (refusal: "NO admins on this server!") is missing from the refusal list entirely.
- No mention of `k_vp_admin` (the threshold cvar that determines pass-count).
- No example showing the cast-and-await flow.
- No Permission / Match-state split (v1 shape).

### Proposed draft (v2)

```
Starts an admin-election vote on the server. All other connected
players are prompted to type 'yes' to approve. If enough approve
(per the k_vp_admin threshold), the caller is promoted to admin.

Effect:
  - Broadcasts "<caller> has requested admin rights!"
  - Prompts every other connected player to type 'yes' in console
  - 60-second election window; if threshold not met by timeout,
    election expires silently
  - On success: caller becomes admin (gains admin command access)
  - Re-running 'elect' while your own election is pending aborts
    it (subsequent-invocation toggle, not a refusal)

Prerequisites:
  - k_admins must be enabled (otherwise: "NO admins on this server!")
  - k_allowvoteadmin must be enabled (otherwise: "Admin election is
    not allowed on this server")
  - No other election currently in progress (check via whovote)
  - Per-player election cooldown must have expired
  - You are not a spectator during a live match

Permission: any player or spectator.
Match-state: any time (with spectator-during-match exception above).
Example: elect                    (start the election)
         <other players type 'yes' in console>
         (if k_vp_admin threshold reached -> you become admin)
         elect                    (re-run to abort your own pending
                                   election)

See also: k_vp_admin (threshold cvar), k_allowvoteadmin (enable-gate),
          k_admins (admin-system master toggle), yes / no (vote-casting
          commands), k_admincode (alternate code-based admin path).
```

### Notes (for the apply-pass author)

- **Shape composition**: this entity has THREE facets simultaneously -- Shape 7 (vote-threshold pair with `k_vp_admin`), Shape 4 (gated by `k_allowvoteadmin`), Shape 4 (gated by `k_admins`). All three relationships show up in See-also; the two gate-prereqs show up in Prerequisites. First card to surface shape-composition explicitly -- see [[reference-ktx-cvar-command-pairing]] "Shapes are facets, not exclusive buckets".
- **Prerequisites trim**: original 7 conditions, dropped 2 ("not already admin", "not mid-code-entry") as logically-implied-by-user-intent per the `feedback-l1-description-template` rule articulated this session.
- **Subsequent-invocation toggle convention**: the "re-running aborts your election" behavior is parked as a labeled bullet in Effect -- not a refusal, not the primary effect.
- **Audit trail discipline**: the dropped self-state refusals ("not already admin", "not mid-code-entry") still belong in `description_reasoning` for LLM completeness. L1 description carries only the load-bearing subset.
- **See-also at cap**: 5 items, intentionally maxed. The full admin-and-user-management story (other vote types, vote_X commands, the k_admins / k_admincode / VIP_ADMIN auth paths) lives in the planned `admin-and-user-management` L3 concept note.

---

## k_ctf_hookstyle (KTX cvar, Mode-scoped knobs -- Shape 7b state cvar)

- **Status**: drafted
- **Source**: `src/world.c:954` (registration bare); `src/grapple.c:12-16` (speed constants); `src/grapple.c:62-67, 212-229, 402-449, 463-464` (per-style branching); shipped default `resources/example-configs/ktx/ktx.cfg:65` (1)
- **Catalog line**: 11264

### Current description (already in v2-ish shape -- mostly fine)

> Selects the grappling-hook physics style for CTF.
>
> 0 = default: throw speed 1050, no special cancel.
> 1 = smooth: accelerating pull up to speed 800, ~250ms cancel delay, faster refire cooldown.
> 2 = fast: fixed pull speed 800, ~80ms cancel delay.
> 3 = classic: throw speed 800 (original PureCTF), no automatic cancel on release.
> 4 = fastest: throw speed 1200, hook cancelled immediately on release.
>
> Default: 1 (per shipped ktx.cfg).
> Set by: server config.

### Gap

- Missing relationship to the 4 vote commands (`hook_smooth` / `hook_fast` / `hook_classic` / `hook_crhook`) that set this cvar via majority vote.
- Missing Prerequisites: has no effect outside CTF mode.
- Missing relationship to `k_vp_hookstyle` (the vote threshold).
- "Set by: server config" understates -- can also be set via the vote commands in-game.
- No example.

### Proposed draft (v2)

```
Selects the grappling-hook physics style for CTF.

Values:
  0 = default (throw speed 1050, no special cancel)
  1 = smooth (accelerating pull, ~250ms cancel delay,
              halved refire cooldown)
  2 = fast (fixed pull speed 800, ~80ms cancel delay)
  3 = classic (original PureCTF, no automatic cancel
              on release)
  4 = fastest (throw speed 1200, immediate cancel)

Prerequisites: CTF mode -- has no effect outside CTF.

Default: 0 (registered bare); 1 in shipped ktx.cfg.
Permission: server config, or in-game via the hook_X vote commands.
Example: k_ctf_hookstyle 1     (in server.cfg: smooth-hook default)

See also: k_vp_hookstyle (vote threshold), hook_smooth / hook_fast /
          hook_classic / hook_crhook (vote commands for values 1-4),
          k_ctf_hook (separate on/off toggle for the hook system).
```

### Notes (for the apply-pass author)

- **Shape 7b state cvar**: the entity being voted on by 4 sibling vote commands. Value 0 has no vote command (only values 1-4 are votable).
- **Value descriptions kept**: throw speeds / cancel timings are borderline impl-level but they ARE the user-facing tuning knobs for hook play. Hook-aware CTF players need this detail. Deeper "why" (when to use which style) goes to L3.
- **Default mismatch**: registration is bare (0) but shipped ktx.cfg sets 1. The default-in-practice is 1.

---

## k_vp_hookstyle (KTX cvar, Voting -- Shape 7b threshold cvar)

- **Status**: drafted
- **Source**: `src/world.c:834` (registration bare); `src/vote.c:318` (read site); shipped default `resources/example-configs/ktx/ktx.cfg:106` (51)
- **Catalog line**: (in Voting section ~17400)

### Current description

> Percentage of eligible voters required to pass a grappling-hook-style change vote in ctf (smooth / fast / classic). The required vote count is calculated as ceil(percent/100 * eligible players).

### Gap

- Doesn't mention crhook (the 4th style).
- No min-vote rule (the universal "min 2 votes" applies here too).
- No clamp behavior (51-100 clamp, like other k_vp_* cvars).
- No Default.
- No See-also to the vote commands or the state cvar.

### Proposed draft (v2)

```
Percentage of eligible voters required to pass a CTF grappling-hook
style change vote.

Values: 51-100 (below 51 clamped to 51). Required vote count is
ceil(percent/100 * eligible players), minimum 2 votes always.

Default: 0 (registered bare); 51 in shipped ktx.cfg.
Permission: server config only.

See also: k_ctf_hookstyle (the state cvar this gates voting on),
          hook_smooth / hook_fast / hook_classic / hook_crhook
          (the 4 vote commands governed by this threshold).
```

### Notes (for the apply-pass author)

- **Shape 7b threshold cvar**: standard `k_vp_*` family member. Same clamp + min-2-votes rule as other vote-threshold cvars.
- This card likely template-applies to the rest of the `k_vp_*` family (~13 cards) with minor variations -- good candidate for subagent fan-out during the catalog-wide arc.

---

## hook_smooth (KTX command, Voting -- Shape 7b canonical vote command for the hook family)

- **Status**: drafted
- **Source**: `src/commands.c:917` (registration `CF_PLAYER | CF_MATCHLESS`); `src/commands.c:533` (`CD_HOOKSMOOTH "switch Hook style settings: Smooth Hook (CTF)"`); `src/vote.c:1194-1235` (`hooksmooth` handler)
- **Catalog line**: 18034

### Current description (already concise -- mostly content-correct)

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to smooth. When enough players vote (or an admin vetoes), the server announces and applies the change. Only available in CTF mode; cannot be issued while a match is in progress.

### Gap

- CTF prereq + match-state buried in tail prose.
- No mention of the threshold cvar `k_vp_hookstyle`.
- No mention of the sibling vote commands (hook_fast / hook_classic / hook_crhook).
- No mention that hook votes are CONTINUOUS (each hook command is its own vote channel; multiple can be active simultaneously).
- No example.

### Proposed draft (v2; canonical card for the hook vote family)

```
Casts (or withdraws) your vote to switch the CTF grappling-hook
style to smooth (k_ctf_hookstyle 1). When the k_vp_hookstyle
threshold is reached (or an admin votes alone as veto), the
server announces and applies the change. Each of the 4 hook_X
commands is its own vote channel -- voting smooth and fast at
the same time is allowed; whichever reaches threshold first wins.

Effect:
  - Toggles your "smooth hook" vote
  - Broadcasts "<player> votes for smooth hook!" with running tally
  - On threshold pass OR admin veto: sets k_ctf_hookstyle = 1
    and broadcasts the change
  - Re-running withdraws your vote (subsequent-invocation toggle)

Prerequisites:
  - CTF mode must be active (otherwise: "hook style can only be
    set in CTF mode")
  - Match must not be in progress (otherwise: "hookstyle can not
    be changed while match is in progress")

Permission: any player.
Match-state: pre-match / intermission only.
Example: hook_smooth         (cast vote)
         hook_smooth         (re-run to withdraw)

See also: hook_fast / hook_classic / hook_crhook (siblings voting
          for values 2 / 3 / 4), k_vp_hookstyle (threshold cvar),
          k_ctf_hookstyle (the state being voted on).
```

### Notes (for the apply-pass author)

- **Canonical card for the hook vote family**: full description here; the other 3 hook commands point at this card via See-also (the ksound1 + ksound2..6 precedent from session 1).
- **Shape 7b + Shape 1c + command-per-value fan-out**: this is the most-composed card so far. Three facets layered on one entity.
- **Continuous-toggle vs election**: hook votes are continuous (no time-box, no auto-end). Different from `elect` (Shape 7a, time-boxed). Worth surfacing in the prose because reader expectation from `elect` doesn't transfer.

---

## hook_fast / hook_classic / hook_crhook (KTX commands, Voting -- Shape 7b reference cards)

- **Status**: drafted
- **Source**: `src/commands.c:918-920` (registrations); `src/vote.c:1237-1367` (handlers); CD strings at `src/commands.c:534-536`
- **Catalog lines**: 18006 (hook_fast), 17950 (hook_classic), 17978 (hook_crhook)

### Current descriptions

All three are near-identical to hook_smooth, just substituting the style name:

> CTF vote command: casts or withdraws your vote to switch the grappling-hook style to <fast|classic|crhook>. ...

### Gap

- 95% duplication of hook_smooth content -- maintenance burden.
- Each card stands alone with no cross-link to siblings or the canonical card.

### Proposed draft (v2; reference cards pointing at hook_smooth)

For each of hook_fast / hook_classic / hook_crhook (substitute style name + cvar value):

```
Casts (or withdraws) your vote to switch the CTF grappling-hook
style to fast (k_ctf_hookstyle 2). See hook_smooth for the full
vote-channel behavior -- gates, broadcast, threshold, admin veto.
This command sets k_ctf_hookstyle = 2 on pass instead of 1.

See also: hook_smooth (canonical card), k_vp_hookstyle, k_ctf_hookstyle.
```

(`hook_classic` -> value 3 / classic style; `hook_crhook` -> value 4 / crhook style.)

### Notes (for the apply-pass author)

- **Reference-card pattern**: ksound2..ksound6 precedent from session 1 generalizes -- when N near-identical sibling entities exist, ONE carries the canonical description; the rest are short pointer cards. The catalog HTML keeps separate cards (for direct `lookup_entity` matches) but the content is centralized.
- **Stress-test win**: 4 cards collapse to ~1.5 cards' worth of authoring. Validates the canonical-card pattern as a general L1 discipline (not just ksound-specific).
- **Apply-pass discipline**: if hook_smooth gets a future correction, the reference cards stay valid because they only carry the value-delta. Single point of truth.

---

## breakondeath (KTX command, Frogbot -- Shape 8 subcommand-of-parent-dispatcher)

- **Status**: drafted
- **Source**: `src/bot_commands.c:2326` (`std_commands[]` table entry); `src/bot_commands.c:2227-2228` (`FrogbotsSetBreakOnDeath` handler); `src/world.c:1065` (`RegisterCvarEx(FB_CVAR_BREAK_ON_DEATH, "1")`); `src/player.c:1145` + `src/match.c:1789` (TOT-mode usage)
- **Catalog line**: (Frogbot section, ~3500)
- **Entity name**: `breakondeath:frogbot:std` (namespaced ID; user invokes as `botcmd breakondeath`)

### Current description (already pretty good)

> Frogbot standard command. Toggles whether a break is automatically issued on your death during a bot practice session. Applies to human players; bots are unaffected.
>
> Set by: any player in a bot practice session ('botcmd breakondeath' in-game).

### Gap

- Doesn't surface the underlying cvar (`k_fb_breakondeath`).
- Doesn't link to TOT mode where this is commonly used.
- Doesn't mention the parent `botcmd` dispatcher or its admin gate.

### Proposed draft (v2)

```
Toggles whether your death automatically issues a break (ending
the current bot-practice round). Applies to human-player deaths
only -- bot deaths don't trigger.

Effect:
  - Flips k_fb_breakondeath between 0 and 1
  - On TOT mode, this controls whether the practice round ends
    when you die
  - Prints "break on death changed to on/off" to the caller

Prerequisites:
  - Bots must be enabled on the server
  - k_fb_adminonly gating applies (admin or real-admin required
    depending on the cvar's value)

Permission: any player (subject to k_fb_adminonly).
Example: botcmd breakondeath        (toggle on or off)

See also: botcmd (parent dispatcher), k_fb_breakondeath (the
          underlying state cvar), tot / k_tot_mode (the mode
          where this is commonly used).
```

### Notes (for the apply-pass author)

- **Shape 8 instance**: subcommand of `botcmd` parent dispatcher. Entity registered with namespaced ID; user-facing invocation is `botcmd breakondeath`.
- **TOT-mode linkage in Effect**: surfaces the cross-mode connection without inlining the operator-provided community lore (e1m2-on / dm4-off convention belongs in qw-game-modes concept note, not L1).
- **k_fb_adminonly gate** applies uniformly across all `botcmd` subcommands -- worth noting on each card but not over-elaborating (the gate cvar's own card carries the value-by-value behavior).

---

## fill (KTX command, Frogbot -- Shape 8 + Shape 4 admin-gate composition)

- **Status**: drafted
- **Source**: `src/bot_commands.c:2319` (`std_commands[]` entry); `FrogbotsFillServer` handler in same file
- **Catalog line**: (Frogbot section)
- **Entity name**: `fill:frogbot:std` (user invokes as `botcmd fill [skill]`)

### Current description

> Invoked as `botcmd fill [skill]`. Adds frogbots to fill empty player slots up to `maxclients`, adding at most 8 bots per invocation; run again to add more. An optional numeric argument sets the skill level for the bots added and stores it as the current frogbot skill; without it the current stored skill level is used. Subject to the server's bot-admin gate (`k_fb_adminonly`): may require admin or real-admin depending on the gate setting.

### Gap

- Already pretty detailed -- the gap is mostly structure (prose chain vs scannable sections) and cross-refs (no See-also to sibling subcommands).

### Proposed draft (v2)

```
Adds frogbots to fill empty player slots up to maxclients. Adds
at most 8 bots per invocation -- run again to add more.

Effect:
  - Adds bots up to the maxclients limit, capped at 8 per call
  - Optional [skill] arg sets the skill level for the added bots
    AND stores it as the current frogbot skill (used by subsequent
    addbot / fill invocations without a skill arg)

Prerequisites:
  - Bots must be enabled on the server
  - k_fb_adminonly gating applies (admin or real-admin required
    depending on setting)

Permission: any player (subject to k_fb_adminonly).
Example: botcmd fill                (fill using stored skill)
         botcmd fill 12             (fill with skill 12; also
                                     stores 12 as the new default)

See also: botcmd (parent dispatcher), addbot (one bot at a time),
          removebot / removeall (cleanup), botcmd skill (set skill
          without adding bots).
```

### Notes (for the apply-pass author)

- **Shape 8 + Shape 4 composition**: subcommand AND admin-gated. The gate is uniform across all subcommands so this isn't unique to `fill`.
- **Skill-arg side-effect surfacing**: "stores it as the current frogbot skill" was the hidden surprise in the original prose -- v2 pulls it out as a labeled Effect bullet because it changes the user's action plan (they may not realize subsequent commands inherit this skill).
- Workflow siblings in See-also (addbot / removebot / removeall / `botcmd skill`) make the bot-management surface discoverable.

---

## addmarker:frogbot:editor (KTX command, Frogbot -- Shape 8 + tooling-mode prerequisite)

- **Status**: drafted
- **Source**: `src/bot_commands.c:2334` (`editor_commands[]` entry); `src/bot_commands.c:1176` (`FrogbotAddMarker` handler); `src/bot_commands.c:2386-2389` (the editor-mode-toggles-which-table dispatcher logic in `FrogbotsCommand`)
- **Catalog line**: (Frogbot section)
- **Entity name**: `addmarker:frogbot:editor` (user invokes as `botcmd addmarker`)

### Current description

> Frogbot editor command. Places a new routing marker at the editing player's current position. Refused if within the minimum distance of an existing marker.

### Gap

- Doesn't show the workflow context (this is part of a marker-then-path-then-save flow).
- Doesn't mention the editor-mode prerequisite is *hide-when-inactive*, not refuse-with-message.
- No sibling cross-refs (the whole editor subcommand family).

### Proposed draft (v2)

```
Places a new bot-routing waypoint marker at your current position.
Used to build bot navigation maps in editor mode.

Effect:
  - Spawns a new routing marker at the caller's origin
  - Marker is flagged as manual (removable via removemarker)
  - Becomes the "saved marker" for subsequent addpath / anglehint
    commands
  - Refused if within minimum distance of an existing marker
    (prevents duplicate markers)

Prerequisites:
  - Frogbot editor mode must be active -- otherwise the parent
    botcmd dispatcher hides this subcommand entirely (not just
    refused with a message; literally not in the menu)
  - k_fb_adminonly gating applies

Permission: any player (subject to k_fb_adminonly).
Example: botcmd addmarker           (drop a marker here)
         botcmd addpath             (link it to the nearest
                                     existing marker)
         botcmd save                (write the .bot routing file)

See also: botcmd (parent dispatcher), removemarker / move (manage
          existing markers), addpath / removepath (link markers),
          save (write to .bot file), savemarker (set saved-marker
          pointer without adding).
```

### Notes (for the apply-pass author)

- **Shape 8 + tooling-mode prerequisite**: NEW kind of prereq -- "tooling-mode" (editor mode) is distinct from game-mode (CTF/dmm4) and match-state (pre-match/mid-match). Worth noting in the shape catalog as a third prerequisite category.
- **Hide-when-inactive surfacing pattern**: editor subcommands literally don't appear in the `botcmd` help menu unless editor mode is active. This is different from refuse-with-message (where the subcommand exists, you can invoke it, but it refuses). Worth surfacing as a distinct pattern.
- **Workflow context in Example**: the drop-marker → addpath → save flow is the load-bearing context. A user reading the 1-line original would never discover the workflow.

---

## Follow-up work surfaced

Items flagged during this review walk that go beyond per-card L1 drafts. Capture-only; pick when ready.

### admin-and-user-management (L3, cross-layer)

Surfaced from: k_admincode + ban-family card reviews (2026-05-22). Scope widened from the original "admin-authentication" framing once the ban-family un-hedge made the cross-layer story bigger than just auth.

Scope: how a player becomes an admin on a KTX server, AND how admins moderate users (ban / unban / whitelist). Genuine cross-layer concept.

**Auth paths**:

- **mvdsv (server)**: rcon, `rcon_password`.
- **KTX (mod)**: `k_admins` master toggle, `k_admincode` passcode, `AF_REAL_ADMIN` flag, election path (`etAdmin` via `k_vp_admin`), VIP-admin path (`VIP_ADMIN` flag).
- **ezQuake (client)**: routing `/admin` and `rcon` from console.

**User moderation** (added 2026-05-22):

- **KTX (mod)**: `ban`, `banip`, `banrem` -- redirected commands (KTX bounces, mvdsv executes).
- **mvdsv (server)**: `filterban` cvar (ban-list enforcement toggle), `addip` / `removeip` / `writeip` commands (the actual ban primitives KTX delegates to).
- Likely to grow as the catalog walk continues: `kick`, vote-mute, VIP whitelist, etc.

Reader questions this would answer:

- "I want to be admin on this server -- which path applies (rcon, k_admincode, VIP-listed, vote)?"
- "How do I ban / unban a player -- which command, what args, what permissions?"
- "What's the difference between KTX's `ban`/`banip`/`banrem` and mvdsv's `addip`/`removeip`/`filterban`?"

L3 threshold: easily passes (>1 setting, >1 component, multi-cvar choreography across server engine and mod).

### Catalog-wide template application (arc-shaped)

Surfaced from: incremental category walks (Player communication, Administration & Access).

Idea: once enough KTX-catalog categories have been walked manually to lock the patterns (MVI, prose-vs-example division, three-category model, duplication discipline, LLM-keyword bleed, etc.), fan out and apply the templates across the rest of the catalog. Most cards just need an example added + MVI trim, not full investigation.

Pre-requisite: stable pattern set. Already locked from this session:

- L1 description template ([[feedback-l1-description-template]])
- KTX entity categories ([[reference-ktx-entity-categories]])
- L3 threshold definition (cross-domain choreography only)

Trigger: operator decides "enough" categories have been walked. Likely after 2-3 more category walks. The catalog has roughly 60+ categories; this session covered 2.

Arc shape: subagent fan-out across remaining cards, each subagent given the locked templates and the apply-pass-author Notes section conventions established here. Verification gate per cohort. Not a single-session task -- needs a multi-phase arc with the arc-planner / arc-orchestrator workflow.

### qw-player-messaging (L3, cross-layer)

Surfaced from: mmode walk + the full Player communication category walk (tpmsg, victim, killer, newcomer, ksound1-6, mmode -- session 1 + session 2 of this catalog walk, 2026-05-22 -> 2026-05-23). Should have been parked during session 1 but wasn't; the mmode walk made the cross-layer story obvious.

Scope: the whole "talking to people in QW" surface. Maps the layers that confused the operator into mmode in the first place. Genuine cross-layer concept (engine + KTX + multiple consumer commands), with a real naming-collision trap at its heart.

**Layers:**

- **Engine (client-side)**: `messagemode 1/2/3` -- chat-prompt binds. `1` = public say, `2` = team say (hidden from enemies), `3` = voice comms (Mumble/Discord plugin trigger). These pop the in-engine chat prompt; nothing to do with KTX's mmode.
- **KTX mmode (server-mod, persistent state)**: this card. Sets a *recipient* for follow-up `say` messages via userinfo `*mm`/`*mp`/`*mt`/`*mu`/`*ml`. `ClientSay` intercepts and routes.
- **KTX one-shots (server-mod, no state)**: `s-p` (private), `s-r` (reply to last s-p you got), `s-m` (multi -- to the set), `s-l` / `s-t` (last / team variants). One-shot equivalents of mmode targets. `s-p vikpe hej` ≈ `mmode player vikpe; say hej` then revert.
- **KTX presets (server-mod, fixed text)**: `tpmsg <name>` -- 21 named team-status messages (yesok / lost / soon / etc.). Same recipient as team-say but the text is canned.
- **KTX name-droppers (server-mod, dynamic text)**: `victim` / `killer` / `newcomer` -- public say wrapping a dynamically-resolved player name (last fragged / last killer / last joined) with optional `premsg` / `postmsg` userinfo wraps.
- **KTX sounds (server-mod, audio cue)**: `ksound1..ksound6` -- audible message variants (separate from text channel).

**Reader questions this would answer:**

- "What's the difference between `messagemode 2` and `mmode team`?" (different layers; one is engine UI, the other is server-mod routing state)
- "Why are there three ways to send a private message (`s-p`, `mmode player`, engine `tell`)?" (one-shot vs persistent vs engine-builtin)
- "Which one persists and which one is one-shot?" (mmode = persistent; s-p / s-r / s-m / tpmsg / killer / victim / newcomer = one-shot)
- "Where does `say` go after I set mmode?" (KTX `ClientSay` interceptor reads `*mm` and dispatches)

**L3 threshold**: easily passes (engine layer + mod state machine + multiple consumer commands; the naming collision alone justifies the note's existence).

Pre-requisite: KTX one-shot commands (`s-p` / `s-r` / `s-m` / `s-l` / `s-t`) and the `multi` command will need L1 description cleanup before this concept note can cleanly cross-reference them. Likely surfaces during the catalog-wide template-application arc.

### ktx-l1-rewrite skill (tooling, skill-arc)

Surfaced from: session 2 templates lock (2026-05-23). Once the universal shape (v2) + KTX shape catalog (9 shapes) + action-level-vs-implementation-level rule are locked, a sibling skill to `describe-fill-synthesis` becomes worth building.

Scope: per-card rewrite skill that takes an existing L1 description and recasts it under the v2 universal shape (Layer A) using the appropriate KTX shape (Layer B). Sub-agent fan-out friendly, designed for the catalog-wide template-application arc.

Differences from `describe-fill-synthesis`:

- **Input**: knob with an existing synthesized description (not a knob with no/raw-comment description).
- **Job**: recast under templates (not cold-walk synthesis from source).
- **Per-card cost**: low (form application + light verification) vs the synthesis skill's high cost.
- **Source dive**: verification-level only (description content already exists; verify factual claims against current head, e.g. catch the `mmode` "editor" framing error from session 2).

Build sequence:

1. Lock templates (DONE session 2 2026-05-23).
2. Build `ktx-l1-rewrite` skill (use `skill-creator` to scaffold; spec from `[[feedback-l1-description-template]]` v2 + `[[feedback-mod-l1-documentation-architecture]]` + `[[reference-ktx-cvar-command-pairing]]`).
3. Dispatch via sub-agent fan-out across the rest of the KTX catalog (the catalog-wide template-application arc).

Engine-genericity note: the skill should be engine-aware (KTX-specific shape catalog) but the universal-shape application is engine-agnostic. Future MVDSV / QWFWD / QTV rewrites can fork the skill with codebase-specific shape catalogs.

### qw-game-modes (L3, cross-layer)

Surfaced from: TOT triad walk (`tot` / `totmode` / `k_tot_mode`) -- 2026-05-23 session 2. Articulated the action-level-vs-implementation-level rule that pushes mode-mechanism detail out of L1 and into a concept note.

Scope: the KTX game-mode landscape. Maps presets, modifiers, the dispatch system, and the runtime-flag pattern. Covers:

- **Mode presets** (`um_list[]`): 1on1, 2on2, 3on3, 4on4, 10on10, ffa, ctf, ca, wipeout, hoonymode, blitz2v2, blitz4v4, 2on2on2, 3on3on3, 4on4on4, XonX, tot. Each is a usermode preset bundling a `<name>_um_init[]` cvar block.
- **Modifiers-on-modes** (Shape 1d triads): TOT (preset+toggle+cvar), midair, instagib, RA (Shape 1c -- modifier on duel without a preset half). Modifier triads typically include a base-mode prerequisite + a paired toggle + a runtime state cvar that other game code branches on.
- **Mode gating**: `k_allowed_free_modes` (Shape 4) controls which presets are selectable on a given server.
- **Mode dispatch**: the `UserMode(idx)` framework + `is_rules_change_allowed()` gate that enforces pre-match-only on preset switches.

Reader questions this would answer:

- "What's the difference between `tot` and `totmode`?" (preset bundle vs surgical toggle)
- "Why does setting `k_tot_mode 1` in server.cfg sometimes do nothing?" (needs dmm4 base; without it the cvar exists but the code branches don't fire)
- "What modes can be a modifier on top of another mode?" (TOT on dmm4, RA on duel, midair / instagib on dmm4 -- the mode-precondition pattern)
- "Which modes are mutually exclusive?" (TOT vs midair vs instagib)
- "What's mode X for and how is it played?" (lived-experience layer -- TOT is solo-vs-bots, RA is competitive, hoonymode is duel training, ...)

**L3 threshold**: easily passes (multi-cvar choreography spanning presets + modifiers + gating + runtime branches; the implementation-detail bleed from `k_tot_mode` is the load-bearing pull factor).

Pre-requisite: TOT triad drafts (this session) need to land; sibling preset cards (1on1, ffa, ctf, etc.) need to be walked + drafted; modifier-family siblings (midair, instagib) need their own triad walks. Likely a parallel arc to the catalog-wide template-application arc, or a phase within it.

**Operator-provided lore (captured 2026-05-23, for the concept-note authoring pass — invisible from source, would be lost otherwise):**

- **TOT origin**: slime (a KTX developer, member of clan ToT -- "Tribe of Tjernobyl") created TOT as a *challenge mode against bots*. Not a community-popular PvP mode -- specifically a solo-vs-bots arena format.
- **TOT canonical setup**: DMM4 base with the modifier active. 8 bots spawn, all armed with super shotguns ("boomsticks"). The human player spawns in DMM4 (no spawn invincibility due to `dmm4_invinc_time -1`). 5-minute timer. Score = frags accumulated.
- **TOT variant rules** (operator: "there are a few variations"):
  - `botcmd breakondeath` is usually ON when playing on `e1m2`, OFF when playing on `dm4`. Reason unclear; map-specific tradition.
  - Bot skill level is debatable -- no community consensus on the canonical skill setting.
- **Why this matters for L1**: NONE of this is in source. The L1 cards correctly describe what `tot` / `totmode` / `k_tot_mode` DO mechanically (preset bundle, modifier toggle, runtime flag). The qw-game-modes concept note must carry: who built it / why / canonical play setup / map-specific variations / skill-level conventions.
- **Broader insight**: similar lore likely exists for RA (clan/community-popular duel modifier), midair, instagib, ctf, bloodfest. The qw-game-modes concept note will need an operator-provided lore pass per mode -- this can't be reverse-engineered.

**KTX archaeology note** (operator-provided 2026-05-23): KTX absorbed many previously-standalone Quake mods (TOT, RA, CTF, midair, instagib, bloodfest probably all started as separate mods). That history explains the shape diversity in `[[reference-ktx-cvar-command-pairing]]` -- each absorbed mod brought its own conventions for cvars, commands, and gating. A KTX-only mod from scratch would need fewer shapes; the catalog's complexity reflects accumulated mod history.
