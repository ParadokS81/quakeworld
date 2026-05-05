# Phase 2 drafter prompt -- KTX Onboarding (Pass 1 entity handlers)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 2 of the KTX Layer 1 Onboarding arc.

PHASE 2 SCOPE: Pass 1 first-class entity handlers + 4 loader wirings +
KTX dispatch wiring in extract-tag.ts. Four new handlers under
apps/qw-oracle/scripts/extractors/ktx/: _handler_cvars.py,
_handler_commands.py, _handler_info_keys.py, _handler_log_templates.py.
After Phase 2 ships, KTX cvars + commands + info_keys + log_templates
are queryable in dev DB.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D3 (cross-codebase port from Visitor only), D7
     (Pattern 14 suffix for commands + info_keys), D10 (dual-row design
     for log_template + match_event), D14 (JSONB binding), D15
     (idempotency), D18 (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 2: F1 (cvar bucket counts), F2 (command
     counts + Pattern 14 collisions), F3 (info_key producer-only), F4
     (log_template printf counts), F17 (do NOT filter XML-shaped
     log_printfs).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-1-foundation.md
   - Phase 1's outputs: Pattern 6 lift available; migrations 008/009/010
     applied; new gameplay_sources row exists. Confirm the
     "Outputs to next phase" section matches your assumed inputs.
6. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 2 range: Pass 1 entire (sections 1.1 through 1.7).
7. apps/qw-oracle/CLAUDE.md
   - JSONB-binding rule + Bun runtime + idempotency.
8. apps/qw-oracle/scripts/extractors/EXTRACTOR-PLAYBOOK.md
   - Pattern 4, 5, 6, 9, 14 documentation. Cross-codebase port pattern.
     Three-tier handler architecture.
9. apps/qw-oracle/SCHEMA.md
   - cvar_versions + command_versions + info_key_versions +
     log_template_versions shapes.

ANALOGOUS PRIOR-ENGINE TEMPLATES (read as templates; do NOT subclass per D3):

- apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py
  -- Closest precedent for KTX's printf-shaped log_template handler
     (multi-API dispatch, all_call_sites_json convention from v17).
- apps/qw-oracle/scripts/extractors/ezquake/_handler_*.py (any one)
  -- Pattern 5 (API-call with literal-string args) reference.
- apps/qw-oracle/scripts/load-knowledge/load-cvars.ts
- apps/qw-oracle/scripts/load-knowledge/load-commands.ts
- apps/qw-oracle/scripts/load-knowledge/load-info-keys.ts
- apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts
  -- Loader patterns to copy. Each KTX adapter wiring is ~5 lines
     (data-driven dispatch via PROJECT_VERSION_ALIASES and per-loader
     dispatch maps).
- apps/qw-oracle/scripts/load-knowledge/extract-tag.ts
  -- KTX dispatch wiring lands here.

PHASE-SPECIFIC RECON (run before drafting):

a. Verify cvar bucket counts (F1):
   grep -cn 'RegisterCvar\\(' research/repos/ktx/src/world.c
   grep -cn 'RegisterCvarEx\\(' research/repos/ktx/src/world.c
   grep -rohE 'RegisterCvar(Ex)?\\("[^"]+"' research/repos/ktx/src/ | sort -u | wc -l
   - Confirm ~192 unique k_-prefixed registrations + the ~205/~50 split.

b. Verify command counts (F2):
   grep -n 'cmd_t cmds\\[\\]' research/repos/ktx/src/commands.c
   grep -n 'frogbot_cmd_t std_commands\\[\\]' research/repos/ktx/src/bot_commands.c
   grep -n 'frogbot_cmd_t editor_commands\\[\\]' research/repos/ktx/src/bot_commands.c
   - Sample 5 entries from each table to confirm row shape.
   - Verify the std-vs-editor 25-collision pattern by listing names from each.

c. Verify info_key producer-only counts (F3):
   grep -rEn 'SetUserInfo\\([^,]+,\\s*"\\*[A-Za-z]+"' research/repos/ktx/src/ | head -20
   - Confirm 5-6 unique star-keys.

d. Verify log_template printf counts (F4):
   grep -rcn 'G_bprint\\|G_sprint\\|G_cprint\\|log_printf' research/repos/ktx/src/ | head
   - Confirm 655 / 1068 / 43 / 28 split.

e. Verify F17 -- log_printf XML-shaped emission sites are still
   captured by the printf-handler:
   grep -rEn 'log_printf\\("\\\\t\\\\t\\\\t<' research/repos/ktx/src/ | wc -l
   - Should be 13. These are the dual-row sites; do NOT add a filter.

f. Read the closest analogous handler shape:
   - For cvar handler: existing ezQuake _handler_cvars.py (Pattern 5
     with RegisterCvar API).
   - For commands handler: existing handler under any engine that uses
     Pattern 4 (INIT_LIST_EXPR walks on struct-array literals).
   - For info_keys: MVDSV's _handler_info_keys.py.
   - For log_templates: MVDSV's _handler_log_templates.py.

g. Verify KTX dispatch in extract-tag.ts:
   grep -n 'PROJECT_VERSION_ALIASES\\|ktx' apps/qw-oracle/scripts/load-knowledge/extract-tag.ts

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-2-pass1-entity-handlers.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. No emoji. ASCII hyphen-minus.
- All KTX handlers inherit from extractor_lib._visitor.Visitor ONLY (D3).
- Pattern 14 canonical-name suffix: '<bare>:frogbot:std', ':frogbot:editor',
  '<bare>:userinfo' (D7).
- Per-file dedup _seen_in_file keyed on FULL canonical name (post-suffix).
- log_template printf-handler emits XML-shaped log_printf sites as
  channel='logfile' rows; do NOT filter (D10, F17).
- JSONB columns receive JS values directly; never pre-stringify (D14).
- Loaders are idempotent (D15).
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut (refine as you draft):
- _handler_cvars.py: subagent (Sonnet medium) -- code synthesis.
- _handler_commands.py: subagent (Sonnet MAX) -- 3 tables, Pattern 14
  collision handling, judgment-dense.
- _handler_info_keys.py: subagent (Sonnet medium).
- _handler_log_templates.py: subagent (Sonnet medium) -- multi-API
  dispatch, mirror MVDSV pattern.
- 4 loader wirings (load-*.ts): inline each (data-driven dispatch
  updates ~5 lines each; ship full diffs inline).
- extract-tag.ts dispatch wiring: inline.
- Verification probes: inline.

STEP-BY-STEP:

Step 1: Read all required files. Note F1/F2/F3/F4/F17 anchors.

Step 2: Run phase-specific recon (verify all count anchors).

Step 3: Draft phase-2-pass1-entity-handlers.md per phase-template.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore type).
        Particularly verify: count anchors reproduced; Pattern 14
        applied to commands + info_keys; F17 not violated; loader
        wirings preserve idempotency; JSONB columns bound correctly.

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 3. Drafting is paper-only.

=== END PROMPT ===
```
