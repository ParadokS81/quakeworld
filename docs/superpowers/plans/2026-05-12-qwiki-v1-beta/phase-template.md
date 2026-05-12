# Phase template -- shape every phase MD must follow

Each phase MD has these sections, in this order. Don't add sections; don't remove them. If a section has nothing to put in it, write "n/a" -- empty sections are easier to spot than missing ones.

---

# Phase N -- <name>

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full).
> 2. Read `review-findings.md` and identify which findings apply to this phase (table at bottom of that file).
> 3. Read prior approved phase MDs (Phase 1, Phase 2, ...) -- their "Outputs to next phase" sections name what state this phase inherits.
> 4. After drafting, dispatch the verification sub-agent (brief at bottom of this template).

## Goal

One paragraph. What this phase produces and why it's a coherent unit. End with a sentence naming the **runnable state at phase boundary** (per D23 phase atomicity).

## Inputs from previous phase

What state must exist for this phase to start. Examples:

- "MW substrate running on Unraid + reachable at `https://wiki-beta.quake.world` (Phase A complete)."
- "PluggableAuth + Discord OAuth wired + `wiki-contributor` group auto-assignment working (Phase B complete)."

If this is Phase 1 (Phase A), inputs are the items in `prerequisites.md`.

## Files touched

Three subsections.

### Created

```
path/to/new/file.ext
path/to/new/dir/
```

Bullet list. Absolute paths from repo root. Comment if a file is generator-emitted vs hand-written.

### Modified

```
path/to/existing.ext                  # one-line what-changes note
```

Comments name the change at file granularity, not line granularity.

### Deleted

```
path/to/legacy.ext                    # one-line why-deleted note
```

Every deletion explains itself. Deleting silently is forbidden.

## Tasks

Numbered. Each task has:

- **Goal** (one sentence).
- **Files** (subset of "Files touched" above; just the ones this task touches).
- **Execution mode** (per D26):
  - `subagent (Sonnet medium | Sonnet MAX | Opus medium | Opus MAX | Haiku)` with one-line rationale, OR
  - `inline` with one-line rationale.
- **Steps** (`- [ ]` checkboxes).
- **Verification** (commands or queries).

Steps are imperative ("Edit X to do Y", "Run `<command>`", "Append to Z"). Avoid prose explaining what a step achieves -- if it's not mechanically doable, split it.

If a step ships file content inline, ship the FULL file content (not a diff, not a sketch). The drafter is responsible for verifying the inlined content is correct against the live codebase. Sub-agent verification confirms it.

"Engineer ports X" / "engineer fills in Y" / "TODO" smells -- either inline the work or split it into a task with its own steps.

## Verification (phase boundary)

Copy-paste commands the operator runs at the end of the phase to confirm it landed correctly. YES/NO answers, not interpretive prose.

Examples:

- Smoke probe: `curl -sI https://wiki-beta.quake.world | head -5` -- expect HTTP/2 200 OK.
- Database probe: `docker exec qwiki-mariadb mysql -uroot -e "SHOW DATABASES LIKE 'wiki%'"` -- expect `wiki` database exists.
- MW page render: open `https://wiki-beta.quake.world/wiki/Main_Page` in browser -- expect Citizen skin loaded, 6 nav tiles visible.
- Oracle harvest probe (substrate verification): run the documented harvest workflow on a test page, then query oracle MCP -- expect the harvested content returned.

Each verification ends with one of:

- "**PASS condition:** <specific check>"
- "**FAIL condition:** <specific signal>"

If verification PASSes, operator proceeds to phase N+1. If it FAILs, the phase MD's "Recovery" section is consulted.

## Outputs to next phase

What state is now true that wasn't before. Mirror of "Inputs from previous phase" -- Phase N's outputs match Phase N+1's inputs.

## Open questions / deferred items

Anything the drafter encountered but decided not to resolve in-phase. Each item:

- **Question:** one-line statement of the unresolved decision.
- **Default chosen for now:** what the phase MD does in absence of a decision.
- **Who can resolve:** "operator" / "Phase X" / "future arc".

If there are no open questions, write "n/a -- phase scope is fully resolved."

## Recovery (if verification fails)

Short section. Per-failure-mode recovery:

- "If smoke probe returns 5xx: check Cloudflare Tunnel status; restart with `<command>`. Most likely cause: tunnel restart needed after Phase A deploy."
- "If MW page renders without Citizen skin: skin install failed; re-run extension install + `php maintenance/update.php`."

This section is not exhaustive -- it covers the failures the drafter could anticipate. Unanticipated failures route to operator.

---

## Verification sub-agent dispatch

After the phase MD is drafted, the drafter spawns a sub-agent with `Agent` tool, `subagent_type=Explore`, and the following brief shape (adapt absolute paths to this phase):

```
You are verifying a draft plan phase against the live codebase and the arc's locked decisions.

Read this phase MD: <absolute path to phase-N-*.md>
Read decisions.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md
Read review-findings.md: /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md
Read prior approved phase MDs (Phase 1 through Phase N-1) and walk their "Outputs to next phase" sections.

Then verify, file-by-file:

1. Every "Inputs from previous phase" item -- does it match the prior phase's "Outputs to next phase"? Report mismatches.
2. Every "Files touched / Modified / Deleted" path -- verify the path exists in the live codebase. (For Created paths, verify the parent directory exists; do NOT flag a Created file's non-existence as drift -- this is paper plan, not executed code.)
3. Every task's Execution mode field -- is it declared (per D26)? Is the model+effort choice plausible for the task shape (Sonnet medium for code synthesis, Haiku for pure text shuffling, Opus MAX for cross-cutting reasoning)?
4. Every locked decision the phase touches -- does the phase MD respect it? List any drift.
5. Every "engineer ports X" / "fills in details" / TODO smell -- list them.
6. Every page-type, page-type form, template, MW group, namespace restriction, quality-tag category the phase introduces -- does it match D5 / D7 / D8 / D9 / D17 / D18 / D19? Flag any drift.
7. Every Cloudflare / Unraid / Discord OAuth config touch -- does it match D3 / D4 / D19?
8. Every verification probe -- can it parse / does the command shape make sense given the substrate this phase produces?
9. Cross-decision drift: any new commitment that should be a decisions.md amendment but isn't?
10. Cross-phase drift: any commitment that affects OTHER phases but isn't surfaced as a "Carry forward to Phase M" note?

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```

The drafter applies the sub-agent's findings to the phase MD before declaring the phase ready for operator review. If a sub-agent finding contradicts `decisions.md`, decisions.md wins and the finding is rejected with a one-line rationale in the phase MD's "Open questions" section. If a finding has cross-phase implications, append it to `review-findings.md` with cross-phase pointers.

---

## Phase MD length

There is no hard cap. Length follows from the work the phase requires. Apply judgement at the ~600-1000 line range:

- **Split** if the phase has two natural sub-deliverables that could ship as separate commits (e.g., a substrate phase might split into `phase-1a-mw-stack.md` and `phase-1b-extensions.md` if the MW-stack-only commit is independently runnable). Update `README.md` to link both.
- **Don't split** if splitting forces shared state or context to be duplicated across files. A 1200-line phase that's one coherent unit beats two 600-line phases that share a preamble.

Cutting tasks, hand-waving file lists, or dropping verification probes to "fit" is the wrong move every time. The whole point of this template is complete, verifiable phase MDs -- length is a side effect, not a constraint.

If the drafter is unsure whether to split, default to NOT splitting and surface the question in the phase's "Open questions" section for operator review.

---

*This template is enforced. Phase MDs that drift from this shape get bounced to revision before review.*
