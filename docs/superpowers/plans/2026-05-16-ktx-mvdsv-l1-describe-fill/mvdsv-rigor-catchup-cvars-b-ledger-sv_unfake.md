# describe-fill-synthesis ledger -- mvdsv `sv_unfake`

- **project:** mvdsv
- **knob:** `sv_unfake` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `rigor-catchup-cvars-b` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_unfake: synthesized -- replaces carriage returns with '#' in public (non-team) chat to block faked lines; boolean, default 1; KTX replicates identically; traced to sv_user.c:1790 -- origin=synthesized ref=src/sv_user.c:1790 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Strips carriage-return characters out of public (non-team) chat messages, replacing each with a '#'. This stops players from embedding line breaks in their messages to fake extra lines or forge server-style output in other players' consoles. Team chat is not affected.
>
> 0 = off (carriage returns pass through unchanged).
> 1 = on (carriage returns in public chat are replaced with '#').
>
> Default: 1.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| replaces carriage return (char 13) with '#' | src/sv_user.c:1794-1796 | `for (ch = p; *ch; ch++) if (*ch == 13) *ch = '#';` | MATCH |
| only when value non-zero (boolean on/off) | src/sv_user.c:1790 | `if (!team && sv_unfake.value)` | MATCH |
| public (non-team) say only; team-say exempt | src/sv_user.c:1790 | `if (!team && ...)` | MATCH |
| OFF-state 0: CRs pass through (condition false) | src/sv_user.c:1790 | `sv_unfake.value` falsy skips the loop | MATCH |
| Default 1 (registered) | src/sv_main.c:123 | `cvar_t sv_unfake = {"sv_unfake", "1"};` | MATCH |
| settable via config/rcon (no ROM flag) | src/sv_main.c:3553 | `Cvar_Register (&sv_unfake);` | MATCH |
| KTX replicates identical CR->'#' on non-team say (live path under KTX) | ktx/src/g_cmd.c:411,417-419 | `if (!isTeamSay && cvar("sv_unfake")) { ... if (*ch == 13) { *ch = '#'; } }` | MATCH |
| say/say_team overrideable -> mod handler runs first under KTX | src/sv_user.c:3316-3317, 3410-3419 | `{"say", Cmd_Say_f, true}` ; `if (SV_ExecutePRCommand()) goto out;` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Replaces CR chars in chat, each -> '#' | sv_user.c:1794-1796 | `for (ch = p; *ch; ch++) if (*ch == 13) *ch = '#';` | MATCH (13 == ASCII CR; every occurrence set to '#', in-place) |
| 1b | Lead verb "Strips ... out of" (implies removal) | sv_user.c:1796 | `*ch = '#';` | MATCH-with-minor-imprecision (it SUBSTITUTES each CR with '#' in place; nothing is removed and length is unchanged. The parenthetical + both state lines say "replaced with '#'", which is exact -- still-true vagueness, traceable) |
| 2 | Scope: public (non-team) chat only | sv_user.c:1790 ; 1953 ; 1962 | `if (!team && sv_unfake.value)` ; `Cmd_Say_f -> SV_Say(false)` ; `Cmd_Say_Team_f -> SV_Say(true)` | MATCH (`say` => team=false => !team true; `say_team` => team=true) |
| 3 | Team chat NOT affected | sv_user.c:1790 | `if (!team && ...)` | MATCH (team=true short-circuits the unfake block entirely) |
| 4 | Purpose: stop faking extra lines / forging server output | sv_user.c:1790-1796 + comment sv_main.c:123 | `//bliP: 24/9 kickfake to unfake` ; local `qbool fake` ; CR->'#' | MATCH (rationale framing; CR (13) injection is precisely the QW console fake-line mechanism, and the unfake/fake naming corroborates intent -- presented as intent, not over-asserted behavior) |
| 5 | OFF (0): CR pass through unchanged | sv_user.c:1790 | `if (!team && sv_unfake.value)` | MATCH (value 0 => block skipped => `p` left untouched) |
| 6 | ON (1): CR in public chat -> '#' | sv_user.c:1790-1796 | gate truthy + replace loop | MATCH |
| 7 | Default: 1 | sv_main.c:123 (+ cvar.c Cvar_Register) | `cvar_t sv_unfake = {"sv_unfake", "1"};` | MATCH (REGISTERED default string "1"; Cvar_Register -> Cvar_SetROM parses string -> value 1.0, so gate sees nonzero by default) |
| 8 | Set by: server config / rcon | sv_main.c:123 (flags=0, OnChange=NULL) ; cvar.h:66 struct | `{"sv_unfake", "1"}` positional => flags=0, no OnChange, not ROM | MATCH (normal server cvar with no access flag/restriction => settable from server console / config / rcon) |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline.md read and applied per-clause.

Single enforcing site: sv_user.c:1790-1797 inside SV_Say(qbool team). Gate `if (!team && sv_unfake.value)` then loop replacing every byte ==13 (CR) with '#'. Scope verified by tracing both callers: Cmd_Say_f -> SV_Say(false) (public `say`), Cmd_Say_Team_f -> SV_Say(true) (`say_team`); `!team` makes the block public-chat-only and leaves team chat untouched -- the scope clause is genuinely ENFORCED, not name-inferred.

Polarity/OFF-state traced to the truthiness gate on `.value` (0 => skip => CR passes through; nonzero => replace). Default:1 traced to the REGISTERED struct `{"sv_unfake","1"}` (NOT a shipped-cfg value) and confirmed that Cvar_Register -> Cvar_SetROM parses the string into `.value` (=1.0), so the gate is on-by-default exactly as described -- WI-2 satisfied. flags=0 / OnChange=NULL confirmed via cvar.h:66 struct layout (name, string, flags, OnChange, value), so "Set by: server config / rcon" is correct (no ROM/access restriction).

Every material clause maps to a located, verified enforcing line incl. adjacent comment. The only blemish is the lead verb "Strips ... out of" (it substitutes in place rather than removing/deleting) -- but the description self-corrects in the parenthetical and in both 0/1 state lines ("replaced with '#'"), so the reader is never misled about the actual byte-level behavior. That is still-true minor vagueness that was fully traceable => TRACED-CLEAN, not C-NEAR-MISS. No clause rests on name/enum/string inference without an enforcing read-site.

## flags_for_review

- [fyi/cross-mod-override/synthesis] sv_unfake is read and enforced in BOTH the MVDSV engine (src/sv_user.c:1790, SV_Say) and KTX (src/g_cmd.c:411, under a '// { MVDSV' block) with an identical carriage-return -> '#' transform on non-team say. Because say/say_team are overrideable (ucmds[] src/sv_user.c:3316-3317) and SV_ExecuteUserCommand runs the mod's QC handler first (SV_ExecutePRCommand, sv_user.c:3418), the LIVE path under KTX is the KTX one; the engine SV_Say transform is the bare-server / no-mod fallback. Observable effect is identical either way, so the L1 description is engine-scoped and accurate without an inline cross-engine clause. Flagging the replication for a human in case the two implementations ever drift (KTX could change its transform independently of the engine).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_gravity=C-FIX, sv_maxspeed=C-FIX, sv_maxrate=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_unfake",
  "type": "cvar",
  "description": "Strips carriage-return characters out of public (non-team) chat messages, replacing each with a '#'. This stops players from embedding line breaks in their messages to fake extra lines or forge server-style output in other players' consoles. Team chat is not affected.\n\n0 = off (carriage returns pass through unchanged).\n1 = on (carriage returns in public chat are replaced with '#').\n\nDefault: 1.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1790. Pre-existing inline comment src/sv_main.c:123 '//bliP: 24/9 kickfake to unfake' is a dev-aside (author/date), not a user description -> synthesized. Enforcing read: src/sv_user.c:1789-1797 in SV_Say -- `if (!team && sv_unfake.value) { for (ch = p; *ch; ch++) if (*ch == 13) *ch = '#'; }` -- non-zero value AND non-team say triggers replacement of every char 13 (carriage return) with '#' in the message buffer. Polarity: boolean (.value tested for non-zero, no threshold). Scope: `!team` -> public say only, team-say exempt (traced to the same condition). OFF-state (0): condition false, CRs left intact. The WHY (CR can forge multi-line / fake server output) is intent, kept OUT of the user doc per D20; the observable effect (CR -> '#') is what is documented. Default 1 verified at registered literal src/sv_main.c:123 `{\"sv_unfake\", \"1\"}` (WI-2). Settable plain cvar_t, registered src/sv_main.c:3553. F-MV1 (LIVE behavior): KTX replicates this identically at src/g_cmd.c:411 `if (!isTeamSay && cvar(\"sv_unfake\")) { ... if (*ch == 13) *ch = '#'; }` under a `// { MVDSV` block. Dispatch order means under KTX the mod path is the live one: say/say_team are overrideable (ucmds[] 3rd field true, src/sv_user.c:3316-3317) so SV_ExecuteUserCommand (sv_user.c:3408-3419) tries SV_ExecutePRCommand() (the KTX QC handler) FIRST and `goto out` skips the engine SV_Say when the mod handles it. Because KTX and the engine apply the identical CR->'#' transform with the identical !team scope, the admin-observable effect of sv_unfake is the same whether or not KTX is loaded -> no action-changing cross-engine clause needed inline. Flagged for human review as a cross-mod replication.",
  "description_proposed": null
}
```
