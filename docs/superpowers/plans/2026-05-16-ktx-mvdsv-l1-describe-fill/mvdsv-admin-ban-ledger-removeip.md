# describe-fill-synthesis ledger -- mvdsv `removeip`

- **project:** mvdsv
- **knob:** `removeip` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `admin-ban` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:removeip: synthesized -- deletes an exact-match entry from the addip filter list; admin-only -- origin=synthesized ref=src/sv_main.c:2273 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Removes an address from the server's connection filter list (the list managed by addip). The address must be given exactly as it was added, including any wildcard (0) octets.
>
> removeip <ip> = delete the matching filter entry. Prints "Removed." on success, or "Didn't find <ip>." if no entry matches.
>
> Example: removeip 198.51.100.0 -- lift the 198.51.100.x range ban added with addip.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| admin-only (no client path) | src/sv_main.c:3618 + src/sv_user.c:3299 | `Cmd_AddCommand ("removeip", SV_RemoveIP_f);` ; not in `ucmds[]` | yes |
| removes matching entry | src/sv_main.c:2271-2273 | `for (j=i+1...) ipfilters[j-1]=ipfilters[j]; numipfilters--;` | yes |
| match is exact on mask AND compare | src/sv_main.c:2268-2269 | `if (ipfilters[i].mask == f.mask && ipfilters[i].compare == f.compare)` | yes |
| wildcard precision must match | src/sv_main.c:2057-2058 | `if (b[i] != 0) m[i] = 255;` (mask follows supplied octets) | yes |
| "Removed." on success | src/sv_main.c:2274 | `Con_Printf ("Removed.\n");` | yes |
| "Didn't find" on no match | src/sv_main.c:2277 | `Con_Printf ("Didn't find %s.\n", Cmd_Argv(1));` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Removes an address from the server's connection filter list (the list managed by addip) | src/sv_main.c:2267-2273 (remove loop over shared array) + src/sv_main.c:2248 (addip writes SAME array) + src/sv_main.c:2011 (`ipfilter_t ipfilters[MAX_IPFILTERS]`) | remove: `for (i=0;i<numipfilters;i++) if (ipfilters[i].mask==f.mask && ipfilters[i].compare==f.compare){ for(j=i+1;...) ipfilters[j-1]=ipfilters[j]; numipfilters--; ...}` ; addip: `ipfilters[i] = f;` | MATCH |
| 2 | The address must be given exactly as it was added, including any wildcard octets | src/sv_main.c:2268-2269 (exact mask AND compare equality) + StringToFilter src/sv_main.c:2057-2058,2065-2066 (zero octet -> mask byte 0 = wildcard) + comment src/sv_main.c:1982 | `ipfilters[i].mask == f.mask && ipfilters[i].compare == f.compare` ; `if (b[i] != 0) m[i] = 255;` / `f->mask=*(unsigned*)m; f->compare=*(unsigned*)b;` ; comment: "Removeip will only remove an address specified exactly the same way.  You cannot addip a subnet, then removeip a single host." | MATCH |
| 3 | removeip <ip> = delete the matching filter entry | src/sv_main.c:2271-2273 | `for (j=i+1 ; j<numipfilters ; j++) ipfilters[j-1] = ipfilters[j]; numipfilters--;` | MATCH |
| 4 | Prints "Removed." on success | src/sv_main.c:2274 | `Con_Printf ("Removed.\n");` | MATCH |
| 5 | Prints "Didn't find <ip>." if no entry matches | src/sv_main.c:2277 | `Con_Printf ("Didn't find %s.\n", Cmd_Argv(1));` (reached only after the for-loop completes without a match) | MATCH |
| 6 | Set by: server console / rcon | src/sv_main.c:3618 (registration, plain Cmd_AddCommand, no client/user-cmd flag) + src/sv_main.c:1828 (rcon SVC_RemoteCommand -> Cmd_ExecuteString after Rcon_Validate) + src/sv_user.c:3299 ucmds[] (removeip ABSENT -> no connected-client path) | `Cmd_AddCommand ("removeip", SV_RemoveIP_f);` ; rcon: `Cmd_ExecuteString(str);` (line 1828, gated by password validate at 1701/1708) ; grep of `ucmds[]` for removeip = none | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. Handler SV_RemoveIP_f at src/sv_main.c:2256-2278; registered at 3618. All 6 material clauses enforcement-traced to located lines (incl. adjacent comment at 1982 corroborating the exact-match clause); zero MISMATCH, zero UNTRACEABLE.

Mechanism verified end to end: addip (SV_AddIP_f, 2196) and removeip iterate/write the SAME global `ipfilters[]` array (2011) -- clause 1's "managed by addip" is structurally correct, not inferred. The exact-match requirement (clause 2) is enforced by the dual `mask==f.mask && compare==f.compare` test at 2268-2269: StringToFilter encodes an unspecified/zero octet as mask-byte 0 (wildcard) via `if (b[i]!=0) m[i]=255;`, so both the value pattern (compare) and the wildcard pattern (mask) must match -- you cannot remove a subnet entry by typing a single host or vice-versa. Output strings "Removed."/"Didn't find %s." match the description verbatim. Under rcon, output is redirected to the requesting client via SV_BeginRedirect(RD_PACKET) at 1819, so "Prints" holds on both surfaces.

Access scope (clause 6): mvdsv uses plain Cmd_AddCommand (no KTX-style CF_ flag table), so the access surface is the two dispatch entry points into Cmd_ExecuteString -- the dedicated server's local console, and rcon (password-validated in SVC_RemoteCommand). Verified removeip is NOT present in the user-command table ucmds[] (sv_user.c:3299), confirming a merely-connected client cannot invoke it; "server console / rcon" is exact.

Minor still-true vagueness (not a defect, fully traceable): "including any wildcard octets" -- a wildcard is encoded as a literal 0 byte (e.g. `addip 192.246.40` leaves the 4th octet 0 = wildcard mask), so in practice the operator re-types the identical dotted string. The phrasing is accurate in spirit. Edge case not documented but non-contradicting: removeip with no arg -> Cmd_Argv(1)="" -> StringToFilter returns false at 2047 -> "Bad filter address: " (the "Didn't find" branch requires a VALID-format address that matches nothing). The description only documents the normal success/no-match paths, which is appropriate for a user-doc.

## flags_for_review

- [fyi/off-scope-entity/vpass] src/sv_ccmds.c:1073 and src/server.h:841 reference SV_RemoveIPFilter(int i) -- an INTERNAL helper that removes a filter by array index (used by ban-expiry / banip cleanup paths), NOT the removeip command handler. It does not register or shadow the removeip command (which lives solely as SV_RemoveIP_f in sv_main.c). Confirmed non-overlapping; flagging only so a future verifier on adjacent ban-command rows knows the name collision is benign.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: stop=C-FIX, qtv_status=C-FIX, record=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "removeip",
  "type": "command",
  "description": "Removes an address from the server's connection filter list (the list managed by addip). The address must be given exactly as it was added, including any wildcard (0) octets.\n\nremoveip <ip> = delete the matching filter entry. Prints \"Removed.\" on success, or \"Didn't find <ip>.\" if no entry matches.\n\nExample: removeip 198.51.100.0 -- lift the 198.51.100.x range ban added with addip.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2273. Admin-only: registered via Cmd_AddCommand only (sv_main.c:3618); NOT in client ucmds[] (sv_user.c:3299) -> server console / rcon. Effect: SV_RemoveIP_f (2256-2278) parses the argument with StringToFilter(Cmd_Argv(1)) (2261), scans ipfilters for an entry whose mask AND compare both equal the parsed filter (2267-2269), and on a match shifts the tail down (2271-2272) and decrements numipfilters (2273) -> the entry is deleted. \"Exactly as added\" clause: the match is on both mask and compare (2268-2269), and mask is derived from which octets were nonzero in the supplied string (StringToFilter 2057-2058), so a wildcarded entry (e.g. 1.2.3.0) is only removed by supplying the same wildcard form; a different-precision string yields a different mask and will not match. Messages: \"Removed.\" on success (2274), \"Didn't find %s.\\n\" when the loop completes with no match (2277). No type argument is read (the type field is ignored on removal). F-MV1: KTX grep shows no override of removeip (only addip is consumed in admin.c); live behavior is the MVDSV engine's.",
  "description_proposed": null
}
```
