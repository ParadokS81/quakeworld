# KTX Layer B shape catalog

When drafting an L1 description for a KTX entity (cvar OR command), the FIRST
decision is: which of these shapes is in play? Each shape tells you which
Layer A sections of the v2 universal shape are populated, where the value
enum lives, what goes in See-also, and what relationship-tags apply.

Pairs with `universal-shape-v2.md` (Layer A specifics) and
`entity-categories.md` (the three-bucket category model).

Shape catalog grew organically through KTX catalog walks (sessions 1-3,
2026-05-22 / 2026-05-23). Open-ended -- future walks and other codebases
(MVDSV / QWFWD / QTV) will surface more. THIS SKILL DOES NOT EXTEND THE
CATALOG. When an entity doesn't fit any shape, park it (trigger 1) -- the
operator extends the catalog when sibling patterns surface.

## Earn-their-keep discipline (why this skill parks 1-of-1s)

Open-ended doesn't mean permissive. A new shape gets added to this catalog
only when:

1. **Template differentiation passes**: the candidate produces a Layer A
   template that differs from existing shapes in *load-bearing* ways -- not
   just cosmetic differences. Load-bearing = a section appears/disappears, a
   See-also relationship inverts, a Prerequisite category changes. Cosmetic =
   wording variance only.
2. **Instance count passes**: 2-3 confirmed KTX instances, OR strong-pattern
   evidence that the shape appears in adjacent codebases (MVDSV / QWFWD /
   QTV).

If both pass: the operator locks the shape with standard sections.
If only template-differentiation passes (1-of-1): the entity gets parked here
(trigger 4 in `park-triggers.md`). DON'T promote yourself; park.
If neither: the entity is shape-less; apply the v2 universal shape without a
Layer B tag.

The risk this prevents: shape proliferation that turns Layer B into a noise
floor rather than a decision tool. A drafter should scan shape names and
reach for the right template fast.

## Shapes are facets, not exclusive buckets

An entity can have **multiple shape facets at once**. The shape catalog is
not a partition; it's a vocabulary of relationship patterns that compose.

Example: `elect` is simultaneously:
- Shape 7 (vote-threshold cvar + vote-casting command), pairing with `k_vp_admin`
- Shape 4 (gated by `k_allowvoteadmin`)
- Shape 4 (gated by `k_admins`, the master admin-system toggle)

The vote-casting facet AND the two gate-facets all apply to the same command.
The L1 card lists all three relationships -- threshold cvar + both gate cvars
-- in See-also, and the two gate prerequisites in Prerequisites.

Shape identification produces a **SET of applicable facets**, not a single
classification. The drafter walks through each shape and asks "does this
entity also have THIS relationship?" until all facets are surfaced.

Common compositions:
- Shape 7 + Shape 4 -- vote command gated by an enable-cvar
- Shape 7 + Shape 1c -- vote command with mode-precondition (hook-style votes
  need CTF)
- Shape 1 + Shape 4 -- toggle command gated by an enable-cvar
- Shape 1c + Shape 1d -- mode-modifier with preset half (TOT)

## The shape catalog

### Shape 1: Cvar + paired toggle command (binary flip)

The cvar holds a 0/1 state. A bare command flips it (via `cvar_toggle_msg`).
Both are typically pre-match-only.

Examples: `k_fallbunny` + `fallbunny`, `k_lock_hdp` + `hdptoggle`, `k_dis` +
`discharge`, `dp` + `droppack`, `k_nightmare_pu` + `nightmare_pu`.

Source signature (canonical variant): handler is `void Toggle<Name>(void)` with
`match_in_progress` early-return + `cvar_toggle_msg(self, "<cvar>",
redtext(...))`.

**Source signature -- manual-flip variant (also Shape 1)**: a handler that
performs the same binary 0↔1 flip on a paired cvar via `cvar_fset("<cvar>",
!cvar("<cvar>"))` OR `trap_cvar_set_float("<cvar>", ...)` (often with a
private `G_sprint` / `G_bprint` instead of `cvar_toggle_msg`'s built-in
broadcast). User-observable behavior is identical to the canonical variant:
binary flip via a paired toggle command. Classify as **Shape 1 (functional)**
and add a one-line Notes entry: "toggle uses manual `cvar_fset` /
`trap_cvar_set_float`, not `cvar_toggle_msg`". Confirmed instances:
`teleteam` ↔ `k_tp_tele_death`; `tkfjump` / `tkrjump` (via shared `t_jump`
handler) ↔ `k_disallow_kfjump` / `k_disallow_krjump`; `hdptoggle` ↔
`k_lock_hdp`. **Do NOT force manual-flip toggles to shape-less** -- the
cvar+command relationship is what Shape 1 captures; forcing shape-less
hides the relationship from See-also routing. Added 2026-05-27 after
Gameplay rules batch F3.

**Cvar side**: value enum (0/1), Default, Set by `server config or '<cmd>'
in-game (pre-match only)`, Example with both server.cfg line + in-game
command, See also -> paired toggle + override modes.

**Command side**: NO value enum (lives on the cvar card). Headliner:
"Toggles the X rule (<cvar>)" -- prefix with "Admin command that" ONLY if
the registration flag is `CF_BOTH_ADMIN` (truly admin-only). Most KTX
Shape 1 commands are `CF_PLAYER | CF_SPC_ADMIN` ("any player or admin
spectator", NOT admin-only); for those, drop the "Admin command" framing.
See `universal-shape-v2.md` Permission discipline table for the
CF-flag-to-wording mapping. Optionally note refusal conditions (race/yawn
etc). Example: bare command invocation. See also -> paired cvar + override
modes.

**Discipline note (added 2026-05-26)**: a prior version of this template
prescribed `"Admin command that toggles..."` Headliner prose universally,
inherited from a misread of `CF_PLAYER | CF_SPC_ADMIN` as admin-only. The
Mode selection batch's F1 cross-card finding caught the systemic mislabel;
source check at `include/g_local.h:647-658` confirms `CF_PLAYER` (bit 0,
"command valid for players") is the any-player flag, while `CF_PLR_ADMIN`
(bit 2) is the actual player-admin-required flag. Shape 1 commands using
`CF_PLAYER | CF_SPC_ADMIN` are any-player + admin-spectator, not admin-only.

### Shape 1c: Shape 1 + mode-precondition

Variant of Shape 1 where the paired toggle also requires a specific base mode
to be active. The cvar is a *modifier* on top of a base mode (e.g. Rocket
Arena on top of duel). Toggling is refused outside the prerequisite mode.

Examples: `k_rocketarena` + `arena` (requires 1on1/duel mode); future
candidates likely include the midair / instagib families.

Source signature: toggle handler has `is_rules_change_allowed()` + a
mode-check like `if (!isDuel()) { print("Set 1 on 1 mode first"); return; }`.
The cvar's truth-check predicate also gates on the base mode (e.g. `isRA()` =
`isDuel() && cvar("k_rocketarena")`).

**Cvar side**: value enum (0/1), Default, Prerequisites = the base mode,
Permission = "any player or admin spectator", Match-state = "pre-match only",
Example with mode-activation first then cvar set, See also -> paired toggle
command + prerequisite mode.

**Command side**: NO value enum (lives on cvar). Headliner names the cvar it
toggles. Prerequisites = the base mode (quote refusal message verbatim).
Permission + Match-state as above. Example shows mode-activation flow. See
also -> paired cvar + prerequisite mode.

### Shape 1d: Preset + cvar + toggle triad

Three-entity variant of Shape 1c: a usermode-preset command (`tot`) bundles
the base-mode-switch + sets the modifier cvar (`k_tot_mode 1`) + applies
other rule tweaks; a paired toggle command (`totmode`) flips ONLY the
modifier cvar; the cvar (`k_tot_mode`) is the state. All three exist as
separate L1 entities and cross-link via See-also.

Examples: `tot` + `totmode` + `k_tot_mode`. Likely candidates for the same
shape across other modifiers-on-modes (midair, instagib, etc).

Source signature: preset is `DEF(UserMode)` with `<name>_um_init[]` cvar
bundle that includes `k_<modifier>_mode 1`. Toggle handler is `void
Toggle<Name>(void)` with mode-precondition + `cvar_toggle_msg` against the
modifier cvar.

**Preset (`tot`) side**: Headliner names the mode (e.g. "Applies the Tribe
of Tjernobyl preset"). Effect lists the entire cvar bundle. Prerequisites =
`k_allowed_free_modes` must permit selection. Permission = "any player or
admin spectator", Match-state = "pre-match only". Example shows preset
application + later toggle-modifier-off flow. See also -> the toggle command
+ the cvar + sibling presets (1on1, ffa, ctf, ca, ...) + the gating cvar.

**Toggle (`totmode`) side**: Headliner says "Toggles X mode on or off".
Effect = "flips `k_<modifier>_mode` between 0 and 1; does NOT touch the
surrounding bundle". Prerequisites = the base mode (quote refusal message).
Permission + Match-state as preset. Example shows mid-session toggle flow.
See also -> the cvar + the preset + mutually-exclusive modifiers.

**Cvar (`k_tot_mode`) side**: Headliner = "Whether X mode is currently
active". Value enum 0/1. Prerequisites = the base mode for runtime effect
("setting this without the base mode has no behavioral effect"). Default = 0.
Permission = "server config, or in-game via the preset or toggle command".
Example = server.cfg line. See also -> the preset + the toggle.

### Shape 2: Cvar + paired cycle command (multi-value cycle)

Cvar holds an index into a preset array. Bare command increments + wraps.

Examples: `k_fp` + `fp` (Low/Med/High flood-protection), `k_fp_spec` +
`fp_spec`.

Source signature: handler reads cvar, increments + wraps at array length,
writes back via `cvar_fset`, broadcasts.

**Cvar side**: value enum is the FULL preset table (typically hardcoded
built-ins). Default, Set by, Example. See also -> paired cycle command +
direct-set hint ("can be set directly to skip cycling" -- this is Shape 5
below).

**Command side**: prose carries the cycle behavior OR points at a canonical
sibling for the preset table (e.g. `fp_spec` -> "see fp"). Set by, Example,
See also -> paired cvar.

### Shape 3: Cvar with no paired command (set-once in config)

Server-side state with no in-game toggle. Set in server.cfg.

Examples: `k_admincode`, `k_pow_check_time`, `k_pow_min_players`,
`k_allowvoteadmin`, `k_admins`, `k_vp_admin`.

Source signature: `RegisterCvar` in world.c, no `cvar_toggle_msg` site for
it.

**Template**: standard cvar shape. Set by `server config only`. Example:
server.cfg lines showing typical setup including dependency cvars (for
keyword bleed). See also: companion cvars or commands the cvar GATES
(Shape 4).

### Shape 4: Cvar that gates a command (without toggling it)

Cvar is read by a different command as a gate condition. Neither toggles the
other.

Examples: `k_admins` gates `/admin` + `/elect`; `k_lock_hdp` gates
`/handicap` (player command); `k_allowvoteadmin` gates `/elect`.

Source signature: gated handler has `if (!cvar("k_x")) { print(...); return;
}`.

**Cvar side**: prose names the gate behavior (what gets blocked when off).
Standard cvar shape. See also -> the gated command(s) (cross-link is critical
-- users querying the command will need to find this gate).

**Gated-command side**: prose: "Requires <gating_cvar> to be enabled" up
front (so the gate doesn't surprise the reader). See also -> the gating cvar.

### Shape 4b: Serverinfo-key-gated command

Variant of Shape 4 where the gate is a **serverinfo key** (set externally via
the `serverinfo` command or engine config), not a `k_*` cvar. The gating
mechanism lives outside KTX -- it's a QW-engine-level serverinfo string.

Examples: `giveme` gated by `*cheats` serverinfo key; broadly, most
cheat-mode commands.

Source signature: gated handler has `if (strnull(ezinfokey(world, "*key")))
{ print("X are disabled"); return; }`.

**Template differences from Shape 4**:

- The gate is NOT a `k_*` cvar entity; it's a serverinfo key (often with `*`
  prefix for engine-controlled keys like `*cheats`, `*gamedir`, `*version`).
- See-also on the gated command points at the serverinfo key by name (e.g.
  `*cheats`); the key itself may or may not have its own L1 card.
- Prose framing: "Requires the '<*key>' serverinfo key to be set" rather than
  "Requires <cvar>".
- The user/admin sets the gate via `serverinfo <key> <value>` rather than via
  server.cfg cvar lines.

### Shape 5: Cycle-command escape via direct cvar set

A cycle command exists (Shape 2), but admins can also set the underlying
cvar directly to a specific index without cycling.

Example: `k_fp 1` jumps to Low without going through `fp` cycle.

Not a separate entity-pair shape -- a property of Shape 2 cvars worth
documenting in the See-also of both sides:

> See also: ...k_fp (cvar storing current preset; can be set directly to skip
> cycling)

### Shape 6: Stateful command + one-shot command pair (command-to-command)

NOT a cvar+command shape. Two commands in a state/no-state pair: one
persistent (sets userinfo state that another command reads to dispatch
behavior), one one-shot (performs the same routed action without persistent
state). The relationship is command-to-command rather than cvar-to-command.

Examples: `mmode <X>` (persistent recipient state) <-> `s-p` / `s-r` / `s-m`
/ `s-l` / `s-t` (one-shot per-recipient sends). Both route through
`ClientSay` (`g_cmd.c:287`) -- the persistent form sets `*mm` / `*mp` /
`*mt` / `*mu` / `*ml` userinfo keys; the one-shot form short-circuits the
userinfo check and routes directly.

Source signature: persistent handler writes starred userinfo keys via
`SetUserInfo(... SETUSERINFO_STAR)`. One-shot handlers (often registered as
`dummy` at the command-table level with a CD-string carrying the user-facing
description, e.g. `commands.c:935` for `s-r`) are intercepted client-side by
the `ClientSay` interceptor rather than dispatched by their registered
handler.

**Stateful (`mmode`) side**: Headliner = "Sets your X for follow-up
<consumer> messages". Effect = "Sets state in <userinfo keys>. <Consumer
command> reads <key> to route subsequent invocations". List recipient modes
as a scannable block. Prerequisites = usually none. Permission + Match-state
appropriate. Example shows state-set + subsequent consumer invocation. See
also -> the one-shot counterparts (`s-X` family) + the consumer command +
any nearby disambiguation (e.g. engine `messagemode 1/2/3` for `mmode`).

**One-shot (`s-p` / `s-r` / `s-m` / ...) side**: Headliner = "<one-shot
action> without setting persistent state". Effect = single send.
Prerequisites = usually none. See also -> the stateful counterpart (mmode) +
sibling one-shots.

Naming-collision note: stateful command names often collide with unrelated
engine commands (e.g. KTX `mmode` vs engine `messagemode 1/2/3`). A "Not to
be confused with" paragraph in the Headliner is often warranted -- this is
the load-bearing disambiguation the reader needs.

### Shape 7: Vote-threshold cvar + vote-casting command (with two sub-variants)

A vote-casting command pairs with a percentage-threshold cvar (`k_vp_<X>`)
that controls how many approvals are needed. Frequently composed with Shape 4
(an enable-gate cvar like `k_allowvoteadmin` or `k_no_vote_map`) and
sometimes Shape 1c (mode-precondition like CTF for hook-style votes).

Source signature (common to both sub-variants): threshold cvar is read at
vote-tally time; vote command writes per-player vote state and broadcasts via
`G_bprint`. Pass-threshold check is `(votes_yes / eligible_voters) >=
(k_vp_X / 100)` with a minimum of 2 votes regardless of player count;
percentages below 51 are clamped to 51.

Two sub-variants split by *how the vote is cast*:

#### Shape 7a: Election (time-boxed, with yes/no approval)

One starter command initiates a time-boxed election. All other players cast
approvals via the universal `yes` command (or rejections via `no`). Election
expires on timeout if threshold not met.

Examples: `elect` + `k_vp_admin` (admin election); `suggestcolor` +
`k_vp_suggestcolor` (color-suggestion election); captain election; coach
election.

Source signature: starter handler sets `self->v.elect = 1` + `self->v.elect_type
= etX` and spawns an `electguard` think-entity with a timeout (typically 60
seconds). The universal `yes`/`no` commands route through the election-type
dispatcher.

**Threshold cvar side**: standard `k_vp_*` shape.

**Starter command side**: Headliner = "Starts an X election." Effect describes
the broadcast, the prompt-other-players-to-yes, the time-box window, and the
subsequent-invocation-toggle (re-run aborts your own pending election).
Prerequisites lists user-actionable / surprise-bearing gates only. See also ->
threshold cvar + enable-gate(s) + universal `yes` / `no` commands.

#### Shape 7b: Continuous toggle vote (no time-box, no yes/no)

Each command IS the vote-toggle for one specific option. Re-running
withdraws. No universal `yes`/`no` involved. Threshold checked on each
toggle; the vote can pass at any time. No time-box -- the vote stays "open"
continuously until threshold or session end.

Examples: `antilag` + `k_vp_antilag`; `votecoop` + `k_vp_coop`; `voteprivate`
+ `k_vp_privategame`; `teamoverlay` + `k_vp_teamoverlay`; `pickup` +
`k_vp_pickup`; `cm` + `k_vp_map`; `next_map` + `k_vp_map`; the hook-style
family + `k_vp_hookstyle`.

Source signature: vote handler toggles `self->v.<voteflag>`, broadcasts
running tally via `G_bprint`, checks `get_votes_req(OV_X, true)` to determine
pass, applies effect via `cvar_fset` (or similar) on pass.

**Threshold cvar side**: standard `k_vp_*` shape.

**Vote command side**: Headliner = "Casts (or withdraws) your vote to X."
Effect describes the toggle + broadcast + threshold check + on-pass effect.
Prerequisites lists user-actionable / surprise-bearing gates only. The
"re-running withdraws" behavior is the natural cast/withdraw cycle (not a
"subsequent-invocation toggle" in the elect-aborts sense -- it's the primary
cast/withdraw mechanism, not an exception). See also -> threshold cvar +
state cvar (if any) + sibling vote commands (when Shape 7b + fan-out
applies).

#### Modifier: command-per-value fan-out

When the vote is over an enum-valued state cvar with N possible values, KTX
often defines N sibling vote commands -- one per value -- instead of a single
starter that takes the value as an argument.

Example: `k_ctf_hookstyle` is enum-valued (1-4). Four vote commands fan out:
`hook_smooth` (votes for value 1), `hook_fast` (2), `hook_classic` (3),
`hook_crhook` (4). Each is its own independent vote channel (per-player
flags `self->v.hooksmooth`, `self->v.hookfast`, etc).

Multiple sibling votes can be active simultaneously: voting smooth and fast
at the same time is allowed; whichever channel reaches threshold first wins.

This is a composable modifier on Shape 7b (and potentially 7a, though no
examples found yet). When this modifier is present, use the
**canonical-card pattern** (below): one of the N sibling cards carries the
full description; the rest are short reference cards.

**Composition with Shape 4 gates**: when a Shape 7 command is also gated by
a Shape 4 enable-cvar (`k_allowvoteadmin` for `elect`; `k_no_vote_map` for
`next_map` -- inverted; `k_privategame_voteable` for `voteprivate`), the
gate is listed both in Prerequisites AND in See-also.

#### Canonical-card pattern (discipline for N-sibling fan-outs)

When N near-identical sibling entities exist (the ksound1..6 family from
session 1; the hook_smooth/fast/classic/crhook family from session 2),
centralize the description on ONE canonical card; the other N-1 cards are
short reference cards that point at it and carry only the per-sibling delta.

Layout:
- Canonical card: full v2 description -- Effect / Prerequisites / Permission /
  Example / See-also. Notes section identifies the card as canonical for the
  family.
- Reference cards: Headliner only ("Casts vote for X (k_X = 2). See
  <canonical> for the full vote-channel behavior. This command sets <state> =
  2 on pass instead of 1."), plus minimal See-also pointing at canonical +
  state cvars.

Why: 4-5 near-identical cards is bloat (95% duplication) AND a maintenance
burden (fix one, must fix all). Canonical-card pattern keeps the catalog's
"one entity = one card" rule (each entity still has its own card for direct
`lookup_entity` matching) while centralizing content.

When NOT to use: if the siblings have meaningful behavioral differences
(different gates, different side-effects, different consumer dispatch), keep
separate cards. Canonical pattern is for *near-identical* siblings only.

### Shape 8: Subcommand of a parent-dispatcher command

A parent command dispatches to N subcommands via an internal lookup table
(typically a `struct { name, func, description }[]` array). Each subcommand
is registered as its own L1 entity with a namespaced ID, even though the
user-facing invocation is `<parent> <subcommand>`.

Examples: `botcmd` dispatcher (in `src/bot_commands.c:2383`
`FrogbotsCommand`) routes to ~40 subcommands across two tables
(`std_commands[]` at line 2315 + `editor_commands[]` at line 2332). Each
subcommand is an L1 entity named `<subcommand>:frogbot:<scope>` (e.g.
`addbot:frogbot:std`, `addmarker:frogbot:editor`).

Source signature: parent dispatcher has `frogbot_cmd_t commands[N]` array +
a lookup loop. Subcommand handlers are normal `void <name>(void)` functions
but only invoked through the parent dispatcher -- they're not registered in
the top-level `cmd_t cmds[]` table.

**Entity naming**: subcommands get namespaced L1 IDs
(`<subcommand>:<parent>:<scope>`). The user-facing invocation is `<parent>
<subcommand>`. The Headliner should describe the user-facing invocation; the
entity ID is metadata.

**Composition with admin gating**: the parent dispatcher often has a uniform
admin gate (`k_fb_adminonly` for `botcmd`). The gate is per-dispatcher, not
per-subcommand -- mention it on each subcommand card but don't duplicate the
cvar's full value-by-value behavior on every subcommand (the gate cvar's own
card carries that).

**Composition with tooling-mode prerequisite**: some dispatchers swap between
subcommand tables based on a runtime tooling state (botcmd's editor-mode
toggle). Editor-only subcommands use the **hide-when-inactive** pattern --
they literally don't appear in the dispatcher's help output unless the
tooling mode is active. Distinct from refuse-with-message; surface as a
labeled Prerequisites bullet.

**Card structure**:

- *Parent dispatcher* (e.g. `botcmd`): gets its own L1 card describing the
  dispatcher's role + the admin gate + how to discover subcommands. List
  subcommands by category (std / editor) -- pointer to each subcommand's L1
  card.
- *Each subcommand*: full v2 card with Headliner / Effect / Prerequisites /
  Permission / Example / See-also. Permission line reflects the parent
  dispatcher's gate. See-also includes the parent dispatcher + relevant
  workflow siblings.

### Shape 9: Engine-written state-mirror cvar (no command pair, no safe user-`set`)

A cvar registered with `RegisterCvar` or `RegisterCvarEx(name, "")` (no
default or empty default) + NO paired toggle or cycle command + NO direct
`set` path that produces user-visible behavior. The cvar is written by
ENGINE code via `cvar_set("<this>", ...)` (not by command handlers) and read
later by engine code to drive behavior -- typically filename-stem lookups,
state restoration across map transitions, or runtime bookkeeping.

Two sub-facets distinguish whether the user has any influence on the write:

#### Shape 9a: Side-channel cvar (user-influenced via another command's arg syntax)

The user CAN trigger the cvar write by embedding a particular syntax in
another command's argument (the "side channel"). The cvar is user-actionable
-- just via an indirect path, not via direct `set`.

Examples: `k_entityfile` -- set by `changelevel <map>#<variant>` (typically
issued via the `forcemap` admin command); stores the full string including
the `#`.

Source signature: `cvar_set("<name>", arg_or_derived)` lives in a
non-handler engine function that processes another command's args (e.g.
`changelevel()` in g_utils.c processing the map name's `#` separator). No
matching `cvar_toggle_msg` / `cvar_fset` site; no gate-read site.

**Template**:
- Headliner names what the cvar carries and what consumer behavior depends
  on it.
- Effect lists the consumer lookup paths or behavior switches (often a table
  when multiple consumers).
- Prerequisites lists what the user must set up for the side-channel set to
  do anything (e.g. variant `.ent` file must exist on disk before `forcemap
  <map>#<variant>` will work).
- Permission / Set-by: names the side-channel command + syntax (e.g.
  `'changelevel <map>#<variant>'`, typically issued via `forcemap`). Notes
  that direct `set <cvar>` works syntactically but is overwritten on the
  next side-effect write AND points at non-existent state unless the variant
  was registered.
- Match-state: when the side-effect write takes effect (typically on the
  next consumer read).
- Default: typically empty (so the consumer falls back to a derived default
  like the bare mapname).
- Example: shows the side-channel command flow end-to-end (file placement +
  command invocation + consumer behavior).
- See-also: the side-channel command(s); sibling Shape 9 cvars.

#### Shape 9b: Engine-only state-mirror cvar (no user-actionable path)

Pure engine bookkeeping. The cvar persists state across map transitions or
match phases so engine code can restore prior state later. User has no
influence and should not set it directly -- the engine will overwrite on the
next state transition.

Examples: `k_hoonymode_prevmap`, `k_hoonymode_prevspawns` (set by
`HM_store_spawns` on match end; read by `HM_restore_spawns` on map load to
decide whether to restore prior per-spawn nominations).

Source signature: `cvar_set("<name>", ...)` lives in a state-transition
function (match-end, map-change, mode-init); read site is a sibling
restoration function. NO command-arg-derived path; user has no syntax to
trigger the write.

**Template**:
- Headliner: "Engine state mirror -- not user-actionable. Persists \<X\>
  across \<Y transition\>."
- Effect: describes what the cvar persists, when the engine writes it, when
  the engine reads it.
- Prerequisites: typically none (engine self-manages).
- Permission / Set-by: "Engine internal only -- set automatically by
  `<function or event>`. Not user-actionable; direct `set` is overwritten on
  the next state transition."
- Match-state: when writes / reads happen (e.g. "written at match end; read
  at next map load").
- Default: typically empty.
- Example: SKIP the section (or use a "Not user-actionable" placeholder) --
  user has nothing to invoke.
- See-also: related engine-state-mirror cvars; the feature whose state is
  persisted (e.g. hoonymode for the `k_hoonymode_prev*` family).

### Shape 10: Curated-family help-printer command

A standalone command whose only job is to print a hardcoded menu of N
sibling commands with one-line descriptions. The siblings exist as
INDEPENDENT top-level entities (separate registrations, separate handlers)
-- the help-printer just markets the family as a discoverability anchor. No
state, no side effects beyond printing.

Distinct from Shape 8 (parent-dispatcher) -- Shape 10 has no dispatch; the
siblings are top-level commands, not subcommands. Distinct from Shape 7's
command-per-value fan-out -- those siblings share a single underlying
mechanism (one cvar's value enum); Shape 10 siblings have independent
mechanisms unified only by theme/namespace.

Examples (KTX, 2 confirmed):
- `qizmo` -> markets the q* family (qlag / qenemy / qpoint --
  qizmo-protocol fpd-bitmask toggles)
- `options` -> markets 16 match-setting commands (time / frags / dm / tp /
  drop* / spawn / speed / etc.)

Source signature: handler is a pure `G_sprint(self, 2, "%s..... <desc>\n"
... , redtext("<sibling1>"), redtext("<sibling2>"), ...)` call with the
sibling list hardcoded inline. No args, no state, no match-state check.

**Template**:
- Headliner = "Prints the <family> command roster -- N <theme> commands."
- Effect = enumerate the menu contents inline (so LLM/catalog consumers see
  the family without invoking in-game). Use a small table format:
  `sibling........ description (one-line context if useful)`.
- Prerequisites = usually none (unless the help-printer itself is
  class-gated, e.g. spectator-only).
- Permission = per CF_* flags on the help-printer's registration; note that
  sibling permissions may differ.
- Match-state = usually any-time (read-only).
- Default = N/A (it's a command).
- Example = trivial: bare invocation + reference to "see menu above".
- See-also = each sibling command in the menu + related help-printers if
  there's a sibling pattern (qizmo / options reference each other; cam
  help-printer is adjacent but different sub-pattern).

Companion-side discipline (apply to sibling cards too): each sibling's
See-also should reference its help-printer parent. Cross-link both
directions so users discovering a sibling can find the family roster and
vice versa.

Distinguish from these neighbors that are NOT Shape 10:
- **Introspective command lister** (`commands` / ShowCmds): iterates the
  command table dynamically with class/permission/match-state filters +
  optional substring search. Output is per-caller-dynamic. 1-of-1 in KTX;
  shape-less for now -- crystallize if a sibling surfaces.
- **Usage tutorial** (`cam` / ShowCamHelp): explains keybindings / controls,
  not a sibling list. Different content shape.
- **State report** (`about` / ShowVersion): prints server identity panel,
  not a help menu. Different purpose.
- **Dual-purpose state/setter** (`dm` / ShowDMM): with args = mode setter,
  without args = state display. Not pure help.
- **Mode-aware state-printer** (`rules` / ShowRules): prints active game
  mode + mode-conditional command hints (CTF lists hook/tossrune/tossflag/
  flagstatus; team mode lists scores/stats/efficiency). Looks roster-shaped
  but the listed commands are *contextual hints inside a state report*,
  not a curated family-of-siblings marketing roster. Output is
  per-mode-dynamic, not a hardcoded sibling list. Shape-less state-printer,
  not Shape 10. (Anti-pattern lesson: previously mis-classified as Shape
  10 during the catalog walk; corrected 2026-05-24 after the
  ktx-l1-rewrite Server-config-fanout pass verified `ShowRules` source.)

### Shape 11: Per-bit XOR toggle on shared bitmask state container

A shared bitmask container (cvar or serverinfo key) holds N independent flag
bits. Each bit has its own top-level toggle command that XOR-flips that bit
(and only that bit) via a per-handler `^=` followed by a cvar-write or
`serverinfo`-write callback. Sibling commands operate independently; each
owns exactly one bit.

Distinct from Shape 1 (cvar+toggle binary flip): Shape 1 has ONE toggle
command for the whole cvar value (0↔1). Shape 11 has N toggle commands, each
operating on one bit of a multi-bit state container.

Distinct from Shape 8 (parent-dispatcher subcommands): Shape 8 has ONE
top-level command that routes args to internal subcommand handlers. Shape 11
has N separate top-level commands, each independently registered.

Distinct from Shape 3 (server-config-only cvar): bitmask data shape alone is
not Shape 11; Shape 11 requires per-bit toggle commands.

Two sub-facets distinguish the container type:

#### Shape 11a: cvar-backed bitmask

State container is a registered KTX cvar. Each toggle handler reads
`cvar("<name>")` into a local int, XORs a `(1<<N)` / `MI_*` constant, writes
back via `cvar_fset`. NO `cvar_toggle_msg`.

Examples (1 confirmed family in KTX):
- `k_spec_info` (MI_ON bit 0 / MI_ADM_ONLY bit 1, `include/g_consts.h:282-283`)
  -- `infospec` toggles MI_ON (`CF_PLAYER | CF_SPC_ADMIN`); `infolock`
  toggles MI_ADM_ONLY (`CF_BOTH_ADMIN`). ASYMMETRIC permissions across
  siblings (variant note below applies). Consumer `mi_print` at
  `commands.c:7102-7148` reads both bits via `mi_on()` / `mi_adm_only()`
  helpers; `moreinfo` at `commands.c:7151-7175` is the spectator-side
  per-recipient filter level cycler gated on MI_ON.

Source signature: handler reads `cvar("<bitmask_cvar>")` into a local int,
XORs a `(1<<N)` named constant, writes back via `cvar_fset`. NO
`cvar_toggle_msg`. Toggle handlers typically share a `match_in_progress`
early-return.

**Cvar side**: Headliner names the cvar + bitmask role. Effect enumerates
bits by name + per-bit user-observable effect + the standard combined-value
example (e.g. `3 = 1 + 2`). Default, Set-by lists server-config + every
per-bit toggle command. Example shows both `server.cfg <cvar> <combined>`
AND in-game toggle flow. See-also -> every per-bit toggle command
(load-bearing -- the cvar is how users discover the family).

**Toggle command side** (one per bit): NO value enum (lives on cvar card).
Prose names which bit it owns + the user-observable effect + the broadcast
wording. Per-command CF_* flags (may differ across siblings). See-also ->
paired cvar + sibling toggles owning other bits.

#### Shape 11b: serverinfo-key-backed bitmask

State container is a QW serverinfo key (read via `iKey(world, "<key>")`,
written via `localcmd("serverinfo <key> %d ...")`). NOT a KTX `k_*` cvar --
the container has no L1 card of its own.

Examples (1 confirmed family in KTX):
- `fpd` serverinfo key -- `ToggleQLag` (bit 8, `commands.c:3686`),
  `ToggleQEnemy` (bit 32, `commands.c:3702`), `ToggleQPoint` (bit 128,
  `commands.c:3719`); 4 commented-out historical siblings at bits
  256/512/16384/32768; `silence`/`ToggleSpecTalk` also XORs bit 64 mid-match
  (Shape 1 + Shape 11b composition -- silence's primary shape is Shape 1
  against k_spectalk; the fpd-bit-toggle is a downstream side effect).
  Family is marketed via Shape 10 (`qizmo` curates the q* roster).

Source signature: handler reads `iKey(world, "<key>")` into a local int,
XORs a bit constant (literal int or named `#define`), writes back via
`localcmd("serverinfo <key> %d\n", val)`. NO `cvar_*` writes.

**State container side**: NO L1 card exists for the serverinfo key itself.
Reference the key in each toggle command's Effect/Set-by line. The bit
roster + combined-value examples typically live on the Shape 10
help-printer's card (where one exists), since there's no container card to
anchor them.

**Toggle command side** (one per bit): same shape as 11a, but Set-by names
the serverinfo write path (`localcmd("serverinfo <key> ...")`) rather than
`cvar_fset`. See-also points at the Shape 10 help-printer (if present) +
sibling toggle commands.

#### Variant: asymmetric permissions across siblings

When sibling toggle commands have different CF_* permissions (as in
k_spec_info: infospec player+spc_admin vs infolock admin-only), surface the
asymmetry explicitly on the cvar's Permission line ("server config or any
of the listed toggle commands in-game; each toggle has its own permission
scope -- see per-command cards"). Per-command cards carry their own CF_*
flags as usual. Not a separate sub-facet; applies to either 11a or 11b.

#### Composition with Shape 10

11b families often pair with a Shape 10 help-printer for discoverability
(qizmo for fpd's q* family). The Shape 10 card carries the family roster +
cross-references; the Shape 11b individual cards carry per-bit mechanics.
Shapes are facets, not exclusive buckets.

#### Distinguish from these neighbors that are NOT Shape 11

- **Single command with subcommand-args dispatching bit toggles** -> Shape 8
  (parent-dispatcher). Example: `nwp <weapon_name>` at `commands.c:5279`
  routes 8 weapon-name args to per-bit XOR ops on `k_disallow_weapons`. ONE
  command, N subcommand-args -- not Shape 11.
- **Single command toggling the whole cvar value (0↔1, not per-bit)** ->
  Shape 1.
- **Bitmask cvar with no toggle commands (purely server-config-set)** ->
  Shape 3, even if the data shape is bitmask.

## Tooling-mode prerequisite (category-of-prerequisite)

Distinct from existing prerequisite categories:

- **Game-mode prerequisite** (Shape 1c): "requires CTF / dmm4 / duel" -- the
  active game mode
- **Match-state prerequisite**: "pre-match only" / "any time" / "mid-match
  only"
- **Gating cvar prerequisite** (Shape 4 / 4b): "k_X must be enabled" /
  "serverinfo key must be set"
- **Tooling-mode prerequisite** (NEW): "frogbot editor mode must be active"
  -- a runtime tooling state controlling which subset of subcommands are
  *available at all*

Defining feature: when the tooling mode is inactive, the entity isn't just
refused -- it's *not in the dispatcher menu*. Different surfacing pattern
from refuse-with-message gating. Surface in Prerequisites as: "X mode must
be active -- otherwise the parent dispatcher hides this subcommand entirely
(not just refused with a message; literally not in the menu)."

## How to identify the shape

1. Is the entity a cvar or a command?
   - **Cvar**: Look at `RegisterCvar` in world.c. Does any handler call
     `cvar_toggle_msg(self, "<this>", ...)` or `cvar_fset("<this>", ...)`?
     - YES with `cvar_toggle_msg` -> Shape 1 (basic) or Shape 1c (if the
       toggle handler also has a mode-precondition like `isDuel()` /
       `deathmatch != 4`) or Shape 1d (if a usermode-preset command ALSO
       sets this cvar as part of a bundle). Find the command + check for
       the preset sibling.
     - YES with `cvar_fset` in a cycle pattern -> Shape 2. Find the
       command.
     - YES with `cvar_fset` in a per-bit XOR pattern (handler reads
       `cvar("<this>")` into local int, XORs `(1<<N)` / named bit
       constant, writes back; siblings each own one bit) -> Shape 11a.
       Find all sibling toggle commands.
     - NO -> Either Shape 3 (no command at all), Shape 4 / 4b (gating
       cvar), or Shape 9 (engine-written state-mirror). Grep for
       `cvar("<this>")` or `ezinfokey(world, "*<this>")` to find
       gate-reading commands AND for `cvar_set("<this>", ...)` to find
       engine-write sites.
       - Engine-write site present in a non-handler engine function (e.g.
         g_utils.c, hoonymode.c, client.c) -> Shape 9. Determine sub-facet:
         9a if the write derives from another command's arg-parsing
         (side-channel-user-set); 9b if the write fires on a pure engine
         state transition (match-end, map-change, mode-init).
       - Gate-read site present in a command handler -> Shape 4 / 4b.
       - Neither -> Shape 3 (set-once in server.cfg).
   - **Command**: Look at its handler in commands.c. Does it call
     `cvar_toggle_msg`?
     - YES -> Shape 1 / 1c / 1d; find the cvar named in that call + check
       for a mode-precondition + check for a preset sibling.
     - NO but it cycles via `cvar_fset` -> Shape 2.
     - NO and it just READS a cvar via `cvar("k_x")` -> Shape 4 (gated
       command).
     - NO and it sets userinfo state via `SetUserInfo(... SETUSERINFO_STAR)`
       that another command reads via `iKey(self, "*<key>")` /
       `ezinfokey(self, "*<key>")` -> Shape 6 (stateful + one-shot pair).
       Find the one-shot siblings (often `dummy` handlers in the command
       table with CD-strings carrying the user description).
     - NO but the handler reads a bitmask state container (cvar via
       `cvar("<name>")` OR serverinfo via `iKey(world, "<key>")`), XORs
       ONE specific bit, writes back via `cvar_fset` (cvar) or
       `localcmd("serverinfo <key> ...")` (serverinfo); siblings each own
       one bit -> Shape 11a (cvar-backed) or Shape 11b (serverinfo-backed).
       Find sibling toggle commands.
     - NO and the handler is a pure `G_sprint` listing N other command names
       with one-line descriptions (no state writes, no dispatch) -> Shape
       10 (curated-family help-printer). Verify the listed siblings exist
       as independent top-level commands (not subcommands of a dispatcher).
   - **Usermode preset command** (`DEF(UserMode)` in commands.c): Look at
     its `<name>_um_init[]` cvar bundle. Does it set a `k_<modifier>_mode 1`
     cvar?
     - YES with a paired toggle command (e.g. `totmode`) -> Shape 1d
       (preset + cvar + toggle triad).
     - NO (preset just bundles cvars, no modifier-cvar with paired toggle)
       -> Plain mode preset; treat as Shape 3-like (the bundle IS the
       description).

2. After classifying, check for Shape 5: does a cycle command have a
   hardcoded clamp + wrap? If yes, note the direct-set escape in See-also.

3. If nothing fits cleanly -> park (trigger 1, no-shape-match). DO NOT add
   a new shape; that's the operator's call.

## Why each shape matters for L1 drafting

- Each shape gives the drafter a known template skeleton -- speeds up
  writing significantly.
- Tells you where the value enum lives: ALWAYS on the cvar card, NEVER on
  the command card (for cvar-pair shapes 1/1c/1d/2).
- Tells you where the See-also points: paired command for Shapes 1/1c/1d/2;
  gated command for Shape 4/4b; no command pointer for Shape 3; sibling
  one-shot commands for Shape 6.
- Avoids the mistake we caught on `fallbunny`: command card had a 0/1 enum
  that belonged on the cvar card.
- Layer B of the two-layer architecture (Layer A in `universal-shape-v2.md`)
  -- this catalog is what tells the drafter HOW to fill the Layer A
  sections.
