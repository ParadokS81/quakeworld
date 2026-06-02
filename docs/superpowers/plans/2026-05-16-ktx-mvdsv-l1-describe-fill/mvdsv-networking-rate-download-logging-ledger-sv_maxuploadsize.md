# describe-fill-synthesis ledger -- mvdsv `sv_maxuploadsize`

- **project:** mvdsv
- **knob:** `sv_maxuploadsize` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `networking-rate-download-logging` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_maxuploadsize: synthesized -- byte cap on server-requested remote-screenshot uploads (remote_snap-gated; over-limit cancels), default 1MB -- origin=synthesized ref=src/sv_user.c:1337 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Limits the size, in bytes, of a screenshot the server will accept back from a client. When the server requests a screenshot from a player with the rcon/remote snap (or snapall) command and the incoming image grows past this limit, the upload is cancelled (the partial file already written is left on disk). The limit applies only to these rcon-initiated remote screenshot uploads; a snap issued from the local server console is not size-limited.
>
> Unit: bytes.
>
> Default: 1048576 (1 MB).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| cancels upload when size exceeds cap | src/sv_user.c:1337-1341 | `if (pos == -1 || (sv_client->remote_snap && (pos + size) > (int)sv_maxuploadsize.value)) { ... SV_CancelUpload(); return; }` | MATCH |
| scope = remote screenshots only | src/sv_user.c:1337 | `sv_client->remote_snap && (pos + size) > ...` | MATCH |
| remote_snap is the remote-screenshot flag | src/sv_user.c:1356,2265 | `if (sv_client->remote_snap)` ; `sv_client->remote_snap = false;` | MATCH |
| unit bytes (running file position) | src/sv_user.c:1325,1336 | `size = MSG_ReadShort ();` ; `int pos = ftell(sv_client->upload);` | MATCH |
| default 1048576 | src/sv_user.c:42 | `cvar_t sv_maxuploadsize = {"sv_maxuploadsize", "1048576"}` | MATCH |
| KTX override absent | ktx/src (grep) | no sv_maxuploadsize reference | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "Limits the size, in bytes" (UNIT = bytes) | sv_user.c:1325-1337 | `size = MSG_ReadShort ();` ... `int pos = ftell(sv_client->upload);` ... `(pos + size) > (int)sv_maxuploadsize.value` | MATCH -- `pos`=ftell byte offset, `size`=byte count of incoming chunk; comparison is byte-domain. |
| 2 | "of a remote screenshot the server will accept back from a client" (the gated transfer is a server-requested screenshot) | sv_ccmds.c:1701-1750 (SV_Snap), trigger sv_user.c:1337 | `snprintf (pcxname, sizeof (pcxname), "%d-00.pcx", uid);` ... `ClientReliableWrite_String (cl, "cmd snap\n");` | MATCH -- `snap`/`snapall` writes a .pcx filename and stuffs `cmd snap` so the client screenshots and uploads back; the limit's read-site is gated on this path's `remote_snap`. |
| 3 | "When ... the incoming image grows past this limit, the upload is cancelled" (POLARITY: strictly-greater-than -> cancel) | sv_user.c:1337-1342 | `if (pos == -1 \|\| (sv_client->remote_snap && (pos + size) > (int)sv_maxuploadsize.value)) { msg_readcount += size; SV_CancelUpload(); return; }` | MATCH -- `>` (strict) triggers `SV_CancelUpload()`; checked before writing the chunk that would push cumulative bytes over. |
| 4 | "...and discarded" (partial data thrown away / cleaned up) | sv_user.c:1290-1301 (SV_CancelUpload) | `if (sv_client->upload){ fclose (sv_client->upload); sv_client->upload = NULL; sv_client->file_percent = 0; }` (no remove/unlink/delete in body) | MISMATCH (minor) -- transfer is aborted and FILE* closed, but the partial .pcx already written to `fs_gamedir/snap/` is NOT deleted. "Discarded" overstates; "cancelled/aborted" is accurate. |
| 5 | "The limit applies only to these server-initiated remote screenshot uploads" (SCOPE) | gate sv_user.c:1337; setter sv_ccmds.c:1742-1746; exempt path sv_user.c:2265 | gate: `sv_client->remote_snap && ...`; setter: `if (sv_redirected != RD_NONE) cl->remote_snap = true; else cl->remote_snap = false;`; `upload` cmd: `sv_client->remote_snap = false;` | MATCH-with-imprecision -- TRUE that only remote-snap uploads are limited (regular `upload`/`fileul` is exempt). But "remote" is load-bearing & unstated: `remote_snap` is true ONLY when the snap was issued via a redirected/rcon channel (`sv_redirected != RD_NONE`); a snap from the LOCAL server console is `remote_snap=false` and is NOT size-limited. Exemption unstated. |
| 6 | "Default: 1048576 (1 MB)" (METADATA: registered default) | sv_user.c:42 (registration), 4912 (Cvar_Register) | `cvar_t sv_maxuploadsize = {"sv_maxuploadsize", "1048576"};` | MATCH -- registered default literally "1048576" = 1024*1024 = 1 MiB. Single registration, no override. |
| 7 | "Set by: server config / rcon" (METADATA: access) | sv_user.c:42 | `cvar_t sv_maxuploadsize = {"sv_maxuploadsize", "1048576"};` (no CVAR_ROM/CVAR_SERVERINFO/etc. flags) | MATCH -- plain cvar, no settability restriction; ordinary server config/rcon set is correct (generic but true). |

**V-pass notes:** VERDICT: C-NEAR-MISS. Oracle confirmed mvdsv @ 1.11-53-g18d0362. Three use-sites total (registration sv_user.c:42, Cvar_Register sv_user.c:4912, sole enforcing read sv_user.c:1337) -- fully traced, no untraced callee, no second registration.

Core behavior is correct: the cvar caps cumulative bytes of a server-requested client screenshot upload, cancels via strict `>` before the over-limit chunk is written, applies only to the snap path (regular `upload` is explicitly exempt at sv_user.c:2265). Polarity, unit, default (1048576 = 1 MiB), and settability all MATCH at their enforcing lines.

Two minor imprecisions push it off TRACED-CLEAN (both flavour-C-adjacent: text reads as fact but the enforcing code is narrower / different):

(1) SCOPE word "remote" is unstated load-bearing. The limit fires only when `sv_client->remote_snap` is true. `SV_Snap` (sv_ccmds.c:1742-1746) sets `remote_snap = true` ONLY when `sv_redirected != RD_NONE` -- i.e. the `snap` command was issued through a redirected output channel (rcon / remote console; RD_PACKET etc. per server.h:882 `typedef enum {RD_NONE, RD_CLIENT, RD_PACKET, RD_MOD}`). A snap issued from the LOCAL server console (`sv_redirected == RD_NONE`) sets `remote_snap = false`, so that screenshot upload is NOT size-limited at all. The description's "remote" happens to be defensible if read as "rcon-initiated," but the local-console-snap exemption is never surfaced and a reader can mis-read "remote" as merely "from a remote client" (always true). Clause is TRUE-but-narrower-than-stated.

(2) "discarded" overstates. `SV_CancelUpload()` (sv_user.c:1290-1301) sends "Upload denied", stuffs `stopul`, `fclose`s the handle and nulls it -- it does NOT `remove`/`unlink` the partial .pcx already written under `fs_gamedir/snap/`. The rest of the incoming packet is skipped (`msg_readcount += size`, sv_user.c:1339). "Cancelled/aborted" is exact; "discarded" implies cleanup that does not happen.

Neither imprecision contradicts code (so not C-FIX); metadata is correct (so not WI2-FIX). Both clauses are traceable and the row is essentially right -> C-NEAR-MISS.

Suggested minimal tightening for re-synth: replace "remote screenshot" scope sentence with one that names the trigger ("a screenshot the server requested via the rcon/remote `snap` (or `snapall`) command") and note the local-console-snap exemption; change "cancelled and discarded" to "cancelled (the in-progress transfer is aborted; the partial file on disk is left in place)".

## flags_for_review

- [review/other/vpass] Local-console snap exemption: SV_Snap (sv_ccmds.c:1742-1746) sets remote_snap=true ONLY when sv_redirected != RD_NONE. A `snap`/`snapall` issued from the local server console (RD_NONE) sets remote_snap=false, so the resulting screenshot upload bypasses sv_maxuploadsize entirely. This is by-design (admin at the local console is trusted) but is an unstated scope narrowing that the proposed description glosses with the bare word 'remote'.
- [fyi/suspected-bug/vpass] SV_CancelUpload (sv_user.c:1290-1301) does not delete the partial .pcx written under fs_gamedir/snap/; it only fclose()s the handle. A client that repeatedly triggers the size cancel (or otherwise aborts mid-upload) can leave partial snap files accumulating on disk. Not a sv_maxuploadsize correctness bug -- noting because the proposed word 'discarded' implies cleanup that does not occur, and because it is a minor disk-hygiene side effect of the cancel path.
- [fyi/other/vpass] sv_maxuploadsize.value (a float cvar) is cast to (int) at the comparison site sv_user.c:1337: `(pos + size) > (int)sv_maxuploadsize.value`. Both pos (ftell, long) and size (short) are ints; the cap is therefore an int-byte threshold. No clause in the description depends on this, but a setting above INT_MAX bytes (~2.1 GB) would be truncated/UB on cast -- far outside any realistic screenshot size, FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: allow_download=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_maxuploadsize",
  "type": "cvar",
  "description": "Limits the size, in bytes, of a screenshot the server will accept back from a client. When the server requests a screenshot from a player with the rcon/remote snap (or snapall) command and the incoming image grows past this limit, the upload is cancelled (the partial file already written is left on disk). The limit applies only to these rcon-initiated remote screenshot uploads; a snap issued from the local server console is not size-limited.\n\nUnit: bytes.\n\nDefault: 1048576 (1 MB).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:1337. Enforcing read-site src/sv_user.c:1334-1342 (SV_NextUpload, per-chunk upload handler): `if (sv_client->upload) { int pos = ftell(sv_client->upload); if (pos == -1 || (sv_client->remote_snap && (pos + size) > (int)sv_maxuploadsize.value)) { msg_readcount += size; SV_CancelUpload(); return; } }`. So when accumulated bytes (pos+size) exceed the cap the upload is cancelled. SCOPE (load-bearing): the cap is gated on `sv_client->remote_snap &&` -> it applies ONLY to remote-screenshot uploads, not arbitrary uploads. remote_snap is the remote-screenshot flag (set in the snap request path, referenced src/sv_user.c:1356,1383; cleared src/sv_user.c:2265 `sv_client->remote_snap = false;`). Unit bytes: compared directly to the running file position `pos + size` from `ftell` and `MSG_ReadShort` chunk size (src/sv_user.c:1325). Default 1048576 from registration `cvar_t sv_maxuploadsize = {\"sv_maxuploadsize\", \"1048576\"}` (src/sv_user.c:42); Cvar_Register src/sv_user.c:4912. Set-by: server cvar. KTX cross-check: no sv_maxuploadsize reference in ktx/src (grep clean) -> live engine behavior, no override.",
  "description_proposed": null
}
```
