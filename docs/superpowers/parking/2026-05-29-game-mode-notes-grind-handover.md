# Handover: KTX game-mode arc — methodology reconciled, ready for the note grind

**Date:** 2026-05-29 (afternoon session; ~400k context retired in Opus 4.8 / max effort).
**Owner:** fresh terminal, model of your choice.
**Supersedes:** `2026-05-29-game-mode-arc-continuation.md` (this morning's handover — its work is done; this doc is the current contract). The reframe rationale + locked classification still live in `experience-group-classification.md`.

## The headline

This session **drained the methodology-reconciliation backlog** (the reference docs + skill that guide note authoring) and recast one note (`killquad`). The remaining ~22 notes now draft against **clean** docs. No note-drafting backlog was touched beyond killquad — that grind is the next session's job.

## What shipped this session (all on `main`, pushed)

- **`killquad` recast** (`d0496c26`) — validates the **mutation/match-modifier shape** (the last untested one). Operator-corrected mid-draft: the first Quad seeds at the **first death of the match** (not circular "carrier dies"); each pickup is a **fresh 30s** (timer resets, `items.c:2210` clamp); killquad+berzerk **coexist** (window-scoped `!k_berzerk` gate). All source-verified.
- **Methodology reconciliation (COMPLETE):**
  - `concept-note-frontmatter-schema.md` rewritten → one uniform field set; `kind`=L1 `mode_class` metadata; queryable facts absent-not-empty; leaned relation enum (`67ecb756`).
  - `concept-note-section-structure.md` rewritten → one uniform 8-section structure (`0109cae2`).
  - `experience-group-classification.md` amended → `/ca`→`/carena` + slug≠command lesson + Rocket Arena; **absorbed** the mechanism/interlocks content from the retired doc (`6138557d`).
  - `mode-vs-mutation-classification.md` **DELETED** — three-bucket framing retired (`6138557d`).
  - `triage-rules.md` — `ca` row corrected to hybrid; Clan_Arena reframed as a Step-0 false-positive (`6138557d`).
  - `concept-notes/CLAUDE.md` index updated (`6138557d`).
  - **`~/.claude/skills/game-mode-curate/SKILL.md`** — targeted update to the uniform structure (~20 edits; workflow + verification discipline preserved). **External file — NOT a repo commit; it's live on disk.**
- **Deploy-runbook fix** (`be99104d`) — added the Layer-3 concept-load step to `DEPLOYMENT.md` (it was missing; notes would never reach prod).
- **Parking capture** (`07c39eec`) — `2026-05-29-served-admin-knowledge-from-methodology.md`: future served-note stream (game-modes overview + server-setup) so the relational/hosting knowledge in the internal docs eventually reaches users. Not now.

## IMPORTANT: the game-mode-curate skill is now SAFE to invoke

The prior handover said *"don't re-invoke game-mode-curate blindly — it re-injects the retired model."* **That warning is obsolete.** The skill now reflects the uniform structure. Invoke it normally (`/game-mode-curate <slug>` or per-mode dispatch) — it no longer fights the locked structure.

## Corpus state

| State | Count | Modes |
|---|---|---|
| Experience-first (done) | 4 | `4on4`, `ca`, `wipeout`, `killquad` |
| v3 drafts (need recast + re-verify) | 4 | `blitz2v2`, `ctf`, `hoonymode`, `lgc` |
| No note yet | 19 | 8 standard-game (`1on1` `2on2` `3on3` `10on10` `XonX` `2on2on2` `3on3on3` `4on4on4`), `ffa`, `blitz4v4`, `race`, `tot`, `bloodfest`, `midair`, `instagib`, `berzerk`, `freshteams`, `nosweep`, `yawnmode` |
| Extras (outside the 27) | ~3 | `deathmatch-modes` ref, `dmm4`, `rocket-arena` |

v3 recasts: treat v3 content as hypothesis, re-verify against source; harvest genuine content (maps tables, history) from the `_backup-pre-methodology-v2/` copies.

## Reads required (cold, in order)

1. This handover.
2. `apps/qw-oracle/curated/concept-notes/_methodology/game-modes/experience-group-classification.md` (the heart — taxonomy + 27 + interlocks + mode_class).
3. The other 3 methodology docs (`concept-note-section-structure.md`, `concept-note-frontmatter-schema.md`, `triage-rules.md`) — now CLEAN, trust them.
4. The 4 exemplars: **`4on4.md`** (standard-game), **`ca.md`** + **`wipeout.md`** (arena), **`killquad.md`** (modifier). These are the calibration bar.
5. `weapon-scripts.md` (voice bar).
6. `~/.claude/skills/game-mode-curate/SKILL.md` — the per-mode workflow (now reconciled; invoke it).

## Critical rules (don't drift)

- **One uniform structure for all 27** (`Summary` / `How it plays` / `Starting a game` / [`Strategy`] / [`Maps`] / [`History`] / `Hosting & settings` / `See also`). Five core, three conditional (absent-not-empty). `kind` is frontmatter metadata.
- **Activation command from the `cmds[]` table, not the slug.** `ca`→`/carena` is the proven trap.
- **Every specific number/claim source-verified at the handler**, not the init array. Audit trail in the commit body, not the prose.
- **Modifiers:** `How it plays` leads with the delta vs base; `Starting a game` = enable-toggle-then-play; conditional sections usually absent.
- **`incompatible-with` only for source-verified toggle mutual-exclusions** (midair/lgc, lgc/instagib). Coexisting pairs (killquad/berzerk) are `similar-shape` + prose. Verify the guard before calling it an interlock.
- **One mode at a time, operator polishes. No fan-out.** Surface a draft, invite per-mode corrections (the operator's QW knowledge catches what source-derivation misses — proven twice on killquad this session). Commit each note with the audit-trail body + `Co-Authored-By:`. Stage only the note file (`git diff --cached --stat`; the working tree has pre-existing unrelated drift).

## First three actions

1. Read this handover + `experience-group-classification.md` + the 4 exemplars cold.
2. Pick the next note. Suggested: **`ctf`** — the only mode that exercises the `###`-subsections-in-How-it-plays path (grappling hook + runes), so it stress-tests the uniform structure on a content-heavy standalone. Or knock out quick standard-game roster wins (`2on2`/`3on3`/…) to build momentum. Operator's sequencing call.
3. Draft → operator polish → commit. Then grind: 4 v3 recasts + 19 new + extras.

## Out of scope

- L1 corpus changes (the dmm/rocket-arena extraction gaps are flagged in `experience-group-classification.md`'s Open-L1-gaps + the parked served-admin stream, NOT fixed).
- Building the served `game-modes` overview / `server-setup` notes (parked — future stream; trigger is an admin-query stream or the old-wiki restructuring arc).
- MVDSV / QWFWD / QTV forks (KTX-scoped).

## Git state (2026-05-29 afternoon)

- 6 commits on `main` this session: `d0496c26` (killquad), `be99104d` (deploy runbook), `07c39eec` (parking), `67ecb756` (frontmatter-schema), `0109cae2` (section-structure), `6138557d` (experience-group + retire mode-vs-mutation + triage). Pushed at wrap.
- SKILL.md edited live at `~/.claude/skills/game-mode-curate/` — not in this repo.
- ~15 uncommitted working-tree files remain — ALL pre-existing unrelated drift (matchscheduler / slipgate-app / settings / untracked parking+output), not this arc's.
