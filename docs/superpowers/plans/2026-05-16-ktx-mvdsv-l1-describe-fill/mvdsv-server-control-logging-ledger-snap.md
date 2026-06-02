# describe-fill-synthesis ledger -- mvdsv `snap`

- **project:** mvdsv
- **knob:** `snap` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `server-control-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:snap: synthesized -- admin screenshot request (stufftext 'cmd snap' to one userid; client uploads gamedir/snap/<uid>-NN.pcx; player may refuse); ucmds 'snap' is the refusal reply not a request; no KTX override -- origin=synthesized ref=src/sv_ccmds.c:1701 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Requests a screenshot from a connected player and saves it on the server. The server tells the targeted client to capture its current view; the client uploads the image, which is written to the server as a .pcx file under the gamedir's snap/ folder (named <userid>-NN.pcx, numbered 00-99). The targeted player can refuse it, which is announced to the other players.
>
> snap <userid> = request a screenshot from the player with that user id, e.g. `snap 7`. Prints "userid not found" if no connected client has that id.
>
> Set by: server console / rcon (admin only).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| server tells the client to capture (stufftext 'cmd snap') | src/sv_ccmds.c:1748-1749 | `ClientReliableWrite_Begin(cl, svc_stufftext, 24); ClientReliableWrite_String(cl, "cmd snap\n");` | MATCH |
| target is the client whose userid matches the arg | src/sv_ccmds.c:1709-1719 + 1768 | `if (cl->userid == uid) break;` ; `if (i >= MAX_CLIENTS) { Con_Printf("userid not found\n"); return; }` ; `uid = Q_atoi(Cmd_Argv(1));` | MATCH |
| arg form `snap <userid>` | src/sv_ccmds.c:1762-1765 | `if (Cmd_Argc() != 2) { Con_Printf("Usage:  snap <userid>\n"); return; }` | MATCH |
| saved as gamedir/snap/<uid>-NN.pcx | src/sv_ccmds.c:1722-1729 | `FS_CreatePath(va("%s/snap/", fs_gamedir));` ; `snprintf(checkname, MAX_OSPATH, "%s/snap/%s", fs_gamedir, pcxname);` with `pcxname = "%d-00.pcx"` | MATCH |
| slot number NN scans 00-99 | src/sv_ccmds.c:1725-1739 | `for (i=0;i<=99;i++){ ... f=fopen(checkname,"rb"); if(!f) break; } if(i==100) { Con_Printf("Snap: Couldn't create a file..."); return; }` | MATCH |
| player may refuse (refusal is the ucmds 'snap', not a request) | src/sv_user.c:3334 + 2498-2505 | `{"snap", Cmd_NoSnap_f, false},` ; `Cmd_NoSnap_f: *uploadfn=0; SV_BroadcastPrintf(... "%s refused remote screenshot\n", name)` | MATCH |
| access-class admin-only (console/rcon) | src/sv_ccmds.c:1833 + src/sv_user.c:3408-3424 | `Cmd_AddCommand("snap", SV_Snap_f);` ; only ucmds 'snap' is the refusal reply; no fall-through | MATCH |
| no KTX override | ktx/src (grep) | grep 'snap'/'SV_Snap' ktx/src -> 0 hits | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Server-side command; requests a screenshot from a connected player and saves it on the server | sv_ccmds.c:1833 (reg) / :1701 (fn) / :1749 (request) | `Cmd_AddCommand ("snap", SV_Snap_f);` ... `void SV_Snap (int uid)` ... `ClientReliableWrite_String (cl, "cmd snap\n");` | MATCH |
| 2 | Server tells targeted client to capture its view; client uploads the image | sv_ccmds.c:1748-1749 / sv_user.c:1302,1346 | `ClientReliableWrite_Begin (cl, svc_stufftext, 24); ClientReliableWrite_String (cl, "cmd snap\n");` ... (recv) `sv_client->upload = fopen(name, "wb");` | MATCH |
| 3 | Written to the server as a .pcx file | sv_ccmds.c:1723,1740 / sv_user.c:1365 | `snprintf (pcxname, sizeof (pcxname), "%d-00.pcx", uid);` ... `strlcpy(cl->uploadfn, checkname, MAX_QPATH);` ... `fwrite (net_message.data + msg_readcount, 1, size, sv_client->upload);` | MATCH (server filename is `.pcx`; server writes whatever bytes the client sends into that file -- no PCX content validation, but the doc's claim is about the server-side filename, which holds) |
| 4 | Located under the gamedir's snap/ folder | sv_ccmds.c:1722,1729 | `FS_CreatePath (va ("%s/snap/", fs_gamedir));` ... `snprintf (checkname, MAX_OSPATH, "%s/snap/%s", fs_gamedir, pcxname);` | MATCH |
| 5 | Named `<userid>-NN.pcx`, numbered 00-99 | sv_ccmds.c:1723,1725-1728,1735 | `snprintf (pcxname, ... "%d-00.pcx", uid);` ... `for (i=0 ; i<=99 ; i++){ pcxname[..6]=i/10+'0'; pcxname[..5]=i%10+'0'; ...}` ... `if (i==100){ Con_Printf ("Snap: Couldn't create a file, clean some out.\n"); return; }` | MATCH (userid; 00..99; at 100 it errors) |
| 6 | The targeted player is shown that a remote screenshot was taken | (no enforcing site in MVDSV) | grep "screenshot" / "remote snap" in src/*.c yields only the REFUSAL broadcast (sv_user.c:2503). The only OutofBandPrintf replies (sv_user.c:1357,1391) go to `snap_from` = the requesting ADMIN, NOT the player. | UNTRACEABLE -- the player-facing "screenshot was taken" notice is client-side (ezQuake reacts to the stuffed `cmd snap`); MVDSV emits NO player-facing message on the request path |
| 7 | The player may refuse it | sv_user.c:3334,3410-3413 / :2498-2504 | `{"snap", Cmd_NoSnap_f, false}` ... `if (!u->overrideable) { u->func(); goto out; }` ... `if (*sv_client->uploadfn){ *sv_client->uploadfn = 0; SV_BroadcastPrintf (PRINT_HIGH, "%s refused remote screenshot\n", ...); }` | MATCH (client typing `snap` is hard-wired to the refuse handler; `overrideable=false` blocks progs override) |
| 8 | `snap <userid>` = request from that user id; e.g. `snap 7` | sv_ccmds.c:1762-1770 | `if (Cmd_Argc() != 2){ Con_Printf ("Usage:  snap <userid>\n"); return; } uid = Q_atoi(Cmd_Argv(1)); SV_Snap(uid);` | MATCH |
| 9 | Prints "userid not found" if no connected client has that id | sv_ccmds.c:1709-1719 | `for (...) { if (cl->state < cs_preconnected) continue; if (cl->userid == uid) break; } if (i >= MAX_CLIENTS){ Con_Printf ("userid not found\n"); return; }` | MATCH (exact string; "connected" = state >= cs_preconnected) |
| 10 | Set by: server console / rcon (admin only) | sv_ccmds.c:1815,1833 / sv_main.c:1708,1747-1770,1828 | `void SV_InitOperatorCommands (void)` ... `Cmd_AddCommand ("snap", SV_Snap_f);` ... rcon: `else if (Rcon_Validate (remote_command, rcon_password.string))` ... (snap NOT in the rcon blacklist) ... `Cmd_ExecuteString(str);` | MATCH (operator command: console Cmd-buffer + password-gated rcon both reach it; client `snap` diverts to refuse, never the operator fn) |

**V-pass notes:** 9 of 10 clauses TRACED-MATCH against mvdsv @ 1.11-53-g18d0362. Core mechanism (request -> stuff `cmd snap` -> client upload -> write `<userid>-NN.pcx` under gamedir/snap/, 00-99, "userid not found" on miss, refuse path, console+rcon admin-only) is fully enforce-traced and correct.

The single defect is Clause 6: "The targeted player is shown that a remote screenshot was taken." This is a player-facing NOTIFICATION side-effect claim with NO enforcing read-site in MVDSV. Wide-grep of src/*.c for "screenshot"/"remote snap"/"remote_snap" shows the server's ONLY player-visible message about snap is the REFUSAL broadcast (sv_user.c:2503, "%s refused remote screenshot"). The two OutofBandPrintf status messages (sv_user.c:1357 "Server receiving...", :1391 "upload completed...") are addressed to `cl->snap_from` -- the address of the ADMIN who issued the request -- not to the targeted player. The player's awareness of the capture is entirely client-side: the server stuffs `cmd snap`, and the ezQuake/QW client (outside this repo) is what takes the shot and shows any on-screen indicator. So the "is shown" assertion is plausibly true in practice but is asserted as MVDSV behavior and cannot be enforce-traced in the documented codebase. Per enforce-trace discipline this is the flavour-C "side-effect claim with no enforcing read-site on the feature itself" pattern -> C-NEAR-MISS (not C-FIX: nothing contradicts it; not WI2: it is not a default/access-class metadata error).

Suggested minimal remedy (for the synth pass, not applied here): drop or hedge the "is shown" half of the sentence -- the refuse capability is the only player-side fact MVDSV enforces. E.g. "The targeted player can refuse the request (typing `snap` at their console refuses it and broadcasts that they refused)." The on-screen "screenshot taken" notice belongs to the client, not the server, so attributing it to this command is the imprecision.

Two precision notes that did NOT change a verdict: (a) Clause 3 -- the server writes whatever bytes the client uploads into the `.pcx`-named file with no PCX validation; "written ... as a .pcx file" is accurate only as a statement about the server filename, which is what holds. (b) The doc does not mention `snapall` (SV_SnapAll_f, sv_ccmds.c:1778 -- snaps every non-spectator), which is correct scoping since the knob under review is `snap`, not `snapall`; flagged below as off-scope FYI only.

## flags_for_review

- [fyi/off-scope-entity/vpass] remote_snap semantics: SV_Snap sets cl->remote_snap = (sv_redirected != RD_NONE) at sv_ccmds.c:1743-1746, i.e. TRUE when the snap was issued via rcon (RD_PACKET redirect), FALSE from local server console. remote_snap gates (1) the OutofBandPrintf status/completion replies back to the rcon admin (sv_user.c:1356-1358,1383-1394) and (2) an upload-size cap `(pos+size) > sv_maxuploadsize.value` enforced ONLY for remote snaps (sv_user.c:1337). So a console-issued snap has NO sv_maxuploadsize cap on the incoming upload, while an rcon-issued one does. Not a contradiction of any clause in the proposed text (the doc does not mention size limits), but it is a real behavioral asymmetry a fuller user-doc might note.
- [fyi/off-scope-entity/vpass] Sibling command `snapall` (SV_SnapAll_f, sv_ccmds.c:1778, registered :1834) iterates all clients with state >= cs_preconnected AND !spectator and calls SV_Snap on each -- a bulk variant. Out of scope for the `snap` knob under review (correctly not mentioned), but it exists as a paired operator command if the fleet documents it separately.
- [fyi/suspected-bug/vpass] Client refuse handler `Cmd_NoSnap_f` only clears uploadfn/broadcasts if `*sv_client->uploadfn` is non-empty (sv_user.c:2500). uploadfn is shared with the legitimate `upload`/`download` file-transfer path (set at sv_user.c:2250 for Cmd_Upload_f, and cleared on drop at sv_main.c:423). This means a client typing `snap` while a non-snap upload is staged (uploadfn set by `upload`) would also clear that uploadfn and emit the misleading 'refused remote screenshot' broadcast. Low-severity edge interaction; does not affect the proposed description's correctness, but is a latent quirk worth an FYI.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, cuff=C-FIX, removeip=C-FIX, record=C-FIX, mute=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "snap",
  "type": "command",
  "description": "Requests a screenshot from a connected player and saves it on the server. The server tells the targeted client to capture its current view; the client uploads the image, which is written to the server as a .pcx file under the gamedir's snap/ folder (named <userid>-NN.pcx, numbered 00-99). The targeted player can refuse it, which is announced to the other players.\n\nsnap <userid> = request a screenshot from the player with that user id, e.g. `snap 7`. Prints \"userid not found\" if no connected client has that id.\n\nSet by: server console / rcon (admin only).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_ccmds.c:1701. Admin command handler SV_Snap_f (src/sv_ccmds.c:1758): requires exactly 2 args else 'Usage:  snap <userid>' (sv_ccmds.c:1762-1765); uid = Q_atoi(Cmd_Argv(1)); SV_Snap(uid) (sv_ccmds.c:1768-1770). SV_Snap (src/sv_ccmds.c:1701-1751): loops svs.clients for a client with cl->userid==uid (sv_ccmds.c:1709-1714); if none -> 'userid not found' (sv_ccmds.c:1716-1719). File-path clause: FS_CreatePath(va(\"%s/snap/\", fs_gamedir)) and checkname snprintf'd as '%s/snap/%s' with fs_gamedir + '<uid>-NN.pcx' (sv_ccmds.c:1722-1729) -> gamedir/snap/<uid>-NN.pcx; NN scans 00..99 for a free slot (sv_ccmds.c:1723-1739), 'Couldn't create a file' if all 100 taken. Mechanism clause: sets cl->uploadfn to the target path (sv_ccmds.c:1740) then ClientReliableWrite svc_stufftext 'cmd snap\\n' to the client (sv_ccmds.c:1748-1749) i.e. server tells client to capture+upload; 'Requesting snap from user %d' printed (sv_ccmds.c:1750). SNAP TRAP / refuse clause: the ucmds[] entry {\"snap\", Cmd_NoSnap_f} (src/sv_user.c:3334) is the CLIENT-side upload-REPLY, not a client-issuable screenshot request -- Cmd_NoSnap_f (sv_user.c:2498-2505) clears uploadfn and broadcasts '<name> refused remote screenshot' (so the player can refuse). I documented the admin command and explicitly did NOT claim clients can request snaps. ACCESS-CLASS: SV_Snap_f registered via Cmd_AddCommand only (sv_ccmds.c:1833); the only ucmds[] 'snap' is the refusal reply -> the screenshot request is admin-only console/rcon. F-MV1: grep ktx/src for snap/SV_Snap -> 0 hits, no KTX override. Output extension .pcx is the on-disk format (uploadfn path ends .pcx); did not claim a viewer or conversion the code does not perform.",
  "description_proposed": null
}
```
