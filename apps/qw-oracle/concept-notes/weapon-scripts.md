---
title: "QuakeWorld weapon scripts: the three practical methods"
slug: weapon-scripts
topic: domain-guide
status: draft
authored_by: qw-oracle
source_url: https://ezquake.com/docs/weapon-scripts
imported_from: 44f5b9b566ce138c258c0f3521f2e4e2308a0e6b
last_imported_at: 2026-04-24
upstream_status: gap-candidate
upstream_target: weapon-scripts
primary_contributors:
  - "@ParadokS"
  - "@johnnycz"
  - "@meag"
  - "@BLooD_DoG"
  - "@vikpe"
related_entities:
  - ezquake:cvar:cl_weaponpreselect
  - ezquake:cvar:cl_weaponhide
  - ezquake:cvar:cl_weaponforgetorder
  - ezquake:cvar:cl_weaponhide_axe
  - ezquake:command:+fire
  - ezquake:command:-fire
  - ezquake:command:+fire_ar
  - ezquake:command:-fire_ar
  - ezquake:command:weapon
  - ezquake:command:+attack
  - ezquake:command:-attack
  - ezquake:command:impulse
  - ezquake:commit:7c328aa4
  - ezquake:commit:ab813f8a
  - ezquake:commit:db269539
scope: cross-engine
engines_covered: [ezquake, fte]
last_updated: 2026-04-25
---

# QuakeWorld weapon scripts: the three practical methods

## Summary

QuakeWorld weapon-bind configs reduce to three practical methods, defined by what the user does at the keyboard: **quickfire** (one press selects and fires), **manual select+fire** (two separate presses, one to select, one to fire), **hold-modifier + fire** (hold one button to rebind the fire key, then press fire).

The recommended form is **quickfire via `bind X "+fire_ar N M"`**. `+fire_ar` bundles weapon-selection and attack into a single usercmd frame (eliminating the one-frame exposure window older forms produce) AND handles the multi-key rollover case when two fire keys are held in quick succession. `+fire` is the simpler single-key ancestor; use it when you want the behavior without the key-stack handling. Sections below cover each method's canonical form, modulation cvars, historical context, and cross-engine support.

### Why preselect+hide matters: the "walking backpack"

In QuakeWorld, the dropped backpack on death contains **the single weapon you were holding** plus all your spare ammo. Other weapons you owned are simply lost on respawn -- they don't go into the backpack for the enemy to grab. So the practical question is: at the moment you die, which weapon is in your hand? If the answer is RL or LG, the enemy gets it. If the answer is axe (or shotgun), they get a backpack with no power-weapon upgrade.

The community label for poor weapon discipline here is **"walking backpack"** -- a player whose scripts leave them holding their best weapon between fights. Used as a 4on4 callout: dp_blood_dog, 2024-01-26, after a player reverted from `+fire` binds back to old `impulse+attack` aliases: *"then you're a walking backpack in 4on4"* (Discord #quakeworld). The fix is mechanical, not skill: scripts that preselect-fire-and-hide atomically so you idle on the axe between shots.

This is the design motivation for the modulation-cvar combo `cl_weaponpreselect 1` + `cl_weaponhide 1` + `cl_weaponhide_axe 1`. The engine itself acknowledges it: `cl_weaponpreselect`'s help text says *"Useful in most teamplay games where you don't want to carry your best weapon in your hands but want to be ready to instantly shoot from it."* Method 1 (quickfire via `+fire_ar`) is the modern script form that delivers this discipline with one bind per fire key.

## The three methods at a glance

| Method | User action | Canonical form | When to choose |
|---|---|---|---|
| Quickfire | 1 press | `bind mouse1 "+fire_ar 7 5"` | Most weapons you want to fire immediately (RL, SSG). |
| Manual select+fire | 2 presses (different buttons) | `bind q "weapon 7 5"; bind mouse1 +attack` | Fires everything through `mouse1` with per-weapon select keys; very common. |
| Hold-modifier + fire | Hold modifier, press fire | `alias +lg "bind mouse1 +fire_ar 8 5"; alias -lg "bind mouse1 +fire_ar 7 5"; bind space +lg` | Per-button context-switching: LG while holding space, RL otherwise. |

All three methods coexist in one config. A single weapon (e.g. RL) can be reached via quickfire on `mouse1` AND be the fallback of an unprimed hold-modifier pattern.

## Method 1: Quickfire

**Canonical form:**
```
bind mouse1 "+fire_ar 7 5 3 2"
```

One press of `mouse1` selects the best available weapon from the priority chain (RL, then SNG, then SG, then axe) and fires it. Release triggers `-fire_ar`, which handles the weapon-hide transition if `cl_weaponhide` is enabled AND pops the key from the internal key-stack for rollover handling.

**Why `+fire_ar` wins:** two compounded reasons.

1. **Single-frame delivery.** Both `+fire` and `+fire_ar` bundle the weapon-selection impulse and the attack bit into the same usercmd frame. The older two-command forms (`weapon 7 5; +attack` across two binds, or `impulse 7; +attack` on one bind) could emit the weapon change and the attack bit in separate frames, giving the server a one-frame window where the weapon had switched but the attack hadn't fired yet. In standard 77fps competitive play that window is ~13ms and visible on demos.
2. **Multi-key rollover.** `+fire_ar` additionally maintains a per-client key-stack: when you press a second fire key while still holding a first, the second takes over; when you release the second, the client pops the stack and re-executes the most recent prior `+fire_ar` so the first key's weapon resumes. Hand-written scripts used to simulate this (see legacy forum discussion referenced in meag's 2021 commit message); `+fire_ar` handles it natively.

**When to use `+fire` instead:** you want the single-frame delivery behavior without the key-stack machinery -- for example, a bind that should always fire its own chain regardless of what else is held. In practice `+fire_ar` is suitable for unconditional use; it degrades gracefully to `+fire` behavior when only one fire key is active.

**Priority chain semantics:** `7 5 3 2` is a fallback order. The client tries weapon 7 (RL); if you don't have it or don't have ammo, tries 5 (SNG); then 3 (SG); then 2 (SSG). `cl_weaponforgetorder` controls whether this list persists frame-to-frame (default 0, persistent) or resets per command (1, one-shot). With the default, `+fire_ar 7 5 3 2` issued once keeps re-evaluating the best available weapon as your inventory changes.

**Cross-engine:** `+fire` originated in ezQuake (commit `ab813f8a`, johnnycz, 2011-05-29). FTE added equivalent support 7 years later (commit `98303e606`, Spoike, 2018-12-06). `+fire_ar` is ezQuake-specific as of current head (commit `db269539`, meag, 2021-05-29). Behavior for single-key case is identical across all three; rollover handling exists only in ezQuake's `+fire_ar`.

## Method 2: Manual select+fire

**Canonical form:**
```
bind q "weapon 7 5 3"
bind mouse1 +attack
```

Press `q` to preselect the best available weapon from the chain. Press `mouse1` to fire it. Pairs the `weapon` command (priority chain, respects `cl_weaponpreselect`) with `+attack` (the universal Quake-lineage fire command).

**Why `weapon` over `impulse`:** the legacy alternative replaces `weapon 7 5 3` with `impulse 7`. `impulse` bypasses `cl_weaponpreselect` entirely -- see the source comment at `cl_input.c:555`: *"This is the same command as impulse but cl_weaponpreselect can be used in here, while for impulses cannot be used."* Users who set `cl_weaponpreselect 1` and mix `impulse` binds with `weapon` binds get preselect working on some keys and not others -- a "preselect sometimes doesn't work" misconfiguration that's recognizable on sight. `weapon` is the unified path.

**When to use:** when you want all shots to come from `mouse1` while still getting the `weapon` chain's priority-fallback semantics -- matches the "fire with mouse1" instinct from other FPS games. Often paired with quickfire (method 1, `+fire_ar`) on dedicated keys for a few hot weapons (SSG, GL). See "Hybrid configs" below for a representative combination.

**Cross-engine:** `weapon` and `+attack` are universal. Works in ezQuake and FTE client.

## Method 3: Hold-modifier + fire

**Canonical form:**
```
alias +lg "bind mouse1 +fire_ar 8 5 3 2"
alias -lg "bind mouse1 +fire_ar 7 3 2"
bind space +lg
```

Hold `space` to rewrite `mouse1`'s bind to LG priority. Release `space` to restore `mouse1`'s RL priority. While holding `space`, pressing `mouse1` fires LG. Otherwise `mouse1` fires RL.

**Mechanism:** the `+alias`/`-alias` mechanism -- aliases named `+X` run on key press, `-X` run on key release. Any commands are legal inside them, including `bind` statements that reassign other keys.

**Relationship to method 1:** this method uses `+fire_ar` under the hood (both branches of the alias chain emit a `+fire_ar` bind). The engine primitive is the same. The difference is the user experience. Method 1 is one press, one weapon. Method 3 is two actions (hold modifier, press fire), context-sensitive weapon.

**Classifier note:** a weapon bound via method 3 is user-experience-level **manual**, even though the underlying mechanism is `+fire`. Config-viewer tools should report this weapon as hold-modifier+fire, not quickfire -- the user performs 2 actions.

**Cross-engine:** alias mechanism is universal Quake-lineage. Works in ezQuake and FTE.

## Hybrid configs -- mixing methods in one setup

Configs commonly combine methods rather than sticking to one. A representative pattern:

```
// Quickfire on dedicated keys for a few hot weapons
bind space "+fire_ar 3 2"    // GL quickfire on space
bind c "+fire_ar 4 3"        // SG quickfire on c
bind v "+fire_ar 3"          // SSG quickfire on v

// Manual select+fire for everything else, firing via mouse1
bind q "weapon 7 5"          // RL priority preselect
bind e "weapon 8"            // LG preselect
bind mouse1 +attack          // fire the currently-selected weapon
```

How this plays:
- Pressing **space** fires GL immediately (method 1: one action).
- Pressing **c** fires SG and leaves SG as the active weapon. Holding **mouse1** afterward continues firing SG -- the weapon state persists because `cl_weaponforgetorder` defaults to 0.
- Pressing **q** preselects RL (no shot fired); pressing **mouse1** fires it (method 2: two actions).

The same `mouse1` button serves both as the fire key for manual-select weapons AND as the continuation-fire key for quickfire weapons already selected. The classifier distinguishes these per weapon: GL/SG/SSG = quickfire on their own keys, RL/LG = manual select+fire on mouse1.

## Composition -- chaining tuning changes with weapon selection

The `+alias`/`-alias` mechanism that swaps binds can chain any other cvar or command on press and release. Common real-world compositions:

- **Per-weapon sensitivity** -- slower mouse while tracking LG, reverts on release.
- **Per-weapon FOV** -- narrower FOV while aiming.
- **Per-weapon crosshair** -- different crosshair style per weapon context.

Example combining sensitivity with bind swap:
```
alias +lg "sensitivity 1.7; bind mouse1 +fire_ar 8 5 3 2"
alias -lg "sensitivity 2.0; bind mouse1 +fire_ar 7 3 2"
bind space +lg
```

The classifier view: LG is still hold-modifier+fire. The sensitivity change is a composition detail, not a new method. Depth on per-weapon sensitivity and per-weapon crosshair lives in dedicated concept notes (not yet authored; see Related concept notes).

## Modulation cvars

Four cvars shape how the three methods behave. Two are binary toggles; two have multi-mode values worth understanding.

**`cl_weaponpreselect`** -- controls whether `weapon` and `+fire` defer the weapon-change impulse to the attack frame:
- `0` (default) -- no preselect; weapon change fires immediately.
- `1` -- full preselect. `weapon` and `+fire` defer the change to the next attack frame.
- `2` -- immediate selection on `+attack` press (added in commit `7c328aa4`, 2006-10-17).
- `3` -- mode 1 conditional: only preselect when the server reports `deathmatch 1`; otherwise immediate.
- `4` -- mode 2 conditional on `deathmatch 1`.

Modes 3 and 4 matter for players on servers that mix dm1 and other modes -- typical competitive.

**`cl_weaponhide`** -- after firing, switch to a low-importance dummy weapon:
- `0` (default) -- no hide.
- `1` -- always hide after firing.
- `2` -- hide only when the server reports `deathmatch 1` (see `cl_input.c:70-71`).

Dummy-weapon target logic at `cl_input.c:530`: hide to shotgun by default. Hide to axe when the weapon currently being fired is already the shotgun (can't "hide" to what you're already firing) or when `cl_weaponhide_axe` is set.

The motivation is the death-drop mechanic described in the Summary: a player who dies holding RL drops the RL in their backpack for the enemy. `cl_weaponhide 1` (paired with `cl_weaponhide_axe 1`) makes you idle on the axe between shots, so the dropped backpack carries axe + ammo instead of a power weapon.

**`cl_weaponhide_axe`** -- force the dummy weapon to axe regardless of what you're currently firing. FTE accepts the same cvar name as a compatibility alias for its native `cl_weaponhide_preference`.

**`cl_weaponforgetorder`** -- priority-chain persistence:
- `0` (default) -- the last `weapon N M O` or `+fire N M O` issued persists; each frame re-evaluates the best available from that list as inventory changes.
- `1` -- chain is consumed per command; the client picks best available at issue time and doesn't re-evaluate.

The default (persistent) is the design intent: `+fire 7 5` issued once keeps firing the best of {RL, SNG} as ammo changes, silently. Setting `cl_weaponforgetorder 1` opts out of that re-evaluation.

## Why the simplifications happened

Weapon scripts evolved in three steps, each one collapsing user-level effort by adding engine primitives.

**Step 1 -- impulse chains (pre-2006).** Before `cl_weaponpreselect`, players wrote explicit hide-and-wait scripts:
```
alias +rl "impulse 6; impulse 7; +attack"
alias -rl "-attack; impulse 2"
```
Pre-switch via impulse, confirm, fire. On release, drop fire and switch to dummy. This is what the ezquake.com guide describes in its opening paragraph.

**Step 2 -- priority chains (2006-2011).** `cl_weaponpreselect` (johnnycz, 2006) let `weapon N M O` handle the fallback logic mechanically:
```
alias +rl "weapon 7 6; +attack"
alias -rl "-attack; weapon 2"
```

**Step 3 -- compound commands (2011).** `+fire` (johnnycz, 2011) folded weapon-select and attack into one command, closing the one-frame exposure window:
```
bind mouse1 "+fire 7 6"
```

**Step 3b -- anti-rollover compound (2021).** `+fire_ar` (meag, commit `db269539`, 2021-05-29) added a per-client key-stack that handles the "press second fire key while still holding the first" case natively. Commit message explicitly names its purpose: *"Bit experimental, trying to get round having to have scripts like [forum topic/5900] created."* The hand-written scripts that forum topic documented -- elaborate alias chains tracking which fire key was held most recently -- become unnecessary:
```
bind mouse1 "+fire_ar 7 6"
```

Each step is the engine absorbing complexity the user had been expressing manually. Legacy configs still work -- nothing was removed. The recommendation isn't a rule, it's the form the engine has made optimal.

## Legacy patterns you may encounter

Older configs and community-shared scripts commonly contain:

- **Impulse chains** (`alias +rl "impulse 6; impulse 7; +attack"`) -- step-1 era. Modern equivalent: `bind X "+fire_ar 7 6"`.
- **Weapon+attack two-command form** (`alias +rl "weapon 7 6; +attack"`) -- step-2 era. Modern equivalent: `bind X "+fire_ar 7 6"` for quickfire semantics, or keep the original if you genuinely want manual select+fire.
- **Explicit hide in `-alias`** (`alias -rl "-attack; weapon 2"`) -- step-2 era. Modern equivalent: set `cl_weaponhide 1` and let the engine handle it.
- **Hand-rolled multi-key rollover** -- elaborate alias chains that track which fire key was held last so the previous weapon resumes on release. The pattern `+fire_ar` now handles natively (see meag's commit message reference to [forum topic/5900](https://www.quakeworld.nu/forum/topic/5900)). Modern equivalent: plain `bind X "+fire_ar ..."` on each fire key, no custom rollover bookkeeping needed.
- **`wreg` (KTX-only)** -- server-side KTX command for high-ping weapon switching; client issues `cmd wreg X` and the KTX server stores a per-client weapon registration and simulates the attack server-side. "Legendary but rarely used" (per BLooD_DoG, 2026-04-24) and no longer works cleanly with `antilag 1`. Pre-dates the modern antilag-compensation flow. Mentioned for recognition value when encountered in old configs/discussions; full treatment deferred until KTX enters Layer 1 (Phase 2e).

All legacy client-side forms still function in current ezQuake and FTE. Modernizing is optional -- gains are packet efficiency, rollover handling, and readability, not compatibility.

## Ruleset interaction

`cl_weaponpreselect`, `cl_weaponhide`, `cl_weaponforgetorder`, and `cl_weaponhide_axe` are client-side state. Standard competitive rulesets (smackdown, qcon, etc.) do not restrict these cvars -- they are player configuration, not script automation. `+fire` and `weapon` commands are also unrestricted in standard rulesets.

Some rulesets restrict broader scripting patterns (e.g. anti-script restrictions on alias chains that trigger on game events); see `ruleset-anti-script-restriction-pattern` for the general framing.

## Consumer implications

- **Slipgate config-viewer / classifier.** Already implements this classification via a 2-level structure at `apps/slipgate-app/src/types.ts` + `src-tauri/src/commands/weapon_classifier.rs`: `Method = quickfire | manual` plus `ManualFlavor = select | hold`. Method 1 maps to `quickfire`; method 2 to `manual + select`; method 3 to `manual + hold`. The `Mechanism` enum (`plus_fire`, `weapon_attack`, `hold_modifier_rebind`, etc.) captures the engine primitive beneath each firing path. This note's three-method user-facing taxonomy is the framing that emerged from that classifier's real-world coverage.
- **Oracle chatbot / MCP query.** When a user asks "how do I bind my weapons," the three-method taxonomy is the first question to surface: "which action pattern do you want?" The recommended path is quickfire; the short-answer is the Summary section of this note.
- **Config-editor wizard.** Structure the weapon-bind flow around the three-method choice. Let the user pick a method, then fill in priority chains per weapon key. Don't bury the method choice under a cvar list.
- **Cross-engine tooling.** The pattern is shared between ezQuake and FTE. Don't annotate binds as "ezQuake-specific" unless a cvar genuinely is. `cl_weaponhide_axe` is a compat-alias in FTE (maps to `cl_weaponhide_preference`); the other three modulation cvars are native in both engines.

## References

- **Source guide:** https://ezquake.com/docs/weapon-scripts (imported 2026-04-24, upstream commit `44f5b9b566ce138c258c0f3521f2e4e2308a0e6b`, last upstream content edit 2022-10-26). The source guide omits `+fire` entirely and frames `cl_weaponpreselect`/`cl_weaponhide` as ezQuake-specific -- both corrected in this note.
- **Original `cl_weaponpreselect` implementation:** commit `7c328aa4`, johnnycz, 2006-10-17 ("*cl_weaponpreselect 2 - immediate weapon selection happens when holding +attack*"). Earlier modes 0/1 predate this commit.
- **`+fire` command introduction:** commit `ab813f8a`, johnnycz, 2011-05-29 ("*+fire command; inbuilt weapon select+fire scripts*"). ezQuake-origin. FTE added equivalent support 7 years later in commit `98303e606`, Spoike, 2018-12-06 ("*Weapon preselect/hiding stuff*").
- **`+fire_ar` anti-rollover variant:** commit `db269539`, meag, 2021-05-29 ("*INPUT: +fire_ar: anti-rollover +fire / Bit experimental, trying to get round having to have scripts like [forum topic/5900] created*"). ezQuake-specific as of current head. Shares `IN_FireDown`/`IN_FireUp` handlers with `+fire` and branches on `argv[0]` check at `cl_input.c:338, 388`. Community validation: BLooD_DoG, 2026-04-24 ("*I and many others have been using it for years with nothing to report*").
- **Cross-engine verification (FTE):** `cl_weaponpreselect` at `engine/client/cl_input.c:285`, `cl_weaponhide` at `cl_input.c:283`, `cl_weaponforgetorder` at `cl_input.c:286`, `cl_weaponhide_axe` as CVARAD compat-alias for `cl_weaponhide_preference` at `cl_input.c:284`. `+fire`/`-fire` at `engine/client/cl_main.c:2214-2215`.
- **Source file references (ezQuake head):** `cl_input.c:42-45` (cvar declarations), `cl_input.c:70-71` (hide mode logic with deathmatch 1 check), `cl_input.c:530` (hide_axe target selection), `cl_input.c:555` (weapon vs impulse semantic comment), `cl_input.c:609` (preselect mode switch), `cl_input.c:1258-1269` (command registrations), `cl_input.c:1279-1282` (cvar registrations).
- **This note is structured for progressive disclosure.** `## Summary` + `## The three methods at a glance` together constitute a complete user-facing answer for default MCP serving. Deeper sections provide drill-down depth on request.

## Related concept notes

- `ruleset-anti-script-restriction-pattern` -- ruleset restrictions on scripting mechanisms. Weapon-script cvars are not currently restricted, but the pattern is relevant context.
- **Gap-candidate: per-weapon sensitivity tuning** (not yet authored). The composition pattern that chains `sensitivity` changes into `+alias`/`-alias` transitions deserves its own note; touched here only through examples.
- **Gap-candidate: per-weapon crosshair switching** (not yet authored). Same composition pattern applied to `crosshair` / `crosshairimage` cvars. Will pair with eventual `assets.quake.world` visual surface for crosshair previews.
