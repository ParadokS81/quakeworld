# ktx-l1-rewrite — Server config & network fan-out continuation

**Created**: 2026-05-23 (end of session #N at ~350k context budget)
**Status**: 28 of 57 cards drafted; **29 remaining** in Server config & network category
**Resume mode**: fresh terminal, dispatcher role (you batch + dispatch sub-agents; sub-agents run the skill)

---

## Where things are right now

Battle test SHIPPED 2026-05-23:
- `k_entityfile` drafted Shape 9a (original + re-run that validated Step 1.5)
- `qizmo` drafted Shape 10
- `callalias` parked (trigger 4 sui-generis-mechanism)

**SKILL.md amendments SHIPPED** (validated at scale across 28 cards):
- **Step 1.5 (behavioral unpacking per consumer)** — was the depth-fix; closed gap between mechanical site labels and surprise-bearing prereq/stickiness/validation unpacking
- **`shape-less` verdict** — authorized for standalone state-printers, command-side levers for Shape X cvars, and leaves of Shape X families

Sub-batch 1 SHIPPED (10 cards): allow_timing / k_cmd_fp_count / k_defmode / k_extralog / k_spm_show / k_maxclients / about / forcemap / qenemy / status1. 6 drafted + 4 drafted_with_flag.

Sub-batch 2 SHIPPED (15 cards): k_cmd_fp_disabled / k_cmd_fp_per / k_spm_color_rgba / k_spm_glow / k_extralog_xsd_uri / k_fp / k_maxspectators / timing_players_action / timing_players_time / k_random_maplist / downplayers / upplayers / exclusive / fpslist / status2. 10 drafted + 5 drafted_with_flag.

**Cumulative verdict tally**: 18 drafted clean + 9 drafted_with_flag + 1 parked = 28 unique cards processed. **~32% flag rate** — the skill is consistently catching real factual errors in the format-unify arc's output (wrong defaults, mislabeled fields, missing prereqs, permission framing errors). Step 1.5 surfaces surprise-bearing behaviors on most clean drafts.

Files (relative to `/home/paradoks/projects/quakeworld/`):
- `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md` — 1612 lines, 28 sections
- `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-2026-05-23.md` — 1 card (callalias)

---

## Reads required (in order, before dispatching)

1. **This handoff doc** (you are here).
2. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md`** — skim 5–6 existing draft sections to absorb the v2 voice + See-also discipline + Effect-bullet shape. Pay attention to the `drafted_with_flag` entries (k_spm_show / k_maxclients / about / qenemy / k_spm_color_rgba / k_extralog_xsd_uri / timing_players_action / upplayers / status2) for the kind of factual catches the skill is designed to surface.
3. **`apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-2026-05-23.md`** — the 1 parked card (callalias, trigger 4 sui-generis); 1-of-1 in the category so far.
4. **`~/.claude/skills/ktx-l1-rewrite/SKILL.md`** + all 6 `references/` files — the runtime skill. Step 1.5 + shape-less verdict are baked in.
5. **`docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md`** — the design spec. **NOT YET amended** for Step 1.5 / shape-less verdict (flagged as small followup; SKILL.md governs at runtime).

---

## Critical rules (don't deviate)

- **You ARE the dispatcher.** Sub-agents run the skill via Skill tool; you pre-fetch inputs + dispatch + report progress.
- **Sequential dispatch only.** Sub-agents append to per-batch files; parallel writes race. One Agent call at a time, wait for completion, then next.
- **Sub-agent dispatch shape**: `subagent_type=general-purpose`, `model=sonnet`. The skill's dial (Sonnet 4.6 high reasoning) is spec-locked — pass `sonnet` to the Agent.
- **Per-batch files (APPEND to existing — do NOT overwrite or create new)**:
  - Drafts: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-drafts-2026-05-23.md`
  - Park: `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-parked-2026-05-23.md`
- **Sub-agent prompt must include explicit Step 1.5 + shape-less amendment reminders** (sub-agents read SKILL.md cold each invocation; can't assume they remember).
- **`batch_date` is `2026-05-23`** for all cards in this continuation (same per-batch file pair).
- **NEVER touch `entities.description` in the DB.** Drafts file only. Apply pass is a separate phase, operator-driven.
- **NEVER commit between cards.** Let the dispatcher commit at audit-points (typically end of session).
- **MCP rate limit**: don't fire >10 parallel `lookup_entity` calls — Cloudflare 1015. Fallback: catalog HTML metadata-strip carries `source: <code>X:Y</code>` per card (see `ktx-l1-rewrite-drafts-2026-05-23.md` for pre-fetch source examples). For this continuation, the 29-card table below already includes `source_ref` and `type` — you only need to extract `existing_description` per card (one Read per dispatch). See HANDOVER entry "MCP Tailscale direct-route for batch jobs" for the longer-term fix.

---

## First three actions

1. **Read this doc + the existing drafts file (skim).** Absorb the v2 voice + the kinds of flags the skill catches.
2. **Read SKILL.md + the 6 references/ files.** Refresh on Step 1.5 + shape-less + the 14-shape Layer B catalog. Sub-agents read these cold each invocation; you need them in your context to write good dispatch prompts.
3. **Pre-fetch + dispatch card 1 (`k_cmd_fp_dontkick`)**:
   - Read `apps/qw-oracle/docs/reviews/2026-05-22-ktx-l1-catalog.html` lines 15513-15543 to extract the `<pre class="description">` content (this is the `existing_description` input)
   - Dispatch via Agent tool with `subagent_type=general-purpose`, `model=sonnet`, prompt structured per the existing dispatches (see drafts file for examples — copy the prompt shape used for `k_cmd_fp_disabled` or `k_cmd_fp_per`)
   - Wait for completion, log brief result, dispatch card 2.

---

## When in doubt

- **The spec governs** per the SKILL.md header. But the spec hasn't been amended for Step 1.5 / shape-less yet — until it is, SKILL.md + this handoff doc are the runtime authorities. If the spec contradicts the SKILL.md amendments, follow SKILL.md (the amendments are battle-test-validated and explicit operator-approved 2026-05-23).
- **Verify against live KTX source** at `/home/paradoks/projects/quakeworld/research/repos/ktx/src/` — never trust the existing description's framing without source verification (Step 3 spot-check is the inner enforcement loop).
- **Read 2–3 already-drafted sibling cards** before drafting a new card with siblings already done. The cmd-fp / spm / timing / status / down-up-players families have established conventions in the drafts file; match them.
- **If a card surprises the skill**: capture the sub-agent's output verbatim, report to operator, do NOT silently iterate the skill or amendments. The shape catalog is operator-judgment territory.
- **Tagging discipline**: `shape-less` is for entities with NO Layer B shape match (standalone state-printers, command-side levers, family leaves). Shape 3 (cvar-only-with-no-paired-command) IS a Layer B shape — entities matching Shape 3 cleanly are tagged `Shape 3`, NOT `shape-less`. The two are mutually exclusive. (One drift seen in sub-batch 2: `k_cmd_fp_per` reporting line said "shape-less (Shape 3)" — section header was clean. Remind sub-agents in the dispatch prompt if you see this pattern.)

---

## Anchor + batch metadata

- **anchor_version**: `v1.36-1633-g67253dc` (current KTX dev-head; confirmed via `git -C /home/paradoks/projects/quakeworld/research/repos/ktx describe --always` at session start)
- **batch_date**: `2026-05-23`
- **category**: `Server config & network` (all 29 cards)

---

## 29 remaining cards (pre-fetch table)

| # | entity | type | source_ref | catalog_line |
|---|---|---|---|---|
| 1 | k_cmd_fp_dontkick | cvar | src/world.c:999 | 15513 |
| 2 | k_cmd_fp_for | cvar | src/world.c:997 | 15544 |
| 3 | k_cmd_fp_kick | cvar | src/world.c:998 | 15574 |
| 4 | k_defmap | cvar | src/world.c:852 | 15634 |
| 5 | k_force_mapcycle | cvar | src/world.c:803 | 15777 |
| 6 | k_fp_spec | cvar | src/world.c:1008 | 15840 |
| 7 | k_minrate | cvar | src/world.c:880 | 15932 |
| 8 | k_motd_time | cvar | src/world.c:841 | 15962 |
| 9 | k_noframechecks | cvar | src/world.c:946 | 15992 |
| 10 | k_no_scoreboard_ghosts | cvar | src/world.c:1081 | 16023 |
| 11 | k_spm_custom_model | cvar | src/world.c:884 | 16113 |
| 12 | k_teamoverlay | cvar | src/world.c:1015 | 16208 |
| 13 | k_use_matchless_dir | cvar | src/world.c:798 | 16239 |
| 14 | maxfps | cvar | src/world.c:772 | 16271 |
| 15 | downspecs | command | src/commands.c:983 | 16446 |
| 16 | info | command | src/commands.c:943 | 16557 |
| 17 | kinfo | command | src/commands.c:940 | 16589 |
| 18 | kuinfo | command | src/commands.c:941 | 16621 |
| 19 | mapcycle | command | src/commands.c:996 | 16649 |
| 20 | maps | command | src/commands.c:749 | 16676 |
| 21 | mapslist_dl | command | src/commands.c:699 | 16703 |
| 22 | motd | command | src/commands.c:929 | 16733 |
| 23 | rules | command | src/commands.c:747 | 16816 |
| 24 | sct_hex | command | src/commands.c:760 | 16843 |
| 25 | sct_oct | command | src/commands.c:759 | 16870 |
| 26 | time | command | src/commands.c:960 | 16955 |
| 27 | uinfo | command | src/commands.c:944 | 16983 |
| 28 | upspecs | command | src/commands.c:982 | 17037 |
| 29 | whoskin | command | src/commands.c:713 | 17064 |

Family / pattern notes for the cards above (helps See-also discipline):

- **cmd-fp family (1–3 above)**: closes the family with disabled/per/count already drafted. Each member distinct semantics, NOT canonical-card (operator-decided after sub-batch 2). See-also each other + k_fp (distinct say-flood system).
- **k_defmap (4)**: likely pair to k_defmode (already drafted Shape 3). Verify in source.
- **k_force_mapcycle (5)**: probably interacts with k_random_maplist (already drafted Shape 3) and mapcycle command (row 19). Cross-link.
- **k_fp_spec (6)**: spectator counterpart to k_fp (Shape 2 — already drafted). Apply consistent shape if source matches.
- **k_spm_custom_model (11)**: closes spm family (color_rgba / glow / show already drafted). Each member distinct, NOT canonical-card.
- **downspecs / upspecs (15, 28)**: spectator counterparts to downplayers / upplayers (already drafted shape-less). Same handler with type=2.
- **info / kinfo / kuinfo / uinfo (16–18, 27)**: potential canonical-card territory if near-identical sibling. Verify in source; if distinct semantics like cmd-fp family, draft each separately with full v2.
- **maps / mapcycle / mapslist_dl (19–21)**: map-related commands; cross-link to k_random_maplist + k_force_mapcycle + forcemap.
- **rules (23)**: per session-3 findings, Shape 10 curated-family help-printer (sibling of qizmo + options). Apply Shape 10 with menu enumeration.
- **sct_hex / sct_oct (24–25)**: likely sibling pair. Verify in source.
- **status1 vs status2** already established as shape-less standalone state-printers.

---

## Open followups (NOT blocking this continuation; capture-only)

- **Spec amendment for Step 1.5 + shape-less verdict** — `docs/superpowers/specs/2026-05-23-ktx-l1-rewrite-skill-design.md` needs to be amended to mirror the SKILL.md changes. Small (~15 min). Bundle at end-of-category wrap-up alongside the apply pass.
- **Apply pass design** — once all 57 cards in Server config & network are drafted, operator audits the drafts file then applies to `entities.description`. The apply pass is a separate phase (not part of this skill's scope). The drafted_with_flag entries (currently 9; will grow) need operator review before apply.
- **MCP Tailscale direct-route for batch jobs** — captured in `HANDOVER.md` "Small followups" as a separate item; not blocking this work but would speed up future dispatcher pre-fetches.

---

## Dispatch prompt template (copy + adapt per card)

Use this exact shape, replacing `<ENTITY>`, `<TYPE>`, `<EXISTING_DESCRIPTION>`, `<SOURCE_REF>`, `<CATALOG_LINE>`, and any card-specific family notes. The shape mirrors the sub-batch 2 dispatches — check the drafts file for additional examples (each section is the output of a dispatch using this template).

```
Use the `ktx-l1-rewrite` skill — "rewrite the L1 description for <ENTITY>". Skill at `~/.claude/skills/ktx-l1-rewrite/SKILL.md` (Sonnet 4.6 high, locked). Step 1.5 + shape-less verdict amendment are in effect.

**Tagging discipline**: `shape-less` is for entities with NO Layer B shape match. Shape 3 (cvar-only-with-no-paired-command) IS a Layer B shape — tag accordingly.

Inputs:

- **entity_name**: `<ENTITY>`
- **entity_type**: `<TYPE>`
- **category**: `Server config & network`
- **existing_description**:

```
<EXISTING_DESCRIPTION>
```

- **source_ref**: `<SOURCE_REF>`
- **anchor_version**: `v1.36-1633-g67253dc`
- **catalog_line**: `<CATALOG_LINE>`
- **batch_date**: `2026-05-23`

KTX source: `/home/paradoks/projects/quakeworld/research/repos/ktx/src/`
Per-batch files (APPEND): `apps/qw-oracle/docs/reviews/ktx-l1-rewrite-{drafts,parked}-2026-05-23.md` under `/home/paradoks/projects/quakeworld/`

Note: <family / pattern context — see "Family / pattern notes" section above>

**Return the FULL v2 recast text in your response** + append to drafts file + end with reporting line.

Do NOT commit. Do NOT touch entities.description in the DB.
```

---

## When you're done

- Mark this parking doc for deletion (the work is complete; arc-history retrospective lives in `apps/qw-oracle/docs/arc-history.md`).
- Delete the HANDOVER one-liner that points here.
- Commit a wrap-up: `git add` the drafts/park files (and any spec amendment if you ship it) + commit with a clear message referencing the cumulative card counts.
- Decide with operator: do the spec amendment immediately, or fold into apply pass.
- Flag for operator: 57 cards drafted in Server config & network category, ready for apply-pass review.
