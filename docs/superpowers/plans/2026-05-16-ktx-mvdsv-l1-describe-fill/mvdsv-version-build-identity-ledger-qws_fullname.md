# describe-fill-synthesis ledger -- mvdsv `qws_fullname`

- **project:** mvdsv
- **knob:** `qws_fullname` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `version-build-identity` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:qws_fullname: synthesized -- read-only engine full-name identity string, no engine reader (exposed-by-design), KTX reads for version display -- origin=synthesized ref=src/sv_main.c:3415 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Read-only identity string holding the server engine's full descriptive name ("MVDSV: MultiView Demo SerVer"). It identifies the engine by its full title; a server admin cannot change it.
>
> Default: MVDSV: MultiView Demo SerVer (fixed at compile time).
> Set by: engine, at compile time -- read-only, cannot be changed by config or rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| holds full engine title "MVDSV: MultiView Demo SerVer" | src/sv_main.c:3415 + src/version.h:69 | `qws_fullname = { "qws_fullname", SERVER_FULLNAME, CVAR_ROM }` ; `#define SERVER_FULLNAME "MVDSV: MultiView Demo SerVer"` | MATCH |
| read-only, admin cannot change | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` | MATCH |
| no engine behavioral reader (identity only) | (tree-wide grep) | no `qws_fullname.value`/`.string`/`Cvar_String("qws_fullname")` in mvdsv/src | MATCH |
| not in serverinfo | src/sv_main.c:3415 | flag is CVAR_ROM, no CVAR_SERVERINFO | MATCH |
| KTX reads (not writes) for version display | ktx/src/commands.c:1664-1666 | `cvar_string("qws_fullname")` -> "Name" row | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|--------------------|---------|
| 1 | Read-only (CVAR_ROM) cvar | src/sv_main.c:3415 / src/cvar.h:63 | `static cvar_t qws_fullname = { "qws_fullname", SERVER_FULLNAME, CVAR_ROM };` / `#define CVAR_ROM (1<<1) // read only` | MATCH |
| 2 | Holds full descriptive name value "MVDSV: MultiView Demo SerVer" | src/version.h:69 | `#define SERVER_FULLNAME "MVDSV: MultiView Demo SerVer"` | MATCH |
| 3 | Value fixed at compile time | src/version.h:69 + src/sv_main.c:3415 | string literal `#define` consumed by static initializer; never reassigned (only 2 use-sites of the cvar tree-wide: init + Cvar_Register) | MATCH |
| 4 | Default = "MVDSV: MultiView Demo SerVer" (the REGISTERED default per WI-2) | src/cvar.c:267-269 | `value = variable->string; variable->string = Q_strdup(""); Cvar_SetROM (variable, value);` -- registration sets the cvar's own initializer string (SERVER_FULLNAME), not a shipped-cfg value | MATCH |
| 5 | A server admin cannot change it (read-only) -- write gate | src/cvar.c:134-135 | `if (var->flags & CVAR_ROM)` / `return;` -- Cvar_Set early-returns before mutating a ROM cvar | MATCH |
| 6 | Cannot be changed by config / console `set` | src/cvar.c:497 (Cvar_Set_f) + 306 (Cvar_Command) -> 134 | `Cvar_Set (var, Cmd_Argv(2));` and `Cvar_Set (v, string);` both reach the ROM gate at cvar.c:134 | MATCH |
| 7 | Cannot be changed by rcon | src/sv_main.c:1828 -> src/cmd.c:945 -> src/cvar.c:134 | `Cmd_ExecuteString(str);` (SVC_RemoteCommand, post password-validate) -> `if (Cvar_Command())` -> Cvar_Set ROM gate; `set` via rcon hits Cvar_Set_f -> same gate | MATCH |
| 8 | Set by: engine (engine does not overwrite it post-init) | tree-wide grep of `Cvar_SetROM` | qws_fullname appears in ZERO `Cvar_SetROM` calls (SetROM is the only ROM-bypass; it is called on serverdemo / sv_local_addr / sv_paused / sv_bspversion / version etc., never qws_fullname) | MATCH |
| 9 | (implicit) no other consumer reads/broadcasts it | tree-wide grep `qws_fullname` / `SERVER_FULLNAME` | only sv_main.c:3415 (init) + 3590 (register); no Cvar_Find("qws_fullname"), not CVAR_SERVERINFO, no status-echo, no VM read | MATCH (no contradicting consumer) |

**V-pass notes:** TRACED-CLEAN. Every material clause (read-only, value, compile-time-fixed, registered default, admin-cannot-change, config/console/rcon immunity, engine-set) maps to a located + verified enforcing line, including adjacent comments.

Enforcement architecture verified end-to-end: the read-only behavior is NOT enforced at the declaration site (sv_main.c:3415, which only DECLARES the CVAR_ROM flag). The single enforcing line is the ROM gate inside Cvar_Set at cvar.c:134-135 (`if (var->flags & CVAR_ROM) return;`). I traced EVERY write path to that gate:
- console direct cvar command: Cvar_Command (cvar.c:306) -> Cvar_Set
- `set` command: Cvar_Set_f (cvar.c:497) -> Cvar_Set
- rcon: SVC_RemoteCommand validates password then Cmd_ExecuteString (sv_main.c:1828) -> Cvar_Command (cmd.c:945) -> Cvar_Set
- server-mod QC/VM: PF_cvar_set (pr_cmds.c:1193) -> Cvar_Set
All terminate at the same gate. The ONLY ROM bypass is Cvar_SetROM (cvar.c:168, which temporarily clears CVAR_ROM at line 176, sets, then restores) -- and a tree-wide grep confirms Cvar_SetROM is NEVER called on qws_fullname. The value is written exactly once, at registration (cvar.c:269), from the static initializer string SERVER_FULLNAME. This satisfies the trace-discipline callee-follow requirement: I did not stop at the declaration; I followed into the helper that enforces the assertion and verified no bypass touches this specific cvar.

WI-2 (default) satisfied: registered default is the cvar's own initializer (SERVER_FULLNAME = "MVDSV: MultiView Demo SerVer"), verified via Cvar_Register at cvar.c:267-269, not a shipped-cfg value. The proposed "Default" and "fixed at compile time" framing are exactly correct.

Adjacent-comment check passed: cvar.h:63 comment "// read only" affirms (does not invert) the polarity; no nearby comment contradicts.

## flags_for_review

- [fyi/other/vpass] The description's verb 'advertises the engine's full title' is a soft framing claim. qws_fullname does NOT carry CVAR_SERVERINFO (verified: flag is CVAR_ROM only, sv_main.c:3415) and has zero consumers in the source beyond registration -- it is not mirrored to serverinfo, not echoed in the status response, not read by the VM. So it is a queryable read-only identity string a client/admin can READ (via cvar print), but the engine does not actively broadcast/advertise it anywhere. 'Advertises' is mildly generous but defensible as descriptive flavour for a public read-only identity cvar; it asserts no polarity/threshold/scope behavior, so it carries no enforcing-line obligation and does not move the classification. FYI only.
- [fyi/hidden-family/vpass] Sibling cvar qwm_fullname (sv_main.c:3423) is a separate mod-info placeholder: empty default, NO CVAR_ROM flag -- so it IS writable. Distinct entity from qws_fullname; flagged only to prevent a future confusion that the qws_* read-only treatment applies to the qwm_* family (it does not).

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_paused=C-FIX, serverdemo=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "qws_fullname",
  "type": "cvar",
  "description": "Read-only identity string holding the server engine's full descriptive name (\"MVDSV: MultiView Demo SerVer\"). It identifies the engine by its full title; a server admin cannot change it.\n\nDefault: MVDSV: MultiView Demo SerVer (fixed at compile time).\nSet by: engine, at compile time -- read-only, cannot be changed by config or rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/sv_main.c:3415. Declared CVAR_ROM at src/sv_main.c:3415 `static cvar_t qws_fullname = { \"qws_fullname\", SERVER_FULLNAME, CVAR_ROM };`; positional initializer seeds string=SERVER_FULLNAME, flags=CVAR_ROM (struct order src/cvar.h:67-69). SERVER_FULLNAME is the compile-time macro \"MVDSV: MultiView Demo SerVer\" (src/version.h:69). Read-only enforced at src/cvar.c:134-135 `if (var->flags & CVAR_ROM) return;`. Registered at src/sv_main.c:3590. Tree-wide grep of mvdsv/src found NO engine read of qws_fullname (only declaration+registration) -- exposed-by-design identity cvar, NOT dead. No CVAR_SERVERINFO, so not in serverinfo. Cross-codebase (D20 -> reasoning): KTX READS (no override) qws_fullname in its server-info/version display command at ktx/src/commands.c:1664-1666 (the \"Name\" row). Verdict synthesized not affirmed: only the dev group-header comment exists.",
  "description_proposed": null
}
```
