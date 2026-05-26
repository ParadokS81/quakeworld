# Handoff: ezQuake 2 small bug-fix PRs — fresh-terminal investigation

**Created:** 2026-05-26, end of cmdline-pass-ship session.
**For:** a fresh terminal, cold, investigating 2 bugs surfaced by the PR #1131 verifier walk and (if investigation confirms) filing 2 small focused upstream PRs.
**Cross-references:**
- PR #1131 (cmdline pass, just opened): https://github.com/QW-Group/ezquake-source/pull/1131
- `apps/qw-oracle/docs/arc-history.md` (2026-05-26 cmdline pass retrospective — full context for the discovery)
- `HANDOVER.md` "Small followups" — the 2 bug-fix PR entries point here for the playbook

---

## What this is

The PR #1131 cmdline-pass verifier fan-out (5 parallel Sonnet sub-agents) surfaced 2 unrelated source-side bugs in ezquake-source HEAD. The verifier's claims were spot-checked once during the cmdline-pass session and held; the cmdline PR ships conservative descriptions pending these fixes.

The fresh-terminal job: verify the bugs are real AND not load-bearing somehow (Chesterton's fence — code that looks broken may exist for a reason), then file 2 small focused upstream PRs. After each PR merges, file a follow-up description update to `help_cmdline_params.json`.

**Estimated 60-90 min from cold start** (mostly investigation; the actual patches are tiny).

---

## Where things are

- **ezquake-source repo:** `/home/paradoks/projects/quakeworld/research/repos/ezquake-source/`
- **Current branch:** `cleanup/help-json-cmdline-fills` (the cmdline PR branch). New work should branch off `upstream/master`, not this branch.
- **Origin:** `https://github.com/ParadokS81/ezquake-source.git` (operator's fork)
- **Upstream:** `https://github.com/QW-Group/ezquake-source.git` (canonical)
- **PR opening:** via `gh pr create --repo QW-Group/ezquake-source --base master --head ParadokS81:<branch>` (matches PR #1131's shape)

---

## Reads required (in order)

1. **This handoff** (you're reading it).
2. **PR #1131 body** at https://github.com/QW-Group/ezquake-source/pull/1131 — the "Side findings → Two source bugs discovered" section frames both bugs with the same evidence used here.
3. **Locked rubric** at `docs/superpowers/parking/2026-05-14-ezquake-help-json-empty-entries-audit.md` — house style + verdict discipline (helpful framing only; these are bug-fix PRs, not doc PRs).
4. **Cmdline-pass retrospective** at `apps/qw-oracle/docs/arc-history.md` (2026-05-26 cmdline entry) — full session context if you need to understand how the bugs were discovered.

---

## Bug 1: `rulesets.c` inverted strcasecmp + missing smackdrive dispatch

### Claim (from PR #1131 verifier walk)

`src/rulesets.c:619-638` — `Rulesets_Init` cmdline dispatch for `-ruleset <name>`. Three branches use correct `!strcasecmp` (smackdown, thunderdome, mtfl). Two branches use `strcasecmp` WITHOUT the `!` operator (qcon line 629, default line 632) — inverted logic.

**Symptoms as currently shipped:**
- `-ruleset qcon` returns 0 from strcasecmp → falsy → branch NOT taken → ruleset stays at default
- `-ruleset somethingelse` returns non-zero → truthy → branch IS taken → silently sets ruleset to "qcon"
- Both `qcon` and `default` branches have the same inversion bug

Also: `rs_smackdrive` (rulesets.h:48) exists in the enum but `Rulesets_Init` doesn't dispatch it from cmdline (only `Rulesets_OnChange_ruleset` at rulesets.c:862 handles it).

### Investigation steps (verify before patching)

1. **Re-read the current source** at `src/rulesets.c:615-645` (use `Read` tool with offset/limit, not `Bash sed`):
   ```bash
   # Confirm the inverted strcasecmp claim still holds at HEAD
   ```
   Check both line 629 (qcon) and line 632 (default) for missing `!`.

2. **Check git blame** on lines 629 and 632 to see when the inversion was introduced — could reveal whether it was always wrong or regression. If always wrong, the bug is older; if recent regression, may have a related test or commit hint.
   ```bash
   git -C research/repos/ezquake-source blame -L 625,640 src/rulesets.c
   ```

3. **Search for any test coverage** that might depend on the current (buggy) behavior:
   ```bash
   git -C research/repos/ezquake-source grep -n "ruleset.*qcon\|-ruleset" -- '*.c' '*.h' | head -20
   ```
   If any code or test relies on `-ruleset qcon` silently being a no-op or on the fallback path, that's load-bearing. Unlikely but verify.

4. **Check whether `rs_smackdrive` was intentionally cmdline-excluded.** Search the enum's add commit + any comments around `Rulesets_Init`:
   ```bash
   git -C research/repos/ezquake-source log --all --oneline -S 'rs_smackdrive' -- src/rulesets.h src/rulesets.c
   ```
   If `rs_smackdrive` was deliberately runtime-only (via `Rulesets_OnChange_ruleset`), the cmdline dispatch may have been intentionally omitted. Less likely but possible.

5. **Run a build** locally (Linux SDL2 build via the project's CMakeLists) to make sure the patch compiles. Not strictly required for a 4-line fix but cheap insurance.

### PR shape (if investigation confirms)

**Branch:** `bugfix/rulesets-cmdline-dispatch` off `upstream/master`

**Patch (4 lines):**
```c
// src/rulesets.c:629 (add ! before strcasecmp)
} else if (!strcasecmp(COM_Argv(temp + 1), "qcon")) {
    Cvar_Set(&ruleset, "qcon");
    return;
// src/rulesets.c:632 (add ! before strcasecmp)
} else if (!strcasecmp(COM_Argv(temp + 1), "default")){
    Cvar_Set(&ruleset, "default");
    return;
// add smackdrive dispatch as 6th branch (before final else):
} else if (!strcasecmp(COM_Argv(temp + 1), "smackdrive")) {
    Cvar_Set(&ruleset, "smackdrive");
    return;
```

**Commit shape (1 commit):**
```
rulesets: fix inverted strcasecmp in -ruleset cmdline dispatch + add smackdrive

Three branches in Rulesets_Init (smackdown / thunderdome / mtfl) correctly
use !strcasecmp; two (qcon / default) were missing the ! operator, inverting
the logic — passing -ruleset qcon was silently ignored, and passing any
unrecognized value fell through to the inverted qcon branch and silently set
ruleset to "qcon". Also adds the smackdrive dispatch branch (rs_smackdrive
existed in rulesets.h:48 enum but Rulesets_Init never dispatched it from
cmdline; the runtime cvar OnChange handler at rulesets.c:862 already handles
it correctly).

Discovered during help_cmdline_params.json documentation audit (PR #1131).

Assisted-by: Claude:claude-opus-4-7
```

**PR title:** `rulesets: fix inverted strcasecmp in -ruleset cmdline dispatch + add smackdrive`

**PR body:**
- Restate the claim with the same evidence as Bug 1's "Symptoms" section above
- Reference PR #1131 as the discovery context
- Note that PR #1131 ships a conservative `-ruleset` description (3 working values only) pending this fix; after this PR merges a small follow-up to `help_cmdline_params.json` will list all 5+ values

### Follow-up after this PR merges

File a small `help_cmdline_params.json` update: change `-ruleset` description from the conservative 3-value form (`smackdown, thunderdome, mtfl`) to the full list (`smackdown, thunderdome, mtfl, qcon, default, smackdrive` if smackdrive included).

Operator-side: HANDOVER small followup tracks this under "rulesets.c cmdline-dispatch bug-fix PR + `-ruleset` description follow-up".

---

## Bug 2: `sys_posix.c` Sys_Printf dead-code returns

### Claim (from PR #1131 verifier walk)

`src/sys_posix.c:70-94` defines `Sys_Printf`. The function body has unconditional `return;` statements that fire BEFORE any output happens:

```c
void Sys_Printf (char *fmt, ...)
{
#ifdef DEBUG
    va_list argptr;
    char text[2048];
    unsigned char *p;

    return;                          // <-- line 75: returns BEFORE printing

    va_start (argptr,fmt);
    vsnprintf (text, sizeof(text), fmt, argptr);
    va_end (argptr);

    if (sys_nostdout.value)          // <-- line 83: never reached
        return;

    for (p = (unsigned char *) text; *p; p++)
        if ((*p > 128 || *p < 32) && *p != 10 && *p != 13 && *p != 9)
            printf("[%02x]", *p);
        else
            putc(*p, stdout);
#else
    return;                          // <-- line 92: returns immediately in non-DEBUG
#endif
}
```

**Symptoms as currently shipped:**
- `-nostdout` sets `sys_nostdout=1` correctly (line 344-345 elsewhere)
- But `Sys_Printf` returns at line 75 (DEBUG) or line 92 (non-DEBUG) before reaching the sys_nostdout check
- Net: `-nostdout` is a no-op on POSIX; stdout output from `Sys_Printf` doesn't happen regardless of the flag

This looks like very old commented-out debugging code that was never cleaned up. The early `return;` at line 75 is clearly intentional-but-stale.

### Investigation steps (verify before patching)

This bug needs MORE investigation than Bug 1 — the dead-code returns may be intentional for some reason.

1. **Re-read the current source** at `src/sys_posix.c:65-100` (Read tool).

2. **git blame on both early returns** — when were they added? Are they related to a known issue?
   ```bash
   git -C research/repos/ezquake-source blame -L 70,95 src/sys_posix.c
   ```
   Commit messages may explain the early returns.

3. **Search for callers of Sys_Printf on POSIX** — if Sys_Printf is supposed to be silent on POSIX clients (e.g., the actual stdout output happens via a different path like `Sys_OutputDebugString` or the ezQuake console), then removing the early returns may break things or surface a flood of output.
   ```bash
   git -C research/repos/ezquake-source grep -n "Sys_Printf" -- src/sys_posix.c src/sys_win.c src/common.c
   ```

4. **Compare to sys_win.c** — what does Windows' `Sys_Printf` do? Does it return early too? If Windows DOES print to stdout via Sys_Printf, then POSIX should too; if both are silent, the early-return pattern is intentional and there's no bug.
   ```bash
   # Read src/sys_win.c around the Sys_Printf definition
   ```

5. **Check Quake history**: id Quake's POSIX Sys_Printf classically writes to stdout (or stderr) and the engine expects it to. If ezQuake's POSIX Sys_Printf is dead, that's a regression from id heritage.

6. **Build + smoke test**: this fix changes runtime output behavior. Compile a Linux build, run with and without `-nostdout`, observe whether stdout output appears as expected. Mandatory for this PR — the patch is small but the behavior surface is bigger than Bug 1.

### IF investigation confirms it's a stale bug (likely)

**Patch (~3 lines):**
- Remove line 75 unconditional `return;` (inside DEBUG block)
- Remove line 92 unconditional `return;` (inside non-DEBUG `#else` block)
- Possibly also remove the `#ifdef DEBUG / #else / #endif` scaffolding entirely if both branches now do the same thing — depends on whether non-DEBUG should print at all

The non-DEBUG branch is the trickier judgment: if non-DEBUG builds were intentionally silent for stdout (e.g. release builds with no console output), then DON'T remove its return; just remove line 75 and leave the DEBUG block working as designed. Operator may want to weigh in here.

**Commit shape (1 commit):**
```
sys_posix: remove dead early returns from Sys_Printf so -nostdout / sys_nostdout actually work

Sys_Printf in src/sys_posix.c had unconditional `return;` statements that
fired before reaching the sys_nostdout.value check: line 75 inside the
#ifdef DEBUG block (before line 83's actual flag check), and line 92 in the
non-DEBUG #else branch. Net effect: -nostdout was a no-op on POSIX --
Sys_Printf produced no stdout output regardless of the flag.

Removing the early returns restores intent: Sys_Printf honors sys_nostdout
on POSIX as it already does on Windows (sys_win.c).

Discovered during help_cmdline_params.json documentation audit (PR #1131).

Assisted-by: Claude:claude-opus-4-7
```

**PR title:** `sys_posix: remove dead early returns from Sys_Printf so -nostdout actually works`

**PR body:**
- Restate the claim with evidence as above
- Reference PR #1131 as discovery context
- Note that PR #1131 ships a description-of-intent for `-nostdout` pending this fix; after merge, file follow-up updating `-nostdout` description to honestly describe the working behavior

### IF investigation reveals the early returns are intentional

Don't file the PR. Instead:
- File a different follow-up to `help_cmdline_params.json` documenting `-nostdout`'s actual behavior (likely "no-op since YYYY-MM-DD when X was changed")
- Update HANDOVER followup to remove the bug-fix and replace with the doc-only follow-up

### Follow-up after PR merges (if filed)

File a small `help_cmdline_params.json` update: change `-nostdout` description from "Suppresses stdout output on POSIX by setting sys_nostdout=1 before Host_Init. POSIX/Linux only." to a description that names the actual mechanism now that Sys_Printf works.

Operator-side: HANDOVER small followup tracks this under "sys_posix.c Sys_Printf dead-code-return bug-fix PR + `-nostdout` description follow-up".

---

## Critical rules

- **Verify before patching.** The verifier sub-agent's claims were spot-checked but not deeply audited. Apply Chesterton's fence — code that looks broken may be intentional. The bug-1 inversion looks clearly accidental (3 of 5 branches use `!`, 2 don't); bug-2 may have non-obvious history.
- **Branch off `upstream/master`, not `cleanup/help-json-cmdline-fills`.** Each bug gets its own focused branch.
- **Operator signs the DCO at push time.** AI must NOT add `Signed-off-by` (per Linux kernel coding-assistants conventions). Use `Assisted-by: Claude:claude-opus-4-7` for AI attribution. See `reference_upstream_pr_attribution` memory.
- **Don't bundle the 2 fixes.** They're unrelated bugs in unrelated files. 2 separate PRs.
- **PR body cross-references PR #1131** as the discovery context but doesn't depend on it merging first.
- **After each PR merges**, file a small `help_cmdline_params.json` follow-up to update the corresponding description. HANDOVER tracks both.

---

## First three actions

1. **Read this handoff + PR #1131 body** (the Side findings section is the primary evidence).
2. **Investigate Bug 1** (`rulesets.c`): re-read source at HEAD, git blame the inverted lines, grep for callers of `-ruleset`. Should take 10-15 min. If confirmed, file the 4-line patch as Bug 1's PR.
3. **Investigate Bug 2** (`sys_posix.c`): re-read source at HEAD, git blame the early returns, compare to `sys_win.c`'s Sys_Printf, build a Linux client and test stdout behavior with/without `-nostdout`. Should take 30-45 min (more investigation needed than Bug 1). If confirmed, file the patch; if intentional, file a doc-only follow-up instead.

After both PRs are filed (or both investigations conclude), HANDOVER's 2 source-bug followups update from "investigate + file" to "awaiting upstream review + description update after merge".

---

## When in doubt

- **Bug 1 is unambiguously a bug** (the `!` is missing where 3 sibling branches have it). High confidence in filing.
- **Bug 2 needs more rigor.** If your investigation surfaces ANY reason the early returns might be intentional (other than "looks stale"), park the bug-fix PR and surface the question to operator. Don't ship the patch without confidence that Sys_Printf is supposed to print on POSIX.
- **Operator is reachable** for cmdline-pass-context questions if anything in the verifier walk's framing is unclear.
- **Don't widen scope.** These are 2 focused 4-line patches. Don't refactor adjacent code, don't reformat, don't fix nearby comments.
