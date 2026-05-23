# ktx-l1-rewrite parked entities -- batch 2026-05-23

Entities the skill could not confidently recast. Each entry names the park
trigger and the source signature observed. Operator reviews at end of batch.

## callalias (KTX command, Server config & network)

- **Source**: src/commands.c:993
- **Anchor**: v1.36-1633-g67253dc
- **Park trigger**: 4 sui-generis-mechanism

### What the skill saw

- Registration: `commands.c:993` -- `CF_BOTH | CF_MATCHLESS | CF_PARAMS`. Usable by players and admin spectators; no match-in-progress block; requires params.
- Handler (`commands.c:8351-8400`): stores alias name in per-player field `self->callalias` (via `strlcpy`) and sets `self->callalias_time = g_globalvars.time + tm`. Four early-return gates: 15-second post-connect window, delay 1-30s range, single-pending-slot (rejects if `self->callalias_time` non-zero), non-empty alias name.
- Dispatch (`commands.c:8402-8411`, called from `client.c:4333`): `check_callalias()` runs on every server think (`BothPostThink`). When the timer elapses, fires `stuffcmd_flags(self, STUFFCMD_IGNOREINDEMO, "%s\n", self->callalias)` -- client-side deferred execution of the stored alias name. `STUFFCMD_IGNOREINDEMO` suppresses replay during demo playback.
- Mechanism: server-side per-player timer + deferred client-side dispatch via `stuffcmd_flags`. The command does not toggle a cvar, cycle a value, gate another command, set userinfo state for a consumer, run a vote, print a menu, or dispatch to subcommands. None of the 14+ catalog shapes match.
- Sibling search: `strlcpy(self->callalias, ...)` is the only instance in KTX of copying a command name into a per-player field for later dispatch. All other `stuffcmd_flags` calls in `commands.c` are immediate (connection alias setup at line 1271, cmdslist_dl protocol at line 1407, noweapon config at line 5327) -- none involve a stored name executed after a timer delay. Other per-player `*_time` fields (`shownick_time`, `pos_move_time`, `wp_stats_time`, `sc_stats_time`) drive internal display state, not client-side command execution. No sibling found.
- Existing description is factually accurate (no trigger 3 contradiction); the park is purely sui-generis on the mechanism.

### Suggested manual investigation

- The existing description is accurate; operator may draft the v2 card by hand using the universal shape v2 template directly. The mechanism is clear from source; hand-drafting is low-risk.
- `CF_BOTH` covers both players and admin spectators; existing "Set by: any player" is slightly incomplete -- the hand-drafted card should use "any player or admin spectator".
- If a future KTX addition, MVDSV feature, or unezQuake command surfaces a similar deferred-dispatch-via-stuffcmd pattern with a per-player timer field, this may crystallize a new shape. Until then the entity stays shape-less.
- `STUFFCMD_IGNOREINDEMO` behavior (alias does not fire during demo playback) may be worth surfacing in the card's Effect section -- it's a surprise-bearing constraint for players recording/reviewing demos.
