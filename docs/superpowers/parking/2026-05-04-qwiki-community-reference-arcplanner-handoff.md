# Arc-planner handoff -- QWiki community-reference layer

**Use as the literal first message in a fresh `claude` terminal.** This terminal runs arc-planner cold against the design spec.

---

## Where things are

The QWiki community-reference arc has finished brainstorming and snapshot capture. Outputs:

- **Design spec (source of truth):** `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md`
- **Arc capture / parking:** `docs/superpowers/parking/2026-05-04-qwiki-community-reference.md`
- **Snapshot artifact:** `apps/qw-oracle/data/wiki-snapshots/2026-05-04/` (51 MB; 9,174 articles + 767 templates + 324 categories captured 2026-05-04 from quakeworld.nu MediaWiki 1.35.10 API)

Pilot validated three player template variants and two clan variants. Tournaments not yet pilot'd -- their pilot is Phase 4 of this arc. Schema sketched in spec; ratified by operator for players + clans; placeholder for tournaments pending Phase 4.

## Skill to invoke

`arc-planner` (in `~/.claude/skills/arc-planner/`). Should produce the standard six-artifact arc scaffold under `docs/superpowers/plans/2026-05-04-qwiki-community-reference/`:

- `decisions.md`
- `review-findings.md`
- `prerequisites.md`
- `phase-template.md`
- `handoff-prompt.md`
- `README.md`

Plus per-phase MDs for the 8 phases proposed in the design spec.

## Required reads (in priority order)

**Primary inputs (read in full):**

1. `docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md` -- the design spec. Source of truth for scope, schema, phase decomposition, ratified decisions, deferred decisions.
2. `docs/superpowers/parking/2026-05-04-qwiki-community-reference.md` -- arc capture, verification first, decision points needing arc-planner attention.
3. `apps/qw-oracle/data/wiki-snapshots/2026-05-04/manifest.json` -- snapshot metadata. Confirm counts match spec.

**Secondary context (skim as needed):**

4. `docs/superpowers/specs/2026-05-01-qw-oracle-database-architecture-design.md` -- postgres backbone the new `community` schema lands inside.
5. `apps/qw-oracle/CLAUDE.md` -- existing qw-oracle conventions.
6. `apps/qw-oracle/concept-notes/` -- existing L3 surface the curated/ rename touches.

**Sample data (read 3-5 articles for parser-shape intuition):**

7. `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Milton.json` -- modern `{{Infobox player}}` example.
8. `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ParadokS.json` -- older `{{Player-info}}` example.
9. `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Bomkia.json` -- skeletal stub.
10. `apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/Crit.json` or similar -- NO_INFOBOX bullet-prose example.

## Critical rules for this arc

1. **The design spec's ratified decisions are durable.** Re-litigate only if a phase surfaces new evidence the operator should weigh; do not silently revisit (curated/ rename, two-output schema, separate `community` postgres schema, multi-signal stub heuristic, etc.).
2. **Tournament schema is genuinely TBD.** Phase 4 pilot must precede parser commit. Plan accordingly -- Phase 4 is not "write a parser," it's "pilot then write a parser."
3. **The cross-link backfill (Phase 5) depends on all three parsers landing.** Don't try to interleave; it serializes.
4. **Snapshot is reusable across future arcs (maps, match reports, xantom-archive merge).** Phase 0 fixes (slugify, redirects, gitignore) need to be done right because they outlast this arc.
5. **Operator estimates "finished tonight."** That implies aggressive subagent dispatch and parallel where safe. Annotate execution mode per task in the per-phase MDs (model + effort) so the executor terminals can run hot. Default floor: Sonnet medium for reasoning-shaped tasks; Haiku for mechanical extract/load/emit; Opus only where a phase boundary needs a careful judgment call.
6. **Operator's pace estimates beat conservative Claude pacing.** Operator memory: `feedback_trust_operator_pace_estimates.md`. Surface only concrete blockers, not generic risk anxiety.

## Open decisions to surface during planning

These are flagged in the spec's "Decisions deferred to arc-planner / executor" section:

- **Single arc or defensive split** (Arc 1 = players+clans+infra; Arc 2 = tournaments). Operator preference: single. Arc-planner: re-evaluate after Phase 4 pilot if it surfaces structural surprises.
- **Snapshot commit policy** (51 MB raw, ~10 MB compressed). Decide gitignore vs commit in Phase 0.
- **Note template per type.** Frontmatter fields sketched in spec. Phase 2 finalizes the player-note template; Phase 3 + 4 reuse / adapt.
- **Substantive threshold tuning.** Default ≥2 of 5; first parser run in Phase 2 produces actual count -- operator may push tighter or looser based on observed note quality.

## First three actions

1. Read the design spec and parking doc in full.
2. Read 3-5 sample articles from the snapshot to internalize wikitext shape.
3. Confirm snapshot is intact via `ls apps/qw-oracle/data/wiki-snapshots/2026-05-04/articles/ | wc -l` (expect 9174).

Then proceed with arc-planner's standard scaffolding: per-phase MD drafts in fresh sub-agent terminals, phase-template ratification, decisions.md amendments where Phase-4-style placeholders need filling, handoff-prompt for the arc-orchestrator terminal that follows.

## When in doubt

- If schema decisions feel under-specified for tournaments: that's intentional. The pilot drives the schema. Don't pre-commit fields the wiki may not have.
- If the curated/ rename feels heavier than expected: it's load-bearing for the architectural reframe (Layer 3 = curated knowledge layer with typed note-folders, not concept-notes-only). Worth doing carefully in Phase 1 because it's much harder to do later when player-notes/ + clan-notes/ + tournament-notes/ are populated.
- If operator's "tonight" estimate seems tight after phasing: surface concrete numbers (e.g. "Phase 2 alone is 3-4 hr based on three parser branches") rather than generic concern. Operator can push back with "use more subagents" or "merge phases" as preferred.
