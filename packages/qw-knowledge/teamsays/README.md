# QuakeWorld Teamsay Scripts

Reference for ezQuake teamsay-script patterns: how players compose chat
messages in config.cfg, how runtime values get substituted into them, how
conditional expressions branch on game state, and the community conventions
around message families (report, coming, lost, need, point, kill-me, etc).

Source: `research/repos/ezquake-source/src/cmd.c` (the `Cmd_If_Old` /
`Cmd_If_New` implementation at line 2138 onwards), `src/parser.h` (the
`Expr_Eval` grammar), `packages/qw-config/src/data/ezquake-macros.json`
(the runtime token registry), and observed patterns across eight bundled
teamsay fixture configs under `apps/slipgate-app/assets/teamsays/`.

## What a teamsay is

Five output commands emit chat / console text:

| Command | Destination |
|---|---|
| `say <text>` | Global chat (all players). |
| `say_team <text>` | Team-only chat. The common case for tactical teamsays. |
| `say_me <text>` | Emote-style "* player does X". Rarely used in comp configs. |
| `echo <text>` | Local console only. Not visible to other players. |
| `tp_msg_*` family | Semantic message shortcuts that route through teamplay vars. See cvar families below. |

In fixtures, `say_team` dominates. Alias chains terminate at a `say_team`
(or `.msg.X` where `.msg.X` itself resolves to a `say_team`). The body
between `say_team` and end-of-line is the message payload and is subject
to two substitution passes: variable expansion (engine state + cvars)
and color-code interpretation (display-time only).

## Two evaluation pipelines

Teamsay logic runs in two distinct contexts. Both use `$var` / `%token`
sigils and both look similar at a glance, but they behave differently:

- **Output substitution** — the text inside a `say`/`say_team`/`say_me`
  body, after all `$var` expansions, is what the game sends. This is
  display-time rendering.
- **Condition evaluation** — the text inside `if <expr> then ... else ...`
  is expanded FIRST (same macro-pass as outputs), then the resulting
  literal string is parsed as an expression and evaluated to true/false.
  This is control-flow.

The same `$health` means different things in each context. In output:
the player's current health is substituted and displayed. In a condition:
the player's current health is substituted and then the resulting literal
is compared. Both work because ezQuake's command-buffer pre-expands `$var`
references on every argument before the command (`say_team` or `if`) runs.

## Variable expansion

### `$name` references

The `$name` pattern is resolved in this order:

1. **Engine-state tokens** — `$health`, `$armor`, `$cells`, `$location`,
   `$mapname`, `$weapons`, `$bestweapon`, `$powerups`, `$armortype`,
   `$colored_armor`, `$weaponnum`, `$ammo`, `$bestammo`, `$ledpoint`,
   `$ledstatus`, `$matchstatus`, `$matchtype`, `$point`, `$took`, etc.
   The full list is in `packages/qw-config/src/data/ezquake-macros.json`.
2. **User cvars** — `$tp_name_rl`, `$tp_weapon_order`, `$need`, `$took`
   (when user-written via `set_tp`), `$tvs_*`, `$h_*`, `$_report_*`, or
   any other cvar the user's config has set.
3. **Fallthrough** — an unknown `$xxxx` is left unresolved (preserved as
   literal text).

Recursion: if a cvar value contains more `$var` references, they get
re-expanded on the next pass. Depth is capped (ezQuake caps internally;
the slipgate simulator caps at 8 to match `AliasChainResolver`).

### `$qt`

`$qt` expands to a literal `"` (double-quote). Used to stringify a
sub-expression for `isin` / equality that would otherwise be interpreted
as bare tokens. Idiom: `if $qt$powerups$qt != $qt$tp_name_none$qt then ...`
is equivalent to `if "<powerups>" != "<tp_name_none>" then ...` after
expansion.

### `%N` positional args

`%1` through `%9` pick up positional arguments when an alias is called
with extra tokens. Example: `alias __alive "if ('%1' isin 'safe report')
then ..."` — called as `__alive safe` makes `%1` = `safe`. Common in
dispatch-table style aliases (hangtime fixture) where a single entry
point fans out by argument.

### `%token` inside say bodies

Some `%token` forms appear in output bodies as runtime placeholders
(e.g., `%h` for health, `%a` for armor, `%l` for location, `%b` for best
weapon, `%c` for cells, `%r` for rockets, `%n` for nails, `%s` for
shells, `%p` for powerups). Short forms map to their long counterparts
via ezQuake's internal table. In CONDITIONS, configs consistently use
`$health` / `$armor` / etc. (the `$`-prefixed form), not `%h` / `%a` —
because the `var2val_fnc` is NULL in `Cmd_If_New` (cmd.c:2056) so the
parser itself doesn't resolve `%` references; only the pre-expansion
pass handles `$`.

## The `if` expression grammar

Two forms exist. Dispatch rule: `Cmd_If_f` at cmd.c:2237 picks `Cmd_If_New`
when `Cmd_Argv(1)` starts with `(`, else `Cmd_If_Old`.

### Old form (`Cmd_If_Old`, cmd.c:2138)

```
if <e1> <op> <e2> [then] <cmd> [else <cmd>]
```

Exactly one binary comparison. No boolean chaining. Operators: `==`, `=`,
`!=`, `<>`, `<`, `<=`, `>`, `>=`, `isin`, `!isin`, `=~`, `!~`. Numeric
comparison when both operands parse as numbers (`is_numeric` + `Q_atof`);
else string comparison via `strcmp`. The `then` keyword is optional but
recognized and skipped.

Example (locktar.cfg):
```
alias _report "if $health < 1 then .lost else _report1"
```

### New form (`Cmd_If_New`, cmd.c:2039)

```
if (<expr>) then <cmd> [else <cmd>]
```

The expression inside the leading `(...)` is passed to `Expr_Eval_Bool`.
Grammar per `parser.h`:

- **Parens** `(`, `)`
- **Arithmetic binary**: `+`, `-`, `*`, `/` (and `+` for string concat)
- **Comparison**: `<`, `<=`, `=`, `==`, `!=`, `<>`, `>=`, `>`, `=~`, `!~`,
  `isin`, `!isin`
- **Logical**: `and` / `AND` / `&&`, `or` / `OR` / `||`
- **Unary**: `-`
- **Types**: double, integer, bool, string (quoted with `'...'` or `"..."`,
  or bare tokens delimited by whitespace)
- **Variables**: optional `%` prefix (but see note below)

Example (hangtime.cfg):
```
alias __kill_me "if ('$bestweapon' = '$tp_name_rl') and ($cells >= 6) \
                 then .msg.kill.me.rl.cells \
                 else if ('$bestweapon' = '$tp_name_rl') then .msg.kill.me.rl \
                 else __kill_me_lg"
```

### Precedence

Standard C-like, from highest to lowest:

1. Parens
2. Unary `-`
3. Arithmetic `*`, `/`
4. Arithmetic `+`, `-`
5. Comparison (`==`, `!=`, `<>`, `<`, `<=`, `>`, `>=`, `=`, `isin`, `!isin`, `=~`, `!~`)
6. `&&` / `and` / `AND`
7. `||` / `or` / `OR`

`&&` and `||` short-circuit.

### `isin` semantics

`a isin b` is `strstr(b, a)` — a is a SUBSTRING of b, not a token
membership test. `'rl' isin 'lg rl sg'` is true. `'rl' isin 'lgrlsg'`
is also true. `'rlx' isin 'lg rl sg'` is false.

`!isin` is the negation.

### Regex

`=~` and `!~` use PCRE2. Fixtures in practice do not use regex inside
`if` conditions. The slipgate-app simulator flags these as
`unsupported-regex` issues rather than trying to emulate PCRE2 in JS.

## The `$token` palette

Divided into three groups by origin:

### Engine state (set by the game runtime)

| Token | Meaning |
|---|---|
| `$health`, `$armor`, `$armortype` | Vitals. armor type class (ga/ya/ra/none). |
| `$weapons` | Space-joined list of owned weapons (as `tp_name_*` values). |
| `$weapon` | Currently selected weapon (as `tp_name_*` value). |
| `$bestweapon` | Highest-priority owned weapon with ammo, per `tp_weapon_order`. |
| `$weaponnum` | Impulse digit 1-8 of current weapon. |
| `$ammo`, `$bestammo` | Ammo count for current weapon / best weapon. |
| `$shells`, `$nails`, `$rockets`, `$cells` | Ammo counts per type. |
| `$powerups` | Space-joined list of active powerups (as `tp_name_quad` etc). |
| `$location`, `$mapname` | Where-am-I state. |
| `$matchname`, `$matchstatus`, `$matchtype` | Match context. |
| `$ledpoint`, `$ledstatus` | LED indicator colors. |
| `$point`, `$pointloc`, `$pointatloc` | Who the player is looking at. |
| `$took`, `$tookloc`, `$tookatloc` | Last item pickup. |
| `$droploc`, `$droptime` | Last backpack drop. |
| `$deathloc`, `$lastloc`, `$lastpowerup` | Recent-event state. |

### Derived (computed from engine state + cvars)

Engine-computed tokens that depend on user cvars to produce their display value:

- `$weapons` — joins owned weapons using user `tp_name_*` values in priority order.
- `$bestweapon` — walks `tp_weapon_order`, returns first owned-AND-has-ammo weapon's `tp_name_*` value. Falls back to `tp_name_sg` when nothing qualifies.
- `$powerups` — joins active powerups using `tp_name_quad` / `tp_name_pent` / `tp_name_ring` / `tp_name_biosuit`.
- `$armortype` — `tp_name_armortype_ga` / `_ya` / `_ra` / `_none` by armor class.
- `$colored_armor` — `$armor` value wrapped in `&cRGB` color codes per health-band thresholds (`<25` red, `25-49` yellow, `50-100` green, `>100` white).
- `$tp_powerups` — routes to `$colored_powerups` or `$colored_short_powerups` based on `tp_poweruptextstyle`.

### User-writable (set by config aliases via `set_tp` or `set`)

Tokens that look like engine state but are actually cvars the config
maintains itself:

- `$need` — what the player "needs" right now. Written by aliases that
  check ammo / armor / weapons and call `set_tp need <value>`.
- `$mytook`, `$mytookloc`, `$lasttook`, `$lasttookloc` — last-item
  tracking that the config maintains to avoid duplicate reports.
- `$tvs_*` — hangtime fixture's "TVS" (team value signal) variables —
  encoded strings assembled from multiple conditions.
- `$h_*` — dev fixture's stack-machine variables for priority-chain
  simulation.
- `$_report_*` — any config-specific state scaffolding.

A simulator or static analyzer must NOT treat these as engine tokens.
They're part of the config's own data model. The slipgate simulator
keeps them in the cvar map, not in `PlayerState`.

## cvar families

| Family | Role |
|---|---|
| `tp_name_*` | Display names for items, weapons, locations, status. Substituted into output messages. Example: `tp_name_rl "{&cf13rl&cfff}"` makes RL render with color codes. |
| `tp_need_*` | Thresholds: BELOW this value, the item is considered "needed" and flows into the `$need` string. Defaults: `tp_need_health 50`, `tp_need_armor 50`, `tp_need_rockets 5`, `tp_need_cells 30`. Shells/nails default to 0 (never considered needed). |
| `tp_name_need_*` | The SHORT names used when an item appears in `$need` (e.g., `tp_name_need_rl`, `tp_name_need_health`). Display-layer cvar, separate from the threshold. |
| `tp_msg_*` | Message bodies for semantic commands. `tp_msg_report <body>` makes `tp_msg_report` command emit that body. |
| `tp_weapon_order` | Impulse priority list for `$bestweapon` resolution. Accepts BOTH space-separated (`"8 7 5 3 4 6 2 1"`, engine default) and contiguous-digit (`"78564321"`, real user configs). Both formats work. |
| `tp_poweruptextstyle` | 0-1 toggle routing `$tp_powerups` to `$colored_powerups` (long) or `$colored_short_powerups` (short). |
| `tp_forceTriggers` | 0-1: allows `f_*` triggers to fire even in restricted rulesets. |
| `tp_soundtrigger` | Prefix character(s) that trigger sound alias lookup. |

## Common conditional patterns

Observed across fixtures; listed roughly by frequency.

### Health guard

```
if $health < 1 then .lost else _report1
if ($health < 1) then __dead else if ...
```

Fires nearly every fixture's top-level dispatch. If dead, emit the
location where you died or a "lost" variant; else continue.

### Weapon ownership check

```
if $tp_name_lg isin $qt$weapons$qt then _safe2 else .safe2
if ('$tp_name_rl' isin '$weapons' AND '$tp_name_lg' isin '$weapons') then __has_rlg else ...
```

`tp_name_lg isin weapons` works because `$weapons` expands to a
space-joined string of owned weapons' tp_name values, and `isin` is
substring.

### Best-weapon comparison

```
if $bestweapon = $qt$tp_name_lg$qt then .safe2 else .safe3
if $bestweapon isin $tp_name_sg|$tp_name_ng then .report3 else ...
```

The `|` in `$tp_name_sg|$tp_name_ng` isn't an operator — it's literal.
This pattern works because `$bestweapon` expands to a single
`tp_name_*` value and `isin` tests substring against the pipe-separated
literal list.

### Powerup test

```
if $tp_name_quad isin $powerups then .team_powerups else .getquad
if $qt$powerups$qt == $qt$tp_name_quad$qt then .reportpowq else _reportpow2
if ('$tp_name_pent' isin '$powerups') then .msg.point_eyes_pented else ...
```

Two shapes: substring test (anything-with-quad-in-it) vs exact-equality
(exactly and only quad).

### Location test

```
if ('$location' = 'quad-low') then .msg.dm2.trickjump else .msg.dm2.slipped
if ('big' isin '$location') then .quad_jump else ...
if $mapname = dm3 then set tvs_enemy_pos lift else if $mapname = dm2 then ...
```

Map-specific dispatch combined with location-specific logic.

### Match context

```
if ('$matchtype' == '2on2') then .lost else ...
if standby isin $matchstatus then _point5 else ...
if 4on4 isin $matchname then _lost1 else .lost
```

Skip certain behaviors during match setup, or dispatch differently per
mode (1on1/2on2/4on4/ffa).

### Need / took state machinery

```
alias _need "if $need != $tp_name_nothing then _need2"
alias _took "if $mytook isin $tp_name_quad then .team_powerups else ..."
```

Multi-alias state machines that track pickups and decide whether to
announce. Heavy use of user-writable cvars.

### Empty-branch idiom

```
if $ledpoint = $tp_name_status_green then else _pointx
if ('$need' == '$tp_name_nothing') then else .msg.need
```

`then else body` with an empty `then` branch. Valid ezQuake: when true,
do nothing; when false, run the else body. Effectively an inverted
guard. Not a bug, not a parse error.

## Fixture style differences

| Fixture | `if` style | Notable |
|---|---|---|
| `bps.cfg` | Quoted parenthesized throughout (`if ('$health' < '1')`). | bps-style verbose config. |
| `hangtime.cfg` | Quoted parenthesized with heavy compound conditions (`AND` / `OR`). Uses TVS state machine via `$tvs_*`. Has dispatch-table `__alive` pattern using `%1` positional. |
| `locktar.cfg` | Mix: old-form bare tokens (`if $health < 1 then`) AND quoted (`if $qt$powerups$qt == ...`). Lots of armor/weapon status reports. |
| `tiba.cfg` | Old-form bare tokens mostly. Powerup-aware variants (`_comingq` etc). |
| `dev.cfg` | Contains `h_*` stack-machine aliases — high-level variables encoded as packed decimals with push/pop operations. Non-trivial. |
| `phrenic.cfg` | Small (222 lines). Compact classic style. Good minimal reference. |
| `raket.cfg` | Medium. Classic shapes. |
| `xantom.cfg` | Small. Notable for weapon-trigger dispatch via `f_weaponchange`. |
| `sae.cfg` | Medium. Modern conventions. |
| `slime.cfg` | Medium. |
| `gt.cfg` | Medium. |

All fixtures evaluate correctly under either grammar form — the stylistic
differences do not change semantics.

## Quirks and gotchas

- **Contiguous-digit `tp_weapon_order`**: real user configs strip spaces
  (`"78564321"`). Tokenizers that split only on whitespace must fall back
  to per-character split when the whitespace split yields a single
  multi-character all-digit token.
- **Color-coded `tp_name_*` values**: `tp_name_rl "{&cf13rl&cfff}"` is a
  literal ezQuake-color-coded string. When it participates in `isin`
  comparisons, tokenizers must treat `{...}` as a single opaque string
  token. Otherwise `{`, `&`, `}` get dropped and the comparison fails.
- **Empty `then` branches** (see Common Patterns) are valid, not a parse
  error. Treat as "on true, do nothing."
- **`Cmd_If_Old` tolerates missing `then`**: `if A < B X else Y` is legal
  in the old form. `Cmd_If_New` requires `then`.
- **`var2val_fnc` is NULL in `Cmd_If_New`** (cmd.c:2056). The parser does
  not resolve `%var` references. Configs reference state via `$var`
  exclusively, which is pre-expanded by the command buffer before the
  `if` command sees it.
- **`$need` is empty-string by default** — configs that check
  `$need != $tp_name_nothing` compare against the user's
  `tp_name_nothing` cvar (typically `"nothing"` literal), not against
  empty string.
- **`set_tp` vs `set`**: `set_tp` sets a cvar AND marks it as
  teamplay-relevant (so it can flow into macros like `$need`). Plain
  `set` just sets it. Most need/took machinery uses `set_tp`.

## The `.loc` file format

Per-map location tables live in `qw/locs/<mapname>.loc`. Format:

```
x y z name
x y z name
...
```

Plain text, one location per line. Whitespace-separated: three integer
coordinates (the region centroid) followed by the location name (rest of
line, may contain spaces). ezQuake reads the file matching the current
map on join, and sets `$location` to the name whose coordinates are
closest to the player.

Example (dm3.loc excerpt):
```
-336 -1104 24 ra
-48 -480 24 ya
-672 272 168 quad
-816 -112 24 water
```

The set of possible `$location` values on a map is exactly the distinct
names in that map's `.loc` file. A teamsay builder tool can use this to
offer a dropdown of valid locations per map.

## Fixture pointers

For concrete patterns, grep these files under
`apps/slipgate-app/assets/teamsays/`:

- **`_report`, `_report1`, `_report2`** (locktar.cfg) — health guard +
  weapon-ownership branching. Canonical report flow.
- **`__kill_me`, `__kill_me_rl_check`, `__kill_me_lg`** (hangtime.cfg) —
  nested compound-condition dispatch for kill-me behavior variants.
- **`__check_armor`, `__check_health`** (hangtime.cfg) — TVS-state
  compound conditions producing encoded strings.
- **`__alive`** (hangtime.cfg) — dispatch table using `%1` positional
  arg to select a sub-branch.
- **`_need`, `_need2`, `_need3`** (tiba.cfg, locktar.cfg) — user-cvar
  state machine for pickup needs.
- **`_point`, `_point_eyes`, `_point_powerup`** (phrenic.cfg, locktar.cfg)
  — point-target dispatch with LED color logic.
- **`__dm2`, `__dm3`, `__map_trick_dm2`, `__enemy_pos1`..`_pos4`**
  (hangtime.cfg) — map-specific location dispatch.
- **`_took`, `_tooklast`, `_tookmega`, `_tookra`** (dev.cfg) — took
  announcement with state-aware variants.

## See also

- `packages/qw-config/src/data/ezquake-macros.json` — registry of all
  runtime tokens with descriptions and `related-cvars` metadata.
- `apps/slipgate-app/src/lib/simulator/` — reference implementation of
  the expansion + evaluation pipelines described here.
- `apps/slipgate-app/docs/superpowers/specs/2026-04-17-player-state-simulator-design.md`
  — design discussion and decision log.
- `apps/slipgate-app/src/lib/simulator/fixtures.test.ts` — fixture-driven
  flip-case tests; canonical behavioral contract.
- `research/repos/ezquake-source/src/cmd.c` — `Cmd_If_Old` / `Cmd_If_New`
  implementation.
- `research/repos/ezquake-source/src/parser.h` — `Expr_Eval` grammar.
- `packages/qw-knowledge/weapon-scripts/README.md` — the sibling
  reference for weapon-bind scripts. Same shape.
- `packages/qw-knowledge/terminology/glossary.yaml` — QW vocabulary
  pointer.
