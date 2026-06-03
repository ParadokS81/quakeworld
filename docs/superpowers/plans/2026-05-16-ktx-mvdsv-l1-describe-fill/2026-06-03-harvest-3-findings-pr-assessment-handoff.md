# Handoff -- MVDSV harvest: assess 3 findings for clean-fix upstream PRs

**Spin up a fresh terminal at `/effort high` with the spawn prompt below.** This is an ASSESS-then-PR
task, not "make 3 PRs". For each of three findings: verify it's a clear bug with a zero-risk minimal
fix, and only then prep a PR. The honest outcome may be 0, 1, 2, or 3 PRs -- ship the ones that clear
the bar, say why on the ones that don't.

## The precedent this mirrors (already proven)

Two earlier findings from this same log were verified cold and shipped as minimal upstream PRs --
**#15** (`penfilters[]` OOB write) -> mvdsv **PR #205**, **#22** (broadcast wrong-mutex unlock) ->
**PR #206**. Both were one-identifier fixes, both **MERGED cleanly by maintainer `osm`** (zero change
requests, all CI green). That is the bar and the model: a clear defect, a fix that changes nothing on
the normal path, framed factually ("wrong constant / missing bound"), NOT as a security disclosure.

## The 3 findings to assess (full rows in `mvdsv-describe-fill-findings.md`)

| # | Knob | Class | Source (anchor) | Sketch of the fix | My read |
|---|------|-------|-----------------|-------------------|---------|
| **63** | `setmaster` | OOB write | `sv_master.c:44-46` loop vs `server.h:35` `MAX_MASTERS`=8 | bound the `for (i=1; i<Cmd_Argc(); i++)` loop at `MAX_MASTERS` (Cmd_Argc can reach 80 -> writes past `master_adr[8]`) | **Strongest.** Same class as #15; one-line bound. Likely clean PR. |
| **65** | `SV_LoadAccounts` | unbounded `fscanf` | `sv_login.c:168-169` | give `fscanf(f,"%s",login)` a field width (`login[MAX_LOGINNAME]`, so `%40s` / `MAX_LOGINNAME-1`) | **Strong.** Memory-safety + carries an in-source `FIXME` (maintainer-acknowledged). Likely clean PR. |
| **62** | `rm` / `rmdir` | path-escape | `sv_ccmds.c:651-656` (rm) / `:611-617` (rmdir) vs `ls` `:545-553` | add the bare-`..` dirname guard + trailing-`/..` check that the sibling `ls` already has | **Judgment call.** Real escape but admin-gated (console + master-rcon only; normal rcon blocks rm/rmdir). Fix = consistency-with-`ls`. Assess whether the maintainer will see merit vs "admin already has rm". |

Secondary candidates if the 3 pan out and you want more (NOT in scope unless you choose): `#64` acc_create
length off-by-one, `#70` skill asymmetric clamp, `#71` password "none" inconsistency -- all `upstream-bug low`.

## The proven harvest workflow (per finding)

0. **Anchor gate.** The findings are anchored to mvdsv `1.11-53-g18d0362`. `git -C research/repos/mvdsv
   describe --tags` must match. Findings are HYPOTHESES until re-grepped -- verify the cited file:line at
   the anchor reads as the finding claims.
1. **Re-verify at the anchor.** Grep/read the cited site. Confirm the defect is real and the fix is
   correct AND minimal (one identifier / one guard, no behavior change on the normal path).
2. **CRITICAL -- verify it STILL EXISTS on current upstream master.** The research checkout is pinned
   OLD (upstream is ~12 commits ahead). The PR lands on `QW-Group/mvdsv:master`, so the bug must still be
   there. `git -C research/repos/mvdsv fetch origin --quiet` then `git -C ... grep -n "<pattern>"
   origin/master -- <file>`. If already fixed upstream -> NO PR; mark the finding and move on. (Both #15
   and #22 were still present; always check anyway.)
3. **Assess merit honestly.** Clear bug + zero-risk minimal fix + maintainer-friendly = ship. Admin-gated
   where the fix is debatable, intentional/author-flagged code, or "fixing" means retiring a feature =
   lower merit, likely skip (that is the pot-stirring the operator wants to avoid). Sibling-consistency
   fixes (#62 vs `ls`, #15's pattern) are a STRONG framing -- "this sibling already guards; this one
   forgot" reads as obviously-correct.
4. **Prep the PR (only for clear+clean).** One fix per PR, each on its own branch off `upstream/master`,
   in a FRESH scratch clone OUTSIDE the monorepo (e.g. `~/projects/mvdsv-pr-work` -- was removed, re-clone
   `QW-Group/mvdsv`, add the `ParadokS81/mvdsv` fork as a push remote). NEVER branch in `research/repos/mvdsv`
   (it is the pinned extraction anchor) and NEVER use a monorepo worktree.
5. **Show the operator the diffs + commit messages + PR bodies BEFORE pushing/opening.** The operator's
   `Signed-off-by` certifies the DCO -- they must see exactly what they sign.
6. **Commit attribution (upstream convention -- NOT the monorepo shape):**
   `Signed-off-by: David Larsen <david.larsen.1981@gmail.com>` + `Assisted-by: Claude:claude-opus-4-8`.
   AI must NOT add `Signed-off-by`; the operator's SoB is the human DCO cert. NO `Co-Authored-By:` (that is
   the internal monorepo trailer). Subject style = mvdsv's `file.c: short imperative`. Body = factual
   ("array is N, the bound checks M; sibling X guards correctly"), no severity hype.
7. **Open the PRs** via `gh pr create --repo QW-Group/mvdsv --base master --head ParadokS81:<branch>` once
   the operator says ship.

## Infra (verified 2026-06-03)

- Fork **exists**: `ParadokS81/mvdsv`. `gh` authed as `ParadokS81` (full `repo`/`workflow` scopes). The
  operator is already a merged mvdsv contributor (PR #192, #205, #206) -- this is familiar ground.
- `git push fork <branch>` then `gh pr create ...`. Run `gh auth setup-git` first if git push needs creds.
- **Hook gotcha:** a `PreToolUse` hook (`.claude/scripts/upstream-pr-reminder.sh`) false-fires if a
  *monorepo* commit command merely MENTIONS the scratch-clone path. So when you later commit the findings-
  doc status update in the monorepo, do NOT reference the upstream clone path in the same bash command.

## When done

- Update each shipped finding's **Status** in `mvdsv-describe-fill-findings.md` (`open` -> `filed-PR #NNN`,
  then `merged #NNN`). Commit ONLY that file in the monorepo (Co-Authored-By is correct there).
- Report which of the 3 shipped and which were skipped-with-reason.

## Reads required (cold-start order)

1. This file.
2. `mvdsv-describe-fill-findings.md` rows **#62, #63, #65** (the full observations; #64 for acc_create
   context). The header explains the Status vocabulary.
3. CLAUDE.md "Upstream PRs (outside this monorepo)" + memory `reference_upstream_pr_attribution`.
4. (optional) PRs #205 / #206 on `QW-Group/mvdsv` -- the two merged exemplars to match in shape/tone.

## Critical rules

- Findings are hypotheses until re-grepped -- at the anchor AND on current upstream master.
- One bug per PR; minimal diff; factual framing; no severity hype.
- The operator signs the DCO -- show diffs/messages before anything goes public.
- Do NOT force 3 PRs. Ship what clears the bar; skip-with-reason the rest (#62 is the likely skip/judgment).
- Work in a scratch clone; never touch `research/repos/mvdsv` HEAD or a monorepo worktree.

## First actions

1. Read this + the 3 finding rows cold.
2. Anchor gate + re-verify #63 / #65 / #62 at the anchor, then confirm each still exists on `origin/master`.
3. Decide per-finding: clean PR vs skip (expect #63 + #65 clean, #62 a judgment call).
4. For the clears: re-clone upstream to a scratch dir, branch per fix, apply the minimal diff, write
   commit + PR body, show the operator, then push + `gh pr create`.
5. Update finding Status in the monorepo findings doc; report shipped-vs-skipped.

## When in doubt

The bar is #15/#22: a defect a maintainer accepts in one read because the fix is obviously correct and
risk-free. If a fix needs a paragraph of justification or touches intentional/admin-gated behavior, it is
probably a skip. Source not legible / fix not minimal -> hedge and ask the operator, never guess.
