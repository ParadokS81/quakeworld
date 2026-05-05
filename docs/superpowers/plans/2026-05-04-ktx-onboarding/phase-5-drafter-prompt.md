# Phase 5 drafter prompt -- KTX Onboarding (Tables handler)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 5 of the KTX Layer 1 Onboarding arc.

PHASE 5 SCOPE: Pass 5 tables handler. New file
apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_tables.py + new
loader apps/qw-oracle/scripts/load-knowledge/load-gameplay-tables.ts.
Emits 13 monster + 3 score_system + 30 drop_item + 15 loc_macro +
21 teamplay_message rows = 82 rows across 5 kinds. Pattern 4
INIT_LIST_EXPR walker + Pattern 9 banner-comment harvest.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D3 (Visitor-only), D6 (handler grouping), D8 (gate
     convention), D9 (source-fidelity), D14 (JSONB binding), D15
     (idempotency), D18 (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 5: F9 (13 monsters; armor_for_kill name),
     F10 (3 score_systems; positions length=10 invariant), F11 (30
     drop_items; 5-field struct), F12 (15 loc_macros), F13 (21
     teamplay_messages; Pattern 9 harvest).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 5 ranges: Pass 4.4 (Group B 5 IN tables disposition) +
     Pass 5.3 (handler architecture for tables; Pattern 4 + Pattern 9) +
     Pass 5.4.5 (monster) + Pass 5.4.6 (score_system) + Pass 5.4.7
     (drop_item) + Pass 5.4.8 (loc_macro) + Pass 5.4.9 (teamplay_message).
6. apps/qw-oracle/CLAUDE.md
7. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Pattern 4 (INIT_LIST_EXPR walks on struct-array literals).
   - Pattern 9 (function-banner comment harvest).
8. apps/qw-oracle/SCHEMA.md
   - gameplay_entity_defs (for monster) + gameplay_mechanics (for the
     other 4).

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- Any existing handler under apps/qw-oracle/scripts/extractors/<engine>/
  that walks INIT_LIST_EXPR (Pattern 4) on a struct-array. Search:
  grep -rln 'INIT_LIST_EXPR' apps/qw-oracle/scripts/extractors/
- ezQuake or MVDSV handlers using Pattern 9 (function-banner harvest):
  grep -rln 'banner.*comment\\|FUNCTION_DECL.*comment' apps/qw-oracle/scripts/extractors/
- apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
  -- Existing qw-namespace loader; load-gameplay-tables.ts mirrors
     for the 5 new kinds.

PHASE-SPECIFIC RECON (run before drafting):

a. Verify monster row count + struct field name (F9):
   sed -n '45,80p' research/repos/ktx/src/sp_monsters.c
   - Confirm 13 entries in bloodfest_monster_array[].
   - Read the bloodfest_monster_t struct definition (sp_monsters.c:48-52);
     confirm field 2 is 'armor_for_kill', NOT 'count_modifier' (Pass
     4.4 sketch was wrong; Pass 5.4 corrected).
   - Note the FISH _MUST_ BE _FIRST_ comment for is_first_required.

b. Verify score_system row count + 10-element invariant (F10):
   sed -n '5135,5170p' research/repos/ktx/src/race.c
   - Confirm 3 entries in scoring_systems[].
   - Confirm each entry's positions array has exactly 10 elements.

c. Verify drop_item row count + 5-field struct (F11):
   sed -n '9040,9115p' research/repos/ktx/src/commands.c
   - Confirm 30 entries in dropitems[] (Pass 4.4 sketch said ~20; wrong).
   - Confirm dropitem_spawn_t has 5 fields: name, classname,
     spawnflags, angle, spawn (function pointer).
   - Note the H_ROTTEN / H_MEGA / WEAPON_BIG2 macros (Pattern 6 +
     #include walk needed; see Phase 1's lift).

d. Verify loc_macro row count (F12):
   sed -n '1485,1515p' research/repos/ktx/src/teamplay.c
   - Confirm 15 entries in locmacros[] (Pass 4.4 sketched 16; direct
     count corrected to 15).
   - Note the non-identity entries: mh -> mega, separator -> -.

e. Verify teamplay_message row count + handlers (F13):
   sed -n '1635,1675p' research/repos/ktx/src/teamplay.c
   - Confirm 21 entries in messages[] (Pass 4.4 estimated ~30; wrong).
   - For each entry, identify the handler function name; locate that
     function's banner comment for Pattern 9 harvest.

f. Verify the related_entity_canonical_id mappings for drop_items:
   - Most drop_items map to existing id1 baseline gameplay_entity_defs
     rows (item_health, weapon_supershotgun, etc.). Check existing
     id1 rows for the join shape.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-5-tables-handler.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- _handler_gameplay_tables.py inherits from Visitor only (D3).
- Pattern 4 (INIT_LIST_EXPR walks) for all 5 tables.
- Pattern 9 (banner-comment harvest) for teamplay_message handler
  function descriptions.
- Source-fidelity for field names (D9): armor_for_kill (not
  count_modifier); locked at F9.
- Loader-side validation gate: every score_system row asserts
  len(positions) == 10 (F10).
- Default gates per kind:
    monster -> {"mode":"bloodfest"}
    score_system -> {"mode":"race"}
    drop_item -> {} (universal)
    loc_macro -> {} (universal)
    teamplay_message -> {} (universal)
- JSONB columns receive JS values directly; never pre-stringify (D14).
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut:
- _handler_gameplay_tables.py: subagent (Sonnet MAX) -- 5 distinct
  table walks, Pattern 4 + Pattern 9 combination, multi-kind
  dispatch, judgment-dense.
- load-gameplay-tables.ts: subagent (Sonnet medium) -- 5-kind
  loader, mirrors load-gameplay.ts pattern.
- Verification probes (per-kind row counts + score_system 10-element
  loader-side assertion): inline.

STEP-BY-STEP:

Step 1: Read all required reads. Note F9-F13 anchors.

Step 2: Run phase-specific recon. Verify all 5 row counts and field
        names directly from source. Pass 4 sketch corrections in
        Pass 5.4 are documented in F9-F13; verify the corrections
        against live source one more time before drafting.

Step 3: Draft phase-5-tables-handler.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: 5 row counts match anchors; armor_for_kill
        field name used (not count_modifier); positions length=10
        invariant assertion in loader; Pattern 9 banner harvest for
        teamplay_message; default gates per kind correct.

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 6. Drafting is paper-only.

=== END PROMPT ===
```
