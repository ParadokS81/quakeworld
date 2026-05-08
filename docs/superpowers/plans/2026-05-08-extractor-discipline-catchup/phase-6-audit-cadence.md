# Phase 6 -- Cross-project audit cadence + skill update part 2

> **Drafter checklist before writing this phase:**
> 1. Read `decisions.md` (full). -- DONE
> 2. Read `review-findings.md`. F1 (pytest sys.path pollution) touched by Phase 3; not resolved by Phase 6. No Phase 6-owned findings. -- DONE
> 3. Read parking doc Pass 1.2.5 (cross-project audit cadence trigger set) + Pass 2.2 (skill update part 2: "no per-project bash" callout) + Pass 2.3 (Phase 6 roadmap entry). -- DONE
> 4. Source-walked `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`: insertion point is between Porting checklist step 10 closing `---` (line 1073) and `## Cross-references` (line 1075). -- DONE
> 5. Read `HANDOVER.md` Small followups section. Per-project conftest.py entry (line 28) is the most recent precedent. New entry appends at end of Small followups list. -- DONE
> 6. Read `~/.claude/skills/onboard-extractor/SKILL.md` end-to-end. Phase F4 / Phase F5 boundary identified (after Step 4 quality-grid codeblock, before `### Phase F5: Validation handoff`). Phase 5 NOT YET DRAFTED -- no collision to check. -- DONE
> 7. Verified `feedback_retrofit_later_discipline.md` content. Principle matches Pass 1.2.5 framing exactly (arc-based not calendar-based; trigger-set captures cross-project-affecting changes). Cross-link appropriate; included in PLAYBOOK section. -- DONE
> 8. Phase 5 MISSING at draft time. SKILL.md callout placement (between F4 and F5) is non-colliding with Phase 5's planned Phase F5 expansion. Executor must verify at runtime. -- DONE

## Goal

Phase 6 ships the cross-project audit cadence process rule across three locations: (1) a new "Cross-project audit cadence" section in `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` encoding the four-trigger rule per Pass 1.2.5 (trigger set is LOCKED; do not add or remove triggers); (2) a one-liner tracking entry in `HANDOVER.md` Small followups pointing at the rule location and most recent audit doc; and (3) an explicit "no per-project bash scripts" callout block added to `~/.claude/skills/onboard-extractor/SKILL.md` between Phase F4 and Phase F5 as part 2 of the two-phase SKILL.md update (part 1 lands in Phase 5 per D10). A cross-link to operator memory `feedback_retrofit_later_discipline.md` is included inline in the PLAYBOOK section -- the memory's content matches the Pass 1.2.5 framing exactly. Phase 6 is paper-only: no new code, no audit doc generation, no probe authoring. Runnable state at phase boundary: the cadence rule is documented in three locations; any future arc operator can find the trigger set at a glance in the PLAYBOOK; future onboarders reading the onboard-extractor skill will see an explicit warning before they reach the validation handoff, preventing recreation of the `idempotency-ktx.sh` per-project bash anti-pattern.

## Inputs from previous phase

Phase 5 complete (parallel-safe execution): `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` shipped; SKILL.md update part 1 landed (register-in-config-dict step added between scaffolding and validation; Phase F5 validation step expanded to 4-5 universal gates). Phase 6 edits SKILL.md Phase F4 area and two non-overlapping files (PLAYBOOK + HANDOVER); none depend on Phase 5's edits landing first. Safe to execute Phase 6 before or after Phase 5.

Note: Phase 5 is not yet drafted at Phase 6 draft time. The SKILL.md callout placement (between F4 and F5) was chosen to avoid collision with Phase 5's planned Phase F5 expansion. Executor must read the current SKILL.md at execution time and confirm Phase 5's content has not already landed at the F4/F5 boundary; adjust placement one block if needed (see Open questions item 1).

## Files touched

### Created

(none)

### Modified

```
apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md    # new "Cross-project audit cadence" section inserted before ## Cross-references
HANDOVER.md                                                 # one-liner tracking entry appended to Small followups list
~/.claude/skills/onboard-extractor/SKILL.md                # "no per-project bash" callout block inserted between Phase F4 and Phase F5
```

### Deleted

(none)

## Tasks

### Task 1: Add "Cross-project audit cadence" section to EXTRACTOR-PLAYBOOK.md

**Goal:** insert a named "Cross-project audit cadence" section in EXTRACTOR-PLAYBOOK.md with the four-trigger rule (verbatim from Pass 1.2.5), the audit-output path convention, the rationale, and a pointer to the most recent audit doc.

**Files:** `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`

**Steps:**

- [ ] Read EXTRACTOR-PLAYBOOK.md to confirm the `---` separator at approximately line 1073 (between the Porting checklist's step-10 closing line "Update the playbook if new patterns are generalizable." and `## Cross-references`).
- [ ] Insert the new section content immediately after that `---` separator. The existing `---` stays in place before the new section. Add a closing `---` after the new section, before `## Cross-references`. Resulting structure:

```
[existing ---]

## Cross-project audit cadence

<section body below>

---

## Cross-references
```

**Full section content to insert (inline, verbatim):**

```
## Cross-project audit cadence

Run the cross-project audit (via the `validate-extractor` skill in cross-project mode) after every arc that:

- adds a new project, OR
- adds a new entity type, OR
- ships a schema migration, OR
- modifies `extractor_lib/` or `load-version.ts` (cross-cutting infrastructure).

Skip the audit for per-handler tweaks within a single project that don't touch shared infrastructure. Per-project-only changes cannot regress sibling projects.

Audit output lands at: `docs/superpowers/reviews/YYYY-MM-DD-<arc>-cross-project-audit.md`.

Rationale: extraction work is arc-based, not calendar-based. The four triggers above are the cases where prior-engine regressions are actually possible -- a new project imports `extractor_lib` and exercises code paths the other four don't; a schema migration reshapes loader inputs all projects depend on; a `load-version.ts` change touches every project's loader path. Per-project-only handler changes cannot affect siblings. For the broader principle behind this trigger set, see operator memory `feedback_retrofit_later_discipline.md`.

Most recent audit: `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md` (five-engine state at KTX onboarding arc close, 2026-05-06).
```

**Verification:**

```bash
grep -n "Cross-project audit cadence" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```

PASS condition: one match at a line number before the `## Cross-references` section (currently ~line 1075; shifts down after insert).

```bash
grep -n "## Cross-references" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```

PASS condition: `## Cross-references` appears after the new section in the file.

FAIL condition: zero matches for "Cross-project audit cadence" (section not inserted), OR `## Cross-references` appears before the new section (wrong order).

**Execution mode:** inline -- full section content shipped in this phase MD; text-only markdown edit; no logic.

---

### Task 2: Add tracking entry to HANDOVER.md Small followups

**Goal:** append a one-liner to the end of HANDOVER.md's Small followups bullet list that tracks the audit cadence rule location and the most recent audit doc.

**Files:** `HANDOVER.md`

**Steps:**

- [ ] Read HANDOVER.md to locate the "Small followups" section and identify the last bullet entry before `### Sidequests`. At draft time the last bullet is the "D4 depth-N Pattern 6 lift revisit" entry. Confirm that is still the last entry (no new bullets added by Phase 5 execution).
- [ ] Append the following entry as a new bullet at the end of the Small followups list, immediately before the blank line + `### Sidequests` block:

**Full entry content to insert (inline, verbatim -- ASCII only, no em-dashes):**

```
- **Cross-project audit cadence** -- trigger-based rule: run `validate-extractor` in cross-project mode after arcs that add a new project, new entity type, schema migration, or modify `extractor_lib/` or `load-version.ts`. Rule at EXTRACTOR-PLAYBOOK.md "Cross-project audit cadence" section; last audit: `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md`. Next trigger: whichever of the four trigger-set conditions fires first in a future arc.
```

**Verification:**

```bash
grep -n "Cross-project audit cadence" HANDOVER.md
```

PASS condition: one match located in the Small followups section (before `### Sidequests`).

```bash
grep -P "\xe2\x80\x94" HANDOVER.md | tail -5
```

PASS condition: any em-dash matches are from pre-existing entries only (the new entry uses `--` not `--` em-dash). Executor visually confirms the new bullet uses ASCII `--`.

FAIL condition: zero matches (entry not inserted); or match found after `### Sidequests` (wrong section).

**Execution mode:** inline -- one-liner text insert to markdown file; no logic. Note: pre-existing em-dashes in older HANDOVER.md bullets are expected; they are out of Phase 6 scope.

---

### Task 3: Add "no per-project bash scripts" callout to SKILL.md

**Goal:** insert an explicit callout block between Phase F4 and Phase F5 in `~/.claude/skills/onboard-extractor/SKILL.md` warning against recreating the `idempotency-ktx.sh` per-project bash anti-pattern.

**Files:** `~/.claude/skills/onboard-extractor/SKILL.md` (user-global file; NOT in the project repo)

**Steps:**

- [ ] Read `~/.claude/skills/onboard-extractor/SKILL.md` using the Read tool with the absolute path. Confirm the file exists.
- [ ] Locate `### Phase F5: Validation handoff` in the file. Find the text immediately preceding it -- at draft time this is the closing bash codeblock of Phase F4 Step 4 (the `npm --prefix apps/qw-oracle ...` quality-grid command). If Phase 5 has already shipped and placed content at the F4/F5 boundary, adjust: place the callout immediately before Phase F5's header regardless of what precedes it (any Phase 5 content will be INSIDE Phase F5's block, so the callout still goes before the Phase F5 header).
- [ ] Insert the following callout block immediately before `### Phase F5: Validation handoff`. One blank line above the callout, one blank line below (before the Phase F5 header):

**Full callout content to insert (inline, verbatim):**

```
> **Anti-pattern -- no per-project bash scripts.** The KTX-era `idempotency-ktx.sh` pattern (a per-project bash script running a snapshot-diff idempotency check) is retired. Universal gates in `scripts/load-knowledge/` handle idempotency, reproducibility, and related checks for all projects via `bun run load-knowledge -- <gate> --project <name>`. Do NOT author a new per-project bash script for any gate the universal suite covers. Instead, add the new project to each universal gate's per-project config dict (see `scripts/load-knowledge/VALIDATION-GATES.md` Section 5 for the config dict shape).
```

**Verification:**

```bash
grep -n "Anti-pattern" ~/.claude/skills/onboard-extractor/SKILL.md
```

PASS condition: one match in the file.

```bash
grep -n "Phase F5: Validation handoff" ~/.claude/skills/onboard-extractor/SKILL.md
```

Cross-check: the "Anti-pattern" line number must be LOWER than the "Phase F5" line number (callout appears before the header).

PASS condition: Anti-pattern line number < Phase F5 line number.

FAIL condition: zero matches for "Anti-pattern" (callout not inserted); or Anti-pattern line number > Phase F5 line number (wrong location).

**Execution mode:** inline -- full callout content shipped; text-only insert to markdown file; no logic. The SKILL.md is user-global (`~/.claude/skills/`), not in the project repo -- use the absolute path with the Read tool before editing.

---

## Verification (phase boundary)

Run these at the end of Phase 6 execution:

**V1 -- PLAYBOOK section inserted:**
```bash
grep -n "Cross-project audit cadence" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```
PASS: one match before `## Cross-references`.
FAIL: zero matches or match after Cross-references.

**V2 -- PLAYBOOK trigger set complete (all four triggers present):**
```bash
grep -c "new project\|new entity type\|schema migration\|extractor_lib.*load-version" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
```
PASS: 4+ matches (the four trigger-list bullets in the new section). Manually confirm they appear in the new section.
FAIL: fewer than 4 matches (a trigger bullet was dropped during editing).

**V3 -- HANDOVER tracking entry present:**
```bash
grep -n "Cross-project audit cadence" HANDOVER.md
```
PASS: one match in the Small followups section (before `### Sidequests`).
FAIL: zero matches or wrong section.

**V4 -- SKILL.md callout present and correctly placed:**
```bash
grep -n "Anti-pattern" ~/.claude/skills/onboard-extractor/SKILL.md
grep -n "Phase F5: Validation handoff" ~/.claude/skills/onboard-extractor/SKILL.md
```
PASS: Anti-pattern line number < Phase F5 line number.
FAIL: zero Anti-pattern matches; or Anti-pattern line >= Phase F5 line.

**V5 -- Most recent audit pointer is a real file:**
```bash
ls docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md
```
PASS: file exists (confirmed at draft time; verify at execution time).
FAIL: file not found -- update the "Most recent audit" line in the PLAYBOOK section to the correct path before committing.

**V6 -- ASCII discipline in new PLAYBOOK content:**
```bash
python3 -c "
import re, sys
content = open('apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md').read()
# Find the new section
start = content.find('## Cross-project audit cadence')
end = content.find('## Cross-references', start)
if start == -1:
    sys.exit('section not found')
section = content[start:end]
bad = re.findall(r'[–—‘’“”]', section)
print('Bad chars:', bad if bad else 'none')
"
```
PASS: "Bad chars: none" (no en-dashes, em-dashes, or smart quotes in the new section).
FAIL: any bad char listed -- re-edit the section content replacing with ASCII equivalents.

## Outputs to next phase

- `apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md` carries a "Cross-project audit cadence" section with the four-trigger rule, the audit-output path convention, and the rationale cross-link.
- `HANDOVER.md` Small followups tracks the audit lifecycle with a pointer to the rule location + most recent audit.
- `~/.claude/skills/onboard-extractor/SKILL.md` warns explicitly against per-project bash scripts before onboarders reach the validation handoff.
- Phase 7 (cert doc) can reference the cadence rule as a delivered process artifact and include it in the arc-close graduation summary.

## Open questions / deferred items

1. **Question:** Phase 5 is not yet drafted at Phase 6 draft time. If Phase 5 executes first and places content at the SKILL.md Phase F4/F5 boundary before Phase 6 executes, the executor must verify no text overlap.
   **Default chosen for now:** callout goes immediately before `### Phase F5: Validation handoff` header. Phase 5's planned content expands INSIDE the Phase F5 block (the validation step body), so the header itself is the boundary marker; Phase 6's callout goes just before it. Collision is unlikely but executor must confirm.
   **Who can resolve:** executor at execution time (read current SKILL.md, locate Phase F5 header, insert immediately before it).

2. **Question:** HANDOVER.md has pre-existing em-dashes in older bullet entries. Should the executor also clean up that drift?
   **Default chosen for now:** No -- out of Phase 6 scope per D16. Phase 6 introduces only ASCII content; pre-existing drift is not touched.
   **Who can resolve:** operator, in a future maintenance pass or docs-check cleanup.

3. **Question:** The PLAYBOOK "Most recent audit" pointer cites `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md`. This was confirmed to exist at draft time (2026-05-08). If a newer cross-project audit has been run between draft time and execution time, the pointer should be updated.
   **Default chosen for now:** cite the 2026-05-06 audit. Executor checks V5 and updates if a more recent audit doc is present in `docs/superpowers/reviews/`.
   **Who can resolve:** executor via `ls docs/superpowers/reviews/ | sort | tail -5`.

n/a for shape questions -- all open items are implementation-shaped (runtime state checks), not arc-shape questions.

## Recovery (if verification fails)

- **V1 fails (PLAYBOOK section not found):** re-run Task 1. Most likely cause: insertion at the wrong separator (there are multiple `---` separators in the PLAYBOOK). Confirm the target `---` is between the Porting checklist's final step and `## Cross-references` at approximately line 1073. Re-read the file to locate the exact current line numbers before editing.

- **V3 fails (HANDOVER entry not found):** re-run Task 2. Most likely cause: insertion inside an existing bullet body rather than as a new top-level bullet. Confirm the new entry starts at column 0 with `- **Cross-project`.

- **V4 fails (SKILL.md callout not found):** re-run Task 3. Most likely cause: wrong file path (repo-relative vs. user-global) or editing the wrong file. The SKILL.md is at `~/.claude/skills/onboard-extractor/SKILL.md` -- verify the Read tool returned the skill content (it should start with frontmatter `---\nname: onboard-extractor\n...`).

- **V4 fails (callout placed after Phase F5 header):** re-run Task 3, moving the callout to immediately BEFORE `### Phase F5: Validation handoff`. The Edit tool's `old_string` should include the `### Phase F5` header so the replacement anchors to the right location.

- **V5 fails (audit doc not found):** do NOT commit a broken pointer. Update the "Most recent audit" line in the PLAYBOOK section to the path of the most recent file in `docs/superpowers/reviews/` whose name contains "cross-project-audit" or "cross-project".

- **V6 finds bad chars:** the Edit tool produced curly quotes or em-dashes in the inserted markdown. Re-edit the affected file using only ASCII: `--` for dashes, `"` for quotes. Check the Write tool was not used with a heredoc that introduced smart quotes from the shell.

---

## Findings resolved by this phase (per `review-findings.md`)

- **F1** (Full-suite pytest sys.path pollution -- FTE + QW collection errors): NOT resolved by Phase 6. F1 is a HANDOVER followup for a future test-authoring pass. Phase 6 does not touch the pytest tree or add any tests.

No `review-findings.md` entries are resolved or owned by Phase 6. Phase 6 is doc-only; no catch-up audit runs, no gate-surfaced bugs, no code changes.

---

## Verification sub-agent dispatch (drafter runs this AFTER drafting the phase, BEFORE handing back to operator)

After the phase MD is drafted, the drafter spawns a sub-agent with the `Agent` tool, `subagent_type=Explore`, model: Sonnet medium, and the following brief:

```
You are verifying a draft plan phase against the live codebase.

Read this phase MD:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md

Read decisions.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md

Read review-findings.md:
  /home/paradoks/projects/quakeworld/docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md

Read the relevant section of the brainstorm parking doc:
  /home/paradoks/projects/quakeworld/docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
  (relevant sections: Pass 1.2.5 -- cross-project audit cadence trigger set + Pass 2.2 -- skill update part 2 + Pass 2.3 -- Phase 6 roadmap entry)

Then verify:

1. TRIGGER SET completeness (D11): does the phase MD's PLAYBOOK section content include all four and only the four locked triggers (adds a new project / adds a new entity type / ships a schema migration / modifies extractor_lib or load-version.ts)? Flag CRITICAL if a trigger is missing or an extra trigger was added.

2. CI-readiness conventions (D2): Phase 6 is doc-only; no TS probe is shipped. Confirm the phase MD does NOT add any CI-readiness gates (those belong to Phases 1-4). Flag ADVISORY if the phase MD appears to add probe code.

3. Every file path mentioned in "Files touched":
   - For Modified: verify the path exists in the live codebase.
     - apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md -- verify exists.
     - HANDOVER.md -- verify exists (repo root).
     - ~/.claude/skills/onboard-extractor/SKILL.md -- verify exists (user-global path).
   - For Created: none expected -- flag CRITICAL if any Created file is listed.
   - For Deleted: none expected -- flag CRITICAL if any Deleted file is listed.

4. SKILL.md edit placement: does the phase MD instruct inserting the callout BEFORE "### Phase F5: Validation handoff"? Flag SUBSTANTIVE if the insertion point is ambiguous or targets Phase F5 interior instead.

5. Phase 5 collision check: does the phase MD acknowledge the Phase 5 timing dependency (Phase 5 not drafted at time of Phase 6 draft) and give the executor a clear default for placement? Flag ADVISORY if the Open questions section does not address this.

6. Audit doc pointer: does the phase MD reference `docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md`? Verify that file path exists in the live codebase. Flag CRITICAL if the file does not exist (broken pointer).

7. HANDOVER insertion point: does the phase MD instruct inserting in the "Small followups" section (before "### Sidequests")? Flag SUBSTANTIVE if the target section is wrong or ambiguous.

8. ASCII discipline: does the inline PLAYBOOK section content (shipped verbatim in the phase MD) contain any em-dashes, en-dashes, or smart quotes? Flag CRITICAL on any violation (per D16).

9. Execution mode declarations: Phase 6 is doc-only. Confirm all three tasks declare "inline" execution mode. Flag ADVISORY if any task declares a subagent.

10. SKILL.md path: the phase MD instructs editing "~/.claude/skills/onboard-extractor/SKILL.md". Verify the file exists at that path and is the onboard-extractor skill (check for "name: onboard-extractor" frontmatter). Flag CRITICAL if the path is wrong.

11. Per-task "Execution mode" check: flag if >30% subagent for this markdown-only phase (per D15 inline-default for doc phases). Confirm all three tasks are declared inline.

12. PLAYBOOK memory cross-link: does the inline section content reference "feedback_retrofit_later_discipline.md"? Flag ADVISORY if the cross-link is absent (parking doc Pass 1.2.5 recommends it).

Report findings under 400 words, in this shape:

CRITICAL (would break execution): ...
SUBSTANTIVE (would ship buggy behavior): ...
ADVISORY (style / consistency): ...

If a section has no findings, write "(none)".
```
