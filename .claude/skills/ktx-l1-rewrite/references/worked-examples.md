# Worked examples (one canonical card per shape)

Few-shot reference for the recast pattern of each KTX Layer B shape. The
canonical-card pointers in this file resolve to drafts in the findings file:
`/home/paradoks/projects/quakeworld/apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog-findings.md`.

For each shape: the canonical example, the source signature the skill should
grep for, the recast pattern in 2-3 lines, and the skill signals that
distinguish the shape from neighbors.

If the skill encounters an entity that doesn't fit ANY of these patterns,
park (trigger 1 -- no-shape-match). DO NOT add new shapes; that's the
operator's call.

---

## Shape 1: Cvar + paired toggle (binary flip)

**Canonical example:** `k_fallbunny` + `fallbunny` (findings lines
1105 / 1161). Other instances: `k_lock_hdp` + `hdptoggle`, `k_dis` +
`discharge`, `dp` + `droppack`.

**Source signature:** Cvar has `RegisterCvar("k_X")` in `world.c`; command
handler is `void Toggle<Name>(void)` in `commands.c` with
`match_in_progress` early-return + `cvar_toggle_msg(self, "k_X",
redtext(...))`.

**Recast pattern:**
- Cvar side: Headliner names what 0/1 means; Effect = value enum; Default;
  Permission = `server config or '<cmd>' admin command in-game`;
  Match-state = `pre-match only`; Example = server.cfg line + in-game
  command; See-also = paired toggle.
- Command side: Headliner = "Admin command that toggles the X rule
  (<cvar>)"; NO value enum (lives on cvar); Permission = `admin only`;
  Match-state = `pre-match only`; Example = bare invocation; See-also =
  paired cvar.

**Skill signals:** Look for `cvar_toggle_msg(self, "<exact-name>", ...)`
calls in the codebase -- one such site = Shape 1 base. If the toggle
handler has no additional mode-check, it's Shape 1 (not 1c).

---

## Shape 1c: Shape 1 + mode-precondition

**Canonical example:** `k_rocketarena` + `arena` (findings lines
1413 / 1468). Likely candidates: midair / instagib families when they
get walked.

**Source signature:** Toggle handler has `is_rules_change_allowed()` + a
mode-check like `if (!isDuel()) { print("Set 1 on 1 mode first"); return;
}`. The cvar's truth-check predicate also gates on the base mode (e.g.
`isRA()` = `isDuel() && cvar("k_rocketarena")`).

**Recast pattern:** Same as Shape 1 but ADD Prerequisites = the base mode
(quote the refusal message verbatim) on both cvar AND command cards.
Example shows mode-activation flow first then cvar set.

**Skill signals:** Mode-check predicate (`isDuel()`, `isCTF()`,
`deathmatch != 4`, etc.) inside the toggle handler before
`cvar_toggle_msg`. The base-mode predicate appears in BOTH the toggle
handler AND wherever the cvar's effect fires.

---

## Shape 1d: Preset + cvar + toggle triad

**Canonical example:** `tot` + `totmode` + `k_tot_mode` (findings lines
1515 / 1580 / 1634). Likely candidates: midair / instagib similar triads
when walked.

**Source signature:** Three entities. Preset is `DEF(UserMode)` in
`commands.c` with `<name>_um_init[]` cvar bundle that includes
`k_<modifier>_mode 1`. Toggle handler is `void Toggle<Name>(void)` with
mode-precondition + `cvar_toggle_msg` against the modifier cvar. Cvar is
registered standard.

**Recast pattern:**
- Preset card: Effect lists the entire cvar bundle; Permission = "any
  player or admin spectator"; Match-state = `pre-match only`; See-also =
  toggle + cvar + sibling presets + gating cvar.
- Toggle card: Headliner = "Toggles X mode on or off"; Effect = "flips
  `k_<modifier>_mode` between 0 and 1; does NOT touch the surrounding
  bundle"; Prerequisites = base mode; See-also = cvar + preset +
  mutually-exclusive modifiers.
- Cvar card: Headliner = "Whether X mode is currently active"; standard
  cvar shape; Prerequisites = base mode for runtime effect; See-also =
  preset + toggle.

**Skill signals:** Three entities exist for the same modifier (preset
sets a cvar that has its own paired toggle). Cross-link all three in
See-also.

---

## Shape 2: Cvar + paired cycle command (multi-value cycle)

**Canonical example:** `k_fp` + `fp` (no v2 draft yet; session-1 v1 form
in findings line range ~570-690 for `fp`/`fp_spec` family). The recast
pattern below is derived from the shape catalog, not a v2 worked example.

**Source signature:** Handler reads cvar, increments + wraps at array
length, writes back via `cvar_fset`, broadcasts.

**Recast pattern:** Cvar side carries the FULL preset table (typically
hardcoded built-ins). Command side prose carries cycle behavior OR points
at a canonical sibling (e.g. `fp_spec` -> "see fp"). See-also includes
direct-set hint per Shape 5 below.

**Skill signals:** `cvar_fset("k_X", (k_X.value + 1) %% N)` shape in the
command handler. The cvar has an array of presets it indexes into.

---

## Shape 3: Cvar with no paired command (set-once in config)

**Canonical example:** `k_admincode` (findings line 363, v1 shape -- recast
target). Other examples: `k_pow_check_time`, `k_pow_min_players`,
`k_allowvoteadmin`, `k_admins`.

**Source signature:** `RegisterCvar("k_X")` in `world.c`; no
`cvar_toggle_msg` site for it; no cycle handler.

**Recast pattern:** Standard cvar shape. Permission = `server config
only`. Example shows typical server.cfg setup including dependency cvars
(for keyword bleed). See-also = companion cvars or commands the cvar
GATES (Shape 4).

**Skill signals:** Cvar exists in source; no command handler writes it
back. The cvar's effect comes from being READ by other code paths (gating
commands, configuring behavior thresholds, etc.).

---

## Shape 4: Cvar that gates a command (without toggling it)

**Canonical example:** `k_allowvoteadmin` (findings line 413, v1 shape)
gating `/elect`. Other examples: `k_admins` gates `/admin` + `/elect`;
`k_lock_hdp` gates `/handicap`.

**Source signature:** Gated handler has `if (!cvar("k_X")) { print(...);
return; }`. Often paired with a refusal print like `"voting for admin is
disabled"`.

**Recast pattern:**
- Cvar side: prose names the gate behavior (what gets blocked when off);
  standard cvar shape; See-also -> gated command(s) (cross-link is
  critical).
- Gated-command side: prose opens with "Requires <gating_cvar> to be
  enabled" up front; See-also -> the gating cvar.

**Skill signals:** A cvar read inside `if (!...)` early-return at the
top of a command handler. Cross-link via See-also in BOTH directions.

---

## Shape 4b: Serverinfo-key-gated command

**Canonical example:** `giveme` (findings line 1209) gated by `*cheats`
serverinfo key.

**Source signature:** Gated handler has `if (strnull(ezinfokey(world,
"*key"))) { print("X are disabled"); return; }`.

**Recast pattern:** Same as Shape 4 but: gate is a serverinfo key (often
with `*` prefix for engine-controlled keys like `*cheats`, `*gamedir`,
`*version`), NOT a `k_*` cvar. Prose framing: "Requires the '<*key>'
serverinfo key to be set" rather than "Requires <cvar>". See-also points
at the serverinfo key by name; the key itself may or may not have its
own L1 card.

**Skill signals:** `ezinfokey(world, "*<key>")` read in the gate check
rather than `cvar("k_<key>")`. The user/admin sets the gate via
`serverinfo <key> <value>` rather than server.cfg cvar lines.

---

## Shape 5: Cycle-command escape via direct cvar set

**Canonical example:** `k_fp 1` jumps directly to Low without going
through `fp` cycle.

Not a separate entity-pair shape -- a property of Shape 2 cvars worth
documenting in the See-also of both sides. No standalone card; surface
inline as `See also: ...k_fp (cvar storing current preset; can be set
directly to skip cycling)`.

**Skill signals:** A Shape 2 cvar that ALSO accepts direct value-set
(any `cvar_fset` invocation with a literal value rather than a +1
increment). All Shape 2 cvars probably qualify; document the escape in
See-also rather than as its own shape.

---

## Shape 6: Stateful command + one-shot command pair (command-to-command)

**Canonical example:** `mmode` + `s-p` / `s-r` / `s-m` / `s-l` / `s-t`
(findings line 291; full mmode v2 draft below for reference).

**Source signature:** Persistent handler writes starred userinfo keys via
`SetUserInfo(... SETUSERINFO_STAR)`. One-shot handlers are often
registered as `dummy` at the command-table level with a CD-string
carrying the user-facing description; they're intercepted client-side by
the `ClientSay` interceptor rather than dispatched by their registered
handler.

**Recast pattern (mmode -- the stateful side):**
- Headliner: "Sets your 'talk-to' target for follow-up 'say' messages."
  Plus a "Not to be confused with engine messagemode 1/2/3" paragraph.
- Effect: list recipient modes as a scannable block (off, player, team,
  multi, name, rcon). Mention shortcut modes (`.`, `,`, `last`).
- Permission: `any player`.
- Example: shows mmode set + subsequent say + reply-target shortcut.
- See-also: one-shot counterparts (`s-p`, `s-r`, `s-m`), consumer command
  (`say`), nearby disambiguation (engine `messagemode 1/2/3`).

**Skill signals:** `SetUserInfo(... SETUSERINFO_STAR)` writes to a `*mm`-
style key. Consumer command (`ClientSay`) reads the key and dispatches.
One-shot siblings are registered with `dummy` handlers + CD-strings.

---

## Shape 7a: Election (time-boxed, with yes/no approval)

**Canonical example:** `elect` + `k_vp_admin` (findings line 1681).
Other examples: `suggestcolor` + `k_vp_suggestcolor`, captain election,
coach election.

**Source signature:** Starter handler sets `self->v.elect = 1` +
`self->v.elect_type = etX` and spawns an `electguard` think-entity with a
timeout (typically 60 seconds). The universal `yes`/`no` commands route
through the election-type dispatcher.

**Recast pattern (starter command side):**
- Headliner: "Starts an X election."
- Effect: broadcast + prompt-other-players-to-yes + time-box window +
  subsequent-invocation-toggle (re-run aborts your own pending election).
- Prerequisites: user-actionable / surprise-bearing gates only.
- See-also: threshold cvar + enable-gate(s) + universal `yes` / `no`.

Threshold cvar side uses standard `k_vp_*` shape.

**Skill signals:** Handler spawns an `electguard` or uses `self->v.elect`
field with a timeout. Universal `yes` / `no` commands consume the
election state.

---

## Shape 7b: Continuous toggle vote (no time-box, no yes/no)

**Canonical example:** `hook_smooth` (findings line 1849, canonical for
the hook family) + `k_vp_hookstyle` (threshold) + `k_ctf_hookstyle`
(state). Sibling reference cards: `hook_fast`, `hook_classic`,
`hook_crhook` (findings line 1908).

**Source signature:** Vote handler toggles `self->v.<voteflag>`,
broadcasts running tally via `G_bprint`, checks `get_votes_req(OV_X,
true)` to determine pass, applies effect via `cvar_fset` (or similar) on
pass. No time-box -- vote stays open continuously.

**Recast pattern (vote command side):**
- Headliner: "Casts (or withdraws) your vote to X."
- Effect: toggle + broadcast + threshold check + on-pass effect. The
  "re-running withdraws" behavior is the primary cast/withdraw cycle,
  NOT a "subsequent-invocation toggle" -- don't label it that way.
- See-also: threshold cvar + state cvar (if any) + sibling vote commands
  (when fan-out applies).

**Command-per-value fan-out modifier:** When the vote is over an
enum-valued state cvar with N values, KTX often defines N sibling vote
commands (`hook_smooth` / `hook_fast` / `hook_classic` / `hook_crhook`
for the 4 values of `k_ctf_hookstyle`). Use the canonical-card pattern:
one canonical card with full description; N-1 reference cards with
Headliner + delta only.

**Skill signals:** Per-player vote flag (`self->v.<voteflag>`),
`get_votes_req(OV_X, true)` check, no `electguard`, no timeout. If
multiple commands share the same state cvar (different values), apply
canonical-card pattern.

---

## Shape 8: Subcommand of a parent-dispatcher command

**Canonical example:** `addmarker:frogbot:editor` (findings line 2051) +
other Frogbot subcommands like `breakondeath` (line 1948), `fill` (line
2001). Parent dispatcher: `botcmd`.

**Source signature:** Parent dispatcher has `frogbot_cmd_t commands[N]`
array (e.g. `std_commands[]` + `editor_commands[]`) + a lookup loop in
`FrogbotsCommand`. Subcommand handlers are normal `void <name>(void)`
functions but only invoked through the parent dispatcher.

**Recast pattern:**
- Entity ID is namespaced (`<subcommand>:<parent>:<scope>`, e.g.
  `addmarker:frogbot:editor`); Headliner describes user-facing invocation
  (`<parent> <subcommand>`).
- Permission reflects the parent dispatcher's admin gate (often
  `k_fb_adminonly`); mention but don't restate full cvar behavior.
- If the subcommand belongs to a tooling-mode-gated table (editor-only),
  add a Prerequisites line: "X mode must be active -- otherwise the
  parent dispatcher hides this subcommand entirely (not just refused
  with a message; literally not in the menu)."
- See-also: parent dispatcher + relevant workflow siblings.

**Skill signals:** Entity ID contains `:` separator (namespaced). Source
has a per-dispatcher command table; subcommand handler is NOT in the
top-level `cmd_t cmds[]` table.

---

## Shape 9a: Side-channel cvar (user-influenced via another command's arg syntax)

**Canonical example:** `k_entityfile` (findings line 2108 -- full v2
draft below for reference).

**Source signature:** `cvar_set("<name>", arg_or_derived)` lives in a
non-handler engine function that processes another command's args (e.g.
`changelevel()` in `g_utils.c` processing the map name's `#` separator).
No matching `cvar_toggle_msg` / `cvar_fset` site; no gate-read site.

**Recast pattern (k_entityfile worked example):**
- Headliner names what the cvar carries + what consumer behavior depends
  on it (filename stem for aux file lookups).
- Effect lists consumer lookup paths (often a table format):
  ```
  maps/<entityfile>.bot           bot routing
  maps/<entityfile>.ent           entity override
  locs/<entityfile>.loc           location names
  race/routes/<entityfile>.route  race routes
  ```
- Prerequisites: variant `.ent` file must exist on disk before
  `forcemap <map>#<variant>` will work.
- Set by: side-effect of `'changelevel <map>#<variant>'` (typically issued
  via `forcemap`). Direct `set k_entityfile foo` is syntactically valid
  but overwritten on next map change AND points at non-existent files
  unless the variant was registered.
- Example: shows file placement + forcemap invocation + consumer
  behavior.
- See-also: forcemap, changelevel; sibling Shape 9b cvars.

**Skill signals:** `cvar_set("<name>", ...)` in a non-handler engine
function that parses another command's arg. The "side channel" is the
user-syntax embedded in another command's argument.

---

## Shape 9b: Engine-only state-mirror cvar (no user-actionable path)

**Canonical example:** `k_hoonymode_prevmap`, `k_hoonymode_prevspawns`
(not yet drafted; flagged in `k_entityfile` Notes for follow-up).

**Source signature:** `cvar_set("<name>", ...)` lives in a state-
transition function (match-end, map-change, mode-init); read site is a
sibling restoration function. NO command-arg-derived path; user has no
syntax to trigger the write.

**Recast pattern:**
- Headliner: "Engine state mirror -- not user-actionable. Persists \<X\>
  across \<Y transition\>."
- Effect: what the cvar persists, when the engine writes it, when the
  engine reads it.
- Prerequisites: typically none.
- Set by: "Engine internal only -- set automatically by `<function or
  event>`. Not user-actionable; direct `set` is overwritten on the next
  state transition."
- Example: SKIP the section (or use "Not user-actionable" placeholder).
- See-also: related engine-state-mirror cvars; the feature whose state
  is persisted.

**Skill signals:** `cvar_set` site is in a state-transition function
(match end, map change, mode init). No command parses an arg that
becomes the cvar value. User has no syntax to trigger the write.

---

## Shape 10: Curated-family help-printer command

**Canonical example:** `qizmo` (findings line 2245 -- full v2 draft below
for reference). Other instance: `options` (markets 16 match-setting
commands).

NOTE: `rules` was previously listed here as a Shape 10 instance but is
NOT -- `ShowRules` is a mode-aware state-printer (prints active game
mode + mode-conditional command hints) that looks roster-shaped but
isn't a hardcoded sibling roster. Classify as shape-less state-printer.
See the "Distinguish from these neighbors that are NOT Shape 10"
section in `shape-catalog.md`.

**Source signature:** Handler is a pure `G_sprint(self, 2, "%s..... <desc>\n"
..., redtext("<sibling1>"), redtext("<sibling2>"), ...)` call with the
sibling list hardcoded inline. No args, no state, no match-state check.

**Recast pattern (qizmo worked example):**
- Headliner: "Prints the qizmo command family roster -- three q-prefixed
  player commands that toggle qizmo-protocol features in the server's
  'fpd' serverinfo bitmask."
- Effect: enumerate the menu inline (table format):
  ```
  qlag........ lag settings        (toggles fpd bit 8)
  qenemy...... enemy vicinity      (toggles fpd bit 32 -- proximity reports)
  qpoint...... point function      (toggles fpd bit 128 -- waypoint markers)
  ```
- Brief historical/lore paragraph IF supported by source strings (the
  `CD_QIZMO` description string + `redtext("QiZmo X")` in sibling
  handlers).
- Permission: per CF_* flags on the help-printer's registration; note
  that sibling permissions may differ.
- Example: bare invocation + "see menu above".
- See-also: each sibling + related help-printers (qizmo / options
  reference each other).

**Companion-side discipline (apply to sibling cards too):** each
sibling's See-also should reference its help-printer parent. Cross-link
both directions.

**Skill signals:** Handler is a pure print routine (no state writes, no
dispatch). The siblings listed are independent top-level commands (NOT
subcommands of a parent dispatcher -- that's Shape 8). NOT to be confused
with introspective listers (`commands` / ShowCmds), usage tutorials
(`cam`), state reports (`about`), or dual-purpose state/setters (`dm`).

---

## Sui generis (no Layer B shape -- park trigger 4)

**Canonical park example:** `callalias` (findings line 2177).

This is what a PARK case looks like. The skill walks `callalias`,
classifies the source signature (server-side per-player timer + client-
side dispatch via `stuffcmd`), searches the catalog for shape matches,
finds NONE (`self->v.<timer>` fields exist elsewhere but for internal
display state, NOT command-installed deferred dispatch; `stuffcmd_flags`
calls elsewhere are demo-only metadata markers).

**Park rationale (from the findings draft):**
- No entity-pair relationship: not cvar+command, not command+command, not
  gating, not voting.
- Sui generis mechanism: server-side per-player timer state + client-side
  dispatch via stuffcmd.
- Surveyed for siblings; found NO matching pattern in current KTX.

**Park file entry should capture:**
- Trigger fired: 4 (sui-generis-mechanism).
- What the skill saw: the source signature + the lack-of-sibling search.
- Suggested manual investigation: if a future codebase walk (MVDSV,
  unezQuake, KTX additions) surfaces a sibling, the operator can
  crystallize a new shape. Until then, the entity stays parked.

**Note:** the operator may still want to draft this card by hand (as
they did in session 3). The skill does NOT pre-empt that -- the parked
file is the queue that surfaces the entity for operator attention.

---

## Mixed-shape feature-family (NOT a shape; cross-link discipline)

**Canonical example:** `k_spm_*` family (session 3, verdict-only -- no
drafts locked). The family includes `k_spm_color`, `k_spm_value`, etc.
Each entity individually classifies as Shape 3 (cvar-only), but the
family as a whole shows mixed shapes across siblings.

**Why this is NOT a new shape:** the canonical-card pattern (Shape 7
fan-out modifier) ONLY applies to near-identical siblings. When siblings
have meaningful behavioral differences (different gates, different
effects), they stay as separate full cards.

**Skill behavior:** classify each `k_spm_*` cvar individually per its own
shape (likely Shape 3). Use See-also cross-links to surface the family
relationship; do NOT collapse into a canonical-card pattern.

**Skill signals:** A namespaced family (`k_spm_*`, `k_lock_*`, etc.)
where the siblings are NOT near-identical. If you find yourself trying
to apply the canonical-card pattern to a family whose siblings differ
meaningfully, STOP -- they stay as full separate cards with See-also
cross-links.
