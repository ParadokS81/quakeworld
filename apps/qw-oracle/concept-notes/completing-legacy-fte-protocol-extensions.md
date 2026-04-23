---
title: "Completing legacy FTE protocol extensions in ezQuake 3.6.6"
slug: completing-legacy-fte-protocol-extensions
topic: domain-guide
status: draft
authored_by: qw-oracle
upstream_status: gap-candidate
upstream_target: none-today
primary_contributors:
  - "@dsvensson"
related_entities:
  - ezquake:cvar:pext_ezquake_verfortrans
  - ezquake:commit:f670f949
  - ezquake:commit:1a24fcfb
  - ezquake:commit:388300a5
  - ezquake:commit:06d3e5c4
  - ezquake:commit:c8c53f13
  - ezquake:commit:1e0482bc
  - ezquake:commit:1dcf37a4
  - ezquake:pr:961
  - ezquake:pr:988
  - ezquake:pr:1003
related_messages: []
last_updated: 2026-04-23
---

# Completing legacy FTE protocol extensions in ezQuake 3.6.6

## Summary

Two FTE protocol extensions that ezQuake had carried for roughly a decade as partial, non-functional implementations were completed in the 3.6.6 release cycle: `FTE_PEXT_TRANS` (per-entity alpha transparency) and `FTE_PEXT_MODELDBL` (entity model indices above 256). Both had been negotiated on the wire in older builds without actually working end-to-end. 3.6.6 lands the client-side parsing fixes, the server-side emitters, and a new cvar `pext_ezquake_verfortrans` that prevents newer servers from sending the corrected wire format to still-buggy older clients. The note covers the pattern rather than the protocol mechanics: what it looks like when a long-dormant extension gets finished, why a compatibility gate is necessary the moment the fix lands, and what downstream tools should take from the pair of stories.

## The two half-implementations

Both extensions were declared and partially wired in ezQuake years before 3.6.6 but had gaps that prevented actual use:

- **`FTE_PEXT_TRANS`** (entity transparency). ezQuake carried the extension bit and some scaffolding as far back as 2013. The client negotiated it during protocol handshake but did not correctly read the `PF_EXTRA_PFS` byte that carries the extra player-flag bits introduced by the extension. Any server that actually sent the fixed wire format would desync the parser. In practice the extension sat dormant - servers didn't emit, so the broken client reader never got exercised.
- **`FTE_PEXT_MODELDBL`** (double-size model indices, up to 512). The extension lets the server reference model-index values above the classic 255 limit via the `U_FTE_MODELDBL` delta bit. ezQuake's client delta parser handled the case where `U_MODEL` was set alongside `U_FTE_MODELDBL` (add 256 to the byte it already read), but it did not handle the case where `U_MODEL` was unset and `U_FTE_MODELDBL` alone was set - there, the encoder writes a short rather than a byte, and the decoder needed to read a short that it never read. Maps that would have benefited from the larger index space couldn't be safely served to ezQuake clients until this was fixed.

The shared shape: the extension was advertised in the handshake, the wire format had been specified, but the client-side read path was incomplete. In both cases the problem was silent for a long time because the server side also did not emit the fixed format, so the negotiated-but-broken state wasn't an active failure, only a latent one.

## The 3.6.6 completions

The `FTE_PEXT_TRANS` completion landed in PR #961 (`qw-ctf/alphaents`, merged as `c8c53f13`) across a small cluster of commits by Daniel Svensson (`@dsvensson`):

- Client-side read path: commit `1a24fcfb` ("CLIENT: Support FTE_PEXT_TRANS.", 2024-11-09). Properly reads the extra player-flag byte when `PF_EXTRA_PFS` is set, decodes the entity alpha field with the corrected mapping (0 and 255 both represent opaque, 1-254 represent graded transparency), and handles the fallback path when the extension is not negotiated by re-shifting the flag bits to their pre-extension offsets.
- Server-side write path: commit `388300a5` ("SERVER: Support FTE_PEXT_TRANS.", 2024-11-09). Sets the entity `trans` field from the QuakeC `alpha` entvar in `PF_makestatic` and `PF2_makestatic`, and exposes `alpha` as a mappable extension field for QVM mods.
- Rendering connection: a broader cluster across late 2024 and early 2025 (PR #988 `alpha-brushes`, PR #1003 `alpha-fog`) actually rendered the alpha values the protocol layer now carried. The release-note line "RENDERER: Connect PEXT_TRANS (entity field `alpha`) to transparency of aliasmodels and brush models" covers this half: protocol correctness alone is not user-visible until the renderer consumes the value.

The `FTE_PEXT_MODELDBL` completion landed as a direct commit two months later: `06d3e5c4` ("PROTOCOL: Implement second part of PEXT_MODELDBL.", 2025-01-19). The diff adds the missing `MSG_ReadShort` branch on the client, the matching `MSG_WriteShort` branch on the server, and raises the in-memory ceilings (`MAX_MAP_MODELS` 512->4096, `MAX_STATIC_ENTITIES` 512->2048, `MAX_STANDARD_ENTITIES` 512->2048) so the larger index space has somewhere to go.

## The server-side version-gating pattern

Fixing a long-dormant extension introduces a compatibility hazard: the moment the server starts emitting the corrected wire format, any client still running the pre-fix parser will desync. Because the extension is negotiated by bit in the handshake, a naive fix flips the bit on both sides, and the next time an older client connects to a newer server the parse goes out of sync on the first entity with transparency.

The gate that solves this is commit `f670f949` ("SERVER: Disable FTE_PEXT_TRANS if client is outdated.", 2024-11-03), which registered `pext_ezquake_verfortrans` (default `"7814"`, at `src/sv_main.c:197` and `src/sv_user.c:360-384`). The mechanism:

1. Every client sends an infostring entry `*client` of the form `ezQuake <REVISION>`, set at `src/cl_main.c:1981` where the formatter writes `snprintf(st, sizeof(st), "ezQuake %i", REVISION)`.
2. On client connection, the server inspects `*client`. If the identifier is `ezQuake` and the numeric revision is below `pext_ezquake_verfortrans`, the server clears `FTE_PEXT_TRANS` from the negotiated extension set for that client specifically.
3. The client receives a warning message: "Alpha support disabled due to buggy client, if the map contains transparency you may be at a disadvantage." with upgrade links to ezquake.com and fte.triptohell.info.
4. The commit message documents the workaround from the other side: "Another workaround is for the client to set `cl_pext_alpha 0`" - i.e. users on clients the server can't identify can disable the extension themselves.

The `7814` default is an ezQuake build-revision cutoff. Clients at or above that revision have the corrected `PF_EXTRA_PFS` reader; clients below do not. The cvar is tuneable so operators can adjust the cutoff if a later flaw is discovered in a specific build band.

This is a generalizable pattern. Any time a protocol extension has a flawed historical implementation and gets a fix, the server needs a way to detect which clients have the fix and only emit the corrected format to those. The pattern costs: one client-identifier convention (the `*client` infostring), one numeric cutoff (the cvar), one fall-back message (the warning), one documented client-side workaround (`cl_pext_alpha 0`). It is worth pulling out as a reusable shape for future "half-implemented extension finally completed" stories, of which FTE protocol history has more than these two.

## Consumer implications

- **Oracle MCP "what does `pext_ezquake_verfortrans` do" queries** - the cvar's `help_variables.json` entry is system-generated with no `desc`, `remarks`, or `group-id` population. A plain settings-reference lookup will return only the default value. The three-layer answer shape is: Layer 1 says default `"7814"`, this note supplies the gate semantics and the 2013->2024 arc. Without the note, the cvar looks like an opaque magic number.
- **Oracle MCP "why is my server sending the warning about alpha support" queries** - the client is below the `pext_ezquake_verfortrans` cutoff. The correct answer is not "lower the cvar on the server" (that re-exposes the desync) but "upgrade the client" (the extension is disabled for safety, not as a policy choice).
- **Server operator tuning** - `pext_ezquake_verfortrans` is operator-visible. If a future client build introduces a regression in the PEXT_TRANS reader, the server operator can raise the cutoff to exclude that build band without waiting for a server release. Surface it in any server-config UI alongside other `sv_pext_*` cvars rather than burying it in a generic cvar list.
- **Demo playback / replay consumers** - demos recorded by a post-3.6.6 server include the corrected `PF_EXTRA_PFS` byte and per-entity alpha deltas (commit `02cf1dfd` "DEMO: Write alpha/colourmod deltas if enabled"). Older demo-parser implementations that predate the fix will desync on those demos the same way a broken client would. A demo-tool consumer should detect the source build and use a correspondingly capable parser.
- **Documentation gap (upstream)** - ezquake.com has no guide page covering either the completion stories or the version-gating pattern. The cvar entry is auto-generated from source with no human-authored description. A long-form FAQ or protocol-history page is the likely right home upstream; `upstream_target: none-today` records that the target page does not yet exist.

## References

- PR #961 (`qw-ctf/alphaents`), merge commit `c8c53f13` (2024-11-10) - carried the FTE_PEXT_TRANS completion plus FTE_PEXT_COLOURMOD support.
- PR #988 (`qw-ctf/alpha-brushes`), merge commit `1e0482bc` - rendering-side alpha wiring for brush models.
- PR #1003 (`qw-ctf/alpha-fog`), merge commit `1dcf37a4` - fog-vs-alpha ordering fix.
- Commit `f670f949` ("SERVER: Disable FTE_PEXT_TRANS if client is outdated.", 2024-11-03). Commit message is the canonical statement of why the gate exists. Declaration: `cvar_t sv_pext_ezquake_verfortrans = {"pext_ezquake_verfortrans", "7814", CVAR_NONE}` at `src/sv_main.c:197`. Gate logic: `src/sv_user.c:360-384` in `Cmd_New_f`. Registration: `src/sv_main.c:3509-3511`.
- Commit `1a24fcfb` ("CLIENT: Support FTE_PEXT_TRANS.", 2024-11-09) - client-side PF_EXTRA_PFS reader, corrected alpha decoding at `src/cl_ents.c:1047-1048`, fallback for ungated connections at `src/cl_ents.c:1391-1406`.
- Commit `388300a5` ("SERVER: Support FTE_PEXT_TRANS.", 2024-11-09) - `s->trans` assignment from QuakeC `alpha` field in `PF_makestatic` (`src/pr_cmds.c:2230-2232`) and `PF2_makestatic` (`src/pr2_cmds.c:1423-1425`), plus QVM field mapping at `src/pr2_cmds.c:2047-2050`.
- Commit `06d3e5c4` ("PROTOCOL: Implement second part of PEXT_MODELDBL.", 2025-01-19) - client `MSG_ReadShort` when `U_MODEL` unset and `U_FTE_MODELDBL` set at `src/cl_ents.c:513-521`, server `MSG_WriteShort` at `src/com_msg.c:414-415`, limit raises at `src/bspfile.h:28`, `src/client.h:310` and `:803`, and `src/common.h:75-76`.
- Commit `02cf1dfd` ("DEMO: Write alpha/colourmod deltas if enabled.", 2025-01-XX) - demo-recording side of the PEXT_TRANS completion.
- Client identifier source: `snprintf(st, sizeof(st), "ezQuake %i", REVISION)` at `src/cl_main.c:1981`, written to the `*client` infostring key immediately after.
- Help JSON: `help_variables.json` entry for `pext_ezquake_verfortrans` carries only `default: "7814"`, `group-id: "0"`, `system-generated: true` - no `desc`, no `remarks`. Confirms the upstream-reference gap on this cvar.

## Related concept notes

- Future note candidate: **Server-side protocol compatibility gating as a pattern** - this note gestures at the generalizable shape but uses PEXT_TRANS as the single instance. A second occurrence (any future "half-implemented extension completed" story) would earn a pattern-level note this one can link to.
- Cross-reference (forward): the "Client-side server-exec allowlist" note (Track 1, not yet drafted) covers a different server-client security surface - what commands a server is permitted to stuff into a client's command buffer - and shares structural similarity with the version-gating here in that both are server-side controls over what a client is asked to process. Worth linking once that note lands.
- Future note candidate: **The `*client` infostring convention** - `pext_ezquake_verfortrans` depends on the ezQuake-specific `*client` format. FTEQW and other clients set their own `*client` values. A note cataloguing the community's `*client` identifier conventions would support any future version-gate that needs to reason across client families, not just ezQuake builds.
