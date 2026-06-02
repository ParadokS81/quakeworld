# describe-fill-synthesis ledger -- mvdsv `sv_debug_antilag`

- **project:** mvdsv
- **knob:** `sv_debug_antilag` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:sv_debug_antilag: synthesized -- diagnostic toggle, writes antilag rewound positions into the MVD demo (0=off,1=on) -- origin=synthesized ref=src/sv_user.c:4800 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Diagnostic toggle for antilag debugging. When on, the server writes the lag-compensated (rewound) positions of players into the recorded MVD demo, so the antilag system's per-shot rewinds can be inspected afterwards in a compatible tool.
>
> 0 = off (no antilag debug data recorded).
> 1 = on (record rewound positions each frame antilag is applied).
>
> Default: 0.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read site fires the demo write | src/sv_user.c:4800 | `if (antilag_players_present && sv_debug_antilag.value) { SV_DebugWriteServerAntilagPositions(cl, antilag_players_present); }` | yes |
| writes rewound player positions | src/sv_user.c:4301-4303 | comment "Writes the position of clients, as rewound by antilag" + `static void SV_DebugWriteServerAntilagPositions(...)` | yes |
| data goes into MVD demo (hidden block) | src/sv_user.c:4310,4319 | `header.type_id = mvdhidden_antilag_position;` ... `if (MVDWrite_HiddenBlockBegin(...))` | yes |
| init toggles the pext bit (mechanism) | src/sv_init.c:443-448 | `if (sv_debug_antilag.value) { svs.mvdprotocolextension1 |= MVD_PEXT1_DEBUG_ANTILAG; } else { ... &= ~MVD_PEXT1_DEBUG_ANTILAG; }` | yes |
| polarity 0=off non-zero=on | src/sv_user.c:4800 | `&& sv_debug_antilag.value` (truthy gate) | yes |
| default 0 | src/sv_user.c:80 | `cvar_t sv_debug_antilag = { "sv_debug_antilag", "0" };` | yes |
| settable plain cvar (no cmd) | src/sv_user.c:4926 | `Cvar_Register(&sv_debug_antilag);` | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Diagnostic toggle for antilag debugging (boolean) | src/sv_user.c:80 | `cvar_t sv_debug_antilag = { "sv_debug_antilag", "0" };` | MATCH |
| 2 | When on, writes lag-compensated (REWOUND) positions of players | src/sv_user.c:4298-4301 (fn comment) + :4344 | `Writes the position of clients, as rewound by antilag` ... `pos.pos[j] = LittleFloat(cl->laggedents[i].laggedpos[j]);` | MATCH |
| 3 | ...into the recorded MVD demo | src/sv_user.c:4319 -> src/sv_demo.c:485-488 -> :469 | `MVDWrite_HiddenBlockBegin(...)` => `return MVDWrite_Begin(dem_multiple, 0, length);` ; `MVDWrite_Begin`: `if (!sv.mvdrecording) return false;` | MATCH (write target is the MVD demo, only while recording) |
| 4 | So per-shot rewinds can be inspected afterwards in a compatible tool | src/qwprot/src/protocol.h:69 | `# define MVD_PEXT1_DEBUG_ANTILAG (1 << 4) // Send predicted positions to server (compare to antilagged positions)` | MATCH (data is a named MVD protocol-extension hidden block; readable by a tool that understands MVD_PEXT1_DEBUG_ANTILAG) |
| 5 | 0 = off (no antilag debug data recorded) | src/sv_user.c:4800 | `if (antilag_players_present && sv_debug_antilag.value) {` (false .value -> SV_DebugWriteServerAntilagPositions not called) | MATCH |
| 6 | 1 = on (record rewound positions each frame antilag is applied) | src/sv_user.c:4800-4801 + gate :4513 / counter :4547 | `SV_DebugWriteServerAntilagPositions(cl, antilag_players_present);` ; counter incremented only inside `if (sv_antilag.value)` loop `++antilag_players_present;` | MATCH (minor: fires once per SV_ExecuteClientMessage / inbound client packet, not strictly per server frame -- approx is fine) |
| 7 | Default: 0 | src/sv_user.c:80 | `{ "sv_debug_antilag", "0" }` (bare RegisterCvar-equivalent struct init, registered at :4926) | MATCH |
| 8 | Set by: server config | src/sv_user.c:4926 | `Cvar_Register(&sv_debug_antilag);` (no CVAR_* access flag; ordinary server cvar) | MATCH |

**V-pass notes:** Version confirmed 1.11-53-g18d0362. All five use-sites traced (registration sv_user.c:80 + sv_user.c:4926; read-sites sv_init.c:443 and sv_user.c:4800). Trace-discipline applied incl. callee-follow.

WHY TRACED-CLEAN (not a near-miss): every material clause has a located enforcing line whose code + adjacent comment matches.
- Core side-effect chain fully followed into callees: gate sv_user.c:4800 -> SV_DebugWriteServerAntilagPositions (sv_user.c:4303) -> MVDWrite_HiddenBlockBegin (sv_demo.c:485) -> MVDWrite_Begin(dem_multiple,0) guarded on sv.mvdrecording (sv_demo.c:469). The function's own doc-comment (sv_user.c:4298-4301 "Writes the position of clients, as rewound by antilag") and the actual payload write (:4344 `cl->laggedents[i].laggedpos`) independently confirm "rewound positions ... into the MVD demo." Not name/comment inference -- the enforcing code agrees.
- Second read-site sv_init.c:443 toggles the MVD_PEXT1_DEBUG_ANTILAG protocol-extension advertisement bit on `svs.mvdprotocolextension1` from the same cvar; consistent with the toggle/diagnostic framing. Not contradicted.
- Polarity/OFF-state: :4800 `&& sv_debug_antilag.value` -- nonzero records, zero suppresses. Correct.
- Default: registered struct {"sv_debug_antilag","0"} (sv_user.c:80), default 0. Correct.

Two nuances examined and deemed acceptable (still-true, fully traceable vagueness):
1. "each frame antilag is applied" -- write actually fires once per SV_ExecuteClientMessage (inbound client packet) when antilag_players_present>0; antilag_players_present is only nonzero inside the `if (sv_antilag.value)` rewind loop (sv_user.c:4513,:4547). Under normal QW the client sends ~one move per server frame, so "each frame" is a fair user-facing gloss; the load-bearing substance (only when antilag actually rewound a player) is correct.
2. The MVD block ALSO optionally carries the client's self-reported predicted positions (the MVD_PEXT1_ANTILAG_CLIENTPOS sub-block, sv_user.c:4334-4341) for comparison -- this is additive enrichment, not a contradiction of "rewound positions"; the server's rewound positions remain the dominant payload the description names.

Both nuances are minor vagueness that traced cleanly; neither is name/enum/string inference and neither contradicts code, so per the enum they do not demote below TRACED-CLEAN.

## flags_for_review

- [fyi/runtime-dead-suspect/vpass] sv_debug_antilag is registered UNCONDITIONALLY (sv_user.c:4926, outside any #ifdef), whereas every read-site is guarded by #ifdef MVD_PEXT1_DEBUG_ANTILAG (sv_init.c:439, sv_user.c:4799). In the oracle build the macro IS defined -- protocol.h:31 defines PROTOCOL_VERSION_MVD1 unconditionally, and inside that block protocol.h:69 defines MVD_PEXT1_DEBUG_ANTILAG unconditionally (no Makefile gate, unlike the commented-out SERVERSIDEWEAPON at :67); no #undef anywhere. So the cvar is live at this tag. BUT a build compiled without MVD_PEXT1_DEBUG_ANTILAG would expose a settable-yet-inert cvar (asymmetric guarding vs sibling sv_debug_weapons, whose registration at sv_user.c:4924 IS wrapped in #ifdef MVD_PEXT1_DEBUG). Not a description defect for this oracle; FYI only.
- [fyi/other/vpass] Direction subtlety in the antilag-debug subsystem worth a doc-author awareness note: the protocol-extension comment (protocol.h:69) describes the CLIENT->SERVER leg ('Send predicted positions to server'), i.e. the client uploading its own predicted positions for comparison. The cvar sv_debug_antilag as described here governs the SERVER->DEMO leg (SV_DebugWriteServerAntilagPositions writing the server's rewound positions, plus the client predictions when present, into the MVD). Both legs live under the same MVD_PEXT1_DEBUG_ANTILAG umbrella. The proposed description correctly scopes to the server-write leg and does not conflate the two; flagged only so any sibling description of the client leg stays distinct.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "sv_debug_antilag",
  "type": "cvar",
  "description": "Diagnostic toggle for antilag debugging. When on, the server writes the lag-compensated (rewound) positions of players into the recorded MVD demo, so the antilag system's per-shot rewinds can be inspected afterwards in a compatible tool.\n\n0 = off (no antilag debug data recorded).\n1 = on (record rewound positions each frame antilag is applied).\n\nDefault: 0.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_user.c:4800. Read use-sites: sv_user.c:4800 `if (antilag_players_present && sv_debug_antilag.value) { SV_DebugWriteServerAntilagPositions(cl, antilag_players_present); }` -- when on AND antilag actually rewound someone this frame, it calls the writer. The writer SV_DebugWriteServerAntilagPositions (sv_user.c:4303, comment :4301 \"Writes the position of clients, as rewound by antilag\") emits an mvdhidden_antilag_position block (header.type_id = mvdhidden_antilag_position, sv_user.c:4310) into the MVD via MVDWrite_HiddenBlockBegin/MVD_SZ_Write (sv_user.c:4319+), carrying per-player rewound positions, server_time and target_time -- hence \"rewound positions written into the recorded MVD demo.\" Second read site sv_init.c:443 `if (sv_debug_antilag.value) { svs.mvdprotocolextension1 |= MVD_PEXT1_DEBUG_ANTILAG; } else { ... &= ~... }` -- at init the toggle advertises/clears the MVD_PEXT1_DEBUG_ANTILAG protocol-extension bit so a compatible reader knows the demo may contain these blocks; this is mechanism (kept out of user doc per D20). Both sites are inside `#ifdef MVD_PEXT1_DEBUG_ANTILAG`. Polarity/threshold: write-site uses `.value` (truthy), init uses `.value` (truthy); both treat 0 as off, any non-zero as on -- so a 0/1 toggle. Default: registered literal `cvar_t sv_debug_antilag = { \"sv_debug_antilag\", \"0\" }` (sv_user.c:80), registered sv_user.c:4926 -> default 0. Set by: plain server cvar, no command handler -> server config / rcon. No KTX override (F-MV1: grep of ktx/src finds no sv_debug_antilag).",
  "description_proposed": null
}
```
