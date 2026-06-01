# describe-fill-synthesis ledger -- mvdsv `vip_removeip`

- **project:** mvdsv
- **knob:** `vip_removeip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vip_removeip: synthesized -- admin cmd removes an exact-matching entry from the in-memory VIP spectator list ("Removed."/"Didn't find"); does not rewrite vip_ip.cfg; no KTX override -- origin=synthesized ref=src/sv_main.c:2114 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Removes an entry from the server's VIP spectator list. The address must match an existing entry exactly -- type it the same way it was added (dotted-decimal, where 0 octets are wildcards, just like vip_addip).
>
> vip_removeip <ip> = remove the matching VIP entry. Prints "Removed." on success, or "Didn't find <address>." if no entry matches.
>
> Example: vip_removeip 198.51.100.42 -- drop that VIP entry.
>
> This edits the in-memory list only; it does not rewrite the saved vip_ip.cfg file (use vip_writeip to persist the change).
>
> Default: none.
> Set by: server console / rcon.
> See also: vip_addip, vip_listip, vip_writeip.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (console/rcon) | src/sv_main.c:3622 | `Cmd_AddCommand ("vip_removeip", SV_RemoveIPVIP_f);` (absent from ucmds[]) | MATCH |
| parses arg / bad-filter msg | src/sv_main.c:2119-2123 | `if (!StringToFilter (Cmd_Argv(1), &f)) { Con_Printf ("Bad filter address: %s\n"...` | MATCH |
| exact mask+compare match required | src/sv_main.c:2124-2126 | `if (ipvip[i].mask == f.mask && ipvip[i].compare == f.compare)` | MATCH |
| compacts array, "Removed." | src/sv_main.c:2128-2132 | `for (j=i+1 ...) ipvip[j-1] = ipvip[j]; numipvips--; Con_Printf ("Removed.\n"); return;` | MATCH |
| miss -> "Didn't find" | src/sv_main.c:2134 | `Con_Printf ("Didn't find %s.\n", Cmd_Argv(1));` | MATCH |
| same store read at connect (loss of slot access) | src/sv_main.c:2730 | `if ( (in & ipvip[i].mask) == ipvip[i].compare) return ipvip[i].level;` | MATCH |
| in-memory only (file via vip_writeip) | src/sv_main.c:2167 | `snprintf (name, MAX_OSPATH, "%s/vip_ip.cfg", fs_gamedir);` | MATCH |
| no KTX override | ktx/src (grep) | empty | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Removes an entry from the server's VIP spectator list | sv_main.c:2124-2130 (handler SV_RemoveIPVIP_f, array `ipvip[]` @2014, list label @2099) | `for (i=0 ; i<numipvips ; i++) if (ipvip[i].mask == f.mask && ipvip[i].compare == f.compare) { ... numipvips--; }` | MATCH |
| 2 | Address/range must match an existing entry exactly -- same IP and mask | sv_main.c:2125-2126 | `if (ipvip[i].mask == f.mask && ipvip[i].compare == f.compare)` | MATCH (matches on mask+compare only; ignores level -- correctly omitted. "mask" = engine-derived, see clause 8) |
| 3 | Syntax `vip_removeip <ip>[/mask]` -- a `/mask` suffix can be supplied | sv_main.c:2029-2068 (StringToFilter) + 2119/2134 (only Cmd_Argv(1) read; no Argv(2)) | `while (*s >= '0' && *s <= '9') { num[j++] = *s++; } ... if (b[i] != 0) m[i] = 255;` | MISMATCH -- parser has NO `/mask`/CIDR branch; mask is auto-derived from nonzero octets. A literal `/N` suffix is silently skipped (`s++`) and dropped, NOT interpreted. removeip reads no 2nd arg; the family's optional 2nd arg (on vip_addip @2087) is a LEVEL, not a mask. |
| 4 | Prints "Removed." on success | sv_main.c:2131 | `Con_Printf ("Removed.\n");` | MATCH |
| 5 | Prints "Didn't find <address>." if no entry matches | sv_main.c:2134 | `Con_Printf ("Didn't find %s.\n", Cmd_Argv(1));` | MATCH |
| 6 | Edits the in-memory list only; does NOT rewrite vip_ip.cfg | sv_main.c:2114-2135 (whole handler -- only touches ipvip[]/numipvips, no fopen/fprintf) | (no file I/O in handler) | MATCH |
| 7 | Use vip_writeip to persist | sv_main.c:2160-2188 (SV_WriteIPVIP_f) | `snprintf (name, MAX_OSPATH, "%s/vip_ip.cfg", fs_gamedir); ... fprintf (f, "vip_addip %i.%i.%i.%i %d\n", ...)` | MATCH |
| 8 | (supporting) "mask" is real and part of match | sv_main.c:2065 + 2730 | `f->mask = *(unsigned *)m;` ... consumer `(in & ipvip[i].mask) == ipvip[i].compare` | MATCH (mask is a genuine field; it is just not user-supplied via `/mask`) |
| 9 | Set by: server console / rcon | sv_main.c:3622 (`Cmd_AddCommand`) + 1747-1770 rcon blacklist (vip_removeip absent) + 1828 `Cmd_ExecuteString(str)` | `Cmd_AddCommand ("vip_removeip", SV_RemoveIPVIP_f);` / not in `!strcasecmp(tstr,"rm")...` blacklist | MATCH (plain console cmd; reachable via local console + master & admin rcon) |
| 10 | Default: none | n/a -- command, not cvar (no RegisterCvar) | n/a | MATCH (commands carry no default; "none" is correct) |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Enforcing handler: SV_RemoveIPVIP_f at src/sv_main.c:2114-2135; registered at sv_main.c:3622 via plain Cmd_AddCommand. Data: ipvip[] / numipvips (sv_main.c:2014-2015). Parser StringToFilter (sv_main.c:2029-2068). Consumer SV_VIPbyIP (sv_main.c:2722-2734).

9 of 10 clauses TRACED-CLEAN. The body prose, all output strings, the in-memory-only side-effect, the vip_writeip persistence pointer, the access class, and "Default: none" all map to located enforcing lines.

C-FIX trigger (one clause): the syntax line `vip_removeip <ip>[/mask]` asserts a `/mask` (CIDR-style) input suffix that the engine does NOT implement and effectively CONTRADICTS. StringToFilter (sv_main.c:2042-2058) reads up to four dotted-decimal octets and DERIVES the mask implicitly -- an octet sets mask byte 255 only if its value is nonzero (`if (b[i] != 0) m[i] = 255;`). There is no `/` / CIDR / slash branch anywhere in sv_main.c. Tracing `vip_removeip 192.168.1.5/24`: octets parse to 192.168.1.5 (mask 255.255.255.255); the `/` is non-digit, hits `s++` and is skipped, the trailing `24` is dropped -- the `/24` never becomes a mask. So matching is by trailing-zero-octet granularity (e.g. `vip_removeip 192.246.40` => compare 192.246.40.0 / mask 255.255.255.0), NOT by an explicit `/mask`. The family's only real optional 2nd arg is the LEVEL on vip_addip (sv_main.c:2087 `l = Q_atoi(Cmd_Argv(2))`); removeip reads no 2nd arg at all. This is flavour-C: a syntax element with no enforcing parse-site, actively misleading about how an operator controls the match scope.

NOTE: the body prose phrase "same IP and mask" is itself CORRECT (the match keys on mask+compare) -- the defect is strictly the user-facing input-syntax token `[/mask]`. Recommended fix for the re-synth seed: drop `[/mask]`; render syntax as `vip_removeip <ip>` and explain that, as with vip_addip, the address is dotted-decimal where omitted/zero trailing octets widen the match (e.g. `192.246.40` matches the class-C block) -- the mask is implicit, not a CIDR suffix.

Minor FYI (not a fix-trigger): the description enumerates two outputs (Removed. / Didn't find ...) for a valid address but omits the third path "Bad filter address: %s" (sv_main.c:2121) emitted when StringToFilter fails on a malformed/empty argument. Both stated outputs are accurate for their stated precondition; the omission is a distinct (parse-failure) precondition, so it is an incompleteness, not a contradiction.

## flags_for_review

- [review/contradiction/vpass] The `[/mask]` syntax token in the proposed description has no basis in MVDSV source. StringToFilter (src/sv_main.c:2029-2068) implements no CIDR/slash mask parsing; mask is auto-derived from nonzero octets. A literal `/N` suffix is silently dropped. The whole addip/removeip/vip_* filter family in MVDSV uses dotted-decimal with implicit trailing-zero-octet masking (inherited from the original id Quake filter code; see the doc-block comment at sv_main.c:1975-1995, 'You cannot addip a subnet, then removeip a single host'). If a `[/mask]` convention was pulled from a sibling row or another engine, it should be re-checked there too -- it does not hold for MVDSV.
- [fyi/other/vpass] vip_removeip matches purely on (mask, compare) and ignores the stored VIP level (src/sv_main.c:2125-2126). vip_addip's 2nd positional arg is the level (sv_main.c:2087), not a mask. The proposed description correctly says removal matches IP+mask (not level), so this is consistent -- flagged only to anchor that the family's real optional arg is level, reinforcing why `[/mask]` is wrong.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vip_removeip",
  "type": "command",
  "description": "Removes an entry from the server's VIP spectator list. The address must match an existing entry exactly -- type it the same way it was added (dotted-decimal, where 0 octets are wildcards, just like vip_addip).\n\nvip_removeip <ip> = remove the matching VIP entry. Prints \"Removed.\" on success, or \"Didn't find <address>.\" if no entry matches.\n\nExample: vip_removeip 198.51.100.42 -- drop that VIP entry.\n\nThis edits the in-memory list only; it does not rewrite the saved vip_ip.cfg file (use vip_writeip to persist the change).\n\nDefault: none.\nSet by: server console / rcon.\nSee also: vip_addip, vip_listip, vip_writeip.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2114. Registered admin-only: Cmd_AddCommand(\"vip_removeip\", SV_RemoveIPVIP_f) at src/sv_main.c:3622; NOT in ucmds[]/QC (grep empty) => server console/rcon. Handler SV_RemoveIPVIP_f at src/sv_main.c:2114: parses arg1 via StringToFilter (2119; bad parse -> \"Bad filter address\"), scans ipvip[] for an entry whose mask AND compare both equal the parsed filter (2124-2126 -- exact match required, no partial/IP-only match), on hit shifts down the tail to compact the array and decrements numipvips (2128-2130), prints \"Removed.\" (2131) and returns; if no entry matches, prints \"Didn't find %s.\" with the raw arg (2134). Acts on the same in-memory ipvip[] store that vip_addip fills and that SV_VIPbyIP (src/sv_main.c:2722-2734) reads at connection time; removing an entry means that IP no longer resolves to a VIP level and therefore loses access to the reserved maxvip_spectators slots gated by SpectatorCanConnect (src/sv_main.c:1202-1206). Does not touch the persisted file: only vip_writeip writes vip_ip.cfg (src/sv_main.c:2167). F-MV1: grep of ktx/src empty -- no KTX override.",
  "description_proposed": null
}
```
