# describe-fill-synthesis ledger -- qwfwd `banip`

- **Project:** qwfwd
- **Knob:** `banip` (command)
- **Handler / registration:** handler `SV_Cmd_Banip_f` (`src/ban.c:399-453`); registered `Cmd_AddCommand("banip", SV_Cmd_Banip_f)` at `src/ban.c:515` inside `Ban_Init` (`src/ban.c:506`).
- **Anchor version:** `1.40-dev` (per mother ledger; `qwfwd.h:118` `QWFWD_VERSION_SHORT`).
- **Mechanical candidate:** none (cold-synth). The file header block (`src/ban.c:5-34`) documents the OLD `addip/removeip/listip/writeip/filterban` family, NOT `banip`; it is not a candidate for this command and `filterban` is dead (commented out, `src/ban.c:59`/`:508`).
- **Suspect-pool member:** FALSE (per brief; L1 row confirmed live for project=qwfwd, type=command).
- **Verdict:** `synthesized` (origin `synthesized`) -- behavior fully source-legible; every asserted clause enforce-traced to its enforcing line.
- **Confidence:** high

## Halt verdict

```
qwfwd:banip: synthesized -- cold-synth; adds a timed IP ban to the proxy's filter list (same store as addip), arg shape <ip> <time+unit>, time clamped 0-999, unit s/m/h/d mandatory, refuses ip already on a "safe" filter, then persists the list to disk -- origin=synthesized ref=src/ban.c:399 anchor=1.40-dev
```

## Final description (user-facing, D20 shape)

> Bans an IP address from connecting to the proxy for a set length of time. The address is added to the proxy's connection filter list as a ban entry; while it is on the list, connection attempts from a matching address are dropped. Refuses to ban an address that is already marked as "safe" on the list. After adding the ban, the updated filter list is written to disk so it survives a restart.
>
> banip <ip> <time> = ban <ip> for the given duration.
> <ip> = a dotted IPv4 address; trailing octets left off match any value (for example 192.246.40 matches the whole 192.246.40.* range).
> <time> = a whole number 0-999 followed by a unit: s = seconds, m = minutes, h = hours, d = days. The unit is required; values above 999 are clamped to 999.
>
> Set by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.

## Read use-sites (WI-1 wide read -- whole src/ tree)

| Site | file:line | Observable admin-facing behavior it controls |
|---|---|---|
| Registration | `src/ban.c:515` | binds the name `banip` to handler `SV_Cmd_Banip_f` in the flat command table |
| Handler | `src/ban.c:399-453` | parses args, validates, computes duration, appends a ban via the buffered `addip` + `writeip` commands |
| Arg-count gate | `src/ban.c:407-412` | `< 3` args -> prints usage `banip <ip> <time<s m h d>>`, returns |
| IP parse | `src/ban.c:414-418` (`StringToFilter` `src/ban.c:95-135`) | bad IP -> "ban: bad ip address" and returns |
| Safe-filter guard | `src/ban.c:420-424` (`SV_CanAddBan` `src/ban.c:377-389`) | if a matching "safe" entry exists -> "ban: can't ban such ip" and returns |
| Time parse + unit | `src/ban.c:426-445` | requires `<int><single-char-unit>`; clamps int to 0..999 via `bound`; converts s/m/h/d to seconds |
| Effect (add + persist) | `src/ban.c:447-452` | buffers `addip <ip> ban +<seconds>` then `writeip` -> adds a ban entry and saves the list file |
| Shared store | `ipfilters[]`/`numipfilters` `src/ban.c:56-57`; `addip` handler `SV_AddIP_f` `src/ban.c:142-196` | the same array used by `addip`/`removeip`/`listip`/`writeip`; ban entries are `ipft_ban` type |
| Enforcement (the ban actually blocking) | `SV_IsBanned` `src/ban.c:66-87`, called at connect `src/peer.c:48`, `:255`, `:326` | a connect from an address matching an `ipft_ban` entry is dropped |
| Command dispatch | `Cmd_ExecuteString` `src/cmd.c:869-913` | flat table, no access-class check; fed only by stdin (`src/sys.c:268`) |

## D5 rubric check (Step 3)

Cold-synth: no trailing comment / mechanical candidate for `banip` (the header block documents the older `addip` family, not this command). The handler is fully source-legible -> SYNTHESIZE. Rubric: (1) admin-observable WHAT -- it bans an IP for a duration and the ban then blocks connects; (2) not a name restatement -- spells out the arg shape, the safe-filter refusal, and the disk-persist side effect that the name alone does not convey; (3) units/enums spelled out (s/m/h/d, 0-999 clamp, octet-omission wildcard); (4) mechanism only, no recommended value; (5) self-contained. All five hold.

## Per-clause enforce-trace table (B1)

Sites span the whole `src/` tree at anchor `1.40-dev`.

| Clause (asserted in `description`) | Enforcing file:line | Verbatim snippet | MATCH/MISMATCH/UNTRACEABLE |
|---|---|---|---|
| Adds a ban for a set length of time (timed, not permanent here) | `src/ban.c:447-451` | `snprintf(tmp_str, ..., "addip %i.%i.%i.%i ban %s%.0lf\n", b[0],b[1],b[2],b[3], d ? "+" : "", d);` then `Cbuf_AddText(tmp_str);` -- the `+<d>` form is the relative-expiry path | MATCH |
| Stored on the proxy connection filter list (same store as addip) | `src/ban.c:451` -> `SV_AddIP_f` `src/ban.c:142-196` writes `ipfilters[]` (`src/ban.c:195`) | `Cbuf_AddText(tmp_str)` issues `addip ...`; `SV_AddIP_f` ends `ipfilters[i] = f;` into the shared `static ipfilter_t ipfilters[MAX_IPFILTERS]` (`src/ban.c:56`) | MATCH |
| While listed, a matching connect is dropped | `SV_IsBanned` `src/ban.c:66-87` called `src/peer.c:48,255,326` | `if ( ipfilters[i].type == ipft_ban && (in & ipfilters[i].mask) == ipfilters[i].compare ) ... return true;` and at peer.c:48 `if (SV_IsBanned(&to)) ... return NULL;` | MATCH |
| Refuses an address already marked "safe" | `src/ban.c:420-424` -> `SV_CanAddBan` `src/ban.c:377-389` | `for (...) if (ipfilters[i].mask==f->mask && ipfilters[i].compare==f->compare && ipfilters[i].type==ipft_safe) return false;` and handler `if (!SV_CanAddBan(&f)) { Sys_Printf("ban: can't ban such ip ..."); return; }` | MATCH |
| After adding, the list is written to disk | `src/ban.c:452` -> `SV_WriteIP_f` `src/ban.c:263-307` | `Cbuf_AddText("writeip\n");`; `SV_WriteIP_f` opens `LISTIP_NAME` (`"qwfwd_listip.cfg"` `src/ban.c:36`) and `fprintf`s `addip ...` lines | MATCH |
| Survives a restart (the saved file is exec'd at init) | `src/ban.c:520` | `Cbuf_InsertText ("exec " LISTIP_NAME "\n");` in `Ban_Init` | MATCH |
| Arg shape `banip <ip> <time>`; `< 3` args is a usage error | `src/ban.c:407-412` | `c = Cmd_Argc (); if (c < 3) { Sys_Printf("usage: %s <ip> <time<s m h d>>\n", Cmd_Argv(0)); return; }` | MATCH |
| `<ip>` dotted IPv4; omitted trailing octets match any value (wildcard) | `StringToFilter` `src/ban.c:95-135` | per-octet parse fills `b[]`; `if (b[i] != 0) m[i] = 255;` and `if (!*s) break;` -> unset octets keep mask 0 = match-any; `f->mask`/`f->compare` set `:131-132` | MATCH |
| `<time>` = `<int><single-char unit>`, unit required | `src/ban.c:429-433` | `if (sscanf(arg2, "%d%s", &t, arg2c) != 2 \|\| strlen(arg2c) != 1) { Sys_Printf("ban: wrong time arg\n"); return; }` (requires both an int and exactly one trailing char) | MATCH |
| Value clamped to 0-999 | `src/ban.c:435` | `d = t = bound(0, t, 999);` (`bound` `src/qwfwd.h:370` clamps a into [b,c]) | MATCH |
| Units s/m/h/d -> seconds | `src/ban.c:436-445` | `case 's': break; case 'm': d *= 60; break; case 'h': d *= 60*60; break; case 'd': d *= 60*60*24; break; default: ... "ban: wrong time arg" ... return;` | MATCH |
| Set by: proxy console only; no remote/rcon path | dispatch `src/cmd.c:869-913` fed by stdin `src/sys.c:263-332`; rcon absent `src/cmd.c:1008-1023` (commented out), `src/svc.c:464-465` | `Cmd_ExecuteString` has no access check; `Sys_ReadSTDIN` gated `if (!isatty(STDIN)...) return;` -> input is the local console; `Cmd_RconCommand` is inside `/* ... */`; svc.c comment "we do not have own rcon command, we forward it to the server" | MATCH |

## D20 split note

Routed to `description_reasoning` / this ledger, kept OUT of `description`: every file:line, the C identifiers (`SV_Cmd_Banip_f`, `StringToFilter`, `SV_CanAddBan`, `ipfilters`, `ipft_ban`/`ipft_safe`, `Cbuf_AddText`, `bound`, `Cmd_Argc`), the `addip ... +<d>` internal command shape, and the `writeip` mechanism name. The user doc says "added to the connection filter list as a ban entry", "written to disk so it survives a restart", and describes the arg shape in plain terms. The "same store as addip" fact is stated in admin-observable language ("the proxy's connection filter list") because it IS action-relevant -- an operator who used `addip`/`listip` needs to know `banip` adds to that same list and shows up in `banlist`/`listip` -- meeting the D20 "inline only if action-changing" bar; the internal array name stays in reasoning. No cross-engine `See also:` warranted (this is a self-contained proxy-local mechanism; the header comment's mvdsv lineage is provenance, not user-doc).

## Rationale

Cold-synth from a fully-legible handler. `banip` is a convenience wrapper that ADDS a timed ban: it validates the IP (`StringToFilter`), rejects the add if a matching `safe` entry exists (`SV_CanAddBan`), parses a mandatory `<int><unit>` duration (clamped 0..999 by `bound`, unit s/m/h/d converted to seconds), then -- crucially -- it does not write `ipfilters[]` directly. Instead it buffers two text commands: `addip <ip> ban +<seconds>` and `writeip` (`src/ban.c:450-452`). So `banip` and `addip` share the SAME store: `addip`'s handler `SV_AddIP_f` (`src/ban.c:142-196`) is what actually appends to the single `static ipfilter_t ipfilters[MAX_IPFILTERS]` array (`src/ban.c:56`), and `writeip` dumps that array to `qwfwd_listip.cfg`. The `+` prefix on the seconds makes it a relative expiry (`SV_AddIP_f` `src/ban.c:170-176` treats a leading `+` as "ban for N seconds from now"). The ban only BLOCKS via `SV_IsBanned` (`src/ban.c:66-87`), which is called at three connect sites in `peer.c` and matches only `ipft_ban` entries -- so a `safe` entry never blocks, which is why `banip` refuses to overwrite one. The wildcard semantics (omitted trailing octets match any value) come from `StringToFilter`: an octet left at 0 keeps its mask byte at 0, so `(in & mask) == compare` ignores it; this matches the header block's "192.246.40" class-C example, but I traced it to the parser, not the comment. Access: the command interpreter `Cmd_ExecuteString` (`src/cmd.c:869`) is a flat hash table with NO access-class flags (QWFWD has no `CF_*`/rcon-permission system); its only feed is `Sys_ReadSTDIN` (`src/sys.c:263`), which returns immediately unless STDIN/STDOUT are a TTY -- i.e. the local proxy console. The `Cmd_RconCommand` routine is entirely commented out (`src/cmd.c:1008-1023`) and `svc.c:464-465` states the proxy forwards `rcon` to the backend server rather than executing it -- so there is no remote path to `banip`. Hence `Set by: proxy server console`, traced to dispatch + input source, not inferred from the name. No C2 conflict (no shipped-doc candidate). `description_provenance` stays `null` (cold-synth; operator clarification 2026-05-30). SR-5: no concept-note breadcrumb -- the ban family does not touch the masters-registration / MVD-streaming / qtv_password-auth candidates. Self-classification: TRACED-CLEAN -- every clause maps to an enforcing branch/assignment/call (incl. the callee follow into `SV_AddIP_f`, `SV_CanAddBan`, `SV_IsBanned`, `StringToFilter`); no clause rests on the command name or the stale header comment.

## D6Record

```json
{
  "project": "qwfwd",
  "knob": "banip",
  "type": "command",
  "description": "Bans an IP address from connecting to the proxy for a set length of time. The address is added to the proxy's connection filter list as a ban entry; while it is on the list, connection attempts from a matching address are dropped. Refuses to ban an address that is already marked as \"safe\" on the list. After adding the ban, the updated filter list is written to disk so it survives a restart.\n\nbanip <ip> <time> = ban <ip> for the given duration.\n<ip> = a dotted IPv4 address; trailing octets left off match any value (for example 192.246.40 matches the whole 192.246.40.* range).\n<time> = a whole number 0-999 followed by a unit: s = seconds, m = minutes, h = hours, d = days. The unit is required; values above 999 are clamped to 999.\n\nSet by: proxy server console (the operator at the running proxy). The proxy has no rcon command of its own, so this cannot be issued remotely.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.40-dev",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth, no trailing comment/candidate for banip (the ban.c:5-34 header documents the older addip family + dead filterban, not this command) -> synthesize. Handler SV_Cmd_Banip_f src/ban.c:399-453. Clauses->cites: adds a TIMED ban -> ban.c:450-451 builds 'addip <ip> ban +<d>' (the '+' = relative expiry, consumed by SV_AddIP_f ban.c:170-176); same store as addip -> banip does NOT write ipfilters[] directly, it Cbuf_AddText('addip...') ban.c:451 and SV_AddIP_f ban.c:142-196 appends to the single static ipfilter_t ipfilters[MAX_IPFILTERS] ban.c:56 (so banip/addip/listip/banlist all share one array); blocks while listed -> SV_IsBanned ban.c:66-87 (matches only ipft_ban) called at connect peer.c:48,255,326; refuses already-'safe' ip -> SV_CanAddBan ban.c:377-389 returns false on a matching ipft_safe entry, handler ban.c:420-424 prints 'can't ban such ip' and returns; writes to disk -> Cbuf_AddText('writeip') ban.c:452 -> SV_WriteIP_f ban.c:263-307 dumps to LISTIP_NAME 'qwfwd_listip.cfg' ban.c:36; survives restart -> Ban_Init execs that file ban.c:520; arg shape & <3 usage -> ban.c:407-412; ip wildcard (omitted octets match any) -> StringToFilter ban.c:95-135 leaves mask byte 0 for a 0 octet so (in&mask)==compare ignores it (traced to parser, NOT the header comment's 192.246.40 example); time = <int><single unit char> mandatory -> ban.c:429-433 sscanf '%d%s' !=2 || strlen!=1 rejects; clamp 0..999 -> ban.c:435 bound(0,t,999) (bound qwfwd.h:370); s/m/h/d->seconds -> ban.c:436-445. Set-by proxy console only: dispatch Cmd_ExecuteString cmd.c:869-913 is a flat hash table with NO access-class flags (QWFWD has no CF_*/rcon-perm system), fed only by Sys_ReadSTDIN sys.c:263-332 which returns unless isatty(STDIN)&&isatty(STDOUT) i.e. the local console; Cmd_RconCommand cmd.c:1008-1023 is entirely commented out and svc.c:464-465 'we do not have own rcon command, we forward it to the server' -> no remote path. Traced to dispatch+input source, not the name. No C2 conflict. provenance=null (cold-synth, operator 2026-05-30). No SR-5 breadcrumb (ban family != masters/streaming/auth candidates). Self-classify: TRACED-CLEAN, every clause maps to an enforcing branch/assignment/call incl. callee-follow into SV_AddIP_f/SV_CanAddBan/SV_IsBanned/StringToFilter.",
  "description_proposed": null
}
```
