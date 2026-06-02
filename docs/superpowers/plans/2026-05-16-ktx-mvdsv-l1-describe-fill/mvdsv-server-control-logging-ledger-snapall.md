# describe-fill-synthesis ledger -- mvdsv `snapall`

- **project:** mvdsv
- **knob:** `snapall` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:snapall: synthesized -- admin command snapping every non-spectator client via SV_Snap (gamedir/snap/<uid>-NN.pcx; players may refuse); spectators skipped; no-arg; admin-only; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:1787 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Requests a screenshot from every connected player at once (spectators are skipped). Each targeted client is told to capture its current view and uploads the image, which the server saves as a .pcx file under the gamedir's snap/ folder (named <userid>-NN.pcx). Each targeted player can refuse it, which is announced to the other players. Takes no arguments.
>
> Set by: server console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| screenshots every connected client | src/sv_ccmds.c:1783-1787 | `for (i=0, cl=svs.clients; i<MAX_CLIENTS; i++, cl++) { ... SV_Snap(cl->userid); }` | MATCH |
| spectators (and not-yet-connected) skipped | src/sv_ccmds.c:1785 | `if (cl->state < cs_preconnected || cl->spectator) continue;` | MATCH |
| per-target capture+save identical to snap (delegates to SV_Snap) | src/sv_ccmds.c:1787 -> 1701/1748-1749/1722-1729 | `SV_Snap(cl->userid);` ; SV_Snap sends 'cmd snap' stufftext and writes fs_gamedir/snap/<uid>-NN.pcx | MATCH |
| player may refuse | src/sv_user.c:2498-2505 + 3334 | `Cmd_NoSnap_f` clears uploadfn + broadcasts refusal; ucmds `{"snap", Cmd_NoSnap_f}` | MATCH |
| takes no arguments | src/sv_ccmds.c:1778-1789 | SV_SnapAll_f body reads no Cmd_Argv / has no Cmd_Argc gate | MATCH |
| access-class admin-only (console/rcon) | src/sv_ccmds.c:1834 + src/sv_user.c:3408-3424 | `Cmd_AddCommand("snapall", SV_SnapAll_f);` ; 'snapall' not in ucmds[]; no fall-through | MATCH |
| no KTX override | ktx/src (grep) | grep 'snapall' ktx/src -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Requests a screenshot from every connected player at once | sv_ccmds.c:1783-1788 | `for (i=0, cl=svs.clients; i<MAX_CLIENTS; i++, cl++){ ... SV_Snap(cl->userid); }` | MATCH |
| 2 | spectators are skipped | sv_ccmds.c:1785 | `if (cl->state < cs_preconnected \|\| cl->spectator) continue;` | MATCH |
| 3 | targeted client told to capture its view and uploads the image | sv_ccmds.c:1748-1749 (`cmd snap` stufftext) -> sv_user.c:1346,1365 (recv: `fopen(name,"wb")`, `fwrite(... size, sv_client->upload)`) | `ClientReliableWrite_String (cl, "cmd snap\n");` / `fwrite (net_message.data + msg_readcount, 1, size, sv_client->upload);` | MATCH |
| 4 | server saves as a .pcx file under gamedir's snap/ folder | sv_ccmds.c:1722,1729,1740 -> sv_user.c:1346 | `FS_CreatePath(va("%s/snap/", fs_gamedir));` / `snprintf(checkname,...,"%s/snap/%s", fs_gamedir, pcxname);` / `strlcpy(cl->uploadfn, checkname, MAX_QPATH);` / recv `sv_client->upload = fopen(name, "wb");` | MATCH |
| 5 | named `<userid>-NN.pcx` | sv_ccmds.c:1723,1727-1728 | `snprintf(pcxname,sizeof(pcxname),"%d-00.pcx", uid);` then per-i `pcxname[len-6]=i/10+'0'; pcxname[len-5]=i%10+'0';` (NN = 00..99) | MATCH |
| 6a | Each player is shown that a remote screenshot was taken | (none) — server-directed output to player is only the silent `cmd snap` stufftext; all OOB progress prints (sv_user.c:1357,1391) target `sv_client->snap_from` = ADMIN's `net_from`, not the player; no player-facing "screenshot taken" message exists server-side | n/a | UNTRACEABLE (client-side / ezquake display, not MVDSV-enforced) |
| 6b | and may refuse it | sv_user.c:3334 + 2498-2504 | `{"snap", Cmd_NoSnap_f, false}` ; `Cmd_NoSnap_f`: `if(*sv_client->uploadfn){ *sv_client->uploadfn=0; SV_BroadcastPrintf(PRINT_HIGH,"%s refused remote screenshot\n", sv_client->name);}` | MATCH |
| 7 | Takes no arguments | sv_ccmds.c:1778-1789 | `SV_SnapAll_f` body reads no `Cmd_Argv`/`Cmd_Argc` | MATCH |
| 8 | Set by: server console / rcon (admin only) | sv_ccmds.c:1834 (registered in SV_InitOperatorCommands via Cmd_AddCommand); NOT present in client `ucmds[]` table (sv_user.c:3299-3393) | `Cmd_AddCommand ("snapall", SV_SnapAll_f);` | MATCH |

**V-pass notes:** Version confirmed: 1.11-53-g18d0362.

8 of 9 clauses MATCH against located enforcing lines. The row is essentially correct and well-traced for the mechanism (loop, spectator-skip, stufftext request, snap/ save path, pcx naming, no-args, admin-only registration, and the refusal path).

The single defect is clause 6a -- "Each player is shown that a remote screenshot was taken." This is flavour-C: a display/notification claim with NO MVDSV server-side enforcing site.
- The server's only player-directed action is `ClientReliableWrite_String(cl, "cmd snap\n")` (sv_ccmds.c:1749) -- a silent console command the client executes. Whether the targeted player SEES "a remote screenshot was taken" is entirely client-side (ezquake) behavior, not in this tree.
- The two `OutofBandPrintf` notices in the receive path (sv_user.c:1357 "Server receiving..." and 1391 "upload completed...") are sent to `sv_client->snap_from`, which `SV_Snap` set to the ADMIN's `net_from` (sv_ccmds.c:1742) -- they inform the admin, not the player.
- The only player-broadcast text, `"%s refused remote screenshot"` (sv_user.c:2503), fires ONLY when the player refuses, never on capture.

So the "may refuse it" half (6b) IS genuinely server-enforced (client sends `snap` -> `Cmd_NoSnap_f` clears `uploadfn` and broadcasts the refusal), but the "is shown that a screenshot was taken" half is correct-by-accident-for-ezquake with no server-side read-site. Because the row is otherwise accurate and 6b holds, this is C-NEAR-MISS (not C-FIX). Suggested fix: drop or hedge the "is shown that a remote screenshot was taken" assertion (it is a client-side notice), or reframe 6 as "The targeted player's client may decline the request (sending the `snap` command), which aborts the upload and broadcasts that the player refused the remote screenshot."

Minor precision (does not change any clause verdict, see flag): the `remote_snap` flag is set true only when `sv_redirected != RD_NONE` (sv_ccmds.c:1743-1746), i.e. when snapall is issued over rcon redirect. Issued from a literal local server console, `remote_snap` stays false, which suppresses the admin-facing OOB progress messages AND the `sv_maxuploadsize` cap on the incoming upload (sv_user.c:1337 gates the size check on `sv_client->remote_snap`). The screenshot is still requested and saved either way. The description does not assert anything about this, so no contradiction.

## flags_for_review

- [fyi/other/vpass] remote_snap is only set true when sv_redirected != RD_NONE (sv_ccmds.c:1743-1746), i.e. when snapall/snap is invoked via rcon redirect. From a literal local server console it stays false, which (a) suppresses the admin-facing 'Server receiving...' / 'upload completed' OutofBandPrintf notices, and (b) disables the sv_maxuploadsize upload-size cap (sv_user.c:1337 gates `(pos+size) > sv_maxuploadsize.value` on `sv_client->remote_snap`). So a console-issued snap accepts an unbounded-size upload while an rcon-issued one is capped. Not asserted by the description, but a latent asymmetry worth knowing.
- [fyi/other/vpass] The player refusal mechanism (clause 6b) is the client command `snap` -> Cmd_NoSnap_f, and it only works while `uploadfn` is non-empty (i.e. between the request and upload completion). It also clears uploadfn unconditionally and broadcasts to ALL players ('%s refused remote screenshot'), not just the requesting admin. The description's 'may refuse it' is an accurate action-level summary of this.
- [fyi/suspected-bug/vpass] SV_Snap stores the admin's address via `memcpy(&cl->snap_from, &net_from, sizeof(net_from))` at request time (sv_ccmds.c:1742). When invoked through SV_SnapAll_f, SV_Snap is called once per player but net_from is the single admin/rcon source, so snap_from is correct. Noted only because snap_from is later used as the OOB reply target for upload-progress messages; behavior is consistent with intent, not a defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "snapall",
  "type": "command",
  "description": "Requests a screenshot from every connected player at once (spectators are skipped). Each targeted client is told to capture its current view and uploads the image, which the server saves as a .pcx file under the gamedir's snap/ folder (named <userid>-NN.pcx). Each targeted player can refuse it, which is announced to the other players. Takes no arguments.\n\nSet by: server console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1787. Handler SV_SnapAll_f (src/sv_ccmds.c:1778-1789): loops all svs.clients, skipping any with cl->state < cs_preconnected OR cl->spectator (sv_ccmds.c:1783-1786), and calls SV_Snap(cl->userid) for each remaining (sv_ccmds.c:1787) -> 'every connected non-spectator player' clause. All per-target file/stufftext/refuse behavior is identical to `snap` because it delegates to the same SV_Snap (src/sv_ccmds.c:1701): stufftext 'cmd snap' (sv_ccmds.c:1748-1749), saved to fs_gamedir/snap/<uid>-NN.pcx (sv_ccmds.c:1722-1729), player-refuse path via ucmds Cmd_NoSnap_f (sv_user.c:2498-2505 / 3334) -- traced under the snap record above; reused here. No-arg clause: SV_SnapAll_f reads no Cmd_Argv and has no argc check, so it ignores arguments. ACCESS-CLASS: registered via Cmd_AddCommand only (sv_ccmds.c:1834); NOT in ucmds[] (grep confirmed: only 'snap' (the refusal reply) is in ucmds, not 'snapall') -> admin-only console/rcon (SV_ExecuteUserCommand no fall-through, sv_user.c:3408-3424). F-MV1: grep ktx/src for snapall -> 0 hits, no KTX override. Spectator-skip is the one behavioral difference vs snap (which targets a single explicit userid including spectators) and is the load-bearing distinguishing clause.",
  "description_proposed": null
}
```
