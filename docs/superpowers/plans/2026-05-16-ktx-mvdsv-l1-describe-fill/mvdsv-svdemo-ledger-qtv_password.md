# describe-fill ledger -- mvdsv `qtv_password`

- **Project:** mvdsv
- **Knob:** `qtv_password` (cvar) -- C variable `qtv_password`, registered name string `"qtv_password"`
- **Anchor version:** `1.11-53-g18d0362` (git describe --tags confirmed at HARD GATE)
- **Verdict:** `synthesized` (cold-synth; no trailing comment / no mechanical candidate)
- **Confidence:** high
- **Origin:** `synthesized`
- **suspect_pool_member:** FALSE (not a dead-stamp path)
- **Layer 1 entity:** `mvdsv:cvar:qtv_password`, `source_backed`, registered default `""`, flags `[]` -- confirmed live via oracle `lookup_entity`.

## Final description (user-facing, D20 shape)

> Sets the password a QTV proxy or client must supply before the server will
> let it connect and receive the MVD stream. While set, an incoming QTV
> connection that does not present the matching password is refused and no
> stream is sent. The same value is used both for a plaintext password and as
> the shared secret for the challenge-based auth methods (CCITT, MD4,
> SHA3-512). When empty, no password is required and any QTV connection is
> allowed to receive the stream.
>
> Default: empty (no password required).
> Set by: server config / console / rcon.

## Step 1 -- read use-sites (NOT the registration site)

Registration (locator aid only, NOT the citation): `src/sv_demo_qtv.c:27`
`static cvar_t qtv_password = {"qtv_password", ""};` and
`src/sv_demo_qtv.c:1514` `Cvar_Register (&qtv_password);` (no flag set ->
plain server cvar). All READ use-sites live in the QTV connection-auth
handler in `src/sv_demo_qtv.c`:

| line | code | admin-observable behavior it controls |
|---|---|---|
| 502-503 | `else if (!*qtv_password.string) p->hasauthed = true;` | OFF-state: empty cvar -> connection is authed with no password (any proxy allowed). |
| 514 | `p->hasauthed = !strcmp(qtv_password.string, password);` (PLAIN, after a PASSWORD line) | plaintext path: connection authed only if supplied password exactly matches the cvar. |
| 520 | `CRC_AddBlock(..., qtv_password.string, ...)` (CCITT) | cvar used as the shared secret in the CRC challenge-response. |
| 529 | `snprintf(hash, ..., "%s%s", p->challenge, qtv_password.string);` (MD4) | cvar used as shared secret in MD4 challenge-response. |
| 544 | `sha3_Update(&c, qtv_password.string, strlen(...));` (SHA3_512) | cvar used as shared secret in SHA3-512 challenge-response. |
| 579 | `p->hasauthed = !strcmp(qtv_password.string, password);` (PLAIN, no prior PASSWORD-line branch) | second plaintext compare path; same exact-match semantics. |

Downstream consequence of the gate (traced to confirm the "connect / receive
stream" framing, not inferred from the name): `p->hasauthed` decides whether
the stream starts. `src/sv_demo_qtv.c:658` `if (p->hasauthed == true)` ->
`SV_InitStream(...)` + `SV_MVD_Record(...)` + sends `"BEGIN"` (stream begins);
the else at `:680-683` sends `"PERROR: You need to provide a password."` and
`:685` `p->error = true` (connection closed, no stream). The raw-mode mirror
at `:632` `if (p->hasauthed == false) e = "";` + `:654 p->error = true`
(silently closed, no stream). The bad-match refusal text is at
`:556-563` (`"PERROR: Bad password."`).

## Step 3 -- D5 rubric evaluation

No trailing comment exists on the declaration (line 27 carries only the `""`
default). Cold-synth. Nothing to affirm -> route to Step 5 synthesis. Not a
suspect-pool member (Step 2 N/A). Behavior fully source-legible at the read
use-sites -> no Step 4 hedge/residue.

Rubric check on the synthesized text:
1. WHAT in admin-observable terms (a proxy must supply this to connect/receive
   the stream) -- not WHY. PASS.
2. Not a name restatement (says what the password gates + the empty meaning).
   PASS.
3. It is a free-text secret, not an enum; the load-bearing value distinction
   (empty vs set) is spelled out. PASS.
4. Mechanism only, no recommended value / opinion. PASS.
5. Self-contained without the C code. PASS.

## Step 5 -- per-clause enforce-trace (B1, MANDATORY)

| clause | enforcing file:line | verbatim snippet | MATCH |
|---|---|---|---|
| Password gates whether a QTV connection may receive the stream (semantic) | src/sv_demo_qtv.c:658, :662-666 | `if (p->hasauthed == true)` ... `if ((tmpdest = SV_InitStream(p->socket, p->na, userinfo)))` ... `e = ("QTVSV 1\n" "BEGIN\n\n");` | MATCH -- hasauthed==true is what triggers SV_InitStream + BEGIN; the password compares are the only thing that set hasauthed in the password branch. |
| Empty -> no password required, any connection allowed (OFF-state / polarity) | src/sv_demo_qtv.c:502-503 | `else if (!*qtv_password.string)` / `p->hasauthed = true; //no password, no need to auth.` | MATCH -- empty string -> hasauthed forced true; adjacent comment confirms intent ("no password, no need to auth"). |
| While set, exact match required for plaintext (threshold/polarity) | src/sv_demo_qtv.c:514 and :579 | `p->hasauthed = !strcmp(qtv_password.string, password);` | MATCH -- strcmp==0 (exact equality) is the only way hasauthed becomes true on these PLAIN paths. |
| Non-matching connection is refused, no stream sent (side-effect) | src/sv_demo_qtv.c:556-562, :680-685 | `if (!p->hasauthed && !e) { ... e = ("QTVSV 1\n" "PERROR: Bad password.\n\n"); }` and `else { e = ("QTVSV 1\n" "PERROR: You need to provide a password.\n\n"); } ... p->error = true;` | MATCH -- not-authed -> error string + p->error=true (connection closed); SV_InitStream is never reached. |
| Same value is the shared secret for CCITT/MD4/SHA3-512 challenge auth (scope) | src/sv_demo_qtv.c:520, :529, :544 | `CRC_AddBlock(&ushort_result, (byte *) qtv_password.string, strlen(qtv_password.string));` / `snprintf (hash, sizeof(hash), "%s%s", p->challenge, qtv_password.string);` / `sha3_Update(&c, qtv_password.string, strlen(qtv_password.string));` | MATCH -- the same cvar string is folded into each challenge hash that hasauthed is then computed from (`:521`, `:532`, `:547`). |
| Default empty (metadata, WI-2) | src/sv_demo_qtv.c:27 | `static cvar_t qtv_password = {"qtv_password", ""};` | MATCH -- registered default literal is `""`; oracle L1 record default_value `""`. No shipped-cfg value substituted. |
| Set by server config / console / rcon (metadata, WI-2 access-class) | src/sv_demo_qtv.c:1514 (+ :27 flags field) | `Cvar_Register (&qtv_password);` (declaration has no flags field -> not SERVERINFO/ROM) | MATCH -- plain server-side cvar, no SERVERINFO/userinfo flag, L1 flag_names `[]`; settable via server console/config/rcon, not by connecting clients. |

V-pass self-classification of the produced text: **TRACED-CLEAN** -- every
material clause maps to a located, verified enforcing line (incl. the
adjacent comment at :503). No clause derives only from the knob name, an
announce string, an enum name, or a config comment.

## D20 split note

All file:line / code cites above stay OUT of `description` and live in
`description_reasoning` (single-line cite list) + this human table. The
`description` prose carries zero file:line and zero code-jargon ("hasauthed",
"SV_InitStream", "strcmp" do not appear in the user doc). "QTV proxy", "MVD
stream", and the auth-method names are admin-facing QW/QTV protocol terms, not
engine internals. Cross-codebase detail (how an fteqtv/qtv proxy computes and
sends the password) is the other end of the protocol and is not
action-changing for the server admin beyond "set it to require a password," so
no inline cross-engine clause and no `See also:` slug is forced here.

## description_provenance

`null` -- cold-synth. Per operator clarification 2026-05-30, `description_provenance`
holds retained shipped-doc DATA only; this row has no shipped doc / trailing
comment. Grounding is `source_ref` + anchor + the reasoning cites.

## D6 record

```json
{
  "project": "mvdsv",
  "knob": "qtv_password",
  "type": "cvar",
  "description": "Sets the password a QTV proxy or client must supply before the server will let it connect and receive the MVD stream. While set, an incoming QTV connection that does not present the matching password is refused and no stream is sent. The same value is used both for a plaintext password and as the shared secret for the challenge-based auth methods (CCITT, MD4, SHA3-512). When empty, no password is required and any QTV connection is allowed to receive the stream.\n\nDefault: empty (no password required).\nSet by: server config / console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (no trailing comment, no mechanical candidate); synthesized from QTV connection-auth read use-sites in src/sv_demo_qtv.c, registration src/sv_demo_qtv.c:27 (default \"\", flags []) + src/sv_demo_qtv.c:1514 are locator aids only. Enforce-trace: gate-controls-stream -> src/sv_demo_qtv.c:658,:662-666 (hasauthed==true -> SV_InitStream + BEGIN); OFF-state empty=any-connection -> src/sv_demo_qtv.c:502-503 (incl. adjacent comment 'no password, no need to auth'); exact-match-required (plaintext) -> src/sv_demo_qtv.c:514,:579 (!strcmp); refused-when-mismatch -> src/sv_demo_qtv.c:556-562,:680-685 (PERROR + p->error=true, stream never starts); shared-secret for CCITT/MD4/SHA3-512 -> src/sv_demo_qtv.c:520,:529,:544; default empty (WI-2) -> src/sv_demo_qtv.c:27 registered \"\"; set-by server config/console/rcon (WI-2) -> src/sv_demo_qtv.c:27 no flags field (not SERVERINFO/ROM) + :1514 Cvar_Register, L1 flag_names []. V-pass self-classification TRACED-CLEAN; no clause from name/enum/string/comment alone. suspect_pool_member FALSE -> not dead-stamped.",
  "description_proposed": "Sets the password a QTV proxy or client must supply before the server will let it connect and receive the MVD stream. While set, an incoming QTV connection that does not present the matching password is refused and no stream is sent. The same value is used both for a plaintext password and as the shared secret for the challenge-based auth methods (CCITT, MD4, SHA3-512). When empty, no password is required and any QTV connection is allowed to receive the stream.\n\nDefault: empty (no password required).\nSet by: server config / console / rcon."
}
```

## source_ref (read use-sites that exhibit the behavior)

- Primary: `src/sv_demo_qtv.c:514` (and `:579`) -- the password compare that sets `hasauthed`.
- OFF-state: `src/sv_demo_qtv.c:502`.
- Gate consequence: `src/sv_demo_qtv.c:658`.
