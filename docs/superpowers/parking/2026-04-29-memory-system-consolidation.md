# Memory system consolidation

**Added:** 2026-04-29.
**Status:** Watching — no design pass needed today. Re-evaluate when the trigger below fires.
**Verification first:** `wc -c -l /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/MEMORY.md && ls /home/paradoks/.claude/projects/-home-paradoks-projects-quakeworld/memory/*.md | wc -l` — confirms whether thresholds are still under control. Today's baseline: 13.4KB / 126 lines / 78 files (post manual /dream pass on 2026-04-29).

## Why we're not designing now

The 2026-04-29 brainstorm closed without a design because the felt pain (root-cause: over-eager memory ingest + no proper homes for arc-receipt content, everything piling into HANDOVER + memory) appears already addressed by **upstream doc-system work that landed the same day**:

- Plan 3 of the docs-redesign established `arc-history.md` per project as the canonical destination for shipped retrospectives — closes the arc-receipt-into-memory leak at the source.
- The new HANDOVER docket shape adds 5-category routing (drained inline / small followup / sidequest / ongoing arc / future arc / shipped retrospective) — closes the "everything goes to HANDOVER in one pile" leak.
- The new docs-check Phase 1 Step 5 flags MEMORY.md size drift and recommends scheduling consolidation; Phase 2 Step 4 runs forward-going memory updates per session.
- A manual /dream pass had already happened earlier 2026-04-29, slimming MEMORY.md from 25.3KB → 12.3KB and deleting 7 arc-receipt files.

If the new structure works, the next consolidation pass will be small or unnecessary. Designing a heavier mechanism today would be premature — wait for evidence.

## Re-evaluation trigger

Reopen this entry (and queue an actual brainstorm) when **any** of these fire:

1. docs-check Phase 1 Step 5 flags MEMORY.md ≥ 20KB / ≥ 150 lines / ≥ 30 project memories AND the operator notices the pile growing without an obvious leak source.
2. The operator notices arc-receipt content still slipping into `project_*` memories despite arc-history.md existing.
3. Calendar check: ~3-4 weeks from 2026-04-29 (around 2026-05-20), open this file and re-run the Verification-first command. If thresholds still healthy AND no friction surfaced, close this parking file outright. If thresholds drifted OR friction surfaced, brainstorm.

## Pressure

Low while watching. Escalates to medium if any trigger fires.

## Related

- Spec out-of-scope clause: `docs/superpowers/specs/2026-04-29-docs-system-redesign-design.md` (around line 372).
- Drop-from-Plan-4 commit: `62ea036`.
- Forward-going drift catcher: `~/.claude/skills/docs-check/SKILL.md` Phase 1 Step 5.
- Reference memory: `reference_dream_feature.md` (broken `/dream` + four-phase manual fallback).
- Sibling structural shifts that may have closed the leaks: docs-redesign Plans 3, 4, 5 (HANDOVER docket, docs-check rewrite, OVERVIEW directive).
