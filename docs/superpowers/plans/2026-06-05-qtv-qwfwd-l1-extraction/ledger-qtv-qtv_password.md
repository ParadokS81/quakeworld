# describe-fill-synthesis ledger -- qtv `qtv_password`

- **Project:** qtv
- **Knob:** `qtv_password` (cvar) -- registered NAME string `"qtv_password"`; read via `qtv.qvs.Get("qtv_password").Str`.
- **Anchor version:** `1.16-dev` (`pkg/qtv/qtv.go:29` `qtvRelease`).
- **Registration:** `pkg/qtv/downstream_storage.go:200` `qtv.qvs.Reg("qtv_password", "")` -> default `""`, flags `[]` (locator aid only, NOT the citation).
- **Mechanical candidate:** none (cold-synth; the register site carries no trailing comment; `resources/qtv.cfg` is a HINT only, NOT ground truth / NOT a seed -- SR-1).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live; do NOT dead-stamp).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible in both directions; every clause enforce-traced.
- **Confidence:** high

## Halt verdict

```
qtv:qtv_password: synthesized -- cold-synth; the password gating downstream viewers/proxies connecting to this QTV (server side) AND the fallback password this QTV presents to an upstream source (client side); empty = no password required (downstream auth skipped); PLAIN exact-match or SHA3-512 challenge-response -- origin=synthesized ref=pkg/qtv/downstream_pending_request.go:118 anchor=1.16-dev
```

## D6 REJECT-LIST compliance (LOAD-BEARING)

The C-QTV knob for this behavior is `admin_password` (fteqtv/, D13 scope fence) -- it does NOT exist in Go QTV (0 hits in `pkg/`). This description is sourced ENTIRELY from the Go `qtv_password` read use-sites (downstream auth gate + upstream password fallback). No clause is paraphrased from C `admin_password`. Verified: `grep admin_password pkg/` = 0 hits.

## Final description (user-facing, D20 shape)

> Sets the password that protects this QTV proxy. It is used in two directions. As a server, this is the password a downstream viewer or relay proxy must supply before this QTV will accept its connection and send the stream; while set, a downstream that does not present the matching password is refused. As a client, this is the password this QTV presents when connecting to an upstream source that requires one, unless a per-upstream password has been configured for that source. The password can be sent as plaintext or proven through a challenge-response (SHA3-512) without sending the password itself. When empty, downstream connections require no password and any viewer or proxy is allowed to receive the stream.
>
> Default: empty (no password required).
> Set by: server config.
> See also: qtv_password (the MVDSV server-side setting for the same QTV auth handshake).

## Read use-sites (WI-1 wide read)

Tree-wide grep (`qtv_password` / `Get("qtv_password")` / `getPasswordForReqCmd` / `authenticateRequest` / `validateReqAuth` / `.password()`) over the whole `pkg/` tree. The cvar is read at exactly two `Get("qtv_password")` call-sites; both feed legible auth paths. All sites at anchor `1.16-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration (locator) | `pkg/qtv/downstream_storage.go:200` | `qtv.qvs.Reg("qtv_password", "")` -- registered default `""`, no flags |
| Downstream-auth read (server side) | `pkg/qtv/downstream_pending_request.go:118` | `return uss.qtv.qvs.Get("qtv_password").Str` -- the local password a downstream must match (for non-SOURCE, and the global fallback for SOURCE) |
| Upstream-auth read (client side) | `pkg/qtv/upstream.go:614` | `return us.qtv.qvs.Get("qtv_password").Str` -- the fallback password this QTV sends to an upstream when no per-upstream password is set |
| OFF-state (downstream) | `pkg/qtv/downstream_pending_request.go:88-90` | `if localPass == "" { return true, nil // We are not password protected. }` -- empty cvar -> downstream auth skipped, connection allowed |
| Challenge gate | `pkg/qtv/downstream_pending_request.go:93-96` | password required but none supplied -> send challenge, wait for reply |
| Compare (PLAIN / SHA3_512) | `pkg/qtv/downstream_pending_request.go:122-146` | PLAIN exact-match `:139`; SHA3_512 challenge-response `:128-137`; mismatch -> `sendPermanentError("authentication failure")` `:144` |
| Auth-gates-stream consequence | `pkg/qtv/downstream_pending_request.go:40-53` | only when `authenticateRequest` returns ok does `processRequest` proceed to `sourceRequest()` / `sourceListRequest()` / `demoListRequest()` -- the stream/data is delivered only after auth passes |
| Per-upstream override (SOURCE) | `pkg/qtv/downstream_pending_request.go:108-114` + `pkg/qtv/upstream.go:610-614` | for a SOURCE request naming a known upstream, that upstream's own password is used (via `us.password()`), falling back to `qtv_password` otherwise |

## D5 rubric check (Step 3)

Cold-synth: register site `downstream_storage.go:200` has no trailing comment; no shipped-doc candidate -> nothing to affirm, but D5-amendment requires full evaluation. Behavior fully source-legible at both read-sites -> SYNTHESIZE (not hedge/residue). Step 2 N/A (not suspect-pool). Rubric: (1) states admin-observable WHAT (the password that gates downstream viewers and that this proxy presents upstream) -- not WHY; (2) not a name restatement (spells the two directions, the empty-state meaning, the auth methods); (3) the load-bearing value distinction (empty vs set) is spelled out -- it is a free-text secret, not an enum; (4) mechanism only, no recommended value; (5) self-contained without source. All five hold.

## Per-clause enforce-trace table (B1)

All sites in `pkg/qtv/` at anchor `1.16-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Server side: a downstream must supply this to connect and receive the stream (semantic) | `pkg/qtv/downstream_pending_request.go:40-48` | `if ok, err := ds.authenticateRequest(cmd); err != nil { return err } else if !ok { return nil ... }` then `switch cmd { case "SOURCE": return ds.sourceRequest() ...}` | MATCH -- the request proceeds to stream delivery only after `authenticateRequest` returns ok; the password compare is what makes it ok in the protected path. |
| Downstream local password is `qtv_password` (scope) | `pkg/qtv/downstream_pending_request.go:118` | `return uss.qtv.qvs.Get("qtv_password").Str` | MATCH -- `getPasswordForReqCmd` returns the cvar as `localPass`, consumed by `authenticateRequest` `:87`. |
| OFF-state: empty -> no password required, any downstream allowed (polarity) | `pkg/qtv/downstream_pending_request.go:88-90` | `localPass := ds.getPasswordForReqCmd(cmd)` / `if localPass == "" { return true, nil // We are not password protected. }` | MATCH -- empty local password -> auth returns true immediately; adjacent comment confirms intent ("We are not password protected."). |
| While set, downstream refused unless it matches (side-effect) | `pkg/qtv/downstream_pending_request.go:144-145` | `ds.sendPermanentError("authentication failure")` / `return false, errors.New("authentication failure")` | MATCH -- on PLAIN/SHA3 non-match, falls through to permanent error; `sourceRequest()` never reached. |
| PLAIN = exact match (threshold/polarity) | `pkg/qtv/downstream_pending_request.go:138-141` | `case "PLAIN": if remotePass == localPass { return true, nil }` | MATCH -- string equality is the only PLAIN pass condition. |
| SHA3-512 = challenge-response, password not sent in clear (semantic) | `pkg/qtv/downstream_pending_request.go:128-137` | `case "SHA3_512": ... hash := sha3.Sum512([]byte(string(challenge) + localPass)) ... if remotePass == hexHash { return true, nil }` | MATCH -- the downstream proves knowledge of the password by hashing challenge+password; the cleartext password is not transmitted. |
| Client side: this is the password this QTV presents to an upstream, unless a per-upstream password is set (scope) | `pkg/qtv/upstream.go:610-614` | `func (us *uStream) password() string { if pass, err := us.options.dsPassword.Get(); err == nil { return pass } return us.qtv.qvs.Get("qtv_password").Str }` | MATCH -- per-upstream `dsPassword` wins; `qtv_password` is the fallback; adjacent comment `:609` "Upstream could have either own password or global qtv_password." confirms. |
| Per-upstream override also applies to a downstream SOURCE request naming that upstream (scope) | `pkg/qtv/downstream_pending_request.go:108-114` | `if cmd == "SOURCE" { ... return us.password() } ... return uss.qtv.qvs.Get("qtv_password").Str` | MATCH -- a SOURCE request resolving to a known upstream id uses that upstream's password; otherwise the global `qtv_password`. (Stated in prose only as "unless a per-upstream password has been configured for that source.") |
| Default empty (metadata, WI-2) | `pkg/qtv/downstream_storage.go:200` | `qtv.qvs.Reg("qtv_password", "")` | MATCH -- registered default literal is `""` (via `Reg` -> `RegEx(..., 0, nil)` `var.go:202-203`). No shipped-cfg value substituted (SR-1; `resources/qtv.cfg` is a hint only). |
| Set by server config (metadata, WI-2 access-class) | `pkg/qtv/downstream_storage.go:200` | `qtv.qvs.Reg("qtv_password", "")` (no flags; `Reg` registers flags `0`) | MATCH -- no `qVarFlagServerInfo` / `qVarFlagInitOnly` / `qVarFlagReadOnly`; QTV has no `set` command registered (`var.go:85-87` -- `set` is commented out, only `varlist`), so it is set through the QTV config file read at init, not by connecting clients. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every material clause maps to a located, verified enforcing line (incl. the adjacent OFF-state comment at `:89` and the upstream-fallback comment at `:609`). No clause derives only from the knob name, an announce string, an enum name, or a config comment. No clause is paraphrased from C `admin_password` (D6).

## D20 split note

All file:line / Go identifiers (`authenticateRequest`, `getPasswordForReqCmd`, `validateReqAuth`, `sendReqChallenge`, `dsPassword`, `us.password()`, `processRequest`, `sourceRequest`, `Get(...).Str`, `Reg`) stay OUT of `description` and live in `description_reasoning` + this human table. The `description` prose carries zero file:line and zero engine jargon. "QTV proxy", "downstream viewer", "relay proxy", "upstream source", "stream", and the auth-method names (plaintext, SHA3-512 challenge-response) are admin-facing QW/QTV protocol terms, not engine internals.

Cross-engine: the MVDSV-side `qtv_password` is the OTHER end of the same QTV auth handshake (an MVDSV server gating a QTV proxy that connects to pull its MVD stream; this QTV's UPSTREAM side is exactly such a connecting proxy). That is action-relevant context for an operator wiring a QTV-to-MVDSV chain, so per SR-4 a `See also:` line points at the MVDSV knob. The deeper cross-codebase negotiation matrix (PLAIN/MD4/CCITT/SHA3 across mvdsv/fteqtv/qtv) is L3, captured as a breadcrumb in reasoning (SR-5), not inlined.

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30 (sibling arc), `description_provenance` holds retained shipped-doc DATA only; this row has no shipped doc / trailing comment. Grounding is `source_ref` + anchor + the reasoning cites.

## Rationale

Cold-synth from fully-legible use-sites. `qtv_password` is read at exactly two sites, giving it a dual role. Server side (downstream auth): `getPasswordForReqCmd` (`downstream_pending_request.go:104-118`) returns it as the local password; `authenticateRequest` (`:83-99`) short-circuits to allowed when it is empty (`:88-90`, OFF-state), sends a challenge when a password is required but none was supplied (`:93-95`), and otherwise compares via `validateReqAuth` (`:122-146`) -- PLAIN exact-match (`:139`) or SHA3-512 challenge-response (`:128-137`), with a non-match producing a permanent "authentication failure" (`:144`). The gate is upstream of stream delivery: `processRequest` (`:40-48`) only reaches `sourceRequest()`/`sourceListRequest()`/`demoListRequest()` after auth returns ok. Client side (upstream auth): `uStream.password()` (`upstream.go:610-614`) returns a per-upstream password if configured, else `qtv_password` -- the fallback this proxy presents when connecting to an upstream source. The same per-upstream override is honored for a downstream SOURCE request naming a known upstream id (`downstream_pending_request.go:108-114`).

WI-2: registered default is `""` (`downstream_storage.go:200`, via `Reg`). Set-by is server config -- no serverinfo/init-only/read-only flag, and QTV registers no `set` command (`var.go:85-87`), so the value comes from the config file at startup, never from a connecting client. SR-1: `resources/qtv.cfg` is a hint only, not a seed; not consulted as ground truth.

D6 (LOAD-BEARING): the C-QTV equivalent `admin_password` (fteqtv/, D13) is absent from Go QTV -- `grep admin_password pkg/` = 0. This description is built strictly from the Go `qtv_password` read-sites; the C semantics were not paraphrased. SR-4: `See also: qtv_password` points at the MVDSV server-side ledger (`docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_password.md`); it is action-changing for an operator chaining QTV behind MVDSV (the two passwords are the two ends of one handshake). The MVDSV sibling notes "QTV proxy or client must supply" the password to connect and receive the MVD stream -- this QTV's upstream side is precisely that connecting proxy, so the See-also is the correct cross-engine anchor.

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/compare/assignment incl. adjacent comments; no clause rests on the cvar name, an enum/string, or a config comment; nothing paraphrased from C. [L3 breadcrumb: qtv_password cross-codebase auth matrix] -- `qtv_password` is one node in the PLAIN/MD4/CCITT/SHA3 cross-codebase auth-negotiation concept-note candidate (SR-5 (c); note Go QTV downstream auth implements PLAIN + SHA3-512 only -- MD4/CCITT appear on the MVDSV/fteqtv side, a cross-codebase asymmetry worth the L3 note).

## D6Record

```json
{
  "project": "qtv",
  "knob": "qtv_password",
  "type": "cvar",
  "description": "Sets the password that protects this QTV proxy. It is used in two directions. As a server, this is the password a downstream viewer or relay proxy must supply before this QTV will accept its connection and send the stream; while set, a downstream that does not present the matching password is refused. As a client, this is the password this QTV presents when connecting to an upstream source that requires one, unless a per-upstream password has been configured for that source. The password can be sent as plaintext or proven through a challenge-response (SHA3-512) without sending the password itself. When empty, downstream connections require no password and any viewer or proxy is allowed to receive the stream.\n\nDefault: empty (no password required).\nSet by: server config.\nSee also: qtv_password (the MVDSV server-side setting for the same QTV auth handshake).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.16-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment at registration pkg/qtv/downstream_storage.go:200 qtv.qvs.Reg(\"qtv_password\", \"\"), default \"\", flags []; no shipped-doc candidate -> nothing to affirm; both read-sites fully source-legible so synthesize). Read at exactly two Get(\"qtv_password\") sites (tree-wide grep). Dual role. Server-side downstream auth: getPasswordForReqCmd pkg/qtv/downstream_pending_request.go:118 returns the cvar as localPass; authenticateRequest :88-90 returns allowed when empty (OFF-state, adjacent comment 'We are not password protected.'); :93-95 sends challenge when password required but none supplied; validateReqAuth :122-146 compares PLAIN exact-match :139 or SHA3_512 challenge-response :128-137, non-match -> sendPermanentError('authentication failure') :144. Gate precedes stream delivery: processRequest :40-48 reaches sourceRequest/sourceListRequest/demoListRequest only after auth ok. Client-side upstream auth: uStream.password() pkg/qtv/upstream.go:610-614 returns per-upstream dsPassword if set else qtv_password (adjacent comment :609); same per-upstream override honored for a downstream SOURCE naming a known upstream id pkg/qtv/downstream_pending_request.go:108-114. WI-2: default \"\" -> downstream_storage.go:200 (Reg -> RegEx(...,0,nil) var.go:202-203); Set-by server config -> no flags, and QTV registers no 'set' command (var.go:85-87 only varlist), value comes from config file at init not from clients. SR-1: resources/qtv.cfg is a hint only, not a seed. D6 (LOAD-BEARING): C-QTV equivalent admin_password (fteqtv/, D13) absent from Go QTV -- grep admin_password pkg/ = 0; description built strictly from Go qtv_password read-sites, C semantics NOT paraphrased. SR-4: See also: qtv_password points at MVDSV server-side ledger (docs/superpowers/plans/2026-05-16-ktx-mvdsv-l1-describe-fill/mvdsv-svdemo-ledger-qtv_password.md); action-changing for an operator chaining QTV behind MVDSV (two ends of one handshake; this QTV's upstream side is the connecting proxy the MVDSV qtv_password gates). V-pass self-classification TRACED-CLEAN; no clause from name/enum/string/comment alone. suspect_pool_member FALSE -> not dead-stamped. provenance=null (cold-synth, operator 2026-05-30). [L3 breadcrumb: qtv_password cross-codebase auth matrix] -- Go QTV downstream auth implements PLAIN + SHA3-512 only; MD4/CCITT appear on the MVDSV/fteqtv side (cross-codebase asymmetry for the SR-5 (c) concept-note candidate).",
  "description_proposed": null
}
```
