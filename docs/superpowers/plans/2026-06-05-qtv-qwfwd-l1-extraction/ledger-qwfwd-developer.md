# describe-fill-synthesis ledger -- qwfwd `developer`

- **Project:** qwfwd
- **Knob:** `developer` (cvar)
- **C variable / registered name string:** both `developer` (no case difference) -- declared `src/main.c:14` (`cvar_t *developer;`), extern `src/qwfwd.h:226`, registered `src/main.c:126` (`developer = Cvar_Get("developer", "0", 0);`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- no trailing comment at the register site; the example config does not set this knob).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=cvar).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:developer: synthesized -- cold-synth, no comment; graduated debug-verbosity level fully source-legible, every clause enforce-traced (0=silent, 1=debug output via Sys_DPrintf, 2+=extra verbose; registered default "0"; flags 0, NOT serverinfo) -- origin=synthesized ref=src/sys.c:156 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Controls how much diagnostic output the proxy prints to its console. At 0 the proxy runs quietly and prints only normal status messages. Raising it turns on internal debug logging -- per-connection events, challenge and protocol handling, master-server traffic, and dropped or banned addresses. A higher value prints even more detail. Intended for troubleshooting; it does not change how the proxy forwards clients.
>
> 0 = off (no debug output). 1 = debug output. 2 or higher = extra-verbose output.
>
> Default: 0.
> Set by: server config.

## Read use-sites (WI-1 wide read)

All reads gate the value through `->integer`; sites span the whole `src/` tree at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Declaration | `src/main.c:14` | the cvar pointer (locator only) |
| Extern | `src/qwfwd.h:226` | shared pointer decl (locator only) |
| Registration | `src/main.c:126` | registers name + default `"0"` + flags `0` (NOT serverinfo) |
| Primary gate (`Sys_DPrintf`) | `src/sys.c:156-157` | OFF (0) -> `Sys_DPrintf` prints nothing; nonzero -> debug text is printed. This one gate governs ~40 debug call-sites across clc.c/svc.c/net.c/peer.c/query.c/whitelist.c/ban.c |
| Direct gate (clc.c) | `src/clc.c:142` | nonzero -> prints the raw connectionless packet contents the proxy receives |
| Direct gate (svc.c) | `src/svc.c:114` | nonzero -> prints the challenge it issues |
| Extra-verbose gate (ban.c) | `src/ban.c:77` | `> 1` -> logs each address as it is banned |
| Extra-verbose gate (query.c heartbeat dump) | `src/query.c:249` | `> 1` -> dumps the full heartbeat string sent to masters |
| Extra-verbose gate (query.c master list dump) | `src/query.c:319` | `> 1` -> prints each server returned in a master-server list reply |

## D5 rubric check (Step 3)

Cold-synth: register site `src/main.c:126` has no trailing comment and there is no shipped-doc candidate -> nothing to affirm, but the D5 amendment requires evaluation anyway. The read use-sites are fully source-legible (one central gate plus two direct nonzero gates plus three `> 1` gates) -> SYNTHESIZE (not hedge/residue). Rubric: (1) states admin-observable WHAT (how much diagnostic output appears on the console); (2) not a name restatement ("developer" alone says nothing about debug verbosity); (3) enum spelled (0=off, 1=debug, 2+=extra-verbose); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: controls how much diagnostic/debug output is printed | `src/sys.c:151-163` (`Sys_DPrintf`) | `if (!developer || !developer->integer) return;` guarding `Sys_Printf("%s", string);` | MATCH |
| OFF-state: 0 -> no debug output (quiet) | `src/sys.c:156-157` | `if (!developer || !developer->integer)` / `return;` (early-returns before any print) | MATCH |
| Polarity: nonzero turns debug ON | `src/sys.c:156` uses `->integer` truthiness | `if (!developer || !developer->integer) return;` (nonzero falls through to print) | MATCH |
| Semantic: turns on per-connection / challenge / protocol / master / drop / ban logging | the ~40 `Sys_DPrintf(...)` call-sites gated by `:156` (e.g. peer add/drop `src/peer.c:162,179`, challenge `src/svc.c:116`, protocol reject `src/svc.c:151,161`, master traffic `src/query.c:282,286,308`, whitelist drop `src/whitelist.c:35,41`) | all route through `Sys_DPrintf` -> `src/sys.c:156` gate | MATCH |
| Semantic: also prints raw received connectionless packets | `src/clc.c:142-144` | `if ( developer->integer )` guarding `Sys_DPrintf ("CL packet %s: %s\n", ...)` | MATCH |
| Semantic: a higher value (>=2) prints even more detail | `src/ban.c:77`, `src/query.c:249`, `src/query.c:319` | `if (developer->integer > 1)` (ban-log), `if (developer->integer > 1)` (heartbeat dump), `if (developer->integer > 1)` (master server-list dump) | MATCH |
| Scope: does NOT change forwarding behavior (diagnostics only) | all use-sites are `Sys_DPrintf`/`Sys_Printf` debug-print gates; no use-site mutates peer/forwarding state | (no enforcing line alters forwarding -- every read is a print gate; verified by exhaustive grep of all `developer` reads) | MATCH |
| Default: 0 | `src/main.c:126` (registration; WI-2) | `developer = Cvar_Get("developer", "0", 0);` | MATCH |
| Set by: server config (registered flags `0`; NOT `CVAR_SERVERINFO`, no vote/command setter) | `src/main.c:126` (flags arg `0`) | `Cvar_Get("developer", "0", 0)` (third arg `0` = no flags) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user-facing `description` per D20: every file:line cite, the C identifiers (`Sys_DPrintf`, `Sys_Printf`, `Cvar_Get`, `->integer`), the `flags 0` reasoning, and the internal note that `developer->integer > 1` is the exact threshold for the extra-verbose tier. The user doc states the observable consequence ("prints even more detail") and spells the enum (0 / 1 / 2+) without naming the `> 1` comparison. No cross-engine consequence (this is a proxy-local console-logging switch) -> no `See also:` line. None of the three SR-5 concept-note candidates (masters registration, parse_delay/tick_time streaming, qtv_password auth) is touched by a pure debug-verbosity knob -> no breadcrumb.

## Rationale

Cold-synth from fully-legible use-sites. `developer` is a graduated debug-verbosity level, not a boolean feature switch. The load-bearing gate is `Sys_DPrintf` (`src/sys.c:151-163`): it early-returns and prints nothing when `developer` is 0 or unset, and prints the formatted debug line otherwise. Because nearly every diagnostic message in the proxy is emitted through `Sys_DPrintf` (peer add/drop, challenge issue, protocol/version rejects, master-server traffic, whitelist drops, UDP init, etc.), setting `developer` to 1 turns on the whole class of internal debug output at once. Two sites gate directly on `developer->integer` rather than through the wrapper -- `src/clc.c:142` (dump raw received connectionless packet) and `src/svc.c:114` (challenge issued) -- which is why "debug output" rather than "only the Sys_DPrintf lines" is the honest description. Three sites add a second tier at `developer->integer > 1` (`src/ban.c:77` per-ban logging, `src/query.c:249` full heartbeat-string dump, `src/query.c:319` per-server master-list dump), so 2-or-higher is genuinely more verbose than 1; this is the exact threshold and is traced, not inferred from the name. No `developer` read anywhere mutates forwarding or peer state -- every read is a print gate -- so the "does not change how the proxy forwards clients" scope clause is enforce-traced by the absence of any non-print consumer across the exhaustive grep (WI-1). Registered default is the literal `"0"` at `src/main.c:126` (WI-2: read from the `Cvar_Get` literal). Flags arg is `0` -> no `CVAR_SERVERINFO` (verified: it is the ONLY one of the main.c:126-133 block registered without `CVAR_SERVERINFO`), no vote/command setter -> `Set by: server config`. No C2 conflict (no shipped-doc candidate; example config does not set it). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/comparison or to the verified absence of a non-print consumer; no clause rests on the cvar name, an enum, or a string.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "developer",
  "type": "cvar",
  "description": "Controls how much diagnostic output the proxy prints to its console. At 0 the proxy runs quietly and prints only normal status messages. Raising it turns on internal debug logging -- per-connection events, challenge and protocol handling, master-server traffic, and dropped or banned addresses. A higher value prints even more detail. Intended for troubleshooting; it does not change how the proxy forwards clients.\n\n0 = off (no debug output). 1 = debug output. 2 or higher = extra-verbose output.\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/main.c:126 (Cvar_Get(\"developer\",\"0\",0)), no shipped-doc candidate, example config does not set it -> nothing to affirm; use-sites fully source-legible so synthesize. Graduated debug-verbosity level, not a boolean. Clauses->cites: controls how much diagnostic/debug output prints -> central gate Sys_DPrintf src/sys.c:151-163 (if (!developer || !developer->integer) return; guarding Sys_Printf); OFF-state 0=quiet -> src/sys.c:156-157 early return; polarity nonzero=on via ->integer truthiness at :156; the broad classes of debug logging (peer add/drop, challenge, protocol reject, master traffic, whitelist/ban) all route through Sys_DPrintf -> :156 gate (e.g. src/peer.c:162,179, src/svc.c:116,151,161, src/query.c:282,286,308, src/whitelist.c:35,41); two direct nonzero gates not via wrapper -> src/clc.c:142-144 (raw received packet dump) and src/svc.c:114 (challenge issued), hence 'debug output' not just 'the Sys_DPrintf lines'; extra-verbose >=2 tier -> three sites gated on developer->integer > 1: src/ban.c:77 (per-ban log), src/query.c:249 (heartbeat-string dump), src/query.c:319 (master-list dump) -- exact threshold traced, not name-inferred; scope 'does not change forwarding' -> exhaustive grep of all developer reads shows every read is a print gate, no read mutates peer/forwarding state (clause enforced by verified absence of a non-print consumer, WI-1); Default 0 (WI-2, registered literal) -> src/main.c:126; Set-by server config -> flags arg 0 (the only one of the main.c:126-133 block without CVAR_SERVERINFO), no vote/command setter. No clause rests on name/enum/string. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). Grading: synthesized, high confidence, every clause TRACED-CLEAN. No SR-5 concept-note breadcrumb (pure debug-verbosity knob does not touch masters/streaming/auth candidates).",
  "description_proposed": null
}
```
