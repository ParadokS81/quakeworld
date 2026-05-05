# Phase 8 drafter prompt -- KTX Onboarding (End-of-arc docs)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 8 of the KTX Layer 1 Onboarding arc.

PHASE 8 SCOPE: End-of-arc obligations. SCHEMA.md slim-doc Arc 1 refresh
sweep (absorbs HANDOVER backlog item) + EXTRACTOR-PLAYBOOK additions
(four new sections: Pre-Port Discovery Sweep, Pre-Commit Discovery
Cross-Check, Handler-grouping rationale, Pattern 15 STRING_LITERAL-array
walker) + verify Phase 0's doctrine fixes survived (no recursion of
tree-sitter claim into docs added during the arc). After Phase 8 ships,
docs are caught up and the arc is done.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D2 (KTX is libclang -- Phase 0 fixes; Phase 8 verifies
     no recursion), D6 (handler grouping rationale -- Phase 8 documents
     in PLAYBOOK), D10 (dual-row design -- Phase 8 documents in PLAYBOOK),
     D18 (execution modes -- Phase 8 is mostly inline), D20 (git workflow).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 8: F17 (PLAYBOOK addition for dual-row
     design), F19 (doctrine fixes survived; no recursion -- F19's 4
     original sites), F20 (HANDOVER backlog item absorbed), F22 (5th
     doctrine site VALIDATION-RUNBOOK.md added during Phase 0; Phase
     8 verifies its doctrine fix also survived). F19 + F22 are joint
     scope -- 5 reference sites total, not 4.
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-0-doctrine-fixes.md
   - Phase 0 made the original doctrine fixes; Phase 8 verifies they
     survived and the new docs added during the arc don't recurse the
     tree-sitter claim.
6. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Spec preamble's "Doctrine fixes deferred to end-of-arc" block
     enumerates Phase 8's full obligation set.
7. HANDOVER.md
   - "qw-oracle slim-doc Arc 1 refresh sweep" line under "Small
     followups". Phase 8 absorbs this; the operator deletes the
     HANDOVER bullet after Phase 8 ships.
8. apps/qw-oracle/README.md
   apps/qw-oracle/SCHEMA.md
   apps/qw-oracle/OVERVIEW.md
   - The three slim docs the sweep covers. Identify references to
     deleted SQLite artifacts (data/knowledge.db, data/qw.db,
     scripts/load-knowledge/schema.ts, SCHEMA_V*_ADDITIONS_SQL,
     applySchema, better-sqlite3) + stale tool counts ("Ten tools" ->
     12 post-Phase-6) + retired SQLite framing + stale Schema-version
     references (v18 from SQLite era).
9. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Identify the existing pattern catalog and section structure;
     Phase 8 adds 4 new sections.

PHASE-SPECIFIC RECON (run before drafting):

a. Verify Phase 0's doctrine fixes survived (F19 + F22 -- 5 sites total):
   grep -rn 'tree-sitter\\|tree_sitter' apps/qw-oracle/OVERVIEW.md \\
                                       apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md \\
                                       apps/qw-oracle/scripts/extractors/CLAUDE.md \\
                                       apps/qw-oracle/scripts/extractors/VALIDATION-RUNBOOK.md
   - Should return zero hits in KTX context (only references to
     tree-sitter for dusty-ktx fork or unrelated reasons).
   - F22 (added during Phase 0 drafting) brought the count from 4 to 5
     reference sites; VALIDATION-RUNBOOK.md is the 5th. The 4th
     original site (the user-memory file
     project_extraction_pipeline_vision.md) lives outside the repo at
     /home/paradoks/.claude/projects/.../memory/ -- if doctrine
     survival is in question, verify separately, but normal Phase 8
     scope is the 4 in-repo files above.

b. Identify SCHEMA.md references that need updating:
   grep -n 'log_template_versions\\.channel\\|channel.*broadcast.*client.*console.*system' \\
     apps/qw-oracle/SCHEMA.md
   - Confirm SCHEMA.md still documents 4 channels (broadcast / client /
     console / system); Phase 8 adds 'logfile' (5th value, added by
     migration 008).

c. Identify all changes the SCHEMA.md sweep needs to capture:
   - All references to 'data/knowledge.db', 'data/qw.db', 'schema.ts',
     'SCHEMA_V', 'applySchema', 'better-sqlite3' (retired SQLite era).
   - Tool count "Ten tools" -> "12 tools" (post-Phase-6 of qw-oracle
     Arc 1; verify current count).
   - Layer 2 status prose (incomplete? -> Phase 3 of Arc 1 shipped).
   - Runtime claim (Node 20+ / Bun -> Bun-only per D2 of Arc 1).
   - Schema-version framing (v18 from SQLite era; Postgres uses
     migration filenames + schema_migrations table).
   - All 10 CHECK widenings + 1 new table from this arc (008/009/010).
     Per-value enumeration: 1 channel + 1 entity type + 1
     gameplay_entity_defs.kind + 7 gameplay_mechanics.kind. (Earlier
     scaffolding said 9 -- meta-count error caught during Phase 7
     drafting.)

d. Identify EXTRACTOR-PLAYBOOK insertion points for the 4 new sections:
   - "Pre-Port Discovery Sweep" -- the 3-leg sweep methodology
     (Pass 1 of KTX brainstorm). Insertion: near the cross-codebase
     port section.
   - "Pre-Commit Discovery Cross-Check" -- the wiki-vs-source
     cross-check methodology (Pass 5.4 of KTX brainstorm). Insertion:
     near the validation discussion.
   - "Handler-grouping rationale" -- group by walking strategy,
     not source file or row kind (Pass 5.3 of KTX brainstorm).
     Insertion: near the handler conventions section.
   - "Pattern 15: STRING_LITERAL-array walker" -- new pattern from
     Pass 5.3. Insertion: at the end of the Pattern catalog.
   - "Pattern 10 ENUM_DECL widening" -- Phase 4 carry-forward. Current
     PLAYBOOK scopes Pattern 10 to MACRO_DEFINITION; Phase 4 widens
     applicability to ENUM_DECL via the same TU-root mechanic (single
     handler walks both cursor kinds). Insertion: under existing
     Pattern 10 entry as a widening note.
   - Plus a "Dual-row design for log_template + match_event" note
     (per D10 / F17). Insertion: near Pattern 5 / log_template
     discussion.
   - Cross-phase carry-forward sweep: read each prior phase MD's
     "Open questions / deferred items" section for any "Phase 8
     PLAYBOOK amendment" or "Phase 8 lands" deferrals that haven't
     been captured here. Phase 4 explicitly defers Pattern 10 + a
     Pattern 16 reference to Phase 8; Phase 6 may have additional
     match_event / Visitor-carve-out documentation that benefits
     from a PLAYBOOK note. Surface anything found in the phase MD's
     Open Questions if scope-uncertain.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-8-end-of-arc-docs.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- All edits ship full content / per-file diffs inline (per
  feedback_no_subagents_for_mechanical_edits.md). Phase 8 is
  inline-execution-default.
- SCHEMA.md sweep covers all three slim docs in one pass: README.md /
  SCHEMA.md / OVERVIEW.md.
- After Phase 8 ships, the operator deletes the HANDOVER backlog
  bullet ("qw-oracle slim-doc Arc 1 refresh sweep"). The phase MD
  notes this in "Outputs to next phase" / "Recovery."
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut:
- SCHEMA.md sweep tasks (3 slim docs, per-file edits): inline
  (markdown only; full content shipped in phase MD).
- EXTRACTOR-PLAYBOOK 4 new sections: inline (markdown only; full
  content shipped in phase MD).
- Doctrine-fix-survival verification: inline (grep + Read).
- Verification probes: inline.

STEP-BY-STEP:

Step 1: Read all required reads (including the 3 slim docs).

Step 2: Run phase-specific recon. Verify Phase 0's doctrine fixes
        survived. Inventory all SCHEMA.md sweep targets. Identify
        EXTRACTOR-PLAYBOOK insertion points.

Step 3: Draft phase-8-end-of-arc-docs.md. Each task ships full
        markdown content inline (the operator's
        feedback_no_subagents_for_mechanical_edits.md rule applies).

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: all sweep targets identified; new
        sections positioned correctly in PLAYBOOK; HANDOVER bullet
        absorption recorded; doctrine-fix verification covers all 5
        reference sites (F19's 4 + F22's VALIDATION-RUNBOOK.md) + any
        docs created during the arc; per-phase Open-Questions-deferred
        PLAYBOOK obligations are addressed (Phase 4 Pattern 10 / 16
        carry-forwards; any others surfaced).

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary. Note that this is the LAST
        phase of the arc; after operator approval, the next step
        is arc-orchestrator handoff (or post-arc reviewer if all
        phases have shipped).

Drafting is paper-only.

=== END PROMPT ===
```
