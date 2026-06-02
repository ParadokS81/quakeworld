# MVDSV describe-fill -- chunk-6 batch ledger: `cmdline-params`

Workflow chunk-runner batch (run `wf_c03e88a9-e38`, 16 agents / ~916k tokens). MAIN-owned
gates (F-D6a, HG1/HG2, prose spot-check, persist) recorded here; per-knob ledgers carry the
synthesized record + cold V-pass and point here for the MAIN gate log.

- **anchor:** `1.11-53-g18d0362`
- **shape:** cmdline_param (NEW shape) -- **11 knobs** (groups of 4 -> 3 synth agents; 11 reals + 2 canaries V-passed)
- **committed in-scope MVDSV fingerprint:** `51eb3d5dcb74f4810770d4b944ff4af3` (was `4a8c453f` after chunk 5)
- **synthesized-origin mvdsv rows:** 136 -> **147** (DB-verified; +11) -- cmdline_param bucket now DONE (0 remaining)

## Recon (live set == plan)

All 11 mvdsv `cmdline_param` entities `description IS NULL` at start, registration sites confirmed via
`cmdline_param_versions`. Exactly matches the plan's 11. No divergence.

Knobs: `-basedir -d -g -game +gamedir -ip -noerrormsgbox -nopriority -port -t -u`.

Note: the registration `source_file:line` for cmdline params lives in `cmdline_param_versions` (not
`cvar_versions`); these are parse sites (`COM_CheckParm`) and for cmdline params usually coincide with
the read use-site, but the workers were told to follow to the enforcing consumer regardless.

## HG1 -- canary gate: **PASS** (no re-dispatch)

2 canaries (1 C-FIX + 1 TRACED-CLEAN control), each ground-truth grepped by MAIN before launch.
Canary fodder = REAL-but-unextracted cmdline params (mvdsv source carries ~12 more `COM_CheckParm`
flags than the 11 entities), so each is verifiable in-oracle yet guaranteed outside the synth set --
a reusable technique for shapes where every extracted entity is in scope.

| canary | groundTruth | got | enforcing line MAIN verified |
|---|---|---|---|
| `-nohwtimer` (polarity inversion: planted "enables the hardware timer") | C-FIX | C-FIX | `if (!COM_CheckParm("-nohwtimer") && QueryPerformanceFrequency(...))` sv_sys_win.c:437 -- PRESENT *disables* the QPC hardware timer, falls back to the 1ms multimedia timer |
| `-heapsize` (verbatim-correct KB-sizing -- control) | TRACED-CLEAN | TRACED-CLEAN | `memsize = Q_atoi(COM_Argv(t+1)) * 1024; ... if (memsize < MINIMUM_MEMORY) Sys_Error(...)` sv_main.c:3939 |

The `-nohwtimer` canary is the load-bearing one: a `!COM_CheckParm` polarity flip, the exact trap the
chunk's negative-named in-set flags (`-nopriority`, `-noerrormsgbox`) carry. Worker quoted the `!` and
caught it; the control held (no over-flagging).

## F-D6a -- source_ref audit: caught **3 bad refs** (corrected before emit), 8/11 clean

Every returned `source_ref` printed from live source. 8 read/enforce their knob cleanly. 3 were
mis-cited and MAIN corrected them (source_ref folds into `description_reasoning`, a DB column, so a
drifted cite is a shipped lie):

| knob | synth ref | live line | corrected to |
|---|---|---|---|
| `-port` | net.c:1411 | 1411 is BLANK; `port = atoi(COM_Argv(p+1))` is at :1409 | `src/net.c:1409` |
| `-u` | sv_sys_unix.c:765 | 765 is `*/` / 766 is `int main`; `if (setuid(user_id) < 0)` is at :755 | `src/sv_sys_unix.c:755` |
| `-t` | sv_sys_unix.c:743 | :743 is the value-read `chroot_dir = com_argv[j+1]`; the enforcing `chroot()` is at :744 | `src/sv_sys_unix.c:744` |

The `-u` synth worker had a CONSISTENT +10 line-drift across its citations (765/763/761-762 vs real
755/755/751-752); MAIN fixed the reasoning + enforce-table refs to the grep-verified lines.

## HG2 -- cold V-pass flagged 3/11 reals; all adjudicated against live source

Re-grepped each contested clause both directions. **All 3 V-pass findings confirmed REAL** (zero false
positives) -> surgical MAIN edits at persist (no seeded re-synth -- chunk-1..5 practice). Edits patched
into the records before emit.

| knob | V-pass | defect (confirmed) | fix |
|---|---|---|---|
| `-u` | C-FIX | TIMING inverted: "After the server has started up, drops privileges" -- but the setuid runs in `SV_System_Init` (sv_sys_unix.c:755), called at main():774 BEFORE `Host_Init` at :775; Host_Init (sv_main.c:3951) IS startup (NET_Init :3970, exec server.cfg :4001, SV_Map :4009). ALSO a fabricated "start as root, bind a privileged port, then drop" rationale -- impossible since the setuid precedes the bind, and QW's default port 27500 is non-privileged | reframed to "early in startup -- before network/server.cfg/map"; removed the privileged-port story; kept the (correct) `-t`/`-g` pairing |
| `-t` | C-FIX | TIMING inverted: same SV_System_Init(:774)-before-Host_Init(:775) -- the chroot (sv_sys_unix.c:744) is applied early, before FS/server.cfg/map | reframed to "early in startup -- before filesystem/server.cfg/map"; added fail-open note (non-root `-t` only warns and runs UNCONFINED, sv_sys_unix.c:745) |
| `-noerrormsgbox` | C-NEAR-MISS | flavour-C: "written to the log and console instead of a pop-up" couples logging to the flag -- but the log write (sv_sys_win.c:414-416) is OUTSIDE the flag's `#else`/`#endif` (:412) and fires regardless; only the console write (:410) is flag-gated | "printed to the console instead of a pop-up... fatal errors are written to the error log either way, when one is open" |

## Prose spot-check (MAIN; chunk-6 is spot-check, not full operator review)

All 11 reviewed -- concise v2 user-doc shape (what-it-does + value/no-value + Default + Set-by, worked
example for value flags). The Unix process-control quartet (`-d`/`-g`/`-t`/`-u`) and the two Windows
flags carry justified per-OS / security detail; no bloat. No further concision edits.

## Persist + gates

- `synthesize-mvdsv.ts --from-ledger` dry-run: 11 parsed / 11 persisted / **0 errors**.
- LIVE: 11 persisted / 0 errors; committed fingerprint `51eb3d5dcb74f4810770d4b944ff4af3`.
- Idempotency re-run: 0 persisted / **11 skipped-terminal** / same fingerprint -> stable, no re-run bug.
- `quality-grid --project mvdsv --family regression`: the 2 anchored describe_fill gates
  (`synthesized_requires_anchor`, `provenance_entry_exists`) + `jsonb_columns_not_strings` + all mvdsv
  counts PASS. `origin_vocabulary` RED (1266) is **entirely the ktx `recast_v2` baseline** (633 rows x2
  predicates); mvdsv origins are only `source_inline` (991) + `synthesized` (147) -- **0 mvdsv
  contribution**, exactly as the brief predicts.

## Findings seeded

5 issue-worthy findings appended to `mvdsv-describe-fill-findings.md` (#32-#36): `-port`/`-ip`
trailing-token off-by-one (upstream low -- BENIGN, COM_Argv bounds-checks), `-game`/`+gamedir`
rejected-path `*gamedir` serverinfo divergence (upstream med, FIXME-flagged), Windows `_CONSOLE`
build-variant inertness of `-noerrormsgbox`/`-d` (dead-suspect), `-tcpport`(`#if 0`)/`-clientport`
(`#ifndef SERVERONLY`) dead (dead-suspect), `-basedir` quakeparms comment-rot (upstream low).

**Verify-before-write catch (chunk-5 meta-lesson repeats):** the `-port` cold V-pass over-claimed an
out-of-bounds "reads adjacent memory" read for a value-less `-port`. Grepping the callee `COM_Argv`
(common.c:836 `if (arg < 0 || arg >= com_argc) return ""`) at finding-write time refuted it -- the
read is bounds-safe and benign (`atoi("")=0`). Finding #32 written as benign accordingly. A V-pass
note is a hypothesis, not a citation.
