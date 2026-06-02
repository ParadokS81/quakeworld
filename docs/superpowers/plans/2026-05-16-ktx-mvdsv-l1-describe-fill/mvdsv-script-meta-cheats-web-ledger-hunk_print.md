# describe-fill-synthesis ledger -- mvdsv `hunk_print`

- **project:** mvdsv
- **knob:** `hunk_print` (command)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified TRACED-CLEAN
- **origin:** workflow chunk-runner `script-meta-cheats-web` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:hunk_print: synthesized -- admin-only console diagnostic; prints the hunk memory map; any arg switches grouped-totals to per-block detail -- origin=synthesized ref=src/zone.c:155 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Console diagnostic that prints a map of the server's main memory arena (the "hunk"): total size, each allocation's name and size, the kilobytes still remaining, the running block count, and how much of the low and high ends are in use. It only reports memory state; it allocates and frees nothing.
>
> hunk_print = group allocations that share a name and print one total line per name (the default).
> hunk_print <any arg> = print every individual allocation block separately, no grouping.
>
> Set by: server console / rcon.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| any argument => print every individual block | src/zone.c:157 | `qbool all = Cmd_Argc() != 1;` | yes |
| per-block line shows ptr/size/name only when all | src/zone.c:134-135 | `if (all) { Con_Printf("%8p :%8i %8s\n", h, h->size, name); }` | yes |
| default groups same-name allocations into one TOTAL line | src/zone.c:139-142 | `if (next==endlow||next==endhigh||strncmp(h->name,next->name,8)) { if (!all) Con_Printf("...kb %8s (TOTAL)...")` | yes |
| prints total hunk size | src/zone.c:102 | `Con_Printf("          :%8i total hunk size\n", hunk_size);` | yes |
| prints kB remaining | src/zone.c:109 | `Con_Printf("        :%8ikb REMAINING\n", (hunk_size - hunk_low_used - hunk_high_used) / 1024);` | yes |
| prints total block count | src/zone.c:151 | `Con_Printf("%8i total blocks\n", totalblocks);` | yes |
| prints high/low used | src/zone.c:152 | `Con_Printf("High used %i, low used %i\n", hunk_high_used, hunk_low_used);` | yes |
| reports only, no alloc/free | src/zone.c:85-153 | body is Con_Printf + read-only walk; only side effect is Sys_Error consistency abort | yes |
| admin-only (console/rcon), no client path | src/zone.c:596 ; src/sv_user.c:3338-3384 | registered only via Cmd_AddCommand; absent from ucmds[] | yes |
| not master-rcon-restricted | src/sv_main.c:1754-1764 | blocklist set excludes hunk_print | yes |
| no KTX override | ktx/src (grep) | grep 'hunk_print' in ktx/src returns nothing | yes |

## Independent V-pass (cold; knob + description only)

**Classification: TRACED-CLEAN**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | Console diagnostic / registered command | zone.c:596 | `Cmd_AddCommand("hunk_print", Hunk_Print_f);` | MATCH |
| 2 | Prints total hunk size | zone.c:102 | `Con_Printf("          :%8i total hunk size\n", hunk_size);` | MATCH |
| 3 | Prints each allocation's name and size | zone.c:135 | `Con_Printf("%8p :%8i %8s\n", h, h->size, name);` (under `if (all)`) | MATCH |
| 4 | Prints kilobytes still remaining | zone.c:109 | `Con_Printf("        :%8ikb REMAINING\n", (hunk_size - hunk_low_used - hunk_high_used) / 1024);` | MATCH |
| 5 | Prints "the running block count" | zone.c:151 | `Con_Printf("%8i total blocks\n", totalblocks);` | MATCH (imprecise framing -- see notes; what prints is a single end-of-output total, not a running counter; per-group `count` at :128/:143 is incremented but NEVER printed) |
| 6 | Prints how much of low and high ends in use | zone.c:152 | `Con_Printf("High used %i, low used %i\n", hunk_high_used, hunk_low_used);` | MATCH |
| 7 | Side-effect: allocates and frees nothing | zone.c:85-153 (whole `Hunk_Print` body) | reads `hunk_base/hunk_size/hunk_low_used/hunk_high_used` + ptr-walk + `Con_Printf`; NO `Hunk_Alloc`/`Hunk_Free`/`Cache_*` alloc-free calls | MATCH (caveat: corruption-only `Sys_Error` at :121/:124 -- error path, not a memory side effect) |
| 8 | DEFAULT (no arg) = group by name, one total line per name | zone.c:157 -> :140-141 | `qbool all = Cmd_Argc() != 1;` -> `if (!all) { Con_Printf("          :%8ikb %8s (TOTAL)\n", sum / 1024, name); }` | MATCH (grouping is per ADJACENT same-name run via `strncmp(h->name,next->name,8)` at :139; effectively per-name in the stack allocator) |
| 9 | `hunk_print <any arg>` = print every block separately, no grouping | zone.c:157 -> :134-136 | `all = Cmd_Argc() != 1` (any extra arg -> argc!=1 -> all=true); `if (all) { Con_Printf("%8p :%8i %8s\n", ...); }` and totals suppressed by `if (!all)` | MATCH |
| 10 | Set by: server console / rcon | zone.c:596 (plain 2-arg `Cmd_AddCommand`, no `CF_` flag) + sv_main.c:1701-1708,1828 | `Cmd_AddCommand("hunk_print", Hunk_Print_f);` (no access flag) ; rcon: `Rcon_Validate(...)` then `Cmd_ExecuteString(str);` | MATCH |

**V-pass notes:** Oracle confirmed: git describe == 1.11-53-g18d0362. enforce-trace-discipline applied per-clause; followed Hunk_Print_f -> Hunk_Print callee, and the rcon dispatch chain into Cmd_ExecuteString.

Verdict TRACED-CLEAN. All ten material clauses map to located, verified enforcing lines. Adjacent comment at zone.c:81-83 ("If 'all' is specified, every single allocation is printed. Otherwise, allocations with the same name will be totaled up before printing.") independently corroborates clauses 8-9. Output line set (zone.c:102/109/135/141/151/152) corroborates clauses 2-6.

The two imprecisions are still-true minor vagueness that was fully enforcement-traceable, which the discipline explicitly admits under TRACED-CLEAN -- NOT name/enum/string/comment-only inference, and NOT contradictions:

(a) "the running block count" -- the value that reaches the console (zone.c:151) is `totalblocks`, printed ONCE at the end, i.e. a single grand total, not a running/incremental counter. The internal accumulator is running, so the phrase is defensible, but "running ... count" slightly over-implies an incremental display. The per-name-group `count` variable (the thing that WOULD be a running count) is incremented at :128 and reset at :143 but is never printed anywhere in this function -- vestigial leftover from id-Quake's original Hunk_Print. A block count IS printed, so the clause is true and traceable; the wording could tighten to "the total block count".

(b) "one total line per name" -- grouping flushes on the immediately-NEXT block having a different name (`strncmp(h->name, next->name, 8)`, zone.c:139), i.e. per adjacent same-name RUN, not a global group-by-name. In the hunk stack allocator same-name allocations are contiguous, so the observable result is per-name; the framing is correct for the normal case.

Build-liveness checked (not a runtime-dead suspect): mvdsv builds with SERVERONLY (CMakeLists.txt:169). In the SERVERONLY, non-WITH_DP_MEM default build, Cache_Init (zone.c:579) calls Cache_Init_Commands (zone.c:586, guarded `#ifndef WITH_DP_MEM`) which registers hunk_print. WITH_DP_MEM is a non-default alt-allocator option; its alternate registration path is the documented "added after Cmd_Init()" branch. Command is live in the standard server binary.

## flags_for_review

- [fyi/other/vpass] zone.c:88,93,128,143 -- local `count` (per-name-group counter) is incremented and reset but NEVER passed to any Con_Printf; it is a vestigial leftover from id-Quake's original Hunk_Print where it was displayed. Only `totalblocks` reaches output (zone.c:151). Pure code-hygiene observation in upstream-inherited code; does not affect hunk_print behavior. FYI only.
- [fyi/other/vpass] Description phrase 'the running block count' slightly over-implies an incremental/running display; the user actually sees one end-of-output total-blocks line (zone.c:151). Optional tightening to 'the total block count'. Still true and enforcement-traceable, so it does not move the row off TRACED-CLEAN.
- [fyi/other/vpass] Grouping is per ADJACENT same-name run (strncmp against the immediately-next block, zone.c:139), not a global group-by-name; non-adjacent same-name runs would each emit a TOTAL line. Indistinguishable from per-name in the contiguous stack allocator, so 'one total line per name' is correct for normal operation. FYI for wording precision.
- [fyi/runtime-dead-suspect/vpass] WITH_DP_MEM build option moves command registration to a post-Cmd_Init() path (zone.c:584-586 comment). Default mvdsv build (SERVERONLY, no WITH_DP_MEM per CMakeLists.txt:169) registers hunk_print via Cache_Init->Cache_Init_Commands. Verified live in default build; flagging the build-config branch only for completeness.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: god=C-FIX, removeip=C-FIX, addip=C-FIX, writeip=C-FIX, nslookup=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "hunk_print",
  "type": "command",
  "description": "Console diagnostic that prints a map of the server's main memory arena (the \"hunk\"): total size, each allocation's name and size, the kilobytes still remaining, the running block count, and how much of the low and high ends are in use. It only reports memory state; it allocates and frees nothing.\n\nhunk_print = group allocations that share a name and print one total line per name (the default).\nhunk_print <any arg> = print every individual allocation block separately, no grouping.\n\nSet by: server console / rcon.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/zone.c:155. Wrapper Hunk_Print_f (src/zone.c:155-160) sets `qbool all = Cmd_Argc() != 1;` then calls Hunk_Print(all) -- so bare command (argc==1) => all=false; ANY argument (argc!=1) => all=true. This is the enforcing line for the '<any arg> = print every block' clause (no specific token is parsed -- presence of any arg flips it). Hunk_Print(all) (src/zone.c:85-153) prints: `\"%8i total hunk size\"` (line 102, total size), per-block `\"%8p :%8i %8s\"` name+size only when `if (all)` (line 134-135), per-name total `\"%8ikb %8s (TOTAL)\"` when `if (!all)` at a name boundary (line 139-142, grouping = strncmp(h->name,next->name,8)), `\"%8ikb REMAINING\"` (line 109), `\"%8i total blocks\"` (line 151), `\"High used %i, low used %i\"` (line 152). All output via Con_Printf; the only non-print effects are Sys_Error on trashed sentinel / bad size (consistency checks, line 121/124), i.e. it does not allocate or free. Default-grouping vs per-block split traced to the `if (all)` / `if (!all)` pair. Access-class: registered ONLY via Cmd_AddCommand(\"hunk_print\", Hunk_Print_f) (src/zone.c:596); not in src/sv_user.c ucmds[] => admin-only (console / rcon). Not in regular-rcon blocklist (src/sv_main.c:1754-1764) => bare 'server console / rcon'. F-MV1: grep ktx/src 'hunk_print' => no override. Worked example justified by the optional any-arg toggle (operator 'show usage' shape); Default omitted -- the no-arg behavior IS the default and is described inline.",
  "description_proposed": null
}
```
