---
title: "QW competitive ruleset anti-script restriction pattern"
summary: "How competitive rulesets (qcon, smackdown, thunderdome, smackdrive) prevent client-side scripting and timing exploits - including the five new restriction primitives 3.6.6 added to close bypass paths older gates missed."
slug: ruleset-anti-script-restriction-pattern
topic: security-policy
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: new-page
primary_contributors:
  - "@osm"
related_entities:
  - ezquake:ruleset:smackdrive
  - ezquake:ruleset:smackdown
  - ezquake:ruleset:thunderdome
  - ezquake:ruleset:qcon
  - ezquake:commit:22b5b6c2
  - ezquake:commit:2dbb3f1d
  - ezquake:pr:945
  - ezquake:pr:1016
related_messages: []
last_updated: 2026-04-23
---

# QW competitive ruleset anti-script restriction pattern

## Summary

ezQuake's competitive rulesets (`qcon`, `smackdown`, `thunderdome`, and the 3.6.6-era addition `smackdrive`) enforce a set of client-side restrictions that aim to prevent a player from gaining advantage through scripting, external timing, or runtime cvar manipulation the server cannot see. 3.6.6 landed two related pieces of this story: `smackdrive` was added as a new competitive ruleset (commit `22b5b6c2`, PR #945) with modern restrictions in place from day one, and a later commit (`2dbb3f1d`, PR #1016) introduced five new restriction primitives - covering `exec`, the IPC subsystem, and the `set_calc`/`set_eval`/`set_ex`/`set_ex2` cvar-mutation commands - and applied them uniformly to all four competitive rulesets. The restriction primitives close bypass paths that older ruleset gates were never designed for. The enforcement lives entirely on the client; the ruleset itself is negotiated with the server (canonically KTX), so the pattern only works against a cooperating client, not a forked or modified one.

## The five restriction primitives

The five gates added in `2dbb3f1d` are predicate functions declared in `src/rulesets.h:57-61` and defined in `src/rulesets.c:216-240`. Each follows the same shape:

```c
qbool Rulesets_RestrictX(void)
{
    return cls.state == ca_active && !cl.spectator && !cls.demoplayback
        && !cl.standby && rulesetDef.restrictX;
}
```

The activation conditions matter. Each restriction only bites when the client is actively playing a match: connected (`ca_active`), not a spectator, not replaying a demo, and not in the pre-match standby phase. Outside those conditions the player can use `exec`, the IPC hooks, and the `set_*` commands freely. The gate is specifically a "during matches" gate, not a global disable.

Each primitive guards one call site:

- **`Rulesets_RestrictExec`** gates `Cmd_Exec_f` at `src/cmd.c:558-561`. Prevents mid-match `exec` of config files that would change bindings, load alias libraries, or inject large volumes of setup text the player did not negotiate with the server before standby ended.
- **`Rulesets_RestrictIPC`** gates `COM_ParseIPCData` at `src/common.c:1634-1637`. Prevents external programs from feeding commands into the client via the IPC channel during a match - closes the "external helper script" bypass where a second process computes something (respawn timers, damage summaries) and stuffs the answer back in.
- **`Rulesets_RestrictSetCalc`** gates `Cvar_Set_Calc_f` at `src/cvar.c:1344-1347`. `set_calc` evaluates an arithmetic expression against cvar values and writes the result back into a named cvar - a general-purpose runtime compute primitive.
- **`Rulesets_RestrictSetEval`** gates `Cvar_Set_Eval_f` at `src/cvar.c:1496-1499`. Similar shape to `set_calc` but evaluates string expressions.
- **`Rulesets_RestrictSetEx`** gates `Cvar_Set_ex_f` at `src/cvar.c:1155-1158`. Covers both `set_ex` and `set_ex2` (the function handles both via `Cmd_Argv(0)` dispatch). These perform expanded-macro cvar assignment - the `$var` substitutions happen first, then the assignment.

When a gate fires, the engine prints a rejection line like `"The use of exec is not allowed during matches"` and returns without executing the command. There is no silent fallback; the player sees the block in their console.

## Greenfield vs retrofit: smackdrive and the three older rulesets

The walk framing of the three older rulesets as "retrofit" and smackdrive as "greenfield" is close but needs nuance. The five restriction primitives did not exist until commit `2dbb3f1d` (2025-02-04), which is four months after `smackdrive` first shipped in commit `22b5b6c2` (2024-10-12). Technically, all four competitive rulesets were retrofitted with the primitives in the same commit. The experiential asymmetry is:

- **`qcon`, `smackdown`, `thunderdome`** had been shipping for years (pre-dating the 3.6 release series). Players had accumulated muscle memory, config files, and match workflows under these rulesets *without* the five gates. The retrofit closed bypass paths those players had likely been using, possibly without realizing they were abusable.
- **`smackdrive`** shipped in October 2024. By the time `2dbb3f1d` landed in February 2025, smackdrive had only a few months of competitive play, and any player who took it up inherited the full post-retrofit restriction set on their next update. From the player's perspective, smackdrive never existed without the modern gates.

So the asymmetry is historical rather than architectural: same code path in 3.6.6 and after, different lived user experience leading up to it. `smackdrive`'s birth-state (from commit `22b5b6c2` alone) already included the era-appropriate restrictions of the day: `allow_scripts=0`, `cl_hud=0`, `cl_rollalpha=20`, `r_shiftbeam=0`, `scr_allowsnap=1`, `cl_c2spps=0` when independent physics is on, `maxfps=77`, plus the older `restrictTriggers`, `restrictPacket`, `restrictParticles`, `restrictLogging`, `restrictRollAngle` flags. A comment in the smackdrive handler surfaces an interesting piece of threat model: `restrictPacket` is set because "packet command could have been exploited for external timers" - i.e., a player could `packet` out to an external service to get hidden timing data without relying on visible client state.

## Why `restrict_set*` is the bypass-closure piece

`restrictExec` and `restrictIPC` on their own close obvious paths: no mid-match `exec` and no external-process injection. But a sufficiently motivated scripter had a sidestep: scripts already loaded *before* the match could mutate cvars mid-game using the `set_calc` / `set_eval` / `set_ex` family. Any of these three commands can compute a new cvar value from a running expression, so a bound trigger like `alias +fire "+attack; set_calc weapon_ready cl_time + respawn_delay"` can keep a running tally without ever calling `exec` or touching IPC.

The five primitives are not independent. Restricting only `exec` and `IPC` without also restricting the `set_*` functions would leave the bypass open: any script the player loaded from their `config.cfg` before the match could continue to compute and write new cvar values using the expression-evaluation commands. Restricting the three `set_*` functions closes that path, making the set of five restrictions a coherent policy rather than a list of individually-useful blocks.

The pattern is generalizable. The rule is: *if a restriction set aims to disable runtime scripting, it has to cover every primitive that can compute new cvar values during a match, not only the ones that load external content.* Any new cvar-mutation command added to the engine in the future will need to be added to this list or the policy will leak again.

## Cross-codebase dimension

Ruleset as a concept is not local to ezQuake. The canonical QuakeWorld competitive server mod, KTX, announces the active ruleset to connecting clients as part of match setup. ezQuake observes what the server reports and enforces the client-side restrictions locally. Two things follow:

- **The ezQuake enforcement is cooperative, not mandatory.** A modified or forked client can simply not check `rulesetDef.restrictExec` and continue to allow mid-match `exec`. The ruleset system is a trust-and-verify model between a cooperating client and a competitive community, not a cryptographic enforcement. The KTX server does not (and cannot) audit what the client does with its own command buffer. This is distinct from the client-side server-exec allowlist (`cl_remote_capabilities`), where the threat model is a hostile server against a trusted client; here, the threat model is the inverse - a player attempting to gain advantage against a server that is acting in good faith.
- **The ruleset definitions live in both codebases.** KTX holds the authoritative list of ruleset names and what they mean for server-side behavior (allowed weapons, map pool, team sizes); ezQuake holds the client-side interpretation of the same names. A future Phase 2e KTX walk will discover the server-side half - what restrictions KTX enforces directly (e.g., disallowed spawn commands, logging requirements) versus what it delegates to the client. This concept note is authored from ezQuake-side evidence only; cross-confirmation with KTX is deferred.

For a consumer asking "what is smackdrive", the full answer spans both codebases: the server enforces match-structure rules, the client enforces runtime-scripting rules, and the name "smackdrive" denotes their agreed-upon pairing.

## Consumer implications

- **Oracle MCP "what does ruleset smackdrive do" queries** - a plain Layer 1 lookup returns the ruleset name and the cvars it disables, but not the *threat model* the ruleset is defending against. The three-layer answer shape is: Layer 1 lists the disabled cvars and the restriction flags; this note supplies the "why" (anti-script, anti-external-timer, anti-runtime-cvar-mutation) and the competitive-community trust model.
- **Oracle MCP "why can't I use set_calc in a match" queries** - the answer is not a bug report path. The block is by design under `qcon`/`smackdown`/`thunderdome`/`smackdrive` to close a scripting-bypass path. The user's options are to use a non-competitive ruleset (and drop the `set_calc` calls out of match-context code).
- **Oracle MCP "what's the difference between smackdown and smackdrive" queries** - the correct framing is historical, not functional. As of 3.6.6 and after, the two rulesets are nearly identical with respect to the five restriction primitives and most underlying cvar locks. `smackdrive` tunes `maxfps` to 77 (vs smackdown's 72) and was authored with a fresh look at which primitives should ship active from day one. Users picking a ruleset today are picking based on competitive-community norms (which leagues adopt which), not on mechanical differences.
- **Server operator coordination** - a server operator picking a ruleset name for their league is picking a name that commits both the server (KTX) and the client (ezQuake) to a coordinated behavior set. The four competitive names are not interchangeable labels; each carries a specific agreed-upon restriction bundle. Adding a new competitive ruleset requires a parallel addition on both sides.
- **Config-viewer and audit tools** - when presenting a user's config, surfacing which cvars and commands are currently inactive under the user's configured ruleset is a useful lens. A config-viewer that knows `exec` is restricted under `smackdown` can flag mid-config `exec` calls as "will be rejected in match context" rather than silently listing them.
- **Documentation (upstream)** - ezquake.com currently has no dedicated rulesets page. References appear in `scripting.md`, `command-line-parameters.md`, and `upgrading.md` but no single page explains what the ruleset system is, what each competitive ruleset enforces, or the threat model behind the restrictions. The proposed upstream home is a new `rulesets.md` page under Features (or a new "Competitive" sidebar section) on ezquake.com - a new-page PR that also touches the vitepress sidebar config. The cross-codebase dimension means the page would also reference KTX-side ruleset definitions when those are written up.

## References

- PR #945 (`osm/add-ruleset-2024`), merge commit `bfa1f5bf`. Commit `22b5b6c2` "Add ruleset smackdrive" (2024-10-12). Adds `rs_smackdrive` at `src/rulesets.h:47`, `Rulesets_Smackdrive` handler at `src/rulesets.c:467-518`, OnChange dispatch at `src/rulesets.c:734-777`, menu enum at `src/menu_options.c:251`. Touches 11 ruleset-switch sites in `src/rulesets.c` and 6 `remarks` fields in `help_variables.json`.
- PR #1016 (`osm/add-restrictions`), merge commit `16c5116d`. Commit `2dbb3f1d` "Restrict exec, set_{calc,eval,ex,ex2}, and IPC." (2025-02-04). Adds five `restrict*` fields to `rulesetDef_t` at `src/rulesets.c:39-43`, the five `Rulesets_Restrict*` predicates at `src/rulesets.c:216-240`, and the call-site gates at `src/cmd.c:558-561`, `src/common.c:1634-1637`, `src/cvar.c:1155-1158`, `:1344-1347`, `:1496-1499`. Retrofits all four competitive ruleset handlers (`Rulesets_Smackdown`, `Rulesets_Qcon`, `Rulesets_Thunderdome`, `Rulesets_Smackdrive`) to set and unset the five flags on enable/disable.
- Ruleset enum definition: `src/rulesets.h:43-48` - `rs_default`, `rs_smackdown`, `rs_thunderdome`, `rs_qcon`, `rs_mtfl`, `rs_smackdrive`.
- Ruleset dispatch: `src/rulesets.c:Rulesets_OnChange_ruleset` - the `OnChange` handler for the `ruleset` cvar that validates the name and calls the appropriate enable/disable routine.
- Per-ruleset handlers: `Rulesets_Smackdown`, `Rulesets_Qcon`, `Rulesets_Thunderdome`, `Rulesets_Smackdrive`, `Rulesets_MTFL`, `Rulesets_Default` - each an enable-or-disable routine that applies or reverts that ruleset's cvar locks and restriction flags.
- Help documentation: `help_variables.json` contains per-cvar `remarks` fields calling out ruleset-specific restrictions (e.g., `cl_hud`, `cl_rollalpha`, `gl_outline_scale_model`, `r_shaftalpha`). These are the autogenerated user-visible hints; the commit `22b5b6c2` diff shows the per-cvar remark updates.
- Upstream documentation state: `research/repos/ezquake-docs/docs/docs/` has no rulesets page. `scripting.md` mentions smackdown macro restrictions; `command-line-parameters.md` shows the `-ruleset` flag; `upgrading.md` mentions logging-restriction and max/min cvar bounds. No single explainer page exists. This gap is what `upstream_target: new-page` captures; a likely PR is a new `rulesets.md` plus a sidebar entry change in the vitepress config.
- KTX-side ruleset definitions: not yet mirrored into this concept note. Pending the Phase 2e KTX walk to cross-verify server-side behavior.

## Related concept notes

- `client-side-server-exec-allowlist.md` - the inverse-direction security note. That note covers the client defending against a hostile server; this note covers the client enforcing match-fairness on its own user. Both use the same command-dispatch surface (`cbuf_*`, `Cmd_Exec_f`, cvar-mutation primitives) but from opposite threat models.
- `completing-legacy-fte-protocol-extensions.md` - the server-side version-gating counterpart. Both notes describe pattern-level mechanisms where a cooperating component closes off a capability the underlying wire protocol still technically allows; both are generalizable shapes rather than one-off fixes.
- Future note candidate: **KTX ruleset definitions (server-side)** - the authoritative list of competitive ruleset names, match-structure rules, and the set of client-side restrictions each name denotes. Will be authored from KTX source during Phase 2e and will link back to this note.
- Future note candidate: **The `rulesetDef_t` flag model** - a design note on how ezQuake encodes ruleset-dependent behavior via a single struct of boolean flags plus predicate functions, and why this is easier to audit than per-ruleset `switch` statements scattered across the code.
