You are executing Phase 7 of the extractor discipline catch-up arc. This is the FINAL phase -- arc-close cert doc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs share file paths (`apps/qw-oracle/docs/arc-history.md`, `docs/superpowers/reviews/`), and the KTX onboarding arc's review doc at `docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md` is intentionally referenced as a SHAPE EXEMPLAR -- you do NOT modify it. If you see references to "Pattern 6 cross-header lift", "F1-F30 KTX onboarding finding numbers", "modes-handler refactor", "taxonomies handler", "match_event entity types", "Phase 5.5 retrofit", or any KTX onboarding implementation work, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 7 SCOPE: Paper-only -- no code, no probes, no DB. Two doc edits in two files: (1) Write the cert doc at `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` (verbatim from the phase MD's "Inlined: cert doc" section, substituting P5/P6 placeholder blocks with actual SHAs + deliverable summaries since P5 + P6 are required to be SHIPPED before this phase fires); (2) Prepend the arc-history entry to `apps/qw-oracle/docs/arc-history.md` between the `---` separator and the existing `## 2026-05-05 -- KTX Layer 1 Onboarding` header. Single commit per D13. Runnable state at phase end: cert doc exists at the named path; arc-history carries the extractor-discipline-catchup entry above the KTX entry; commit pushed to origin/main; arc is closed.

PLANNER-LOCKED OPEN-QUESTION DEFAULTS (per planner approval 2026-05-08):
- **Execution order P5 -> P6 -> P7.** P7 runs ONLY after P5 + P6 are SHIPPED (commits in git log). Pre-flight gate verifies. If P5 or P6 are missing, halt with NEEDS_CONTEXT.
- **Migration table format: all 12 individual rows.** Do NOT collapse 001-008 into a "structural assertions" group; the graduation artifact should be specific.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO write the cert doc, modify arc-history, and commit + push. The phase MD is the source of truth for what to write.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-7-cert-doc.md
   The phase MD itself. Source of truth for the inlined cert doc content + arc-history entry + V1-V7 verification.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. Phase 7 respects D6 (per-gate ship + cross-project audit -- cert doc consolidates pass state for all 5 projects), D8 (per-finding triage -- cert doc records F1's HANDOVER track + per-handler explicit-rejects for P1 first-run state-fill / P2 FTE asset-bundle / P3 deferred-safe handlers), D13 (phase atomicity -- single commit), D14 (operator review at boundary), D15 (all 3 tasks inline -- doc-only phase), D16 (ASCII discipline -- V6 byte-scan), D17 (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   F1 (pytest sys.path pollution; HANDOVER track) is the only F-entry. Cert doc records it in the findings ledger; not resolved here.

4. docs/superpowers/parking/2026-05-08-extractor-discipline-catchup.md
   Pass 2.1 (per-gate ship discipline + arc-close cert doc shape). Confirms cert doc path + one-section-per-gate shape + graduation-readiness statement covering visible / runnable / self-bootstrapping.

5. docs/superpowers/reviews/2026-05-07-ktx-onboarding-arc-review.md
   SHAPE EXEMPLAR ONLY -- do NOT modify. The KTX onboarding arc review is the closest precedent for cert-doc shape; cross-reference the section ordering / table layout if uncertain.

6. apps/qw-oracle/docs/arc-history.md
   Insertion target for Task 2. The extractor-discipline-catchup entry prepends between the `---` separator at line 7 and `## 2026-05-05 -- KTX Layer 1 Onboarding -- ARC SHIPPED (Phases 0-8 complete)` at line 9. Confirm those line anchors are stable at execution time.

7. Per-phase commit bodies (run at execution time):
     git -C /home/paradoks/projects/quakeworld show --no-patch --format="%h %s%n%b" f64ef308 2e7808eb 8f561cba 9901f308 <P5 SHA> <P6 SHA>
   Cross-check the cert doc's per-gate pass-state tables against each commit body. The drafter already verified P1-P4 against their commit bodies; you re-verify at execution time and additionally pull P5 + P6 disposition from their commits.

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against decisions.md and the live state. The drafter sub-agent verified at draft time, but you (the executor) are running cold against live state -- and crucially, P5 + P6 must be shipped before P7 fires per planner-locked default.

a. P5 SHIP-STATE (BLOCKING):
     git -C /home/paradoks/projects/quakeworld log --oneline | grep -E "^[0-9a-f]+ extractor-discipline-catchup phase 5"
   Expected: one commit found. If 0 commits match, P5 has NOT shipped -- HALT with NEEDS_CONTEXT (operator runs P5 executor first). Capture the SHA for cert doc placeholder substitution.

b. P6 SHIP-STATE (BLOCKING):
     git -C /home/paradoks/projects/quakeworld log --oneline | grep -E "^[0-9a-f]+ extractor-discipline-catchup phase 6"
   Expected: one commit found. If 0 commits match, P6 has NOT shipped -- HALT with NEEDS_CONTEXT. Capture the SHA for cert doc placeholder substitution.

c. P1-P4 SHA stability:
     git -C /home/paradoks/projects/quakeworld log --oneline | grep -E "extractor-discipline-catchup phase [1-4]"
   Expected: 4 commits found, with SHAs starting f64ef30 / 2e7808e / 8f561cb / 9901f30. If any of those 4 SHAs differ (history rewritten), HALT and re-cross-check the cert doc's per-gate tables against the new commit bodies.

d. Cert doc parent directory:
     ls -d docs/superpowers/reviews/
   Expected: directory exists. If not, mkdir -p first.

e. Arc-history insertion anchors:
     head -10 apps/qw-oracle/docs/arc-history.md
   Expected: line 1 `# QW Oracle -- Arc history`, line 7 `---`, line 9 `## 2026-05-05 -- KTX Layer 1 Onboarding -- ARC SHIPPED (Phases 0-8 complete)`. Anchor on the `---` separator + the next `## ` header for the prepend; if line numbers have shifted, adjust the Edit anchor accordingly.

f. Cert doc target path is unused:
     ls docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md 2>&1
   Expected: "No such file or directory" (Phase 7 creates it fresh). If the file already exists, halt and surface -- this is unexpected.

g. Migration filename verification (cert doc lists 12; verify all 12 exist):
     ls apps/qw-oracle/db/migrations/ | sort
   Expected: 001_init.sql through 012_description_origin.sql (exactly 12 files). If file count differs, halt -- the cert doc P4 table is calibrated to 12.

If any pre-flight check fails CRITICALLY, halt with status NEEDS_CONTEXT before executing any task.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-3 per the phase MD. All three are `inline` execution mode (D15: doc-only with full content shipped).

Task 1 -- Write the cert doc:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Use the Write tool to create `docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md` with content from the phase MD's "Inlined: cert doc" section, lines 158-447 (between the markdown code-fence open and close). Copy verbatim except for two substitutions:
       a. Replace `[P5 placeholder -- TBD]` block (around line 335) with the P5 actual content shape:
          - `**Commit:** <P5 SHA>`
          - `**Phase MD:** docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md`
          - `**Deliverable:** apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md (7 sections per Pass 1.2.6); one-line cross-link from VALIDATION-RUNBOOK.md top; SKILL.md update part 1 (register-in-config-dict step + validation-step expansion to 4-5 probes).`
          - `**Verification:** V1-VN PASS.` (substitute the actual V-count from P5's verification probes; pull from `git show <P5 SHA>` body text).
       b. Replace `[P6 placeholder -- TBD]` block (around line 351) similarly with the P6 actual content shape:
          - `**Commit:** <P6 SHA>`
          - `**Phase MD:** docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-audit-cadence.md`
          - `**Deliverable:** EXTRACTOR-PLAYBOOK.md new audit-cadence section (trigger set: new project / new entity type / schema migration / extractor_lib or load-version.ts modification); HANDOVER.md tracking entry; SKILL.md update part 2 (no-per-project-bash callout; cross-link to feedback_retrofit_later_discipline.md).`
          - `**Verification:** V1-VN PASS.`
       c. Update the "Sources read" list near top of cert doc -- replace `<P5 SHA>` and `<P6 SHA>` placeholders with actual SHAs.
       d. Substitute `[fill at Phase 7 execution time]` in the "Cert date" line with today's date in YYYY-MM-DD form.
    2. ALSO update the "Pending P5 + P6" prose paragraph in the Graduation-readiness section (around line 437-441 in the phase MD's inlined cert doc) to reflect that P5 + P6 ARE shipped: change "Pending P5 + P6: runtime gates (P1-P4) are fully runnable and certified cross-project. Full visibility and self-bootstrapping require P5 + P6 to ship. The discipline is partially visible..." to "All P5 + P6 deliverables shipped. The discipline is fully visible (VALIDATION-GATES.md producer-perspective + VALIDATION-RUNBOOK.md consumer-perspective + EXTRACTOR-PLAYBOOK.md audit-cadence rule + onboard-extractor SKILL.md updates), fully runnable (4 universal gates dispatch via standard CLI), and fully self-bootstrapping (future onboardings inherit by default)."
    3. Also update the "CERTIFIED -- discipline is visible and runnable... Full self-bootstrapping pending P5 + P6 ship" verdict line (around line 175) to "CERTIFIED -- discipline is visible, runnable, and self-bootstrapping across all 5 extractor projects."
    4. ASCII discipline: NO em-dashes, en-dashes, smart quotes, emoji. The V6 byte-scan checks for any byte > 127. Use ASCII `--` only.

Task 2 -- Prepend arc-history entry:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Read `apps/qw-oracle/docs/arc-history.md` to confirm the `---` separator + `## 2026-05-05 -- KTX Layer 1 Onboarding -- ARC SHIPPED` anchor positions.
    2. Use the Edit tool to anchor on the `---` separator line + the following `## 2026-05-05 -- KTX Layer 1 Onboarding -- ARC SHIPPED (Phases 0-8 complete)` header. Insert the extractor-discipline-catchup entry between them.
    3. Full entry content is in the phase MD's "Inlined: arc-history entry" section, lines 459-490. Copy verbatim except: substitute `[status at arc close]` placeholders in P5 + P6 phase bullets with `DONE (<SHA>)` shape matching the existing pattern. Substitute the P7 entry's "DONE" line at end with `DONE (<P7-self-SHA placeholder>)` -- NOTE: this is a chicken-and-egg case; the P7 SHA isn't known until commit time. Two options:
       a. Leave `DONE.` (no SHA) as in the inlined template -- the P7 entry is the last bullet in its own arc entry; the SHA is recoverable via git log filter.
       b. Post-commit, amend the arc-history.md entry with the P7 SHA in a follow-on commit. NOT recommended (breaks D13 single-commit phase atomicity).
       Default: option (a) -- ship without P7's own SHA inline. The arc entry header already documents "Phases 1-7 complete"; the SHA is locatable by `git log --grep "phase 7: arc-close cert doc"`.
    4. ASCII discipline same as Task 1.

Task 3 -- Commit the phase as one logical unit:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Stage:
         git -C /home/paradoks/projects/quakeworld add docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md
         git -C /home/paradoks/projects/quakeworld add apps/qw-oracle/docs/arc-history.md
    2. Commit using HEREDOC with the message from the phase MD's "Commit body" section (around line 642-662), substituted with actual P5 + P6 SHAs in the per-gate pass state block.
    3. Push: git -C /home/paradoks/projects/quakeworld push origin main
    4. Verify clean tree: git -C /home/paradoks/projects/quakeworld status

VERIFICATION (phase boundary):

Run V1-V7 from the phase MD's Verification section in order. Each ends PASS or FAIL.

V1: Cert doc exists (`test -f docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md`).
V2: Cert doc has all four runtime gate sections (`grep -E "^## P[1-4]"` returns 4 lines).
V3: Cert doc PASS count >= 10 (sum of per-project audit rows + migration probe rows + graduation-readiness section).
V4: F1 HANDOVER documented in findings ledger.
V5: Arc-history ordering correct (extractor-discipline-catchup entry line < KTX Layer 1 entry line).
V6: ASCII discipline (no bytes > 127 in cert doc -- the python3 byte-scan from the phase MD).
V7: Commit clean and pushed (single commit; clean tree; remote matches local HEAD).

If any V fails AND the phase MD's Recovery section doesn't cover, halt with status BLOCKED.

COMMIT + PUSH:

Stage:
  - docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md (added)
  - apps/qw-oracle/docs/arc-history.md (modified)

Commit subject (one line, ASCII, <= 72 chars where possible):
  extractor-discipline-catchup phase 7: arc-close cert doc

Commit body shape (HEREDOC; fill in actual P5 + P6 SHAs from pre-flight):
  Arc-close graduation-readiness cert doc at
  docs/superpowers/reviews/2026-05-08-extractor-discipline-catchup-arc-review.md.
  Prepends extractor-discipline-catchup arc entry to
  apps/qw-oracle/docs/arc-history.md.

  Per-gate pass state (P1-P6 consolidated from commit bodies):
    P1 idempotency:       all 5 projects PASS steady state (f64ef308)
    P2 reproducibility:   all 5 projects PASS (2e7808eb)
    P3 parallel-serial:   ezquake/fte/qwcl deferred-safe; mvdsv NEW PASS;
                          ktx UPDATED PASS; F1 HANDOVER (8f561cba)
    P4 migration-probes:  12/12 global PASS (9901f308)
    P5 authoring guide:   VALIDATION-GATES.md (7 sections) + RUNBOOK
                          cross-link + SKILL.md part 1 (<P5 SHA>)
    P6 audit cadence:     PLAYBOOK section + HANDOVER tracker + SKILL.md
                          part 2 (<P6 SHA>)

  Total findings: F1 HANDOVER (pytest sys.path pollution; per-handler tests
  PASS in isolation). No drain-now bugs across P1-P6.

  Graduation-readiness: 4 runtime gates runnable and certified cross-project;
  producer-side authoring guide + cross-project audit cadence rule shipped;
  onboard-extractor SKILL.md teaches the universal gate set as default.
  Discipline is visible, runnable, and self-bootstrapping. Arc closed.

  Verification (phase boundary): V1-V7 PASS.

Push to origin per D17 (`git push origin main`).

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: V1-V7 all PASS; cert doc landed at named path; arc-history entry prepended; single commit pushed; clean tree. THIS IS ARC CLOSE.
  Report: commit SHA, V-status summary, confirmation that cert doc + arc-history both updated. Recommend next steps: (1) operator runs arc-reviewer skill in a fresh terminal per arc-reviewer skill structural requirement (a terminal that ran any phase has anchored expectations and cannot deliver an honest spec-vs-shipped read); (2) operator updates `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/README.md` "Where we are right now" block to reflect Phase 7 SHIPPED + arc complete (or planner does this in a small ship-housekeeping commit per the P3/P4 precedent).

- DONE_WITH_CONCERNS: V1-V7 PASS but execution surfaced something unexpected.
  Report: same as DONE plus the concern + recommendation. Common shapes: (1) P5 or P6 commit body had a different V-count than the placeholder block expected; (2) arc-history insertion landed but visual diff suggests a stale anchor; (3) ASCII byte found in P5 or P6 commit-body content that was copied into cert doc.

- NEEDS_CONTEXT: pre-flight CRITICAL finding OR mid-execution blocker requires operator triage. Most common: P5 or P6 has not shipped (pre-flight gates a + b BLOCK). Less common: KTX onboarding arc-history entry has been restructured / arc-history.md schema changed.
  Report: the finding + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an unanticipatable exception.
  Report: the failure + what was attempted + what's still in flight.

Phase 7 is the FINAL phase. Do NOT proceed further. The arc-reviewer pass runs in a separate fresh terminal per arc-reviewer skill structural requirement; operator initiates.
