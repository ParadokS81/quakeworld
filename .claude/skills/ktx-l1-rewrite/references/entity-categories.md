# KTX entity categories

KTX exposes user-visible state and behavior in three categories. Knowing
which category an entity belongs to shapes the L1 description: the
"Set by" line, the example shape, and the See-also routing all differ.

## The three categories

### 1. `k_*` cvars -- KTX server-side state

Server configuration knobs. Typically set in `server.cfg`, but some are
mutated at runtime by admin commands.

- **Set by**: `server config only` (purest case) OR `server config or
  '<admin_command>' in-game` (mutable runtime case).
- **Examples (set-once)**: `k_admins`, `k_admincode`, `k_allowvoteadmin`,
  `k_vp_admin`.
- **Examples (runtime-mutable via paired command)**: `k_lock_hdp` (toggled
  by `hdptoggle`), `k_fp` / `k_fp_spec` (cycled by `fp` / `fp_spec`).
- **Source location**: registration via `RegisterCvar("k_name")` in
  `src/world.c`.

### 2. Userinfo keys -- per-client settings via `setinfo`

Per-player state stored in the client's userinfo string and read by the
server. Set by the player via `setinfo <key> <value>`. The server doesn't
write these.

- **Set by**: `any player via 'setinfo <key> <value>'`.
- **Examples**: `premsg`, `postmsg`, `kf` (bitmask incl. `KF_KTSOUNDS`),
  `k_sdir`.
- **Important false-positive**: not every `k_*` name is a cvar. `k_sdir`
  is k_-prefixed but IS a userinfo key, not a cvar. Verify by grep -- if
  it has a `RegisterCvar` in world.c, it's a cvar; if it's read via
  `ezinfokey(self, "name")`, it's a userinfo key.
- **Source location**: handler table in `src/g_userinfo.c` (e.g. `{ "kf",
  info_kf_update }`).

### 3. Commands -- imperative actions

Players or admins type these in-game. Role-gated by registration flag
(`CF_PLAYER`, `CF_BOTH_ADMIN`, `CF_REDIRECT`, etc.).

- **Set by**: `any player` / `any admin` / `any admin (pre-match)` etc. --
  match the role gate from the registration.
- **Examples (any player)**: `tpmsg`, `victim`, `killer`, `ksound1..6`,
  `handicap`.
- **Examples (admin)**: `hdptoggle`, `fp`, `fp_spec`, `ban`, `banip`,
  `banrem`, `/admin`, `/elect`.
- **Examples (server passthrough)**: `ban`, `banip`, `banrem` are
  `CF_REDIRECT` -- KTX bounces to mvdsv; the actual handler lives in
  mvdsv. From the user's POV these are still KTX commands.
- **Source location**: registration table in `src/commands.c` (`{ "name",
  handler, arg, CF_<flags>, CD_<name> }`).

## How this shapes L1 drafts

- **`k_*` cvars** get a value enum + Default + "Set by: server config..."
  line + Example showing the typical config line (and a paired runtime
  command if applicable).
- **Userinfo keys** get "Set by: any player via 'setinfo <key> <value>'" +
  Example showing `setinfo` invocations.
- **Commands** get "Set by: any player / any admin" + Example showing the
  invocation pattern (often `bind <key> <command>` for the common ones).

## Why this convention matters

- Maps to the right MENTAL MODEL for the reader: server-config vs
  client-config vs runtime-action.
- Tells the skill where to look in source: `world.c` for `k_*` cvar
  registrations, `g_userinfo.c` for userinfo handlers, `commands.c` for
  command registrations.
- The "Set by" line is load-bearing: a server admin reading the catalog
  needs to know what to put in `server.cfg` vs what's a player-side knob
  vs what's an in-game action.

## Naming nuances (false positives + false negatives)

- `k_sdir` -- k_-prefixed but USERINFO key, not cvar. Verify in source.
- `tp_*` cvars (in ezQuake, not KTX) -- ezQuake's teamplay cvars. Not
  KTX. If the dispatcher routes an `tp_*` entity to this skill, that's a
  pre-flight failure (entity not in KTX L1) -- abort.
- `sv_*` cvars -- mvdsv server-engine cvars. Not KTX. Same pre-flight
  failure if routed here.
- Commands with no special prefix can be anything from "anyone runs this"
  to "real admin only" -- always check the `CF_*` flag in the
  registration row.

## Skill behavior

The skill confirms the entity's category at Step 1 (read registration +
key read use-sites). If `entity_type` (input) doesn't match what the
source shows (e.g. dispatcher claimed `cvar` but source shows
`g_userinfo.c` handler), flag it as a `drafted_with_flag` and note the
input mismatch -- the dispatcher's L1 view may be wrong. If the source
shows no registration site at all, abort the pre-flight (entity not in
live L1).
