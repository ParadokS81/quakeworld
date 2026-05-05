# Arc-orchestrator handoff -- QWiki community-reference layer

**Use as the literal first message in a fresh `claude` terminal.** This terminal runs arc-orchestrator cold against a complete, approved arc plan.

---

## Where things are

The QWiki community-reference arc has finished planning. Outputs:

- **Arc-plan scaffold (the source of truth from this point forward):** `docs/superpowers/plans/2026-05-04-qwiki-community-reference/`
  - `README.md` -- phase index + status column + read-in-this-order guide.
  - `decisions.md` -- 20 cross-cutting commitments (+ D14 Python carve-out amendment).
  - `review-findings.md` -- 13 findings (F1-F13) accrued during planning + groom passes.
  - `prerequisites.md` -- operator-side Task 0 (most inherited from qw-oracle Arc 1).
  - `phase-template.md` -- mandatory shape for each phase MD; sub-agent verification brief.
  - `handoff-prompt.md` -- the master per-phase drafter prompt (used during planning; less relevant during execution).
  - 8 per-phase MDs: `phase-0-snapshot-finalize.md` through `phase-7-l2-primer.md`. All 8 are approved.

- **Design spec (frozen reference):** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`
  - The original spec. NOTE: per F6, the spec's DDL section is pre-D5-refinement; `decisions.md` is authoritative for column shape. The spec is the scope/intent source of truth.

- **Snapshot artifact:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` (51 MB raw; 9,173 articles + 767 templates + 324 categories captured 2026-05-04 from quakeworld.nu MediaWiki 1.35.10 API). Currently uncommitted (Phase 0 Task 4 commits it).

- **Planning commit history (on `main` branch):**
  - `8bb23e1` scaffold
  - `3748fcb` Phase 0 + Phase 1 + groom amendments
  - `dd00f84` Phase 2 + player_clan_eras schema redesign (F9)
  - `8e53ac4` Phase 3 + Phase 4 + F10 schema amendment + D14 sharpening
  - `a060946` Phase 5 + F12 reframe
  - `641d7fd` Phase 6
  - `fae621b` Phase 7 + F13

## Skill to invoke

`arc-orchestrator` (in `~/.claude/skills/arc-orchestrator/`). Drives per-phase executor terminals using the 8 approved phase MDs. The orchestrator does NOT execute phase code itself -- it dispatches per-phase executor sessions, owns cross-phase memory (decisions.md amendments, mid-arc review-findings additions), tracks executor context budget, verifies phase outputs against live source at every phase boundary.

## Required reads (in priority order)

**Primary inputs (read in full before starting):**

1. `docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md` -- phase index, "where we are right now" lines, read-in-this-order guide.
2. `docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md` -- 20 cross-cutting commitments. Every phase respects these. D14 has an amendment (Python carve-out for snapshotter / engine extractors); loader-pipeline scripts remain Bun.
3. `docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md` -- 13 findings. Particularly load-bearing for execution: F8 (soft tournament_slug FK), F9 (player_clan_eras surrogate PK + era_seq), F10 (Infobox 4on4team in CHECK enum), F12 (Phase 5 redirect-dep), F13 (Phase 7 L2 primer default shape).
4. `docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-template.md` -- mandatory shape for any phase-MD revisions you might make mid-arc.
5. `docs/superpowers/plans/2026-05-04-qwiki-community-reference/prerequisites.md` -- operator-side Task 0. Most items inherited from Arc 1; check before kicking off Phase 0.

**Per-phase (read each before kicking off the corresponding executor terminal):**

6. `phase-0-snapshot-finalize.md` -- snapshot finalize (slug refetch + redirects + commit policy).
7. `phase-1-curated-rename.md` -- curated/ rename + community schema migration 008.
8. `phase-2-players.md` -- players parser + load + emit (the heaviest phase; budget ~300-400k).
9. `phase-3-clans.md` -- clans parser + load + emit (mirrors Phase 2 with 4 template branches).
10. `phase-4-tournaments.md` -- tournament pilot + parser + load + emit (the only phase with an LLM-shaped sub-task; pilot at Opus MAX).
11. `phase-5-cross-link-backfill.md` -- player_clan_eras + tournament_results backfill.
12. `phase-6-mcp-tools.md` -- 10 new MCP tools (per-type triplet + lookup_by_nick).
13. `phase-7-l2-primer.md` -- L2 corpus reconstruction primer artifact.

**Secondary context (skim as needed):**

14. `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` -- the original spec. Treat as scope/intent source; column shape comes from `decisions.md` per F6.
15. `apps/qw-oracle/CLAUDE.md` -- project conventions; D13 ASCII discipline; D14 Bun runtime.
16. `apps/qw-oracle/SCHEMA.md` -- existing Layer 1 schema reference; community.* tables get appended at execution time.
17. `~/.claude/skills/arc-planner/references/arc-phase-archetypes.md` -- phase-shape verification approaches; useful when verifying phase outputs.

## Critical rules for this arc (operator preferences + arc-specific commitments)

1. **Phase-1 schema is locked + amended.** Three Phase-1 amendments were caught and applied DURING PLANNING, before any execution: F9 (`player_clan_eras` surrogate PK + era_seq + nullable start_year), F10 (`source_template` CHECK widened with `infobox_4on4team`), F12 (Phase 5 redirect dependency awareness). Do NOT re-litigate these during execution. If a Phase-1-equivalent surface emerges (e.g., a NEW unknown clan template variant), apply the same catch-and-amend pattern: amend `phase-1-curated-rename.md` migration 008 BEFORE Phase 1 executes if not yet shipped, OR ship a new migration file if Phase 1 has shipped.

2. **No LLM in player/clan flow per D4.** Phase 2/3/5/6/7 are deterministic. Phase 4 has a single LLM-shaped pilot (~50 pages, Opus MAX). Don't drift Phase 4's pilot into Phase 2/3/5/6/7 -- it's a one-off schema-discovery sub-task.

3. **Two-flag row model per D5.** `is_substantive` and `has_note` are SEPARATE booleans. The is_substantive heuristic (D6, multi-signal on structured fields) drives recognition; the has_note rule (D7, prose-content signal) drives markdown emission. Phase 2 first run tunes the has_note rule empirically; Phase 3 + Phase 4 reuse the tuned shape.

4. **Tournament title-matching strategy is multi-pass per Phase 5.** Pass 1 exact slug -> Pass 2 redirect alias -> Pass 3 fuzzy series+year+mode -> Pass 4 unmatched (tournament_slug=NULL). If Phase 0 hasn't shipped when Phase 5 runs, Pass 2 is a no-op (per F12). Verify `redirects.json` non-empty before kicking off Phase 5 full run.

5. **Operator pace estimates beat conservative pacing.** The arc was scoped at "tonight" by the operator at the start of brainstorming. Surface only concrete blockers, not generic risk anxiety. Operator memory `feedback_trust_operator_pace_estimates.md`.

6. **ASCII output discipline (D13).** Code, doc, commit messages: ASCII-only, no emoji, no em/en-dashes. Re-stated defensively because the operator runs `docs-check` and these patterns trigger noise. The wiki itself contains non-ASCII; parsers normalize at read time; output to disk is ASCII clean.

7. **Bun runtime per D14, with Python carve-out.** Loader-pipeline scripts under `scripts/load-community/*` are Bun. Snapshotter (`scripts/snapshot-wiki/snapshot.py`) is Python alongside engine extractors. Per-phase one-off scripts (stratification helpers, ad-hoc selection scripts) stay Bun.

8. **Phase atomicity per D16.** Each phase ends with a commit that leaves the system runnable. Sub-task verification at boundaries per D17 (YES/NO probes, not interpretive prose).

9. **Subagent dispatch default for code-synthesis tasks.** Per `feedback_no_subagents_for_mechanical_edits.md` sharpened version: inline only for purely textual edits with full content shipped inline; everything else is subagent. Per-task model + effort annotated in each phase MD's task table; respect the rough-cut unless executor finds it wrong.

10. **Verification-regime rule.** Each phase's verification probes are listed at the bottom of its MD. They are YES/NO. Do not skip verification at phase boundaries; do not auto-proceed to phase N+1.

## Cross-phase dependencies (phase-order constraints)

```
Phase 0 (snapshot finalize)
  -> Phase 1 (curated rename + schema 008)
       -> Phase 2 (players)
            -> Phase 3 (clans)
            -> Phase 4 (tournaments; ships migration 009)
                 -> Phase 5 (cross-link backfill; needs Phase 0's redirects + Phase 2/3/4 rows)
                      -> Phase 6 (MCP tools)
                           -> Phase 7 (L2 primer; reads everything)
```

Parallelizable: Phase 3 + Phase 4 can execute in parallel after Phase 2 lands (different entity types, no shared mutations). Phase 5 needs all three; do not parallelize 5 with 3 or 4.

## First three actions

1. **Scope check.** Read `prerequisites.md` and verify the local-dev environment items (Postgres dev container, `.env`, snapshot integrity) are in place. If any prereq is missing, halt and route to operator. Verify the wiki snapshot exists at `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` and `manifest.json` shows ~9,174 articles. Phase 0 is the first executor terminal.

2. **Open Phase 0 executor terminal.** Use the arc-executor skill (or operator drives manually until wave-2-executor is invoked). The Phase 0 MD has Tasks 1-5 with execution-mode annotations: Task 1 inline (snapshotter commit), Task 2 subagent Sonnet medium (refetch all 503 slash titles + cleanup), Task 3 subagent Sonnet medium (redirect refetch), Task 4 inline (commit snapshot to git, Path A locked), Task 5 inline (manifest re-lock). At phase boundary: run V1-V6 verification probes; only proceed to Phase 1 after all PASS.

3. **Set up cross-phase memory capture.** Any new findings discovered during execution append to `review-findings.md` with sequential F-numbers (F14+). Any decisions.md amendments land as dated amendment blocks under the original decision (per the F9, F10 pattern). Do NOT silently override decisions in a phase MD; if a phase needs to deviate, halt and surface to operator first.

## When in doubt

- **Schema decisions feel under-specified for tournaments.** That's intentional per D9. Phase 4's pilot drives the schema. Don't pre-commit fields the pilot hasn't surfaced.
- **A new template variant or status enum value surfaces during execution.** Treat it as a finding. Apply the catch-and-amend pattern: if the affected migration hasn't shipped yet, amend the phase MD's migration SQL inline; if shipped, propose a new migration file with operator approval.
- **Phase 2's first-run produces a has_note count that feels wrong.** That's the tuning gate. Sample 20 emitted notes; if they're wrong-shaped, tune the prose-content signals in Phase 2 Task 9. Phase 3 + Phase 4 reuse the tuned shape.
- **Title-matcher unmatched rate is high (>30%).** That's Phase 5 Q2. Sample 20 unmatched rows; identify systematic patterns; tune `title-match.ts` per Phase 5 Task 10. Operator decides if pattern fix is worth shipping in v1 or deferring.
- **L2 primer artifact shape needs to differ from Phase 7's default.** That's F13. Phase 7 ships a sensible default; if the L2 reconstruction arc's Pass 2 specifies a different shape, refactor Phase 7's `build.ts` or wrap with a thin adapter. Not catastrophic.
- **Operator's "tonight" estimate seems tight after several phases ship.** Surface concrete numbers (e.g. "Phase 4's pilot has been running 90 minutes; tournament template diversity is higher than expected"), not generic risk anxiety. Operator pushes back with "use more subagents" or "merge phases" or "let it run" as preferred.

## Wave-2 status

Wave 2 (arc-orchestrator + arc-executor skills) is shipped and available. The orchestrator can dispatch per-phase executor terminals via the arc-executor skill OR the operator can drive them manually. Either is valid; the orchestrator + executor skills add coordination + verification structure on top of manual driving.
