# Phase 3 drafter prompt -- KTX Onboarding (Modes handler)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 3 of the KTX Layer 1 Onboarding arc.

PHASE 3 SCOPE: Pass 5 modes handler. New file
apps/qw-oracle/scripts/extractors/ktx/_handler_modes.py + new loader
apps/qw-oracle/scripts/load-knowledge/load-modes.ts. Emits 27 game_mode
catalog rows (17 um_list peers + race + bloodfest + 8 mutators) + ~309
mode_default overlay rows. Depends on Phase 1's Pattern 6 cross-header
lift. After Phase 3 ships, mode-aware queries are possible.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D3 (Visitor-only), D6 (handler grouping by walking
     strategy), D8 (single-key gate convention), D9 (source-fidelity
     for canonical tokens), D11 (two-axis catalog discriminator), D12
     (per-line mode_default granularity), D14 (JSONB binding), D18
     (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 3: F5 (27 catalog rows), F6 (~309
     mode_default rows), F15 (Pattern 6 lift dependency confirmed).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md
   - Confirm Pattern 6 lift outputs are in place.
6. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 3 ranges: Pass 4.2 (mode taxonomy spine: 17 um_list peers) +
     Pass 5.1 (race + bloodfest catalog rows) + Pass 5.1 amendment
     (8 mutators added; final catalog 27) + Pass 5.2 (per-_um_init
     extraction shape; per-line granularity; new kind 'mode_default') +
     Pass 5.4.1 (game_mode catalog row schema final) + Pass 5.4.2
     (mode_default row schema final).
7. apps/qw-oracle/CLAUDE.md
8. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Pattern 6 (extended in D4 to depth-1 #include walk).
9. apps/qw-oracle/SCHEMA.md
   - gameplay_mechanics + gameplay_sources tables.

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- apps/qw-oracle/scripts/extractors/qw/extract.py
  -- Existing qw-namespace extractor (id1 baseline gameplay rows).
     KTX gameplay extraction lands alongside.
- apps/qw-oracle/scripts/load-knowledge/load-gameplay.ts
  -- Existing qw-namespace loader; load-modes.ts mirrors its shape
     for the new game_mode + mode_default rows.
- apps/qw-oracle/scripts/extractors/ezquake/_handler_cvars.py
  -- Pattern 6 same-file consumption pattern (Phase 1 extended this
     to depth-1 #include walk; Phase 3 is the first consumer of the
     extension).

PHASE-SPECIFIC RECON (run before drafting):

a. Verify the 17-row um_list catalog (F5 partial):
   sed -n '4527,4550p' research/repos/ktx/src/commands.c
   - Confirm 17 entries; record each entry's (canonical_name,
     UM_*_team_structure, _um_init function name, race_plrs_per_team).
   - Note that 3 entries (wipeout, ca, tot) ALIAS existing
     UserModes_t values; their team_structure shares with peers.

b. Verify common_um_init line count (F6 partial):
   sed -n '4150,4210p' research/repos/ktx/src/commands.c
   - Confirm 54 cvar-set lines.
   - Identify the 2 cross-header macro lines (LGCMODE_VARIABLE,
     TOT_MODE_VARIABLE) that motivate the Pattern 6 lift dependency.

c. Verify cross-header macros are resolved post-Phase-1:
   grep -n 'LGCMODE_VARIABLE\\|TOT_MODE_VARIABLE' research/repos/ktx/include/g_local.h
   - Both should resolve to literal strings ('k_lgcmode' and
     'k_tot_mode' respectively).

d. Inventory the 17 _um_init const char[] declarations and average
   line counts (F6 estimate ~255 overlay total):
   grep -n '_um_init\\b' research/repos/ktx/src/commands.c | head -30
   - For each entry, locate the const char[] declaration and count
     cvar-set lines (e.g., _2on2_um_init, _4on4_um_init, ctf_um_init,
     wipeout_um_init, carena_um_init, tot_um_init, ...).

e. Verify race + bloodfest cvar-toggle modes (F5 partial):
   grep -n 'k_race\\b' research/repos/ktx/src/world.c | head
   grep -n 'k_bloodfest\\b' research/repos/ktx/src/world.c | head
   grep -n 'apply_race_settings\\|race_settings\\[' research/repos/ktx/src/race.c | head
   - Confirm race uses cvar_toggle_with_init_string mechanism.
   - Confirm bloodfest uses cvar_toggle_only mechanism.

f. Verify the 8 mutator inventory (F5 partial):
   for mutator in lgcmode instagib midair berzerk yawnmode killquad freshteams nosweep; do
     grep -rn "k_${mutator}\\|k_bzk" research/repos/ktx/src/world.c | head -3
   done
   - Confirm registration cvars exist. Berzerk uses k_bzk specifically
     (not k_berzerk; that's the runtime state cvar).

g. Read existing qw-namespace gameplay row shape (load-gameplay.ts) to
   match the load-modes.ts pattern.

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-3-modes-handler.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- _handler_modes.py inherits from Visitor only (D3).
- STRING_LITERAL-array walking strategy (Pass 5.3 emerging Pattern 15;
  capture the pattern shape for end-of-arc PLAYBOOK addition).
- Source-fidelity for canonical tokens (D9): 'ca', '2on2', 'lgc',
  'wipeout' as the row's `name`. Source enum spelling (umCA, um2on2,
  umLGCMODE) goes in `value_text`.
- Single-key gate {"mode":"<token>"} for mode_default rows (D8).
  Catalog rows themselves use ruleset_gate_json={}.
- Two-axis discriminators on every game_mode row's props_json (D11):
  init_mechanism + mode_class + auto_reset_on_match.
- One row per cvar-set line in mode_default extraction (D12), NOT
  composite-per-mode JSON-blob rows.
- Trailing-comment harvest -- comments ARE the documentation; don't
  drop them (D12).
- Pass 1.7 printf-handler dependency: ensure _handler_modes.py does
  NOT collide with log_template extraction (different artifacts).

Per-task execution-mode rough cut:
- _handler_modes.py: subagent (Sonnet MAX) -- depends on cross-header
  lift, walks 17 const char[] arrays + common, per-line parse with
  comment harvest, two-axis catalog discriminator. Judgment-dense;
  bumping to Sonnet MAX above Sonnet medium floor.
- load-modes.ts: subagent (Sonnet medium) -- mirror existing
  load-gameplay.ts pattern.
- Verification probes: inline (small SQL queries).

STEP-BY-STEP:

Step 1: Read all required reads. Note F5/F6/F15 anchors.

Step 2: Run phase-specific recon. Verify the 17-row + race + bloodfest
        + 8-mutator structure totalling 27 rows. Verify common +
        17 _um_init line counts totalling ~309 mode_default rows.

Step 3: Draft phase-3-modes-handler.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: 27 catalog rows enumerated correctly with
        right discriminators; ~309 mode_default rows projected;
        cross-header macros resolved; trailing-comment harvest
        captured; gate convention applied.

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 4. Drafting is paper-only.

=== END PROMPT ===
```
