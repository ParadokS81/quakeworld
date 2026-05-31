# describe-fill-synthesis ledger -- mvdsv `sv_demoClearOld`

- **project:** mvdsv
- **knob:** `sv_demoClearOld` (cvar)
- **anchor_version:** `1.11-53-g18d0362` (HARD GATE: `git describe --tags` printed `1.11-53-g18d0362` -- PASS)
- **registered name string:** `"sv_demoClearOld"` (cvar_t literal `sv_demo.c:37`; cvar_t C variable is also `sv_demoClearOld` -- no case drift)
- **registered default:** `"0"` (bare two-field initializer `{"sv_demoClearOld", "0"}` -- no flags, no OnChange; WI-2 confirms default = 0)
- **L1 row:** `mvdsv:cvar:sv_democlearold`, `source_backed`, `help_desc = null` (cold-synth confirmed; nothing to affirm)
- **suspect_pool_member:** FALSE (per brief; not runtime-dead) -> Step 2 skipped
- **mechanical_candidate:** none (cold-synth). Trailing comment at registration is `//bliP: 24/9 clear old demos` -- dev attribution + terse name-echo; fails D5 clause 2 (name restatement) and clause 3 (no value semantics). Routes to Step 5 synthesize.

## Verdict (halt line)

```
mvdsv:sv_demoClearOld: synthesized -- cold-synth; value = count of oldest demos auto-deleted when demo dir exceeds sv_demoMaxDirSize at record start; <=0 = off; all clauses enforce-traced TRACED-CLEAN -- origin=synthesized ref=src/sv_demo_misc.c:162 anchor=1.11-53-g18d0362
```

## Final `description` (verbatim, D20 shape)

> Automatically deletes the oldest demo files from the server's demo directory when that directory has grown past the `sv_demoMaxDirSize` limit, making room before a new recording starts. The value is the number of demo recordings to remove (their matching `.txt` text files are removed alongside them). At 0 or below, no demos are deleted -- instead recording is refused with a message to raise `sv_demoMaxDirSize`.
>
> Default: 0 (auto-clearing off).
> Set by: server config.

## `source_ref`(s)

- Primary: `src/sv_demo_misc.c:162` (authoritative read use-site: `n = (int) sv_demoClearOld.value;` -- the value consumed as the delete count)
- Supporting reads/enforcing lines: `src/sv_demo_misc.c:156` (`<= 0` OFF-state gate), `src/sv_demo_misc.c:154` (over-`sv_demoMaxDirSize` scope gate), `src/sv_demo_misc.c:168-176` (oldest-first delete loop), `src/sv_demo.c:1715` + `src/sv_demo.c:1761` (called at record / easyrecord start)

## Per-clause enforce-trace table

| # | Clause (in `description`) | Enforcing file:line | Verbatim snippet | MATCH |
|---|---|---|---|---|
| 1 | "deletes ... demo files ... The value is the number of demo recordings to remove" | `src/sv_demo_misc.c:162` | `n = (int) sv_demoClearOld.value;` | MATCH -- value read as int count `n`; confirmed user-facing by `src/sv_demo_misc.c:163` `Con_Printf("Clearing %d old demos\n", n);` |
| 2 | "deletes the oldest ... files" | `src/sv_demo_misc.c:168` + `src/sv_main.c:4192` | `qsort(... Sys_compare_by_date);` / `return (int)(((file_t *)a)->time - ((file_t *)b)->time);` | MATCH -- comparator is ascending by time (oldest = smallest time first); delete loop `src/sv_demo_misc.c:169-176` walks list head-forward decrementing `n`, so oldest-first |
| 3 | "when that directory has grown past the `sv_demoMaxDirSize` limit" | `src/sv_demo_misc.c:151,154` | `if ((int)sv_demoMaxDirSize.value)` / `if ((float)dir.size > sv_demoMaxDirSize.value * 1024)` | MATCH -- clear branch is nested inside both gates; only fires when dir size exceeds the limit (KB -> bytes via *1024) and the limit is enabled |
| 4 | "before a new recording starts" | `src/sv_demo.c:1715` + `src/sv_demo.c:1761` | `if (!SV_DirSizeCheck())\n\t\treturn;` (record); `if (!SV_DirSizeCheck()) // clear old demos` (easyrecord) | MATCH -- `SV_DirSizeCheck` (the only function reading the cvar) is invoked at the top of `record` and `easyrecord`, before the file is opened |
| 5 | "At 0 or below, no demos are deleted -- instead recording is refused with a message to raise `sv_demoMaxDirSize`" (OFF-state + polarity) | `src/sv_demo_misc.c:156-159` | `if ((int)sv_demoClearOld.value <= 0)\n\t\t\t{\n\t\t\t\tCon_Printf("Insufficient directory space, increase sv_demoMaxDirSize\n");\n\t\t\t\treturn false;` | MATCH -- `<= 0` (0 or negative) takes the early-return-false path (printed message, no deletion). `record`/`easyrecord` `return` on the `false`, so recording does not proceed. Positive value falls through to the delete loop -> higher value removes more demos |
| 6 | "their matching `.txt` text files are removed alongside them" | `src/sv_demo_misc.c:165-166` | `if ((int)sv_demotxt.value) // if our server record demos and txts, then to remove\n\t\t\t\t\tn <<= 1;` + adjacent comment line 166 `// 50 demos, we have to remove 50 demos and 50 txts = 50*2 = 100 files` | MATCH -- adjacent comment confirms the `<<= 1` doubles the file budget so the `n` demos' `.txt` companions are also deleted; admin still sets the number of *demos*. Stated at user-observable level (no bit-shift jargon) per D20 |

### Clauses deliberately NOT asserted (B1 hygiene)

- No "doubles to 2n files" / `n <<= 1` mechanic in `description` -- that is internal bookkeeping (the txt companions of the same `n` demos), not "clears 2n demos". Asserting the literal doubling would mislead the admin about what the number means. Captured as the user-observable clause 6 instead (D20 anti-pattern: no bit-shift/`<<=` jargon in user doc).
- No `See also: L3` -- behavior is wholly same-codebase (MVDSV server-side file management); no cross-engine/cross-codebase consequence to route (D20 cross-engine rule -> nothing to add).
- No recommended value (D5 clause 4 / mechanism-only).

## Grading rationale

- **Step 1 (read-site grounding):** value is READ at `sv_demo_misc.c:156` and `:162` inside `SV_DirSizeCheck`; that function is the sole consumer and is called only from `record`/`easyrecord`. Not name-only synthesis -- behavior is fully source-legible.
- **Step 2:** skipped (`suspect_pool_member = FALSE`).
- **Step 3 (D5):** registration comment `//bliP: 24/9 clear old demos` is dev attribution + a terse name-echo. Fails clause 2 (restates the name) and clause 3 (no value semantics, no OFF-state). Not affirmable; not in D20 shape. -> synthesize.
- **Step 4:** not reached -- every material clause has an enforcing line.
- **Step 5 (synthesize, D20):** authored in the condensed user-doc shape; all file:line / code cites kept out of `description` and recorded here + in `description_reasoning`. WI-2: default verified against the registered cvar_t literal (`"0"`), not a shipped cfg. Set-by = server config (plain cvar, no CVAR_SERVERINFO/ROM flag, no OnChange handler, no command/vote path).
- **V-pass self-classification:** TRACED-CLEAN -- every semantic/threshold/polarity/scope/OFF-state/side-effect clause maps to a located, verified enforcing line incl. the adjacent comment at line 166.
- **Confidence:** high (single self-contained consumer function; all clauses directly enforced; default + flags cross-checked against L1 row and source).

## D6 Record

```json
{
  "project": "mvdsv",
  "knob": "sv_demoClearOld",
  "type": "cvar",
  "description": "Automatically deletes the oldest demo files from the server's demo directory when that directory has grown past the sv_demoMaxDirSize limit, making room before a new recording starts. The value is the number of demo recordings to remove (their matching .txt text files are removed alongside them). At 0 or below, no demos are deleted -- instead recording is refused with a message to raise sv_demoMaxDirSize.\n\nDefault: 0 (auto-clearing off).\nSet by: server config.",
  "description_origin": "synthesized",
  "description_anchor_version": "1.11-53-g18d0362",
  "description_provenance": null,
  "description_verdict": "synthesized",
  "description_confidence": "high",
  "description_reasoning": "Cold-synth (help_desc null; trailing reg comment '//bliP: 24/9 clear old demos' is dev attribution + name-echo, fails D5 c2/c3). Sole consumer SV_DirSizeCheck reads .value at sv_demo_misc.c:156 (<=0 OFF gate -> prints 'increase sv_demoMaxDirSize' + returns false) and :162 (n = count). Delete-count clause -> sv_demo_misc.c:162 (+:163 'Clearing %d old demos'). Oldest-first -> sv_demo_misc.c:168 qsort Sys_compare_by_date, comparator sv_main.c:4192 ascending-by-time, loop :169-176 head-forward. Scope (dir over limit) -> sv_demo_misc.c:151,154 (>sv_demoMaxDirSize*1024). 'before recording' -> SV_DirSizeCheck called sv_demo.c:1715 (record) + :1761 (easyrecord), return on false. .txt companions -> sv_demo_misc.c:165-166 n<<=1 with adjacent comment confirming demos+txts; stated user-observable, no shift jargon (D20). Default 0 verified vs registered cvar_t literal sv_demo.c:37 (WI-2, not a cfg value). Set-by=server config: plain cvar, flags [] (no SERVERINFO/ROM), no OnChange/command/vote. No See-also (wholly same-codebase). V-pass self-class TRACED-CLEAN; all clauses enforce-traced; confidence high.",
  "description_proposed": null
}
```
