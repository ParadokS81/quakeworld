# describe-fill-synthesis ledger -- mvdsv `sv_maxping`

- **project:** mvdsv
- **knob:** `sv_maxping` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxping: synthesized -- player-join ping ceiling in ms, over-limit forces spectator (player-only, once-per-client), 0=off -- origin=synthesized ref=src/sv_user.c:185 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the highest ping (in milliseconds) a client may have to play. When someone tries to join as a player, if their ping is above this limit they are told their ping is too high and are forced to spectator instead; the check is run only when joining as a player, never on spectators; once a client's ping passes it is not re-checked, but a client rejected for high ping is re-checked if it tries to join again.
>
> Unit: milliseconds.
> 0 = no ping limit (anyone may play).
>
> Default: 0.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| rejects when ping > threshold | src/sv_user.c:185 | `if (maxping && playerping > maxping)` | MATCH |
| forced to spectator (not kicked) | src/sv_user.c:187,464 | `Forcing spectator.` ; `sv_client->spectator = true;` | MATCH |
| 0 = no limit | src/sv_user.c:185 | `if (maxping && ...)` short-circuit | MATCH |
| unit = ms | src/sv_user.c:183 | `... ping_time * 1000` | MATCH |
| player-only (spectators skip) | src/sv_user.c:460 | `if (!sv_client->spectator) { if (!PlayerCheckPing())` | MATCH |
| checked once per client | src/sv_user.c:180,190 | `if (sv_client->maxping_met) return true;` / `sv_client->maxping_met = true;` | MATCH |
| default 0 | src/sv_user.c:36 | `cvar_t sv_maxping = {"sv_maxping", "0"}` | MATCH |
| KTX override absent | ktx/src (grep) | no sv_maxping reference | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Highest ping (ms) a client may have to play | sv_user.c:182,185 | `int maxping = Q_atof(sv_maxping.string);` ... `if (maxping && playerping > maxping)` | MATCH |
| 2 | Told their ping is too high | sv_user.c:187 | `SV_ClientPrintf(... "Your ping is too high for this server!  Maximum ping is set to %i, your ping is %i.\nForcing spectator.\n")` | MATCH |
| 3 | Forced to spectator instead | sv_user.c:464-467 (connect path); 2666-2667+2696-2698 (join path) | connect: `sv_client->spectator = true;` + `Info_SetStar(...,"*spectator","1")` ; join: guarded already-spectator + failed check just `return;` (no promotion) | MATCH |
| 4 | Checked only when joining as a player, never on spectators | sv_user.c:460-461 (`if (!sv_client->spectator) { if (!PlayerCheckPing())`); 2666-2667 (`if (!sv_client->spectator) return; // already a player`) + 2696 | both call-sites fire only on the player-join transition; connect path skips spectators, join path is the spec->player promotion | MATCH |
| 5 | Each client is only checked once | sv_user.c:180,190 | `if (sv_client->maxping_met) return true;` ... `sv_client->maxping_met = true;` (set ONLY on PASS at :190; FAIL returns at :188 without caching) | MISMATCH (imprecise) |
| 6 | Unit: milliseconds | sv_user.c:183 + 4497 | `playerping = ... ping_time * 1000;` with `frame->ping_time = curtime - frame->senttime;` (seconds -> ms) compared vs raw cvar value | MATCH |
| 7 | 0 = no ping limit (anyone may play) | sv_user.c:185 | `if (maxping && playerping > maxping)` -- `maxping &&` short-circuits when 0, never blocks | MATCH |
| 8 | Default: 0 | sv_user.c:36 + 4908 | `cvar_t sv_maxping = {"sv_maxping", "0"};` ; `Cvar_Register (&sv_maxping);` (bare, no override) | MATCH |
| 9 | Set by: server config / rcon | sv_user.c:36,4908 | bare 2-field initializer, no `CVAR_ROM`/`CVAR_SERVERINFO`/access flags -> standard server cvar | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

Enforcing function is PlayerCheckPing (sv_user.c:177-192), called from exactly two sites: Cmd_New_f:461 (initial connect/server-load path, gated by `!sv_client->spectator` at :460) and Cmd_Join_f:2696 (the spectator->player promotion command, which at :2666-2667 returns early if already a player). Followed both callers fully; followed the ping_time unit chain to :4497.

Eight of nine clauses MATCH their enforcing line (polarity, ms threshold, OFF-state via `maxping &&` short-circuit, registered default 0, both scope conditions, forced-spectator side-effect, unit, settability). Core behavior is correct.

The single defect is clause 5, "each client is only checked once." The cache flag `sv_client->maxping_met` is set to true ONLY on a PASS (line 190); a FAIL returns at line 188 WITHOUT setting it. So a client that PASSES is cached and never re-checked, but a client that FAILS is NOT cached and is re-checked on a subsequent join attempt within the same client slot (e.g., a Cmd_Join_f retry after a Cmd_New_f connect-time fail). grep confirms maxping_met is touched in only two places (set at :190, read at :180) with no reset anywhere, so the asymmetry is the complete story. The flag's own declaration comment (server.h:366 "set if user meets maxping requirements") matches the pass-only semantics. The absolute phrasing "only checked once" is therefore more absolute than the enforcing code -- the accurate statement is "once a client passes, it is never re-checked." This is the C-NEAR-MISS signature (essentially correct, one secondary clause narrower/asymmetric in code than implied), not a flat contradiction of the gate's primary behavior.

Suggested tightening for clause 5: "once a client's ping passes the check it is not re-checked; a client whose ping is too high is re-checked if it tries to join again." All other clauses are TRACED-CLEAN.

## flags_for_review

- [review/other/vpass] sv_maxping cache flag maxping_met (sv_user.c) is set only on a passing ping check (line 190), never on a failing one (fail returns at line 188). Consequence: a player who passes is cached for the client-slot lifetime (no reset exists anywhere in the tree), but a player who fails the ping gate is NOT cached and is re-evaluated on a later join attempt. This is the asymmetry that makes the proposed 'each client is only checked once' clause imprecise. Likely intentional (you only want to stop re-penalizing someone who already qualified), but worth an operator eyeball since it is a non-obvious asymmetry in a one-shot-looking gate.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxping",
  "type": "cvar",
  "description": "Sets the highest ping (in milliseconds) a client may have to play. When someone tries to join as a player, if their ping is above this limit they are told their ping is too high and are forced to spectator instead; the check is run only when joining as a player, never on spectators; once a client's ping passes it is not re-checked, but a client rejected for high ping is re-checked if it tries to join again.\n\nUnit: milliseconds.\n0 = no ping limit (anyone may play).\n\nDefault: 0.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:182. Enforcing read-site src/sv_user.c:182-188 (PlayerCheckPing): `int maxping = Q_atof(sv_maxping.string);` then `if (maxping && playerping > maxping)` -> prints \"Your ping is too high ... Forcing spectator.\" and returns false. Polarity/OFF-state: `maxping &&` short-circuits when 0 -> no limit. Unit ms: `playerping = ... ping_time * 1000` (src/sv_user.c:183). Forced-to-spectator + player-only scope traced to the callers: Cmd_Spawn at src/sv_user.c:460-468 guards `if (!sv_client->spectator)` then on `!PlayerCheckPing()` sets `sv_client->spectator = true` + `*spectator` userinfo; the spectator->player join path at src/sv_user.c:2696 returns (aborts the join) on `!PlayerCheckPing()`. Once-only: `if (sv_client->maxping_met) return true;` (src/sv_user.c:180) + `sv_client->maxping_met = true;` (src/sv_user.c:190); server.h:366 comment \"set if user meets maxping requirements\". Default 0 from registration `cvar_t sv_maxping = {\"sv_maxping\", \"0\"}` (src/sv_user.c:36). Set-by: server cvar, Cvar_Register src/sv_user.c:4908, no command setter. KTX cross-check: no sv_maxping reference in ktx/src (grep clean) -> live engine behavior, no mod override.",
  "description_proposed": null
}
```
