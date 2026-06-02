# describe-fill-synthesis ledger -- mvdsv `vm_rtChecks`

- **project:** mvdsv
- **knob:** `vm_rtChecks` (cvar)
- **anchor_version:** `1.11-53-g18d0362`
- **verdict:** `synthesized` -- high confidence; independently V-pass-verified C-NEAR-MISS
- **origin:** workflow chunk-runner `gameplay-limits` -- synthesis + independent cold V-pass

## Halt verdict

```
mvdsv:vm_rtChecks: synthesized -- x86-JIT runtime-safety-check bitmask, 4 bits (1 pstack / 2 opstack / 4 jump-range / 8 data-bounds) each gating an emitted guard, default 1, all per-bit enforce-traced TRACED-CLEAN -- origin=synthesized ref=src/vm_x86.c:2124 anchor=1.11-53-g18d0362
```

## Final `description` (user-facing, D20 shape)

> Selects which runtime safety checks the server's QuakeC virtual machine performs on the loaded game code while it runs. The value is a bitmask -- add the numbers for the checks you want.
>
> 1 = program-stack overflow check
> 2 = operation-stack overflow check
> 4 = jump-target range check (keeps jumps inside valid code)
> 8 = memory-access bounds check (keeps reads and writes inside the VM's own data)
>
> Turning a bit off removes that check, letting the game code run slightly faster but with less protection against a malformed or malicious progs. With all bits clear (0), no checks are performed.
>
> This applies to servers running the just-in-time compiled game VM (the default on 64-bit builds), and the value is read when the game code is loaded -- a change takes effect on the next map load. On builds that run the bytecode interpreter these checks are always on regardless of this setting.
>
> Default: 1.
> Set by: server config.

## Per-clause enforce-trace table (synthesis)

| clause | file:line | snippet | verified |
|---|---|---|---|
| registered default 1 | src/vm.c:200 | cvar_t vm_rtChecks = { "vm_rtChecks", "1"}; | yes |
| value is a bitmask | src/vm_x86.c:2124 | if ( (int)vm_rtChecks.value & 1 ) | yes |
| 1 = program-stack overflow check | src/vm_x86.c:2124 | // programStack overflow check ... cmp esi,vm->stackBottom; jb FUNC_PSOF | yes |
| 2 = operation-stack overflow check | src/vm_x86.c:2137 | // opStack overflow check ... cmp against vm->opStackTop; ja FUNC_OSOF | yes |
| 4 = jump-target range check (call) | src/vm_x86.c:949 | // jump target range check ... cmp eax,vm->instructionCount; jae FUNC_ERRJ | yes |
| 4 = jump-target range check (OP_JUMP, local scope) | src/vm_x86.c:2701 | // jump target range check ... allow jump within local function scope only | yes |
| 8 = memory-access bounds (data) | src/vm_x86.c:1223 | if ( (int)vm_rtChecks.value & 8 ) // security checks ... cmp eax,vm->dataMask; ja FUNC_DATA | yes |
| 8 = per-register dataMask clamp, skipped if bit clear or forceDataMask | src/vm_x86.c:679 | if ( !( (int)vm_rtChecks.value & 8 ) || vm->forceDataMask ) { ... return; } | yes |
| 0 / bit clear => check omitted (faster, less protection) | src/vm_x86.c:1240 | else { EmitRexString("01 DF"); // add edi,ebx // no bounds check } | yes |
| checks are x86-JIT-only (interpreter ignores) | src/vm_interpreted.c | grep -c vm_rtChecks = 0 | yes |

## Independent V-pass (cold; knob + description only)

**Classification: C-NEAR-MISS**

| # | Clause | Enforcing file:line | Verbatim snippet | Verdict |
|---|--------|---------------------|------------------|---------|
| 1 | "bitmask -- add the numbers" (additive, independent bits) | vm_x86.c:2124 / :2137 / :949 / :2701 / :679 / :1223 | each site: `(int)vm_rtChecks.value & N` (N=1,2,4,8) -- independent bit tests | MATCH |
| 2 | "1 = program-stack overflow check" | vm_x86.c:2124 | `if ( (int)vm_rtChecks.value & 1 ) {` under comment `// programStack overflow check`; emits `cmp esi, vm->stackBottom` + jump to FUNC_PSOF | MATCH |
| 3 | "2 = operation-stack overflow check" | vm_x86.c:2137 | `if ( (int)vm_rtChecks.value & 2 ) {` under comment `// opStack overflow check`; emits `cmp` vs `vm->opStackTop` + jump to FUNC_OSOF | MATCH |
| 4 | "4 = jump-target range check (keeps jumps inside valid code)" | vm_x86.c:949 and :2701 | `if ( (int)vm_rtChecks.value & 4 ) {` under comment `// jump target range check`; :2701 emits in-range vs `proc_base`/`proc_len` with comment `// allow jump within local function scope only`, jump to FUNC_BADJ; :949 emits `cmp eax, vm->instructionCount` -> FUNC_ERRJ | MATCH |
| 5 | "8 = memory-access bounds check (keeps reads and writes inside the VM's own data)" | vm_x86.c:679 (EmitCheckReg) and :1223 | :679 `if ( !( (int)vm_rtChecks.value & 8 ) || vm->forceDataMask ) { ... return; }` then `cmp` reg vs `vm->dataMask - (size-1)` -> FUNC_DATA; :1223 `if ( (int)vm_rtChecks.value & 8 ) // security checks` `cmp eax, vm->dataMask` -> FUNC_DATA | MATCH |
| 6 | "Turning a bit off removes that check ... With all bits clear (0), no checks are performed" (OFF-state) | vm_x86.c:679 / 2124 / 2137 / 949 / 2701 / 1223 | each guard is gated solely on its own bit; value 0 emits no guard. Bit-8 OFF branch only emits an AND-mask when `vm->forceDataMask` -- and forceDataMask is never assigned anywhere (declared vm_local.h:225, vmTable static-zeroed), so OFF=0 emits nothing | MATCH |
| 7 | "Default: 1" | vm.c:200 | `cvar_t vm_rtChecks = { "vm_rtChecks", "1"};` (registered via Cvar_Register, pr2_exec.c:51) | MATCH |
| 8 | "Set by: server config" | pr2_exec.c:51; no OnChange | plain Cvar_Register, no callback; value consulted only inside VM_Compile (load/compile time). Settable via config/console pre-load | MATCH (with timing caveat -- see #10) |
| 9 | SCOPE: "the server's QuakeC virtual machine performs ... while it runs" (implies universal-to-VM) | vm_x86.c (all sites) vs vm_interpreted.c:220,224,240 | ALL enforcing sites live in the x86 JIT backend (vm_x86.c). The bytecode interpreter performs equivalent programStack/opStack/range checks UNCONDITIONALLY (`if ( programStack <= vm->stackBottom ) SV_Error(...)` etc.) and never reads vm_rtChecks. Cvar governs ONLY the compiled path | MISMATCH (overstated scope -- narrower than implied) |
| 10 | TIMING: "performs ... while it runs" / "letting the game code run slightly faster" (implies live per-run toggle) | vm.c:1319 -> vm_x86.c:1933 VM_Compile; reached via PR2_LoadProgs (pr2_exec.c:427) at SV_SpawnServer | bits are read at progs COMPILE time and baked into emitted machine code; no OnChange, no recompile-on-change. A live cvar change does NOT re-arm already-compiled progs -- only effective at next compile (map change / VM restart). Emitted guards do execute at runtime, so "while it runs" is partially defensible | MISMATCH (timing imprecision -- compile-time binding unstated) |

**V-pass notes:** Oracle confirmed mvdsv 1.11-53-g18d0362. Trace discipline applied per enforce-trace-discipline.md.

CORE SEMANTICS FULLY TRACED AND CORRECT. All four bit meanings (1/2/4/8), the additive-bitmask framing, the default (1), and the all-bits-clear OFF-state map to located enforcing lines whose code AND adjacent comments match the description. Notably the source comments themselves name the checks ("programStack overflow check", "opStack overflow check", "jump target range check", "allow jump within local function scope only", "security checks") -- the bit descriptions are not name-inference, they are comment-and-code confirmed. Bit-8 OFF-state was double-checked: the `|| vm->forceDataMask` clause at vm_x86.c:679 could emit an AND-mask instead of nothing, but forceDataMask is NEVER assigned anywhere in the tree (only declared + read), and vmTable is static-zeroed, so at value 0 no bounds machinery is emitted. The cvar is NOT runtime-dead: on the standard x86_64 build (q_platform.h idx64=1) the compiled backend is the default path (sv_progtype 0 -> VMI_COMPILED), so vm_rtChecks is the live control there.

WHY C-NEAR-MISS (not TRACED-CLEAN, not C-FIX): two clauses assert behavior BROADER than any enforcing site supports -- the classic flavour-C scope/timing pattern (clause inferred from the knob's general framing, with no enforcing line that makes the universal claim true; the real enforcing lines are all narrower).
 (a) SCOPE: "the server's QuakeC virtual machine performs ... checks" reads as a property of the VM. It is a property of the x86 JIT backend ONLY. The bytecode interpreter (vm_interpreted.c) does the same overflow/range checks unconditionally and ignores vm_rtChecks entirely -- so "turning a bit off removes that check" is FALSE under the interpreter. No enforcing read-site for the cvar exists outside vm_x86.c.
 (b) TIMING: "while it runs" + "letting the game code run slightly faster" implies a live, per-execution toggle. The bits are consumed at progs COMPILE time (VM_Compile, fired at map load) and baked into the emitted code; there is no OnChange and no recompile-on-change, so a live change is inert until the next compile. The emitted guards do execute at runtime, which is why this is imprecision rather than a flat contradiction.

Neither defect is C-FIX: nothing the description says about a bit's meaning, the default, or the zero-state contradicts the code. A tightened description would (1) scope the sentence to the JIT/compiled progs path (or note the interpreter checks unconditionally) and (2) note the value is read when the game module is compiled/loaded (map start), not toggled live.

## flags_for_review

- [fyi/runtime-dead-suspect/synthesis] vm_rtChecks is read ONLY in the x86 JIT compiler (src/vm_x86.c, 6 read-sites); src/vm_interpreted.c has zero references (grep -c = 0). On any build/architecture that runs the bytecode interpreter rather than the x86 JIT, the cvar is effectively inert. The user-facing description frames it as 'the VM performs these checks' (admin-observable on the common x86 JIT path); the JIT-only scope is recorded in reasoning. Worth a human note on whether L3 should call out the interpreter caveat.
- [review/hidden-family/vpass] vm_rtChecks governs ONLY the x86 JIT backend (vm_x86.c). The bytecode interpreter vm_interpreted.c performs the same programStack overflow (line 220), opStack overflow (line 224), and program-counter range (line 240) checks UNCONDITIONALLY, never reading the cvar. On builds/arches without the compiled backend (NO_VM_COMPILED) or when progs fall back to the interpreter, vm_rtChecks has zero effect and the checks are always on. Description's universal 'the VM performs' framing hides this dual-path reality.
- [fyi/other/vpass] vm_rtChecks is a COMPILE-TIME code-generation switch, not a runtime per-instruction toggle. Bits are read inside VM_Compile (vm_x86.c:1933) which fires from PR2_LoadProgs at SV_SpawnServer (map load). No OnChange callback exists, so changing the cvar on a running server does not re-arm already-compiled progs -- it only takes effect at the next progs compile (map change / VM restart). Relevant for any UI/doc that implies it can be flipped live for an immediate effect.
- [fyi/runtime-dead-suspect/vpass] vm->forceDataMask (the OR-clause at vm_x86.c:679 and the #if-0'd block at :1211) is declared (vm_local.h:225) and read but NEVER assigned anywhere in src. It is effectively dead (always false from static-zeroed vmTable). Does not affect vm_rtChecks correctness, but it is a latent always-false branch -- possibly intended for a forced-sandbox mode that was never wired up. Not in scope for this knob; flagging as an incidental dead-field observation.

## Gate log

- **HG1 (canary):** chunk canary gate PASS (canaries: sv_maxspeed=C-FIX, sv_gravity=C-FIX, allow_download_models=C-FIX, allow_download_maps=TRACED-CLEAN).
- **F-D6a / HG2:** confirmed by MAIN at persist time (see batch ledger).

## D6Record (the EXACTLY-ONE json block parsed by `synthesize-mvdsv.ts --from-ledger`)

```json
{
  "project": "mvdsv",
  "knob": "vm_rtChecks",
  "type": "cvar",
  "description": "Selects which runtime safety checks the server's QuakeC virtual machine performs on the loaded game code while it runs. The value is a bitmask -- add the numbers for the checks you want.\n\n1 = program-stack overflow check\n2 = operation-stack overflow check\n4 = jump-target range check (keeps jumps inside valid code)\n8 = memory-access bounds check (keeps reads and writes inside the VM's own data)\n\nTurning a bit off removes that check, letting the game code run slightly faster but with less protection against a malformed or malicious progs. With all bits clear (0), no checks are performed.\n\nThis applies to servers running the just-in-time compiled game VM (the default on 64-bit builds), and the value is read when the game code is loaded -- a change takes effect on the next map load. On builds that run the bytecode interpreter these checks are always on regardless of this setting.\n\nDefault: 1.\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "primary source_ref src/vm_x86.c:2124. Registered src/vm.c:200 cvar_t vm_rtChecks = {\"vm_rtChecks\",\"1\"} -> positional {name,value} init, registered default \"1\" (WI-2; no shipped-cfg override consulted). Read exclusively in the x86 JIT compiler src/vm_x86.c as a bitmask (int)vm_rtChecks.value & N, gating whether each safety check is EMITTED into the compiled native code. Per-bit enforce-trace: bit 1 (&1) src/vm_x86.c:2124 'programStack overflow check' emits cmp esi,vm->stackBottom / jb FUNC_PSOF; bit 2 (&2) src/vm_x86.c:2137 'opStack overflow check' emits lea/cmp against vm->opStackTop / ja FUNC_OSOF; bit 4 (&4) src/vm_x86.c:949 'jump target range check' (EmitCallFunc) cmp eax,vm->instructionCount / jae FUNC_ERRJ AND src/vm_x86.c:2701 (OP_JUMP) bounds the jump within local proc scope; bit 8 (&8) src/vm_x86.c:1223 'security checks' emits dataMask bounds (or eax,ecx / cmp eax,vm->dataMask / ja FUNC_DATA) for data access, and src/vm_x86.c:679 EmitCheckReg emits the per-register dataMask clamp UNLESS (&8) is clear OR vm->forceDataMask is set. Polarity verified: bit SET => the check's branch (the if(...&N){...}) emits the guard; bit clear => the else/no-emit path runs faster without the guard; value 0 => no bits => no checks. SCOPE NUANCE (kept out of user prose, recorded here): these reads exist ONLY in the JIT path src/vm_x86.c; src/vm_interpreted.c has zero vm_rtChecks references (grep -c = 0), so on a build/arch using the bytecode interpreter the cvar has no effect -- the user-facing 'the VM performs these checks' is the admin-observable framing of the JIT-emitted guards; mechanism-only, no recommended value (D5 clause 4).",
  "description_proposed": null
}
```
