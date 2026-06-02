# describe-fill-synthesis ledger -- mvdsv `sv_specprint`

- **project:** mvdsv
- **knob:** `sv_specprint` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_specprint: synthesized -- bitmask (1 centerprint / 2 sprint / 4 stuffcmd) mirroring a player's private server messages to spectators tracking them; server default seeded per-client, overridable via sp userinfo; default 0; no KTX override -- origin=synthesized ref=src/pr2_cmds.c:367 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Lets spectators see private server-to-player messages for the player they are following. It is a bitmask selecting which message kinds are mirrored to the tracking spectator. This cvar is the master gate, checked on every mirrored message, and also seeds each connecting client's per-client setting. The per-client sp userinfo can only narrow what a spectator receives within what this cvar enables -- it cannot grant a message kind the server has disabled. For sprints the spectator's own sp applies; for centerprints and stuffcmds the bit that actually governs is the followed player's sp, not the spectator's.
>
> 1 = centerprints (on-screen center text)
> 2 = sprints (console/chat-area print messages)
> 4 = stuffcmds (commands the server sends a client to run)
> (add the values to combine, e.g. 3 = centerprints + sprints)
>
> Default: 0 (nothing mirrored to spectators).
> Set by: server config / rcon (per-client narrowing via the sp userinfo key).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| default 0 | src/sv_main.c:117 | `cvar_t sv_specprint = {"sv_specprint", "0"};` | MATCH |
| bitmask values 1/2/4 | src/server.h:40 | `#define SPECPRINT_CENTERPRINT 0x1` / `SPECPRINT_SPRINT 0x2` / `SPECPRINT_STUFFCMD 0x4` | MATCH |
| bit 0x1 mirrors centerprint to tracking spec | src/pr2_cmds.c:421 | `if ((int)sv_specprint.value & SPECPRINT_CENTERPRINT)` | MATCH |
| bit 0x2 mirrors sprint to tracking spec | src/pr2_cmds.c:367 | `if ((int)sv_specprint.value & SPECPRINT_SPRINT)` | MATCH |
| bit 0x4 mirrors stuffcmd to tracking spec | src/pr2_cmds.c:762 | `if ((int)sv_specprint.value & SPECPRINT_STUFFCMD)` | MATCH |
| forwarded only to specs tracking the target | src/pr2_cmds.c:374 | `if ((cl->spec_track == entnum) && (cl->spec_print & SPECPRINT_SPRINT))` | MATCH |
| cvar seeds per-client default at connect | src/sv_main.c:1468 | `newcl->spec_print = (int)sv_specprint.value;` | MATCH |
| per-client override via sp userinfo | src/sv_main.c:3854 | `val = Info_Get(&cl->_userinfo_ctx_, "sp"); if (val[0]) cl->spec_print = Q_atoi(val);` | MATCH |
| no KTX override | ktx/src (grep) | (no hits for sv_specprint) | MATCH |
| BUG: centerprint/stuffcmd check tracked-player flag not spectator's | src/pr2_cmds.c:428 | `if ((spec->spec_track == entnum) && (cl->spec_print & SPECPRINT_CENTERPRINT))` | MISMATCH (cl is the player, spec is the spectator) |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Lets spectators see private server-to-player messages for the player they are following | pr_cmds.c:294, :350, :859; pr2_cmds.c:374, :428, :769 | `if ((cl->spec_track == entnum) && (cl->spec_print & SPECPRINT_SPRINT)) SV_ClientPrintf(cl,...)` (gate on tracked player entnum, mirror to spectator) | MATCH |
| 2 | It is a bitmask selecting which message kinds are mirrored | pr_cmds.c:287/343/852; server.h:40-42 | `if ((int)sv_specprint.value & SPECPRINT_SPRINT)` ; `#define SPECPRINT_CENTERPRINT 0x1` etc | MATCH |
| 3 | Sets the server-wide default for every connecting client | sv_main.c:1468 | `newcl->spec_print = (int)sv_specprint.value;` | MATCH |
| 4 | An individual can override it for themselves with the sp userinfo setting | sv_main.c:3852-3854 (sp->spec_print) AND outer gate pr_cmds.c:287/343/852 AND inner check pr_cmds.c:350/859 (player's bit) | `val = Info_Get(...,"sp"); if (val[0]) cl->spec_print = Q_atoi(val);` BUT outer gate is `sv_specprint.value` (master AND), and centerprint/stuffcmd inner check is `cl->spec_print` where `cl` = TARGET PLAYER not spectator | MISMATCH |
| 5 | 1 = centerprints (on-screen center text) | server.h:40; pr_cmds.c:343-356 | `#define SPECPRINT_CENTERPRINT 0x1` ; mirrors svc_centerprint | MATCH |
| 6 | 2 = sprints (console/chat-area print messages) | server.h:41; pr_cmds.c:287-297 | `#define SPECPRINT_SPRINT 0x2` ; mirrors via SV_ClientPrintf | MATCH |
| 7 | 4 = stuffcmds (commands the server sends a client to run) | server.h:42; pr_cmds.c:852-865 | `#define SPECPRINT_STUFFCMD 0x4` ; mirrors svc_stufftext | MATCH |
| 8 | Add values to combine, e.g. 3 = centerprints + sprints | server.h:40-42 (independent bits) | bits 0x1/0x2/0x4 tested independently with `&` | MATCH |
| 9 | Default: 0 (nothing mirrored to spectators) | sv_main.c:117 | `cvar_t sv_specprint = {"sv_specprint", "0"};` (plain Cvar_Register, no OnChange) | MATCH |
| 10 | Set by: server config / rcon (per-client override via sp userinfo key) | sv_main.c:3854 + same sites as clause 4 | per-client path real, but "override" framing inherits clause-4 defect (AND-down, and player's-bit for 2 of 3 kinds) | PARTIAL MISMATCH |

**V-pass notes:** CLASSIFICATION: C-FIX. The cvar's identity, bitmask values (CENTERPRINT=0x1 / SPRINT=0x2 / STUFFCMD=0x4, server.h:40-42), default 0 (sv_main.c:117), and the server-wide-default-seed (sv_main.c:1468) are all correct and enforcement-traced. The defect is clause 4 ("an individual can override it for themselves with the sp userinfo setting"), which CONTRADICTS the enforcing code in two independent ways:

(1) AND, not override. Every enforcing site has a TWO-LEVEL gate. Outer: `(int)sv_specprint.value & SPECPRINT_X` (the SERVER cvar). Inner: a per-client `spec_print & SPECPRINT_X`. Both must be set. So `sp` can never grant a spectator a message kind the server cvar has cleared -- it can only further restrict within the server-allowed set. "Override" implies the client value supersedes the server value; the code makes the server cvar a hard master switch (AND semantics).

(2) For 2 of 3 kinds, the inner bit is read off the WRONG client. In PF_sprint (pr_cmds.c:294) and PF2_sprint (pr2_cmds.c:374) the inner check is `cl->spec_print` where `cl` IS the loop spectator -- correct, the spectator's own bit. BUT in PF_centerprint (pr_cmds.c:350), PF_stuffcmd (pr_cmds.c:859), PF2_centerprint (pr2_cmds.c:428), PF2_stuffcmd (pr2_cmds.c:769) the inner check is `cl->spec_print` where `cl` = `&svs.clients[entnum-1]` = the TARGET PLAYER being followed (set at pr_cmds.c:328/824), and the loop variable is `spec`. So a spectator's `sp` has NO effect on whether they receive mirrored centerprints/stuffcmds; the FOLLOWED PLAYER's `sp` bit decides it. The description's "override it for themselves" is therefore flatly wrong for centerprint and stuffcmd, and is at best an AND-down restriction (not an override) for sprint.

VERIFIED METADATA: default 0 confirmed at registration (sv_main.c:117, no OnChange callback -- plain Cvar_Register at sv_main.c:3546); `spec_print` field is per-client (server.h:312); exactly 8 use-sites of `spec_print` traced (the 6 enforcing checks + the seed at 1468 + the sp-userinfo set at 3854); `spec_track` = "entnum of player tracking" (server.h:284), set to i+1 when a spectator tracks a player (sv_user.c:2160); `sp` userinfo parsed in SV_ExtractFromUserinfo (sv_main.c:3720) with raw Q_atoi, no clamp/bound. The description's mapping of bit->kind and the example combination (3 = 1+2) are all correct.

RECOMMENDED FIX for re-synth: reframe clause 4/10 to state that `sv_specprint` is the master gate and that the per-client `sp` userinfo / `spec_print` value can only narrow reception within what the server enables (AND, never up-override). For sprint the spectator's own `sp` participates; for centerprint and stuffcmd the bit checked is the FOLLOWED PLAYER's `sp`, not the spectator's -- so describe `sp` as a per-client narrowing whose effect on centerprint/stuffcmd keys off the tracked player. (Whether the player's-bit-for-centerprint/stuffcmd is an intentional design or a copy-paste bug is a source question flagged below -- the description should not assert the spectator-self semantics that the code does not implement.)

## flags_for_review

- [review/suspected-bug/synthesis] Suspected engine bug in the sv_specprint spectator-forward gates. In PF2_sprint the per-client filter correctly tests the SPECTATOR's own spec_print (pr2_cmds.c:374, `cl` is the spectator loop variable). But PF2_centerprint (pr2_cmds.c:428) and the stuffcmd path (pr2_cmds.c:769) test `cl->spec_print` where `cl` is the TRACKED PLAYER (svs.clients[entnum-1]) rather than the spectator `spec`. The same pattern is duplicated in the native-progs file pr_cmds.c:350 and :859, so it is a long-standing copy-paste rather than a one-off typo. Consequence: a spectator who lowers their own forwarding via the `sp` userinfo would still receive centerprints/stuffcmds if the player they follow has those bits set (and vice-versa). It is masked for the default case because every client is seeded with the same sv_specprint value at connect (sv_main.c:1468), so cl->spec_print == spec->spec_print until someone sets `sp`. Also minor: the `!cl->state` guard at pr2_cmds.c:425/766 checks the player's state inside the spectator loop instead of the spectator's. Candidate upstream fix; surfaced for human review, not actioned here.
- [review/suspected-bug/vpass] Cross-client bit confusion in centerprint/stuffcmd mirror. In PF_centerprint (pr_cmds.c:350), PF_stuffcmd (pr_cmds.c:859), PF2_centerprint (pr2_cmds.c:428), PF2_stuffcmd (pr2_cmds.c:769) the inner gate is `(spec->spec_track == entnum) && (cl->spec_print & SPECPRINT_X)` where `cl` = target player and `spec` = loop spectator. The sprint variants (pr_cmds.c:294, pr2_cmds.c:374) instead use `cl->spec_print` with `cl` = loop spectator. So centerprint/stuffcmd gate on the FOLLOWED PLAYER's bit while sprint gates on the SPECTATOR's bit -- an inconsistency that looks like a copy-paste error in the centerprint/stuffcmd loops (likely meant `spec->spec_print`). This is the root cause of the C-FIX. Upstream-report candidate, not a description fix.
- [review/suspected-bug/vpass] State-check on wrong client (separate from the bit bug). In the spectator loops of centerprint (pr_cmds.c:347, pr2_cmds.c:425) and stuffcmd (pr_cmds.c:856, pr2_cmds.c:766) the guard is `if (!cl->state || !spec->spectator) continue;` -- it tests `cl->state` (the TARGET PLAYER's connection state, invariant across the loop) instead of `spec->state` (the loop spectator's state). The sprint variants correctly test `!cl->state` where `cl` IS the loop var (pr_cmds.c:291, pr2_cmds.c:371). Effect: an unconnected/zombie spectator slot in the centerprint/stuffcmd loop is not skipped on its own state, only on the target's. Pre-existing source quirk, not claimed by the description; flagged for the engine maintainers.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_specprint",
  "type": "cvar",
  "description": "Lets spectators see private server-to-player messages for the player they are following. It is a bitmask selecting which message kinds are mirrored to the tracking spectator. This cvar is the master gate, checked on every mirrored message, and also seeds each connecting client's per-client setting. The per-client sp userinfo can only narrow what a spectator receives within what this cvar enables -- it cannot grant a message kind the server has disabled. For sprints the spectator's own sp applies; for centerprints and stuffcmds the bit that actually governs is the followed player's sp, not the spectator's.\n\n1 = centerprints (on-screen center text)\n2 = sprints (console/chat-area print messages)\n4 = stuffcmds (commands the server sends a client to run)\n(add the values to combine, e.g. 3 = centerprints + sprints)\n\nDefault: 0 (nothing mirrored to spectators).\nSet by: server config / rcon (per-client narrowing via the sp userinfo key).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/pr2_cmds.c:367. Registration cvar_t literal default 0 at src/sv_main.c:117 (WI-2). Bitmask defined src/server.h:40-42: SPECPRINT_CENTERPRINT 0x1, SPECPRINT_SPRINT 0x2, SPECPRINT_STUFFCMD 0x4. Enforcing read-sites (both progs paths -- QVM pr2_cmds.c and native pr_cmds.c): sprint mirrored when `(int)sv_specprint.value & SPECPRINT_SPRINT` (pr2_cmds.c:367, pr_cmds.c:287); centerprint when `& SPECPRINT_CENTERPRINT` (pr2_cmds.c:421, pr_cmds.c:343); stuffcmd when `& SPECPRINT_STUFFCMD` (pr2_cmds.c:762, pr_cmds.c:852). Each gate then loops spectators and forwards the message to those whose spec_track == the target player (e.g. pr2_cmds.c:374). The cvar is the server default seeded into each client at connect: src/sv_main.c:1468 `newcl->spec_print = (int)sv_specprint.value;`. Per-client override via the `sp` userinfo key: src/sv_main.c:3852-3854 `val = Info_Get(...,\"sp\"); if (val[0]) cl->spec_print = Q_atoi(val);` -> inline-justified (action-relevant: a player can opt their own forwarding level independent of the cvar). No CF flags on Cvar_Register (:3546) -> server config/rcon. F-MV1: no KTX reference to sv_specprint (grep empty) -> engine read-sites are the live behavior. NOTE (bug, flagged): the sprint gate checks the SPECTATOR's own spec_print flag (pr2_cmds.c:374 `cl` = the spectator loop var), but the centerprint and stuffcmd gates check the TRACKED PLAYER's flag instead (pr2_cmds.c:428 / :769 use `cl->spec_print` where `cl` = the player at entnum-1, while the spectator is `spec`); identical in pr_cmds.c:350/:859. This only diverges from the documented behavior when a client overrides spec_print via `sp` (otherwise all clients share the cvar value); the description states cvar-level behavior which is unaffected.",
  "description_proposed": null
}
```
