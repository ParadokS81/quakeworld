# ktx-l1-rewrite drafts -- batch 2026-05-27-frogbot-followup

Per-card v2 recasts produced by the `ktx-l1-rewrite` skill via the
`ktx-l1-batch-dispatcher`. Apply-pass-author reviews each card, applies
clean drafts, hand-edits flagged-drafts after verifying the surfaced
contradiction. Drafts do NOT auto-apply to L1 (`entities.description`);
the apply pass is a separate phase.

Batch metadata: 15 cards (13 drafted clean + 2 drafted_with_flag + 0
parked). This is the FOLLOW-UP batch that closes the 16-entity gap left
by the prior chunked-mode dispatch arc. All 15 entities are
`k_fb_*`-prefixed cvars in `Frogbot` category that the 2026-05-26
chunked-mode batch skipped via semantic-intuition entity-list assembly
(the prior batch's entity selection grouped on "what `botcmd`
dispatches" / "what's the primary command in a Shape 1c pair" rather
than literal `category_inferred='Frogbot'` membership). The
pre-flight #5 category-enumeration audit caught the gap; this batch
applies the fix. The other 1-entity of the 16-entity gap (Race
category) is being handled in a parallel batch.

Halt-on-novelty did not fire. All 15 are pure Shape 3 (server-config
cvar; no paired command toggle on the cvar itself) or Shape 3 + Shape 4
(server-config cvar that gates a `botcmd` subcommand handler). Five of
the cvars are ToT-mode-scoped (k_fb_break_on_death, k_fb_health,
k_fb_quad_multiplier, k_fb_item_pickup_bonus, k_fb_weapon) despite the
`Frogbot` category_inferred label -- they are read by ToT-mode game-rule
code paths, not by Frogbot AI; their existing descriptions already
encode the correct ToT scope from source traces, which this recast
preserves rather than force-fitting Frogbot framing. The DB
categorization-accuracy follow-up #15 is the tracked path for the
category-label fix; this batch does not touch DB categorization.

<!-- entity: k_fb_admin_only -->
## k_fb_admin_only (KTX cvar, Frogbot -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:1061
- **Catalog line**: (Frogbot family root -- cvar surface for `botcmd` dispatcher access gate)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Restricts who may issue the `botcmd` (Frogbots) command. 0 = no restriction, any player may use it; 1 = restricted to admins (elected or real/server admins); 2 = restricted to real/server admins only.

### Shape classification

Shape 3 (cvar with no paired toggle command -- set in server.cfg, no
`cvar_toggle_msg` site for this cvar) + Shape 4 (the cvar gates the
`botcmd` dispatcher at `src/bot_commands.c:2392-2404`, where every
subcommand of `botcmd` goes through the gate before being routed).

### Proposed draft

```
Runtime permission gate for the `botcmd` Frogbot dispatcher. Controls which clients are allowed to invoke any `botcmd` subcommand (both standard and editor scope).

Effect:
  0 = no restriction; any player or spectator may invoke `botcmd <subcommand>`.
  1 = admin gate; the caller must be an admin (elected or real server admin) -- non-admins are refused with "You must be an admin to use this command".
  2 = strict gate; only real server admins (recognised via the server admin password) may invoke -- elected admins and ordinary players are both refused with "You must be a server admin to use this command".

Default: 0 (no restriction).

Permission: server config only.

Example:
  // server.cfg -- lock the bot dispatcher to admins
  set k_fb_admin_only 1

See also: botcmd (the dispatcher gated by this cvar), k_admins (the master admin-system toggle that governs whether "admin" status exists at all), k_admincode (the password an admin uses to elect via /admin), k_fb_enabled (the on/off switch for the bot subsystem)
```

### Notes

- Default 0 verified from `src/world.c:1061`: `RegisterCvarEx(FB_CVAR_ADMIN_ONLY, "0")`.
- Gate logic verified at `src/bot_commands.c:2392-2404` (FrogbotsCommand). Order of checks: value 2 refusal fires first (real-admin check), then value 1 (any-admin check); value 0 falls through.
- The existing description is correct in substance but lacks the explicit "spectators may invoke when value=0" framing -- the dispatcher CF flag at `src/commands.c:1047` is `CF_BOTH | CF_MATCHLESS | CF_PARAMS` (any player or spectator), so the gate's "no restriction" case is symmetric across class. Added to Effect explicitly.
- The refusal messages are quoted verbatim from `src/bot_commands.c:2394` and `src/bot_commands.c:2400`.

<!-- entity: k_fb_auto_delay -->
## k_fb_auto_delay (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1058
- **Catalog line**: (Frogbot family root -- auto-population throttle)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Minimum delay in integer seconds between successive automatic Frogbot add/remove events. While auto-add (k_fb_autoadd_limit) or auto-remove (k_fb_autoremove_at) is active, the server performs at most one automatic add or removal per this interval, measured from the last such event. Values below 1 are clamped to 1 second; this cvar cannot be set to disable the delay or fire instantly.

### Shape classification

Shape 3 (server-config-only cvar; no paired command toggles it). Read by `BotStartFrame` at `src/bot_commands.c:2674` to throttle the automatic add/remove decisions controlled by `k_fb_autoadd_limit` and `k_fb_autoremove_at`.

### Proposed draft

```
Minimum interval (in seconds) between successive automatic Frogbot add or remove events fired by the `k_fb_autoadd_limit` / `k_fb_autoremove_at` auto-population system.

Effect:
  Sets the spacing between consecutive automatic bot add or remove actions. The auto-system samples the connected-client count once per server frame, but commits at most one add or remove per `k_fb_auto_delay` seconds, measured from the most recent auto-add or auto-remove event.
  Acts on auto-add and auto-remove jointly -- the throttle is a single shared timer covering both directions.
  No effect when both `k_fb_autoadd_limit` and `k_fb_autoremove_at` are 0 (auto-population disabled entirely).

Default: 1.

Permission: server config only.

Example:
  // server.cfg -- pace auto-fills at one bot every 5 seconds
  set k_fb_autoadd_limit 8
  set k_fb_auto_delay 5

See also: k_fb_autoadd_limit (population floor that triggers auto-add), k_fb_autoremove_at (population ceiling that triggers auto-remove), k_fb_enabled (master bot enable)
```

### Notes

- Default 1 verified from `src/world.c:1058`: `RegisterCvarEx(FB_CVAR_AUTO_DELAY, "1")`.
- The existing description's "Values below 1 are clamped to 1 second; this cvar cannot be set to disable the delay or fire instantly" claim is NOT supported by the read site -- `BotStartFrame` reads the cvar as `int auto_delay = cvar(FB_CVAR_AUTO_DELAY)` with no clamp, and the value is passed forward without lower-bound guard. The claim appears to come from the default value (1), not from runtime clamping. Recast omits the clamp claim since the source does not enforce it; if the operator wants the clamp claim preserved, it should be verified against a deeper read of the auto-fire loop.
- "Joint throttle covering both directions" derived from `BotStartFrame` reading all three cvars adjacent and using a single `last_auto_client` timestamp variable (per the prior batch's `k_fbskill_*` recast research notes anchoring the auto-population loop structure).

<!-- entity: k_fb_autoadd_limit -->
## k_fb_autoadd_limit (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1056
- **Catalog line**: (Frogbot family root -- auto-population floor)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Minimum total client count the server tries to maintain by auto-adding Frogbots. While at least one human is on the server and the map supports Frogbots, if the total number of connected clients (bots + humans) is below this value, one Frogbot is added per `k_fb_auto_delay`-second interval (the effective target is clamped to the server's `maxclients`). 0 disables auto-add. If this value is greater than `k_fb_autoremove_at` (and both are non-zero) the misconfiguration is detected at runtime and both auto-add and auto-remove are treated as 0 for that frame. Requires the engine to be built with `BOT_SUPPORT`.

### Shape classification

Shape 3 (server-config-only cvar; no paired command). Read by `BotStartFrame` at `src/bot_commands.c:2672` as the population floor that triggers automatic bot adds.

### Proposed draft

```
Population floor for automatic Frogbot adds. The server tries to keep the total client count (humans + bots) at or above this value by auto-adding bots whenever the count falls below it.

Effect:
  When set above 0 and at least one human is connected on a bot-supported map, the auto-system adds one Frogbot per `k_fb_auto_delay`-second interval while (humans + bots) is below this value. The effective ceiling is the server's `maxclients`; the system never adds beyond what `maxclients` allows.
  0 = auto-add disabled.
  Misconfiguration guard: if `k_fb_autoadd_limit` is greater than `k_fb_autoremove_at` and both are non-zero, both auto-add and auto-remove are treated as disabled for that frame (the auto-population system refuses to oscillate).

Default: 0 (auto-add disabled).

Permission: server config only.

Example:
  // server.cfg -- always keep at least 4 clients on the server, even if humans leave
  set k_fb_autoadd_limit 4
  set k_fb_auto_delay 2

See also: k_fb_autoremove_at (paired population ceiling), k_fb_auto_delay (throttle between events), k_fb_enabled (master bot enable)
```

### Notes

- Default 0 verified from `src/world.c:1056`: `RegisterCvarEx(FB_CVAR_AUTOADD_LIMIT, "0")`.
- Misconfiguration guard verified at `src/bot_commands.c:2680-2683`: `if (min_required_clients && max_required_clients && (min_required_clients > max_required_clients)) { min_required_clients = max_required_clients = 0; }`.
- The "Requires the engine to be built with `BOT_SUPPORT`" clause in the existing description is true (the entire bot subsystem at `bot_commands.c` is wrapped in `#if BOT_SUPPORT`) but is an implementation-level detail that the v2 universal shape excludes from L1 prose per the action-level rule. KTX official builds enable `BOT_SUPPORT` by default, so the clause adds no actionable information.

<!-- entity: k_fb_autoremove_at -->
## k_fb_autoremove_at (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1057
- **Catalog line**: (Frogbot family root -- auto-population ceiling)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Frogbot client-count ceiling for auto-removal. When the total number of clients on the server (humans plus bots) exceeds this value, the Frogbot auto-system removes the lowest-scoring bot (the one with the fewest frags), throttled by k_fb_auto_delay seconds between actions and requiring at least one human player on a Frogbot-supported map. Set to 0 to disable auto-removal (default 0). If this value is set lower than k_fb_autoadd_limit, both auto-add and auto-remove are disabled as a safety against misconfiguration.

### Shape classification

Shape 3 (server-config-only cvar; no paired command). Read by `BotStartFrame` at `src/bot_commands.c:2673` as the population ceiling that triggers automatic bot removal.

### Proposed draft

```
Population ceiling for automatic Frogbot removal. The server starts removing bots whenever total client count (humans + bots) exceeds this value.

Effect:
  When set above 0 and at least one human is connected on a bot-supported map, the auto-system removes the lowest-scoring bot (fewest frags) once per `k_fb_auto_delay`-second interval while (humans + bots) is above this value.
  0 = auto-remove disabled.
  Misconfiguration guard: if `k_fb_autoremove_at` is less than `k_fb_autoadd_limit` and both are non-zero, both auto-add and auto-remove are treated as disabled for that frame.

Default: 0 (auto-remove disabled).

Permission: server config only.

Example:
  // server.cfg -- shed bots once 4 humans show up, so the bots make room
  set k_fb_autoadd_limit 4
  set k_fb_autoremove_at 4
  set k_fb_auto_delay 2

See also: k_fb_autoadd_limit (paired population floor), k_fb_auto_delay (throttle between events), k_fb_enabled (master bot enable)
```

### Notes

- Default 0 verified from `src/world.c:1057`: `RegisterCvarEx(FB_CVAR_AUTOREMOVE_AT, "0")`.
- Misconfiguration guard verified at `src/bot_commands.c:2680-2683` (same site as the `k_fb_autoadd_limit` card).
- "Lowest-scoring bot (fewest frags)" preserved from existing description; per the same `BotStartFrame` loop convention that the prior batch's `k_fbskill_*` cards already cite, the auto-system selects via a frag-comparison scan of bots in the player-iteration loop.

<!-- entity: k_fb_break_on_death -->
## k_fb_break_on_death (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1065
- **Catalog line**: (ToT-mode rules cvar, mislabeled as Frogbot)
- **Anchor**: 1.47-2-g67253dc

### Current description

> When Tribe of Tjernobyl (ToT) mode is active, controls whether a non-bot player's death automatically casts that player's vote to break the current match (the same vote the `break` command issues). 0 = off, non-zero = on. Has no effect outside ToT mode and never applies to bots. Default: 1.

### Shape classification

Shape 3 (server-config-only cvar; no paired toggle command writes the cvar -- the `breakondeath` botcmd subcommand toggles the cvar at `src/bot_commands.c:2227`, so this also has a Shape 1-flavored runtime mutator, but the cvar's primary classification stays Shape 3 since the user-actionable mutator route lives in the `botcmd` dispatcher rather than as a stand-alone command). Read by `PlayerDie` at `src/player.c:1145` as the human-death break-vote trigger gate, scoped to ToT mode + non-bot player.

### Proposed draft

```
ToT-mode rule: whether a non-bot player's death automatically casts that player's vote to break the current match. The auto-cast is the same vote the `break` command issues -- it counts toward the match-break threshold but does not by itself break the match unless threshold is met.

Effect:
  0 = off; a player's death has no automatic effect on break voting.
  Non-zero = on; when a non-bot player dies during a live ToT match (k_tot_mode 1), that player's break vote is auto-cast.
  Has no effect outside ToT mode (the read site is gated on `tot_mode_enabled()`).
  Never applies to bots (the read site is also gated on `!self->isBot`).

Default: 1 (auto-break on death enabled).

Prerequisites: ToT mode (k_tot_mode 1) must be active for this cvar to have any effect.

Permission: server config, or in-game via the `botcmd breakondeath` admin subcommand (which toggles the cvar between 0 and 1).

Example:
  // server.cfg -- disable auto-break on death so players have to call /break themselves
  set k_fb_break_on_death 0

See also: k_tot_mode (the mode this cvar's effect is scoped to), tot (preset that enables ToT mode), totmode (toggle for ToT mode), break (the underlying match-break vote command this cvar auto-casts on death), breakondeath:frogbot:std (the in-game toggle for this cvar)
```

### Notes

- Default 1 verified from `src/world.c:1065`: `RegisterCvarEx(FB_CVAR_BREAK_ON_DEATH, "1")`.
- ToT-scope + non-bot guard verified at `src/player.c:1145`: `if (!self->isBot && tot_mode_enabled() && cvar(FB_CVAR_BREAK_ON_DEATH)) { PlayerBreak(); }`.
- Category-label note: this cvar is `category_inferred = Frogbot` in the live DB, but the actual scope is ToT-mode game rules (the `k_fb_` prefix is naming history -- the bot system grew the ToT-mode rules family alongside it). The headliner names "ToT-mode rule", not "Frogbot rule", to match the source-true scope; the categorization-accuracy follow-up will rebucket this row.
- The toggle path via `botcmd breakondeath` is a Shape 8 subcommand (already drafted in the 2026-05-26-frogbot batch); we cross-link rather than re-describe the subcommand here.

<!-- entity: k_fb_debug -->
## k_fb_debug (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1060
- **Catalog line**: (Frogbot family -- debug-print toggle, currently inert at this anchor)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Frogbot debug cvar. Registered (BOT_SUPPORT-gated) with default 0 at src/world.c:1060 and cleared to 0 by the bot path-debug completion routine at src/bot_botthink.c:371. At this anchor no read use-site exhibits behavior controlled by this cvar's value -- the related path-debug toggle is held on per-bot struct fields (self->fb.debug, set at src/bot_commands.c:785, read at src/bot_botpath.c:264), not on this cvar, and the only would-be set-to-1 call site (src/bot_commands.c:788) is commented out. The observable effect of setting k_fb_debug is therefore not source-legible at this anchor; needs community/operator confirmation.

### Shape classification

Shape 3 (server-config-only cvar; no read use-site at this anchor binds the cvar's value to runtime behavior, so no Shape 4 gate exists today). The cvar's structural shape is correct -- the recast preserves it as Shape 3 with an explicit "currently inert" flag, rather than parking, because the existing synthesized description has 631 chars of source-traced content that the apply-pass-author can ship behind the flag.

### Proposed draft

```
Frogbot path-debug cvar. Registered and cleared by the bot subsystem, but at this engine anchor no read use-site binds the cvar's value to runtime behavior -- the path-debug toggle has been migrated to per-bot struct state (self->fb.debug) and this cvar is effectively inert.

Effect:
  No source-legible runtime effect at this anchor. The cvar is registered (default 0) and is explicitly cleared to 0 by the bot path-debug completion routine, but no code reads the value to branch behavior.
  Historical context: an older code path (now disabled) would have set this cvar to 1 when starting a bot path-debug session; that write is disabled and the actual debug toggle lives on `self->fb.debug` (a per-bot C struct field) rather than on this cvar.

Default: 0.

Permission: server config only (no runtime command writes this cvar at this anchor).

Example:
  // server.cfg -- setting this has no observable effect at this engine anchor
  // (left documented for forward-compatibility -- a future engine version may
  //  re-wire the runtime path-debug toggle back to this cvar)
  set k_fb_debug 0

See also: k_fb_options (the bitmask cvar that controls live bot debug-trace toggles, FB_OPTION_SHOW_THINKING etc -- the path that is actually wired at this anchor)
```

### Notes

- FLAG: behavior may not match observable runtime -- synth confidence=low; C1 outreach pending. The recast preserves the existing description's "currently inert at this anchor" framing but reformats under v2 shape. Apply-pass-author should NOT mark this card as cleanly settled; awaiting community confirmation on whether (a) the cvar is genuinely inert (the cold-synth read), (b) some out-of-tree consumer reads it, or (c) the commented-out set-site is expected to be re-enabled in a near-future version. If (a) holds, the L1 description should remain in this "registered but inert" form as a documented dead-end. If (b) or (c) surfaces, the description needs a re-synth.
- Registration verified at `src/world.c:1060`: `RegisterCvarEx(FB_CVAR_DEBUG, "0")`.
- Clear-to-0 site verified at `src/bot_botthink.c:371`.
- Commented-out set-to-1 site verified at `src/bot_commands.c:788`: `//cvar_fset (FB_CVAR_DEBUG, 1);` -- adjacent to assignments on `first_bot->fb.debug` / `first_bot->fb.debug_path` / `first_bot->fb.debug_path_rj` (the per-bot struct fields that hold the live toggle).
- No `cvar(FB_CVAR_DEBUG)` read site found in any source file under `src/` at this anchor (verified by grep across the full src tree).

<!-- entity: k_fb_easy_skill_mode -->
## k_fb_easy_skill_mode (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted_with_flag
- **Source**: src/world.c:1068
- **Catalog line**: (Frogbot family -- skill-preset selector)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Selects which skill-attribute preset is applied when configuring a Frogbot's behaviour cvars. Boolean: 1 = use the easy-skill-mode preset, 0 = use the default preset. Each preset writes the bot accuracy/dodge/lookahead/reaction/volatility/movement family (k_fb_skill_*, k_fb_aim_*, k_fb_movement_*, etc.) using a different mapping over the bot's skill level. Default 1. Toggleable via the `easyskill` Frogbot command.

### Shape classification

Shape 3 (server-config-only cvar primarily; the runtime mutator routes via the `botcmd easyskillmode` Shape 8 subcommand at `src/bot_commands.c:2303`). Read by `FrogbotEasySkillMode` accessor at `src/bot_commands.c:138` (via `cvar(FB_CVAR_EASY_SKILL_MODE)`), consumed by `bot_botimp.c:268` to branch between two skill-attribute-preset application routines.

### Proposed draft

```
Selects which skill-attribute preset is applied when configuring a Frogbot's behaviour. 1 = use the easy preset (lower difficulty, gentler skill curve); 0 = use the default preset (the original Frogbot skill curve).

Effect:
  1 = easy mode; when bot skill is (re-)applied via `botcmd skill <N>` or `botcmd fill <N>`, the engine calls `setSkillAttributesEasySkillMode(skill, aimskill)` and broadcasts "Using easy bot skill mode".
  0 = default mode; the engine calls `setSkillAttributes(skill, aimskill)` and broadcasts "Using default bot skill mode".
  The preset is applied at skill-set time, not continuously -- a change to this cvar only takes effect on the next bot-skill apply (typically `/botcmd skill <N>` or `/botcmd fill`). Each preset writes the same downstream `k_fbskill_*` aim / reaction / movement / volatility cvars but with a different mapping over the bot's skill level.

Default: 1 (easy mode).

Permission: server config, or in-game via the `botcmd easyskillmode` admin subcommand (which toggles the cvar between 0 and 1).

Example:
  // server.cfg -- restore the harder default skill curve
  set k_fb_easy_skill_mode 0

See also: k_fb_skill (the skill level the preset is applied against), easyskillmode:frogbot:std (the in-game toggle for this cvar), skill:frogbot:std (the subcommand that triggers preset re-application), k_fbskill_* family (the downstream attribute cvars each preset writes)
```

### Notes

- FLAG: Existing description says "k_fb_skill_*, k_fb_aim_*, k_fb_movement_* cvars" but the actual downstream cvar family in source is `k_fbskill_*` (single token, no underscore between `fb` and `skill`) -- verified across `src/bot_botimp.c:15-54`. The "k_fb_aim_*" / "k_fb_movement_*" framing in the existing description is inaccurate. Recast points at `k_fbskill_*` (the source-true family name).
- Default 1 verified from `src/world.c:1068`: `RegisterCvarEx(FB_CVAR_EASY_SKILL_MODE, "1")`.
- Branch site verified at `src/bot_botimp.c:268`: `if (FrogbotEasySkillMode()) { ... setSkillAttributesEasySkillMode ... } else { ... setSkillAttributes ... }`.
- "Toggleable via the `easyskill` Frogbot command" in the existing description -- source name is `easyskillmode` (not `easyskill`); already-shipped subcommand card in the 2026-05-26-frogbot batch confirms.

<!-- entity: k_fb_enabled -->
## k_fb_enabled (KTX cvar, Frogbot -- Shape 3 + Shape 4)

- **Status**: drafted
- **Source**: src/world.c:1054
- **Catalog line**: (Frogbot family -- master enable switch)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Enables Frogbot AI players on the server. Set to 1 to enable bots, 0 (the default) to disable; the cvar is checked with strict equality, so any value other than 1 is treated as disabled. Toggled at runtime via `/botcmd enable` and `/botcmd disable`; toggling the value triggers a map reload to rebuild bot routing entities.

### Shape classification

Shape 3 (server-config cvar; not toggled by a stand-alone command) + Shape 4 (the `bots_enabled()` predicate -- defined at `src/fb_globals.c:236-239` as `(cvar(FB_CVAR_ENABLED) == 1)` -- gates dozens of bot subsystem entry points). The runtime mutator routes via the `botcmd enable` / `botcmd disable` paths in the dispatcher.

### Proposed draft

```
Master enable switch for the Frogbot AI subsystem. 1 = bots enabled, 0 = bots disabled.

Effect:
  Strict-equality check: only the value 1 enables bots. Any other value (including 2, -1, 0.5) is treated as disabled -- the `bots_enabled()` predicate is literally `(cvar("k_fb_enabled") == 1)`.
  When disabled, every `botcmd` subcommand other than `enable` is refused with "Bots not enabled: to turn on, /botcmd enable" -- the dispatcher itself stays reachable so the operator can flip the switch in-game.
  Toggling at runtime via `/botcmd enable` or `/botcmd disable` advances the server to the next map -- the bot routing entities are rebuilt at map load, so the switch is not hot.

Default: 0 (disabled).

Permission: server config, or in-game via `/botcmd enable` (any player or spectator, subject to k_fb_admin_only gate) and `/botcmd disable` (same).

Prerequisites for enabling at runtime: the current map must not be in race or CTF mode, and a match must not be in progress (otherwise `/botcmd enable` refuses).

Example:
  // server.cfg -- enable bots on server startup
  set k_fb_enabled 1

  // or in-game (preferred path; rebuilds routing entities cleanly):
  /botcmd enable

See also: botcmd (the dispatcher whose subcommands depend on this cvar), k_fb_admin_only (who may invoke /botcmd), k_fb_options (bot debug-print flags), disable:frogbot:std (in-game runtime disable)
```

### Notes

- Default 0 verified from `src/world.c:1054`: `RegisterCvarEx(FB_CVAR_ENABLED, "0")`.
- Strict-equality gate verified at `src/fb_globals.c:238`: `return (cvar(FB_CVAR_ENABLED) == 1);`.
- "Bots not enabled" refusal message + the `cvar_fset(FB_CVAR_ENABLED, 1)` runtime-write site (at `src/bot_commands.c:2434`) both verified in the `FrogbotsCommand` dispatcher.
- The pre-flight match/race/CTF refusals (`match_in_progress`, `isRACE()`, `isCTF()`) all verified at `src/bot_commands.c:2415-2433` -- preserved in Prerequisites since they're surprise-bearing (the user typing `/botcmd enable` mid-match would not predict the refusal).

<!-- entity: k_fb_freeze_prewar -->
## k_fb_freeze_prewar (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1062
- **Catalog line**: (Frogbot family -- prewar behavior toggle)
- **Anchor**: 1.47-2-g67253dc

### Current description

> When set to a nonzero value, freezes frogbots before the live match begins: bots do not move, jump, or fire during prewar and countdown. Has no effect once the match is live. Default 0 (off).

### Shape classification

Shape 3 (server-config-only cvar; no command writes it). Read by `BotMovement` at `src/bot_movement.c:552` to suppress bot movement and input during the non-live phase of the match-state state machine.

### Proposed draft

```
Freezes Frogbots before the live match begins. When on, bots do not move, jump, or fire during prewar and the countdown phase; once the match goes live, the freeze is lifted automatically.

Effect:
  0 = off (default); bots run their full movement and combat AI immediately as soon as they spawn, including during prewar.
  Non-zero = on; while `match_in_progress != 2` (i.e. anything other than the live-match phase), each bot's movement direction is zeroed, its jump and fire buttons are cleared, and its impulse register is set to 0 -- the bot stays on its spawn point until the match starts.

Default: 0 (no freeze).

Permission: server config only.

Match-state: the freeze only applies pre-match (match_in_progress != 2). Once the match goes live, the freeze ends automatically.

Example:
  // server.cfg -- keep bots still during prewar so humans can warm up undisturbed
  set k_fb_freeze_prewar 1

See also: k_fb_enabled (master bot enable), k_fb_options (bot debug visibility flags), match_in_progress (engine match-state value the freeze branches on)
```

### Notes

- Default 0 verified from `src/world.c:1062`: `RegisterCvarEx(FB_CVAR_FREEZE_PREWAR, "0")`.
- Freeze application verified at `src/bot_movement.c:552-557`: `if (match_in_progress != 2 && cvar(FB_CVAR_FREEZE_PREWAR)) { jumping = firing = false; VectorClear(direction); impulse = 0; }`.
- "match_in_progress" surfaced in See-also as an engine match-state reference but NOT given its own L1 prerequisite line on this card -- the cvar's behavior is "off OR active-during-prewar"; the prerequisite framing belongs in Match-state.

<!-- entity: k_fb_health -->
## k_fb_health (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1063
- **Catalog line**: (ToT-mode rules cvar, mislabeled as Frogbot)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Controls the spawn health (HP) given to frogbots in Tribe of Tjernobyl (ToT, `k_tot_mode 1`) mode. On respawn in ToT mode, each bot's health is set to this value; in non-ToT game modes the cvar has no effect on spawn health (non-ToT bot/player spawn health is hardcoded at 250 HP). Default 100. The `/botcmd health <N>` admin command clamps writes to the range 1-300; direct cvar writes are not range-clamped. The current value is also shown in the ToT-mode status display.

### Shape classification

Shape 3 (server-config-only cvar primarily; the runtime mutator routes via the `botcmd health` Shape 8 subcommand at `src/bot_commands.c:2179`). Read by `FrogbotHealth` accessor at `src/bot_commands.c:120`, consumed by `client.c:2236` at the bot-spawn site to set per-bot starting health when ToT mode applies.

### Proposed draft

```
Bot spawn health (HP) in ToT (Tribe of Tjernobyl) mode. On bot respawn while ToT mode is active, each bot's health is set to this value; in non-ToT modes the cvar has no effect and bots spawn with hardcoded 250 HP.

Effect:
  Applied at the bot-spawn site: `health = isBot ? FrogbotHealth() : 250` -- humans always spawn at 250 HP, bots take this cvar's value (in ToT mode) or fall back to a non-ToT default elsewhere.
  Outside ToT mode (k_tot_mode 0), the cvar has no effect on spawn health.
  The current value is reported in the ToT-mode status banner ("Bot health <N>"), so operators can see at a glance what the bots will spawn with.

Default: 100.

Permission: server config (no range clamp -- direct `set k_fb_health 500` is accepted as-is), or in-game via the `botcmd health <N>` admin subcommand (which clamps the write to the range 1-300).

Prerequisites: ToT mode (k_tot_mode 1) must be active for this cvar to have any effect on bot spawn health.

Example:
  // server.cfg -- give ToT bots a fighting chance with 200 starting HP
  set k_fb_health 200

  // or in-game (clamped to 1-300):
  /botcmd health 200

See also: k_tot_mode (the mode this cvar's effect is scoped to), tot (preset that enables ToT mode), totmode (toggle for ToT mode), health:frogbot:std (the in-game admin setter, clamped to 1-300), k_fb_weapon (sibling ToT-mode per-bot setup cvar)
```

### Notes

- Default 100 verified from `src/world.c:1063`: `RegisterCvarEx(FB_CVAR_HEALTH, "100")`.
- Bot-spawn application verified at `src/client.c:2236`: `self->s.v.health = self->isBot ? FrogbotHealth() : 250;`.
- Admin-setter clamp verified at `src/bot_commands.c:2170-2179`: range parsed as `bound(1, new_health, 300)`.
- Category-label note: this cvar is `category_inferred = Frogbot` in the live DB. The actual scope is ToT-mode game rules (the bot-spawn HP gate fires only when ToT mode is active; for non-ToT bot HP, the engine uses a different code path). The categorization-accuracy follow-up will rebucket this row; the headliner here names the ToT scope explicitly.

<!-- entity: k_fb_item_pickup_bonus -->
## k_fb_item_pickup_bonus (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1067
- **Catalog line**: (ToT-mode rules cvar, mislabeled as Frogbot)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Toggles the Frogbot 'item pickup bonus' rule set in Tribe of Tjernobyl (ToT) mode. 0 = off (default), 1 = on; only takes effect while ToT mode is active. When on: the health pickup cap is raised from 250 to 300; the megahealth item can be picked up while health is already at 250-299 and grants a flat 100 (instead of its normal healamount); weapon pickups raise the ammo caps from 100/200/100/100 to 255/255/255/255 for shells/nails/rockets/cells; picking up the Rocket Launcher or Lightning Gun additionally grants +100 health; and in deathmatch modes 4 and 5 the RL, LG, rockets and megahealth (which are otherwise removed at map spawn) remain spawnable, subject to k_disallow_weapons. The toggle is exposed to admins via the 'fbipb' bot-command path, which refuses outside ToT mode.

### Shape classification

Shape 3 (server-config-only cvar primarily; runtime mutator routes via the `botcmd itempickupbonus` Shape 8 subcommand at `src/bot_commands.c:2290`). Read by `FrogbotItemPickupBonus` accessor at `src/bot_commands.c:135` (`tot_mode_enabled() && (qbool)cvar(FB_CVAR_ITEM_PICKUP_BONUS)`), consumed across `src/items.c` at every health / megahealth / weapon / ammo pickup site to apply the bonus rule set.

### Proposed draft

```
ToT-mode item-pickup bonus toggle. When on (and ToT mode is active), pickups apply a more generous rule set: higher caps, bigger heals on RL/LG pickup, and dmm4/dmm5 keep their RL/LG/rockets/megahealth spawn entities.

Effect:
  0 = off (default). Pickups behave as the normal QW deathmatch rules.
  1 = on. When ToT mode is active:
    Health pickup cap rises from 250 to 300.
    Megahealth can be picked up while you are already at 250-299 HP, and grants a flat 100 HP (instead of its normal `healamount`).
    Weapon pickups raise the ammo caps from 100/200/100/100 (shells/nails/rockets/cells) to 255/255/255/255.
    Picking up the Rocket Launcher or the Lightning Gun additionally grants +100 health.
    In dmm4 and dmm5, the RL, LG, rockets, and megahealth -- normally removed at map spawn in those modes -- remain spawnable (subject to k_disallow_weapons).
  When ToT mode is off, the cvar's bit has no effect (the accessor's `tot_mode_enabled()` guard short-circuits).

Default: 0 (off).

Permission: server config, or in-game via the `botcmd itempickupbonus` admin subcommand (which toggles the cvar between 0 and 1; the subcommand refuses outside ToT mode with a usability message).

Prerequisites: ToT mode (k_tot_mode 1) must be active for this cvar to have any effect.

Example:
  // server.cfg -- enable the ToT-mode bonus pickup rules by default
  set k_fb_item_pickup_bonus 1

  // or in-game (only useful while ToT mode is active):
  /botcmd itempickupbonus

See also: k_tot_mode (the mode this cvar's effect is scoped to), tot (preset that enables ToT mode), totmode (toggle for ToT mode), itempickupbonus:frogbot:std (the in-game toggle for this cvar), k_disallow_weapons (the weapon-disallow mask that still applies on top of the bonus rule)
```

### Notes

- Default 0 verified from `src/world.c:1067`: `RegisterCvarEx(FB_CVAR_ITEM_PICKUP_BONUS, "0")`.
- ToT-scope guard verified at `src/bot_commands.c:135`: `return tot_mode_enabled() && (qbool)cvar(FB_CVAR_ITEM_PICKUP_BONUS);` -- so even if the cvar is set to 1 outside ToT, the accessor returns false and the bonus rules don't fire.
- Pickup-site list (health 250->300, megahealth flat-100, ammo caps 255, RL/LG +100 HP, dmm4/dmm5 keep RL/LG/rockets/megahealth) all verified across `src/items.c:199, 308-313, 355, 385, 637-652, 971, 1244`.
- Existing description's "'fbipb' bot-command path" is a typo / abbreviation; the actual source-true subcommand name is `itempickupbonus` (registered in `std_commands[]` at `src/bot_commands.c:2329`). Recast names the correct subcommand.
- Category-label note: same as k_fb_break_on_death / k_fb_health -- this is a ToT-mode game-rule cvar that happens to share the `k_fb_` prefix. Headliner names ToT scope.

<!-- entity: k_fb_options -->
## k_fb_options (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1055
- **Catalog line**: (Frogbot family -- option bitmask)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Bitmask of Frogbot debug/editor toggles (BOT_SUPPORT builds only). The value is bitwise-ANDed with each flag; default 0 disables all. Bits: 1 = spawn visible gold-key marker indicators at navigation nodes; 2 = enable the waypoint-editor mode (lets bot commands run on unsupported maps, preserves marker colours, links teleporters, narrows next-marker search radius, etc.); 4 = include duel logic (armor, damage, item-desire scores) in the bot-thinking dump; 8 = include goal logic (per-marker goal list) in the dump; 16 = include routing logic (touch/linked/old-linked/goal markers) in the dump; 32 = include movement logic (velocity, obstruction, last direction) in the dump AND emit live G_sprint movement traces (linked-marker changes, jumps, hazard-avoidance decisions); 64 = call DemoMark() each time a bot performs a rocket-jump (writes a //demomark stuffcmd, plus an entry to the demo-marker table during a live match); 128 = stream per-frame //botcmd-desired and //botcmd-modified aim debug lines into bot demos via STUFFCMD_DEMOONLY. Bits 4|8|16|32 = 60 is also the FB_OPTION_SHOW_THINKING composite that gates the bot-thinking dump itself.

### Shape classification

Shape 3 (server-config-only cvar; no paired toggle command writes the cvar -- it's a pure bitmask read via `FrogbotOptionEnabled(int option)` at `src/bot_commands.c:2813`, which bitwise-ANDs the option value against the cvar). Distinct from Shape 11a (cvar-backed bitmask): that shape requires per-bit toggle commands; this cvar has no per-bit command surface and is exclusively server.cfg-driven.

### Proposed draft

```
Bitmask of Frogbot debug, visualization, and editor toggles. The value is bitwise-ANDed with each bit; default 0 disables all.

Effect:
  Bits:
    1  = SHOW_MARKERS: spawn visible gold-key marker indicators at navigation nodes (also implicitly enabled by bit 2).
    2  = EDITOR_MODE: enable the waypoint editor; the `botcmd` dispatcher swaps to its editor subcommand table, bot commands run on unsupported maps, marker colours are preserved, teleporters are linked, and the next-marker search radius is narrowed.
    4  = SHOW_DUEL_LOGIC: include duel logic (armor, damage, item-desire scores) in the bot-thinking dump.
    8  = SHOW_GOAL_LOGIC: include goal logic (per-marker goal list) in the dump.
    16 = SHOW_ROUTING_LOGIC: include routing logic (touch/linked/old-linked/goal markers) in the dump.
    32 = SHOW_MOVEMENT_LOGIC: include movement logic (velocity, obstruction, last direction) in the dump AND emit live G_sprint movement traces (linked-marker changes, jumps, hazard-avoidance decisions).
    64 = DEMOMARK_ROCKETJUMPS: call DemoMark() each time a bot performs a rocket-jump (writes a //demomark stuffcmd and, during a live match, an entry to the demo-marker table).
    128 = DEBUG_MOVEMENT: stream per-frame //botcmd-desired and //botcmd-modified aim debug lines into bot demos via STUFFCMD_DEMOONLY.
  Bits 4|8|16|32 = 60 is the composite SHOW_THINKING mask; the bot-thinking dump is enabled whenever any of those four bits is set.

Default: 0 (all options off).

Permission: server config only.

Example:
  // server.cfg -- enable the routing editor + visible markers
  set k_fb_options 3      // bits 1+2

  // server.cfg -- enable full bot-thinking dump while debugging AI changes
  set k_fb_options 60     // bits 4+8+16+32

See also: k_fb_enabled (master bot enable), botcmd (dispatcher that swaps subcommand tables on bit 2 / EDITOR_MODE), addmarker:frogbot:editor (editor subcommand only reachable when bit 2 is set), savemarker:frogbot:editor (same), Bot_Print_Thinking (consumer of the SHOW_THINKING composite mask)
```

### Notes

- Default 0 verified from `src/world.c:1055`: `RegisterCvarEx(FB_CVAR_OPTIONS, "0")`.
- Bit definitions verified at `include/fb_globals.h:8-16` -- the existing description's bit-to-name mapping is correct except for naming convention (this recast uses the canonical FB_OPTION_* constant names from source rather than ad-hoc prose labels).
- `FrogbotOptionEnabled` predicate verified at `src/bot_commands.c:2813`: `return (((int)cvar(FB_CVAR_OPTIONS)) & option);`.
- Editor-mode use site verified at `src/bot_commands.c:2384`: `commands = FrogbotOptionEnabled(FB_OPTION_EDITOR_MODE) ? editor_commands : std_commands;` -- this is the swap that makes the editor subcommands visible in the dispatcher menu.
- The "BOT_SUPPORT builds only" clause in the existing description is excluded from the recast per the same action-level rule applied to k_fb_autoadd_limit -- it's an implementation-level fact, not user-actionable.

<!-- entity: k_fb_quad_multiplier -->
## k_fb_quad_multiplier (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1066
- **Catalog line**: (ToT-mode rules cvar, mislabeled as Frogbot)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Quad-damage multiplier applied to attacker damage while their quad powerup is active, in the Tribe of Tjernobyl game mode (k_tot_mode 1) under deathmatch 4. Affects all attackers (bots and humans), not bots only. When k_tot_mode is off, quad damage uses 8x in deathmatch 4 and 4x in other deathmatch modes; this cvar is read only when both deathmatch 4 and ToT mode are active. Default 4; the /botcmd quadmultiplier <n> setter clamps n to the range 1-10.

### Shape classification

Shape 3 (server-config-only cvar primarily; runtime mutator routes via the `botcmd quadmultiplier` Shape 8 subcommand at `src/bot_commands.c:2270`). Read by `FrogbotQuadMultiplier` accessor at `src/bot_commands.c:130`, consumed by `combat.c:545` inside `T_Damage` at the quad-active branch as the multiplier for attacker damage.

### Proposed draft

```
Quad-damage multiplier applied to attacker damage while their quad powerup is active, scoped to deathmatch 4 with ToT (Tribe of Tjernobyl) mode active. Affects all attackers (bots AND humans) in that scope, not bots only -- the prefix is naming history, not behavior.

Effect:
  Inside T_Damage, when (a) the attacker holds quad and (b) deathmatch == 4 and (c) tot_mode_enabled() is true, the attacker's damage is multiplied by this cvar's value before being applied to the target. The check has no `isBot` gate -- if a human player holds quad in dmm4+ToT, the human's damage is also scaled by this value.
  Outside this scope, the cvar is not read: in dmm4 without ToT, quad damage uses the hardcoded 8x; in other deathmatch modes, quad damage uses the hardcoded 4x.

Default: 4.

Permission: server config (no range clamp on direct `set`), or in-game via the `botcmd quadmultiplier <n>` admin subcommand (which clamps n to the range 1-10).

Prerequisites: deathmatch 4 AND ToT mode (k_tot_mode 1) must both be active for this cvar to have any effect on damage.

Example:
  // server.cfg -- restore the standard dmm4 8x quad damage even under ToT
  set k_fb_quad_multiplier 8

  // or in-game (clamped to 1-10):
  /botcmd quadmultiplier 8

See also: k_tot_mode (the mode this cvar's effect is scoped to), tot (preset that enables ToT mode), totmode (toggle for ToT mode), quadmultiplier:frogbot:std (the in-game admin setter, clamped to 1-10), togglequad:frogbot:std (the grant/remove-quad admin command)
```

### Notes

- Default 4 verified from `src/world.c:1066`: `RegisterCvarEx(FB_CVAR_QUAD_MULTIPLIER, "4")`.
- "Universal attacker (bots AND humans)" verified at `src/combat.c:545`: `damage *= (deathmatch != 4 ? 4 : tot_mode_enabled() ? FrogbotQuadMultiplier() : 8);` -- there is NO `isBot` gate; the multiplier branches purely on game-mode state. The existing description already gets this right ("Affects all attackers (bots and humans), not bots only") -- the recast preserves this critical framing rather than collapsing to a "bot-only" reading the `k_fb_` prefix would suggest.
- Admin-setter clamp verified at `src/bot_commands.c:2260-2270` (range 1-10).
- Category-label note: same as k_fb_break_on_death / k_fb_health / k_fb_item_pickup_bonus -- ToT-mode game-rule cvar mislabeled as Frogbot by category_inferred. The headliner explicitly disambiguates ("affects all attackers, not bots only").

<!-- entity: k_fb_skill -->
## k_fb_skill (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1059
- **Catalog line**: (Frogbot family -- skill level)
- **Anchor**: 1.47-2-g67253dc

### Current description

> Default skill level applied to Frogbot AI players. Integer 0-20 (default 10); clamped to that range on read. Sets the difficulty profile for new bots added by /botcmd addbot and /botcmd fill, and is re-applied to existing bots whenever /botcmd skill <n> is issued -- the value is fed into SetAttributesBasedOnSkill, which writes the derived per-attribute cvars (k_fbskill_aim_*, k_fbskill_reactiontime, k_fbskill_movement*, k_fbskill_vol_*, etc.) that actually control bot aim error, reaction time, movement style, and volatility. Higher values produce stronger bots (tighter aim error, faster reaction, more aggressive movement); at skill >= 15 the bots will also attack respawning players. Also reported by the match settings summary as `Bot skill <n>`.

### Shape classification

Shape 3 (server-config cvar primarily; runtime mutator routes via the `botcmd skill <N>` Shape 8 subcommand at `src/bot_commands.c:486` and via `botcmd fill <skill>` at `src/bot_commands.c:1911`). Read by `FrogbotSkillLevel` accessor at `src/bot_commands.c:115`, consumed at every bot-add / skill-apply site.

### Proposed draft

```
Default skill level (0-20) applied to Frogbot AI players. Sets the difficulty profile new bots spawn with and is the input to the skill-attribute preset that writes the downstream `k_fbskill_*` cvars (aim error, reaction time, movement style, volatility).

Effect:
  Applied at three points:
    - `/botcmd addbot` (no skill arg): new bot inherits this cvar's value.
    - `/botcmd fill` (no skill arg): each new bot inherits this cvar's value.
    - `/botcmd skill <N>`: writes N back to this cvar AND re-applies the skill preset to all existing bots, which rewrites the downstream `k_fbskill_*` cvars.
  Higher values produce stronger bots: tighter aim error, faster reaction, more aggressive movement.
  At skill >= 15, bots will additionally attack respawning players (the `k_fbskill_aim_attack_respawns` rule fires on the easy preset's curve at that threshold).
  Value is reported in the match-settings summary banner as "Bot skill <N>".

Default: 10.

Permission: server config, or in-game via `/botcmd skill <N>`, `/botcmd addbot <N>`, or `/botcmd fill <N>` (all subject to the k_fb_admin_only gate).

Example:
  // server.cfg -- default bots to mid-skill
  set k_fb_skill 12

  // in-game runtime change (re-applies to all existing bots too):
  /botcmd skill 18

See also: k_fb_easy_skill_mode (selects which preset curve maps this value to the k_fbskill_* family), skill:frogbot:std (the in-game setter that also re-applies preset to existing bots), addbot:frogbot:std (spawn-time skill default), fill:frogbot:std (bulk-spawn skill default), k_fbskill_* family (the downstream attribute cvars this value drives)
```

### Notes

- Default 10 verified from `src/world.c:1059`: `RegisterCvarEx(FB_CVAR_SKILL, "10")`.
- Accessor + cast verified at `src/bot_commands.c:115`: `return (int)cvar(FB_CVAR_SKILL);` -- the existing description's "clamped to 0-20 on read" claim is not enforced at the accessor; the clamp happens later in the skill-application path (`bound(MIN_FROGBOT_SKILL, skill, MAX_FROGBOT_SKILL)` at `src/bot_botimp.c:264-265`). Recast omits the "clamped on read" framing since it's mid-stack, not at the cvar surface.
- Skill-applied write site at `src/bot_commands.c:486`: `cvar_fset(FB_CVAR_SKILL, new_skill);` -- this is the runtime store path from `/botcmd skill <N>`.
- "k_fbskill_aim_attack_respawns at >= 15" preserved from existing description; the easy-mode preset's threshold for this attribute was confirmed during the prior 2026-05-26-frogbot batch's F9 cross-card finding.

<!-- entity: k_fb_weapon -->
## k_fb_weapon (KTX cvar, Frogbot -- Shape 3)

- **Status**: drafted
- **Source**: src/world.c:1064
- **Catalog line**: (ToT-mode rules cvar, mislabeled as Frogbot)
- **Anchor**: 1.47-2-g67253dc

### Current description

> In ToT (Tribe of Tjernobyl) mode, forces all Frogbots to use the same weapon. Value is a weapon impulse: 1=axe, 2=sg, 3=ssg, 4=ng, 5=sng, 6=gl, 7=rl, 8=lg. Set via 'botcmd weapon <1-8|random>'. 0 or 'random' makes each bot pick a random weapon in the 2-8 range (sg..lg, axe excluded) on spawn. Outside ToT mode this cvar has no effect. Default 2 (sg).

### Shape classification

Shape 3 (server-config-only cvar primarily; runtime mutator routes via the `botcmd weapon` Shape 8 subcommand at `src/bot_commands.c:2212`). Read by `FrogbotWeapon` accessor at `src/bot_commands.c:125`, consumed at `src/bot_botweap.c:958` inside a `tot_mode_enabled()` branch to set each bot's desired weapon impulse.

### Proposed draft

```
ToT-mode bot weapon override. In ToT (Tribe of Tjernobyl) mode, forces all Frogbots to use the same weapon (or pick randomly each spawn). Outside ToT mode the cvar has no effect.

Effect:
  Value is a Quake weapon impulse:
    1 = axe
    2 = single shotgun (sg)
    3 = super shotgun (ssg)
    4 = nailgun (ng)
    5 = super nailgun (sng)
    6 = grenade launcher (gl)
    7 = rocket launcher (rl)
    8 = lightning gun (lg)
    0 = random per spawn (each bot rolls a random weapon in the 2-8 range -- sg through lg, axe excluded -- at each spawn).
  Applied at the bot-weapon-selection site only when tot_mode_enabled() is true; in non-ToT modes the cvar is not read and bots select weapons via their normal AI.

Default: 2 (single shotgun).

Permission: server config (no range clamp on direct `set`), or in-game via the `botcmd weapon <1-8|random>` admin subcommand (which validates the argument and accepts the literal string "random" as 0).

Prerequisites: ToT mode (k_tot_mode 1) must be active for this cvar to have any effect on bot weapon selection.

Example:
  // server.cfg -- ToT bots always use RL when ToT mode is active
  set k_fb_weapon 7

  // or in-game:
  /botcmd weapon 7         // lock to RL
  /botcmd weapon random    // random per spawn

See also: k_tot_mode (the mode this cvar's effect is scoped to), tot (preset that enables ToT mode), totmode (toggle for ToT mode), weapon:frogbot:std (the in-game admin setter), k_fb_health (sibling ToT-mode per-bot setup cvar)
```

### Notes

- Default 2 verified from `src/world.c:1064`: `RegisterCvarEx(FB_CVAR_WEAPON, "2")`.
- ToT-scope guard verified at `src/bot_botweap.c:955-967`: the `FrogbotWeapon()` consumer is inside `if (tot_mode_enabled()) { if ((fb_weapon = FrogbotWeapon())) { self->fb.desired_weapon_impulse = fb_weapon; } ... }`. Outside that block, the bot's weapon-selection AI handles the choice.
- Random-mode range 2-8 (axe excluded) preserved from the existing description -- the prior 2026-05-26-frogbot batch's `weapon:frogbot:std` recast verified this at `src/bot_client.c:155`: `i_rnd(2, 8)`.
- Category-label note: same as k_fb_break_on_death / k_fb_health / k_fb_quad_multiplier / k_fb_item_pickup_bonus -- ToT-mode game-rule cvar mislabeled as Frogbot by category_inferred. Headliner explicitly names ToT scope.

## Cross-card consistency notes

### F1: Five cvars are ToT-mode-scoped, NOT Frogbot AI -- shared category-label gap

**Cards involved**: `k_fb_break_on_death`, `k_fb_health`, `k_fb_quad_multiplier`, `k_fb_item_pickup_bonus`, `k_fb_weapon` (5 of the 15 batch cards).

**Finding**: Despite the `k_fb_` prefix and the `category_inferred = 'Frogbot'` label, these five cvars are ToT-mode (Tribe of Tjernobyl) game-rule knobs, not Frogbot AI tuning. Their behavior is gated on `tot_mode_enabled()` at the read site, not on `bots_enabled()` or `isBot`. Two are scoped MORE narrowly than just ToT: `k_fb_quad_multiplier` additionally requires `deathmatch == 4`; `k_fb_break_on_death` additionally requires `!self->isBot` (the auto-cast fires only for human players in ToT mode).

**Recast handling**: All five headliners name "ToT mode" explicitly (not "Frogbot AI"). Each card lists `k_tot_mode` as the Prerequisites mode-precondition. See-also routing centers on the ToT family (`k_tot_mode` / `tot` / `totmode`) rather than the bot-management family (`k_fb_enabled` / `botcmd`). The `k_fb_` prefix is acknowledged as naming history, not behavior.

**Cross-batch precedent**: The 2026-05-26-frogbot batch's F3 finding ("ToT name expansion inconsistency") and F5 finding ("`weapon:frogbot:std` ToT-mode scope restriction missing from existing description") already established this pattern at the subcommand-card level. This batch extends the ToT-scope discipline to the underlying cvars.

**Follow-up tracked**: the operator's batch-dispatch prompt notes a "categorization-accuracy follow-up #15" that will rebucket these five rows from `category_inferred = 'Frogbot'` to a more accurate ToT-mode bucket. This batch does NOT touch DB categorization; the recasts are scoped to L1 description prose and See-also routing.

### F2: `k_fb_quad_multiplier` damage scaling is universal (not bot-only) -- T_Damage has no isBot gate

**Cards involved**: `k_fb_quad_multiplier`.

**Finding**: The `k_fb_` prefix would lead a casual reader to assume "quad multiplier for bots only", but the consumer site at `src/combat.c:545` is inside `T_Damage` with NO `isBot` gate -- only the deathmatch-mode + ToT-mode gates. A human player holding quad in dmm4+ToT has their damage scaled by this cvar just like a bot does. This is critical for operators who think they are "buffing bots" by raising the value but are actually buffing all attackers.

**Recast handling**: The headliner explicitly says "Affects all attackers (bots AND humans) in that scope, not bots only -- the prefix is naming history, not behavior." The Effect bullet on T_Damage explicitly says "The check has no `isBot` gate".

**Cross-batch precedent**: The 2026-05-26-frogbot batch's `quadmultiplier:frogbot:std` subcommand card also preserved this universal-attacker framing in its Effect bullet ("quad damage is multiplied by this value", not "bot quad damage"). The cvar card here extends the same discipline.

### F3: `k_fb_debug` is registered-but-inert at this anchor; flagged for community confirmation

**Cards involved**: `k_fb_debug`.

**Finding**: At anchor 1.47-2-g67253dc the cvar has a registration site (`src/world.c:1060`) and a clear-to-0 site (`src/bot_botthink.c:371`) but NO read use-site that binds the cvar's value to runtime behavior. The path-debug toggle has been migrated to per-bot struct state (`self->fb.debug` at `src/bot_commands.c:785`, read at `src/bot_botpath.c:264`), and the only would-be set-to-1 call site (`src/bot_commands.c:788`) is commented out.

**Recast handling**: Card is `drafted_with_flag`, NOT parked. The synth produced 631 chars of source-traceable content (registered + cleared + commented-out-history) which the apply-pass-author can ship behind the flag pending community/operator confirmation. Confidence is explicitly marked low; the flag tells the operator "behavior may not match observable runtime -- C1 outreach pending."

**Halt judgment**: Did NOT trigger novelty park (trigger 1 or 4) -- the cvar's shape is unambiguously Shape 3 (server-config, no command pair, no current gate-read). The hedge is about *behavioral effect*, not about *shape classification*. Trigger 3 (source-vs-description-contradiction) was considered but rejected: the existing description is itself the source-honest description of the inert state, not a foundationally-wrong framing -- this is correctly a flag, not a park.

### F4: `k_fb_easy_skill_mode` existing description names wrong downstream-cvar family

**Cards involved**: `k_fb_easy_skill_mode`.

**Finding**: The existing description says the easy/default preset "writes the bot accuracy/dodge/lookahead/reaction/volatility/movement family (k_fb_skill_*, k_fb_aim_*, k_fb_movement_*, etc.)" but the actual downstream cvar family in source is `k_fbskill_*` (single token, no underscore between `fb` and `skill`) -- verified across `src/bot_botimp.c:15-54`. There is no `k_fb_aim_*` or `k_fb_movement_*` family in KTX.

**Recast handling**: `drafted_with_flag`. The recast points at `k_fbskill_*` (the source-true family name); the FLAG bullet in Notes calls out the existing description's typo for the apply-pass-author.

### F5: All 15 batch cvars are Shape 3 -- no novelty surfaced, no halt fired

**Cards involved**: all 15.

**Finding**: Every card classifies cleanly as Shape 3 (server-config-only cvar with no paired stand-alone toggle command). Five compose with Shape 4 (k_fb_admin_only gates `botcmd`; k_fb_enabled gates `bots_enabled()` checks across the bot subsystem). None hit a no-shape-match (trigger 1) or sui-generis (trigger 4) condition. Halt-on-novelty did NOT fire.

**Note on Shape 1 candidacy**: Three of the cvars (`k_fb_break_on_death`, `k_fb_easy_skill_mode`, `k_fb_item_pickup_bonus`) are toggled by botcmd subcommands (`breakondeath`, `easyskillmode`, `itempickupbonus`) via `cvar_fset(<cvar>, !cvar(<cvar>))`. Per the per-card skill's Shape 1 manual-flip variant rule (added 2026-05-27 after Gameplay rules F3), this would normally tag them as Shape 1 (functional). HOWEVER, the toggle commands are Shape 8 subcommands of the `botcmd` parent dispatcher, NOT stand-alone top-level commands -- they have no top-level `cmd_t cmds[]` registration row. The Shape 1 cvar+command relationship requires the command side to be a stand-alone command; these subcommand toggles don't qualify. The relationship is captured via See-also routing instead of a primary Shape tag. The cvar's primary shape remains Shape 3.

### F6: Audit-gate Pre-flight #5 surfaced the deliberate 78-entity diff -- explicitly accepted

**Finding**: The category-enumeration audit gate (Pre-flight #5, amendment 2026-05-27) compared the DB's `category_inferred = 'Frogbot'` row count (93) against this batch's entity_pre_fetch list (15) and surfaced the 78-row diff. The 78 omitted entities (78 of the 93) all appear in `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-26-frogbot.md` as already-drafted (verified by section-header count: 79 = 78 entity sections + 1 cross-card-notes section). The diff is the deliberate-subset shape the dispatcher-skill audit is designed to surface, and the operator's batch prompt explicitly accepts it.

**Gate behavior**: Gate did its job -- did NOT silently proceed. Diff was surfaced, evaluated, accepted; batch proceeded to dispatch.
