# Phase 4 canonicalization — review artifacts

> Companion folder to the active investigative session captured in `../2026-05-06-qwiki-phase-4-investigative-resume.md`. Holds the canonicalization supervisor design + the operator review report. Browse-friendly mirrors of working artifacts that live at `/tmp/qwiki-probe/` (WSL-internal staging).

## Files

- **`operator-review.md`** — edge cases needing operator judgment from the 214-row × 5-year extraction corpus. Section-organized (A-F): role disagreements, name keep/strip variance, brand boundary questions, specific data errors, pending decisions, closed decisions. Mark decisions inline with checkboxes.

- **`supervisor-design.md`** — design sketch for the canonicalization supervisor. Hybrid deterministic + LLM architecture. First-iteration implementation (deterministic only) lives at `/tmp/qwiki-probe/canonicalize.ts`.

## Working artifacts (not in repo, WSL-only)

- `/tmp/qwiki-probe/canonicalize.ts` — supervisor implementation (Bun script).
- `/tmp/qwiki-probe/canonical/*.json` — supervisor output (cluster table, role-disagreements, parent-slug-issues, etc.).
- `/tmp/qwiki-probe/<year>-v7-normalized/*.json` — extracted tournament JSONs per year cohort.
- `/tmp/qwiki-probe/prompt-v7.md` — canonical extraction prompt for subagent dispatches.

## When this folder graduates

When the prompt converges (2-3 consecutive years stable) AND the operator review locks all decisions, the artifacts here roll up into:

- `docs/superpowers/specs/2026-05-05-qwiki-tournament-llm-extraction-design.md` — frozen design spec.
- Brand notes at `apps/qw-oracle/curated/tournament-notes/` — Layer 3 deliverable.
- Phase 4b migration 009 — DDL with discovered columns + provenance.
- Redrafted `apps/qw-oracle/.../phase-4-tournaments.md` — executor-ready phase MD.

This folder gets archived (kept in git history) once those land.
