# describe-fill-synthesis ledger -- mvdsv `pext_ezquake_verfortrans`

- **project:** mvdsv
- **knob:** `pext_ezquake_verfortrans` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:pext_ezquake_verfortrans: synthesized -- minimum ezQuake build revision to keep the FTE_PEXT_TRANS (entity-transparency) extension; older builds get it stripped + warned -- origin=synthesized ref=src/sv_user.c:379 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Sets the minimum ezQuake build revision that is trusted to use the entity-transparency (alpha) network feature. When an ezQuake client connects with a build revision below this number, the server turns that feature off for that client and warns the player that transparency is disabled because of a buggy client; newer ezQuake builds keep it enabled. It only affects ezQuake clients that requested the transparency extension.
>
> The value is an ezQuake build/revision number, not a version string. Raise it to require newer ezQuake builds for transparency; lower it to trust older builds.
>
> Default: 7814.
> Set by: server config / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| applies only to FTE_PEXT_TRANS clients | src/sv_user.c:368 | `if (sv_client->fteprotocolextensions & FTE_PEXT_TRANS)` | MATCH |
| ezQuake-only | src/sv_user.c:374 | `if (strncmp(client_string, "ezQuake", 7) == 0 && *ptr != '\0')` | MATCH |
| value compared as parsed build revision | src/sv_user.c:378 | `long revision = strtol(ptr, &endptr, 10);` | MATCH |
| threshold: below cvar (or unparseable) => fire | src/sv_user.c:379 | `if (*endptr != '\0' || (revision > 0 && revision < sv_pext_ezquake_verfortrans.value))` | MATCH |
| effect: transparency extension stripped | src/sv_user.c:387 | `sv_client->fteprotocolextensions &= ~FTE_PEXT_TRANS;` | MATCH |
| FTE_PEXT_TRANS = alpha/transparency | src/qwprot/src/protocol.h:34 | `# define FTE_PEXT_TRANS 0x00000008 // .alpha support` | MATCH |
| default 7814 | src/sv_main.c:205 | `{"pext_ezquake_verfortrans", "7814", CVAR_NONE}` | MATCH |
| no KTX override | ktx/src (grep) | (no matches for verfortrans) | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Snippet | Verdict |
|---|--------|---------------------|---------|---------|
| 1 | Sets minimum ezQuake build revision trusted to use entity-transparency (alpha) network feature | sv_user.c:374,379 + protocol.h:34 | `strncmp(client_string,"ezQuake",7)==0` ... `revision < sv_pext_ezquake_verfortrans.value` ; `# define FTE_PEXT_TRANS 0x00000008 // .alpha support` | MATCH |
| 2 | Build revision BELOW this number -> server turns feature OFF for that client | sv_user.c:379,387 | `if (*endptr != '\0' || (revision > 0 && revision < sv_pext_ezquake_verfortrans.value))` ... `sv_client->fteprotocolextensions &= ~FTE_PEXT_TRANS;` | MATCH |
| 3 | Warns the player that transparency is disabled because of a buggy client | sv_user.c:381-383 | `SV_ClientPrintf(... "Alpha support disabled due to buggy client, if the map contains transparency you may be at a disadvantage.")` | MATCH |
| 4 | Newer ezQuake builds keep it enabled | sv_user.c:368,379 | bit set by outer `if (sv_client->fteprotocolextensions & FTE_PEXT_TRANS)`; cleared only if cond true; `revision >= value` -> not cleared | MATCH |
| 5 | Only affects ezQuake clients that requested the transparency extension | sv_user.c:368,374 | `if (sv_client->fteprotocolextensions & FTE_PEXT_TRANS)` (requested) AND `strncmp(client_string,"ezQuake",7)==0` (ezQuake-only) | MATCH |
| 6 | Value is an ezQuake build/revision number, not a version string | sv_user.c:378-379 | `long revision = strtol(ptr, &endptr, 10);` then numeric compare `revision < ...value` (float); dotted version trips `*endptr != '\0'` | MATCH |
| 7 | Default: 7814 | sv_main.c:205 | `cvar_t sv_pext_ezquake_verfortrans = {"pext_ezquake_verfortrans", "7814", CVAR_NONE};` (registered default) | MATCH |
| 8 | Set by: server config / rcon | sv_main.c:205 + cvar.h:61 | flag `CVAR_NONE` (=0, not CVAR_ROM); no OnChange -> settable | MATCH |

**V-pass notes:** Oracle confirmed 1.11-53-g18d0362. enforce-trace-discipline.md loaded and applied per-clause.

Wide-grep: 4 use-sites total. Registration at sv_main.c:205 (decl, default "7814", CVAR_NONE) and sv_main.c:3584 (Cvar_Register, inside #ifdef FTE_PEXT_TRANS). Sole enforcing read at sv_user.c:376-388 (the `extern` redeclare + the comparison + the OFF action). No OnChange, no second writer, no cross-mod override -- the cvar value is read exactly once.

All 8 material clauses enforce-traced to live lines and MATCH. Polarity (below=off), threshold (registered default 7814), OFF-state (clears the FTE_PEXT_TRANS bit on that one client only via `&= ~`), the buggy-client warning, the ezQuake-only + extension-requested double scope guard, and the numeric/strtol value-type are all confirmed against code AND adjacent strings/comments. cvar_t.value is float (cvar.h:72); `long revision` promotes cleanly for the compare. FTE_PEXT_TRANS = 0x8 ".alpha support" (protocol.h:34); sv_ents.c:651 corroborates that alpha-blended entities are sent only to FTE_PEXT_TRANS clients, so disabling the bit genuinely removes the transparency feature for that client. `*client` userinfo is client-reported (ezQuake-side); mvdsv only reads it (sv_user.c:370) -- expected, server-side parse is fully observable.

One unmentioned secondary OFF-trigger noted as FYI (does not contradict any asserted clause): the gate at sv_user.c:379 also disables transparency when `*endptr != '\0'` -- i.e. when the second whitespace-delimited token of `*client` is not a clean base-10 integer (trailing garbage / a dotted version string). The description frames the OFF condition solely as "build revision below this number"; the malformed-token path is an additional disable case. Edge case, not a defect -- flagged for review only.

Classification: TRACED-CLEAN.

## flags_for_review

- [fyi/cross-mod-override/synthesis] pext_ezquake_verfortrans is a cross-engine protocol coupling: the MVDSV server gates the FTE_PEXT_TRANS (alpha/transparency) extension on the *client* ezQuake build revision (sv_user.c:367-391). The full behavior (what transparency the ezQuake client actually renders, why old builds were buggy) spans the ezQuake client codebase. Per D20 this stays out of L1 prose, but the pext-version gate is a candidate for an L3 'ezQuake transparency / FTE protocol extensions' concept note if one is authored.
- [fyi/other/vpass] Enforcing gate sv_user.c:379 `if (*endptr != '\0' || (revision > 0 && revision < sv_pext_ezquake_verfortrans.value))` has a SECOND OFF-trigger the description omits: `*endptr != '\0'` disables transparency whenever the ezQuake-reported `*client` second token is not a pure base-10 integer (e.g. a dotted version string or any trailing non-digit). The proposed text frames the OFF condition only as 'build revision below this number'. Not a contradiction of any asserted clause -- an additional, undocumented disable path. Consider noting in the description that a non-numeric/malformed reported revision also disables the feature.
- [fyi/suspected-bug/vpass] Edge case at the same gate: a reported `revision == 0` (e.g. `*client` second token literally '0') does NOT trip the numeric branch because of the `revision > 0` guard, but DOES trip `*endptr != '\0'`? No -- '0' parses cleanly so endptr is at end; with revision==0 neither sub-condition is true, so transparency stays ENABLED for a reported revision of 0. This asymmetry (0 is trusted, but any non-numeric is distrusted) is a code-behavior curiosity, not a description defect. FYI only.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "pext_ezquake_verfortrans",
  "type": "cvar",
  "description": "Sets the minimum ezQuake build revision that is trusted to use the entity-transparency (alpha) network feature. When an ezQuake client connects with a build revision below this number, the server turns that feature off for that client and warns the player that transparency is disabled because of a buggy client; newer ezQuake builds keep it enabled. It only affects ezQuake clients that requested the transparency extension.\n\nThe value is an ezQuake build/revision number, not a version string. Raise it to require newer ezQuake builds for transparency; lower it to trust older builds.\n\nDefault: 7814.\nSet by: server config / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:379. Enforcing read-site src/sv_user.c:367-391 (guarded by #if defined(FTE_PEXT_TRANS)). The block runs only when the client negotiated FTE_PEXT_TRANS (sv_user.c:368), reads the client's *client userinfo (sv_user.c:370), and only proceeds when it starts with \"ezQuake\" (sv_user.c:374). It parses the build revision via strtol (sv_user.c:378). The gate sv_user.c:379 `if (*endptr != '\\0' || (revision > 0 && revision < sv_pext_ezquake_verfortrans.value))` fires when the revision is unparseable OR strictly less than the cvar value; on fire it warns 'Alpha support disabled due to buggy client' (sv_user.c:381-386) and clears the extension with `sv_client->fteprotocolextensions &= ~FTE_PEXT_TRANS;` (sv_user.c:387). FTE_PEXT_TRANS is documented as '.alpha support' at src/qwprot/src/protocol.h:34 (0x00000008), i.e. entity transparency. Hence: it is a minimum ezQuake build-revision threshold for keeping the transparency extension; below it the extension is stripped. The value is a build revision number (strtol of the *client token), not a dotted version. Registered default \"7814\", CVAR_NONE at src/sv_main.c:205 (note: registration literal is sv_pext_ezquake_verfortrans, user-facing cvar name pext_ezquake_verfortrans). KTX does not read this cvar (grep of ktx/src for pext_ezquake_verfortrans/verfortrans empty) -- engine-internal protocol gate.",
  "description_proposed": null
}
```
