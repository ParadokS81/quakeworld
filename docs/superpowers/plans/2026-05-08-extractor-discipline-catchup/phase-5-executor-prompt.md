You are executing Phase 5 of the extractor discipline catch-up arc.

CRITICAL ARC IDENTIFICATION: This is the **2026-05-08 extractor-discipline-catchup** arc, NOT the **2026-05-04 KTX onboarding** arc. The two arcs touch related files (the onboard-extractor SKILL.md is shared; both arcs reference EXTRACTOR-PLAYBOOK.md and VALIDATION-RUNBOOK.md). Phase 5 ships THREE doc edits: (1) Create a new producer-side authoring guide at `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` with 7 locked sections (Pass 1.2.6); (2) Insert a one-line cross-link from `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` to the new doc; (3) Update `~/.claude/skills/onboard-extractor/SKILL.md` with three changes -- insert a new Phase F4.5 section between F4 and F5, replace the existing Phase F5 content with an expanded 4-gate validation, update the Mode P "Phase P3 onward" line. If you see references to "Pattern 6 cross-header lift", "F1-F30 KTX onboarding finding numbers", "modes-handler refactor", "taxonomies handler", "match_event entity types", or any KTX onboarding implementation work, you are in the WRONG arc -- halt immediately and surface to operator. The right reads start with `docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/`.

PHASE 5 SCOPE: Paper-only -- no code, no probes, no DB. The phase ships full file content for VALIDATION-GATES.md inline in the phase MD; the RUNBOOK cross-link is a one-line edit; the SKILL.md edits are three discrete edits with full BEFORE/AFTER content shipped inline. Runnable state at phase end: VALIDATION-GATES.md exists with 7 top-level section headers; cross-link present in RUNBOOK; SKILL.md shows new Phase F4.5 + expanded Phase F5 + updated Mode P3 line under grep.

Working directory: /home/paradoks/projects/quakeworld

You ARE executing this phase. You DO write the files, run verification probes, and commit + push. The phase MD is the source of truth for what to do.

REQUIRED READING (read all before executing; do not skip):

1. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-5-authoring-guide.md
   The phase MD itself. Source of truth for the three task contents (full VALIDATION-GATES.md content shipped verbatim, RUNBOOK BEFORE/AFTER block, SKILL.md three CHANGE blocks with BEFORE/AFTER) and verification probes V1-V6.

2. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/decisions.md
   17 locked cross-cutting decisions. Phase 5 respects D2 (CI-readiness conventions documented in Section 1 + Section 7), D3 (per-project config dict per gate, NOT unified -- documented in Section 5), D4 (F1 quality-grid dispatch mirror -- documented in Section 2 with the rename-syntax fix `{ <exportName>: run }` and grep-verify step), D9 (sibling doc not extension -- VALIDATION-GATES.md is producer-perspective, RUNBOOK gets cross-link), D10 (skill update split: Phase 5 lands part 1 -- F4.5 register-in-config-dict step + F5 expansion), D12 (JSONB binding -- documented in Section 3), D13 (phase atomicity -- one commit), D14 (operator review at boundary), D15 (all 3 tasks inline -- doc-only phase), D16 (ASCII discipline; new content uses `--`, not em-dash), D17 (main tree, no PR ceremony, push at phase boundary).

3. docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/review-findings.md
   F1 (pytest sys.path pollution) is HANDOVER-tracked, not resolved by P5. Phase 5 adds no F-entries (doc-only; no catch-up audit run, no gate-surfaced bugs).

4. apps/qw-oracle/scripts/load-knowledge/idempotency.ts
   Live source the doc references. Section 4's volatile-column strip pattern (5 columns) and Section 5's `PROJECT_IDEMPOTENCY_CONFIG` shape mirror this file. Confirm at execution time the strip-list matches lines 152-157 (`updated_at` / `extracted_at` / `description_embedding` / `description_embedding_sha256` / `description_embedding_stale`).

5. apps/qw-oracle/scripts/load-knowledge/index.ts
   Live source for Section 2's dispatcher pattern. Confirm at execution time the three thin-wrapper functions exist: `runIdempotencyCli` (line ~36), `runReproducibilityCheckCli` (line ~37), `runMigrationProbesCli` (line ~45). The wrapper function names + the actual gate-file export names may differ -- e.g. `runReproducibilityCheckCli` imports `{ runReproducibilityCli: run }`. Section 2's docs explicitly call this out with the rename syntax + grep-verify instruction.

6. apps/qw-oracle/scripts/extractors/extractor_lib/tests/parallel_serial_helpers.py
   Live source for Section 6's pytest test pattern. Confirm at execution time `assert_parallel_serial_equivalent` is the exported function name (line ~65) and the import shape `from extractor_lib.tests import assert_parallel_serial_equivalent` is the canonical import.

7. ~/.claude/skills/onboard-extractor/SKILL.md
   Insertion target for Task 3. THIS IS A USER-GLOBAL FILE, NOT IN THE PROJECT REPO. Use the absolute path `/home/paradoks/.claude/skills/onboard-extractor/SKILL.md`. The phase MD's Task 3 ships full BEFORE/AFTER blocks for three discrete changes -- insert F4.5 between F4 and F5 (anchor: `### Phase F5: Validation handoff` header), replace F5 content (anchor: full F5 section as it exists at draft time, lines 208-227 of SKILL.md), update Mode P "Phase P3 onward" line (anchor: full single-sentence description at line 299).

PRE-FLIGHT CRITICAL REVIEW (per arc-executor skill):

Before executing any task, critically review the phase MD's plan against decisions.md and the live files. The drafter sub-agent verification ran at draft time (1 CRITICAL applied, 0 SUBSTANTIVE, 1 ADVISORY operator-routed), but you (the executor) are running cold against live state. Spot-check:

a. VALIDATION-GATES.md target path is unused:
     ls apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md 2>&1
   Expected: "No such file or directory" (Phase 5 creates fresh). If the file already exists, halt and surface -- this is unexpected.

b. VALIDATION-RUNBOOK.md insertion point still valid:
     head -8 apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   Expected: line 1 `# QW Oracle Extractor Validation Runbook`, line 3 intro paragraph, line 5 `**Scope:** ...`. If the structure has shifted, halt and surface.

c. SKILL.md path + frontmatter:
     head -3 /home/paradoks/.claude/skills/onboard-extractor/SKILL.md
   Expected: starts with `---\nname: onboard-extractor\n...`. If file missing or wrong content, halt with NEEDS_CONTEXT.

d. SKILL.md F5 BEFORE-text matches the phase MD's Task 3 Change 2 BEFORE block:
     sed -n '208,227p' /home/paradoks/.claude/skills/onboard-extractor/SKILL.md
   Expected: matches the phase MD's Task 3 Change 2 BEFORE block byte-for-byte. If different (e.g. Phase 6 already shipped first and inserted a callout that overlaps), halt -- adjust the Edit anchor before proceeding. NOTE: Phase 6 inserts an "Anti-pattern -- no per-project bash scripts" callout immediately BEFORE the F5 header; that does NOT change the F5 section content itself, so the Change 2 BEFORE/AFTER should still apply cleanly. The callout will end up between the new F4.5 (this phase) and F5 sections after both edits land.

e. SKILL.md Mode P "Phase P3 onward" BEFORE-text matches:
     grep -A 2 "^### Phase P3 onward$" /home/paradoks/.claude/skills/onboard-extractor/SKILL.md
   Expected: line `Phases P3 (load-knowledge wiring), P4 (quality-grid probes), P5 (validation handoff), P6 (documentation), P7 (commit) are identical to Mode F's F3-F7.` matches the Task 3 Change 3 BEFORE block. If shifted, halt.

f. Live source mirrors Section claims (smoke check):
     grep -n "updated_at.*extracted_at.*description_embedding" apps/qw-oracle/scripts/load-knowledge/idempotency.ts | head -3
   Expected: 3 matches (one per stripFragment alias t/v/g, lines ~152/155/157). If 0 matches, the strip pattern has changed -- Section 4's content is stale; halt.

     grep -n "^export async function" apps/qw-oracle/scripts/load-knowledge/idempotency.ts apps/qw-oracle/scripts/load-knowledge/reproducibility-check.ts apps/qw-oracle/scripts/load-knowledge/migration-probes.ts
   Expected: at least 3 matches (one per gate's CLI entry point). Note: the reproducibility gate exports `runReproducibilityCli` (not `runReproducibilityCheckCli`); the wrapper in index.ts uses the rename syntax. Section 2 documents this; confirm both names are present.

g. Phase 6 collision check (informational; not blocking):
     ls docs/superpowers/plans/2026-05-08-extractor-discipline-catchup/phase-6-executor-prompt.md 2>/dev/null && echo "P6 prompt ready"
     git -C /home/paradoks/projects/quakeworld log --oneline | grep -E "^[0-9a-f]+ extractor-discipline-catchup phase 6" && echo "P6 SHIPPED"
   P5 + P6 are parallel-safe per Pass 2.3 + decisions.md. If P6 has shipped first, the Phase 6 callout already lives between Phase F4 and Phase F5; this phase's Phase F4.5 insertion goes BEFORE the existing F5 header (i.e. the P6 callout block sits between F4.5 and F5 after both edits land). No collision; just verify the SKILL.md F5 BEFORE-text matches your Change 2 BEFORE block.

If any pre-flight check fails CRITICALLY, halt with status NEEDS_CONTEXT before executing any task.

If pre-flight is clean, proceed to execution.

EXECUTE THE PHASE:

Tasks 1-3 per the phase MD. All three are `inline` execution mode (D15: doc-only with full content shipped).

Task 1 -- Write VALIDATION-GATES.md:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Use the Write tool to create `apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md`. Content is shipped verbatim in the phase MD between the lines `VALIDATION-GATES.md FULL CONTENT -- write this file verbatim:` and `END OF VALIDATION-GATES.md CONTENT`.
    2. The content has 7 top-level `## ` section headers: `## 1. CLI shape conventions`, `## 2. Reuse the F1 quality-grid dispatch pattern`, `## 3. Env-var driven DB config`, `## 4. Volatile-column strip pattern`, `## 5. Per-project config dict shape`, `## 6. Test pattern conventions (parallel-vs-serial)`, `## 7. CI-readiness checklist`.
    3. ASCII discipline: NO em-dashes, en-dashes, smart quotes, emoji. Phase MD content is ASCII-clean per planner verification; preserve verbatim.

Task 2 -- Add cross-link to VALIDATION-RUNBOOK.md:
  Execution mode: inline.
  Direct ops in this terminal:
    1. Use the Edit tool on `apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md`. Anchor on the blank line + `**Scope:**` prefix as shown in the phase MD's Task 2 BEFORE/AFTER blocks.
    2. The single inserted line is: `For gate authoring, see `scripts/load-knowledge/VALIDATION-GATES.md`.` followed by a blank line.
    3. Verify after edit with V3.

Task 3 -- Update SKILL.md (3 discrete changes):
  Execution mode: inline.
  Direct ops in this terminal:
    1. Read `/home/paradoks/.claude/skills/onboard-extractor/SKILL.md` using the Read tool with the absolute path. Confirm the file starts with frontmatter `---\nname: onboard-extractor\n...`.
    2. CHANGE 1 -- Insert Phase F4.5 section before `### Phase F5: Validation handoff`. Use the Edit tool; old_string anchors on the closing of Phase F4 + the F5 header line; new_string includes the full F4.5 content from the phase MD's CHANGE 1 INSERT CONTENT block + the F5 header line preserved. NOTE: if Phase 6 has already shipped, the F4 closing area now has the "Anti-pattern" callout block; you must include that callout in your old_string anchor + preserve it in new_string. Read the current state first before crafting old_string.
    3. CHANGE 2 -- Replace Phase F5 section content. Anchor on the full Phase F5 BEFORE block from the phase MD (lines starting `### Phase F5: Validation handoff` through the last line `If the fork has a runtime dump...validation-fixtures/' and running the runbook's Section 2.`). Replace with the AFTER block (5-step validation invoking 4 universal gates).
    4. CHANGE 3 -- Update Mode P "Phase P3 onward" line. Anchor on the full single sentence at line ~299; replace with the new sentence including P4.5.
    5. ASCII discipline: same as Task 1.
    6. Verify after each change with V4 + V5.

VERIFICATION (phase boundary):

Run V1-V6 from the phase MD's Verification section in order. Each ends PASS or FAIL.

V1: VALIDATION-GATES.md created (`test -f apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md && echo EXISTS`).
V2: VALIDATION-GATES.md has exactly 7 top-level section headers (`grep -c "^## " apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md` outputs `7`).
V3: VALIDATION-RUNBOOK.md has the cross-link (`grep -n "VALIDATION-GATES" apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md` returns exactly one match).
V4: SKILL.md has Phase F4.5 (`grep -n "F4.5\|config dict" ~/.claude/skills/onboard-extractor/SKILL.md | head -5` returns at least 2 lines).
V5: SKILL.md F5 expansion references universal gates (`grep -n "idempotency\|reproducibility-check\|migration-probes" ~/.claude/skills/onboard-extractor/SKILL.md | grep "bun run" | head -5` returns at least 2 matching lines).
V6: VALIDATION-GATES.md parent directory is correct (smoke check).

Per D6: Phase 5 is doc-only -- no catch-up audit run, no gate-surfaced bugs. No F-entries to append. If V1-V6 all PASS, phase is done.

If any V fails AND the phase MD's Recovery section doesn't cover the failure mode, halt with status BLOCKED.

COMMIT + PUSH:

Stage:
  - apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md (added)
  - apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md (modified)
  - ~/.claude/skills/onboard-extractor/SKILL.md (modified -- USER-GLOBAL file, NOT in repo, NOT staged via git)

NOTE: SKILL.md lives outside the project repo. The git commit covers only the two repo files (VALIDATION-GATES.md + VALIDATION-RUNBOOK.md); the SKILL.md edit is filesystem-only and persists in the user's home dir. Document the SKILL.md edit in the commit body so the change is traceable.

Commit subject (one line, ASCII, <= 72 chars where possible):
  extractor-discipline-catchup phase 5: validation gates authoring guide

Commit body shape (HEREDOC):
  Producer-side authoring guide for new universal gates shipped to
  apps/qw-oracle/scripts/load-knowledge/VALIDATION-GATES.md (7 sections
  per Pass 1.2.6: CLI conventions, F1 dispatch mirror, env-var DB config,
  volatile-column strip, per-project config dict shape, pytest test
  conventions, CI-readiness checklist). One-line cross-link from
  VALIDATION-RUNBOOK.md top per D9 (sibling doc, not extension).

  D10 skill-update split part 1: ~/.claude/skills/onboard-extractor/
  SKILL.md updated with new Phase F4.5 section (register-in-config-dict
  step) + Phase F5 validation-step expansion from one probe to four
  universal gates (reproducibility / idempotency / parallel-serial pytest
  / migration-probes conditional). Mode P "Phase P3 onward" line updated
  to include P4.5. Part 2 (no-per-project-bash callout) shipped in
  Phase 6 commit a0ee09f7.

  Section 2 dispatcher template documents the rename syntax
  ({ actualExportName: run }) and grep-verify step for cases where
  the wrapper name in index.ts differs from the gate-file export name
  (CRITICAL fix from sub-agent verification: runReproducibilityCheckCli
  imports { runReproducibilityCli: run }).

  SKILL.md edit is to user-global file and is filesystem-only (not in
  this commit). VALIDATION-GATES.md + VALIDATION-RUNBOOK.md edits are
  repo-tracked and ship in this commit.

  Verification (phase boundary): V1-V6 PASS.

Push to origin per D17 (`git push origin main`).

HALT WITH STRUCTURED STATUS:

Reply to the operator with one of:

- DONE: V1-V6 all PASS; phase MD complete; commit pushed; clean tree.
  Report: commit SHA, V-status summary, confirmation that SKILL.md filesystem edit landed (with grep-verified F4.5 + F5 + Mode P3 line states).

- DONE_WITH_CONCERNS: V1-V6 PASS but execution surfaced something unexpected.
  Report: same as DONE plus the concern + recommendation. Common shapes: (1) Phase 6 already shipped first and the SKILL.md callout had to be preserved during Change 1 insertion; (2) idempotency.ts strip-list shifted between draft time and execution time (Section 4 stale -- planner needs to amend before re-running); (3) reproducibility-check.ts export name shifted (Section 2's rename-syntax example needs updating).

- NEEDS_CONTEXT: pre-flight CRITICAL finding OR mid-execution blocker requires operator triage. Common shapes: (1) VALIDATION-GATES.md target path already exists; (2) SKILL.md F5 BEFORE-text doesn't match (skill restructured); (3) live source's strip-list / dispatcher pattern shifted enough that the doc would ship stale.
  Report: the finding + recommended phase MD amendment OR the triage question.

- BLOCKED: V failed AND Recovery section doesn't cover; OR an unanticipatable exception.
  Report: the failure + what was attempted + what's still in flight.

Do NOT proceed to Phase 7. (Phase 6 is parallel-safe with this phase; Phase 7 has BLOCKING pre-flight gates that verify both P5 + P6 are committed before P7 fires.) Do NOT modify decisions.md or other scaffold artifacts (review-findings.md F-entry additions are not expected since no catch-up audit runs).
