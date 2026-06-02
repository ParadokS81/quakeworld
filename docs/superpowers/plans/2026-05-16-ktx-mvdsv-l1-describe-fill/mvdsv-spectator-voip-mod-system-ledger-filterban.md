# describe-fill-synthesis ledger -- mvdsv `filterban`

- **project:** mvdsv
- **knob:** `filterban` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:filterban: synthesized -- inverts addip list meaning (1=ban-list, 0=allow-list); traced via SV_FilterPacket return + SV_SendBan/SV_DropClient consumers -- origin=synthesized ref=src/sv_main.c:2391 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Chooses whether the server's IP filter list (built with addip / removeip) is a ban list or an allow list.
>
> 1 = ban list: addresses matching the list are refused, everyone else may connect.
> 0 = allow list: only addresses matching the list may connect, everyone else is refused (use this to set up a private or LAN-only server).
>
> Default: 1.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| list-match return value | src/sv_main.c:2391 | `return (int)filterban.value;` | MATCH |
| no-match return value (inverted) | src/sv_main.c:2393 | `return !(int)filterban.value;` | MATCH |
| true return => address refused | src/sv_main.c:2997-3000 | `if (SV_FilterPacket ()) { SV_SendBan (); continue; }` | MATCH |
| true return => connected client dropped | src/sv_main.c:1897-1898 | `if (SV_FilterPacket()...) SV_DropClient(client);` | MATCH |
| default 1 | src/sv_main.c:2022 | `cvar_t filterban = {"filterban", "1"};` | MATCH |
| 0 = allow-list / private-LAN polarity | src/sv_main.c:2391-2393 | combined return values above | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|--------------------|---------|---------|
| C1 | IP filter list (built with addip/removeip) is a ban list or allow list | src/sv_main.c:2390 + :2203/:2213 (addip→ipft_ban) | `if ( ipfilters[i].type == ipft_ban && (in & ipfilters[i].mask) == ipfilters[i].compare )` ; `ipfiltertype_t ipft = ipft_ban; // default is ban` | MATCH |
| C2 | 1 = ban list: addresses matching the list are refused, everyone else may connect | src/sv_main.c:2391 (match→`return (int)filterban.value`=1=true=refuse) + :2393 (no-match→`return !1`=0=false=allow); callers :1897-1898 `SV_DropClient`, :1703 `banned=true` | `return (int)filterban.value;` / `return !(int)filterban.value;` / `if (SV_FilterPacket()) SV_DropClient(client);` | MATCH |
| C3 | 0 = allow list: only addresses matching the list may connect, everyone else is refused | src/sv_main.c:2391 (match→`return 0`=false=allow) + :2393 (no-match→`return !0`=1=true=refuse); caller :1898 drops on true | `return (int)filterban.value;` / `return !(int)filterban.value;` | MATCH |
| C4 | Default: 1 | src/sv_main.c:2022 def; :3533 bare register | `cvar_t filterban = {"filterban", "1"};` ; `Cvar_Register (&filterban);` | MATCH |
| C5 | Set by: server config / rcon | src/sv_main.c:2022 (flag-less cvar_t, flags=0; no CVAR_ROM/SERVERINFO) | `cvar_t filterban = {"filterban", "1"};` | MATCH |

**V-pass notes:** All five clauses enforce-traced to live source at mvdsv 1.11-53-g18d0362 and all MATCH.

Polarity is the load-bearing risk and it is correct. The enforcing function is SV_FilterPacket() at src/sv_main.c:2382-2394. Return semantics were confirmed at every caller: return-true = REFUSE/drop (connect path :1897-1898 calls SV_DropClient; rcon paths :1703-1704 and :1711-1714 set banned=true), return-false = ALLOW. The two reads of filterban.value (lines 2391 on IP-match, 2393 on no-match via `!`) are the ONLY read-sites of the cvar in the whole tree (verified by wide grep -- registration at :3533 plus those two reads; nothing else). Walking the truth table: filterban=1 -> match returns 1=refuse, non-match returns 0=allow (ban list); filterban=0 -> match returns 0=allow, non-match returns 1=refuse (allow list). This matches C2/C3 exactly and also matches the original id-Software author comment at :1990-1994.

Default verified per WI-2: registered with a bare two-field initializer `{"filterban","1"}` and a plain `Cvar_Register` (no Ex override), so the registered default is the string "1" -- C4 is the true registered default, not a shipped-cfg artifact. C5 ("server config / rcon") is accurate for a flag-less server cvar: the cvar_t initializer sets no flags (flags=0, no CVAR_ROM, no CVAR_SERVERINFO), so it is settable from console/server config and via rcon `set`.

The "use this to set up a private or LAN-only server" parenthetical in the description is a direct paraphrase of the author comment at :1994 ("This lets you easily set up a private game, or a game that only allows players from your local network") and is consistent with the enforced allow-list behavior at filterban=0. Not a flavour-C inference -- it restates verified behavior.

## flags_for_review

- [fyi/off-scope-entity/vpass] addip can also create ipft_safe entries (src/sv_main.c:2214-2215, via the 'safe' arg). SV_FilterPacket only consults ipfilters[i].type == ipft_ban (:2390), so filterban polarity governs ONLY ban-type entries; ipft_safe entries are a separate exemption path (Do_BanList, :2400+) untouched by filterban. The description's scope ('the IP filter list ... ban list or allow list') correctly refers to the ban entries filterban actually governs, so this is not a defect -- just a scope note: filterban does not affect the addip-safe sublist.
- [fyi/other/vpass] SV_FilterPacket reads net_from.ip as a 32-bit unsigned (`in = *(unsigned *)net_from.ip`, :2387) and all mask/compare logic is IPv4-only. This is an engine-wide IPv4 assumption, not specific to filterban, and does not affect any clause in the description.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "filterban",
  "type": "cvar",
  "description": "Chooses whether the server's IP filter list (built with addip / removeip) is a ban list or an allow list.\n\n1 = ban list: addresses matching the list are refused, everyone else may connect.\n0 = allow list: only addresses matching the list may connect, everyone else is refused (use this to set up a private or LAN-only server).\n\nDefault: 1.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:2391. Enforcing read-sites SV_FilterPacket() src/sv_main.c:2391-2393: on a ban-list match it returns (int)filterban.value (:2391), and with no match it returns !(int)filterban.value (:2393). Consumer gates establish that a true return = refuse: src/sv_main.c:2997-3000 (incoming-packet path) calls SV_SendBan() and skips the packet when SV_FilterPacket() is true, and src/sv_main.c:1897-1898 calls SV_DropClient when true. Polarity therefore: with value 1, a listed address -> returns 1 -> refused; an unlisted address -> returns 0 -> allowed (= ban list). With value 0, a listed address -> returns 0 -> allowed; an unlisted address -> returns 1 -> refused (= allow list / private-LAN). Registered default \"1\" at src/sv_main.c:2022 (cvar_t filterban = {\"filterban\", \"1\"}). The legacy in-source help block (sv_main.c:1990-1994) corroborates but is not the citation. No KTX override (engine ban path).",
  "description_proposed": null
}
```
