# Phase 6 drafter prompt -- KTX Onboarding (Match_event handler)

Open a fresh `claude` terminal in `/home/paradoks/projects/quakeworld/`, copy everything between the BEGIN/END markers below, paste as the first message. Drafter halts when done.

---

```
=== BEGIN PROMPT ===

You are drafting Phase 6 of the KTX Layer 1 Onboarding arc.

PHASE 6 SCOPE: Pass 5 match_event handler. New file
apps/qw-oracle/scripts/extractors/ktx/_handler_match_events.py
(XSD-driven; NOT a libclang handler) + new loader
apps/qw-oracle/scripts/load-knowledge/load-match-events.ts. Emits
7 match_event entity rows + 7 match_event_versions rows + 13
emission call sites. After Phase 6 ships, qw-event-log validation
harness is fully unblocked at the schema level.

Working directory: /home/paradoks/projects/quakeworld

You do NOT execute anything. Drafting is paper-only.

REQUIRED READING (read all before drafting):

1. docs/superpowers/plans/2026-05-04-ktx-onboarding/README.md
2. docs/superpowers/plans/2026-05-04-ktx-onboarding/decisions.md
   - Particularly D3 (Visitor-only does NOT apply here -- match_event
     handler is XSD-driven, stands alone with its own setup -> parse_xsd
     -> grep_emissions -> merge -> finalize flow), D5 (009 migration
     created match_event_versions table), D6 (handler grouping; this
     is the lone XSD-driven handler), D10 (dual-row design with
     log_template; intentional), D14 (JSONB binding), D15 (idempotency),
     D18 (execution modes).
3. docs/superpowers/plans/2026-05-04-ktx-onboarding/review-findings.md
   - Findings touching Phase 6: F14 (7 match_events + 13 emission
     sites), F17 (also emits emission_call_sites_json; intentional).
4. docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-template.md
5. docs/superpowers/specs/2026-05-04-ktx-onboarding-design.md
   - Phase 6 ranges: entire Pass 4.5 (match_event entity type column
     shape) + entire Pass 5.6 (match_event handler architecture
     detail; XSD library choice + emission-site grep + handler
     placement + loader).
6. apps/qw-oracle/CLAUDE.md
7. apps/qw-oracle/SCHEMA.md
   - match_event_versions table (created by 009 migration).

ANALOGOUS PRIOR-ENGINE TEMPLATES:

- apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts
  -- Closest precedent for load-match-events.ts (similar JSONB
     binding shape; multi-call-site aggregation).
- apps/qw-oracle/scripts/extractors/mvdsv/_handler_log_templates.py
  -- Reference for the multi-site dedup pattern (different walking
     strategy, but the dedup convention applies).

PHASE-SPECIFIC RECON (run before drafting):

a. Read the XSD source-of-truth (F14):
   cat research/repos/ktx/resources/extralog/ktxlog_0.1.xsd
   - Confirm 7 complexTypes: pick_mapitem, pick_backpack, drop_backpack,
     pick_powerup, drop_powerup, damage, death.
   - Confirm 5 distinct simpleTypes: maxed_integer (0-200), iptype,
     modetype (FFA|duel|team), porttype (0-65535), and one more.
   - Note: pick_backpack + drop_backpack share complexType
     'backpacktype'; pick_powerup + drop_powerup share 'poweruptype';
     pick_mapitem -> 'mapitemtype'; damage -> 'damagetype'; death ->
     'deathtype'.
   - Per-event attribute counts: pick_mapitem=4, backpack-events=7,
     powerup-events=4, damage=8, death=8.

b. Verify emission-site count (F14, F17):
   grep -rEn 'log_printf\\("\\\\t\\\\t\\\\t<' research/repos/ktx/src/items.c \\
                                       research/repos/ktx/src/combat.c \\
                                       research/repos/ktx/src/client.c \\
                                       research/repos/ktx/src/logs.c
   - Confirm 13 sites total (6 pick_mapitem, 1 each for pick_powerup /
     drop_powerup / pick_backpack / drop_backpack, 2 damage, 1 death).

c. Inspect match_event_versions table shape (created by 009 migration
   in Phase 1):
   - Read 009_ktx_match_event_type.sql or query the live dev DB:
     docker exec qw-oracle-postgres-dev psql -U qworacle -d qw_oracle \\
       -c "\\d+ match_event_versions"
   - Confirm column list: entity_id, version, event_name, complex_type,
     attributes_json (JSONB), xsd_path, xsd_version,
     emission_call_sites_json (JSONB), raw_ast_hash, source_root,
     extracted_at.

d. Verify gating cvars are extractable as cvar entities (Phase 2):
   grep -n 'k_extralog\\b\\|extralogname\\b' research/repos/ktx/src/world.c
   grep -n 'k_extralog_xsd_uri' research/repos/ktx/src/logs.c

e. Read load-log-templates.ts to understand the multi-call-site JSONB
   pattern (F17 dual-row context):
   apps/qw-oracle/scripts/load-knowledge/load-log-templates.ts

DRAFT THE PHASE:

Output: docs/superpowers/plans/2026-05-04-ktx-onboarding/phase-6-match-event-handler.md

Follow phase-template.md exactly.

Concrete authoring rules:

- ASCII only. ASCII hyphen-minus.
- _handler_match_events.py is project-private (Tier 3 per
  EXTRACTOR-PLAYBOOK three-tier model). Stands alone (no Visitor
  inheritance; this is the lone XSD-driven handler).
- Two-stage flow: setup -> parse_xsd (Python xml.etree.ElementTree
  stdlib; NOT lxml) -> grep_emissions (Python re module over fixed
  4-file glob) -> merge -> finalize.
- Output filename: ktx-match-events-ast.json (cross-engine convention;
  -ast suffix retained even though XSD-driven).
- Dual-row design with log_template is INTENTIONAL (D10, F17). Do NOT
  add a filter to Pass 1.7's printf-handler to skip XML-shaped log_printfs.
- attributes_json + emission_call_sites_json bound via tx.json(...) or
  passed directly to postgres-js (D14). NEVER pre-stringify.
- Loader is idempotent (D15).
- Per-task execution mode declared (D18).

Per-task execution-mode rough cut:
- _handler_match_events.py: subagent (Sonnet medium) -- XSD parse
  (small file ~150 lines) + regex grep over 4 files; contained shape;
  Sonnet medium adequate.
- load-match-events.ts: inline (small file; mirror load-log-templates.ts
  shape with attributes_json + emission_call_sites_json bound directly).
- Verification probes: inline.

STEP-BY-STEP:

Step 1: Read all required reads. Note F14, F17.

Step 2: Run phase-specific recon. Verify XSD has 7 complexTypes;
        verify 13 emission sites; verify match_event_versions table
        column list matches Pass 4.5 spec.

Step 3: Draft phase-6-match-event-handler.md.

Step 4: Dispatch verification sub-agent (Sonnet medium, Explore).
        Particularly verify: XSD parse shape produces correct
        attributes_json structure; emission grep regex captures all
        13 sites without false positives; JSONB columns bound
        correctly per D14; dual-row design preserved (no filter on
        Pass 1.7).

Step 5: Apply sub-agent findings.

Step 6: Halt with structured summary.

Do NOT proceed to Phase 7. Drafting is paper-only.

=== END PROMPT ===
```
