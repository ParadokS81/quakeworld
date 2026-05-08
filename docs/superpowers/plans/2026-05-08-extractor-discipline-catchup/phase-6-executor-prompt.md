You are executing Phase 6 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch related files (the onboard-extractor SKILL.md is shared; both arcs reference EXTRACTOR-PLAYBOOK.md). Phase 6 ships THREE doc-only edits: (1) a new "Cross-project audit cadence" section in EXTRACTOR-PLAYBOOK.md, (2) a one-liner Small-followups bullet in HANDOVER.md, and (3) an "Anti-pattern -- no per-project bash scripts" callout in `~/.claude/skills/onboard-extractor/SKILL.md` between Phase F4 and Phase F5. If you see references to "Pattern 6 cross-header lift", "modes-handler refactor", "taxonomies handler", "election_type / death_rule", "Phase 5 modes handler", "F1-F30 KTX onboarding finding numbers", or any KTX onboarding implementation work, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 6 SCOPE: Paper-only -- no code, no probes, no DB. Three doc edits in three files: PLAYBOOK new section (full content shipped inline in the phase MD), HANDOVER one-liner bullet appended to Small followups, SKILL.md callout block inserted between Phase F4 and Phase F5. Runnable state at phase end: the cadence rule is documented in three locations; the four-trigger set per D11 is verbatim in the PLAYBOOK; future onboarders reading the onboard-extractor skill see an explicit warning before reaching the validation handoff.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO modify the live files, run verification probes, and commit + push. The phase MD is the source of truth for what to do.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md
   The phase MD itself. Source of truth for the three task contents (full PLAYBOOK section + full HANDOVER bullet + full SKILL.md callout shipped verbatim inline) and verification probes V1-V6.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. Phase 6 respects D9 (sibling docs not extension; PLAYBOOK is its own producer-perspective doc), D10 (skill update split: Phase 6 lands part 2 -- the no-per-project-bash callout), D11 (audit cadence trigger set: four triggers verbatim, no extras), D13 (phase atomicity -- one commit), D14 (operator review at boundary), D15 (all 3 tasks inline -- doc-only phase), D16 (ASCII discipline; new content uses `--`, not em-dash), D17 (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   F1 (pytest sys.path pollution) is HANDOVER-tracked, not resolved by P6. Phase 6 adds no F-entries (doc-only; no catch-up audit run, no gate-surfaced bugs).

4. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   Insertion target for Task 1. The new "Cross-project audit cadence" section goes between the `---` separator at approximately line 1073 (closing the Porting checklist) and `## Cross-references` at approximately line 1075.

5. HANDOVER.md
   Insertion target for Task 2. Append to the end of the "Small followups" bullet list, immediately before `### Sidequests`. The current last bullet at draft-time was "D4 depth-N Pattern 6 lift revisit"; verify that is still the last entry.

6. ~/.claude/skills/onboard-extractor/SKILL.md
   Insertion target for Task 3. The callout block goes immediately before `### Phase F5: Validation handoff`. This is a USER-GLOBAL file, NOT in the project repo. Use the absolute path `/home/paradoks/.claude/skills/onboard-extractor/SKILL.md` with the Read and Edit tools.

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against decisions.md and the live files. The drafter session was sub-agent-verified at draft time, but you (the executor) are running cold against live state. Spot-check:

a. PLAYBOOK insertion-point still valid:
     grep -n "## Cross-references\|^---$" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md | tail -5
   Expected: a `---` separator on a line immediately preceding the line that contains `## Cross-references`. If the file has been restructured since draft-time and the separator is gone, halt -- the insertion point assumption is broken.

b. HANDOVER Small-followups section + last-bullet anchor:
     grep -n "^### Small followups\|^### Sidequests" HANDOVER.md
     grep -n "D4 depth-N Pattern 6 lift revisit" HANDOVER.md
   Expected: `### Small followups` line < `### Sidequests` line; the "D4 depth-N" bullet is between them. If a newer bullet has been appended after "D4 depth-N", append the Phase 6 bullet AFTER the new last entry (not after "D4 depth-N"); the goal is "last in the Small followups list, before Sidequests."

c. SKILL.md F4/F5 boundary still valid:
     grep -n "^### Phase F4\|^### Phase F5" /home/paradoks/.claude/skills/onboard-extractor/SKILL.md
   Expected: `Phase F4: Quality-grid probes` and `Phase F5: Validation handoff` both present. If Phase 5 (the doc-phase, sibling to this one) has executed first AND placed content at the F4/F5 boundary, your insertion point is STILL "immediately before `### Phase F5: Validation handoff`" -- Phase 5's content lands INSIDE the Phase F5 block (validation step body), so the F5 header itself is the boundary.

d. Audit-doc pointer is real:
     ls docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md
   Expected: file exists. If a newer cross-project audit has shipped since draft-time, update the "Most recent audit" line in the PLAYBOOK section to the new path before committing. List newer audits with: `ls docs/superpowers/reviews/ | sort | grep -E 'cross-project|cross-extractor' | tail -3`.

e. Memory cross-link target exists:
     ls /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/feedback_retrofit_later_discipline.md
   Expected: file exists. The PLAYBOOK section's prose references this memory; if it doesn't exist, surface to operator before committing (the cross-link would be stale).

f. Phase 5 collision check (parallel-safe phase ordering):
     ls docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md 2>/dev/null && echo "P5 MD present" || echo "P5 MD not yet drafted"
     git log --oneline -5 | grep -i "phase 5" && echo "P5 commit found" || echo "no P5 commit"
   Phase 5 may or may not have shipped before Phase 6 executes (parallel-safe per parking doc Pass 2.3). No action needed; just informational so you know whether SKILL.md may already have Phase 5's part-1 edits in place.

If any pre-flight check fails CRITICALLY, halt with status NEEDS_CONTEXT before executing any task.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-3 per the phase MD. All three are `inline` execution mode (D15: doc-only with full content shipped).

Task 1 -- Insert "Cross-project audit cadence" section into EXTRACTOR-PLAYBOOK.md:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Read EXTRACTOR-PLAYBOOK.md and locate the `---` separator between the Porting checklist's closing line "Update the playbook if new patterns are generalizable." and `## Cross-references`. Confirm the line numbers (approximately 1073 and 1075 at draft time).
    2. Use the Edit tool to anchor the replacement on the unique combination of `<closing prose line>\n\n---\n\n## Cross-references`. The new section goes between the existing `---` and `## Cross-references` (insert section + a closing `---` after it).
    3. Full section content is in the phase MD's Task 1 "Full section content to insert" block -- copy verbatim. Includes the four trigger bullets per D11 (new project / new entity type / schema migration / extractor_lib or load-version.ts), audit-output path convention, rationale paragraph, memory cross-link to `feedback_retrofit_later_discipline.md`, and "Most recent audit" pointer.
    4. ASCII discipline: the section uses `--` (ASCII double-hyphen), `"..."` (ASCII straight quotes), no em-dashes, no smart quotes. Verify after edit with V6.

Task 2 -- Append tracking entry to HANDOVER.md Small followups:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Read HANDOVER.md and locate the "Small followups" section (`### Small followups`) and the last bullet before `### Sidequests`.
    2. Use the Edit tool to anchor on the last bullet's content + the blank line + `### Sidequests` header. Insert the new bullet between the last bullet and the blank line that precedes `### Sidequests`.
    3. Full bullet content is in the phase MD's Task 2 "Full entry content to insert" block -- copy verbatim. Bullet starts with `- **Cross-project audit cadence**` and uses ASCII `--` (NOT em-dash). Pre-existing em-dashes in older HANDOVER bullets are out of scope.
    4. Verify after edit with V3.

Task 3 -- Insert "Anti-pattern" callout into SKILL.md:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Read `/home/paradoks/.claude/skills/onboard-extractor/SKILL.md` (USER-GLOBAL absolute path; NOT a repo-relative path). Confirm the file starts with frontmatter `---\nname: onboard-extractor\n...`.
    2. Locate `### Phase F5: Validation handoff` (approximately line 208 at draft time). The callout goes IMMEDIATELY BEFORE this header, with one blank line above and one blank line below.
    3. Use the Edit tool to anchor on the closing-text of Phase F4 + the blank line + `### Phase F5: Validation handoff` header. Insert the callout block + one blank line, immediately before the F5 header.
    4. Full callout content is in the phase MD's Task 3 "Full callout content to insert" block -- copy verbatim. Block is a single blockquote (`>` prefix) starting `> **Anti-pattern -- no per-project bash scripts.**` and references VALIDATION-GATES.md Section 5.
    5. Verify after edit with V4.

VERIFICATION (phase boundary):

Run V1-V6 from the phase MD's Verification section in order. Each ends PASS or FAIL.

V1: PLAYBOOK section inserted (`grep -n "Cross-project audit cadence" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`).
V2: PLAYBOOK trigger set complete -- 4+ matches across the four trigger bullets (`grep -c "new project\|new entity type\|schema migration\|extractor_lib.*load-version" apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md`).
V3: HANDOVER tracking entry present (`grep -n "Cross-project audit cadence" HANDOVER.md`).
V4: SKILL.md callout present and correctly placed (Anti-pattern line < Phase F5 line).
V5: Most recent audit pointer is a real file (`ls docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md`).
V6: ASCII discipline in new PLAYBOOK content (the python3 regex check from the phase MD; expects "Bad chars: none").

Per D6: Phase 6 is doc-only -- no catch-up audit run, no gate-surfaced bugs. No F-entries to append. If V1-V6 all PASS, phase is done.

If any V fails AND the phase MD's Recovery section doesn't cover the failure mode, halt with status BLOCKED.

COMMIT + PUSH:

Stage:
  - apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md (modified)
  - HANDOVER.md (modified)
  - ~/.claude/skills/onboard-extractor/SKILL.md (modified -- USER-GLOBAL file, NOT in repo, NOT staged via git)

NOTE: SKILL.md lives outside the project repo. The git commit covers only the two repo files (PLAYBOOK + HANDOVER); the SKILL.md edit is filesystem-only and persists in the user's home dir. Document the SKILL.md edit in the commit body so the change is traceable.

Commit subject (one line, ASCII, <= 72 chars where possible):
  extractor-discipline-catchup phase 6: cross-project audit cadence rule

Commit body shape (HEREDOC):
  Cross-project audit cadence process rule shipped to three locations:
  EXTRACTOR-PLAYBOOK new section (four-trigger rule per D11; rationale +
  memory cross-link), HANDOVER.md Small-followups bullet (lifecycle
  pointer to rule + most recent audit), and onboard-extractor SKILL.md
  callout between Phase F4 and Phase F5 (anti-pattern: no per-project
  bash scripts; lift to universal-gate config dict instead).

  Trigger set (locked per D11): adds-new-project / adds-new-entity-type
  / ships-schema-migration / modifies-extractor_lib-or-load-version.ts.
  Skip for per-handler tweaks within a single project that don't touch
  shared infrastructure.

  Most recent audit pointer cites:
    docs/superpowers/reviews/2026-05-06-ktx-onboarding-cross-project-audit.md

  D10 skill-update split: this commit lands part 2 (no-per-project-bash
  callout). Part 1 (register-in-config-dict step + validation step
  expansion to 4-5 universal probes) ships in Phase 5.

  SKILL.md edit is to user-global ~/.claude/skills/onboard-extractor/
  SKILL.md and is filesystem-only (not in this commit). PLAYBOOK +
  HANDOVER edits are repo-tracked and ship in this commit.

  Verification (phase boundary): V1-V6 PASS.

Push to origin per D17 (`git push origin main`).

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: V1-V6 all PASS; phase MD complete; commit pushed; clean tree.
  Report: commit SHA, V-status summary, confirmation that SKILL.md filesystem edit landed (with grep-verified line position relative to Phase F5 header).

- DONE_WITH_CONCERNS: V1-V6 PASS but execution surfaced something unexpected.
  Report: same as DONE plus the concern + recommendation. Common shapes: (1) HANDOVER had a NEW last-bullet appended since draft-time (expected; just append after the new last entry, not the "D4 depth-N" anchor); (2) Phase 5 part-1 SKILL.md edits already landed (expected; the callout still goes immediately before `### Phase F5` header); (3) audit-doc pointer needs updating to a newer cross-project audit doc.

- NEEDS_CONTEXT: pre-flight CRITICAL finding OR mid-execution blocker requires operator triage. Common shapes: (1) PLAYBOOK has been restructured and the `---`/`## Cross-references` boundary doesn't exist in the expected form; (2) SKILL.md Phase F5 header has been renamed; (3) memory file `feedback_retrofit_later_discipline.md` doesn't exist (broken cross-link).
  Report: the finding + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an unanticipatable exception.
  Report: the failure + what was attempted + what's still in flight.

Do NOT proceed to Phase 7. Do NOT modify decisions.md or other scaffold artifacts (this phase is doc-only; review-findings.md F-entry additions are not expected since no catch-up audit runs).
