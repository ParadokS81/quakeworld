# describe-fill-synthesis ledger -- qwfwd `hostname`

- **Project:** qwfwd
- **Knob:** `hostname` (cvar)
- **C variable / registered name string:** both `hostname` (no case difference) -- declared `src/main.c:16` (`cvar_t *hostname;`), extern `src/qwfwd.h:226`, registered `src/main.c:128` (`hostname = Cvar_Get("hostname", "unnamed qwfwd", CVAR_SERVERINFO);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config does not set this knob).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:hostname: synthesized -- cold-synth, no comment; the proxy's advertised display name, fully source-legible (published in server info / shown in status reply; shown in the "proxy is full" rejection; registered default "unnamed qwfwd"; CVAR_SERVERINFO) -- origin=synthesized ref=src/svc.c:242 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Sets the display name this proxy advertises. The name appears in the proxy's server info (so it is what shows up in server browsers) and is included in the "proxy is full" message a client sees when it is turned away because all slots are taken.
>
> Any text string.
>
> Default: "unnamed qwfwd".
> Set by: server config.

## Read use-sites (WI-1 wide read)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/main.c:16` | the cvar pointer (locator only) |
| Extern | `src/qwfwd.h:226` | shared pointer decl (locator only) |
| Registration | `src/main.c:128` | registers name + default `"unnamed qwfwd"` + flags `CVAR_SERVERINFO` |
| Direct read ("full" message) | `src/svc.c:242` | `hostname->string` is interpolated into the "proxy@<name> is full" reply sent to a client refused for lack of slots |
| Serverinfo publication | `src/cvar.c:184-192` (CVAR_SERVERINFO mirror) -> `src/svc.c:362` (status reply) | the name is mirrored into the proxy's server-info string and returned in the `status` query response |

## D5 rubric check (Step 3)

Cold-synth: register site `src/main.c:128` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The direct `hostname->string` read and the serverinfo publication path are fully source-legible -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (the advertised display name and where it appears); (2) not a name restatement -- spells out the two surfaces (server info / browsers, and the full-message); (3) value form spelled (any text string); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: it is the proxy's advertised display NAME (a text string) | `src/svc.c:242` reads `hostname->string`; registered as a plain string cvar | `..."proxy@%s is full\n\n", A2C_PRINT, hostname->string`; registration `Cvar_Get("hostname","unnamed qwfwd",CVAR_SERVERINFO)` (string default) | MATCH |
| Semantic: published in server info (-> shown in server browsers) | `src/main.c:128` (`CVAR_SERVERINFO`) -> `src/cvar.c:184-192` (mirror into `ps.info`) -> `src/svc.c:360-363` (status reply prints `ps.info`) | `if (var->flags & CVAR_SERVERINFO) { ... Info_SetValueForStarKey (ps.info, var->name, var->string, ...) }`; `snprintf(tmp, ..., "%s\n", ps.info)` in `SVC_Status` | MATCH |
| Semantic: shown in the "proxy is full" message to a turned-away client | `src/svc.c:240-243` | `if (FWD_peers_count() >= maxclients->integer) { Netchan_OutOfBandPrint (..., "proxy@%s is full\n\n", A2C_PRINT, hostname->string); return; }` | MATCH |
| Scope: the full-message is sent specifically when the proxy is at capacity | `src/svc.c:240` (the gate guarding the `:242` print) | `if (FWD_peers_count() >= maxclients->integer)` (the print is inside this at-cap branch) | MATCH |
| Default: "unnamed qwfwd" | `src/main.c:128` (registration; WI-2) | `hostname = Cvar_Get("hostname", "unnamed qwfwd", CVAR_SERVERINFO);` | MATCH |
| Set by: server config (registered with `CVAR_SERVERINFO`; no vote/command setter, no `CVAR_READONLY`) | `src/main.c:128` (flags arg `CVAR_SERVERINFO` only) | `Cvar_Get("hostname", "unnamed qwfwd", CVAR_SERVERINFO)` (no `CVAR_READONLY`/`CVAR_NOSET`; editable from config) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`hostname->string`, `ps.info`, `CVAR_SERVERINFO`, `SVC_Status`, `Netchan_OutOfBandPrint`, `A2C_PRINT`), the exact `"proxy@%s is full"` format string, and the registration-flags reasoning. The user doc states "appears in the proxy's server info (so it is what shows up in server browsers)" and "the proxy is full message" in admin-observable terms. The serverinfo-publication clause is kept inline (one short clause) because it is the whole point of a hostname and is action-relevant (an admin sets it precisely so the proxy is identifiable in browsers) -- meeting the D20 "inline only if action-changing" bar; no further cross-engine detail is asserted, so no separate `See also:` is warranted. None of the three SR-5 concept-note candidates (masters registration, parse_delay/tick_time streaming, qtv_password auth) is touched by a display-name knob -> no breadcrumb.

## Rationale

Cold-synth from fully-legible use-sites. `hostname` is the proxy's advertised display name. It has exactly one direct read -- `src/svc.c:242` -- where `hostname->string` is interpolated into the "proxy@<name> is full" connectionless reply sent to a client that is refused because the proxy is at its `maxclients` cap (the print sits inside the at-cap branch guarded at `:240`). Its second, broader surface is the serverinfo channel: registered `CVAR_SERVERINFO` (`src/main.c:128`), the value is mirrored into the proxy server-info string `ps.info` (`src/cvar.c:184-192`, at registration via `Cvar_ForceSet` and on any later change), and `ps.info` is returned to a querying server browser in the `status` reply (`src/svc.c:360-363`, gated on the oldstyle / `STATUS_SERVERINFO` request flag) -- so the name is what a browser displays for this proxy. I confirmed the heartbeat to masters (`src/query.c:246`) sends only the sequence number and peer count, NOT the serverinfo string (despite the `qwfwd.h:193` comment claiming "+ serverinfo"), so I do NOT claim hostname is sent to the masters -- only that it rides the status reply (flavour-C trap avoided: the comment was not taken as an enforcing line). Registered default is the literal string `"unnamed qwfwd"` at `src/main.c:128` (WI-2: read from the `Cvar_Get` literal). Flags carry `CVAR_SERVERINFO` only (no `CVAR_READONLY`/`CVAR_NOSET`), so it is editable from config -> `Set by: server config`. No C2 conflict (no shipped-doc candidate; example config does not set it). No SR-3 deployment-default divergence applies to this knob. `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing read/branch or the verified mirror+reply path; no clause rests on the cvar name or a comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "hostname",
  "type": "cvar",
  "description": "Sets the display name this proxy advertises. The name appears in the proxy's server info (so it is what shows up in server browsers) and is included in the \"proxy is full\" message a client sees when it is turned away because all slots are taken.\n\nAny text string.\n\nDefault: \"unnamed qwfwd\".\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/main.c:128 (Cvar_Get(\"hostname\",\"unnamed qwfwd\",CVAR_SERVERINFO)), no shipped-doc candidate, example config does not set it -> nothing to affirm; use-sites fully source-legible so synthesize. Clauses->cites: it is the advertised display NAME (text string) -> direct read src/svc.c:242 hostname->string + string default at registration; published in server info -> CVAR_SERVERINFO at registration -> mirror into ps.info src/cvar.c:184-192 -> SVC_Status prints ps.info src/svc.c:360-363 (so browsers show it); shown in 'proxy is full' message -> src/svc.c:240-243 Netchan_OutOfBandPrint \"proxy@%s is full\" with hostname->string; scope = that message is the at-capacity reply -> the print is inside the if (FWD_peers_count() >= maxclients->integer) gate at src/svc.c:240; Default 'unnamed qwfwd' (WI-2, registered literal) -> src/main.c:128; Set-by server config -> flags CVAR_SERVERINFO only, no CVAR_READONLY/NOSET. FLAVOUR-C TRAP AVOIDED: heartbeat src/query.c:246 sends only sequence + peer count, NOT serverinfo, despite qwfwd.h:193 comment '+ serverinfo' -- so I claim publication only in the status reply, not to masters; the comment was not taken as the enforcing line. No SR-3 divergence on this knob. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No SR-5 concept-note breadcrumb (display-name knob does not touch masters-registration/streaming/auth candidates).",
  "description_proposed": null
}
```
