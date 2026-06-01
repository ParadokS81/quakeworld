# describe-fill-synthesis ledger -- mvdsv `addip`

- **project:** mvdsv
- **knob:** `addip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:addip: synthesized -- adds IP to ban/safe filter; banned IPs refused at SV_FilterPacket; admin-only; KTX consumes not overrides -- origin=synthesized ref=src/sv_main.c:2248 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Adds an IP address to the server's connection filter list. By default the address is banned: any connection from a matching IP is refused with a "banned" message and its packets are dropped.
>
> addip <ip> [type] [time] = filter the given address.
>   <ip> = a dotted address where any 0 octet is a wildcard (non-zero octets must match exactly). A trailing 0 covers a range -- 198.51.100.0 matches all of 198.51.100.x -- but because a 0 in any position is wild, 10.0.0.5 would match 10.x.x.5, not just that one host.
>   type = ban (default) refuses the address; safe marks it as protected, so the ban / banip commands refuse to ban it.
>   time = how long the ban lasts. A leading + (e.g. +600) means that many seconds from now; a bare number is an absolute Unix timestamp; omitted means no expiry (lasts until removed or the server restarts).
>
> Example: addip 198.51.100.0 ban +3600 -- ban the whole 198.51.100.x range for one hour.
>
> Bans are held in memory and are not saved automatically -- they are lost on restart unless you run writeip (which dumps them to listip.cfg) and exec that file at startup.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (no client path) | src/sv_main.c:3617 + src/sv_user.c:3299 | `Cmd_AddCommand ("addip", SV_AddIP_f);` ; not in `ucmds[]` table | yes |
| adds IP to filter list | src/sv_main.c:2248 | `ipfilters[i] = f;` (numipfilters++ at 2245) | yes |
| IP parse + trailing-0 = wildcard octet | src/sv_main.c:2057 / 2390 | `if (b[i] != 0) m[i] = 255;` ; `(in & ipfilters[i].mask) == ipfilters[i].compare` | yes |
| type ban(default)/safe | src/sv_main.c:2203,2212-2219 | `ipft = ipft_ban; // default is ban` ; `if (!s[0]||!strcmp(s,"ban"))...else if(!strcmp(s,"safe"))` | yes |
| time +N relative vs bare absolute | src/sv_main.c:2223-2228 | `if (*s == '+') s++; else long_time = 0; t = (...)? t + long_time : 0;` | yes |
| ban refuses connection (enforcement) | src/sv_main.c:2390,2997-3000 | `if (ipfilters[i].type == ipft_ban && (in & mask)==compare) return filterban.value;` ; caller `if (SV_FilterPacket()) { SV_SendBan(); continue; }` | yes |
| safe = protected from being banned | src/sv_main.c:2462-2470 | `SV_CanAddBan ... ipfilters[i].type == ipft_safe` | yes |
| omitted time = permanent | src/sv_main.c:2492-2496 | `if (ipfilters[i].time && ipfilters[i].time <= long_time) SV_RemoveBansIPFilter(i);` | yes |
| F-MV1: KTX consumes not overrides | ktx/src/admin.c:98 | `localcmd("addip %s ban +30\n", cl_ip(victim));` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|---|---|---|---|
| C1 | Adds IP to server connection filter list | sv_main.c:2248 | `ipfilters[i] = f;` (into `ipfilters[MAX_IPFILTERS]`, 2011) | MATCH |
| C2 | Default type = ban | sv_main.c:2203,2212-2213 | `ipfiltertype_t ipft = ipft_ban; // default is ban` ; `if ( !s[0] || !strcmp(s,"ban")) ipft = ipft_ban;` | MATCH |
| C3 | Banned connection refused with "banned" message | sv_main.c:2997-3000 -> 2372 | `if (SV_FilterPacket()) { SV_SendBan(); continue; }` ; `strlcat(data, "\nbanned.\n", ...)` | MATCH (gated by `filterban`, default 1) |
| C4 | Its packets are dropped | sv_main.c:2997-3001 ; 1897-1898 | `SV_SendBan(); continue;` (skips packet) ; `if (SV_FilterPacket()) SV_DropClient(client);` | MATCH |
| C5 | Syntax `addip <ip> [type] [time]` | sv_main.c:2205,2211,2221 | argv1=`StringToFilter(Cmd_Argv(1),&f)` ; `s=Cmd_Argv(2)` (type) ; `s=Cmd_Argv(3)` (time) | MATCH |
| C6 | Dotted addr; trailing 0 octet widens (1.2.3.0 -> 1.2.3.x) | sv_main.c:2057-2058,2065-2066 | `if (b[i] != 0) m[i] = 255;` ; `f->mask=*(unsigned*)m; f->compare=*(unsigned*)b;` | MATCH on example; rule is "ANY 0 octet is wildcard", not strictly trailing -- minor imprecision |
| C7 | type=ban refuses the address | sv_main.c:2390-2391 | `if (ipfilters[i].type == ipft_ban && (in & ...mask)==...compare) return (int)filterban.value;` | MATCH |
| C8 | type=safe -> protected, cannot LATER be banned | sv_main.c:2462-2473 (SV_CanAddBan) called ONLY at 2584/2637 (ban/banip), NOT in SV_AddIP_f; dedup 2235-2236 + overwrite 2248 | `if (...&& type==ipft_safe) return false; // can't add filter` -- BUT `SV_AddIP_f` has no `SV_CanAddBan` guard; `addip <ip> ban` overwrites a safe entry via type-agnostic dedup `ipfilters[i]=f` | UNTRACEABLE in addip's own path (narrower/more conditional than implied) |
| C9 | `+N` = N seconds from now | sv_main.c:2223-2228 | `if (*s=='+') s++; ... t = (sscanf(...)==1) ? t+long_time : 0;` with `long_time=time(NULL)` | MATCH |
| C10 | bare number = absolute Unix epoch seconds | sv_main.c:2225-2228 + comment 2226 | `else long_time = 0;` // "...seconds since 00:00:00 GMT, January 1, 1970"; `t = parsed + 0` | MATCH |
| C11 | omitted = permanent (until removed/restart) | sv_main.c:2228 (t=0); 2494 prune-guard; 2437-2438; 1988 | `if (ipfilters[i].time && ipfilters[i].time <= long_time)` (time==0 never expires); else `Con_Printf("permanent")`; "filter lists are not saved and restored" | MATCH |
| C12 | Set by server console / rcon | sv_main.c:3617 | `Cmd_AddCommand("addip", SV_AddIP_f);` (console command, no client CF_ flag; rcon executes server commands) | MATCH |

**V-pass notes:** Oracle confirmed at 1.11-53-g18d0362. 11 of 12 clauses MATCH against enforcing lines. Classification C-NEAR-MISS rests on C8.

C8 (flavour-C near-miss): The clause "safe marks it as protected so it cannot later be banned" is placed inside the addip description's `type=` line, implying choosing `safe` via addip confers ban-immunity. Two-part trace:
(1) addip DOES correctly set the safe type (sv_main.c:2214-2215,2232) -- that half is enforced in addip.
(2) The "cannot later be banned" guarantee is enforced ONLY in SV_CanAddBan (2462-2473), and that function is called ONLY by the separate `ban`/`banip` admin commands (2584, 2637) -- NOT by SV_AddIP_f. Worse, SV_AddIP_f's dedup loop (2235-2236) matches on mask+compare IGNORING type, then overwrites wholesale (`ipfilters[i]=f`, 2248). So `addip 1.2.3.4 safe` followed by `addip 1.2.3.4 ban` silently converts the entry to a ban. The protection is real but NARROWER than implied: it blocks the `ban`/`banip`/`unban` family, not `addip ban` itself. Per the enum, "the real code is narrower / more conditional than implied" = C-NEAR-MISS. Structurally identical to the canonical k_teamoverlay case (clause true of the system but no enforcing read-site on the documented feature's own path).

C6 minor imprecision (does NOT drive the class on its own): StringToFilter (2057-2058) sets the mask byte to 0 (wildcard) for ANY octet whose value is 0, not only trailing ones -- e.g. `1.0.3.4` wildcards the 2nd octet. The proposed "trailing 0 octet" matches the common/documented class-C case and the registration comment's `addip 192.246.40` example, so it is correct for that example but under-describes the general rule. Also note `f.compare == 0` (e.g. `0.0.0.0`, or a leading-0 address) is rejected at 2205 with "Bad filter address".

C3/C4 caveat (FYI, not a defect): refusal/drop is gated by the `filterban` cvar (default "1", registered 2022). SV_FilterPacket (2390-2393) inverts under `filterban 0` -- then only listed addresses are ALLOWED and ban entries become an allow-list. The proposed "By default the address is banned" is literally accurate at the registered default; the inversion is unmentioned but that is acceptable for a default-case user-doc.

C12: addip is a Cmd_AddCommand console command with no client-side CF_ access flag, so "server console / rcon" is the correct access class (rcon dispatches server console commands).

## flags_for_review

- [fyi/cross-mod-override/synthesis] KTX (ktx/src/admin.c:98,113) is a CONSUMER of this engine command: its admin-kick path issues `localcmd("addip %s ban +30\n", cl_ip(victim))` to ban a kicked player for 30 seconds. Not an override of who-may-issue or the effect -- the live behavior is MVDSV's -- but worth a human note that the in-game KTX ban UX is built on top of this command.
- [review/hidden-family/synthesis] The actual block/allow polarity of addip's ban depends on a SEPARATE cvar `filterban` (sv_main.c:2022, default "1"): SV_FilterPacket returns filterban.value on a ban match and !filterban.value otherwise (sv_main.c:2391-2393). At the default (1) a ban-listed IP is blocked; if an admin sets filterban 0 the list inverts into an ALLOW-list (only listed IPs may connect). This inversion is out of scope for the addip user-doc but is a sibling cvar a human reviewer may want documented alongside the addip family.
- [review/contradiction/vpass] C8 over-states 'safe' protection scope. The safe->ban-immunity guarantee (SV_CanAddBan, sv_main.c:2462-2473) is enforced only on the `ban`/`banip` admin commands, NOT on `addip` itself. SV_AddIP_f's dedup (sv_main.c:2235-2236) keys on mask+compare ignoring type and then overwrites with `ipfilters[i]=f` (2248), so `addip <ip> ban` will silently convert a prior `addip <ip> safe` entry into a ban. Recommend hedging C8 to scope the protection to the ban/banip command family, or noting that addip ban bypasses it.
- [fyi/other/vpass] C6 mechanism is 'any 0 octet is a wildcard' (StringToFilter sv_main.c:2057-2058), not strictly 'trailing 0'. The example 1.2.3.0 is correct, but 1.0.3.4 would also wildcard the middle octet. Minor user-doc imprecision; the example itself is accurate.
- [fyi/other/vpass] C3/C4 refusal semantics depend on the `filterban` cvar (default '1', sv_main.c:2022). SV_FilterPacket (2390-2393) inverts the list to an allow-list when filterban is 0. The 'By default banned' framing is accurate at registered defaults but the inversion is unstated.
- [fyi/other/vpass] Off-scope adjacency note (not part of addip but encountered while tracing): an all-zero/leading-zero address is rejected by SV_AddIP_f at sv_main.c:2205 via the `f.compare == 0` guard ('Bad filter address'), so `addip 0.x.x.x` cannot be added. Not asserted by the proposed description; flagged only for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "addip",
  "type": "command",
  "description": "Adds an IP address to the server's connection filter list. By default the address is banned: any connection from a matching IP is refused with a \"banned\" message and its packets are dropped.\n\naddip <ip> [type] [time] = filter the given address.\n  <ip> = a dotted address where any 0 octet is a wildcard (non-zero octets must match exactly). A trailing 0 covers a range -- 198.51.100.0 matches all of 198.51.100.x -- but because a 0 in any position is wild, 10.0.0.5 would match 10.x.x.5, not just that one host.\n  type = ban (default) refuses the address; safe marks it as protected, so the ban / banip commands refuse to ban it.\n  time = how long the ban lasts. A leading + (e.g. +600) means that many seconds from now; a bare number is an absolute Unix timestamp; omitted means no expiry (lasts until removed or the server restarts).\n\nExample: addip 198.51.100.0 ban +3600 -- ban the whole 198.51.100.x range for one hour.\n\nBans are held in memory and are not saved automatically -- they are lost on restart unless you run writeip (which dumps them to listip.cfg) and exec that file at startup.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2248. Admin-only: registered via Cmd_AddCommand only (sv_main.c:3617); NOT present in client ucmds[] (sv_user.c:3299 table grep empty), so no client stringcmd path reaches it -> server console / rcon. Effect (adds to list): SV_AddIP_f stores the parsed filter at ipfilters[i]=f (sv_main.c:2248) and grows numipfilters (2245); duplicate/free-spot reuse loop 2234-2237. Argument shape: StringToFilter(Cmd_Argv(1)) (2205) parses up to 4 dotted decimal octets; a zero octet leaves its mask byte 0 so it is a wildcard (StringToFilter 2057-2058 sets m[i]=255 only when b[i]!=0, and SV_FilterPacket ANDs in&mask 2390) -> trailing-0 octet widens the match. Type arg Cmd_Argv(2): empty or \"ban\"->ipft_ban, \"safe\"->ipft_safe, else error (2211-2219); default ipft_ban (2203). Time arg Cmd_Argv(3): '+' prefix -> t = seconds + current time(NULL) (relative); no '+' -> long_time zeroed so t is the absolute value (absolute epoch) (2221-2229); f.time set 2231; dev usage comments at 2223/2226 corroborate. Ban ENFORCEMENT lives elsewhere: SV_FilterPacket (2382-2393) loops ipfilters and returns filterban.value when an ipft_ban entry matches (in & mask)==compare (2390); called in the packet-receive loop at sv_main.c:2997 where a true result triggers SV_SendBan() (the \"banned.\" message, 2365-2375) and drops the packet via continue (2999-3000). 'safe' does NOT block (2390 tests only ipft_ban); safe entries are consulted by SV_CanAddBan (2462-2470) to refuse banning a protected address -> documented as \"protected so it cannot later be banned.\" Permanent-when-omitted: f.time stays 0 and the timed-expiry sweep SV_RemoveBansIPFilter only removes entries with nonzero time<=now (2492-2496). filterban cvar (default \"1\", 2022) is the inversion knob but is a separate entity, kept out of this user-doc; the observable admin effect of 'addip ... ban' on a default server is refusal, which is what is stated. F-MV1: KTX does NOT override this command -- it is a CONSUMER, calling localcmd(\"addip %s ban +30\\n\", ...) from admin.c:98,113 to ban a kicked player for 30s; live behavior is the MVDSV engine's.",
  "description_proposed": null
}
```
