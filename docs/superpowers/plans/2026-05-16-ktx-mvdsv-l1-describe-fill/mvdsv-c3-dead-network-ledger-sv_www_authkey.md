# describe-fill-synthesis ledger -- mvdsv `sv_www_authkey`

- **project:** mvdsv
- **knob:** `sv_www_authkey` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `c3-dead-network` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_www_authkey: synthesized -- auth key attached as 'authKey' on every central-server request; empty by default; live under WWW_INTEGRATION (CMake default-on) -- origin=synthesized ref=src/central.c:344 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the authentication key sent with every request the server makes to the central web server. It is attached as the 'authKey' field on each outbound request so the central server can verify the request came from this server. Leave it empty if your central server does not require a key.
>
> Default: empty.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| empty by default | src/central.c:19 | `static cvar_t sv_www_authkey = { "sv_www_authkey", "" };` | MATCH |
| sent as 'authKey' on every request | src/central.c:343-344 | `CURLFORM_PTRNAME, "authKey", CURLFORM_COPYCONTENTS, sv_www_authkey.string,` (in Web_SubmitRequestForm, the shared submit path) | MATCH |
| set by config (registration) | src/central.c:759 | `Cvar_Register(&sv_www_authkey);` (inside Central_Init) | MATCH |
| compiled under WWW_INTEGRATION, defined by build | src/sv_main.c:4062 / CMakeLists.txt:186 | `#if defined(SERVERONLY) && defined(WWW_INTEGRATION)` / `target_compile_definitions(... PRIVATE WWW_INTEGRATION)` | MATCH |
| no KTX consumer | ktx/src (grep) | (no match for sv_www_authkey) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Auth key is sent with EVERY request the server makes to the central web server | src/central.c:338-366 (`Web_SubmitRequestForm`, the sole submission funnel); all 6 outbound call-sites route through it: 315 (upload), 395 (verify-response), 425 (generate-challenge), 560 (sv_web_post/get), 660 (sv_web_postfile), 735 (periodic checkin). Subsystem activates only when sv_www_address set: gates at 375, 405, 730 | `static void Web_SubmitRequestForm(const char* url, ...)` { `CURLFORMcode code = curl_formadd(&first_form_ptr, &last_form_ptr, CURLFORM_PTRNAME, "authKey", CURLFORM_COPYCONTENTS, sv_www_authkey.string, CURLFORM_END);` ... `curl_multi_add_handle(curl_handle, req);` } | MATCH |
| 2 | Attached as the 'authKey' field on each outbound request | src/central.c:343-344 | `CURLFORM_PTRNAME, "authKey",` / `CURLFORM_COPYCONTENTS, sv_www_authkey.string,` — unconditional, no `if` guard around the curl_formadd; runs on every Web_SubmitRequestForm invocation | MATCH |
| 3 | So the central server can verify the request came from this server (purpose) | src/central.c:2 (file header), 7-9 (auth paths) | `// central.c - communication with central server`; `#define VERIFY_RESPONSE_PATH "Authentication/VerifyResponse"` — authKey is the per-server credential on the central-server channel | MATCH (purpose statement; nothing in code contradicts) |
| 4 | Leave it empty if your central server does not require a key (OFF-state) | src/central.c:344 | empty `sv_www_authkey.string` is still attached as `authKey=""` (field present, value empty) — harmless when the central server ignores it | MATCH (correct user-advice; see note) |
| 5 | Default: empty | src/central.c:19 (registration) + src/cvar.c:240-269 (init from variable->string) | `static cvar_t sv_www_authkey = { "sv_www_authkey", "" };` — second struct field (string) is "", flags field omitted = 0 | MATCH |
| 6 | Set by: server config / rcon | src/central.c:19 (no flags) + 759 (plain register); src/cvar.h:60-75 (flag defs + struct) | `Cvar_Register(&sv_www_authkey);` — no CVAR_ROM/CVAR_SERVERINFO; standard mutable server cvar settable from config or rcon | MATCH |

**V-pass notes:** All six clauses enforce-trace to located lines in src/central.c (with cvar.c/cvar.h for metadata). The load-bearing claim ("every request" / "each outbound request") is the discriminating one and it holds: Web_SubmitRequestForm at central.c:338 is the single submission funnel, and ALL six outbound paths (upload 315, verify-response 395, generate-challenge 425, sv_web_post/get 560, sv_web_postfile 660, periodic checkin 735) route through it. The authKey curl_formadd at lines 342-346 is UNCONDITIONAL -- there is no guard, so the field is prepended on every submitted request. Quoted enforcing line for the polarity/scope claim: `curl_formadd(&first_form_ptr, &last_form_ptr, CURLFORM_PTRNAME, "authKey", CURLFORM_COPYCONTENTS, sv_www_authkey.string, CURLFORM_END)` (central.c:342-346).

WI-2 default: registered default is empty -- struct initializer `{ "sv_www_authkey", "" }` (central.c:19), confirmed against the registered value, not a shipped-cfg value. Cvar_Register (cvar.c:240-269) initializes the live string from variable->string. No CVAR_ROM flag (flags field omitted in the 2-element initializer = 0), so it is freely settable -> "server config / rcon" access class is correct (standard mutable server cvar, no read-only/serverinfo restriction).

One minor framing nuance (not a defect): when the cvar is empty the code still ATTACHES `authKey=""` (an empty-valued field), it does not OMIT the field. The description's clause 4 says "Leave it empty if your central server does not require a key" -- this is operationally correct user-advice and does not claim the field is omitted, so it does not contradict the code. Does not warrant C-NEAR-MISS.

Verdict: TRACED-CLEAN. Every material clause maps to a located, verified enforcing line including the unconditional attachment and the registered empty default.

## flags_for_review

- [fyi/other/vpass] sv_www_authkey is sent as a curl form field via CURLFORM_COPYCONTENTS (plaintext POST body) on every central-server request, including the unauthenticated periodic checkin (central.c:735) which fires whenever sv_www_address is set. This is a credential transmitted in cleartext unless the central server URL is HTTPS -- Web_ConstructURL (central.c:428-438) does no scheme enforcement, so an http:// sv_www_address would leak the key. This is upstream MVDSV behavior, out of scope for this knob's description, but flagging as a security observation surfaced during the trace.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sys_nostdout=C-FIX, sv_idlesleep=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_www_authkey",
  "type": "cvar",
  "description": "Sets the authentication key sent with every request the server makes to the central web server. It is attached as the 'authKey' field on each outbound request so the central server can verify the request came from this server. Leave it empty if your central server does not require a key.\n\nDefault: empty.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/central.c:344. Single read use-site: src/central.c:344, inside Web_SubmitRequestForm (the one function every outbound request funnels through). The form is built with curl_formadd(... CURLFORM_PTRNAME, \"authKey\", CURLFORM_COPYCONTENTS, sv_www_authkey.string, ...) -> the cvar's string value is sent verbatim as the 'authKey' form field on EVERY request (challenge, login, check-in, web_get/post/postfile all call Web_SubmitRequestForm). 'so the central server can verify' is the observable purpose of an authKey field; no enforcing line in MVDSV consumes the verification result (that is the remote server's job) so I state only the send, not any local check. No emptiness branch keys off this cvar specifically -- an empty value just sends an empty authKey field (no separate gate; the master gate is sv_www_address). Default clause (WI-2): registered at src/central.c:19 as cvar_t {\"sv_www_authkey\", \"\"} -> empty. Set-by: Cvar_Register at src/central.c:759 in Central_Init -> server config / rcon. Cross-mod (F-MV1): no KTX reference to sv_www_authkey (grep of ktx/src hit only sv_www_address). Build note: same WWW_INTEGRATION conditional as the address cvar; defined by the standard build (CMakeLists.txt:186) -> live, not dead. Did NOT dead-stamp per chunk rule. No new citation format (P3).",
  "description_proposed": null
}
```
