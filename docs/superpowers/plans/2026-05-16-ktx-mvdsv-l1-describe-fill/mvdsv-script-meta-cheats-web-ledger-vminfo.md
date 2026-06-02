# describe-fill-synthesis ledger -- mvdsv `vminfo`

- **project:** mvdsv
- **knob:** `vminfo` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-FIX
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vminfo: synthesized -- prints the loaded game-mod virtual machines and their run-mode/size; read-only, no args; admin-only -- origin=synthesized ref=src/vm.c:1568 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Prints a report of the virtual machine(s) the server has loaded to run its game mod (currently a single game-mod VM). For each one it lists the machine's name and how it is being run -- native code, compiled-on-load, or interpreted -- and for the compiled/interpreted forms three byte sizes: code length, instruction-table length, and data length. Read-only; takes no arguments.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| reports loaded VMs (header + loop) | src/vm.c:1572-1574 | `Con_Printf("Registered virtual machines:\n"); for (i=0;i<VM_COUNT;i++){ vm=&vmTable[i];` | MATCH |
| skips unnamed slots | src/vm.c:1575-1577 | `if (!vm->name){ continue; }` | MATCH |
| prints name | src/vm.c:1578 | `Con_Printf("%s : ", vm->name);` | MATCH |
| native / compiled / interpreted classification | src/vm.c:1579-1587 | `if (vm->dllHandle){Con_Printf("native\n");...} if (vm->compiled){..."compiled on load"} else {..."interpreted"}` | MATCH |
| code/table/data sizes for non-native | src/vm.c:1588-1590 | `"code length : %7i" vm->codeLength; "table length: %7i" vm->instructionCount*4; "data length : %7i" vm->dataMask+1` | MATCH |
| read-only, no args | src/vm.c:1568-1592 | handler is all Con_Printf; no Cmd_Argv / assignment | MATCH |
| Set-by admin-only (console/rcon) | src/pr2_exec.c:73 + src/sv_user.c:3299-3368 | `Cmd_AddCommand("vminfo", VM_VmInfo_f)`; not in ucmds[] | MATCH |

## Independent V-pass (cold; knob + description only)

**Classification: C-FIX**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|--------------------|------------------|---------|
| 1 | Is a command, read-only, takes no arguments | src/pr2_exec.c:73 ; src/vm.c:1568 | `Cmd_AddCommand ("vminfo", VM_VmInfo_f);` ; `void VM_VmInfo_f( void ) {` | MATCH -- registered as a console command; handler signature takes void; body is pure Con_Printf, no writes, no Cmd_Argv reads. |
| 2 | Prints a report of the virtual machines the server has loaded for running its game mod | src/vm.c:1572-1574 ; src/vm.h:28-32 | `Con_Printf( "Registered virtual machines:\n" );` ; `for ( i = 0 ; i < VM_COUNT ; i++ ) { vm = &vmTable[i];` ; enum `VM_BAD=-1, VM_GAME=0, VM_COUNT` | PARTIAL/NEAR-MISS -- header + loop confirm "report of registered VMs", and the single slot is VM_GAME (the game mod). But VM_COUNT==1: there is exactly ONE VM. The plural "virtual machines" / "for each one" framing is inferred from the loop+header, not from runtime multiplicity. |
| 3 | For each one it lists the machine's name | src/vm.c:1578 | `Con_Printf( "%s : ", vm->name );` | MATCH -- prints vm->name (guarded by the `if(!vm->name) continue;` skip at 1575). |
| 4 | ...and how it is being run -- native code, compiled-on-load, or interpreted | src/vm.c:1579-1587 | `if ( vm->dllHandle ) { Con_Printf( "native\n" ); continue; }` ; `if ( vm->compiled ) { Con_Printf( "compiled on load\n" ); } else { Con_Printf( "interpreted\n" ); }` | MATCH -- exact three states: "native" (dllHandle set), "compiled on load" (compiled), else "interpreted". |
| 5a | ...for interpreted/compiled forms also its code size | src/vm.c:1588 ; src/vm_local.h:203 | `Con_Printf( "    code length : %7i\n", vm->codeLength );` ; `unsigned int codeLength;  // just for information` | MATCH -- "code length" field = codeLength; "code size" is a fair rename. |
| 5b | ...instruction count | src/vm.c:1589 ; src/vm_local.h:182 | `Con_Printf( "    table length: %7i\n", vm->instructionCount*4 );` | MISMATCH -- the printed line is labeled "table length" and prints `instructionCount * 4` (a byte size of the instruction table), NOT the instruction count. The output value is 4x the count and the label is "length", not "count". Asserting the report shows an "instruction count" contradicts the enforcing line. |
| 5c | ...and data size | src/vm.c:1590 ; src/vm_local.h:205 | `Con_Printf( "    data length : %7i\n", vm->dataMask + 1 );` | MATCH -- "data length" = dataMask+1 (data-segment size, power-of-two from the mask); "data size" is a fair rename. |
| 6 | Native form excluded from the size lines | src/vm.c:1580-1581 | `Con_Printf( "native\n" ); continue;` | MATCH -- native entries `continue` before the three size Con_Printf calls, so sizes print only for compiled/interpreted. Description's "for the interpreted/compiled forms also" is correct. |
| 7 | Set by: server console / rcon (access class) | src/pr2_exec.c:73 ; src/sv_user.c:3299-3299 (ucmds absent) ; src/sv_main.c:1828 ; src/cmd.c:916-935 | `Cmd_AddCommand ("vminfo", VM_VmInfo_f);` ; (no `vminfo` in `ucmds[]`) ; `Cmd_ExecuteString(str);` (rcon path) ; `if (cmd->function) cmd->function ();` | MATCH -- registered in the console command table only; NOT in the client ucmds[] table; rcon reaches it via SVC_RemoteCommand -> Cmd_ExecuteString with no per-command gate. Console + authenticated rcon, not players. |

**V-pass notes:** C-FIX driven by clause 5b. The description states the report lists "instruction count" but the enforcing line (vm.c:1589) prints `Con_Printf("    table length: %7i\n", vm->instructionCount*4)` -- the field is LABELED "table length" and the VALUE is instructionCount*4 (a byte length, four times the count). A user running vminfo sees "table length: <N>", never an instruction count; the printed number is not the count. This is a clause that contradicts its enforcing line on both value (the *4) and semantic label (length vs count), so it is C-FIX (wrong vs code), not merely an untraced inference. The word "instructionCount" is the struct FIELD name (vm_local.h:182), which is almost certainly where the synth inferred "instruction count" -- but that field is multiplied by 4 and re-labeled at the print site.

Suggested minimal fix: replace "instruction count" with the actual reported field, e.g. "instruction-table size" or "code-table length" -- the three reported sizes are code length (codeLength), table length (instructionCount*4), and data length (dataMask+1). Keep it user-facing as byte sizes, not a count.

Everything else traced clean against vm.c:1568-1592 (handler), pr2_exec.c:73 (registration, unconditionally reached via SV_Init -> PR_Init/PR2_Init at sv_main.c:4049), and the access-class chain. Single handler definition, no override; the file is USE_PR2-gated (standard dedicated-server build). The plural "virtual machines / for each one" (clause 2) is a secondary near-miss: VM_COUNT==1 (only VM_GAME exists), so the report always describes exactly one VM; the plural reads from the loop/header, not reality. I did not weight this into the classification because C-FIX already dominates, but a re-synth should consider singularizing or hedging it ("the virtual machine(s)... -- currently a single game-mod VM").

## flags_for_review

- [review/contradiction/vpass] Clause 5b 'instruction count' contradicts vm.c:1589: the report prints `instructionCount*4` under the label 'table length' (a byte size, 4x the count), never a raw instruction count. The synth likely inferred 'count' from the struct field name vm->instructionCount (vm_local.h:182) without tracing the *4 and the re-label at the print site. This is the C-FIX trigger.
- [fyi/other/vpass] Multiplicity overstated: vmIndex_t enum is {VM_BAD=-1, VM_GAME=0, VM_COUNT} so VM_COUNT==1 and vmTable has exactly one slot (VM_GAME). The loop in VM_VmInfo_f always iterates once; the header 'Registered virtual machines:' and the description's plural 'virtual machines / for each one' read as multiple but in practice there is a single game-mod VM. mvdsv is a forked-down Quake3 QVM system that dropped VM_CGAME/VM_UI. Consider singularizing in a re-synth.
- [fyi/other/vpass] The three printed sizes are derived/rounded, not raw struct lengths: 'data length' prints dataMask+1 (mask-rounded power-of-two), while the struct also carries a distinct exactDataLength/dataLength (vm_local.h:206-207) that is NOT what vminfo reports. 'code length' carries the source comment 'just for information' (vm_local.h:203). 'data size'/'code size' renames are fair, but a precise re-synth could note these are the in-memory/mask-rounded figures.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vminfo",
  "type": "command",
  "description": "Prints a report of the virtual machine(s) the server has loaded to run its game mod (currently a single game-mod VM). For each one it lists the machine's name and how it is being run -- native code, compiled-on-load, or interpreted -- and for the compiled/interpreted forms three byte sizes: code length, instruction-table length, and data length. Read-only; takes no arguments.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/vm.c:1568. Registered Cmd_AddCommand(\"vminfo\", VM_VmInfo_f) at src/pr2_exec.c:73. Enforcing handler VM_VmInfo_f at src/vm.c:1568-1592: prints 'Registered virtual machines:' then loops i over VM_COUNT entries of vmTable[] (src/vm.c:1573-1574; vmTable declared src/vm.c:207 struct vm_s vmTable[VM_COUNT]), skipping unnamed slots (src/vm.c:1575-1577). For each it prints vm->name (src/vm.c:1578), then 'native' when vm->dllHandle is set (src/vm.c:1579-1582), else 'compiled on load' when vm->compiled else 'interpreted' (src/vm.c:1583-1587), and for the non-native case the code length, table length (instructionCount*4), and data length (dataMask+1) (src/vm.c:1588-1590). Pure Con_Printf introspection, no state change, no args read. Whole handler is inside #ifdef USE_PR2 (src/vm.c context; PR2 is the standard MVDSV build, PR_Init->PR2_Init via src/pr2.h:32). Access-class: Cmd_AddCommand-only, ABSENT from ucmds[] (src/sv_user.c:3299-3368) -> admin-only server console / rcon; not on the master-rcon blocklist (src/sv_main.c:1754-1764). No KTX override (grep ktx/src \"vminfo\" = none); this is an engine VM-subsystem command. [MAIN-HG2 edit: 'instruction count' -> 'instruction-table length'; vm.c:1589 prints instructionCount*4 under the label 'table length' (a byte size, not a count); VM_COUNT==1 so the report covers a single VM.]",
  "description_proposed": null
}
```
