# describe-fill-synthesis ledger -- mvdsv `sv_web_post`

- **project:** mvdsv
- **knob:** `sv_web_post` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_web_post: hedged -- console/rcon HTTP POST to sv_www_address with path+request-id+kv params; behaviorally identical to sv_web_get (dead post arg) so hedged on the distinction; curl-build-conditional -- origin=synthesized ref=src/central.c:560 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sends an HTTP request from the server to the configured web/stats backend (sv_www_address), used by server-side automation -- KTX uses it to report race attempts (game-stats and top-file uploads go through sv_web_postfile instead). You give it a path on that backend, a request id (an opaque tag stored with the request), and any number of key/value pairs to send along.
>
> sv_web_post <path> <request-id> [<key> <value>]... = post to sv_www_address/<path>, attaching each <key> <value> pair.
>
> Does nothing ("Address not set - functionality disabled") unless sv_www_address is configured. (sv_web_get behaves identically -- both send a POST.)
>
> Set by: server console / rcon.
> See also: sv_www_address, sv_web_postfile.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| console/rcon access, not client-issuable | src/sv_user.c:3299-3395 ; src/sv_user.c:3399,3424 | name absent from `ucmds[]`; `SV_ExecuteUserCommand` "Bad user command" no fall-through | MATCH |
| regular rcon reaches it (NOT master-only) | src/sv_main.c:1754-1767 | name absent from `bad_cmd = true` blocklist block | MATCH |
| posts to sv_www_address/<path> | src/central.c:545,428-438 ; src/central.c:560 | `Web_ConstructURL(url, Cmd_Argv(1), ...)`; `Web_SubmitRequestForm(url, ...)` | MATCH |
| request-id arg matches the reply | src/central.c:547-553 | `requestId = Cmd_Argv(2)` | MATCH |
| trailing key/value pairs attached as form fields | src/central.c:555,442-526 | `Web_AddParametersToRequest(3, ...)` -> `curl_formadd(...)` | MATCH |
| OFF-state: disabled when address unset | src/central.c:535-538 | `if (!sv_www_address.string[0]) { ... "Address not set - functionality disabled" ... return; }` | MATCH |
| always POST, but via authKey not the `post` arg | src/central.c:358,342-346 ; src/central.c:528 | `if (first_form_ptr) ... CURLOPT_POST,1`; `authKey` always added; `post` arg never read | MATCH (POST) / UNTRACEABLE (intended get-vs-post distinction) -> hedged |
| shares handler path with sv_web_get | src/central.c:528,576,581 | both `Web_GetRequest_f`/`Web_PostRequest_f` call `Web_SendRequest(...)` | MATCH |
| registered only in curl-enabled build | CMakeLists.txt:88-96 | `find_package(CURL)` ... append `central.c` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Sends an HTTP request from the server to the configured web/stats backend (sv_www_address) | central.c:545 -> Web_ConstructURL central.c:430; central.c:560 Web_SubmitRequestForm -> central.c:355/359 | `Web_ConstructURL(url, Cmd_Argv(1), sizeof(url));` ... `strlcpy(url, sv_www_address.string, sizeof_url);` ... `curl_easy_setopt(req, CURLOPT_URL, url); ... curl_easy_setopt(req, CURLOPT_POST, 1);` | MATCH |
| 2 | used by server-side automation such as KTX reporting race attempts ... | ktx/src/race.c:4989 | `"sv_web_post ServerApi/LogRaceAttempt \"\" map %s routeNumber %d weap %d fs %d racer %s time %.3f complete %s\n"` via localcmd()+trap_executecmd() | MATCH (race attempts) |
| 2b | ...or game results | ktx/src/stats.c:590 | `"\nsv_web_postfile ServerApi/UploadGameStats \"\" \"%s.%s\" *internal authinfo\n"` | MISMATCH (minor): game-stats upload uses sv_web_postFILE, not sv_web_post; example conflates the two siblings. Hedged with "such as" + postfile listed in See also. |
| 3 | You give it a path on that backend | central.c:545 | `Web_ConstructURL(url, Cmd_Argv(1), sizeof(url));` (arg1 = path, appended to sv_www_address) | MATCH |
| 4 | a request id (used to match the eventual reply) | central.c:547-552 (capture) + central.c:50 (comment) vs central.c:257-336 + 687-721 (consumption) | capture: `requestId = Cmd_Argv(2); if (requestId[0]) requestId = Q_strdup(...)`. Comment c:50: `// if set, content will be passed to game-mod`. Consumption: match is by `if (this->handle == handle)` (c:690); request_id only touched by dead `if (...!strcmp(...,"upload")){ this = this; }` (c:694) then `Q_free(this->request_id)` (c:717). Web_PostResponse parses only Broadcast/Upload/UploadPath. | MISMATCH / UNTRACEABLE: "used to match the eventual reply" has no enforcing site. Reply matching is by CURL handle pointer; request_id is inert for sv_web_post in this build. Clause is inferred from the c:50 comment, whose "passed to game-mod" path has no live consumer. flavour-C. |
| 5 | and any number of key/value pairs to send along | central.c:555 -> Web_AddParametersToRequest central.c:442-446 | `for (i = first_param; i < Cmd_Argc() - 1; i += 2) {...}` (first_param=3); pairs added via curl_formadd | MATCH |
| 6 | Usage: sv_web_post <path> <request-id> [<key> <value>]... | central.c:540-541 | `if (Cmd_Argc() < 3) { Con_Printf("Usage: %s <url> <request-id> (<key> <value>)*\n", Cmd_Argv(0)); }` | MATCH |
| 7 | Does nothing ("Address not set - functionality disabled") unless sv_www_address is configured | central.c:535-537 | `if (!sv_www_address.string[0]) { Con_Printf("Address not set - functionality disabled\n"); return; }` | MATCH (verbatim message + OFF-state) |
| 8 | this behaves identically to sv_web_get | central.c:574-582 + 528 + body (post unused) | `Web_GetRequest_f -> Web_SendRequest(false)`; `Web_PostRequest_f -> Web_SendRequest(true)`; `Web_SendRequest(qbool post)` never references `post` in its body (530-560) | MATCH (the post flag is dead; both produce a curl POST via CURLOPT_POST at c:359) |
| 9 | Set by: server console / rcon | central.c:766 (Cmd_AddCommand, no CF flag / no client table) + sv_main.c:1828 (rcon -> Cmd_ExecuteString) + ktx race.c localcmd (console) | `Cmd_AddCommand("sv_web_post", Web_PostRequest_f);` (only registration; no ClientCommand variant found tree-wide); rcon: `Cmd_ExecuteString(str);` | MATCH |
| 10 | sv_www_address default (implied empty -> OFF) | central.c:18 + 758 | `static cvar_t sv_www_address = { "sv_www_address", "" };` ... `Cvar_Register(&sv_www_address);` | MATCH (default empty) |
| 11 | See also: sv_www_address, sv_web_postfile | central.c:758, 767 | registered siblings; sv_web_postfile = Web_PostFileRequest_f | MATCH |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. All machinery in src/central.c; KTX usage in ktx/src/race.c + stats.c. Eleven clauses traced to enforcing lines; nine MATCH.

CORE BEHAVIOR IS CORRECT and well-grounded: posts curl form to sv_www_address/<path>, OFF-state message is verbatim, the "identical to sv_web_get" observation is real (the `post` bool in Web_SendRequest c:528 is received but never read; both _f wrappers reach the same code, and the actual transport is always a curl POST via CURLOPT_POST at c:359), access class (console/rcon, plain Cmd_AddCommand, no client path) is correct, default-empty is correct.

ONE flavour-C clause (clause 4) drives the C-NEAR-MISS. "a request id (used to match the eventual reply)" is sourced from the struct comment at central.c:50 ("if set, content will be passed to game-mod"), but in THIS build there is NO enforcing site for that semantics: the response handler matches the in-flight request by CURL handle pointer (c:690 `if (this->handle == handle)`), the only response-time touch of request_id is a dead no-op branch (`if (this->request_id && !strcmp(this->request_id,"upload")){ this = this; }` c:694) followed by Q_free (c:717), and Web_PostResponse (c:257-336) only parses/acts on Broadcast/Upload/UploadPath fields. No game-mod / QVM callback receives request_id or the response body. So the request-id is effectively inert for sv_web_post and the "match the eventual reply" assertion has no live code. Essentially-correct framing (you do pass a request-id arg; it is stored), but the asserted PURPOSE is comment-inferred with no enforcing read-site -> C-NEAR-MISS per the discipline's k_teamoverlay / autotrack precedent.

MINOR (clause 2b): the example "or game results" actually maps to sv_web_postFILE (stats.c:590 UploadGameStats), not sv_web_post; sv_web_post's grounded KTX use is LogRaceAttempt (race.c:4989). Hedged by "such as" and postfile is in See also, so not a standalone defect, but the example slightly over-attributes.

RECOMMENDED MINIMAL FIX (does not require full re-synth, but should be applied): soften clause 4 to describe what is actually enforced -- e.g. "a request id (an opaque tag you can attach to the request; see note)" -- and drop or qualify the "used to match the eventual reply" purpose, OR move it to a hedged note that the request-id field is wired toward game-mod dispatch but is inert in this build. Optionally split the example so "race attempts" stays on sv_web_post and "game results / stat uploads" points to sv_web_postfile.

## flags_for_review

- [review/suspected-bug/synthesis] Same finding as sv_web_get: sv_web_post calls Web_SendRequest(true) but `post` is never read; method comes from central.c:358 (`if (first_form_ptr) CURLOPT_POST`) with authKey always present (central.c:342-346). sv_web_get and sv_web_post are therefore the SAME command behaviorally. Cross-referenced here so the pair is reviewed together.
- [fyi/runtime-dead-suspect/synthesis] central.c HTTP layer is build-conditional on CURL (CMakeLists.txt:88-96); curl-less builds register no sv_web_* commands. Documented-as-live per C3 deferral; flagged for the reachability ledger.
- [review/runtime-dead-suspect/vpass] central.c:694 contains a dead self-assignment `if (this->request_id && !strcmp(this->request_id, "upload")) { this = this; }` -- a no-op (likely a stripped debug/breakpoint stub). The request_id stored for sv_web_post/sv_web_get is never routed to any game-mod or QVM callback in this build despite the struct comment at central.c:50 ("content will be passed to game-mod"). request_id is consumed only by the hardcoded Web_PostResponse field parser (Broadcast/Upload/UploadPath) and then freed. The comment describes an intended but currently-unwired game-mod reply path.
- [fyi/contradiction/vpass] Web_SendRequest(qbool post) (central.c:528) receives a `post` boolean that is never referenced in its body; Web_GetRequest_f(false) and Web_PostRequest_f(true) are behaviorally identical. Both transmit as an HTTP POST (CURLOPT_POST=1, c:359) whenever a form is attached. sv_web_get is thus a misnomer -- it does not issue a GET. Affects sv_web_get's own description if/when synthesized.
- [fyi/off-scope-entity/vpass] Commands sv_web_post/sv_web_get/sv_web_postfile are only registered when curl_multi_init() succeeds (central.c:764 `if (curl_handle)`). On a curl-init failure the commands do not exist at all. Edge case, not in the description; flagging for completeness, not a defect.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_web_post",
  "type": "command",
  "description": "Sends an HTTP request from the server to the configured web/stats backend (sv_www_address), used by server-side automation -- KTX uses it to report race attempts (game-stats and top-file uploads go through sv_web_postfile instead). You give it a path on that backend, a request id (an opaque tag stored with the request), and any number of key/value pairs to send along.\n\nsv_web_post <path> <request-id> [<key> <value>]... = post to sv_www_address/<path>, attaching each <key> <value> pair.\n\nDoes nothing (\"Address not set - functionality disabled\") unless sv_www_address is configured. (sv_web_get behaves identically -- both send a POST.)\n\nSet by: server console / rcon.\nSee also: sv_www_address, sv_web_postfile.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/central.c:560. Registered central.c:766 (Cmd_AddCommand only; NOT in ucmds[] sv_user.c:3299-3395 -> console/rcon path only). NOT on the normal-rcon blocklist (sv_main.c:1754-1767) -> regular rcon reaches it. Handler Web_PostRequest_f (central.c:579-582) calls Web_SendRequest(true) -- the SAME function sv_web_get calls with false. All enforcing sites are identical to sv_web_get: central.c:535 OFF-state gate on sv_www_address; central.c:540 Argc>=3; central.c:545 Web_ConstructURL prepends sv_www_address; central.c:547 request-id; central.c:555 Web_AddParametersToRequest(3,...) adds trailing kv pairs as form fields; central.c:560 submit. HEDGE: the `post=true` argument is dead -- Web_SendRequest (central.c:528-561) never reads `post`; method is set only at central.c:358 `if (first_form_ptr) CURLOPT_POST,1`, and authKey is always added first (central.c:342-346) so the request is always a POST regardless. Here that happens to agree with the command's name, but the value of `post` plays no role, so sv_web_post and sv_web_get are behaviorally indistinguishable -- I state the POST behavior but mark the get/post equivalence (hence hedged on the intended distinction). KTX caller (ktx/src/race.c:4989, stats.c:590 via localcmd), not an override. F-C3b: central.c curl-build-conditional (CMakeLists.txt:88-96); suspect_pool_member=FALSE so documented-as-live, not dead-stamped. [MAIN-HG2 edit: hedged request-id to an opaque stored tag; moved game-results/stats to sv_web_postfile (sv_web_post's grounded KTX use is LogRaceAttempt).]",
  "description_proposed": null
}
```
