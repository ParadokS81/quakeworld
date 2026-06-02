# describe-fill-synthesis ledger -- mvdsv `sv_mod_extensions`

- **project:** mvdsv
- **knob:** `sv_mod_extensions` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `hedged` -- medium confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_mod_extensions: hedged -- CVAR_ROM capability the engine advertises but never reads; consumer is the mod (KTX reads it as an extension bitmask); per-value meaning routed to L3 -- origin=synthesized ref=src/sv_main.c:58 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Advertises to the game mod which optional MVDSV server extensions this server build supports, as a capability value the mod reads when it starts. The mod uses it to decide whether to use those extensions (for example, embedding extra hidden data in the recorded demo stream).
>
> This value is read-only: it reports the server's built-in capability level and cannot be changed by an admin.
>
> Default: 2.
> Set by: engine (read-only).
> See also: L3 (mvdsv-ktx extension handshake).

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered, fixed default 2, read-only | src/sv_main.c:58 | `cvar_t sv_mod_extensions = { "sv_mod_extensions", "2", CVAR_ROM };` | MATCH |
| registered into cvar system | src/sv_main.c:3607 | `Cvar_Register(&sv_mod_extensions);` | MATCH |
| NO mvdsv engine read-site | (grep src) | only decl + Cvar_Register; no `.value`/`.integer`/`.string`/`cvar("sv_mod_extensions")` reader in mvdsv | UNTRACEABLE (engine) |
| consumer is the game mod (cross-mod cvar API) | ktx src/g_main.c:509 | `sv_extensions = cvar("sv_mod_extensions");` | MATCH (cross-mod) |
| mod reads it as a capability bitmask | ktx src/combat.c:810, stats.c:555, race.c:5109 | `sv_extensions & SV_EXTENSIONS_MVDHIDDEN` | MATCH (cross-mod) |
| engine supports the hidden-message MVD path | src/sv_demo.c:1273 | `demo.recorder.mvdprotocolextensions1 |= MVD_PEXT1_HIDDEN_MESSAGES;` | MATCH (corroborating, not the reader) |
| per-value semantics defined by mod, not engine src | (n/a) | SV_EXTENSIONS_* macro absent from both src/ trees | UNTRACEABLE (hedged -> L3) |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Advertises to the game mod which optional MVDSV extensions this build supports; capability value the mod reads when it starts | ktx/src/g_main.c:509 (read-site, in G_InitGame) + ktx/include/g_consts.h:340 (bit value) + mvdsv/src/sv_demo.c:485 (engine implements the capability) | `sv_extensions = cvar("sv_mod_extensions");` / `#define SV_EXTENSIONS_MVDHIDDEN 2` / `qbool MVDWrite_HiddenBlockBegin(int length)` | MATCH |
| 2 | Mod uses it to decide whether to use those extensions (e.g. embedding extra hidden data in the recorded demo stream) | ktx/src/stats.c:555; ktx/src/combat.c:810; ktx/src/race.c:5109 (all gate on the bit; all feed the engine MVD hidden-block writer) | `qbool embed_in_mvd = (sv_extensions & SV_EXTENSIONS_MVDHIDDEN);` | MATCH |
| 3 | Read-only: reports built-in capability level, cannot be changed by an admin | mvdsv/src/sv_main.c:58 (flag) + mvdsv/src/cvar.c:134-135 (enforcement) | `cvar_t sv_mod_extensions = { "sv_mod_extensions", "2", CVAR_ROM };` / `if (var->flags & CVAR_ROM) return;` | MATCH |
| 4 | Default: 2 | mvdsv/src/sv_main.c:58 (registered default) | `{ "sv_mod_extensions", "2", CVAR_ROM }` | MATCH |
| 5 | Set by: engine (read-only) | mvdsv/src/sv_main.c:58 + mvdsv/src/sv_main.c:3607 (Cvar_Register) | `Cvar_Register(&sv_mod_extensions);` | MATCH |

**V-pass notes:** All 5 clauses MATCH located enforcing lines; classification TRACED-CLEAN. No flavour-C: every behavioral clause is enforcement-traced, not name/enum/comment-inferred.

KEY STRUCTURAL NOTE (the V-pass tension): the engine (mvdsv) has ZERO read-site for this cvar -- only registration (sv_main.c:58) + Cvar_Register (sv_main.c:3607). Wide-grep of /src for both `sv_mod_extensions` and `mod_extensions` returns exactly those two lines; no branch, no `.value`/`.string` read, no OnChange, no Cvar_SetROM call on it. The cvar's entire purpose is cross-mod: it is exposed to QC progs by string name via the `cvar()` builtin PF_cvar (pr_cmds.c:1168 -> `Cvar_Value(str)`), and the consuming read-site lives in KTX. The proposed description correctly frames this as "advertises to the game mod ... a capability value the mod reads" rather than fabricating engine-side behavior -- so the absence of an engine read-site is NOT a WI2-FIX here; it is the correct model, and the real read-site was located cross-mod.

Cross-mod trace (KTX @ research/repos/ktx): g_main.c:509 reads it into `int sv_extensions` during G_InitGame ("when it starts" = correct). g_consts.h:339-340 define the capability bits: `SV_EXTENSIONS_KTXEXTENSION1 1` (reserved, ZERO consumers) and `SV_EXTENSIONS_MVDHIDDEN 2` (the only active bit). Three consumers gate on MVDHIDDEN: stats.c:555 (`embed_in_mvd`), combat.c:810 (damage-done records), race.c:5109 -- all embed hidden data into the MVD via the engine's hidden-block subsystem (sv_user.c:4305+ builds `mvdhidden_block_header_t`; sv_demo.c:485 implements MVDWrite_HiddenBlockBegin). So default "2" precisely = MVDHIDDEN enabled, and the description's "embedding extra hidden data in the recorded demo stream" example is exactly the live mechanism.

Default-2 semantics verified end-to-end: registered "2" (WI-2 satisfied -- registered default, not a shipped-cfg value) AND 2 == SV_EXTENSIONS_MVDHIDDEN, so the default is not arbitrary -- it advertises the one live extension. The plural "which optional ... extensions" describes a bitfield (KTX reads with `&` masks) and is accurate to the mechanism even though only one bit is currently active; the main text wisely avoids claiming a specific bit->feature table and defers the handshake detail to L3.

CVAR_ROM (read-only) double-confirmed: flag at sv_main.c:58, enforced at cvar.c:134-135 where Cvar_Set returns early. The only bypass (Cvar_SetROM, cvar.c:168) is never called on this cvar, so the value stays pinned at the registered "2" at runtime.

## flags_for_review

- [review/cross-mod-override/synthesis] sv_mod_extensions is registered CVAR_ROM in mvdsv with default '2' but has NO engine read-site anywhere in the mvdsv source tree. Its only consumer is the game mod via the cross-mod cvar() API: KTX reads it (g_main.c:509 -> sv_extensions) and treats it as a bitmask (sv_extensions & SV_EXTENSIONS_MVDHIDDEN at combat.c:810 / stats.c:555 / race.c:5109) to gate embedding hidden messages in the MVD demo. The engine separately implements MVD_PEXT1_HIDDEN_MESSAGES (sv_demo.c:1273) but does not gate it on this cvar. This is a cross-mod capability-advertisement contract: the per-value meaning lives in shared mod-API headers (SV_EXTENSIONS_* macro is not in either src/ tree), so the L1 description is hedged and the value semantics route to an L3 concept note rather than being asserted from engine source.
- [fyi/cross-mod-override/vpass] sv_mod_extensions has NO engine read-site (only registration). Its sole consumer is cross-mod: KTX reads it via the cvar() QC builtin at g_main.c:509. The L1 description and any 'set_by/consumer' metadata must treat KTX as the consumer; an engine-only audit would wrongly flag it as a no-reader/dead cvar (it is NOT dead -- it is a capability advertised over the engine<->mod boundary).
- [fyi/hidden-family/vpass] SV_EXTENSIONS bitfield (ktx/include/g_consts.h:339-340) has a reserved-but-unused bit: SV_EXTENSIONS_KTXEXTENSION1 (=1) has ZERO consumers in KTX src; only SV_EXTENSIONS_MVDHIDDEN (=2) is live. The engine advertises default 2 (only the MVDHIDDEN bit), never 3. The description's plural 'extensions' is a correct bitfield framing but currently maps to exactly one active extension.
- [fyi/off-scope-entity/vpass] sv_mod_extensions also appears in off-scope sibling repos (research/repos/dusty-mvdsv/src/sv_main.c, unezquake/src/sv_main.c) and a parallel KTX read in dusty-ktx/src/g_main.c. Oracle scope is mvdsv @ 1.11-53-g18d0362 only; these are noted, not graded, but confirm the advertise-to-mod pattern is shared across the fork family.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_mod_extensions",
  "type": "cvar",
  "description": "Advertises to the game mod which optional MVDSV server extensions this server build supports, as a capability value the mod reads when it starts. The mod uses it to decide whether to use those extensions (for example, embedding extra hidden data in the recorded demo stream).\n\nThis value is read-only: it reports the server's built-in capability level and cannot be changed by an admin.\n\nDefault: 2.\nSet by: engine (read-only).\nSee also: L3 (mvdsv-ktx extension handshake).",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "hedged",
  "description_confidence": "medium",
  "description_reasoning": "primary source_ref src/sv_main.c:58. HEDGED: the MVDSV engine REGISTERS this cvar (src/sv_main.c:58 `cvar_t sv_mod_extensions = { \"sv_mod_extensions\", \"2\", CVAR_ROM };`; registered src/sv_main.c:3607) but has ZERO own read-site -- exhaustive grep of src for `sv_mod_extensions.value/.integer/.string` and `mod_extensions` returns only the declaration + Cvar_Register (no engine consumer). The behavior is therefore NOT enforced anywhere in the mvdsv tree; the CONSUMER is the game mod via the cross-mod cvar() API. Confirmed in KTX (src/g_main.c:509 `sv_extensions = cvar(\"sv_mod_extensions\");`, stored int g_main.c:91) and read as a bitmask: `sv_extensions & SV_EXTENSIONS_MVDHIDDEN` at ktx src/combat.c:810, src/stats.c:555, src/race.c:5109 -- gating whether KTX embeds hidden messages into the MVD demo. So the LEGIBLE part (from mvdsv source alone): it is CVAR_ROM (read-only -> admin cannot set; verified by the CVAR_ROM flag at decl and the absence of any OnChange/Cvar_Set path) and the engine ships it at fixed value 2. The SEMANTICS of the value (what '2' selects, which extension bits it maps to) are NOT source-legible from mvdsv -- they are defined by the mod's bitmask (SV_EXTENSIONS_* macro not present in either tree's src/, lives in shared mod-API headers), so the per-value meaning is HEDGED and routed to L3, not asserted. The engine DOES implement a hidden-message MVD path (src/sv_demo.c:1273 `demo.recorder.mvdprotocolextensions1 |= MVD_PEXT1_HIDDEN_MESSAGES;`), corroborating that '2' advertises a real capability, but the engine does not itself read sv_mod_extensions to do so. DEFAULT '2' verified at decl src/sv_main.c:58. Set-by: CVAR_ROM -> engine-set, read-only to admin. cross-mod-override flag raised: this is a cross-mod CONSUMPTION (mod reads engine-advertised capability), not an override.",
  "description_proposed": null
}
```
