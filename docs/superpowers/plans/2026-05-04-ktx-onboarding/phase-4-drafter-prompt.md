# Phase 4 drafter prompt -- KTX Onboarding (Taxonomies handler)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 4 of the KTX Layer 1 Onboarding arc.

PHASE 4 SCOPE: Pass 5 taxonomies handler. New file
apps/qw-oracle/scripts/extractors/ktx/_handler_gameplay_taxonomies.py +
new loader apps/qw-oracle/scripts/load-knowledge/load-gameplay-taxonomies.ts.
Emits 5 election_type rows (skip etNone) + 27 death_rule rows (skip
dtNONE / dtUNKNOWN; keep dtCHANGELEVEL). After Phase 4 ships,
qw-event-log validation harness anchor for the WeaponType enum is
available at the schema level.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D3 (Visitor-only), D6 (handler grouping), D14
     (JSONB binding), D15 (idempotency), D18 (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 4: F7 (5 election_type rows; skip etNone),
     F8 (27 death_rule rows; skip dtNONE/dtUNKNOWN; keep dtCHANGELEVEL).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 4 ranges: Pass 4.3 (electType_t + deathType_t entity
     decisions) + Pass 5.3 (handler architecture for taxonomies) +
     Pass 5.4.3 (election_type final row schema) + Pass 5.4.4
     (death_rule final row schema).
6. apps/qw-oracle/CLAUDE.md
7. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Pattern 10 (TU-root cursor intercept on header-defined enums and
     X-macros).
8. apps/qw-oracle/SCHEMA.md
   - gameplay_mechanics table; existing 'death_rule' kind values
     present from id1 baseline.

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py
  -- Pattern 10 reference (TU-root cursor intercept for header-defined
     macros and enum decls). Closest precedent for Phase 4's enum-walk
     handler.
- apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
  -- Existing qw-namespace loader pattern; load-gameplay-taxonomies.ts
     mirrors this shape for the new election_type + death_rule rows.

PHASE-SPECIFIC RECON (run before drafting):

a. Verify electType_t entries (F7):
   sed -n '215,230p' research/repos/ktx/include/progs.h
   - Confirm 6 enum values: etNone, etCaptain, etCoach, etAdmin,
     etSuggestColor, etLateJoin. Skip etNone -> 5 rows.

b. Read deathtype.h X-macro file (F8):
   cat research/repos/ktx/include/deathtype.h
   - Confirm 30 entries (28 substantive + dtNONE + dtUNKNOWN sentinels).
   - Each entry pattern: DEATHTYPE(<dtTAG>, <string_token>).
   - Pass 4.3 said 28 values; correction in Pass 5.4.4 was 30 entries.

c. Verify dtCHANGELEVEL is a structural row (F8):
   grep -n 'dtCHANGELEVEL' research/repos/ktx/src/
   - Check the call sites; the spec says fires on map change, not
     gameplay. props_json.category should be 'structural'.

d. Cross-reference vote.c for election_type related_commands_json (F7):
   grep -n 'electCaptain\\|elect_admin\\|electCoach\\|suggestcolor\\|elect_admin' research/repos/ktx/src/vote.c | head
   - Identify command names per election type.

e. For death_rule props_json.related_weapon mapping (F8):
   - Manual: dtAXE -> "axe" weapon entity (id1 baseline);
     dtSG -> "shotgun"; dtSSG -> "supershotgun"; dtNG -> "nailgun";
     dtSNG -> "supernailgun"; dtGL -> "grenadelauncher";
     dtRL -> "rocketlauncher"; dtLG_BEAM/dtLG_DIS/dtLG_DIS_SELF -> "lightning".
     Environment / telefrag / structural / suicide -> null.

f. Read MVDSV's protocol handler to understand the Pattern 10 walk:
   - apps/qw-oracle/scripts/extractors/mvdsv/_handler_protocol.py
   - Note the TU-root cursor intercept on enum decls.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-4-taxonomies-handler.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- _handler_gameplay_taxonomies.py inherits from Visitor only (D3).
- Pattern 10 walking strategy: TU-root cursor intercept on header
  declarations.
- Skip sentinels: etNone (election); dtNONE + dtUNKNOWN (death).
  Keep dtCHANGELEVEL with category='structural'.
- ruleset_gate_json={} on all taxonomies rows (election_type is
  subsystem-level; death_rule is universal across modes).
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut:
- _handler_gameplay_taxonomies.py: subagent (Sonnet medium) -- two-stage
  walk (election_type + deathType X-macro); contained shape; mirrors
  MVDSV protocol handler pattern.
- load-gameplay-taxonomies.ts: subagent (Sonnet medium) -- mirror
  existing load-gameplay.ts pattern with two-kind dispatch.
- Verification probes: inline.

STEP-BY-STEP:

Step 1: Read all required reads. Note F7/F8 anchors.

Step 2: Run phase-specific recon. Verify electType_t = 6 (skip etNone
        -> 5); verify deathtype.h X-macro = 30 entries (skip 2 sentinels
        -> 27 rows); verify dtCHANGELEVEL category.

Step 3: Draft phase-4-taxonomies-handler.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: row counts match anchors; sentinel skips
        applied; dtCHANGELEVEL handled as structural; related_weapon
        mapping correct for all weapon-category entries.

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 5. Drafting is paper-only.

=== END PROMPT ===
```
