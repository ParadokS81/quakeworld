# describe-fill-synthesis ledger -- qwfwd `addip`

- **Project:** qwfwd
- **Knob:** `addip` (command)
- **Handler / registration:** handler `SV_AddIP_f` (`src/ban.c:142-196`); registered `Cmd_AddCommand("addip", SV_AddIP_f)` at `src/ban.c:510` (inside `Ban_Init`, `src/ban.c:506-522`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth -- the only prose near the handler is the file-top block comment `src/ban.c:5-34`, which is the upstream mvdsv-derived doc text, NOT a trailing register-site comment and NOT a seed; admissible HINT only, and it is partly stale -- see "Stale-comment finding" below).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:addip: synthesized -- cold-synth; adds an IP/subnet entry to the proxy's packet-filter list (the list SV_IsBanned consults to reject connections); args = <ip> [ban|safe] [time], trailing octets wildcard a subnet, time absent=permanent / +N=N secs from now / bare N=absolute epoch secs, type 'safe' marks protected-from-banip (not itself a ban); Set by server config / command line (no rcon, no access check) -- origin=synthesized ref=src/ban.c:195 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Adds an address to the proxy's packet-filter list. A connecting client whose address matches a `ban` entry is refused. The address is given in dotted form, and any trailing octets you leave off act as wildcards, so `addip 192.246.40` covers that whole class-C range.
>
> addip <ip> [ban|safe] [time] = add <ip> to the filter list.
> [ban|safe] = entry type. `ban` (the default) refuses matching clients. `safe` instead marks the address as protected, so the `banip` command will not ban it; a `safe` entry by itself never refuses anyone.
> [time] = how long the entry lasts. Omit it for a permanent entry. `+N` expires N seconds from now. A bare number is an absolute expiry as a Unix timestamp (seconds since 1970). Expired entries are dropped automatically.
>
> The filter list is held in memory and is not saved automatically; use `writeip` to persist it. Adding the same address again replaces the existing entry rather than duplicating it; the list holds at most 1024 entries.
> Set by: server config / command line.

## Read use-sites (WI-1 wide read)

Tree-wide grep (`addip` / `SV_AddIP_f` / `StringToFilter` / `ipfilters` / `numipfilters` / `MAX_IPFILTERS` / `ipft_ban` / `ipft_safe` / `SV_IsBanned`) confirms the entire IP-filter subsystem lives in `src/ban.c`; the only references outside it are the forward-decl `void Ban_Init(void);` (`src/qwfwd.h:461`) and the `Ban_Init()` call (`src/main.c:147`). All sites below at anchor `1.40-dev`.

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:510` | `Cmd_AddCommand("addip", SV_AddIP_f)` -- binds the command name to the handler |
| Handler body | `src/ban.c:142-196` | the whole add operation |
| arg1 parse + reject | `src/ban.c:151-155` | `StringToFilter(Cmd_Argv(1),&f)`; bad address or `f.compare==0` (i.e. 0.0.0.0) -> "Bad filter address", no entry added |
| Dotted-form / wildcard parse | `src/ban.c:95-135` (`StringToFilter`) | reads up to 4 numeric octets; for each octet, mask byte = 255 only if the octet is non-zero (`:123-124`), so omitted/zero trailing octets have mask 0 = wildcard (whole-subnet match) |
| arg2 type | `src/ban.c:157-165` | empty or `"ban"` -> `ipft_ban`; `"safe"` -> `ipft_safe`; anything else -> "Wrong filter type", no entry added |
| arg3 time | `src/ban.c:167-176` | `+`-prefixed -> relative (added to current time); otherwise the bare number is treated as an absolute epoch time; no/zero time -> `t=0` = permanent |
| Replace-or-append + cap | `src/ban.c:181-193` | scans for a free/duplicate slot (`compare==0xffffffff` OR same mask+compare `:182`); if none and `numipfilters==MAX_IPFILTERS` -> "IP filter list is full"; else append |
| Store entry | `src/ban.c:195` | `ipfilters[i] = f;` -- the authoritative line that records the new filter |
| Cap macro | `src/ban.c:38` | `#define MAX_IPFILTERS 1024` |
| Enforcement (consumer) | `src/ban.c:66-87` (`SV_IsBanned`) | a connecting `addr` with `type==ipft_ban` AND `(in & mask)==compare` -> returns true (refused); `ipft_safe` entries are NOT matched here |
| `safe` real effect | `src/ban.c:377-388` (`SV_CanAddBan`) | an existing `ipft_safe` filter for an address makes `banip` refuse to ban it (`return false; // can't add filter f because present "safe" filter`) |
| Auto-expiry | `src/ban.c:488-504` (`SV_CleanBansIPList`, called each main-loop iter `src/main.c:173`) | entries with non-zero `time <= now` are removed |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment at the register site `src/ban.c:510`; the file-top block comment is upstream doc prose, not a register-site comment, and is partly stale (see finding) -> nothing to affirm, but D5-amendment requires evaluation anyway. Use-sites fully source-legible -> SYNTHESIZE. Rubric: (1) states admin-observable WHAT (adds an address to the packet-filter list; matching clients are refused); (2) not a name restatement (spells the arg grammar, the wildcard-octet subnet behavior, the ban/safe distinction, the time forms, the in-memory/not-saved caveat); (3) args + their enum/forms spelled out (`ban`/`safe`, the three time forms, the wildcard rule); (4) mechanism only, no recommended value; (5) self-contained. All five hold. It is a COMMAND -> "Default:" omitted (no meaningful no-arg default; with no args `Cmd_Argv(1)` is empty -> "Bad filter address", a no-op).

## Per-clause enforce-trace table (B1)

All sites in `src/ban.c` at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Semantic: adds an address to the packet-filter list | `src/ban.c:195` (store) + `:510` (registration) | `ipfilters[i] = f;` ; `Cmd_AddCommand ("addip", SV_AddIP_f);` | MATCH |
| Effect: a connecting client matching a `ban` entry is refused | `src/ban.c:75-81` (`SV_IsBanned`) | `if ( ipfilters[i].type == ipft_ban && (in & ipfilters[i].mask) == ipfilters[i].compare ) { ... return true; }` | MATCH |
| Syntax: arg1 is the IP in dotted form | `src/ban.c:151` -> `:95-135` | `if (!StringToFilter (Cmd_Argv(1), &f) || f.compare == 0)`; `StringToFilter` walks 4 dotted octets | MATCH |
| Wildcard: omitted/trailing-zero octets match any value (subnet) | `src/ban.c:123-124` (mask byte set) | `if (b[i] != 0) m[i] = 255;` -- octets left at 0 keep mask byte 0 = match any | MATCH |
| Reject: 0.0.0.0 / bad address adds nothing | `src/ban.c:151-155` | `... || f.compare == 0) { Sys_Printf("Bad filter address: %s\n", Cmd_Argv(1)); return; }` | MATCH |
| Enum: type arg2 -- empty/`ban` => ban (default), `safe` => safe, else error | `src/ban.c:157-165` | `if ( !s[0] || !strcmp(s, "ban")) ipft = ipft_ban; else if (!strcmp(s, "safe")) ipft = ipft_safe; else { Sys_Printf("Wrong filter type ...`; init `ipft = ipft_ban; // default is ban` (`:149`) | MATCH |
| Polarity: a `safe` entry never refuses anyone by itself | `src/ban.c:75` | `if ( ipfilters[i].type == ipft_ban && ...` -- only `ipft_ban` is checked; `ipft_safe` is skipped in the connect check | MATCH |
| Effect: `safe` marks an address protected from the `banip` command | `src/ban.c:384-386` (`SV_CanAddBan`) | `if (ipfilters[i].mask == f->mask && ipfilters[i].compare == f->compare && ipfilters[i].type == ipft_safe) return false; // can't add filter f because present "safe" filter` | MATCH |
| Time: omit => permanent | `src/ban.c:145` (init) + `:178` (assign) | `double t = 0;` ; `f.time = t;` ; permanence honored at `SV_CleanBansIPList` `:495` `if (ipfilters[i].time && ...)` (0 time never expires) | MATCH |
| Time: `+N` => N seconds from now | `src/ban.c:170-175` | `if (*s == '+') s++; else long_time = 0;` then `t = (sscanf(s, "%lf", &t) == 1) ? t + long_time : 0;` (with `long_time = time(NULL)` `:147`) | MATCH |
| Time: bare N => absolute Unix-epoch expiry | `src/ban.c:170-175` (the `else long_time = 0` branch) | comment `:173` `// "addip 127.0.0.1 ban 1234567" will ban for some seconds since 00:00:00 GMT, January 1, 1970`; with `long_time=0`, `t = N` (an absolute epoch value) | MATCH |
| Auto-drop of expired entries | `src/ban.c:495-498` (`SV_CleanBansIPList`) called `src/main.c:173` | `if (ipfilters[i].time && ipfilters[i].time <= long_time) { SV_RemoveBansIPFilter (i); }` | MATCH |
| In-memory / not auto-saved; use `writeip` to persist | file-top comment `src/ban.c:24` corroborates; enforced by ABSENCE of any save in the add path + presence of `SV_WriteIP_f` `:263` | no `fopen`/write in `SV_AddIP_f`; persistence only via `writeip`/`SV_WriteIP_f` | MATCH (absence-of-save + dedicated writer) |
| Replace-not-duplicate on re-add | `src/ban.c:181-193` | loop breaks on `ipfilters[i].mask == f.mask && ipfilters[i].compare == f.compare` (same addr) -> reuses that slot; only `numipfilters++` when no match (`i == numipfilters`) | MATCH |
| Cap: at most 1024 entries | `src/ban.c:38` + `:187-191` | `#define MAX_IPFILTERS 1024`; `if (numipfilters == MAX_IPFILTERS) { Sys_Printf("IP filter list is full\n"); return; }` | MATCH |
| Set by: server config / command line (no rcon, no access check) | `src/cmd.c:869-912` (`Cmd_ExecuteString`, no access gate) + entry sources `src/main.c:142,147,155,520` | dispatch loop calls `cmd->function ()` with no `CF_`/permission check; commands enter only via `exec` of cfg files and `Cmd_StuffCmds` (command line) | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of the user doc per D20: every file:line cite; the C identifiers (`SV_AddIP_f`, `StringToFilter`, `ipfilters`, `numipfilters`, `MAX_IPFILTERS`, `ipft_ban`/`ipft_safe`, `SV_IsBanned`, `SV_CanAddBan`, `SV_CleanBansIPList`, `Cmd_Argv`, `Cmd_ExecuteString`); the mask/compare bit mechanism; the `0xffffffff` free-slot sentinel; the `sscanf`/`time(NULL)` internals. The user doc states only the admin-observable WHAT (adds a filter; matching clients refused), the arg grammar (`<ip> [ban|safe] [time]`), the wildcard-octet subnet rule, the ban-vs-safe distinction, the three time forms, the not-auto-saved caveat + `writeip`, the replace-on-re-add behavior, the 1024 cap, and Set-by.

The cross-engine note (this whole filter mechanism is "boldly stolen from mvdsv" per `src/ban.c:1`, so qwfwd's `addip` mirrors mvdsv's `addip`) is provenance trivia -- it does NOT change how an admin uses the command on this proxy, so per D20 it is kept out of the description (no `See also:` since the MVDSV `addip` is not a shipped L1 See-also anchor in this arc).

## Stale-comment finding (file-top block comment vs code)

The upstream block comment `src/ban.c:5-34` is an admissible HINT but is partly STALE vs the qwfwd code -- it was NOT used as a citation; every clause is traced to live code:

1. The comment documents `filterban <0 or 1>` (`:26-31`) as a toggle for allow-list vs deny-list mode. In qwfwd that cvar is **commented out** (`//cvar_t filterban = ...` `:59`; `//Cvar_Register(&filterban);` `:508`) and `SV_IsBanned` hard-codes deny-list behavior (`return true;` `:81` / `return false;` `:86`, with the `filterban.value` lines commented out `:80,:85`). So `filterban` does NOT exist in qwfwd -- correctly NOT mentioned in the `addip` description.
2. The comment (`:24`) says `writeip` dumps to `listip.cfg`; the actual file is `qwfwd_listip.cfg` (`#define LISTIP_NAME "qwfwd_listip.cfg"` `:36`). The `addip` description does not name the file (that is `writeip`'s detail); flagged here for the sibling `writeip` ledger.
3. The comment block predates the `ban`/`safe` type arg and the time arg -- it documents only `addip <ip>`. Those args ARE in the live qwfwd handler (`:157-176`), so the description spells them from code, not the comment.

These are notes only; no clause in the description rests on the stale comment.

## Rationale

Cold-synth from fully-legible use-sites. `addip` is the writer for the proxy's in-memory packet-filter list (`ipfilters[]`, `src/ban.c:56`). The handler `SV_AddIP_f` (`:142-196`) parses arg1 as a dotted address via `StringToFilter` (`:95-135`), where any octet left at zero keeps a zero mask byte (`:123-124`) so trailing-omitted octets wildcard a whole subnet (the file comment's "192.246.40" class-C example, verified against the mask code). arg2 selects the entry type -- empty/`ban` => `ipft_ban` (default, `:149,:158-159`), `safe` => `ipft_safe` (`:160-161`), anything else rejected (`:162-164`). arg3 sets expiry: `+N` is relative to `time(NULL)` (`:170-175`), a bare number is an absolute Unix-epoch value (`:173` comment + the `long_time=0` branch), and no/zero time is permanent (honored by `SV_CleanBansIPList` `:495`, which only expires non-zero times). The new filter is stored at `:195`; re-adding the same mask+compare reuses the slot rather than duplicating (`:181-193`), and the list is capped at `MAX_IPFILTERS = 1024` (`:38,:187-191`).

The actual ban enforcement lives in the consumer `SV_IsBanned` (`:66-87`): a connecting address is refused only when a matching entry has `type == ipft_ban` (`:75`). This is why a `safe` entry "never refuses anyone by itself" -- it is skipped in the connect check. The `safe` type's real purpose surfaces in `SV_CanAddBan` (`:377-388`): an existing `safe` filter blocks the separate `banip` command from banning that address. Both halves are stated in admin-observable terms in the description.

WI-2 access trace: qwfwd has NO `CF_`-style command-access flags and NO rcon. `Cmd_ExecuteString` (`src/cmd.c:869-912`) dispatches any matched command's function with no permission check. Commands enter the buffer only from `exec` of the config files (`qwfwd.cfg` `src/main.c:142`; `qwfwd_listip.cfg` auto-exec'd by `Ban_Init` `src/ban.c:520`) and from the command line (`Cmd_StuffCmds` `src/main.c:155`). There is no interactive stdin console loop -- the main loop (`src/main.c:160-174`) just drains the buffer. So the honest Set-by is "server config / command line"; there is no remote or player path to infer. This was traced to the dispatch, not inferred from the command name (WI-2).

`description_provenance` stays `null` (cold-synth; no shipped-doc multi-source candidate -- operator clarification 2026-05-30). No C2 conflict (no mechanical candidate; the file-top comment is a HINT whose stale parts are documented above and not relied on). No SR-5 breadcrumb: the IP-filter subsystem is not one of the three identified concept-note candidates (master-server registration / MVD-streaming-parse_delay / qtv_password auth).

Self-classification: TRACED-CLEAN -- every clause maps to an enforcing parse/branch/compare/store line (or, for "not auto-saved", to the verifiable absence of a save in the add path plus the dedicated `writeip` writer); no clause rests on the command name, an enum name, a printed string, or the stale file comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "addip",
  "type": "command",
  "description": "Adds an address to the proxy's packet-filter list. A connecting client whose address matches a `ban` entry is refused. The address is given in dotted form, and any trailing octets you leave off act as wildcards, so `addip 192.246.40` covers that whole class-C range.\n\naddip <ip> [ban|safe] [time] = add <ip> to the filter list.\n[ban|safe] = entry type. `ban` (the default) refuses matching clients. `safe` instead marks the address as protected, so the `banip` command will not ban it; a `safe` entry by itself never refuses anyone.\n[time] = how long the entry lasts. Omit it for a permanent entry. `+N` expires N seconds from now. A bare number is an absolute expiry as a Unix timestamp (seconds since 1970). Expired entries are dropped automatically.\n\nThe filter list is held in memory and is not saved automatically; use `writeip` to persist it. Adding the same address again replaces the existing entry rather than duplicating it; the list holds at most 1024 entries.\nSet by: server config / command line.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment at registration src/ban.c:510 (Cmd_AddCommand(\"addip\", SV_AddIP_f); handler SV_AddIP_f src/ban.c:142-196); the file-top block comment src/ban.c:5-34 is upstream mvdsv-derived doc prose, an admissible HINT only and partly stale -> nothing to affirm, synthesize. Tree-wide grep: entire IP-filter subsystem is in src/ban.c (only externals: forward-decl qwfwd.h:461, call main.c:147). Clauses->cites: adds an address to the filter list -> store src/ban.c:195 (ipfilters[i]=f) + reg :510; matching client refused -> SV_IsBanned src/ban.c:75-81 (type==ipft_ban && (in&mask)==compare -> return true); dotted arg1 -> StringToFilter src/ban.c:151,95-135; trailing-omitted octets wildcard a subnet -> src/ban.c:123-124 (mask byte=255 only if octet!=0, so zero octets keep mask 0=match-any), confirms the comment's 192.246.40 class-C example against code; 0.0.0.0/bad rejected -> src/ban.c:151-155 (|| f.compare==0); type arg2 empty/ban=>ipft_ban default, safe=>ipft_safe, else error -> src/ban.c:149,157-165; a safe entry never refuses by itself -> src/ban.c:75 only checks ipft_ban; safe marks protected-from-banip -> SV_CanAddBan src/ban.c:384-386 (existing ipft_safe -> return false 'can't add filter f because present safe filter'); time omit=>permanent -> t=0 src/ban.c:145,178 honored by SV_CleanBansIPList :495 (only non-zero times expire); +N=>N secs from now -> src/ban.c:170-175 (*s=='+' -> t+long_time, long_time=time(NULL) :147); bare N=>absolute epoch -> src/ban.c:170-175 else-branch long_time=0 + comment :173; expired auto-dropped -> SV_CleanBansIPList src/ban.c:495-498 called main.c:173; in-memory/not auto-saved + use writeip -> no save in add path, dedicated SV_WriteIP_f :263 (file comment :24 corroborates); re-add replaces not duplicates -> src/ban.c:181-193 (slot reuse on same mask+compare); cap 1024 -> #define MAX_IPFILTERS 1024 :38 + :187-191. WI-2 Set-by: qwfwd has NO CF_ access flags and NO rcon; Cmd_ExecuteString src/cmd.c:869-912 dispatches with no permission check; commands enter only via exec of cfg files (qwfwd.cfg main.c:142; qwfwd_listip.cfg auto-exec'd by Ban_Init ban.c:520) and command line (Cmd_StuffCmds main.c:155); no interactive stdin loop (main.c:160-174 just drains buffer) -> Set by: server config / command line (traced to dispatch, not name). COMMAND -> Default omitted (no-arg call -> empty Cmd_Argv(1) -> 'Bad filter address' no-op). STALE-COMMENT finding (HINT not relied on): file-top comment documents filterban <0|1> but that cvar is commented out in qwfwd (//cvar_t filterban :59, //Cvar_Register :508) and SV_IsBanned hard-codes deny-list (:80-86 filterban.value lines commented) -> filterban absent, correctly not mentioned; comment says writeip->listip.cfg but actual LISTIP_NAME is qwfwd_listip.cfg (:36, for the writeip ledger); comment predates the ban/safe + time args (spelled from code :157-176). Cross-engine note (subsystem 'boldly stolen from mvdsv' ban.c:1) is provenance trivia, not action-changing -> out of description, no See-also (mvdsv addip not an arc See-also anchor). provenance=null (cold-synth, operator 2026-05-30). No C2 conflict. No SR-5 breadcrumb (IP-filter not among the 3 candidates). Grading: synthesized, high confidence, every clause TRACED-CLEAN.",
  "description_proposed": null
}
```
