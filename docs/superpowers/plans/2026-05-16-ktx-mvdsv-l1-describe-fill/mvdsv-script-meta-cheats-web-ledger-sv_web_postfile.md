# describe-fill-synthesis ledger -- mvdsv `sv_web_postfile`

- **project:** mvdsv
- **knob:** `sv_web_postfile` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_web_postfile: synthesized -- console/rcon multipart file upload from the game dir to sv_www_address/<path>; '*' uploads the current demo's .txt companion; .cfg/path-escape rejected; curl-build-conditional -- origin=synthesized ref=src/central.c:660 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Uploads a file from the server's game directory to the configured web/stats backend (sv_www_address) as a multipart file upload -- this is how KTX ships game-stats and race top files to the backend. You give it a path on that backend, a request id (an opaque tag stored with the request; KTX passes it empty), the file to send, and optionally extra key/value pairs.
>
> sv_web_postfile <path> <request-id> <file> [<key> <value>]... = upload <file> (relative to the game directory) to sv_www_address/<path>.
> sv_web_postfile <path> <request-id> * [<key> <value>]... = upload the text-summary companion of the demo currently being recorded.
>
> .cfg files and paths that escape the game directory are rejected ("Filename invalid"); a missing file gives "Failed to open file"; with no demo recording, * gives "Not recording demo!". Does nothing ("Address not set - functionality disabled") unless sv_www_address is configured.
>
> Set by: server console / rcon.
> See also: sv_www_address, sv_web_post.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| console/rcon access, not client-issuable | src/sv_user.c:3299-3395 ; src/sv_user.c:3399,3424 | name absent from `ucmds[]`; `SV_ExecuteUserCommand` "Bad user command" no fall-through | MATCH |
| regular rcon reaches it (NOT master-only) | src/sv_main.c:1754-1767 | name absent from `bad_cmd = true` blocklist block | MATCH |
| uploads a real file (multipart) | src/central.c:644-648 ; src/central.c:660 | `curl_formadd(... CURLFORM_PTRNAME,"file", CURLFORM_FILE, path ...)`; `Web_SubmitRequestForm(...)` | MATCH |
| <path> -> sv_www_address/<path> | src/central.c:637,428-438 | `Web_ConstructURL(url, Cmd_Argv(1), ...)` | MATCH |
| request-id arg | src/central.c:604 | `requestId = Cmd_Argv(2)` | MATCH |
| arg count usage <url> <request-id> <file> | src/central.c:599-602 | `if (Cmd_Argc() < 4) { Con_Printf("Usage: %s <url> <request-id> <file> (<key> <value>)*\n", ...) }` | MATCH |
| file path is relative to the game directory | src/central.c:629 ; src/central.c:621 | `snprintf(path, MAX_OSPATH, "%s/%s", fs_gamedir, specified)` ; (`*`) `snprintf(... "%s/%s/%s", fs_gamedir, sv_demoDir.string, SV_MVDName2Txt(demoname))` | MATCH |
| `*` = currently-recording demo's text companion | src/central.c:612-622 | `if (specified[0]=='*' ...) { if (!sv.mvdrecording || !demoname) { ... "Not recording demo!" ...} ... SV_MVDName2Txt(demoname) }` | MATCH |
| .cfg and path-escape rejected | src/central.c:624 ; src/central.c:632 | `if (strstr(specified, ".cfg") || FS_UnsafeFilename(specified)) { ... "Filename invalid" ... }` ; `if (FS_UnsafeFilename(path)) ...` | MATCH |
| missing file -> failure message | src/central.c:639-642 | `if (! CheckFileExists(path)) { Con_Printf("Failed to open file\n"); return; }` | MATCH |
| optional trailing kv params | src/central.c:655,442-526 | `Web_AddParametersToRequest(4, ...)` | MATCH |
| OFF-state: disabled when address unset | src/central.c:594-597 | `if (!sv_www_address.string[0]) { ... "Address not set - functionality disabled" ... return; }` | MATCH |
| KTX is caller not override | ktx/src/race.c:3288 ; ktx/src/stats.c:590 | `localcmd("...sv_web_postfile ServerApi/UploadGameStats ...")` | MATCH |
| registered only in curl-enabled build | CMakeLists.txt:88-96 | append `central.c` only when `CURL_FOUND` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| C1a | Uploads a file from the server's game directory | central.c:629 / :621 | `snprintf(path, MAX_OSPATH, "%s/%s", fs_gamedir, specified);` (and demo branch :621 also prefixes `fs_gamedir`) | MATCH |
| C1b | ...to backend configured by sv_www_address | central.c:430 (`Web_ConstructURL`) | `strlcpy(url, sv_www_address.string, sizeof_url);` then appends path | MATCH |
| C1c | ...as a multipart file upload | central.c:644-647 | `curl_formadd(... CURLFORM_PTRNAME, "file", CURLFORM_FILE, path, CURLFORM_END)` (curl multipart/form-data, field name "file") | MATCH |
| C2 | KTX uses it to ship game-stats and race top files | ktx/src/stats.c:590 (`UploadGameStats`); ktx/src/race.c:3288 (`UploadTopFile`) | `localcmd("\nsv_web_postfile ServerApi/UploadGameStats ...` and `... UploadTopFile ... %s\n", race_filename("top"))` | MATCH |
| C3a | Arg order: path, request-id, file, optional key/value pairs | central.c:599-604, :612, :655 | `if (Cmd_Argc() < 4)`; usage `<url> <request-id> <file> (<key> <value>)*`; `Web_AddParametersToRequest(4, ...)` | MATCH |
| C3b | path uploads to sv_www_address/<path> | central.c:637 -> :428-437 | `Web_ConstructURL(url, Cmd_Argv(1), sizeof(url));` (Cmd_Argv(1)=path arg appended to address) | MATCH |
| C3c | request-id "used to match the eventual reply" | central.c:50, :352, :694-695, :717 | line50 comment `// if set, content will be passed to game-mod`; stored at :352; only consumer is dead `if (this->request_id && !strcmp(this->request_id,"upload")){ this=this; }` then `Q_free`; never forwarded to mod, never matched to a reply | UNTRACEABLE (purpose unenforced) |
| C3d | optional extra key/value pairs forwarded | central.c:655 -> :442-526 (`Web_AddParametersToRequest`) | iterates argv pairs from index 4, `curl_formadd(... CURLFORM_COPYNAME, name, CURLFORM_COPYCONTENTS, encoded_value ...)` | MATCH |
| C4 | `*` uploads the text-summary companion of the demo being recorded | central.c:613-621 -> sv_demo_misc.c:500-553 (`SV_MVDName2Txt`) | `if (specified[0]=='*' ...)`; path = `fs_gamedir/sv_demoDir/SV_MVDName2Txt(demoname)`; SV_MVDName2Txt replaces ext with `.txt` | MATCH |
| C5 | .cfg files rejected ("Filename invalid") | central.c:624-626 | `if (strstr(specified, ".cfg") || FS_UnsafeFilename(specified)) { Con_Printf("Filename invalid\n"); return; }` | MATCH |
| C6 | paths escaping game dir rejected ("Filename invalid") | central.c:624/:632 -> fs.c:1021-1029 (`FS_UnsafeFilename`) | rejects `..`, leading `/` or `\`, `X:` absolute -> `Con_Printf("Filename invalid\n")` | MATCH |
| C7 | missing file gives "Failed to open file" | central.c:639-641 -> :71-79 (`CheckFileExists`) | `if (!CheckFileExists(path)) { Con_Printf("Failed to open file\n"); return; }`; CheckFileExists = fopen rb test | MATCH |
| C8 | no demo recording, `*` gives "Not recording demo!" | central.c:616-618 | `if (!sv.mvdrecording || !demoname) { Con_Printf("Not recording demo!\n"); return; }` | MATCH |
| C9 | OFF: "Address not set - functionality disabled" unless sv_www_address set; default empty | central.c:594-596 (gate); central.c:18 (default) | `if (!sv_www_address.string[0]) { Con_Printf("Address not set - functionality disabled\n"); return; }`; registered `{ "sv_www_address", "" }` | MATCH |
| C10 | Set by: server console / rcon | central.c:767 (plain Cmd_AddCommand, no flag); cmd.c:706 (no flag param); sv_main.c:1828 (rcon -> Cmd_ExecuteString) | `Cmd_AddCommand("sv_web_postfile", Web_PostFileRequest_f);` (no access flag exists in this API); rcon block dispatches via `Cmd_ExecuteString(str)` | MATCH |
| C11 | See also: sv_www_address, sv_web_post | central.c:758, :766 | `Cvar_Register(&sv_www_address);` `Cmd_AddCommand("sv_web_post", Web_PostRequest_f);` both real | MATCH |

**V-pass notes:** Classification: C-NEAR-MISS. 14 of 15 clauses enforcement-traced clean against mvdsv @ 1.11-53-g18d0362. One clause (C3c) is flavour-C: the request-id argument is real and stored, but its asserted PURPOSE -- "used to match the eventual reply" -- has NO enforcing read-site.

The defect in detail. The handler is `Web_PostFileRequest_f` (src/central.c:584-661), the sole use-site; registered at :767 via plain `Cmd_AddCommand`. The request-id is `Cmd_Argv(2)`, strdup'd at :606, passed to `Web_SubmitRequestForm` at :660, stored as `data->request_id` at :352. Tracing every consumer of `request_id` in the tree: (1) the struct-field comment at :50 says `// if set, content will be passed to game-mod` -- but no game-mod forwarding path exists in this version (grep of pr2_cmds/pr_cmds/sv_pr_cmds for request_id/web_response returns nothing); (2) the only runtime read is the dead branch at :694-695 `if (this->request_id && !strcmp(this->request_id, "upload")) { this = this; }` -- a no-op self-assignment; (3) it is freed at :717. It is never compared against a request to "match a reply", and the postfile response callback `Web_PostResponse` (:257) parses fixed field names (Broadcast/UploadPath/Upload) off `req->internal_data` (NULL for postfile), never off request_id. So "used to match the eventual reply" is inference from the argument's name + the stale :50 comment, not from enforcing code. Reinforcing evidence: BOTH KTX call-sites pass an empty request-id (`""`), which :352/:605-609 collapse to NULL -- in real usage the field is unused.

Suggested minimal fix (re-synth seed): replace "a request id (used to match the eventual reply)" with a hedge that matches the code, e.g. "a request id (stored alongside the request; KTX passes it empty)" or drop the parenthetical purpose entirely. Everything else in the description holds verbatim.

Minor (non-defect) notes, all still-true: (a) The description renames the engine's own Usage label "url" (central.c:600) to "path" and explains it as appended to sv_www_address -- this is accurate per Web_ConstructURL (:430-437) and arguably clearer than the engine label; not a defect. (b) The OFF-state default is correctly the registered empty string (:18), not a shipped-cfg value -- WI-2 clean.

## flags_for_review

- [fyi/runtime-dead-suspect/synthesis] central.c HTTP layer is build-conditional on CURL (CMakeLists.txt:88-96); a curl-less build registers no sv_web_* commands. sv_web_postfile is documented-as-live per the C3 deferral (wiring fully legible); flagged for the runtime-reachability ledger.
- [review/suspected-bug/vpass] src/central.c:50 struct-field comment 'if set, content will be passed to game-mod' describes a request_id->game-mod forwarding mechanism that does not exist in this version; the only runtime consumer is a dead no-op branch (:694-695 `this = this;`) plus a free (:717). Stale/aspirational comment -- a flavour-C trap for any future describe-fill of sv_web_post / sv_web_get which share Web_SubmitRequestForm and the same request_id field.
- [fyi/runtime-dead-suspect/vpass] central.c:694-695 `if (this->request_id && !strcmp(this->request_id, "upload")) { this = this; }` is a runtime-dead branch: condition has no body effect (self-assignment). Likely a debug-breakpoint stub left in. Cosmetic but confirms request_id has no live matching/dispatch role.
- [fyi/off-scope-entity/vpass] Off-scope but adjacent: Web_PostResponse (central.c:257-336) is a server-controlled inbound-command path -- the central/web backend can return a 'Broadcast' field that the server prints to ALL clients (SV_BroadcastPrintfEx, :279) and an 'Upload'/'UploadPath' pair that triggers the server to upload arbitrary files under demos/ to a backend-chosen URL. Guarded by FS_UnsafeFilename + a demos/ prefix check (:282,:286). Trust-boundary surface worth noting if sv_www_address is ever pointed at an untrusted host; not in scope for this knob's description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_web_postfile",
  "type": "command",
  "description": "Uploads a file from the server's game directory to the configured web/stats backend (sv_www_address) as a multipart file upload -- this is how KTX ships game-stats and race top files to the backend. You give it a path on that backend, a request id (an opaque tag stored with the request; KTX passes it empty), the file to send, and optionally extra key/value pairs.\n\nsv_web_postfile <path> <request-id> <file> [<key> <value>]... = upload <file> (relative to the game directory) to sv_www_address/<path>.\nsv_web_postfile <path> <request-id> * [<key> <value>]... = upload the text-summary companion of the demo currently being recorded.\n\n.cfg files and paths that escape the game directory are rejected (\"Filename invalid\"); a missing file gives \"Failed to open file\"; with no demo recording, * gives \"Not recording demo!\". Does nothing (\"Address not set - functionality disabled\") unless sv_www_address is configured.\n\nSet by: server console / rcon.\nSee also: sv_www_address, sv_web_post.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/central.c:660. Registered central.c:767 (Cmd_AddCommand only; NOT in ucmds[] sv_user.c:3299-3395 -> console/rcon path only). NOT on the normal-rcon blocklist (sv_main.c:1754-1767) -> regular rcon reaches it. Handler Web_PostFileRequest_f (central.c:584-661) -- distinct from the sv_web_get/post handler. Enforcing sites: central.c:594 OFF-state gate `if (!sv_www_address.string[0])` ('Address not set'); central.c:599 requires Argc()>=4 (usage '<url> <request-id> <file> (<key> <value>)*'); central.c:604 request-id = Cmd_Argv(2); central.c:612-622 the `*` special arg: if Cmd_Argv(3) is exactly '*', it requires sv.mvdrecording and a current demo name (else 'Not recording demo!', central.c:617) and builds the path to the demo's .txt companion via SV_MVDName2Txt under sv_demoDir (central.c:621); central.c:624 the non-* branch rejects any name containing '.cfg' OR failing FS_UnsafeFilename ('Filename invalid'); central.c:632 a second FS_UnsafeFilename check on the full path; central.c:637 Web_ConstructURL prepends sv_www_address; central.c:639 CheckFileExists else 'Failed to open file'; central.c:644-648 curl_formadd with CURLFORM_FILE attaches the actual file (this is the genuine multipart file upload -- so unlike sv_web_get/post the POST method is real and name-accurate); central.c:655 Web_AddParametersToRequest(4,...) adds optional trailing kv pairs; central.c:660 Web_SubmitRequestForm sends. 'relative to the game directory' verified: both path builds snprintf with fs_gamedir prefix (central.c:621 and central.c:629). No `post`-arg ambiguity here (separate handler), so verdict synthesized (not hedged). KTX caller (ktx/src/race.c:3288 uploads race top file; ktx/src/stats.c:590 uploads UploadGameStats with the `*internal authinfo` param) -- not an override; corroborates the upload purpose. F-C3b: central.c curl-build-conditional (CMakeLists.txt:88-96); suspect_pool_member=FALSE so documented-as-live, flag raised for the reachability ledger. [MAIN-HG2 edit: hedged request-id to an opaque stored tag (KTX passes it empty; no live reply-matching consumer).]",
  "description_proposed": null
}
```
