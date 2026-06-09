---
date: 2026-06-09
type: locked-decisions-record
arc-slug: docs-l1-enrichment
spec: docs/superpowers/parking/2026-06-09-docs-l1-enrichment.md
status: shipped 2026-06-09
---

# docs-l1-enrichment -- locked taxonomy + conventions

Lightweight decisions record (operator approved 2026-06-09; no arc-planner
ceremony per the parking-doc steer). The DB column `category_inferred` is the
durable artifact; the per-project `apply-*.sql` files in this dir are the
reproducible apply scripts.

## Cold-verified starting state (corrects the parking-doc estimates)

| Project | Categorize (cvar+cmd) | Cat rows | Notes |
|---|---|---|---|
| MVDSV | 291 (183 cvar + 108 cmd) | 0 | head-only; 2 cvars undescribed (`sv_antilag`, `sv_antilag_projectiles`) |
| QTV | 52 (40 cvar + 12 cmd) | 0 | TWO version rows/entity (`1.16-dev` + `head`) |
| QWFWD | 42 (13 cvar + 29 cmd) | 0 | TWO version rows/entity (`1.40-dev` + `head`) |
| QWCL | n/a (borrow+synth) | 0 | TWO version rows/entity (`2.33` + `head`); 308 = 263 borrow + 45 synth |

QWCL split is **263 borrow + 45 light-synth** (not the doc's 217+90). The 72
QWCL `cmdline_param`s (20 borrowable + 52 synth) are a separate scope call.

## Key conventions (load-bearing)

- **`category_inferred` write target:** ALL version rows per entity (no version
  filter in the UPDATE). qtv/qwfwd/qwcl have two rows each and the snapshot
  reads the *frozen* one (`1.16-dev`/`1.40-dev`/`2.33`), not `head` -- writing
  only `head` would be invisible to the snapshot.
- **`category_inferred_origin`:** `claude-opus-4-8|<project>-categorize-v1`.
  XOR-gated by `F1.category_inferred_provenance_integrity`.
- **QWCL description borrow:** `description_origin='inherited'` (the reserved
  slot's first real use), `description_anchor_version='ezquake@e4a2c20a'` (the
  ezQuake head commit borrowed from). Lives on `entities.description` (single
  row, no version multiplicity). QWCL is NOT in the `origin_vocabulary`
  arc-scoped guard (`ktx/mvdsv/qtv/qwfwd` only), so `inherited` passes.
- **QWCL light-synth:** `description_origin='synthesized'`,
  `description_anchor_version='2.33'`. Posterity bar -- plain one-liners.
- **MVDSV antilag synth:** `description_origin='synthesized'`,
  `description_anchor_version='1.11-53-g18d0362'` (mvdsv head git-describe,
  matching the 180 existing synthesized cvars).
- **QWCL category lane:** Option (a). `category_inferred` carries the matched
  ezQuake group-name (string, self-contained); QWCL-only rows get an
  ezQuake-style group during synth. Docs projection rule across all four
  synthesized codebases: "read `category_inferred`".

## Locked taxonomies

### MVDSV -- 14
1. Server identity & info
2. Match & game rules
3. Movement & physics
4. Antilag
5. Network & performance
6. Accounts & authentication
7. Access control & VIP
8. Admin & moderation
9. Demo recording
10. QTV, broadcast & voice
11. Logging & diagnostics
12. Web & downloads
13. Game module & extensions
14. Console, scripting & filesystem

### QTV -- 7
1. Upstream sources
2. Downstream viewers
3. Downloads
4. Web interface
5. Logging
6. Network & identity
7. Console control

### QWFWD -- 5
1. Access control & bans
2. Master servers & discovery
3. Network, identity & forwarding
4. Console & scripting
5. Diagnostics

### QWCL -- inherited (matched -> ezQuake group-name; QWCL-only -> ezQuake-style group)
