# describe-fill-synthesis ledger -- mvdsv `sv_www_address`

- **project:** mvdsv
- **knob:** `sv_www_address` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_www_address: synthesized -- base URL + master switch for web integration; empty disables all of it; live under WWW_INTEGRATION (CMake default-on); KTX also gates stats/race upload on it -- origin=synthesized ref=src/central.c:375 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the base URL of the central web server the server talks to, and acts as the master on/off switch for all web integration. When empty (the default), remote account logins are refused, the periodic check-in is skipped, and the server makes no outbound web requests at all. Set it to a non-empty URL to enable the central-server features: remote account logins, the periodic check-in, and outbound web requests -- including the match statistics and race records that a game mod such as KTX uploads to the website.
>
> Default: empty (web integration disabled).
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| empty by default | src/central.c:18 | `static cvar_t sv_www_address = { "sv_www_address", "" };` | MATCH |
| empty disables remote logins | src/central.c:375 | `if (!sv_www_address.string[0]) { SV_ClientPrintf2(... "Remote logins not supported on this server\n"); return; }` | MATCH |
| empty disables remote logins (challenge gen) | src/central.c:405 | `if (!sv_www_address.string[0]) { ... "Remote logins not supported on this server\n"); return; }` | MATCH |
| empty disables web requests | src/central.c:535 | `if (!sv_www_address.string[0]) { Con_Printf("Address not set - functionality disabled\n"); return; }` | MATCH |
| empty disables check-in | src/central.c:730 | `if (sv_www_address.string[0] && !server_busy && curtime - last_checkin_time > max(...))` | MATCH |
| value is the base URL | src/central.c:430 | `strlcpy(url, sv_www_address.string, sizeof_url);` (then appends path) | MATCH |
| set by config (registration) | src/central.c:758 | `Cvar_Register(&sv_www_address);` (inside Central_Init) | MATCH |
| compiled under WWW_INTEGRATION, defined by build | src/sv_main.c:4062 / CMakeLists.txt:186 | `#if defined(SERVERONLY) && defined(WWW_INTEGRATION)` / `target_compile_definitions(${PROJECT_NAME} PRIVATE WWW_INTEGRATION)` | MATCH |
| KTX uploads stats/race when set (cross-mod) | ktx/src/stats.c:554 | `qbool send_to_website = !strnull(cvar_string("sv_www_address"));` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | "Sets the base URL of the central web server" | src/central.c:430 | `strlcpy(url, sv_www_address.string, sizeof_url);` (then path appended at :437) | MATCH |
| 2 | "master on/off switch for all web integration" | src/central.c:375, 405, 535, 594, 730 | each entry point gates on `sv_www_address.string[0]` before issuing any request | MATCH |
| 3 | "When empty (the default)" | src/central.c:18 + cvar.c:267-269 | `static cvar_t sv_www_address = { "sv_www_address", "" };` ; Cvar_Register sets registered default from struct `.string` | MATCH |
| 4 | "remote account logins are refused" (when empty) | src/central.c:375-378 (also 405-408) | `if (!sv_www_address.string[0]) { SV_ClientPrintf2(client, PRINT_HIGH, "Remote logins not supported on this server\n"); return; }` | MATCH |
| 5 | "the periodic check-in is skipped" (when empty) | src/central.c:730 | `if (sv_www_address.string[0] && !server_busy && curtime - last_checkin_time > max(MIN_CHECKIN_PERIOD, sv_www_checkin_period.value))` -- empty short-circuits, checkin block (733-737) not entered | MATCH |
| 6 | "makes no outbound web requests at all" (when empty) | src/central.c:375,405,535,594,730 (all 5 initial Web_SubmitRequestForm sites at 395/425/560/660/735 gated; the 6th at :315 is a response callback reachable only after a gated request) | every initial-request path returns early on `!sv_www_address.string[0]` | MATCH |
| 7 | "Set to non-empty URL to enable: remote logins, the periodic check-in" | same lines as 4,5 inverted | non-empty string[0] passes the gate | MATCH |
| 8 | "...and uploading match statistics and race records to the configured website" | NONE | no source reference to match-statistics or race-record upload; web layer exposes generic `sv_web_get`/`sv_web_post`/`sv_web_postfile` (central.c:765-767) + auth + checkin; only server-initiated re-upload path Web_PostResponse:281-326 is restricted to `demos/` (`if (!strncmp(upload, "demos/", 6))` :286) | UNTRACEABLE |
| 9 | "Default: empty (web integration disabled)" | src/central.c:18 | `{ "sv_www_address", "" }` | MATCH |
| 10 | "Set by: server config / rcon" | src/central.c:18 + cvar.h:66-75 | struct inits only name+string; `flags` field implicitly 0 (no CVAR_SERVERINFO / read-only) -> normal settable cvar | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362.

Verdict: C-NEAR-MISS (flavour-C-positive on one clause). The core master-switch mechanism is fully TRACED-CLEAN -- 9 of 10 clauses map to verified enforcing lines in src/central.c. All five initial outbound-request entry points (Central_VerifyChallengeResponse :395 gated at :375; Central_GenerateChallenge :425 gated at :405; Web_SendRequest :560 gated at :535; Web_PostFileRequest_f :660 gated at :594; Central_ProcessResponses checkin :735 gated at :730) return early when sv_www_address is empty, so "refuses logins / skips check-in / no outbound requests when empty" is exactly enforced. Default empty and the flagless-cvar "set by config/rcon" metadata both verify.

The single defect is clause 8: "uploading match statistics and race records to the configured website." There is NO enforcing read-site for this. A tree-wide grep finds no match-statistics or race-record upload mechanism anywhere in MVDSV; the only `ServerApi` string is the check-in path, and the only server-initiated upload-back (Web_PostResponse) is hard-restricted to `demos/`. What MVDSV actually provides beyond logins+checkin is three GENERIC operator/mod-driven commands (sv_web_get / sv_web_post / sv_web_postfile) registered at central.c:765-767. "Match statistics and race records" is domain inference -- it describes how a game mod (KTX) would drive those generic POST commands, not behavior MVDSV enforces. The real code is broader-but-more-conditional than the clause implies (an arbitrary key/value POST surface, not a stats/race uploader). This is the textbook C-NEAR-MISS shape per enforce-trace-discipline: a correct-sounding side-effect/scope clause with no enforcing read-site on the feature itself; the rest of the row is sound.

Not C-FIX: nothing contradicts the code -- a non-empty URL genuinely does enable an upload surface, so the clause is over-specific rather than inverted. Not WI2-FIX: default + access-class metadata are both correct.

Suggested minimal repair (for the re-synth lane, not applied here): replace the stats/race clause with the actual generic capability, e.g. "...and enables the server's outbound web commands (sv_web_get / sv_web_post / sv_web_postfile) that a game mod or operator uses to send data to the website." That keeps it source-true without naming a stats/race feature MVDSV does not itself implement.

## flags_for_review

- [fyi/cross-mod-override/synthesis] Cross-mod (F-MV1): KTX (the game mod) reads sv_www_address directly via cvar_string and uses non-empty as the gate to upload match stats (ktx/src/stats.c:554) and race records (ktx/src/race.c:3286, :4980) to the configured website. This is a cross-engine consequence of an MVDSV server cvar -- documented inline as a short action-relevant clause per D20; the full cross-stack mechanism (which KTX paths upload what) is a candidate for an L3 concept note if one is later authored for QW central-server/web integration.
- [review/other/vpass] Clause 8 'uploading match statistics and race records' has no MVDSV enforcing site. MVDSV's web layer is a generic key/value POST/GET/file-upload surface (sv_web_get/post/postfile at central.c:765-767) plus auth + check-in; the only server-initiated upload-back (Web_PostResponse, central.c:281-326) is restricted to demos/ paths. The stats/race framing is downstream KTX-usage inference, not engine-enforced behavior.
- [fyi/runtime-dead-suspect/vpass] central.c:694-696 contains a self-assignment no-op `if (this->request_id && !strcmp(this->request_id, "upload")) { this = this; }` -- looks like a vestigial debug breakpoint stub. Not related to sv_www_address semantics, but flagging as a curiosity hit while tracing the response loop.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_www_address",
  "type": "cvar",
  "description": "Sets the base URL of the central web server the server talks to, and acts as the master on/off switch for all web integration. When empty (the default), remote account logins are refused, the periodic check-in is skipped, and the server makes no outbound web requests at all. Set it to a non-empty URL to enable the central-server features: remote account logins, the periodic check-in, and outbound web requests -- including the match statistics and race records that a game mod such as KTX uploads to the website.\n\nDefault: empty (web integration disabled).\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/central.c:375. Read use-sites all gate on the same emptiness test sv_www_address.string[0]. OFF-state / master-switch clause: src/central.c:375 and :405 (Central_VerifyChallengeResponse / Central_GenerateChallenge) print 'Remote logins not supported on this server' and return when string[0] is 0 -> remote logins refused when empty. src/central.c:535 and :594 (Web_SendRequest / Web_PostFileRequest_f) print 'Address not set - functionality disabled' and return when empty. Check-in gate clause: src/central.c:730 'if (sv_www_address.string[0] && !server_busy && ...)' -> periodic check-in only fires when non-empty. Base-URL clause: src/central.c:430 Web_ConstructURL does strlcpy(url, sv_www_address.string, ...) then appends the API path -> the cvar value is literally the URL prefix for every request. Default clause (WI-2): registered at src/central.c:18 as cvar_t {\"sv_www_address\", \"\"} -> empty. Set-by: registered via Cvar_Register at src/central.c:758 inside Central_Init -> server config / rcon, no command sets it. Cross-mod (F-MV1): KTX reads this same cvar as a presence-gate -- ktx/src/stats.c:554 'send_to_website = !strnull(cvar_string(\"sv_www_address\"))' uploads match stats to the website when set, and ktx/src/race.c:3286 / :4980 gate race-record submission on it; this client/mod consequence is action-relevant (an admin sets the URL precisely to turn those uploads on) so a short inline clause is justified, the mechanism detail stays here. Build note: central.c is compiled under #if defined(SERVERONLY) && defined(WWW_INTEGRATION) (src/sv_main.c:4062); WWW_INTEGRATION is defined unconditionally by the standard build (CMakeLists.txt:186), so a production curl-enabled build registers and uses it -- this is live behavior, not dead. Did NOT dead-stamp despite C3 suspect context per chunk rule (live consumer exists; absence was a curl-less build artifact). No new citation format (P3).",
  "description_proposed": null
}
```
