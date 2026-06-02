# describe-fill-synthesis ledger -- mvdsv `sv_web_get`

- **project:** mvdsv
- **knob:** `sv_web_get` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_web_get: hedged -- console/rcon HTTP callout to sv_www_address with path+request-id+kv params; 'GET' method NOT enforced (dead post arg, always POSTs) so hedged + bug-flagged; curl-build-conditional -- origin=synthesized ref=src/central.c:560 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sends an HTTP request from the server to the configured web/stats backend (sv_www_address). It is a generic server-to-backend call for server-side automation; the shipped KTX mod does not use this command (it uses sv_web_post for race attempts and sv_web_postfile for stats), so sv_web_get has no built-in caller. You give it a path on that backend, a request id (an opaque tag stored with the request), and any number of key/value pairs to send.
>
> sv_web_get <path> <request-id> [<key> <value>]... = contact sv_www_address/<path>, attaching each <key> <value> pair.
>
> Does nothing ("Address not set - functionality disabled") unless sv_www_address is configured. Despite the name it does not issue an HTTP GET -- it sends a POST, identically to sv_web_post.
>
> Set by: server console / rcon.
> See also: sv_www_address, sv_web_post.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| console/rcon access (admin path), not client-issuable | src/sv_user.c:3299-3395 ; src/sv_user.c:3399,3424 | command name absent from `ucmds[]`; `SV_ExecuteUserCommand` prints "Bad user command" with no fall-through | MATCH |
| regular rcon reaches it (NOT master-only) | src/sv_main.c:1754-1767 | command name absent from the `bad_cmd = true` blocklist block | MATCH |
| sends to sv_www_address/<path> | src/central.c:545,428-438 ; src/central.c:560 | `Web_ConstructURL(url, Cmd_Argv(1), ...)` (prepends `sv_www_address.string`); `Web_SubmitRequestForm(url, ...)` | MATCH |
| request-id arg matches the reply | src/central.c:547-553 | `requestId = Cmd_Argv(2)` stored on the request | MATCH |
| trailing key/value pairs attached | src/central.c:555,442-526 | `Web_AddParametersToRequest(3, ...)` -> `curl_formadd(... CURLFORM_COPYNAME, name, CURLFORM_COPYCONTENTS, value ...)` | MATCH |
| OFF-state: disabled when address unset | src/central.c:535-538 | `if (!sv_www_address.string[0]) { Con_Printf("Address not set - functionality disabled\n"); return; }` | MATCH |
| 'GET' method NOT enforced (post arg dead; always POST) | src/central.c:528 ; src/central.c:358,342-346 | `Web_SendRequest(qbool post)` never reads `post`; `if (first_form_ptr) ... CURLOPT_POST,1`; `authKey` always added so `first_form_ptr` non-NULL | UNTRACEABLE (no enforcing GET) -> hedged |
| KTX is caller not override | ktx/src/race.c:4989 ; ktx/src/stats.c:590 | `localcmd("...sv_web_post ...")` | MATCH |
| registered only in curl-enabled build | CMakeLists.txt:88-96 | `find_package(CURL)` ... `else() list(APPEND SRC_COMMON "${DIR_SRC}/central.c")` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------| --------|
| 1 | Sends an HTTP request from server to web/stats backend (sv_www_address) | central.c:574-576 -> 528-561; URL built central.c:428-438 (`strlcpy(url, sv_www_address.string,...)`); submitted central.c:560/338-363 | `Web_GetRequest_f` -> `Web_SendRequest(false)`; `Web_ConstructURL(url, Cmd_Argv(1),...)`; `Web_SubmitRequestForm(...)` -> `curl_multi_add_handle` | MATCH |
| 2 | You give it a path on that backend | central.c:545 | `Web_ConstructURL(url, Cmd_Argv(1), sizeof(url));` -- arg1 is appended to sv_www_address base | MATCH (more precise than code's own `<url>` label) |
| 3 | ...a request id (used to match the eventual reply) | central.c:547-553 (set), 694-695 (`this=this;` dead cmp vs "upload"), 717 (freed); reply handler Web_PostResponse central.c:257-336 never reads request_id | `requestId = Cmd_Argv(2); ... Q_strdup(requestId)`; later only `if (this->request_id && !strcmp(this->request_id,"upload")){ this=this; }` | UNTRACEABLE (no read-site matches a reply to any consumer; "match the reply" is name+stale-comment inference) |
| 4 | ...and any number of key/value pairs to send along | central.c:555 -> 442-526 (`for (i=first_param; i<Cmd_Argc()-1; i+=2)`) | `Web_AddParametersToRequest(3, &first_form_ptr,...)`; loop steps `i += 2`, adds `Cmd_Argv(i)`/`Cmd_Argv(i+1)` to curl form | MATCH |
| 5 | Usage `sv_web_get <path> <request-id> [<key> <value>]...` | central.c:540-541 | `if (Cmd_Argc() < 3){ Con_Printf("Usage: %s <url> <request-id> (<key> <value>)*\n",...) }` | MATCH |
| 6 | Each pair attached to the request to sv_www_address/<path> | central.c:513-517 (curl_formadd per pair) + URL build 430-437 | `curl_formadd(..., CURLFORM_COPYNAME, name, CURLFORM_COPYCONTENTS, encoded_value, ...)` | MATCH |
| 7 | "used by server-side automation such as KTX reporting race attempts or game results" | KTX race.c:4989 (`sv_web_post`), race.c:3288 (`sv_web_postfile`), stats.c:590 (`sv_web_postfile`); tree-wide `sv_web_get` callers = 0 (only registration central.c:765) | KTX LogRaceAttempt = `sv_web_post`; UploadTopFile/UploadGameStats = `sv_web_postfile`; NO `sv_web_get` caller exists anywhere | MISMATCH (those reports use sibling commands, not sv_web_get) |
| 8 | OFF-state: "Address not set - functionality disabled" unless sv_www_address configured | central.c:535-538 | `if (!sv_www_address.string[0]){ Con_Printf("Address not set - functionality disabled\n"); return; }` | MATCH (exact string + gate) |
| 9 | Despite the name, does not force an HTTP GET | central.c:574-576 (`post` arg discarded), 528 (`post` unused in body), 358-360 (`if(first_form_ptr) CURLOPT_POST,1`); authKey always added 342 -> first_form_ptr always set | `Web_GetRequest_f` passes `false`; `Web_SendRequest(qbool post)` never references `post`; `curl_easy_setopt(req, CURLOPT_POST, 1)` always taken | MATCH (it is in fact always a POST; identical to sv_web_post) |
| 10 | Set by: server console / rcon | central.c:765 (`Cmd_AddCommand`); rcon path sv_main.c:1828 (`Cmd_ExecuteString(str)`) reaches any Cmd_AddCommand command | `Cmd_AddCommand("sv_web_get", Web_GetRequest_f);` ; valid rcon -> `Cmd_ExecuteString(str)` | MATCH |
| 11 | See also: sv_www_address | central.c:18, 758 | `static cvar_t sv_www_address = {"sv_www_address",""};` `Cvar_Register(&sv_www_address);` | MATCH |

**V-pass notes:** Core mechanism is well-traced and accurate (path append to sv_www_address, key/value form pairs, OFF-state string verbatim at central.c:536, console+rcon access, and -- correctly -- the GET-name-but-POST-behavior at central.c:358-360). Two defects against live source:

C-FIX (clause 7, the load-bearing one): the description cites KTX "reporting race attempts or game results" as the example use of sv_web_get. The codebase contradicts this. There are ZERO callers of sv_web_get anywhere in mvdsv or KTX -- the only occurrence in the entire mvdsv tree is its own registration (central.c:765). KTX's race-attempt reporting uses sv_web_POST (race.c:4989 LogRaceAttempt), and game-results / top-file uploads use sv_web_POSTfile (stats.c:590 UploadGameStats, race.c:3288 UploadTopFile). The example attributes sibling commands' actual usage to this command. Because the GET/POST/postfile handlers are NOT interchangeable from the caller's view (different commands, different arg shapes for postfile), naming this command as the race/results reporter is a contradiction, not a near-miss.

Flavour-C (clause 3): "a request id (used to match the eventual reply)" has no enforcing read-site in this version. request_id is set (central.c:549), compared exactly once in dead code (central.c:694-695: `if (this->request_id && !strcmp(this->request_id,"upload")){ this=this; }`), and freed (central.c:717). The reply handler Web_PostResponse (central.c:257-336) parses only Broadcast/Upload/UploadPath and never reads request_id. The struct field comment (central.c:50, "if set, content will be passed to game-mod") is stale -- no code path delivers web-response content to the QC mod keyed by request_id; tree-wide grep for request_id outside central.c returns nothing. The "match the eventual reply" semantics is name + stale-comment inference.

Suggested correction direction: drop or generalize the KTX-race/results example (it belongs to sv_web_post/sv_web_postfile). For request-id, hedge to what the code supports: an opaque request-id argument is accepted and stored on the pending request but, in this version, is not wired to deliver the response to the game-mod (the response is parsed server-side for Broadcast/Upload directives only). The GET-is-really-POST note is correct and should stay.

## flags_for_review

- [review/suspected-bug/synthesis] sv_web_get and sv_web_post share Web_SendRequest(qbool post) (central.c:528) but the `post` parameter is never read in the function body. The HTTP method is decided solely at central.c:358 `if (first_form_ptr) curl_easy_setopt(req, CURLOPT_POST, 1)`, and Web_SubmitRequestForm unconditionally prepends an `authKey` form field (central.c:342-346), making first_form_ptr non-NULL on every call. Net effect: BOTH commands always send a POST, and sv_web_get/sv_web_post are behaviorally identical -- the get/post naming distinction is not enforced anywhere. Looks like a latent upstream bug (the post arg is plumbed in but dropped).
- [fyi/runtime-dead-suspect/synthesis] central.c (the whole sv_web_*/sv_www_* HTTP layer) is build-conditional: CMakeLists.txt:88-96 adds it to SRC_COMMON only when find_package(CURL) succeeds. A curl-less build registers none of sv_web_get/sv_web_post/sv_web_postfile. Documented-as-live per the C3 deferral (wiring is legible) and suspect_pool_member=FALSE, but flagging the build-conditional registration for the runtime-reachability ledger.
- [review/runtime-dead-suspect/vpass] Stale/aspirational struct comment: central.c:50 `char* request_id; // if set, content will be passed to game-mod` -- but in 1.11-53-g18d0362 no code path passes web-response content to the game-mod keyed by request_id. The only request_id equality test (central.c:694) is dead code: `if (this->request_id && !strcmp(this->request_id,"upload")){ this = this; }` (no-op self-assignment). Suspected unfinished/removed feature; relevant to any L1 description of sv_web_get/sv_web_post/sv_web_postfile that claims mod reply-routing.
- [fyi/runtime-dead-suspect/vpass] sv_web_get has ZERO callers in mvdsv and KTX trees (only its own Cmd_AddCommand registration at central.c:765). KTX exercises sv_web_post (race.c:4989) and sv_web_postfile (stats.c:590, race.c:3288) but never sv_web_get. sv_web_get may be a runtime-dead / external-tooling-only command; worth flagging when its sibling commands' L1 rows are written so the race/results example lands on the right command.
- [fyi/cross-mod-override/vpass] GET/POST behavioral identity: Web_SendRequest(qbool post) ignores its `post` argument entirely (central.c:528-561); both Web_GetRequest_f(false) and Web_PostRequest_f(true) produce an identical request, and because authKey is always added (central.c:342) the request is always sent with CURLOPT_POST=1 (central.c:358-360). sv_web_get and sv_web_post are functionally indistinguishable in this version. Cross-check the sv_web_post L1 row for the same note.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_web_get",
  "type": "command",
  "description": "Sends an HTTP request from the server to the configured web/stats backend (sv_www_address). It is a generic server-to-backend call for server-side automation; the shipped KTX mod does not use this command (it uses sv_web_post for race attempts and sv_web_postfile for stats), so sv_web_get has no built-in caller. You give it a path on that backend, a request id (an opaque tag stored with the request), and any number of key/value pairs to send.\n\nsv_web_get <path> <request-id> [<key> <value>]... = contact sv_www_address/<path>, attaching each <key> <value> pair.\n\nDoes nothing (\"Address not set - functionality disabled\") unless sv_www_address is configured. Despite the name it does not issue an HTTP GET -- it sends a POST, identically to sv_web_post.\n\nSet by: server console / rcon.\nSee also: sv_www_address, sv_web_post.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/central.c:560. Registered central.c:765 (Cmd_AddCommand only; NOT in ucmds[] sv_user.c:3299-3395 -> console/rcon path only, no client stringcmd dispatch per SV_ExecuteUserCommand sv_user.c:3399 'Bad user command' no-fallthrough). NOT on the normal-rcon blocklist (sv_main.c:1754-1767) -> regular rcon_password reaches it (so plain 'server console / rcon', not master-only). Handler Web_GetRequest_f (central.c:574-577) calls Web_SendRequest(false). Enforcing behavior in Web_SendRequest (central.c:528-561): central.c:535 gates on sv_www_address.string[0] (the 'Address not set' OFF-state); central.c:540 requires Cmd_Argc()>=3 (usage '<url> <request-id> (<key> <value>)*'); central.c:545 Web_ConstructURL prepends sv_www_address (central.c:428-438); central.c:547 request-id = Cmd_Argv(2); central.c:555 Web_AddParametersToRequest(3,...) adds the trailing key/value pairs as multipart form fields (central.c:442-526); central.c:560 Web_SubmitRequestForm actually queues/sends. HEDGE on HTTP method: the 'post' parameter passed to Web_SendRequest is NEVER read in the body (central.c:528-561) -- the method is decided only at central.c:358 `if (first_form_ptr) { curl_easy_setopt(req, CURLOPT_POST, 1); ... }`, and Web_SubmitRequestForm always prepends an unconditional `authKey` form field first (central.c:342-346), so first_form_ptr is non-NULL on every call and the request is always sent as a POST. Therefore 'GET' in the command name is not enforced; I do not assert a GET, hence hedged. KTX is a CALLER not an override: ktx/src/race.c:4989 and stats.c:590 issue sv_web_post/sv_web_postfile via localcmd() -- no KTX redefinition of the handler. F-C3b/build-conditional: central.c is compiled only when CMake find_package(CURL) succeeds (CMakeLists.txt:88-96), so these commands are registered only in a curl-enabled build; suspect_pool_member=FALSE so not dead-stamped, documented-as-live per the C3 deferral. [MAIN-HG2 edit: removed the race/results example (sv_web_get has ZERO callers tree-wide; KTX uses sv_web_post/sv_web_postfile); hedged request-id to an opaque stored tag (no live reply-matching consumer); stated GET-is-POST inline.]",
  "description_proposed": null
}
```
