# Phase 7 drafter prompt -- QWiki community-reference (L2 primer)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

This is the LAST phase of the QWiki planning arc. After Phase 7 is approved, all 8 phase MDs are drafted and the orchestrator handoff lands at `docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md`.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 7 of the QWiki community-reference arc plan.

PHASE 7 SCOPE: Primer artifact for L2 corpus reconstruction analyzer.
Builds a primer artifact that the L2 analyzer consumes to recognize
reference players (Milton, ParadokS, etc.) with correct nationality +
clan affiliation. After Phase 7 ships, the L2 corpus-reconstruction arc
is unblocked at the primer level.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-qwiki-community-reference/README.md
2. docs/superpowers/plans/2026-05-04-qwiki-community-reference/decisions.md
   - 20 locked cross-cutting decisions. Phase 7 is the consumer of
     several earlier decisions (D2 community schema, D11 per-type MCP
     tools, D14 Bun runtime, D19 JSONB binding direct, D20 stub flag
     multi-signal heuristic).
3. docs/superpowers/plans/2026-05-04-qwiki-community-reference/review-findings.md
   - Findings ledger. Read for any F-numbers tagged "Phase 7" in the
     ownership table.
4. docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-template.md
5. docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-2-players.md
   docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-3-clans.md
   docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-5-cross-link-backfill.md
   docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-6-mcp-tools.md
   - Read these prior phase MDs to know what data Phase 7 has available
     to build the primer from. Phase 7 consumes community.players,
     community.clans, player_clan_eras, etc.
6. docs/superpowers/specs/2026-05-04-qwiki-community-reference-design.md
   - Phase 7 section (the L2-primer scope). The spec describes what
     the primer artifact must contain so the L2 corpus-reconstruction
     analyzer can recognize reference players + nationality + clan
     affiliation.
7. apps/qw-oracle/CLAUDE.md
   - JSONB-binding rule + Bun runtime + idempotency.
8. The L2 corpus-reconstruction parking doc (the consumer):
   docs/superpowers/parking/2026-05-04-layer2-corpus-reconstruction.md
   (or similar; locate via "ls docs/superpowers/parking/ | grep -i layer2")
   - Phase 7's primer artifact is INPUT to this future arc. Read the
     parking doc to understand what the analyzer needs.

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- Phase 6 (MCP tools) is the closest precedent for "build artifact for
  downstream consumer." Read its task shape to copy the verification
  approach.
- If a primer-build script lands under apps/qw-oracle/scripts/, look at
  any existing build-* script (build-snapshot.ts, build-asset-bundle.ts)
  for the artifact-build pattern.

PHASE-SPECIFIC RECON (run before drafting):

a. Locate the L2 corpus-reconstruction parking doc:
   ls docs/superpowers/parking/ | grep -i 'layer2\\|corpus'

b. Identify what the primer artifact should contain (from the spec
   Phase 7 section + the L2 parking doc):
   - Reference player roster (with nationality + active-year + primary
     clan) -- this is the L2 analyzer's "known good" anchor set.
   - Clan roster (primary keys + active-era spans).
   - Likely a JSON artifact format the analyzer can load.

c. Verify community.players + community.clans + player_clan_eras
   schema (from Phase 1's migration 008 + Phase 2/3 column additions).
   Check the latest migration files:
   ls apps/qw-oracle/db/migrations/ | tail -5

d. Check Phase 5 cross-link tables for player_clan_eras shape:
   read docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-5-cross-link-backfill.md

e. Verify there's no existing primer-build infrastructure to extend:
   ls apps/qw-oracle/scripts/ | grep -i 'primer\\|build'

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-qwiki-community-reference/phase-7-l2-primer.md

Follow phase-template.md exactly.

Concrete authoring rules (from decisions.md, restated for clarity):

- ASCII only. No emoji. ASCII hyphen-minus, not em-dash. (D13)
- All scripts run under Bun (D14).
- New community schema (D2). Tables go there, not in public.
- JSONB columns receive JS values directly; never pre-stringify (D19).
- Per-task execution mode declared (D18 -- per phase-template.md).

Per-task execution-mode rough cut:
- Primer-build script (apps/qw-oracle/scripts/build-l2-primer.ts):
  subagent (Sonnet medium) -- code synthesis, single file, queries
  community schema + writes JSON artifact.
- Primer artifact format spec / schema doc: inline (markdown only).
- Tests for primer-build script: subagent (Sonnet medium).
- Verification probes (artifact contains reference players with
  correct nationality + clan): inline.

STEP-BY-STEP:

Step 1: Read all required files. Identify findings touching Phase 7.

Step 2: Run phase-specific recon. Locate L2 parking doc; verify
        community schema state; identify primer artifact requirements.

Step 3: Draft phase-7-l2-primer.md per phase-template.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore type).
        Particularly verify: primer artifact format matches L2
        analyzer's needs; reference players list is concrete and
        anchored against community.players; JSONB columns bound
        correctly; idempotency covered.

Step 5: Apply sub-agent findings. If contradicts decisions.md, reject
        in "Open questions."

Step 6: Halt. Reply with:
        - Path to phase-7-l2-primer.md.
        - Sub-agent finding count (CRITICAL / SUBSTANTIVE / ADVISORY).
        - Open questions.
        - Recommendation: "ready for review" or "needs another pass."

This is the LAST phase MD for the QWiki planning arc. After approval,
the next step is the arc-orchestrator handoff at
docs/superpowers/parking/2026-05-04-qwiki-community-reference-orchestrator-handoff.md
(operator-driven; not part of this drafter's scope).

Do NOT proceed to anything else. Drafting is paper-only.

=== END PROMPT ===
```
