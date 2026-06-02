# describe-fill-synthesis ledger -- mvdsv `serverdemo`

- **project:** mvdsv
- **knob:** `serverdemo` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `spectator-voip-mod-system` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:serverdemo: synthesized -- read-only (CVAR_ROM) engine-set current demo filename, empty when not recording, serverinfo-published -- origin=synthesized ref=src/sv_demo.c:858 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only. Shows the filename of the demo the server is currently recording, and is empty when the server is not recording. It is published in the server info so server browsers can show that a demo is in progress.
>
> Default: empty.
> Set by: the engine (read-only) -- it is updated automatically when server-side recording starts and stops.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| read-only + serverinfo-published | src/sv_main.c:168 | `cvar_t serverdemo = {"serverdemo","",CVAR_SERVERINFO | CVAR_ROM};` | MATCH |
| set to demo filename on record start | src/sv_demo.c:858 | `Cvar_SetROM(&serverdemo, dst->name);` | MATCH |
| cleared to empty on cancel | src/sv_demo.c:964 | `Cvar_SetROM(&serverdemo, "");` | MATCH |
| cleared to empty on completion/stop | src/sv_demo.c:1002 | `Cvar_SetROM(&serverdemo, "");` | MATCH |
| default empty | src/sv_main.c:168 | `{"serverdemo","",...}` | MATCH |
| engine-set (not operator) | src/sv_demo.c:858,964,1002 | all writes are `Cvar_SetROM` | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|---|---|---|---|
| 1 | Read-only (settability) | src/cvar.c:134-135 (flag origin src/sv_main.c:168) | `if (var->flags & CVAR_ROM)` / `return;` ; registration `cvar_t serverdemo = {"serverdemo","",CVAR_SERVERINFO | CVAR_ROM};` | MATCH -- a user `set serverdemo X` hits the CVAR_ROM guard in Cvar_Set and returns without mutating. CVAR_ROM defined cvar.h:63 `// read only`. |
| 2 | Shows the filename of the demo currently recording | src/sv_demo.c:858 (value source :850-852) | `Cvar_SetROM(&serverdemo, dst->name);` where `s = name + strlen(name); while (*s != '/') s--; strlcpy(dst->name, s+1, sizeof(dst->name));` | MATCH -- set inside SV_InitRecordFile (opens the recording file) to the basename after the last '/'. Same value broadcast to players at :856 ("Server starts recording ... s+1"). "Filename" precisely = basename, not full path. |
| 3 | Empty when the server is not recording (OFF-state) | src/sv_demo.c:964 and :1002 | `Cvar_SetROM(&serverdemo, "");` (both inside SV_MVDStop, header comment :920 "stop recording a demo") | MATCH -- :964 error/cancel path (reason 2/3/4), :1002 normal-completion path. Both clear to "" when recording stops. Registered default "" covers the never-recorded state. |
| 4 | Published in serverinfo so browsers can show demo in progress | src/sv_main.c:168 (flag) -> src/cvar.c:157-159 -> src/sv_ccmds.c:1383-1385 | `CVAR_SERVERINFO` ; `if (var->flags & CVAR_SERVERINFO) { SV_ServerinfoChanged (var->name, var->string); }` ; `Info_SetValueForKey (svs.info, key, string, MAX_SERVERINFO_STRING); SV_SendServerInfoChange (key, string);` | MATCH -- SetROM routes through Cvar_Set, which (CVAR_SERVERINFO set) mirrors the value into svs.info and broadcasts. CVAR_SERVERINFO defined cvar.h:62 `// mirrored to serverinfo`. The browser-rendering clause is purpose/rationale; the enforced mechanism (non-empty filename mirrored to serverinfo when recording, empty otherwise) is fully traced. |
| 5 | Default: empty | src/sv_main.c:168 | `cvar_t serverdemo = {"serverdemo","",CVAR_SERVERINFO | CVAR_ROM};` | MATCH -- registered default is the empty string (WI-2: verified at the cvar_t initializer, not a shipped cfg). |
| 6 | Set by the engine; auto-updated when recording starts and stops | start src/sv_demo.c:858 (SV_InitRecordFile); stop src/sv_demo.c:964,:1002 (SV_MVDStop); mechanism src/cvar.c:168-179 | `Cvar_SetROM` -> `saved_flags = var->flags; var->flags &= ~CVAR_ROM; Cvar_Set (var, value); var->flags = saved_flags;` | MATCH -- Cvar_SetROM is the engine-only write path (temporarily clears CVAR_ROM); exactly three call sites, all in the server MVD recording lifecycle (one start, two stop). No init-time clear needed (default already ""). |

**V-pass notes:** VERDICT: TRACED-CLEAN. Oracle confirmed at mvdsv 1.11-53-g18d0362.

Wide-grep found exactly 6 serverdemo references tree-wide (server.h:734 extern decl; sv_main.c:168 registration init; sv_main.c:3504 Cvar_Register; sv_demo.c:858 set-to-filename; sv_demo.c:964 + :1002 set-to-empty). All three WRITE sites are in sv_demo.c and were traced; no read-site outside the cvar's own serverinfo mirroring exists in this tree (the value is consumed by external server browsers via the serverinfo string svs.info, not by an internal MVDSV reader).

All 6 material clauses map to located, verified enforcing lines (incl. adjacent comments cvar.h:62-63 and the SV_MVDStop header comment). The start/stop mechanism is symmetric and complete: SV_InitRecordFile writes the basename on record start; SV_MVDStop clears to "" on both the error/cancel and normal-completion paths. The CVAR_ROM read-only guard, CVAR_SERVERINFO mirror, and Cvar_SetROM engine-write mechanism are all enforce-traced through their callees (cvar.c Cvar_Set/Cvar_SetROM and sv_ccmds.c SV_ServerinfoChanged), satisfying the callee-follow rule -- no clause stops at a caller.

No flavour-C inference: no clause derives from the knob name, an announce string, an enum name, or a config comment without an enforcing read-site. "Filename" is precise (basename = s+1 after last '/', the same string broadcast to players). Default "" verified at the registered cvar_t initializer per WI-2, not from a shipped cfg.

PROC-1: the one judgment-shaped residual is clause 4's trailing rationale "so server browsers can show that a demo is in progress" -- this is the documented PURPOSE of CVAR_SERVERINFO, not a separately enforced behavior, and the browser is downstream of this tree. It is correct framing (the enabling mechanism is fully traced) and does not lower the classification, but I surface it rather than silently absorbing it. Recorded as FYI flag.

## flags_for_review

- [fyi/other/vpass] Clause 4's tail 'so server browsers can show that a demo is in progress' is a rationale for the CVAR_SERVERINFO publication, not a behavior enforced inside this tree (the browser is a downstream external consumer of svs.info). The enabling mechanism -- non-empty filename mirrored to serverinfo while recording, empty otherwise -- is fully enforce-traced (cvar.c:157-159 -> sv_ccmds.c:1383-1385). Correct framing, not a defect; noted for PROC-1 transparency (judgment surfaced, not absorbed).
- [fyi/other/vpass] serverdemo has NO internal read-site in the mvdsv tree -- the only references besides the 3 engine writes are the extern decl, the cvar_t initializer, and Cvar_Register. Its sole consumer is external (server browsers reading the serverinfo string). This is expected for a CVAR_SERVERINFO|CVAR_ROM status mirror and is NOT a runtime-dead suspect: the write sites are live (driven by the record/stop command lifecycle) and the value is exported via svs.info, which IS consumed off-box. Flagging only so the no-internal-reader shape is on record, consistent with the chunk's prior qwm_*/qws_* identity-bank findings.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_spectatormaxspeed=C-FIX, allow_download_models=C-FIX, sv_gravity=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "serverdemo",
  "type": "cvar",
  "description": "Read-only. Shows the filename of the demo the server is currently recording, and is empty when the server is not recording. It is published in the server info so server browsers can show that a demo is in progress.\n\nDefault: empty.\nSet by: the engine (read-only) -- it is updated automatically when server-side recording starts and stops.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_demo.c:858. Read-only / engine-set: registered CVAR_SERVERINFO | CVAR_ROM at src/sv_main.c:168 (cvar_t serverdemo = {\"serverdemo\",\"\",CVAR_SERVERINFO | CVAR_ROM}), so it cannot be set by an operator and (CVAR_SERVERINFO) is published in the serverinfo string. All writes are Cvar_SetROM: set to the demo basename dst->name when recording begins (src/sv_demo.c:858, immediately after the 'Server starts recording' broadcast), and cleared to \"\" on cancel (src/sv_demo.c:964) and on normal completion/stop (src/sv_demo.c:1002). Registered default empty string at src/sv_main.c:168. Therefore: holds the current demo filename while recording, empty otherwise. The chunk brief flagged this as read-only (serverdemo, sv_main.c:168); confirmed against the CVAR_ROM flag + the Cvar_SetROM-only write set.",
  "description_proposed": null
}
```
