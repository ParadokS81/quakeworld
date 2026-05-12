# Handoff prompt template -- qwiki-v1-beta arc

This file is the GENERIC template that per-phase prompts (`phase-N-drafter-prompt.md` and `phase-N-executor-prompt.md`) are generated from. The arc-planner (or arc-orchestrator) substitutes per-phase specifics into this template to produce file-as-prompt content.

**Operator does NOT use this file directly.** Per-phase prompts are the operator-facing artifacts. Operator opens a fresh terminal and types `@docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-N-drafter-prompt.md` -- that attaches the file as the first message; the model treats the content as the user's instruction directly.

---

## File-as-prompt shape (mandatory for this arc)

Per-phase prompt files contain the literal content the model consumes. No wrapper text, no "open fresh terminal..." instructions, no BEGIN/END markers, no afterword. Operator types `@<filepath>` in a fresh Claude Code terminal to attach the file as the first message.

Sections every per-phase prompt includes:

1. **Strong arc identification at top** (mandatory): name the arc's date suffix explicitly (`2026-05-12-qwiki-v1-beta`) and list tell-tale signs of being in a sibling arc (decisions.md F-numbers / decision numbers from neighboring arcs; row counts; handler names) so a misdirected drafter self-detects and halts.
2. **Working directory and git state** -- where the work happens, what branch, no PR menus.
3. **Where things are** -- absolute paths to scaffold artifacts + relevant precedent (qw-oracle Arc 1 phase MDs as exemplars; brand-curator pattern at `apps/qw-oracle/scripts/curate-brands/`; harvest workflow at `apps/qw-oracle/curated/concept-notes/CLAUDE.md`).
4. **Required reads** (numbered) -- decisions.md / review-findings.md / phase-template.md / prior approved phase MDs / spec sections relevant to this phase.
5. **Pre-flight** (if applicable for executor prompts; drafter prompts skip) -- live-state checks before reading the plan.
6. **Drafting rules** (drafter) or **Critical rules** (executor) -- ASCII discipline + arc-specific decisions to respect + operator-memory rules (no subagents for mechanical edits, model+effort selection, etc.).
7. **Step-by-step** -- imperative, numbered. Drafter: read -> draft -> sub-agent verify -> apply findings -> halt. Executor: per-task work, in order, with phase-boundary verification at end.
8. **Sub-agent verification brief** (drafter) -- inline the verification brief from `phase-template.md` with absolute paths substituted.
9. **Halt-and-handback shape** -- structured summary the drafter/executor reports back: artifact paths, sub-agent finding counts, open questions, recommendation.

---

## Drafter prompt template (for phase MD drafting)

Each per-phase drafter prompt at `phase-N-drafter-prompt.md` includes:

### Arc identification

```
You are drafting Phase <N> of the qwiki-v1-beta arc (2026-05-12).

Tell-tale signs of being in a sibling arc (halt if you see them in your task scope):
- decisions.md references D1-D17 only (qw-oracle Arc 1; this arc has D1-D26).
- Phase MDs at docs/superpowers/plans/2026-05-02-qw-oracle-arc1/.
- Decision references to "JSONB always-on rule", "voyage-4-large", "voyage-4-lite", "RRF retrieval", "Layer 2 hygiene".
- Postgres / pgvector / tsvector terminology.

If you see any of those in your task scope, you are in the wrong arc -- halt and report.
```

### Working directory + git

```
Working directory: /home/paradoks/projects/quakeworld
Branch: main (no worktree). NO PR / branch ceremony; commit + push to main directly at phase boundary.
The operator does not touch git -- you run all git operations silently.
```

### Where things are

```
- Arc scaffold: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/
  - decisions.md (D1-D26 + non-goals)
  - review-findings.md (F-ledger; populates during drafting)
  - prerequisites.md (operator Task 0)
  - phase-template.md (mandatory phase MD shape)
  - README.md (phase index)
- Vision spec: docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md (Passes 1-6 LOCKED)
- Visual companion: docs/superpowers/specs/2026-05-11-qwiki-nav-and-page-structure-sketch.html (v3 2026-05-12)
- Brand-curator precedent (for Modes phases): apps/qw-oracle/scripts/curate-brands/
- Layer 3 harvest workflow: apps/qw-oracle/curated/concept-notes/CLAUDE.md
- qw-oracle Arc 1 exemplar (six-artifact arc shape): docs/superpowers/plans/2026-05-02-qw-oracle-arc1/
- Old wiki dump (for analyze step): container qwiki-analysis (local mariadb); image tarball at apps/qwiki-sandbox/dumps/wiki-images.tar.gz
- Unraid backup precedent: /home/paradoks/projects/unRAID/docs/server/backup.md
```

### Required reads

```
Read in this order:
1. docs/superpowers/plans/2026-05-12-qwiki-v1-beta/README.md
2. docs/superpowers/plans/2026-05-12-qwiki-v1-beta/decisions.md (full)
3. docs/superpowers/plans/2026-05-12-qwiki-v1-beta/review-findings.md
4. docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-template.md
5. Prior approved phase MDs (Phase 1 through Phase N-1) -- walk "Outputs to next phase" sections
6. Relevant vision spec sections (Pass <N> in docs/superpowers/specs/2026-05-09-qwiki-fresh-build-vision.md if the phase touches that pass's locked principles)
7. Live source recon for this phase (apps/qwiki-sandbox/CLAUDE.md; existing docker-compose files in apps/qw-oracle/ for precedent; etc.)
```

### Drafting rules

```
- ASCII only. No emoji. ASCII hyphen-minus, not em-dash or en-dash. (D21)
- Phase MD goes at: docs/superpowers/plans/2026-05-12-qwiki-v1-beta/phase-<N>-<slug>.md
- Follow phase-template.md exactly: section order, section names, verification format.
- Every task declares Execution mode (subagent at named model+effort, or inline) with rationale. (D26)
- Default: subagent (Sonnet medium) for code synthesis; inline only for purely textual edits.
- Verification probes return YES/NO, not interpretive prose. (D24)
- Phase MD has NO hard length cap. Length follows from work. Default to NOT splitting if unsure; surface to operator.
- Locked decisions (decisions.md D1-D26) are NOT open for re-litigation. If you need to deviate, add a "Deviation" section at top of the phase MD and halt for operator review.
- Open questions go in the phase MD's Open Questions section with default-chosen + who-can-resolve. Do NOT escalate mid-draft. (D25)
```

### Step-by-step

```
Step 1: Read all required files (above). Take notes on the decisions and findings that touch Phase <N>.

Step 2: Live recon on files this phase touches. Examples by phase shape:
  - Substrate phase: list apps/qwiki-sandbox/ contents; check if docker-compose.yml exists; check Unraid SSH (operator may run from local).
  - Auth phase: check PluggableAuth + Discord OAuth extension docs (use Context7 for MW extension API); review Pass 5 5.1 + 5.2 + 5.4a + decisions.md D4 + D5 + D19.
  - Modes-form phase: review Pass 4 4.3 Modes page-type bones+slots + Pass 5 5.2 gate-level + visual companion HTML v3 Modes Layer B + Layer C mockup.
  - Modes-curator phase: read apps/qw-oracle/scripts/curate-brands/ end-to-end; note pattern (three-column, JSON sidecar, pauseable).

Step 3: Draft the phase MD following phase-template.md.

Step 4: Dispatch the verification sub-agent (brief below).

Step 5: Apply the sub-agent's findings. If a finding contradicts decisions.md, note the rejection in Open Questions with a one-line rationale. If cross-phase, append to review-findings.md.

Step 6: Halt with a structured summary:
  - Path to drafted phase MD.
  - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
  - Any open questions needing operator attention.
  - Recommendation: "ready for review" or "needs another pass."

Do NOT proceed to phase N+1. Do NOT execute anything. Drafting is paper-only.
```

### Sub-agent verification brief

Inline the brief from `phase-template.md` "Verification sub-agent dispatch" section with absolute paths substituted for this phase. The brief is verbatim from the template; only the file paths change.

### Halt protocol

```
HALT TEMPLATE:

PHASE <N> DRAFT COMPLETE -- HALTING FOR OPERATOR REVIEW

Artifact: <absolute path to phase-N-*.md>
Lines: <approximate line count>

Sub-agent findings:
  CRITICAL: <count> -- <one-line summary of each, or "(none)">
  SUBSTANTIVE: <count> -- <one-line summary of each, or "(none)">
  ADVISORY: <count> -- <one-line summary of each, or "(none)">

Open questions: <count> -- <one-line summary of each, or "(none)">

Cross-phase notes appended to review-findings.md: <count>

Recommendation: ready for review | needs another pass

(If "needs another pass", explain why in 1-2 sentences.)
```

---

## Executor prompt template (for phase MD execution)

A separate `phase-N-executor-prompt.md` is generated when the phase ships work (not just drafts). It uses the same file-as-prompt shape and includes:

- Arc identification (same as drafter)
- Working directory + git
- Pre-flight (live-state checks: container up, clean tree, prior phase verification probes still pass)
- Where things are (same scaffold paths + plan to execute)
- Critical rules (same ASCII / execution-mode discipline; plus "per-task execution mode per the plan's declaration")
- Execution shape (per-task work in order)
- Halt protocol (structured summary: tasks complete, verification pass/fail, sub-agent finding counts, open questions, recommendation)

The executor takes the drafted phase MD and ships it. Each task's declared execution mode (subagent / inline) drives how the executor delegates: inline tasks use direct Edit/Write/Bash; subagent tasks dispatch via `Agent` tool with the declared model+effort.

---

## Notes for arc-planner / arc-orchestrator generating per-phase prompts

- Strong arc identification at top is MANDATORY. Sibling arcs (qw-oracle Arc 1, extractor-discipline-catchup, etc.) have similar phase numbers and filenames; a misdirected drafter without arc identification will silently clobber files in the wrong arc.
- Each per-phase prompt names the FULL paths to scaffold artifacts. Drafters land cold; they can't infer paths.
- Drafter prompts are paper-only (no execution); executor prompts ship code. Keep them separate files.
- When a phase has no execution work (pure plan / pure docs), only the drafter prompt is needed.
- When prior-phase learnings change context for this phase (mid-arc decisions amendment, sub-agent surfaced a cross-phase issue), append a "Context update" section at the top of the per-phase prompt with date + summary. arc-orchestrator handles this during cross-phase coordination.

---

*This template is the GENERIC shape. Per-phase prompts are specific instances. If the GENERIC shape needs to change (e.g., new mandatory section), update this file and regenerate affected per-phase prompts.*
