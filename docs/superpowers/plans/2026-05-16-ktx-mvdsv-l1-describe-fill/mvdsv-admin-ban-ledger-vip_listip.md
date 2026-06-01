# describe-fill-synthesis ledger -- mvdsv `vip_listip`

- **project:** mvdsv
- **knob:** `vip_listip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_listip: synthesized -- admin cmd prints the in-memory VIP spectator list ("VIP list:" then each IP + "level <n>"); no args, no side effects; no KTX override -- origin=synthesized ref=src/sv_main.c:2142 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints the server's current VIP spectator list to the console: each entry's IP address and its priority level.
>
> vip_listip = list the VIP entries. Output begins with "VIP list:" followed by one line per entry showing the address and "level <n>". Takes no arguments.
>
> The address shown is the stored value, so an entry added as a wildcard range may display differently from how it was typed.
>
> Default: none.
> Set by: server console / rcon.
> See also: vip_addip, vip_removeip, vip_writeip.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_main.c:3623 | `Cmd_AddCommand ("vip_listip", SV_ListIPVIP_f);` (absent from ucmds[]) | MATCH |
| header "VIP list:" | src/sv_main.c:2147 | `Con_Printf ("VIP list:\n");` | MATCH |
| iterates all entries | src/sv_main.c:2148 | `for (i=0 ; i<numipvips ; i++)` | MATCH |
| prints stored compare bytes (not typed string) | src/sv_main.c:2150 | `*(unsigned *)b = ipvip[i].compare;` | MATCH |
| prints address + "level <n>" | src/sv_main.c:2151 | `Con_Printf ("%3i.%3i.%3i.%3i   level %d\n", b[0], b[1], b[2], b[3], ipvip[i].level);` | MATCH |
| reads same store used at connect | src/sv_main.c:2730 | `if ( (in & ipvip[i].mask) == ipvip[i].compare) return ipvip[i].level;` | MATCH |
| no KTX override | ktx/src (grep) | empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| 1 | Prints the VIP spectator list to console, each entry = IP + priority level | src/sv_main.c:2148-2151 | `for (i=0;i<numipvips;i++){ *(unsigned*)b = ipvip[i].compare; Con_Printf("%3i.%3i.%3i.%3i   level %d\n", b[0],b[1],b[2],b[3], ipvip[i].level); }` | MATCH |
| 1b | "VIP spectator" framing (consumer-confirmed, not inferred from a string) | src/sv_main.c:2722-2731 -> 1046 -> 1204 | `SV_VIPbyIP` returns `ipvip[i].level`; feeds `vip=SV_VIPbyIP(net_from)`; gates `SpectatorCanConnect` vs `maxvip_spectators` | MATCH |
| 2 | Output begins with "VIP list:" | src/sv_main.c:2147 | `Con_Printf ("VIP list:\n");` | MATCH |
| 2b | one line per entry showing the address and "level <n>" | src/sv_main.c:2151 | `Con_Printf ("%3i.%3i.%3i.%3i   level %d\n", b[0],b[1],b[2],b[3], ipvip[i].level);` | MATCH |
| 3a | addresses shown are the stored `compare` values | src/sv_main.c:2150 | `*(unsigned *)b = ipvip[i].compare;` | MATCH |
| 3b | "(the network-order bytes)" | src/sv_main.c:2066 vs 2727 | store: `f->compare = *(unsigned *)b;` (b[i]=typed octet i); matched at runtime vs `in = *(unsigned *)adr.ip` (wire/network bytes) in SV_VIPbyIP -> compare IS in network byte order | MATCH |
| 3c | a masked range "may display differently from how it was typed" (hedged) | src/sv_main.c:2057-2063 | `if (b[i]!=0) m[i]=255; ... if(!*s) break; s++;` -- partial input (e.g. `192.246`) early-breaks, leaving b[2..3]=0, so list prints `192.246.0.0`; also octet>255 truncates via `byte b[i]=Q_atoi(num)` | MATCH (conditional; "may" correctly hedges) |
| 4 | Default: none / takes no arguments | src/sv_main.c:2142-2153 | handler body reads no `Cmd_Argv`; only iterates `ipvip[]` | MATCH |
| 5 | Set by: server console / rcon | src/sv_main.c:3623 | `Cmd_AddCommand ("vip_listip", SV_ListIPVIP_f);` -- plain server cmd table, NOT a `cmd_t`/`CF_` player-issuable command | MATCH |
| 6 | See also: vip_addip, vip_removeip, vip_writeip | src/sv_main.c:3621-3624 | all four `Cmd_AddCommand("vip_*")` registered as a block | MATCH |

Struct ref: `ipfilter_t` actual definition at src/server.h:773-780 (`mask`,`compare`,`level`,`time`,`type`); the copy in src/sv_main.c:2001-2007 is commented out.

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Wide-grep: vip_listip appears only in src/sv_main.c. Handler SV_ListIPVIP_f (sv_main.c:2142-2153). Every material clause maps to a located, verified enforcing line incl. adjacent code and the StringToFilter parse + SV_VIPbyIP consumer.

All 10 clause-checks MATCH. Two FRAMING nuances (PROC-1 judgments, NOT fact defects, so they do NOT downgrade the row):

(1) "(the network-order bytes)" is literally true -- `compare` is stored so its raw memory layout equals `adr.ip` wire bytes, which is why `(in & mask) == compare` works in SV_VIPbyIP. BUT the user-visible consequence is the OPPOSITE of what "network order" might imply to a reader: the print at :2150-2151 reverses the exact cast used at :2066, so the DISPLAYED dotted-quad octet order equals the TYPED order -- there is NO byte reversal in what the user sees. The accurate-and-simpler user-facing statement is just "the addresses shown are the stored compare value." The "network-order" detail is correct but adds engine-internal framing that could mislead. Kept TRACED-CLEAN because the assertion is factually true and enforce-traced; flagged as FYI for the framing call.

(2) The "displays differently from how it was typed" claim is real and correctly hedged with "may": it triggers for partial input (`192.246` -> `192.246.0.0` via the early-break zero-fill at :2060-2062) and for out-of-range octets (truncated by `byte b[i]=Q_atoi(num)` at :2056). A FULL dotted-quad with zeros (`192.246.0.0`) displays identically. The enforcing mechanism is StringToFilter, traced.

(3) Metadata label "Set by:" is awkward for a read-only listing command (it lists, it does not set anything), but the ACCESS CLASS asserted (server console / rcon) is correct -- registered via plain Cmd_AddCommand on the server cmd table, no CF_ player flag. FYI only.

## flags_for_review

- [fyi/other/synthesis] vip_listip prints only ipvip[i].compare (the masked address bytes) and the level -- it does NOT print ipvip[i].mask. So for a masked-range VIP entry, the listing does not show the mask/CIDR width, and two different ranges sharing the same compare base would render identically. Minor observability gap in the engine (the sibling listip/ban list has the same shape); FYI, not a synthesis defect.
- [fyi/other/vpass] '(the network-order bytes)' clause is factually correct (compare stores the wire-byte layout, matched against adr.ip in SV_VIPbyIP at sv_main.c:2727) but is potentially misleading framing: the display cast at sv_main.c:2150 is symmetric with the store cast at sv_main.c:2066, so the printed dotted-quad octets come out in the SAME order they were typed -- no visible byte reversal. A reader could misread 'network-order bytes' as implying the display reorders octets. Underlying fact is true and traced; this is a presentation judgment, not a defect. Consider simplifying to 'the addresses shown are the stored compare value' and dropping the network-order parenthetical.
- [fyi/off-scope-entity/vpass] StringToFilter (sv_main.c:2029-2068) silently accepts and zero-extends partial addresses: input like '192.246' early-breaks at :2060-2062 leaving b[2]=b[3]=0 with mask 0, and out-of-range octets (>255) are truncated by 'byte b[i]=Q_atoi(num)' at :2056. This is the enforcing mechanism behind the description's 'may display differently from how it was typed' clause. It is SHARED library behavior used by all ip-filter commands (addip/listip/vip_addip/vip_removeip/vip_writeip), so it is off-scope for vip_listip specifically -- noted for awareness, not a vip_listip defect.
- [fyi/other/vpass] Metadata field 'Set by: server console / rcon' is an awkward label for vip_listip because the command is read-only (it prints a list, sets nothing). The access class itself is correct (plain Cmd_AddCommand server command, sv_main.c:3623, no CF_ player-issuable flag). Label-template nuance only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_listip",
  "type": "command",
  "description": "Prints the server's current VIP spectator list to the console: each entry's IP address and its priority level.\n\nvip_listip = list the VIP entries. Output begins with \"VIP list:\" followed by one line per entry showing the address and \"level <n>\". Takes no arguments.\n\nThe address shown is the stored value, so an entry added as a wildcard range may display differently from how it was typed.\n\nDefault: none.\nSet by: server console / rcon.\nSee also: vip_addip, vip_removeip, vip_writeip.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2142. Registered admin-only: Cmd_AddCommand(\"vip_listip\", SV_ListIPVIP_f) at src/sv_main.c:3623; NOT in ucmds[]/QC (grep empty) => server console/rcon. Handler SV_ListIPVIP_f at src/sv_main.c:2142: takes no arguments; prints header \"VIP list:\" (2147), then iterates ipvip[0..numipvips) (2148) and for each entry copies the 4 bytes of ipvip[i].compare into b[] (2150) and prints `%3i.%3i.%3i.%3i   level %d` with those bytes and ipvip[i].level (2151). The address printed is the stored `compare` (the masked network value), not the original typed string, which is why a masked-range entry can render as its compare bytes -- traced to the `*(unsigned *)b = ipvip[i].compare;` copy at 2150. This is a pure read of the same in-memory ipvip[] store that SV_VIPbyIP consults at connection time (src/sv_main.c:2730); it has no side effects on the list. F-MV1: grep of ktx/src empty -- no KTX override.",
  "description_proposed": null
}
```
