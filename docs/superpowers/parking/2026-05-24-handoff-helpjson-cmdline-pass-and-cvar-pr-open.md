# ezQuake help-JSON empty-entries audit — closing the arc (handoff)

**Created:** 2026-05-24 at end of commands-pass-shipping session.
**Status:** active handoff; consume in a fresh terminal to close the audit arc.
**Inputs:** the cmdline pass (56 entries, smallest of the three sub-passes) + the cvar PR open (drafts done 2026-05-15 by Opus-max, never opened upstream).

---

## State of the arc as of 2026-05-24

The ezQuake help-JSON empty-entries audit has three sub-passes. Two are shipped, one remains, plus a drafted-but-not-opened PR:

| Pass | Status | PR | L1 synthesis | Notes |
|---|---|---|---|---|
| **cvar** (124 verdicts) | DRAFTS DONE 2026-05-15 | NOT OPENED | not run | Opus-max-reviewed drafts exist; just needs the PR-payload → branch-build → push → open flow |
| **macros** (38) | SHIPPED 2026-05-23 | #1127 OPEN | done | arc-history retrospective at top of `apps/qw-oracle/docs/arc-history.md` |
| **commands** (156) | SHIPPED 2026-05-24 | #1128 OPEN | done | arc-history retrospective just above the macros one |
| **cmdline** (56) | NOT STARTED | -- | -- | smallest pass; nearly free given the commands-pass machinery is in place |

Plus a separate set of **awaiting-maintainer questions** in PR #1128 (canonical alias pattern, `mvd_name_item` label-discard bug, 5 dead/removed entries) — those don't need any new work, just operator response when the maintainers engage. PR #1127 carries no questions.

---

## What this handoff covers

Two pieces of work. Either can go first:

1. **Open the cvar PR** (smaller, drafts already exist)
2. **Run the cmdline pass** (cloning the commands-pass workflow at smaller scale)

Recommended order: cvar PR first (faster wins, gets all three PRs into maintainer queue together so they can review as a set), then cmdline pass.

---

## Reads required (in order)

1. **`apps/qw-oracle/docs/arc-history.md`** -- read the two top entries (2026-05-24 commands + 2026-05-23 macros). These describe the workflow shape you'll be cloning.

2. **`docs/superpowers/parking/2026-05-15-handoff-helpjson-cvar-pass-and-reachability-blindspot.md`** -- the original cvar pass handoff. The drafts mentioned there are the source for the cvar PR.

3. **`apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-cmdline.md`** -- the audit draft for cmdline (56 entries). This is the equivalent of the `-commands.md` audit doc the commands pass consumed.

4. **`apps/qw-oracle/docs/upstream-prs/ezquake-help-commands-PR-payload.json`** + **`apps/qw-oracle/scripts/insert-helpjson-synthesis-commands.py`** -- the shipped artifacts from today's commands pass. Use these as the template for both the cvar and cmdline equivalents.

5. **`HANDOVER.md`** lines for the audit -- the in-flight entry under "Open items" carries the full status across all three passes.

---

## Workflow: cvar PR open (estimated 30-60 min)

**Context:** the cvar pass shipped its drafts 2026-05-15 but the upstream PR was never opened. The drafts were Opus-max-reviewed but predate the macros-pass refinements (PR-payload JSON shape, per-family commit convention, `Assisted-by:` footer per Linux kernel coding-assistants convention). They need to be re-packaged into the new shape before opening.

**Steps:**

1. **Read the cvar drafts** -- start from the handoff at `docs/superpowers/parking/2026-05-15-handoff-helpjson-cvar-pass-and-reachability-blindspot.md`; it points at the drafted prose. The 124-verdict count includes a mix of needs_doc / no_doc / family_collapse / kick_to_ciscon.

3. **Check for any case-mismatch issues** (lesson from commands pass): verify each entry name against source registration before trusting the drafts. The commands pass caught `unignoreAll`/`unignoreAll_team` only when the L1 inserter pre-flight returned a count mismatch -- doing this check upfront would have caught it earlier. A quick script: for each cvar name in the draft, grep `Cvar_Register` / `cvar_t.*name` in source and verify the case matches.

4. **Apply the 4 outstanding rubric decisions from the cvar pass** -- they should be captured in the cvar handoff doc. If not, surface them with the operator using the same plain-English-first format the commands pass used (one question at a time, my opinion + tradeoffs).

5. **Generate the PR-payload JSON** at `apps/qw-oracle/docs/upstream-prs/ezquake-help-variables-PR-payload.json`. Clone the build script at `/tmp/build-commands-payload.py` (still in /tmp from today's session if not garbage-collected) and adapt: change FILLS structure to the 124 cvar verdicts; cvar JSON entries can carry additional fields (`group-id`, `type`, `values`, `default`) per `help_variables.json` shape -- inspect the existing file for which fields to emit beyond `description`.

6. **Build the PR branch** at `cleanup/help-json-variables-fills` off `upstream/master`. Clone `/tmp/build-commands-commits.py` for the per-commit-group structure -- 10-15 commits grouped by semantic family makes sense at 124 entries.

7. **Open the PR** via `gh pr create`. Title format: `help_variables: document N previously-empty variable entries`. Body should include any judgment calls (per `feedback_no_inference` -- if any drafts make claims that can't be traced to source, flag them).

8. **L1 synthesis** -- clone `insert-helpjson-synthesis-commands.py` to `insert-helpjson-synthesis-variables.py`; change type filter from `'command'` to `'cvar'`; change query target from `command_versions` to `cvar_versions`. deriveCvar is already F-D4a-guarded from the 2026-05-17 enforce-L1 arc.

9. **Regenerate snapshot** and commit monorepo changes (same 2-commit shape as today's commands pass: `feat(qw-oracle)` for the PR payload + L1 inserter, `chore(slipgate-app/data)` for the snapshot regen).

---

## Workflow: cmdline pass (estimated 1-2 hours given the scale)

**Context:** cmdline-params are the third entity type the audit covers; only 56 entries (vs 156 commands or 124 cvars). The audit's structural finding for cmdline is much smaller because `CMDLINE_DEF(...)` is a clean macro the L1 extractor handles well -- no `Cmd_AddLegacyCommand`-like shim issue.

**Steps:**

1. **Read the audit draft** at `apps/qw-oracle/docs/upstream-prs/ezquake-help-json-empty-entries-cmdline.md`. Look for the same shape as the commands audit -- counts table at top, family_collapse section if any, kick_to_ciscon if any.

2. **Operator-review pass** -- spot-check the 56 drafts against source HEAD. Expected finding rate ~10-15% based on macros (8/38 = 21%) and commands (19/97 needs_doc = 20%); so ~5-10 findings out of 56. Use the same scan-and-flag workflow as the commands pass (parallel sub-agent fan-out across the audit text; sub-agents return only flagged mismatches with `file:line` evidence; you synthesize the operator-facing batch).

3. **Generate PR-payload JSON** at `apps/qw-oracle/docs/upstream-prs/ezquake-help-cmdline-PR-payload.json`. Cmdline JSON entries shape is similar to commands -- `description` plus optional `arguments`, `systems`, `flags`. Inspect `help_cmdline_params.json` upstream for current shape.

4. **Build the PR branch** at `cleanup/help-json-cmdline-fills`. Probably 5-8 commits given the smaller entry count.

5. **Open the PR** at QW-Group/ezquake-source. Title: `help_cmdline_params: document N previously-empty cmdline entries`.

6. **L1 synthesis** -- clone `insert-helpjson-synthesis-commands.py` to `insert-helpjson-synthesis-cmdline.py`; change type filter from `'command'` to `'cmdline_param'`; change query target from `command_versions` to `cmdline_param_versions`. deriveCmdlineParam is already F-D4a-guarded from the 2026-05-17 enforce-L1 arc.

7. **Regenerate snapshot** and commit monorepo (same 2-commit shape).

8. **Update HANDOVER.md** -- mark cmdline pass shipped; if all three sub-passes are now shipped + their PRs opened, the audit can move from "Open items / Currently in-flight" to closed (delete the entry; the retrospective lives in `arc-history.md`).

---

## Critical rules (carried forward from the commands pass)

- **Operator is the technical-review gate.** Don't outsource judgment calls (rubric decisions, ambiguous shims, draft prose corrections) to a sub-agent. The macros / commands / cvar passes have ALL had operator catches the executors missed.

- **Verify against source HEAD, don't trust drafts blindly.** Cross-grep `research/repos/ezquake-source/src/` for specific factual claims (constants, format strings, build gates, alias relationships) before approving. The commands pass produced 19 corrections from 97 drafts (~20% finding rate).

- **Entry-name verification against source registration** (case-mismatch lesson from commands pass). Before generating prose for entries, verify each entry name matches the case used in source HEAD -- the camelCase `unignoreAll`/`unignoreAll_team` upgrades in PR #1128 (commit `d49491cc`) are the concrete example: drafts initially referenced a lowercased form not present in the file.

- **ASCII only in prose.** Plain English. See `feedback_output_discipline_sentiment` memory.

- **`Assisted-by: Claude:claude-opus-4-7` footer per commit; NO `Signed-off-by` from AI.** Operator signs the DCO at push time per Linux kernel coding-assistants convention.

- **`git diff --cached --stat` between every `git add` and `git commit`.** Defensive against parallel-actor staging mishaps (caught the KTX-rewrite-drafts contamination in today's commands pass).

- **Snapshot diff will be larger than just the new entries' direct changes** -- picks up accumulated L1 drift since the last snapshot. Normal; call it out in the commit message.

---

## When in doubt

Stop and ask the operator. Three precedents from today's commands pass demonstrate why:

- Decision 1 (head augmentations): operator surfaced that the 4 already-documented heads warranted cross-reference augmentation, not standalone work.
- Decision 2 (cvar-alias pointer pattern): operator initially leaned toward duplicate descriptions; sub-agent pushed back with the single-source-of-truth argument; operator agreed on pointer-style.
- Decision 4 (family-collapse refined policy): operator corrected the executor's framing about user-binds-both-sides-of-+/--pairs; refined policy to mechanism-and-behavior-driven rather than size-driven.

The operator's domain knowledge of QW + their judgment on maintainer review preferences are not replaceable by source-grepping.

---

## First three actions on session start

1. **Read this handoff doc + the arc-history.md top entries** to anchor the workflow.

2. **Decide cvar PR or cmdline pass first** -- propose cvar (smaller, drafts exist, gets all 3 PRs in front of maintainers as a set) but defer to operator preference.

3. **Spot-check the 4 cvar pass rubric decisions** -- find them in the cvar handoff doc, summarize plain-English first, propose the recommended resolution per question.

---

## Open dependencies (not in this handoff's scope)

- **L1-extractor classification arc** -- the 26 host.c `Cmd_AddLegacyCommand` shims + 2 outliers from the commands pass are routed there. Sibling arc; not blocking. Parking doc: `docs/superpowers/parking/2026-05-15-l1-extractor-entity-classification-followups.md`.

- **Maintainer responses on PR #1128** -- 3 questions awaiting. When responses come in, may need follow-up commits or PRs; track those in HANDOVER small followups. PR #1127 has no open questions.

- **mp3 dead-enum cleanup** -- HANDOVER small followup; surface `mp3info` + `mp3_volume` enum entries in `macro_ids.h` for separate 2-line PR.
